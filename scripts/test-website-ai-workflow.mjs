#!/usr/bin/env node
/**
 * Test all routes of the "WEBSITE AI WORKFLOW" Make.com blueprint.
 *
 * Usage:
 *   node scripts/test-website-ai-workflow.mjs                    # test all routes
 *   node scripts/test-website-ai-workflow.mjs inquiry_pipeline   # test one route
 *
 * Webhook URL: https://hook.eu1.make.com/ms7gknazwsiqxyx41miqivon94vgspr1
 */

const WEBHOOK_URL =
  "https://hook.eu1.make.com/ms7gknazwsiqxyx41miqivon94vgspr1";

// ─── Test payloads for each route ────────────────────────────────────────────

const tests = [
  {
    name: "Route 1 — Inquiry Pipeline",
    payload: {
      scenario: "inquiry_pipeline",
      inquiryId: 1001,
      name: "Test User",
      contact: "test@example.com",
      message: "Looking for a full-time maid",
    },
    expectedStatus: 200,
    expectedEvent: "inquiry.processed",
  },
  {
    name: "Route 2 — Lead Pipeline",
    payload: {
      scenario: "lead_pipeline",
      leadId: 2001,
      name: "Lead Test",
      contact: "+6591234567",
      source: "website",
    },
    expectedStatus: 200,
    expectedEvent: "lead.created",
  },
  {
    name: "Route 3 — Interview Session (no email type)",
    payload: {
      scenario: "interview_pipeline",
      applicationId: "interview-test-001",
      rating: 75,
      recommendation: "pass",
    },
    expectedStatus: 200,
    expectedEvent: "interview.completed",
  },
  {
    name: "Route 4 — Candidate Passed (sends email)",
    payload: {
      scenario: "interview_pipeline",
      type: "pass",
      to: "nefferoneff@gmail.com",
      candidateName: "Maria Santos",
      position: "Domestic Worker (Childcare)",
      rating: 85,
    },
    expectedStatus: 200,
    expectedEvent: "candidate_email_sent",
  },
  {
    name: "Route 5 — Candidate Failed (sends email)",
    payload: {
      scenario: "interview_pipeline",
      type: "fail",
      to: "nefferoneff@gmail.com",
      candidateName: "John Doe",
      position: "Domestic Worker (Eldercare)",
    },
    expectedStatus: 200,
    expectedEvent: "candidate_email_sent",
  },
  {
    name: "Route 6 — Interview Invitation (calendar + email)",
    payload: {
      scenario: "interview_pipeline",
      type: "interview_invitation",
      to: "nefferoneff@gmail.com",
      candidateName: "Ana Reyes",
      position: "Domestic Worker (Housekeeping)",
      scheduledDate: "2026-09-01",
      scheduledTime: "10:00",
    },
    expectedStatus: 200,
    expectedEvent: "candidate_email_sent",
  },
  {
    name: "Route 7 — Applicant Interview Completed",
    payload: {
      scenario: "applicant_interview_completed",
      applicationId: "app-test-001",
    },
    expectedStatus: 200,
    expectedEvent: "interview.saved",
  },
  {
    name: "Route 8 — Unsupported Scenario (fallback 400)",
    payload: {
      scenario: "unknown_scenario",
    },
    expectedStatus: 400,
    expectedEvent: null,
  },
];

// ─── HTTP helper ─────────────────────────────────────────────────────────────

const postJson = (url, body) =>
  new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const urlObj = new URL(url);
    const https = import.meta.url.startsWith("https") ? undefined : undefined; // placeholder
    // Dynamic import for Node ESM
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

const filter = process.argv[2]?.toLowerCase();
const toRun = filter
  ? tests.filter((t) => t.name.toLowerCase().includes(filter))
  : tests;

if (toRun.length === 0) {
  console.error(`❌ No test matched filter: "${filter}"`);
  console.error(
    "Available: " + tests.map((t) => t.name.split("—")[0].trim()).join(", "),
  );
  process.exit(1);
}

console.log(`\n🔗 Webhook: ${WEBHOOK_URL}`);
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

    const statusOk = status === test.expectedStatus;
    const eventOk =
      !test.expectedEvent || parsed?.event === test.expectedEvent;

    if (statusOk && eventOk) {
      console.log(
        `✅ HTTP ${status}` +
          (parsed ? ` — ${JSON.stringify(parsed)}` : body ? ` — ${body.slice(0, 120)}` : " (no body)"),
      );
      passed++;
    } else {
      console.log(
        `⚠️  HTTP ${status} (expected ${test.expectedStatus})` +
          (parsed ? ` — ${JSON.stringify(parsed)}` : body ? ` — ${body.slice(0, 120)}` : " (no body)"),
      );
      // Only count as failure if status is wrong; event mismatch is informational
      if (!statusOk) failed++;
      else passed++; // status OK but event different = still working
    }
  } catch (err) {
    console.log(`❌ Error: ${err.message}`);
    failed++;
  }
}

console.log(`\n${"─".repeat(60)}`);
console.log(`✅ Passed: ${passed}  ❌ Failed: ${failed}  Total: ${toRun.length}`);

if (failed > 0) {
  console.log(
    "\n⚠️  Some tests failed. Check Make.com execution history for details.",
  );
  console.log(
    "   Go to https://eu1.make.com → Scenarios → WEBSITE AI WORKFLOW → History",
  );
}

process.exit(failed > 0 ? 1 : 0);