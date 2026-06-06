export const NATIONALITY_DIAL_CODE: Record<string, string> = {
  "Filipino maid": "+63",
  "Indonesian maid": "+62",
  "Indian maid": "+91",
  "Myanmar maid": "+95",
  "Sri Lankan maid": "+94",
  "Bangladeshi maid": "+880",
  "Nepali maid": "+977",
  "Cambodian maid": "+855",
};

// Returns the new homeCountryContactNumber value when nationality changes, or undefined
// if the existing value should be left as-is.
export const getDialCodePrefillForNationality = (
  nat: string,
  existing: string,
): string | undefined => {
  const dialCode = NATIONALITY_DIAL_CODE[nat];
  const isBarePrefix = /^\+\d{1,4}\s*$/.test(existing);
  if (dialCode && (!existing || isBarePrefix)) return dialCode + " ";
  if (!dialCode && isBarePrefix) return "";
  return undefined;
};

export interface MaidProfile {
  id?: number;
  agencyId?: number;
  agencyName?: string;
  fullName: string;
  referenceCode: string;
  status?: string;
  type: string;
  nationality: string;
  dateOfBirth: string;
  placeOfBirth: string;
  height: number;
  weight: number;
  religion: string;
  maritalStatus: string;
  numberOfChildren: number;
  numberOfSiblings: number;
  homeAddress: string;
  airportRepatriation: string;
  educationLevel: string;
  languageSkills: Record<string, string>;
  skillsPreferences: Record<string, unknown>;
  workAreas: Record<string, unknown>;
  employmentHistory: Array<Record<string, unknown>>;
  introduction: Record<string, unknown>;
  agencyContact: Record<string, unknown>;
  photoDataUrls?: string[];
  photoDataUrl?: string;
  videoDataUrl?: string;
  isPublic?: boolean;
  hasPhoto?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export const defaultMaidProfile: MaidProfile = {
  fullName: "",
  referenceCode: "",
  status: "available",
  type: "",
  nationality: "",
  dateOfBirth: "",
  placeOfBirth: "",
  height: 0,
  weight: 0,
  religion: "",
  maritalStatus: "",
  numberOfChildren: 0,
  numberOfSiblings: 0,
  homeAddress: "",
  airportRepatriation: "",
  educationLevel: "",
  languageSkills: {
    English: "",
    "Mandarin/Chinese-Dialect": "",
    "Bahasa Indonesia/Malaysia": "",
    Hindi: "",
    Tamil: "",
  },
  skillsPreferences: {},
  workAreas: {},
  employmentHistory: [],
  introduction: {},
  agencyContact: {},
  photoDataUrls: [],
  photoDataUrl: "",
  videoDataUrl: "",
  isPublic: true,
  hasPhoto: false,
};

export const formatDate = (value?: string) => {
  if (!value) {
    return "N/A";
  }

  const trimmed = value.trim();

  // Prefer correct handling for date-only strings to avoid timezone shifts.
  const isoDateOnly = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDateOnly) {
    const [, y, m, d] = isoDateOnly;
    return `${d}/${m}/${y}`;
  }

  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return value;

  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = String(date.getFullYear());
  return `${dd}/${mm}/${yyyy}`;
};

export const getPrimaryPhoto = (maid: MaidProfile) =>
  Array.isArray(maid.photoDataUrls) && maid.photoDataUrls.length > 0 ? maid.photoDataUrls[0] : maid.photoDataUrl || "";

export const getPublicIntro = (maid: MaidProfile) => String((maid.introduction as Record<string, unknown>)?.publicIntro || "").trim();

export const getExperienceBucket = (maid: MaidProfile) => {
  const count = Array.isArray(maid.employmentHistory) ? maid.employmentHistory.length : 0;
  if (count >= 5) return "5+ Years";
  if (count >= 3) return "3-5 Years";
  if (count >= 1) return "1-2 Years";
  return "No Experience";
};

export const calculateAge = (dateOfBirth?: string) => {
  if (!dateOfBirth) {
    return null;
  }

  const text = String(dateOfBirth).trim();
  const isoDateOnly = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  const slashOrDashDate = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  const dob = isoDateOnly
    ? new Date(Number(isoDateOnly[1]), Number(isoDateOnly[2]) - 1, Number(isoDateOnly[3]))
    : slashOrDashDate
      ? new Date(Number(slashOrDashDate[3]), Number(slashOrDashDate[2]) - 1, Number(slashOrDashDate[1]))
      : new Date(text);

  if (Number.isNaN(dob.getTime())) {
    return null;
  }

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }

  return age;
};

