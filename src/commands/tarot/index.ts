import type { BotCommand } from '../../bot/index';
import { extractTextFromMessage } from '../../bot/index';
import { escapeHtml } from '../../utils/html';
import { callChatCompletion } from '../../services/chatCompletion';
import { readTarotConfig } from './config';
import { buildTarotPrompt, createTarotSpread, getOrientationLabel, type TarotSpread } from './spread';

const TRIGGERS = ['/tarot'];

function buildTarotHtml(params: { question: string; spread: TarotSpread }): string {
	const q = escapeHtml(params.question);
	const cards = params.spread.draws
		.map(
			draw => `${escapeHtml(draw.card.name)} · ${escapeHtml(getOrientationLabel(draw.card.orientation))}`,
		)
		.join('\n');

	return `<blockquote>所问之事：${q}\n塔罗指引：\n${cards}</blockquote>`;
}

function buildInlineWaitingHtml(question: string): string {
	return `<blockquote>所问之事：${escapeHtml(question)}\n牌阵：三张塔罗牌\n点击下方按钮后开始洗牌、抽牌并解读。</blockquote>`;
}

function buildUsageText(): string {
	return [
		'使用方法：',
		'1. 直接发送 /tarot 问题，例如：/tarot 这次合作会顺利吗？',
		'2. 群聊中可先引用消息后发送 /tarot，对引用内容进行三张牌解读。',
		'3. 引用消息后发送 /tarot 问题，可同时分析引用内容和你的补充说明。',
	].join('\n');
}

function buildConfigErrorHtml(): string {
	return '<blockquote>当前未配置 /tarot 所需的 AI 环境变量（优先 env_tarot_*，缺省回退 env_sm_*）。</blockquote>';
}

async function generateAnswerWithKnownSpread(
	ctx: Parameters<NonNullable<BotCommand['onMessage']>>[0],
	params: { question: string; referenceText?: string; spread: TarotSpread },
): Promise<{ spreadHtml: string; answerHtml: string }> {
	const spreadHtml = buildTarotHtml({
		question: params.question,
		spread: params.spread,
	});

	const cfg = readTarotConfig(ctx.env);
	if (!cfg) {
		return { spreadHtml, answerHtml: `${spreadHtml}\n${buildConfigErrorHtml()}` };
	}

	const prompt = buildTarotPrompt({
		question: params.question,
		referenceText: params.referenceText,
		spread: params.spread,
	});

	let aiText: string;
	try {
		aiText = await callChatCompletion(
			{
				apiEndpoint: cfg.aiApiEndpoint,
				apiKey: cfg.aiApiKey,
				modelName: cfg.aiModelName,
				systemPrompt: cfg.aiSystemPrompt,
			},
			prompt,
		);
	} catch {
		aiText = '抱歉，AI 服务暂时不可用，请稍后再试。';
	}

	return {
		spreadHtml,
		answerHtml: `${spreadHtml}\n<blockquote>${escapeHtml(aiText)}</blockquote>`,
	};
}

const tarot: BotCommand = {
	id: 'tarot',
	triggers: TRIGGERS,
	description: '三张塔罗牌占卜（/tarot）',

	async onMessage(ctx, message, parsed) {
		const chatId = message.chat.id;
		const isTarotCommand = parsed ? TRIGGERS.includes(parsed.command) : false;
		if (!parsed || !isTarotCommand) return false;

		let question = parsed.argsText.trim();
		const refMsg = message.reply_to_message;
		const refText = refMsg ? extractTextFromMessage(refMsg) : '';
		let useSpecialFormat = false;

		if (refText) {
			if (!question) {
				question = refText;
			} else {
				useSpecialFormat = true;
			}
		}

		if (!question) {
			await ctx.telegram.sendMessage({
				chatId,
				replyToMessageId: message.message_id,
				text: buildUsageText(),
			});
			return true;
		}

		const referenceText = useSpecialFormat ? refText : undefined;
		const replyToId = refMsg ? refMsg.message_id : message.message_id;
		const spread = createTarotSpread();
		const placeholderHtml = `${buildTarotHtml({ question, spread })}\n<blockquote>牌已经翻开，正在解读~</blockquote>`;
		const placeholderResp = await ctx.telegram.sendMessage({
			chatId,
			replyToMessageId: replyToId,
			text: placeholderHtml,
		});

		const { answerHtml } = await generateAnswerWithKnownSpread(ctx, {
			question,
			referenceText,
			spread,
		});

		const placeholderMsgId = placeholderResp.result?.message_id;
		if (placeholderResp.ok && placeholderMsgId) {
			await ctx.telegram.editMessageText({
				chatId,
				messageId: placeholderMsgId,
				text: answerHtml,
			});
			return true;
		}

		await ctx.telegram.sendMessage({
			chatId,
			replyToMessageId: replyToId,
			text: answerHtml,
		});
		return true;
	},

	async onInlineQuery(ctx, inlineQuery) {
		const query = (inlineQuery.query ?? '').trim();
		if (!query) {
			await ctx.telegram.answerInlineQuery({
				inlineQueryId: inlineQuery.id,
				resultsJson: JSON.stringify([]),
				cacheTime: 60,
			});
			return true;
		}

		if (!readTarotConfig(ctx.env)) {
			await ctx.telegram.answerInlineQuery({
				inlineQueryId: inlineQuery.id,
				resultsJson: JSON.stringify([]),
				cacheTime: 60,
			});
			return true;
		}

		const callbackData = `tarot:${query}`;
		if (new TextEncoder().encode(callbackData).length > 64) {
			await ctx.telegram.answerInlineQuery({
				inlineQueryId: inlineQuery.id,
				resultsJson: JSON.stringify([
					{
						type: 'article',
						id: 'tarot_too_long',
						title: '🃏 塔罗占卜（内容过长）',
						description: '建议在聊天中直接使用 /tarot',
						input_message_content: {
							message_text: '内容过长，请在聊天中使用：/tarot 你的问题',
						},
					},
				]),
				cacheTime: 0,
				isPersonal: true,
			});
			return true;
		}

		const results = [
			{
				type: 'article',
				id: 'tarot_query',
				title: '🃏 开始塔罗占卜',
				description: `抽「${query}」的三张牌`,
				input_message_content: {
					message_text: buildInlineWaitingHtml(query),
					parse_mode: 'HTML',
				},
				reply_markup: {
					inline_keyboard: [
						[
							{
								text: 'AI解牌',
								callback_data: callbackData,
							},
						],
					],
				},
			},
		];

		await ctx.telegram.answerInlineQuery({
			inlineQueryId: inlineQuery.id,
			resultsJson: JSON.stringify(results),
			cacheTime: 0,
			isPersonal: true,
		});
		return true;
	},

	async onCallbackQuery(ctx, callbackQuery) {
		const inlineMessageId = callbackQuery.inline_message_id;
		const data = (callbackQuery.data ?? '').trim();
		if (!inlineMessageId || !data.startsWith('tarot:')) return false;

		const question = data.slice('tarot:'.length).trim();
		if (!question) return true;

		const spread = createTarotSpread();
		const placeholderHtml = `${buildTarotHtml({ question, spread })}\n<blockquote>牌已经翻开，正在解读~</blockquote>`;
		await ctx.telegram.editInlineMessageText({
			inlineMessageId,
			text: placeholderHtml,
		});

		const { answerHtml } = await generateAnswerWithKnownSpread(ctx, { question, spread });
		await ctx.telegram.editInlineMessageText({
			inlineMessageId,
			text: answerHtml,
		});

		return true;
	},
};

export default tarot;
