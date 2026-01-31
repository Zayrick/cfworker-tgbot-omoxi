import type { BotContext } from '../context';
import type { TelegramCallbackQuery, TelegramInlineQuery, TelegramMessage } from '../telegram/types';

export type ParsedCommand = {
	command: string;
	argsText: string;
};

export type BotCommand = {
	id: string;
	triggers: string[];
	description: string;

	onMessage?: (ctx: BotContext, message: TelegramMessage, parsed: ParsedCommand | null) => Promise<boolean>;
	onInlineQuery?: (ctx: BotContext, inlineQuery: TelegramInlineQuery) => Promise<boolean>;
	onCallbackQuery?: (ctx: BotContext, callbackQuery: TelegramCallbackQuery) => Promise<boolean>;
};

