# Command Center Make.com Integration

## Inventory

The repository contains several existing Make blueprints, including `make/helped-command-center.blueprint.json` and event scenarios for marketing, deployment tasks, interviews, and arrivals. The `helped-command-center` blueprint is a legacy AI chat bridge (custom webhook → Make AI Agent → webhook response); it is not an execution dispatcher and must not be repurposed as one. Repository files do not reveal which scenarios are imported, active, or connected to production credentials.

## Command Center execution contract

The backend must authorize and create an execution record before Make can perform an external effect. The future dispatcher must send only this envelope to a dedicated scenario:

```json
{
  "schemaVersion": 1,
  "event": "ai_command.execute",
  "executionId": "<execution UUID>",
  "actionId": "<action UUID>",
  "agencyId": 1,
  "toolName": "<registered tool>",
  "idempotencyKey": "<stable unique key>",
  "payloadHash": "<sha256 of canonical approved payload>",
  "payload": {}
}
```

The `payload` must be the exact approved payload. Do not include browser tokens, service-role keys, unrelated applicant/employer records, or model prompts. Make must not treat webhook acceptance as delivery or completion. It must retain the IDs and idempotency key through each provider step and report per-recipient outcomes where the provider supports them.

## Signed callback contract

Send callbacks to the backend route `POST /api/ai-command-center/callbacks/make` with JSON fields `executionId`, `actionId`, `agencyId`, `status`, and optional `providerReference`, `result`, and `error`. Allowed statuses are `running`, `succeeded`, `partially_succeeded`, `failed`, `cancelled`, `expired`, and `unknown`.

The backend expects `x-ata-timestamp` as a 10-digit Unix timestamp and `x-ata-signature` as lowercase or uppercase hex HMAC-SHA256 of `<timestamp>.<canonical_json_body>`. Canonical JSON recursively sorts object keys and uses compact JSON serialization. The callback is rejected if it is older than five minutes, does not match the execution/action/agency tuple, or violates the execution state machine. Make scenario authors must verify that their chosen modules can produce this exact signature before enabling callback delivery; never weaken callback verification to accommodate serialization differences.

## Activation gate

The new `make/helped-ai-command-center-execution-dry-run.blueprint.json` is a separate ingress-only template. It echoes correlation fields in a `dry_run_received` response and has no provider, database-write, or callback module. It can validate webhook mapping after import but cannot be mistaken for successful execution. Keep it off until Phase 9 adds the protected dispatch path. No Command Center execution webhook URL or callback secret is configured by this phase, and there is no dispatch endpoint yet, so existing scenarios cannot be triggered by Command Center actions. Phase 9 must add owner approval and an execution gateway that reloads the action, approval, expiry, payload hash, tool allowlist, agency scope, and idempotency state before calling Make. Only then can this dry-run template be connected and tested. Keep the legacy chat scenario and every existing scenario unchanged.

Before production activation, the operator must inventory active Make scenarios and owners, select a dedicated scenario, configure its connections and webhook URL as backend secrets, configure `AI_COMMAND_CENTER_CALLBACK_SECRET` only in the backend secret store and Make connection, validate callback canonicalization, test duplicate delivery/idempotency, and verify provider outcomes. None of these external account actions were performed here.
