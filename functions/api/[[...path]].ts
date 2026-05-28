import { Hono } from "hono";
import { cors } from "hono/cors";
import type { ExecutionContext, KVNamespace } from "@cloudflare/workers-types";
import { classifyFallback } from "./fallbackClassifier";

type AssetsBinding = {
  fetch: (request: Request) => Promise<Response>;
};

interface MaidRecord {
  id: number;
  agencyId: number;
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
  photoDataUrls: string[];
  photoDataUrl: string;
  videoDataUrl: string;
  isPublic: boolean;
  hasPhoto: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CompanyProfileRecord {
  id: number;
  company_name: string;
  short_name: string;
  license_no: string;
  address_line1: string;
  address_line2?: string;
  postal_code: string;
  country: string;
  contact_person?: string;
  contact_phone?: string;
  contact_email?: string;
  contact_fax?: string;
  contact_website?: string;
  office_hours_regular?: string;
  office_hours_other?: string;
  social_facebook?: string;
  social_whatsapp_number?: string;
  social_whatsapp_message?: string;
  branding_theme_color?: string;
  branding_button_color?: string;
  about_us?: string;
  logo_data_url?: string;
  gallery_image_data_urls?: string[];
  intro_video_data_url?: string;
  created_at: string;
  updated_at: string;
}

interface MOMPersonnelRecord {
  id: number;
  company_id: number;
  name: string;
  registration_number: string;
  created_at: string;
}

interface TestimonialRecord {
  id: number;
  company_id: number;
  message: string;
  author: string;
  created_at: string;
}

interface EnquiryRecord {
  id: number;
  username: string;
  date: string;
  email: string;
  phone: string;
  message: string;
  createdAt: string;
}

interface ClientRecord {
  id: number;
  supabaseUserId?: string;
  name: string;
  company?: string;
  email: string;
  password: string;
  phone?: string;
  emailVerified?: boolean;
  emailVerificationCodeHash?: string;
  emailVerificationExpiresAt?: string;
  emailVerificationSentAt?: string;
  profileImageUrl?: string;
  createdAt: string;
}

interface ClientSessionRecord {
  token: string;
  clientId: number;
  createdAt: string;
}

interface AgencyAdminRecord {
  id: number;
  agencyId: number;
  supabaseUserId?: string;
  username: string;
  email?: string;
  password: string;
  passwordHash?: string;
  agencyName: string;
  emailVerified?: boolean;
  emailVerificationCodeHash?: string;
  emailVerificationExpiresAt?: string;
  emailVerificationSentAt?: string;
  profileImageUrl?: string;
  createdAt: string;
}

interface AgencyAdminSessionRecord {
  token: string;
  adminId: number;
  admin?: {
    id: number;
    agencyId: number;
    username: string;
    email?: string;
    emailVerified?: boolean;
    agencyName: string;
    profileImageUrl?: string;
    createdAt: string;
  };
  createdAt: string;
}

interface AgencyAdminSessionStoreRecord {
  agencyAdminSessions: AgencyAdminSessionRecord[];
}

interface AgencyAdminAuthStoreRecord {
  agencyAdmins: AgencyAdminRecord[];
}

interface DirectSaleRecord {
  id: number;
  maidReferenceCode: string;
  maidName: string;
  clientId: number;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  status: string;
  requestDetails?: Record<string, string>;
  createdAt: string;
}

interface ChatMessageRecord {
  id: number;
  clientId: number;
  conversationType: "support" | "agency";
  agencyId?: number;
  agencyName?: string;
  senderRole: "client" | "agency";
  senderName: string;
  message: string;
  createdAt: string;
  readByAgency: boolean;
  readByClient: boolean;
}

interface EmployerContractRecord {
  id: number;
  refCode: string;
  maid: Record<string, unknown>;
  agency: Record<string, unknown>;
  employer: Record<string, unknown>;
  spouse: Record<string, unknown>;
  familyMembers: Array<Record<string, unknown>>;
  notificationDate?: Record<string, unknown>;
  documents: Array<{
    category: string;
    fileUrl: string;
    fileName: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface EmploymentContractRecord {
  id: number;
  refCode: string;
  employerRefCode: string;
  employerId: number | null;
  maidId: number | null;
  maidReferenceCode: string;
  maidName: string;
  employerName: string;
  caseReferenceNumber: string;
  contractDate: string;
  serviceFee: string;
  placementFee: string;
  agencyWitness: string;
  employerSnapshot: Record<string, unknown>;
  maidSnapshot: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

type RecruitmentStage =
  | "New Applicant"
  | "Documents Submitted"
  | "Resume Parsed"
  | "Screening Interview"
  | "Background Check"
  | "Approved"
  | "Ready For Client Matching"
  | "Placed"
  | "Rejected";

type AtsDocumentKind =
  | "resume"
  | "passport"
  | "work_permit"
  | "medical"
  | "certificate"
  | "reference"
  | "video"
  | "other";

interface AtsDocumentRecord {
  id: string;
  type: AtsDocumentKind;
  name: string;
  fileType: string;
  size: number;
  url: string;
  storagePath?: string;
  required: boolean;
  uploadedAt: string;
  status: "missing" | "submitted" | "verified" | "rejected";
}

interface AtsScoreRecord {
  score: number;
  category: string;
  explanation: string;
  strengths: string[];
  weaknesses: string[];
  factors: {
    experience: number;
    skillMatch: number;
    certifications: number;
    references: number;
    languageSkills: number;
    interviewRating: number;
  };
}

interface AtsHistoryRecord {
  id: string;
  fromStage?: RecruitmentStage;
  toStage: RecruitmentStage;
  actor: string;
  reason: string;
  createdAt: string;
}

interface AtsApplicationProfileRecord {
  id: string;
  applicationId: string;
  maidReferenceCode?: string;
  fullName: string;
  email: string;
  whatsappNumber?: string;
  nationality: string;
  dateOfBirth: string;
  age: number | null;
  gender: string;
  maritalStatus: string;
  contactNumber: string;
  address: string;
  yearsOfExperience: number;
  previousCountriesWorkedIn: string[];
  childcareExperience: number;
  newbornCareExperience: number;
  elderlyCareExperience: number;
  disabledCareExperience: number;
  housekeepingExperience: number;
  cookingSkills: string[];
  petCareExperience: number;
  languageSkills: string[];
  certifications: string[];
  trainingRecords: string[];
  availableDate: string;
  expectedSalary: number | null;
  employmentPreference: string;
  coverNote: string;
  workHistory: Array<Record<string, unknown>>;
  fdwFormData: Record<string, unknown>;
  strengthsTags: string[];
  weaknessesTags: string[];
  clientMatchScore: number;
  createdAt: string;
  updatedAt: string;
}

interface AtsApplicationRecord {
  id: string;
  agencyId: number;
  profileId: string;
  applicationCode: string;
  applicantAccessToken: string;
  status: RecruitmentStage;
  source: "resume_upload";
  appliedAt: string;
  updatedAt: string;
  aiParseSummary: string;
  notificationLogIds: string[];
}

interface AtsNotificationRecord {
  id: string;
  applicationId: string;
  event: string;
  channel: "email" | "whatsapp" | "internal";
  message: string;
  createdAt: string;
}

interface AtsFilterPresetRecord {
  id: string;
  agencyId: number;
  name: string;
  filters: Record<string, unknown>;
  createdAt: string;
}

interface AtsData {
  applications: AtsApplicationRecord[];
  profiles: AtsApplicationProfileRecord[];
  scores: Record<string, AtsScoreRecord>;
  history: Record<string, AtsHistoryRecord[]>;
  documents: Record<string, AtsDocumentRecord[]>;
  notifications: Record<string, AtsNotificationRecord[]>;
  presets: AtsFilterPresetRecord[];
}

interface AppData {
  companyProfile: CompanyProfileRecord;
  momPersonnel: MOMPersonnelRecord[];
  testimonials: TestimonialRecord[];
  maids: MaidRecord[];
  enquiries: EnquiryRecord[];
  clients: ClientRecord[];
  clientSessions: ClientSessionRecord[];
  agencyAdmins: AgencyAdminRecord[];
  agencyAdminSessions: AgencyAdminSessionRecord[];
  directSales: DirectSaleRecord[];
  chatMessages: ChatMessageRecord[];
  employers: EmployerContractRecord[];
  employmentContracts: EmploymentContractRecord[];
  ats: AtsData;
  counters: {
    momPersonnel: number;
    testimonials: number;
    maids: number;
    enquiries: number;
    clients: number;
    agencyAdmins: number;
    directSales: number;
    chatMessages: number;
    employers: number;
    employmentContracts: number;
  };
}

type Bindings = {
  APP_DATA?: KVNamespace;
  ASSETS: AssetsBinding;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_APP_DATA_TABLE?: string;
  SUPABASE_APP_DATA_ID?: string;
  SUPABASE_USE_NORMALIZED?: string;
  SUPABASE_STORAGE_BUCKET?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM?: string;
  DEV_EXPOSE_CONFIRMATION_CODE?: string;
};

type Variables = {
  client: ClientRecord;
  agencyAdmin: AgencyAdminRecord;
};

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.use("/api/*", cors());

const now = () => new Date().toISOString();

const stripBom = (value: string) => value.replace(/^\uFEFF/, "");

const buildFallbackDate = () =>
  new Intl.DateTimeFormat("en-SG", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Singapore",
  }).format(new Date());

const defaultData = (): AppData => ({
  companyProfile: {
    id: 1,
    company_name: "At The Agency (formerly Rinzin Agency Pte. Ltd.)",
    short_name: "At The Agency",
    license_no: "2503114",
    address_line1: "Singapore",
    address_line2: "",
    postal_code: "000000",
    country: "Singapore",
    contact_person: "Bala",
    contact_phone: "80730757",
    contact_email: "info@theagency.sg",
    contact_fax: "",
    contact_website: "",
    office_hours_regular: "Mon-Sat: 9:00am to 7:30pm",
    office_hours_other: "",
    social_facebook: "",
    social_whatsapp_number: "80730757",
    social_whatsapp_message: "Hello, I am interested in your agency profile.",
    branding_theme_color: "",
    branding_button_color: "",
    about_us: "",
    logo_data_url: "",
    gallery_image_data_urls: [],
    intro_video_data_url: "",
    created_at: now(),
    updated_at: now(),
  },
  momPersonnel: [],
  testimonials: [],
  maids: [],
  enquiries: [
    {
      id: 1,
      username: "Rajni",
      date: "23 March 2026, 12:58",
      email: "rajnirose305@gmail.com",
      phone: "+918872486884",
      message:
        "M best in cooking.\n\nEmployer Requirement:\nNationality: Indian\nType: Ex-Singapore Maid\nAge: 41 and above\nDuty: Taking care of infant\nLanguage: English",
      createdAt: now(),
    },
    {
      id: 2,
      username: "Devina",
      date: "23 March 2026, 12:57",
      email: "devinachew@gmail.com",
      phone: "81381569",
      message:
        "Employer Requirement:\nNationality: Indonesian\nType: Transfer Maid\nAge: 31 to 35",
      createdAt: now(),
    },
    {
      id: 3,
      username: "Shaiful",
      date: "23 March 2026, 12:00",
      email: "hirqa@yahoo.com.sg",
      phone: "98214800",
      message:
        "urgently need a helper who is above 1.65m tall. must be strong & hygienic. can take care of elderly & disabled.",
      createdAt: now(),
    },
    {
      id: 4,
      username: "Jit",
      date: "22 March 2026, 3:59",
      email: "jitchu@yahoo.com",
      phone: "90275978",
      message:
        "Employer Requirement:\nNationality: Indonesian\nAge: 31 to 35\nDuty: Taking care of elderly / bedridden\nLanguage: English",
      createdAt: now(),
    },
    {
      id: 5,
      username: "William Lawton",
      date: "22 March 2026, 3:59",
      email: "William.Lawton100@gmail.com",
      phone: "19107283080",
      message:
        "Live in Spain, will have own apartment, cook, clean, market, massage therapist background as well would be amazing.\n\nEmployer Requirement:\nNationality: Filipino\nAge: 41 and above\nDuty: General Housekeeping\nLanguage: English\nOff-day: No Off-day",
      createdAt: now(),
    },
  ],
  clients: [],
  clientSessions: [],
  agencyAdmins: [
    {
      id: 1,
      agencyId: 1,
      username: "attheagency",
      password: "@atagency2026",
      agencyName: "Main Agency",
      createdAt: now(),
    },
  ],
  agencyAdminSessions: [],
  directSales: [],
  chatMessages: [],
  employers: [],
  employmentContracts: [],
  ats: {
    applications: [],
    profiles: [],
    scores: {},
    history: {},
    documents: {},
    notifications: {},
    presets: [],
  },
  counters: {
    momPersonnel: 1,
    testimonials: 1,
    maids: 1,
    enquiries: 6,
    clients: 1,
    agencyAdmins: 2,
    directSales: 1,
    chatMessages: 1,
    employers: 1,
    employmentContracts: 1,
  },
});

const nextCounter = (
  current: number | undefined,
  ids: number[],
  fallback: number,
) => {
  if (typeof current === "number") return current;
  if (ids.length === 0) return fallback;
  return Math.max(...ids, fallback - 1) + 1;
};

const normalizeMaid = (maid: MaidRecord): MaidRecord => {
  const photos = Array.isArray(maid.photoDataUrls)
    ? maid.photoDataUrls.filter(
        (item) => typeof item === "string" && item.trim(),
      )
    : maid.photoDataUrl
      ? [maid.photoDataUrl]
      : [];

  return {
    ...maid,
    agencyId: Number.isInteger(Number(maid.agencyId)) ? Number(maid.agencyId) : 1,
    status: maid.status ?? "available",
    photoDataUrls: photos.slice(0, 5),
    photoDataUrl: photos[0] ?? maid.photoDataUrl ?? "",
    videoDataUrl: maid.videoDataUrl ?? "",
    hasPhoto: photos.length > 0,
  };
};

const toNullableNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toTrimmedString = (value: unknown) => String(value ?? "").trim();

const CANONICAL_WORKFLOWS = [
  "inquiry_match",
  "inquiry_only",
  "lead_scoring",
  "contract_creation",
  "schedule_creation",
  "notification_only",
  "validation_error",
  "human_review",
] as const;

type CanonicalWorkflow = (typeof CANONICAL_WORKFLOWS)[number];

const LEGACY_WORKFLOW_MAP: Record<string, CanonicalWorkflow> = {
  maid_matching: "inquiry_match",
  general_inquiry: "inquiry_only",
  inquiry: "inquiry_only",
};

const isCanonicalWorkflow = (workflow: string): workflow is CanonicalWorkflow =>
  (CANONICAL_WORKFLOWS as readonly string[]).includes(workflow);

const normalizeWorkflow = (workflow: string): CanonicalWorkflow => {
  if (workflow === "human_review") {
    return "human_review";
  }

  const normalized = LEGACY_WORKFLOW_MAP[workflow] ?? workflow;
  if (isCanonicalWorkflow(normalized)) {
    return normalized;
  }

  throw new Error(`INVALID_WORKFLOW:${workflow}`);
};

const containsLegacyWorkflow = (value: unknown): boolean => {
  if (Array.isArray(value)) {
    return value.some((item) => containsLegacyWorkflow(item));
  }

  if (value && typeof value === "object") {
    return Object.entries(value).some(([key, item]) => {
      if (key === "workflow" && typeof item === "string") {
        return (
          item === "general_inquiry" ||
          item === "maid_matching" ||
          item === "inquiry"
        );
      }
      return containsLegacyWorkflow(item);
    });
  }

  return false;
};

const isProductionRuntime = (request: Request) => {
  const explicit =
    (globalThis as { process?: { env?: Record<string, string | undefined> } })
      .process?.env?.NODE_ENV?.trim()
      ?.toLowerCase() ?? "";
  if (explicit) {
    return explicit === "production";
  }

  const host = new URL(request.url).hostname.toLowerCase();
  return host !== "localhost" && host !== "127.0.0.1";
};

const assertNoLegacyWorkflowResponse = (request: Request, payload: unknown) => {
  if (!isProductionRuntime(request)) return;
  if (containsLegacyWorkflow(payload)) {
    throw new Error("LEGACY_WORKFLOW_LEAK_DETECTED");
  }
};

const defaultIntentForWorkflow = (workflow: CanonicalWorkflow) => {
  switch (workflow) {
    case "inquiry_match":
      return "hiring";
    case "inquiry_only":
      return "inquiry";
    case "lead_scoring":
      return "lead";
    case "contract_creation":
      return "contract";
    case "schedule_creation":
      return "schedule";
    case "notification_only":
      return "notification";
    case "validation_error":
      return "validation_error";
    case "human_review":
      return "complaint";
    default:
      return "system";
  }
};

const buildWorkflowResponse = <T>(
  request: Request,
  payload: {
    workflow?: string | null;
    intent?: string | null;
    fallbackUsed?: boolean | null;
    fallbackProvider?: string | null;
    data: T;
  },
) => {
  try {
    const workflow = normalizeWorkflow(payload.workflow ?? "");
    const responseBody = {
      workflow,
      intent:
        typeof payload.intent === "string" && payload.intent.trim()
          ? payload.intent
          : defaultIntentForWorkflow(workflow),
      fallbackUsed: typeof payload.fallbackUsed === "boolean" ? payload.fallbackUsed : false,
      fallbackProvider: payload.fallbackProvider ?? null,
      data: payload.data,
    };

    assertNoLegacyWorkflowResponse(request, responseBody);
    return responseBody;
  } catch (error) {
    if (!isProductionRuntime(request)) {
      throw error;
    }

    return {
      workflow: "validation_error" as const,
      intent: "validation_error",
      fallbackUsed: true,
      fallbackProvider: payload.fallbackProvider ?? "worker_guard",
      data: payload.data,
    };
  }
};

const formatEmployerRefCode = (value: number) => String(value).padStart(5, "0");

const normalizeEmployerContractRecord = (
  record: Partial<EmployerContractRecord>,
): EmployerContractRecord => ({
  id: Number(record.id ?? 0) || 0,
  refCode: toTrimmedString(record.refCode),
  maid: record.maid && typeof record.maid === "object" ? record.maid : {},
  agency:
    record.agency && typeof record.agency === "object" ? record.agency : {},
  employer:
    record.employer && typeof record.employer === "object"
      ? record.employer
      : {},
  spouse:
    record.spouse && typeof record.spouse === "object" ? record.spouse : {},
  familyMembers: Array.isArray(record.familyMembers) ? record.familyMembers : [],
  notificationDate:
    record.notificationDate && typeof record.notificationDate === "object"
      ? record.notificationDate
      : {},
  documents: Array.isArray(record.documents)
    ? record.documents.map((document) => ({
        category: toTrimmedString(document.category),
        fileUrl: toTrimmedString(document.fileUrl),
        fileName: toTrimmedString(document.fileName),
      }))
    : [],
  createdAt: record.createdAt ?? now(),
  updatedAt: record.updatedAt ?? record.createdAt ?? now(),
});

const normalizeEmploymentContractRecord = (
  record: Partial<EmploymentContractRecord>,
  fallbackRefCode: string,
): EmploymentContractRecord => ({
  id: Number(record.id ?? 0) || 0,
  refCode: toTrimmedString(record.refCode) || fallbackRefCode,
  employerRefCode:
    toTrimmedString(record.employerRefCode) ||
    toTrimmedString(record.refCode) ||
    fallbackRefCode,
  employerId: toNullableNumber(record.employerId),
  maidId: toNullableNumber(record.maidId),
  maidReferenceCode: toTrimmedString(record.maidReferenceCode),
  maidName: toTrimmedString(record.maidName),
  employerName: toTrimmedString(record.employerName),
  caseReferenceNumber:
    toTrimmedString(record.caseReferenceNumber) ||
    toTrimmedString(record.refCode) ||
    fallbackRefCode,
  contractDate: toTrimmedString(record.contractDate),
  serviceFee: toTrimmedString(record.serviceFee),
  placementFee: toTrimmedString(record.placementFee),
  agencyWitness: toTrimmedString(record.agencyWitness),
  employerSnapshot:
    record.employerSnapshot && typeof record.employerSnapshot === "object"
      ? record.employerSnapshot
      : {},
  maidSnapshot:
    record.maidSnapshot && typeof record.maidSnapshot === "object"
      ? record.maidSnapshot
      : {},
  createdAt: record.createdAt ?? now(),
  updatedAt: record.updatedAt ?? record.createdAt ?? now(),
});

const mergeAppData = (raw: Partial<AppData>): AppData => {
  const defaults = defaultData();
  const maids = (raw.maids ?? defaults.maids).map(normalizeMaid);
  const enquiries = raw.enquiries ?? defaults.enquiries;
  const clients = (raw.clients ?? defaults.clients).map((client) => ({
    ...client,
    supabaseUserId: client.supabaseUserId || undefined,
    name: client.name ?? "",
    company: client.company ?? "",
    phone: client.phone ?? "",
    email: client.email ?? "",
    profileImageUrl: client.profileImageUrl ?? "",
    createdAt: client.createdAt ?? now(),
    // Back-compat: treat pre-existing clients as verified.
    emailVerified:
      typeof client.emailVerified === "boolean" ? client.emailVerified : true,
  }));
  let agencyAdmins = (raw.agencyAdmins ?? defaults.agencyAdmins).map(
    (admin) => ({
      ...admin,
      agencyId: Number.isInteger(Number(admin.agencyId))
        ? Number(admin.agencyId)
        : 1,
      supabaseUserId: admin.supabaseUserId || undefined,
      email: admin.email ?? "",
      password: typeof admin.password === "string" ? admin.password : "",
      passwordHash:
        typeof admin.passwordHash === "string" ? admin.passwordHash : "",
      profileImageUrl: admin.profileImageUrl ?? "",
      createdAt: admin.createdAt ?? now(),
      // Back-compat: treat pre-existing admins as verified (or no-email).
      emailVerified:
        typeof admin.emailVerified === "boolean" ? admin.emailVerified : true,
    }),
  );
  const hasMainAgency = agencyAdmins.some(
    (admin) => admin.username === "attheagency",
  );
  if (!hasMainAgency) {
    agencyAdmins = agencyAdmins.map((admin) =>
      admin.username === "admin" && admin.password === "admin123"
        ? { ...admin, username: "attheagency", password: "@atagency2026" }
        : admin,
    );
  }
  agencyAdmins = agencyAdmins.map((admin) =>
    admin.username === "attheagency"
      ? { ...admin, password: "@atagency2026" }
      : admin,
  );
  const directSales = raw.directSales ?? defaults.directSales;
  const chatMessages = raw.chatMessages ?? defaults.chatMessages;
  const employers = (raw.employers ?? defaults.employers)
    .map((record) => normalizeEmployerContractRecord(record))
    .filter((record) => record.refCode);
  const employmentContracts = (
    raw.employmentContracts ??
    employers.map((record) => {
      const agency = record.agency ?? {};
      const maid = record.maid ?? {};
      const employer = record.employer ?? {};
      return {
        id: record.id,
        refCode: record.refCode,
        employerRefCode: record.refCode,
        employerId: record.id,
        maidId:
          toNullableNumber((maid as { id?: unknown; maidId?: unknown }).id) ??
          toNullableNumber((maid as { maidId?: unknown }).maidId),
        maidReferenceCode: toTrimmedString(
          (maid as { referenceCode?: unknown }).referenceCode,
        ),
        maidName:
          toTrimmedString((maid as { fullName?: unknown }).fullName) ||
          toTrimmedString((maid as { name?: unknown }).name),
        employerName: toTrimmedString(
          (employer as { name?: unknown }).name,
        ),
        caseReferenceNumber:
          toTrimmedString(
            (agency as { caseReferenceNumber?: unknown }).caseReferenceNumber,
          ) || record.refCode,
        contractDate: toTrimmedString(
          (agency as { contractDate?: unknown }).contractDate,
        ),
        serviceFee: toTrimmedString(
          (agency as { serviceFee?: unknown }).serviceFee,
        ),
        placementFee: toTrimmedString(
          (agency as { placementFee?: unknown }).placementFee,
        ),
        agencyWitness: toTrimmedString(
          (agency as { agencyWitness?: unknown }).agencyWitness,
        ),
        employerSnapshot: employer,
        maidSnapshot: maid,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      };
    })
  ).map((record) =>
    normalizeEmploymentContractRecord(
      record,
      toTrimmedString((record as { refCode?: unknown }).refCode),
    ),
  );
  const rawAts = raw.ats ?? defaults.ats;

  return {
    companyProfile: {
      ...defaults.companyProfile,
      ...raw.companyProfile,
      gallery_image_data_urls: Array.isArray(
        raw.companyProfile?.gallery_image_data_urls,
      )
        ? raw.companyProfile.gallery_image_data_urls
        : defaults.companyProfile.gallery_image_data_urls,
    },
    momPersonnel: raw.momPersonnel ?? defaults.momPersonnel,
    testimonials: raw.testimonials ?? defaults.testimonials,
    maids,
    enquiries,
    clients,
    clientSessions: raw.clientSessions ?? defaults.clientSessions,
    agencyAdmins,
    agencyAdminSessions:
      raw.agencyAdminSessions ?? defaults.agencyAdminSessions,
    directSales,
    chatMessages: chatMessages.map((message) => ({
      ...message,
      conversationType: message.conversationType ?? "support",
      agencyName: message.agencyName ?? "",
    })),
    employers,
    employmentContracts,
    ats: {
      applications: Array.isArray(rawAts.applications)
        ? rawAts.applications.filter(
            (item): item is AtsApplicationRecord =>
              Boolean(item && typeof item === "object" && item.id),
          )
        : defaults.ats.applications,
      profiles: Array.isArray(rawAts.profiles)
        ? rawAts.profiles.filter(
            (item): item is AtsApplicationProfileRecord =>
              Boolean(item && typeof item === "object" && item.id),
          )
        : defaults.ats.profiles,
      scores:
        rawAts.scores && typeof rawAts.scores === "object"
          ? rawAts.scores
          : defaults.ats.scores,
      history:
        rawAts.history && typeof rawAts.history === "object"
          ? rawAts.history
          : defaults.ats.history,
      documents:
        rawAts.documents && typeof rawAts.documents === "object"
          ? rawAts.documents
          : defaults.ats.documents,
      notifications:
        rawAts.notifications && typeof rawAts.notifications === "object"
          ? rawAts.notifications
          : defaults.ats.notifications,
      presets: Array.isArray(rawAts.presets)
        ? rawAts.presets.filter(
            (item): item is AtsFilterPresetRecord =>
              Boolean(item && typeof item === "object" && item.id),
          )
        : defaults.ats.presets,
    },
    counters: {
      momPersonnel: nextCounter(
        raw.counters?.momPersonnel,
        (raw.momPersonnel ?? []).map((item) => item.id),
        defaults.counters.momPersonnel,
      ),
      testimonials: nextCounter(
        raw.counters?.testimonials,
        (raw.testimonials ?? []).map((item) => item.id),
        defaults.counters.testimonials,
      ),
      maids: nextCounter(
        raw.counters?.maids,
        maids.map((item) => item.id),
        defaults.counters.maids,
      ),
      enquiries: nextCounter(
        raw.counters?.enquiries,
        enquiries.map((item) => item.id),
        defaults.counters.enquiries,
      ),
      clients: nextCounter(
        raw.counters?.clients,
        clients.map((item) => item.id),
        defaults.counters.clients,
      ),
      agencyAdmins: nextCounter(
        raw.counters?.agencyAdmins,
        agencyAdmins.map((item) => item.id),
        defaults.counters.agencyAdmins,
      ),
      directSales: nextCounter(
        raw.counters?.directSales,
        directSales.map((item) => item.id),
        defaults.counters.directSales,
      ),
      chatMessages: nextCounter(
        raw.counters?.chatMessages,
        chatMessages.map((item) => item.id),
        defaults.counters.chatMessages,
      ),
      employers: nextCounter(
        raw.counters?.employers,
        employers.map((item) => item.id),
        defaults.counters.employers,
      ),
      employmentContracts: nextCounter(
        raw.counters?.employmentContracts,
        employmentContracts.map((item) => item.id),
        defaults.counters.employmentContracts,
      ),
    },
  };
};

type LoadDataOptions = {
  readOnly?: boolean;
};

const loadDataFromKv = async (
  kv: KVNamespace,
  options: LoadDataOptions = {},
): Promise<AppData> => {
  const raw = await kv.get("app-data.json");
  if (!raw) {
    const initial = defaultData();
    await kv.put("app-data.json", JSON.stringify(initial));
    return initial;
  }

  const merged = mergeAppData(JSON.parse(stripBom(raw)) as Partial<AppData>);
  if (!options.readOnly) {
    await kv.put("app-data.json", JSON.stringify(merged));
  }
  return merged;
};

const saveDataToKv = async (kv: KVNamespace, data: AppData) => {
  await kv.put("app-data.json", JSON.stringify(data));
};

type SupabaseAppDataConfig = {
  baseUrl: string;
  serviceRoleKey: string;
  table: string;
  rowId: string;
};

type SupabaseStorageConfig = {
  baseUrl: string;
  serviceRoleKey: string;
  bucket: string;
};

const SUPABASE_APP_DATA_BASE = Symbol("supabaseAppDataBase");
const SUPABASE_APP_DATA_UPDATED_AT = Symbol("supabaseAppDataUpdatedAt");

type SupabaseTrackedAppData = AppData & {
  [SUPABASE_APP_DATA_BASE]?: AppData;
  [SUPABASE_APP_DATA_UPDATED_AT]?: string;
};

type SupabaseAppDataRow = {
  data: AppData;
  updatedAt: string;
};

const decodeSupabaseJwtClaims = (jwt: string) => {
  const parts = jwt.split(".");
  if (parts.length < 2) return null;
  try {
    const payload = parts[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(parts[1].length / 4) * 4, "=");
    const json = JSON.parse(atob(payload)) as Record<string, unknown>;
    return json;
  } catch {
    return null;
  }
};

const logSupabaseConfigDebug = (env: Bindings) => {
  if (env.DEV_EXPOSE_CONFIRMATION_CODE !== "true") return;

  const url = env.SUPABASE_URL?.trim() ?? "";
  const anon = env.SUPABASE_ANON_KEY?.trim() ?? "";
  const service = env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";

  const anonClaims = anon ? decodeSupabaseJwtClaims(anon) : null;
  const serviceClaims = service ? decodeSupabaseJwtClaims(service) : null;

  console.log("Supabase config debug", {
    supabaseUrl: url || null,
    anonKey: anonClaims
      ? {
          ref: anonClaims.ref ?? null,
          role: anonClaims.role ?? null,
          iss: anonClaims.iss ?? null,
        }
      : anon
        ? { type: "non-jwt", length: anon.length }
        : null,
    serviceRoleKey: serviceClaims
      ? {
          ref: serviceClaims.ref ?? null,
          role: serviceClaims.role ?? null,
          iss: serviceClaims.iss ?? null,
        }
      : service
        ? { type: "non-jwt", length: service.length }
        : null,
  });
};

const getSupabaseAppDataConfig = (
  env: Bindings,
): SupabaseAppDataConfig | null => {
  const baseUrl = env.SUPABASE_URL?.trim().replace(/\/$/, "");
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!baseUrl || !serviceRoleKey) return null;

  logSupabaseConfigDebug(env);

  return {
    baseUrl,
    serviceRoleKey,
    table: env.SUPABASE_APP_DATA_TABLE?.trim() || "app_data",
    rowId: env.SUPABASE_APP_DATA_ID?.trim() || "default",
  };
};

const supabaseHeaders = (
  config: SupabaseAppDataConfig,
  extra?: HeadersInit,
): HeadersInit => ({
  apikey: config.serviceRoleKey,
  authorization: `Bearer ${config.serviceRoleKey}`,
  ...extra,
});

const supabaseStorageHeaders = (
  config: SupabaseStorageConfig,
  extra?: HeadersInit,
): HeadersInit => ({
  apikey: config.serviceRoleKey,
  authorization: `Bearer ${config.serviceRoleKey}`,
  ...extra,
});

const readSupabaseError = async (response: Response) => {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      return JSON.stringify(await response.json());
    } catch {
      return await response.text();
    }
  }
  return await response.text();
};

const cloneJson = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const deepEqual = (left: unknown, right: unknown) =>
  JSON.stringify(left) === JSON.stringify(right);

const attachSupabaseTracking = (
  data: AppData,
  base: AppData,
  updatedAt: string,
): AppData => {
  Object.defineProperty(data, SUPABASE_APP_DATA_BASE, {
    value: cloneJson(base),
    writable: true,
    configurable: true,
    enumerable: false,
  });
  Object.defineProperty(data, SUPABASE_APP_DATA_UPDATED_AT, {
    value: updatedAt,
    writable: true,
    configurable: true,
    enumerable: false,
  });
  return data;
};

const getSupabaseTrackedBase = (data: AppData) =>
  (data as SupabaseTrackedAppData)[SUPABASE_APP_DATA_BASE];

const getSupabaseTrackedUpdatedAt = (data: AppData) =>
  (data as SupabaseTrackedAppData)[SUPABASE_APP_DATA_UPDATED_AT];

const syncAppDataInPlace = (target: AppData, source: AppData) => {
  for (const key of Object.keys(target) as Array<keyof AppData>) {
    delete target[key];
  }
  Object.assign(target, cloneJson(source));
};

const mergeValueWithBase = (
  baseValue: unknown,
  localValue: unknown,
  remoteValue: unknown,
): unknown => {
  if (deepEqual(localValue, baseValue)) {
    return cloneJson(remoteValue);
  }

  if (deepEqual(remoteValue, baseValue)) {
    return cloneJson(localValue);
  }

  if (isPlainObject(baseValue) && isPlainObject(localValue) && isPlainObject(remoteValue)) {
    const merged: Record<string, unknown> = {};
    const keys = new Set([
      ...Object.keys(baseValue),
      ...Object.keys(localValue),
      ...Object.keys(remoteValue),
    ]);

    for (const key of keys) {
      merged[key] = mergeValueWithBase(
        baseValue[key],
        localValue[key],
        remoteValue[key],
      );
    }

    return merged;
  }

  return cloneJson(localValue);
};

const mergeCollectionWithBase = <T>(
  baseItems: T[],
  localItems: T[],
  remoteItems: T[],
  getKey: (item: T) => string,
): T[] => {
  const baseMap = new Map(baseItems.map((item) => [getKey(item), item] as const));
  const localMap = new Map(localItems.map((item) => [getKey(item), item] as const));
  const remoteMap = new Map(remoteItems.map((item) => [getKey(item), item] as const));
  const orderedKeys: string[] = [];
  const seen = new Set<string>();

  for (const key of [...localItems, ...remoteItems].map(getKey)) {
    if (seen.has(key)) continue;
    seen.add(key);
    orderedKeys.push(key);
  }

  const merged: T[] = [];

  for (const key of orderedKeys) {
    const baseItem = baseMap.get(key);
    const localItem = localMap.get(key);
    const remoteItem = remoteMap.get(key);

    if (!localItem) {
      if (!remoteItem) continue;
      if (!baseItem || !deepEqual(remoteItem, baseItem)) {
        merged.push(cloneJson(remoteItem));
      }
      continue;
    }

    if (!remoteItem) {
      merged.push(cloneJson(localItem));
      continue;
    }

    if (!baseItem) {
      merged.push(cloneJson(remoteItem));
      if (!deepEqual(localItem, remoteItem)) {
        merged[merged.length - 1] = cloneJson(
          mergeValueWithBase({}, localItem, remoteItem),
        ) as T;
      }
      continue;
    }

    merged.push(
      cloneJson(mergeValueWithBase(baseItem, localItem, remoteItem)) as T,
    );
  }

  return merged;
};

const mergeAppDataWithBase = (
  baseData: AppData,
  localData: AppData,
  remoteData: AppData,
): AppData =>
  mergeAppData({
    companyProfile: mergeValueWithBase(
      baseData.companyProfile,
      localData.companyProfile,
      remoteData.companyProfile,
    ) as CompanyProfileRecord,
    momPersonnel: mergeCollectionWithBase(
      baseData.momPersonnel,
      localData.momPersonnel,
      remoteData.momPersonnel,
      (item) => String(item.id),
    ),
    testimonials: mergeCollectionWithBase(
      baseData.testimonials,
      localData.testimonials,
      remoteData.testimonials,
      (item) => String(item.id),
    ),
    maids: mergeCollectionWithBase(
      baseData.maids,
      localData.maids,
      remoteData.maids,
      (item) => `${item.agencyId}:${item.referenceCode || item.id}`,
    ),
    enquiries: mergeCollectionWithBase(
      baseData.enquiries,
      localData.enquiries,
      remoteData.enquiries,
      (item) => String(item.id),
    ),
    clients: mergeCollectionWithBase(
      baseData.clients,
      localData.clients,
      remoteData.clients,
      (item) => String(item.id),
    ),
    clientSessions: mergeCollectionWithBase(
      baseData.clientSessions,
      localData.clientSessions,
      remoteData.clientSessions,
      (item) => item.token,
    ),
    agencyAdmins: mergeCollectionWithBase(
      baseData.agencyAdmins,
      localData.agencyAdmins,
      remoteData.agencyAdmins,
      (item) => String(item.id),
    ),
    agencyAdminSessions: mergeCollectionWithBase(
      baseData.agencyAdminSessions,
      localData.agencyAdminSessions,
      remoteData.agencyAdminSessions,
      (item) => item.token,
    ),
    directSales: mergeCollectionWithBase(
      baseData.directSales,
      localData.directSales,
      remoteData.directSales,
      (item) => String(item.id),
    ),
    chatMessages: mergeCollectionWithBase(
      baseData.chatMessages,
      localData.chatMessages,
      remoteData.chatMessages,
      (item) => String(item.id),
    ),
    employers: mergeCollectionWithBase(
      baseData.employers,
      localData.employers,
      remoteData.employers,
      (item) => `${item.id}:${item.refCode}`,
    ),
    employmentContracts: mergeCollectionWithBase(
      baseData.employmentContracts,
      localData.employmentContracts,
      remoteData.employmentContracts,
      (item) => `${item.id}:${item.refCode}:${item.employerRefCode}`,
    ),
    counters: {
      momPersonnel: Math.max(
        baseData.counters.momPersonnel,
        localData.counters.momPersonnel,
        remoteData.counters.momPersonnel,
      ),
      testimonials: Math.max(
        baseData.counters.testimonials,
        localData.counters.testimonials,
        remoteData.counters.testimonials,
      ),
      maids: Math.max(
        baseData.counters.maids,
        localData.counters.maids,
        remoteData.counters.maids,
      ),
      enquiries: Math.max(
        baseData.counters.enquiries,
        localData.counters.enquiries,
        remoteData.counters.enquiries,
      ),
      clients: Math.max(
        baseData.counters.clients,
        localData.counters.clients,
        remoteData.counters.clients,
      ),
      agencyAdmins: Math.max(
        baseData.counters.agencyAdmins,
        localData.counters.agencyAdmins,
        remoteData.counters.agencyAdmins,
      ),
      directSales: Math.max(
        baseData.counters.directSales,
        localData.counters.directSales,
        remoteData.counters.directSales,
      ),
      chatMessages: Math.max(
        baseData.counters.chatMessages,
        localData.counters.chatMessages,
        remoteData.counters.chatMessages,
      ),
      employers: Math.max(
        baseData.counters.employers,
        localData.counters.employers,
        remoteData.counters.employers,
      ),
      employmentContracts: Math.max(
        baseData.counters.employmentContracts,
        localData.counters.employmentContracts,
        remoteData.counters.employmentContracts,
      ),
    },
  });

const fetchSupabaseAppDataRow = async (
  config: SupabaseAppDataConfig,
): Promise<SupabaseAppDataRow | null> => {
  const table = encodeURIComponent(config.table);
  const rowId = encodeURIComponent(config.rowId);
  const url = `${config.baseUrl}/rest/v1/${table}?id=eq.${rowId}&select=data,updated_at&limit=1`;

  const response = await fetch(url, {
    method: "GET",
    headers: supabaseHeaders(config, { accept: "application/json" }),
  });

  if (!response.ok) {
    const details = await readSupabaseError(response);
    throw new Error(`Supabase read failed (${response.status}): ${details}`);
  }

  const rows = (await response.json()) as Array<{
    data?: Partial<AppData>;
    updated_at?: string;
  }>;
  const row = rows[0];

  if (!row?.data || !row.updated_at) {
    return null;
  }

  return {
    data: mergeAppData(row.data),
    updatedAt: row.updated_at,
  };
};

const loadDataFromSupabaseNormalized = async (
  config: SupabaseAppDataConfig,
): Promise<AppData> => {
  const payload = await callSupabaseRpc<Partial<AppData>>(
    config,
    "load_helped_app_data",
    { p_app_id: config.rowId },
  );
  return mergeAppData((payload ?? {}) as Partial<AppData>);
};

const saveDataToSupabaseNormalized = async (
  config: SupabaseAppDataConfig,
  data: AppData,
) => {
  await callSupabaseRpc(
    config,
    "save_helped_app_data",
    {
      p_app_id: config.rowId,
      p_payload: mergeAppData(cloneJson(data)),
    },
  );
};

const isNormalizedSupabaseEnabled = (
  envOrConfig: Bindings | SupabaseAppDataConfig,
) => {
  if ("SUPABASE_USE_NORMALIZED" in envOrConfig) {
    return envOrConfig.SUPABASE_USE_NORMALIZED?.trim().toLowerCase() === "true";
  }
  return false;
};

const buildSupabaseFilterQuery = (
  filters?: Record<string, string | number | boolean>,
) => {
  if (!filters) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    params.set(key, `eq.${String(value)}`);
  }
  const query = params.toString();
  return query ? `?${query}` : "";
};

const fetchSupabaseTableRows = async <T>(
  config: SupabaseAppDataConfig,
  tableName: string,
  {
    select = "*",
    filters,
    orderBy,
    limit,
  }: {
    select?: string;
    filters?: Record<string, string | number | boolean>;
    orderBy?: string;
    limit?: number;
  } = {},
): Promise<T[]> => {
  const table = encodeURIComponent(tableName);
  const params = new URLSearchParams();
  params.set("select", select);
  if (filters) {
    for (const [key, value] of Object.entries(filters)) {
      params.set(key, `eq.${String(value)}`);
    }
  }
  if (orderBy) {
    params.set("order", orderBy);
  }
  if (typeof limit === "number") {
    params.set("limit", String(limit));
  }
  const url = `${config.baseUrl}/rest/v1/${table}?${params.toString()}`;
  const response = await fetch(url, {
    method: "GET",
    headers: supabaseHeaders(config, { accept: "application/json" }),
  });

  if (!response.ok) {
    const details = await readSupabaseError(response);
    throw new Error(`Supabase table read failed for ${tableName} (${response.status}): ${details}`);
  }

  return (await response.json()) as T[];
};

const upsertSupabaseTableRows = async (
  config: SupabaseAppDataConfig,
  tableName: string,
  rows: unknown[],
  onConflict: string,
) => {
  const table = encodeURIComponent(tableName);
  const url = `${config.baseUrl}/rest/v1/${table}?on_conflict=${encodeURIComponent(onConflict)}`;
  const response = await fetch(url, {
    method: "POST",
    headers: supabaseHeaders(config, {
      "content-type": "application/json",
      prefer: "resolution=merge-duplicates,return=minimal",
    }),
    body: JSON.stringify(rows),
  });

  if (!response.ok) {
    const details = await readSupabaseError(response);
    throw new Error(`Supabase table write failed for ${tableName} (${response.status}): ${details}`);
  }
};

const deleteSupabaseTableRows = async (
  config: SupabaseAppDataConfig,
  tableName: string,
  filters: Record<string, string | number | boolean>,
) => {
  const table = encodeURIComponent(tableName);
  const query = buildSupabaseFilterQuery(filters);
  const url = `${config.baseUrl}/rest/v1/${table}${query}`;
  const response = await fetch(url, {
    method: "DELETE",
    headers: supabaseHeaders(config, {
      prefer: "return=minimal",
    }),
  });

  if (!response.ok) {
    const details = await readSupabaseError(response);
    throw new Error(`Supabase table delete failed for ${tableName} (${response.status}): ${details}`);
  }
};

const callSupabaseRpc = async <T>(
  config: SupabaseAppDataConfig,
  fnName: string,
  payload: Record<string, unknown>,
): Promise<T> => {
  const url = `${config.baseUrl}/rest/v1/rpc/${encodeURIComponent(fnName)}`;
  const response = await fetch(url, {
    method: "POST",
    headers: supabaseHeaders(config, {
      "content-type": "application/json",
      accept: "application/json",
    }),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const details = await readSupabaseError(response);
    throw new Error(`Supabase RPC failed for ${fnName} (${response.status}): ${details}`);
  }

  if (response.status === 204) {
    return null as T;
  }

  return (await response.json()) as T;
};

type SupabaseMaidRow = {
  record_id?: number;
  payload?: MaidRecord;
};

type SupabaseAppMaidViewRow = {
  raw_record?: MaidRecord;
};

const parseContentRangeTotal = (value: string | null) => {
  if (!value) return null;
  const total = value.split("/")[1];
  if (!total || total === "*") return null;
  const parsed = Number(total);
  return Number.isFinite(parsed) ? parsed : null;
};

const listMaidsFromSupabaseNormalized = async (
  config: SupabaseAppDataConfig,
  {
    search,
    visibility,
    agencyId,
    offset,
    limit,
  }: {
    search?: string;
    visibility?: string;
    agencyId?: number;
    offset: number;
    limit?: number;
  },
) => {
  const table = encodeURIComponent("helped_maids");
  const params = new URLSearchParams();
  params.set("select", "record_id,payload");
  params.set("app_id", `eq.${config.rowId}`);
  params.set("order", "updated_at.desc.nullslast,record_id.desc");

  if (visibility === "public" || visibility === "hidden") {
    params.set("is_public", `eq.${visibility === "public"}`);
  }
  if (typeof agencyId === "number") {
    params.set("agency_id", `eq.${agencyId}`);
  }
  if (search?.trim()) {
    const term = search.trim().replace(/[%*,()]/g, " ");
    params.set("or", `(full_name.ilike.*${term}*,reference_code.ilike.*${term}*)`);
  }

  const headers = new Headers(supabaseHeaders(config, {
    accept: "application/json",
    prefer: "count=exact",
  }));
  if (typeof limit === "number" && limit > 0) {
    headers.set("range-unit", "items");
    headers.set("range", `${offset}-${offset + limit - 1}`);
  }

  const response = await fetch(
    `${config.baseUrl}/rest/v1/${table}?${params.toString()}`,
    { method: "GET", headers },
  );

  if (!response.ok && response.status !== 206) {
    const details = await readSupabaseError(response);
    throw new Error(`Supabase maid list failed (${response.status}): ${details}`);
  }

  const rows = (await response.json()) as SupabaseMaidRow[];
  const total = parseContentRangeTotal(response.headers.get("content-range")) ?? rows.length;
  return {
    maids: rows
      .map((row) => row.payload)
      .filter((maid): maid is MaidRecord => Boolean(maid))
      .map(normalizeMaid),
    total,
  };
};

const listMaidsFromSupabaseAppView = async (
  config: SupabaseAppDataConfig,
  {
    search,
    visibility,
    agencyId,
    offset,
    limit,
  }: {
    search?: string;
    visibility?: string;
    agencyId?: number;
    offset: number;
    limit?: number;
  },
) => {
  const table = encodeURIComponent("app_maids");
  const params = new URLSearchParams();
  params.set("select", "raw_record");
  params.set("order", "updated_at.desc.nullslast,view_row_id.desc");

  if (visibility === "public" || visibility === "hidden") {
    params.set("is_public", `eq.${visibility === "public"}`);
  }
  if (typeof agencyId === "number") {
    params.set("agency_id", `eq.${agencyId}`);
  }
  if (search?.trim()) {
    const term = search.trim().replace(/[%*,()]/g, " ");
    params.set("or", `(full_name.ilike.*${term}*,reference_code.ilike.*${term}*)`);
  }

  const headers = new Headers(supabaseHeaders(config, {
    accept: "application/json",
    prefer: "count=exact",
  }));
  if (typeof limit === "number" && limit > 0) {
    headers.set("range-unit", "items");
    headers.set("range", `${offset}-${offset + limit - 1}`);
  }

  const response = await fetch(
    `${config.baseUrl}/rest/v1/${table}?${params.toString()}`,
    { method: "GET", headers },
  );

  if (!response.ok && response.status !== 206) {
    const details = await readSupabaseError(response);
    throw new Error(`Supabase maid view list failed (${response.status}): ${details}`);
  }

  const rows = (await response.json()) as SupabaseAppMaidViewRow[];
  const total = parseContentRangeTotal(response.headers.get("content-range")) ?? rows.length;
  return {
    maids: rows
      .map((row) => row.raw_record)
      .filter((maid): maid is MaidRecord => Boolean(maid))
      .map(normalizeMaid),
    total,
  };
};

const getMaidFromSupabaseNormalized = async (
  config: SupabaseAppDataConfig,
  referenceCode: string,
) => {
  const rows = await fetchSupabaseTableRows<SupabaseMaidRow>(
    config,
    "helped_maids",
    {
      select: "record_id,payload",
      filters: {
        app_id: config.rowId,
        reference_code: normalizeReferenceCode(referenceCode),
      },
      limit: 1,
    },
  );
  return rows[0]?.payload ? normalizeMaid(rows[0].payload) : null;
};

const getMaidFromSupabaseAppView = async (
  config: SupabaseAppDataConfig,
  referenceCode: string,
) => {
  const rows = await fetchSupabaseTableRows<SupabaseAppMaidViewRow>(
    config,
    "app_maids",
    {
      select: "raw_record",
      filters: {
        reference_code: normalizeReferenceCode(referenceCode),
      },
      limit: 1,
    },
  );
  return rows[0]?.raw_record ? normalizeMaid(rows[0].raw_record) : null;
};

const updateMaidVisibilityInSupabaseNormalized = async (
  config: SupabaseAppDataConfig,
  referenceCode: string,
  isPublic: boolean,
) => {
  const existing = await getMaidFromSupabaseNormalized(config, referenceCode);
  if (!existing) return null;

  const updatedAt = now();
  const payload: MaidRecord = {
    ...existing,
    isPublic,
    updatedAt,
  };
  const table = encodeURIComponent("helped_maids");
  const params = new URLSearchParams();
  params.set("app_id", `eq.${config.rowId}`);
  params.set("reference_code", `eq.${normalizeReferenceCode(referenceCode)}`);
  params.set("select", "payload");

  const response = await fetch(
    `${config.baseUrl}/rest/v1/${table}?${params.toString()}`,
    {
      method: "PATCH",
      headers: supabaseHeaders(config, {
        "content-type": "application/json",
        prefer: "return=representation",
      }),
      body: JSON.stringify({
        is_public: isPublic,
        updated_at: updatedAt,
        payload,
      }),
    },
  );

  if (!response.ok) {
    const details = await readSupabaseError(response);
    throw new Error(`Supabase maid visibility update failed (${response.status}): ${details}`);
  }

  const rows = (await response.json()) as SupabaseMaidRow[];
  return rows[0]?.payload ? normalizeMaid(rows[0].payload) : payload;
};

const updateMaidVisibilityInSupabaseAppData = async (
  config: SupabaseAppDataConfig,
  referenceCode: string,
  isPublic: boolean,
) => {
  const payload = await callSupabaseRpc<MaidRecord | null>(
    config,
    "update_app_maid_visibility",
    {
      p_app_id: config.rowId,
      p_reference_code: normalizeReferenceCode(referenceCode),
      p_is_public: isPublic,
    },
  );
  return payload ? normalizeMaid(payload) : null;
};

const createMaidInSupabaseAppData = async (
  config: SupabaseAppDataConfig,
  payload: Omit<MaidRecord, "id" | "createdAt" | "updatedAt">,
) => {
  const maid = await callSupabaseRpc<MaidRecord>(
    config,
    "create_app_maid",
    {
      p_app_id: config.rowId,
      p_payload: payload,
    },
  );
  return normalizeMaid(maid);
};

const updateMaidInSupabaseAppData = async (
  config: SupabaseAppDataConfig,
  referenceCode: string,
  payload: Omit<MaidRecord, "id" | "createdAt" | "updatedAt">,
) => {
  const maid = await callSupabaseRpc<MaidRecord | null>(
    config,
    "update_app_maid",
    {
      p_app_id: config.rowId,
      p_reference_code: normalizeReferenceCode(referenceCode),
      p_payload: payload,
    },
  );
  return maid ? normalizeMaid(maid) : null;
};

const getNextNormalizedMaidRecordId = async (config: SupabaseAppDataConfig) => {
  const rows = await fetchSupabaseTableRows<{ record_id?: number }>(
    config,
    "helped_maids",
    {
      select: "record_id",
      filters: { app_id: config.rowId },
      orderBy: "record_id.desc",
      limit: 1,
    },
  );
  return Number(rows[0]?.record_id ?? 0) + 1;
};

const upsertMaidInSupabaseNormalized = async (
  config: SupabaseAppDataConfig,
  payload: Omit<MaidRecord, "id" | "createdAt" | "updatedAt">,
  options: { create: boolean; referenceCode?: string },
) => {
  const referenceCode = normalizeReferenceCode(options.referenceCode ?? payload.referenceCode);
  const existing = options.create ? null : await getMaidFromSupabaseNormalized(config, referenceCode);
  if (!options.create && !existing) return null;

  if (options.create) {
    const duplicate = await getMaidFromSupabaseNormalized(config, payload.referenceCode);
    if (duplicate) throw new Error("REFERENCE_CODE_EXISTS");
  } else if (normalizeReferenceCode(payload.referenceCode) !== referenceCode) {
    const duplicate = await getMaidFromSupabaseNormalized(config, payload.referenceCode);
    if (duplicate) throw new Error("REFERENCE_CODE_EXISTS");
  }

  const timestamp = now();
  const maid: MaidRecord = {
    ...payload,
    id: existing?.id ?? (await getNextNormalizedMaidRecordId(config)),
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };
  const table = encodeURIComponent("helped_maids");
  const response = await fetch(
    `${config.baseUrl}/rest/v1/${table}?on_conflict=app_id,record_id&select=payload`,
    {
      method: "POST",
      headers: supabaseHeaders(config, {
        "content-type": "application/json",
        prefer: "resolution=merge-duplicates,return=representation",
      }),
      body: JSON.stringify([{
        app_id: config.rowId,
        record_id: maid.id,
        agency_id: maid.agencyId,
        reference_code: maid.referenceCode,
        full_name: maid.fullName,
        status: maid.status,
        nationality: maid.nationality,
        maid_type: maid.type,
        is_public: maid.isPublic,
        has_photo: maid.hasPhoto,
        created_at: maid.createdAt,
        updated_at: maid.updatedAt,
        payload: maid,
      }]),
    },
  );

  if (!response.ok) {
    const details = await readSupabaseError(response);
    if (details.includes("duplicate") || details.includes("helped_maids_reference_code_idx")) {
      throw new Error("REFERENCE_CODE_EXISTS");
    }
    throw new Error(`Supabase maid write failed (${response.status}): ${details}`);
  }

  const rows = (await response.json()) as SupabaseMaidRow[];
  return rows[0]?.payload ? normalizeMaid(rows[0].payload) : maid;
};

const getSupabaseStorageConfig = (
  env: Bindings,
): SupabaseStorageConfig | null => {
  const baseUrl = env.SUPABASE_URL?.trim().replace(/\/$/, "");
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!baseUrl || !serviceRoleKey) return null;

  return {
    baseUrl,
    serviceRoleKey,
    bucket: env.SUPABASE_STORAGE_BUCKET?.trim() || "ats-applications",
  };
};

const ensureSupabaseAppDataRow = async (config: SupabaseAppDataConfig) => {
  const table = encodeURIComponent(config.table);
  const url = `${config.baseUrl}/rest/v1/${table}?on_conflict=id`;
  const initial = defaultData();

  const response = await fetch(url, {
    method: "POST",
    headers: supabaseHeaders(config, {
      "content-type": "application/json",
      prefer: "resolution=ignore-duplicates,return=minimal",
    }),
    body: JSON.stringify([
      {
        id: config.rowId,
        data: initial,
      },
    ]),
  });

  if (!response.ok) {
    const details = await readSupabaseError(response);
    throw new Error(`Supabase row bootstrap failed (${response.status}): ${details}`);
  }
};

const loadDataFromSupabase = async (
  config: SupabaseAppDataConfig,
  options: LoadDataOptions = {},
): Promise<AppData> => {
  let row = await fetchSupabaseAppDataRow(config);

  if (!row) {
    await ensureSupabaseAppDataRow(config);
    row = await fetchSupabaseAppDataRow(config);
  }

  if (!row) {
    throw new Error("Supabase app_data row is missing after bootstrap");
  }

  if (options.readOnly) {
    return row.data;
  }

  return attachSupabaseTracking(row.data, row.data, row.updatedAt);
};

const saveDataToSupabase = async (
  config: SupabaseAppDataConfig,
  data: AppData,
) => {
  const table = encodeURIComponent(config.table);
  const retryDelaysMs = [100, 300, 700, 1400];
  let candidate = mergeAppData(cloneJson(data));
  let baseData = getSupabaseTrackedBase(data);
  let baseUpdatedAt = getSupabaseTrackedUpdatedAt(data);

  for (let attempt = 0; attempt <= retryDelaysMs.length; attempt += 1) {
    if (!baseUpdatedAt) {
      const latest = await loadDataFromSupabase(config);
      baseData = getSupabaseTrackedBase(latest) ?? cloneJson(latest);
      baseUpdatedAt = getSupabaseTrackedUpdatedAt(latest);
      candidate = mergeAppDataWithBase(
        baseData,
        candidate,
        latest,
      );
    }

    if (!baseUpdatedAt) {
      throw new Error("Supabase app_data row is missing an updated_at version");
    }

    const updatedAtFilter = encodeURIComponent(baseUpdatedAt);
    const url = `${config.baseUrl}/rest/v1/${table}?id=eq.${encodeURIComponent(config.rowId)}&updated_at=eq.${updatedAtFilter}&select=updated_at`;
    const response = await fetch(url, {
      method: "PATCH",
      headers: supabaseHeaders(config, {
        "content-type": "application/json",
        prefer: "return=representation",
      }),
      body: JSON.stringify({
        data: candidate,
      }),
    });

    if (response.ok) {
      const rows = (await response.json()) as Array<{ updated_at?: string }>;
      const savedUpdatedAt = rows[0]?.updated_at;

      if (savedUpdatedAt) {
        syncAppDataInPlace(data, candidate);
        attachSupabaseTracking(data, candidate, savedUpdatedAt);
        return;
      }
    } else {
      const details = await readSupabaseError(response);
      const isRetryableTimeout =
        response.status >= 500 &&
        (details.includes('"code":"57014"') ||
          details.toLowerCase().includes("statement timeout") ||
          details.toLowerCase().includes("canceling statement"));

      if (!isRetryableTimeout || attempt === retryDelaysMs.length) {
        throw new Error(`Supabase write failed (${response.status}): ${details}`);
      }

      await sleep(retryDelaysMs[attempt]);
      continue;
    }

    const latest = await fetchSupabaseAppDataRow(config);

    if (!latest) {
      await ensureSupabaseAppDataRow(config);
      baseData = undefined;
      baseUpdatedAt = undefined;
    } else {
      const resolvedBase = baseData ?? latest.data;
      candidate = mergeAppDataWithBase(resolvedBase, candidate, latest.data);
      baseData = latest.data;
      baseUpdatedAt = latest.updatedAt;
    }

    if (attempt === retryDelaysMs.length) {
      throw new Error(
        "Supabase write conflict: failed to merge concurrent updates after retries",
      );
    }

    if (retryDelaysMs[attempt] > 0) {
      await sleep(retryDelaysMs[attempt]);
    }
  }

  throw new Error("Supabase write failed unexpectedly");
};

const loadData = async (
  env: Bindings,
  options: LoadDataOptions = {},
): Promise<AppData> => {
  const supabase = getSupabaseAppDataConfig(env);
  if (supabase) {
    if (isNormalizedSupabaseEnabled(env)) {
      return await loadDataFromSupabaseNormalized(supabase);
    }
    return await loadDataFromSupabase(supabase, options);
  }

  if (!env.APP_DATA) {
    throw new Error(
      "No storage configured: set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY, or bind APP_DATA KV.",
    );
  }

  return await loadDataFromKv(env.APP_DATA, options);
};

const saveData = async (env: Bindings, data: AppData) => {
  const supabase = getSupabaseAppDataConfig(env);
  if (supabase) {
    if (isNormalizedSupabaseEnabled(env)) {
      await saveDataToSupabaseNormalized(supabase, data);
      return;
    }
    await saveDataToSupabase(supabase, data);
    return;
  }

  if (!env.APP_DATA) {
    throw new Error(
      "No storage configured: set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY, or bind APP_DATA KV.",
    );
  }

  await saveDataToKv(env.APP_DATA, data);
};

const mergeAgencyAdminSessions = (sessions: AgencyAdminSessionRecord[]) => {
  const seen = new Set<string>();
  return sessions
    .filter((session) => {
      if (!session?.token || seen.has(session.token)) {
        return false;
      }
      seen.add(session.token);
      return true;
    })
    .map((session) => ({
      ...session,
      admin: session.admin
        ? {
            ...session.admin,
            agencyId: Number.isInteger(Number(session.admin.agencyId))
              ? Number(session.admin.agencyId)
              : 1,
          }
        : undefined,
    }));
};

const getAgencyAdminSessionStoreRowId = (config: SupabaseAppDataConfig) =>
  `${config.rowId}:agency-admin-sessions`;

const getAgencyAdminAuthStoreRowId = (config: SupabaseAppDataConfig) =>
  `${config.rowId}:agency-admin-auth`;

const loadAgencyAdminSessionsFromSupabaseNormalized = async (
  config: SupabaseAppDataConfig,
) => {
  const rows = await fetchSupabaseTableRows<{
    payload?: AgencyAdminSessionRecord;
  }>(config, "helped_agency_admin_sessions", {
    select: "payload",
    filters: { app_id: config.rowId },
    orderBy: "created_at.desc",
  });
  return mergeAgencyAdminSessions(
    rows
      .map((row) => row.payload)
      .filter((session): session is AgencyAdminSessionRecord => Boolean(session)),
  );
};

const loadAgencyAdminAuthFromSupabaseNormalized = async (
  config: SupabaseAppDataConfig,
) => {
  const rows = await fetchSupabaseTableRows<{
    payload?: AgencyAdminRecord;
  }>(config, "helped_agency_admins", {
    select: "payload",
    filters: { app_id: config.rowId },
    orderBy: "record_id.asc",
  });
  return rows
    .map((row) => row.payload)
    .filter((admin): admin is AgencyAdminRecord => Boolean(admin))
    .map((admin) => ({
      ...admin,
      agencyId: Number.isInteger(Number(admin.agencyId))
        ? Number(admin.agencyId)
        : 1,
    }));
};

const saveAgencyAdminSessionsToSupabaseNormalized = async (
  config: SupabaseAppDataConfig,
  sessions: AgencyAdminSessionRecord[],
) => {
  await deleteSupabaseTableRows(config, "helped_agency_admin_sessions", {
    app_id: config.rowId,
  });

  const normalizedSessions = mergeAgencyAdminSessions(sessions);
  if (normalizedSessions.length === 0) {
    return;
  }

  await upsertSupabaseTableRows(
    config,
    "helped_agency_admin_sessions",
    normalizedSessions.map((session) => ({
      app_id: config.rowId,
      token: session.token,
      admin_id: session.adminId,
      created_at: session.createdAt,
      payload: session,
    })),
    "app_id,token",
  );
};

const saveAgencyAdminAuthToSupabaseNormalized = async (
  config: SupabaseAppDataConfig,
  agencyAdmins: AgencyAdminRecord[],
) => {
  await deleteSupabaseTableRows(config, "helped_agency_admins", {
    app_id: config.rowId,
  });

  if (agencyAdmins.length === 0) {
    return;
  }

  await upsertSupabaseTableRows(
    config,
    "helped_agency_admins",
    agencyAdmins.map((admin) => ({
      app_id: config.rowId,
      record_id: admin.id,
      agency_id: admin.agencyId,
      username: admin.username,
      email: admin.email ?? null,
      supabase_user_id: admin.supabaseUserId ?? null,
      agency_name: admin.agencyName,
      created_at: admin.createdAt,
      payload: admin,
    })),
    "app_id,record_id",
  );
};

const loadAgencyAdminSessionsFromSupabase = async (
  config: SupabaseAppDataConfig,
) => {
  const table = encodeURIComponent(config.table);
  const rowId = encodeURIComponent(getAgencyAdminSessionStoreRowId(config));
  const url = `${config.baseUrl}/rest/v1/${table}?id=eq.${rowId}&select=data&limit=1`;

  const response = await fetch(url, {
    method: "GET",
    headers: supabaseHeaders(config, { accept: "application/json" }),
  });

  if (!response.ok) {
    const details = await readSupabaseError(response);
    throw new Error(
      `Supabase session read failed (${response.status}): ${details}`,
    );
  }

  const rows = (await response.json()) as Array<{
    data?: AgencyAdminSessionStoreRecord;
  }>;
  return mergeAgencyAdminSessions(rows[0]?.data?.agencyAdminSessions ?? []);
};

const loadAgencyAdminAuthFromSupabase = async (
  config: SupabaseAppDataConfig,
) => {
  const table = encodeURIComponent(config.table);
  const rowId = encodeURIComponent(getAgencyAdminAuthStoreRowId(config));
  const url = `${config.baseUrl}/rest/v1/${table}?id=eq.${rowId}&select=data&limit=1`;

  const response = await fetch(url, {
    method: "GET",
    headers: supabaseHeaders(config, { accept: "application/json" }),
  });

  if (!response.ok) {
    const details = await readSupabaseError(response);
    throw new Error(
      `Supabase auth read failed (${response.status}): ${details}`,
    );
  }

  const rows = (await response.json()) as Array<{
    data?: AgencyAdminAuthStoreRecord;
  }>;
  return (rows[0]?.data?.agencyAdmins ?? []).map((admin) => ({
    ...admin,
    agencyId: Number.isInteger(Number(admin.agencyId))
      ? Number(admin.agencyId)
      : 1,
  }));
};

const saveAgencyAdminSessionsToSupabase = async (
  config: SupabaseAppDataConfig,
  sessions: AgencyAdminSessionRecord[],
) => {
  const table = encodeURIComponent(config.table);
  const url = `${config.baseUrl}/rest/v1/${table}?on_conflict=id`;
  const payload = [
    {
      id: getAgencyAdminSessionStoreRowId(config),
      data: { agencyAdminSessions: mergeAgencyAdminSessions(sessions) },
      updated_at: now(),
    },
  ];

  const response = await fetch(url, {
    method: "POST",
    headers: supabaseHeaders(config, {
      "content-type": "application/json",
      prefer: "resolution=merge-duplicates,return=minimal",
    }),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const details = await readSupabaseError(response);
    throw new Error(
      `Supabase session write failed (${response.status}): ${details}`,
    );
  }
};

const saveAgencyAdminAuthToSupabase = async (
  config: SupabaseAppDataConfig,
  agencyAdmins: AgencyAdminRecord[],
) => {
  const table = encodeURIComponent(config.table);
  const url = `${config.baseUrl}/rest/v1/${table}?on_conflict=id`;
  const payload = [
    {
      id: getAgencyAdminAuthStoreRowId(config),
      data: { agencyAdmins },
      updated_at: now(),
    },
  ];

  const response = await fetch(url, {
    method: "POST",
    headers: supabaseHeaders(config, {
      "content-type": "application/json",
      prefer: "resolution=merge-duplicates,return=minimal",
    }),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const details = await readSupabaseError(response);
    throw new Error(
      `Supabase auth write failed (${response.status}): ${details}`,
    );
  }
};

const loadAgencyAdminAuthData = async (env: Bindings) => {
  const supabase = getSupabaseAppDataConfig(env);
  if (supabase) {
    if (isNormalizedSupabaseEnabled(env)) {
      return await loadAgencyAdminAuthFromSupabaseNormalized(supabase);
    }

    const cached = loadAgencyAdminAuthFromSupabase(supabase);
    const timeout = sleep(1500).then(() => null as AgencyAdminRecord[] | null);
    const cachedAdmins = await Promise.race([cached, timeout]);
    if (cachedAdmins && cachedAdmins.length > 0) {
      return cachedAdmins;
    }

    const data = await loadData(env);
    void saveAgencyAdminAuthToSupabase(supabase, data.agencyAdmins).catch(
      (error) => {
        console.error("Failed to refresh agency admin auth cache:", error);
      },
    );
    return data.agencyAdmins;
  }

  const data = await loadData(env);
  return data.agencyAdmins;
};

const loadAgencyAdminSessions = async (
  env: Bindings,
  fallbackData?: AppData,
) => {
  const supabase = getSupabaseAppDataConfig(env);
  if (supabase) {
    if (isNormalizedSupabaseEnabled(env)) {
      return await loadAgencyAdminSessionsFromSupabaseNormalized(supabase);
    }
    const sessions = await loadAgencyAdminSessionsFromSupabase(supabase);
    if (sessions.length > 0) {
      return sessions;
    }
    return mergeAgencyAdminSessions(fallbackData?.agencyAdminSessions ?? []);
  }

  if (!env.APP_DATA) {
    throw new Error(
      "No storage configured: set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY, or bind APP_DATA KV.",
    );
  }

  const data = fallbackData ?? (await loadData(env));
  return mergeAgencyAdminSessions(data.agencyAdminSessions);
};

const saveAgencyAdminSessions = async (
  env: Bindings,
  sessions: AgencyAdminSessionRecord[],
) => {
  const supabase = getSupabaseAppDataConfig(env);
  if (supabase) {
    if (isNormalizedSupabaseEnabled(env)) {
      await saveAgencyAdminSessionsToSupabaseNormalized(supabase, sessions);
      return;
    }
    await saveAgencyAdminSessionsToSupabase(supabase, sessions);
    return;
  }

  const latest = await loadData(env);
  latest.agencyAdminSessions = mergeAgencyAdminSessions(sessions);
  await saveData(env, latest);
};

const createAgencyAdminSession = async (
  env: Bindings,
  admin: AgencyAdminRecord,
) => {
  const session: AgencyAdminSessionRecord = {
    token: crypto.randomUUID(),
    adminId: admin.id,
    admin: toSafeAgencyAdmin(admin),
    createdAt: now(),
  };

  const existing = await loadAgencyAdminSessions(env);
  await saveAgencyAdminSessions(env, [session, ...existing]);
  return session;
};

const saveAgencyAdminChangesWithSession = async (
  env: Bindings,
  data: AppData,
  session: AgencyAdminSessionRecord,
) => {
  const supabase = getSupabaseAppDataConfig(env);
  const latest = await loadData(env);
  latest.agencyAdmins = data.agencyAdmins;
  latest.counters = data.counters;
  await saveData(env, latest);
  if (supabase) {
    if (isNormalizedSupabaseEnabled(env)) {
      void saveAgencyAdminAuthToSupabaseNormalized(supabase, latest.agencyAdmins).catch(
        (error) => {
          console.error("Failed to refresh normalized agency admin cache:", error);
        },
      );
    } else {
      void saveAgencyAdminAuthToSupabase(supabase, latest.agencyAdmins).catch(
        (error) => {
          console.error("Failed to refresh agency admin auth cache:", error);
        },
      );
    }
  }
  const existingSessions = await loadAgencyAdminSessions(env, latest);
  await saveAgencyAdminSessions(env, [session, ...existingSessions]);
};

const deleteAgencyAdminSession = async (env: Bindings, token: string) => {
  const existing = await loadAgencyAdminSessions(env);
  await saveAgencyAdminSessions(
    env,
    existing.filter((item) => item.token !== token),
  );
};

const jsonError = (message: string, status = 400) =>
  new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

const requireSupabaseConfig = (env: Bindings) => {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    return jsonError("Missing Supabase config", 500);
  }
  return null;
};

const safeApi =
  (handler: (c: any) => Promise<Response> | Response) => async (c: any) => {
    try {
      return await handler(c);
    } catch (error) {
      console.error("API handler error", c.req.method, c.req.path, error);
      const message =
        error instanceof Error ? error.message : "Internal Server Error";
      return jsonError(message, 500);
    }
  };

app.onError((error, c) => {
  console.error("Unhandled API error", c.req.method, c.req.path, error);
  const message =
    error instanceof Error ? error.message : "Internal Server Error";
  return jsonError(message, 500);
});

const parseAuthorizationToken = (request: Request) => {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice(7).trim() || null;
};

const requireClientAuth = async (c: any, next: () => Promise<void>) => {
  console.log("requireClientAuth: storage mode", getStorageMode(c.env));

  const token = parseAuthorizationToken(c.req.raw);
  if (!token) {
    console.log("requireClientAuth: no token");
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const data = await loadData(c.env);
    console.log("requireClientAuth: data loaded");
    const session = data.clientSessions.find((item) => item.token === token);
    if (session) {
      const client = data.clients.find((item) => item.id === session.clientId);
      if (!client) {
        console.log("requireClientAuth: session client not found");
        return c.json({ error: "Unauthorized" }, 401);
      }
      c.set("client", client);
      await next();
      return;
    }

    // Supabase Auth JWT support (Google/Facebook/Phone).
    console.log("requireClientAuth: trying Supabase");
    const supabaseUser = await getSupabaseAuthUser(c.env, token);
    if (!supabaseUser) {
      console.log("requireClientAuth: Supabase auth failed");
      return c.json({ error: "Unauthorized" }, 401);
    }

    const normalizedEmail = supabaseUser.email
      ? normalizeEmail(supabaseUser.email)
      : "";
    const client =
      data.clients.find(
        (item) =>
          item.supabaseUserId && item.supabaseUserId === supabaseUser.id,
      ) ??
      (normalizedEmail
        ? data.clients.find(
            (item) => normalizeEmail(item.email) === normalizedEmail,
          )
        : null) ??
      (supabaseUser.phone
        ? data.clients.find(
            (item) => (item.phone ?? "").trim() === supabaseUser.phone!.trim(),
          )
        : null);

    if (client) {
      if (!client.supabaseUserId) {
        client.supabaseUserId = supabaseUser.id;
        await saveData(c.env, data);
      }
      c.set("client", client);
      await next();
      return;
    }

    // First-time Supabase login: create an app client record.
    console.log("requireClientAuth: creating new client");
    const nameFromMeta =
      (supabaseUser.user_metadata?.full_name as string | undefined) ??
      (supabaseUser.user_metadata?.name as string | undefined) ??
      "";
    const created: ClientRecord = {
      id: data.counters.clients++,
      supabaseUserId: supabaseUser.id,
      name:
        nameFromMeta ||
        (supabaseUser.email ? supabaseUser.email.split("@")[0] : "Client"),
      company: "",
      phone: supabaseUser.phone ?? "",
      email: supabaseUser.email ?? "",
      password: "",
      profileImageUrl: "",
      createdAt: now(),
      emailVerified: true,
    };

    data.clients.unshift(created);
    await saveData(c.env, data);
    c.set("client", created);
    await next();
  } catch (error) {
    console.error("requireClientAuth error:", error);
    return c.json({ error: "Unauthorized" }, 401);
  }
};

const requireAgencyAdminAuth = async (c: any, next: () => Promise<void>) => {
  const token = parseAuthorizationToken(c.req.raw);
  if (!token) {
    console.log("requireAgencyAdminAuth: no token");
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const sessions = await loadAgencyAdminSessions(c.env);
    const session = sessions.find((item) => item.token === token);
    if (session) {
      const admin = session.admin
        ? {
            id: session.admin.id,
            agencyId: session.admin.agencyId,
            username: session.admin.username,
            email: session.admin.email ?? "",
            password: "",
            agencyName: session.admin.agencyName,
            emailVerified: session.admin.emailVerified,
            profileImageUrl: session.admin.profileImageUrl ?? "",
            createdAt: session.admin.createdAt,
          }
        : null;
      if (admin) {
        c.set("agencyAdmin", admin);
        await next();
        return;
      }

      const agencyAdmins = await loadAgencyAdminAuthData(c.env);
      const matchedAdmin = agencyAdmins.find(
        (item) => item.id === session.adminId,
      );
      if (!matchedAdmin) {
        console.log("requireAgencyAdminAuth: session admin not found");
        return c.json({ error: "Unauthorized" }, 401);
      }
      c.set("agencyAdmin", matchedAdmin);
      await next();
      return;
    }

    // Supabase Auth JWT support (optional).
    // Security: we only allow JWT auth for agency admins that already exist in app data.
    console.log("requireAgencyAdminAuth: trying Supabase");
    const supabaseUser = await getSupabaseAuthUser(c.env, token);
    if (!supabaseUser) {
      console.log("requireAgencyAdminAuth: Supabase auth failed");
      return c.json({ error: "Unauthorized" }, 401);
    }

    const data = await loadData(c.env);
    const normalizedEmail = supabaseUser.email
      ? normalizeEmail(supabaseUser.email)
      : "";
    const admin =
      data.agencyAdmins.find(
        (item) =>
          item.supabaseUserId && item.supabaseUserId === supabaseUser.id,
      ) ??
      (normalizedEmail
        ? data.agencyAdmins.find(
            (item) => normalizeEmail(item.email ?? "") === normalizedEmail,
          )
        : null);

    if (!admin) {
      console.log("requireAgencyAdminAuth: admin not found");
      return c.json({ error: "Unauthorized" }, 401);
    }

    if (!admin.supabaseUserId) {
      admin.supabaseUserId = supabaseUser.id;
      await saveData(c.env, data);
    }

    c.set("agencyAdmin", admin);
    await next();
  } catch (error) {
    console.error("requireAgencyAdminAuth error:", error);
    return c.json({ error: "Unauthorized" }, 401);
  }
};

const toSafeClient = (client: ClientRecord) => ({
  id: client.id,
  name: client.name,
  company: client.company ?? "",
  phone: client.phone ?? "",
  email: client.email,
  emailVerified: Boolean(client.emailVerified),
  profileImageUrl: client.profileImageUrl ?? "",
  createdAt: client.createdAt,
});

const toSafeAgencyAdmin = (admin: AgencyAdminRecord) => ({
  id: admin.id,
  agencyId: admin.agencyId,
  username: admin.username,
  email: admin.email ?? "",
  emailVerified: Boolean(admin.emailVerified),
  agencyName: admin.agencyName,
  profileImageUrl: admin.profileImageUrl ?? "",
  createdAt: admin.createdAt,
});

const parseBody = async <T>(request: Request): Promise<T | null> => {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
};

const atsStageOrder: RecruitmentStage[] = [
  "New Applicant",
  "Documents Submitted",
  "Resume Parsed",
  "Screening Interview",
  "Background Check",
  "Approved",
  "Ready For Client Matching",
  "Placed",
  "Rejected",
];

const publicAtsFileKinds: Array<[string, AtsDocumentKind]> = [
  ["resume", "resume"],
  ["passport", "passport"],
  ["workPermit", "work_permit"],
  ["medical", "medical"],
  ["introVideo", "video"],
  ["references", "reference"],
  ["otherDocuments", "other"],
  ["certificates", "certificate"],
];

const listFromDelimitedString = (value: unknown) =>
  Array.from(
    new Set(
      String(value ?? "")
        .split(/\r?\n|,/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );

const toNumericValue = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toOptionalNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toBooleanFlag = (value: unknown) =>
  ["true", "1", "yes", "on"].includes(
    String(value ?? "")
      .trim()
      .toLowerCase(),
  );

const calculateAgeFromDate = (dateOfBirth?: string) => {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < dob.getDate())
  ) {
    age -= 1;
  }
  return age;
};

const randomId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

const buildApplicationCode = () =>
  `APP-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
};

const fileToDataUrl = async (file: File) => {
  const buffer = await file.arrayBuffer();
  return `data:${file.type || "application/octet-stream"};base64,${arrayBufferToBase64(buffer)}`;
};

const sanitizeStoragePathSegment = (value: string, fallback: string) => {
  const normalized = value
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return normalized || fallback;
};

const ensureSupabaseStorageBucket = async (config: SupabaseStorageConfig) => {
  const response = await fetch(`${config.baseUrl}/storage/v1/bucket`, {
    method: "POST",
    headers: supabaseStorageHeaders(config, {
      "content-type": "application/json",
    }),
    body: JSON.stringify({
      id: config.bucket,
      name: config.bucket,
      public: true,
      file_size_limit: "52428800",
    }),
  });

  if (response.ok || response.status === 409) return;

  const message = await readSupabaseError(response);
  if (message.toLowerCase().includes("duplicate")) return;
  throw new Error(`Supabase storage bucket error: ${message}`);
};

const buildSupabasePublicFileUrl = (
  config: SupabaseStorageConfig,
  storagePath: string,
) =>
  `${config.baseUrl}/storage/v1/object/public/${encodeURIComponent(config.bucket)}/${storagePath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`;

const uploadFileToSupabaseStorage = async (
  env: Bindings,
  applicationId: string,
  file: File,
  kind: AtsDocumentKind,
) => {
  const config = getSupabaseStorageConfig(env);
  if (!config) return null;

  await ensureSupabaseStorageBucket(config);

  const safeName = sanitizeStoragePathSegment(file.name || `${kind}.bin`, kind);
  const storagePath = [
    "public-ats",
    applicationId,
    `${Date.now()}-${crypto.randomUUID()}-${safeName}`,
  ].join("/");

  const uploadResponse = await fetch(
    `${config.baseUrl}/storage/v1/object/${encodeURIComponent(config.bucket)}/${storagePath
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/")}`,
    {
      method: "POST",
      headers: supabaseStorageHeaders(config, {
        "content-type": file.type || "application/octet-stream",
        "x-upsert": "true",
      }),
      body: await file.arrayBuffer(),
    },
  );

  if (!uploadResponse.ok) {
    throw new Error(
      `Supabase storage upload failed: ${await readSupabaseError(uploadResponse)}`,
    );
  }

  return {
    storagePath,
    url: buildSupabasePublicFileUrl(config, storagePath),
  };
};

const maidMediaDataUrlPattern = /^data:([^;,]+)?(?:;charset=[^;,]+)?;base64,(.+)$/i;
const MAX_MAID_MEDIA_BYTES = 5 * 1024 * 1024;

const extensionForMimeType = (mimeType: string) => {
  switch (mimeType.toLowerCase()) {
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "image/gif":
      return ".gif";
    case "video/mp4":
      return ".mp4";
    case "video/webm":
      return ".webm";
    case "video/ogg":
      return ".ogv";
    default:
      return "";
  }
};

const decodeMaidMediaDataUrl = (value: string) => {
  const match = value.trim().match(maidMediaDataUrlPattern);
  if (!match) return null;

  const mimeType = match[1] || "application/octet-stream";
  const base64 = match[2] || "";
  const estimatedBytes = Math.floor((base64.length * 3) / 4);
  if (estimatedBytes > MAX_MAID_MEDIA_BYTES) {
    throw new Error("MAID_MEDIA_TOO_LARGE");
  }

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  if (bytes.byteLength === 0) return null;
  return { mimeType, bytes };
};

const uploadMaidMediaToSupabaseStorage = async (
  env: Bindings,
  value: string,
  agencyId: number,
  referenceCode: string,
  kind: "photos" | "videos",
  index: number,
) => {
  const trimmed = value.trim();
  if (!trimmed || !trimmed.startsWith("data:")) return trimmed;

  const decoded = decodeMaidMediaDataUrl(trimmed);
  if (!decoded) return trimmed;

  const config = getSupabaseStorageConfig(env);
  if (!config) {
    console.warn("Maid media upload skipped: Supabase Storage is not configured");
    return "";
  }

  await ensureSupabaseStorageBucket(config);

  const safeRef = sanitizeStoragePathSegment(referenceCode, "maid");
  const extension = extensionForMimeType(decoded.mimeType);
  const fileName = `${kind.slice(0, -1)}-${index + 1}-${Date.now()}-${crypto.randomUUID()}${extension}`;
  const storagePath = [
    "maids",
    `agency-${agencyId}`,
    safeRef,
    kind,
    fileName,
  ].join("/");

  const uploadResponse = await fetch(
    `${config.baseUrl}/storage/v1/object/${encodeURIComponent(config.bucket)}/${storagePath
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/")}`,
    {
      method: "POST",
      headers: supabaseStorageHeaders(config, {
        "content-type": decoded.mimeType,
        "x-upsert": "true",
      }),
      body: decoded.bytes,
    },
  );

  if (!uploadResponse.ok) {
    throw new Error(
      `Supabase storage upload failed: ${await readSupabaseError(uploadResponse)}`,
    );
  }

  return buildSupabasePublicFileUrl(config, storagePath);
};

const persistMaidMediaFields = async (
  env: Bindings,
  maid: Omit<MaidRecord, "id" | "createdAt" | "updatedAt">,
) => {
  const normalizedPhotos = (
    Array.isArray(maid.photoDataUrls) && maid.photoDataUrls.length > 0
      ? maid.photoDataUrls
      : maid.photoDataUrl
        ? [maid.photoDataUrl]
        : []
  )
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .slice(0, 5);

  const photoDataUrls = await Promise.all(
    normalizedPhotos.map((photo, index) =>
      uploadMaidMediaToSupabaseStorage(
        env,
        photo,
        maid.agencyId,
        maid.referenceCode,
        "photos",
        index,
      ),
    ),
  );

  const videoDataUrl =
    typeof maid.videoDataUrl === "string" && maid.videoDataUrl.trim().startsWith("data:")
      ? await uploadMaidMediaToSupabaseStorage(
          env,
          maid.videoDataUrl,
          maid.agencyId,
          maid.referenceCode,
          "videos",
          0,
        )
      : maid.videoDataUrl?.trim() || "";

  return {
    ...maid,
    photoDataUrls,
    photoDataUrl: photoDataUrls[0] ?? "",
    videoDataUrl,
    hasPhoto: photoDataUrls.length > 0,
  };
};

const MAX_INLINE_ATS_DOCUMENT_BYTES = 256 * 1024;

const buildAtsUploadConfigError = () =>
  new Error(
    "Document upload is not configured on the server. Set SUPABASE_SERVICE_ROLE_KEY in the Cloudflare Worker so ATS files can be stored.",
  );

const buildAtsUploadFailure = (fileName: string) =>
  new Error(
    `Failed to upload document "${fileName}". Check Cloudflare Worker storage configuration and Supabase storage access.`,
  );

const shouldInlineAtsDocumentFallback = (file: File) =>
  file.size > 0 && file.size <= MAX_INLINE_ATS_DOCUMENT_BYTES;

const buildEmploymentHistoryRowsFromFormData = (formData: FormData) =>
  Array.from(
    {
      length: Math.max(3, toNumericValue(formData.get("employmentHistoryCount"), 0)),
    },
    (_, index) => index + 1,
  ).flatMap((row) => {
    const record = {
      from: toTrimmedString(formData.get(`employmentHistory${row}From`)),
      to: toTrimmedString(formData.get(`employmentHistory${row}To`)),
      country: toTrimmedString(formData.get(`employmentHistory${row}Country`)),
      employer: toTrimmedString(
        formData.get(`employmentHistory${row}Employer`),
      ),
      duties: toTrimmedString(formData.get(`employmentHistory${row}Duties`)),
      remarks: toTrimmedString(formData.get(`employmentHistory${row}Remarks`)),
    };
    return Object.values(record).some(Boolean) ? [record] : [];
  });

const getAtsProfileByApplicationId = (
  data: AppData,
  applicationId: string,
) =>
  data.ats.profiles.find((profile) => profile.applicationId === applicationId) ??
  null;

const toQualificationCategory = (score: number) => {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Highly Recommended";
  if (score >= 60) return "Qualified";
  if (score >= 40) return "Needs Review";
  return "Not Qualified";
};

const buildAtsScore = (
  profile: AtsApplicationProfileRecord,
  documents: AtsDocumentRecord[],
): AtsScoreRecord => {
  const experience = Math.min(profile.yearsOfExperience * 12, 100);
  const skillMatch = Math.min(
    profile.childcareExperience * 12 +
      profile.newbornCareExperience * 12 +
      profile.elderlyCareExperience * 12 +
      profile.disabledCareExperience * 12 +
      profile.housekeepingExperience * 12 +
      profile.petCareExperience * 10,
    100,
  );
  const certifications = Math.min(
    (profile.certifications.length + profile.trainingRecords.length) * 20,
    100,
  );
  const references = Math.min(
    documents.filter((item) => item.type === "reference").length * 50,
    100,
  );
  const languageSkills = Math.min(profile.languageSkills.length * 25, 100);
  const interviewRating = profile.coverNote.trim() ? 65 : 40;
  const weightedScore = Math.round(
    experience * 0.24 +
      skillMatch * 0.28 +
      certifications * 0.14 +
      references * 0.1 +
      languageSkills * 0.14 +
      interviewRating * 0.1,
  );
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (profile.yearsOfExperience >= 3) strengths.push("Experienced applicant");
  if (profile.languageSkills.length >= 2) strengths.push("Speaks multiple languages");
  if (
    profile.childcareExperience >= 4 ||
    profile.newbornCareExperience >= 4
  ) {
    strengths.push("Strong childcare background");
  }
  if (profile.elderlyCareExperience >= 4) {
    strengths.push("Elderly care ready");
  }
  if (profile.cookingSkills.length >= 2) {
    strengths.push("Cooking skills listed");
  }
  if (documents.length >= 3) strengths.push("Documents mostly complete");

  if (profile.yearsOfExperience <= 1) weaknesses.push("Limited experience");
  if (profile.languageSkills.length === 0) weaknesses.push("No languages listed");
  if (!profile.availableDate) weaknesses.push("Availability not declared");
  if (documents.length === 0) weaknesses.push("No supporting documents uploaded");

  return {
    score: weightedScore,
    category: toQualificationCategory(weightedScore),
    explanation:
      weightedScore >= 75
        ? "Good fit for recruiter shortlist based on experience, skills, and submitted documents."
        : weightedScore >= 50
          ? "Promising application, but needs recruiter review before moving forward."
          : "Application needs closer review before shortlist action.",
    strengths,
    weaknesses,
    factors: {
      experience,
      skillMatch,
      certifications,
      references,
      languageSkills,
      interviewRating,
    },
  };
};

const buildAtsProfileTags = (
  profile: AtsApplicationProfileRecord,
  score: AtsScoreRecord,
) => ({
  strengthsTags: score.strengths.slice(0, 5),
  weaknessesTags: score.weaknesses.slice(0, 5),
  clientMatchScore: Math.min(
    100,
    Math.round(
      score.score * 0.7 +
        profile.childcareExperience * 4 +
        profile.elderlyCareExperience * 3 +
        profile.languageSkills.length * 3,
    ),
  ),
});

const createAtsListItem = (
  application: AtsApplicationRecord,
  profile: AtsApplicationProfileRecord | null,
  score: AtsScoreRecord | null,
) => {
  if (!profile) return null;
  return {
    id: application.id,
    applicationCode: application.applicationCode,
    maidReferenceCode: profile.maidReferenceCode,
    status: application.status,
    appliedAt: application.appliedAt,
    profile: {
      fullName: profile.fullName,
      email: profile.email,
      contactNumber: profile.contactNumber,
      whatsappNumber: profile.whatsappNumber,
      nationality: profile.nationality,
      age: profile.age,
      yearsOfExperience: profile.yearsOfExperience,
      expectedSalary: profile.expectedSalary,
      employmentPreference: profile.employmentPreference,
      languageSkills: profile.languageSkills,
      cookingSkills: profile.cookingSkills,
      childcareExperience: profile.childcareExperience,
      newbornCareExperience: profile.newbornCareExperience,
      elderlyCareExperience: profile.elderlyCareExperience,
      availableDate: profile.availableDate,
      strengthsTags: profile.strengthsTags,
      weaknessesTags: profile.weaknessesTags,
    },
    score: score
      ? {
          score: score.score,
          category: score.category,
          explanation: score.explanation,
        }
      : null,
    interview: null,
    clientMatchScore: profile.clientMatchScore,
  };
};

const filterAtsApplications = (
  items: Array<ReturnType<typeof createAtsListItem>>,
  query: string,
  filters: Record<string, unknown>,
) =>
  items.filter((item) => {
    if (!item) return false;

    const haystack = [
      item.applicationCode,
      item.maidReferenceCode ?? "",
      item.profile.fullName,
      item.profile.email,
      item.profile.contactNumber,
      item.profile.whatsappNumber ?? "",
      item.profile.nationality,
      item.profile.languageSkills.join(" "),
      item.profile.cookingSkills.join(" "),
      item.status,
    ]
      .join(" ")
      .toLowerCase();
    if (query && !haystack.includes(query)) return false;

    const statusFilters = Array.isArray(filters.status)
      ? filters.status.map((value) => String(value))
      : [];
    if (statusFilters.length > 0 && !statusFilters.includes(item.status)) {
      return false;
    }

    if (filters.hasWhatsApp && !toTrimmedString(item.profile.contactNumber)) {
      return false;
    }

    if (
      filters.minScore !== undefined &&
      (item.score?.score ?? 0) < toNumericValue(filters.minScore)
    ) {
      return false;
    }

    if (
      filters.minExperience !== undefined &&
      item.profile.yearsOfExperience < toNumericValue(filters.minExperience)
    ) {
      return false;
    }

    if (filters.childcareExperience && item.profile.childcareExperience <= 0) {
      return false;
    }

    if (
      filters.elderlyCareExperience &&
      item.profile.elderlyCareExperience <= 0
    ) {
      return false;
    }

    if (filters.availableImmediately) {
      if (!item.profile.availableDate) return false;
      const availableDate = new Date(item.profile.availableDate);
      const boundary = new Date();
      boundary.setDate(boundary.getDate() + 14);
      if (
        Number.isNaN(availableDate.getTime()) ||
        availableDate.getTime() > boundary.getTime()
      ) {
        return false;
      }
    }

    return true;
  }) as Array<Exclude<ReturnType<typeof createAtsListItem>, null>>;

const sortAtsApplications = (
  items: Array<Exclude<ReturnType<typeof createAtsListItem>, null>>,
  sort: string,
) => {
  const [field, direction = "desc"] = sort.split(":");
  const factor = direction === "asc" ? 1 : -1;
  return [...items].sort((left, right) => {
    switch (field) {
      case "applicationDate":
        return (
          (new Date(left.appliedAt).getTime() - new Date(right.appliedAt).getTime()) *
          factor
        );
      case "experience":
        return (
          (left.profile.yearsOfExperience - right.profile.yearsOfExperience) *
          factor
        );
      case "clientMatchScore":
        return ((left.clientMatchScore ?? 0) - (right.clientMatchScore ?? 0)) * factor;
      case "expectedSalary":
        return (
          ((left.profile.expectedSalary ?? Number.MAX_SAFE_INTEGER) -
            (right.profile.expectedSalary ?? Number.MAX_SAFE_INTEGER)) * factor
        );
      case "name":
        return left.profile.fullName.localeCompare(right.profile.fullName) * factor;
      case "qualificationScore":
      default:
        return ((left.score?.score ?? 0) - (right.score?.score ?? 0)) * factor;
    }
  });
};

const buildAtsDashboard = (data: AppData, agencyId: number) => {
  const applications = data.ats.applications.filter(
    (item) => item.agencyId === agencyId && item.source === "resume_upload",
  );
  const scores = applications
    .map((item) => data.ats.scores[item.id]?.score ?? 0)
    .filter((value) => Number.isFinite(value));
  const averageQualificationScore =
    scores.length > 0
      ? Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length)
      : 0;

  const approvedWithDuration = applications
    .filter((item) => item.status === "Approved")
    .map((item) => {
      const approvedHistory = (data.ats.history[item.id] ?? []).find(
        (entry) => entry.toStage === "Approved",
      );
      if (!approvedHistory) return null;
      const ms =
        new Date(approvedHistory.createdAt).getTime() -
        new Date(item.appliedAt).getTime();
      return ms > 0 ? ms / (1000 * 60 * 60 * 24) : null;
    })
    .filter((value): value is number => typeof value === "number");

  return {
    totalApplicants: applications.length,
    newApplicants: applications.filter((item) => item.status === "New Applicant").length,
    interviewedCandidates: applications.filter(
      (item) => item.status === "Screening Interview",
    ).length,
    approvedCandidates: applications.filter((item) => item.status === "Approved").length,
    rejectedCandidates: applications.filter((item) => item.status === "Rejected").length,
    readyForMatching: applications.filter(
      (item) => item.status === "Ready For Client Matching",
    ).length,
    placedHelpers: applications.filter((item) => item.status === "Placed").length,
    averageQualificationScore,
    averageTimeToApprovalDays:
      approvedWithDuration.length > 0
        ? Math.round(
            approvedWithDuration.reduce((sum, value) => sum + value, 0) /
              approvedWithDuration.length,
          )
        : 0,
    placementSuccessRate:
      applications.length > 0
        ? Math.round(
            (applications.filter((item) => item.status === "Placed").length /
              applications.length) *
              100,
          )
        : 0,
    funnel: atsStageOrder.map((stage) => ({
      stage,
      count: applications.filter((item) => item.status === stage).length,
    })),
  };
};

const buildAtsBundle = (data: AppData, applicationId: string) => {
  const application = data.ats.applications.find((item) => item.id === applicationId);
  const profile = getAtsProfileByApplicationId(data, applicationId);
  if (!application || !profile) return null;
  const score = data.ats.scores[applicationId] ?? null;
  return {
    application: {
      id: application.id,
      agencyId: application.agencyId,
      applicationCode: application.applicationCode,
      maidReferenceCode: profile.maidReferenceCode,
      status: application.status,
      appliedAt: application.appliedAt,
      aiParseSummary: application.aiParseSummary,
      profile: {
        fullName: profile.fullName,
        email: profile.email,
        contactNumber: profile.contactNumber,
        whatsappNumber: profile.whatsappNumber,
        nationality: profile.nationality,
        age: profile.age,
        yearsOfExperience: profile.yearsOfExperience,
        expectedSalary: profile.expectedSalary,
        employmentPreference: profile.employmentPreference,
        languageSkills: profile.languageSkills,
        cookingSkills: profile.cookingSkills,
        childcareExperience: profile.childcareExperience,
        newbornCareExperience: profile.newbornCareExperience,
        elderlyCareExperience: profile.elderlyCareExperience,
        availableDate: profile.availableDate,
        strengthsTags: profile.strengthsTags,
        weaknessesTags: profile.weaknessesTags,
      },
    },
    profile,
    score,
    interview: null,
    backgroundCheck: null,
    history: data.ats.history[applicationId] ?? [],
    documents: (data.ats.documents[applicationId] ?? []).map((document) => ({
      id: document.id,
      type: document.type,
      name: document.name,
      url: document.url,
      status: document.status,
      required: document.required,
    })),
    matches: [],
    notifications: data.ats.notifications[applicationId] ?? [],
    references: [],
  };
};

const buildPublicAtsSummary = (
  data: AppData,
  applicationId: string,
  accessToken: string,
) => {
  const application = data.ats.applications.find(
    (item) =>
      item.id === applicationId && item.applicantAccessToken === accessToken,
  );
  const profile = application
    ? getAtsProfileByApplicationId(data, application.id)
    : null;
  if (!application || !profile) return null;
  return {
    application: {
      id: application.id,
      applicationCode: application.applicationCode,
      status: application.status,
      appliedAt: application.appliedAt,
      aiParseSummary: application.aiParseSummary,
    },
    profile: {
      fullName: profile.fullName,
      email: profile.email,
      contactNumber: profile.contactNumber,
      nationality: profile.nationality,
      availableDate: profile.availableDate,
      expectedSalary: profile.expectedSalary,
    },
    documents: data.ats.documents[applicationId] ?? [],
    history: (data.ats.history[applicationId] ?? []).map((item) => ({
      id: item.id,
      toStage: item.toStage,
      reason: item.reason,
      createdAt: item.createdAt,
    })),
    notifications: data.ats.notifications[applicationId] ?? [],
  };
};

const parseAtsFormData = async (env: Bindings, formData: FormData) => {
  const agencyId = toNumericValue(formData.get("agencyId"), 1) || 1;
  const fullName = toTrimmedString(formData.get("fullName"));
  const email = toTrimmedString(formData.get("email"));
  const contactNumber = toTrimmedString(formData.get("contactNumber"));

  if (!fullName) throw new Error("fullName is required");
  if (!contactNumber) throw new Error("contactNumber is required");
  if (!email) throw new Error("email is required");

  const fdwFieldNames = [
    "placeOfBirth",
    "heightCm",
    "weightKg",
    "residentialAddressLine1",
    "residentialAddressLine2",
    "repatriationPort",
    "homeCountryContactNumber",
    "religion",
    "educationLevel",
    "numberOfSiblings",
    "numberOfChildren",
    "childrenAges",
    "allergies",
    "physicalDisabilities",
    "dietaryRestrictions",
    "foodPreference",
    "foodPreferenceOther",
    "restDayPreference",
    "otherRemarksA3",
    "sgInfantsChildrenAssessment",
    "sgElderlyAssessment",
    "sgDisabledAssessment",
    "sgHouseworkAssessment",
    "sgCookingAssessment",
    "sgLanguageAssessment",
    "sgOtherSkills",
    "sgOtherSkillsAssessment",
    "foreignTrainingCentreName",
    "thirdPartyCertificationDetails",
    "overseasInfantsChildrenAssessment",
    "overseasElderlyAssessment",
    "overseasDisabledAssessment",
    "overseasHouseworkAssessment",
    "overseasCookingAssessment",
    "overseasLanguageAssessment",
    "overseasOtherSkills",
    "overseasOtherSkillsAssessment",
    "feedbackEmployer1",
    "feedbackEmployer2",
    "otherRemarksE",
    "medicalConditions",
  ] as const;

  const fdwBooleanFieldNames = [
    "workedInSingapore",
    "willingToHandleInfants",
    "willingToHandleElderly",
    "willingToHandleDisabled",
    "willingToDoHousework",
    "willingToCook",
  ] as const;

  const fdwFormData = Object.fromEntries([
    ...fdwFieldNames.map((field) => [field, toTrimmedString(formData.get(field))]),
    ...fdwBooleanFieldNames.map((field) => [field, toBooleanFlag(formData.get(field))]),
  ]);

  const applicationId = randomId("ats-app");
  const profileId = randomId("ats-profile");
  const appliedAt = now();
  const documents: AtsDocumentRecord[] = [];
  const storageConfig = getSupabaseStorageConfig(env);
  for (const [field, kind] of publicAtsFileKinds) {
    for (const entry of formData.getAll(field)) {
      if (!(entry instanceof File) || entry.size <= 0) continue;
      let uploadedAsset: { storagePath: string; url: string } | null = null;
      if (!storageConfig) {
        if (!shouldInlineAtsDocumentFallback(entry)) {
          throw buildAtsUploadConfigError();
        }
      } else {
        try {
          uploadedAsset = await uploadFileToSupabaseStorage(
            env,
            applicationId,
            entry,
            kind,
          );
        } catch (error) {
          console.error("ATS file upload failed", error);
          throw buildAtsUploadFailure(
            entry.name || `${kind}-${documents.length + 1}`,
          );
        }
      }
      documents.push({
        id: randomId("doc"),
        type: kind,
        name: entry.name || `${kind}-${documents.length + 1}`,
        fileType: entry.type || "application/octet-stream",
        size: entry.size,
        url: uploadedAsset?.url ?? (await fileToDataUrl(entry)),
        storagePath: uploadedAsset?.storagePath,
        required: kind === "resume" || kind === "passport",
        uploadedAt: now(),
        status: "submitted",
      });
    }
  }
  const profile: AtsApplicationProfileRecord = {
    id: profileId,
    applicationId,
    fullName,
    email,
    contactNumber,
    whatsappNumber: contactNumber,
    nationality: toTrimmedString(formData.get("nationality")),
    dateOfBirth: toTrimmedString(formData.get("dateOfBirth")),
    age: calculateAgeFromDate(toTrimmedString(formData.get("dateOfBirth"))),
    gender: toTrimmedString(formData.get("gender")) || "Female",
    maritalStatus: toTrimmedString(formData.get("maritalStatus")),
    address: toTrimmedString(formData.get("address")),
    yearsOfExperience: toNumericValue(formData.get("yearsOfExperience")),
    previousCountriesWorkedIn: listFromDelimitedString(
      formData.get("previousCountriesWorkedIn"),
    ),
    childcareExperience: toNumericValue(formData.get("childcareExperience")),
    newbornCareExperience: toNumericValue(formData.get("newbornCareExperience")),
    elderlyCareExperience: toNumericValue(formData.get("elderlyCareExperience")),
    disabledCareExperience: toNumericValue(formData.get("disabledCareExperience")),
    housekeepingExperience: toNumericValue(formData.get("housekeepingExperience")),
    cookingSkills: listFromDelimitedString(formData.get("cookingSkills")),
    petCareExperience: toNumericValue(formData.get("petCareExperience")),
    languageSkills: listFromDelimitedString(formData.get("languageSkills")),
    certifications: listFromDelimitedString(formData.get("certifications")),
    trainingRecords: listFromDelimitedString(formData.get("trainingRecords")),
    availableDate: toTrimmedString(formData.get("availableDate")),
    expectedSalary: toOptionalNumber(formData.get("expectedSalary")),
    employmentPreference: toTrimmedString(formData.get("employmentPreference")),
    coverNote: toTrimmedString(formData.get("coverNote")),
    workHistory: buildEmploymentHistoryRowsFromFormData(formData),
    fdwFormData,
    strengthsTags: [],
    weaknessesTags: [],
    clientMatchScore: 0,
    createdAt: appliedAt,
    updatedAt: appliedAt,
  };
  const score = buildAtsScore(profile, documents);
  const tags = buildAtsProfileTags(profile, score);
  profile.strengthsTags = tags.strengthsTags;
  profile.weaknessesTags = tags.weaknessesTags;
  profile.clientMatchScore = tags.clientMatchScore;

  const application: AtsApplicationRecord = {
    id: applicationId,
    agencyId,
    profileId,
    applicationCode: buildApplicationCode(),
    applicantAccessToken: crypto.randomUUID(),
    status: documents.length > 0 ? "Documents Submitted" : "New Applicant",
    source: "resume_upload",
    appliedAt,
    updatedAt: appliedAt,
    aiParseSummary: `Public maid application received from ${fullName}.`,
    notificationLogIds: [],
  };

  const history: AtsHistoryRecord[] = [
    {
      id: randomId("history"),
      toStage: "New Applicant",
      actor: "Applicant",
      reason: "Application submitted from public maid application form",
      createdAt: appliedAt,
    },
  ];
  if (application.status !== "New Applicant") {
    history.push({
      id: randomId("history"),
      fromStage: "New Applicant",
      toStage: application.status,
      actor: "System",
      reason: "Supporting documents uploaded during submission",
      createdAt: appliedAt,
    });
  }

  const notifications: AtsNotificationRecord[] = [
    {
      id: randomId("notify"),
      applicationId,
      event: "Application Received",
      channel: "internal",
      message: `${fullName} submitted a maid application.`,
      createdAt: appliedAt,
    },
  ];

  return { application, profile, score, documents, history, notifications };
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const sseEncoder = new TextEncoder();

const normalizeEmail = (value: string) => value.trim().toLowerCase();

const isEmailLike = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const generateSixDigitCode = () => {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return String(buf[0] % 1000000).padStart(6, "0");
};

const sha256Hex = async (value: string) => {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

const shouldExposeDevConfirmationCode = (env: Bindings) =>
  env.DEV_EXPOSE_CONFIRMATION_CODE?.trim().toLowerCase() === "true";

const sendEmailViaResend = async (
  env: Bindings,
  to: string,
  subject: string,
  text: string,
) => {
  const apiKey = env.RESEND_API_KEY?.trim();
  const from = env.RESEND_FROM?.trim();
  if (!apiKey || !from) {
    return { ok: false as const, error: "RESEND_NOT_CONFIGURED" as const };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      text,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    console.error("Resend email failed", response.status, body);
    return { ok: false as const, error: "RESEND_FAILED" as const };
  }

  return { ok: true as const };
};

const sendConfirmationCodeEmail = async (
  env: Bindings,
  params: { to: string; code: string; purpose: "client" | "agency" },
) => {
  const subject =
    params.purpose === "client"
      ? "Confirm your client account"
      : "Confirm your agency admin account";
  const text =
    params.purpose === "client"
      ? `Your Helped client verification code is: ${params.code}\n\nThis code expires in 15 minutes.`
      : `Your Helped agency admin verification code is: ${params.code}\n\nThis code expires in 15 minutes.`;

  return await sendEmailViaResend(env, params.to, subject, text);
};

type SupabaseAuthUser = {
  id: string;
  email?: string;
  phone?: string;
  user_metadata?: Record<string, unknown>;
};

const supabaseUserCache = new Map<
  string,
  { user: SupabaseAuthUser; expiresAt: number }
>();

const getSupabaseAuthUser = async (env: Bindings, accessToken: string) => {
  console.log("getSupabaseAuthUser: token length", accessToken.length);

  const cached = supabaseUserCache.get(accessToken);
  if (cached && cached.expiresAt > Date.now()) return cached.user;

  const baseUrl = env.SUPABASE_URL?.trim().replace(/\/$/, "");
  const anonKey = env.SUPABASE_ANON_KEY?.trim();
  if (!baseUrl || !anonKey) {
    console.error(
      "Supabase auth verify skipped: missing SUPABASE_URL or SUPABASE_ANON_KEY",
    );
    return null;
  }

  try {
    const response = await fetch(`${baseUrl}/auth/v1/user`, {
      headers: {
        apikey: anonKey,
        authorization: `Bearer ${accessToken}`,
        accept: "application/json",
      },
    });

    if (!response.ok) {
      let details = "";
      try {
        details = await response.text();
      } catch {
        // ignore
      }
      console.error("Supabase auth verify failed", {
        status: response.status,
        baseUrl,
        details: details.slice(0, 300),
      });
      return null;
    }

    const user = (await response.json()) as SupabaseAuthUser;
    // Cache for 5 minutes to reduce Supabase Auth calls.
    supabaseUserCache.set(accessToken, {
      user,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });
    return user;
  } catch (error) {
    console.error("getSupabaseAuthUser fetch error:", error);
    return null;
  }
};

const createSseResponse = (
  request: Request,
  handler: (
    controller: ReadableStreamDefaultController<Uint8Array>,
  ) => Promise<void>,
) => {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const abortListener = () => controller.close();
      request.signal.addEventListener("abort", abortListener, { once: true });
      handler(controller)
        .catch((error) => {
          console.error("SSE stream error", error);
        })
        .finally(() => {
          request.signal.removeEventListener("abort", abortListener);
          try {
            controller.close();
          } catch {
            // ignore
          }
        });
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
};

const writeSseEvent = (
  controller: ReadableStreamDefaultController<Uint8Array>,
  eventName: string,
  payload: unknown,
) => {
  controller.enqueue(
    sseEncoder.encode(
      `event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`,
    ),
  );
};

const writeSseComment = (
  controller: ReadableStreamDefaultController<Uint8Array>,
  comment: string,
) => {
  controller.enqueue(sseEncoder.encode(`: ${comment}\n\n`));
};

const csvColumns = [
  "referenceCode",
  "fullName",
  "status",
  "type",
  "nationality",
  "dateOfBirth",
  "placeOfBirth",
  "height",
  "weight",
  "religion",
  "maritalStatus",
  "numberOfChildren",
  "numberOfSiblings",
  "homeAddress",
  "airportRepatriation",
  "educationLevel",
  "languageSkills",
  "skillsPreferences",
  "workAreas",
  "employmentHistory",
  "introduction",
  "agencyContact",
  "photoDataUrl",
  "photoDataUrls",
  "videoDataUrl",
  "isPublic",
  "hasPhoto",
] as const;

const csvObjectColumns = new Set<(typeof csvColumns)[number]>([
  "languageSkills",
  "skillsPreferences",
  "workAreas",
  "employmentHistory",
  "introduction",
  "agencyContact",
  "photoDataUrls",
]);

const serializeCsvColumnValue = (
  column: (typeof csvColumns)[number],
  maid: MaidRecord,
) => {
  const value = maid[column];
  if (csvObjectColumns.has(column)) {
    return JSON.stringify(
      value ??
        (column === "employmentHistory" || column === "photoDataUrls"
          ? []
          : {}),
    );
  }
  return value ?? "";
};

const csvEscape = (value: unknown) => {
  const stringValue = String(value ?? "");
  if (
    stringValue.includes(",") ||
    stringValue.includes('"') ||
    stringValue.includes("\n")
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

const toBase64Utf8 = (value: string) => {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
};

const parseCsvRow = (line: string) => {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
};

const parseBoolean = (value: string | undefined, fallback = false) => {
  if (!value) return fallback;
  const normalized = value.trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
};

const parseNumber = (value: string | undefined, fallback: number) => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseJsonObject = <T extends Record<string, unknown>>(
  value: string | undefined,
  fallback: T,
) => {
  if (!value?.trim()) return fallback;
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === "object" && parsed && !Array.isArray(parsed)
      ? (parsed as T)
      : fallback;
  } catch {
    return fallback;
  }
};

const parseJsonArray = <T>(value: string | undefined, fallback: T[]) => {
  if (!value?.trim()) return fallback;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
};

const defaultMaidProfile = {
  status: "available",
  type: "New maid",
  nationality: "Filipino maid",
  dateOfBirth: "",
  placeOfBirth: "",
  height: 150,
  weight: 50,
  religion: "Catholic",
  maritalStatus: "Single",
  numberOfChildren: 0,
  numberOfSiblings: 0,
  homeAddress: "",
  airportRepatriation: "",
  educationLevel: "High School (10-12 yrs)",
  languageSkills: { English: "Zero" },
  skillsPreferences: {},
  workAreas: {},
  employmentHistory: [],
  introduction: {},
  agencyContact: {},
  photoDataUrl: "",
  photoDataUrls: [],
  videoDataUrl: "",
  isPublic: false,
  hasPhoto: false,
};

const requiredMaidFields: Array<
  keyof typeof defaultMaidProfile | "fullName" | "referenceCode"
> = [
  "fullName",
  "referenceCode",
  "type",
  "nationality",
  "dateOfBirth",
  "placeOfBirth",
  "height",
  "weight",
  "religion",
  "maritalStatus",
  "numberOfChildren",
  "numberOfSiblings",
  "homeAddress",
  "airportRepatriation",
  "educationLevel",
  "languageSkills",
  "skillsPreferences",
  "workAreas",
  "employmentHistory",
  "introduction",
  "agencyContact",
];

const validateMaidPayload = (maid: Record<string, unknown>) => {
  const missing = requiredMaidFields.filter(
    (field) => maid[field] === undefined,
  );
  if (missing.length > 0) {
    return `Missing required fields: ${missing.join(", ")}`;
  }
  if (
    typeof maid.fullName !== "string" ||
    !maid.fullName.trim() ||
    typeof maid.referenceCode !== "string" ||
    !maid.referenceCode.trim()
  ) {
    return "Full name and reference code are required";
  }
  return null;
};

const normalizeReferenceCode = (value: unknown) => String(value ?? "").trim();

const toMaidRecordPayload = (
  maid: Record<string, unknown>,
): Omit<MaidRecord, "id" | "createdAt" | "updatedAt"> => {
  const rawPhotoDataUrl =
    typeof maid.photoDataUrl === "string" ? maid.photoDataUrl : "";
  const photoDataUrls = Array.isArray(maid.photoDataUrls)
    ? maid.photoDataUrls.filter(
        (item): item is string =>
          typeof item === "string" && item.trim().length > 0,
      )
    : rawPhotoDataUrl
      ? [rawPhotoDataUrl]
      : [];
  const photoDataUrl = photoDataUrls[0] ?? rawPhotoDataUrl;

  return {
    agencyId:
      Number.isInteger(Number(maid.agencyId)) && Number(maid.agencyId) > 0
        ? Number(maid.agencyId)
        : 1,
    fullName: String(maid.fullName).trim(),
    referenceCode: normalizeReferenceCode(maid.referenceCode),
    status: typeof maid.status === "string" ? maid.status : "available",
    type: String(maid.type),
    nationality: String(maid.nationality),
    dateOfBirth: String(maid.dateOfBirth),
    placeOfBirth: String(maid.placeOfBirth),
    height: Number(maid.height),
    weight: Number(maid.weight),
    religion: String(maid.religion),
    maritalStatus: String(maid.maritalStatus),
    numberOfChildren: Number(maid.numberOfChildren),
    numberOfSiblings: Number(maid.numberOfSiblings),
    homeAddress: String(maid.homeAddress),
    airportRepatriation: String(maid.airportRepatriation),
    educationLevel: String(maid.educationLevel),
    languageSkills:
      typeof maid.languageSkills === "object" && maid.languageSkills
        ? (maid.languageSkills as Record<string, string>)
        : {},
    skillsPreferences:
      typeof maid.skillsPreferences === "object" && maid.skillsPreferences
        ? (maid.skillsPreferences as Record<string, unknown>)
        : {},
    workAreas:
      typeof maid.workAreas === "object" && maid.workAreas
        ? (maid.workAreas as Record<string, unknown>)
        : {},
    employmentHistory: Array.isArray(maid.employmentHistory)
      ? (maid.employmentHistory as Array<Record<string, unknown>>)
      : [],
    introduction:
      typeof maid.introduction === "object" && maid.introduction
        ? (maid.introduction as Record<string, unknown>)
        : {},
    agencyContact:
      typeof maid.agencyContact === "object" && maid.agencyContact
        ? (maid.agencyContact as Record<string, unknown>)
        : {},
    photoDataUrls: photoDataUrls.slice(0, 5),
    photoDataUrl,
    videoDataUrl:
      typeof maid.videoDataUrl === "string" ? maid.videoDataUrl : "",
    isPublic: Boolean(maid.isPublic),
    hasPhoto:
      typeof maid.hasPhoto === "boolean"
        ? maid.hasPhoto
        : photoDataUrls.length > 0 || Boolean(photoDataUrl),
  };
};

type MaidImportOperation =
  | {
      type: "csv";
      csv?: string;
      fileName?: string;
    }
  | {
      type: "profile";
      payload?: Record<string, unknown>;
      fileName?: string;
    };

type MaidImportOperationResult = {
  fileName: string;
  created: number;
  updated: number;
  failed: number;
  errors: string[];
};

const applyCsvImportToData = (data: AppData, csv: string) => {
  const lines = csv
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return {
      created: 0,
      updated: 0,
      errors: ["CSV must include header and at least one row"],
    };
  }

  const headers = parseCsvRow(lines[0]);
  const headerSet = new Set(headers);
  if (!headerSet.has("referenceCode") || !headerSet.has("fullName")) {
    return {
      created: 0,
      updated: 0,
      errors: ["CSV must include referenceCode and fullName columns"],
    };
  }

  let created = 0;
  let updated = 0;
  const errors: string[] = [];

  for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
    const rowValues = parseCsvRow(lines[lineIndex]);
    const rowMap = Object.fromEntries(
      headers.map((header, index) => [header, rowValues[index] ?? ""]),
    );
    const referenceCode = String(rowMap.referenceCode ?? "").trim();
    const fullName = String(rowMap.fullName ?? "").trim();

    if (!referenceCode || !fullName) {
      errors.push(
        `Row ${lineIndex + 1}: referenceCode and fullName are required`,
      );
      continue;
    }

    const existingIndex = data.maids.findIndex(
      (maid) => maid.referenceCode === referenceCode,
    );
    const existing = existingIndex === -1 ? null : data.maids[existingIndex];
    const base = existing ?? {
      ...defaultMaidProfile,
      fullName,
      referenceCode,
    };
    const languageSkills = parseJsonObject<Record<string, string>>(
      rowMap.languageSkills,
      base.languageSkills,
    );
    const skillsPreferences = parseJsonObject<Record<string, unknown>>(
      rowMap.skillsPreferences,
      base.skillsPreferences,
    );
    const workAreas = parseJsonObject<Record<string, unknown>>(
      rowMap.workAreas,
      base.workAreas,
    );
    const employmentHistory = parseJsonArray<Record<string, unknown>>(
      rowMap.employmentHistory,
      base.employmentHistory,
    );
    const introduction = parseJsonObject<Record<string, unknown>>(
      rowMap.introduction,
      base.introduction,
    );
    const agencyContact = parseJsonObject<Record<string, unknown>>(
      rowMap.agencyContact,
      base.agencyContact,
    );
    const photoDataUrls = parseJsonArray<string>(
      rowMap.photoDataUrls,
      existing?.photoDataUrls ?? base.photoDataUrls,
    ).filter(
      (item): item is string =>
        typeof item === "string" && item.trim().length > 0,
    );
    const photoDataUrl =
      rowMap.photoDataUrl?.trim() ||
      photoDataUrls[0] ||
      existing?.photoDataUrl ||
      base.photoDataUrl;
    const payload = {
      ...base,
      fullName,
      referenceCode,
      status: rowMap.status || existing?.status || base.status,
      type: rowMap.type || base.type,
      nationality: rowMap.nationality || base.nationality,
      dateOfBirth: rowMap.dateOfBirth || base.dateOfBirth,
      placeOfBirth: rowMap.placeOfBirth || base.placeOfBirth,
      height: parseNumber(rowMap.height, base.height),
      weight: parseNumber(rowMap.weight, base.weight),
      religion: rowMap.religion || base.religion,
      maritalStatus: rowMap.maritalStatus || base.maritalStatus,
      numberOfChildren: parseNumber(
        rowMap.numberOfChildren,
        base.numberOfChildren,
      ),
      numberOfSiblings: parseNumber(
        rowMap.numberOfSiblings,
        base.numberOfSiblings,
      ),
      homeAddress: rowMap.homeAddress || base.homeAddress,
      airportRepatriation: rowMap.airportRepatriation || base.airportRepatriation,
      educationLevel: rowMap.educationLevel || base.educationLevel,
      languageSkills,
      skillsPreferences,
      workAreas,
      employmentHistory,
      introduction,
      agencyContact,
      photoDataUrl,
      photoDataUrls,
      videoDataUrl:
        rowMap.videoDataUrl || existing?.videoDataUrl || base.videoDataUrl,
      isPublic: parseBoolean(String(rowMap.isPublic ?? ""), base.isPublic),
      hasPhoto: parseBoolean(
        String(rowMap.hasPhoto ?? ""),
        photoDataUrls.length > 0 || Boolean(photoDataUrl) || base.hasPhoto,
      ),
    };

    const recordPayload = toMaidRecordPayload(payload);
    if (existing) {
      data.maids[existingIndex] = {
        ...data.maids[existingIndex],
        ...recordPayload,
        updatedAt: now(),
      };
      updated += 1;
    } else {
      data.maids.unshift({
        ...recordPayload,
        id: data.counters.maids++,
        createdAt: now(),
        updatedAt: now(),
      });
      created += 1;
    }
  }

  return { created, updated, errors };
};

const upsertImportedMaidProfileInData = (
  data: AppData,
  payload: Record<string, unknown>,
) => {
  const validationError = validateMaidPayload(payload);
  if (validationError) {
    return { created: 0, updated: 0, errors: [validationError] };
  }

  const recordPayload = toMaidRecordPayload(payload);
  const referenceCode = normalizeReferenceCode(recordPayload.referenceCode);
  const index = data.maids.findIndex(
    (maid) => maid.referenceCode === referenceCode,
  );

  if (index === -1) {
    data.maids.unshift({
      ...recordPayload,
      referenceCode,
      id: data.counters.maids++,
      createdAt: now(),
      updatedAt: now(),
    });
    return { created: 1, updated: 0, errors: [] };
  }

  data.maids[index] = {
    ...data.maids[index],
    ...recordPayload,
    referenceCode,
    updatedAt: now(),
  };
  return { created: 0, updated: 1, errors: [] };
};

const ensureMaidPresent = async (
  env: Bindings,
  referenceCode: string,
  fallback: Omit<MaidRecord, "id" | "createdAt" | "updatedAt">,
) => {
  const ref = normalizeReferenceCode(referenceCode);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const latest = await loadData(env);
    const exists = latest.maids.find((item) => item.referenceCode === ref);
    if (exists) {
      return exists;
    }

    // Concurrency safety: if a concurrent write overwrote our change, re-apply it.
    latest.maids = latest.maids.filter((item) => item.referenceCode !== ref);
    latest.maids.unshift({
      ...fallback,
      referenceCode: ref,
      id: latest.counters.maids++,
      createdAt: now(),
      updatedAt: now(),
    });
    await saveData(env, latest);
    await sleep(40 * (attempt + 1));
  }

  return null;
};

const getConversationContext = (url: URL) => {
  const conversationType =
    url.searchParams.get("type") === "agency" ? "agency" : "support";
  const agencyId =
    conversationType === "agency"
      ? Number(url.searchParams.get("agencyId"))
      : undefined;
  const agencyName =
    conversationType === "agency"
      ? (url.searchParams.get("agencyName") ?? undefined)
      : undefined;

  return {
    conversationType,
    agencyId: Number.isInteger(agencyId) ? agencyId : undefined,
    agencyName,
  } as const;
};

const getStorageMode = (env: Bindings) => {
  const hasSupabase = Boolean(getSupabaseAppDataConfig(env));
  if (hasSupabase) {
    return isNormalizedSupabaseEnabled(env) ? "supabase-normalized" : "supabase";
  }
  if (env.APP_DATA) return "kv";
  return "none";
};

app.get("/api/health", (c) =>
  c.json({ status: "Server is running", storage: getStorageMode(c.env) }),
);

app.get("/api/diagnostics", (c) => {
  const config = getSupabaseAppDataConfig(c.env);
  return c.json({
    storage: getStorageMode(c.env),
    supabase: {
      enabled: Boolean(config),
      urlHost: config ? new URL(config.baseUrl).host : null,
      table: config?.table ?? null,
      rowId: config?.rowId ?? null,
      normalized: isNormalizedSupabaseEnabled(c.env),
      hasServiceRoleKey: Boolean(c.env.SUPABASE_SERVICE_ROLE_KEY?.trim()),
    },
    kv: {
      enabled: Boolean(c.env.APP_DATA),
    },
  });
});
app.get("/api", (c) => c.json({ message: "Welcome to Helped Cloudflare API" }));

app.get(
  "/api/agencies",
  safeApi(async (c) => {
    const data = await loadData(c.env);
    const agencies = data.agencyAdmins.map((admin) => {
      const agencyId = Number.isInteger(Number(admin.agencyId))
        ? Number(admin.agencyId)
        : 1;
      const agencyMaids = data.maids.filter((maid) => maid.agencyId === agencyId);
      const publicMaids = agencyMaids.filter((maid) => maid.isPublic).length;

      return {
        id: agencyId,
        name: toTrimmedString(admin.agencyName) || toTrimmedString(admin.username) || "Agency",
        email: toTrimmedString(admin.email),
        createdAt: admin.createdAt ?? now(),
        totalMaids: agencyMaids.length,
        publicMaids,
      };
    });

    const uniqueAgencies = Array.from(
      new Map(agencies.map((agency) => [agency.id, agency])).values(),
    ).sort((left, right) => left.name.localeCompare(right.name));

    return c.json({ agencies: uniqueAgencies });
  }),
);

app.get(
  "/api/company",
  safeApi(async (c) => {
    const data = await loadData(c.env);
    return c.json({
      companyProfile: data.companyProfile,
      momPersonnel: data.momPersonnel,
      testimonials: data.testimonials,
    });
  }),
);

app.get(
  "/api/company/summary",
  safeApi(async (c) => {
    const data = await loadData(c.env);
    const publicMaids = data.maids.filter((maid) => maid.isPublic).length;
    const hiddenMaids = data.maids.length - publicMaids;
    const maidsWithPhotos = data.maids.filter((maid) => maid.hasPhoto).length;
    const unreadAgencyChats = data.chatMessages.filter(
      (message) => message.senderRole === "client" && !message.readByAgency,
    ).length;

    return c.json({
      publicMaids,
      hiddenMaids,
      totalMaids: data.maids.length,
      maidsWithPhotos,
      enquiries: data.enquiries.length,
      requests: data.directSales.length,
      pendingRequests: data.directSales.filter(
        (item) => item.status === "pending",
      ).length,
      unreadAgencyChats,
      momPersonnel: data.momPersonnel.length,
      testimonials: data.testimonials.length,
      galleryImages: data.companyProfile.gallery_image_data_urls?.length ?? 0,
    });
  }),
);

app.put(
  "/api/company",
  safeApi(async (c) => {
    const body = await parseBody<Partial<CompanyProfileRecord>>(c.req.raw);
    if (!body) {
      return c.json({ error: "Invalid JSON body" }, 400);
    }

    const allowedFields: Array<keyof CompanyProfileRecord> = [
      "company_name",
      "short_name",
      "license_no",
      "address_line1",
      "address_line2",
      "postal_code",
      "country",
      "contact_person",
      "contact_phone",
      "contact_email",
      "contact_fax",
      "contact_website",
      "office_hours_regular",
      "office_hours_other",
      "social_facebook",
      "social_whatsapp_number",
      "social_whatsapp_message",
      "branding_theme_color",
      "branding_button_color",
      "about_us",
      "logo_data_url",
      "gallery_image_data_urls",
      "intro_video_data_url",
    ];

    const entries = allowedFields.filter((field) => body[field] !== undefined);
    if (entries.length === 0) {
      return c.json({ error: "No valid fields provided for update" }, 400);
    }

    const data = await loadData(c.env);
    data.companyProfile = {
      ...data.companyProfile,
      ...Object.fromEntries(entries.map((field) => [field, body[field]])),
      updated_at: now(),
    };
    await saveData(c.env, data);

    return c.json({
      message: "Company profile updated successfully",
      companyProfile: data.companyProfile,
    });
  }),
);

app.post(
  "/api/company/mom-personnel",
  safeApi(async (c) => {
    const body = await parseBody<{
      name?: string;
      registration_number?: string;
    }>(c.req.raw);
    if (!body?.name?.trim() || !body.registration_number?.trim()) {
      return c.json(
        { error: "Name and registration number are required" },
        400,
      );
    }

    const data = await loadData(c.env);
    const momPersonnel: MOMPersonnelRecord = {
      id: data.counters.momPersonnel++,
      company_id: 1,
      name: body.name.trim(),
      registration_number: body.registration_number.trim(),
      created_at: now(),
    };
    data.momPersonnel.push(momPersonnel);
    await saveData(c.env, data);
    return c.json(
      { message: "MOM personnel added successfully", momPersonnel },
      201,
    );
  }),
);

app.put(
  "/api/company/mom-personnel/:id",
  safeApi(async (c) => {
    const id = Number(c.req.param("id"));
    if (!Number.isInteger(id)) {
      return c.json({ error: "Valid id is required" }, 400);
    }

    const body = await parseBody<{
      name?: string;
      registration_number?: string;
    }>(c.req.raw);
    if (!body || (!body.name && !body.registration_number)) {
      return c.json(
        {
          error: "At least one field (name or registration_number) is required",
        },
        400,
      );
    }

    const data = await loadData(c.env);
    const index = data.momPersonnel.findIndex((item) => item.id === id);
    if (index === -1) {
      return c.json({ error: "MOM personnel not found" }, 404);
    }

    data.momPersonnel[index] = {
      ...data.momPersonnel[index],
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.registration_number !== undefined
        ? { registration_number: body.registration_number }
        : {}),
    };
    await saveData(c.env, data);
    return c.json({
      message: "MOM personnel updated successfully",
      momPersonnel: data.momPersonnel[index],
    });
  }),
);

app.delete(
  "/api/company/mom-personnel/:id",
  safeApi(async (c) => {
    const id = Number(c.req.param("id"));
    const data = await loadData(c.env);
    const existing = data.momPersonnel.find((item) => item.id === id);
    if (!existing) {
      return c.json({ error: "MOM personnel not found" }, 404);
    }

    data.momPersonnel = data.momPersonnel.filter((item) => item.id !== id);
    await saveData(c.env, data);
    return c.json({
      message: "MOM personnel deleted successfully",
      deletedMOMPersonnel: existing,
    });
  }),
);

app.post(
  "/api/company/testimonials",
  safeApi(async (c) => {
    const body = await parseBody<{ message?: string; author?: string }>(
      c.req.raw,
    );
    if (!body?.message?.trim() || !body.author?.trim()) {
      return c.json({ error: "Message and author are required" }, 400);
    }

    const data = await loadData(c.env);
    const testimonial: TestimonialRecord = {
      id: data.counters.testimonials++,
      company_id: 1,
      message: body.message.trim(),
      author: body.author.trim(),
      created_at: now(),
    };
    data.testimonials.unshift(testimonial);
    await saveData(c.env, data);
    return c.json(
      { message: "Testimonial added successfully", testimonial },
      201,
    );
  }),
);

app.delete(
  "/api/company/testimonials/:id",
  safeApi(async (c) => {
    const id = Number(c.req.param("id"));
    const data = await loadData(c.env);
    const existing = data.testimonials.find((item) => item.id === id);
    if (!existing) {
      return c.json({ error: "Testimonial not found" }, 404);
    }

    data.testimonials = data.testimonials.filter((item) => item.id !== id);
    await saveData(c.env, data);
    return c.json({
      message: "Testimonial deleted successfully",
      deletedTestimonial: existing,
    });
  }),
);

app.get(
  "/api/maids",
  safeApi(async (c) => {
    const parsePositiveInt = (value?: string) => {
      if (!value) return undefined
      const parsed = Number(value)
      return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined
    }

    const search = c.req.query("search")?.trim().toLowerCase()
    const visibility = c.req.query("visibility")
    const agencyIdQuery = c.req.query("agencyId")
    const agencyId =
      agencyIdQuery && Number.isInteger(Number(agencyIdQuery))
        ? Number(agencyIdQuery)
        : undefined
    const page = parsePositiveInt(c.req.query("page"))
    const pageSize = parsePositiveInt(c.req.query("pageSize"))
    const offset = parsePositiveInt(c.req.query("offset")) ?? 0
    const limit = pageSize ?? parsePositiveInt(c.req.query("limit"))
    const supabase = getSupabaseAppDataConfig(c.env)
    if (supabase) {
      const effectiveOffset = page != null && pageSize != null ? (page - 1) * pageSize : offset
      try {
        const result = isNormalizedSupabaseEnabled(c.env)
          ? await listMaidsFromSupabaseNormalized(supabase, {
              search,
              visibility,
              agencyId,
              offset: effectiveOffset,
              limit,
            })
          : await listMaidsFromSupabaseAppView(supabase, {
              search,
              visibility,
              agencyId,
              offset: effectiveOffset,
              limit,
            })
        return c.json({
          maids: result.maids,
          total: result.total,
          page: page ?? 1,
          pageSize: limit ?? result.total,
        })
      } catch (error) {
        console.warn("Fast maid list path failed; falling back to app data", error)
      }
    }

    const data = await loadData(c.env, { readOnly: true })

    let maids = [...data.maids]
    if (search) {
      maids = maids.filter(
        (maid) =>
          maid.fullName.toLowerCase().includes(search) ||
          maid.referenceCode.toLowerCase().includes(search),
      )
    }

    if (visibility === "public" || visibility === "hidden") {
      const isPublic = visibility === "public"
      maids = maids.filter((maid) => maid.isPublic === isPublic)
    }

    if (agencyId != null) {
      maids = maids.filter((maid) => maid.agencyId === agencyId)
    }

    maids.sort(
      (left, right) =>
        new Date(right.updatedAt).getTime() -
        new Date(left.updatedAt).getTime(),
    )

    const total = maids.length
    const effectiveOffset = page != null && pageSize != null ? (page - 1) * pageSize : offset
    const pagedMaids = limit != null ? maids.slice(effectiveOffset, effectiveOffset + limit) : maids

    return c.json({
      maids: pagedMaids,
      total,
      page: page ?? 1,
      pageSize: limit ?? total,
    })
  }),
);

app.get(
  "/api/maids/export.csv",
  safeApi(async (c) => {
    const data = await loadData(c.env);
    const rows = data.maids.map((maid) =>
      csvColumns
        .map((column) => serializeCsvColumnValue(column, maid))
        .map(csvEscape)
        .join(","),
    );

    return new Response([csvColumns.join(","), ...rows].join("\n"), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="maids-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }),
);

app.get(
  "/api/maids/export.xls",
  safeApi(async (c) => {
    const data = await loadData(c.env);
    const rows = data.maids.map((maid) =>
      csvColumns
        .map((column) => serializeCsvColumnValue(column, maid))
        .map((value) =>
          String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;"),
        ),
    );

    const csvHeader = csvColumns.join(",");
    const csvRows = data.maids.map((maid) =>
      csvColumns
        .map((column) => serializeCsvColumnValue(column, maid))
        .map(csvEscape)
        .join(","),
    );
    const csv = [csvHeader, ...csvRows].join("\n");
    const csvBase64 = toBase64Utf8(csv);
    const fileDate = new Date().toISOString().slice(0, 10);

    const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Maids Export</title>
    <style>
      body { font-family: Arial, sans-serif; color: #111827; margin: 18px; }
      h1 { font-size: 18px; margin: 0 0 10px; }
      table { width: 100%; border-collapse: collapse; }
      thead th { background: #f3f4f6; font-weight: 700; }
      th, td { border: 1px solid #d1d5db; padding: 6px 8px; text-align: left; vertical-align: top; }
      tbody tr:nth-child(even) { background: #fafafa; }
      .meta { color: #6b7280; font-size: 12px; margin-bottom: 12px; }
    </style>
  </head>
  <body>
    <!--MAIDS_CSV_BASE64:${csvBase64}-->
    <h1>Maids Export</h1>
    <div class="meta">Generated: ${fileDate}</div>
    <table>
      <thead>
        <tr>${csvColumns.map((col) => `<th>${col}</th>`).join("")}</tr>
      </thead>
      <tbody>
        ${rows.map((cells) => `<tr>${cells.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}
      </tbody>
    </table>
  </body>
</html>`;

    return new Response(html, {
      headers: {
        "content-type": "application/vnd.ms-excel; charset=utf-8",
        "content-disposition": `attachment; filename="maids-${fileDate}.xls"`,
      },
    });
  }),
);

app.post(
  "/api/maids/import.csv",
  safeApi(async (c) => {
    const body = await parseBody<{ csv?: string }>(c.req.raw);
    if (!body?.csv?.trim()) {
      return c.json({ error: "CSV content is required" }, 400);
    }

    const data = await loadData(c.env);
    const { created, updated, errors } = applyCsvImportToData(data, body.csv);

    await saveData(c.env, data);
    return c.json(
      {
        message: "CSV import completed",
        created,
        updated,
        failed: errors.length,
        errors,
      },
      errors.length > 0 ? 207 : 200,
    );
  }),
);

app.post(
  "/api/maids/import.batch",
  safeApi(async (c) => {
    const body = await parseBody<{ operations?: MaidImportOperation[] }>(c.req.raw);
    const operations = Array.isArray(body?.operations) ? body.operations : [];

    if (operations.length === 0) {
      return c.json({ error: "At least one import operation is required" }, 400);
    }

    const data = await loadData(c.env);
    const results: MaidImportOperationResult[] = [];
    let created = 0;
    let updated = 0;
    let failed = 0;
    let changed = false;

    for (const [index, operation] of operations.entries()) {
      const fileName =
        typeof operation.fileName === "string" && operation.fileName.trim()
          ? operation.fileName.trim()
          : `Import ${index + 1}`;

      if (operation.type === "csv") {
        if (!operation.csv?.trim()) {
          failed += 1;
          results.push({
            fileName,
            created: 0,
            updated: 0,
            failed: 1,
            errors: ["CSV content is required"],
          });
          continue;
        }

        const result = applyCsvImportToData(data, operation.csv);
        created += result.created;
        updated += result.updated;
        changed ||= result.created > 0 || result.updated > 0;
        if (result.errors.length > 0) failed += 1;
        results.push({
          fileName,
          created: result.created,
          updated: result.updated,
          failed: result.errors.length > 0 ? 1 : 0,
          errors: result.errors,
        });
        continue;
      }

      if (operation.type === "profile") {
        if (!operation.payload || typeof operation.payload !== "object") {
          failed += 1;
          results.push({
            fileName,
            created: 0,
            updated: 0,
            failed: 1,
            errors: ["Maid profile payload is required"],
          });
          continue;
        }

        const result = upsertImportedMaidProfileInData(data, operation.payload);
        created += result.created;
        updated += result.updated;
        changed ||= result.created > 0 || result.updated > 0;
        if (result.errors.length > 0) failed += 1;
        results.push({
          fileName,
          created: result.created,
          updated: result.updated,
          failed: result.errors.length > 0 ? 1 : 0,
          errors: result.errors,
        });
        continue;
      }

      failed += 1;
      results.push({
        fileName,
        created: 0,
        updated: 0,
        failed: 1,
        errors: ["Unsupported import operation type"],
      });
    }

    if (changed) {
      await saveData(c.env, data);
    }

    return c.json(
      {
        message: "Batch import completed",
        created,
        updated,
        failed,
        results,
      },
      failed > 0 ? 207 : 200,
    );
  }),
);

app.get(
  "/api/maids/:referenceCode",
  safeApi(async (c) => {
    const config = getSupabaseAppDataConfig(c.env);
    if (config) {
      try {
        const maid = isNormalizedSupabaseEnabled(c.env)
          ? await getMaidFromSupabaseNormalized(config, c.req.param("referenceCode"))
          : await getMaidFromSupabaseAppView(config, c.req.param("referenceCode"));
        if (!maid) {
          return c.json({ error: "Maid not found" }, 404);
        }
        return c.json({ maid });
      } catch (error) {
        console.warn("Fast maid lookup path failed; falling back to app data", error);
      }
    }

    const data = await loadData(c.env);
    const maid = data.maids.find(
      (item) =>
        item.referenceCode ===
        normalizeReferenceCode(c.req.param("referenceCode")),
    );
    if (!maid) {
      return c.json({ error: "Maid not found" }, 404);
    }
    return c.json({ maid });
  }),
);

app.post(
  "/api/maids",
  safeApi(async (c) => {
    const body = await parseBody<Record<string, unknown>>(c.req.raw);
    if (!body) {
      return c.json({ error: "Invalid JSON body" }, 400);
    }

    const validationError = validateMaidPayload(body);
    if (validationError) {
      return c.json({ error: validationError }, 400);
    }

    const recordPayload = await persistMaidMediaFields(
      c.env,
      toMaidRecordPayload(body),
    );
    const config = getSupabaseAppDataConfig(c.env);
    if (config) {
      try {
        const maid = isNormalizedSupabaseEnabled(c.env)
          ? await upsertMaidInSupabaseNormalized(config, recordPayload, { create: true })
          : await createMaidInSupabaseAppData(config, recordPayload);
        return c.json({ maid }, 201);
      } catch (error) {
        if (error instanceof Error && error.message === "REFERENCE_CODE_EXISTS") {
          return c.json({ error: "Reference code already exists" }, 409);
        }
        console.warn("Fast maid create path failed; falling back to app data", error);
      }
    }

    const data = await loadData(c.env);
    if (data.maids.some((maid) => maid.referenceCode === recordPayload.referenceCode)) {
      return c.json({ error: "Reference code already exists" }, 409);
    }

    const maid: MaidRecord = {
      ...recordPayload,
      id: data.counters.maids++,
      createdAt: now(),
      updatedAt: now(),
    };
    data.maids.unshift(maid);
    await saveData(c.env, data);
    return c.json({ maid }, 201);
  }),
);

app.put(
  "/api/maids/:referenceCode",
  safeApi(async (c) => {
    const body = await parseBody<Record<string, unknown>>(c.req.raw);
    if (!body) {
      return c.json({ error: "Invalid JSON body" }, 400);
    }

    const validationError = validateMaidPayload(body);
    if (validationError) {
      return c.json({ error: validationError }, 400);
    }

    const referenceCode = normalizeReferenceCode(c.req.param("referenceCode"));
    const config = getSupabaseAppDataConfig(c.env);
    if (config) {
      try {
        const existing = isNormalizedSupabaseEnabled(c.env)
          ? await getMaidFromSupabaseNormalized(config, referenceCode)
          : null;
        const payload = await persistMaidMediaFields(
          c.env,
          toMaidRecordPayload({
            ...(existing ?? {}),
            ...body,
            status: body.status !== undefined ? body.status : existing?.status,
            photoDataUrl:
              body.photoDataUrl !== undefined ? body.photoDataUrl : existing?.photoDataUrl,
            photoDataUrls: Array.isArray(body.photoDataUrls)
              ? body.photoDataUrls
              : existing?.photoDataUrls,
            videoDataUrl:
              body.videoDataUrl !== undefined ? body.videoDataUrl : existing?.videoDataUrl,
          }),
        );
        const maid = isNormalizedSupabaseEnabled(c.env)
          ? await upsertMaidInSupabaseNormalized(config, payload, { create: false, referenceCode })
          : await updateMaidInSupabaseAppData(config, referenceCode, payload);
        if (!maid) {
          return c.json({ error: "Maid not found" }, 404);
        }
        return c.json({ maid });
      } catch (error) {
        if (error instanceof Error && error.message === "REFERENCE_CODE_EXISTS") {
          return c.json({ error: "Reference code already exists" }, 409);
        }
        console.warn("Fast maid update path failed; falling back to app data", error);
      }
    }

    const data = await loadData(c.env);
    const index = data.maids.findIndex(
      (maid) => maid.referenceCode === referenceCode,
    );
    if (index === -1) {
      return c.json({ error: "Maid not found" }, 404);
    }

    const payload = await persistMaidMediaFields(
      c.env,
      toMaidRecordPayload({
        ...data.maids[index],
        ...body,
        status:
          body.status !== undefined ? body.status : data.maids[index].status,
        photoDataUrl:
          body.photoDataUrl !== undefined
            ? body.photoDataUrl
            : data.maids[index].photoDataUrl,
        photoDataUrls: Array.isArray(body.photoDataUrls)
          ? body.photoDataUrls
          : data.maids[index].photoDataUrls,
        videoDataUrl:
          body.videoDataUrl !== undefined
            ? body.videoDataUrl
            : data.maids[index].videoDataUrl,
      }),
    );

    const duplicate = data.maids.find(
      (maid) =>
        maid.referenceCode === payload.referenceCode &&
        maid.referenceCode !== referenceCode,
    );
    if (duplicate) {
      return c.json({ error: "Reference code already exists" }, 409);
    }

    data.maids[index] = {
      ...data.maids[index],
      ...payload,
      updatedAt: now(),
    };
    await saveData(c.env, data);
    return c.json({ maid: data.maids[index] });
  }),
);

app.patch(
  "/api/maids/:referenceCode/visibility",
  safeApi(async (c) => {
    const body = await parseBody<{ isPublic?: boolean }>(c.req.raw);
    if (typeof body?.isPublic !== "boolean") {
      return c.json({ error: "isPublic boolean is required" }, 400);
    }

    const config = getSupabaseAppDataConfig(c.env);
    if (config) {
      try {
        const maid = isNormalizedSupabaseEnabled(c.env)
          ? await updateMaidVisibilityInSupabaseNormalized(
              config,
              c.req.param("referenceCode"),
              body.isPublic,
            )
          : await updateMaidVisibilityInSupabaseAppData(
              config,
              c.req.param("referenceCode"),
              body.isPublic,
            );
        if (!maid) {
          return c.json({ error: "Maid not found" }, 404);
        }
        return c.json({ maid });
      } catch (error) {
        console.warn("Fast maid visibility path failed; falling back to app data", error);
      }
    }

    const data = await loadData(c.env);
    const index = data.maids.findIndex(
      (maid) =>
        maid.referenceCode ===
        normalizeReferenceCode(c.req.param("referenceCode")),
    );
    if (index === -1) {
      return c.json({ error: "Maid not found" }, 404);
    }

    data.maids[index] = {
      ...data.maids[index],
      isPublic: body.isPublic,
      updatedAt: now(),
    };
    await saveData(c.env, data);
    return c.json({ maid: data.maids[index] });
  }),
);

app.patch(
  "/api/maids/:referenceCode/photo",
  safeApi(async (c) => {
    const body = await parseBody<{ photoDataUrl?: string }>(c.req.raw);
    if (typeof body?.photoDataUrl !== "string") {
      return c.json({ error: "photoDataUrl string is required" }, 400);
    }

    const data = await loadData(c.env);
    const index = data.maids.findIndex(
      (maid) =>
        maid.referenceCode ===
        normalizeReferenceCode(c.req.param("referenceCode")),
    );
    if (index === -1) {
      return c.json({ error: "Maid not found" }, 404);
    }

    const photoDataUrl = await uploadMaidMediaToSupabaseStorage(
      c.env,
      body.photoDataUrl,
      data.maids[index].agencyId,
      data.maids[index].referenceCode,
      "photos",
      0,
    );

    data.maids[index] = {
      ...data.maids[index],
      photoDataUrl,
      photoDataUrls: photoDataUrl ? [photoDataUrl] : [],
      hasPhoto: Boolean(photoDataUrl),
      updatedAt: now(),
    };
    await saveData(c.env, data);
    return c.json({ maid: data.maids[index] });
  }),
);

app.patch(
  "/api/maids/:referenceCode/photos",
  safeApi(async (c) => {
    const body = await parseBody<{ photoDataUrl?: string }>(c.req.raw);
    if (typeof body?.photoDataUrl !== "string" || !body.photoDataUrl.trim()) {
      return c.json({ error: "photoDataUrl string is required" }, 400);
    }

    const data = await loadData(c.env);
    const index = data.maids.findIndex(
      (maid) =>
        maid.referenceCode ===
        normalizeReferenceCode(c.req.param("referenceCode")),
    );
    if (index === -1) {
      return c.json({ error: "Maid not found" }, 404);
    }

    const photos = Array.isArray(data.maids[index].photoDataUrls)
      ? [...data.maids[index].photoDataUrls]
      : data.maids[index].photoDataUrl
        ? [data.maids[index].photoDataUrl]
        : [];

    if (photos.length >= 5) {
      return c.json({ error: "Maximum 5 photos allowed per maid" }, 400);
    }

    photos.push(
      await uploadMaidMediaToSupabaseStorage(
        c.env,
        body.photoDataUrl,
        data.maids[index].agencyId,
        data.maids[index].referenceCode,
        "photos",
        photos.length,
      ),
    );
    data.maids[index] = {
      ...data.maids[index],
      photoDataUrls: photos,
      photoDataUrl: photos[0] ?? "",
      hasPhoto: photos.length > 0,
      updatedAt: now(),
    };
    await saveData(c.env, data);
    return c.json({ maid: data.maids[index] });
  }),
);

app.put(
  "/api/maids/:referenceCode/photo-gallery",
  safeApi(async (c) => {
    const body = await parseBody<{ photoDataUrls?: string[] }>(c.req.raw);
    if (!Array.isArray(body?.photoDataUrls)) {
      return c.json({ error: "photoDataUrls array is required" }, 400);
    }

    const data = await loadData(c.env);
    const index = data.maids.findIndex(
      (maid) =>
        maid.referenceCode ===
        normalizeReferenceCode(c.req.param("referenceCode")),
    );
    if (index === -1) {
      return c.json({ error: "Maid not found" }, 404);
    }

    const incomingPhotos = body.photoDataUrls
      .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      .slice(0, 5);
    const photoDataUrls = await Promise.all(
      incomingPhotos.map((photo, photoIndex) =>
        uploadMaidMediaToSupabaseStorage(
          c.env,
          photo,
          data.maids[index].agencyId,
          data.maids[index].referenceCode,
          "photos",
          photoIndex,
        ),
      ),
    );

    data.maids[index] = {
      ...data.maids[index],
      photoDataUrls,
      photoDataUrl: photoDataUrls[0] ?? "",
      hasPhoto: photoDataUrls.length > 0,
      updatedAt: now(),
    };
    await saveData(c.env, data);
    return c.json({ maid: data.maids[index] });
  }),
);

app.patch(
  "/api/maids/:referenceCode/video",
  safeApi(async (c) => {
    const body = await parseBody<{ videoDataUrl?: string }>(c.req.raw);
    if (typeof body?.videoDataUrl !== "string") {
      return c.json({ error: "videoDataUrl string is required" }, 400);
    }

    const data = await loadData(c.env);
    const index = data.maids.findIndex(
      (maid) =>
        maid.referenceCode ===
        normalizeReferenceCode(c.req.param("referenceCode")),
    );
    if (index === -1) {
      return c.json({ error: "Maid not found" }, 404);
    }

    const videoDataUrl = await uploadMaidMediaToSupabaseStorage(
      c.env,
      body.videoDataUrl,
      data.maids[index].agencyId,
      data.maids[index].referenceCode,
      "videos",
      0,
    );

    data.maids[index] = {
      ...data.maids[index],
      videoDataUrl,
      updatedAt: now(),
    };
    await saveData(c.env, data);
    return c.json({ maid: data.maids[index] });
  }),
);

app.delete(
  "/api/maids/:referenceCode",
  safeApi(async (c) => {
    const data = await loadData(c.env);
    const referenceCode = normalizeReferenceCode(c.req.param("referenceCode"));
    const existing = data.maids.find(
      (maid) => maid.referenceCode === referenceCode,
    );
    if (!existing) {
      return c.json({ error: "Maid not found" }, 404);
    }

    data.maids = data.maids.filter(
      (maid) => maid.referenceCode !== referenceCode,
    );
    await saveData(c.env, data);
    return c.json({ message: "Maid deleted successfully" });
  }),
);

const compareReferenceCodes = (left: string | undefined, right: string | undefined) =>
  String(left ?? "").localeCompare(String(right ?? ""), undefined, {
    numeric: true,
    sensitivity: "base",
  });

app.get(
  "/api/employers",
  safeApi(async (c) => {
    const data = await loadData(c.env);
    const employers = [...data.employers].sort((left, right) =>
      compareReferenceCodes(left.refCode, right.refCode),
    );
    return c.json({ employers });
  }),
);

app.get(
  "/api/employers/:refCode",
  safeApi(async (c) => {
    const data = await loadData(c.env);
    const refCode = toTrimmedString(c.req.param("refCode"));
    const employer =
      data.employers.find((item) => item.refCode === refCode) ?? null;
    if (!employer) {
      return c.json({ error: "Employer not found" }, 404);
    }
    return c.json({ employer });
  }),
);

app.post(
  "/api/employers",
  safeApi(async (c) => {
    const body = await parseBody<{
      refCode?: string | null;
      existingRefCode?: string | null;
      maid?: Record<string, unknown>;
      agency?: Record<string, unknown>;
      employer?: Record<string, unknown>;
      spouse?: Record<string, unknown>;
      familyMembers?: Array<Record<string, unknown>>;
      notificationDate?: Record<string, unknown>;
      documents?: Array<{
        category?: string;
        fileUrl?: string;
        fileName?: string;
      }>;
    }>(c.req.raw);
    if (!body) {
      return c.json({ error: "Invalid JSON body" }, 400);
    }

    const employerPayload =
      body.employer && typeof body.employer === "object" ? body.employer : {};
    const agencyPayload =
      body.agency && typeof body.agency === "object" ? body.agency : {};
    const maidPayload =
      body.maid && typeof body.maid === "object" ? body.maid : {};
    const employerName = toTrimmedString(
      (employerPayload as { name?: unknown }).name,
    );

    if (!employerName) {
      return c.json({ error: "employer.name is required" }, 400);
    }

    const data = await loadData(c.env);
    const existingRefCode = toTrimmedString(body.existingRefCode);
    const incomingRef =
      toTrimmedString(body.refCode) ||
      toTrimmedString(
        (agencyPayload as { caseReferenceNumber?: unknown }).caseReferenceNumber,
      );
    const existingIndex = existingRefCode
      ? data.employers.findIndex((item) => item.refCode === existingRefCode)
      : incomingRef
      ? data.employers.findIndex((item) => item.refCode === incomingRef)
      : -1;

    if (
      incomingRef &&
      existingRefCode &&
      incomingRef !== existingRefCode &&
      data.employers.some(
        (item, index) => item.refCode === incomingRef && index !== existingIndex,
      )
    ) {
      return c.json({ error: "Reference number already in use" }, 409);
    }

    const id =
      existingIndex === -1
        ? data.counters.employers++
        : data.employers[existingIndex].id;
    const refCode = incomingRef || formatEmployerRefCode(id);
    const normalizedAgency = {
      ...agencyPayload,
      caseReferenceNumber:
        toTrimmedString(
          (agencyPayload as { caseReferenceNumber?: unknown }).caseReferenceNumber,
        ) || refCode,
    };

    const employerRecord: EmployerContractRecord = {
      id,
      refCode,
      maid: maidPayload,
      agency: normalizedAgency,
      employer: employerPayload,
      spouse: body.spouse && typeof body.spouse === "object" ? body.spouse : {},
      familyMembers: Array.isArray(body.familyMembers) ? body.familyMembers : [],
      notificationDate:
        body.notificationDate && typeof body.notificationDate === "object"
          ? body.notificationDate
          : {},
      documents: Array.isArray(body.documents)
        ? body.documents
            .map((document) => ({
              category: toTrimmedString(document.category),
              fileUrl: toTrimmedString(document.fileUrl),
              fileName: toTrimmedString(document.fileName),
            }))
            .filter(
              (document) =>
                document.category && document.fileUrl && document.fileName,
            )
        : [],
      createdAt:
        existingIndex === -1 ? now() : data.employers[existingIndex].createdAt,
      updatedAt: now(),
    };

    if (existingIndex === -1) {
      data.employers.unshift(employerRecord);
    } else {
      data.employers[existingIndex] = employerRecord;
    }

    const existingEmploymentContractIndex = data.employmentContracts.findIndex(
      (item) =>
        item.refCode === existingRefCode ||
        item.employerRefCode === existingRefCode ||
        item.refCode === refCode ||
        item.employerRefCode === refCode,
    );
    const employmentContractId =
      existingEmploymentContractIndex === -1
        ? data.counters.employmentContracts++
        : data.employmentContracts[existingEmploymentContractIndex].id;
    const employmentContractRecord = normalizeEmploymentContractRecord(
      {
        id: employmentContractId,
        refCode,
        employerRefCode: refCode,
        employerId: id,
        maidId:
          toNullableNumber((maidPayload as { id?: unknown; maidId?: unknown }).id) ??
          toNullableNumber((maidPayload as { maidId?: unknown }).maidId),
        maidReferenceCode: toTrimmedString(
          (maidPayload as { referenceCode?: unknown }).referenceCode,
        ),
        maidName:
          toTrimmedString((maidPayload as { fullName?: unknown }).fullName) ||
          toTrimmedString((maidPayload as { name?: unknown }).name),
        employerName,
        caseReferenceNumber: toTrimmedString(
          (normalizedAgency as { caseReferenceNumber?: unknown }).caseReferenceNumber,
        ),
        contractDate: toTrimmedString(
          (normalizedAgency as { contractDate?: unknown }).contractDate,
        ),
        serviceFee: toTrimmedString(
          (normalizedAgency as { serviceFee?: unknown }).serviceFee,
        ),
        placementFee: toTrimmedString(
          (normalizedAgency as { placementFee?: unknown }).placementFee,
        ),
        agencyWitness: toTrimmedString(
          (normalizedAgency as { agencyWitness?: unknown }).agencyWitness,
        ),
        employerSnapshot: employerPayload,
        maidSnapshot: maidPayload,
        createdAt:
          existingEmploymentContractIndex === -1
            ? now()
            : data.employmentContracts[existingEmploymentContractIndex].createdAt,
        updatedAt: now(),
      },
      refCode,
    );

    if (existingEmploymentContractIndex === -1) {
      data.employmentContracts.unshift(employmentContractRecord);
    } else {
      data.employmentContracts[existingEmploymentContractIndex] =
        employmentContractRecord;
    }

    await saveData(c.env, data);

    return c.json({
      employer: employerRecord,
      employmentContract: {
        refCode: employerRecord.refCode,
        caseReferenceNumber: toTrimmedString(
          (employerRecord.agency as { caseReferenceNumber?: unknown })
            .caseReferenceNumber,
        ),
        contractDate: toTrimmedString(
          (employerRecord.agency as { contractDate?: unknown }).contractDate,
        ),
        serviceFee: toTrimmedString(
          (employerRecord.agency as { serviceFee?: unknown }).serviceFee,
        ),
        placementFee: toTrimmedString(
          (employerRecord.agency as { placementFee?: unknown }).placementFee,
        ),
        agencyWitness: toTrimmedString(
          (employerRecord.agency as { agencyWitness?: unknown }).agencyWitness,
        ),
      },
    });
  }),
);

app.post(
  "/api/employment-contract",
  safeApi(async (c) => {
    const request = new Request(new URL("/api/employers", c.req.url), {
      method: "POST",
      headers: c.req.raw.headers,
      body: await c.req.raw.clone().text(),
    });
    return app.fetch(request, c.env);
  }),
);

app.delete(
  "/api/employers/:refCode",
  safeApi(async (c) => {
    const data = await loadData(c.env);
    const refCode = toTrimmedString(c.req.param("refCode"));
    const existing =
      data.employers.find((item) => item.refCode === refCode) ?? null;
    if (!existing) {
      return c.json({ error: "Employer not found" }, 404);
    }

    data.employers = data.employers.filter((item) => item.refCode !== refCode);
    data.employmentContracts = data.employmentContracts.filter(
      (item) => item.refCode !== refCode && item.employerRefCode !== refCode,
    );
    await saveData(c.env, data);
    return c.json({ message: "Employer deleted successfully" });
  }),
);

app.get("/api/enquiries", async (c) => {
  const search = c.req.query("search")?.trim().toLowerCase();
  const data = await loadData(c.env);
  let enquiries = [...data.enquiries];
  if (search) {
    enquiries = enquiries.filter((item) =>
      [item.username, item.email, item.phone, item.message]
        .join(" ")
        .toLowerCase()
        .includes(search),
    );
  }
  enquiries = enquiries.map((item) => enrichEnquiryWithClient(item, data.clients));
  enquiries.sort((left, right) => right.id - left.id);
  return c.json({ enquiries });
});

app.get("/api/enquiries/unread-count", async (c) => {
  const data = await loadData(c.env);
  return c.json({
    unreadCount: data.enquiries.length,
    count: data.enquiries.length,
  });
});

app.get("/api/enquiry/unread-count", async (c) => {
  const data = await loadData(c.env);
  return c.json({
    unreadCount: data.enquiries.length,
    count: data.enquiries.length,
  });
});

app.get("/api/enquiries/last-id", async (c) => {
  const data = await loadData(c.env);
  const lastId = data.enquiries.reduce(
    (maxId, enquiry) => Math.max(maxId, enquiry.id),
    0,
  );
  return c.json({ lastId });
});

app.get("/api/enquiries/stream", async (c) => {
  const url = new URL(c.req.url);
  const afterId = Number(url.searchParams.get("afterId") ?? 0);
  if (!Number.isFinite(afterId) || afterId < 0) {
    return c.json({ error: "afterId must be a non-negative number" }, 400);
  }

  const startedAt = Date.now();
  return createSseResponse(c.req.raw, async (controller) => {
    let lastId = afterId;
    let lastHeartbeat = Date.now();
    writeSseEvent(controller, "ready", { ok: true });

    while (!c.req.raw.signal.aborted && Date.now() - startedAt < 60_000) {
      const data = await loadData(c.env);
      const nextEnquiries = data.enquiries
        .filter((enquiry) => enquiry.id > lastId)
        .sort((left, right) => left.id - right.id);

      for (const enquiry of nextEnquiries) {
        writeSseEvent(controller, "enquiry", { enquiry: enrichEnquiryWithClient(enquiry, data.clients) });
        lastId = Math.max(lastId, enquiry.id);
      }

      const nowTime = Date.now();
      if (nowTime - lastHeartbeat > 15_000) {
        writeSseComment(controller, "keep-alive");
        lastHeartbeat = nowTime;
      }

      await sleep(1200);
    }
  });
});

app.post("/api/enquiries", async (c) => {
  const body = await parseBody<{
    username?: string;
    date?: string;
    email?: string;
    phone?: string;
    message?: string;
  }>(c.req.raw);

  if (!body?.username || !body.email || !body.phone || !body.message) {
    return c.json(
      { error: "username, email, phone, and message are required" },
      400,
    );
  }

  const data = await loadData(c.env);
  const enquiry: EnquiryRecord = {
    id: data.counters.enquiries++,
    username: body.username,
    date: body.date || buildFallbackDate(),
    email: body.email,
    phone: body.phone,
    message: body.message,
    createdAt: now(),
  };
  data.enquiries.unshift(enquiry);
  await saveData(c.env, data);
  return c.json({ enquiry }, 201);
});

function normalizePhone(phone: string | undefined) {
  return String(phone || "").replace(/\D+/g, "").replace(/^0+/, "").trim();
}

function enrichEnquiryWithClient(enquiry: EnquiryRecord, clients: Array<{ id: number; email?: string; phone?: string; name?: string }>) {
  const normalizedPhone = normalizePhone(enquiry.phone);
  const client = clients.find((item) => {
    if (item.email && enquiry.email && item.email.trim().toLowerCase() === enquiry.email.trim().toLowerCase()) {
      return true;
    }
    if (normalizedPhone && item.phone && normalizePhone(item.phone) === normalizedPhone) {
      return true;
    }
    return false;
  });

  if (!client) {
    return enquiry;
  }

  return {
    ...enquiry,
    clientId: client.id,
    clientName: client.name ?? enquiry.username,
  };
}

app.delete("/api/enquiries/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const data = await loadData(c.env);
  const existing = data.enquiries.find((item) => item.id === id);
  if (!existing) {
    return c.json({ error: "Enquiry not found" }, 404);
  }

  data.enquiries = data.enquiries.filter((item) => item.id !== id);
  await saveData(c.env, data);
  return c.json({ message: "Enquiry deleted successfully" });
});

app.get("/api/requests/unread-count", async (c) => {
  const data = await loadData(c.env);
  const pendingRequests = data.directSales.filter(
    (item) => item.status === "pending",
  ).length;

  return c.json({
    unreadCount: pendingRequests,
    count: pendingRequests,
  });
});

const WORKFLOW_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isAvailableMaid = (maid: MaidRecord) =>
  maid.isPublic &&
  !["inactive", "archived"].includes(
    String(maid.status ?? "available").toLowerCase(),
  );

const buildMatchCandidates = (maids: MaidRecord[], message: string) => {
  const lowerMessage = message.toLowerCase();

  return maids
    .filter(isAvailableMaid)
    .slice(0, 3)
    .map((maid, index) => {
      const reasons = [
        `${maid.nationality} helper profile is publicly available`,
        `Current status: ${maid.status ?? "available"}`,
      ];

      if (lowerMessage.includes("childcare")) {
        reasons.push("Message mentions childcare requirements");
      } else if (lowerMessage.includes("elderly")) {
        reasons.push("Message mentions elderly care requirements");
      } else if (lowerMessage.includes("house")) {
        reasons.push("Message mentions housekeeping support");
      }

      return {
        maidId: maid.id,
        maidReferenceCode: maid.referenceCode,
        maidName: maid.fullName,
        score: Math.max(70, 95 - index * 7),
        reasons,
      };
    });
};

const classifyInquiryIntent = (message: string) => {
  const workflow = classifyFallback(message).workflow;
  if (workflow === "inquiry_match") {
    return "hiring" as const;
  }
  if (workflow === "human_review") {
    return "complaint" as const;
  }
  return "inquiry" as const;
};

const workflowForIntent = (
  intent: ReturnType<typeof classifyInquiryIntent>,
) => {
  if (intent === "hiring") {
    return "inquiry_match" as const;
  }
  if (intent === "complaint") {
    return "human_review" as const;
  }
  return "inquiry_only" as const;
};

const buildInquiryReply = (
  intent: ReturnType<typeof classifyInquiryIntent>,
  matchesCount: number,
) => {
  if (intent === "hiring" && matchesCount > 0) {
    return `Thanks for reaching out. We shortlisted ${matchesCount} maid profile${matchesCount === 1 ? "" : "s"} for follow-up.`;
  }
  if (intent === "hiring") {
    return "Thanks for reaching out. We have logged your hiring request and our team will follow up with suitable profiles shortly.";
  }
  if (intent === "complaint") {
    return "Thanks for letting us know. We have logged your concern and a team member will follow up shortly.";
  }
  return "Thanks for reaching out. We have logged your inquiry and our team will get back to you shortly.";
};

const inferLeadEnrichment = (message: string) => {
  const lower = message.toLowerCase();
  const budgetMatch =
    message.match(/(?:sgd|s\\$|\\$)\\s*(\\d{3,5})/i) ??
    message.match(/budget\\s*(\\d{3,5})/i);
  const budgetValue = budgetMatch ? Number(budgetMatch[1]) : null;
  const serviceType = lower.includes("childcare")
    ? "childcare"
    : lower.includes("elderly")
      ? "elderly_care"
      : lower.includes("house")
        ? "housekeeping"
        : "general_housekeeping";
  const urgency = /(urgent|asap|immediately|today|tomorrow)/.test(lower)
    ? "high"
    : "normal";
  const locationMatch = message.match(
    /(woodlands|tampines|yishun|jurong|bedok|hougang|toa payoh|singapore)/i,
  );
  const location = locationMatch ? locationMatch[1] : "Singapore";

  return {
    serviceType,
    budget: {
      min: budgetValue,
      max: budgetValue,
      currency: "SGD",
      text: budgetMatch?.[0] ?? "",
    },
    urgency,
    location,
    summary: `${serviceType.replace(/_/g, " ")} request in ${location}${budgetValue ? ` with budget ${budgetValue} SGD` : ""}`.trim(),
  };
};

const qualifyLead = (
  enrichment: ReturnType<typeof inferLeadEnrichment>,
  message: string,
) => {
  let score = 45;
  const reasons: string[] = [];

  if (enrichment.serviceType !== "general_housekeeping") {
    score += 15;
    reasons.push(`Service type detected: ${enrichment.serviceType}`);
  }

  if (enrichment.budget.min) {
    score += 15;
    reasons.push(`Budget captured: ${enrichment.budget.min} SGD`);
  }

  if (enrichment.urgency === "high") {
    score += 15;
    reasons.push("Customer indicated high urgency");
  }

  if (enrichment.location && enrichment.location !== "Singapore") {
    score += 10;
    reasons.push(`Location identified: ${enrichment.location}`);
  }

  if (message.trim().length > 40) {
    score += 10;
    reasons.push("Message includes enough detail for follow-up");
  }

  return {
    score,
    classification: score >= 80 ? "HIGH" : score >= 60 ? "MEDIUM" : "LOW",
    reasons,
  };
};

app.post(
  "/api/inquiry",
  safeApi(async (c) => {
    const body = await parseBody<{
      name?: string;
      contact?: string;
      message?: string;
      employerId?: number | null;
    }>(c.req.raw);

    const name = toTrimmedString(body?.name) || "Unknown";
    const contact = toTrimmedString(body?.contact);
    const message = toTrimmedString(body?.message);

    if (!message) {
      return c.json(
        buildWorkflowResponse(c.req.raw, {
          workflow: "validation_error",
          intent: "validation_error",
          fallbackUsed: true,
          data: { error: "message is required" },
        }),
        400,
      );
    }

    const data = await loadData(c.env);
    const fallback = classifyFallback(message);
    const intent = classifyInquiryIntent(message);
    const workflow = normalizeWorkflow(
      fallback.workflow === "inquiry_match"
        ? workflowForIntent(intent)
        : fallback.workflow === "inquiry_only"
          ? ("inquiry_only" as const)
          : fallback.workflow,
    );
    const matches =
      intent === "hiring" ? buildMatchCandidates(data.maids, message) : [];
    const reply = buildInquiryReply(intent, matches.length);

    const enquiry: EnquiryRecord = {
      id: data.counters.enquiries++,
      username: name,
      date: buildFallbackDate(),
      email: WORKFLOW_EMAIL_PATTERN.test(contact) ? contact : "",
      phone: WORKFLOW_EMAIL_PATTERN.test(contact) ? "" : contact,
      message,
      createdAt: now(),
    };

    data.enquiries.unshift(enquiry);
    await saveData(c.env, data);

    const responseBody = buildWorkflowResponse(c.req.raw, {
      workflow,
      intent,
      fallbackUsed: true,
      fallbackProvider: "deterministic",
      data: {
        inquiry: {
          id: enquiry.id,
          name,
          contact,
          message,
          intent,
          workflow,
          reply,
          aiUsed: false,
          createdAt: enquiry.createdAt,
        },
        matches: matches.length > 0 ? matches : undefined,
        reply,
      },
    });

    return c.json(responseBody);
  }),
);

app.post(
  "/api/inquiry/make",
  safeApi(async (c) => {
    const body = await parseBody<{
      name?: string;
      contact?: string;
      message?: string;
      employerId?: number | null;
      makeScenario?: string;
      makeUrl?: string;
      source?: string;
      channel?: string;
      conversationId?: string;
      messageId?: string;
      receivedAt?: string;
      metadata?: Record<string, unknown>;
    }>(c.req.raw);

    const name = toTrimmedString(body?.name) || "Unknown";
    const contact = toTrimmedString(body?.contact);
    const message = toTrimmedString(body?.message);

    if (!message) {
      return c.json(
        buildWorkflowResponse(c.req.raw, {
          workflow: "validation_error",
          intent: "validation_error",
          fallbackUsed: true,
          data: { error: "message is required" },
        }),
        400,
      );
    }

    const data = await loadData(c.env);
    const fallback = classifyFallback(message);
    const intent = classifyInquiryIntent(message);
    const workflow = normalizeWorkflow(
      fallback.workflow === "inquiry_match"
        ? workflowForIntent(intent)
        : fallback.workflow === "inquiry_only"
          ? ("inquiry_only" as const)
          : fallback.workflow,
    );
    const matches =
      intent === "hiring" ? buildMatchCandidates(data.maids, message) : [];
    const reply = buildInquiryReply(intent, matches.length);

    const enquiry: EnquiryRecord = {
      id: data.counters.enquiries++,
      username: name,
      date: buildFallbackDate(),
      email: WORKFLOW_EMAIL_PATTERN.test(contact) ? contact : "",
      phone: WORKFLOW_EMAIL_PATTERN.test(contact) ? "" : contact,
      message,
      createdAt: now(),
    };

    data.enquiries.unshift(enquiry);
    await saveData(c.env, data);

    const webhookUrl = toTrimmedString(body?.makeUrl) || toTrimmedString(c.env.MAKE_WEBHOOK_URL);
    let makeTriggered = false;
    let makeDelivery: Record<string, unknown> | null = null;

    if (webhookUrl) {
      const startedAt = Date.now();
      try {
        const response = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: "inquiry.processed",
            inquiryId: enquiry.id,
            intent,
            workflow,
            fallbackUsed: true,
            fallbackProvider: "deterministic",
            matches,
            reply,
            name,
            contact,
            message,
            employerId: body?.employerId ?? null,
            source: toTrimmedString(body?.source) || "make_ai_agent",
            channel: toTrimmedString(body?.channel) || "webhook",
            conversationId: toTrimmedString(body?.conversationId),
            messageId: toTrimmedString(body?.messageId),
            receivedAt: toTrimmedString(body?.receivedAt),
            metadata:
              body?.metadata && typeof body.metadata === "object" ? body.metadata : {},
          }),
        });

        makeTriggered = response.ok;
        makeDelivery = {
          success: response.ok,
          statusCode: response.status,
          durationMs: Date.now() - startedAt,
          responseBody: await response.text().catch(() => ""),
        };
      } catch (error) {
        makeDelivery = {
          success: false,
          statusCode: null,
          durationMs: Date.now() - startedAt,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    } else {
      makeDelivery = {
        success: false,
        statusCode: null,
        error: "MAKE_WEBHOOK_URL is not configured",
      };
    }

    const responseBody = buildWorkflowResponse(c.req.raw, {
      workflow,
      intent,
      fallbackUsed: true,
      fallbackProvider: "deterministic",
      data: {
        inquiry: {
          id: enquiry.id,
          name,
        contact,
        message,
        intent,
        workflow,
        reply,
        aiUsed: false,
        createdAt: enquiry.createdAt,
        },
        matches: matches.length > 0 ? matches : undefined,
        reply,
        makeTriggered,
        makeDelivery,
      },
    });

    return c.json(responseBody);
  }),
);

app.post(
  "/api/ai/processInquiry",
  safeApi(async (c) => {
    const body = await parseBody<{
      requestId?: string;
      name?: string;
      contact?: string;
      message?: string;
      employerId?: number | null;
    }>(c.req.raw);

    const name = toTrimmedString(body?.name) || "Unknown";
    const contact = toTrimmedString(body?.contact);
    const message = toTrimmedString(body?.message);
    const requestId = toTrimmedString(body?.requestId) || crypto.randomUUID();

    if (!message) {
      return c.json(
        buildWorkflowResponse(c.req.raw, {
          workflow: "validation_error",
          intent: "validation_error",
          fallbackUsed: true,
          data: { error: "message is required" },
        }),
        400,
      );
    }

    const data = await loadData(c.env);
    const fallback = classifyFallback(message);
    const intent = classifyInquiryIntent(message);
    const workflow = normalizeWorkflow(
      fallback.workflow === "inquiry_match"
        ? workflowForIntent(intent)
        : fallback.workflow === "inquiry_only"
          ? ("inquiry_only" as const)
          : fallback.workflow,
    );
    const matches =
      intent === "hiring" ? buildMatchCandidates(data.maids, message) : [];
    const reply = buildInquiryReply(intent, matches.length);

    const enquiry: EnquiryRecord = {
      id: data.counters.enquiries++,
      username: name,
      date: buildFallbackDate(),
      email: WORKFLOW_EMAIL_PATTERN.test(contact) ? contact : "",
      phone: WORKFLOW_EMAIL_PATTERN.test(contact) ? "" : contact,
      message,
      createdAt: now(),
    };

    data.enquiries.unshift(enquiry);
    await saveData(c.env, data);

    const responseBody = buildWorkflowResponse(c.req.raw, {
      workflow,
      intent,
      fallbackUsed: true,
      fallbackProvider: "deterministic",
      data: {
        requestId,
        inquiry: {
          id: enquiry.id,
          name,
          contact,
          message,
          intent,
          workflow,
          reply,
          aiUsed: false,
          createdAt: enquiry.createdAt,
        },
        matches: matches.length > 0 ? matches : undefined,
        reply,
        classifier: {
          intent,
          workflow,
          reply,
        },
      },
    });

    return c.json(responseBody);
  }),
);

app.post(
  "/api/leads/raw",
  safeApi(async (c) => {
    const body = await parseBody<{
      source?: string;
      name?: string;
      contact?: string;
      message?: string;
    }>(c.req.raw);

    const source =
      toTrimmedString(body?.source).toLowerCase() === "facebook"
        ? "facebook"
        : toTrimmedString(body?.source).toLowerCase() === "scraped"
          ? "scraped"
          : "website";
    const name = toTrimmedString(body?.name);
    const contact = toTrimmedString(body?.contact);
    const message = toTrimmedString(body?.message);

    if (!name || !contact || !message) {
      return c.json(
        buildWorkflowResponse(c.req.raw, {
          workflow: "validation_error",
          intent: "validation_error",
          fallbackUsed: true,
          data: { error: "name, contact, and message are required" },
        }),
        400,
      );
    }

    const enrichment = inferLeadEnrichment(message);
    const qualification = qualifyLead(enrichment, message);
    const data = await loadData(c.env);
    const leadId = data.counters.directSales++;
    const createdAt = now();

    data.directSales.unshift({
      id: leadId,
      maidReferenceCode: "",
      maidName: "",
      clientId: 0,
      clientName: name,
      clientEmail: WORKFLOW_EMAIL_PATTERN.test(contact) ? contact : "",
      clientPhone: WORKFLOW_EMAIL_PATTERN.test(contact) ? "" : contact,
      status: qualification.classification,
      requestDetails: {
        source,
        message,
        aiSummary: enrichment.summary,
      },
      createdAt,
    });
    await saveData(c.env, data);

    return c.json(
      buildWorkflowResponse(c.req.raw, {
        workflow: "lead_scoring",
        intent: "lead",
        fallbackUsed: true,
        data: {
          lead: {
            id: leadId,
            name,
          source,
          classification: qualification.classification,
          aiSummary: enrichment.summary,
          createdAt,
        },
        enrichment,
        qualification,
          notification: {
            id: leadId,
            recipient: "sales-team",
            message: `New ${qualification.classification} lead received from ${source}: ${name}`,
          },
          aiUsed: false,
        },
      }),
      201,
    );
  }),
);

app.post(
  "/api/match",
  safeApi(async (c) => {
    const body = await parseBody<{
      message?: string;
      serviceType?: string;
      location?: string;
      budget?: string;
      salary?: string;
      availability?: string;
    }>(c.req.raw);
    const message = toTrimmedString(body?.message);
    const data = await loadData(c.env);
    const matches = buildMatchCandidates(data.maids, message);

    return c.json(
      buildWorkflowResponse(c.req.raw, {
        workflow: "inquiry_match",
        intent: "hiring",
        fallbackUsed: true,
        data: {
          requestId: crypto.randomUUID(),
          screening: {
            valid: Boolean(message),
            missingFields: message ? [] : ["message"],
            normalized: {
              message,
              serviceType: toTrimmedString(body?.serviceType),
              location: toTrimmedString(body?.location),
              budget: toTrimmedString(body?.budget),
              salary: toTrimmedString(body?.salary),
              availability: toTrimmedString(body?.availability),
            },
          },
          vectorSearch: {
            used: Boolean(message),
            candidateCount: data.maids.filter(isAvailableMaid).length,
          },
          aiUsed: false,
          fallbackUsed: true,
          matches,
        },
      }),
    );
  }),
);

app.post(
  "/api/contracts/generate",
  safeApi(async (c) => {
    const body = await parseBody<{
      maidId?: number | null;
      employerId?: number | null;
      serviceType?: string;
      location?: string;
      budgetText?: string;
      scheduleDate?: string;
    }>(c.req.raw);

    const maidId = toNullableNumber(body?.maidId);
    const employerId = toNullableNumber(body?.employerId);

    if (!maidId || !employerId) {
      return c.json(
        buildWorkflowResponse(c.req.raw, {
          workflow: "validation_error",
          intent: "validation_error",
          fallbackUsed: true,
          data: { error: "maidId and employerId are required" },
        }),
        400,
      );
    }

    const data = await loadData(c.env);
    const maid = data.maids.find((item) => item.id === maidId) ?? null;
    if (!maid) {
      return c.json(
        buildWorkflowResponse(c.req.raw, {
          workflow: "validation_error",
          intent: "validation_error",
          fallbackUsed: true,
          data: { error: "Maid not found" },
        }),
        404,
      );
    }

    const employer =
      data.employers.find((item) => item.id === employerId) ?? null;
    const contractId = data.counters.employmentContracts++;
    const refCode = `WF-${formatEmployerRefCode(contractId)}`;
    const employerName =
      toTrimmedString(
        (
          employer?.employer as
            | {
                name?: unknown;
              }
            | undefined
        )?.name,
      ) || `Employer ${employerId}`;
    const contractDate = toTrimmedString(body?.scheduleDate) || now().slice(0, 10);

    const contract = normalizeEmploymentContractRecord(
      {
        id: contractId,
        refCode,
        employerRefCode: employer?.refCode ?? refCode,
        employerId,
        maidId,
        maidReferenceCode: maid.referenceCode,
        maidName: maid.fullName,
        employerName,
        caseReferenceNumber: refCode,
        contractDate,
        serviceFee: toTrimmedString(body?.budgetText),
        placementFee: toTrimmedString(body?.budgetText),
        agencyWitness: "Helped Agency",
        employerSnapshot: employer?.employer ?? { id: employerId, name: employerName },
        maidSnapshot: JSON.parse(JSON.stringify(maid)),
        createdAt: now(),
        updatedAt: now(),
      },
      refCode,
    );

    data.employmentContracts.unshift(contract);
    await saveData(c.env, data);

    const summary = `Contract generated for ${maid.fullName} (${maid.referenceCode}) with ${employerName} in ${toTrimmedString(body?.location) || "Singapore"}.`;
    const contractText = [
      `Employment Contract Reference: ${contract.refCode}`,
      `Employer: ${employerName}`,
      `Maid: ${maid.fullName} (${maid.referenceCode})`,
      `Service Type: ${toTrimmedString(body?.serviceType) || "general_housekeeping"}`,
      `Location: ${toTrimmedString(body?.location) || "Singapore"}`,
      `Budget / Fee: ${toTrimmedString(body?.budgetText) || "To be confirmed"}`,
      `Schedule Date: ${contractDate}`,
    ].join("\\n");

    return c.json(
      buildWorkflowResponse(c.req.raw, {
        workflow: "contract_creation",
        intent: "contract",
        fallbackUsed: true,
        data: {
          contract: {
            id: contract.id,
            refCode: contract.refCode,
            maidId: contract.maidId,
            employerId: contract.employerId,
            contractText,
            summary,
            createdAt: contract.createdAt,
          },
          aiUsed: false,
        },
      }),
    );
  }),
);

app.post(
  "/api/schedule",
  safeApi(async (c) => {
    const body = await parseBody<{
      maidId?: number | null;
      employerId?: number | null;
      datetime?: string;
    }>(c.req.raw);

    const maidId = toNullableNumber(body?.maidId);
    const employerId = toNullableNumber(body?.employerId);
    const datetime = toTrimmedString(body?.datetime);

    if (!maidId || !employerId || !datetime) {
      return c.json(
        buildWorkflowResponse(c.req.raw, {
          workflow: "validation_error",
          intent: "validation_error",
          fallbackUsed: true,
          data: { error: "maidId, employerId, and datetime are required" },
        }),
        400,
      );
    }

    const data = await loadData(c.env);
    const maid = data.maids.find((item) => item.id === maidId) ?? null;
    if (!maid) {
      return c.json(
        buildWorkflowResponse(c.req.raw, {
          workflow: "validation_error",
          intent: "validation_error",
          fallbackUsed: true,
          data: { error: "Maid not found" },
        }),
        404,
      );
    }

    return c.json(
      buildWorkflowResponse(c.req.raw, {
        workflow: "schedule_creation",
        intent: "schedule",
        fallbackUsed: false,
        data: {
          schedule: {
            id: Date.now(),
            maidId,
            employerId,
            maidName: maid.fullName,
            datetime,
            status: "scheduled",
            createdAt: now(),
          },
        },
      }),
    );
  }),
);

app.post(
  "/api/notify",
  safeApi(async (c) => {
    const body = await parseBody<{
      channel?: string;
      recipient?: string;
      message?: string;
      referenceType?: string;
      referenceId?: string;
    }>(c.req.raw);

    const recipient = toTrimmedString(body?.recipient);
    const message = toTrimmedString(body?.message);

    if (!recipient || !message) {
      return c.json(
        buildWorkflowResponse(c.req.raw, {
          workflow: "validation_error",
          intent: "validation_error",
          fallbackUsed: true,
          data: { error: "recipient and message are required" },
        }),
        400,
      );
    }

    return c.json(
      buildWorkflowResponse(c.req.raw, {
        workflow: "notification_only",
        intent: "notification",
        fallbackUsed: false,
        data: {
          notification: {
            id: Date.now(),
            channel: toTrimmedString(body?.channel) || "internal",
            recipient,
            message,
            referenceType: toTrimmedString(body?.referenceType) || "workflow",
            referenceId: toTrimmedString(body?.referenceId),
            createdAt: now(),
          },
        },
      }),
    );
  }),
);

app.post("/api/client-auth/register", async (c) => {
  const body = await parseBody<{
    name?: string;
    company?: string;
    phone?: string;
    email?: string;
    password?: string;
  }>(c.req.raw);

  if (!body?.name?.trim() || !body.email?.trim() || !body.password?.trim()) {
    return c.json({ error: "name, email, and password are required" }, 400);
  }

  const data = await loadData(c.env);
  const email = body.email.trim();
  const normalizedEmail = normalizeEmail(email);
  const existing = data.clients.find(
    (client) => normalizeEmail(client.email) === normalizedEmail,
  );
  if (existing) {
    if (existing.emailVerified !== false) {
      return c.json({ error: "Client email already exists" }, 409);
    }

    const code = generateSixDigitCode();
    existing.emailVerificationCodeHash = await sha256Hex(
      `${normalizedEmail}:${code}`,
    );
    existing.emailVerificationSentAt = now();
    existing.emailVerificationExpiresAt = new Date(
      Date.now() + 15 * 60 * 1000,
    ).toISOString();
    const emailResult = await sendConfirmationCodeEmail(c.env, {
      to: email,
      code,
      purpose: "client",
    });
    await saveData(c.env, data);

    return c.json(
      {
        requiresConfirmation: true,
        email: existing.email,
        delivery: emailResult.ok ? "sent" : "not_configured",
        devConfirmationCode: shouldExposeDevConfirmationCode(c.env)
          ? code
          : undefined,
      },
      202,
    );
  }

  const code = generateSixDigitCode();
  const client: ClientRecord = {
    id: data.counters.clients++,
    name: body.name.trim(),
    company: body.company?.trim() ?? "",
    phone: body.phone?.trim() ?? "",
    email,
    password: body.password.trim(),
    profileImageUrl: "",
    createdAt: now(),
    emailVerified: false,
    emailVerificationCodeHash: await sha256Hex(`${normalizedEmail}:${code}`),
    emailVerificationSentAt: now(),
    emailVerificationExpiresAt: new Date(
      Date.now() + 15 * 60 * 1000,
    ).toISOString(),
  };

  data.clients.unshift(client);
  const emailResult = await sendConfirmationCodeEmail(c.env, {
    to: email,
    code,
    purpose: "client",
  });
  await saveData(c.env, data);
  return c.json(
    {
      requiresConfirmation: true,
      email: client.email,
      delivery: emailResult.ok ? "sent" : "not_configured",
      devConfirmationCode: shouldExposeDevConfirmationCode(c.env)
        ? code
        : undefined,
    },
    202,
  );
});

app.post("/api/client-auth/confirm", async (c) => {
  const body = await parseBody<{ email?: string; code?: string }>(c.req.raw);
  if (!body?.email?.trim() || !body.code?.trim()) {
    return c.json({ error: "email and code are required" }, 400);
  }

  const email = body.email.trim();
  const normalizedEmail = normalizeEmail(email);
  const code = body.code.trim();

  const data = await loadData(c.env);
  const client = data.clients.find(
    (item) => normalizeEmail(item.email) === normalizedEmail,
  );
  if (!client) {
    return c.json({ error: "Client not found" }, 404);
  }

  if (client.emailVerified !== false) {
    // Already verified: issue a session.
    const session: ClientSessionRecord = {
      token: crypto.randomUUID(),
      clientId: client.id,
      createdAt: now(),
    };
    data.clientSessions = data.clientSessions.filter(
      (item) => item.clientId !== client.id,
    );
    data.clientSessions.unshift(session);
    await saveData(c.env, data);
    return c.json({ token: session.token, client: toSafeClient(client) }, 200);
  }

  if (!client.emailVerificationCodeHash || !client.emailVerificationExpiresAt) {
    return c.json({ error: "No confirmation code requested yet" }, 400);
  }

  if (Date.now() > new Date(client.emailVerificationExpiresAt).getTime()) {
    return c.json({ error: "Confirmation code expired" }, 400);
  }

  const expected = await sha256Hex(`${normalizedEmail}:${code}`);
  if (expected !== client.emailVerificationCodeHash) {
    return c.json({ error: "Invalid confirmation code" }, 400);
  }

  client.emailVerified = true;
  client.emailVerificationCodeHash = undefined;
  client.emailVerificationExpiresAt = undefined;
  client.emailVerificationSentAt = undefined;

  const session: ClientSessionRecord = {
    token: crypto.randomUUID(),
    clientId: client.id,
    createdAt: now(),
  };
  data.clientSessions = data.clientSessions.filter(
    (item) => item.clientId !== client.id,
  );
  data.clientSessions.unshift(session);
  await saveData(c.env, data);
  return c.json({ token: session.token, client: toSafeClient(client) }, 200);
});

app.post("/api/client-auth/resend", async (c) => {
  const body = await parseBody<{ email?: string }>(c.req.raw);
  if (!body?.email?.trim()) {
    return c.json({ error: "email is required" }, 400);
  }

  const email = body.email.trim();
  const normalizedEmail = normalizeEmail(email);
  const data = await loadData(c.env);
  const client = data.clients.find(
    (item) => normalizeEmail(item.email) === normalizedEmail,
  );
  if (!client) {
    return c.json({ error: "Client not found" }, 404);
  }
  if (client.emailVerified !== false) {
    return c.json({ error: "Client already verified" }, 400);
  }

  const code = generateSixDigitCode();
  client.emailVerificationCodeHash = await sha256Hex(
    `${normalizedEmail}:${code}`,
  );
  client.emailVerificationSentAt = now();
  client.emailVerificationExpiresAt = new Date(
    Date.now() + 15 * 60 * 1000,
  ).toISOString();

  const emailResult = await sendConfirmationCodeEmail(c.env, {
    to: email,
    code,
    purpose: "client",
  });
  await saveData(c.env, data);
  return c.json({
    requiresConfirmation: true,
    email: client.email,
    delivery: emailResult.ok ? "sent" : "not_configured",
    devConfirmationCode: shouldExposeDevConfirmationCode(c.env)
      ? code
      : undefined,
  });
});

app.post("/api/client-auth/login", async (c) => {
  const body = await parseBody<{ email?: string; password?: string }>(
    c.req.raw,
  );
  if (!body?.email?.trim() || !body.password?.trim()) {
    return c.json({ error: "email and password are required" }, 400);
  }

  const data = await loadData(c.env);
  const normalizedEmail = normalizeEmail(body.email);
  const client = data.clients.find(
    (item) =>
      normalizeEmail(item.email) === normalizedEmail &&
      item.password === body.password!.trim(),
  );
  if (!client) {
    return c.json({ error: "Invalid email or password" }, 401);
  }

  if (client.emailVerified === false) {
    return c.json(
      {
        error: "EMAIL_NOT_VERIFIED",
        requiresConfirmation: true,
        email: client.email,
      },
      403,
    );
  }

  const session: ClientSessionRecord = {
    token: crypto.randomUUID(),
    clientId: client.id,
    createdAt: now(),
  };

  data.clientSessions = data.clientSessions.filter(
    (item) => item.clientId !== client.id,
  );
  data.clientSessions.unshift(session);
  await saveData(c.env, data);
  return c.json({ token: session.token, client: toSafeClient(client) });
});

app.get("/api/client-auth/me", requireClientAuth, async (c) => {
  return c.json({ client: toSafeClient(c.get("client")) });
});

app.put("/api/client-auth/me", requireClientAuth, async (c) => {
  const body = await parseBody<{
    name?: string;
    company?: string;
    phone?: string;
    email?: string;
    profileImageUrl?: string;
  }>(c.req.raw);

  if (!body?.name?.trim() || !body.email?.trim()) {
    return c.json({ error: "name and email are required" }, 400);
  }

  const currentClient = c.get("client");
  const data = await loadData(c.env);
  const duplicate = data.clients.find(
    (item) =>
      item.id !== currentClient.id &&
      item.email.toLowerCase() === body.email!.trim().toLowerCase(),
  );
  if (duplicate) {
    return c.json({ error: "Client email already exists" }, 409);
  }

  const index = data.clients.findIndex((item) => item.id === currentClient.id);
  data.clients[index] = {
    ...data.clients[index],
    name: body.name.trim(),
    company:
      typeof body.company === "string"
        ? body.company.trim()
        : data.clients[index].company,
    phone:
      typeof body.phone === "string"
        ? body.phone.trim()
        : (data.clients[index].phone ?? ""),
    email: body.email.trim(),
    profileImageUrl:
      typeof body.profileImageUrl === "string"
        ? body.profileImageUrl
        : data.clients[index].profileImageUrl,
  };

  data.directSales = data.directSales.map((sale) =>
    sale.clientId === currentClient.id
      ? {
          ...sale,
          clientName: data.clients[index].name,
          clientEmail: data.clients[index].email,
          clientPhone: data.clients[index].phone || "",
        }
      : sale,
  );

  await saveData(c.env, data);
  return c.json({ client: toSafeClient(data.clients[index]) });
});

app.post("/api/client-auth/logout", requireClientAuth, async (c) => {
  const token = parseAuthorizationToken(c.req.raw);
  const data = await loadData(c.env);
  data.clientSessions = data.clientSessions.filter(
    (item) => item.token !== token,
  );
  await saveData(c.env, data);
  return c.json({ message: "Logged out successfully" });
});

app.post("/api/agency-auth/register", async (c) => {
  const body = await parseBody<{
    username?: string;
    email?: string;
    password?: string;
    agencyName?: string;
  }>(c.req.raw);

  if (
    !body?.username?.trim() ||
    !body.password?.trim() ||
    !body.agencyName?.trim()
  ) {
    return c.json(
      { error: "username, password, and agencyName are required" },
      400,
    );
  }

  const emailFromBody = body.email?.trim() ?? "";
  const fallbackEmail = isEmailLike(body.username) ? body.username.trim() : "";
  const email = emailFromBody || fallbackEmail;
  if (!email) {
    return c.json({ error: "email is required for agency signup" }, 400);
  }

  const data = await loadData(c.env);
  const normalizedEmail = normalizeEmail(email);
  const normalizedUsername = body.username.trim().toLowerCase();

  const existingByUsername = data.agencyAdmins.find(
    (admin) => admin.username.toLowerCase() === normalizedUsername,
  );
  const existingByEmail = data.agencyAdmins.find(
    (admin) => normalizeEmail(admin.email ?? "") === normalizedEmail,
  );

  const existing = existingByUsername ?? existingByEmail;
  if (existing) {
    if (existing.emailVerified !== false) {
      return c.json({ error: "Agency admin already exists" }, 409);
    }

    const code = generateSixDigitCode();
    existing.email = email;
    existing.emailVerificationCodeHash = await sha256Hex(
      `${normalizedEmail}:${code}`,
    );
    existing.emailVerificationSentAt = now();
    existing.emailVerificationExpiresAt = new Date(
      Date.now() + 15 * 60 * 1000,
    ).toISOString();
    const emailResult = await sendConfirmationCodeEmail(c.env, {
      to: email,
      code,
      purpose: "agency",
    });
    await saveData(c.env, data);
    return c.json(
      {
        requiresConfirmation: true,
        email,
        delivery: emailResult.ok ? "sent" : "not_configured",
        devConfirmationCode: shouldExposeDevConfirmationCode(c.env)
          ? code
          : undefined,
      },
      202,
    );
  }

  const code = generateSixDigitCode();
  const admin: AgencyAdminRecord = {
    id: data.counters.agencyAdmins++,
    agencyId: 1,
    username: body.username.trim(),
    email,
    password: body.password.trim(),
    agencyName: body.agencyName.trim(),
    createdAt: now(),
    emailVerified: false,
    emailVerificationCodeHash: await sha256Hex(`${normalizedEmail}:${code}`),
    emailVerificationSentAt: now(),
    emailVerificationExpiresAt: new Date(
      Date.now() + 15 * 60 * 1000,
    ).toISOString(),
  };

  data.agencyAdmins.unshift(admin);
  const emailResult = await sendConfirmationCodeEmail(c.env, {
    to: email,
    code,
    purpose: "agency",
  });
  await saveData(c.env, data);
  return c.json(
    {
      requiresConfirmation: true,
      email,
      delivery: emailResult.ok ? "sent" : "not_configured",
      devConfirmationCode: shouldExposeDevConfirmationCode(c.env)
        ? code
        : undefined,
    },
    202,
  );
});

app.post("/api/agency-auth/confirm", async (c) => {
  const body = await parseBody<{ email?: string; code?: string }>(c.req.raw);
  if (!body?.email?.trim() || !body.code?.trim()) {
    return c.json({ error: "email and code are required" }, 400);
  }

  const email = body.email.trim();
  const normalizedEmail = normalizeEmail(email);
  const code = body.code.trim();

  const data = await loadData(c.env);
  const admin = data.agencyAdmins.find(
    (item) => normalizeEmail(item.email ?? "") === normalizedEmail,
  );
  if (!admin) {
    return c.json({ error: "Agency admin not found" }, 404);
  }

  if (admin.emailVerified !== false) {
    const session = await createAgencyAdminSession(c.env, admin);
    return c.json(
      { token: session.token, admin: toSafeAgencyAdmin(admin) },
      200,
    );
  }

  if (!admin.emailVerificationCodeHash || !admin.emailVerificationExpiresAt) {
    return c.json({ error: "No confirmation code requested yet" }, 400);
  }

  if (Date.now() > new Date(admin.emailVerificationExpiresAt).getTime()) {
    return c.json({ error: "Confirmation code expired" }, 400);
  }

  const expected = await sha256Hex(`${normalizedEmail}:${code}`);
  if (expected !== admin.emailVerificationCodeHash) {
    return c.json({ error: "Invalid confirmation code" }, 400);
  }

  admin.emailVerified = true;
  admin.emailVerificationCodeHash = undefined;
  admin.emailVerificationExpiresAt = undefined;
  admin.emailVerificationSentAt = undefined;

  const session: AgencyAdminSessionRecord = {
    token: crypto.randomUUID(),
    adminId: admin.id,
    admin: toSafeAgencyAdmin(admin),
    createdAt: now(),
  };
  await saveAgencyAdminChangesWithSession(c.env, data, session);
  return c.json({ token: session.token, admin: toSafeAgencyAdmin(admin) }, 200);
});

app.post("/api/agency-auth/resend", async (c) => {
  const body = await parseBody<{ email?: string }>(c.req.raw);
  if (!body?.email?.trim()) {
    return c.json({ error: "email is required" }, 400);
  }

  const email = body.email.trim();
  const normalizedEmail = normalizeEmail(email);
  const data = await loadData(c.env);
  const admin = data.agencyAdmins.find(
    (item) => normalizeEmail(item.email ?? "") === normalizedEmail,
  );
  if (!admin) {
    return c.json({ error: "Agency admin not found" }, 404);
  }
  if (admin.emailVerified !== false) {
    return c.json({ error: "Agency admin already verified" }, 400);
  }

  const code = generateSixDigitCode();
  admin.emailVerificationCodeHash = await sha256Hex(
    `${normalizedEmail}:${code}`,
  );
  admin.emailVerificationSentAt = now();
  admin.emailVerificationExpiresAt = new Date(
    Date.now() + 15 * 60 * 1000,
  ).toISOString();

  const emailResult = await sendConfirmationCodeEmail(c.env, {
    to: email,
    code,
    purpose: "agency",
  });
  await saveData(c.env, data);
  return c.json({
    requiresConfirmation: true,
    email,
    delivery: emailResult.ok ? "sent" : "not_configured",
    devConfirmationCode: shouldExposeDevConfirmationCode(c.env)
      ? code
      : undefined,
  });
});

app.post(
  "/api/agency-auth/login",
  safeApi(async (c) => {
    console.log("/api/agency-auth/login called");
    const body = await parseBody<{ username?: string; password?: string }>(
      c.req.raw,
    );
    if (!body) {
      return c.json({ error: "Invalid JSON body" }, 400);
    }
    if (!body?.username?.trim() || !body.password?.trim()) {
      return c.json({ error: "username and password are required" }, 400);
    }

    let agencyAdmins;
    try {
      agencyAdmins = await loadAgencyAdminAuthData(c.env);
    } catch (error) {
      console.error("/api/agency-auth/login loadData error:", error);
      return c.json({ error: "Storage unavailable" }, 500);
    }
    console.log("/api/agency-auth/login auth data loaded");
    const usernameOrEmail = body.username.trim();
    const normalizedIdentifier = usernameOrEmail.toLowerCase();
    const normalizedEmail = isEmailLike(usernameOrEmail)
      ? normalizeEmail(usernameOrEmail)
      : "";
    const password = body.password.trim();

    const admin = agencyAdmins.find((item) => {
      const username =
        typeof item.username === "string"
          ? item.username.trim().toLowerCase()
          : "";
      const email =
        typeof item.email === "string" ? normalizeEmail(item.email) : "";
      const matchesIdentifier =
        username === normalizedIdentifier ||
        (normalizedEmail && email === normalizedEmail);
      return matchesIdentifier && item.password === password;
    });
    if (!admin) {
      return c.json({ error: "Invalid username or password" }, 401);
    }

    if (admin.email && admin.emailVerified === false) {
      return c.json(
        {
          error: "EMAIL_NOT_VERIFIED",
          requiresConfirmation: true,
          email: admin.email,
        },
        403,
      );
    }

    const session = await createAgencyAdminSession(c.env, admin);
    console.log("/api/agency-auth/login success");
    return c.json({ token: session.token, admin: toSafeAgencyAdmin(admin) });
  }),
);

app.get("/api/agency-auth/me", requireAgencyAdminAuth, async (c) => {
  return c.json({ admin: toSafeAgencyAdmin(c.get("agencyAdmin")) });
});

app.post("/api/agency-auth/logout", requireAgencyAdminAuth, async (c) => {
  const token = parseAuthorizationToken(c.req.raw);
  if (!token) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  await deleteAgencyAdminSession(c.env, token);
  return c.json({ message: "Logged out successfully" });
});

app.get("/api/client/my-maids", requireClientAuth, async (c) => {
  const client = c.get("client");
  const data = await loadData(c.env);
  const assignments = data.directSales
    .filter((sale) => sale.clientId === client.id)
    .map((sale) => ({
      directSale: sale,
      maid:
        data.maids.find(
          (maid) => maid.referenceCode === sale.maidReferenceCode,
        ) ?? null,
    }))
    .filter(
      (item): item is { directSale: DirectSaleRecord; maid: MaidRecord } =>
        Boolean(item.maid),
    );

  return c.json({ assignments });
});

app.get("/api/client/history", requireClientAuth, async (c) => {
  const client = c.get("client");
  const data = await loadData(c.env);
  const history = data.directSales
    .filter((sale) => sale.clientId === client.id)
    .map((sale) => ({
      directSale: sale,
      maid:
        data.maids.find(
          (maid) => maid.referenceCode === sale.maidReferenceCode,
        ) ?? null,
    }))
    .sort(
      (left, right) =>
        new Date(right.directSale.createdAt).getTime() -
        new Date(left.directSale.createdAt).getTime(),
    );

  return c.json({ history });
});

app.patch(
  "/api/client/direct-sales/:id/:action",
  requireClientAuth,
  async (c) => {
    const id = Number(c.req.param("id"));
    const action = c.req.param("action");
    if (!Number.isInteger(id)) {
      return c.json({ error: "Valid direct sale id is required" }, 400);
    }
    if (!["interested", "direct-hire", "reject"].includes(action)) {
      return c.json({ error: "Invalid action" }, 400);
    }

    const status =
      action === "direct-hire"
        ? "direct_hire"
        : action === "reject"
          ? "rejected"
          : "interested";
    const client = c.get("client");
    const data = await loadData(c.env);
    const saleIndex = data.directSales.findIndex(
      (sale) => sale.id === id && sale.clientId === client.id,
    );
    if (saleIndex === -1) {
      return c.json(
        { error: "Assigned direct sale not found for this client" },
        404,
      );
    }

    data.directSales[saleIndex] = {
      ...data.directSales[saleIndex],
      status,
    };
    const maidIndex = data.maids.findIndex(
      (maid) =>
        maid.referenceCode === data.directSales[saleIndex].maidReferenceCode,
    );
    const maid =
      maidIndex === -1
        ? null
        : (data.maids[maidIndex] = {
            ...data.maids[maidIndex],
            status:
              status === "interested"
                ? "interested"
                : status === "direct_hire"
                  ? "reserved"
                  : "rejected",
            updatedAt: now(),
          });

    await saveData(c.env, data);
    return c.json({
      directSale: data.directSales[saleIndex],
      maid,
    });
  },
);

app.get("/api/direct-sales", async (c) => {
  const data = await loadData(c.env);
  const directSales = [...data.directSales].sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
  return c.json({ directSales });
});

app.get("/api/direct-sales/clients", async (c) => {
  const data = await loadData(c.env);
  const clients = [...data.clients]
    .sort((left, right) => right.id - left.id)
    .map((client) => ({
      id: client.id,
      name: client.name,
      email: client.email,
      company: client.company || "",
      phone: client.phone || "",
      enquiryDate: client.createdAt,
    }));

  return c.json({ clients });
});

app.post("/api/direct-sales", async (c) => {
  const body = await parseBody<{
    referenceCode?: string;
    clientId?: number;
    status?: string;
    formData?: Record<string, string>;
  }>(c.req.raw);

  if (!body?.referenceCode?.trim()) {
    return c.json({ error: "referenceCode is required" }, 400);
  }
  if (!Number.isInteger(body.clientId)) {
    return c.json({ error: "clientId is required" }, 400);
  }

  const request = new Request(
    new URL(
      `/api/direct-sales/${encodeURIComponent(body.referenceCode.trim())}`,
      c.req.url,
    ),
    {
      method: "POST",
      headers: c.req.raw.headers,
      body: JSON.stringify({
        clientId: body.clientId,
        status: body.status,
        formData: body.formData,
      }),
    },
  );
  return app.fetch(request, c.env);
});

app.post("/api/direct-sales/:referenceCode", async (c) => {
  const body = await parseBody<{
    clientId?: number;
    status?: string;
    formData?: Record<string, string>;
  }>(c.req.raw);
  if (!body) {
    return c.json({ error: "Invalid JSON body" }, 400);
  }
  if (!Number.isInteger(body.clientId)) {
    return c.json({ error: "clientId is required" }, 400);
  }

  const referenceCode = c.req.param("referenceCode").trim();
  if (!referenceCode) {
    return c.json({ error: "referenceCode is required" }, 400);
  }

  const data = await loadData(c.env);
  const maidIndex = data.maids.findIndex(
    (maid) => maid.referenceCode === referenceCode,
  );
  if (maidIndex === -1) {
    return c.json({ error: "Maid not found" }, 404);
  }

  const client = data.clients.find((item) => item.id === Number(body.clientId));
  if (!client) {
    return c.json({ error: "Client not found" }, 404);
  }

  const normalizedStatus =
    body.status === "interested"
      ? "interested"
      : body.status === "direct_hire"
        ? "direct_hire"
        : body.status === "rejected"
          ? "rejected"
          : "pending";

  const directSale: DirectSaleRecord = {
    id: data.counters.directSales++,
    maidReferenceCode: referenceCode,
    maidName: data.maids[maidIndex].fullName,
    clientId: client.id,
    clientName: client.name,
    clientEmail: client.email,
    clientPhone: client.phone || "",
    status: normalizedStatus,
    requestDetails: body.formData,
    createdAt: now(),
  };

  data.directSales.unshift(directSale);
  data.maids[maidIndex] = {
    ...data.maids[maidIndex],
    status:
      normalizedStatus === "interested"
        ? "interested"
        : normalizedStatus === "direct_hire"
          ? "reserved"
          : normalizedStatus === "rejected"
            ? "rejected"
            : "sent",
    updatedAt: now(),
  };
  await saveData(c.env, data);
  return c.json({ directSale, maid: data.maids[maidIndex] }, 201);
});

app.patch("/api/direct-sales/:id/interested", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) {
    return c.json({ error: "Valid direct sale id is required" }, 400);
  }
  const data = await loadData(c.env);
  const saleIndex = data.directSales.findIndex((sale) => sale.id === id);
  if (saleIndex === -1) {
    return c.json({ error: "Direct sale not found" }, 404);
  }
  data.directSales[saleIndex].status = "interested";
  const maidIndex = data.maids.findIndex(
    (maid) =>
      maid.referenceCode === data.directSales[saleIndex].maidReferenceCode,
  );
  const maid =
    maidIndex === -1
      ? null
      : (data.maids[maidIndex] = {
          ...data.maids[maidIndex],
          status: "interested",
          updatedAt: now(),
        });
  await saveData(c.env, data);
  return c.json({ directSale: data.directSales[saleIndex], maid });
});

app.patch("/api/direct-sales/:id/direct-hire", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) {
    return c.json({ error: "Valid direct sale id is required" }, 400);
  }
  const data = await loadData(c.env);
  const saleIndex = data.directSales.findIndex((sale) => sale.id === id);
  if (saleIndex === -1) {
    return c.json({ error: "Direct sale not found" }, 404);
  }
  data.directSales[saleIndex].status = "direct_hire";
  const maidIndex = data.maids.findIndex(
    (maid) =>
      maid.referenceCode === data.directSales[saleIndex].maidReferenceCode,
  );
  const maid =
    maidIndex === -1
      ? null
      : (data.maids[maidIndex] = {
          ...data.maids[maidIndex],
          status: "reserved",
          updatedAt: now(),
        });
  await saveData(c.env, data);
  return c.json({ directSale: data.directSales[saleIndex], maid });
});

app.patch("/api/direct-sales/:id/reject", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) {
    return c.json({ error: "Valid direct sale id is required" }, 400);
  }
  const data = await loadData(c.env);
  const saleIndex = data.directSales.findIndex((sale) => sale.id === id);
  if (saleIndex === -1) {
    return c.json({ error: "Direct sale not found" }, 404);
  }
  data.directSales[saleIndex].status = "rejected";
  const maidIndex = data.maids.findIndex(
    (maid) =>
      maid.referenceCode === data.directSales[saleIndex].maidReferenceCode,
  );
  const maid =
    maidIndex === -1
      ? null
      : (data.maids[maidIndex] = {
          ...data.maids[maidIndex],
          status: "rejected",
          updatedAt: now(),
        });
  await saveData(c.env, data);
  return c.json({ directSale: data.directSales[saleIndex], maid });
});

app.get("/api/chats/client/conversations", requireClientAuth, async (c) => {
  const client = c.get("client");
  const data = await loadData(c.env);
  const conversations = new Map<
    string,
    {
      key: string;
      clientId: number;
      conversationType: "support" | "agency";
      title: string;
      description: string;
      lastMessage: string;
      lastMessageAt: string;
      unreadCount: number;
      agencyId?: number;
      agencyName?: string;
    }
  >();

  data.chatMessages
    .filter((message) => message.clientId === client.id)
    .forEach((message) => {
      const key = `${message.conversationType}:${message.agencyId ?? 0}`;
      const unreadIncrement =
        message.senderRole === "agency" && !message.readByClient ? 1 : 0;
      const title =
        message.conversationType === "agency"
          ? message.agencyName || "Agency"
          : "Agency Support";
      const description =
        message.conversationType === "agency"
          ? "Direct chat with agency"
          : "General help, follow-up, and request support";
      const existing = conversations.get(key);

      if (!existing) {
        conversations.set(key, {
          key,
          clientId: client.id,
          conversationType: message.conversationType,
          title,
          description,
          lastMessage: message.message,
          lastMessageAt: message.createdAt,
          unreadCount: unreadIncrement,
          agencyId: message.agencyId,
          agencyName: message.agencyName || "",
        });
        return;
      }

      existing.unreadCount += unreadIncrement;
      if (
        new Date(message.createdAt).getTime() >=
        new Date(existing.lastMessageAt).getTime()
      ) {
        existing.lastMessage = message.message;
        existing.lastMessageAt = message.createdAt;
      }
    });

  if (!conversations.has("support:0")) {
    conversations.set("support:0", {
      key: "support:0",
      clientId: client.id,
      conversationType: "support",
      title: "Agency Support",
      description: "General help, follow-up, and request support",
      lastMessage: "",
      lastMessageAt: client.createdAt,
      unreadCount: 0,
    });
  }

  return c.json({
    conversations: Array.from(conversations.values()).sort(
      (left, right) =>
        new Date(right.lastMessageAt).getTime() -
        new Date(left.lastMessageAt).getTime(),
    ),
  });
});

app.get("/api/chats/client/summary", requireClientAuth, async (c) => {
  const client = c.get("client");
  const data = await loadData(c.env);
  const unreadCount = data.chatMessages.filter(
    (message) =>
      message.clientId === client.id &&
      message.senderRole === "agency" &&
      !message.readByClient,
  ).length;

  return c.json({ unreadCount });
});

app.get("/api/chats/client", requireClientAuth, async (c) => {
  const client = c.get("client");
  const { conversationType, agencyId } = getConversationContext(
    new URL(c.req.url),
  );
  const data = await loadData(c.env);
  const messages = data.chatMessages
    .filter(
      (message) =>
        message.clientId === client.id &&
        message.conversationType === conversationType &&
        (conversationType === "support" || message.agencyId === agencyId),
    )
    .sort(
      (left, right) =>
        new Date(left.createdAt).getTime() -
        new Date(right.createdAt).getTime(),
    );

  data.chatMessages = data.chatMessages.map((message) =>
    message.clientId === client.id &&
    message.senderRole === "agency" &&
    message.conversationType === conversationType &&
    (conversationType === "support" || message.agencyId === agencyId)
      ? { ...message, readByClient: true }
      : message,
  );
  await saveData(c.env, data);
  return c.json({ client: toSafeClient(client), messages });
});

app.post("/api/chats/client", requireClientAuth, async (c) => {
  const body = await parseBody<{ message?: string }>(c.req.raw);
  if (!body?.message?.trim()) {
    return c.json({ error: "message is required" }, 400);
  }

  const client = c.get("client");
  const { conversationType, agencyId, agencyName } = getConversationContext(
    new URL(c.req.url),
  );
  const data = await loadData(c.env);
  const message: ChatMessageRecord = {
    id: data.counters.chatMessages++,
    clientId: client.id,
    conversationType,
    agencyId,
    agencyName: agencyName ?? "",
    senderRole: "client",
    senderName: client.name,
    message: body.message.trim(),
    createdAt: now(),
    readByAgency: false,
    readByClient: true,
  };
  data.chatMessages.push(message);
  await saveData(c.env, data);
  return c.json({ message }, 201);
});

app.get("/api/chats/admin", requireAgencyAdminAuth, async (c) => {
  const data = await loadData(c.env);
  const conversations = new Map<string, any>();

  data.chatMessages.forEach((message) => {
    const client = data.clients.find((item) => item.id === message.clientId);
    if (!client) return;
    const key = `${message.clientId}:${message.conversationType}:${message.agencyId ?? 0}`;
    const unreadIncrement =
      message.senderRole === "client" && !message.readByAgency ? 1 : 0;
    const existing = conversations.get(key);
    if (!existing) {
      conversations.set(key, {
        key,
        clientId: client.id,
        conversationType: message.conversationType,
        agencyId: message.agencyId,
        agencyName: message.agencyName || "",
        clientName: client.name,
        clientEmail: client.email,
        clientCompany: client.company || "",
        lastMessage: message.message,
        lastMessageAt: message.createdAt,
        unreadCount: unreadIncrement,
      });
      return;
    }

    existing.unreadCount += unreadIncrement;
    if (
      new Date(message.createdAt).getTime() >=
      new Date(existing.lastMessageAt).getTime()
    ) {
      existing.lastMessage = message.message;
      existing.lastMessageAt = message.createdAt;
    }
  });

  return c.json({
    conversations: Array.from(conversations.values()).sort(
      (left: any, right: any) =>
        new Date(right.lastMessageAt).getTime() -
        new Date(left.lastMessageAt).getTime(),
    ),
  });
});

app.get("/api/chats/admin/summary", requireAgencyAdminAuth, async (c) => {
  const data = await loadData(c.env);
  const unreadCount = data.chatMessages.filter(
    (message) => message.senderRole === "client" && !message.readByAgency,
  ).length;

  return c.json({ unreadCount });
});

app.get("/api/chats/admin/stream", requireAgencyAdminAuth, async (c) => {
  const url = new URL(c.req.url);
  const afterId = Number(url.searchParams.get("afterId") ?? 0);
  if (!Number.isFinite(afterId) || afterId < 0) {
    return c.json({ error: "afterId must be a non-negative number" }, 400);
  }

  const startedAt = Date.now();
  return createSseResponse(c.req.raw, async (controller) => {
    let lastId = afterId;
    let lastHeartbeat = Date.now();
    writeSseEvent(controller, "ready", { ok: true });

    while (!c.req.raw.signal.aborted && Date.now() - startedAt < 60_000) {
      const data = await loadData(c.env);
      const nextMessages = data.chatMessages
        .filter((message) => message.id > lastId)
        .sort((left, right) => left.id - right.id);

      for (const message of nextMessages) {
        writeSseEvent(controller, "message", { message });
        lastId = Math.max(lastId, message.id);
      }

      const nowTime = Date.now();
      if (nowTime - lastHeartbeat > 15_000) {
        writeSseComment(controller, "keep-alive");
        lastHeartbeat = nowTime;
      }

      await sleep(1200);
    }
  });
});

app.get("/api/chats/admin/last-id", requireAgencyAdminAuth, async (c) => {
  const data = await loadData(c.env);
  const lastId = data.chatMessages.reduce(
    (maxId, message) => Math.max(maxId, message.id),
    0,
  );
  return c.json({ lastId });
});

app.get("/api/chats/admin/:clientId", requireAgencyAdminAuth, async (c) => {
  const clientId = Number(c.req.param("clientId"));
  if (!Number.isInteger(clientId)) {
    return c.json({ error: "Valid client id is required" }, 400);
  }

  const { conversationType, agencyId } = getConversationContext(
    new URL(c.req.url),
  );
  const data = await loadData(c.env);
  const messages = data.chatMessages
    .filter(
      (message) =>
        message.clientId === clientId &&
        message.conversationType === conversationType &&
        (conversationType === "support" || message.agencyId === agencyId),
    )
    .sort(
      (left, right) =>
        new Date(left.createdAt).getTime() -
        new Date(right.createdAt).getTime(),
    );

  data.chatMessages = data.chatMessages.map((message) =>
    message.clientId === clientId &&
    message.senderRole === "client" &&
    message.conversationType === conversationType &&
    (conversationType === "support" || message.agencyId === agencyId)
      ? { ...message, readByAgency: true }
      : message,
  );
  await saveData(c.env, data);
  return c.json({ messages });
});

app.post("/api/chats/admin/:clientId", requireAgencyAdminAuth, async (c) => {
  const clientId = Number(c.req.param("clientId"));
  if (!Number.isInteger(clientId)) {
    return c.json({ error: "Valid client id is required" }, 400);
  }

  const body = await parseBody<{ message?: string }>(c.req.raw);
  if (!body?.message?.trim()) {
    return c.json({ error: "message is required" }, 400);
  }

  const data = await loadData(c.env);
  const client = data.clients.find((item) => item.id === clientId);
  if (!client) {
    return c.json({ error: "Client not found" }, 404);
  }

  const admin = c.get("agencyAdmin");
  const { conversationType, agencyId, agencyName } = getConversationContext(
    new URL(c.req.url),
  );
  const message: ChatMessageRecord = {
    id: data.counters.chatMessages++,
    clientId,
    conversationType,
    agencyId,
    agencyName: agencyName ?? admin.agencyName,
    senderRole: "agency",
    senderName:
      conversationType === "agency"
        ? `${agencyName ?? admin.agencyName} Team`
        : `${admin.agencyName} Support`,
    message: body.message.trim(),
    createdAt: now(),
    readByAgency: true,
    readByClient: false,
  };
  data.chatMessages.push(message);
  await saveData(c.env, data);
  return c.json({ message }, 201);
});

app.get("/api/chats/client/stream", requireClientAuth, async (c) => {
  const client = c.get("client");
  const url = new URL(c.req.url);
  const afterId = Number(url.searchParams.get("afterId") ?? 0);
  if (!Number.isFinite(afterId) || afterId < 0) {
    return c.json({ error: "afterId must be a non-negative number" }, 400);
  }

  const streamAll = url.searchParams.get("all") === "1";
  const { conversationType, agencyId } = getConversationContext(url);
  const startedAt = Date.now();

  return createSseResponse(c.req.raw, async (controller) => {
    let lastId = afterId;
    let lastHeartbeat = Date.now();
    writeSseEvent(controller, "ready", { ok: true });

    while (!c.req.raw.signal.aborted && Date.now() - startedAt < 60_000) {
      const data = await loadData(c.env);
      const nextMessages = data.chatMessages
        .filter(
          (message) =>
            message.clientId === client.id &&
            message.id > lastId &&
            (streamAll
              ? true
              : message.conversationType === conversationType &&
                (conversationType === "support" ||
                  message.agencyId === agencyId)),
        )
        .sort((left, right) => left.id - right.id);

      for (const message of nextMessages) {
        writeSseEvent(controller, "message", { message });
        lastId = Math.max(lastId, message.id);
      }

      const nowTime = Date.now();
      if (nowTime - lastHeartbeat > 15_000) {
        writeSseComment(controller, "keep-alive");
        lastHeartbeat = nowTime;
      }

      await sleep(1200);
    }
  });
});

app.get("/api/chats/client/last-id", requireClientAuth, async (c) => {
  const client = c.get("client");
  const data = await loadData(c.env);
  const lastId = data.chatMessages
    .filter((message) => message.clientId === client.id)
    .reduce((maxId, message) => Math.max(maxId, message.id), 0);

  return c.json({ lastId });
});

app.get("/api/chats/admin/stream", requireAgencyAdminAuth, async (c) => {
  const url = new URL(c.req.url);
  const afterId = Number(url.searchParams.get("afterId") ?? 0);
  if (!Number.isFinite(afterId) || afterId < 0) {
    return c.json({ error: "afterId must be a non-negative number" }, 400);
  }

  const startedAt = Date.now();
  return createSseResponse(c.req.raw, async (controller) => {
    let lastId = afterId;
    let lastHeartbeat = Date.now();
    writeSseEvent(controller, "ready", { ok: true });

    while (!c.req.raw.signal.aborted && Date.now() - startedAt < 60_000) {
      const data = await loadData(c.env);
      const nextMessages = data.chatMessages
        .filter((message) => message.id > lastId)
        .sort((left, right) => left.id - right.id);

      for (const message of nextMessages) {
        writeSseEvent(controller, "message", { message });
        lastId = Math.max(lastId, message.id);
      }

      const nowTime = Date.now();
      if (nowTime - lastHeartbeat > 15_000) {
        writeSseComment(controller, "keep-alive");
        lastHeartbeat = nowTime;
      }

      await sleep(1200);
    }
  });
});

app.get("/api/chats/admin/last-id", requireAgencyAdminAuth, async (c) => {
  const data = await loadData(c.env);
  const lastId = data.chatMessages.reduce(
    (maxId, message) => Math.max(maxId, message.id),
    0,
  );
  return c.json({ lastId });
});

app.get(
  "/api/chats/admin/stream/:clientId",
  requireAgencyAdminAuth,
  async (c) => {
    const clientId = Number(c.req.param("clientId"));
    if (!Number.isInteger(clientId)) {
      return c.json({ error: "Valid client id is required" }, 400);
    }

    const url = new URL(c.req.url);
    const afterId = Number(url.searchParams.get("afterId") ?? 0);
    if (!Number.isFinite(afterId) || afterId < 0) {
      return c.json({ error: "afterId must be a non-negative number" }, 400);
    }

    const { conversationType, agencyId } = getConversationContext(url);
    const startedAt = Date.now();

    return createSseResponse(c.req.raw, async (controller) => {
      let lastId = afterId;
      let lastHeartbeat = Date.now();
      writeSseEvent(controller, "ready", { ok: true });

      while (!c.req.raw.signal.aborted && Date.now() - startedAt < 60_000) {
        const data = await loadData(c.env);
        const nextMessages = data.chatMessages
          .filter(
            (message) =>
              message.clientId === clientId &&
              message.conversationType === conversationType &&
              message.id > lastId &&
              (conversationType === "support" || message.agencyId === agencyId),
          )
          .sort((left, right) => left.id - right.id);

        for (const message of nextMessages) {
          writeSseEvent(controller, "message", { message });
          lastId = Math.max(lastId, message.id);
        }

        const nowTime = Date.now();
        if (nowTime - lastHeartbeat > 15_000) {
          writeSseComment(controller, "keep-alive");
          lastHeartbeat = nowTime;
        }

        await sleep(1200);
      }
    });
  },
);

// ─── Tell a friend ────────────────────────────────────────────────────────────
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

app.post(
  "/api/tell-friend",
  safeApi(async (c) => {
    const body = await parseBody<{
      toName?: string
      toEmail?: string
      fromName?: string
      fromEmail?: string
      subject?: string
      message?: string
      maidRefCode?: string
    }>(c.req.raw)

    if (!body || typeof body !== "object") {
      return c.json({ error: "Request body is missing or not valid JSON." }, 400)
    }

    const sanitize = (v: unknown, max: number) =>
      typeof v === "string"
        ? v.replace(/\r\n/g, "\n").replace(/\0/g, "").trim().slice(0, max)
        : ""

    const toName      = sanitize(body.toName,     100)
    const fromName    = sanitize(body.fromName,   100)
    const toEmail     = sanitize(body.toEmail,    320).toLowerCase()
    const fromEmail   = sanitize(body.fromEmail,  320).toLowerCase()
    const subject     = sanitize(body.subject,    200)
    const message     = sanitize(body.message,    5000)
    const maidRefCode = sanitize(body.maidRefCode, 50)

    if (!toEmail || !fromEmail || !subject || !message) {
      return c.json(
        { error: "toEmail, fromEmail, subject, and message are required" },
        400,
      )
    }

    if (!EMAIL_PATTERN.test(toEmail) || !EMAIL_PATTERN.test(fromEmail)) {
      return c.json({ error: "Please enter valid email addresses" }, 400)
    }

    const text = [
      fromName ? `${fromName} (${fromEmail})` : fromEmail,
      "wants to share a maid profile with you.",
      "",
      `To: ${toName ? `${toName} <${toEmail}>` : toEmail}`,
      maidRefCode ? `Maid ref: ${maidRefCode}` : "",
      "",
      `Subject: ${subject}`,
      "",
      message,
    ]
      .filter((line) => line !== undefined)
      .join("\n")

    const result = await sendEmailViaResend(c.env, toEmail, subject, text)

    if (!result.ok) {
      if (result.error === "RESEND_NOT_CONFIGURED") {
        return c.json({ error: "Email service is not configured" }, 503)
      }
      return c.json({ error: "Email could not be delivered right now" }, 502)
    }

    return c.json({ message: "Email sent successfully" })
  }),
)

app.post(
  "/api/ats/public/apply",
  safeApi(async (c) => {
    const formData = await c.req.raw.formData();
    const parsed = await parseAtsFormData(c.env, formData);
    const data = await loadData(c.env);

    data.ats.applications.unshift(parsed.application);
    data.ats.profiles.unshift(parsed.profile);
    data.ats.scores[parsed.application.id] = parsed.score;
    data.ats.history[parsed.application.id] = parsed.history;
    data.ats.documents[parsed.application.id] = parsed.documents;
    data.ats.notifications[parsed.application.id] = parsed.notifications;

    await saveData(c.env, data);

    return c.json(
      {
        applicationId: parsed.application.id,
        applicationCode: parsed.application.applicationCode,
        applicantAccessToken: parsed.application.applicantAccessToken,
        submittedAt: parsed.application.appliedAt,
      },
      201,
    );
  }),
);

app.get(
  "/api/ats/public/applications/:applicationId",
  safeApi(async (c) => {
    const applicationId = c.req.param("applicationId");
    const token = toTrimmedString(new URL(c.req.url).searchParams.get("token"));
    if (!token) {
      return c.json({ error: "token is required" }, 400);
    }

    const data = await loadData(c.env);
    const summary = buildPublicAtsSummary(data, applicationId, token);
    if (!summary) {
      return c.json({ error: "Application not found" }, 404);
    }
    return c.json(summary);
  }),
);

app.get("/api/ats/dashboard", requireAgencyAdminAuth, async (c) => {
  const admin = c.get("agencyAdmin") as AgencyAdminRecord;
  const data = await loadData(c.env, { readOnly: true });
  return c.json(buildAtsDashboard(data, admin.agencyId));
});

app.get("/api/ats/applications", requireAgencyAdminAuth, async (c) => {
  const admin = c.get("agencyAdmin") as AgencyAdminRecord;
  const data = await loadData(c.env, { readOnly: true });
  const url = new URL(c.req.url);
  const query = toTrimmedString(url.searchParams.get("q")).toLowerCase();
  const sort = toTrimmedString(url.searchParams.get("sort")) || "qualificationScore:desc";
  const page = Math.max(1, toNumericValue(url.searchParams.get("page"), 1));
  const pageSize = Math.max(1, toNumericValue(url.searchParams.get("pageSize"), 20));
  const filtersRaw = toTrimmedString(url.searchParams.get("filters"));
  let filters: Record<string, unknown> = {};

  if (filtersRaw) {
    try {
      const parsed = JSON.parse(filtersRaw) as Record<string, unknown>;
      if (parsed && typeof parsed === "object") {
        filters = parsed;
      }
    } catch {
      filters = {};
    }
  }

  const profilesByApplicationId = new Map(
    data.ats.profiles.map((profile) => [profile.applicationId, profile] as const),
  );

  const listItems = data.ats.applications
    .filter(
      (item) => item.agencyId === admin.agencyId && item.source === "resume_upload",
    )
    .map((item) =>
      createAtsListItem(
        item,
        profilesByApplicationId.get(item.id) ?? null,
        data.ats.scores[item.id] ?? null,
      ),
    )
    .filter((item): item is Exclude<typeof item, null> => Boolean(item));

  const filtered = filterAtsApplications(listItems, query, filters);
  const sorted = sortAtsApplications(filtered, sort);
  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const paged = sorted.slice(start, start + pageSize);

  return c.json({
    data: paged,
    pageInfo: {
      page,
      pageSize,
      total,
      totalPages,
    },
  });
});

app.get("/api/ats/applications/:applicationId/stage", requireAgencyAdminAuth, async (c) => {
  return c.json({ error: "Method not allowed" }, 405);
});

app.patch("/api/ats/applications/:applicationId/stage", requireAgencyAdminAuth, async (c) => {
  const admin = c.get("agencyAdmin") as AgencyAdminRecord;
  const applicationId = c.req.param("applicationId");
  const body = await parseBody<{ stage?: RecruitmentStage; reason?: string }>(c.req.raw);
  const stage = body?.stage;

  if (!stage || !atsStageOrder.includes(stage)) {
    return c.json({ error: "stage is required" }, 400);
  }

  const data = await loadData(c.env);
  const application = data.ats.applications.find(
    (item) => item.id === applicationId && item.agencyId === admin.agencyId,
  );
  if (!application) {
    return c.json({ error: "Application not found" }, 404);
  }

  const previousStage = application.status;
  application.status = stage;
  application.updatedAt = now();
  data.ats.history[applicationId] = [
    {
      id: randomId("history"),
      fromStage: previousStage,
      toStage: stage,
      actor: admin.username || admin.email || "Agency Staff",
      reason:
        toTrimmedString(body?.reason) || `Stage changed to ${stage}`,
      createdAt: now(),
    },
    ...(data.ats.history[applicationId] ?? []),
  ];

  await saveData(c.env, data);
  return c.json(buildAtsBundle(data, applicationId));
});

app.get("/api/ats/applications/:applicationId", requireAgencyAdminAuth, async (c) => {
  const admin = c.get("agencyAdmin") as AgencyAdminRecord;
  const applicationId = c.req.param("applicationId");
  const data = await loadData(c.env, { readOnly: true });
  const bundle = buildAtsBundle(data, applicationId);
  if (!bundle || bundle.application.agencyId !== admin.agencyId) {
    return c.json({ error: "Application not found" }, 404);
  }
  return c.json(bundle);
});

app.post("/api/ats/bulk-actions", requireAgencyAdminAuth, async (c) => {
  const admin = c.get("agencyAdmin") as AgencyAdminRecord;
  const body = await parseBody<{
    applicationIds?: string[];
    action?: "approve" | "reject" | "request_documents" | "assign_interview";
  }>(c.req.raw);

  if (!Array.isArray(body?.applicationIds) || body.applicationIds.length === 0 || !body.action) {
    return c.json({ error: "applicationIds and action are required" }, 400);
  }

  const actionStageMap = {
    approve: "Approved",
    reject: "Rejected",
    request_documents: "Documents Submitted",
    assign_interview: "Screening Interview",
  } satisfies Record<NonNullable<typeof body.action>, RecruitmentStage>;

  const data = await loadData(c.env);
  const updatedIds: string[] = [];

  for (const applicationId of body.applicationIds) {
    const application = data.ats.applications.find(
      (item) => item.id === applicationId && item.agencyId === admin.agencyId,
    );
    if (!application) continue;
    const nextStage = actionStageMap[body.action];
    const previousStage = application.status;
    application.status = nextStage;
    application.updatedAt = now();
    data.ats.history[applicationId] = [
      {
        id: randomId("history"),
        fromStage: previousStage,
        toStage: nextStage,
        actor: admin.username || admin.email || "Agency Staff",
        reason: `Bulk action: ${body.action}`,
        createdAt: now(),
      },
      ...(data.ats.history[applicationId] ?? []),
    ];
    updatedIds.push(applicationId);
  }

  await saveData(c.env, data);
  return c.json({
    updated: updatedIds.length,
    data: updatedIds
      .map((applicationId) => buildAtsBundle(data, applicationId))
      .filter(Boolean),
  });
});

app.post("/api/ats/match", requireAgencyAdminAuth, async (c) => {
  const admin = c.get("agencyAdmin") as AgencyAdminRecord;
  const body = await parseBody<{ requirementText?: string; top?: number }>(c.req.raw);
  const requirementText = toTrimmedString(body?.requirementText).toLowerCase();
  if (!requirementText) {
    return c.json({ error: "requirementText is required" }, 400);
  }

  const top = Math.max(1, Math.min(20, toNumericValue(body?.top, 10)));
  const data = await loadData(c.env);
  const matches = data.ats.applications
    .filter(
      (item) => item.agencyId === admin.agencyId && item.source === "resume_upload",
    )
    .map((application) => {
      const profile = getAtsProfileByApplicationId(data, application.id);
      const score = data.ats.scores[application.id];
      if (!profile || !score) return null;
      const matchedSkills = [
        ...profile.languageSkills.filter((item) =>
          requirementText.includes(item.toLowerCase()),
        ),
        ...profile.cookingSkills.filter((item) =>
          requirementText.includes(item.toLowerCase()),
        ),
      ];
      if (
        requirementText.includes("newborn") &&
        profile.newbornCareExperience > 0
      ) {
        matchedSkills.push("Newborn care");
      }
      if (
        requirementText.includes("elderly") &&
        profile.elderlyCareExperience > 0
      ) {
        matchedSkills.push("Elderly care");
      }
      const matchScore = Math.min(
        100,
        Math.round(score.score * 0.7 + matchedSkills.length * 10),
      );
      return {
        applicationId: application.id,
        candidateName: profile.fullName,
        maidReferenceCode: profile.maidReferenceCode ?? application.applicationCode,
        matchScore,
        recommendation:
          matchedSkills.length > 0
            ? `Matched on ${matchedSkills.join(", ")}.`
            : "General shortlist candidate, but needs recruiter review against requirement.",
      };
    })
    .filter((item): item is Exclude<typeof item, null> => Boolean(item))
    .sort((left, right) => right.matchScore - left.matchScore)
    .slice(0, top);

  return c.json({ matches });
});

app.get("/api/ats/presets", requireAgencyAdminAuth, async (c) => {
  const admin = c.get("agencyAdmin") as AgencyAdminRecord;
  const data = await loadData(c.env);
  return c.json({
    presets: data.ats.presets.filter((item) => item.agencyId === admin.agencyId),
  });
});

app.post("/api/ats/presets", requireAgencyAdminAuth, async (c) => {
  const admin = c.get("agencyAdmin") as AgencyAdminRecord;
  const body = await parseBody<{ name?: string; filters?: Record<string, unknown> }>(c.req.raw);
  const name = toTrimmedString(body?.name);
  if (!name) {
    return c.json({ error: "name is required" }, 400);
  }

  const data = await loadData(c.env);
  const preset = {
    id: randomId("preset"),
    agencyId: admin.agencyId,
    name,
    filters:
      body?.filters && typeof body.filters === "object" ? body.filters : {},
    createdAt: now(),
  };
  data.ats.presets.unshift(preset);
  await saveData(c.env, data);
  return c.json({ preset }, 201);
});

app.all("/api/*", (c) => c.json({ error: "Not found" }, 404));

export default {
  async fetch(
    request: Request,
    env: Bindings,
    executionContext: ExecutionContext,
  ) {
    const url = new URL(request.url);
    if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
      try {
        return await app.fetch(request, env, executionContext);
      } catch (error) {
        console.error("Unhandled worker error", error);
        const publicMessage =
          error instanceof Error &&
          error.message.startsWith("No storage configured:")
            ? error.message
            : error instanceof Error &&
                (error.message.startsWith("Supabase read failed") ||
                  error.message.startsWith("Supabase write failed"))
              ? error.message
              : null;

        return jsonError(publicMessage ?? "Something went wrong!", 500);
      }
    }

    if (url.pathname === "/agencyadmin") {
      return Response.redirect(new URL("/agencyadmin/login", url), 302);
    }

    if (
      url.pathname === "/agency-admin-portal" ||
      url.pathname === "/agencyadminportal"
    ) {
      return Response.redirect(new URL("/agencyadmin/login", url), 302);
    }

    if (url.pathname === "/agency-portal" || url.pathname === "/agencyportal") {
      return Response.redirect(new URL("/agencies", url), 302);
    }

    if (url.pathname === "/user-portal" || url.pathname === "/userportal") {
      return Response.redirect(new URL("/employer-login", url), 302);
    }

    const isAssetRequest =
      url.pathname.startsWith("/assets/") ||
      url.pathname.startsWith("/favicon") ||
      url.pathname.startsWith("/robots.txt") ||
      url.pathname.startsWith("/maid_agency_logo_81.jpg") ||
      /\.[a-zA-Z0-9]+$/.test(url.pathname);

    const withFreshHtmlCacheHeaders = (response: Response) => {
      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("text/html")) {
        return response;
      }

      const headers = new Headers(response.headers);
      headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      headers.set("Pragma", "no-cache");
      headers.set("Expires", "0");
      headers.set("CDN-Cache-Control", "no-store");

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    };

    if (!isAssetRequest) {
      const spaRequest = new Request(new URL("/", url).toString(), request);
      const spaResponse = await env.ASSETS.fetch(spaRequest);
      return withFreshHtmlCacheHeaders(spaResponse);
    }

    const assetResponse = await env.ASSETS.fetch(request);
    if (assetResponse.status !== 404) {
      return assetResponse;
    }

    const spaRequest = new Request(new URL("/", url).toString(), request);
    const spaResponse = await env.ASSETS.fetch(spaRequest);
    return withFreshHtmlCacheHeaders(spaResponse);
  },
};
