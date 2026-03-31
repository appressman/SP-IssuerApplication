import { v4 as uuidv4 } from 'uuid';
import { createUser, getUserByEmail, getUserById, updateLastLogin } from './repositories/users.js';

const MAGIC_LINK_EXPIRY_MINUTES = 15;
const SESSION_EXPIRY_DAYS = 7;

export interface AuthResult {
	userId: string;
	sessionId: string;
}

export async function generateMagicLink(
	db: D1Database,
	email: string,
	name: string,
	baseUrl: string
): Promise<{ magicLinkUrl: string; isNewUser: boolean }> {
	let user = await getUserByEmail(db, email);
	let isNewUser = false;

	if (!user) {
		user = await createUser(db, email, name);
		isNewUser = true;
	}

	const token = uuidv4();
	const id = uuidv4();
	const expiresAt = new Date(Date.now() + MAGIC_LINK_EXPIRY_MINUTES * 60 * 1000).toISOString();

	await db
		.prepare(
			'INSERT INTO magic_links (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)'
		)
		.bind(id, user.id, token, expiresAt)
		.run();

	const magicLinkUrl = `${baseUrl}/auth/verify?token=${token}`;
	return { magicLinkUrl, isNewUser };
}

export async function verifyMagicLink(db: D1Database, token: string): Promise<AuthResult> {
	const link = await db
		.prepare('SELECT * FROM magic_links WHERE token = ?')
		.bind(token)
		.first<{
			id: string;
			user_id: string;
			token: string;
			expires_at: string;
			used_at: string | null;
		}>();

	if (!link) {
		throw new Error('Invalid or expired login link.');
	}

	if (link.used_at) {
		throw new Error('This login link has already been used.');
	}

	if (new Date(link.expires_at) < new Date()) {
		throw new Error('This login link has expired. Please request a new one.');
	}

	// Mark link as used
	await db
		.prepare('UPDATE magic_links SET used_at = ? WHERE id = ?')
		.bind(new Date().toISOString(), link.id)
		.run();

	// Create session
	const sessionId = uuidv4();
	const sessionExpiry = new Date(
		Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000
	).toISOString();

	await db
		.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)')
		.bind(sessionId, link.user_id, sessionExpiry)
		.run();

	// Update last login
	await updateLastLogin(db, link.user_id);

	return { userId: link.user_id, sessionId };
}

export async function validateSession(
	db: D1Database,
	sessionId: string
): Promise<{ id: string; email: string; name: string } | null> {
	const session = await db
		.prepare('SELECT * FROM sessions WHERE id = ?')
		.bind(sessionId)
		.first<{ id: string; user_id: string; expires_at: string }>();

	if (!session) return null;

	if (new Date(session.expires_at) < new Date()) {
		// Clean up expired session
		await db.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionId).run();
		return null;
	}

	const user = await getUserById(db, session.user_id);
	if (!user) return null;

	return { id: user.id, email: user.email, name: user.name };
}

export async function destroySession(db: D1Database, sessionId: string): Promise<void> {
	await db.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionId).run();
}

export const SESSION_COOKIE_NAME = 'sp_session';
export const SESSION_COOKIE_OPTIONS = {
	path: '/',
	httpOnly: true,
	secure: true,
	sameSite: 'lax' as const,
	maxAge: SESSION_EXPIRY_DAYS * 24 * 60 * 60
};
