import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, ChevronDown, Search, Star, SlidersHorizontal, X } from "lucide-react";
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

// Pre-built reverse map: label → key
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

type SidebarFilters = {
  keyword: string;
  biodataCreatedWithin: string;
  maidType: string;
  nationality: string;
  religion: string;
  maritalStatus: string;
  education: string;
  language: string;
  age: string;
  height: string;
  experience: string;
  duty: string;
  willingOffDays: boolean;
  hasChildren: boolean;
  withVideo: boolean;
};

type MaidSearchPageProps = {
  basePath?: string;
  loginPath?: string;
};

const defaultSidebarFilters: SidebarFilters = {
  keyword: "",
  biodataCreatedWithin: "No Preference",
  maidType: "",
  nationality: "No Preference",
  religion: "No Preference",
  maritalStatus: "No Preference",
  education: "No Preference",
  language: "No Preference",
  age: "No Preference",
  height: "No Preference",
  experience: "No Preference",
  duty: "No Preference",
  willingOffDays: false,
  hasChildren: false,
  withVideo: false,
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

const normalizeReligion = (value: string) => {
  const lower = value.trim().toLowerCase();
  if (lower === "free thinker") return "Free Thinker";
  if (lower === "christian") return "Christian";
  if (lower === "catholic") return "Catholic";
  if (lower === "buddhist") return "Buddhist";
  if (lower === "muslim" || lower.includes("islam")) return "Muslim";
  if (lower === "hindu") return "Hindu";
  if (lower === "sikh") return "Sikh";
  if (!lower) return "No Preference";
  return "Others";
};

const normalizeEducation = (value: string) => {
  const lower = value.trim().toLowerCase();
  if (!lower) return "No Preference";
  if (lower.includes("college") || lower.includes("degree")) return "College / Degree";
  if (lower.includes("high school") || lower.includes("vocational")) return "High School / Vocational";
  if (lower.includes("secondary")) return "Secondary";
  if (lower.includes("primary")) return "Primary";
  return value;
};

const deriveSidebarFilters = (searchParams: URLSearchParams, advancedFilters: Record<string, unknown> | null): SidebarFilters => ({
  keyword: searchParams.get("q") || String(advancedFilters?.keyword || ""),
  biodataCreatedWithin: searchParams.get("biodata") || String(advancedFilters?.biodataCreatedWithin || "No Preference"),
  maidType: searchParams.get("type") || String(advancedFilters?.maidType || ""),
  nationality: searchParams.get("nationality") || (
    advancedFilters?.natFilipino ? "Filipino" :
    advancedFilters?.natIndonesian ? "Indonesian" :
    advancedFilters?.natMyanmar ? "Myanmar" :
    advancedFilters?.natIndian ? "Indian" :
    advancedFilters?.natSriLankan ? "Sri Lankan" :
    advancedFilters?.natCambodian ? "Cambodian" :
    advancedFilters?.natBangladeshi ? "Bangladeshi" :
    advancedFilters?.natOthers ? "Others" : "No Preference"
  ),
  religion: searchParams.get("religion") || (
    advancedFilters?.relFreeThinker ? "Free Thinker" :
    advancedFilters?.relChristian ? "Christian" :
    advancedFilters?.relCatholic ? "Catholic" :
    advancedFilters?.relBuddhist ? "Buddhist" :
    advancedFilters?.relMuslim ? "Muslim" :
    advancedFilters?.relHindu ? "Hindu" :
    advancedFilters?.relSikh ? "Sikh" :
    advancedFilters?.relOthers ? "Others" : "No Preference"
  ),
  maritalStatus: searchParams.get("marital") || (
    advancedFilters?.marSingle ? "Single" :
    advancedFilters?.marMarried ? "Married" :
    advancedFilters?.marWidowed ? "Widowed" :
    advancedFilters?.marDivorced ? "Divorced" :
    advancedFilters?.marSeparated ? "Separated" : "No Preference"
  ),
  education: searchParams.get("education") || (
    advancedFilters?.eduCollege ? "College / Degree" :
    advancedFilters?.eduHighSchool ? "High School / Vocational" :
    advancedFilters?.eduSecondary ? "Secondary" :
    advancedFilters?.eduPrimary ? "Primary" : "No Preference"
  ),
  language: searchParams.get("language") || (
    advancedFilters?.langEnglish ? "English" :
    advancedFilters?.langMandarin ? "Mandarin" :
    advancedFilters?.langBahasaIndonesia ? "Bahasa Indonesia / Malay" :
    advancedFilters?.langHindi ? "Hindi" :
    advancedFilters?.langTamil ? "Tamil" : "No Preference"
  ),
  age: searchParams.get("age") || (
    advancedFilters?.age21to25 ? "21 to 25" :
    advancedFilters?.age26to30 ? "26 to 30" :
    advancedFilters?.age31to35 ? "31 to 35" :
    advancedFilters?.age36to40 ? "36 to 40" :
    advancedFilters?.age41above ? "41 and above" : "No Preference"
  ),
  height: searchParams.get("height") || (
    advancedFilters?.height150below ? "150cm and below" :
    advancedFilters?.height151to155 ? "151cm to 155cm" :
    advancedFilters?.height156to160 ? "156cm to 160cm" :
    advancedFilters?.height161above ? "161cm and above" : "No Preference"
  ),
  experience: searchParams.get("experience") || (
    advancedFilters?.expHomeCountry ? "Home Country" :
    advancedFilters?.expSingapore ? "Singapore" :
    advancedFilters?.expMalaysia ? "Malaysia" :
    advancedFilters?.expHongKong ? "Hong Kong" :
    advancedFilters?.expTaiwan ? "Taiwan" :
    advancedFilters?.expMiddleEast ? "Middle East" :
    advancedFilters?.expOtherCountries ? "Other Countries" : "No Preference"
  ),
  duty: searchParams.get("duty") || (
    advancedFilters?.dutyCareInfant ? "Infant Care" :
    advancedFilters?.dutyCareYoungChildren ? "Young Children" :
    advancedFilters?.dutyCareElderlyDisabled ? "Elderly / Disabled" :
    advancedFilters?.dutyCooking ? "Cooking" :
    advancedFilters?.dutyGeneralHousekeeping ? "Housekeeping" : "No Preference"
  ),
  willingOffDays: searchParams.get("offDays") === "true" || Boolean(advancedFilters?.willingOffDays),
  hasChildren: searchParams.get("hasChildren") === "true" || Boolean(advancedFilters?.hasChildren),
  withVideo: searchParams.get("withVideo") === "true" || Boolean(advancedFilters?.withVideo),
});

const buildDraftFromSidebar = (filters: SidebarFilters): ClientDraft => ({
  keyword: filters.keyword,
  agencyPreference: "No Preference",
  biodataCreatedWithin: filters.biodataCreatedWithin,
  maidType: filters.maidType,
  willingOffDays: filters.willingOffDays,
  hasChildren: filters.hasChildren,
  withVideo: filters.withVideo,
  natFilipino: filters.nationality === "Filipino",
  natIndonesian: filters.nationality === "Indonesian",
  natMyanmar: filters.nationality === "Myanmar",
  natIndian: filters.nationality === "Indian",
  natSriLankan: filters.nationality === "Sri Lankan",
  natCambodian: filters.nationality === "Cambodian",
  natBangladeshi: filters.nationality === "Bangladeshi",
  natOthers: filters.nationality === "Others",
  natNoPreference: filters.nationality === "No Preference",
  expHomeCountry: filters.experience === "Home Country",
  expSingapore: filters.experience === "Singapore",
  expMalaysia: filters.experience === "Malaysia",
  expHongKong: filters.experience === "Hong Kong",
  expTaiwan: filters.experience === "Taiwan",
  expMiddleEast: filters.experience === "Middle East",
  expOtherCountries: filters.experience === "Other Countries",
  expNoPreference: filters.experience === "No Preference",
  dutyCareInfant: filters.duty === "Infant Care",
  dutyCareYoungChildren: filters.duty === "Young Children",
  dutyCareElderlyDisabled: filters.duty === "Elderly / Disabled",
  dutyCooking: filters.duty === "Cooking",
  dutyGeneralHousekeeping: filters.duty === "Housekeeping",
  dutyNoPreference: filters.duty === "No Preference",
  eduCollege: filters.education === "College / Degree",
  eduHighSchool: filters.education === "High School / Vocational",
  eduSecondary: filters.education === "Secondary",
  eduPrimary: filters.education === "Primary",
  eduNoPreference: filters.education === "No Preference",
  langEnglish: filters.language === "English",
  langMandarin: filters.language === "Mandarin",
  langBahasaIndonesia: filters.language === "Bahasa Indonesia / Malay",
  langHindi: filters.language === "Hindi",
  langTamil: filters.language === "Tamil",
  langNoPreference: filters.language === "No Preference" || filters.language === "Hokkien" || filters.language === "Cantonese",
  age21to25: filters.age === "21 to 25",
  age26to30: filters.age === "26 to 30",
  age31to35: filters.age === "31 to 35",
  age36to40: filters.age === "36 to 40",
  age41above: filters.age === "41 and above",
  ageNoPreference: filters.age === "No Preference",
  marSingle: filters.maritalStatus === "Single",
  marMarried: filters.maritalStatus === "Married",
  marWidowed: filters.maritalStatus === "Widowed",
  marDivorced: filters.maritalStatus === "Divorced",
  marSeparated: filters.maritalStatus === "Separated",
  marNoPreference: filters.maritalStatus === "No Preference",
  height150below: filters.height === "150cm and below",
  height151to155: filters.height === "151cm to 155cm",
  height156to160: filters.height === "156cm to 160cm",
  height161above: filters.height === "161cm and above",
  heightNoPreference: filters.height === "No Preference",
  relFreeThinker: filters.religion === "Free Thinker",
  relChristian: filters.religion === "Christian",
  relCatholic: filters.religion === "Catholic",
  relBuddhist: filters.religion === "Buddhist",
  relMuslim: filters.religion === "Muslim",
  relHindu: filters.religion === "Hindu",
  relSikh: filters.religion === "Sikh",
  relOthers: filters.religion === "Others",
  relNoPreference: filters.religion === "No Preference",
});

const matchesLanguage = (maid: MaidProfile, language: string) => {
  if (language === "No Preference") return true;
  const skills = Object.entries(maid.languageSkills || {})
    .filter(([, level]) => String(level || "").trim() && String(level || "").trim().toLowerCase() !== "zero")
    .map(([key]) => key.toLowerCase())
    .join(" ");
  const term = language.toLowerCase();
  if (term === "mandarin") return skills.includes("mandarin") || skills.includes("chinese");
  if (term === "bahasa indonesia / malay") return skills.includes("bahasa") || skills.includes("malay") || skills.includes("indonesia");
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
    case "hokkienCantonese": return matchesLanguage(maid, "Hokkien") || matchesLanguage(maid, "Cantonese");
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

const matchesHeight = (maid: MaidProfile, value: string) => {
  if (value === "No Preference") return true;
  const height = Number(maid.height || 0);
  if (!height) return false;
  if (value === "150cm and below") return height <= 150;
  if (value === "151cm to 155cm") return height >= 151 && height <= 155;
  if (value === "156cm to 160cm") return height >= 156 && height <= 160;
  if (value === "161cm and above") return height >= 161;
  return true;
};

const matchesDuty = (maid: MaidProfile, duty: string) => {
  if (duty === "No Preference") return true;
  const workAreas = maid.workAreas as Record<string, { willing?: boolean; experience?: boolean }>;
  const hasAny = (labels: string[]) =>
    labels.some((label) => {
      const entry = workAreas[label];
      return Boolean(entry?.willing || entry?.experience);
    });
  if (duty === "Infant Care") return hasAny(["Care of infants/children"]);
  if (duty === "Young Children") return hasAny(["Care of infants/children", "Care of young children"]);
  if (duty === "Elderly / Disabled") return hasAny(["Care of elderly", "Care of disabled"]);
  if (duty === "Cooking") return hasAny(["Cooking"]);
  if (duty === "Housekeeping") return hasAny(["General housework"]);
  return true;
};

const getPrimaryPhoto = (maid: MaidProfile) =>
  Array.isArray(maid.photoDataUrls) && maid.photoDataUrls.length > 0 ? maid.photoDataUrls[0] : maid.photoDataUrl || "";

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
  for (let index = Math.max(2, current - 1); index <= Math.min(total - 1, current + 1); index++) pages.push(index);
  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
};

// ─── Collapsible sidebar section ────────────────────────────────────────────
const CollapsibleSection = ({
  title,
  children,
  defaultOpen = true,
  badge,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: number;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-muted/40"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-primary">{title}</span>
          {badge !== undefined && badge > 0 && (
            <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
              {badge}
            </span>
          )}
        </div>
        <ChevronDown
          className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <div className="border-t border-border/60 px-4 pb-4 pt-3">{children}</div>}
    </div>
  );
};

// ─── Styled select ───────────────────────────────────────────────────────────
const FilterSelect = ({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) => (
  <label className="grid gap-1">
    <span className="text-[11px] font-semibold text-muted-foreground">{label}</span>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`h-9 w-full rounded-lg border px-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 ${
        value !== "No Preference" && value !== ""
          ? "border-primary/50 bg-primary/5 font-medium text-foreground"
          : "border-border bg-background text-foreground"
      }`}
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  </label>
);

// ─── Toggle chip ─────────────────────────────────────────────────────────────
const ToggleChip = ({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
      active
        ? "border-primary bg-primary text-primary-foreground shadow-sm"
        : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
    }`}
  >
    {label}
  </button>
);

// ─── Toggle switch row ───────────────────────────────────────────────────────
const SwitchRow = ({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) => (
  <label className="flex cursor-pointer items-center justify-between gap-2 py-1">
    <span className={`text-sm ${checked ? "font-medium text-foreground" : "text-muted-foreground"}`}>{label}</span>
    <div
      className={`relative h-5 w-9 rounded-full transition-colors ${checked ? "bg-primary" : "bg-muted"}`}
      onClick={() => onChange(!checked)}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all duration-200 ${
          checked ? "left-4" : "left-0.5"
        }`}
      />
    </div>
  </label>
);

// ─── Maid card (shared between grid and shortlist dialog) ────────────────────
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

  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="relative w-full bg-muted">
        {isLoggedIn ? (
          <Link
            to={`/maids/${encodeURIComponent(maid.referenceCode)}`}
            onClick={onNavigate}
          >
            {photo ? (
              <img
                src={photo}
                alt={maid.fullName}
                className="block h-auto w-full cursor-pointer object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              />
            ) : (
              <div className="flex aspect-[3/4] items-center justify-center bg-muted">
                <svg
                  className="h-8 w-8 text-muted-foreground/20"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" />
                </svg>
              </div>
            )}
          </Link>
        ) : (
          <div className="relative">
            <div className="blur-[8px] scale-[1.02]">
              {photo ? (
                <img
                  src={photo}
                  alt={maid.fullName}
                  className="block h-auto w-full object-cover"
                />
              ) : (
                <div className="flex aspect-[3/4] items-center justify-center bg-muted">
                  <svg
                    className="h-8 w-8 text-muted-foreground/20"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" />
                  </svg>
                </div>
              )}
            </div>
            <div className="absolute inset-0 bg-background/15 backdrop-blur-[1px]" />
          </div>
        )}

        {/* Type badge */}
        {maid.type && (
          <span
            className={`absolute left-1.5 top-1.5 rounded px-1.5 py-px text-[8px] font-bold uppercase tracking-wider text-white shadow ${typeBadgeColor}`}
          >
            {getTypeLabel(maid.type)}
          </span>
        )}

        {/* Shortlist button */}
        {isLoggedIn ? (
          <button
            onClick={() => onToggleShortlist(maid.referenceCode)}
            className={`absolute bottom-0 left-0 right-0 flex items-center justify-center gap-1 py-1.5 text-[9px] font-bold uppercase tracking-wide text-white transition-all ${
              isShortlisted
                ? "bg-amber-500"
                : "bg-black/60 opacity-0 group-hover:opacity-100"
            }`}
          >
            <Star className={`h-2.5 w-2.5 ${isShortlisted ? "fill-white" : ""}`} />
            {isShortlisted ? "Shortlisted" : "Shortlist"}
          </button>
        ) : (
          <div className="absolute inset-x-0 top-2 flex justify-center">
            <span className="rounded-full border border-primary/20 bg-background/90 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-primary shadow-sm backdrop-blur">
              Login to unlock
            </span>
          </div>
        )}
      </div>

      <div className={`flex flex-col gap-0.5 p-2 ${isLoggedIn ? "" : "blur-[6px] select-none"}`}>
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
      {!isLoggedIn && (
        <div className="px-2 pb-2">
          <Link
            to={loginPath}
            className="flex w-full items-center justify-center rounded-lg border border-primary/30 bg-background/90 px-2 py-1.5 text-[10px] font-semibold text-primary shadow-sm backdrop-blur hover:bg-background"
          >
            Log in to view full profile
          </Link>
        </div>
      )}
    </article>
  );
};

const MaidSearchPage = ({
  basePath = "/client/maids",
  loginPath = "/employer-login",
}: MaidSearchPageProps) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const advancedFilters = useMemo(() => parseAdvancedFilters(searchParams), [searchParams]);
  const advancedFiltersRaw = searchParams.get("filters") || "";
  const quickLink = (searchParams.get("quick") || "") as QuickLinkKey | "";
  const [filters, setFilters] = useState<SidebarFilters>(() => deriveSidebarFilters(searchParams, advancedFilters));
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

  const nationalityOptions = useMemo(
    () => ["No Preference", ...Array.from(new Set(allMaids.map((m) => normalizeNationality(String(m.nationality || ""))).filter(Boolean))).sort()],
    [allMaids],
  );
  const religionOptions = useMemo(
    () => ["No Preference", ...Array.from(new Set(allMaids.map((m) => normalizeReligion(String(m.religion || ""))).filter((v) => v && v !== "No Preference"))).sort()],
    [allMaids],
  );
  const maritalOptions = useMemo(
    () => ["No Preference", ...Array.from(new Set(allMaids.map((m) => String(m.maritalStatus || "").trim()).filter(Boolean))).sort()],
    [allMaids],
  );
  const educationOptions = useMemo(
    () => ["No Preference", ...Array.from(new Set(allMaids.map((m) => normalizeEducation(String(m.educationLevel || ""))).filter((v) => v && v !== "No Preference")))],
    [allMaids],
  );

  const languageOptions = ["No Preference", "English", "Mandarin", "Hokkien", "Cantonese", "Bahasa Indonesia / Malay", "Hindi", "Tamil"];
  const ageOptions = ["No Preference", "21 to 25", "26 to 30", "31 to 35", "36 to 40", "41 and above"];
  const heightOptions = ["No Preference", "150cm and below", "151cm to 155cm", "156cm to 160cm", "161cm and above"];
  const experienceOptions = ["No Preference", "Home Country", "Singapore", "Malaysia", "Hong Kong", "Taiwan", "Middle East", "Other Countries"];
  const dutyOptions = ["No Preference", "Infant Care", "Young Children", "Elderly / Disabled", "Cooking", "Housekeeping"];

  const filteredMaids = useMemo(() => {
    const draft = buildDraftFromSidebar(filters);
    let result = filterMaids(allMaids, draft);
    if (filters.language === "Hokkien" || filters.language === "Cantonese") {
      result = result.filter((m) => matchesLanguage(m, filters.language));
    }
    if (filters.height !== "No Preference") {
      result = result.filter((m) => matchesHeight(m, filters.height));
    }
    if (filters.duty !== "No Preference") {
      result = result.filter((m) => matchesDuty(m, filters.duty));
    }
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
    [allMaids, shortlistRefs],
  );
  const missingShortlistRefs = useMemo(
    () => shortlistRefs.filter((ref) => !shortlistedMaids.some((maid) => maid.referenceCode === ref)),
    [shortlistRefs, shortlistedMaids],
  );

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.keyword.trim()) count++;
    if (filters.maidType) count++;
    if (filters.biodataCreatedWithin !== "No Preference") count++;
    if (filters.nationality !== "No Preference") count++;
    if (filters.religion !== "No Preference") count++;
    if (filters.maritalStatus !== "No Preference") count++;
    if (filters.education !== "No Preference") count++;
    if (filters.language !== "No Preference") count++;
    if (filters.age !== "No Preference") count++;
    if (filters.height !== "No Preference") count++;
    if (filters.experience !== "No Preference") count++;
    if (filters.duty !== "No Preference") count++;
    if (filters.willingOffDays) count++;
    if (filters.hasChildren) count++;
    if (filters.withVideo) count++;
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
    if (filters.religion !== "No Preference") nextParams.set("religion", filters.religion);
    if (filters.maritalStatus !== "No Preference") nextParams.set("marital", filters.maritalStatus);
    if (filters.education !== "No Preference") nextParams.set("education", filters.education);
    if (filters.language !== "No Preference") nextParams.set("language", filters.language);
    if (filters.age !== "No Preference") nextParams.set("age", filters.age);
    if (filters.height !== "No Preference") nextParams.set("height", filters.height);
    if (filters.experience !== "No Preference") nextParams.set("experience", filters.experience);
    if (filters.duty !== "No Preference") nextParams.set("duty", filters.duty);
    if (filters.biodataCreatedWithin !== "No Preference") nextParams.set("biodata", filters.biodataCreatedWithin);
    if (filters.willingOffDays) nextParams.set("offDays", "true");
    if (filters.hasChildren) nextParams.set("hasChildren", "true");
    if (filters.withVideo) nextParams.set("withVideo", "true");
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

  const SidebarContent = () => (
    <div className="space-y-2.5">

      <CollapsibleSection title="Search" defaultOpen={true}>
        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={filters.keyword}
              onChange={(e) => setFilters((prev) => ({ ...prev, keyword: e.target.value }))}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Name, ref code, nationality…"
              className="h-9 w-full rounded-lg border border-border bg-background pl-8 pr-8 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            {filters.keyword && (
              <button
                type="button"
                onClick={() => setFilters((prev) => ({ ...prev, keyword: "" }))}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <FilterSelect
            label="Profile Created Within"
            value={filters.biodataCreatedWithin}
            onChange={(v) => setFilters((prev) => ({ ...prev, biodataCreatedWithin: v }))}
            options={["No Preference", "1 week", "2 weeks", "1 month", "3 months", "6 months", "1 year"]}
          />

          <div>
            <span className="mb-1.5 block text-[11px] font-semibold text-muted-foreground">Maid Type</span>
            <div className="flex flex-wrap gap-1.5">
              {MAID_TYPES.map((type) => (
                <ToggleChip
                  key={type}
                  label={type}
                  active={filters.maidType === type}
                  onClick={() => setFilters((prev) => ({ ...prev, maidType: prev.maidType === type ? "" : type }))}
                />
              ))}
            </div>
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="Personal Details"
        badge={[filters.nationality, filters.religion, filters.maritalStatus, filters.age, filters.height].filter((v) => v !== "No Preference").length}
      >
        <div className="space-y-3">
          <FilterSelect label="Nationality" value={filters.nationality} onChange={(v) => setFilters((p) => ({ ...p, nationality: v }))} options={nationalityOptions} />
          <FilterSelect label="Religion" value={filters.religion} onChange={(v) => setFilters((p) => ({ ...p, religion: v }))} options={religionOptions} />
          <FilterSelect label="Marital Status" value={filters.maritalStatus} onChange={(v) => setFilters((p) => ({ ...p, maritalStatus: v }))} options={maritalOptions} />
          <FilterSelect label="Age Group" value={filters.age} onChange={(v) => setFilters((p) => ({ ...p, age: v }))} options={ageOptions} />
          <FilterSelect label="Height" value={filters.height} onChange={(v) => setFilters((p) => ({ ...p, height: v }))} options={heightOptions} />
          <FilterSelect label="Education" value={filters.education} onChange={(v) => setFilters((p) => ({ ...p, education: v }))} options={educationOptions} />
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="Skills & Availability"
        badge={[filters.language, filters.duty, filters.experience].filter((v) => v !== "No Preference").length + (filters.willingOffDays ? 1 : 0) + (filters.hasChildren ? 1 : 0) + (filters.withVideo ? 1 : 0)}
      >
        <div className="space-y-3">
          <FilterSelect label="Language" value={filters.language} onChange={(v) => setFilters((p) => ({ ...p, language: v }))} options={languageOptions} />
          <FilterSelect label="Preferred Duty" value={filters.duty} onChange={(v) => setFilters((p) => ({ ...p, duty: v }))} options={dutyOptions} />
          <FilterSelect label="Work Experience" value={filters.experience} onChange={(v) => setFilters((p) => ({ ...p, experience: v }))} options={experienceOptions} />
          <div className="space-y-1 border-t border-border/50 pt-2">
            <SwitchRow label="Willing to work on off-days" checked={filters.willingOffDays} onChange={(v) => setFilters((p) => ({ ...p, willingOffDays: v }))} />
            <SwitchRow label="Has children" checked={filters.hasChildren} onChange={(v) => setFilters((p) => ({ ...p, hasChildren: v }))} />
            <SwitchRow label="Has video introduction" checked={filters.withVideo} onChange={(v) => setFilters((p) => ({ ...p, withVideo: v }))} />
          </div>
        </div>
      </CollapsibleSection>

      <div className="flex gap-2">
        <Button className="flex-1 rounded-xl" onClick={handleSearch}>
          <Search className="mr-1.5 h-3.5 w-3.5" />
          Search
          {activeFilterCount > 0 && (
            <span className="ml-1.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary-foreground/20 px-1 text-[10px] font-bold">
              {activeFilterCount}
            </span>
          )}
        </Button>
        {activeFilterCount > 0 && (
          <Button variant="outline" className="rounded-xl px-3" onClick={handleReset} title="Clear all filters">
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <p className="border-b border-border/60 px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
          Quick Browse
        </p>
        <div className="divide-y divide-border/40">
          {NATIONALITY_LINKS.map((label) => {
            // ✅ FIX: look up the key for this label, then compare directly to quickLink
            const linkKey = QUICK_LINKS_BY_LABEL[label];
            const isActive = !!quickLink && quickLink === linkKey;
            return (
              <button
                key={label}
                onClick={() => handleQuickLink(label)}
                className={`flex w-full items-center gap-2 px-4 py-2 text-left text-xs transition-colors ${
                  isActive
                    ? "bg-primary/10 font-semibold text-primary"
                    : "text-foreground hover:bg-muted/50 hover:text-primary"
                }`}
              >
                <span className="text-primary opacity-60">›</span>
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
        ),
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

        <aside className="hidden w-64 shrink-0 md:block lg:w-72">
          <div className="sticky top-4">
            <SidebarContent />
          </div>
        </aside>

        <main className="min-w-0 flex-1">

          {advancedFilters ? (
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Advanced filters applied</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Carried over from the client search page. Refine here or go back to edit.
                </p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link to={advancedFiltersRaw ? `${basePath}?filters=${encodeURIComponent(advancedFiltersRaw)}` : basePath}>
                  Edit Advanced Filters
                </Link>
              </Button>
            </div>
          ) : null}

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

          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
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
            </div>
            <PaginationBar />
          </div>

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
              <p className="mt-1 text-sm text-muted-foreground">Try adjusting your filters or search keywords.</p>
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

          {!isLoading && filteredMaids.length > 0 && (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Page <span className="font-medium text-foreground">{page}</span> of{" "}
                <span className="font-medium text-foreground">{totalPages}</span>
              </p>
              <PaginationBar />
            </div>
          )}

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
                        <svg
                          className="h-6 w-6 text-muted-foreground/25"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={1.5}
                        >
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

                  {/* Footer summary */}
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
                      onClick={() => {
                        shortlistRefs.forEach((ref) => handleToggleShortlist(ref));
                      }}
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
