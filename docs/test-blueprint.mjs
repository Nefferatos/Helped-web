/**
 * Make.com blueprint simulator — tests structure, conditions, and HTTP bodies
 * Run with: node docs/test-blueprint.mjs
 */
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const bp = JSON.parse(readFileSync(path.join(__dirname, "make-blueprint-marketing-dispatcher.json"), "utf8"));

const G = (s) => `\x1b[32m${s}\x1b[0m`;
const R = (s) => `\x1b[31m${s}\x1b[0m`;
const Y = (s) => `\x1b[33m${s}\x1b[0m`;
const B = (s) => `\x1b[36m${s}\x1b[0m`;
const DIM = (s) => `\x1b[2m${s}\x1b[0m`;

let passed = 0, failed = 0, warnings = 0;
const ok   = (l, d="") => { passed++;   console.log(`  ${G("✓")} ${l}${d ? DIM("  "+d) : ""}`); };
const fail = (l, d="") => { failed++;   console.log(`  ${R("✗")} ${l}${d ? "  "+R(d) : ""}`); };
const warn = (l, d="") => { warnings++; console.log(`  ${Y("⚠")} ${l}${d ? DIM("  "+d) : ""}`); };
const section = (t) => console.log(`\n${B("▸")} ${B(t)}`);

// ─── Worker cleanPhoneForMake mirror ─────────────────────────────────────────
const cleanPhoneForMake = (phone) => {
  if (!phone) return "";
  const digits = String(phone).replace(/\D/g, "");
  return digits.length === 8 ? "65" + digits : digits;
};

// ─── Route condition evaluator ────────────────────────────────────────────────
const evalCond = (cond, p) => {
  const resolve = (expr) => {
    const m = expr.match(/^\{\{(.+)\}\}$/);
    if (!m) return expr;
    const f = m[1].trim();
    if (f === "length(1.to)") return String((p.to ?? "").length);
    const dot = f.match(/^1\.(\w+)$/);
    if (dot) return String(p[dot[1]] ?? "");
    return expr;
  };
  const a = resolve(cond.a), b = cond.b;
  switch (cond.o) {
    case "text:equal":    return a === b;
    case "text:contain":  return a.includes(b);
    case "number:greater": return Number(a) > Number(b);
    default: return false;
  }
};

// ─── Body resolver ────────────────────────────────────────────────────────────
const resolveBody = (body, p, groqOut = "", claudeOut = "") => {
  return body
    .replace(/\{\{1\.(\w+)\}\}/g, (_, k) => {
      const v = p[k];
      if (v === undefined) return "";
      if (typeof v === "string") return v.replace(/\\/g,"\\\\").replace(/"/g,'\\"').replace(/\n/g,"\\n");
      return String(v);
    })
    .replace(/\{\{3\.choices\[1\]\.message\.content\}\}/g, groqOut.replace(/\\/g,"\\\\").replace(/"/g,'\\"').replace(/\n/g,"\\n"))
    .replace(/\{\{5\.content\[1\]\.text\}\}/g, claudeOut.replace(/\\/g,"\\\\").replace(/"/g,'\\"').replace(/\n/g,"\\n"))
    .replace(/\{\{replace\(5\.content\[1\]\.text;\s*'\\n';\s*'<br>'\)\}\}/g, claudeOut.replace(/\n/g,"<br>"))
    .replace(/\{\{left\(1\.message;\s*200\)\}\}/g, (p.message ?? "").slice(0,200))
    .replace(/\{\{length\(1\.matches\)\}\}/g, String((p.matches ?? []).length));
};

// ─── Payloads (now with pre-cleaned phones from Worker) ──────────────────────
const PAYLOADS = {
  whatsapp_sg_full:    { scenario:"whatsapp_marketing", to:"6591234567",  contactName:"Ahmad",      goal:"follow_up",    agencyName:"Helped",  agencyPhone:"6591234567", maidHighlights:"Maria Santos (Filipina)" },
  whatsapp_sg_8digit:  { scenario:"whatsapp_marketing", to:"6591234567",  contactName:"Sarah",      goal:"new_arrivals",  agencyName:"Helped",  agencyPhone:"6591234567", maidHighlights:"Ana Cruz (Indonesian)" },
  whatsapp_malaysia:   { scenario:"whatsapp_marketing", to:"601112345678",contactName:"Wei Ling",   goal:"re_engage",    agencyName:"Helped",  agencyPhone:"6591234567", maidHighlights:"experienced helpers" },
  whatsapp_empty_to:   { scenario:"whatsapp_marketing", to:"",            contactName:"No Phone",   goal:"follow_up",    agencyName:"Helped",  agencyPhone:"6591234567", maidHighlights:"" },
  email_valid:         { scenario:"email_marketing",    to:"john@acme.com",contactName:"John",      subject:"New Helpers Available", goal:"new_arrivals", agencyName:"Helped", agencyPhone:"6591234567", maidHighlights:"Maria Santos (Filipina)" },
  email_invalid:       { scenario:"email_marketing",    to:"not-email",    contactName:"Bad",       subject:"Test",      goal:"follow_up",    agencyName:"Helped",  agencyPhone:"6591234567", maidHighlights:"" },
  inquiry:             { scenario:"inquiry_pipeline",   name:"Tan Wei Ling", contact:"+6598765432", intent:"hiring", source:"website", message:"I need a helper for elderly care.", matches:[{name:"Maria"}], agencyPhone:"6591234567" },
  lead:                { scenario:"lead_pipeline",      leadName:"James Lim", contact:"+6591234567", source:"facebook", agencyPhone:"6591234567" },
  autopilot_3:         { scenario:"autopilot_notification", actionCount:3, highPriorityCount:2, agencyName:"Helped", agencyPhone:"6591234567", summaryText:"Follow up request 45 | Screen APP-007" },
  autopilot_zero:      { scenario:"autopilot_notification", actionCount:0, highPriorityCount:0, agencyName:"Helped", agencyPhone:"6591234567", summaryText:"" },
  unknown:             { scenario:"something_else", to:"test@x.com" },
};

// ─── 1. JSON & top-level structure ────────────────────────────────────────────
section("1. Blueprint JSON structure");
try { JSON.parse(readFileSync(path.join(__dirname,"make-blueprint-marketing-dispatcher.json"),"utf8")); ok("Valid JSON"); } catch(e){ fail("Invalid JSON",e.message); }
bp.metadata?.instant === true ? ok("instant = true (webhook mode)") : fail("instant must be true");
bp.metadata?.scenario?.sequential === true ? ok("sequential = true (rate-limit safety)") : warn("sequential is false");

const flow = bp.flow ?? [];
flow.length === 2 ? ok(`flow has ${flow.length} modules (webhook + router)`) : fail(`Expected 2 top-level modules, got ${flow.length}`);

// ─── 2. Module IDs ────────────────────────────────────────────────────────────
section("2. Module ID uniqueness");
const allIds = [];
const collectIds = (mods) => { for(const m of mods){ allIds.push(m.id); if(m.routes) m.routes.forEach(r => collectIds(r.flow??[])); } };
collectIds(flow);
const dupes = allIds.filter((id,i) => allIds.indexOf(id) !== i);
dupes.length === 0 ? ok(`All ${allIds.length} IDs unique: [${allIds.join(", ")}]`) : fail(`Duplicate IDs: ${dupes.join(", ")}`);

// ─── 3. Module types ──────────────────────────────────────────────────────────
section("3. Module types & handleErrors");
const [webhook, router] = flow;
webhook?.module === "gateway:CustomWebHook" ? ok("Module 1: gateway:CustomWebHook ✓") : fail(`Module 1: got ${webhook?.module}`);
router?.module  === "builtin:BasicRouter"   ? ok("Module 2: builtin:BasicRouter ✓")   : fail(`Module 2: got ${router?.module}`);

const routes = router?.routes ?? [];
routes.length === 6 ? ok(`Router has ${routes.length} routes`) : fail(`Expected 6 routes, got ${routes.length}`);
ok(`Route names: ${routes.map(r=>r.metadata?.name??"?").join("  |  ")}`);

let httpCount = 0;
const checkHE = (mods) => { for(const m of mods){ if(m.module==="http:ActionSendData"){ httpCount++; m.parameters?.handleErrors===true ? ok(`Module ${m.id} handleErrors=true`) : fail(`Module ${m.id} handleErrors=false`); } if(m.routes) m.routes.forEach(r=>checkHE(r.flow??[])); } };
checkHE(flow);
ok(`${httpCount} HTTP modules total`);

// ─── 4. Route conditions ──────────────────────────────────────────────────────
section("4. Route conditions — correct payloads match correct routes");
const EXPECTED = {
  "📣 WhatsApp (Groq)": ["whatsapp_sg_full","whatsapp_sg_8digit","whatsapp_malaysia"],
  "📧 Email (Claude)":  ["email_valid"],
  "🔔 Inquiry → Admin": ["inquiry"],
  "🆕 Lead → Admin":    ["lead"],
  "🤖 Autopilot → Admin": ["autopilot_3"],
  "⬛ Fallback":        ["whatsapp_empty_to","email_invalid","autopilot_zero","unknown"],
};

for(const [routeName, keys] of Object.entries(EXPECTED)){
  const route = routes.find(r => r.metadata?.name === routeName);
  if(!route){ fail(`Route "${routeName}" not found`); continue; }
  const conds = route.metadata?.conditions ?? [];
  for(const key of keys){
    const p = PAYLOADS[key];
    const met = conds.length === 0 ? true : conds.every(c => evalCond(c, p));
    met ? ok(`"${key}" → "${routeName}"`) : fail(`"${key}" did NOT match "${routeName}"`);
  }
}

// ─── 5. Route isolation ───────────────────────────────────────────────────────
section("5. Route isolation — no payload matches 2+ non-fallback routes");
for(const [key, p] of Object.entries(PAYLOADS)){
  const matched = routes
    .filter(r => r.metadata?.name !== "⬛ Fallback")
    .filter(r => { const c=r.metadata?.conditions??[]; return c.length>0 && c.every(x=>evalCond(x,p)); })
    .map(r => r.metadata?.name);
  matched.length > 1 ? fail(`"${key}" matches multiple routes: ${matched.join(", ")}`) : ok(`"${key}" → ${matched.length===1?`"${matched[0]}"`: "fallback"}`);
}

// ─── 6. HTTP body resolution ──────────────────────────────────────────────────
section("6. HTTP body resolution → valid JSON after substitution");

const GROQ_SAMPLE  = "Hi Ahmad,\n\nWe have new helpers available! Contact us at 6591234567.";
const CLAUDE_SAMPLE = "Dear John,\n\nWe have experienced helpers ready. Contact us at 6591234567 to learn more.";

const BODY_TESTS = [
  { routeName:"📣 WhatsApp (Groq)", payloadKey:"whatsapp_sg_full",  moduleId:3, note:"Groq API call" },
  { routeName:"📣 WhatsApp (Groq)", payloadKey:"whatsapp_sg_full",  moduleId:4, note:"Meta API with Groq output" },
  { routeName:"📧 Email (Claude)", payloadKey:"email_valid",        moduleId:5, note:"Claude API call" },
  { routeName:"📧 Email (Claude)", payloadKey:"email_valid",        moduleId:6, note:"Resend with Claude output" },
  { routeName:"🔔 Inquiry → Admin",payloadKey:"inquiry",            moduleId:7, note:"Notify admin of inquiry" },
  { routeName:"🆕 Lead → Admin",   payloadKey:"lead",               moduleId:8, note:"WhatsApp lead alert" },
  { routeName:"🆕 Lead → Admin",   payloadKey:"lead",               moduleId:9, note:"Email lead alert" },
  { routeName:"🤖 Autopilot → Admin",payloadKey:"autopilot_3",     moduleId:10, note:"Autopilot notify" },
];

for(const {routeName,payloadKey,moduleId,note} of BODY_TESTS){
  const route = routes.find(r => r.metadata?.name === routeName);
  const mod = (route?.flow??[]).find(m => m.id === moduleId);
  if(!mod){ fail(`Module ${moduleId} not found in "${routeName}"`); continue; }
  const p = PAYLOADS[payloadKey];
  const resolved = resolveBody(mod.mapper.body, p, GROQ_SAMPLE, CLAUDE_SAMPLE);
  try {
    const parsed = JSON.parse(resolved);
    const isWA = mod.mapper.url?.includes("graph.facebook.com");
    const isResend = mod.mapper.url?.includes("resend.com");
    const isGroq = mod.mapper.url?.includes("groq.com");
    const isClaude = mod.mapper.url?.includes("anthropic.com");
    if(isWA)     { parsed.messaging_product==="whatsapp"&&parsed.to&&parsed.text?.body ? ok(`M${moduleId} [${note}] → valid WhatsApp JSON  to="${parsed.to}"`) : fail(`M${moduleId} missing WA fields`); }
    if(isResend) { parsed.from&&parsed.to&&parsed.subject ? ok(`M${moduleId} [${note}] → valid Resend JSON  to="${parsed.to[0]}"`) : fail(`M${moduleId} missing Resend fields`); }
    if(isGroq)   { parsed.model&&parsed.messages ? ok(`M${moduleId} [${note}] → valid Groq JSON  model="${parsed.model}"`) : fail(`M${moduleId} missing Groq fields`); }
    if(isClaude) { parsed.model&&parsed.messages ? ok(`M${moduleId} [${note}] → valid Claude JSON  model="${parsed.model}"`) : fail(`M${moduleId} missing Claude fields`); }
  } catch(e) {
    fail(`M${moduleId} [${note}] → INVALID JSON`, e.message);
    console.log(DIM("    "+resolved.slice(0,200)));
  }
}

// ─── 7. Special character safety probe ───────────────────────────────────────
section("7. Special characters in AI output (JSON safety probe)");
const specialGroq = `Hi "Ahmad",\n\nBackslash test: \\helpers\\ available at 6591234567.`;
const route1 = routes.find(r => r.metadata?.name === "📣 WhatsApp (Groq)");
const mod4 = route1?.flow?.find(m => m.id === 4);
const resolved = resolveBody(mod4?.mapper?.body??"", PAYLOADS.whatsapp_sg_full, specialGroq, "");
try { JSON.parse(resolved); ok("Groq output with quotes & backslashes → JSON stays valid"); }
catch(e){ fail("Special chars broke WhatsApp body JSON", e.message); }

// ─── 8. Placeholders ─────────────────────────────────────────────────────────
section("8. Placeholder completeness");
const bpStr = JSON.stringify(bp);
["REPLACE_WITH_GROQ_API_KEY","REPLACE_WITH_CLAUDE_API_KEY","REPLACE_WITH_PHONE_NUMBER_ID",
 "REPLACE_WITH_WHATSAPP_ACCESS_TOKEN","REPLACE_WITH_RESEND_API_KEY",
 "REPLACE_WITH_FROM_EMAIL","REPLACE_WITH_AGENCY_ADMIN_EMAIL","REPLACE_WITH_DASHBOARD_URL"]
.forEach(p => bpStr.includes(p) ? ok(`"${p}" present`) : warn(`"${p}" not found`));

// ─── 9. Worker payload field coverage ────────────────────────────────────────
section("9. Worker payload → all blueprint fields present");
const fieldChecks = [
  { route:"📣 WhatsApp (Groq)",  key:"whatsapp_sg_full", fields:["scenario","to","contactName","goal","agencyName","agencyPhone","maidHighlights"] },
  { route:"📧 Email (Claude)",   key:"email_valid",       fields:["scenario","to","contactName","subject","goal","agencyName","agencyPhone","maidHighlights"] },
  { route:"🔔 Inquiry → Admin",  key:"inquiry",           fields:["scenario","name","contact","intent","source","message","matches","agencyPhone"] },
  { route:"🆕 Lead → Admin",     key:"lead",              fields:["scenario","leadName","contact","source","agencyPhone"] },
  { route:"🤖 Autopilot → Admin",key:"autopilot_3",       fields:["scenario","actionCount","highPriorityCount","agencyName","summaryText","agencyPhone"] },
];
for(const {route, key, fields} of fieldChecks){
  const p = PAYLOADS[key];
  for(const f of fields){
    p[f]!==undefined ? ok(`${route} — "${f}" ✓`) : warn(`${route} — "${f}" missing from payload`);
  }
}

// ─── 10. Worker cleanPhoneForMake ─────────────────────────────────────────────
section("10. Worker cleanPhoneForMake (phones arrive pre-cleaned)");
[
  ["+65 9123 4567","6591234567","international with spaces"],
  ["91234567",     "6591234567","8-digit SG — 65 prefix added"],
  ["6591234567",   "6591234567","10-digit — unchanged"],
  ["+6591234567",  "6591234567","+ prefix stripped"],
  ["601112345678", "601112345678","Malaysian 12-digit"],
  ["",             "",          "empty → empty (route filters)"],
].forEach(([input,want,label]) => {
  const got = cleanPhoneForMake(input);
  got === want ? ok(`"${input}" → "${got}"`, label) : fail(`"${input}" → "${got}" (wanted "${want}")`, label);
});

// ─── Summary ──────────────────────────────────────────────────────────────────
console.log("\n" + "─".repeat(60));
console.log(`  ${G(`${passed} passed`)}  ${R(`${failed} failed`)}  ${Y(`${warnings} warnings`)}  (${passed+failed+warnings} checks)`);
if(failed===0 && warnings===0) console.log(`\n  ${G("✓ Blueprint ready to import into Make.com")}\n`);
else if(failed===0) console.log(`\n  ${Y("⚠ Blueprint usable — review warnings")}\n`);
else console.log(`\n  ${R("✗ Fix failures before importing")}\n`);
