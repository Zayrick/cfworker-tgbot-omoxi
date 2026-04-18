import { afterEach, describe, expect, it, vi } from 'vitest';

import { Bot } from '../src/bot';
import { commands } from '../src/bot/generated/commands.generated';

import type { BotContext, TelegramMessage, TelegramUpdate } from '../src/bot';
import type { TelegramClient } from '../src/services/telegram';

afterEach(() => {
	vi.restoreAllMocks();
	// 若使用 vi.stubGlobal，则这里统一清理，避免影响其他用例。
	// @ts-expect-error - vitest 环境下可用
	if (typeof vi.unstubAllGlobals === 'function') vi.unstubAllGlobals();
});

function createCtx(spy: { calls: Array<{ method: string; params: unknown }> }): BotContext {
	const telegram: TelegramClient = {
		async sendMessage(params) {
			spy.calls.push({ method: 'sendMessage', params });
			return { ok: true, result: { message_id: 1 } };
		},
		async editMessageText(params) {
			spy.calls.push({ method: 'editMessageText', params });
			return { ok: true, result: { message_id: 1 } };
		},
		async editInlineMessageText(params) {
			spy.calls.push({ method: 'editInlineMessageText', params });
			return { ok: true, result: true };
		},
		async answerInlineQuery(params) {
			spy.calls.push({ method: 'answerInlineQuery', params });
			return { ok: true, result: true };
		},
		async setWebhook(params) {
			spy.calls.push({ method: 'setWebhook', params });
			return { ok: true, result: true };
		},
	};

	return {
		env: {} as unknown as Env,
		bot: {
			token: 'token',
			secret: 'secret',
			safePath: '',
			botUsername: '',
			accessControl: { mode: 'off', list: [] },
		},
		telegram,
	};
}

function msg(params: {
	chatId: number;
	text: string;
	messageId?: number;
	chatType?: 'private' | 'group' | 'supergroup';
	replyToMessage?: TelegramMessage;
}): TelegramMessage {
	return {
		message_id: params.messageId ?? 10,
		chat: { id: params.chatId, type: params.chatType },
		from: { id: 123 },
		text: params.text,
		...(params.replyToMessage ? { reply_to_message: params.replyToMessage } : {}),
	};
}

describe('Bot message dispatch', () => {
	it('replies with help text on private plain text (no command)', async () => {
		const spy = { calls: [] as Array<{ method: string; params: any }> };
		const ctx = createCtx(spy);
		const bot = new Bot(commands);

		const update: TelegramUpdate = { message: msg({ chatId: 1, chatType: 'private', text: '今天运势如何' }) };
		await bot.handleUpdate(ctx, update);

		expect(spy.calls.length).toBe(1);
		expect(spy.calls[0].method).toBe('sendMessage');
		expect(spy.calls[0].params.text).toContain('请使用命令');
	});

	it('does not reply on group plain text (no command)', async () => {
		const spy = { calls: [] as Array<{ method: string; params: any }> };
		const ctx = createCtx(spy);
		const bot = new Bot(commands);

		const update: TelegramUpdate = { message: msg({ chatId: -100, chatType: 'group', text: '今天运势如何' }) };
		await bot.handleUpdate(ctx, update);

		expect(spy.calls.length).toBe(0);
	});

	it('still requires explicit /sm trigger', async () => {
		const spy = { calls: [] as Array<{ method: string; params: any }> };
		const ctx = createCtx(spy);
		const bot = new Bot(commands);

		const update: TelegramUpdate = { message: msg({ chatId: 1, chatType: 'private', text: '/sm' }) };
		await bot.handleUpdate(ctx, update);

		expect(spy.calls.length).toBe(1);
		expect(spy.calls[0].method).toBe('sendMessage');
		expect(spy.calls[0].params.text).toContain('使用方法');
	});

	it('sends /sm placeholder before calling AI', async () => {
		const events: string[] = [];

		vi.stubGlobal('fetch', async () => {
			events.push('fetch');
			return new Response(
				JSON.stringify({ choices: [{ message: { content: 'AI回复' } }] }),
				{ status: 200, headers: { 'content-type': 'application/json' } },
			);
		});

		const spy = { calls: [] as Array<{ method: string; params: unknown }> };
		const telegram: TelegramClient = {
			async sendMessage(params) {
				events.push('sendMessage');
				spy.calls.push({ method: 'sendMessage', params });
				return { ok: true, result: { message_id: 42 } };
			},
			async editMessageText(params) {
				events.push('editMessageText');
				spy.calls.push({ method: 'editMessageText', params });
				return { ok: true, result: { message_id: 42 } };
			},
			async editInlineMessageText(params) {
				spy.calls.push({ method: 'editInlineMessageText', params });
				return { ok: true, result: true };
			},
			async answerInlineQuery(params) {
				spy.calls.push({ method: 'answerInlineQuery', params });
				return { ok: true, result: true };
			},
			async setWebhook(params) {
				spy.calls.push({ method: 'setWebhook', params });
				return { ok: true, result: true };
			},
		};

		const ctx: BotContext = {
			env: {
				env_sm_ai_api_endpoint: 'https://example.com/v1/chat/completions',
				env_sm_ai_api_key: 'test-key',
				env_sm_ai_model_name: 'test-model',
			} as unknown as Env,
			bot: {
				token: 'token',
				secret: 'secret',
				safePath: '',
				botUsername: '',
				accessControl: { mode: 'off', list: [] },
			},
			telegram,
		};

		const bot = new Bot(commands);
		const update: TelegramUpdate = { message: msg({ chatId: 1, chatType: 'private', text: '/sm 今天运势如何' }) };
		await bot.handleUpdate(ctx, update);

		// 期望交互顺序：先发占卜基础内容 -> 再请求 AI -> 再编辑更新
		expect(events[0]).toBe('sendMessage');
		expect(events.indexOf('sendMessage')).toBeLessThan(events.indexOf('fetch'));
		expect(events.indexOf('fetch')).toBeLessThan(events.indexOf('editMessageText'));

		// 占位消息应仅包含基础占卜信息（无 AI 分析块）
		const firstSend = spy.calls.find(c => c.method === 'sendMessage') as any;
		expect(firstSend?.params?.text).toContain('所问之事');
		expect(firstSend?.params?.text).toContain('所得之卦');
		expect(firstSend?.params?.text).toContain('所占之时');
		expect(firstSend?.params?.text).toContain('别急，算着呢~');
	});

	it('sends /tarot placeholder before calling AI', async () => {
		const events: string[] = [];

		vi.stubGlobal('fetch', async () => {
			events.push('fetch');
			return new Response(
				JSON.stringify({ choices: [{ message: { content: '塔罗解析' } }] }),
				{ status: 200, headers: { 'content-type': 'application/json' } },
			);
		});

		const spy = { calls: [] as Array<{ method: string; params: unknown }> };
		const telegram: TelegramClient = {
			async sendMessage(params) {
				events.push('sendMessage');
				spy.calls.push({ method: 'sendMessage', params });
				return { ok: true, result: { message_id: 66 } };
			},
			async editMessageText(params) {
				events.push('editMessageText');
				spy.calls.push({ method: 'editMessageText', params });
				return { ok: true, result: { message_id: 66 } };
			},
			async editInlineMessageText(params) {
				spy.calls.push({ method: 'editInlineMessageText', params });
				return { ok: true, result: true };
			},
			async answerInlineQuery(params) {
				spy.calls.push({ method: 'answerInlineQuery', params });
				return { ok: true, result: true };
			},
			async setWebhook(params) {
				spy.calls.push({ method: 'setWebhook', params });
				return { ok: true, result: true };
			},
		};

		const ctx: BotContext = {
			env: {
				env_sm_ai_api_endpoint: 'https://example.com/v1/chat/completions',
				env_sm_ai_api_key: 'test-key',
				env_sm_ai_model_name: 'test-model',
			} as unknown as Env,
			bot: {
				token: 'token',
				secret: 'secret',
				safePath: '',
				botUsername: '',
				accessControl: { mode: 'off', list: [] },
			},
			telegram,
		};

		const bot = new Bot(commands);
		const update: TelegramUpdate = { message: msg({ chatId: 1, chatType: 'private', text: '/tarot 这次合作会顺利吗' }) };
		await bot.handleUpdate(ctx, update);

		expect(events[0]).toBe('sendMessage');
		expect(events.indexOf('sendMessage')).toBeLessThan(events.indexOf('fetch'));
		expect(events.indexOf('fetch')).toBeLessThan(events.indexOf('editMessageText'));

		const firstSend = spy.calls.find(c => c.method === 'sendMessage') as any;
		expect(firstSend?.params?.text).toContain('抽牌方式');
		expect(firstSend?.params?.text).toContain('抽牌时间');
		expect(firstSend?.params?.text).toContain('抽到数字');
		expect(firstSend?.params?.text).toContain('牌已经翻开，正在解读~');
	});

	it('uses replied text as tarot question when /tarot has no args', async () => {
		vi.stubGlobal('fetch', async () => {
			return new Response(
				JSON.stringify({ choices: [{ message: { content: '塔罗解析' } }] }),
				{ status: 200, headers: { 'content-type': 'application/json' } },
			);
		});

		const spy = { calls: [] as Array<{ method: string; params: unknown }> };
		const ctx: BotContext = {
			env: {
				env_sm_ai_api_endpoint: 'https://example.com/v1/chat/completions',
				env_sm_ai_api_key: 'test-key',
				env_sm_ai_model_name: 'test-model',
			} as unknown as Env,
			bot: {
				token: 'token',
				secret: 'secret',
				safePath: '',
				botUsername: '',
				accessControl: { mode: 'off', list: [] },
			},
			telegram: {
				async sendMessage(params) {
					spy.calls.push({ method: 'sendMessage', params });
					return { ok: true, result: { message_id: 77 } };
				},
				async editMessageText(params) {
					spy.calls.push({ method: 'editMessageText', params });
					return { ok: true, result: { message_id: 77 } };
				},
				async editInlineMessageText(params) {
					spy.calls.push({ method: 'editInlineMessageText', params });
					return { ok: true, result: true };
				},
				async answerInlineQuery(params) {
					spy.calls.push({ method: 'answerInlineQuery', params });
					return { ok: true, result: true };
				},
				async setWebhook(params) {
					spy.calls.push({ method: 'setWebhook', params });
					return { ok: true, result: true };
				},
			},
		};

		const bot = new Bot(commands);
		const replySource = msg({ chatId: 1, chatType: 'private', text: '这段关系还有机会吗', messageId: 9 });
		const update: TelegramUpdate = {
			message: msg({
				chatId: 1,
				chatType: 'private',
				text: '/tarot',
				messageId: 10,
				replyToMessage: replySource,
			}),
		};
		await bot.handleUpdate(ctx, update);

		const firstSend = spy.calls.find(c => c.method === 'sendMessage') as any;
		expect(firstSend?.params?.replyToMessageId).toBe(9);
		expect(firstSend?.params?.text).toContain('所问之事：这段关系还有机会吗');
	});

	it('includes replied text as tarot reference when /tarot has extra args', async () => {
		let prompt = '';

		vi.stubGlobal('fetch', async (_input, init) => {
			const body = JSON.parse(String(init?.body ?? '{}'));
			prompt = body.messages?.[1]?.content ?? '';
			return new Response(
				JSON.stringify({ choices: [{ message: { content: '塔罗解析' } }] }),
				{ status: 200, headers: { 'content-type': 'application/json' } },
			);
		});

		const spy = { calls: [] as Array<{ method: string; params: unknown }> };
		const ctx: BotContext = {
			env: {
				env_sm_ai_api_endpoint: 'https://example.com/v1/chat/completions',
				env_sm_ai_api_key: 'test-key',
				env_sm_ai_model_name: 'test-model',
			} as unknown as Env,
			bot: {
				token: 'token',
				secret: 'secret',
				safePath: '',
				botUsername: '',
				accessControl: { mode: 'off', list: [] },
			},
			telegram: {
				async sendMessage(params) {
					spy.calls.push({ method: 'sendMessage', params });
					return { ok: true, result: { message_id: 88 } };
				},
				async editMessageText(params) {
					spy.calls.push({ method: 'editMessageText', params });
					return { ok: true, result: { message_id: 88 } };
				},
				async editInlineMessageText(params) {
					spy.calls.push({ method: 'editInlineMessageText', params });
					return { ok: true, result: true };
				},
				async answerInlineQuery(params) {
					spy.calls.push({ method: 'answerInlineQuery', params });
					return { ok: true, result: true };
				},
				async setWebhook(params) {
					spy.calls.push({ method: 'setWebhook', params });
					return { ok: true, result: true };
				},
			},
		};

		const bot = new Bot(commands);
		const replySource = msg({ chatId: 1, chatType: 'private', text: '客户说预算还没批下来', messageId: 11 });
		const update: TelegramUpdate = {
			message: msg({
				chatId: 1,
				chatType: 'private',
				text: '/tarot 我还要继续推进吗',
				messageId: 12,
				replyToMessage: replySource,
			}),
		};
		await bot.handleUpdate(ctx, update);

		expect(prompt).toContain('所问之事：我还要继续推进吗');
		expect(prompt).toContain('引用内容：客户说预算还没批下来');
	});
});
