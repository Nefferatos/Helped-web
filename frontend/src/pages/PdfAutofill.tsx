// PdfAutofill.tsx  — bold button with AI icon + arc % indicator + popup
// + daily usage tracking with localStorage + midnight countdown
// Usage: import { PdfAutofillBanner } from "./PdfAutofill";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle, AlertCircle, X, FileText, Zap } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import type { MaidProfile } from "@/lib/maids";

// ─── Gemini config ────────────────────────────────────────────────────────────
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string;
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

// gemini-2.0-flash was retired March 2026 — replaced with stable 2.5-flash-lite as fallback
const GEMINI_MODELS = [
  "gemini-2.5-flash-preview-05-20",
  "gemini-2.5-flash-lite",
] as const;

const geminiUrl = (model: string) =>
  `${GEMINI_BASE}/${model}:generateContent?key=${GEMINI_API_KEY}`;

const RETRYABLE_CODES = new Set([429, 500, 503]);
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1500;

// ─── Usage tracking config ────────────────────────────────────────────────────
// Gemini 2.5 Flash free tier: ~500 RPD (conservative limit set below)
const DAILY_LIMIT = 20; // conservative daily cap shown to users
const STORAGE_KEY = "pdfAutofill_usage";

interface UsageRecord {
  date: string;   // YYYY-MM-DD in Pacific Time
  count: number;
}

function getPacificDateString(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
}

function loadUsage(): UsageRecord {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { date: getPacificDateString(), count: 0 };
    const parsed = JSON.parse(raw) as UsageRecord;
    // Reset if it's a new day (Pacific Time)
    if (parsed.date !== getPacificDateString()) {
      return { date: getPacificDateString(), count: 0 };
    }
    return parsed;
  } catch {
    return { date: getPacificDateString(), count: 0 };
  }
}

function saveUsage(record: UsageRecord): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    // localStorage unavailable — fail silently
  }
}

function incrementUsage(): UsageRecord {
  const current = loadUsage();
  const updated = { date: current.date, count: current.count + 1 };
  saveUsage(updated);
  return updated;
}

/** Milliseconds until midnight Pacific Time */
function msTillMidnightPacific(): number {
  const now = new Date();
  // Get current time in Pacific
  const pacificNow = new Date(now.toLocaleString("en-US", { timeZone: "America/Los_Angeles" }));
  const midnight = new Date(pacificNow);
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

// ─── Evaluation method constants (must match AddMaid.tsx exactly) ─────────────
const EVAL_PARENT_DECLARATION =
  "Based on FDW's declaration, no evaluation/observation by Singapore EA or overseas training centre/EA";
const EVAL_PARENT_INTERVIEWED = "Interviewed by Singapore EA";
const EVAL_SUB_OPTIONS = [
  "Interviewed via telephone/teleconference",
  "Interviewed via videoconference",
  "Interviewed in person",
  "Interviewed in person and also made observation of FDW in the areas of work listed in table",
];

function isOverloaded(msg: string) {
  const l = msg.toLowerCase();
  return (
    l.includes("high demand") ||
    l.includes("overloaded") ||
    l.includes("try again") ||
    l.includes("quota") ||
    l.includes("rate limit")
  );
}

async function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

type Status = "idle" | "reading" | "extracting" | "done" | "error" | "limit";

interface ExtractedData {
  fullName?: string | null;
  dateOfBirth?: string | null;
  placeOfBirth?: string | null;
  height?: number | null;
  weight?: number | null;
  nationality?: string | null;
  homeAddress?: string | null;
  airportRepatriation?: string | null;
  homeCountryContact?: string | null;
  religion?: string | null;
  educationLevel?: string | null;
  numberOfSiblings?: number | null;
  maritalStatus?: string | null;
  numberOfChildren?: number | null;
  agesOfChildren?: string | null;
  allergies?: string | null;
  illnesses?: Record<string, boolean> | null;
  physicalDisabilities?: string | null;
  dietaryRestrictions?: string | null;
  foodHandlingPreferences?: string | null;
  offDaysPerMonth?: number | null;
  otherRemarks?: string | null;
  skills?: Array<{
    area: string;
    willing?: boolean | null;
    experience?: boolean | null;
    yearsOfExperience?: string | null;
    rating?: number | null;
    note?: string | null;
    subNote?: string | null;
  }> | null;
  employmentHistory?: Array<{
    from?: string | null;
    to?: string | null;
    country?: string | null;
    employer?: string | null;
    duties?: string | null;
    remarks?: string | null;
  }> | null;
  languageSkills?: Record<string, string> | null;
  presentSalary?: string | null;
  expectedSalary?: string | null;
  availability?: string | null;
  publicIntro?: string | null;
  ableHandlePork?: boolean | null;
  ableEatPork?: boolean | null;
  ableCareForPets?: boolean | null;
  ableSewing?: boolean | null;
  ableGardening?: boolean | null;
  willingWashCar?: boolean | null;
  willingWorkOffDay?: boolean | null;
  interviewAvailability?: string[] | null;
  availabilityRemark?: string | null;
  intro?: string | null;
  passportNo?: string | null;
  phone?: string | null;
  privateInfo?: string | null;
  interviewedBy?: string | null;
  referredBy?: string | null;
  evalByDeclaration?: boolean | null;
  evalInterviewedBySgEA?: boolean | null;
  evalInterviewSubOption?: string | null;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

// ─── JSON repair ──────────────────────────────────────────────────────────────

function fixUnescapedControlChars(s: string): string {
  let out = "";
  let inStr = false;
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (inStr) {
      if (ch === "\\") { out += ch + (s[i + 1] ?? ""); i += 2; continue; }
      if (ch === '"') { inStr = false; out += ch; i++; continue; }
      if (ch === "\n") { out += "\\n"; i++; continue; }
      if (ch === "\r") { out += "\\r"; i++; continue; }
      if (ch === "\t") { out += "\\t"; i++; continue; }
      const code = ch.charCodeAt(0);
      if (code < 0x20) { out += `\\u${code.toString(16).padStart(4, "0")}`; i++; continue; }
    } else {
      if (ch === '"') inStr = true;
    }
    out += ch;
    i++;
  }
  return out;
}

function repairJson(raw: string): string {
  let s = raw.replace(/^```(?:json)?\s*/im, "").replace(/\s*```\s*$/im, "").trim();
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start)
    throw new Error("No JSON object found in Gemini response");
  s = s.slice(start, end + 1);
  s = s.replace(/\/\/[^\n\r]*/g, "");
  s = fixUnescapedControlChars(s);
  s = s.replace(/,(\s*[}\]])/g, "$1");
  return s;
}

function parseGeminiJson(raw: string): ExtractedData {
  const attempts: Array<() => string> = [
    () => repairJson(raw),
    () => {
      const m = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
      if (!m?.[1]) throw new Error("No code fence");
      return repairJson(m[1]);
    },
    () => {
      const start = raw.indexOf("{");
      const end = raw.lastIndexOf("}");
      if (start === -1 || end === -1 || end <= start) throw new Error("No braces");
      return repairJson(raw.slice(start, end + 1));
    },
  ];
  const errors: string[] = [];
  for (const attempt of attempts) {
    try {
      const repaired = attempt();
      const parsed = JSON.parse(repaired) as ExtractedData;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
      errors.push("Not a plain object");
    } catch (e) {
      errors.push((e as Error).message);
    }
  }
  console.error("[PdfAutofill] All parse strategies failed:", errors, raw.slice(0, 1000));
  throw new Error(`Could not extract JSON from Gemini response: ${errors.join(" | ")}`);
}

// ─── Prompt ───────────────────────────────────────────────────────────────────

function buildPrompt(): string {
  return `You are a data extraction assistant for FDW (Foreign Domestic Worker) bio-data forms.

Extract ALL information from this PDF and return ONLY a valid JSON object.

MANDATORY OUTPUT RULES:
1. Output ONLY the raw JSON object. No markdown, no code fences, no explanation.
2. Start your response with { and end it with }. Nothing else.
3. All string values MUST be on a single line. Replace any line breaks inside strings with \\n.
4. No trailing commas after the last item in any object or array.
5. No JavaScript comments.
6. Use null for any missing field.
7. For boolean fields: use true or false (not strings). If explicitly marked Yes/Willing/checked use true. If No/Unwilling/unchecked use false. Use null only if truly absent.

Return this exact JSON structure:

{
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
  "evalInterviewSubOption": null
}

Field rules:
- dateOfBirth: YYYY-MM-DD format (convert from any format found)
- height: number in cm only (convert from feet/inches if needed)
- weight: number in kg only (convert from lbs if needed)
- nationality: append " maid" e.g. "Filipino maid", "Indonesian maid"
- educationLevel: MUST be exactly one of: "Primary Level (≤6 yrs)", "Secondary Level (7–9 yrs)", "High School (10–12 yrs)", "Vocational Course", "College / Degree (≥13 yrs)"
- maritalStatus: MUST be exactly one of: "Single", "Single Parent", "Married", "Divorced", "Widowed", "Separated"
- skills[].area: MUST be exactly one of: "Care of infants/children", "Care of elderly", "Care of disabled", "General housework", "Cooking", "Language abilities (spoken)", "Other skills, if any"
- skills[].willing: true if the form shows Yes/Willing/checked, false if No/Unwilling. Do NOT use null if a value is present.
- skills[].experience: true if the form shows Yes/has experience, false if No/no experience. Do NOT use null if a value is present.
- skills[].yearsOfExperience: ALWAYS a string. If experience is true and years are stated, use the number as a string (e.g. "2"). If experience is true but no years are stated, use "". If experience is false, use "". NEVER use null here.
- skills[].rating: number 1–5 if a star/score rating is shown, otherwise null
- skills[].note: any text note or assessment/observation comment for this skill area, or "" if none. NEVER null.
- skills[].subNote: the text written in the sub-field below the area name. Specifically:
    - For "Care of infants/children": the age range text (e.g. "0-3 years")
    - For "Cooking": the cuisines text (e.g. "Chinese, Western, Indian")
    - For "Language abilities (spoken)": the languages specified (e.g. "English, Tagalog")
    - For "Other skills, if any": the skill description text
    - For all other areas: "" (empty string)
  Use "" if the sub-field is blank. NEVER null.
- IMPORTANT: Include ALL 7 skill rows in the skills array, even if some have no data.
- employmentHistory[]: one object per employer. Include ALL employers found in the PDF.
- employmentHistory[].from: 4-digit year string (e.g. "2019"), or "" if unknown
- employmentHistory[].to: 4-digit year string (e.g. "2022"), or "" if unknown
- employmentHistory[].country: country name as a string (e.g. "Singapore"), or "" if unknown
- employmentHistory[].employer: employer's full name, or "" if unknown
- employmentHistory[].duties: ALL text describing the maid's main duties / responsibilities for this employer. Copy the full text. Use "" if none. NEVER null.
- employmentHistory[].remarks: any remarks, feedback, or notes about this employment period. Use "" if none. NEVER null.
- languageSkills values: MUST be exactly one of: "Zero", "Poor", "Little", "Fair", "Good" or null
- interviewAvailability: array of applicable strings from: ["FDW is not available for interview", "FDW can be interviewed by phone", "FDW can be interviewed by video-conference", "FDW can be interviewed in person"]
- evalByDeclaration: true if the form indicates "Based on FDW's declaration, no evaluation/observation by Singapore EA or overseas training centre/EA" is checked/selected
- evalInterviewedBySgEA: true if the form indicates "Interviewed by Singapore EA" is checked/selected
- evalInterviewSubOption: if evalInterviewedBySgEA is true, set this to whichever ONE of the following sub-options is checked — use the exact string:
    "Interviewed via telephone/teleconference"
    "Interviewed via videoconference"
    "Interviewed in person"
    "Interviewed in person and also made observation of FDW in the areas of work listed in table"
  Set to null if none applies.
- ableHandlePork / ableEatPork / ableCareForPets / ableSewing / ableGardening / willingWashCar / willingWorkOffDay: true/false based on Yes/No in the form. Do NOT use null if a Yes/No answer is clearly present.
- intro: the maid's personal self-introduction paragraph (first-person narrative about herself)
- publicIntro: a public-facing summary suitable for employer viewing
- availabilityRemark: any remarks about availability or interview conditions
- passportNo: passport number and expiry if present (e.g. "R8833831 · Expiry: 28/01/2028")
- phone: maid's or foreign agency's WhatsApp/contact number
- privateInfo: any internal agency notes, historical records, or confidential remarks
- interviewedBy: name of staff who interviewed the maid
- referredBy: name of referrer if mentioned`;
}

// ─── Gemini call ──────────────────────────────────────────────────────────────

async function callGemini(base64: string, model: string): Promise<ExtractedData> {
  const res = await fetch(geminiUrl(model), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: buildPrompt() },
          { inline_data: { mime_type: "application/pdf", data: base64 } },
        ],
      }],
      generationConfig: { temperature: 0.0, maxOutputTokens: 8192 },
    }),
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    const msg = err.error?.message ?? `Gemini error ${res.status}`;
    const e = new Error(msg) as Error & { status: number };
    e.status = res.status;
    throw e;
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> }; finishReason?: string }>;
    promptFeedback?: { blockReason?: string };
  };

  if (data.promptFeedback?.blockReason)
    throw new Error(`Gemini blocked: ${data.promptFeedback.blockReason}`);

  const candidate = data.candidates?.[0];
  if (candidate?.finishReason === "SAFETY")
    throw new Error("Gemini refused due to safety filters");

  const raw = candidate?.content?.parts?.[0]?.text ?? "";
  if (!raw.trim())
    throw new Error(`Gemini returned an empty response (finishReason: ${candidate?.finishReason ?? "unknown"})`);

  return parseGeminiJson(raw);
}

async function extractFromPdf(
  file: File,
  onRetry?: (attempt: number, model: string, delayMs: number) => void,
): Promise<ExtractedData> {
  const base64 = await fileToBase64(file);

  for (let modelIdx = 0; modelIdx < GEMINI_MODELS.length; modelIdx++) {
    const model = GEMINI_MODELS[modelIdx];
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await callGemini(base64, model);
      } catch (err) {
        const e = err as Error & { status?: number };
        const retryable =
          (e.status !== undefined && RETRYABLE_CODES.has(e.status)) || isOverloaded(e.message);
        const isLastAttempt = attempt === MAX_RETRIES;
        const isLastModel   = modelIdx === GEMINI_MODELS.length - 1;

        if (!retryable) {
          if (isLastModel) throw new Error(e.message);
          console.warn(`[PdfAutofill] Model ${model} non-retryable: ${e.message}. Trying next…`);
          break;
        }
        if (isLastAttempt && isLastModel) throw new Error(e.message);
        if (isLastAttempt) {
          console.warn(`[PdfAutofill] Model ${model} exhausted, trying fallback…`);
          break;
        }
        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        onRetry?.(attempt, model, delay);
        await sleep(delay);
      }
    }
  }
  throw new Error("All Gemini models unavailable. Please try again later.");
}

// ─── Map extracted data → MaidProfile ────────────────────────────────────────

function applyToProfile(extracted: ExtractedData, prev: MaidProfile): MaidProfile {
  const e = extracted;

  const resolveNationality = (raw?: string | null): string => {
    if (!raw) return prev.nationality ?? "";
    const lower = raw.toLowerCase();
    const map: Record<string, string> = {
      indian: "Indian maid", filipino: "Filipino maid", indonesian: "Indonesian maid",
      myanmar: "Myanmar maid", burmese: "Myanmar maid", "sri lankan": "Sri Lankan maid",
      bangladeshi: "Bangladeshi maid", nepali: "Nepali maid", cambodian: "Cambodian maid",
    };
    for (const [k, v] of Object.entries(map)) if (lower.includes(k)) return v;
    return raw;
  };

  const areaMap: Record<string, string> = {
    "care of infants": "Care of infants/children",
    "care of infants/children": "Care of infants/children",
    "infants": "Care of infants/children",
    "care of elderly": "Care of elderly",
    "elderly": "Care of elderly",
    "care of disabled": "Care of disabled",
    "disabled": "Care of disabled",
    "general housework": "General housework",
    "housework": "General housework",
    "cooking": "Cooking",
    "language abilities": "Language abilities (spoken)",
    "language abilities (spoken)": "Language abilities (spoken)",
    "other skills": "Other skills, if any",
    "other skills, if any": "Other skills, if any",
  };
  const resolveArea = (raw: string) => areaMap[raw.toLowerCase().trim()] ?? raw;

  const prevWorkAreas = (prev.workAreas as Record<string, unknown>) ?? {};
  const workAreas: Record<string, unknown> = { ...prevWorkAreas };

  const prevSP = (prev.skillsPreferences as Record<string, unknown>) ?? {};
  const prevWorkAreaNotes = (prevSP.workAreaNotes as Record<string, string>) ?? {};
  const workAreaNotes: Record<string, string> = { ...prevWorkAreaNotes };

  if (Array.isArray(e.skills)) {
    for (const s of e.skills) {
      if (!s.area) continue;
      const area = resolveArea(s.area);
      const willing    = s.willing    === true ? true : s.willing    === false ? false : undefined;
      const experience = s.experience === true ? true : s.experience === false ? false : undefined;
      const rating = typeof s.rating === "number" ? s.rating : null;
      const note   = typeof s.note === "string" ? s.note : (s.note ?? "");
      const rawYears = s.yearsOfExperience;
      const yearsOfExperience =
        rawYears == null ? "" :
        typeof rawYears === "number" ? String(rawYears) :
        String(rawYears);

      workAreas[area] = {
        willing, experience, yearsOfExperience, rating, note,
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
          from: h.from ?? "", to: h.to ?? "", country: h.country ?? "",
          employer: h.employer ?? "", duties: h.duties ?? "", remarks: h.remarks ?? "",
        }))
      : ((prev.employmentHistory ?? [{}]) as Record<string, unknown>[]);

  const prevLangs = (prev.languageSkills as Record<string, string>) ?? {};
  const langSkills: Record<string, string> = { ...prevLangs };
  if (e.languageSkills && typeof e.languageSkills === "object")
    for (const [k, v] of Object.entries(e.languageSkills)) if (v) langSkills[k] = v;

  const prevOI = (prevSP.otherInformation as Record<string, boolean>) ?? {};
  const otherInfo: Record<string, boolean> = { ...prevOI };
  if (e.ableHandlePork    != null) otherInfo["Able to handle pork?"] = e.ableHandlePork;
  if (e.ableEatPork       != null) otherInfo["Able to eat pork?"] = e.ableEatPork;
  if (e.ableCareForPets   != null) otherInfo["Able to care for dog/cat?"] = e.ableCareForPets;
  if (e.ableSewing        != null) otherInfo["Able to do simple sewing?"] = e.ableSewing;
  if (e.ableGardening     != null) otherInfo["Able to do gardening work?"] = e.ableGardening;
  if (e.willingWashCar    != null) otherInfo["Willing to wash car?"] = e.willingWashCar;
  if (e.willingWorkOffDay != null) otherInfo["Willing to work on off-days with compensation?"] = e.willingWorkOffDay;

  const hasSgExp =
    empHistory.length > 0
      ? empHistory.some((h) => String(h["country"] ?? "").toLowerCase().includes("singapore"))
      : undefined;

  const prevIntro    = (prev.introduction as Record<string, unknown>) ?? {};
  const prevIllnesses = (prevIntro.pastIllnesses as Record<string, boolean>) ?? {};
  const mergedIllnesses: Record<string, boolean> = { ...prevIllnesses };
  if (e.illnesses && typeof e.illnesses === "object")
    for (const [k, v] of Object.entries(e.illnesses)) if (v != null) mergedIllnesses[k] = v;

  const prevEvalMethods = Array.isArray(prevSP.evaluationMethods)
    ? (prevSP.evaluationMethods as string[])
    : [];
  const evalSet = new Set<string>(prevEvalMethods);

  if (e.evalByDeclaration === true) {
    evalSet.add(EVAL_PARENT_DECLARATION);
  } else if (e.evalByDeclaration === false) {
    evalSet.delete(EVAL_PARENT_DECLARATION);
  }

  if (e.evalInterviewedBySgEA === true) {
    evalSet.add(EVAL_PARENT_INTERVIEWED);
    if (e.evalInterviewSubOption && EVAL_SUB_OPTIONS.includes(e.evalInterviewSubOption)) {
      evalSet.add(e.evalInterviewSubOption);
    }
  } else if (e.evalInterviewedBySgEA === false) {
    evalSet.delete(EVAL_PARENT_INTERVIEWED);
    for (const sub of EVAL_SUB_OPTIONS) evalSet.delete(sub);
  }

  const evaluationMethods = Array.from(evalSet);

  return {
    ...prev,
    fullName:          e.fullName          != null ? e.fullName          : prev.fullName,
    dateOfBirth:       e.dateOfBirth       != null ? e.dateOfBirth       : prev.dateOfBirth,
    placeOfBirth:      e.placeOfBirth      != null ? e.placeOfBirth      : prev.placeOfBirth,
    height:            e.height            != null ? e.height            : prev.height,
    weight:            e.weight            != null ? e.weight            : prev.weight,
    nationality:       resolveNationality(e.nationality),
    homeAddress:       e.homeAddress       != null ? e.homeAddress       : prev.homeAddress,
    airportRepatriation: e.airportRepatriation != null ? e.airportRepatriation : prev.airportRepatriation,
    religion:          e.religion          != null ? e.religion          : prev.religion,
    educationLevel:    e.educationLevel    != null ? e.educationLevel    : prev.educationLevel,
    numberOfSiblings:  e.numberOfSiblings  != null ? e.numberOfSiblings  : prev.numberOfSiblings,
    maritalStatus:     e.maritalStatus     != null ? e.maritalStatus     : prev.maritalStatus,
    numberOfChildren:  e.numberOfChildren  != null ? e.numberOfChildren  : prev.numberOfChildren,
    languageSkills: langSkills,
    workAreas,
    employmentHistory: empHistory,
    agencyContact: {
      ...((prev.agencyContact as Record<string, unknown>) ?? {}),
      ...(e.homeCountryContact != null ? { homeCountryContactNumber: e.homeCountryContact } : {}),
      ...(e.passportNo != null ? { passportNo: e.passportNo } : {}),
      ...(e.phone      != null ? { phone: e.phone }           : {}),
    },
    skillsPreferences: {
      ...prevSP,
      ...(e.offDaysPerMonth != null ? { offDaysPerMonth: String(e.offDaysPerMonth) } : {}),
      ...(hasSgExp !== undefined ? { sgExperience: hasSgExp } : {}),
      otherInformation: otherInfo,
      workAreaNotes,
      evaluationMethods,
      ...(Array.isArray(e.interviewAvailability) && e.interviewAvailability.length > 0
        ? { availabilityInterviewOptions: e.interviewAvailability } : {}),
      ...(e.availabilityRemark != null ? { availabilityRemark: e.availabilityRemark } : {}),
      ...(e.interviewedBy != null ? { interviewedBy: e.interviewedBy } : {}),
      ...(e.referredBy    != null ? { referredBy: e.referredBy }       : {}),
      ...(e.privateInfo   != null ? { privateInfo: e.privateInfo }     : {}),
    },
    introduction: {
      ...prevIntro,
      ...(e.allergies               != null ? { allergies: e.allergies }                             : {}),
      ...(e.physicalDisabilities    != null ? { physicalDisabilities: e.physicalDisabilities }       : {}),
      ...(e.dietaryRestrictions     != null ? { dietaryRestrictions: e.dietaryRestrictions }         : {}),
      ...(e.foodHandlingPreferences != null ? { foodHandlingPreferences: e.foodHandlingPreferences } : {}),
      pastIllnesses: mergedIllnesses,
      ...(e.agesOfChildren  != null ? { agesOfChildren: e.agesOfChildren }       : {}),
      ...(e.presentSalary   != null ? { presentSalary: String(e.presentSalary) } : {}),
      ...(e.expectedSalary  != null ? { expectedSalary: String(e.expectedSalary)} : {}),
      ...(e.availability    != null ? { availability: e.availability }           : {}),
      ...(e.otherRemarks    != null ? { otherRemarks: e.otherRemarks }           : {}),
      ...(e.intro           != null ? { intro: e.intro }                         : {}),
      ...(e.publicIntro     != null ? { publicIntro: e.publicIntro }             : {}),
    },
  };
}

// ─── Count filled fields ──────────────────────────────────────────────────────

function countFields(e: ExtractedData): number {
  let n = 0;
  for (const v of Object.values(e)) {
    if (v == null) continue;
    if (typeof v === "object" && !Array.isArray(v))
      n += Object.values(v as Record<string, unknown>).filter((x) => x != null && x !== false).length;
    else if (Array.isArray(v)) n += v.length;
    else n++;
  }
  return n;
}

// ─── Stage config ─────────────────────────────────────────────────────────────

const STAGE_LABELS: Record<Status, { label: string; sublabel: string }> = {
  idle:       { label: "AI PDF Upload",   sublabel: "Auto-fill from biodata PDF"  },
  reading:    { label: "Reading PDF…",    sublabel: "Loading file into memory"    },
  extracting: { label: "Extracting…",     sublabel: "Gemini AI analysing fields"  },
  done:       { label: "Done!",           sublabel: "Form auto-filled"            },
  error:      { label: "Failed",          sublabel: "Click to retry"              },
  limit:      { label: "Limit reached",   sublabel: "Resets at midnight PT"       },
};

const STAGES = STAGE_LABELS;

// ─── AI Brain SVG icon ────────────────────────────────────────────────────────

const AiBrainIcon = ({ className = "" }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden
  >
    <path d="M9.5 2a2.5 2.5 0 0 1 2.45 2H12a2.5 2.5 0 0 1 2.45-2 2.5 2.5 0 0 1 2.5 2.5c0 .28-.05.55-.13.8A4 4 0 0 1 20 9a4 4 0 0 1-1.22 2.88A3.5 3.5 0 0 1 15.5 17H8.5a3.5 3.5 0 0 1-3.28-4.12A4 4 0 0 1 4 9a4 4 0 0 1 3.18-3.7 2.5 2.5 0 0 1-.18-.8A2.5 2.5 0 0 1 9.5 2z" />
    <line x1="12" y1="4" x2="12" y2="17" />
    <line x1="8"  y1="9" x2="16" y2="9" />
    <line x1="8"  y1="13" x2="16" y2="13" />
    <path d="M10 17v2a2 2 0 0 0 4 0v-2" />
  </svg>
);

// ─── Arc progress indicator ───────────────────────────────────────────────────

const ArcProgress = ({ pct, size = 44 }: { pct: number; size?: number }) => {
  const cx = size / 2;
  const cy = size / 2;
  const r  = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;

  return (
    <svg
      width={size}
      height={size}
      className="absolute inset-0 -rotate-90"
      style={{ pointerEvents: "none" }}
      aria-hidden
    >
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="2.5" />
      <circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke="rgba(255,255,255,0.95)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 0.5s cubic-bezier(0.4,0,0.2,1)" }}
      />
    </svg>
  );
};

// ─── Usage dots indicator ─────────────────────────────────────────────────────

const UsageDots = ({ used, total }: { used: number; total: number }) => {
  const dots = Array.from({ length: total }, (_, i) => i < used);
  // Show max 10 dots visually, scale remaining
  const maxVisible = 10;
  const visible = dots.slice(0, maxVisible);

  return (
    <div className="flex items-center gap-0.5 flex-wrap" style={{ maxWidth: 120 }}>
      {visible.map((isUsed, i) => (
        <div
          key={i}
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: isUsed ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.2)",
            transition: "background 0.3s ease",
          }}
        />
      ))}
      {total > maxVisible && (
        <span style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", marginLeft: 2 }}>
          +{total - maxVisible}
        </span>
      )}
    </div>
  );
};

// ─── Popup ────────────────────────────────────────────────────────────────────

type PopupProps = {
  status: Status;
  fileName: string | null;
  fieldCount: number;
  errMsg: string;
  pct: number;
  usedToday: number;
  countdown: string;
  onClose: () => void;
  onRetry: () => void;
};

const STATUS_ORDER: Status[] = ["idle", "reading", "extracting", "done", "error", "limit"];

const UploadPopup = ({
  status, fileName, fieldCount, errMsg, pct, usedToday, countdown, onClose, onRetry,
}: PopupProps) => {
  const cfg      = STAGES[status];
  const isActive = status === "reading" || status === "extracting";
  const isDone   = status === "done";
  const isError  = status === "error";
  const isLimit  = status === "limit";
  const curIdx   = STATUS_ORDER.indexOf(status);
  const remaining = Math.max(0, DAILY_LIMIT - usedToday);

  useEffect(() => {
    if (!isDone) return;
    const t = setTimeout(onClose, 3200);
    return () => clearTimeout(t);
  }, [isDone, onClose]);

  const borderColor = isDone ? "#10b981" : isError || isLimit ? "#f43f5e" : "#334155";
  const glowColor   = isDone
    ? "rgba(16,185,129,0.14)"
    : isError || isLimit
    ? "rgba(244,63,94,0.14)"
    : "rgba(0,0,0,0)";

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        style={{ background: "rgba(15,23,42,0.28)", backdropFilter: "blur(2px)" }}
        onClick={isDone || isError || isLimit ? onClose : undefined}
      />
      <div
        role="dialog"
        aria-label="PDF upload progress"
        className="fixed bottom-5 right-5 z-50 w-[320px] overflow-hidden rounded-2xl"
        style={{
          background: "linear-gradient(148deg,#1e293b 0%,#0f172a 100%)",
          border: `1px solid ${borderColor}`,
          boxShadow: `0 0 0 1px ${borderColor},0 20px 60px ${glowColor},0 6px 20px rgba(0,0,0,0.55)`,
          animation: "fdwPopIn .28s cubic-bezier(.34,1.56,.64,1)",
        }}
      >
        <style>{`
          @keyframes fdwPopIn{from{opacity:0;transform:translateY(12px) scale(.94)}to{opacity:1;transform:translateY(0) scale(1)}}
          @keyframes fdwShimmer{0%{transform:translateX(-100%)}100%{transform:translateX(220%)}}
          @keyframes fdwPulse{0%,100%{opacity:1}50%{opacity:.5}}
          .fdw-shimmer{position:relative;overflow:hidden}
          .fdw-shimmer::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.22),transparent);animation:fdwShimmer 1.5s ease infinite}
          .fdw-pulse{animation:fdwPulse 1.8s ease infinite}
        `}</style>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.07]">
          <div className="flex items-center gap-2.5">
            <div
              className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0"
              style={{
                background: isDone
                  ? "rgba(16,185,129,.18)"
                  : isError || isLimit
                  ? "rgba(244,63,94,.18)"
                  : "rgba(251,191,36,.15)",
              }}
            >
              {isDone      ? <CheckCircle className="h-4 w-4 text-emerald-400" />
               : isError   ? <AlertCircle className="h-4 w-4 text-rose-400" />
               : isLimit   ? <Zap className="h-4 w-4 text-rose-400" />
               : <AiBrainIcon className="h-4 w-4 text-amber-400" />}
            </div>
            <span className="text-[13px] font-bold text-white tracking-tight">AI PDF Upload</span>
            {isActive && (
              <span className="fdw-pulse inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide bg-amber-400/15 text-amber-300 border border-amber-400/20">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 inline-block" />
                LIVE
              </span>
            )}
          </div>
          {(isDone || isError || isLimit) && (
            <button
              type="button" onClick={onClose}
              className="h-6 w-6 rounded-md flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 transition-colors"
            >
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

          {/* Limit reached state */}
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
                    {isDone ? (
                      <CheckCircle className="h-6 w-6 text-emerald-400" />
                    ) : isError ? (
                      <AlertCircle className="h-6 w-6 text-rose-400" />
                    ) : (
                      <>
                        <span className="text-[15px] font-black text-white tabular-nums">{pct}</span>
                        <span className="text-[9px] font-bold text-slate-400 -mt-0.5">%</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="min-w-0">
                  <p className={`text-sm font-bold leading-tight ${
                    isDone ? "text-emerald-400" : isError ? "text-rose-400" : "text-white"
                  }`}>{cfg.label}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                    {isError ? (errMsg || cfg.sublabel) : cfg.sublabel}
                  </p>
                  {isDone && fieldCount > 0 && (
                    <p className="text-[11px] text-emerald-400 font-semibold mt-1.5">
                      ✓ {fieldCount} fields auto-filled
                    </p>
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
                    const mine   = STATUS_ORDER.indexOf(s);
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
                        }`}>{labels[s]}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {isError && (
                <button
                  type="button" onClick={onRetry}
                  className="w-full py-2 rounded-xl text-[13px] font-semibold text-rose-400 border border-rose-500/25 hover:bg-rose-500/10 transition-colors"
                >
                  Try again
                </button>
              )}

              {/* Usage counter at bottom of popup (non-limit states) */}
              {!isError && (
                <div className="pt-1 border-t border-white/[0.05]">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] text-slate-500">Today's usage</span>
                    <span className={`text-[10px] font-bold ${
                      remaining <= 3 ? "text-rose-400" : remaining <= 7 ? "text-amber-400" : "text-slate-400"
                    }`}>
                      {remaining} left of {DAILY_LIMIT}
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
  formData: MaidProfile;
  setFormData: React.Dispatch<React.SetStateAction<MaidProfile>>;
}) {
  const [status,        setStatus]       = useState<Status>("idle");
  const [fileName,      setFileName]     = useState<string | null>(null);
  const [fieldCount,    setFieldCount]   = useState(0);
  const [errMsg,        setErrMsg]       = useState("");
  const [showPopup,     setShowPopup]    = useState(false);
  const [liveProgress,  setLiveProgress] = useState(0);
  const [usedToday,     setUsedToday]    = useState(() => loadUsage().count);
  const [countdown,     setCountdown]    = useState(() => formatCountdown(msTillMidnightPacific()));

  const inputRef       = useRef<HTMLInputElement>(null);
  const processingRef  = useRef(false);
  const tickerRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Countdown clock ──────────────────────────────────────────────────────
  useEffect(() => {
    countdownRef.current = setInterval(() => {
      setCountdown(formatCountdown(msTillMidnightPacific()));
      // Also refresh usage count (handles day rollover)
      const fresh = loadUsage();
      setUsedToday(fresh.count);
      if (status === "limit" && fresh.count < DAILY_LIMIT) {
        setStatus("idle");
      }
    }, 1000);
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [status]);

  // ── Progress ticker helpers ──────────────────────────────────────────────
  const startTicker = useCallback((from: number, target: number, durationMs: number) => {
    if (tickerRef.current) clearInterval(tickerRef.current);
    const steps   = Math.max(1, Math.round(durationMs / 80));
    const delta   = (target - from) / steps;
    let   current = from;
    let   step    = 0;
    tickerRef.current = setInterval(() => {
      step++;
      current = Math.min(target, from + delta * step);
      setLiveProgress(Math.round(current));
      if (step >= steps) {
        if (tickerRef.current) clearInterval(tickerRef.current);
        tickerRef.current = null;
      }
    }, 80);
  }, []);

  const stopTicker = useCallback(() => {
    if (tickerRef.current) { clearInterval(tickerRef.current); tickerRef.current = null; }
  }, []);

  const reset = useCallback(() => {
    stopTicker();
    setStatus("idle");
    setFileName(null);
    setFieldCount(0);
    setErrMsg("");
    setShowPopup(false);
    setLiveProgress(0);
    processingRef.current = false;
    if (inputRef.current) inputRef.current.value = "";
    // Refresh usage in case of day rollover
    setUsedToday(loadUsage().count);
  }, [stopTicker]);

  const process = useCallback(
    async (file: File) => {
      if (!file.type.includes("pdf")) { toast.error("Please upload a PDF file"); return; }
      if (processingRef.current) return;

      // Check limit before starting
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

      // Phase 1: reading
      setStatus("reading");
      setLiveProgress(1);
      startTicker(1, 15, 600);

      try {
        // Phase 2: extracting
        setStatus("extracting");
        startTicker(15, 92, 18000);

        const extracted = await extractFromPdf(file);

        // Increment usage only on success
        const updated = incrementUsage();
        setUsedToday(updated.count);

        // Phase 3: applying
        stopTicker();
        startTicker(92, 99, 400);
        await sleep(420);

        const count = countFields(extracted);
        setFieldCount(count);
        setFormData((prev) => applyToProfile(extracted, prev));

        // Phase 4: done
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
    },
    [setFormData, startTicker, stopTicker],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) void process(f);
    },
    [process],
  );

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

  // Button gradient based on remaining uses
  const buttonBg = isDone
    ? "linear-gradient(135deg,#059669,#10b981)"
    : isError
    ? "linear-gradient(135deg,#e11d48,#f43f5e)"
    : isLimit
    ? "linear-gradient(135deg,#7f1d1d,#991b1b)"
    : isProcessing
    ? "linear-gradient(135deg,#d97706,#f59e0b)"
    : remaining <= 3
    ? "linear-gradient(135deg,#b91c1c,#dc2626)"   // red when nearly out
    : remaining <= 7
    ? "linear-gradient(135deg,#92400e,#d97706)"   // amber-ish when low
    : "linear-gradient(135deg,#b45309,#f59e0b)";  // normal

  const buttonShadow = isDone
    ? "0 2px 12px rgba(16,185,129,0.45), 0 1px 3px rgba(0,0,0,0.2)"
    : isError || isLimit
    ? "0 2px 12px rgba(244,63,94,0.45), 0 1px 3px rgba(0,0,0,0.2)"
    : "0 2px 16px rgba(245,158,11,0.55), 0 1px 4px rgba(0,0,0,0.2)";

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="sr-only"
        onChange={handleFileChange}
        disabled={isProcessing || isLimit}
      />

      <button
        type="button"
        onClick={handleButtonClick}
        className="relative inline-flex items-center gap-0 overflow-hidden select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-amber-500"
        style={{
          height: 44,
          borderRadius: 14,
          padding: 0,
          border: "none",
          background: buttonBg,
          boxShadow: buttonShadow,
          cursor: isProcessing ? "default" : "pointer",
          transition: "all 0.2s ease",
        }}
      >
        {/* Left icon area */}
        <span
          className="relative flex items-center justify-center shrink-0"
          style={{ width: BTN_SIZE, height: BTN_SIZE }}
        >
          {isProcessing && (
            <svg
              width={BTN_SIZE}
              height={BTN_SIZE}
              className="absolute inset-0 -rotate-90"
              style={{ pointerEvents: "none" }}
              aria-hidden
            >
              <circle cx={BTN_SIZE / 2} cy={BTN_SIZE / 2} r={BTN_R} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2.5" />
              <circle
                cx={BTN_SIZE / 2} cy={BTN_SIZE / 2} r={BTN_R}
                fill="none" stroke="rgba(255,255,255,0.95)" strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray={BTN_CIRC}
                strokeDashoffset={BTN_OFF}
                style={{ transition: "stroke-dashoffset 0.5s cubic-bezier(0.4,0,0.2,1)" }}
              />
            </svg>
          )}

          <span className="relative z-10 flex flex-col items-center leading-none">
            {isProcessing ? (
              <>
                <span className="text-[12px] font-black text-white tabular-nums leading-none">{pct}</span>
                <span className="text-[8px] font-bold text-white/70 leading-none">%</span>
              </>
            ) : isDone ? (
              <CheckCircle className="h-5 w-5 text-white" />
            ) : isError ? (
              <AlertCircle className="h-5 w-5 text-white" />
            ) : isLimit ? (
              <Zap className="h-5 w-5 text-white" />
            ) : (
              <AiBrainIcon className="h-5 w-5 text-white" />
            )}
          </span>
        </span>

        <span
          className="shrink-0 self-stretch"
          style={{ width: 1, background: "rgba(255,255,255,0.25)", margin: "8px 0" }}
          aria-hidden
        />

        {/* Text area */}
        <span className="flex flex-col items-start justify-center px-3 leading-tight">
          <span className="text-[13px] font-bold text-white whitespace-nowrap">
            {isProcessing
              ? "Analysing PDF…"
              : isDone
              ? `Filled · ${fieldCount} fields`
              : isError
              ? "Upload Failed"
              : isLimit
              ? "Daily limit reached"
              : "AI PDF Upload"}
          </span>
          <span className="text-[10px] font-medium whitespace-nowrap" style={{ color: "rgba(255,255,255,0.72)" }}>
            {isProcessing
              ? STAGES[status].sublabel
              : isDone
              ? "Click to view details"
              : isError
              ? "Click to retry"
              : isLimit
              ? `Resets in ${countdown}`
              : remaining <= 3
              ? `Only ${remaining} left today`
              : `${remaining} of ${DAILY_LIMIT} remaining today`}
          </span>
        </span>

        {/* Usage mini-dots on the right (idle/error only) */}
        {!isProcessing && !isDone && !isLimit && (
          <span className="pr-3 pl-1 self-center flex flex-col items-end gap-1" aria-hidden>
            {/* Mini usage dots */}
            <div className="flex gap-[3px]">
              {Array.from({ length: Math.min(DAILY_LIMIT, 10) }, (_, i) => (
                <div
                  key={i}
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: "50%",
                    background: i < usedToday
                      ? "rgba(255,255,255,0.75)"
                      : "rgba(255,255,255,0.2)",
                  }}
                />
              ))}
            </div>
          </span>
        )}

        <span
          className="pointer-events-none absolute inset-0 rounded-[14px] opacity-0 hover:opacity-100 transition-opacity duration-200"
          style={{ background: "rgba(255,255,255,0.08)" }}
          aria-hidden
        />
      </button>

      {showPopup && (
        <UploadPopup
          status={status}
          fileName={fileName}
          fieldCount={fieldCount}
          errMsg={errMsg}
          pct={pct}
          usedToday={usedToday}
          countdown={countdown}
          onClose={reset}
          onRetry={handleRetry}
        />
      )}
    </>
  );
}

const PdfAutofillPage = () => null;
export default PdfAutofillPage;