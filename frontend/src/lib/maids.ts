export interface MaidProfile {
  id?: number;
  fullName: string;
  referenceCode: string;
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
  isPublic?: boolean;
  hasPhoto?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export const defaultMaidProfile: MaidProfile = {
  fullName: "",
  referenceCode: "",
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
    Mandarin: "",
    Bahasa: "",
    Hindi: "",
    Tamil: "",
  },
  skillsPreferences: {},
  workAreas: {},
  employmentHistory: [],
  introduction: {},
  agencyContact: {},
  isPublic: false,
  hasPhoto: false,
};

export const formatDate = (value?: string) => {
  if (!value) {
    return "N/A";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString();
};

export const calculateAge = (dateOfBirth?: string) => {
  if (!dateOfBirth) {
    return null;
  }

  const dob = new Date(dateOfBirth);
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
