import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminPath } from "@/lib/routes";
import type { MaidProfile } from "@/lib/maids";

const defaultLanguages = [
  "English",
  "Mandarin/Chinese-Dialect",
  "Bahasa Indonesia/Malaysia",
  "Hindi",
  "Tamil",
  "Malayalam",
  "Telegu",
  "Karnataka",
] as const;

const otherInformationQuestions = [
  "Able to handle pork?",
  "Able to eat pork?",
  "Able to care for dog/cat?",
  "Able to do simple sewing?",
  "Able to do gardening work?",
  "Willing to wash car?",
  "Can work on off-days with compensation?",
] as const;

const defaultWorkAreas = [
  "Care of infants/children",
  "Care of elderly",
  "Care of disabled",
  "General housework",
  "Cooking",
  "Language Skill",
  "Other Skill",
] as const;

const pastIllnessKeys = [
  "Mental illness",
  "Epilepsy",
  "Asthma",
  "Diabetes",
  "Hypertension",
  "Tuberculosis",
  "Heart disease",
  "Malaria",
  "Operations",
] as const;

type SkillsPreferencesForm = {
  availabilityRemark: string;
  privateInfo: string;
  offDaysPerMonth: string;
  otherInformation: Record<string, boolean>;
};

type WorkAreasForm = Record<string, { willing: boolean; experience: boolean; evaluation: string }>;

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
  noPork: boolean;
  noBeef: boolean;
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

const toStringRecord = (value: unknown) => {
  if (!value || typeof value !== "object") return {};
  const entries = Object.entries(value as Record<string, unknown>).filter(
    ([key, val]) => typeof key === "string" && typeof val === "string",
  );
  return Object.fromEntries(entries) as Record<string, string>;
};

const toBooleanRecord = (value: unknown) => {
  if (!value || typeof value !== "object") return {};
  const entries = Object.entries(value as Record<string, unknown>).filter(
    ([key, val]) => typeof key === "string" && typeof val === "boolean",
  );
  return Object.fromEntries(entries) as Record<string, boolean>;
};

const toSkillsPreferences = (value: unknown): SkillsPreferencesForm => {
  const obj = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const otherInformation = toBooleanRecord(obj.otherInformation);
  for (const question of otherInformationQuestions) {
    if (otherInformation[question] === undefined) otherInformation[question] = false;
  }

  return {
    availabilityRemark: typeof obj.availabilityRemark === "string" ? obj.availabilityRemark : "",
    privateInfo: typeof obj.privateInfo === "string" ? obj.privateInfo : "",
    offDaysPerMonth: typeof obj.offDaysPerMonth === "string" ? obj.offDaysPerMonth : "2",
    otherInformation,
  };
};

const toWorkAreas = (value: unknown): WorkAreasForm => {
  const result: WorkAreasForm = {};
  if (value && typeof value === "object") {
    for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
      if (!raw || typeof raw !== "object") continue;
      const item = raw as Record<string, unknown>;
      result[key] = {
        willing: Boolean(item.willing),
        experience: Boolean(item.experience),
        evaluation: typeof item.evaluation === "string" ? item.evaluation : "-",
      };
    }
  }

  for (const key of defaultWorkAreas) {
    if (!result[key]) {
      result[key] = { willing: false, experience: false, evaluation: "-" };
    }
  }

  return result;
};

const toEmploymentHistory = (value: unknown): EmploymentHistoryRow[] => {
  if (!Array.isArray(value)) {
    return [{ from: "", to: "", country: "", employer: "", duties: "", remarks: "" }];
  }

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
    noPork: Boolean(obj.noPork),
    noBeef: Boolean(obj.noBeef),
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

const EditMaid = () => {
  const { refCode } = useParams<{ refCode: string }>();
  const navigate = useNavigate();
  const [maid, setMaid] = useState<MaidProfile | null>(null);
  const [form, setForm] = useState<MaidProfileFormState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const extraLanguageKeys = useMemo(() => {
    if (!form) return [];
    return Object.keys(form.languageSkills).filter(
      (key) => !(defaultLanguages as readonly string[]).includes(key),
    );
  }, [form]);

  useEffect(() => {
    if (!refCode) return;

    const load = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/maids/${encodeURIComponent(refCode)}`);
        const data = (await response.json().catch(() => ({}))) as { error?: string; maid?: MaidProfile };
        if (!response.ok || !data.maid) {
          throw new Error(data.error || "Failed to load maid");
        }
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

  const setLanguageSkill = (language: string, level: string) => {
    const normalized = language.trim();
    if (!normalized) return;

    setForm((prev) => {
      if (!prev) return prev;
      const nextSkills = { ...prev.languageSkills };
      if (!level) {
        delete nextSkills[normalized];
      } else {
        nextSkills[normalized] = level;
      }
      return { ...prev, languageSkills: nextSkills };
    });
  };

  const removeLanguage = (language: string) => {
    setForm((prev) => {
      if (!prev) return prev;
      const nextSkills = { ...prev.languageSkills };
      delete nextSkills[language];
      return { ...prev, languageSkills: nextSkills };
    });
  };

  const addLanguage = () => {
    setForm((prev) => {
      if (!prev) return prev;
      const name = prev.newLanguageName.trim();
      if (!name) return prev;
      if (prev.languageSkills[name] !== undefined) {
        return { ...prev, newLanguageName: "" };
      }
      return {
        ...prev,
        languageSkills: { ...prev.languageSkills, [name]: "" },
        newLanguageName: "",
      };
    });
  };

  const saveMaid = async () => {
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string; maid?: MaidProfile };
      if (!response.ok || !data.maid) {
        throw new Error(data.error || "Failed to update maid");
      }
      setMaid(data.maid);
      setForm(buildFormState(data.maid));
      toast.success("Maid updated");
      navigate(adminPath(`/maid/${encodeURIComponent(data.maid.referenceCode)}`));
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

  const skillOptions = ["", "Poor", "Little", "Fair", "Good"];

  const updateEmploymentRow = (index: number, patch: Partial<EmploymentHistoryRow>) => {
    const next = [...form.employmentHistory];
    next[index] = { ...next[index], ...patch };
    setForm({ ...form, employmentHistory: next });
  };

  return (
    <div className="page-container">
      <form
        className="content-card animate-fade-in-up space-y-8"
        onSubmit={(e) => {
          e.preventDefault();
          void saveMaid();
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
          <h2 className="text-xl font-bold">Edit Maid Profile: {maid.referenceCode}</h2>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(adminPath(`/maid/${encodeURIComponent(maid.referenceCode)}`))}
            >
              Back to Profile
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>

        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground">Basic Info</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {[
              ["Full Name", "fullName"],
              ["Reference Code", "referenceCode"],
              ["Type", "type"],
              ["Nationality", "nationality"],
              ["Place of Birth", "placeOfBirth"],
              ["Religion", "religion"],
              ["Marital Status", "maritalStatus"],
              ["Education Level", "educationLevel"],
            ].map(([label, key]) => (
              <div key={key} className="space-y-2">
                <label className="text-sm font-medium">{label}</label>
                <Input
                  value={String((form as unknown as Record<string, unknown>)[key] ?? "")}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value } as MaidProfileFormState)}
                />
              </div>
            ))}

            <div className="space-y-2">
              <label className="text-sm font-medium">Date of Birth</label>
              <Input type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Height (cm)</label>
              <Input type="number" value={form.height} onChange={(e) => setForm({ ...form, height: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Weight (kg)</label>
              <Input type="number" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Number of Children</label>
              <Input type="number" value={form.numberOfChildren} onChange={(e) => setForm({ ...form, numberOfChildren: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Number of Siblings</label>
              <Input type="number" value={form.numberOfSiblings} onChange={(e) => setForm({ ...form, numberOfSiblings: e.target.value })} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Residential Address in Home Country</label>
              <Input value={form.homeAddress} onChange={(e) => setForm({ ...form, homeAddress: e.target.value })} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Airport / Port to be repatriated</label>
              <Input value={form.airportRepatriation} onChange={(e) => setForm({ ...form, airportRepatriation: e.target.value })} />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isPublic} onChange={(e) => setForm({ ...form, isPublic: e.target.checked })} />
            Public profile
          </label>
        </section>

        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground">Language Skills</h3>
            <p className="text-xs text-muted-foreground">Stored under `languageSkills`.</p>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {defaultLanguages.map((language) => (
              <div key={language} className="flex items-center justify-between gap-3 rounded-md border p-3">
                <p className="text-sm font-medium">{language}</p>
                <select
                  className="h-10 rounded-md border bg-background px-3 py-2 text-sm"
                  value={form.languageSkills[language] ?? ""}
                  onChange={(e) => setLanguageSkill(language, e.target.value)}
                >
                  {skillOptions.map((opt) => (
                    <option key={opt || "empty"} value={opt}>
                      {opt || "Select"}
                    </option>
                  ))}
                </select>
              </div>
            ))}

            {extraLanguageKeys.map((language) => (
              <div key={language} className="flex items-center justify-between gap-3 rounded-md border p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{language}</p>
                  <button type="button" className="text-xs text-destructive hover:underline" onClick={() => removeLanguage(language)} disabled={isSaving}>
                    Remove
                  </button>
                </div>
                <select
                  className="h-10 rounded-md border bg-background px-3 py-2 text-sm"
                  value={form.languageSkills[language] ?? ""}
                  onChange={(e) => setLanguageSkill(language, e.target.value)}
                >
                  {skillOptions.map((opt) => (
                    <option key={opt || "empty"} value={opt}>
                      {opt || "Select"}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <Input value={form.newLanguageName} onChange={(e) => setForm({ ...form, newLanguageName: e.target.value })} placeholder="Add other language (optional)" />
            <Button type="button" variant="outline" onClick={addLanguage} disabled={isSaving || !form.newLanguageName.trim()}>
              Add
            </Button>
          </div>
        </section>

        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground">Incoming / Preferences</h3>
            <p className="text-xs text-muted-foreground">Stored under `skillsPreferences`.</p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Off-days Per Month</label>
              <Input value={form.skillsPreferences.offDaysPerMonth} onChange={(e) => setForm({ ...form, skillsPreferences: { ...form.skillsPreferences, offDaysPerMonth: e.target.value } })} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Availability Remark</label>
              <Input value={form.skillsPreferences.availabilityRemark} onChange={(e) => setForm({ ...form, skillsPreferences: { ...form.skillsPreferences, availabilityRemark: e.target.value } })} />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Private Info</label>
            <textarea className="min-h-[120px] w-full rounded-md border bg-background px-3 py-2 text-sm" value={form.skillsPreferences.privateInfo} onChange={(e) => setForm({ ...form, skillsPreferences: { ...form.skillsPreferences, privateInfo: e.target.value } })} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Other Information</label>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {otherInformationQuestions.map((question) => (
                <label key={question} className="flex items-center gap-2 rounded-md border p-3 text-sm">
                  <input
                    type="checkbox"
                    checked={Boolean(form.skillsPreferences.otherInformation[question])}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        skillsPreferences: {
                          ...form.skillsPreferences,
                          otherInformation: {
                            ...form.skillsPreferences.otherInformation,
                            [question]: e.target.checked,
                          },
                        },
                      })
                    }
                  />
                  {question}
                </label>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground">Skills / Work Areas</h3>
            <p className="text-xs text-muted-foreground">Stored under `workAreas`.</p>
          </div>

          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-left">Area</th>
                  <th className="px-3 py-2 text-center w-28">Willing</th>
                  <th className="px-3 py-2 text-center w-32">Experience</th>
                  <th className="px-3 py-2 text-left w-40">Evaluation</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(form.workAreas).map(([area, value]) => (
                  <tr key={area} className="border-t">
                    <td className="px-3 py-2 font-medium">{area}</td>
                    <td className="px-3 py-2 text-center">
                      <input type="checkbox" checked={Boolean(value.willing)} onChange={(e) => setForm({ ...form, workAreas: { ...form.workAreas, [area]: { ...form.workAreas[area], willing: e.target.checked } } })} />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input type="checkbox" checked={Boolean(value.experience)} onChange={(e) => setForm({ ...form, workAreas: { ...form.workAreas, [area]: { ...form.workAreas[area], experience: e.target.checked } } })} />
                    </td>
                    <td className="px-3 py-2">
                      <Input value={value.evaluation} onChange={(e) => setForm({ ...form, workAreas: { ...form.workAreas, [area]: { ...form.workAreas[area], evaluation: e.target.value } } })} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground">Employment History</h3>
            <p className="text-xs text-muted-foreground">Stored under `employmentHistory`.</p>
          </div>

          <div className="space-y-4">
            {form.employmentHistory.map((row, index) => (
              <div key={index} className="rounded-md border p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold">Record #{index + 1}</p>
                  <Button type="button" variant="outline" disabled={isSaving || form.employmentHistory.length <= 1} onClick={() => setForm({ ...form, employmentHistory: form.employmentHistory.filter((_, i) => i !== index) })}>
                    Remove
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">From</label>
                    <Input value={row.from} onChange={(e) => updateEmploymentRow(index, { from: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">To</label>
                    <Input value={row.to} onChange={(e) => updateEmploymentRow(index, { to: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Country</label>
                    <Input value={row.country} onChange={(e) => updateEmploymentRow(index, { country: e.target.value })} />
                  </div>
                  <div className="space-y-1 md:col-span-3">
                    <label className="text-sm font-medium">Employer</label>
                    <Input value={row.employer} onChange={(e) => updateEmploymentRow(index, { employer: e.target.value })} />
                  </div>
                  <div className="space-y-1 md:col-span-3">
                    <label className="text-sm font-medium">Duties</label>
                    <textarea className="min-h-[80px] w-full rounded-md border bg-background px-3 py-2 text-sm" value={row.duties} onChange={(e) => updateEmploymentRow(index, { duties: e.target.value })} />
                  </div>
                  <div className="space-y-1 md:col-span-3">
                    <label className="text-sm font-medium">Remarks</label>
                    <textarea className="min-h-[80px] w-full rounded-md border bg-background px-3 py-2 text-sm" value={row.remarks} onChange={(e) => updateEmploymentRow(index, { remarks: e.target.value })} />
                  </div>
                </div>
              </div>
            ))}

            <Button type="button" variant="outline" disabled={isSaving} onClick={() => setForm({ ...form, employmentHistory: [...form.employmentHistory, { from: "", to: "", country: "", employer: "", duties: "", remarks: "" }] })}>
              Add Employment Record
            </Button>
          </div>
        </section>

        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground">Introduction & Medical</h3>
            <p className="text-xs text-muted-foreground">Stored under `introduction`.</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Intro (Private)</label>
            <textarea className="min-h-[140px] w-full rounded-md border bg-background px-3 py-2 text-sm" value={form.introduction.intro} onChange={(e) => setForm({ ...form, introduction: { ...form.introduction, intro: e.target.value } })} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Public Intro</label>
            <textarea className="min-h-[140px] w-full rounded-md border bg-background px-3 py-2 text-sm" value={form.introduction.publicIntro} onChange={(e) => setForm({ ...form, introduction: { ...form.introduction, publicIntro: e.target.value } })} />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {[
              ["Allergies", "allergies"],
              ["Physical Disabilities", "physicalDisabilities"],
              ["Dietary Restrictions", "dietaryRestrictions"],
              ["Food Handling Preferences", "foodHandlingPreferences"],
              ["Other Illnesses", "otherIllnesses"],
              ["Other Remarks", "otherRemarks"],
              ["Availability", "availability"],
              ["Contract Ends", "contractEnds"],
              ["Present Salary", "presentSalary"],
              ["Expected Salary", "expectedSalary"],
              ["Offday Compensation", "offdayCompensation"],
              ["Ages of Children", "agesOfChildren"],
              ["Maid Loan", "maidLoan"],
            ].map(([label, key]) => (
              <div key={key} className="space-y-1">
                <label className="text-sm font-medium">{label}</label>
                <Input value={String((form.introduction as Record<string, unknown>)[key] ?? "")} onChange={(e) => setForm({ ...form, introduction: { ...form.introduction, [key]: e.target.value } as IntroductionForm })} />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <label className="flex items-center gap-2 rounded-md border p-3 text-sm">
              <input type="checkbox" checked={form.introduction.noPork} onChange={(e) => setForm({ ...form, introduction: { ...form.introduction, noPork: e.target.checked } })} />
              No Pork
            </label>
            <label className="flex items-center gap-2 rounded-md border p-3 text-sm">
              <input type="checkbox" checked={form.introduction.noBeef} onChange={(e) => setForm({ ...form, introduction: { ...form.introduction, noBeef: e.target.checked } })} />
              No Beef
            </label>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Past Illnesses</label>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              {pastIllnessKeys.map((key) => (
                <label key={key} className="flex items-center gap-2 rounded-md border p-3 text-sm">
                  <input
                    type="checkbox"
                    checked={Boolean(form.introduction.pastIllnesses[key])}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        introduction: {
                          ...form.introduction,
                          pastIllnesses: { ...form.introduction.pastIllnesses, [key]: e.target.checked },
                        },
                      })
                    }
                  />
                  {key}
                </label>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground">Agency Contact</h3>
            <p className="text-xs text-muted-foreground">Stored under `agencyContact`.</p>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {[
              ["Company Name", "companyName"],
              ["License No.", "licenseNo"],
              ["Contact Person", "contactPerson"],
              ["Phone", "phone"],
              ["Passport No.", "passportNo"],
              ["Home Country Contact Number", "homeCountryContactNumber"],
            ].map(([label, key]) => (
              <div key={key} className="space-y-1">
                <label className="text-sm font-medium">{label}</label>
                <Input value={String((form.agencyContact as Record<string, unknown>)[key] ?? "")} onChange={(e) => setForm({ ...form, agencyContact: { ...form.agencyContact, [key]: e.target.value } as AgencyContactForm })} />
              </div>
            ))}
          </div>
        </section>

        <div className="flex justify-center pt-2">
          <Button type="submit" className="px-8" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default EditMaid;
