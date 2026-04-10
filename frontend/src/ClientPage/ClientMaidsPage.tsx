import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/components/ui/sonner";
import { getClientAuthHeaders, getClientToken } from "@/lib/clientAuth";
import {
  calculateAge,
  getPrimaryPhoto,
  getPublicIntro,
  type MaidProfile,
} from "@/lib/maids";
import { filterMaids } from "@/lib/maidFilter";
import "./ClientTheme.css";

interface CompanyProfileApi {
  company_name?: string;
  short_name?: string;
}

interface CompanyResponse {
  companyProfile?: CompanyProfileApi;
}

const getAgencyName = (
  maid: MaidProfile,
  company: CompanyProfileApi | null
) => {
  const agencyContact = maid.agencyContact as Record<string, unknown>;
  return String(
    agencyContact.companyName ||
      company?.company_name ||
      company?.short_name ||
      "Agency"
  );
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
  natFilipino: false,
  natIndonesian: false,
  natMyanmar: false,
  natIndian: false,
  natSriLankan: false,
  natCambodian: false,
  natBangladeshi: false,
  natOthers: false,
  natNoPreference: true,
  expHomeCountry: false,
  expSingapore: false,
  expMalaysia: false,
  expHongKong: false,
  expTaiwan: false,
  expMiddleEast: false,
  expOtherCountries: false,
  expNoPreference: true,
  dutyCareInfant: false,
  dutyCareYoungChildren: false,
  dutyCareElderlyDisabled: false,
  dutyCooking: false,
  dutyGeneralHousekeeping: false,
  dutyNoPreference: true,
  eduCollege: false,
  eduHighSchool: false,
  eduSecondary: false,
  eduPrimary: false,
  eduNoPreference: true,
  langEnglish: false,
  langMandarin: false,
  langBahasaIndonesia: false,
  langHindi: false,
  langTamil: false,
  langNoPreference: true,
  age21to25: false,
  age26to30: false,
  age31to35: false,
  age36to40: false,
  age41above: false,
  ageNoPreference: true,
  marSingle: false,
  marMarried: false,
  marWidowed: false,
  marDivorced: false,
  marSeparated: false,
  marNoPreference: true,
  height150below: false,
  height151to155: false,
  height156to160: false,
  height161above: false,
  heightNoPreference: true,
  relFreeThinker: false,
  relChristian: false,
  relCatholic: false,
  relBuddhist: false,
  relMuslim: false,
  relHindu: false,
  relSikh: false,
  relOthers: false,
  relNoPreference: true,
};

const normalizeNationality = (raw?: string) => {
  const v = String(raw || "").trim().toLowerCase();
  if (!v) return "others";
  if (v.includes("filip") || v.includes("philipp")) return "filipino";
  if (v.includes("indo")) return "indonesian";
  if (v.includes("myan") || v.includes("burm")) return "myanmar";
  if (v.includes("indian") || v === "india") return "indian";
  if (v.includes("sri") || v.includes("lanka")) return "srilanka";
  if (v.includes("cambod") || v.includes("khmer")) return "cambodian";
  if (v.includes("bangla")) return "bangladeshi";
  return "others";
};

const ITEMS_PER_PAGE = 12;

const CB = ({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) => (
  <label className="flex cursor-pointer items-start gap-1.5 select-none font-body text-sm text-foreground leading-snug">
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className="mt-0.5 h-3.5 w-3.5 accent-primary cursor-pointer shrink-0"
    />
    <span>{label}</span>
  </label>
);

const SectionHead = ({ children }: { children: React.ReactNode }) => (
  <p className="mb-2 font-body text-sm font-semibold text-foreground border-b border-border pb-1">
    {children}
  </p>
);

const ClientMaidsPage = () => {
  const navigate = useNavigate();

  const [maids, setMaids] = useState<MaidProfile[]>([]);
  const [company, setCompany] = useState<CompanyProfileApi | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const [draft, setDraft] = useState<Filters>(defaultFilters);
  const [submitted, setSubmitted] = useState<Filters>(defaultFilters);
  const [hasSearched, setHasSearched] = useState(false);
  const [formOpen, setFormOpen] = useState(true);

  const hasLivePreview = useMemo(() => {
    for (const key of Object.keys(defaultFilters) as Array<keyof Filters>) {
      if (draft[key] !== defaultFilters[key]) return true;
    }
    return false;
  }, [draft]);

  const showResults = hasSearched || hasLivePreview;

  const preferenceGroups = useMemo(
    () => [
      {
        noPreference: "natNoPreference" as const,
        specifics: [
          "natFilipino",
          "natIndonesian",
          "natMyanmar",
          "natIndian",
          "natSriLankan",
          "natCambodian",
          "natBangladeshi",
          "natOthers",
        ] as const,
      },
      {
        noPreference: "expNoPreference" as const,
        specifics: [
          "expHomeCountry",
          "expSingapore",
          "expMalaysia",
          "expHongKong",
          "expTaiwan",
          "expMiddleEast",
          "expOtherCountries",
        ] as const,
      },
      {
        noPreference: "dutyNoPreference" as const,
        specifics: [
          "dutyCareInfant",
          "dutyCareYoungChildren",
          "dutyCareElderlyDisabled",
          "dutyCooking",
          "dutyGeneralHousekeeping",
        ] as const,
      },
      {
        noPreference: "eduNoPreference" as const,
        specifics: ["eduCollege", "eduHighSchool", "eduSecondary", "eduPrimary"] as const,
      },
      {
        noPreference: "langNoPreference" as const,
        specifics: ["langEnglish", "langMandarin", "langBahasaIndonesia", "langHindi", "langTamil"] as const,
      },
      {
        noPreference: "ageNoPreference" as const,
        specifics: ["age21to25", "age26to30", "age31to35", "age36to40", "age41above"] as const,
      },
      {
        noPreference: "marNoPreference" as const,
        specifics: ["marSingle", "marMarried", "marWidowed", "marDivorced", "marSeparated"] as const,
      },
      {
        noPreference: "heightNoPreference" as const,
        specifics: ["height150below", "height151to155", "height156to160", "height161above"] as const,
      },
      {
        noPreference: "relNoPreference" as const,
        specifics: [
          "relFreeThinker",
          "relChristian",
          "relCatholic",
          "relBuddhist",
          "relMuslim",
          "relHindu",
          "relSikh",
          "relOthers",
        ] as const,
      },
    ],
    []
  );

  const set = (key: keyof Filters, value: boolean | string) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const toggle = (key: keyof Filters) =>
    setDraft((prev) => {
      const nextValue = !prev[key];

      const group = preferenceGroups.find((g) =>
        (g.specifics as readonly (keyof Filters)[]).includes(key)
      );
      if (!group) return { ...prev, [key]: nextValue };

      const next = { ...prev, [key]: nextValue, [group.noPreference]: false };
      const allOff = (group.specifics as readonly (keyof Filters)[]).every((k) => {
        if (k === key) return !nextValue;
        return !prev[k];
      });
      if (allOff) next[group.noPreference] = true;

      return next;
    });

  useEffect(() => {
    if (!getClientToken()) {
      navigate("/employer-login");
      return;
    }

    const loadMaids = async () => {
      try {
        setIsLoading(true);
        const [maidsResponse, companyResponse] = await Promise.all([
          fetch("/api/maids?visibility=public", {
            headers: { ...getClientAuthHeaders() },
          }),
          fetch("/api/company"),
        ]);
        const maidData = await maidsResponse.json();
        const companyData = (await companyResponse.json()) as CompanyResponse;
        if (!maidsResponse.ok || !maidData.maids) {
          throw new Error(maidData.error || "Failed to load maids");
        }
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

  const activeFilters = hasSearched ? submitted : draft;

  const filteredMaids = useMemo(() => {
    return filterMaids(maids, activeFilters);
  }, [maids, activeFilters]);

  useEffect(() => {
    setCurrentPage(1);
  }, [draft]);

  const totalPages = Math.ceil(filteredMaids.length / ITEMS_PER_PAGE);
  const pagedMaids = filteredMaids.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleSearch = () => {
    setSubmitted(draft);
    setCurrentPage(1);
    setHasSearched(true);
    setFormOpen(false);
  };

  const handleRequestMaid = () => {
    navigate("/client/requests");
  };

  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | "...")[] = [1];
    if (currentPage > 3) pages.push("...");
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      pages.push(i);
    }
    if (currentPage < totalPages - 2) pages.push("...");
    pages.push(totalPages);
    return pages;
  }, [totalPages, currentPage]);

  return (
    <div className="client-page-theme min-h-screen bg-background">
      <div className="mx-auto w-full max-w-5xl px-3 py-4 flex flex-col gap-4">

        <Card className="overflow-hidden">
          <CardContent className="p-0">

            {/* ── Action buttons bar ── */}
            <div className="grid grid-cols-2 gap-2 border-b p-3">
              <Button
                type="button"
                variant="default"
                className="font-body font-semibold w-full"
                onClick={handleRequestMaid}
              >
                Request Maid
              </Button>
              <Button
                type="button"
                className="font-body font-semibold w-full"
                onClick={handleSearch}
              >
                <Search className="mr-1.5 h-4 w-4" />
                Search Maid Now
              </Button>
              {showResults && (
                <button
                  type="button"
                  onClick={() => setFormOpen((v) => !v)}
                  className="col-span-2 text-center font-body text-sm text-primary hover:underline pt-1"
                >
                  {formOpen ? "Hide filters ▲" : "Edit filters ▼"}
                </button>
              )}
            </div>

            {(!showResults || formOpen) && (
              <div className="p-3 space-y-3">

                <div className="space-y-1">
                  <label className="font-body text-sm font-semibold text-foreground">Keywords</label>
                  <input
                    value={draft.keyword}
                    onChange={(e) => set("keyword", e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    className="w-full rounded border border-border bg-background px-3 py-2 font-body text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="Enter search keywords such as: Filipino maid, baby sitter, etc."
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-body text-sm font-semibold text-foreground">Agency Preference</label>
                  <select
                    value={draft.agencyPreference}
                    onChange={(e) => set("agencyPreference", e.target.value)}
                    className="w-full rounded border border-border bg-background px-3 py-2 font-body text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option>No Preference</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-body text-sm font-semibold text-foreground">Bio-data Created within</label>
                  <select
                    value={draft.biodataCreatedWithin}
                    onChange={(e) => set("biodataCreatedWithin", e.target.value)}
                    className="w-full rounded border border-border bg-background px-3 py-2 font-body text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
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
                  <label className="font-body text-sm font-semibold text-foreground">Maid Type</label>
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                    {(["New Maid", "Transfer Maid", "Ex-Singapore Maid"] as const).map((type) => (
                      <label key={type} className="flex cursor-pointer items-center gap-1.5 font-body text-sm text-foreground select-none">
                        <input
                          type="radio"
                          name="maidType"
                          value={type}
                          checked={draft.maidType === type}
                          onChange={() => set("maidType", draft.maidType === type ? "" : type)}
                          className="h-3.5 w-3.5 accent-primary cursor-pointer"
                        />
                        {type}
                      </label>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-0.5">
                    <CB checked={draft.willingOffDays} onChange={() => toggle("willingOffDays")} label="Willing to work on off-days" />
                    <CB checked={draft.hasChildren} onChange={() => toggle("hasChildren")} label="Has Children" />
                    <CB checked={draft.withVideo} onChange={() => toggle("withVideo")} label="With Video" />
                  </div>
                </div>

                <div className="border-t border-border" />


                <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                  <div>
                    <SectionHead>Nationality</SectionHead>
                    <div className="space-y-1.5">
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
                    <SectionHead>Working Experience</SectionHead>
                    <div className="space-y-1.5">
                      <CB checked={draft.expHomeCountry} onChange={() => toggle("expHomeCountry")} label="Home Country" />
                      <CB checked={draft.expSingapore} onChange={() => toggle("expSingapore")} label="Singapore" />
                      <CB checked={draft.expMalaysia} onChange={() => toggle("expMalaysia")} label="Malaysia" />
                      <CB checked={draft.expHongKong} onChange={() => toggle("expHongKong")} label="Hong Kong" />
                      <CB checked={draft.expTaiwan} onChange={() => toggle("expTaiwan")} label="Taiwan" />
                      <CB checked={draft.expMiddleEast} onChange={() => toggle("expMiddleEast")} label="Middle East" />
                      <CB checked={draft.expOtherCountries} onChange={() => toggle("expOtherCountries")} label="Other Countries" />
                    </div>
                  </div>
                </div>

                <div>
                  <SectionHead>Duty</SectionHead>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                    <CB checked={draft.dutyCareInfant} onChange={() => toggle("dutyCareInfant")} label="Care for Infant" />
                    <CB checked={draft.dutyCareYoungChildren} onChange={() => toggle("dutyCareYoungChildren")} label="Care for Young Children" />
                    <CB checked={draft.dutyCareElderlyDisabled} onChange={() => toggle("dutyCareElderlyDisabled")} label="Care for Elderly/Disabled" />
                    <CB checked={draft.dutyCooking} onChange={() => toggle("dutyCooking")} label="Cooking" />
                    <CB checked={draft.dutyGeneralHousekeeping} onChange={() => toggle("dutyGeneralHousekeeping")} label="General Housekeeping" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                  <div>
                    <SectionHead>Language</SectionHead>
                    <div className="space-y-1.5">
                      <CB checked={draft.langEnglish} onChange={() => toggle("langEnglish")} label="English" />
                      <CB checked={draft.langMandarin} onChange={() => toggle("langMandarin")} label="Mandarin/Chinese-Dialect" />
                      <CB checked={draft.langBahasaIndonesia} onChange={() => toggle("langBahasaIndonesia")} label="Bahasa Indonesia/Malaysia" />
                      <CB checked={draft.langHindi} onChange={() => toggle("langHindi")} label="Hindi" />
                      <CB checked={draft.langTamil} onChange={() => toggle("langTamil")} label="Tamil" />
                    </div>
                  </div>

                  <div>
                    <SectionHead>Age</SectionHead>
                    <div className="space-y-1.5">
                      <CB checked={draft.age21to25} onChange={() => toggle("age21to25")} label="21 to 25" />
                      <CB checked={draft.age26to30} onChange={() => toggle("age26to30")} label="26 to 30" />
                      <CB checked={draft.age31to35} onChange={() => toggle("age31to35")} label="31 to 35" />
                      <CB checked={draft.age36to40} onChange={() => toggle("age36to40")} label="36 to 40" />
                      <CB checked={draft.age41above} onChange={() => toggle("age41above")} label="41 and Above" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                  <div>
                    <SectionHead>Marital Status</SectionHead>
                    <div className="space-y-1.5">
                      <CB checked={draft.marSingle} onChange={() => toggle("marSingle")} label="Single" />
                      <CB checked={draft.marMarried} onChange={() => toggle("marMarried")} label="Married" />
                      <CB checked={draft.marWidowed} onChange={() => toggle("marWidowed")} label="Widowed" />
                      <CB checked={draft.marDivorced} onChange={() => toggle("marDivorced")} label="Divorced" />
                      <CB checked={draft.marSeparated} onChange={() => toggle("marSeparated")} label="Separated" />
                    </div>
                  </div>

                  <div>
                    <SectionHead>Education</SectionHead>
                    <div className="space-y-1.5">
                      <CB checked={draft.eduCollege} onChange={() => toggle("eduCollege")} label="College/Degree (≥12 yrs)" />
                      <CB checked={draft.eduHighSchool} onChange={() => toggle("eduHighSchool")} label="High School (10~12 yrs)" />
                      <CB checked={draft.eduSecondary} onChange={() => toggle("eduSecondary")} label="Secondary (7~9 yrs)" />
                      <CB checked={draft.eduPrimary} onChange={() => toggle("eduPrimary")} label="Primary Level (5~6 yrs)" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                  <div>
                    <SectionHead>Height of maid (cm)</SectionHead>
                    <div className="space-y-1.5">
                      <CB checked={draft.height150below} onChange={() => toggle("height150below")} label="150 and Below" />
                      <CB checked={draft.height151to155} onChange={() => toggle("height151to155")} label="151 to 155" />
                      <CB checked={draft.height156to160} onChange={() => toggle("height156to160")} label="156 to 160" />
                      <CB checked={draft.height161above} onChange={() => toggle("height161above")} label="161 and Above" />
                    </div>
                  </div>

                  <div>
                    <SectionHead>Religion</SectionHead>
                    <div className="space-y-1.5">
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


              </div>
            )}
          </CardContent>
        </Card>

        {showResults && (
          <div>
            <div className="mb-3 flex items-center justify-between flex-wrap gap-2">
              <p className="font-body text-sm text-muted-foreground">
                {isLoading
                  ? "Loading maid profiles..."
                  : `${filteredMaids.length} maid${filteredMaids.length !== 1 ? "s" : ""} matched your search.`}
                {totalPages > 1 && ` (Page ${currentPage} of ${totalPages})`}
              </p>
            </div>

            {isLoading ? (
              <div className="rounded-2xl border bg-muted/40 p-8 text-center font-body text-muted-foreground">
                Loading maid profiles...
              </div>
            ) : filteredMaids.length === 0 ? (
              <div className="rounded-2xl border bg-muted/40 p-8 text-center">
                <p className="font-display text-lg font-semibold text-foreground">No matching maids found</p>
                <p className="mt-1 font-body text-sm text-muted-foreground">
                  Try adjusting your filters or use broader criteria.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {pagedMaids.map((maid) => {
                  const age = calculateAge(maid.dateOfBirth);
                  const photo = getPrimaryPhoto(maid);
                  const agencyName = getAgencyName(maid, company);

                  return (
                    <article
                      key={maid.referenceCode}
                      className="group flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition hover:shadow-md hover:-translate-y-0.5"
                    >
                      <div className="aspect-[3/4] overflow-hidden bg-muted">
                        {photo ? (
                          <img
                            src={photo}
                            alt={maid.fullName}
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">
                            No photo
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-1.5 p-2.5 flex-1">
                        <h3 className="text-xs font-semibold text-foreground line-clamp-1 leading-tight">
                          {maid.fullName}
                        </h3>
                        <p className="text-[10px] text-muted-foreground leading-tight">
                          {maid.referenceCode}
                        </p>

                        <div className="flex flex-wrap gap-1">
                          {maid.nationality && (
                            <span className="rounded-full bg-muted px-2 py-px text-[10px] border border-border/40">
                              {maid.nationality}
                            </span>
                          )}
                          {maid.type && (
                            <span className={`rounded-full px-2 py-px text-[10px] border ${
                              maid.type === "New Maid"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : maid.type === "Transfer Maid"
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}>
                              {maid.type}
                            </span>
                          )}
                          {age && (
                            <span className="rounded-full bg-muted px-2 py-px text-[10px] border border-border/40">
                              {age} yrs
                            </span>
                          )}
                        </div>

                        <div className="mt-auto pt-1.5">
                          <Button size="sm" asChild className="h-7 w-full text-[10px] px-1">
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

            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-1.5 flex-wrap">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="rounded-lg border bg-card px-3 py-2 font-body text-sm text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted transition-colors"
                >
                  Previous
                </button>

                {pageNumbers.map((page, idx) =>
                  page === "..." ? (
                    <span key={`ellipsis-${idx}`} className="px-2 py-2 font-body text-sm text-muted-foreground select-none">
                      …
                    </span>
                  ) : (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page as number)}
                      className={`min-w-[2.25rem] rounded-lg border px-3 py-2 font-body text-sm transition-colors ${
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
                  className="rounded-lg border bg-card px-3 py-2 font-body text-sm text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted transition-colors"
                >
                  Next
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
