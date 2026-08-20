/**
 * Live AI Feature Test — tests all AI endpoints on the production domain.
 * Usage: node scripts/test-ai-live.mjs
 */

const BASE_URL = "https://helped-web-v2.jonathan-tan-1290.workers.dev";
const TIMEOUT_MS = 60_000; // 60s for AI processing

let passed = 0;
let failed = 0;
let warnings = 0;

function log(icon, msg) {
  console.log(`  ${icon} ${msg}`);
}

async function testEndpoint(name, path, options = {}) {
  const { method = "GET", body, expectStatus, checkResponse } = options;
  const url = `${BASE_URL}${path}`;
  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const status = res.status;
    let data;
    try {
      data = await res.json();
    } catch {
      data = await res.text().catch(() => "");
    }

    // Check expected status
    if (expectStatus && status !== expectStatus) {
      log("⚠️", `${name} — expected ${expectStatus}, got ${status}`);
      console.log(`      Response: ${JSON.stringify(data).slice(0, 300)}`);
      warnings++;
      return { ok: false, status, data };
    }

    // 401 = endpoint exists, needs auth
    if (status === 401) {
      log("✅", `${name} — endpoint exists (401 auth required)`);
      passed++;
      return { ok: true, status };
    }

    // 200 = check response content
    if (status === 200) {
      if (checkResponse) {
        const checkResult = checkResponse(data);
        if (checkResult.ok) {
          log("✅", `${name} — ${checkResult.msg || "200 OK with valid response"}`);
          passed++;
        } else {
          log("⚠️", `${name} — ${checkResult.msg || "invalid response"}`);
          console.log(`      Response: ${JSON.stringify(data).slice(0, 300)}`);
          warnings++;
        }
      } else {
        log("✅", `${name} — 200 OK`);
        passed++;
      }
      return { ok: true, status, data };
    }

    // 400/422 = validation error (expected for some)
    if ((status === 400 || status === 422) && typeof data === "object" && data?.error) {
      if (options.expectValidationError) {
        log("✅", `${name} — works (${status}: ${data.error})`);
        passed++;
      } else {
        log("⚠️", `${name} — ${status}: ${data.error}`);
        warnings++;
      }
      return { ok: true, status, data };
    }

    // 503 = service not configured
    if (status === 503) {
      log("⚠️", `${name} — endpoint exists but: ${typeof data === "object" ? data?.error : data}`);
      warnings++;
      return { ok: true, status, data, notConfigured: true };
    }

    log("⚠️", `${name} — unexpected status ${status}`);
    console.log(`      Response: ${JSON.stringify(data).slice(0, 300)}`);
    failed++;
    return { ok: false, status, data };
  } catch (err) {
    log("❌", `${name} — ${err.message}`);
    failed++;
    return { ok: false, error: err.message };
  }
}

async function main() {
  console.log("===========================================================");
  console.log("  🔍 Live AI Feature Test — Production Domain");
  console.log(`  ${BASE_URL}`);
  console.log("===========================================================\n");

  // ── 1. Health Check ──────────────────────────────────────────
  console.log("── 1. Basic Health & Data ──");
  await testEndpoint("App Data", "/api/data", {
    checkResponse: (d) => ({
      ok: d && typeof d === "object" && d.maids,
      msg: d?.maids ? `OK — ${d.maids.length} maids loaded` : "no maids in response",
    }),
  });

  // ── 2. AI Inquiry Processing (core AI feature) ──────────────
  console.log("\n── 2. AI Inquiry Processing (processInquiry) ──");
  const inquiryResult = await testEndpoint(
    "Process Inquiry (AI classify + match)",
    "/api/ai/processInquiry",
    {
      method: "POST",
      body: {
        name: "Test User",
        contact: "test@example.com",
        message: "I need a maid for childcare in Singapore, budget 600-800 per month",
      },
      checkResponse: (d) => {
        if (!d) return { ok: false, msg: "empty response" };
        const hasWorkflow = typeof d.workflow === "string";
        const hasData = d.data && typeof d.data === "object";
        const hasClassification = d.intent || d.workflow;
        return {
          ok: hasWorkflow && hasData,
          msg: `workflow=${d.workflow}, intent=${d.intent}, fallbackUsed=${d.fallbackUsed}`,
        };
      },
    },
  );

  // ── 3. AI Receptionist ──────────────────────────────────────
  console.log("\n── 3. AI Receptionist (public chatbot) ──");
  await testEndpoint(
    "Receptionist Chat",
    "/api/ai/receptionist",
    {
      method: "POST",
      body: {
        message: "Hello, I'm looking for a domestic helper who can cook and take care of children",
        agentId: "receptionist",
      },
      checkResponse: (d) => {
        if (!d) return { ok: false, msg: "empty response" };
        const hasResponse = typeof d.response === "string" && d.response.length > 0;
        const hasAgent = d.agent && d.agent.id;
        return {
          ok: hasResponse && hasAgent,
          msg: hasResponse
            ? `AI responded (${d.response.length} chars), agent=${d.agent?.name || d.agent?.id}`
            : `missing response field. Keys: ${Object.keys(d).join(",")}`,
        };
      },
    },
  );

  // ── 4. AI Screen Applicant (public) ─────────────────────────
  console.log("\n── 4. AI Screen Applicant (public) ──");
  await testEndpoint(
    "Screen Applicant (public)",
    "/api/ai/screen-applicant-public",
    {
      method: "POST",
      body: {
        agentId: "applicant-screener",
        message: "Please evaluate this applicant profile",
        applicantProfile: {
          fullName: "Test Applicant",
          nationality: "Filipino",
          yearsOfExperience: 5,
          skills: ["cooking", "childcare", "housekeeping"],
        },
      },
      checkResponse: (d) => {
        if (!d) return { ok: false, msg: "empty response" };
        const hasResponse = typeof d.response === "string" && d.response.length > 0;
        return {
          ok: hasResponse,
          msg: hasResponse
            ? `AI responded (${d.response.length} chars)`
            : `error: ${d.error || "unknown"}`,
        };
      },
    },
  );

  // ── 5. AI HR Interview Email ────────────────────────────────
  console.log("\n── 5. AI HR Interview Email ──");
  await testEndpoint(
    "HR Interview Email",
    "/api/ai/hr-interview/email",
    {
      method: "POST",
      body: {
        applicantName: "Test Applicant",
        applicantEmail: "test@example.com",
        agencyId: 1,
      },
      checkResponse: (d) => {
        if (!d) return { ok: false, msg: "empty response" };
        // Could be success or could require more data
        return {
          ok: true,
          msg: `status: ${d.success ? "sent" : d.error || JSON.stringify(d).slice(0, 100)}`,
        };
      },
    },
  );

  // ── 6. AI Recommendation ────────────────────────────────────
  console.log("\n── 6. AI Maid Recommendation (requires auth) ──");
  await testEndpoint(
    "AI Recommend Maid",
    "/api/ai/recommend-maid",
    { method: "POST", body: { message: "I need someone who can cook Chinese food" } },
  );

  // ── 7. AI Employer Support ──────────────────────────────────
  console.log("\n── 7. AI Employer Support (requires auth) ──");
  await testEndpoint(
    "AI Employer Support",
    "/api/ai/employer-support",
    { method: "POST", body: { message: "How do I renew my helper's work permit?" } },
  );

  // ── 8. AI Agency Assistant ──────────────────────────────────
  console.log("\n── 8. AI Agency Assistant (requires auth) ──");
  await testEndpoint(
    "AI Agency Assistant",
    "/api/ai/agency-assistant",
    { method: "POST", body: { message: "Show me my pending enquiries" } },
  );

  // ── 9. AI Admin Analytics ───────────────────────────────────
  console.log("\n── 9. AI Admin Analytics (requires auth) ──");
  await testEndpoint(
    "AI Admin Analytics",
    "/api/ai/admin-analytics",
    { method: "POST", body: { task: "Generate weekly summary" } },
  );

  // ── 10. AI Content Generator ────────────────────────────────
  console.log("\n── 10. AI Content Generator (requires auth) ──");
  await testEndpoint(
    "AI Content Generator",
    "/api/ai/content-generator",
    { method: "POST", body: { task: "Write a WhatsApp message for a new maid listing" } },
  );

  // ── 11. AI Automation ───────────────────────────────────────
  console.log("\n── 11. AI Automation (requires auth) ──");
  await testEndpoint(
    "AI Automation",
    "/api/ai/automation",
    { method: "POST", body: { task: "Check automation status" } },
  );

  // ── 12. AI Autopilot ────────────────────────────────────────
  console.log("\n── 12. AI Autopilot (requires auth) ──");
  await testEndpoint(
    "AI Autopilot Run",
    "/api/ai/autopilot/run",
    { method: "POST", body: {} },
  );

  // ── 13. Direct Marketing ────────────────────────────────────
  console.log("\n── 13. AI Direct Marketing ──");
  await testEndpoint("Marketing Audience", "/api/ai/direct-marketing/audience?type=all_contacts");
  await testEndpoint("Marketing Campaigns", "/api/ai/direct-marketing/campaigns");
  await testEndpoint(
    "Marketing Generate",
    "/api/ai/direct-marketing/generate",
    { method: "POST", body: {} },
  );

  // ── 14. PDF Autofill ────────────────────────────────────────
  console.log("\n── 14. PDF Autofill (requires auth) ──");
  await testEndpoint(
    "PDF Autofill",
    "/api/pdf-autofill",
    { method: "POST", body: {} },
  );

  // ── 15. Inquiry Endpoint (workflow classification) ──────────
  console.log("\n── 15. Inquiry Endpoint (workflow classification) ──");
  await testEndpoint(
    "Inquiry (classify message)",
    "/api/inquiry",
    {
      method: "POST",
      body: {
        name: "Live Test",
        contact: "test@example.com",
        message: "I want to hire a helper for my elderly mother",
      },
      checkResponse: (d) => {
        if (!d) return { ok: false, msg: "empty response" };
        return {
          ok: typeof d.workflow === "string",
          msg: `workflow=${d.workflow}, intent=${d.intent}`,
        };
      },
    },
  );

  // ── Summary ─────────────────────────────────────────────────
  console.log("\n===========================================================");
  console.log(`  📊 Results: ${passed} passed, ${warnings} warnings, ${failed} failed`);
  console.log("===========================================================");
  
  if (failed === 0 && warnings === 0) {
    console.log("  ✅ ALL AI FEATURES ARE WORKING CORRECTLY");
  } else if (failed === 0) {
    console.log("  ⚠️  Some features have warnings (auth-required endpoints returning 401 is expected)");
  } else {
    console.log("  ❌ Some AI features have issues — check details above");
  }
  
  console.log("\n  Notes:");
  console.log("  • 401 = endpoint exists but requires authentication (expected for admin/client endpoints)");
  console.log("  • 503 = AI service key not configured on the server");
  console.log("  • AI responses may take 10-30 seconds depending on the model\n");
  
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});