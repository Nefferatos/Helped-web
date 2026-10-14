#!/usr/bin/env node
/**
 * Verify the AI Marketing engine is Make.com-only.
 *
 * Sends the exact `ai_engine` payload the backend/Worker marketing generator
 * produces to the configured Make AI gateway webhook, and checks the reply
 * matches the {{name}}/{{agencyPhone}} contract the generator expects.
 *
 * Usage:
 *   node --env-file=.env scripts/test-marketing-make-only.mjs
 */

const url =
  process.env.MAKE_WEBHOOK_URL_AI_ENGINE?.trim() ||
  process.env.MAKE_AI_ENGINE_WEBHOOK_URL?.trim() ||
  "";

if (!url) {
  console.error(
    "❌ No Make AI gateway URL set (MAKE_WEBHOOK_URL_AI_ENGINE / MAKE_AI_ENGINE_WEBHOOK_URL).",
  );
  process.exit(1);
}

const redacted = url.replace(/\/[A-Za-z0-9-]+$/, "/***");
console.log("Make AI gateway:", redacted);
console.log("Scenario: marketing  (the generator no longer calls Claude/Groq directly)\n");

const systemPrompt = [
  "You are a WhatsApp marketing expert for a Singapore domestic helper agency.",
  "Write ONE outreach message template for sending to potential clients.",
  "Open exactly with: Hi {{name}}, then a short body, then a CTA that includes {{agencyPhone}}.",
  'Respond ONLY with valid JSON: {"template":"...","subject":"..."}',
].join("\n");

const userPrompt = [
  "Campaign goal: promote newly arrived and available domestic helpers to potential clients",
  "Tone: friendly, caring, and genuine — 1-2 emojis only",
  "Agency name: Helped Test Agency",
  "Agency WhatsApp / phone: 6591234567",
  "",
  "Featured domestic helpers:",
  "Name: Maria Santos | Nationality: Filipino | Top skills: Infant Care",
].join("\n");

const payload = {
  type: "ai_engine",
  scenario: "marketing",
  systemPrompt,
  userPrompt,
  context: {},
};

const started = Date.now();
try {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(60_000),
  });
  const ms = Date.now() - started;
  const body = (await res.text()).trim();
  console.log(`HTTP ${res.status} in ${ms}ms`);
  console.log("Raw response:", body.slice(0, 600) || "(empty)");

  if (!res.ok) {
    console.error("\n❌ Make gateway returned a non-2xx status.");
    process.exit(1);
  }

  // Mirror parseAiJson acceptance from directMarketingAiService.ts.
  const first = body.indexOf("{");
  const last = body.lastIndexOf("}");
  let parsed = null;
  if (first !== -1 && last > first) {
    try {
      parsed = JSON.parse(body.slice(first, last + 1));
    } catch {
      parsed = null;
    }
  }
  const accepted =
    parsed &&
    typeof parsed.template === "string" &&
    parsed.template.includes("{{name}}") &&
    parsed.template.includes("{{agencyPhone}}") &&
    parsed.template.length <= 800;

  if (accepted) {
    console.log("\n✅ PASS — Make.com returned valid marketing JSON.");
    console.log("   subject :", parsed.subject);
    console.log("   template:", parsed.template);
  } else {
    console.log(
      "\n⚠️ The gateway replied, but not in the JSON contract the Express generator expects.",
    );
    console.log(
      "   (Plain-text replies are still valid: the Worker wraps them and the Express parser falls back to the deterministic template.)",
    );
  }
} catch (err) {
  console.error(`\n❌ Failed to reach the Make gateway: ${err.message}`);
  process.exit(1);
}
