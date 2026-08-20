import { getAgencyAdminAuthHeaders } from "@/lib/agencyAdminAuth";
import { readSafeJson } from "@/lib/safeJson";

const ensureOk = async <T extends { error?: string }>(response: Response) => {
  const data = await readSafeJson<T>(response);
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
};

export interface AtsDashboard {
  totalApplicants: number;
  newApplicants: number;
  interviewedCandidates: number;
  approvedCandidates: number;
  rejectedCandidates: number;
  readyForMatching: number;
  placedHelpers: number;
  averageQualificationScore: number;
  averageTimeToApprovalDays: number;
  placementSuccessRate: number;
  funnel: Array<{ stage: string; count: number }>;
}

export interface AtsApplicationListItem {
  id: string;
  applicationCode: string;
  maidReferenceCode?: string;
  status: string;
  appliedAt: string;
  profile: {
    fullName: string;
    email: string;
    contactNumber: string;
    whatsappNumber?: string;
    nationality: string;
    age: number | null;
    yearsOfExperience: number;
    expectedSalary: number | null;
    employmentPreference: string;
    languageSkills: string[];
    cookingSkills: string[];
    childcareExperience: number;
    newbornCareExperience: number;
    elderlyCareExperience: number;
    availableDate: string;
    strengthsTags: string[];
    weaknessesTags: string[];
  };
  score?: {
    score: number;
    category: string;
    explanation: string;
  } | null;
  interview?: {
    interviewResult: string;
    score: number;
  } | null;
  clientMatchScore?: number;
  source?: string;
}

export interface AtsApplicationBundle {
  application: AtsApplicationListItem & {
    agencyId: number;
    aiParseSummary: string;
  };
  profile: Record<string, unknown> | null;
  score: {
    score: number;
    category: string;
    explanation: string;
    strengths: string[];
    weaknesses: string[];
    factors: Record<string, number>;
  } | null;
  interview: Record<string, unknown> | null;
  backgroundCheck: Record<string, unknown> | null;
  history: Array<{ id: string; fromStage?: string; toStage: string; actor: string; reason: string; createdAt: string }>;
  documents: Array<{ id: string; type: string; name: string; status: string; required: boolean }>;
  matches: Array<{ id: string; compatibilityScore: number; skillsMatched: string[]; missingRequirements: string[]; recommendation: string }>;
  notifications: Array<{ id: string; event: string; channel: string; message: string; createdAt: string }>;
  references: Array<{ name: string; relationship: string; contact: string; rating: number; verified: boolean }>;
}

export interface PublicAtsApplicationCreated {
  applicationId: string;
  applicationCode: string;
  applicantAccessToken: string;
  submittedAt: string;
}

export interface PublicAtsApplicationSummary {
  application: {
    id: string;
    applicationCode: string;
    status: string;
    appliedAt: string;
    aiParseSummary: string;
  };
  profile: {
    fullName: string;
    email: string;
    contactNumber: string;
    nationality: string;
    availableDate: string;
    expectedSalary: number | null;
  } | null;
  documents: Array<{ id: string; name: string; type: string; status: string; required: boolean; url: string }>;
  history: Array<{ id: string; toStage: string; reason: string; createdAt: string }>;
  notifications: Array<{ id: string; channel: string; event: string; message: string; createdAt: string }>;
}

export const fetchAtsDashboard = async () => {
  const response = await fetch("/api/ats/dashboard", {
    headers: { ...getAgencyAdminAuthHeaders() },
  });
  return ensureOk<AtsDashboard & { error?: string }>(response);
};

export const fetchAtsApplications = async (params: {
  q?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}) => {
  const query = new URLSearchParams();
  if (params.q?.trim()) query.set("q", params.q.trim());
  if (params.sort?.trim()) query.set("sort", params.sort.trim());
  query.set("page", String(params.page ?? 1));
  query.set("pageSize", String(params.pageSize ?? 20));
  if (params.filters && Object.keys(params.filters).length > 0) {
    query.set("filters", JSON.stringify(params.filters));
  }
  const response = await fetch(`/api/ats/applications?${query.toString()}`, {
    headers: { ...getAgencyAdminAuthHeaders() },
  });
  return ensureOk<{ data: AtsApplicationListItem[]; pageInfo: { page: number; pageSize: number; total: number; totalPages: number }; error?: string }>(response);
};

export const fetchAtsApplication = async (applicationId: string) => {
  const response = await fetch(`/api/ats/applications/${encodeURIComponent(applicationId)}`, {
    headers: { ...getAgencyAdminAuthHeaders() },
  });
  return ensureOk<AtsApplicationBundle & { error?: string }>(response);
};


export const updateAtsStage = async (applicationId: string, stage: string, reason?: string) => {
  const response = await fetch(`/api/ats/applications/${encodeURIComponent(applicationId)}/stage`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...getAgencyAdminAuthHeaders(),
    },
    body: JSON.stringify({ stage, reason }),
  });
  return ensureOk<AtsApplicationBundle & { error?: string }>(response);
};

export const bulkAtsAction = async (payload: {
  applicationIds: string[];
  action: "approve" | "reject" | "request_documents" | "assign_interview";
}) => {
  const response = await fetch("/api/ats/bulk-actions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAgencyAdminAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });
  return ensureOk<{ updated: number; data: AtsApplicationBundle[]; error?: string }>(response);
};

export const matchAtsCandidates = async (payload: { requirementText: string; requestId?: string; inquiryId?: number; top?: number }) => {
  const response = await fetch("/api/ats/match", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAgencyAdminAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });
  return ensureOk<{ matches: Array<Record<string, unknown>>; error?: string }>(response);
};

export const fetchAtsPresets = async () => {
  const response = await fetch("/api/ats/presets", {
    headers: { ...getAgencyAdminAuthHeaders() },
  });
  return ensureOk<{ presets: Array<{ id: string; name: string; filters: Record<string, unknown> }>; error?: string }>(response);
};

export const saveAtsPreset = async (name: string, filters: Record<string, unknown>) => {
  const response = await fetch("/api/ats/presets", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAgencyAdminAuthHeaders(),
    },
    body: JSON.stringify({ name, filters }),
  });
  return ensureOk<{ preset: { id: string; name: string; filters: Record<string, unknown> }; error?: string }>(response);
};

export const submitPublicAtsApplication = async (formData: FormData) => {
  const response = await fetch("/api/ats/public/apply", {
    method: "POST",
    body: formData,
  });
  return ensureOk<PublicAtsApplicationCreated & { error?: string }>(response);
};

export const fetchPublicAtsApplicationSummary = async (applicationId: string, token: string) => {
  const response = await fetch(
    `/api/ats/public/applications/${encodeURIComponent(applicationId)}?token=${encodeURIComponent(token)}`,
  );
  return ensureOk<PublicAtsApplicationSummary & { error?: string }>(response);
};
