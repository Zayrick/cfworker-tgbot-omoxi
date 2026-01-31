import { describe, expect, it } from 'vitest';

import { Bot } from '../src/bot';
import { commands } from '../src/bot/generated/commands.generated';

import type { BotContext, TelegramMessage, TelegramUpdate } from '../src/bot';
import type { TelegramClient } from '../src/services/telegram';

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

function msg(params: { chatId: number; text: string; messageId?: number; chatType?: 'private' | 'group' | 'supergroup' }): TelegramMessage {
	return {
		message_id: params.messageId ?? 10,
		chat: { id: params.chatId, type: params.chatType },
		from: { id: 123 },
		text: params.text,
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
});
