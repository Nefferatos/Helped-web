# Make.com scenarios for Helped Maids

Two importable blueprints that wire the marketing → application → recruiter flow to the real web endpoints in this repo.

| File | Diagram half | Trigger |
|------|-------------|---------|
| `helped-content-engine.blueprint.json` | Scheduler → Claude → social channels | Schedule (time-based) |
| `helped-applicant-intake.blueprint.json` | Application form → Supabase → recruiter | Poll Supabase every 15 min |

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
