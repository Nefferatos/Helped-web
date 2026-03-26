import type { MaidProfile } from "./maids";
import { getStoredClient } from "./clientAuth";

export interface CompanyProfileApi {
  id?: number;
  company_name?: string;
  short_name?: string;
  license_no?: string;
  address_line1?: string;
  address_line2?: string;
  postal_code?: string;
  country?: string;
  contact_person?: string;
  contact_phone?: string;
  contact_email?: string;
  contact_website?: string;
  office_hours_regular?: string;
  office_hours_other?: string;
  about_us?: string;
  logo_data_url?: string;
  gallery_image_data_urls?: string[];
  intro_video_data_url?: string;
}

export interface AgencySummary {
  id: number;
  name: string;
  shortName: string;
  licenseNo: string;
  contactPhone: string;
  contactPerson: string;
  contactEmail: string;
  website: string;
  location: string;
  rating: number;
  publicMaidsCount: number;
  availableMaidsCount: number;
  previewMaids: MaidProfile[];
  featuredSkills: string[];
  logoUrl?: string;
  about?: string;
}

const uniqueStrings = (values: Array<string | undefined>) =>
  Array.from(new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))).sort(
    (left, right) => left.localeCompare(right),
  );

const getMaidSkills = (maid: MaidProfile) =>
  uniqueStrings([
    ...Object.entries(maid.workAreas || {})
      .filter(([, config]) => {
        const typedConfig = config as { willing?: boolean; experience?: boolean };
        return Boolean(typedConfig.willing || typedConfig.experience);
      })
      .map(([area]) => area),
    maid.type,
  ]);

const getLocationLabel = (company: CompanyProfileApi) =>
  [company.address_line1, company.address_line2, company.country].filter(Boolean).join(", ") || "Singapore";

export const fetchAgencies = async (): Promise<AgencySummary[]> => {
  const [companyResponse, maidsResponse] = await Promise.all([fetch("/api/company"), fetch("/api/maids?visibility=public")]);

  if (!companyResponse.ok) {
    throw new Error("Failed to fetch agencies");
  }

  const companyData = (await companyResponse.json()) as { companyProfile?: CompanyProfileApi };
  const maidsData = maidsResponse.ok ? ((await maidsResponse.json()) as { maids?: MaidProfile[] }) : { maids: [] };
  const company = companyData.companyProfile;

  if (!company) {
    throw new Error("No agency found");
  }

  const publicMaids = (maidsData.maids ?? []).filter((maid) => maid.isPublic);
  const featuredSkills = uniqueStrings(publicMaids.flatMap((maid) => getMaidSkills(maid))).slice(0, 6);

  return [
    {
      id: company.id ?? 1,
      name: company.company_name || company.short_name || "Agency",
      shortName: company.short_name || company.company_name || "AG",
      licenseNo: company.license_no || "N/A",
      contactPhone: company.contact_phone || "N/A",
      contactPerson: company.contact_person || "N/A",
      contactEmail: company.contact_email || "N/A",
      website: company.contact_website || "",
      location: getLocationLabel(company),
      rating: publicMaids.length > 0 ? 4.8 : 4.5,
      publicMaidsCount: publicMaids.length,
      availableMaidsCount: publicMaids.filter((maid) => !maid.status || maid.status === "available").length,
      previewMaids: publicMaids.slice(0, 3),
      featuredSkills,
      logoUrl: company.logo_data_url,
      about: company.about_us || "",
    },
  ];
};

export const fetchAgencyDetails = async (agencyId: number) => {
  const agencies = await fetchAgencies();
  const agency = agencies.find((item) => item.id === agencyId);

  if (!agency) {
    throw new Error("Agency not found");
  }

  const companyResponse = await fetch("/api/company");
  if (!companyResponse.ok) {
    throw new Error("Failed to fetch agency details");
  }

  const companyData = (await companyResponse.json()) as { companyProfile?: CompanyProfileApi };
  return {
    agency,
    company: companyData.companyProfile ?? {},
  };
};

export const fetchAgencyMaids = async (_agencyId: number): Promise<MaidProfile[]> => {
  const response = await fetch("/api/maids?visibility=public");
  if (!response.ok) {
    throw new Error("Failed to fetch agency maids");
  }

  const data = (await response.json()) as { maids?: MaidProfile[] };
  return (data.maids ?? []).filter((maid) => maid.isPublic);
};

export const submitHiringRequest = async (
  maidRefCode: string,
  formData: Record<string, string | number | boolean>,
) => {
  const client = getStoredClient();

  if (!client) {
    throw new Error("Please log in as a client before submitting a hiring request");
  }

  const response = await fetch("/api/direct-sales", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      referenceCode: maidRefCode,
      clientId: client.id,
      status: "pending",
      formData,
    }),
  });

  const data = (await response.json().catch(() => ({}))) as {
    error?: string;
    directSale?: { id: number; status: string };
  };

  if (!response.ok || !data.directSale) {
    throw new Error(data.error || "Failed to submit hiring request");
  }

  return data;
};
