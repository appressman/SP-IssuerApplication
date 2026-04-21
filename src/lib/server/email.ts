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

	const fromEmail = env.RESEND_FROM_EMAIL ?? 'services@syndicatepath.com';
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

export interface SubmissionEmailEnv {
	APP_ENV: string;
	APP_BASE_URL?: string;
	RESEND_API_KEY?: string;
	RESEND_FROM_EMAIL?: string;
}

export interface SubmissionScoring {
	totalScore: number | null;
	band: 'qualified' | 'qualified_with_reservations' | 'not_qualified' | null;
	flags?: string[];
}

export interface SubmissionConfirmationParams {
	to: string;
	name: string;
	scoring: SubmissionScoring;
	env: SubmissionEmailEnv;
}

export interface SubmissionNotificationParams {
	to: string;
	applicationId: string;
	issuerName: string;
	issuerEmail: string;
	companyName: string | null;
	raiseTargetUsd: number | null;
	scoring: SubmissionScoring;
	submittedAt: string;
	env: SubmissionEmailEnv;
}

const BAND_LABELS: Record<string, string> = {
	qualified: 'Qualified',
	qualified_with_reservations: 'Qualified with reservations',
	not_qualified: 'Not yet qualified'
};

function bandLabel(band: string | null): string {
	return (band && BAND_LABELS[band]) || 'Under review';
}

async function postResend(
	env: SubmissionEmailEnv,
	body: Record<string, unknown>,
	label: string
): Promise<boolean> {
	if (env.APP_ENV === 'development') {
		console.log(`--- ${label} (dev mode) ---`, body);
		return true;
	}
	if (!env.RESEND_API_KEY) {
		console.warn(`[email] RESEND_API_KEY not configured; skipping ${label}`);
		return false;
	}
	const response = await fetch('https://api.resend.com/emails', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${env.RESEND_API_KEY}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(body)
	});
	if (!response.ok) {
		const text = await response.text().catch(() => '');
		console.error(`[email] ${label} Resend error ${response.status}: ${text}`);
		return false;
	}
	return true;
}

export async function sendSubmissionConfirmation(
	params: SubmissionConfirmationParams
): Promise<boolean> {
	const { to, name, scoring, env } = params;
	const fromEmail = env.RESEND_FROM_EMAIL ?? 'services@syndicatepath.com';
	const firstName = (name?.split(' ')[0] || 'there').trim();
	return postResend(
		env,
		{
			from: `SyndicatePath <${fromEmail}>`,
			to: [to],
			subject: 'We received your SyndicatePath Readiness Assessment',
			html: buildConfirmationHtml(firstName, scoring),
			text: buildConfirmationText(firstName, scoring)
		},
		'submission confirmation'
	);
}

export async function sendSubmissionNotification(
	params: SubmissionNotificationParams
): Promise<boolean> {
	const { to, env } = params;
	const fromEmail = env.RESEND_FROM_EMAIL ?? 'services@syndicatepath.com';
	const subjectBand = bandLabel(params.scoring.band);
	return postResend(
		env,
		{
			from: `SyndicatePath <${fromEmail}>`,
			to: [to],
			subject: `New issuer submission: ${params.companyName ?? params.issuerName} (${subjectBand})`,
			html: buildNotificationHtml(params),
			text: buildNotificationText(params)
		},
		'SP submission notification'
	);
}

function buildConfirmationHtml(firstName: string, scoring: SubmissionScoring): string {
	const score = scoring.totalScore ?? 'pending';
	const band = bandLabel(scoring.band);
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
      <p style="margin:0 0 16px;color:#555;font-size:15px;line-height:1.5;">
        Thank you for completing the SyndicatePath Readiness Assessment. Your responses have been received and our team will review them within the next 2-3 business days.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;background-color:#f4f5f7;border-radius:6px;">
        <tr>
          <td style="padding:16px 20px;">
            <p style="margin:0 0 4px;color:#888;font-size:12px;letter-spacing:0.5px;text-transform:uppercase;">Preliminary score</p>
            <p style="margin:0 0 8px;color:#1a2b4a;font-size:28px;font-weight:700;">${score}</p>
            <p style="margin:0;color:#555;font-size:13px;">${band}</p>
          </td>
        </tr>
      </table>
      <p style="margin:0 0 16px;color:#555;font-size:14px;line-height:1.5;">
        This is a preliminary assessment only. Final eligibility requires a full review by the SyndicatePath team, and is not legal, investment, or financial advice.
      </p>
      <p style="margin:0;color:#555;font-size:14px;line-height:1.5;">
        A team member will reach out with next steps soon. In the meantime, if you have questions, reply to this email.
      </p>
    </td>
  </tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function buildConfirmationText(firstName: string, scoring: SubmissionScoring): string {
	return `Hi ${firstName},

Thank you for completing the SyndicatePath Readiness Assessment. Your responses have been received and our team will review them within the next 2-3 business days.

Preliminary score: ${scoring.totalScore ?? 'pending'} (${bandLabel(scoring.band)})

This is a preliminary assessment only. Final eligibility requires a full review by the SyndicatePath team, and is not legal, investment, or financial advice.

A team member will reach out with next steps soon. If you have questions in the meantime, reply to this email.

- SyndicatePath`;
}

function buildNotificationHtml(params: SubmissionNotificationParams): string {
	const { applicationId, issuerName, issuerEmail, companyName, raiseTargetUsd, scoring, submittedAt, env } = params;
	const reviewUrl = env.APP_BASE_URL ? `${env.APP_BASE_URL}/app` : '(no base URL configured)';
	const raise = typeof raiseTargetUsd === 'number' ? `$${raiseTargetUsd.toLocaleString('en-US')}` : '(not provided)';
	const flagsHtml = scoring.flags && scoring.flags.length
		? `<ul style="margin:8px 0 0;padding-left:20px;color:#555;font-size:13px;line-height:1.5;">${scoring.flags.map((f) => `<li>${escapeHtml(f)}</li>`).join('')}</ul>`
		: '<p style="margin:4px 0 0;color:#888;font-size:13px;">No flags raised.</p>';
	return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7;padding:32px 20px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:8px;">
  <tr>
    <td style="background-color:#1a2b4a;padding:16px 24px;">
      <span style="color:#d4a843;font-size:14px;font-weight:700;letter-spacing:0.5px;">NEW ISSUER SUBMISSION</span>
    </td>
  </tr>
  <tr>
    <td style="padding:24px;">
      <p style="margin:0 0 16px;color:#333;font-size:15px;">A new application was submitted and is awaiting SP team review.</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;color:#444;border-collapse:collapse;">
        ${row('Company', escapeHtml(companyName || '(not provided)'))}
        ${row('Contact', `${escapeHtml(issuerName)} &lt;${escapeHtml(issuerEmail)}&gt;`)}
        ${row('Target raise', escapeHtml(raise))}
        ${row('Preliminary score', `<strong>${scoring.totalScore ?? 'pending'}</strong> &mdash; ${escapeHtml(bandLabel(scoring.band))}`)}
        ${row('Submitted', escapeHtml(submittedAt))}
        ${row('Application ID', `<code>${escapeHtml(applicationId)}</code>`)}
      </table>
      <p style="margin:20px 0 4px;color:#333;font-size:13px;font-weight:600;">Scoring flags</p>
      ${flagsHtml}
      <p style="margin:24px 0 0;color:#888;font-size:12px;">Review URL: ${escapeHtml(reviewUrl)}</p>
    </td>
  </tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function buildNotificationText(params: SubmissionNotificationParams): string {
	const { applicationId, issuerName, issuerEmail, companyName, raiseTargetUsd, scoring, submittedAt } = params;
	const raise = typeof raiseTargetUsd === 'number' ? `$${raiseTargetUsd.toLocaleString('en-US')}` : '(not provided)';
	const flags = scoring.flags && scoring.flags.length ? scoring.flags.map((f) => `  - ${f}`).join('\n') : '  (none)';
	return `NEW ISSUER SUBMISSION

Company:          ${companyName ?? '(not provided)'}
Contact:          ${issuerName} <${issuerEmail}>
Target raise:     ${raise}
Preliminary:      ${scoring.totalScore ?? 'pending'} — ${bandLabel(scoring.band)}
Submitted:        ${submittedAt}
Application ID:   ${applicationId}

Flags:
${flags}
`;
}

function row(label: string, value: string): string {
	return `<tr><td style="padding:6px 12px 6px 0;color:#888;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;width:40%;vertical-align:top;">${label}</td><td style="padding:6px 0;color:#333;font-size:13px;vertical-align:top;">${value}</td></tr>`;
}

function escapeHtml(s: string): string {
	return String(s)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}
