# SP Issuer Readiness App — Manual E2E Test Checklist

**URL:** https://readiness.syndicatepath.com  
**Last updated:** 2026-05-09  
**Estimated time:** 45-60 minutes  
**Tester:** _______________  **Date run:** _______________

---

## Before You Start

- Use a real email address you can receive mail at (Gmail or personal -- not @mastersradio.com Google Workspace, which may scan links)
- Have a second browser tab open to check email for OTP codes
- Mark each item ✅ Pass, ❌ Fail (note what happened), or ⏭ Skip

---

## 1. Authentication Flow

### 1.1 Login — Happy Path
- [ ] Navigate to https://readiness.syndicatepath.com
- [ ] Landing page loads; "Start Your Assessment" or login prompt appears
- [ ] Enter your email address and submit
- [ ] Receive email with 6-digit code within 60 seconds
- [ ] Enter the 6-digit code on the verify page
- [ ] Redirected to `/app` with the form at Step 1

### 1.2 OTP Edge Cases
- [ ] Enter wrong code → error message appears, attempts counter shown (e.g. "4 attempts remaining")
- [ ] Enter correct code after a wrong attempt → login succeeds
- [ ] Leave code blank, submit → appropriate validation error shown
- [ ] Enter 5 wrong codes → account locked message (429) with instructions

### 1.3 Save-and-Return
- [ ] Complete Steps 1-3, then close the browser tab
- [ ] Navigate back to https://readiness.syndicatepath.com
- [ ] Log in again with your email + new OTP code
- [ ] Verify form resumes at the step where you left off with data intact

---

## 2. Step-by-Step Form Validation

### Step 1 — Company Information
**Fields:** Legal name, entity type, state of incorporation, industry, years operating, revenue status, website (optional)

- [ ] Click Next without filling anything → validation errors appear for required fields
- [ ] Fill all required fields with valid data:
  - Legal name: "Acme Ventures LLC"
  - Entity type: LLC
  - State: Virginia
  - Industry: Technology
  - Years operating: 3
  - Revenue status: Pre-revenue
- [ ] Click Next → advances to Step 2
- [ ] Click Back from Step 2 → returns to Step 1 with data still populated

### Step 2 — Regulatory History
**C&DI 100.03 (platform switching) and C&DI 100.04 (Exchange Act reporter)**

- [ ] Answer all questions "No/None" and advance to Step 3 (clean baseline)

**C&DI 100.03 gate — blocked:**
- [ ] Start a new test session (or use a second email)
- [ ] Step 2: "Active Reg CF offering on another portal?" → Yes
- [ ] "Have any sales closed on that offering?" → Yes
- [ ] Expect: gate message preventing advancement (cannot switch portals after sales close)

**C&DI 100.04 gate — disqualified:**
- [ ] Step 2: "Former Exchange Act reporting company?" → Yes
- [ ] "Has reporting obligation been terminated?" → No
- [ ] Expect: disqualification notice (cannot raise under Reg CF while Exchange Act reporting is still active)

**C&DI 100.04 — passes if terminated:**
- [ ] Same as above but "Has reporting obligation been terminated?" → Yes + enter termination date
- [ ] Expect: allowed to proceed

### Step 3 — Offering Structure
**Fields:** Security type, exemption target, raise target, investor limit, C&DI 100.06 disclosure**

- [ ] Select security type (e.g. Equity) and exemption (Reg CF)
- [ ] Enter raise target (e.g. $500,000)
- [ ] C&DI 100.06 disclosure row: verify income definition language is visible to the user (calendar-year definition)
- [ ] Advance to Step 4

**C&DI 100.05 — rolling cap:**
- [ ] If Step 2 included prior Reg CF closings: verify the form shows the rolling 12-month cap calculation based on closing date anchor (not Jan 1)

### Step 4 — Use of Proceeds
**Validation: ≥2 categories, must sum to exactly 100%, ≥1 description**

- [ ] Add one category at 100% → error (must be ≥2 categories)
- [ ] Add two categories that sum to 90% → error ("currently 90%")
- [ ] Add two categories summing to 100%, no descriptions → error (at least one description required)
- [ ] Valid: two categories summing to 100%, one with description → advances

### Step 5 — Financial Condition
**C&DI 201.03: Stale financials gate (fiscal year-end >120 days ago)**

- [ ] "Do you have financial projections?" → Yes → summary field appears and requires ≥50 characters
- [ ] "Do you have financial projections?" → No → summary field hidden

**C&DI 201.03 gate:**
- [ ] Enter a fiscal year-end date that is >120 days ago (e.g. 2025-01-01)
- [ ] Expect: stale financials warning/gate message indicating updated financials may be required before launch

**C&DI 201.03 — passes:**
- [ ] Enter fiscal year-end within 120 days (e.g. 2026-01-01) → no gate message

### Step 6 — Team & Qualifications
- [ ] Leave blank, click Next → error (minimum 100 characters required)
- [ ] Enter fewer than 100 characters → error with character count indicator
- [ ] Enter ≥100 characters → advances

### Step 7 — Market & Validation
- [ ] Same as Step 6: ≥100 characters required
- [ ] Validation error shown for short input

### Step 8 — Investor Returns
**Fields:** What investors receive, principal return mechanism, total consideration**

- [ ] Leave all blank, click Next → validation errors on required fields
- [ ] Fill all fields with meaningful text → advances

### Step 9 — Documentation Status
- [ ] Verify checkboxes/selects for business plan, pitch deck status
- [ ] No required fields block — should advance with any selection

### Step 10 — Professional Team
**Fields:** Attorney status, CPA status, marketing support**

- [ ] Verify all options selectable (none / in talks / retained)
- [ ] Advances without blocking (advisory, not gate)

### Step 11 — Capacity & Resources
- [ ] Fill out all capacity questions
- [ ] Advances without blocking

### Step 12 — Timeline & Awareness
- [ ] Select timeline expectation
- [ ] Advances to Step 13 (Review)

---

## 3. Step 13 — Review & Submit

- [ ] Review page displays a summary of all 12 steps
- [ ] All answers from Steps 1-12 are visible
- [ ] Preliminary score is shown with band label (Qualified / Qualified with Reservations / Not Yet Qualified)
- [ ] Consent checkboxes present ("I agree to processing" and disclaimers)
- [ ] Cannot submit without checking both consent boxes → validation error
- [ ] With consent checked, click Submit → spinner/loading state appears
- [ ] After submit: redirected to `/app/confirmation`
- [ ] Confirmation page shows: score, band, submission date, contact email (services@syndicatepath.com)

---

## 4. Post-Submission Verification

### Issuer Email
- [ ] Check the email used to register
- [ ] Receive submission confirmation email from SyndicatePath
- [ ] Email includes score, band, and next steps language
- [ ] Email is well-formatted (no broken HTML, no raw code visible)

### SP Internal Notification
- [ ] Check info@syndicatepath.com (or configured notification address)
- [ ] Receive SP team notification with: applicant name, company, raise target, score, band, submission date

### GHL Contact + Opportunity
- [ ] In SP GHL (SyndicatePath location), search for the test email
- [ ] Contact exists with correct: name, email, company name, tags (issuer-application + band tag + score tag)
- [ ] Custom fields populated: readiness score, band, security type, raise target, state, industry, application ID, contact role = Issuer
- [ ] Opportunity exists in pipeline "Issuer Lifecycle" at correct stage:
  - Qualified (score >= 70) → Discovery stage
  - Qualified with Reservations (50-69) → Prospecting stage
  - Not Currently Qualified (<50 or CRITICAL flag) → no opportunity created
- [ ] Opportunity value = raise target amount from form

---

## 5. AI Chat Assistant

- [ ] From any form step, open the chat drawer (FAB button)
- [ ] Type a question (e.g. "What does Reg CF mean?")
- [ ] Response appears within 10 seconds
- [ ] Response is coherent and relevant to the question
- [ ] Inline advisor hints visible on each step (contextual guidance text)

---

## 6. Gap Analysis Download

- [ ] From the review page or confirmation page, click "Download Gap Analysis"
- [ ] .docx file downloads successfully
- [ ] Open the file: contains structured gap analysis with score, band, and improvement recommendations
- [ ] No broken formatting or empty sections

---

## 7. Re-submission Blocked

- [ ] After submitting, navigate back to `/app`
- [ ] Verify user is redirected to `/app/confirmation` (cannot re-edit a submitted application)
- [ ] Verify "Application already submitted" if API is called again (409 response)

---

## 8. Scoring Spot-Check

Use this profile and verify the score matches expectations:

| Field | Value |
|-------|-------|
| Entity type | LLC |
| Years operating | 3 |
| Revenue status | Pre-revenue |
| Has attorney | Yes (retained) |
| Has CPA | Yes (retained) |
| Has projections | Yes |
| Prior Reg CF | None |
| Bad actor | None |
| Documentation | Business plan exists, no pitch deck |

- [ ] Score is in the 50-75 range for this profile
- [ ] Band shows "Qualified with Reservations" (pre-revenue with team but limited docs)

---

## Issues Found

| # | Step | Description | Severity |
|---|------|-------------|----------|
| 1 | | | |
| 2 | | | |

---

## Sign-off

- [ ] All Happy Path tests passed
- [ ] All C&DI gate tests passed (100.03, 100.04, 201.03)
- [ ] GHL contact + opportunity verified in production CRM
- [ ] Emails verified (issuer confirmation + SP notification)

**Tester sign-off:** _______________  **Date:** _______________
