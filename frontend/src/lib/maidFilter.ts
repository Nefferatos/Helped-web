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
  maidType: string;
  hasChildren: boolean;
  withVideo?: boolean;
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

const toLanguageText = (raw: unknown) => {
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw)) return raw.join(" ");
  if (raw && typeof raw === "object") {
    return Object.entries(raw as Record<string, unknown>)
      .map(([k, v]) => `${k} ${String(v ?? "")}`)
      .join(" ");
  }
  return String(raw ?? "");
};

const isClientPortalDraft = (filters: unknown): filters is ClientPortalDraft => {
  if (!filters || typeof filters !== "object") return false;
  const any = filters as Record<string, unknown>;
  return (
    typeof any.keyword === "string" &&
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
    const maidRecordToBool = (v: unknown) => Boolean(v) && String(v).trim().length > 0;

    const shouldApplyGroup = (noPreferenceFlag: boolean, specifics: boolean[]) =>
      !noPreferenceFlag && specifics.some(Boolean);

    const knownCountryMatchers = [
      (c: string) => c.includes("singapore") || c.includes("sg"),
      (c: string) => c.includes("malaysia"),
      (c: string) => c.includes("hong kong") || c.includes("hongkong"),
      (c: string) => c.includes("taiwan"),
      (c: string) =>
        c.includes("uae") ||
        c.includes("dubai") ||
        c.includes("saudi") ||
        c.includes("qatar") ||
        c.includes("kuwait") ||
        c.includes("middle east"),
      (c: string) =>
        c.includes("home") ||
        c.includes("philippines") ||
        c.includes("indonesia") ||
        c.includes("myanmar") ||
        c.includes("india"),
    ] as const;

    return maids.filter((maid) => {
      const maidRecord = maid as unknown as Record<string, unknown>;

      const intro = String((maid.introduction as Record<string, unknown>)?.publicIntro || "").trim();
      const text = `${maid.fullName} ${maid.referenceCode} ${maid.nationality} ${maid.type} ${intro}`.toLowerCase();

      if (f.keyword.trim() && !text.includes(f.keyword.trim().toLowerCase())) return false;
      if (f.maidType && String(maid.type || "") !== f.maidType) return false;
      if (f.hasChildren && Number(maid.numberOfChildren || 0) <= 0) return false;

      if (Boolean(f.withVideo)) {
        const video =
          String((maid as Record<string, unknown>)["videoDataUrl"] ?? maidRecord["videoUrl"] ?? maidRecord["video"] ?? "").trim();
        if (!video) return false;
      }

      const natSpecifics = [
        f.natFilipino,
        f.natIndonesian,
        f.natMyanmar,
        f.natIndian,
        f.natSriLankan,
        f.natCambodian,
        f.natBangladeshi,
        f.natOthers,
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

      const skills = (maid.skillsPreferences || {}) as Record<string, unknown>;
      const workAreas = (maid.workAreas || {}) as Record<string, unknown>;

      const dutySpecifics = [
        f.dutyCareInfant,
        f.dutyCareYoungChildren,
        f.dutyCareElderlyDisabled,
        f.dutyCooking,
        f.dutyGeneralHousekeeping,
      ];
      if (shouldApplyGroup(f.dutyNoPreference, dutySpecifics)) {
        const hasSkill = (keys: string[]) => keys.some((k) => maidRecordToBool(skills[k]) || maidRecordToBool(workAreas[k]));
        const match =
          (f.dutyCareInfant && hasSkill(["careForInfant", "infantCare", "care_for_infant"])) ||
          (f.dutyCareYoungChildren &&
            hasSkill(["careForYoungChildren", "childCare", "care_for_young_children"])) ||
          (f.dutyCareElderlyDisabled &&
            hasSkill(["careForElderly", "elderlyCare", "care_for_elderly", "care_for_disabled"])) ||
          (f.dutyCooking && hasSkill(["cooking", "cook"])) ||
          (f.dutyGeneralHousekeeping && hasSkill(["generalHousekeeping", "housekeeping", "general_housekeeping"]));
        if (!match) return false;
      }

      const expSpecifics = [
        f.expHomeCountry,
        f.expSingapore,
        f.expMalaysia,
        f.expHongKong,
        f.expTaiwan,
        f.expMiddleEast,
        f.expOtherCountries,
      ];
      if (shouldApplyGroup(f.expNoPreference, expSpecifics)) {
        const history = Array.isArray(maid.employmentHistory) ? maid.employmentHistory : [];
        const countries = history
          .map((h) => String((h as Record<string, unknown>)["country"] || (h as Record<string, unknown>)["workCountry"] || "").toLowerCase())
          .filter(Boolean);

        const isHome = (c: string) =>
          c.includes("home") || c.includes("philippines") || c.includes("indonesia") || c.includes("myanmar") || c.includes("india");
        const isSingapore = (c: string) => c.includes("singapore") || c.includes("sg");
        const isMalaysia = (c: string) => c.includes("malaysia");
        const isHongKong = (c: string) => c.includes("hong kong") || c.includes("hongkong");
        const isTaiwan = (c: string) => c.includes("taiwan");
        const isMiddleEast = (c: string) =>
          c.includes("uae") || c.includes("dubai") || c.includes("saudi") || c.includes("qatar") || c.includes("kuwait") || c.includes("middle east");

        const isOther = (c: string) => c.length > 0 && !knownCountryMatchers.some((fn) => fn(c));

        const match =
          (f.expHomeCountry && countries.some(isHome)) ||
          (f.expSingapore && countries.some(isSingapore)) ||
          (f.expMalaysia && countries.some(isMalaysia)) ||
          (f.expHongKong && countries.some(isHongKong)) ||
          (f.expTaiwan && countries.some(isTaiwan)) ||
          (f.expMiddleEast && countries.some(isMiddleEast)) ||
          (f.expOtherCountries && countries.some(isOther));
        if (!match) return false;
      }

      const eduSpecifics = [f.eduCollege, f.eduHighSchool, f.eduSecondary, f.eduPrimary];
      if (shouldApplyGroup(f.eduNoPreference, eduSpecifics)) {
        const edu = String(maidRecord["education"] || maidRecord["educationLevel"] || maid.educationLevel || "").toLowerCase();
        const match =
          (f.eduCollege && (edu.includes("college") || edu.includes("degree") || edu.includes("university"))) ||
          (f.eduHighSchool && (edu.includes("high school") || edu.includes("secondary"))) ||
          (f.eduSecondary && (edu.includes("secondary") || edu.includes("middle"))) ||
          (f.eduPrimary && (edu.includes("primary") || edu.includes("elementary")));
        if (!match) return false;
      }

      const langSpecifics = [f.langEnglish, f.langMandarin, f.langBahasaIndonesia, f.langHindi, f.langTamil];
      if (shouldApplyGroup(f.langNoPreference, langSpecifics)) {
        const rawLangs = maidRecord["languageSkills"] ?? maidRecord["languages"] ?? maidRecord["languagesSpoken"] ?? maid.languageSkills ?? text;
        const langs = toLanguageText(rawLangs).toLowerCase();
        const match =
          (f.langEnglish && langs.includes("english")) ||
          (f.langMandarin && (langs.includes("mandarin") || langs.includes("chinese"))) ||
          (f.langBahasaIndonesia && (langs.includes("bahasa") || langs.includes("malay") || langs.includes("indonesia"))) ||
          (f.langHindi && langs.includes("hindi")) ||
          (f.langTamil && langs.includes("tamil"));
        if (!match) return false;
      }

      const marSpecifics = [f.marSingle, f.marMarried, f.marWidowed, f.marDivorced, f.marSeparated];
      if (shouldApplyGroup(f.marNoPreference, marSpecifics)) {
        const mar = String(maidRecord["maritalStatus"] || maidRecord["marital_status"] || maid.maritalStatus || "").toLowerCase();
        const match =
          (f.marSingle && mar.includes("single")) ||
          (f.marMarried && mar.includes("married")) ||
          (f.marWidowed && mar.includes("widow")) ||
          (f.marDivorced && mar.includes("divorce")) ||
          (f.marSeparated && mar.includes("separat"));
        if (!match) return false;
      }

      const heightSpecifics = [f.height150below, f.height151to155, f.height156to160, f.height161above];
      if (shouldApplyGroup(f.heightNoPreference, heightSpecifics)) {
        const heightCm = Number(maidRecord["heightCm"] ?? maidRecord["height"] ?? maid.height ?? 0);
        if (!(heightCm > 0)) return false;
        const match =
          (f.height150below && heightCm <= 150) ||
          (f.height151to155 && heightCm >= 151 && heightCm <= 155) ||
          (f.height156to160 && heightCm >= 156 && heightCm <= 160) ||
          (f.height161above && heightCm >= 161);
        if (!match) return false;
      }

      const relSpecifics = [
        f.relFreeThinker,
        f.relChristian,
        f.relCatholic,
        f.relBuddhist,
        f.relMuslim,
        f.relHindu,
        f.relSikh,
        f.relOthers,
      ];
      if (shouldApplyGroup(f.relNoPreference, relSpecifics)) {
        const rel = String(maidRecord["religion"] || maid.religion || "").toLowerCase();
        const match =
          (f.relFreeThinker && (rel.includes("free") || rel.includes("none") || rel.includes("atheist"))) ||
          (f.relChristian && rel.includes("christian") && !rel.includes("catholic")) ||
          (f.relCatholic && rel.includes("catholic")) ||
          (f.relBuddhist && rel.includes("buddh")) ||
          (f.relMuslim && (rel.includes("muslim") || rel.includes("islam"))) ||
          (f.relHindu && rel.includes("hindu")) ||
          (f.relSikh && rel.includes("sikh")) ||
          (f.relOthers && rel.length > 0);
        if (!match) return false;
      }

      return true;
    });
  }

  const f = filters as SimpleMaidFilters;
  return maids.filter((maid) => {
    // Keyword (name or referenceCode)
    if (f.keyword?.trim()) {
      const keyword = f.keyword.trim().toLowerCase();
      const intro = String((maid.introduction as Record<string, unknown>)?.publicIntro || "").trim();
      const searchText = `${maid.fullName} ${maid.referenceCode} ${maid.nationality} ${maid.type} ${intro}`.toLowerCase();
      const match = searchText.includes(keyword);
      if (!match) return false;
    }

    // Nationality
    const nat = Array.isArray(f.nationality)
      ? f.nationality
      : typeof f.nationality === "string"
        ? [f.nationality]
        : [];
    const natList = nat
      .map((v) => String(v || "").trim())
      .filter((v) => v && v !== "No Preference");
    if (natList.length > 0) {
      if (!natList.includes(String(maid.nationality || "").trim())) return false;
    }

    // Maid Type
    const type = f.type?.trim() || "";
    const maidTypes = Array.isArray(f.maidTypes) ? f.maidTypes.map((v) => String(v || "").trim()).filter(Boolean) : [];
    if (type) {
      if (String(maid.type || "") !== type) return false;
    } else if (maidTypes.length > 0) {
      const maidType = String(maid.type || "");
      const match = maidTypes.some((t) => maidType.toLowerCase().includes(t.toLowerCase()));
      if (!match) return false;
    }

    // Age Group
    if (f.ageGroup?.trim()) {
      const age = calculateAge(maid.dateOfBirth);
      if (!age) return false;

      const [min, max] = f.ageGroup.split("-").map((n) => Number(n));
      if (!Number.isFinite(min) || !Number.isFinite(max)) return false;
      if (age < min || age > max) return false;
    }

    // Marital Status
    if (f.maritalStatus?.trim()) {
      if (String(maid.maritalStatus || "").trim() !== f.maritalStatus.trim()) return false;
    }

    // Has Children
    if (Boolean(f.hasChildren)) {
      if (!maid.numberOfChildren || maid.numberOfChildren <= 0) return false;
    }

    // Language (uses languageSkills)
    if (f.language?.trim() && f.language.trim() !== "No Preference") {
      const lang = f.language.trim().toLowerCase();
      const skills = toLanguageText((maid as unknown as Record<string, unknown>)["languageSkills"] ?? maid.languageSkills).toLowerCase();
      if (!skills.includes(lang)) return false;
    }

    return true;
  });
}
