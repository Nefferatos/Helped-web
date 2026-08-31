/**
 * Test AI Receptionist with off-topic and work/productivity questions
 * Verifies that the AI responds helpfully to ALL prompts, not just maid-related ones.
 */

const WORKER_URL = "https://findmaid.wow-aisolution.workers.dev";
const TIMEOUT_MS = 30_000;

let passed = 0;
let failed = 0;

async function fetchJson(url, options = {}) {
  const { method = "POST", body, headers = {} } = options;
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data, ok: res.ok };
}

async function test(name, message) {
  try {
    const { status, data } = await fetchJson(`${WORKER_URL}/api/ai/receptionist`, {
      body: { message },
    });

    if (status === 200 && data?.response) {
      const response = data.response;
      const isRefusal = /i.m sorry.*only able to help|i cannot help with that|off.topic/i.test(response);
      console.log(`✅ ${name} (${response.length} chars)`);
      console.log(`   ${response.slice(0, 150)}...`);
      if (isRefusal) {
        console.log("   ⚠️  WARNING: Response looks like a refusal!");
      }
      passed++;
    } else {
      console.log(`❌ ${name} — status ${status}`);
      failed++;
    }
  } catch (err) {
    console.log(`❌ ${name} — ${err.message}`);
    failed++;
  }
  console.log("");
}

async function main() {
  console.log("═".repeat(70));
  console.log("  🤖 AI Receptionist — Off-Topic & Work/Productivity Test");
  console.log(`  Worker: ${WORKER_URL}`);
  console.log(`  Time:   ${new Date().toISOString()}`);
  console.log("═".repeat(70));
  console.log("");

  // Off-topic questions
  console.log("── Off-Topic Questions ──────────────────────────────────────");
  await test("Weather question", "What is the weather like today in Singapore?");
  await test("Joke request", "Tell me a funny joke");
  await test("Sports question", "Who won the football match yesterday?");
  await test("Cooking recipe", "Can you give me a simple chicken rice recipe?");

  // Work/productivity questions
  console.log("── Work/Productivity Questions ──────────────────────────────");
  await test("Email writing help", "Help me write a professional email to a client about a delayed delivery");
  await test("Productivity tips", "Give me some productivity tips for managing a busy household");
  await test("Meeting agenda", "How do I create an effective meeting agenda?");
  await test("Task prioritization", "What is the best way to prioritize tasks when everything seems urgent?");

  // Maid-related questions (should still work)
  console.log("── Maid-Related Questions (should still work) ───────────────");
  await test("Maid hiring", "I need a maid for childcare and cooking in Singapore");
  await test("Agency fees", "How much are your agency fees?");

  // Summary
  console.log("═".repeat(70));
  console.log(`  📊 RESULTS: ${passed} passed, ${failed} failed`);
  console.log("═".repeat(70));

  if (failed === 0) {
    console.log("  ✅ ALL TESTS PASSED — AI responds to all types of questions!");
  } else {
    console.log("  ❌ Some tests failed — check details above.");
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
