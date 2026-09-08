# AI Receptionist Make.com Migration — Architecture Report

## 1. Current Architecture (Before)

```
Frontend (PublicAiReceptionist.tsx)
  → POST /api/ai/receptionist
  → Cloudflare Worker (functions/api/[[...path]].ts)
    → runAIAgent() → Cline/OpenAI API (https://api.cline.bot/api/v1)
    → Fallback: Cloudflare Workers AI
  → Post-process: extract maid cards, markers, featured maids
  → Return { response, conversationId, featuredMaids }
  → React renders chat + maid cards
```

## 2. New Architecture (After)

```
Frontend (PublicAiReceptionist.tsx) [UNCHANGED]
  → POST /api/ai/receptionist
  → Cloudflare Worker (secure proxy)
    → Validate request, load app data
    → POST to Make.com webhook with full context
    → Make.com AI Agent processes (with tools)
    → Make.com returns structured JSON response
  → Worker post-processes (maid cards, markers)
  → Return to React in same format

Fallback chain: Make.com → Direct AI (Cline/OpenAI) → CF Workers AI
```

## 3. Files Changed

| File | Change |
|------|--------|
| `functions/api/[[...path]].ts` | Added Make.com webhook types, call function, context builder, modified receptionist handler |
| `.dev.vars` | Added commented Make.com receptionist webhook variables |
| `.dev.vars.example` | Added Make.com receptionist webhook example variables |
| `wrangler.toml` | Added documentation for new secret variables |
| `make/README.md` | Added AI Receptionist blueprint section |

## 4. Files Created

| File | Purpose |
|------|---------|
| `make/helped-ai-receptionist.blueprint.json` | Make.com scenario blueprint with setup instructions |
| `docs/ai-receptionist-make-migration.md` | This architecture report |

## 5. Files NOT Changed (Preserved)

- `frontend/src/components/ai/PublicAiReceptionist.tsx` — Chat bubble UI
- `frontend/src/lib/aiAgents.ts` — API call helper
- `functions/api/services/ai/agents.ts` — AI agent execution (used as fallback)
- `functions/api/services/ai/tools.ts` — Maid data tools (used by fallback path)
- `functions/api/services/ai/prompts.ts` — AI prompts (used by fallback path)
- `backend/src/controllers/aiController.ts` — Express backend

## 9. Required Make.com Configuration

1. **Create a Custom Webhook** trigger in Make.com
2. **Add an AI Agent module** (OpenAI, Anthropic, Groq, or any LLM)
3. **Configure the system prompt** with agency personality (see blueprint)
4. **Set up response module** to return JSON with `response`, `conversationId`, `handoff`
5. **Copy the webhook URL** and set it as a Worker secret

## 10. Required Environment Variables

### Worker Secrets (production)
```bash
npx wrangler secret put MAKE_AI_RECEPTIONIST_WEBHOOK_URL
# Paste: https://hook.eu1.make.com/your-webhook-url

npx wrangler secret put MAKE_AI_RECEPTIONIST_WEBHOOK_SECRET
# Enter: your-long-random-secret
```

### Local Development (.dev.vars)
```bash
MAKE_AI_RECEPTIONIST_WEBHOOK_URL=https://hook.eu1.make.com/your-webhook-url
MAKE_AI_RECEPTIONIST_WEBHOOK_SECRET=your-long-random-secret
```

## 11. How the AI Receptionist Gets Maid Data

**Current (Make.com path):**
- Worker sends `context.maidSummary` (total count, nationalities, types) to Make.com
- Make.com AI Agent uses this to understand available options
- Worker handles maid card extraction from AI response text
- If AI mentions reference codes (via `[MAID:REF001]` markers or `maidReferences`), Worker attaches photo cards

**Future (with Make.com tools):**
- Make.com AI Agent can call back to Worker APIs for specific maid searches
- HTTP GET `/api/public-maids?nationality=Myanmar&skill=infant_care`
- HTTP GET `/api/public-maids/{referenceCode}`

## 12. How Human Handoff Works

1. Customer says "I want to speak to a real person"
2. Make.com AI Agent detects the request
3. Make.com returns `{ handoff: true, actions: [{ type: "human_handoff" }] }`
4. Worker passes `handoff: true` to frontend
5. Frontend can display a message and trigger notification
6. TODO: Create support conversation via Worker API
7. TODO: Notify admin via email/WhatsApp

## 13. How Conversation Memory Works

**Worker-side (Supabase):**
- `runAIAgent()` stores messages in `ai_conversations` and `ai_messages` tables
- Conversation ID is stable per session (UUID generated on first message)

**Make.com-side:**
- Worker sends `conversationId` with every request
- Worker sends last 12 messages as `history` array
- Make.com AI Agent uses history for context

**Frontend-side:**
- `PublicAiReceptionist.tsx` generates conversation ID on first message
- Stores it in component state
- Sends same ID with every subsequent message

## 14. Error Handling

| Scenario | Behavior |
|----------|----------|
| Make.com webhook fails | Falls back to direct AI (Cline/OpenAI) |
| Make.com times out (25s) | Falls back to direct AI |
| Both Make.com and direct AI fail | Returns "Sorry, our assistant is temporarily unavailable" |
| Make.com returns invalid JSON | Falls back to direct AI |
| Network error | Returns error message to frontend |

## 15. Security

- Make.com webhook URL is server-side only (never exposed to browser)
- Webhook secret sent as `X-Webhook-Secret` header
- No Supabase credentials sent to Make.com
- No API keys sent to Make.com
- Conversation ID is a random UUID (not guessable)

## 16. Remaining TODOs

- [ ] Create Make.com scenario with Custom Webhook trigger
- [ ] Configure AI Agent module in Make.com with agency personality
- [ ] Set up response module to return proper JSON format
- [ ] Set Worker secrets in production
- [ ] Test complete flow: React → Worker → Make.com → Worker → React
- [ ] Implement human handoff notification (email/WhatsApp to admin)
- [ ] Add Make.com tools for maid search (HTTP callbacks to Worker)
- [ ] Add Make.com tools for enquiry creation
- [ ] Monitor Make.com webhook latency and adjust timeout if needed

## 17. Exact Commands to Run Locally

```bash
# 1. Start the Cloudflare Worker locally
cd c:\hh\Helped-web
npx wrangler dev

# 2. In another terminal, start the frontend
cd c:\hh\Helped-web\frontend
npm run dev

# 3. Test the receptionist endpoint
curl -X POST http://localhost:8787/api/ai/receptionist \
  -H "Content-Type: application/json" \
  -d '{"message": "Hi, I need a maid"}'
```

## 18. Exact Deployment Steps

```bash
# 1. Build the frontend
cd c:\hh\Helped-web
npm run frontend:build

# 2. Set Worker secrets (if not already set)
npx wrangler secret put MAKE_AI_RECEPTIONIST_WEBHOOK_URL
npx wrangler secret put MAKE_AI_RECEPTIONIST_WEBHOOK_SECRET

# 3. Deploy to Cloudflare
npx wrangler deploy

# 4. Test production endpoint
curl -X POST https://findmaid.wow-aisolution.workers.dev/api/ai/receptionist \
  -H "Content-Type: application/json" \
  -d '{"message": "Hi, I need a maid"}'
```

## 19. Make.com Configuration (Manual Steps)

Since Make.com configuration cannot be done from the codebase, you must:

1. **Go to Make.com** → Scenarios → Create new scenario
2. **Add trigger**: Webhooks → Custom webhook → Copy URL
3. **Add AI Agent module**:
   - Provider: OpenAI (or Anthropic/Groq)
   - Model: gpt-4o-mini (or claude-haiku-4-5)
   - System prompt: See `make/helped-ai-receptionist.blueprint.json`
   - User message: `{{1.message}}`
4. **Add JSON response module**:
   - Type: application/json
   - Body: `{ "success": true, "conversationId": "{{1.conversationId}}", "response": "{{AI_RESPONSE}}", "handoff": false }`
5. **Activate the scenario**
6. **Set Worker secrets** with the webhook URL

## 7. Make.com Webhook Payload

```json
{
  "conversationId": "uuid-string",
  "userId": "optional-user-id",
  "message": "I need a Myanmar maid with infant care experience",
  "page": "/client/maids",
  "history": [
    { "role": "user", "content": "Hi" },
    { "role": "assistant", "content": "Hello! How can I help you today?" }
  ],
  "context": {
    "company": {
      "name": "At The Agency",
      "phone": "80730757",
      "email": "info@theagency.sg",
      "whatsapp": "80730757",
      "whatsappLink": "https://wa.me/6580730757",
      "officeHours": "Mon-Sat: 9:00am to 7:30pm",
      "address": "Singapore"
    },
    "faqs": [
      { "q": "How much is the maid levy?", "a": "The standard Singapore maid levy is $300 per month..." }
    ],
    "maidSummary": {
      "total": 45,
      "nationalities": ["Myanmar", "Filipino", "Indonesian"],
      "types": ["Transfer", "Fresh", "Ex-Singapore"]
    }
  },
  "timestamp": "2026-01-01T00:00:00.000Z"
}
```

## 8. Make.com Response Format

```json
{
  "success": true,
  "conversationId": "uuid-string",
  "response": "Of course! I can help you find a Myanmar maid with infant care experience.",
  "maidReferences": ["MM-2024-001", "MM-2024-002"],
  "handoff": false,
  "actions": []
}
```

### Human Handoff Response:
```json
{
  "success": true,
  "conversationId": "uuid-string",
  "response": "Of course, I'll connect you with our support team right away.",
  "handoff": true,
  "actions": [{ "type": "human_handoff" }]
}
```