import { json } from '@sveltejs/kit';
import { z } from 'zod';
import Anthropic from '@anthropic-ai/sdk';
import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db.js';
import { getApplication } from '$lib/server/repositories/applications.js';
import {
	createChatCompletion,
	resolveAnthropicEnv,
	type AnthropicClientFactory
} from '$lib/integrations/anthropic.js';
import { buildChatMessages } from '$lib/integrations/chatPrompt.js';

const ChatTurnSchema = z.object({
	role: z.enum(['user', 'assistant']),
	content: z.string().min(1).max(4000)
});

const ChatRequestSchema = z.object({
	applicationId: z.string().uuid(),
	stepNumber: z.number().int().min(1).max(13),
	message: z.string().min(1).max(2000),
	history: z.array(ChatTurnSchema).max(20).optional()
});

export interface ChatRouteDeps {
	clientFactory?: AnthropicClientFactory;
}

export function _makeChatPostHandler(deps: ChatRouteDeps = {}): RequestHandler {
	return async ({ request, locals, platform }) => {
		if (!locals.user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		let rawBody: unknown;
		try {
			rawBody = await request.json();
		} catch {
			return json({ error: 'Invalid JSON body' }, { status: 400 });
		}

		const parsed = ChatRequestSchema.safeParse(rawBody);
		if (!parsed.success) {
			const issues = parsed.error.issues.map((i) => ({
				field: i.path.join('.'),
				message: i.message
			}));
			return json({ error: 'Validation failed', issues }, { status: 400 });
		}

		const { applicationId, stepNumber, message, history } = parsed.data;

		const anthropicEnv = resolveAnthropicEnv(platform?.env ?? {});
		if (!anthropicEnv) {
			return json(
				{ error: 'Chat assistant is not configured on this environment' },
				{ status: 503 }
			);
		}

		const db = getDb(platform);
		const app = await getApplication(db, applicationId);
		if (!app) {
			return json({ error: 'Application not found' }, { status: 404 });
		}
		if (app.user_id !== locals.user.id) {
			return json({ error: 'Forbidden' }, { status: 403 });
		}

		let formData: Record<string, unknown> = {};
		try {
			formData = JSON.parse(app.form_data ?? '{}');
		} catch {
			formData = {};
		}

		const { systemPrompt, messages } = buildChatMessages(
			stepNumber,
			formData,
			message,
			history ?? []
		);

		try {
			const completion = await createChatCompletion(
				anthropicEnv,
				{ systemPrompt, messages },
				deps.clientFactory
			);
			console.log('[chat] usage', {
				requestId: locals.requestId,
				model: completion.model,
				...completion.usage
			});
			return json({ text: completion.text, model: completion.model });
		} catch (err) {
			const errInfo =
				err instanceof Error
					? { name: err.name, message: err.message, status: (err as { status?: number }).status }
					: { message: String(err) };
			console.error('[chat] Claude API error', {
				requestId: locals.requestId,
				...errInfo
			});
			if (err instanceof Anthropic.RateLimitError) {
				return json(
					{ error: 'Chat service rate limited', requestId: locals.requestId },
					{ status: 429 }
				);
			}
			if (
				err instanceof Anthropic.AuthenticationError ||
				err instanceof Anthropic.PermissionDeniedError
			) {
				return json(
					{ error: 'Chat service misconfigured', requestId: locals.requestId },
					{ status: 503 }
				);
			}
			if (err instanceof Anthropic.BadRequestError) {
				return json(
					{ error: 'Chat request rejected by provider', requestId: locals.requestId },
					{ status: 400 }
				);
			}
			return json(
				{ error: 'Chat service error', requestId: locals.requestId },
				{ status: 502 }
			);
		}
	};
}

export const POST: RequestHandler = _makeChatPostHandler();
