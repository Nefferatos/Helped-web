import { useEffect, useMemo, useState } from "react";
import { Search, X, SlidersHorizontal, ChevronDown, ChevronUp } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getClientToken } from "@/lib/clientAuth";
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
  expTaiwan: false, expMiddleEast: false, expOtherCountries: false,
  expNoPreference: true,
  dutyCareInfant: false, dutyCareYoungChildren: false, dutyCareElderlyDisabled: false,
  dutyCooking: false, dutyGeneralHousekeeping: false,
  dutyNoPreference: true,
  eduCollege: false, eduHighSchool: false, eduSecondary: false, eduPrimary: false,
  eduNoPreference: true,
  langEnglish: false, langMandarin: false, langBahasaIndonesia: false, langHindi: false, langTamil: false,
  langNoPreference: true,
  age21to25: false, age26to30: false, age31to35: false, age36to40: false, age41above: false,
  ageNoPreference: true,
  marSingle: false, marMarried: false, marWidowed: false, marDivorced: false, marSeparated: false,
  marNoPreference: true,
  height150below: false, height151to155: false, height156to160: false, height161above: false,
  heightNoPreference: true,
  relFreeThinker: false, relChristian: false, relCatholic: false, relBuddhist: false,
  relMuslim: false, relHindu: false, relSikh: false, relOthers: false,
  relNoPreference: true,
};

const PREFERENCE_GROUPS = [
  { noPreference: "natNoPreference" as const, specifics: ["natFilipino","natIndonesian","natMyanmar","natIndian","natSriLankan","natCambodian","natBangladeshi","natOthers"] as const },
  { noPreference: "expNoPreference" as const, specifics: ["expHomeCountry","expSingapore","expMalaysia","expHongKong","expTaiwan","expMiddleEast","expOtherCountries"] as const },
  { noPreference: "dutyNoPreference" as const, specifics: ["dutyCareInfant","dutyCareYoungChildren","dutyCareElderlyDisabled","dutyCooking","dutyGeneralHousekeeping"] as const },
  { noPreference: "eduNoPreference" as const, specifics: ["eduCollege","eduHighSchool","eduSecondary","eduPrimary"] as const },
  { noPreference: "langNoPreference" as const, specifics: ["langEnglish","langMandarin","langBahasaIndonesia","langHindi","langTamil"] as const },
  { noPreference: "ageNoPreference" as const, specifics: ["age21to25","age26to30","age31to35","age36to40","age41above"] as const },
  { noPreference: "marNoPreference" as const, specifics: ["marSingle","marMarried","marWidowed","marDivorced","marSeparated"] as const },
  { noPreference: "heightNoPreference" as const, specifics: ["height150below","height151to155","height156to160","height161above"] as const },
  { noPreference: "relNoPreference" as const, specifics: ["relFreeThinker","relChristian","relCatholic","relBuddhist","relMuslim","relHindu","relSikh","relOthers"] as const },
];

const FILTER_LABELS: Partial<Record<keyof Filters, string>> = {
  natFilipino: "🇵🇭 Filipino", natIndonesian: "🇮🇩 Indonesian", natMyanmar: "🇲🇲 Myanmese",
  natIndian: "🇮🇳 Indian", natSriLankan: "🇱🇰 Sri Lankan", natCambodian: "🇰🇭 Cambodian",
  natBangladeshi: "🇧🇩 Bangladeshi", natOthers: "Other Nationality",
  expHomeCountry: "Exp: Home Country", expSingapore: "Exp: Singapore", expMalaysia: "Exp: Malaysia",
  expHongKong: "Exp: Hong Kong", expTaiwan: "Exp: Taiwan", expMiddleEast: "Exp: Middle East",
  expOtherCountries: "Exp: Others",
  dutyCareInfant: "Infant Care", dutyCareYoungChildren: "Young Children",
  dutyCareElderlyDisabled: "Elderly/Disabled", dutyCooking: "Cooking",
  dutyGeneralHousekeeping: "Housekeeping",
  eduCollege: "College/Degree", eduHighSchool: "High School",
  eduSecondary: "Secondary", eduPrimary: "Primary",
  langEnglish: "English", langMandarin: "Mandarin", langBahasaIndonesia: "Bahasa",
  langHindi: "Hindi", langTamil: "Tamil",
  age21to25: "Age 21–25", age26to30: "Age 26–30", age31to35: "Age 31–35",
  age36to40: "Age 36–40", age41above: "Age 41+",
  marSingle: "Single", marMarried: "Married", marWidowed: "Widowed",
  marDivorced: "Divorced", marSeparated: "Separated",
  height150below: "≤150cm", height151to155: "151–155cm",
  height156to160: "156–160cm", height161above: "≥161cm",
  relFreeThinker: "Free Thinker", relChristian: "Christian", relCatholic: "Catholic",
  relBuddhist: "Buddhist", relMuslim: "Muslim", relHindu: "Hindu", relSikh: "Sikh",
  relOthers: "Other Religion",
  willingOffDays: "Willing Off-days", hasChildren: "Has Children", withVideo: "With Video",
};

const parseDraftFromSearchParams = (searchParams: URLSearchParams): Filters | null => {
  const raw = searchParams.get("filters");
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<Filters>;
    if (!parsed || typeof parsed !== "object") return null;
    return {
      ...defaultFilters,
      ...parsed,
    };
  } catch {
    return null;
  }
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
    draft.natOthers ? "Others" : "",
  ].find(Boolean) || "";

const getSelectedEducationFromDraft = (draft: Filters) => {
  if (draft.eduCollege) return "College/Degree (>=12 yrs)";
  if (draft.eduHighSchool) return "Secondary (>=8 yrs)";
  if (draft.eduSecondary) return "Secondary (>=8 yrs)";
  if (draft.eduPrimary) return "Primary (<=6 yrs)";
  return "";
};

const getSelectedLanguageFromDraft = (draft: Filters) => {
  if (draft.langEnglish) return "English";
  if (draft.langMandarin) return "Mandarin";
  if (draft.langBahasaIndonesia) return "Malay";
  if (draft.langHindi) return "Hindi";
  if (draft.langTamil) return "Tamil";
  return "";
};

const getSelectedAgeFromDraft = (draft: Filters) => {
  if (draft.age21to25) return "21 to 25";
  if (draft.age26to30) return "26 to 30";
  if (draft.age31to35) return "31 to 35";
  if (draft.age36to40) return "36 to 40";
  if (draft.age41above) return "41 to 45";
  return "";
};

const CB = ({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) => (
  <label className="flex cursor-pointer items-center gap-2 select-none group">
    <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
    <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
      checked ? "bg-primary border-primary" : "border-border bg-background group-hover:border-primary/60"
    }`}>
      {checked && (
        <svg className="h-2.5 w-2.5 text-primary-foreground" fill="none" viewBox="0 0 12 12">
          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
    <span className={`text-sm leading-snug ${checked ? "text-gray-900 font-medium" : "text-gray-700 group-hover:text-gray-900"}`}>
      {label}
    </span>
  </label>
);

const SectionHead = ({ children, count }: { children: React.ReactNode; count?: number }) => (
  <div className="flex items-center justify-between mb-2.5">
    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-600">{children}</p>
    {count !== undefined && count > 0 && (
      <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
        {count}
      </span>
    )}
  </div>
);

const ClientMaidsPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialDraft = useMemo(() => parseDraftFromSearchParams(searchParams) ?? defaultFilters, [searchParams]);

  const [draft, setDraft] = useState<Filters>(initialDraft);
  const [filtersOpen, setFiltersOpen] = useState(true);

  useEffect(() => {
    const nextDraft = parseDraftFromSearchParams(searchParams);
    if (!nextDraft) return;
    setDraft(nextDraft);
  }, [searchParams]);

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

  const set = (key: keyof Filters, value: boolean | string) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const toggle = (key: keyof Filters) =>
    setDraft((prev) => {
      const nextValue = !prev[key];
      const group = PREFERENCE_GROUPS.find((g) => (g.specifics as readonly (keyof Filters)[]).includes(key));
      if (!group) return { ...prev, [key]: nextValue };
      const next = { ...prev, [key]: nextValue, [group.noPreference]: false };
      const allOff = (group.specifics as readonly (keyof Filters)[]).every((k) =>
        k === key ? !nextValue : !prev[k]
      );
      if (allOff) next[group.noPreference] = true;
      return next;
    });

  const removeTag = (key: keyof Filters) => {
    if (key === "keyword") return set("keyword", "");
    if (key === "maidType") return set("maidType", "");
    if (key === "biodataCreatedWithin") return set("biodataCreatedWithin", "No Preference");
    const group = PREFERENCE_GROUPS.find((g) => (g.specifics as readonly (keyof Filters)[]).includes(key));
    if (group) { toggle(key); } else { set(key, false); }
  };

  const clearAllFilters = () => { setDraft(defaultFilters); };

  const countGroup = (keys: readonly (keyof Filters)[]) => keys.filter((k) => draft[k] === true).length;

  useEffect(() => {
    if (!getClientToken()) { navigate("/employer-login"); return; }
  }, [navigate]);

  const handleSearch = () => {
    setFiltersOpen(false);

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

    navigate(`/client/maids/search?${nextSearchParams.toString()}`);
  };

  return (
    <div className="client-page-theme min-h-screen bg-background">
      <div className="mx-auto w-full max-w-5xl px-3 py-4 flex flex-col gap-4">

        {/* ══ FILTER PANEL ═════════════════════════════════════════════════ */}
        <Card className="overflow-hidden shadow-sm">
          <CardContent className="p-0">

            <div className="flex items-center justify-between gap-2 border-b bg-muted/30 px-4 py-3">
              <div className="flex items-center gap-2 min-w-0">
                <SlidersHorizontal className="h-4 w-4 shrink-0 text-gray-500" />
                <span className="font-semibold text-sm text-gray-900">Filters</span>
                {activeFilterCount > 0 && (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">
                    {activeFilterCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="flex items-center gap-1 rounded-md border border-destructive/40 bg-destructive/5 px-2.5 py-1 text-xs font-semibold text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <X className="h-3 w-3" />
                    Clear all
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setFiltersOpen((v) => !v)}
                  className="flex items-center gap-1 rounded-md border bg-background px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                >
                  {filtersOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  {filtersOpen ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {activeTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 border-b bg-primary/5 px-4 py-2.5">
                {activeTags.map(({ key, label }) => (
                  <span
                    key={key}
                    className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                  >
                    {label}
                    <button
                      type="button"
                      onClick={() => removeTag(key)}
                      className="ml-0.5 rounded-full hover:text-destructive transition-colors"
                      aria-label={`Remove ${label}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {filtersOpen && (
              <div className="p-4 space-y-5">

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-gray-600">
                    Search Keywords
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    <input
                      value={draft.keyword}
                      onChange={(e) => set("keyword", e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                      className="w-full rounded-lg border border-border bg-background pl-9 pr-9 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-colors"
                      placeholder="Name, ref code, nationality…"
                    />
                    {draft.keyword && (
                      <button
                        type="button"
                        onClick={() => set("keyword", "")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-gray-600">
                      Bio-data Created Within
                    </label>
                    <select
                      value={draft.biodataCreatedWithin}
                      onChange={(e) => set("biodataCreatedWithin", e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-colors"
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

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-gray-600">
                      Maid Type
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {(["New Maid", "Transfer Maid", "Ex-Singapore Maid"] as const).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => set("maidType", draft.maidType === type ? "" : type)}
                          className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                            draft.maidType === type
                              ? "bg-primary border-primary text-primary-foreground"
                              : "bg-background border-border text-gray-700 hover:border-primary/50 hover:text-gray-900"
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-gray-600">
                    Quick Filters
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {([
                      ["willingOffDays", "Willing Off-days"],
                      ["hasChildren", "Has Children"],
                      ["withVideo", "With Video"],
                    ] as [keyof Filters, string][]).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggle(key)}
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                          draft[key]
                            ? "bg-primary border-primary text-primary-foreground"
                            : "bg-background border-border text-gray-700 hover:border-primary/50 hover:text-gray-900"
                        }`}
                      >
                        {draft[key] && "✓ "}{label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-dashed border-border" />

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-5">

                  <div>
                    <SectionHead count={countGroup(["natFilipino","natIndonesian","natMyanmar","natIndian","natSriLankan","natCambodian","natBangladeshi","natOthers"])}>
                      Nationality
                    </SectionHead>
                    <div className="space-y-2">
                      <CB checked={draft.natFilipino} onChange={() => toggle("natFilipino")} label="Filipino" />
                      <CB checked={draft.natIndonesian} onChange={() => toggle("natIndonesian")} label="Indonesian" />
                      <CB checked={draft.natMyanmar} onChange={() => toggle("natMyanmar")} label="Myanmese" />
                      <CB checked={draft.natIndian} onChange={() => toggle("natIndian")} label="Indian" />
                      <CB checked={draft.natSriLankan} onChange={() => toggle("natSriLankan")} label="Sri Lankan" />
                      <CB checked={draft.natCambodian} onChange={() => toggle("natCambodian")} label="Cambodian" />
                      <CB checked={draft.natBangladeshi} onChange={() => toggle("natBangladeshi")} label="Bangladeshi" />
                      <CB checked={draft.natOthers} onChange={() => toggle("natOthers")} label="Others" />
                    </div>
                  </div>

                  <div>
                    <SectionHead count={countGroup(["expHomeCountry","expSingapore","expMalaysia","expHongKong","expTaiwan","expMiddleEast","expOtherCountries"])}>
                      Work Experience
                    </SectionHead>
                    <div className="space-y-2">
                      <CB checked={draft.expHomeCountry} onChange={() => toggle("expHomeCountry")} label="Home Country" />
                      <CB checked={draft.expSingapore} onChange={() => toggle("expSingapore")} label="Singapore" />
                      <CB checked={draft.expMalaysia} onChange={() => toggle("expMalaysia")} label="Malaysia" />
                      <CB checked={draft.expHongKong} onChange={() => toggle("expHongKong")} label="Hong Kong" />
                      <CB checked={draft.expTaiwan} onChange={() => toggle("expTaiwan")} label="Taiwan" />
                      <CB checked={draft.expMiddleEast} onChange={() => toggle("expMiddleEast")} label="Middle East" />
                      <CB checked={draft.expOtherCountries} onChange={() => toggle("expOtherCountries")} label="Other Countries" />
                    </div>
                  </div>

                  <div>
                    <SectionHead count={countGroup(["dutyCareInfant","dutyCareYoungChildren","dutyCareElderlyDisabled","dutyCooking","dutyGeneralHousekeeping"])}>
                      Duties
                    </SectionHead>
                    <div className="space-y-2">
                      <CB checked={draft.dutyCareInfant} onChange={() => toggle("dutyCareInfant")} label="Infant Care" />
                      <CB checked={draft.dutyCareYoungChildren} onChange={() => toggle("dutyCareYoungChildren")} label="Young Children" />
                      <CB checked={draft.dutyCareElderlyDisabled} onChange={() => toggle("dutyCareElderlyDisabled")} label="Elderly / Disabled" />
                      <CB checked={draft.dutyCooking} onChange={() => toggle("dutyCooking")} label="Cooking" />
                      <CB checked={draft.dutyGeneralHousekeeping} onChange={() => toggle("dutyGeneralHousekeeping")} label="Housekeeping" />
                    </div>
                  </div>

                  <div>
                    <SectionHead count={countGroup(["langEnglish","langMandarin","langBahasaIndonesia","langHindi","langTamil"])}>
                      Language
                    </SectionHead>
                    <div className="space-y-2">
                      <CB checked={draft.langEnglish} onChange={() => toggle("langEnglish")} label="English" />
                      <CB checked={draft.langMandarin} onChange={() => toggle("langMandarin")} label="Mandarin / Chinese" />
                      <CB checked={draft.langBahasaIndonesia} onChange={() => toggle("langBahasaIndonesia")} label="Bahasa Indonesia/Malay" />
                      <CB checked={draft.langHindi} onChange={() => toggle("langHindi")} label="Hindi" />
                      <CB checked={draft.langTamil} onChange={() => toggle("langTamil")} label="Tamil" />
                    </div>
                  </div>

                  <div>
                    <SectionHead count={countGroup(["age21to25","age26to30","age31to35","age36to40","age41above"])}>
                      Age Group
                    </SectionHead>
                    <div className="space-y-2">
                      <CB checked={draft.age21to25} onChange={() => toggle("age21to25")} label="21 – 25" />
                      <CB checked={draft.age26to30} onChange={() => toggle("age26to30")} label="26 – 30" />
                      <CB checked={draft.age31to35} onChange={() => toggle("age31to35")} label="31 – 35" />
                      <CB checked={draft.age36to40} onChange={() => toggle("age36to40")} label="36 – 40" />
                      <CB checked={draft.age41above} onChange={() => toggle("age41above")} label="41 and above" />
                    </div>
                  </div>

                  <div>
                    <SectionHead count={countGroup(["marSingle","marMarried","marWidowed","marDivorced","marSeparated"])}>
                      Marital Status
                    </SectionHead>
                    <div className="space-y-2">
                      <CB checked={draft.marSingle} onChange={() => toggle("marSingle")} label="Single" />
                      <CB checked={draft.marMarried} onChange={() => toggle("marMarried")} label="Married" />
                      <CB checked={draft.marWidowed} onChange={() => toggle("marWidowed")} label="Widowed" />
                      <CB checked={draft.marDivorced} onChange={() => toggle("marDivorced")} label="Divorced" />
                      <CB checked={draft.marSeparated} onChange={() => toggle("marSeparated")} label="Separated" />
                    </div>
                  </div>

                  <div>
                    <SectionHead count={countGroup(["eduCollege","eduHighSchool","eduSecondary","eduPrimary"])}>
                      Education
                    </SectionHead>
                    <div className="space-y-2">
                      <CB checked={draft.eduCollege} onChange={() => toggle("eduCollege")} label="College / Degree" />
                      <CB checked={draft.eduHighSchool} onChange={() => toggle("eduHighSchool")} label="High School" />
                      <CB checked={draft.eduSecondary} onChange={() => toggle("eduSecondary")} label="Secondary" />
                      <CB checked={draft.eduPrimary} onChange={() => toggle("eduPrimary")} label="Primary Level" />
                    </div>
                  </div>

                  <div>
                    <SectionHead count={countGroup(["height150below","height151to155","height156to160","height161above"])}>
                      Height (cm)
                    </SectionHead>
                    <div className="space-y-2">
                      <CB checked={draft.height150below} onChange={() => toggle("height150below")} label="150 and below" />
                      <CB checked={draft.height151to155} onChange={() => toggle("height151to155")} label="151 – 155" />
                      <CB checked={draft.height156to160} onChange={() => toggle("height156to160")} label="156 – 160" />
                      <CB checked={draft.height161above} onChange={() => toggle("height161above")} label="161 and above" />
                    </div>
                  </div>

                  <div>
                    <SectionHead count={countGroup(["relFreeThinker","relChristian","relCatholic","relBuddhist","relMuslim","relHindu","relSikh","relOthers"])}>
                      Religion
                    </SectionHead>
                    <div className="space-y-2">
                      <CB checked={draft.relFreeThinker} onChange={() => toggle("relFreeThinker")} label="Free Thinker" />
                      <CB checked={draft.relChristian} onChange={() => toggle("relChristian")} label="Christian" />
                      <CB checked={draft.relCatholic} onChange={() => toggle("relCatholic")} label="Catholic" />
                      <CB checked={draft.relBuddhist} onChange={() => toggle("relBuddhist")} label="Buddhist" />
                      <CB checked={draft.relMuslim} onChange={() => toggle("relMuslim")} label="Muslim" />
                      <CB checked={draft.relHindu} onChange={() => toggle("relHindu")} label="Hindu" />
                      <CB checked={draft.relSikh} onChange={() => toggle("relSikh")} label="Sikh" />
                      <CB checked={draft.relOthers} onChange={() => toggle("relOthers")} label="Others" />
                    </div>
                  </div>

                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
                  <Button
                    type="button"
                    className="flex-1 sm:flex-none sm:min-w-[160px] font-semibold"
                    onClick={handleSearch}
                  >
                    <Search className="mr-1.5 h-4 w-4" />
                    Search Maids
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 sm:flex-none"
                    onClick={() => navigate("/client/requests")}
                  >
                    Request a Maid
                  </Button>
                  {activeFilterCount > 0 && (
                    <button
                      type="button"
                      onClick={clearAllFilters}
                      className="flex items-center gap-1.5 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                      Clear Filters
                    </button>
                  )}
                </div>

              </div>
            )}
          </CardContent>
        </Card>

        {/* ══ RESULTS ══════════════════════════════════════════════════════ */}
      </div>
    </div>
  );
};

export default ClientMaidsPage;
