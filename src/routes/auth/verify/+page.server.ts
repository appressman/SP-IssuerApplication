import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { peekMagicLink, verifyMagicLink, SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS } from '$lib/server/auth.js';
import { getDb } from '$lib/server/db.js';

export const load: PageServerLoad = async ({ url, platform }) => {
	const token = url.searchParams.get('token');

	if (!token) {
		throw redirect(302, '/auth/login?error=missing_token');
	}

	try {
		const db = getDb(platform);
		const { valid, error } = await peekMagicLink(db, token);
		if (!valid) {
			throw redirect(302, `/auth/login?error=${encodeURIComponent(error ?? 'Invalid login link.')}`);
		}
		return { token };
	} catch (e) {
		if (e && typeof e === 'object' && 'status' in e) throw e;
		throw redirect(302, '/auth/login?error=' + encodeURIComponent('Something went wrong.'));
	}
};

export const actions: Actions = {
	default: async ({ request, cookies, platform }) => {
		const formData = await request.formData();
		const token = formData.get('token')?.toString();

		if (!token) {
			return fail(400, { error: 'Missing token.' });
		}

		try {
			const db = getDb(platform);
			const { sessionId } = await verifyMagicLink(db, token);
			cookies.set(SESSION_COOKIE_NAME, sessionId, SESSION_COOKIE_OPTIONS);
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Invalid login link.';
			return fail(400, { error: message });
		}

		throw redirect(302, '/app');
	}
};
