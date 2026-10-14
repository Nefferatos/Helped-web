import type { MaidProfile } from "./maids";
import { getStoredClient } from "./clientAuth";
import { getClientAuthHeaders } from "./clientAuth";

export interface PublicAgencyOption {
  id: number;
  name: string;
  email: string;
  createdAt: string;
  totalMaids: number;
  publicMaids: number;
  rating?: number;
  reviewCount?: number;
  isMain?: boolean;
}

export const fetchAgencyOptions = async (): Promise<PublicAgencyOption[]> => {
  const response = await fetch("/api/agencies");
  const data = (await response.json().catch(() => ({}))) as {
    agencies?: PublicAgencyOption[];
    error?: string;
  };
  if (!response.ok || !data.agencies) {
    throw new Error(data.error || "Failed to fetch agencies");
  }
  return data.agencies;
};

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
  reviewCount: number;
  publicMaidsCount: number;
  availableMaidsCount: number;
  previewMaids: MaidProfile[];
  featuredSkills: string[];
  logoUrl?: string;
  about?: string;
  isMain?: boolean;
}

export interface AgencyReview {
  id: number;
  agencyId: number;
  clientId: number;
  clientName: string;
  rating: number;
  comment: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgencyRatingSummary {
  average: number;
  count: number;
  distribution: Record<"1" | "2" | "3" | "4" | "5", number>;
}

export interface AgencyReviewsResponse {
  summary: AgencyRatingSummary;
  reviews: AgencyReview[];
}

export interface AgencyReviewSubmitResult {
  review: AgencyReview;
  summary: AgencyRatingSummary;
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
  const [agenciesResponse, maidsResponse] = await Promise.all([fetch("/api/agencies"), fetch("/api/maids?visibility=public")]);

  if (!agenciesResponse.ok) {
    throw new Error("Failed to fetch agencies");
  }

  const agenciesData = (await agenciesResponse.json()) as { agencies?: PublicAgencyOption[] };
  const maidsData = maidsResponse.ok ? ((await maidsResponse.json()) as { maids?: MaidProfile[] }) : { maids: [] };
  const agencies = agenciesData.agencies ?? [];
  if (agencies.length === 0) {
    throw new Error("No agency found");
  }

  const publicMaids = (maidsData.maids ?? []).filter((maid) => maid.isPublic);

  return agencies
    .map((agency) => {
      const agencyMaids = publicMaids.filter((maid) => maid.agencyId === agency.id);
      return {
        id: agency.id,
        name: agency.name,
        shortName: agency.name,
        licenseNo: "N/A",
        contactPhone: "N/A",
        contactPerson: agency.name,
        contactEmail: agency.email || "N/A",
        website: "",
        location: "Singapore",
        // A rating only exists once a real review does. Never invent a score —
        // a badge that appears for every agency is exactly what made the rating
        // meaningless, so consumers gate on `reviewCount > 0`.
        rating:
          typeof agency.rating === "number" && (agency.reviewCount ?? 0) > 0
            ? agency.rating
            : 0,
        reviewCount: typeof agency.reviewCount === "number" ? agency.reviewCount : 0,
        publicMaidsCount: agency.publicMaids,
        availableMaidsCount: agencyMaids.filter((maid) => !maid.status || maid.status === "available").length,
        previewMaids: agencyMaids.slice(0, 3),
        featuredSkills: uniqueStrings(agencyMaids.flatMap((maid) => getMaidSkills(maid))).slice(0, 6),
        logoUrl: "",
        about: "",
        isMain: Boolean(agency.isMain),
      };
    })
    .sort((left, right) => {
      if (left.isMain && !right.isMain) return -1;
      if (!left.isMain && right.isMain) return 1;
      if (right.publicMaidsCount !== left.publicMaidsCount) return right.publicMaidsCount - left.publicMaidsCount;
      return left.name.localeCompare(right.name);
    });
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
  const response = await fetch(`/api/maids?visibility=public&agencyId=${encodeURIComponent(String(_agencyId))}`);
  if (!response.ok) {
    throw new Error("Failed to fetch agency maids");
  }

  const data = (await response.json()) as { maids?: MaidProfile[] };
  return (data.maids ?? []).filter((maid) => maid.isPublic);
};

export const submitHiringRequest = async (
  maidRefCode: string,
  agencyId: number | undefined,
  formData: Record<string, string | number | boolean>,
) => {
  const client = getStoredClient();

  if (!client) {
    throw new Error("Please log in as a client before submitting a hiring request");
  }

  const response = await fetch("/api/requests", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getClientAuthHeaders(),
    },
    body: JSON.stringify({
      clientId: client.id,
      type: "direct",
      ...(typeof agencyId === "number" ? { agencyId } : {}),
      maidReferences: [maidRefCode],
      details: formData,
    }),
  });

  const data = (await response.json().catch(() => ({}))) as {
    error?: string;
    data?: { id: string; status: string };
  };

  if (!response.ok || !data.data) {
    throw new Error(data.error || "Failed to submit hiring request");
  }

  return data;
};

export const fetchAgencyReviews = async (agencyId: number): Promise<AgencyReviewsResponse> => {
  const response = await fetch(`/api/agencies/${encodeURIComponent(String(agencyId))}/reviews`);
  const data = (await response.json().catch(() => ({}))) as Partial<AgencyReviewsResponse> & {
    error?: string;
  };
  if (!response.ok || !data.summary) {
    throw new Error(data.error || "Failed to fetch agency reviews");
  }
  return {
    summary: data.summary,
    reviews: Array.isArray(data.reviews) ? data.reviews : [],
  };
};

export const submitAgencyReview = async (
  agencyId: number,
  rating: number,
  comment: string,
): Promise<AgencyReviewSubmitResult> => {
  const client = getStoredClient();
  if (!client) {
    throw new Error("Please log in as a client before rating an agency");
  }

  const response = await fetch(`/api/agencies/${encodeURIComponent(String(agencyId))}/reviews`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getClientAuthHeaders(),
    },
    body: JSON.stringify({ rating, comment }),
  });

  const data = (await response.json().catch(() => ({}))) as {
    error?: string;
    review?: AgencyReview;
    summary?: AgencyRatingSummary;
  };
  if (!response.ok || !data.review || !data.summary) {
    throw new Error(data.error || "Failed to submit review");
  }

  return { review: data.review, summary: data.summary };
};

export const deleteAgencyReview = async (
  agencyId: number,
  reviewId: number,
): Promise<AgencyRatingSummary> => {
  const response = await fetch(
    `/api/agencies/${encodeURIComponent(String(agencyId))}/reviews/${encodeURIComponent(String(reviewId))}`,
    {
      method: "DELETE",
      headers: {
        ...getClientAuthHeaders(),
      },
    },
  );

  const data = (await response.json().catch(() => ({}))) as {
    error?: string;
    summary?: AgencyRatingSummary;
  };
  if (!response.ok || !data.summary) {
    throw new Error(data.error || "Failed to remove review");
  }

  return data.summary;
};
