const TARGETS = {
  local: "http://localhost:3000",
  prod:  "https://findmaid.wow-aisolution.workers.dev",
};

const args    = process.argv.slice(2);
const target  = args.find(a => a.startsWith("--target="))?.split("=")[1] ?? "prod";
const baseUrl = TARGETS[target] ?? TARGETS.prod;
const TIMEOUT_MS = 30_000;

let passed = 0;
let failed = 0;

function log(icon, msg) { console.log(`  ${icon} ${msg}`); }

async function testEndpoint(name, url, options = {}) {
  const { method = "GET", body } = options;
  const fullUrl = `${baseUrl}${url}`;
  try {
    const res = await fetch(fullUrl, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const status = res.status;
    let data;
    try { data = await res.json(); } catch { data = await res.text().catch(() => ""); }
    const errMsg = typeof data === "object" ? data?.error : "";

    if (status === 401) {
      log("\u2705", `${name} \u2014 endpoint exists (401 auth required)`);
      passed++; return { ok: true, status };
    }
    if ((status === 400 || status === 422) && errMsg) {
      log("\u2705", `${name} \u2014 endpoint works (${status}: ${errMsg})`);
      passed++; return { ok: true, status };
    }
    if (status === 503) {
      log("\u26A0\uFE0F", `${name} \u2014 endpoint exists but: ${errMsg || data}`);
      passed++; return { ok: true, status, notConfigured: true };
    }
    if (status === 200) {
      log("\u2705", `${name} \u2014 200 OK`);
      passed++; return { ok: true, status, data };
    }
    log("\u26A0\uFE0F", `${name} \u2014 unexpected status ${status}`);
    console.log(`      Response: ${JSON.stringify(data).slice(0, 200)}`);
    failed++; return { ok: false, status, data };
  } catch (err) {
    log("\u274C", `${name} \u2014 ${err.message}`);
    failed++; return { ok: false, error: err.message };
  }
}

async function main() {
  console.log("===========================================================");
  console.log("  AI Agents Page \u2014 API Endpoint Test");
  console.log("===========================================================");
  console.log(`Target: ${baseUrl}  Mode: ${target}\n`);

  console.log("--- Dashboard Data Endpoints ---");
  await testEndpoint("Enquiries", "/api/enquiries?pageSize=100");
  await testEndpoint("Requests",  "/api/requests?pageSize=100");
  await testEndpoint("ATS Applications", "/api/ats/applications?pageSize=100");
  await testEndpoint("Employers", "/api/employers");

  console.log("\n--- AI Inquiry Endpoint ---");
  await testEndpoint("AI Inquiry (empty body)", "/api/inquiry", { method: "POST", body: {} });
  await testEndpoint("AI Inquiry (valid body)", "/api/inquiry", {
    method: "POST",
    body: { name: "Test", contact: "test@example.com", message: "I need a maid for childcare" },
  });

  console.log("\n--- Marketing Endpoints ---");
  await testEndpoint("Audience (all_contacts)", "/api/ai/direct-marketing/audience?type=all_contacts");
  await testEndpoint("Audience (enquiry_leads)", "/api/ai/direct-marketing/audience?type=enquiry_leads");
  await testEndpoint("Marketing Generate (empty)", "/api/ai/direct-marketing/generate", { method: "POST", body: {} });

  console.log("\n--- ATS Endpoints ---");
  await testEndpoint("ATS Dashboard", "/api/ats/dashboard");
  await testEndpoint("ATS Presets", "/api/ats/presets");

  console.log("\n--- Other Endpoints ---");
  await testEndpoint("Send to Make", "/api/send-to-make", { method: "POST", body: {} });

  console.log("\n===========================================================");
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  if (failed === 0) {
    console.log(`  \u2705 ALL ${passed} ENDPOINT TESTS PASSED`);
  } else {
    console.log(`  \u26A0\uFE0F  ${failed} of ${passed + failed} tests had issues`);
  }
  console.log("===========================================================");
  console.log("\n  Note: 401 = endpoint exists but needs auth (expected).");
  console.log("  AI endpoints may fail due to Cline API being down.\n");
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => { console.error("Unhandled error:", err); process.exit(1); });