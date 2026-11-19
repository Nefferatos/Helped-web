# Website and Make.com Workflow Architecture

This guide describes the checked-in integration paths as of 18 November 2026. It distinguishes website behavior from Make.com behavior because a configured webhook URL does not prove that a Make scenario is enabled or delivering successfully.

## System boundaries

```text
Employer / applicant / agency staff
                |
                v
Website frontend -> Worker API -> Supabase / private object storage
                         |                 |
                         |                 +-> scheduled interview reminders
                         |                 +-> scheduled deployment reports
                         |
                         +-> durable Make outbox -> configured Make webhooks
                         +-> Resend email (where the route uses direct email)
                         +-> Google Sheets (agency reports and referral import)
```

The website database is the source of truth for employer requests, messages, interviews, documents, placement tasks and verification states. Make is an integration/notification layer. Make responses or scenario completion do not prove that a real-world placement step occurred.

## Event and handoff inventory

| Workflow | Website trigger and behavior | External handoff / current limit |
|---|---|---|
| Applicant intake | Public application is saved and sent to the configured intake integration. | Requires `MAKE_WEBHOOK_URL_APPLICANT_INTAKE` and an active matching Make scenario. |
| Applicant agents / profile | Staff or applicant starts the relevant profile-draft flow; website keeps approval and publication controls. | Requires the corresponding Agent 1–3 Make hooks and active scenarios. Do not treat an AI draft as verified identity or approved profile data. |
| Employer request and matching | Employer submits a request, reviews matches and communicates with the agency in the portal. Agency staff controls shortlist and placement progression. | Website request/message persistence is internal; no Make action should be treated as employer agreement or candidate availability confirmation. |
| Interview scheduling | Agency staff saves/reschedules interviews. Worker records interview state, schedules reminders, and queues a privacy-minimized staff alert. Direct participant email paths use Resend and `.ics` calendar attachments. | The new `helped-interview-calendar-sheet.blueprint.json` creates a private Calendar event, sends its guest invitation, writes an Interviews sheet row, and returns IDs that the Worker stores. Rescheduling sends those IDs so Make updates the same event and row. Employer invitations and reminders still use the email service. The blueprint is not live until imported, connected, and verified in Make. |
| Employer placement documents | Employer uploads files to the private document flow; agency staff reviews them. | Private Drive copy requires its dedicated integration. The application does not automatically infer or approve legal/document validity. |
| Document autofill | Staff initiates the available biodata PDF and contract draft autofill integrations. | The 15 named forms do not yet form one approved, end-to-end packet generator. Each template and field mapping needs agency validation before automatic creation or sending. |
| Placement operations | Staff records flights and verifies milestones; Worker derives insurance, ticket, and SG Arrival Card task deadlines, enforces handover prerequisites, and creates 30/90-day follow-up tasks. Staff can explicitly email the secure contractor task link to an address they enter. | Make receives idempotent events through the deployment outbox. The three-day report and staff alerts require deployed scheduled Worker configuration and live Make routing. Contractor email requires the Resend service and staff confirmation of the recipient; without it the link remains available for manual sharing. |
| Medical / permit | Staff records medical, SIP, and work-permit outcomes; handover is blocked until required items are verified or explicitly marked not applicable by staff. | No medical-report AI decision or official MOM/ICA permit integration is present. Keep these outcomes staff-controlled. |
| Google Sheets reports | Agency staff tests and pushes configured reports using the server-side Google Sheets client; referral import reads a bounded range and applies the website's validation/consent checks. | Requires valid Google service-account credentials, spreadsheet access, and agency sheet configuration. This reporting path is not an interview-calendar sync. |
| Contract and signatures | Website stores contract records and staff-managed contract workflow. | No e-signature vendor credentials or callback integration are configured in this repository. A recorded status is not a legally verified signature unless the staff process confirms it. |

## Interview flow details

1. Agency staff schedules or reschedules an interview in the agency portal.
2. The Worker stores the interview in Supabase. Reminder delivery requires the interview lifecycle migration, scheduled Worker execution, and verified email sender configuration.
3. The Worker puts a staff-alert event in the durable Make outbox. The configured staff-alert scenario should send an internal notification; outbox retries are idempotent by event ID.
4. Maid invitations use the dedicated interview Make hook if configured; otherwise the direct Resend path attaches an importable `.ics` file. Employer invitations are sent by Resend after staff verifies the employer contact and include a secure confirmation link plus `.ics` file.
5. With the dedicated Make scenario configured, its Google Calendar event and Sheets row references are saved on the interview, and a reschedule updates them. Without that scenario, Resend sends an importable `.ics` file and no server-side Google Calendar or interview-sheet sync occurs. The recruiter portal reports whether calendar/sheet sync was confirmed.

Never point an interview-specific payload at a generic orchestrator URL. Use the dedicated variables documented in the Worker automation inventory. This avoids sending a notification payload into an unrelated classifier/website request router.

## Safe activation checklist

1. Apply the required Supabase migrations documented in `docs/OPERATIONAL_WORKFLOW_IMPLEMENTATION.md` before deploying APIs that depend on them.
2. Configure each required Worker secret with its matching Make webhook. Do not put secrets in frontend `VITE_*` variables.
3. In Make, verify the correct scenario is enabled, provider connections are valid, recipient addresses are approved, and payload fields map to the expected modules.
4. Enable/confirm the Cloudflare scheduled trigger for reminder and daily-report jobs.
5. Run a staging scenario for each flow and inspect both the website record/outbox delivery state and Make run history. Verify duplicate-event retries do not create duplicate messages or records.
6. Confirm access controls and retention for employer identity, applicant data, and private documents before adding Sheets, Drive, email, or contractor recipients.

## Evidence limits and remaining work

The repository and local development configuration can show which hook variables are configured and which code paths enqueue events. They cannot inspect production Cloudflare secrets, prove Make scenario activation, prove a recipient received a message, or certify a recent successful Make run. A user-provided screenshot can show a scenario toggle at the time of capture, but not successful delivery history.

The workflow therefore cannot be called 100% automated from code alone. Remaining work includes production secret/migration deployment, importing and connecting the interview Calendar/Sheets blueprint, live Make activation and run verification, and agency-approved mappings for the 15 document forms. Contractor notification has an optional email path, but it requires a staff-entered recipient and a configured Resend sender. Medical review, immigration/permit decisions, document validity, employer/helper agreement, contractor handover confirmation, and staff verification remain human responsibilities.
