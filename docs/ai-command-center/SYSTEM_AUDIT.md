# At The Agency AI Command Center — System Audit

**Audit date:** 20 November 2026  
**Scope:** Repository inspection only (Phase 1). No production code, database, or Make configuration was changed.

## Executive summary

This is an existing React/TypeScript agency platform with two server-side paths: a Cloudflare Worker in `functions/` (including the large API router `functions/api/[[...path]].ts`) and a separate Express/TypeScript service in `backend/`. Supabase is used for durable application data and auth; code also supports normalized tables and private Storage. Make.com integrations, campaign workflows, interview workflows, AI assistants, a command-center screen, and RAG-related storage/retrieval code already exist. The requested system is therefore an extension and consolidation effort, not a blank-slate build.

The source tree does not establish which migrations have been applied, which Worker secrets are populated, or which Make scenarios are active. Those are deployment facts and need owner/operator verification before implementation or any completion claim.

## Repository and application architecture

- Root project contains `frontend/`, `backend/`, `functions/`, `supabase/`, and `make/`.
- Frontend: React 18, TypeScript, Vite, React Router, Tailwind/shadcn-style components. See `frontend/package.json`, `frontend/vite.config.ts`, and `frontend/src/App.tsx`.
- Hosting/API: Cloudflare Pages/Worker configuration is in `wrangler.toml`; the Worker API routes through `functions/api/[[...path]].ts`. The root scripts build frontend and deploy the Cloudflare application.
- Secondary API: Express routes and controllers are under `backend/src/`, with its own package/config and `backend/schema.sql`. This overlaps some Worker responsibilities and should be mapped carefully before adding endpoints.
- No `AGENTS.md` files were found in the repository during this audit.

## Frontend entry points, routing, and reusable UI

- Entry points: `frontend/src/main.tsx` and `frontend/src/App.tsx`.
- Agency routes are protected with `ProtectedAdminRoute` and generally wrapped in `AdminShell`.
- Existing agency AI routes include `/agencyadmin/ai-agents`, `/agencyadmin/ai-marketing`, `/agencyadmin/ai-hr-interviewer`, and `/agencyadmin/tiktok`. There is no route at the requested `/dashboard/ai-command-center` currently.
- `frontend/src/pages/AiAgentsPage.tsx` is substantial and contains `GlobalAiCommandCenter` plus conversation/action UI. It is the primary reuse candidate; inspect its actual persistence and action semantics before extending it.
- Other reusable pages/components include `AiDirectMarketingPage`, `AgencyOperationsCenterPage`, `AgencyReportsPage`, `AtsRecruitmentPage`, `WhatsAppBroadcastPage`, `TelegramBroadcastPage`, `MaidInterviewsPage`, `AdminShell`, and shared `components/ui/`.

## Authentication and authorization

- Frontend Supabase client (`frontend/src/lib/supabaseClient.ts`) is initialized with a public anon key only. Admin route protection is handled by existing agency auth logic.
- Worker API includes Supabase token verification and actor/agency authorization paths, plus role-sensitive controls in applicant, employer, and agency endpoints.
- Express has `requireAgencyAuth`, `requireAgencyRole`, and `requireSupabaseAuth` middleware. Agency roles include `SUPER_ADMIN`, `DOCUMENT_REVIEWER`, `RECRUITER`, `CONTRACTOR`, `EMPLOYER`, and `CANDIDATE`, with legacy role compatibility.
- AI conversation/action/log tables documented in `docs/ai-agent-architecture.md` are described as RLS enabled and service-role-only. Knowledge document/chunk tables in the production SQL are also service-role-only. Policies must be audited table-by-table before extending privileges.
- Repository inspection cannot prove live RLS state or role assignments. Existing service-role access and legacy blob storage mean every new action endpoint must enforce identity and scope server-side.

## Database and storage inventory (repository evidence)

The repository contains both a legacy `app_data` JSONB model and normalized Supabase schema/migrations. Core normalized entities include agency admins/sessions, clients, employers, maids, enquiries, employment contracts, ATS applications/profiles/scores/history/documents/notifications, interviews/participants, arrival and deployment tasks, requests/messages, marketing campaign/delivery data, and knowledge documents/chunks. Exact definitions are in `supabase/normalized_project_setup.sql`, `supabase/helped_full_production_schema.sql`, dated SQL files, and `backend/schema.sql`.

AI persistence includes `ai_conversations`, `ai_messages`, `ai_agent_logs`, `ai_agent_actions`, and feedback/config tables referenced by `supabase/helped_full_production_schema.sql` and the architecture documentation. Existing vector work includes `supabase/maid_embeddings.sql` (maid-specific 384-dimensional vectors) and knowledge documents/chunks. Do not treat this as a private-personnel RAG index: applicant documents and personal data remain in scoped operational storage.

Marketing-related schema includes campaigns, recipient/delivery records, and consent-related migrations such as `supabase/20261116_marketing_consents.sql`, `20261107_marketing_message_deliveries.sql`, and the WhatsApp/Telegram broadcast migrations. Broadcast eligibility is channel-specific and existing workflow documentation explicitly restricts recipients by consent and opt-out state.

## AI services and existing command center

- Worker AI modules: `functions/api/services/ai/{agents,autopilot,embeddings,groq,openai,prompts,tools}.ts`.
- Worker endpoints include public receptionist, employer support/recommendation, agency assistant, applicant screening, content generation, and analytics. Routes have different auth scopes; public and authenticated paths must not be conflated.
- Express also has `aiOrchestratorService.ts`, `aiGateway.ts`, `aiController.ts`, AI-related routes, and audit services. This is a second orchestration surface and potential source of duplicated policy.
- `docs/ai-agent-architecture.md` describes seven role-specific assistant profiles (including public receptionist) and existing conversation/action/log memory. It is not proof that the requested six-agent orchestration is already implemented end-to-end.
- `AiAgentsPage.tsx` contains some confirmation-gated applicant actions and website API actions. The current interaction-level confirmation is not equivalent to persisted, payload-hash-bound owner approval enforced at the execution gateway.

## Existing operational functionality and preservation points

Repository paths document or implement the requested preserved capabilities: public/employer chatbots; agency assistant; ATS screening and staff review; interviews and calendar/Sheets sync; applicant/employer email notification; employer/helper matching; arrival/deployment monitoring; voice/media transcription; private file upload; Operations Center/Board; recruitment and marketing automation. Primary implementation areas include Worker AI routes, `backend/src/controllers/` and `services/`, `frontend/src/pages/`, and `make/*.blueprint.json`.

The Make folder includes blueprints for applicant intake, applicant/profile agents, FDW chatbot, command center, marketing events, interviews, contractor arrival, deployment tasks, PDF autofill, media transcription, and WhatsApp/Telegram. `docs/MAKE_WORKFLOW_ARCHITECTURE.md` notes that checked-in blueprints are not proof of live activation and records current limitations. Keep existing dedicated webhook variables and do not route specialized payloads through generic hooks.

The user's supplied historical hook references are not independently verifiable from repository files or available external configuration in this audit. No Make dashboard or Supabase dashboard was accessed. Do not infer webhook URLs, scenario status, or credentials from blueprint IDs or comments.

## Existing security controls and gaps to account for

- Server-side secrets are represented as Worker environment bindings; frontend Supabase uses anon credentials. Never copy secret values into frontend or documentation.
- Worker and Express have auth middleware, agency roles, rate limiting, request validation in multiple paths, audit logging, consent checks, and private storage paths.
- Existing production SQL enables RLS on selected operational tables and limits AI/knowledge tables to service role. The repository contains multiple SQL setup/migration styles; deployment order and live drift need reconciliation.
- Existing broadcast code documents consent rechecks, opt-out suppression, de-duplication, recipient selection, and delivery records. Preserve these controls and review the actual execution path before integration.
- Risks to resolve before implementation: overlapping Worker/Express AI endpoints; blob and normalized persistence modes; absence of proof that all migrations are applied; action approval semantics distributed between UI and server; callback authentication/idempotency needs verification; existing generic Make fallback behavior must not accidentally be reused for sensitive operations.

## Integration conflicts and reuse decisions

1. Reuse the protected agency layout, AI workspace, current repositories/services, campaigns/consent, interview lifecycle, and audit trail where their data contracts fit.
2. Choose one authoritative command orchestration and action-execution path after mapping Worker versus Express deployment responsibility. Avoid creating a third independent path.
3. Extend existing conversation/action records only after validating columns, constraints, RLS, and deployed migration state.
4. Add agency-policy RAG independently from applicant/employer private operational records. Query current applicant/employer/interview/arrival state from authorized source tables and avoid a global personal-data vector index.
5. Integrate through existing dedicated Make events where compatible. New scenarios/webhooks require actual owner-side configuration and verification; code alone cannot activate them.

## Open verification items

- Confirm the production database/project and applied migration set, RLS policies, Storage buckets, and realtime publication settings.
- Confirm which of Worker or Express serves each production endpoint and which persists AI conversations/actions.
- Confirm live Make scenario names, webhook bindings, activation, and callback behavior without exposing webhook secrets.
- Confirm configured AI/embedding providers, data retention, and approved knowledge document corpus.
- Confirm owner role identity and exact approval policy for sensitive actions.

## Audit conclusion

There is significant reusable functionality, but the target command-center acceptance flow is not demonstrated by repository evidence as a complete, secured, live path. Phase 1 is complete as a source audit. No production behavior was modified.
