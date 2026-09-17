#!/usr/bin/env node
/**
 * Test Make.com webhook connectivity.
 *
 * The webhook URL is read from the environment — never hardcode it here:
 *   MAKE_ORCHESTRATOR_WEBHOOK_URL (preferred) or MAKE_WEBHOOK_URL
 *
 * Usage:
 *   node --env-file=.env scripts/test-make-webhook.mjs
 *   node scripts/test-make-webhook.mjs https://hook.eu1.make.com/<your-id>
 */

const url =
  process.argv[2] ||
  process.env.MAKE_ORCHESTRATOR_WEBHOOK_URL?.trim() ||
  process.env.MAKE_WEBHOOK_URL?.trim() ||
  "";

if (!url) {
  console.error("❌ No Make.com webhook URL supplied.");
  console.error("   Set MAKE_ORCHESTRATOR_WEBHOOK_URL (or MAKE_WEBHOOK_URL), or pass one:");
  console.error("     node --env-file=.env scripts/test-make-webhook.mjs");
  console.error("     node scripts/test-make-webhook.mjs https://hook.eu1.make.com/<your-id>");
  process.exit(1);
}

const payload = {
  action: "inquiry",
  actor: { role: "guest", id: "" },
  customer: { name: "Test User", contact: "test@test.com" },
  message: "I am looking for a full-time maid in Singapore for my family",
  context: {
    employerId: null,
    maidId: null,
    scheduleDateTime: null,
    serviceType: "full-time",
    location: "Singapore",
    budgetText: "$500-800",
    scheduleDate: "",
    recipient: "",
    notificationMessage: "",
    channel: "",
    makeScenario: "",
    salary: "",
    availability: "",
  },
};

console.log(`\n🔗 Testing webhook: ${url}`);
console.log(`📦 Payload: ${JSON.stringify(payload).slice(0, 100)}...\n`);

const urlObj = new URL(url);
const options = {
  hostname: urlObj.hostname,
  path: urlObj.pathname,
  method: "POST",
  headers: { "Content-Type": "application/json" },
};

const https = await import("https");
const req = https.request(options, (res) => {
  let body = "";
  res.on("data", (chunk) => (body += chunk));
  res.on("end", () => {
    console.log(`📡 HTTP Status: ${res.statusCode}`);
    console.log(`📄 Response: ${body}\n`);

    if (res.statusCode === 200) {
      console.log("✅ SUCCESS — Make.com scenario is listening and responding!");
    } else if (res.statusCode === 410) {
      console.log("❌ FAIL 410 — No scenario listening. Steps to fix:");
      console.log("   1. Go to https://eu1.make.com → Scenarios");
      console.log('   2. Open your "Helped Workflow Orchestrator" scenario');
      console.log("   3. Click the webhook module → verify the URL matches above");
      console.log("   4. Turn the scenario ON (toggle bottom-left)");
      console.log("   5. Re-run this test");
    } else if (res.statusCode === 400) {
      console.log("⚠️  FAIL 400 — Scenario is listening but rejected the payload.");
    } else {
      console.log(`⚠️  Unexpected status ${res.statusCode}`);
    }
  });
});

req.on("error", (e) => console.error("❌ Connection error:", e.message));
req.write(JSON.stringify(payload));
req.end();