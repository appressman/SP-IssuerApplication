import { v4 as uuidv4 } from 'uuid';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	// Generate request ID for observability
	event.locals.requestId = uuidv4();

	// Auth will be added in Step 4
	event.locals.user = null;
	event.locals.sessionId = null;

	const response = await resolve(event);

	// Add request ID to response headers
	response.headers.set('x-request-id', event.locals.requestId);

	return response;
};
