# Helped Make scenarios to import

Import each JSON file as its own Make scenario. Do not combine webhook-triggered scenarios with scheduled monitoring: each webhook needs its own URL, while the health check needs a fixed schedule.

| Scenario | Blueprint | Backend environment variable | Finish in Make |
|---|---|---|
| Applicant intake and AI screening | `helped-applicant-intake.blueprint.json` | `MAKE_WEBHOOK_URL_APPLICANT_INTAKE` | Create the webhook, select Make AI Agent and Gmail connections; optionally configure Telegram. |
| Workflow health check | `helped-event-health-check.blueprint.json` | none | Set the URL and `EVENT_INGEST_SECRET`, connect Gmail, then schedule every 60 minutes. |
| Unified AI gateway | `helped-ai-gateway.blueprint.json` | `MAKE_WEBHOOK_URL_AI_ENGINE` plus optional specific `MAKE_WEBHOOK_URL_AI_ENGINE_WORKFLOW`, `..._MARKETING`, or `..._RECEPTIONIST` | Create webhook and select a Make AI Agent connection/model. Do not use the legacy generic `MAKE_WEBHOOK_URL` unless it points to this exact gateway. |
| Contractor arrival alert | `helped-contractor-arrival-alert.blueprint.json` | `MAKE_WEBHOOK_URL_CONTRACTOR_ARRIVAL_ALERT` | Create webhook, reconnect Gmail, set internal recipient. |
| Interview scheduled staff alert | `helped-interview-scheduled-alert.blueprint.json` | `MAKE_WEBHOOK_URL_INTERVIEW_SCHEDULED_ALERT` | Create webhook, reconnect Gmail, set internal recipient. |
| Private document to Google Drive | `helped-google-drive-sync.blueprint.json` | `MAKE_WEBHOOK_URL_GOOGLE_DRIVE_SYNC` | Create webhook, connect Google Drive, select destination folder. |
| Private media transcription | `helped-media-transcription.blueprint.json` | `MAKE_WEBHOOK_URL_MEDIA_TRANSCRIBE` | Create webhook, choose/configure the transcription provider, and test that it returns `transcript`. |

## Scenarios already in the repository

Existing blueprints for the public receptionist, applicant assistant, PDF autofill, content engine, command center, HR email notifications, and the legacy workflow dispatcher remain separate integrations. Import them only when you are enabling that feature.

## Important setup

- Paste generated webhook URLs only into `backend/.env`, never commit that file.
- Set `EVENT_INGEST_SECRET` before activating the applicant intake scenario; Make uses it when posting `screening.completed` back to the website.
- Every imported Gmail/Google Drive/AI module starts without your account connection. Select it in the Make editor, save, run once with a test payload, then activate the scenario.
- The transcription adapter has an intentional provider placeholder. A transcription vendor is required; Make AI Agent alone is not a guaranteed audio-transcription provider.
