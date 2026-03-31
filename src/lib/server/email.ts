export interface MagicLinkEmailParams {
	to: string;
	name: string;
	magicLinkUrl: string;
	env: {
		APP_ENV: string;
		RESEND_API_KEY?: string;
		RESEND_FROM_EMAIL?: string;
	};
}

export async function sendMagicLinkEmail(params: MagicLinkEmailParams): Promise<void> {
	const { to, name, magicLinkUrl, env } = params;

	// Dev mode: log to console instead of sending
	if (env.APP_ENV === 'development') {
		console.log('--- MAGIC LINK EMAIL (dev mode) ---');
		console.log(`To: ${to}`);
		console.log(`Name: ${name}`);
		console.log(`Link: ${magicLinkUrl}`);
		console.log('-----------------------------------');
		return;
	}

	const apiKey = env.RESEND_API_KEY;
	if (!apiKey) {
		console.error('[email] RESEND_API_KEY not configured. Magic link not sent.');
		console.log(`[email] Magic link for ${to}: ${magicLinkUrl}`);
		return;
	}

	const fromEmail = env.RESEND_FROM_EMAIL ?? 'noreply@syndicatepath.com';
	const firstName = name.split(' ')[0];

	const response = await fetch('https://api.resend.com/emails', {
		method: 'POST',
		headers: {
			'Authorization': `Bearer ${apiKey}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			from: `SyndicatePath <${fromEmail}>`,
			to: [to],
			subject: 'Your SyndicatePath Login Link',
			html: buildMagicLinkHtml(firstName, magicLinkUrl),
			text: buildMagicLinkText(firstName, magicLinkUrl)
		})
	});

	if (!response.ok) {
		const body = await response.text();
		console.error(`[email] Resend API error ${response.status}: ${body}`);
		throw new Error(`Failed to send magic link email: ${response.status}`);
	}
}

function buildMagicLinkHtml(firstName: string, magicLinkUrl: string): string {
	return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7;padding:40px 20px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:8px;overflow:hidden;">
  <tr>
    <td style="background-color:#1a2b4a;padding:24px 32px;text-align:center;">
      <span style="color:#d4a843;font-size:20px;font-weight:700;letter-spacing:0.5px;">SYNDICATEPATH</span>
    </td>
  </tr>
  <tr>
    <td style="padding:32px;">
      <p style="margin:0 0 16px;color:#333;font-size:16px;">Hi ${firstName},</p>
      <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.5;">
        Click the button below to log in to your Issuer Readiness Assessment. This link expires in 15 minutes.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td align="center" style="padding:8px 0 24px;">
          <a href="${magicLinkUrl}" style="display:inline-block;background-color:#d4a843;color:#1a2b4a;font-weight:600;font-size:16px;padding:14px 32px;border-radius:6px;text-decoration:none;">
            Log In
          </a>
        </td></tr>
      </table>
      <p style="margin:0 0 8px;color:#888;font-size:13px;">
        Or copy and paste this URL into your browser:
      </p>
      <p style="margin:0 0 24px;color:#d4a843;font-size:13px;word-break:break-all;">
        ${magicLinkUrl}
      </p>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
      <p style="margin:0;color:#aaa;font-size:12px;line-height:1.4;">
        If you did not request this link, you can safely ignore this email.
      </p>
    </td>
  </tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function buildMagicLinkText(firstName: string, magicLinkUrl: string): string {
	return `Hi ${firstName},

Click the link below to log in to your SyndicatePath Issuer Readiness Assessment.

${magicLinkUrl}

This link expires in 15 minutes. If you did not request this, you can safely ignore this email.`;
}
