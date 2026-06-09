import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronDown,
  Search,
  Sparkles,
  X,
  Users,
  CheckCircle2,
  Lock,
  MapPin,
  Star,
  Filter,
  Zap,
  ChevronRight,
  Globe,
  BookOpen,
  Heart,
  Shield,
  Clock,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "@/components/ui/sonner";
import { getClientAuthHeaders, getClientToken, getStoredClient } from "@/lib/clientAuth";
import { fetchAgencyOptions, type PublicAgencyOption } from "@/lib/agencies";
import { readSafeJson } from "@/lib/safeJson";
import PublicSiteNavbar from "@/components/PublicSiteNavbar";
import ClientPortalNavbar from "@/ClientPage/ClientPortalNavbar";
import "./ClientTheme.css";

// ── Nationality → ISO 3166-1 alpha-2 ─────────────────────────────────────────
const NATIONALITY_FLAGS: Record<string, string> = {
  filipino: "ph", philippines: "ph",
  indonesian: "id", indonesia: "id",
  myanmar: "mm", burmese: "mm",
  cambodian: "kh", cambodia: "kh",
  vietnamese: "vn", vietnam: "vn",
  thai: "th", thailand: "th",
  malaysian: "my", malaysia: "my",
  singaporean: "sg", singapore: "sg",
  indian: "in", india: "in",
  "sri lankan": "lk", "sri lanka": "lk",
  bangladeshi: "bd", bangladesh: "bd",
  nepali: "np", nepalese: "np", nepal: "np",
  pakistani: "pk", pakistan: "pk",
  chinese: "cn", china: "cn",
  hongkong: "hk", "hong kong": "hk",
  taiwanese: "tw", taiwan: "tw",
  korean: "kr", "south korea": "kr",
  japanese: "jp", japan: "jp",
  ethiopian: "et", ethiopia: "et",
  kenyan: "ke", kenya: "ke",
  ugandan: "ug", uganda: "ug",
  ghanaian: "gh", ghana: "gh",
  nigerian: "ng", nigeria: "ng",
};

const getNationalityCode = (nationality?: string): string => {
  if (!nationality) return "";
  const key = nationality.toLowerCase().trim();
  if (NATIONALITY_FLAGS[key]) return NATIONALITY_FLAGS[key];
  for (const [k, code] of Object.entries(NATIONALITY_FLAGS)) {
    if (key.includes(k)) return code;
  }
  return "";
};

const FlagCircle = ({ code }: { code: string }) => {
  if (!code) return null;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: 16, height: 16, borderRadius: "50%", overflow: "hidden",
      border: "1.5px solid rgba(0,0,0,0.12)", flexShrink: 0,
      verticalAlign: "middle", background: "#e5e7eb",
    }}>
      <img
        src={`https://flagcdn.com/w40/${code.toLowerCase()}.png`}
        alt={code}
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
      />
    </span>
  );
};

// ─────────────────────────────────────────────────────────────────────────────

interface Filters {
  keyword: string;
  agencyPreference: string;
  biodataCreatedWithin: string;
  maidType: string;
  willingOffDays: boolean;
  hasChildren: boolean;
  withVideo: boolean;
  natFilipino: boolean; natIndonesian: boolean; natMyanmar: boolean; natIndian: boolean;
  natSriLankan: boolean; natCambodian: boolean; natBangladeshi: boolean; natOthers: boolean;
  natNoPreference: boolean;
  expHomeCountry: boolean; expSingapore: boolean; expMalaysia: boolean; expHongKong: boolean;
  expTaiwan: boolean; expMiddleEast: boolean; expOtherCountries: boolean; expNoPreference: boolean;
  dutyCareInfant: boolean; dutyCareYoungChildren: boolean; dutyCareElderlyDisabled: boolean;
  dutyCooking: boolean; dutyGeneralHousekeeping: boolean; dutyNoPreference: boolean;
  eduCollege: boolean; eduHighSchool: boolean; eduSecondary: boolean; eduPrimary: boolean; eduNoPreference: boolean;
  langEnglish: boolean; langMandarin: boolean; langBahasaIndonesia: boolean; langHindi: boolean;
  langTamil: boolean; langNoPreference: boolean;
  age21to25: boolean; age26to30: boolean; age31to35: boolean; age36to40: boolean;
  age41above: boolean; ageNoPreference: boolean;
  marSingle: boolean; marMarried: boolean; marWidowed: boolean; marDivorced: boolean;
  marSeparated: boolean; marNoPreference: boolean;
  height150below: boolean; height151to155: boolean; height156to160: boolean; height161above: boolean;
  heightNoPreference: boolean;
  relFreeThinker: boolean; relChristian: boolean; relCatholic: boolean; relBuddhist: boolean;
  relMuslim: boolean; relHindu: boolean; relSikh: boolean; relOthers: boolean; relNoPreference: boolean;
}

type ClientMaidsPageProps = {
  resultsPath?: string;
  loginPath?: string;
  embedded?: boolean;
};

export interface MaidProfile {
  id: number | string;
  refCode?: string;
  name: string;
  photoUrl?: string;
  nationality: string;
  age?: number;
  maidType?: string;
  duties?: string[];
  languages?: string[];
  experience?: string[];
  maritalStatus?: string;
  education?: string;
  height?: string;
  religion?: string;
  hasVideo?: boolean;
  biodataCreatedAt?: string;
}

type RequirementsState = {
  noOffDay: boolean; hasChildren: boolean; married: boolean;
  newMaid: boolean; transferMaid: boolean; exSingaporeMaid: boolean;
};

const defaultFilters: Filters = {
  keyword: "", agencyPreference: "No Preference", biodataCreatedWithin: "No Preference", maidType: "",
  willingOffDays: false, hasChildren: false, withVideo: false,
  natFilipino: false, natIndonesian: false, natMyanmar: false, natIndian: false,
  natSriLankan: false, natCambodian: false, natBangladeshi: false, natOthers: false, natNoPreference: true,
  expHomeCountry: false, expSingapore: false, expMalaysia: false, expHongKong: false,
  expTaiwan: false, expMiddleEast: false, expOtherCountries: false, expNoPreference: true,
  dutyCareInfant: false, dutyCareYoungChildren: false, dutyCareElderlyDisabled: false,
  dutyCooking: false, dutyGeneralHousekeeping: false, dutyNoPreference: true,
  eduCollege: false, eduHighSchool: false, eduSecondary: false, eduPrimary: false, eduNoPreference: true,
  langEnglish: false, langMandarin: false, langBahasaIndonesia: false, langHindi: false,
  langTamil: false, langNoPreference: true,
  age21to25: false, age26to30: false, age31to35: false, age36to40: false,
  age41above: false, ageNoPreference: true,
  marSingle: false, marMarried: false, marWidowed: false, marDivorced: false,
  marSeparated: false, marNoPreference: true,
  height150below: false, height151to155: false, height156to160: false, height161above: false, heightNoPreference: true,
  relFreeThinker: false, relChristian: false, relCatholic: false, relBuddhist: false,
  relMuslim: false, relHindu: false, relSikh: false, relOthers: false, relNoPreference: true,
};

const defaultRequirements: RequirementsState = {
  noOffDay: false, hasChildren: false, married: false,
  newMaid: false, transferMaid: false, exSingaporeMaid: false,
};

const getPublicProfilePath = (maid: MaidProfile) =>
  maid.refCode ? `/maids/${encodeURIComponent(maid.refCode)}` : null;

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
  willingOffDays: "Off-days OK", hasChildren: "Has children", withVideo: "With video",
};

const NATIONALITY_OPTIONS = ["No Preference","Filipino","Indonesian","Indian","Sri Lankan","Myanmar","Cambodian","Bangladeshi","Nepali"] as const;
const PRIMARY_DUTY_OPTIONS = ["No Preference","Housekeeping","Elderly Care","Infant Care","Kid Care","Cooking","Other"] as const;
const AGE_GROUP_OPTIONS = ["No Preference","18–25","26–35","36–45","46+"] as const;
const LANGUAGE_OPTIONS = ["No Preference","English","Mandarin","Malay","Tamil","Tagalog","Bahasa Indonesia"] as const;

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
  const p = new URLSearchParams();
  p.set("filters", JSON.stringify(draft));
  if (draft.keyword.trim()) p.set("q", draft.keyword.trim());
  if (draft.maidType.trim()) p.set("type", draft.maidType.trim());
  const nat = getSelectedNationalityFromDraft(draft);
  if (nat) p.set("nationality", nat);
  const edu = getSelectedEducationFromDraft(draft);
  if (edu) p.set("education", edu);
  const lang = getSelectedLanguageFromDraft(draft);
  if (lang) p.set("language", lang);
  const age = getSelectedAgeFromDraft(draft);
  if (age) p.set("age", age);
  if (draft.willingOffDays) p.set("offDays", "true");
  if (draft.withVideo) p.set("withVideo", "true");
  return p;
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

// ── Pill chip ─────────────────────────────────────────────────────────────────
const Chip = ({
  label, checked, onChange,
  color = "primary",
}: {
  label: string; checked: boolean; onChange: () => void;
  color?: "primary" | "teal" | "blue" | "amber";
}) => {
  const activeStyle =
    color === "teal"  ? "border-teal-500 bg-teal-500 text-white shadow-sm" :
    color === "blue"  ? "border-blue-500 bg-blue-500 text-white shadow-sm" :
    color === "amber" ? "border-amber-500 bg-amber-500 text-white shadow-sm" :
    "border-teal-500 bg-teal-600 text-white shadow-sm";

  return (
    <button
      type="button"
      onClick={onChange}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all duration-150 select-none cursor-pointer ${
        checked
          ? activeStyle
          : "border-slate-200 bg-white text-slate-600 hover:border-teal-400 hover:bg-teal-50 hover:text-teal-700"
      }`}
    >
      {checked && <CheckCircle2 className="h-3 w-3 shrink-0" />}
      {label}
    </button>
  );
};

// ── Filter active tag ─────────────────────────────────────────────────────────
const FilterTag = ({ label, onRemove }: { label: string; onRemove: () => void }) => (
  <span className="inline-flex items-center gap-1 rounded-md border border-teal-300 bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-800">
    {label}
    <button
      type="button" onClick={onRemove}
      className="ml-0.5 flex items-center justify-center rounded p-0.5 transition-colors hover:text-red-500"
      aria-label={`Remove ${label}`}
    >
      <X className="h-2.5 w-2.5" />
    </button>
  </span>
);

// ── Accordion filter section ──────────────────────────────────────────────────
const FilterSection = ({
  title, children, count, defaultOpen = false, icon,
}: {
  title: string; children: React.ReactNode; count?: number;
  defaultOpen?: boolean; icon?: React.ReactNode;
}) => {
  const [open, setOpen] = useState(defaultOpen || (count !== undefined && count > 0));
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
      <button
        type="button" onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2.5 text-left hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon && <span className="text-teal-600">{icon}</span>}
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{title}</span>
          {count !== undefined && count > 0 && (
            <span className="inline-flex h-4 min-w-[16px] items-center justify-center rounded bg-teal-600 px-1 text-[9px] font-bold text-white">
              {count}
            </span>
          )}
        </div>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="flex flex-wrap gap-1.5 px-3 pb-3 pt-1">{children}</div>}
    </div>
  );
};

// ── Maid type badge ───────────────────────────────────────────────────────────
const getMaidTypeBadge = (maidType?: string) => {
  const t = (maidType || "").toLowerCase();
  if (t.includes("new"))      return { cls: "bg-teal-500 text-white",   label: "New" };
  if (t.includes("transfer")) return { cls: "bg-blue-500 text-white",   label: "Transfer" };
  return                               { cls: "bg-amber-500 text-white", label: "Ex-SG" };
};

// ── LOCKED maid card ──────────────────────────────────────────────────────────
const LockedMaidCard = ({ onLoginClick }: { onLoginClick: () => void }) => (
  <div
    onClick={onLoginClick}
    className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md hover:border-teal-300 cursor-pointer"
  >
    <div className="relative w-full bg-slate-100 select-none pointer-events-none" style={{ aspectRatio: "3/4" }}>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-100">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-200">
          <Lock className="h-5 w-5 text-slate-400" />
        </div>
        <div className="space-y-2 w-full px-4">
          <div className="h-2 w-3/4 mx-auto rounded bg-slate-200" />
          <div className="h-2 w-1/2 mx-auto rounded bg-slate-200" />
        </div>
      </div>
    </div>
    <div className="p-3 bg-white border-t border-slate-100">
      <p className="text-center text-[10px] font-bold text-teal-700 tracking-wide uppercase">🔒 Login to view</p>
    </div>
  </div>
);

// ── REAL maid card ────────────────────────────────────────────────────────────
const MaidCard = ({
  maid, onViewProfile, locked = false, onLoginClick,
}: {
  maid: MaidProfile; onViewProfile: (maid: MaidProfile) => void;
  locked?: boolean; onLoginClick?: () => void;
}) => {
  if (locked) return <LockedMaidCard onLoginClick={onLoginClick ?? (() => {})} />;
  const flagCode = getNationalityCode(maid.nationality);
  const badge = getMaidTypeBadge(maid.maidType);

  return (
    <div
      onClick={() => onViewProfile(maid)}
      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:shadow-xl hover:border-teal-400 hover:-translate-y-1 cursor-pointer"
    >
      <div className="relative w-full bg-slate-100" style={{ aspectRatio: "3/4" }}>
        {maid.photoUrl ? (
          <img
            src={maid.photoUrl} alt={maid.name}
            className="block w-full h-full object-cover object-top"
            loading="lazy" decoding="async"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-teal-50">
            <Users className="h-8 w-8 text-teal-200" />
          </div>
        )}

        {/* Bottom gradient */}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/60 to-transparent" />

        {/* Maid type badge */}
        {maid.maidType && (
          <div className="absolute top-2 left-2">
            <span className={`inline-block px-2 py-0.5 text-[9px] font-black rounded tracking-wider uppercase ${badge.cls}`}>
              {badge.label}
            </span>
          </div>
        )}

        {/* Video badge */}
        {maid.hasVideo && (
          <div className="absolute top-2 right-2">
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold rounded bg-violet-600 text-white">
              ▶ Video
            </span>
          </div>
        )}

        {/* Name overlay */}
        <div className="absolute bottom-2 left-2 right-2">
          <p className="text-[11px] font-bold text-white drop-shadow line-clamp-1">{maid.name}</p>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 p-2.5">
        {maid.refCode && (
          <p className="text-[9px] text-slate-400 font-mono tracking-widest uppercase">{maid.refCode}</p>
        )}
        <div className="flex flex-wrap gap-1">
          {maid.nationality && (
            <span className="inline-flex items-center gap-1 bg-slate-100 rounded px-2 py-0.5 text-[10px] text-slate-700 font-semibold">
              <FlagCircle code={flagCode} />
              {maid.nationality}
            </span>
          )}
          {maid.age && (
            <span className="bg-slate-100 rounded px-2 py-0.5 text-[10px] text-slate-700 font-semibold">
              {maid.age}y
            </span>
          )}
        </div>
        {maid.duties?.slice(0, 1).map((d) => (
          <span key={d} className="rounded bg-teal-50 border border-teal-200 px-2 py-0.5 text-[10px] text-teal-700 font-semibold w-fit">
            {d}
          </span>
        ))}
      </div>
    </div>
  );
};

// ── Login gate banner ─────────────────────────────────────────────────────────
const LoginGateBanner = ({ onLoginClick }: { onLoginClick: () => void }) => (
  <div className="overflow-hidden rounded-2xl border-2 border-amber-200 bg-amber-50 shadow-sm">
    <div className="grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-6 sm:p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500 shadow-md">
          <Lock className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="font-black text-amber-900 text-base leading-snug">Profiles are hidden until you log in</p>
          <p className="mt-1 text-sm text-amber-700 leading-relaxed">
            Create a free account or log in to view names, photos, full biodata, and contact details.
          </p>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col">
        <button
          onClick={onLoginClick}
          className="flex-1 sm:flex-none rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-sm px-5 py-2.5 transition-colors shadow-sm"
        >
          Log in to unlock
        </button>
        <button
          onClick={onLoginClick}
          className="flex-1 sm:flex-none rounded-xl border-2 border-amber-300 bg-white hover:bg-amber-50 text-amber-800 font-bold text-sm px-5 py-2.5 transition-colors"
        >
          Create account
        </button>
      </div>
    </div>
  </div>
);

// ── Request Form ──────────────────────────────────────────────────────────────
interface RequestFormProps { prefillFilters: Filters; onBack: () => void; }

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
    name: storedClient?.name || "", email: storedClient?.email || "",
    phone: storedClient?.phone || "", agencyId: "",
    nationality: derivedNationality, primaryDuty: derivedDuty,
    ageGroup: derivedAgeGroup, language: derivedLanguage, otherRequirements: "",
  });
  const [agencyOptions, setAgencyOptions] = useState<PublicAgencyOption[]>([]);
  const [requirements, setRequirements] = useState<RequirementsState>({
    ...defaultRequirements,
    hasChildren: prefillFilters.hasChildren, married: prefillFilters.marMarried,
    newMaid: prefillFilters.maidType === "New Maid",
    transferMaid: prefillFilters.maidType === "Transfer Maid",
    exSingaporeMaid: prefillFilters.maidType === "Ex-Singapore Maid",
  });

  const highlights = useMemo(() => getRequestHighlights(prefillFilters), [prefillFilters]);

  useEffect(() => {
    void fetchAgencyOptions().then(setAgencyOptions).catch(() => setAgencyOptions([]));
  }, []);

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
        ...(storedClient?.id != null && { clientId: storedClient.id }),
        agencyId: form.agencyId ? Number(form.agencyId) : 1,
        type: "general",
        details: {
          clientName: form.name.trim(), clientEmail: form.email.trim(), clientPhone: form.phone.trim(),
          nationality: form.nationality, primaryDuty: form.primaryDuty, ageGroup: form.ageGroup,
          language: form.language,
          ...(form.otherRequirements.trim() && { otherRequirements: form.otherRequirements.trim() }),
          ...(requirementsList.length > 0 && { requirements: requirementsList.join(", ") }),
        },
      };
      const response = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getClientAuthHeaders() },
        body: JSON.stringify(payload),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!response.ok) throw new Error(data.error || data.message || `Request failed (${response.status})`);
      toast.success("Your request has been sent to the agency!");
      setRequirements(defaultRequirements);
      setForm((prev) => ({
        ...prev, agencyId: "", nationality: derivedNationality,
        primaryDuty: derivedDuty, ageGroup: derivedAgeGroup,
        language: derivedLanguage, otherRequirements: "",
      }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all";
  const selectClass = "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all appearance-none cursor-pointer";
  const labelClass = "block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5";

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
      {/* Header */}
      <div
        className="px-6 py-6 sm:px-7"
        style={{ background: "linear-gradient(135deg, #0f4c5c 0%, #0d6b79 50%, #0a8a85 100%)" }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 mb-3">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              <span className="text-xs font-bold text-white/80 tracking-wide">Agency Matching</span>
            </div>
            <h2 className="text-xl font-black text-white leading-tight">Request Agency Help</h2>
            <p className="mt-1.5 text-sm text-teal-200 max-w-sm">
              Send your requirements and our team will personally match the best candidates for you.
            </p>
          </div>
          <button
            type="button" onClick={onBack}
            className="shrink-0 flex items-center gap-1.5 rounded-xl border border-white/25 bg-white/10 hover:bg-white/20 px-3 py-2 text-xs font-bold text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>
        </div>

        {highlights.length > 0 && (
          <div className="mt-4 rounded-xl border border-white/20 bg-white/10 p-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-teal-200 mb-2">Pre-filled from your filters</p>
            <div className="flex flex-wrap gap-1.5">
              {highlights.map((item) => (
                <span key={item} className="rounded-lg border border-white/25 bg-white/15 px-2.5 py-1 text-xs font-semibold text-white">
                  {item}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="divide-y divide-slate-100">
        {/* Step 1 – Contact */}
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-600 text-xs font-black text-white">1</span>
            <p className="text-sm font-black text-slate-800">Your Contact Details</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Full Name <span className="text-red-500 normal-case text-xs font-normal">*</span></label>
              <input className={inputClass} placeholder="e.g. Sarah Tan" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
            </div>
            <div>
              <label className={labelClass}>Email Address <span className="text-red-500 normal-case text-xs font-normal">*</span></label>
              <input type="email" className={inputClass} placeholder="you@example.com" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} required />
            </div>
            <div>
              <label className={labelClass}>Phone Number <span className="text-red-500 normal-case text-xs font-normal">*</span></label>
              <input className={inputClass} placeholder="+65 9123 4567" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} required />
            </div>
            <div>
              <label className={labelClass}>Agency <span className="text-red-500 normal-case text-xs font-normal">*</span></label>
              <div className="relative">
                <select className={selectClass} value={form.agencyId} onChange={(e) => setForm((p) => ({ ...p, agencyId: e.target.value }))} required>
                  <option value="">Choose an agency</option>
                  {agencyOptions.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Step 2 – Preferences */}
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-600 text-xs font-black text-white">2</span>
            <p className="text-sm font-black text-slate-800">Maid Preferences</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { label: "Nationality", key: "nationality", options: NATIONALITY_OPTIONS },
              { label: "Primary Duty", key: "primaryDuty", options: PRIMARY_DUTY_OPTIONS },
              { label: "Age Group", key: "ageGroup", options: AGE_GROUP_OPTIONS },
              { label: "Language", key: "language", options: LANGUAGE_OPTIONS },
            ].map(({ label, key, options }) => (
              <div key={key}>
                <label className={labelClass}>{label}</label>
                <div className="relative">
                  <select
                    className={selectClass}
                    value={form[key as keyof typeof form] as string}
                    onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                  >
                    {options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Step 3 – Requirements */}
        <div className="p-5 sm:p-6 space-y-3">
          <div className="flex items-center gap-3 mb-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-600 text-xs font-black text-white">3</span>
            <p className="text-sm font-black text-slate-800">Special Requirements</p>
          </div>
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
                key={item.key} label={item.label}
                checked={requirements[item.key]}
                onChange={() => setRequirements((p) => ({ ...p, [item.key]: !p[item.key] }))}
              />
            ))}
          </div>
          <div className="mt-2">
            <label className={labelClass}>Additional Notes</label>
            <textarea
              value={form.otherRequirements}
              onChange={(e) => setForm((p) => ({ ...p, otherRequirements: e.target.value }))}
              placeholder="Any specific requirements, household details, or special needs…"
              rows={3}
              className={`${inputClass} resize-none`}
            />
          </div>
        </div>

        {/* Submit */}
        <div className="flex flex-col-reverse gap-3 px-5 py-4 sm:flex-row sm:justify-end sm:px-6 bg-slate-50">
          <button
            type="button" onClick={onBack}
            className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center justify-center gap-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-60 px-8 py-2.5 text-sm font-black text-white transition-colors shadow-md shadow-teal-200 min-w-[160px]"
          >
            {isSubmitting ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Submitting…
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" />
                Submit Request
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

// ── Search Results ────────────────────────────────────────────────────────────
const SearchResults = ({
  maids, isLoggedIn, isLoading, onLoginClick, onViewProfile,
}: {
  maids: MaidProfile[]; isLoggedIn: boolean; isLoading: boolean;
  onLoginClick: () => void; onViewProfile: (maid: MaidProfile) => void;
}) => {
  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-3 text-slate-400">
            <span className="h-9 w-9 animate-spin rounded-full border-[3px] border-slate-200 border-t-teal-600" />
            <span className="text-sm font-semibold">Finding matches…</span>
          </div>
        </div>
      </div>
    );
  }

  if (maids.length === 0) {
    return (
      <div className="overflow-hidden rounded-2xl border-2 border-dashed border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-center px-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
            <Search className="h-7 w-7 text-slate-400" />
          </div>
          <div>
            <p className="text-base font-black text-slate-800">No profiles found</p>
            <p className="mt-1 text-sm text-slate-500">Try adjusting your filters or broadening your search.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {!isLoggedIn && <LoginGateBanner onLoginClick={onLoginClick} />}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-600">
              <Users className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-black text-slate-800">
              {maids.length} profile{maids.length !== 1 ? "s" : ""} found
            </span>
          </div>
          {!isLoggedIn && (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
              <Lock className="h-3 w-3" />
              <span className="hidden sm:inline">Log in to see full details</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 p-4 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
          {maids.map((maid) => (
            <MaidCard
              key={maid.id} maid={maid} onViewProfile={onViewProfile}
              locked={!isLoggedIn} onLoginClick={onLoginClick}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// ── Stat pill ─────────────────────────────────────────────────────────────────
const StatPill = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="flex items-center gap-2.5 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2.5 backdrop-blur-sm">
    <div className="text-teal-300">{icon}</div>
    <div>
      <p className="text-sm font-black text-white leading-none">{value}</p>
      <p className="text-[10px] text-teal-300 leading-none mt-0.5 font-medium">{label}</p>
    </div>
  </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────
const ClientMaidsPage = ({
  resultsPath = "/client/maids/search",
  loginPath = "/employer-login",
  embedded = false,
}: ClientMaidsPageProps) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestRef = useRef<HTMLDivElement | null>(null);
  const initialDraft = useMemo(() => parseDraftFromSearchParams(searchParams) ?? defaultFilters, [searchParams]);

  const [draft, setDraft] = useState<Filters>(initialDraft);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [requestOpen, setRequestOpen] = useState(searchParams.get("intent") === "request");
  const [searchedFilters, setSearchedFilters] = useState<Filters>(initialDraft);
  const [searchResults, setSearchResults] = useState<MaidProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const isLoggedIn = !!getClientToken();

  useEffect(() => {
    const nextDraft = parseDraftFromSearchParams(searchParams);
    if (nextDraft) { setDraft(nextDraft); setSearchedFilters(nextDraft); }
    setRequestOpen(searchParams.get("intent") === "request");
  }, [searchParams]);

  useEffect(() => {
    if (!requestOpen) return;
    requestRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [requestOpen]);

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
    if (draft.biodataCreatedWithin !== "No Preference")
      tags.push({ key: "biodataCreatedWithin", label: `Within: ${draft.biodataCreatedWithin}` });
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
      const group = PREFERENCE_GROUPS.find((item) =>
        (item.specifics as readonly (keyof Filters)[]).includes(key)
      );
      if (!group) return { ...prev, [key]: nextValue };
      const next = { ...prev, [key]: nextValue, [group.noPreference]: false };
      const allOff = (group.specifics as readonly (keyof Filters)[]).every((groupKey) =>
        groupKey === key ? !nextValue : !prev[groupKey]
      );
      if (allOff) next[group.noPreference] = true;
      return next;
    });

  const countGroup = (keys: readonly (keyof Filters)[]) =>
    keys.filter((key) => draft[key] === true).length;

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
    const group = PREFERENCE_GROUPS.find((item) =>
      (item.specifics as readonly (keyof Filters)[]).includes(key)
    );
    if (group) { toggle(key); return; }
    set(key, false);
  };

  const clearAllFilters = () => {
    setDraft(defaultFilters); setSearchedFilters(defaultFilters);
    setHasSearched(false); setSearchResults([]);
    if (requestOpen) {
      setSearchParams(new URLSearchParams([["intent","request"],["filters",JSON.stringify(defaultFilters)]]), { replace: true });
      return;
    }
    setSearchParams(new URLSearchParams([["filters",JSON.stringify(defaultFilters)]]), { replace: true });
  };

  const handleSearch = async () => {
    setRequestOpen(false); setSearchedFilters(draft);
    setHasSearched(true); setIsSearching(true);
    const params = buildSearchParamsFromFilters(draft);
    navigate(`${resultsPath}?${params.toString()}`);
    try {
      const response = await fetch(`/api/maids?${params.toString()}`, {
        headers: { ...(getClientToken() ? { Authorization: `Bearer ${getClientToken()}` } : {}) },
      });
      const data = await readSafeJson<{ maids?: MaidProfile[]; data?: MaidProfile[]; error?: string }>(response);
      if (!response.ok) throw new Error(data.error || "Search failed");
      setSearchResults(data.maids ?? data.data ?? []);
    } catch {
      toast.error("Failed to load profiles. Please try again.");
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleViewProfile = (maid: MaidProfile) => {
    const profilePath = getPublicProfilePath(maid);
    if (!profilePath) { toast.error("Profile link is unavailable for this maid."); return; }
    navigate(profilePath);
  };

  const handleOpenRequest = () => {
    setSearchedFilters(draft); setRequestOpen(true); syncPageState("request");
  };

  const handleCloseRequest = () => {
    setRequestOpen(false); syncPageState();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleLoginClick = () => navigate(loginPath);

  return (
    <div className="client-page-theme min-h-screen" style={{ background: "#f8fafc" }}>
      {!embedded && (isLoggedIn ? <ClientPortalNavbar /> : <PublicSiteNavbar />)}

      {/* ── Hero ── */}
      <div
        className="relative overflow-hidden px-4 py-10 sm:py-14 sm:px-6"
        style={{ background: "linear-gradient(135deg, #0a2540 0%, #0f4c5c 45%, #0d6b79 100%)" }}
      >
        {/* Subtle geometric accents */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -right-24 h-80 w-80 rounded-full bg-teal-400/10 blur-3xl" />
          <div className="absolute top-1/2 -left-16 h-48 w-48 rounded-full bg-amber-400/10 blur-2xl" />
          <div className="absolute bottom-0 right-1/3 h-32 w-32 rounded-full bg-teal-300/10 blur-2xl" />
        </div>

        <div className="relative mx-auto max-w-5xl">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              {/* Eyebrow */}
              <div className="inline-flex items-center gap-2 rounded-full border border-teal-400/30 bg-teal-400/10 px-3.5 py-1.5 mb-4">
                <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                <span className="text-xs font-bold text-teal-200 tracking-wide">500+ Verified Profiles</span>
              </div>

              <h1 className="text-3xl font-black text-white leading-[1.1] sm:text-4xl xl:text-5xl">
                Find Your Perfect
                <br />
                <span className="text-amber-400">Domestic Helper</span>
              </h1>
              <p className="mt-3 max-w-lg text-sm text-teal-200 leading-relaxed sm:text-base">
                Browse verified profiles with advanced filters, or let our expert team personally shortlist the best candidates for your household.
              </p>

              {/* How it works */}
              <div className="mt-5 flex flex-wrap gap-2">
                {[
                  { n: "1", label: "Set Filters" },
                  { n: "2", label: "Browse Profiles" },
                  { n: "3", label: "Request Help" },
                ].map(({ n, label }) => (
                  <span key={n} className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/8 px-3.5 py-2 text-xs font-semibold text-white/80 backdrop-blur-sm"
                    style={{ background: "rgba(255,255,255,0.07)" }}>
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-[10px] font-black text-slate-900">{n}</span>
                    {label}
                  </span>
                ))}
              </div>
            </div>

            {/* Trust stats */}
            <div className="flex flex-row flex-wrap gap-2 lg:flex-col lg:gap-2.5">
              <StatPill icon={<Shield className="h-4 w-4" />} value="100%" label="Verified profiles" />
              <StatPill icon={<Clock className="h-4 w-4" />} value="24 hrs" label="Avg. response time" />
              <StatPill icon={<Heart className="h-4 w-4" />} value="98%" label="Satisfaction rate" />
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-5 sm:px-6 sm:py-7">

        {/* ── Filter Panel ── */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* Panel header */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-600">
                <Filter className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-black text-slate-800">Search Filters</span>
              {activeFilterCount > 0 && (
                <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded bg-teal-600 px-1.5 text-[10px] font-black text-white">
                  {activeFilterCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {activeFilterCount > 0 && (
                <button
                  type="button" onClick={clearAllFilters}
                  className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-600 transition-colors hover:bg-red-100"
                >
                  <X className="h-3 w-3" />
                  <span className="hidden xs:inline">Clear all</span>
                </button>
              )}
              <button
                type="button" onClick={() => setFiltersOpen((v) => !v)}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100"
              >
                <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${filtersOpen ? "rotate-180" : ""}`} />
                <span className="hidden xs:inline">{filtersOpen ? "Collapse" : "Expand"}</span>
              </button>
            </div>
          </div>

          {/* Active filter tags */}
          {activeTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 border-b border-slate-100 bg-teal-50/60 px-4 py-2.5">
              {activeTags.map(({ key, label }) => (
                <FilterTag key={`${key}-${label}`} label={label} onRemove={() => removeTag(key)} />
              ))}
            </div>
          )}

          {filtersOpen && (
            <div className="divide-y divide-slate-100">
              {/* Primary search fields */}
              <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
                {/* Keyword */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Keyword Search</label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={draft.keyword}
                      onChange={(e) => set("keyword", e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && void handleSearch()}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
                      placeholder="Name, ref code, nationality…"
                    />
                    {draft.keyword && (
                      <button type="button" onClick={() => set("keyword", "")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Biodata created within */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Profile Created Within</label>
                  <div className="relative">
                    <select
                      value={draft.biodataCreatedWithin}
                      onChange={(e) => set("biodataCreatedWithin", e.target.value)}
                      className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all cursor-pointer"
                    >
                      <option>No Preference</option>
                      <option>1 week</option><option>2 weeks</option>
                      <option>1 month</option><option>3 months</option>
                      <option>6 months</option><option>1 year</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  </div>
                </div>

                {/* Maid type */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Maid Type</label>
                  <div className="flex flex-wrap gap-2">
                    {(["New Maid","Transfer Maid","Ex-Singapore Maid"] as const).map((type) => (
                      <Chip key={type} label={type} checked={draft.maidType === type}
                        onChange={() => set("maidType", draft.maidType === type ? "" : type)}
                        color={type === "New Maid" ? "teal" : type === "Transfer Maid" ? "blue" : "amber"}
                      />
                    ))}
                  </div>
                </div>

                {/* Quick filters */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Quick Filters</label>
                  <div className="flex flex-wrap gap-2">
                    {([
                      ["willingOffDays","🌟 Off-days OK"],
                      ["hasChildren","👶 Has Children"],
                      ["withVideo","🎥 Has Video"],
                    ] as [keyof Filters, string][]).map(([key, label]) => (
                      <Chip key={key} label={label} checked={!!draft[key]} onChange={() => toggle(key)} />
                    ))}
                  </div>
                </div>
              </div>

              {/* Detailed filters */}
              <div className="p-4 sm:p-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Detailed Preferences</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">

                  <FilterSection
                    title="Nationality"
                    count={countGroup(["natFilipino","natIndonesian","natMyanmar","natIndian","natSriLankan","natCambodian","natBangladeshi","natOthers"])}
                    defaultOpen
                    icon={<Globe className="h-3.5 w-3.5" />}
                  >
                    {[["natFilipino","Filipino"],["natIndonesian","Indonesian"],["natMyanmar","Myanmar"],["natIndian","Indian"],["natSriLankan","Sri Lankan"],["natCambodian","Cambodian"],["natBangladeshi","Bangladeshi"],["natOthers","Others"]].map(([k,l]) => (
                      <Chip key={k} label={l} checked={!!draft[k as keyof Filters]} onChange={() => toggle(k as keyof Filters)} />
                    ))}
                  </FilterSection>

                  <FilterSection
                    title="Work Experience"
                    count={countGroup(["expHomeCountry","expSingapore","expMalaysia","expHongKong","expTaiwan","expMiddleEast","expOtherCountries"])}
                    defaultOpen
                    icon={<MapPin className="h-3.5 w-3.5" />}
                  >
                    {[["expHomeCountry","Home Country"],["expSingapore","Singapore"],["expMalaysia","Malaysia"],["expHongKong","Hong Kong"],["expTaiwan","Taiwan"],["expMiddleEast","Middle East"],["expOtherCountries","Others"]].map(([k,l]) => (
                      <Chip key={k} label={l} checked={!!draft[k as keyof Filters]} onChange={() => toggle(k as keyof Filters)} />
                    ))}
                  </FilterSection>

                  <FilterSection
                    title="Duties"
                    count={countGroup(["dutyCareInfant","dutyCareYoungChildren","dutyCareElderlyDisabled","dutyCooking","dutyGeneralHousekeeping"])}
                    defaultOpen
                    icon={<Heart className="h-3.5 w-3.5" />}
                  >
                    {[["dutyCareInfant","Infant Care"],["dutyCareYoungChildren","Young Children"],["dutyCareElderlyDisabled","Elderly / Disabled"],["dutyCooking","Cooking"],["dutyGeneralHousekeeping","Housekeeping"]].map(([k,l]) => (
                      <Chip key={k} label={l} checked={!!draft[k as keyof Filters]} onChange={() => toggle(k as keyof Filters)} />
                    ))}
                  </FilterSection>

                  <FilterSection
                    title="Language"
                    count={countGroup(["langEnglish","langMandarin","langBahasaIndonesia","langHindi","langTamil"])}
                  >
                    {[["langEnglish","English"],["langMandarin","Mandarin"],["langBahasaIndonesia","Bahasa / Malay"],["langHindi","Hindi"],["langTamil","Tamil"]].map(([k,l]) => (
                      <Chip key={k} label={l} checked={!!draft[k as keyof Filters]} onChange={() => toggle(k as keyof Filters)} />
                    ))}
                  </FilterSection>

                  <FilterSection
                    title="Age Group"
                    count={countGroup(["age21to25","age26to30","age31to35","age36to40","age41above"])}
                  >
                    {[["age21to25","21–25"],["age26to30","26–30"],["age31to35","31–35"],["age36to40","36–40"],["age41above","41+"]].map(([k,l]) => (
                      <Chip key={k} label={l} checked={!!draft[k as keyof Filters]} onChange={() => toggle(k as keyof Filters)} />
                    ))}
                  </FilterSection>

                  <FilterSection
                    title="Marital Status"
                    count={countGroup(["marSingle","marMarried","marWidowed","marDivorced","marSeparated"])}
                  >
                    {[["marSingle","Single"],["marMarried","Married"],["marWidowed","Widowed"],["marDivorced","Divorced"],["marSeparated","Separated"]].map(([k,l]) => (
                      <Chip key={k} label={l} checked={!!draft[k as keyof Filters]} onChange={() => toggle(k as keyof Filters)} />
                    ))}
                  </FilterSection>

                  <FilterSection
                    title="Education"
                    count={countGroup(["eduCollege","eduHighSchool","eduSecondary","eduPrimary"])}
                    icon={<BookOpen className="h-3.5 w-3.5" />}
                  >
                    {[["eduCollege","College / Degree"],["eduHighSchool","High School"],["eduSecondary","Secondary"],["eduPrimary","Primary Level"]].map(([k,l]) => (
                      <Chip key={k} label={l} checked={!!draft[k as keyof Filters]} onChange={() => toggle(k as keyof Filters)} />
                    ))}
                  </FilterSection>

                  <FilterSection
                    title="Height"
                    count={countGroup(["height150below","height151to155","height156to160","height161above"])}
                  >
                    {[["height150below","≤150 cm"],["height151to155","151–155 cm"],["height156to160","156–160 cm"],["height161above","161+ cm"]].map(([k,l]) => (
                      <Chip key={k} label={l} checked={!!draft[k as keyof Filters]} onChange={() => toggle(k as keyof Filters)} />
                    ))}
                  </FilterSection>

                  <FilterSection
                    title="Religion"
                    count={countGroup(["relFreeThinker","relChristian","relCatholic","relBuddhist","relMuslim","relHindu","relSikh","relOthers"])}
                  >
                    {[["relFreeThinker","Free Thinker"],["relChristian","Christian"],["relCatholic","Catholic"],["relBuddhist","Buddhist"],["relMuslim","Muslim"],["relHindu","Hindu"],["relSikh","Sikh"],["relOthers","Others"]].map(([k,l]) => (
                      <Chip key={k} label={l} checked={!!draft[k as keyof Filters]} onChange={() => toggle(k as keyof Filters)} />
                    ))}
                  </FilterSection>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col gap-3 bg-slate-50 p-4 sm:flex-row sm:p-5">
                <button
                  type="button"
                  onClick={() => void handleSearch()}
                  className="flex flex-1 sm:flex-none sm:min-w-[180px] items-center justify-center gap-2.5 rounded-xl px-6 py-3 text-sm font-black text-white transition-all shadow-md shadow-teal-200/60"
                  style={{ background: "linear-gradient(135deg, #0d6b79, #0a8a85)" }}
                >
                  <Search className="h-4 w-4" />
                  Search Maids
                  {activeFilterCount > 0 && (
                    <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded bg-white/25 px-1.5 text-[10px] font-black">{activeFilterCount}</span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleOpenRequest}
                  className="flex flex-1 sm:flex-none items-center justify-center gap-2 rounded-xl border-2 border-amber-400 bg-amber-50 hover:bg-amber-100 px-5 py-3 text-sm font-black text-amber-900 transition-colors"
                >
                  <Sparkles className="h-4 w-4 text-amber-600" />
                  Request Agency Help
                </button>

                {activeFilterCount > 0 && (
                  <button
                    type="button" onClick={clearAllFilters}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-white hover:bg-red-50 px-4 py-3 text-sm font-bold text-red-600 transition-colors sm:ml-auto"
                  >
                    <X className="h-3.5 w-3.5" />
                    Clear
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Search Results ── */}
        {hasSearched && (
          <SearchResults
            maids={searchResults} isLoggedIn={isLoggedIn}
            isLoading={isSearching} onLoginClick={handleLoginClick}
            onViewProfile={handleViewProfile}
          />
        )}

        {/* ── Agency CTA ── */}
        {!requestOpen && (
          <div
            className="overflow-hidden rounded-2xl shadow-xl"
            style={{ background: "linear-gradient(135deg, #0a2540 0%, #0f4c5c 55%, #0a8a85 100%)" }}
          >
            <div className="relative overflow-hidden">
              {/* Decorative blobs */}
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute -top-16 -right-16 h-56 w-56 rounded-full bg-amber-400/15 blur-3xl" />
                <div className="absolute bottom-0 left-0 h-40 w-40 rounded-full bg-teal-400/15 blur-2xl" />
              </div>

              <div className="relative grid gap-6 p-6 sm:grid-cols-[1fr_auto] sm:items-center sm:p-8">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/15 px-3.5 py-1.5 mb-4">
                    <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                    <span className="text-xs font-bold text-amber-300 tracking-wide">Prefer a personal touch?</span>
                  </div>
                  <h2 className="text-xl font-black text-white sm:text-2xl leading-snug">
                    Let the agency shortlist for you.
                  </h2>
                  <p className="mt-2 max-w-md text-sm text-teal-200 leading-relaxed">
                    Skip browsing — send your requirements and get curated, expert-matched candidates within 48 hours.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {["Free service","Expert matching","48 hr turnaround"].map((feat) => (
                      <span key={feat} className="flex items-center gap-1.5 rounded-lg bg-white/10 border border-white/15 px-3 py-1.5 text-xs font-semibold text-white">
                        <CheckCircle2 className="h-3 w-3 text-teal-300" />
                        {feat}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="shrink-0">
                  {requestHighlights.length > 0 && (
                    <div className="mb-4 rounded-xl border border-white/15 bg-white/8 p-3.5 sm:w-56" style={{ background: "rgba(255,255,255,0.07)" }}>
                      <p className="text-[10px] font-black uppercase tracking-widest text-teal-300 mb-2.5">Your current filters</p>
                      <div className="flex flex-wrap gap-1.5">
                        {requestHighlights.slice(0, 4).map((item) => (
                          <span key={item} className="rounded-lg border border-white/20 bg-white/10 px-2.5 py-1 text-[10px] font-semibold text-white">
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <button
                    type="button" onClick={handleOpenRequest}
                    className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-amber-400 hover:bg-amber-300 active:bg-amber-500 px-6 py-3.5 text-sm font-black text-slate-900 transition-all shadow-lg shadow-amber-400/25"
                  >
                    Open Request Form
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
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