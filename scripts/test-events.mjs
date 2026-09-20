#!/usr/bin/env node
/**
 * Verify the #1 event spine (POST/GET /api/events + workflow_events table).
 *
 * What it checks, in order:
 *   1. POST /api/events with NO secret            -> 401 (rejected)
 *   2. POST /api/events with the correct secret   -> 201 (recorded)
 *   3. The row actually landed in Supabase        -> visible via PostgREST
 *
 * Env it needs (from .env):
 *   EVENT_INGEST_SECRET          shared secret for ingestion
 *   SUPABASE_URL                 to confirm the row landed
 *   SUPABASE_SERVICE_ROLE_KEY    to read the row back
 *
 * Usage:
 *   node --env-file=.env scripts/test-events.mjs                 # local backend on :3000
 *   node --env-file=.env scripts/test-events.mjs --target=prod   # production Worker
 *   node --env-file=.env scripts/test-events.mjs http://host:port
 */

const args = process.argv.slice(2);
const targetFlag = args.find((a) => a.startsWith("--target="));
const explicitUrl = args.find((a) => a.startsWith("http"));

const PROD_URL = "https://rinzinagency.com";
const LOCAL_URL = process.env.PORT
  ? `http://localhost:${process.env.PORT}`
  : "http://localhost:3000";

const baseUrl = explicitUrl
  ? explicitUrl.replace(/\/$/, "")
  : targetFlag?.includes("prod")
    ? PROD_URL
    : LOCAL_URL;

const secret = process.env.EVENT_INGEST_SECRET?.trim() || "";
const supabaseUrl = process.env.SUPABASE_URL?.trim().replace(/\/$/, "") || "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";

let failures = 0;
const pass = (msg) => console.log(`  ✅ ${msg}`);
const fail = (msg) => {
  failures += 1;
  console.error(`  ❌ ${msg}`);
};

const marker = `evt-test-${Date.now()}`;
const testEvent = {
  event_type: "test.ping",
  entity_type: "system",
  entity_id: marker,
  actor: "script:test-events",
  payload: { marker, at: new Date().toISOString() },
  status: "completed",
};

console.log(`\nTarget: ${baseUrl}\n`);

// ── 1. No secret -> 401 (only meaningful against the Express backend; the
//       Worker write path is intentionally unauthenticated-by-secret because
//       it sits behind the public site — skip this assertion on prod).
if (!targetFlag?.includes("prod")) {
  const res = await fetch(`${baseUrl}/api/events`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(testEvent),
  });
  if (res.status === 401 || res.status === 503) {
    pass(`rejects missing secret (${res.status})`);
  } else {
    fail(`expected 401/503 without secret, got ${res.status}`);
  }
} else {
  console.log("  ⏭  skipping no-secret check on prod (Worker path has no secret)");
}

// ── 2. Correct secret -> 201 ────────────────────────────────────────────────
const headers = { "content-type": "application/json" };
if (secret) headers["x-event-secret"] = secret;

const createRes = await fetch(`${baseUrl}/api/events`, {
  method: "POST",
  headers,
  body: JSON.stringify(testEvent),
});
const createBody = await createRes.json().catch(() => ({}));

if (createRes.status === 201 && createBody.recorded) {
  pass(`recorded event (id=${createBody.id ?? "n/a"})`);
} else {
  fail(`expected 201 recorded, got ${createRes.status}: ${JSON.stringify(createBody)}`);
}

// ── 3. Confirm the row landed in Supabase ───────────────────────────────────
if (supabaseUrl && serviceKey) {
  const check = await fetch(
    `${supabaseUrl}/rest/v1/workflow_events?entity_id=eq.${encodeURIComponent(marker)}&select=id,event_type,actor`,
    { headers: { apikey: serviceKey, authorization: `Bearer ${serviceKey}` } },
  );
  const rows = await check.json().catch(() => []);
  const found = Array.isArray(rows) && rows.some((r) => r.event_type === "test.ping");
  if (found) {
    pass(`row present in public.workflow_events (${rows.length} row[s])`);
  } else {
    fail(`row NOT found in workflow_events (status ${check.status})`);
  }
} else {
  console.log("  ⏭  skipping Supabase read-back (SUPABASE_URL / SERVICE_ROLE_KEY not set)");
}

console.log(failures === 0 ? "\nAll checks passed.\n" : `\n${failures} check(s) FAILED.\n`);
process.exit(failures === 0 ? 0 : 1);
