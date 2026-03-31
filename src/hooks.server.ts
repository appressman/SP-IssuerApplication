import { v4 as uuidv4 } from 'uuid';
import { redirect, type Handle } from '@sveltejs/kit';
import { validateSession, SESSION_COOKIE_NAME } from '$lib/server/auth.js';

export const handle: Handle = async ({ event, resolve }) => {
	// Generate request ID for observability
	event.locals.requestId = uuidv4();
	event.locals.user = null;
	event.locals.sessionId = null;

	// Validate session from cookie
	const sessionId = event.cookies.get(SESSION_COOKIE_NAME);
	if (sessionId && event.platform?.env?.DB) {
		try {
			const user = await validateSession(event.platform.env.DB, sessionId);
			if (user) {
				event.locals.user = user;
				event.locals.sessionId = sessionId;
			} else {
				// Session expired or invalid, clear cookie
				event.cookies.delete(SESSION_COOKIE_NAME, { path: '/' });
			}
		} catch (error) {
			console.error('[auth] Session validation error:', error);
			event.cookies.delete(SESSION_COOKIE_NAME, { path: '/' });
		}
	}

	// Protect (app) routes - require authentication
	if (event.url.pathname.startsWith('/app') && !event.locals.user) {
		const returnTo = encodeURIComponent(event.url.pathname);
		throw redirect(302, `/auth/login?returnTo=${returnTo}`);
	}

	const response = await resolve(event);

	// Add request ID to response headers
	response.headers.set('x-request-id', event.locals.requestId);

	return response;
};
