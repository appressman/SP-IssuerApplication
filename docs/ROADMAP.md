# SyndicatePath Issuer Readiness Application - Implementation Roadmap

**Version:** 1.0
**Date:** 2026-03-31
**Source:** SPECIFICATION.md v2.0
**Methodology:** VibeCode Phase 3 - Roadmap Generation

---

## Overview

This roadmap breaks the implementation into 18 incremental steps. Each step builds on the previous, produces testable output, and avoids orphan code. Steps are ordered by the build priority from the spec: reliable intake first, then clean data, scoring, submission, UX, and finally AI assist.

All prompts target a SvelteKit 2.x + Superforms + Zod + Tailwind CSS 4 + Cloudflare Pages/D1 stack.

---

## Step 1: Project Scaffolding and Configuration

```text
You are building a SvelteKit 2.x web application called "SP Issuer Readiness" that will be deployed to Cloudflare Pages.

Create the project scaffold with the following requirements:

1. Initialize a new SvelteKit project using `npm create svelte@latest sp-issuer-readiness` with the following choices:
   - Skeleton project (no demo app)
   - TypeScript
   - ESLint + Prettier

2. Install these dependencies:
   - sveltekit-superforms (form management)
   - zod (validation)
   - tailwindcss@4 (styling)
   - @sveltejs/adapter-cloudflare (deployment)
   - wrangler (Cloudflare dev tooling)
   - uuid (application ID generation)

3. Install dev dependencies:
   - vitest (testing)
   - @testing-library/svelte (component testing)
   - playwright (E2E testing)

4. Configure the project:
   - Set adapter-cloudflare in svelte.config.js
   - Create wrangler.toml with:
     - name = "sp-issuer-readiness"
     - compatibility_date = today's date
     - A D1 database binding called "DB"
     - Environment variables placeholders (do NOT put real secrets): APP_BASE_URL, APP_ENV, N8N_WEBHOOK_URL, N8N_WEBHOOK_SECRET, SESSION_SECRET, INFO_NOTIFICATION_EMAIL, GHL_LOCATION_ID, GHL_PIPELINE_ID, GHL_DISCOVERY_STAGE_ID, GHL_PROSPECTING_STAGE_ID
   - Create a .dev.vars file (gitignored) with placeholder values for local development
   - Add .dev.vars to .gitignore

5. Set up the directory structure:
   src/
     lib/
       schemas/          # Zod schemas
       scoring/          # Scoring engine
       normalization/    # Payload normalization
       validation/       # Cross-step validation
       integrations/     # n8n, analytics
       server/           # Server-only utilities (auth, db)
     routes/
       (app)/            # Authenticated form wizard routes
       api/              # Server API endpoints
     components/
       form/             # Step components, progress bar
       ai/               # Phase 2 AI chat (empty placeholder)
       review/           # Review and score display
       layout/           # Header, footer, branding
   static/
     # SP branding assets placeholder

6. Create a basic root layout (+layout.svelte) with:
   - Tailwind CSS imported
   - Minimal SP-branded shell (header with logo placeholder, main content area, footer with disclaimer)
   - A slot for page content

7. Create a health check route at /api/health (+server.ts) that returns { status: "ok", version: "0.1.0" }

8. Write a test that verifies the health endpoint returns 200 with the expected JSON.

9. Verify the dev server starts with `npm run dev` and the health endpoint works.

Do NOT create any form pages, auth, or database tables yet. This step is only scaffolding.
```

---

## Step 2: Zod Schemas and Canonical Data Model

```text
You are continuing work on the SP Issuer Readiness SvelteKit application. The project scaffold exists with the directory structure already created.

Create the Zod schemas that define the canonical data model for the application. These schemas are the single source of truth for validation and type generation throughout the app.

Create the following files in src/lib/schemas/:

1. application.ts - The master application schema:
   - applicationId: z.string().uuid()
   - status: z.enum(["draft", "submit_pending", "submitted", "submission_failed", "abandoned"])
   - createdAt: z.string().datetime()
   - updatedAt: z.string().datetime()
   - submittedAt: z.string().datetime().nullable()
   - version: z.string() (schema version, default "1.0")

2. contact.ts - Contact information schema:
   - fullName: z.string().min(2)
   - email: z.string().email()
   - phone: z.string().min(7)
   - title: z.string().nullable().default(null)
   - linkedinUrl: z.string().url().nullable().default(null)

3. company.ts - Company information schema:
   - legalName: z.string().min(2)
   - doingBusinessAs: z.string().nullable().default(null)
   - website: z.string().url().nullable().default(null)
   - industry: z.string().min(1)
   - stateOfIncorporation: z.string().min(2)
   - entityType: z.string().min(1) (LLC, C-Corp, S-Corp, B-Corp, Nonprofit, Partnership, Sole Proprietorship, Other)
   - yearsOperating: z.number().int().min(0).max(100).nullable().default(null)
   - employeeCountRange: z.string().nullable().default(null) (1-5, 6-25, 26-100, 101-500, 500+)
   - revenueStatus: z.enum(["pre_revenue", "revenue_generating"])

4. regulatory.ts - Regulatory history schema:
   - previousRaise: z.boolean().nullable()
   - previousRaiseDetails: z.string().min(20).nullable().default(null)
   - regulatoryOrders: z.boolean().nullable()
   - regulatoryOrdersDetails: z.string().min(20).nullable().default(null)
   - badActorIndicators: z.boolean().nullable()
   - badActorDetails: z.string().min(20).nullable().default(null)
   Apply refinements: if previousRaise is true, previousRaiseDetails is required. Same for regulatoryOrders and badActorIndicators.

5. offering.ts - Offering structure schema:
   - securityType: z.enum(["equity", "debt", "revenue_share", "safe", "convertible_note", "other"])
   - securityTypeOther: z.string().nullable().default(null)
   - exemptionTarget: z.enum(["reg_cf", "reg_d_506b", "reg_d_506c", "undecided", "other"])
   - raiseTargetUsd: z.number().int().positive().nullable()
   - minimumRaiseUsd: z.number().int().positive().nullable()
   - maximumRaiseUsd: z.number().int().positive().nullable()
   - minimumInvestmentUsd: z.number().int().positive().nullable().default(null)
   - offeringDescription: z.string().nullable().default(null)
   Refinement: if securityType is "other", securityTypeOther required. maximumRaiseUsd >= minimumRaiseUsd.

6. fundamentals.ts - Fundamentals schemas:
   - useOfProceedsItem: z.object({ category: z.string(), percent: z.number().int().min(1).max(100), description: z.string().nullable() })
   - useOfProceeds: z.array(useOfProceedsItem).min(2) with refinement that percents sum to 100
   - financialProjections: z.object({ hasProjections: z.boolean().nullable(), projectionSummary: z.string().min(50).nullable() }) with refinement: if hasProjections true, summary required
   - teamQualifications: z.string().min(100)
   - assumptions: z.string().min(100)
   - whatFromInvestors: z.string().min(1)
   - principalReturn: z.string().min(1)
   - investorConsideration: z.string().min(1)

7. readiness.ts - Readiness and capacity schemas:
   - financialStatements: z.enum(["none", "internal_only", "compiled", "reviewed", "audited", "unknown"])
   - businessPlan: z.enum(["none", "draft", "complete"])
   - pitchDeck: z.enum(["none", "draft", "complete"])
   - attorney/cpa/marketing: z.enum(["none", "identified", "engaged"])
   - onlinePresence: z.enum(["weak", "basic", "established", "strong"])
   - leadershipTimeCapacity/teamExecutionCapacity: z.enum(["low", "moderate", "high"]).nullable()
   - canSupportCampaignFor90Days: z.boolean().nullable()

8. timeline.ts - Timeline schema:
   - desiredLaunchDate: z.string().date().nullable().default(null) with refinement: not in the past
   - timelineExpectation: z.enum(["lt_30_days", "1_to_3_months", "3_to_6_months", "6_plus_months", "unknown"])
   - understandsPreparationTime: z.boolean().nullable()

9. consent.ts - Consent schema:
   - agreedToProcessing: z.literal(true) (must be true to submit)
   - agreedToDisclaimers: z.literal(true)
   - timestamp: z.string().datetime().nullable()

10. analytics.ts - Analytics/UTM schema:
    - utmSource/utmMedium/utmCampaign: z.string().nullable().default(null)
    - startedAt/lastActiveAt: z.string().datetime().nullable()

11. index.ts - Re-export everything and create a combined fullApplicationSchema that composes all sub-schemas into the canonical data model shape. Export the inferred TypeScript type as ApplicationData.

Also create per-step partial schemas (stepSchemas.ts) that define what is validated at each step:
- Step 1: company schema (required fields only)
- Step 2: regulatory schema
- Step 3: offering schema
- Step 4: useOfProceeds
- Step 5: financialStatements + financialProjections
- Step 6: teamQualifications only
- Step 7: assumptions only
- Step 8: whatFromInvestors + principalReturn + investorConsideration
- Step 9: businessPlan + pitchDeck
- Step 10: attorney + cpa + marketing
- Step 11: capacity fields + onlinePresence
- Step 12: timeline fields

Write unit tests for each schema file:
- Test valid data passes
- Test missing required fields fail
- Test refinement rules (e.g., use of proceeds sum, conditional details)
- Test edge cases (min lengths, URL validation, date not in past)

Run all tests and confirm they pass.
```

---

## Step 3: D1 Database Schema and Migrations

```text
You are continuing work on the SP Issuer Readiness SvelteKit application. Zod schemas exist in src/lib/schemas/.

Create the Cloudflare D1 database schema for storing user accounts, application drafts, and analytics events.

1. Create a migrations directory at the project root: migrations/

2. Create the first migration file: migrations/0001_initial_schema.sql

   The SQL should create these tables:

   users:
   - id TEXT PRIMARY KEY (UUID)
   - email TEXT NOT NULL UNIQUE
   - name TEXT NOT NULL
   - created_at TEXT NOT NULL DEFAULT (datetime('now'))
   - last_login_at TEXT

   magic_links:
   - id TEXT PRIMARY KEY (UUID)
   - user_id TEXT NOT NULL REFERENCES users(id)
   - token TEXT NOT NULL UNIQUE
   - expires_at TEXT NOT NULL
   - used_at TEXT
   - created_at TEXT NOT NULL DEFAULT (datetime('now'))

   sessions:
   - id TEXT PRIMARY KEY (UUID)
   - user_id TEXT NOT NULL REFERENCES users(id)
   - expires_at TEXT NOT NULL
   - created_at TEXT NOT NULL DEFAULT (datetime('now'))

   applications:
   - id TEXT PRIMARY KEY (UUID, this is the applicationId)
   - user_id TEXT NOT NULL REFERENCES users(id)
   - status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','submit_pending','submitted','submission_failed','abandoned'))
   - current_step INTEGER NOT NULL DEFAULT 1
   - form_data TEXT NOT NULL DEFAULT '{}' (JSON blob of current form state)
   - scoring_snapshot TEXT (JSON blob of last computed score)
   - schema_version TEXT NOT NULL DEFAULT '1.0'
   - idempotency_key TEXT UNIQUE
   - created_at TEXT NOT NULL DEFAULT (datetime('now'))
   - updated_at TEXT NOT NULL DEFAULT (datetime('now'))
   - submitted_at TEXT
   - submission_response TEXT (JSON blob of n8n response)

   analytics_events:
   - id TEXT PRIMARY KEY (UUID)
   - application_id TEXT REFERENCES applications(id)
   - user_id TEXT
   - event_type TEXT NOT NULL
   - step_id INTEGER
   - metadata TEXT (JSON)
   - app_version TEXT
   - utm_source TEXT
   - utm_medium TEXT
   - utm_campaign TEXT
   - created_at TEXT NOT NULL DEFAULT (datetime('now'))

   Create indexes on:
   - users(email)
   - magic_links(token)
   - magic_links(user_id)
   - sessions(user_id)
   - applications(user_id)
   - applications(status)
   - analytics_events(application_id)
   - analytics_events(event_type)

3. Create src/lib/server/db.ts with helper functions:
   - getDb(platform): returns the D1 binding from the platform object
   - Helper type for the platform env

4. Create src/lib/server/repositories/users.ts with functions:
   - createUser(db, email, name): creates user, returns user object
   - getUserByEmail(db, email): returns user or null
   - getUserById(db, id): returns user or null
   - updateLastLogin(db, userId): updates last_login_at

5. Create src/lib/server/repositories/applications.ts with functions:
   - createApplication(db, userId): creates new draft application with UUID, returns it
   - getApplication(db, applicationId): returns application or null
   - getApplicationByUserId(db, userId): returns the user's draft application (most recent)
   - updateFormData(db, applicationId, formData, currentStep): updates form_data, current_step, updated_at
   - updateStatus(db, applicationId, status): updates status
   - updateScoringSnapshot(db, applicationId, scoring): updates scoring_snapshot
   - setSubmitted(db, applicationId, idempotencyKey, response): sets submitted_at, status, submission_response

6. Create src/lib/server/repositories/analytics.ts with function:
   - trackEvent(db, event): inserts an analytics event row

7. Update wrangler.toml to reference the migration directory.

8. Write tests for repository functions using an in-memory SQLite database (or mock D1). Test:
   - User creation and retrieval
   - Application CRUD lifecycle
   - Status transitions
   - Idempotency key uniqueness constraint
   - Analytics event insertion

Run all tests and confirm they pass.
```

---

## Step 4: Authentication - Magic Link Flow

```text
You are continuing work on the SP Issuer Readiness SvelteKit application. The database schema and user repository exist.

Implement email magic link authentication.

1. Create src/lib/server/auth.ts with these functions:
   - generateMagicLink(db, email, name, baseUrl):
     - Creates user if not exists (getUserByEmail, then createUser)
     - Generates a secure random token (crypto.randomUUID or similar)
     - Stores in magic_links table with 15-minute expiry
     - Returns the full magic link URL: {baseUrl}/auth/verify?token={token}
   - verifyMagicLink(db, token):
     - Looks up token in magic_links
     - Checks not expired, not already used
     - Marks as used
     - Creates a session (UUID, 7-day expiry)
     - Updates user last_login_at
     - Returns { userId, sessionId } or throws error
   - validateSession(db, sessionId):
     - Looks up session, checks not expired
     - Returns user object or null
   - destroySession(db, sessionId):
     - Deletes session row

2. Create src/lib/server/email.ts with a sendMagicLinkEmail function:
   - For Phase 1, this should POST to the n8n webhook or use a simple fetch to a transactional email endpoint
   - Accept: to (email), magicLinkUrl, name
   - For development, log the magic link to console instead of sending email
   - Keep this abstracted so the email provider can change later

3. Create the auth routes:

   src/routes/auth/login/+page.svelte:
   - Simple form: email input + name input + "Send Login Link" button
   - SP branding
   - On submit, POST to /auth/login (form action)
   - Show success message: "Check your email for a login link"

   src/routes/auth/login/+page.server.ts:
   - Form action: validate email/name, call generateMagicLink, call sendMagicLinkEmail
   - Return success or error message

   src/routes/auth/verify/+server.ts (GET):
   - Read token from query params
   - Call verifyMagicLink
   - Set session cookie (httpOnly, secure, sameSite=lax, 7-day maxAge)
   - Redirect to /app (the form wizard)
   - On error, redirect to /auth/login with error message

   src/routes/auth/logout/+server.ts (POST):
   - Read session cookie
   - Call destroySession
   - Clear cookie
   - Redirect to /

4. Create a SvelteKit hook (src/hooks.server.ts):
   - On every request, read the session cookie
   - Call validateSession
   - Attach user to event.locals if valid
   - For routes under (app)/, redirect to /auth/login if no valid session

5. Create src/routes/(app)/+layout.server.ts:
   - Load function returns the user from event.locals
   - If no user, redirect to /auth/login

6. Create TypeScript types in src/app.d.ts:
   - Extend App.Locals to include user (id, email, name) and session
   - Extend App.Platform to include env with D1 binding

7. Write tests:
   - Magic link generation creates a valid token
   - Magic link verification succeeds with valid token
   - Expired tokens are rejected
   - Used tokens are rejected
   - Session creation and validation works
   - Session expiry is enforced

Run all tests and confirm they pass. Verify the login flow works end-to-end in the dev server.
```

---

## Step 5: Landing Page

```text
You are continuing work on the SP Issuer Readiness SvelteKit application. Auth is implemented.

Create the public landing page at the root route.

1. Create src/routes/+page.svelte (the landing page):

   Layout:
   - SP logo and branding at top
   - Headline: "SyndicatePath Readiness Assessment"
   - Subheadline: "Evaluate your company's readiness to raise capital"
   - Brief explanation paragraph (use the product positioning copy from the spec):
     "This readiness assessment helps SyndicatePath understand your company, capital goals, and current preparation level so we can determine fit and identify next steps. It is a preliminary intake tool only and does not provide legal, financial, or investment advice."
   - What to expect section:
     - 12 sections covering your company, offering, team, and readiness
     - Estimated time: 20-30 minutes
     - Save and resume at any time
     - Get a preliminary readiness score
   - "Begin Your Readiness Assessment" CTA button (links to /auth/login or /app if logged in)
   - Disclaimers section at bottom:
     - "This is a prequalification tool, not a securities offering"
     - "No legal, investment, or financial advice is provided"
     - "All assessments are preliminary and subject to full review"
     - "SyndicatePath team will conduct independent due diligence"
     - Privacy policy link (placeholder href)

2. Create src/routes/+page.server.ts:
   - Load function checks if user is already logged in (has valid session)
   - Pass isLoggedIn to the page for CTA button routing

3. Style the landing page with Tailwind CSS:
   - Professional, institutional feel
   - SP brand colors (use CSS custom properties so they can be updated later):
     --sp-primary: a navy/dark blue
     --sp-accent: a gold/amber
     --sp-bg: white
     --sp-text: dark gray
   - Responsive: looks good on desktop and mobile
   - The CTA button should be prominent and clearly clickable

4. Create src/components/layout/Header.svelte:
   - SP logo placeholder (text "SyndicatePath" for now)
   - If logged in, show user email and logout button

5. Create src/components/layout/Footer.svelte:
   - Copyright line
   - Disclaimer text
   - Privacy policy link (placeholder)

6. Update src/routes/+layout.svelte to use Header and Footer components.

7. Create src/routes/+layout.server.ts (root layout):
   - Pass user info from locals to all pages (nullable, since landing is public)

8. Track analytics: when the landing page loads, fire a landing_viewed event.
   - Create src/lib/integrations/analytics.ts with a trackEvent function that POSTs to /api/analytics
   - Create src/routes/api/analytics/+server.ts that receives events and calls the repository trackEvent function
   - Call trackEvent("landing_viewed") from the landing page on mount

No form wizard pages yet. This step is only the landing page, layout shell, and analytics event wiring.

Run the dev server and verify the landing page renders correctly on desktop and mobile viewports.
```

---

## Step 6: Form Wizard Shell and Navigation

```text
You are continuing work on the SP Issuer Readiness SvelteKit application. Landing page and auth are working.

Create the form wizard shell with step navigation, progress bar, and auto-save infrastructure. Do NOT build individual step form fields yet (that comes in later steps). This step creates the navigation framework that all steps will plug into.

1. Create the wizard layout at src/routes/(app)/+layout.svelte:
   - Progress bar component showing current step out of 12 (+ review)
   - Step title display
   - The progress bar should be accessible (role="progressbar", aria-valuenow, etc.)

2. Create src/components/form/ProgressBar.svelte:
   - Takes currentStep (1-13) and totalSteps (13) as props
   - Shows a visual progress bar (percentage filled)
   - Shows "Step X of 12" text (step 13 shows "Review")
   - Step labels visible on desktop, hidden on mobile (just the bar)
   - Accessible to screen readers

3. Create src/components/form/StepNavigation.svelte:
   - "Previous" button (hidden on step 1)
   - "Next" button (steps 1-12)
   - "Review Your Application" button (on step 12 instead of Next)
   - "Save Draft" button (always visible)
   - Disable Next while validation is running
   - All buttons styled with Tailwind, SP branding

4. Create the wizard controller in src/routes/(app)/app/+page.server.ts:
   - Load function:
     - Get or create an application for the current user
     - Return application data (id, currentStep, formData, status)
   - If application status is "submitted", redirect to confirmation page

5. Create src/routes/(app)/app/+page.svelte:
   - The main wizard page that renders the current step
   - Dynamically loads the step component based on currentStep
   - Passes form data to the step component
   - Handles Next/Previous navigation by updating currentStep
   - Handles Save Draft by calling the save endpoint

6. Create src/routes/api/draft/+server.ts:
   - POST handler: receives { applicationId, currentStep, formData }
   - Validates the user owns the application
   - Calls updateFormData repository function
   - Returns { ok: true }
   - Tracks a "draft_saved" analytics event

7. Create placeholder step components in src/components/form/steps/:
   - Step1.svelte through Step12.svelte
   - Each just shows the step title and "Fields coming soon" placeholder text
   - Each exports the step schema for validation
   - ReviewStep.svelte placeholder

8. Create a step configuration in src/lib/schemas/stepConfig.ts:
   - Array of 13 objects: { stepNumber, title, schemaKey, description }
   - Example: { stepNumber: 1, title: "Company Information", schemaKey: "company", description: "Tell us about your company" }
   - Export helper functions: getStepConfig(stepNumber), getTotalSteps()

9. Wire up auto-save with debounce:
   - Create src/lib/integrations/autosave.ts
   - Debounced save function (5 seconds after last change)
   - Calls the /api/draft endpoint
   - Shows a subtle "Saving..." / "Saved" indicator in the UI

10. Write tests:
    - Progress bar renders correct percentage for each step
    - Navigation buttons appear/hide correctly per step
    - Step configuration returns correct data for all 13 steps
    - Draft save endpoint accepts and stores data

Run the dev server. Verify you can navigate forward through placeholder steps with the progress bar updating. Verify "Save Draft" calls the endpoint.
```

---

## Step 7: Form Steps 1-4 (Company, Regulatory, Offering, Use of Proceeds)

```text
You are continuing work on the SP Issuer Readiness SvelteKit application. The form wizard shell with navigation and placeholder steps exists.

Implement the first 4 form steps with full fields, validation, and Superforms integration.

For each step, use sveltekit-superforms with the Zod schema defined in src/lib/schemas/stepSchemas.ts. Each step component receives the current form data as a prop and emits validated data on successful Next.

1. Step 1 - Company Information (src/components/form/steps/Step1.svelte):
   Fields:
   - Company Legal Name (text input, required, min 2 chars)
   - Doing Business As (text input, optional)
   - Company Website (URL input, optional, validated as URL)
   - Industry (select dropdown with common industries + "Other" with text input)
   - State of Incorporation (select dropdown, all 50 US states + DC + territories)
   - Entity Type (select: LLC, C-Corp, S-Corp, B-Corp, Nonprofit, Partnership, Sole Proprietorship, Other)
   - Years Operating (number input, 0-100, optional)
   - Employee Count Range (select: 1-5, 6-25, 26-100, 101-500, 500+, optional)
   - Revenue Status (radio: Pre-Revenue, Revenue Generating, required)

   Each field should have:
   - A label bound to the input (for accessibility)
   - Help text below the field explaining what it means
   - Inline validation error display
   - Required indicator (*) where applicable

2. Step 2 - Regulatory History (src/components/form/steps/Step2.svelte):
   Fields:
   - "Has your company previously raised capital from investors?" (radio: Yes/No)
   - If Yes: "Please describe your previous capital raises" (textarea, min 20 chars)
   - "Has your company or any officer/director been subject to any regulatory orders or actions?" (radio: Yes/No)
   - If Yes: "Please describe" (textarea, min 20 chars)
   - "Are there any bad actor disqualification events that may apply to your company, its officers, directors, or significant shareholders?" (radio: Yes/No)
   - If Yes: "Please describe" (textarea, min 20 chars)

   Include a help text box explaining what "bad actor disqualification" means in plain language.
   Conditional fields should animate in/out smoothly.

3. Step 3 - Offering Structure (src/components/form/steps/Step3.svelte):
   Fields:
   - Security Type (select: Equity, Debt, Revenue Share, SAFE, Convertible Note, Other)
   - If Other: explain (text input, required)
   - Exemption Target (select: Regulation CF, Reg D 506(b), Reg D 506(c), Undecided, Other)
   - Raise Target USD (currency input, required)
   - Minimum Raise USD (currency input, required)
   - Maximum Raise USD (currency input, required, must be >= minimum)
   - Minimum Investment USD (currency input, optional)
   - Offering Description (textarea, optional)

   Include help text explaining the difference between exemption types in simple terms.
   Currency inputs should format as USD and store as integers.

4. Step 4 - Use of Proceeds (src/components/form/steps/Step4.svelte):
   This is a dynamic form - users add multiple line items.
   Fields per item:
   - Category (text input or select with common categories: Marketing, Product Development, Working Capital, Hiring, Legal/Compliance, Technology, Other)
   - Percentage (number input, 1-100)
   - Description (textarea, optional but at least one must have a description)

   UI:
   - "Add Category" button to add new rows (minimum 2 required)
   - "Remove" button per row (only if more than 2 rows)
   - Running total display that shows current sum and turns red if not 100
   - Validation: total must equal 100 before proceeding

5. Create a reusable form field wrapper component: src/components/form/FormField.svelte
   Props: label, name, required, helpText, error
   Renders: label, the slot content (input), help text, error message
   Handles: aria-describedby linking, required indicator

6. Create currency input component: src/components/form/CurrencyInput.svelte
   - Displays formatted USD (with commas)
   - Stores raw integer value
   - Handles paste and keyboard input

7. Wire each step to Superforms:
   - Use superForm() with the step's Zod schema
   - On successful validation, emit the data upward
   - The wizard controller saves valid step data to the draft

8. Track "step_completed" analytics event when user successfully moves to the next step.

9. Write unit tests for:
   - Step 1: validates required fields, rejects invalid URLs
   - Step 2: conditional validation (details required when yes selected)
   - Step 3: max raise >= min raise validation
   - Step 4: use of proceeds sum must equal 100, minimum 2 categories
   - CurrencyInput formatting and value extraction

Run all tests. Start the dev server and verify you can fill out and navigate through steps 1-4 with validation working.
```

---

## Step 8: Form Steps 5-8 (Financial, Team, Market, Investor Returns)

```text
You are continuing work on the SP Issuer Readiness SvelteKit application. Steps 1-4 are implemented with Superforms and Zod validation.

Implement form steps 5-8 following the same patterns established in steps 1-4. Use the FormField wrapper component for consistent field rendering.

1. Step 5 - Financial Condition (src/components/form/steps/Step5.svelte):
   Fields:
   - Financial Statements Status (select: None, Internal Only, Compiled, Reviewed, Audited, Unknown)
   - Help text explaining each level (what "compiled" vs "reviewed" vs "audited" means)
   - "Do you have financial projections?" (radio: Yes/No)
   - If Yes: "Summarize your financial projections" (textarea, min 50 chars)
   - Help text: "Include projected revenue, expenses, and timeline. These don't need to be final."

2. Step 6 - Team & Qualifications (src/components/form/steps/Step6.svelte):
   Fields:
   - "Describe your leadership team and their relevant qualifications" (textarea, min 100 chars)
   - Help text prompting: "Include key team members, their roles, relevant experience, and why they are the right people to execute this plan. Mention any domain expertise, prior exits, or industry credentials."
   - Character count indicator showing current length vs minimum
   - Rich help text explaining what SyndicatePath looks for in a team

3. Step 7 - Market & Validation (src/components/form/steps/Step7.svelte):
   Fields:
   - "Describe your market opportunity and validation" (textarea, min 100 chars)
   - Help text prompting for specific evidence: "What evidence do you have that the market wants your product/service? Include: paying customers, pilots, LOIs, audience size, partnerships, comparable companies, market research, or other validation."
   - Character count indicator

4. Step 8 - Investor Returns (src/components/form/steps/Step8.svelte):
   Fields:
   - "What will investors receive?" (textarea, required)
     Help text adapts based on security type from Step 3:
     - Equity: "Describe the class of shares, any preferences, voting rights"
     - Debt: "Describe the interest rate, term, payment schedule"
     - Revenue Share: "Describe the percentage, cap, payment frequency"
     - SAFE/Convertible Note: "Describe the valuation cap, discount rate, conversion terms"
     - Other: "Describe what investors will receive"
   - "How and when will investors get their principal back?" (textarea, required)
   - "What is the total consideration investors will receive and when?" (textarea, required)
   - Disclaimer banner: "The descriptions you provide here are for preliminary assessment only. Your attorney will draft the actual offering terms."

   Access the security type from the shared form state to show appropriate help text.

5. Wire all steps to Superforms with their Zod schemas, same as steps 1-4.

6. Track "step_completed" events for each step.

7. Write unit tests for:
   - Step 5: conditional projections summary validation
   - Step 6: minimum character length enforcement
   - Step 7: minimum character length enforcement
   - Step 8: all three fields required

Run all tests. Verify steps 5-8 work in the dev server with proper validation and conditional logic.
```

---

## Step 9: Form Steps 9-12 (Documentation, Professional Team, Capacity, Timeline)

```text
You are continuing work on the SP Issuer Readiness SvelteKit application. Steps 1-8 are implemented.

Implement form steps 9-12 following established patterns.

1. Step 9 - Documentation Status (src/components/form/steps/Step9.svelte):
   Fields:
   - "Business Plan Status" (select: None, Draft, Complete)
   - "Pitch Deck Status" (select: None, Draft, Complete)
   - Help text for each explaining what SyndicatePath considers adequate for each level
   - If both are "None": show a gentle warning (not blocking) that these are typically needed

2. Step 10 - Professional Team (src/components/form/steps/Step10.svelte):
   Fields:
   - "Securities Attorney Status" (select: None, Identified, Engaged)
   - "CPA/Accountant Status" (select: None, Identified, Engaged)
   - "Marketing Support Status" (select: None, Identified, Engaged)
   - Help text explaining why each professional is important for a capital raise
   - If attorney is "None": show informational note that a securities attorney is required for any offering

3. Step 11 - Capacity & Resources (src/components/form/steps/Step11.svelte):
   Fields:
   - "Leadership Time Capacity" (select: Low, Moderate, High)
     Help text: "How much time can your leadership team dedicate to the capital raise over the next 3-6 months?"
   - "Team Execution Capacity" (select: Low, Moderate, High)
     Help text: "Does your team have bandwidth to manage campaign activities alongside normal operations?"
   - "Can your company support active campaign activity for at least 90 days?" (radio: Yes/No)
     Help text: "Regulation CF campaigns typically run 60-90+ days and require active marketing, investor communication, and compliance updates."
   - "Online Presence Maturity" (select: Weak, Basic, Established, Strong)
     Help text explaining each level:
     - Weak: No website or minimal social media
     - Basic: Simple website, some social media
     - Established: Professional website, active social media, some press/content
     - Strong: Professional website, large following, media coverage, strong brand

4. Step 12 - Timeline & Awareness (src/components/form/steps/Step12.svelte):
   Fields:
   - "When do you expect to launch your offering?" (select: Less than 30 days, 1-3 months, 3-6 months, 6+ months, Unknown)
   - "Desired Launch Date" (date input, optional)
     Validation: not in the past. If within 30 days, show warning about aggressive timeline.
   - "Do you understand that preparing a securities offering typically takes 60-90+ days?" (radio: Yes/No)
     Help text: "This includes legal documentation, financial preparation, marketing materials, and regulatory filings."

   If timeline is "Less than 30 days", show a prominent info box explaining that this timeline is very aggressive and may indicate a need for more preparation.

5. Wire all steps to Superforms with their Zod schemas.

6. Track "step_completed" events for each step.

7. On completing Step 12, the "Next" button should say "Review Your Application" and navigate to Step 13 (review).

8. Write unit tests for:
   - Step 12: date not in past validation, date within 30 days warning
   - All status fields accept only valid enum values

Run all tests. Verify all 12 steps work end-to-end in the dev server: you should be able to fill out every step, navigate forward and back, and see saved data persist.
```

---

## Step 10: Scoring Engine

```text
You are continuing work on the SP Issuer Readiness SvelteKit application. All 12 form steps are implemented.

Implement the deterministic scoring engine exactly as specified. This is a critical module - the scoring rules must match ISS-ACQ-05 precisely.

1. Create src/lib/scoring/engine.ts:

   Export a function: computeScore(applicationData: ApplicationData) => ScoringResult

   ScoringResult type:
   {
     totalScore: number (0-100)
     band: "qualified" | "qualified_with_reservations" | "not_qualified"
     criteria: {
       businessModel: number (0-20)
       fundingNeedAndUse: number (0-15)
       regulatoryReadiness: number (0-20)
       teamAndCapacity: number (0-15)
       budget: number (0-15)
       timeline: number (0-10)
       marketOpportunity: number (0-5)
     }
     flags: string[]
   }

2. Implement each scoring criterion as a separate pure function:

   scoreBusinessModel(company, fundamentals) => number (0-20):
   - Revenue generating: +10, Pre-revenue: +5
   - Paying customers described in assumptions/teamQualifications: +10 (or +5 for LOIs/pilots)
   - Years operating: 0=+0, 1=+2, 2=+4, 3+=+5
   - Cap at 20

   scoreFundingNeedAndUse(offering, fundamentals) => number (0-15):
   - Raise amount provided (raiseTargetUsd > 0): +5
   - Use of proceeds totals 100 and has descriptions: +5
   - Milestones/use narrative present (check useOfProceeds descriptions): +5

   scoreRegulatoryReadiness(regulatoryHistory) => number (0-20):
   - RULE: Any bad actor indicator = return 0
   - No bad actor indicators: +10
   - No regulatory orders: +5 (if orders exist, subtract 5 from total, floor at 0)
   - Prior raise experience: +3
   - Cap at 20

   scoreTeamAndCapacity(fundamentals, capacity) => number (0-15):
   - Key leadership identified (teamQualifications length > 200 chars): +5
   - Relevant qualifications described (qualitative check - presence of detail): +5
   - Time/capacity adequate (leadership capacity moderate or high AND 90-day support = true): +5

   scoreBudget(offering) => number (0-15):
   - raiseTargetUsd >= 500000: +15
   - raiseTargetUsd 250000-499999: +10
   - raiseTargetUsd 100000-249999: +5
   - raiseTargetUsd < 100000: +0

   scoreTimeline(timeline) => number (0-10):
   - 3_to_6_months: +10
   - 6_plus_months: +8
   - 1_to_3_months: +5
   - lt_30_days: +0
   - unknown: +3
   - understandsPreparationTime = true: +2 bonus
   - Cap at 10

   scoreMarketOpportunity(fundamentals) => number (0-5):
   - Market size/opportunity described (assumptions length > 150): +2
   - Competition/positioning addressed (check for keywords): +2
   - Evidence of validation (customers, LOIs, pilots mentioned): +1

3. Implement flag generation as a separate function:

   generateFlags(applicationData) => string[]:
   - badActorIndicators = true: push "bad_actor_indicator"
   - regulatoryOrders = true: push "regulatory_order_history"
   - useOfProceeds empty or doesn't sum to 100: push "unclear_use_of_proceeds"
   - principalReturn empty/null: push "no_return_mechanism"
   - timelineExpectation = "lt_30_days": push "launch_lt_30_days"
   - financialStatements = "none" AND cpa = "none": push "no_financials_and_no_cpa"
   - teamQualifications length < 100: push "weak_team_experience"
   - raiseTargetUsd < 100000: push "raise_below_minimum_economic_threshold"

4. Implement band determination:

   determineBand(totalScore) => string:
   - 70-100: "qualified"
   - 50-69: "qualified_with_reservations"
   - 0-49: "not_qualified"

5. The main computeScore function should:
   - Call each criterion scorer
   - Sum the criteria scores
   - Determine band
   - Generate flags
   - Return the complete ScoringResult

6. Write comprehensive unit tests in src/lib/scoring/engine.test.ts:
   - Test each criterion scorer independently with various inputs
   - Test the cap enforcement (no criterion exceeds its max)
   - Test bad actor indicator forces regulatory readiness to 0
   - Test regulatory orders subtract 5 with floor at 0
   - Test budget thresholds at exact boundaries ($100K, $250K, $500K)
   - Test timeline bonus capping at 10
   - Test flag generation for each flag condition
   - Test band determination at boundaries (49, 50, 69, 70)
   - Test a complete high-scoring application (expect 70+)
   - Test a complete low-scoring application (expect <50)
   - Test a mid-range application (expect 50-69)
   - Test with minimal/empty data (should produce low score, not crash)

Run all tests. This is the most test-critical module in the application.
```

---

## Step 11: Payload Normalization

```text
You are continuing work on the SP Issuer Readiness SvelteKit application. The scoring engine is implemented and tested.

Create the normalization module that transforms raw form data into the canonical submission payload.

1. Create src/lib/normalization/normalize.ts:

   Export function: normalizeApplication(rawFormData, applicationId, userId, utmParams, schemaVersion) => NormalizedPayload

   The function should:
   - Map raw form data fields to the canonical data model structure (Section 7 of the spec)
   - Convert all missing values to null (not empty strings)
   - Ensure currency fields are integers
   - Compute the readiness score using the scoring engine
   - Generate timestamps (updatedAt = now)
   - Include the applicationId, status, version
   - Include UTM parameters in the analytics section
   - Include consent fields

2. Create src/lib/normalization/ghlMapping.ts:

   Export function: mapToGhlFields(normalizedPayload) => GhlContactFields

   Map the normalized payload to GHL field keys as specified:
   - contact.issuer_readiness_score <- scoring.totalScore
   - contact.reg_path_target <- offering.exemptionTarget (human-readable label)
   - contact.lead_source <- "readiness-app"
   - contact.campaign_launch_date <- timeline.desiredLaunchDate
   - contact.consent_status <- consent.agreedToProcessing ? "Granted" : "Denied"
   - contact.company_legal_name <- company.legalName
   - contact.incorporation_state <- company.stateOfIncorporation
   - contact.industry <- company.industry
   - contact.company_website <- company.website
   - contact.security_type <- offering.securityType (human-readable label)
   - contact.min_raise <- offering.minimumRaiseUsd
   - contact.max_raise <- offering.maximumRaiseUsd
   - contact.application_id <- applicationId
   - contact.fundamentals_summary <- first 500 chars of concatenated fundamentals narratives
   - contact.application_status <- status
   - contact.linkedin_profile <- contact.linkedinUrl
   - contact.utm_source/campaign/medium <- analytics fields
   - contact.offering_interest <- offering.offeringDescription
   - opportunity.raise_target_usd <- offering.raiseTargetUsd
   - opportunity.exemption_type <- offering.exemptionTarget

   Export function: determineGhlTags(scoring) => string[]:
   - Always include "issuer_candidate" and "readiness-app-submitted"
   - score >= 80: add "highly_qualified"
   - score >= 70: add "issuer"
   - score < 50: add "needs-re-engagement"
   - flags includes "bad_actor_indicator": add "bad-actor-flag"

   Export function: determineGhlPipeline(scoring) => { pipelineId, stageId } | null:
   - score >= 70: return { pipelineId: GHL_PIPELINE_ID, stageId: GHL_DISCOVERY_STAGE_ID }
   - score 50-69: return { pipelineId: GHL_PIPELINE_ID, stageId: GHL_PROSPECTING_STAGE_ID }
   - score < 50: return null (no opportunity created)

3. Create src/lib/normalization/webhookPayload.ts:

   Export function: buildWebhookPayload(normalizedPayload, idempotencyKey, ghlFields, ghlTags, ghlPipeline) => WebhookPayload

   The webhook payload sent to n8n should include:
   - The full normalized application payload
   - The GHL field mapping
   - The tag array
   - The pipeline/stage info (or null)
   - The idempotency key
   - Source marker: "readiness-app"
   - Schema version

4. Write tests:
   - normalizeApplication converts empty strings to null
   - normalizeApplication includes scoring result
   - GHL mapping produces correct field keys
   - GHL tags are correct for each score band
   - GHL pipeline routing is correct at boundaries
   - Webhook payload includes all required fields
   - Edge case: minimal data normalizes without crashing

Run all tests.
```

---

## Step 12: Review Page and Score Display

```text
You are continuing work on the SP Issuer Readiness SvelteKit application. Scoring and normalization are implemented.

Build the Review & Submit page (Step 13) where users see their complete application summary, readiness score, and submit.

1. Create src/components/review/ReviewStep.svelte:
   - Display a read-only summary of all 12 steps' answers
   - Group by section with clear headings
   - Each section has an "Edit" button that navigates back to that step
   - Show formatted values (currency with $ and commas, dates formatted, enums as human-readable labels)

2. Create src/components/review/ScoreDisplay.svelte:
   - Takes the ScoringResult as a prop
   - Shows total score with a visual gauge/bar
   - Shows category breakdown as a table or card grid:
     Each criterion shows: name, score/max, a colored indicator (green/yellow/red)
   - Shows the user-facing band label:
     - qualified: "Strong preliminary fit"
     - qualified_with_reservations: "Possible fit with gaps to address"
     - not_qualified: "Early-stage; major gaps should be addressed first"
   - Shows any red flags in a warning section with plain-language explanations:
     - bad_actor_indicator: "Potential disqualification concern identified"
     - regulatory_order_history: "Regulatory history may require additional review"
     - unclear_use_of_proceeds: "Use of proceeds needs more detail"
     - no_return_mechanism: "Investor return mechanism not clearly defined"
     - launch_lt_30_days: "Timeline may be too aggressive"
     - no_financials_and_no_cpa: "Financial preparation appears incomplete"
     - weak_team_experience: "Team qualifications need more detail"
     - raise_below_minimum_economic_threshold: "Raise target may be below economic viability"
   - Disclaimer: "This is a preliminary self-assessment. SyndicatePath will conduct an independent review."

3. Create src/components/review/ConsentSection.svelte:
   - Contact information fields (collected here if not already):
     - Full Name (required)
     - Email (pre-filled from auth, required)
     - Phone (required)
     - Title (optional)
     - LinkedIn URL (optional)
   - Checkbox: "I consent to SyndicatePath processing the information I have provided for the purpose of evaluating readiness for capital raising services."
   - Checkbox: "I understand that this is a preliminary assessment tool, not a securities offering, and that no legal, investment, or financial advice has been provided."
   - Both checkboxes must be checked to enable Submit button

4. Wire the review page into the wizard (update Step 13 in the step config):
   - When the wizard reaches step 13, render ReviewStep + ScoreDisplay + ConsentSection
   - Compute the score from current form data and display it
   - The "Submit" button replaces "Next"
   - Track "review_viewed" analytics event

5. Create src/components/review/SectionSummary.svelte:
   - Reusable component that takes a section's data and renders it as labeled key-value pairs
   - Handles null values gracefully (shows "Not provided" in muted text)
   - Handles arrays (use of proceeds) as a formatted list/table

6. Write tests:
   - ScoreDisplay renders correct band label for each band
   - ScoreDisplay shows all flags with explanations
   - ConsentSection disables submit until both checkboxes checked
   - ReviewStep renders all sections

Run tests. Verify the review page looks correct in the dev server with sample data.
```

---

## Step 13: Submission Workflow

```text
You are continuing work on the SP Issuer Readiness SvelteKit application. The review page with score display and consent exists.

Implement the submission workflow with state machine, idempotency, and n8n integration.

1. Create src/routes/api/submit/+server.ts:

   POST handler:
   a. Validate the authenticated user owns the application
   b. Check application status is "draft" (reject if already submitted/pending)
   c. Run submission-level validation (cross-step checks from Section 8.3):
      - Use of proceeds total = 100
      - Consent checkboxes both true
      - Contact details complete
      - All required fields across all steps present
      If validation fails, return 400 with specific errors
   d. Normalize the payload using normalizeApplication()
   e. Compute final score
   f. Generate idempotency key (UUID)
   g. Set application status to "submit_pending" in D1
   h. Build the webhook payload using buildWebhookPayload()
   i. POST to n8n webhook URL (from env: N8N_WEBHOOK_URL)
      - Include N8N_WEBHOOK_SECRET in a header (e.g., x-webhook-secret)
      - Include idempotency key in a header
      - Set timeout (30 seconds)
   j. Handle n8n response:
      - If ok: true:
        - Set status to "submitted"
        - Store submittedAt timestamp
        - Store submission response in D1
        - Track "submission_succeeded" analytics event
        - Return { ok: true, applicationId, redirectTo: "/app/confirmation" }
      - If ok: false or HTTP error or timeout:
        - Set status to "submission_failed"
        - Store error details in D1 submission_response
        - Track "submission_failed" analytics event
        - Return { ok: false, error: "submission_failed", message: "We received your application but encountered a processing issue. Your data is saved. Please contact info@syndicatepath.com for assistance." }
   k. Track "submission_attempted" event at the start of the process

2. Update the wizard's submit button handler:
   - On click, show a loading state with "Submitting your application..."
   - POST to /api/submit with the applicationId
   - On success: redirect to /app/confirmation
   - On failure: show the error message, keep the user on the review page, data preserved
   - Disable double-click (button disabled while request in flight)

3. Create src/routes/(app)/app/confirmation/+page.svelte:
   - Show "Application Submitted Successfully" with checkmark
   - Display application ID
   - Display submitted timestamp
   - "What happens next" section:
     - "The SyndicatePath team will review your assessment"
     - "You will be contacted within X business days"
     - "If you have questions, contact info@syndicatepath.com"
   - "Download PDF Summary" button (calls /api/pdf, implemented in next step)
   - Link back to landing page

4. Create src/routes/(app)/app/confirmation/+page.server.ts:
   - Load the submitted application
   - Verify it is in "submitted" status
   - Return application data for display

5. Handle edge cases:
   - If user navigates to /app and their application is already submitted, redirect to confirmation
   - If application is in "submission_failed" status, show the review page with an error banner and a "Retry Submission" button
   - Retry button calls /api/submit again with the same application (idempotency key prevents duplicates)

6. Create src/lib/integrations/n8n.ts:
   - Export function: submitToN8n(webhookUrl, webhookSecret, payload, idempotencyKey) => Promise<N8nResponse>
   - Handles the HTTP POST, timeout, error wrapping
   - Returns typed response matching the n8n response contract

7. Write tests:
   - Submission rejects if application is not in "draft" status
   - Submission validates cross-step requirements
   - Submission sets status to "submit_pending" before calling n8n
   - Successful n8n response sets status to "submitted"
   - Failed n8n response sets status to "submission_failed"
   - Idempotency key is generated and stored
   - Double submission with same idempotency key is handled gracefully
   - Confirmation page loads for submitted applications
   - Failed application shows retry option

Run all tests. Verify the full flow in dev server: fill all 12 steps, review, submit (n8n will fail in dev - verify failure handling works gracefully).
```

---

## Step 14: PDF Generation

```text
You are continuing work on the SP Issuer Readiness SvelteKit application. The submission workflow is complete.

Implement server-side PDF generation for the readiness summary report.

1. Install a PDF generation library suitable for Cloudflare Workers:
   - Option A: jsPDF (works in Workers, generates PDFs client-side or server-side)
   - Option B: @react-pdf/renderer with a lightweight approach
   - Recommended: jsPDF for simplicity and Workers compatibility
   Install: npm install jspdf

2. Create src/lib/integrations/pdf.ts:

   Export function: generateReadinessReport(applicationData: NormalizedPayload) => Uint8Array

   The PDF should contain:
   a. Header:
      - "SyndicatePath" logo text (or image if available)
      - "Issuer Readiness Assessment Report"
      - Application ID
      - Submission date

   b. Applicant Information:
      - Contact name, email, phone, title
      - Company name, industry, state, entity type

   c. Offering Summary:
      - Security type, exemption target
      - Raise target, min, max
      - Offering description

   d. Readiness Score Summary:
      - Total score and band (user-facing label)
      - Category breakdown table:
        Criterion | Score | Maximum
      - Red flags listed (if any)

   e. Section Responses:
      - For each of the 12 sections, show the section title and all answers
      - Format use of proceeds as a table
      - Show enum values as human-readable labels

   f. Footer:
      - Disclaimer: "This is a preliminary self-assessment generated by the SyndicatePath Readiness Application. It does not constitute legal, financial, or investment advice. All assessments are subject to independent review by the SyndicatePath team."
      - Generated date and time

   File naming: SP-Readiness-{applicationId}-{YYYYMMDD}.pdf

3. Create src/routes/api/pdf/+server.ts:

   GET handler with query param: ?applicationId=xxx
   - Validate authenticated user owns the application
   - Verify application is in "submitted" status
   - Load the application data
   - Call generateReadinessReport()
   - Return the PDF with appropriate headers:
     Content-Type: application/pdf
     Content-Disposition: attachment; filename="SP-Readiness-{id}-{date}.pdf"

4. Wire the "Download PDF" button on the confirmation page to call /api/pdf?applicationId=xxx

5. Handle PDF generation failure gracefully:
   - If PDF fails, the submission is still valid
   - Show message: "PDF generation encountered an issue. Your application was submitted successfully. We'll email you the PDF shortly."

6. Write tests:
   - generateReadinessReport produces a non-empty Uint8Array
   - PDF endpoint returns 200 with correct content type for submitted applications
   - PDF endpoint returns 403 for applications the user doesn't own
   - PDF endpoint returns 400 for non-submitted applications

Run all tests. Verify PDF download works in the dev server.
```

---

## Step 15: Analytics Event Tracking

```text
You are continuing work on the SP Issuer Readiness SvelteKit application. PDF generation is working.

Complete the analytics event tracking system. Some events were wired in earlier steps. This step ensures all 11 events from the spec are captured consistently.

1. Review and update src/lib/integrations/analytics.ts:

   The trackEvent function should accept:
   {
     eventType: string (one of the 11 defined events)
     applicationId?: string
     userId?: string
     stepId?: number
     metadata?: Record<string, any>
     appVersion: string
     utmSource?: string
     utmMedium?: string
     utmCampaign?: string
   }

   Client-side: POST to /api/analytics
   Server-side: call repository directly

2. Update src/routes/api/analytics/+server.ts:
   - Accept event payload
   - Validate event type is one of the allowed types
   - Insert into analytics_events table
   - Return 201
   - Do not block the user flow on analytics failure (fire and forget from client)

3. Audit all existing event tracking and add missing events:

   Already wired (verify):
   - landing_viewed (Step 5: landing page)
   - step_completed (Steps 7-9: form steps)
   - draft_saved (Step 6: wizard save)
   - submission_attempted (Step 13: submit endpoint)
   - submission_succeeded (Step 13: submit endpoint)
   - submission_failed (Step 13: submit endpoint)
   - review_viewed (Step 12: review page)

   Add now:
   - account_created: fire in auth/login action when a new user is created
   - application_started: fire when the first step is completed (step 1, first time)

   Phase 2 events (create constants but don't wire yet):
   - ai_opened
   - ai_suggestion_applied

4. Create src/lib/integrations/analytics-constants.ts:
   - Export enum or const object with all event types
   - Export event payload type

5. UTM parameter capture:
   - On landing page load, read utm_source, utm_medium, utm_campaign from URL query params
   - Store in a cookie or pass through the auth flow
   - Attach to the application record on creation
   - Include in all analytics events for that session

6. Write tests:
   - Analytics endpoint accepts valid events
   - Analytics endpoint rejects invalid event types
   - UTM params are captured and stored with application
   - All 9 Phase 1 events are fired at the correct points (integration test)

Run all tests. Verify analytics events are being recorded in D1 by checking the analytics_events table after a full flow.
```

---

## Step 16: Error Handling and Observability

```text
You are continuing work on the SP Issuer Readiness SvelteKit application. Analytics tracking is complete.

Implement comprehensive error handling UX and server-side observability.

1. Create src/lib/server/logger.ts:
   - Simple structured logger that outputs JSON
   - Fields: timestamp, level (info/warn/error), message, requestId, applicationId, context
   - In production, logs go to stdout (Cloudflare Workers logging)
   - Never log full application payloads, API secrets, or raw PII
   - Log: auth failures, draft save failures, submission attempts/results, PDF generation failures, AI endpoint failures (Phase 2)

2. Create request ID middleware in src/hooks.server.ts:
   - Generate a requestId (UUID) for each incoming request
   - Attach to event.locals
   - Include in all log entries for that request
   - Return as x-request-id response header

3. Create src/components/layout/ErrorBanner.svelte:
   - A dismissable error banner component
   - Props: message, type (error/warning/info), dismissable
   - Appears at the top of the page content area

4. Create src/components/layout/SaveIndicator.svelte:
   - Shows autosave status: "Saving..." / "All changes saved" / "Save failed - click to retry"
   - Lives in the form wizard header area
   - On failure, shows warning and retry button
   - Does not block user from continuing to type

5. Update error handling across the app:

   a. Autosave failure (src/lib/integrations/autosave.ts):
      - On failure, update SaveIndicator to show warning
      - Allow retry
      - Do not lose form data (keep in memory)

   b. Submission failure (already in Step 13):
      - Verify error banner appears on review page
      - Verify retry button works

   c. Auth failure:
      - If session expires mid-form, show banner: "Your session has expired. Your progress is saved. Please log in again to continue."
      - Redirect to login with a returnTo parameter

   d. PDF failure (already in Step 14):
      - Verify graceful message on confirmation page

   e. General server errors:
      - Create src/routes/+error.svelte with SP-branded error page
      - Show friendly message, request ID for support reference
      - "Contact info@syndicatepath.com if this persists"

6. Create a server-side error handler in hooks.server.ts:
   - Catch unhandled errors
   - Log with requestId and context
   - Return generic error to client (never expose stack traces)

7. Write tests:
   - ErrorBanner renders and dismisses correctly
   - SaveIndicator shows correct states
   - Error page renders with request ID
   - Logger does not include PII in output

Run all tests. Verify error states in the dev server by simulating failures.
```

---

## Step 17: Branding and Responsive Design Polish

```text
You are continuing work on the SP Issuer Readiness SvelteKit application. Core functionality is complete.

Polish the visual design, branding, and responsive behavior.

1. Define SP brand design tokens in src/app.css (or Tailwind config):
   CSS custom properties:
   --sp-navy: #1a2744 (primary dark)
   --sp-gold: #c8a951 (accent)
   --sp-white: #ffffff
   --sp-light-gray: #f5f6f8
   --sp-medium-gray: #6b7280
   --sp-dark-text: #1f2937
   --sp-success: #059669
   --sp-warning: #d97706
   --sp-error: #dc2626
   --sp-font: 'Inter', system-ui, sans-serif

   Add these to Tailwind's theme extend configuration.

2. Update Header component:
   - Desktop: SP logo (text "SyndicatePath" in navy with gold accent bar) | nav spacer | user email + logout
   - Mobile: SP logo | hamburger menu with user info and logout
   - Sticky header

3. Update Footer component:
   - Three-column on desktop (About SP | Legal links | Contact)
   - Stacked on mobile
   - Muted colors, small text
   - Include: "Copyright 2026 Miventure Inc. dba SyndicatePath" and disclaimer

4. Update Landing Page:
   - Hero section with navy background, white text, gold CTA button
   - "What to Expect" section with 4 icon cards (step count, time estimate, save/resume, score)
   - Responsive: single column on mobile, 2-column on tablet+

5. Update Form Wizard:
   - Progress bar: navy track, gold fill, white step numbers
   - Step container: white card with subtle shadow on light gray background
   - Form fields: clean borders, focused state with gold highlight
   - Buttons: gold primary, navy secondary, disabled state muted
   - Error states: red border, red text below field
   - Help text: medium gray, slightly smaller font

6. Update Review Page:
   - Score gauge: circular or horizontal bar with color coding (green/yellow/red)
   - Section summaries in alternating white/light-gray rows
   - Edit buttons styled as subtle links
   - Consent section with clear checkbox styling
   - Submit button prominent, gold with navy text

7. Update Confirmation Page:
   - Success checkmark icon (green)
   - Clean card layout
   - PDF download button styled as secondary action

8. Responsive behavior audit:
   - All pages render correctly at: 375px (mobile), 768px (tablet), 1024px (desktop), 1440px (wide)
   - Form fields stack vertically on mobile
   - Progress bar collapses to minimal on mobile
   - Navigation buttons are full-width on mobile
   - Review page sections are scrollable cards on mobile

9. Accessibility check:
   - All interactive elements have visible focus states (gold outline)
   - Color contrast meets WCAG AA (4.5:1 for text, 3:1 for large text)
   - Form labels are properly associated
   - Progress bar has aria attributes
   - Error messages have role="alert"

No new functionality. This step is visual polish only. Do not change any logic or data flow.

Verify in dev server across multiple viewport sizes.
```

---

## Step 18: End-to-End Testing and Pre-Deploy Verification

```text
You are continuing work on the SP Issuer Readiness SvelteKit application. All features are implemented and styled.

Write end-to-end tests and perform pre-deployment verification.

1. Create Playwright E2E tests in tests/:

   test: happy-path.spec.ts
   - Navigate to landing page
   - Click CTA
   - Create account (login flow)
   - Complete all 12 steps with valid data
   - Verify progress bar advances
   - Reach review page
   - Verify score is displayed
   - Check both consent boxes
   - Submit (mock n8n webhook to return success)
   - Verify confirmation page shows
   - Verify PDF download link works

   test: bad-actor-flag.spec.ts
   - Complete steps 1-2 with bad actor = Yes
   - Complete remaining steps
   - Reach review page
   - Verify regulatory readiness score is 0
   - Verify bad_actor_indicator flag is displayed
   - Submit and verify success

   test: draft-resume.spec.ts
   - Log in and complete steps 1-3
   - Close browser / navigate away
   - Log in again
   - Verify form resumes at step 4 with steps 1-3 data preserved

   test: validation.spec.ts
   - Try to proceed from step 1 without filling required fields
   - Verify error messages appear
   - Verify cannot proceed until valid
   - On step 4, verify use of proceeds must sum to 100

   test: submission-failure.spec.ts
   - Complete all steps
   - Mock n8n to return failure
   - Verify error message on review page
   - Verify retry button appears
   - Mock n8n to return success on retry
   - Verify confirmation page

   test: mobile-navigation.spec.ts
   - Set viewport to mobile (375x812)
   - Navigate through steps 1-3
   - Verify buttons and fields are usable
   - Verify progress bar is visible

2. Create a test helper: tests/helpers.ts
   - Function to fill each step with valid test data
   - Function to mock n8n webhook responses
   - Function to set up test database
   - Reusable selectors for common elements

3. Verify all unit tests pass: npm run test

4. Verify all E2E tests pass: npx playwright test

5. Create a pre-deploy checklist verification script (or document):
   - All environment variables documented in wrangler.toml
   - No hardcoded secrets in source
   - All 12 acceptance criteria from the spec verified:
     1. Account creation + draft resume: covered by draft-resume test
     2. 12-step completion with validation: covered by happy-path + validation tests
     3. Use of proceeds sum to 100: covered by validation test
     4. Deterministic scoring: covered by scoring unit tests + happy-path
     5. Idempotency: covered by unit tests on submit endpoint
     6. n8n payload submission: covered by happy-path test
     7. GHL routing correct: covered by normalization unit tests
     8. PDF generation: covered by happy-path test
     9. Submission failure handling: covered by submission-failure test
     10. Analytics events recorded: covered by analytics unit tests
     11. AI cannot silently write data: N/A Phase 1 (no AI)
     12. Disclaimers present: verify in happy-path test

6. Build the production bundle: npm run build
   - Verify no build errors
   - Verify bundle size is reasonable

Run all tests. Output the test results summary.
```

---

## Summary of Steps

| Step | Description | Builds On | Key Output |
|------|------------|-----------|------------|
| 1 | Project Scaffolding | - | SvelteKit project, directory structure, health check |
| 2 | Zod Schemas | 1 | Canonical data model, per-step schemas, unit tests |
| 3 | D1 Database | 1, 2 | Tables, migrations, repository functions |
| 4 | Authentication | 3 | Magic link flow, sessions, auth hook |
| 5 | Landing Page | 4 | Public landing, layout shell, first analytics event |
| 6 | Wizard Shell | 4, 5 | Progress bar, navigation, auto-save, placeholder steps |
| 7 | Steps 1-4 | 2, 6 | Company, Regulatory, Offering, Use of Proceeds forms |
| 8 | Steps 5-8 | 7 | Financial, Team, Market, Investor Returns forms |
| 9 | Steps 9-12 | 8 | Documentation, Professional Team, Capacity, Timeline forms |
| 10 | Scoring Engine | 2 | Deterministic scoring with comprehensive tests |
| 11 | Normalization | 2, 10 | Payload normalization, GHL mapping, webhook builder |
| 12 | Review Page | 9, 10, 11 | Review summary, score display, consent |
| 13 | Submission | 11, 12 | State machine, n8n integration, confirmation |
| 14 | PDF Generation | 13 | Server-side PDF export |
| 15 | Analytics | 13 | Complete event tracking, UTM capture |
| 16 | Error Handling | All | Error UX, logging, observability |
| 17 | Branding | All | Visual polish, responsive design, accessibility |
| 18 | E2E Testing | All | Playwright tests, pre-deploy verification |

---

*Generated from SPECIFICATION.md v2.0 via VibeCode Phase 3 Roadmap Generation.*
