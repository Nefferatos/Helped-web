import { calculateAge, type MaidProfile } from "@/lib/maids";

type SimpleMaidFilters = {
  keyword?: string;
  nationality?: string[] | string;
  type?: string;
  maidTypes?: string[];
  ageGroup?: string;
  maritalStatus?: string;
  hasChildren?: boolean;
  language?: string;
};

type ClientPortalDraft = {
  keyword: string;
  agencyPreference: string;
  biodataCreatedWithin: string;
  maidType: string;
  hasChildren: boolean;
  withVideo?: boolean;
  willingOffDays?: boolean;
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

// ─── Nationality ────────────────────────────────────────────────────────────
// AddMaid stores values like "Filipino maid", "Indonesian maid", "Myanmar maid" etc.
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

// ─── Maid Type ───────────────────────────────────────────────────────────────
// AddMaid stores: "New maid", "Transfer maid", "Ex-Singapore maid", etc. (mixed case)
// Filter UI sends: "New Maid", "Transfer Maid", "Ex-Singapore Maid"
// → normalise both sides to lowercase for comparison
const normalizeMaidType = (raw?: string) => String(raw || "").trim().toLowerCase();

// ─── Language ────────────────────────────────────────────────────────────────
// AddMaid stores languageSkills as: { "English": "Good", "Mandarin/Chinese-Dialect": "Fair", ... }
// The filter checks whether the skill level is something meaningful (not "Zero" or empty).
const toLanguageText = (raw: unknown): string => {
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw)) return raw.join(" ");
  if (raw && typeof raw === "object") {
    // For languageSkills objects, build a string of "key value" pairs.
    // Only include entries whose value is not "Zero" and not empty — so "Zero" skill
    // does not cause a false positive match.
    return Object.entries(raw as Record<string, unknown>)
      .filter(([, v]) => {
        const val = String(v ?? "").trim().toLowerCase();
        return val && val !== "zero";
      })
      .map(([k]) => k) // just the language name is enough for inclusion check
      .join(" ");
  }
  return String(raw ?? "");
};

// ─── Education ───────────────────────────────────────────────────────────────
// AddMaid options (exact strings stored in educationLevel):
//   "Primary Level(<=6 yrs)"
//   "Secondary Level(7~9 yrs)"
//   "High School(10~12 yrs)"
//   "Vocational Course"
//   "College/Degree (>=13 yrs)"
const normalizeEducation = (raw: string): string => raw.toLowerCase();

const offDayCompensationKeys = [
  "Can work on off-days with compensation?",
  "Willing to work on off-days with compensation?",
  "Willing to work on off-days with  compensation?",
] as const;

const getRecencyCutoff = (label: string) => {
  const value = label.trim().toLowerCase();
  const cutoff = new Date();

  if (value === "1 week") cutoff.setDate(cutoff.getDate() - 7);
  else if (value === "2 weeks") cutoff.setDate(cutoff.getDate() - 14);
  else if (value === "1 month") cutoff.setMonth(cutoff.getMonth() - 1);
  else if (value === "3 months") cutoff.setMonth(cutoff.getMonth() - 3);
  else if (value === "6 months") cutoff.setMonth(cutoff.getMonth() - 6);
  else if (value === "1 year") cutoff.setFullYear(cutoff.getFullYear() - 1);
  else return null;

  return cutoff;
};

// ─── Working Experience ──────────────────────────────────────────────────────
// AddMaid employment history stores country as exact strings from the dropdown:
//   "Singapore", "Hong Kong", "Taiwan", "Malaysia",
//   "Saudi Arabia", "UAE", "Kuwait", "Bahrain", "Qatar", "Oman", "Jordan", "Lebanon",
//   "Brunei", "Others"
// Home country is not in the dropdown — maids with only home-country experience
// will typically have no employment history rows, or their nationality implies home country.

const isClientPortalDraft = (filters: unknown): filters is ClientPortalDraft => {
  if (!filters || typeof filters !== "object") return false;
  const any = filters as Record<string, unknown>;
  return (
    typeof any.keyword === "string" &&
    typeof any.agencyPreference === "string" &&
    typeof any.biodataCreatedWithin === "string" &&
    typeof any.natNoPreference === "boolean" &&
    typeof any.expNoPreference === "boolean" &&
    typeof any.dutyNoPreference === "boolean" &&
    typeof any.langNoPreference === "boolean" &&
    typeof any.ageNoPreference === "boolean" &&
    typeof any.marNoPreference === "boolean" &&
    typeof any.heightNoPreference === "boolean" &&
    typeof any.relNoPreference === "boolean"
  );
};

export function filterMaids(maids: MaidProfile[], filters: unknown) {
  if (!Array.isArray(maids) || maids.length === 0) return [];
  if (!filters) return maids;

  if (isClientPortalDraft(filters)) {
    const f = filters;

    const shouldApplyGroup = (noPreferenceFlag: boolean, specifics: boolean[]) =>
      !noPreferenceFlag && specifics.some(Boolean);

    return maids.filter((maid) => {
      const maidRecord = maid as unknown as Record<string, unknown>;

      // ── Keyword ────────────────────────────────────────────────────────────
      if (f.keyword.trim()) {
        const intro = String((maid.introduction as Record<string, unknown>)?.publicIntro || "").trim();
        const text = `${maid.fullName} ${maid.referenceCode} ${maid.nationality} ${maid.type} ${intro}`.toLowerCase();
        if (!text.includes(f.keyword.trim().toLowerCase())) return false;
      }
      if (f.agencyPreference.trim() && f.agencyPreference !== "No Preference") {
        const agencyContact = (maid.agencyContact || maidRecord["agencyContact"] || {}) as Record<string, unknown>;
        const companyName = String(agencyContact.companyName || "").trim().toLowerCase();
        if (!companyName.includes(f.agencyPreference.trim().toLowerCase())) return false;
      }
      if (f.biodataCreatedWithin.trim() && f.biodataCreatedWithin !== "No Preference") {
        const cutoff = getRecencyCutoff(f.biodataCreatedWithin);
        if (cutoff) {
          const createdAtRaw = String(maidRecord["createdAt"] || maidRecord["updatedAt"] || "").trim();
          const createdAt = createdAtRaw ? new Date(createdAtRaw) : null;
          if (!createdAt || Number.isNaN(createdAt.getTime()) || createdAt < cutoff) return false;
        }
      }

      // ── Maid Type ──────────────────────────────────────────────────────────
      // FIX: compare case-insensitively because AddMaid stores "New maid" but
      // the filter UI sends "New Maid".
      if (f.maidType) {
        if (normalizeMaidType(maid.type) !== normalizeMaidType(f.maidType)) return false;
      }

      // ── Has Children ───────────────────────────────────────────────────────
      if (f.hasChildren && Number(maid.numberOfChildren || 0) <= 0) return false;

      // ── With Video ─────────────────────────────────────────────────────────
      if (f.withVideo) {
        const video = String(
          maidRecord["videoDataUrl"] ?? maidRecord["videoUrl"] ?? maidRecord["video"] ?? ""
        ).trim();
        if (!video) return false;
      }
      if (f.willingOffDays) {
        const introduction = (maid.introduction || maidRecord["introduction"] || {}) as Record<string, unknown>;
        const canWorkOffDays = offDayCompensationKeys.some((key) => introduction[key] === true);
        if (!canWorkOffDays) return false;
      }

      // ── Nationality ────────────────────────────────────────────────────────
      // AddMaid stores values like "Filipino maid", "Indonesian maid" — normalizeNationality handles this.
      const natSpecifics = [
        f.natFilipino, f.natIndonesian, f.natMyanmar, f.natIndian,
        f.natSriLankan, f.natCambodian, f.natBangladeshi, f.natOthers,
      ];
      if (shouldApplyGroup(f.natNoPreference, natSpecifics)) {
        const norm = normalizeNationality(maid.nationality);
        const match =
          (f.natFilipino && norm === "filipino") ||
          (f.natIndonesian && norm === "indonesian") ||
          (f.natMyanmar && norm === "myanmar") ||
          (f.natIndian && norm === "indian") ||
          (f.natSriLankan && norm === "srilanka") ||
          (f.natCambodian && norm === "cambodian") ||
          (f.natBangladeshi && norm === "bangladeshi") ||
          (f.natOthers && norm === "others");
        if (!match) return false;
      }

      // ── Age ────────────────────────────────────────────────────────────────
      const ageSpecifics = [f.age21to25, f.age26to30, f.age31to35, f.age36to40, f.age41above];
      if (shouldApplyGroup(f.ageNoPreference, ageSpecifics)) {
        const age = calculateAge(maid.dateOfBirth);
        if (!age) return false;
        const match =
          (f.age21to25 && age >= 21 && age <= 25) ||
          (f.age26to30 && age >= 26 && age <= 30) ||
          (f.age31to35 && age >= 31 && age <= 35) ||
          (f.age36to40 && age >= 36 && age <= 40) ||
          (f.age41above && age >= 41);
        if (!match) return false;
      }

      // ── Duty / Skills ──────────────────────────────────────────────────────
      // FIX: AddMaid stores duties in workAreas using the EXACT label strings from skillRows:
      //   "Care of infants/children", "Care of elderly", "Care of disabled",
      //   "General housework", "Cooking"
      // Each entry is an object like: { willing: true, experience: true, ... }
      // We check willing === true OR experience === true.
      const dutySpecifics = [
        f.dutyCareInfant, f.dutyCareYoungChildren, f.dutyCareElderlyDisabled,
        f.dutyCooking, f.dutyGeneralHousekeeping,
      ];
      if (shouldApplyGroup(f.dutyNoPreference, dutySpecifics)) {
        const workAreas = (maid.workAreas || {}) as Record<string, unknown>;

        const hasWillingnessOrExp = (labels: string[]) =>
          labels.some((label) => {
            const entry = workAreas[label] as Record<string, unknown> | undefined;
            if (!entry) return false;
            return entry.willing === true || entry.experience === true;
          });

        const match =
          (f.dutyCareInfant && hasWillingnessOrExp(["Care of infants/children"])) ||
          (f.dutyCareYoungChildren && hasWillingnessOrExp(["Care of infants/children"])) ||
          (f.dutyCareElderlyDisabled && hasWillingnessOrExp(["Care of elderly", "Care of disabled"])) ||
          (f.dutyCooking && hasWillingnessOrExp(["Cooking"])) ||
          (f.dutyGeneralHousekeeping && hasWillingnessOrExp(["General housework"]));
        if (!match) return false;
      }

      // ── Working Experience (country) ───────────────────────────────────────
      // FIX: AddMaid uses field name "country" (confirmed in EmploymentHistoryTab).
      // The dropdown values are: "Singapore", "Hong Kong", "Taiwan", "Malaysia",
      // "Saudi Arabia", "UAE", "Kuwait", "Bahrain", "Qatar", "Oman", "Jordan",
      // "Lebanon", "Brunei", "Others"
      // Home Country = maid has NO overseas entries (all rows are empty/Others),
      // or we check if zero history rows exist (implying only home-country experience).
      const expSpecifics = [
        f.expHomeCountry, f.expSingapore, f.expMalaysia, f.expHongKong,
        f.expTaiwan, f.expMiddleEast, f.expOtherCountries,
      ];
      if (shouldApplyGroup(f.expNoPreference, expSpecifics)) {
        const history = Array.isArray(maid.employmentHistory) ? maid.employmentHistory : [];
        const countries = history
          .map((h) => String((h as Record<string, unknown>)["country"] || "").trim())
          .filter((c) => c && c !== "--");

        const knownOverseasCountries = ["Singapore", "Hong Kong", "Taiwan", "Malaysia",
          "Saudi Arabia", "UAE", "Kuwait", "Bahrain", "Qatar", "Oman", "Jordan", "Lebanon", "Brunei"];

        const isSingapore = (c: string) => c === "Singapore";
        const isMalaysia = (c: string) => c === "Malaysia";
        const isHongKong = (c: string) => c === "Hong Kong";
        const isTaiwan = (c: string) => c === "Taiwan";
        const isMiddleEast = (c: string) =>
          ["Saudi Arabia", "UAE", "Kuwait", "Bahrain", "Qatar", "Oman", "Jordan", "Lebanon"].includes(c);
        // "Others" in the dropdown + anything not in the known list
        const isOther = (c: string) =>
          c === "Others" || (!knownOverseasCountries.includes(c) && c.length > 0);
        // Home country = no overseas history at all, or only "Others"/unknown entries
        const hasAnyOverseas = countries.some((c) => knownOverseasCountries.includes(c));
        const isHome = !hasAnyOverseas;

        const match =
          (f.expHomeCountry && isHome) ||
          (f.expSingapore && countries.some(isSingapore)) ||
          (f.expMalaysia && countries.some(isMalaysia)) ||
          (f.expHongKong && countries.some(isHongKong)) ||
          (f.expTaiwan && countries.some(isTaiwan)) ||
          (f.expMiddleEast && countries.some(isMiddleEast)) ||
          (f.expOtherCountries && countries.some(isOther));
        if (!match) return false;
      }

      // ── Education ──────────────────────────────────────────────────────────
      // FIX: AddMaid exact stored values:
      //   "Primary Level(<=6 yrs)"        → eduPrimary
      //   "Secondary Level(7~9 yrs)"      → eduSecondary
      //   "High School(10~12 yrs)"        → eduHighSchool
      //   "Vocational Course"             → treated as eduHighSchool equivalent
      //   "College/Degree (>=13 yrs)"     → eduCollege
      const eduSpecifics = [f.eduCollege, f.eduHighSchool, f.eduSecondary, f.eduPrimary];
      if (shouldApplyGroup(f.eduNoPreference, eduSpecifics)) {
        const edu = normalizeEducation(
          String(maidRecord["educationLevel"] || maid.educationLevel || "")
        );
        const match =
          (f.eduCollege && edu.includes("college")) ||
          (f.eduHighSchool && (edu.includes("high school") || edu.includes("vocational"))) ||
          (f.eduSecondary && edu.includes("secondary")) ||
          (f.eduPrimary && edu.includes("primary"));
        if (!match) return false;
      }

      // ── Language ───────────────────────────────────────────────────────────
      // FIX: AddMaid stores languageSkills as an object:
      //   { "English": "Good", "Mandarin/Chinese-Dialect": "Fair", "Hindi": "Zero", ... }
      // toLanguageText() already filters out "Zero" entries.
      // We join the keys (language names) and check inclusion.
      const langSpecifics = [f.langEnglish, f.langMandarin, f.langBahasaIndonesia, f.langHindi, f.langTamil];
      if (shouldApplyGroup(f.langNoPreference, langSpecifics)) {
        const rawLangs =
          maidRecord["languageSkills"] ??
          maid.languageSkills ??
          maidRecord["languages"] ??
          maidRecord["languagesSpoken"] ??
          "";
        const langs = toLanguageText(rawLangs).toLowerCase();
        const match =
          (f.langEnglish && langs.includes("english")) ||
          (f.langMandarin && (langs.includes("mandarin") || langs.includes("chinese"))) ||
          (f.langBahasaIndonesia && (langs.includes("bahasa") || langs.includes("indonesia") || langs.includes("malay"))) ||
          (f.langHindi && langs.includes("hindi")) ||
          (f.langTamil && langs.includes("tamil"));
        if (!match) return false;
      }

      // ── Marital Status ─────────────────────────────────────────────────────
      // AddMaid stores exact strings: "Single", "Single Parent", "Married",
      // "Divorced", "Widowed", "Separated"
      const marSpecifics = [f.marSingle, f.marMarried, f.marWidowed, f.marDivorced, f.marSeparated];
      if (shouldApplyGroup(f.marNoPreference, marSpecifics)) {
        const mar = String(maid.maritalStatus || maidRecord["maritalStatus"] || "").toLowerCase();
        const match =
          (f.marSingle && (mar === "single" || mar === "single parent")) ||
          (f.marMarried && mar === "married") ||
          (f.marWidowed && mar.includes("widow")) ||
          (f.marDivorced && mar.includes("divorce")) ||
          (f.marSeparated && mar.includes("separat"));
        if (!match) return false;
      }

      // ── Height ─────────────────────────────────────────────────────────────
      // AddMaid stores height as a number on maid.height (e.g. 155).
      const heightSpecifics = [f.height150below, f.height151to155, f.height156to160, f.height161above];
      if (shouldApplyGroup(f.heightNoPreference, heightSpecifics)) {
        const heightCm = Number(maid.height ?? maidRecord["heightCm"] ?? maidRecord["height_cm"] ?? 0);
        if (!(heightCm > 0)) return false;
        const match =
          (f.height150below && heightCm <= 150) ||
          (f.height151to155 && heightCm >= 151 && heightCm <= 155) ||
          (f.height156to160 && heightCm >= 156 && heightCm <= 160) ||
          (f.height161above && heightCm >= 161);
        if (!match) return false;
      }

      // ── Religion ───────────────────────────────────────────────────────────
      // AddMaid stores exact strings: "Catholic", "Christian", "Muslim", "Hindu",
      // "Buddhist", "Sikh", "Free Thinker", "Others"
      const relSpecifics = [
        f.relFreeThinker, f.relChristian, f.relCatholic, f.relBuddhist,
        f.relMuslim, f.relHindu, f.relSikh, f.relOthers,
      ];
      if (shouldApplyGroup(f.relNoPreference, relSpecifics)) {
        const rel = String(maid.religion || maidRecord["religion"] || "").toLowerCase().trim();
        const match =
          (f.relFreeThinker && rel === "free thinker") ||
          (f.relChristian && rel === "christian") ||
          (f.relCatholic && rel === "catholic") ||
          (f.relBuddhist && rel === "buddhist") ||
          (f.relMuslim && (rel === "muslim" || rel.includes("islam"))) ||
          (f.relHindu && rel === "hindu") ||
          (f.relSikh && rel === "sikh") ||
          (f.relOthers && rel === "others");
        if (!match) return false;
      }

      return true;
    });
  }

  // ── SimpleMaidFilters fallback (non-ClientPortal usage) ───────────────────
  const f = filters as SimpleMaidFilters;
  return maids.filter((maid) => {
    if (f.keyword?.trim()) {
      const keyword = f.keyword.trim().toLowerCase();
      const intro = String((maid.introduction as Record<string, unknown>)?.publicIntro || "").trim();
      const searchText = `${maid.fullName} ${maid.referenceCode} ${maid.nationality} ${maid.type} ${intro}`.toLowerCase();
      if (!searchText.includes(keyword)) return false;
    }

    const nat = Array.isArray(f.nationality)
      ? f.nationality
      : typeof f.nationality === "string"
        ? [f.nationality]
        : [];
    const natList = nat.map((v) => String(v || "").trim()).filter((v) => v && v !== "No Preference");
    if (natList.length > 0) {
      if (!natList.includes(String(maid.nationality || "").trim())) return false;
    }

    const type = f.type?.trim() || "";
    const maidTypes = Array.isArray(f.maidTypes)
      ? f.maidTypes.map((v) => String(v || "").trim()).filter(Boolean)
      : [];
    if (type) {
      if (normalizeMaidType(maid.type) !== normalizeMaidType(type)) return false;
    } else if (maidTypes.length > 0) {
      const mt = normalizeMaidType(maid.type);
      if (!maidTypes.some((t) => mt.includes(normalizeMaidType(t)))) return false;
    }

    if (f.ageGroup?.trim()) {
      const age = calculateAge(maid.dateOfBirth);
      if (!age) return false;
      const [min, max] = f.ageGroup.split("-").map((n) => Number(n));
      if (!Number.isFinite(min) || !Number.isFinite(max)) return false;
      if (age < min || age > max) return false;
    }

    if (f.maritalStatus?.trim()) {
      if (String(maid.maritalStatus || "").trim().toLowerCase() !== f.maritalStatus.trim().toLowerCase()) return false;
    }

    if (f.hasChildren) {
      if (!maid.numberOfChildren || maid.numberOfChildren <= 0) return false;
    }

    if (f.language?.trim() && f.language.trim() !== "No Preference") {
      const lang = f.language.trim().toLowerCase();
      const skills = toLanguageText(
        (maid as unknown as Record<string, unknown>)["languageSkills"] ?? maid.languageSkills
      ).toLowerCase();
      if (!skills.includes(lang)) return false;
    }

    return true;
  });
}
