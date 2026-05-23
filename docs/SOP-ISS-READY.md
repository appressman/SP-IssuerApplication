# SOP-ISS-READY — Issuer Readiness Application Operations

**Version:** 1.0
**Effective Date:** 2026-05-23
**Owner:** Adam Pressman, COO
**Application:** https://readiness.syndicatepath.com
**Repository:** appressman/SP-IssuerApplication (GitHub)
**Hosting:** Cloudflare Pages (`sp-issuer-readiness` project)

---

## 1. Purpose

This SOP covers day-to-day operation, deployment, testing, and troubleshooting of the SP Issuer Readiness Application. The app guides prospective issuers through a 13-step pre-qualification interview, scores their readiness, creates a GHL contact and opportunity, and sends email notifications on submission.

---

## 2. System Architecture

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | SvelteKit (Cloudflare adapter) | Pages Functions for server routes |
| Database | Cloudflare D1 (SQLite) | `sp-issuer-readiness-db` |
| AI Advisor | Anthropic Claude (Haiku) | via OpenRouter in production |
| CRM | GoHighLevel | Pipeline: Issuer Lifecycle |
| Automation | n8n | Webhook ID `UN8GX9yYzJXJd3Pm` |
| Email | Resend | Issuer confirmation + SP notification |
| Auth | Magic link / OTP (email-only) | No passwords |

### Environment Variables (Cloudflare Pages secrets)

| Variable | Purpose |
|----------|---------|
| `OPENROUTER_API_KEY` | AI advisor chat (primary in prod) |
| `CLAUDE_API_KEY` | Direct Anthropic API (dev/fallback) |
| `CLAUDE_MODEL` | Override model ID (optional) |
| `N8N_WEBHOOK_URL` | Submission webhook to n8n |
| `N8N_WEBHOOK_SECRET` | Shared secret header for webhook auth |
| `RESEND_API_KEY` | Transactional email |
| `RESEND_FROM_EMAIL` | Sender address |
| `GHL_PIPELINE_ID` | `fuMLyCYsm9eaW5yVWQHv` |
| `GHL_DISCOVERY_STAGE_ID` | `ee4f2fe0-0e10-415e-8834-53e45ba9ad78` |
| `GHL_PROSPECTING_STAGE_ID` | `8f9383b3-eceb-4fb1-b8c2-9903d4b5fa99` |
| `INFO_NOTIFICATION_EMAIL` | SP internal notification recipient |
| `APP_BASE_URL` | `https://readiness.syndicatepath.com` |

Inspect or update secrets:
```bash
bunx wrangler pages secret list --project-name sp-issuer-readiness
bunx wrangler pages secret put SECRET_NAME --project-name sp-issuer-readiness
```

---

## 3. GHL Integration

On submission the app POSTs a webhook to n8n, which creates/updates GHL records.

**Contact fields set:**
- firstName, lastName (parsed from `contact.fullName`; falls back gracefully to empty strings)
- email (from `contact.email` if provided, else the authenticated session email)
- phone, companyName, website
- Tags: `issuer-application`, band tag (`issuer-qualified` / `issuer-qualified-reservations` / `issuer-not-qualified`), `score-{N}`
- Custom fields: score, band, security type, exemption, raise target, entity type, industry, state, applicationId

**Opportunity created in:**
- Pipeline: Issuer Lifecycle (`fuMLyCYsm9eaW5yVWQHv`)
- Stage routing: qualified → Discovery; qualified with reservations → Prospecting; not qualified → Discovery

**Important:** The Review step (Step 13) does not collect a contact email field in the UI. The authenticated user's email (from the session) is always used as the GHL contact email. This is by design.

---

## 4. Email Notifications

Two emails fire on successful submission:

| Email | Recipient | Template |
|-------|-----------|---------|
| Issuer confirmation | Submitter's authenticated email | Score summary, next steps |
| SP internal notification | `INFO_NOTIFICATION_EMAIL` | App ID, issuer name, company, raise target, score |

If `RESEND_API_KEY` is not set, emails are silently skipped (submission still succeeds).

---

## 5. AI Advisor Chat

Available at Step 7 (Market Validation). Uses Anthropic Claude Haiku.

**API key resolution order:**
1. `CLAUDE_API_KEY` present → direct Anthropic API, model defaults to `claude-haiku-4-5-20251001`
2. `OPENROUTER_API_KEY` present → OpenRouter proxy, model defaults to `anthropic/claude-haiku-4.5`

**OpenRouter gotchas (do not revert):**
- Base URL must be `https://openrouter.ai/api` (NOT `/api/v1`) — the SDK appends `/v1/messages` automatically
- `cache_control` must NOT be sent to OpenRouter — it is gated behind `!anthropicEnv.baseURL`
- OpenRouter model IDs use period notation: `anthropic/claude-haiku-4.5` (not a hyphen)

All three of the above were bugs fixed 2026-05-23. If advisor chat returns "Chat request rejected by provider," check these three values first.

---

## 6. Scoring

Bands:
| Band | Score | GHL Tag |
|------|-------|---------|
| Qualified | >= 70 | `issuer-qualified` |
| Qualified with Reservations | 50-69 | `issuer-qualified-reservations` |
| Not Qualified | < 50 | `issuer-not-qualified` |

**C&DI compliance flags surfaced in the UI:**
- **C&DI 100.06** (Step 3): Amber notice when exemption target is Reg CF or Undecided — explains that investor income limits use calendar-year income (Jan 1-Dec 31), not trailing 12 months
- **C&DI 201.03** (Step 5): Red warning when fiscal year-end date is more than 120 days in the past — tells issuer they need updated financials before filing

Both flags also appear in the gap analysis output (scoring engine) at submission.

---

## 7. Deployment

```bash
# Build
bun run build

# Deploy (from project root)
bunx wrangler pages deploy .svelte-kit/cloudflare \
  --project-name sp-issuer-readiness \
  --commit-dirty=true
```

The deploy uploads changed files only. Typical deploy time: under 2 minutes.

**After deploying:** Verify at https://readiness.syndicatepath.com — confirm the app loads, login works, and the Step 7 advisor responds.

---

## 8. Database Operations (Cloudflare D1)

```bash
# Run a query against production DB
bunx wrangler d1 execute sp-issuer-readiness-db --remote --command "SELECT * FROM applications LIMIT 5;"

# Reset a stuck application to draft (allows resubmission)
bunx wrangler d1 execute sp-issuer-readiness-db --remote --command \
  "UPDATE applications SET status = 'draft', submitted_at = NULL, idempotency_key = NULL WHERE id = '{application-id}';"

# Check application status
bunx wrangler d1 execute sp-issuer-readiness-db --remote --command \
  "SELECT id, user_id, status, created_at, submitted_at FROM applications ORDER BY created_at DESC LIMIT 10;"
```

**Application status lifecycle:** `draft` → `submit_pending` → `submitted` (or `submission_failed`)

Once `submitted`, the app shows a read-only confirmation page. Use the D1 reset command above to allow resubmission during testing.

---

## 9. Testing

Full manual E2E test checklist: `E2E-TEST-CHECKLIST.md` in the project root. Estimated time: 45-60 minutes.

**Key checkpoints:**
- OTP login flow (happy path + wrong code + lockout)
- All 13 form steps advance and save correctly
- Step 3: C&DI 100.06 amber notice appears for Reg CF / Undecided
- Step 5: C&DI 201.03 red warning appears for fiscal year-end dates >120 days ago
- Step 7: Advisor chat responds without error
- Submission creates GHL contact and opportunity in correct pipeline stage
- Issuer receives confirmation email
- SP internal notification email received at `INFO_NOTIFICATION_EMAIL`

---

## 10. Troubleshooting

### "Chat request rejected by provider" in advisor chat
Caused by one of three OpenRouter integration bugs (all fixed 2026-05-23):
1. Wrong base URL — must be `https://openrouter.ai/api`, not `…/api/v1`
2. `cache_control` sent to OpenRouter — must be gated on `!anthropicEnv.baseURL`
3. Wrong model ID — must use period: `anthropic/claude-haiku-4.5`

Check `src/lib/integrations/anthropic.ts` if this recurs.

### GHL contact not created / 422 error
The GHL contact requires a valid email. The app uses the authenticated session email as the contact email (the Review step does not collect an email field in the UI). If GHL returns 422 "email must be an email," check that `locals.user.email` is being passed to `buildWebhookPayload()` in `src/routes/api/submit/+server.ts`.

Diagnose via n8n execution history for workflow `UN8GX9yYzJXJd3Pm`.

### Issuer confirmation email not received
Check that `RESEND_API_KEY` is set. The issuer email uses the authenticated session email as the recipient (same as GHL). If `formData.contact.email` is empty (which it will be, since the UI does not collect it), `locals.user.email` is the fallback in `submit/+server.ts`.

### Submission locked / cannot resubmit during testing
Use the D1 reset command in Section 8 to set status back to `draft`.

### n8n webhook not firing
Confirm `N8N_WEBHOOK_URL` is set in Cloudflare Pages secrets. Check the Cloudflare Pages function logs for `[submit]` log lines.

---

## 11. Changelog

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-05-23 | Adam Pressman | Initial SOP, documents system as of post-QA state |

**Bugs resolved in 2026-05-23 QA session (all fixed before v1.0):**
- Advisor chat: three OpenRouter integration bugs (base URL, cache_control, model ID)
- GHL 422: empty email — fixed by using authenticated session email as fallback
- GHL stage IDs swapped: qualified was routing to Prospecting — fixed
- Issuer confirmation email: same empty-email bug — fixed
- C&DI 100.06: no UI disclosure — added amber notice to Step 3
- C&DI 201.03: stale financials gate not shown in UI — added red warning to Step 5
