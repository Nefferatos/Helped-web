#!/usr/bin/env node
/**
 * Diagnose *why* a Make.com webhook is failing — via the Make API, instead of guessing.
 *
 * Two things make "Scenario failed to complete." hard to debug from the outside:
 *   1. The scenario behind a webhook URL is not always the scenario you have open in
 *      the editor (a webhook can only be assigned to ONE scenario).
 *   2. A scenario whose blueprint has `meta.dlq: false` DISCARDS failed runs, so the
 *      scenario history can legitimately look empty.
 * This script resolves webhook -> scenario -> live blueprint, then pulls the error
 * logs (execution-level and per-module) for that scenario.
 *
 * Required env (add to .env — never commit it):
 *   MAKE_API_TOKEN   Make → Profile → API access tokens. Scopes: hooks:read, scenarios:read, dlqs:read
 *   MAKE_TEAM_ID     the number in your Make URL: https://eu1.make.com/<teamId>/scenarios
 * Optional env:
 *   MAKE_ZONE        defaults to the zone found in the webhook URL (e.g. eu1)
 *
 * Usage:
 *   node --env-file=.env scripts/diagnose-make-webhook.mjs
 *   node --env-file=.env scripts/diagnose-make-webhook.mjs --var=MAKE_WEBHOOK_URL_GOOGLE_DRIVE_SYNC
 *   node --env-file=.env scripts/diagnose-make-webhook.mjs --hook=https://hook.eu1.make.com/<udid>
 *   node --env-file=.env scripts/diagnose-make-webhook.mjs --scenario=12345 --hours=72
 */

const args = process.argv.slice(2);
const flag = (name, fallback = "") => {
  const prefix = `--${name}=`;
  const found = args.find((a) => a.startsWith(prefix));
  return found ? found.slice(prefix.length).trim() : fallback;
};

const hookVar = flag("var", "MAKE_WEBHOOK_URL_MEDIA_TRANSCRIBE");
const hookUrl = (flag("hook") || process.env[hookVar]?.trim() || "").trim();
const scenarioArg = flag("scenario");
const zone = flag("zone") || process.env.MAKE_ZONE?.trim() || hookUrl.match(/hook\.([a-z0-9-]+)\.make\.com/i)?.[1] || "eu1";
const token = process.env.MAKE_API_TOKEN?.trim() || "";
const teamId = flag("team") || process.env.MAKE_TEAM_ID?.trim() || "";
const lookbackHours = Number(flag("hours", "24")) || 24;
const apiBase = `https://${zone}.make.com/api/v2`;

const mask = (value) => (value.length <= 12 ? "***" : `${value.slice(0, 6)}…${value.slice(-4)}`);
const step = (n, msg) => console.log(`\n${n}. ${msg}`);

const api = async (path) => {
  const res = await fetch(`${apiBase}${path}`, {
    headers: { Authorization: `Token ${token}`, Accept: "application/json" },
    signal: AbortSignal.timeout(30_000),
  });
  const text = await res.text().catch(() => "");
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return { status: res.status, json, text };
};

if (!token) {
  console.error("❌ MAKE_API_TOKEN is not set.");
  console.error("   1. Make → Profile → API access tokens → Add token");
  console.error("      Scopes: hooks:read, scenarios:read, dlqs:read");
  console.error("   2. Add both lines to .env (never commit):");
  console.error("      MAKE_API_TOKEN=<your-token>");
  console.error("      MAKE_TEAM_ID=<the number in https://eu1.make.com/<teamId>/scenarios>");
  console.error("   3. Re-run: node --env-file=.env scripts/diagnose-make-webhook.mjs");
  process.exit(1);
}

if (!teamId && !scenarioArg) {
  console.error("❌ MAKE_TEAM_ID is not set (needed to resolve a webhook URL to its scenario).");
  console.error(`   Open https://${zone}.make.com and copy the number from /<teamId>/scenarios,`);
  console.error("   or pass --scenario=<id> if you already know the scenario ID.");
  process.exit(1);
}

console.log("\n🔎 Make webhook diagnosis");
console.log(`   zone:   ${zone}`);
console.log(`   source: ${hookUrl ? `${hookVar} = https://hook.${zone}.make.com/${mask(hookUrl.split("/").pop() || "")}` : "(no webhook URL)"}`);

let scenarioId = scenarioArg ? Number(scenarioArg) : 0;

// ── 1. Resolve the webhook URL to the scenario that actually owns it ───────
if (!scenarioId) {
  step(1, "Resolving webhook → scenario (GET /hooks)");
  const hooks = await api(`/hooks?teamId=${encodeURIComponent(teamId)}`);
  if (hooks.status !== 200 || !Array.isArray(hooks.json?.hooks)) {
    console.error(`   ❌ GET /hooks failed (${hooks.status}): ${hooks.text.slice(0, 300)}`);
    console.error("      Check MAKE_API_TOKEN scopes (hooks:read) and MAKE_TEAM_ID.");
    process.exit(1);
  }
  const udid = hookUrl.split("/").pop() || "";
  const match = hooks.json.hooks.find((h) => h.udid === udid || h.url?.endsWith(udid));
  if (!match) {
    console.error(`   ❌ No webhook in team ${teamId} matches that URL.`);
    console.error("      Hooks visible for this team:");
    for (const h of hooks.json.hooks) {
      console.error(`      • ${h.name ?? "(unnamed)"} — ${h.typeName} — scenarioId=${h.scenarioId ?? "unassigned"} — enabled=${h.enabled}`);
    }
    console.error("\n      If your hook is missing, the URL in .env belongs to a different team or organization.");
    process.exit(1);
  }
  console.log(`   ✅ ${match.name ?? "(unnamed)"} (typeName=${match.typeName})`);
  console.log(`      enabled=${match.enabled}  gone=${match.gone}  scenarioId=${match.scenarioId ?? "unassigned"}`);
  if (match.gone) console.log("      ⚠️  gone=true → this webhook was deleted in Make; every call fails.");
  if (match.enabled === false) console.log("      ⚠️  enabled=false → the webhook is disabled; re-enable it in Make.");
  if (!match.scenarioId) {
    console.error("      ❌ The webhook is not attached to any scenario — open a scenario, add it, click Run once.");
    process.exit(1);
  }
  scenarioId = match.scenarioId;
}

// ── 2. Scenario basics ────────────────────────────────────────────────────
step(2, `Scenario ${scenarioId} (GET /scenarios/${scenarioId})`);
const scenario = await api(`/scenarios/${scenarioId}`);
const scenarioData = scenario.json?.scenario ?? scenario.json?.response?.scenario ?? {};
if (scenario.status !== 200) {
  console.error(`   ❌ failed (${scenario.status}): ${scenario.text.slice(0, 300)}`);
} else {
  console.log(`   name:     ${scenarioData.name ?? "(unknown)"}`);
  console.log(`   isActive: ${scenarioData.isActive}  (a scenario can be active and still fail on every run)`);
}

// ── 3. Live blueprint: is the flow actually configured, or still a template? ─
step(3, `Live blueprint (GET /scenarios/${scenarioId}/blueprint)`);
const blueprintRes = await api(`/scenarios/${scenarioId}/blueprint`);
const blueprint = blueprintRes.json?.response?.blueprint ?? blueprintRes.json?.blueprint ?? {};
const flow = Array.isArray(blueprint.flow) ? blueprint.flow : [];
const PLACEHOLDER = /YOUR-[A-Z]|your-[a-z-]+|<[a-z-]+-(id|key|provider|domain)>|example\.com|PLACEHOLDER|TODO|REDACTED/i;
const moduleIds = [];

if (blueprintRes.status !== 200) {
  console.error(`   ❌ failed (${blueprintRes.status}): ${blueprintRes.text.slice(0, 300)}`);
} else if (!flow.length) {
  console.error("   ❌ The blueprint has no modules — the scenario is empty.");
} else {
  console.log(`   modules in flow: ${flow.length}   (Make editor numbering starts at 1, these are the raw ids)`);
  for (const node of flow) {
    moduleIds.push(node.id);
    const label = String(node.module ?? "").replace(/^.*:/, "");
    console.log(`   • id=${node.id}  ${label}`);
    if (node.mapper?.url) console.log(`       url: ${node.mapper.url}`);
    const asText = JSON.stringify(node.mapper ?? {});
    if (PLACEHOLDER.test(asText)) {
      console.log("       ⚠️  PLACEHOLDER VALUE DETECTED — this module still holds template text, so it cannot succeed.");
    }
    if (/gateway:WebhookRespond/i.test(String(node.module ?? ""))) {
      console.log("       (this is the module that returns the JSON body the backend expects)");
    }
  }
}

// ── 4. Failed executions for this scenario (status=3) ─────────────────────
step(4, `Failed executions in the last ${lookbackHours}h (GET /scenarios/${scenarioId}/logs?status=3)`);
const to = Date.now();
const from = to - lookbackHours * 3600 * 1000;
const logsRes = await api(`/scenarios/${scenarioId}/logs?status=3&from=${from}&to=${to}`);
const logs = Array.isArray(logsRes.json?.logs) ? logsRes.json.logs : [];
let lastExecutionId = "";

if (logsRes.status !== 200) {
  console.error(`   ❌ failed (${logsRes.status}): ${logsRes.text.slice(0, 300)}`);
} else if (!logs.length) {
  console.log("   (none returned) — either the scenario did not error in this window, or Make discarded");
  console.log("   the failed runs. Check step 6 below: a blueprint with dlq:false does not store them.");
} else {
  console.log(`   ${logs.length} failed execution(s):`);
  for (const log of logs.slice(0, 10)) {
    console.log(`   • ${log.timestamp ?? "?"}  executionId=${log.executionId ?? "?"}  status=${log.status}  operations=${log.bundles ?? "?"}`);
    if (log.error?.message) console.log(`       error: ${String(log.error.message).slice(0, 300)}`);
    if (log.warning?.message) console.log(`       warning: ${String(log.warning.message).slice(0, 200)}`);
  }
  lastExecutionId = String(logs[0]?.executionId ?? "");
}

// ── 5. Per-module errors for the newest failure — the exact failing step ──
if (lastExecutionId) {
  step(5, `Module-level errors for executionId=${lastExecutionId} (GET /scenarios/${scenarioId}/modules/{id}/logs)`);
  let reported = 0;
  for (const moduleId of moduleIds) {
    const moduleLogs = await api(`/scenarios/${scenarioId}/modules/${moduleId}/logs?pg[limit]=10&pg[sortDir]=desc`);
    const entries = Array.isArray(moduleLogs.json?.moduleLogs) ? moduleLogs.json.moduleLogs : [];
    for (const entry of entries.slice(0, 5)) {
      if (String(entry.executionId ?? "") !== lastExecutionId) continue;
      if (entry.status === 3) {
        reported += 1;
        console.log(`   ❌ module ${moduleId} failed at ${entry.timestamp}: ${String(entry.error?.message ?? "(no message)").slice(0, 400)}`);
      } else if (entry.status !== 1) {
        console.log(`   ⚠️  module ${moduleId} status=${entry.status} at ${entry.timestamp}`);
      }
    }
  }
  if (!reported) console.log("   (no module-level error row returned — see step 6 and the Make editor history)");
}

// ── 6. Incomplete executions (only stored when the scenario has dlq enabled) ─
step(6, `Stored failed runs (GET /dlqs?scenarioId=${scenarioId})`);
const dlqs = await api(`/dlqs?scenarioId=${scenarioId}`);
if (dlqs.status === 200) {
  const list = Array.isArray(dlqs.json?.dlqs) ? dlqs.json.dlqs : [];
  console.log(`   stored incomplete executions: ${list.length}`);
  for (const dlq of list.slice(0, 5)) console.log(`   • id=${dlq.id}  created=${dlq.created ?? "?"}  status=${dlq.status ?? "?"}`);
  if (!list.length) {
    console.log("   ℹ️  Empty is expected when the scenario does NOT store failed runs (blueprint meta.dlq=false).");
    console.log("      Turn on Scenario settings → “Store incomplete executions” if you want failure payloads kept.");
  }
} else {
  console.log(`   (skipped: ${dlqs.status} — needs the dlqs:read scope${dlqs.status === 403 ? "; token lacks it" : ""})`);
}

// ── 7. Verdict ────────────────────────────────────────────────────────────
step(7, "Verdict");
const placeholderHit = PLACEHOLDER.test(JSON.stringify(blueprint.flow ?? []));
const hasRespondModule = flow.some((n) => /gateway:WebhookRespond/i.test(String(n.module ?? "")));

if (placeholderHit) {
  console.log("   ❌ The live blueprint still contains template text (e.g. YOUR-TRANSCRIPTION-PROVIDER /");
  console.log("      your-webhook-id / example.com). That module CANNOT succeed — replace it with a real");
  console.log("      provider URL, credential and response mapping, then click Save + Run once.");
} else {
  console.log("   ℹ️  No obvious placeholder text in the blueprint. Reproduce the failure and read the");
  console.log("      module error in step 5 (make sure the log window in step 4 covers the moment of the test).");
}
if (!hasRespondModule) {
  console.log("   ⚠️  This flow has no “Webhook response” module, so callers get Make's generic error page");
  console.log("      instead of a JSON body. Add one that returns {ok, syncJobId, transcript}.");
}
console.log(`\n   Re-test from this repo after fixing the scenario:`);
console.log(`     npm run ${hookVar === "MAKE_WEBHOOK_URL_MEDIA_TRANSCRIBE" ? "test:media-transcribe" : "test:make-webhook"}\n`);
process.exit(placeholderHit || !hasRespondModule ? 1 : 0);
