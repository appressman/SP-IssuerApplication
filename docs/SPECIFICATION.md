# SyndicatePath Issuer Readiness Application - Implementation Specification

**Version:** 2.0
**Date:** 2026-03-31
**Status:** VibeCode Phase 2 Complete - Implementation-Ready
**Owner:** SyndicatePath / Adam Pressman
**Primary Builder:** Claude Code
**Primary Deployment Target:** `readiness.syndicatepath.com`

---

## 1. Purpose

Build a hosted web application that guides a prospective issuer through SyndicatePath's readiness assessment, captures structured answers across a multi-step workflow, computes a preliminary readiness score, generates a reviewable readiness report, and submits the application into SyndicatePath's existing operational stack for follow-up.

The application must do four jobs well:

1. Collect complete, high-quality issuer intake data
2. Help confused users answer correctly without requiring human intervention
3. Produce a consistent readiness score aligned with ISS-ACQ-05 internal qualification criteria
4. Push submitted applications into existing operations systems without manual re-entry

This application replaces the current Custom GPT as the primary readiness intake experience.

### What This Is NOT

- Not a legal advisory tool
- Not an investment recommendation engine
- Not a securities offering
- Not a Masters Radio product (separate company, separate mission)
- Not a conversational AI product first
- Not a deal structuring engine, CRM replacement, or compliance determination system

---

## 2. Architecture Decision

### Chosen: Option C - Hosted Progressive Form + Optional AI Chat Assist

**Rejected alternatives:**
- **Option A (Local HTML):** Loses AI guidance (core value), no analytics, version control nightmare, manual CRM submission
- **Option B (Full AI Chat):** Over-engineered for 10-50 applicants/year, high AI API cost, complex to build, harder to ensure data completeness

**Why Option C:**
- Structured form ensures completeness and validates required fields
- AI chat available per-question preserves "chat through confusion" capability
- Data stays client-side until explicit submit (privacy-conscious)
- Direct integration with existing n8n webhook for GHL CRM
- Analytics on completion rates, common gaps, readiness scores
- Always up-to-date (no version distribution issues)
- Can be enhanced incrementally (add AI features, improve scoring)

**The form is the source of structured truth. AI exists only to help the user think and complete the form.**

---

## 3. Product Scope

### 3.1 In Scope

- Hosted multi-step form wizard (12 steps + review)
- Account-based save/resume (email magic link)
- Per-step validation with field-level, step-level, and submission-level checks
- Draft autosave to Cloudflare D1
- Review screen with score preview before submit
- ISS-ACQ-05 aligned readiness scoring (7 criteria, 100-point scale)
- Submission to existing n8n webhook with idempotency
- GHL contact/opportunity/tag creation via n8n
- Confirmation screen with PDF download
- Analytics for starts, saves, abandonment, submission, score band
- Phase 2: AI chat assist scoped to section/question context

### 3.2 Out of Scope

- Legal, investment, or financial advice
- Investor-side workflows
- Offering document generation
- Cap table modeling or underwriting
- Deep KYC/AML/background checks
- Payment collection
- SyndicatePath client portal beyond this readiness intake flow
- Internal admin review screen (Phase 3+)

---

## 4. Users

### 4.1 Primary User

A founder, executive, or authorized representative of a company exploring a capital raise, trying to determine whether they are a viable fit for SyndicatePath services.

### 4.2 Secondary Internal Users

- Adam / SyndicatePath operators
- Account executives conducting ISS-ACQ-05 scoring
- CCO/compliance reviewers
- Operations staff reviewing GHL and ClickUp records

---

## 5. User Flow

### 5.1 Primary Journey

```
1. Landing Page
   - SP branding, purpose explanation
   - "Begin Your Readiness Assessment" CTA
   - Estimated time: 20-30 minutes
   - Disclaimers: not legal/investment advice, preliminary only
   - Privacy notice: data stored until submission, then processed per SP policy

2. Account Creation (minimal friction)
   - Email + name only
   - Email magic link authentication
   - Account created at Step 1 completion

3. Step-by-Step Form Wizard (12 sections)
   - Progress bar showing current section and completion %
   - Each section on its own "page" within the SPA
   - Next/Previous navigation
   - Auto-save on step completion and significant changes (debounced)
   - "Save Draft" button always visible
   - "Help me with this" AI chat button per section (Phase 2)
   - Validation on "Next" with clear error messages
   - Field-level help text (not just tooltips)

4. Review & Submit (Step 13)
   - Full summary of all answers (read-only review)
   - Readiness score preview with category breakdown
   - Edit buttons to jump back to any section
   - Red flags displayed clearly
   - Consent checkboxes (data processing + disclaimers)
   - Submit button

5. Confirmation
   - Application ID displayed
   - Summary of what happens next
   - "SyndicatePath team will review within X business days"
   - Download PDF summary button
   - Email confirmation sent (via n8n workflow)
```

### 5.2 AI Chat Assist Flow (Phase 2, per section)

```
1. User clicks "Help me with this" on any form section
2. Chat panel slides in from the right (modal on mobile)
3. AI is pre-loaded with:
   - Context about this specific section/question
   - The system prompt's educational content for this area
   - Current form values (so AI knows what's already filled)
4. User chats naturally about the question
5. AI can suggest values as a preview (not auto-written)
6. User clicks explicit "Fill in my answer" to apply suggestion
7. Applied suggestion must be visible and editable
8. User closes chat, continues with form
```

### 5.3 UX Principles

- One major task per screen (no long-scroll mega-form)
- Clear forward progress indicator
- Save without fear
- Explain unfamiliar terms in plain language
- Never let AI silently write answers into the form
- Show users what will happen next after submission
- Mobile must work, but desktop is the primary usage assumption

---

## 6. Technical Stack

### 6.1 Required Stack

```
Frontend/App:    SvelteKit 2.x (Svelte 5)
Form Library:    Superforms + Zod validation
Styling:         Tailwind CSS 4
AI Chat Widget:  Custom Svelte component (Phase 2, feature-flagged)
AI Model:        Claude Haiku via Cloudflare Worker proxy
Hosting:         Cloudflare Pages (adapter-cloudflare)
Auth:            Email magic link (or Cloudflare Access)
Draft Storage:   Cloudflare D1 (SQLite)
Submission:      POST to n8n webhook (existing)
PDF Generation:  Server-side via Cloudflare Worker
Domain:          readiness.syndicatepath.com
Analytics:       D1-based event tracking
```

### 6.2 Why This Stack

- **SvelteKit:** Smallest runtime, compiles to vanilla JS, first-class Cloudflare Pages adapter. Form-heavy apps benefit from Svelte's reactivity model.
- **Superforms:** Purpose-built for SvelteKit multi-step forms with validation, dirty tracking, auto-focus on errors.
- **Zod:** Validates against the existing JSON schema. Can generate Zod schemas from JSON Schema.
- **Tailwind CSS 4:** Utility-first, works perfectly with component-based architecture.
- **Cloudflare Pages:** Free hosting tier, global CDN, zero server management.
- **Claude Haiku via Worker:** Keeps API key server-side, rate limits per session, scoped to system prompt context.

### 6.3 Architecture Rules

- The browser must never receive the Claude API key
- The browser must never write directly to GHL or ClickUp
- Submitted application state must be owned by the server-side boundary
- The app must function fully without AI assist (AI is enhancement, not requirement)
- The app must tolerate partial completion and resume safely

### 6.4 Environment Variables

```
APP_BASE_URL              # https://readiness.syndicatepath.com
APP_ENV                   # development | staging | production
N8N_WEBHOOK_URL           # https://n8n.netcleus.com/webhook/issuer-application
N8N_WEBHOOK_SECRET        # Shared secret for webhook auth
CLAUDE_API_KEY            # For AI chat assist (Phase 2)
CLAUDE_MODEL              # claude-haiku-4-5-20251001
D1_DATABASE_BINDING       # Cloudflare D1 binding name
SESSION_SECRET            # For session/cookie signing
GHL_LOCATION_ID           # ZyPakCmMBwC0ZshpYHGS
GHL_PIPELINE_ID           # fuMLyCYsm9eaW5yVWQHv
GHL_DISCOVERY_STAGE_ID    # ee4f2fe0-0e10-415e-8834-53e45ba9ad78
GHL_PROSPECTING_STAGE_ID  # 8f9383b3-eceb-4fb1-b8c2-9903d4b5fa99
INFO_NOTIFICATION_EMAIL   # info@syndicatepath.com
```

No secrets may be hardcoded.

### 6.5 Recommended Module Structure

```
src/
  schemas/              # Zod schemas, canonical data model types
  lib/
    scoring/            # Deterministic scoring functions
    normalization/      # Payload normalization
    validation/         # Cross-step validation rules
    integrations/       # n8n, analytics helpers
  routes/
    (app)/              # Form wizard pages (authenticated)
    api/                # Server endpoints (AI proxy, submission, PDF)
  components/
    form/               # Step components, progress bar, field widgets
    ai/                 # Chat panel, suggestion preview (Phase 2)
    review/             # Review summary, score display
    layout/             # Branding, nav, footer
```

---

## 7. Canonical Data Model

The app must normalize all user inputs into this single canonical object before submission.

```json
{
  "applicationId": "string (UUID)",
  "status": "draft | submit_pending | submitted | submission_failed | abandoned",
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601",
  "submittedAt": "ISO-8601 | null",
  "version": "string (schema version for forward compatibility)",
  "contact": {
    "fullName": "string",
    "email": "string",
    "phone": "string",
    "title": "string | null",
    "linkedinUrl": "string | null"
  },
  "company": {
    "legalName": "string",
    "doingBusinessAs": "string | null",
    "website": "string | null",
    "industry": "string",
    "stateOfIncorporation": "string",
    "entityType": "string",
    "yearsOperating": "number | null",
    "employeeCountRange": "string | null",
    "revenueStatus": "pre_revenue | revenue_generating"
  },
  "regulatoryHistory": {
    "previousRaise": "boolean | null",
    "previousRaiseDetails": "string | null",
    "regulatoryOrders": "boolean | null",
    "regulatoryOrdersDetails": "string | null",
    "badActorIndicators": "boolean | null",
    "badActorDetails": "string | null"
  },
  "offering": {
    "securityType": "equity | debt | revenue_share | safe | convertible_note | other",
    "securityTypeOther": "string | null",
    "exemptionTarget": "reg_cf | reg_d_506b | reg_d_506c | undecided | other",
    "raiseTargetUsd": "number | null",
    "minimumRaiseUsd": "number | null",
    "maximumRaiseUsd": "number | null",
    "minimumInvestmentUsd": "number | null",
    "offeringDescription": "string | null"
  },
  "fundamentals": {
    "useOfProceeds": [
      {
        "category": "string",
        "percent": "number (1-100)",
        "description": "string | null"
      }
    ],
    "financialProjections": {
      "hasProjections": "boolean | null",
      "projectionSummary": "string | null"
    },
    "teamQualifications": "string | null",
    "assumptions": "string | null",
    "whatFromInvestors": "string | null",
    "principalReturn": "string | null",
    "investorConsideration": "string | null"
  },
  "readiness": {
    "financialStatements": "none | internal_only | compiled | reviewed | audited | unknown",
    "businessPlan": "none | draft | complete",
    "pitchDeck": "none | draft | complete",
    "attorney": "none | identified | engaged",
    "cpa": "none | identified | engaged",
    "marketing": "none | identified | engaged",
    "onlinePresence": "weak | basic | established | strong"
  },
  "capacity": {
    "leadershipTimeCapacity": "low | moderate | high | null",
    "teamExecutionCapacity": "low | moderate | high | null",
    "canSupportCampaignFor90Days": "boolean | null"
  },
  "timeline": {
    "desiredLaunchDate": "YYYY-MM-DD | null",
    "timelineExpectation": "lt_30_days | 1_to_3_months | 3_to_6_months | 6_plus_months | unknown",
    "understandsPreparationTime": "boolean | null"
  },
  "analytics": {
    "utmSource": "string | null",
    "utmMedium": "string | null",
    "utmCampaign": "string | null",
    "startedAt": "ISO-8601 | null",
    "lastActiveAt": "ISO-8601 | null"
  },
  "scoring": {
    "totalScore": "number | null",
    "band": "qualified | qualified_with_reservations | not_qualified | null",
    "criteria": {
      "businessModel": "number",
      "fundingNeedAndUse": "number",
      "regulatoryReadiness": "number",
      "teamAndCapacity": "number",
      "budget": "number",
      "timeline": "number",
      "marketOpportunity": "number"
    },
    "flags": ["string"]
  },
  "consent": {
    "agreedToProcessing": "boolean",
    "agreedToDisclaimers": "boolean",
    "timestamp": "ISO-8601 | null"
  }
}
```

### 7.1 Data Model Rules

- Missing values must be stored as `null`, not empty strings, after normalization
- Currency fields must be stored as integer USD amounts (cents or whole dollars, be consistent)
- Percentages in use-of-proceeds must total 100 before final submission
- Submission payload version must be included so downstream systems can evolve safely
- `applicationId` is a UUID generated at draft creation time

---

## 8. Form Sections (12 Steps + Review)

Each section maps to the existing schema (`application-schema.json`) and interview framework.

| Step | Section | Schema Path | Required | Est. Time |
|------|---------|------------|----------|-----------|
| 1 | Company Information | `company.*` | Yes | 2 min |
| 2 | Regulatory History | `regulatoryHistory.*` | Yes | 2 min |
| 3 | Offering Structure | `offering.*` | Yes | 3 min |
| 4 | Use of Proceeds | `fundamentals.useOfProceeds` | Yes | 3 min |
| 5 | Financial Condition | `fundamentals.financialProjections` + `readiness.financialStatements` | Yes | 4 min |
| 6 | Team & Qualifications | `fundamentals.teamQualifications` | Yes | 3 min |
| 7 | Market & Validation | `fundamentals.assumptions` | Yes | 3 min |
| 8 | Investor Returns | `fundamentals.whatFromInvestors` + `principalReturn` + `investorConsideration` | Yes | 3 min |
| 9 | Documentation Status | `readiness.businessPlan` + `pitchDeck` | Yes | 2 min |
| 10 | Professional Team | `readiness.attorney` + `cpa` + `marketing` | Yes | 2 min |
| 11 | Capacity & Resources | `readiness.onlinePresence` + `capacity.*` | Yes | 2 min |
| 12 | Timeline & Awareness | `timeline.*` | Yes | 1 min |
| 13 | Review & Submit | All sections + consent | Yes | 3 min |

### 8.1 Step-by-Step Validation Requirements

**Step 1 - Company Information**
- Required: legal name (min 2 chars), industry, state of incorporation, entity type, revenue status
- Optional: DBA, website (valid URL if provided), years operating (0-100), employee count range

**Step 2 - Regulatory History**
- Required: previous raise (yes/no), regulatory orders (yes/no), bad actor indicators (yes/no)
- Conditional: if any = yes, details text required (min 20 chars)
- Special: any bad actor affirmative = critical flag, regulatory readiness score forced to 0

**Step 3 - Offering Structure**
- Required: security type, exemption target (or "undecided"), raise target, min raise, max raise
- Conditional: if security type = "other", explanation required
- Validation: max raise >= min raise; raise target between min and max when all present

**Step 4 - Use of Proceeds**
- Required: at least 2 categories, total percentage = 100, at least one narrative description
- Validation: each percent 1-100; no duplicate categories

**Step 5 - Financial Condition**
- Required: financial statements status, whether projections exist
- Conditional: if projections exist, projection summary required (min 50 chars)

**Step 6 - Team & Qualifications**
- Required: narrative answer (min 100 chars after trimming)

**Step 7 - Market & Validation**
- Required: narrative answer (min 100 chars after trimming)
- Help text prompts for evidence: customers, pilots, LOIs, audience traction, partnerships

**Step 8 - Investor Returns**
- Required: what investors receive, principal return mechanism, investor consideration summary
- Conditional: helper text and examples adapt based on security type from Step 3
- Must not claim legality or adequacy of terms

**Step 9 - Documentation Status**
- Required: business plan status, pitch deck status

**Step 10 - Professional Team**
- Required: attorney status, CPA status, marketing support status

**Step 11 - Capacity & Resources**
- Required: leadership time capacity, team execution capacity, 90-day campaign support (yes/no), online presence maturity

**Step 12 - Timeline & Awareness**
- Required: timeline expectation, understands preparation requirements (yes/no)
- Optional: desired launch date
- Validation: launch date not in past; launch date within 30 days = red flag

### 8.2 Conditional Logic

- Step 2: If "previous capital raise" = No, skip follow-up details
- Step 2: If "regulatory orders" = No, skip details field
- Step 3: Key terms fields adapt based on security type selection
- Step 5: Financial statement sub-fields show/hide based on status
- Step 8: Follow-up questions adapt based on security type (equity vs debt vs revenue share)

### 8.3 Validation Model

Validation runs at three levels:

1. **Field-Level:** Runs on blur and on next-step action
2. **Step-Level:** User cannot proceed if the step is invalid
3. **Submission-Level:** Runs before submit and checks cross-step rules:
   - Use-of-proceeds total = 100
   - Consent checkboxes checked
   - Contact details complete
   - Score can be computed
   - Payload normalization succeeds

---

## 9. Readiness Scoring Algorithm

**Aligned with ISS-ACQ-05 (SVC-001-Acquisition-Task-Guide.md)**

The app's self-assessment scoring uses the same 7 criteria and weights as the AE's post-discovery scoring rubric. This ensures the app's preliminary score is directly comparable to the AE's formal score after the discovery call.

### 9.1 Scoring Rubric

| Criteria | Weight | Max Pts | Score Ranges | App Form Sections |
|----------|--------|---------|-------------|-------------------|
| **Business Model** | 20% | 20 | 15-20 Strong, 10-14 Moderate, 0-9 Weak | Steps 1, 7 |
| **Funding Need & Use** | 15% | 15 | 12-15 Strong, 8-11 Moderate, 0-7 Unclear | Steps 3, 4 |
| **Regulatory Readiness** | 20% | 20 | 15-20 Ready, 10-14 Needs Work, 0-9 Concerns | Step 2 |
| **Team & Capacity** | 15% | 15 | 12-15 Strong, 8-11 Moderate, 0-7 Limited | Steps 6, 11 |
| **Budget** | 15% | 15 | 12-15 Confirmed, 8-11 Likely, 0-7 Uncertain | Step 3 |
| **Timeline** | 10% | 10 | 8-10 Realistic, 5-7 Tight, 0-4 Unrealistic | Step 12 |
| **Market Opportunity** | 5% | 5 | 4-5 Strong, 2-3 Moderate, 0-1 Weak | Step 7 |
| **TOTAL** | 100% | 100 | | |

### 9.2 Score Bands (matches ISS-ACQ-05 thresholds)

| Score Range | Internal Band | User-Facing Label | GHL Tag | Pipeline Action |
|-------------|---------------|-------------------|---------|-----------------|
| **70-100** | `qualified` | "Strong preliminary fit" | `highly_qualified` | Issuer Lifecycle > Discovery |
| **50-69** | `qualified_with_reservations` | "Possible fit with gaps to address" | `issuer_candidate` | Issuer Lifecycle > Prospecting, flag for CCO |
| **Below 50** | `not_qualified` | "Early-stage; major gaps should be addressed first" | `issuer_candidate` + `needs-re-engagement` | No opportunity; nurture |

Do not expose internal labels like "not qualified" to users.

### 9.3 Deterministic Scoring Rules

**Business Model (0-20)**
- Revenue generating: +10
- Pre-revenue: +5
- Paying customers described: +10
- Pilots/LOIs/audience validation described: +5
- Years operating: 0yr=+0, 1yr=+2, 2yr=+4, 3+ yr=+5
- Cap at 20

**Funding Need & Use (0-15)**
- Raise amount provided: +5
- Use of proceeds totals 100 and is coherent: +5
- Milestones/use narrative present and useful: +5

**Regulatory Readiness (0-20)**
- No bad actor indicators: +10
- No regulatory orders: +5
- Prior raise experience: +3
- Preparation awareness shown: +2
- Rules: Any bad actor indicator = total for this criterion becomes 0. Regulatory orders yes = subtract 5, floor at 0.

**Team & Capacity (0-15)**
- Key leadership identified: +5
- Relevant qualifications described: +5
- Time/capacity adequate: +5

**Budget (0-15)**
- Raise target >= $500K: +15
- Raise target $250K-$499K: +10
- Raise target $100K-$249K: +5
- Raise target < $100K: +0 and red flag

**Timeline (0-10)**
- 3-6 months: +10
- 1-3 months: +5
- <30 days: +0 and red flag
- 6+ months: +8
- Understands prep timeline: +2 bonus (cap criterion at 10)

**Market Opportunity (0-5)**
- Market size/opportunity described: +2
- Competition/positioning addressed: +2
- Evidence of validation: +1

### 9.4 Red Flags

These must be generated as structured strings in the `scoring.flags` array:

- `bad_actor_indicator` (CRITICAL - blocks qualification)
- `regulatory_order_history`
- `unclear_use_of_proceeds`
- `no_return_mechanism`
- `launch_lt_30_days`
- `no_financials_and_no_cpa`
- `weak_team_experience`
- `raise_below_minimum_economic_threshold` (< $100K)

---

## 10. Data Flow

```
[Browser - SvelteKit SPA on readiness.syndicatepath.com]
    |
    |-- Account creation --> [Cloudflare D1] (email magic link auth)
    |                              |
    |-- Auto-save drafts -------> [Cloudflare D1] (per-user, versioned)
    |                              |
    |-- "Help me" button -------> [Cloudflare Worker] --> [Claude Haiku API]
    |                              (Phase 2, feature-flagged)
    |
    |-- "Submit" button --------> [Server endpoint: validate + normalize + score]
    |                              |
    |                              |--> Set status: submit_pending
    |                              |--> POST to n8n with idempotency key
    |                              |     |
    |                              |     |--> Create/update GHL Contact
    |                              |     |--> Create GHL Opportunity (score >= 50)
    |                              |     |--> Apply tags based on score
    |                              |     |--> Send notification to info@syndicatepath.com
    |                              |     |--> Send confirmation email to applicant
    |                              |     |--> Store summary in Google Drive
    |                              |
    |                              |--> On n8n success: status = submitted
    |                              |--> On n8n failure: status = submission_failed
    |
    |-- "Download PDF" ---------> [Cloudflare Worker] --> PDF generation
    |
    |-- Analytics events -------> [Cloudflare D1]
```

### 10.1 Source of Truth

- **Before submit:** D1 draft record is the source of truth
- **At submit:** the normalized application payload is the source of truth
- **After submit:** submission payload + submission log become immutable system records

---

## 11. Integration Points

### 11.1 GoHighLevel

**MCP:** `ghl-syndicatepath` | **Location ID:** `ZyPakCmMBwC0ZshpYHGS`

#### Existing Custom Fields to REUSE (no creation needed)

| App Field | GHL Field | Field Key | Type |
|-----------|-----------|-----------|------|
| Readiness score | Issuer Readiness Score | `contact.issuer_readiness_score` | NUMERICAL |
| Offering type | Reg Path (Target) | `contact.reg_path_target` | SINGLE_OPTIONS |
| Lead source | Lead Source | `contact.lead_source` | TEXT (set to "readiness-app") |
| Target launch date | Campaign Launch Date | `contact.campaign_launch_date` | DATE |
| Consent | Consent Status | `contact.consent_status` | SINGLE_OPTIONS |
| Contact role/title | Contact Role | `contact.contact_role` | SINGLE_OPTIONS |
| LinkedIn | LinkedIn URL | `contact.linkedin_profile` | TEXT |
| UTM tracking | UTM Source/Campaign/Medium | `contact.utm_source/campaign/medium` | TEXT |
| Offering description | Offering Interest | `contact.offering_interest` | TEXT |
| Raise target | Raise Target (USD) | `opportunity.raise_target_usd` | MONETORY |
| Exemption type | Exemption Type | `opportunity.exemption_type` | MULTIPLE_OPTIONS |

#### New Custom Fields to CREATE

| Field | Proposed Key | Type | Object |
|-------|-------------|------|--------|
| Company Legal Name | `contact.company_legal_name` | TEXT | Contact |
| State of Incorporation | `contact.incorporation_state` | TEXT | Contact |
| Industry | `contact.industry` | TEXT | Contact |
| Company Website | `contact.company_website` | TEXT | Contact |
| Security Type | `contact.security_type` | SINGLE_OPTIONS | Contact |
| Minimum Raise | `contact.min_raise` | MONETORY | Contact |
| Maximum Raise | `contact.max_raise` | MONETORY | Contact |
| Application ID | `contact.application_id` | TEXT | Contact |
| Fundamentals Summary | `contact.fundamentals_summary` | LARGE_TEXT | Contact |
| Application Status | `contact.application_status` | SINGLE_OPTIONS | Contact |

#### Existing Pipeline: "Issuer Lifecycle" (`fuMLyCYsm9eaW5yVWQHv`)

No new pipeline needed. Submissions enter existing stages:

| Score | Entry Stage | Stage ID |
|-------|------------|----------|
| 70+ (Qualified) | "Discovery" | `ee4f2fe0-0e10-415e-8834-53e45ba9ad78` |
| 50-69 (Reservations) | "Prospecting" | `8f9383b3-eceb-4fb1-b8c2-9903d4b5fa99` |
| <50 (Not Qualified) | No opportunity created | N/A |

#### Existing Tags to REUSE

| Tag | Use |
|-----|-----|
| `issuer_candidate` | Applied to ALL app submitters |
| `issuer` | Applied when score >= 70 |
| `highly_qualified` | Applied when score >= 80 |
| `needs-re-engagement` | Applied when score < 50 |
| `cold-lead` | Applied to abandoned/incomplete apps (analytics) |

#### New Tags to CREATE

| Tag | Use |
|-----|-----|
| `readiness-app-submitted` | Distinguishes app submissions from manual intake |
| `readiness-app-started` | For analytics: tracks who started but didn't submit |
| `bad-actor-flag` | Auto-applied when bad actor questions answered affirmatively |

#### Duplicate Contact Strategy

Match on email first. If email exists, update that contact rather than create a duplicate.

### 11.2 n8n Webhook

**Endpoint:** `https://n8n.netcleus.com/webhook/issuer-application`

#### Payload Requirements

n8n must receive:
- Full normalized application payload (Section 7)
- `applicationId`
- Submission version
- `scoring` object (total, band, criteria breakdown, flags)
- UTM data
- Source marker: `"readiness-app"`
- Idempotency key

#### Expected n8n Actions

1. Create or update GHL contact (match on email)
2. Create GHL opportunity if score >= 50
3. Apply tags per Section 9.2
4. Send notification email to `info@syndicatepath.com`
5. Send applicant confirmation email
6. Store summary/PDF in Google Drive
7. Optionally create/update ClickUp ISS-ACQ-05 item (Phase 3)
8. Write submission outcome log

#### n8n Response Contract

Success:
```json
{
  "ok": true,
  "applicationId": "string",
  "contactId": "string | null",
  "opportunityId": "string | null",
  "message": "string"
}
```

Failure:
```json
{
  "ok": false,
  "applicationId": "string",
  "errorCode": "string",
  "message": "string"
}
```

### 11.3 ClickUp (Phase 3)

- Application submission triggers ISS-ACQ-05 task update
- Readiness score and flags populate task description
- Automated via n8n ClickUp integration node

### 11.4 Google Drive

- Store application summary PDF in issuer-specific folder
- MCP: `google-workspace-syndicatepath`

---

## 12. Submission Workflow

### 12.1 Submission Preconditions

Before submit:
- All steps valid (submission-level cross-check)
- Consent fields checked
- Contact details valid
- Score computed
- Payload normalized
- Idempotency key generated (UUID, stored with draft)

### 12.2 Submission States

```
draft --> submit_pending --> submitted
                         --> submission_failed
draft --> abandoned (after 90 days inactive)
```

- `draft`: Active, user editing
- `submit_pending`: User clicked submit, server processing
- `submitted`: n8n confirmed receipt
- `submission_failed`: n8n returned error or timeout
- `abandoned`: 90-day inactivity (background process)

### 12.3 Idempotency

Each submission must include a unique idempotency key so repeated clicks or retries do not create duplicate records in downstream systems.

### 12.4 Failure Handling

If submission to n8n fails:
- Mark record `submission_failed`
- Preserve payload completely
- Show user graceful message with support contact (info@syndicatepath.com)
- Do NOT tell user to re-enter everything
- Allow internal retry path (admin or automated)

### 12.5 Success Handling

On success:
- Mark record `submitted`
- Store submitted timestamp
- Lock payload against ordinary user editing
- Generate PDF
- Show confirmation screen

---

## 13. Draft Save / Resume

### 13.1 Autosave Triggers

- On step completion (clicking Next)
- On explicit "Save Draft" click
- On significant form changes (debounced, e.g., 5 seconds of inactivity after change)

### 13.2 Draft Persistence

Persist to D1:
- Current step number
- Normalized form data
- `startedAt` timestamp
- `lastActiveAt` timestamp
- Scoring snapshot
- Schema version number

### 13.3 Draft Retention

- Retain inactive drafts for 90 days
- After 90 days, drafts may be purged
- Before purge, system should be able to identify stale drafts (for future email nudge workflow)

### 13.4 Version Compatibility

If the app schema changes between saves:
- Attempt safe migration for additive changes (new optional fields)
- Flag incompatible drafts for user attention
- Never silently corrupt a draft

---

## 14. AI Assist Specification (Phase 2)

Phase 1 ships without AI. Architecture must allow Phase 2 AI without major refactor.

### 14.1 AI Purpose

AI helps the user understand a question and draft better answers. AI does not make legal conclusions, compliance determinations, or suitability decisions.

### 14.2 AI Boundaries

AI must not:
- Present itself as legal counsel
- State that a company is compliant
- State that a company is qualified for a securities exemption
- Auto-save generated text into fields without explicit user confirmation
- Modify hidden fields
- Submit on the user's behalf

### 14.3 AI Context Inputs

For each AI session, provide:
- Section identifier
- Section instructions and educational content from system prompt
- Current visible form values for that section
- Allowed response style
- Prohibited content instructions (compliance guardrails)
- Suggested example structure for good answers

### 14.4 AI Outputs

AI may return:
- Explanation of the question/concept
- Example answer
- Suggested field values (as preview)
- Warning that the question should be reviewed by counsel/accountant

### 14.5 AI UX Rules

- Opening AI starts a new section-scoped session
- Disclaimer shown inside chat panel
- Generated content appears as suggestion preview (not auto-filled)
- User must click explicit "Fill in my answer" action to apply
- Applied suggestion must be visible and editable in the form
- SP branding in chat header, "AI Advisor" avatar
- Pre-seeded contextual greeting: "I can help you think through [section topic]."
- Suggested questions as quick-reply buttons

### 14.6 AI Logging

Store only:
- Section used
- Timestamp
- Token/cost metadata if available
- Whether suggestion was applied

Do not store full conversation transcripts unless explicitly approved in a later spec revision.

### 14.7 AI Rate Limiting

- Rate limit per session (e.g., 20 messages per section per session)
- Rate limit per user per day
- Configurable via environment variables

---

## 15. PDF Export

### 15.1 PDF Contents

- SyndicatePath branding
- Application ID
- Submission date
- Applicant/contact information
- Company summary
- All answered sections with responses
- Readiness score summary with category breakdown
- Red flags
- Disclaimer: preliminary assessment, not legal/investment advice

### 15.2 PDF Rules

- Generated from normalized submitted data, not live form state
- Content must be stable and reproducible
- File naming: `SP-Readiness-{applicationId}-{YYYYMMDD}.pdf`
- If PDF generation fails, submission success still stands

---

## 16. Analytics

### 16.1 Events to Capture

| Event | Trigger |
|-------|---------|
| `landing_viewed` | Landing page load |
| `account_created` | New account creation |
| `application_started` | First step completed |
| `step_completed` | Any step completed (include step ID) |
| `draft_saved` | Manual or auto save |
| `ai_opened` | Chat panel opened (Phase 2) |
| `ai_suggestion_applied` | User applied AI suggestion (Phase 2) |
| `review_viewed` | Review page loaded |
| `submission_attempted` | Submit button clicked |
| `submission_succeeded` | n8n returned success |
| `submission_failed` | n8n returned failure |

### 16.2 Event Payload Minimum

- `applicationId`
- `userId`
- `stepId` (if applicable)
- `timestamp`
- `appVersion`
- UTM parameters

### 16.3 Derived Metrics

- Start-to-submit conversion rate
- Step abandonment rate (which steps lose users)
- Average time per step
- AI usage rate (Phase 2)
- Score distribution
- Failure rate by submission stage

---

## 17. Security & Compliance

### 17.1 Data Protection

- HTTPS only (Cloudflare Pages provides this)
- All secrets server-side only
- Draft and submitted data in Cloudflare D1 (encrypted at rest, Cloudflare managed)
- AI chat conversations ephemeral per session, not stored
- Submitted data follows GHL and SP data retention policies
- User accounts email-only (no passwords stored; magic link auth)
- Draft data auto-deleted after 90 days inactivity

### 17.2 Access Control

- Users may access only their own drafts/submissions
- Internal admin access out of scope for Phase 1

### 17.3 Compliance Disclaimers (must appear)

- "This is a prequalification tool, not a securities offering"
- "No legal, investment, or financial advice is provided"
- "All assessments are preliminary and subject to full review"
- "SyndicatePath team will conduct independent due diligence"
- Privacy policy link
- Consent checkboxes before submission

Must appear at minimum on: landing page, review/submit page, AI chat panel.

### 17.4 Bad Actor Screening

- Preliminary bad actor questions in Step 2
- Flags auto-generated for any affirmative answers
- Full background check conducted separately by SP team

### 17.5 API Security

- Claude API key in Cloudflare Worker environment variable (never client-side)
- n8n webhook should use shared secret authentication
- Rate limiting on AI chat, auth, and submission endpoints
- CORS restricted to application domain
- CSRF protection where applicable

### 17.6 Logging Hygiene

Application logs must not expose:
- Full application payloads
- API secrets
- Raw PII unless strictly required for debugging in protected logs

---

## 18. Accessibility

The app must meet practical WCAG 2.1 AA expectations:

- Keyboard navigable (full form flow)
- Visible focus states
- Labels bound to inputs
- Error messages announced/readable by screen readers
- Sufficient contrast ratios
- Progress indicator understandable by screen readers
- AI chat panel: focus trapping on open, restore on close

---

## 19. Performance

- Landing page loads fast on standard broadband/mobile
- Step transitions feel immediate
- Autosave does not block typing
- Validation does not create visible lag
- Submission shows deterministic progress state (spinner/status)

Bias toward lightweight pages and minimal client bundle size (SvelteKit compiles to vanilla JS).

---

## 20. Observability

### 20.1 What Must Be Observable

- Auth failures
- Draft save failures
- Submission failures (with n8n error details)
- AI endpoint failures (Phase 2)
- PDF generation failures
- Downstream webhook errors

### 20.2 Error Correlation

Each major request traceable by:
- `applicationId`
- `requestId` (generated per server request)
- Timestamp

---

## 21. Error Handling UX

### 21.1 General Rule

The app must fail clearly, not silently.

### 21.2 Specific Cases

- If autosave fails: show non-destructive warning, allow retry
- If AI is unavailable: form still works fully
- If submission fails: preserve data, explain what happened, show support contact
- If PDF generation fails: submission success still stands, tell user PDF will be emailed later

---

## 22. Branding & Design

### 22.1 Visual Identity

- SyndicatePath brand colors, logo, typography
- Clean, professional appearance appropriate for capital-raising context
- Trustworthy and institutional feel (not startup-casual)
- Responsive: desktop, tablet, mobile

### 22.2 Form UX Design

- One section per "page"
- Clear progress indicator (Step 3 of 12, or percentage bar)
- Field-level help text (actual explanatory text, not just tooltips)
- Required field indicators
- Inline validation with helpful error messages
- "Save Draft" prominently visible
- AI chat button visually distinct but not intrusive (Phase 2)

### 22.3 Product Positioning Copy

"This readiness assessment helps SyndicatePath understand your company, capital goals, and current preparation level so we can determine fit and identify next steps. It is a preliminary intake tool only and does not provide legal, financial, or investment advice."

---

## 23. Testing Requirements

### 23.1 Unit Tests

- Scoring functions (all criteria, edge cases, caps, flag generation)
- Normalization functions (null handling, currency conversion)
- Validation rules (field-level and cross-step)
- Conditional logic (show/hide, security type adaptation)

### 23.2 Integration Tests

- Draft save and resume flow
- Submission success path (mock n8n)
- Submission failure path (mock n8n error)
- n8n payload formation verification
- GHL field mapping formation

### 23.3 End-to-End Tests

- Happy path: full submission from landing to confirmation
- Bad actor flagged path (score forced to 0 for regulatory)
- Incomplete draft resume path
- Mobile step navigation sanity check

---

## 24. Acceptance Criteria

The build is acceptable when all of the following are true:

1. A user can create an account and resume a saved draft
2. A user can complete all 12 steps with validation enforced
3. Use of proceeds must sum to 100 before final submission
4. Score is computed consistently and matches deterministic rules in Section 9.3
5. Submission generates a single application record even if clicked multiple times (idempotency)
6. Successful submit sends the normalized payload to n8n
7. Score bands route to correct GHL stage/tag behavior per Section 9.2
8. A PDF can be generated from submitted data
9. Submission failure preserves data and communicates clearly
10. Analytics events are recorded for starts and submissions
11. AI assist (when enabled) cannot silently write or submit data
12. All disclaimers and consent UX are present at required locations

---

## 25. Phased Delivery Plan

### Phase 1: Core Form + Auth + PDF (MVP)

Must include:
- SvelteKit app on Cloudflare Pages at readiness.syndicatepath.com
- Email magic link authentication
- 12-step form wizard with Superforms + Zod validation
- Progress bar, auto-save to Cloudflare D1
- ISS-ACQ-05 aligned readiness scoring (7 criteria, 100-point scale)
- Submission workflow with idempotency and state machine
- Submit to n8n webhook with full normalized payload
- GHL contact creation + Issuer Lifecycle pipeline opportunity (via n8n)
- Tags applied based on score thresholds
- Notification email to info@syndicatepath.com
- PDF export of readiness report
- Analytics: track starts, saves, submissions
- Create 10 new GHL custom fields + 3 new tags
- All compliance disclaimers and consent UX

Must not block launch on:
- AI assist
- ClickUp integration
- Advanced analytics dashboards
- Internal admin tools

### Phase 2: AI Chat Assist

- "Help me with this" button per section
- Cloudflare Worker proxy to Claude Haiku API
- Scoped system prompt per section (from existing system-prompt.md)
- Suggestion preview + explicit "Fill in my answer" action
- AI guardrails and logging (Section 14)
- Rate limiting
- AI usage tracking in D1

### Phase 3: Operational Refinement

- ClickUp ISS-ACQ-05 integration via n8n
- Abandonment detection: tag `cold-lead` after 14 days inactive
- Advanced analytics queries (completion rates, score distribution, common gaps)
- Scoring algorithm refinement based on actual pipeline outcomes
- Email nudge for stale drafts

---

## 26. Build Priority

```
1. Reliable intake (form works, saves, submits)
2. Clean data (normalization, validation)
3. Deterministic scoring (ISS-ACQ-05 aligned)
4. Stable submission into operations (n8n + GHL)
5. Good UX (branding, progress, error handling)
6. AI assist (Phase 2)
```

That order matters. Do not let AI complexity delay the form.

---

## 27. Implementation Constraints for Builder

Claude Code must not improvise on these areas without explicit instruction:
- Scoring rules (Section 9.3)
- Payload shape (Section 7)
- Submission states (Section 12.2)
- Field names and types
- Tag/stage thresholds (Section 9.2)
- Disclaimer language placement
- AI write-back behavior (Section 14.2)
- Idempotency behavior (Section 12.3)
- Draft retention behavior (Section 13.3)

Where minor implementation choices are needed, prefer:
- Explicitness over cleverness
- Deterministic state transitions
- Simple schema-first code structure
- Isolated scoring and normalization modules
- Feature-flagged AI

---

## 28. Open Items (Optional, Non-Blocking)

These are refinements, not blockers:
- Whether D1 or a separate analytics store is ultimately preferred
- Whether confirmation emails are sent by n8n or another service
- Whether PDFs are stored in Google Drive, R2, or both
- Whether an internal admin review screen is added later
- Whether partial AI transcript storage is ever allowed
- Exact session expiry duration

None of these should delay the MVP.

---

*This specification was generated through VibeCode Phase 1 (Specification Interview) with First Principles analysis, then revised in Phase 2 by merging strategic decisions (architecture, GHL mapping, ISS-ACQ-05 alignment) with implementation contracts (data model, validation, state machine, idempotency, testing, acceptance criteria). Ready for Phase 3 Roadmap Generation.*
