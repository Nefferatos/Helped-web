import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle, AlertCircle, X, FileText, Zap } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import type { MaidProfile } from "@/lib/maids";
import { getAgencyAdminAuthHeaders } from "@/lib/agencyAdminAuth";

// ─── pdf.js setup ─────────────────────────────────────────────────────────────
import * as pdfjsLib from "pdfjs-dist";
import PdfWorker from "pdfjs-dist/build/pdf.worker?url";
pdfjsLib.GlobalWorkerOptions.workerSrc = PdfWorker;

// Models ordered by preference — remove json_object mode so we handle parsing ourselves
const GROQ_MODELS = [
  "meta-llama/llama-4-maverick-17b-128e-instruct",
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "llama-3.3-70b-versatile",
] as const;

const RETRYABLE_CODES    = new Set([429, 500, 503]);
const MAX_RETRIES        = 3;
const BASE_DELAY_MS      = 1500;
const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_PDF_PAGES      = 25;
const MAX_PDF_TEXT_CHARS = 120_000;
const GROQ_TIMEOUT_MS    = 60_000;

// ─── Usage tracking ────────────────────────────────────────────────────────────
const DAILY_LIMIT = 50;
const STORAGE_KEY = "pdfAutofill_usage_groq";

interface UsageRecord { date: string; count: number; }

function getPacificDateString(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
}
function loadUsage(): UsageRecord {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { date: getPacificDateString(), count: 0 };
    const parsed = JSON.parse(raw) as UsageRecord;
    if (parsed.date !== getPacificDateString()) return { date: getPacificDateString(), count: 0 };
    return parsed;
  } catch { return { date: getPacificDateString(), count: 0 }; }
}
function saveUsage(record: UsageRecord): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(record)); } catch { /* ignore */ }
}
function incrementUsage(): UsageRecord {
  const current = loadUsage();
  const updated  = { date: current.date, count: current.count + 1 };
  saveUsage(updated);
  return updated;
}
function msTillMidnightPacific(): number {
  const now        = new Date();
  const pacificNow = new Date(now.toLocaleString("en-US", { timeZone: "America/Los_Angeles" }));
  const midnight   = new Date(pacificNow);
  midnight.setHours(24, 0, 0, 0);
  return midnight.getTime() - pacificNow.getTime();
}
function formatCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

// ─── Evaluation method constants ──────────────────────────────────────────────
const EVAL_PARENT_DECLARATION =
  "Based on FDW's declaration, no evaluation/observation by Singapore EA or overseas training centre/EA";
const EVAL_PARENT_INTERVIEWED = "Interviewed by Singapore EA";
const EVAL_SUB_OPTIONS = [
  "Interviewed via telephone/teleconference",
  "Interviewed via videoconference",
  "Interviewed in person",
  "Interviewed in person and also made observation of FDW in the areas of work listed in table",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isOverloaded(msg: string) {
  const l = msg.toLowerCase();
  return l.includes("high demand") || l.includes("overloaded") ||
         l.includes("try again")   || l.includes("quota")      || l.includes("rate limit");
}
async function sleep(ms: number) { return new Promise<void>((r) => setTimeout(r, ms)); }

// ─── Types ────────────────────────────────────────────────────────────────────
type Status = "idle" | "reading" | "extracting" | "done" | "error" | "limit";

interface ExtractedData {
  referenceCode?:           string | null;
  type?:                    string | null;
  fullName?:                string | null;
  dateOfBirth?:             string | null;
  placeOfBirth?:            string | null;
  height?:                  number | null;
  weight?:                  number | null;
  nationality?:             string | null;
  homeAddress?:             string | null;
  airportRepatriation?:     string | null;
  homeCountryContact?:      string | null;
  religion?:                string | null;
  educationLevel?:          string | null;
  education?:               string | null;
  numberOfSiblings?:        number | string | null;
  numberOfSibling?:         number | string | null;
  siblingCount?:            number | string | null;
  maritalStatus?:           string | null;
  numberOfChildren?:        number | null;
  agesOfChildren?:          string | null;
  allergies?:               string | null;
  illnesses?:               Record<string, boolean> | null;
  physicalDisabilities?:    string | null;
  dietaryRestrictions?:     string | null;
  foodHandlingPreferences?: string | null;
  offDaysPerMonth?:         number | null;
  otherRemarks?:            string | null;
  skills?: Array<{
    area:               string;
    willing?:           boolean | null;
    experience?:        boolean | null;
    yearsOfExperience?: string | null;
    rating?:            number | null;
    note?:              string | null;
    subNote?:           string | null;
  }> | null;
  employmentHistory?: Array<{
    from?:     string | null;
    to?:       string | null;
    country?:  string | null;
    employer?: string | null;
    duties?:   string | null;
    remarks?:  string | null;
  }> | null;
  languageSkills?:            Record<string, string> | null;
  presentSalary?:             string | null;
  expectedSalary?:            string | null;
  availability?:              string | null;
  publicIntro?:               string | null;
  ableHandlePork?:            boolean | null;
  ableEatPork?:               boolean | null;
  ableCareForPets?:           boolean | null;
  ableSewing?:                boolean | null;
  ableGardening?:             boolean | null;
  willingWashCar?:            boolean | null;
  willingWorkOffDay?:         boolean | null;
  sgExperienceFromC2?:        boolean | null;
  canWorkLandedHouse?:        boolean | null;
  canWorkIndianFamily?:       boolean | null;
  canWorkVegetarianFamily?:   string  | null;
  interviewAvailability?:     string[] | null;
  availabilityRemark?:        string | null;
  intro?:                     string | null;
  passportNo?:                string | null;
  phone?:                     string | null;
  privateInfo?:               string | null;
  interviewedBy?:             string | null;
  referredBy?:                string | null;
  evalByDeclaration?:         boolean | null;
  evalInterviewedBySgEA?:     boolean | null;
  evalInterviewSubOptions?:   string[] | null;
  maidType?:                  string | null;
}

// ─── pdf.js text extraction ───────────────────────────────────────────────────
async function extractPdfText(file: File): Promise<string> {
  if (file.size > MAX_PDF_SIZE_BYTES) {
    throw new Error("PDF is too large. Please upload a PDF smaller than 10MB.");
  }
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf         = await loadingTask.promise;
  if (pdf.numPages > MAX_PDF_PAGES) {
    throw new Error(`PDF has too many pages. Please keep it to ${MAX_PDF_PAGES} pages or fewer.`);
  }
  const pageTexts: string[] = [];
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page        = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const lines: Map<number, string[]> = new Map();
    for (const item of textContent.items) {
      if (!("str" in item)) continue;
      const y = Math.round((item as { transform: number[] }).transform[5] / 2) * 2;
      if (!lines.has(y)) lines.set(y, []);
      lines.get(y)!.push((item as { str: string }).str);
    }
    const sortedLines = Array.from(lines.entries())
      .sort(([a], [b]) => b - a)
      .map(([, parts]) => parts.join(" ").trim())
      .filter(Boolean);
    pageTexts.push(`=== PAGE ${pageNum} ===\n` + sortedLines.join("\n"));
  }
  const combinedText = pageTexts.join("\n\n");
  if (combinedText.length > MAX_PDF_TEXT_CHARS) {
    throw new Error("PDF text is too long to process safely. Please upload a shorter biodata PDF.");
  }
  return combinedText;
}

// ─── JSON repair & extraction ─────────────────────────────────────────────────
function fixUnescapedControlChars(s: string): string {
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

function extractJsonFromText(raw: string): string {
  // Strip markdown fences
  let s = raw.replace(/^```(?:json)?\s*/im, "").replace(/\s*```\s*$/im, "").trim();
  // Find outermost braces
  const start = s.indexOf("{");
  const end   = s.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object found in response");
  }
  s = s.slice(start, end + 1);
  // Remove JS comments
  s = s.replace(/\/\/[^\n\r]*/g, "");
  s = s.replace(/\/\*[\s\S]*?\*\//g, "");
  // Fix control chars inside strings
  s = fixUnescapedControlChars(s);
  // Remove trailing commas
  s = s.replace(/,(\s*[}\]])/g, "$1");
  return s;
}

function parseGroqJson(raw: string): ExtractedData {
  const strategies: Array<() => string> = [
    () => extractJsonFromText(raw),
    () => {
      const m = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
      if (!m?.[1]) throw new Error("No code fence");
      return extractJsonFromText(m[1]);
    },
    () => {
      // Try to find JSON even if surrounded by prose
      const start = raw.indexOf("{");
      const end   = raw.lastIndexOf("}");
      if (start === -1 || end === -1 || end <= start) throw new Error("No braces");
      return extractJsonFromText(raw.slice(start, end + 1));
    },
  ];

  const errors: string[] = [];
  for (const strategy of strategies) {
    try {
      const repaired = strategy();
      const parsed   = JSON.parse(repaired) as ExtractedData;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return normalizeExtractedData(parsed);
      }
      errors.push("Not a plain object");
    } catch (e) {
      errors.push((e as Error).message);
    }
  }
  console.error("[PdfAutofill] All parse strategies failed:", errors, "\nRaw (first 2000):", raw.slice(0, 2000));
  throw new Error(`Could not parse JSON from AI response. Errors: ${errors.join(" | ")}`);
}

// ─── Sibling value parser ─────────────────────────────────────────────────────
function parseSiblingValue(value: unknown): number | string | null {
  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? Math.floor(value) : null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (trimmed.match(/^\d+\s*\/\s*\d+$/)) return trimmed; // preserve "6/7"
    const parsed = parseFloat(trimmed);
    if (Number.isFinite(parsed)) return Math.floor(parsed);
  }
  return null;
}

function normalizeExtractedData(input: ExtractedData): ExtractedData {
  const raw = input as ExtractedData & Record<string, unknown>;

  const toNullableString = (...values: unknown[]) => {
    for (const v of values) if (typeof v === "string" && v.trim()) return v.trim();
    return null;
  };
  const toNullableNumber = (...values: unknown[]) => {
    for (const v of values) {
      if (typeof v === "number" && Number.isFinite(v)) return v;
      if (typeof v === "string" && v.trim()) { const p = Number(v.trim()); if (Number.isFinite(p)) return p; }
    }
    return null;
  };

  const resolvedSiblings =
    parseSiblingValue(input.numberOfSiblings) ??
    parseSiblingValue(input.numberOfSibling)  ??
    parseSiblingValue(input.siblingCount)      ??
    parseSiblingValue(raw.number_of_siblings)  ??
    parseSiblingValue(raw.siblings)            ??
    null;

  // Normalise legacy single-string evalInterviewSubOption → array
  let subOptions = input.evalInterviewSubOptions;
  if (!Array.isArray(subOptions) || subOptions.length === 0) {
    const legacy = (raw.evalInterviewSubOption as string | null | undefined);
    if (legacy && typeof legacy === "string" && legacy.trim()) subOptions = [legacy.trim()];
    else subOptions = null;
  }

  return {
    ...input,
    referenceCode:           toNullableString(input.referenceCode, raw.refCode, raw.reference_code, raw.reference, raw.code),
    type:                    toNullableString(input.type, input.maidType, raw.maid_type, raw.typeOfMaid),
    height:                  toNullableNumber(input.height, raw.heightCm, raw.height_cm),
    educationLevel:          toNullableString(input.educationLevel, input.education, raw.education_level, raw.educationLevelName),
    numberOfSiblings:        resolvedSiblings,
    evalInterviewSubOptions: subOptions,
  };
}

// ─── System prompt ────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a precise data-extraction assistant for Singapore FDW (Foreign Domestic Worker) biodata forms.

CRITICAL OUTPUT RULES — follow exactly or the response is unusable:
1. Output ONLY a raw JSON object. Start with { and end with }. No other text before or after.
2. No markdown code fences, no backticks, no explanation, no preamble.
3. All string values must be on ONE line — replace real newlines inside strings with the two-character sequence \\n.
4. No trailing commas after the last item in any object or array.
5. No JavaScript // comments or /* */ comments.
6. Use null for any missing or unknown field (not "N/A", not "None", not "").
7. Boolean fields: true or false only. Never strings "true"/"false".`;

// ─── Extraction prompt ────────────────────────────────────────────────────────
function buildPrompt(pdfText: string): string {
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

=== RETURN THIS EXACT JSON STRUCTURE ===

{
  "referenceCode": null,
  "type": null,
  "fullName": null,
  "dateOfBirth": null,
  "placeOfBirth": null,
  "height": null,
  "weight": null,
  "nationality": null,
  "homeAddress": null,
  "airportRepatriation": null,
  "homeCountryContact": null,
  "religion": null,
  "educationLevel": null,
  "numberOfSiblings": null,
  "maritalStatus": null,
  "numberOfChildren": null,
  "agesOfChildren": null,
  "allergies": null,
  "illnesses": {
    "(I) Mental illness": false,
    "(II) Epilepsy": false,
    "(III) Asthma": false,
    "(IV) Diabetes": false,
    "(V) Hypertension": false,
    "(VI) Tuberculosis": false,
    "(VII) Heart disease": false,
    "(VIII) Malaria": false,
    "(IX) Operations": false
  },
  "physicalDisabilities": null,
  "dietaryRestrictions": null,
  "foodHandlingPreferences": null,
  "offDaysPerMonth": null,
  "otherRemarks": null,
  "skills": [
    { "area": "Care of infants/children",    "willing": null, "experience": null, "yearsOfExperience": "", "rating": null, "note": "", "subNote": "" },
    { "area": "Care of elderly",             "willing": null, "experience": null, "yearsOfExperience": "", "rating": null, "note": "", "subNote": "" },
    { "area": "Care of disabled",            "willing": null, "experience": null, "yearsOfExperience": "", "rating": null, "note": "", "subNote": "" },
    { "area": "General housework",           "willing": null, "experience": null, "yearsOfExperience": "", "rating": null, "note": "", "subNote": "" },
    { "area": "Cooking",                     "willing": null, "experience": null, "yearsOfExperience": "", "rating": null, "note": "", "subNote": "" },
    { "area": "Language abilities (spoken)", "willing": null, "experience": null, "yearsOfExperience": "", "rating": null, "note": "", "subNote": "" },
    { "area": "Other skills, if any",        "willing": null, "experience": null, "yearsOfExperience": "", "rating": null, "note": "", "subNote": "" }
  ],
  "employmentHistory": [
    { "from": "", "to": "", "country": "", "employer": "", "duties": "", "remarks": "" }
  ],
  "languageSkills": {
    "English": null,
    "Hindi": null,
    "Mandarin/Chinese-Dialect": null,
    "Tamil": null,
    "Bahasa Indonesia/Malaysia": null
  },
  "presentSalary": null,
  "expectedSalary": null,
  "availability": null,
  "ableHandlePork": null,
  "ableEatPork": null,
  "ableCareForPets": null,
  "ableSewing": null,
  "ableGardening": null,
  "willingWashCar": null,
  "willingWorkOffDay": null,
  "sgExperienceFromC2": null,
  "canWorkLandedHouse": null,
  "canWorkIndianFamily": null,
  "canWorkVegetarianFamily": null,
  "interviewAvailability": [],
  "availabilityRemark": null,
  "intro": null,
  "publicIntro": null,
  "passportNo": null,
  "phone": null,
  "privateInfo": null,
  "interviewedBy": null,
  "referredBy": null,
  "evalByDeclaration": null,
  "evalInterviewedBySgEA": null,
  "evalInterviewSubOptions": []
}

=== PDF TEXT ===
${pdfText}
=== END OF PDF TEXT ===

Remember: output ONLY the JSON object. Start with { end with }. Nothing else.`;
}

// ─── Groq API call (proxied through /api/pdf-autofill) ───────────────────────
async function callGroq(pdfText: string, model: string): Promise<ExtractedData> {
  const res = await fetch("/api/pdf-autofill", {
    method:  "POST",
    headers: { "Content-Type": "application/json", ...getAgencyAdminAuthHeaders() },
    // NOTE: No response_format here — some Groq models fail with json_object mode
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user",   content: buildPrompt(pdfText) },
      ],
    }),
    signal: AbortSignal.timeout(GROQ_TIMEOUT_MS),
  }).catch((error: unknown) => {
    if (error instanceof DOMException && (error.name === "AbortError" || error.name === "TimeoutError")) {
      throw new Error("PDF autofill timed out. Please try a smaller file.");
    }
    throw error;
  });

  const data = (await res.json()) as {
    content?:       string;
    finish_reason?: string;
    error?:         string;
  };

  if (!res.ok || data.error) {
    const e      = new Error(data.error ?? `Server error ${res.status}`) as Error & { status: number };
    e.status     = res.status;
    throw e;
  }

  const raw    = data.content      ?? "";
  const reason = data.finish_reason ?? "unknown";

  if (!raw.trim()) {
    throw new Error(`AI returned an empty response (finish_reason: ${reason})`);
  }

  if (reason === "length") {
    console.warn("[PdfAutofill] Response truncated (finish_reason=length) — attempting partial parse");
  }

  return parseGroqJson(raw);
}

// ─── Main extraction pipeline ─────────────────────────────────────────────────
async function callGroqWithText(
  pdfText: string,
  onRetry?: (attempt: number, model: string, delayMs: number) => void,
): Promise<ExtractedData> {
  for (let modelIdx = 0; modelIdx < GROQ_MODELS.length; modelIdx++) {
    const model = GROQ_MODELS[modelIdx];
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await callGroq(pdfText, model);
      } catch (err) {
        const e             = err as Error & { status?: number };
        const retryable     = (e.status !== undefined && RETRYABLE_CODES.has(e.status)) || isOverloaded(e.message);
        const isLastAttempt = attempt  === MAX_RETRIES;
        const isLastModel   = modelIdx === GROQ_MODELS.length - 1;

        if (!retryable) {
          if (isLastModel) throw new Error(e.message);
          console.warn(`[PdfAutofill] Model ${model} non-retryable error: ${e.message}. Trying next model…`);
          break;
        }
        if (isLastAttempt && isLastModel) throw new Error(e.message);
        if (isLastAttempt) {
          console.warn(`[PdfAutofill] Model ${model} exhausted retries, trying fallback model…`);
          break;
        }

        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        onRetry?.(attempt, model, delay);
        await sleep(delay);
      }
    }
  }
  throw new Error("All AI models unavailable. Please try again later.");
}

// ─── Map extracted data → MaidProfile ────────────────────────────────────────
function applyToProfile(extracted: ExtractedData, prev: MaidProfile): MaidProfile {
  const e = extracted;

  const resolveNationality = (raw?: string | null): string => {
    if (!raw) return prev.nationality ?? "";
    const lower = raw.toLowerCase();
    const map: Record<string, string> = {
      "indian":      "Indian maid",
      "filipino":    "Filipino maid",
      "indonesian":  "Indonesian maid",
      "myanmar":     "Myanmar maid",
      "burmese":     "Myanmar maid",
      "sri lankan":  "Sri Lankan maid",
      "bangladeshi": "Bangladeshi maid",
      "nepali":      "Nepali maid",
      "cambodian":   "Cambodian maid",
    };
    for (const [k, v] of Object.entries(map)) if (lower.includes(k)) return v;
    if (lower.endsWith(" maid")) return raw.trim();
    return raw.trim();
  };

  const resolveType = (raw?: string | null): string => {
    if (!raw) return prev.type ?? "";
    const n = raw.toLowerCase().trim();
    const typeMap: Array<[string[], string]> = [
      [["new maid", "new helper"],                       "New maid"],
      [["transfer maid", "transfer helper", "transfer"], "Transfer maid"],
      [["aps maid", "aps"],                              "APS maid"],
      [["ex-singapore maid", "ex singapore"],            "Ex-Singapore maid"],
      [["ex-hong kong maid", "hong kong"],               "Ex-Hong Kong maid"],
      [["ex-taiwan maid", "ex taiwan"],                  "Ex-Taiwan maid"],
      [["ex-malaysia maid", "ex malaysia"],              "Ex-Malaysia maid"],
      [["ex-middle east maid", "middle east"],           "Ex-Middle East maid"],
      [["applying to work in hong kong"],                "Applying to work in Hong Kong"],
      [["applying to work in canada"],                   "Applying to work in Canada"],
      [["applying to work in taiwan"],                   "Applying to work in Taiwan"],
    ];
    for (const [needles, value] of typeMap) {
      if (needles.some((needle) => n.includes(needle))) return value;
    }
    return raw.trim();
  };

  const resolveEducationLevel = (raw?: string | null): string => {
    if (!raw) return prev.educationLevel ?? "";
    const n = raw.toLowerCase().replace(/[–—]/g, "-").replace(/≤/g, "<=").replace(/≥/g, ">=").trim();
    if (n.includes("primary"))                          return "Primary Level (≤6 yrs)";
    if (n.includes("secondary"))                        return "Secondary Level (7–9 yrs)";
    if (n.includes("high school"))                      return "High School (10–12 yrs)";
    if (n.includes("vocational"))                       return "Vocational Course";
    if (n.includes("college") || n.includes("degree")) return "College / Degree (≥13 yrs)";
    return raw.trim();
  };

  const areaMap: Record<string, string> = {
    "care of infants":             "Care of infants/children",
    "care of infants/children":    "Care of infants/children",
    "infants":                     "Care of infants/children",
    "care of elderly":             "Care of elderly",
    "elderly":                     "Care of elderly",
    "care of disabled":            "Care of disabled",
    "disabled":                    "Care of disabled",
    "general housework":           "General housework",
    "housework":                   "General housework",
    "cooking":                     "Cooking",
    "language abilities":          "Language abilities (spoken)",
    "language abilities (spoken)": "Language abilities (spoken)",
    "other skills":                "Other skills, if any",
    "other skills, if any":        "Other skills, if any",
  };
  const resolveArea = (raw: string) => areaMap[raw.toLowerCase().trim()] ?? raw;

  const prevWorkAreas     = (prev.workAreas         as Record<string, unknown>) ?? {};
  const prevSP            = (prev.skillsPreferences as Record<string, unknown>) ?? {};
  const prevWorkAreaNotes = (prevSP.workAreaNotes   as Record<string, string>)  ?? {};

  const workAreas:     Record<string, unknown> = { ...prevWorkAreas };
  const workAreaNotes: Record<string, string>  = { ...prevWorkAreaNotes };

  if (Array.isArray(e.skills)) {
    for (const s of e.skills) {
      if (!s.area) continue;
      const area              = resolveArea(s.area);
      const willing           = s.willing    === true ? true : s.willing    === false ? false : undefined;
      const experience        = s.experience === true ? true : s.experience === false ? false : undefined;
      const rating            = typeof s.rating === "number" ? s.rating : null;
      const note              = typeof s.note === "string" ? s.note : (s.note ?? "");
      const yearsOfExperience = s.yearsOfExperience == null ? "" :
        typeof s.yearsOfExperience === "number" ? String(s.yearsOfExperience) : String(s.yearsOfExperience);

      workAreas[area] = {
        willing,
        experience,
        yearsOfExperience,
        rating,
        note,
        evaluation: rating !== null ? `${rating}/5${note ? ` - ${note}` : ""}` : note || "N.A.",
      };

      if (typeof s.subNote === "string" && s.subNote.trim()) {
        const subKey = area === "Other skills, if any" ? "Other Skill" : area;
        workAreaNotes[subKey] = s.subNote.trim();
      }
    }
  }

  const empHistory: Record<string, unknown>[] =
    Array.isArray(e.employmentHistory) && e.employmentHistory.length > 0
      ? e.employmentHistory.map((h) => ({
          from:     h.from     ?? "",
          to:       h.to       ?? "",
          country:  h.country  ?? "",
          employer: h.employer ?? "",
          duties:   h.duties   ?? "",
          remarks:  h.remarks  ?? "",
        }))
      : ((prev.employmentHistory ?? [{}]) as Record<string, unknown>[]);

  const prevLangs  = (prev.languageSkills as Record<string, string>) ?? {};
  const langSkills: Record<string, string> = { ...prevLangs };
  if (e.languageSkills && typeof e.languageSkills === "object") {
    for (const [k, v] of Object.entries(e.languageSkills)) if (v) langSkills[k] = v;
  }

  const prevOI    = (prevSP.otherInformation as Record<string, boolean>) ?? {};
  const otherInfo: Record<string, boolean> = { ...prevOI };
  if (e.ableHandlePork    != null) otherInfo["Able to handle pork?"]                           = e.ableHandlePork;
  if (e.ableEatPork       != null) otherInfo["Able to eat pork?"]                              = e.ableEatPork;
  if (e.ableCareForPets   != null) otherInfo["Able to care for dog/cat?"]                      = e.ableCareForPets;
  if (e.ableSewing        != null) otherInfo["Able to do simple sewing?"]                      = e.ableSewing;
  if (e.ableGardening     != null) otherInfo["Able to do gardening work?"]                     = e.ableGardening;
  if (e.willingWashCar    != null) otherInfo["Willing to wash car?"]                           = e.willingWashCar;
  if (e.willingWorkOffDay  != null) otherInfo["Willing to work on off-days with compensation?"] = e.willingWorkOffDay;
  if (e.canWorkLandedHouse  != null) otherInfo["Can work in landed house?"]                     = e.canWorkLandedHouse;
  if (e.canWorkIndianFamily != null) otherInfo["Can work for Indian family?"]                   = e.canWorkIndianFamily;

  const hasSgExp: boolean | undefined =
    empHistory.some((h) => String(h["country"] ?? "").toLowerCase().includes("singapore"))
      ? true
      : e.sgExperienceFromC2 != null
        ? e.sgExperienceFromC2
        : (e.type?.toLowerCase().includes("ex-singapore") ? true : undefined);

  const prevIntro     = (prev.introduction as Record<string, unknown>) ?? {};
  const prevIllnesses = (prevIntro.pastIllnesses as Record<string, boolean>) ?? {};
  const mergedIllnesses: Record<string, boolean> = { ...prevIllnesses };
  if (e.illnesses && typeof e.illnesses === "object") {
    for (const [k, v] of Object.entries(e.illnesses)) if (v != null) mergedIllnesses[k] = v;
  }

  // Handle evalInterviewSubOptions
  const prevEvalMethods = Array.isArray(prevSP.evaluationMethods)
    ? (prevSP.evaluationMethods as string[]) : [];
  const evalSet = new Set<string>(prevEvalMethods);

  if (e.evalByDeclaration === true)      evalSet.add(EVAL_PARENT_DECLARATION);
  else if (e.evalByDeclaration === false) evalSet.delete(EVAL_PARENT_DECLARATION);

  if (e.evalInterviewedBySgEA === true) {
    evalSet.add(EVAL_PARENT_INTERVIEWED);
    const subOpts = Array.isArray(e.evalInterviewSubOptions) ? e.evalInterviewSubOptions : [];
    for (const sub of subOpts) {
      if (typeof sub === "string" && EVAL_SUB_OPTIONS.includes(sub)) evalSet.add(sub);
    }
  } else if (e.evalInterviewedBySgEA === false) {
    evalSet.delete(EVAL_PARENT_INTERVIEWED);
    for (const sub of EVAL_SUB_OPTIONS) evalSet.delete(sub);
  }

  const resolvedSiblings = e.numberOfSiblings != null ? e.numberOfSiblings : null;

  const vegRemark = e.canWorkVegetarianFamily != null
    ? `Can work for vegetarian family: ${e.canWorkVegetarianFamily}`
    : null;
  const mergedOtherRemarks = [e.otherRemarks, vegRemark].filter(Boolean).join("\n") || null;

  return {
    ...prev,
    referenceCode:       e.referenceCode       != null ? e.referenceCode       : prev.referenceCode,
    type:                resolveType(e.type),
    fullName:            e.fullName             != null ? e.fullName             : prev.fullName,
    dateOfBirth:         e.dateOfBirth          != null ? e.dateOfBirth          : prev.dateOfBirth,
    placeOfBirth:        e.placeOfBirth         != null ? e.placeOfBirth         : prev.placeOfBirth,
    height:              e.height               != null ? e.height               : prev.height,
    weight:              e.weight               != null ? e.weight               : prev.weight,
    nationality:         resolveNationality(e.nationality),
    homeAddress:         e.homeAddress          != null ? e.homeAddress          : prev.homeAddress,
    airportRepatriation: e.airportRepatriation  != null ? e.airportRepatriation  : prev.airportRepatriation,
    religion:            e.religion             != null ? e.religion             : prev.religion,
    educationLevel:      resolveEducationLevel(e.educationLevel),
    numberOfSiblings:    resolvedSiblings != null ? (resolvedSiblings as unknown as number) : prev.numberOfSiblings,
    maritalStatus:       e.maritalStatus         != null ? e.maritalStatus         : prev.maritalStatus,
    numberOfChildren:    e.numberOfChildren      != null ? e.numberOfChildren      : prev.numberOfChildren,
    languageSkills:      langSkills,
    workAreas,
    employmentHistory:   empHistory,
    agencyContact: {
      ...((prev.agencyContact as Record<string, unknown>) ?? {}),
      ...(e.homeCountryContact != null ? { homeCountryContactNumber: e.homeCountryContact } : {}),
      ...(e.passportNo         != null ? { passportNo: e.passportNo }                       : {}),
      ...(e.phone              != null ? { phone: e.phone }                                 : {}),
    },
    skillsPreferences: {
      ...prevSP,
      ...(e.offDaysPerMonth != null ? { offDaysPerMonth: String(e.offDaysPerMonth) } : {}),
      ...(hasSgExp !== undefined ? { sgExperience: hasSgExp } : {}),
      otherInformation:  otherInfo,
      workAreaNotes,
      evaluationMethods: Array.from(evalSet),
      ...(Array.isArray(e.interviewAvailability) && e.interviewAvailability.length > 0
        ? { availabilityInterviewOptions: e.interviewAvailability } : {}),
      ...(e.availabilityRemark != null ? { availabilityRemark: e.availabilityRemark } : {}),
      ...(e.interviewedBy      != null ? { interviewedBy: e.interviewedBy }           : {}),
      ...(e.referredBy         != null ? { referredBy: e.referredBy }                 : {}),
      ...(e.privateInfo        != null ? { privateInfo: e.privateInfo }               : {}),
    },
    introduction: {
      ...prevIntro,
      ...(e.allergies               != null ? { allergies: e.allergies }                             : {}),
      ...(e.physicalDisabilities    != null ? { physicalDisabilities: e.physicalDisabilities }       : {}),
      ...(e.dietaryRestrictions     != null ? { dietaryRestrictions: e.dietaryRestrictions }         : {}),
      ...(e.foodHandlingPreferences != null ? { foodHandlingPreferences: e.foodHandlingPreferences } : {}),
      pastIllnesses: mergedIllnesses,
      ...(e.agesOfChildren  != null ? { agesOfChildren: e.agesOfChildren }         : {}),
      ...(e.presentSalary   != null ? { presentSalary: String(e.presentSalary) }   : {}),
      ...(e.expectedSalary  != null ? { expectedSalary: String(e.expectedSalary) } : {}),
      ...(e.availability    != null ? { availability: e.availability }             : {}),
      ...(mergedOtherRemarks != null ? { otherRemarks: mergedOtherRemarks }         : {}),
      ...(e.intro           != null ? { intro: e.intro }                           : {}),
      ...(e.publicIntro     != null ? { publicIntro: e.publicIntro }               : {}),
    },
  };
}

// ─── Count filled fields ──────────────────────────────────────────────────────
function countFields(e: ExtractedData): number {
  let n = 0;
  for (const v of Object.values(e)) {
    if (v == null) continue;
    if (typeof v === "object" && !Array.isArray(v)) {
      n += Object.values(v as Record<string, unknown>).filter((x) => x != null).length;
    } else if (Array.isArray(v)) {
      for (const item of v) {
        if (item == null) continue;
        if (typeof item === "object") {
          if (Object.values(item as Record<string, unknown>).some((x) => x != null && x !== "")) n++;
        } else if (typeof item === "string") {
          if (item.trim()) n++;
        } else {
          n++;
        }
      }
    } else {
      n++;
    }
  }
  return n;
}

// ─── Stage config ─────────────────────────────────────────────────────────────
const STAGE_LABELS: Record<Status, { label: string; sublabel: string }> = {
  idle:       { label: "AI PDF Upload",  sublabel: "Auto-fill from biodata PDF" },
  reading:    { label: "Reading PDF…",   sublabel: "Extracting text from PDF"   },
  extracting: { label: "Extracting…",    sublabel: "AI analysing fields"        },
  done:       { label: "Done!",          sublabel: "Form auto-filled"           },
  error:      { label: "Failed",         sublabel: "Click to retry"             },
  limit:      { label: "Limit reached",  sublabel: "Resets at midnight PT"      },
};

// ─── AI Brain SVG icon ────────────────────────────────────────────────────────
const AiBrainIcon = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <path d="M9.5 2a2.5 2.5 0 0 1 2.45 2H12a2.5 2.5 0 0 1 2.45-2 2.5 2.5 0 0 1 2.5 2.5c0 .28-.05.55-.13.8A4 4 0 0 1 20 9a4 4 0 0 1-1.22 2.88A3.5 3.5 0 0 1 15.5 17H8.5a3.5 3.5 0 0 1-3.28-4.12A4 4 0 0 1 4 9a4 4 0 0 1 3.18-3.7 2.5 2.5 0 0 1-.18-.8A2.5 2.5 0 0 1 9.5 2z" />
    <line x1="12" y1="4" x2="12" y2="17" />
    <line x1="8"  y1="9"  x2="16" y2="9"  />
    <line x1="8"  y1="13" x2="16" y2="13" />
    <path d="M10 17v2a2 2 0 0 0 4 0v-2" />
  </svg>
);

// ─── Arc progress indicator ───────────────────────────────────────────────────
const ArcProgress = ({ pct, size = 44 }: { pct: number; size?: number }) => {
  const cx = size / 2; const cy = size / 2; const r = (size - 6) / 2; const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className="absolute inset-0 -rotate-90" style={{ pointerEvents: "none" }} aria-hidden>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="2.5" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.95)" strokeWidth="2.5" strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={circ - (pct / 100) * circ}
        style={{ transition: "stroke-dashoffset 0.5s cubic-bezier(0.4,0,0.2,1)" }} />
    </svg>
  );
};

// ─── Usage dots ───────────────────────────────────────────────────────────────
const UsageDots = ({ used, total }: { used: number; total: number }) => {
  const maxVisible = 10; const visible = Math.min(total, maxVisible);
  return (
    <div className="flex items-center gap-0.5 flex-wrap" style={{ maxWidth: 120 }}>
      {Array.from({ length: visible }, (_, i) => (
        <div key={i} style={{
          width: 6, height: 6, borderRadius: "50%",
          background: i < used ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.2)",
          transition: "background 0.3s ease",
        }} />
      ))}
      {total > maxVisible && (
        <span style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", marginLeft: 2 }}>+{total - maxVisible}</span>
      )}
    </div>
  );
};

// ─── Popup ────────────────────────────────────────────────────────────────────
type PopupProps = {
  status: Status; fileName: string | null; fieldCount: number; errMsg: string;
  pct: number; usedToday: number; countdown: string; onClose: () => void; onRetry: () => void;
};
const STATUS_ORDER: Status[] = ["idle", "reading", "extracting", "done", "error", "limit"];

const UploadPopup = ({ status, fileName, fieldCount, errMsg, pct, usedToday, countdown, onClose, onRetry }: PopupProps) => {
  const cfg      = STAGE_LABELS[status];
  const isActive = status === "reading" || status === "extracting";
  const isDone   = status === "done";
  const isError  = status === "error";
  const isLimit  = status === "limit";
  const curIdx   = STATUS_ORDER.indexOf(status);

  useEffect(() => {
    if (!isDone) return;
    const t = setTimeout(onClose, 3200);
    return () => clearTimeout(t);
  }, [isDone, onClose]);

  const borderColor = isDone ? "#10b981" : isError || isLimit ? "#f43f5e" : "#334155";
  const glowColor   = isDone ? "rgba(16,185,129,0.14)" : isError || isLimit ? "rgba(244,63,94,0.14)" : "rgba(0,0,0,0)";

  return (
    <>
      <div className="fixed inset-0 z-40"
        style={{ background: "rgba(15,23,42,0.28)", backdropFilter: "blur(2px)" }}
        onClick={isDone || isError || isLimit ? onClose : undefined} />
      <div role="dialog" aria-label="PDF upload progress"
        className="fixed bottom-5 right-5 z-50 w-[320px] overflow-hidden rounded-2xl"
        style={{
          background:  "linear-gradient(148deg,#1e293b 0%,#0f172a 100%)",
          border:      `1px solid ${borderColor}`,
          boxShadow:   `0 0 0 1px ${borderColor},0 20px 60px ${glowColor},0 6px 20px rgba(0,0,0,0.55)`,
          animation:   "fdwPopIn .28s cubic-bezier(.34,1.56,.64,1)",
        }}>
        <style>{`
          @keyframes fdwPopIn   { from { opacity:0; transform:translateY(12px) scale(.94) } to { opacity:1; transform:translateY(0) scale(1) } }
          @keyframes fdwShimmer { 0%   { transform:translateX(-100%) } 100% { transform:translateX(220%) } }
          @keyframes fdwPulse   { 0%,100% { opacity:1 } 50% { opacity:.5 } }
          .fdw-shimmer { position:relative; overflow:hidden }
          .fdw-shimmer::after { content:''; position:absolute; inset:0; background:linear-gradient(90deg,transparent,rgba(255,255,255,0.22),transparent); animation:fdwShimmer 1.5s ease infinite }
          .fdw-pulse { animation:fdwPulse 1.8s ease infinite }
        `}</style>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.07]">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: isDone ? "rgba(16,185,129,.18)" : isError || isLimit ? "rgba(244,63,94,.18)" : "rgba(251,191,36,.15)" }}>
              {isDone   ? <CheckCircle className="h-4 w-4 text-emerald-400" />
               : isError ? <AlertCircle className="h-4 w-4 text-rose-400" />
               : isLimit ? <Zap         className="h-4 w-4 text-rose-400" />
               :           <AiBrainIcon className="h-4 w-4 text-amber-400" />}
            </div>
            <span className="text-[13px] font-bold text-white tracking-tight">AI PDF Upload</span>
            {isActive && (
              <span className="fdw-pulse inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide bg-amber-400/15 text-amber-300 border border-amber-400/20">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 inline-block" />LIVE
              </span>
            )}
          </div>
          {(isDone || isError || isLimit) && (
            <button type="button" onClick={onClose}
              className="h-6 w-6 rounded-md flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 transition-colors">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="px-4 py-4 space-y-3.5">
          {fileName && !isLimit && (
            <div className="flex items-center gap-2.5 rounded-xl px-3 py-2 bg-white/[0.05] border border-white/[0.07]">
              <FileText className="h-3.5 w-3.5 text-amber-400/70 shrink-0" />
              <span className="text-[11px] text-slate-300 font-medium truncate">{fileName}</span>
            </div>
          )}

          {isLimit ? (
            <div className="space-y-3">
              <div className="rounded-xl px-3 py-3 bg-rose-500/10 border border-rose-500/20">
                <p className="text-[13px] font-bold text-rose-400 mb-1">Daily limit reached</p>
                <p className="text-[11px] text-slate-400 leading-snug">
                  You've used all {DAILY_LIMIT} AI auto-fills for today. Quota resets at midnight Pacific Time.
                </p>
              </div>
              <div className="flex items-center justify-between rounded-xl px-3 py-2.5 bg-white/[0.04] border border-white/[0.07]">
                <span className="text-[11px] text-slate-400">Resets in</span>
                <span className="text-[13px] font-black text-white tabular-nums">{countdown}</span>
              </div>
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] text-slate-500">Used today</span>
                <span className="text-[11px] font-bold text-rose-400">{usedToday} / {DAILY_LIMIT}</span>
              </div>
              <UsageDots used={usedToday} total={DAILY_LIMIT} />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-4">
                <div className="relative h-16 w-16 shrink-0 flex items-center justify-center">
                  <ArcProgress pct={pct} size={64} />
                  <div className="relative z-10 flex flex-col items-center leading-none">
                    {isDone   ? <CheckCircle className="h-6 w-6 text-emerald-400" />
                     : isError ? <AlertCircle className="h-6 w-6 text-rose-400" />
                     : (
                      <>
                        <span className="text-[15px] font-black text-white tabular-nums">{pct}</span>
                        <span className="text-[9px] font-bold text-slate-400 -mt-0.5">%</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="min-w-0">
                  <p className={`text-sm font-bold leading-tight ${isDone ? "text-emerald-400" : isError ? "text-rose-400" : "text-white"}`}>
                    {cfg.label}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                    {isError ? (errMsg || cfg.sublabel) : cfg.sublabel}
                  </p>
                  {isDone && fieldCount > 0 && (
                    <p className="text-[11px] text-emerald-400 font-semibold mt-1.5">✓ {fieldCount} fields auto-filled</p>
                  )}
                </div>
              </div>

              {!isError && (
                <div className="h-[5px] w-full rounded-full bg-white/[0.07] overflow-hidden">
                  <div
                    className={`h-full rounded-full ${isDone ? "bg-emerald-500" : "bg-amber-400"} ${isActive ? "fdw-shimmer" : ""}`}
                    style={{ width: `${pct}%`, transition: "width 0.18s linear" }}
                  />
                </div>
              )}

              {!isError && (
                <div className="flex items-start justify-between px-0.5">
                  {(["reading", "extracting", "done"] as Status[]).map((s) => {
                    const mine  = STATUS_ORDER.indexOf(s);
                    const isNow  = status === s;
                    const isPast = curIdx > mine && !isError;
                    const labels: Record<string, string> = { reading: "Read", extracting: "Extract", done: "Fill" };
                    return (
                      <div key={s} className="flex flex-col items-center gap-1.5">
                        <div className={`h-2 w-2 rounded-full transition-all duration-300 ${
                          isPast ? "bg-emerald-500 scale-110"
                          : isNow ? "bg-amber-400 scale-125 shadow-[0_0_0_3px_rgba(251,191,36,0.22)]"
                          : "bg-slate-700"
                        }`} />
                        <span className={`text-[9px] font-semibold uppercase tracking-wide ${
                          isPast ? "text-emerald-400" : isNow ? "text-amber-400" : "text-slate-600"
                        }`}>
                          {labels[s]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {isError && (
                <button type="button" onClick={onRetry}
                  className="w-full py-2 rounded-xl text-[13px] font-semibold text-rose-400 border border-rose-500/25 hover:bg-rose-500/10 transition-colors">
                  Try again
                </button>
              )}

              {!isError && (
                <div className="pt-1 border-t border-white/[0.05]">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] text-slate-500">Today's usage</span>
                    <span className={`text-[10px] font-bold ${
                      DAILY_LIMIT - usedToday <= 5  ? "text-rose-400"
                      : DAILY_LIMIT - usedToday <= 15 ? "text-amber-400"
                      : "text-slate-400"
                    }`}>
                      {Math.max(0, DAILY_LIMIT - usedToday)} left of {DAILY_LIMIT}
                    </span>
                  </div>
                  <UsageDots used={usedToday} total={DAILY_LIMIT} />
                </div>
              )}

              {isActive && (
                <p className="text-[10px] text-slate-600 text-center leading-none">
                  Please wait — do not close this window
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};

// ─── Main exported component ──────────────────────────────────────────────────
export function PdfAutofillBanner({
  formData,
  setFormData,
}: {
  formData:    MaidProfile;
  setFormData: React.Dispatch<React.SetStateAction<MaidProfile>>;
}) {
  const [status,       setStatus]       = useState<Status>("idle");
  const [fileName,     setFileName]     = useState<string | null>(null);
  const [fieldCount,   setFieldCount]   = useState(0);
  const [errMsg,       setErrMsg]       = useState("");
  const [showPopup,    setShowPopup]    = useState(false);
  const [liveProgress, setLiveProgress] = useState(0);
  const [usedToday,    setUsedToday]    = useState(() => loadUsage().count);
  const [countdown,    setCountdown]    = useState(() => formatCountdown(msTillMidnightPacific()));

  const inputRef      = useRef<HTMLInputElement>(null);
  const processingRef = useRef(false);
  const tickerRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    countdownRef.current = setInterval(() => {
      setCountdown(formatCountdown(msTillMidnightPacific()));
      const fresh = loadUsage();
      setUsedToday(fresh.count);
      if (status === "limit" && fresh.count < DAILY_LIMIT) setStatus("idle");
    }, 1000);
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [status]);

  const startTicker = useCallback((from: number, target: number, durationMs: number) => {
    if (tickerRef.current) clearInterval(tickerRef.current);
    const steps   = Math.max(1, Math.round(durationMs / 80));
    const delta   = (target - from) / steps;
    let current   = from; let step = 0;
    tickerRef.current = setInterval(() => {
      step++;
      current = Math.min(target, from + delta * step);
      setLiveProgress(Math.round(current));
      if (step >= steps) { if (tickerRef.current) clearInterval(tickerRef.current); tickerRef.current = null; }
    }, 80);
  }, []);

  const stopTicker = useCallback(() => {
    if (tickerRef.current) { clearInterval(tickerRef.current); tickerRef.current = null; }
  }, []);

  const reset = useCallback(() => {
    stopTicker();
    setStatus("idle"); setFileName(null); setFieldCount(0); setErrMsg("");
    setShowPopup(false); setLiveProgress(0);
    processingRef.current = false;
    if (inputRef.current) inputRef.current.value = "";
    setUsedToday(loadUsage().count);
  }, [stopTicker]);

  const process = useCallback(async (file: File) => {
    if (!file.type.includes("pdf")) { toast.error("Please upload a PDF file"); return; }
    if (processingRef.current) return;

    const currentUsage = loadUsage();
    if (currentUsage.count >= DAILY_LIMIT) {
      setUsedToday(currentUsage.count);
      setStatus("limit");
      setShowPopup(true);
      return;
    }

    processingRef.current = true;
    setFileName(file.name);
    setErrMsg("");
    setShowPopup(true);
    setStatus("reading");
    setLiveProgress(1);
    startTicker(1, 25, 1200);

    try {
      const pdfText = await extractPdfText(file);
      if (!pdfText.trim()) {
        throw new Error("Could not extract any text from this PDF. It may be a scanned image — please use a text-based biodata PDF.");
      }

      stopTicker();
      setStatus("extracting");
      startTicker(25, 92, 14000);

      const extracted = await callGroqWithText(pdfText, (attempt, model, delayMs) => {
        console.info(`[PdfAutofill] Retry ${attempt} on ${model} in ${delayMs}ms`);
      });

      const updated = incrementUsage();
      setUsedToday(updated.count);

      stopTicker();
      startTicker(92, 99, 400);
      await sleep(420);

      const count = countFields(extracted);
      setFieldCount(count);
      setFormData((prev) => applyToProfile(extracted, prev));

      stopTicker();
      setLiveProgress(100);
      setStatus("done");
      toast.success(`Auto-filled ${count} fields from biodata PDF`);
    } catch (err) {
      stopTicker();
      const msg = err instanceof Error ? err.message : "Extraction failed";
      setErrMsg(msg);
      setLiveProgress(0);
      setStatus("error");
      toast.error(msg);
    } finally {
      processingRef.current = false;
    }
  }, [setFormData, startTicker, stopTicker]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const f     = input.files?.[0];
    input.value = "";
    if (f) void process(f);
  }, [process]);

  const handleButtonClick = useCallback(() => {
    const currentUsage = loadUsage();
    if (currentUsage.count >= DAILY_LIMIT) {
      setUsedToday(currentUsage.count);
      setStatus("limit");
      setShowPopup(true);
      return;
    }
    if (status === "idle") inputRef.current?.click();
    else setShowPopup(true);
  }, [status]);

  const handleRetry = useCallback(() => {
    reset();
    setTimeout(() => inputRef.current?.click(), 80);
  }, [reset]);

  const isProcessing = status === "reading" || status === "extracting";
  const isDone       = status === "done";
  const isError      = status === "error";
  const isLimit      = status === "limit";
  const remaining    = Math.max(0, DAILY_LIMIT - usedToday);
  const pct          = liveProgress;

  const BTN_SIZE = 44;
  const BTN_R    = (BTN_SIZE - 6) / 2;
  const BTN_CIRC = 2 * Math.PI * BTN_R;
  const BTN_OFF  = BTN_CIRC - (pct / 100) * BTN_CIRC;

  const buttonBg =
    isDone      ? "linear-gradient(135deg,#059669,#10b981)"
    : isError   ? "linear-gradient(135deg,#e11d48,#f43f5e)"
    : isLimit   ? "linear-gradient(135deg,#7f1d1d,#991b1b)"
    : isProcessing ? "linear-gradient(135deg,#d97706,#f59e0b)"
    : remaining <= 5  ? "linear-gradient(135deg,#b91c1c,#dc2626)"
    : remaining <= 15 ? "linear-gradient(135deg,#92400e,#d97706)"
    : "linear-gradient(135deg,#b45309,#f59e0b)";

  const buttonShadow =
    isDone              ? "0 2px 12px rgba(16,185,129,0.45), 0 1px 3px rgba(0,0,0,0.2)"
    : isError || isLimit ? "0 2px 12px rgba(244,63,94,0.45), 0 1px 3px rgba(0,0,0,0.2)"
    : "0 2px 16px rgba(245,158,11,0.55), 0 1px 4px rgba(0,0,0,0.2)";

  return (
    <>
      <input
        ref={inputRef} type="file" accept="application/pdf"
        className="sr-only" onChange={handleFileChange}
        disabled={isProcessing || isLimit}
      />

      <button
        type="button" onClick={handleButtonClick}
        className="relative inline-flex items-center gap-0 overflow-hidden select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-amber-500"
        style={{
          height: 44, borderRadius: 14, padding: 0, border: "none",
          background: buttonBg, boxShadow: buttonShadow,
          cursor: isProcessing ? "default" : "pointer",
          transition: "all 0.2s ease",
        }}
      >
        {/* Icon area */}
        <span className="relative flex items-center justify-center shrink-0" style={{ width: BTN_SIZE, height: BTN_SIZE }}>
          {isProcessing && (
            <svg width={BTN_SIZE} height={BTN_SIZE} className="absolute inset-0 -rotate-90"
              style={{ pointerEvents: "none" }} aria-hidden>
              <circle cx={BTN_SIZE / 2} cy={BTN_SIZE / 2} r={BTN_R} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2.5" />
              <circle cx={BTN_SIZE / 2} cy={BTN_SIZE / 2} r={BTN_R} fill="none" stroke="rgba(255,255,255,0.95)"
                strokeWidth="2.5" strokeLinecap="round"
                strokeDasharray={BTN_CIRC} strokeDashoffset={BTN_OFF}
                style={{ transition: "stroke-dashoffset 0.5s cubic-bezier(0.4,0,0.2,1)" }} />
            </svg>
          )}
          <span className="relative z-10 flex flex-col items-center leading-none">
            {isProcessing
              ? (<><span className="text-[12px] font-black text-white tabular-nums leading-none">{pct}</span>
                    <span className="text-[8px] font-bold text-white/70 leading-none">%</span></>)
              : isDone    ? <CheckCircle className="h-5 w-5 text-white" />
              : isError   ? <AlertCircle className="h-5 w-5 text-white" />
              : isLimit   ? <Zap         className="h-5 w-5 text-white" />
              :              <AiBrainIcon className="h-5 w-5 text-white" />}
          </span>
        </span>

        {/* Divider */}
        <span className="shrink-0 self-stretch"
          style={{ width: 1, background: "rgba(255,255,255,0.25)", margin: "8px 0" }} aria-hidden />

        {/* Label */}
        <span className="flex flex-col items-start justify-center px-3 leading-tight">
          <span className="text-[13px] font-bold text-white whitespace-nowrap">
            {isProcessing   ? "Analysing PDF…"
             : isDone        ? `Filled · ${fieldCount} fields`
             : isError       ? "Upload Failed"
             : isLimit       ? "Daily limit reached"
             :                 "AI PDF Upload"}
          </span>
          <span className="text-[10px] font-medium whitespace-nowrap" style={{ color: "rgba(255,255,255,0.72)" }}>
            {isProcessing   ? STAGE_LABELS[status].sublabel
             : isDone        ? "Click to view details"
             : isError       ? "Click to retry"
             : isLimit       ? `Resets in ${countdown}`
             : remaining <= 5 ? `Only ${remaining} left today`
             :                  `${remaining} of ${DAILY_LIMIT} remaining today`}
          </span>
        </span>

        {/* Usage dots on idle/error */}
        {!isProcessing && !isDone && !isLimit && (
          <span className="pr-3 pl-1 self-center flex flex-col items-end gap-1" aria-hidden>
            <div className="flex gap-[3px]">
              {Array.from({ length: Math.min(DAILY_LIMIT, 10) }, (_, i) => (
                <div key={i} style={{
                  width: 4, height: 4, borderRadius: "50%",
                  background: i < usedToday ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.2)",
                }} />
              ))}
            </div>
          </span>
        )}

        {/* Hover overlay */}
        <span
          className="pointer-events-none absolute inset-0 rounded-[14px] opacity-0 hover:opacity-100 transition-opacity duration-200"
          style={{ background: "rgba(255,255,255,0.08)" }} aria-hidden
        />
      </button>

      {showPopup && (
        <UploadPopup
          status={status} fileName={fileName} fieldCount={fieldCount}
          errMsg={errMsg} pct={pct} usedToday={usedToday} countdown={countdown}
          onClose={reset} onRetry={handleRetry}
        />
      )}
    </>
  );
}

const PdfAutofillPage = () => null;
export default PdfAutofillPage;