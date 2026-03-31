export interface MagicLinkEmailParams {
	to: string;
	name: string;
	magicLinkUrl: string;
}

export async function sendMagicLinkEmail(params: MagicLinkEmailParams): Promise<void> {
	const { to, name, magicLinkUrl } = params;

	if (
		typeof process !== 'undefined' &&
		(process.env?.APP_ENV === 'development' || process.env?.NODE_ENV === 'development')
	) {
		console.log('--- MAGIC LINK EMAIL (dev mode) ---');
		console.log(`To: ${to}`);
		console.log(`Name: ${name}`);
		console.log(`Link: ${magicLinkUrl}`);
		console.log('-----------------------------------');
		return;
	}

	// In production, POST to n8n for email delivery
	// This will be wired to an n8n workflow that sends via GHL or SMTP
	try {
		const webhookUrl = process.env?.N8N_WEBHOOK_URL;
		if (!webhookUrl) {
			console.log(`[email] Magic link for ${to}: ${magicLinkUrl}`);
			return;
		}

		// Use a separate n8n endpoint for transactional emails
		const emailWebhookUrl = webhookUrl.replace('issuer-application', 'magic-link-email');
		await fetch(emailWebhookUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				to,
				name,
				magicLinkUrl,
				type: 'magic_link'
			})
		});
	} catch (error) {
		// Log but don't fail - the magic link URL is still valid
		console.error('[email] Failed to send magic link email:', error);
	}
}
