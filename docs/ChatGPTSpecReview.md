Yes. The current specification is solid at the strategy level, but it is still too loose in the places that make Claude Code either invent behavior or make architectural guesses. The biggest gaps are around executable detail: canonical data contracts, validation rules, state transitions, failure handling, idempotency, security boundaries, AI guardrails, observability, testing, and acceptance criteria. The current spec clearly defines the product, flow, scoring intent, GHL integration targets, and phased roadmap, but it leaves too many implementation decisions implicit. 

The practical risk is this: Claude Code can build a plausible app from the current spec, but not a deterministic one. That usually leads to rework, because the builder has to choose how drafts save, how score calculation handles partial answers, what happens if n8n fails after GHL contact creation, whether abandoned drafts create CRM records, what exact fields exist in each step, how AI suggestions are approved, and what counts as “complete.” Those choices should be in the spec, not in the model’s imagination. 

Below is a full rewritten version that closes those gaps.

---

# SyndicatePath Issuer Readiness Application — Full Implementation Specification

**Version:** 2.0
**Date:** 2026-03-31
**Status:** Implementation-ready rewrite for Claude Code
**Owner:** SyndicatePath / Adam Pressman
**Primary Builder:** Claude Code
**Primary Deployment Target:** `readiness.syndicatepath.com`

---

## 1. Purpose

Build a hosted web application that guides a prospective issuer through SyndicatePath’s readiness assessment, captures structured answers across a multi-step workflow, computes a preliminary readiness score, generates a reviewable readiness report, and submits the application into SyndicatePath’s existing operational stack for follow-up.

The application must do four jobs well:

1. Collect complete, high-quality issuer intake data
2. Help confused users answer correctly without requiring human intervention
3. Produce a consistent readiness score aligned with SyndicatePath internal qualification criteria
4. Push submitted applications into existing operations systems without manual re-entry

This application is intended to replace the current GPT-led intake path as the primary readiness intake experience.

---

## 2. Product Scope

### 2.1 In Scope

* Hosted multi-step form wizard
* Account-based save/resume
* Per-step validation
* Draft autosave
* Review screen before submit
* Readiness scoring
* Submission to existing n8n webhook
* GHL contact/opportunity/tag workflow
* Confirmation screen
* PDF readiness summary export
* Analytics for starts, saves, abandonment, submission, score band
* Phase 2 AI chat assist scoped to section/question context

### 2.2 Out of Scope

* Legal advice
* Investment advice
* Securities recommendations
* Investor-side workflows
* Offering document generation
* Cap table modeling
* Underwriting or broker-dealer functions
* Deep KYC/AML/background checks
* Public securities offering functionality
* Payment collection
* SyndicatePath client portal beyond this readiness intake flow

---

## 3. Product Goals

### 3.1 Primary Goal

Reduce friction in issuer intake while improving completeness and qualification quality.

### 3.2 Secondary Goals

* Increase completed applications
* Improve pre-call readiness clarity
* Reduce manual qualification work
* Standardize intake across issuers
* Capture analytics on where issuers get stuck
* Create a durable intake system that SyndicatePath can tune over time

### 3.3 Success Definition

The application is successful when a submitted record gives SyndicatePath enough reliable information to decide whether to move the issuer into the next stage of the acquisition process without having to reconstruct the basics manually.

---

## 4. Non-Goals

This application is not trying to be:

* A conversational AI product first
* A deal structuring engine
* A CRM replacement
* A compliance determination system
* A substitute for attorney review
* A substitute for internal underwriting judgment

The form is the source of structured truth. AI exists only to help the user think and complete the form.

---

## 5. Users

### 5.1 Primary User

A founder, executive, or authorized representative of a company exploring a capital raise and trying to determine whether they are a viable fit for SyndicatePath services.

### 5.2 Secondary Internal Users

* Adam / SyndicatePath operators
* Account executives
* CCO/compliance reviewers
* Operations staff reviewing GHL and ClickUp records

---

## 6. Core User Experience

### 6.1 Primary Journey

1. User lands on the readiness application landing page
2. User reads short explanation, disclaimers, privacy notice, and estimated time
3. User creates or starts an account with minimal friction
4. User progresses through the 12 steps
5. User can save and resume at any time
6. User can use AI help on supported sections
7. User reaches review page
8. User sees score preview and flagged concerns
9. User provides contact details and consent
10. User submits
11. System creates submission record and pushes to operational systems
12. User sees confirmation and can download a PDF summary

### 6.2 UX Principles

* One major task per screen
* No long-scroll mega-form
* Clear forward progress
* Save without fear
* Explain unfamiliar terms in plain language
* Never let AI silently write answers into the form
* Show users what will happen next after submission
* Mobile must work, but desktop is the primary usage assumption

---

## 7. Architecture

### 7.1 Required Stack

* **Frontend/App Framework:** SvelteKit
* **Form Layer:** Superforms
* **Validation:** Zod
* **Styling:** Tailwind CSS
* **Hosting:** Cloudflare Pages
* **Server Logic / Protected Endpoints:** Cloudflare-compatible server endpoints / Worker-compatible runtime
* **Draft Storage:** Cloudflare D1
* **AI Proxy:** Cloudflare Worker or server-side endpoint compatible with Cloudflare deployment
* **Submission Endpoint:** Existing n8n webhook
* **Primary CRM:** GoHighLevel
* **Analytics Store:** D1 initially, with option to forward to Supabase later
* **PDF Generation:** Server-side generation from submitted application data

### 7.2 Architecture Rules

* The browser must never receive the Claude API key
* The browser must never write directly to GHL
* The browser must never write directly to ClickUp
* Submitted application state must be owned by the server-side application boundary
* The app must function without AI assist
* The app must tolerate partial completion and resume safely

### 7.3 Canonical Source of Truth

* **Before submit:** D1 draft record is the source of truth
* **At submit:** the normalized application payload is the source of truth
* **After submit:** submission payload + submission log become immutable system records, except for internal follow-up annotations

---

## 8. Environments

The app must support at least:

* **Local development**
* **Staging**
* **Production**

### 8.1 Environment Variables

At minimum:

* `APP_BASE_URL`
* `N8N_WEBHOOK_URL`
* `N8N_WEBHOOK_SECRET`
* `CLAUDE_API_KEY`
* `CLAUDE_MODEL`
* `D1_DATABASE_BINDING`
* `SESSION_SECRET`
* `PDF_STORAGE_TARGET`
* `GHL_LOCATION_ID`
* `GHL_PIPELINE_ID`
* `GHL_DISCOVERY_STAGE_ID`
* `GHL_PROSPECTING_STAGE_ID`
* `INFO_NOTIFICATION_EMAIL`
* `APP_ENV`

No secrets may be hardcoded.

---

## 9. Information Architecture

## 9.1 Steps

1. Company Information
2. Regulatory History
3. Offering Structure
4. Use of Proceeds
5. Financial Condition
6. Team & Qualifications
7. Market & Validation
8. Investor Returns
9. Documentation Status
10. Professional Team
11. Capacity & Resources
12. Timeline & Awareness
13. Review & Submit

The review step is its own step for implementation, even if it is not counted in public-facing progress.

---

## 10. Canonical Data Model

The app must normalize all user inputs into a single canonical object before submission.

```json
{
  "applicationId": "string",
  "status": "draft|submitted|submission_failed|abandoned",
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601",
  "submittedAt": "ISO-8601|null",
  "version": "string",
  "contact": {
    "fullName": "string",
    "email": "string",
    "phone": "string",
    "title": "string|null",
    "linkedinUrl": "string|null"
  },
  "company": {
    "legalName": "string",
    "doingBusinessAs": "string|null",
    "website": "string|null",
    "industry": "string",
    "stateOfIncorporation": "string",
    "entityType": "string",
    "yearsOperating": "number|null",
    "employeeCountRange": "string|null",
    "revenueStatus": "pre_revenue|revenue_generating"
  },
  "regulatoryHistory": {
    "previousRaise": "boolean|null",
    "previousRaiseDetails": "string|null",
    "regulatoryOrders": "boolean|null",
    "regulatoryOrdersDetails": "string|null",
    "badActorIndicators": "boolean|null",
    "badActorDetails": "string|null"
  },
  "offering": {
    "securityType": "equity|debt|revenue_share|safe|convertible_note|other",
    "securityTypeOther": "string|null",
    "exemptionTarget": "reg_cf|reg_d_506b|reg_d_506c|undecided|other",
    "raiseTargetUsd": "number|null",
    "minimumRaiseUsd": "number|null",
    "maximumRaiseUsd": "number|null",
    "minimumInvestmentUsd": "number|null",
    "offeringDescription": "string|null"
  },
  "fundamentals": {
    "useOfProceeds": [
      {
        "category": "string",
        "percent": "number",
        "description": "string|null"
      }
    ],
    "financialProjections": {
      "hasProjections": "boolean|null",
      "projectionSummary": "string|null"
    },
    "teamQualifications": "string|null",
    "assumptions": "string|null",
    "whatFromInvestors": "string|null",
    "principalReturn": "string|null",
    "investorConsideration": "string|null"
  },
  "readiness": {
    "financialStatements": "none|internal_only|compiled|reviewed|audited|unknown",
    "businessPlan": "none|draft|complete",
    "pitchDeck": "none|draft|complete",
    "attorney": "none|identified|engaged",
    "cpa": "none|identified|engaged",
    "marketing": "none|identified|engaged",
    "onlinePresence": "weak|basic|established|strong"
  },
  "capacity": {
    "leadershipTimeCapacity": "low|moderate|high|null",
    "teamExecutionCapacity": "low|moderate|high|null",
    "canSupportCampaignFor90Days": "boolean|null"
  },
  "timeline": {
    "desiredLaunchDate": "YYYY-MM-DD|null",
    "timelineExpectation": "lt_30_days|1_to_3_months|3_to_6_months|6_plus_months|unknown",
    "understandsPreparationTime": "boolean|null"
  },
  "analytics": {
    "utmSource": "string|null",
    "utmMedium": "string|null",
    "utmCampaign": "string|null",
    "startedAt": "ISO-8601|null",
    "lastActiveAt": "ISO-8601|null"
  },
  "scoring": {
    "totalScore": "number|null",
    "band": "qualified|qualified_with_reservations|not_qualified|null",
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
    "timestamp": "ISO-8601|null"
  }
}
```

### 10.1 Data Model Rules

* Missing values must be stored as `null`, not empty strings, after normalization
* Currency fields must be stored as integer USD amounts
* Percentages in use-of-proceeds must total 100 before final submission
* Submission payload version must be included so downstream systems can evolve safely

---

## 11. Step-by-Step Functional Requirements

## 11.1 Step 1 — Company Information

Required fields:

* Company legal name
* Industry
* State of incorporation
* Entity type
* Revenue status

Optional:

* DBA
* Website
* Years operating
* Employee count range

Validation:

* Legal name required, min length 2
* Website must be valid URL if provided
* Years operating must be 0–100 if provided

---

## 11.2 Step 2 — Regulatory History

Required:

* Previous raise yes/no
* Regulatory orders yes/no
* Bad actor indicators yes/no

Conditional:

* If previous raise = yes, details required
* If regulatory orders = yes, details required
* If bad actor indicators = yes, details required

Special rule:

* Any affirmative bad actor indicator triggers a critical flag and forces regulatory readiness score to 0

---

## 11.3 Step 3 — Offering Structure

Required:

* Security type
* Exemption target or undecided
* Raise target
* Minimum raise
* Maximum raise

Conditional:

* If security type = other, require explanation
* Maximum raise must be greater than or equal to minimum raise
* Raise target must be between minimum and maximum when all are present

---

## 11.4 Step 4 — Use of Proceeds

Required:

* At least 2 categories
* Total percentage must equal 100
* At least one narrative explanation

Validation:

* Each percent must be 1–100
* Duplicate categories allowed only if descriptions differ materially; simpler implementation may disallow duplicates

---

## 11.5 Step 5 — Financial Condition

Required:

* Financial statements status
* Whether projections exist

Conditional:

* If projections exist, projection summary required

---

## 11.6 Step 6 — Team & Qualifications

Required:

* Narrative answer describing key team and qualifications

Validation:

* Minimum useful length, for example 100 characters after trimming

---

## 11.7 Step 7 — Market & Validation

Required:

* Narrative answer covering market validation and assumptions

Validation:

* Minimum useful length
* Prompt user to include evidence such as customers, pilots, LOIs, audience traction, partnerships, or comparable proof

---

## 11.8 Step 8 — Investor Returns

Required:

* What investors receive
* Principal return mechanism
* Investor consideration / economics summary

Conditional:

* If security type changes, helper text and examples adapt
* The app must not claim legality or adequacy of terms

---

## 11.9 Step 9 — Documentation Status

Required:

* Business plan status
* Pitch deck status

---

## 11.10 Step 10 — Professional Team

Required:

* Attorney status
* CPA status
* Marketing support status

---

## 11.11 Step 11 — Capacity & Resources

Required:

* Leadership time capacity
* Team execution capacity
* Whether the company can support campaign activity for at least 90 days
* Online presence maturity

---

## 11.12 Step 12 — Timeline & Awareness

Required:

* Timeline expectation
* Whether the applicant understands preparation requirements

Optional:

* Desired launch date

Validation:

* If desired launch date is in the past, reject
* If desired launch date is within 30 days, add red flag

---

## 12. Validation Model

Validation must exist at three levels:

### 12.1 Field-Level Validation

Runs on blur and on next-step action.

### 12.2 Step-Level Validation

User cannot proceed if the step is invalid.

### 12.3 Submission-Level Validation

Runs before submit and checks cross-step rules:

* use-of-proceeds total equals 100
* required consent boxes are checked
* required contact fields are complete
* score can be computed
* payload normalization succeeds

---

## 13. Scoring Specification

The scoring must match the intended 100-point framework already described in the existing spec, but implementation must be deterministic.

### 13.1 Criteria and Maximums

* Business Model: 20
* Funding Need & Use: 15
* Regulatory Readiness: 20
* Team & Capacity: 15
* Budget: 15
* Timeline: 10
* Market Opportunity: 5

### 13.2 Score Bands

* 70–100: `qualified`
* 50–69: `qualified_with_reservations`
* 0–49: `not_qualified`

### 13.3 Deterministic Scoring Rules

#### Business Model (0–20)

* Revenue generating: +10
* Pre-revenue: +5
* Paying customers described: +10
* Pilots/LOIs/audience validation described: +5
* Years operating:

  * 0 years: +0
  * 1 year: +2
  * 2 years: +4
  * 3+ years: +5

Cap at 20.

#### Funding Need & Use (0–15)

* Raise amount provided: +5
* Use of proceeds totals 100 and is coherent: +5
* Milestones/use narrative is present and useful: +5

#### Regulatory Readiness (0–20)

* No bad actor indicators: +10
* No regulatory orders: +5
* Prior raise experience: +3
* Preparation awareness shown: +2

Rules:

* Any bad actor indicator = total for this criterion becomes 0
* Regulatory orders yes = subtract 5 from whatever would otherwise apply, floor at 0

#### Team & Capacity (0–15)

* Key leadership identified: +5
* Relevant qualifications described: +5
* Time/capacity adequate: +5

#### Budget (0–15)

* Raise target >= 500,000: +15
* Raise target 250,000–499,999: +10
* Raise target 100,000–249,999: +5
* Raise target < 100,000: +0 and red flag

#### Timeline (0–10)

* 3–6 months: +10
* 1–3 months: +5
* <30 days: +0 and red flag
* 6+ months: +8
* Understands prep timeline: +2 bonus, but criterion still capped at 10

#### Market Opportunity (0–5)

* Market size/opportunity described: +2
* Competition/positioning addressed: +2
* Evidence of validation included: +1

### 13.4 Red Flags

These must be generated as structured flags, not just text:

* `bad_actor_indicator`
* `regulatory_order_history`
* `unclear_use_of_proceeds`
* `no_return_mechanism`
* `launch_lt_30_days`
* `no_financials_and_no_cpa`
* `weak_team_experience`
* `raise_below_minimum_economic_threshold`

### 13.5 Score Display Rules

Before submission, the user may see:

* Total score
* Score band
* High-level category breakdown
* Plain-language explanation that this is preliminary

Do not expose internal labels like “not qualified” in a hostile tone. Use language such as:

* Strong preliminary fit
* Possible fit with gaps to address
* Early-stage; major gaps should be addressed first

Internal systems may still use the structured band values.

---

## 14. AI Assist Specification

Phase 1 may ship without AI. The app architecture must allow Phase 2 AI without major refactor.

### 14.1 AI Purpose

AI helps the user understand a question and draft better answers. AI does not make legal conclusions, compliance determinations, or final suitability decisions.

### 14.2 AI Boundaries

AI must not:

* present itself as legal counsel
* state that a company is compliant
* state that a company is qualified for a securities exemption
* auto-save generated text into fields without explicit user confirmation
* modify hidden fields
* submit on the user’s behalf

### 14.3 AI Context Inputs

For each AI session, provide:

* section identifier
* section instructions
* current visible form values relevant to that section
* allowed response style
* prohibited content instructions
* suggested example structure for good answers

### 14.4 AI Outputs

AI may return:

* explanation
* example answer
* suggested field values
* warning that the question should be reviewed by counsel/accountant

### 14.5 AI UX Rules

* Opening AI starts a new section-scoped session
* Show disclaimer inside chat
* Generated content must appear as a suggestion preview
* User must click explicit action to apply suggestions
* Applied suggestion must be auditable within the client session

### 14.6 AI Logging

Store only:

* section used
* timestamp
* token/cost metadata if available
* whether suggestion was applied

Do not store full conversation transcripts in Phase 2 unless explicitly approved in a later spec revision.

---

## 15. Authentication and Sessions

### 15.1 Required Auth Pattern

Use passwordless email magic link or functionally equivalent low-friction authentication.

### 15.2 Account Requirements

At minimum:

* email
* name

### 15.3 Session Rules

* Sessions expire after reasonable inactivity
* Drafts remain available after session expiry
* Returning users can resume drafts after re-authentication

### 15.4 No Anonymous Final Submission

Anonymous browsing is acceptable for landing content, but saving drafts and submitting require account identity.

---

## 16. Draft Save / Resume Behavior

### 16.1 Autosave

Autosave must occur:

* on step completion
* on explicit save
* on significant form changes with debounce

### 16.2 Draft Persistence

Persist:

* current step
* normalized form data
* started timestamp
* last active timestamp
* scoring snapshot
* version number

### 16.3 Draft Retention

* Retain inactive drafts for 90 days
* After 90 days, drafts may be purged
* Before purge, if email workflows are later added, the system should be able to identify stale drafts

### 16.4 Version Compatibility

If the schema changes between saves, the app must:

* attempt safe migration for additive changes
* flag incompatible drafts for manual review or forced user refresh
* never silently corrupt a draft

---

## 17. Submission Workflow

### 17.1 Submission Preconditions

Before submit:

* all steps valid
* consent fields checked
* contact details valid
* score computed
* payload normalized
* idempotency key generated

### 17.2 Submission Transaction Strategy

The app must treat submission as a controlled server-side workflow.

Required states:

* `draft`
* `submit_pending`
* `submitted`
* `submission_failed`

### 17.3 Idempotency

Each submission must include a unique idempotency key so repeated clicks or retries do not create duplicate records in downstream systems.

### 17.4 Failure Handling

If submission to n8n fails:

* mark record `submission_failed`
* preserve payload
* show user a graceful message
* provide support contact
* do not tell the user to re-enter everything
* allow internal retry path

### 17.5 Success Handling

On success:

* mark record `submitted`
* store submitted timestamp
* lock the payload against ordinary user editing
* generate PDF
* show confirmation screen

---

## 18. n8n Integration Contract

### 18.1 Submission Endpoint

Use existing issuer application webhook.

### 18.2 Payload Requirements

n8n must receive:

* full normalized application payload
* applicationId
* submission version
* score object
* flags array
* UTM data
* source marker `readiness-app`
* idempotency key

### 18.3 Expected n8n Actions

* create or update GHL contact
* create GHL opportunity if score >= 50
* apply tags
* send notification email to `info@syndicatepath.com`
* send applicant confirmation email
* store summary/PDF in designated location
* optionally create or update ClickUp item
* write submission outcome log

### 18.4 n8n Response Contract

The webhook should return structured JSON at minimum:

```json
{
  "ok": true,
  "applicationId": "string",
  "contactId": "string|null",
  "opportunityId": "string|null",
  "message": "string"
}
```

On failure:

```json
{
  "ok": false,
  "applicationId": "string",
  "errorCode": "string",
  "message": "string"
}
```

---

## 19. GoHighLevel Mapping

The existing mapping intent remains valid, but implementation must treat GHL as downstream, not authoritative.

### 19.1 Required Contact Creation/Update Keys

Reuse existing fields where available. Create missing fields only where necessary.

### 19.2 Required Opportunity Rules

* Score >= 70: create opportunity in Discovery stage
* Score 50–69: create opportunity in Prospecting stage
* Score < 50: do not create opportunity unless later business rule changes

### 19.3 Required Tags

Apply:

* `issuer_candidate` to all submitters
* `readiness-app-submitted` to all successful submissions
* `issuer` when score >= 70
* `highly_qualified` when score >= 80
* `needs-re-engagement` when score < 50
* `bad-actor-flag` when bad actor indicator is true

### 19.4 Duplicate Contact Strategy

Match on email first. If email exists, update that contact rather than create a duplicate.

---

## 20. PDF Export

### 20.1 PDF Contents

The PDF must include:

* SyndicatePath branding
* application ID
* submission date
* applicant/contact information
* company summary
* all answered sections
* readiness score summary
* flags
* disclaimer that this is preliminary and not legal/investment advice

### 20.2 PDF Rules

* PDF is generated from normalized submitted data, not live form state
* PDF content must be stable and reproducible
* File naming format:
  `SP-Readiness-{applicationId}-{YYYYMMDD}.pdf`

---

## 21. Analytics

### 21.1 Events to Capture

* `landing_viewed`
* `account_created`
* `application_started`
* `step_completed`
* `draft_saved`
* `ai_opened`
* `ai_suggestion_applied`
* `review_viewed`
* `submission_attempted`
* `submission_succeeded`
* `submission_failed`

### 21.2 Event Payload Minimum

* applicationId
* userId
* stepId if applicable
* timestamp
* app version
* UTM parameters

### 21.3 Derived Metrics

* start-to-submit conversion
* step abandonment rate
* average time per step
* AI usage rate
* score distribution
* failure rate by submission stage

---

## 22. Security Requirements

### 22.1 Data Protection

* HTTPS only
* Secrets server-side only
* Draft and submitted data stored only in approved systems
* No client-side storage of sensitive normalized application state beyond temporary browser memory unless explicitly needed for resilience

### 22.2 Access Control

* Users may access only their own drafts/submissions
* Internal admin access is out of scope unless later specified

### 22.3 Logging Hygiene

Application logs must not expose:

* full application payloads
* API secrets
* raw personally identifying data unless strictly required for debugging and then only in protected logs

### 22.4 Rate Limits

Rate-limit at minimum:

* auth requests
* AI help endpoint
* submission endpoint

### 22.5 Abuse Controls

* CSRF protection where applicable
* origin checks on protected endpoints
* webhook authentication for internal app-to-n8n calls

---

## 23. Compliance and Disclaimer Requirements

The following language concepts must appear in the UX at appropriate points:

* prequalification tool only
* not a securities offering
* no legal, investment, or financial advice
* preliminary assessment only
* full review required by SyndicatePath
* privacy policy
* consent to data processing

These must appear at minimum on:

* landing page
* review/submit page
* AI chat panel

---

## 24. Accessibility Requirements

The app must meet practical WCAG 2.1 AA expectations for the core flow.

At minimum:

* keyboard navigable
* visible focus states
* labels bound to inputs
* error messages announced/readable
* sufficient contrast
* progress indicator understandable by screen readers
* modal/sidebar AI component focus trapping on open and restore on close

---

## 25. Performance Requirements

* Initial landing page should load fast on standard broadband/mobile
* Step transitions should feel immediate
* Autosave should not block typing
* Validation should not create visible lag
* Submission should show deterministic progress state

No exact millisecond target is required here, but the implementation should bias toward lightweight pages and minimal client bundle size.

---

## 26. Observability

### 26.1 What Must Be Observable

* auth failures
* draft save failures
* submission failures
* AI endpoint failures
* PDF generation failures
* downstream webhook errors

### 26.2 Error Correlation

Each major request should be traceable by:

* applicationId
* requestId
* timestamp

---

## 27. Error Handling UX

### 27.1 General Rule

The app must fail clearly, not silently.

### 27.2 Examples

* If autosave fails, show non-destructive warning and allow retry
* If AI is unavailable, form still works
* If submission fails, preserve data and explain next action
* If PDF generation fails, submission success still stands

---

## 28. Testing Requirements

Claude Code must implement at least:

### 28.1 Unit Tests

* scoring functions
* normalization functions
* validation rules
* conditional logic

### 28.2 Integration Tests

* draft save and resume
* submission success path
* submission failure path
* n8n payload formation
* GHL mapping formation if built within app boundary

### 28.3 End-to-End Tests

* happy path complete submission
* bad actor flagged path
* incomplete draft resume path
* mobile step navigation sanity path

---

## 29. Acceptance Criteria

The build is acceptable when all of the following are true:

1. A user can create an account and resume a saved draft
2. A user can complete all 12 steps with validation
3. Use of proceeds must sum to 100 before final submission
4. Score is computed consistently and matches deterministic rules
5. Submission generates a single application record even if clicked multiple times
6. Successful submit sends the normalized payload to n8n
7. Score bands route to the correct GHL stage/tag behavior
8. A PDF can be generated from submitted data
9. Submission failure preserves data and communicates clearly
10. Analytics events are recorded for starts and submissions
11. AI assist, when enabled, cannot silently write or submit data
12. All disclaimers and consent UX are present

---

## 30. Delivery Phases

## 30.1 Phase 1 — MVP

Must include:

* landing page
* auth
* 12-step form
* validation
* autosave draft
* review screen
* scoring
* submission workflow
* n8n integration
* GHL routing logic via n8n
* confirmation screen
* PDF generation
* analytics basics

Must not block launch on:

* AI assist
* ClickUp integration
* advanced internal admin tools

## 30.2 Phase 2 — AI Assist

Add:

* per-section AI help
* suggestion preview/apply flow
* AI metrics
* rate limiting
* section-specific prompt control

## 30.3 Phase 3 — Operational Refinement

Add:

* ClickUp integration
* abandoned draft workflows
* deeper analytics
* scoring refinement based on real outcomes

---

## 31. Implementation Notes for Claude Code

Claude Code should not improvise on these areas without explicit instruction:

* scoring rules
* payload shape
* submission states
* field names
* tag/stage thresholds
* disclaimer language placement
* AI write-back behavior
* idempotency behavior
* draft retention behavior

Where minor implementation choices are needed, prefer:

* explicitness over cleverness
* deterministic state transitions
* simple schema-first code structure
* isolated scoring and normalization modules
* feature-flagged AI

Recommended internal module structure:

* `schemas/`
* `lib/scoring/`
* `lib/normalization/`
* `lib/validation/`
* `lib/integrations/`
* `routes/(app)/`
* `routes/api/`
* `components/form/`
* `components/ai/`
* `components/review/`

---

## 32. Open Items That Are Still Legitimately Optional

These are optional refinements, not blockers:

* whether D1 or a separate analytics store is ultimately preferred
* whether confirmation emails are sent directly by n8n or another service
* whether PDFs are stored in Google Drive, R2, or both
* whether an internal admin review screen is added later
* whether partial transcript storage for AI is ever allowed

None of these should delay the MVP.

---

## 33. Final Product Positioning Copy

Use plain-language framing throughout the app:

“This readiness assessment helps SyndicatePath understand your company, capital goals, and current preparation level so we can determine fit and identify next steps. It is a preliminary intake tool only and does not provide legal, financial, or investment advice.”

---

## 34. Build Priority

The build priority is:

1. Reliable intake
2. Clean data
3. Deterministic scoring
4. Stable submission into operations
5. Good UX
6. AI assist

That order matters. Do not let AI complexity delay the form.

---

## 35. Summary of What Was Added vs. the Original

The rewritten spec adds the pieces the original was missing:

* canonical normalized payload
* precise validation expectations
* explicit submission states
* idempotency requirement
* failure handling rules
* draft/version compatibility rules
* AI guardrails and logging boundaries
* analytics event definitions
* security/logging hygiene
* accessibility requirements
* testing requirements
* acceptance criteria
* implementation constraints so Claude Code does not freeload on assumptions

That is the difference between a “good idea spec” and a build spec.

If you want, I’ll turn this into a clean downloadable `.md` file next.
