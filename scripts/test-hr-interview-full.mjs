#!/usr/bin/env node
/**
 * Full HR Interview Email Test Suite
 * Tests scheduling, pass, and fail emails for two job applicants.
 * 
 * Usage: node scripts/test-hr-interview-full.mjs
 * 
 * Calls the Make.com webhook directly (same as the Cloudflare Function endpoint does).
 */

const MAKE_WEBHOOK_URL = "https://hook.eu1.make.com/3d9ngjcns5mljp3vhnppepfjuuvrcrut";

const candidates = [
  {
    name: "Jonathan Tan",
    email: "jonathan.tan.1290@gmail.com",
    position: "Full-time Domestic Helper (Childcare)",
  },
  {
    name: "Khyle Colarina",
    email: "khylecolarinamaids@gmail.com",
    position: "Full-time Domestic Helper (General Housekeeping)",
  },
];

// ─── Helper ──────────────────────────────────────────────────────────────────

async function callWebhook(payload) {
  console.log(`\n📡 POST ${MAKE_WEBHOOK_URL}`);
  console.log(`📦 Payload: ${JSON.stringify(payload, null, 2).slice(0, 500)}`);

  try {
    const res = await fetch(MAKE_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const text = await res.text().catch(() => "");
    console.log(`📡 Status: ${res.status}`);
    console.log(`📄 Response: ${text.slice(0, 300)}`);
    return { ok: res.ok, status: res.status, data: text };
  } catch (err) {
    console.error(`❌ Request failed: ${err.message}`);
    return { ok: false, status: 0, data: err.message };
  }
}

function divider(title) {
  console.log(`\n${"═".repeat(70)}`);
  console.log(`  ${title}`);
  console.log(`${"═".repeat(70)}`);
}

// ─── Test 1: Schedule Interview Invitations ──────────────────────────────────

async function testScheduling() {
  divider("📅 TEST 1: Schedule Interview Invitations");

  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 3);
  const dateStr = futureDate.toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  const timeStr = "10:00 AM";

  for (const candidate of candidates) {
    divider(`📅 Scheduling: ${candidate.name} (${candidate.email})`);
    const result = await callWebhook({
      to: candidate.email,
      candidateName: candidate.name,
      position: candidate.position,
      type: "interview_invitation",
      scheduledDate: dateStr,
      scheduledTime: timeStr,
      meetLink: "https://meet.google.com/test-meeting-link",
    });

    if (result.ok) {
      console.log(`✅ Invitation sent to ${candidate.email}`);
    } else {
      console.log(`⚠️ Invitation for ${candidate.email} returned status ${result.status}`);
    }
  }
}

// ─── Test 2: Send PASS Result Email ─────────────────────────────────────────

async function testPassEmail() {
  divider("✅ TEST 2: Send PASS Result Email (Jonathan Tan)");

  const candidate = candidates[0];
  console.log(`\n🎯 Candidate: ${candidate.name} → PASS`);

  const result = await callWebhook({
    to: candidate.email,
    candidateName: candidate.name,
    position: candidate.position,
    type: "pass",
    rating: 85,
    strengthsHtml:
      "<li>5+ years of childcare experience</li>" +
      "<li>Excellent communication skills</li>" +
      "<li>Previous Singapore employer reference</li>" +
      "<li>Cooking and housekeeping skills</li>" +
      "<li>Strong work ethic and positive attitude</li>",
  });

  if (result.ok) {
    console.log(`✅ PASS email sent to ${candidate.email}`);
  } else {
    console.log(`⚠️ PASS email returned status ${result.status}`);
  }
}

// ─── Test 3: Send FAIL Result Email ─────────────────────────────────────────

async function testFailEmail() {
  divider("❌ TEST 3: Send FAIL Result Email (Khyle Colarina)");

  const candidate = candidates[1];
  console.log(`\n🎯 Candidate: ${candidate.name} → FAIL`);

  const result = await callWebhook({
    to: candidate.email,
    candidateName: candidate.name,
    position: candidate.position,
    type: "fail",
    rating: 32,
    weaknessesHtml:
      "<li>Insufficient domestic work experience</li>" +
      "<li>Limited childcare background</li>" +
      "<li>Unable to commit to full-time live-in arrangement</li>",
  });

  if (result.ok) {
    console.log(`✅ FAIL email sent to ${candidate.email}`);
  } else {
    console.log(`⚠️ FAIL email returned status ${result.status}`);
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🧪 HR Interview Full Test Suite");
  console.log(`🔗 Webhook: ${MAKE_WEBHOOK_URL}`);
  console.log(`👥 Candidates: ${candidates.map((c) => c.email).join(", ")}`);
  console.log(`⏰ Started: ${new Date().toISOString()}\n`);

  await testScheduling();
  await testPassEmail();
  await testFailEmail();

  divider("🏁 SUMMARY");
  console.log("All tests completed. Check the emails:");
  console.log(`  📧 ${candidates[0].email} — Should receive: invitation + PASS result`);
  console.log(`  📧 ${candidates[1].email} — Should receive: invitation + FAIL result`);
  console.log(`\n⏰ Finished: ${new Date().toISOString()}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});