#!/usr/bin/env node
/**
 * Verify that every env var the deployed Cloudflare Worker needs is actually deployed
 * as a live secret — the check that "all Make webhook URLs are deployed in live".
 *
 * It runs `wrangler secret list` (names only; Cloudflare never returns values), then
 * compares the live secret names against the REQUIRED/OPTIONAL lists below, which are
 * derived from the Worker source: the `Bindings` interface plus each call site in
 * functions/api/[[...path]].ts.
 *
 * Requires a wrangler login (OAuth). A stale CLOUDFLARE_API_TOKEN is unset first,
 * exactly like scripts/wrangler-deploy.mjs, so OAuth wins.
 *
 * Usage:
 *   node scripts/check-live-secrets.mjs
 *   node scripts/check-live-secrets.mjs --json
 *   node scripts/check-live-secrets.mjs --config=wrangler.local.toml
 */

import { execSync } from "node:child_process";

const args = process.argv.slice(2);
const flag = (name, fallback = "") => {
  const prefix = `--${name}=`;
  const found = args.find((a) => a.startsWith(prefix));
  return found ? found.slice(prefix.length).trim() : fallback;
};
const config = flag("config", "wrangler.toml");
const asJson = args.includes("--json");

/** Required by the deployed Worker. `usedBy` is the call site that reads it. */
const REQUIRED = [
  { name: "MAKE_WEBHOOK_URL", usedBy: "inquiry/legacy dispatch (functions/api/[[...path]].ts:9004)" },
  { name: "MAKE_AI_ENGINE_WEBHOOK_URL", usedBy: "unified AI gateway fallback (:9241-like AI engine + :10464 HR interviewer)" },
  { name: "MAKE_AI_COMMAND_CENTER_WEBHOOK_URL", usedBy: "POST /api/ai/command-center/chat (:10379)" },
  { name: "MAKE_AI_RECEPTIONIST_WEBHOOK_URL", usedBy: "POST /api/ai/receptionist (:9233)" },
  { name: "MAKE_AI_HR_INTERVIEWER_WEBHOOK_URL", usedBy: "POST /api/ai/hr-interview/chat (:10463)" },
  { name: "MAKE_PDF_AUTOFILL_WEBHOOK_URL", usedBy: "POST /api/pdf-autofill (:14855)" },
  { name: "MAKE_PDF_AUTOFILL_WEBHOOK_TOKEN", usedBy: "POST /api/pdf-autofill authToken (:14889)" },
  { name: "MAKE_HR_EMAIL_WEBHOOK_URL", usedBy: "HR interview email dispatch (:10687)" },
  { name: "MAKE_WEBHOOK_URL_APPLICANT_INTAKE", usedBy: "candidate.created intake (:14313)" },
  { name: "MAKE_WEBHOOK_URL_APPLICANT_ASSISTANT", usedBy: "applicant assistant (:10218)" },
  { name: "MAKE_WEBHOOK_URL_CONTRACTOR_ARRIVAL_ALERT", usedBy: "arrival.completed alert (:8337)" },
  { name: "EVENT_INGEST_SECRET", usedBy: "POST /api/events + GET /api/events/health (:5773)" },
];

/** Optional / legacy / only used by the Express backend — absence is informational. */
const OPTIONAL = [
  { name: "MAKE_APPLICANT_ASSISTANT_WEBHOOK_URL", usedBy: "legacy applicant-assistant name (:10219)" },
  { name: "MAKE_AI_RECEPTIONIST_WEBHOOK_SECRET", usedBy: "optional receptionist request validation (:9241)" },
  { name: "MAKE_AI_COMMAND_CENTER_WEBHOOK_SECRET", usedBy: "optional command-center validation (:10381)" },
  { name: "MAKE_WEBHOOK_URL_GOOGLE_DRIVE_SYNC", usedBy: "Express only: backend/src/services/externalSyncService.ts:30" },
  { name: "MAKE_WEBHOOK_URL_MEDIA_TRANSCRIBE", usedBy: "Express only: backend/src/services/externalSyncService.ts:46" },
  { name: "MAKE_WEBHOOK_URL_INTERVIEW_SCHEDULED_ALERT", usedBy: "Express only: backend/src/services/eventService.ts:93" },
];

delete process.env.CLOUDFLARE_API_TOKEN;

let live = [];
try {
  const raw = execSync(`npx wrangler secret list --config ${config}`, {
    cwd: process.cwd(),
    env: { ...process.env },
    stdio: "pipe",
    timeout: 120_000,
  }).toString();
  const first = raw.indexOf("[");
  const last = raw.lastIndexOf("]");
  live = JSON.parse(raw.slice(first, last + 1));
} catch (error) {
  const detail = (error.stdout?.toString() || error.stderr?.toString() || error.message || "").trim();
  console.error("❌ Could not read live secrets. Log in first:  npx wrangler login");
  console.error(`   ${detail.split("\n").slice(0, 4).join("\n   ")}`);
  process.exit(1);
}

const liveNames = new Set(live.map((s) => s.name));
const missing = REQUIRED.filter((r) => !liveNames.has(r.name));
const present = REQUIRED.filter((r) => liveNames.has(r.name));
const optionalPresent = OPTIONAL.filter((o) => liveNames.has(o.name));
const optionalAbsent = OPTIONAL.filter((o) => !liveNames.has(o.name));
const otherMake = live.map((s) => s.name).filter((n) => n.startsWith("MAKE_") && !REQUIRED.some((r) => r.name === n) && !OPTIONAL.some((o) => o.name === n));

if (asJson) {
  console.log(JSON.stringify({ config, totalSecrets: live.length, present, missing, optionalPresent, optionalAbsent, otherMake }, null, 2));
  process.exit(missing.length === 0 ? 0 : 1);
}

console.log(`\n🔐 Live deployment check — config: ${config}`);
console.log(`   live secrets on the Worker: ${live.length} (${live.filter((s) => s.name.startsWith("MAKE_")).length} of them MAKE_*)\n`);

console.log(`REQUIRED BY THE DEPLOYED CODE — ${present.length}/${REQUIRED.length} deployed`);
for (const entry of REQUIRED) {
  const ok = liveNames.has(entry.name);
  console.log(`  ${ok ? "✅" : "❌"} ${entry.name}`);
  if (!ok) console.log(`       needed by: ${entry.usedBy}`);
}

console.log(`\nOPTIONAL / EXPRESS-ONLY — ${optionalPresent.length}/${OPTIONAL.length} deployed`);
for (const entry of OPTIONAL) {
  const ok = liveNames.has(entry.name);
  console.log(`  ${ok ? "✅" : "⏭ "} ${entry.name}${ok ? "" : `  (absent — ${entry.usedBy})`}`);
}

if (otherMake.length) {
  console.log("\nOTHER Make secrets deployed but not referenced by the required list");
  for (const name of otherMake) console.log(`  ℹ️  ${name}`);
}

console.log(
  missing.length === 0
    ? "\n✅ All required Make webhook URLs and secrets are deployed in production.\n"
    : `\n❌ ${missing.length} required secret(s) MISSING in production:\n${missing
        .map((m) => `   npx wrangler secret put ${m.name} --config ${config}`)
        .join("\n")}\n`,
);
process.exit(missing.length === 0 ? 0 : 1);
