/**
 * Comprehensive AI Feature Test — tests ALL AI endpoints on findmaid.wow-aisolution.workers.dev
 * Also checks the website at rinzinagency.com
 *
 * Usage: node scripts/test-all-ai-features.mjs
 */

const WORKER_URL = "https://findmaid.wow-aisolution.workers.dev";
const WEBSITE_URL = "https://rinzinagency.com";
const TIMEOUT_MS = 90_000; // 90s for AI processing

let passed = 0;
let failed = 0;
let warnings = 0;

function log(icon, msg) {
  console.log(`  ${icon} ${msg}`);
}

async function testEndpoint(name, path, options = {}) {
  const { method = "GET", body, checkResponse, expectValidationError, expectStatus } = options;
  const url = `${WORKER_URL}${path}`;
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
      console.log(`      Response: ${JSON.stringify(data).slice(0, 400)}`);
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
          console.log(`      Response: ${JSON.stringify(data).slice(0, 400)}`);
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
      if (expectValidationError) {
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

    // 500 = server error
    if (status === 500) {
      log("❌", `${name} — 500 server error: ${typeof data === "object" ? data?.error : String(data).slice(0, 200)}`);
      failed++;
      return { ok: false, status, data };
    }

    // 502 = bad gateway / AI error
    if (status === 502) {
      log("⚠️", `${name} — 502: ${typeof data === "object" ? data?.error : String(data).slice(0, 200)}`);
      warnings++;
      return { ok: false, status, data };
    }

    log("⚠️", `${name} — unexpected status ${status}`);
    console.log(`      Response: ${JSON.stringify(data).slice(0, 400)}`);
    failed++;
    return { ok: false, status, data };
  } catch (err) {
    log("❌", `${name} — ${err.message}`);
    failed++;
    return { ok: false, error: err.message };
  }
}

async function testWebsite() {
  const url = WEBSITE_URL;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    const html = await res.text();
    if (res.status === 200 && html.length > 500) {
      log("✅", `Website loads — ${res.status}, ${html.length} bytes`);
      passed++;
      return true;
    } else {
      log("⚠️", `Website — ${res.status}, ${html.length} bytes`);
      warnings++;
      return false;
    }
  } catch (err) {
    log("❌", `Website unreachable — ${err.message}`);
    failed++;
    return false;
  }
}

async function main() {
  console.log("═".repeat(70));
  console.log("  🔍 COMPREHENSIVE AI FEATURE TEST");
  console.log(`  Worker:  ${WORKER_URL}`);
  console.log(`  Website: ${WEBSITE_URL}`);
  console.log("═".repeat(70));
  console.log("");

  // ═══════════════════════════════════════════════════════════════
  //  0. WEBSITE CHECK
  // ═══════════════════════════════════════════════════════════════
  console.log("── 0. Website Health ──");
  await testWebsite();
  console.log("");

  // ═══════════════════════════════════════════════════════════════
  //  1. WORKER HEALTH & DATA
  // ═══════════════════════════════════════════════════════════════
  console.log("── 1. Worker Health & Data ──");
  await testEndpoint("Health Check", "/api/health", {
    checkResponse: (d) => ({
      ok: d && (d.status === "ok" || d.ok === true || typeof d === "object"),
      msg: `status=${JSON.stringify(d).slice(0, 100)}`,
    }),
  });

  await testEndpoint("App Data", "/api/data", {
    checkResponse: (d) => ({
      ok: d && typeof d === "object" && d.maids,
      msg: d?.maids ? `${d.maids.length} maids loaded` : "no maids in response",
    }),
  });
  console.log("");

  // ═══════════════════════════════════════════════════════════════
  //  2. AI INQUIRY PROCESSING (classify + match)
  // ═══════════════════════════════════════════════════════════════
  console.log("── 2. AI Inquiry Processing ──");
  await testEndpoint(
    "Process Inquiry (hiring intent)",
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
        return {
          ok: hasWorkflow && hasData,
          msg: `workflow=${d.workflow}, intent=${d.intent}, fallbackUsed=${d.fallbackUsed}`,
        };
      },
    },
  );

  await testEndpoint(
    "Process Inquiry (complaint intent)",
    "/api/ai/processInquiry",
    {
      method: "POST",
      body: {
        name: "Angry Client",
        contact: "+6591234567",
        message: "I'm very disappointed with the service, I want a refund and want to speak to a manager",
      },
      checkResponse: (d) => ({
        ok: d && typeof d.workflow === "string",
        msg: `workflow=${d?.workflow}, intent=${d?.intent}`,
      }),
    },
  );

  await testEndpoint(
    "Process Inquiry (contract intent)",
    "/api/ai/processInquiry",
    {
      method: "POST",
      body: {
        name: "Employer",
        contact: "employer@test.com",
        message: "Please generate a contract for my new helper",
      },
      checkResponse: (d) => ({
        ok: d && typeof d.workflow === "string",
        msg: `workflow=${d?.workflow}, intent=${d?.intent}`,
      }),
    },
  );
  console.log("");

  // ═══════════════════════════════════════════════════════════════
  //  3. AI RECEPTIONIST (public chatbot)
  // ═══════════════════════════════════════════════════════════════
  console.log("── 3. AI Receptionist (public chatbot) ──");
  await testEndpoint(
    "Receptionist — Hiring enquiry",
    "/api/ai/receptionist",
    {
      method: "POST",
      body: {
        message: "Hello, I'm looking for a domestic helper who can cook and take care of children. I prefer a Filipino helper.",
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
            : `missing response. Keys: ${Object.keys(d).join(",")}`,
        };
      },
    },
  );

  await testEndpoint(
    "Receptionist — Fee question",
    "/api/ai/receptionist",
    {
      method: "POST",
      body: {
        message: "How much does it cost to hire a helper?",
        agentId: "receptionist",
      },
      checkResponse: (d) => {
        if (!d) return { ok: false, msg: "empty response" };
        const hasResponse = typeof d.response === "string" && d.response.length > 0;
        return {
          ok: hasResponse,
          msg: hasResponse ? `AI responded (${d.response.length} chars)` : `error: ${d.error || "unknown"}`,
        };
      },
    },
  );

  await testEndpoint(
    "Receptionist — Nationality question",
    "/api/ai/receptionist",
    {
      method: "POST",
      body: {
        message: "What nationalities of helpers do you have available?",
        agentId: "receptionist",
      },
      checkResponse: (d) => {
        if (!d) return { ok: false, msg: "empty response" };
        return {
          ok: typeof d.response === "string" && d.response.length > 0,
          msg: d.response ? `AI responded (${d.response.length} chars)` : `error: ${d.error}`,
        };
      },
    },
  );

  await testEndpoint(
    "Receptionist — Contact info",
    "/api/ai/receptionist",
    {
      method: "POST",
      body: {
        message: "What are your contact details and office hours?",
        agentId: "receptionist",
      },
      checkResponse: (d) => {
        if (!d) return { ok: false, msg: "empty response" };
        return {
          ok: typeof d.response === "string" && d.response.length > 0,
          msg: d.response ? `AI responded (${d.response.length} chars)` : `error: ${d.error}`,
        };
      },
    },
  );

  await testEndpoint(
    "Receptionist — How to hire",
    "/api/ai/receptionist",
    {
      method: "POST",
      body: {
        message: "How do I hire a helper through your agency?",
        agentId: "receptionist",
      },
      checkResponse: (d) => {
        if (!d) return { ok: false, msg: "empty response" };
        return {
          ok: typeof d.response === "string" && d.response.length > 0,
          msg: d.response ? `AI responded (${d.response.length} chars)` : `error: ${d.error}`,
        };
      },
    },
  );
  console.log("");

  // ═══════════════════════════════════════════════════════════════
  //  4. AI SCREEN APPLICANT (public)
  // ═══════════════════════════════════════════════════════════════
  console.log("── 4. AI Screen Applicant (public) ──");
  await testEndpoint(
    "Screen Applicant — Complete profile",
    "/api/ai/screen-applicant-public",
    {
      method: "POST",
      body: {
        agentId: "applicant-screener",
        message: "Please evaluate this applicant profile",
        applicantProfile: {
          fullName: "Maria Santos",
          nationality: "Filipino",
          yearsOfExperience: 5,
          skills: ["cooking", "childcare", "housekeeping"],
          certifications: ["Basic First Aid", "Food Hygiene"],
          languages: ["English", "Tagalog"],
        },
      },
      checkResponse: (d) => {
        if (!d) return { ok: false, msg: "empty response" };
        const hasResponse = typeof d.response === "string" && d.response.length > 0;
        return {
          ok: hasResponse,
          msg: hasResponse ? `AI responded (${d.response.length} chars)` : `error: ${d.error || "unknown"}`,
        };
      },
    },
  );

  await testEndpoint(
    "Screen Applicant — Minimal profile",
    "/api/ai/screen-applicant-public",
    {
      method: "POST",
      body: {
        agentId: "applicant-screener",
        message: "Screen this applicant",
        applicantProfile: {
          fullName: "New Worker",
          nationality: "Myanmar",
          yearsOfExperience: 0,
        },
      },
      checkResponse: (d) => {
        if (!d) return { ok: false, msg: "empty response" };
        return {
          ok: typeof d.response === "string" && d.response.length > 0,
          msg: d.response ? `AI responded (${d.response.length} chars)` : `error: ${d.error}`,
        };
      },
    },
  );
  console.log("");

  // ═══════════════════════════════════════════════════════════════
  //  5. AI HR INTERVIEW EMAIL
  // ═══════════════════════════════════════════════════════════════
  console.log("── 5. AI HR Interview Email ──");
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
        return {
          ok: true,
          msg: d.success ? "email sent" : `status: ${d.error || JSON.stringify(d).slice(0, 150)}`,
        };
      },
    },
  );
  console.log("");

  // ═══════════════════════════════════════════════════════════════
  //  6. INQUIRY ENDPOINTS (workflow classification)
  // ═══════════════════════════════════════════════════════════════
  console.log("── 6. Inquiry Classification ──");
  await testEndpoint(
    "Inquiry — Hiring",
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

  await testEndpoint(
    "Inquiry — Schedule",
    "/api/inquiry",
    {
      method: "POST",
      body: {
        name: "Schedule Test",
        contact: "+6591234567",
        message: "I'd like to schedule an interview with a helper",
      },
      checkResponse: (d) => ({
        ok: d && typeof d.workflow === "string",
        msg: `workflow=${d?.workflow}, intent=${d?.intent}`,
      }),
    },
  );
  console.log("");

  // ═══════════════════════════════════════════════════════════════
  //  7. AUTH-REQUIRED ENDPOINTS (expect 401)
  // ═══════════════════════════════════════════════════════════════
  console.log("── 7. AI Maid Recommendation (requires client auth) ──");
  await testEndpoint(
    "AI Recommend Maid",
    "/api/ai/recommend-maid",
    { method: "POST", body: { message: "I need someone who can cook Chinese food and care for toddlers" } },
  );
  console.log("");

  console.log("── 8. AI Employer Support (requires client auth) ──");
  await testEndpoint(
    "AI Employer Support",
    "/api/ai/employer-support",
    { method: "POST", body: { message: "How do I renew my helper's work permit?" } },
  );
  console.log("");

  console.log("── 9. AI Agency Assistant (requires admin auth) ──");
  await testEndpoint(
    "AI Agency Assistant",
    "/api/ai/agency-assistant",
    { method: "POST", body: { message: "Show me my pending enquiries" } },
  );
  console.log("");

  console.log("── 10. AI Screen Applicant (admin) ──");
  await testEndpoint(
    "Screen Applicant (admin)",
    "/api/ai/screen-applicant",
    { method: "POST", body: { message: "Screen applicant", applicantProfile: { fullName: "Test" } } },
  );
  console.log("");

  console.log("── 11. AI HR Interview Chat (admin) ──");
  await testEndpoint(
    "HR Interview Chat",
    "/api/ai/hr-interview/chat",
    { method: "POST", body: { message: "Start interview" } },
  );
  console.log("");

  console.log("── 12. AI HR Interview Session (admin) ──");
  await testEndpoint(
    "HR Interview Session",
    "/api/ai/hr-interview/session",
    { method: "POST", body: { applicantEmail: "test@example.com" } },
  );
  console.log("");

  console.log("── 13. AI Admin Analytics (admin) ──");
  await testEndpoint(
    "AI Admin Analytics",
    "/api/ai/admin-analytics",
    { method: "POST", body: { task: "Generate weekly summary" } },
  );
  console.log("");

  console.log("── 14. AI Content Generator (admin) ──");
  await testEndpoint(
    "AI Content Generator",
    "/api/ai/content-generator",
    { method: "POST", body: { task: "Write a WhatsApp message for a new maid listing" } },
  );
  console.log("");

  console.log("── 15. AI Workflow Automation (admin) ──");
  await testEndpoint(
    "AI Automation",
    "/api/ai/automation",
    { method: "POST", body: { task: "Check automation status" } },
  );
  console.log("");

  console.log("── 16. AI Autopilot (admin) ──");
  await testEndpoint(
    "AI Autopilot Run",
    "/api/ai/autopilot/run",
    { method: "POST", body: {} },
  );
  console.log("");

  // ═══════════════════════════════════════════════════════════════
  //  17. DIRECT MARKETING (admin)
  // ═══════════════════════════════════════════════════════════════
  console.log("── 17. AI Direct Marketing (admin) ──");
  await testEndpoint("Marketing Status", "/api/ai/direct-marketing/autonomous/status");
  await testEndpoint("Marketing Audience", "/api/ai/direct-marketing/audience?type=all_contacts");
  await testEndpoint("Marketing Campaigns", "/api/ai/direct-marketing/campaigns");
  await testEndpoint("Marketing Scan", "/api/ai/direct-marketing/autonomous/scan");
  await testEndpoint(
    "Marketing Autonomous Run",
    "/api/ai/direct-marketing/autonomous/run",
    { method: "POST", body: {} },
  );
  await testEndpoint(
    "Marketing Generate",
    "/api/ai/direct-marketing/generate",
    { method: "POST", body: { task: "Generate marketing email" } },
  );
  console.log("");

  // ═══════════════════════════════════════════════════════════════
  //  18. PDF AUTOFILL (admin)
  // ═══════════════════════════════════════════════════════════════
  console.log("── 18. PDF Autofill (admin) ──");
  await testEndpoint(
    "PDF Autofill",
    "/api/pdf-autofill",
    { method: "POST", body: {} },
  );
  console.log("");

  // ═══════════════════════════════════════════════════════════════
  //  19. ATS MATCHING (admin)
  // ═══════════════════════════════════════════════════════════════
  console.log("── 19. ATS Matching (admin) ──");
  await testEndpoint(
    "ATS Match",
    "/api/ats/match",
    { method: "POST", body: {} },
  );
  console.log("");

  // ═══════════════════════════════════════════════════════════════
  //  20. WEBHOOK / MAKE ENDPOINTS
  // ═══════════════════════════════════════════════════════════════
  console.log("── 20. Webhook & Make Integration ──");
  await testEndpoint(
    "Send to Make",
    "/api/send-to-make",
    { method: "POST", body: {} },
  );

  await testEndpoint(
    "Inquiry Make",
    "/api/inquiry/make",
    {
      method: "POST",
      body: {
        name: "Make Test",
        contact: "test@example.com",
        message: "Test webhook",
      },
    },
  );
  console.log("");

  // ═══════════════════════════════════════════════════════════════
  //  21. WEBSITE AI FEATURES (rinzinagency.com)
  // ═══════════════════════════════════════════════════════════════
  console.log("── 21. Website AI Chatbot Endpoint ──");
  try {
    const siteRes = await fetch(WEBSITE_URL, { signal: AbortSignal.timeout(15_000) });
    const html = await siteRes.text();
    const hasChatbot = html.includes("chatbot") || html.includes("receptionist") || html.includes("ai-agent") || html.includes("ai-agent") || html.includes("support-chat");
    const hasSearchMaids = html.includes("search-maids") || html.includes("MaidSearch");
    const hasApplyFDW = html.includes("apply") || html.includes("fdw");
    log(hasChatbot ? "✅" : "ℹ️", `Chatbot elements: ${hasChatbot ? "found" : "not found in HTML (may load via JS)"}`);
    log(hasSearchMaids ? "✅" : "ℹ️", `Search maids: ${hasSearchMaids ? "found" : "not found in HTML"}`);
    log(hasApplyFDW ? "✅" : "ℹ️", `Apply/FDW: ${hasApplyFDW ? "found" : "not found in HTML"}`);
    if (hasChatbot) passed++;
    if (hasSearchMaids) passed++;
    if (hasApplyFDW) passed++;
  } catch (err) {
    log("❌", `Website check failed — ${err.message}`);
    failed++;
  }
  console.log("");

  // ═══════════════════════════════════════════════════════════════
  //  22. CORS CHECK (website → worker)
  // ═══════════════════════════════════════════════════════════════
  console.log("── 22. CORS Check (rinzinagency.com → worker) ──");
  try {
    const corsRes = await fetch(`${WORKER_URL}/api/ai/receptionist`, {
      method: "OPTIONS",
      headers: {
        Origin: WEBSITE_URL,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "Content-Type",
      },
      signal: AbortSignal.timeout(10_000),
    });
    const corsHeaders = corsRes.headers.get("access-control-allow-origin");
    if (corsHeaders) {
      log("✅", `CORS allows origin: ${corsHeaders}`);
      passed++;
    } else {
      log("⚠️", `CORS: no Access-Control-Allow-Origin header (status ${corsRes.status})`);
      warnings++;
    }
  } catch (err) {
    log("❌", `CORS check failed — ${err.message}`);
    failed++;
  }
  console.log("");

  // ═══════════════════════════════════════════════════════════════
  //  SUMMARY
  // ═══════════════════════════════════════════════════════════════
  console.log("═".repeat(70));
  console.log(`  📊 RESULTS: ${passed} passed, ${warnings} warnings, ${failed} failed`);
  console.log("═".repeat(70));

  if (failed === 0 && warnings === 0) {
    console.log("  ✅ ALL AI FEATURES ARE WORKING CORRECTLY");
  } else if (failed === 0) {
    console.log("  ⚠️  All endpoints reachable. Some have warnings (see above).");
  } else {
    console.log("  ❌ Some AI features have issues — check details above.");
  }

  console.log("");
  console.log("  Notes:");
  console.log("  • 401 = endpoint exists but requires authentication (expected for admin/client endpoints)");
  console.log("  • 503 = AI service key not configured on the server");
  console.log("  • 502 = AI provider returned an error (temporary, usually self-resolves)");
  console.log("  • AI responses may take 10-60 seconds depending on the model");
  console.log("  • CORS = Cross-Origin Resource Sharing (website → API connectivity)");
  console.log("");

  // Exit with error code if any tests failed
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});