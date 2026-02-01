import type { AccessControlMode } from '../config/botConfig';

export async function getFilterMode(db: D1Database): Promise<AccessControlMode> {
	const row = await db.prepare('SELECT value FROM config WHERE key = ?').bind('filter_mode').first<{ value: string }>();
	const v = row?.value ?? 'off';
	if (v === 'whitelist' || v === 'blacklist') return v;
	return 'off';
}

export async function setFilterMode(db: D1Database, mode: AccessControlMode): Promise<void> {
	await db.prepare('INSERT INTO config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
		.bind('filter_mode', mode)
		.run();
}

export async function addToAccessList(db: D1Database, targetId: number, commandIds: string[]): Promise<void> {
	const batch = commandIds.map(cid =>
		db.prepare('INSERT OR IGNORE INTO access_list (command_id, target_id) VALUES (?, ?)').bind(cid, targetId),
	);
	await db.batch(batch);
}

export async function removeFromAccessList(db: D1Database, targetId: number, commandIds: string[]): Promise<void> {
	const batch = commandIds.map(cid =>
		db.prepare('DELETE FROM access_list WHERE command_id = ? AND target_id = ?').bind(cid, targetId),
	);
	await db.batch(batch);
}

export async function getAccessList(db: D1Database, commandId?: string): Promise<{ command_id: string; target_id: number }[]> {
	if (commandId) {
		const { results } = await db.prepare('SELECT command_id, target_id FROM access_list WHERE command_id = ?').bind(commandId).all<{ command_id: string; target_id: number }>();
		return results;
	}
	const { results } = await db.prepare('SELECT command_id, target_id FROM access_list').all<{ command_id: string; target_id: number }>();
	return results;
}

export async function isAllowedByDb(
	db: D1Database,
	mode: AccessControlMode,
	userId: number,
	chatId: number,
	commandId: string,
): Promise<boolean> {
	if (mode === 'off') return true;

	// Check both global '*' and command-specific entries
	const { results } = await db
		.prepare('SELECT 1 FROM access_list WHERE command_id IN (?, ?) AND target_id IN (?, ?) LIMIT 1')
		.bind('*', commandId, userId, chatId)
		.all();

	const found = results.length > 0;
	return mode === 'blacklist' ? !found : found;
}

export async function getAutoDelete(db: D1Database, chatId: number): Promise<number | null> {
	const row = await db.prepare('SELECT delay_seconds FROM auto_delete WHERE chat_id = ?').bind(chatId).first<{ delay_seconds: number }>();
	return row?.delay_seconds ?? null;
}

export async function setAutoDelete(db: D1Database, chatId: number, seconds: number): Promise<void> {
	if (seconds <= 0) {
		await db.prepare('DELETE FROM auto_delete WHERE chat_id = ?').bind(chatId).run();
		return;
	}
	await db.prepare('INSERT INTO auto_delete (chat_id, delay_seconds) VALUES (?, ?) ON CONFLICT(chat_id) DO UPDATE SET delay_seconds = excluded.delay_seconds')
		.bind(chatId, seconds)
		.run();
}
