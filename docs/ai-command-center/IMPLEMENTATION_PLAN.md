# At The Agency AI Command Center — Proposed Implementation Plan

**Status:** Phases 1–7 and 9–11 have local implementation. Phase 8 Make integration is still incomplete until connected to an owned scenario and verified end to end. Phase 9–11 runtime/staging checks, database migrations, and external configuration remain unverified.

## Architecture

Extend the protected agency dashboard and existing AI workspace. The Cloudflare Worker is the authoritative Command Center planning path because the deployed dashboard, agency auth, Workers AI binding, and Supabase integration already live there. The Express approval endpoints remain a server-side security foundation; they do not create a competing planner. The Worker authenticates the agency admin, derives agency/actor scope, retrieves approved policy knowledge, creates a validated structured plan, and stores the conversation and command. Tool execution remains a later phase.

## Database migration plan

1. **Completed locally:** inspected checked-in schema and identified existing AI and RAG tables plus undocumented DDL references.
2. **Completed locally:** added `supabase/20261120_ai_command_center_foundation.sql` for additive commands, actions, approvals, executions, tool registry, and knowledge job tracking. Browser roles have no table privileges; tools are disabled by default.
3. **Completed locally:** added architecture and database documentation. Existing sessions/actions, conversation tables, RAG chunks, campaigns, consents, and outbox were not recreated or rewritten.
4. **External verification still required:** compare the migration against the live target schema and RLS, then apply in staging before production. This phase did not apply any SQL or change live realtime configuration.

## Phase 3 security baseline

- **Completed locally:** Command Center table RLS/privilege baseline in the additive migration; admin middleware derives agency scope from authenticated session and applies a rate limit.
- **Completed locally:** security requirements and known authorization gaps documented in `docs/ai-command-center/SECURITY.md`.
- **Implemented locally:** owner ID allowlist, hash-bound approval/rejection endpoint, signed callback verification, state transition checks, and execution-ledger updates.
- **Not implemented yet:** external action dispatch and a unified event audit log. Approval cannot cause a side effect until a later phase implements the allowlisted execution gateway and its consent/idempotency checks.
- **Unverified:** whether the user applied the Phase 2 migration and whether the production database role used by the Express backend has the intended privileges.

## API architecture

Provide typed endpoints for command submission/history, action approval/rejection/cancellation, secure execution, execution status/reconciliation, knowledge upload/search/reprocess/delete, agent/tool status, and signed Make callbacks. All endpoints validate JWT, role, agency, schema, and rate limits. Tool invocation is server-side and allowlisted; arbitrary SQL/HTTP is prohibited. Execute independently reloads the action and approval and compares the approved payload hash. Callbacks verify signatures, timestamps, action association, and idempotency.

## AI architecture

Use a central planner with six explicit agent configurations: applicant, employer, marketing, operations, interview, and analytics. Agents receive only scoped tools and minimized context. The planner separates facts, inferences, and missing information, creates multi-step dependency graphs, and explains tool choices. Model/embedding providers and model names are configuration-driven. Deterministic backend policy, not prompts, controls authorization and execution. Reuse existing AI services only after selecting one authoritative gateway and preserving their current product routes.

## Make.com integration

Inventory existing blueprints and configured hooks with the owner. Reuse dedicated event/scenario contracts where appropriate and add only missing orchestration/agent/execution scenarios. Each scenario receives structured action IDs, payload hash, idempotency key, and minimal data; it asks the backend to authorize execution before external effects and sends a signed callback afterward. Treat provider response and per-recipient delivery outcomes distinctly. Never overwrite or recreate a working scenario. Do not put webhook URLs or secrets in the frontend or source-controlled examples.

## Phase 8 Make.com integration

**Prepared locally:** inventoried repository blueprints and documented the dedicated Command Center execution envelope, signed callback contract, privacy limits, idempotency expectations, and activation gates in `docs/ai-command-center/MAKE_INTEGRATION.md`. The existing `helped-command-center` blueprint is identified as a legacy chat bridge and preserved.

**Not complete:** repository files cannot confirm Make scenario activation, ownership, connections, or credentials. No Command Center execution dispatcher or dedicated external-effect scenario is enabled at this phase; Phase 9 must provide the approval-gated dispatcher before Make can receive actions. Callback signing compatibility must be demonstrated before any scenario is activated. Do not treat Phase 8 as complete until the dedicated scenario is connected and the signed callback path is tested.

## Phase 9 approval workflow

**Completed locally:** added Worker-side owner-only `GET /api/ai-command-center/actions/pending` and hash-bound `POST /api/ai-command-center/actions/:actionId/review` routes. They authorize the authenticated `attheagency` account, derive agency scope from the Worker session, and return the exact payload and stored SHA-256 hash for review.

**Completed locally:** added `supabase/20261120_ai_command_review_rpc.sql` to atomically lock the proposal and command, verify status and payload hash, record the owner decision, and apply the 15-minute approval expiry. Proposals do not execute external work. Make dispatch remains disabled until a separately reviewed execution gateway is available.

**External verification required:** apply the foundation and review-RPC migrations, then verify the queue and review endpoints using the `attheagency` account and a different account in staging. No live database access was available here.

## Phase 10 React Command Center

**Updated locally:** `/agencyadmin/ai-command-center` uses the authenticated agency assistant chat endpoint for natural-language answers and supported website tasks. The assistant can propose allowlisted website actions and the UI asks staff to confirm the exact change before calling the normal authenticated API. The Worker validates actions against agency data and its server-side capability allowlist. WhatsApp campaign launch and automatic reply settings use the existing consent-aware campaign and settings APIs, with explicit chat confirmation.

**Phase boundary:** this is scoped website-agent control, not arbitrary computer or source-code control; new tasks must be added to the server capability allowlist and validated against agency data. WhatsApp sending still depends on the existing sender webhook, active Make scenario, WAHA connection, and per-contact consent checks. The separate Command Center execution dry-run blueprint only acknowledges webhook input and is not required for these website API actions.

**Completed locally:** added Vite proxy rules to send planning, catalog, approval, and execution-status calls to the Worker, matching the deployed Cloudflare architecture.

**External verification required:** apply the review RPC migration and verify owner/non-owner behavior against the running Worker. The approval UI is not a substitute for server-side owner checks.

## Phase 11 realtime execution monitoring

**Completed locally:** added owner-only agency-scoped `GET /api/ai-command-center/executions` snapshots to the Cloudflare Worker. The frontend polls at most 50 minimal execution status rows every five seconds; raw results and error text are not returned.

**Completed locally:** added a live activity panel to the React Command Center. It uses bearer-authenticated polling; the browser has no direct access to service-role-only tables.

**External verification required:** set the Worker owner allowlist and verify polling with real execution ledger changes in staging. Phase 8 Make is incomplete and no dispatch path is enabled, so this monitor may remain empty until a later approved execution gateway writes ledger entries. No Supabase realtime publication or browser table grant was added.

## RAG implementation

**Phase 4 completed locally:** added `supabase/20261120_ai_command_center_rag.sql`, a versioned pgvector index/search function, model configuration, content hashing/deduplication, bounded chunking, source metadata, private Storage for supported text uploads, document list/version/reprocess/soft-delete endpoints, and the knowledge-library upload/actions UI. Retrieval is agency-scoped and filters to active, successful current versions.

**Format limitation:** TXT and Markdown are supported for file upload. PDF, DOCX, XLSX and XLS extraction are not enabled; those sources must not be treated as ingested. Applicant/employer private files are excluded.

**External verification required:** apply the RAG migration in the same target project, confirm the Phase 2 foundation where applicable, vector extension availability, private bucket, RPC permissions, AI binding, and end-to-end retrieval. No live database change was made.

## Phase 5 central orchestrator

**Completed locally:** added `/api/ai-command-center/commands` to the authenticated Cloudflare Worker. It validates instructions and conversation ownership, retrieves recent conversation messages and approved knowledge, asks the configured model for a plan, validates agent IDs/step dependencies, applies a deterministic approval-required signal for sensitive verbs, persists the plan as a draft, and records source references. A rate limit is applied per agency admin. Failed plans are marked failed when a command record exists.

**Completed locally:** added `supabase/20261120_ai_command_orchestrator.sql` for actor/agency-scoped command conversations and transcript messages with service-role-only access.

**Execution boundary:** the route returns `executed: false`; it does not search operational records or invoke tools. Phase 7 adds only a separately callable read-only policy knowledge search. No approval is inferred merely from the plan's risk field.

**External verification required:** apply the command foundation, RAG, and orchestrator migrations in order; configure the AI provider/Workers AI; and verify the authenticated route against the intended Supabase project.

## Phase 6 specialized agents

**Completed locally:** added six explicit agent definitions in `functions/api/services/ai/commandAgents.ts`, each with a planning prompt, purpose, capabilities, allowed data boundaries, prohibited operations, and approval rules. The orchestrator prompt is generated from this registry; model-returned agent IDs are checked against the same definitions and the persisted plan includes the display name, data scope, and capabilities for every step.

**Completed locally:** added authenticated `GET /api/ai-command-center/agents`. It returns the static catalog with `planning_only` status and the tools permitted for each agent. It does not report synthetic activity or claim any agent has queried live records.

**Phase boundary:** operational record tools, activity history, and availability checks remain future work. No additional SQL migration or external credentials are needed for this static configuration.

## Phase 7 tool registry

**Completed locally:** added `functions/api/services/ai/commandTools.ts` as a server-side allowlist with strict input validation, agent authorization, read-only classification, approval metadata, and a typed Worker-function executor. The initial registered tool, `search_approved_knowledge`, retrieves only active agency knowledge through the existing agency-scoped RAG path.

**Completed locally:** added authenticated `GET /api/ai-command-center/tools` and `POST /api/ai-command-center/tools/:toolName/execute`. The execution route derives agency and actor from the authenticated admin session, validates the agent and tool input, applies per-actor rate limiting, and exposes no arbitrary SQL, URL, table, or method selection.

**Phase boundary:** no applicant/employer operational record tools, writes, Make calls, or external actions are registered. The database `ai_tool_registry` remains disabled-by-default and is not the runtime authority; code allowlists remain authoritative until a reviewed database-backed registry sync is implemented. The central planner remains planning-only and does not automatically execute suggested tools.

## Security architecture

Use existing auth and role model; explicitly identify owner/super-admin authorization. Deny by default. Enforce agency scope at every query and tool boundary; minimize PII; maintain audit events without copying unnecessary sensitive content. Bind approval to canonical action payload and recipient snapshot; expire approvals and invalidate them on any material change. Recheck contact consent, opt-outs, duplicates, and audience drift before broadcast. Require idempotency and prohibit blind retries after uncertain external outcomes. Keep secrets in Worker/backend secret stores. Apply rate limits, schema validation, output validation, callback signatures, and RLS.

## Testing plan

Before coding, inventory existing tests and test infrastructure. Add focused unit/integration coverage for auth/role scope, data boundaries, tools/schema rejection, planning/delegation, action state transitions, approval hash/expiry, consent and recipient drift, duplicate prevention, callback signature/idempotency, retries/reconciliation, RAG permissions, realtime authorization, and regression behavior for all preserved features. Use mocked Make and messaging providers; never send real messages in automated tests. Add staging smoke checks before deployment.

## Deployment plan

Deploy schema and backend in a staging environment first; configure secrets without exposing them; verify Make scenario contracts with mock/dry-run actions; verify existing routes and automations; then enable owner-only dashboard access. Roll out with feature flags and read-only/planning mode first. Enable sensitive execution only after approval and callback verification. Monitor failures, latency, usage, consent outcomes, and execution reconciliation. Production migration, secret setup, and Make activation require the system owner/operator.

## Rollback plan

Disable the feature flag and new Make trigger path first, preserving existing scenario URLs and legacy routes. Stop queued new actions safely; reconcile running/uncertain external actions before retry or cancellation. Revert backend/frontend deployment to the prior release. Keep audit and execution records. Prefer additive schema migrations; if rollback is needed, remove only new objects after confirming no active references, or leave inert tables where data preservation is safer. Restore previous Worker/Express routing and verify the existing employer chatbot, agency assistant, screening, interviews, notifications, matching, arrival monitoring, transcription, upload, Operations Center, and recruitment/marketing workflows.

## Implementation gates and outstanding decisions

1. Owner reviews the Phase 1 audit and Phase 2 schema/architecture artifacts.
2. Confirm live project/deployment topology, migrations/RLS, owner identity, and Make scenario configuration.
3. Agree on authoritative orchestration backend and initial feature boundary.
4. Proceed to Phase 3 only after reviewing live migration state and backend authorization design.

## Current external requirements (unverified)

No live Make or Supabase dashboard configuration was available during Phase 1. Required credentials, scenario activation, provider connections, callback signing secrets, enabled realtime tables, and production migration state remain unknown and must not be fabricated.
