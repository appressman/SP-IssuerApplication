import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '$lib/server/db.js';
import {
	getApplication,
	updateFormData,
	updateScoringSnapshot,
	updateStatus,
	setSubmitted,
	setSubmissionFailed
} from '$lib/server/repositories/applications.js';
import { trackEvent, ANALYTICS_EVENTS } from '$lib/server/repositories/analytics.js';
import { calculateScore } from '$lib/scoring/engine.js';
import { buildWebhookPayload } from '$lib/normalization/ghlMapping.js';
import {
	sendSubmissionConfirmation,
	sendSubmissionNotification
} from '$lib/server/email.js';

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { applicationId, consent } = await request.json();

	if (!applicationId || !consent?.agreedToProcessing || !consent?.agreedToDisclaimers) {
		return json({ error: 'Missing required consent' }, { status: 400 });
	}

	const db = getDb(platform);
	const app = await getApplication(db, applicationId);

	if (!app || app.user_id !== locals.user.id) {
		return json({ error: 'Application not found' }, { status: 404 });
	}

	if (app.status === 'submitted') {
		return json({ error: 'Application already submitted' }, { status: 409 });
	}

	if (app.status !== 'draft' && app.status !== 'submission_failed') {
		return json({ error: 'Application cannot be submitted in current state' }, { status: 400 });
	}

	const idempotencyKey = uuidv4();
	const formData = JSON.parse(app.form_data);

	// Add consent to form data
	formData.consent = consent;
	await updateFormData(db, applicationId, formData, 13);

	// Track attempt
	try {
		await trackEvent(db, {
			eventType: ANALYTICS_EVENTS.SUBMISSION_ATTEMPTED,
			applicationId,
			userId: locals.user.id
		});
	} catch { /* don't fail submission over analytics */ }

	// Calculate score
	const scoring = calculateScore(formData);
	await updateScoringSnapshot(db, applicationId, scoring);

	// Set pending status
	await updateStatus(db, applicationId, 'submit_pending');

	// Build and send webhook
	const env: Partial<App.Platform['env']> = platform?.env ?? {};
	const webhookUrl = env.N8N_WEBHOOK_URL;

	let webhookResult: Record<string, unknown> = { sent: false };

	if (webhookUrl) {
		try {
			const payload = buildWebhookPayload(formData, scoring, applicationId, {
				GHL_PIPELINE_ID: env.GHL_PIPELINE_ID ?? '',
				GHL_DISCOVERY_STAGE_ID: env.GHL_DISCOVERY_STAGE_ID ?? '',
				GHL_PROSPECTING_STAGE_ID: env.GHL_PROSPECTING_STAGE_ID ?? ''
			});

			const webhookRes = await fetch(webhookUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					...(env.N8N_WEBHOOK_SECRET ? { 'X-Webhook-Secret': env.N8N_WEBHOOK_SECRET } : {})
				},
				body: JSON.stringify(payload)
			});

			webhookResult = {
				sent: true,
				status: webhookRes.status,
				ok: webhookRes.ok
			};
		} catch (error) {
			webhookResult = {
				sent: false,
				error: String(error)
			};
		}
	} else {
		// Dev mode: log instead
		console.log('[submit] No webhook URL configured, logging payload');
		console.log('[submit] Scoring:', JSON.stringify(scoring, null, 2));
		webhookResult = { sent: false, reason: 'no_webhook_url' };
	}

	// Mark submitted regardless of webhook (we have the data locally)
	try {
		const submittedAt = new Date().toISOString();
		await setSubmitted(db, applicationId, idempotencyKey, {
			scoring,
			webhook: webhookResult,
			timestamp: submittedAt
		});

		await trackEvent(db, {
			eventType: ANALYTICS_EVENTS.SUBMISSION_SUCCEEDED,
			applicationId,
			userId: locals.user.id,
			metadata: { score: scoring.totalScore, band: scoring.band }
		});

		const emailEnv = {
			APP_ENV: env.APP_ENV ?? 'production',
			APP_BASE_URL: env.APP_BASE_URL,
			RESEND_API_KEY: env.RESEND_API_KEY,
			RESEND_FROM_EMAIL: env.RESEND_FROM_EMAIL
		};
		const issuerEmail = formData?.contact?.email as string | undefined;
		const issuerName = (formData?.contact?.fullName as string | undefined) ?? 'there';
		const companyName = (formData?.company?.legalName as string | undefined) ?? null;
		const raiseTargetUsd = (formData?.offering?.raiseTargetUsd as number | null | undefined) ?? null;

		if (issuerEmail) {
			try {
				await sendSubmissionConfirmation({
					to: issuerEmail,
					name: issuerName,
					scoring,
					env: emailEnv
				});
			} catch (err) {
				console.error('[submit] issuer confirmation email failed', err);
			}
		}

		const notifyTo = env.INFO_NOTIFICATION_EMAIL;
		if (notifyTo) {
			try {
				await sendSubmissionNotification({
					to: notifyTo,
					applicationId,
					issuerName,
					issuerEmail: issuerEmail ?? '(not provided)',
					companyName,
					raiseTargetUsd,
					scoring,
					submittedAt,
					env: emailEnv
				});
			} catch (err) {
				console.error('[submit] SP notification email failed', err);
			}
		}

		return json({ ok: true, scoring });
	} catch (error) {
		await setSubmissionFailed(db, applicationId, idempotencyKey, {
			error: String(error),
			timestamp: new Date().toISOString()
		});

		await trackEvent(db, {
			eventType: ANALYTICS_EVENTS.SUBMISSION_FAILED,
			applicationId,
			userId: locals.user.id,
			metadata: { error: String(error) }
		}).catch(() => {});

		return json({ error: 'Submission failed. Please try again.' }, { status: 500 });
	}
};
