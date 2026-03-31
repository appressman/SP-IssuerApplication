import { v4 as uuidv4 } from 'uuid';

export interface User {
	id: string;
	email: string;
	name: string;
	created_at: string;
	last_login_at: string | null;
}

export async function createUser(db: D1Database, email: string, name: string): Promise<User> {
	const id = uuidv4();
	const now = new Date().toISOString();
	await db
		.prepare('INSERT INTO users (id, email, name, created_at) VALUES (?, ?, ?, ?)')
		.bind(id, email.toLowerCase(), name, now)
		.run();

	return { id, email: email.toLowerCase(), name, created_at: now, last_login_at: null };
}

export async function getUserByEmail(db: D1Database, email: string): Promise<User | null> {
	const result = await db
		.prepare('SELECT * FROM users WHERE email = ?')
		.bind(email.toLowerCase())
		.first<User>();
	return result ?? null;
}

export async function getUserById(db: D1Database, id: string): Promise<User | null> {
	const result = await db
		.prepare('SELECT * FROM users WHERE id = ?')
		.bind(id)
		.first<User>();
	return result ?? null;
}

export async function updateLastLogin(db: D1Database, userId: string): Promise<void> {
	await db
		.prepare('UPDATE users SET last_login_at = ? WHERE id = ?')
		.bind(new Date().toISOString(), userId)
		.run();
}
