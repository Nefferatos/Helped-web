#!/usr/bin/env node
/**
 * Test HR Interview Email webhook — simulates a completed interview result.
 * Usage: node scripts/test-hr-interview-email.mjs [pass|fail|invitation]
 */

const webhookUrl = "https://hook.eu1.make.com/3d9ngjcns5mljp3vhnppepfjuuvrcrut";
const testType = process.argv[2] || "pass";

const payloads = {
  invitation: {
    type: "interview_invitation",
    to: "test@test.com",
    candidateName: "Maria Santos",
    position: "Full-time Domestic Helper (Childcare)",
    scheduledDate: "Monday, August 25, 2026",
    scheduledTime: "02:30 PM",
  },
  pass: {
    type: "pass",
    to: "test@test.com",
    candidateName: "Maria Santos",
    position: "Full-time Domestic Helper (Childcare)",
    rating: 85,
    recommendation: "pass",
    summary: "Strong candidate with 5+ years experience in childcare and housekeeping. Excellent communication skills and positive attitude.",
    strengthsHtml: "<li>5+ years of childcare experience</li><li>Excellent communication skills</li><li>Previous Singapore employer reference</li><li>Cooking and housekeeping skills</li>",
    weaknessesHtml: "",
  },
  fail: {
    type: "fail",
    to: "test@test.com",
    candidateName: "Ana Reyes",
    position: "Part-time Domestic Helper (Eldercare)",
    rating: 35,
    recommendation: "fail",
    summary: "Candidate lacks relevant experience for eldercare position. Limited communication skills.",
    strengthsHtml: "<li>Willingness to learn</li>",
    weaknessesHtml: "<li>No eldercare experience</li><li>Limited English communication</li><li>Unable to commit to required schedule</li>",
  },
};

const payload = payloads[testType];
if (!payload) {
  console.error(`Unknown type: ${testType}. Use: pass, fail, or invitation`);
  process.exit(1);
}

console.log(`\n🧪 Testing HR Interview Email — Type: ${testType}`);
console.log(`🔗 Webhook: ${webhookUrl}`);
console.log(`📦 Payload: ${JSON.stringify(payload).slice(0, 150)}...\n`);

const urlObj = new URL(webhookUrl);
const https = await import("https");
const options = {
  hostname: urlObj.hostname,
  path: urlObj.pathname,
  method: "POST",
  headers: { "Content-Type": "application/json" },
};

const req = https.request(options, (res) => {
  let body = "";
  res.on("data", (chunk) => (body += chunk));
  res.on("end", () => {
    console.log(`📡 HTTP Status: ${res.statusCode}`);
    console.log(`📄 Response: ${body}\n`);

    if (res.statusCode === 200) {
      console.log("✅ SUCCESS — Email sent! Check your Gmail inbox.");
    } else {
      console.log(`⚠️ Status ${res.statusCode} — Check Make.com execution history.`);
    }
  });
});

req.on("error", (e) => console.error("❌ Connection error:", e.message));
req.write(JSON.stringify(payload));
req.end();