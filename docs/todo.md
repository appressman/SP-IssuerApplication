# SP Issuer Readiness Application - Build Checklist

## Phase 1: MVP

### Step 1: Project Scaffolding
- [ ] Initialize SvelteKit project with TypeScript
- [ ] Install dependencies (superforms, zod, tailwindcss, adapter-cloudflare, wrangler, uuid)
- [ ] Install dev dependencies (vitest, testing-library/svelte, playwright)
- [ ] Configure adapter-cloudflare in svelte.config.js
- [ ] Create wrangler.toml with D1 binding and env var placeholders
- [ ] Create .dev.vars (gitignored) with local dev values
- [ ] Set up directory structure (schemas, scoring, normalization, validation, integrations, server, components, routes)
- [ ] Create root layout with Tailwind CSS and SP branding shell
- [ ] Create /api/health endpoint
- [ ] Write health endpoint test
- [ ] Verify dev server starts

### Step 2: Zod Schemas
- [ ] Create application.ts (master schema with status, timestamps, version)
- [ ] Create contact.ts
- [ ] Create company.ts
- [ ] Create regulatory.ts (with conditional refinements)
- [ ] Create offering.ts (with max >= min refinement)
- [ ] Create fundamentals.ts (useOfProceeds sum=100 refinement)
- [ ] Create readiness.ts
- [ ] Create timeline.ts (date not in past refinement)
- [ ] Create consent.ts (literal true)
- [ ] Create analytics.ts
- [ ] Create index.ts (combined fullApplicationSchema + TypeScript type export)
- [ ] Create stepSchemas.ts (per-step partial schemas)
- [ ] Write unit tests for all schemas
- [ ] All schema tests pass

### Step 3: D1 Database
- [ ] Create migrations/0001_initial_schema.sql (users, magic_links, sessions, applications, analytics_events)
- [ ] Create indexes
- [ ] Create src/lib/server/db.ts (D1 binding helper)
- [ ] Create users repository (create, getByEmail, getById, updateLastLogin)
- [ ] Create applications repository (create, get, getByUserId, updateFormData, updateStatus, updateScoringSnapshot, setSubmitted)
- [ ] Create analytics repository (trackEvent)
- [ ] Update wrangler.toml migration directory
- [ ] Write repository tests
- [ ] All repository tests pass

### Step 4: Authentication
- [ ] Create src/lib/server/auth.ts (generateMagicLink, verifyMagicLink, validateSession, destroySession)
- [ ] Create src/lib/server/email.ts (sendMagicLinkEmail - console log in dev)
- [ ] Create /auth/login page and form action
- [ ] Create /auth/verify endpoint (token validation, session cookie, redirect)
- [ ] Create /auth/logout endpoint
- [ ] Create hooks.server.ts (session validation, route protection)
- [ ] Create (app)/+layout.server.ts (user loading, auth redirect)
- [ ] Update src/app.d.ts (App.Locals, App.Platform types)
- [ ] Write auth tests
- [ ] All auth tests pass
- [ ] Verify login flow in dev server

### Step 5: Landing Page
- [ ] Create landing page (+page.svelte) with SP branding
- [ ] Create +page.server.ts (isLoggedIn check)
- [ ] Create Header.svelte component
- [ ] Create Footer.svelte component
- [ ] Update root +layout.svelte with Header/Footer
- [ ] Create root +layout.server.ts (user info pass-through)
- [ ] Style landing page (responsive, professional)
- [ ] Add disclaimers section
- [ ] Wire landing_viewed analytics event
- [ ] Create /api/analytics endpoint
- [ ] Verify landing page renders on desktop and mobile

### Step 6: Form Wizard Shell
- [ ] Create (app)/+layout.svelte with progress bar area
- [ ] Create ProgressBar.svelte (accessible, responsive)
- [ ] Create StepNavigation.svelte (Previous/Next/Save/Review buttons)
- [ ] Create wizard controller (+page.server.ts - load/create application)
- [ ] Create wizard page (+page.svelte - dynamic step rendering)
- [ ] Create /api/draft endpoint (save form data)
- [ ] Create placeholder Step1-12.svelte and ReviewStep.svelte
- [ ] Create stepConfig.ts (step metadata array)
- [ ] Create autosave.ts (debounced save)
- [ ] Write wizard tests
- [ ] Verify navigation through placeholder steps

### Step 7: Form Steps 1-4
- [ ] Create FormField.svelte wrapper component
- [ ] Create CurrencyInput.svelte component
- [ ] Implement Step 1 - Company Information (all fields, validation)
- [ ] Implement Step 2 - Regulatory History (conditional fields, bad actor warning)
- [ ] Implement Step 3 - Offering Structure (conditional security type, raise validation)
- [ ] Implement Step 4 - Use of Proceeds (dynamic rows, running total, sum=100)
- [ ] Wire all steps to Superforms with Zod schemas
- [ ] Track step_completed events
- [ ] Write step 1-4 unit tests
- [ ] All tests pass
- [ ] Verify steps 1-4 in dev server

### Step 8: Form Steps 5-8
- [ ] Implement Step 5 - Financial Condition (conditional projections)
- [ ] Implement Step 6 - Team & Qualifications (min length, char count)
- [ ] Implement Step 7 - Market & Validation (min length, evidence prompts)
- [ ] Implement Step 8 - Investor Returns (security-type-adaptive help text, disclaimer)
- [ ] Wire to Superforms, track events
- [ ] Write step 5-8 unit tests
- [ ] All tests pass

### Step 9: Form Steps 9-12
- [ ] Implement Step 9 - Documentation Status
- [ ] Implement Step 10 - Professional Team
- [ ] Implement Step 11 - Capacity & Resources (90-day campaign question)
- [ ] Implement Step 12 - Timeline & Awareness (date validation, <30 day warning)
- [ ] Wire to Superforms, track events
- [ ] Step 12 "Next" becomes "Review Your Application"
- [ ] Write step 9-12 unit tests
- [ ] All tests pass
- [ ] Verify all 12 steps end-to-end

### Step 10: Scoring Engine
- [ ] Create src/lib/scoring/engine.ts
- [ ] Implement scoreBusinessModel (0-20, cap enforced)
- [ ] Implement scoreFundingNeedAndUse (0-15)
- [ ] Implement scoreRegulatoryReadiness (0-20, bad actor = 0 rule)
- [ ] Implement scoreTeamAndCapacity (0-15)
- [ ] Implement scoreBudget (0-15, threshold boundaries)
- [ ] Implement scoreTimeline (0-10, bonus capped)
- [ ] Implement scoreMarketOpportunity (0-5)
- [ ] Implement generateFlags (8 flag types)
- [ ] Implement determineBand (70/50 thresholds)
- [ ] Implement computeScore (main function)
- [ ] Write comprehensive scoring tests (edge cases, boundaries, complete scenarios)
- [ ] All scoring tests pass

### Step 11: Payload Normalization
- [ ] Create normalize.ts (raw form data to canonical payload)
- [ ] Create ghlMapping.ts (GHL field mapping, tags, pipeline routing)
- [ ] Create webhookPayload.ts (full n8n payload builder)
- [ ] Write normalization tests
- [ ] Write GHL mapping tests (field keys, tag logic, pipeline routing at boundaries)
- [ ] Write webhook payload tests
- [ ] All tests pass

### Step 12: Review Page
- [ ] Create ReviewStep.svelte (read-only summary, edit buttons)
- [ ] Create ScoreDisplay.svelte (gauge, breakdown, user-facing labels, flags)
- [ ] Create ConsentSection.svelte (contact fields, two checkboxes, submit gate)
- [ ] Create SectionSummary.svelte (reusable key-value display)
- [ ] Wire review as Step 13 in wizard
- [ ] Track review_viewed event
- [ ] Write review component tests
- [ ] All tests pass

### Step 13: Submission Workflow
- [ ] Create /api/submit endpoint (validation, normalize, score, n8n POST)
- [ ] Implement submission state machine (draft > submit_pending > submitted/failed)
- [ ] Implement idempotency key generation and storage
- [ ] Create n8n.ts integration module
- [ ] Handle n8n success (submitted status, timestamp, response storage)
- [ ] Handle n8n failure (submission_failed status, error message, retry)
- [ ] Create confirmation page (/app/confirmation)
- [ ] Handle submitted application redirect
- [ ] Handle submission_failed state (retry button)
- [ ] Track submission analytics events
- [ ] Write submission tests (success, failure, idempotency, double-submit)
- [ ] All tests pass

### Step 14: PDF Generation
- [ ] Install jsPDF
- [ ] Create pdf.ts (generateReadinessReport function)
- [ ] PDF includes: header, contact, company, offering, score, all sections, disclaimer
- [ ] Create /api/pdf endpoint (auth check, status check, generate, return)
- [ ] Wire PDF download button on confirmation page
- [ ] Handle PDF failure gracefully
- [ ] Write PDF tests
- [ ] All tests pass

### Step 15: Analytics Completion
- [ ] Verify all 9 Phase 1 events are tracked
- [ ] Add account_created event to auth flow
- [ ] Add application_started event to first step completion
- [ ] Create analytics-constants.ts (event type enum)
- [ ] Implement UTM parameter capture from landing page URL
- [ ] Store UTM params with application
- [ ] Write analytics tests
- [ ] All tests pass

### Step 16: Error Handling & Observability
- [ ] Create logger.ts (structured JSON, no PII)
- [ ] Add requestId generation to hooks.server.ts
- [ ] Create ErrorBanner.svelte component
- [ ] Create SaveIndicator.svelte component
- [ ] Handle autosave failure (warning, retry)
- [ ] Handle session expiry (banner, redirect with returnTo)
- [ ] Create +error.svelte (branded error page with requestId)
- [ ] Add server-side error handler to hooks
- [ ] Write error handling tests
- [ ] All tests pass

### Step 17: Branding & Responsive Design
- [ ] Define SP brand design tokens (CSS custom properties)
- [ ] Update Header (desktop + mobile layouts)
- [ ] Update Footer (three-column desktop, stacked mobile)
- [ ] Style Landing Page (hero, cards, CTA)
- [ ] Style Form Wizard (progress bar, step cards, fields, buttons)
- [ ] Style Review Page (score gauge, section rows, consent)
- [ ] Style Confirmation Page
- [ ] Responsive audit: 375px, 768px, 1024px, 1440px
- [ ] Accessibility check: focus states, contrast, labels, aria

### Step 18: E2E Testing & Pre-Deploy
- [ ] Create test helpers (step fillers, mocks, selectors)
- [ ] Write happy-path.spec.ts
- [ ] Write bad-actor-flag.spec.ts
- [ ] Write draft-resume.spec.ts
- [ ] Write validation.spec.ts
- [ ] Write submission-failure.spec.ts
- [ ] Write mobile-navigation.spec.ts
- [ ] All unit tests pass
- [ ] All E2E tests pass
- [ ] Production build succeeds (npm run build)
- [ ] Bundle size is reasonable
- [ ] No hardcoded secrets in source
- [ ] All 12 acceptance criteria verified

---

## Phase 2: AI Chat Assist (Future)
- [ ] Create AI chat panel component
- [ ] Create Cloudflare Worker proxy for Claude Haiku
- [ ] Create per-section system prompts
- [ ] Implement suggestion preview + "Fill in my answer" flow
- [ ] Add AI guardrails (no auto-fill, no legal claims)
- [ ] Add rate limiting
- [ ] Track ai_opened and ai_suggestion_applied events
- [ ] AI logging (section, timestamp, cost, applied)

## Phase 3: Operational Refinement (Future)
- [ ] ClickUp ISS-ACQ-05 integration via n8n
- [ ] Abandonment detection (cold-lead tag after 14 days)
- [ ] Advanced analytics queries
- [ ] Scoring refinement based on pipeline outcomes
- [ ] Email nudge for stale drafts

---

## GHL Setup (One-Time, Before Launch)
- [ ] Create 10 new custom fields in GHL (Section 11.1 of spec)
- [ ] Create 3 new tags in GHL (readiness-app-submitted, readiness-app-started, bad-actor-flag)
- [ ] Configure n8n webhook workflow for issuer-application endpoint
- [ ] Set up readiness.syndicatepath.com subdomain
- [ ] Configure Cloudflare Pages deployment
- [ ] Set production environment variables in Cloudflare dashboard
- [ ] Run D1 migration on production database
