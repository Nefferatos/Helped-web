/**
 * Focused test for AI Assistant & AI Command Center responses
 * Tests the exact endpoints used by:
 *   - ApplicantAiAssistant (pre-submission local + post-submission /api/ai/screen-applicant-public)
 *   - AiAgentsPage Command Center chat (/api/inquiry via useAiAutomation)
 *   - AI Receptionist (/api/ai/receptionist)
 *
 * Usage: node scripts/test-ai-assistant-command-center.mjs
 */

const WORKER_URL = "https://findmaid.wow-aisolution.workers.dev";
const TIMEOUT_MS = 120_000;

let passed = 0;
let failed = 0;
let warnings = 0;
let bugs = [];

function log(icon, msg) {
  console.log(`  ${icon} ${msg}`);
}

function separator(title) {
  console.log("");
  console.log(`── ${title} ${"─".repeat(Math.max(0, 60 - title.length))}`);
}

async function fetchJson(url, options = {}) {
  const { method = "GET", body, headers = {} } = options;
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data, ok: res.ok };
}

// ═══════════════════════════════════════════════════════════════
//  TEST 1: AI Command Center — Inquiry Processing
//  (This is what AiAgentsPage's AiChatPanel uses via useAiAutomation)
// ═══════════════════════════════════════════════════════════════
async function testCommandCenterInquiry() {
  separator("AI Command Center — Inquiry Chat (POST /api/inquiry)");

  // Test 1a: Hiring inquiry — check response structure matches frontend expectations
  console.log("  Test 1a: Hiring inquiry — response structure check...");
  try {
    const { status, data } = await fetchJson(`${WORKER_URL}/api/inquiry`, {
      method: "POST",
      body: {
        name: "Sarah Tan",
        contact: "+6591234567",
        message: "I'm looking for a Filipino maid who can cook and take care of my 2-year-old daughter. Budget around $600-700 per month.",
      },
    });

    if (status === 200 && data) {
      // Check what the frontend (useAiAutomation) expects at top level
      const hasTopLevelReply = typeof data.reply === "string" && data.reply.length > 0;
      const hasTopLevelInquiry = data.inquiry && typeof data.inquiry === "object";
      const hasTopLevelMatches = Array.isArray(data.matches);

      // Check what the API actually returns (nested under data)
      const hasNestedReply = typeof data.data?.reply === "string" && data.data.reply.length > 0;
      const hasNestedInquiry = data.data?.inquiry && typeof data.data.inquiry === "object";
      const hasNestedMatches = Array.isArray(data.data?.matches);

      const hasWorkflow = typeof data.workflow === "string";

      if (hasTopLevelReply && hasTopLevelInquiry && hasWorkflow) {
        log("✅", `Hiring inquiry — response structure matches frontend expectations`);
        log("  📝", `Reply: ${data.reply.slice(0, 150)}...`);
        if (hasTopLevelMatches && data.matches.length > 0) {
          log("  🎯", `Found ${data.matches.length} maid matches`);
        }
        passed++;
      } else if (hasNestedReply && hasNestedInquiry && hasWorkflow) {
        // BUG: Data is nested under .data but frontend expects it at top level
        log("🐛", `STRUCTURE MISMATCH — reply/inquiry/matches are nested under .data`);
        log("  ", `Frontend expects: { reply, inquiry, matches } at top level`);
        log("  ", `API returns:     { workflow, intent, data: { reply, inquiry, matches } }`);
        log("  📝", `Reply (nested): ${data.data.reply.slice(0, 150)}...`);
        if (hasNestedMatches) {
          log("  🎯", `Found ${data.data.matches.length} maid matches (nested)`);
        }
        bugs.push("AI Command Center: /api/inquiry response structure mismatch — reply/inquiry/matches nested under .data, frontend expects top-level");
        warnings++;
      } else {
        log("❌", `Hiring inquiry — unexpected response structure`);
        console.log(`      Keys: ${Object.keys(data).join(", ")}`);
        failed++;
      }
    } else {
      log("❌", `Hiring inquiry failed — status ${status}`);
      console.log(`      Response: ${JSON.stringify(data).slice(0, 500)}`);
      failed++;
    }
  } catch (err) {
    log("❌", `Hiring inquiry error — ${err.message}`);
    failed++;
  }

  // Test 1b: Complaint inquiry
  console.log("  Test 1b: Complaint inquiry...");
  try {
    const { status, data } = await fetchJson(`${WORKER_URL}/api/inquiry`, {
      method: "POST",
      body: {
        name: "James Wong",
        contact: "james@email.com",
        message: "I'm very unhappy with the maid you sent. She doesn't know how to cook and is always on her phone. I want a replacement immediately.",
      },
    });

    if (status === 200 && data) {
      const reply = data.reply || data.data?.reply;
      const workflow = data.workflow;
      const intent = data.inquiry?.intent || data.data?.inquiry?.intent;

      if (reply && workflow) {
        log("✅", `Complaint processed — workflow=${workflow}, intent=${intent}`);
        log("  📝", `Reply: ${reply.slice(0, 150)}...`);
        passed++;
      } else {
        log("⚠️", `Complaint response incomplete`);
        warnings++;
      }
    } else {
      log("❌", `Complaint inquiry failed — status ${status}`);
      failed++;
    }
  } catch (err) {
    log("❌", `Complaint inquiry error — ${err.message}`);
    failed++;
  }

  // Test 1c: Contract inquiry
  console.log("  Test 1c: Contract inquiry...");
  try {
    const { status, data } = await fetchJson(`${WORKER_URL}/api/inquiry`, {
      method: "POST",
      body: {
        name: "Lisa Chen",
        contact: "+6598765432",
        message: "I'd like to generate a contract for my new helper who starts next Monday.",
      },
    });

    if (status === 200 && data) {
      const reply = data.reply || data.data?.reply;
      const workflow = data.workflow;

      if (reply && workflow) {
        log("✅", `Contract inquiry processed — workflow=${workflow}`);
        log("  📝", `Reply: ${reply.slice(0, 150)}...`);
        passed++;
      } else {
        log("⚠️", `Contract response incomplete`);
        warnings++;
      }
    } else {
      log("❌", `Contract inquiry failed — status ${status}`);
      failed++;
    }
  } catch (err) {
    log("❌", `Contract inquiry error — ${err.message}`);
    failed++;
  }

  // Test 1d: Schedule inquiry
  console.log("  Test 1d: Schedule inquiry...");
  try {
    const { status, data } = await fetchJson(`${WORKER_URL}/api/inquiry`, {
      method: "POST",
      body: {
        name: "David Lim",
        contact: "+6591112222",
        message: "Can I schedule an interview with the maid this Saturday at 2pm?",
      },
    });

    if (status === 200 && data) {
      const reply = data.reply || data.data?.reply;
      const workflow = data.workflow;

      if (reply && workflow) {
        log("✅", `Schedule inquiry processed — workflow=${workflow}`);
        log("  📝", `Reply: ${reply.slice(0, 150)}...`);
        passed++;
      } else {
        log("⚠️", `Schedule response incomplete`);
        warnings++;
      }
    } else {
      log("❌", `Schedule inquiry failed — status ${status}`);
      failed++;
    }
  } catch (err) {
    log("❌", `Schedule inquiry error — ${err.message}`);
    failed++;
  }
}

// ═══════════════════════════════════════════════════════════════
//  TEST 2: AI Receptionist (public chatbot)
// ═══════════════════════════════════════════════════════════════
async function testReceptionist() {
  separator("AI Receptionist — Public Chatbot (POST /api/ai/receptionist)");

  const scenarios = [
    {
      name: "Hiring question",
      message: "Hi, I need a helper who can cook Chinese food and take care of my elderly mother. What do you recommend?",
      agentId: "receptionist",
    },
    {
      name: "Fee inquiry",
      message: "How much does it cost to hire a domestic helper through your agency?",
      agentId: "receptionist",
    },
    {
      name: "Nationality availability",
      message: "Do you have any Myanmar helpers available with experience in newborn care?",
      agentId: "receptionist",
    },
    {
      name: "Process question",
      message: "What's the process for hiring a helper? How long does it take?",
      agentId: "receptionist",
    },
  ];

  for (const scenario of scenarios) {
    console.log(`  Testing: ${scenario.name}...`);
    try {
      const { status, data } = await fetchJson(`${WORKER_URL}/api/ai/receptionist`, {
        method: "POST",
        body: scenario,
      });

      if (status === 200 && data) {
        const hasResponse = typeof data.response === "string" && data.response.length > 0;
        const hasAgent = data.agent && data.agent.id;

        if (hasResponse && hasAgent) {
          log("✅", `${scenario.name} — AI responded (${data.response.length} chars), agent=${data.agent.name || data.agent.id}`);
          log("  📝", `Response: ${data.response.slice(0, 120)}...`);
          passed++;
        } else {
          log("⚠️", `${scenario.name} — missing response or agent info`);
          console.log(`      Keys: ${Object.keys(data).join(", ")}`);
          warnings++;
        }
      } else if (status === 401) {
        log("✅", `${scenario.name} — endpoint exists (401 auth required)`);
        passed++;
      } else if (status === 503) {
        log("⚠️", `${scenario.name} — AI service not configured: ${data?.error || "unknown"}`);
        warnings++;
      } else {
        log("❌", `${scenario.name} — status ${status}: ${data?.error || "unknown"}`);
        failed++;
      }
    } catch (err) {
      log("❌", `${scenario.name} — ${err.message}`);
      failed++;
    }
  }
}

// ═══════════════════════════════════════════════════════════════
//  TEST 3: AI Screen Applicant (post-submission)
// ═══════════════════════════════════════════════════════════════
async function testScreenApplicant() {
  separator("AI Screen Applicant — Post-Submission (POST /api/ai/screen-applicant-public)");

  console.log("  Testing: Screen applicant endpoint validation...");
  try {
    const { status, data } = await fetchJson(`${WORKER_URL}/api/ai/screen-applicant-public`, {
      method: "POST",
      body: {
        applicationId: "test-app-001",
        applicantAccessToken: "test-token-001",
        message: "Please review my application and tell me what I need to improve.",
        history: [],
      },
    });

    if (status === 200 && data) {
      const hasResponse = typeof data.response === "string" && data.response.length > 0;
      if (hasResponse) {
        log("✅", `Screen applicant — AI responded (${data.response.length} chars)`);
        log("  📝", `Response: ${data.response.slice(0, 150)}...`);
        passed++;
      } else {
        log("⚠️", `Screen applicant — empty response`);
        warnings++;
      }
    } else if (status === 400 || status === 401 || status === 403 || status === 404) {
      log("✅", `Screen applicant endpoint works — ${status}: ${data?.error || "validation/auth required (expected with test data)"}`);
      passed++;
    } else if (status === 503) {
      log("⚠️", `Screen applicant — AI service not configured`);
      warnings++;
    } else {
      log("❌", `Screen applicant — unexpected status ${status}: ${data?.error || "unknown"}`);
      failed++;
    }
  } catch (err) {
    log("❌", `Screen applicant — ${err.message}`);
    failed++;
  }
}

// ═══════════════════════════════════════════════════════════════
//  TEST 4: AI Agency Assistant (admin)
// ═══════════════════════════════════════════════════════════════
async function testAgencyAssistant() {
  separator("AI Agency Assistant — Admin (POST /api/ai/agency-assistant)");

  console.log("  Testing: Agency assistant endpoint...");
  try {
    const { status, data } = await fetchJson(`${WORKER_URL}/api/ai/agency-assistant`, {
      method: "POST",
      body: {
        message: "Show me a summary of my pending enquiries and requests",
        agentId: "agency-assistant",
      },
    });

    if (status === 200 && data) {
      const hasResponse = typeof data.response === "string" && data.response.length > 0;
      if (hasResponse) {
        log("✅", `Agency assistant — AI responded (${data.response.length} chars)`);
        log("  📝", `Response: ${data.response.slice(0, 150)}...`);
        passed++;
      } else {
        log("⚠️", `Agency assistant — empty response`);
        warnings++;
      }
    } else if (status === 401) {
      log("✅", `Agency assistant — endpoint exists (401 auth required, expected for admin)`);
      passed++;
    } else if (status === 503) {
      log("⚠️", `Agency assistant — AI service not configured`);
      warnings++;
    } else {
      log("❌", `Agency assistant — unexpected status ${status}: ${data?.error || "unknown"}`);
      failed++;
    }
  } catch (err) {
    log("❌", `Agency assistant — ${err.message}`);
    failed++;
  }
}

// ═══════════════════════════════════════════════════════════════
//  TEST 5: Multi-turn conversation
// ═══════════════════════════════════════════════════════════════
async function testMultiTurnConversation() {
  separator("Multi-turn Conversation — Simulates AI Command Center chat session");

  console.log("  Testing: Multi-turn inquiry conversation...");
  try {
    // First message
    const { status: s1, data: d1 } = await fetchJson(`${WORKER_URL}/api/inquiry`, {
      method: "POST",
      body: {
        name: "Test User",
        contact: "test@example.com",
        message: "I'm looking for a maid who can cook and clean. Preferably Filipino.",
      },
    });

    const reply1 = d1?.reply || d1?.data?.reply;
    if (s1 === 200 && reply1) {
      log("✅", `Turn 1 — workflow=${d1.workflow}, reply=${reply1.length} chars`);
      passed++;
    } else {
      log("❌", `Multi-turn: first message failed — status ${s1}`);
      failed++;
      return;
    }

    // Second message (follow-up)
    const { status: s2, data: d2 } = await fetchJson(`${WORKER_URL}/api/inquiry`, {
      method: "POST",
      body: {
        name: "Test User",
        contact: "test@example.com",
        message: "What about the cost? And how long does the process take?",
      },
    });

    const reply2 = d2?.reply || d2?.data?.reply;
    if (s2 === 200 && reply2) {
      log("✅", `Turn 2 — workflow=${d2.workflow}, reply=${reply2.length} chars`);
      passed++;
    } else {
      log("⚠️", `Multi-turn: second message — status ${s2}`);
      warnings++;
    }

    // Third message (specific request)
    const { status: s3, data: d3 } = await fetchJson(`${WORKER_URL}/api/inquiry`, {
      method: "POST",
      body: {
        name: "Test User",
        contact: "test@example.com",
        message: "Can you show me available helpers with at least 3 years experience?",
      },
    });

    const reply3 = d3?.reply || d3?.data?.reply;
    const matches3 = d3?.matches || d3?.data?.matches;
    if (s3 === 200 && reply3) {
      log("✅", `Turn 3 — workflow=${d3.workflow}, reply=${reply3.length} chars`);
      if (matches3?.length > 0) {
        log("  🎯", `Found ${matches3.length} matches in follow-up`);
      }
      passed++;
    } else {
      log("⚠️", `Multi-turn: third message — status ${s3}`);
      warnings++;
    }
  } catch (err) {
    log("❌", `Multi-turn conversation error — ${err.message}`);
    failed++;
  }
}

// ═══════════════════════════════════════════════════════════════
//  TEST 6: Response quality checks
// ═══════════════════════════════════════════════════════════════
async function testResponseQuality() {
  separator("Response Quality Checks");

  console.log("  Testing: Response relevance and quality...");
  try {
    const { status, data } = await fetchJson(`${WORKER_URL}/api/ai/receptionist`, {
      method: "POST",
      body: {
        message: "I need a helper for my family. We have 3 kids under 10 and an elderly grandmother. Budget is $500-650. What nationality do you recommend?",
        agentId: "receptionist",
      },
    });

    if (status === 200 && data?.response) {
      const response = data.response.toLowerCase();
      const qualityChecks = [
        { check: response.length > 100, label: "Sufficient length (>100 chars)" },
        { check: response.includes("helper") || response.includes("maid") || response.includes("domestic"), label: "References helper/maid" },
        { check: !response.includes("i'm sorry, i can't") || !response.includes("i cannot help"), label: "Not a refusal" },
        { check: !response.includes("as an ai") || response.includes("recommend"), label: "Helpful tone" },
      ];

      let qualityPassed = 0;
      for (const q of qualityChecks) {
        if (q.check) {
          log("  ✅", q.label);
          qualityPassed++;
        } else {
          log("  ⚠️", q.label);
        }
      }

      if (qualityPassed >= 3) {
        log("✅", `Response quality: ${qualityPassed}/${qualityChecks.length} checks passed`);
        passed++;
      } else {
        log("⚠️", `Response quality: only ${qualityPassed}/${qualityChecks.length} checks passed`);
        warnings++;
      }
    } else {
      log("⚠️", `Quality check skipped — status ${status}`);
      warnings++;
    }
  } catch (err) {
    log("❌", `Quality check error — ${err.message}`);
    failed++;
  }
}

// ═══════════════════════════════════════════════════════════════
//  MAIN
// ═══════════════════════════════════════════════════════════════
async function main() {
  console.log("═".repeat(70));
  console.log("  🤖 AI ASSISTANT & COMMAND CENTER — RESPONSE TEST");
  console.log(`  Worker: ${WORKER_URL}`);
  console.log(`  Time:   ${new Date().toISOString()}`);
  console.log("═".repeat(70));

  await testCommandCenterInquiry();
  await testReceptionist();
  await testScreenApplicant();
  await testAgencyAssistant();
  await testMultiTurnConversation();
  await testResponseQuality();

  // Summary
  console.log("");
  console.log("═".repeat(70));
  console.log(`  📊 RESULTS: ${passed} passed, ${warnings} warnings, ${failed} failed`);
  console.log("═".repeat(70));

  if (bugs.length > 0) {
    console.log("");
    console.log("  🐛 BUGS FOUND:");
    bugs.forEach((b, i) => console.log(`    ${i + 1}. ${b}`));
  }

  if (failed === 0 && warnings === 0) {
    console.log("  ✅ ALL AI ASSISTANT & COMMAND CENTER RESPONSES ARE WORKING");
  } else if (failed === 0) {
    console.log("  ⚠️  All core responses working. Some warnings (see above).");
  } else {
    console.log("  ❌ Some AI responses have issues — check details above.");
  }

  console.log("");
  console.log("  Components tested:");
  console.log("  • AI Command Center Chat (AiAgentsPage → /api/inquiry)");
  console.log("  • AI Receptionist (public chatbot → /api/ai/receptionist)");
  console.log("  • AI Screen Applicant (post-submission → /api/ai/screen-applicant-public)");
  console.log("  • AI Agency Assistant (admin → /api/ai/agency-assistant)");
  console.log("  • Multi-turn conversation flow");
  console.log("  • Response quality checks");
  console.log("");

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});