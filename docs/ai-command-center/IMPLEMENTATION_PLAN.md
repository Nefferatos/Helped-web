# At The Agency AI Command Center — Proposed Implementation Plan

**Status:** Proposal only. Prepared during Phase 1; no implementation authorization assumed.

## Architecture

Extend the protected agency dashboard and existing AI workspace. Route owner instructions to one chosen server-side orchestration path (Worker or Express, to be decided after endpoint ownership is verified). That backend authenticates the user, derives agency scope and role, retrieves only authorized operational records and approved policy knowledge, creates a structured plan, and records proposed actions. A controlled tool registry maps typed tool inputs to existing backend services and dedicated Make events. Sensitive actions are immutable proposals requiring owner approval bound to an exact canonical payload hash. The backend rechecks approval, permissions, consent, audience snapshot, and idempotency at execution. Make callbacks are authenticated and reconcile execution state; Make acceptance alone is not reported as delivery.

## Database migration plan

1. Compare current AI, marketing, consent, interview, knowledge, and audit table definitions across normalized setup, production schema, and dated migrations; establish which migration system is authoritative.
2. Verify deployed schema/RLS before writing a migration. Add only missing command, action, approval, execution, tool registry, conversation/message, knowledge-ingestion, and recipient-snapshot structures.
3. Use explicit agency/user ownership, state constraints, timestamps, payload hashes, idempotency keys, expiry, and foreign keys. Keep operational personal data out of shared policy embeddings.
4. Add indexes and any required vector extension/index/RPC only for approved agency knowledge. Keep applicant/employer records in scoped source tables.
5. Add RLS policies that deny browser writes to privileged action/execution tables and permit only the verified backend role; define read access for authorized dashboard users. Include rollback SQL or a documented forward-repair strategy.
6. Validate migration against a staging database and confirm RLS as authenticated and service-role contexts before production application.

## API architecture

Provide typed endpoints for command submission/history, action approval/rejection/cancellation, secure execution, execution status/reconciliation, knowledge upload/search/reprocess/delete, agent/tool status, and signed Make callbacks. All endpoints validate JWT, role, agency, schema, and rate limits. Tool invocation is server-side and allowlisted; arbitrary SQL/HTTP is prohibited. Execute independently reloads the action and approval and compares the approved payload hash. Callbacks verify signatures, timestamps, action association, and idempotency.

## AI architecture

Use a central planner with six explicit agent configurations: applicant, employer, marketing, operations, interview, and analytics. Agents receive only scoped tools and minimized context. The planner separates facts, inferences, and missing information, creates multi-step dependency graphs, and explains tool choices. Model/embedding providers and model names are configuration-driven. Deterministic backend policy, not prompts, controls authorization and execution. Reuse existing AI services only after selecting one authoritative gateway and preserving their current product routes.

## Make.com integration

Inventory existing blueprints and configured hooks with the owner. Reuse dedicated event/scenario contracts where appropriate and add only missing orchestration/agent/execution scenarios. Each scenario receives structured action IDs, payload hash, idempotency key, and minimal data; it asks the backend to authorize execution before external effects and sends a signed callback afterward. Treat provider response and per-recipient delivery outcomes distinctly. Never overwrite or recreate a working scenario. Do not put webhook URLs or secrets in the frontend or source-controlled examples.

## RAG implementation

Restrict initial RAG to approved agency policies/procedures. Use private Supabase Storage, validated MIME/type/size, duplicate hash/version tracking, ingestion job state, safe extraction, configurable chunking/embedding, and agency-scoped vector search. Store source/document/chunk references and access metadata. Retrieval must enforce user/agency permission before returning chunks. Personal applicant/employer documents stay in their existing private records unless a separately approved purpose and security design authorizes extraction. Operational facts are read live from source tables.

## Security architecture

Use existing auth and role model; explicitly identify owner/super-admin authorization. Deny by default. Enforce agency scope at every query and tool boundary; minimize PII; maintain audit events without copying unnecessary sensitive content. Bind approval to canonical action payload and recipient snapshot; expire approvals and invalidate them on any material change. Recheck contact consent, opt-outs, duplicates, and audience drift before broadcast. Require idempotency and prohibit blind retries after uncertain external outcomes. Keep secrets in Worker/backend secret stores. Apply rate limits, schema validation, output validation, callback signatures, and RLS.

## Testing plan

Before coding, inventory existing tests and test infrastructure. Add focused unit/integration coverage for auth/role scope, data boundaries, tools/schema rejection, planning/delegation, action state transitions, approval hash/expiry, consent and recipient drift, duplicate prevention, callback signature/idempotency, retries/reconciliation, RAG permissions, realtime authorization, and regression behavior for all preserved features. Use mocked Make and messaging providers; never send real messages in automated tests. Add staging smoke checks before deployment.

## Deployment plan

Deploy schema and backend in a staging environment first; configure secrets without exposing them; verify Make scenario contracts with mock/dry-run actions; verify existing routes and automations; then enable owner-only dashboard access. Roll out with feature flags and read-only/planning mode first. Enable sensitive execution only after approval and callback verification. Monitor failures, latency, usage, consent outcomes, and execution reconciliation. Production migration, secret setup, and Make activation require the system owner/operator.

## Rollback plan

Disable the feature flag and new Make trigger path first, preserving existing scenario URLs and legacy routes. Stop queued new actions safely; reconcile running/uncertain external actions before retry or cancellation. Revert backend/frontend deployment to the prior release. Keep audit and execution records. Prefer additive schema migrations; if rollback is needed, remove only new objects after confirming no active references, or leave inert tables where data preservation is safer. Restore previous Worker/Express routing and verify the existing employer chatbot, agency assistant, screening, interviews, notifications, matching, arrival monitoring, transcription, upload, Operations Center, and recruitment/marketing workflows.

## Implementation gates and outstanding decisions

1. Owner reviews this audit and plan.
2. Confirm live project/deployment topology, migrations/RLS, owner identity, and Make scenario configuration.
3. Agree on authoritative orchestration backend and initial feature boundary.
4. Only after owner authorization, implement in incremental, reviewable migrations and code changes, documenting credentials and external setup still required.

## Current external requirements (unverified)

No live Make or Supabase dashboard configuration was available during Phase 1. Required credentials, scenario activation, provider connections, callback signing secrets, enabled realtime tables, and production migration state remain unknown and must not be fabricated.
