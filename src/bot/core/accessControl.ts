import type { AccessControlConfig } from '../../config/botConfig';

export function isAllowed(access: AccessControlConfig, userId: number, chatId: number): boolean {
	if (access.userBlacklist.includes(userId)) return false;

	const hasAnyWhitelist = access.userWhitelist.length > 0 || access.groupWhitelist.length > 0;
	if (!hasAnyWhitelist) return true;

	if (access.userWhitelist.includes(userId)) return true;
	if (chatId < 0 && access.groupWhitelist.includes(chatId)) return true;
	return false;
}

