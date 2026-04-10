import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Star } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { adminPath } from "@/lib/routes";
import type { MaidProfile } from "@/lib/maids";
 
/* ─── Constants ─── */
 
const tabs = ["PROFILE", "SKILLS", "EMPLOYMENT HISTORY", "AVAILABILITY/REMARK", "INTRODUCTION", "PUBLIC INTRODUCTION", "PRIVATE INFO"];
 
const defaultLanguages = [
  "English",
  "Mandarin/Chinese-Dialect",
  "Bahasa Indonesia/Malaysia",
  "Hindi",
  "Tamil",
] as const;
 
const otherInformationQuestionGroups = [
  { label: "Able to handle pork?", keys: ["Able to handle pork?"] },
  { label: "Able to eat pork?", keys: ["Able to eat pork?"] },
  { label: "Able to care for dog/cat?", keys: ["Able to care for dog/cat?"] },
  { label: "Able to do simple sewing?", keys: ["Able to do simple sewing?"] },
  { label: "Able to do gardening work?", keys: ["Able to do gardening work?"] },
  { label: "Willing to wash car?", keys: ["Willing to wash car?"] },
  {
    label: "Willing to work on off-days with  compensation?",
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
        evaluation: typeof item.evaluation === "string" && item.evaluation.trim()
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
      result[key] = { willing: false, experience: false, evaluation: "N.A.", yearsOfExperience: "", rating: null, note: "" };
    }
  }
  return result;
};
 
const toEmploymentHistory = (value: unknown): EmploymentHistoryRow[] => {
  if (!Array.isArray(value)) return [{ from: "", to: "", country: "", employer: "", duties: "", remarks: "" }];
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
  return mapped.length > 0 ? mapped : [{ from: "", to: "", country: "", employer: "", duties: "", remarks: "" }];
};
 
const toIntroduction = (value: unknown): IntroductionForm => {
  const obj = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const pastIllnesses = toBooleanRecord(obj.pastIllnesses);
  const legacyMap: Record<string, (typeof pastIllnessKeys)[number]> = {
    "Mental illness": "(I) Mental illness",
    "Epilepsy": "(II) Epilepsy",
    "Asthma": "(III) Asthma",
    "Diabetes": "(IV) Diabetes",
    "Hypertension": "(V) Hypertension",
    "Tuberculosis": "(VI) Tuberculosis",
    "Heart disease": "(VII) Heart disease",
    "Malaria": "(VIII) Malaria",
    "Operations": "(IX) Operations",
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
    foodHandlingPreferences: typeof obj.foodHandlingPreferences === "string" ? obj.foodHandlingPreferences : "",
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
    homeCountryContactNumber: typeof obj.homeCountryContactNumber === "string" ? obj.homeCountryContactNumber : "",
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
 
/* ─── Shared sub-components ─── */
 
const FormRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="grid grid-cols-[auto_1fr] gap-2 items-center">
    <Label className="text-xs font-medium text-right whitespace-nowrap">{label}</Label>
    <div className="min-w-0">{children}</div>
  </div>
);
 
const FormRow2Col = ({ left, right }: { left: React.ReactNode; right?: React.ReactNode }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
    <div>{left}</div>
    {right ? <div>{right}</div> : <div />}
  </div>
);
 
const RadioGroup = ({
  name, options, value, onValueChange,
}: {
  name: string; options: string[]; value?: string; onValueChange?: (next: string) => void;
}) => (
  <div className="flex gap-4">
    {options.map((opt) => (
      <label key={opt} className="flex items-center gap-1 text-sm">
        <input type="radio" name={name} className="accent-primary" checked={value === opt} onChange={() => onValueChange?.(opt)} />
        {opt}
      </label>
    ))}
  </div>
);
 
const YesNo = ({ name, value, onValueChange }: { name: string; value?: boolean; onValueChange?: (next: boolean) => void }) => (
  <div className="flex gap-3">
    <label className="flex items-center gap-1 text-sm">
      <input type="radio" name={name} className="accent-primary" checked={value === true} onChange={() => onValueChange?.(true)} /> Yes
    </label>
    <label className="flex items-center gap-1 text-sm">
      <input type="radio" name={name} className="accent-primary" checked={value === false} onChange={() => onValueChange?.(false)} /> No
    </label>
  </div>
);
 
type SelectOption = string | { value: string; label: string; disabled?: boolean };
 
const SelectInput = ({ options, className, value, onChange, name }: {
  options: SelectOption[]; className?: string; value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void; name?: string;
}) => (
  <select
    name={name} value={value} onChange={onChange}
    className={`h-10 rounded-md border bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30 ${className || "w-full"}`}
  >
    {options.map((option) => {
      if (typeof option === "string") return <option key={option} value={option}>{option}</option>;
      return <option key={option.value} value={option.value} disabled={option.disabled}>{option.label}</option>;
    })}
  </select>
);
 
const StarRating = ({ value, onChange, name }: { value: number | null; onChange: (next: number | null) => void; name?: string }) => (
  <div className="flex items-center justify-center gap-1">
    {name && <input type="hidden" name={name} value={value === null ? "" : String(value)} />}
    {Array.from({ length: 5 }, (_, index) => {
      const starValue = index + 1;
      const active = value !== null && starValue <= value;
      return (
        <button key={starValue} type="button" className="p-1" onClick={() => onChange(value === starValue ? null : starValue)}>
          <Star className={`h-4 w-4 ${active ? "fill-primary text-primary" : "text-muted-foreground"}`} />
        </button>
      );
    })}
    <button
      type="button"
      className={`ml-1 rounded border px-2 py-1 text-[11px] ${value === null ? "bg-muted" : "bg-background hover:bg-muted"}`}
      onClick={() => onChange(null)}
    >
      N.A.
    </button>
  </div>
);
 
type SaveButtonsProps = {
  onSave?: () => void;
  isSaving?: boolean;
  primaryLabel?: string;
};
 
const SaveButtons = ({ onSave, isSaving, primaryLabel }: SaveButtonsProps) => (
  <div className="flex justify-center gap-4 pt-6">
    <Button
      type="button"
      onClick={onSave}
      disabled={isSaving}
      className="px-8 bg-yellow-400 text-black hover:bg-yellow-500"
    >
      {primaryLabel || "Save Changes"}
    </Button>
  </div>
);
 
/* ─── Tab props ─── */
 
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
  const years: SelectOption[] = [
    "--",
    ...Array.from({ length: currentYear + 10 - 1960 + 1 }, (_, i) => String(1960 + i)),
  ];
  const days: SelectOption[] = ["--", ...Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0"))];
  const months: SelectOption[] = ["--", ...Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"))];
 
  const dobMatch = form.dateOfBirth.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const dobYear = dobMatch?.[1] ?? "--";
  const dobMonth = dobMatch?.[2] ?? "--";
  const dobDay = dobMatch?.[3] ?? "--";
 
  const contractMatch = form.introduction.contractEnds.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const contractYear = contractMatch?.[1] ?? "--";
  const contractMonth = contractMatch?.[2] ?? "--";
  const contractDay = contractMatch?.[3] ?? "--";
 
  const [dobDraft, setDobDraft] = useState({ day: dobDay, month: dobMonth, year: dobYear });
  const [contractDraft, setContractDraft] = useState({ day: contractDay, month: contractMonth, year: contractYear });
 
  useEffect(() => { setDobDraft({ day: dobDay, month: dobMonth, year: dobYear }); }, [dobDay, dobMonth, dobYear]);
  useEffect(() => { setContractDraft({ day: contractDay, month: contractMonth, year: contractYear }); }, [contractDay, contractMonth, contractYear]);
 
  const setIntroField = (key: string, value: unknown) =>
    setForm((prev) => prev ? { ...prev, introduction: { ...prev.introduction, [key]: value } } : prev);
 
  const setSkillsPrefField = (key: string, value: unknown) =>
    setForm((prev) => prev ? { ...prev, skillsPreferences: { ...prev.skillsPreferences, [key]: value } } : prev);
 
  const otherInformation = form.skillsPreferences.otherInformation;
  const pastIllnesses = form.introduction.pastIllnesses;
 
  return (
    <div className="content-card animate-fade-in-up space-y-6">
      <h3 className="text-center font-bold text-lg">(A) PROFILE OF FDW</h3>
 
      <div className="section-header bg-yellow-300 text-black px-4 py-2 rounded-lg font-semibold shadow-sm">A1. Personal Information</div>
      <div className="space-y-3 pt-2">
        <FormRow2Col
          left={<FormRow label="Maid Name:"><Input value={form.fullName} onChange={(e) => setForm((p) => p ? { ...p, fullName: e.target.value } : p) } /></FormRow>}
          right={<FormRow label="Ref Code:"><Input value={form.referenceCode} onChange={(e) => setForm((p) => p ? { ...p, referenceCode: e.target.value } : p)} /></FormRow>}
        />
        <FormRow2Col
          left={
            <FormRow label="Type:">
              <SelectInput
                value={form.type}
                onChange={(e) => setForm((p) => p ? { ...p, type: e.target.value } : p)}
                options={[
                  { value: "", label: "Select Type", disabled: true },
                  "New maid", "Transfer maid", "APS maid", "Ex-Singapore maid", "Ex-Hong Kong maid",
                  "Ex-Taiwan maid", "Ex-Malaysia maid", "Ex-Middle East maid",
                  "Applying to work in Hong Kong", "Applying to work in Canada", "Applying to work in Taiwan",
                ]}
              />
            </FormRow>
          }
          right={
            <FormRow label="Nationality:">
              <SelectInput
                value={form.nationality}
                onChange={(e) => setForm((p) => p ? { ...p, nationality: e.target.value } : p)}
                options={[
                  { value: "", label: "Select Nationality", disabled: true },
                  "Filipino maid", "Indonesian maid", "Indian maid", "Myanmar maid",
                  "Sri Lankan maid", "Bangladeshi maid", "Nepali maid", "Cambodian maid", "Others",
                ]}
              />
            </FormRow>
          }
        />
        <FormRow2Col
          left={<div />}
          right={
            <FormRow label="Indian Maid Category:">
              <SelectInput
                options={["Select", "Mizoram maid", "Darjeeling maid", "Manipur maid", "Punjabi maid", "Others"]}
                value={form.skillsPreferences.indianMaidCategory || "Select"}
                onChange={(e) => setSkillsPrefField("indianMaidCategory", e.target.value === "Select" ? "" : e.target.value)}
              />
            </FormRow>
          }
        />
        <FormRow2Col
          left={
            <FormRow label="Date of Birth:">
              <div className="flex gap-1">
                <SelectInput options={days} className="w-16" value={dobDraft.day}
                  onChange={(e) => {
                    const next = { ...dobDraft, day: e.target.value };
                    setDobDraft(next);
                    const val = next.day === "--" || next.month === "--" || next.year === "--" ? "" : `${next.year}-${next.month}-${next.day}`;
                    setForm((p) => p ? { ...p, dateOfBirth: val } : p);
                  }}
                />
                <SelectInput options={months} className="w-16" value={dobDraft.month}
                  onChange={(e) => {
                    const next = { ...dobDraft, month: e.target.value };
                    setDobDraft(next);
                    const val = next.day === "--" || next.month === "--" || next.year === "--" ? "" : `${next.year}-${next.month}-${next.day}`;
                    setForm((p) => p ? { ...p, dateOfBirth: val } : p);
                  }}
                />
                <SelectInput options={years} className="w-24" value={dobDraft.year}
                  onChange={(e) => {
                    const next = { ...dobDraft, year: e.target.value };
                    setDobDraft(next);
                    const val = next.day === "--" || next.month === "--" || next.year === "--" ? "" : `${next.year}-${next.month}-${next.day}`;
                    setForm((p) => p ? { ...p, dateOfBirth: val } : p);
                  }}
                />
              </div>
            </FormRow>
          }
          right={<FormRow label="Place Of Birth:"><Input value={form.placeOfBirth} onChange={(e) => setForm((p) => p ? { ...p, placeOfBirth: e.target.value } : p)} /></FormRow>}
        />
        <FormRow2Col
          left={
            <FormRow label="Height:">
              <SelectInput
                value={form?.height || ""}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p!,
                    height: e.target.value, // ✅ keep as string
                  }))
                }
                options={[
                  { value: "", label: "Select", disabled: true },

                  ...Array.from({ length: 81 }, (_, i) => {
                    const cm = 150 + i;

                    const totalInches = cm / 2.54;
                    const feet = Math.floor(totalInches / 12);
                    const inches = Math.round(totalInches % 12);

                    return {
                      value: String(cm),
                      label: `${cm}cm (${feet}'${inches}")`,
                    };
                  }),
                ]}
              />
            </FormRow>
          }

          right={
            <FormRow label="Weight:">
              <SelectInput
                value={form?.weight || ""}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p!,
                    weight: e.target.value,
                  }))
                }
                options={[
                  { value: "", label: "Select", disabled: true },

                  ...Array.from({ length: 101 }, (_, i) => {
                    const kg = 40 + i;
                    const lbs = Math.round(kg * 2.20462);

                    return {
                      value: String(kg),
                      label: `${kg}Kg (${lbs} lbs)`,
                    };
                  }),
                ]}
              />
            </FormRow>
          }
        />
 
        <FormRow label="Residential Address in Home Country:">
          <Input value={form.homeAddress} onChange={(e) => setForm((p) => p ? { ...p, homeAddress: e.target.value } : p)} />
        </FormRow>
        <FormRow label="Name of Port/Airport to be Repatriated:">
          <Input value={form.airportRepatriation} onChange={(e) => setForm((p) => p ? { ...p, airportRepatriation: e.target.value } : p)} />
        </FormRow>
        <FormRow label="Contact Number in Home Country:">
          <Input value={form.agencyContact.homeCountryContactNumber}
            onChange={(e) => setForm((p) => p ? { ...p, agencyContact: { ...p.agencyContact, homeCountryContactNumber: e.target.value } } : p)}
          />
        </FormRow>
 
        <FormRow2Col
          left={
            <FormRow label="Education:">
              <SelectInput
                value={form.educationLevel}
                onChange={(e) => setForm((p) => p ? { ...p, educationLevel: e.target.value } : p)}
                options={[
                  { value: "", label: "Select Education", disabled: true },
                  "Primary Level(<=6 yrs)", "Secondary Level(7~9 yrs)", "High School(10~12 yrs)",
                  "Vocational Course", "College/Degree (>=13 yrs)",
                ]}
              />
            </FormRow>
          }
          right={
            <FormRow label="Religion:">
              <SelectInput
                value={form.religion}
                onChange={(e) => setForm((p) => p ? { ...p, religion: e.target.value } : p)}
                options={[
                  { value: "", label: "Select Religion", disabled: true },
                  "Catholic", "Christian", "Muslim", "Hindu", "Buddhist", "Sikh", "Free Thinker", "Others",
                ]}
              />
            </FormRow>
          }
        />
        <FormRow2Col
          left={
            <FormRow label="Number of Siblings:">
              <Input type="number" value={form.numberOfSiblings} onChange={(e) => setForm((p) => p ? { ...p, numberOfSiblings: e.target.value } : p)} />
            </FormRow>
          }
          right={
            <FormRow label="Marital Status:">
              <SelectInput
                value={form.maritalStatus}
                onChange={(e) => setForm((p) => p ? { ...p, maritalStatus: e.target.value } : p)}
                options={[
                  { value: "", label: "Select Marital Status", disabled: true },
                  "Single", "Single Parent", "Married", "Divorced", "Widowed", "Separated",
                ]}
              />
            </FormRow>
          }
        />
        <FormRow2Col
          left={
            <FormRow label="Number of Children:">
              <SelectInput
                options={["0","1","2","3","4","5","6","7","8","9","10"]}
                value={form.numberOfChildren}
                onChange={(e) => setForm((p) => p ? { ...p, numberOfChildren: e.target.value } : p)}
              />
            </FormRow>
          }
          right={
            <FormRow label="Ages of Children:">
              <Input value={form.introduction.agesOfChildren} onChange={(e) => setIntroField("agesOfChildren", e.target.value)} />
            </FormRow>
          }
        />
        <FormRow2Col
          left={<FormRow label="Present Salary (S$):"><Input value={form.introduction.presentSalary} onChange={(e) => setIntroField("presentSalary", e.target.value)} /></FormRow>}
          right={<FormRow label="Expected Salary:"><Input value={form.introduction.expectedSalary} onChange={(e) => setIntroField("expectedSalary", e.target.value)} /></FormRow>}
        />
        <FormRow2Col
          left={<FormRow label="When will this maid be Available?"><Input value={form.introduction.availability} onChange={(e) => setIntroField("availability", e.target.value)} /></FormRow>}
          right={
            <FormRow label="Contract Ends:">
              <div className="flex gap-1">
                <SelectInput options={days} className="w-16" value={contractDraft.day}
                  onChange={(e) => {
                    const next = { ...contractDraft, day: e.target.value };
                    setContractDraft(next);
                    const val = next.day === "--" || next.month === "--" || next.year === "--" ? "" : `${next.year}-${next.month}-${next.day}`;
                    setIntroField("contractEnds", val);
                  }}
                />
                <SelectInput options={months} className="w-16" value={contractDraft.month}
                  onChange={(e) => {
                    const next = { ...contractDraft, month: e.target.value };
                    setContractDraft(next);
                    const val = next.day === "--" || next.month === "--" || next.year === "--" ? "" : `${next.year}-${next.month}-${next.day}`;
                    setIntroField("contractEnds", val);
                  }}
                />
                <SelectInput options={years} className="w-24" value={contractDraft.year}
                  onChange={(e) => {
                    const next = { ...contractDraft, year: e.target.value };
                    setContractDraft(next);
                    const val = next.day === "--" || next.month === "--" || next.year === "--" ? "" : `${next.year}-${next.month}-${next.day}`;
                    setIntroField("contractEnds", val);
                  }}
                />
              </div>
            </FormRow>
          }
        />
        <FormRow2Col
          left={<FormRow label="Maid Loan (S$):"><Input value={form.introduction.maidLoan} onChange={(e) => setIntroField("maidLoan", e.target.value)} /></FormRow>}
          right={<FormRow label="Offday Compensation (S$/day):"><Input value={form.introduction.offdayCompensation} onChange={(e) => setIntroField("offdayCompensation", e.target.value)} /></FormRow>}
        />
      </div>
 
      <div className="section-header bg-yellow-300 text-black px-4 py-2 rounded-lg font-semibold shadow-sm">Language Skills:</div>
        <div className="space-y-3 pt-2">
          {defaultLanguages.map((lang) => (
            <div key={lang} className="flex flex-col sm:flex-row sm:items-center gap-2">
              <Label className="text-sm w-52 text-right font-medium">{lang}:</Label>

              <RadioGroup
                name={`lang_${lang}`}
                options={["Zero", "Poor", "Little", "Fair", "Good"]}
                value={form.languageSkills[lang] ?? ""}
                onValueChange={(next) =>
                  setForm((p) =>
                    p
                      ? {
                          ...p,
                          languageSkills: {
                            ...p.languageSkills,
                            [lang]: next,
                          },
                        }
                      : p
                  )
                }
              />
            </div>
        ))}
      </div>
 
      <div className="section-header bg-yellow-300 text-black px-4 py-2 rounded-lg font-semibold shadow-sm">Other Information:</div>
      <div className="space-y-2 pt-2">
        {otherInformationQuestionGroups.map((group) => (
          <div key={group.label} className="flex items-center gap-4">
            <span className="text-sm flex-1 text-right">{group.label}</span>
            <YesNo
              name={`other_${group.label}`}
              value={group.keys.some((k) => Boolean(otherInformation[k]))}
              onValueChange={(next) =>
                setForm((p) => {
                  if (!p) return p;
                  const nextOther = { ...p.skillsPreferences.otherInformation };
                  for (const key of group.keys) nextOther[key] = next;
                  return { ...p, skillsPreferences: { ...p.skillsPreferences, otherInformation: nextOther } };
                })
              }
            />
          </div>
        ))}
        <div className="flex items-center gap-4">
          <span className="text-sm flex-1 text-right">Number of off-days per month</span>
          <div className="flex items-center gap-2">
            <Input className="w-20" value={form.skillsPreferences.offDaysPerMonth} onChange={(e) => setSkillsPrefField("offDaysPerMonth", e.target.value)} />
            <span className="text-sm">rest day(s) per month.</span>
          </div>
        </div>
      </div>
 
      <div className="section-header bg-yellow-300 text-black px-4 py-2 rounded-lg font-semibold shadow-sm">A2. Medical History/Dietary Restrictions</div>
      <div className="space-y-3 pt-2">
        <FormRow label="Allergies (if any):"><Input value={form.introduction.allergies} onChange={(e) => setIntroField("allergies", e.target.value)} /></FormRow>
        <p className="text-sm font-medium">Past and existing illnesses:</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
          {pastIllnessKeys.map((key) => (
            <div key={key} className="flex items-center gap-3">
              <span className="text-sm flex-1">{key}</span>
              <YesNo
                name={`illness_${key}`}
                value={pastIllnesses[key]}
                onValueChange={(next) =>
                  setForm((p) => p ? {
                    ...p,
                    introduction: { ...p.introduction, pastIllnesses: { ...p.introduction.pastIllnesses, [key]: next } },
                  } : p)
                }
              />
            </div>
          ))}
          <div className="flex items-center gap-3">
            <span className="text-sm flex-1">(X) Others:</span>
            <Input className="w-32" value={form.introduction.otherIllnesses} onChange={(e) => setIntroField("otherIllnesses", e.target.value)} />
          </div>
        </div>
        <FormRow label="Physical disabilities:"><Input value={form.introduction.physicalDisabilities} onChange={(e) => setIntroField("physicalDisabilities", e.target.value)} /></FormRow>
        <FormRow label="Dietary restrictions:"><Input value={form.introduction.dietaryRestrictions} onChange={(e) => setIntroField("dietaryRestrictions", e.target.value)} /></FormRow>
 
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-sm font-medium">Food handling preferences:</span>
          {(() => {
            const raw = form.introduction.foodHandlingPreferences;
            const parts = raw.split(",").map((p) => p.trim()).filter(Boolean);
            const hasNoPork = parts.includes("No Pork");
            const hasNoBeef = parts.includes("No Beef");
            const other = parts.filter((p) => p !== "No Pork" && p !== "No Beef").join(", ");
            const setFoodPrefs = (np: boolean, nb: boolean, o: string) => {
              const nextParts = [...(np ? ["No Pork"] : []), ...(nb ? ["No Beef"] : []), ...(o.trim() ? [o.trim()] : [])];
              setIntroField("foodHandlingPreferences", nextParts.join(", "));
            };
            return (
              <>
                <label className="flex items-center gap-1 text-sm">
                  <input type="checkbox" className="accent-primary" checked={hasNoPork} onChange={(e) => setFoodPrefs(e.target.checked, hasNoBeef, other)} /> No Pork
                </label>
                <label className="flex items-center gap-1 text-sm">
                  <input type="checkbox" className="accent-primary" checked={hasNoBeef} onChange={(e) => setFoodPrefs(hasNoPork, e.target.checked, other)} /> No Beef
                </label>
                <div className="flex items-center gap-1">
                  <span className="text-sm">Others</span>
                  <Input className="w-32" value={other} onChange={(e) => setFoodPrefs(hasNoPork, hasNoBeef, e.target.value)} />
                </div>
              </>
            );
          })()}
        </div>
      </div>
 
      <div className="section-header bg-yellow-300 text-black px-4 py-2 rounded-lg font-semibold shadow-sm">A3. Others</div>
      <div className="pt-2">
        <FormRow label="Any other remarks:"><Input value={form.introduction.otherRemarks} onChange={(e) => setIntroField("otherRemarks", e.target.value)} /></FormRow>
      </div>
 
      <div className="pt-2">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.isPublic} onChange={(e) => setForm((p) => p ? { ...p, isPublic: e.target.checked } : p)} />
          Public profile (visible without login)
        </label>
      </div>
 
      <SaveButtons onSave={onSave} isSaving={isSaving} primaryLabel={primaryLabel} />
    </div>
  );
};
 
/* ─────────────────────────────
   TAB 2 – SKILLS
───────────────────────────── */
const SkillsTab = ({ form, setForm, onSave, isSaving, primaryLabel }: TabProps) => {
  const setWorkArea = (area: string, patch: Partial<WorkAreaFormItem>) =>
    setForm((prev) => {
      if (!prev) return prev;
      const current = prev.workAreas[area] ?? { willing: false, experience: false, evaluation: "N.A.", yearsOfExperience: "", rating: null, note: "" };
      const next = { ...current, ...patch };
      return { ...prev, workAreas: { ...prev.workAreas, [area]: next } };
    });
 
  const setWorkAreaNote = (key: string, value: string) =>
    setForm((prev) => prev ? {
      ...prev,
      skillsPreferences: { ...prev.skillsPreferences, workAreaNotes: { ...prev.skillsPreferences.workAreaNotes, [key]: value } },
    } : prev);
 
  return (
    <div className="content-card animate-fade-in-up space-y-6">
      <h3 className="text-center font-bold text-lg">(B) MAID's SKILLS</h3>
 
      <div className="section-header bg-yellow-300 text-black px-4 py-2 rounded-lg font-semibold shadow-sm">B1. Method of Evaluation of Skills</div>
      <p className="text-sm pt-2">Please indicate the method(s) used to evaluate the FDW's skills:</p>
      <div className="space-y-2 pl-2">
        {["Based on FDW's declaration, no evaluation/observation by Singapore EA or overseas training centre/EA", "Interviewed by Singapore EA"].map((opt) => (
          <label key={opt} className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="accent-primary mt-0.5" /> {opt}
          </label>
        ))}
        <div className="pl-6 space-y-2">
          {["Interviewed via telephone/teleconference", "Interviewed via videoconference", "Interviewed in person", "Interviewed in person and also made observation of FDW in the areas of work listed in table"].map((opt) => (
            <label key={opt} className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="accent-primary mt-0.5" /> {opt}
            </label>
          ))}
        </div>
      </div>
 
      <div className="overflow-x-auto">
        <table className="w-full text-sm border border-border">
          <thead>
            <tr className="bg-muted">
              <th className="border border-border px-2 py-2 text-center w-12">S/No</th>
              <th className="border border-border px-3 py-2 text-center">Areas of Work</th>
              <th className="border border-border px-2 py-2 text-center w-24">Willingness<br />Yes/No</th>
              <th className="border border-border px-2 py-2 text-center w-40">Experience<br />Yes/No<br /><span className="font-normal text-xs">If yes, state no. of years</span></th>
              <th className="border border-border px-2 py-2 text-center w-64">Assessment/Observation<br /><span className="font-normal text-xs">Click to rate (stars) and/or add notes.</span></th>
            </tr>
          </thead>
          <tbody>
            {skillRows.map((row) => {
              const config = form.workAreas[row.label] ?? { willing: false, experience: false, evaluation: "N.A.", yearsOfExperience: "", rating: null, note: "" };
              const subKey = row.label === "Other skills, if any" ? "Other Skill" : row.label;
              const updateEval = (nextRating: number | null, nextNote: string) =>
                setWorkArea(row.label, { rating: nextRating, note: nextNote, evaluation: buildWorkAreaEvaluation(nextRating, nextNote) });
 
              return (
                <tr key={row.no}>
                  <td className="border border-border px-2 py-3 text-center align-top">{row.no}</td>
                  <td className="border border-border px-3 py-3 align-top">
                    <span className="font-bold">{row.label}</span>
                    {row.sub && (
                      <div className="mt-1">
                        <span className="text-xs">{row.sub}</span>
                        {row.subField && (
                          <Input className="mt-1 w-48 h-7 text-xs" value={form.skillsPreferences.workAreaNotes[subKey] ?? ""} onChange={(e) => setWorkAreaNote(subKey, e.target.value)} />
                        )}
                      </div>
                    )}
                  </td>
                  <td className="border border-border px-2 py-3 text-center align-top">
                    <YesNo name={`will_${row.no}`} value={config.willing} onValueChange={(v) => setWorkArea(row.label, { willing: v })} />
                  </td>
                  <td className="border border-border px-2 py-3 text-center align-top">
                    <div className="mb-2 flex items-center justify-center">
                      <YesNo name={`exp_${row.no}`} value={config.experience}
                        onValueChange={(v) => setWorkArea(row.label, { experience: v, yearsOfExperience: v ? String(config.yearsOfExperience ?? "") : "" })}
                      />
                    </div>
                    <div className="flex items-center justify-center gap-1">
                      <Input className="w-16 h-7 text-xs" value={config.yearsOfExperience ?? ""} disabled={!config.experience}
                        onChange={(e) => setWorkArea(row.label, { yearsOfExperience: e.target.value })}
                      />
                      <span className="text-xs">(years)</span>
                    </div>
                  </td>
                  <td className="border border-border px-2 py-3 align-top">
                    <div className="mb-2">
                      <StarRating value={config.rating ?? null} onChange={(r) => updateEval(r, config.note ?? "")} />
                    </div>
                    <textarea
                      className="w-full min-h-[50px] rounded border bg-background px-2 py-1 text-xs"
                      value={config.note ?? ""}
                      onChange={(e) => updateEval(config.rating ?? null, e.target.value)}
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
    </div>
  );
};
 
/* ─────────────────────────────
   TAB 3 – EMPLOYMENT HISTORY
───────────────────────────── */
const EmploymentHistoryTab = ({ form, setForm, onSave, isSaving, primaryLabel }: TabProps) => {
  const years: SelectOption[] = ["--", ...Array.from({ length: 30 }, (_, i) => String(2000 + i))];
  const countries: SelectOption[] = ["--", "Singapore", "Hong Kong", "Taiwan", "Malaysia", "Saudi Arabia", "UAE", "Kuwait", "Bahrain", "Qatar", "Oman", "Jordan", "Lebanon", "Brunei", "Others"];
 
  const updateRow = (index: number, patch: Partial<EmploymentHistoryRow>) =>
    setForm((p) => {
      if (!p) return p;
      const next = [...p.employmentHistory];
      next[index] = { ...next[index], ...patch };
      return { ...p, employmentHistory: next };
    });
 
  const addRow = () => setForm((p) => p ? { ...p, employmentHistory: [...p.employmentHistory, { from: "", to: "", country: "", employer: "", duties: "", remarks: "" }] } : p);
  const removeRow = (i: number) => setForm((p) => p ? { ...p, employmentHistory: p.employmentHistory.filter((_, idx) => idx !== i) } : p);
 
  const sgExperience = form.skillsPreferences.otherInformation["sgExperience"] as unknown as boolean | undefined;
 
  return (
    <div className="content-card animate-fade-in-up space-y-6">
      <h3 className="text-center font-bold text-lg">(C) EMPLOYMENT HISTORY OF THE FDW</h3>
 
      <div className="section-header bg-yellow-300 text-black px-4 py-2 rounded-lg font-semibold shadow-sm">C1. Employment History</div>
      <div className="space-y-6 pt-2">
        {form.employmentHistory.map((row, idx) => (
          <div key={idx} className="space-y-2 border p-4 rounded-xl">
            <div className="flex justify-between items-center">
              <Label className="text-sm font-bold">Employer #{idx + 1}</Label>
              {form.employmentHistory.length > 1 && (
                <button type="button" onClick={() => removeRow(idx)} className="text-red-500 text-xs">Remove</button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-2 items-start">
              <Label className="text-xs sm:text-right pt-1">From Year</Label>
              <SelectInput options={years} className="w-48" value={row.from || "--"} onChange={(e) => updateRow(idx, { from: e.target.value === "--" ? "" : e.target.value })} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-2 items-start">
              <Label className="text-xs sm:text-right pt-1">To Year</Label>
              <SelectInput options={years} className="w-48" value={row.to || "--"} onChange={(e) => updateRow(idx, { to: e.target.value === "--" ? "" : e.target.value })} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-2 items-start">
              <Label className="text-xs sm:text-right pt-1">Country</Label>
              <SelectInput options={countries} className="w-48" value={row.country || "--"} onChange={(e) => updateRow(idx, { country: e.target.value === "--" ? "" : e.target.value })} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-2 items-start">
              <Label className="text-xs sm:text-right pt-1">Employer's Name</Label>
              <Input className="max-w-md" value={row.employer} onChange={(e) => updateRow(idx, { employer: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-2 items-start">
              <Label className="text-xs sm:text-right pt-1">Main Duties</Label>
              <textarea className="w-full max-w-md min-h-[60px] rounded-md border bg-background px-3 py-2 text-sm" value={row.duties} onChange={(e) => updateRow(idx, { duties: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-2 items-start">
              <Label className="text-xs sm:text-right pt-1">Remarks</Label>
              <textarea className="w-full max-w-md min-h-[60px] rounded-md border bg-background px-3 py-2 text-sm" value={row.remarks} onChange={(e) => updateRow(idx, { remarks: e.target.value })} />
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-center">
        <button type="button" onClick={addRow} className="px-4 py-2 bg-primary text-white rounded-lg text-sm">+ Add Employer</button>
      </div>
 
      <div className="section-header bg-yellow-300 text-black px-4 py-2 rounded-lg font-semibold shadow-sm">C2. Employment History in Singapore</div>
      <div className="space-y-2 pt-2">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">Previous working experience in Singapore</span>
          <YesNo
            name="sg_experience"
            value={sgExperience}
            onValueChange={(next) =>
              setForm((p) => p ? {
                ...p,
                skillsPreferences: { ...p.skillsPreferences, otherInformation: { ...p.skillsPreferences.otherInformation, sgExperience: next as unknown as boolean } },
              } : p)
            }
          />
        </div>
        <p className="text-xs text-muted-foreground">
          (The EA is required to obtain the FDW's employment history from MOM and furnish the employer with the employment history of the FDW.)
        </p>
      </div>
 
      <div className="section-header bg-yellow-300 text-black px-4 py-2 rounded-lg font-semibold shadow-sm">C3. Feedback from previous employers in Singapore</div>
      <div className="space-y-3 pt-2">
        <FormRow label="Feedback from Singapore Employer 1:"><Input /></FormRow>
        <FormRow label="Feedback from Singapore Employer 2:"><Input /></FormRow>
      </div>
 
      <SaveButtons onSave={onSave} isSaving={isSaving} primaryLabel={primaryLabel} />
    </div>
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
      const next = checked ? Array.from(new Set([...current, opt])) : current.filter((v) => v !== opt);
      return { ...p, skillsPreferences: { ...p.skillsPreferences, availabilityInterviewOptions: next } };
    });
 
  return (
    <div className="content-card animate-fade-in-up space-y-6">
      <h3 className="text-center font-bold text-lg">(D) MAID's AVAILABILITY and REMARK</h3>
      <div className="space-y-3">
        {["FDW is not available for interview", "FDW can be interviewed by phone", "FDW can be interviewed by video-conference", "FDW can be interviewed in person"].map((opt) => (
          <label key={opt} className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="accent-primary" checked={interviewOptions.includes(opt)} onChange={(e) => toggleOption(opt, e.target.checked)} /> {opt}
          </label>
        ))}
      </div>
 
      <h3 className="font-bold text-lg">(E) OTHER REMARKS</h3>
      <div className="grid grid-cols-1 sm:grid-cols-[220px_1fr] gap-2 items-start">
        <Label className="text-sm font-bold sm:text-right pt-2">OTHER REMARKS:</Label>
        <textarea
          className="w-full min-h-[100px] rounded-md border bg-background px-3 py-2 text-sm"
          value={form.skillsPreferences.availabilityRemark}
          onChange={(e) => setForm((p) => p ? { ...p, skillsPreferences: { ...p.skillsPreferences, availabilityRemark: e.target.value } } : p)}
        />
      </div>
 
      <SaveButtons onSave={onSave} isSaving={isSaving} primaryLabel={primaryLabel} />
    </div>
  );
};
 
/* ─────────────────────────────
   TAB 5 – INTRODUCTION
───────────────────────────── */
const IntroductionTab = ({ form, setForm, onSave, isSaving, primaryLabel }: TabProps) => (
  <div className="content-card animate-fade-in-up space-y-4">
    <h3 className="text-center font-bold text-lg">MAID's INTRODUCTION</h3>
    <p className="text-center text-sm text-muted-foreground">This Introduction will be hidden from public. Employers need to login to view this introduction.</p>
    <div className="grid grid-cols-1 sm:grid-cols-[220px_1fr] gap-2 items-start">
      <Label className="text-sm font-bold sm:text-right pt-2">MAID INTRODUCTION:</Label>
      <textarea
        className="w-full min-h-[250px] rounded-md border bg-background px-3 py-2 text-sm"
        value={form.introduction.intro}
        onChange={(e) => setForm((p) => p ? { ...p, introduction: { ...p.introduction, intro: e.target.value } } : p)}
      />
    </div>
    <SaveButtons onSave={onSave} isSaving={isSaving} primaryLabel={primaryLabel} />
  </div>
);
 
/* ─────────────────────────────
   TAB 6 – PUBLIC INTRODUCTION
───────────────────────────── */
const PublicIntroductionTab = ({ form, setForm, onSave, isSaving, primaryLabel }: TabProps) => (
  <div className="content-card animate-fade-in-up space-y-4">
    <h3 className="text-center font-bold text-lg">PUBLIC INTRODUCTION</h3>
    <p className="text-center text-sm text-muted-foreground">This is maid introduction for public, employers can view this without login.</p>
    <div className="text-sm space-y-2 border rounded-lg p-4 bg-muted/30">
      <p>
        EAs must comply with MOM's{" "}
        <a href="https://www.mom.gov.sg/employment-practices/employment-agencies/ealc" className="text-primary underline" target="_blank" rel="noopener noreferrer">EALC #17</a>{" "}
        and only disclose the following list of the FDW's personal information publicly: FDW Name, FDW Nationality, FDW skills and experience in said skills, Food handling preferences, Previous employment history, Language abilities.
      </p>
      <p>EAs must not cast FDWs in an insensitive and undignified light.</p>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-[220px_1fr] gap-2 items-start">
      <Label className="text-sm font-bold sm:text-right pt-2">MAID INTRODUCTION:</Label>
      <textarea
        className="w-full min-h-[250px] rounded-md border bg-background px-3 py-2 text-sm"
        value={form.introduction.publicIntro}
        onChange={(e) => setForm((p) => p ? { ...p, introduction: { ...p.introduction, publicIntro: e.target.value } } : p)}
      />
    </div>
    <SaveButtons onSave={onSave} isSaving={isSaving} primaryLabel={primaryLabel} />
  </div>
);
 
/* ─────────────────────────────
   TAB 7 – PRIVATE INFO
───────────────────────────── */
const PrivateInfoTab = ({ form, setForm, onSave, isSaving, primaryLabel }: TabProps) => (
  <div className="content-card animate-fade-in-up space-y-4">
    <h3 className="text-center font-bold text-lg">MAID's PRIVATE INFORMATION</h3>
    <div className="space-y-3">
      <FormRow label="This maid was interviewed by:">
        <Input value={form.skillsPreferences.interviewedBy}
          onChange={(e) => setForm((p) => p ? { ...p, skillsPreferences: { ...p.skillsPreferences, interviewedBy: e.target.value } } : p)}
        />
      </FormRow>
      <FormRow label="Who Referred This Maid?">
        <Input value={form.skillsPreferences.referredBy}
          onChange={(e) => setForm((p) => p ? { ...p, skillsPreferences: { ...p.skillsPreferences, referredBy: e.target.value } } : p)}
        />
      </FormRow>
      <FormRow label="Passport Number of the Maid">
        <Input placeholder="e.g. R8833831 Expiry: 28/01/2028" value={form.agencyContact.passportNo}
          onChange={(e) => setForm((p) => p ? { ...p, agencyContact: { ...p.agencyContact, passportNo: e.target.value } } : p)}
        />
      </FormRow>
      <FormRow label="Telephone Number of Maid/Foreign Agency">
        <div className="flex items-center gap-2">
          <Input value={form.agencyContact.phone}
            onChange={(e) => setForm((p) => p ? { ...p, agencyContact: { ...p.agencyContact, phone: e.target.value } } : p)}
          />
          <span className="text-sm text-muted-foreground whitespace-nowrap">WhatsApp</span>
        </div>
      </FormRow>
      <div className="grid grid-cols-1 sm:grid-cols-[220px_1fr] gap-2 items-start">
        <Label className="text-sm sm:text-left pt-2">Agency's Historical Record <br></br> of the Maid</Label>
        <textarea
          className="w-full min-h-[200px] rounded-md border bg-background px-3 py-2 text-sm"
          value={form.skillsPreferences.privateInfo}
          onChange={(e) => setForm((p) => p ? { ...p, skillsPreferences: { ...p.skillsPreferences, privateInfo: e.target.value } } : p)}
        />
      </div>
    </div>
    <SaveButtons onSave={onSave} isSaving={isSaving} primaryLabel={primaryLabel} />
  </div>
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
        const response = await fetch(`/api/maids/${encodeURIComponent(refCode)}`);
        const data = (await response.json().catch(() => ({}))) as { error?: string; maid?: MaidProfile };
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
    if (!Number.isFinite(height) || height <= 0) { toast.error("Height must be a positive number."); return; }
    if (!Number.isFinite(weight) || weight <= 0) { toast.error("Weight must be a positive number."); return; }
    if (!Number.isFinite(numberOfChildren) || numberOfChildren < 0) { toast.error("Number of children must be 0 or more."); return; }
    if (!Number.isFinite(numberOfSiblings) || numberOfSiblings < 0) { toast.error("Number of siblings must be 0 or more."); return; }
 
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string; maid?: MaidProfile };
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
      <div className="page-container">
        <div className="content-card py-10 text-center text-muted-foreground">Loading maid...</div>
      </div>
    );
  }
 
  const primaryLabel = activeTab >= tabs.length - 1 ? "Save & Finish" : "Save & Continue";
 
  const tabProps: TabProps = { form, setForm: setForm as React.Dispatch<React.SetStateAction<MaidProfileFormState | null>>, onSave: handleSave, isSaving, primaryLabel };
 
  return (
    <div className="page-container">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h2 className="text-xl font-bold">Edit Maid: {maid.referenceCode}</h2>
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate(adminPath(`/maid/${encodeURIComponent(maid.referenceCode)}`))}
        >
          Back to Profile
        </Button>
      </div>
 
      {/* Tabs */}
      <div className="flex flex-wrap gap-1 mb-6">
        {tabs.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            className={`px-3 py-2 text-xs font-medium rounded-t-md border border-b-0 transition-colors active:scale-[0.97] ${
              activeTab === i
                ? "bg-card text-primary border-border"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
 
      {/* Tab panels */}
      {activeTab === 0 && <ProfileTab {...tabProps} />}
      {activeTab === 1 && <SkillsTab {...tabProps} />}
      {activeTab === 2 && <EmploymentHistoryTab {...tabProps} />}
      {activeTab === 3 && <AvailabilityRemarkTab {...tabProps} />}
      {activeTab === 4 && <IntroductionTab {...tabProps} />}
      {activeTab === 5 && <PublicIntroductionTab {...tabProps} />}
      {activeTab === 6 && <PrivateInfoTab {...tabProps} />}
 
      {/* Confirmation dialog on last tab */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Save</DialogTitle>
            <DialogDescription>
              You are about to save and finish editing this profile. Continue?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsConfirmOpen(false)} disabled={isSaving}>Cancel</Button>
            <Button type="button" onClick={() => { setIsConfirmOpen(false); void performSave(); }} disabled={isSaving}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
 
export default EditMaid;
