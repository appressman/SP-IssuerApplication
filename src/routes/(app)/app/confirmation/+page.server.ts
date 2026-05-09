import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getDb } from '$lib/server/db.js';
import { getSubmittedApplication } from '$lib/server/repositories/applications.js';

export const load: PageServerLoad = async ({ locals, platform }) => {
	const user = locals.user!;
	const db = getDb(platform);

	const application = await getSubmittedApplication(db, user.id);
	if (!application) {
		throw redirect(302, '/app');
	}

	const scoring = application.scoring_snapshot
		? JSON.parse(application.scoring_snapshot)
		: null;

	return {
		user,
		submittedAt: application.submitted_at,
		score: scoring?.totalScore ?? null,
		band: scoring?.band ?? null
	};
};
