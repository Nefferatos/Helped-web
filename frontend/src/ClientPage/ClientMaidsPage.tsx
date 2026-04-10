import { useEffect, useMemo, useState } from "react";
import { Search, X, SlidersHorizontal, ChevronDown, ChevronUp } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/components/ui/sonner";
import { getClientAuthHeaders, getClientToken } from "@/lib/clientAuth";
import {
  calculateAge,
  getPrimaryPhoto,
  type MaidProfile,
} from "@/lib/maids";
import { filterMaids } from "@/lib/maidFilter";
import "./ClientTheme.css";

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface CompanyProfileApi {
  company_name?: string;
  short_name?: string;
}

interface CompanyResponse {
  companyProfile?: CompanyProfileApi;
}

const getAgencyName = (maid: MaidProfile, company: CompanyProfileApi | null) => {
  const agencyContact = maid.agencyContact as Record<string, unknown>;
  return String(agencyContact.companyName || company?.company_name || company?.short_name || "Agency");
};

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

const ITEMS_PER_PAGE = 12;

/* ─── Preference groups ──────────────────────────────────────────────────── */

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

/* ─── Active filter tag labels ───────────────────────────────────────────── */

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

/* ─── Small components ───────────────────────────────────────────────────── */

const CB = ({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) => (
  <label className="flex cursor-pointer items-center gap-2 select-none group">
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className="sr-only"
    />
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

/* ─── Main component ─────────────────────────────────────────────────────── */

const ClientMaidsPage = () => {
  const navigate = useNavigate();

  const [maids, setMaids] = useState<MaidProfile[]>([]);
  const [company, setCompany] = useState<CompanyProfileApi | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [draft, setDraft] = useState<Filters>(defaultFilters);
  const [hasSearched, setHasSearched] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(true);

  /* ── Count active filters ── */
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

  const hasLivePreview = useMemo(() => {
    for (const key of Object.keys(defaultFilters) as Array<keyof Filters>) {
      if (draft[key] !== defaultFilters[key]) return true;
    }
    return false;
  }, [draft]);

  const showResults = hasSearched || hasLivePreview;

  /* ── Active tags for display strip ── */
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

  /* ── Toggle / set helpers ── */
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

  const clearAllFilters = () => { setDraft(defaultFilters); setHasSearched(false); };

  const countGroup = (keys: readonly (keyof Filters)[]) => keys.filter((k) => draft[k] === true).length;

  /* ── Data loading ── */
  useEffect(() => {
    if (!getClientToken()) { navigate("/employer-login"); return; }
    const loadMaids = async () => {
      try {
        setIsLoading(true);
        const [maidsRes, companyRes] = await Promise.all([
          fetch("/api/maids?visibility=public", { headers: { ...getClientAuthHeaders() } }),
          fetch("/api/company"),
        ]);
        const maidData = await maidsRes.json();
        const companyData = (await companyRes.json()) as CompanyResponse;
        if (!maidsRes.ok || !maidData.maids) throw new Error(maidData.error || "Failed to load maids");
        setMaids(maidData.maids.filter((m: MaidProfile) => m.isPublic));
        setCompany(companyData.companyProfile ?? null);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load maids");
      } finally {
        setIsLoading(false);
      }
    };
    void loadMaids();
  }, [navigate]);

  /* ── Filtering ── */
  const filteredMaids = useMemo(() => filterMaids(maids, draft), [maids, draft]);
  useEffect(() => { setCurrentPage(1); }, [draft]);

  const totalPages = Math.ceil(filteredMaids.length / ITEMS_PER_PAGE);
  const pagedMaids = filteredMaids.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleSearch = () => { setCurrentPage(1); setHasSearched(true); setFiltersOpen(false); };

  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | "...")[] = [1];
    if (currentPage > 3) pages.push("...");
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push("...");
    pages.push(totalPages);
    return pages;
  }, [totalPages, currentPage]);

  /* ─────────────────────────────────────────────────────────────────────── */

  return (
    <div className="client-page-theme min-h-screen bg-background">
      <div className="mx-auto w-full max-w-5xl px-3 py-4 flex flex-col gap-4">

        {/* ══ FILTER PANEL ═════════════════════════════════════════════════ */}
        <Card className="overflow-hidden shadow-sm">
          <CardContent className="p-0">

            {/* ── Header bar ── */}
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

            {/* ── Active tags strip ── */}
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

            {/* ── Filter body ── */}
            {filtersOpen && (
              <div className="p-4 space-y-5">

                {/* Keyword search */}
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

                {/* Bio-data + Maid Type */}
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

                {/* Quick toggles */}
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

                {/* ── Checkbox grid ── */}
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

                {/* ── Action row ── */}
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
        {showResults && (
          <div>

            {/* Results bar */}
            <div className="mb-3 flex items-center justify-between flex-wrap gap-2">
              <p className="text-sm text-muted-foreground">
                {isLoading ? (
                  "Loading maid profiles…"
                ) : (
                  <>
                    <span className="font-semibold text-foreground">{filteredMaids.length}</span>
                    {" "}maid{filteredMaids.length !== 1 ? "s" : ""} found
                    {totalPages > 1 && <span> · Page {currentPage} of {totalPages}</span>}
                  </>
                )}
              </p>
              {!filtersOpen && (
                <button
                  type="button"
                  onClick={() => setFiltersOpen(true)}
                  className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                >
                  <SlidersHorizontal className="h-3 w-3" />
                  Edit Filters
                  {activeFilterCount > 0 && (
                    <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
              )}
            </div>

            {/* Skeleton loading */}
            {isLoading ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm animate-pulse">
                    <div className="aspect-[3/4] bg-muted" />
                    <div className="p-2.5 space-y-2">
                      <div className="h-2.5 w-3/4 rounded bg-muted" />
                      <div className="h-2 w-1/2 rounded bg-muted" />
                      <div className="h-6 w-full rounded bg-muted mt-3" />
                    </div>
                  </div>
                ))}
              </div>

            ) : filteredMaids.length === 0 ? (
              <div className="rounded-2xl border bg-muted/30 p-10 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <Search className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="font-semibold text-foreground">No maids found</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Try broadening your filters or clearing some criteria.
                </p>
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                    Clear all filters
                  </button>
                )}
              </div>

            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {pagedMaids.map((maid) => {
                  const age = calculateAge(maid.dateOfBirth);
                  const photo = getPrimaryPhoto(maid);
                  const typeLower = (maid.type || "").toLowerCase();
                  const typeColor = typeLower.includes("new")
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : typeLower.includes("transfer")
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : "bg-amber-50 text-amber-700 border-amber-200";

                  return (
                    <article
                      key={maid.referenceCode}
                      className="group flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
                    >
                      {/* Photo */}
                      <div className="aspect-[3/4] overflow-hidden bg-muted relative">
                        {photo ? (
                          <img
                            src={photo}
                            alt={maid.fullName}
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center flex-col gap-1 text-muted-foreground/50">
                            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                            </svg>
                            <span className="text-[9px]">No photo</span>
                          </div>
                        )}
                        {maid.type && (
                          <div className="absolute top-1.5 left-1.5 right-1.5">
                            <span className={`inline-block rounded-full px-1.5 py-px text-[9px] font-semibold border bg-white/90 backdrop-blur-sm ${typeColor}`}>
                              {maid.type}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex flex-col gap-1 p-2.5 flex-1">
                        <h3 className="text-xs font-semibold text-foreground line-clamp-1 leading-tight">
                          {maid.fullName}
                        </h3>
                        <p className="text-[10px] text-muted-foreground font-mono leading-tight">
                          {maid.referenceCode}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {maid.nationality && (
                            <span className="rounded-full bg-muted px-1.5 py-px text-[9px] text-muted-foreground border border-border/40">
                              {maid.nationality}
                            </span>
                          )}
                          {age && (
                            <span className="rounded-full bg-muted px-1.5 py-px text-[9px] text-muted-foreground border border-border/40">
                              {age} yrs
                            </span>
                          )}
                        </div>
                        <div className="mt-auto pt-2">
                          <Button size="sm" asChild className="h-7 w-full text-[10px] px-1 font-semibold">
                            <Link to={`/maids/${encodeURIComponent(maid.referenceCode)}`}>
                              View Profile
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-1 flex-wrap">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="rounded-lg border bg-card px-3 py-2 text-sm text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted transition-colors"
                >
                  ← Prev
                </button>
                {pageNumbers.map((page, idx) =>
                  page === "..." ? (
                    <span key={`e-${idx}`} className="px-2 py-2 text-sm text-muted-foreground select-none">…</span>
                  ) : (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page as number)}
                      className={`min-w-[2.25rem] rounded-lg border px-3 py-2 text-sm transition-colors ${
                        page === currentPage
                          ? "bg-primary text-primary-foreground border-primary font-semibold"
                          : "bg-card text-foreground hover:bg-muted"
                      }`}
                    >
                      {page}
                    </button>
                  )
                )}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded-lg border bg-card px-3 py-2 text-sm text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted transition-colors"
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default ClientMaidsPage;