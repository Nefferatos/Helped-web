import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Search, Star, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { calculateAge, getExperienceBucket, MaidProfile } from "@/lib/maids";
import { filterMaids } from "@/lib/maidFilter";
import { toast } from "@/components/ui/sonner";
import { getClientToken } from "@/lib/clientAuth";
import { getSavedShortlistRefs, subscribeToShortlistRefs, toggleShortlistRef } from "@/lib/shortlist";
import "./ClientTheme.css";

const MAID_TYPES = ["New Maid", "Transfer Maid", "Ex-Singapore Maid"] as const;
const PAGE_SIZE = 18;

const NATIONALITY_LINKS = [
  "Most Recent Maid in 3 days",
  "English Speaking Maid",
  "Mandarin Speaking Maid",
  "Hokkien/Cantonese Speaking",
  "New Maid",
  "Transfer Maid",
  "Ex-Singapore Maid",
  "Filipino Maid",
  "Indonesian Maid",
  "Myanmar Maid",
  "Indian Maid",
  "Mizoram Maid",
  "Darjeeling Maid",
  "Manipur Maid",
  "Punjabi Maid",
  "Sri Lankan Maid",
  "Cambodian Maid",
  "Bangladeshi Maid",
] as const;

const QUICK_LINKS = {
  mostRecent3Days: "Most Recent Maid in 3 days",
  english: "English Speaking Maid",
  mandarin: "Mandarin Speaking Maid",
  hokkienCantonese: "Hokkien/Cantonese Speaking",
  newMaid: "New Maid",
  transferMaid: "Transfer Maid",
  exSingapore: "Ex-Singapore Maid",
  filipino: "Filipino Maid",
  indonesian: "Indonesian Maid",
  myanmar: "Myanmar Maid",
  indian: "Indian Maid",
  mizoram: "Mizoram Maid",
  darjeeling: "Darjeeling Maid",
  manipur: "Manipur Maid",
  punjabi: "Punjabi Maid",
  sriLankan: "Sri Lankan Maid",
  cambodian: "Cambodian Maid",
  bangladeshi: "Bangladeshi Maid",
} as const;

const QUICK_LINKS_BY_LABEL = Object.fromEntries(
  Object.entries(QUICK_LINKS).map(([k, v]) => [v, k])
) as Record<string, QuickLinkKey>;

type QuickLinkKey = keyof typeof QUICK_LINKS;

type ClientDraft = {
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
};

// ── Simplified sidebar filters (matches Image 1) ──────────────────────────────
type SidebarFilters = {
  keyword: string;
  maidType: string;
  willingOffDays: boolean;
  nationality: string;
  language: string;
};

type MaidSearchPageProps = {
  basePath?: string;
  loginPath?: string;
};

const defaultSidebarFilters: SidebarFilters = {
  keyword: "",
  maidType: "",
  willingOffDays: false,
  nationality: "No Preference",
  language: "No Preference",
};

const parseAdvancedFilters = (searchParams: URLSearchParams) => {
  const raw = searchParams.get("filters");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
};

const normalizeNationality = (value: string) => {
  const lower = value.trim().toLowerCase();
  if (lower.includes("filip")) return "Filipino";
  if (lower.includes("indo")) return "Indonesian";
  if (lower.includes("myan")) return "Myanmar";
  if (lower.includes("indian")) return "Indian";
  if (lower.includes("sri") || lower.includes("lanka")) return "Sri Lankan";
  if (lower.includes("cambod")) return "Cambodian";
  if (lower.includes("bangla")) return "Bangladeshi";
  return "Others";
};

const deriveSidebarFilters = (
  searchParams: URLSearchParams,
  advancedFilters: Record<string, unknown> | null
): SidebarFilters => ({
  keyword: searchParams.get("q") || String(advancedFilters?.keyword || ""),
  maidType: searchParams.get("type") || String(advancedFilters?.maidType || ""),
  willingOffDays:
    searchParams.get("offDays") === "true" || Boolean(advancedFilters?.willingOffDays),
  nationality:
    searchParams.get("nationality") ||
    (advancedFilters?.natFilipino ? "Filipino" :
     advancedFilters?.natIndonesian ? "Indonesian" :
     advancedFilters?.natMyanmar ? "Myanmar" :
     advancedFilters?.natIndian ? "Indian" :
     advancedFilters?.natSriLankan ? "Sri Lankan" :
     advancedFilters?.natCambodian ? "Cambodian" :
     advancedFilters?.natBangladeshi ? "Bangladeshi" :
     advancedFilters?.natOthers ? "Others" : "No Preference"),
  language:
    searchParams.get("language") ||
    (advancedFilters?.langEnglish ? "English" :
     advancedFilters?.langMandarin ? "Mandarin" :
     advancedFilters?.langBahasaIndonesia ? "Bahasa Indonesia / Malay" :
     advancedFilters?.langHindi ? "Hindi" :
     advancedFilters?.langTamil ? "Tamil" : "No Preference"),
});

const buildDraftFromSidebar = (filters: SidebarFilters): ClientDraft => ({
  keyword: filters.keyword,
  agencyPreference: "No Preference",
  biodataCreatedWithin: "No Preference",
  maidType: filters.maidType,
  willingOffDays: filters.willingOffDays,
  hasChildren: false,
  withVideo: false,
  natFilipino: filters.nationality === "Filipino",
  natIndonesian: filters.nationality === "Indonesian",
  natMyanmar: filters.nationality === "Myanmar",
  natIndian: filters.nationality === "Indian",
  natSriLankan: filters.nationality === "Sri Lankan",
  natCambodian: filters.nationality === "Cambodian",
  natBangladeshi: filters.nationality === "Bangladeshi",
  natOthers: filters.nationality === "Others",
  natNoPreference: filters.nationality === "No Preference",
  expHomeCountry: false, expSingapore: false, expMalaysia: false, expHongKong: false,
  expTaiwan: false, expMiddleEast: false, expOtherCountries: false, expNoPreference: true,
  dutyCareInfant: false, dutyCareYoungChildren: false, dutyCareElderlyDisabled: false,
  dutyCooking: false, dutyGeneralHousekeeping: false, dutyNoPreference: true,
  eduCollege: false, eduHighSchool: false, eduSecondary: false, eduPrimary: false, eduNoPreference: true,
  langEnglish: filters.language === "English",
  langMandarin: filters.language === "Mandarin",
  langBahasaIndonesia: filters.language === "Bahasa Indonesia / Malay",
  langHindi: filters.language === "Hindi",
  langTamil: filters.language === "Tamil",
  langNoPreference: filters.language === "No Preference",
  age21to25: false, age26to30: false, age31to35: false, age36to40: false,
  age41above: false, ageNoPreference: true,
  marSingle: false, marMarried: false, marWidowed: false, marDivorced: false,
  marSeparated: false, marNoPreference: true,
  height150below: false, height151to155: false, height156to160: false,
  height161above: false, heightNoPreference: true,
  relFreeThinker: false, relChristian: false, relCatholic: false, relBuddhist: false,
  relMuslim: false, relHindu: false, relSikh: false, relOthers: false, relNoPreference: true,
});

const matchesLanguage = (maid: MaidProfile, language: string) => {
  if (language === "No Preference") return true;
  const skills = Object.entries(maid.languageSkills || {})
    .filter(([, level]) => String(level || "").trim() && String(level || "").trim().toLowerCase() !== "zero")
    .map(([key]) => key.toLowerCase())
    .join(" ");
  const term = language.toLowerCase();
  if (term === "mandarin") return skills.includes("mandarin") || skills.includes("chinese");
  if (term === "bahasa indonesia / malay")
    return skills.includes("bahasa") || skills.includes("malay") || skills.includes("indonesia");
  return skills.includes(term);
};

const matchesQuickLink = (maid: MaidProfile, quickLink: QuickLinkKey) => {
  switch (quickLink) {
    case "mostRecent3Days": {
      const raw = String(maid.createdAt || maid.updatedAt || "").trim();
      if (!raw) return false;
      const date = new Date(raw);
      if (Number.isNaN(date.getTime())) return false;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 3);
      return date >= cutoff;
    }
    case "english": return matchesLanguage(maid, "English");
    case "mandarin": return matchesLanguage(maid, "Mandarin");
    case "hokkienCantonese":
      return matchesLanguage(maid, "Hokkien") || matchesLanguage(maid, "Cantonese");
    case "newMaid": return String(maid.type || "").toLowerCase().includes("new");
    case "transferMaid": return String(maid.type || "").toLowerCase().includes("transfer");
    case "exSingapore": return String(maid.type || "").toLowerCase().includes("ex-singapore");
    case "filipino": return normalizeNationality(String(maid.nationality || "")) === "Filipino";
    case "indonesian": return normalizeNationality(String(maid.nationality || "")) === "Indonesian";
    case "myanmar": return normalizeNationality(String(maid.nationality || "")) === "Myanmar";
    case "indian": return normalizeNationality(String(maid.nationality || "")) === "Indian";
    case "mizoram": return String(maid.nationality || "").toLowerCase().includes("mizoram");
    case "darjeeling": return String(maid.nationality || "").toLowerCase().includes("darjeeling");
    case "manipur": return String(maid.nationality || "").toLowerCase().includes("manipur");
    case "punjabi": return String(maid.nationality || "").toLowerCase().includes("punjabi");
    case "sriLankan": return normalizeNationality(String(maid.nationality || "")) === "Sri Lankan";
    case "cambodian": return normalizeNationality(String(maid.nationality || "")) === "Cambodian";
    case "bangladeshi": return normalizeNationality(String(maid.nationality || "")) === "Bangladeshi";
    default: return true;
  }
};

const getPrimaryPhoto = (maid: MaidProfile) =>
  Array.isArray(maid.photoDataUrls) && maid.photoDataUrls.length > 0
    ? maid.photoDataUrls[0]
    : maid.photoDataUrl || "";

const getTypeLabel = (type: string) => {
  const lower = type.toLowerCase();
  if (lower.includes("new")) return "NEW";
  if (lower.includes("transfer")) return "TRANSFER";
  if (lower.includes("ex")) return "EX-SG";
  return type.toUpperCase();
};

const pageNumbers = (current: number, total: number): (number | "...")[] => {
  if (total <= 10) return Array.from({ length: total }, (_, index) => index + 1);
  const pages: (number | "...")[] = [1];
  if (current > 3) pages.push("...");
  for (let index = Math.max(2, current - 1); index <= Math.min(total - 1, current + 1); index++)
    pages.push(index);
  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
};

// ── Lock icon SVG ─────────────────────────────────────────────────────────────
const LockIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

// ── Maid card ─────────────────────────────────────────────────────────────────
const MaidCard = ({
  maid,
  isShortlisted,
  onToggleShortlist,
  onNavigate,
  isLoggedIn,
  loginPath,
}: {
  maid: MaidProfile;
  isShortlisted: boolean;
  onToggleShortlist: (ref: string) => void;
  onNavigate?: () => void;
  isLoggedIn: boolean;
  loginPath: string;
}) => {
  const photo = getPrimaryPhoto(maid);
  const age = calculateAge(maid.dateOfBirth);
  const typeLower = (maid.type || "").toLowerCase();
  const typeBadgeColor = typeLower.includes("new")
    ? "bg-emerald-500"
    : typeLower.includes("transfer")
    ? "bg-blue-500"
    : "bg-amber-500";

  // ── Locked card ──────────────────────────────────────────────────────────────
  if (!isLoggedIn) {
    return (
      <article className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all hover:shadow-md hover:border-primary/40">
        {/* Photo area — blurred with centred lock overlay */}
        <div className="relative w-full overflow-hidden bg-muted">
          {/* Blurred photo or placeholder */}
          <div className="blur-[10px] brightness-90 scale-110 pointer-events-none select-none">
            {photo ? (
              <img src={photo} alt="" aria-hidden className="block h-auto w-full object-cover" />
            ) : (
              <div className="flex aspect-[3/4] items-center justify-center bg-gradient-to-b from-muted to-muted-foreground/10">
                <svg className="h-10 w-10 text-muted-foreground/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" />
                </svg>
              </div>
            )}
          </div>

          {/* Maid type badge — still visible so user knows what category */}
          {maid.type && (
            <span className={`absolute left-1.5 top-1.5 rounded px-1.5 py-px text-[8px] font-bold uppercase tracking-wider text-white shadow ${typeBadgeColor}`}>
              {getTypeLabel(maid.type)}
            </span>
          )}

          {/* Lock overlay — centred */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/50">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary shadow-sm">
              <LockIcon className="h-4 w-4 text-primary-foreground" />
            </div>
          </div>
        </div>

        {/* Card body — skeleton placeholder rows */}
        <div className="flex flex-col gap-1.5 p-2 pb-1">
          <div className="h-2.5 w-4/5 rounded-full bg-muted" />
          <div className="h-2 w-3/5 rounded-full bg-muted/70" />
          <div className="h-2 w-2/5 rounded-full bg-muted/50" />
        </div>

        {/* CTA button */}
        <div className="px-2 pb-2 pt-1">
          <Link
            to={loginPath}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-2 py-2 text-[10px] font-bold uppercase tracking-wide text-primary-foreground transition-colors hover:bg-primary/90 active:bg-primary/80"
          >
            <LockIcon className="h-3 w-3" />
            Log in to view
          </Link>
        </div>
      </article>
    );
  }

  // ── Logged-in card ────────────────────────────────────────────────────────────
  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="relative w-full bg-muted">
        <Link to={`/maids/${encodeURIComponent(maid.referenceCode)}`} onClick={onNavigate}>
          {photo ? (
            <img
              src={photo}
              alt={maid.fullName}
              className="block h-auto w-full cursor-pointer object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
          ) : (
            <div className="flex aspect-[3/4] items-center justify-center bg-muted">
              <svg className="h-8 w-8 text-muted-foreground/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" />
              </svg>
            </div>
          )}
        </Link>

        {maid.type && (
          <span className={`absolute left-1.5 top-1.5 rounded px-1.5 py-px text-[8px] font-bold uppercase tracking-wider text-white shadow ${typeBadgeColor}`}>
            {getTypeLabel(maid.type)}
          </span>
        )}

        <button
          onClick={() => onToggleShortlist(maid.referenceCode)}
          className={`absolute bottom-0 left-0 right-0 flex items-center justify-center gap-1 py-1.5 text-[9px] font-bold uppercase tracking-wide text-white transition-all ${
            isShortlisted ? "bg-amber-500" : "bg-black/60 opacity-0 group-hover:opacity-100"
          }`}
        >
          <Star className={`h-2.5 w-2.5 ${isShortlisted ? "fill-white" : ""}`} />
          {isShortlisted ? "Shortlisted" : "Shortlist"}
        </button>
      </div>

      <div className="flex flex-col gap-0.5 p-2">
        <p className="truncate text-[11px] font-semibold leading-tight text-foreground">
          {maid.fullName || "Unnamed maid"}
        </p>
        <p className="truncate text-[10px] leading-tight text-muted-foreground">
          {getExperienceBucket(maid)}
        </p>
        <p className="truncate text-[10px] leading-tight text-muted-foreground">
          {maid.nationality || "—"}
        </p>
        <p className="font-mono text-[9px] leading-tight text-muted-foreground/70">
          {maid.referenceCode}{age !== null ? ` • ${age} yrs` : ""}
        </p>
      </div>
    </article>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────
const MaidSearchPage = ({
  basePath = "/client/maids",
  loginPath = "/employer-login",
}: MaidSearchPageProps) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const advancedFilters = useMemo(() => parseAdvancedFilters(searchParams), [searchParams]);
  const advancedFiltersRaw = searchParams.get("filters") || "";
  const quickLink = (searchParams.get("quick") || "") as QuickLinkKey | "";

  const [filters, setFilters] = useState<SidebarFilters>(() =>
    deriveSidebarFilters(searchParams, advancedFilters)
  );
  const [page, setPage] = useState(1);
  const [allMaids, setAllMaids] = useState<MaidProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isShortlistOpen, setIsShortlistOpen] = useState(false);
  const [shortlistRefs, setShortlistRefs] = useState<string[]>(() => getSavedShortlistRefs());
  const shortlist = useMemo(() => new Set(shortlistRefs), [shortlistRefs]);
  const isLoggedIn = !!getClientToken();

  useEffect(() => {
    setShortlistRefs(getSavedShortlistRefs());
    return subscribeToShortlistRefs(setShortlistRefs);
  }, []);

  const handleToggleShortlist = (ref: string) => {
    setShortlistRefs(toggleShortlistRef(ref));
  };

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        setIsLoading(true);
        const res = await fetch("/api/maids?visibility=public", { signal: controller.signal });
        const data = (await res.json()) as { maids?: MaidProfile[]; error?: string };
        if (!res.ok || !data.maids) throw new Error(data.error || "Failed to load");
        setAllMaids(data.maids.filter((maid) => maid.isPublic));
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          toast.error(error instanceof Error ? error.message : "Failed to load maids");
        }
      } finally {
        setIsLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    setFilters(deriveSidebarFilters(searchParams, advancedFilters));
    setPage(1);
  }, [searchParams, advancedFilters]);

  const filteredMaids = useMemo(() => {
    const draft = buildDraftFromSidebar(filters);
    let result = filterMaids(allMaids, draft);
    if (quickLink) {
      result = result.filter((m) => matchesQuickLink(m, quickLink));
    }
    return result;
  }, [allMaids, filters, quickLink]);

  const totalPages = Math.max(1, Math.ceil(filteredMaids.length / PAGE_SIZE));
  const pagedMaids = filteredMaids.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pages = pageNumbers(page, totalPages);

  const shortlistedMaids = useMemo(
    () =>
      shortlistRefs
        .map((ref) => allMaids.find((maid) => maid.referenceCode === ref))
        .filter((maid): maid is MaidProfile => Boolean(maid)),
    [allMaids, shortlistRefs]
  );
  const missingShortlistRefs = useMemo(
    () => shortlistRefs.filter((ref) => !shortlistedMaids.some((maid) => maid.referenceCode === ref)),
    [shortlistRefs, shortlistedMaids]
  );

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.keyword.trim()) count++;
    if (filters.maidType) count++;
    if (filters.nationality !== "No Preference") count++;
    if (filters.language !== "No Preference") count++;
    if (filters.willingOffDays) count++;
    return count;
  }, [filters]);

  const handleSearch = () => {
    setPage(1);
    const nextParams = new URLSearchParams();
    const draft = buildDraftFromSidebar(filters);
    nextParams.set("filters", JSON.stringify(draft));
    if (filters.keyword.trim()) nextParams.set("q", filters.keyword.trim());
    if (filters.maidType.trim()) nextParams.set("type", filters.maidType.trim());
    if (filters.nationality !== "No Preference") nextParams.set("nationality", filters.nationality);
    if (filters.language !== "No Preference") nextParams.set("language", filters.language);
    if (filters.willingOffDays) nextParams.set("offDays", "true");
    if (quickLink) nextParams.set("quick", quickLink);
    setSearchParams(nextParams);
    setMobileSidebarOpen(false);
  };

  const handleQuickLink = (label: string) => {
    const quickLinkKey = QUICK_LINKS_BY_LABEL[label] ?? "";
    const nextParams = new URLSearchParams();
    const nextFilters = { ...defaultSidebarFilters };
    if (quickLinkKey) nextParams.set("quick", quickLinkKey);
    nextParams.set("filters", JSON.stringify(buildDraftFromSidebar(nextFilters)));
    setFilters(nextFilters);
    setPage(1);
    setSearchParams(nextParams);
  };

  const handleReset = () => {
    setFilters(defaultSidebarFilters);
    setPage(1);
    setSearchParams(new URLSearchParams());
  };

  const selectCls = (active: boolean) =>
    `w-full rounded border px-2 py-1.5 text-sm transition-colors focus:outline-none focus:ring-1 focus:ring-primary/30 ${
      active
        ? "border-primary/50 bg-primary/5 font-medium text-foreground"
        : "border-border bg-background text-foreground"
    }`;

  // ── Compact sidebar matching Image 1 ─────────────────────────────────────────
  const SidebarContent = () => (
    <div className="space-y-0">

      {/* Search box card */}
      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        {/* Green header */}
        <div className="bg-primary px-3 py-2">
          <p className="text-sm font-bold text-primary-foreground">
            Maid <span className="font-normal opacity-90">Search</span>
          </p>
        </div>

        <div className="space-y-3 p-3">
          {/* Keyword */}
          <input
            value={filters.keyword}
            onChange={(e) => setFilters((prev) => ({ ...prev, keyword: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Filipino maid, baby sitter, etc."
            className="w-full rounded border border-border bg-background px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/20"
          />

          {/* Maid Type */}
          <div>
            <p className="mb-1.5 text-xs font-semibold text-foreground">Maid Type</p>
            <div className="space-y-1">
              {MAID_TYPES.map((type) => (
                <label key={type} className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="maidType"
                    value={type}
                    checked={filters.maidType === type}
                    onChange={() =>
                      setFilters((prev) => ({
                        ...prev,
                        maidType: prev.maidType === type ? "" : type,
                      }))
                    }
                    className="h-3.5 w-3.5 accent-primary"
                  />
                  <span className="text-sm text-foreground">{type}</span>
                </label>
              ))}
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={filters.willingOffDays}
                  onChange={() =>
                    setFilters((prev) => ({ ...prev, willingOffDays: !prev.willingOffDays }))
                  }
                  className="h-3.5 w-3.5 accent-primary"
                />
                <span className="text-sm text-foreground">Willing to work on off-days</span>
              </label>
            </div>
          </div>

          {/* Nationality */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-foreground">Nationality</label>
            <select
              className={selectCls(filters.nationality !== "No Preference")}
              value={filters.nationality}
              onChange={(e) => setFilters((prev) => ({ ...prev, nationality: e.target.value }))}
            >
              <option>No Preference</option>
              <option>Filipino</option>
              <option>Indonesian</option>
              <option>Myanmar</option>
              <option>Indian</option>
              <option>Sri Lankan</option>
              <option>Cambodian</option>
              <option>Bangladeshi</option>
              <option>Others</option>
            </select>
          </div>

          {/* Language */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-foreground">Language</label>
            <select
              className={selectCls(filters.language !== "No Preference")}
              value={filters.language}
              onChange={(e) => setFilters((prev) => ({ ...prev, language: e.target.value }))}
            >
              <option>No Preference</option>
              <option>English</option>
              <option>Mandarin</option>
              <option>Bahasa Indonesia / Malay</option>
              <option>Hindi</option>
              <option>Tamil</option>
            </select>
          </div>

          {/* Search button */}
          <button
            type="button"
            onClick={handleSearch}
            className="flex w-full items-center justify-center gap-2 rounded bg-primary py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 active:bg-primary/80"
          >
            <Search className="h-3.5 w-3.5" />
            Search Maid
            {activeFilterCount > 0 && (
              <span className="ml-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary-foreground/20 px-1 text-[10px] font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>

          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={handleReset}
              className="flex w-full items-center justify-center gap-1.5 rounded border border-border py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
            >
              <X className="h-3 w-3" />
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Quick Browse list */}
      <div className="mt-2 overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <div className="divide-y divide-border/50">
          {NATIONALITY_LINKS.map((label) => {
            const linkKey = QUICK_LINKS_BY_LABEL[label];
            const isActive = !!quickLink && quickLink === linkKey;
            return (
              <button
                key={label}
                onClick={() => handleQuickLink(label)}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                  isActive
                    ? "bg-primary/10 font-semibold text-primary"
                    : "text-foreground hover:bg-muted/50 hover:text-primary"
                }`}
              >
                <span className="shrink-0 text-primary opacity-60">›</span>
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  const PaginationBar = () => (
    <div className="flex flex-wrap items-center gap-1">
      <button
        onClick={() => setPage((prev) => Math.max(1, prev - 1))}
        disabled={page === 1}
        className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-background text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </button>
      {pages.map((item, index) =>
        item === "..." ? (
          <span key={`ellipsis-${index}`} className="px-1 text-xs text-muted-foreground">…</span>
        ) : (
          <button
            key={item}
            onClick={() => setPage(item as number)}
            className={`flex h-7 min-w-[1.75rem] items-center justify-center rounded-lg border px-2 text-xs font-medium transition-colors ${
              item === page
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-foreground hover:bg-muted"
            }`}
          >
            {item}
          </button>
        )
      )}
      <button
        onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
        disabled={page === totalPages}
        className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-background text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );

  return (
    <div className="client-page-theme min-h-screen bg-background">

      {/* Mobile top bar */}
      <div className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-border bg-background/95 px-4 py-2.5 backdrop-blur md:hidden">
        <p className="text-sm font-medium text-foreground">
          {isLoading ? "Loading…" : `${filteredMaids.length} result${filteredMaids.length !== 1 ? "s" : ""}`}
        </p>
        <button
          type="button"
          onClick={() => setMobileSidebarOpen((v) => !v)}
          className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filters
          {activeFilterCount > 0 && (
            <span className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Mobile sidebar drawer */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-30 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileSidebarOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-background p-4">
            <div className="mb-4 flex items-center justify-between">
              <p className="font-semibold">Filters</p>
              <button type="button" onClick={() => setMobileSidebarOpen(false)}>
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
            <SidebarContent />
          </div>
        </div>
      )}

      <div className="container mx-auto flex flex-col gap-4 px-3 py-4 sm:px-4 md:flex-row md:gap-5 md:py-6">

        {/* Desktop sidebar — w-56 (224px) */}
        <aside className="hidden w-56 shrink-0 md:block">
          <div className="sticky top-4">
            <SidebarContent />
          </div>
        </aside>

        {/* Main content */}
        <main className="min-w-0 flex-1">

          {/* Advanced filters banner */}
          {advancedFilters ? (
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Advanced filters applied</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Carried over from the client search page. Refine here or go back to edit.
                </p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link
                  to={
                    advancedFiltersRaw
                      ? `${basePath}?filters=${encodeURIComponent(advancedFiltersRaw)}`
                      : basePath
                  }
                >
                  Edit Advanced Filters
                </Link>
              </Button>
            </div>
          ) : null}

          {/* Shortlist bar */}
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
              <span>
                <span className="font-bold">{shortlistRefs.length}</span>{" "}
                {shortlistRefs.length === 1 ? "maid" : "maids"} shortlisted
              </span>
            </div>
            <Button
              type="button"
              variant="link"
              size="sm"
              onClick={() => setIsShortlistOpen(true)}
              className="h-auto p-0 text-amber-800 hover:text-amber-900"
            >
              My Shortlist
            </Button>
          </div>

          {/* Results header */}
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {isLoading ? (
                "Loading profiles…"
              ) : (
                <>
                  <span className="font-semibold text-foreground">{filteredMaids.length}</span>{" "}
                  {filteredMaids.length !== 1 ? "profiles" : "profile"} found
                  {quickLink && (
                    <span className="ml-1 text-muted-foreground/70">
                      · {QUICK_LINKS[quickLink as QuickLinkKey]}
                    </span>
                  )}
                </>
              )}
            </p>
            <PaginationBar />
          </div>

          {/* Grid */}
          {isLoading ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {Array.from({ length: PAGE_SIZE }).map((_, index) => (
                <div key={index} className="overflow-hidden rounded-xl border border-border bg-muted animate-pulse">
                  <div className="aspect-[3/4] bg-muted-foreground/10" />
                  <div className="space-y-1.5 p-2">
                    <div className="h-2 w-3/4 rounded-full bg-muted-foreground/15" />
                    <div className="h-2 w-1/2 rounded-full bg-muted-foreground/10" />
                    <div className="h-2 w-2/3 rounded-full bg-muted-foreground/10" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredMaids.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-20 text-center">
              <Search className="mb-3 h-10 w-10 text-muted-foreground/25" />
              <p className="text-base font-semibold text-foreground">No profiles found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try adjusting your filters or search keywords.
              </p>
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="mt-4 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  Clear all filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {pagedMaids.map((maid) => (
                <MaidCard
                  key={maid.referenceCode}
                  maid={maid}
                  isShortlisted={shortlist.has(maid.referenceCode)}
                  onToggleShortlist={handleToggleShortlist}
                  isLoggedIn={isLoggedIn}
                  loginPath={loginPath}
                />
              ))}
            </div>
          )}

          {/* Bottom pagination */}
          {!isLoading && filteredMaids.length > 0 && (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Page <span className="font-medium text-foreground">{page}</span> of{" "}
                <span className="font-medium text-foreground">{totalPages}</span>
              </p>
              <PaginationBar />
            </div>
          )}

          {/* Shortlist dialog */}
          <Dialog open={isShortlistOpen} onOpenChange={setIsShortlistOpen}>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
                  My Shortlist
                  {shortlistRefs.length > 0 && (
                    <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-100 px-1.5 text-[11px] font-bold text-amber-700">
                      {shortlistRefs.length}
                    </span>
                  )}
                </DialogTitle>
                <DialogDescription>
                  Click any profile to view full details. Tap the star to remove from shortlist.
                </DialogDescription>
              </DialogHeader>

              {shortlistRefs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50">
                    <Star className="h-7 w-7 text-amber-300" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">No maids shortlisted yet</p>
                  <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                    Tap the star that appears on any profile card to add it to your shortlist.
                  </p>
                </div>
              ) : (
                <div className="max-h-[68vh] overflow-y-auto pr-1">
                  <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5">
                    {shortlistedMaids.map((maid) => (
                      <MaidCard
                        key={`shortlist-${maid.referenceCode}`}
                        maid={maid}
                        isShortlisted={true}
                        onToggleShortlist={handleToggleShortlist}
                        onNavigate={() => setIsShortlistOpen(false)}
                        isLoggedIn={isLoggedIn}
                        loginPath={loginPath}
                      />
                    ))}
                    {missingShortlistRefs.map((ref) => (
                      <div
                        key={`missing-${ref}`}
                        className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/20 p-3 text-center"
                        style={{ aspectRatio: "3 / 4" }}
                      >
                        <svg className="h-6 w-6 text-muted-foreground/25" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <circle cx="12" cy="12" r="10" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01" />
                        </svg>
                        <p className="break-all font-mono text-[9px] text-muted-foreground/70">{ref}</p>
                        <p className="text-[9px] text-muted-foreground/50">Profile not found</p>
                        <button
                          type="button"
                          onClick={() => handleToggleShortlist(ref)}
                          className="text-[10px] font-medium text-destructive hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{shortlistedMaids.length}</span>{" "}
                      {shortlistedMaids.length === 1 ? "profile" : "profiles"} shortlisted
                      {missingShortlistRefs.length > 0 && (
                        <span className="ml-1 text-muted-foreground/60">
                          · {missingShortlistRefs.length} not found
                        </span>
                      )}
                    </p>
                    <button
                      type="button"
                      onClick={() => { shortlistRefs.forEach((ref) => handleToggleShortlist(ref)); }}
                      className="text-xs font-medium text-destructive hover:underline"
                    >
                      Clear all
                    </button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

        </main>
      </div>
    </div>
  );
};

export default MaidSearchPage;