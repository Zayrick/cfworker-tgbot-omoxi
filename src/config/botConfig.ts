export type AccessControlMode = 'off' | 'whitelist' | 'blacklist';

export type AccessControlConfig = {
	mode: AccessControlMode;
	list: number[];
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

function parseAccessControlMode(input: string | undefined): AccessControlMode {
	const raw = input?.trim().toLowerCase() ?? '';
	if (!raw) return 'off';

	if (['off', 'disable', 'disabled', 'none', '0', 'false'].includes(raw)) return 'off';
	if (['whitelist', 'allowlist', 'white', 'allow'].includes(raw)) return 'whitelist';
	if (['blacklist', 'denylist', 'black', 'deny'].includes(raw)) return 'blacklist';

	throw new Error(`Invalid env_filter_mode: ${input}`);
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
			mode: parseAccessControlMode(env.env_filter_mode),
			list: parseIdList(env.env_filter_list),
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

