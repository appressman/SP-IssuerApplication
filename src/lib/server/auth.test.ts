import { describe, it, expect } from 'vitest';
import { SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS } from './auth.js';

describe('Auth configuration', () => {
	it('uses correct session cookie name', () => {
		expect(SESSION_COOKIE_NAME).toBe('sp_session');
	});

	it('session cookie is httpOnly', () => {
		expect(SESSION_COOKIE_OPTIONS.httpOnly).toBe(true);
	});

	it('session cookie is secure', () => {
		expect(SESSION_COOKIE_OPTIONS.secure).toBe(true);
	});

	it('session cookie uses lax sameSite', () => {
		expect(SESSION_COOKIE_OPTIONS.sameSite).toBe('lax');
	});

	it('session cookie expires in 7 days', () => {
		const sevenDaysInSeconds = 7 * 24 * 60 * 60;
		expect(SESSION_COOKIE_OPTIONS.maxAge).toBe(sevenDaysInSeconds);
	});

	it('session cookie path covers entire app', () => {
		expect(SESSION_COOKIE_OPTIONS.path).toBe('/');
	});
});

describe('Auth module exports', () => {
	it('exports all required functions', async () => {
		const auth = await import('./auth.js');
		expect(typeof auth.generateMagicLink).toBe('function');
		expect(typeof auth.verifyMagicLink).toBe('function');
		expect(typeof auth.validateSession).toBe('function');
		expect(typeof auth.destroySession).toBe('function');
	});
});

describe('Email module', () => {
	it('exports sendMagicLinkEmail function', async () => {
		const email = await import('./email.js');
		expect(typeof email.sendMagicLinkEmail).toBe('function');
	});
});
