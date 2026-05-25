import { useMemo, useState, type ElementType } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import PublicSiteNavbar from "@/components/PublicSiteNavbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { fetchAgencyOptions } from "@/lib/agencies";
import { submitPublicAtsApplication } from "@/lib/ats";
import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronLeft,
  FileCheck2,
  Globe2,
  HeartPulse,
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

// ─── Constants ────────────────────────────────────────────────────────────────

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
  { key: "resume", label: "Resume / CV", icon: FileText, hint: "PDF, DOC, DOCX, JPG, PNG" },
  { key: "passport", label: "Passport copy", icon: CreditCard, hint: "PDF, JPG, PNG" },
  { key: "certificates", label: "Certificates / training records", icon: Award, hint: "PDF, DOC, DOCX, JPG, PNG" },
  { key: "medical", label: "Medical documents", icon: Stethoscope, hint: "PDF, JPG, PNG" },
  { key: "references", label: "Reference letters", icon: ClipboardList, hint: "PDF, DOC, DOCX" },
  { key: "introVideo", label: "Introduction video", icon: Video, hint: "MP4, MOV — max 1 minute" },
  { key: "otherDocuments", label: "Other supporting documents", icon: Paperclip, hint: "PDF, DOC, DOCX, JPG, PNG" },
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

const selectCls =
  "h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-slate-900 shadow-none transition-colors focus-visible:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 appearance-none cursor-pointer";

const textareaCls =
  "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-none resize-none transition-colors focus-visible:outline-none focus-visible:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-100";

// Date input styled to match fieldCls — browser renders dd/mm/yyyy based on locale,
// but the underlying value stays as yyyy-mm-dd (HTML spec). The placeholder text
// "dd/mm/yyyy" is shown via the class below when the field is empty.
const dateCls =
  "h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-none transition-colors focus-visible:outline-none focus-visible:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-100 cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-60 [&::-webkit-calendar-picker-indicator]:cursor-pointer";

const labelCls = "block text-xs font-semibold text-slate-600 mb-1.5 tracking-wide";

// ─── Small reusable components ────────────────────────────────────────────────

const FieldLabel = ({ children, required }: { children: React.ReactNode; required?: boolean }) => (
  <span className={labelCls}>
    {children}
    {required && <span className="ml-0.5 text-rose-500">*</span>}
  </span>
);

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
    <div className="flex items-center gap-1.5">
      {Array.from({ length: 5 }, (_, i) => {
        const v = i + 1;
        return (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v === value ? 0 : v)}
            className="rounded p-0.5 transition-transform active:scale-95 focus:outline-none touch-manipulation"
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
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 touch-manipulation"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span className="hidden xs:inline">Remove</span>
        </button>
      )}
    </div>
    <div className="grid gap-4 p-4 sm:grid-cols-2">
      {/* From / To — year dropdowns */}
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

// ─── Height options: 100–220 cm with ft/in label ─────────────────────────────

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

// ─── Weight options: 30–150 kg with lbs label ────────────────────────────────

const weightOptions = Array.from({ length: 121 }, (_, i) => {
  const kg = 30 + i;
  const lbs = Math.round(kg * 2.20462);
  return { value: String(kg), label: `${kg} kg (${lbs} lbs)` };
});

// ─── Terms Alert ──────────────────────────────────────────────────────────────

const TermsAlert = () => (
  <div className="flex items-start gap-3 rounded-xl border-2 border-amber-300 bg-amber-50 p-4">
    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
    <div>
      <p className="text-sm font-bold text-amber-900">You must agree before continuing</p>
      <p className="mt-0.5 text-xs leading-relaxed text-amber-800">
        Please check the box to accept the terms and conditions before moving to the next step.
      </p>
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

  // ── NEW: tracks whether the user explicitly clicked "Continue" on step 0.
  // Only after introCompleted === true are steps 1–4 accessible.
  const [introCompleted, setIntroCompleted] = useState(false);

  const agenciesQuery = useQuery({
    queryKey: ["public-agency-options"],
    queryFn: fetchAgencyOptions,
  });

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
      toast.success(`Application submitted. Reference: ${data.applicationCode}`);
      navigate(
        `/apply-as-maid/status/${encodeURIComponent(data.applicationId)}?token=${encodeURIComponent(data.applicantAccessToken)}`,
      );
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Failed to submit application"),
  });

  const updateField = (key: keyof ApplicantFormState, value: string) =>
    setForm((c) => ({ ...c, [key]: value }));

  const addEmploymentEntry = () =>
    setEmploymentHistory((c) => [...c, createEmptyEntry()]);

  const removeEmploymentEntry = (id: string) =>
    setEmploymentHistory((c) => c.filter((e) => e.id !== id));

  const updateEmploymentEntry = (
    id: string,
    field: keyof Omit<EmploymentEntry, "id">,
    value: string
  ) =>
    setEmploymentHistory((c) =>
      c.map((e) => (e.id === id ? { ...e, [field]: value } : e))
    );

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

  const handleFileChange = async (field: string, list: FileList | null) => {
    const next = list ? Array.from(list) : [];
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
  };

  const stepItems = useMemo(
    () =>
      applicationSteps.map((s) => ({
        ...s,
        isComplete:
          s.id === "intro"
            ? introCompleted
            : s.id === "biodata"
              ? Boolean(form.fullName && form.email && form.contactNumber && form.nationality)
              : s.id === "health"
                ? Boolean(form.medicalConditions || form.restDayPreference || form.foodPreference)
                : s.id === "skills"
                  ? Boolean(form.yearsOfExperience && form.languageSkills && form.cookingSkills)
                  : Boolean(form.availableDate || form.coverNote || files.resume?.length),
      })),
    [
      introCompleted,
      files.resume,
      form.contactNumber,
      form.cookingSkills,
      form.coverNote,
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

  const isLastStep = activeStep === stepItems.length - 1;
  const isFirstStep = activeStep === 0;

  // ── Scroll helper ─────────────────────────────────────────────────────────
  const scrollToTerms = () => {
    setTimeout(() => {
      document.getElementById("terms-checkbox")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
  };

  // ── Show terms alert and return to step 0 ─────────────────────────────────
  const requireTerms = () => {
    setActiveStep(0);
    setShowTermsAlert(true);
    scrollToTerms();
  };

  // ── "Continue" / "Submit" handler ─────────────────────────────────────────
  const goNext = () => {
    if (activeStep === 0) {
      // Must have accepted terms before leaving step 0
      if (!termsAccepted) {
        setShowTermsAlert(true);
        scrollToTerms();
        return;
      }
      // Mark intro as completed so other tabs unlock
      setIntroCompleted(true);
      setShowTermsAlert(false);
      setActiveStep(1);
      return;
    }
    setActiveStep((c) => Math.min(c + 1, stepItems.length - 1));
  };

  const goPrev = () => setActiveStep((c) => Math.max(c - 1, 0));

  // ── Tab click handler ─────────────────────────────────────────────────────
  // Step 0 is always accessible.
  // Steps 1–4 require introCompleted (i.e. user clicked Continue on step 0).
  const handleStepClick = (i: number) => {
    if (i === 0) {
      setActiveStep(0);
      return;
    }
    if (!introCompleted) {
      requireTerms();
      return;
    }
    setActiveStep(i);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <PublicSiteNavbar />

      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <form
          className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]"
          onSubmit={(e) => {
            e.preventDefault();
            if (!isLastStep) { goNext(); return; }
            submitMutation.mutate();
          }}
        >
          {/* ── Main card ─────────────────────────────────────────────── */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">

            {/* Step nav */}
            <div className="border-b border-slate-100 bg-slate-50/80 p-1.5 rounded-t-2xl">
              <div className="grid grid-cols-5 gap-0.5">
                {stepItems.map((s, i) => {
                  const Icon = s.icon;
                  const isActive = i === activeStep;
                  const isDone = s.isComplete;
                  // Steps 1–4 are locked until user explicitly continues from step 0
                  const isLocked = i > 0 && !introCompleted;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleStepClick(i)}
                      className={`group flex flex-col items-center gap-1 rounded-xl px-1.5 py-2.5 text-center transition-all touch-manipulation ${
                        isActive
                          ? "bg-white shadow-sm"
                          : isLocked
                          ? "opacity-40 cursor-not-allowed"
                          : "hover:bg-white/80 cursor-pointer"
                      }`}
                    >
                      <div
                        className={`flex h-7 w-7 items-center justify-center rounded-lg transition-all ${
                          isActive
                            ? "bg-emerald-700 text-white shadow-sm"
                            : isDone
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-200 text-slate-500 group-hover:bg-slate-300"
                        }`}
                      >
                        {isDone && !isActive ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
                        ) : (
                          <Icon className="h-3.5 w-3.5" />
                        )}
                      </div>
                      <div>
                        <p className={`text-[9px] font-bold uppercase tracking-widest leading-none ${isActive ? "text-emerald-700" : "text-slate-400"}`}>
                          {s.step}
                        </p>
                        <p className={`hidden text-[11px] font-semibold leading-tight mt-0.5 sm:block ${isActive ? "text-slate-900" : "text-slate-500"}`}>
                          {s.title}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-0.5 bg-slate-100">
              <div
                className="h-full bg-emerald-600 transition-all duration-500"
                style={{ width: `${(activeStep / (stepItems.length - 1)) * 100}%` }}
              />
            </div>

            {/* Panel content */}
            <div className="p-4 sm:p-6 lg:p-8">

              {/* ── Step 0: Intro ─────────────────────────────────────── */}
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
                    <ul className="space-y-1.5 text-sm leading-relaxed text-slate-700">
                      {applicationTerms.map((t, i) => (
                        <li key={i} className="flex items-start gap-2.5 rounded-lg px-2 py-2 even:bg-slate-50">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                          {t}
                        </li>
                      ))}
                    </ul>

                    <label
                      id="terms-label"
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
                        }}
                        className="mt-0.5 h-4 w-4 cursor-pointer rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 shrink-0"
                      />
                      <span className="text-sm font-semibold text-slate-900 leading-relaxed">
                        I confirm that I have read and accept the applicant declaration and consent terms before proceeding.
                      </span>
                      {termsAccepted && (
                        <CheckCircle2 className="ml-auto mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
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

              {/* ── Step 1: Biodata ───────────────────────────────────── */}
              {activeStep === 1 && (
                <>
                  <SectionHeader
                    step="Step 1"
                    title="FDW biodata"
                    description="Personal details in the same style as the FDW biodata form so recruiters can process your application in a familiar format."
                    icon={UserRound}
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-1.5">
                      <FieldLabel>Agency</FieldLabel>
                      <select
                        className={selectCls}
                        value={form.agencyId}
                        onChange={(e) => updateField("agencyId", e.target.value)}
                      >
                        {(agenciesQuery.data ?? [{ id: 1, name: "Default Agency" }]).map((a) => (
                          <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-1.5">
                      <FieldLabel required>Full name</FieldLabel>
                      <Input className={fieldCls} value={form.fullName} onChange={(e) => updateField("fullName", e.target.value)} required placeholder="As per passport" />
                    </label>
                    <label className="space-y-1.5">
                      <FieldLabel required>Email</FieldLabel>
                      <Input className={fieldCls} type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} required placeholder="active@email.com" />
                    </label>
                    <label className="space-y-1.5">
                      <FieldLabel required>WhatsApp / contact number</FieldLabel>
                      <Input className={fieldCls} value={form.contactNumber} onChange={(e) => updateField("contactNumber", e.target.value)} required placeholder="+63 912 345 6789" />
                    </label>
                    <label className="space-y-1.5">
                      <FieldLabel required>Nationality</FieldLabel>
                      <Input className={fieldCls} value={form.nationality} onChange={(e) => updateField("nationality", e.target.value)} required />
                    </label>

                    {/* Date of birth — native date picker, displays dd/mm/yyyy */}
                    <label className="space-y-1.5">
                      <FieldLabel>Date of birth</FieldLabel>
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
                      <Input className={fieldCls} value={form.maritalStatus} onChange={(e) => updateField("maritalStatus", e.target.value)} />
                    </label>
                    <label className="space-y-1.5">
                      <FieldLabel>Religion</FieldLabel>
                      <Input className={fieldCls} value={form.religion} onChange={(e) => updateField("religion", e.target.value)} />
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
                      <FieldLabel>Residential address</FieldLabel>
                      <Textarea className={textareaCls} rows={2} value={form.address} onChange={(e) => updateField("address", e.target.value)} />
                    </label>
                    <label className="space-y-1.5">
                      <FieldLabel>Home address line 1</FieldLabel>
                      <Input className={fieldCls} value={form.residentialAddressLine1} onChange={(e) => updateField("residentialAddressLine1", e.target.value)} />
                    </label>
                    <label className="space-y-1.5">
                      <FieldLabel>Home address line 2</FieldLabel>
                      <Input className={fieldCls} value={form.residentialAddressLine2} onChange={(e) => updateField("residentialAddressLine2", e.target.value)} />
                    </label>
                    <label className="space-y-1.5">
                      <FieldLabel>Repatriation port / airport</FieldLabel>
                      <Input className={fieldCls} value={form.repatriationPort} onChange={(e) => updateField("repatriationPort", e.target.value)} />
                    </label>
                    <label className="space-y-1.5">
                      <FieldLabel>Home country contact number</FieldLabel>
                      <Input className={fieldCls} value={form.homeCountryContactNumber} onChange={(e) => updateField("homeCountryContactNumber", e.target.value)} />
                    </label>
                  </div>
                </>
              )}

              {/* ── Step 2: Health ─────────────────────────────────────── */}
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
                      <FieldLabel>Medical conditions / previous illnesses</FieldLabel>
                      <Textarea className={textareaCls} rows={4} value={form.medicalConditions} onChange={(e) => updateField("medicalConditions", e.target.value)} placeholder="Mental illness, epilepsy, asthma, diabetes, hypertension, operations, or write none." />
                    </label>
                    <label className="space-y-1.5">
                      <FieldLabel>Allergies</FieldLabel>
                      <Input className={fieldCls} value={form.allergies} onChange={(e) => updateField("allergies", e.target.value)} />
                    </label>
                    <label className="space-y-1.5">
                      <FieldLabel>Physical disabilities</FieldLabel>
                      <Input className={fieldCls} value={form.physicalDisabilities} onChange={(e) => updateField("physicalDisabilities", e.target.value)} />
                    </label>
                    <label className="space-y-1.5">
                      <FieldLabel>Dietary restrictions</FieldLabel>
                      <Input className={fieldCls} value={form.dietaryRestrictions} onChange={(e) => updateField("dietaryRestrictions", e.target.value)} />
                    </label>
                    <label className="space-y-1.5">
                      <FieldLabel>Food preference</FieldLabel>
                      <select className={selectCls} value={form.foodPreference} onChange={(e) => updateField("foodPreference", e.target.value)}>
                        <option value="">Select</option>
                        <option value="No Pork">No pork</option>
                        <option value="No Beef">No beef</option>
                        <option value="Other">Other</option>
                      </select>
                    </label>
                    <label className="space-y-1.5 sm:col-span-2">
                      <FieldLabel>Other food preference</FieldLabel>
                      <Input className={fieldCls} value={form.foodPreferenceOther} onChange={(e) => updateField("foodPreferenceOther", e.target.value)} />
                    </label>
                    <label className="space-y-1.5">
                      <FieldLabel>Rest day preference</FieldLabel>
                      <Input className={fieldCls} value={form.restDayPreference} onChange={(e) => updateField("restDayPreference", e.target.value)} placeholder="e.g. 2 rest days per month" />
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
                      <Textarea className={textareaCls} rows={3} value={form.otherRemarksA3} onChange={(e) => updateField("otherRemarksA3", e.target.value)} />
                    </label>
                  </div>
                </>
              )}

              {activeStep === 3 && (
                <>
                  <SectionHeader
                    step="Step 3"
                    title="Skills and employment history"
                    description="Complete your care assessments, cooking and language abilities, then add your work history in the FDW-style layout."
                    icon={BriefcaseBusiness}
                  />
                  <div className="grid gap-4 sm:grid-cols-2">

                    <Divider title="Core experience" description="Used for automated scoring and shortlist ranking" />
                    <label className="space-y-1.5">
                      <FieldLabel>Years of experience</FieldLabel>
                      <Input className={fieldCls} type="number" min="0" value={form.yearsOfExperience} onChange={(e) => updateField("yearsOfExperience", e.target.value)} />
                    </label>
                    <label className="space-y-1.5">
                      <FieldLabel>Previous countries worked in</FieldLabel>
                      <Input className={fieldCls} value={form.previousCountriesWorkedIn} onChange={(e) => updateField("previousCountriesWorkedIn", e.target.value)} placeholder="Singapore, Hong Kong, Dubai" />
                    </label>

                    <div className="col-span-1 sm:col-span-2 grid gap-3 grid-cols-1 xs:grid-cols-2 sm:grid-cols-3">
                      {skillRatingFields.map((s) => (
                        <StarSkillRating
                          key={s.key}
                          label={s.label}
                          value={Number(form[s.key] || 0)}
                          onChange={(v) => updateField(s.key, String(v))}
                        />
                      ))}
                    </div>

                    <label className="space-y-1.5 sm:col-span-2">
                      <FieldLabel>Cooking skills</FieldLabel>
                      <Textarea className={textareaCls} rows={3} value={form.cookingSkills} onChange={(e) => updateField("cookingSkills", e.target.value)} placeholder="Chinese food, Indian food, halal cooking" />
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
                                  className="text-emerald-400 transition hover:text-rose-500 touch-manipulation"
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

                    {/* Singapore assessments */}
                    <Divider title="Singapore experience" />
                    <label className="space-y-1.5 sm:col-span-2">
                      <FieldLabel>Infant / childcare assessment</FieldLabel>
                      <Textarea className={textareaCls} rows={2} value={form.sgInfantsChildrenAssessment} onChange={(e) => updateField("sgInfantsChildrenAssessment", e.target.value)} />
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

                    {/* Overseas assessments */}
                    <Divider title="Overseas training and assessment" />
                    <label className="space-y-1.5">
                      <FieldLabel>Foreign training centre name</FieldLabel>
                      <Input className={fieldCls} value={form.foreignTrainingCentreName} onChange={(e) => updateField("foreignTrainingCentreName", e.target.value)} />
                    </label>
                    <label className="space-y-1.5">
                      <FieldLabel>Third party certification details</FieldLabel>
                      <Input className={fieldCls} value={form.thirdPartyCertificationDetails} onChange={(e) => updateField("thirdPartyCertificationDetails", e.target.value)} />
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

                    {/* Employment history */}
                    <div className="col-span-1 sm:col-span-2">
                      <Divider title="Employment history" description="Add all your relevant work positions — no limit" />
                    </div>

                    <div className="col-span-1 sm:col-span-2 space-y-3">
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
                        className="group flex w-full items-center justify-center gap-2.5 rounded-xl border-2 border-dashed border-slate-200 bg-transparent px-4 py-4 text-sm font-semibold text-slate-500 transition-all hover:border-emerald-400 hover:bg-emerald-50/50 hover:text-emerald-700 touch-manipulation"
                      >
                        <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-current">
                          <Plus className="h-3 w-3" />
                        </span>
                        Add another employment
                        <span className="ml-auto rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600 group-hover:bg-emerald-100 group-hover:text-emerald-800">
                          {employmentHistory.length} {employmentHistory.length === 1 ? "entry" : "entries"}
                        </span>
                      </button>
                    </div>

                    {/* Employer feedback */}
                    <Divider title="Employer feedback" />
                    <label className="space-y-1.5 sm:col-span-2">
                      <FieldLabel>Feedback from employer 1</FieldLabel>
                      <Textarea className={textareaCls} rows={3} value={form.feedbackEmployer1} onChange={(e) => updateField("feedbackEmployer1", e.target.value)} />
                    </label>
                    <label className="space-y-1.5 sm:col-span-2">
                      <FieldLabel>Feedback from employer 2</FieldLabel>
                      <Textarea className={textareaCls} rows={3} value={form.feedbackEmployer2} onChange={(e) => updateField("feedbackEmployer2", e.target.value)} />
                    </label>
                  </div>
                </>
              )}

              {/* ── Step 4: Attachments ───────────────────────────────── */}
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
                      <Input className={fieldCls} type="number" min="0" value={form.expectedSalary} onChange={(e) => updateField("expectedSalary", e.target.value)} placeholder="700" />
                    </label>
                    <label className="space-y-1.5 sm:col-span-2">
                      <FieldLabel>Employment preference</FieldLabel>
                      <Input className={fieldCls} value={form.employmentPreference} onChange={(e) => updateField("employmentPreference", e.target.value)} placeholder="Transfer, new placement, full-time live-in" />
                    </label>
                    <label className="space-y-1.5">
                      <FieldLabel>Certifications</FieldLabel>
                      <Textarea className={textareaCls} rows={3} value={form.certifications} onChange={(e) => updateField("certifications", e.target.value)} />
                    </label>
                    <label className="space-y-1.5">
                      <FieldLabel>Training records</FieldLabel>
                      <Textarea className={textareaCls} rows={3} value={form.trainingRecords} onChange={(e) => updateField("trainingRecords", e.target.value)} />
                    </label>
                    <label className="space-y-1.5 sm:col-span-2">
                      <FieldLabel>Short introduction / cover note</FieldLabel>
                      <Textarea className={textareaCls} rows={5} value={form.coverNote} onChange={(e) => updateField("coverNote", e.target.value)} placeholder="Tell us about your strengths, preferred work environment, and anything the recruiter should know." />
                    </label>
                    <label className="space-y-1.5 sm:col-span-2">
                      <FieldLabel>Final remarks</FieldLabel>
                      <Textarea className={textareaCls} rows={3} value={form.otherRemarksE} onChange={(e) => updateField("otherRemarksE", e.target.value)} />
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
                      {fileConfig.map(({ key, label, icon: Icon, hint }) => (
                        <label
                          key={key}
                          className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3.5 transition-all touch-manipulation ${
                            files[key]?.length
                              ? "border-emerald-300 bg-emerald-50/70"
                              : "border-slate-200 bg-slate-50/80 hover:border-emerald-300 hover:bg-emerald-50/40"
                          }`}
                        >
                          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                            files[key]?.length
                              ? "border-emerald-200 bg-emerald-100 text-emerald-700"
                              : "border-slate-200 bg-white text-slate-500"
                          }`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-slate-800 truncate">{label}</p>
                            <p className={`text-xs ${files[key]?.length ? "text-emerald-600 font-semibold" : "text-slate-400"}`}>
                              {files[key]?.length
                                ? `${files[key].length} file${files[key].length > 1 ? "s" : ""} selected`
                                : hint}
                            </p>
                          </div>
                          {files[key]?.length ? (
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                          ) : (
                            <span className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-emerald-400 hover:text-emerald-700">
                              Choose
                            </span>
                          )}
                          <input
                            type="file"
                            className="sr-only"
                            accept={key === "introVideo" ? ".mp4,.mov,video/*" : ".pdf,.doc,.docx,.jpg,.jpeg,.png"}
                            onChange={(e) => void handleFileChange(key, e.target.files)}
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div className="mt-8 flex items-center justify-between gap-3 border-t border-slate-100 pt-6">
                <span className="text-xs font-semibold text-slate-400 tabular-nums">
                  {activeStep + 1} / {stepItems.length}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={goPrev}
                    disabled={isFirstStep}
                    className="h-10 border-slate-200 text-slate-600 font-semibold disabled:opacity-40 px-4"
                  >
                    <ChevronLeft className="mr-1 h-3.5 w-3.5" />
                    Back
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    className="h-10 bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-50 font-semibold px-5"
                    disabled={submitMutation.isPending}
                  >
                    {isLastStep
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
                  {publicInfoChecklist.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-xs text-slate-300">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {!introCompleted && (
                <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
                  <p className="text-xs font-semibold text-amber-300">
                    Accept the terms and click Continue on the first step before submitting.
                  </p>
                </div>
              )}

              <Button
                type="submit"
                className="mt-5 w-full h-11 bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 font-bold"
                disabled={submitMutation.isPending || !introCompleted}
              >
                {submitMutation.isPending ? "Submitting…" : "Submit application"}
                <ArrowRight className="ml-2 h-4 w-4" />
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
              <div className="mt-5 border-t border-slate-100 pt-4">
                <Link to="/" className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 transition-colors">
                  ← Return to homepage
                </Link>
              </div>
            </div>

          </div>
        </form>
      </div>
    </div>
  );
};

export default PublicMaidApplicationPage;
