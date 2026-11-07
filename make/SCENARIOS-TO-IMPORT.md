# Helped Make scenarios to import

Import each JSON file as its own Make scenario. Do not combine webhook-triggered scenarios with scheduled monitoring: each webhook needs its own URL, while the health check needs a fixed schedule.

| Scenario | Blueprint | Backend environment variable | Finish in Make |
|---|---|---|
| Applicant intake and AI screening | `helped-applicant-intake.blueprint.json` | `MAKE_WEBHOOK_URL_APPLICANT_INTAKE` | Create the webhook, select Make AI Agent and Gmail connections; optionally configure Telegram. |
| Workflow health check | `helped-event-health-check.blueprint.json` | none | Set the URL to `https://YOUR-DOMAIN/api/events/health`, use the same `EVENT_INGEST_SECRET` configured on the website, connect Gmail, then schedule every 60 minutes. It monitors `candidate.created` → `screening.completed`. |
| Unified AI gateway | `helped-ai-gateway.blueprint.json` | Express: `MAKE_WEBHOOK_URL_AI_ENGINE`; Worker: `MAKE_AI_ENGINE_WEBHOOK_URL` | Create one webhook, select a Make AI Agent connection/model, and set both variables to the same URL. Do not use the legacy generic `MAKE_WEBHOOK_URL` unless it points to this exact gateway. |
| Telegram broadcast | `helped-telegram-broadcast.blueprint.json` | Worker: `MAKE_TELEGRAM_BROADCAST_WEBHOOK_URL` | Create the webhook, replace bot-token/domain/callback-secret placeholders, add 429-aware handling and delivery-error callbacks, then activate. Includes text, image, and document branches. |
| Telegram applicant chatbot | `helped-telegram-chatbot.blueprint.json` | Worker: `MAKE_TELEGRAM_CHATBOT_WEBHOOK_URL` | Create the webhook, reconnect the existing Make AI Agent, attach Rinzin Agency's approved knowledge base, define the JSON Parse structure, replace callback placeholders, filter human handovers, then activate. |
| Contractor arrival alert | `helped-contractor-arrival-alert.blueprint.json` | `MAKE_WEBHOOK_URL_CONTRACTOR_ARRIVAL_ALERT` | Create webhook, reconnect Gmail, set internal recipient. |
| Placement milestone alert | `helped-placement-milestone-alert.blueprint.json` | `MAKE_WEBHOOK_URL_PLACEMENT_MILESTONE_ALERT` | Create webhook, reconnect Gmail, set the internal recipient. It receives Flight, Medical, SIP, and Handover updates from Operations Center. |
| Deployment task and integration events | `helped-deployment-task-events.blueprint.json` | `MAKE_WEBHOOK_URL_DEPLOYMENT_TASK_EVENTS` | Create webhook, reconnect Gmail, set the internal operations recipient, and deduplicate deliveries by `event_id`. It receives verified deployment task events and privacy-minimized Drive/media outcomes from the durable outbox. |
| Daily three-day operations report | `helped-rolling-arrival-report.blueprint.json` | `MAKE_WEBHOOK_URL_ROLLING_ARRIVAL_REPORT` | Create webhook, reconnect Gmail, set an authorized internal recipient, and add Make Data Store deduplication keyed by `event_id` before activation. Set `ROLLING_ARRIVAL_REPORT_AGENCY_ID` to the numeric `agency_id` for the agency being reported. |
| Marketing campaign events | `helped-marketing-campaign-events.blueprint.json` | `MAKE_WEBHOOK_URL_MARKETING_CAMPAIGN_EVENTS` | Create webhook, reconnect Gmail, set an internal marketing inbox, then copy the webhook URL to the Worker secret. It alerts on draft-created and email lifecycle events; payloads exclude recipient details and message text. |
| Interview scheduled staff alert | `helped-interview-scheduled-alert.blueprint.json` | `MAKE_WEBHOOK_URL_INTERVIEW_SCHEDULED_ALERT` | Create webhook, reconnect Gmail, set internal recipient. |
| Private document to Google Drive | `helped-google-drive-sync.blueprint.json` | `MAKE_WEBHOOK_URL_GOOGLE_DRIVE_SYNC` | Create webhook, connect Google Drive, select destination folder. |
| Private media transcription (Make AI Content Extractor) | `helped-media-transcription.blueprint.json` | `MAKE_WEBHOOK_URL_MEDIA_TRANSCRIBE` | Import the scenario, reconnect/select the Make AI Content Extractor module if prompted, run once, and verify the response contains `transcript`. |
| FDW application chatbot + referral | `helped-fdw-application-chatbot.blueprint.json` | Worker: `MAKE_WEBHOOK_URL_FDW_CHATBOT` | Create the webhook, then reconnect the Make AI Agent connection and select your Google Sheets connection for both "Add a Row" modules (application + referral spreadsheets). See `docs/FDW_APPLICATION_CHATBOT.md`. |

### Finding the rolling report agency ID

`ROLLING_ARRIVAL_REPORT_AGENCY_ID` is the `agency_id` for the agency whose flights, interviews, and open deployment tasks should appear in the scheduled email. To look it up in the configured Supabase project, use the agency admin table and the app ID configured as `SUPABASE_APP_DATA_ID`:

```sql
select distinct agency_id, agency_name
from public.helped_agency_admins
where app_id = '<SUPABASE_APP_DATA_ID>'
order by agency_id;
```

Use the correct row's numeric `agency_id`. The scheduled job intentionally accepts one agency ID so a shared Make webhook does not receive every agency's dispatch details.

### Private media transcription with Make AI Content Extractor

The blueprint now contains **Make AI Content Extractor → Transcribe an audio file** as module 6 (`make-ai-extractors:transcribeAnAudio`). Its Audio source is URL, mapped to webhook module 1's short-lived `mediaUrl`; the webhook response maps module 6's `text` output into `transcript` and preserves `syncJobId`.

1. Import the blueprint and create/select the **Helped Media Transcription** custom webhook in module 1.
2. If Make asks to resolve module 2, select **Make AI Content Extractor → Transcribe an audio file** and confirm Audio source = URL, with URL mapped to module 1's `mediaUrl`.
3. Click **Run once** and test from the agency portal. Confirm module 2 emits `text` and module 3 returns `{ ok: true, syncJobId, transcript }`.
4. Activate the scenario and set its webhook URL as the Worker's `MAKE_WEBHOOK_URL_MEDIA_TRANSCRIBE` secret.

Make AI Content Extractor requires a paid Make plan and is currently priced at 20 Make credits per audio minute. Its audio transcription uses Microsoft Azure AI services in the EU data zone. Confirm the account's plan, credits, and data handling requirements before enabling it. See [Make AI Content Extractor docs](https://apps.make.com/make-ai-extractors) and [Make AI provider/data zone details](https://help.make.com/ai-providers-and-data-zones-in-make).

### Previous WhatsApp broadcast integration

The former phone-list broadcast UI and delivery endpoint are retired. Its old
blueprint is retained as an archive only; it is not part of the Telegram flow.
See `docs/TELEGRAM-INTEGRATION.md` for active setup instructions.

## Scenarios already in the repository

Existing blueprints for the public receptionist, applicant assistant, PDF autofill, content engine, command center, HR email notifications, and the legacy workflow dispatcher remain separate integrations. Import them only when you are enabling that feature.

### Transcription adapter — ready-to-use provider variant

`helped-media-transcription.deepgram.blueprint.json` is a drop-in replacement for the template above. It uses Deepgram's synchronous `listen` endpoint, which accepts an HTTPS audio URL directly, so the flow stays at three modules (webhook → HTTP → webhook response) and answers with `{ ok, syncJobId, transcript }` exactly as the backend expects.

1. Import it as its own scenario.
2. In the webhook module, select the existing **Helped Media Transcription** webhook, so `MAKE_WEBHOOK_URL_MEDIA_TRANSCRIBE` does not change.
3. Replace `YOUR_DEEPGRAM_API_KEY` with a real key (or move it into a Make connection/keychain).
4. Click **Run once**, then verify from the repo: `npm run test:media-transcribe`.

The variant sets `dlq: true`, so failed runs are kept under **Incomplete executions** instead of being discarded — that is what makes a `Scenario failed to complete.` response diagnosable afterwards. If the transcript comes back empty, open module 3 and click the transcript field in the mapping panel: Make writes the exact array path for you (Make's array indices are 1-based, so the first channel is `channels.1`).

## Important setup

- Paste generated webhook URLs only into `backend/.env`, never commit that file.
- Set `EVENT_INGEST_SECRET` before activating the applicant intake scenario; Make uses it when posting `screening.completed` back to the website.
- Every imported Gmail/Google Drive/AI module starts without your account connection. Select it in the Make editor, save, run once with a test payload, then activate the scenario.
- The transcription adapter has an intentional provider placeholder. A transcription vendor is required; Make AI Agent alone is not a guaranteed audio-transcription provider.
