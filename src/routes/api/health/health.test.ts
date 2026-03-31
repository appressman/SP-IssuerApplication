import { describe, it, expect } from 'vitest';
import { GET } from './+server';

describe('Health endpoint', () => {
	it('returns status ok with version', async () => {
		const response = await GET({} as any);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.status).toBe('ok');
		expect(body.version).toBe('0.1.0');
		expect(body.timestamp).toBeDefined();
	});
});
