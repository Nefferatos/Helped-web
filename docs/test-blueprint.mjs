/**
 * Make.com blueprint simulator — tests every formula, condition, and HTTP body
 * before importing into Make.com. Run with: node docs/test-blueprint.mjs
 */
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const bp = JSON.parse(readFileSync(path.join(__dirname, "make-blueprint-marketing-dispatcher.json"), "utf8"));

// ─── Colours ─────────────────────────────────────────────────────────────────
const G = (s) => `\x1b[32m${s}\x1b[0m`;
const R = (s) => `\x1b[31m${s}\x1b[0m`;
const Y = (s) => `\x1b[33m${s}\x1b[0m`;
const B = (s) => `\x1b[36m${s}\x1b[0m`;
const DIM = (s) => `\x1b[2m${s}\x1b[0m`;

let passed = 0, failed = 0, warnings = 0;

const ok   = (label, detail = "") => { passed++; console.log(`  ${G("✓")} ${label}${detail ? DIM("  " + detail) : ""}`); };
const fail = (label, detail = "") => { failed++; console.log(`  ${R("✗")} ${label}${detail ? "  " + R(detail) : ""}`); };
const warn = (label, detail = "") => { warnings++; console.log(`  ${Y("⚠")} ${label}${detail ? DIM("  " + detail) : ""}`); };
const section = (title) => console.log(`\n${B("▸")} ${B(title)}`);

// ─── Make.com formula engine (subset) ────────────────────────────────────────

/** Strips all non-digit chars — mirrors Make replace chain */
function cleanDigits(s) {
  return String(s ?? "").replace(/[\s\+\-\(\)]/g, "").replace(/\D/g, "");
}

/** Simulates the formattedPhone SetVariables formula */
function formattedPhone(to) {
  const clean = cleanDigits(to);
  return clean.length === 8 ? "65" + clean : clean;
}

/** Simulates the notifyPhone SetVariables formula (mirrors updated blueprint) */
function notifyPhone(agencyPhone, fallback = "REPLACE_WITH_AGENCY_ADMIN_PHONE") {
  const clean = cleanDigits(agencyPhone ?? "");
  if (clean.length > 9) return clean;
  if (clean.length === 8) return "65" + clean;
  return fallback;
}

/** Simulates Make.com route condition evaluation */
function evalCondition(cond, vars1, vars2) {
  const resolve = (expr) => {
    const m = expr.match(/^\{\{(.+)\}\}$/);
    if (!m) return expr;
    const f = m[1].trim();
    // length(2.formattedPhone)
    if (f === "length(2.formattedPhone)") return String(vars2.formattedPhone?.length ?? 0);
    // 1.scenario, 1.to, 1.actionCount etc.
    const dotM = f.match(/^1\.(\w+)$/);
    if (dotM) return String(vars1[dotM[1]] ?? "");
    return expr;
  };

  const a = resolve(cond.a);
  const b = cond.b;
  switch (cond.o) {
    case "text:equal":   return a === b;
    case "text:contain": return a.includes(b);
    case "number:greater": return Number(a) > Number(b);
    default: return false;
  }
}

/** Resolves {{expr}} inside a JSON body string using sample vars */
function resolveBody(bodyStr, vars1, vars2) {
  return bodyStr
    .replace(/\{\{2\.formattedPhone\}\}/g, vars2.formattedPhone ?? "")
    .replace(/\{\{2\.notifyPhone\}\}/g, vars2.notifyPhone ?? "")
    .replace(/\{\{1\.(\w+)\}\}/g, (_, k) => {
      const v = vars1[k];
      if (v === undefined) return "";
      if (typeof v === "string") return v.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n").replace(/\r/g, "\\r");
      return String(v);
    })
    // Make.com inline functions
    .replace(/\{\{left\(1\.message;\s*200\)\}\}/g, (vars1.message ?? "").slice(0, 200))
    .replace(/\{\{length\(1\.matches\)\}\}/g, String((vars1.matches ?? []).length))
    .replace(/\{\{replace\(1\.message;\s*'\\n';\s*'<br>'\)\}\}/g,
      (vars1.message ?? "").replace(/\n/g, "<br>"));
}

// ─── Payloads the Worker actually sends ──────────────────────────────────────
const PAYLOADS = {
  whatsapp_marketing: {
    scenario: "whatsapp_marketing",
    to: "+65 9123 4567",
    message: "Hi John,\n\nWe have 2 new helpers available. Reply or WhatsApp us at 6591234567.",
    goal: "new_arrivals",
    agencyName: "Helped Agency",
    agencyPhone: "+6591234567",
  },
  whatsapp_marketing_8digit: {
    scenario: "whatsapp_marketing",
    to: "91234567",  // 8-digit local SG number
    message: "Hi Sarah,\n\nFollowing up on your enquiry.",
    goal: "follow_up",
    agencyName: "Helped Agency",
    agencyPhone: "6591234567",
  },
  whatsapp_marketing_dashes: {
    scenario: "whatsapp_marketing",
    to: "65-9123-4567",
    message: "Hi there,\n\nWe have helpers available.",
    goal: "re_engage",
    agencyName: "Helped Agency",
    agencyPhone: "+6591234567",
  },
  whatsapp_marketing_empty_phone: {
    scenario: "whatsapp_marketing",
    to: "",
    message: "Hi there.",
    goal: "follow_up",
    agencyName: "Helped Agency",
    agencyPhone: "+6591234567",
  },
  email_marketing: {
    scenario: "email_marketing",
    to: "john@example.com",
    subject: "New Helpers Available",
    message: "Hi John,\n\nWe have new helpers available. Contact us at 6591234567.",
    goal: "new_arrivals",
    agencyName: "Helped Agency",
    agencyPhone: "+6591234567",
  },
  email_marketing_invalid: {
    scenario: "email_marketing",
    to: "not-an-email",
    subject: "New Helpers",
    message: "Hi there.",
    goal: "new_arrivals",
    agencyName: "Helped Agency",
    agencyPhone: "+6591234567",
  },
  inquiry_pipeline: {
    scenario: "inquiry_pipeline",
    name: "Ahmad Bin Ali",
    contact: "+6591234567",
    intent: "hiring",
    source: "website",
    message: "I need a helper for elderly care, live-in, Filipino preferred.",
    matches: [{ name: "Maria Santos", score: 0.92 }, { name: "Ana Cruz", score: 0.87 }],
    agencyPhone: "+6591234567",
  },
  lead_pipeline: {
    scenario: "lead_pipeline",
    leadName: "Tan Wei Ling",
    contact: "+6598765432",
    source: "facebook",
    agencyPhone: "+6591234567",
  },
  autopilot_notification: {
    scenario: "autopilot_notification",
    actionCount: 3,
    highPriorityCount: 2,
    agencyName: "Helped Agency",
    agencyPhone: "+6591234567",
    summaryText: "Follow up pending request 45 | Draft reply for unread client message 12 | Screen applicant APP-007",
  },
  autopilot_zero_actions: {
    scenario: "autopilot_notification",
    actionCount: 0,
    highPriorityCount: 0,
    agencyName: "Helped Agency",
    agencyPhone: "+6591234567",
    summaryText: "",
  },
  unknown_scenario: {
    scenario: "something_random",
    to: "test@example.com",
  },
};

// ─── 1. JSON parse & top-level structure ─────────────────────────────────────
section("1. Blueprint JSON structure");

try {
  JSON.parse(readFileSync(path.join(__dirname, "make-blueprint-marketing-dispatcher.json"), "utf8"));
  ok("Valid JSON — parses without errors");
} catch (e) {
  fail("Invalid JSON", e.message);
}

const hasName = typeof bp.name === "string" && bp.name.length > 0;
hasName ? ok(`name: "${bp.name}"`) : fail("Missing top-level name");

const hasMeta = bp.metadata?.instant === true;
hasMeta ? ok("metadata.instant = true  (webhook mode)") : fail("metadata.instant must be true for webhook trigger");

const isSeq = bp.metadata?.scenario?.sequential === true;
isSeq ? ok("sequential = true  (rate-limit safety)") : warn("sequential is false — parallel execution may hit WhatsApp rate limits");

const flow = bp.flow ?? [];
flow.length === 3 ? ok(`flow has ${flow.length} top-level modules (webhook, setVars, router)`) : fail(`Expected 3 top-level modules, got ${flow.length}`);

// ─── 2. Module IDs uniqueness ─────────────────────────────────────────────────
section("2. Module ID uniqueness");

const allIds = [];
const collectIds = (modules) => {
  for (const m of modules) {
    allIds.push(m.id);
    if (m.routes) m.routes.forEach((r) => collectIds(r.flow ?? []));
  }
};
collectIds(flow);

const dupes = allIds.filter((id, i) => allIds.indexOf(id) !== i);
dupes.length === 0
  ? ok(`All ${allIds.length} module IDs unique: [${allIds.join(", ")}]`)
  : fail(`Duplicate module IDs: ${dupes.join(", ")}`);

// ─── 3. Module types ──────────────────────────────────────────────────────────
section("3. Module types & configuration");

const [webhook, setVars, router] = flow;

webhook?.module === "gateway:CustomWebHook"
  ? ok("Module 1: gateway:CustomWebHook  ✓")
  : fail(`Module 1: expected gateway:CustomWebHook, got ${webhook?.module}`);

setVars?.module === "tools:SetVariables"
  ? ok("Module 2: tools:SetVariables  ✓")
  : fail(`Module 2: expected tools:SetVariables, got ${setVars?.module}`);

router?.module === "builtin:BasicRouter"
  ? ok("Module 3: builtin:BasicRouter  ✓")
  : fail(`Module 3: expected builtin:BasicRouter, got ${router?.module}`);

const varNames = (setVars?.mapper?.variables ?? []).map((v) => v.name);
["formattedPhone", "notifyPhone"].forEach((name) =>
  varNames.includes(name)
    ? ok(`SetVariables defines "${name}"`)
    : fail(`SetVariables missing "${name}"`)
);

const routes = router?.routes ?? [];
routes.length === 6
  ? ok(`Router has ${routes.length} routes (5 scenario + 1 fallback)`)
  : fail(`Router has ${routes.length} routes — expected 6`);

const routeNames = routes.map((r) => r.metadata?.name ?? "?");
ok(`Route names: ${routeNames.join("  |  ")}`);

// All HTTP modules must have handleErrors: true
let httpModuleCount = 0;
const checkHandleErrors = (modules) => {
  for (const m of modules) {
    if (m.module === "http:ActionSendData") {
      httpModuleCount++;
      m.parameters?.handleErrors === true
        ? ok(`Module ${m.id} handleErrors=true`)
        : fail(`Module ${m.id} handleErrors=false — scenario will crash on API errors`);
    }
    if (m.routes) m.routes.forEach((r) => checkHandleErrors(r.flow ?? []));
  }
};
checkHandleErrors(flow);
ok(`${httpModuleCount} HTTP modules checked for handleErrors`);

// ─── 4. Phone normalization formulas ─────────────────────────────────────────
section("4. Phone normalization (formattedPhone formula)");

const phoneTests = [
  { input: "+65 9123 4567", want: "6591234567", label: "international with spaces" },
  { input: "91234567",       want: "6591234567", label: "8-digit local SG — needs 65 prefix" },
  { input: "9123 4567",      want: "6591234567", label: "8-digit with space" },
  { input: "6591234567",     want: "6591234567", label: "full 10-digit no +" },
  { input: "+6591234567",    want: "6591234567", label: "full 10-digit with +" },
  { input: "65-9123-4567",   want: "6591234567", label: "dashes" },
  { input: "(65)91234567",   want: "6591234567", label: "parens" },
  { input: "+601112345678",  want: "601112345678", label: "Malaysian 12-digit" },
  { input: "",               want: "",            label: "empty — route filter catches this" },
];

for (const t of phoneTests) {
  const result = formattedPhone(t.input);
  result === t.want
    ? ok(`"${t.input}" → "${result}"`, t.label)
    : fail(`"${t.input}" → "${result}" (wanted "${t.want}")`, t.label);
}

// ─── 5. notifyPhone formula ───────────────────────────────────────────────────
section("5. notifyPhone formula (agency admin destination)");

const notifyTests = [
  { input: "+6591234567", want: "6591234567",   label: "full international" },
  { input: "6591234567",  want: "6591234567",   label: "10-digit no +" },
  { input: "",            want: "REPLACE_WITH_AGENCY_ADMIN_PHONE", label: "empty → fallback" },
  { input: undefined,     want: "REPLACE_WITH_AGENCY_ADMIN_PHONE", label: "undefined → fallback" },
];

for (const t of notifyTests) {
  const result = notifyPhone(t.input);
  result === t.want
    ? ok(`"${t.input}" → "${result}"`, t.label)
    : fail(`"${t.input}" → "${result}" (wanted "${t.want}")`, t.label);
}

// Edge case: 8-digit agencyPhone without country code
const edgeResult = notifyPhone("91234567");
edgeResult === "6591234567"
  ? ok("8-digit agencyPhone \"91234567\" → \"6591234567\"  (65 prefix added)")
  : fail(`8-digit agencyPhone → "${edgeResult}" (expected "6591234567")`);

// ─── 6. Route conditions ──────────────────────────────────────────────────────
section("6. Route condition logic");

const ROUTE_EXPECTED = {
  "📣 WhatsApp Marketing":   ["whatsapp_marketing", "whatsapp_marketing_8digit", "whatsapp_marketing_dashes"],
  "📧 Email Marketing":       ["email_marketing"],
  "🔔 Inquiry Notify Admin":  ["inquiry_pipeline"],
  "🆕 New Lead Alert":        ["lead_pipeline"],
  "🤖 Autopilot Notify Admin":["autopilot_notification"],
  "⬛ Fallback":              ["whatsapp_marketing_empty_phone", "email_marketing_invalid",
                               "autopilot_zero_actions", "unknown_scenario"],
};

for (const [routeName, expectedPayloadKeys] of Object.entries(ROUTE_EXPECTED)) {
  const route = routes.find((r) => r.metadata?.name === routeName);
  if (!route) { fail(`Route "${routeName}" not found`); continue; }
  const conditions = route.metadata?.conditions ?? [];

  for (const payloadKey of expectedPayloadKeys) {
    const p = PAYLOADS[payloadKey];
    if (!p) { fail(`Unknown test payload "${payloadKey}"`); continue; }

    const vars2 = {
      formattedPhone: formattedPhone(p.to ?? ""),
      notifyPhone: notifyPhone(p.agencyPhone),
    };

    // Empty conditions = fallback (always matches)
    const conditionsMet = conditions.length === 0
      ? true
      : conditions.every((c) => evalCondition(c, p, vars2));

    const label = `"${payloadKey}" → route "${routeName}"`;
    conditionsMet ? ok(label) : fail(label, "conditions not met — payload would miss this route");
  }
}

// Verify cross-route isolation: each non-fallback payload matches ONLY its intended route
section("6b. Route isolation (no payload matches more than one non-fallback route)");
for (const [payloadKey, p] of Object.entries(PAYLOADS)) {
  const vars2 = {
    formattedPhone: formattedPhone(p.to ?? ""),
    notifyPhone: notifyPhone(p.agencyPhone),
  };
  const matched = routes
    .filter((r) => r.metadata?.name !== "⬛ Fallback")
    .filter((r) => {
      const conds = r.metadata?.conditions ?? [];
      return conds.length > 0 && conds.every((c) => evalCondition(c, p, vars2));
    })
    .map((r) => r.metadata?.name);

  if (matched.length > 1) {
    fail(`"${payloadKey}" matches multiple routes: ${matched.join(", ")}`);
  } else {
    ok(`"${payloadKey}" matches exactly ${matched.length === 1 ? `"${matched[0]}"` : "0 (goes to fallback)"}`);
  }
}

// ─── 7. HTTP body resolution ──────────────────────────────────────────────────
section("7. HTTP body resolution → must parse as valid JSON");

const bodyTests = [
  { routeName: "📣 WhatsApp Marketing",   payloadKey: "whatsapp_marketing",      moduleId: 4 },
  { routeName: "📣 WhatsApp Marketing",   payloadKey: "whatsapp_marketing_8digit", moduleId: 4 },
  { routeName: "📧 Email Marketing",       payloadKey: "email_marketing",         moduleId: 5 },
  { routeName: "🔔 Inquiry Notify Admin",  payloadKey: "inquiry_pipeline",        moduleId: 6 },
  { routeName: "🆕 New Lead Alert",        payloadKey: "lead_pipeline",           moduleId: 7 },
  { routeName: "🆕 New Lead Alert",        payloadKey: "lead_pipeline",           moduleId: 8 },
  { routeName: "🤖 Autopilot Notify Admin",payloadKey: "autopilot_notification",  moduleId: 9 },
];

for (const { routeName, payloadKey, moduleId } of bodyTests) {
  const route = routes.find((r) => r.metadata?.name === routeName);
  const mod = (route?.flow ?? []).find((m) => m.id === moduleId);
  if (!mod) { fail(`Module ${moduleId} not found in route "${routeName}"`); continue; }

  const p = PAYLOADS[payloadKey];
  const vars2 = {
    formattedPhone: formattedPhone(p.to ?? ""),
    notifyPhone: notifyPhone(p.agencyPhone),
  };

  const resolved = resolveBody(mod.mapper.body, p, vars2);

  try {
    const parsed = JSON.parse(resolved);

    // WhatsApp: verify structure
    if (mod.mapper.url?.includes("graph.facebook.com")) {
      const hasMsgProduct = parsed.messaging_product === "whatsapp";
      const hasTo = typeof parsed.to === "string" && parsed.to.length > 0;
      const hasBody = typeof parsed.text?.body === "string" && parsed.text.body.length > 0;
      hasMsgProduct && hasTo && hasBody
        ? ok(`Module ${moduleId} "${routeName}" [${payloadKey}] → valid WhatsApp JSON  to="${parsed.to}"`)
        : fail(`Module ${moduleId} missing required fields  ${JSON.stringify({ hasMsgProduct, hasTo, hasBody })}`);
    }

    // Resend: verify structure
    if (mod.mapper.url?.includes("resend.com")) {
      const hasFrom = typeof parsed.from === "string";
      const hasTo = Array.isArray(parsed.to) && parsed.to.length > 0;
      const hasSubject = typeof parsed.subject === "string";
      hasFrom && hasTo && hasSubject
        ? ok(`Module ${moduleId} "${routeName}" [${payloadKey}] → valid Resend JSON  to="${parsed.to[0]}"`)
        : fail(`Module ${moduleId} missing Resend fields  ${JSON.stringify({ hasFrom, hasTo, hasSubject })}`);
    }
  } catch (e) {
    fail(`Module ${moduleId} "${routeName}" [${payloadKey}] → INVALID JSON after resolution`, e.message);
    console.log(DIM("    Resolved: " + resolved.slice(0, 200)));
  }
}

// ─── 8. Message with special characters (JSON safety) ────────────────────────
section("8. Message with special characters (JSON safety probe)");

const specialPayload = {
  ...PAYLOADS.whatsapp_marketing,
  message: 'Hi "Maria",\n\nWe have helpers with \\excellent\\ skills available.',
};
const vars2Special = { formattedPhone: formattedPhone(specialPayload.to), notifyPhone: notifyPhone(specialPayload.agencyPhone) };
const waRoute = routes.find((r) => r.metadata?.name === "📣 WhatsApp Marketing");
const waMod = waRoute?.flow?.[0];
const resolved = resolveBody(waMod?.mapper?.body ?? "", specialPayload, vars2Special);
try {
  JSON.parse(resolved);
  ok("Message with quotes and backslashes → still valid JSON after resolution");
} catch (e) {
  fail("Message with special chars broke JSON body", e.message);
  console.log(DIM("    Body: " + resolved.slice(0, 300)));
}

// ─── 9. Placeholder check ─────────────────────────────────────────────────────
section("9. Placeholder completeness (values user must fill in)");

const bpStr = JSON.stringify(bp);
const placeholders = [
  "REPLACE_WITH_PHONE_NUMBER_ID",
  "REPLACE_WITH_WHATSAPP_ACCESS_TOKEN",
  "REPLACE_WITH_RESEND_API_KEY",
  "REPLACE_WITH_FROM_EMAIL",
  "REPLACE_WITH_AGENCY_ADMIN_PHONE",
  "REPLACE_WITH_AGENCY_ADMIN_EMAIL",
  "REPLACE_WITH_DASHBOARD_URL",
];
for (const p of placeholders) {
  bpStr.includes(p) ? ok(`Placeholder "${p}" present`) : warn(`Placeholder "${p}" NOT found — may have been removed`);
}

// ─── 10. Required Worker payload fields ──────────────────────────────────────
section("10. Worker payload → blueprint field coverage");

const fieldTests = [
  { route: "📣 WhatsApp Marketing",    requiredFields: ["scenario", "to", "message", "agencyPhone"] },
  { route: "📧 Email Marketing",        requiredFields: ["scenario", "to", "subject", "message", "agencyName", "agencyPhone"] },
  { route: "🔔 Inquiry Notify Admin",   requiredFields: ["scenario", "name", "contact", "intent", "source", "message", "matches", "agencyPhone"] },
  { route: "🆕 New Lead Alert",         requiredFields: ["scenario", "leadName", "contact", "source"] },
  { route: "🤖 Autopilot Notify Admin", requiredFields: ["scenario", "actionCount", "highPriorityCount", "agencyName", "summaryText", "agencyPhone"] },
];

for (const { route, requiredFields } of fieldTests) {
  const samplePayload = Object.values(PAYLOADS).find((p) => {
    const r = routes.find((rt) => rt.metadata?.name === route);
    if (!r) return false;
    const v2 = { formattedPhone: formattedPhone(p.to ?? ""), notifyPhone: notifyPhone(p.agencyPhone) };
    return (r.metadata?.conditions ?? []).every((c) => evalCondition(c, p, v2));
  });

  for (const field of requiredFields) {
    const present = samplePayload && samplePayload[field] !== undefined && samplePayload[field] !== null;
    present
      ? ok(`${route} — field "${field}" present in Worker payload`)
      : warn(`${route} — field "${field}" missing from Worker payload — blueprint references it`);
  }
}

// ─── Summary ──────────────────────────────────────────────────────────────────
console.log("\n" + "─".repeat(60));
const total = passed + failed + warnings;
console.log(`  ${G(`${passed} passed`)}  ${R(`${failed} failed`)}  ${Y(`${warnings} warnings`)}  (${total} checks)`);
if (failed === 0 && warnings === 0) {
  console.log(`\n  ${G("✓ Blueprint is ready to import into Make.com")}\n`);
} else if (failed === 0) {
  console.log(`\n  ${Y("⚠ Blueprint usable — review warnings before importing")}\n`);
} else {
  console.log(`\n  ${R("✗ Fix failures before importing")}\n`);
}
