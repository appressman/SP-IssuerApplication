import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyMagicLink, SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS } from '$lib/server/auth.js';
import { getDb } from '$lib/server/db.js';

export const GET: RequestHandler = async ({ url, cookies, platform }) => {
	const token = url.searchParams.get('token');

	if (!token) {
		throw redirect(302, '/auth/login?error=missing_token');
	}

	try {
		const db = getDb(platform);
		const { sessionId } = await verifyMagicLink(db, token);

		cookies.set(SESSION_COOKIE_NAME, sessionId, SESSION_COOKIE_OPTIONS);

		throw redirect(302, '/app');
	} catch (error) {
		if (error instanceof Response) throw error;
		// SvelteKit redirect throws a special object
		if (
			error &&
			typeof error === 'object' &&
			'status' in error &&
			(error as any).status >= 300 &&
			(error as any).status < 400
		) {
			throw error;
		}

		const message = error instanceof Error ? error.message : 'Invalid login link';
		console.error('[auth] Magic link verification failed:', message);
		throw redirect(302, `/auth/login?error=${encodeURIComponent(message)}`);
	}
};
