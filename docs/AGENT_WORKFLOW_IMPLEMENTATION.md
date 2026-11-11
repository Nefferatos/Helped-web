# Agency agent workflow implementation

This document maps the requested five-agent journey onto the existing website. AI output is advisory: the website remains the source of truth, staff approves communications and document decisions, and each contact channel must have its own active consent.

## Current integration map

| Stage | Existing website foundation | Current gap |
|---|---|---|
| 1. Referral outreach | Referral lead intake, triage, Telegram invites, and a Telegram broadcast dashboard | Agent 1 currently classifies leads; it is not a universal broadcaster. Broadcast eligibility is limited to people who subscribed to Telegram or otherwise have recorded channel-specific permission. |
| 2. Applicant intake | ATS application, secure document upload, consented Agent 2 profile collection, and applicant status page | Agent 2 collects applicant-stated profile details; it must not inspect or certify identity or medical documents. Staff still verifies uploaded files. |
| 3. Employer matching | Hiring requirement flow and shortlist of up to five public profiles; client can choose interview candidates and record a preferred helper after interviews; staff can open the Operations Center with that helper and source request loaded for placement review | Availability and all profile details remain subject to agency confirmation. The existing Agent 3 blueprint is a profile-draft builder, not the employer shortlist. An exact client-email match may suggest an employer record, but staff confirms it. Placement creation validates the preferred candidate against the agency-scoped request. |
| 4. Interview coordination | Client interview selection is saved to the request, surfaced in the agency request view, and preloaded into the interview scheduler; employer invitations and confirmations, applicant invitations, reminders, and staff-managed outcomes remain available | Agent 4 drafts coordination messages and a checklist using scheduled interview facts plus agency-approved knowledge snippets. It does not send, schedule, or change status; staff handles those steps. |
| 5. Employer documents and signing | Private placement document storage, employer portal sharing, document requests, verification states, and staff review | Agent 5 prepares a metadata-only readiness checklist from document categories and checklist state, with approved guidance. It never reads file contents, verifies authenticity, changes review state, shares, or sends. Staff remains responsible for file review and the secure employer request action. |
| 6. Placement monitoring | Operations Board, deployment checklist, interviews, flight/medical/SIP/handover milestones, event alerts, and a scheduled three-day report | The report is one daily delivery with Today, Tomorrow, and Following day sections. Live email delivery requires the Make scenario and Worker secret to be configured. There is no autonomous AI agent continuously changing placements. |

## Guardrails for the remaining work

- Broadcast only to contacts with active permission for the selected channel. A referral or permission to share contact details does not automatically grant marketing consent.
- Keep application uploads in private website storage. Do not send passport, work-permit, medical, or other identity-document contents to an AI provider without a separately approved data-processing design.
- Agent 4 may draft coordination messages from the scheduled interview and approved guidance. Staff reviews and uses the existing send-invitation controls.
- Agent 5 should first compare required-document checklists and upload metadata. Any content extraction must be purpose-limited, access-controlled, logged, and routed to a human reviewer; AI cannot approve a document or decide legal eligibility.
- Keep daily reports tenant-scoped and send them only to the configured internal operations recipient.

## Remaining implementation sequence

1. Confirm production knowledge documents are approved, active, agency-scoped, and populated; local code cannot certify the live contents.
2. Confirm employer identity mapping for legacy clients whose client account email differs from their employer-record email. The handoff suggests exact email matches and preserves manual selection for unmatched or ambiguous accounts.
3. Confirm production knowledge documents are approved, active, agency-scoped, and populated; local code cannot certify the live contents.
4. Verify deployment configuration separately: Make scenarios, webhook secrets, Supabase migrations, and scheduled email recipient cannot be inferred from source code alone.
