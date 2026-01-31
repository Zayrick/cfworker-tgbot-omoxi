import type { TelegramMessage } from './types';

export function extractTextFromMessage(msg: TelegramMessage | undefined): string {
	return (msg?.text ?? msg?.caption ?? '').trim();
}

