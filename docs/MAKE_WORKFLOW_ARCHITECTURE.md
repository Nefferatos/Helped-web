# Make.com Workflow Architecture — Complete Guide

## Overview

The Helped-web platform uses **two Make.com blueprints** that work together as a pipeline. Understanding the difference between them is critical to avoiding conflicts and loops.

| Blueprint | Role | Direction | Webhook URL |
|-----------|------|-----------|-------------|
| **Workflow web orchestra** | AI Classifier + Router | Website → Backend | `sqbr8h9q73743rl9wa32iynyqai87cbn` |
| **WEBSITE AI WORKFLOW** | Email + Calendar + Responses | Backend → External | `ms7gknazwsiqxyx41miqivon94vgspr1` |

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CUSTOMER / WEBSITE                            │
│   Contact form, chat widget, WhatsApp, Facebook Messenger               │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ POST webhook (structured JSON)
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                BLUEPRINT 1: "Workflow web orchestra"                    │
│                Webhook: sqbr8h9q73743rl9wa32iynyqai87cbn                │
│                                                                         │
│   1. Webhook ──▶ 2. AI Agent (classifies) ──▶ 3. Parse JSON ──▶ 4. Router│
│                                                                         │
│   Routes to backend:                                                    │
│   ├─ inquiry_only      → POST /api/inquiry                             │
│   ├─ lead_scoring      → POST /api/leads/raw                           │
│   ├─ inquiry_match     → POST /api/match                               │
│   ├─ contract_creation → POST /api/contracts/generate                  │
│   ├─ schedule_creation → POST /api/schedule                            │
│   ├─ notification_only → POST /api/notify                              │
│   ├─ applicant_interview → POST /api/notify                            │
│   ├─ make_pipeline     → POST /api/inquiry/make                        │
│   ├─ human_review      → POST /api/notify                              │
│   └─ catch-all         → POST /api/notify                              │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ HTTP POST to backend API
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         BACKEND (Express / Worker)                      │
│                         localhost:3000 or production                    │
│                                                                         │
│   Processes request (AI matching, lead scoring, contract gen, etc.)     │
│   Then sends results to MAKE_WEBHOOK_URL                                │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ POST webhook (scenario + payload)
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                BLUEPRINT 2: "WEBSITE AI WORKFLOW"                       │
│                Webhook: ms7gknazwsiqxyx41miqivon94vgspr1               │
│                                                                         │
│   1. Webhook ──▶ 2. Router (by scenario field)                         │
│                                                                         │
│   ├─ inquiry_pipeline              → Respond 200 OK                    │
│   ├─ lead_pipeline                 → Respond 200 OK                    │
│   ├─ interview_pipeline (no type)  → Respond 200 OK                    │
│   ├─ interview_pipeline (pass)     → Send congratulations email        │
│   ├─ interview_pipeline (fail)     → Send rejection email              │
│   ├─ interview_pipeline (invite)   → Calendar event + invitation email │
│   ├─ applicant_interview_completed → Respond 200 OK                    │
│   └─ (unsupported)                 → Respond 400                       │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Blueprint 1: "Workflow web orchestra" — AI Classifier

### Purpose
Receives raw requests from the website/frontend, uses a Make.com AI Agent to classify the intent, then routes to the correct backend API endpoint.

### Input Format
```json
{
  "action": "find_match",
  "actor": { "role": "client", "id": "client-001" },
  "customer": { "name": "Jane Doe", "contact": "jane@example.com" },
  "message": "I need a maid for elderly care in Tampines, budget $600-$800",
  "context": {
    "employerId": "1",
    "serviceType": "elderly_care",
    "location": "Tampines",
    "budgetText": "$600-$800"
  }
}
```

### AI Agent Classification Rules
- `lead_scoring` — new lead or qualification request
- `inquiry_only` — general question, no matching needed
- `inquiry_match` — hiring, recommendation, or shortlist request
- `make_pipeline` — backend inquiry relay
- `contract_creation` — contract or draft request
- `schedule_creation` — interview or appointment scheduling
- `notification_only` — delivery-only message
- `applicant_interview` — HR interview request
- `human_review` — ambiguous, risky, or invalid (fallback)

### Webhook URL
```
https://hook.eu1.make.com/sqbr8h9q73743rl9wa32iynyqai87cbn
```

---

## Blueprint 2: "WEBSITE AI WORKFLOW" — Email & Calendar

### Purpose
Receives processed results from the backend and handles external actions: sending emails, creating calendar events, and responding to the original webhook.

### Input Format
```json
{
  "scenario": "interview_pipeline",
  "type": "pass",
  "to": "candidate@example.com",
  "candidateName": "Maria Santos",
  "position": "Domestic Worker (Childcare)",
  "rating": 85
}
```

### Route Actions

| Scenario | Type | Action |
|----------|------|--------|
| `inquiry_pipeline` | — | Respond 200 |
| `lead_pipeline` | — | Respond 200 |
| `interview_pipeline` | (empty) | Respond 200 |
| `interview_pipeline` | `pass` | Send congratulations email → Respond 200 |
| `interview_pipeline` | `fail` | Send rejection email → Respond 200 |
| `interview_pipeline` | `interview_invitation` | Create Google Calendar event → Send invitation email → Respond 200 |
| `applicant_interview_completed` | — | Respond 200 |
| (unsupported) | — | Respond 400 |

### Email Templates

**Pass Email** — "Congratulations — you have been shortlisted | Helped Agency"
- Shows interview score out of 100
- Branded with AT The Agency logo

**Fail Email** — "Update on your application | Helped Agency"
- Encourages future applications

**Interview Invitation** — "Interview invitation | Helped Agency"
- Includes Google Meet video call link
- Shows scheduled date and time

### Webhook URL
```
https://hook.eu1.make.com/ms7gknazwsiqxyx41miqivon94vgspr1
```

---

## Complete End-to-End Flows

### Flow 1: Customer Inquiry (Hiring Intent)

```
1. Customer submits form on website
   "I need a maid for childcare in Woodlands, budget $500-$700"

2. Frontend sends to Workflow web orchestra
   POST sqbr8h9q73743rl9wa32iynyqai87cbn
   { action: "find_match", customer: {...}, message: "..." }

3. AI Agent classifies → "inquiry_match"

4. Router sends to backend
   POST /api/match { name, contact, message, serviceType, ... }

5. Backend runs AI matching, finds top 3 maids, saves to database

6. Backend sends results to WEBSITE AI WORKFLOW
   POST ms7gknazwsiqxyx41miqivon94vgspr1
   { scenario: "inquiry_pipeline", inquiryId: 123, matches: [...] }

7. WEBSITE AI WORKFLOW responds 200 OK

8. Frontend receives response with matches and AI reply
```

### Flow 2: HR Interview → Pass Email

```
1. HR admin completes AI interview for candidate

2. Frontend saves session
   POST /api/ai/hr-interview/session
   { applicationId: "...", rating: 85, recommendation: "pass" }

3. Frontend triggers Make directly
   POST ms7gknazwsiqxyx41miqivon94vgspr1
   { scenario: "interview_pipeline", type: "pass",
     to: "candidate@gmail.com", candidateName: "Maria",
     position: "Domestic Worker", rating: 85 }

4. WEBSITE AI WORKFLOW sends congratulations email via Gmail

5. Candidate receives branded email with score
```

### Flow 3: Interview Invitation with Calendar

```
1. HR admin schedules interview for candidate

2. Frontend triggers Make
   POST ms7gknazwsiqxyx41miqivon94vgspr1
   { scenario: "interview_pipeline", type: "interview_invitation",
     to: "candidate@gmail.com", candidateName: "Ana",
     position: "Domestic Worker", scheduledDate: "2026-09-01",
     scheduledTime: "10:00" }

3. WEBSITE AI WORKFLOW:
   a. Creates Google Calendar event with Google Meet link
   b. Sends invitation email with "Join Google Meet" button

4. Candidate receives email with video call link
```

---

## Environment Variables Reference

### Backend (`.env`)

| Variable | Value | Purpose |
|----------|-------|---------|
| `MAKE_WEBHOOK_URL` | `ms7gknazwsiqxyx41miqivon94vgspr1` | Backend → WEBSITE AI WORKFLOW |
| `MAKE_ORCHESTRATOR_WEBHOOK_URL` | `sqbr8h9q73743rl9wa32iynyqai87cbn` | Reference for orchestrator |

### Cloudflare Workers (`.dev.vars`)

| Variable | Value | Purpose |
|----------|-------|---------|
| `MAKE_WEBHOOK_URL` | `ms7gknazwsiqxyx41miqivon94vgspr1` | Worker → WEBSITE AI WORKFLOW |
| `MAKE_ORCHESTRATOR_WEBHOOK_URL` | `sqbr8h9q73743rl9wa32iynyqai87cbn` | Reference for orchestrator |

### Frontend (`.env`)

| Variable | Value | Purpose |
|----------|-------|---------|
| `VITE_MAKE_WEBHOOK_URL_INQUIRY_PIPELINE` | `ms7gknazwsiqxyx41miqivon94vgspr1` | Direct inquiry webhook |
| `VITE_MAKE_WEBHOOK_URL_LEAD_PIPELINE` | `ms7gknazwsiqxyx41miqivon94vgspr1` | Direct lead webhook |
| `VITE_MAKE_WEBHOOK_URL_INTERVIEW_PIPELINE` | `3d9ngjcns5mljp3vhnppepfjuuvrcrut` | HR interview email (dedicated) |

---

## Webhook URL Quick Reference

| URL | Blueprint | Used By |
|-----|-----------|---------|
| `sqbr8h9q73743rl9wa32iynyqai87cbn` | Workflow web orchestra | Website, frontend |
| `ms7gknazwsiqxyx41miqivon94vgspr1` | WEBSITE AI WORKFLOW | Backend, frontend (inquiry/lead) |
| `3d9ngjcns5mljp3vhnppepfjuuvrcrut` | HR Interview Email | Frontend (interview pipeline) |

---

## Testing

### Test Workflow web orchestra
```bash
node scripts/test-workflow-orchestrator.mjs
```

### Test WEBSITE AI WORKFLOW
```bash
node scripts/test-website-ai-workflow.mjs
```

### Test specific route
```bash
node scripts/test-workflow-orchestrator.mjs inquiry_only
node scripts/test-website-ai-workflow.mjs interview_pipeline
```

---

## Common Mistakes to Avoid

### ❌ WRONG: Using the same webhook URL for both blueprints
```
MAKE_WEBHOOK_URL=sqbr8h9q...  ← Points to orchestrator
# Backend sends results back to orchestrator → AI classifies again → LOOP!
```

### ✅ CORRECT: Each blueprint has its own URL
```
MAKE_WEBHOOK_URL=ms7gknazw...  ← Points to WEBSITE AI WORKFLOW
MAKE_ORCHESTRATOR_WEBHOOK_URL=sqbr8h9q...  ← Points to orchestrator
```

### ❌ WRONG: Sending unstructured data to the orchestrator
```json
{ "scenario": "inquiry_pipeline", "inquiryId": 123 }
```
The orchestrator expects `{ action, actor, customer, message, context }`.

### ✅ CORRECT: Sending structured data to the orchestrator
```json
{
  "action": "find_match",
  "actor": { "role": "client", "id": "client-001" },
  "customer": { "name": "Jane", "contact": "jane@example.com" },
  "message": "I need a maid for childcare",
  "context": { "serviceType": "childcare", "location": "Woodlands" }
}
```

### ❌ WRONG: Sending structured data to WEBSITE AI WORKFLOW
```json
{ "action": "find_match", "actor": {...}, "customer": {...} }
```
The WEBSITE AI WORKFLOW expects `{ scenario, type, to, ... }`.

### ✅ CORRECT: Sending scenario data to WEBSITE AI WORKFLOW
```json
{
  "scenario": "interview_pipeline",
  "type": "pass",
  "to": "candidate@gmail.com",
  "candidateName": "Maria",
  "position": "Domestic Worker",
  "rating": 85
}
```


