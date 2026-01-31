export type TelegramApiResponse<T = unknown> = {
	ok: boolean;
	result?: T;
	description?: string;
};

export type TelegramClient = {
	sendMessage: (params: SendMessageParams) => Promise<TelegramApiResponse<SendMessageResult>>;
	editMessageText: (params: EditMessageTextParams) => Promise<TelegramApiResponse<SendMessageResult>>;
	editInlineMessageText: (params: EditInlineMessageTextParams) => Promise<TelegramApiResponse<true>>;
	answerInlineQuery: (params: AnswerInlineQueryParams) => Promise<TelegramApiResponse<true>>;
	setWebhook: (params: SetWebhookParams) => Promise<TelegramApiResponse<true>>;
};

export type SendMessageParams = {
	chatId: number;
	text: string;
	replyToMessageId?: number;
	disableWebPagePreview?: boolean;
};

export type SendMessageResult = {
	message_id: number;
};

export type EditMessageTextParams = {
	chatId: number;
	messageId: number;
	text: string;
	disableWebPagePreview?: boolean;
};

export type EditInlineMessageTextParams = {
	inlineMessageId: string;
	text: string;
	disableWebPagePreview?: boolean;
};

export type AnswerInlineQueryParams = {
	inlineQueryId: string;
	resultsJson: string;
	cacheTime?: number;
	isPersonal?: boolean;
};

export type SetWebhookParams = {
	url: string;
	secretToken?: string;
};

function apiUrl(token: string, methodName: string, params?: Record<string, string>): string {
	const query = params ? `?${new URLSearchParams(params).toString()}` : '';
	return `https://api.telegram.org/bot${token}/${methodName}${query}`;
}

async function postJson<T>(token: string, methodName: string, body: Record<string, unknown>): Promise<TelegramApiResponse<T>> {
	const response = await fetch(apiUrl(token, methodName), {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(body),
	});
	return (await response.json()) as TelegramApiResponse<T>;
}

export function createTelegramClient(token: string): TelegramClient {
	return {
		async sendMessage(params) {
			return postJson(token, 'sendMessage', {
				chat_id: params.chatId,
				text: params.text,
				parse_mode: 'HTML',
				disable_web_page_preview: params.disableWebPagePreview ?? true,
				...(typeof params.replyToMessageId === 'number' ? { reply_to_message_id: params.replyToMessageId } : {}),
			});
		},
		async editMessageText(params) {
			return postJson(token, 'editMessageText', {
				chat_id: params.chatId,
				message_id: params.messageId,
				text: params.text,
				parse_mode: 'HTML',
				disable_web_page_preview: params.disableWebPagePreview ?? true,
			});
		},
		async editInlineMessageText(params) {
			return postJson(token, 'editMessageText', {
				inline_message_id: params.inlineMessageId,
				text: params.text,
				parse_mode: 'HTML',
				disable_web_page_preview: params.disableWebPagePreview ?? true,
			});
		},
		async answerInlineQuery(params) {
			return postJson(token, 'answerInlineQuery', {
				inline_query_id: params.inlineQueryId,
				results: params.resultsJson,
				cache_time: params.cacheTime ?? 0,
				is_personal: params.isPersonal ?? false,
			});
		},
		async setWebhook(params) {
			const queryParams: Record<string, string> = { url: params.url };
			if (params.secretToken) queryParams.secret_token = params.secretToken;
			const response = await fetch(apiUrl(token, 'setWebhook', queryParams));
			return (await response.json()) as TelegramApiResponse<true>;
		},
	};
}

