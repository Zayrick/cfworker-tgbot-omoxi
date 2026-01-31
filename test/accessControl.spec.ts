import { describe, expect, it } from 'vitest';
import { isAllowed } from '../src/bot/core/accessControl';
import type { AccessControlConfig } from '../src/config/botConfig';

describe('accessControl.isAllowed', () => {
	it('allows everything when mode=off', () => {
		const access: AccessControlConfig = { mode: 'off', list: [1, -100] };
		expect(isAllowed(access, 1, 1)).toBe(true);
		expect(isAllowed(access, 2, -100)).toBe(true);
	});

	it('blacklist blocks when userId is listed', () => {
		const access: AccessControlConfig = { mode: 'blacklist', list: [42] };
		expect(isAllowed(access, 42, 42)).toBe(false);
		expect(isAllowed(access, 42, -123)).toBe(false);
	});

	it('blacklist blocks when chatId is listed', () => {
		const access: AccessControlConfig = { mode: 'blacklist', list: [-100123] };
		expect(isAllowed(access, 1, -100123)).toBe(false);
	});

	it('blacklist allows when neither matches', () => {
		const access: AccessControlConfig = { mode: 'blacklist', list: [42, -100123] };
		expect(isAllowed(access, 1, 1)).toBe(true);
		expect(isAllowed(access, 1, -999)).toBe(true);
	});

	it('whitelist allows when userId matches', () => {
		const access: AccessControlConfig = { mode: 'whitelist', list: [7] };
		expect(isAllowed(access, 7, 7)).toBe(true);
		expect(isAllowed(access, 7, -123)).toBe(true);
	});

	it('whitelist allows when chatId matches', () => {
		const access: AccessControlConfig = { mode: 'whitelist', list: [-100123] };
		expect(isAllowed(access, 999, -100123)).toBe(true);
	});

	it('whitelist denies when neither matches', () => {
		const access: AccessControlConfig = { mode: 'whitelist', list: [7, -100123] };
		expect(isAllowed(access, 1, 1)).toBe(false);
		expect(isAllowed(access, 8, -999)).toBe(false);
	});

	it('whitelist denies all when list is empty', () => {
		const access: AccessControlConfig = { mode: 'whitelist', list: [] };
		expect(isAllowed(access, 1, 1)).toBe(false);
		expect(isAllowed(access, 2, -100)).toBe(false);
	});
});
