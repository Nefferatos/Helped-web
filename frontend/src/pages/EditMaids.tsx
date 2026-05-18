import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { calculateAge, defaultMaidProfile, formatDate, MaidProfile } from "@/lib/maids";
import { Search, Eye, EyeOff, Trash2, Download, Upload, ArrowLeft, AlertTriangle, CheckSquare, Square, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { adminPath } from "@/lib/routes";
import SendMaidToClientDialog from "@/components/SendMaidToClientDialog";
import { scanUploadedFile } from "@/lib/fileScan";
import { exportMaidProfilesToPdf } from "@/lib/maidExport";

type ViewMode = "menu" | "public" | "hidden";
type VisibilityTarget =
  | { maid: MaidProfile; makePublic: boolean }
  | { bulk: true; makePublic: boolean };

const PAGE_SIZE = 14;

type ImportBatchProgress = {
  active: boolean;
  total: number;
  currentIndex: number;
  currentFileName: string;
  completed: number;
  failed: number;
  stage: string;
  cancelled?: boolean;
};

let xlsxLoader: Promise<typeof import("xlsx")> | null = null;

type JSZipConstructor = { new(): { loadAsync: (data: ArrayBuffer) => Promise<{ file: (path: string) => { async: (type: "text") => Promise<string> } | null }> }; loadAsync: (data: ArrayBuffer) => Promise<{ file: (path: string) => { async: (type: "text") => Promise<string> } | null }> };

let jsZipLoader: Promise<unknown> | null = null;

const loadJsZip = async (): Promise<JSZipConstructor> => {
  if (!jsZipLoader) {
    jsZipLoader = import("jszip");
  }
  const module = await jsZipLoader as { default?: unknown };
  return (module.default ?? module) as JSZipConstructor;
};

const waitForPaint = () =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, 0);
  });

const loadXlsx = async () => {
  xlsxLoader ??= import("xlsx");
  return await xlsxLoader;
};

const EVAL_PARENT_INTERVIEWED = "Interviewed by Singapore EA";
const EVAL_SUB_OPTIONS = [
  "Interviewed via telephone/teleconference",
  "Interviewed via videoconference",
  "Interviewed in person",
  "Interviewed in person and also made observation of FDW in the areas of work listed in table",
];

const normalizeImportLabel = (value: unknown) =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .replace(/[•►]/g, "")
    .trim()
    .toLowerCase();

const cleanImportedValue = (value: unknown) => {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  if (/^(?:not stated|none stated|not provided(?: in biodata)?|blank in biodata|not specified|none)$/i.test(text)) {
    return "";
  }
  return text;
};

const parseImportedNumber = (value: unknown) => {
  const text = cleanImportedValue(value);
  if (!text) return 0;
  const match = text.match(/-?\d+/);
  return match ? Number(match[0]) : 0;
};

const parseImportedDate = (value: unknown) => {
  const text = cleanImportedValue(value);
  if (!text) return "";
  const match = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (!match) return "";
  const [, dd, mm, yyyy] = match;
  return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
};

const parseImportedBoolean = (value: unknown): boolean | undefined => {
  const text = cleanImportedValue(value).toLowerCase();
  if (!text) return undefined;
  if (/(^|[^a-z])(yes|check|checked|true)([^a-z]|$)/.test(text)) return true;
  if (/(^|[^a-z])(no|unchecked|false)([^a-z]|$)/.test(text)) return false;
  return undefined;
};

const importedRowMap = (rows: unknown[][]) => {
  const map = new Map<string, string>();
  rows.forEach((row) => {
    const label = cleanImportedValue(row[0]);
    if (!label) return;
    map.set(normalizeImportLabel(label), cleanImportedValue(row[1]));
  });
  return map;
};

const importedSectionValues = (rows: unknown[][]) => {
  const sections = new Map<string, string>();
  let currentSection = "";
  rows.forEach((row) => {
    const first = cleanImportedValue(row[0]);
    const second = cleanImportedValue(row[1]);
    if (!first) return;
    if (first.toLowerCase().includes("introduction tab") || first.toLowerCase().includes("private info") || first.toLowerCase().includes("interviewed by") || first.toLowerCase().includes("referred by")) {
      currentSection = normalizeImportLabel(first);
      if (second) sections.set(currentSection, second);
      return;
    }
    if (normalizeImportLabel(first) === "value") {
      sections.set(currentSection, second);
    }
  });
  return sections;
};

const isRichMaidWorkbook = (sheetNames: string[]) =>
  sheetNames.includes("Profile") && sheetNames.includes("Skills") && sheetNames.includes("Employment History");

const buildImportedMaidProfile = (rowsBySheet: Record<string, unknown[][]>): MaidProfile => {
  const profileRows = rowsBySheet.Profile ?? [];
  const skillsRows = rowsBySheet.Skills ?? [];
  const employmentRows = rowsBySheet["Employment History"] ?? [];
  const introRows = rowsBySheet["Introduction & Private"] ?? [];

  const profileMap = importedRowMap(profileRows);
  const introSections = importedSectionValues(introRows);

  const otherInformation: Record<string, boolean> = {};
  for (const row of skillsRows) {
    const label = cleanImportedValue(row[0]);
    const parsed = parseImportedBoolean(row[1]);
    if (
      parsed !== undefined &&
      [
        "Able to handle pork?",
        "Able to eat pork?",
        "Able to care for dog/cat?",
        "Able to do simple sewing?",
        "Able to do gardening work?",
        "Willing to wash car?",
        "Willing to work on off-days with compensation?",
      ].includes(label)
    ) {
      otherInformation[label] = parsed;
    }
  }

  const evalRows = new Map<string, string>();
  skillsRows.forEach((row) => {
    const label = cleanImportedValue(row[0]);
    if (label) evalRows.set(label, cleanImportedValue(row[1]));
  });
  const evaluationMethods: string[] = [];
  if (parseImportedBoolean(evalRows.get("Interviewed by Singapore EA"))) {
    evaluationMethods.push(EVAL_PARENT_INTERVIEWED);
  }
  EVAL_SUB_OPTIONS.forEach((option) => {
    if (parseImportedBoolean(evalRows.get(option))) evaluationMethods.push(option);
  });

  const workAreaLabelMap: Record<string, string> = {
    "care of infants/children (age range: infants–4 yr)": "Care of infants/children",
    "care of infants/children (age range: infantsâ€“4 yr)": "Care of infants/children",
    "care of elderly": "Care of elderly",
    "care of disabled": "Care of disabled",
    "general housework": "General housework",
    "cooking (vegetarian & non-vegetarian)": "Cooking",
    "language abilities (hindi, english)": "Language abilities (spoken)",
    "language abilities (spoken)": "Language abilities (spoken)",
    "other skills": "Other skills, if any",
    "other skills, if any": "Other skills, if any",
  };

  const workAreas: Record<string, unknown> = {};
  skillsRows.forEach((row) => {
    const targetLabel = workAreaLabelMap[normalizeImportLabel(row[0])];
    if (!targetLabel) return;
    const fourth = cleanImportedValue(row[3]);
    const fifth = cleanImportedValue(row[4]);
    const ratingCandidate = [fourth, fifth].find((value) => /^\d+(\.\d+)?$/.test(value));
    const rating = ratingCandidate ? Number(ratingCandidate) : null;
    const note = [fifth, fourth].find((value) => value && !/^\d+(\.\d+)?$/.test(value)) ?? "";
    workAreas[targetLabel] = {
      willing: parseImportedBoolean(row[1]),
      experience: parseImportedBoolean(row[2]),
      yearsOfExperience: "",
      rating,
      note,
      evaluation: [rating != null ? `${rating}/5` : "", note].filter(Boolean).join(" - "),
    };
  });

  const languageSkills = { ...defaultMaidProfile.languageSkills };
  skillsRows.forEach((row) => {
    const label = cleanImportedValue(row[0]);
    const value = cleanImportedValue(row[1]);
    if (!label || !value) return;
    if (label === "English" || label === "Hindi" || label === "Tamil") {
      languageSkills[label] = value;
    }
  });

  const employmentHeaderIndex = employmentRows.findIndex(
    (row) => cleanImportedValue(row[0]) === "From" && cleanImportedValue(row[1]) === "To",
  );
  const employmentHistory =
    employmentHeaderIndex === -1
      ? []
      : employmentRows
          .slice(employmentHeaderIndex + 1)
          .map((row) => ({
            from: cleanImportedValue(row[0]),
            to: cleanImportedValue(row[1]),
            country: cleanImportedValue(row[2]),
            employer: cleanImportedValue(row[3]),
            duties: cleanImportedValue(row[4]),
            remarks: cleanImportedValue(row[5]),
          }))
          .filter((row) => Object.values(row).some(Boolean) && row.from !== "By Phone");

  const availabilityInterviewOptions: string[] = [];
  employmentRows.forEach((row) => {
    const label = cleanImportedValue(row[0]);
    const checked = parseImportedBoolean(row[1]);
    if (checked !== true) return;
    if (label === "By Phone") availabilityInterviewOptions.push("FDW can be interviewed by phone");
    if (label === "By Video-conference") availabilityInterviewOptions.push("FDW can be interviewed by video-conference");
    if (label === "In Person") availabilityInterviewOptions.push("FDW can be interviewed in person");
  });

  const pastIllnesses: Record<string, boolean> = {
    "(I) Mental illness": parseImportedBoolean(profileMap.get(normalizeImportLabel("Mental illness"))) ?? false,
    "(II) Epilepsy": parseImportedBoolean(profileMap.get(normalizeImportLabel("Epilepsy"))) ?? false,
    "(III) Asthma": parseImportedBoolean(profileMap.get(normalizeImportLabel("Asthma"))) ?? false,
    "(IV) Diabetes": parseImportedBoolean(profileMap.get(normalizeImportLabel("Diabetes"))) ?? false,
    "(V) Hypertension": parseImportedBoolean(profileMap.get(normalizeImportLabel("Hypertension"))) ?? false,
    "(VI) Tuberculosis": parseImportedBoolean(profileMap.get(normalizeImportLabel("Tuberculosis"))) ?? false,
    "(VII) Heart disease": parseImportedBoolean(profileMap.get(normalizeImportLabel("Heart disease"))) ?? false,
    "(VIII) Malaria": parseImportedBoolean(profileMap.get(normalizeImportLabel("Malaria"))) ?? false,
    "(IX) Operations": parseImportedBoolean(profileMap.get(normalizeImportLabel("Operations"))) ?? false,
  };

  const foodHandlingPreferences = [
    parseImportedBoolean(profileMap.get(normalizeImportLabel("Food Handling — No Pork"))) ? "No Pork" : "",
    parseImportedBoolean(profileMap.get(normalizeImportLabel("Food Handling â€” No Pork"))) ? "No Pork" : "",
    parseImportedBoolean(profileMap.get(normalizeImportLabel("Food Handling — No Beef"))) ? "No Beef" : "",
    parseImportedBoolean(profileMap.get(normalizeImportLabel("Food Handling â€” No Beef"))) ? "No Beef" : "",
  ]
    .filter(Boolean)
    .filter((value, index, self) => self.indexOf(value) === index)
    .join(", ");

  return {
    ...defaultMaidProfile,
    fullName: cleanImportedValue(profileMap.get(normalizeImportLabel("Full Name *"))),
    referenceCode: cleanImportedValue(profileMap.get(normalizeImportLabel("Ref Code *"))),
    type: cleanImportedValue(profileMap.get(normalizeImportLabel("Type"))),
    nationality: cleanImportedValue(profileMap.get(normalizeImportLabel("Nationality"))),
    dateOfBirth: parseImportedDate(profileMap.get(normalizeImportLabel("Date of Birth *"))),
    placeOfBirth: cleanImportedValue(profileMap.get(normalizeImportLabel("Place of Birth"))),
    height: parseImportedNumber(profileMap.get(normalizeImportLabel("Height (cm)"))),
    weight: parseImportedNumber(profileMap.get(normalizeImportLabel("Weight (kg)"))),
    religion: cleanImportedValue(profileMap.get(normalizeImportLabel("Religion"))),
    maritalStatus: cleanImportedValue(profileMap.get(normalizeImportLabel("Marital Status"))),
    numberOfChildren: parseImportedNumber(profileMap.get(normalizeImportLabel("Number of Children"))),
    numberOfSiblings: parseImportedNumber(profileMap.get(normalizeImportLabel("Number of Siblings"))),
    homeAddress: cleanImportedValue(profileMap.get(normalizeImportLabel("Residential Address in Home Country"))),
    airportRepatriation: cleanImportedValue(profileMap.get(normalizeImportLabel("Port / Airport for Repatriation"))),
    educationLevel: cleanImportedValue(profileMap.get(normalizeImportLabel("Education Level"))),
    languageSkills,
    workAreas,
    employmentHistory,
    introduction: {
      intro: cleanImportedValue(introSections.get(normalizeImportLabel("Introduction Tab (introduction.intro)"))),
      publicIntro: cleanImportedValue(introSections.get(normalizeImportLabel("Public Introduction Tab (introduction.publicIntro)"))),
      agesOfChildren: cleanImportedValue(profileMap.get(normalizeImportLabel("Ages of Children"))),
      presentSalary: cleanImportedValue(profileMap.get(normalizeImportLabel("Present Salary (S$)"))),
      expectedSalary: cleanImportedValue(profileMap.get(normalizeImportLabel("Expected Salary (S$)"))),
      availability: cleanImportedValue(profileMap.get(normalizeImportLabel("Availability"))),
      maidLoan: cleanImportedValue(profileMap.get(normalizeImportLabel("Maid Loan (S$)"))),
      offdayCompensation: cleanImportedValue(profileMap.get(normalizeImportLabel("Off-day Compensation (S$/day)"))),
      allergies: cleanImportedValue(profileMap.get(normalizeImportLabel("Allergies"))),
      physicalDisabilities: cleanImportedValue(profileMap.get(normalizeImportLabel("Physical Disabilities"))),
      dietaryRestrictions: cleanImportedValue(profileMap.get(normalizeImportLabel("Dietary Restrictions"))),
      foodHandlingPreferences,
      otherRemarks: cleanImportedValue(profileMap.get(normalizeImportLabel("Other Remarks"))),
      pastIllnesses,
    },
    skillsPreferences: {
      indianMaidCategory: cleanImportedValue(profileMap.get(normalizeImportLabel("Indian Maid Category"))),
      otherInformation,
      offDaysPerMonth: cleanImportedValue(profileMap.get(normalizeImportLabel("Rest Days per Month"))),
      evaluationMethods,
      availabilityInterviewOptions,
      privateInfo: cleanImportedValue(introSections.get(normalizeImportLabel("Private Info — Historical Record (skillsPreferences.privateInfo)"))) ||
        cleanImportedValue(introSections.get(normalizeImportLabel("Private Info â€” Historical Record (skillsPreferences.privateInfo)"))),
      interviewedBy: cleanImportedValue(introSections.get(normalizeImportLabel("Interviewed By (skillsPreferences.interviewedBy)"))),
      referredBy: cleanImportedValue(introSections.get(normalizeImportLabel("Referred By (skillsPreferences.referredBy)"))),
    },
    agencyContact: {
      phone: cleanImportedValue(introSections.get(normalizeImportLabel("Private Info — Agency Contact (agencyContact.phone)"))) ||
        cleanImportedValue(introSections.get(normalizeImportLabel("Private Info â€” Agency Contact (agencyContact.phone)"))),
      passportNo: cleanImportedValue(introSections.get(normalizeImportLabel("Private Info — Passport Number (agencyContact.passportNo)"))) ||
        cleanImportedValue(introSections.get(normalizeImportLabel("Private Info â€” Passport Number (agencyContact.passportNo)"))),
      homeCountryContactNumber: cleanImportedValue(profileMap.get(normalizeImportLabel("Contact Number in Home Country"))),
    },
  };
};

const decodePdfUtf16Hex = (hex: string) => {
  const cleaned = hex.replace(/\s+/g, "");
  const bytes = new Uint8Array(cleaned.match(/.{1,2}/g)?.map((pair) => parseInt(pair, 16)) ?? []);
  const payload = bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff ? bytes.slice(2) : bytes;
  return new TextDecoder("utf-16be").decode(payload);
};

// ── Yellow & Green Color Palette ──────────────────────────────────────────
// Green ramp:  #EAF3DE / #C0DD97 / #97C459 / #639922 / #3B6D11 / #27500A / #173404
// Amber ramp:  #FAEEDA / #FAC775 / #EF9F27 / #BA7517 / #854F0B / #633806 / #412402

const menuStyles = `
  :root {
    --ym-green-50:  #EAF3DE;
    --ym-green-100: #C0DD97;
    --ym-green-200: #97C459;
    --ym-green-400: #639922;
    --ym-green-600: #3B6D11;
    --ym-green-800: #27500A;
    --ym-green-900: #173404;
    --ym-amber-50:  #FAEEDA;
    --ym-amber-100: #FAC775;
    --ym-amber-200: #EF9F27;
    --ym-amber-400: #BA7517;
    --ym-amber-600: #854F0B;
    --ym-amber-800: #633806;
    --ym-amber-900: #412402;
  }

  @keyframes float-icon {
    0%, 100% { transform: translateY(0px) rotateX(0deg); }
    50% { transform: translateY(-4px) rotateX(6deg); }
  }

  /* ── Public card — green ── */
  .card-public {
    background: linear-gradient(135deg, var(--ym-green-50) 0%, color-mix(in srgb, var(--ym-green-50) 40%, transparent) 60%, transparent 100%);
    border: 1.5px solid color-mix(in srgb, var(--ym-green-200) 50%, transparent);
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .card-public:hover {
    background: linear-gradient(135deg, color-mix(in srgb, var(--ym-green-50) 90%, white) 0%, color-mix(in srgb, var(--ym-green-50) 60%, transparent) 60%, transparent 100%);
    border-color: var(--ym-green-200);
    box-shadow: 0 8px 32px color-mix(in srgb, var(--ym-green-400) 22%, transparent), 0 2px 8px color-mix(in srgb, var(--ym-green-400) 12%, transparent);
    transform: translateY(-2px) scale(1.01);
  }
  .card-public:active { transform: translateY(0px) scale(0.99); }

  /* ── Hidden card — amber ── */
  .card-hidden {
    background: linear-gradient(135deg, var(--ym-amber-50) 0%, color-mix(in srgb, var(--ym-amber-50) 50%, transparent) 100%);
    border: 1.5px solid color-mix(in srgb, var(--ym-amber-100) 70%, transparent);
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .card-hidden:hover {
    background: linear-gradient(135deg, color-mix(in srgb, var(--ym-amber-50) 95%, white) 0%, color-mix(in srgb, var(--ym-amber-50) 70%, transparent) 100%);
    border-color: var(--ym-amber-100);
    box-shadow: 0 8px 28px color-mix(in srgb, var(--ym-amber-400) 18%, transparent), 0 2px 8px color-mix(in srgb, var(--ym-amber-400) 10%, transparent);
    transform: translateY(-2px) scale(1.01);
  }
  .card-hidden:active { transform: translateY(0px) scale(0.99); }

  /* ── 3-D icon containers ── */
  .icon-3d-public {
    width: 72px; height: 72px;
    border-radius: 22px;
    background: linear-gradient(145deg, var(--ym-green-200), var(--ym-green-400));
    box-shadow: 0 4px 0 var(--ym-green-600), 0 8px 20px color-mix(in srgb, var(--ym-green-400) 35%, transparent), inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -2px 0 rgba(0,0,0,0.12);
    display: flex; align-items: center; justify-content: center;
    position: relative; transform-style: preserve-3d; transition: all 0.3s ease;
  }
  .card-public:hover .icon-3d-public {
    animation: float-icon 2s ease-in-out infinite;
    box-shadow: 0 8px 0 var(--ym-green-600), 0 14px 30px color-mix(in srgb, var(--ym-green-400) 40%, transparent), inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -2px 0 rgba(0,0,0,0.12);
  }
  .icon-3d-hidden {
    width: 72px; height: 72px;
    border-radius: 22px;
    background: linear-gradient(145deg, var(--ym-amber-200), var(--ym-amber-400));
    box-shadow: 0 4px 0 var(--ym-amber-600), 0 8px 20px color-mix(in srgb, var(--ym-amber-400) 30%, transparent), inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -2px 0 rgba(0,0,0,0.12);
    display: flex; align-items: center; justify-content: center;
    position: relative; transform-style: preserve-3d; transition: all 0.3s ease;
  }
  .card-hidden:hover .icon-3d-hidden {
    animation: float-icon 2s ease-in-out infinite;
    box-shadow: 0 8px 0 var(--ym-amber-600), 0 14px 28px color-mix(in srgb, var(--ym-amber-400) 35%, transparent), inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -2px 0 rgba(0,0,0,0.12);
  }
  .icon-shine {
    position: absolute; top: 0; left: 0; right: 0; height: 50%;
    border-radius: 22px 22px 0 0;
    background: linear-gradient(180deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0) 100%);
    pointer-events: none;
  }

  /* ── Badges ── */
  .badge-live {
    display: inline-flex; align-items: center; gap: 5px;
    background: var(--ym-green-50);
    border: 1px solid color-mix(in srgb, var(--ym-green-200) 60%, transparent);
    color: var(--ym-green-600);
    border-radius: 99px; padding: 2px 10px;
    font-size: 11px; font-weight: 600; letter-spacing: 0.04em;
  }
  .badge-live-dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: var(--ym-green-400);
    animation: pulse-dot 1.8s ease-in-out infinite;
  }
  @keyframes pulse-dot {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(0.8); }
  }
  .badge-draft {
    display: inline-flex; align-items: center; gap: 5px;
    background: var(--ym-amber-50);
    border: 1px solid color-mix(in srgb, var(--ym-amber-100) 70%, transparent);
    color: var(--ym-amber-600);
    border-radius: 99px; padding: 2px 10px;
    font-size: 11px; font-weight: 600; letter-spacing: 0.04em;
  }

  /* ── Search bar glow ── */
  .search-glow:focus-within {
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--ym-green-400) 22%, transparent), 0 2px 8px color-mix(in srgb, var(--ym-green-400) 10%, transparent);
    border-color: color-mix(in srgb, var(--ym-green-200) 80%, transparent) !important;
  }

  .card-arrow { transition: transform 0.2s ease; }
  .card-public:hover .card-arrow,
  .card-hidden:hover .card-arrow { transform: translateX(3px); }

  /* ── Search dropdown ── */
  .search-dropdown {
    position: absolute; top: calc(100% + 6px); left: 0; right: 0;
    background: hsl(var(--background));
    border: 1.5px solid color-mix(in srgb, var(--ym-green-200) 55%, transparent);
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.05);
    z-index: 50; overflow: hidden;
    animation: dropdown-in 0.15s cubic-bezier(0.16,1,0.3,1);
  }
  @keyframes dropdown-in {
    from { opacity: 0; transform: translateY(-6px) scale(0.98); }
    to   { opacity: 1; transform: translateY(0)    scale(1); }
  }
  .search-result-item {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 14px; cursor: pointer;
    transition: background 0.12s ease;
    border-bottom: 1px solid hsl(var(--border)/0.5);
  }
  .search-result-item:last-child { border-bottom: none; }
  .search-result-item:hover,
  .search-result-item.active { background: var(--ym-green-50); }
  .search-result-avatar {
    width: 42px; height: 42px; border-radius: 8px;
    object-fit: cover; flex-shrink: 0;
    background: var(--ym-green-50);
    border: 1px solid color-mix(in srgb, var(--ym-green-200) 40%, transparent);
  }
  .search-result-avatar-placeholder {
    width: 42px; height: 42px; border-radius: 8px;
    background: var(--ym-green-50);
    border: 1px solid color-mix(in srgb, var(--ym-green-200) 50%, transparent);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; font-size: 12px; color: var(--ym-green-600); font-weight: 700;
  }
  .search-highlight {
    background: color-mix(in srgb, var(--ym-amber-100) 55%, transparent);
    color: var(--ym-amber-600);
    border-radius: 3px; padding: 0 1px; font-weight: 600;
  }
  .search-badge-public {
    display: inline-flex; align-items: center; gap: 3px;
    background: var(--ym-green-50);
    color: var(--ym-green-600);
    border-radius: 99px; padding: 2px 8px;
    font-size: 10px; font-weight: 700; letter-spacing: 0.03em; flex-shrink: 0;
  }
  .search-badge-hidden {
    display: inline-flex; align-items: center;
    background: var(--ym-amber-50);
    color: var(--ym-amber-600);
    border-radius: 99px; padding: 2px 8px;
    font-size: 10px; font-weight: 700; letter-spacing: 0.03em; flex-shrink: 0;
  }

  /* ── Maid card grid item ── */
  .maid-card {
    border-radius: 0; overflow: hidden;
    border: 1.5px solid hsl(var(--border));
    transition: box-shadow 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
  }
  .maid-card:hover {
    box-shadow: 0 6px 24px color-mix(in srgb, var(--ym-green-400) 14%, rgba(0,0,0,0.06));
    transform: translateY(-2px);
    border-color: color-mix(in srgb, var(--ym-green-200) 70%, transparent);
  }
  .maid-card.selected {
    border-color: var(--ym-green-400);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--ym-green-400) 20%, transparent);
  }
  .maid-card-photo {
    width: 100%; aspect-ratio: 3 / 4; object-fit: contain; object-position: top center;
    display: block; min-height: 130px; background: #ffffff; vertical-align: top;
  }
  .maid-card-no-photo {
    width: 100%; aspect-ratio: 3 / 4; min-height: 130px;
    display: flex; align-items: center; justify-content: center;
    background: var(--ym-green-50); font-size: 11px;
    color: var(--ym-green-800); font-weight: 500;
  }
  .maid-card-body {
    padding: 7px 8px 9px; display: flex; flex-direction: column; gap: 4px;
  }
  .maid-card-name {
    font-size: 12px; font-weight: 800; color: #0a0a0a;
    line-height: 1.3; white-space: nowrap; overflow: hidden;
    text-overflow: ellipsis; cursor: pointer;
  }
  .maid-card-name:hover { color: var(--ym-green-600); }
  .maid-card-meta {
    font-size: 10.5px; color: #1a1a1a; line-height: 1.55; font-weight: 500;
  }
  .maid-card-meta strong { color: #0a0a0a; font-weight: 700; }
  .maid-card-ref {
    font-size: 10.5px; font-weight: 800; color: #0a0a0a; font-variant-numeric: tabular-nums;
  }
  .maid-card-date { font-size: 10px; color: #2a2a2a; font-weight: 500; }

  /* ── Visibility toggle button on card ── */
  .maid-card-vis-btn {
    display: inline-flex; width: 100%; align-items: center; justify-content: center;
    gap: 4px; border-radius: 4px; padding: 5px 6px; font-size: 10.5px; font-weight: 700;
    transition: background 0.15s ease; margin-top: 2px;
    cursor: pointer; border: none; outline: none;
  }
  .maid-card-vis-btn.public {
    background: var(--ym-green-50);
    color: var(--ym-green-600);
    border: 1px solid color-mix(in srgb, var(--ym-green-200) 50%, transparent);
  }
  .maid-card-vis-btn.public:hover { background: color-mix(in srgb, var(--ym-green-100) 60%, white); }
  .maid-card-vis-btn.hidden-btn {
    background: var(--ym-amber-50);
    color: var(--ym-amber-600);
    border: 1px solid color-mix(in srgb, var(--ym-amber-100) 60%, transparent);
  }
  .maid-card-vis-btn.hidden-btn:hover { background: color-mix(in srgb, var(--ym-amber-100) 40%, white); }

  /* ── Bulk actions bar accent ── */
  .bulk-bar {
    background: var(--ym-green-50);
    border: 1px solid color-mix(in srgb, var(--ym-green-200) 45%, transparent);
    border-radius: 10px;
  }

  /* ── Status chip in list header ── */
  .chip-public {
    background: var(--ym-green-50);
    color: var(--ym-green-600);
    border: 1px solid color-mix(in srgb, var(--ym-green-200) 60%, transparent);
  }
  .chip-hidden {
    background: var(--ym-amber-50);
    color: var(--ym-amber-600);
    border: 1px solid color-mix(in srgb, var(--ym-amber-100) 60%, transparent);
  }

  /* ── Back button ── */
  .back-btn-line {
    background: var(--ym-green-400);
  }
  .back-btn:hover .back-btn-line { width: 100%; }
`;

// ── Nationality → ISO 3166-1 alpha-2 country code ──────────────────────────
const NATIONALITY_FLAGS: Record<string, string> = {
  filipino: "PH", philippines: "PH",
  indonesian: "ID", indonesia: "ID",
  myanmar: "MM", burmese: "MM",
  cambodian: "KH", cambodia: "KH",
  vietnamese: "VN", vietnam: "VN",
  thai: "TH", thailand: "TH",
  malaysian: "MY", malaysia: "MY",
  singaporean: "SG", singapore: "SG",
  indian: "IN", india: "IN",
  "sri lankan": "LK", "sri lanka": "LK",
  bangladeshi: "BD", bangladesh: "BD",
  nepali: "NP", nepal: "NP",
  pakistani: "PK", pakistan: "PK",
  chinese: "CN", china: "CN",
  hongkong: "HK", "hong kong": "HK",
  taiwanese: "TW", taiwan: "TW",
  korean: "KR", "south korea": "KR",
  japanese: "JP", japan: "JP",
  ethiopian: "ET", ethiopia: "ET",
  kenyan: "KE", kenya: "KE",
  ugandan: "UG", uganda: "UG",
  ghanaian: "GH", ghana: "GH",
  nigerian: "NG", nigeria: "NG",
};

const getNationalityCode = (nationality?: string): string => {
  if (!nationality) return "";
  const key = nationality.toLowerCase().trim();
  if (NATIONALITY_FLAGS[key]) return NATIONALITY_FLAGS[key];
  for (const [k, code] of Object.entries(NATIONALITY_FLAGS)) {
    if (key.includes(k)) return code;
  }
  return "";
};

const FlagCircle = ({ code }: { code: string }) => {
  if (!code) return null;
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: 16, height: 16, borderRadius: "50%", overflow: "hidden",
        border: "1px solid rgba(0,0,0,0.13)", flexShrink: 0,
        marginRight: 3, verticalAlign: "middle", background: "#e5e7eb",
      }}
    >
      <img
        src={`https://flagcdn.com/w40/${code.toLowerCase()}.png`}
        alt={code}
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
      />
    </span>
  );
};

const EditMaids = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [view, setView] = useState<ViewMode>("menu");
  const [search, setSearch] = useState("");
  const [maids, setMaids] = useState<MaidProfile[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [importBatchProgress, setImportBatchProgress] = useState<ImportBatchProgress>({
    active: false,
    total: 0,
    currentIndex: 0,
    currentFileName: "",
    completed: 0,
    failed: 0,
    stage: "",
  });
  const [page, setPage] = useState(1);
  const [maidToSendThroughAgency, setMaidToSendThroughAgency] = useState<MaidProfile | null>(null);
  const [maidToDirectHire, setMaidToDirectHire] = useState<MaidProfile | null>(null);
  const [maidToReject, setMaidToReject] = useState<MaidProfile | null>(null);
  const [confirmExportOpen, setConfirmExportOpen] = useState(false);
  const [confirmImportOpen, setConfirmImportOpen] = useState(false);
  const [pendingImportFiles, setPendingImportFiles] = useState<File[]>([]);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<"selected" | MaidProfile | null>(null);

  const [visibilityDialogOpen, setVisibilityDialogOpen] = useState(false);
  const [pendingVisibilityTarget, setPendingVisibilityTarget] = useState<VisibilityTarget | null>(null);

  const [manualImportOpen, setManualImportOpen] = useState(false);
  const [manualImportFields, setManualImportFields] = useState({ name: "", nationality: "", referenceCode: "" });

  const [menuSearch, setMenuSearch] = useState("");
  const [menuSearchResults, setMenuSearchResults] = useState<(MaidProfile & { _vis?: string })[]>([]);
  const [menuSearchLoading, setMenuSearchLoading] = useState(false);
  const [menuSearchOpen, setMenuSearchOpen] = useState(false);
  const [menuActiveIndex, setMenuActiveIndex] = useState(-1);
  const menuSearchRef = useRef<HTMLDivElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const cancelImportRef = useRef<boolean>(false);

  useEffect(() => {
    if (!menuSearch.trim()) {
      setMenuSearchResults([]);
      setMenuSearchOpen(false);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        setMenuSearchLoading(true);
        const params = new URLSearchParams({ search: menuSearch.trim() });
        const [pubRes, hidRes] = await Promise.all([
          fetch(`/api/maids?visibility=public&${params}`, { signal: controller.signal }),
          fetch(`/api/maids?visibility=hidden&${params}`, { signal: controller.signal }),
        ]);
        const [pubData, hidData] = await Promise.all([
          pubRes.json() as Promise<{ maids?: MaidProfile[] }>,
          hidRes.json() as Promise<{ maids?: MaidProfile[] }>,
        ]);
        const combined = [
          ...(pubData.maids ?? []).map((m) => ({ ...m, _vis: "public" as const })),
          ...(hidData.maids ?? []).map((m) => ({ ...m, _vis: "hidden" as const })),
        ].slice(0, 8);
        setMenuSearchResults(combined);
        setMenuSearchOpen(true);
        setMenuActiveIndex(-1);
      } catch {
        // silently ignore abort errors
      } finally {
        setMenuSearchLoading(false);
      }
    }, 220);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [menuSearch]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuSearchRef.current && !menuSearchRef.current.contains(e.target as Node)) {
        setMenuSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const highlightMatch = useCallback((text: string, query: string) => {
    if (!query.trim()) return <>{text}</>;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return <>{text}</>;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="search-highlight">{text.slice(idx, idx + query.length)}</mark>
        {text.slice(idx + query.length)}
      </>
    );
  }, []);

  useEffect(() => {
    if (location.state?.fromView) {
      setView(location.state.fromView);
    }
  }, [location.state]);

  const handleBack = () => {
    if (view !== "menu") {
      setView("menu");
      return;
    }
    navigate(adminPath("/"));
  };

  const visibility = useMemo(() => {
    if (view === "public") return "public";
    if (view === "hidden") return "hidden";
    return null;
  }, [view]);

  useEffect(() => {
    if (!visibility) return;
    const controller = new AbortController();
    const load = async () => {
      try {
        setIsLoading(true);
        const params = new URLSearchParams({ visibility });
        if (search.trim()) params.set("search", search.trim());
        const response = await fetch(`/api/maids?${params.toString()}`, { signal: controller.signal });
        const data = (await response.json()) as { error?: string; maids?: MaidProfile[] };
        if (!response.ok || !data.maids) throw new Error(data.error || "Failed to load maids");
        setMaids(data.maids);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          toast.error(error instanceof Error ? error.message : "Failed to load maids");
        }
      } finally {
        setIsLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [search, visibility]);

  useEffect(() => {
    setPage(1);
    setSelected(new Set());
  }, [search, view]);

  const totalPages = Math.max(1, Math.ceil(maids.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedMaids = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return maids.slice(start, start + PAGE_SIZE);
  }, [currentPage, maids]);

  useEffect(() => {
    if (page !== currentPage) setPage(currentPage);
  }, [currentPage, page]);

  const toggle = (ref: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(ref)) next.delete(ref);
      else next.add(ref);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === paginatedMaids.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(paginatedMaids.map((m) => m.referenceCode)));
    }
  };

  const removeLocal = (referenceCode: string) => {
    setMaids((prev) => prev.filter((m) => m.referenceCode !== referenceCode));
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(referenceCode);
      return next;
    });
  };

  const deleteMaid = async (referenceCode: string) => {
    const response = await fetch(`/api/maids/${encodeURIComponent(referenceCode)}`, { method: "DELETE" });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) throw new Error(data.error || "Failed to delete maid");
    removeLocal(referenceCode);
  };

  const toggleVisibility = async (maid: MaidProfile, isPublic: boolean) => {
    const response = await fetch(`/api/maids/${encodeURIComponent(maid.referenceCode)}/visibility`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublic }),
    });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) throw new Error(data.error || "Failed to update visibility");
    removeLocal(maid.referenceCode);
  };

  const openDeleteDialog = (target: "selected" | MaidProfile) => {
    setDeleteTarget(target);
    setDeleteDialogOpen(true);
  };

  const getDeleteLabel = () => {
    if (!deleteTarget) return "";
    if (deleteTarget === "selected") return `${selected.size} maid${selected.size !== 1 ? "s" : ""}`;
    return (deleteTarget as MaidProfile).fullName;
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteDialogOpen(false);
    try {
      if (deleteTarget === "selected") {
        for (const ref of selected) await deleteMaid(ref);
        toast.success(`${selected.size} maid${selected.size !== 1 ? "s" : ""} deleted`);
      } else {
        await deleteMaid((deleteTarget as MaidProfile).referenceCode);
        toast.success("Maid deleted");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete");
    }
  };

  const openVisibilityDialog = (target: VisibilityTarget) => {
    setPendingVisibilityTarget(target);
    setVisibilityDialogOpen(true);
  };

  const confirmVisibilityChange = async () => {
    if (!pendingVisibilityTarget) return;
    setVisibilityDialogOpen(false);
    try {
      if ("bulk" in pendingVisibilityTarget) {
        for (const maid of maids.filter((m) => selected.has(m.referenceCode))) {
          await toggleVisibility(maid, pendingVisibilityTarget.makePublic);
        }
        toast.success(
          pendingVisibilityTarget.makePublic ? "Selected maids made public" : "Selected maids hidden"
        );
      } else {
        await toggleVisibility(pendingVisibilityTarget.maid, pendingVisibilityTarget.makePublic);
        toast.success(pendingVisibilityTarget.makePublic ? "Maid published" : "Maid hidden");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update visibility");
    } finally {
      setPendingVisibilityTarget(null);
    }
  };

  const handleExportPdf = async () => {
    try {
      setIsExporting(true);
      const params = new URLSearchParams();
      if (visibility) params.set("visibility", visibility);
      if (search.trim()) params.set("search", search.trim());
      const response = await fetch(`/api/maids${params.toString() ? `?${params.toString()}` : ""}`);
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Failed to load maids for PDF export");
      }
      const data = (await response.json().catch(() => ({}))) as { error?: string; maids?: MaidProfile[] };
      if (!data.maids) throw new Error(data.error || "Failed to prepare PDF export");
      await exportMaidProfilesToPdf(data.maids);
      toast.success("PDF exported");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to export PDF");
    } finally {
      setIsExporting(false);
    }
  };

  const decodeBase64Utf8 = (value: string) => {
    const binary = atob(value);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  };

  const extractBase64Marker = (content: string, marker: string) => {
    const match = content.match(new RegExp(`<!--${marker}:([A-Za-z0-9+/=]+)-->`));
    return match?.[1] ?? null;
  };

  const CSV_FIELD_MAP: Record<string, string> = {
    name: "fullName", full_name: "fullName", maid_name: "fullName",
    maidname: "fullName", fullname: "fullName", age: "age",
    nationality: "nationality", country: "nationality",
    experience: "experience", years: "experience",
    years_of_experience: "experience", photo: "photoDataUrl",
    photo_url: "photoDataUrl", image: "photoDataUrl",
    image_url: "photoDataUrl", picture: "photoDataUrl",
  };

  const normalizeCsv = (csvText: string): string => {
    const lines = csvText.split(/\r?\n/);
    if (lines.length < 1) return csvText;
    const headerLine = lines[0];
    if (!headerLine) return csvText;
    const headers = headerLine.split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
    let changed = false;
    const normalizedHeaders = headers.map((h) => {
      const key = h.toLowerCase().replace(/[\s-]/g, "_");
      const mapped = CSV_FIELD_MAP[key];
      if (mapped && mapped !== h) { changed = true; return mapped; }
      return h;
    });
    if (!changed) return csvText;
    return [normalizedHeaders.join(","), ...lines.slice(1)].join("\n");
  };

  const reloadVisibleMaids = async (preferredVisibility?: "public" | "hidden") => {
    const reloadVisibility = preferredVisibility ?? visibility ?? "public";
    const params = new URLSearchParams({ visibility: reloadVisibility });
    if (search.trim()) params.set("search", search.trim());
    const reload = await fetch(`/api/maids?${params.toString()}`);
    const reloadData = (await reload.json().catch(() => ({}))) as { maids?: MaidProfile[] };
    if (reload.ok && reloadData.maids) {
      setMaids(reloadData.maids);
      if (view === "menu" && reloadData.maids.length > 0) {
        setView(reloadVisibility === "hidden" ? "hidden" : "public");
      }
    }
  };

  const importCsvText = async (
    csvText: string,
    options?: { skipReload?: boolean; suppressSuccessToast?: boolean }
  ) => {
    const normalizedCsv = normalizeCsv(csvText);
    try {
      setIsImporting(true);
      const response = await fetch("/api/maids/import.csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: normalizedCsv }),
      });
      const data = (await response.json()) as {
        error?: string; created?: number; updated?: number;
        failed?: number; errors?: string[];
      };
      if (!response.ok && response.status !== 207) throw new Error(data.error || "Failed to import CSV");
      const created = data.created ?? 0;
      const updated = data.updated ?? 0;
      const failed = data.failed ?? 0;
      if (!options?.suppressSuccessToast) {
        toast.success(`Import done: ${created} created, ${updated} updated${failed ? `, ${failed} failed` : ""}`);
      }
      if (failed && data.errors?.length) toast.error(data.errors.slice(0, 2).join(" | "));
      if (!options?.skipReload) {
        await reloadVisibleMaids();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to import CSV");
    } finally {
      setIsImporting(false);
    }
  };

  const importSingleMaidProfile = async (
    payload: MaidProfile,
    options?: { skipReload?: boolean; suppressSuccessToast?: boolean }
  ) => {
    const referenceCode = String(payload.referenceCode || "").trim();
    if (!referenceCode) throw new Error("referenceCode is required in the imported file");
    try {
      setIsImporting(true);
      // Optimistic POST — no probe round-trip needed. Fall back to PUT on 409 Conflict.
      let response = await fetch("/api/maids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      let existed = false;
      if (response.status === 409) {
        existed = true;
        response = await fetch(`/api/maids/${encodeURIComponent(referenceCode)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      const data = (await response.json().catch(() => ({}))) as { error?: string; maid?: MaidProfile };
      if (!response.ok || !data.maid) throw new Error(data.error || "Failed to import maid profile");
      if (!options?.suppressSuccessToast) {
        toast.success(existed ? "Maid profile updated" : "Maid profile created");
      }
      const importedVisibility = data.maid.isPublic ? "public" : "hidden";
      if (!options?.skipReload) {
        await reloadVisibleMaids(importedVisibility);
      }
    } finally {
      setIsImporting(false);
    }
  };

  const handleImportFile = async (
    file: File,
    options?: { skipReload?: boolean; suppressSuccessToast?: boolean }
  ) => {
    const name = file.name.toLowerCase();
    const ext = name.includes(".") ? name.split(".").pop() ?? "" : "";
    if (ext === "pdf") {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const rawPdf = Array.from(bytes, (value) => String.fromCharCode(value)).join("");
      const subjectHexMatch = rawPdf.match(/\/Subject\s*<([0-9A-Fa-f]+)>/);
      const subjectHex = subjectHexMatch ? decodePdfUtf16Hex(subjectHexMatch[1]) : "";
      const subjectStrMatch = rawPdf.match(/\/Subject\s*\(([^)]*)\)/);
      const subjectStr = subjectStrMatch ? subjectStrMatch[1] : "";
      const subject = subjectHex || subjectStr;
      if (subject.startsWith("MAIDS_CSV_BASE64:")) {
        await importCsvText(
          decodeBase64Utf8(subject.slice("MAIDS_CSV_BASE64:".length)),
          options
        );
        return;
      }
      if (subject.startsWith("MAID_PROFILE_JSON_BASE64:")) {
        await importSingleMaidProfile(
          JSON.parse(decodeBase64Utf8(subject.slice("MAID_PROFILE_JSON_BASE64:".length))) as MaidProfile,
          options
        );
        return;
      }
      const max = Math.min(bytes.length, 2 * 1024 * 1024);
      let printable = "";
      for (let i = 0; i < max && printable.length < 12000; i += 1) {
        const b = bytes[i];
        if (b === 0x0a || b === 0x0d || b === 0x09) printable += " ";
        else if (b >= 0x20 && b <= 0x7e) printable += String.fromCharCode(b);
        else printable += " ";
      }
      const text = printable.replace(/\s+/g, " ").trim();
      const extract = (patterns: RegExp[]) => {
        for (const re of patterns) {
          const m = text.match(re);
          if (m?.[1]?.trim()) return m[1].trim().slice(0, 120);
        }
        return "";
      };
      const guessedName = extract([
        /(?:maid\s*name|full\s*name|name\s*of\s*fdw|fdw\s*name|name)\s*[:-]?\s*([A-Za-z][A-Za-z\s'.–-]{1,60}?)(?=\s{2,}|\d|$)/i,
        /1\.\s*Name\s*[:-]?\s*([A-Za-z][A-Za-z\s'.–-]{1,60}?)(?=\s{2,}|\d|$)/i,
      ]);
      const guessedNationality = extract([
        /nationality\s*[:-]?\s*([A-Za-z][A-Za-z\s]{1,40}?)(?=\s{2,}|\d|$)/i,
      ]);
      const guessedRef = extract([
        /(?:reference\s*code|ref\.?\s*code|ref\.?\s*no\.?)\s*[:-]?\s*([A-Za-z0-9_-]{2,30})/i,
      ]);
      setManualImportFields({ name: guessedName, nationality: guessedNationality, referenceCode: guessedRef });
      setManualImportOpen(true);
      return;
    }
    if (ext === "docx") {
      const JSZip = await loadJsZip();
      const zip = await JSZip.loadAsync(await file.arrayBuffer());
      const docXml = await zip.file("word/document.xml")?.async("text");
      if (!docXml) throw new Error("DOCX does not contain importable data");
      const xml = new DOMParser().parseFromString(docXml, "application/xml");
      const text = Array.from(xml.getElementsByTagName("w:t"))
        .map((n) => n.textContent ?? "")
        .join(" ").replace(/\s+/g, " ").trim();
      const refMatch = text.match(/\breference\s*code\b\s*[:-]?\s*([a-z0-9_-]{2,})/i);
      const nameMatch = text.match(/\bfull\s*name\b\s*[:-]?\s*([a-z][^:]{1,80}?)(?=\s{2,}|$)/i);
      if (!refMatch?.[1] || !nameMatch?.[1]) throw new Error("DOCX is missing required fields: referenceCode, fullName");
      const escapeCsv = (value: string) => {
        const v = String(value ?? "");
        if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
        return v;
      };
      await importCsvText(
        `referenceCode,fullName\n${escapeCsv(refMatch[1])},${escapeCsv(nameMatch[1].trim())}`,
        options
      );
      return;
    }
    if (ext === "xlsx") {
      const XLSX = await loadXlsx();
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      if (isRichMaidWorkbook(workbook.SheetNames)) {
        const rowsBySheet = workbook.SheetNames.reduce<Record<string, unknown[][]>>((acc, sheetName) => {
          const sheet = workbook.Sheets[sheetName];
          acc[sheetName] = sheet
            ? (XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", blankrows: false }) as unknown[][])
            : [];
          return acc;
        }, {});
        await importSingleMaidProfile(buildImportedMaidProfile(rowsBySheet), options);
        return;
      }
      const sheetName = workbook.SheetNames[0];
      const sheet = sheetName ? workbook.Sheets[sheetName] : undefined;
      if (!sheet) throw new Error("XLSX does not contain importable data");
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false }) as unknown[][];
      const header = Array.isArray(rows[0]) ? rows[0] : [];
      const headerIndexes = new Map<string, number>();
      header.forEach((h, idx) => headerIndexes.set(String(h ?? "").trim().toLowerCase(), idx));
      if (!headerIndexes.has("referencecode") || !headerIndexes.has("fullname")) {
        throw new Error("XLSX is missing required columns: referenceCode, fullName");
      }
      const csvText = XLSX.utils.sheet_to_csv(sheet);
      await importCsvText(csvText, options);
      return;
    }
    if (ext === "csv") { await importCsvText(await file.text(), options); return; }
    if (ext === "xls" || ext === "doc") {
      const content = await file.text();
      const maidsCsvBase64 = extractBase64Marker(content, "MAIDS_CSV_BASE64");
      if (maidsCsvBase64) { await importCsvText(decodeBase64Utf8(maidsCsvBase64), options); return; }
      const maidProfileBase64 = extractBase64Marker(content, "MAID_PROFILE_JSON_BASE64");
      if (maidProfileBase64) { await importSingleMaidProfile(JSON.parse(decodeBase64Utf8(maidProfileBase64)) as MaidProfile, options); return; }
      throw new Error('This file is missing import data. Please import files exported from "Export Maids" or from a maid bio-data export.');
    }
    throw new Error("Unsupported file type. Supported: .csv, .xls, .xlsx, .doc, .docx, .pdf");
  };

  const requestExport = () => { if (!isExporting) setConfirmExportOpen(true); };
  const confirmExportPdf = () => { setConfirmExportOpen(false); void handleExportPdf(); };
  const requestImportFiles = async (files?: FileList | File[]) => {
    if (!files || isImporting) return;
    const all = Array.from(files);
    if (all.length > 50) toast.error("Max 50 files per upload");
    const list = all.slice(0, 50);
    if (list.length === 0) return;
    // Scan all files in parallel instead of sequentially
    const scanResults = await Promise.all(list.map((file) => scanUploadedFile(file)));
    const approved: File[] = [];
    scanResults.forEach((scan, i) => {
      if (!scan.success) { toast.error(`${list[i]!.name}: ${scan.message}`); }
      else { approved.push(list[i]!); }
    });
    if (approved.length === 0) return;
    setPendingImportFiles(approved);
    setConfirmImportOpen(true);
  };

  const PARALLEL_BATCH_SIZE = 5;

  const confirmImportFiles = async () => {
    const files = pendingImportFiles;
    setConfirmImportOpen(false);
    setPendingImportFiles([]);
    if (files.length === 0) return;
    cancelImportRef.current = false;
    setImportBatchProgress({
      active: true,
      total: files.length,
      currentIndex: 0,
      currentFileName: "",
      completed: 0,
      failed: 0,
      stage: "Preparing files",
      cancelled: false,
    });
    let completed = 0;
    let failed = 0;
    for (let batchStart = 0; batchStart < files.length; batchStart += PARALLEL_BATCH_SIZE) {
      if (cancelImportRef.current) break;
      const batch = files.slice(batchStart, batchStart + PARALLEL_BATCH_SIZE);
      const batchNum = Math.floor(batchStart / PARALLEL_BATCH_SIZE) + 1;
      setImportBatchProgress((prev) => ({
        ...prev,
        currentIndex: batchStart + batch.length,
        currentFileName: batch.map((f) => f.name).join(", "),
        stage: `Uploading batch ${batchNum} of ${Math.ceil(files.length / PARALLEL_BATCH_SIZE)}`,
      }));
      await waitForPaint();
      const results = await Promise.allSettled(
        batch.map((file) =>
          handleImportFile(file, { skipReload: true, suppressSuccessToast: true })
        )
      );
      results.forEach((result, i) => {
        if (result.status === "fulfilled") {
          completed += 1;
        } else {
          failed += 1;
          const file = batch[i];
          toast.error(
            result.reason instanceof Error
              ? `${file?.name}: ${result.reason.message}`
              : `${file?.name}: Failed to import`
          );
        }
      });
      setImportBatchProgress((prev) => ({
        ...prev,
        completed,
        failed,
        stage: failed > 0 ? "Continuing with remaining files" : "Saving imported data",
      }));
    }
    const wasCancelled = cancelImportRef.current;
    await reloadVisibleMaids("public");
    setImportBatchProgress((prev) => ({
      ...prev,
      active: false,
      currentIndex: prev.total,
      completed,
      failed,
      cancelled: wasCancelled,
      stage: wasCancelled ? "Upload cancelled" : failed ? "Completed with some failed files" : "Completed successfully",
    }));
    if (wasCancelled) {
      toast.error(`Upload cancelled — ${completed} file${completed !== 1 ? "s" : ""} imported before cancel`);
    } else {
      toast.success(`Bulk upload finished: ${completed} uploaded${failed ? `, ${failed} failed` : ""}`);
    }
  };

  const confirmManualImport = async () => {
    const { name, nationality, referenceCode } = manualImportFields;
    if (!name.trim()) { toast.error("Name is required"); return; }
    setManualImportOpen(false);
    const ref = referenceCode.trim() || `EXT-${Date.now()}`;
    const escapeCsv = (v: string) => { const s = String(v ?? ""); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    await importCsvText(`referenceCode,fullName,nationality\n${escapeCsv(ref)},${escapeCsv(name.trim())},${escapeCsv(nationality.trim())}`);
  };

  // ── Shared dialogs (yellow/green accented) ────────────────────────────────
  const hasActiveUploadFile =
    importBatchProgress.active &&
    importBatchProgress.currentIndex > importBatchProgress.completed + importBatchProgress.failed;
  const uploadProgressUnits =
    importBatchProgress.completed + importBatchProgress.failed + (hasActiveUploadFile ? 0.35 : 0);
  const uploadProgressPercent =
    importBatchProgress.total > 0
      ? Math.min(100, Math.round((uploadProgressUnits / importBatchProgress.total) * 100))
      : 0;

  const sharedDialogs = (
    <>
      {/* Export */}
      <Dialog open={confirmExportOpen} onOpenChange={setConfirmExportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export maids PDF?</DialogTitle>
            <DialogDescription>
              Download a PDF summary of your maid records.
              The PDF also carries import data so it can be uploaded back into the maids manager later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmExportOpen(false)} disabled={isExporting}>Cancel</Button>
            <Button
              onClick={confirmExportPdf}
              disabled={isExporting}
              style={{ background: "var(--ym-green-400)", color: "#fff", borderColor: "var(--ym-green-600)" }}
            >
              {isExporting ? "Exporting..." : "Download PDF"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import */}
      <Dialog open={confirmImportOpen} onOpenChange={(open) => { setConfirmImportOpen(open); if (!open) setPendingImportFiles([]); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload maid file?</DialogTitle>
            <DialogDescription>
              Recommended: upload a <strong>.pdf</strong> exported from this system.<br />
              Legacy <strong>.csv</strong>, <strong>.xls</strong>, <strong>.xlsx</strong>, <strong>.doc</strong>, and <strong>.docx</strong> files are still accepted.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            <span className="font-semibold">Selected file{pendingImportFiles.length === 1 ? "" : "s"}:</span>{" "}
            {pendingImportFiles.length ? pendingImportFiles.map((f) => f.name).join(", ") : "None"}
          </div>
          <p className="text-xs text-muted-foreground">
            Bulk upload supports up to 50 files at once. CSV and Excel files are recommended for larger batch imports.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmImportOpen(false)} disabled={isImporting}>Cancel</Button>
            <Button
              onClick={() => void confirmImportFiles()}
              disabled={isImporting || pendingImportFiles.length === 0}
              style={{ background: "var(--ym-green-400)", color: "#fff", borderColor: "var(--ym-green-600)" }}
            >
              {isImporting ? "Uploading..." : "Upload File"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <DialogTitle className="text-destructive">Confirm Deletion</DialogTitle>
                <DialogDescription className="mt-0.5">
                  This action <strong>cannot be undone</strong>.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            You are about to permanently delete <strong>{getDeleteLabel()}</strong>. All associated data will be removed.
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => void confirmDelete()}>
              <Trash2 className="mr-2 h-4 w-4" />
              Yes, Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Visibility */}
      <Dialog
        open={visibilityDialogOpen}
        onOpenChange={(open) => {
          setVisibilityDialogOpen(open);
          if (!open) setPendingVisibilityTarget(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                style={{
                  background: pendingVisibilityTarget?.makePublic
                    ? "var(--ym-green-50)"
                    : "var(--ym-amber-50)",
                }}
              >
                {pendingVisibilityTarget?.makePublic
                  ? <Eye className="h-5 w-5" style={{ color: "var(--ym-green-600)" }} />
                  : <EyeOff className="h-5 w-5" style={{ color: "var(--ym-amber-600)" }} />}
              </div>
              <div>
                <DialogTitle>
                  {pendingVisibilityTarget?.makePublic ? "Publish maid?" : "Hide maid?"}
                </DialogTitle>
                <DialogDescription className="mt-0.5">This can be reversed at any time.</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div
            className="rounded-lg px-4 py-3 text-sm"
            style={{
              background: pendingVisibilityTarget?.makePublic ? "var(--ym-green-50)" : "var(--ym-amber-50)",
              border: `1px solid ${pendingVisibilityTarget?.makePublic ? "color-mix(in srgb, var(--ym-green-200) 50%, transparent)" : "color-mix(in srgb, var(--ym-amber-100) 60%, transparent)"}`,
              color: pendingVisibilityTarget?.makePublic ? "var(--ym-green-800)" : "var(--ym-amber-800)",
            }}
          >
            {pendingVisibilityTarget && "bulk" in pendingVisibilityTarget ? (
              <>
                <strong>{selected.size} maid{selected.size !== 1 ? "s" : ""}</strong> will be{" "}
                <strong>
                  {pendingVisibilityTarget.makePublic ? "made visible to the public" : "hidden from public view"}
                </strong>.
              </>
            ) : (
              <>
                <strong>{(pendingVisibilityTarget as { maid: MaidProfile } | null)?.maid?.fullName}</strong> will be{" "}
                <strong>
                  {pendingVisibilityTarget?.makePublic ? "visible to the public" : "hidden from public view"}
                </strong>.
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setVisibilityDialogOpen(false); setPendingVisibilityTarget(null); }}>
              Cancel
            </Button>
            <Button
              onClick={() => void confirmVisibilityChange()}
              style={
                pendingVisibilityTarget?.makePublic
                  ? { background: "var(--ym-green-400)", color: "#fff", borderColor: "var(--ym-green-600)" }
                  : { background: "var(--ym-amber-200)", color: "var(--ym-amber-800)", borderColor: "var(--ym-amber-400)" }
              }
            >
              {pendingVisibilityTarget?.makePublic
                ? <><Eye className="mr-2 h-4 w-4" /> Publish</>
                : <><EyeOff className="mr-2 h-4 w-4" /> Hide</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual PDF import */}
      <Dialog open={manualImportOpen} onOpenChange={(open) => { if (!open) setManualImportOpen(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Import External PDF</DialogTitle>
            <DialogDescription className="text-sm">
              This PDF wasn't exported from this system. Review the extracted fields below, fill in anything missing, then click Import.
            </DialogDescription>
          </DialogHeader>
          <div
            className="rounded-md px-3 py-2 text-xs flex items-start gap-2"
            style={{
              background: "var(--ym-amber-50)",
              border: "1px solid color-mix(in srgb, var(--ym-amber-100) 70%, transparent)",
              color: "var(--ym-amber-800)",
            }}
          >
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>Photos cannot be extracted from external PDFs. After importing, open the maid profile and use <strong>Manage Photos</strong> to upload them manually.</span>
          </div>
          <div className="space-y-3 py-1">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Full Name <span className="text-destructive">*</span></label>
              <Input value={manualImportFields.name} onChange={(e) => setManualImportFields((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Maria Santos" className="text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nationality</label>
              <Input value={manualImportFields.nationality} onChange={(e) => setManualImportFields((p) => ({ ...p, nationality: e.target.value }))} placeholder="e.g. Filipino" className="text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Reference Code</label>
              <Input value={manualImportFields.referenceCode} onChange={(e) => setManualImportFields((p) => ({ ...p, referenceCode: e.target.value }))} placeholder="Leave blank to auto-generate" className="text-sm font-mono" />
              <p className="text-[10px] text-muted-foreground">If blank, a temporary code will be assigned — you can edit it later.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManualImportOpen(false)} disabled={isImporting}>Cancel</Button>
            <Button
              onClick={() => void confirmManualImport()}
              disabled={isImporting || !manualImportFields.name.trim()}
              style={{ background: "var(--ym-green-400)", color: "#fff", borderColor: "var(--ym-green-600)" }}
            >
              {isImporting ? "Importing…" : "Import"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );

  // ── MENU VIEW ─────────────────────────────────────────────────────────────
  if (view === "menu") {
    return (
      <div className="page-container">
        <style>{menuStyles}</style>
        <div className="content-card animate-fade-in-up space-y-6">

          {/* Quick-search */}
          <div ref={menuSearchRef} className="relative">
            <div
              className={`search-glow flex items-center gap-2 rounded-xl border bg-background px-3 py-1 shadow-sm transition-all ${menuSearchOpen ? "" : ""}`}
              style={menuSearchOpen ? { borderColor: "color-mix(in srgb, var(--ym-green-200) 80%, transparent)" } : {}}
            >
              <Search
                className={`h-4 w-4 shrink-0 transition-colors ${menuSearchLoading ? "animate-pulse" : "text-muted-foreground"}`}
                style={menuSearchLoading ? { color: "var(--ym-green-400)" } : {}}
              />
              <input
                type="text"
                placeholder="Quick-search any maid by name or reference code…"
                value={menuSearch}
                autoComplete="off"
                spellCheck={false}
                className="flex-1 bg-transparent py-1.5 text-sm outline-none placeholder:text-muted-foreground/60"
                onChange={(e) => setMenuSearch(e.target.value)}
                onFocus={() => { if (menuSearchResults.length > 0) setMenuSearchOpen(true); }}
                onKeyDown={(e) => {
                  if (!menuSearchOpen || menuSearchResults.length === 0) return;
                  if (e.key === "ArrowDown") { e.preventDefault(); setMenuActiveIndex((i) => Math.min(i + 1, menuSearchResults.length - 1)); }
                  else if (e.key === "ArrowUp") { e.preventDefault(); setMenuActiveIndex((i) => Math.max(i - 1, 0)); }
                  else if (e.key === "Enter" && menuActiveIndex >= 0) {
                    const m = menuSearchResults[menuActiveIndex];
                    if (m) navigate(adminPath(`/maid/${encodeURIComponent(m.referenceCode)}`), { state: { fromView: (m as MaidProfile & { _vis?: string })._vis ?? "public" } });
                  }
                  else if (e.key === "Escape") setMenuSearchOpen(false);
                }}
              />
              {menuSearch && (
                <button
                  type="button"
                  onClick={() => { setMenuSearch(""); setMenuSearchOpen(false); setMenuSearchResults([]); }}
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-muted/80 transition-colors text-[10px]"
                >✕</button>
              )}
            </div>

            {menuSearchOpen && menuSearchResults.length > 0 && (
              <div className="search-dropdown">
                {menuSearchResults.map((maid, idx) => {
                  const photo = Array.isArray(maid.photoDataUrls) && maid.photoDataUrls.length > 0
                    ? maid.photoDataUrls[0] : maid.photoDataUrl;
                  const age = calculateAge(maid.dateOfBirth);
                  const vis = (maid as MaidProfile & { _vis?: string })._vis;
                  const flagCode = getNationalityCode(maid.nationality);
                  return (
                    <div
                      key={maid.referenceCode}
                      className={`search-result-item ${idx === menuActiveIndex ? "active" : ""}`}
                      onMouseEnter={() => setMenuActiveIndex(idx)}
                      onClick={() => {
                        navigate(adminPath(`/maid/${encodeURIComponent(maid.referenceCode)}`), { state: { fromView: vis ?? "public" } });
                        setMenuSearchOpen(false);
                      }}
                    >
                      {photo ? (
                        <img src={photo} alt={maid.fullName} className="search-result-avatar" />
                      ) : (
                        <div className="search-result-avatar-placeholder">
                          {maid.fullName.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground leading-tight">
                          {highlightMatch(maid.fullName, menuSearch)}
                        </p>
                        <p className="truncate text-[11px] text-foreground/55 mt-0.5 flex items-center">
                          <span className="font-semibold">{highlightMatch(String(maid.referenceCode), menuSearch)}</span>
                          {maid.nationality ? (<><span className="mx-1">·</span><FlagCircle code={flagCode} />{maid.nationality}</>) : ""}
                          {age !== null ? ` · ${age} yrs` : ""}
                        </p>
                      </div>
                      <span className={vis === "public" ? "search-badge-public" : "search-badge-hidden"}>
                        {vis === "public" ? "Public" : "Hidden"}
                      </span>
                    </div>
                  );
                })}
                <div className="px-3 py-2 text-[11px] text-foreground/40 text-center">
                  {menuSearchResults.length === 8 ? "Showing top 8 results — refine your search" : `${menuSearchResults.length} result${menuSearchResults.length !== 1 ? "s" : ""} found`}
                </div>
              </div>
            )}

            {menuSearchOpen && !menuSearchLoading && menuSearchResults.length === 0 && menuSearch.trim() && (
              <div className="search-dropdown px-4 py-5 text-center">
                <p className="text-sm font-medium text-foreground/70">No maids found</p>
                <p className="text-xs text-foreground/40 mt-1">Try a different name or reference code</p>
              </div>
            )}
          </div>

          <hr className="border-border" />

          {/* Category cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

            {/* Public Card — green */}
            <button onClick={() => setView("public")} className="card-public group relative flex flex-col items-center gap-4 overflow-hidden rounded-2xl p-8 text-center">
              <div className="pointer-events-none absolute -top-6 -right-6 h-28 w-28 rounded-full blur-2xl" style={{ background: "color-mix(in srgb, var(--ym-green-200) 20%, transparent)" }} />
              <div className="pointer-events-none absolute -bottom-4 -left-4 h-20 w-20 rounded-full blur-xl" style={{ background: "color-mix(in srgb, var(--ym-green-100) 18%, transparent)" }} />

              <div className="icon-3d-public">
                <div className="icon-shine" />
                <Eye className="h-8 w-8 text-white" style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.25))" }} />
              </div>

              <div className="space-y-1.5">
                <div className="mb-2">
                  <span className="badge-live">
                    <span className="badge-live-dot" />
                    Live
                  </span>
                </div>
                <p className="text-lg font-bold tracking-tight" style={{ color: "var(--ym-green-700, var(--ym-green-600))" }}>Maids in Public</p>
                <p className="text-sm text-foreground/60 leading-relaxed">
                  View, edit or remove<br />publicly visible maids
                </p>
              </div>

              <div className="flex items-center gap-1.5 text-xs font-semibold transition-colors" style={{ color: "var(--ym-green-600)" }}>
                <span>Open list</span>
                <svg className="h-3.5 w-3.5 card-arrow" fill="none" viewBox="0 0 16 16">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </button>

            {/* Hidden Card — amber/yellow */}
            <button onClick={() => setView("hidden")} className="card-hidden group relative flex flex-col items-center gap-4 overflow-hidden rounded-2xl p-8 text-center">
              <div className="pointer-events-none absolute -top-6 -right-6 h-28 w-28 rounded-full blur-2xl" style={{ background: "color-mix(in srgb, var(--ym-amber-200) 18%, transparent)" }} />
              <div className="pointer-events-none absolute -bottom-4 -left-4 h-20 w-20 rounded-full blur-xl" style={{ background: "color-mix(in srgb, var(--ym-amber-100) 16%, transparent)" }} />

              <div className="icon-3d-hidden">
                <div className="icon-shine" />
                <EyeOff className="h-8 w-8 text-white" style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.22))" }} />
              </div>

              <div className="space-y-1.5">
                <div className="mb-2">
                  <span className="badge-draft">
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--ym-amber-400)", display: "inline-block", flexShrink: 0 }} />
                    Draft
                  </span>
                </div>
                <p className="text-lg font-bold tracking-tight text-foreground">Maids Hidden</p>
                <p className="text-sm text-foreground/60 leading-relaxed">
                  Manage drafts &amp; maids<br />hidden from public view
                </p>
              </div>

              <div className="flex items-center gap-1.5 text-xs font-semibold transition-colors" style={{ color: "var(--ym-amber-600)" }}>
                <span>Open list</span>
                <svg className="h-3.5 w-3.5 card-arrow" fill="none" viewBox="0 0 16 16">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </button>
          </div>

          <p
            className="rounded-md px-3 py-2 text-center text-xs"
            style={{
              background: "var(--ym-amber-50)",
              border: "1px solid color-mix(in srgb, var(--ym-amber-100) 70%, transparent)",
              color: "var(--ym-amber-700, var(--ym-amber-600))",
            }}
          >
            Maids without photos will not be displayed publicly. Add photos first, then make them searchable.
          </p>
        </div>

        {sharedDialogs}
      </div>
    );
  }

  // ── LIST VIEW ─────────────────────────────────────────────────────────────
  const allPageSelected = paginatedMaids.length > 0 && paginatedMaids.every((m) => selected.has(m.referenceCode));

  return (
    <div className="page-container" style={{ maxWidth: "100%", width: "100%", paddingLeft: "1.25rem", paddingRight: "1.25rem" }}>
      <style>{menuStyles}</style>

      {/* List header bar */}
      <div className="mb-4 flex items-center justify-between gap-4">
        <button
          onClick={handleBack}
          className="back-btn group inline-flex items-center gap-1.5 rounded-md px-1 py-1 text-sm font-medium focus:outline-none focus:ring-2"
          style={{ color: "var(--ym-green-600)", "--tw-ring-color": "color-mix(in srgb, var(--ym-green-400) 30%, transparent)" } as React.CSSProperties}
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          <span className="relative">
            Back
            <span className="back-btn-line absolute left-0 -bottom-0.5 h-px w-0 transition-all group-hover:w-full" />
          </span>
        </button>

        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${view === "public" ? "chip-public" : "chip-hidden"}`}
          >
            {view === "public" ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            {view === "public" ? "Public Maids" : "Hidden Maids"}
          </span>
          {!isLoading && (
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-foreground/65">
              {maids.length} total
            </span>
          )}
        </div>
      </div>

      <div className="content-card animate-fade-in-up space-y-4" style={{ maxWidth: "100%", width: "100%" }}>

        {/* Toolbar */}
        <div className="flex flex-wrap gap-2">
          <div className="search-glow flex flex-1 min-w-48 items-center gap-2 rounded-lg border bg-background px-3 shadow-sm transition-all">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Input
              placeholder="Search by name or reference code…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-0 shadow-none focus-visible:ring-0 px-0"
              autoComplete="off"
              spellCheck={false}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="ml-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-muted/80 transition-colors text-xs"
                aria-label="Clear search"
              >✕</button>
            )}
          </div>
          {view === "public" && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => importInputRef.current?.click()}
                disabled={isImporting || importBatchProgress.active}
                className="h-10 border-[color:var(--ym-green-200)] text-[color:var(--ym-green-700)] hover:bg-[color:var(--ym-green-50)]"
              >
                <Upload className="mr-2 h-4 w-4" />
                {importBatchProgress.active ? "Uploading..." : "Bulk Upload CSV/Excel"}
              </Button>
              <input
                ref={importInputRef}
                type="file"
                multiple
                accept=".csv,.xls,.xlsx,.pdf,.doc,.docx"
                className="hidden"
                onChange={(event) => {
                  void requestImportFiles(event.target.files ?? undefined);
                  event.target.value = "";
                }}
              />
            </>
          )}
        </div>

        {(importBatchProgress.active || importBatchProgress.completed > 0 || importBatchProgress.failed > 0) && (
          <div
            className="rounded-xl border overflow-hidden"
            style={{
              background: importBatchProgress.cancelled
                ? "var(--ym-amber-50)"
                : importBatchProgress.failed > 0 && !importBatchProgress.active
                  ? "color-mix(in srgb, #fef2f2 85%, var(--ym-green-50))"
                  : "var(--ym-green-50)",
              borderColor: importBatchProgress.cancelled
                ? "color-mix(in srgb, var(--ym-amber-200) 70%, transparent)"
                : importBatchProgress.failed > 0 && !importBatchProgress.active
                  ? "color-mix(in srgb, #fecaca 60%, transparent)"
                  : "color-mix(in srgb, var(--ym-green-200) 65%, transparent)",
            }}
          >
            {/* Header row */}
            <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-2">
              <div className="flex items-center gap-2 min-w-0">
                {importBatchProgress.active ? (
                  <Loader2
                    className="h-4 w-4 shrink-0 animate-spin"
                    style={{ color: "var(--ym-green-600)" }}
                  />
                ) : importBatchProgress.cancelled ? (
                  <svg className="h-4 w-4 shrink-0" viewBox="0 0 16 16" fill="none" style={{ color: "var(--ym-amber-600)" }}>
                    <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M5 5l6 6M11 5l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                ) : importBatchProgress.failed > 0 ? (
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                ) : (
                  <svg className="h-4 w-4 shrink-0" viewBox="0 0 16 16" fill="none" style={{ color: "var(--ym-green-600)" }}>
                    <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M5 8l2.5 2.5L11 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
                <p
                  className="text-sm font-bold truncate"
                  style={{
                    color: importBatchProgress.cancelled
                      ? "var(--ym-amber-800)"
                      : "var(--ym-green-800)",
                  }}
                >
                  {importBatchProgress.active
                    ? "Bulk upload in progress…"
                    : importBatchProgress.cancelled
                      ? "Upload cancelled"
                      : importBatchProgress.failed > 0
                        ? "Completed with errors"
                        : "Upload complete"}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Stats chips */}
                {importBatchProgress.completed > 0 && (
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold"
                    style={{ background: "var(--ym-green-100)", color: "var(--ym-green-700)" }}
                  >
                    <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {importBatchProgress.completed}
                  </span>
                )}
                {importBatchProgress.failed > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-600">
                    <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                      <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                    {importBatchProgress.failed}
                  </span>
                )}
                <span
                  className="text-xs font-bold tabular-nums"
                  style={{ color: "var(--ym-green-700)" }}
                >
                  {uploadProgressPercent}%
                </span>

                {/* Cancel button — only while active */}
                {importBatchProgress.active && (
                  <button
                    type="button"
                    onClick={() => { cancelImportRef.current = true; }}
                    className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors"
                    style={{
                      background: "#fff",
                      borderColor: "color-mix(in srgb, var(--ym-amber-200) 80%, transparent)",
                      color: "var(--ym-amber-700)",
                    }}
                    title="Stop after the current batch finishes"
                  >
                    <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                      <rect x="2.5" y="2.5" width="7" height="7" rx="1" fill="currentColor" />
                    </svg>
                    Cancel
                  </button>
                )}

                {/* Dismiss button — only when done */}
                {!importBatchProgress.active && (
                  <button
                    type="button"
                    onClick={() =>
                      setImportBatchProgress({
                        active: false, total: 0, currentIndex: 0,
                        currentFileName: "", completed: 0, failed: 0,
                        stage: "", cancelled: false,
                      })
                    }
                    className="flex h-5 w-5 items-center justify-center rounded-full bg-black/8 text-foreground/40 hover:bg-black/14 transition-colors text-[10px]"
                    aria-label="Dismiss"
                  >✕</button>
                )}
              </div>
            </div>

            {/* Stage + current file */}
            <div className="px-4 pb-2 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              {importBatchProgress.stage && (
                <span
                  className="text-xs"
                  style={{
                    color: importBatchProgress.cancelled
                      ? "var(--ym-amber-700)"
                      : "var(--ym-green-700)",
                    opacity: 0.85,
                  }}
                >
                  {importBatchProgress.stage}
                </span>
              )}
              {importBatchProgress.active && importBatchProgress.currentFileName && (
                <span
                  className="inline-block max-w-[280px] truncate rounded-md px-2 py-0.5 text-[11px] font-medium"
                  style={{
                    background: "color-mix(in srgb, var(--ym-green-200) 30%, white)",
                    color: "var(--ym-green-800)",
                  }}
                  title={importBatchProgress.currentFileName}
                >
                  {importBatchProgress.currentFileName}
                </span>
              )}
              {importBatchProgress.total > 0 && (
                <span className="ml-auto text-[11px] font-semibold" style={{ color: "var(--ym-green-700)", opacity: 0.7 }}>
                  {Math.max(importBatchProgress.currentIndex, importBatchProgress.completed + importBatchProgress.failed)} / {importBatchProgress.total} files
                </span>
              )}
            </div>

            {/* Progress bar */}
            <div className="mx-4 mb-3 h-2 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.7)" }}>
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${uploadProgressPercent}%`,
                  background: importBatchProgress.cancelled
                    ? "var(--ym-amber-400)"
                    : importBatchProgress.failed > 0 && !importBatchProgress.active
                      ? "linear-gradient(90deg, var(--ym-green-400) 0%, #f87171 100%)"
                      : "linear-gradient(90deg, var(--ym-green-400) 0%, var(--ym-green-200) 100%)",
                  boxShadow: importBatchProgress.active
                    ? "0 0 8px color-mix(in srgb, var(--ym-green-400) 50%, transparent)"
                    : "none",
                }}
              />
            </div>
          </div>
        )}

        {/* Bulk actions bar */}
        {maids.length > 0 && (
          <div className="bulk-bar flex flex-wrap items-center justify-between gap-3 px-4 py-2.5">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium select-none">
              <button type="button" onClick={toggleAll} style={{ color: "var(--ym-green-600)" }}>
                {allPageSelected
                  ? <CheckSquare className="h-4 w-4" />
                  : <Square className="h-4 w-4 text-muted-foreground" />}
              </button>
              {selected.size > 0
                ? <span className="text-foreground/80 font-semibold">{selected.size} selected</span>
                : <span className="text-foreground/50">Select all on page</span>}
            </label>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={selected.size === 0}
                onClick={() => openVisibilityDialog({ bulk: true, makePublic: view !== "public" })}
                className="h-8 text-xs"
                style={selected.size > 0 ? {
                  borderColor: "color-mix(in srgb, var(--ym-green-200) 60%, transparent)",
                  color: "var(--ym-green-700, var(--ym-green-600))",
                } : {}}
              >
                <EyeOff className="mr-1.5 h-3.5 w-3.5" />
                {view === "public" ? "Hide Selected" : "Publish Selected"}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={selected.size === 0}
                onClick={() => openDeleteDialog("selected")}
                className="h-8 text-xs"
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Delete Selected ({selected.size})
              </Button>
            </div>
          </div>
        )}

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
            {Array.from({ length: PAGE_SIZE }).map((_, i) => (
              <div key={i} className="animate-pulse border bg-muted/40 overflow-hidden">
                <div className="aspect-[3/4] bg-muted min-h-[130px]" />
                <div className="space-y-2 p-3">
                  <div className="h-3.5 w-3/4 rounded bg-muted" />
                  <div className="h-3 w-1/2 rounded bg-muted" />
                  <div className="h-3 w-2/3 rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : maids.length === 0 ? (
          <div className="border border-dashed rounded-xl py-16 text-center">
            <EyeOff className="mx-auto mb-3 h-8 w-8 text-foreground/25" />
            <p className="text-sm font-semibold text-foreground/60">No maid records found.</p>
            <p className="mt-1 text-xs text-foreground/40">Try a different search or adjust filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
            {paginatedMaids.map((maid, i) => {
              const age = calculateAge(maid.dateOfBirth);
              const photoPreview =
                Array.isArray(maid.photoDataUrls) && maid.photoDataUrls.length > 0
                  ? maid.photoDataUrls[0] : maid.photoDataUrl;
              const isSelected = selected.has(maid.referenceCode);
              const flagCode = getNationalityCode(maid.nationality);

              return (
                <div
                  key={maid.referenceCode}
                  className={`maid-card group relative flex flex-col ${isSelected ? "selected" : ""}`}
                  style={{
                    animation: "fade-in-up 0.4s cubic-bezier(0.16,1,0.3,1) forwards",
                    animationDelay: `${i * 0.04}s`,
                    opacity: 0,
                  }}
                >
                  {/* Photo area */}
                  <div
                    className="relative w-full cursor-pointer"
                    onClick={() => navigate(adminPath(`/maid/${encodeURIComponent(maid.referenceCode)}`), { state: { fromView: view } })}
                  >
                    {photoPreview ? (
                      <img src={photoPreview} alt={maid.fullName} className="maid-card-photo" />
                    ) : (
                      <div className="maid-card-no-photo">No Photo</div>
                    )}

                    {/* Checkbox */}
                    <div className="absolute left-2 top-2" onClick={(e) => { e.stopPropagation(); toggle(maid.referenceCode); }}>
                      <div
                        className="flex h-5 w-5 items-center justify-center rounded border-2 transition-colors cursor-pointer"
                        style={isSelected ? {
                          borderColor: "var(--ym-green-400)",
                          background: "var(--ym-green-400)",
                          color: "#fff",
                        } : {
                          borderColor: "rgba(255,255,255,0.75)",
                          background: "rgba(0,0,0,0.25)",
                          backdropFilter: "blur(4px)",
                        }}
                      >
                        {isSelected && <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                      </div>
                    </div>

                    {/* Delete button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); openDeleteDialog(maid); }}
                      className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded border border-white/20 bg-black/40 text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 hover:bg-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>

                  {/* Card body */}
                  <div className="maid-card-body flex-1">
                    <p
                      className="maid-card-name"
                      onClick={() => navigate(adminPath(`/maid/${encodeURIComponent(maid.referenceCode)}`), { state: { fromView: view } })}
                    >
                      {maid.fullName}
                    </p>
                    <div className="maid-card-meta">
                      <p>{maid.maritalStatus}{age !== null ? ` · ${age} yrs` : ""}</p>
                      <p className="flex items-center flex-wrap gap-x-0.5">
                        <FlagCircle code={flagCode} />
                        {maid.nationality}
                      </p>
                      <p>{maid.type}</p>
                    </div>
                    <div>
                      <p className="maid-card-ref">Ref: {maid.referenceCode}</p>
                      <p className="maid-card-date">Upd: {formatDate(maid.updatedAt)}</p>
                    </div>
                    <button
                      className={`maid-card-vis-btn ${view === "public" ? "public" : "hidden-btn"}`}
                      onClick={() => openVisibilityDialog({ maid, makePublic: view !== "public" })}
                    >
                      {view === "public"
                        ? <><Eye className="h-3 w-3" /> Public — Hide</>
                        : <><EyeOff className="h-3 w-3" /> Hidden — Publish</>}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {maids.length > PAGE_SIZE && (
          <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2">
            <button
              className="h-9 rounded-lg border px-3 text-sm font-medium text-foreground/70 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-muted transition-colors"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setPage(i + 1)}
                className="h-9 min-w-[2.25rem] rounded-lg border px-3 text-sm font-medium transition-colors"
                style={i + 1 === currentPage ? {
                  background: "var(--ym-green-400)",
                  color: "#fff",
                  borderColor: "var(--ym-green-600)",
                  fontWeight: 700,
                } : { color: "hsl(var(--foreground)/0.7)" }}
              >
                {i + 1}
              </button>
            ))}
            <button
              className="h-9 rounded-lg border px-3 text-sm font-medium text-foreground/70 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-muted transition-colors"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {sharedDialogs}

      <SendMaidToClientDialog
        maid={maidToSendThroughAgency}
        open={Boolean(maidToSendThroughAgency)}
        onOpenChange={(open) => { if (!open) setMaidToSendThroughAgency(null); }}
        actionType="interested"
        onSuccess={(updatedMaid) => {
          setMaids((prev) => prev.map((m) => m.referenceCode === updatedMaid.referenceCode ? updatedMaid : m));
          setMaidToSendThroughAgency(null);
        }}
      />
      <SendMaidToClientDialog
        maid={maidToDirectHire}
        open={Boolean(maidToDirectHire)}
        onOpenChange={(open) => { if (!open) setMaidToDirectHire(null); }}
        actionType="direct_hire"
        onSuccess={(updatedMaid) => {
          setMaids((prev) => prev.map((m) => m.referenceCode === updatedMaid.referenceCode ? updatedMaid : m));
          setMaidToDirectHire(null);
        }}
      />
      <SendMaidToClientDialog
        maid={maidToReject}
        open={Boolean(maidToReject)}
        onOpenChange={(open) => { if (!open) setMaidToReject(null); }}
        actionType="rejected"
        onSuccess={(updatedMaid) => {
          setMaids((prev) => prev.map((m) => m.referenceCode === updatedMaid.referenceCode ? updatedMaid : m));
          setMaidToReject(null);
        }}
      />
    </div>
  );
};

export default EditMaids;