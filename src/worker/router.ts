import { readBotConfig, readBotPaths } from '../config/botConfig';
import { Bot } from '../bot/index';
import { commands } from '../bot/generated/commands.generated';
import { createTelegramClient } from '../services/telegram';
import type { TelegramUpdate } from '../bot/index';

function jsonResponse(body: unknown, init?: ResponseInit): Response {
	return new Response(JSON.stringify(body, null, 2), {
		...init,
		headers: {
			'content-type': 'application/json; charset=utf-8',
			...(init?.headers ?? {}),
		},
	});
}

export async function routeRequest(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
	const url = new URL(request.url);

	if (request.method === 'GET' && url.pathname === '/') {
		return jsonResponse({
			ok: true,
			name: 'tgbot-omoxi',
			commands: commands.map(c => ({ id: c.id, triggers: c.triggers, description: c.description })),
			routes: {
				webhook: '/<safePath>/endpoint',
				registerWebhook: '/<safePath>/registerWebhook',
				unregisterWebhook: '/<safePath>/unRegisterWebhook',
			},
		});
	}

	const config = readBotConfig(env);
	const paths = readBotPaths(config);
	const telegram = createTelegramClient(config.token);
	const bot = new Bot(commands);

	if (url.pathname === paths.webhook) {
		return handleWebhook(request, config.secret, bot, {
			env,
			bot: config,
			telegram,
		}, ctx);
	}

	if (url.pathname === paths.registerWebhook) {
		if (request.method !== 'GET') return new Response('Method Not Allowed', { status: 405 });
		const webhookUrl = `${url.origin}${paths.webhook}`;
		const r = await telegram.setWebhook({ url: webhookUrl, secretToken: config.secret });
		return new Response(r.ok ? 'Ok' : JSON.stringify(r, null, 2));
	}

	if (url.pathname === paths.unregisterWebhook) {
		if (request.method !== 'GET') return new Response('Method Not Allowed', { status: 405 });
		const r = await telegram.setWebhook({ url: '' });
		return new Response(r.ok ? 'Ok' : JSON.stringify(r, null, 2));
	}

	return new Response(null, { status: 404 });
}

async function handleWebhook(
	request: Request,
	secret: string,
	bot: Bot,
	botCtx: Parameters<Bot['handleUpdate']>[0],
	ctx: ExecutionContext,
): Promise<Response> {
	if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

	const secretToken = request.headers.get('X-Telegram-Bot-Api-Secret-Token') ?? '';
	if (secretToken !== secret) return new Response('Unauthorized', { status: 403 });

	const update = (await request.json()) as TelegramUpdate;
	ctx.waitUntil(bot.handleUpdate(botCtx, update));
	return new Response('Ok');
}
