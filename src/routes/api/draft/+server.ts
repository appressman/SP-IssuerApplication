import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db.js';
import { getApplication, updateFormData } from '$lib/server/repositories/applications.js';
import { trackEvent, ANALYTICS_EVENTS } from '$lib/server/repositories/analytics.js';

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	if (!locals.user) {
		return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
	}

	const { applicationId, currentStep, formData } = await request.json();

	if (!applicationId || !formData) {
		return json({ ok: false, error: 'Missing required fields' }, { status: 400 });
	}

	const db = getDb(platform);
	const app = await getApplication(db, applicationId);

	if (!app || app.user_id !== locals.user.id) {
		return json({ ok: false, error: 'Application not found' }, { status: 404 });
	}

	if (app.status !== 'draft' && app.status !== 'submission_failed') {
		return json({ ok: false, error: 'Application cannot be modified' }, { status: 400 });
	}

	await updateFormData(db, applicationId, formData, currentStep ?? app.current_step);

	try {
		await trackEvent(db, {
			eventType: ANALYTICS_EVENTS.DRAFT_SAVED,
			applicationId,
			userId: locals.user.id,
			stepId: currentStep
		});
	} catch {
		// Don't fail save over analytics
	}

	return json({ ok: true });
};
