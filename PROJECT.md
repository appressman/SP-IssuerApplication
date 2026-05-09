# SP-IssuerApplication

## Mission Alignment

**TELOS Priority:** M3 — Capital Pathways
**Parent Entity:** SyndicatePath
**Strategic Goal Served:** G3 Capital Pathways (veteran/SMB issuer funnel to Reg CF/Reg D raises)

## Purpose

AI-guided prequalification interview that helps prospective issuers evaluate their readiness to raise capital through Regulation Crowdfunding or other securities offerings. Asks structured questions around the Seven Fundamental Questions, provides educational context, and generates a preliminary readiness assessment that feeds SyndicatePath's issuer intake pipeline.

## Scope

**In scope:**
- AI interviewer covering the Seven Fundamental Questions
- Readiness score + gap analysis output
- GHL contact creation on submission (Issuer Intake pipeline)
- Bad-actor screening questions
- Integration with Miventure Inc (FINRA portal) referral flow

**Out of scope:**
- Providing legal or investment advice
- Full offering preparation (handled post-qualification)
- Reg D accreditation verification (separate workflow)

## Success Criteria

- [ ] System prompt covers all 7 fundamental questions + bad-actor screening
- [ ] GHL integration creates contact + tags on submission
- [ ] Readiness score algorithm documented and tested on 5+ sample issuers
- [ ] First production issuer completes assessment end-to-end
- [ ] Compliance review sign-off on prequalification language

## Current Status

**Phase:** Design / Build
**Health:** 🟡 At Risk (stalled — blocked on chat assistant feature build per pending handoff)
**Last Updated:** 2026-04-04

Project is in design phase with system prompt and application schema drafted. Pending handoff from Mar 31 calls for AI chat assistant build at readiness.syndicatepath.com.

## Key Milestones

| Milestone | Target Date | Status |
|-----------|-------------|--------|
| System prompt drafted | done | done |
| Application schema drafted | done | done |
| Chat assistant feature built | TBD | blocked |
| First production test | TBD | planned |
| GHL integration live | TBD | planned |

## Owner & Stakeholders

- **Owner:** Adam Pressman
- **Key stakeholders:** SyndicatePath leadership, Miventure Inc (portal partner), prospective issuers

## Key Artifacts

- **Decision log:** `decision-log.md`
- **Risk register:** `risk-register.md`
- **Full spec:** `README.md`
- **System prompt:** `prompts/system-prompt.md`
- **Schema:** `schemas/application-schema.json`
- **Session context:** `CLAUDE.md`

## Dependencies

**Depends on:**
- GHL SyndicatePath location (issuer intake pipeline)
- Compliance/legal sign-off on prequalification language
- Reg CF launch timeline template (Google Drive: 19P6fcFPDFnVDY3kIFSakStKIxdVVnqrJ)

**Blocks:**
- SyndicatePath issuer funnel at scale
- Miventure Inc referral volume
- SP-WorkflowAutomation issuer-side automation

## Links

- **Target URL:** readiness.syndicatepath.com
- **SPPX reference:** https://forms.sppx.io/onboarding-survey/
- **MCPs:** `ghl-syndicatepath`, `google-workspace-syndicatepath`, `postgres-syndicatepath`
