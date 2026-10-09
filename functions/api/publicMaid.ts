type PublicMaidInput = Record<string, unknown>;

const asRecord = (value: unknown): PublicMaidInput =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as PublicMaidInput
    : {};

const safeString = (record: PublicMaidInput, key: string) =>
  typeof record[key] === "string" ? record[key] as string : "";

const calculateAge = (value: unknown): number | null => {
  if (typeof value !== "string" || !value.trim()) return null;
  const birthDate = new Date(value);
  if (Number.isNaN(birthDate.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  if (
    today.getMonth() < birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate())
  ) {
    age -= 1;
  }
  return age >= 0 ? age : null;
};

export const toPublicMaidProfile = (maid: PublicMaidInput) => {
  const agencyContact = asRecord(maid.agencyContact);
  const introduction = asRecord(maid.introduction);
  const skillsPreferences = asRecord(maid.skillsPreferences);
  const languageSkills = asRecord(maid.languageSkills);
  const referenceCode = safeString(maid, "referenceCode");
  const safePreviewUrl = (value: unknown) => {
    if (typeof value !== "string") return "";
    const previewPath = `/api/maids/${encodeURIComponent(referenceCode)}/photo-preview`;
    return value === previewPath || value.startsWith(`${previewPath}?`) ? value : "";
  };
  const photoDataUrls = Array.isArray(maid.photoDataUrls)
    ? maid.photoDataUrls.map(safePreviewUrl).filter(Boolean)
    : [];

  return {
    agencyId: typeof maid.agencyId === "number" ? maid.agencyId : undefined,
    fullName: safeString(maid, "fullName"),
    referenceCode,
    status: safeString(maid, "status"),
    type: safeString(maid, "type"),
    nationality: safeString(maid, "nationality"),
    age: calculateAge(maid.dateOfBirth),
    religion: safeString(maid, "religion"),
    maritalStatus: safeString(maid, "maritalStatus"),
    educationLevel: safeString(maid, "educationLevel"),
    languageSkills: Object.fromEntries(
      Object.entries(languageSkills).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
    ),
    experienceCount: Array.isArray(maid.employmentHistory) ? maid.employmentHistory.length : 0,
    introduction: {
      publicIntro: safeString(introduction, "publicIntro"),
      indianMaidCategory: safeString(introduction, "indianMaidCategory"),
    },
    skillsPreferences: {
      indianMaidCategory: safeString(skillsPreferences, "indianMaidCategory"),
    },
    agencyContact: {
      companyName: safeString(agencyContact, "companyName"),
      phone: safeString(agencyContact, "phone"),
      contactPerson: safeString(agencyContact, "contactPerson"),
      indianMaidCategory: safeString(agencyContact, "indianMaidCategory"),
    },
    photoDataUrl: safePreviewUrl(maid.photoDataUrl),
    photoDataUrls,
    hasPhoto: Boolean(maid.hasPhoto),
    isPublic: true,
  };
};
