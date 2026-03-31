# SP-IssuerApplication Project Context

## Project Overview

**Name:** SyndicatePath Issuer Application
**Type:** AI-Guided Prequalification Interview
**Parent Project:** SyndicatePath (SP)
**Status:** Design Phase

---

## Purpose

An AI-guided interview application that helps prospective issuers evaluate their readiness to raise capital through Regulation Crowdfunding or other securities offerings. The system asks structured questions, provides educational context, and generates a preliminary assessment.

---

## Key Files

| File | Purpose |
|------|---------|
| `README.md` | Complete project documentation and interview framework |
| `prompts/system-prompt.md` | GPT system prompt for the AI interviewer |
| `schemas/application-schema.json` | JSON schema for application data structure |

---

## The Seven Fundamental Questions

These are the core questions every issuer must answer:

1. **What do we want from investors?**
2. **What will we do with the money we get from them?**
3. **When will they get their principal back?**
4. **What will they get in consideration and when?**
5. **What are the projected expenses and incomes to support the plan above?**
6. **How and why are we sure we're the right people to deliver?**
7. **What are the assumptions and how gleaned and validated?**

---

## Reference Sources

### SPPX Onboarding Survey
- URL: https://forms.sppx.io/onboarding-survey/
- 7-page form covering: company details, offering type, financials, timeline, professional team, website
- Used as reference for additional questions and structure

### Reg CF Launch Timeline Template
- File: `Reg-CF Issuer Launch Task List & Timeline Template_60 days.xlsx`
- Google Drive ID: `19P6fcFPDFnVDY3kIFSakStKIxdVVnqrJ`
- Location: SyndicatePath Google Drive
- Provides 60-day task breakdown for Reg CF launches

---

## Integration Points

### GoHighLevel (GHL)
- Create contacts on application submission
- Add to Issuer Intake pipeline
- Tag based on readiness score
- **MCP:** `ghl-syndicatepath`

### Google Drive
- Store application summaries
- Archive detailed responses
- **MCP:** `google-workspace-syndicatepath`

### Supabase
- Log application data for analytics
- Track conversion metrics
- **MCP:** `postgres-syndicatepath`

---

## Implementation Options

1. **Custom GPT (OpenAI)** - Fastest to deploy, limited integration
2. **ChatGPT API + Custom UI** - Full control, requires development
3. **n8n Workflow + AI** - Best SP ecosystem integration
4. **Form + AI Analysis** - Familiar UX, separate AI step

**Recommended:** Start with Custom GPT for rapid testing, then migrate to n8n for production integration.

---

## Compliance Considerations

- This is a prequalification tool, not a securities offering
- No legal or investment advice provided
- Preliminary assessment only - full review required
- Bad actor screening questions included
- Data handling per SP privacy policy

---

## Next Steps

1. [ ] Review question framework with SP team
2. [ ] Create Custom GPT using system prompt
3. [ ] Test with sample issuer scenarios
4. [ ] Refine based on testing feedback
5. [ ] Build integration workflows (n8n)
6. [ ] Deploy production version

---

## Commands

No custom commands yet. Potential future commands:

- `/issuer-application-summary [name]` - Generate summary from interview data
- `/issuer-readiness [name]` - Check readiness score and gaps

---

**Created:** 2025-01-09
**Owner:** SyndicatePath
**TELOS Alignment:** M3/G3 - Capital Pathways
