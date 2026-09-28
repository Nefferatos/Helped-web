#!/usr/bin/env node
/**
 * Test the "Private media transcription" Make webhook (MAKE_WEBHOOK_URL_MEDIA_TRANSCRIBE).
 *
 * This mirrors the exact contract used by the backend
 * (backend/src/services/externalSyncService.ts -> transcribePrivateMedia):
 *   POST { mediaUrl, language, syncJobId }  ->  { ok, syncJobId, transcript }
 * where mediaUrl is a short-lived signed URL pointing at a private Storage object.
 *
 * The webhook URL is read from the environment — never hardcode it here:
 *   MAKE_WEBHOOK_URL_MEDIA_TRANSCRIBE
 *
 * Usage:
 *   node --env-file=.env scripts/test-media-transcribe-webhook.mjs
 *   node --env-file=.env scripts/test-media-transcribe-webhook.mjs --media-url=https://cdn.example.com/a.mp3
 *   node --env-file=.env scripts/test-media-transcribe-webhook.mjs --language=en-US --sync-job-id=real-test-001
 *   node scripts/test-media-transcribe-webhook.mjs https://hook.eu1.make.com/<your-id>
 */

// Public-domain speech sample (11s of spoken English) — a real, direct audio link
// so the scenario can prove it reaches the transcription provider.
const DEFAULT_MEDIA_URL = "https://raw.githubusercontent.com/ggerganov/whisper.cpp/master/samples/jfk.wav";

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const prefix = `--${name}=`;
  const found = args.find((a) => a.startsWith(prefix));
  return found ? found.slice(prefix.length).trim() : fallback;
};

const webhookUrl = (
  args.find((a) => a.startsWith("http")) ||
  process.env.MAKE_WEBHOOK_URL_MEDIA_TRANSCRIBE?.trim() ||
  ""
).trim();
const mediaUrl = flag("media-url", DEFAULT_MEDIA_URL);
const language = flag("language", "en-US");
const syncJobId = flag("sync-job-id", `real-test-${Date.now()}`);

const payload = { mediaUrl, language, syncJobId };

let failures = 0;
const pass = (msg) => console.log(`  ✅ ${msg}`);
const fail = (msg) => {
  failures += 1;
  console.error(`  ❌ ${msg}`);
};
const warn = (msg) => console.log(`  ⚠️  ${msg}`);

if (!webhookUrl) {
  console.error("❌ No media-transcription webhook URL supplied.");
  console.error("   Set MAKE_WEBHOOK_URL_MEDIA_TRANSCRIBE in .env, or pass one:");
  console.error("     node --env-file=.env scripts/test-media-transcribe-webhook.mjs");
  console.error("     node scripts/test-media-transcribe-webhook.mjs https://hook.eu1.make.com/<your-id>");
  process.exit(1);
}

console.log("\n🧪 Testing Make private-media transcription webhook");
console.log(`🔗 Webhook: ${webhookUrl.replace(/\/[a-z0-9]+$/i, "/<redacted>")}`);
console.log(`📦 Payload: ${JSON.stringify(payload)}\n`);

// ── 1. mediaUrl must be a direct, publicly reachable audio file ────────────
try {
  const head = await fetch(mediaUrl, { method: "HEAD" });
  const contentType = head.headers.get("content-type") || "";
  if (head.status === 200 && /audio|octet-stream|mpeg|wav|ogg|mp4/i.test(contentType)) {
    pass(`mediaUrl is publicly reachable (${head.status} ${contentType})`);
  } else if (head.status === 200) {
    pass(`mediaUrl reachable (${head.status}); content-type "${contentType}" may not be audio`);
  } else {
    fail(`mediaUrl returned ${head.status} — use a direct public .mp3/.wav/.m4a/.ogg link`);
  }
} catch (error) {
  fail(`mediaUrl is not reachable: ${error instanceof Error ? error.message : error}`);
}

// ── 2. POST the adapter payload and read the WebhookRespond body ───────────
const startedAt = Date.now();
let status = 0;
let bodyText = "";
try {
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(180_000),
  });
  status = res.status;
  bodyText = await res.text().catch(() => "");
} catch (error) {
  fail(`request failed: ${error instanceof Error ? error.message : error}`);
}

const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
console.log(`📡 HTTP Status: ${status} (${elapsed}s)`);
console.log(`📄 Response: ${bodyText.slice(0, 500) || "<empty>"}\n`);

let parsed = null;
try {
  parsed = JSON.parse(bodyText);
} catch {
  parsed = null;
}

if (status === 200 && parsed && parsed.ok === true) {
  pass("scenario responded with ok: true");
  if (String(parsed.syncJobId ?? "") === syncJobId) {
    pass(`syncJobId echoed back (${syncJobId})`);
  } else {
    fail(`syncJobId mismatch — expected "${syncJobId}", got "${parsed.syncJobId ?? "<missing>"}"`);
  }
  const transcript = String(parsed.transcript ?? "").trim();
  if (!transcript) {
    fail("transcript is empty — check the provider mapping in Make module 2/3");
  } else {
    pass(`transcript returned (${transcript.length} chars)`);
    console.log(`\n  📝 ${transcript.slice(0, 400)}\n`);
    if (transcript.length < 5) {
      warn("suspiciously short transcript. Non-speech audio (music/tone) legitimately yields “.”,");
      warn("but if this clip contains speech, module 3 is probably mapping the wrong response field.");
    }
  }
} else if (status === 200) {
  fail("scenario is listening but returned a non-JSON body — add/repair the WebhookRespond module (module 3)");
} else if (status === 500) {
  fail('scenario failed to run ("Scenario failed to complete.") — open Make → Scenarios → this scenario → History');
  console.log("     Most common cause: module 2 still points at the adapter placeholder");
  console.log('     "https://YOUR-TRANSCRIPTION-PROVIDER/transcribe-from-url" (see make/helped-media-transcription.blueprint.json).');
  console.log("     Pick a real provider (e.g. one that accepts an HTTPS audio URL) and set its credential.");
  console.log("     Website side can be proven independently of Make:  npm run test:media-contract");
} else if (status === 410) {
  fail("no scenario is listening on this webhook — toggle the scenario ON in Make");
} else if (status === 404) {
  fail("webhook not activated or the URL does not match the Make webhook");
} else {
  fail(`unexpected status ${status} — check Make.com execution history`);
}

console.log(failures === 0 ? "\nAll checks passed.\n" : `\n${failures} check(s) FAILED.\n`);
process.exit(failures === 0 ? 0 : 1);
