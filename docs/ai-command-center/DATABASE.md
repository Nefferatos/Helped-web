# AI Command Center Database Plan

## Existing data model

The repository has a legacy `app_data` JSONB model and normalized Supabase setup. Relevant existing data includes ATS applications and applicant workflow state, employers and requirements, interviews, placement/arrival/deployment tasks, marketing consent and campaign/delivery records, knowledge documents/chunks, AI sessions/actions, and the durable Make webhook outbox. The exact production state must be confirmed against the target Supabase project before migration.

Existing code references `ai_conversations`, `ai_messages`, `ai_agent_logs`, and `ai_agent_actions`, but their DDL was not found in the checked-in SQL. The production schema instead defines `ai_sessions` and `ai_actions`. Phase 2 deliberately does not assume these are identical or overwrite either model.

## Additive foundation migration

`supabase/20261120_ai_command_center_foundation.sql` adds:

| Table | Purpose |
|---|---|
| `ai_commands` | Owner instruction, plan, agency/actor scope, lifecycle and summary. |
| `ai_command_actions` | Typed proposed tool call, agent, risk, payload and canonical SHA-256 payload hash. |
| `ai_approvals` | Approver decision, exact payload hash, decision time and expiry. |
| `ai_executions` | Idempotent execution ledger, provider reference and result reconciliation. |
| `ai_tool_registry` | Tool schema/agent mapping and approval/execution metadata; disabled by default. |
| `ai_knowledge_ingestion_jobs` | Knowledge processing state, content hash, attempts and error tracking. |

The migration enables RLS, revokes browser roles, and grants the service role access. This is a safe initial deny-by-default posture. A later API/read-model phase must provide owner/agency-scoped reads without granting browser clients direct action writes.

## Constraints and implementation notes

- Application code must canonicalize JSON consistently and calculate SHA-256 before storing `payload_hash` / `request_hash`.
- Approvals are append-only decisions in application behavior; a changed payload gets a new hash and requires fresh approval.
- `idempotency_key` is globally unique. A duplicate key must return the existing execution, not start another external action.
- `unknown` provider outcome must be reconciled before retry.
- Tool registry entries remain disabled until server-side input validation, permission checks, and execution methods are implemented.
- Avoid personal applicant/employer embeddings. Knowledge jobs associate only with the existing approved `knowledge_documents` model.
- The migration uses `CREATE TABLE IF NOT EXISTS`; it does not reconcile incompatible preexisting definitions. Inspect live DDL and take a backup before applying.

## Not included

No Supabase dashboard changes, migration execution, vector extension/index changes, direct realtime publication changes, data backfill, policy broadening, or Make webhook changes were performed in Phase 2.
