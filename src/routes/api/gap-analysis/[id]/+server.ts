import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db.js';
import { getApplication } from '$lib/server/repositories/applications.js';
import { generateGapAnalysis } from '$lib/server/gapAnalysis.js';
import { calculateScore } from '$lib/scoring/engine.js';

export const GET: RequestHandler = async ({ params, locals, platform }) => {
	if (!locals.user) {
		return new Response('Unauthorized', { status: 401 });
	}

	const db = getDb(platform);
	const app = await getApplication(db, params.id);

	if (!app || app.user_id !== locals.user.id) {
		return new Response('Not found', { status: 404 });
	}

	const formData = JSON.parse(app.form_data);
	const scoring = app.scoring_snapshot
		? JSON.parse(app.scoring_snapshot)
		: calculateScore(formData);

	const buffer = await generateGapAnalysis(formData, scoring);

	const companyName = (formData?.company?.legalName as string | undefined) ?? 'Issuer';
	const safeName = companyName.replace(/[^a-zA-Z0-9_\- ]/g, '').trim().replace(/\s+/g, '_');
	const filename = `${safeName}_Gap_Analysis.docx`;

	return new Response(buffer, {
		headers: {
			'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
			'Content-Disposition': `attachment; filename="${filename}"`,
			'Content-Length': String(buffer.byteLength)
		}
	});
};
