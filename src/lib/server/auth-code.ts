const encoder = new TextEncoder();

export const OTP_LENGTH = 6;
export const OTP_EXPIRY_MINUTES = 15;
export const OTP_MAX_ATTEMPTS = 5;

export function generateOtpCode(length = OTP_LENGTH): string {
	const max = 10 ** length;
	const n = crypto.getRandomValues(new Uint32Array(1))[0] % max;
	return n.toString().padStart(length, '0');
}

export async function hmacSha256Hex(secret: string, value: string): Promise<string> {
	const key = await crypto.subtle.importKey(
		'raw',
		encoder.encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);
	const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(value));
	return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function hashLoginCode(params: {
	secret: string;
	challengeId: string;
	email: string;
	code: string;
}): Promise<string> {
	return hmacSha256Hex(
		params.secret,
		`${params.challengeId}:${params.email.toLowerCase()}:${params.code}`
	);
}
