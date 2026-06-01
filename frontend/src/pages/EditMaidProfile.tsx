import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Star, ChevronRight, User, Briefcase, Clock, FileText, Globe, Lock } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { adminPath } from "@/lib/routes";
import { getAgencyAdminAuthHeaders } from "@/lib/agencyAdminAuth";
import type { MaidProfile } from "@/lib/maids";

/* ─── Constants ─── */

const tabs = [
  { label: "Profile", icon: User },
  { label: "Skills", icon: Star },
  { label: "Employment History", icon: Briefcase },
  { label: "Availability / Remark", icon: Clock },
  { label: "Introduction", icon: FileText },
  { label: "Public Introduction", icon: Globe },
  { label: "Private Info", icon: Lock },
];

const EVAL_PARENT_DECLARATION =
  "Based on FDW's declaration, no evaluation/observation by Singapore EA or overseas training centre/EA";
const EVAL_PARENT_INTERVIEWED = "Interviewed by Singapore EA";
const EVAL_SUB_OPTIONS = [
  "Interviewed via telephone/teleconference",
  "Interviewed via videoconference",
  "Interviewed in person",
  "Interviewed in person and also made observation of FDW in the areas of work listed in table",
];

const defaultLanguages = [
  { label: "English", key: "English" },
  { label: "Mandarin / Chinese Dialect", key: "Mandarin/Chinese-Dialect" },
  { label: "Bahasa Indonesia / Malaysia", key: "Bahasa Indonesia/Malaysia" },
  { label: "Hindi", key: "Hindi" },
  { label: "Tamil", key: "Tamil" },
] as const;

const otherInformationQuestionGroups = [
  { label: "Able to handle pork?", keys: ["Able to handle pork?"] },
  { label: "Able to eat pork?", keys: ["Able to eat pork?"] },
  { label: "Able to care for dog/cat?", keys: ["Able to care for dog/cat?"] },
  { label: "Able to do simple sewing?", keys: ["Able to do simple sewing?"] },
  { label: "Able to do gardening work?", keys: ["Able to do gardening work?"] },
  { label: "Willing to wash car?", keys: ["Willing to wash car?"] },
  {
    label: "Willing to work on off-days with compensation?",
    keys: [
      "Can work on off-days with compensation?",
      "Willing to work on off-days with compensation?",
      "Willing to work on off-days with  compensation?",
    ],
  },
] as const;

const defaultWorkAreas = [
  "Care of infants/children",
  "Care of elderly",
  "Care of disabled",
  "General housework",
  "Cooking",
  "Language abilities (spoken)",
  "Other skills, if any",
] as const;

const skillRows = [
  { no: 1, label: "Care of infants/children", sub: "Please specify age range:", subField: true },
  { no: 2, label: "Care of elderly" },
  { no: 3, label: "Care of disabled" },
  { no: 4, label: "General housework" },
  { no: 5, label: "Cooking", sub: "Please specify cuisines:", subField: true },
  { no: 6, label: "Language abilities (spoken)", sub: "Please specify:", subField: true },
  { no: 7, label: "Other skills, if any", sub: "Please specify:", subField: true },
];

const pastIllnessKeys = [
  "(I) Mental illness",
  "(II) Epilepsy",
  "(III) Asthma",
  "(IV) Diabetes",
  "(V) Hypertension",
  "(VI) Tuberculosis",
  "(VII) Heart disease",
  "(VIII) Malaria",
  "(IX) Operations",
] as const;

const employmentCountries = [
  { value: "", label: "Select Country", disabled: true },
  { value: "Singapore", label: "Singapore" },
  { value: "India", label: "India" },
  { value: "Indonesia", label: "Indonesia" },
  { value: "Philippines", label: "Philippines" },
  { value: "Malaysia", label: "Malaysia" },
  { value: "Myanmar", label: "Myanmar" },
  { value: "Taiwan", label: "Taiwan" },
  { value: "Brunei", label: "Brunei" },
  { value: "Kuwait", label: "Kuwait" },
  { value: "Qatar", label: "Qatar" },
  { value: "Egypt", label: "Egypt" },
  { value: "United Arab Emirates", label: "United Arab Emirates" },
  { value: "Saudi Arabia", label: "Saudi Arabia" },
  { value: "China", label: "China" },
  { value: "South Korea", label: "South Korea" },
  { value: "United Kingdom", label: "United Kingdom" },
  { value: "United States", label: "United States" },
  { value: "Canada", label: "Canada" },
  { value: "Australia", label: "Australia" },
  { value: "Japan", label: "Japan" },
  { value: "New Zealand", label: "New Zealand" },
  { value: "South Africa", label: "South Africa" },
  { value: "Other Countries", label: "Other Countries" },
];

/* ─── Types ─── */

type SkillsPreferencesForm = {
  indianMaidCategory: string;
  availabilityRemark: string;
  privateInfo: string;
  offDaysPerMonth: string;
  availabilityInterviewOptions: string[];
  workAreaNotes: Record<string, string>;
  otherInformation: Record<string, boolean>;
  interviewedBy: string;
  referredBy: string;
  evaluationMethods: string[];
  sgExperience?: boolean;
};

type WorkAreaFormItem = {
  willing: boolean;
  experience: boolean;
  evaluation: string;
  yearsOfExperience?: string;
  rating?: number | null;
  note?: string;
};

type WorkAreasForm = Record<string, WorkAreaFormItem>;

type EmploymentHistoryRow = {
  from: string;
  to: string;
  country: string;
  employer: string;
  duties: string;
  remarks: string;
};

type IntroductionForm = {
  intro: string;
  publicIntro: string;
  allergies: string;
  physicalDisabilities: string;
  dietaryRestrictions: string;
  foodHandlingPreferences: string;
  pastIllnesses: Record<string, boolean>;
  otherIllnesses: string;
  otherRemarks: string;
  availability: string;
  contractEnds: string;
  presentSalary: string;
  expectedSalary: string;
  offdayCompensation: string;
  agesOfChildren: string;
  maidLoan: string;
};

type AgencyContactForm = {
  companyName: string;
  licenseNo: string;
  contactPerson: string;
  phone: string;
  passportNo: string;
  homeCountryContactNumber: string;
};

type MaidProfileFormState = {
  fullName: string;
  referenceCode: string;
  type: string;
  nationality: string;
  dateOfBirth: string;
  placeOfBirth: string;
  height: string;
  weight: string;
  religion: string;
  maritalStatus: string;
  numberOfChildren: string;
  numberOfSiblings: string;
  homeAddress: string;
  airportRepatriation: string;
  educationLevel: string;
  languageSkills: Record<string, string>;
  newLanguageName: string;
  skillsPreferences: SkillsPreferencesForm;
  workAreas: WorkAreasForm;
  employmentHistory: EmploymentHistoryRow[];
  introduction: IntroductionForm;
  agencyContact: AgencyContactForm;
  isPublic: boolean;
};

/* ─── Helper converters ─── */

const toStringRecord = (value: unknown) => {
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(
      ([k, v]) => typeof k === "string" && typeof v === "string",
    ),
  ) as Record<string, string>;
};

const toBooleanRecord = (value: unknown) => {
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(
      ([k, v]) => typeof k === "string" && typeof v === "boolean",
    ),
  ) as Record<string, boolean>;
};

const buildWorkAreaEvaluation = (rating: number | null, note: string) => {
  const trimmed = note.trim();
  if (rating === null) return trimmed || "N.A.";
  return trimmed ? `${rating}/5 - ${trimmed}` : `${rating}/5`;
};

const toSkillsPreferences = (value: unknown): SkillsPreferencesForm => {
  const obj = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const otherInformation = toBooleanRecord(obj.otherInformation);
  for (const group of otherInformationQuestionGroups) {
    for (const key of group.keys) {
      if (otherInformation[key] === undefined) otherInformation[key] = false;
    }
  }
  return {
    indianMaidCategory: typeof obj.indianMaidCategory === "string" ? obj.indianMaidCategory : "",
    availabilityRemark: typeof obj.availabilityRemark === "string" ? obj.availabilityRemark : "",
    privateInfo: typeof obj.privateInfo === "string" ? obj.privateInfo : "",
    offDaysPerMonth: typeof obj.offDaysPerMonth === "string" ? obj.offDaysPerMonth : "2",
    availabilityInterviewOptions: Array.isArray(obj.availabilityInterviewOptions)
      ? (obj.availabilityInterviewOptions as unknown[]).filter((i): i is string => typeof i === "string")
      : [],
    workAreaNotes: toStringRecord(obj.workAreaNotes),
    otherInformation,
    interviewedBy: typeof obj.interviewedBy === "string" ? obj.interviewedBy : "",
    referredBy: typeof obj.referredBy === "string" ? obj.referredBy : "",
    evaluationMethods: Array.isArray(obj.evaluationMethods)
      ? (obj.evaluationMethods as unknown[]).filter((i): i is string => typeof i === "string")
      : [],
    sgExperience: typeof obj.sgExperience === "boolean" ? obj.sgExperience : undefined,
  };
};

const toWorkAreas = (value: unknown): WorkAreasForm => {
  const result: WorkAreasForm = {};
  if (value && typeof value === "object") {
    for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
      if (!raw || typeof raw !== "object") continue;
      const item = raw as Record<string, unknown>;
      const normalizedKey =
        key === "Language Skill" ? "Language abilities (spoken)"
        : key === "Other Skill" ? "Other skills, if any"
        : key;
      const rating = typeof item.rating === "number" ? item.rating : null;
      const note = typeof item.note === "string" ? item.note : "";
      result[normalizedKey] = {
        willing: Boolean(item.willing),
        experience: Boolean(item.experience),
        evaluation:
          typeof item.evaluation === "string" && item.evaluation.trim()
            ? item.evaluation
            : buildWorkAreaEvaluation(rating, note),
        yearsOfExperience: typeof item.yearsOfExperience === "string" ? item.yearsOfExperience : "",
        rating,
        note,
      };
    }
  }
  for (const key of defaultWorkAreas) {
    if (!result[key]) {
      result[key] = {
        willing: false,
        experience: false,
        evaluation: "N.A.",
        yearsOfExperience: "",
        rating: null,
        note: "",
      };
    }
  }
  return result;
};

const toEmploymentHistory = (value: unknown): EmploymentHistoryRow[] => {
  if (!Array.isArray(value))
    return [{ from: "", to: "", country: "", employer: "", duties: "", remarks: "" }];
  const mapped = value
    .filter((row): row is Record<string, unknown> => Boolean(row && typeof row === "object"))
    .map((row) => ({
      from: typeof row.from === "string" ? row.from : "",
      to: typeof row.to === "string" ? row.to : "",
      country: typeof row.country === "string" ? row.country : "",
      employer: typeof row.employer === "string" ? row.employer : "",
      duties: typeof row.duties === "string" ? row.duties : "",
      remarks: typeof row.remarks === "string" ? row.remarks : "",
    }));
  return mapped.length > 0
    ? mapped
    : [{ from: "", to: "", country: "", employer: "", duties: "", remarks: "" }];
};

const toIntroduction = (value: unknown): IntroductionForm => {
  const obj = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const pastIllnesses = toBooleanRecord(obj.pastIllnesses);
  const legacyMap: Record<string, (typeof pastIllnessKeys)[number]> = {
    "Mental illness": "(I) Mental illness",
    Epilepsy: "(II) Epilepsy",
    Asthma: "(III) Asthma",
    Diabetes: "(IV) Diabetes",
    Hypertension: "(V) Hypertension",
    Tuberculosis: "(VI) Tuberculosis",
    "Heart disease": "(VII) Heart disease",
    Malaria: "(VIII) Malaria",
    Operations: "(IX) Operations",
  };
  for (const [legacy, next] of Object.entries(legacyMap)) {
    if (pastIllnesses[next] === undefined && pastIllnesses[legacy] !== undefined) {
      pastIllnesses[next] = pastIllnesses[legacy];
    }
  }
  for (const key of pastIllnessKeys) {
    if (pastIllnesses[key] === undefined) pastIllnesses[key] = false;
  }
  return {
    intro: typeof obj.intro === "string" ? obj.intro : "",
    publicIntro: typeof obj.publicIntro === "string" ? obj.publicIntro : "",
    allergies: typeof obj.allergies === "string" ? obj.allergies : "",
    physicalDisabilities: typeof obj.physicalDisabilities === "string" ? obj.physicalDisabilities : "",
    dietaryRestrictions: typeof obj.dietaryRestrictions === "string" ? obj.dietaryRestrictions : "",
    foodHandlingPreferences:
      typeof obj.foodHandlingPreferences === "string" ? obj.foodHandlingPreferences : "",
    pastIllnesses,
    otherIllnesses: typeof obj.otherIllnesses === "string" ? obj.otherIllnesses : "",
    otherRemarks: typeof obj.otherRemarks === "string" ? obj.otherRemarks : "",
    availability: typeof obj.availability === "string" ? obj.availability : "",
    contractEnds: typeof obj.contractEnds === "string" ? obj.contractEnds : "",
    presentSalary: typeof obj.presentSalary === "string" ? obj.presentSalary : "",
    expectedSalary: typeof obj.expectedSalary === "string" ? obj.expectedSalary : "",
    offdayCompensation: typeof obj.offdayCompensation === "string" ? obj.offdayCompensation : "",
    agesOfChildren: typeof obj.agesOfChildren === "string" ? obj.agesOfChildren : "",
    maidLoan: typeof obj.maidLoan === "string" ? obj.maidLoan : "",
  };
};

const toAgencyContact = (value: unknown): AgencyContactForm => {
  const obj = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    companyName: typeof obj.companyName === "string" ? obj.companyName : "",
    licenseNo: typeof obj.licenseNo === "string" ? obj.licenseNo : "",
    contactPerson: typeof obj.contactPerson === "string" ? obj.contactPerson : "",
    phone: typeof obj.phone === "string" ? obj.phone : "",
    passportNo: typeof obj.passportNo === "string" ? obj.passportNo : "",
    homeCountryContactNumber:
      typeof obj.homeCountryContactNumber === "string" ? obj.homeCountryContactNumber : "",
  };
};

const buildFormState = (maid: MaidProfile): MaidProfileFormState => ({
  fullName: maid.fullName ?? "",
  referenceCode: maid.referenceCode ?? "",
  type: maid.type ?? "",
  nationality: maid.nationality ?? "",
  dateOfBirth: maid.dateOfBirth ? maid.dateOfBirth.slice(0, 10) : "",
  placeOfBirth: maid.placeOfBirth ?? "",
  height: String(maid.height ?? ""),
  weight: String(maid.weight ?? ""),
  religion: maid.religion ?? "",
  maritalStatus: maid.maritalStatus ?? "",
  numberOfChildren: String(maid.numberOfChildren ?? 0),
  numberOfSiblings: String(maid.numberOfSiblings ?? 0),
  homeAddress: maid.homeAddress ?? "",
  airportRepatriation: maid.airportRepatriation ?? "",
  educationLevel: maid.educationLevel ?? "",
  languageSkills: toStringRecord(maid.languageSkills),
  newLanguageName: "",
  skillsPreferences: toSkillsPreferences(maid.skillsPreferences),
  workAreas: toWorkAreas(maid.workAreas),
  employmentHistory: toEmploymentHistory(maid.employmentHistory),
  introduction: toIntroduction(maid.introduction),
  agencyContact: toAgencyContact(maid.agencyContact),
  isPublic: Boolean(maid.isPublic),
});

/* ─── Shared UI Primitives (from AddMaid) ─── */

const TabCard = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-white border border-slate-200 rounded-b-2xl rounded-tr-2xl shadow-sm p-6 md:p-8 space-y-8">
    {children}
  </div>
);

const SectionHeader = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center gap-3 mb-4">
    <div className="h-1 w-6 rounded-full bg-amber-400" />
    <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider">{children}</h4>
    <div className="flex-1 h-px bg-slate-100" />
  </div>
);

const FormRow2Col = ({ left, right }: { left: React.ReactNode; right?: React.ReactNode }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
    <div>{left}</div>
    {right ? <div>{right}</div> : <div />}
  </div>
);

const Field = ({
  label,
  children,
  error,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
}) => (
  <div className="space-y-1.5 w-full">
    <Label className="text-sm font-semibold text-slate-900 uppercase tracking-wide">{label}</Label>
    {children}
    {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
  </div>
);

const StyledInput = ({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    {...props}
    className={`
      w-full h-11 rounded-xl border border-slate-600 bg-slate-50/80
      px-3.5 text-sm text-slate-800 font-medium
      shadow-sm
      transition-all duration-200 ease-in-out
      placeholder:text-slate-600 placeholder:font-normal
      focus:outline-none
      focus:border-amber-400 focus:bg-white
      focus:shadow-[0_0_0_3px_rgba(251,191,36,0.18),0_1px_4px_rgba(0,0,0,0.06)]
      hover:border-slate-300 hover:bg-white
      disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-100
      ${className}
    `}
  />
);

const StyledSelect = ({
  options,
  className = "",
  value,
  onChange,
  name,
}: {
  options: Array<string | { value: string; label: string; disabled?: boolean }>;
  className?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  name?: string;
}) => (
  <select
    name={name}
    value={value}
    onChange={onChange}
    className={`
      w-full h-11 rounded-xl border border-slate-500 bg-slate-50/80
      px-3.5 text-sm text-slate-800 font-medium
      shadow-sm appearance-none
      transition-all duration-200 ease-in-out
      focus:outline-none focus:border-amber-400 focus:bg-white
      focus:shadow-[0_0_0_3px_rgba(251,191,36,0.18),0_1px_4px_rgba(0,0,0,0.06)]
      hover:border-slate-300 hover:bg-white
      ${className}
    `}
  >
    {options.map((opt) => {
      if (typeof opt === "string") return <option key={opt} value={opt}>{opt}</option>;
      return (
        <option key={opt.value} value={opt.value} disabled={opt.disabled}>
          {opt.label}
        </option>
      );
    })}
  </select>
);

const RadioGroup = ({
  name,
  options,
  value,
  onValueChange,
}: {
  name: string;
  options: string[];
  value?: string;
  onValueChange?: (next: string) => void;
}) => (
  <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={name}>
    {options.map((opt) => {
      const isSelected = value === opt;
      return (
        <button
          key={opt}
          type="button"
          role="radio"
          aria-checked={isSelected}
          onClick={() => onValueChange?.(opt)}
          className={`
            relative inline-flex items-center justify-center
            px-3.5 py-1.5 rounded-full text-sm font-semibold
            border transition-all duration-150 ease-in-out
            select-none cursor-pointer
            focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-1
            ${
              isSelected
                ? "bg-amber-400 border-amber-400 text-slate-900 shadow-sm shadow-amber-200/60"
                : "bg-white border-slate-200 text-slate-900 hover:border-amber-300 hover:text-slate-700 hover:bg-amber-50/50"
            }
          `}
        >
          {isSelected && (
            <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-slate-900/40 inline-block" />
          )}
          {opt}
        </button>
      );
    })}
  </div>
);

const YesNo = ({
  name,
  value,
  onValueChange,
}: {
  name: string;
  value?: boolean;
  onValueChange?: (next: boolean) => void;
}) => (
  <div
    className="inline-flex rounded-lg border border-slate-200 bg-slate-100/80 p-0.5 gap-0.5"
    role="radiogroup"
    aria-label={name}
  >
    {([true, false] as const).map((bool) => {
      const isSelected = value === bool;
      const label = bool ? "Yes" : "No";
      return (
        <button
          key={label}
          type="button"
          role="radio"
          aria-checked={isSelected}
          onClick={() => onValueChange?.(bool)}
          className={`
            relative px-3.5 py-1 rounded-md text-sm font-semibold
            transition-all duration-150 ease-in-out
            focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-1
            min-w-[44px] text-center
            ${
              isSelected
                ? bool
                  ? "bg-emerald-500 text-white shadow-sm shadow-emerald-200/70"
                  : "bg-rose-400 text-white shadow-sm shadow-rose-200/70"
                : "bg-transparent text-slate-900 hover:text-slate-600 hover:bg-white/60"
            }
          `}
        >
          {label}
        </button>
      );
    })}
  </div>
);

const StarRating = ({
  value,
  onChange,
  name,
}: {
  value: number | null;
  onChange: (next: number | null) => void;
  name?: string;
}) => (
  <div className="flex items-center gap-1">
    {name && <input type="hidden" name={name} value={value === null ? "" : String(value)} />}
    {Array.from({ length: 5 }, (_, i) => {
      const sv = i + 1;
      const active = value !== null && sv <= value;
      return (
        <button
          key={sv}
          type="button"
          className="p-0.5 transition-transform hover:scale-110"
          onClick={() => onChange(value === sv ? null : sv)}
        >
          <Star
            className={`h-4 w-4 ${active ? "fill-amber-400 text-amber-400" : "text-slate-600 hover:text-amber-300"}`}
          />
        </button>
      );
    })}
    <button
      type="button"
      className={`ml-2 rounded-lg border px-2 py-0.5 text-[11px] font-medium transition-colors ${
        value === null
          ? "bg-slate-100 text-slate-500 border-slate-200"
          : "bg-white text-slate-400 border-slate-200 hover:bg-slate-50"
      }`}
      onClick={() => onChange(null)}
    >
      N.A.
    </button>
  </div>
);

const EvalCheckbox = ({
  label,
  checked,
  onChange,
  disabled = false,
  indented = false,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  indented?: boolean;
}) => (
  <label
    className={`
      flex items-start gap-2.5 text-sm py-2.5 border-b border-slate-100 last:border-0 select-none
      ${indented ? "pl-7" : ""}
      ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer group"}
    `}
  >
    <div
      className={`
        mt-0.5 h-[18px] w-[18px] shrink-0 rounded-md border-2
        flex items-center justify-center
        transition-all duration-150
        ${checked ? "bg-amber-400 border-amber-400" : "bg-white border-slate-400 group-hover:border-amber-400"}
        ${disabled ? "pointer-events-none" : ""}
      `}
    >
      {checked && (
        <svg
          className="h-2.5 w-2.5 text-slate-900"
          fill="none"
          viewBox="0 0 12 12"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
        </svg>
      )}
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
    </div>
    <span
      className={`leading-snug transition-colors ${
        checked ? "text-slate-800 font-semibold" : "text-slate-700 font-normal"
      }`}
    >
      {label}
    </span>
  </label>
);

type SaveButtonsProps = {
  onSave?: () => void;
  isSaving?: boolean;
  primaryLabel?: string;
};

const SaveButtons = ({ onSave, isSaving, primaryLabel }: SaveButtonsProps) => (
  <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
    <Button
      type="button"
      onClick={() => void onSave?.()}
      disabled={isSaving}
      className="rounded-xl bg-amber-400 text-slate-900 hover:bg-amber-500 font-semibold px-6 shadow-md shadow-amber-200"
    >
      {isSaving ? "Saving..." : primaryLabel || "Save Changes"}
      {!isSaving && <ChevronRight className="h-4 w-4 ml-1" />}
    </Button>
  </div>
);

/* ─── Tab Props ─── */

type TabProps = {
  form: MaidProfileFormState;
  setForm: React.Dispatch<React.SetStateAction<MaidProfileFormState | null>>;
  onSave: () => void;
  isSaving: boolean;
  primaryLabel?: string;
};

/* ─────────────────────────────
   TAB 1 – PROFILE
───────────────────────────── */
const ProfileTab = ({ form, setForm, onSave, isSaving, primaryLabel }: TabProps) => {
  const currentYear = new Date().getFullYear();
  const years = ["--", ...Array.from({ length: currentYear + 10 - 1960 + 1 }, (_, i) => String(1960 + i))];
  const days = ["--", ...Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0"))];
  const months = ["--", ...Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"))];

  const dobMatch = form.dateOfBirth.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const [dobDraft, setDobDraft] = useState({
    day: dobMatch?.[3] ?? "--",
    month: dobMatch?.[2] ?? "--",
    year: dobMatch?.[1] ?? "--",
  });

  const contractMatch = form.introduction.contractEnds.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const [contractDraft, setContractDraft] = useState({
    day: contractMatch?.[3] ?? "--",
    month: contractMatch?.[2] ?? "--",
    year: contractMatch?.[1] ?? "--",
  });

  useEffect(() => {
    const m = form.dateOfBirth.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) setDobDraft({ day: m[3], month: m[2], year: m[1] });
  }, [form.dateOfBirth]);

  useEffect(() => {
    const m = form.introduction.contractEnds.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) setContractDraft({ day: m[3], month: m[2], year: m[1] });
  }, [form.introduction.contractEnds]);

  const buildDob = (draft: { day: string; month: string; year: string }) => {
    if (draft.day === "--" || draft.month === "--" || draft.year === "--") return "";
    return `${draft.year}-${draft.month}-${draft.day}`;
  };

  const setIntroField = (key: string, value: unknown) =>
    setForm((prev) => (prev ? { ...prev, introduction: { ...prev.introduction, [key]: value } } : prev));

  const setSkillsPrefField = (key: string, value: unknown) =>
    setForm((prev) =>
      prev ? { ...prev, skillsPreferences: { ...prev.skillsPreferences, [key]: value } } : prev,
    );

  const otherInformation = form.skillsPreferences.otherInformation;
  const pastIllnesses = form.introduction.pastIllnesses;

  // Extra languages
  const fixedLanguageKeys = defaultLanguages.map((l) => l.key) as string[];
  const extraLanguageKeys = Object.keys(form.languageSkills).filter(
    (k) => !fixedLanguageKeys.includes(k),
  );

  const [newLanguageName, setNewLanguageName] = useState("");

  const addLanguage = () => {
    const name = newLanguageName.trim();
    if (!name) return;
    setForm((prev) => {
      if (!prev) return prev;
      if (prev.languageSkills[name] !== undefined) return prev;
      return { ...prev, languageSkills: { ...prev.languageSkills, [name]: "" } };
    });
    setNewLanguageName("");
  };

  const removeLanguage = (lang: string) =>
    setForm((prev) => {
      if (!prev) return prev;
      const next = { ...prev.languageSkills };
      delete next[lang];
      return { ...prev, languageSkills: next };
    });

  return (
    <TabCard>
      <h3 className="text-xl font-bold text-slate-800">(A) Profile of FDW</h3>

      {/* A1 Personal Info */}
      <section>
        <SectionHeader>A1. Personal Information</SectionHeader>
        <div className="space-y-5">
          <FormRow2Col
            left={
              <Field label="Maid Name *">
                <StyledInput
                  value={form.fullName}
                  onChange={(e) => setForm((p) => (p ? { ...p, fullName: e.target.value } : p))}
                  placeholder="Full legal name"
                />
              </Field>
            }
            right={
              <Field label="Ref Code *">
                <StyledInput
                  value={form.referenceCode}
                  onChange={(e) => setForm((p) => (p ? { ...p, referenceCode: e.target.value } : p))}
                  placeholder="e.g. FIL-001"
                />
              </Field>
            }
          />

          <FormRow2Col
            left={
              <Field label="Type">
                <StyledSelect
                  value={form.type}
                  onChange={(e) => setForm((p) => (p ? { ...p, type: e.target.value } : p))}
                  options={[
                    { value: "", label: "Select Type", disabled: true },
                    "New maid",
                    "Transfer maid",
                    "APS maid",
                    "Ex-Singapore maid",
                    "Ex-Hong Kong maid",
                    "Ex-Taiwan maid",
                    "Ex-Malaysia maid",
                    "Ex-Middle East maid",
                    "Applying to work in Hong Kong",
                    "Applying to work in Canada",
                    "Applying to work in Taiwan",
                  ]}
                />
              </Field>
            }
            right={
              <Field label="Nationality">
                <StyledSelect
                  value={form.nationality}
                  onChange={(e) => setForm((p) => (p ? { ...p, nationality: e.target.value } : p))}
                  options={[
                    { value: "", label: "Select Nationality", disabled: true },
                    "Filipino maid",
                    "Indonesian maid",
                    "Indian maid",
                    "Myanmar maid",
                    "Sri Lankan maid",
                    "Bangladeshi maid",
                    "Nepali maid",
                    "Cambodian maid",
                    "Others",
                  ]}
                />
              </Field>
            }
          />

          <FormRow2Col
            left={<div />}
            right={
              <Field label="Indian Maid Category">
                <StyledSelect
                  options={[
                    "Select",
                    "Mizoram maid",
                    "Darjeeling maid",
                    "Manipur maid",
                    "Punjabi maid",
                    "Others",
                  ]}
                  value={form.skillsPreferences.indianMaidCategory || "Select"}
                  onChange={(e) =>
                    setSkillsPrefField(
                      "indianMaidCategory",
                      e.target.value === "Select" ? "" : e.target.value,
                    )
                  }
                />
              </Field>
            }
          />

          <FormRow2Col
            left={
              <Field label="Date of Birth *">
                <div className="flex gap-2">
                  {[
                    { opts: days, key: "day", w: "w-20" },
                    { opts: months, key: "month", w: "w-20" },
                    { opts: years, key: "year", w: "w-28" },
                  ].map(({ opts, key, w }) => (
                    <select
                      key={key}
                      value={(dobDraft as Record<string, string>)[key]}
                      onChange={(e) => {
                        const next = { ...dobDraft, [key]: e.target.value };
                        setDobDraft(next);
                        const dob = buildDob(next);
                        setForm((p) => (p ? { ...p, dateOfBirth: dob } : p));
                      }}
                      className={`${w} h-11 rounded-xl border border-slate-500 bg-slate-50/80 px-2 text-sm font-medium text-slate-800 shadow-sm transition-all duration-200 focus:outline-none focus:border-amber-400 focus:bg-white focus:shadow-[0_0_0_3px_rgba(251,191,36,0.18)] hover:border-slate-300 hover:bg-white`}
                    >
                      {opts.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  ))}
                </div>
              </Field>
            }
            right={
              <Field label="Place of Birth">
                <StyledInput
                  value={form.placeOfBirth}
                  onChange={(e) => setForm((p) => (p ? { ...p, placeOfBirth: e.target.value } : p))}
                  placeholder="City / Province"
                />
              </Field>
            }
          />

          <FormRow2Col
            left={
              <Field label="Height">
                <StyledSelect
                  value={form.height || ""}
                  onChange={(e) => setForm((p) => (p ? { ...p, height: e.target.value } : p))}
                  options={[
                    { value: "", label: "Select Height", disabled: true },
                    ...Array.from({ length: 81 }, (_, i) => {
                      const cm = 150 + i;
                      const totalInches = cm / 2.54;
                      const feet = Math.floor(totalInches / 12);
                      const inches = Math.round(totalInches % 12);
                      return { value: String(cm), label: `${cm} cm (${feet}'${inches}")` };
                    }),
                  ]}
                />
              </Field>
            }
            right={
              <Field label="Weight">
                <StyledSelect
                  value={form.weight || ""}
                  onChange={(e) => setForm((p) => (p ? { ...p, weight: e.target.value } : p))}
                  options={[
                    { value: "", label: "Select Weight", disabled: true },
                    ...Array.from({ length: 101 }, (_, i) => {
                      const kg = 40 + i;
                      const lbs = Math.round(kg * 2.20462);
                      return { value: String(kg), label: `${kg} kg (${lbs} lbs)` };
                    }),
                  ]}
                />
              </Field>
            }
          />

          <Field label="Residential Address in Home Country">
            <StyledInput
              value={form.homeAddress}
              onChange={(e) => setForm((p) => (p ? { ...p, homeAddress: e.target.value } : p))}
              placeholder="Street, City, Province"
            />
          </Field>

          <FormRow2Col
            left={
              <Field label="Port / Airport for Repatriation">
                <StyledInput
                  value={form.airportRepatriation}
                  onChange={(e) =>
                    setForm((p) => (p ? { ...p, airportRepatriation: e.target.value } : p))
                  }
                />
              </Field>
            }
            right={
              <Field label="Contact Number in Home Country">
                <StyledInput
                  value={form.agencyContact.homeCountryContactNumber}
                  onChange={(e) =>
                    setForm((p) =>
                      p
                        ? {
                            ...p,
                            agencyContact: {
                              ...p.agencyContact,
                              homeCountryContactNumber: e.target.value,
                            },
                          }
                        : p,
                    )
                  }
                  placeholder="+63 XXX XXXX"
                />
              </Field>
            }
          />

          <FormRow2Col
            left={
              <Field label="Education Level">
                <StyledSelect
                  options={[
                    { value: "", label: "Select Education", disabled: true },
                    "Primary Level (≤6 yrs)",
                    "Secondary Level (7–9 yrs)",
                    "High School (10–12 yrs)",
                    "Vocational Course",
                    "College / Degree (≥13 yrs)",
                  ]}
                  value={form.educationLevel}
                  onChange={(e) => setForm((p) => (p ? { ...p, educationLevel: e.target.value } : p))}
                />
              </Field>
            }
            right={
              <Field label="Religion">
                <StyledSelect
                  options={[
                    { value: "", label: "Select Religion", disabled: true },
                    "Catholic",
                    "Christian",
                    "Muslim",
                    "Hindu",
                    "Buddhist",
                    "Sikh",
                    "Free Thinker",
                    "Others",
                  ]}
                  value={form.religion}
                  onChange={(e) => setForm((p) => (p ? { ...p, religion: e.target.value } : p))}
                />
              </Field>
            }
          />

          <FormRow2Col
            left={
              <Field label="Number of Siblings">
                <StyledInput
                  type="text"
                  value={form.numberOfSiblings}
                  onChange={(e) =>
                    setForm((p) => (p ? { ...p, numberOfSiblings: e.target.value } : p))
                  }
                />
              </Field>
            }
            right={
              <Field label="Marital Status">
                <StyledSelect
                  options={[
                    { value: "", label: "Select Status", disabled: true },
                    "Single",
                    "Single Parent",
                    "Married",
                    "Divorced",
                    "Widowed",
                    "Separated",
                  ]}
                  value={form.maritalStatus}
                  onChange={(e) => setForm((p) => (p ? { ...p, maritalStatus: e.target.value } : p))}
                />
              </Field>
            }
          />

          <FormRow2Col
            left={
              <Field label="Number of Children">
                <StyledSelect
                  options={["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]}
                  value={form.numberOfChildren}
                  onChange={(e) =>
                    setForm((p) => (p ? { ...p, numberOfChildren: e.target.value } : p))
                  }
                />
              </Field>
            }
            right={
              <Field label="Ages of Children">
                <StyledInput
                  value={form.introduction.agesOfChildren}
                  onChange={(e) => setIntroField("agesOfChildren", e.target.value)}
                  placeholder="e.g. 3, 7, 12"
                />
              </Field>
            }
          />

          <FormRow2Col
            left={
              <Field label="Present Salary (S$)">
                <StyledInput
                  value={form.introduction.presentSalary}
                  onChange={(e) => setIntroField("presentSalary", e.target.value)}
                  placeholder="e.g. 650"
                />
              </Field>
            }
            right={
              <Field label="Expected Salary (S$)">
                <StyledInput
                  value={form.introduction.expectedSalary}
                  onChange={(e) => setIntroField("expectedSalary", e.target.value)}
                  placeholder="e.g. 700"
                />
              </Field>
            }
          />

          <FormRow2Col
            left={
              <Field label="Availability">
                <StyledInput
                  value={form.introduction.availability}
                  onChange={(e) => setIntroField("availability", e.target.value)}
                  placeholder="e.g. Immediately"
                />
              </Field>
            }
            right={
              <Field label="Contract Ends">
                <div className="flex gap-2">
                  {[
                    { opts: days, key: "day", w: "w-20" },
                    { opts: months, key: "month", w: "w-20" },
                    { opts: years, key: "year", w: "w-28" },
                  ].map(({ opts, key, w }) => (
                    <select
                      key={key}
                      value={(contractDraft as Record<string, string>)[key]}
                      onChange={(e) => {
                        const next = { ...contractDraft, [key]: e.target.value };
                        setContractDraft(next);
                        const dt = buildDob(next);
                        setIntroField("contractEnds", dt);
                      }}
                      className={`${w} h-11 rounded-xl border border-slate-200 bg-slate-50/80 px-2 text-sm font-medium text-slate-800 shadow-sm transition-all duration-200 focus:outline-none focus:border-amber-400 focus:bg-white focus:shadow-[0_0_0_3px_rgba(251,191,36,0.18)] hover:border-slate-300 hover:bg-white`}
                    >
                      {opts.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  ))}
                </div>
              </Field>
            }
          />

          <FormRow2Col
            left={
              <Field label="Maid Loan (S$)">
                <StyledInput
                  value={form.introduction.maidLoan}
                  onChange={(e) => setIntroField("maidLoan", e.target.value)}
                  placeholder="0"
                />
              </Field>
            }
            right={
              <Field label="Off-day Compensation (S$/day)">
                <StyledInput
                  value={form.introduction.offdayCompensation}
                  onChange={(e) => setIntroField("offdayCompensation", e.target.value)}
                />
              </Field>
            }
          />
        </div>
      </section>

      {/* Language Skills */}
      <section>
        <SectionHeader>Language Skills</SectionHeader>
        <div className="space-y-1 bg-slate-50 rounded-xl p-4 border border-slate-100">
          {defaultLanguages.map((lang) => (
            <div
              key={lang.key}
              className="flex flex-col sm:flex-row sm:items-center gap-3 py-3 border-b border-slate-100 last:border-0"
            >
              <span className="text-base font-medium text-slate-700 w-56 shrink-0">{lang.label}</span>
              <RadioGroup
                name={`lang_${lang.key}`}
                options={["Zero", "Poor", "Little", "Fair", "Good"]}
                value={form.languageSkills[lang.key] ?? ""}
                onValueChange={(next) =>
                  setForm((p) =>
                    p ? { ...p, languageSkills: { ...p.languageSkills, [lang.key]: next } } : p,
                  )
                }
              />
            </div>
          ))}
          {extraLanguageKeys.map((lang) => (
            <div
              key={lang}
              className="flex flex-col sm:flex-row sm:items-center gap-3 py-3 border-b border-slate-100 last:border-0"
            >
              <span className="text-sm font-medium text-slate-700 w-56 shrink-0">{lang}</span>
              <div className="flex items-center gap-4 flex-wrap">
                <RadioGroup
                  name={`lang_${lang}`}
                  options={["Zero", "Poor", "Little", "Fair", "Good"]}
                  value={form.languageSkills[lang] ?? ""}
                  onValueChange={(next) =>
                    setForm((p) =>
                      p ? { ...p, languageSkills: { ...p.languageSkills, [lang]: next } } : p,
                    )
                  }
                />
                <button
                  type="button"
                  onClick={() => removeLanguage(lang)}
                  className="text-xs text-red-400 hover:text-red-600 font-semibold underline underline-offset-2 transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
          <div className="flex gap-2 pt-3">
            <StyledInput
              value={newLanguageName}
              onChange={(e) => setNewLanguageName(e.target.value)}
              placeholder="Add other language..."
              className="max-w-xs"
            />
            <Button
              type="button"
              variant="outline"
              onClick={addLanguage}
              disabled={!newLanguageName.trim()}
              className="rounded-xl"
            >
              Add
            </Button>
          </div>
        </div>
      </section>

      {/* Other Information */}
      <section>
        <SectionHeader>Other Information</SectionHeader>
        <div className="space-y-0 bg-slate-50 rounded-xl p-4 border border-slate-100">
          {otherInformationQuestionGroups.map((group) => (
            <div
              key={group.label}
              className="flex items-center justify-between gap-4 py-3 border-b border-slate-100 last:border-0"
            >
              <span className="text-base text-slate-900">{group.label}</span>
              <YesNo
                name={`other_${group.label}`}
                value={group.keys.some((k) => Boolean(otherInformation[k]))}
                onValueChange={(next) =>
                  setForm((p) => {
                    if (!p) return p;
                    const nextOther = { ...p.skillsPreferences.otherInformation };
                    for (const key of group.keys) nextOther[key] = next;
                    return {
                      ...p,
                      skillsPreferences: { ...p.skillsPreferences, otherInformation: nextOther },
                    };
                  })
                }
              />
            </div>
          ))}
          <div className="flex items-center justify-between gap-4 pt-3">
            <span className="text-base text-slate-700">Number of off-days per month</span>
            <div className="flex items-center gap-2">
              <StyledInput
                className="w-20"
                value={form.skillsPreferences.offDaysPerMonth}
                onChange={(e) => setSkillsPrefField("offDaysPerMonth", e.target.value)}
              />
              <span className="text-base text-slate-700">day(s)</span>
            </div>
          </div>
        </div>
      </section>

      {/* Medical History */}
      <section>
        <SectionHeader>A2. Medical History / Dietary Restrictions</SectionHeader>
        <div className="space-y-4">
          <Field label="Allergies (if any)">
            <StyledInput
              value={form.introduction.allergies}
              onChange={(e) => setIntroField("allergies", e.target.value)}
              placeholder="None"
            />
          </Field>

          <div>
            <p className="text-sm font-semibold text-slate-600 mb-3">Past and existing illnesses:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-0 bg-slate-50 rounded-xl p-4 border border-slate-100">
              {pastIllnessKeys.map((key) => (
                <div
                  key={key}
                  className="flex items-center justify-between gap-3 py-2.5 border-b border-slate-100 last:border-0"
                >
                  <span className="text-sm text-slate-700">{key}</span>
                  <YesNo
                    name={`illness_${key}`}
                    value={pastIllnesses[key]}
                    onValueChange={(next) =>
                      setForm((p) =>
                        p
                          ? {
                              ...p,
                              introduction: {
                                ...p.introduction,
                                pastIllnesses: { ...p.introduction.pastIllnesses, [key]: next },
                              },
                            }
                          : p,
                      )
                    }
                  />
                </div>
              ))}
              <div className="flex items-center gap-3 py-2.5">
                <span className="text-sm text-slate-700">(X) Others:</span>
                <StyledInput
                  className="w-40 h-9"
                  value={form.introduction.otherIllnesses}
                  onChange={(e) => setIntroField("otherIllnesses", e.target.value)}
                />
              </div>
            </div>
          </div>

          <FormRow2Col
            left={
              <Field label="Physical Disabilities">
                <StyledInput
                  value={form.introduction.physicalDisabilities}
                  onChange={(e) => setIntroField("physicalDisabilities", e.target.value)}
                  placeholder="None"
                />
              </Field>
            }
            right={
              <Field label="Dietary Restrictions">
                <StyledInput
                  value={form.introduction.dietaryRestrictions}
                  onChange={(e) => setIntroField("dietaryRestrictions", e.target.value)}
                  placeholder="None"
                />
              </Field>
            }
          />

          <div>
            <p className="text-base font-semibold text-slate-600 mb-2">Food handling preferences:</p>
            {(() => {
              const raw = form.introduction.foodHandlingPreferences;
              const parts = raw.split(",").map((p) => p.trim()).filter(Boolean);
              const hasNoPork = parts.includes("No Pork");
              const hasNoBeef = parts.includes("No Beef");
              const other = parts.filter((p) => p !== "No Pork" && p !== "No Beef").join(", ");
              const setFoodPrefs = (np: boolean, nb: boolean, ot: string) => {
                const nextParts = [
                  ...(np ? ["No Pork"] : []),
                  ...(nb ? ["No Beef"] : []),
                  ...(ot.trim() ? [ot.trim()] : []),
                ];
                setIntroField("foodHandlingPreferences", nextParts.join(", "));
              };
              return (
                <div className="flex flex-wrap items-center gap-4 bg-slate-50 rounded-xl p-3 border border-slate-100">
                  {(
                    [
                      ["No Pork", hasNoPork, (v: boolean) => setFoodPrefs(v, hasNoBeef, other)],
                      ["No Beef", hasNoBeef, (v: boolean) => setFoodPrefs(hasNoPork, v, other)],
                    ] as [string, boolean, (v: boolean) => void][]
                  ).map(([lbl, checked, fn]) => (
                    <label
                      key={lbl}
                      className="flex items-center gap-2 text-sm cursor-pointer select-none"
                    >
                      <div
                        className={`relative h-5 w-5 rounded-md border-2 flex items-center justify-center transition-all duration-150 ${
                          checked
                            ? "bg-amber-400 border-amber-400"
                            : "bg-white border-slate-300 hover:border-amber-300"
                        }`}
                      >
                        {checked && (
                          <svg
                            className="h-3 w-3 text-slate-900"
                            fill="none"
                            viewBox="0 0 12 12"
                            stroke="currentColor"
                            strokeWidth={2.5}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                          </svg>
                        )}
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={checked}
                          onChange={(e) => fn(e.target.checked)}
                        />
                      </div>
                      <span className="text-slate-700 font-medium">{lbl}</span>
                    </label>
                  ))}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500">Others:</span>
                    <StyledInput
                      className="w-36 h-9"
                      value={other}
                      onChange={(e) => setFoodPrefs(hasNoPork, hasNoBeef, e.target.value)}
                    />
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </section>

      {/* A3 Others */}
      <section>
        <SectionHeader>A3. Other Remarks</SectionHeader>
        <Field label="Any other remarks">
          <StyledInput
            value={form.introduction.otherRemarks}
            onChange={(e) => setIntroField("otherRemarks", e.target.value)}
          />
        </Field>
      </section>

      {/* Public profile toggle */}
      <div className="pt-2">
        <label className="flex items-center gap-3 text-sm cursor-pointer select-none group">
          <div
            className={`relative h-5 w-5 rounded-md border-2 flex items-center justify-center transition-all duration-150 ${
              form.isPublic
                ? "bg-amber-400 border-amber-400"
                : "bg-white border-slate-300 group-hover:border-amber-300"
            }`}
          >
            {form.isPublic && (
              <svg
                className="h-3 w-3 text-slate-900"
                fill="none"
                viewBox="0 0 12 12"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
              </svg>
            )}
            <input
              type="checkbox"
              className="sr-only"
              checked={form.isPublic}
              onChange={(e) => setForm((p) => (p ? { ...p, isPublic: e.target.checked } : p))}
            />
          </div>
          <span className="text-slate-700 font-medium">Public profile (visible without login)</span>
        </label>
      </div>

      <SaveButtons onSave={onSave} isSaving={isSaving} primaryLabel={primaryLabel} />
    </TabCard>
  );
};

/* ─────────────────────────────
   TAB 2 – SKILLS
───────────────────────────── */
const SkillsTab = ({ form, setForm, onSave, isSaving, primaryLabel }: TabProps) => {
  const evaluationMethods = form.skillsPreferences.evaluationMethods ?? [];
  const isDeclarationChecked = evaluationMethods.includes(EVAL_PARENT_DECLARATION);
  const isInterviewedChecked = evaluationMethods.includes(EVAL_PARENT_INTERVIEWED);

  const setEvalMethods = (next: string[]) =>
    setForm((prev) =>
      prev
        ? {
            ...prev,
            skillsPreferences: { ...prev.skillsPreferences, evaluationMethods: next },
          }
        : prev,
    );

  const toggleEvalOption = (option: string, checked: boolean) => {
    if (checked) {
      setEvalMethods([...new Set([...evaluationMethods, option])]);
    } else {
      if (option === EVAL_PARENT_INTERVIEWED) {
        setEvalMethods(
          evaluationMethods.filter(
            (m) => m !== EVAL_PARENT_INTERVIEWED && !EVAL_SUB_OPTIONS.includes(m),
          ),
        );
      } else {
        setEvalMethods(evaluationMethods.filter((m) => m !== option));
      }
    }
  };

  const setWorkArea = (area: string, patch: Partial<WorkAreaFormItem>) =>
    setForm((prev) => {
      if (!prev) return prev;
      const current = prev.workAreas[area] ?? {
        willing: false,
        experience: false,
        evaluation: "N.A.",
        yearsOfExperience: "",
        rating: null,
        note: "",
      };
      const next = { ...current, ...patch };
      return { ...prev, workAreas: { ...prev.workAreas, [area]: next } };
    });

  const setWorkAreaNote = (key: string, value: string) =>
    setForm((prev) =>
      prev
        ? {
            ...prev,
            skillsPreferences: {
              ...prev.skillsPreferences,
              workAreaNotes: { ...prev.skillsPreferences.workAreaNotes, [key]: value },
            },
          }
        : prev,
    );

  return (
    <TabCard>
      <h3 className="text-xl font-bold text-slate-800">(B) Maid's Skills</h3>

      {/* B1. Method of Evaluation */}
      <section>
        <SectionHeader>B1. Method of Evaluation</SectionHeader>
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
          <EvalCheckbox
            label={EVAL_PARENT_DECLARATION}
            checked={isDeclarationChecked}
            onChange={(checked) => toggleEvalOption(EVAL_PARENT_DECLARATION, checked)}
          />
          <EvalCheckbox
            label={EVAL_PARENT_INTERVIEWED}
            checked={isInterviewedChecked}
            onChange={(checked) => toggleEvalOption(EVAL_PARENT_INTERVIEWED, checked)}
          />
          <div
            className={`transition-all duration-200 ${
              isInterviewedChecked ? "opacity-100" : "opacity-40 pointer-events-none"
            }`}
          >
            {EVAL_SUB_OPTIONS.map((opt) => (
              <EvalCheckbox
                key={opt}
                label={opt}
                checked={evaluationMethods.includes(opt)}
                disabled={!isInterviewedChecked}
                indented
                onChange={(checked) => toggleEvalOption(opt, checked)}
              />
            ))}
          </div>

          {evaluationMethods.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-200 flex flex-wrap gap-1.5">
              {evaluationMethods.map((m) => (
                <span
                  key={m}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 inline-block shrink-0" />
                  {m.length > 50 ? m.slice(0, 47) + "…" : m}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Skills Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-800 text-white">
              <th className="px-3 py-3 text-center text-xs font-semibold w-12">#</th>
              <th className="px-4 py-3 text-left text-xs font-semibold">Area of Work</th>
              <th className="px-3 py-3 text-center text-xs font-semibold w-28">Willingness</th>
              <th className="px-3 py-3 text-center text-xs font-semibold w-44">
                Experience
                <br />
                <span className="font-normal opacity-70">(if yes, state years)</span>
              </th>
              <th className="px-3 py-3 text-center text-xs font-semibold w-64">
                Assessment / Observation
              </th>
            </tr>
          </thead>
          <tbody>
            {skillRows.map((row, idx) => {
              const config = form.workAreas[row.label] ?? {
                willing: false,
                experience: false,
                evaluation: "N.A.",
                yearsOfExperience: "",
                rating: null,
                note: "",
              };
              const subKey =
                row.label === "Other skills, if any" ? "Other Skill" : row.label;
              const updateEvaluation = (nr: number | null, nn: string) =>
                setWorkArea(row.label, {
                  rating: nr,
                  note: nn,
                  evaluation: buildWorkAreaEvaluation(nr, nn),
                });

              return (
                <tr key={row.no} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                  <td className="px-3 py-4 text-center text-slate-400 font-medium align-top">
                    {row.no}
                  </td>
                  <td className="px-4 py-4 align-top">
                    <p className="font-semibold text-slate-800">{row.label}</p>
                    {row.sub && (
                      <div className="mt-2">
                        <p className="text-sm text-slate-600 mb-1">{row.sub}</p>
                        {row.subField && (
                          <StyledInput
                            className="w-44 h-8 text-xs"
                            value={form.skillsPreferences.workAreaNotes[subKey] ?? ""}
                            onChange={(e) => setWorkAreaNote(subKey, e.target.value)}
                          />
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-4 text-center align-top">
                    <div className="flex justify-center">
                      <YesNo
                        name={`will_${row.no}`}
                        value={config.willing}
                        onValueChange={(next) => setWorkArea(row.label, { willing: next })}
                      />
                    </div>
                  </td>
                  <td className="px-3 py-4 text-center align-top">
                    <div className="mb-2 flex justify-center">
                      <YesNo
                        name={`exp_${row.no}`}
                        value={config.experience}
                        onValueChange={(next) =>
                          setWorkArea(row.label, {
                            experience: next,
                            yearsOfExperience: next ? String(config.yearsOfExperience ?? "") : "",
                          })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-center gap-1">
                      <StyledInput
                        className="w-14 h-8 text-xs text-center"
                        value={config.yearsOfExperience ?? ""}
                        onChange={(e) =>
                          setWorkArea(row.label, { yearsOfExperience: e.target.value })
                        }
                        disabled={config.experience !== true}
                      />
                      <span className="text-xs text-slate-400">yrs</span>
                    </div>
                  </td>
                  <td className="px-3 py-4 align-top">
                    <div className="mb-2">
                      <StarRating
                        name={`assess_${row.no}`}
                        value={config.rating ?? null}
                        onChange={(nr) => updateEvaluation(nr, config.note ?? "")}
                      />
                    </div>
                    <textarea
                      className="w-full min-h-[52px] rounded-xl border border-slate-500 bg-white px-2 py-1.5 text-xs text-slate-800 shadow-sm transition-all duration-200 focus:outline-none focus:border-amber-400 focus:shadow-[0_0_0_3px_rgba(251,191,36,0.18)] focus:bg-white hover:border-slate-300 resize-none placeholder:text-slate-600"
                      value={config.note ?? ""}
                      onChange={(e) => updateEvaluation(config.rating ?? null, e.target.value)}
                      placeholder="Notes (optional)"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <SaveButtons onSave={onSave} isSaving={isSaving} primaryLabel={primaryLabel} />
    </TabCard>
  );
};

/* ─────────────────────────────
   TAB 3 – EMPLOYMENT HISTORY
───────────────────────────── */
const EmploymentHistoryTab = ({ form, setForm, onSave, isSaving, primaryLabel }: TabProps) => {
  const years = ["--", ...Array.from({ length: 30 }, (_, i) => String(2000 + i))];

  const updateRow = (index: number, patch: Partial<EmploymentHistoryRow>) =>
    setForm((p) => {
      if (!p) return p;
      const next = [...p.employmentHistory];
      next[index] = { ...next[index], ...patch };
      return { ...p, employmentHistory: next };
    });

  const addRow = () =>
    setForm((p) =>
      p
        ? {
            ...p,
            employmentHistory: [
              ...p.employmentHistory,
              { from: "", to: "", country: "", employer: "", duties: "", remarks: "" },
            ],
          }
        : p,
    );

  const removeRow = (i: number) =>
    setForm((p) =>
      p ? { ...p, employmentHistory: p.employmentHistory.filter((_, idx) => idx !== i) } : p,
    );

  return (
    <TabCard>
      <h3 className="text-xl font-bold text-slate-800">(C) Employment History</h3>

      <section>
        <SectionHeader>C1. Employment History</SectionHeader>
        <div className="space-y-4">
          {form.employmentHistory.map((row, idx) => (
            <div key={idx} className="border border-slate-200 rounded-2xl bg-slate-50/50 p-5">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-amber-400 flex items-center justify-center text-xs font-bold text-slate-900">
                    {idx + 1}
                  </div>
                  <span className="font-semibold text-slate-700">Employer #{idx + 1}</span>
                </div>
                {form.employmentHistory.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRow(idx)}
                    className="text-xs text-red-400 hover:text-red-600 font-semibold underline underline-offset-2 transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field label="From Year">
                  <StyledSelect
                    options={years}
                    value={row.from || "--"}
                    onChange={(e) =>
                      updateRow(idx, { from: e.target.value === "--" ? "" : e.target.value })
                    }
                  />
                </Field>
                <Field label="To Year">
                  <StyledSelect
                    options={years}
                    value={row.to || "--"}
                    onChange={(e) =>
                      updateRow(idx, { to: e.target.value === "--" ? "" : e.target.value })
                    }
                  />
                </Field>
                <Field label="Country">
                  <StyledSelect
                    options={employmentCountries}
                    value={row.country || ""}
                    onChange={(e) => updateRow(idx, { country: e.target.value })}
                  />
                </Field>
              </div>

              <div className="mt-4">
                <Field label="Employer's Name">
                  <StyledInput
                    value={row.employer}
                    onChange={(e) => updateRow(idx, { employer: e.target.value })}
                    placeholder="Full name"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <Field label="Main Duties">
                  <textarea
                    className="w-full min-h-[80px] rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 font-medium shadow-sm transition-all duration-200 focus:outline-none focus:border-amber-400 focus:bg-white focus:shadow-[0_0_0_3px_rgba(251,191,36,0.18)] hover:border-slate-300 resize-none placeholder:text-slate-600 placeholder:font-normal"
                    value={row.duties}
                    onChange={(e) => updateRow(idx, { duties: e.target.value })}
                    placeholder="Describe main responsibilities..."
                  />
                </Field>
                <Field label="Remarks">
                  <textarea
                    className="w-full min-h-[80px] rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 font-medium shadow-sm transition-all duration-200 focus:outline-none focus:border-amber-400 focus:bg-white focus:shadow-[0_0_0_3px_rgba(251,191,36,0.18)] hover:border-slate-300 resize-none placeholder:text-slate-600 placeholder:font-normal"
                    value={row.remarks}
                    onChange={(e) => updateRow(idx, { remarks: e.target.value })}
                    placeholder="Any relevant notes..."
                  />
                </Field>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addRow}
          className="mt-3 w-full py-2.5 rounded-xl border-2 border-dashed border-amber-300 text-amber-600 text-sm font-semibold hover:bg-amber-50 transition-colors"
        >
          + Add Another Employer
        </button>
      </section>

      <section>
        <SectionHeader>C2. Singapore Experience</SectionHeader>
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">
              Previous working experience in Singapore
            </span>
            <YesNo
              name="sg_experience"
              value={form.skillsPreferences.sgExperience}
              onValueChange={(next) =>
                setForm((p) =>
                  p
                    ? { ...p, skillsPreferences: { ...p.skillsPreferences, sgExperience: next } }
                    : p,
                )
              }
            />
          </div>
          <p className="text-sm text-slate-700 leading-relaxed">
            The EA is required to obtain the FDW's employment history from MOM and furnish the
            employer with the employment history. The employer may also verify via WPOL using
            SingPass.
          </p>
        </div>
      </section>

      <section>
        <SectionHeader>C3. Feedback from Previous Singapore Employers</SectionHeader>
        <div className="space-y-4">
          <Field label="Feedback from Singapore Employer 1">
            <StyledInput placeholder="Enter feedback..." />
          </Field>
          <Field label="Feedback from Singapore Employer 2">
            <StyledInput placeholder="Enter feedback..." />
          </Field>
        </div>
      </section>

      <SaveButtons onSave={onSave} isSaving={isSaving} primaryLabel={primaryLabel} />
    </TabCard>
  );
};

/* ─────────────────────────────
   TAB 4 – AVAILABILITY / REMARK
───────────────────────────── */
const AvailabilityRemarkTab = ({ form, setForm, onSave, isSaving, primaryLabel }: TabProps) => {
  const interviewOptions = form.skillsPreferences.availabilityInterviewOptions;

  const toggleOption = (opt: string, checked: boolean) =>
    setForm((p) => {
      if (!p) return p;
      const current = p.skillsPreferences.availabilityInterviewOptions;
      const next = checked
        ? Array.from(new Set([...current, opt]))
        : current.filter((v) => v !== opt);
      return {
        ...p,
        skillsPreferences: { ...p.skillsPreferences, availabilityInterviewOptions: next },
      };
    });

  return (
    <TabCard>
      <h3 className="text-xl font-bold text-slate-800">(D) Availability & Remarks</h3>

      <section>
        <SectionHeader>Interview Availability</SectionHeader>
        <div className="space-y-0 bg-slate-50 rounded-xl p-4 border border-slate-100">
          {[
            "FDW is not available for interview",
            "FDW can be interviewed by phone",
            "FDW can be interviewed by video-conference",
            "FDW can be interviewed in person",
          ].map((opt) => {
            const checked = interviewOptions.includes(opt);
            return (
              <label
                key={opt}
                className="flex items-center gap-3 text-sm cursor-pointer py-3 border-b border-slate-100 last:border-0 group select-none"
              >
                <div
                  className={`h-5 w-5 shrink-0 rounded-md border-2 flex items-center justify-center transition-all duration-150 ${
                    checked
                      ? "bg-amber-400 border-amber-400"
                      : "bg-white border-slate-500 group-hover:border-amber-400"
                  }`}
                >
                  {checked && (
                    <svg
                      className="h-3 w-3 text-slate-900"
                      fill="none"
                      viewBox="0 0 12 12"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                    </svg>
                  )}
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={checked}
                    onChange={(e) => toggleOption(opt, e.target.checked)}
                  />
                </div>
                <span
                  className={`transition-colors ${
                    checked ? "text-slate-800 font-medium" : "text-slate-900"
                  }`}
                >
                  {opt}
                </span>
              </label>
            );
          })}
        </div>
      </section>

      <section>
        <SectionHeader>E. Other Remarks</SectionHeader>
        <Field label="Other Remarks">
          <textarea
            className="w-full min-h-[120px] rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-sm text-slate-800 font-medium shadow-sm transition-all duration-200 focus:outline-none focus:border-amber-400 focus:bg-white focus:shadow-[0_0_0_3px_rgba(251,191,36,0.18)] hover:border-slate-300 resize-none placeholder:text-slate-600 placeholder:font-normal"
            value={form.skillsPreferences.availabilityRemark}
            onChange={(e) =>
              setForm((p) =>
                p
                  ? {
                      ...p,
                      skillsPreferences: {
                        ...p.skillsPreferences,
                        availabilityRemark: e.target.value,
                      },
                    }
                  : p,
              )
            }
            placeholder="Any additional information..."
          />
        </Field>
      </section>

      <SaveButtons onSave={onSave} isSaving={isSaving} primaryLabel={primaryLabel} />
    </TabCard>
  );
};

/* ─────────────────────────────
   TAB 5 – INTRODUCTION
───────────────────────────── */
const IntroductionTab = ({ form, setForm, onSave, isSaving, primaryLabel }: TabProps) => (
  <TabCard>
    <div className="text-center space-y-1">
      <h3 className="text-xl font-bold text-slate-800">Maid's Introduction</h3>
      <p className="text-sm text-slate-800">
        This introduction is hidden from the public. Employers must log in to view it.
      </p>
    </div>

    <Field label="Maid Introduction">
      <textarea
        className="w-full min-h-[280px] rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-800 font-medium shadow-sm transition-all duration-200 focus:outline-none focus:border-amber-400 focus:bg-white focus:shadow-[0_0_0_3px_rgba(251,191,36,0.18)] hover:border-slate-300 resize-none leading-relaxed placeholder:text-slate-600 placeholder:font-normal"
        value={form.introduction.intro}
        onChange={(e) =>
          setForm((p) =>
            p ? { ...p, introduction: { ...p.introduction, intro: e.target.value } } : p,
          )
        }
        placeholder="Write a detailed introduction about the maid's background, personality, and work experience..."
      />
    </Field>

    <SaveButtons onSave={onSave} isSaving={isSaving} primaryLabel={primaryLabel} />
  </TabCard>
);

/* ─────────────────────────────
   TAB 6 – PUBLIC INTRODUCTION
───────────────────────────── */
const PublicIntroductionTab = ({ form, setForm, onSave, isSaving, primaryLabel }: TabProps) => (
  <TabCard>
    <div className="text-center space-y-1">
      <h3 className="text-xl font-bold text-slate-800">Public Introduction</h3>
      <p className="text-sm text-slate-400">Visible to all employers without login.</p>
    </div>

    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-base text-amber-800 leading-relaxed space-y-2">
      <p className="font-semibold">⚠️ MOM Compliance Notice</p>
      <p>
        EAs must comply with MOM's{" "}
        <a
          href="https://www.mom.gov.sg/employment-practices/employment-agencies/ealc"
          className="underline font-medium"
          target="_blank"
          rel="noopener noreferrer"
        >
          EALC #17
        </a>{" "}
        and only disclose: FDW name, nationality, skills and experience, food handling preferences,
        previous employment history, and language abilities.
      </p>
      <p>
        Avoid transactional terms that liken FDWs to commodities (e.g. "condition new", "chat to
        buy").
      </p>
    </div>

    <Field label="Public Introduction">
      <textarea
        className="w-full min-h-[280px] rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-800 font-medium shadow-sm transition-all duration-200 focus:outline-none focus:border-amber-400 focus:bg-white focus:shadow-[0_0_0_3px_rgba(251,191,36,0.18)] hover:border-slate-300 resize-none leading-relaxed placeholder:text-slate-600 placeholder:font-normal"
        value={form.introduction.publicIntro}
        onChange={(e) =>
          setForm((p) =>
            p ? { ...p, introduction: { ...p.introduction, publicIntro: e.target.value } } : p,
          )
        }
        placeholder="Write a public-facing introduction (compliant with MOM EALC #17)..."
      />
    </Field>

    <SaveButtons onSave={onSave} isSaving={isSaving} primaryLabel={primaryLabel} />
  </TabCard>
);

/* ─────────────────────────────
   TAB 7 – PRIVATE INFO
───────────────────────────── */
const PrivateInfoTab = ({ form, setForm, onSave, isSaving, primaryLabel }: TabProps) => (
  <TabCard>
    <div className="text-center space-y-1">
      <h3 className="text-xl font-bold text-slate-800">Private Information</h3>
      <p className="text-sm text-slate-800">
        Internal agency records — not visible to employers or the public.
      </p>
    </div>

    <div className="space-y-5">
      <FormRow2Col
        left={
          <Field label="Interviewed By">
            <StyledInput
              value={form.skillsPreferences.interviewedBy}
              onChange={(e) =>
                setForm((p) =>
                  p
                    ? {
                        ...p,
                        skillsPreferences: { ...p.skillsPreferences, interviewedBy: e.target.value },
                      }
                    : p,
                )
              }
              placeholder="Staff name"
            />
          </Field>
        }
        right={
          <Field label="Referred By">
            <StyledInput
              value={form.skillsPreferences.referredBy}
              onChange={(e) =>
                setForm((p) =>
                  p
                    ? {
                        ...p,
                        skillsPreferences: { ...p.skillsPreferences, referredBy: e.target.value },
                      }
                    : p,
                )
              }
              placeholder="Referrer name"
            />
          </Field>
        }
      />

      <Field label="Passport Number">
        <StyledInput
          placeholder="e.g. R8833831 · Expiry: 28/01/2028"
          value={form.agencyContact.passportNo}
          onChange={(e) =>
            setForm((p) =>
              p
                ? { ...p, agencyContact: { ...p.agencyContact, passportNo: e.target.value } }
                : p,
            )
          }
        />
      </Field>

      <Field label="Phone (Maid / Foreign Agency) — WhatsApp">
        <StyledInput
          value={form.agencyContact.phone}
          onChange={(e) =>
            setForm((p) =>
              p ? { ...p, agencyContact: { ...p.agencyContact, phone: e.target.value } } : p,
            )
          }
          placeholder="+60 XXX XXXX"
        />
      </Field>

      <Field label="Agency's Historical Record of the Maid">
        <textarea
          className="w-full min-h-[200px] rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-800 font-medium shadow-sm transition-all duration-200 focus:outline-none focus:border-amber-400 focus:bg-white focus:shadow-[0_0_0_3px_rgba(251,191,36,0.18)] hover:border-slate-300 resize-none leading-relaxed placeholder:text-slate-600 placeholder:font-normal"
          value={form.skillsPreferences.privateInfo}
          onChange={(e) =>
            setForm((p) =>
              p
                ? {
                    ...p,
                    skillsPreferences: { ...p.skillsPreferences, privateInfo: e.target.value },
                  }
                : p,
            )
          }
          placeholder="Internal notes, past incidents, special observations..."
        />
      </Field>
    </div>

    <SaveButtons onSave={onSave} isSaving={isSaving} primaryLabel={primaryLabel} />
  </TabCard>
);

/* ─────────────────────────────
   MAIN EditMaid COMPONENT
───────────────────────────── */
const EditMaid = () => {
  const { refCode } = useParams<{ refCode: string }>();
  const navigate = useNavigate();
  const [maid, setMaid] = useState<MaidProfile | null>(null);
  const [form, setForm] = useState<MaidProfileFormState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  useEffect(() => {
    if (!refCode) return;
    const load = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/maids/${encodeURIComponent(refCode)}`, {
          headers: { ...getAgencyAdminAuthHeaders() },
        });
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
          maid?: MaidProfile;
        };
        if (!response.ok || !data.maid) throw new Error(data.error || "Failed to load maid");
        setMaid(data.maid);
        setForm(buildFormState(data.maid));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load maid");
        navigate(adminPath("/edit-maids"));
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [navigate, refCode]);

  const handleSave = () => {
    if (isSaving) return;
    if (activeTab === tabs.length - 1) {
      setIsConfirmOpen(true);
    } else {
      void performSave();
    }
  };

  const performSave = async () => {
    if (!refCode || !maid || !form) return;

    const height = Number(form.height);
    const weight = Number(form.weight);
    const numberOfChildren = Number(form.numberOfChildren);
    const numberOfSiblings = Number(form.numberOfSiblings);

    if (!form.fullName.trim() || !form.referenceCode.trim()) {
      toast.error("Full name and reference code are required.");
      return;
    }
    if (!Number.isFinite(height) || height <= 0) {
      toast.error("Height must be a positive number.");
      return;
    }
    if (!Number.isFinite(weight) || weight <= 0) {
      toast.error("Weight must be a positive number.");
      return;
    }
    if (!Number.isFinite(numberOfChildren) || numberOfChildren < 0) {
      toast.error("Number of children must be 0 or more.");
      return;
    }
    if (!Number.isFinite(numberOfSiblings) || numberOfSiblings < 0) {
      toast.error("Number of siblings must be 0 or more.");
      return;
    }

    const payload: MaidProfile = {
      ...maid,
      fullName: form.fullName.trim(),
      referenceCode: form.referenceCode.trim(),
      type: form.type.trim(),
      nationality: form.nationality.trim(),
      dateOfBirth: form.dateOfBirth,
      placeOfBirth: form.placeOfBirth.trim(),
      height,
      weight,
      religion: form.religion.trim(),
      maritalStatus: form.maritalStatus.trim(),
      numberOfChildren,
      numberOfSiblings,
      homeAddress: form.homeAddress.trim(),
      airportRepatriation: form.airportRepatriation.trim(),
      educationLevel: form.educationLevel.trim(),
      languageSkills: form.languageSkills,
      skillsPreferences: form.skillsPreferences,
      workAreas: form.workAreas,
      employmentHistory: form.employmentHistory,
      introduction: form.introduction,
      agencyContact: form.agencyContact,
      isPublic: form.isPublic,
    };

    try {
      setIsSaving(true);
      const response = await fetch(`/api/maids/${encodeURIComponent(refCode)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAgencyAdminAuthHeaders() },
        body: JSON.stringify(payload),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        maid?: MaidProfile;
      };
      if (!response.ok || !data.maid) throw new Error(data.error || "Failed to update maid");
      setMaid(data.maid);
      setForm(buildFormState(data.maid));

      if (activeTab >= tabs.length - 1) {
        toast.success("Maid profile updated successfully");
        navigate(adminPath(`/maid/${encodeURIComponent(data.maid.referenceCode)}`));
        return;
      }
      toast.success("Saved");
      setActiveTab(activeTab + 1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update maid");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !maid || !form) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50/30 flex items-center justify-center">
        <div className="text-slate-500 text-sm">Loading maid profile...</div>
      </div>
    );
  }

  const primaryLabel = activeTab >= tabs.length - 1 ? "Save & Finish" : "Save & Continue";

  const tabProps: TabProps = {
    form,
    setForm: setForm as React.Dispatch<React.SetStateAction<MaidProfileFormState | null>>,
    onSave: handleSave,
    isSaving,
    primaryLabel,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50/30">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
            <span>Agency Admin</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-amber-600 font-medium">Edit Maid</span>
          </div>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
                Edit Maid Profile
              </h1>
              <p className="text-slate-500 mt-1">
                Ref:{" "}
                <span className="font-semibold text-slate-700">{maid.referenceCode}</span>
                {maid.fullName && (
                  <>
                    {" "}
                    &mdash;{" "}
                    <span className="font-semibold text-slate-700">{maid.fullName}</span>
                  </>
                )}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                navigate(adminPath(`/maid/${encodeURIComponent(maid.referenceCode)}`))
              }
              className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              ← Back to Profile
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-1 mb-0 bg-white rounded-t-2xl border border-b-0 border-slate-200 p-2 shadow-sm">
          {tabs.map((tab, i) => {
            const Icon = tab.icon;
            const isActive = activeTab === i;
            const isCompleted = i < activeTab;
            return (
              <button
                key={tab.label}
                onClick={() => setActiveTab(i)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  isActive
                    ? "bg-amber-400 text-slate-900 shadow-md shadow-amber-200"
                    : isCompleted
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        {activeTab === 0 && <ProfileTab {...tabProps} />}
        {activeTab === 1 && <SkillsTab {...tabProps} />}
        {activeTab === 2 && <EmploymentHistoryTab {...tabProps} />}
        {activeTab === 3 && <AvailabilityRemarkTab {...tabProps} />}
        {activeTab === 4 && <IntroductionTab {...tabProps} />}
        {activeTab === 5 && <PublicIntroductionTab {...tabProps} />}
        {activeTab === 6 && <PrivateInfoTab {...tabProps} />}

        {/* Confirmation Dialog */}
        <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
          <DialogContent className="max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">Confirm Save</DialogTitle>
              <DialogDescription className="text-slate-500">
                You are about to save and finish editing this profile. Continue?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsConfirmOpen(false)}
                disabled={isSaving}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setIsConfirmOpen(false);
                  void performSave();
                }}
                disabled={isSaving}
                className="rounded-xl bg-amber-400 text-slate-900 hover:bg-amber-500 font-semibold"
              >
                {isSaving ? "Saving..." : "Confirm & Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default EditMaid;
