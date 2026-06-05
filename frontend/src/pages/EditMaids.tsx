import { useCallback, useEffect, useMemo, useRef, useState, startTransition } from "react";
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
import { Progress } from "@/components/ui/progress";
import { calculateAge, defaultMaidProfile, formatDate, MaidProfile } from "@/lib/maids";
import {
  dismissMaidSaveTask,
  readMaidSaveTask,
  subscribeToMaidSaveTask,
  type MaidSaveTaskSnapshot,
} from "@/lib/maidSaveProgress";
import { Search, Eye, EyeOff, Trash2, Download, Upload, AlertTriangle, CheckSquare, Square, Loader2, ChevronLeft, ChevronRight, UserPlus } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { adminPath } from "@/lib/routes";
import { getAgencyAdminAuthHeaders } from "@/lib/agencyAdminAuth";
import { readSafeJson } from "@/lib/safeJson";
import SendMaidToClientDialog from "@/components/SendMaidToClientDialog";
import { scanUploadedFile } from "@/lib/fileScan";
import { exportMaidProfilesToPdf } from "@/lib/maidExport";

type ViewMode = "menu" | "public" | "hidden";
type VisibilityTarget =
  | { maid: MaidProfile; makePublic: boolean }
  | { bulk: true; makePublic: boolean };
type VisibilityTransfer = {
  id: string;
  refs: string[];
};

const PAGE_SIZE = 12;

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

type PreparedImportOperation =
  | { type: "csv"; csv: string; fileName: string }
  | { type: "profile"; payload: MaidProfile; fileName: string };

type ImportBatchResult = {
  fileName: string;
  created: number;
  updated: number;
  failed: number;
  errors: string[];
};

type EditMaidsLocationState = {
  fromView?: ViewMode;
  saveTaskId?: string;
} | null;

class ManualImportRequiredError extends Error {
  guessedName: string;
  guessedNationality: string;
  guessedReferenceCode: string;
  constructor(fields: { guessedName: string; guessedNationality: string; guessedReferenceCode: string }) {
    super("This PDF is missing embedded import data and needs manual confirmation.");
    this.name = "ManualImportRequiredError";
    this.guessedName = fields.guessedName;
    this.guessedNationality = fields.guessedNationality;
    this.guessedReferenceCode = fields.guessedReferenceCode;
  }
}

let xlsxLoader: Promise<typeof import("xlsx")> | null = null;

type JSZipConstructor = {
  new(): {
    loadAsync: (data: ArrayBuffer) => Promise<{
      file: (path: string) => { async: (type: "text") => Promise<string> } | null;
    }>;
  };
  loadAsync: (data: ArrayBuffer) => Promise<{
    file: (path: string) => { async: (type: "text") => Promise<string> } | null;
  }>;
};

let jsZipLoader: Promise<unknown> | null = null;

const loadJsZip = async (): Promise<JSZipConstructor> => {
  if (!jsZipLoader) jsZipLoader = import("jszip");
  const module = await jsZipLoader as { default?: unknown };
  return (module.default ?? module) as JSZipConstructor;
};

const waitForPaint = () => new Promise<void>((resolve) => { window.setTimeout(resolve, 0); });

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
  String(value ?? "").replace(/\s+/g, " ").replace(/[\u2022\u25ba]/g, "").trim().toLowerCase();

const cleanImportedValue = (value: unknown) => {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  if (/^(?:not stated|none stated|not provided(?: in biodata)?|blank in biodata|not specified|none)$/i.test(text)) return "";
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
    if (
      first.toLowerCase().includes("introduction tab") ||
      first.toLowerCase().includes("private info") ||
      first.toLowerCase().includes("interviewed by") ||
      first.toLowerCase().includes("referred by")
    ) {
      currentSection = normalizeImportLabel(first);
      if (second) sections.set(currentSection, second);
      return;
    }
    if (normalizeImportLabel(first) === "value") sections.set(currentSection, second);
  });
  return sections;
};

const isRichMaidWorkbook = (sheetNames: string[]) =>
  sheetNames.includes("Profile") &&
  sheetNames.includes("Skills") &&
  sheetNames.includes("Employment History");

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
        "Able to handle pork?", "Able to eat pork?", "Able to care for dog/cat?",
        "Able to do simple sewing?", "Able to do gardening work?",
        "Willing to wash car?", "Willing to work on off-days with compensation?",
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
  if (parseImportedBoolean(evalRows.get("Interviewed by Singapore EA"))) evaluationMethods.push(EVAL_PARENT_INTERVIEWED);
  EVAL_SUB_OPTIONS.forEach((option) => { if (parseImportedBoolean(evalRows.get(option))) evaluationMethods.push(option); });

  const workAreaLabelMap: Record<string, string> = {
    "care of infants/children (age range: infants\u20134 yr)": "Care of infants/children",
    "care of infants/children (age range: infants\u00e2\u20ac\u20224 yr)": "Care of infants/children",
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
    const ratingCandidate = [fourth, fifth].find((v) => /^\d+(\.\d+)?$/.test(v));
    const rating = ratingCandidate ? Number(ratingCandidate) : null;
    const note = [fifth, fourth].find((v) => v && !/^\d+(\.\d+)?$/.test(v)) ?? "";
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
    if (label === "English" || label === "Hindi" || label === "Tamil") languageSkills[label] = value;
  });

  const employmentHeaderIndex = employmentRows.findIndex(
    (row) => cleanImportedValue(row[0]) === "From" && cleanImportedValue(row[1]) === "To"
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
    parseImportedBoolean(profileMap.get(normalizeImportLabel("Food Handling \u2014 No Pork"))) ? "No Pork" : "",
    parseImportedBoolean(profileMap.get(normalizeImportLabel("Food Handling \u00e2\u20ac\u201d No Pork"))) ? "No Pork" : "",
    parseImportedBoolean(profileMap.get(normalizeImportLabel("Food Handling \u2014 No Beef"))) ? "No Beef" : "",
    parseImportedBoolean(profileMap.get(normalizeImportLabel("Food Handling \u00e2\u20ac\u201d No Beef"))) ? "No Beef" : "",
  ]
    .filter(Boolean)
    .filter((v, idx, self) => self.indexOf(v) === idx)
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
      privateInfo:
        cleanImportedValue(introSections.get(normalizeImportLabel("Private Info \u2014 Historical Record (skillsPreferences.privateInfo)"))) ||
        cleanImportedValue(introSections.get(normalizeImportLabel("Private Info \u00e2\u20ac\u201d Historical Record (skillsPreferences.privateInfo)"))),
      interviewedBy: cleanImportedValue(introSections.get(normalizeImportLabel("Interviewed By (skillsPreferences.interviewedBy)"))),
      referredBy: cleanImportedValue(introSections.get(normalizeImportLabel("Referred By (skillsPreferences.referredBy)"))),
    },
    agencyContact: {
      phone:
        cleanImportedValue(introSections.get(normalizeImportLabel("Private Info \u2014 Agency Contact (agencyContact.phone)"))) ||
        cleanImportedValue(introSections.get(normalizeImportLabel("Private Info \u00e2\u20ac\u201d Agency Contact (agencyContact.phone)"))),
      passportNo:
        cleanImportedValue(introSections.get(normalizeImportLabel("Private Info \u2014 Passport Number (agencyContact.passportNo)"))) ||
        cleanImportedValue(introSections.get(normalizeImportLabel("Private Info \u00e2\u20ac\u201d Passport Number (agencyContact.passportNo)"))),
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
    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full overflow-hidden border border-slate-200 flex-shrink-0 mr-1 align-middle bg-slate-100">
      <img
        src={`https://flagcdn.com/w40/${code.toLowerCase()}.png`}
        alt={code}
        className="w-full h-full object-cover block"
      />
    </span>
  );
};

type LooseMaidProfile = MaidProfile & Record<string, unknown>;

const normalizeMaidFieldKey = (key: string) => key.toLowerCase().replace(/[^a-z0-9]/g, "");

const isRecordValue = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const getMaidString = (maid: MaidProfile, keys: string[]) => {
  const record = maid as LooseMaidProfile;
  for (const key of keys) {
    const value = record[key];
    if (value !== null && value !== undefined && String(value).trim()) return String(value).trim();
  }
  return "";
};

const getMaidNestedString = (maid: MaidProfile, keys: string[]) => {
  const direct = getMaidString(maid, keys);
  if (direct) return direct;

  const wantedKeys = new Set(keys.map(normalizeMaidFieldKey));
  const findInRecord = (record: Record<string, unknown>, depth = 0): string => {
    if (depth > 3) return "";

    for (const [key, value] of Object.entries(record)) {
      if (wantedKeys.has(normalizeMaidFieldKey(key)) && value !== null && value !== undefined && String(value).trim()) {
        return String(value).trim();
      }
    }

    for (const value of Object.values(record)) {
      if (isRecordValue(value)) {
        const nested = findInRecord(value, depth + 1);
        if (nested) return nested;
      }
    }

    return "";
  };

  return findInRecord(maid as LooseMaidProfile);
};

const getMaidDateOfBirth = (maid: MaidProfile) =>
  getMaidNestedString(maid, [
    "dateOfBirth",
    "date_of_birth",
    "dob",
    "birthDate",
    "birth_date",
    "Date of Birth",
    "Date of Birth *",
  ]);

const getMaidMaritalStatus = (maid: MaidProfile) =>
  getMaidNestedString(maid, [
    "maritalStatus",
    "marital_status",
    "marital",
    "civilStatus",
    "civil_status",
    "Marital Status",
    "Civil Status",
  ]);

const getMaidAge = (maid: MaidProfile) => {
  const calculatedAge = calculateAge(getMaidDateOfBirth(maid));
  if (calculatedAge !== null) return calculatedAge;

  const age = Number.parseInt(getMaidNestedString(maid, ["age", "Age"]), 10);
  return Number.isFinite(age) && age > 0 && age < 100 ? age : null;
};

// ── Pagination component used in both top & bottom ─────────────────────────
const PaginationBar = ({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) => {
  const getPageNumbers = () => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | "…")[] = [];
    if (currentPage <= 4) {
      pages.push(1, 2, 3, 4, 5, "…", totalPages);
    } else if (currentPage >= totalPages - 3) {
      pages.push(1, "…", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, "…", currentPage - 1, currentPage, currentPage + 1, "…", totalPages);
    }
    return pages;
  };

  return (
    <div className="flex items-center gap-2">
      <button
        className="inline-flex items-center gap-1.5 h-8 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 shadow-sm disabled:cursor-not-allowed disabled:opacity-40 hover:bg-slate-50 hover:border-slate-300 transition-all"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Prev
      </button>

      <div className="flex items-center gap-1">
        {getPageNumbers().map((p, idx) =>
          p === "…" ? (
            <span key={`ellipsis-${idx}`} className="w-8 text-center text-xs text-slate-400 font-medium">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p as number)}
              className={`h-8 min-w-[2rem] rounded-lg border px-2 text-xs font-semibold transition-all ${
                p === currentPage
                  ? "bg-violet-600 text-white border-violet-600 shadow-[0_2px_8px_rgba(124,58,237,0.35)] scale-[1.05]"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-violet-50 hover:border-violet-300 hover:text-violet-700"
              }`}
            >
              {p}
            </button>
          )
        )}
      </div>

      <button
        className="inline-flex items-center gap-1.5 h-8 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 shadow-sm disabled:cursor-not-allowed disabled:opacity-40 hover:bg-slate-50 hover:border-slate-300 transition-all"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
      >
        Next
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

// ── Keyframe animations ────────────────────────────────────────────────────
const globalStyles = `
  @keyframes float-icon {
    0%, 100% { transform: translateY(0px) rotateX(0deg); }
    50%       { transform: translateY(-5px) rotateX(6deg); }
  }
  @keyframes pulse-dot {
    0%, 100% { opacity: 1; transform: scale(1); }
    50%       { opacity: 0.45; transform: scale(0.75); }
  }
  @keyframes dropdown-in {
    from { opacity: 0; transform: translateY(-6px) scale(0.98); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes fade-in-up {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes rainbow-new {
    0% { color: #ef4444; text-shadow: 0 0 4px rgba(239,68,68,0.35); }
    16% { color: #f97316; text-shadow: 0 0 4px rgba(249,115,22,0.35); }
    33% { color: #eab308; text-shadow: 0 0 4px rgba(234,179,8,0.35); }
    50% { color: #22c55e; text-shadow: 0 0 4px rgba(34,197,94,0.35); }
    66% { color: #06b6d4; text-shadow: 0 0 4px rgba(6,182,212,0.35); }
    83% { color: #8b5cf6; text-shadow: 0 0 4px rgba(139,92,246,0.35); }
    100% { color: #ec4899; text-shadow: 0 0 4px rgba(236,72,153,0.35); }
  }
  @keyframes slide-out-left {
    from { opacity: 1; transform: translateX(0) scale(1); }
    to   { opacity: 0; transform: translateX(-18px) scale(0.96); }
  }
  .animate-float-icon { animation: float-icon 2.2s ease-in-out infinite; }
  .animate-dropdown-in { animation: dropdown-in 0.15s cubic-bezier(0.16,1,0.3,1); }
  .animate-pulse-dot { animation: pulse-dot 1.8s ease-in-out infinite; }
  .animate-fade-in-up { animation: fade-in-up 0.4s cubic-bezier(0.16,1,0.3,1) forwards; }
  .animate-rainbow-new { animation: rainbow-new 1.35s linear infinite alternate; }
  .animate-slide-out-left { animation: slide-out-left 0.18s cubic-bezier(0.4,0,1,1) forwards; }

  .card-arrow { transition: transform 0.2s ease; }
  .group:hover .card-arrow { transform: translateX(4px); }

  /* Card shimmer on hover */
  .maid-card::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0) 100%);
    opacity: 0;
    transition: opacity 0.3s;
    pointer-events: none;
    z-index: 1;
  }
  .maid-card:hover::before { opacity: 1; }
`;

const EditMaids = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = (location.state ?? null) as EditMaidsLocationState;
  const [view, setView] = useState<ViewMode>("menu");
  const [search, setSearch] = useState("");
  const [maids, setMaids] = useState<MaidProfile[]>([]);
  const [totalMaids, setTotalMaids] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [visibilitySelected, setVisibilitySelected] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [importBatchProgress, setImportBatchProgress] = useState<ImportBatchProgress>({
    active: false, total: 0, currentIndex: 0, currentFileName: "",
    completed: 0, failed: 0, stage: "",
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
  const [inFlightRefs, setInFlightRefs] = useState<Set<string>>(new Set());
  const [manualImportOpen, setManualImportOpen] = useState(false);
  const [manualImportFields, setManualImportFields] = useState({ name: "", nationality: "", referenceCode: "" });
  const [menuSearch, setMenuSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [menuSearchResults, setMenuSearchResults] = useState<(MaidProfile & { _vis?: string })[]>([]);
  const [menuSearchLoading, setMenuSearchLoading] = useState(false);
  const [menuSearchOpen, setMenuSearchOpen] = useState(false);
  const [menuActiveIndex, setMenuActiveIndex] = useState(-1);
  const [listRefreshKey, setListRefreshKey] = useState(0);
  const [photoMap, setPhotoMap] = useState<Map<string, string>>(new Map());
  const [photosLoading, setPhotosLoading] = useState(false);
  const [saveProgressTask, setSaveProgressTask] = useState<MaidSaveTaskSnapshot | null>(null);
  const [saveProgressDialogOpen, setSaveProgressDialogOpen] = useState(false);
  const menuSearchRef = useRef<HTMLDivElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const cancelImportRef = useRef<boolean>(false);
  const activeImportControllerRef = useRef<AbortController | null>(null);

  const maidsRef = useRef<MaidProfile[]>(maids);
  useEffect(() => { maidsRef.current = maids; }, [maids]);

  const pendingReloadRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleBackgroundReload = useCallback((delayMs = 1500) => {
    if (pendingReloadRef.current) clearTimeout(pendingReloadRef.current);
    pendingReloadRef.current = setTimeout(() => {
      startTransition(() => {
        setListRefreshKey((v) => v + 1);
      });
    }, delayMs);
  }, []);

  useEffect(() => () => {
    if (pendingReloadRef.current) clearTimeout(pendingReloadRef.current);
  }, []);

  useEffect(() => {
    if (!menuSearch.trim()) { setMenuSearchResults([]); setMenuSearchOpen(false); return; }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        setMenuSearchLoading(true);
        const params = new URLSearchParams({ search: menuSearch.trim(), limit: "4" });
        const [pubRes, hidRes] = await Promise.all([
          fetch(`/api/maids?visibility=public&${params.toString()}`, {
            signal: controller.signal,
            headers: { ...getAgencyAdminAuthHeaders() },
          }),
          fetch(`/api/maids?visibility=hidden&${params.toString()}`, {
            signal: controller.signal,
            headers: { ...getAgencyAdminAuthHeaders() },
          }),
        ]);
        if (!pubRes.ok || !hidRes.ok) throw new Error("Failed to search maids");
        const [pubData, hidData] = await Promise.all([
          readSafeJson<{ error?: string; maids?: MaidProfile[] }>(pubRes),
          readSafeJson<{ error?: string; maids?: MaidProfile[] }>(hidRes),
        ]);
        const combined = [
          ...(pubData.maids ?? []).map((m) => ({ ...m, _vis: "public" as const })),
          ...(hidData.maids ?? []).map((m) => ({ ...m, _vis: "hidden" as const })),
        ].slice(0, 8);
        setMenuSearchResults(combined);
        setMenuSearchOpen(true);
        setMenuActiveIndex(-1);
      } catch { /* silently ignore abort errors */ }
      finally { setMenuSearchLoading(false); }
    }, 220);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [menuSearch]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuSearchRef.current && !menuSearchRef.current.contains(e.target as Node)) setMenuSearchOpen(false);
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
        <mark className="bg-violet-100 text-violet-700 rounded-[3px] px-px font-semibold">
          {text.slice(idx, idx + query.length)}
        </mark>
        {text.slice(idx + query.length)}
      </>
    );
  }, []);

  useEffect(() => {
    if (location.state?.fromView) setView(location.state.fromView);
  }, [location.state]);

  useEffect(() => {
    const taskId = locationState?.saveTaskId;
    if (!taskId) return;
    const snapshot = readMaidSaveTask(taskId);
    if (snapshot) {
      setSaveProgressTask(snapshot);
      setSaveProgressDialogOpen(true);
    }
    const unsubscribe = subscribeToMaidSaveTask(taskId, (nextSnapshot) => {
      setSaveProgressTask(nextSnapshot);
      setSaveProgressDialogOpen(true);
      if (nextSnapshot.status === "success" || nextSnapshot.persisted) {
        setListRefreshKey((value) => value + 1);
      }
    });
    return unsubscribe;
  }, [locationState?.saveTaskId]);

  const visibility = useMemo(() => {
    if (view === "public") return "public";
    if (view === "hidden") return "hidden";
    return null;
  }, [view]);

  const hydrateMissingMaidDetails = useCallback(async (list: MaidProfile[], signal: AbortSignal) => {
    const refsToHydrate = list
      .filter((maid) => maid.referenceCode && (!getMaidMaritalStatus(maid) || getMaidAge(maid) === null))
      .map((maid) => maid.referenceCode);

    if (refsToHydrate.length === 0) return;

    const results = await Promise.allSettled(
      refsToHydrate.map(async (referenceCode) => {
        const response = await fetch(`/api/maids/${encodeURIComponent(referenceCode)}`, {
          signal,
          headers: { ...getAgencyAdminAuthHeaders() },
        });
        const data = await readSafeJson<{ error?: string; maid?: MaidProfile }>(response);
        if (!response.ok || !data.maid) throw new Error(data.error || "Failed to load maid details");
        return data.maid;
      })
    );

    if (signal.aborted) return;

    const detailsByRef = new Map<string, MaidProfile>();
    results.forEach((result) => {
      if (result.status === "fulfilled") detailsByRef.set(result.value.referenceCode, result.value);
    });
    if (detailsByRef.size === 0) return;

    setMaids((current) =>
      current.map((maid) => {
        const detail = detailsByRef.get(maid.referenceCode);
        if (!detail) return maid;

        const detailDateOfBirth = getMaidDateOfBirth(detail);
        const detailMaritalStatus = getMaidMaritalStatus(detail);

        return {
          ...detail,
          ...maid,
          dateOfBirth: getMaidDateOfBirth(maid) || detailDateOfBirth,
          maritalStatus: getMaidMaritalStatus(maid) || detailMaritalStatus,
          introduction: {
            ...((detail.introduction as Record<string, unknown>) || {}),
            ...((maid.introduction as Record<string, unknown>) || {}),
          },
          skillsPreferences: {
            ...((detail.skillsPreferences as Record<string, unknown>) || {}),
            ...((maid.skillsPreferences as Record<string, unknown>) || {}),
          },
          agencyContact: {
            ...((detail.agencyContact as Record<string, unknown>) || {}),
            ...((maid.agencyContact as Record<string, unknown>) || {}),
          },
        };
      })
    );
  }, []);

  useEffect(() => {
    if (!visibility) return;
    const controller = new AbortController();
    setPhotoMap(new Map());
    const load = async () => {
      try {
        setIsLoading(true);
        const params = new URLSearchParams({ visibility, page: String(page), pageSize: String(PAGE_SIZE), noPhotos: "1" });
        if (debouncedSearch) params.set("search", debouncedSearch);
        const response = await fetch(`/api/maids?${params.toString()}`, {
          signal: controller.signal,
          headers: { ...getAgencyAdminAuthHeaders() },
        });
        const data = await readSafeJson<{ error?: string; maids?: MaidProfile[]; total?: number }>(response);
        if (!response.ok || !data.maids) throw new Error(data.error || "Failed to load maids");
        setMaids(data.maids);
        setTotalMaids(data.total ?? data.maids.length);
        void hydrateMissingMaidDetails(data.maids, controller.signal);

        const refsWithPhoto = data.maids.filter((m) => m.hasPhoto).map((m) => m.referenceCode);
        if (refsWithPhoto.length > 0 && !controller.signal.aborted) {
          setPhotosLoading(true);
          try {
            const photoRes = await fetch("/api/maids/photos-batch", {
              method: "POST",
              signal: controller.signal,
              headers: { "Content-Type": "application/json", ...getAgencyAdminAuthHeaders() },
              body: JSON.stringify({ refs: refsWithPhoto }),
            });
            if (photoRes.ok && !controller.signal.aborted) {
              const photoData = await readSafeJson<{ error?: string; photos?: Record<string, string> }>(photoRes);
              if (photoData.photos) {
                setPhotoMap(new Map(Object.entries(photoData.photos)));
              }
            }
          } finally {
            if (!controller.signal.aborted) setPhotosLoading(false);
          }
        }
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError"))
          toast.error(error instanceof Error ? error.message : "Failed to load maids");
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [debouncedSearch, visibility, page, listRefreshKey, hydrateMissingMaidDetails]);

  useEffect(() => { setPage(1); setSelected(new Set()); setVisibilitySelected(new Set()); }, [search, view]);

  const totalPages = Math.max(1, Math.ceil(totalMaids / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedMaids = maids;

  useEffect(() => { if (page !== currentPage) setPage(currentPage); }, [currentPage, page]);

  const toggle = (ref: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(ref)) next.delete(ref);
      else next.add(ref);
      return next;
    });
  };

  const toggleVisibilitySelection = (ref: string) => {
    setVisibilitySelected((prev) => {
      const next = new Set(prev);
      if (next.has(ref)) next.delete(ref);
      else next.add(ref);
      return next;
    });
  };

  const removeLocal = (referenceCode: string) => {
    setMaids((prev) => prev.filter((m) => m.referenceCode !== referenceCode));
    setTotalMaids((prev) => Math.max(0, prev - 1));
    setSelected((prev) => { const next = new Set(prev); next.delete(referenceCode); return next; });
    setVisibilitySelected((prev) => { const next = new Set(prev); next.delete(referenceCode); return next; });
  };

  const removeManyLocal = (referenceCodes: Set<string>) => {
    setMaids((prev) => prev.filter((m) => !referenceCodes.has(m.referenceCode)));
    setTotalMaids((prev) => Math.max(0, prev - referenceCodes.size));
    setSelected(new Set());
    setVisibilitySelected(new Set());
  };

  const deleteMaid = async (referenceCode: string) => {
    const response = await fetch(`/api/maids/${encodeURIComponent(referenceCode)}`, {
      method: "DELETE",
      headers: { ...getAgencyAdminAuthHeaders() },
    });
    const data = await readSafeJson<{ error?: string }>(response);
    if (!response.ok) throw new Error(data.error || "Failed to delete maid");
    removeLocal(referenceCode);
  };

  const updateMaidVisibility = (maid: MaidProfile, isPublic: boolean): Promise<MaidProfile> => {
    return fetch(`/api/maids/${encodeURIComponent(maid.referenceCode)}/visibility`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...getAgencyAdminAuthHeaders() },
      body: JSON.stringify({ isPublic }),
    }).then(async (response) => {
      const data = await readSafeJson<{ error?: string; maid?: MaidProfile }>(response);
      if (!response.ok) throw new Error(data.error || "Failed to update visibility");
      return data.maid ?? { ...maid, isPublic };
    });
  };

  const openDeleteDialog = (target: "selected" | MaidProfile) => { setDeleteTarget(target); setDeleteDialogOpen(true); };
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
    } catch (error) { toast.error(error instanceof Error ? error.message : "Failed to delete"); }
  };

  const openVisibilityDialog = (target: VisibilityTarget) => { setPendingVisibilityTarget(target); setVisibilityDialogOpen(true); };

  const confirmVisibilityChange = () => {
    if (!pendingVisibilityTarget) return;

    const isBulk = "bulk" in pendingVisibilityTarget;
    const makePublic = pendingVisibilityTarget.makePublic;

    const currentMaids = maidsRef.current;
    const affectedMaids = isBulk
      ? currentMaids.filter((m) => visibilitySelected.has(m.referenceCode))
      : [pendingVisibilityTarget.maid];

    if (affectedMaids.length === 0) {
      setVisibilityDialogOpen(false);
      setPendingVisibilityTarget(null);
      return;
    }

    const affectedRefs = new Set(affectedMaids.map((m) => m.referenceCode));

    setVisibilityDialogOpen(false);
    setPendingVisibilityTarget(null);
    removeManyLocal(affectedRefs);
    setInFlightRefs((prev) => {
      const next = new Set(prev);
      affectedRefs.forEach((r) => next.add(r));
      return next;
    });
    setSelected(new Set());
    setVisibilitySelected(new Set());

    scheduleBackgroundReload(1500);

    void Promise.allSettled(
      affectedMaids.map((maid) => updateMaidVisibility(maid, makePublic))
    ).then((results) => {
      setInFlightRefs((prev) => {
        const next = new Set(prev);
        affectedRefs.forEach((r) => next.delete(r));
        return next;
      });

      const failedCount = results.filter((r) => r.status === "rejected").length;

      if (failedCount > 0) {
        if (pendingReloadRef.current) clearTimeout(pendingReloadRef.current);
        startTransition(() => {
          setListRefreshKey((v) => v + 1);
        });
        toast.error(
          `Failed to update ${failedCount} maid${failedCount !== 1 ? "s" : ""}. Changes have been reverted.`
        );
        return;
      }

      if (isBulk) {
        toast.success(makePublic ? "Selected maids made public" : "Selected maids hidden");
      } else {
        toast.success(makePublic ? "Maid published" : "Maid hidden");
      }
    });
  };

  const handleExportPdf = async () => {
    try {
      setIsExporting(true);
      const params = new URLSearchParams();
      if (visibility) params.set("visibility", visibility);
      if (search.trim()) params.set("search", search.trim());
      const response = await fetch(`/api/maids${params.toString() ? `?${params.toString()}` : ""}`, {
        headers: { ...getAgencyAdminAuthHeaders() },
      });
      const data = await readSafeJson<{ error?: string; maids?: MaidProfile[] }>(response);
      if (!response.ok) throw new Error(data.error || "Failed to load maids for PDF export");
      if (!data.maids) throw new Error(data.error || "Failed to prepare PDF export");
      await exportMaidProfilesToPdf(data.maids);
      toast.success("PDF exported");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Failed to export PDF"); }
    finally { setIsExporting(false); }
  };

  const saveProgressIsActive =
    saveProgressTask?.status === "uploading" || saveProgressTask?.status === "processing";

  const closeSaveProgressDialog = (open: boolean) => {
    if (saveProgressIsActive) return;
    setSaveProgressDialogOpen(open);
    if (!open && saveProgressTask) {
      dismissMaidSaveTask(saveProgressTask.id);
      setSaveProgressTask(null);
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

  const normalizeImportHeaderKey = (value: unknown) =>
    String(value ?? "")
      .trim()
      .toLowerCase()
      .replace(/^\uFEFF/, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");

  const CSV_FIELD_MAP: Record<string, string> = {
    reference_code: "referenceCode", referencecode: "referenceCode", ref_code: "referenceCode",
    refcode: "referenceCode", ref: "referenceCode", ref_no: "referenceCode",
    reference_no: "referenceCode", maid_ref: "referenceCode", maid_reference: "referenceCode",
    maid_reference_code: "referenceCode", name: "fullName", full_name: "fullName",
    full_name_of_fdw: "fullName", maid_name: "fullName", maidname: "fullName",
    fullname: "fullName", fdw_name: "fullName", age: "age", nationality: "nationality",
    country: "nationality", experience: "experience", years: "experience",
    years_of_experience: "experience", photo: "photoDataUrl", photo_url: "photoDataUrl",
    image: "photoDataUrl", image_url: "photoDataUrl", picture: "photoDataUrl",
  };

  const normalizeCsv = (csvText: string): string => {
    const lines = csvText.split(/\r?\n/);
    if (lines.length < 1) return csvText;
    const headerLine = lines[0];
    if (!headerLine) return csvText;
    const headers = headerLine.split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
    let changed = false;
    const normalizedHeaders = headers.map((h) => {
      const key = normalizeImportHeaderKey(h);
      const mapped = CSV_FIELD_MAP[key];
      if (mapped && mapped !== h) { changed = true; return mapped; }
      return h;
    });
    if (!changed) return csvText;
    return [normalizedHeaders.join(","), ...lines.slice(1)].join("\n");
  };

  const reloadVisibleMaids = async (preferredVisibility?: "public" | "hidden") => {
    const reloadVisibility = preferredVisibility ?? visibility ?? "public";
    const params = new URLSearchParams({ visibility: reloadVisibility, page: String(page), pageSize: String(PAGE_SIZE) });
    if (search.trim()) params.set("search", search.trim());
    const reload = await fetch(`/api/maids?${params.toString()}`, {
      headers: { ...getAgencyAdminAuthHeaders() },
    });
    const reloadData = await readSafeJson<{ error?: string; maids?: MaidProfile[]; total?: number }>(reload);
    if (reload.ok && reloadData.maids) {
      setMaids(reloadData.maids);
      setTotalMaids(reloadData.total ?? reloadData.maids.length);
      if (view === "menu" && reloadData.maids.length > 0) setView(reloadVisibility === "hidden" ? "hidden" : "public");
    }
  };

  const importCsvText = async (csvText: string, options?: { skipReload?: boolean; suppressSuccessToast?: boolean }) => {
    const normalizedCsv = normalizeCsv(csvText);
    try {
      setIsImporting(true);
      const response = await fetch("/api/maids/import.csv", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAgencyAdminAuthHeaders() },
        body: JSON.stringify({ csv: normalizedCsv }),
      });
      const data = await readSafeJson<{ error?: string; created?: number; updated?: number; failed?: number; errors?: string[] }>(response);
      if (!response.ok && response.status !== 207) throw new Error(data.error || "Failed to import CSV");
      const created = data.created ?? 0;
      const updated = data.updated ?? 0;
      const failed = data.failed ?? 0;
      if (!options?.suppressSuccessToast)
        toast.success(`Import done: ${created} created, ${updated} updated${failed ? `, ${failed} failed` : ""}`);
      if (failed && data.errors?.length) toast.error(data.errors.slice(0, 2).join(" | "));
      if (!options?.skipReload) await reloadVisibleMaids();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Failed to import CSV"); }
    finally { setIsImporting(false); }
  };

  const importSingleMaidProfile = async (payload: MaidProfile, options?: { skipReload?: boolean; suppressSuccessToast?: boolean }) => {
    const referenceCode = String(payload.referenceCode || "").trim();
    if (!referenceCode) throw new Error("referenceCode is required in the imported file");
    try {
      setIsImporting(true);
      let response = await fetch("/api/maids", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAgencyAdminAuthHeaders() },
        body: JSON.stringify(payload),
      });
      let existed = false;
      if (response.status === 409) {
        existed = true;
        response = await fetch(`/api/maids/${encodeURIComponent(referenceCode)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...getAgencyAdminAuthHeaders() },
          body: JSON.stringify(payload),
        });
      }
      const data = await readSafeJson<{ error?: string; maid?: MaidProfile }>(response);
      if (!response.ok || !data.maid) throw new Error(data.error || "Failed to import maid profile");
      if (!options?.suppressSuccessToast) toast.success(existed ? "Maid profile updated" : "Maid profile created");
      const importedVisibility = data.maid.isPublic ? "public" : "hidden";
      if (!options?.skipReload) await reloadVisibleMaids(importedVisibility);
    } finally { setIsImporting(false); }
  };

  const prepareImportOperationFromFile = async (file: File): Promise<PreparedImportOperation> => {
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
      if (subject.startsWith("MAIDS_CSV_BASE64:"))
        return { type: "csv", csv: normalizeCsv(decodeBase64Utf8(subject.slice("MAIDS_CSV_BASE64:".length))), fileName: file.name };
      if (subject.startsWith("MAID_PROFILE_JSON_BASE64:"))
        return { type: "profile", payload: JSON.parse(decodeBase64Utf8(subject.slice("MAID_PROFILE_JSON_BASE64:".length))) as MaidProfile, fileName: file.name };
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
        for (const re of patterns) { const m = text.match(re); if (m?.[1]?.trim()) return m[1].trim().slice(0, 120); }
        return "";
      };
      const guessedName = extract([
        /(?:maid\s*name|full\s*name|name\s*of\s*fdw|fdw\s*name|name)\s*[:-]?\s*([A-Za-z][A-Za-z\s'.–-]{1,60}?)(?=\s{2,}|\d|$)/i,
        /1\.\s*Name\s*[:-]?\s*([A-Za-z][A-Za-z\s'.–-]{1,60}?)(?=\s{2,}|\d|$)/i,
      ]);
      const guessedNationality = extract([/nationality\s*[:-]?\s*([A-Za-z][A-Za-z\s]{1,40}?)(?=\s{2,}|\d|$)/i]);
      const guessedRef = extract([/(?:reference\s*code|ref\.?\s*code|ref\.?\s*no\.?)\s*[:-]?\s*([A-Za-z0-9_-]{2,30})/i]);
      throw new ManualImportRequiredError({ guessedName, guessedNationality, guessedReferenceCode: guessedRef });
    }
    if (ext === "docx") {
      const JSZip = await loadJsZip();
      const zip = await JSZip.loadAsync(await file.arrayBuffer());
      const docXml = await zip.file("word/document.xml")?.async("text");
      if (!docXml) throw new Error("DOCX does not contain importable data");
      const xml = new DOMParser().parseFromString(docXml, "application/xml");
      const text = Array.from(xml.getElementsByTagName("w:t")).map((n) => n.textContent ?? "").join(" ").replace(/\s+/g, " ").trim();
      const refMatch = text.match(/\breference\s*code\b\s*[:-]?\s*([a-z0-9_-]{2,})/i);
      const nameMatch = text.match(/\bfull\s*name\b\s*[:-]?\s*([a-z][^:]{1,80}?)(?=\s{2,}|$)/i);
      if (!refMatch?.[1] || !nameMatch?.[1]) throw new Error("DOCX is missing required fields: referenceCode, fullName");
      const escapeCsv = (value: string) => { const v = String(value ?? ""); if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`; return v; };
      return { type: "csv", csv: normalizeCsv(`referenceCode,fullName\n${escapeCsv(refMatch[1])},${escapeCsv(nameMatch[1].trim())}`), fileName: file.name };
    }
    if (ext === "xlsx") {
      const XLSX = await loadXlsx();
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      if (isRichMaidWorkbook(workbook.SheetNames)) {
        const rowsBySheet = workbook.SheetNames.reduce<Record<string, unknown[][]>>((acc, sheetName) => {
          const sheet = workbook.Sheets[sheetName];
          acc[sheetName] = sheet ? (XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", blankrows: false }) as unknown[][]) : [];
          return acc;
        }, {});
        return { type: "profile", payload: buildImportedMaidProfile(rowsBySheet), fileName: file.name };
      }
      const sheetName = workbook.SheetNames[0];
      const sheet = sheetName ? workbook.Sheets[sheetName] : undefined;
      if (!sheet) throw new Error("XLSX does not contain importable data");
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false }) as unknown[][];
      const header = Array.isArray(rows[0]) ? rows[0] : [];
      const headerIndexes = new Map<string, number>();
      header.forEach((h, idx) => {
        const key = normalizeImportHeaderKey(h);
        const mapped = CSV_FIELD_MAP[key] ?? key;
        headerIndexes.set(mapped.toLowerCase(), idx);
      });
      if (!headerIndexes.has("referencecode") || !headerIndexes.has("fullname"))
        throw new Error("XLSX is missing required columns: referenceCode, fullName");
      return { type: "csv", csv: normalizeCsv(XLSX.utils.sheet_to_csv(sheet)), fileName: file.name };
    }
    if (ext === "csv") return { type: "csv", csv: normalizeCsv(await file.text()), fileName: file.name };
    if (ext === "xls" || ext === "doc") {
      const content = await file.text();
      const maidsCsvBase64 = extractBase64Marker(content, "MAIDS_CSV_BASE64");
      if (maidsCsvBase64) return { type: "csv", csv: normalizeCsv(decodeBase64Utf8(maidsCsvBase64)), fileName: file.name };
      const maidProfileBase64 = extractBase64Marker(content, "MAID_PROFILE_JSON_BASE64");
      if (maidProfileBase64) return { type: "profile", payload: JSON.parse(decodeBase64Utf8(maidProfileBase64)) as MaidProfile, fileName: file.name };
      throw new Error('This file is missing import data. Please import files exported from "Export Maids" or from a maid bio-data export.');
    }
    throw new Error("Unsupported file type. Supported: .csv, .xls, .xlsx, .doc, .docx, .pdf");
  };

  const uploadPreparedImportBatch = async (operations: PreparedImportOperation[], signal: AbortSignal) => {
    const response = await fetch("/api/maids/import.batch", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAgencyAdminAuthHeaders() },
      body: JSON.stringify({ operations }), signal,
    });
    const data = await readSafeJson<{ error?: string; results?: ImportBatchResult[] }>(response);
    if (!response.ok && response.status !== 207) throw new Error(data.error || "Failed to import batch");
    return data.results ?? [];
  };

  const requestExport = () => { if (!isExporting) setConfirmExportOpen(true); };
  const confirmExportPdf = () => { setConfirmExportOpen(false); void handleExportPdf(); };

  const requestImportFiles = async (files?: FileList | File[]) => {
    if (!files || isImporting) return;
    const all = Array.from(files);
    if (all.length > 50) toast.error("Max 50 files per upload");
    const list = all.slice(0, 50);
    if (list.length === 0) return;
    const scanResults = await Promise.all(list.map((file) => scanUploadedFile(file)));
    const approved: File[] = [];
    scanResults.forEach((scan, i) => {
      if (!scan.success) toast.error(`${list[i]!.name}: ${scan.message}`);
      else approved.push(list[i]!);
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
    activeImportControllerRef.current = null;
    setImportBatchProgress({ active: true, total: files.length, currentIndex: 0, currentFileName: "", completed: 0, failed: 0, stage: "Preparing files", cancelled: false });
    let completed = 0;
    let failed = 0;
    for (let batchStart = 0; batchStart < files.length; batchStart += PARALLEL_BATCH_SIZE) {
      if (cancelImportRef.current) break;
      const batch = files.slice(batchStart, batchStart + PARALLEL_BATCH_SIZE);
      const batchNum = Math.floor(batchStart / PARALLEL_BATCH_SIZE) + 1;
      setImportBatchProgress((prev) => ({
        ...prev, currentIndex: batchStart, currentFileName: batch.map((f) => f.name).join(", "),
        stage: `Preparing batch ${batchNum} of ${Math.ceil(files.length / PARALLEL_BATCH_SIZE)}`,
      }));
      await waitForPaint();
      const preparedResults = await Promise.allSettled(batch.map((file) => prepareImportOperationFromFile(file)));
      const operations: PreparedImportOperation[] = [];
      preparedResults.forEach((result, i) => {
        const file = batch[i];
        if (result.status === "fulfilled") { operations.push(result.value); return; }
        if (result.reason instanceof ManualImportRequiredError) {
          if (files.length === 1) {
            setManualImportFields({ name: result.reason.guessedName, nationality: result.reason.guessedNationality, referenceCode: result.reason.guessedReferenceCode });
            setManualImportOpen(true);
            cancelImportRef.current = true;
            return;
          }
          toast.error(`${file?.name}: PDF needs manual import, so it was skipped`);
        } else {
          toast.error(result.reason instanceof Error ? `${file?.name}: ${result.reason.message}` : `${file?.name}: Failed to prepare import`);
        }
        failed += 1;
      });
      if (cancelImportRef.current) break;
      if (operations.length === 0) {
        setImportBatchProgress((prev) => ({ ...prev, completed, failed, currentIndex: Math.min(prev.total, batchStart + batch.length), stage: failed > 0 ? "Continuing with remaining files" : "Ready for next batch" }));
        continue;
      }
      setImportBatchProgress((prev) => ({ ...prev, currentIndex: batchStart + operations.length, currentFileName: operations.map((op) => op.fileName).join(", "), stage: `Uploading batch ${batchNum} of ${Math.ceil(files.length / PARALLEL_BATCH_SIZE)}` }));
      await waitForPaint();
      try {
        const controller = new AbortController();
        activeImportControllerRef.current = controller;
        const batchResults = await uploadPreparedImportBatch(operations, controller.signal);
        batchResults.forEach((result) => {
          if (result.failed > 0) { failed += 1; if (result.errors.length > 0) toast.error(`${result.fileName}: ${result.errors.slice(0, 2).join(" | ")}`); }
          else completed += 1;
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError" && cancelImportRef.current) break;
        failed += operations.length;
        toast.error(error instanceof Error ? error.message : "Failed to upload batch");
      } finally { activeImportControllerRef.current = null; }
      setImportBatchProgress((prev) => ({ ...prev, completed, failed, currentIndex: Math.min(prev.total, batchStart + batch.length), stage: failed > 0 ? "Continuing with remaining files" : "Saving imported data" }));
    }
    const wasCancelled = cancelImportRef.current;
    if (completed > 0) await reloadVisibleMaids("public");
    setImportBatchProgress((prev) => ({ ...prev, active: false, currentIndex: wasCancelled ? Math.min(prev.currentIndex, prev.total) : prev.total, completed, failed, cancelled: wasCancelled, stage: wasCancelled ? "Upload cancelled" : failed ? "Completed with some failed files" : "Completed successfully" }));
    if (wasCancelled) toast.error(`Upload cancelled — ${completed} file${completed !== 1 ? "s" : ""} imported before cancel`);
    else toast.success(`Bulk upload finished: ${completed} uploaded${failed ? `, ${failed} failed` : ""}`);
  };

  const confirmManualImport = async () => {
    const { name, nationality, referenceCode } = manualImportFields;
    if (!name.trim()) { toast.error("Name is required"); return; }
    setManualImportOpen(false);
    const ref = referenceCode.trim() || `EXT-${Date.now()}`;
    const escapeCsv = (v: string) => { const s = String(v ?? ""); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    await importCsvText(`referenceCode,fullName,nationality\n${escapeCsv(ref)},${escapeCsv(name.trim())},${escapeCsv(nationality.trim())}`);
  };

  const hasActiveUploadFile = importBatchProgress.active && importBatchProgress.currentIndex > importBatchProgress.completed + importBatchProgress.failed;
  const uploadProgressUnits = importBatchProgress.completed + importBatchProgress.failed + (hasActiveUploadFile ? 0.35 : 0);
  const uploadProgressPercent = importBatchProgress.total > 0 ? Math.min(100, Math.round((uploadProgressUnits / importBatchProgress.total) * 100)) : 0;

  // ── Shared Dialogs ─────────────────────────────────────────────────────────
  const sharedDialogs = (
    <>
      {/* Save progress */}
      <Dialog open={saveProgressDialogOpen} onOpenChange={closeSaveProgressDialog}>
        <DialogContent
          className="max-w-md"
          onInteractOutside={(event) => { if (saveProgressIsActive) event.preventDefault(); }}
          onEscapeKeyDown={(event) => { if (saveProgressIsActive) event.preventDefault(); }}
        >
          <DialogHeader>
            <DialogTitle>
              {saveProgressTask?.status === "success"
                ? "Maid Profile Saved"
                : saveProgressTask?.status === "error"
                  ? "Save Failed"
                  : "Saving Maid Profile"}
            </DialogTitle>
            <DialogDescription>
              {saveProgressTask
                ? `${saveProgressTask.maidName} (${saveProgressTask.referenceCode || "no ref code"})`
                : "Tracking maid profile upload progress."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-violet-900">
                  {saveProgressTask?.stage || "Preparing maid profile upload..."}
                </span>
                <span className="text-sm font-bold text-violet-700">
                  {saveProgressTask?.percent ?? 0}%
                </span>
              </div>
              <Progress value={saveProgressTask?.percent ?? 0} className="h-2.5 bg-violet-200" />
            </div>
            {saveProgressTask?.persisted && saveProgressTask.status !== "success" && (
              <div className="rounded-xl border border-violet-200 bg-violet-50/60 px-4 py-3 text-sm text-violet-800">
                Maid details are already saved. Remaining photos or video are uploading in the background one-by-one.
              </div>
            )}
            {saveProgressTask?.status === "error" && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {saveProgressTask.error || "Failed to save maid profile."}
              </div>
            )}
            {saveProgressTask?.status === "success" && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                The maid profile and media are ready, and the maids list has been refreshed.
              </div>
            )}
          </div>
          <DialogFooter>
            {saveProgressIsActive ? (
              <Button disabled className="bg-violet-600 text-white">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </Button>
            ) : (
              <Button onClick={() => closeSaveProgressDialog(false)} className="bg-violet-600 hover:bg-violet-700 text-white">
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export */}
      <Dialog open={confirmExportOpen} onOpenChange={setConfirmExportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export maids PDF?</DialogTitle>
            <DialogDescription>
              Download a PDF summary of your maid records. The PDF also carries import data so it can be uploaded back into the maids manager later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmExportOpen(false)} disabled={isExporting}>Cancel</Button>
            <Button onClick={confirmExportPdf} disabled={isExporting} className="bg-violet-600 hover:bg-violet-700 text-white">
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
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
            <span className="font-semibold text-slate-700">Selected file{pendingImportFiles.length === 1 ? "" : "s"}:</span>{" "}
            <span className="text-slate-600">{pendingImportFiles.length ? pendingImportFiles.map((f) => f.name).join(", ") : "None"}</span>
          </div>
          <p className="text-xs text-slate-500">Bulk upload supports up to 50 files at once. CSV and Excel files are recommended for larger batch imports.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmImportOpen(false)} disabled={isImporting}>Cancel</Button>
            <Button
              onClick={() => void confirmImportFiles()}
              disabled={isImporting || pendingImportFiles.length === 0}
              className="bg-violet-600 hover:bg-violet-700 text-white"
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
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100">
                <AlertTriangle className="h-5 w-5 text-rose-600" />
              </div>
              <div>
                <DialogTitle className="text-rose-700">Confirm Deletion</DialogTitle>
                <DialogDescription className="mt-0.5">This action <strong>cannot be undone</strong>.</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            You are about to permanently delete <strong>{getDeleteLabel()}</strong>. All associated data will be removed.
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button
              className="bg-rose-600 hover:bg-rose-700 text-white"
              onClick={() => void confirmDelete()}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Yes, Delete
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
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${pendingVisibilityTarget?.makePublic ? "bg-violet-100" : "bg-amber-100"}`}>
                {pendingVisibilityTarget?.makePublic
                  ? <Eye className="h-5 w-5 text-violet-600" />
                  : <EyeOff className="h-5 w-5 text-amber-600" />}
              </div>
              <div>
                <DialogTitle>{pendingVisibilityTarget?.makePublic ? "Publish maid?" : "Hide maid?"}</DialogTitle>
                <DialogDescription className="mt-0.5">This can be reversed at any time.</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className={`rounded-xl px-4 py-3 text-sm ${pendingVisibilityTarget?.makePublic ? "bg-violet-50 border border-violet-200 text-violet-800" : "bg-amber-50 border border-amber-200 text-amber-800"}`}>
            {pendingVisibilityTarget && "bulk" in pendingVisibilityTarget ? (
              <><strong>{visibilitySelected.size} maid{visibilitySelected.size !== 1 ? "s" : ""}</strong> will be{" "}<strong>{pendingVisibilityTarget.makePublic ? "made visible to the public" : "hidden from public view"}</strong>.</>
            ) : (
              <><strong>{(pendingVisibilityTarget as { maid: MaidProfile } | null)?.maid?.fullName}</strong> will be{" "}<strong>{pendingVisibilityTarget?.makePublic ? "visible to the public" : "hidden from public view"}</strong>.</>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setVisibilityDialogOpen(false); setPendingVisibilityTarget(null); }}>
              Cancel
            </Button>
            <Button
              onClick={confirmVisibilityChange}
              className={pendingVisibilityTarget?.makePublic
                ? "bg-violet-600 hover:bg-violet-700 text-white"
                : "bg-amber-500 hover:bg-amber-600 text-white"}
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
          <div className="rounded-xl px-3 py-2.5 text-xs flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-800">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-500" />
            <span>Photos cannot be extracted from external PDFs. After importing, open the maid profile and use <strong>Manage Photos</strong> to upload them manually.</span>
          </div>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Full Name <span className="text-rose-500">*</span></label>
              <Input value={manualImportFields.name} onChange={(e) => setManualImportFields((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Maria Santos" className="text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nationality</label>
              <Input value={manualImportFields.nationality} onChange={(e) => setManualImportFields((p) => ({ ...p, nationality: e.target.value }))} placeholder="e.g. Filipino" className="text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reference Code</label>
              <Input value={manualImportFields.referenceCode} onChange={(e) => setManualImportFields((p) => ({ ...p, referenceCode: e.target.value }))} placeholder="Leave blank to auto-generate" className="text-sm font-mono" />
              <p className="text-[10px] text-slate-400">If blank, a temporary code will be assigned — you can edit it later.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManualImportOpen(false)} disabled={isImporting}>Cancel</Button>
            <Button
              onClick={() => void confirmManualImport()}
              disabled={isImporting || !manualImportFields.name.trim()}
              className="bg-violet-600 hover:bg-violet-700 text-white"
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
        <style>{globalStyles}</style>
        <div className="content-card animate-fade-in-up space-y-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">

          {/* Quick-search */}
          <div ref={menuSearchRef} className="relative">
            <div className={`flex items-center gap-2.5 rounded-xl border bg-white px-3.5 py-1 shadow-sm transition-all ${menuSearchOpen ? "border-violet-400 ring-2 ring-violet-100" : "border-slate-200 hover:border-slate-300"}`}>
              <Search className={`h-4 w-4 shrink-0 transition-colors ${menuSearchLoading ? "animate-pulse text-violet-500" : "text-slate-400"}`} />
              <input
                type="text"
                placeholder="Quick-search any maid by name or reference code…"
                value={menuSearch}
                autoComplete="off"
                spellCheck={false}
                className="flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-slate-400 text-slate-800"
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
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors text-[10px]"
                >✕</button>
              )}
            </div>

            {/* Dropdown results */}
            {menuSearchOpen && menuSearchResults.length > 0 && (
              <div className="animate-dropdown-in absolute top-[calc(100%+6px)] left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-[0_12px_40px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.06)] z-50 overflow-hidden">
                {menuSearchResults.map((maid, idx) => {
                  const photo = Array.isArray(maid.photoDataUrls) && maid.photoDataUrls.length > 0 ? maid.photoDataUrls[0] : maid.photoDataUrl;
                  const age = getMaidAge(maid);
                  const vis = (maid as MaidProfile & { _vis?: string })._vis;
                  const flagCode = getNationalityCode(maid.nationality);
                  return (
                    <div
                      key={maid.referenceCode}
                      className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-slate-100 last:border-b-0 ${idx === menuActiveIndex ? "bg-violet-50" : "hover:bg-slate-50"}`}
                      onMouseEnter={() => setMenuActiveIndex(idx)}
                      onClick={() => { navigate(adminPath(`/maid/${encodeURIComponent(maid.referenceCode)}`), { state: { fromView: vis ?? "public" } }); setMenuSearchOpen(false); }}
                    >
                      {photo ? (
                        <img src={photo} alt={maid.fullName} className="w-11 h-11 rounded-lg object-cover flex-shrink-0 bg-slate-100 border border-slate-200" />
                      ) : (
                        <div className="w-11 h-11 rounded-lg bg-violet-50 border border-violet-200 flex items-center justify-center flex-shrink-0 text-xs font-bold text-violet-700">
                          {maid.fullName.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900 leading-tight">
                          {highlightMatch(maid.fullName, menuSearch)}
                        </p>
                        <p className="truncate text-[11px] text-slate-500 mt-0.5 flex items-center">
                          <span className="font-semibold">{highlightMatch(String(maid.referenceCode), menuSearch)}</span>
                          {maid.nationality && (<><span className="mx-1.5 text-slate-300">·</span><FlagCircle code={flagCode} />{maid.nationality}</>)}
                          {age !== null ? <><span className="mx-1.5 text-slate-300">·</span>({age}) yrs</> : ""}
                        </p>
                      </div>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wide flex-shrink-0 ${vis === "public" ? "bg-violet-100 text-violet-700" : "bg-amber-100 text-amber-700"}`}>
                        {vis === "public" ? "Public" : "Hidden"}
                      </span>
                    </div>
                  );
                })}
                <div className="px-4 py-2.5 text-[11px] text-slate-400 text-center bg-slate-50">
                  {menuSearchResults.length === 8 ? "Showing top 8 results — refine your search" : `${menuSearchResults.length} result${menuSearchResults.length !== 1 ? "s" : ""} found`}
                </div>
              </div>
            )}

            {menuSearchOpen && !menuSearchLoading && menuSearchResults.length === 0 && menuSearch.trim() && (
              <div className="animate-dropdown-in absolute top-[calc(100%+6px)] left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-[0_12px_40px_rgba(0,0,0,0.12)] z-50 overflow-hidden px-4 py-6 text-center">
                <p className="text-sm font-medium text-slate-600">No maids found</p>
                <p className="text-xs text-slate-400 mt-1">Try a different name or reference code</p>
              </div>
            )}
          </div>

          <hr className="border-slate-100" />

          {/* Category cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

            {/* Public Card */}
            <button
              onClick={() => setView("public")}
              className="group relative flex flex-col items-center gap-4 overflow-hidden rounded-2xl p-8 text-center
                bg-white border-[1.5px] border-slate-200
                transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]
                hover:border-violet-300 hover:shadow-[0_8px_32px_rgba(124,58,237,0.15),0_2px_8px_rgba(124,58,237,0.08)]
                hover:-translate-y-0.5 hover:scale-[1.01] active:translate-y-0 active:scale-[0.99]"
            >
              <div className="pointer-events-none absolute -top-8 -right-8 h-32 w-32 rounded-full blur-3xl bg-violet-100/60" />
              <div className="pointer-events-none absolute -bottom-6 -left-6 h-24 w-24 rounded-full blur-2xl bg-violet-50/80" />
              <div className="relative flex h-[72px] w-[72px] items-center justify-center rounded-[22px] bg-gradient-to-br from-violet-500 to-violet-700
                shadow-[0_4px_0_#5b21b6,0_8px_20px_rgba(124,58,237,0.30),inset_0_1px_0_rgba(255,255,255,0.30)]
                transition-all duration-300
                group-hover:animate-float-icon group-hover:shadow-[0_8px_0_#5b21b6,0_16px_32px_rgba(124,58,237,0.35)]">
                <div className="absolute inset-0 rounded-[22px] rounded-b-none h-1/2 bg-gradient-to-b from-white/25 to-transparent pointer-events-none" />
                <Eye className="h-8 w-8 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.20)]" />
              </div>
              <div className="space-y-1.5">
                <div className="mb-2">
                  <span className="inline-flex items-center gap-[5px] bg-violet-50 border border-violet-200 text-violet-700 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-[0.04em]">
                    <span className="animate-pulse-dot w-1.5 h-1.5 rounded-full bg-violet-500 flex-shrink-0" />
                    Live
                  </span>
                </div>
                <p className="text-lg font-bold tracking-tight text-slate-900">Maids in Public</p>
                <p className="text-sm text-slate-500 leading-relaxed">View, edit or remove<br />publicly visible maids</p>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-violet-600">
                <span>Open list</span>
                <svg className="h-3.5 w-3.5 card-arrow" fill="none" viewBox="0 0 16 16">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </button>

            {/* Hidden Card */}
            <button
              onClick={() => setView("hidden")}
              className="group relative flex flex-col items-center gap-4 overflow-hidden rounded-2xl p-8 text-center
                bg-white border-[1.5px] border-slate-200
                transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]
                hover:border-amber-300 hover:shadow-[0_8px_28px_rgba(245,158,11,0.15),0_2px_8px_rgba(245,158,11,0.08)]
                hover:-translate-y-0.5 hover:scale-[1.01] active:translate-y-0 active:scale-[0.99]"
            >
              <div className="pointer-events-none absolute -top-8 -right-8 h-32 w-32 rounded-full blur-3xl bg-amber-100/60" />
              <div className="pointer-events-none absolute -bottom-6 -left-6 h-24 w-24 rounded-full blur-2xl bg-amber-50/80" />
              <div className="relative flex h-[72px] w-[72px] items-center justify-center rounded-[22px] bg-gradient-to-br from-amber-400 to-amber-600
                shadow-[0_4px_0_#b45309,0_8px_20px_rgba(245,158,11,0.28),inset_0_1px_0_rgba(255,255,255,0.30)]
                transition-all duration-300
                group-hover:animate-float-icon group-hover:shadow-[0_8px_0_#b45309,0_16px_30px_rgba(245,158,11,0.32)]">
                <div className="absolute inset-0 rounded-[22px] rounded-b-none h-1/2 bg-gradient-to-b from-white/25 to-transparent pointer-events-none" />
                <EyeOff className="h-8 w-8 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.18)]" />
              </div>
              <div className="space-y-1.5">
                <div className="mb-2">
                  <span className="inline-flex items-center gap-[5px] bg-amber-50 border border-amber-200 text-amber-700 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-[0.04em]">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                    Draft
                  </span>
                </div>
                <p className="text-lg font-bold tracking-tight text-slate-900">Maids Hidden</p>
                <p className="text-sm text-slate-500 leading-relaxed">Manage drafts &amp; maids<br />hidden from public view</p>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600">
                <span>Open list</span>
                <svg className="h-3.5 w-3.5 card-arrow" fill="none" viewBox="0 0 16 16">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </button>
          </div>

          <p className="rounded-xl px-4 py-3 text-center text-xs bg-amber-50 border border-amber-200 text-amber-700">
            Maids without photos will not be displayed publicly. Add photos first, then make them searchable.
          </p>
        </div>
        {sharedDialogs}
      </div>
    );
  }

  // ── LIST VIEW ─────────────────────────────────────────────────────────────
  const allPageSelected = paginatedMaids.length > 0 && paginatedMaids.every((m) => selected.has(m.referenceCode));
  const isPublicView = view === "public";
  const visibilityActionLabel = isPublicView ? "Hide" : "Publish";

  return (
    <div className="page-container mx-auto w-full max-w-[1100px] px-4">
      <style>{globalStyles}</style>

      {/* List header bar */}
      <div className="hidden">
        {/* ── Improved back button ── */}
      </div>

      {/* Main card */}
      <div className="content-card animate-fade-in-up mx-auto w-full max-w-[1040px] space-y-4 bg-white rounded-2xl border border-slate-200 shadow-sm p-4">

        {/* Toolbar */}
        <div className="flex flex-wrap gap-2">
          <div className="flex flex-1 min-w-48 items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 shadow-sm focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-100 transition-all">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <Input
              placeholder="Search by name or reference code…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-0 bg-transparent shadow-none outline-none ring-0 focus:outline-none focus:ring-0 focus:shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-0 px-0 text-slate-800 placeholder:text-slate-400"
              autoComplete="off"
              spellCheck={false}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="ml-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors text-xs"
                aria-label="Clear search"
              >✕</button>
            )}
          </div>
          <Button
            type="button"
            onClick={() => navigate(adminPath("/add-maid"))}
            className="h-10 bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Add Maid
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setView(isPublicView ? "hidden" : "public")}
            className="h-10 border-amber-200 text-amber-700 hover:border-amber-300 hover:bg-amber-50"
          >
            {isPublicView ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
            {isPublicView ? "Hidden Maids" : "Public Maids"}
          </Button>
          {isPublicView && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => importInputRef.current?.click()}
                disabled={isImporting || importBatchProgress.active}
                className="h-10 border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
              >
                <Upload className="mr-2 h-4 w-4" />
                {importBatchProgress.active ? "Uploading..." : "Bulk Upload"}
              </Button>
              <input
                ref={importInputRef}
                type="file"
                multiple
                accept=".csv,.xls,.xlsx,.pdf,.doc,.docx"
                className="hidden"
                onChange={(event) => { void requestImportFiles(event.target.files ?? undefined); event.target.value = ""; }}
              />
            </>
          )}
        </div>

        {/* Batch upload progress */}
        {(importBatchProgress.active || importBatchProgress.completed > 0 || importBatchProgress.failed > 0) && (
          <div className={`rounded-xl border overflow-hidden ${
            importBatchProgress.cancelled
              ? "bg-amber-50 border-amber-200"
              : importBatchProgress.failed > 0 && !importBatchProgress.active
                ? "bg-rose-50 border-rose-200"
                : "bg-violet-50 border-violet-200"
          }`}>
            <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-2">
              <div className="flex items-center gap-2 min-w-0">
                {importBatchProgress.active ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-violet-600" />
                ) : importBatchProgress.cancelled ? (
                  <svg className="h-4 w-4 shrink-0 text-amber-600" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M5 5l6 6M11 5l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                ) : importBatchProgress.failed > 0 ? (
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500" />
                ) : (
                  <svg className="h-4 w-4 shrink-0 text-violet-600" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M5 8l2.5 2.5L11 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
                <p className={`text-sm font-bold truncate ${
                  importBatchProgress.cancelled ? "text-amber-800"
                    : importBatchProgress.failed > 0 && !importBatchProgress.active ? "text-rose-700"
                    : "text-violet-800"
                }`}>
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
                {importBatchProgress.completed > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-700">
                    <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {importBatchProgress.completed}
                  </span>
                )}
                {importBatchProgress.failed > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-600">
                    <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                      <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                    {importBatchProgress.failed}
                  </span>
                )}
                <span className="text-xs font-bold tabular-nums text-violet-700">{uploadProgressPercent}%</span>
                {importBatchProgress.active && (
                  <button
                    type="button"
                    onClick={() => { cancelImportRef.current = true; activeImportControllerRef.current?.abort(); }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-50"
                  >
                    <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                      <rect x="2.5" y="2.5" width="7" height="7" rx="1" fill="currentColor" />
                    </svg>
                    Cancel
                  </button>
                )}
                {!importBatchProgress.active && (
                  <button
                    type="button"
                    onClick={() => setImportBatchProgress({ active: false, total: 0, currentIndex: 0, currentFileName: "", completed: 0, failed: 0, stage: "", cancelled: false })}
                    className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200/70 text-slate-500 hover:bg-slate-300/70 transition-colors text-[10px]"
                  >✕</button>
                )}
              </div>
            </div>
            <div className="px-4 pb-2 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              {importBatchProgress.stage && (
                <span className={`text-xs opacity-80 ${importBatchProgress.cancelled ? "text-amber-700" : "text-violet-700"}`}>
                  {importBatchProgress.stage}
                </span>
              )}
              {importBatchProgress.active && importBatchProgress.currentFileName && (
                <span className="inline-block max-w-[280px] truncate rounded-md px-2 py-0.5 text-[11px] font-medium bg-violet-100 text-violet-800" title={importBatchProgress.currentFileName}>
                  {importBatchProgress.currentFileName}
                </span>
              )}
              {importBatchProgress.total > 0 && (
                <span className="ml-auto text-[11px] font-semibold text-violet-700 opacity-70">
                  {Math.max(importBatchProgress.currentIndex, importBatchProgress.completed + importBatchProgress.failed)} / {importBatchProgress.total} files
                </span>
              )}
            </div>
            <div className="mx-4 mb-3 h-2 overflow-hidden rounded-full bg-white/70">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${uploadProgressPercent}%`,
                  background: importBatchProgress.cancelled
                    ? "#f59e0b"
                    : importBatchProgress.failed > 0 && !importBatchProgress.active
                      ? "linear-gradient(90deg, #7c3aed 0%, #f43f5e 100%)"
                      : "linear-gradient(90deg, #7c3aed 0%, #a78bfa 100%)",
                  boxShadow: importBatchProgress.active ? "0 0 8px rgba(124,58,237,0.5)" : "none",
                }}
              />
            </div>
          </div>
        )}

        {/* ── TOP PAGINATION — centered ─────────────────────────────────── */}
        {totalMaids > PAGE_SIZE && !isLoading && (
          <div className="flex flex-col items-center gap-2 py-1 border-b border-slate-100 pb-4">
            <p className="text-xs text-slate-500 font-medium">
              Page <span className="font-bold text-slate-700">{currentPage}</span> of <span className="font-bold text-slate-700">{totalPages}</span>
              <span className="ml-2 text-slate-400">({totalMaids} maids)</span>
            </p>
            <PaginationBar
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        )}

        {/* Grid */}
        {isLoading ? (
          <div className="mx-auto grid max-w-[980px] grid-cols-2 gap-x-5 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: PAGE_SIZE }).map((_, i) => (
              <div key={i} className="animate-pulse bg-white text-center">
                <div className="mx-auto aspect-[3/4] w-full max-w-[120px] bg-slate-100" />
                <div className="mx-auto mt-2 space-y-1.5">
                  <div className="mx-auto h-3 w-3/4 rounded-md bg-slate-100" />
                  <div className="mx-auto h-2.5 w-1/2 rounded-md bg-slate-100" />
                  <div className="mx-auto h-2.5 w-2/3 rounded-md bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        ) : maids.length === 0 ? (
          <div className="border border-dashed border-slate-200 rounded-2xl py-20 text-center bg-slate-50/50">
            <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
              <EyeOff className="h-7 w-7 text-slate-300" />
            </div>
            <p className="text-sm font-semibold text-slate-500">No maid records found.</p>
            <p className="mt-1.5 text-xs text-slate-400">Try a different search or adjust filters.</p>
          </div>
        ) : (
          <div className="mx-auto grid max-w-[980px] grid-cols-2 gap-x-5 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {paginatedMaids.map((maid, i) => {
              const age = getMaidAge(maid);
              const maritalStatus = getMaidMaritalStatus(maid);
              const photoPreview = photoMap.get(maid.referenceCode) ?? (Array.isArray(maid.photoDataUrls) && maid.photoDataUrls.length > 0 ? maid.photoDataUrls[0] : maid.photoDataUrl) ?? "";
              const photoLoaded = photoMap.has(maid.referenceCode);
              const isSelected = selected.has(maid.referenceCode);
              const isVisibilitySelected = visibilitySelected.has(maid.referenceCode);
              const flagCode = getNationalityCode(maid.nationality);
              const isInFlight = inFlightRefs.has(maid.referenceCode);
              const createdTime = maid.createdAt ? new Date(maid.createdAt).getTime() : NaN;
              const isNewMaid =
                Number.isFinite(createdTime) &&
                Date.now() >= createdTime &&
                Date.now() - createdTime <= 7 * 24 * 60 * 60 * 1000;

              return (
                <div
                  key={maid.referenceCode}
                    className={`group relative flex min-w-0 flex-col items-center bg-white px-2 py-1.5 text-center transition-all duration-200 ease-in-out
                    ${isSelected
                      ? "bg-violet-50/80 ring-2 ring-violet-300"
                      : isVisibilitySelected
                        ? "bg-amber-50/80 ring-2 ring-amber-300"
                      : "hover:bg-slate-50"}
                    ${isInFlight ? "opacity-40 pointer-events-none" : ""}`}
                  style={{ animation: "fade-in-up 0.4s cubic-bezier(0.16,1,0.3,1) forwards", animationDelay: `${i * 0.04}s`, opacity: 0 }}
                >
                  {/* Photo area */}
                  <div
                    className="mx-auto w-full max-w-[120px] cursor-pointer"
                    onClick={() => navigate(adminPath(`/maid/${encodeURIComponent(maid.referenceCode)}`), { state: { fromView: view } })}
                  >
                    {photoPreview ? (
                      <img
                        src={photoPreview}
                        alt={maid.fullName}
                        className="block aspect-[3/4] w-full border border-slate-200 bg-slate-50 object-contain object-center align-top"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : !photoLoaded && maid.hasPhoto && photosLoading ? (
                      <div className="aspect-[3/4] w-full animate-pulse bg-slate-100" />
                    ) : (
                      <div className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-1.5 bg-slate-50">
                        <div className="w-10 h-10 bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-700">
                          {maid.fullName.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-[10px] text-slate-600 font-semibold">No Photo</span>
                      </div>
                    )}
                  </div>

                  {/* Card body */}
                  <div className="flex w-full min-w-0 flex-1 flex-col items-center gap-0.5 px-0.5 pt-1.5">
                    <div className="mt-0.5 flex flex-wrap items-center justify-center gap-x-1 gap-y-0 text-[10.5px] leading-tight">
                      <button
                        type="button"
                        title={isSelected ? "Unselect maid" : "Select maid"}
                        aria-label={isSelected ? "Unselect maid" : "Select maid"}
                        onClick={() => toggle(maid.referenceCode)}
                        className={`inline-flex items-center justify-center gap-0.5 font-semibold transition-colors ${
                          isSelected ? "text-violet-700" : "text-slate-700 hover:text-violet-700"
                        }`}
                      >
                        <span>{isSelected ? "Selected to delete" : "Select to delete"}</span>
                        {isSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                      </button>
                      <button
                        type="button"
                        title={isVisibilitySelected ? `Unselect maid for ${visibilityActionLabel.toLowerCase()}` : `Select maid to ${visibilityActionLabel.toLowerCase()}`}
                        aria-label={isVisibilitySelected ? `Unselect maid for ${visibilityActionLabel.toLowerCase()}` : `Select maid to ${visibilityActionLabel.toLowerCase()}`}
                        className={`inline-flex basis-full items-center justify-center gap-0.5 font-semibold transition-colors ${
                          isVisibilitySelected ? "text-amber-700" : "text-slate-700 hover:text-amber-700"
                        }`}
                        disabled={isInFlight}
                        onClick={() => toggleVisibilitySelection(maid.referenceCode)}
                      >
                        {isInFlight ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <>
                            <span>{isVisibilitySelected ? `Selected to ${visibilityActionLabel.toLowerCase()}` : `Select to ${visibilityActionLabel.toLowerCase()}`}</span>
                            {isVisibilitySelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                          </>
                        )}
                      </button>
                    </div>
                    <div className="w-full text-[10.5px] font-semibold leading-tight text-slate-900">
                      <p className="flex min-w-0 flex-wrap items-center justify-center gap-x-1">
                        <span>{maritalStatus}{age !== null ? `${maritalStatus ? " · " : ""}${age} yrs` : ""}</span>
                        {isNewMaid && (
                          <span className="animate-rainbow-new font-extrabold leading-none">NEW</span>
                        )}
                      </p>
                      <p className="flex min-w-0 flex-wrap items-center justify-center gap-x-0.5">
                        <FlagCircle code={flagCode} />
                        <span className="min-w-0 break-words">{maid.nationality}</span>
                      </p>
                    </div>
                    <p
                      className="w-full cursor-pointer break-words text-[12px] font-extrabold leading-tight text-black transition-colors hover:text-violet-800"
                      onClick={() => navigate(adminPath(`/maid/${encodeURIComponent(maid.referenceCode)}`), { state: { fromView: view } })}
                    >
                      {maid.fullName}
                    </p>
                    <div className="mt-0.5 w-full text-[10px] font-bold leading-tight text-slate-950">
                      <p className="break-all tabular-nums">Ref: {maid.referenceCode}</p>
                      <p className="break-words text-slate-800">Upd on {formatDate(maid.updatedAt)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!isLoading && maids.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button
              type="button"
              disabled={selected.size === 0}
              onClick={() => openDeleteDialog("selected")}
              className="bg-emerald-600 px-4 text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete the selected maids
            </Button>
            <Button
              type="button"
              disabled={visibilitySelected.size === 0}
              onClick={() => openVisibilityDialog({ bulk: true, makePublic: !isPublicView })}
              className="bg-amber-600 px-4 text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPublicView ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
              {visibilityActionLabel} the selected maids
            </Button>
          </div>
        )}

        {/* ── BOTTOM PAGINATION — centered ──────────────────────────────── */}
        {totalMaids > PAGE_SIZE && !isLoading && (
          <div className="flex flex-col items-center gap-2 pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-500 font-medium">
              Showing <span className="font-bold text-slate-700">{(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, totalMaids)}</span> of <span className="font-bold text-slate-700">{totalMaids}</span>
            </p>
            <PaginationBar
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>

      {sharedDialogs}

      <SendMaidToClientDialog
        maid={maidToSendThroughAgency}
        open={Boolean(maidToSendThroughAgency)}
        onOpenChange={(open) => { if (!open) setMaidToSendThroughAgency(null); }}
        actionType="interested"
        onSuccess={(updatedMaid) => { setMaids((prev) => prev.map((m) => m.referenceCode === updatedMaid.referenceCode ? updatedMaid : m)); setMaidToSendThroughAgency(null); }}
      />
      <SendMaidToClientDialog
        maid={maidToDirectHire}
        open={Boolean(maidToDirectHire)}
        onOpenChange={(open) => { if (!open) setMaidToDirectHire(null); }}
        actionType="direct_hire"
        onSuccess={(updatedMaid) => { setMaids((prev) => prev.map((m) => m.referenceCode === updatedMaid.referenceCode ? updatedMaid : m)); setMaidToDirectHire(null); }}
      />
      <SendMaidToClientDialog
        maid={maidToReject}
        open={Boolean(maidToReject)}
        onOpenChange={(open) => { if (!open) setMaidToReject(null); }}
        actionType="rejected"
        onSuccess={(updatedMaid) => { setMaids((prev) => prev.map((m) => m.referenceCode === updatedMaid.referenceCode ? updatedMaid : m)); setMaidToReject(null); }}
      />
    </div>
  );
};

export default EditMaids;
