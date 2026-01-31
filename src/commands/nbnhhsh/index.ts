import type { BotCommand } from '../../bot/index';
import { extractTextFromMessage } from '../../bot/index';
import { escapeHtml } from '../../utils/html';
import { chunkByParagraphs } from './chunk';
import { arrangeTrans, guessNbnhhsh, type NbnhhshTag } from './nbnhhsh';

function formatTags(tags: NbnhhshTag[]): string {
	return tags
		.map(tag => {
			const name = escapeHtml(tag.name);

			if (Array.isArray(tag.trans) && tag.trans.length > 0) {
				const lines = arrangeTrans(tag.trans).map(tran => {
					const base = `- ${escapeHtml(tran.text)}`;
					return tran.sub ? `${base} <i>(${escapeHtml(tran.sub)})</i>` : base;
				});
				return `<b>${name}</b>\n${lines.join('\n')}`;
			}

			if (tag.trans === null) return `<b>${name}</b>\n- 无对应文字`;

			if (Array.isArray(tag.inputting) && tag.inputting.length > 0) {
				const guesses = tag.inputting.map(s => escapeHtml(s)).join(' / ');
				return `<b>${name}</b>\n- 有可能是：${guesses}`;
			}

			return `<b>${name}</b>\n- 尚未录入`;
		})
		.join('\n\n');
}

const nbnhhsh: BotCommand = {
	id: 'nbnhhsh',
	triggers: ['/nbnhhsh'],
	description: '解释缩写（能不能好好说话）',
	async onMessage(ctx, message, parsed) {
		if (!parsed || parsed.command !== '/nbnhhsh') return false;

		const chatId = message.chat.id;
		let inputText = parsed.argsText;
		if (!inputText && message.reply_to_message) {
			inputText = extractTextFromMessage(message.reply_to_message);
		}

		if (!inputText) {
			await ctx.telegram.sendMessage({
				chatId,
				replyToMessageId: message.message_id,
				text: '用法：/nbnhhsh 缩写\n也支持：回复一条消息后发送 /nbnhhsh',
			});
			return true;
		}

		let tags: NbnhhshTag[];
		try {
			tags = await guessNbnhhsh(inputText);
		} catch {
			await ctx.telegram.sendMessage({
				chatId,
				replyToMessageId: message.message_id,
				text: '查询失败，请稍后再试。',
			});
			return true;
		}

		if (tags.length === 0) {
			await ctx.telegram.sendMessage({
				chatId,
				replyToMessageId: message.message_id,
				text: '没有识别到可查询的缩写（需包含至少 2 位字母/数字）。',
			});
			return true;
		}

		const text = formatTags(tags);
		const chunks = chunkByParagraphs(text, 3500);
		for (let i = 0; i < chunks.length; i++) {
			await ctx.telegram.sendMessage({
				chatId,
				replyToMessageId: i === 0 ? message.message_id : undefined,
				text: chunks[i],
			});
		}

		return true;
	},
};

export default nbnhhsh;

