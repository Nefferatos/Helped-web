# FDW Application Chatbot (Make blueprint)

Implements the **FDW Application Chatbot** Make scenario in the web app. **Make is
the engine; the web is only a vessel.** The browser never talks to Make directly
— it calls the Cloudflare Worker, which relays every request to the Make webhook.
No AI provider (Cline/OpenAI/Anthropic) and no Google Sheets writes happen in the
Worker; Make's AI Agent and Add-a-Row modules do all the work.

## Make scenario router

One custom webhook (`make/helped-fdw-application-chatbot.blueprint.json`) fans
out three payload shapes:

| Payload | Make branch | Response |
|---|---|---|
| `{ scenario: "fdw_application_chat", ... }` | AI Agent | `{ "reply": "..." }` |
| `{ event_type: "fdw_application.completed", ... }` | Google Sheets — Add a Row | `accepted` |
| `{ event_type: "fdw_referral.created", ... }` | Google Sheets — Add a Row | `accepted` |

## Web endpoints (Cloudflare Worker)

- `POST /api/fdw/chatbot` — the single relay endpoint (`functions/api/[[...path]].ts`).
  Everything is forwarded to Make; the Worker performs no AI or Sheets work.
  - `scenario: "fdw_application_chat"` → returns Make's `{ response, reply, conversationId, source }`.
  - `event_type: "fdw_application.completed"` → forwarded to Make (sheets "Add a Row").
  - `event_type: "fdw_referral.created"` → forwarded to Make (sheets "Add a Row").
  - Returns `503` when `MAKE_WEBHOOK_URL_FDW_CHATBOT` is not set.
- `POST /api/ats/public/apply` also fires `fdw_application.completed`
  (`dispatchFdwApplicationCompleted`).
- `POST /api/ats/public/referrals` also fires `fdw_referral.created`
  (`dispatchFdwReferralCreated`).

The chat endpoint is proxied to the Worker in dev via `VITE_WORKER_API_PROXY_TARGET`
(`/api/fdw` rule in `frontend/vite.config.ts`).

## Frontend

- `frontend/src/lib/fdwChatbot.ts` — client helpers.
- `frontend/src/components/FdwApplicationChatbot.tsx` — the chat **form**
  (guided questions + AI replies, "Apply as FDW" and "Refer a friend" modes).
- `frontend/src/pages/FdwApplicationChatPage.tsx` — page at `/apply-as-maid/chat`
  (linked from `/apply-as-maid`).

## Configuration

Make is the only engine, so the single variable is the webhook URL
(see `.env.example`, `wrangler.toml`):

```
MAKE_WEBHOOK_URL_FDW_CHATBOT=https://hook.eu1.make.com/...
```

Local dev: add the same line to `.dev.vars`. Production:

```bash
npx wrangler secret put MAKE_WEBHOOK_URL_FDW_CHATBOT
```

No AI keys (Cline/OpenAI/Anthropic) and no Google Sheets credentials are needed by
the Worker for this feature — Make handles both.

## Google Sheets column order

Completed applications (A–K): `submitted_at`, `application_code`, `full_name`,
`email`, `contact_number`, `nationality`, `years_of_experience`, `languages`,
`employment_preference`, `available_date`, `note`.

Referrals (A–I): `submitted_at`, `referral_id`, `referrer_name`,
`referrer_contact`, `relationship`, `referred_name`, `referred_contact`, `note`,
`source_application_id`.
