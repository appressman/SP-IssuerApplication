import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { destroySession, SESSION_COOKIE_NAME } from '$lib/server/auth.js';
import { getDb } from '$lib/server/db.js';

export const POST: RequestHandler = async ({ cookies, platform, locals }) => {
	const sessionId = locals.sessionId;

	if (sessionId) {
		try {
			const db = getDb(platform);
			await destroySession(db, sessionId);
		} catch (error) {
			console.error('[auth] Session destruction failed:', error);
		}
	}

	cookies.delete(SESSION_COOKIE_NAME, { path: '/' });

	throw redirect(302, '/');
};
