import { useEffect, useMemo, useRef, useState, type ElementType } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import PublicSiteNavbar from "@/components/PublicSiteNavbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneNumberInput } from "@/components/ui/phone-input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { fetchAgencyOptions } from "@/lib/agencies";
import { submitPublicAtsApplication } from "@/lib/ats";
import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileCheck2,
  Globe2,
  HeartPulse,
  Loader2,
  Pencil,
  ShieldCheck,
  Sparkles,
  Star,
  UserRound,
  X,
  Paperclip,
  FileText,
  CreditCard,
  Award,
  Stethoscope,
  ClipboardList,
  Video,
  Plus,
  Trash2,
  AlertCircle,
  Save,
  Upload,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type ApplicantFormState = {
  agencyId: string;
  fullName: string;
  email: string;
  contactNumber: string;
  nationality: string;
  dateOfBirth: string;
  maritalStatus: string;
  address: string;
  yearsOfExperience: string;
  previousCountriesWorkedIn: string;
  childcareExperience: string;
  newbornCareExperience: string;
  elderlyCareExperience: string;
  disabledCareExperience: string;
  housekeepingExperience: string;
  cookingSkills: string;
  petCareExperience: string;
  languageSkills: string;
  certifications: string;
  trainingRecords: string;
  availableDate: string;
  expectedSalary: string;
  employmentPreference: string;
  coverNote: string;
  placeOfBirth: string;
  heightCm: string;
  weightKg: string;
  residentialAddressLine1: string;
  residentialAddressLine2: string;
  repatriationPort: string;
  homeCountryContactNumber: string;
  religion: string;
  educationLevel: string;
  numberOfSiblings: string;
  numberOfChildren: string;
  childrenAges: string;
  allergies: string;
  physicalDisabilities: string;
  dietaryRestrictions: string;
  foodPreference: string;
  foodPreferenceOther: string;
  medicalConditions: string;
  restDayPreference: string;
  otherRemarksA3: string;
  workedInSingapore: string;
  sgInfantsChildrenAssessment: string;
  sgElderlyAssessment: string;
  sgDisabledAssessment: string;
  sgHouseworkAssessment: string;
  sgCookingAssessment: string;
  sgLanguageAssessment: string;
  sgOtherSkills: string;
  sgOtherSkillsAssessment: string;
  foreignTrainingCentreName: string;
  thirdPartyCertificationDetails: string;
  overseasInfantsChildrenAssessment: string;
  overseasElderlyAssessment: string;
  overseasDisabledAssessment: string;
  overseasHouseworkAssessment: string;
  overseasCookingAssessment: string;
  overseasLanguageAssessment: string;
  overseasOtherSkills: string;
  overseasOtherSkillsAssessment: string;
  feedbackEmployer1: string;
  feedbackEmployer2: string;
  otherRemarksE: string;
};

type EmploymentEntry = {
  id: string;
  from: string;
  to: string;
  country: string;
  employer: string;
  duties: string;
  remarks: string;
};

type FieldErrors = Record<string, string>;

// ─── Constants ────────────────────────────────────────────────────────────────

const DRAFT_KEY = "maid-application-draft";

const initialState: ApplicantFormState = {
  agencyId: "1",
  fullName: "",
  email: "",
  contactNumber: "",
  nationality: "",
  dateOfBirth: "",
  maritalStatus: "",
  address: "",
  yearsOfExperience: "0",
  previousCountriesWorkedIn: "",
  childcareExperience: "0",
  newbornCareExperience: "0",
  elderlyCareExperience: "0",
  disabledCareExperience: "0",
  housekeepingExperience: "0",
  cookingSkills: "",
  petCareExperience: "0",
  languageSkills: "",
  certifications: "",
  trainingRecords: "",
  availableDate: "",
  expectedSalary: "",
  employmentPreference: "",
  coverNote: "",
  placeOfBirth: "",
  heightCm: "",
  weightKg: "",
  residentialAddressLine1: "",
  residentialAddressLine2: "",
  repatriationPort: "",
  homeCountryContactNumber: "",
  religion: "",
  educationLevel: "",
  numberOfSiblings: "",
  numberOfChildren: "",
  childrenAges: "",
  allergies: "",
  physicalDisabilities: "",
  dietaryRestrictions: "",
  foodPreference: "",
  foodPreferenceOther: "",
  medicalConditions: "",
  restDayPreference: "",
  otherRemarksA3: "",
  workedInSingapore: "No",
  sgInfantsChildrenAssessment: "",
  sgElderlyAssessment: "",
  sgDisabledAssessment: "",
  sgHouseworkAssessment: "",
  sgCookingAssessment: "",
  sgLanguageAssessment: "",
  sgOtherSkills: "",
  sgOtherSkillsAssessment: "",
  foreignTrainingCentreName: "",
  thirdPartyCertificationDetails: "",
  overseasInfantsChildrenAssessment: "",
  overseasElderlyAssessment: "",
  overseasDisabledAssessment: "",
  overseasHouseworkAssessment: "",
  overseasCookingAssessment: "",
  overseasLanguageAssessment: "",
  overseasOtherSkills: "",
  overseasOtherSkillsAssessment: "",
  feedbackEmployer1: "",
  feedbackEmployer2: "",
  otherRemarksE: "",
};

const createEmptyEntry = (): EmploymentEntry => ({
  id: crypto.randomUUID(),
  from: "",
  to: "",
  country: "",
  employer: "",
  duties: "",
  remarks: "",
});

const fileConfig = [
  { key: "resume", label: "Resume / CV", icon: FileText, hint: "PDF, DOC, DOCX, JPG, PNG", maxSizeMB: 10 },
  { key: "passport", label: "Passport copy", icon: CreditCard, hint: "PDF, JPG, PNG", maxSizeMB: 10 },
  { key: "certificates", label: "Certificates / training records", icon: Award, hint: "PDF, DOC, DOCX, JPG, PNG", maxSizeMB: 10 },
  { key: "medical", label: "Medical documents", icon: Stethoscope, hint: "PDF, JPG, PNG", maxSizeMB: 10 },
  { key: "references", label: "Reference letters", icon: ClipboardList, hint: "PDF, DOC, DOCX", maxSizeMB: 10 },
  { key: "introVideo", label: "Introduction video", icon: Video, hint: "MP4, MOV — max 1 minute", maxSizeMB: 50 },
  { key: "otherDocuments", label: "Other supporting documents", icon: Paperclip, hint: "PDF, DOC, DOCX, JPG, PNG", maxSizeMB: 10 },
] as const;

const nationalityOptions = [
  "Filipino",
  "Indonesian",
  "Indian",
  "Myanmar",
  "Sri Lankan",
  "Bangladeshi",
  "Nepali",
  "Cambodian",
  "Others",
] as const;

const religionOptions = [
  "Catholic",
  "Christian",
  "Muslim",
  "Hindu",
  "Buddhist",
  "Sikh",
  "Free Thinker",
  "Others",
] as const;

const maritalStatusOptions = [
  "Single",
  "Single Parent",
  "Married",
  "Divorced",
  "Widowed",
  "Separated",
] as const;

const educationLevelOptions = [
  "Primary Level (≤6 yrs)",
  "Secondary Level (7–9 yrs)",
  "High School (10–12 yrs)",
  "Vocational Course",
  "College / Degree (≥13 yrs)",
] as const;

const languageOptions = [
  "English",
  "Mandarin / Chinese Dialect",
  "Hindi",
  "Tamil",
  "Bahasa Indonesia / Malaysia",
  "Cantonese",
  "Arabic",
  "Tagalog",
  "Burmese",
  "Khmer",
  "Thai",
] as const;

const employmentPreferenceOptions = [
  "Transfer (currently in Singapore)",
  "New placement (from home country)",
  "Full-time live-in",
  "Full-time live-out",
  "Part-time",
  "Any",
] as const;

const restDayOptions = [
  "1 rest day per month",
  "2 rest days per month",
  "1 rest day per week",
  "2 rest days per week",
  "Negotiable",
  "No preference",
] as const;

const skillRatingFields = [
  { key: "childcareExperience", label: "Childcare" },
  { key: "newbornCareExperience", label: "Newborn care" },
  { key: "elderlyCareExperience", label: "Elderly care" },
  { key: "disabledCareExperience", label: "Disabled care" },
  { key: "housekeepingExperience", label: "Housekeeping" },
  { key: "petCareExperience", label: "Pet care" },
] as const;

const applicationSteps = [
  { id: "intro", step: "Start", title: "Before you begin", icon: Sparkles },
  { id: "biodata", step: "Step 1", title: "FDW biodata", icon: UserRound },
  { id: "health", step: "Step 2", title: "Health & prefs", icon: HeartPulse },
  { id: "skills", step: "Step 3", title: "Skills & history", icon: BriefcaseBusiness },
  { id: "documents", step: "Step 4", title: "Attachments", icon: FileCheck2 },
  { id: "review", step: "Step 5", title: "Review & submit", icon: ShieldCheck },
] as const;

const applicationTerms = [
  "I confirm that all information submitted in this application is true and accurate.",
  "I understand the agency may verify my biodata, employment history, and supporting documents.",
  "I agree that the agency may contact me by WhatsApp, phone call, or email about recruitment opportunities.",
  "I understand that incomplete, false, or misleading information may affect my application status.",
  "I agree that my application details will be stored in the agency recruitment system for review and follow-up.",
];

const publicInfoChecklist = [
  "WhatsApp number and email are active",
  "Biodata matches your official documents",
  "Employment history is complete",
  "Resume and passport are uploaded if available",
];

// ─── Shared class strings ─────────────────────────────────────────────────────

const fieldCls =
  "h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-none transition-colors focus-visible:outline-none focus-visible:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-100";

const fieldErrorCls =
  "h-11 w-full rounded-lg border border-rose-300 bg-rose-50/50 px-3.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-none transition-colors focus-visible:outline-none focus-visible:border-rose-400 focus-visible:ring-2 focus-visible:ring-rose-100";

const selectCls =
  "h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-slate-900 shadow-none transition-colors focus-visible:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 appearance-none cursor-pointer";

const selectErrorCls =
  "h-11 w-full rounded-lg border border-rose-300 bg-rose-50/50 px-3.5 text-sm text-slate-900 shadow-none transition-colors focus-visible:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 appearance-none cursor-pointer";

const textareaCls =
  "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-none resize-none transition-colors focus-visible:outline-none focus-visible:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-100";

const textareaErrorCls =
  "w-full rounded-lg border border-rose-300 bg-rose-50/50 px-3.5 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-none resize-none transition-colors focus-visible:outline-none focus-visible:border-rose-400 focus-visible:ring-2 focus-visible:ring-rose-100";

const dateCls =
  "h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-none transition-colors focus-visible:outline-none focus-visible:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-100 cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-60 [&::-webkit-calendar-picker-indicator]:cursor-pointer";

const labelCls = "block text-xs font-semibold text-slate-600 mb-1.5 tracking-wide";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Keep the public application quick to complete: only the essentials are required.
const requiredAddMaidProfileFields: Array<keyof ApplicantFormState> = [
  "fullName",
  "email",
  "contactNumber",
  "nationality",
  "dateOfBirth",
];

const addMaidFieldLabels: Partial<Record<keyof ApplicantFormState, string>> = {
  fullName: "Full name",
  email: "Email",
  contactNumber: "WhatsApp / contact number",
  nationality: "Nationality",
  dateOfBirth: "Date of birth",
  placeOfBirth: "Place of birth",
  heightCm: "Height",
  weightKg: "Weight",
  address: "Current residential address",
  repatriationPort: "Repatriation port / airport",
  homeCountryContactNumber: "Home country contact number",
  educationLevel: "Education level",
  religion: "Religion",
  maritalStatus: "Marital status",
  numberOfSiblings: "Number of siblings",
  numberOfChildren: "Number of children",
  employmentPreference: "Employment preference",
  availableDate: "Available date",
};

// ─── Small reusable components ────────────────────────────────────────────────

const FieldLabel = ({ children, required, tooltip }: { children: React.ReactNode; required?: boolean; tooltip?: string }) => (
  <span className={labelCls}>
    {children}
    {required && <span className="ml-0.5 text-rose-500" aria-label="required">*</span>}
    {tooltip && (
      <span className="ml-1 inline-block group relative">
        <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-slate-200 text-[9px] font-bold text-slate-500 cursor-help align-middle" title={tooltip}>?</span>
      </span>
    )}
  </span>
);

const FieldError = ({ message }: { message?: string }) => {
  if (!message) return null;
  return (
    <p className="mt-1 flex items-center gap-1 text-xs font-medium text-rose-600" role="alert">
      <AlertCircle className="h-3 w-3 shrink-0" />
      {message}
    </p>
  );
};

const SectionHeader = ({
  step,
  title,
  description,
  icon: Icon,
}: {
  step: string;
  title: string;
  description: string;
  icon: ElementType;
}) => (
  <div className="mb-6 flex items-start gap-3.5">
    <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-white shadow-sm">
      <Icon className="h-5 w-5" />
    </div>
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">{step}</p>
      <h2 className="mt-0.5 text-base font-bold text-slate-900 sm:text-lg">{title}</h2>
      <p className="mt-1 text-xs leading-relaxed text-slate-500 sm:text-sm">{description}</p>
    </div>
  </div>
);

const Divider = ({ title, description }: { title: string; description?: string }) => (
  <div className="col-span-1 pt-4 pb-1 sm:col-span-2">
    <div className="flex items-center gap-2">
      <div className="h-px flex-1 bg-slate-200" />
      <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-500 border border-slate-200">{title}</span>
      <div className="h-px flex-1 bg-slate-200" />
    </div>
    {description && <p className="mt-2 text-center text-[11px] font-medium text-slate-400">{description}</p>}
  </div>
);

const CollapsibleSection = ({
  title,
  description,
  defaultOpen = false,
  children,
  badge,
}: {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  badge?: string;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="col-span-1 sm:col-span-2 rounded-xl border border-slate-200 bg-white overflow-hidden transition-all">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-slate-50 touch-manipulation"
        aria-expanded={open}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-slate-800">{title}</p>
            {badge && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">{badge}</span>
            )}
          </div>
          {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
        </div>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      <div
        className={`grid transition-all duration-200 ease-in-out ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-slate-100 p-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

const StarSkillRating = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (next: number) => void;
}) => (
  <div className="rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-emerald-200 hover:shadow-sm">
    <div className="flex items-center justify-between gap-2 mb-3">
      <span className="text-sm font-semibold text-slate-800 leading-tight">{label}</span>
      <span className={`text-xs font-bold tabular-nums px-2 py-0.5 rounded-full shrink-0 ${value > 0 ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-500"}`}>
        {value}/5
      </span>
    </div>
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }, (_, i) => {
        const v = i + 1;
        return (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v === value ? 0 : v)}
            className="rounded-lg p-1.5 min-w-[44px] min-h-[44px] flex items-center justify-center transition-transform active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 touch-manipulation"
            aria-label={`${v} star${v !== 1 ? "s" : ""}`}
          >
            <Star
              className={`h-5 w-5 transition-colors ${
                v <= value ? "fill-amber-400 text-amber-400" : "text-slate-300"
              }`}
            />
          </button>
        );
      })}
    </div>
  </div>
);

// ─── Year dropdown helper ─────────────────────────────────────────────────────

const YEAR_START = 1980;
const YEAR_END = new Date().getFullYear();
const yearRange = Array.from({ length: YEAR_END - YEAR_START + 1 }, (_, i) => YEAR_END - i);

const YearSelect = ({
  label,
  value,
  onChange,
  includPresent,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  includPresent?: boolean;
}) => (
  <label className="space-y-1.5">
    <FieldLabel>{label}</FieldLabel>
    <select
      className={selectCls}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">-- Select year --</option>
      {includPresent && <option value="Present">Present</option>}
      {yearRange.map((y) => (
        <option key={y} value={String(y)}>
          {y}
        </option>
      ))}
    </select>
  </label>
);

// ─── Employment Entry Row ─────────────────────────────────────────────────────

const EmploymentRow = ({
  index,
  entry,
  onChange,
  onRemove,
  canRemove,
}: {
  index: number;
  entry: EmploymentEntry;
  onChange: (id: string, field: keyof Omit<EmploymentEntry, "id">, value: string) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
}) => (
  <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3">
      <div className="flex items-center gap-2.5">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-700 text-[11px] font-bold text-white shrink-0">
          {index}
        </div>
        <p className="text-sm font-bold text-slate-800">Employment #{index}</p>
      </div>
      {canRemove && (
        <button
          type="button"
          onClick={() => onRemove(entry.id)}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 touch-manipulation min-h-[44px]"
          aria-label={`Remove employment ${index}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span className="hidden xs:inline">Remove</span>
        </button>
      )}
    </div>
    <div className="grid gap-4 p-4 sm:grid-cols-2">
      <YearSelect
        label="From (year)"
        value={entry.from}
        onChange={(v) => onChange(entry.id, "from", v)}
      />
      <YearSelect
        label="To (year)"
        value={entry.to}
        onChange={(v) => onChange(entry.id, "to", v)}
        includPresent
      />
      <label className="space-y-1.5">
        <FieldLabel>Country</FieldLabel>
        <Input className={fieldCls} placeholder="Singapore" value={entry.country} onChange={(e) => onChange(entry.id, "country", e.target.value)} />
      </label>
      <label className="space-y-1.5">
        <FieldLabel>Employer</FieldLabel>
        <Input className={fieldCls} placeholder="Family / agency name" value={entry.employer} onChange={(e) => onChange(entry.id, "employer", e.target.value)} />
      </label>
      <label className="space-y-1.5 sm:col-span-2">
        <FieldLabel>Duties</FieldLabel>
        <Textarea className={textareaCls} rows={3} placeholder="Describe your main responsibilities…" value={entry.duties} onChange={(e) => onChange(entry.id, "duties", e.target.value)} />
      </label>
      <label className="space-y-1.5 sm:col-span-2">
        <FieldLabel>Remarks</FieldLabel>
        <Textarea className={textareaCls} rows={2} placeholder="Any additional notes…" value={entry.remarks} onChange={(e) => onChange(entry.id, "remarks", e.target.value)} />
      </label>
    </div>
  </div>
);

// ─── Height / Weight options ──────────────────────────────────────────────────

const cmToFtIn = (cm: number): string => {
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return `${feet}'${inches}"`;
};

const heightOptions = Array.from({ length: 121 }, (_, i) => {
  const cm = 100 + i;
  return { value: String(cm), label: `${cm} cm (${cmToFtIn(cm)})` };
});

const weightOptions = Array.from({ length: 121 }, (_, i) => {
  const kg = 30 + i;
  const lbs = Math.round(kg * 2.20462);
  return { value: String(kg), label: `${kg} kg (${lbs} lbs)` };
});

// ─── Terms Alert ──────────────────────────────────────────────────────────────

const TermsAlert = () => (
  <div className="flex items-start gap-3 rounded-xl border-2 border-amber-300 bg-amber-50 p-4" role="alert">
    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
    <div>
      <p className="text-sm font-bold text-amber-900">You must agree before continuing</p>
      <p className="mt-0.5 text-xs leading-relaxed text-amber-800">
        Please check the box to accept the terms and conditions before moving to the next step.
      </p>
    </div>
  </div>
);

// ─── Review Summary Row ──────────────────────────────────────────────────────

const ReviewRow = ({ label, value }: { label: string; value?: string | null }) => (
  <div className="flex flex-col sm:flex-row sm:items-start gap-0.5 sm:gap-3 py-2 border-b border-slate-50 last:border-0">
    <span className="text-xs font-semibold text-slate-500 sm:w-40 shrink-0">{label}</span>
    <span className={`text-sm ${value ? "text-slate-900" : "text-slate-400 italic"}`}>
      {value || "Not provided"}
    </span>
  </div>
);

const ReviewSection = ({
  title,
  icon: Icon,
  onEdit,
  children,
}: {
  title: string;
  icon: ElementType;
  onEdit: () => void;
  children: React.ReactNode;
}) => (
  <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
    <div className="flex items-center justify-between gap-3 px-4 py-3 bg-slate-50 border-b border-slate-100">
      <div className="flex items-center gap-2.5">
        <Icon className="h-4 w-4 text-emerald-700" />
        <p className="text-sm font-bold text-slate-800">{title}</p>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 touch-manipulation min-h-[44px]"
      >
        <Pencil className="h-3 w-3" />
        Edit
      </button>
    </div>
    <div className="px-4 py-3 divide-y divide-slate-50">
      {children}
    </div>
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────

const PublicMaidApplicationPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState<ApplicantFormState>(initialState);
  const [files, setFiles] = useState<Record<string, File[]>>({});
  const [activeStep, setActiveStep] = useState(0);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTermsAlert, setShowTermsAlert] = useState(false);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [languageDraft, setLanguageDraft] = useState("");
  const [employmentHistory, setEmploymentHistory] = useState<EmploymentEntry[]>([createEmptyEntry()]);
  const [introCompleted, setIntroCompleted] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [hasDraft, setHasDraft] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const formChanged = useRef(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const agenciesQuery = useQuery({
    queryKey: ["public-agency-options"],
    queryFn: fetchAgencyOptions,
  });

  // ── localStorage draft management ──────────────────────────────────────────

  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.form && parsed.form.fullName) {
          setHasDraft(true);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const saveDraft = () => {
    try {
      const draft = {
        form,
        selectedLanguages,
        employmentHistory,
        termsAccepted,
        introCompleted,
        activeStep,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // ignore quota errors
    }
  };

  const restoreDraft = () => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved);
      if (parsed.form) setForm({ ...initialState, ...parsed.form });
      if (parsed.selectedLanguages) setSelectedLanguages(parsed.selectedLanguages);
      if (parsed.employmentHistory) setEmploymentHistory(parsed.employmentHistory);
      if (parsed.termsAccepted) setTermsAccepted(parsed.termsAccepted);
      if (parsed.introCompleted) setIntroCompleted(parsed.introCompleted);
      if (typeof parsed.activeStep === "number") setActiveStep(parsed.activeStep);
      setHasDraft(false);
      toast.success("Draft restored — continue where you left off.");
    } catch {
      toast.error("Could not restore draft.");
    }
  };

  const dismissDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    setHasDraft(false);
  };

  // Auto-save on changes (debounced)
  useEffect(() => {
    if (!formChanged.current) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveDraft();
    }, 800);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, selectedLanguages, employmentHistory, termsAccepted, introCompleted, activeStep]);

  // Warn before leaving with unsaved data
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (form.fullName || form.email || form.contactNumber) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [form.fullName, form.email, form.contactNumber]);

  // ── Validation ─────────────────────────────────────────────────────────────

  const validateField = (key: string, value: string): string | undefined => {
    switch (key) {
      case "fullName":
        if (!value.trim()) return "Full name is required.";
        if (value.trim().length < 2) return "Name must be at least 2 characters.";
        return undefined;
      case "email":
        if (!value.trim()) return "Email is required.";
        if (!emailRegex.test(value)) return "Please enter a valid email address.";
        return undefined;
      case "contactNumber":
        if (!value.trim()) return "WhatsApp number is required.";
        if (value.replace(/\D/g, "").length < 7) return "Please enter a valid phone number.";
        return undefined;
      case "nationality":
        if (!value) return "Please select your nationality.";
        return undefined;
      default:
        if (requiredAddMaidProfileFields.includes(key as keyof ApplicantFormState) && !value.trim()) {
          return `${addMaidFieldLabels[key as keyof ApplicantFormState] || key} is required.`;
        }
        return undefined;
    }
  };

  const validateStep = (step: number): FieldErrors => {
    const newErrors: FieldErrors = {};
    if (step === 1) {
      requiredAddMaidProfileFields.forEach((key) => {
        const error = validateField(key, form[key]);
        if (error) newErrors[key] = error;
      });
    }
    return newErrors;
  };

  const handleBlur = (key: string, value: string) => {
    setTouched((prev) => ({ ...prev, [key]: true }));
    const error = validateField(key, value);
    setErrors((prev) => {
      const next = { ...prev };
      if (error) next[key] = error;
      else delete next[key];
      return next;
    });
  };

  // ── Form actions ───────────────────────────────────────────────────────────

  const serializeEmploymentHistory = () => {
    const entries: Record<string, string> = {};
    employmentHistory.forEach((e, i) => {
      const n = i + 1;
      entries[`employmentHistory${n}From`] = e.from;
      entries[`employmentHistory${n}To`] = e.to;
      entries[`employmentHistory${n}Country`] = e.country;
      entries[`employmentHistory${n}Employer`] = e.employer;
      entries[`employmentHistory${n}Duties`] = e.duties;
      entries[`employmentHistory${n}Remarks`] = e.remarks;
    });
    return entries;
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      setSubmitting(true);
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => formData.set(key, value));
      Object.entries(serializeEmploymentHistory()).forEach(([key, value]) =>
        formData.set(key, value)
      );
      formData.set("employmentHistoryCount", String(employmentHistory.length));
      Object.entries(files).forEach(([key, selected]) => {
        selected.forEach((file) => formData.append(key, file));
      });
      return submitPublicAtsApplication(formData);
    },
    onSuccess: (data) => {
      localStorage.removeItem(DRAFT_KEY);
      toast.success(`Application submitted. Reference: ${data.applicationCode}`);
      navigate(
        `/apply-as-maid/status/${encodeURIComponent(data.applicationId)}?token=${encodeURIComponent(data.applicantAccessToken)}`,
      );
    },
    onError: (error) => {
      setSubmitting(false);
      toast.error(error instanceof Error ? error.message : "Failed to submit application");
    },
  });

  const markChanged = () => { formChanged.current = true; };

  const updateField = (key: keyof ApplicantFormState, value: string) => {
    setForm((c) => ({ ...c, [key]: value }));
    markChanged();
    // Clear error on change if field was touched
    if (touched[key]) {
      const error = validateField(key, value);
      setErrors((prev) => {
        const next = { ...prev };
        if (error) next[key] = error;
        else delete next[key];
        return next;
      });
    }
  };

  const addEmploymentEntry = () => {
    setEmploymentHistory((c) => [...c, createEmptyEntry()]);
    markChanged();
  };

  const removeEmploymentEntry = (id: string) => {
    setEmploymentHistory((c) => c.filter((e) => e.id !== id));
    markChanged();
  };

  const updateEmploymentEntry = (
    id: string,
    field: keyof Omit<EmploymentEntry, "id">,
    value: string
  ) => {
    setEmploymentHistory((c) =>
      c.map((e) => (e.id === id ? { ...e, [field]: value } : e))
    );
    markChanged();
  };

  const syncLanguages = (next: string[]) => {
    setSelectedLanguages(next);
    updateField("languageSkills", next.join(", "));
  };

  const addLanguage = () => {
    const v = languageDraft.trim();
    if (!v || selectedLanguages.includes(v)) return;
    syncLanguages([...selectedLanguages, v]);
    setLanguageDraft("");
  };

  const removeLanguage = (lang: string) =>
    syncLanguages(selectedLanguages.filter((l) => l !== lang));

  const handleFileChange = async (field: string, fileList: FileList | null) => {
    const next = fileList ? Array.from(fileList) : [];

    // File size validation
    const config = fileConfig.find((c) => c.key === field);
    if (config) {
      const oversized = next.find((f) => f.size > config.maxSizeMB * 1024 * 1024);
      if (oversized) {
        toast.error(`"${oversized.name}" exceeds the ${config.maxSizeMB} MB limit.`);
        return;
      }
    }

    if (field === "introVideo" && next[0]) {
      const url = URL.createObjectURL(next[0]);
      try {
        const valid = await new Promise<boolean>((res) => {
          const v = document.createElement("video");
          v.preload = "metadata";
          v.onloadedmetadata = () => res(Number(v.duration || 0) > 0 && v.duration <= 60);
          v.onerror = () => res(false);
          v.src = url;
        });
        if (!valid) {
          toast.error("Introduction video must be 1 minute or less.");
          setFiles((c) => ({ ...c, [field]: [] }));
          return;
        }
      } finally {
        URL.revokeObjectURL(url);
      }
    }
    setFiles((c) => ({ ...c, [field]: next }));
    markChanged();
  };

  const removeFile = (field: string, index: number) => {
    setFiles((c) => ({
      ...c,
      [field]: (c[field] || []).filter((_, i) => i !== index),
    }));
    markChanged();
  };

  const handleDrop = (field: string, e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length) {
      handleFileChange(field, e.dataTransfer.files);
    }
  };

  // ── Step management ────────────────────────────────────────────────────────

  const stepItems = useMemo(
    () =>
      applicationSteps.map((s) => ({
        ...s,
        isComplete:
          s.id === "intro"
            ? introCompleted
            : s.id === "biodata"
              ? Boolean(form.fullName && form.email && form.contactNumber && form.nationality && form.dateOfBirth)
              : s.id === "health"
                ? Boolean(form.medicalConditions || form.restDayPreference || form.foodPreference)
                : s.id === "skills"
                  ? Boolean(form.yearsOfExperience && form.languageSkills && form.cookingSkills)
                  : s.id === "documents"
                    ? Boolean(form.availableDate || form.coverNote || files.resume?.length)
                    : false, // review step is never "pre-complete"
      })),
    [
      introCompleted,
      files.resume,
      form.contactNumber,
      form.cookingSkills,
      form.coverNote,
      form.dateOfBirth,
      form.email,
      form.foodPreference,
      form.fullName,
      form.languageSkills,
      form.medicalConditions,
      form.nationality,
      form.restDayPreference,
      form.availableDate,
      form.yearsOfExperience,
    ],
  );

  const isReviewStep = activeStep === stepItems.length - 1;
  const isFirstStep = activeStep === 0;
  const applicantStepCount = stepItems.length - 1;
  const progressPct = Math.round((activeStep / applicantStepCount) * 100);
  const progressLabel = activeStep === 0 ? "Getting started" : `Step ${activeStep} of ${applicantStepCount}`;

  const scrollToTerms = () => {
    setTimeout(() => {
      document.getElementById("terms-checkbox")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
  };

  const requireTerms = () => {
    setActiveStep(0);
    setShowTermsAlert(true);
    scrollToTerms();
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goNext = () => {
    if (activeStep === 0) {
      if (!termsAccepted) {
        setShowTermsAlert(true);
        scrollToTerms();
        return;
      }
      setIntroCompleted(true);
      setShowTermsAlert(false);
      setActiveStep(1);
      scrollToTop();
      return;
    }

    // Validate current step before advancing
    const stepErrors = validateStep(activeStep);
    if (Object.keys(stepErrors).length > 0) {
      setErrors((prev) => ({ ...prev, ...stepErrors }));
      setTouched((prev) => {
        const next = { ...prev };
        Object.keys(stepErrors).forEach((k) => (next[k] = true));
        return next;
      });
      toast.error("Please fix the highlighted fields before continuing.");
      // Scroll to first error
      const firstErrorKey = Object.keys(stepErrors)[0];
      setTimeout(() => {
        document.getElementById(`field-${firstErrorKey}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
      return;
    }

    setActiveStep((c) => Math.min(c + 1, stepItems.length - 1));
    scrollToTop();
  };

  const goPrev = () => {
    setActiveStep((c) => Math.max(c - 1, 0));
    scrollToTop();
  };

  const handleStepClick = (i: number) => {
    if (i === 0) { setActiveStep(0); scrollToTop(); return; }
    if (!introCompleted) { requireTerms(); return; }
    setActiveStep(i);
    scrollToTop();
  };

  // ── Review helpers ─────────────────────────────────────────────────────────

  const getNationalityDisplay = () => {
    if (!form.nationality) return null;
    return `${form.nationality} maid`;
  };

  const getEmploymentSummary = () => {
    return employmentHistory.filter((e) => e.from || e.to || e.country || e.employer);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#ecfdf5_0,_#f8fafc_38rem,_#f8fafc_100%)]">
      <PublicSiteNavbar />

      {/* Draft restore banner */}
      {hasDraft && (
        <div className="mx-auto w-full max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 rounded-xl border-2 border-emerald-300 bg-emerald-50 p-4">
            <div className="flex items-center gap-2 min-w-0">
              <Save className="h-4 w-4 shrink-0 text-emerald-600" />
              <p className="text-sm font-semibold text-emerald-900">
                You have a saved draft from a previous session.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0 sm:ml-auto">
              <Button
                type="button"
                size="sm"
                onClick={restoreDraft}
                className="h-9 bg-emerald-700 text-white hover:bg-emerald-800 font-semibold"
              >
                Restore draft
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={dismissDraft}
                className="h-9 border-slate-200 text-slate-600 font-semibold"
              >
                Dismiss
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Full-page submitting overlay */}
      {submitting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 rounded-2xl bg-white p-8 shadow-2xl">
            <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
            <div className="text-center">
              <p className="text-lg font-bold text-slate-900">Submitting your application…</p>
              <p className="mt-1 text-sm text-slate-500">Please don't close this page.</p>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <form
          className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]"
          onSubmit={(e) => {
            e.preventDefault();
            if (!isReviewStep) { goNext(); return; }
            submitMutation.mutate();
          }}
        >
          {/* ── Main card ── */}
          <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-[0_18px_45px_-28px_rgba(15,23,42,0.35)]">

            {/* Step nav */}
            <div className="border-b border-slate-200 bg-gradient-to-r from-emerald-50 via-white to-slate-50 px-3 py-4 sm:px-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700">FDW application</p>
                  <p className="mt-0.5 text-sm font-bold text-slate-900">{progressLabel} <span className="font-medium text-slate-400">· {stepItems[activeStep].title}</span></p>
                </div>
                <div className="rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-bold tabular-nums text-emerald-800 shadow-sm">
                  {progressPct}% complete
                </div>
              </div>
              {/* Desktop step nav */}
              <div className="hidden sm:grid grid-cols-6 gap-1" role="tablist">
                {stepItems.map((s, i) => {
                  const Icon = s.icon;
                  const isActive = i === activeStep;
                  const isDone = s.isComplete;
                  const isLocked = i > 0 && !introCompleted;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      aria-current={isActive ? "step" : undefined}
                      onClick={() => handleStepClick(i)}
                      className={`group relative flex flex-col items-center gap-1 rounded-xl px-1.5 py-2.5 text-center transition-all touch-manipulation ${
                        isActive
                          ? "bg-white shadow-sm ring-1 ring-emerald-100"
                          : isLocked
                          ? "opacity-40 cursor-not-allowed"
                          : "hover:bg-white/80 cursor-pointer"
                      }`}
                      disabled={isLocked}
                    >
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full transition-all ${
                          isActive
                            ? "bg-emerald-700 text-white shadow-md shadow-emerald-700/20"
                          : isDone
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-200 text-slate-500 group-hover:bg-slate-300"
                        }`}
                      >
                        {isDone && !isActive ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                        ) : (
                          <Icon className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <p className={`text-[9px] font-bold uppercase tracking-widest leading-none ${isActive ? "text-emerald-700" : "text-slate-400"}`}>
                          {i === 0 ? s.step : `0${i}`}
                        </p>
                        <p className={`text-[11px] font-semibold leading-tight mt-0.5 ${isActive ? "text-slate-900" : "text-slate-500"}`}>
                          {s.title}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Mobile step nav — compact */}
              <div className="flex sm:hidden items-center justify-between gap-2 px-1 py-1">
                <button
                  type="button"
                  onClick={() => handleStepClick(Math.max(0, activeStep - 1))}
                  disabled={activeStep === 0}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-slate-500 disabled:opacity-30 touch-manipulation"
                  aria-label="Previous step"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="flex-1 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">
                    {stepItems[activeStep].step}
                  </p>
                  <p className="text-sm font-bold text-slate-900">
                    {stepItems[activeStep].title}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleStepClick(Math.min(stepItems.length - 1, activeStep + 1))}
                  disabled={activeStep === stepItems.length - 1 || (activeStep === 0 && !introCompleted)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-slate-500 disabled:opacity-30 touch-manipulation"
                  aria-label="Next step"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {/* Mobile dot indicators */}
              <div className="flex sm:hidden items-center justify-center gap-1.5 pb-1">
                {stepItems.map((s, i) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleStepClick(i)}
                    className={`h-2 rounded-full transition-all touch-manipulation ${
                      i === activeStep ? "w-6 bg-emerald-600" : s.isComplete ? "w-2 bg-emerald-300" : "w-2 bg-slate-300"
                    }`}
                    aria-label={`Go to ${s.title}`}
                  />
                ))}
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-2 bg-slate-100" role="progressbar" aria-valuenow={progressPct} aria-valuemin={0} aria-valuemax={100} aria-label={`Application progress: ${progressLabel}`}>
              <div
                className="h-full rounded-r-full bg-gradient-to-r from-emerald-600 to-teal-500 transition-all duration-500 ease-out"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            {/* Panel content */}
            <div className="p-5 sm:p-7 lg:p-9" role="tabpanel">

              {/* ── Step 0: Intro ── */}
              {activeStep === 0 && (
                <div className="space-y-5">
                  <SectionHeader
                    step="Start"
                    title="Professional FDW application"
                    description="Complete your profile in a recruiter-friendly format so agencies can review, verify, and shortlist you quickly."
                    icon={Sparkles}
                  />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-xl bg-emerald-50 p-5 border border-emerald-100">
                      <p className="mb-3 text-sm font-bold text-emerald-900">Application process</p>
                      <ol className="space-y-3 text-sm leading-relaxed text-emerald-800">
                        {[
                          "Complete your biodata in the standard FDW screening format.",
                          "Add your health notes, preferences, and work arrangement details.",
                          "Provide care skills, employment history, and supporting documents.",
                          "Review your full application before submitting.",
                          "Submit once and receive a private status page with your reference number.",
                        ].map((step, i) => (
                          <li key={i} className="flex gap-3">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-[10px] font-bold text-white mt-0.5">{i + 1}</span>
                            <span className="text-sm">{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                      <p className="mb-3 text-sm font-bold text-slate-800">Prepare before you begin</p>
                      <ul className="space-y-3 text-sm leading-relaxed text-slate-600">
                        {[
                          "Use an active WhatsApp number and email so recruiters can contact you quickly.",
                          "Keep your passport, resume, and certificates ready if available.",
                          "Use truthful details — agencies may compare this with your official biodata.",
                          "Your progress is automatically saved — you can return anytime.",
                        ].map((item, i) => (
                          <li key={i} className="flex gap-2.5">
                            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Terms */}
                  <div className="rounded-xl border border-slate-200 bg-white p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
                        <ShieldCheck className="h-4 w-4" />
                      </div>
                      <p className="text-sm font-bold text-slate-900">Applicant declaration and consent</p>
                    </div>
                    <ul className="space-y-1.5 text-sm leading-relaxed text-slate-700" role="list">
                      {applicationTerms.map((t, i) => (
                        <li key={i} className="flex items-start gap-2.5 rounded-lg px-2 py-2 even:bg-slate-50">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" aria-hidden="true" />
                          {t}
                        </li>
                      ))}
                    </ul>

                    <label
                      id="terms-label"
                      htmlFor="terms-checkbox"
                      className={`mt-5 flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition-all ${
                        termsAccepted
                          ? "border-emerald-500 bg-emerald-50"
                          : showTermsAlert
                          ? "border-amber-400 bg-amber-50 ring-2 ring-amber-200"
                          : "border-slate-200 bg-slate-50 hover:border-emerald-300"
                      }`}
                    >
                      <input
                        id="terms-checkbox"
                        type="checkbox"
                        checked={termsAccepted}
                        onChange={(e) => {
                          setTermsAccepted(e.target.checked);
                          if (e.target.checked) setShowTermsAlert(false);
                          markChanged();
                        }}
                        className="mt-0.5 h-5 w-5 cursor-pointer rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 shrink-0"
                        aria-required="true"
                      />
                      <span className="text-sm font-semibold text-slate-900 leading-relaxed">
                        I confirm that I have read and accept the applicant declaration and consent terms before proceeding.
                      </span>
                      {termsAccepted && (
                        <CheckCircle2 className="ml-auto mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
                      )}
                    </label>

                    {showTermsAlert && !termsAccepted && (
                      <div className="mt-3">
                        <TermsAlert />
                      </div>
                    )}

                    {termsAccepted && !introCompleted && (
                      <p className="mt-3 text-center text-xs font-semibold text-emerald-700">
                        ✓ Terms accepted — click <span className="font-bold">Continue</span> below to proceed to Step 1.
                      </p>
                    )}

                    {introCompleted && (
                      <p className="mt-3 text-center text-xs font-semibold text-emerald-700">
                        ✓ Introduction completed — you may navigate freely between all steps.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* ── Step 1: Biodata ── */}
              {activeStep === 1 && (
                <>
                  <SectionHeader
                    step="Step 1"
                    title="FDW biodata"
                    description="Personal details in the same style as the FDW biodata form so recruiters can process your application in a familiar format."
                    icon={UserRound}
                  />

                  {/* Validation summary */}
                  {Object.keys(errors).length > 0 && (
                    <div className="mb-4 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4" role="alert">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                      <div>
                        <p className="text-sm font-bold text-rose-800">Please fix the following:</p>
                        <ul className="mt-1 space-y-0.5">
                          {Object.values(errors).map((err, i) => (
                            <li key={i} className="text-xs text-rose-700">• {err}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-1.5">
                      <FieldLabel>Agency</FieldLabel>
                      {agenciesQuery.isLoading ? (
                        <div className="h-11 rounded-lg border border-slate-200 bg-slate-50 animate-pulse" />
                      ) : (
                        <select
                          className={selectCls}
                          value={form.agencyId}
                          onChange={(e) => updateField("agencyId", e.target.value)}
                        >
                          {(agenciesQuery.data ?? [{ id: 1, name: "Default Agency" }]).map((a) => (
                            <option key={a.id} value={a.id}>{a.name}</option>
                          ))}
                        </select>
                      )}
                    </label>

                    <label className="space-y-1.5" id="field-fullName">
                      <FieldLabel required>Full name</FieldLabel>
                      <Input
                        id="input-fullName"
                        className={touched.fullName && errors.fullName ? fieldErrorCls : fieldCls}
                        value={form.fullName}
                        onChange={(e) => updateField("fullName", e.target.value)}
                        onBlur={(e) => handleBlur("fullName", e.target.value)}
                        required
                        placeholder="As per passport"
                        aria-invalid={touched.fullName && !!errors.fullName}
                        aria-describedby={errors.fullName ? "err-fullName" : undefined}
                      />
                      {touched.fullName && <FieldError message={errors.fullName} />}
                    </label>

                    <label className="space-y-1.5" id="field-email">
                      <FieldLabel required>Email</FieldLabel>
                      <Input
                        id="input-email"
                        className={touched.email && errors.email ? fieldErrorCls : fieldCls}
                        type="email"
                        value={form.email}
                        onChange={(e) => updateField("email", e.target.value)}
                        onBlur={(e) => handleBlur("email", e.target.value)}
                        required
                        placeholder="active@email.com"
                        aria-invalid={touched.email && !!errors.email}
                      />
                      {touched.email && <FieldError message={errors.email} />}
                    </label>

                    <label className="space-y-1.5" id="field-contactNumber">
                      <FieldLabel required>WhatsApp / contact number</FieldLabel>
                      <PhoneNumberInput
                        className={touched.contactNumber && errors.contactNumber ? fieldErrorCls : fieldCls}
                        value={form.contactNumber}
                        onChange={(v) => { updateField("contactNumber", v); }}
                        required
                        aria-invalid={touched.contactNumber && !!errors.contactNumber}
                      />
                      {touched.contactNumber && <FieldError message={errors.contactNumber} />}
                    </label>

                    <label className="space-y-1.5" id="field-nationality">
                      <FieldLabel required>Nationality</FieldLabel>
                      <select
                        className={touched.nationality && errors.nationality ? selectErrorCls : selectCls}
                        value={form.nationality}
                        onChange={(e) => updateField("nationality", e.target.value)}
                        onBlur={(e) => handleBlur("nationality", e.target.value)}
                        required
                        aria-invalid={touched.nationality && !!errors.nationality}
                      >
                        <option value="">Select Nationality</option>
                        {nationalityOptions.map((o) => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                      {touched.nationality && <FieldError message={errors.nationality} />}
                    </label>

                    <label className="space-y-1.5">
                      <FieldLabel required>Date of birth</FieldLabel>
                      <input
                        type="date"
                        className={dateCls}
                        value={form.dateOfBirth}
                        onChange={(e) => updateField("dateOfBirth", e.target.value)}
                        max={new Date().toISOString().split("T")[0]}
                        placeholder="dd/mm/yyyy"
                      />
                    </label>

                    <label className="space-y-1.5">
                      <FieldLabel>Place of birth</FieldLabel>
                      <Input className={fieldCls} value={form.placeOfBirth} onChange={(e) => updateField("placeOfBirth", e.target.value)} />
                    </label>

                    <label className="space-y-1.5">
                      <FieldLabel>Marital status</FieldLabel>
                      <select
                        className={selectCls}
                        value={form.maritalStatus}
                        onChange={(e) => updateField("maritalStatus", e.target.value)}
                      >
                        <option value="">Select Status</option>
                        {maritalStatusOptions.map((o) => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-1.5">
                      <FieldLabel>Religion</FieldLabel>
                      <select
                        className={selectCls}
                        value={form.religion}
                        onChange={(e) => updateField("religion", e.target.value)}
                      >
                        <option value="">Select Religion</option>
                        {religionOptions.map((o) => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-1.5">
                      <FieldLabel>Height</FieldLabel>
                      <select
                        className={selectCls}
                        value={form.heightCm}
                        onChange={(e) => updateField("heightCm", e.target.value)}
                      >
                        <option value="">Select Height</option>
                        {heightOptions.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-1.5">
                      <FieldLabel>Weight</FieldLabel>
                      <select
                        className={selectCls}
                        value={form.weightKg}
                        onChange={(e) => updateField("weightKg", e.target.value)}
                      >
                        <option value="">Select Weight</option>
                        {weightOptions.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-1.5">
                      <FieldLabel>Education level</FieldLabel>
                      <select className={selectCls} value={form.educationLevel} onChange={(e) => updateField("educationLevel", e.target.value)}>
                        <option value="">Select education level</option>
                        {educationLevelOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </label>

                    <label className="space-y-1.5">
                      <FieldLabel>Number of siblings</FieldLabel>
                      <Input className={fieldCls} type="number" min="0" value={form.numberOfSiblings} onChange={(e) => updateField("numberOfSiblings", e.target.value)} />
                    </label>

                    <label className="space-y-1.5">
                      <FieldLabel>Number of children</FieldLabel>
                      <Input className={fieldCls} type="number" min="0" value={form.numberOfChildren} onChange={(e) => updateField("numberOfChildren", e.target.value)} />
                    </label>

                    <label className="space-y-1.5">
                      <FieldLabel>Children ages</FieldLabel>
                      <Input className={fieldCls} value={form.childrenAges} onChange={(e) => updateField("childrenAges", e.target.value)} placeholder="e.g. 3, 6, 10" />
                    </label>

                    <label className="space-y-1.5 sm:col-span-2">
                      <FieldLabel tooltip="Your current residential address where you live now">Current residential address</FieldLabel>
                      <Textarea className={textareaCls} rows={2} value={form.address} onChange={(e) => updateField("address", e.target.value)} placeholder="Where you currently reside" />
                    </label>

                    <label className="space-y-1.5">
                      <FieldLabel tooltip="Your permanent address in your home country">Home country address — line 1</FieldLabel>
                      <Input className={fieldCls} value={form.residentialAddressLine1} onChange={(e) => updateField("residentialAddressLine1", e.target.value)} placeholder="Street address" />
                    </label>

                    <label className="space-y-1.5">
                      <FieldLabel>Home country address — line 2</FieldLabel>
                      <Input className={fieldCls} value={form.residentialAddressLine2} onChange={(e) => updateField("residentialAddressLine2", e.target.value)} placeholder="City, province, postal code" />
                    </label>

                    <label className="space-y-1.5">
                      <FieldLabel tooltip="The airport you would fly back to if returning home">Repatriation port / airport</FieldLabel>
                      <Input className={fieldCls} value={form.repatriationPort} onChange={(e) => updateField("repatriationPort", e.target.value)} placeholder="e.g. Ninoy Aquino International Airport" />
                    </label>

                    <label className="space-y-1.5">
                      <FieldLabel>Home country contact number</FieldLabel>
                      <PhoneNumberInput className={fieldCls} value={form.homeCountryContactNumber} onChange={(v) => updateField("homeCountryContactNumber", v)} />
                    </label>
                  </div>
                </>
              )}

              {/* ── Step 2: Health ── */}
              {activeStep === 2 && (
                <>
                  <SectionHeader
                    step="Step 2"
                    title="Health and preferences"
                    description="Medical declarations and household preferences so the recruiter can see your FDW profile in one complete view."
                    icon={HeartPulse}
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-1.5 sm:col-span-2">
                      <FieldLabel tooltip="List any past or ongoing medical conditions. Write 'none' if you have no conditions.">Medical conditions / previous illnesses</FieldLabel>
                      <Textarea className={textareaCls} rows={4} value={form.medicalConditions} onChange={(e) => updateField("medicalConditions", e.target.value)} placeholder="Mental illness, epilepsy, asthma, diabetes, hypertension, operations, or write none." />
                    </label>
                    <label className="space-y-1.5">
                      <FieldLabel>Allergies</FieldLabel>
                      <Input className={fieldCls} value={form.allergies} onChange={(e) => updateField("allergies", e.target.value)} placeholder="Food, medicine, or environmental" />
                    </label>
                    <label className="space-y-1.5">
                      <FieldLabel>Physical disabilities</FieldLabel>
                      <Input className={fieldCls} value={form.physicalDisabilities} onChange={(e) => updateField("physicalDisabilities", e.target.value)} placeholder="Or write none" />
                    </label>
                    <label className="space-y-1.5">
                      <FieldLabel>Dietary restrictions</FieldLabel>
                      <Input className={fieldCls} value={form.dietaryRestrictions} onChange={(e) => updateField("dietaryRestrictions", e.target.value)} placeholder="Vegetarian, halal, etc." />
                    </label>
                    <label className="space-y-1.5">
                      <FieldLabel>Food preference</FieldLabel>
                      <select className={selectCls} value={form.foodPreference} onChange={(e) => updateField("foodPreference", e.target.value)}>
                        <option value="">Select</option>
                        <option value="No Pork">No pork</option>
                        <option value="No Beef">No beef</option>
                        <option value="No restrictions">No restrictions</option>
                        <option value="Other">Other</option>
                      </select>
                    </label>

                    {/* Conditional: only show when "Other" is selected */}
                    {form.foodPreference === "Other" && (
                      <label className="space-y-1.5 sm:col-span-2">
                        <FieldLabel>Please specify your food preference</FieldLabel>
                        <Input className={fieldCls} value={form.foodPreferenceOther} onChange={(e) => updateField("foodPreferenceOther", e.target.value)} placeholder="Describe your food preference" />
                      </label>
                    )}

                    <label className="space-y-1.5">
                      <FieldLabel>Rest day preference</FieldLabel>
                      <select className={selectCls} value={form.restDayPreference} onChange={(e) => updateField("restDayPreference", e.target.value)}>
                        <option value="">Select preference</option>
                        {restDayOptions.map((o) => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-1.5">
                      <FieldLabel>Worked in Singapore before?</FieldLabel>
                      <select className={selectCls} value={form.workedInSingapore} onChange={(e) => updateField("workedInSingapore", e.target.value)}>
                        <option value="No">No</option>
                        <option value="Yes">Yes</option>
                      </select>
                    </label>
                    <label className="space-y-1.5 sm:col-span-2">
                      <FieldLabel>Other remarks</FieldLabel>
                      <Textarea className={textareaCls} rows={3} value={form.otherRemarksA3} onChange={(e) => updateField("otherRemarksA3", e.target.value)} placeholder="Any other information you'd like the recruiter to know" />
                    </label>
                  </div>
                </>
              )}

              {/* ── Step 3: Skills ── */}
              {activeStep === 3 && (
                <>
                  <SectionHeader
                    step="Step 3"
                    title="Skills and employment history"
                    description="Complete your care assessments, cooking and language abilities, then add your work history in the FDW-style layout."
                    icon={BriefcaseBusiness}
                  />
                  <div className="grid gap-4 sm:grid-cols-2">

                    {/* Core experience */}
                    <CollapsibleSection title="Core experience" description="Years of experience, skill ratings, and languages" defaultOpen>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="space-y-1.5">
                          <FieldLabel>Years of experience</FieldLabel>
                          <Input className={fieldCls} type="number" min="0" value={form.yearsOfExperience} onChange={(e) => updateField("yearsOfExperience", e.target.value)} />
                        </label>
                        <label className="space-y-1.5">
                          <FieldLabel>Previous countries worked in</FieldLabel>
                          <Input className={fieldCls} value={form.previousCountriesWorkedIn} onChange={(e) => updateField("previousCountriesWorkedIn", e.target.value)} placeholder="Singapore, Hong Kong, Dubai" />
                        </label>
                      </div>

                      <div className="mt-4">
                        <p className="text-xs font-semibold text-slate-600 mb-3">Rate your skill level (tap a star to rate, tap again to clear)</p>
                        <div className="grid gap-3 grid-cols-1 xs:grid-cols-2 sm:grid-cols-3">
                          {skillRatingFields.map((s) => (
                            <StarSkillRating
                              key={s.key}
                              label={s.label}
                              value={Number(form[s.key] || 0)}
                              onChange={(v) => updateField(s.key, String(v))}
                            />
                          ))}
                        </div>
                      </div>

                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <label className="space-y-1.5 sm:col-span-2">
                          <FieldLabel>Cooking skills</FieldLabel>
                          <Textarea className={textareaCls} rows={3} value={form.cookingSkills} onChange={(e) => updateField("cookingSkills", e.target.value)} placeholder="Chinese food, Indian food, halal cooking, baking…" />
                        </label>

                        {/* Languages */}
                        <div className="space-y-1.5 sm:col-span-2">
                          <FieldLabel>Languages spoken</FieldLabel>
                          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <div className="mb-3 flex flex-wrap gap-2 min-h-[28px]">
                              {selectedLanguages.length === 0 ? (
                                <span className="text-xs font-medium text-slate-400">No languages added yet.</span>
                              ) : (
                                selectedLanguages.map((lang) => (
                                  <span
                                    key={lang}
                                    className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-xs font-semibold text-emerald-900 shadow-sm"
                                  >
                                    {lang}
                                    <button
                                      type="button"
                                      onClick={() => removeLanguage(lang)}
                                      className="text-emerald-400 transition hover:text-rose-500 touch-manipulation p-0.5"
                                      aria-label={`Remove ${lang}`}
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </span>
                                ))
                              )}
                            </div>
                            <div className="flex gap-2">
                              <select
                                className={`${selectCls} flex-1`}
                                value={languageDraft}
                                onChange={(e) => setLanguageDraft(e.target.value)}
                              >
                                <option value="">Select language</option>
                                {languageOptions
                                  .filter((o) => !selectedLanguages.includes(o))
                                  .map((o) => <option key={o} value={o}>{o}</option>)}
                              </select>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={addLanguage}
                                disabled={!languageDraft}
                                className="shrink-0 h-11 border-slate-200 text-slate-700 font-semibold hover:border-emerald-400 hover:text-emerald-700"
                              >
                                Add
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CollapsibleSection>

                    {/* Singapore assessments */}
                    <CollapsibleSection
                      title="Singapore experience"
                      description={form.workedInSingapore === "Yes" ? "Fill in your Singapore work assessments" : "Optional — fill if you have worked in Singapore"}
                      defaultOpen={form.workedInSingapore === "Yes"}
                      badge={form.workedInSingapore === "Yes" ? "Recommended" : "Optional"}
                    >
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="space-y-1.5 sm:col-span-2">
                          <FieldLabel>Infant / childcare assessment</FieldLabel>
                          <Textarea className={textareaCls} rows={2} value={form.sgInfantsChildrenAssessment} onChange={(e) => updateField("sgInfantsChildrenAssessment", e.target.value)} placeholder="Describe your experience with infants and children in Singapore" />
                        </label>
                        <label className="space-y-1.5">
                          <FieldLabel>Elderly assessment</FieldLabel>
                          <Textarea className={textareaCls} rows={2} value={form.sgElderlyAssessment} onChange={(e) => updateField("sgElderlyAssessment", e.target.value)} />
                        </label>
                        <label className="space-y-1.5">
                          <FieldLabel>Disabled care assessment</FieldLabel>
                          <Textarea className={textareaCls} rows={2} value={form.sgDisabledAssessment} onChange={(e) => updateField("sgDisabledAssessment", e.target.value)} />
                        </label>
                        <label className="space-y-1.5">
                          <FieldLabel>Housework assessment</FieldLabel>
                          <Textarea className={textareaCls} rows={2} value={form.sgHouseworkAssessment} onChange={(e) => updateField("sgHouseworkAssessment", e.target.value)} />
                        </label>
                        <label className="space-y-1.5">
                          <FieldLabel>Cooking assessment</FieldLabel>
                          <Textarea className={textareaCls} rows={2} value={form.sgCookingAssessment} onChange={(e) => updateField("sgCookingAssessment", e.target.value)} />
                        </label>
                        <label className="space-y-1.5">
                          <FieldLabel>Language assessment</FieldLabel>
                          <Textarea className={textareaCls} rows={2} value={form.sgLanguageAssessment} onChange={(e) => updateField("sgLanguageAssessment", e.target.value)} />
                        </label>
                        <label className="space-y-1.5">
                          <FieldLabel>Other skills</FieldLabel>
                          <Input className={fieldCls} value={form.sgOtherSkills} onChange={(e) => updateField("sgOtherSkills", e.target.value)} />
                        </label>
                        <label className="space-y-1.5">
                          <FieldLabel>Other skills assessment</FieldLabel>
                          <Textarea className={textareaCls} rows={2} value={form.sgOtherSkillsAssessment} onChange={(e) => updateField("sgOtherSkillsAssessment", e.target.value)} />
                        </label>
                      </div>
                    </CollapsibleSection>

                    {/* Overseas assessments */}
                    <CollapsibleSection
                      title="Overseas training and assessment"
                      description="Training centre details and overseas care assessments"
                      badge="Optional"
                    >
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="space-y-1.5">
                          <FieldLabel>Foreign training centre name</FieldLabel>
                          <Input className={fieldCls} value={form.foreignTrainingCentreName} onChange={(e) => updateField("foreignTrainingCentreName", e.target.value)} placeholder="Training centre or school name" />
                        </label>
                        <label className="space-y-1.5">
                          <FieldLabel>Third party certification details</FieldLabel>
                          <Input className={fieldCls} value={form.thirdPartyCertificationDetails} onChange={(e) => updateField("thirdPartyCertificationDetails", e.target.value)} placeholder="Certification body and type" />
                        </label>
                        <label className="space-y-1.5 sm:col-span-2">
                          <FieldLabel>Overseas infant / childcare assessment</FieldLabel>
                          <Textarea className={textareaCls} rows={2} value={form.overseasInfantsChildrenAssessment} onChange={(e) => updateField("overseasInfantsChildrenAssessment", e.target.value)} />
                        </label>
                        <label className="space-y-1.5">
                          <FieldLabel>Overseas elderly assessment</FieldLabel>
                          <Textarea className={textareaCls} rows={2} value={form.overseasElderlyAssessment} onChange={(e) => updateField("overseasElderlyAssessment", e.target.value)} />
                        </label>
                        <label className="space-y-1.5">
                          <FieldLabel>Overseas disabled care assessment</FieldLabel>
                          <Textarea className={textareaCls} rows={2} value={form.overseasDisabledAssessment} onChange={(e) => updateField("overseasDisabledAssessment", e.target.value)} />
                        </label>
                        <label className="space-y-1.5">
                          <FieldLabel>Overseas housework assessment</FieldLabel>
                          <Textarea className={textareaCls} rows={2} value={form.overseasHouseworkAssessment} onChange={(e) => updateField("overseasHouseworkAssessment", e.target.value)} />
                        </label>
                        <label className="space-y-1.5">
                          <FieldLabel>Overseas cooking assessment</FieldLabel>
                          <Textarea className={textareaCls} rows={2} value={form.overseasCookingAssessment} onChange={(e) => updateField("overseasCookingAssessment", e.target.value)} />
                        </label>
                        <label className="space-y-1.5">
                          <FieldLabel>Overseas language assessment</FieldLabel>
                          <Textarea className={textareaCls} rows={2} value={form.overseasLanguageAssessment} onChange={(e) => updateField("overseasLanguageAssessment", e.target.value)} />
                        </label>
                        <label className="space-y-1.5">
                          <FieldLabel>Overseas other skills</FieldLabel>
                          <Input className={fieldCls} value={form.overseasOtherSkills} onChange={(e) => updateField("overseasOtherSkills", e.target.value)} />
                        </label>
                        <label className="space-y-1.5">
                          <FieldLabel>Overseas other skills assessment</FieldLabel>
                          <Textarea className={textareaCls} rows={2} value={form.overseasOtherSkillsAssessment} onChange={(e) => updateField("overseasOtherSkillsAssessment", e.target.value)} />
                        </label>
                      </div>
                    </CollapsibleSection>

                    {/* Employment history */}
                    <CollapsibleSection
                      title="Employment history"
                      description="Add all your relevant work positions — no limit"
                      defaultOpen
                      badge={`${employmentHistory.length} ${employmentHistory.length === 1 ? "entry" : "entries"}`}
                    >
                      <div className="space-y-3">
                        {employmentHistory.map((entry, i) => (
                          <EmploymentRow
                            key={entry.id}
                            index={i + 1}
                            entry={entry}
                            onChange={updateEmploymentEntry}
                            onRemove={removeEmploymentEntry}
                            canRemove={employmentHistory.length > 1}
                          />
                        ))}

                        <button
                          type="button"
                          onClick={addEmploymentEntry}
                          className="group flex w-full items-center justify-center gap-2.5 rounded-xl border-2 border-dashed border-slate-200 bg-transparent px-4 py-4 text-sm font-semibold text-slate-500 transition-all hover:border-emerald-400 hover:bg-emerald-50/50 hover:text-emerald-700 touch-manipulation min-h-[56px]"
                        >
                          <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-current">
                            <Plus className="h-3 w-3" />
                          </span>
                          Add another employment
                        </button>
                      </div>
                    </CollapsibleSection>

                    {/* Employer feedback */}
                    <CollapsibleSection
                      title="Employer feedback"
                      description="References or feedback from previous employers"
                      badge="Optional"
                    >
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="space-y-1.5 sm:col-span-2">
                          <FieldLabel>Feedback from employer 1</FieldLabel>
                          <Textarea className={textareaCls} rows={3} value={form.feedbackEmployer1} onChange={(e) => updateField("feedbackEmployer1", e.target.value)} placeholder="What did your employer say about your work?" />
                        </label>
                        <label className="space-y-1.5 sm:col-span-2">
                          <FieldLabel>Feedback from employer 2</FieldLabel>
                          <Textarea className={textareaCls} rows={3} value={form.feedbackEmployer2} onChange={(e) => updateField("feedbackEmployer2", e.target.value)} placeholder="Additional employer feedback" />
                        </label>
                      </div>
                    </CollapsibleSection>
                  </div>
                </>
              )}

              {/* ── Step 4: Attachments ── */}
              {activeStep === 4 && (
                <>
                  <SectionHeader
                    step="Step 4"
                    title="Attachments and submission"
                    description="Share your availability, cover note, and documents that help the agency contact and shortlist you faster."
                    icon={FileCheck2}
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-1.5">
                      <FieldLabel>Available date</FieldLabel>
                      <input
                        type="date"
                        className={dateCls}
                        value={form.availableDate}
                        onChange={(e) => updateField("availableDate", e.target.value)}
                        min={new Date().toISOString().split("T")[0]}
                        placeholder="dd/mm/yyyy"
                      />
                    </label>
                    <label className="space-y-1.5">
                      <FieldLabel>Expected salary (SGD)</FieldLabel>
                      <Input className={fieldCls} type="number" min="0" value={form.expectedSalary} onChange={(e) => updateField("expectedSalary", e.target.value)} placeholder="e.g. 700" />
                    </label>
                    <label className="space-y-1.5 sm:col-span-2">
                      <FieldLabel>Employment preference</FieldLabel>
                      <select className={selectCls} value={form.employmentPreference} onChange={(e) => updateField("employmentPreference", e.target.value)}>
                        <option value="">Select preference</option>
                        {employmentPreferenceOptions.map((o) => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-1.5">
                      <FieldLabel>Certifications</FieldLabel>
                      <Textarea className={textareaCls} rows={3} value={form.certifications} onChange={(e) => updateField("certifications", e.target.value)} placeholder="List any certifications you hold" />
                    </label>
                    <label className="space-y-1.5">
                      <FieldLabel>Training records</FieldLabel>
                      <Textarea className={textareaCls} rows={3} value={form.trainingRecords} onChange={(e) => updateField("trainingRecords", e.target.value)} placeholder="Describe your training background" />
                    </label>
                    <label className="space-y-1.5 sm:col-span-2">
                      <FieldLabel tooltip="A brief paragraph about your strengths and what kind of work you're looking for">Short introduction / cover note</FieldLabel>
                      <Textarea className={textareaCls} rows={5} value={form.coverNote} onChange={(e) => updateField("coverNote", e.target.value)} placeholder="Tell us about your strengths, preferred work environment, and anything the recruiter should know." />
                    </label>
                    <label className="space-y-1.5 sm:col-span-2">
                      <FieldLabel>Final remarks</FieldLabel>
                      <Textarea className={textareaCls} rows={3} value={form.otherRemarksE} onChange={(e) => updateField("otherRemarksE", e.target.value)} placeholder="Any additional notes for the agency" />
                    </label>
                  </div>

                  {/* Upload documents */}
                  <div className="mt-6">
                    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-slate-900">Upload documents</p>
                        <p className="mt-0.5 text-xs text-slate-500">Attach supporting documents recruiters usually request with the FDW form.</p>
                      </div>
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 shrink-0">
                        Optional except resume
                      </span>
                    </div>
                    <div className="grid gap-2">
                      {fileConfig.map(({ key, label, icon: Icon, hint, maxSizeMB }) => {
                        const selectedFiles = files[key] || [];
                        const hasFiles = selectedFiles.length > 0;
                        return (
                          <div key={key}>
                            <label
                              className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 px-4 py-4 transition-all touch-manipulation min-h-[64px] ${
                                hasFiles
                                  ? "border-emerald-300 bg-emerald-50/70"
                                  : isDragging
                                  ? "border-emerald-400 bg-emerald-50 border-dashed"
                                  : "border-slate-200 bg-slate-50/80 hover:border-emerald-300 hover:bg-emerald-50/40"
                              }`}
                              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                              onDragLeave={() => setIsDragging(false)}
                              onDrop={(e) => handleDrop(key, e)}
                            >
                              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${
                                hasFiles
                                  ? "border-emerald-200 bg-emerald-100 text-emerald-700"
                                  : "border-slate-200 bg-white text-slate-500"
                              }`}>
                                {hasFiles ? (
                                  <CheckCircle2 className="h-5 w-5" />
                                ) : (
                                  <Icon className="h-5 w-5" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-slate-800">{label}</p>
                                <p className={`text-xs ${hasFiles ? "text-emerald-600 font-semibold" : "text-slate-400"}`}>
                                  {hasFiles
                                    ? `${selectedFiles.length} file${selectedFiles.length > 1 ? "s" : ""} selected`
                                    : hint}
                                </p>
                              </div>
                              <span className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:border-emerald-400 hover:text-emerald-700 min-h-[44px] flex items-center">
                                {hasFiles ? "Change" : "Choose"}
                              </span>
                              <input
                                type="file"
                                className="sr-only"
                                accept={key === "introVideo" ? ".mp4,.mov,video/*" : ".pdf,.doc,.docx,.jpg,.jpeg,.png"}
                                multiple={key !== "introVideo"}
                                onChange={(e) => void handleFileChange(key, e.target.files)}
                              />
                            </label>

                            {/* File list with remove buttons */}
                            {hasFiles && (
                              <div className="mt-1.5 space-y-1 pl-2">
                                {selectedFiles.map((file, fi) => (
                                  <div key={fi} className="flex items-center gap-2 rounded-lg bg-white border border-slate-100 px-3 py-2">
                                    <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                    <span className="text-xs font-medium text-slate-700 truncate flex-1">{file.name}</span>
                                    <span className="text-[10px] text-slate-400 shrink-0">{formatFileSize(file.size)}</span>
                                    <button
                                      type="button"
                                      onClick={() => removeFile(key, fi)}
                                      className="text-slate-300 hover:text-rose-500 transition-colors touch-manipulation p-1"
                                      aria-label={`Remove ${file.name}`}
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {/* ── Step 5: Review ── */}
              {activeStep === 5 && (
                <>
                  <SectionHeader
                    step="Step 5"
                    title="Review your application"
                    description="Please review all the information below before submitting. Click 'Edit' on any section to make changes."
                    icon={ShieldCheck}
                  />

                  <div className="space-y-4">
                    {/* Biodata review */}
                    <ReviewSection title="FDW biodata" icon={UserRound} onEdit={() => handleStepClick(1)}>
                      <ReviewRow label="Full name" value={form.fullName} />
                      <ReviewRow label="Email" value={form.email} />
                      <ReviewRow label="WhatsApp number" value={form.contactNumber} />
                      <ReviewRow label="Nationality" value={getNationalityDisplay()} />
                      <ReviewRow label="Date of birth" value={form.dateOfBirth} />
                      <ReviewRow label="Place of birth" value={form.placeOfBirth} />
                      <ReviewRow label="Marital status" value={form.maritalStatus} />
                      <ReviewRow label="Religion" value={form.religion} />
                      <ReviewRow label="Height" value={form.heightCm ? `${form.heightCm} cm` : null} />
                      <ReviewRow label="Weight" value={form.weightKg ? `${form.weightKg} kg` : null} />
                      <ReviewRow label="Education level" value={form.educationLevel} />
                      <ReviewRow label="Current address" value={form.address} />
                      <ReviewRow label="Home country address" value={[form.residentialAddressLine1, form.residentialAddressLine2].filter(Boolean).join(", ") || null} />
                      <ReviewRow label="Repatriation port" value={form.repatriationPort} />
                      <ReviewRow label="Home country contact" value={form.homeCountryContactNumber} />
                    </ReviewSection>

                    {/* Health review */}
                    <ReviewSection title="Health & preferences" icon={HeartPulse} onEdit={() => handleStepClick(2)}>
                      <ReviewRow label="Medical conditions" value={form.medicalConditions} />
                      <ReviewRow label="Allergies" value={form.allergies} />
                      <ReviewRow label="Physical disabilities" value={form.physicalDisabilities} />
                      <ReviewRow label="Dietary restrictions" value={form.dietaryRestrictions} />
                      <ReviewRow label="Food preference" value={form.foodPreference === "Other" ? form.foodPreferenceOther : form.foodPreference} />
                      <ReviewRow label="Rest day preference" value={form.restDayPreference} />
                      <ReviewRow label="Worked in Singapore" value={form.workedInSingapore} />
                    </ReviewSection>

                    {/* Skills review */}
                    <ReviewSection title="Skills & history" icon={BriefcaseBusiness} onEdit={() => handleStepClick(3)}>
                      <ReviewRow label="Years of experience" value={form.yearsOfExperience} />
                      <ReviewRow label="Countries worked in" value={form.previousCountriesWorkedIn} />
                      <ReviewRow label="Languages" value={form.languageSkills} />
                      <ReviewRow label="Cooking skills" value={form.cookingSkills} />

                      {/* Skill ratings */}
                      <div className="py-2 border-b border-slate-50">
                        <p className="text-xs font-semibold text-slate-500 mb-2">Skill ratings</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {skillRatingFields.map((s) => {
                            const val = Number(form[s.key] || 0);
                            return (
                              <div key={s.key} className="flex items-center gap-2">
                                <span className="text-xs text-slate-600">{s.label}:</span>
                                <span className={`text-xs font-bold ${val > 0 ? "text-amber-600" : "text-slate-400"}`}>
                                  {val > 0 ? `${"★".repeat(val)}${"☆".repeat(5 - val)}` : "Not rated"}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Employment history */}
                      {getEmploymentSummary().length > 0 && (
                        <div className="py-2 border-b border-slate-50">
                          <p className="text-xs font-semibold text-slate-500 mb-2">Employment history</p>
                          {getEmploymentSummary().map((e, i) => (
                            <div key={e.id} className="mb-2 last:mb-0">
                              <p className="text-sm font-medium text-slate-700">
                                {e.from && e.to ? `${e.from} – ${e.to}` : "Dates not set"} {e.country ? `· ${e.country}` : ""} {e.employer ? `· ${e.employer}` : ""}
                              </p>
                              {e.duties && <p className="text-xs text-slate-500 mt-0.5">{e.duties}</p>}
                            </div>
                          ))}
                        </div>
                      )}
                    </ReviewSection>

                    {/* Documents review */}
                    <ReviewSection title="Attachments" icon={FileCheck2} onEdit={() => handleStepClick(4)}>
                      <ReviewRow label="Available date" value={form.availableDate} />
                      <ReviewRow label="Expected salary" value={form.expectedSalary ? `SGD ${form.expectedSalary}` : null} />
                      <ReviewRow label="Employment preference" value={form.employmentPreference} />
                      <ReviewRow label="Cover note" value={form.coverNote} />

                      {/* File list */}
                      <div className="py-2">
                        <p className="text-xs font-semibold text-slate-500 mb-2">Uploaded files</p>
                        {fileConfig.map(({ key, label }) => {
                          const fileList = files[key] || [];
                          if (fileList.length === 0) return null;
                          return (
                            <div key={key} className="mb-1">
                              <span className="text-xs font-medium text-slate-600">{label}: </span>
                              {fileList.map((f, i) => (
                                <span key={i} className="text-xs text-slate-500">
                                  {f.name} ({formatFileSize(f.size)}){i < fileList.length - 1 ? ", " : ""}
                                </span>
                              ))}
                            </div>
                          );
                        })}
                        {Object.values(files).every((f) => !f || f.length === 0) && (
                          <p className="text-xs text-slate-400 italic">No files uploaded</p>
                        )}
                      </div>
                    </ReviewSection>

                    {/* Terms re-confirmation */}
                    <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 p-4">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                        <div>
                          <p className="text-sm font-bold text-emerald-900">Ready to submit</p>
                          <p className="mt-1 text-xs text-emerald-700 leading-relaxed">
                            By clicking "Submit application", you confirm that all information provided is accurate and you agree to the applicant declaration and consent terms.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* ── Navigation footer ── */}
              <div className="mt-8 flex items-center justify-between gap-3 border-t border-slate-100 pt-6">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-400 tabular-nums">
                    {activeStep + 1} / {stepItems.length}
                  </span>
                  <span className="hidden sm:inline text-[10px] text-slate-300">·</span>
                  <span className="hidden sm:inline text-[10px] font-medium text-slate-400">
                    {activeStep === 0 ? "Review the guide, then start your application" : "You can revisit any tab before submitting"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={goPrev}
                    disabled={isFirstStep}
                    className="h-11 border-slate-200 text-slate-600 font-semibold disabled:opacity-40 px-4 min-h-[44px]"
                  >
                    <ChevronLeft className="mr-1 h-3.5 w-3.5" />
                    Back
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    className={`h-11 font-semibold px-5 min-h-[44px] ${
                      isReviewStep
                        ? "bg-emerald-600 text-white hover:bg-emerald-700 text-base"
                        : "bg-emerald-700 text-white hover:bg-emerald-800"
                    } disabled:opacity-50`}
                    disabled={submitMutation.isPending}
                  >
                    {isReviewStep
                      ? submitMutation.isPending
                        ? "Submitting…"
                        : "Submit application"
                      : "Continue"}
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* ── Sidebar ── */}
          <div className="grid gap-4 xl:sticky xl:top-6 xl:self-start md:grid-cols-2 xl:grid-cols-1">

            <div className="rounded-2xl bg-slate-900 p-6 text-white shadow-md">
              <div className="flex items-center gap-3 mb-5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                  <Globe2 className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Before you submit</p>
                  <p className="text-sm font-bold text-white leading-snug">Present a review-ready profile</p>
                </div>
              </div>
              <p className="text-xs leading-relaxed text-slate-400">
                Your application is easier to shortlist when your experience, language coverage, and supporting documents are complete. Recruiters will use your contact details for follow-up and interview coordination.
              </p>
              <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-emerald-400">Application checklist</p>
                <ul className="space-y-2">
                  {publicInfoChecklist.map((item) => {
                    const isDone =
                      (item.includes("WhatsApp") && form.contactNumber && form.email) ||
                      (item.includes("Biodata") && form.fullName && form.nationality) ||
                      (item.includes("Employment") && employmentHistory.some((e) => e.from || e.employer)) ||
                      (item.includes("Resume") && (files.resume?.length || files.passport?.length));
                    return (
                      <li key={item} className="flex items-start gap-2 text-xs">
                        {isDone ? (
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                        ) : (
                          <span className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full border border-slate-600" />
                        )}
                        <span className={isDone ? "text-emerald-300 line-through decoration-emerald-500/30" : "text-slate-300"}>
                          {item}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* Auto-save indicator */}
              <div className="mt-3 flex items-center gap-2 px-1">
                <Save className="h-3 w-3 text-slate-500" />
                <p className="text-[10px] text-slate-500">Progress is auto-saved</p>
              </div>

              {!introCompleted && (
                <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
                  <p className="text-xs font-semibold text-amber-300">
                    Accept the terms and click Continue on the first step before submitting.
                  </p>
                </div>
              )}

              <Button
                type="submit"
                className="mt-5 w-full h-11 bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 font-bold min-h-[44px]"
                disabled={submitMutation.isPending || !introCompleted}
              >
                {submitMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  <>
                    Submit application
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
              <p className="mt-3 text-center text-[11px] leading-relaxed text-slate-500">
                By submitting, you allow the agency to review your information and contact you about recruitment opportunities.
              </p>
            </div>

            {/* What happens next */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="mb-4 text-sm font-bold text-slate-900">What happens next</p>
              <ol className="space-y-3 text-xs leading-relaxed text-slate-600">
                {[
                  "Your profile is added to the agency applicant pipeline for screening and review.",
                  "Recruiters assess experience, skills, and documents before contacting shortlisted candidates.",
                  "You may receive follow-ups for missing documents, interview scheduling, or status updates.",
                ].map((item, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-800">{i + 1}</span>
                    {item}
                  </li>
                ))}
              </ol>
              <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 p-3.5 text-xs leading-relaxed text-amber-800">
                Keep your phone nearby after submitting. Support may contact you on WhatsApp or email for clarifications.
              </div>
            </div>

          </div>
        </form>
      </div>
    </div>
  );
};

export default PublicMaidApplicationPage;
