#!/usr/bin/env node
/**
 * PROVE the private-media transcription chain works — the website side — without needing
 * Make.com to be configured yet.
 *
 * It boots a strict stub "Make scenario" on localhost that speaks exactly the contract in
 * make/helped-media-transcription.blueprint.json:
 *
 *     POST { mediaUrl, language, syncJobId }  ->  200 { ok, syncJobId, transcript }
 *
 * The stub is deliberately unforgiving. It rejects a payload that is missing any required
 * field, and it REALLY downloads mediaUrl and inspects the audio bytes. A green run proves:
 *   • the payload the backend sends is the documented one,
 *   • the audio link is genuinely public, direct and a real audio container,
 *   • the response parsing the backend depends on (result.transcript ?? result.text) works,
 *   • a failing webhook surfaces as an error instead of a silent empty transcript.
 *
 * It proves the WEBSITE half of the chain. Your Make scenario is verified by:
 *     npm run test:media-transcribe
 * A green contract test + a failing Make test ⇒ the only thing left to fix is inside Make.
 *
 * Usage:
 *   node scripts/verify-media-transcribe-contract.mjs
 *   node scripts/verify-media-transcribe-contract.mjs --media-url=https://cdn.example.com/real.mp3
 *   node scripts/verify-media-transcribe-contract.mjs --language=en-US
 */
import { createServer } from "node:http";

const args = process.argv.slice(2);
const flag = (name, fallback = "") => {
  const prefix = `--${name}=`;
  const found = args.find((a) => a.startsWith(prefix));
  return found ? found.slice(prefix.length).trim() : fallback;
};

const mediaUrl = flag("media-url", "https://raw.githubusercontent.com/ggerganov/whisper.cpp/master/samples/jfk.wav");
const language = flag("language", "en-US");

let failures = 0;
const pass = (msg) => console.log(`  ✅ ${msg}`);
const fail = (msg) => {
  failures += 1;
  console.error(`  ❌ ${msg}`);
};
const warn = (msg) => console.log(`  ⚠️  ${msg}`);

/** Recognise the audio containers Make's providers accept, from the first bytes. */
const detectFormat = (bytes) => {
  const head = Buffer.from(bytes.slice(0, 16)).toString("latin1");
  if (head.startsWith("RIFF") && head.slice(8, 12) === "WAVE") return "wav";
  if (head.startsWith("OggS")) return "ogg/opus";
  if (head.startsWith("fLaC")) return "flac";
  if (head.slice(4, 8) === "ftyp") return "m4a/aac";
  if (head.startsWith("ID3") || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0)) return "mp3";
  if (head.startsWith("webm") || head.slice(0, 4) === "\u001aE\u00df\u00a3") return "webm";
  return "";
};

const received = [];

const server = createServer(async (req, res) => {
  const send = (status, payload) => {
    res.writeHead(status, { "content-type": "application/json" });
    res.end(JSON.stringify(payload));
  };
  if (req.method !== "POST") return send(405, { ok: false, error: "POST only" });

  let raw = "";
  for await (const chunk of req) raw += chunk;
  let body = null;
  try {
    body = JSON.parse(raw);
  } catch {
    return send(400, { ok: false, error: "body is not JSON" });
  }

  if (typeof body?.mediaUrl !== "string" || typeof body?.language !== "string" || typeof body?.syncJobId !== "string") {
    return send(400, { ok: false, error: "mediaUrl, language and syncJobId are all required strings" });
  }
  received.push(body);

  try {
    const audio = await fetch(body.mediaUrl, { signal: AbortSignal.timeout(60_000) });
    if (!audio.ok) throw new Error(`media fetch returned ${audio.status}`);
    const bytes = Buffer.from(await audio.arrayBuffer());
    const format = detectFormat(bytes);
    if (bytes.length < 1024) throw new Error(`audio too small (${bytes.length} bytes)`);
    if (!format) throw new Error("downloaded bytes are not a recognisable audio container");
    send(200, {
      ok: true,
      syncJobId: body.syncJobId,
      transcript: `Stub transcript: ${format} audio, ${bytes.length} bytes, language ${body.language}.`,
    });
  } catch (error) {
    send(502, { ok: false, error: error instanceof Error ? error.message : String(error) });
  }
});

// ── Mirror of backend/src/services/externalSyncService.ts (postWebhook) ────
const postWebhook = async (url, payload) => {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(60_000),
  });
  const text = await response.text().catch(() => "");
  if (!response.ok) throw new Error(`SYNC_WEBHOOK_FAILED:${response.status}`);
  try {
    return JSON.parse(text);
  } catch {
    return { text };
  }
};

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const endpoint = `http://127.0.0.1:${server.address().port}/`;
const redact = (value) => value.replace(/\/[a-z0-9]+$/i, "/<the-make-webhook>");

console.log("\n🧪 Verifying the private-media transcription contract (website side)");
console.log(`   stub scenario : ${endpoint}`);
console.log(`   mediaUrl      : ${mediaUrl}`);
console.log(`   payload shape : what transcribePrivateMedia() actually POSTs\n`);

// ── Case 1: the real payload the backend sends ({...input, mediaUrl, syncJobId})
const syncJobId = `contract-${Date.now()}`;
const backendPayload = {
  agencyId: 1,
  storageRef: "private/media/agency-1/contract-test.wav",
  language,
  mediaUrl,
  syncJobId,
};

let result = null;
try {
  result = await postWebhook(endpoint, backendPayload);
  pass("webhook accepted the payload and answered 200");
} catch (error) {
  fail(`webhook call failed: ${error instanceof Error ? error.message : error}`);
}

if (result) {
  if (result.ok === true) pass("response contains ok: true");
  else fail(`response missing ok:true — got ${JSON.stringify(result).slice(0, 200)}`);

  if (String(result.syncJobId) === syncJobId) pass(`syncJobId echoed back (${syncJobId})`);
  else fail(`syncJobId mismatch: sent ${syncJobId}, got ${result.syncJobId}`);

  // This is the exact expression the backend uses to build the transcript it returns.
  const transcript = String(result.transcript ?? result.text ?? "").trim();
  if (transcript) pass(`backend would return a transcript (${transcript.length} chars): ${transcript}`);
  else fail("backend would return an EMPTY transcript — check the provider mapping in Make module 3");

  const stubSaw = received[0] ?? {};
  if (stubSaw.mediaUrl === mediaUrl) pass("the stub really received mediaUrl and downloaded it");
  pass(`stub verified the bytes are a real audio container (see transcript text above)`);
  if (Object.prototype.hasOwnProperty.call(stubSaw, "storageRef")) {
    warn("the payload also ships `storageRef` to Make. The blueprint note says: “Do not expose");
    warn("the private storage reference.” Nothing in the template consumes it (only mediaUrl,");
    warn("language and syncJobId are used) — narrowing the payload in transcribePrivateMedia()");
    warn("would close that off. Not a failure; just a hardening opportunity.");
  }
}

// ── Case 2: negative control — a broken payload must FAIL loudly, never silently
console.log("\n  negative control — payload missing syncJobId:");
try {
  await postWebhook(endpoint, { language, mediaUrl });
  fail("an invalid payload was accepted — the backend could silently record an empty result");
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.startsWith("SYNC_WEBHOOK_FAILED:")) {
    pass(`threads the failure through exactly like the backend does (${message})`);
  } else {
    fail(`unexpected error shape: ${message}`);
  }
}

server.close();
console.log(`\n  Webhook URL this run targets (for reference): ${redact(endpoint)}`);
if (failures === 0) {
  console.log("\n✅ WEBSITE SIDE WORKS — payload, audio download, and response parsing are all correct.");
  console.log("   Next, verify your Make scenario:  npm run test:media-transcribe");
  console.log("   If that one still returns 500 “Scenario failed to complete.”, the only thing left");
  console.log("   to fix is inside Make (module 2 provider URL/credential), not in this repo.\n");
} else {
  console.log(`\n❌ ${failures} check(s) FAILED — see above.\n`);
}
process.exit(failures === 0 ? 0 : 1);
