import { fail } from '@sveltejs/kit';
import { v4 as uuidv4 } from 'uuid';
import type { Actions, PageServerLoad } from './$types';
import { peekMagicLink, verifyMagicLink, SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS } from '$lib/server/auth.js';
import { getDb } from '$lib/server/db.js';

const NONCE_COOKIE = 'sp_verify_nonce';
const NONCE_COOKIE_OPTS = {
	path: '/auth/verify',
	httpOnly: true,
	secure: true,
	sameSite: 'lax' as const,
	maxAge: 300 // 5 minutes
};

export const load: PageServerLoad = async ({ url, platform, cookies }) => {
	const token = url.searchParams.get('token');

	if (!token) {
		return { token: null, nonce: null, loadError: 'missing_token' };
	}

	try {
		const db = getDb(platform);
		const { valid, error } = await peekMagicLink(db, token);
		if (!valid) {
			return { token: null, nonce: null, loadError: encodeURIComponent(error ?? 'Invalid login link.') };
		}

		// Generate a nonce and set it as a cookie. Scanners don't preserve cookies
		// between GET and POST, so they can't pass this check when submitting the form.
		const nonce = uuidv4();
		cookies.set(NONCE_COOKIE, nonce, NONCE_COOKIE_OPTS);

		return { token, nonce, loadError: null };
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		return { token: null, nonce: null, loadError: encodeURIComponent(msg) };
	}
};

export const actions: Actions = {
	confirm: async ({ request, cookies, platform }) => {
		try {
			const formData = await request.formData();
			const token = formData.get('token')?.toString();
			const nonce = formData.get('nonce')?.toString();
			const cookieNonce = cookies.get(NONCE_COOKIE);

			// Nonce check: rejects stateless scanners that don't maintain cookies
			if (!nonce || !cookieNonce || nonce !== cookieNonce) {
				return fail(400, { error: 'Session expired. Please click the login link again.' });
			}

			cookies.delete(NONCE_COOKIE, { path: '/auth/verify' });

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
