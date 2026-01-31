export type TelegramUpdate = {
	message?: TelegramMessage;
	inline_query?: TelegramInlineQuery;
	callback_query?: TelegramCallbackQuery;
};

export type TelegramUser = {
	id: number;
};

export type TelegramChat = {
	id: number;
	type?: 'private' | 'group' | 'supergroup' | 'channel';
};

export type TelegramMessage = {
	message_id: number;
	chat: TelegramChat;
	from?: TelegramUser;
	text?: string;
	caption?: string;
	reply_to_message?: TelegramMessage;
};

export type TelegramInlineQuery = {
	id: string;
	from: TelegramUser;
	query?: string;
};

export type TelegramCallbackQuery = {
	id: string;
	from: TelegramUser;
	data?: string;
	inline_message_id?: string;
};

