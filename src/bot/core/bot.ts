import type { BotCommand } from './command';
import type { BotContext } from '../context';
import type { TelegramCallbackQuery, TelegramInlineQuery, TelegramMessage, TelegramUpdate } from '../telegram/types';
import { isAllowed } from './accessControl';
import { parseCommand } from './parseCommand';
import { extractTextFromMessage } from '../telegram/text';

export class Bot {
	constructor(private readonly commands: BotCommand[]) {}

	async handleUpdate(ctx: BotContext, update: TelegramUpdate): Promise<void> {
		if (update.message) {
			await this.handleMessage(ctx, update.message);
			return;
		}
		if (update.inline_query) {
			await this.handleInlineQuery(ctx, update.inline_query);
			return;
		}
		if (update.callback_query) {
			await this.handleCallbackQuery(ctx, update.callback_query);
		}
	}

	private async handleMessage(ctx: BotContext, message: TelegramMessage): Promise<void> {
		const chatId = message.chat.id;
		const userId = message.from?.id ?? chatId;
		if (!isAllowed(ctx.bot.accessControl, userId, chatId)) return;

		const messageText = extractTextFromMessage(message);
		const parsed = parseCommand(messageText, ctx.bot.botUsername);

		for (const command of this.commands) {
			if (!command.onMessage) continue;
			const handled = await command.onMessage(ctx, message, parsed);
			if (handled) return;
		}

		if (!parsed) return;

		const isGroup = chatId < 0;
		if (isGroup) return;

		const supported = this.commands
			.flatMap(c => c.triggers)
			.filter(Boolean)
			.join('、');

		await ctx.telegram.sendMessage({
			chatId,
			replyToMessageId: message.message_id,
			text: `未知指令，请检查后重试。\n当前支持的指令：${supported || '（暂无）'}`,
		});
	}

	private async handleInlineQuery(ctx: BotContext, inlineQuery: TelegramInlineQuery): Promise<void> {
		const userId = inlineQuery.from.id;
		if (!isAllowed(ctx.bot.accessControl, userId, userId)) return;

		for (const command of this.commands) {
			if (!command.onInlineQuery) continue;
			const handled = await command.onInlineQuery(ctx, inlineQuery);
			if (handled) return;
		}
	}

	private async handleCallbackQuery(ctx: BotContext, callbackQuery: TelegramCallbackQuery): Promise<void> {
		const userId = callbackQuery.from.id;
		if (!isAllowed(ctx.bot.accessControl, userId, userId)) return;

		for (const command of this.commands) {
			if (!command.onCallbackQuery) continue;
			const handled = await command.onCallbackQuery(ctx, callbackQuery);
			if (handled) return;
		}
	}
}

