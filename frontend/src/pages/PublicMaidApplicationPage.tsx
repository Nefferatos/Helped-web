import { useMemo, useState, type ElementType } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import PublicSiteNavbar from "@/components/PublicSiteNavbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
} from "lucide-react";

type ApplicantFormState = {
  agencyId: string;
  fullName: string;
  email: string;
  contactNumber: string;
  nationality: string;
  dateOfBirth: string;
  gender: string;
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
  employmentHistory1From: string;
  employmentHistory1To: string;
  employmentHistory1Country: string;
  employmentHistory1Employer: string;
  employmentHistory1Duties: string;
  employmentHistory1Remarks: string;
  employmentHistory2From: string;
  employmentHistory2To: string;
  employmentHistory2Country: string;
  employmentHistory2Employer: string;
  employmentHistory2Duties: string;
  employmentHistory2Remarks: string;
  employmentHistory3From: string;
  employmentHistory3To: string;
  employmentHistory3Country: string;
  employmentHistory3Employer: string;
  employmentHistory3Duties: string;
  employmentHistory3Remarks: string;
};

const initialState: ApplicantFormState = {
  agencyId: "1",
  fullName: "",
  email: "",
  contactNumber: "",
  nationality: "",
  dateOfBirth: "",
  gender: "Female",
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
  employmentHistory1From: "",
  employmentHistory1To: "",
  employmentHistory1Country: "",
  employmentHistory1Employer: "",
  employmentHistory1Duties: "",
  employmentHistory1Remarks: "",
  employmentHistory2From: "",
  employmentHistory2To: "",
  employmentHistory2Country: "",
  employmentHistory2Employer: "",
  employmentHistory2Duties: "",
  employmentHistory2Remarks: "",
  employmentHistory3From: "",
  employmentHistory3To: "",
  employmentHistory3Country: "",
  employmentHistory3Employer: "",
  employmentHistory3Duties: "",
  employmentHistory3Remarks: "",
};

const fileLabels: Record<string, string> = {
  resume: "Resume / CV",
  passport: "Passport Copy",
  certificates: "Certificates / Training Records",
  medical: "Medical Documents",
  references: "Reference Letters",
  introVideo: "Introduction Video",
  otherDocuments: "Other Supporting Documents",
};

const fileFieldOrder = ["resume", "passport", "certificates", "medical", "references", "introVideo", "otherDocuments"] as const;

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
  { key: "newbornCareExperience", label: "Newborn Care" },
  { key: "elderlyCareExperience", label: "Elderly Care" },
  { key: "disabledCareExperience", label: "Disabled Care" },
  { key: "housekeepingExperience", label: "Housekeeping" },
  { key: "petCareExperience", label: "Pet Care" },
] as const;

const fieldClassName =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm shadow-slate-200/40 transition focus-visible:border-emerald-400 focus-visible:ring-emerald-200";

const textareaClassName =
  "min-h-[96px] rounded-xl border-slate-200 shadow-sm shadow-slate-200/40 focus-visible:border-emerald-400 focus-visible:ring-emerald-200";

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
  <div className="mb-6 flex items-start gap-4">
    <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700 shadow-sm shadow-emerald-100">
      <Icon className="h-5 w-5" />
    </div>
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">{step}</p>
      <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{description}</p>
    </div>
  </div>
);

const SubSection = ({ title, description }: { title: string; description: string }) => (
  <div className="md:col-span-2">
    <div className="mb-3 mt-2 border-t border-slate-200 pt-5">
      <h3 className="text-base font-bold text-slate-950">{title}</h3>
      <p className="mt-1 text-sm text-slate-600">{description}</p>
    </div>
  </div>
);

const StarSkillRating = ({
  value,
  onChange,
}: {
  value: number;
  onChange: (next: number) => void;
}) => (
  <div className="flex items-center gap-1">
    {Array.from({ length: 5 }, (_, index) => {
      const nextValue = index + 1;
      const active = nextValue <= value;
      return (
        <button
          key={nextValue}
          type="button"
          className="rounded-md p-1 transition-transform hover:scale-110"
          onClick={() => onChange(nextValue)}
        >
          <Star className={`h-5 w-5 ${active ? "fill-amber-400 text-amber-400" : "text-slate-300 hover:text-amber-300"}`} />
        </button>
      );
    })}
  </div>
);

const applicationSteps = [
  { id: "intro", step: "Start", title: "Before You Begin", description: "A quick guide before you start your application.", icon: Sparkles },
  { id: "biodata", step: "Step 1", title: "FDW Biodata", description: "Personal details in the same style as the FDW biodata form.", icon: UserRound },
  { id: "health", step: "Step 2", title: "Health and Preference", description: "Medical notes, food preferences, and work arrangements.", icon: HeartPulse },
  { id: "skills", step: "Step 3", title: "Skills and Employment History", description: "Care skills, languages, cooking, and past employment details.", icon: BriefcaseBusiness },
  { id: "documents", step: "Step 4", title: "Attachments and Submission", description: "Availability, recruiter note, and supporting documents.", icon: FileCheck2 },
] as const;

const publicInfoChecklist = [
  "WhatsApp number and email are active",
  "Biodata matches your official documents",
  "Employment history is complete",
  "Resume and passport are uploaded if available",
];

const applicationTerms = [
  "I confirm that all information submitted in this application is true and accurate.",
  "I understand the agency may verify my biodata, employment history, and supporting documents.",
  "I agree that the agency may contact me by WhatsApp, phone call, or email about recruitment opportunities.",
  "I understand that incomplete, false, or misleading information may affect my application status.",
  "I agree that my application details will be stored in the agency recruitment system for review and follow-up.",
];

const PublicMaidApplicationPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState<ApplicantFormState>(initialState);
  const [files, setFiles] = useState<Record<string, File[]>>({});
  const [activeStep, setActiveStep] = useState(0);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [languageDraft, setLanguageDraft] = useState("");

  const agenciesQuery = useQuery({
    queryKey: ["public-agency-options"],
    queryFn: fetchAgencyOptions,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => formData.set(key, value));
      Object.entries(files).forEach(([key, selected]) => {
        selected.forEach((file) => formData.append(key, file));
      });
      return submitPublicAtsApplication(formData);
    },
    onSuccess: (data) => {
      toast.success(`Application submitted. Reference: ${data.applicationCode}`);
      navigate(`/apply-as-maid/status/${encodeURIComponent(data.applicationId)}?token=${encodeURIComponent(data.applicantAccessToken)}`);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to submit application"),
  });

  const updateField = (key: keyof ApplicantFormState, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const syncLanguages = (nextLanguages: string[]) => {
    setSelectedLanguages(nextLanguages);
    updateField("languageSkills", nextLanguages.join(", "));
  };

  const addLanguage = () => {
    const next = languageDraft.trim();
    if (!next || selectedLanguages.includes(next)) return;
    syncLanguages([...selectedLanguages, next]);
    setLanguageDraft("");
  };

  const removeLanguage = (language: string) =>
    syncLanguages(selectedLanguages.filter((item) => item !== language));

  const handleFileChange = async (field: string, selectedList: FileList | null) => {
    const nextFiles = selectedList ? Array.from(selectedList) : [];
    if (field === "introVideo" && nextFiles[0]) {
      const videoFile = nextFiles[0];
      const objectUrl = URL.createObjectURL(videoFile);
      try {
        const isValid = await new Promise<boolean>((resolve) => {
          const video = document.createElement("video");
          video.preload = "metadata";
          video.onloadedmetadata = () => {
            const duration = Number(video.duration || 0);
            resolve(duration > 0 && duration <= 60);
          };
          video.onerror = () => resolve(false);
          video.src = objectUrl;
        });
        if (!isValid) {
          toast.error("Introduction video must be 1 minute or less.");
          setFiles((current) => ({ ...current, [field]: [] }));
          return;
        }
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    }
    setFiles((current) => ({ ...current, [field]: nextFiles }));
  };

  const stepItems = useMemo(
    () =>
      applicationSteps.map((step) => ({
        ...step,
        isComplete:
          step.id === "intro"
            ? true
            : step.id === "biodata"
              ? Boolean(form.fullName && form.email && form.contactNumber && form.nationality)
              : step.id === "health"
                ? Boolean(form.medicalConditions || form.restDayPreference || form.foodPreference)
                : step.id === "skills"
                  ? Boolean(form.yearsOfExperience && form.languageSkills && form.cookingSkills)
                  : Boolean(form.availableDate || form.coverNote || files.resume?.length),
      })),
    [files.resume, form.contactNumber, form.cookingSkills, form.coverNote, form.email, form.foodPreference, form.fullName, form.languageSkills, form.medicalConditions, form.nationality, form.restDayPreference, form.availableDate, form.yearsOfExperience],
  );

  const isLastStep = activeStep === stepItems.length - 1;
  const isFirstStep = activeStep === 0;

  const goNext = () => setActiveStep((current) => Math.min(current + 1, stepItems.length - 1));
  const goPrevious = () => setActiveStep((current) => Math.max(current - 1, 0));

  const renderEmploymentHistoryRow = (index: 1 | 2 | 3) => (
    <div className="grid gap-4 rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-4 md:grid-cols-2" key={index}>
      <div className="md:col-span-2">
        <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-700">Employment History {index}</h3>
      </div>
      <label className="space-y-2">
        <span className="text-sm font-medium text-slate-700">From</span>
        <Input className={fieldClassName} value={form[`employmentHistory${index}From`]} onChange={(event) => updateField(`employmentHistory${index}From`, event.target.value)} />
      </label>
      <label className="space-y-2">
        <span className="text-sm font-medium text-slate-700">To</span>
        <Input className={fieldClassName} value={form[`employmentHistory${index}To`]} onChange={(event) => updateField(`employmentHistory${index}To`, event.target.value)} />
      </label>
      <label className="space-y-2">
        <span className="text-sm font-medium text-slate-700">Country</span>
        <Input className={fieldClassName} value={form[`employmentHistory${index}Country`]} onChange={(event) => updateField(`employmentHistory${index}Country`, event.target.value)} />
      </label>
      <label className="space-y-2">
        <span className="text-sm font-medium text-slate-700">Employer</span>
        <Input className={fieldClassName} value={form[`employmentHistory${index}Employer`]} onChange={(event) => updateField(`employmentHistory${index}Employer`, event.target.value)} />
      </label>
      <label className="space-y-2 md:col-span-2">
        <span className="text-sm font-medium text-slate-700">Duties</span>
        <Textarea className={textareaClassName} rows={3} value={form[`employmentHistory${index}Duties`]} onChange={(event) => updateField(`employmentHistory${index}Duties`, event.target.value)} />
      </label>
      <label className="space-y-2 md:col-span-2">
        <span className="text-sm font-medium text-slate-700">Remarks</span>
        <Textarea className={textareaClassName} rows={2} value={form[`employmentHistory${index}Remarks`]} onChange={(event) => updateField(`employmentHistory${index}Remarks`, event.target.value)} />
      </label>
    </div>
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.10),_transparent_24%),radial-gradient(circle_at_right,_rgba(250,204,21,0.18),_transparent_30%),linear-gradient(180deg,_#f7fbf7_0%,_#f5f7ef_48%,_#edf4ee_100%)]">
      <PublicSiteNavbar />
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <form
          className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_360px]"
          onSubmit={(event) => {
            event.preventDefault();
            if (!isLastStep) {
              goNext();
              return;
            }
            submitMutation.mutate();
          }}
        >
          <div className="space-y-6">
            <Card className="rounded-[2rem] border-slate-200 bg-white/95 p-6 shadow-sm shadow-slate-200/60">
              <div className="mb-6 space-y-3">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                  {stepItems.map((step, index) => {
                    const Icon = step.icon;
                    const isActive = index === activeStep;
                    const isPast = index < activeStep;
                    return (
                      <button
                        key={step.id}
                        type="button"
                        onClick={() => setActiveStep(index)}
                        className={`min-w-0 rounded-[1.25rem] border p-4 text-left transition ${
                          isActive
                            ? "border-emerald-400 bg-emerald-50 shadow-sm shadow-emerald-100"
                            : isPast || step.isComplete
                              ? "border-emerald-200 bg-white hover:border-emerald-300"
                              : "border-slate-200 bg-slate-50 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`rounded-2xl p-2.5 ${
                            isActive ? "bg-emerald-600 text-white" : isPast || step.isComplete ? "bg-emerald-100 text-emerald-700" : "bg-white text-slate-500"
                          }`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{step.step}</p>
                            <p className="mt-1 text-sm font-bold text-slate-900">{step.title}</p>
                            <p className="mt-1 text-xs leading-5 text-slate-600">{step.description}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {activeStep === 0 && (
                <>
                  <SectionHeader
                    step="Start"
                    title="Apply With FDW Biodata Format"
                    description="This application follows the same structure recruiters expect from the FDW biodata form, so your profile is easier to review and shortlist."
                    icon={Sparkles}
                  />
                  <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                    <div className="rounded-[1.5rem] border border-emerald-100 bg-emerald-50/60 p-5">
                      <h3 className="text-lg font-black text-slate-950">How this works</h3>
                      <div className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
                        <p>1. Fill in your biodata using the same format as the FDW form.</p>
                        <p>2. Add health notes, food preferences, and work arrangement details.</p>
                        <p>3. Complete your care skills, employment history, and supporting documents.</p>
                        <p>4. Submit once and receive a private status page with your application reference.</p>
                      </div>
                    </div>
                    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
                      <h3 className="text-lg font-black text-slate-950">Prepare before you start</h3>
                      <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                        <p>Use your active WhatsApp number and email so support can contact you quickly.</p>
                        <p>Keep your passport, resume, certificates, and latest work records ready if available.</p>
                        <p>Use truthful details because agencies may compare this with your official FDW biodata.</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-white p-5">
                    <div className="flex items-start gap-3">
                      <div className="rounded-2xl bg-amber-100 p-3 text-amber-700">
                        <ShieldCheck className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-black text-slate-950">Terms and Conditions</h3>
                        <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                          {applicationTerms.map((term) => (
                            <p key={term}>{term}</p>
                          ))}
                        </div>
                        <label className="mt-5 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
                          <input
                            type="checkbox"
                            checked={termsAccepted}
                            onChange={(event) => setTermsAccepted(event.target.checked)}
                            className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="text-sm font-medium text-slate-800">
                            I have read and agree to the terms and conditions before starting this application.
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {activeStep === 1 && (
                <>
                  <SectionHeader
                    step="Step 1"
                    title="FDW Biodata"
                    description="This step mirrors the personal biodata section of the FDW form so recruiters can process your application in a familiar format."
                    icon={UserRound}
                  />
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700">Agency</span>
                      <select className={fieldClassName} value={form.agencyId} onChange={(event) => updateField("agencyId", event.target.value)}>
                        {(agenciesQuery.data ?? [{ id: 1, name: "Default Agency", email: "", createdAt: "", totalMaids: 0, publicMaids: 0 }]).map((agency) => (
                          <option key={agency.id} value={agency.id}>{agency.name}</option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700">Full Name</span>
                      <Input className={fieldClassName} value={form.fullName} onChange={(event) => updateField("fullName", event.target.value)} required />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700">Email</span>
                      <Input className={fieldClassName} type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} required />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700">WhatsApp / Contact Number</span>
                      <Input className={fieldClassName} value={form.contactNumber} onChange={(event) => updateField("contactNumber", event.target.value)} required />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700">Nationality</span>
                      <Input className={fieldClassName} value={form.nationality} onChange={(event) => updateField("nationality", event.target.value)} required />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700">Date of Birth</span>
                      <Input className={fieldClassName} type="date" value={form.dateOfBirth} onChange={(event) => updateField("dateOfBirth", event.target.value)} />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700">Place of Birth</span>
                      <Input className={fieldClassName} value={form.placeOfBirth} onChange={(event) => updateField("placeOfBirth", event.target.value)} />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700">Gender</span>
                      <select className={fieldClassName} value={form.gender} onChange={(event) => updateField("gender", event.target.value)}>
                        <option value="Female">Female</option>
                        <option value="Male">Male</option>
                        <option value="Other">Other</option>
                      </select>
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700">Marital Status</span>
                      <Input className={fieldClassName} value={form.maritalStatus} onChange={(event) => updateField("maritalStatus", event.target.value)} />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700">Height (cm)</span>
                      <Input className={fieldClassName} type="number" min="0" value={form.heightCm} onChange={(event) => updateField("heightCm", event.target.value)} />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700">Weight (kg)</span>
                      <Input className={fieldClassName} type="number" min="0" value={form.weightKg} onChange={(event) => updateField("weightKg", event.target.value)} />
                    </label>
                    <label className="space-y-2 md:col-span-2">
                      <span className="text-sm font-medium text-slate-700">Residential Address</span>
                      <Textarea className={textareaClassName} rows={3} value={form.address} onChange={(event) => updateField("address", event.target.value)} />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700">Home Address Line 1</span>
                      <Input className={fieldClassName} value={form.residentialAddressLine1} onChange={(event) => updateField("residentialAddressLine1", event.target.value)} />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700">Home Address Line 2</span>
                      <Input className={fieldClassName} value={form.residentialAddressLine2} onChange={(event) => updateField("residentialAddressLine2", event.target.value)} />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700">Repatriation Port / Airport</span>
                      <Input className={fieldClassName} value={form.repatriationPort} onChange={(event) => updateField("repatriationPort", event.target.value)} />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700">Home Country Contact Number</span>
                      <Input className={fieldClassName} value={form.homeCountryContactNumber} onChange={(event) => updateField("homeCountryContactNumber", event.target.value)} />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700">Religion</span>
                      <Input className={fieldClassName} value={form.religion} onChange={(event) => updateField("religion", event.target.value)} />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700">Education Level</span>
                      <select className={fieldClassName} value={form.educationLevel} onChange={(event) => updateField("educationLevel", event.target.value)}>
                        <option value="">Select Education</option>
                        {educationLevelOptions.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700">Number of Siblings</span>
                      <Input className={fieldClassName} type="number" min="0" value={form.numberOfSiblings} onChange={(event) => updateField("numberOfSiblings", event.target.value)} />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700">Number of Children</span>
                      <Input className={fieldClassName} type="number" min="0" value={form.numberOfChildren} onChange={(event) => updateField("numberOfChildren", event.target.value)} />
                    </label>
                    <label className="space-y-2 md:col-span-2">
                      <span className="text-sm font-medium text-slate-700">Children Ages</span>
                      <Input className={fieldClassName} value={form.childrenAges} onChange={(event) => updateField("childrenAges", event.target.value)} placeholder="e.g. 3, 6, 10" />
                    </label>
                  </div>
                </>
              )}

              {activeStep === 2 && (
                <>
                  <SectionHeader
                    step="Step 2"
                    title="Health and Preference"
                    description="Add medical declarations and household preferences so the recruiter can see your FDW profile in one complete view."
                    icon={ShieldCheck}
                  />
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-2 md:col-span-2">
                      <span className="text-sm font-medium text-slate-700">Medical Conditions / Previous Illnesses</span>
                      <Textarea className={textareaClassName} rows={4} value={form.medicalConditions} onChange={(event) => updateField("medicalConditions", event.target.value)} placeholder="Mental illness, epilepsy, asthma, diabetes, hypertension, operations, or write none." />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700">Allergies</span>
                      <Input className={fieldClassName} value={form.allergies} onChange={(event) => updateField("allergies", event.target.value)} />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700">Physical Disabilities</span>
                      <Input className={fieldClassName} value={form.physicalDisabilities} onChange={(event) => updateField("physicalDisabilities", event.target.value)} />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700">Dietary Restrictions</span>
                      <Input className={fieldClassName} value={form.dietaryRestrictions} onChange={(event) => updateField("dietaryRestrictions", event.target.value)} />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700">Food Preference</span>
                      <select className={fieldClassName} value={form.foodPreference} onChange={(event) => updateField("foodPreference", event.target.value)}>
                        <option value="">Select</option>
                        <option value="No Pork">No Pork</option>
                        <option value="No Beef">No Beef</option>
                        <option value="Other">Other</option>
                      </select>
                    </label>
                    <label className="space-y-2 md:col-span-2">
                      <span className="text-sm font-medium text-slate-700">Other Food Preference</span>
                      <Input className={fieldClassName} value={form.foodPreferenceOther} onChange={(event) => updateField("foodPreferenceOther", event.target.value)} />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700">Rest Day Preference</span>
                      <Input className={fieldClassName} value={form.restDayPreference} onChange={(event) => updateField("restDayPreference", event.target.value)} placeholder="e.g. 2 rest days per month" />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700">Worked in Singapore Before?</span>
                      <select className={fieldClassName} value={form.workedInSingapore} onChange={(event) => updateField("workedInSingapore", event.target.value)}>
                        <option value="No">No</option>
                        <option value="Yes">Yes</option>
                      </select>
                    </label>
                    <label className="space-y-2 md:col-span-2">
                      <span className="text-sm font-medium text-slate-700">Other Remarks</span>
                      <Textarea className={textareaClassName} rows={4} value={form.otherRemarksA3} onChange={(event) => updateField("otherRemarksA3", event.target.value)} />
                    </label>
                  </div>
                </>
              )}

              {activeStep === 3 && (
                <>
                  <SectionHeader
                    step="Step 3"
                    title="Skills and Employment History"
                    description="Complete your care assessments, cooking and language abilities, then add your latest work history in the FDW-style layout."
                    icon={BriefcaseBusiness}
                  />
                  <div className="grid gap-4 md:grid-cols-2">
                    <SubSection title="Core Experience" description="These fields are used by the recruitment ATS for automated scoring and shortlist ranking." />
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700">Years of Experience</span>
                      <Input className={fieldClassName} type="number" min="0" value={form.yearsOfExperience} onChange={(event) => updateField("yearsOfExperience", event.target.value)} />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700">Previous Countries Worked In</span>
                      <Input className={fieldClassName} value={form.previousCountriesWorkedIn} onChange={(event) => updateField("previousCountriesWorkedIn", event.target.value)} placeholder="Singapore, Hong Kong, Dubai" />
                    </label>
                    <div className="grid gap-4 md:col-span-2 md:grid-cols-2">
                      {skillRatingFields.map((skill) => (
                        <div key={skill.key} className="rounded-[1.25rem] border border-slate-200 bg-slate-50/70 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{skill.label}</p>
                              <p className="mt-1 text-xs text-slate-500">Rate your experience from 1 to 5 stars.</p>
                            </div>
                            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-amber-700 ring-1 ring-amber-200">
                              {form[skill.key] || "0"}/5
                            </span>
                          </div>
                          <div className="mt-3">
                            <StarSkillRating
                              value={Number(form[skill.key] || 0)}
                              onChange={(next) => updateField(skill.key, String(next))}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    <label className="space-y-2 md:col-span-2">
                      <span className="text-sm font-medium text-slate-700">Cooking Skills</span>
                      <Textarea className={textareaClassName} rows={3} value={form.cookingSkills} onChange={(event) => updateField("cookingSkills", event.target.value)} placeholder="Chinese food, Indian food, halal cooking" />
                    </label>
                    <label className="space-y-2 md:col-span-2">
                      <span className="text-sm font-medium text-slate-700">Languages Spoken</span>
                      <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-4">
                        <div className="flex flex-wrap gap-2">
                          {selectedLanguages.length === 0 ? (
                            <span className="text-sm text-slate-500">No language selected yet.</span>
                          ) : (
                            selectedLanguages.map((language) => (
                              <span key={language} className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm font-medium text-slate-800 ring-1 ring-slate-200">
                                {language}
                                <button type="button" onClick={() => removeLanguage(language)} className="text-slate-400 transition hover:text-rose-500">
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </span>
                            ))
                          )}
                        </div>
                        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                          <select className={fieldClassName} value={languageDraft} onChange={(event) => setLanguageDraft(event.target.value)}>
                            <option value="">Select language</option>
                            {languageOptions
                              .filter((option) => !selectedLanguages.includes(option))
                              .map((option) => (
                                <option key={option} value={option}>{option}</option>
                              ))}
                          </select>
                          <Button type="button" variant="outline" onClick={addLanguage} disabled={!languageDraft}>
                            Add Language
                          </Button>
                        </div>
                      </div>
                    </label>

                    <SubSection title="FDW Skill Assessments" description="Use short notes similar to the assessment text in the biodata form." />
                    <label className="space-y-2 md:col-span-2">
                      <span className="text-sm font-medium text-slate-700">Singapore Experience: Infant / Childcare Assessment</span>
                      <Textarea className={textareaClassName} rows={3} value={form.sgInfantsChildrenAssessment} onChange={(event) => updateField("sgInfantsChildrenAssessment", event.target.value)} />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700">Singapore Experience: Elderly Assessment</span>
                      <Textarea className={textareaClassName} rows={3} value={form.sgElderlyAssessment} onChange={(event) => updateField("sgElderlyAssessment", event.target.value)} />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700">Singapore Experience: Disabled Care Assessment</span>
                      <Textarea className={textareaClassName} rows={3} value={form.sgDisabledAssessment} onChange={(event) => updateField("sgDisabledAssessment", event.target.value)} />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700">Singapore Experience: Housework Assessment</span>
                      <Textarea className={textareaClassName} rows={3} value={form.sgHouseworkAssessment} onChange={(event) => updateField("sgHouseworkAssessment", event.target.value)} />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700">Singapore Experience: Cooking Assessment</span>
                      <Textarea className={textareaClassName} rows={3} value={form.sgCookingAssessment} onChange={(event) => updateField("sgCookingAssessment", event.target.value)} />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700">Singapore Experience: Language Assessment</span>
                      <Textarea className={textareaClassName} rows={3} value={form.sgLanguageAssessment} onChange={(event) => updateField("sgLanguageAssessment", event.target.value)} />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700">Singapore Experience: Other Skills</span>
                      <Input className={fieldClassName} value={form.sgOtherSkills} onChange={(event) => updateField("sgOtherSkills", event.target.value)} />
                    </label>
                    <label className="space-y-2 md:col-span-2">
                      <span className="text-sm font-medium text-slate-700">Singapore Experience: Other Skills Assessment</span>
                      <Textarea className={textareaClassName} rows={3} value={form.sgOtherSkillsAssessment} onChange={(event) => updateField("sgOtherSkillsAssessment", event.target.value)} />
                    </label>

                    <SubSection title="Overseas Training and Assessment" description="Include overseas training center details and overseas skill notes if you have them." />
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700">Foreign Training Centre Name</span>
                      <Input className={fieldClassName} value={form.foreignTrainingCentreName} onChange={(event) => updateField("foreignTrainingCentreName", event.target.value)} />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700">Third Party Certification Details</span>
                      <Input className={fieldClassName} value={form.thirdPartyCertificationDetails} onChange={(event) => updateField("thirdPartyCertificationDetails", event.target.value)} />
                    </label>
                    <label className="space-y-2 md:col-span-2">
                      <span className="text-sm font-medium text-slate-700">Overseas Infant / Childcare Assessment</span>
                      <Textarea className={textareaClassName} rows={3} value={form.overseasInfantsChildrenAssessment} onChange={(event) => updateField("overseasInfantsChildrenAssessment", event.target.value)} />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700">Overseas Elderly Assessment</span>
                      <Textarea className={textareaClassName} rows={3} value={form.overseasElderlyAssessment} onChange={(event) => updateField("overseasElderlyAssessment", event.target.value)} />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700">Overseas Disabled Care Assessment</span>
                      <Textarea className={textareaClassName} rows={3} value={form.overseasDisabledAssessment} onChange={(event) => updateField("overseasDisabledAssessment", event.target.value)} />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700">Overseas Housework Assessment</span>
                      <Textarea className={textareaClassName} rows={3} value={form.overseasHouseworkAssessment} onChange={(event) => updateField("overseasHouseworkAssessment", event.target.value)} />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700">Overseas Cooking Assessment</span>
                      <Textarea className={textareaClassName} rows={3} value={form.overseasCookingAssessment} onChange={(event) => updateField("overseasCookingAssessment", event.target.value)} />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700">Overseas Language Assessment</span>
                      <Textarea className={textareaClassName} rows={3} value={form.overseasLanguageAssessment} onChange={(event) => updateField("overseasLanguageAssessment", event.target.value)} />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700">Overseas Other Skills</span>
                      <Input className={fieldClassName} value={form.overseasOtherSkills} onChange={(event) => updateField("overseasOtherSkills", event.target.value)} />
                    </label>
                    <label className="space-y-2 md:col-span-2">
                      <span className="text-sm font-medium text-slate-700">Overseas Other Skills Assessment</span>
                      <Textarea className={textareaClassName} rows={3} value={form.overseasOtherSkillsAssessment} onChange={(event) => updateField("overseasOtherSkillsAssessment", event.target.value)} />
                    </label>

                    <SubSection title="Employment History" description="List your recent employers in the same row-based style used in the FDW form." />
                    <div className="space-y-4 md:col-span-2">
                      {renderEmploymentHistoryRow(1)}
                      {renderEmploymentHistoryRow(2)}
                      {renderEmploymentHistoryRow(3)}
                    </div>

                    <SubSection title="Employer Feedback" description="Add past employer feedback or recruiter comments if available." />
                    <label className="space-y-2 md:col-span-2">
                      <span className="text-sm font-medium text-slate-700">Feedback From Employer 1</span>
                      <Textarea className={textareaClassName} rows={4} value={form.feedbackEmployer1} onChange={(event) => updateField("feedbackEmployer1", event.target.value)} />
                    </label>
                    <label className="space-y-2 md:col-span-2">
                      <span className="text-sm font-medium text-slate-700">Feedback From Employer 2</span>
                      <Textarea className={textareaClassName} rows={4} value={form.feedbackEmployer2} onChange={(event) => updateField("feedbackEmployer2", event.target.value)} />
                    </label>
                  </div>
                </>
              )}

              {activeStep === 4 && (
                <>
                  <SectionHeader
                    step="Step 4"
                    title="Attachments and Submission"
                    description="Share your availability, recruiter introduction, and documents that help the agency contact and shortlist you faster."
                    icon={FileCheck2}
                  />
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700">Available Date</span>
                      <Input className={fieldClassName} type="date" value={form.availableDate} onChange={(event) => updateField("availableDate", event.target.value)} />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700">Expected Salary</span>
                      <Input className={fieldClassName} type="number" min="0" value={form.expectedSalary} onChange={(event) => updateField("expectedSalary", event.target.value)} placeholder="700" />
                    </label>
                    <label className="space-y-2 md:col-span-2">
                      <span className="text-sm font-medium text-slate-700">Employment Preference</span>
                      <Input className={fieldClassName} value={form.employmentPreference} onChange={(event) => updateField("employmentPreference", event.target.value)} placeholder="Transfer, new placement, full-time live-in" />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700">Certifications</span>
                      <Textarea className={textareaClassName} rows={3} value={form.certifications} onChange={(event) => updateField("certifications", event.target.value)} />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700">Training Records</span>
                      <Textarea className={textareaClassName} rows={3} value={form.trainingRecords} onChange={(event) => updateField("trainingRecords", event.target.value)} />
                    </label>
                    <label className="space-y-2 md:col-span-2">
                      <span className="text-sm font-medium text-slate-700">Short Introduction / Cover Note</span>
                      <Textarea className={textareaClassName} rows={5} value={form.coverNote} onChange={(event) => updateField("coverNote", event.target.value)} placeholder="Tell us about your strengths, preferred work environment, and anything the recruiter should know." />
                    </label>
                    <label className="space-y-2 md:col-span-2">
                      <span className="text-sm font-medium text-slate-700">Final Remarks</span>
                      <Textarea className={textareaClassName} rows={4} value={form.otherRemarksE} onChange={(event) => updateField("otherRemarksE", event.target.value)} />
                    </label>
                  </div>

                  <div className="mt-8">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-bold text-slate-950">Upload Documents</h3>
                        <p className="mt-1 text-sm text-slate-600">Attach the same supporting documents recruiters usually request together with the FDW form.</p>
                      </div>
                      <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">Optional except resume</Badge>
                    </div>
                  </div>

                  <div className="grid gap-4">
                    {fileFieldOrder.map((field) => (
                      <label key={field} className="space-y-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-4 transition hover:border-emerald-300 hover:bg-emerald-50/60">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-medium text-slate-800">{fileLabels[field]}</span>
                          <span className="text-xs font-medium text-slate-500">File upload</span>
                        </div>
                        <Input
                          className={fieldClassName}
                          type="file"
                          accept={field === "introVideo" ? ".mp4,.mov,video/*" : ".pdf,.doc,.docx,.jpg,.jpeg,.png"}
                          onChange={(event) => void handleFileChange(field, event.target.files)}
                        />
                        <p className="text-xs text-slate-500">
                          {field === "introVideo"
                            ? files[field]?.length
                              ? `${files[field].length} file selected. Introduction video must be 1 minute or less.`
                              : "Introduction video must be 1 minute or less."
                            : files[field]?.length
                              ? `${files[field].length} file(s) selected`
                              : "No file selected yet"}
                        </p>
                      </label>
                    ))}
                  </div>
                </>
              )}

              <div className="mt-8 flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-slate-500">{activeStep + 1} of {stepItems.length} steps</div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button type="button" variant="outline" onClick={goPrevious} disabled={isFirstStep} className="border-slate-200">
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    type="submit"
                    className="bg-emerald-600 text-white hover:bg-emerald-700"
                    disabled={submitMutation.isPending || (activeStep === 0 && !termsAccepted)}
                  >
                    {isLastStep ? (submitMutation.isPending ? "Submitting Application..." : "Submit Application") : "Continue"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:sticky xl:top-28 xl:grid-cols-1 xl:self-start">
            <Card className="rounded-[2rem] border-slate-200 bg-slate-950 p-6 text-white shadow-[0_24px_80px_-40px_rgba(15,23,42,0.65)]">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-emerald-400/15 p-3 text-emerald-300">
                  <Globe2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">Before You Submit</p>
                  <h3 className="mt-1 text-2xl font-black">Make your profile easy to shortlist.</h3>
                </div>
              </div>
              <div className="mt-5 space-y-3 text-sm leading-6 text-slate-300">
                <p>The agency ATS will score your application automatically based on your experience, skills, language coverage, and supporting documents.</p>
                <p>Your WhatsApp number and email will appear in the recruiter list so support can contact you quickly.</p>
                <p>Using the FDW biodata structure helps the recruiter compare your profile with existing maid records more easily.</p>
              </div>
              <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">Application checklist</p>
                <div className="mt-3 space-y-2 text-sm text-slate-200">
                  {publicInfoChecklist.map((item) => (
                    <div key={item} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-300" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              <Button
                type="submit"
                className="mt-6 w-full bg-emerald-500 text-white hover:bg-emerald-600"
                disabled={submitMutation.isPending || (activeStep === 0 && !termsAccepted)}
              >
                {submitMutation.isPending ? "Submitting Application..." : "Submit Application"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <p className="mt-3 text-xs text-slate-400">By submitting, you allow the agency to review your information and contact you about recruitment opportunities.</p>
            </Card>

            <Card className="rounded-[2rem] border-slate-200 bg-white/95 p-6 shadow-sm shadow-slate-200/60">
              <h3 className="text-lg font-black text-slate-950">What happens next</h3>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <p>1. Your application is created in the agency recruitment ATS as a new applicant.</p>
                <p>2. Recruiters can sort you by automated qualification score, filter by skills, and contact you from the list view.</p>
                <p>3. You may receive follow-ups for missing documents, interviews, or approval updates.</p>
              </div>
              <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
                Keep your phone nearby after submitting. Support may contact you on WhatsApp or email for clarifications and interview scheduling.
              </div>
              <div className="mt-5 border-t border-slate-200 pt-5">
                <Link to="/" className="text-sm font-medium text-emerald-700 hover:text-emerald-800">
                  Return to homepage
                </Link>
              </div>
            </Card>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PublicMaidApplicationPage;
