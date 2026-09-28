#!/usr/bin/env node
/**
 * Test EVERY Make.com webhook configured in .env — one real POST each — and print the raw
 * HTTP status, timing and response body, then a verdict table.
 *
 * Payloads are not invented: each one mirrors the exact JSON the Worker/backend sends
 * (functions/api/[[...path]].ts, backend/src/services/*), so a green row means the live
 * scenario accepted and processed a real request.
 *
 * ⚠️  These are REAL requests with real side effects on whichever scenarios are active:
 *     • *_HR_EMAIL_WEBHOOK_URL and the two *_ALERT hooks can send emails
 *     • *_GOOGLE_DRIVE_SYNC uploads a small test file to Google Drive
 *     • *_APPLICANT_INTAKE / MAKE_WEBHOOK_URL may create records in your systems
 *     Every payload is labelled "probe" / "please ignore".
 *
 * Usage:
 *   node --env-file=.env scripts/test-all-make-webhooks.mjs
 *   node --env-file=.env scripts/test-all-make-webhooks.mjs --only=MAKE_HR_EMAIL_WEBHOOK_URL
 *   node --env-file=.env scripts/test-all-make-webhooks.mjs --skip=MAKE_WEBHOOK_URL_GOOGLE_DRIVE_SYNC
 *   node --env-file=.env scripts/test-all-make-webhooks.mjs --dry            # list without sending
 *   node --env-file=.env scripts/test-all-make-webhooks.mjs --body-limit=1200
 */

const args = process.argv.slice(2);
const flag = (name, fallback = "") => {
  const prefix = `--${name}=`;
  const found = args.find((a) => a.startsWith(prefix));
  return found ? found.slice(prefix.length).trim() : fallback;
};
const has = (name) => args.includes(`--${name}`);

const only = flag("only");
const skip = flag("skip").split(",").map((s) => s.trim()).filter(Boolean);
const bodyLimit = Number(flag("body-limit", "900")) || 900;
const payloadLimit = Number(flag("payload-limit", "300")) || 300;
const timeoutMs = (Number(flag("timeout", "60")) || 60) * 1000;
const dryRun = has("dry");

const probeId = `probe-${Date.now()}`;
const stamp = () => `webhook probe ${probeId} — please ignore`;
const maskUrl = (url) =>
  url.replace(/^https:\/\/(hook\.[a-z0-9]+\.make\.com)\/(\w+)/i, (_, host, id) => `https://${host}/${id.slice(0, 8)}…`);

/** name -> { label, payload } — payload mirrors the real caller in this repo. */
const targets = {
  MAKE_WEBHOOK_URL: {
    label: "Legacy workflow dispatcher (WEBSITE AI WORKFLOW routes)",
    payload: { scenario: "inquiry_pipeline", inquiryId: 1001, name: "Webhook Probe", contact: "test@test.com", message: stamp() },
  },
  MAKE_ORCHESTRATOR_WEBHOOK_URL: {
    label: "Workflow orchestrator (AI Agent classifies, then routes to API)",
    payload: { action: "new_inquiry", actor: { role: "guest", id: "" }, customer: { name: "Webhook Probe", contact: "test@test.com" }, message: stamp(), context: {} },
  },
  MAKE_HR_EMAIL_WEBHOOK_URL: {
    label: "HR interview email (Gmail send) — WILL EMAIL the 'to' address",
    payload: {
      scenario: "interview_pipeline", type: "pass", to: "test@test.com", candidateName: "Webhook Probe",
      position: "Probe", rating: 85, recommendation: "pass", summary: stamp(), strengthsHtml: "<li>probe</li>", weaknessesHtml: "",
    },
  },
  MAKE_PDF_AUTOFILL_WEBHOOK_URL: {
    label: "PDF autofill (Make AI Agent, expects JSON { content })",
    payload: {
      scenario: "pdf_autofill", requestId: probeId,
      systemPrompt: "You are a connectivity probe. Always answer with a short JSON object.",
      userPrompt: 'Reply with exactly: {"content":"probe-ok"}',
    },
  },
  MAKE_AI_RECEPTIONIST_WEBHOOK_URL: {
    label: "Public AI receptionist (Make AI Agent answer, JSON response)",
    payload: { conversationId: probeId, message: stamp(), page: "/", history: [], context: {}, timestamp: new Date().toISOString() },
  },
  MAKE_AI_COMMAND_CENTER_WEBHOOK_URL: {
    label: "AI command center / unified gateway (ai_engine payload)",
    payload: {
      type: "ai_engine", scenario: "applicant-assistant",
      systemPrompt: "You are a connectivity probe. Reply with one short sentence.",
      userPrompt: stamp(), messages: [{ role: "user", content: stamp() }], context: {},
    },
  },
  MAKE_WEBHOOK_URL_AI_ENGINE: {
    label: "Unified AI gateway (ai_engine payload)",
    payload: {
      type: "ai_engine", scenario: "workflow",
      systemPrompt: "You are a connectivity probe. Reply with one short sentence.",
      userPrompt: stamp(), context: {},
    },
  },
  MAKE_WEBHOOK_URL_APPLICANT_INTAKE: {
    label: "Applicant intake & AI screening (candidate.created)",
    payload: {
      event_type: "candidate.created", application_id: probeId, application_code: `PROBE-${probeId}`,
      status: "SUBMITTED", agency_id: 0, full_name: "Webhook Probe", nationality: "Filipino",
    },
  },
  MAKE_WEBHOOK_URL_APPLICANT_ASSISTANT: {
    label: "Applicant assistant (dedicated scenario)",
    payload: {
      scenario: "applicant-assistant", type: "applicant_assistant", requestId: probeId, conversationId: probeId,
      message: stamp(), context: { currentFilters: {}, selectedApplicants: [], applicantSummary: {} },
      conversationHistory: [{ role: "user", content: stamp() }], trackerContext: { existingTracker: null, googleDocId: null },
      systemPrompt: "You are a connectivity probe. Reply with OK.", userPrompt: stamp(),
      messages: [{ role: "user", content: stamp() }],
    },
  },
  MAKE_WEBHOOK_URL_CONTRACTOR_ARRIVAL_ALERT: {
    label: "Contractor arrival alert — may EMAIL internal staff",
    payload: { event_type: "arrival.completed", placement_id: probeId, contractor_job_id: probeId, notes: stamp() },
  },
  MAKE_WEBHOOK_URL_INTERVIEW_SCHEDULED_ALERT: {
    label: "Interview scheduled alert — may EMAIL internal staff (no code reference)",
    payload: {
      event_type: "interview.scheduled", application_id: probeId, candidate_name: "Webhook Probe",
      scheduled_date: "2026-01-01", scheduled_time: "10:00", notes: stamp(),
    },
  },
  MAKE_WEBHOOK_URL_GOOGLE_DRIVE_SYNC: {
    label: "Private document to Google Drive (UPLOADS a small test file)",
    payload: {
      agencyId: 0, storageRef: "private/probe/helped-webhook-probe.txt", fileName: "helped-webhook-probe.txt",
      folderKey: "", entityType: "webhook_probe", syncJobId: probeId,
      downloadUrl: "https://raw.githubusercontent.com/github/gitignore/main/Node.gitignore",
    },
  },
  MAKE_WEBHOOK_URL_MEDIA_TRANSCRIBE: {
    label: "Private media transcription (real speech clip)",
    payload: {
      agencyId: 0, storageRef: "private/probe/probe.wav", language: "en-US", syncJobId: probeId,
      mediaUrl: "https://raw.githubusercontent.com/ggerganov/whisper.cpp/master/samples/jfk.wav",
    },
  },


};

// Same hook under a second name (Worker vs Express naming) — test once, report both.
const aliasOf = { MAKE_AI_ENGINE_WEBHOOK_URL: "MAKE_WEBHOOK_URL_AI_ENGINE" };
const order = [
  "MAKE_WEBHOOK_URL",
  "MAKE_ORCHESTRATOR_WEBHOOK_URL",
  "MAKE_HR_EMAIL_WEBHOOK_URL",
  "MAKE_PDF_AUTOFILL_WEBHOOK_URL",
  "MAKE_AI_RECEPTIONIST_WEBHOOK_URL",
  "MAKE_AI_COMMAND_CENTER_WEBHOOK_URL",
  "MAKE_WEBHOOK_URL_AI_ENGINE",
  "MAKE_AI_ENGINE_WEBHOOK_URL",
  "MAKE_WEBHOOK_URL_APPLICANT_INTAKE",
  "MAKE_WEBHOOK_URL_APPLICANT_ASSISTANT",
  "MAKE_WEBHOOK_URL_CONTRACTOR_ARRIVAL_ALERT",
  "MAKE_WEBHOOK_URL_INTERVIEW_SCHEDULED_ALERT",
  "MAKE_WEBHOOK_URL_GOOGLE_DRIVE_SYNC",
  "MAKE_WEBHOOK_URL_MEDIA_TRANSCRIBE",
];

const groups = new Map();
for (const name of order) {
  const url = process.env[name]?.trim();
  if (!url) continue;
  if (only && name !== only && aliasOf[name] !== only) continue;
  if (skip.includes(name)) continue;
  const existing = groups.get(url);
  if (existing) {
    existing.names.push(name);
    continue;
  }
  groups.set(url, { url, names: [name], def: targets[aliasOf[name] ?? name] });
}
const entries = [...groups.values()];

if (!entries.length) {
  console.error("❌ No Make webhook URLs matched. Set them in .env or adjust --only / --skip.");
  process.exit(1);
}

const aliasNote = entries.filter((e) => e.names.length > 1).map((e) => e.names.join(" = "));
console.log(`\n🧪 Testing ${entries.length} Make webhook(s) with real POST requests`);
console.log(`   probe id: ${probeId}`);
if (aliasNote.length) console.log(`   deduplicated: ${aliasNote.join(", ")}`);
console.log("   ⚠️  real side effects possible: emails (HR + alerts) and a Drive upload\n");
if (dryRun) {
  for (const entry of entries) {
    console.log(`   • ${entry.names.join(" + ")}  ${maskUrl(entry.url)}`);
    console.log(`     ${entry.def?.label ?? "(no payload defined)"}`);
  }
  console.log("\n   --dry: nothing was sent.\n");
  process.exit(0);
}

const results = [];
for (const [index, entry] of entries.entries()) {
  const names = entry.names.join(" + ");
  const def = entry.def;
  console.log(`[${String(index + 1).padStart(2)}/${entries.length}] ${names}  → ${maskUrl(entry.url)}`);
  console.log(`        ${def?.label ?? "(no payload defined)"}`);

  if (!def) {
    console.log("        ⚠️  no payload defined for this variable — skipped\n");
    results.push({ names, status: "-", ms: 0, verdict: "SKIP", detail: "no payload defined" });
    continue;
  }

  const body = JSON.stringify(def.payload);
  console.log(`        payload: ${body.length > payloadLimit ? `${body.slice(0, payloadLimit)}… (${body.length} bytes total)` : body}`);

  const startedAt = Date.now();
  let status = 0;
  let contentType = "";
  let text = "";
  let error = "";
  try {
    const response = await fetch(entry.url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body,
      signal: AbortSignal.timeout(timeoutMs),
    });
    status = response.status;
    contentType = response.headers.get("content-type") ?? "";
    text = await response.text().catch(() => "");
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }
  const ms = Date.now() - startedAt;

  let verdict = "PASS";
  let hint = "";
  if (error) {
    verdict = "FAIL";
    hint = /timeout|aborted/i.test(error) ? `no response within ${timeoutMs / 1000}s` : error;
  } else if (status === 200 || status === 201 || status === 202) {
    verdict = "PASS";
  } else if (status === 500) {
    verdict = "FAIL";
    hint = /Scenario failed to complete/i.test(text)
      ? "scenario ran but errored — npm run diagnose:make-webhook"
      : "scenario error";
  } else if (status === 410) {
    verdict = "FAIL";
    hint = "no scenario listening on this webhook (turn it on / Run once)";
  } else if (status === 404) {
    verdict = "FAIL";
    hint = "webhook not activated, or the URL does not match this Make webhook";
  } else {
    verdict = "FAIL";
    hint = `unexpected status ${status}`;
  }

  console.log(`        result : HTTP ${status || "-"} · ${(ms / 1000).toFixed(1)}s · ${contentType || "-"} · ${text.length} bytes${error ? ` · ${error}` : ""}`);
  if (text) console.log(`        body   : ${text.length > bodyLimit ? `${text.slice(0, bodyLimit)}… (${text.length} bytes total)` : text}`);
  console.log(`        verdict: ${verdict === "PASS" ? "✅ PASS" : "❌ FAIL"}${hint ? ` — ${hint}` : ""}\n`);

  results.push({ names, status, ms, verdict, detail: hint || contentType });
}

const failed = results.filter((r) => r.verdict === "FAIL");
console.log("─".repeat(100));
console.log("SUMMARY");
for (const r of results) {
  const mark = r.verdict === "PASS" ? "✅" : r.verdict === "FAIL" ? "❌" : "⏭ ";
  console.log(`  ${mark} ${String(r.status).padEnd(4)} ${(r.ms / 1000).toFixed(1).padStart(5)}s  ${r.names}${r.detail ? `  — ${r.detail}` : ""}`);
}
console.log(
  failed.length === 0
    ? `\n✅ ALL ${results.length} Make webhook(s) responded successfully.\n`
    : `\n❌ ${failed.length} of ${results.length} Make webhook(s) FAILED — raw bodies above.\n`,
);
process.exit(failed.length === 0 ? 0 : 1);


