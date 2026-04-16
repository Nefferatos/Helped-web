import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronDown,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
  Users,
  CheckCircle2,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getClientToken, getStoredClient } from "@/lib/clientAuth";
import "./ClientTheme.css";

interface Filters {
  keyword: string;
  agencyPreference: string;
  biodataCreatedWithin: string;
  maidType: string;
  willingOffDays: boolean;
  hasChildren: boolean;
  withVideo: boolean;
  natFilipino: boolean;
  natIndonesian: boolean;
  natMyanmar: boolean;
  natIndian: boolean;
  natSriLankan: boolean;
  natCambodian: boolean;
  natBangladeshi: boolean;
  natOthers: boolean;
  natNoPreference: boolean;
  expHomeCountry: boolean;
  expSingapore: boolean;
  expMalaysia: boolean;
  expHongKong: boolean;
  expTaiwan: boolean;
  expMiddleEast: boolean;
  expOtherCountries: boolean;
  expNoPreference: boolean;
  dutyCareInfant: boolean;
  dutyCareYoungChildren: boolean;
  dutyCareElderlyDisabled: boolean;
  dutyCooking: boolean;
  dutyGeneralHousekeeping: boolean;
  dutyNoPreference: boolean;
  eduCollege: boolean;
  eduHighSchool: boolean;
  eduSecondary: boolean;
  eduPrimary: boolean;
  eduNoPreference: boolean;
  langEnglish: boolean;
  langMandarin: boolean;
  langBahasaIndonesia: boolean;
  langHindi: boolean;
  langTamil: boolean;
  langNoPreference: boolean;
  age21to25: boolean;
  age26to30: boolean;
  age31to35: boolean;
  age36to40: boolean;
  age41above: boolean;
  ageNoPreference: boolean;
  marSingle: boolean;
  marMarried: boolean;
  marWidowed: boolean;
  marDivorced: boolean;
  marSeparated: boolean;
  marNoPreference: boolean;
  height150below: boolean;
  height151to155: boolean;
  height156to160: boolean;
  height161above: boolean;
  heightNoPreference: boolean;
  relFreeThinker: boolean;
  relChristian: boolean;
  relCatholic: boolean;
  relBuddhist: boolean;
  relMuslim: boolean;
  relHindu: boolean;
  relSikh: boolean;
  relOthers: boolean;
  relNoPreference: boolean;
}

type RequirementsState = {
  noOffDay: boolean;
  hasChildren: boolean;
  married: boolean;
  newMaid: boolean;
  transferMaid: boolean;
  exSingaporeMaid: boolean;
};

const defaultFilters: Filters = {
  keyword: "",
  agencyPreference: "No Preference",
  biodataCreatedWithin: "No Preference",
  maidType: "",
  willingOffDays: false,
  hasChildren: false,
  withVideo: false,
  natFilipino: false, natIndonesian: false, natMyanmar: false, natIndian: false,
  natSriLankan: false, natCambodian: false, natBangladeshi: false, natOthers: false,
  natNoPreference: true,
  expHomeCountry: false, expSingapore: false, expMalaysia: false, expHongKong: false,
  expTaiwan: false, expMiddleEast: false, expOtherCountries: false, expNoPreference: true,
  dutyCareInfant: false, dutyCareYoungChildren: false, dutyCareElderlyDisabled: false,
  dutyCooking: false, dutyGeneralHousekeeping: false, dutyNoPreference: true,
  eduCollege: false, eduHighSchool: false, eduSecondary: false, eduPrimary: false,
  eduNoPreference: true,
  langEnglish: false, langMandarin: false, langBahasaIndonesia: false, langHindi: false,
  langTamil: false, langNoPreference: true,
  age21to25: false, age26to30: false, age31to35: false, age36to40: false,
  age41above: false, ageNoPreference: true,
  marSingle: false, marMarried: false, marWidowed: false, marDivorced: false,
  marSeparated: false, marNoPreference: true,
  height150below: false, height151to155: false, height156to160: false, height161above: false,
  heightNoPreference: true,
  relFreeThinker: false, relChristian: false, relCatholic: false, relBuddhist: false,
  relMuslim: false, relHindu: false, relSikh: false, relOthers: false, relNoPreference: true,
};

const defaultRequirements: RequirementsState = {
  noOffDay: false, hasChildren: false, married: false,
  newMaid: false, transferMaid: false, exSingaporeMaid: false,
};

const PREFERENCE_GROUPS = [
  { noPreference: "natNoPreference" as const, specifics: ["natFilipino", "natIndonesian", "natMyanmar", "natIndian", "natSriLankan", "natCambodian", "natBangladeshi", "natOthers"] as const },
  { noPreference: "expNoPreference" as const, specifics: ["expHomeCountry", "expSingapore", "expMalaysia", "expHongKong", "expTaiwan", "expMiddleEast", "expOtherCountries"] as const },
  { noPreference: "dutyNoPreference" as const, specifics: ["dutyCareInfant", "dutyCareYoungChildren", "dutyCareElderlyDisabled", "dutyCooking", "dutyGeneralHousekeeping"] as const },
  { noPreference: "eduNoPreference" as const, specifics: ["eduCollege", "eduHighSchool", "eduSecondary", "eduPrimary"] as const },
  { noPreference: "langNoPreference" as const, specifics: ["langEnglish", "langMandarin", "langBahasaIndonesia", "langHindi", "langTamil"] as const },
  { noPreference: "ageNoPreference" as const, specifics: ["age21to25", "age26to30", "age31to35", "age36to40", "age41above"] as const },
  { noPreference: "marNoPreference" as const, specifics: ["marSingle", "marMarried", "marWidowed", "marDivorced", "marSeparated"] as const },
  { noPreference: "heightNoPreference" as const, specifics: ["height150below", "height151to155", "height156to160", "height161above"] as const },
  { noPreference: "relNoPreference" as const, specifics: ["relFreeThinker", "relChristian", "relCatholic", "relBuddhist", "relMuslim", "relHindu", "relSikh", "relOthers"] as const },
];

const FILTER_LABELS: Partial<Record<keyof Filters, string>> = {
  natFilipino: "Filipino", natIndonesian: "Indonesian", natMyanmar: "Myanmar",
  natIndian: "Indian", natSriLankan: "Sri Lankan", natCambodian: "Cambodian",
  natBangladeshi: "Bangladeshi", natOthers: "Other nationality",
  expHomeCountry: "Home country", expSingapore: "Singapore", expMalaysia: "Malaysia",
  expHongKong: "Hong Kong", expTaiwan: "Taiwan", expMiddleEast: "Middle East",
  expOtherCountries: "Other countries",
  dutyCareInfant: "Infant care", dutyCareYoungChildren: "Young children",
  dutyCareElderlyDisabled: "Elderly / disabled", dutyCooking: "Cooking",
  dutyGeneralHousekeeping: "Housekeeping",
  eduCollege: "College / degree", eduHighSchool: "High school",
  eduSecondary: "Secondary", eduPrimary: "Primary level",
  langEnglish: "English", langMandarin: "Mandarin",
  langBahasaIndonesia: "Bahasa / Malay", langHindi: "Hindi", langTamil: "Tamil",
  age21to25: "21–25 yrs", age26to30: "26–30 yrs", age31to35: "31–35 yrs",
  age36to40: "36–40 yrs", age41above: "41+ yrs",
  marSingle: "Single", marMarried: "Married", marWidowed: "Widowed",
  marDivorced: "Divorced", marSeparated: "Separated",
  height150below: "≤150 cm", height151to155: "151–155 cm",
  height156to160: "156–160 cm", height161above: "161+ cm",
  relFreeThinker: "Free thinker", relChristian: "Christian", relCatholic: "Catholic",
  relBuddhist: "Buddhist", relMuslim: "Muslim", relHindu: "Hindu",
  relSikh: "Sikh", relOthers: "Other religion",
  willingOffDays: "Willing off-days", hasChildren: "Has children", withVideo: "With video",
};

const NATIONALITY_OPTIONS = ["No Preference", "Filipino", "Indonesian", "Indian", "Sri Lankan", "Myanmar", "Cambodian", "Bangladeshi", "Nepali"] as const;
const PRIMARY_DUTY_OPTIONS = ["No Preference", "Housekeeping", "Elderly Care", "Infant Care", "Kid Care", "Cooking", "Other"] as const;
const AGE_GROUP_OPTIONS = ["No Preference", "18–25", "26–35", "36–45", "46+"] as const;
const LANGUAGE_OPTIONS = ["No Preference", "English", "Mandarin", "Malay", "Tamil", "Tagalog", "Bahasa Indonesia"] as const;

const parseDraftFromSearchParams = (searchParams: URLSearchParams): Filters | null => {
  const raw = searchParams.get("filters");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<Filters>;
    if (!parsed || typeof parsed !== "object") return null;
    return { ...defaultFilters, ...parsed };
  } catch { return null; }
};

const getSelectedNationalityFromDraft = (draft: Filters) =>
  [
    draft.natFilipino ? "Filipino maid" : "",
    draft.natIndonesian ? "Indonesian maid" : "",
    draft.natMyanmar ? "Myanmar maid" : "",
    draft.natIndian ? "Indian maid" : "",
    draft.natSriLankan ? "Sri Lankan maid" : "",
    draft.natCambodian ? "Cambodian maid" : "",
    draft.natBangladeshi ? "Bangladeshi maid" : "",
    draft.natOthers ? "Other nationality" : "",
  ].find(Boolean) || "";

const getSelectedEducationFromDraft = (draft: Filters) => {
  if (draft.eduCollege) return "College / Degree";
  if (draft.eduHighSchool) return "High School";
  if (draft.eduSecondary) return "Secondary";
  if (draft.eduPrimary) return "Primary";
  return "";
};

const getSelectedLanguageFromDraft = (draft: Filters) => {
  if (draft.langEnglish) return "English";
  if (draft.langMandarin) return "Mandarin";
  if (draft.langBahasaIndonesia) return "Bahasa Indonesia";
  if (draft.langHindi) return "Hindi";
  if (draft.langTamil) return "Tamil";
  return "";
};

const getSelectedAgeFromDraft = (draft: Filters) => {
  if (draft.age21to25) return "21 to 25";
  if (draft.age26to30) return "26 to 30";
  if (draft.age31to35) return "31 to 35";
  if (draft.age36to40) return "36 to 40";
  if (draft.age41above) return "41 and above";
  return "";
};

const buildSearchParamsFromFilters = (draft: Filters) => {
  const nextSearchParams = new URLSearchParams();
  nextSearchParams.set("filters", JSON.stringify(draft));
  if (draft.keyword.trim()) nextSearchParams.set("q", draft.keyword.trim());
  if (draft.maidType.trim()) nextSearchParams.set("type", draft.maidType.trim());
  const activeNationality = getSelectedNationalityFromDraft(draft);
  if (activeNationality) nextSearchParams.set("nationality", activeNationality);
  const selectedEducation = getSelectedEducationFromDraft(draft);
  if (selectedEducation) nextSearchParams.set("education", selectedEducation);
  const selectedLanguage = getSelectedLanguageFromDraft(draft);
  if (selectedLanguage) nextSearchParams.set("language", selectedLanguage);
  const selectedAge = getSelectedAgeFromDraft(draft);
  if (selectedAge) nextSearchParams.set("age", selectedAge);
  if (draft.willingOffDays) nextSearchParams.set("offDays", "true");
  if (draft.withVideo) nextSearchParams.set("withVideo", "true");
  return nextSearchParams;
};

const getRequestHighlights = (draft: Filters) => {
  const items = [
    draft.maidType ? `Type: ${draft.maidType}` : "",
    getSelectedNationalityFromDraft(draft),
    draft.dutyCareInfant ? "Infant care" : "",
    draft.dutyCareYoungChildren ? "Young children" : "",
    draft.dutyCareElderlyDisabled ? "Elderly / disabled" : "",
    draft.dutyCooking ? "Cooking" : "",
    draft.dutyGeneralHousekeeping ? "Housekeeping" : "",
    getSelectedLanguageFromDraft(draft),
    getSelectedAgeFromDraft(draft),
    draft.withVideo ? "Video available" : "",
  ].filter(Boolean);
  return items.slice(0, 6);
};

// ── Pill chip (replaces basic checkbox) ──────────────────────────────────────
const Chip = ({
  label,
  checked,
  onChange,
  color = "primary",
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
  color?: "primary" | "green" | "blue" | "amber";
}) => {
  const activeStyle =
    color === "green"
      ? "border-emerald-500 bg-emerald-50 text-emerald-700"
      : color === "blue"
        ? "border-blue-500 bg-blue-50 text-blue-700"
        : color === "amber"
          ? "border-amber-500 bg-amber-50 text-amber-700"
          : "border-primary bg-primary/10 text-primary";

  return (
    <button
      type="button"
      onClick={onChange}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all select-none ${
        checked
          ? `${activeStyle} shadow-sm`
          : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground"
      }`}
    >
      {checked && <CheckCircle2 className="h-3 w-3 shrink-0" />}
      {label}
    </button>
  );
};

// ── Filter active tag ─────────────────────────────────────────────────────────
const FilterTag = ({ label, onRemove }: { label: string; onRemove: () => void }) => (
  <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/8 px-2.5 py-1 text-xs font-medium text-primary">
    {label}
    <button
      type="button"
      onClick={onRemove}
      className="ml-0.5 flex items-center justify-center rounded-full p-0.5 transition-colors hover:text-destructive"
      aria-label={`Remove ${label}`}
    >
      <X className="h-2.5 w-2.5" />
    </button>
  </span>
);

// ── Accordion filter section ─────────────────────────────────────────────────
const FilterSection = ({
  title,
  children,
  count,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  count?: number;
  defaultOpen?: boolean;
}) => {
  const [open, setOpen] = useState(defaultOpen || (count !== undefined && count > 0));

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between py-2 text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{title}</span>
          {count !== undefined && count > 0 && (
            <span className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
              {count}
            </span>
          )}
        </div>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <div className="flex flex-wrap gap-1.5 pb-2 pt-1">{children}</div>}
    </div>
  );
};

// ── Request Form ─────────────────────────────────────────────────────────────
interface RequestFormProps {
  prefillFilters: Filters;
  onBack: () => void;
}

const RequestForm = ({ prefillFilters, onBack }: RequestFormProps) => {
  const storedClient = useMemo(() => getStoredClient(), []);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const derivedNationality = (() => {
    if (prefillFilters.natFilipino) return "Filipino";
    if (prefillFilters.natIndonesian) return "Indonesian";
    if (prefillFilters.natIndian) return "Indian";
    if (prefillFilters.natSriLankan) return "Sri Lankan";
    if (prefillFilters.natMyanmar) return "Myanmar";
    if (prefillFilters.natCambodian) return "Cambodian";
    if (prefillFilters.natBangladeshi) return "Bangladeshi";
    return "No Preference";
  })();

  const derivedDuty = (() => {
    if (prefillFilters.dutyCareInfant) return "Infant Care";
    if (prefillFilters.dutyCareYoungChildren) return "Kid Care";
    if (prefillFilters.dutyCareElderlyDisabled) return "Elderly Care";
    if (prefillFilters.dutyCooking) return "Cooking";
    if (prefillFilters.dutyGeneralHousekeeping) return "Housekeeping";
    return "No Preference";
  })();

  const derivedAgeGroup = (() => {
    if (prefillFilters.age21to25) return "18–25";
    if (prefillFilters.age26to30 || prefillFilters.age31to35) return "26–35";
    if (prefillFilters.age36to40) return "36–45";
    if (prefillFilters.age41above) return "46+";
    return "No Preference";
  })();

  const derivedLanguage = (() => {
    if (prefillFilters.langEnglish) return "English";
    if (prefillFilters.langMandarin) return "Mandarin";
    if (prefillFilters.langBahasaIndonesia) return "Bahasa Indonesia";
    if (prefillFilters.langTamil) return "Tamil";
    return "No Preference";
  })();

  const [form, setForm] = useState({
    name: storedClient?.name || "",
    email: storedClient?.email || "",
    phone: storedClient?.phone || "",
    nationality: derivedNationality,
    primaryDuty: derivedDuty,
    ageGroup: derivedAgeGroup,
    language: derivedLanguage,
    otherRequirements: "",
  });

  const [requirements, setRequirements] = useState<RequirementsState>({
    ...defaultRequirements,
    hasChildren: prefillFilters.hasChildren,
    married: prefillFilters.marMarried,
    newMaid: prefillFilters.maidType === "New Maid",
    transferMaid: prefillFilters.maidType === "Transfer Maid",
    exSingaporeMaid: prefillFilters.maidType === "Ex-Singapore Maid",
  });

  const highlights = useMemo(() => getRequestHighlights(prefillFilters), [prefillFilters]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) {
      toast.error("Please fill in your name, email, and phone number.");
      return;
    }
    const requirementsList = [
      requirements.noOffDay ? "No Off-day" : null,
      requirements.hasChildren ? "Has child(ren)" : null,
      requirements.married ? "Married" : null,
      requirements.newMaid ? "New Maid" : null,
      requirements.transferMaid ? "Transfer Maid" : null,
      requirements.exSingaporeMaid ? "Ex-Singapore Maid" : null,
    ].filter(Boolean) as string[];

    try {
      setIsSubmitting(true);
      const payload = {
        referenceCode: "GENERAL",
        ...(storedClient?.id != null && { clientId: storedClient.id }),
        status: "pending",
        formData: {
          clientName: form.name.trim(),
          clientEmail: form.email.trim(),
          clientPhone: form.phone.trim(),
          nationality: form.nationality,
          primaryDuty: form.primaryDuty,
          ageGroup: form.ageGroup,
          language: form.language,
          ...(form.otherRequirements.trim() && { otherRequirements: form.otherRequirements.trim() }),
          ...(requirementsList.length > 0 && { requirements: requirementsList.join(", ") }),
        },
      };
      const response = await fetch("/api/direct-sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!response.ok) throw new Error(data.error || data.message || `Request failed (${response.status})`);
      toast.success("Your request has been sent to the agency!");
      setRequirements(defaultRequirements);
      setForm((prev) => ({ ...prev, nationality: derivedNationality, primaryDuty: derivedDuty, ageGroup: derivedAgeGroup, language: derivedLanguage, otherRequirements: "" }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectClass = "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground transition-colors focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20";

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b bg-muted/30 px-5 py-4">
        <div>
          <h2 className="text-base font-bold text-foreground">Request Agency Help</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Send your requirements and the agency will manually match suitable candidates.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={onBack}>
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
          Back
        </Button>
      </div>

      {highlights.length > 0 && (
        <div className="border-b bg-primary/5 px-5 py-3">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-primary">Pre-filled from your filters</p>
          <div className="flex flex-wrap gap-1.5">
            {highlights.map((item) => (
              <span key={item} className="rounded-full border border-primary/20 bg-background px-3 py-1 text-xs font-medium text-foreground">
                {item}
              </span>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6 p-5">
        <div>
          <p className="mb-3 text-sm font-semibold text-foreground">Your Contact Details</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <label className="text-sm font-medium text-foreground">Full Name <span className="text-destructive">*</span></label>
              <Input placeholder="e.g. Sarah Tan" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
            </div>
            <div className="grid gap-1.5">
              <label className="text-sm font-medium text-foreground">Email Address <span className="text-destructive">*</span></label>
              <Input type="email" placeholder="you@example.com" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} required />
            </div>
          </div>
          <div className="mt-4 grid gap-1.5">
            <label className="text-sm font-medium text-foreground">Phone Number <span className="text-destructive">*</span></label>
            <Input placeholder="e.g. +65 9123 4567" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} required />
          </div>
        </div>

        <div>
          <p className="mb-3 text-sm font-semibold text-foreground">Maid Preferences</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <label className="text-sm font-medium text-foreground">Nationality</label>
              <select className={selectClass} value={form.nationality} onChange={(e) => setForm((p) => ({ ...p, nationality: e.target.value }))}>
                {NATIONALITY_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div className="grid gap-1.5">
              <label className="text-sm font-medium text-foreground">Primary Duty</label>
              <select className={selectClass} value={form.primaryDuty} onChange={(e) => setForm((p) => ({ ...p, primaryDuty: e.target.value }))}>
                {PRIMARY_DUTY_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div className="grid gap-1.5">
              <label className="text-sm font-medium text-foreground">Age Group</label>
              <select className={selectClass} value={form.ageGroup} onChange={(e) => setForm((p) => ({ ...p, ageGroup: e.target.value }))}>
                {AGE_GROUP_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div className="grid gap-1.5">
              <label className="text-sm font-medium text-foreground">Language</label>
              <select className={selectClass} value={form.language} onChange={(e) => setForm((p) => ({ ...p, language: e.target.value }))}>
                {LANGUAGE_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div>
          <p className="mb-3 text-sm font-semibold text-foreground">Special Requirements</p>
          <div className="flex flex-wrap gap-2">
            {([
              { key: "noOffDay", label: "No Off-day" },
              { key: "hasChildren", label: "Has child(ren)" },
              { key: "married", label: "Maid is Married" },
              { key: "newMaid", label: "New Maid" },
              { key: "transferMaid", label: "Transfer Maid" },
              { key: "exSingaporeMaid", label: "Ex-Singapore Maid" },
            ] as { key: keyof RequirementsState; label: string }[]).map((item) => (
              <Chip
                key={item.key}
                label={item.label}
                checked={requirements[item.key]}
                onChange={() => setRequirements((p) => ({ ...p, [item.key]: !p[item.key] }))}
              />
            ))}
          </div>
        </div>

        <div className="grid gap-1.5">
          <label className="text-sm font-medium text-foreground">Additional Notes</label>
          <Textarea
            value={form.otherRequirements}
            onChange={(e) => setForm((p) => ({ ...p, otherRequirements: e.target.value }))}
            placeholder="Any specific requirements, household details, or special needs…"
            className="min-h-[88px] resize-none"
          />
        </div>

        <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onBack} className="sm:w-auto">Cancel</Button>
          <Button type="submit" size="lg" className="sm:min-w-[180px]" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                Submitting…
              </>
            ) : (
              "Submit Request"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const ClientMaidsPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestRef = useRef<HTMLDivElement | null>(null);
  const initialDraft = useMemo(() => parseDraftFromSearchParams(searchParams) ?? defaultFilters, [searchParams]);

  const [draft, setDraft] = useState<Filters>(initialDraft);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [requestOpen, setRequestOpen] = useState(searchParams.get("intent") === "request");
  const [searchedFilters, setSearchedFilters] = useState<Filters>(initialDraft);

  useEffect(() => {
    const nextDraft = parseDraftFromSearchParams(searchParams);
    if (nextDraft) { setDraft(nextDraft); setSearchedFilters(nextDraft); }
    setRequestOpen(searchParams.get("intent") === "request");
  }, [searchParams]);

  useEffect(() => {
    if (!requestOpen) return;
    requestRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [requestOpen]);

  useEffect(() => {
    if (!getClientToken()) navigate("/employer-login");
  }, [navigate]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (draft.keyword.trim()) count++;
    if (draft.maidType) count++;
    if (draft.biodataCreatedWithin !== "No Preference") count++;
    for (const key of Object.keys(FILTER_LABELS) as Array<keyof typeof FILTER_LABELS>) {
      if (draft[key] === true) count++;
    }
    return count;
  }, [draft]);

  const activeTags = useMemo(() => {
    const tags: { key: keyof Filters; label: string }[] = [];
    if (draft.keyword.trim()) tags.push({ key: "keyword", label: `"${draft.keyword.trim()}"` });
    if (draft.maidType) tags.push({ key: "maidType", label: `Type: ${draft.maidType}` });
    if (draft.biodataCreatedWithin !== "No Preference") tags.push({ key: "biodataCreatedWithin", label: `Within: ${draft.biodataCreatedWithin}` });
    for (const [key, label] of Object.entries(FILTER_LABELS) as [keyof Filters, string][]) {
      if (draft[key] === true) tags.push({ key, label });
    }
    return tags;
  }, [draft]);

  const requestHighlights = useMemo(() => getRequestHighlights(draft), [draft]);

  const set = (key: keyof Filters, value: boolean | string) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const toggle = (key: keyof Filters) =>
    setDraft((prev) => {
      const nextValue = !prev[key];
      const group = PREFERENCE_GROUPS.find((item) => (item.specifics as readonly (keyof Filters)[]).includes(key));
      if (!group) return { ...prev, [key]: nextValue };
      const next = { ...prev, [key]: nextValue, [group.noPreference]: false };
      const allOff = (group.specifics as readonly (keyof Filters)[]).every((groupKey) =>
        groupKey === key ? !nextValue : !prev[groupKey],
      );
      if (allOff) next[group.noPreference] = true;
      return next;
    });

  const countGroup = (keys: readonly (keyof Filters)[]) => keys.filter((key) => draft[key] === true).length;

  const syncPageState = (intent?: "request") => {
    const next = new URLSearchParams();
    next.set("filters", JSON.stringify(draft));
    if (intent) next.set("intent", intent);
    setSearchParams(next, { replace: true });
  };

  const removeTag = (key: keyof Filters) => {
    if (key === "keyword") { set("keyword", ""); return; }
    if (key === "maidType") { set("maidType", ""); return; }
    if (key === "biodataCreatedWithin") { set("biodataCreatedWithin", "No Preference"); return; }
    const group = PREFERENCE_GROUPS.find((item) => (item.specifics as readonly (keyof Filters)[]).includes(key));
    if (group) { toggle(key); return; }
    set(key, false);
  };

  const clearAllFilters = () => {
    setDraft(defaultFilters);
    setSearchedFilters(defaultFilters);
    if (requestOpen) {
      setSearchParams(new URLSearchParams([["intent", "request"], ["filters", JSON.stringify(defaultFilters)]]), { replace: true });
      return;
    }
    setSearchParams(new URLSearchParams([["filters", JSON.stringify(defaultFilters)]]), { replace: true });
  };

  const handleSearch = () => {
    setRequestOpen(false);
    setSearchedFilters(draft);
    navigate(`/client/maids/search?${buildSearchParamsFromFilters(draft).toString()}`);
  };

  const handleOpenRequest = () => {
    setSearchedFilters(draft);
    setRequestOpen(true);
    syncPageState("request");
  };

  const handleCloseRequest = () => {
    setRequestOpen(false);
    syncPageState();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="client-page-theme min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-5 sm:px-6 sm:py-7">

        {/* ── Hero Banner ── */}
        <div className="overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-muted/30 to-primary/5 shadow-sm">
          <div className="grid gap-5 p-5 sm:p-7 lg:grid-cols-[1fr_auto]">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1">
                <Users className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-semibold text-primary">Find Your Helper</span>
              </div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Search Maid Profiles
              </h1>
              <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
                Browse live profiles with filters, or let the agency shortlist the best matches for you.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {["Set filters", "Search profiles", "Request matching"].map((step, i) => (
                  <span key={i} className="flex items-center gap-1.5 rounded-full border border-border bg-background/80 px-3 py-1 text-xs font-medium text-foreground">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">{i + 1}</span>
                    {step}
                  </span>
                ))}
              </div>
            </div>

            <div className="min-w-[190px] rounded-xl border border-primary/15 bg-background/70 p-4 backdrop-blur lg:w-52">
              <div className="mb-2 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">Filter Summary</p>
              </div>
              {activeFilterCount > 0 ? (
                <>
                  <p className="text-sm font-medium text-primary">{activeFilterCount} filter{activeFilterCount !== 1 ? "s" : ""} active</p>
                  {requestHighlights.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {requestHighlights.slice(0, 3).map((item) => (
                        <span key={item} className="rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 text-[11px] font-medium text-foreground">{item}</span>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No filters applied yet</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Filter Panel ── */}
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          {/* Filter header */}
          <div className="flex items-center justify-between gap-2 border-b bg-muted/20 px-4 py-3">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">Filters</span>
              {activeFilterCount > 0 && (
                <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                  {activeFilterCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="flex items-center gap-1 rounded-lg border border-destructive/30 bg-destructive/5 px-2.5 py-1.5 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/10"
                >
                  <X className="h-3 w-3" />
                  Clear all
                </button>
              )}
              <button
                type="button"
                onClick={() => setFiltersOpen((v) => !v)}
                className="flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
              >
                <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${filtersOpen ? "rotate-180" : ""}`} />
                {filtersOpen ? "Collapse" : "Expand"}
              </button>
            </div>
          </div>

          {/* Active filter tags */}
          {activeTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 border-b bg-primary/5 px-4 py-2.5">
              {activeTags.map(({ key, label }) => (
                <FilterTag key={`${key}-${label}`} label={label} onRemove={() => removeTag(key)} />
              ))}
            </div>
          )}

          {filtersOpen && (
            <div className="space-y-0 divide-y divide-border/60 px-4 sm:px-5">

              {/* Keyword + quick toggles */}
              <div className="py-4 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Keyword Search</label>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      <input
                        value={draft.keyword}
                        onChange={(e) => set("keyword", e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                        className="w-full rounded-lg border border-border bg-background py-2.5 pl-9 pr-9 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                        placeholder="Name, reference code, nationality…"
                      />
                      {draft.keyword && (
                        <button type="button" onClick={() => set("keyword", "")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Profile Created Within</label>
                    <select
                      value={draft.biodataCreatedWithin}
                      onChange={(e) => set("biodataCreatedWithin", e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option>No Preference</option>
                      <option>1 week</option>
                      <option>2 weeks</option>
                      <option>1 month</option>
                      <option>3 months</option>
                      <option>6 months</option>
                      <option>1 year</option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Maid Type</label>
                    <div className="flex flex-wrap gap-1.5">
                      {(["New Maid", "Transfer Maid", "Ex-Singapore Maid"] as const).map((type) => (
                        <Chip
                          key={type}
                          label={type}
                          checked={draft.maidType === type}
                          onChange={() => set("maidType", draft.maidType === type ? "" : type)}
                          color={type === "New Maid" ? "green" : type === "Transfer Maid" ? "blue" : "amber"}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Quick Filters</label>
                    <div className="flex flex-wrap gap-1.5">
                      {([
                        ["willingOffDays", "Willing Off-days"],
                        ["hasChildren", "Has Children"],
                        ["withVideo", "Has Video"],
                      ] as [keyof Filters, string][]).map(([key, label]) => (
                        <Chip key={key} label={label} checked={!!draft[key]} onChange={() => toggle(key)} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Detailed filter accordions – 2 column grid on sm+ */}
              <div className="py-4">
                <p className="mb-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Detailed Preferences</p>
                <div className="grid grid-cols-1 gap-x-8 gap-y-1 divide-y divide-border/40 sm:grid-cols-2 sm:divide-y-0 [&>*]:border-b [&>*]:border-border/40 sm:[&>*]:border-b-0">

                  <FilterSection title="Nationality" count={countGroup(["natFilipino", "natIndonesian", "natMyanmar", "natIndian", "natSriLankan", "natCambodian", "natBangladeshi", "natOthers"])} defaultOpen>
                    {[
                      ["natFilipino", "Filipino"],
                      ["natIndonesian", "Indonesian"],
                      ["natMyanmar", "Myanmar"],
                      ["natIndian", "Indian"],
                      ["natSriLankan", "Sri Lankan"],
                      ["natCambodian", "Cambodian"],
                      ["natBangladeshi", "Bangladeshi"],
                      ["natOthers", "Others"],
                    ].map(([key, label]) => (
                      <Chip key={key} label={label} checked={!!draft[key as keyof Filters]} onChange={() => toggle(key as keyof Filters)} />
                    ))}
                  </FilterSection>

                  <FilterSection title="Work Experience" count={countGroup(["expHomeCountry", "expSingapore", "expMalaysia", "expHongKong", "expTaiwan", "expMiddleEast", "expOtherCountries"])} defaultOpen>
                    {[
                      ["expHomeCountry", "Home Country"],
                      ["expSingapore", "Singapore"],
                      ["expMalaysia", "Malaysia"],
                      ["expHongKong", "Hong Kong"],
                      ["expTaiwan", "Taiwan"],
                      ["expMiddleEast", "Middle East"],
                      ["expOtherCountries", "Others"],
                    ].map(([key, label]) => (
                      <Chip key={key} label={label} checked={!!draft[key as keyof Filters]} onChange={() => toggle(key as keyof Filters)} />
                    ))}
                  </FilterSection>

                  <FilterSection title="Duties" count={countGroup(["dutyCareInfant", "dutyCareYoungChildren", "dutyCareElderlyDisabled", "dutyCooking", "dutyGeneralHousekeeping"])}>
                    {[
                      ["dutyCareInfant", "Infant Care"],
                      ["dutyCareYoungChildren", "Young Children"],
                      ["dutyCareElderlyDisabled", "Elderly / Disabled"],
                      ["dutyCooking", "Cooking"],
                      ["dutyGeneralHousekeeping", "Housekeeping"],
                    ].map(([key, label]) => (
                      <Chip key={key} label={label} checked={!!draft[key as keyof Filters]} onChange={() => toggle(key as keyof Filters)} />
                    ))}
                  </FilterSection>

                  <FilterSection title="Language" count={countGroup(["langEnglish", "langMandarin", "langBahasaIndonesia", "langHindi", "langTamil"])}>
                    {[
                      ["langEnglish", "English"],
                      ["langMandarin", "Mandarin"],
                      ["langBahasaIndonesia", "Bahasa / Malay"],
                      ["langHindi", "Hindi"],
                      ["langTamil", "Tamil"],
                    ].map(([key, label]) => (
                      <Chip key={key} label={label} checked={!!draft[key as keyof Filters]} onChange={() => toggle(key as keyof Filters)} />
                    ))}
                  </FilterSection>

                  <FilterSection title="Age Group" count={countGroup(["age21to25", "age26to30", "age31to35", "age36to40", "age41above"])}>
                    {[
                      ["age21to25", "21–25"],
                      ["age26to30", "26–30"],
                      ["age31to35", "31–35"],
                      ["age36to40", "36–40"],
                      ["age41above", "41+"],
                    ].map(([key, label]) => (
                      <Chip key={key} label={label} checked={!!draft[key as keyof Filters]} onChange={() => toggle(key as keyof Filters)} />
                    ))}
                  </FilterSection>

                  <FilterSection title="Marital Status" count={countGroup(["marSingle", "marMarried", "marWidowed", "marDivorced", "marSeparated"])}>
                    {[
                      ["marSingle", "Single"],
                      ["marMarried", "Married"],
                      ["marWidowed", "Widowed"],
                      ["marDivorced", "Divorced"],
                      ["marSeparated", "Separated"],
                    ].map(([key, label]) => (
                      <Chip key={key} label={label} checked={!!draft[key as keyof Filters]} onChange={() => toggle(key as keyof Filters)} />
                    ))}
                  </FilterSection>

                  <FilterSection title="Education" count={countGroup(["eduCollege", "eduHighSchool", "eduSecondary", "eduPrimary"])}>
                    {[
                      ["eduCollege", "College / Degree"],
                      ["eduHighSchool", "High School"],
                      ["eduSecondary", "Secondary"],
                      ["eduPrimary", "Primary Level"],
                    ].map(([key, label]) => (
                      <Chip key={key} label={label} checked={!!draft[key as keyof Filters]} onChange={() => toggle(key as keyof Filters)} />
                    ))}
                  </FilterSection>

                  <FilterSection title="Height (cm)" count={countGroup(["height150below", "height151to155", "height156to160", "height161above"])}>
                    {[
                      ["height150below", "≤150 cm"],
                      ["height151to155", "151–155 cm"],
                      ["height156to160", "156–160 cm"],
                      ["height161above", "161+ cm"],
                    ].map(([key, label]) => (
                      <Chip key={key} label={label} checked={!!draft[key as keyof Filters]} onChange={() => toggle(key as keyof Filters)} />
                    ))}
                  </FilterSection>

                  <FilterSection title="Religion" count={countGroup(["relFreeThinker", "relChristian", "relCatholic", "relBuddhist", "relMuslim", "relHindu", "relSikh", "relOthers"])}>
                    {[
                      ["relFreeThinker", "Free Thinker"],
                      ["relChristian", "Christian"],
                      ["relCatholic", "Catholic"],
                      ["relBuddhist", "Buddhist"],
                      ["relMuslim", "Muslim"],
                      ["relHindu", "Hindu"],
                      ["relSikh", "Sikh"],
                      ["relOthers", "Others"],
                    ].map(([key, label]) => (
                      <Chip key={key} label={label} checked={!!draft[key as keyof Filters]} onChange={() => toggle(key as keyof Filters)} />
                    ))}
                  </FilterSection>

                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap items-center gap-2 py-4">
                <Button
                  type="button"
                  size="lg"
                  className="flex-1 font-semibold sm:flex-none sm:min-w-[160px]"
                  onClick={handleSearch}
                >
                  <Search className="mr-2 h-4 w-4" />
                  Search Maids
                  {activeFilterCount > 0 && (
                    <span className="ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary-foreground/20 px-1.5 text-[10px] font-bold">
                      {activeFilterCount}
                    </span>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="flex-1 sm:flex-none"
                  onClick={handleOpenRequest}
                >
                  Request Agency Help
                </Button>
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
                  >
                    <X className="h-3.5 w-3.5" />
                    Clear Filters
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Agency CTA (shown when request form is closed) ── */}
        {!requestOpen && (
          <div className="overflow-hidden rounded-2xl border border-dashed bg-card shadow-sm">
            <div className="grid gap-5 p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-primary">Prefer a personal touch?</p>
                <h2 className="mt-1.5 text-xl font-bold text-foreground">Let the agency shortlist for you.</h2>
                <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted-foreground">
                  Skip browsing one by one — send your requirements and get curated recommendations from the agency.
                </p>
              </div>
              <div className="shrink-0 rounded-xl border bg-muted/40 p-4 sm:w-52">
                <p className="text-sm text-muted-foreground">
                  {requestHighlights.length > 0
                    ? "Your filters will pre-fill the form."
                    : "You can send a general request without filters."}
                </p>
                <Button type="button" className="mt-3 w-full" onClick={handleOpenRequest}>
                  Open Request Form
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── Request Form ── */}
        {requestOpen && (
          <div ref={requestRef}>
            <RequestForm prefillFilters={searchedFilters} onBack={handleCloseRequest} />
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientMaidsPage;