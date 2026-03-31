import { v4 as uuidv4 } from 'uuid';

export interface Application {
	id: string;
	user_id: string;
	status: string;
	current_step: number;
	form_data: string;
	scoring_snapshot: string | null;
	schema_version: string;
	idempotency_key: string | null;
	created_at: string;
	updated_at: string;
	submitted_at: string | null;
	submission_response: string | null;
}

export async function createApplication(db: D1Database, userId: string): Promise<Application> {
	const id = uuidv4();
	const now = new Date().toISOString();
	await db
		.prepare(
			`INSERT INTO applications (id, user_id, status, current_step, form_data, schema_version, created_at, updated_at)
			 VALUES (?, ?, 'draft', 1, '{}', '1.0', ?, ?)`
		)
		.bind(id, userId, now, now)
		.run();

	return {
		id,
		user_id: userId,
		status: 'draft',
		current_step: 1,
		form_data: '{}',
		scoring_snapshot: null,
		schema_version: '1.0',
		idempotency_key: null,
		created_at: now,
		updated_at: now,
		submitted_at: null,
		submission_response: null
	};
}

export async function getApplication(db: D1Database, applicationId: string): Promise<Application | null> {
	const result = await db
		.prepare('SELECT * FROM applications WHERE id = ?')
		.bind(applicationId)
		.first<Application>();
	return result ?? null;
}

export async function getApplicationByUserId(db: D1Database, userId: string): Promise<Application | null> {
	const result = await db
		.prepare(
			`SELECT * FROM applications
			 WHERE user_id = ? AND status IN ('draft', 'submission_failed')
			 ORDER BY updated_at DESC LIMIT 1`
		)
		.bind(userId)
		.first<Application>();
	return result ?? null;
}

export async function getSubmittedApplication(db: D1Database, userId: string): Promise<Application | null> {
	const result = await db
		.prepare(
			`SELECT * FROM applications
			 WHERE user_id = ? AND status = 'submitted'
			 ORDER BY submitted_at DESC LIMIT 1`
		)
		.bind(userId)
		.first<Application>();
	return result ?? null;
}

export async function updateFormData(
	db: D1Database,
	applicationId: string,
	formData: Record<string, unknown>,
	currentStep: number
): Promise<void> {
	await db
		.prepare(
			`UPDATE applications
			 SET form_data = ?, current_step = ?, updated_at = ?
			 WHERE id = ?`
		)
		.bind(JSON.stringify(formData), currentStep, new Date().toISOString(), applicationId)
		.run();
}

export async function updateStatus(db: D1Database, applicationId: string, status: string): Promise<void> {
	await db
		.prepare('UPDATE applications SET status = ?, updated_at = ? WHERE id = ?')
		.bind(status, new Date().toISOString(), applicationId)
		.run();
}

export async function updateScoringSnapshot(
	db: D1Database,
	applicationId: string,
	scoring: Record<string, unknown>
): Promise<void> {
	await db
		.prepare('UPDATE applications SET scoring_snapshot = ?, updated_at = ? WHERE id = ?')
		.bind(JSON.stringify(scoring), new Date().toISOString(), applicationId)
		.run();
}

export async function setSubmitted(
	db: D1Database,
	applicationId: string,
	idempotencyKey: string,
	response: Record<string, unknown>
): Promise<void> {
	const now = new Date().toISOString();
	await db
		.prepare(
			`UPDATE applications
			 SET status = 'submitted', submitted_at = ?, idempotency_key = ?,
			     submission_response = ?, updated_at = ?
			 WHERE id = ?`
		)
		.bind(now, idempotencyKey, JSON.stringify(response), now, applicationId)
		.run();
}

export async function setSubmissionFailed(
	db: D1Database,
	applicationId: string,
	idempotencyKey: string,
	errorResponse: Record<string, unknown>
): Promise<void> {
	await db
		.prepare(
			`UPDATE applications
			 SET status = 'submission_failed', idempotency_key = ?,
			     submission_response = ?, updated_at = ?
			 WHERE id = ?`
		)
		.bind(idempotencyKey, JSON.stringify(errorResponse), new Date().toISOString(), applicationId)
		.run();
}
