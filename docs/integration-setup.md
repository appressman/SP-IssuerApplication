# SP-IssuerApplication Integration Setup Guide

This guide covers setting up the GPT-to-GHL integration for automatic issuer application capture.

---

## Architecture Overview

```
Custom GPT (OpenAI)
    ↓ Action POST
n8n Webhook (/webhook/issuer-application)
    ↓ Transform & Validate
GHL Contact + Opportunity Creation
    ↓ Notify
Slack #sp-intake channel
```

---

## Step 1: Deploy n8n Workflow

### Import the Workflow

1. Log into n8n at https://n8n.netcleus.com
2. Go to **Workflows** → **Import from File**
3. Select: `/home/adam/pai/projects/SP-WorkflowAutomation/blueprints/n8n/n8n_SP_Issuer_Application_Intake.json`
4. Click **Import**

### Configure Credentials

The workflow uses the existing GHL SyndicatePath API credential (`gxHdl2muZxg6balS`). Verify it's linked:

1. Open the imported workflow
2. Click on **Create GHL Contact** node
3. Verify credential is set to "GHL SyndicatePath API"
4. Repeat for **Create GHL Opportunity** node

### Configure Slack Notification (Optional)

1. Create a Slack Incoming Webhook for #sp-intake channel
2. Edit the **Slack Notification** node
3. Replace `YOUR_SLACK_WEBHOOK_URL` with actual webhook URL
4. Or remove this node if Slack not needed

### Activate the Workflow

1. Click the toggle in the top-right to activate
2. Note the webhook URL: `https://n8n.netcleus.com/webhook/issuer-application`

---

## Step 2: Create GHL Custom Fields

Verify these custom fields exist in GHL SyndicatePath. Create if missing:

| Field Key | Display Name | Type | Object |
|-----------|--------------|------|--------|
| `company_legal_name` | Company Legal Name | Text | Contact |
| `incorporation_state` | State of Incorporation | Text | Contact |
| `industry` | Industry | Text | Contact |
| `company_website` | Company Website | Text | Contact |
| `offering_type` | Offering Type | Dropdown | Contact |
| `security_type` | Security Type | Dropdown | Contact |
| `min_raise` | Minimum Raise | Number | Contact |
| `max_raise` | Maximum Raise | Number | Contact |
| `readiness_score` | Readiness Score | Number | Contact |
| `target_launch_date` | Target Launch Date | Text | Contact |
| `application_id` | Application ID | Text | Contact |
| `fundamentals_summary` | Fundamentals Summary | Large Text | Contact |

### Dropdown Options

**offering_type:**
- RegCF
- RegD506b
- RegD506c
- RegA
- Other

**security_type:**
- SimpleEquity
- PreferredEquity
- Debt
- ConvertibleNote
- SAFE
- RevenueShare
- Other

---

## Step 3: Create GHL Pipeline

Create pipeline **"Issuer Intake"** if it doesn't exist:

| Stage | Order |
|-------|-------|
| New Application | 1 |
| Under Review | 2 |
| Discovery Call Scheduled | 3 |
| Qualified - Proposal Sent | 4 |
| Onboarding | 5 |
| Declined / Not Ready | 6 |

Note the pipeline ID for the n8n workflow configuration.

---

## Step 4: Configure OpenAI Custom GPT

### Create the GPT

1. Go to https://chat.openai.com/gpts/editor
2. Click **Create a GPT**
3. Name: **SyndicatePath Capital Readiness Advisor**
4. Description: "AI-guided interview to evaluate your readiness to raise capital from investors"

### Add Instructions

Copy the contents of `/home/adam/pai/projects/SP-IssuerApplication/prompts/system-prompt-gpt.md` into the **Instructions** field.

### Configure Actions

1. Click **Create new action**
2. Select **Import from URL** or paste schema
3. Use the schema from `/home/adam/pai/projects/SP-IssuerApplication/schemas/openai-action-schema.json`

**Or manually configure:**

- **Authentication:** None (or API Key if you add auth to n8n)
- **Schema:**

```yaml
openapi: 3.1.0
info:
  title: SyndicatePath Issuer Application API
  version: 1.0.0
servers:
  - url: https://n8n.netcleus.com
paths:
  /webhook/issuer-application:
    post:
      operationId: submitApplication
      summary: Submit issuer application
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [contact, company, offering]
              properties:
                contact:
                  type: object
                  properties:
                    firstName: { type: string }
                    lastName: { type: string }
                    email: { type: string }
                    phone: { type: string }
                    title: { type: string }
                company:
                  type: object
                  properties:
                    legalName: { type: string }
                    state: { type: string }
                    industry: { type: string }
                    website: { type: string }
                    description: { type: string }
                    preRevenue: { type: boolean }
                    yearsOperating: { type: number }
                offering:
                  type: object
                  properties:
                    type: { type: string }
                    securityType: { type: string }
                    minimumRaise: { type: number }
                    maximumRaise: { type: number }
                fundamentals:
                  type: object
                assessment:
                  type: object
                readiness:
                  type: object
                timeline:
                  type: object
      responses:
        '200':
          description: Success
```

### Disable Capabilities

Turn OFF:
- Web Browsing
- DALL-E Image Generation
- Code Interpreter

### Conversation Starters

Add these:
- "I want to raise capital for my business"
- "Help me evaluate my fundraising readiness"
- "Start my issuer prequalification interview"

### Publish

1. Click **Save**
2. Choose visibility: **Anyone with the link** (for testing) or **Public**
3. Copy the GPT link for sharing

---

## Step 5: Test the Integration

### Test n8n Webhook Directly

```bash
curl -X POST https://n8n.netcleus.com/webhook/issuer-application \
  -H "Content-Type: application/json" \
  -d '{
    "contact": {
      "firstName": "Test",
      "lastName": "User",
      "email": "test@example.com",
      "phone": "555-1234"
    },
    "company": {
      "legalName": "Test Company LLC",
      "state": "Delaware",
      "industry": "Technology"
    },
    "offering": {
      "type": "RegCF",
      "minimumRaise": 50000,
      "maximumRaise": 250000
    },
    "assessment": {
      "overallScore": 65,
      "complexity": "Standard"
    }
  }'
```

**Expected Response:**
```json
{
  "applicationId": "SP-APP-20250109-XXXX",
  "status": "received",
  "message": "Your application has been submitted successfully..."
}
```

### Verify in GHL

1. Go to GHL SyndicatePath → Contacts
2. Search for "test@example.com"
3. Verify contact created with custom fields populated
4. Check Opportunities → Issuer Intake pipeline for new opportunity

### Test GPT End-to-End

1. Open the Custom GPT
2. Complete a full interview
3. When prompted, confirm submission
4. Verify contact and opportunity created in GHL

---

## Troubleshooting

### Webhook Returns 400 Error

**Cause:** Missing required fields
**Fix:** Check the error response for specific missing fields. Ensure contact.email, company.legalName, and offering.minimumRaise are provided.

### Contact Not Created in GHL

**Cause:** API credential issue or field mapping error
**Fix:**
1. Check n8n execution logs
2. Verify GHL API credential is valid
3. Verify custom field keys match exactly (case-sensitive)

### Opportunity Not Created

**Cause:** Pipeline ID mismatch
**Fix:**
1. Get pipeline ID from GHL (Settings → Pipelines)
2. Update the n8n workflow with correct pipeline ID

### GPT Action Fails

**Cause:** Schema mismatch or server error
**Fix:**
1. Check n8n webhook is active
2. Verify action schema matches n8n expectations
3. Check OpenAI action logs for details

---

## File Locations

| File | Purpose |
|------|---------|
| `prompts/system-prompt-gpt.md` | GPT instructions (copy to OpenAI) |
| `schemas/openai-action-schema.json` | OpenAPI schema for GPT action |
| `schemas/application-schema.json` | Full data schema reference |
| `SP-WorkflowAutomation/blueprints/n8n/n8n_SP_Issuer_Application_Intake.json` | n8n workflow to import |

---

## Security Considerations

### Current Setup (No Auth)
The webhook currently accepts any POST request. For production:

1. **Add API Key Auth to n8n:**
   - Edit webhook node → Options → Authentication
   - Set to "Header Auth"
   - Create API key

2. **Configure in GPT Action:**
   - Set Authentication to "API Key"
   - Add header with the key

### Rate Limiting
n8n has built-in rate limiting. Monitor for abuse if the GPT is public.

### Data Privacy
- Don't request SSN, bank accounts, or sensitive PII in the interview
- Application data stored in GHL follows their data retention policies
- Consider adding explicit consent question in interview

---

## Maintenance

### Updating the GPT

1. Edit the GPT in OpenAI
2. Update instructions from latest `system-prompt-gpt.md`
3. Save and republish

### Updating the Workflow

1. Edit in n8n or re-import updated JSON
2. Test with curl before activating
3. Monitor first few submissions for errors

### Adding Custom Fields

1. Create field in GHL
2. Add field mapping in n8n Code node
3. Add to GHL contact creation body
4. Update schema if needed for GPT

---

*Last Updated: 2025-01-09*
*Version: 1.0*
