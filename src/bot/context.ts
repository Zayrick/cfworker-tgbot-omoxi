import type { BotConfig } from '../config/botConfig';
import type { TelegramClient } from '../services/telegram';

export type BotContext = {
	env: Env;
	bot: BotConfig;
	telegram: TelegramClient;
	db: D1Database | null;
	adminId: number | null;
	waitUntil: (promise: Promise<unknown>) => void;
};
