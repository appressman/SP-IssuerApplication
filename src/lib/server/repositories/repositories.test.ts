import { describe, it, expect } from 'vitest';
import { ANALYTICS_EVENTS } from './analytics.js';

describe('Analytics event constants', () => {
	it('defines all 11 event types', () => {
		const events = Object.values(ANALYTICS_EVENTS);
		expect(events).toHaveLength(11);
	});

	it('includes all required Phase 1 events', () => {
		expect(ANALYTICS_EVENTS.LANDING_VIEWED).toBe('landing_viewed');
		expect(ANALYTICS_EVENTS.ACCOUNT_CREATED).toBe('account_created');
		expect(ANALYTICS_EVENTS.APPLICATION_STARTED).toBe('application_started');
		expect(ANALYTICS_EVENTS.STEP_COMPLETED).toBe('step_completed');
		expect(ANALYTICS_EVENTS.DRAFT_SAVED).toBe('draft_saved');
		expect(ANALYTICS_EVENTS.REVIEW_VIEWED).toBe('review_viewed');
		expect(ANALYTICS_EVENTS.SUBMISSION_ATTEMPTED).toBe('submission_attempted');
		expect(ANALYTICS_EVENTS.SUBMISSION_SUCCEEDED).toBe('submission_succeeded');
		expect(ANALYTICS_EVENTS.SUBMISSION_FAILED).toBe('submission_failed');
	});

	it('includes Phase 2 AI events', () => {
		expect(ANALYTICS_EVENTS.AI_OPENED).toBe('ai_opened');
		expect(ANALYTICS_EVENTS.AI_SUGGESTION_APPLIED).toBe('ai_suggestion_applied');
	});
});

describe('Migration SQL', () => {
	it('migration file exists', async () => {
		const fs = await import('fs');
		const path = await import('path');
		const migrationPath = path.resolve(process.cwd(), 'migrations/0001_initial_schema.sql');
		const exists = fs.existsSync(migrationPath);
		expect(exists).toBe(true);
	});

	it('migration creates all required tables', async () => {
		const fs = await import('fs');
		const path = await import('path');
		const migrationPath = path.resolve(process.cwd(), 'migrations/0001_initial_schema.sql');
		const sql = fs.readFileSync(migrationPath, 'utf-8');

		expect(sql).toContain('CREATE TABLE IF NOT EXISTS users');
		expect(sql).toContain('CREATE TABLE IF NOT EXISTS magic_links');
		expect(sql).toContain('CREATE TABLE IF NOT EXISTS sessions');
		expect(sql).toContain('CREATE TABLE IF NOT EXISTS applications');
		expect(sql).toContain('CREATE TABLE IF NOT EXISTS analytics_events');
	});

	it('migration creates all required indexes', async () => {
		const fs = await import('fs');
		const path = await import('path');
		const migrationPath = path.resolve(process.cwd(), 'migrations/0001_initial_schema.sql');
		const sql = fs.readFileSync(migrationPath, 'utf-8');

		expect(sql).toContain('idx_users_email');
		expect(sql).toContain('idx_magic_links_token');
		expect(sql).toContain('idx_applications_user_id');
		expect(sql).toContain('idx_applications_status');
		expect(sql).toContain('idx_analytics_events_application_id');
		expect(sql).toContain('idx_analytics_events_event_type');
	});

	it('applications table has status check constraint', async () => {
		const fs = await import('fs');
		const path = await import('path');
		const migrationPath = path.resolve(process.cwd(), 'migrations/0001_initial_schema.sql');
		const sql = fs.readFileSync(migrationPath, 'utf-8');

		expect(sql).toContain("'draft'");
		expect(sql).toContain("'submit_pending'");
		expect(sql).toContain("'submitted'");
		expect(sql).toContain("'submission_failed'");
		expect(sql).toContain("'abandoned'");
	});
});
