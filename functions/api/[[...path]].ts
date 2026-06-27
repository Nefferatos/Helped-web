import { Hono } from "hono";
import { cors } from "hono/cors";
import type { ExecutionContext, KVNamespace } from "@cloudflare/workers-types";
import { classifyFallback } from "./fallbackClassifier";
import { runAiAutopilot } from "./services/ai/autopilot";
import { runAIAgent, streamAIAgent } from "./services/ai/agents";
import type { AiAgentId } from "./services/ai/prompts";
import {
  upsertMaidEmbedding,
  searchSimilarMaids,
  buildRecommendationQuery,
} from "./services/ai/embeddings";

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
  expiresAt?: string;
}

const CLIENT_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

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

type RequestStatus = "pending" | "interested" | "direct_hire" | "rejected";
type RequestType = "general" | "direct";
type RequestSenderType = "client" | "admin" | "staff" | "system";

interface RequestRecord {
  id: string;
  clientId: number;
  agencyId: number;
  type: RequestType;
  status: RequestStatus;
  details: Record<string, unknown>;
  maidReferences: string[];
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

interface RequestConversationRecord {
  id: string;
  requestId: string;
  agencyId: number;
  clientId: number;
  createdAt: string;
}

interface RequestMessageRecord {
  id: string;
  conversationId: string;
  senderType: RequestSenderType;
  senderId: number;
  message: string;
  attachments?: unknown;
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
  isBot?: boolean;
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
  | "Ready to Configure Public Profile"
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
  requests: RequestRecord[];
  requestConversations: RequestConversationRecord[];
  requestMessages: RequestMessageRecord[];
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
  AI?: { run(model: string, inputs: Record<string, unknown>): Promise<Record<string, unknown>> };
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_APP_DATA_TABLE?: string;
  SUPABASE_APP_DATA_ID?: string;
  SUPABASE_USE_NORMALIZED?: string;
  SUPABASE_STORAGE_BUCKET?: string;
  ANTHROPIC_API_KEY?: string;
  AI_AUTOPILOT_ENABLED?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM?: string;
  DEV_EXPOSE_CONFIRMATION_CODE?: string;
  MAKE_WEBHOOK_URL?: string;
  STORAGE_BACKEND?: string;
};

type Variables = {
  client: ClientRecord;
  agencyAdmin: AgencyAdminRecord;
};

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.use(
  "/api/*",
  cors({
    origin: (origin) => {
      const allowed = [
        "https://helped-web-v2.pages.dev",
        "http://localhost:5173",
        "http://localhost:3000",
      ];
      return allowed.includes(origin) ? origin : null;
    },
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  }),
);

app.use("/api/*", async (c, next) => {
  await next();
  c.res.headers.set("X-Content-Type-Options", "nosniff");
  c.res.headers.set("X-Frame-Options", "DENY");
  c.res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  c.res.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains",
  );
});

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
  enquiries: [],
  clients: [],
  clientSessions: [],
  agencyAdmins: [
    {
      id: 1,
      agencyId: 1,
      username: "attheagency",
      password: "",
      agencyName: "Main Agency",
      createdAt: now(),
    },
  ],
  agencyAdminSessions: [],
  directSales: [],
  requests: [],
  requestConversations: [],
  requestMessages: [],
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
  // Map each entry to a clean string or "" so internal empty slots are preserved.
  // Only trailing empty slots are trimmed — this lets slot 1 be empty while
  // slot 2 stays in slot 2 (the array index is the slot number).
  const raw = Array.isArray(maid.photoDataUrls)
    ? maid.photoDataUrls.map((item) =>
        typeof item === "string" && item.trim() ? item.trim() : "",
      )
    : maid.photoDataUrl
      ? [maid.photoDataUrl]
      : [];
  let len = raw.length;
  while (len > 0 && !raw[len - 1]) len--;
  const photos = raw.slice(0, Math.min(len, 5));

  return {
    ...maid,
    agencyId: Number.isInteger(Number(maid.agencyId)) ? Number(maid.agencyId) : 1,
    status: maid.status ?? "available",
    height: sanitizeInt(maid.height),
    weight: sanitizeInt(maid.weight),
    numberOfChildren: sanitizeInt(maid.numberOfChildren),
    numberOfSiblings: sanitizeInt(maid.numberOfSiblings),
    photoDataUrls: photos,
    photoDataUrl: photos.find(Boolean) ?? maid.photoDataUrl ?? "",
    videoDataUrl: maid.videoDataUrl ?? "",
    hasPhoto: photos.some(Boolean),
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
      admin.username === "admin"
        ? { ...admin, username: "attheagency" }
        : admin,
    );
  }
  const directSales = raw.directSales ?? defaults.directSales;
  const requests = Array.isArray(raw.requests)
    ? raw.requests
        .filter(
          (item): item is RequestRecord =>
            Boolean(item && typeof item === "object" && item.id),
        )
        .map((request) => ({
          ...request,
          clientId: Number.isInteger(Number(request.clientId))
            ? Number(request.clientId)
            : 0,
          agencyId: Number.isInteger(Number(request.agencyId))
            ? Number(request.agencyId)
            : 1,
          type: (request.type === "direct" ? "direct" : "general") as RequestType,
          status:
            request.status === "interested" ||
            request.status === "direct_hire" ||
            request.status === "rejected"
              ? (request.status as RequestStatus)
              : ("pending" as RequestStatus),
          details:
            request.details && typeof request.details === "object"
              ? request.details
              : {},
          maidReferences: Array.isArray(request.maidReferences)
            ? request.maidReferences
                .map((item) => String(item ?? "").trim())
                .filter(Boolean)
            : [],
          updatedBy: request.updatedBy ?? "system",
          createdAt: request.createdAt ?? now(),
          updatedAt: request.updatedAt ?? request.createdAt ?? now(),
        }))
    : defaults.requests;
  const requestConversations = Array.isArray(raw.requestConversations)
    ? raw.requestConversations.filter(
        (item): item is RequestConversationRecord =>
          Boolean(item && typeof item === "object" && item.id && item.requestId),
      )
    : defaults.requestConversations;
  const requestMessages = Array.isArray(raw.requestMessages)
    ? raw.requestMessages.filter(
        (item): item is RequestMessageRecord =>
          Boolean(item && typeof item === "object" && item.id && item.conversationId),
      )
    : defaults.requestMessages;
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
    requests,
    requestConversations,
    requestMessages,
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
  _options: LoadDataOptions = {},
): Promise<AppData> => {
  const raw = await kv.get("app-data.json");
  if (!raw) {
    const initial = defaultData();
    await kv.put("app-data.json", JSON.stringify({ ...initial, __v: 2 }));
    return initial;
  }

  const parsed = JSON.parse(stripBom(raw)) as Partial<AppData> & { __v?: number };
  // __v >= 2 means data was already normalized when saved — skip the expensive mergeAppData pass.
  // Still fill in any top-level fields that are missing (e.g. new fields added after this blob
  // was written) so callers never receive undefined where an array is expected.
  if ((parsed.__v ?? 0) >= 2) {
    const { __v: _v, ...data } = parsed as unknown as Record<string, unknown>;
    const defaults = defaultData() as unknown as Record<string, unknown>;
    for (const key of Object.keys(defaults)) {
      if (data[key] === undefined) {
        data[key] = defaults[key];
      }
    }
    return data as unknown as AppData;
  }
  return mergeAppData(parsed);
};

const saveDataToKv = async (kv: KVNamespace, data: AppData) => {
  // Mark as pre-normalized so the next load skips mergeAppData.
  await kv.put("app-data.json", JSON.stringify({ ...data, __v: 2 }));
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

const logSupabaseConfigDebug = (_env: Bindings) => {};

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

const isSupabaseStatementTimeout = (status: number, details: string) =>
  status >= 500 &&
  (details.includes('"code":"57014"') ||
    details.toLowerCase().includes("statement timeout") ||
    details.toLowerCase().includes("canceling statement"));

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
    requests: mergeCollectionWithBase(
      baseData.requests,
      localData.requests,
      remoteData.requests,
      (item) => item.id,
    ),
    requestConversations: mergeCollectionWithBase(
      baseData.requestConversations,
      localData.requestConversations,
      remoteData.requestConversations,
      (item) => item.id,
    ),
    requestMessages: mergeCollectionWithBase(
      baseData.requestMessages,
      localData.requestMessages,
      remoteData.requestMessages,
      (item) => item.id,
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
  const retryDelaysMs = [150, 400, 900];

  for (let attempt = 0; attempt <= retryDelaysMs.length; attempt += 1) {
    const response = await fetch(url, {
      method: "GET",
      headers: supabaseHeaders(config, { accept: "application/json" }),
    });

    if (!response.ok) {
      const details = await readSupabaseError(response);
      if (
        isSupabaseStatementTimeout(response.status, details) &&
        attempt < retryDelaysMs.length
      ) {
        await sleep(retryDelaysMs[attempt]);
        continue;
      }
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
  }

  throw new Error("Supabase read failed unexpectedly");
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
    headers: supabaseHeaders(config, { accept: "application/json", prefer: "statement_timeout=5000" }),
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
  const retryDelaysMs = [250, 600];

  for (let attempt = 0; attempt <= retryDelaysMs.length; attempt++) {
    if (attempt > 0) await sleep(retryDelaysMs[attempt - 1]);

    const response = await fetch(url, {
      method: "POST",
      headers: supabaseHeaders(config, {
        "content-type": "application/json",
        accept: "application/json",
        prefer: "statement_timeout=5000",
      }),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const details = await readSupabaseError(response);
      if (isSupabaseStatementTimeout(response.status, details) && attempt < retryDelaysMs.length) {
        console.warn(`Supabase RPC timeout for ${fnName}, retrying (${attempt + 1}/${retryDelaysMs.length})...`);
        continue;
      }
      throw new Error(`Supabase RPC failed for ${fnName} (${response.status}): ${details}`);
    }

    if (response.status === 204) return null as T;
    return (await response.json()) as T;
  }

  throw new Error(`Supabase RPC failed for ${fnName} after retries`);
};

const tryCallSupabaseRpc = async <T>(
  config: SupabaseAppDataConfig,
  fnName: string,
  payload: Record<string, unknown>,
): Promise<T | null> => {
  try {
    return await callSupabaseRpc<T>(config, fnName, payload);
  } catch (error) {
    console.warn(`Fast Supabase RPC path failed for ${fnName}; falling back`, error);
    return null;
  }
};

type SupabaseMaidRow = {
  record_id?: number;
  payload?: MaidRecord;
};

type SupabaseAppMaidViewRow = {
  raw_record?: MaidRecord;
};

type MaidSlimRow = {
  record_id?: number;
  agency_id?: number;
  reference_code?: string;
  full_name?: string;
  status?: string;
  nationality?: string;
  maid_type?: string;
  is_public?: boolean;
  has_photo?: boolean;
  created_at?: string;
  updated_at?: string;
};

// Only top-level indexed columns — no payload JSONB extraction.
// Reading payload->>field forces Postgres to parse the full 400 KB JSONB
// (including embedded base64 photos) for every row, which causes 57014 timeouts.
const SLIM_MAID_SELECT = [
  "record_id", "agency_id", "reference_code", "full_name", "status",
  "nationality", "maid_type", "is_public", "has_photo", "created_at", "updated_at",
].join(",");

const slimRowToMaidRecord = (row: MaidSlimRow): MaidRecord => ({
  id: Number(row.record_id ?? 0),
  agencyId: Number(row.agency_id ?? 1) || 1,
  fullName: row.full_name ?? "",
  referenceCode: row.reference_code ?? "",
  status: row.status ?? "available",
  type: row.maid_type ?? "",
  nationality: row.nationality ?? "",
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
  languageSkills: {},
  skillsPreferences: {},
  workAreas: {},
  employmentHistory: [],
  introduction: {},
  agencyContact: {},
  photoDataUrl: "",
  photoDataUrls: [],
  videoDataUrl: "",
  isPublic: Boolean(row.is_public),
  hasPhoto: Boolean(row.has_photo),
  createdAt: row.created_at ?? "",
  updatedAt: row.updated_at ?? "",
});

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
    noPhotos,
  }: {
    search?: string;
    visibility?: string;
    agencyId?: number;
    offset: number;
    limit?: number;
    noPhotos?: boolean;
  },
) => {
  const table = encodeURIComponent("helped_maids");
  const params = new URLSearchParams();
  params.set("select", noPhotos ? SLIM_MAID_SELECT : "record_id,payload");
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
    prefer: "count=estimated, statement_timeout=5000",
  }));
  if (typeof limit === "number" && limit > 0) {
    headers.set("range-unit", "items");
    headers.set("range", `${offset}-${offset + limit - 1}`);
  }

  const retryDelaysMs = [300];
  for (let attempt = 0; attempt <= retryDelaysMs.length; attempt++) {
    if (attempt > 0) await sleep(retryDelaysMs[attempt - 1]);

    const response = await fetch(
      `${config.baseUrl}/rest/v1/${table}?${params.toString()}`,
      { method: "GET", headers },
    );

    if (!response.ok && response.status !== 206) {
      const details = await readSupabaseError(response);
      if (isSupabaseStatementTimeout(response.status, details) && attempt < retryDelaysMs.length) {
        console.warn(`Supabase maid list timeout, retrying...`);
        continue;
      }
      throw new Error(`Supabase maid list failed (${response.status}): ${details}`);
    }

    const total = parseContentRangeTotal(response.headers.get("content-range")) ?? 0;
    if (noPhotos) {
      const rows = (await response.json()) as MaidSlimRow[];
      return { maids: rows.map(slimRowToMaidRecord), total: total || rows.length };
    }
    const rows = (await response.json()) as SupabaseMaidRow[];
    return {
      maids: rows.map((row) => row.payload).filter((maid): maid is MaidRecord => Boolean(maid)).map(normalizeMaid),
      total: total || rows.length,
    };
  }
  throw new Error("Supabase maid list failed after retries");
};

const listMaidsFromSupabaseAppView = async (
  config: SupabaseAppDataConfig,
  {
    search,
    visibility,
    agencyId,
    offset,
    limit,
    noPhotos,
  }: {
    search?: string;
    visibility?: string;
    agencyId?: number;
    offset: number;
    limit?: number;
    noPhotos?: boolean;
  },
) => {
  const table = encodeURIComponent("app_maids");
  const params = new URLSearchParams();
  params.set("select", "raw_record");
  params.set("order", "updated_at.desc.nullslast,view_row_id.desc");
  params.set("app_id", `eq.${config.rowId}`);

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
    prefer: "count=estimated, statement_timeout=5000",
  }));
  if (typeof limit === "number" && limit > 0) {
    headers.set("range-unit", "items");
    headers.set("range", `${offset}-${offset + limit - 1}`);
  }

  const retryDelaysMs = [300];
  for (let attempt = 0; attempt <= retryDelaysMs.length; attempt++) {
    if (attempt > 0) await sleep(retryDelaysMs[attempt - 1]);

    const response = await fetch(
      `${config.baseUrl}/rest/v1/${table}?${params.toString()}`,
      { method: "GET", headers },
    );

    if (!response.ok && response.status !== 206) {
      const details = await readSupabaseError(response);
      if (isSupabaseStatementTimeout(response.status, details) && attempt < retryDelaysMs.length) {
        console.warn(`Supabase maid view list timeout, retrying...`);
        continue;
      }
      throw new Error(`Supabase maid view list failed (${response.status}): ${details}`);
    }

    const rows = (await response.json()) as SupabaseAppMaidViewRow[];
    const total = parseContentRangeTotal(response.headers.get("content-range")) ?? rows.length;
    const maids = rows
      .map((row) => row.raw_record)
      .filter((maid): maid is MaidRecord => Boolean(maid))
      .map((maid) => noPhotos ? { ...normalizeMaid(maid), photoDataUrl: "", photoDataUrls: [] } : normalizeMaid(maid));
    return { maids, total };
  }
  throw new Error("Supabase maid view list failed after retries");
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
        app_id: config.rowId,
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

const updateMaidMediaInSupabaseNormalized = async (
  config: SupabaseAppDataConfig,
  referenceCode: string,
  media: Pick<MaidRecord, "photoDataUrl" | "photoDataUrls" | "hasPhoto" | "videoDataUrl">,
) => {
  const existing = await getMaidFromSupabaseNormalized(config, referenceCode);
  if (!existing) return null;

  const updatedAt = now();
  const payload: MaidRecord = {
    ...existing,
    ...media,
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
        has_photo: payload.hasPhoto,
        updated_at: updatedAt,
        payload,
      }),
    },
  );

  if (!response.ok) {
    const details = await readSupabaseError(response);
    throw new Error(`Supabase maid media update failed (${response.status}): ${details}`);
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

const savePublicAtsApplicationToSupabaseNormalized = async (
  config: SupabaseAppDataConfig,
  parsed: {
    application: AtsApplicationRecord;
    profile: AtsApplicationProfileRecord;
    score: AtsScoreRecord;
    documents: AtsDocumentRecord[];
    history: AtsHistoryRecord[];
    notifications: AtsNotificationRecord[];
  },
) => {
  const { application, profile, score, documents, history, notifications } = parsed;

  await upsertSupabaseTableRows(
    config,
    "helped_ats_applications",
    [{
      app_id: config.rowId,
      record_id: application.id,
      agency_id: application.agencyId,
      profile_id: application.profileId,
      application_code: application.applicationCode,
      status: application.status,
      source: application.source,
      applied_at: application.appliedAt,
      updated_at: application.updatedAt,
      payload: application,
    }],
    "app_id,record_id",
  );

  await upsertSupabaseTableRows(
    config,
    "helped_ats_profiles",
    [{
      app_id: config.rowId,
      record_id: profile.id,
      application_id: application.id,
      full_name: profile.fullName,
      email: profile.email,
      contact_number: profile.contactNumber,
      nationality: profile.nationality,
      years_of_experience: profile.yearsOfExperience,
      expected_salary: profile.expectedSalary,
      created_at: profile.createdAt,
      updated_at: profile.updatedAt,
      payload: profile,
    }],
    "app_id,record_id",
  );

  await upsertSupabaseTableRows(
    config,
    "helped_ats_scores",
    [{
      app_id: config.rowId,
      application_id: application.id,
      score: score.score,
      category: score.category,
      payload: score,
    }],
    "app_id,application_id",
  );

  if (history.length > 0) {
    await upsertSupabaseTableRows(
      config,
      "helped_ats_history",
      history.map((item) => ({
        app_id: config.rowId,
        record_id: item.id,
        application_id: application.id,
        to_stage: item.toStage,
        created_at: item.createdAt,
        payload: item,
      })),
      "app_id,record_id",
    );
  }

  if (documents.length > 0) {
    await upsertSupabaseTableRows(
      config,
      "helped_ats_documents",
      documents.map((item) => ({
        app_id: config.rowId,
        record_id: item.id,
        application_id: application.id,
        document_type: item.type,
        file_name: item.name,
        uploaded_at: item.uploadedAt,
        file_size: item.size,
        payload: item,
      })),
      "app_id,record_id",
    );
  }

  if (notifications.length > 0) {
    await upsertSupabaseTableRows(
      config,
      "helped_ats_notifications",
      notifications.map((item) => ({
        app_id: config.rowId,
        record_id: item.id,
        application_id: application.id,
        event: item.event,
        channel: item.channel,
        created_at: item.createdAt,
        payload: item,
      })),
      "app_id,record_id",
    );
  }
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
      const isRetryableTimeout = isSupabaseStatementTimeout(
        response.status,
        details,
      );

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

// ─── Module-level app-data cache ─────────────────────────────────────────────
const isKvBackend = (env: Bindings) =>
  env.STORAGE_BACKEND?.trim().toLowerCase() === "kv";

// Shared across requests within the same Worker isolate (15-second TTL).
// Returns a direct reference (no clone) to avoid CPU-intensive structuredClone on large blobs.
// Write paths always call bustAppDataCache() → saveData() → putAppDataCache() so the shared
// reference is evicted before the caller's mutation is persisted.
const APP_DATA_CACHE_TTL_MS = 15_000;
let _appDataCache: { data: AppData; ts: number } | null = null;

const getAppDataCache = (): AppData | null => {
  if (!_appDataCache) return null;
  if (Date.now() - _appDataCache.ts > APP_DATA_CACHE_TTL_MS) { _appDataCache = null; return null; }
  return _appDataCache.data;
};
const putAppDataCache = (data: AppData) => { _appDataCache = { data, ts: Date.now() }; };
const bustAppDataCache = () => { _appDataCache = null; };

const loadData = async (
  env: Bindings,
  options: LoadDataOptions = {},
): Promise<AppData> => {
  if (isKvBackend(env) && env.APP_DATA) {
    const hit = getAppDataCache();
    if (hit) return hit;
    const data = await loadDataFromKv(env.APP_DATA, options);
    putAppDataCache(data);
    return data;
  }
  const supabase = getSupabaseAppDataConfig(env);
  if (supabase) {
    if (isNormalizedSupabaseEnabled(env)) {
      // Hot path: serve from in-memory cache
      const hit = getAppDataCache();
      if (hit) return hit;
      try {
        const data = await loadDataFromSupabaseNormalized(supabase);
        putAppDataCache(data);
        return data;
      } catch (error) {
        console.warn("Normalized Supabase load failed; falling back to app_data", error);
      }
    }
    // Hot path: serve from in-memory cache. Cached data retains Supabase updated_at tracking
    // (non-enumerable property), so write paths still get a valid version for optimistic locking.
    // saveDataToSupabase retry logic handles conflicts if the version is stale.
    const hit = getAppDataCache();
    if (hit && (options.readOnly || getSupabaseTrackedUpdatedAt(hit))) return hit;
    const data = await loadDataFromSupabase(supabase, options);
    putAppDataCache(data);
    return data;
  }

  if (!env.APP_DATA) {
    throw new Error(
      "No storage configured: set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY, or bind APP_DATA KV.",
    );
  }

  return await loadDataFromKv(env.APP_DATA, options);
};

const saveData = async (env: Bindings, data: AppData) => {
  bustAppDataCache(); // invalidate before write so concurrent reads don't serve stale data
  if (isKvBackend(env) && env.APP_DATA) {
    await saveDataToKv(env.APP_DATA, data);
    putAppDataCache(data);
    return;
  }
  const supabase = getSupabaseAppDataConfig(env);
  if (supabase) {
    if (isNormalizedSupabaseEnabled(env)) {
      try {
        await saveDataToSupabaseNormalized(supabase, data);
        putAppDataCache(data); // re-prime with what we just saved
        return;
      } catch (error) {
        console.warn("Normalized Supabase save failed; falling back to app_data", error);
      }
    }
    await saveDataToSupabase(supabase, data);
    putAppDataCache(data); // re-prime with saved data (includes new updated_at)
    return;
  }

  if (!env.APP_DATA) {
    throw new Error(
      "No storage configured: set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY, or bind APP_DATA KV.",
    );
  }

  await saveDataToKv(env.APP_DATA, data);
};

const AGENCY_SESSION_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

const mergeAgencyAdminSessions = (sessions: AgencyAdminSessionRecord[]) => {
  const seen = new Set<string>();
  const cutoff = Date.now() - AGENCY_SESSION_TTL_MS;
  return sessions
    .filter((session) => {
      if (!session?.token || seen.has(session.token)) {
        return false;
      }
      // Drop sessions older than 90 days to prevent unbounded KV growth.
      if (session.createdAt && new Date(session.createdAt).getTime() < cutoff) {
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

// ─── Module-level agency-admin session cache (30 s TTL) ──────────────────────
// requireAgencyAdminAuth fires on every admin request. Without a cache each
// call hits Supabase for the sessions table (+200-500 ms). With the cache,
// subsequent requests within the same isolate pay ~1 ms.
const SESSIONS_CACHE_TTL_MS = 30_000;
let _sessionsCache: { sessions: AgencyAdminSessionRecord[]; ts: number } | null = null;
const getSessionsCache = (): AgencyAdminSessionRecord[] | null => {
  if (!_sessionsCache || Date.now() - _sessionsCache.ts > SESSIONS_CACHE_TTL_MS) { _sessionsCache = null; return null; }
  return _sessionsCache.sessions;
};
const putSessionsCache = (sessions: AgencyAdminSessionRecord[]) => { _sessionsCache = { sessions, ts: Date.now() }; };
const bustSessionsCache = () => { _sessionsCache = null; };

const loadAgencyAdminSessions = async (
  env: Bindings,
  fallbackData?: AppData,
) => {
  // Hot path: serve from module cache
  const cached = getSessionsCache();
  if (cached) return cached;

  const supabase = getSupabaseAppDataConfig(env);
  if (supabase) {
    if (isNormalizedSupabaseEnabled(env)) {
      const sessions = await loadAgencyAdminSessionsFromSupabaseNormalized(supabase);
      putSessionsCache(sessions);
      return sessions;
    }
    const sessions = await loadAgencyAdminSessionsFromSupabase(supabase);
    if (sessions.length > 0) {
      putSessionsCache(sessions);
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
  bustSessionsCache(); // invalidate before write
  const supabase = getSupabaseAppDataConfig(env);
  if (supabase) {
    if (isNormalizedSupabaseEnabled(env)) {
      await saveAgencyAdminSessionsToSupabaseNormalized(supabase, sessions);
      putSessionsCache(mergeAgencyAdminSessions(sessions)); // re-prime with saved data
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
      // Propagate upstream rate-limit as 429 so clients can retry correctly.
      if (/rate.?limit|429/i.test(message)) return jsonError("Rate limit exceeded, please try again later", 429);
      // Propagate upstream AI daily-limit as 503.
      if (/tokens per day|daily.?limit/i.test(message)) return jsonError("AI service temporarily unavailable", 503);
      // Surface AI errors with a friendly user-facing message.
      if (/ANTHROPIC_API_KEY|model_not_found|context_length|invalid_api_key|decommissioned|AI service|AI receptionist/i.test(message)) {
        const friendly = /temporarily unavailable|not configured|contact support/i.test(message)
          ? message
          : "The AI receptionist is temporarily unavailable. Please try again in a moment.";
        return jsonError(friendly, 502);
      }
      return jsonError("Internal Server Error", 500);
    }
  };

app.onError((error, c) => {
  console.error("Unhandled API error", c.req.method, c.req.path, error);
  return jsonError("Internal Server Error", 500);
});

const parseAuthorizationToken = (request: Request) => {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice(7).trim() || null;
};

const requireClientAuth = async (c: any, next: () => Promise<void>) => {
  const token = parseAuthorizationToken(c.req.raw);
  if (!token) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const data = await loadData(c.env);
    const session = data.clientSessions.find((item) => item.token === token);
    if (session) {
      if (session.expiresAt && Date.now() > new Date(session.expiresAt).getTime()) {
        return c.json({ error: "Unauthorized" }, 401);
      }
      const client = data.clients.find((item) => item.id === session.clientId);
      if (!client) {
        return c.json({ error: "Unauthorized" }, 401);
      }
      c.set("client", client);
      await next();
      return;
    }

    // Supabase Auth JWT support (Google/Facebook/Phone).
    const supabaseUser = await getSupabaseAuthUser(c.env, token);
    if (!supabaseUser) {
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

    // First-time Supabase login: create an app client record.;
    const nameFromMeta =
      (supabaseUser.user_metadata?.full_name as string | undefined) ??
      (supabaseUser.user_metadata?.name as string | undefined) ??
      "";
    const companyFromMeta =
      (supabaseUser.user_metadata?.company as string | undefined) ?? "";
    const phoneFromMeta =
      (supabaseUser.user_metadata?.phone as string | undefined) ?? "";
    const created: ClientRecord = {
      id: data.counters.clients++,
      supabaseUserId: supabaseUser.id,
      name:
        nameFromMeta ||
        (supabaseUser.email ? supabaseUser.email.split("@")[0] : "Client"),
      company: companyFromMeta.trim(),
      phone: (supabaseUser.phone || phoneFromMeta).trim(),
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
        return c.json({ error: "Unauthorized" }, 401);
      }
      c.set("agencyAdmin", matchedAdmin);
      await next();
      return;
    }

    // Supabase Auth JWT support (optional).
    // Security: we only allow JWT auth for agency admins that already exist in app data.
    const supabaseUser = await getSupabaseAuthUser(c.env, token);
    if (!supabaseUser) {
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
  "Ready to Configure Public Profile",
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

const ensuredStorageBuckets = new Set<string>();

const ensureSupabaseStorageBucket = async (config: SupabaseStorageConfig) => {
  if (ensuredStorageBuckets.has(config.bucket)) return;

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

  if (!response.ok && response.status !== 409) {
    const message = await readSupabaseError(response);
    if (!message.toLowerCase().includes("duplicate")) {
      throw new Error(`Supabase storage bucket error: ${message}`);
    }
  }

  // Existing buckets may have been created with a restrictive MIME-type
  // allowlist (e.g. only images/PDFs), which rejects maid intro videos and
  // other file types. Clear that restriction so all upload kinds work.
  const updateResponse = await fetch(
    `${config.baseUrl}/storage/v1/bucket/${encodeURIComponent(config.bucket)}`,
    {
      method: "PUT",
      headers: supabaseStorageHeaders(config, {
        "content-type": "application/json",
      }),
      body: JSON.stringify({
        public: true,
        file_size_limit: "52428800",
        allowed_mime_types: null,
      }),
    },
  );

  if (!updateResponse.ok) {
    console.warn(
      `Supabase storage bucket update warning: ${await readSupabaseError(updateResponse)}`,
    );
  }

  ensuredStorageBuckets.add(config.bucket);
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
    return trimmed;
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
  // Preserve slot positions — only trim trailing empty entries so that
  // removing slot 1 does not shift slot 2 into slot 1.
  const rawSlots = (
    Array.isArray(maid.photoDataUrls) && maid.photoDataUrls.length > 0
      ? maid.photoDataUrls
      : maid.photoDataUrl
        ? [maid.photoDataUrl]
        : []
  ).slice(0, 5);
  let slotLen = rawSlots.length;
  while (slotLen > 0 && !rawSlots[slotLen - 1]) slotLen--;
  const slottedPhotos = rawSlots.slice(0, slotLen);

  // Upload filled slots; pass empty slots through unchanged.
  const photoDataUrls = await Promise.all(
    slottedPhotos.map((photo, index) =>
      typeof photo === "string" && photo.trim().length > 0
        ? uploadMaidMediaToSupabaseStorage(
            env,
            photo,
            maid.agencyId,
            maid.referenceCode,
            "photos",
            index,
          )
        : Promise.resolve(""),
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
    photoDataUrl: photoDataUrls.find(Boolean) ?? "",
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
      (item) =>
        item.status === "Ready to Configure Public Profile" ||
        item.status === "Ready For Client Matching",
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
  const agencyId = toNumericValue(formData.get("agencyId"), 0);
  if (!agencyId || agencyId <= 0) throw new Error("agencyId is required");
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

const hashPassword = async (password: string): Promise<string> => {
  const salt = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: new TextEncoder().encode(salt), iterations: 100_000, hash: "SHA-256" },
    keyMaterial,
    256,
  );
  const hash = Array.from(new Uint8Array(bits))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `pbkdf2:${salt}:${hash}`;
};

const verifyPassword = async (password: string, stored: string): Promise<boolean> => {
  if (!stored.startsWith("pbkdf2:")) {
    // Legacy plaintext password — reject and force the user to reset their password.
    // Direct string comparison was removed to prevent plaintext credential exposure.
    return false;
  }
  const parts = stored.split(":");
  if (parts.length !== 3) return false;
  const [, salt, expectedHash] = parts;
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: new TextEncoder().encode(salt), iterations: 100_000, hash: "SHA-256" },
    keyMaterial,
    256,
  );
  const hash = Array.from(new Uint8Array(bits))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hash === expectedHash;
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

const SUPABASE_USER_CACHE_MAX = 500;
const supabaseUserCache = new Map<
  string,
  { user: SupabaseAuthUser; expiresAt: number }
>();

const getSupabaseAuthUser = async (env: Bindings, accessToken: string) => {

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
    // Evict expired entries before inserting.
    const now = Date.now();
    for (const [key, entry] of supabaseUserCache) {
      if (entry.expiresAt <= now) supabaseUserCache.delete(key);
    }
    // Enforce size cap (LRU-lite: delete oldest insertion when full).
    if (supabaseUserCache.size >= SUPABASE_USER_CACHE_MAX) {
      supabaseUserCache.delete(supabaseUserCache.keys().next().value!);
    }
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

const normalizeCsvColumnKey = (value: unknown) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/^\uFEFF/, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const csvImportColumnAliases: Record<string, string> = {
  reference_code: "referenceCode",
  referencecode: "referenceCode",
  ref_code: "referenceCode",
  refcode: "referenceCode",
  ref: "referenceCode",
  ref_no: "referenceCode",
  reference_no: "referenceCode",
  maid_ref: "referenceCode",
  maid_reference: "referenceCode",
  maid_reference_code: "referenceCode",
  name: "fullName",
  full_name: "fullName",
  full_name_of_fdw: "fullName",
  fullname: "fullName",
  maid_name: "fullName",
  maidname: "fullName",
  fdw_name: "fullName",
  photo: "photoDataUrl",
  photo_url: "photoDataUrl",
  image: "photoDataUrl",
  image_url: "photoDataUrl",
  picture: "photoDataUrl",
  country: "nationality",
};

const normalizeCsvImportHeader = (header: string) =>
  csvImportColumnAliases[normalizeCsvColumnKey(header)] ?? header.trim().replace(/^\uFEFF/, "");

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

const sanitizeInt = (value: unknown): number => {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  if (typeof value === "string") {
    const nums = value.match(/\d+/g)?.map(Number) ?? [];
    return nums.reduce((a, b) => a + b, 0);
  }
  return 0;
};

const toMaidRecordPayload = (
  maid: Record<string, unknown>,
): Omit<MaidRecord, "id" | "createdAt" | "updatedAt"> => {
  const rawPhotoDataUrl =
    typeof maid.photoDataUrl === "string" ? maid.photoDataUrl : "";
  // Preserve internal empty slots (array index = slot number).
  // Only trailing empty entries are trimmed.
  const rawPhotos = Array.isArray(maid.photoDataUrls)
    ? maid.photoDataUrls.map((item): string =>
        typeof item === "string" && item.trim().length > 0 ? item.trim() : "",
      )
    : rawPhotoDataUrl
      ? [rawPhotoDataUrl]
      : [];
  let pLen = rawPhotos.length;
  while (pLen > 0 && !rawPhotos[pLen - 1]) pLen--;
  const photoDataUrls = rawPhotos.slice(0, Math.min(pLen, 5));
  const photoDataUrl = photoDataUrls.find(Boolean) ?? rawPhotoDataUrl;

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
    height: sanitizeInt(maid.height),
    weight: sanitizeInt(maid.weight),
    religion: String(maid.religion),
    maritalStatus: String(maid.maritalStatus),
    numberOfChildren: sanitizeInt(maid.numberOfChildren),
    numberOfSiblings: sanitizeInt(maid.numberOfSiblings),
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
    photoDataUrls: photoDataUrls,
    photoDataUrl,
    videoDataUrl:
      typeof maid.videoDataUrl === "string" ? maid.videoDataUrl : "",
    isPublic: Boolean(maid.isPublic),
    hasPhoto:
      typeof maid.hasPhoto === "boolean"
        ? maid.hasPhoto
        : photoDataUrls.some(Boolean) || Boolean(photoDataUrl),
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

  const headers = parseCsvRow(lines[0]).map(normalizeCsvImportHeader);
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

type RequestActor =
  | { type: "admin"; admin: AgencyAdminRecord }
  | { type: "client"; client: ClientRecord };

const requestStatusSet = new Set<RequestStatus>([
  "pending",
  "interested",
  "direct_hire",
  "rejected",
]);

const isRequestStatus = (value: unknown): value is RequestStatus =>
  requestStatusSet.has(String(value ?? "") as RequestStatus);

const resolveRequestActor = async (
  env: Bindings,
  request: Request,
  data: AppData,
): Promise<{ actor: RequestActor | null; dataChanged: boolean }> => {
  const token = parseAuthorizationToken(request);
  if (!token) return { actor: null, dataChanged: false };

  const sessions = await loadAgencyAdminSessions(env, data);
  const session = sessions.find((item) => item.token === token);
  if (session) {
    const admin =
      session.admin
        ? ({
            id: session.admin.id,
            agencyId: session.admin.agencyId,
            username: session.admin.username,
            email: session.admin.email ?? "",
            password: "",
            agencyName: session.admin.agencyName,
            emailVerified: session.admin.emailVerified,
            profileImageUrl: session.admin.profileImageUrl ?? "",
            createdAt: session.admin.createdAt,
          } satisfies AgencyAdminRecord)
        : data.agencyAdmins.find((item) => item.id === session.adminId) ?? null;
    if (admin) return { actor: { type: "admin", admin }, dataChanged: false };
  }

  const clientSession = data.clientSessions.find((item) => item.token === token);
  if (clientSession) {
    const client = data.clients.find((item) => item.id === clientSession.clientId);
    if (client) return { actor: { type: "client", client }, dataChanged: false };
  }

  const supabaseUser = await getSupabaseAuthUser(env, token);
  if (!supabaseUser) return { actor: null, dataChanged: false };

  const normalizedEmail = supabaseUser.email ? normalizeEmail(supabaseUser.email) : "";
  const admin =
    data.agencyAdmins.find(
      (item) => item.supabaseUserId && item.supabaseUserId === supabaseUser.id,
    ) ??
    (normalizedEmail
      ? data.agencyAdmins.find((item) => normalizeEmail(item.email ?? "") === normalizedEmail)
      : null);
  if (admin) {
    if (!admin.supabaseUserId) {
      admin.supabaseUserId = supabaseUser.id;
      return { actor: { type: "admin", admin }, dataChanged: true };
    }
    return { actor: { type: "admin", admin }, dataChanged: false };
  }

  let client =
    data.clients.find(
      (item) => item.supabaseUserId && item.supabaseUserId === supabaseUser.id,
    ) ??
    (normalizedEmail
      ? data.clients.find((item) => normalizeEmail(item.email) === normalizedEmail)
      : null) ??
    (supabaseUser.phone
      ? data.clients.find((item) => (item.phone ?? "").trim() === supabaseUser.phone!.trim())
      : null);

  if (client) {
    if (!client.supabaseUserId) {
      client.supabaseUserId = supabaseUser.id;
      return { actor: { type: "client", client }, dataChanged: true };
    }
    return { actor: { type: "client", client }, dataChanged: false };
  }

  const nameFromMeta =
    (supabaseUser.user_metadata?.full_name as string | undefined) ??
    (supabaseUser.user_metadata?.name as string | undefined) ??
    "";
  client = {
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
  data.clients.unshift(client);
  return { actor: { type: "client", client }, dataChanged: true };
};

const getRequestAgencyName = (data: AppData, agencyId: number) =>
  data.agencyAdmins.find((admin) => admin.agencyId === agencyId)?.agencyName ||
  data.companyProfile.short_name ||
  data.companyProfile.company_name ||
  "";

const requestBudget = (details: Record<string, unknown>) => {
  const budget = details.budget;
  return typeof budget === "string" && budget.trim() ? budget.trim() : null;
};

const requestSummary = (request: RequestRecord, maids: MaidRecord[]) => {
  if (request.type === "direct") {
    const firstReference = request.maidReferences[0];
    const matchedMaid = firstReference
      ? maids.find((maid) => maid.referenceCode === firstReference)
      : null;
    const label = matchedMaid?.fullName || firstReference || "Maid request";
    return `Direct request for ${label}`;
  }

  const primaryDuty =
    typeof request.details.primaryDuty === "string" && request.details.primaryDuty.trim()
      ? request.details.primaryDuty.trim()
      : null;
  const nationality =
    typeof request.details.nationality === "string" && request.details.nationality.trim()
      ? request.details.nationality.trim()
      : null;

  if (primaryDuty && nationality) return `${primaryDuty} request (${nationality})`;
  if (primaryDuty) return `${primaryDuty} request`;
  if (nationality) return `${nationality} maid request`;
  return "General maid request";
};

const buildRequestResponse = (data: AppData, request: RequestRecord) => {
  const client =
    request.clientId > 0
      ? data.clients.find((item) => item.id === request.clientId) ?? null
      : null;
  const details = request.details ?? {};
  const fallbackClientName = toTrimmedString(
    (details as { clientName?: unknown }).clientName,
  );
  const fallbackClientEmail = toTrimmedString(
    (details as { clientEmail?: unknown }).clientEmail,
  );
  const fallbackClientPhone = toTrimmedString(
    (details as { clientPhone?: unknown }).clientPhone,
  );

  return {
    id: request.id,
    clientId: request.clientId > 0 ? request.clientId : null,
    type: request.type,
    agencyId: request.agencyId,
    agencyName: getRequestAgencyName(data, request.agencyId),
    status: request.status,
    summary: requestSummary(request, data.maids),
    budget: requestBudget(details),
    details,
    maidReferences: request.maidReferences,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
    updatedBy: request.updatedBy,
    client: client
      ? {
          id: client.id,
          name: client.name,
          company: client.company ?? "",
          phone: client.phone ?? "",
          email: client.email,
          createdAt: client.createdAt,
          profileImageUrl: client.profileImageUrl ?? "",
        }
      : fallbackClientName || fallbackClientEmail || fallbackClientPhone
        ? {
            id: 0,
            name: fallbackClientName || "Client request",
            company: "",
            phone: fallbackClientPhone,
            email: fallbackClientEmail || "No email",
            createdAt: request.createdAt,
            profileImageUrl: "",
          }
        : null,
    maids: request.maidReferences
      .map(
        (referenceCode) =>
          data.maids.find(
            (maid) =>
              maid.referenceCode === referenceCode &&
              (!request.agencyId || maid.agencyId === request.agencyId),
          ) ?? data.maids.find((maid) => maid.referenceCode === referenceCode) ?? null,
      )
      .filter((maid): maid is MaidRecord => Boolean(maid))
      .map((maid) => ({
        referenceCode: maid.referenceCode,
        fullName: maid.fullName,
        nationality: maid.nationality,
        status: maid.status ?? "available",
        type: maid.type,
        photoDataUrl: maid.photoDataUrl,
      })),
  };
};

const canAccessRequest = (actor: RequestActor, request: RequestRecord) => {
  if (actor.type === "client") return request.clientId === actor.client.id;
  return request.agencyId === actor.admin.agencyId;
};

type SupabaseRequestQueryRow = {
  request_id?: string;
  payload?: RequestRecord;
  created_at?: string;
};

type SupabaseRequestConversationQueryRow = {
  conversation_id?: string;
  payload?: RequestConversationRecord;
};

type SupabaseRequestMessageQueryRow = {
  message_id?: string;
  payload?: RequestMessageRecord;
};

const requestToQueryRow = (
  config: SupabaseAppDataConfig,
  request: RequestRecord,
) => ({
  app_id: config.rowId,
  request_id: request.id,
  client_id: request.clientId,
  agency_id: request.agencyId,
  request_type: request.type,
  status: request.status,
  maid_references: request.maidReferences,
  summary: requestSummary(request, []),
  updated_by: request.updatedBy,
  created_at: request.createdAt,
  updated_at: request.updatedAt,
  payload: request,
});

const conversationToQueryRow = (
  config: SupabaseAppDataConfig,
  conversation: RequestConversationRecord,
) => ({
  app_id: config.rowId,
  conversation_id: conversation.id,
  request_id: conversation.requestId,
  agency_id: conversation.agencyId,
  client_id: conversation.clientId,
  created_at: conversation.createdAt,
  payload: conversation,
});

const messageToQueryRow = (
  config: SupabaseAppDataConfig,
  message: RequestMessageRecord,
) => ({
  app_id: config.rowId,
  message_id: message.id,
  conversation_id: message.conversationId,
  sender_type: message.senderType,
  sender_id: message.senderId,
  message: message.message,
  created_at: message.createdAt,
  payload: message,
});

const upsertRequestQueryRows = async (
  config: SupabaseAppDataConfig,
  {
    requests = [],
    conversations = [],
    messages = [],
  }: {
    requests?: RequestRecord[];
    conversations?: RequestConversationRecord[];
    messages?: RequestMessageRecord[];
  },
) => {
  if (requests.length > 0) {
    await upsertSupabaseTableRows(
      config,
      "helped_query_requests",
      requests.map((request) => requestToQueryRow(config, request)),
      "app_id,request_id",
    );
  }
  if (conversations.length > 0) {
    await upsertSupabaseTableRows(
      config,
      "helped_query_request_conversations",
      conversations.map((conversation) => conversationToQueryRow(config, conversation)),
      "app_id,conversation_id",
    );
  }
  if (messages.length > 0) {
    await upsertSupabaseTableRows(
      config,
      "helped_query_request_messages",
      messages.map((message) => messageToQueryRow(config, message)),
      "app_id,message_id",
    );
  }
};

const fetchRequestFromQueryTable = async (
  config: SupabaseAppDataConfig,
  requestId: string,
) => {
  const rows = await fetchSupabaseTableRows<SupabaseRequestQueryRow>(
    config,
    "helped_query_requests",
    {
      select: "payload",
      filters: { app_id: config.rowId, request_id: requestId },
      limit: 1,
    },
  );
  return rows[0]?.payload ?? null;
};

const fetchConversationFromQueryTable = async (
  config: SupabaseAppDataConfig,
  filters: { requestId?: string; conversationId?: string },
) => {
  const rows = await fetchSupabaseTableRows<SupabaseRequestConversationQueryRow>(
    config,
    "helped_query_request_conversations",
    {
      select: "payload",
      filters: {
        app_id: config.rowId,
        ...(filters.requestId ? { request_id: filters.requestId } : {}),
        ...(filters.conversationId ? { conversation_id: filters.conversationId } : {}),
      },
      limit: 1,
    },
  );
  return rows[0]?.payload ?? null;
};

const listRequestsFromQueryTable = async (
  config: SupabaseAppDataConfig,
  data: AppData,
  actor: RequestActor,
  {
    page,
    pageSize,
    status,
    query,
    clientId,
    agencyId,
  }: {
    page: number;
    pageSize: number;
    status?: string;
    query?: string;
    clientId?: number | null;
    agencyId?: number;
  },
) => {
  const table = encodeURIComponent("helped_query_requests");
  const params = new URLSearchParams();
  params.set("select", "payload");
  params.set("app_id", `eq.${config.rowId}`);
  params.set("order", "created_at.desc.nullslast,request_id.desc");
  if (actor.type === "admin") {
    params.set("agency_id", `eq.${actor.admin.agencyId}`);
  } else {
    params.set("client_id", `eq.${actor.client.id}`);
  }
  if (typeof clientId === "number") params.set("client_id", `eq.${clientId}`);
  if (typeof agencyId === "number") params.set("agency_id", `eq.${agencyId}`);
  if (status && isRequestStatus(status)) params.set("status", `eq.${status}`);

  const offset = (page - 1) * pageSize;
  const headers = new Headers(
    supabaseHeaders(config, {
      accept: "application/json",
      prefer: "count=exact",
    }),
  );
  headers.set("range-unit", "items");
  headers.set("range", `${offset}-${offset + pageSize - 1}`);

  const response = await fetch(
    `${config.baseUrl}/rest/v1/${table}?${params.toString()}`,
    { method: "GET", headers },
  );
  if (!response.ok && response.status !== 206) {
    const details = await readSupabaseError(response);
    throw new Error(`Supabase request list failed (${response.status}): ${details}`);
  }

  const rows = (await response.json()) as SupabaseRequestQueryRow[];
  const normalizedQuery = toTrimmedString(query).toLowerCase();
  const items = rows
    .map((row) => row.payload)
    .filter((request): request is RequestRecord => Boolean(request))
    .filter((request) => {
      if (!normalizedQuery) return true;
      const client = data.clients.find((item) => item.id === request.clientId);
      return [
        request.type,
        request.status,
        request.updatedBy,
        JSON.stringify(request.details ?? {}),
        request.maidReferences.join(" "),
        client?.name ?? "",
        client?.email ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    });
  const total = parseContentRangeTotal(response.headers.get("content-range")) ?? items.length;

  return {
    data: items.map((request) => buildRequestResponse(data, request)),
    pageInfo: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
};

const listRequestMessagesFromQueryTable = async (
  config: SupabaseAppDataConfig,
  conversationId: string,
) => {
  const rows = await fetchSupabaseTableRows<SupabaseRequestMessageQueryRow>(
    config,
    "helped_query_request_messages",
    {
      select: "payload",
      filters: { app_id: config.rowId, conversation_id: conversationId },
      orderBy: "created_at.asc",
    },
  );
  return rows
    .map((row) => row.payload)
    .filter((message): message is RequestMessageRecord => Boolean(message));
};

const ensureRequestConversation = (
  data: AppData,
  request: RequestRecord,
): { conversation: RequestConversationRecord; created: boolean } => {
  const existing = data.requestConversations.find(
    (item) => item.requestId === request.id,
  );
  if (existing) {
    return { conversation: existing, created: false };
  }

  const conversation: RequestConversationRecord = {
    id: crypto.randomUUID(),
    requestId: request.id,
    agencyId: request.agencyId,
    clientId: request.clientId,
    createdAt: now(),
  };
  data.requestConversations.unshift(conversation);
  return { conversation, created: true };
};

const getStorageMode = (env: Bindings) => {
  if (isKvBackend(env) && env.APP_DATA) return "kv";
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

app.get("/api/diagnostics", requireAgencyAdminAuth, (c) => {
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
    )
      .map((agency) => ({ ...agency, isMain: agency.id === 1 }))
      .sort((left, right) => {
        // Main admin agency (id = 1) always first
        if (left.isMain && !right.isMain) return -1;
        if (!left.isMain && right.isMain) return 1;
        // Then by public maid count descending, then name
        if (right.publicMaids !== left.publicMaids) return right.publicMaids - left.publicMaids;
        return left.name.localeCompare(right.name);
      });

    return c.json({ agencies: uniqueAgencies });
  }),
);

app.get(
  "/api/company",
  safeApi(async (c) => {
    const config = getSupabaseAppDataConfig(c.env);
    if (config) {
      const fastCompany = await tryCallSupabaseRpc<{
        companyProfile: CompanyProfileRecord;
        momPersonnel: MOMPersonnelRecord[];
        testimonials: TestimonialRecord[];
      }>(config, "get_helped_company_payload", { p_app_id: config.rowId });
      if (fastCompany) {
        return c.json(fastCompany);
      }
    }

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
    const config = getSupabaseAppDataConfig(c.env);
    if (config) {
      const fastSummary = await tryCallSupabaseRpc<Record<string, unknown>>(
        config,
        "get_helped_company_summary",
        { p_app_id: config.rowId },
      );
      if (fastSummary) {
        return c.json(fastSummary);
      }
    }

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
  requireAgencyAdminAuth,
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
  requireAgencyAdminAuth,
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
  requireAgencyAdminAuth,
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
  requireAgencyAdminAuth,
  safeApi(async (c) => {
    const id = Number(c.req.param("id"));
    if (!Number.isInteger(id)) return c.json({ error: "Valid id is required" }, 400);
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
  requireAgencyAdminAuth,
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
  requireAgencyAdminAuth,
  safeApi(async (c) => {
    const id = Number(c.req.param("id"));
    if (!Number.isInteger(id)) return c.json({ error: "Valid id is required" }, 400);
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
    // Unauthenticated callers may only browse public maids.
    // Validate the token against the admin session store so clients with
    // a non-admin token cannot bypass this restriction.
    const listToken = parseAuthorizationToken(c.req.raw);
    const listAdminSessions = listToken ? await loadAgencyAdminSessions(c.env) : [];
    const isAdminRequest = listAdminSessions.some((s) => s.token === listToken);
    const visibility = isAdminRequest ? c.req.query("visibility") : "public"
    const noPhotos = c.req.query("noPhotos") === "1" || c.req.query("noPhotos") === "true"
    const agencyIdQuery = c.req.query("agencyId")
    const agencyId =
      agencyIdQuery && Number.isInteger(Number(agencyIdQuery))
        ? Number(agencyIdQuery)
        : undefined
    const page = parsePositiveInt(c.req.query("page"))
    const pageSize = parsePositiveInt(c.req.query("pageSize"))
    const offset = parsePositiveInt(c.req.query("offset")) ?? 0
    const limit = pageSize ?? parsePositiveInt(c.req.query("limit"))
    const stripPhotos = <T extends { photoDataUrl?: string; photoDataUrls?: string[] }>(list: T[]): T[] =>
      noPhotos ? list.map((m) => ({ ...m, photoDataUrl: "", photoDataUrls: [] })) : list
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
              noPhotos,
            })
          : await listMaidsFromSupabaseAppView(supabase, {
              search,
              visibility,
              agencyId,
              offset: effectiveOffset,
              limit,
              noPhotos,
            })
        return c.json({
          maids: stripPhotos(result.maids),
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
      maids: stripPhotos(pagedMaids),
      total,
      page: page ?? 1,
      pageSize: limit ?? total,
    })
  }),
);

app.get(
  "/api/maids/export.csv",
  requireAgencyAdminAuth,
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
  requireAgencyAdminAuth,
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
  requireAgencyAdminAuth,
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
  requireAgencyAdminAuth,
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

const batchMaidPhotosFromSupabaseNormalized = async (
  config: SupabaseAppDataConfig,
  referenceCodes: string[],
): Promise<Record<string, string>> => {
  const table = encodeURIComponent("helped_maids");
  const refsFilter = referenceCodes.map((r) => normalizeReferenceCode(r)).join(",");
  const params = new URLSearchParams();
  params.set("select", "reference_code,payload");
  params.set("app_id", `eq.${config.rowId}`);
  params.set("reference_code", `in.(${refsFilter})`);
  const response = await fetch(`${config.baseUrl}/rest/v1/${table}?${params.toString()}`, {
    method: "GET",
    headers: supabaseHeaders(config, { accept: "application/json" }),
  });
  if (!response.ok) throw new Error(`Batch photo fetch failed (${response.status})`);
  const rows = (await response.json()) as Array<{ reference_code: string; payload: MaidRecord | null }>;
  const result: Record<string, string> = {};
  for (const row of rows) {
    if (row.reference_code) {
      result[row.reference_code] = row.payload ? (normalizeMaid(row.payload).photoDataUrl ?? "") : "";
    }
  }
  return result;
};

const batchMaidPhotosFromSupabaseAppView = async (
  config: SupabaseAppDataConfig,
  referenceCodes: string[],
): Promise<Record<string, string>> => {
  const table = encodeURIComponent("app_maids");
  const refsFilter = referenceCodes.map((r) => normalizeReferenceCode(r)).join(",");
  const params = new URLSearchParams();
  params.set("select", "reference_code,raw_record");
  params.set("app_id", `eq.${config.rowId}`);
  params.set("reference_code", `in.(${refsFilter})`);
  const response = await fetch(`${config.baseUrl}/rest/v1/${table}?${params.toString()}`, {
    method: "GET",
    headers: supabaseHeaders(config, { accept: "application/json" }),
  });
  if (!response.ok) throw new Error(`Batch photo fetch failed (${response.status})`);
  const rows = (await response.json()) as Array<{ reference_code: string; raw_record: MaidRecord | null }>;
  const result: Record<string, string> = {};
  for (const row of rows) {
    if (row.reference_code) {
      result[row.reference_code] = row.raw_record ? (normalizeMaid(row.raw_record).photoDataUrl ?? "") : "";
    }
  }
  return result;
};

app.post(
  "/api/maids/photos-batch",
  requireAgencyAdminAuth,
  safeApi(async (c) => {
    const body = await parseBody<{ refs?: unknown }>(c.req.raw);
    if (!Array.isArray(body?.refs) || body.refs.length === 0) {
      return c.json({ error: "refs array is required" }, 400);
    }
    if (body.refs.length > 100) {
      return c.json({ error: "Maximum 100 refs per batch" }, 400);
    }
    const refs = (body.refs as unknown[]).map(String);
    const supabase = getSupabaseAppDataConfig(c.env);
    if (supabase) {
      try {
        const photos = isNormalizedSupabaseEnabled(c.env)
          ? await batchMaidPhotosFromSupabaseNormalized(supabase, refs)
          : await batchMaidPhotosFromSupabaseAppView(supabase, refs);
        return c.json({ photos });
      } catch (error) {
        console.warn("Fast maid photos-batch failed; falling back to app data", error);
      }
    }
    const data = await loadData(c.env, { readOnly: true });
    const photos: Record<string, string> = {};
    for (const maid of data.maids) {
      if (refs.includes(maid.referenceCode)) {
        const primary =
          (Array.isArray(maid.photoDataUrls) && maid.photoDataUrls[0]) ||
          maid.photoDataUrl ||
          "";
        photos[maid.referenceCode] = primary;
      }
    }
    return c.json({ photos });
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
        if (!maid.isPublic) {
          const tok = parseAuthorizationToken(c.req.raw);
          const adSessions = tok ? await loadAgencyAdminSessions(c.env) : [];
          if (!adSessions.some((s) => s.token === tok)) {
            return c.json({ error: "Maid not found" }, 404);
          }
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
    if (!maid.isPublic) {
      const tok = parseAuthorizationToken(c.req.raw);
      const adSessions = tok ? await loadAgencyAdminSessions(c.env) : [];
      if (!adSessions.some((s) => s.token === tok)) {
        return c.json({ error: "Maid not found" }, 404);
      }
    }
    return c.json({ maid });
  }),
);

app.post(
  "/api/maids",
  requireAgencyAdminAuth,
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
    upsertMaidEmbedding(c.env, maid as unknown as Record<string, unknown>).catch(() => {});
    return c.json({ maid }, 201);
  }),
);

app.put(
  "/api/maids/:referenceCode",
  requireAgencyAdminAuth,
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
    upsertMaidEmbedding(c.env, data.maids[index] as unknown as Record<string, unknown>).catch(() => {});
    return c.json({ maid: data.maids[index] });
  }),
);

app.patch(
  "/api/maids/:referenceCode/bring-to-top",
  requireAgencyAdminAuth,
  safeApi(async (c) => {
    const referenceCode = normalizeReferenceCode(c.req.param("referenceCode"));
    const config = getSupabaseAppDataConfig(c.env);

    if (config) {
      try {
        if (isNormalizedSupabaseEnabled(c.env)) {
          const existing = await getMaidFromSupabaseNormalized(config, referenceCode);
          if (!existing) {
            return c.json({ error: "Maid not found" }, 404);
          }
          const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...payload } = existing;
          const maid = await upsertMaidInSupabaseNormalized(config, payload, {
            create: false,
            referenceCode,
          });
          if (!maid) {
            return c.json({ error: "Maid not found" }, 404);
          }
          return c.json({ maid });
        }

        const existing = await getMaidFromSupabaseAppView(config, referenceCode);
        if (!existing) {
          return c.json({ error: "Maid not found" }, 404);
        }
        const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...payload } = existing;
        const maid = await updateMaidInSupabaseAppData(config, referenceCode, payload);
        if (!maid) {
          return c.json({ error: "Maid not found" }, 404);
        }
        return c.json({ maid });
      } catch (error) {
        console.warn("Fast maid bring-to-top path failed; falling back to app data", error);
      }
    }

    const data = await loadData(c.env);
    const index = data.maids.findIndex(
      (maid) => maid.referenceCode === referenceCode,
    );
    if (index === -1) {
      return c.json({ error: "Maid not found" }, 404);
    }

    data.maids[index] = {
      ...data.maids[index],
      updatedAt: now(),
    };
    await saveData(c.env, data);
    return c.json({ maid: data.maids[index] });
  }),
);

app.patch(
  "/api/maids/:referenceCode/visibility",
  requireAgencyAdminAuth,
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
  requireAgencyAdminAuth,
  safeApi(async (c) => {
    const body = await parseBody<{ photoDataUrl?: string }>(c.req.raw);
    if (typeof body?.photoDataUrl !== "string") {
      return c.json({ error: "photoDataUrl string is required" }, 400);
    }

    const referenceCode = normalizeReferenceCode(c.req.param("referenceCode"));
    const config = getSupabaseAppDataConfig(c.env);
    if (config && isNormalizedSupabaseEnabled(c.env)) {
      try {
        const existing = await getMaidFromSupabaseNormalized(config, referenceCode);
        if (!existing) {
          return c.json({ error: "Maid not found" }, 404);
        }

        const photoDataUrl = await uploadMaidMediaToSupabaseStorage(
          c.env,
          body.photoDataUrl,
          existing.agencyId,
          existing.referenceCode,
          "photos",
          0,
        );
        const maid = await updateMaidMediaInSupabaseNormalized(
          config,
          referenceCode,
          {
            photoDataUrl,
            photoDataUrls: photoDataUrl ? [photoDataUrl] : [],
            hasPhoto: Boolean(photoDataUrl),
            videoDataUrl: existing.videoDataUrl,
          },
        );
        return c.json({ maid });
      } catch (error) {
        console.warn("Fast maid photo path failed; falling back to app data", error);
      }
    }

    const data = await loadData(c.env);
    const index = data.maids.findIndex(
      (maid) =>
        maid.referenceCode ===
        referenceCode,
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
  requireAgencyAdminAuth,
  safeApi(async (c) => {
    const body = await parseBody<{ photoDataUrl?: string }>(c.req.raw);
    if (typeof body?.photoDataUrl !== "string" || !body.photoDataUrl.trim()) {
      return c.json({ error: "photoDataUrl string is required" }, 400);
    }

    const referenceCode = normalizeReferenceCode(c.req.param("referenceCode"));
    const config = getSupabaseAppDataConfig(c.env);
    if (config && isNormalizedSupabaseEnabled(c.env)) {
      try {
        const existing = await getMaidFromSupabaseNormalized(config, referenceCode);
        if (!existing) {
          return c.json({ error: "Maid not found" }, 404);
        }

        const photos = Array.isArray(existing.photoDataUrls)
          ? [...existing.photoDataUrls]
          : existing.photoDataUrl
            ? [existing.photoDataUrl]
            : [];
        if (photos.length >= 5) {
          return c.json({ error: "Maximum 5 photos allowed per maid" }, 400);
        }

        photos.push(
          await uploadMaidMediaToSupabaseStorage(
            c.env,
            body.photoDataUrl,
            existing.agencyId,
            existing.referenceCode,
            "photos",
            photos.length,
          ),
        );
        const maid = await updateMaidMediaInSupabaseNormalized(
          config,
          referenceCode,
          {
            photoDataUrl: photos[0] ?? "",
            photoDataUrls: photos,
            hasPhoto: photos.length > 0,
            videoDataUrl: existing.videoDataUrl,
          },
        );
        return c.json({ maid });
      } catch (error) {
        console.warn("Fast maid photos path failed; falling back to app data", error);
      }
    }

    const data = await loadData(c.env);
    const index = data.maids.findIndex(
      (maid) =>
        maid.referenceCode ===
        referenceCode,
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
  requireAgencyAdminAuth,
  safeApi(async (c) => {
    const body = await parseBody<{ photoDataUrls?: string[] }>(c.req.raw);
    if (!Array.isArray(body?.photoDataUrls)) {
      return c.json({ error: "photoDataUrls array is required" }, 400);
    }

    const referenceCode = normalizeReferenceCode(c.req.param("referenceCode"));
    const config = getSupabaseAppDataConfig(c.env);
    if (config && isNormalizedSupabaseEnabled(c.env)) {
      try {
        const existing = await getMaidFromSupabaseNormalized(config, referenceCode);
        if (!existing) {
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
              existing.agencyId,
              existing.referenceCode,
              "photos",
              photoIndex,
            ),
          ),
        );
        const maid = await updateMaidMediaInSupabaseNormalized(
          config,
          referenceCode,
          {
            photoDataUrl: photoDataUrls[0] ?? "",
            photoDataUrls,
            hasPhoto: photoDataUrls.length > 0,
            videoDataUrl: existing.videoDataUrl,
          },
        );
        return c.json({ maid });
      } catch (error) {
        console.warn("Fast maid photo gallery path failed; falling back to app data", error);
      }
    }

    const data = await loadData(c.env);
    const index = data.maids.findIndex(
      (maid) =>
        maid.referenceCode ===
        referenceCode,
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
  requireAgencyAdminAuth,
  safeApi(async (c) => {
    const body = await parseBody<{ videoDataUrl?: string }>(c.req.raw);
    if (typeof body?.videoDataUrl !== "string") {
      return c.json({ error: "videoDataUrl string is required" }, 400);
    }

    const referenceCode = normalizeReferenceCode(c.req.param("referenceCode"));
    const config = getSupabaseAppDataConfig(c.env);
    if (config && isNormalizedSupabaseEnabled(c.env)) {
      try {
        const existing = await getMaidFromSupabaseNormalized(config, referenceCode);
        if (!existing) {
          return c.json({ error: "Maid not found" }, 404);
        }

        const videoDataUrl = await uploadMaidMediaToSupabaseStorage(
          c.env,
          body.videoDataUrl,
          existing.agencyId,
          existing.referenceCode,
          "videos",
          0,
        );
        const maid = await updateMaidMediaInSupabaseNormalized(
          config,
          referenceCode,
          {
            photoDataUrl: existing.photoDataUrl,
            photoDataUrls: existing.photoDataUrls,
            hasPhoto: existing.hasPhoto,
            videoDataUrl,
          },
        );
        return c.json({ maid });
      } catch (error) {
        console.warn("Fast maid video path failed; falling back to app data", error);
      }
    }

    const data = await loadData(c.env);
    const index = data.maids.findIndex(
      (maid) =>
        maid.referenceCode ===
        referenceCode,
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
  requireAgencyAdminAuth,
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
  requireAgencyAdminAuth,
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
  requireAgencyAdminAuth,
  safeApi(async (c) => {
    const request = new Request(new URL("/api/employers", c.req.url), {
      method: "POST",
      headers: c.req.raw.headers,
      body: await c.req.raw.clone().text(),
    });
    return app.fetch(request, c.env);
  }),
);

// ─── Employer contract file uploads ──────────────────────────────────────────
// Stores files in Supabase Storage and returns public URLs.
app.post(
  "/api/employer-files",
  requireAgencyAdminAuth,
  safeApi(async (c) => {
    const storageConfig = getSupabaseStorageConfig(c.env);
    if (!storageConfig) {
      return c.json({ error: "File storage not configured (SUPABASE_SERVICE_ROLE_KEY required)" }, 503);
    }
    const formData = await c.req.raw.formData().catch(() => null);
    if (!formData) return c.json({ error: "Multipart form data is required" }, 400);

    await ensureSupabaseStorageBucket(storageConfig);

    const uploaded: Array<{ name: string; url: string; size: number }> = [];
    for (const [, value] of formData.entries()) {
      if (!(value instanceof File)) continue;
      const ext = value.name.split(".").pop() ?? "bin";
      const key = `contracts/${Date.now()}-${crypto.randomUUID()}.${ext}`;
      const uploadResp = await fetch(
        `${storageConfig.baseUrl}/storage/v1/object/${encodeURIComponent(storageConfig.bucket)}/${key}`,
        {
          method: "POST",
          headers: {
            apikey: storageConfig.serviceRoleKey,
            authorization: `Bearer ${storageConfig.serviceRoleKey}`,
            "content-type": value.type || "application/octet-stream",
            "x-upsert": "true",
          },
          body: await value.arrayBuffer(),
        },
      );
      if (!uploadResp.ok) {
        throw new Error(`File upload failed: ${await uploadResp.text()}`);
      }
      uploaded.push({
        name: value.name,
        url: buildSupabasePublicFileUrl(storageConfig, key),
        size: value.size,
      });
    }
    return c.json({ files: uploaded });
  }),
);

app.get(
  "/api/employer-files",
  requireAgencyAdminAuth,
  safeApi(async (c) => {
    const data = await loadData(c.env, { readOnly: true });
    const files = data.employmentContracts.flatMap((contract) =>
      Array.isArray((contract as unknown as Record<string, unknown>).files)
        ? ((contract as unknown as Record<string, unknown>).files as Array<{ name: string; url: string; size: number }>)
        : [],
    );
    return c.json({ files });
  }),
);

app.delete(
  "/api/employers/:refCode",
  requireAgencyAdminAuth,
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

app.get("/api/enquiries", requireAgencyAdminAuth, async (c) => {
  const search = c.req.query("search")?.trim().toLowerCase();
  const page = Math.max(1, Number(c.req.query("page") ?? "1") || 1);
  const pageSize = Math.min(500, Math.max(1, Number(c.req.query("pageSize") ?? "50") || 50));
  const data = await loadData(c.env, { readOnly: true });
  let enquiries = [...data.enquiries].sort((l, r) => r.id - l.id);
  if (search) {
    enquiries = enquiries.filter((item) =>
      [item.username, item.email, item.phone, item.message]
        .join(" ").toLowerCase().includes(search),
    );
  }
  enquiries = enquiries.map((item) => enrichEnquiryWithClient(item, data.clients));
  const total = enquiries.length;
  const paged = enquiries.slice((page - 1) * pageSize, page * pageSize);
  return c.json({ enquiries: paged, total, page, pageSize });
});

app.get("/api/enquiries/unread-count", async (c) => {
  const data = await loadData(c.env, { readOnly: true });
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

app.get("/api/enquiries/stream", requireAgencyAdminAuth, async (c) => {
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
  if (body.username.length > 200 || body.email.length > 200 || body.phone.length > 50 || body.message.length > 5000) {
    return c.json({ error: "Input exceeds maximum allowed length" }, 400);
  }

  const data = await loadData(c.env);
  const enquiry: EnquiryRecord = {
    id: data.counters.enquiries++,
    username: body.username.slice(0, 200),
    date: body.date || buildFallbackDate(),
    email: body.email.slice(0, 200),
    phone: body.phone.slice(0, 50),
    message: body.message.slice(0, 5000),
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

app.delete("/api/enquiries/bulk", requireAgencyAdminAuth, async (c) => {
  const body = await parseBody<{ ids?: unknown }>(c.req.raw);
  const ids = body?.ids;
  if (!Array.isArray(ids) || ids.length === 0) return c.json({ error: "ids array is required" }, 400);
  if (!ids.every((x) => Number.isInteger(x))) return c.json({ error: "All ids must be integers" }, 400);
  const idSet = new Set(ids as number[]);
  const data = await loadData(c.env);
  const before = data.enquiries.length;
  data.enquiries = data.enquiries.filter((e) => !idSet.has(e.id));
  const deleted = before - data.enquiries.length;
  await saveData(c.env, data);
  return c.json({ deleted });
});

app.delete("/api/enquiries/:id", requireAgencyAdminAuth, async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) return c.json({ error: "Valid id is required" }, 400);
  const data = await loadData(c.env);
  const existing = data.enquiries.find((item) => item.id === id);
  if (!existing) {
    return c.json({ error: "Enquiry not found" }, 404);
  }

  data.enquiries = data.enquiries.filter((item) => item.id !== id);
  await saveData(c.env, data);
  return c.json({ message: "Enquiry deleted successfully" });
});

app.get(
  "/api/requests",
  safeApi(async (c) => {
    const fastConfig = !isKvBackend(c.env) ? getSupabaseAppDataConfig(c.env) : null;
    if (fastConfig) {
      const fastPage = Math.max(1, Number(c.req.query("page") ?? "1") || 1);
      const fastPageSize = Math.min(
        24,
        Math.max(1, Number(c.req.query("pageSize") ?? "12") || 12),
      );
      const fastStatus = c.req.query("status");
      const fastQuery = toTrimmedString(c.req.query("q")).toLowerCase();
      const fastRequestedClientId = Number(c.req.query("clientId") ?? "");
      const token = parseAuthorizationToken(c.req.raw);

      if (!token) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const sessions = await loadAgencyAdminSessions(c.env);
      const session = sessions.find((item) => item.token === token);
      const admin =
        session?.admin
          ? ({
              id: session.admin.id,
              agencyId: session.admin.agencyId,
              username: session.admin.username,
              email: session.admin.email ?? "",
              password: "",
              agencyName: session.admin.agencyName,
              emailVerified: session.admin.emailVerified,
              profileImageUrl: session.admin.profileImageUrl ?? "",
              createdAt: session.admin.createdAt,
            } satisfies AgencyAdminRecord)
          : null;

      if (admin) {
        const fastResult = await tryCallSupabaseRpc<{
          data: unknown[];
          pageInfo: Record<string, unknown>;
        }>(fastConfig, "list_helped_requests", {
          p_app_id: fastConfig.rowId,
          p_agency_id: admin.agencyId,
          p_client_id:
            Number.isInteger(fastRequestedClientId) && fastRequestedClientId > 0
              ? fastRequestedClientId
              : null,
          p_status: fastStatus && isRequestStatus(fastStatus) ? fastStatus : null,
          p_query: fastQuery || null,
          p_page: fastPage,
          p_page_size: fastPageSize,
        });
        if (fastResult) {
          return c.json(fastResult);
        }
      }
    } else if (!parseAuthorizationToken(c.req.raw)) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const data = await loadData(c.env);
    const { actor, dataChanged } = await resolveRequestActor(c.env, c.req.raw, data);
    if (!actor) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    if (dataChanged) {
      await saveData(c.env, data);
    }

    const page = Math.max(1, Number(c.req.query("page") ?? "1") || 1);
    const pageSize = Math.min(
      24,
      Math.max(1, Number(c.req.query("pageSize") ?? "12") || 12),
    );
    const status = c.req.query("status");
    const query = toTrimmedString(c.req.query("q")).toLowerCase();
    const requestedClientId = Number(c.req.query("clientId") ?? "");
    const requestedAgencyId = Number(c.req.query("agencyId") ?? "");
    const clientId =
      actor.type === "client"
        ? actor.client.id
        : Number.isInteger(requestedClientId) && requestedClientId > 0
          ? requestedClientId
          : null;
    const agencyId =
      actor.type === "admin"
        ? actor.admin.agencyId
        : Number.isInteger(requestedAgencyId) && requestedAgencyId > 0
          ? requestedAgencyId
          : undefined;

    const filtered = data.requests
      .filter((request) => {
        if (actor.type === "admin" && request.agencyId !== actor.admin.agencyId) {
          return false;
        }
        if (actor.type === "client" && request.clientId !== actor.client.id) {
          return false;
        }
        if (typeof clientId === "number" && request.clientId !== clientId) {
          return false;
        }
        if (typeof agencyId === "number" && request.agencyId !== agencyId) {
          return false;
        }
        if (status && isRequestStatus(status) && request.status !== status) {
          return false;
        }
        if (!query) return true;
        const haystack = [
          request.type,
          request.status,
          request.updatedBy,
          JSON.stringify(request.details ?? {}),
          request.maidReferences.join(" "),
          data.clients.find((client) => client.id === request.clientId)?.name ?? "",
          data.clients.find((client) => client.id === request.clientId)?.email ?? "",
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(query);
      })
      .sort(
        (left, right) =>
          new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
      );

    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const paged = filtered.slice(start, start + pageSize);

    return c.json({
      data: paged.map((request) => buildRequestResponse(data, request)),
      pageInfo: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    });
  }),
);

app.get(
  "/api/requests/status-counts",
  safeApi(async (c) => {
    const requestedAgencyId = Number(c.req.query("agencyId") ?? "");
    const requestedClientId = Number(c.req.query("clientId") ?? "");
    const token = parseAuthorizationToken(c.req.raw);
    if (!token) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const config = !isKvBackend(c.env) ? getSupabaseAppDataConfig(c.env) : null;
    if (config) {
      const sessions = await loadAgencyAdminSessions(c.env);
      const session = sessions.find((item) => item.token === token);
      const adminAgencyId = session?.admin?.agencyId;
      if (typeof adminAgencyId === "number") {
        const fastCounts = await tryCallSupabaseRpc<Record<RequestStatus, number>>(
          config,
          "get_helped_request_status_counts",
          {
            p_app_id: config.rowId,
            p_agency_id: adminAgencyId,
            p_client_id:
              Number.isInteger(requestedClientId) && requestedClientId > 0
                ? requestedClientId
                : null,
          },
        );
        if (fastCounts) {
          return c.json(fastCounts);
        }
      }
    }

    const data = await loadData(c.env, { readOnly: true });
    const { actor } = await resolveRequestActor(c.env, c.req.raw, data);
    if (!actor) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const agencyId =
      actor.type === "admin"
        ? actor.admin.agencyId
        : Number.isInteger(requestedAgencyId) && requestedAgencyId > 0
          ? requestedAgencyId
          : undefined;
    const clientId =
      actor.type === "client"
        ? actor.client.id
        : Number.isInteger(requestedClientId) && requestedClientId > 0
          ? requestedClientId
          : undefined;

    const visible = data.requests.filter((request) => {
      if (typeof agencyId === "number" && request.agencyId !== agencyId) return false;
      if (typeof clientId === "number" && request.clientId !== clientId) return false;
      return true;
    });

    return c.json({
      pending: visible.filter((request) => request.status === "pending").length,
      interested: visible.filter((request) => request.status === "interested").length,
      direct_hire: visible.filter((request) => request.status === "direct_hire").length,
      rejected: visible.filter((request) => request.status === "rejected").length,
    });
  }),
);

app.post(
  "/api/requests",
  safeApi(async (c) => {
    const body = await parseBody<{
      clientId?: number;
      agencyId?: number;
      type?: RequestType;
      details?: Record<string, unknown>;
      maidReferences?: string[];
    }>(c.req.raw);
    if (!body || typeof body !== "object") {
      return c.json({ error: "Invalid JSON body" }, 400);
    }
    if (!parseAuthorizationToken(c.req.raw)) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const data = await loadData(c.env);
    const { actor } = await resolveRequestActor(c.env, c.req.raw, data);
    if (!actor) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const requestedClientId = Number(body.clientId);
    const clientId =
      actor.type === "client"
        ? actor.client.id
        : Number.isInteger(requestedClientId) && requestedClientId > 0
          ? requestedClientId
          : 0;
    if (clientId <= 0 || !data.clients.some((client) => client.id === clientId)) {
      return c.json({ error: "clientId is required" }, 400);
    }
    if (body.type !== "general" && body.type !== "direct") {
      return c.json({ error: "type is required" }, 400);
    }
    if (!body.details || typeof body.details !== "object" || Array.isArray(body.details)) {
      return c.json({ error: "details is required" }, 400);
    }

    const maidReferences = Array.isArray(body.maidReferences)
      ? body.maidReferences.map((item) => String(item).trim()).filter(Boolean)
      : [];
    const invalidReference = maidReferences.find(
      (referenceCode) => !data.maids.some((maid) => maid.referenceCode === referenceCode),
    );
    if (invalidReference) {
      return c.json({ error: `Maid not found: ${invalidReference}` }, 404);
    }

    const firstReference = maidReferences[0] ?? "";
    const directMaid = firstReference
      ? data.maids.find((maid) => maid.referenceCode === firstReference)
      : null;
    const requestedAgencyId = Number(body.agencyId ?? "");
    const resolvedAgencyId =
      actor.type === "admin"
        ? actor.admin.agencyId
        : directMaid?.agencyId ??
          (Number.isInteger(requestedAgencyId) && requestedAgencyId > 0
            ? requestedAgencyId
            : null);
    if (!resolvedAgencyId) {
      return c.json({ error: "agencyId is required" }, 400);
    }
    const agencyId = resolvedAgencyId;
    const createdAt = now();
    const requestRecord: RequestRecord = {
      id: crypto.randomUUID(),
      clientId,
      agencyId,
      type: body.type === "direct" || maidReferences.length > 0 ? "direct" : "general",
      status: "pending",
      details: body.details,
      maidReferences,
      updatedBy: actor.type === "admin" ? `agency:${actor.admin.id}` : `client:${clientId}`,
      createdAt,
      updatedAt: createdAt,
    };
    const conversation: RequestConversationRecord = {
      id: crypto.randomUUID(),
      requestId: requestRecord.id,
      agencyId,
      clientId,
      createdAt,
    };
    const message: RequestMessageRecord = {
      id: crypto.randomUUID(),
      conversationId: conversation.id,
      senderType: "system",
      senderId: 0,
      message: "New request created",
      createdAt,
    };

    data.requests.unshift(requestRecord);
    data.requestConversations.unshift(conversation);
    data.requestMessages.push(message);
    await saveData(c.env, data);

    return c.json({ data: buildRequestResponse(data, requestRecord) }, 201);
  }),
);

app.get("/api/requests/unread-count", async (c) => {
  const data = await loadData(c.env, { readOnly: true });
  const pendingRequests =
    data.requests.filter((item) => item.status === "pending").length +
    data.directSales.filter((item) => item.status === "pending").length;

  return c.json({
    unreadCount: pendingRequests,
    count: pendingRequests,
  });
});

app.get(
  "/api/requests/:id",
  safeApi(async (c) => {
    if (!parseAuthorizationToken(c.req.raw)) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    const data = await loadData(c.env, { readOnly: true });
    const { actor } = await resolveRequestActor(c.env, c.req.raw, data);
    if (!actor) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const request = data.requests.find((item) => item.id === c.req.param("id"));
    if (!request || !canAccessRequest(actor, request)) {
      return c.json({ error: "Request not found" }, 404);
    }
    return c.json({ data: buildRequestResponse(data, request) });
  }),
);

app.patch(
  "/api/requests/:id/status",
  safeApi(async (c) => {
    const body = await parseBody<{ status?: RequestStatus }>(c.req.raw);
    if (!isRequestStatus(body?.status)) {
      return c.json({ error: "status is required" }, 400);
    }
    if (!parseAuthorizationToken(c.req.raw)) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const data = await loadData(c.env);
    const { actor } = await resolveRequestActor(c.env, c.req.raw, data);
    if (!actor || actor.type !== "admin") {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const index = data.requests.findIndex((item) => item.id === c.req.param("id"));
    if (index === -1 || data.requests[index].agencyId !== actor.admin.agencyId) {
      return c.json({ error: "Request not found" }, 404);
    }

    data.requests[index] = {
      ...data.requests[index],
      status: body.status,
      updatedBy: `agency:${actor.admin.id}`,
      updatedAt: now(),
    };
    await saveData(c.env, data);
    return c.json({ data: buildRequestResponse(data, data.requests[index]) });
  }),
);

app.patch(
  "/api/requests/:id/maids",
  safeApi(async (c) => {
    const body = await parseBody<{ maidReferences?: string[] }>(c.req.raw);
    const maidReferences = Array.isArray(body?.maidReferences)
      ? body.maidReferences.map((item) => String(item).trim()).filter(Boolean)
      : [];
    if (!parseAuthorizationToken(c.req.raw)) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const data = await loadData(c.env);
    const { actor } = await resolveRequestActor(c.env, c.req.raw, data);
    if (!actor || actor.type !== "admin") {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const invalidReference = maidReferences.find(
      (referenceCode) => !data.maids.some((maid) => maid.referenceCode === referenceCode),
    );
    if (invalidReference) {
      return c.json({ error: `Maid not found: ${invalidReference}` }, 404);
    }

    const index = data.requests.findIndex((item) => item.id === c.req.param("id"));
    if (index === -1 || data.requests[index].agencyId !== actor.admin.agencyId) {
      return c.json({ error: "Request not found" }, 404);
    }

    data.requests[index] = {
      ...data.requests[index],
      maidReferences,
      type: maidReferences.length > 0 ? "direct" : "general",
      updatedBy: `agency:${actor.admin.id}`,
      updatedAt: now(),
    };
    await saveData(c.env, data);
    return c.json({ data: buildRequestResponse(data, data.requests[index]) });
  }),
);

app.get(
  "/api/conversations/:requestId",
  safeApi(async (c) => {
    if (!parseAuthorizationToken(c.req.raw)) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    const data = await loadData(c.env);
    const { actor, dataChanged } = await resolveRequestActor(c.env, c.req.raw, data);
    if (!actor) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const request = data.requests.find((item) => item.id === c.req.param("requestId"));
    if (!request || !canAccessRequest(actor, request)) {
      return c.json({ error: "Request not found" }, 404);
    }

    const { conversation, created } = ensureRequestConversation(data, request);
    if (created || dataChanged) {
      await saveData(c.env, data);
    }

    return c.json({ data: conversation });
  }),
);

app.get(
  "/api/messages/:conversationId",
  safeApi(async (c) => {
    if (!parseAuthorizationToken(c.req.raw)) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    const data = await loadData(c.env, { readOnly: true });
    const { actor } = await resolveRequestActor(c.env, c.req.raw, data);
    if (!actor) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const conversation = data.requestConversations.find(
      (item) => item.id === c.req.param("conversationId"),
    );
    const request = conversation
      ? data.requests.find((item) => item.id === conversation.requestId)
      : null;
    if (!conversation || !request || !canAccessRequest(actor, request)) {
      return c.json({ error: "Conversation not found" }, 404);
    }

    return c.json({
      data: data.requestMessages
        .filter((message) => message.conversationId === conversation.id)
        .sort(
          (left, right) =>
            new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
        ),
    });
  }),
);

app.post(
  "/api/messages",
  safeApi(async (c) => {
    const body = await parseBody<{
      conversationId?: string;
      message?: string;
      attachments?: unknown;
    }>(c.req.raw);
    const messageText = toTrimmedString(body?.message);
    if (!body?.conversationId || !messageText) {
      return c.json({ error: "conversationId and message are required" }, 400);
    }
    if (!parseAuthorizationToken(c.req.raw)) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const data = await loadData(c.env);
    const { actor } = await resolveRequestActor(c.env, c.req.raw, data);
    if (!actor) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const conversation = data.requestConversations.find(
      (item) => item.id === body.conversationId,
    );
    const request = conversation
      ? data.requests.find((item) => item.id === conversation.requestId)
      : null;
    if (!conversation || !request || !canAccessRequest(actor, request)) {
      return c.json({ error: "Conversation not found" }, 404);
    }

    const record: RequestMessageRecord = {
      id: crypto.randomUUID(),
      conversationId: conversation.id,
      senderType: actor.type === "admin" ? "admin" : "client",
      senderId: actor.type === "admin" ? actor.admin.id : actor.client.id,
      message: messageText,
      ...(body.attachments !== undefined ? { attachments: body.attachments } : {}),
      createdAt: now(),
    };
    data.requestMessages.push(record);
    data.requests = data.requests.map((item) =>
      item.id === request.id
        ? {
            ...item,
            updatedAt: record.createdAt,
            updatedBy:
              actor.type === "admin"
                ? `agency:${actor.admin.id}`
                : `client:${actor.client.id}`,
          }
        : item,
    );
    await saveData(c.env, data);

    return c.json({ data: record }, 201);
  }),
);

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
    return `Thank you for reaching out to Helped Maids. Our system has identified ${matchesCount} suitable helper profile${matchesCount === 1 ? "" : "s"} based on your requirements. A member of our team will contact you shortly with the full details. We look forward to finding the perfect match for your household.`;
  }
  if (intent === "hiring") {
    return "Thank you for your enquiry. We have received your hiring request and our placement team will reach out to you shortly with profiles tailored to your needs. We appreciate your interest in our services.";
  }
  if (intent === "complaint") {
    return "Thank you for bringing this matter to our attention. We sincerely apologise for any inconvenience caused. Your feedback has been logged and a dedicated team member will follow up with you within 24 hours to resolve this promptly.";
  }
  return "Thank you for contacting Helped Maids. We have received your message and our team will respond within 24 hours. We appreciate your patience and look forward to assisting you.";
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

    const webhookUrl = toTrimmedString(c.env.MAKE_WEBHOOK_URL);
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

const getAiSupabaseConfig = (env: Bindings) => {
  const config = getSupabaseAppDataConfig(env);
  return config
    ? { baseUrl: config.baseUrl, serviceRoleKey: config.serviceRoleKey }
    : null;
};

const isAiAutopilotEnabled = (env: Bindings) =>
  env.AI_AUTOPILOT_ENABLED?.trim().toLowerCase() === "true";

const parseAiBody = async (request: Request) =>
  (await parseBody<{
    message?: string;
    prompt?: string;
    task?: string;
    conversationId?: string;
    stream?: boolean;
    structured?: boolean;
    [key: string]: unknown;
  }>(request)) ?? {};

const runAiEndpoint = async (
  c: any,
  agentId: AiAgentId,
  actor: {
    role: "public" | "employer" | "agency" | "admin" | "applicant";
    userId?: string | number;
    clientId?: number;
    agencyId?: number;
    agencyName?: string;
  },
  data: AppData,
  body: Record<string, unknown>,
) => {
  const baseInput = {
    ...body,
    message:
      toTrimmedString(body.message) ||
      toTrimmedString(body.prompt) ||
      toTrimmedString(body.task),
  };

  // Semantic search: enrich maid_recommendation input with vector-ranked reference codes.
  let semanticReferences: string[] = [];
  if (agentId === "maid_recommendation") {
    const query = buildRecommendationQuery(baseInput);
    if (query) {
      semanticReferences = await searchSimilarMaids(c.env, query).catch(() => []);
    }
  }

  const input =
    semanticReferences.length > 0
      ? { ...baseInput, semanticReferences }
      : baseInput;

  if (!input.message && agentId !== "maid_recommendation" && agentId !== "admin_analytics") {
    return c.json({ error: "message, prompt, or task is required" }, 400);
  }

  const aiActor = {
    ...actor,
    ip:
      c.req.header("cf-connecting-ip") ||
      c.req.header("x-forwarded-for") ||
      "unknown",
  };

  if (body.stream === true) {
    const streamed = await streamAIAgent({
      agentId,
      input,
      actor: aiActor,
      appData: data as unknown as Record<string, unknown>,
      anthropicApiKey: c.env.ANTHROPIC_API_KEY,
      supabase: getAiSupabaseConfig(c.env),
      conversationId: toTrimmedString(body.conversationId) || undefined,
      request: c.req.raw,
    });
    return new Response(streamed.body, {
      headers: {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-cache, no-transform",
        "x-ai-conversation-id": streamed.conversationId,
      },
    });
  }

  const result = await runAIAgent({
    agentId,
    input,
    actor: aiActor,
    appData: data as unknown as Record<string, unknown>,
    anthropicApiKey: c.env.ANTHROPIC_API_KEY,
    cfAi: c.env.AI ?? null,
    supabase: getAiSupabaseConfig(c.env),
    conversationId: toTrimmedString(body.conversationId) || undefined,
    request: c.req.raw,
  });
  return c.json(result);
};

app.post(
  "/api/ai/receptionist",
  safeApi(async (c) => {
    const body = await parseAiBody(c.req.raw);
    const data = await loadData(c.env);
    const name = toTrimmedString(body.name);
    const contact = toTrimmedString(body.contact);
    const msgText = toTrimmedString(body.message || body.prompt || body.task);

    if (name && contact && msgText) {
      const exists = data.enquiries.some(
        (item) => item.message === msgText && (item.email === contact || item.phone === contact),
      );
      if (!exists) {
        const enquiry: EnquiryRecord = {
          id: data.counters.enquiries++,
          username: name,
          date: buildFallbackDate(),
          email: WORKFLOW_EMAIL_PATTERN.test(contact) ? contact : "",
          phone: WORKFLOW_EMAIL_PATTERN.test(contact) ? "" : contact,
          message: msgText,
          createdAt: now(),
        };
        data.enquiries.unshift(enquiry);
        await saveData(c.env, data);
      }
    }

    // Call runAIAgent directly so we can post-process and attach featured maid cards
    const input = {
      ...body,
      message: toTrimmedString(body.message) || toTrimmedString(body.prompt) || toTrimmedString(body.task),
    };
    if (!input.message) return c.json({ error: "message, prompt, or task is required" }, 400);

    const aiActor = {
      role: "public" as const,
      ip: c.req.header("cf-connecting-ip") || c.req.header("x-forwarded-for") || "unknown",
    };

    const result = await runAIAgent({
      agentId: "receptionist",
      input,
      actor: aiActor,
      appData: data as unknown as Record<string, unknown>,
      anthropicApiKey: c.env.ANTHROPIC_API_KEY,
      cfAi: c.env.AI ?? null,
      supabase: getAiSupabaseConfig(c.env),
      conversationId: toTrimmedString(body.conversationId) || undefined,
      request: c.req.raw,
    });

    // Extract [MAID:refCode] markers the AI inserted
    const MAID_RE = /\[MAID:([^\]]+)\]/g;
    const mentionedCodes = new Set<string>();
    let m: RegExpExecArray | null;
    while ((m = MAID_RE.exec(result.response)) !== null) mentionedCodes.add(m[1].trim());

    // Detect if a specific nationality was requested so we can filter cards accordingly
    const normalizedMsgNat = input.message.toLowerCase()
      .replace(/\bfilipina\b/g, "filipino")
      .replace(/\bphilippines?\b/g, "filipino")
      .replace(/\bburmese\b/g, "myanmar");
    const NATIONALITY_CARD_KEYS = ["filipino", "indonesian", "myanmar", "indian", "bangladeshi", "sri lankan"];
    const requestedNatCard = NATIONALITY_CARD_KEYS.find((n) => normalizedMsgNat.includes(n));

    const maidCardRequest =
      /\b(top|best|show|find|recommend|match|shortlist|list|available|availability|who|which|suitable|have|any|got|need|want|looking|do|can|hire|hiring)\b/i.test(input.message) &&
      /\b(maid|maids|helper|helpers|fdw|filipino|indonesian|myanmar|burmese|indian|sri\s+lankan|bangladeshi|transfer|elderly|childcare|infant|newborn|nanny|babysit|disabled|housework|housekeep|cleaning|cooking|cook|chef|care)\b/i.test(input.message);
    const genericCardTerms = new Set([
      "available",
      "availability",
      "best",
      "find",
      "maid",
      "maids",
      "helper",
      "helpers",
      "fdw",
      "list",
      "match",
      "recommend",
      "show",
      "shortlist",
      "suitable",
      "top",
      "which",
      "who",
      "hire",
      "hired",
      "hiring",
      "need",
      "want",
      "looking",
      "look",
      "have",
      "any",
      "got",
      "can",
      "you",
      "the",
      "for",
      "are",
      "get",
      "our",
      "with",
      "that",
      "this",
      "what",
      "how",
      "about",
      "some",
      "one",
      "good",
      "great",
      "please",
      "like",
      "also",
    ]);
    const cardTerms = input.message
      .toLowerCase()
      // Nationality normalisation
      .replace(/\bfilipina\b/g, "filipino")
      .replace(/\bphilippines?\b/g, "filipino")
      .replace(/\bburmese\b/g, "myanmar")
      // Age / elderly synonyms
      .replace(/\bold\s+folk(s)?\b/g, "elderly")
      .replace(/\bsenior(s)?\b/g, "elderly")
      .replace(/\baged\b/g, "elderly")
      .replace(/\bgrandma\b/g, "elderly")
      .replace(/\bgrandpa\b/g, "elderly")
      .replace(/\bgrandparent(s)?\b/g, "elderly")
      // Child / infant synonyms
      .replace(/\bchildren\b/g, "child")
      .replace(/\bbab(y|ies)\b/g, "infant")
      .replace(/\bnewborn(s)?\b/g, "infant")
      .replace(/\bnanny\b/g, "childcare")
      .replace(/\bbabysit(ter|ting)?\b/g, "infant")
      // Housework synonyms
      .replace(/\bhousekeep(er|ing)?\b/g, "housework")
      .replace(/\bhouse\s+clean(ing|er)?\b/g, "housework")
      .replace(/\bcleaning\b/g, "housework")
      // Cooking synonyms
      .replace(/\bchef\b/g, "cook")
      .replace(/\bmeal(s)?\b/g, "cook")
      // Care synonyms
      .replace(/\bbedridden\b/g, "disabled")
      .replace(/\bwheelchair\b/g, "disabled")
      .split(/[^a-z0-9]+/)
      .filter((term) => term.length >= 3 && !genericCardTerms.has(term));
    const isDisplayablePublicMaid = (maid: MaidRecord) => {
      const status = String(maid.status ?? "").trim().toLowerCase();
      if (!status) return true;
      return !/\b(unavailable|inactive|rejected|blacklist|blacklisted|hidden|archived|deleted)\b/.test(status);
    };
    const maidSearchText = (maid: MaidRecord) =>
      [
        maid.fullName,
        maid.referenceCode,
        maid.nationality,
        maid.type,
        maid.status,
        maid.educationLevel,
        maid.religion,
        maid.maritalStatus,
        JSON.stringify(maid.languageSkills ?? {}),
        JSON.stringify(maid.skillsPreferences ?? {}),
        JSON.stringify(maid.workAreas ?? {}),
        JSON.stringify(maid.employmentHistory ?? []),
        JSON.stringify(maid.introduction ?? {}),
      ]
        .join(" ")
        .toLowerCase();
    const scoreMaidCard = (maid: MaidRecord) => {
      const haystack = maidSearchText(maid);
      const nationality = String(maid.nationality || "").toLowerCase();
      const workAreas = JSON.stringify(maid.workAreas ?? {}).toLowerCase();
      const intro = JSON.stringify(maid.introduction ?? {}).toLowerCase();
      const skills = JSON.stringify(maid.skillsPreferences ?? {}).toLowerCase();
      const employment = JSON.stringify(maid.employmentHistory ?? []).toLowerCase();
      return cardTerms.reduce((sum, term) => {
        if (!haystack.includes(term)) return sum;
        const exactNationality = nationality.includes(term) ? 8 : 0;
        const workMatch = workAreas.includes(term) ? 5 : 0;
        const profileMatch = intro.includes(term) || skills.includes(term) || employment.includes(term) ? 3 : 0;
        return sum + 1 + exactNationality + workMatch + profileMatch;
      }, 0);
    };

    const publicMaids = (data.maids || []).filter(
      (maid) => Boolean((maid as unknown as Record<string, unknown>).isPublic) && isDisplayablePublicMaid(maid),
    );

    const matchesRequestedNat = (maid: MaidRecord) => {
      if (!requestedNatCard) return true;
      const nat = String((maid as unknown as Record<string, unknown>).nationality || "").toLowerCase();
      return nat.includes(requestedNatCard);
    };

    // Primary: marker match. Fallback: name substring match.
    let featured = publicMaids.filter((maid) =>
      mentionedCodes.has(String((maid as unknown as Record<string,unknown>).referenceCode)),
    );
    if (featured.length === 0) {
      featured = publicMaids.filter((maid) => {
        const n = String((maid as unknown as Record<string,unknown>).fullName || "").trim();
        return n.length > 3 && result.response.includes(n);
      });
    }

    // Strip any LLM-hallucinated wrong-nationality maids from featured when a specific nationality was requested
    if (requestedNatCard) {
      featured = featured.filter(matchesRequestedNat);
    }

    if (maidCardRequest && featured.length < 10) {
      const featuredRefs = new Set(
        featured.map((maid) => String((maid as unknown as Record<string, unknown>).referenceCode || "")),
      );
      const getMaidTier = (m: MaidRecord) => {
        const status = String((m as unknown as Record<string, unknown>).status ?? "").toLowerCase();
        const type   = String((m as unknown as Record<string, unknown>).type   ?? "").toLowerCase();
        return status.includes("available") ? 0 : type.includes("transfer") ? 1 : 2;
      };
      const rankedTopUp = publicMaids
        .map((maid) => ({ maid, score: scoreMaidCard(maid) }))
        .filter(({ maid, score }) => {
          const ref = String((maid as unknown as Record<string, unknown>).referenceCode || "");
          if (featuredRefs.has(ref)) return false;
          if (requestedNatCard) return matchesRequestedNat(maid);
          return cardTerms.length === 0 || score > 0;
        })
        .sort((left, right) =>
          right.score - left.score ||
          getMaidTier(left.maid) - getMaidTier(right.maid) ||
          Number(right.maid.id || 0) - Number(left.maid.id || 0),
        )
        .map(({ maid }) => maid);
      featured = [...featured, ...rankedTopUp].slice(0, 10);
    }

    const featuredMaids = featured.slice(0, 10).map((maid) => {
      const r = maid as unknown as Record<string, unknown>;
      const photos = Array.isArray(r.photoDataUrls) ? (r.photoDataUrls as string[]) : [];
      return {
        id: r.id,
        referenceCode: String(r.referenceCode || ""),
        fullName: String(r.fullName || ""),
        nationality: String(r.nationality || ""),
        type: String(r.type || ""),
        status: String(r.status || ""),
        hasPhoto: Boolean(r.hasPhoto),
        photoUrl: typeof r.photoDataUrl === "string" && r.photoDataUrl ? r.photoDataUrl : (photos[0] || null),
      };
    });

    // Remove markers from displayed text
    const cleanedResponse = result.response.replace(/\s*\[MAID:[^\]]+\]/g, "");

    return c.json({
      ...result,
      response: cleanedResponse,
      ...(featuredMaids.length > 0 ? { featuredMaids } : {}),
    });
  }),
);

app.post(
  "/api/ai/recommend-maid",
  requireClientAuth,
  safeApi(async (c) => {
    const client = c.get("client") as ClientRecord;
    const body = await parseAiBody(c.req.raw);
    const data = await loadData(c.env, { readOnly: true });
    return runAiEndpoint(
      c,
      "maid_recommendation",
      { role: "employer", userId: client.id, clientId: client.id },
      data,
      body,
    );
  }),
);

app.post(
  "/api/ai/employer-support",
  requireClientAuth,
  safeApi(async (c) => {
    const client = c.get("client") as ClientRecord;
    const body = await parseAiBody(c.req.raw);
    const data = await loadData(c.env, { readOnly: true });
    return runAiEndpoint(
      c,
      "employer_support",
      { role: "employer", userId: client.id, clientId: client.id },
      data,
      body,
    );
  }),
);

app.post(
  "/api/ai/agency-assistant",
  requireAgencyAdminAuth,
  safeApi(async (c) => {
    const admin = c.get("agencyAdmin") as AgencyAdminRecord;
    const body = await parseAiBody(c.req.raw);
    const data = await loadData(c.env, { readOnly: true });
    return runAiEndpoint(
      c,
      "agency_assistant",
      {
        role: "agency",
        userId: admin.id,
        agencyId: admin.agencyId,
        agencyName: admin.agencyName,
      },
      data,
      body,
    );
  }),
);

app.post(
  "/api/ai/screen-applicant",
  requireAgencyAdminAuth,
  safeApi(async (c) => {
    const admin = c.get("agencyAdmin") as AgencyAdminRecord;
    const body = await parseAiBody(c.req.raw);
    const data = await loadData(c.env, { readOnly: true });
    return runAiEndpoint(
      c,
      "applicant_screening",
      {
        role: "agency",
        userId: admin.id,
        agencyId: admin.agencyId,
        agencyName: admin.agencyName,
      },
      data,
      body,
    );
  }),
);

app.post(
  "/api/ai/screen-applicant-public",
  safeApi(async (c) => {
    const body = await parseAiBody(c.req.raw);
    const applicationId = toTrimmedString(body.applicationId);
    const applicantAccessToken = toTrimmedString(body.applicantAccessToken);
    if (!applicationId || !applicantAccessToken) {
      return c.json({ error: "applicationId and applicantAccessToken are required" }, 400);
    }

    const data = await loadData(c.env, { readOnly: true });
    const application = data.ats.applications.find(
      (item) =>
        item.id === applicationId &&
        item.applicantAccessToken === applicantAccessToken,
    );
    if (!application) {
      return c.json({ error: "Application not found" }, 404);
    }

    const profile = data.ats.profiles.find((item) => item.applicationId === application.id);
    const scopedData = {
      ...defaultData(),
      ats: {
        ...defaultData().ats,
        applications: [application],
        profiles: profile ? [profile] : [],
        documents: {
          [application.id]: data.ats.documents[application.id] ?? [],
        },
        scores: data.ats.scores[application.id]
          ? { [application.id]: data.ats.scores[application.id] }
          : {},
        history: {
          [application.id]: data.ats.history[application.id] ?? [],
        },
      },
    };

    return runAiEndpoint(
      c,
      "applicant_screening",
      {
        role: "applicant",
        userId: application.id,
        agencyId: application.agencyId,
      },
      scopedData,
      {
        ...body,
        message:
          toTrimmedString(body.message) ||
          "Review my application readiness and explain missing requirements.",
      },
    );
  }),
);

app.post(
  "/api/ai/admin-analytics",
  requireAgencyAdminAuth,
  safeApi(async (c) => {
    const admin = c.get("agencyAdmin") as AgencyAdminRecord;
    const body = await parseAiBody(c.req.raw);
    const data = await loadData(c.env, { readOnly: true });
    return runAiEndpoint(
      c,
      "admin_analytics",
      {
        role: "admin",
        userId: admin.id,
        agencyId: admin.agencyId,
        agencyName: admin.agencyName,
      },
      data,
      body,
    );
  }),
);

app.post(
  "/api/ai/content-generator",
  requireAgencyAdminAuth,
  safeApi(async (c) => {
    const admin = c.get("agencyAdmin") as AgencyAdminRecord;
    const body = await parseAiBody(c.req.raw);
    const data = await loadData(c.env, { readOnly: true });
    return runAiEndpoint(
      c,
      "content_generator",
      {
        role: "agency",
        userId: admin.id,
        agencyId: admin.agencyId,
        agencyName: admin.agencyName,
      },
      data,
      body,
    );
  }),
);

app.post(
  "/api/ai/automation",
  requireAgencyAdminAuth,
  safeApi(async (c) => {
    const admin = c.get("agencyAdmin") as AgencyAdminRecord;
    const body = await parseAiBody(c.req.raw);
    const data = await loadData(c.env, { readOnly: true });
    return runAiEndpoint(
      c,
      "workflow_automation",
      {
        role: "agency",
        userId: admin.id,
        agencyId: admin.agencyId,
        agencyName: admin.agencyName,
      },
      data,
      body,
    );
  }),
);

app.post(
  "/api/ai/autopilot/run",
  requireAgencyAdminAuth,
  safeApi(async (c) => {
    const admin = c.get("agencyAdmin") as AgencyAdminRecord;
    const body = (await parseBody<{
      dryRun?: boolean;
      force?: boolean;
      maxActions?: number;
    }>(c.req.raw)) ?? {};
    const data = await loadData(c.env, { readOnly: true });
    const result = await runAiAutopilot({
      appData: data as any,
      anthropicApiKey: c.env.ANTHROPIC_API_KEY,
      supabase: getAiSupabaseConfig(c.env),
      agencyId: admin.agencyId,
      agencyName: admin.agencyName,
      maxActions: typeof body.maxActions === "number" ? body.maxActions : 6,
      dryRun: body.dryRun === true,
      force: body.force === true,
      request: c.req.raw,
    });
    return c.json(result);
  }),
);

// ─── Autonomous marketing cron ────────────────────────────────────────────────

const MARKETING_LOG_KEY = "marketing-last-run.json";
const MARKETING_CONTACTS_KEY = "marketing-contacts-sent.json";
const MARKETING_COOLDOWN_MS = 7 * 86_400_000; // 7 days between messages per contact

type MarketingDispatchResult = {
  scannedAt: string;
  opportunitiesFound: number;
  campaigns: Array<{
    goal: string;
    audience: string;
    totalContacts: number;
    emailsSent: number;
    whatsappQueued: number;
    skipped: number;
  }>;
  emailsTotal: number;
  whatsappTotal: number;
};

const buildWhatsAppLinkMarketing = (phone: string, message: string): string => {
  if (!phone?.trim()) return "";
  const hasPlus = phone.trimStart().startsWith("+");
  let digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  if (!hasPlus && digits.length === 9 && digits.startsWith("0")) digits = digits.slice(1);
  if (!hasPlus && digits.length === 8) digits = `65${digits}`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
};

const goalMetaMarketing = (goal: string) =>
  ({
    new_arrivals: { subject: "New Domestic Helpers Now Available – Helped Maids", hook: "We are pleased to inform you that new domestic helpers have recently joined our agency and are ready for placement.", emoji: "✨" },
    re_engage:   { subject: "We Are Here to Help – Qualified Helpers Available", hook: "We wanted to follow up and let you know that we still have highly qualified domestic helpers ready for placement.", emoji: "👋" },
    follow_up:   { subject: "Following Up on Your Enquiry – Helped Maids", hook: "We hope this message finds you well. We would like to follow up on your recent enquiry and ensure all your questions have been addressed.", emoji: "📋" },
    holiday:     { subject: "Season's Greetings from Helped Maids", hook: "On behalf of our entire team, we wish you and your family a joyful and restful celebration.", emoji: "🎊" },
    promotion:   { subject: "Priority Placement Opportunity – Limited Availability", hook: "We have a limited number of placement slots available and would like to offer you priority access.", emoji: "⭐" },
    custom:      { subject: "An Update from Helped Maids", hook: "We have an important update we would like to share with you.", emoji: "💬" },
  }[goal] ?? { subject: "Update from Helped Maids", hook: "We have something we would like to share with you.", emoji: "" });

const generateMarketingTemplate = async (
  goal: string,
  tone: string,
  agencyName: string,
  agencyPhone: string,
  featuredNames: string[],
  anthropicApiKey: string | undefined,
): Promise<string> => {
  const meta = goalMetaMarketing(goal);
  const emojiPrefix = tone === "professional" ? "" : `${meta.emoji} `;
  const highlight = featuredNames.slice(0, 2).join(" and ");
  const fallback = `Hi {{name}},\n\n${emojiPrefix}${meta.hook}${highlight ? ` Meet ${highlight} — available now.` : ""}\n\nContact us at {{agencyPhone}} — ${agencyName}.`;

  if (!anthropicApiKey) return fallback;

  const toneMap: Record<string, string> = {
    warm: "friendly and caring, 1-2 emojis",
    professional: "formal and polished, no emojis",
    casual: "relaxed and conversational, 1 emoji",
    urgent: "direct and action-oriented, 1 emoji",
  };

  const systemPrompt = `You are a professional client relations specialist for a licensed Singapore domestic helper placement agency. Write ONE polished outreach message. FORMAT: Open with "Dear {{name}}," on its own line, blank line, 2-3 professional sentences that are warm but formal, closing with "Please do not hesitate to contact us at {{agencyPhone}}.", blank line, "Warm regards," then the agency name. Max 320 characters total. Respond with ONLY the message text, nothing else.`;
  const userPrompt = `Goal: ${meta.subject}. Tone: ${toneMap[tone] ?? toneMap.warm}. Agency: ${agencyName}. Phone: ${agencyPhone || "our number"}.${highlight ? ` Available helpers: ${highlight}.` : ""}`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 350,
        temperature: 0.4,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return fallback;
    const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
    const text = data.content?.find((c) => c.type === "text")?.text?.trim();
    if (text && text.includes("{{name}}")) return text;
    if (text) return text.replace(/^Hi there/i, "Hi {{name}}").includes("{{name}}") ? text.replace(/^Hi there/i, "Hi {{name}}") : `Hi {{name}},\n\n${text}\n\nContact us at {{agencyPhone}}.`;
    return fallback;
  } catch {
    return fallback;
  }
};

const detectMarketingOpportunities = (data: AppData) => {
  const DAY = 86_400_000;
  const now = Date.now();
  const ops: Array<{ goal: string; tone: string; audience: string; triggerReason: string }> = [];

  const newMaids = data.maids.filter((m) => {
    const ts = Date.parse(m.createdAt ?? "");
    return m.isPublic && Number.isFinite(ts) && now - ts < DAY;
  });
  if (newMaids.length > 0) ops.push({ goal: "new_arrivals", tone: "warm", audience: "all", triggerReason: `${newMaids.length} new helper(s) added in the last 24h` });

  const staleEnquiries = data.enquiries.filter((e) => {
    const ts = Date.parse(e.createdAt ?? "");
    return Number.isFinite(ts) && now - ts > 3 * DAY;
  });
  if (staleEnquiries.length > 0) ops.push({ goal: "follow_up", tone: "warm", audience: "enquiries", triggerReason: `${staleEnquiries.length} enquiry(ies) without follow-up for 3+ days` });

  const coldLeads = data.directSales.filter((ds) => {
    const ts = Date.parse(ds.createdAt ?? "");
    return Number.isFinite(ts) && now - ts > 7 * DAY;
  });
  if (coldLeads.length > 0) ops.push({ goal: "re_engage", tone: "casual", audience: "leads", triggerReason: `${coldLeads.length} lead(s) inactive for 7+ days` });

  const holidays = [
    [1, 1, "New Year"], [2, 14, "Valentine's Day"], [8, 9, "National Day"],
    [12, 25, "Christmas"], [12, 31, "New Year's Eve"],
  ] as [number, number, string][];
  const horizon = new Date(now + 7 * DAY);
  for (const [m, d, name] of holidays) {
    for (const yr of [new Date().getFullYear(), new Date().getFullYear() + 1]) {
      const date = new Date(yr, m - 1, d);
      if (date.getTime() >= now && date <= horizon) {
        ops.push({ goal: "holiday", tone: "warm", audience: "all", triggerReason: `${name} is within 7 days` });
        break;
      }
    }
  }

  return ops;
};

const cleanPhoneForMake = (phone: string): string => {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  return digits.length === 8 ? "65" + digits : digits;
};

const buildAudienceMarketing = (data: AppData, audience: string) => {
  type Contact = { name: string; phone: string; email: string };
  const contacts: Contact[] = [];
  const seen = new Set<string>();

  const add = (name: string, phone: string, email: string) => {
    const key = phone?.replace(/\D/g, "") || email?.toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    contacts.push({ name: name || "there", phone: phone || "", email: email || "" });
  };

  if (audience === "all" || audience === "clients") {
    for (const c of data.clients) add(c.name, c.phone ?? "", c.email);
  }
  if (audience === "all" || audience === "enquiries") {
    for (const e of data.enquiries) add(e.username, e.phone, e.email);
  }
  if (audience === "all" || audience === "leads") {
    for (const ds of data.directSales) add(ds.clientName, ds.clientPhone, ds.clientEmail);
  }

  return contacts;
};

const runScheduledMarketing = async (env: Bindings): Promise<MarketingDispatchResult> => {
  const data = await loadData(env);
  const scannedAt = new Date().toISOString();
  const nowMs = Date.now();
  const makeUrl = env.MAKE_WEBHOOK_URL?.trim();
  const agencyPhone = cleanPhoneForMake(data.companyProfile?.social_whatsapp_number?.trim() ?? data.companyProfile?.contact_phone?.trim() ?? "");
  const agencyName = data.companyProfile?.company_name?.trim() ?? data.companyProfile?.short_name?.trim() ?? "Our Agency";

  // Load per-contact cooldown log — prevents re-messaging the same person within 7 days
  let sentLog: Record<string, number> = {};
  if (env.APP_DATA) {
    try {
      const raw = await env.APP_DATA.get(MARKETING_CONTACTS_KEY);
      if (raw) sentLog = JSON.parse(raw);
    } catch {}
  }

  const opportunities = detectMarketingOpportunities(data);
  const result: MarketingDispatchResult = {
    scannedAt,
    opportunitiesFound: opportunities.length,
    campaigns: [],
    emailsTotal: 0,
    whatsappTotal: 0,
  };

  if (opportunities.length === 0) {
    if (env.APP_DATA) await env.APP_DATA.put(MARKETING_LOG_KEY, JSON.stringify(result), { expirationTtl: 7 * 86400 });
    return result;
  }

  const featuredMaids = data.maids.filter((m) => m.isPublic).slice(0, 2);
  const maidHighlights = featuredMaids.map((m) => `${m.fullName} (${m.nationality})`).filter(Boolean).join(", ") || "experienced helpers";

  for (const opp of opportunities) {
    const contacts = buildAudienceMarketing(data, opp.audience);
    if (contacts.length === 0) continue;

    const meta = goalMetaMarketing(opp.goal);
    let emailsSent = 0, whatsappQueued = 0, skipped = 0;

    for (const contact of contacts) {
      // Per-contact 7-day cooldown — skip if messaged recently
      const contactKey = (contact.phone?.replace(/\D/g, "") || contact.email?.toLowerCase() || "").trim();
      if (contactKey && sentLog[contactKey] && nowMs - sentLog[contactKey] < MARKETING_COOLDOWN_MS) {
        skipped++;
        continue;
      }

      let sent = false;

      if (contact.phone && makeUrl) {
        try {
          await fetch(makeUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              scenario: "whatsapp_marketing",
              to: cleanPhoneForMake(contact.phone),
              contactName: contact.name,
              goal: opp.goal,
              agencyName,
              agencyPhone,
              maidHighlights,
            }),
            signal: AbortSignal.timeout(5000),
          });
          whatsappQueued++;
          sent = true;
        } catch { skipped++; }
      } else if (contact.email) {
        if (makeUrl) {
          try {
            await fetch(makeUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                scenario: "email_marketing",
                to: contact.email,
                contactName: contact.name,
                subject: meta.subject,
                goal: opp.goal,
                agencyName,
                agencyPhone,
                maidHighlights,
              }),
              signal: AbortSignal.timeout(5000),
            });
            emailsSent++;
            sent = true;
          } catch { skipped++; }
        } else {
          const template = await generateMarketingTemplate(opp.goal, opp.tone, agencyName, agencyPhone, featuredMaids.map((m) => m.fullName), env.ANTHROPIC_API_KEY);
          const personalized = template.replace(/\{\{name\}\}/g, contact.name).replace(/\{\{agencyPhone\}\}/g, agencyPhone || agencyName);
          const emailResult = await sendEmailViaResend(env, contact.email, meta.subject, personalized);
          if (emailResult.ok) { emailsSent++; sent = true; }
          else skipped++;
        }
      } else {
        skipped++;
      }

      // Record send timestamp so this contact is skipped for the next 7 days
      if (sent && contactKey) sentLog[contactKey] = nowMs;

      // 1-second delay between contacts — avoids burst sending flagged as spam
      await new Promise((r) => setTimeout(r, 1000));
    }

    result.campaigns.push({ goal: opp.goal, audience: opp.audience, totalContacts: contacts.length, emailsSent, whatsappQueued, skipped });
    result.emailsTotal += emailsSent;
    result.whatsappTotal += whatsappQueued;
  }

  // Persist updated cooldown log, pruning entries older than 30 days
  if (env.APP_DATA) {
    const cutoff = nowMs - 30 * 86_400_000;
    for (const key of Object.keys(sentLog)) {
      if (sentLog[key] < cutoff) delete sentLog[key];
    }
    await env.APP_DATA.put(MARKETING_CONTACTS_KEY, JSON.stringify(sentLog), { expirationTtl: 30 * 86400 });
    await env.APP_DATA.put(MARKETING_LOG_KEY, JSON.stringify(result), { expirationTtl: 7 * 86400 });
  }

  return result;
};

// ─── Marketing status endpoint ────────────────────────────────────────────────

app.get(
  "/api/ai/direct-marketing/autonomous/status",
  requireAgencyAdminAuth,
  safeApi(async (c) => {
    if (!c.env.APP_DATA) return c.json({ lastRun: null });
    const raw = await c.env.APP_DATA.get(MARKETING_LOG_KEY);
    const lastRun = raw ? (JSON.parse(raw) as MarketingDispatchResult) : null;
    return c.json({ lastRun });
  }),
);

// ─── Direct-marketing supporting types ───────────────────────────────────────

type DmContact = { id: string; name: string; phone: string; email: string; source: string };
type DmMessage = { contactId: string; contactName: string; contactPhone: string; contactEmail: string; contactSource: string; message: string; whatsappLink: string; charCount: number; whatsappReady: boolean };
type DmCampaign = { id: string; goal: string; tone: string; audienceType: string; maidReferences: string[]; messageTemplate: string; subject: string; messages: DmMessage[]; contactCount: number; whatsappReadyCount: number; emailOnlyCount: number; generatedAt: string; aiUsed: boolean };
type DmCampaignSummary = Omit<DmCampaign, "messages" | "messageTemplate">;
type DmOpportunity = { id: string; triggerType: string; title: string; reasoning: string; goal: string; tone: string; audienceType: string; maidReferences: string[]; estimatedReach: number; priority: string; detectedAt: string };

const MARKETING_CAMPAIGNS_KEY = "marketing-campaigns.json";

const audienceTypeToInternal = (type: string) => {
  if (type === "all_clients") return "clients";
  if (type === "enquiry_leads") return "enquiries";
  if (type === "direct_sale_leads") return "leads";
  return "all";
};

const buildDetailedContacts = (data: AppData, audienceType: string): DmContact[] => {
  const contacts: DmContact[] = [];
  const seen = new Set<string>();
  const add = (id: string, name: string, phone: string, email: string, source: string) => {
    const key = phone?.replace(/\D/g, "") || email?.toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    contacts.push({ id, name: name || "there", phone: phone || "", email: email || "", source });
  };
  const internal = audienceTypeToInternal(audienceType);
  if (internal === "all" || internal === "clients") {
    for (const c of data.clients) add(`client-${c.id}`, c.name, c.phone ?? "", c.email, "client");
  }
  if (internal === "all" || internal === "enquiries") {
    for (const e of data.enquiries) add(`enquiry-${e.id}`, e.username, e.phone, e.email, "enquiry");
  }
  if (internal === "all" || internal === "leads") {
    for (const ds of data.directSales) add(`lead-${ds.id}`, ds.clientName, ds.clientPhone, ds.clientEmail, "direct_sale");
  }
  return contacts;
};

const buildDmCampaign = async (
  env: Bindings,
  data: AppData,
  goal: string,
  tone: string,
  audienceType: string,
  maidRefs: string[],
): Promise<DmCampaign> => {
  const agencyPhone = cleanPhoneForMake(data.companyProfile?.social_whatsapp_number?.trim() ?? data.companyProfile?.contact_phone?.trim() ?? "");
  const agencyName = data.companyProfile?.company_name?.trim() ?? data.companyProfile?.short_name?.trim() ?? "Our Agency";
  const featured = maidRefs.length > 0
    ? data.maids.filter((m) => maidRefs.includes(m.referenceCode))
    : data.maids.filter((m) => m.isPublic).slice(0, 2);
  const template = await generateMarketingTemplate(goal, tone, agencyName, agencyPhone, featured.map((m) => m.fullName), env.ANTHROPIC_API_KEY);
  const meta = goalMetaMarketing(goal);
  const contacts = buildDetailedContacts(data, audienceType);
  const messages: DmMessage[] = contacts.map((contact) => {
    const msg = template.replace(/\{\{name\}\}/g, contact.name).replace(/\{\{agencyPhone\}\}/g, agencyPhone || agencyName);
    const waLink = buildWhatsAppLinkMarketing(contact.phone, msg);
    return { contactId: contact.id, contactName: contact.name, contactPhone: contact.phone, contactEmail: contact.email, contactSource: contact.source, message: msg, whatsappLink: waLink, charCount: msg.length, whatsappReady: Boolean(contact.phone?.trim()) };
  });
  return {
    id: crypto.randomUUID(),
    goal, tone, audienceType,
    maidReferences: featured.map((m) => m.referenceCode),
    messageTemplate: template,
    subject: meta.subject,
    messages,
    contactCount: messages.length,
    whatsappReadyCount: messages.filter((m) => m.whatsappReady).length,
    emailOnlyCount: messages.filter((m) => !m.whatsappReady && m.contactEmail).length,
    generatedAt: new Date().toISOString(),
    aiUsed: Boolean(env.ANTHROPIC_API_KEY),
  };
};

const saveCampaignSummary = async (env: Bindings, campaign: DmCampaign) => {
  if (!env.APP_DATA) return;
  const raw = await env.APP_DATA.get(MARKETING_CAMPAIGNS_KEY);
  const existing: DmCampaignSummary[] = raw ? (JSON.parse(raw) as DmCampaignSummary[]) : [];
  const { messages: _m, messageTemplate: _t, ...summary } = campaign;
  existing.unshift(summary);
  if (existing.length > 50) existing.length = 50;
  await env.APP_DATA.put(MARKETING_CAMPAIGNS_KEY, JSON.stringify(existing), { expirationTtl: 30 * 86400 });
};

// ─── GET /api/ai/direct-marketing/audience ───────────────────────────────────

app.get(
  "/api/ai/direct-marketing/audience",
  requireAgencyAdminAuth,
  safeApi(async (c) => {
    const type = c.req.query("type") ?? "all_contacts";
    const data = await loadData(c.env, { readOnly: true });
    const contacts = buildDetailedContacts(data, type);
    return c.json({ contacts, total: contacts.length });
  }),
);

// ─── GET /api/ai/direct-marketing/campaigns ──────────────────────────────────

app.get(
  "/api/ai/direct-marketing/campaigns",
  requireAgencyAdminAuth,
  safeApi(async (c) => {
    if (!c.env.APP_DATA) return c.json({ campaigns: [] });
    const raw = await c.env.APP_DATA.get(MARKETING_CAMPAIGNS_KEY);
    const campaigns: DmCampaignSummary[] = raw ? (JSON.parse(raw) as DmCampaignSummary[]) : [];
    return c.json({ campaigns });
  }),
);

// ─── GET /api/ai/direct-marketing/autonomous/scan ────────────────────────────

app.get(
  "/api/ai/direct-marketing/autonomous/scan",
  requireAgencyAdminAuth,
  safeApi(async (c) => {
    const data = await loadData(c.env, { readOnly: true });
    const rawOps = detectMarketingOpportunities(data);
    const goalToTrigger: Record<string, string> = { new_arrivals: "new_helpers", follow_up: "stale_enquiries", re_engage: "cold_leads", holiday: "upcoming_holiday" };
    const goalToTitle: Record<string, string> = { new_arrivals: "New Helpers Available", follow_up: "Follow Up on Enquiries", re_engage: "Re-engage Cold Leads", holiday: "Holiday Greeting Campaign", promotion: "Promotion Campaign", custom: "Custom Campaign" };
    const goalToPriority: Record<string, string> = { new_arrivals: "high", follow_up: "medium", re_engage: "medium", holiday: "high", promotion: "low", custom: "low" };
    const audToType: Record<string, string> = { all: "all_contacts", clients: "all_clients", enquiries: "enquiry_leads", leads: "direct_sale_leads" };
    const featured = data.maids.filter((m) => m.isPublic).slice(0, 3).map((m) => m.referenceCode);
    const now = new Date().toISOString();
    const opportunities: DmOpportunity[] = rawOps.map((op) => {
      const audienceType = audToType[op.audience] ?? "all_contacts";
      return {
        id: crypto.randomUUID(),
        triggerType: goalToTrigger[op.goal] ?? "new_helpers",
        title: goalToTitle[op.goal] ?? op.goal,
        reasoning: op.triggerReason,
        goal: op.goal,
        tone: op.tone,
        audienceType,
        maidReferences: featured,
        estimatedReach: buildDetailedContacts(data, audienceType).length,
        priority: goalToPriority[op.goal] ?? "low",
        detectedAt: now,
      };
    });
    return c.json({ scannedAt: now, agencyId: 0, opportunities });
  }),
);

// ─── POST /api/ai/direct-marketing/autonomous/run ────────────────────────────

app.post(
  "/api/ai/direct-marketing/autonomous/run",
  requireAgencyAdminAuth,
  safeApi(async (c) => {
    const body = await parseBody<{ opportunity?: DmOpportunity }>(c.req.raw);
    if (!body?.opportunity) return c.json({ error: "opportunity is required" }, 400);
    const opp = body.opportunity;
    const data = await loadData(c.env, { readOnly: true });
    const campaign = await buildDmCampaign(c.env, data, opp.goal, opp.tone, opp.audienceType, opp.maidReferences ?? []);
    await saveCampaignSummary(c.env, campaign);
    return c.json({ campaigns: [campaign] });
  }),
);

// ─── POST /api/ai/direct-marketing/generate ──────────────────────────────────

app.post(
  "/api/ai/direct-marketing/generate",
  requireAgencyAdminAuth,
  safeApi(async (c) => {
    const body = await parseBody<{ goal?: string; tone?: string; maidReferences?: string[]; audienceType?: string; customNote?: string }>(c.req.raw);
    const goal = body?.goal ?? "new_arrivals";
    const tone = body?.tone ?? "warm";
    const audienceType = body?.audienceType ?? "all_contacts";
    const maidRefs = body?.maidReferences ?? [];
    const data = await loadData(c.env, { readOnly: true });
    const campaign = await buildDmCampaign(c.env, data, goal, tone, audienceType, maidRefs);
    await saveCampaignSummary(c.env, campaign);
    return c.json({ campaign });
  }),
);

const runScheduledAiAutopilot = async (env: Bindings) => {
  if (!isAiAutopilotEnabled(env)) {
    return {
      skipped: true,
      reason: "AI_AUTOPILOT_ENABLED is not true",
    };
  }
  // Load without readOnly so the merge normalisation is persisted and any
  // changes made by the autopilot runner are not silently discarded.
  const data = await loadData(env);
  return await runAiAutopilot({
    appData: data as any,
    anthropicApiKey: env.ANTHROPIC_API_KEY,
    supabase: getAiSupabaseConfig(env),
    maxActions: 8,
  });
};

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
    password: await hashPassword(body.password.trim()),
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
  const clientMatch = data.clients.find(
    (item) => normalizeEmail(item.email) === normalizedEmail,
  );
  if (!clientMatch) {
    return c.json({ error: "Invalid email or password" }, 401);
  }
  if (!clientMatch.password.startsWith("pbkdf2:")) {
    // Legacy plaintext password: compare directly then migrate to PBKDF2 immediately.
    // verifyPassword rejects non-PBKDF2 so this branch handles migration explicitly.
    if (clientMatch.password.trim() !== body.password!.trim()) {
      return c.json({ error: "Invalid email or password" }, 401);
    }
    clientMatch.password = await hashPassword(body.password!.trim());
    await saveData(c.env, data);
  } else if (!(await verifyPassword(body.password!.trim(), clientMatch.password))) {
    return c.json({ error: "Invalid email or password" }, 401);
  }
  const client = clientMatch;

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

// ─── WhatsApp candidate communication ────────────────────────────────────────
// Stores per-candidate conversations in KV under the key "whatsapp:{ref}".
// Provides a working panel without requiring an external WhatsApp API.

const kvWhatsAppKey = (ref: string) => `whatsapp:${ref}`;

type WaConversation = {
  id: string;
  candidateReferenceCode: string;
  candidateName: string;
  phoneNumber: string;
  currentStage: string;
  nextStep: string;
  tags: string[];
  unreadRecruiterCount: number;
  unreadApplicantCount: number;
  lastMessageAt: string;
  lastMessagePreview: string;
  status: "active" | "needs_attention" | "closed";
  aiEnabled: boolean;
  interviewSchedule?: { date: string; time: string; status: string };
  documentChecklist: Array<{ key: string; label: string; completed: boolean; lastSubmittedAt?: string }>;
  createdAt: string;
  updatedAt: string;
};

type WaMessage = {
  id: string;
  direction: "incoming" | "outgoing";
  status: "queued" | "sent" | "delivered" | "read" | "failed";
  type: "text" | "template" | "image" | "video" | "document" | "audio" | "system";
  senderName: string;
  senderRole: "recruiter" | "applicant" | "ai" | "system";
  text: string;
  templateKey?: string;
  automated: boolean;
  createdAt: string;
  attachments: Array<{ id: string; fileName: string; mimeType: string; size: number; kind: string; publicUrl: string; uploadedAt: string }>;
};

type WaStore = { conversation: WaConversation; messages: WaMessage[]; events: Array<{ id: string; type: string; detail: string; createdAt: string }> };

const loadWaStore = async (kv: KVNamespace, ref: string, maidName: string): Promise<WaStore> => {
  const raw = await kv.get(kvWhatsAppKey(ref));
  if (raw) return JSON.parse(raw) as WaStore;
  const ts = now();
  return {
    conversation: {
      id: `wa-${ref}`,
      candidateReferenceCode: ref,
      candidateName: maidName,
      phoneNumber: "",
      currentStage: "New Applicant",
      nextStep: "Review and send introduction message",
      tags: [],
      unreadRecruiterCount: 0,
      unreadApplicantCount: 0,
      lastMessageAt: ts,
      lastMessagePreview: "",
      status: "active",
      aiEnabled: false,
      documentChecklist: [],
      createdAt: ts,
      updatedAt: ts,
    },
    messages: [],
    events: [],
  };
};

const saveWaStore = async (kv: KVNamespace, ref: string, store: WaStore) => {
  await kv.put(kvWhatsAppKey(ref), JSON.stringify(store));
};

const buildWaBundle = (store: WaStore, maid: MaidRecord) => ({
  conversation: store.conversation,
  candidate: { referenceCode: maid.referenceCode, fullName: maid.fullName, agencyId: maid.agencyId },
  messages: store.messages,
  templates: [],
  events: store.events,
});

app.get(
  "/api/whatsapp/candidates/:referenceCode",
  requireAgencyAdminAuth,
  safeApi(async (c) => {
    if (!c.env.APP_DATA) return c.json({ error: "WhatsApp feature requires KV storage (bind APP_DATA)" }, 503);
    const ref = normalizeReferenceCode(c.req.param("referenceCode"));
    const data = await loadData(c.env, { readOnly: true });
    const maid = data.maids.find((m) => m.referenceCode === ref);
    if (!maid) return c.json({ error: "Maid not found" }, 404);
    const store = await loadWaStore(c.env.APP_DATA, ref, maid.fullName);
    return c.json(buildWaBundle(store, maid));
  }),
);

app.post(
  "/api/whatsapp/candidates/:referenceCode/messages",
  requireAgencyAdminAuth,
  safeApi(async (c) => {
    if (!c.env.APP_DATA) return c.json({ error: "WhatsApp feature requires KV storage (bind APP_DATA)" }, 503);
    const ref = normalizeReferenceCode(c.req.param("referenceCode"));
    const body = await parseBody<{ text?: string; templateKey?: string; attachments?: unknown[] }>(c.req.raw);
    const data = await loadData(c.env, { readOnly: true });
    const maid = data.maids.find((m) => m.referenceCode === ref);
    if (!maid) return c.json({ error: "Maid not found" }, 404);
    const store = await loadWaStore(c.env.APP_DATA, ref, maid.fullName);
    const admin = c.get("agencyAdmin") as AgencyAdminRecord;
    const message: WaMessage = {
      id: crypto.randomUUID(),
      direction: "outgoing",
      status: "queued",
      type: body?.templateKey ? "template" : "text",
      senderName: admin.username || "Agency Staff",
      senderRole: "recruiter",
      text: toTrimmedString(body?.text),
      templateKey: body?.templateKey ? toTrimmedString(body.templateKey) : undefined,
      automated: false,
      createdAt: now(),
      attachments: [],
    };
    store.messages.push(message);
    store.conversation.lastMessageAt = message.createdAt;
    store.conversation.lastMessagePreview = message.text.slice(0, 100);
    store.conversation.updatedAt = message.createdAt;
    await saveWaStore(c.env.APP_DATA, ref, store);
    return c.json(buildWaBundle(store, maid));
  }),
);

app.patch(
  "/api/whatsapp/candidates/:referenceCode/stage",
  requireAgencyAdminAuth,
  safeApi(async (c) => {
    if (!c.env.APP_DATA) return c.json({ error: "WhatsApp feature requires KV storage (bind APP_DATA)" }, 503);
    const ref = normalizeReferenceCode(c.req.param("referenceCode"));
    const body = await parseBody<{ stage?: string; sendWorkflowTemplate?: boolean; interviewSchedule?: { date: string; time: string; status: string } }>(c.req.raw);
    const data = await loadData(c.env, { readOnly: true });
    const maid = data.maids.find((m) => m.referenceCode === ref);
    if (!maid) return c.json({ error: "Maid not found" }, 404);
    const store = await loadWaStore(c.env.APP_DATA, ref, maid.fullName);
    const ts = now();
    if (body?.stage) {
      store.conversation.currentStage = body.stage;
      store.conversation.updatedAt = ts;
      if (body.interviewSchedule) store.conversation.interviewSchedule = body.interviewSchedule;
      store.events.push({ id: crypto.randomUUID(), type: "stage_change", detail: `Stage updated to ${body.stage}`, createdAt: ts });
    }
    await saveWaStore(c.env.APP_DATA, ref, store);
    return c.json(buildWaBundle(store, maid));
  }),
);

app.post(
  "/api/whatsapp/inbound",
  requireAgencyAdminAuth,
  safeApi(async (c) => {
    if (!c.env.APP_DATA) return c.json({ ok: true });
    const body = await parseBody<{ candidateReferenceCode?: string; applicantName?: string; text?: string }>(c.req.raw);
    const ref = toTrimmedString(body?.candidateReferenceCode);
    if (!ref) return c.json({ ok: true });
    const data = await loadData(c.env, { readOnly: true });
    const maid = data.maids.find((m) => m.referenceCode === ref);
    if (!maid) return c.json({ ok: true });
    const store = await loadWaStore(c.env.APP_DATA, ref, maid.fullName);
    const ts = now();
    const message: WaMessage = {
      id: crypto.randomUUID(),
      direction: "incoming",
      status: "delivered",
      type: "text",
      senderName: toTrimmedString(body?.applicantName) || maid.fullName,
      senderRole: "applicant",
      text: toTrimmedString(body?.text),
      automated: false,
      createdAt: ts,
      attachments: [],
    };
    store.messages.push(message);
    store.conversation.lastMessageAt = ts;
    store.conversation.lastMessagePreview = message.text.slice(0, 100);
    store.conversation.unreadRecruiterCount += 1;
    store.conversation.updatedAt = ts;
    await saveWaStore(c.env.APP_DATA, ref, store);
    return c.json({ ok: true });
  }),
);

app.get(
  "/api/whatsapp/dashboard/metrics",
  requireAgencyAdminAuth,
  safeApi(async (c) => {
    return c.json({
      messagesSent: 0,
      messagesDelivered: 0,
      messagesRead: 0,
      responseRate: 0,
      averageResponseTimeMinutes: 0,
      activeConversations: 0,
      pendingReplies: 0,
      interviewConfirmations: 0,
      documentSubmissionRate: 0,
    });
  }),
);

// ─── Agency auth ─────────────────────────────────────────────────────────────

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
    password: await hashPassword(body.password.trim()),
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
    const usernameOrEmail = body.username.trim();
    const normalizedIdentifier = usernameOrEmail.toLowerCase();
    const normalizedEmail = isEmailLike(usernameOrEmail)
      ? normalizeEmail(usernameOrEmail)
      : "";
    const password = body.password.trim();

    const adminMatch = agencyAdmins.find((item) => {
      const username =
        typeof item.username === "string"
          ? item.username.trim().toLowerCase()
          : "";
      const email =
        typeof item.email === "string" ? normalizeEmail(item.email) : "";
      return (
        username === normalizedIdentifier ||
        (normalizedEmail && email === normalizedEmail)
      );
    });
    if (!adminMatch) {
      return c.json({ error: "Invalid username or password" }, 401);
    }
    if (!adminMatch.password.startsWith("pbkdf2:")) {
      // Legacy plaintext password OR empty password (unset / first-time activation).
      // Empty password means the account was seeded without one; the first login sets it.
      // Non-empty plaintext: must match exactly (then we migrate to PBKDF2).
      if (adminMatch.password !== "" && adminMatch.password.trim() !== password) {
        return c.json({ error: "Invalid username or password" }, 401);
      }
      const newHash = await hashPassword(password);
      const fullData = await loadData(c.env);
      const storedAdmin = fullData.agencyAdmins.find((a) => a.id === adminMatch.id);
      if (storedAdmin) {
        storedAdmin.password = newHash;
        await saveData(c.env, fullData);
        adminMatch.password = newHash;
        // Refresh the auth-store cache so stale empty password is evicted.
        const supabase = getSupabaseAppDataConfig(c.env);
        if (supabase && !isNormalizedSupabaseEnabled(c.env)) {
          void saveAgencyAdminAuthToSupabase(supabase, fullData.agencyAdmins).catch(() => {});
        }
      }
    } else if (!(await verifyPassword(password, adminMatch.password))) {
      return c.json({ error: "Invalid username or password" }, 401);
    }
    const admin = adminMatch;

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

app.get("/api/direct-sales", requireAgencyAdminAuth, async (c) => {
  const page = Math.max(1, Number(c.req.query("page") ?? "1") || 1);
  const pageSize = Math.min(100, Math.max(1, Number(c.req.query("pageSize") ?? "50") || 50));
  const data = await loadData(c.env, { readOnly: true });
  const sorted = [...data.directSales].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
  const total = sorted.length;
  const paged = sorted.slice((page - 1) * pageSize, page * pageSize);
  return c.json({ directSales: paged, total, page, pageSize });
});

app.get("/api/direct-sales/clients", requireAgencyAdminAuth, async (c) => {
  const data = await loadData(c.env, { readOnly: true });
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

app.post("/api/direct-sales", requireAgencyAdminAuth, async (c) => {
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
  if (body.referenceCode.length > 100) {
    return c.json({ error: "Input exceeds maximum allowed length" }, 400);
  }
  if (body.formData && JSON.stringify(body.formData).length > 10_000) {
    return c.json({ error: "Form data exceeds maximum allowed size" }, 400);
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

app.post("/api/direct-sales/:referenceCode", requireAgencyAdminAuth, async (c) => {
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

app.patch("/api/direct-sales/:id/interested", requireAgencyAdminAuth, async (c) => {
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

app.patch("/api/direct-sales/:id/direct-hire", requireAgencyAdminAuth, async (c) => {
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

app.patch("/api/direct-sales/:id/reject", requireAgencyAdminAuth, async (c) => {
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

/* ─── Chat fast-path + presence helpers ──────────────────────────────────
 * Reads come from the indexed public.helped_query_chat_messages table via
 * dedicated RPCs (see supabase/20260604_chat_fastpath_presence.sql) instead
 * of loading the whole app-data blob. Every RPC call uses tryCallSupabaseRpc
 * so the endpoints fall back to the legacy loadData path if the migration has
 * not been applied yet. Message writes + mark-read still flow through
 * loadData/saveData (the blob is the source of truth; saving rebuilds the
 * query cache), but mark-read now runs in the background off the read path.
 */

type ChatPresenceSnapshot = {
  clients: number[];
  agencies: number[];
  anyAdmin: boolean;
};

const CHAT_PRESENCE_WINDOW_SECONDS = 40;

const loadChatPresence = async (
  env: Bindings,
): Promise<ChatPresenceSnapshot> => {
  const config = getSupabaseAppDataConfig(env);
  if (!config) return { clients: [], agencies: [], anyAdmin: false };
  const result = await tryCallSupabaseRpc<Partial<ChatPresenceSnapshot>>(
    config,
    "get_helped_presence",
    { p_app_id: config.rowId, p_window_seconds: CHAT_PRESENCE_WINDOW_SECONDS },
  );
  return {
    clients: Array.isArray(result?.clients) ? result!.clients.map(Number) : [],
    agencies: Array.isArray(result?.agencies)
      ? result!.agencies.map(Number)
      : [],
    anyAdmin: Boolean(result?.anyAdmin),
  };
};

const touchChatPresence = async (
  env: Bindings,
  actorType: "client" | "admin",
  actorId: number,
  agencyId?: number | null,
) => {
  const config = getSupabaseAppDataConfig(env);
  if (!config) return;
  await tryCallSupabaseRpc(config, "helped_presence_touch", {
    p_app_id: config.rowId,
    p_actor_type: actorType,
    p_actor_id: actorId,
    p_agency_id: typeof agencyId === "number" ? agencyId : null,
  });
};

const markChatPresenceOffline = async (
  env: Bindings,
  actorType: "client" | "admin",
  actorId: number,
) => {
  const config = getSupabaseAppDataConfig(env);
  if (!config) return;
  await tryCallSupabaseRpc(config, "helped_presence_offline", {
    p_app_id: config.rowId,
    p_actor_type: actorType,
    p_actor_id: actorId,
  });
};

const isAgencyOnlineFor = (
  presence: ChatPresenceSnapshot,
  conversationType: "support" | "agency",
  agencyId?: number,
) => {
  if (typeof agencyId === "number" && presence.agencies.includes(agencyId)) {
    return true;
  }
  return conversationType === "support" ? presence.anyAdmin : false;
};

// Run a fire-and-forget task without blocking the response (e.g. mark-read).
const runChatBackgroundTask = (
  c: { executionCtx?: { waitUntil?: (promise: Promise<unknown>) => void } },
  task: Promise<unknown>,
) => {
  const guarded = task.catch((error) => {
    console.warn("Chat background task failed", error);
  });
  try {
    c.executionCtx?.waitUntil?.(guarded);
  } catch {
    void guarded;
  }
};

const markAdminConversationRead = async (
  env: Bindings,
  clientId: number,
  conversationType: "support" | "agency",
  agencyId?: number,
) => {
  const data = await loadData(env);
  let changed = false;
  data.chatMessages = data.chatMessages.map((message) => {
    if (
      message.clientId === clientId &&
      message.senderRole === "client" &&
      message.conversationType === conversationType &&
      (conversationType === "support" || message.agencyId === agencyId) &&
      !message.readByAgency
    ) {
      changed = true;
      return { ...message, readByAgency: true };
    }
    return message;
  });
  if (changed) await saveData(env, data);
};

const markClientConversationRead = async (
  env: Bindings,
  clientId: number,
  conversationType: "support" | "agency",
  agencyId?: number,
) => {
  const data = await loadData(env);
  let changed = false;
  data.chatMessages = data.chatMessages.map((message) => {
    if (
      message.clientId === clientId &&
      message.senderRole === "agency" &&
      message.conversationType === conversationType &&
      (conversationType === "support" || message.agencyId === agencyId) &&
      !message.readByClient
    ) {
      changed = true;
      return { ...message, readByClient: true };
    }
    return message;
  });
  if (changed) await saveData(env, data);
};

type ChatMessageScope = {
  clientId?: number;
  conversationType?: "support" | "agency";
  agencyId?: number;
};

// New messages after a cursor id (drives SSE loops). Uses the indexed RPC and
// falls back to a full blob scan only when the migration is not yet applied.
const loadChatMessagesAfter = async (
  env: Bindings,
  config: SupabaseAppDataConfig | null,
  afterId: number,
  scope: ChatMessageScope = {},
): Promise<ChatMessageRecord[]> => {
  if (config) {
    const fast = await tryCallSupabaseRpc<ChatMessageRecord[]>(
      config,
      "get_helped_chat_messages_after",
      {
        p_app_id: config.rowId,
        p_after_id: afterId,
        p_client_id: scope.clientId ?? null,
        p_conversation_type: scope.conversationType ?? null,
        p_agency_id: scope.agencyId ?? null,
      },
    );
    if (fast) return fast;
  }

  const data = await loadData(env, { readOnly: true });
  return data.chatMessages
    .filter(
      (message) =>
        message.id > afterId &&
        (scope.clientId == null || message.clientId === scope.clientId) &&
        (scope.conversationType == null ||
          message.conversationType === scope.conversationType) &&
        (scope.agencyId == null || message.agencyId === scope.agencyId),
    )
    .sort((left, right) => left.id - right.id);
};

const loadChatLastId = async (
  env: Bindings,
  clientId?: number,
): Promise<number> => {
  const config = getSupabaseAppDataConfig(env);
  if (config) {
    const fast = await tryCallSupabaseRpc<{ lastId?: number }>(
      config,
      "get_helped_chat_last_id",
      { p_app_id: config.rowId, p_client_id: clientId ?? null },
    );
    if (fast && typeof fast.lastId === "number") return fast.lastId;
  }

  const data = await loadData(env, { readOnly: true });
  return data.chatMessages
    .filter((message) => clientId == null || message.clientId === clientId)
    .reduce((maxId, message) => Math.max(maxId, message.id), 0);
};

type ClientConversationSummary = {
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
  agencyOnline?: boolean;
};

const ensureDefaultSupportConversation = (
  conversations: ClientConversationSummary[],
  clientId: number,
  fallbackAt: string,
) => {
  if (conversations.some((conv) => conv.key === "support:0")) return conversations;
  return [
    ...conversations,
    {
      key: "support:0",
      clientId,
      conversationType: "support" as const,
      title: "Agency Support",
      description: "General help, follow-up, and request support",
      lastMessage: "",
      lastMessageAt: fallbackAt,
      unreadCount: 0,
    },
  ];
};

const attachAgencyOnline = (
  conversations: ClientConversationSummary[],
  presence: ChatPresenceSnapshot,
) =>
  conversations
    .map((conv) => ({
      ...conv,
      agencyOnline: isAgencyOnlineFor(
        presence,
        conv.conversationType,
        conv.agencyId,
      ),
    }))
    .sort(
      (left, right) =>
        new Date(right.lastMessageAt).getTime() -
        new Date(left.lastMessageAt).getTime(),
    );

app.get("/api/chats/client/conversations", requireClientAuth, async (c) => {
  const client = c.get("client");

  const config = getSupabaseAppDataConfig(c.env);
  if (config) {
    const [fast, presence] = await Promise.all([
      tryCallSupabaseRpc<ClientConversationSummary[]>(
        config,
        "list_helped_chat_client_conversations",
        { p_app_id: config.rowId, p_client_id: client.id },
      ),
      loadChatPresence(c.env),
    ]);
    if (fast) {
      const withDefault = ensureDefaultSupportConversation(
        fast,
        client.id,
        client.createdAt,
      );
      return c.json({ conversations: attachAgencyOnline(withDefault, presence) });
    }
  }

  const presence = await loadChatPresence(c.env);
  const data = await loadData(c.env, { readOnly: true });
  const conversations = new Map<string, ClientConversationSummary>();

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

  const withDefault = ensureDefaultSupportConversation(
    Array.from(conversations.values()),
    client.id,
    client.createdAt,
  );
  return c.json({ conversations: attachAgencyOnline(withDefault, presence) });
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
  const url = new URL(c.req.url);
  const { conversationType, agencyId } = getConversationContext(url);
  const beforeId = Number(url.searchParams.get("before") ?? "");
  const limit = Number(url.searchParams.get("limit") ?? "");
  const isPaginating = Number.isInteger(beforeId) && beforeId > 0;

  const config = getSupabaseAppDataConfig(c.env);
  if (config) {
    const fast = await tryCallSupabaseRpc<ChatMessageRecord[]>(
      config,
      "get_helped_chat_messages",
      {
        p_app_id: config.rowId,
        p_client_id: client.id,
        p_conversation_type: conversationType,
        p_agency_id: conversationType === "agency" ? (agencyId ?? null) : null,
        p_before_id: isPaginating ? beforeId : null,
        p_limit: Number.isInteger(limit) && limit > 0 ? limit : 30,
      },
    );
    if (fast) {
      if (
        !isPaginating &&
        fast.some((m) => m.senderRole === "agency" && !m.readByClient)
      ) {
        runChatBackgroundTask(
          c,
          markClientConversationRead(
            c.env,
            client.id,
            conversationType,
            agencyId,
          ),
        );
      }
      return c.json({ client: toSafeClient(client), messages: fast });
    }
  }

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
  try {
    await saveData(c.env, data);
  } catch (error) {
    console.warn("Unable to mark client chat messages as read:", error);
  }
  return c.json({ client: toSafeClient(client), messages });
});

const generateChatBotReply = async (
  env: Bindings,
  client: { id: number; name: string },
  userMessage: ChatMessageRecord,
): Promise<void> => {
  try {
    const supabase = getAiSupabaseConfig(env);
    if (!supabase || !env.ANTHROPIC_API_KEY) return;
    const data = await loadData(env, { readOnly: true });
    const result = await runAIAgent({
      agentId: "employer_support",
      input: { message: userMessage.message },
      actor: { role: "employer", userId: client.id, clientId: client.id, ip: "chat-bot" },
      appData: data as unknown as Record<string, unknown>,
      anthropicApiKey: env.ANTHROPIC_API_KEY,
      cfAi: env.AI ?? null,
      supabase,
      conversationId: `chat:support:${client.id}`,
    });
    const reply = result?.response?.trim();
    if (!reply) return;
    const replyData = await loadData(env);
    replyData.chatMessages.push({
      id: replyData.counters.chatMessages++,
      clientId: client.id,
      conversationType: userMessage.conversationType,
      agencyId: userMessage.agencyId,
      agencyName: userMessage.agencyName || "",
      senderRole: "agency",
      senderName: "AI Support",
      message: reply,
      createdAt: now(),
      readByAgency: true,
      readByClient: false,
      isBot: true,
    });
    await saveData(env, replyData);
  } catch (error) {
    console.warn("Chat AI reply failed, storing fallback", error);
    try {
      const replyData = await loadData(env);
      replyData.chatMessages.push({
        id: replyData.counters.chatMessages++,
        clientId: client.id,
        conversationType: userMessage.conversationType,
        agencyId: userMessage.agencyId,
        agencyName: userMessage.agencyName || "",
        senderRole: "agency",
        senderName: "Support Bot",
        message: "Thanks for your message! Our team has been notified and will follow up with you shortly. For urgent matters you can reach us via WhatsApp.",
        createdAt: now(),
        readByAgency: true,
        readByClient: false,
        isBot: true,
      });
      await saveData(env, replyData);
    } catch { /* ignore */ }
  }
};

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
  runChatBackgroundTask(c, touchChatPresence(c.env, "client", client.id, agencyId));
  if (conversationType === "support") {
    runChatBackgroundTask(c, generateChatBotReply(c.env, client, message));
  }
  return c.json({ message }, 201);
});

app.post("/api/chats/client/heartbeat", requireClientAuth, async (c) => {
  const client = c.get("client");
  const { agencyId } = getConversationContext(new URL(c.req.url));
  await touchChatPresence(c.env, "client", client.id, agencyId);
  return c.json({ ok: true });
});

app.post("/api/chats/client/offline", requireClientAuth, async (c) => {
  const client = c.get("client");
  await markChatPresenceOffline(c.env, "client", client.id);
  return c.json({ ok: true });
});

app.get("/api/chats/admin", requireAgencyAdminAuth, async (c) => {
  const config = getSupabaseAppDataConfig(c.env);
  if (config) {
    const [fast, presence] = await Promise.all([
      tryCallSupabaseRpc<Array<{ clientId: number }>>(
        config,
        "list_helped_chat_admin_conversations",
        { p_app_id: config.rowId },
      ),
      loadChatPresence(c.env),
    ]);
    if (fast) {
      return c.json({
        conversations: fast.map((conv) => ({
          ...conv,
          clientOnline: presence.clients.includes(Number(conv.clientId)),
        })),
      });
    }
  }

  const presence = await loadChatPresence(c.env);
  const data = await loadData(c.env, { readOnly: true });
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
    conversations: Array.from(conversations.values())
      .map((conv: any) => ({
        ...conv,
        clientOnline: presence.clients.includes(Number(conv.clientId)),
      }))
      .sort(
        (left: any, right: any) =>
          new Date(right.lastMessageAt).getTime() -
          new Date(left.lastMessageAt).getTime(),
      ),
  });
});

app.get("/api/chats/admin/summary", requireAgencyAdminAuth, async (c) => {
  const config = getSupabaseAppDataConfig(c.env);
  if (config) {
    const fastSummary = await tryCallSupabaseRpc<{ unreadCount: number }>(
      config,
      "get_helped_chat_admin_summary",
      { p_app_id: config.rowId },
    );
    if (fastSummary) {
      return c.json(fastSummary);
    }
  }

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

  const config = getSupabaseAppDataConfig(c.env);
  const startedAt = Date.now();
  return createSseResponse(c.req.raw, async (controller) => {
    let lastId = afterId;
    let lastHeartbeat = Date.now();
    let idleTicks = 0;
    writeSseEvent(controller, "ready", { ok: true });

    while (!c.req.raw.signal.aborted && Date.now() - startedAt < 60_000) {
      const nextMessages = await loadChatMessagesAfter(c.env, config, lastId);

      for (const message of nextMessages) {
        writeSseEvent(controller, "message", { message });
        lastId = Math.max(lastId, message.id);
      }

      if (nextMessages.length > 0) { idleTicks = 0; } else { idleTicks++; }

      const nowTime = Date.now();
      if (nowTime - lastHeartbeat > 15_000) {
        writeSseComment(controller, "keep-alive");
        lastHeartbeat = nowTime;
      }

      await sleep(nextMessages.length > 0 ? 600 : idleTicks > 8 ? 2500 : 1200);
    }
  });
});

app.get("/api/chats/admin/last-id", requireAgencyAdminAuth, async (c) => {
  const lastId = await loadChatLastId(c.env);
  return c.json({ lastId });
});

app.get("/api/chats/admin/config", requireAgencyAdminAuth, async (c) => {
  const admin = c.get("agencyAdmin") as AgencyAdminRecord;
  const data = await loadData(c.env, { readOnly: true });
  const raw = ((data.companyProfile as unknown as Record<string, unknown>).chatbotConfig ?? {}) as Record<string, unknown>;
  const config = {
    agencyId: admin.agencyId,
    enabled: raw.enabled !== false,
    botName: toTrimmedString(raw.botName) || "Support Bot",
    welcomeMessage: toTrimmedString(raw.welcomeMessage),
    fallbackShortResponse: toTrimmedString(raw.fallbackShortResponse),
    fallbackLongResponse: toTrimmedString(raw.fallbackLongResponse),
    suggestionChips: Array.isArray(raw.suggestionChips) ? raw.suggestionChips : [],
    topicOptions: Array.isArray(raw.topicOptions) ? raw.topicOptions : [],
    responseRules: Array.isArray(raw.responseRules) ? raw.responseRules : [],
    updatedAt: toTrimmedString(raw.updatedAt),
  };
  return c.json({ config });
});

app.put("/api/chats/admin/config", requireAgencyAdminAuth, async (c) => {
  const body = await parseBody<Record<string, unknown>>(c.req.raw);
  if (!body) return c.json({ error: "Request body is required" }, 400);
  const data = await loadData(c.env);
  (data.companyProfile as unknown as Record<string, unknown>).chatbotConfig = {
    ...body,
    updatedAt: now(),
  };
  await saveData(c.env, data);
  return c.json({ config: (data.companyProfile as unknown as Record<string, unknown>).chatbotConfig });
});

// Presence routes must be registered before the parametric '/admin/:clientId'
// handlers so Hono does not match "heartbeat"/"offline" as a client id.
app.post("/api/chats/admin/heartbeat", requireAgencyAdminAuth, async (c) => {
  const admin = c.get("agencyAdmin");
  await touchChatPresence(c.env, "admin", admin.id, admin.agencyId);
  return c.json({ ok: true });
});

app.post("/api/chats/admin/offline", requireAgencyAdminAuth, async (c) => {
  const admin = c.get("agencyAdmin");
  await markChatPresenceOffline(c.env, "admin", admin.id);
  return c.json({ ok: true });
});

app.get("/api/chats/admin/:clientId", requireAgencyAdminAuth, async (c) => {
  const clientId = Number(c.req.param("clientId"));
  if (!Number.isInteger(clientId)) {
    return c.json({ error: "Valid client id is required" }, 400);
  }

  const url = new URL(c.req.url);
  const { conversationType, agencyId } = getConversationContext(url);
  const beforeId = Number(url.searchParams.get("before") ?? "");
  const limit = Number(url.searchParams.get("limit") ?? "");
  const isPaginating = Number.isInteger(beforeId) && beforeId > 0;

  const config = getSupabaseAppDataConfig(c.env);
  if (config) {
    const fast = await tryCallSupabaseRpc<ChatMessageRecord[]>(
      config,
      "get_helped_chat_messages",
      {
        p_app_id: config.rowId,
        p_client_id: clientId,
        p_conversation_type: conversationType,
        p_agency_id: conversationType === "agency" ? (agencyId ?? null) : null,
        p_before_id: isPaginating ? beforeId : null,
        p_limit: Number.isInteger(limit) && limit > 0 ? limit : 30,
      },
    );
    if (fast) {
      if (
        !isPaginating &&
        fast.some((m) => m.senderRole === "client" && !m.readByAgency)
      ) {
        runChatBackgroundTask(
          c,
          markAdminConversationRead(c.env, clientId, conversationType, agencyId),
        );
      }
      return c.json({ messages: fast });
    }
  }

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
  try {
    await saveData(c.env, data);
  } catch (error) {
    console.warn("Unable to mark admin chat messages as read:", error);
  }
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
  runChatBackgroundTask(
    c,
    touchChatPresence(c.env, "admin", admin.id, admin.agencyId),
  );
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
  const scope: ChatMessageScope = streamAll
    ? { clientId: client.id }
    : {
        clientId: client.id,
        conversationType,
        agencyId: conversationType === "agency" ? agencyId : undefined,
      };
  const config = getSupabaseAppDataConfig(c.env);
  const startedAt = Date.now();

  return createSseResponse(c.req.raw, async (controller) => {
    let lastId = afterId;
    let lastHeartbeat = Date.now();
    let idleTicks = 0;
    writeSseEvent(controller, "ready", { ok: true });

    while (!c.req.raw.signal.aborted && Date.now() - startedAt < 60_000) {
      const nextMessages = await loadChatMessagesAfter(
        c.env,
        config,
        lastId,
        scope,
      );

      for (const message of nextMessages) {
        writeSseEvent(controller, "message", { message });
        lastId = Math.max(lastId, message.id);
      }

      if (nextMessages.length > 0) { idleTicks = 0; } else { idleTicks++; }

      const nowTime = Date.now();
      if (nowTime - lastHeartbeat > 15_000) {
        writeSseComment(controller, "keep-alive");
        lastHeartbeat = nowTime;
      }

      await sleep(nextMessages.length > 0 ? 600 : idleTicks > 8 ? 2500 : 1200);
    }
  });
});

app.get("/api/chats/client/last-id", requireClientAuth, async (c) => {
  const client = c.get("client");
  const lastId = await loadChatLastId(c.env, client.id);
  return c.json({ lastId });
});

// NOTE: The duplicate registrations of /api/chats/admin/stream and
// /api/chats/admin/last-id that previously existed here have been removed.
// Hono matches the first registered handler; the duplicates were dead code.

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
    const scope: ChatMessageScope = {
      clientId,
      conversationType,
      agencyId: conversationType === "agency" ? agencyId : undefined,
    };
    const config = getSupabaseAppDataConfig(c.env);
    const startedAt = Date.now();

    return createSseResponse(c.req.raw, async (controller) => {
      let lastId = afterId;
      let lastHeartbeat = Date.now();
      let idleTicks = 0;
      writeSseEvent(controller, "ready", { ok: true });

      while (!c.req.raw.signal.aborted && Date.now() - startedAt < 60_000) {
        const nextMessages = await loadChatMessagesAfter(
          c.env,
          config,
          lastId,
          scope,
        );

        for (const message of nextMessages) {
          writeSseEvent(controller, "message", { message });
          lastId = Math.max(lastId, message.id);
        }

        if (nextMessages.length > 0) { idleTicks = 0; } else { idleTicks++; }

        const nowTime = Date.now();
        if (nowTime - lastHeartbeat > 15_000) {
          writeSseComment(controller, "keep-alive");
          lastHeartbeat = nowTime;
        }

        await sleep(nextMessages.length > 0 ? 600 : idleTicks > 8 ? 2500 : 1200);
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
    let formData: FormData;
    try {
      formData = await c.req.raw.formData();
    } catch {
      return c.json({ error: "Multipart form data is required" }, 400);
    }
    let parsed: Awaited<ReturnType<typeof parseAtsFormData>>;
    try {
      parsed = await parseAtsFormData(c.env, formData);
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : "Invalid form data" }, 400);
    }
    const supabase = getSupabaseAppDataConfig(c.env);

    if (supabase && isNormalizedSupabaseEnabled(c.env)) {
      await savePublicAtsApplicationToSupabaseNormalized(supabase, parsed);
      return c.json(
        {
          applicationId: parsed.application.id,
          applicationCode: parsed.application.applicationCode,
          applicantAccessToken: parsed.application.applicantAccessToken,
          submittedAt: parsed.application.appliedAt,
        },
        201,
      );
    }

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

  if (!stage) {
    return c.json({ error: "stage is required" }, 400);
  }
  if (!atsStageOrder.includes(stage)) {
    return c.json({ error: `Invalid stage "${stage}". Valid values: ${atsStageOrder.join(", ")}` }, 400);
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

app.post("/api/pdf-autofill", requireAgencyAdminAuth, async (c) => {
  const anthropicKey = c.env.ANTHROPIC_API_KEY?.trim();
  if (!anthropicKey) return c.json({ error: "PDF autofill is not configured" }, 503);

  const body = await parseBody<{ model?: string; messages?: unknown[] }>(c.req.raw);
  if (!Array.isArray(body?.messages) || body.messages.length === 0) {
    return c.json({ error: "messages are required" }, 400);
  }

  // Extract system messages and convert to Anthropic format
  type MsgLike = { role?: string; content?: string };
  const msgs = body.messages as MsgLike[];
  const systemParts = msgs.filter((m) => m.role === "system").map((m) => m.content ?? "").filter(Boolean);
  const nonSystem = msgs.filter((m) => m.role !== "system") as Array<{ role: "user" | "assistant"; content: string }>;
  const sanitized: Array<{ role: "user" | "assistant"; content: string }> = [];
  for (const msg of nonSystem) {
    const last = sanitized[sanitized.length - 1];
    if (last?.role === msg.role) { last.content += "\n\n" + msg.content; }
    else sanitized.push({ role: msg.role, content: msg.content ?? "" });
  }
  if (sanitized.length === 0 || sanitized[0].role === "assistant") {
    sanitized.unshift({ role: "user", content: "Continue." });
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": anthropicKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      temperature: 0,
      max_tokens: 8192,
      ...(systemParts.length > 0 ? { system: systemParts.join("\n\n") } : {}),
      messages: sanitized,
    }),
    signal: AbortSignal.timeout(55_000),
  });

  const data = (await res.json()) as {
    content?: Array<{ type: string; text?: string }>;
    stop_reason?: string;
    error?: { message?: string };
  };

  if (!res.ok || data.error?.message) {
    return c.json(
      { error: data.error?.message ?? `Claude error ${res.status}` },
      (res.ok ? 500 : res.status) as 400 | 429 | 500 | 503,
    );
  }

  return c.json({
    content:       data.content?.find((c) => c.type === "text")?.text ?? "",
    finish_reason: data.stop_reason ?? "unknown",
  });
});

app.post("/api/send-to-make", async (c) => {
  const webhookUrl = c.env.MAKE_WEBHOOK_URL?.trim();
  if (!webhookUrl) return c.json({ error: "Make webhook is not configured" }, 503);

  const body = await parseBody<{ scenario?: string; payload?: Record<string, unknown> }>(c.req.raw);
  if (!body?.scenario || typeof body.payload !== "object" || body.payload === null) {
    return c.json({ error: "scenario and payload are required" }, 400);
  }

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scenario: body.scenario, ...body.payload }),
    signal: AbortSignal.timeout(10_000),
  });

  return c.json({
    ok: res.ok,
    delivery: { id: Date.now(), scenario: body.scenario, success: res.ok, statusCode: res.status },
  });
});

app.all("/api/*", (c) => c.json({ error: "Not found" }, 404));

const purgeExpiredClientSessions = async (env: Bindings): Promise<void> => {
  const data = await loadData(env);
  const now = Date.now();
  const before = data.clientSessions.length;
  data.clientSessions = data.clientSessions.filter(
    (s) => !s.expiresAt || new Date(s.expiresAt).getTime() > now,
  );
  if (data.clientSessions.length < before) {
    await saveData(env, data);
  }
};

export default {
  async scheduled(
    _controller: unknown,
    env: Bindings,
    executionContext: ExecutionContext,
  ) {
    // Autopilot: draft actions + notify admin via Make.com if any high-priority actions were created
    executionContext.waitUntil(
      (async () => {
        const result = await runScheduledAiAutopilot(env);
        const makeUrl = env.MAKE_WEBHOOK_URL?.trim();
        if (
          makeUrl &&
          result &&
          "actionCount" in result &&
          (result as { actionCount: number }).actionCount > 0
        ) {
          const data = await loadData(env);
          const agencyPhone =
            data.companyProfile?.social_whatsapp_number?.trim() ??
            data.companyProfile?.contact_phone?.trim() ??
            "";
          const agencyName =
            data.companyProfile?.company_name?.trim() ??
            data.companyProfile?.short_name?.trim() ??
            "Our Agency";
          const typedResult = result as {
            actionCount: number;
            actions: Array<{ title: string; priority: string; actionType: string }>;
          };
          const highPriorityCount = typedResult.actions.filter(
            (a) => a.priority === "high",
          ).length;
          await fetch(makeUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              scenario: "autopilot_notification",
              actionCount: typedResult.actionCount,
              highPriorityCount,
              agencyName,
              agencyPhone,
              summaryText: typedResult.actions
                .slice(0, 3)
                .map((a) => a.title)
                .join(" | "),
            }),
            signal: AbortSignal.timeout(5000),
          }).catch(() => {});
        }
      })().catch((error) => {
        console.error("AI autopilot scheduled run failed", error);
      }),
    );

    // Autonomous marketing: detect opportunities + dispatch WhatsApp/email
    executionContext.waitUntil(
      runScheduledMarketing(env).catch((error) => {
        console.error("Autonomous marketing scheduled run failed", error);
      }),
    );

    // Purge expired client sessions from KV blob
    executionContext.waitUntil(
      purgeExpiredClientSessions(env).catch(() => {}),
    );
  },

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
