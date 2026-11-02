# At The Agency: three new applicant automation agents

This implementation scope is only the three new agents requested in the project brief. The existing website's applicant form, ATS, recruitment assistant, uploads, notifications, and other automations remain the systems/features they already are; these agents do not replace or recreate them.

## Agent map

| Agent | New Make blueprint | Input | Output / authority |
| --- | --- | --- | --- |
| 1. Lead and Referral Hunter | `make/agent-1-lead-referral-hunter.blueprint.json` | A consented lead/referral event from an approved acquisition channel | Classifies source/type and whether eligible for Agent 2. The website persists referral leads and applies duplicate review; Agent 1 does not scrape, contact people, or decide legal eligibility. |
| 2. Applicant Profile Collector | `make/agent-2-applicant-profile-collector.blueprint.json` | One applicant message, current allowlisted profile state, required fields, language, and processing consent | One reply, extracted applicant-stated fields, missing/conflicting fields, and whether a profile can be shown for applicant confirmation. It does not certify documents or confirm for the applicant. |
| 3. Profile Draft Builder | `make/agent-3-profile-draft-builder.blueprint.json` | Applicant-confirmed public fields, active publication consent, and approved media IDs | An allowlisted public-profile draft or `not_ready`. It does not save, approve, or publish. |

Each blueprint is a separate Make scenario with a custom webhook, Make AI Agent, and webhook response. They use Make AI Provider and do not require a separate model-provider API key in the scenario. Select the Make AI Provider connection after importing.

Keep **Sequential processing / Process data in order** disabled for Agents 2 and 3: these synchronous scenarios use a Webhook response module, which Make does not support when sequential processing is enabled. The webhook response is required because the website is waiting for the agent's JSON result.

## Shared workflow contract

The caller passes a stable `lead_id`, `applicant_id`, or `conversation_id` as appropriate and persists state in the authoritative application database. Make thread history is not the system of record. Use deterministic code to validate every response against the JSON contract in the blueprint before saving it or starting the next agent.

1. Agent 1 may route a consented applicant/referral to Agent 2. Dedupe must be deterministic in the source system using normalized contact identifiers and agency scope; ambiguous matches go to staff. Never auto-merge on name alone.
2. Agent 2 receives the latest applicant message and current profile state. The Worker sends `current_profile_json` and `required_fields_json` as JSON text for Make's AI Agent input; do not use `toJSON()` in that module. Save only fields explicitly extracted from the applicant. Ask one question at a time; when required fields are complete, show a summary and capture the applicant's explicit confirmation as a separate action.
3. Agent 3 may receive only applicant-confirmed public fields and approved media references. The Worker sends `public_fields_json` and `approved_media_ids_json` as JSON text; do not use `toJSON()` in the AI Agent input. Save its response as a draft only. Server-side code must require separate active publication consent, validate the public-field allowlist, set `pending_staff_review`, and authorize a staff approval action before publishing.

Consent for processing a conversation, consent for marketing contact, and consent to publish a profile are distinct permissions. A withdrawal must stop the affected workflow and be persisted by deterministic code.

## What's delivered and what still needs website wiring

Delivered here: the three isolated Make scenario blueprints and their input/output contracts. The AI prompts enforce one-question-at-a-time collection, null for missing information, no invented facts, no private-data scraping, no document certification, and no AI-controlled publication.

The website has a referral-lead workflow for Agent 1: public referral submissions are stored, available to agency admins, and optionally classified through the dedicated Make webhook. Agent 2/3 adapters are implemented in the local Worker and applicant status page, with a staff draft-review queue in the ATS. An approved draft can prefill the existing public-profile setup page's editable Public Introduction field, after server-side checks for applicant confirmation, staff approval, and active publication consent. The prefill is not a publish action. These flows require the additive `supabase/20261031_ats_agent_workflows.sql` migration and the two server-side Make webhook settings below. Do not send identity-document contents, medical records, addresses, or contact details to either agent.

Before enabling live Make scenarios:

- apply the ATS agent migration and configure the two HTTPS Make webhook secrets in the Worker;
- test Agent 2/3 with synthetic applicants and confirm that responses stay in the ATS workflow table and drafts remain private;
- keep the distinct, auditable staff publish action enabled; it remains gated by applicant confirmation, publication consent, agency-owned profile matching, and staff approval;
- transient Agent 2/3 Make calls now retry once for network, timeout, rate-limit, server, or malformed-JSON failures. Failed calls and invalid response contracts are written to `workflow_events` without storing the applicant's message or agent payload. This is an event audit trail, not a queued replay system; staff can ask the applicant to retry from the status page.

Do not add a parallel applicant database. Inspect and extend the existing Supabase ATS storage model through a migration once field ownership and access policy are finalized. Do not expose Supabase service-role credentials in Make or frontend code.

## Import and local setup

For each blueprint: Make → **Create a new scenario** → **Import Blueprint** → select the JSON file → create its custom webhook → select the Make AI Provider connection → save it disabled. Test with synthetic payloads before enabling any scenario. Store each webhook URL only in the server-side Worker secret/configuration used by its future adapter. Do not reuse `MAKE_WEBHOOK_URL_APPLICANT_INTAKE`; that hook belongs to the existing form-submission notification flow.

Server-only Worker secrets:

- `MAKE_WEBHOOK_URL_AGENT_1_LEAD_HUNTER`
- `MAKE_WEBHOOK_URL_AGENT_2_PROFILE_COLLECTOR`
- `MAKE_WEBHOOK_URL_AGENT_3_PROFILE_BUILDER`

The Worker must require HTTPS for all three and keep their URLs out of browser code. The Make AI Agent output is untrusted input: validate JSON shape and field types, enforce permissions in the Worker, and keep publication actions behind staff authentication.
