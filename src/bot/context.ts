import type { BotConfig } from '../config/botConfig';
import type { TelegramClient } from '../services/telegram';

export type BotContext = {
	env: Env;
	bot: BotConfig;
	telegram: TelegramClient;
};
