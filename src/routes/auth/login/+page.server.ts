import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';
import { generateMagicLink } from '$lib/server/auth.js';
import { sendMagicLinkEmail } from '$lib/server/email.js';
import { getDb } from '$lib/server/db.js';
import { trackEvent, ANALYTICS_EVENTS } from '$lib/server/repositories/analytics.js';

export const actions: Actions = {
	default: async ({ request, platform }) => {
		const formData = await request.formData();
		const email = formData.get('email')?.toString().trim();
		const name = formData.get('name')?.toString().trim();

		if (!email || !name) {
			return fail(400, {
				error: 'Name and email are required.',
				email: email ?? '',
				name: name ?? ''
			});
		}

		if (name.length < 2) {
			return fail(400, {
				error: 'Please enter your full name.',
				email,
				name
			});
		}

		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			return fail(400, {
				error: 'Please enter a valid email address.',
				email,
				name
			});
		}

		try {
			const db = getDb(platform);
			const baseUrl = platform?.env?.APP_BASE_URL ?? 'http://localhost:5173';

			const { magicLinkUrl, isNewUser } = await generateMagicLink(db, email, name, baseUrl);

			await sendMagicLinkEmail({ to: email, name, magicLinkUrl, env: platform!.env });

			if (isNewUser) {
				try {
					await trackEvent(db, {
						eventType: ANALYTICS_EVENTS.ACCOUNT_CREATED,
						metadata: { email }
					});
				} catch {
					// Don't fail login over analytics
				}
			}

			return { success: true, email };
		} catch (error) {
			console.error('[auth] Magic link generation failed:', error);
			return fail(500, {
				error: 'Something went wrong. Please try again.',
				email,
				name
			});
		}
	}
};
