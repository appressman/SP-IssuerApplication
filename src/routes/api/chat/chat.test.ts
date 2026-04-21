import { describe, it, expect, vi } from 'vitest';
import { _makeChatPostHandler } from './+server';
import type { AnthropicClientFactory } from '$lib/integrations/anthropic';

const TEST_APP_ID = '550e8400-e29b-41d4-a716-446655440000';

function mockRequest(body: unknown) {
	return new Request('http://localhost/api/chat', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
}

function mockPlatform(overrides: Partial<App.Platform['env']> = {}) {
	return {
		env: {
			CLAUDE_API_KEY: 'test-key',
			CLAUDE_MODEL: 'claude-haiku-4-5',
			DB: {} as unknown as D1Database,
			...overrides
		}
	} as unknown as App.Platform;
}

function mockLocals(userId: string | null): App.Locals {
	return {
		user: userId ? { id: userId, email: 'u@example.com', name: 'User' } : null,
		sessionId: userId ? 'sess_123' : null,
		requestId: 'req_test'
	};
}

const stubAnthropicFactory: AnthropicClientFactory = () =>
	({
		messages: {
			create: vi.fn().mockResolvedValue({
				content: [{ type: 'text', text: 'Hello from Claude' }],
				model: 'claude-haiku-4-5-20251001',
				usage: {
					input_tokens: 100,
					output_tokens: 20,
					cache_creation_input_tokens: 0,
					cache_read_input_tokens: 0
				}
			})
		}
	}) as unknown as import('@anthropic-ai/sdk').default;

describe('POST /api/chat', () => {
	it('returns 401 when user is not authenticated', async () => {
		const handler = _makeChatPostHandler();
		const response = await handler({
			request: mockRequest({ applicationId: TEST_APP_ID, stepNumber: 1, message: 'hi' }),
			locals: mockLocals(null),
			platform: mockPlatform()
		} as any);

		expect(response.status).toBe(401);
	});

	it('returns 400 on missing applicationId', async () => {
		const handler = _makeChatPostHandler();
		const response = await handler({
			request: mockRequest({ stepNumber: 1, message: 'hi' }),
			locals: mockLocals('user_1'),
			platform: mockPlatform()
		} as any);

		expect(response.status).toBe(400);
		const body = (await response.json()) as { error: string };
		expect(body.error).toBe('Validation failed');
	});

	it('returns 400 on stepNumber out of range', async () => {
		const handler = _makeChatPostHandler();
		const response = await handler({
			request: mockRequest({
				applicationId: TEST_APP_ID,
				stepNumber: 99,
				message: 'hi'
			}),
			locals: mockLocals('user_1'),
			platform: mockPlatform()
		} as any);

		expect(response.status).toBe(400);
	});

	it('returns 503 when CLAUDE_API_KEY is missing', async () => {
		const handler = _makeChatPostHandler();
		const response = await handler({
			request: mockRequest({
				applicationId: TEST_APP_ID,
				stepNumber: 1,
				message: 'hi'
			}),
			locals: mockLocals('user_1'),
			platform: mockPlatform({ CLAUDE_API_KEY: undefined })
		} as any);

		expect(response.status).toBe(503);
	});

	it('returns 403 when application belongs to a different user', async () => {
		const fakeDb = {
			prepare: () => ({
				bind: () => ({
					first: async () => ({
						id: TEST_APP_ID,
						user_id: 'user_OTHER',
						form_data: '{}',
						status: 'draft'
					})
				})
			})
		};

		const platform = {
			env: {
				CLAUDE_API_KEY: 'test-key',
				CLAUDE_MODEL: 'claude-haiku-4-5',
				DB: fakeDb
			}
		} as unknown as App.Platform;

		const handler = _makeChatPostHandler({ clientFactory: stubAnthropicFactory });
		const response = await handler({
			request: mockRequest({
				applicationId: TEST_APP_ID,
				stepNumber: 1,
				message: 'Explain what this step is asking.'
			}),
			locals: mockLocals('user_1'),
			platform
		} as any);

		expect(response.status).toBe(403);
	});

	it('returns assistant text with usage when mocked Claude call succeeds', async () => {
		const fakeDb = {
			prepare: () => ({
				bind: () => ({
					first: async () => ({
						id: TEST_APP_ID,
						user_id: 'user_1',
						form_data: '{"companyName":"Acme","industry":"Technology"}',
						status: 'draft'
					})
				})
			})
		};

		const platform = {
			env: {
				CLAUDE_API_KEY: 'test-key',
				CLAUDE_MODEL: 'claude-haiku-4-5',
				DB: fakeDb
			}
		} as unknown as App.Platform;

		const handler = _makeChatPostHandler({ clientFactory: stubAnthropicFactory });
		const response = await handler({
			request: mockRequest({
				applicationId: TEST_APP_ID,
				stepNumber: 2,
				message: 'What does "prior raise" mean here?'
			}),
			locals: mockLocals('user_1'),
			platform
		} as any);

		expect(response.status).toBe(200);
		const body = (await response.json()) as { text: string; model: string };
		expect(body.text).toBe('Hello from Claude');
		expect(body.model).toBe('claude-haiku-4-5-20251001');
	});

	it('redacts contact PII (email, phone, linkedinUrl) from the prompt', async () => {
		const sensitiveEmail = 'private-user@example.com';
		const sensitivePhone = '+1-555-867-5309';

		const fakeDb = {
			prepare: () => ({
				bind: () => ({
					first: async () => ({
						id: TEST_APP_ID,
						user_id: 'user_1',
						form_data: JSON.stringify({
							contact: {
								fullName: 'Alice Example',
								email: sensitiveEmail,
								phone: sensitivePhone,
								title: 'CEO',
								linkedinUrl: 'https://www.linkedin.com/in/alice'
							},
							company: { legalName: 'Acme Inc', industry: 'Technology' }
						}),
						status: 'draft'
					})
				})
			})
		};

		const createSpy = vi.fn().mockResolvedValue({
			content: [{ type: 'text', text: 'ok' }],
			model: 'claude-haiku-4-5',
			usage: {
				input_tokens: 10,
				output_tokens: 5,
				cache_creation_input_tokens: 0,
				cache_read_input_tokens: 0
			}
		});
		const recordingFactory: AnthropicClientFactory = () =>
			({
				messages: { create: createSpy }
			}) as unknown as import('@anthropic-ai/sdk').default;

		const platform = {
			env: {
				CLAUDE_API_KEY: 'test-key',
				CLAUDE_MODEL: 'claude-haiku-4-5',
				DB: fakeDb
			}
		} as unknown as App.Platform;

		const handler = _makeChatPostHandler({ clientFactory: recordingFactory });
		const response = await handler({
			request: mockRequest({
				applicationId: TEST_APP_ID,
				stepNumber: 1,
				message: 'Tell me about this step.'
			}),
			locals: mockLocals('user_1'),
			platform
		} as any);

		expect(response.status).toBe(200);
		expect(createSpy).toHaveBeenCalledOnce();
		const serialized = JSON.stringify(createSpy.mock.calls[0][0]);
		expect(serialized).not.toContain(sensitiveEmail);
		expect(serialized).not.toContain(sensitivePhone);
		expect(serialized).not.toContain('linkedin.com/in/alice');
		// Allowed contact fields should still be present
		expect(serialized).toContain('Alice Example');
		expect(serialized).toContain('Acme Inc');
	});
});
