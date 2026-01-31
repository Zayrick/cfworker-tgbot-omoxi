export type AccessControlConfig = {
	userWhitelist: number[];
	groupWhitelist: number[];
	userBlacklist: number[];
};

export type BotConfig = {
	token: string;
	secret: string;
	safePath: string;
	botUsername: string;
	accessControl: AccessControlConfig;
};

export type BotPaths = {
	webhook: string;
	registerWebhook: string;
	unregisterWebhook: string;
};

function parseIdList(input: string | undefined): number[] {
	if (!input) return [];
	return input
		.split(',')
		.map(s => Number.parseInt(s.trim(), 10))
		.filter(n => Number.isFinite(n));
}

function normalizeSafePath(input: string | undefined): string {
	const raw = input?.trim() ?? '';
	return raw ? `/${raw.replace(/^\/+/g, '').replace(/\/+$/g, '')}` : '';
}

function normalizeBotUsername(input: string | undefined): string {
	return (input?.trim().toLowerCase() ?? '').replace(/^@+/, '');
}

export function readBotConfig(env: Env): BotConfig {
	const token = env.env_bot_token?.trim();
	if (!token) throw new Error('Missing env_bot_token');

	const secret = env.env_bot_secret?.trim();
	if (!secret) throw new Error('Missing env_bot_secret');

	return {
		token,
		secret,
		safePath: normalizeSafePath(env.env_safe_path),
		botUsername: normalizeBotUsername(env.env_bot_username),
		accessControl: {
			userWhitelist: parseIdList(env.env_user_whitelist),
			groupWhitelist: parseIdList(env.env_group_whitelist),
			userBlacklist: parseIdList(env.env_user_blacklist),
		},
	};
}

export function readBotPaths(config: BotConfig): BotPaths {
	return {
		webhook: `${config.safePath}/endpoint`,
		registerWebhook: `${config.safePath}/registerWebhook`,
		unregisterWebhook: `${config.safePath}/unRegisterWebhook`,
	};
}

