import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getDb } from '$lib/server/db.js';
import {
	getApplicationByUserId,
	getSubmittedApplication,
	createApplication
} from '$lib/server/repositories/applications.js';

export const load: PageServerLoad = async ({ locals, platform }) => {
	const user = locals.user!;
	const db = getDb(platform);

	// Check if user has a submitted application
	const submitted = await getSubmittedApplication(db, user.id);
	if (submitted) {
		throw redirect(302, '/app/confirmation');
	}

	// Get existing draft or create new one
	let application = await getApplicationByUserId(db, user.id);
	if (!application) {
		application = await createApplication(db, user.id);
	}

	return {
		user,
		application: {
			id: application.id,
			status: application.status,
			currentStep: application.current_step,
			formData: JSON.parse(application.form_data),
			schemaVersion: application.schema_version
		}
	};
};
