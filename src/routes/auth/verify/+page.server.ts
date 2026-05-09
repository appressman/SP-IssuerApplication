import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { hashLoginCode, OTP_MAX_ATTEMPTS } from '$lib/server/auth-code.js';
import { SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS } from '$lib/server/auth.js';
import { getDb } from '$lib/server/db.js';
import { updateLastLogin } from '$lib/server/repositories/users.js';

const SESSION_EXPIRY_DAYS = 7;

export const load: PageServerLoad = async ({ url }) => {
	const challengeId = url.searchParams.get('id');
	return { challengeId };
};

export const actions: Actions = {
	verify: async ({ request, cookies, platform, getClientAddress }) => {
		console.error('[verify] action started');
		try {
			const formData = await request.formData();
			const challengeId = formData.get('challenge_id')?.toString();
			const code = formData.get('code')?.toString().trim();

			console.error('[verify] challengeId:', challengeId, 'code length:', code?.length);

			if (!challengeId || !code) {
				console.error('[verify] missing params');
				return fail(400, {
					error: 'Missing code or session. Please request a new login code.',
					challengeId: challengeId ?? ''
				});
			}

			const authSecret = platform?.env?.AUTH_SECRET;
			if (!authSecret) {
				console.error('[verify] AUTH_SECRET missing');
				return fail(500, { error: 'Auth is not configured. Contact support.', challengeId });
			}
			console.error('[verify] AUTH_SECRET present, length:', authSecret.length);

			const db = getDb(platform);
			console.error('[verify] db obtained');

			const challenge = await db
				.prepare(
					`SELECT id, user_id, email, code_hash, expires_at, used_at, attempts
					FROM login_challenges WHERE id = ?`
				)
				.bind(challengeId)
				.first<{
					id: string;
					user_id: string;
					email: string;
					code_hash: string;
					expires_at: string;
					used_at: string | null;
					attempts: number;
				}>();

			console.error('[verify] challenge found:', !!challenge);

			if (!challenge) {
				return fail(400, { error: 'Invalid or expired session. Please request a new code.', challengeId });
			}
			if (challenge.used_at) {
				return fail(400, { error: 'This code has already been used. Please request a new one.', challengeId });
			}
			if (new Date(challenge.expires_at) < new Date()) {
				return fail(400, { error: 'This code has expired. Please request a new one.', challengeId });
			}
			if (challenge.attempts >= OTP_MAX_ATTEMPTS) {
				return fail(429, { error: 'Too many attempts. Please request a new login code.', challengeId });
			}

			const expectedHash = await hashLoginCode({
				secret: authSecret,
				challengeId,
				email: challenge.email,
				code
			});
			console.error('[verify] hash computed, match:', expectedHash === challenge.code_hash);

			if (expectedHash !== challenge.code_hash) {
				await db
					.prepare('UPDATE login_challenges SET attempts = attempts + 1 WHERE id = ?')
					.bind(challengeId)
					.run();
				const remaining = OTP_MAX_ATTEMPTS - (challenge.attempts + 1);
				if (remaining <= 0) {
					return fail(429, { error: 'Too many incorrect attempts. Please request a new login code.', challengeId });
				}
				return fail(400, {
					error: `Incorrect code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
					challengeId
				});
			}

			console.error('[verify] code correct, creating session');
			const sessionId = crypto.randomUUID();
			const sessionExpiry = new Date(Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();
			const now = new Date().toISOString();
			const ip = getClientAddress();
			const ua = request.headers.get('user-agent') ?? '';

			await db
				.prepare(`UPDATE login_challenges SET used_at = ?, consumed_ip = ?, consumed_user_agent = ? WHERE id = ?`)
				.bind(now, ip, ua, challengeId)
				.run();
			console.error('[verify] challenge marked used');

			await db
				.prepare(`INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)`)
				.bind(sessionId, challenge.user_id, sessionExpiry)
				.run();
			console.error('[verify] session inserted');

			try {
				await updateLastLogin(db, challenge.user_id);
			} catch {
				// non-critical
			}

			cookies.set(SESSION_COOKIE_NAME, sessionId, SESSION_COOKIE_OPTIONS);
			console.error('[verify] cookie set, returning success');

			return { success: true as const };
		} catch (err) {
			console.error('[verify] CAUGHT ERROR:', err instanceof Error ? err.message : String(err));
			return fail(500, { error: 'Something went wrong. Please try again.', challengeId: '' });
		}
	}
};
