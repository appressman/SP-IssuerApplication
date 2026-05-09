import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { peekMagicLink, verifyMagicLink, SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS } from '$lib/server/auth.js';
import { getDb } from '$lib/server/db.js';

export const load: PageServerLoad = async ({ url, platform }) => {
	const token = url.searchParams.get('token');

	if (!token) {
		return { token: null, loadError: 'missing_token' };
	}

	try {
		const db = getDb(platform);
		const { valid, error } = await peekMagicLink(db, token);
		if (!valid) {
			return { token: null, loadError: encodeURIComponent(error ?? 'Invalid login link.') };
		}
		return { token, loadError: null };
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		return { token: null, loadError: encodeURIComponent(msg) };
	}
};

export const actions: Actions = {
	confirm: async ({ request, cookies, platform }) => {
		try {
			const formData = await request.formData();
			const token = formData.get('token')?.toString();

			if (!token) {
				return fail(400, { error: 'Missing token.' });
			}

			const db = getDb(platform);
			const { sessionId } = await verifyMagicLink(db, token);
			cookies.set(SESSION_COOKIE_NAME, sessionId, SESSION_COOKIE_OPTIONS);

			return { success: true as const };
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			console.error('[verify] action error:', message);
			return fail(400, { error: message });
		}
	}
};
