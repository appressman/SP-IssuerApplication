import { v4 as uuidv4 } from 'uuid';

export interface AnalyticsEvent {
	eventType: string;
	applicationId?: string;
	userId?: string;
	stepId?: number;
	metadata?: Record<string, unknown>;
	appVersion?: string;
	utmSource?: string;
	utmMedium?: string;
	utmCampaign?: string;
}

export const ANALYTICS_EVENTS = {
	LANDING_VIEWED: 'landing_viewed',
	ACCOUNT_CREATED: 'account_created',
	APPLICATION_STARTED: 'application_started',
	STEP_COMPLETED: 'step_completed',
	DRAFT_SAVED: 'draft_saved',
	AI_OPENED: 'ai_opened',
	AI_SUGGESTION_APPLIED: 'ai_suggestion_applied',
	REVIEW_VIEWED: 'review_viewed',
	SUBMISSION_ATTEMPTED: 'submission_attempted',
	SUBMISSION_SUCCEEDED: 'submission_succeeded',
	SUBMISSION_FAILED: 'submission_failed'
} as const;

export async function trackEvent(db: D1Database, event: AnalyticsEvent): Promise<void> {
	const id = uuidv4();
	await db
		.prepare(
			`INSERT INTO analytics_events
			 (id, application_id, user_id, event_type, step_id, metadata, app_version, utm_source, utm_medium, utm_campaign)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
		)
		.bind(
			id,
			event.applicationId ?? null,
			event.userId ?? null,
			event.eventType,
			event.stepId ?? null,
			event.metadata ? JSON.stringify(event.metadata) : null,
			event.appVersion ?? '0.1.0',
			event.utmSource ?? null,
			event.utmMedium ?? null,
			event.utmCampaign ?? null
		)
		.run();
}
