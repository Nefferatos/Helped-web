# AI Command Center Security

## Phase 3 security baseline

The foundation migration enables RLS for every new Command Center table, revokes `anon` and `authenticated` table privileges, and grants table access only to `service_role`. A service-role policy is included for PostgREST access. Browser clients must never receive service-role credentials or write directly to these tables.

The Cloudflare Worker is authoritative for the deployed Command Center. It derives agency and actor scope from `requireAgencyAdminAuth`; formal owner review is restricted to the authenticated `attheagency` account. The same identity rule is used by the legacy Express review routes. Numeric admin IDs and client-supplied `agencyId` values do not grant owner access or determine query scope.

`backend/src/routes/aiCommandCenterRoutes.ts` exposes proposal creation, owner review, and signed Make callback endpoints. Callback verification uses `AI_COMMAND_CENTER_CALLBACK_SECRET`; signatures are HMAC-SHA256 over `<unix_timestamp>.<canonical_json_body>` in `x-ata-timestamp` and `x-ata-signature` headers, with a five-minute replay window. Keep this secret server-side and configure Make only after the callback contract has been tested.

Routes mounted at `/api/ai-command-center`:

- `GET /actions/pending` (Worker; configured owner): lists at most 100 pending actions for the authenticated agency, including the exact payload and hash needed for review.
- `POST /actions/:actionId/review` (Worker; configured owner): calls the transactional review RPC, which locks the action and command and checks the exact hash and `awaiting_approval` state.
- `GET /executions` (Worker; configured owner): returns at most 100 minimal agency-scoped execution status rows. The browser polls this endpoint and never gets direct access to service-role tables.
- `POST /actions` (agency admin session): records an awaiting-review command/action proposal; does not execute it.
- `POST /callbacks/make` (HMAC signature): accepts valid execution status transitions associated with the exact execution, action, and agency IDs.

The review RPC migration `supabase/20261120_ai_command_review_rpc.sql` must be applied before the review endpoint can record a decision. The backend checks the authenticated account's `attheagency` username and derives the agency and approver IDs from that verified session.

The callback sender signs the parsed JSON body using recursively sorted object keys and compact JSON serialization. It sends a 10-digit Unix timestamp plus a lowercase hexadecimal HMAC-SHA256 signature. The body must include `executionId`, `actionId`, `agencyId`, and an allowed `status`. Duplicate or out-of-order terminal updates return 409. Configure the two environment variables in the backend secret store; `.env.example` contains blank placeholders only.

The review endpoint records owner decisions transactionally, linked to the exact payload hash, and rejects stale or repeated decisions. There is deliberately no external action execution endpoint yet: approval cannot trigger external work until a later phase adds the allowlisted dispatcher and independently rechecks approval, expiry, consent, and idempotency.

## Required controls for later API phases

The Phase 7 Worker tool catalog is code-defined and allowlisted. Its only enabled tool, `search_approved_knowledge`, validates a bounded query and calls the existing RAG function with the authenticated administrator's agency ID. The executor accepts no caller-provided table name, URL, HTTP method, SQL, or agency scope. Per-actor rate limiting applies. This tool is read-only and does not require action approval; any future write or external tool must use a distinct execution path with approval, consent, idempotency, and audit checks.

- Verify authentication and authorization on every request. Fail closed when the auth store is unavailable.
- Resolve the authenticated agency and actor from server-side session state. Never accept either from the body as authority.
- Owner review is limited to the exact authenticated `attheagency` account; administrator role alone does not grant owner access.
- For every action execution, reload action and approval server-side, require an unexpired `approved` decision for the same action and identical payload hash, and verify the agency matches.
- Validate tool names and inputs against a server-side allowlist and schema. No arbitrary SQL or model-provided URLs.
- Enforce consent, opt-outs, audience snapshot identity, and material audience-change checks again immediately before broadcast.
- Use idempotency keys and persist `unknown` outcomes. Never blindly retry a possibly accepted external action.
- Authenticate Make callbacks with a dedicated signature and replay window, verify execution/action association, and make callbacks idempotent.
- Audit actor, action, outcome, timestamps, payload hash, and minimal metadata. Avoid duplicating sensitive personal content into logs.
- The legacy Express agency auth helper caches admin sessions for up to 12 hours and may fall back to a cached record on database errors. The Worker session cache is shorter, but it also must not be treated as a substitute for fresh revocation checks before high-impact execution is enabled.

## Verification status

The user-provided read-only Supabase result showed `knowledge_documents` with its service-role-only RLS policy and no rows for the six newly proposed AI Command Center tables. This is consistent with applying the new-table migration, but it does not verify the full live schema, grants, project identity, or migration execution result. The migration remains unverified unless the user confirms it ran successfully.

No external action endpoints or callback secrets are configured by this phase. Existing employer, applicant, campaign, and operations routes remain unchanged.
