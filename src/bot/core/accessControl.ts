import type { AccessControlConfig } from '../../config/botConfig';

export function isAllowed(access: AccessControlConfig, userId: number, chatId: number): boolean {
	if (access.mode === 'off') return true;

	const list = access.list;
	if (access.mode === 'blacklist') {
		return !(list.includes(userId) || list.includes(chatId));
	}

	// whitelist: only allow if either userId or chatId is in the list
	if (list.length === 0) return false;
	return list.includes(userId) || list.includes(chatId);
}

