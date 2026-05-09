import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { generateOtpCode, hashLoginCode, OTP_EXPIRY_MINUTES } from '$lib/server/auth-code.js';
import { sendOtpEmail } from '$lib/server/email.js';
import { getDb } from '$lib/server/db.js';
import { createUser, getUserByEmail } from '$lib/server/repositories/users.js';
import { trackEvent, ANALYTICS_EVENTS } from '$lib/server/repositories/analytics.js';

export const actions: Actions = {
	login: async ({ request, platform, getClientAddress }) => {
		const formData = await request.formData();
		const email = formData.get('email')?.toString().trim().toLowerCase();
		const name = formData.get('name')?.toString().trim();

		if (!email || !name) {
			return fail(400, { error: 'Name and email are required.', email: email ?? '', name: name ?? '' });
		}
		if (name.length < 2) {
			return fail(400, { error: 'Please enter your full name.', email, name });
		}
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			return fail(400, { error: 'Please enter a valid email address.', email, name });
		}

		const authSecret = platform?.env?.AUTH_SECRET;
		if (!authSecret) {
			console.error('[auth] AUTH_SECRET not configured');
			return fail(500, { error: 'Auth is not configured. Contact support.', email, name });
		}

		try {
			const db = getDb(platform);

			let user = await getUserByEmail(db, email);
			let isNewUser = false;
			if (!user) {
				user = await createUser(db, email, name);
				isNewUser = true;
			}

			const challengeId = crypto.randomUUID();
			const code = generateOtpCode();
			const now = new Date();
			const expiresAt = new Date(now.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();
			const codeHash = await hashLoginCode({ secret: authSecret, challengeId, email, code });

			await db
				.prepare(
					`INSERT INTO login_challenges
					(id, user_id, email, code_hash, expires_at, request_ip, request_user_agent)
					VALUES (?, ?, ?, ?, ?, ?, ?)`
				)
				.bind(
					challengeId,
					user.id,
					email,
					codeHash,
					expiresAt,
					getClientAddress(),
					request.headers.get('user-agent') ?? ''
				)
				.run();

			await sendOtpEmail({
				to: email,
				name: user.name,
				code,
				challengeId,
				env: platform!.env
			});

			if (isNewUser) {
				try {
					await trackEvent(db, { eventType: ANALYTICS_EVENTS.ACCOUNT_CREATED, metadata: { email } });
				} catch {
					// Don't fail login over analytics
				}
			}

			return { success: true, email, challengeId };
		} catch (error) {
			console.error('[auth] OTP generation failed:', error);
			return fail(500, { error: 'Something went wrong. Please try again.', email, name });
		}
	}
};
