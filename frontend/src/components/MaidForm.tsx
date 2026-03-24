import { FormEvent, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { MaidProfile } from "@/lib/maids";

interface MaidFormProps {
  initialValue: MaidProfile;
  mode: "create" | "edit";
  isSubmitting: boolean;
  onSubmit: (payload: MaidProfile) => Promise<void>;
}

interface MaidFormState {
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
  languageSkillsText: string;
  skillsPreferencesText: string;
  workAreasText: string;
  employmentHistoryText: string;
  introductionText: string;
  agencyContactText: string;
  isPublic: boolean;
  hasPhoto: boolean;
}

const toJsonText = (value: unknown, fallback: string) => {
  try {
    return JSON.stringify(value ?? JSON.parse(fallback), null, 2);
  } catch {
    return fallback;
  }
};

const buildState = (maid: MaidProfile): MaidFormState => ({
  fullName: maid.fullName,
  referenceCode: maid.referenceCode,
  type: maid.type,
  nationality: maid.nationality,
  dateOfBirth: maid.dateOfBirth ? maid.dateOfBirth.slice(0, 10) : "",
  placeOfBirth: maid.placeOfBirth,
  height: maid.height ? String(maid.height) : "",
  weight: maid.weight ? String(maid.weight) : "",
  religion: maid.religion,
  maritalStatus: maid.maritalStatus,
  numberOfChildren: String(maid.numberOfChildren ?? 0),
  numberOfSiblings: String(maid.numberOfSiblings ?? 0),
  homeAddress: maid.homeAddress,
  airportRepatriation: maid.airportRepatriation,
  educationLevel: maid.educationLevel,
  languageSkillsText: toJsonText(maid.languageSkills, '{\n  "English": ""\n}'),
  skillsPreferencesText: toJsonText(maid.skillsPreferences, "{}"),
  workAreasText: toJsonText(maid.workAreas, "{}"),
  employmentHistoryText: toJsonText(maid.employmentHistory, "[]"),
  introductionText: toJsonText(maid.introduction, "{}"),
  agencyContactText: toJsonText(maid.agencyContact, '{\n  "companyName": "",\n  "contactPerson": "",\n  "phone": ""\n}'),
  isPublic: Boolean(maid.isPublic),
  hasPhoto: Boolean(maid.hasPhoto),
});

const parseJson = <T,>(label: string, value: string): T | null => {
  try {
    return JSON.parse(value) as T;
  } catch {
    toast.error(`${label} must be valid JSON`);
    return null;
  }
};

const MaidForm = ({ initialValue, mode, isSubmitting, onSubmit }: MaidFormProps) => {
  const [form, setForm] = useState<MaidFormState>(() => buildState(initialValue));

  const title = useMemo(() => (mode === "create" ? "Add Maid" : `Edit Maid: ${initialValue.referenceCode}`), [initialValue.referenceCode, mode]);

  const handleChange = (field: keyof MaidFormState, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const languageSkills = parseJson<Record<string, string>>("Language skills", form.languageSkillsText);
    const skillsPreferences = parseJson<Record<string, unknown>>("Skills preferences", form.skillsPreferencesText);
    const workAreas = parseJson<Record<string, unknown>>("Work areas", form.workAreasText);
    const employmentHistory = parseJson<Array<Record<string, unknown>>>("Employment history", form.employmentHistoryText);
    const introduction = parseJson<Record<string, unknown>>("Introduction", form.introductionText);
    const agencyContact = parseJson<Record<string, unknown>>("Agency contact", form.agencyContactText);

    if (!languageSkills || !skillsPreferences || !workAreas || !employmentHistory || !introduction || !agencyContact) {
      return;
    }

    await onSubmit({
      fullName: form.fullName.trim(),
      referenceCode: form.referenceCode.trim(),
      type: form.type.trim(),
      nationality: form.nationality.trim(),
      dateOfBirth: form.dateOfBirth,
      placeOfBirth: form.placeOfBirth.trim(),
      height: Number(form.height),
      weight: Number(form.weight),
      religion: form.religion.trim(),
      maritalStatus: form.maritalStatus.trim(),
      numberOfChildren: Number(form.numberOfChildren),
      numberOfSiblings: Number(form.numberOfSiblings),
      homeAddress: form.homeAddress.trim(),
      airportRepatriation: form.airportRepatriation.trim(),
      educationLevel: form.educationLevel.trim(),
      languageSkills,
      skillsPreferences,
      workAreas,
      employmentHistory,
      introduction,
      agencyContact,
      isPublic: form.isPublic,
      hasPhoto: form.hasPhoto,
    });
  };

  const textFields: Array<{ label: string; field: keyof MaidFormState; type?: string }> = [
    { label: "Full Name", field: "fullName" },
    { label: "Reference Code", field: "referenceCode" },
    { label: "Type", field: "type" },
    { label: "Nationality", field: "nationality" },
    { label: "Date of Birth", field: "dateOfBirth", type: "date" },
    { label: "Place of Birth", field: "placeOfBirth" },
    { label: "Height (cm)", field: "height", type: "number" },
    { label: "Weight (kg)", field: "weight", type: "number" },
    { label: "Religion", field: "religion" },
    { label: "Marital Status", field: "maritalStatus" },
    { label: "Number of Children", field: "numberOfChildren", type: "number" },
    { label: "Number of Siblings", field: "numberOfSiblings", type: "number" },
    { label: "Home Address", field: "homeAddress" },
    { label: "Airport Repatriation", field: "airportRepatriation" },
    { label: "Education Level", field: "educationLevel" },
  ];

  const jsonFields: Array<{ label: string; field: keyof MaidFormState; help: string }> = [
    { label: "Language Skills", field: "languageSkillsText", help: 'JSON object, e.g. {"English":"Good"}' },
    { label: "Skills Preferences", field: "skillsPreferencesText", help: "JSON object" },
    { label: "Work Areas", field: "workAreasText", help: "JSON object" },
    { label: "Employment History", field: "employmentHistoryText", help: 'JSON array, e.g. [{"from":"2022","to":"2024"}]' },
    { label: "Introduction", field: "introductionText", help: "JSON object" },
    { label: "Agency Contact", field: "agencyContactText", help: 'JSON object, e.g. {"companyName":"...","phone":"..."}' },
  ];

  return (
    <div className="page-container">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold">{title}</h2>
      </div>

      <form className="content-card animate-fade-in-up space-y-6" onSubmit={(event) => void handleSubmit(event)}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {textFields.map(({ label, field, type }) => (
            <div key={field} className="space-y-2">
              <Label>{label}</Label>
              <Input
                type={type ?? "text"}
                value={String(form[field])}
                onChange={(event) => handleChange(field, event.target.value)}
              />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isPublic}
              onChange={(event) => handleChange("isPublic", event.target.checked)}
            />
            Public profile
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.hasPhoto}
              onChange={(event) => handleChange("hasPhoto", event.target.checked)}
            />
            Has photo
          </label>
        </div>

        <div className="space-y-4">
          {jsonFields.map(({ label, field, help }) => (
            <div key={field} className="space-y-2">
              <Label>{label}</Label>
              <p className="text-xs text-muted-foreground">{help}</p>
              <textarea
                className="min-h-[140px] w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={String(form[field])}
                onChange={(event) => handleChange(field, event.target.value)}
              />
            </div>
          ))}
        </div>

        <div className="flex justify-center pt-2">
          <Button type="submit" className="px-8" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : mode === "create" ? "Create Maid" : "Update Maid"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default MaidForm;
