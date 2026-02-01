import type { BotCommand } from '../../bot/index';
import { commands as allCommands } from '../../bot/generated/commands.generated';
import {
	getFilterMode,
	setFilterMode,
	addToAccessList,
	removeFromAccessList,
	getAccessList,
	setAutoDelete,
	getAutoDelete,
} from '../../services/db';
import type { AccessControlMode } from '../../config/botConfig';

function getAllCommandIds(): string[] {
	return allCommands.filter(c => c.id !== 'admin').map(c => c.id);
}

const admin: BotCommand = {
	id: 'admin',
	triggers: ['/admin'],
	description: '管理员配置命令',

	async onMessage(ctx, message, parsed) {
		if (!parsed || parsed.command !== '/admin') return false;

		const chatId = message.chat.id;
		const userId = message.from?.id ?? chatId;

		if (ctx.adminId == null || userId !== ctx.adminId) {
			await ctx.telegram.sendMessage({ chatId, replyToMessageId: message.message_id, text: '无权限。' });
			return true;
		}

		if (!ctx.db) {
			await ctx.telegram.sendMessage({ chatId, replyToMessageId: message.message_id, text: '数据库未配置，无法使用管理功能。' });
			return true;
		}

		const db = ctx.db;
		const args = parsed.argsText.trim().split(/\s+/).filter(Boolean);
		const sub = args[0]?.toLowerCase();

		if (!sub || sub === 'help') {
			await ctx.telegram.sendMessage({
				chatId,
				replyToMessageId: message.message_id,
				text: [
					'<b>管理员命令</b>',
					'',
					'/admin mode &lt;off|whitelist|blacklist&gt;',
					'/admin add &lt;id&gt; [command]',
					'/admin remove &lt;id&gt; [command]',
					'/admin list [command]',
					'/admin autodelete &lt;seconds&gt;',
					'/admin status',
				].join('\n'),
			});
			return true;
		}

		if (sub === 'mode') {
			const mode = args[1]?.toLowerCase();
			if (!mode || !['off', 'whitelist', 'blacklist'].includes(mode)) {
				await ctx.telegram.sendMessage({ chatId, replyToMessageId: message.message_id, text: '用法：/admin mode <off|whitelist|blacklist>' });
				return true;
			}
			await setFilterMode(db, mode as AccessControlMode);
			await ctx.telegram.sendMessage({ chatId, replyToMessageId: message.message_id, text: `过滤模式已设为 ${mode}` });
			return true;
		}

		if (sub === 'add') {
			const targetId = Number.parseInt(args[1], 10);
			if (!Number.isFinite(targetId)) {
				await ctx.telegram.sendMessage({ chatId, replyToMessageId: message.message_id, text: '用法：/admin add <id> [command]' });
				return true;
			}
			const commandId = args[2];
			const ids = commandId ? [commandId] : ['*', ...getAllCommandIds()];
			await addToAccessList(db, targetId, ids);
			await ctx.telegram.sendMessage({ chatId, replyToMessageId: message.message_id, text: `已添加 ${targetId} 到名单${commandId ? `（命令: ${commandId}）` : '（全局）'}` });
			return true;
		}

		if (sub === 'remove') {
			const targetId = Number.parseInt(args[1], 10);
			if (!Number.isFinite(targetId)) {
				await ctx.telegram.sendMessage({ chatId, replyToMessageId: message.message_id, text: '用法：/admin remove <id> [command]' });
				return true;
			}
			const commandId = args[2];
			const ids = commandId ? [commandId] : ['*', ...getAllCommandIds()];
			await removeFromAccessList(db, targetId, ids);
			await ctx.telegram.sendMessage({ chatId, replyToMessageId: message.message_id, text: `已从名单移除 ${targetId}${commandId ? `（命令: ${commandId}）` : '（全局）'}` });
			return true;
		}

		if (sub === 'list') {
			const commandId = args[1] || undefined;
			const entries = await getAccessList(db, commandId);
			if (entries.length === 0) {
				await ctx.telegram.sendMessage({ chatId, replyToMessageId: message.message_id, text: '名单为空。' });
				return true;
			}
			const grouped = new Map<string, number[]>();
			for (const e of entries) {
				const arr = grouped.get(e.command_id) ?? [];
				arr.push(e.target_id);
				grouped.set(e.command_id, arr);
			}
			const lines: string[] = [];
			for (const [cmd, ids] of grouped) {
				lines.push(`<b>${cmd === '*' ? '全局' : cmd}</b>: ${ids.join(', ')}`);
			}
			await ctx.telegram.sendMessage({ chatId, replyToMessageId: message.message_id, text: lines.join('\n') });
			return true;
		}

		if (sub === 'autodelete') {
			const seconds = Number.parseInt(args[1], 10);
			if (!Number.isFinite(seconds) || seconds < 0) {
				await ctx.telegram.sendMessage({ chatId, replyToMessageId: message.message_id, text: '用法：/admin autodelete <seconds>（0=关闭）' });
				return true;
			}
			await setAutoDelete(db, chatId, seconds);
			if (seconds === 0) {
				await ctx.telegram.sendMessage({ chatId, replyToMessageId: message.message_id, text: '已关闭本群自动删除。' });
			} else {
				await ctx.telegram.sendMessage({ chatId, replyToMessageId: message.message_id, text: `已设置本群 Bot 回复将在 ${seconds} 秒后自动删除。` });
			}
			return true;
		}

		if (sub === 'status') {
			const mode = await getFilterMode(db);
			const entries = await getAccessList(db);
			const autoDelete = await getAutoDelete(db, chatId);
			const lines = [
				`<b>过滤模式</b>: ${mode}`,
				`<b>名单条目数</b>: ${entries.length}`,
				`<b>本群自动删除</b>: ${autoDelete != null ? `${autoDelete}秒` : '关闭'}`,
			];
			await ctx.telegram.sendMessage({ chatId, replyToMessageId: message.message_id, text: lines.join('\n') });
			return true;
		}

		await ctx.telegram.sendMessage({ chatId, replyToMessageId: message.message_id, text: '未知子命令，使用 /admin help 查看帮助。' });
		return true;
	},
};

export default admin;
