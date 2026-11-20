# FDW Applicant Assistant and Application Event Sync

The applicant assistant opens as a floating panel on the FDW application form. It answers questions conversationally and offers quick **I have a referral** / **No referral** actions. When an applicant has a referral, the assistant asks for the referrer's name or referral code and carries it into the form when they continue. Application submission remains on the full form at `/apply-as-maid`.

## Make scenario

Import `make/helped-fdw-application-chatbot.blueprint.json`. Its webhook routes:

| Payload | Make action |
|---|---|
| `{ scenario: "fdw_application_chat", mode: "apply", ... }` | Make AI Agent replies to applicant questions |
| `{ event_type: "fdw_application.completed", ... }` | Add completed application row to its configured sheet |
| `{ event_type: "fdw_referral.created", ... }` | Add referral event row to its configured sheet |

The Worker relays chat and event payloads. The AI Agent does not submit applications or create spreadsheet rows. Application submission uses the validated full form. Referral event sync remains a separate branch.

## Website flow

- `/apply-as-maid` is the full application form and contains the floating applicant assistant.
- The assistant's shortcut carries `hasReferral` and `referralSource` into the form; it never submits the form for the applicant.
- Old `/apply-as-maid/chat` URLs redirect to the full form.

The full form requires a passport-size photo (minimum 300 x 375 pixels) and full-body photo (minimum 480 x 800 pixels), in JPG/PNG. A Work Permit card is required for transfer and ex-Singapore applicants. Resume/CV, passport copy, certificates/training, medical documents, references, an introduction video up to one minute, and other documents are supporting uploads and are not all universally required.

## Connect Make

1. Import the blueprint, create its Custom Webhook, and reconnect the Make AI Provider and Google Sheets modules.
2. Keep the AI route filtered to `scenario = fdw_application_chat` and `mode = apply`. The Make message and system prompt use the current question, collected referral status, and recent conversation.
3. Return the AI Agent's reply immediately from the Webhook Response; do not return the literal `Accepted` for chat turns.
4. For the dedicated route, store the scenario URL as the Worker secret `MAKE_WEBHOOK_URL_FDW_CHATBOT`, then activate the scenario. Until that is set, chat turns use the configured shared `MAKE_AI_ENGINE_WEBHOOK_URL` gateway. Never expose either URL in browser code.
5. Test applicant questions, the referral shortcut and form handoff, a completed full application, and a consented referral event.
