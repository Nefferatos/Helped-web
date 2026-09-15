# Make.com scenarios for Helped Maids

Importable blueprints that wire the marketing → application → recruiter → PDF-autofill flow to the real web endpoints in this repo.

| File | Diagram half | Trigger |
|------|-------------|---------|
| `helped-content-engine.blueprint.json` | Scheduler → Claude → social channels | Schedule (time-based) |
| `helped-applicant-intake.blueprint.json` | Application form → Supabase → recruiter | Poll Supabase every 15 min |
| `helped-ai-receptionist.blueprint.json` | Webhook → AI Agent → response | Custom Webhook (from Worker) |
| `helped-applicant-assistant.blueprint.json` | Webhook → AI → Tracker/Google Docs → response | Custom Webhook (from Backend) |
| `helped-pdf-autofill.blueprint.json` | Webhook → Router (auth) → Make AI Agent → response | Custom Webhook (from Worker) |

Both use HTTP + Gmail/Sheets modules (the module family the existing `Helped Maids – Full Agentic Dispatcher` blueprint already imports), so they target the real REST surface instead of relying on per-network Make apps.

## Import

Make → **Create a new scenario** → **⋯** menu → **Import Blueprint** → select the file. Repeat for each.

On import Make will ask you to reconnect any module that needs an account (Gmail, Google Sheets). Reconnect them the same way you did for the existing Dispatcher scenario.

---

## 1. Content Engine (`helped-content-engine.blueprint.json`)

`Schedule → Claude (Anthropic API) → Parse JSON → Router → Facebook / LinkedIn / TikTok + Sheets log`

Claude returns `{ hook, body, hashtags[], cta_url }`; each channel route maps that bundle to its own API. Every CTA points at `/apply-as-maid?agencyId=1` with a channel-specific `utm_source`, so attribution lands in the application/enquiry `payload`.

### Fill these placeholders
- `ANTHROPIC_API_KEY` — module 1 (`x-api-key` header). Model is `claude-opus-4-8`; swap to `claude-sonnet-4-6` to cut cost.
- `YOUR-DOMAIN` — inside module 1's system prompt (`https://YOUR-DOMAIN/apply-as-maid?agencyId=1`).
- Per channel:
  - Facebook (module 10): `FACEBOOK_PAGE_ID`, `FACEBOOK_PAGE_ACCESS_TOKEN` (same call works for Groups via `/{GROUP_ID}/feed`)
  - LinkedIn (module 12): `LINKEDIN_ACCESS_TOKEN`, `LINKEDIN_ORG_ID`
  - TikTok (module 17): `TIKTOK_ACCESS_TOKEN`, `YOUR_VIDEO_URL` — **video required**; TikTok processes the publish asynchronously
- Google Sheets log (module 18): reconnect Google, pick your spreadsheet, create a tab named **Content Log** with header row `posted_at | hook | cta_url | hashtags`.

### Schedule
Daily, e.g. 09:00 / 14:00 / 19:00.

---

## 2. Applicant Intake (`helped-applicant-intake.blueprint.json`)

`Poll ats_applications (status=New Applicant) → Iterator → dedupe → fetch profile → Claude screening → Router (recruiter Gmail + Telegram)`

Reads the real columns of `helped_query_ats_applications` and `helped_query_ats_profiles` (see `supabase/helped_full_production_schema.sql`). It does **not** message the applicant — `createPublicAtsApplication` (`backend/src/atsStore.ts`) already queues their WhatsApp + email confirmation. Make only does recruiter-side alerting + AI screening.

### Fill these placeholders
- `YOUR-PROJECT-REF` — your Supabase project ref (modules 1 and 9 URLs).
- `SUPABASE_SERVICE_ROLE_KEY` — `apikey` + `Authorization: Bearer` headers (modules 1 and 9).
- `ANTHROPIC_API_KEY` — module 4.
- Gmail (module 5): reconnect account; recruiter address is preset to `wow.aisolution@gmail.com`.
- Telegram (module 7): `TELEGRAM_BOT_TOKEN`, `RECRUITER_TELEGRAM_CHAT_ID`.

### Required: create the dedupe Data Store
Modules 20 and 21 need one Make **Data Store**:
1. Make → **Data stores** → **Add** → give it a data structure with:
   - **key** `application_id` (text) — this is the record key
   - field `processed_at` (text)
2. In the scenario, select this Data Store in **both** module 20 (`Get a record`) and module 21 (`Add/replace a record`). The blueprint leaves `datastore` empty so Make forces the selection.

How it works: module 20 looks up the `application_id`; the `onerror → Resume` guard turns a not-found into an empty key; module 21's filter (`{{20.key}} does not exist`) passes only for new applicants and claims the record. So overlapping poll windows can never double-alert.

### Schedule
Every 15 minutes (module 1 polls a 20-min window; the dedupe makes the overlap safe).

---

## Reference: web endpoints these match

| Concern | Endpoint / table |
|---------|------------------|
| Public application form | `POST /api/ats/public/apply` (multipart) → status `New Applicant` |
| Applications / profiles | `helped_query_ats_applications`, `helped_query_ats_profiles` |
| Landing lead form | `POST /api/enquiries` → `helped_query_enquiries` |
| Recruiter dashboard | `GET /api/ats/dashboard`, `GET /api/ats/applications` (auth) |
| Existing Make hooks | `POST /api/send-to-make`, `POST /api/inquiry/make` |

Stage ladder (`backend/src/atsStore.ts`):
`New Applicant → Documents Submitted → Resume Parsed → Screening Interview → Background Check → Approved → Ready to Configure Public Profile → Placed / Rejected`

---

## 3. AI Receptionist (`helped-ai-receptionist.blueprint.json`)

`Custom Webhook → AI Agent (LLM) → Response`

The Helped Cloudflare Worker sends chat messages to a Make.com Custom Webhook. Make.com's AI Agent generates a natural, conversational response and returns structured JSON. The Worker handles maid card extraction, conversation persistence, and error fallback — Make only needs to generate the text response.

### Setup

1. **Create a Custom Webhook** in Make.com:
   - Make → Scenarios → Create new scenario
   - Add trigger: **Webhooks → Custom webhook**
   - Copy the webhook URL

2. **Set Worker secrets**:
   ```bash
   npx wrangler secret put MAKE_AI_RECEPTIONIST_WEBHOOK_URL
   # Paste your webhook URL when prompted

   npx wrangler secret put MAKE_AI_RECEPTIONIST_WEBHOOK_SECRET
   # Enter a long random secret (optional, for request validation)
   ```

3. **Add an AI Agent module** after the webhook:
   - Provider: OpenAI, Anthropic, Groq, or any supported LLM
   - System prompt: Use the agency personality from the blueprint
   - User message: `{{1.message}}`
   - Conversation history: `{{1.history}}`

4. **Configure the response**:
   - The AI Agent must return valid JSON:
     ```json
     {
       "success": true,
       "conversationId": "{{1.conversationId}}",
       "response": "AI text response here",
       "handoff": false
     }
     ```
   - For human handoff (when user asks for a real person):
     ```json
     {
       "success": true,
       "conversationId": "{{1.conversationId}}",
       "response": "I'll connect you with our support team.",
       "handoff": true,
       "actions": [{"type": "human_handoff"}]
     }
     ```

5. **Test the flow**:
   ```bash
   # Local development (with wrangler dev)
   curl -X POST http://localhost:8787/api/ai/receptionist \
     -H "Content-Type: application/json" \
     -d '{"message": "Hi, I need a maid"}'

   # Production
   curl -X POST https://findmaid.wow-aisolution.workers.dev/api/ai/receptionist \
     -H "Content-Type: application/json" \
     -d '{"message": "Hi, I need a maid"}'
   ```

### Webhook Payload (sent by Worker)

The Worker sends this JSON to Make.com on every chat message:

| Field | Type | Description |
|-------|------|-------------|
| `conversationId` | string | Stable conversation ID (persists across messages) |
| `userId` | string? | Authenticated user ID (if logged in) |
| `message` | string | Customer's chat message |
| `page` | string | Current page path (e.g., `/client/maids`) |
| `history` | array | Last 12 messages: `[{role, content}]` |
| `context.company` | object | Agency name, phone, email, WhatsApp, hours, address |
| `context.faqs` | array | Key FAQ knowledge `[{q, a}]` |
| `context.maidSummary` | object | `{total, nationalities[], types[]}` |
| `timestamp` | string | ISO 8601 timestamp |

### Response Format (returned by Make.com)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `success` | boolean | yes | Whether the request succeeded |
| `conversationId` | string | yes | Same conversation ID from the request |
| `response` | string | yes | AI text response (plain text, no markdown) |
| `handoff` | boolean | no | `true` if customer requested human support |
| `actions` | array | no | Actions for the frontend `[{type, ...}]` |
| `maidReferences` | string[] | no | Reference codes mentioned (Worker attaches cards) |

### Make.com AI Agent Personality

The receptionist should:
- Be warm, friendly, professional, helpful
- Communicate naturally — never say "As an AI..."
- Ask one question at a time — never dump ten questions
- Use plain text — no markdown, no asterisks, no headers
- Reference agency contact info when appropriate
- Guide users to browse maids at `/search-maids` or `/enquiry2`
- Remember conversation context — don't re-ask answered questions

### Future: AI Agent Tools

When ready, add these tools to the Make.com AI Agent:

1. **Search Maids** → HTTP GET to Worker `/api/public-maids?nationality=X&skill=Y`
2. **Get Maid Profile** → HTTP GET to Worker `/api/public-maids/{referenceCode}`
3. **Create Enquiry** → HTTP POST to Worker `/api/enquiries`
4. **Notify Admin** → Email/WhatsApp notification module
5. **Transfer to Human** → Create support conversation via Worker API

---

## 4. Applicant AI Assistant (`helped-applicant-assistant.blueprint.json`)

`Webhook → OpenAI (or any LLM) → Tracker Logic → Google Docs → JSON Response`

The Applicant AI Assistant is a recruitment operations assistant that helps recruiters manage applicants from the Applicant List. Unlike the public receptionist (customer-facing), this assistant is for internal recruiter use.

### Features
- **Analyze applicants** — strengths, weaknesses, suitability assessment
- **Compare applicants** — side-by-side comparison and ranking
- **Create applicant trackers** — structured tracking tables for recruitment pipeline
- **Sync to Google Docs** — create/update recruiter-friendly Google Doc trackers
- **Follow-up intelligence** — identify applicants needing attention
- **Conversation context** — maintains conversation history across messages

### Webhook Payload (sent by Backend)

| Field | Type | Description |
|-------|------|-------------|
| `conversationId` | string | Stable conversation ID |
| `requestId` | string | Unique request ID for idempotency |
| `message` | string | Recruiter's chat message |
| `type` | string | Always `"applicant_assistant"` |
| `context.user` | object | Authenticated recruiter info |
| `context.agency` | object | Agency info |
| `context.selectedApplicant` | object | Currently selected applicant (full profile) |
| `context.selectedApplicants` | array | Multiple selected applicants |
| `context.currentFilters` | object | Current Applicant List filters |
| `context.applicantSummary` | object | Pipeline stats: total, byStage, byNationality, averageScore |
| `conversationHistory` | array | Last 12 messages |
| `trackerContext.existingTracker` | object | Current tracker state (if any) |
| `trackerContext.googleDocId` | string | Existing Google Doc ID (if any) |

### Response Format (returned by Make.com)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `success` | boolean | yes | Whether the request succeeded |
| `requestId` | string | yes | Same request ID from the request |
| `conversationId` | string | yes | Same conversation ID |
| `type` | string | yes | Always `"applicant_assistant"` |
| `message.text` | string | yes | AI response text |
| `action.type` | string | no | Action type (e.g., `create_applicant_tracker`) |
| `action.status` | string | no | `completed`, `pending`, `needs_confirmation` |
| `result.documentId` | string | no | Google Doc ID (if created/updated) |
| `result.documentUrl` | string | no | Google Doc URL (if created/updated) |
| `requiresHumanReview` | boolean | no | `true` if action needs human approval |
---

## 5. Universal Make.com AI Engine (`makeAiEngine`)

Every AI tool now routes its LLM call through one shared gateway — `backend/src/services/makeAiEngine.ts` — so Make.com acts as the single AI engine across the platform. Direct Claude/Groq/Gemini/OpenAI calls remain only as a fallback when Make.com is not configured or fails.

### Scenarios and their environment variables

| Scenario | Tools powered | Env var (specific) | Defaults to |
|----------|---------------|--------------------|-------------|
| `receptionist` | Public AI Receptionist, general assistant | `MAKE_WEBHOOK_URL_AI_ENGINE_RECEPTIONIST` | `MAKE_WEBHOOK_URL` |
| `workflow` | Lead enrichment, qualification, match ranking, contract drafts | `MAKE_WEBHOOK_URL_AI_ENGINE_WORKFLOW` | `MAKE_WEBHOOK_URL` |
| `marketing` | Direct marketing campaign copy | `MAKE_WEBHOOK_URL_AI_ENGINE_MARKETING` | `MAKE_WEBHOOK_URL` |
| `pdf-autofill` | PDF biodata extraction | `MAKE_WEBHOOK_URL_AI_ENGINE_PDF_AUTOFILL` | `MAKE_WEBHOOK_URL` |
| `applicant-assistant` | Applicant AI Assistant bubble | `MAKE_WEBHOOK_URL_APPLICANT_ASSISTANT` | `MAKE_WEBHOOK_URL` |
| `hr-interviewer` | AI HR Interviewer chat (Worker) | `MAKE_AI_HR_INTERVIEWER_WEBHOOK_URL` | `MAKE_WEBHOOK_URL` |
| `command-center` | AI Command Center bubble chat (AI Agents page) | `MAKE_AI_COMMAND_CENTER_WEBHOOK_URL` | `MAKE_WEBHOOK_URL` |

> **Tip:** You can point every scenario at a single generic Make.com "AI Engine" scenario (which just takes `systemPrompt` + `userPrompt` in → text/JSON out) by setting only `MAKE_WEBHOOK_URL`. Or create dedicated scenarios per tool and set the more specific env vars.

### Universal request payload (sent to Make.com)

```json
{
  "type": "ai_engine",
  "scenario": "workflow",
  "systemPrompt": "...",
  "userPrompt": "...",
  "context": {}
}
```

### Accepted response formats

The gateway normalises any of these Make.com responses:
- Raw text: `"some answer"`
- `{ "text": "some answer" }`
- `{ "response": "some answer" }`
- `{ "message": { "text": "some answer" } }`
- `{ "content": "some answer" }`

For structured tools that need JSON (lead scoring, match ranking, contract draft, HR interviewer), the gateway extracts a JSON object from the response and falls back to deterministic rules if none is found.

### Fallback order (per tool)

```
Make.com (primary engine)
  → direct Claude/Groq/Gemini/OpenAI (legacy)
  → deterministic rules
```

### Environment Variable

Set `MAKE_WEBHOOK_URL_APPLICANT_ASSISTANT` in your `.env` to the Make.com webhook URL.

### Fill these placeholders
- `YOUR_OPENAI_API_KEY` — OpenAI API key for the AI module (or swap to Claude/Groq)
- `YOUR_GOOGLE_OAUTH_CONNECTION` — Google Docs OAuth connection for tracker sync

### Google Doc Format

The tracker should be formatted as a recruiter-friendly document:

```
APPLICANT TRACKER
Last Updated: [date/time]

| Applicant | Position | Status | Stage | Priority | Next Action | Notes |
|-----------|----------|--------|-------|----------|-------------|-------|
| Maria | Caregiver | Shortlisted | Interview | High | Schedule interview | Strong experience |

## Follow-Up Required
* Applicant A — interview scheduling
* Applicant B — missing documents

## AI Recommendations
* Prioritize Applicant A
* Follow up with Applicant B
```
```
* Prioritize Applicant A
* Follow up with Applicant B
```

---

## 5. PDF Autofill (`helped-pdf-autofill.blueprint.json`)

`Custom Webhook → Router (auth check) → Make AI Agent (gpt-5-nano) → JSON Response`

Extracts Singapore FDW biodata from PDF text and returns the structured JSON the frontend (`frontend/src/pages/PdfAutofill.tsx`) uses to auto-fill the "Add Maid" form. The Worker (`functions/api/[[...path]].ts` → `POST /api/pdf-autofill`) is the secure proxy: the browser calls the Worker with agency-admin auth, and the Worker forwards to this Make scenario with a shared `authToken`.

### Webhook Payload (sent by Worker)

| Field | Type | Description |
|-------|------|-------------|
| `scenario` | string | Always `"pdf_autofill"` — routes to the AI agent |
| `requestId` | string | Unique id (used as the AI conversation thread) |
| `systemPrompt` | string | The frontend's output rules (checkbox markers, null-vs-empty, etc.) |
| `userPrompt` | string | The exact JSON schema + extracted PDF text |
| `authToken` | string | Shared secret from `MAKE_PDF_AUTOFILL_WEBHOOK_TOKEN` |

### Response Format (returned by Make.com)

| Field | Type | Description |
|-------|------|-------------|
| `content` | string | JSON-stringified extracted biodata (the full 52-field schema) |
| `finish_reason` | string | `"stop"` |

### Auth (defense-in-depth)

The scenario has three router routes:

1. **Authorized** — `scenario == pdf_autofill` **AND** `authToken == <token>` → run AI agent, respond 200.
2. **Unauthorized** — `scenario == pdf_autofill` **AND** `authToken != <token>` → respond 401.
3. **Unsupported** — `scenario != pdf_autofill` → respond 400.

### Fill these placeholders

- **Auth token** — replace `REPLACE_WITH_AUTH_TOKEN` in **both** Module 27 and Module 30 filter conditions with the same value you set for `MAKE_PDF_AUTOFILL_WEBHOOK_TOKEN`.
- **Webhook** — Module 1 (restored as `WEBSITE AI WORKFLOW 2`); if importing fresh, create a new webhook and copy its URL.
- **AI connection** — Module 27 uses Make's AI Provider connection (`makeConnectionId`); verify it's connected after import.

### Worker secrets

```
npx wrangler secret put MAKE_PDF_AUTOFILL_WEBHOOK_URL   # paste the webhook URL
npx wrangler secret put MAKE_PDF_AUTOFILL_WEBHOOK_TOKEN # paste the auth token
```

The Worker falls back to `OPENAI_API_KEY`/`CLINE_API_KEY` and then `ANTHROPIC_API_KEY` if the Make webhook is unset or fails.

