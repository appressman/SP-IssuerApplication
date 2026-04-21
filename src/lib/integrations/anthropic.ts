import Anthropic from '@anthropic-ai/sdk';

export const DEFAULT_CLAUDE_MODEL = 'claude-haiku-4-5';
export const DEFAULT_MAX_TOKENS = 1024;

export type ChatRole = 'user' | 'assistant';

export interface ChatTurn {
	role: ChatRole;
	content: string;
}

export interface ChatCompletionRequest {
	systemPrompt: string;
	messages: ChatTurn[];
	maxTokens?: number;
}

export interface ChatCompletionResult {
	text: string;
	model: string;
	usage: {
		input_tokens: number;
		output_tokens: number;
		cache_creation_input_tokens: number;
		cache_read_input_tokens: number;
	};
}

export interface AnthropicEnv {
	apiKey: string;
	model: string;
}

export type AnthropicClientFactory = (env: AnthropicEnv) => Anthropic;

export const defaultClientFactory: AnthropicClientFactory = (env) =>
	new Anthropic({ apiKey: env.apiKey });

export function resolveAnthropicEnv(env: {
	CLAUDE_API_KEY?: string;
	CLAUDE_MODEL?: string;
}): AnthropicEnv | null {
	if (!env.CLAUDE_API_KEY) return null;
	return {
		apiKey: env.CLAUDE_API_KEY,
		model: env.CLAUDE_MODEL || DEFAULT_CLAUDE_MODEL
	};
}

export async function createChatCompletion(
	anthropicEnv: AnthropicEnv,
	req: ChatCompletionRequest,
	clientFactory: AnthropicClientFactory = defaultClientFactory
): Promise<ChatCompletionResult> {
	const client = clientFactory(anthropicEnv);

	const response = await client.messages.create({
		model: anthropicEnv.model,
		max_tokens: req.maxTokens ?? DEFAULT_MAX_TOKENS,
		system: [
			{
				type: 'text',
				text: req.systemPrompt,
				// Haiku 4.5 needs ≥4096 prefix tokens for actual cache hits. Marker is a no-op
				// until the system prompt grows past that threshold; leaving it in so caching
				// engages automatically when the prompt expands.
				cache_control: { type: 'ephemeral' }
			}
		],
		messages: req.messages.map((m) => ({ role: m.role, content: m.content }))
	});

	const text = response.content
		.filter((b): b is Anthropic.TextBlock => b.type === 'text')
		.map((b) => b.text)
		.join('');

	return {
		text,
		model: response.model,
		usage: {
			input_tokens: response.usage.input_tokens,
			output_tokens: response.usage.output_tokens,
			cache_creation_input_tokens: response.usage.cache_creation_input_tokens ?? 0,
			cache_read_input_tokens: response.usage.cache_read_input_tokens ?? 0
		}
	};
}
