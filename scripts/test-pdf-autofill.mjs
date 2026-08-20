/**
 * AI PDF Autofill – Integration Test
 *
 * Tests the full extraction pipeline:
 *   1. Reads the existing FDW biodata PDF
 *   2. Extracts text using pdf-parse (same as pdf.js in browser)
 *   3. Sends to the same AI endpoint used by PdfAutofill.tsx
 *   4. Validates the JSON response structure and key fields
 *
 * Usage:
 *   node scripts/test-pdf-autofill.mjs                     # test against localhost:3000
 *   node scripts/test-pdf-autofill.mjs --target=prod       # test against production
 *   node scripts/test-pdf-autofill.mjs --direct            # call Cline API directly (bypass auth)
 */

import fs from "node:fs";
import path from "node:path";

// ─── Config ──────────────────────────────────────────────────────────────────
const TARGETS = {
  local: "http://localhost:3000",
  prod:  "https://helped-web-v2.jonathan-tan-1290.workers.dev",
};

const CLINE_BASE_URL = "https://api.cline.ai/v1";
const CLINE_MODEL    = "moonshotai/kimi-k2-250711";

const PDF_PATH = path.resolve(process.cwd(), "fdw-bio-data-form_fillable.pdf");
const TIMEOUT_MS = 90_000;

// ─── Parse CLI args ──────────────────────────────────────────────────────────
const args    = process.argv.slice(2);
const target  = args.find(a => a.startsWith("--target="))?.split("=")[1] ?? "local";
const direct  = args.includes("--direct");
const baseUrl = TARGETS[target] ?? TARGETS.local;

// ─── Helpers ─────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const pretty = (v) => JSON.stringify(v, null, 2);

function readDevVars() {
  const devVarsPath = path.resolve(process.cwd(), ".dev.vars");
  if (!fs.existsSync(devVarsPath)) return {};
  const content = fs.readFileSync(devVarsPath, "utf8");
  const vars = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key   = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    vars[key] = value;
  }
  return vars;
}

// ─── PDF text extraction ─────────────────────────────────────────────────────
async function extractPdfText(pdfPath) {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const buffer = fs.readFileSync(pdfPath);
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
  const pdf = await loadingTask.promise;
  const pageTexts = [];
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const lines = new Map();
    for (const item of textContent.items) {
      if (!("str" in item)) continue;
      const y = Math.round(item.transform[5] / 2) * 2;
      if (!lines.has(y)) lines.set(y, []);
      lines.get(y).push(item.str);
    }
    const sortedLines = Array.from(lines.entries())
      .sort(([a], [b]) => b - a)
      .map(([, parts]) => parts.join(" ").trim())
      .filter(Boolean);
    pageTexts.push(`=== PAGE ${pageNum} ===\n` + sortedLines.join("\n"));
  }
  return pageTexts.join("\n\n");
}

// ─── System prompt (from PdfAutofill.tsx) ────────────────────────────────────
const SYSTEM_PROMPT = `You are a precise data-extraction assistant for Singapore FDW (Foreign Domestic Worker) biodata forms.

CRITICAL OUTPUT RULES — follow exactly or the response is unusable:
1. Output ONLY a raw JSON object. Start with { and end with }. No other text before or after.
2. No markdown code fences, no backticks, no explanation, no preamble.
3. All string values must be on ONE line — replace real newlines inside strings with the two-character sequence \\n.
4. No trailing commas after the last item in any object or array.
5. No JavaScript // comments or /* */ comments.
6. Use null for any missing or unknown field (not "N/A", not "None", not "").
7. Boolean fields: true or false only. Never strings "true"/"false".`;

// ─── Extraction prompt builder (from PdfAutofill.tsx) ────────────────────────
function buildPrompt(pdfText) {
  return `Extract ALL information from this FDW biodata PDF text and return ONLY valid JSON.

=== FIELD RULES ===

REFERENCE CODE: The "Ref. Code:" value (e.g. "IND-MP-PIP-9554"). null if absent.

TYPE: Map to exactly one of these strings:
  "New maid" | "Transfer maid" | "APS maid" | "Ex-Singapore maid" | "Ex-Hong Kong maid" |
  "Ex-Taiwan maid" | "Ex-Malaysia maid" | "Ex-Middle East maid" |
  "Applying to work in Hong Kong" | "Applying to work in Canada" | "Applying to work in Taiwan"
  - "Transfer Helper" or "Transfer" in subtitle → "Transfer maid"
  - No prior overseas employer → "New maid"

DATE OF BIRTH: Read dd/mm/yy boxes. Convert to YYYY-MM-DD.
  Year: if last 2 digits ≥ 30 → prepend "19", else prepend "20".
  Example: 01/01/93 → "1993-01-01"

HEIGHT: integer cm (e.g. boxes "1 5 6" → 156)
WEIGHT: integer kg (e.g. boxes "6 0" → 60)

NATIONALITY: append " maid" (e.g. "Indian" → "Indian maid")

EDUCATION LEVEL — must be exactly one of:
  "Primary Level (≤6 yrs)" | "Secondary Level (7–9 yrs)" | "High School (10–12 yrs)" |
  "Vocational Course" | "College / Degree (≥13 yrs)"

MARITAL STATUS — must be exactly one of:
  "Single" | "Single Parent" | "Married" | "Divorced" | "Widowed" | "Separated"

NUMBER OF SIBLINGS: plain number → integer. Fraction like "6/7" → string "6/7". Blank → null.

ILLNESSES: each has YES and NO checkbox columns. Tick in Yes → true. Tick in No → false. Both blank → false.
Do NOT set true unless you clearly see a tick (☑) in the Yes column.

FOOD HANDLING PREFERENCES: only include items whose checkbox is ticked (☑).
  Output comma-separated string of ticked items: "No pork", "No beef", or text from "Others:".
  All unticked → null.

REST DAYS: integer (e.g. "02" → 2)

PRIORITY FOR CONFLICTS: When page 1 form boxes and Section E text conflict for the same field (DOB, height, weight, religion, education), always prefer the page 1 form boxes.

C2 SINGAPORE EXPERIENCE: Section C2 has a "Previous working experience in Singapore" Yes/No checkbox. Set sgExperienceFromC2 to true if Yes is ticked, false if No, null if section absent.

SECTION E EXTRA PREFERENCES:
  canWorkLandedHouse: true if "Can work in landed house" = Yes, false if No, null if absent.
  canWorkIndianFamily: true if "Can work for Indian family" = Yes, false if No, null if absent.
  canWorkVegetarianFamily: the value string as-is (e.g. "both family", "yes", "no"). null if absent.

SECTION E SKILLS FALLBACK: If ALL rows of the B1 skills table Willingness column are blank (no Yes/No ticked), check Section E for lines like "Can care of baby: No", "Can care of Children: yes", "Can care of elderly: yes", "Can take care of dogs: yes". Use those values to set skills[].willing for the matching area. Unmentioned areas stay null.

LANGUAGE PROFICIENCY RANGES: If proficiency is given as a range (e.g. "Fair - Good", "Poor - Fair"), use the LOWER of the two levels.

EXPECTED SALARY / PRESENT SALARY: Extract only the monetary amount (e.g. "$550 + $50"). Strip leading qualifiers like "New is" and trailing phrases like "and 2 off".

EVALUATION METHOD (B1 section):
  evalByDeclaration: true if "Based on FDW's declaration…" checkbox ☑, false if ☐, null if section absent.
  evalInterviewedBySgEA: true if "Interviewed by Singapore EA" checkbox ☑, false if ☐, null if absent.
  evalInterviewSubOptions: array of TICKED sub-options from these exact strings:
    "Interviewed via telephone/teleconference"
    "Interviewed via videoconference"
    "Interviewed in person"
    "Interviewed in person and also made observation of FDW in the areas of work listed in table"
  Empty array [] if none ticked.

SKILLS TABLE — for each row:
  willing: true="Yes", false="No", null=X mark across cell or blank with no Yes/No
  experience: true="Yes", false="No", null=blank
  rating: integer from "Rate: N" pattern (1–5), null if absent
  note: text after the rating number. "" if blank.
  subNote: cuisines for Cooking, languages for Language row, skill desc for Other skills. "" if N/A.
  yearsOfExperience: string from years column, "" if blank.

LANGUAGE SKILLS — proficiency from Language abilities assessment note:
  Exactly one of: "Zero" | "Poor" | "Little" | "Fair" | "Good"
  "communicate well" / "communicates well" → "Good"
  "basic knowledge of [language]" or "basic [language]" → "Little"
  Not mentioned → null
  Languages: "English", "Hindi", "Mandarin/Chinese-Dialect", "Tamil", "Bahasa Indonesia/Malaysia"

EMPLOYMENT HISTORY — all rows from C1 table:
  from/to: 4-digit year string or ""
  duties/remarks: full text or "". NEVER null.

INTERVIEW AVAILABILITY (Section D) — array of ONLY ticked checkboxes:
  "FDW is not available for interview"
  "FDW can be interviewed by phone"
  "FDW can be interviewed by video-conference"
  "FDW can be interviewed in person"
  Empty array [] if all unticked.

availabilityRemark: text from Section E about HOW the FDW can be interviewed (e.g. "available for interview anytime via WhatsApp video call"). null if not mentioned.

SECTION E (Other Remarks):
  intro / publicIntro: full text of the agency-written description. Replace real newlines with \\n.
  presentSalary: salary string if mentioned (e.g. "$510 + $50"). null if absent.
  otherRemarks: short remarks from field 20 only, not the long Section E text.

=== PDF TEXT ===
${pdfText}
=== END OF PDF TEXT ===

Remember: output ONLY the JSON object. Start with { end with }. Nothing else.`;
}

// ─── JSON repair & extraction (from PdfAutofill.tsx) ─────────────────────────
function fixUnescapedControlChars(s) {
  let out = ""; let inStr = false; let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (inStr) {
      if (ch === "\\") { out += ch + (s[i + 1] ?? ""); i += 2; continue; }
      if (ch === '"')  { inStr = false; out += ch; i++; continue; }
      if (ch === "\n") { out += "\\n"; i++; continue; }
      if (ch === "\r") { out += "\\r"; i++; continue; }
      if (ch === "\t") { out += "\\t"; i++; continue; }
      const code = ch.charCodeAt(0);
      if (code < 0x20) { out += `\\u${code.toString(16).padStart(4, "0")}`; i++; continue; }
    } else { if (ch === '"') inStr = true; }
    out += ch; i++;
  }
  return out;
}

function extractJsonFromText(raw) {
  let s = raw.replace(/^```(?:json)?\s*/im, "").replace(/\s*```\s*$/im, "").trim();
  const start = s.indexOf("{");
  const end   = s.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object found in response");
  }
  s = s.slice(start, end + 1);
  s = s.replace(/\/\/[^\n\r]*/g, "");
  s = s.replace(/\/\*[\s\S]*?\*\//g, "");
  s = fixUnescapedControlChars(s);
  s = s.replace(/,(\s*[}\]])/g, "$1");
  return s;
}

function parseAiJson(raw) {
  const strategies = [
    () => extractJsonFromText(raw),
    () => {
      const m = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
      if (!m?.[1]) throw new Error("No code fence");
      return extractJsonFromText(m[1]);
    },
    () => {
      const start = raw.indexOf("{");
      const end   = raw.lastIndexOf("}");
      if (start === -1 || end === -1 || end <= start) throw new Error("No braces");
      return extractJsonFromText(raw.slice(start, end + 1));
    },
  ];

  const errors = [];
  for (const strategy of strategies) {
    try {
      const repaired = strategy();
      const parsed   = JSON.parse(repaired);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
      errors.push("Not a plain object");
    } catch (e) {
      errors.push(e.message);
    }
  }
  throw new Error(`Could not parse JSON from AI response. Errors: ${errors.join(" | ")}`);
}

// ─── Call AI endpoint ────────────────────────────────────────────────────────
async function callEndpoint(pdfText) {
  const url = `${baseUrl}/api/pdf-autofill`;
  console.log(`\n📡 Calling endpoint: ${url}`);
  console.log(`   Model: ${CLINE_MODEL}`);

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: CLINE_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user",   content: buildPrompt(pdfText) },
      ],
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(`Endpoint error (${res.status}): ${data.error ?? "Unknown"}`);
  }
  return data;
}

async function callDirect(pdfText) {
  const devVars = readDevVars();
  const openaiKey     = devVars.OPENAI_API_KEY;
  const anthropicKey  = devVars.ANTHROPIC_API_KEY;
  const openaiBaseUrl = devVars.OPENAI_BASE_URL || CLINE_BASE_URL;
  const openaiModel   = devVars.OPENAI_MODEL || CLINE_MODEL;

  if (!openaiKey && !anthropicKey) {
    throw new Error("Neither OPENAI_API_KEY nor ANTHROPIC_API_KEY found in .dev.vars");
  }

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user",   content: buildPrompt(pdfText) },
  ];

  // Try OpenAI-compatible API first
  if (openaiKey) {
    const url = `${openaiBaseUrl}/chat/completions`;
    console.log(`\n📡 Trying OpenAI-compatible API: ${url}`);
    console.log(`   Model: ${openaiModel}`);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openaiKey}`,
          "Content-Type":  "application/json",
        },
        body: JSON.stringify({
          model:       openaiModel,
          messages,
          temperature: 0,
          max_tokens:  8192,
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content?.trim() ?? "";
        const reason  = data.choices?.[0]?.finish_reason ?? "unknown";
        if (content) {
          console.log("   ✅ OpenAI-compatible API succeeded");
          return { content, finish_reason: reason };
        }
      }
      const errText = await res.text().catch(() => "");
      console.log(`   ⚠️  OpenAI-compatible API failed (${res.status}): ${errText.slice(0, 200)}`);
      console.log("   Falling back to Anthropic...");
    } catch (err) {
      console.log(`   ⚠️  OpenAI-compatible API error: ${err.message}`);
      console.log("   Falling back to Anthropic...");
    }
  }

  // Fallback to Anthropic
  if (!anthropicKey) {
    throw new Error("Anthropic API key not available for fallback");
  }

  console.log(`\n📡 Calling Anthropic API: https://api.anthropic.com/v1/messages`);
  console.log(`   Model: claude-haiku-4-5-20251001`);

  const systemContent = messages.filter(m => m.role === "system").map(m => m.content).join("\n\n");
  const nonSystem = messages.filter(m => m.role !== "system");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key":         anthropicKey,
      "anthropic-version": "2023-06-01",
      "content-type":      "application/json",
    },
    body: JSON.stringify({
      model:       "claude-haiku-4-5-20251001",
      temperature: 0,
      max_tokens:  8192,
      system:      systemContent,
      messages:    nonSystem,
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Anthropic API error (${res.status}): ${errText.slice(0, 300)}`);
  }

  const data = await res.json();
  const content = data.content?.find?.(c => c.type === "text")?.text ?? "";
  const reason  = data.stop_reason ?? "unknown";
  if (!content) {
    throw new Error(`Empty Anthropic response (stop_reason: ${reason})`);
  }
  console.log("   ✅ Anthropic API succeeded");
  return { content, finish_reason: reason };
}

// ─── Validation ──────────────────────────────────────────────────────────────
const REQUIRED_FIELDS = [
  "fullName", "nationality", "dateOfBirth", "height", "weight",
  "maritalStatus", "religion", "educationLevel",
];

const EXPECTED_ARRAYS = ["skills", "employmentHistory", "interviewAvailability"];

function validateExtractedData(data) {
  const errors   = [];
  const warnings = [];
  let filledCount = 0;

  // Check top-level fields exist
  for (const field of REQUIRED_FIELDS) {
    if (data[field] == null) {
      warnings.push(`Field '${field}' is null`);
    } else {
      filledCount++;
    }
  }

  // Check arrays
  for (const arr of EXPECTED_ARRAYS) {
    if (!Array.isArray(data[arr])) {
      errors.push(`'${arr}' should be an array, got: ${typeof data[arr]}`);
    } else {
      filledCount += data[arr].length > 0 ? 1 : 0;
    }
  }

  // Check illnesses object
  if (data.illnesses && typeof data.illnesses === "object") {
    const illnessKeys = Object.keys(data.illnesses);
    if (illnessKeys.length === 0) {
      warnings.push("'illnesses' object is empty");
    } else {
      filledCount++;
    }
  } else {
    warnings.push("'illnesses' is not an object");
  }

  // Check languageSkills object
  if (data.languageSkills && typeof data.languageSkills === "object") {
    filledCount++;
  } else {
    warnings.push("'languageSkills' is not an object");
  }

  // Count all non-null top-level values
  let totalNonNull = 0;
  for (const [key, value] of Object.entries(data)) {
    if (value == null) continue;
    if (Array.isArray(value)) {
      if (value.length > 0) totalNonNull++;
    } else if (typeof value === "object") {
      const nonNullValues = Object.values(value).filter(v => v != null);
      if (nonNullValues.length > 0) totalNonNull++;
    } else {
      totalNonNull++;
    }
  }

  return { errors, warnings, filledCount: totalNonNull };
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  AI PDF Autofill – Integration Test");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`Mode:   ${direct ? "Direct Cline API" : `Endpoint (${target})`}`);
  console.log(`Target: ${direct ? CLINE_BASE_URL : baseUrl}`);
  console.log(`PDF:    ${PDF_PATH}`);

  // Step 1: Check PDF exists
  if (!fs.existsSync(PDF_PATH)) {
    console.error(`\n❌ PDF not found at: ${PDF_PATH}`);
    process.exit(1);
  }

  // Step 2: Extract text
  console.log("\n📄 Step 1: Extracting text from PDF...");
  const pdfText = await extractPdfText(PDF_PATH);
  console.log(`   Extracted ${pdfText.length} characters from PDF`);
  if (pdfText.length < 100) {
    console.error("   ❌ PDF text too short — may be a scanned image");
    process.exit(1);
  }
  console.log(`   First 200 chars: ${pdfText.slice(0, 200).replace(/\n/g, " | ")}...`);

  // Step 3: Call AI
  console.log("\n🤖 Step 2: Calling AI for extraction...");
  const startedAt = Date.now();
  let rawData;
  try {
    rawData = direct ? await callDirect(pdfText) : await callEndpoint(pdfText);
  } catch (err) {
    console.error(`\n   ❌ AI call failed: ${err.message}`);
    process.exit(1);
  }
  const latencyMs = Date.now() - startedAt;
  console.log(`   ✅ Response received in ${latencyMs}ms`);
  console.log(`   Finish reason: ${rawData.finish_reason ?? "N/A"}`);

  // Step 4: Parse JSON
  console.log("\n🔍 Step 3: Parsing JSON response...");
  let extracted;
  try {
    extracted = parseAiJson(rawData.content);
    console.log("   ✅ JSON parsed successfully");
  } catch (err) {
    console.error(`   ❌ JSON parse failed: ${err.message}`);
    console.log(`\n   Raw response (first 1000 chars):\n${rawData.content?.slice(0, 1000)}`);
    process.exit(1);
  }

  // Step 5: Validate
  console.log("\n✅ Step 4: Validating extracted data...");
  const { errors, warnings, filledCount } = validateExtractedData(extracted);

  console.log(`\n   📊 Results:`);
  console.log(`   Fields filled:    ${filledCount}`);
  console.log(`   Latency:          ${latencyMs}ms`);
  console.log(`   Errors:           ${errors.length}`);
  console.log(`   Warnings:         ${warnings.length}`);

  // Print key extracted values
  console.log(`\n   📋 Key extracted values:`);
  console.log(`   Reference Code:   ${extracted.referenceCode ?? "null"}`);
  console.log(`   Full Name:        ${extracted.fullName ?? "null"}`);
  console.log(`   Type:             ${extracted.type ?? "null"}`);
  console.log(`   Date of Birth:    ${extracted.dateOfBirth ?? "null"}`);
  console.log(`   Nationality:      ${extracted.nationality ?? "null"}`);
  console.log(`   Height:           ${extracted.height ?? "null"}`);
  console.log(`   Weight:           ${extracted.weight ?? "null"}`);
  console.log(`   Religion:         ${extracted.religion ?? "null"}`);
  console.log(`   Education:        ${extracted.educationLevel ?? "null"}`);
  console.log(`   Marital Status:   ${extracted.maritalStatus ?? "null"}`);
  console.log(`   Siblings:         ${extracted.numberOfSiblings ?? "null"}`);
  console.log(`   Skills count:     ${Array.isArray(extracted.skills) ? extracted.skills.length : "N/A"}`);
  console.log(`   Employment count: ${Array.isArray(extracted.employmentHistory) ? extracted.employmentHistory.length : "N/A"}`);

  if (Array.isArray(extracted.skills) && extracted.skills.length > 0) {
    console.log(`\n   🔧 Skills details:`);
    for (const s of extracted.skills) {
      const willing = s.willing === true ? "Yes" : s.willing === false ? "No" : "?";
      const exp     = s.experience === true ? "Yes" : s.experience === false ? "No" : "?";
      console.log(`      ${s.area}: willing=${willing}, exp=${exp}, rating=${s.rating ?? "N/A"}`);
    }
  }

  if (warnings.length > 0) {
    console.log(`\n   ⚠️  Warnings:`);
    for (const w of warnings) console.log(`      - ${w}`);
  }

  if (errors.length > 0) {
    console.log(`\n   ❌ Errors:`);
    for (const e of errors) console.log(`      - ${e}`);
  }

  // Write full extracted JSON to file for inspection
  const outputPath = path.resolve(process.cwd(), "scripts/pdf-autofill-result.json");
  fs.writeFileSync(outputPath, JSON.stringify(extracted, null, 2), "utf8");
  console.log(`\n   📁 Full extracted JSON saved to: ${outputPath}`);

  // Final verdict
  console.log("\n═══════════════════════════════════════════════════════════");
  if (errors.length === 0 && filledCount >= 5) {
    console.log(`  ✅ PASS — AI PDF Fill is working! (${filledCount} fields filled, ${latencyMs}ms)`);
  } else if (errors.length === 0) {
    console.log(`  ⚠️  PARTIAL — JSON parsed but few fields filled (${filledCount}). Check PDF content.`);
  } else {
    console.log(`  ❌ FAIL — ${errors.length} validation errors`);
  }
  console.log("═══════════════════════════════════════════════════════════\n");

  process.exit(errors.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});