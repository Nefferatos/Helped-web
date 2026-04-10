import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { defaultMaidProfile, type MaidProfile } from "@/lib/maids";
import { useNavigate } from "react-router-dom"; // NEW: redirect after final tab

const tabs = ["PROFILE", "SKILLS", "EMPLOYMENT HISTORY", "AVAILABILITY/REMARK", "INTRODUCTION", "PUBLIC INTRODUCTION", "PRIVATE INFO"];

const AddMaid = () => {
  const navigate = useNavigate(); // NEW
  const [activeTab, setActiveTab] = useState(0);
  const [formData, setFormData] = useState<MaidProfile>(defaultMaidProfile);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isManagePhotosOpen, setIsManagePhotosOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false); // NEW: confirmation modal state
  // Wizard state: prevents skipping forward unless saved
  const [maxUnlockedTab, setMaxUnlockedTab] = useState(0);
  // Ensures we only create (POST) once
  const [isCreated, setIsCreated] = useState(false);

  const fileToDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });

  const handleUploadPhoto = () => {
    setIsManagePhotosOpen(true);
  };

  const photos =
    Array.isArray(formData.photoDataUrls) && formData.photoDataUrls.length > 0
      ? formData.photoDataUrls
      : formData.photoDataUrl
      ? [formData.photoDataUrl]
      : [];
  const passportOrTwoByTwoPhoto = photos[0] ?? "";
  const fullBodyPhoto = photos[1] ?? "";
  const extraPhotos = photos.slice(2);

  const savePhotos = async (nextPhotos: string[]) => {
    const referenceCode = String(formData.referenceCode || "").trim();
    if (!referenceCode) {
      toast.error("Ref Code is required before uploading photos");
      return;
    }

    const cleaned = nextPhotos.filter(Boolean).slice(0, 5);
    const optimistic: MaidProfile = {
      ...formData,
      referenceCode,
      photoDataUrls: cleaned,
      photoDataUrl: cleaned[0] || "",
      hasPhoto: cleaned.length > 0,
    };

    try {
      setIsUploadingPhoto(true);
      setFormData(optimistic);

      const response = await fetch(`/api/maids/${encodeURIComponent(referenceCode)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(optimistic),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string; maid?: MaidProfile };
      if (!response.ok || !data.maid) {
        throw new Error(data.error || "Failed to upload photos (save the profile first)");
      }

      setFormData(data.maid);
      toast.success("Photos updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload photos");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const replacePhotoAt = async (index: number, file?: File) => {
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      const next = [...photos];
      next[index] = dataUrl;
      await savePhotos(next);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to read photo");
    }
  };

  const addExtraPhoto = async (file?: File) => {
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      await savePhotos([...photos, dataUrl]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to read photo");
    }
  };

  const removePhotoAt = async (index: number) => {
    await savePhotos(photos.filter((_, i) => i !== index));
  };

  // NEW: clicking Save opens confirmation modal (does not save immediately)
const handleSubmit = () => {
  if (isSaving) return;

  if (activeTab === tabs.length - 1) {
    setIsConfirmOpen(true); // only last tab
  } else {
    void performSave(); // skip dialog for other tabs
  }
};

  // NEW: actual save logic (POST/PUT) runs only after user confirms
  const performSave = async () => {
    if (isSaving) return;

    const payload: MaidProfile = {
      ...formData,
      fullName: String(formData.fullName || "").trim(),
      referenceCode: String(formData.referenceCode || "").trim(),
      type: String(formData.type || "").trim(),
      nationality: String(formData.nationality || "").trim(),
      placeOfBirth: String(formData.placeOfBirth || "").trim(),
    };

    if (!payload.fullName || !payload.referenceCode) {
      toast.error("Maid Name and Ref Code are required");
      return;
    }

    try {
      setIsSaving(true);

      // Save strategy: first tab creates once; subsequent saves update the same record.
      const shouldCreate = activeTab === 0 && !isCreated;
      const url = shouldCreate ? "/api/maids" : `/api/maids/${encodeURIComponent(payload.referenceCode)}`;
      const response = await fetch(url, {
        method: shouldCreate ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await response.json().catch(() => ({}))) as { error?: string; maid?: MaidProfile };
      if (!response.ok || !data.maid) {
        throw new Error(data.error || "Failed to save maid profile");
      }

      // Persist latest server copy
      setFormData(data.maid);

      // Mark created so we don't POST again from tab 0
      if (shouldCreate) setIsCreated(true);

      // Unlock next step only after a successful save
      setMaxUnlockedTab((prev) => Math.max(prev, Math.min(activeTab + 1, tabs.length - 1)));

      // Last step: stay put and finish message + label handled by props
      if (activeTab >= tabs.length - 1) {
        toast.success("Maid profile completed successfully"); // UPDATED message
        navigate("/agencyadmin/edit-maids");// NEW: redirect after final tab
        return;
      }

      // Step-by-step: move to next tab automatically
      toast.success(shouldCreate ? "Maid profile created" : "Maid profile saved");
      setActiveTab(activeTab + 1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save maid profile");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="page-container">
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-xl font-bold">Add Maid</h2>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 mb-6">
        {tabs.map((tab, i) => (
          <button
            key={tab}
            // Restrict forward navigation: can only go to unlocked steps; can always go back
            onClick={() => {
              if (i <= maxUnlockedTab) {
                setActiveTab(i);
                return;
              }
              toast.error("Please save & continue to unlock the next step");
            }}
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

      {/* Dynamic primary label for last step */}
      {/* UPDATED: Save button now opens confirm modal first */}
      {activeTab === 0 && <ProfileTab formData={formData} setFormData={setFormData} onSave={handleSubmit} isSaving={isSaving} onUploadPhoto={handleUploadPhoto} isUploadingPhoto={isUploadingPhoto} primaryLabel={activeTab >= tabs.length - 1 ? "Save & Finish" : "Save & Continue"} />}
      {activeTab === 1 && <SkillsTab formData={formData} setFormData={setFormData} onSave={handleSubmit} isSaving={isSaving} onUploadPhoto={handleUploadPhoto} isUploadingPhoto={isUploadingPhoto} primaryLabel={activeTab >= tabs.length - 1 ? "Save & Finish" : "Save & Continue"} />}
      {activeTab === 2 && <EmploymentHistoryTab formData={formData} setFormData={setFormData} onSave={handleSubmit} isSaving={isSaving} onUploadPhoto={handleUploadPhoto} isUploadingPhoto={isUploadingPhoto} primaryLabel={activeTab >= tabs.length - 1 ? "Save & Finish" : "Save & Continue"} />}
      {activeTab === 3 && <AvailabilityRemarkTab formData={formData} setFormData={setFormData} onSave={handleSubmit} isSaving={isSaving} onUploadPhoto={handleUploadPhoto} isUploadingPhoto={isUploadingPhoto} primaryLabel={activeTab >= tabs.length - 1 ? "Save & Finish" : "Save & Continue"} />}
      {activeTab === 4 && <IntroductionTab formData={formData} setFormData={setFormData} onSave={handleSubmit} isSaving={isSaving} onUploadPhoto={handleUploadPhoto} isUploadingPhoto={isUploadingPhoto} primaryLabel={activeTab >= tabs.length - 1 ? "Save & Finish" : "Save & Continue"} />}
      {activeTab === 5 && <PublicIntroductionTab formData={formData} setFormData={setFormData} onSave={handleSubmit} isSaving={isSaving} onUploadPhoto={handleUploadPhoto} isUploadingPhoto={isUploadingPhoto} primaryLabel={activeTab >= tabs.length - 1 ? "Save & Finish" : "Save & Continue"} />}
      {activeTab === 6 && <PrivateInfoTab formData={formData} setFormData={setFormData} onSave={handleSubmit} isSaving={isSaving} onUploadPhoto={handleUploadPhoto} isUploadingPhoto={isUploadingPhoto} primaryLabel={activeTab >= tabs.length - 1 ? "Save & Finish" : "Save & Continue"} />}

      {/* NEW: Confirmation dialog shown before POST/PUT */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Submission</DialogTitle>
            <DialogDescription>
              {activeTab >= tabs.length - 1
                ? "You are about to complete and submit this profile. Continue?"
                : "Are you sure you want to save this information and continue?"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsConfirmOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                setIsConfirmOpen(false); // close first, then save
                void performSave();
              }}
              disabled={isSaving}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isManagePhotosOpen} onOpenChange={setIsManagePhotosOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Manage Photos</DialogTitle>
            <DialogDescription>
              Slot 1: Passport/2x2, Slot 2: Full body, then up to 3 extra photos.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="space-y-3">
              <p className="text-sm font-semibold">Passport / 2x2</p>
              <div className="h-40 w-40 overflow-hidden rounded border bg-muted/30 flex items-center justify-center text-xs text-muted-foreground">
                {passportOrTwoByTwoPhoto ? (
                  <img src={passportOrTwoByTwoPhoto} alt="passport" className="h-full w-full object-cover" />
                ) : (
                  "No photo"
                )}
              </div>
              <input type="file" accept="image/*" disabled={isUploadingPhoto} onChange={(e) => void replacePhotoAt(0, e.target.files?.[0])} />
              <Button type="button" variant="outline" disabled={isUploadingPhoto || !passportOrTwoByTwoPhoto} onClick={() => void removePhotoAt(0)}>
                Remove
              </Button>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold">Full body</p>
              <div className="h-64 w-44 overflow-hidden rounded border bg-muted/30 flex items-center justify-center text-xs text-muted-foreground">
                {fullBodyPhoto ? (
                  <img src={fullBodyPhoto} alt="full body" className="h-full w-full object-cover" />
                ) : (
                  "No photo"
                )}
              </div>
              <input type="file" accept="image/*" disabled={isUploadingPhoto} onChange={(e) => void replacePhotoAt(1, e.target.files?.[0])} />
              <Button type="button" variant="outline" disabled={isUploadingPhoto || !fullBodyPhoto} onClick={() => void removePhotoAt(1)}>
                Remove
              </Button>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold">Extra photos ({extraPhotos.length}/3)</p>
              <div className="grid grid-cols-3 gap-2">
                {extraPhotos.map((photo, index) => (
                  <div key={`${photo}-${index}`} className="relative h-20 overflow-hidden rounded border bg-muted/30">
                    <img src={photo} alt={`extra ${index + 1}`} className="h-full w-full object-cover" />
                    <button
                      type="button"
                      className="absolute right-1 top-1 rounded bg-background/80 px-2 py-0.5 text-xs"
                      onClick={() => void removePhotoAt(index + 2)}
                      disabled={isUploadingPhoto}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <input type="file" accept="image/*" disabled={isUploadingPhoto || photos.length >= 5} onChange={(e) => void addExtraPhoto(e.target.files?.[0])} />
              <p className="text-xs text-muted-foreground">Max 5 total photos.</p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsManagePhotosOpen(false)} disabled={isUploadingPhoto}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

/* ─── Helper components ─── */

type TabSaveProps = {
  onSave?: () => void;
  isSaving?: boolean;
  onUploadPhoto?: () => void;
  isUploadingPhoto?: boolean;
  // Allows last step to show "Save & Finish" without changing layout
  primaryLabel?: string;
};

type FormTabProps = TabSaveProps & {
  formData: MaidProfile;
  setFormData: React.Dispatch<React.SetStateAction<MaidProfile>>;
};

const FormRow = ({ label, children }: { label: string; children: React.ReactNode; fullWidth?: boolean }) => (
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
  <div className="flex gap-4">
    {options.map((opt) => (
      <label key={opt} className="flex items-center gap-1 text-sm">
        <input
          type="radio"
          name={name}
          className="accent-primary"
          checked={value === opt}
          onChange={() => onValueChange?.(opt)}
        />
        {opt}
      </label>
    ))}
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
  <div className="flex gap-3">
    <label className="flex items-center gap-1 text-sm">
      <input
        type="radio"
        name={name}
        className="accent-primary"
        checked={value === true}
        onChange={() => onValueChange?.(true)}
      />{" "}
      Yes
    </label>
    <label className="flex items-center gap-1 text-sm">
      <input
        type="radio"
        name={name}
        className="accent-primary"
        checked={value === false}
        onChange={() => onValueChange?.(false)}
      />{" "}
      No
    </label>
  </div>
);

type SelectOption = string | { value: string; label: string; disabled?: boolean };

const SelectInput = ({
  options,
  className,
  value,
  onChange,
  name,
}: {
  options: SelectOption[];
  className?: string;
  value?: string;
  onChange?: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  name?: string;
}) => (
  <select
    name={name}
    value={value}
    onChange={onChange}
    className={`h-10 rounded-md border bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30 ${className || "w-full"}`}
  >
    {options.map((option) => {
      if (typeof option === "string") {
        return (
          <option key={option} value={option}>
            {option}
          </option>
        );
      }
      return (
        <option key={option.value} value={option.value} disabled={option.disabled}>
          {option.label}
        </option>
      );
    })}
  </select>
);

const StarRating = ({
  value,
  onChange,
  name,
}: {
  value: number | null;
  onChange: (next: number | null) => void;
  name: string;
}) => (
  <div className="flex items-center justify-center gap-1">
    <input type="hidden" name={name} value={value === null ? "" : String(value)} />
    {Array.from({ length: 5 }, (_, index) => {
      const starValue = index + 1;
      const active = value !== null && starValue <= value;
      return (
        <button
          key={starValue}
          type="button"
          className="p-1"
          onClick={() => onChange(value === starValue ? null : starValue)}
          aria-label={`Rate ${starValue} star${starValue === 1 ? "" : "s"}`}
        >
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

const SaveButtons = ({ onSave, isSaving, onUploadPhoto, isUploadingPhoto, primaryLabel }: TabSaveProps) => (
  <div className="flex justify-center gap-4 pt-6">
    <Button
      type="button"
      onClick={onSave}
      disabled={isSaving || isUploadingPhoto}
      className="bg-yellow-300 text-black px-4 py-2 rounded-lg font-semibold shadow-sm hover:bg-yellow-400"
    >
      {/* Wizard: last tab uses "Save & Finish" */}
      {primaryLabel || "Save & Continue"}
    </Button>
    <Button
      type="button"
      variant="outline"
      onClick={onUploadPhoto}
      disabled={isSaving || isUploadingPhoto}
    >
      Upload Photo
    </Button>
  </div>
);


const ProfileTab = ({ formData, setFormData, onSave, isSaving, onUploadPhoto, isUploadingPhoto }: FormTabProps) => {
  const currentYear = new Date().getFullYear();
  const years: SelectOption[] = [
    "--",
    ...Array.from({ length: currentYear + 10 - 1960 + 1 }, (_, i) => String(1960 + i)),
  ];
  const days: SelectOption[] = ["--", ...Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0"))];
  const months: SelectOption[] = ["--", ...Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"))];

  const agencyContact = (formData.agencyContact as Record<string, unknown>) || {};
  const introduction = (formData.introduction as Record<string, unknown>) || {};
  const skillsPreferences = (formData.skillsPreferences as Record<string, unknown>) || {};
  const otherInformation = (skillsPreferences.otherInformation as Record<string, boolean>) || {};
  const pastIllnesses = (introduction.pastIllnesses as Record<string, boolean>) || {};

  const dobMatch = String(formData.dateOfBirth || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const dobYear = dobMatch?.[1] ?? "--";
  const dobMonth = dobMatch?.[2] ?? "--";
  const dobDay = dobMatch?.[3] ?? "--";

  const contractMatch = String(introduction.contractEnds || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const contractYear = contractMatch?.[1] ?? "--";
  const contractMonth = contractMatch?.[2] ?? "--";
  const contractDay = contractMatch?.[3] ?? "--";

  const [dobDraft, setDobDraft] = useState(() => ({ day: dobDay, month: dobMonth, year: dobYear }));
  const [contractDraft, setContractDraft] = useState(() => ({ day: contractDay, month: contractMonth, year: contractYear }));

  useEffect(() => {
    setDobDraft({ day: dobDay, month: dobMonth, year: dobYear });
  }, [dobDay, dobMonth, dobYear]);

  useEffect(() => {
    setContractDraft({ day: contractDay, month: contractMonth, year: contractYear });
  }, [contractDay, contractMonth, contractYear]);

  const setIntroductionField = (key: string, value: unknown) =>
    setFormData((prev) => ({
      ...prev,
      introduction: {
        ...((prev.introduction as Record<string, unknown>) || {}),
        [key]: value,
      },
    }));

  const setSkillsPreferencesField = (key: string, value: unknown) =>
    setFormData((prev) => ({
      ...prev,
      skillsPreferences: {
        ...((prev.skillsPreferences as Record<string, unknown>) || {}),
        [key]: value,
      },
    }));

  const [newLanguageName, setNewLanguageName] = useState("");

  const fixedLanguages = [
    { label: "English", key: "English" },
    { label: "Mandarin/Chinese Dialect", key: "Mandarin/Chinese-Dialect" },
    { label: "Hindi", key: "Hindi" },
    { label: "Tamil", key: "Tamil" },
    { label: "Bahasa Indonesia/Malaysia", key: "Bahasa Indonesia/Malaysia" },
  ] as const;

  const extraLanguageKeys = Object.keys(formData.languageSkills || {}).filter(
    (key) => !fixedLanguages.some((item) => item.key === key),
  );

  const addLanguage = () => {
    const name = newLanguageName.trim();
    if (!name) return;
    setFormData((prev) => {
      const next = { ...(prev.languageSkills || {}) };
      if (next[name] !== undefined) {
        return prev;
      }
      next[name] = "";
      return { ...prev, languageSkills: next };
    });
    setNewLanguageName("");
  };

  const removeLanguage = (language: string) => {
    setFormData((prev) => {
      const next = { ...(prev.languageSkills || {}) };
      delete next[language];
      return { ...prev, languageSkills: next };
    });
  };

  return (
    <div className="content-card animate-fade-in-up space-y-6">
      <h3 className="text-center font-bold text-lg">(A) PROFILE OF FDW</h3>

      <div className="section-header bg-yellow-300 text-black px-4 py-2 rounded-lg font-semibold shadow-sm">A1. Personal Information</div>
      <div className="space-y-3 pt-2">
        <FormRow2Col
          left={<FormRow label="Maid Name:"><Input value={formData.fullName} onChange={(e) => setFormData((prev) => ({ ...prev, fullName: e.target.value }))} /></FormRow>}
          right={<FormRow label="Ref Code:"><Input value={formData.referenceCode} onChange={(e) => setFormData((prev) => ({ ...prev, referenceCode: e.target.value }))} /></FormRow>}
        />
        <FormRow2Col
          left={
            <FormRow label="Type:">
              <SelectInput
                value={formData.type}
                onChange={(e) => setFormData((prev) => ({ ...prev, type: e.target.value }))}
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
            </FormRow>
          }
          right={
            <FormRow label="Nationality:">
              <SelectInput
                value={formData.nationality}
                onChange={(e) => setFormData((prev) => ({ ...prev, nationality: e.target.value }))}
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
            </FormRow>
          }
        />
        <FormRow2Col
          left={<div />}
          right={
            <FormRow label="Indian Maid Category:">
              <SelectInput
                options={["Select", "Mizoram maid", "Darjeeling maid", "Manipur maid", "Punjabi maid", "Others"]}
                value={String(skillsPreferences.indianMaidCategory || "Select")}
                onChange={(e) => setSkillsPreferencesField("indianMaidCategory", e.target.value === "Select" ? "" : e.target.value)}
              />
            </FormRow>
          }
        />
        <FormRow2Col
          left={
            <FormRow label="Date of Birth:">
              <div className="flex gap-1">
                <SelectInput
                  options={days}
                  className="w-16"
                  value={dobDraft.day}
                  onChange={(e) => {
                    const nextDay = e.target.value;
                    const next = { ...dobDraft, day: nextDay };
                    setDobDraft(next);
                    if (next.day === "--" || next.month === "--" || next.year === "--") {
                      setFormData((prev) => ({ ...prev, dateOfBirth: "" }));
                      return;
                    }
                    setFormData((prev) => ({ ...prev, dateOfBirth: `${next.year}-${next.month}-${next.day}` }));
                  }}
                />
                <SelectInput
                  options={months}
                  className="w-16"
                  value={dobDraft.month}
                  onChange={(e) => {
                    const nextMonth = e.target.value;
                    const next = { ...dobDraft, month: nextMonth };
                    setDobDraft(next);
                    if (next.day === "--" || next.month === "--" || next.year === "--") {
                      setFormData((prev) => ({ ...prev, dateOfBirth: "" }));
                      return;
                    }
                    setFormData((prev) => ({ ...prev, dateOfBirth: `${next.year}-${next.month}-${next.day}` }));
                  }}
                />
                <SelectInput
                  options={years}
                  className="w-24"
                  value={dobDraft.year}
                  onChange={(e) => {
                    const nextYear = e.target.value;
                    const next = { ...dobDraft, year: nextYear };
                    setDobDraft(next);
                    if (next.day === "--" || next.month === "--" || next.year === "--") {
                      setFormData((prev) => ({ ...prev, dateOfBirth: "" }));
                      return;
                    }
                    setFormData((prev) => ({ ...prev, dateOfBirth: `${next.year}-${next.month}-${next.day}` }));
                  }}
                />
              </div>
            </FormRow>
          }
          right={<FormRow label="Place Of Birth:"><Input value={formData.placeOfBirth} onChange={(e) => setFormData((prev) => ({ ...prev, placeOfBirth: e.target.value }))} /></FormRow>}
        />
        <FormRow2Col
          left={
    <FormRow label="Height:">
      <SelectInput
        value={formData.height ? String(formData.height) : ""}
        onChange={(e) =>
          setFormData((prev) => ({
            ...prev,
            height: Number(e.target.value || 0),
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
        value={formData.weight ? String(formData.weight) : ""}
        onChange={(e) =>
          setFormData((prev) => ({
            ...prev,
            weight: Number(e.target.value || 0),
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
        

        <FormRow label="Residential Address in Home Country:"><Input value={formData.homeAddress} onChange={(e) => setFormData((prev) => ({ ...prev, homeAddress: e.target.value }))} /></FormRow>
        <FormRow label="Name of Port/Airport to be Repatriated:"><Input value={formData.airportRepatriation} onChange={(e) => setFormData((prev) => ({ ...prev, airportRepatriation: e.target.value }))} /></FormRow>
        <FormRow label="Contact Number in Home Country:">
          <Input
            value={String(agencyContact.homeCountryContactNumber || "")}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                agencyContact: {
                  ...((prev.agencyContact as Record<string, unknown>) || {}),
                  homeCountryContactNumber: e.target.value,
                },
              }))
            }
          />
        </FormRow>

        <FormRow2Col
          left={
            <FormRow label="Education:">
              <SelectInput
                options={[
                  { value: "", label: "Select Education", disabled: true },
                  "Primary Level(<=6 yrs)",
                  "Secondary Level(7~9 yrs)",
                  "High School(10~12 yrs)",
                  "Vocational Course",
                  "College/Degree (>=13 yrs)",
                ]}
                value={formData.educationLevel}
                onChange={(e) => setFormData((prev) => ({ ...prev, educationLevel: e.target.value }))}
              />
            </FormRow>
          }
          right={
            <FormRow label="Religion:">
              <SelectInput
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
                value={formData.religion}
                onChange={(e) => setFormData((prev) => ({ ...prev, religion: e.target.value }))}
              />
            </FormRow>
          }
        />
        <FormRow2Col
          left={
            <FormRow label="Number of Siblings:">
              <Input
                type="number"
                value={String(formData.numberOfSiblings ?? "")}
                onChange={(e) => setFormData((prev) => ({ ...prev, numberOfSiblings: Number(e.target.value || 0) }))}
              />
            </FormRow>
          }
          right={
            <FormRow label="Marital Status:">
              <SelectInput
                options={[
                  { value: "", label: "Select Marital Status", disabled: true },
                  "Single",
                  "Single Parent",
                  "Married",
                  "Divorced",
                  "Widowed",
                  "Separated",
                ]}
                value={formData.maritalStatus}
                onChange={(e) => setFormData((prev) => ({ ...prev, maritalStatus: e.target.value }))}
              />
            </FormRow>
          }
        />
        <FormRow2Col
          left={
            <FormRow label="Number of Children:">
              <SelectInput
                options={["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]}
                value={String(formData.numberOfChildren ?? 0)}
                onChange={(e) => setFormData((prev) => ({ ...prev, numberOfChildren: Number(e.target.value || 0) }))}
              />
            </FormRow>
          }
          right={
            <FormRow label="Ages of Children:">
              <Input value={String(introduction.agesOfChildren || "")} onChange={(e) => setIntroductionField("agesOfChildren", e.target.value)} />
            </FormRow>
          }
        />
        <FormRow2Col
          left={
            <FormRow label="Present Salary (S$):">
              <Input value={String(introduction.presentSalary || "")} onChange={(e) => setIntroductionField("presentSalary", e.target.value)} />
            </FormRow>
          }
          right={
            <FormRow label="Expected Salary:">
              <Input value={String(introduction.expectedSalary || "")} onChange={(e) => setIntroductionField("expectedSalary", e.target.value)} />
            </FormRow>
          }
        />
        <FormRow2Col
          left={
            <FormRow label="When will this maid be Available?">
              <Input value={String(introduction.availability || "")} onChange={(e) => setIntroductionField("availability", e.target.value)} />
            </FormRow>
          }
          right={
            <FormRow label="Contract Ends:">
              <div className="flex gap-1">
                <SelectInput
                  options={days}
                  className="w-16"
                  value={contractDraft.day}
                  onChange={(e) => {
                    const nextDay = e.target.value;
                    const next = { ...contractDraft, day: nextDay };
                    setContractDraft(next);
                    if (next.day === "--" || next.month === "--" || next.year === "--") {
                      setIntroductionField("contractEnds", "");
                      return;
                    }
                    setIntroductionField("contractEnds", `${next.year}-${next.month}-${next.day}`);
                  }}
                />
                <SelectInput
                  options={months}
                  className="w-16"
                  value={contractDraft.month}
                  onChange={(e) => {
                    const nextMonth = e.target.value;
                    const next = { ...contractDraft, month: nextMonth };
                    setContractDraft(next);
                    if (next.day === "--" || next.month === "--" || next.year === "--") {
                      setIntroductionField("contractEnds", "");
                      return;
                    }
                    setIntroductionField("contractEnds", `${next.year}-${next.month}-${next.day}`);
                  }}
                />
                <SelectInput
                  options={years}
                  className="w-24"
                  value={contractDraft.year}
                  onChange={(e) => {
                    const nextYear = e.target.value;
                    const next = { ...contractDraft, year: nextYear };
                    setContractDraft(next);
                    if (next.day === "--" || next.month === "--" || next.year === "--") {
                      setIntroductionField("contractEnds", "");
                      return;
                    }
                    setIntroductionField("contractEnds", `${next.year}-${next.month}-${next.day}`);
                  }}
                />
              </div>
            </FormRow>
          }
        />
        <FormRow2Col
          left={
            <FormRow label="Maid Loan (S$):">
              <Input value={String(introduction.maidLoan || "")} onChange={(e) => setIntroductionField("maidLoan", e.target.value)} />
            </FormRow>
          }
          right={
            <FormRow label="Offday Compensation (S$/day):">
              <Input value={String(introduction.offdayCompensation || "0")} onChange={(e) => setIntroductionField("offdayCompensation", e.target.value)} />
            </FormRow>
          }
        />
      </div>

      <div className="section-header bg-yellow-300 text-black px-4 py-2 rounded-lg font-semibold shadow-sm">Language Skills:</div>
      <div className="space-y-3 pt-2">
        {fixedLanguages.map((lang) => (
          <div key={lang.key} className="flex flex-col sm:flex-row sm:items-center gap-2">
            <Label className="text-sm w-52 text-right font-medium">{lang.label}:</Label>
            <RadioGroup
              name={`lang_${lang.key}`}
              options={["Zero", "Poor", "Little", "Fair", "Good"]}
              value={String((formData.languageSkills || {})[lang.key] || "")}
              onValueChange={(next) =>
                setFormData((prev) => ({
                  ...prev,
                  languageSkills: {
                    ...(prev.languageSkills || {}),
                    [lang.key]: next,
                  },
                }))
              }
            />
          </div>
        ))}

        {extraLanguageKeys.length > 0 && (
          <div className="space-y-2 pt-2">
            {extraLanguageKeys.map((lang) => (
              <div key={lang} className="flex flex-col sm:flex-row sm:items-center gap-2">
                <Label className="text-sm w-52 text-right font-medium">{lang}:</Label>
                <div className="flex flex-wrap items-center gap-3">
                  <RadioGroup
                    name={`lang_${lang}`}
                    options={["Zero", "Poor", "Little", "Fair", "Good"]}
                    value={String((formData.languageSkills || {})[lang] || "")}
                    onValueChange={(next) =>
                      setFormData((prev) => ({
                        ...prev,
                        languageSkills: {
                          ...(prev.languageSkills || {}),
                          [lang]: next,
                        },
                      }))
                    }
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => removeLanguage(lang)}>
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-2 pt-2 md:flex-row md:items-center">
          <Input value={newLanguageName} onChange={(e) => setNewLanguageName(e.target.value)} placeholder="Add other language (optional)" />
          <Button type="button" variant="outline" onClick={addLanguage} disabled={!newLanguageName.trim()}>
            Add
          </Button>
        </div>
      </div>

      <div className="section-header bg-yellow-300 text-black px-4 py-2 rounded-lg font-semibold shadow-sm">Other Information:</div>
      <div className="space-y-2 pt-2">
        {[
          "Able to handle pork?",
          "Able to eat pork?",
          "Able to care for dog/cat?",
          "Able to do simple sewing?",
          "Able to do gardening work?",
          "Willing to wash car?",
          "Willing to work on off-days with  compensation?",
        ].map((q) => (
          <div key={q} className="flex items-center gap-4">
            <span className="text-sm flex-1 text-right">{q}</span>
            <YesNo
              name={`other_${q}`}
              value={otherInformation[q]}
              onValueChange={(next) =>
                setFormData((prev) => {
                  const prevSkills = (prev.skillsPreferences as Record<string, unknown>) || {};
                  const prevOther = (prevSkills.otherInformation as Record<string, boolean>) || {};
                  return {
                    ...prev,
                    skillsPreferences: {
                      ...prevSkills,
                      otherInformation: {
                        ...prevOther,
                        [q]: next,
                      },
                    },
                  };
                })
              }
            />
          </div>
        ))}
        <div className="flex items-center gap-4">
          <span className="text-sm flex-1 text-right">Number of off-days per month</span>
          <div className="flex items-center gap-2">
            <Input className="w-20" value={String(skillsPreferences.offDaysPerMonth || "")} onChange={(e) => setSkillsPreferencesField("offDaysPerMonth", e.target.value)} />
            <span className="text-sm">rest day(s) per month.</span>
          </div>
        </div>
      </div>

      <div className="section-header bg-yellow-300 text-black px-4 py-2 rounded-lg font-semibold shadow-sm">A2. Medical History/Dietary Restrictions</div>
      <div className="space-y-3 pt-2">
        <FormRow label="Allergies (if any):"><Input value={String(introduction.allergies || "")} onChange={(e) => setIntroductionField("allergies", e.target.value)} /></FormRow>

        <p className="text-sm font-medium">Past and existing illnesses (including chronic ailments and illnesses requiring medication):</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
          {[
            ["(I) Mental illness", "illness_mental"],
            ["(II) Epilepsy", "illness_epilepsy"],
            ["(III) Asthma", "illness_asthma"],
            ["(IV) Diabetes", "illness_diabetes"],
            ["(V) Hypertension", "illness_hypertension"],
            ["(VI) Tuberculosis", "illness_tuberculosis"],
            ["(VII) Heart disease", "illness_heart"],
            ["(VIII) Malaria", "illness_malaria"],
            ["(IX) Operations", "illness_operations"],
          ].map(([label, name]) => (
            <div key={name} className="flex items-center gap-3">
              <span className="text-sm flex-1">{label}</span>
              <YesNo
                name={name}
                value={pastIllnesses[label]}
                onValueChange={(next) =>
                  setFormData((prev) => ({
                    ...prev,
                    introduction: {
                      ...((prev.introduction as Record<string, unknown>) || {}),
                      pastIllnesses: {
                        ...((((prev.introduction as Record<string, unknown>) || {}).pastIllnesses as Record<string, boolean>) || {}),
                        [label]: next,
                      },
                    },
                  }))
                }
              />
            </div>
          ))}
          <div className="flex items-center gap-3">
            <span className="text-sm flex-1">(X) Others:</span>
            <Input className="w-32" value={String(introduction.otherIllnesses || "")} onChange={(e) => setIntroductionField("otherIllnesses", e.target.value)} />
          </div>
        </div>

        <FormRow label="Physical disabilities:"><Input value={String(introduction.physicalDisabilities || "")} onChange={(e) => setIntroductionField("physicalDisabilities", e.target.value)} /></FormRow>
        <FormRow label="Dietary restrictions:"><Input value={String(introduction.dietaryRestrictions || "")} onChange={(e) => setIntroductionField("dietaryRestrictions", e.target.value)} /></FormRow>

        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-sm font-medium">Food handling preferences:</span>
          {(() => {
            const raw = String(introduction.foodHandlingPreferences || "");
            const parts = raw
              .split(",")
              .map((p) => p.trim())
              .filter(Boolean);
            const hasNoPork = parts.includes("No Pork");
            const hasNoBeef = parts.includes("No Beef");
            const other = parts.filter((p) => p !== "No Pork" && p !== "No Beef").join(", ");

            const setFoodPrefs = (nextNoPork: boolean, nextNoBeef: boolean, nextOther: string) => {
              const nextParts = [
                ...(nextNoPork ? ["No Pork"] : []),
                ...(nextNoBeef ? ["No Beef"] : []),
                ...(nextOther.trim() ? [nextOther.trim()] : []),
              ];
              setIntroductionField("foodHandlingPreferences", nextParts.join(", "));
            };

            return (
              <>
                <label className="flex items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    className="accent-primary"
                    checked={hasNoPork}
                    onChange={(e) => setFoodPrefs(e.target.checked, hasNoBeef, other)}
                  />{" "}
                  No Pork
                </label>
                <label className="flex items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    className="accent-primary"
                    checked={hasNoBeef}
                    onChange={(e) => setFoodPrefs(hasNoPork, e.target.checked, other)}
                  />{" "}
                  No Beef
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

      {/* A3. Others */}
      <div className="section-header bg-yellow-300 text-black px-4 py-2 rounded-lg font-semibold shadow-sm">A3. Others</div>
      <div className="pt-2">
        <FormRow label="Any other remarks:"><Input value={String(introduction.otherRemarks || "")} onChange={(e) => setIntroductionField("otherRemarks", e.target.value)} /></FormRow>
      </div>

      <SaveButtons onSave={onSave} isSaving={isSaving} onUploadPhoto={onUploadPhoto} isUploadingPhoto={isUploadingPhoto} />
    </div>
  );
};


const skillRows = [
  { no: 1, label: "Care of infants/children", sub: "Please specify age range:", subField: true },
  { no: 2, label: "Care of elderly" },
  { no: 3, label: "Care of disabled" },
  { no: 4, label: "General housework" },
  { no: 5, label: "Cooking", sub: "Please specify cuisines:", subField: true },
  { no: 6, label: "Language abilities (spoken)", sub: "Please specify:", subField: true },
  { no: 7, label: "Other skills, if any", sub: "Please specify:", subField: true },
];

const SkillsTab = ({ formData, setFormData, onSave, isSaving, onUploadPhoto, isUploadingPhoto }: FormTabProps) => {
  const workAreas = (formData.workAreas as Record<string, unknown>) || {};
  const skillsPreferences = (formData.skillsPreferences as Record<string, unknown>) || {};
  const workAreaNotes = (skillsPreferences.workAreaNotes as Record<string, string>) || {};

  const setWorkArea = (area: string, patch: Record<string, unknown>) =>
    setFormData((prev) => {
      const prevWorkAreas = (prev.workAreas as Record<string, unknown>) || {};
      const current = (prevWorkAreas[area] as Record<string, unknown>) || {};
      return {
        ...prev,
        workAreas: {
          ...prevWorkAreas,
          [area]: {
            ...current,
            ...patch,
          },
        },
      };
    });

  const setWorkAreaNote = (key: string, value: string) =>
    setFormData((prev) => {
      const prevSkills = (prev.skillsPreferences as Record<string, unknown>) || {};
      const prevNotes = (prevSkills.workAreaNotes as Record<string, string>) || {};
      return {
        ...prev,
        skillsPreferences: {
          ...prevSkills,
          workAreaNotes: {
            ...prevNotes,
            [key]: value,
          },
        },
      };
    });

  const buildEvaluation = (rating: number | null, note: string) => {
    const trimmed = note.trim();
    if (rating === null) return trimmed || "N.A.";
    return trimmed ? `${rating}/5 - ${trimmed}` : `${rating}/5`;
  };

  return (
    <div className="content-card animate-fade-in-up space-y-6">
      <h3 className="text-center font-bold text-lg">(B) MAID's SKILLS</h3>

      <div className="section-header bg-yellow-300 text-black px-4 py-2 rounded-lg font-semibold shadow-sm">B1. Method of Evaluation of Skills</div>
      <p className="text-sm pt-2">Please indicate the method(s) used to evaluate the FDW's skills (can tick more than one):</p>
      <div className="space-y-2 pl-2">
        {[
          "Based on FDW's declaration, no evaluation/observation by Singapore EA or overseas training centre/EA",
          "Interviewed by Singapore EA",
        ].map((opt) => (
          <label key={opt} className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="accent-primary mt-0.5" />
            {opt}
          </label>
        ))}
        <div className="pl-6 space-y-2">
          {[
            "Interviewed via telephone/teleconference",
            "Interviewed via videoconference",
            "Interviewed in person",
            "Interviewed in person and also made observation of FDW in the areas of work listed in table",
          ].map((opt) => (
            <label key={opt} className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="accent-primary mt-0.5" />
              {opt}
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
              <th className="border border-border px-2 py-2 text-center w-40">
                Experience<br />Yes/No<br />
                <span className="font-normal text-xs">If yes, state the no. of years</span>
              </th>
              <th className="border border-border px-2 py-2 text-center w-64">
                Assessment/Observation<br />
                <span className="font-normal text-xs">Click to rate (stars) and/or add notes (N.A. if none).</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {skillRows.map((row) => {
              const config = (workAreas[row.label] as Record<string, unknown>) || {};
              const willing = config.willing as boolean | undefined;
              const experience = config.experience as boolean | undefined;
              const yearsOfExperience = String(config.yearsOfExperience || "");
              const rating = typeof config.rating === "number" ? (config.rating as number) : null;
              const note = String(config.note || "");

              const subKey =
                row.label === "Other skills, if any"
                  ? "Other Skill"
                  : row.label;

              const updateEvaluation = (nextRating: number | null, nextNote: string) => {
                setWorkArea(row.label, {
                  rating: nextRating,
                  note: nextNote,
                  evaluation: buildEvaluation(nextRating, nextNote),
                });
              };

              return (
                <tr key={row.no}>
                  <td className="border border-border px-2 py-3 text-center align-top">{row.no}</td>
                  <td className="border border-border px-3 py-3 align-top">
                    <span className="font-bold">{row.label}</span>
                    {row.sub && (
                      <div className="mt-1">
                        <span className="text-xs">{row.sub}</span>
                        {row.subField && (
                          <Input
                            className="mt-1 w-48 h-7 text-xs"
                            value={String(workAreaNotes[subKey] || "")}
                            onChange={(e) => setWorkAreaNote(subKey, e.target.value)}
                          />
                        )}
                      </div>
                    )}
                  </td>
                  <td className="border border-border px-2 py-3 text-center align-top">
                    <YesNo
                      name={`will_${row.no}`}
                      value={willing}
                      onValueChange={(next) => setWorkArea(row.label, { willing: next })}
                    />
                  </td>
                  <td className="border border-border px-2 py-3 text-center align-top">
                    <div className="mb-2 flex items-center justify-center">
                      <YesNo
                        name={`exp_${row.no}`}
                        value={experience}
                        onValueChange={(next) =>
                          setWorkArea(row.label, {
                            experience: next,
                            yearsOfExperience: next ? String(config.yearsOfExperience || "") : "",
                          })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-center gap-1">
                      <Input
                        className="w-16 h-7 text-xs"
                        value={yearsOfExperience}
                        onChange={(e) => setWorkArea(row.label, { yearsOfExperience: e.target.value })}
                        disabled={experience !== true}
                      />
                      <span className="text-xs">(years)</span>
                    </div>
                  </td>
                  <td className="border border-border px-2 py-3 align-top">
                    <div className="mb-2">
                      <StarRating
                        name={`assess_${row.no}`}
                        value={rating}
                        onChange={(nextRating) => updateEvaluation(nextRating, note)}
                      />
                    </div>
                    <textarea
                      className="w-full min-h-[50px] rounded border bg-background px-2 py-1 text-xs"
                      value={note}
                      onChange={(e) => updateEvaluation(rating, e.target.value)}
                      placeholder="Notes (optional)"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <SaveButtons onSave={onSave} isSaving={isSaving} onUploadPhoto={onUploadPhoto} isUploadingPhoto={isUploadingPhoto} />
    </div>
  );
};


const EmploymentHistoryTab = ({ formData, setFormData, onSave, isSaving, onUploadPhoto, isUploadingPhoto }: FormTabProps) => {
  const years: SelectOption[] = ["--", ...Array.from({ length: 30 }, (_, i) => String(2000 + i))];
  const countries: SelectOption[] = ["--", "Singapore", "Hong Kong", "Taiwan", "Malaysia", "Saudi Arabia", "UAE", "Kuwait", "Bahrain", "Qatar", "Oman", "Jordan", "Lebanon", "Brunei", "Others"];

  const employment = Array.isArray(formData.employmentHistory) && formData.employmentHistory.length > 0 ? formData.employmentHistory : [{}];
  const skillsPreferences = (formData.skillsPreferences as Record<string, unknown>) || {};
  const sgExperience = typeof skillsPreferences.sgExperience === "boolean" ? skillsPreferences.sgExperience : undefined;

  const setEmployment = (next: Array<Record<string, unknown>>) =>
    setFormData((prev) => ({
      ...prev,
      employmentHistory: next,
    }));

  const updateEmployer = (index: number, key: string, value: unknown) => {
    const next = employment.map((row, i) => (i === index ? { ...(row as Record<string, unknown>), [key]: value } : row));
    setEmployment(next);
  };

  const addEmployer = () => setEmployment([...employment, {}]);
  const removeEmployer = (index: number) => setEmployment(employment.filter((_, i) => i !== index));

  return (
    <div className="content-card animate-fade-in-up space-y-6">
      <h3 className="text-center font-bold text-lg">(C) EMPLOYMENT HISTORY OF THE FDW</h3>

      <div className="section-header bg-yellow-300 text-black px-4 py-2 rounded-lg font-semibold shadow-sm">C1. Employment History</div>
      <div className="space-y-6 pt-2">
        {employment.map((row, idx) => {
          const r = row as Record<string, unknown>;
          return (
            <div key={idx} className="space-y-2 border p-4 rounded-xl">
              <div className="flex justify-between items-center">
                <Label className="form-label text-sm font-bold">Employer #{idx + 1}</Label>
                {employment.length > 1 && (
                  <button type="button" onClick={() => removeEmployer(idx)} className="text-red-500 text-xs">
                    Remove
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-2 items-start">
                <Label className="form-label text-xs sm:text-right pt-1">From Year</Label>
                <SelectInput options={years} className="w-48" value={String(r.from || "--")} onChange={(e) => updateEmployer(idx, "from", e.target.value === "--" ? "" : e.target.value)} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-2 items-start">
                <Label className="form-label text-xs sm:text-right pt-1">To Year</Label>
                <SelectInput options={years} className="w-48" value={String(r.to || "--")} onChange={(e) => updateEmployer(idx, "to", e.target.value === "--" ? "" : e.target.value)} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-2 items-start">
                <Label className="form-label text-xs sm:text-right pt-1">Country</Label>
                <SelectInput options={countries} className="w-48" value={String(r.country || "--")} onChange={(e) => updateEmployer(idx, "country", e.target.value === "--" ? "" : e.target.value)} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-2 items-start">
                <Label className="form-label text-xs sm:text-right pt-1">Employer&apos;s Name</Label>
                <Input className="max-w-md" value={String(r.employer || "")} onChange={(e) => updateEmployer(idx, "employer", e.target.value)} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-2 items-start">
                <Label className="form-label text-xs sm:text-right pt-1">Main Duties</Label>
                <textarea className="w-full max-w-md min-h-[60px] rounded-md border bg-background px-3 py-2 text-sm" value={String(r.duties || "")} onChange={(e) => updateEmployer(idx, "duties", e.target.value)} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-2 items-start">
                <Label className="form-label text-xs sm:text-right pt-1">Remarks</Label>
                <textarea className="w-full max-w-md min-h-[60px] rounded-md border bg-background px-3 py-2 text-sm" value={String(r.remarks || "")} onChange={(e) => updateEmployer(idx, "remarks", e.target.value)} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-center">
        <button type="button" onClick={addEmployer} className="px-4 py-2 bg-primary text-white rounded-lg text-sm">
          + Add Employer
        </button>
      </div>

      <div className="section-header bg-yellow-300 text-black px-4 py-2 rounded-lg font-semibold shadow-sm">C2. Employment History in Singapore</div>
      <div className="space-y-2 pt-2">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">
            Previous working experience in Singapore
          </span>
          <YesNo
            name="sg_experience"
            value={sgExperience}
            onValueChange={(next) =>
              setFormData((prev) => ({
                ...prev,
                skillsPreferences: {
                  ...((prev.skillsPreferences as Record<string, unknown>) || {}),
                  sgExperience: next,
                },
              }))
            }
          />
        </div>
        <p className="text-xs text-muted-foreground">
          (The EA is required to obtain the FDW&apos;s employment history from MOM and furnish the employer with the employment history of the FDW. The employer may also verify the FDW&apos;s employment history in Singapore through WPOL using SingPass)
        </p>
      </div>

      <div className="section-header bg-yellow-300 text-black px-4 py-2 rounded-lg font-semibold shadow-sm">
        C3. Feedback from previous employers in Singapore
      </div>
      <div className="space-y-3 pt-2">
        <p className="text-sm">
          If feedback was obtained by the EA from the previous employers,
          please indicate the feedback in the table below:
        </p>
        <FormRow label="Feedback from Singapore Employer 1:">
          <Input />
        </FormRow>
        <FormRow label="Feedback from Singapore Employer 2:">
          <Input />
        </FormRow>
      </div>

      <SaveButtons onSave={onSave} isSaving={isSaving} onUploadPhoto={onUploadPhoto} isUploadingPhoto={isUploadingPhoto} />
    </div>
  );
};


const AvailabilityRemarkTab = ({ formData, setFormData, onSave, isSaving, onUploadPhoto, isUploadingPhoto }: FormTabProps) => {
  const skillsPreferences = (formData.skillsPreferences as Record<string, unknown>) || {};
  const interviewOptions = (skillsPreferences.availabilityInterviewOptions as string[]) || [];
  const availabilityRemark = String(skillsPreferences.availabilityRemark || "");

  const toggleOption = (opt: string, checked: boolean) =>
    setFormData((prev) => {
      const prevSkills = (prev.skillsPreferences as Record<string, unknown>) || {};
      const current = (prevSkills.availabilityInterviewOptions as string[]) || [];
      const next = checked ? Array.from(new Set([...current, opt])) : current.filter((v) => v !== opt);
      return {
        ...prev,
        skillsPreferences: {
          ...prevSkills,
          availabilityInterviewOptions: next,
        },
      };
    });

  return (
    <div className="content-card animate-fade-in-up space-y-6">
      <h3 className="text-center font-bold text-lg">(D) MAID&apos;s AVAILABILITY and REMARK</h3>

      <div className="space-y-3">
        {[
          "FDW is not available for interview",
          "FDW can be interviewed by phone",
          "FDW can be interviewed by video-conference",
          "FDW can be interviewed in person",
        ].map((opt) => (
          <label key={opt} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="accent-primary"
              checked={interviewOptions.includes(opt)}
              onChange={(e) => toggleOption(opt, e.target.checked)}
            />
            {opt}
          </label>
        ))}
      </div>

      <h3 className="font-bold text-lg">(E) OTHER REMARKS</h3>
      <div className="grid grid-cols-1 sm:grid-cols-[220px_1fr] gap-2 items-start">
        <Label className="form-label text-sm font-bold sm:text-right pt-2">OTHER REMARKS:</Label>
        <textarea
          className="w-full min-h-[100px] rounded-md border bg-background px-3 py-2 text-sm"
          value={availabilityRemark}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              skillsPreferences: {
                ...((prev.skillsPreferences as Record<string, unknown>) || {}),
                availabilityRemark: e.target.value,
              },
            }))
          }
        />
      </div>

      <SaveButtons onSave={onSave} isSaving={isSaving} onUploadPhoto={onUploadPhoto} isUploadingPhoto={isUploadingPhoto} />
    </div>
  );
};


const IntroductionTab = ({ formData, setFormData, onSave, isSaving, onUploadPhoto, isUploadingPhoto }: FormTabProps) => {
  const introduction = (formData.introduction as Record<string, unknown>) || {};
  return (
    <div className="content-card animate-fade-in-up space-y-4">
      <h3 className="text-center font-bold text-lg">MAID&apos;s INTRODUCTION</h3>
      <p className="text-center text-sm text-muted-foreground">
        This Introduction will be hidden from public. Employers need to login to view this introduction.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-[220px_1fr] gap-2 items-start">
        <Label className="form-label text-sm font-bold sm:text-right pt-2">MAID INTRODUCTION:</Label>
        <textarea
          className="w-full min-h-[250px] rounded-md border bg-background px-3 py-2 text-sm"
          value={String(introduction.intro || "")}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              introduction: {
                ...((prev.introduction as Record<string, unknown>) || {}),
                intro: e.target.value,
              },
            }))
          }
        />
      </div>

      <SaveButtons onSave={onSave} isSaving={isSaving} onUploadPhoto={onUploadPhoto} isUploadingPhoto={isUploadingPhoto} />
    </div>
  );
};


const PublicIntroductionTab = ({ formData, setFormData, onSave, isSaving, onUploadPhoto, isUploadingPhoto }: FormTabProps) => {
  const introduction = (formData.introduction as Record<string, unknown>) || {};
  return (
    <div className="content-card animate-fade-in-up space-y-4">
      <h3 className="text-center font-bold text-lg">PUBLIC INTRODUCTION</h3>
      <p className="text-center text-sm text-muted-foreground">
        This is maid introduction for public, employers can view this without login.
      </p>

      <div className="text-sm space-y-2 border rounded-lg p-4 bg-muted/30">
        <p>
          EAs must comply with MOM&apos;s{" "}
          <a href="https://www.mom.gov.sg/employment-practices/employment-agencies/ealc" className="text-primary underline" target="_blank" rel="noopener noreferrer">
            EALC #17
          </a>{" "}
          and only disclose the following list of the FDW&apos;s personal information publicly: FDW Name, FDW Nationality, FDW skills and experience in said skills, Food handling preferences, Previous employment history (as stated in MOM&apos;s work permit application system), Language abilities.
        </p>
        <p>
          EAs must not cast FDWs in an insensitive and undignified light. This includes avoiding transactional terms that liken FDWs to commodities, e.g. &quot;condition new&quot;, &quot;chat to buy&quot;.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[220px_1fr] gap-2 items-start">
        <Label className="form-label text-sm font-bold sm:text-right pt-2">MAID INTRODUCTION:</Label>
        <textarea
          className="w-full min-h-[250px] rounded-md border bg-background px-3 py-2 text-sm"
          value={String(introduction.publicIntro || "")}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              introduction: {
                ...((prev.introduction as Record<string, unknown>) || {}),
                publicIntro: e.target.value,
              },
            }))
          }
        />
      </div>

      <SaveButtons onSave={onSave} isSaving={isSaving} onUploadPhoto={onUploadPhoto} isUploadingPhoto={isUploadingPhoto} />
    </div>
  );
};


const PrivateInfoTab = ({ formData, setFormData, onSave, isSaving, onUploadPhoto, isUploadingPhoto }: FormTabProps) => {
  const agencyContact = (formData.agencyContact as Record<string, unknown>) || {};
  const skillsPreferences = (formData.skillsPreferences as Record<string, unknown>) || {};

  return (
    <div className="content-card animate-fade-in-up space-y-4">
      <h3 className="text-center font-bold text-lg">MAID&apos;s PRIVATE INFORMATION</h3>

      <div className="space-y-3">
        <FormRow label="This maid was interviewed by:">
          <Input
            value={String(skillsPreferences.interviewedBy || "")}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                skillsPreferences: {
                  ...((prev.skillsPreferences as Record<string, unknown>) || {}),
                  interviewedBy: e.target.value,
                },
              }))
            }
          />
        </FormRow>
        <FormRow label="Who Referred This Maid?">
          <Input
            value={String(skillsPreferences.referredBy || "")}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                skillsPreferences: {
                  ...((prev.skillsPreferences as Record<string, unknown>) || {}),
                  referredBy: e.target.value,
                },
              }))
            }
          />
        </FormRow>
        <FormRow label="Passport Number of the Maid">
          <Input
            placeholder="e.g. R8833831 Expiry: 28/01/2028"
            value={String(agencyContact.passportNo || "")}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                agencyContact: {
                  ...((prev.agencyContact as Record<string, unknown>) || {}),
                  passportNo: e.target.value,
                },
              }))
            }
          />
        </FormRow>
        <FormRow label="Telephone Number of Maid/Foreign Agency">
          <div className="flex items-center gap-2">
            <Input
              value={String(agencyContact.phone || "")}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  agencyContact: {
                    ...((prev.agencyContact as Record<string, unknown>) || {}),
                    phone: e.target.value,
                  },
                }))
              }
            />
            <span className="text-sm text-muted-foreground whitespace-nowrap">WhatsApp</span>
          </div>
        </FormRow>

        <div className="grid grid-cols-1 sm:grid-cols-[220px_1fr] gap-2 items-start">
          <Label className="form-label text-sm sm:text-left pt-2">Agency&apos;s Historical Record <br></br> of the Maid</Label>
          <textarea
            className="w-full min-h-[200px] rounded-md border bg-background px-3 py-2 text-sm"
            value={String(skillsPreferences.privateInfo || "")}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                skillsPreferences: {
                  ...((prev.skillsPreferences as Record<string, unknown>) || {}),
                  privateInfo: e.target.value,
                },
              }))
            }
          />
        </div>
      </div>

      <SaveButtons onSave={onSave} isSaving={isSaving} onUploadPhoto={onUploadPhoto} isUploadingPhoto={isUploadingPhoto} />
    </div>
  );
};

export default AddMaid;
