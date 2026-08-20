# Helped-web — AI Workflow Design & Architecture

## Overview

The Helped-web platform uses a multi-layered AI workflow architecture to automate the entire maid agency lifecycle — from lead capture to interview to contract generation. Workflows are classified by an AI agent, routed through a Cloudflare Worker backend, and orchestrated via Make.com for external integrations (email, CRM, spreadsheets, WhatsApp).

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React + Vite)                      │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────┐ │
│  │  Public AI   │  │  AI HR       │  │  AI Inquiry  │  │  ATS    │ │
│  │  Receptionist│  │  Interviewer │  │  Chatbot     │  │  Recruit│ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └────┬────┘ │
│         │                 │                 │               │       │
│         └────────────────┴─────────────────┬┘               │       │
│                                            │                │       │
│              useAiAutomation hook          │                │       │
│              (submitInquiry,              │                │       │
│               submitLead,                  │                │       │
│               submitInterviewSession)      │                │       │
└────────────────────────────────────────────┼────────────────┼───────┘
                                             │                │
                                     ┌───────▼───────┐        │
                                     │  Direct Webhook        │
                                     │  (VITE_MAKE_   │        │
                                     │   WEBHOOK_URL_ │        │
                                     │   *PIPELINE)   │        │
                                     └───────┬───────┘        │
                                             │                │
┌────────────────────────────────────────────┼────────────────┼───────┐
│                 BACKEND (Cloudflare Worker)│                │       │
│                                            │                │       │
│  ┌─────────────────────────────────────────▼────────────────▼────┐  │
│  │                    API Router ([[...path]].ts)               │  │
│  │                                                               │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐│  │
│  │  │/api/    │ │/api/    │ │/api/ai/ │ │/api/    │ │/api/    ││  │
│  │  │inquiry  │ │leads/   │ │hr-      │ │match    │ │contracts││  │
│  │  │         │ │raw      │ │interview│ │         │ │/generate││  │
│  │  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘│  │
│  │       │          │          │          │          │       │  │
│  │  ┌────▼──────────▼──────────▼──────────▼──────────▼────┐  │  │
│  │  │            AI Classifier / Fallback Logic           │  │  │
│  │  │  (Claude / Gemini / Groq → keyword fallback)       │  │  │
│  │  └───────────────────────┬─────────────────────────────┘  │  │
│  │                          │                                │  │
│  │  ┌───────────────────────▼─────────────────────────────┐  │  │
│  │  │              Workflow Router                         │  │  │
│  │  │  inquiry_match | inquiry_only | lead_scoring         │  │  │
│  │  │  contract_creation | schedule_creation               │  │  │
│  │  │  applicant_interview | notification_only             │  │  │
│  │  │  validation_error | human_review                    │  │  │
│  │  └───────────────────────┬─────────────────────────────┘  │  │
│  │                          │                                │  │
│  │  ┌───────────────────────▼─────────────────────────────┐  │  │
│  │  │         Supabase Database (PostgreSQL)               │  │  │
│  │  │  (app_data, maids, leads, inquiries, ats_applicants) │  │  │
│  │  └──────────────────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │              /api/send-to-make (Make.com Relay)            │  │
│  │  MAKE_WEBHOOK_URL → Make.com scenarios                      │  │
│  └──────────────────────────────┬──────────────────────────────┘  │
└──────────────────────────────────┼──────────────────────────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │      Make.com Cloud         │
                    │                              │
                    │  ┌────────────────────────┐ │
                    │  │ inquiry_pipeline         │ │
                    │  │ lead_pipeline            │ │
                    │  │ interview_pipeline      │ │
                    │  │ matching_pipeline        │ │
                    │  │ notification_pipeline    │ │
                    │  └────────────────────────┘ │
                    │                              │
                    │  Actions:                   │
                    │  - Email (SMTP/Resend)      │
                    │  - CRM sync                 │
                    │  - Spreadsheet append       │
                    │  - WhatsApp messaging        │
                    │  - Calendar events           │
                    │  - PDF generation           │
                    └─────────────────────────────┘
```

---

## Workflow 1: Lead Intake & Scoring (`lead_scoring`)

### Purpose
Capture leads from multiple sources (Facebook Lead Ads, website forms, scraped data), enrich them with AI, and qualify them for priority routing.

### Flow
```
Source (Facebook/Website/Scraped)
    │
    ▼
POST /api/leads/raw
    │
    ├──→ AI Enrichment (service type, budget, urgency, location)
    ├──→ AI Qualification (HIGH / MEDIUM / LOW score)
    ├──→ Save to Supabase (leads table)
    ├──→ Create internal notification
    │
    ▼
Make.com relay (lead_pipeline)
    │
    ├──→ CRM sync
    ├──→ Sales team alert
    └──→ Spreadsheet append
```

### Key Endpoints
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/leads/raw` | Create lead from raw source data |
| GET | `/api/leads` | List all leads |
| POST | `/api/send-to-make` | Relay to Make.com |

### Frontend Hook
```typescript
submitLeadWithAutomation({
  source: "facebook",
  name: "Alicia Tan",
  contact: "+6591234567",
  message: "Need transfer maid for elderly care, budget SGD 700"
})
```

---

## Workflow 2: AI Inquiry Handling (`inquiry_match` / `inquiry_only`)

### Purpose
Process customer inquiries from website chat, WhatsApp, or Facebook Messenger. AI classifies intent (hiring vs. general inquiry) and generates an automated reply.

### Flow
```
Customer message (chat/WhatsApp/Messenger)
    │
    ▼
POST /api/inquiry
    │
    ├──→ AI Intent Classification (hiring / inquiry / complaint)
    ├──→ AI Workflow Assignment:
    │     ├── hiring → inquiry_match (find matching maids)
    │     ├── inquiry → inquiry_only (informational reply)
    │     └── complaint → human_review
    ├──→ AI Reply Generation
    ├──→ Maid matching (if hiring intent)
    ├──→ Save to Supabase (inquiries table)
    │
    ▼
Make.com relay (inquiry_pipeline)
    │
    ├──→ Support queue
    ├──→ Canned reply audit
    └──→ Messaging sync
```

### Key Endpoints
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/inquiry` | Process inquiry |
| POST | `/api/inquiry/make` | AI Agent → backend → Make relay |
| POST | `/api/send-to-make` | Relay to Make.com |

### Frontend Hook
```typescript
submitInquiryWithAutomation({
  name: "Marcus",
  contact: "marcus@example.com",
  message: "I want to hire a maid for childcare in Woodlands",
  employerId: 12
})
```

---

## Workflow 3: AI HR Interviewer (`applicant_interview`) ⭐ NEW

### Purpose
Conduct fully automated, structured AI interviews for job applicants (domestic workers). The AI asks questions across 5 stages, evaluates responses in real-time, and generates a pass/fail recommendation with strengths and weaknesses.

### Interview Stages
```
┌─────────────────────────────────────────────────────────────┐
│                    5-Stage Interview Flow                    │
│                                                             │
│  Stage 1: INTRODUCTION                                      │
│  ├── Greeting & basic info                                  │
│  └── Name, position, motivation                             │
│                                                             │
│  Stage 2: EXPERIENCE                                        │
│  ├── Years of domestic work experience                      │
│  ├── Countries worked in                                    │
│  └── Most recent employment & duties                        │
│                                                             │
│  Stage 3: SKILLS ASSESSMENT                                 │
│  ├── Childcare experience (1-5 rating)                      │
│  ├── Elderly care experience                                │
│  ├── Cooking skills & cuisines                              │
│  └── Emergency/first aid awareness                          │
│                                                             │
│  Stage 4: SCENARIOS                                         │
│  ├── Handling tantrums + crying baby                        │
│  ├── Cultural/religious conflict resolution                 │
│  └── Elderly confusion response                             │
│                                                             │
│  Stage 5: CONCLUSION                                        │
│  ├── Candidate questions                                    │
│  └── Final evaluation & recommendation                      │
└─────────────────────────────────────────────────────────────┘
```

### Evaluation Logic
Each candidate response is evaluated on:
- **Response length** (detailed vs. brief)
- **Keyword relevance** (experience, skills, safety, communication)
- **Stage-specific scoring** (childcare, elderly care, cooking, emergency)
- **Score range**: 0-100 per response

### Recommendation Thresholds
| Score | Recommendation | Action |
|-------|---------------|--------|
| ≥ 70 | **PASS** | Shortlist candidate, send pass email |
| 50-69 | **BORDERLINE** | Flag for human review, additional training |
| < 50 | **FAIL** | Send rejection email, encourage future application |

### Full Flow
```
HR Admin enters candidate details
    │
    ▼
AI Interviewer starts (5-stage structured interview)
    │
    ├──→ Stage 1: Introduction questions
    ├──→ Candidate responds → AI evaluates (score + notes)
    ├──→ Stage 2: Experience questions
    ├──→ Candidate responds → AI evaluates
    ├──→ Stage 3: Skills questions
    ├──→ Candidate responds → AI evaluates
    ├──→ Stage 4: Scenario questions
    ├──→ Candidate responds → AI evaluates
    ├──→ Stage 5: Conclusion
    │
    ▼
AI generates final result:
    ├──→ Overall score (avg of all evaluations)
    ├──→ Recommendation (pass / borderline / fail)
    ├──→ Strengths list
    ├──→ Weaknesses list
    └──→ Summary text
    │
    ▼
POST /api/ai/hr-interview/session
    │
    ├──→ Persist session to backend (ATS)
    ├──→ Update applicant stage to "interviewed"
    │
    ▼
Make.com relay (interview_pipeline)
    │
    ├──→ Update ATS/applicant stage in CRM
    ├──→ Send pass/fail email to candidate
    ├──→ Notify HR team
    ├──→ Create follow-up task (if borderline)
    └──→ Append to interview spreadsheet
    │
    ▼
HR Admin can also manually send pass/fail email
via POST /api/ai/hr-interview/email
```

### Key Endpoints
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/ai/hr-interview/session` | Save interview session + trigger automation |
| POST | `/api/ai/hr-interview/email` | Send pass/fail email to candidate |

### Frontend Hook
```typescript
submitInterviewSession({
  applicationId: "interview-1234567890",
  sessionData: { candidateName, candidateEmail, position, messages, result },
  rating: 82,
  recommendation: "pass",
  summary: "Strong candidate with 5+ years childcare experience."
})
```

### Make.com Webhook
```
VITE_MAKE_WEBHOOK_URL_INTERVIEW_PIPELINE
→ https://hook.eu1.make.com/a5mi0ks7tnbnhtvfvivhfnjnaw6lwiel
```

---

## Workflow 4: Maid Matching (`inquiry_match`)

### Purpose
When a customer expresses hiring intent, the system matches them with suitable maid profiles based on requirements (service type, location, budget).

### Flow
```
Hiring inquiry detected
    │
    ▼
POST /api/match
    │
    ├──→ AI extracts requirements (service, budget, location, urgency)
    ├──→ Database query (maids table with filters)
    ├──→ AI ranking (top 3 candidates with match reasons)
    ├──→ Save matches to Supabase
    │
    ▼
Make.com relay (matching_pipeline)
    │
    ├──→ Send employer shortlist
    ├──→ Create CRM task
    └──→ Notify sales team
```

### Key Endpoints
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/match` | Find matching maids |
| GET | `/api/maids` | List all maids |

---

## Workflow 5: Interview Scheduling (`schedule_creation`)

### Purpose
Schedule in-person or video interviews between employers and shortlisted maids.

### Flow
```
Employer selects maid from shortlist
    │
    ▼
POST /api/schedule
    │
    ├──→ Create schedule record
    ├──→ Save to Supabase
    │
    ▼
Make.com relay
    │
    ├──→ Create calendar event
    ├──→ Send WhatsApp reminder
    └──→ Send email reminder
```

### Key Endpoints
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/schedule` | Create interview schedule |

---

## Workflow 6: Contract Generation (`contract_creation`)

### Purpose
Automatically generate employment contracts when a maid and employer are matched and scheduled.

### Flow
```
Match confirmed + schedule created
    │
    ▼
POST /api/contracts/generate
    │
    ├──→ AI generates contract text (service type, terms, salary)
    ├──→ Save contract to Supabase
    │
    ▼
Make.com relay
    │
    ├──→ Generate PDF from contract text
    ├──→ Store in Supabase/Drive
    └──→ Notify employer and admin
```

### Key Endpoints
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/contracts/generate` | Generate employment contract |

---

## Workflow 7: Notifications (`notification_only`)

### Purpose
Fan out notifications across multiple channels (email, WhatsApp, SMS, internal).

### Flow
```
Trigger event (lead, inquiry, interview, contract)
    │
    ▼
POST /api/notify  OR  POST /api/send-message
    │
    ├──→ Save notification to Supabase
    │
    ▼
Make.com relay (notification_pipeline)
    │
    ├──→ Email (SMTP / Resend)
    ├──→ WhatsApp
    ├──→ SMS
    └──→ Internal messaging
```

### Key Endpoints
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/notify` | Send notification |
| POST | `/api/send-message` | Send internal message |

---

## Workflow 8: Human Review (`human_review`)

### Purpose
Route ambiguous or complex cases to human review when AI confidence is low or the request doesn't fit standard workflows.

### Flow
```
AI classifier detects:
  - Low confidence
  - Ambiguous intent
  - Missing required fields
  - Complaint/escalation
    │
    ▼
Workflow = human_review
    │
    ├──→ Create review task in Supabase
    ├──→ Notify admin team
    │
    ▼
Make.com relay
    │
    └──→ Admin dashboard alert
```

---

## AI Classification System

### How It Works

The system uses a multi-tier AI classification approach:

```
User Input
    │
    ▼
┌─────────────────────────────┐
│    Tier 1: Claude API        │  ← Primary (if CLAUDE_API_KEY set)
│    (Anthropic Claude)       │
└──────────┬──────────────────┘
           │ (fallback if unavailable)
           ▼
┌─────────────────────────────┐
│    Tier 2: Gemini API       │  ← Secondary (if GEMINI_API_KEY set)
│    (Google Gemini)          │
└──────────┬──────────────────┘
           │ (fallback if unavailable)
           ▼
┌─────────────────────────────┐
│    Tier 3: Groq API         │  ← Tertiary (if GROQ_API_KEY set)
│    (Llama/Mixtral)          │
└──────────┬──────────────────┘
           │ (fallback if unavailable)
           ▼
┌─────────────────────────────┐
│    Tier 4: Keyword Fallback │  ← Always available
│    (Rule-based classifier)  │
└─────────────────────────────┘
```

### Valid Workflow Values
| Workflow | Description |
|----------|-------------|
| `lead_scoring` | New lead capture and qualification |
| `inquiry_only` | General inquiry (no hiring intent) |
| `inquiry_match` | Hiring inquiry → maid matching |
| `contract_creation` | Generate employment contract |
| `schedule_creation` | Schedule interview/appointment |
| `applicant_interview` | AI HR interview session |
| `notification_only` | Send notification only |
| `validation_error` | Input validation failed |
| `human_review` | Route to human for manual review |

---

## Make.com Integration

### Webhook URLs (Environment Variables)

| Variable | Purpose | Scope |
|----------|---------|-------|
| `MAKE_WEBHOOK_URL` | Backend → Make relay (all scenarios) | Backend `.env` / `.dev.vars` |
| `VITE_MAKE_WEBHOOK_URL_INQUIRY_PIPELINE` | Direct inquiry webhook | Frontend `.env` |
| `VITE_MAKE_WEBHOOK_URL_LEAD_PIPELINE` | Direct lead webhook | Frontend `.env` |
| `VITE_MAKE_WEBHOOK_URL_INTERVIEW_PIPELINE` | Direct interview webhook | Frontend `.env` |

### Make.com Routing Map

| Pipeline | Make.com Actions |
|----------|-----------------|
| `lead_pipeline` | CRM sync, sales alert, spreadsheet append |
| `inquiry_pipeline` | Support queue, canned reply audit, messaging sync |
| `interview_pipeline` | ATS stage update, candidate email, HR notification, follow-up task |
| `matching_pipeline` | Shortlist messaging, scheduler, follow-up tasks |
| `notification_pipeline` | Email, WhatsApp, SMS fanout |

### Fallback Behavior
- If no AI API keys are configured → keyword-based fallback classifier
- If Make.com webhook URL is missing → API returns recorded failure (no crash)
- If backend is unreachable → frontend continues with local evaluation logic

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui |
| Backend | Cloudflare Workers (TypeScript), Hono router |
| Database | Supabase (PostgreSQL), RLS policies |
| AI Providers | Claude (Anthropic), Gemini (Google), Groq (Llama) |
| Automation | Make.com (webhook-triggered scenarios) |
| Email | SMTP (Nodemailer) / Resend API |
| Auth | Supabase Auth (JWT, social OAuth, phone) |
| Storage | Supabase Storage, Cloudflare R2 |
| Deployment | Cloudflare Pages (frontend), Cloudflare Workers (backend) |

---

## Security & Compliance

- **API keys** stored server-side only (never exposed to browser)
- **Supabase RLS** policies enforce row-level access control
- **Rate limiting** on all AI endpoints
- **Input validation** on all API routes
- **CORS** configured for allowed origins only
- **JWT verification** for authenticated endpoints
- **No PII** sent to Make.com (only structured workflow data)

---

## Summary

The Helped-web platform provides **8 distinct AI-powered workflows** that cover the entire maid agency lifecycle:

1. **Lead Intake** → Capture & qualify leads from multiple sources
2. **AI Inquiry** → Classify customer intent & generate replies
3. **AI HR Interviewer** → Conduct structured interviews with automated scoring ⭐
4. **Maid Matching** → AI-powered candidate ranking
5. **Interview Scheduling** → Calendar & reminder automation
6. **Contract Generation** → AI-drafted employment contracts
7. **Notifications** → Multi-channel message fanout
8. **Human Review** → Fallback for complex/ambiguous cases

Each workflow follows the same pattern: **Frontend → Backend API → AI Classification → Database → Make.com Automation**, with graceful fallbacks at every step.