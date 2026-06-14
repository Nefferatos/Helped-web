import type { AiAgentId } from "./prompts";

type AppDataLike = {
  companyProfile?: Record<string, unknown>;
  momPersonnel?: Array<Record<string, unknown>>;
  testimonials?: Array<Record<string, unknown>>;
  maids?: Array<Record<string, unknown>>;
  enquiries?: Array<Record<string, unknown>>;
  clients?: Array<Record<string, unknown>>;
  requests?: Array<Record<string, unknown>>;
  requestConversations?: Array<Record<string, unknown>>;
  requestMessages?: Array<Record<string, unknown>>;
  chatMessages?: Array<Record<string, unknown>>;
  employers?: Array<Record<string, unknown>>;
  employmentContracts?: Array<Record<string, unknown>>;
  ats?: {
    applications?: Array<Record<string, unknown>>;
    profiles?: Array<Record<string, unknown>>;
    scores?: Record<string, Record<string, unknown>>;
    documents?: Record<string, Array<Record<string, unknown>>>;
    history?: Record<string, Array<Record<string, unknown>>>;
  };
};

export type AiActorContext = {
  role: "public" | "employer" | "agency" | "admin" | "applicant";
  userId?: string | number;
  clientId?: number;
  agencyId?: number;
  agencyName?: string;
  ip?: string;
};

export type AiToolContext = {
  agentId: AiAgentId;
  input: Record<string, unknown>;
  actor: AiActorContext;
  data: AppDataLike;
};

const text = (value: unknown) => (typeof value === "string" ? value : "");
const num = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : null);
const lower = (value: unknown) => text(value).toLowerCase();
const list = <T>(value: T[] | undefined) => (Array.isArray(value) ? value : []);

const includesAny = (source: unknown, needles: string[]) => {
  const value = JSON.stringify(source ?? {}).toLowerCase();
  return needles.some((needle) => value.includes(needle.toLowerCase()));
};

// Module-level constants — defined once, reused on every request.
const BLOB_KEYS = new Set(["logo_data_url", "gallery_image_data_urls", "intro_video_data_url"]);
const maidTier = (m: Record<string, unknown>) =>
  lower(m.status).includes("available") ? 0 :
  lower(m.type).includes("transfer") ? 1 : 2;

const compactMaid = (maid: Record<string, unknown>) => ({
  id: maid.id,
  agencyId: maid.agencyId,
  referenceCode: maid.referenceCode,
  fullName: maid.fullName,
  status: maid.status,
  type: maid.type,
  nationality: maid.nationality,
  languageSkills: maid.languageSkills,
  skillsPreferences: maid.skillsPreferences,
  workAreas: maid.workAreas,
  employmentHistory: maid.employmentHistory,
  introduction: maid.introduction,
  hasPhoto: maid.hasPhoto,
  isPublic: maid.isPublic,
});

const calcAge = (dateOfBirth: unknown) => {
  const dob = text(dateOfBirth);
  if (!dob) return null;
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return null;
  // Use UTC throughout — new Date("YYYY-MM-DD") parses as UTC midnight, so comparing
  // against local-time today() would produce a one-day error near the birthday.
  const today = new Date();
  let age = today.getUTCFullYear() - birth.getUTCFullYear();
  const m = today.getUTCMonth() - birth.getUTCMonth();
  if (m < 0 || (m === 0 && today.getUTCDate() < birth.getUTCDate())) age--;
  return age >= 0 ? age : null;
};

const compactPublicMaid = (maid: Record<string, unknown>) => ({
  // Omit id, agencyId, isPublic — internal DB fields with no value for public AI context.
  referenceCode: maid.referenceCode,
  fullName: maid.fullName,
  status: maid.status,
  type: maid.type,
  nationality: maid.nationality,
  languageSkills: maid.languageSkills,
  skillsPreferences: maid.skillsPreferences,
  workAreas: maid.workAreas,
  employmentHistory: maid.employmentHistory,
  introduction: maid.introduction,
  hasPhoto: maid.hasPhoto,
  age: calcAge(maid.dateOfBirth),
  educationLevel: maid.educationLevel,
  religion: maid.religion,
  maritalStatus: maid.maritalStatus,
  numberOfChildren: num(maid.numberOfChildren),
});

// Normalises a phone number to E.164 digits (no +) for use in wa.me links.
// Returns "" for invalid/non-digit input (e.g. "N/A", "TBD").
// When the raw value starts with "+" the country code is already explicit — just strip
// non-digits and return. The SG-specific fallbacks only apply to bare local numbers:
//   bare 8-digit "80730757"   → "6580730757"  (SG default for numbers without a prefix)
//   leading-zero "080730757"  → "6580730757"  (common SG entry mistake)
const toE164 = (raw: string): string => {
  const hasPlus = raw.trimStart().startsWith("+");
  let digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  if (!hasPlus && digits.length === 9 && digits.startsWith("0")) digits = digits.slice(1);
  if (!hasPlus && digits.length === 8) return `65${digits}`;
  return digits;
};

const buildPublicFaqs = (profile: Record<string, unknown>): string[] => {
  const phone = text(profile.contact_phone);
  const whatsapp = text(profile.social_whatsapp_number);
  const email = text(profile.contact_email);
  const contactPerson = text(profile.contact_person);
  const hours = text(profile.office_hours_regular);

  // Show phone and WhatsApp separately when they are different numbers.
  const phoneWhatsappPart = phone && whatsapp && phone !== whatsapp
    ? `call ${phone} / WhatsApp ${whatsapp}`
    : phone
      ? `call/WhatsApp ${phone}`
      : whatsapp
        ? `WhatsApp ${whatsapp}`
        : "";

  const contactLine = [
    contactPerson && `speak to ${contactPerson}`,
    phoneWhatsappPart,
    email && `email ${email}`,
  ]
    .filter(Boolean)
    .join(", ");

  return [
    contactLine
      ? `Contact us: ${contactLine}.${hours ? ` Office hours: ${hours}.` : ""}`
      : hours
        ? `Office hours: ${hours}.`
        : null,
    "Agency fees vary by maid type, nationality, and services required. Contact the agency directly for an accurate quote.",
    "To enquire about a specific maid or general hiring, submit an enquiry form on the website or contact us directly.",
    "For complaints or urgent matters, contact the agency immediately via phone or WhatsApp for direct staff assistance.",
    "FDW applicants can submit their application via the public application page on this website.",
  ].filter((s): s is string => s !== null);
};

const buildPlatformGuide = (input: Record<string, unknown>) => ({
  visitorCurrentPage: text(input.currentPath) || "/",
  pages: {
    browseHelpers: "/search-maids — browse and filter all available helper profiles by nationality, skills, type, and more",
    viewHelperProfile: "/maids/{referenceCode} — view a helper's full biodata, skills, and work history",
    hireHelper: "/hire/{referenceCode} — start the official hiring process for a specific helper",
    submitEnquiry: "/enquiry2 — submit a general enquiry (name + contact + message); agency follows up",
    applyAsFDW: "/apply-as-maid — FDW applicants submit their 4-step application here",
    checkApplicationStatus: "/apply-as-maid/status/{applicationId} — FDW applicants check status here",
    employerLogin: "/employer-login — employer portal login",
    faq: "/faq — full FAQ page covering hiring, fees, permits, and more",
  },
  howToHire: [
    "1. Browse helpers — visit /search-maids or ask the receptionist to show options.",
    "2. Pick a helper — view their profile at /maids/{refCode}.",
    "3. Start the hiring process — go to /hire/{refCode}, OR submit an enquiry at /enquiry2 with your requirements and let the agency shortlist for you.",
    "4. Agency reviews requirements, arranges an interview, and confirms your selection.",
    "5. Contract is signed and placement fee arranged.",
    "6. Agency handles MOM work permit application, medical exam, and insurance (typically 2–4 weeks).",
    "7. Helper is deployed to your home.",
  ].join(" "),
  howToEnquire: "Visit /enquiry2. Fill in your name, phone or email, and a message describing your needs (e.g. nationality preference, skills needed, budget). The agency team will review and contact you. For faster response, use the WhatsApp or phone number in contactInfo.",
  howToApplyAsFDW: "Visit /apply-as-maid. Complete the 4-step form — Step 1: Biodata (name, nationality, education, contact); Step 2: Health & Preferences (medical history, religion, food preferences); Step 3: Skills & History (work experience, skills, expected salary); Step 4: Attachments (upload resume, passport copy, certificates). After submitting, track your application at /apply-as-maid/status/{applicationId}.",
  howToSendRequest: "Logged-in employers can submit hiring requests directly from their portal at /client/requests. Public visitors: submit an enquiry at /enquiry2 or contact the agency by phone/WhatsApp — agency staff will create and manage the request on your behalf.",
  helperTypes: {
    fresh: "Fresh helper — first deployment in Singapore. Longer processing time (4–8 weeks). Lower placement cost. Good for employers who prefer to train.",
    transfer: "Transfer helper — currently working in Singapore, changing employer. Faster deployment (1–2 weeks). Already familiar with Singapore environment.",
    exSingapore: "Ex-Singapore helper — previously worked in Singapore, now overseas. Experienced with local standards. Processing similar to fresh.",
  },
});

const scoreMaid = (maid: Record<string, unknown>, input: Record<string, unknown>) => {
  let score = 35;
  const reasons: string[] = [];
  const nationality = lower(input.nationalityPreference || input.nationality);
  const budget = num(input.budget);
  const expectedSalary =
    num((maid as { expectedSalary?: unknown }).expectedSalary) ??
    num((maid.skillsPreferences as Record<string, unknown> | undefined)?.expectedSalary);

  if (nationality && lower(maid.nationality).includes(nationality)) {
    score += 15;
    reasons.push(`matches nationality preference (${maid.nationality})`);
  }
  if (input.childcareExperience && includesAny(maid, ["childcare", "child care", "infant", "newborn"])) {
    score += 14;
    reasons.push("has childcare-related experience");
  }
  if (input.elderlyCareExperience && includesAny(maid, ["elderly", "aged care", "dementia"])) {
    score += 14;
    reasons.push("has elderly care experience");
  }
  if (input.cookingSkills && includesAny(maid, ["cook", "cooking", "meal", "food"])) {
    score += 10;
    reasons.push("mentions cooking skills");
  }
  const language = lower(input.languageSkills || input.language);
  if (language && includesAny(maid.languageSkills, [language])) {
    score += 8;
    reasons.push(`matches language requirement (${language})`);
  }
  if (budget && expectedSalary && expectedSalary <= budget) {
    score += 10;
    reasons.push("appears within stated budget");
  }
  if (maid.hasPhoto) score += 3;
  if (maid.status && lower(maid.status).includes("available")) score += 6;

  return {
    maid: compactMaid(maid),
    score: Math.max(0, Math.min(100, score)),
    reasons: reasons.length ? reasons : ["partial profile match based on available biodata"],
  };
};

const getEmployerContext = (data: AppDataLike, actor: AiActorContext) => {
  const requests = list(data.requests).filter((item) => item.clientId === actor.clientId);
  const requestIds = new Set(requests.map((item) => item.id));
  const conversations = list(data.requestConversations).filter((item) =>
    requestIds.has(item.requestId),
  );
  const conversationIds = new Set(conversations.map((item) => item.id));
  return {
    requests,
    contracts: list(data.employmentContracts).filter((contract) =>
      requests.some((request) =>
        list(request.maidReferences as string[] | undefined).includes(text(contract.maidReferenceCode)),
      ),
    ),
    messages: list(data.requestMessages)
      .filter((message) => conversationIds.has(message.conversationId))
      .slice(-30),
    notifications: list(data.chatMessages)
      .filter((message) => message.clientId === actor.clientId)
      .slice(-30),
  };
};

const getAgencyContext = (data: AppDataLike, actor: AiActorContext) => {
  const agencyId = actor.agencyId;
  // Strip large base64 blob fields before passing to the LLM — they serve no purpose
  // in text generation and can exhaust the context window or hit API payload limits.
  const companyProfileForAI = Object.fromEntries(
    Object.entries((data.companyProfile ?? {}) as Record<string, unknown>).filter(([k]) => !BLOB_KEYS.has(k)),
  );
  return {
    agency: {
      id: agencyId,
      name: actor.agencyName,
      companyProfile: companyProfileForAI,
    },
    requests: list(data.requests).filter((item) => item.agencyId === agencyId).slice(-80),
    enquiries: list(data.enquiries).slice(-80),
    maids: list(data.maids).filter((item) => item.agencyId === agencyId).slice(-80).map(compactMaid),
    messages: list(data.chatMessages).filter((item) => item.agencyId === agencyId).slice(-80),
    contracts: list(data.employmentContracts).filter((item) => item.agencyId === agencyId).slice(-50),
    applications: list(data.ats?.applications).filter((item) => item.agencyId === agencyId).slice(-50),
  };
};

const screenApplication = (data: AppDataLike, actor: AiActorContext, input: Record<string, unknown>) => {
  const applicationId = text(input.applicationId);
  const applications = list(data.ats?.applications).filter((item) =>
    actor.agencyId ? item.agencyId === actor.agencyId : true,
  );
  const application = applicationId
    ? applications.find((item) => item.id === applicationId || item.applicationCode === applicationId)
    : applications[0];
  if (!application) return { error: "Application not found in authorized scope." };

  const profile = list(data.ats?.profiles).find((item) => item.applicationId === application.id);
  const docs = data.ats?.documents?.[text(application.id)] ?? [];
  const requiredDocs = ["resume", "passport", "medical", "certificate"];
  const missingDocuments = requiredDocs.filter(
    (kind) => !docs.some((doc) => doc.type === kind && doc.status !== "missing"),
  );
  const requiredProfileFields = [
    "fullName",
    "email",
    "nationality",
    "contactNumber",
    "yearsOfExperience",
    "availableDate",
    "expectedSalary",
  ];
  const missingFields = requiredProfileFields.filter((field) => !profile?.[field]);
  const score = Math.max(0, 100 - missingDocuments.length * 12 - missingFields.length * 8);

  return {
    application,
    profile,
    documents: docs,
    deterministicScreening: {
      readinessScore: score,
      missingDocuments,
      missingFields,
    },
  };
};

const buildAnalytics = (data: AppDataLike, actor: AiActorContext) => {
  const agencyId = actor.role === "admin" ? undefined : actor.agencyId;
  const requests = list(data.requests).filter((item) => !agencyId || item.agencyId === agencyId);
  const maids = list(data.maids).filter((item) => !agencyId || item.agencyId === agencyId);
  const contracts = list(data.employmentContracts).filter((item) => !agencyId || item.agencyId === agencyId);
  const enquiries = list(data.enquiries);
  const applications = list(data.ats?.applications).filter((item) => !agencyId || item.agencyId === agencyId);
  const unansweredEnquiries = enquiries.slice(-50);
  const inactiveMaids = maids.filter((maid) => {
    const updatedAt = Date.parse(text(maid.updatedAt));
    return Number.isFinite(updatedAt) && Date.now() - updatedAt > 1000 * 60 * 60 * 24 * 60;
  });

  return {
    counts: {
      agencies: new Set(maids.map((maid) => maid.agencyId)).size,
      maids: maids.length,
      publicMaids: maids.filter((maid) => maid.isPublic).length,
      requests: requests.length,
      pendingRequests: requests.filter((request) => request.status === "pending").length,
      contracts: contracts.length,
      enquiries: enquiries.length,
      applications: applications.length,
    },
    bottlenecks: {
      pendingRequests: requests.filter((request) => request.status === "pending").slice(-20),
      inactiveMaids: inactiveMaids.slice(0, 20).map(compactMaid),
      unansweredEnquiries,
    },
  };
};

export const runAgentTools = (context: AiToolContext) => {
  const { agentId, input, actor, data } = context;

  if (agentId === "receptionist") {
    const profile = (data.companyProfile ?? {}) as Record<string, unknown>;
    const phoneRaw = text(profile.contact_phone);
    const whatsappRaw = text(profile.social_whatsapp_number);
    // Prefer the dedicated WhatsApp number; fall back to phone when absent.
    const linkE164 = toE164(whatsappRaw || phoneRaw);
    const contactInfo = {
      contactPerson: text(profile.contact_person),
      phone: phoneRaw,
      email: text(profile.contact_email),
      whatsapp: whatsappRaw,
      // Pre-built wa.me deep link — use this directly in chat responses.
      whatsappLink: linkE164 ? `https://wa.me/${linkE164}` : "",
      officeHours: text(profile.office_hours_regular),
      officeHoursOther: text(profile.office_hours_other),
      address: [text(profile.address_line1), text(profile.address_line2), text(profile.postal_code)]
        .filter(Boolean)
        .join(", "),
      website: text(profile.contact_website),
      facebook: text(profile.social_facebook),
      licenseNo: text(profile.license_no),
      aboutUs: text(profile.about_us),
    };
    const allPublicMaids = list(data.maids).filter((maid) => maid.isPublic);

    const agencyHighlights = {
      agencyName: text(profile.company_name),
      shortName: text(profile.short_name),
      licenseNo: text(profile.license_no),
      aboutUs: text(profile.about_us),
      totalPublicHelpers: allPublicMaids.length,
      availableHelpers: allPublicMaids.filter((m) => lower(text(m.status)).includes("available")).length,
      transferHelpers: allPublicMaids.filter((m) => lower(text(m.type)).includes("transfer")).length,
      nationalitiesOffered: [...new Set(allPublicMaids.map((m) => text(m.nationality)).filter(Boolean))],
      recentTestimonials: list(data.testimonials)
        .slice(-3)
        .map((t) => {
          const r = t as Record<string, unknown>;
          return {
            from: text(r.author ?? r.client_name ?? r.clientName ?? r.name),
            review: text(r.message ?? r.content ?? r.text),
          };
        })
        .filter((t) => t.review),
    };

    const msgForNat = lower(text(input.message))
      .replace(/\bfilipina\b/g, "filipino")
      .replace(/\bphilippines?\b/g, "filipino")
      .replace(/\bburmese\b/g, "myanmar");
    const NATIONALITY_KEYS = ["filipino", "indonesian", "myanmar", "indian", "bangladeshi", "sri lankan"];
    const requestedNat = NATIONALITY_KEYS.find((n) => msgForNat.includes(n));
    const maidPool = requestedNat
      ? allPublicMaids.filter((m) => lower(text(m.nationality)).includes(requestedNat))
      : allPublicMaids;
    return {
      contactInfo,
      momPersonnel: list(data.momPersonnel).map((p) => ({
        name: text(p.name),
        registrationNumber: text(p.registration_number),
      })),
      testimonials: list(data.testimonials).slice(-10),
      publicMaids: (maidPool.length > 0 ? maidPool : allPublicMaids)
        .sort((a, b) => maidTier(a) - maidTier(b))
        .slice(0, 30)
        .map(compactPublicMaid),
      publicFaqs: buildPublicFaqs(profile),
      platformGuide: buildPlatformGuide(input),
      agencyHighlights,
    };
  }

  if (agentId === "maid_recommendation") {
    const semanticRefs = Array.isArray(input.semanticReferences)
      ? (input.semanticReferences as string[])
      : [];

    const rankedMatches = list(data.maids)
      .filter((maid) => maid.isPublic)
      .map((maid) => {
        const base = scoreMaid(maid, input);
        // Boost score by semantic similarity rank: top match +20, diminishing by 2 per rank.
        const semRank = semanticRefs.indexOf(text(maid.referenceCode));
        const semBoost = semRank >= 0 ? Math.max(0, 20 - semRank * 2) : 0;
        return { ...base, score: Math.min(100, base.score + semBoost) };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);

    return {
      rankedMatches,
      preferences: input,
      semanticSearchUsed: semanticRefs.length > 0,
    };
  }

  if (agentId === "employer_support") {
    return getEmployerContext(data, actor);
  }

  if (agentId === "agency_assistant" || agentId === "content_generator") {
    return getAgencyContext(data, actor);
  }

  if (agentId === "applicant_screening") {
    return screenApplication(data, actor, input);
  }

  return buildAnalytics(data, actor);
};
