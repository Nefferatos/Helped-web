// ─── AddMaid.tsx (with PDF auto-fill + functional evaluation checkboxes) ──────

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Star, ChevronRight, User, Briefcase, Clock, FileText, Globe, Lock, CheckCircle, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { getAgencyAdminAuthHeaders } from "@/lib/agencyAdminAuth";
import type { AtsApplicationListItem } from "@/lib/ats";
import { defaultMaidProfile, type MaidProfile } from "@/lib/maids";
import { startMaidSaveTask } from "@/lib/maidSaveProgress";
import { useNavigate, useSearchParams } from "react-router-dom";
import { compressImage, compressImageFile, getImageSizeInMB } from "@/lib/imageCompression";

import { PdfAutofillBanner } from "./PdfAutofill";

const stripInlineMedia = (value?: string) =>
  typeof value === "string" && value.trim().startsWith("data:") ? "" : value || "";

const asTrimmedString = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const firstNonEmptyString = (...values: unknown[]) => {
  for (const value of values) {
    const text = asTrimmedString(value);
    if (text) return text;
  }
  return "";
};

const asPositiveNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return 0;
};

const parseNumberString = (value: unknown) => {
  const parsed = asPositiveNumber(value);
  return parsed > 0 ? String(parsed) : "";
};

const parseList = (value: unknown) => {
  if (Array.isArray(value)) {
    return value.map((item) => asTrimmedString(item)).filter(Boolean);
  }
  const text = asTrimmedString(value);
  if (!text) return [];
  return text.split(",").map((item) => item.trim()).filter(Boolean);
};

const normalizeLanguageKey = (value: string) => {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return "";
  if (normalized === "mandarin / chinese dialect" || normalized === "mandarin/chinese-dialect") {
    return "Mandarin/Chinese-Dialect";
  }
  if (normalized === "bahasa indonesia / malaysia" || normalized === "bahasa indonesia/malaysia") {
    return "Bahasa Indonesia/Malaysia";
  }
  if (normalized === "tagalog") return "Tagalog";
  return value.trim();
};

const mapEmploymentPreferenceToType = (value: unknown, workedInSingapore?: unknown) => {
  const preference = asTrimmedString(value).toLowerCase();
  if (!preference) {
    return asTrimmedString(workedInSingapore).toLowerCase() === "yes" ? "Ex-Singapore maid" : "";
  }
  if (preference.includes("transfer")) return "Transfer maid";
  if (preference.includes("singapore")) return "Ex-Singapore maid";
  if (preference.includes("hong kong")) return "Ex-Hong Kong maid";
  if (preference.includes("taiwan")) return "Ex-Taiwan maid";
  if (preference.includes("malaysia")) return "Ex-Malaysia maid";
  if (preference.includes("middle east") || preference.includes("dubai") || preference.includes("uae")) {
    return "Ex-Middle East maid";
  }
  if (preference.includes("new")) return "New maid";
  return "";
};

const buildPastIllnessesFromText = (value: unknown) => {
  const text = asTrimmedString(value).toLowerCase();
  if (!text || /^(none|n\/a|nil|no)$/i.test(text)) return undefined;

  const entries: Array<[string, RegExp]> = [
    ["(I) Mental illness", /mental/],
    ["(II) Epilepsy", /epilepsy/],
    ["(III) Asthma", /asthma/],
    ["(IV) Diabetes", /diabet/],
    ["(V) Hypertension", /hypertension|high blood pressure/],
    ["(VI) Tuberculosis", /tuberculosis|tb\b/],
    ["(VII) Heart disease", /heart/],
    ["(VIII) Malaria", /malaria/],
    ["(IX) Operations", /operation|surgery/],
  ];

  const mapped = Object.fromEntries(entries.map(([label, pattern]) => [label, pattern.test(text)]));
  return Object.values(mapped).some(Boolean) ? mapped : undefined;
};

const buildWorkAreaConfig = (years: unknown, note?: unknown) => {
  const yearsText = parseNumberString(years);
  const noteText = asTrimmedString(note);
  if (!yearsText && !noteText) return undefined;
  return {
    willing: true,
    experience: Boolean(yearsText || noteText),
    yearsOfExperience: yearsText,
    note: noteText,
    evaluation: noteText || "N.A.",
  };
};

const buildAtsPrefill = ({
  query,
  applicationProfile,
  detailedProfile,
}: {
  query?: URLSearchParams;
  applicationProfile?: AtsApplicationListItem["profile"];
  detailedProfile?: Record<string, unknown> | null;
}): Partial<MaidProfile> => {
  const profile = detailedProfile || {};
  const queryValue = (key: string) => asTrimmedString(query?.get(key));

  const languageNames = [
    ...parseList(queryValue("languageSkills")),
    ...parseList(profile.languageSkills),
    ...(applicationProfile?.languageSkills ?? []),
  ];

  const languageSkills = languageNames.reduce<Record<string, string>>((acc, language) => {
    const key = normalizeLanguageKey(language);
    if (key && !acc[key]) acc[key] = "Yes";
    return acc;
  }, {});

  const workAreaNotes: Record<string, string> = {};
  const childcareYears =
    asPositiveNumber(queryValue("newbornCareExperience")) ||
    asPositiveNumber(queryValue("childcareExperience")) ||
    asPositiveNumber(profile.newbornCareExperience) ||
    asPositiveNumber(profile.childcareExperience) ||
    applicationProfile?.newbornCareExperience ||
    applicationProfile?.childcareExperience ||
    0;
  const elderlyYears =
    asPositiveNumber(queryValue("elderlyCareExperience")) ||
    asPositiveNumber(profile.elderlyCareExperience) ||
    applicationProfile?.elderlyCareExperience ||
    0;
  const disabledYears = asPositiveNumber(profile.disabledCareExperience) || asPositiveNumber(queryValue("disabledCareExperience"));
  const housekeepingYears = asPositiveNumber(profile.housekeepingExperience) || asPositiveNumber(queryValue("housekeepingExperience"));
  const cookingSkills = firstNonEmptyString(queryValue("cookingSkills"), profile.cookingSkills);
  const coverNote = firstNonEmptyString(queryValue("coverNote"), profile.coverNote);
  const foodPreference = firstNonEmptyString(profile.foodPreferenceOther, profile.foodPreference);

  if (firstNonEmptyString(profile.childrenAges)) workAreaNotes["Care of infants/children"] = firstNonEmptyString(profile.childrenAges);
  if (cookingSkills) workAreaNotes.Cooking = cookingSkills;
  if (languageNames.length > 0) workAreaNotes["Language abilities (spoken)"] = languageNames.join(", ");
  if (asTrimmedString(profile.petCareExperience)) workAreaNotes["Other Skill"] = `Pet care: ${asTrimmedString(profile.petCareExperience)}`;

  const workAreas = {
    ...(buildWorkAreaConfig(childcareYears) ? { "Care of infants/children": buildWorkAreaConfig(childcareYears) } : {}),
    ...(buildWorkAreaConfig(elderlyYears) ? { "Care of elderly": buildWorkAreaConfig(elderlyYears) } : {}),
    ...(buildWorkAreaConfig(disabledYears) ? { "Care of disabled": buildWorkAreaConfig(disabledYears) } : {}),
    ...(buildWorkAreaConfig(housekeepingYears) ? { "General housework": buildWorkAreaConfig(housekeepingYears) } : {}),
    ...(buildWorkAreaConfig("", cookingSkills) ? { Cooking: buildWorkAreaConfig("", cookingSkills) } : {}),
    ...(buildWorkAreaConfig("", languageNames.join(", ")) ? { "Language abilities (spoken)": buildWorkAreaConfig("", languageNames.join(", ")) } : {}),
  };

  const combinedRemarks = [
    firstNonEmptyString(profile.otherRemarksA3),
    firstNonEmptyString(profile.otherRemarksE),
  ].filter(Boolean).join("\n\n");

  const expectedSalary = firstNonEmptyString(
    queryValue("expectedSalary"),
    profile.expectedSalary,
    applicationProfile?.expectedSalary != null ? String(applicationProfile.expectedSalary) : "",
  );

  const availability = firstNonEmptyString(
    queryValue("availableDate"),
    profile.availableDate,
    applicationProfile?.availableDate,
  );

  const privateInfoLines = [
    firstNonEmptyString(queryValue("applicationCode"), queryValue("maidReferenceCode"))
      ? `ATS reference: ${firstNonEmptyString(queryValue("maidReferenceCode"), queryValue("applicationCode"))}`
      : "",
    firstNonEmptyString(queryValue("email"), profile.email, applicationProfile?.email)
      ? `ATS email: ${firstNonEmptyString(queryValue("email"), profile.email, applicationProfile?.email)}`
      : "",
  ].filter(Boolean);

  return {
    fullName: firstNonEmptyString(queryValue("candidateName"), profile.fullName, applicationProfile?.fullName),
    referenceCode: firstNonEmptyString(queryValue("maidReferenceCode"), queryValue("applicationCode")),
    type: mapEmploymentPreferenceToType(
      firstNonEmptyString(queryValue("employmentPreference"), profile.employmentPreference, applicationProfile?.employmentPreference),
      profile.workedInSingapore,
    ),
    nationality: firstNonEmptyString(queryValue("nationality"), profile.nationality, applicationProfile?.nationality),
    dateOfBirth: firstNonEmptyString(queryValue("dateOfBirth"), profile.dateOfBirth),
    placeOfBirth: firstNonEmptyString(queryValue("placeOfBirth"), profile.placeOfBirth),
    height: asPositiveNumber(queryValue("heightCm")) || asPositiveNumber(profile.heightCm),
    weight: asPositiveNumber(queryValue("weightKg")) || asPositiveNumber(profile.weightKg),
    religion: firstNonEmptyString(queryValue("religion"), profile.religion),
    maritalStatus: firstNonEmptyString(queryValue("maritalStatus"), profile.maritalStatus),
    numberOfChildren: asPositiveNumber(queryValue("numberOfChildren")) || asPositiveNumber(profile.numberOfChildren),
    numberOfSiblings: asPositiveNumber(queryValue("numberOfSiblings")) || asPositiveNumber(profile.numberOfSiblings),
    homeAddress: firstNonEmptyString(
      queryValue("address"),
      profile.address,
      [asTrimmedString(profile.residentialAddressLine1), asTrimmedString(profile.residentialAddressLine2)].filter(Boolean).join(", "),
    ),
    airportRepatriation: firstNonEmptyString(queryValue("repatriationPort"), profile.repatriationPort),
    educationLevel: firstNonEmptyString(queryValue("educationLevel"), profile.educationLevel),
    languageSkills,
    workAreas,
    introduction: {
      agesOfChildren: firstNonEmptyString(queryValue("childrenAges"), profile.childrenAges),
      expectedSalary,
      availability,
      intro: coverNote,
      publicIntro: coverNote,
      allergies: firstNonEmptyString(queryValue("allergies"), profile.allergies),
      physicalDisabilities: firstNonEmptyString(queryValue("physicalDisabilities"), profile.physicalDisabilities),
      dietaryRestrictions: firstNonEmptyString(queryValue("dietaryRestrictions"), profile.dietaryRestrictions),
      foodHandlingPreferences: foodPreference,
      otherRemarks: firstNonEmptyString(combinedRemarks, asTrimmedString(profile.medicalConditions)),
      pastIllnesses: buildPastIllnessesFromText(profile.medicalConditions),
    },
    skillsPreferences: {
      offDaysPerMonth: firstNonEmptyString(queryValue("restDayPreference"), profile.restDayPreference),
      sgExperience: asTrimmedString(profile.workedInSingapore).toLowerCase() === "yes",
      workAreaNotes,
      privateInfo: privateInfoLines.join("\n"),
    },
    agencyContact: {
      phone: firstNonEmptyString(
        queryValue("whatsappNumber"),
        queryValue("contactNumber"),
        profile.contactNumber,
        applicationProfile?.whatsappNumber,
        applicationProfile?.contactNumber,
      ),
      homeCountryContactNumber: firstNonEmptyString(queryValue("homeCountryContactNumber"), profile.homeCountryContactNumber),
    },
  };
};

const mergeMissingStringMap = (current: Record<string, string>, incoming: Record<string, string>) => {
  const next = { ...current };
  Object.entries(incoming).forEach(([key, value]) => {
    if (!asTrimmedString(next[key]) && asTrimmedString(value)) next[key] = value;
  });
  return next;
};

const PHOTO_UPLOAD_OPTIONS = {
  maxWidth: 1200,
  maxHeight: 1200,
  quality: 0.68,
  maxSizeMB: 0.32,
} as const;

const mergeMissingUnknownMap = (current: Record<string, unknown>, incoming: Record<string, unknown>) => {
  const next = { ...current };
  Object.entries(incoming).forEach(([key, value]) => {
    const existing = next[key];
    if (
      existing &&
      value &&
      typeof existing === "object" &&
      typeof value === "object" &&
      !Array.isArray(existing) &&
      !Array.isArray(value)
    ) {
      next[key] = mergeMissingUnknownMap(
        existing as Record<string, unknown>,
        value as Record<string, unknown>,
      );
      return;
    }
    const existingText = typeof existing === "string" ? existing.trim() : "";
    const incomingText = typeof value === "string" ? value.trim() : "";
    const existingEmpty =
      existing === undefined ||
      existing === null ||
      existingText === "" ||
      (typeof existing === "number" && existing === 0) ||
      (Array.isArray(existing) && existing.length === 0) ||
      (typeof existing === "object" && !Array.isArray(existing) && Object.keys(existing as Record<string, unknown>).length === 0);
    const incomingEmpty =
      value === undefined ||
      value === null ||
      incomingText === "" ||
      (typeof value === "number" && value === 0) ||
      (Array.isArray(value) && value.length === 0) ||
      (typeof value === "object" && !Array.isArray(value) && Object.keys(value as Record<string, unknown>).length === 0);
    if (existingEmpty && !incomingEmpty) next[key] = value;
  });
  return next;
};

const mergeAtsPrefillIntoMaid = (current: MaidProfile, prefill: Partial<MaidProfile>): MaidProfile => ({
  ...current,
  fullName: current.fullName || prefill.fullName || "",
  referenceCode: current.referenceCode || prefill.referenceCode || "",
  type: current.type || prefill.type || "",
  nationality: current.nationality || prefill.nationality || "",
  dateOfBirth: current.dateOfBirth || prefill.dateOfBirth || "",
  placeOfBirth: current.placeOfBirth || prefill.placeOfBirth || "",
  height: current.height || prefill.height || 0,
  weight: current.weight || prefill.weight || 0,
  religion: current.religion || prefill.religion || "",
  maritalStatus: current.maritalStatus || prefill.maritalStatus || "",
  numberOfChildren: current.numberOfChildren || prefill.numberOfChildren || 0,
  numberOfSiblings: current.numberOfSiblings || prefill.numberOfSiblings || 0,
  homeAddress: current.homeAddress || prefill.homeAddress || "",
  airportRepatriation: current.airportRepatriation || prefill.airportRepatriation || "",
  educationLevel: current.educationLevel || prefill.educationLevel || "",
  languageSkills: mergeMissingStringMap(current.languageSkills || {}, (prefill.languageSkills as Record<string, string>) || {}),
  workAreas: mergeMissingUnknownMap(
    (current.workAreas as Record<string, unknown>) || {},
    (prefill.workAreas as Record<string, unknown>) || {},
  ),
  employmentHistory:
    Array.isArray(current.employmentHistory) && current.employmentHistory.length > 0
      ? current.employmentHistory
      : Array.isArray(prefill.employmentHistory)
      ? prefill.employmentHistory
      : current.employmentHistory,
  introduction: mergeMissingUnknownMap(
    (current.introduction as Record<string, unknown>) || {},
    (prefill.introduction as Record<string, unknown>) || {},
  ),
  skillsPreferences: mergeMissingUnknownMap(
    (current.skillsPreferences as Record<string, unknown>) || {},
    (prefill.skillsPreferences as Record<string, unknown>) || {},
  ),
  agencyContact: mergeMissingUnknownMap(
    (current.agencyContact as Record<string, unknown>) || {},
    (prefill.agencyContact as Record<string, unknown>) || {},
  ),
});

// ─── Evaluation method constants ──────────────────────────────────────────────
const EVAL_PARENT_DECLARATION =
  "Based on FDW's declaration, no evaluation/observation by Singapore EA or overseas training centre/EA";
const EVAL_PARENT_INTERVIEWED = "Interviewed by Singapore EA";
const EVAL_SUB_OPTIONS = [
  "Interviewed via telephone/teleconference",
  "Interviewed via videoconference",
  "Interviewed in person",
  "Interviewed in person and also made observation of FDW in the areas of work listed in table",
];

const tabs = [
  { label: "Profile", icon: User },
  { label: "Skills", icon: Star },
  { label: "Employment History", icon: Briefcase },
  { label: "Availability / Remark", icon: Clock },
  { label: "Introduction", icon: FileText },
  { label: "Public Introduction", icon: Globe },
  { label: "Private Info", icon: Lock },
];

let xlsxLoader: Promise<typeof import("xlsx")> | null = null;

const loadXlsx = async () => {
  xlsxLoader ??= import("xlsx");
  return await xlsxLoader;
};

const normalizeImportLabel = (value: unknown) =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .replace(/[•►]/g, "")
    .trim()
    .toLowerCase();

const cleanImportedValue = (value: unknown) => {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  if (/^(?:not stated|none stated|not provided(?: in biodata)?|blank in biodata|not specified|none)$/i.test(text)) {
    return "";
  }
  return text;
};

const parseImportedNumber = (value: unknown) => {
  const text = cleanImportedValue(value);
  if (!text) return 0;
  const match = text.match(/-?\d+/);
  return match ? Number(match[0]) : 0;
};

const parseImportedDate = (value: unknown) => {
  const text = cleanImportedValue(value);
  if (!text) return "";
  const match = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (!match) return "";
  const [, dd, mm, yyyy] = match;
  return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
};

const parseImportedBoolean = (value: unknown): boolean | undefined => {
  const text = cleanImportedValue(value).toLowerCase();
  if (!text) return undefined;
  if (/(^|[^a-z])(yes|check|checked|true)([^a-z]|$)/.test(text)) return true;
  if (/(^|[^a-z])(no|unchecked|false)([^a-z]|$)/.test(text)) return false;
  return undefined;
};

const importedRowMap = (rows: unknown[][]) => {
  const map = new Map<string, string>();
  rows.forEach((row) => {
    const label = cleanImportedValue(row[0]);
    if (!label) return;
    map.set(normalizeImportLabel(label), cleanImportedValue(row[1]));
  });
  return map;
};

const importedSectionValues = (rows: unknown[][]) => {
  const sections = new Map<string, string>();
  let currentSection = "";
  rows.forEach((row) => {
    const first = cleanImportedValue(row[0]);
    const second = cleanImportedValue(row[1]);
    if (!first) return;
    if (first.toLowerCase().includes("introduction tab") || first.toLowerCase().includes("private info")) {
      currentSection = normalizeImportLabel(first);
      return;
    }
    if (normalizeImportLabel(first) === "value" && currentSection && second) {
      sections.set(currentSection, second);
    }
  });
  return sections;
};

const buildImportedMaidProfile = (rowsBySheet: Record<string, unknown[][]>): MaidProfile => {
  const profileRows = rowsBySheet.Profile ?? [];
  const skillsRows = rowsBySheet.Skills ?? [];
  const employmentRows = rowsBySheet["Employment History"] ?? [];
  const introRows = rowsBySheet["Introduction & Private"] ?? [];

  const profileMap = importedRowMap(profileRows);
  const introSections = importedSectionValues(introRows);

  const otherInformation: Record<string, boolean> = {};
  for (const row of skillsRows) {
    const label = cleanImportedValue(row[0]);
    const value = row[1];
    if (
      [
        "Able to handle pork?",
        "Able to eat pork?",
        "Able to care for dog/cat?",
        "Able to do simple sewing?",
        "Able to do gardening work?",
      ].includes(label)
    ) {
      const parsed = parseImportedBoolean(value);
      if (parsed !== undefined) otherInformation[label] = parsed;
    }
  }

  const evaluationMethods: string[] = [];
  const evalRows = new Map<string, string>();
  skillsRows.forEach((row) => {
    const label = cleanImportedValue(row[0]);
    const value = cleanImportedValue(row[1]);
    if (label) evalRows.set(label, value);
  });
  if (parseImportedBoolean(evalRows.get("Interviewed by Singapore EA"))) {
    evaluationMethods.push(EVAL_PARENT_INTERVIEWED);
  }
  EVAL_SUB_OPTIONS.forEach((option) => {
    if (parseImportedBoolean(evalRows.get(option))) {
      evaluationMethods.push(option);
    }
  });

  const workAreaLabelMap: Record<string, string> = {
    "care of infants/children (age range: infants–4 yr)": "Care of infants/children",
    "care of elderly": "Care of elderly",
    "care of disabled": "Care of disabled",
    "general housework": "General housework",
    "cooking (vegetarian & non-vegetarian)": "Cooking",
    "language abilities (hindi, english)": "Language abilities (spoken)",
    "other skills": "Other skills, if any",
  };

  const workAreas: Record<string, unknown> = {};
  skillsRows.forEach((row) => {
    const sourceLabel = normalizeImportLabel(row[0]);
    const targetLabel = workAreaLabelMap[sourceLabel];
    if (!targetLabel) return;
    const rating = parseImportedNumber(row[3]);
    const note = cleanImportedValue(row[4]);
    workAreas[targetLabel] = {
      willing: parseImportedBoolean(row[1]),
      experience: parseImportedBoolean(row[2]),
      yearsOfExperience: "",
      rating: rating || null,
      note,
      evaluation: [rating ? `${rating}/5` : "", note].filter(Boolean).join(" - "),
    };
  });

  const languageSkills = {
    ...defaultMaidProfile.languageSkills,
  };
  skillsRows.forEach((row) => {
    const label = cleanImportedValue(row[0]);
    const value = cleanImportedValue(row[1]);
    if (!label || !value) return;
    if (label === "English" || label === "Hindi") {
      languageSkills[label] = value;
    }
  });

  const employmentHistory = employmentRows
    .slice(3)
    .map((row) => ({
      from: cleanImportedValue(row[0]),
      to: cleanImportedValue(row[1]),
      country: cleanImportedValue(row[2]),
      employer: cleanImportedValue(row[3]),
      duties: cleanImportedValue(row[4]),
      remarks: cleanImportedValue(row[5]),
    }))
    .filter((row) => Object.values(row).some(Boolean));

  const availabilityInterviewOptions: string[] = [];
  employmentRows.forEach((row) => {
    const label = cleanImportedValue(row[0]);
    const checked = parseImportedBoolean(row[1]);
    if (checked !== true) return;
    if (label === "By Phone") availabilityInterviewOptions.push("FDW can be interviewed by phone");
    if (label === "By Video-conference") availabilityInterviewOptions.push("FDW can be interviewed by video-conference");
    if (label === "In Person") availabilityInterviewOptions.push("FDW can be interviewed in person");
  });

  const pastIllnesses: Record<string, boolean> = {
    "(I) Mental illness": parseImportedBoolean(profileMap.get(normalizeImportLabel("Mental illness"))) ?? false,
    "(II) Epilepsy": parseImportedBoolean(profileMap.get(normalizeImportLabel("Epilepsy"))) ?? false,
    "(III) Asthma": parseImportedBoolean(profileMap.get(normalizeImportLabel("Asthma"))) ?? false,
    "(IV) Diabetes": parseImportedBoolean(profileMap.get(normalizeImportLabel("Diabetes"))) ?? false,
    "(V) Hypertension": parseImportedBoolean(profileMap.get(normalizeImportLabel("Hypertension"))) ?? false,
    "(VI) Tuberculosis": parseImportedBoolean(profileMap.get(normalizeImportLabel("Tuberculosis"))) ?? false,
    "(VII) Heart disease": parseImportedBoolean(profileMap.get(normalizeImportLabel("Heart disease"))) ?? false,
    "(VIII) Malaria": parseImportedBoolean(profileMap.get(normalizeImportLabel("Malaria"))) ?? false,
    "(IX) Operations": parseImportedBoolean(profileMap.get(normalizeImportLabel("Operations"))) ?? false,
  };

  const foodHandlingPreferences = [
    parseImportedBoolean(profileMap.get(normalizeImportLabel("Food Handling — No Pork"))) ? "No Pork" : "",
    parseImportedBoolean(profileMap.get(normalizeImportLabel("Food Handling — No Beef"))) ? "No Beef" : "",
  ].filter(Boolean).join(", ");

  return {
    ...defaultMaidProfile,
    fullName: cleanImportedValue(profileMap.get(normalizeImportLabel("Full Name *"))),
    referenceCode: cleanImportedValue(profileMap.get(normalizeImportLabel("Ref Code *"))),
    type: cleanImportedValue(profileMap.get(normalizeImportLabel("Type"))),
    nationality: cleanImportedValue(profileMap.get(normalizeImportLabel("Nationality"))),
    dateOfBirth: parseImportedDate(profileMap.get(normalizeImportLabel("Date of Birth *"))),
    placeOfBirth: cleanImportedValue(profileMap.get(normalizeImportLabel("Place of Birth"))),
    height: parseImportedNumber(profileMap.get(normalizeImportLabel("Height (cm)"))),
    weight: parseImportedNumber(profileMap.get(normalizeImportLabel("Weight (kg)"))),
    religion: cleanImportedValue(profileMap.get(normalizeImportLabel("Religion"))),
    maritalStatus: cleanImportedValue(profileMap.get(normalizeImportLabel("Marital Status"))),
    numberOfChildren: parseImportedNumber(profileMap.get(normalizeImportLabel("Number of Children"))),
    numberOfSiblings: parseImportedNumber(profileMap.get(normalizeImportLabel("Number of Siblings"))),
    homeAddress: cleanImportedValue(profileMap.get(normalizeImportLabel("Residential Address in Home Country"))),
    airportRepatriation: cleanImportedValue(profileMap.get(normalizeImportLabel("Port / Airport for Repatriation"))),
    educationLevel: cleanImportedValue(profileMap.get(normalizeImportLabel("Education Level"))),
    languageSkills,
    workAreas,
    employmentHistory,
    introduction: {
      intro: cleanImportedValue(
        introSections.get(normalizeImportLabel("Introduction Tab (introduction.intro)")),
      ),
      publicIntro: cleanImportedValue(
        introSections.get(normalizeImportLabel("Public Introduction Tab (introduction.publicIntro)")),
      ),
      agesOfChildren: cleanImportedValue(profileMap.get(normalizeImportLabel("Ages of Children"))),
      presentSalary: cleanImportedValue(profileMap.get(normalizeImportLabel("Present Salary (S$)"))),
      expectedSalary: cleanImportedValue(profileMap.get(normalizeImportLabel("Expected Salary (S$)"))),
      availability: cleanImportedValue(profileMap.get(normalizeImportLabel("Availability"))),
      maidLoan: cleanImportedValue(profileMap.get(normalizeImportLabel("Maid Loan (S$)"))),
      offdayCompensation: cleanImportedValue(profileMap.get(normalizeImportLabel("Off-day Compensation (S$/day)"))),
      allergies: cleanImportedValue(profileMap.get(normalizeImportLabel("Allergies"))),
      physicalDisabilities: cleanImportedValue(profileMap.get(normalizeImportLabel("Physical Disabilities"))),
      dietaryRestrictions: cleanImportedValue(profileMap.get(normalizeImportLabel("Dietary Restrictions"))),
      foodHandlingPreferences,
      otherRemarks: cleanImportedValue(profileMap.get(normalizeImportLabel("Other Remarks"))),
      pastIllnesses,
    },
    skillsPreferences: {
      indianMaidCategory: cleanImportedValue(profileMap.get(normalizeImportLabel("Indian Maid Category"))),
      otherInformation,
      offDaysPerMonth: cleanImportedValue(profileMap.get(normalizeImportLabel("Rest Days per Month"))),
      evaluationMethods,
      availabilityInterviewOptions,
      privateInfo: cleanImportedValue(
        introSections.get(normalizeImportLabel("Private Info — Historical Record (skillsPreferences.privateInfo)")),
      ),
      interviewedBy: cleanImportedValue(
        introSections.get(normalizeImportLabel("Interviewed By (skillsPreferences.interviewedBy)")),
      ),
      referredBy: cleanImportedValue(
        introSections.get(normalizeImportLabel("Referred By (skillsPreferences.referredBy)")),
      ),
    },
    agencyContact: {
      phone: cleanImportedValue(
        introSections.get(normalizeImportLabel("Private Info — Agency Contact (agencyContact.phone)")),
      ),
      passportNo: cleanImportedValue(
        introSections.get(normalizeImportLabel("Private Info — Passport Number (agencyContact.passportNo)")),
      ),
      homeCountryContactNumber: cleanImportedValue(profileMap.get(normalizeImportLabel("Contact Number in Home Country"))),
    },
  };
};

const AddMaid = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const excelInputRef = useRef<HTMLInputElement | null>(null);
  const atsPrefillStartedRef = useRef(false);
  const [activeTab, setActiveTab] = useState(0);
  const [formData, setFormData] = useState<MaidProfile>(defaultMaidProfile);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isImportingExcel, setIsImportingExcel] = useState(false);
  const [isManagePhotosOpen, setIsManagePhotosOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [duplicateRefDialogOpen, setDuplicateRefDialogOpen] = useState(false);
  const [duplicateRefOriginal, setDuplicateRefOriginal] = useState("");
  const [duplicateRefSuggestion, setDuplicateRefSuggestion] = useState("");
  const [pendingDuplicatePayload, setPendingDuplicatePayload] = useState<MaidProfile | null>(null);
  const [isResolvingDuplicateRef, setIsResolvingDuplicateRef] = useState(false);
  const [maxUnlockedTab, setMaxUnlockedTab] = useState(0);
  const [isCreated, setIsCreated] = useState(false);

  useEffect(() => {
    if (searchParams.get("source") !== "ats" || atsPrefillStartedRef.current) return;
    atsPrefillStartedRef.current = true;

    const seedPrefill = buildAtsPrefill({ query: searchParams });
    setFormData((prev) => mergeAtsPrefillIntoMaid(prev, seedPrefill));
  }, [searchParams]);

  const fileToDataUrlLegacy = useCallback(
    (file: File) =>
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const dataUrl = String(reader.result || "");
            const originalSize = getImageSizeInMB(dataUrl);
            const compressed = await compressImage(dataUrl, {
              maxWidth: 1400,
              maxHeight: 1400,
              quality: 0.72,
              maxSizeMB: 0.45,
            });
            const compressedSize = getImageSizeInMB(compressed);
            if (originalSize > 0.5) {
              console.log(
                `[Image Compression] Original: ${originalSize.toFixed(2)}MB → Compressed: ${compressedSize.toFixed(2)}MB`
              );
            }
            resolve(compressed);
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
      }),
    [],
  );

  const fileToDataUrl = useCallback(async (file: File) => {
    const originalSize = file.size / 1024 / 1024;
    const compressed = await compressImageFile(file, PHOTO_UPLOAD_OPTIONS);
    const compressedSize = getImageSizeInMB(compressed);
    if (originalSize > 0.35 || compressedSize > 0.35) {
      console.log(
        `[Image Compression] Original: ${originalSize.toFixed(2)}MB -> Compressed: ${compressedSize.toFixed(2)}MB`
      );
    }
    return compressed;
  }, []);

  const handleUploadPhoto = useCallback(() => {
    setIsManagePhotosOpen(true);
  }, []);

  const handleSingleFileSelection = useCallback(
    async (
      event: React.ChangeEvent<HTMLInputElement>,
      handler: (file?: File) => Promise<void> | void,
    ) => {
      const input = event.currentTarget;
      const file = input.files?.[0];
      input.value = "";
      await handler(file);
    },
    [],
  );

  const handleImportExcel = useCallback(async (file?: File) => {
    if (!file) return;
    try {
      setIsImportingExcel(true);
      const XLSX = await loadXlsx();
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const rowsBySheet = workbook.SheetNames.reduce<Record<string, unknown[][]>>((acc, sheetName) => {
        const sheet = workbook.Sheets[sheetName];
        acc[sheetName] = sheet
          ? (XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", blankrows: false }) as unknown[][])
          : [];
        return acc;
      }, {});
      const imported = buildImportedMaidProfile(rowsBySheet);
      if (!imported.fullName || !imported.referenceCode) {
        throw new Error("The Excel file is missing the maid name or reference code.");
      }
      setFormData((prev) => ({
        ...prev,
        ...imported,
        languageSkills: { ...prev.languageSkills, ...imported.languageSkills },
      }));
      setActiveTab(0);
      toast.success("Excel data loaded into the maid bio-data form");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to import Excel file");
    } finally {
      setIsImportingExcel(false);
    }
  }, []);

  const photos = useMemo(
    () =>
      Array.isArray(formData.photoDataUrls) && formData.photoDataUrls.length > 0
        ? formData.photoDataUrls
        : formData.photoDataUrl
        ? [formData.photoDataUrl]
        : [],
    [formData.photoDataUrl, formData.photoDataUrls],
  );
  const passportOrTwoByTwoPhoto = photos[0] ?? "";
  const fullBodyPhoto = photos[1] ?? "";
  const extraPhotos = photos.slice(2);

  const savePhotos = useCallback(
    async (nextPhotos: string[]) => {
      const referenceCode = String(formData.referenceCode || "").trim();
      const cleaned = nextPhotos.filter(Boolean).slice(0, 5);
      const optimistic: MaidProfile = {
        ...formData,
        referenceCode,
        photoDataUrls: cleaned,
        photoDataUrl: cleaned[0] || "",
        hasPhoto: cleaned.length > 0,
      };

      if (!isCreated || !formData.id) {
        setFormData(optimistic);
        return;
      }

      if (!referenceCode) {
        toast.error("Ref Code is required before uploading photos");
        return;
      }

      try {
        setIsUploadingPhoto(true);
        setFormData(optimistic);
        const response = await fetch(`/api/maids/${encodeURIComponent(referenceCode)}/photo-gallery`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...getAgencyAdminAuthHeaders() },
          body: JSON.stringify({ photoDataUrls: cleaned }),
        });
        const data = (await response.json().catch(() => ({}))) as { error?: string; maid?: MaidProfile };
        if (!response.ok || !data.maid) throw new Error(data.error || "Failed to upload photos");
        setFormData(data.maid);
        toast.success("Photos updated");
      } catch (error) {
        setFormData(formData);
        toast.error(error instanceof Error ? error.message : "Failed to upload photos");
      } finally {
        setIsUploadingPhoto(false);
      }
    },
    [formData, isCreated],
  );

  const replacePhotoAt = useCallback(
    async (index: number, file?: File) => {
      if (!file) return;
      try {
        const dataUrl = await fileToDataUrl(file);
        const next = [...photos];
        next[index] = dataUrl;
        await savePhotos(next);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to read photo");
      }
    },
    [fileToDataUrl, photos, savePhotos],
  );

  const addExtraPhoto = useCallback(
    async (file?: File) => {
      if (!file) return;
      try {
        const dataUrl = await fileToDataUrl(file);
        await savePhotos([...photos, dataUrl]);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to read photo");
      }
    },
    [fileToDataUrl, photos, savePhotos],
  );

  const removePhotoAt = useCallback(
    async (index: number) => {
      await savePhotos(photos.filter((_, i) => i !== index));
    },
    [photos, savePhotos],
  );

  const buildPayload = useCallback((): MaidProfile => ({
    ...formData,
    fullName: String(formData.fullName || "").trim(),
    referenceCode: String(formData.referenceCode || "").trim(),
    type: String(formData.type || "").trim(),
    nationality: String(formData.nationality || "").trim(),
    placeOfBirth: String(formData.placeOfBirth || "").trim(),
    photoDataUrl: String(formData.photoDataUrl || "").trim(),
    photoDataUrls: (Array.isArray(formData.photoDataUrls) ? formData.photoDataUrls : [])
      .map((item) => String(item || "").trim())
      .filter(Boolean),
    videoDataUrl: stripInlineMedia(formData.videoDataUrl),
  }), [formData]);

  const doesReferenceCodeExist = useCallback(async (referenceCode: string) => {
    const trimmedReferenceCode = String(referenceCode || "").trim();
    if (!trimmedReferenceCode) return false;

    const response = await fetch(`/api/maids/${encodeURIComponent(trimmedReferenceCode)}`, {
      headers: { ...getAgencyAdminAuthHeaders() },
    });

    if (response.status === 404) return false;
    if (response.ok) return true;

    const data = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error || "Failed to verify reference code");
  }, []);

  const buildUniqueReferenceCode = useCallback(async (baseReferenceCode: string) => {
    const trimmedBase = String(baseReferenceCode || "").trim();
    const normalizedBase = trimmedBase.replace(/-\d+$/, "");

    for (let attempt = 2; attempt <= 50; attempt += 1) {
      const candidate = `${normalizedBase}-${attempt}`;
      const exists = await doesReferenceCodeExist(candidate);
      if (!exists) return candidate;
    }

    const fallback = `${normalizedBase}-${Date.now().toString().slice(-6)}`;
    return fallback;
  }, [doesReferenceCodeExist]);

  const saveWithPayload = useCallback(async (
    payload: MaidProfile,
    options?: { skipDuplicateCheck?: boolean },
  ) => {
    const shouldCreate = !isCreated;

    if (shouldCreate && !options?.skipDuplicateCheck) {
      const exists = await doesReferenceCodeExist(payload.referenceCode);
      if (exists) {
        const suggestion = await buildUniqueReferenceCode(payload.referenceCode);
        setDuplicateRefOriginal(payload.referenceCode);
        setDuplicateRefSuggestion(suggestion);
        setPendingDuplicatePayload(payload);
        setDuplicateRefDialogOpen(true);
        return false;
      }
    }

    const { taskId, promise } = startMaidSaveTask({
      payload,
      shouldCreate,
      authHeaders: getAgencyAdminAuthHeaders(),
    });

    void promise.catch(() => undefined);

    navigate("/agencyadmin/edit-maids", {
      state: {
        fromView: "public",
        saveTaskId: taskId,
      },
    });

    return true;
  }, [buildUniqueReferenceCode, doesReferenceCodeExist, isCreated, navigate]);

  const performSave = useCallback(async () => {
    if (isSaving) return;
    const payload = buildPayload();
    if (!payload.fullName || !payload.referenceCode) {
      toast.error("Maid Name and Ref Code are required");
      return;
    }

    if (activeTab !== tabs.length - 1) {
      setMaxUnlockedTab((prev) => Math.max(prev, Math.min(activeTab + 1, tabs.length - 1)));
      setActiveTab((t) => t + 1);
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    try {
      await saveWithPayload(payload);
    } catch (error) {
      console.error("[AddMaid] Save failed:", error);
      setSaveError("Failed to save maid. Please try again.");
      toast.error(error instanceof Error ? error.message : "Failed to save maid");
    } finally {
      setIsSaving(false);
    }
  }, [buildPayload, activeTab, isSaving, saveWithPayload]);

  const handleDuplicateReferenceSkip = useCallback(() => {
    setDuplicateRefDialogOpen(false);
    setPendingDuplicatePayload(null);
    setDuplicateRefOriginal("");
    setDuplicateRefSuggestion("");
    toast.error("Save skipped. Please update the reference code to continue.");
  }, []);

  const handleDuplicateReferenceAutoConfigure = useCallback(async () => {
    if (!pendingDuplicatePayload || !duplicateRefSuggestion) return;

    setIsResolvingDuplicateRef(true);
    const nextPayload: MaidProfile = {
      ...pendingDuplicatePayload,
      referenceCode: duplicateRefSuggestion,
    };

    try {
      setFormData((prev) => ({
        ...prev,
        referenceCode: duplicateRefSuggestion,
      }));
      setDuplicateRefDialogOpen(false);
      setPendingDuplicatePayload(null);
      setDuplicateRefOriginal("");
      setDuplicateRefSuggestion("");
      await saveWithPayload(nextPayload, { skipDuplicateCheck: true });
      toast.success(`Reference code updated to ${duplicateRefSuggestion}`);
    } catch (error) {
      console.error("[AddMaid] Auto-configure reference code failed:", error);
      setSaveError("Failed to save maid. Please try again.");
      toast.error(error instanceof Error ? error.message : "Failed to save maid");
    } finally {
      setIsResolvingDuplicateRef(false);
    }
  }, [duplicateRefSuggestion, pendingDuplicatePayload, saveWithPayload]);

  const handleSubmit = useCallback(() => {
    if (activeTab === tabs.length - 1) {
      setIsConfirmOpen(true);
    } else {
      void performSave();
    }
  }, [activeTab, performSave]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50/30">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                <span>Agency Admin</span>
                <ChevronRight className="h-3 w-3" />
                <span className="text-amber-600 font-medium">Add New Maid</span>
              </div>
              <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Add Maid Profile</h1>
              <p className="text-slate-500 mt-1">Complete all sections to create a comprehensive maid profile.</p>
            </div>
            <div className="flex flex-col items-start gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => excelInputRef.current?.click()}
                disabled={isImportingExcel}
                className="rounded-xl border-amber-200 bg-white text-amber-700 hover:bg-amber-50"
              >
                {isImportingExcel ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                {isImportingExcel ? "Reading Excel..." : "Upload Excel File"}
              </Button>
              <p className="max-w-xs text-xs leading-relaxed text-slate-500">
                Use the Excel layout from your maid sample file. The upload will fill this bio-data form automatically.
              </p>
              <input
                ref={excelInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  void handleImportExcel(file);
                }}
              />
            </div>
          </div>
        </div>

        {/* PDF Auto-fill Banner */}
        <PdfAutofillBanner formData={formData} setFormData={setFormData} />

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-1 mb-0 bg-white rounded-t-2xl border border-b-0 border-slate-200 p-2 shadow-sm">
          {tabs.map((tab, i) => {
            const Icon = tab.icon;
            const isActive = activeTab === i;
            const isUnlocked = i <= maxUnlockedTab;
            const isCompleted = i < activeTab;
            return (
              <button
                key={tab.label}
                onClick={() => {
                  if (isUnlocked) {
                    setActiveTab(i);
                  } else {
                    toast.error("Please save & continue to unlock this step");
                  }
                }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  isActive
                    ? "bg-amber-400 text-slate-900 shadow-md shadow-amber-200"
                    : isCompleted
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                    : isUnlocked
                    ? "text-slate-600 hover:bg-slate-100"
                    : "text-slate-300 cursor-not-allowed"
                }`}
              >
                {isCompleted ? (
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <Icon className="h-3.5 w-3.5" />
                )}
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Error Banner */}
        {saveError && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-red-500" />
            {saveError}
          </div>
        )}

        {/* Active Tab Content */}
        {(() => {
          const primaryLabel = activeTab >= tabs.length - 1 ? "Complete & Save" : "Continue to Next";
          const ActiveTab = TabComponents[activeTab];
          return (
            <ActiveTab
              formData={formData}
              setFormData={setFormData}
              onSave={handleSubmit}
              isSaving={isSaving}
              onUploadPhoto={handleUploadPhoto}
              isUploadingPhoto={isUploadingPhoto}
              primaryLabel={primaryLabel}
            />
          );
        })()}

        {/* Confirm Dialog */}
        <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
          <DialogContent className="max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">Complete Maid Profile</DialogTitle>
              <DialogDescription className="text-slate-500">
                You have completed all sections. Your maid profile with compressed images will be saved and optimized for faster uploads.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setIsConfirmOpen(false)} disabled={isSaving} className="rounded-xl">
                Back
              </Button>
              <Button
                type="button"
                onClick={() => { setIsConfirmOpen(false); void performSave(); }}
                disabled={isSaving}
                className="rounded-xl bg-amber-400 text-slate-900 hover:bg-amber-500 font-semibold"
              >
                {isSaving ? "Saving..." : "Save & Submit"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={duplicateRefDialogOpen} onOpenChange={setDuplicateRefDialogOpen}>
          <DialogContent className="max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">Reference Code Already Exists</DialogTitle>
              <DialogDescription className="text-slate-500">
                <span className="font-semibold text-slate-700">{duplicateRefOriginal}</span> is already in use.
                You can skip this save or let us configure a new reference code automatically.
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Suggested new reference code: <span className="font-bold">{duplicateRefSuggestion}</span>
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={handleDuplicateReferenceSkip}
                disabled={isResolvingDuplicateRef}
              >
                Skip Save
              </Button>
              <Button
                onClick={() => void handleDuplicateReferenceAutoConfigure()}
                disabled={isResolvingDuplicateRef || !duplicateRefSuggestion}
                className="bg-amber-500 text-slate-950 hover:bg-amber-400"
              >
                {isResolvingDuplicateRef ? "Configuring..." : "Auto Configure"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Photo Manager Dialog */}
        <Dialog open={isManagePhotosOpen} onOpenChange={setIsManagePhotosOpen}>
          <DialogContent className="max-w-2xl rounded-3xl p-0 overflow-hidden">
            <div className="bg-white px-7 py-5 border-b border-slate-200">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold tracking-tight text-black">
                  📷 Manage Photos
                </DialogTitle>
                <DialogDescription className="text-slate-600 text-xs mt-0.5 font-medium">
                  Slot 1 → passport size · Slot 2 → full body · Slots 3–5 → extras
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="px-7 py-6 flex gap-6 items-start flex-wrap bg-white">

              {/* Slot 1 — Passport */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-black">Passport</span>
                </div>

                <div
                  className="group relative overflow-hidden border-2 border-dashed border-slate-300 bg-slate-100 hover:border-indigo-400 hover:bg-indigo-50/40 transition-all duration-200 flex flex-col items-center justify-center gap-2"
                  style={{ width: 100, height: 125, borderRadius: 0 }}
                >
                  {passportOrTwoByTwoPhoto ? (
                    <>
                      <img
                        src={passportOrTwoByTwoPhoto}
                        alt="passport"
                        className="w-full h-full object-contain"
                        style={{ borderRadius: 0 }}
                      />
                      <button
                        type="button"
                        disabled={isUploadingPhoto}
                        onClick={() => void removePhotoAt(0)}
                        className="absolute top-1.5 right-1.5 h-5 w-5 rounded-full bg-black/60 text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-150 hover:bg-red-500"
                        aria-label="Remove passport photo"
                      >✕</button>
                    </>
                  ) : (
                    <>
                      <div className="w-8 h-8 rounded-full bg-slate-300 flex items-center justify-center">
                        <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                        </svg>
                      </div>
                      <span className="text-[10px] text-slate-600 font-semibold">No photo</span>
                    </>
                  )}
                </div>

                <span className="text-[10px] text-black font-bold">100 × 125 px</span>

                <label className="cursor-pointer">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 transition-all duration-150 ${
                    passportOrTwoByTwoPhoto
                      ? "bg-slate-200 text-black hover:bg-slate-300"
                      : "bg-amber-400 text-black hover:bg-amber-500 shadow-sm shadow-amber-200"
                  }`} style={{ borderRadius: 0 }}>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                    {passportOrTwoByTwoPhoto ? "Replace" : "Upload"}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    disabled={isUploadingPhoto}
                    onChange={(e) => void handleSingleFileSelection(e, (file) => replacePhotoAt(0, file))}
                  />
                </label>

                <p className="text-[10px] text-slate-500 font-medium">JPG / PNG · max 2 MB</p>
              </div>

              <div className="w-px self-stretch bg-slate-200" />

              {/* Slot 2 — Full body */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-black">Full body</span>
                </div>

                <div
                  className="group relative overflow-hidden border-2 border-dashed border-slate-300 bg-slate-100 hover:border-indigo-400 hover:bg-indigo-50/40 transition-all duration-200 flex flex-col items-center justify-center gap-2"
                  style={{ width: 110, height: 190, borderRadius: 0 }}
                >
                  {fullBodyPhoto ? (
                    <>
                      <img
                        src={fullBodyPhoto}
                        alt="full body"
                        className="w-full h-full object-contain"
                        style={{ borderRadius: 0 }}
                      />
                      <button
                        type="button"
                        disabled={isUploadingPhoto}
                        onClick={() => void removePhotoAt(1)}
                        className="absolute top-1.5 right-1.5 h-5 w-5 rounded-full bg-black/60 text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-150 hover:bg-red-500"
                        aria-label="Remove full body photo"
                      >✕</button>
                    </>
                  ) : (
                    <>
                      <div className="w-8 h-8 rounded-full bg-slate-300 flex items-center justify-center">
                        <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                        </svg>
                      </div>
                      <span className="text-[10px] text-slate-600 font-semibold">No photo</span>
                    </>
                  )}
                </div>

                <span className="text-[10px] text-black font-bold">240 × 400 px</span>

                <label className="cursor-pointer">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 transition-all duration-150 ${
                    fullBodyPhoto
                      ? "bg-slate-200 text-black hover:bg-slate-300"
                      : "bg-amber-400 text-black hover:bg-amber-500 shadow-sm shadow-amber-200"
                  }`} style={{ borderRadius: 0 }}>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                    {fullBodyPhoto ? "Replace" : "Upload"}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    disabled={isUploadingPhoto}
                    onChange={(e) => void handleSingleFileSelection(e, (file) => replacePhotoAt(1, file))}
                  />
                </label>

                <p className="text-[10px] text-slate-500 font-medium">JPG / PNG · max 2 MB</p>
              </div>

              <div className="w-px self-stretch bg-slate-200" />

              {/* Slots 3–5 — Extras */}
              <div className="flex flex-col gap-3 flex-1 min-w-[180px]">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-black">Extras</span>
                  <span className="text-[10px] font-semibold bg-slate-200 text-black border border-slate-300 px-2 py-0.5 rounded-full">
                    {extraPhotos.length} / 3
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {extraPhotos.map((photo, index) => (
                    <div
                      key={`${photo}-${index}`}
                      className="group relative overflow-hidden border border-slate-300 bg-slate-100"
                      style={{ width: 78, height: 78, borderRadius: 0 }}
                    >
                      <img
                        src={photo}
                        alt={`extra ${index + 1}`}
                        className="w-full h-full object-contain"
                        style={{ borderRadius: 0 }}
                      />
                      <button
                        type="button"
                        disabled={isUploadingPhoto}
                        onClick={() => void removePhotoAt(index + 2)}
                        className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-150 hover:bg-red-500"
                        aria-label={`Remove extra photo ${index + 1}`}
                      >✕</button>
                    </div>
                  ))}

                  {extraPhotos.length < 3 && (
                    <label
                      className="flex flex-col items-center justify-center gap-1 border-2 border-dashed border-slate-300 bg-slate-100 cursor-pointer hover:border-amber-400 hover:bg-amber-50/50 transition-all duration-200"
                      style={{ width: 78, height: 78, borderRadius: 0 }}
                    >
                      <div className="w-6 h-6 rounded-full bg-slate-300 flex items-center justify-center">
                        <span className="text-black text-base font-bold leading-none">+</span>
                      </div>
                      <span className="text-[10px] text-black font-semibold">Add</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        disabled={isUploadingPhoto || photos.length >= 5}
                        onChange={(e) => void handleSingleFileSelection(e, addExtraPhoto)}
                      />
                    </label>
                  )}

                  {Array.from({ length: Math.max(0, 2 - extraPhotos.length) }).map((_, i) => (
                    <div
                      key={`placeholder-${i}`}
                      className="border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center"
                      style={{ width: 78, height: 78, borderRadius: 0 }}
                    >
                      <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909" />
                      </svg>
                    </div>
                  ))}
                </div>

                <p className="text-[10px] text-slate-500 font-medium">Max 3 extras · JPG / PNG</p>

                <div className="mt-1 flex items-center gap-2">
                  <div className="flex gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-4 h-1.5 transition-colors ${
                          i < photos.length ? "bg-amber-400" : "bg-slate-200"
                        }`}
                        style={{ borderRadius: 0 }}
                      />
                    ))}
                  </div>
                  <p className="text-[10px] text-black font-bold">
                    {photos.length} / 5 used
                  </p>
                </div>
              </div>

            </div>

            <div className="px-7 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsManagePhotosOpen(false)}
                disabled={isUploadingPhoto}
                className="text-sm font-bold text-black border-slate-400 hover:bg-slate-100 px-5"
                style={{ borderRadius: 0 }}
              >
                {isUploadingPhoto ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…
                  </span>
                ) : "Close"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

// ─── Shared types ─────────────────────────────────────────────────────────────

type TabSaveProps = {
  onSave?: () => void | Promise<void>;
  isSaving?: boolean;
  onUploadPhoto?: () => void;
  isUploadingPhoto?: boolean;
  primaryLabel?: string;
};

type FormTabProps = TabSaveProps & {
  formData: MaidProfile;
  setFormData: React.Dispatch<React.SetStateAction<MaidProfile>>;
};

// ─── Shared UI primitives ─────────────────────────────────────────────────────

const TabCard = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-white border border-slate-200 rounded-b-2xl rounded-tr-2xl shadow-sm p-6 md:p-8 space-y-8">
    {children}
  </div>
);

const SectionHeader = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center gap-3 mb-4">
    <div className="h-1 w-6 rounded-full bg-amber-400" />
    <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider">{children}</h4>
    <div className="flex-1 h-px bg-slate-100" />
  </div>
);

const FormRow2Col = ({ left, right }: { left: React.ReactNode; right?: React.ReactNode }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
    <div>{left}</div>
    {right ? <div>{right}</div> : <div />}
  </div>
);

const Field = ({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) => (
  <div className="space-y-1.5 w-full">
    <Label className="text-sm font-semibold text-slate-900 uppercase tracking-wide">{label}</Label>
    {children}
    {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
  </div>
);

const StyledInput = ({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    {...props}
    className={`
      w-full h-11 rounded-xl border border-slate-600 bg-slate-50/80
      px-3.5 text-sm text-slate-800 font-medium
      shadow-sm
      transition-all duration-200 ease-in-out
      placeholder:text-slate-600 placeholder:font-normal
      focus:outline-none
      focus:border-amber-400 focus:bg-white
      focus:shadow-[0_0_0_3px_rgba(251,191,36,0.18),0_1px_4px_rgba(0,0,0,0.06)]
      hover:border-slate-300 hover:bg-white
      disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-100
      ${className}
    `}
  />
);

const StyledSelect = ({
  options,
  className = "",
  value,
  onChange,
  name,
}: {
  options: Array<string | { value: string; label: string; disabled?: boolean }>;
  className?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  name?: string;
}) => (
  <select
    name={name}
    value={value}
    onChange={onChange}
    className={`
      w-full h-11 rounded-xl border border-slate-500 bg-slate-50/80
      px-3.5 text-sm text-slate-800 font-medium
      shadow-sm appearance-none
      transition-all duration-200 ease-in-out
      focus:outline-none focus:border-amber-400 focus:bg-white
      focus:shadow-[0_0_0_3px_rgba(251,191,36,0.18),0_1px_4px_rgba(0,0,0,0.06)]
      hover:border-slate-300 hover:bg-white
      ${className}
    `}
  >
    {options.map((opt) => {
      if (typeof opt === "string") return <option key={opt} value={opt}>{opt}</option>;
      return <option key={opt.value} value={opt.value} disabled={opt.disabled}>{opt.label}</option>;
    })}
  </select>
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
  <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={name}>
    {options.map((opt) => {
      const isSelected = value === opt;
      return (
        <button
          key={opt}
          type="button"
          role="radio"
          aria-checked={isSelected}
          onClick={() => onValueChange?.(opt)}
          className={`
            relative inline-flex items-center justify-center
            px-3.5 py-1.5 rounded-full text-sm font-semibold
            border transition-all duration-150 ease-in-out
            select-none cursor-pointer
            focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-1
            ${isSelected
              ? "bg-amber-400 border-amber-400 text-slate-900 shadow-sm shadow-amber-200/60"
              : "bg-white border-slate-200 text-slate-900 hover:border-amber-300 hover:text-slate-700 hover:bg-amber-50/50"
            }
          `}
        >
          {isSelected && (
            <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-slate-900/40 inline-block" />
          )}
          {opt}
        </button>
      );
    })}
  </div>
);

// ─── FIX 2: YesNo now supports deselection by clicking the active button again ─
const YesNo = ({
  name,
  value,
  onValueChange,
}: {
  name: string;
  value?: boolean;
  onValueChange?: (next: boolean | undefined) => void;
}) => (
  <div
    className="inline-flex rounded-lg border border-slate-200 bg-slate-100/80 p-0.5 gap-0.5"
    role="radiogroup"
    aria-label={name}
  >
    {([true, false] as const).map((bool) => {
      const isSelected = value === bool;
      const label = bool ? "Yes" : "No";
      return (
        <button
          key={label}
          type="button"
          role="radio"
          aria-checked={isSelected}
          onClick={() =>
            // clicking the already-selected button clears the selection back to undefined
            onValueChange?.(isSelected ? undefined : bool)
          }
          className={`
            relative px-3.5 py-1 rounded-md text-sm font-semibold
            transition-all duration-150 ease-in-out
            focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-1
            min-w-[44px] text-center
            ${isSelected
              ? bool
                ? "bg-emerald-500 text-white shadow-sm shadow-emerald-200/70"
                : "bg-rose-400 text-white shadow-sm shadow-rose-200/70"
              : "bg-transparent text-slate-900 hover:text-slate-600 hover:bg-white/60"
            }
          `}
        >
          {label}
        </button>
      );
    })}
  </div>
);

const StarRating = ({
  value, onChange, name,
}: {
  value: number | null; onChange: (next: number | null) => void; name: string;
}) => (
  <div className="flex items-center gap-1">
    <input type="hidden" name={name} value={value === null ? "" : String(value)} />
    {Array.from({ length: 5 }, (_, i) => {
      const sv = i + 1;
      const active = value !== null && sv <= value;
      return (
        <button
          key={sv}
          type="button"
          className="p-0.5 transition-transform hover:scale-110"
          onClick={() => onChange(value === sv ? null : sv)}
        >
          <Star className={`h-4 w-4 ${active ? "fill-amber-400 text-amber-400" : "text-slate-600 hover:text-amber-300"}`} />
        </button>
      );
    })}
    <button
      type="button"
      className={`ml-2 rounded-lg border px-2 py-0.5 text-[11px] font-medium transition-colors ${value === null ? "bg-slate-100 text-slate-500 border-slate-200" : "bg-white text-slate-400 border-slate-200 hover:bg-slate-50"}`}
      onClick={() => onChange(null)}
    >N.A.</button>
  </div>
);

const SaveButtons = ({ onSave, isSaving, onUploadPhoto, isUploadingPhoto, primaryLabel }: TabSaveProps) => (
  <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
    <Button
      type="button"
      variant="outline"
      onClick={onUploadPhoto}
      disabled={isSaving || isUploadingPhoto}
      className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50"
    >
      📷 Upload Photo
    </Button>
    <Button
      type="button"
      onClick={() => void onSave?.()}
      disabled={isSaving || isUploadingPhoto}
      className="rounded-xl bg-amber-400 text-slate-900 hover:bg-amber-500 font-semibold px-6 shadow-md shadow-amber-200"
    >
      {isSaving ? "Saving..." : primaryLabel || "Save & Continue"}
      {!isSaving && <ChevronRight className="h-4 w-4 ml-1" />}
    </Button>
  </div>
);

// ─── Tab: Profile ─────────────────────────────────────────────────────────────

const ProfileTab = memo(({ formData, setFormData, onSave, isSaving, onUploadPhoto, isUploadingPhoto }: FormTabProps) => {
  const currentYear = new Date().getFullYear();
  const years = ["--", ...Array.from({ length: currentYear + 10 - 1960 + 1 }, (_, i) => String(1960 + i))];
  const days = ["--", ...Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0"))];
  const months = ["--", ...Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"))];

  const agencyContact = (formData.agencyContact as Record<string, unknown>) || {};
  const introduction = (formData.introduction as Record<string, unknown>) || {};
  const skillsPreferences = (formData.skillsPreferences as Record<string, unknown>) || {};
  const otherInformation = (skillsPreferences.otherInformation as Record<string, boolean>) || {};
  const pastIllnesses = (introduction.pastIllnesses as Record<string, boolean>) || {};

  const dobMatch = String(formData.dateOfBirth || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const [dobDraft, setDobDraft] = useState(() => ({
    day: dobMatch?.[3] ?? "--",
    month: dobMatch?.[2] ?? "--",
    year: dobMatch?.[1] ?? "--",
  }));

  useEffect(() => {
    const m = String(formData.dateOfBirth || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) {
      setDobDraft({ day: m[3], month: m[2], year: m[1] });
    }
  }, [formData.dateOfBirth]);

  const contractMatch = String(introduction.contractEnds || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const [contractDraft, setContractDraft] = useState(() => ({
    day: contractMatch?.[3] ?? "--",
    month: contractMatch?.[2] ?? "--",
    year: contractMatch?.[1] ?? "--",
  }));

  const [errors, setErrors] = useState<{ fullName?: string; referenceCode?: string; dateOfBirth?: string }>({});
  const fullNameRef = useRef<HTMLDivElement>(null);
  const refCodeRef = useRef<HTMLDivElement>(null);
  const dobRef = useRef<HTMLDivElement>(null);

  const [newLanguageName, setNewLanguageName] = useState("");

  const fixedLanguages = [
    { label: "English", key: "English" },
    { label: "Mandarin / Chinese Dialect", key: "Mandarin/Chinese-Dialect" },
    { label: "Hindi", key: "Hindi" },
    { label: "Tamil", key: "Tamil" },
    { label: "Bahasa Indonesia / Malaysia", key: "Bahasa Indonesia/Malaysia" },
  ] as const;

  const extraLanguageKeys = Object.keys(formData.languageSkills || {}).filter(
    (key) => !fixedLanguages.some((item) => item.key === key),
  );

  const setIntroductionField = (key: string, value: unknown) =>
    setFormData((prev) => ({
      ...prev,
      introduction: { ...((prev.introduction as Record<string, unknown>) || {}), [key]: value },
    }));

  const setSkillsPreferencesField = (key: string, value: unknown) =>
    setFormData((prev) => ({
      ...prev,
      skillsPreferences: { ...((prev.skillsPreferences as Record<string, unknown>) || {}), [key]: value },
    }));

  const addLanguage = () => {
    const name = newLanguageName.trim();
    if (!name) return;
    setFormData((prev) => {
      const next = { ...(prev.languageSkills || {}) };
      if (next[name] !== undefined) return prev;
      next[name] = "";
      return { ...prev, languageSkills: next };
    });
    setNewLanguageName("");
  };

  const removeLanguage = (language: string) =>
    setFormData((prev) => {
      const next = { ...(prev.languageSkills || {}) };
      delete next[language];
      return { ...prev, languageSkills: next };
    });

  const handleSave = () => {
    const newErrors: typeof errors = {};
    if (!String(formData.fullName || "").trim()) newErrors.fullName = "Maid Name is required.";
    if (!String(formData.referenceCode || "").trim()) newErrors.referenceCode = "Ref Code is required.";
    if (!formData.dateOfBirth) newErrors.dateOfBirth = "Date of Birth is required.";
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const scrollTarget = newErrors.fullName ? fullNameRef : newErrors.referenceCode ? refCodeRef : dobRef;
      scrollTarget.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setErrors({});
    onSave?.();
  };

  const buildDob = (draft: { day: string; month: string; year: string }) => {
    if (draft.day === "--" || draft.month === "--" || draft.year === "--") return "";
    return `${draft.year}-${draft.month}-${draft.day}`;
  };

  return (
    <TabCard>
      <h3 className="text-xl font-bold text-slate-800">(A) Profile of FDW</h3>

      {/* A1 Personal Info */}
      <section>
        <SectionHeader>A1. Personal Information</SectionHeader>
        <div className="space-y-5">
          <FormRow2Col
            left={
              <div ref={fullNameRef}>
                <Field label="Maid Name *" error={errors.fullName}>
                  <StyledInput
                    value={formData.fullName}
                    className={errors.fullName ? "!border-red-400 !bg-red-50 focus:!shadow-[0_0_0_3px_rgba(239,68,68,0.18)]" : ""}
                    onChange={(e) => {
                      setFormData((p) => ({ ...p, fullName: e.target.value }));
                      if (errors.fullName) setErrors((p) => ({ ...p, fullName: undefined }));
                    }}
                    placeholder="Full legal name"
                  />
                </Field>
              </div>
            }
            right={
              <div ref={refCodeRef}>
                <Field label="Ref Code *" error={errors.referenceCode}>
                  <StyledInput
                    value={formData.referenceCode}
                    className={errors.referenceCode ? "!border-red-400 !bg-red-50 focus:!shadow-[0_0_0_3px_rgba(239,68,68,0.18)]" : ""}
                    onChange={(e) => {
                      setFormData((p) => ({ ...p, referenceCode: e.target.value }));
                      if (errors.referenceCode) setErrors((p) => ({ ...p, referenceCode: undefined }));
                    }}
                    placeholder="e.g. FIL-001"
                  />
                </Field>
              </div>
            }
          />

          <FormRow2Col
            left={
              <Field label="Type">
                <StyledSelect
                  value={formData.type}
                  onChange={(e) => setFormData((p) => ({ ...p, type: e.target.value }))}
                  options={[
                    { value: "", label: "Select Type", disabled: true },
                    "New maid", "Transfer maid", "APS maid", "Ex-Singapore maid",
                    "Ex-Hong Kong maid", "Ex-Taiwan maid", "Ex-Malaysia maid",
                    "Ex-Middle East maid", "Applying to work in Hong Kong",
                    "Applying to work in Canada", "Applying to work in Taiwan",
                  ]}
                />
              </Field>
            }
            right={
              <Field label="Nationality">
                <StyledSelect
                  value={formData.nationality}
                  onChange={(e) => setFormData((p) => ({ ...p, nationality: e.target.value }))}
                  options={[
                    { value: "", label: "Select Nationality", disabled: true },
                    "Filipino maid", "Indonesian maid", "Indian maid", "Myanmar maid",
                    "Sri Lankan maid", "Bangladeshi maid", "Nepali maid", "Cambodian maid", "Others",
                  ]}
                />
              </Field>
            }
          />

          <FormRow2Col
            left={<div />}
            right={
              <Field label="Indian Maid Category">
                <StyledSelect
                  options={["Select", "Mizoram maid", "Darjeeling maid", "Manipur maid", "Punjabi maid", "Others"]}
                  value={String((skillsPreferences.indianMaidCategory as string) || "Select")}
                  onChange={(e) => setSkillsPreferencesField("indianMaidCategory", e.target.value === "Select" ? "" : e.target.value)}
                />
              </Field>
            }
          />

          <FormRow2Col
            left={
              <div ref={dobRef}>
                <Field label="Date of Birth *" error={errors.dateOfBirth}>
                  <div className="flex gap-2">
                    {[
                      { opts: days, key: "day", w: "w-20" },
                      { opts: months, key: "month", w: "w-20" },
                      { opts: years, key: "year", w: "w-28" },
                    ].map(({ opts, key, w }) => (
                      <select
                        key={key}
                        value={(dobDraft as Record<string, string>)[key]}
                        onChange={(e) => {
                          const next = { ...dobDraft, [key]: e.target.value };
                          setDobDraft(next);
                          const dob = buildDob(next);
                          setFormData((p) => ({ ...p, dateOfBirth: dob }));
                          if (dob && errors.dateOfBirth) setErrors((p) => ({ ...p, dateOfBirth: undefined }));
                        }}
                        className={`${w} h-11 rounded-xl border border-slate-500 bg-slate-50/80 px-2 text-sm font-medium text-slate-800 shadow-sm transition-all duration-200 focus:outline-none focus:border-amber-400 focus:bg-white focus:shadow-[0_0_0_3px_rgba(251,191,36,0.18)] hover:border-slate-300 hover:bg-white ${errors.dateOfBirth ? "border-red-400" : ""}`}
                      >
                        {opts.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ))}
                  </div>
                </Field>
              </div>
            }
            right={
              <Field label="Place of Birth">
                <StyledInput value={formData.placeOfBirth} onChange={(e) => setFormData((p) => ({ ...p, placeOfBirth: e.target.value }))} placeholder="City / Province" />
              </Field>
            }
          />

          <FormRow2Col
            left={
              <Field label="Height">
                <StyledSelect
                  value={formData.height ? String(formData.height) : ""}
                  onChange={(e) => setFormData((p) => ({ ...p, height: Number(e.target.value || 0) }))}
                  options={[
                    { value: "", label: "Select Height", disabled: true },
                    ...Array.from({ length: 81 }, (_, i) => {
                      const cm = 150 + i;
                      const totalInches = cm / 2.54;
                      const feet = Math.floor(totalInches / 12);
                      const inches = Math.round(totalInches % 12);
                      return { value: String(cm), label: `${cm} cm (${feet}'${inches}")` };
                    }),
                  ]}
                />
              </Field>
            }
            right={
              <Field label="Weight">
                <StyledSelect
                  value={formData.weight ? String(formData.weight) : ""}
                  onChange={(e) => setFormData((p) => ({ ...p, weight: Number(e.target.value || 0) }))}
                  options={[
                    { value: "", label: "Select Weight", disabled: true },
                    ...Array.from({ length: 101 }, (_, i) => {
                      const kg = 40 + i;
                      const lbs = Math.round(kg * 2.20462);
                      return { value: String(kg), label: `${kg} kg (${lbs} lbs)` };
                    }),
                  ]}
                />
              </Field>
            }
          />

          <Field label="Residential Address in Home Country">
            <StyledInput value={formData.homeAddress} onChange={(e) => setFormData((p) => ({ ...p, homeAddress: e.target.value }))} placeholder="Street, City, Province" />
          </Field>

          <FormRow2Col
            left={
              <Field label="Port / Airport for Repatriation">
                <StyledInput value={formData.airportRepatriation} onChange={(e) => setFormData((p) => ({ ...p, airportRepatriation: e.target.value }))} />
              </Field>
            }
            right={
              <Field label="Contact Number in Home Country">
                <StyledInput
                  value={String(agencyContact.homeCountryContactNumber || "")}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      agencyContact: { ...((p.agencyContact as Record<string, unknown>) || {}), homeCountryContactNumber: e.target.value },
                    }))
                  }
                  placeholder="+63 XXX XXXX"
                />
              </Field>
            }
          />

          <FormRow2Col
            left={
              <Field label="Education Level">
                <StyledSelect
                  options={[
                    { value: "", label: "Select Education", disabled: true },
                    "Primary Level (≤6 yrs)", "Secondary Level (7–9 yrs)", "High School (10–12 yrs)",
                    "Vocational Course", "College / Degree (≥13 yrs)",
                  ]}
                  value={formData.educationLevel}
                  onChange={(e) => setFormData((p) => ({ ...p, educationLevel: e.target.value }))}
                />
              </Field>
            }
            right={
              <Field label="Religion">
                <StyledSelect
                  options={[
                    { value: "", label: "Select Religion", disabled: true },
                    "Catholic", "Christian", "Muslim", "Hindu", "Buddhist", "Sikh", "Free Thinker", "Others",
                  ]}
                  value={formData.religion}
                  onChange={(e) => setFormData((p) => ({ ...p, religion: e.target.value }))}
                />
              </Field>
            }
          />

          <FormRow2Col
            left={
              <Field label="Number of Siblings">
                <StyledInput
                  type="text"
                  value={String(formData.numberOfSiblings ?? "")}
                  onChange={(e) => setFormData((p) => ({ ...p, numberOfSiblings: e.target.value as unknown as number }))}
                  placeholder="e.g. 3 or 6/7"
                />
              </Field>
            }
            right={
              <Field label="Marital Status">
                <StyledSelect
                  options={[
                    { value: "", label: "Select Status", disabled: true },
                    "Single", "Single Parent", "Married", "Divorced", "Widowed", "Separated",
                  ]}
                  value={formData.maritalStatus}
                  onChange={(e) => setFormData((p) => ({ ...p, maritalStatus: e.target.value }))}
                />
              </Field>
            }
          />

          <FormRow2Col
            left={
              <Field label="Number of Children">
                <StyledSelect
                  options={["0","1","2","3","4","5","6","7","8","9","10"]}
                  value={String(formData.numberOfChildren ?? 0)}
                  onChange={(e) => setFormData((p) => ({ ...p, numberOfChildren: Number(e.target.value || 0) }))}
                />
              </Field>
            }
            right={
              <Field label="Ages of Children">
                <StyledInput value={String(introduction.agesOfChildren || "")} onChange={(e) => setIntroductionField("agesOfChildren", e.target.value)} placeholder="e.g. 3, 7, 12" />
              </Field>
            }
          />

          <FormRow2Col
            left={
              <Field label="Present Salary (S$)">
                <StyledInput value={String(introduction.presentSalary || "")} onChange={(e) => setIntroductionField("presentSalary", e.target.value)} placeholder="e.g. 650" />
              </Field>
            }
            right={
              <Field label="Expected Salary (S$)">
                <StyledInput value={String(introduction.expectedSalary || "")} onChange={(e) => setIntroductionField("expectedSalary", e.target.value)} placeholder="e.g. 700" />
              </Field>
            }
          />

          <FormRow2Col
            left={
              <Field label="Availability">
                <StyledInput value={String(introduction.availability || "")} onChange={(e) => setIntroductionField("availability", e.target.value)} placeholder="e.g. Immediately" />
              </Field>
            }
            right={
              <Field label="Contract Ends">
                <div className="flex gap-2">
                  {[
                    { opts: days, key: "day", w: "w-20" },
                    { opts: months, key: "month", w: "w-20" },
                    { opts: years, key: "year", w: "w-28" },
                  ].map(({ opts, key, w }) => (
                    <select
                      key={key}
                      value={(contractDraft as Record<string, string>)[key]}
                      onChange={(e) => {
                        const next = { ...contractDraft, [key]: e.target.value };
                        setContractDraft(next);
                        const dt = buildDob(next);
                        setIntroductionField("contractEnds", dt);
                      }}
                      className={`${w} h-11 rounded-xl border border-slate-200 bg-slate-50/80 px-2 text-sm font-medium text-slate-800 shadow-sm transition-all duration-200 focus:outline-none focus:border-amber-400 focus:bg-white focus:shadow-[0_0_0_3px_rgba(251,191,36,0.18)] hover:border-slate-300 hover:bg-white`}
                    >
                      {opts.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ))}
                </div>
              </Field>
            }
          />

          <FormRow2Col
            left={
              <Field label="Maid Loan (S$)">
                <StyledInput value={String(introduction.maidLoan || "")} onChange={(e) => setIntroductionField("maidLoan", e.target.value)} placeholder="0" />
              </Field>
            }
            right={
              <Field label="Off-day Compensation (S$/day)">
                <StyledInput value={String(introduction.offdayCompensation || "0")} onChange={(e) => setIntroductionField("offdayCompensation", e.target.value)} />
              </Field>
            }
          />
        </div>
      </section>

      {/* Language Skills */}
      <section>
        <SectionHeader>Language Skills</SectionHeader>
        <div className="space-y-1 bg-slate-50 rounded-xl p-4 border border-slate-100">
          {fixedLanguages.map((lang) => (
            <div key={lang.key} className="flex flex-col sm:flex-row sm:items-center gap-3 py-3 border-b border-slate-100 last:border-0">
              <span className="text-base font-medium text-slate-700 w-56 shrink-0">{lang.label}</span>
              <RadioGroup
                name={`lang_${lang.key}`}
                options={["Zero", "Poor", "Little", "Fair", "Good"]}
                value={String((formData.languageSkills || {})[lang.key] || "")}
                onValueChange={(next) =>
                  setFormData((p) => ({ ...p, languageSkills: { ...(p.languageSkills || {}), [lang.key]: next } }))
                }
              />
            </div>
          ))}
          {extraLanguageKeys.map((lang) => (
            <div key={lang} className="flex flex-col sm:flex-row sm:items-center gap-3 py-3 border-b border-slate-100 last:border-0">
              <span className="text-sm font-medium text-slate-700 w-56 shrink-0">{lang}</span>
              <div className="flex items-center gap-4 flex-wrap">
                <RadioGroup
                  name={`lang_${lang}`}
                  options={["Zero", "Poor", "Little", "Fair", "Good"]}
                  value={String((formData.languageSkills || {})[lang] || "")}
                  onValueChange={(next) =>
                    setFormData((p) => ({ ...p, languageSkills: { ...(p.languageSkills || {}), [lang]: next } }))
                  }
                />
                <button type="button" onClick={() => removeLanguage(lang)} className="text-xs text-red-400 hover:text-red-600 font-semibold underline underline-offset-2 transition-colors">Remove</button>
              </div>
            </div>
          ))}
          <div className="flex gap-2 pt-3">
            <StyledInput value={newLanguageName} onChange={(e) => setNewLanguageName(e.target.value)} placeholder="Add other language..." className="max-w-xs" />
            <Button type="button" variant="outline" onClick={addLanguage} disabled={!newLanguageName.trim()} className="rounded-xl">Add</Button>
          </div>
        </div>
      </section>

      {/* Other Information */}
      <section>
        <SectionHeader>Other Information</SectionHeader>
        <div className="space-y-0 bg-slate-50 rounded-xl p-4 border border-slate-100">
          {[
            "Able to handle pork?",
            "Able to eat pork?",
            "Able to care for dog/cat?",
            "Able to do simple sewing?",
            "Able to do gardening work?",
            "Willing to wash car?",
            "Willing to work on off-days with compensation?",
          ].map((q) => (
            <div key={q} className="flex items-center justify-between gap-4 py-3 border-b border-slate-100 last:border-0">
              <span className="text-base text-slate-900">{q}</span>
              <YesNo
                name={`other_${q}`}
                value={otherInformation[q]}
                onValueChange={(next) =>
                  setFormData((p) => {
                    const ps = (p.skillsPreferences as Record<string, unknown>) || {};
                    const po = (ps.otherInformation as Record<string, boolean>) || {};
                    const updated = { ...po };
                    if (next === undefined) {
                      delete updated[q];
                    } else {
                      updated[q] = next;
                    }
                    return { ...p, skillsPreferences: { ...ps, otherInformation: updated } };
                  })
                }
              />
            </div>
          ))}
          <div className="flex items-center justify-between gap-4 pt-3">
            <span className="text-base text-slate-700">Number of off-days per month</span>
            <div className="flex items-center gap-2">
              <StyledInput className="w-20" value={String(skillsPreferences.offDaysPerMonth || "")} onChange={(e) => setSkillsPreferencesField("offDaysPerMonth", e.target.value)} />
              <span className="text-base text-slate-700">day(s)</span>
            </div>
          </div>
        </div>
      </section>

      {/* Medical History */}
      <section>
        <SectionHeader>A2. Medical History / Dietary Restrictions</SectionHeader>
        <div className="space-y-4">
          <Field label="Allergies (if any)">
            <StyledInput value={String(introduction.allergies || "")} onChange={(e) => setIntroductionField("allergies", e.target.value)} placeholder="None" />
          </Field>

          <div>
            <p className="text-sm font-semibold text-slate-600 mb-3">Past and existing illnesses:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-0 bg-slate-50 rounded-xl p-4 border border-slate-100">
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
                <div key={name} className="flex items-center justify-between gap-3 py-2.5 border-b border-slate-100 last:border-0">
                  <span className="text-sm text-slate-700">{label}</span>
                  <YesNo
                    name={name}
                    value={pastIllnesses[label]}
                    onValueChange={(next) =>
                      setFormData((p) => {
                        const intro = (p.introduction as Record<string, unknown>) || {};
                        const illnesses = (intro.pastIllnesses as Record<string, boolean>) || {};
                        const updated = { ...illnesses };
                        if (next === undefined) {
                          delete updated[label];
                        } else {
                          updated[label] = next;
                        }
                        return { ...p, introduction: { ...intro, pastIllnesses: updated } };
                      })
                    }
                  />
                </div>
              ))}
              <div className="flex items-center gap-3 py-2.5">
                <span className="text-sm text-slate-700">(X) Others:</span>
                <StyledInput className="w-40 h-9" value={String(introduction.otherIllnesses || "")} onChange={(e) => setIntroductionField("otherIllnesses", e.target.value)} />
              </div>
            </div>
          </div>

          <FormRow2Col
            left={
              <Field label="Physical Disabilities">
                <StyledInput value={String(introduction.physicalDisabilities || "")} onChange={(e) => setIntroductionField("physicalDisabilities", e.target.value)} placeholder="None" />
              </Field>
            }
            right={
              <Field label="Dietary Restrictions">
                <StyledInput value={String(introduction.dietaryRestrictions || "")} onChange={(e) => setIntroductionField("dietaryRestrictions", e.target.value)} placeholder="None" />
              </Field>
            }
          />

          <div>
            <p className="text-base font-semibold text-slate-600 mb-2">Food handling preferences:</p>
            {(() => {
              const raw = String(introduction.foodHandlingPreferences || "");
              const parts = raw.split(",").map((p) => p.trim()).filter(Boolean);
              const hasNoPork = parts.includes("No Pork");
              const hasNoBeef = parts.includes("No Beef");
              const other = parts.filter((p) => p !== "No Pork" && p !== "No Beef").join(", ");
              const setFoodPrefs = (np: boolean, nb: boolean, ot: string) => {
                const nextParts = [...(np ? ["No Pork"] : []), ...(nb ? ["No Beef"] : []), ...(ot.trim() ? [ot.trim()] : [])];
                setIntroductionField("foodHandlingPreferences", nextParts.join(", "));
              };
              return (
                <div className="flex flex-wrap items-center gap-4 bg-slate-50 rounded-xl p-3 border border-slate-100">
                  {[["No Pork", hasNoPork, (v: boolean) => setFoodPrefs(v, hasNoBeef, other)],
                    ["No Beef", hasNoBeef, (v: boolean) => setFoodPrefs(hasNoPork, v, other)]].map(([lbl, checked, fn]) => (
                    <label key={lbl as string} className="flex items-center gap-2 text-sm cursor-pointer select-none">
                      <div
                        className={`relative h-5 w-5 rounded-md border-2 flex items-center justify-center transition-all duration-150 ${
                          checked ? "bg-amber-400 border-amber-400" : "bg-white border-slate-300 hover:border-amber-300"
                        }`}
                      >
                        {checked && (
                          <svg className="h-3 w-3 text-slate-900" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                          </svg>
                        )}
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={checked as boolean}
                          onChange={(e) => (fn as (v: boolean) => void)(e.target.checked)}
                        />
                      </div>
                      <span className="text-slate-700 font-medium">{lbl as string}</span>
                    </label>
                  ))}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500">Others:</span>
                    <StyledInput className="w-36 h-9" value={other} onChange={(e) => setFoodPrefs(hasNoPork, hasNoBeef, e.target.value)} />
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </section>

      {/* A3 Others */}
      <section>
        <SectionHeader>A3. Other Remarks</SectionHeader>
        <Field label="Any other remarks">
          <StyledInput value={String(introduction.otherRemarks || "")} onChange={(e) => setIntroductionField("otherRemarks", e.target.value)} />
        </Field>
      </section>

      <SaveButtons onSave={handleSave} isSaving={isSaving} onUploadPhoto={onUploadPhoto} isUploadingPhoto={isUploadingPhoto} />
    </TabCard>
  );
});

// ─── Tab: Skills ──────────────────────────────────────────────────────────────

const skillRows = [
  { no: 1, label: "Care of infants/children", sub: "Please specify age range:", subField: true },
  { no: 2, label: "Care of elderly" },
  { no: 3, label: "Care of disabled" },
  { no: 4, label: "General housework" },
  { no: 5, label: "Cooking", sub: "Please specify cuisines:", subField: true },
  { no: 6, label: "Language abilities (spoken)", sub: "Please specify:", subField: true },
  { no: 7, label: "Other skills, if any", sub: "Please specify:", subField: true },
];

// ── Evaluation checkbox sub-component ────────────────────────────────────────
const EvalCheckbox = ({
  label,
  checked,
  onChange,
  disabled = false,
  indented = false,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  indented?: boolean;
}) => (
  <label
    className={`
      flex items-start gap-2.5 text-sm py-2.5 border-b border-slate-100 last:border-0 select-none
      ${indented ? "pl-7" : ""}
      ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer group"}
    `}
  >
    <div
      className={`
        mt-0.5 h-[18px] w-[18px] shrink-0 rounded-md border-2
        flex items-center justify-center
        transition-all duration-150
        ${checked
          ? "bg-amber-400 border-amber-400"
          : "bg-white border-slate-400 group-hover:border-amber-400"
        }
        ${disabled ? "pointer-events-none" : ""}
      `}
    >
      {checked && (
        <svg
          className="h-2.5 w-2.5 text-slate-900"
          fill="none"
          viewBox="0 0 12 12"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
        </svg>
      )}
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
    </div>
    <span
      className={`leading-snug transition-colors ${
        checked ? "text-slate-800 font-semibold" : "text-slate-700 font-normal"
      }`}
    >
      {label}
    </span>
  </label>
);

const SkillsTab = memo(
  ({
    formData,
    setFormData,
    onSave,
    isSaving,
    onUploadPhoto,
    isUploadingPhoto,
  }: FormTabProps) => {
    const workAreas = (formData.workAreas as Record<string, unknown>) || {};
    const skillsPreferences =
      (formData.skillsPreferences as Record<string, unknown>) || {};
    const workAreaNotes =
      (skillsPreferences.workAreaNotes as Record<string, string>) || {};

    const evaluationMethods: string[] = Array.isArray(
      skillsPreferences.evaluationMethods
    )
      ? (skillsPreferences.evaluationMethods as string[])
      : [];

    const isDeclarationChecked = evaluationMethods.includes(EVAL_PARENT_DECLARATION);
    const isInterviewedChecked = evaluationMethods.includes(EVAL_PARENT_INTERVIEWED);

    const setEvalMethods = (next: string[]) =>
      setFormData((prev) => ({
        ...prev,
        skillsPreferences: {
          ...((prev.skillsPreferences as Record<string, unknown>) || {}),
          evaluationMethods: next,
        },
      }));

    const toggleEvalOption = (option: string, checked: boolean) => {
      if (checked) {
        setEvalMethods([...new Set([...evaluationMethods, option])]);
      } else {
        // Each option is independent — unchecking parent does NOT clear sub-options
        setEvalMethods(evaluationMethods.filter((m) => m !== option));
      }
    };

    const setWorkArea = (area: string, patch: Record<string, unknown>) =>
      setFormData((prev) => {
        const prev2 = (prev.workAreas as Record<string, unknown>) || {};
        const cur = (prev2[area] as Record<string, unknown>) || {};
        return { ...prev, workAreas: { ...prev2, [area]: { ...cur, ...patch } } };
      });

    const setWorkAreaNote = (key: string, value: string) =>
      setFormData((prev) => {
        const ps = (prev.skillsPreferences as Record<string, unknown>) || {};
        const pn = (ps.workAreaNotes as Record<string, string>) || {};
        return {
          ...prev,
          skillsPreferences: { ...ps, workAreaNotes: { ...pn, [key]: value } },
        };
      });

    const buildEvaluation = (rating: number | null, note: string) => {
      const t = note.trim();
      if (rating === null) return t || "N.A.";
      return t ? `${rating}/5 - ${t}` : `${rating}/5`;
    };

    return (
      <TabCard>
        <h3 className="text-xl font-bold text-slate-800">(B) Maid's Skills</h3>

        {/* ── B1. Method of Evaluation ─────────────────────────────────────── */}
        <section>
          <SectionHeader>B1. Method of Evaluation</SectionHeader>
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">

            {/* Parent option 1 — FDW declaration */}
            <EvalCheckbox
              label={EVAL_PARENT_DECLARATION}
              checked={isDeclarationChecked}
              onChange={(checked) => toggleEvalOption(EVAL_PARENT_DECLARATION, checked)}
            />

            {/* Parent option 2 — Interviewed by Singapore EA */}
            <EvalCheckbox
              label={EVAL_PARENT_INTERVIEWED}
              checked={isInterviewedChecked}
              onChange={(checked) => toggleEvalOption(EVAL_PARENT_INTERVIEWED, checked)}
            />

            {/* Sub-options — always visible and independently checkable */}
            <div className="mt-1">
              {EVAL_SUB_OPTIONS.map((opt) => (
                <EvalCheckbox
                  key={opt}
                  label={opt}
                  checked={evaluationMethods.includes(opt)}
                  indented
                  onChange={(checked) => toggleEvalOption(opt, checked)}
                />
              ))}
            </div>

            {/* Active selection summary pills */}
            {evaluationMethods.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-200 flex flex-wrap gap-1.5">
                {evaluationMethods.map((m) => (
                  <span
                    key={m}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 inline-block shrink-0" />
                    {m.length > 50 ? m.slice(0, 47) + "…" : m}
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── Skills table ─────────────────────────────────────────────────── */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="px-3 py-3 text-center text-xs font-semibold w-12">#</th>
                <th className="px-4 py-3 text-left text-xs font-semibold">Area of Work</th>
                <th className="px-3 py-3 text-center text-xs font-semibold w-28">Willingness</th>
                <th className="px-3 py-3 text-center text-xs font-semibold w-44">
                  Experience<br />
                  <span className="font-normal opacity-70">(if yes, state years)</span>
                </th>
                <th className="px-3 py-3 text-center text-xs font-semibold w-64">Assessment / Observation</th>
              </tr>
            </thead>
            <tbody>
              {skillRows.map((row, idx) => {
                const config = (workAreas[row.label] as Record<string, unknown>) || {};
                const willing = config.willing as boolean | undefined;
                const experience = config.experience as boolean | undefined;
                const yearsOfExperience = String(config.yearsOfExperience || "");
                const rating =
                  typeof config.rating === "number" ? (config.rating as number) : null;
                const note = String(config.note || "");
                const subKey =
                  row.label === "Other skills, if any" ? "Other Skill" : row.label;
                const updateEvaluation = (nr: number | null, nn: string) =>
                  setWorkArea(row.label, {
                    rating: nr,
                    note: nn,
                    evaluation: buildEvaluation(nr, nn),
                  });

                return (
                  <tr key={row.no} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                    <td className="px-3 py-4 text-center text-slate-400 font-medium align-top">
                      {row.no}
                    </td>
                    <td className="px-4 py-4 align-top">
                      <p className="font-semibold text-slate-800">{row.label}</p>
                      {row.sub && (
                        <div className="mt-2">
                          <p className="text-sm text-slate-600 mb-1">{row.sub}</p>
                          {row.subField && (
                            <StyledInput
                              className="w-44 h-8 text-xs"
                              value={String(workAreaNotes[subKey] || "")}
                              onChange={(e) => setWorkAreaNote(subKey, e.target.value)}
                            />
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-4 text-center align-top">
                      <div className="flex justify-center">
                        <YesNo
                          name={`will_${row.no}`}
                          value={willing}
                          onValueChange={(next) => setWorkArea(row.label, { willing: next })}
                        />
                      </div>
                    </td>
                    <td className="px-3 py-4 text-center align-top">
                      <div className="mb-2 flex justify-center">
                        <YesNo
                          name={`exp_${row.no}`}
                          value={experience}
                          onValueChange={(next) =>
                            setWorkArea(row.label, {
                              experience: next,
                              yearsOfExperience: next === true
                                ? String(config.yearsOfExperience || "")
                                : "",
                            })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-center gap-1">
                        <StyledInput
                          className="w-14 h-8 text-xs text-center"
                          value={yearsOfExperience}
                          onChange={(e) =>
                            setWorkArea(row.label, { yearsOfExperience: e.target.value })
                          }
                          disabled={experience !== true}
                        />
                        <span className="text-xs text-slate-400">yrs</span>
                      </div>
                    </td>
                    <td className="px-3 py-4 align-top">
                      <div className="mb-2">
                        <StarRating
                          name={`assess_${row.no}`}
                          value={rating}
                          onChange={(nr) => updateEvaluation(nr, note)}
                        />
                      </div>
                      <textarea
                        className="w-full min-h-[52px] rounded-xl border border-slate-500 bg-white px-2 py-1.5 text-xs text-slate-800 shadow-sm transition-all duration-200 focus:outline-none focus:border-amber-400 focus:shadow-[0_0_0_3px_rgba(251,191,36,0.18)] focus:bg-white hover:border-slate-300 resize-none placeholder:text-slate-600"
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

        <SaveButtons
          onSave={onSave}
          isSaving={isSaving}
          onUploadPhoto={onUploadPhoto}
          isUploadingPhoto={isUploadingPhoto}
        />
      </TabCard>
    );
  }
);

// ─── Tab: Employment History ──────────────────────────────────────────────────

const employmentCountries = [
  { value: "", label: "Select Country", disabled: true },
  { value: "Singapore", label: "Singapore" },
  { value: "India", label: "India" },
  { value: "Indonesia", label: "Indonesia" },
  { value: "Philippines", label: "Philippines" },
  { value: "Malaysia", label: "Malaysia" },
  { value: "Myanmar", label: "Myanmar" },
  { value: "Taiwan", label: "Taiwan" },
  { value: "Brunei", label: "Brunei" },
  { value: "Kuwait", label: "Kuwait" },
  { value: "Qatar", label: "Qatar" },
  { value: "Egypt", label: "Egypt" },
  { value: "United Arab Emirates", label: "United Arab Emirate" },
  { value: "Saudi Arabia", label: "Saudi Arabia" },
  { value: "China", label: "China" },
  { value: "South Korea", label: "South Korea" },
  { value: "United Kingdom", label: "United Kingdom" },
  { value: "United States", label: "United States" },
  { value: "Canada", label: "Canada" },
  { value: "Australia", label: "Australia" },
  { value: "Japan", label: "Japan" },
  { value: "New Zealand", label: "New Zealand" },
  { value: "South Africa", label: "South Africa" },
  { value: "Other Countries", label: "Other Countries" },
];

const EmploymentHistoryTab = memo(({ formData, setFormData, onSave, isSaving, onUploadPhoto, isUploadingPhoto }: FormTabProps) => {
  const years = ["--", ...Array.from({ length: 30 }, (_, i) => String(2000 + i))];
  const employment =
    Array.isArray(formData.employmentHistory) && formData.employmentHistory.length > 0
      ? formData.employmentHistory
      : [{}];
  const skillsPreferences = (formData.skillsPreferences as Record<string, unknown>) || {};
  const sgExperience =
    typeof skillsPreferences.sgExperience === "boolean"
      ? skillsPreferences.sgExperience
      : undefined;

  const setEmployment = (next: Array<Record<string, unknown>>) =>
    setFormData((prev) => ({ ...prev, employmentHistory: next }));

  const updateEmployer = (index: number, key: string, value: unknown) =>
    setEmployment(
      employment.map((row, i) =>
        i === index ? { ...(row as Record<string, unknown>), [key]: value } : row
      )
    );

  const addEmployer = () => setEmployment([...employment, {}]);
  const removeEmployer = (index: number) =>
    setEmployment(employment.filter((_, i) => i !== index));

  return (
    <TabCard>
      <h3 className="text-xl font-bold text-slate-800">(C) Employment History</h3>

      <section>
        <SectionHeader>C1. Employment History</SectionHeader>
        <div className="space-y-4">
          {employment.map((row, idx) => {
            const r = row as Record<string, unknown>;
            return (
              <div key={idx} className="border border-slate-200 rounded-2xl bg-slate-50/50 p-5">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-amber-400 flex items-center justify-center text-xs font-bold text-slate-900">
                      {idx + 1}
                    </div>
                    <span className="font-semibold text-slate-700">Employer #{idx + 1}</span>
                  </div>
                  {employment.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeEmployer(idx)}
                      className="text-xs text-red-400 hover:text-red-600 font-semibold underline underline-offset-2 transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Field label="From Year">
                    <StyledSelect
                      options={years}
                      className="w-full"
                      value={String(r.from || "--")}
                      onChange={(e) =>
                        updateEmployer(idx, "from", e.target.value === "--" ? "" : e.target.value)
                      }
                    />
                  </Field>
                  <Field label="To Year">
                    <StyledSelect
                      options={years}
                      className="w-full"
                      value={String(r.to || "--")}
                      onChange={(e) =>
                        updateEmployer(idx, "to", e.target.value === "--" ? "" : e.target.value)
                      }
                    />
                  </Field>
                  <Field label="Country">
                    <StyledSelect
                      options={employmentCountries}
                      className="w-full"
                      value={String(r.country || "")}
                      onChange={(e) => updateEmployer(idx, "country", e.target.value)}
                    />
                  </Field>
                </div>

                <div className="mt-4">
                  <Field label="Employer's Name">
                    <StyledInput
                      value={String(r.employer || "")}
                      onChange={(e) => updateEmployer(idx, "employer", e.target.value)}
                      placeholder="Full name"
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <Field label="Main Duties">
                    <textarea
                      className="w-full min-h-[80px] rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 font-medium shadow-sm transition-all duration-200 focus:outline-none focus:border-amber-400 focus:bg-white focus:shadow-[0_0_0_3px_rgba(251,191,36,0.18)] hover:border-slate-300 resize-none placeholder:text-slate-600 placeholder:font-normal"
                      value={String(r.duties || "")}
                      onChange={(e) => updateEmployer(idx, "duties", e.target.value)}
                      placeholder="Describe main responsibilities..."
                    />
                  </Field>
                  <Field label="Remarks">
                    <textarea
                      className="w-full min-h-[80px] rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 font-medium shadow-sm transition-all duration-200 focus:outline-none focus:border-amber-400 focus:bg-white focus:shadow-[0_0_0_3px_rgba(251,191,36,0.18)] hover:border-slate-300 resize-none placeholder:text-slate-600 placeholder:font-normal"
                      value={String(r.remarks || "")}
                      onChange={(e) => updateEmployer(idx, "remarks", e.target.value)}
                      placeholder="Any relevant notes..."
                    />
                  </Field>
                </div>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={addEmployer}
          className="mt-3 w-full py-2.5 rounded-xl border-2 border-dashed border-amber-300 text-amber-600 text-sm font-semibold hover:bg-amber-50 transition-colors"
        >
          + Add Another Employer
        </button>
      </section>

      <section>
        <SectionHeader>C2. Singapore Experience</SectionHeader>
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">
              Previous working experience in Singapore
            </span>
            <YesNo
              name="sg_experience"
              value={sgExperience}
              onValueChange={(next) =>
                setFormData((p) => ({
                  ...p,
                  skillsPreferences: {
                    ...((p.skillsPreferences as Record<string, unknown>) || {}),
                    sgExperience: next,
                  },
                }))
              }
            />
          </div>
          <p className="text-sm text-slate-700 leading-relaxed">
            The EA is required to obtain the FDW's employment history from MOM and furnish the
            employer with the employment history. The employer may also verify via WPOL using
            SingPass.
          </p>
        </div>
      </section>

      <section>
        <SectionHeader>C3. Feedback from Previous Singapore Employers</SectionHeader>
        <div className="space-y-4">
          <Field label="Feedback from Singapore Employer 1">
            <StyledInput placeholder="Enter feedback..." />
          </Field>
          <Field label="Feedback from Singapore Employer 2">
            <StyledInput placeholder="Enter feedback..." />
          </Field>
        </div>
      </section>

      <SaveButtons
        onSave={onSave}
        isSaving={isSaving}
        onUploadPhoto={onUploadPhoto}
        isUploadingPhoto={isUploadingPhoto}
      />
    </TabCard>
  );
});

// ─── Tab: Availability / Remark ───────────────────────────────────────────────

const AvailabilityRemarkTab = memo(({ formData, setFormData, onSave, isSaving, onUploadPhoto, isUploadingPhoto }: FormTabProps) => {
  const skillsPreferences = (formData.skillsPreferences as Record<string, unknown>) || {};
  const interviewOptions = (skillsPreferences.availabilityInterviewOptions as string[]) || [];
  const availabilityRemark = String(skillsPreferences.availabilityRemark || "");

  const toggleOption = (opt: string, checked: boolean) =>
    setFormData((prev) => {
      const ps = (prev.skillsPreferences as Record<string, unknown>) || {};
      const cur = (ps.availabilityInterviewOptions as string[]) || [];
      const next = checked
        ? Array.from(new Set([...cur, opt]))
        : cur.filter((v) => v !== opt);
      return { ...prev, skillsPreferences: { ...ps, availabilityInterviewOptions: next } };
    });

  return (
    <TabCard>
      <h3 className="text-xl font-bold text-slate-800">(D) Availability & Remarks</h3>

      <section>
        <SectionHeader>Interview Availability</SectionHeader>
        <div className="space-y-0 bg-slate-50 rounded-xl p-4 border border-slate-100">
          {[
            "FDW is not available for interview",
            "FDW can be interviewed by phone",
            "FDW can be interviewed by video-conference",
            "FDW can be interviewed in person",
          ].map((opt) => {
            const checked = interviewOptions.includes(opt);
            return (
              <label
                key={opt}
                className="flex items-center gap-3 text-sm cursor-pointer py-3 border-b border-slate-100 last:border-0 group select-none"
              >
                <div
                  className={`h-5 w-5 shrink-0 rounded-md border-2 flex items-center justify-center transition-all duration-150 ${
                    checked
                      ? "bg-amber-400 border-amber-400"
                      : "bg-white border-slate-500 group-hover:border-amber-400"
                  }`}
                >
                  {checked && (
                    <svg
                      className="h-3 w-3 text-slate-900"
                      fill="none"
                      viewBox="0 0 12 12"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                    </svg>
                  )}
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={checked}
                    onChange={(e) => toggleOption(opt, e.target.checked)}
                  />
                </div>
                <span
                  className={`transition-colors ${
                    checked ? "text-slate-800 font-medium" : "text-slate-900"
                  }`}
                >
                  {opt}
                </span>
              </label>
            );
          })}
        </div>
      </section>

      <section>
        <SectionHeader>E. Other Remarks</SectionHeader>
        <Field label="Other Remarks">
          <textarea
            className="w-full min-h-[120px] rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-sm text-slate-800 font-medium shadow-sm transition-all duration-200 focus:outline-none focus:border-amber-400 focus:bg-white focus:shadow-[0_0_0_3px_rgba(251,191,36,0.18)] hover:border-slate-300 resize-none placeholder:text-slate-600 placeholder:font-normal"
            value={availabilityRemark}
            onChange={(e) =>
              setFormData((p) => ({
                ...p,
                skillsPreferences: {
                  ...((p.skillsPreferences as Record<string, unknown>) || {}),
                  availabilityRemark: e.target.value,
                },
              }))
            }
            placeholder="Any additional information..."
          />
        </Field>
      </section>

      <SaveButtons
        onSave={onSave}
        isSaving={isSaving}
        onUploadPhoto={onUploadPhoto}
        isUploadingPhoto={isUploadingPhoto}
      />
    </TabCard>
  );
});

// ─── Tab: Introduction ────────────────────────────────────────────────────────

const IntroductionTab = memo(({ formData, setFormData, onSave, isSaving, onUploadPhoto, isUploadingPhoto }: FormTabProps) => {
  const introduction = (formData.introduction as Record<string, unknown>) || {};
  return (
    <TabCard>
      <div className="text-center space-y-1">
        <h3 className="text-xl font-bold text-slate-800">Maid's Introduction</h3>
        <p className="text-sm text-slate-800">
          This introduction is hidden from the public. Employers must log in to view it.
        </p>
      </div>

      <Field label="Maid Introduction">
        <textarea
          className="w-full min-h-[280px] rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-800 font-medium shadow-sm transition-all duration-200 focus:outline-none focus:border-amber-400 focus:bg-white focus:shadow-[0_0_0_3px_rgba(251,191,36,0.18)] hover:border-slate-300 resize-none leading-relaxed placeholder:text-slate-600 placeholder:font-normal"
          value={String(introduction.intro || "")}
          onChange={(e) =>
            setFormData((p) => ({
              ...p,
              introduction: {
                ...((p.introduction as Record<string, unknown>) || {}),
                intro: e.target.value,
              },
            }))
          }
          placeholder="Write a detailed introduction about the maid's background, personality, and work experience..."
        />
      </Field>

      <SaveButtons
        onSave={onSave}
        isSaving={isSaving}
        onUploadPhoto={onUploadPhoto}
        isUploadingPhoto={isUploadingPhoto}
      />
    </TabCard>
  );
});

// ─── Tab: Public Introduction ─────────────────────────────────────────────────

const PublicIntroductionTab = memo(({ formData, setFormData, onSave, isSaving, onUploadPhoto, isUploadingPhoto }: FormTabProps) => {
  const introduction = (formData.introduction as Record<string, unknown>) || {};
  return (
    <TabCard>
      <div className="text-center space-y-1">
        <h3 className="text-xl font-bold text-slate-800">Public Introduction</h3>
        <p className="text-sm text-slate-400">Visible to all employers without login.</p>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-base text-amber-800 leading-relaxed space-y-2">
        <p className="font-semibold">⚠️ MOM Compliance Notice</p>
        <p>
          EAs must comply with MOM's{" "}
          <a
            href="https://www.mom.gov.sg/employment-practices/employment-agencies/ealc"
            className="underline font-medium"
            target="_blank"
            rel="noopener noreferrer"
          >
            EALC #17
          </a>{" "}
          and only disclose: FDW name, nationality, skills and experience, food handling
          preferences, previous employment history, and language abilities.
        </p>
        <p>
          Avoid transactional terms that liken FDWs to commodities (e.g. "condition new",
          "chat to buy").
        </p>
      </div>

      <Field label="Public Introduction">
        <textarea
          className="w-full min-h-[280px] rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-800 font-medium shadow-sm transition-all duration-200 focus:outline-none focus:border-amber-400 focus:bg-white focus:shadow-[0_0_0_3px_rgba(251,191,36,0.18)] hover:border-slate-300 resize-none leading-relaxed placeholder:text-slate-600 placeholder:font-normal"
          value={String(introduction.publicIntro || "")}
          onChange={(e) =>
            setFormData((p) => ({
              ...p,
              introduction: {
                ...((p.introduction as Record<string, unknown>) || {}),
                publicIntro: e.target.value,
              },
            }))
          }
          placeholder="Write a public-facing introduction (compliant with MOM EALC #17)..."
        />
      </Field>

      <SaveButtons
        onSave={onSave}
        isSaving={isSaving}
        onUploadPhoto={onUploadPhoto}
        isUploadingPhoto={isUploadingPhoto}
      />
    </TabCard>
  );
});

// ─── Tab: Private Info ────────────────────────────────────────────────────────

const PrivateInfoTab = memo(({ formData, setFormData, onSave, isSaving, onUploadPhoto, isUploadingPhoto }: FormTabProps) => {
  const agencyContact = (formData.agencyContact as Record<string, unknown>) || {};
  const skillsPreferences = (formData.skillsPreferences as Record<string, unknown>) || {};

  return (
    <TabCard>
      <div className="text-center space-y-1">
        <h3 className="text-xl font-bold text-slate-800">Private Information</h3>
        <p className="text-sm text-slate-800">
          Internal agency records — not visible to employers or the public.
        </p>
      </div>

      <div className="space-y-5">
        <FormRow2Col
          left={
            <Field label="Interviewed By">
              <StyledInput
                value={String(skillsPreferences.interviewedBy || "")}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    skillsPreferences: {
                      ...((p.skillsPreferences as Record<string, unknown>) || {}),
                      interviewedBy: e.target.value,
                    },
                  }))
                }
                placeholder="Staff name"
              />
            </Field>
          }
          right={
            <Field label="Referred By">
              <StyledInput
                value={String(skillsPreferences.referredBy || "")}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    skillsPreferences: {
                      ...((p.skillsPreferences as Record<string, unknown>) || {}),
                      referredBy: e.target.value,
                    },
                  }))
                }
                placeholder="Referrer name"
              />
            </Field>
          }
        />

        <Field label="Passport Number">
          <StyledInput
            placeholder="e.g. R8833831 · Expiry: 28/01/2028"
            value={String(agencyContact.passportNo || "")}
            onChange={(e) =>
              setFormData((p) => ({
                ...p,
                agencyContact: {
                  ...((p.agencyContact as Record<string, unknown>) || {}),
                  passportNo: e.target.value,
                },
              }))
            }
          />
        </Field>

        <Field label="Phone (Maid / Foreign Agency) — WhatsApp">
          <StyledInput
            value={String(agencyContact.phone || "")}
            onChange={(e) =>
              setFormData((p) => ({
                ...p,
                agencyContact: {
                  ...((p.agencyContact as Record<string, unknown>) || {}),
                  phone: e.target.value,
                },
              }))
            }
            placeholder="+60 XXX XXXX"
          />
        </Field>

        <Field label="Agency's Historical Record of the Maid">
          <textarea
            className="w-full min-h-[200px] rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-800 font-medium shadow-sm transition-all duration-200 focus:outline-none focus:border-amber-400 focus:bg-white focus:shadow-[0_0_0_3px_rgba(251,191,36,0.18)] hover:border-slate-300 resize-none leading-relaxed placeholder:text-slate-600 placeholder:font-normal"
            value={String(skillsPreferences.privateInfo || "")}
            onChange={(e) =>
              setFormData((p) => ({
                ...p,
                skillsPreferences: {
                  ...((p.skillsPreferences as Record<string, unknown>) || {}),
                  privateInfo: e.target.value,
                },
              }))
            }
            placeholder="Internal notes, past incidents, special observations..."
          />
        </Field>
      </div>

      <SaveButtons
        onSave={onSave}
        isSaving={isSaving}
        onUploadPhoto={onUploadPhoto}
        isUploadingPhoto={isUploadingPhoto}
        primaryLabel="Save & Finish"
      />
    </TabCard>
  );
});

// ─── Tab registry ─────────────────────────────────────────────────────────────

const TabComponents = [
  ProfileTab,
  SkillsTab,
  EmploymentHistoryTab,
  AvailabilityRemarkTab,
  IntroductionTab,
  PublicIntroductionTab,
  PrivateInfoTab,
] as const;

export default AddMaid;
