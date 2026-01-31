import type { ParsedCommand } from './command';

export function parseCommand(messageText: string, botUsername: string): ParsedCommand | null {
	const trimmed = messageText.trim();
	if (!trimmed.startsWith('/')) return null;

	const [commandWithMention, ...rest] = trimmed.split(' ');
	const [commandBaseRaw, mentionedBotRaw] = commandWithMention.split('@');

	if (mentionedBotRaw && botUsername && mentionedBotRaw.toLowerCase() !== botUsername) {
		return null;
	}

	return {
		command: commandBaseRaw.toLowerCase(),
		argsText: rest.join(' ').trim(),
	};
}

