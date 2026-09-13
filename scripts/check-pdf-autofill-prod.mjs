/**
 * Quick check: test AI providers + production endpoint.
 * Usage: node scripts/check-pdf-autofill-prod.mjs
 */
import fs from "node:fs";
import path from "node:path";

const BASE = "https://findmaid.wow-aisolution.workers.dev";
const TIMEOUT = 65_000;

function readDevVars() {
  const p = path.resolve(process.cwd(), ".dev.vars");
  if (!fs.existsSync(p)) return {};
  const vars = {};
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i > 0) vars[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return vars;
}

const dv = readDevVars();
const SYS = 'Reply with ONLY a JSON object: {"status":"ok"}';
const USR = "Say OK";

async function testDirect() {
  const key = dv.OPENAI_API_KEY || dv.CLINE_API_KEY;
  const url = dv.OPENAI_BASE_URL || dv.CLINE_API_URL || "https://api.cline.bot/api/v1";
  const model = dv.OPENAI_MODEL || dv.CLINE_MODEL || "openai/gpt-4o-mini";
  if (!key) { console.log("  No OPENAI/CLINE key - skip"); return false; }
  console.log(`\n== Direct API (${model}) ==`);
  try {
    const r = await fetch(`${url}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages: [{ role: "system", content: SYS }, { role: "user", content: USR }], temperature: 0, max_tokens: 100 }),
      signal: AbortSignal.timeout(TIMEOUT),
    });
    const d = await r.json();
    if (!r.ok) { console.log(`  FAIL ${r.status}: ${JSON.stringify(d).slice(0,200)}`); return false; }
    console.log(`  OK Response: "${(d.choices?.[0]?.message?.content ?? "").slice(0,80)}"`);
    return true;
  } catch (e) { console.log(`  FAIL ${e.message}`); return false; }
}

async function testAnthropic() {
  if (!dv.ANTHROPIC_API_KEY) { console.log("  No ANTHROPIC key - skip"); return false; }
  console.log(`\n== Anthropic API ==`);
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": dv.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 100, system: SYS, messages: [{ role: "user", content: USR }] }),
      signal: AbortSignal.timeout(TIMEOUT),
    });
    const d = await r.json();
    if (!r.ok) { console.log(`  FAIL ${r.status}: ${JSON.stringify(d).slice(0,200)}`); return false; }
    console.log(`  OK Response: "${(d.content?.find(c=>c.type==="text")?.text ?? "").slice(0,80)}"`);
    return true;
  } catch (e) { console.log(`  FAIL ${e.message}`); return false; }
}

async function testMake() {
  const url = dv.MAKE_PDF_AUTOFILL_WEBHOOK_URL;
  if (!url) { console.log("  No Make webhook - skip"); return false; }
  console.log(`\n== Make Webhook ==`);
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenario: "pdf_autofill", requestId: "test-"+Date.now(), systemPrompt: SYS, userPrompt: USR,
        ...(dv.MAKE_PDF_AUTOFILL_WEBHOOK_TOKEN ? { authToken: dv.MAKE_PDF_AUTOFILL_WEBHOOK_TOKEN } : {}) }),
      signal: AbortSignal.timeout(TIMEOUT),
    });
    const d = await r.json();
    if (!r.ok) { console.log(`  FAIL ${r.status}: ${JSON.stringify(d).slice(0,200)}`); return false; }
    console.log(`  OK Response: "${(typeof d.content==="string"?d.content:JSON.stringify(d)).slice(0,80)}"`);
    return true;
  } catch (e) { console.log(`  FAIL ${e.message}`); return false; }
}

async function testProdEndpoint() {
  console.log(`\n== Production Endpoint ==`);
  try {
    const h = await fetch(`${BASE}/api/health`, { signal: AbortSignal.timeout(10_000) });
    console.log(`  Health: ${h.status}`);
  } catch (e) { console.log(`  FAIL Worker unreachable: ${e.message}`); return false; }

  try {
    const r = await fetch(`${BASE}/api/pdf-autofill`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "system", content: SYS }, { role: "user", content: USR }] }),
      signal: AbortSignal.timeout(15_000),
    });
    const d = await r.json();
    if (r.status === 401) { console.log(`  401 (auth required) - endpoint EXISTS and is protected`); return true; }
    if (r.status === 503) { console.log(`  FAIL 503: ${d.error}`); return false; }
    console.log(`  ${r.status}: ${JSON.stringify(d).slice(0,200)}`);
    return r.ok;
  } catch (e) { console.log(`  FAIL ${e.message}`); return false; }
}

(async () => {
  console.log("=== AI PDF Autofill - Production Health Check ===\n");
  const R = {
    "Direct API": await testDirect(),
    "Anthropic": await testAnthropic(),
    "Make Webhook": await testMake(),
    "Prod Endpoint": await testProdEndpoint(),
  };
  console.log("\n=== Summary ===");
  for (const [k, v] of Object.entries(R)) console.log(`  ${v?"OK":"FAIL"} ${k}`);
  console.log(`\n${Object.values(R).some(Boolean) ? "At least one AI provider is reachable." : "No AI providers reachable!"}`);
})();
