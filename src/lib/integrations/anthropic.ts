import Anthropic from '@anthropic-ai/sdk';

export const DEFAULT_CLAUDE_MODEL = 'claude-haiku-4-5-20251001';
export const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
export const OPENROUTER_DEFAULT_MODEL = 'anthropic/claude-haiku-4.5';
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
	baseURL?: string;
}

export type AnthropicClientFactory = (env: AnthropicEnv) => Anthropic;

export const defaultClientFactory: AnthropicClientFactory = (env) =>
	new Anthropic({ apiKey: env.apiKey, ...(env.baseURL ? { baseURL: env.baseURL } : {}) });

export function resolveAnthropicEnv(env: {
	CLAUDE_API_KEY?: string;
	CLAUDE_MODEL?: string;
	OPENROUTER_API_KEY?: string;
}): AnthropicEnv | null {
	if (env.CLAUDE_API_KEY) {
		return {
			apiKey: env.CLAUDE_API_KEY,
			model: env.CLAUDE_MODEL || DEFAULT_CLAUDE_MODEL
		};
	}
	if (env.OPENROUTER_API_KEY) {
		return {
			apiKey: env.OPENROUTER_API_KEY,
			model: env.CLAUDE_MODEL || OPENROUTER_DEFAULT_MODEL,
			baseURL: OPENROUTER_BASE_URL
		};
	}
	return null;
}

export async function createChatCompletion(
	anthropicEnv: AnthropicEnv,
	req: ChatCompletionRequest,
	clientFactory: AnthropicClientFactory = defaultClientFactory
): Promise<ChatCompletionResult> {
	const client = clientFactory(anthropicEnv);

	// cache_control is an Anthropic-only extension; OpenRouter (any custom baseURL) rejects it with 400
	const systemBlock: Anthropic.TextBlockParam = {
		type: 'text',
		text: req.systemPrompt,
		...(anthropicEnv.baseURL ? {} : { cache_control: { type: 'ephemeral' } })
	};

	const response = await client.messages.create({
		model: anthropicEnv.model,
		max_tokens: req.maxTokens ?? DEFAULT_MAX_TOKENS,
		system: [systemBlock],
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
