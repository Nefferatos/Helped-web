#!/usr/bin/env node
/**
 * Test all routes of the "Workflow web orchestra" Make.com blueprint.
 *
 * This blueprint uses a Make.com AI Agent to classify incoming requests into
 * one of several workflows, then routes them to the appropriate backend API.
 *
 * Usage:
 *   node scripts/test-workflow-orchestrator.mjs                         # test all routes
 *   node scripts/test-workflow-orchestrator.mjs inquiry_only            # test one route
 *
 * Set webhook URL via env: MAKE_ORCHESTRATOR_WEBHOOK_URL=https://hook.eu1.make.com/xxxxx
 */

const WEBHOOK_URL =
  process.env.MAKE_ORCHESTRATOR_WEBHOOK_URL ||
  "PASTE_YOUR_MAKE_WEBHOOK_URL_HERE";

const TEST_EMAIL = "nefferoneff@gmail.com";

const tests = [
  {
    name: "Route 1 — Inquiry Only (general question)",
    payload: {
      action: "new_inquiry",
      actor: { role: "guest", id: "" },
      customer: { name: "Neffer Oneff", contact: TEST_EMAIL },
      message: "What are your operating hours? Do you serve the Jurong area?",
      context: {},
    },
    expectedWorkflow: "inquiry_only",
  },
  {
    name: "Route 2 — Lead Scoring (new lead)",
    payload: {
      action: "new_lead",
      actor: { role: "guest", id: "" },
      customer: { name: "Neffer Oneff", contact: TEST_EMAIL },
      message: "I am interested in hiring a maid for my family. We need someone who can cook and take care of 2 kids.",
      context: {},
    },
    expectedWorkflow: "lead_scoring",
  },
  {
    name: "Route 3 — Inquiry Match (hiring request)",
    payload: {
      action: "find_match",
      actor: { role: "client", id: "client-001" },
      customer: { name: "Neffer Oneff", contact: TEST_EMAIL },
      message: "I need a recommendation for a domestic worker experienced with elderly care, budget around $600-$800, in Tampines.",
      context: { employerId: "1", serviceType: "elderly_care", location: "Tampines", budgetText: "$600-$800" },
    },
    expectedWorkflow: "inquiry_match",
  },
  {
    name: "Route 4 — Contract Creation",
    payload: {
      action: "generate_contract",
      actor: { role: "agency_admin", id: "admin-001" },
      customer: { name: "Neffer Oneff", contact: TEST_EMAIL },
      message: "Please generate a contract for maid ID 5 with employer ID 1 for general housekeeping in Singapore.",
      context: { maidId: "5", employerId: "1", serviceType: "general_housekeeping", location: "Singapore", budgetText: "$700" },
    },
    expectedWorkflow: "contract_creation",
  },
  {
    name: "Route 5 — Schedule Creation (interview scheduling)",
    payload: {
      action: "schedule_interview",
      actor: { role: "client", id: "client-001" },
      customer: { name: "Neffer Oneff", contact: TEST_EMAIL },
      message: "I would like to schedule an interview with maid ID 3 for next Monday at 2pm.",
      context: { maidId: "3", employerId: "1", datetime: "2026-09-01T14:00:00Z" },
    },
    expectedWorkflow: "schedule_creation",
  },
  {
    name: "Route 6 — Notification Only",
    payload: {
      action: "send_notification",
      actor: { role: "agency_admin", id: "admin-001" },
      customer: { name: "Neffer Oneff", contact: TEST_EMAIL },
      message: "Send a reminder to the sales team about the new batch of applicants.",
      context: { recipient: "sales-team", notificationMessage: "Reminder: 5 new applicants need review.", channel: "internal" },
    },
    expectedWorkflow: "notification_only",
  },
  {
    name: "Route 7 — Applicant Interview (HR request)",
    payload: {
      action: "applicant_interview",
      actor: { role: "agency_admin", id: "admin-001" },
      customer: { name: "Maria Santos", contact: "maria.santos@example.com" },
      message: "Schedule an HR screening interview for applicant Maria Santos who applied for a domestic worker position.",
      context: {},
    },
    expectedWorkflow: "applicant_interview",
  },
  {
    name: "Route 8 — Make Pipeline (backend relay)",
    payload: {
      action: "process_inquiry",
      actor: { role: "ai_agent", id: "make-agent-001" },
      customer: { name: "Neffer Oneff", contact: TEST_EMAIL },
      message: "I want to hire a full-time live-in maid for childcare and housekeeping. Budget $500-$700. I live in Woodlands.",
      context: { makeScenario: "inquiry_pipeline" },
    },
    expectedWorkflow: "make_pipeline",
  },
  {
    name: "Route 9 — Human Review (ambiguous request)",
    payload: {
      action: "unknown_action",
      actor: { role: "guest", id: "" },
      customer: { name: "Neffer Oneff", contact: TEST_EMAIL },
      message: "asdfghjkl random gibberish that makes no sense ???",
      context: {},
    },
    expectedWorkflow: "human_review",
  },
];

// ─── HTTP helper ─────────────────────────────────────────────────────────────

const postJson = (url, body) =>
  new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const urlObj = new URL(url);
    import("https").then((mod) => {
      const req = mod.request(
        {
          hostname: urlObj.hostname,
          path: urlObj.pathname,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(data),
          },
        },
        (res) => {
          let body = "";
          res.on("data", (chunk) => (body += chunk));
          res.on("end", () => resolve({ status: res.statusCode, body }));
        },
      );
      req.on("error", reject);
      req.write(data);
      req.end();
    });
  });

// ─── Runner ──────────────────────────────────────────────────────────────────

if (WEBHOOK_URL === "PASTE_YOUR_MAKE_WEBHOOK_URL_HERE") {
  console.error("❌ Set the Make.com webhook URL in the script or via MAKE_ORCHESTRATOR_WEBHOOK_URL env var.");
  console.error("   After importing the blueprint into Make.com, click the webhook module and copy the URL.");
  process.exit(1);
}

const filter = process.argv[2]?.toLowerCase();
const toRun = filter
  ? tests.filter((t) => t.name.toLowerCase().includes(filter) || t.expectedWorkflow.includes(filter))
  : tests;

if (toRun.length === 0) {
  console.error(`❌ No test matched filter: "${filter}"`);
  console.error("Available: " + tests.map((t) => t.expectedWorkflow).join(", "));
  process.exit(1);
}

console.log(`\n🔗 Webhook: ${WEBHOOK_URL}`);
console.log(`📧 Test email: ${TEST_EMAIL}`);
console.log(`📋 Running ${toRun.length} test(s)\n`);

let passed = 0;
let failed = 0;

for (const test of toRun) {
  process.stdout.write(`⏳ ${test.name} ... `);
  try {
    const { status, body } = await postJson(WEBHOOK_URL, test.payload);
    let parsed;
    try {
      parsed = JSON.parse(body);
    } catch {
      parsed = null;
    }

    const statusOk = status === 200;
    const workflowOk = !parsed?.workflow || parsed.workflow === test.expectedWorkflow;

    if (statusOk && workflowOk) {
      console.log(
        `✅ HTTP ${status}` +
          (parsed ? ` — workflow: ${parsed.workflow}, statusCode: ${parsed.statusCode}` : body ? ` — ${body.slice(0, 120)}` : " (no body)"),
      );
      passed++;
    } else {
      console.log(
        `⚠️  HTTP ${status}` +
          (parsed
            ? ` — workflow: ${parsed?.workflow} (expected ${test.expectedWorkflow}), statusCode: ${parsed?.statusCode}`
            : body
              ? ` — ${body.slice(0, 120)}`
              : " (no body)"),
      );
      if (!statusOk) failed++;
      else passed++;
    }
  } catch (err) {
    console.log(`❌ Error: ${err.message}`);
    failed++;
  }
}

console.log(`\n${"─".repeat(60)}`);
console.log(`✅ Passed: ${passed}  ❌ Failed: ${failed}  Total: ${toRun.length}`);

if (failed > 0) {
  console.log("\n⚠️  Some tests failed. Check Make.com execution history for details.");
  console.log("   Go to https://eu1.make.com → Scenarios → Workflow web orchestra → History");
}

process.exit(failed > 0 ? 1 : 0);
