# SP-IssuerApplication — Risk Register

## Active Risks

### R-001 — Prequalification output crosses into legal/investment advice

- **Likelihood:** Medium
- **Impact:** High (regulatory/liability)
- **Trigger indicators:** AI output includes specific recommendations on offering type, valuation, or legal structure; users interpret output as approval to raise; missing disclaimers in summary emails.
- **Mitigation:** Hard disclaimer in system prompt + every output. Legal review of prompt + sample transcripts before production. Log all assessments for audit.
- **Status:** Monitoring (design phase)

### R-002 — Chat assistant build stalled (blocked handoff)

- **Likelihood:** High
- **Impact:** Medium
- **Trigger indicators:** Mar 31 handoff remains pending; no active build sessions; readiness.syndicatepath.com not provisioned.
- **Mitigation:** Assign build to concrete work block; pick minimum viable stack (Custom GPT → n8n path per README). Define MVP scope = system prompt + GHL webhook.
- **Status:** Escalating

### R-003 — Low issuer throughput — tool not discovered/used

- **Likelihood:** Medium
- **Impact:** Medium
- **Trigger indicators:** Zero submissions in first 30 days post-launch; no inbound links; no SP team sending prospects to it.
- **Mitigation:** Embed in SP intake workflow. Train SP sales team to send prospects. Promote in SP website + email footer.
- **Status:** Monitoring

### R-004 — Bad-actor screening misses disqualifying signals

- **Likelihood:** Low
- **Impact:** High
- **Trigger indicators:** Issuer with SEC bar / felony conviction / state securities suspension passes screening; missing questions vs Reg CF bad-actor rules (17 CFR 227.503).
- **Mitigation:** Map screening questions to 17 CFR 227.503 explicit list. Compliance sign-off on question set. Periodic re-review as rules change.
- **Status:** Monitoring (design phase)

### R-005 — GHL sync failures drop qualified leads

- **Likelihood:** Medium
- **Impact:** High
- **Trigger indicators:** Completed assessments not appearing in GHL Issuer Intake pipeline; missing tags for readiness tier; webhook errors in SP MCP logs.
- **Mitigation:** Daily integrity check for first 30 days (assessment count = GHL contact count). Webhook retry queue. Email backup on GHL failure.
- **Status:** Planned (not yet live)

---

## Reviews

_Append dated review notes here. See skills/Business/RiskReview/SKILL.md for format._
