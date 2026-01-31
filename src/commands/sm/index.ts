import type { BotCommand } from '../../bot/command';
import { extractTextFromMessage } from '../../bot/text';
import { escapeHtml } from '../../utils/html';
import { callChatCompletion } from './ai';
import { readSmConfig } from './config';
import { buildDivinationPrompt, createDivination } from './divination';

const TRIGGERS = ['/sm', '/算命'];

function isPrivateChat(message: { chat: { id: number; type?: string } }): boolean {
	if (message.chat.type) return message.chat.type === 'private';
	return message.chat.id > 0;
}

function buildDivinationHtml(params: { question: string; hexagram: string; ganzhi: string }): string {
	const q = escapeHtml(params.question);
	const h = escapeHtml(params.hexagram);
	const g = escapeHtml(params.ganzhi);
	return `<blockquote>所问之事：${q}\n所得之卦：${h}\n所占之时：${g}</blockquote>`;
}

function buildUsageText(): string {
	return [
		'使用方法：',
		'1. 直接发送 /sm 问题，例如：/sm 今天运势如何？',
		'2. 群聊中可先引用消息后发送 /sm，对引用内容进行占卜。',
		'3. 引用消息后发送 /sm 问题，可同时分析引用内容和你的问题。',
	].join('\n');
}

async function generateAnswer(
	ctx: Parameters<NonNullable<BotCommand['onMessage']>>[0],
	question: string,
	referenceText?: string,
): Promise<string> {
	const cfg = readSmConfig(ctx.env);
	if (!cfg) {
		return '<blockquote>当前未配置 /sm 所需的 AI 环境变量（env_sm_ai_api_endpoint / env_sm_ai_api_key / env_sm_ai_model_name）。</blockquote>';
	}

	const divination = createDivination();
	const prompt = buildDivinationPrompt({ question, referenceText, divination });
	const divinationHtml = buildDivinationHtml({ question, hexagram: divination.hexagram, ganzhi: divination.ganzhi });

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

	return `${divinationHtml}\n<blockquote>${escapeHtml(aiText)}</blockquote>`;
}

const sm: BotCommand = {
	id: 'sm',
	triggers: TRIGGERS,
	description: '小六壬占卜（/sm）',

	async onMessage(ctx, message, parsed) {
		const chatId = message.chat.id;
		const messageText = extractTextFromMessage(message);
		const isGroup = chatId < 0;

		const isSmCommand = parsed ? TRIGGERS.includes(parsed.command) : false;
		if (parsed && !isSmCommand) return false;

		if (!parsed && (isGroup || !isPrivateChat(message))) return false;

		let question = parsed ? parsed.argsText.trim() : messageText.trim();
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
		const answer = await generateAnswer(ctx, question, referenceText);

		const replyToId = refMsg ? refMsg.message_id : message.message_id;
		const placeholder = answer.split('\n<blockquote>')[0] ?? answer;
		const placeholderResp = await ctx.telegram.sendMessage({
			chatId,
			replyToMessageId: replyToId,
			text: placeholder,
		});

		const placeholderMsgId = placeholderResp.result?.message_id;
		if (placeholderResp.ok && placeholderMsgId) {
			await ctx.telegram.editMessageText({
				chatId,
				messageId: placeholderMsgId,
				text: answer,
			});
			return true;
		}

		await ctx.telegram.sendMessage({
			chatId,
			replyToMessageId: replyToId,
			text: answer,
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

		if (!readSmConfig(ctx.env)) {
			await ctx.telegram.answerInlineQuery({
				inlineQueryId: inlineQuery.id,
				resultsJson: JSON.stringify([]),
				cacheTime: 60,
			});
			return true;
		}

		if (query.length > 50) {
			await ctx.telegram.answerInlineQuery({
				inlineQueryId: inlineQuery.id,
				resultsJson: JSON.stringify([
					{
						type: 'article',
						id: 'sm_too_long',
						title: '🔮 算命（内容过长）',
						description: '建议在聊天中直接使用 /sm',
						input_message_content: {
							message_text: '内容过长，请在聊天中使用：/sm 你的问题',
						},
					},
				]),
				cacheTime: 0,
				isPersonal: true,
			});
			return true;
		}

		const divination = createDivination();
		const divinationHtml = buildDivinationHtml({ question: query, hexagram: divination.hexagram, ganzhi: divination.ganzhi });

		const results = [
			{
				type: 'article',
				id: 'sm_query',
				title: '🔮 开始算命',
				description: `算「${query}」`,
				input_message_content: {
					message_text: divinationHtml,
					parse_mode: 'HTML',
				},
				reply_markup: {
					inline_keyboard: [
						[
							{
								text: 'AI占卜',
								callback_data: `sm:${query}`,
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
		if (!inlineMessageId || !data.startsWith('sm:')) return false;

		const question = data.slice('sm:'.length).trim();
		if (!question) return true;

		const answer = await generateAnswer(ctx, question);
		await ctx.telegram.editInlineMessageText({
			inlineMessageId,
			text: answer,
		});

		return true;
	},
};

export default sm;

