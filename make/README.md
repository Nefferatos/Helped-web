# Make.com scenarios for Helped Maids

Three importable blueprints that wire the marketing → application → recruiter flow to the real web endpoints in this repo.

| File | Diagram half | Trigger |
|------|-------------|---------|
| `helped-content-engine.blueprint.json` | Scheduler → Claude → social channels | Schedule (time-based) |
| `helped-applicant-intake.blueprint.json` | Application form → Supabase → recruiter | Poll Supabase every 15 min |
| `helped-ai-receptionist.blueprint.json` | Webhook → AI Agent → response | Custom Webhook (from Worker) |

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
