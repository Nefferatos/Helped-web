/**
 * Agency portal report sections.
 *
 * Every distinct data category surfaced by the agency portal gets its OWN
 * Google Sheet tab — nothing is ever blended into a shared sheet. Each section
 * declares its tab title, its own header row, and a row mapper that reads only
 * that category's records.
 *
 * Agency scoping: a section filters by the signed-in admin's `agencyId`
 * whenever its records carry an `agencyId`. Categories that have no
 * `agencyId` on the record (company profile, MOM personnel, testimonials,
 * employers, employment contracts, direct sales) are agency-wide by nature and
 * are exported as-is, matching how the existing admin endpoints behave.
 *
 * Secrets are never exported: passwords, password hashes, session tokens,
 * verification code hashes and TikTok access/refresh tokens are excluded.
 */

import type { GoogleSheetValues } from "./googleSheets";

export type AgencyReportRow = Array<string | number | boolean | null>;

export type AgencyReportContext = {
  data: AgencyReportData;
  agencyId: number;
};

export type AgencyReportSection = {
  /** Stable identifier used by the per-section include/exclude config. */
  id: string;
  /** Google Sheet tab title. */
  title: string;
  /** UI grouping label. */
  group: string;
  /** Short human description shown on the Reports page. */
  description: string;
  /** Column headers for this tab only. */
  headers: string[];
  build: (context: AgencyReportContext) => AgencyReportRow[];
};

/* ─── Loose structural view of the app-data blob ──────────────────────────── */

type LooseRecord = Record<string, unknown>;

export type AgencyReportData = {
  companyProfile?: LooseRecord;
  momPersonnel?: LooseRecord[];
  testimonials?: LooseRecord[];
  maids?: LooseRecord[];
  enquiries?: LooseRecord[];
  clients?: LooseRecord[];
  directSales?: LooseRecord[];
  requests?: LooseRecord[];
  requestConversations?: LooseRecord[];
  requestMessages?: LooseRecord[];
  chatMessages?: LooseRecord[];
  employers?: LooseRecord[];
  employmentContracts?: LooseRecord[];
  agencyAdmins?: LooseRecord[];
  tiktokIntegration?: LooseRecord;
  ats?: {
    applications?: LooseRecord[];
    profiles?: LooseRecord[];
    scores?: Record<string, LooseRecord>;
    history?: Record<string, LooseRecord[]>;
    documents?: Record<string, LooseRecord[]>;
    notifications?: Record<string, LooseRecord[]>;
    presets?: LooseRecord[];
  };
};

/* ─── Value coercion helpers ──────────────────────────────────────────────── */

const str = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value) ?? "";
  } catch {
    return String(value);
  }
};

const num = (value: unknown): number | "" => {
  if (value === null || value === undefined || value === "") return "";
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : "";
};

const bool = (value: unknown): boolean => Boolean(value);

/** Arrays become readable comma lists; objects become compact JSON. */
const list = (value: unknown): string => {
  if (Array.isArray(value)) {
    return value
      .map((item) =>
        item !== null && typeof item === "object"
          ? str(Object.values(item as LooseRecord).filter(Boolean).join(" "))
          : str(item),
      )
      .filter(Boolean)
      .join(", ");
  }
  if (value && typeof value === "object") return str(value);
  return str(value);
};

const recordId = (record: LooseRecord): string => str(record.id ?? "");

/** Reads `agencyId` defensively — some records predate the field. */
const agencyIdOf = (record: LooseRecord): number => {
  const parsed = Number(record.agencyId);
  return Number.isInteger(parsed) ? parsed : 0;
};

const scopedToAgency = (records: LooseRecord[], agencyId: number) =>
  records.filter((record) => agencyIdOf(record) === agencyId);

const sortByCreatedDesc = (records: LooseRecord[]) =>
  [...records].sort(
    (left, right) =>
      new Date(str(right.createdAt)).getTime() -
      new Date(str(left.createdAt)).getTime(),
  );

/* ─── Section definitions ─────────────────────────────────────────────────── */

/**
 * One section per data category. Order controls the left-to-right tab order in
 * the generated spreadsheet.
 */
export const AGENCY_REPORT_SECTIONS: AgencyReportSection[] = [
  /* ── Agency Profile ──────────────────────────────────────────────────── */
  {
    id: "companyProfile",
    title: "Agency Profile",
    group: "Agency Profile",
    description: "Company registration, contact, branding and social details.",
    headers: [
      "Company Name",
      "Short Name",
      "License No",
      "Address Line 1",
      "Address Line 2",
      "Postal Code",
      "Country",
      "Contact Person",
      "Contact Phone",
      "Contact Email",
      "Contact Fax",
      "Website",
      "Office Hours (Regular)",
      "Office Hours (Other)",
      "Facebook",
      "WhatsApp Number",
      "WhatsApp Message",
      "Theme Colour",
      "Button Colour",
      "About Us",
      "Gallery Images",
      "Has Logo",
      "Has Intro Video",
      "Updated At",
    ],
    build: ({ data }) => {
      const profile = data.companyProfile ?? {};
      return [
        [
          str(profile.company_name),
          str(profile.short_name),
          str(profile.license_no),
          str(profile.address_line1),
          str(profile.address_line2),
          str(profile.postal_code),
          str(profile.country),
          str(profile.contact_person),
          str(profile.contact_phone),
          str(profile.contact_email),
          str(profile.contact_fax),
          str(profile.contact_website),
          str(profile.office_hours_regular),
          str(profile.office_hours_other),
          str(profile.social_facebook),
          str(profile.social_whatsapp_number),
          str(profile.social_whatsapp_message),
          str(profile.branding_theme_color),
          str(profile.branding_button_color),
          str(profile.about_us),
          num(Array.isArray(profile.gallery_image_data_urls) ? profile.gallery_image_data_urls.length : 0),
          bool(profile.logo_data_url),
          bool(profile.intro_video_data_url),
          str(profile.updated_at),
        ],
      ];
    },
  },
  {
    id: "momPersonnel",
    title: "MOM Personnel",
    group: "Agency Profile",
    description: "MOM-registered personnel and their registration numbers.",
    headers: ["ID", "Company ID", "Name", "Registration Number", "Created At"],
    build: ({ data }) =>
      (data.momPersonnel ?? []).map((item) => [
        num(item.id),
        num(item.company_id),
        str(item.name),
        str(item.registration_number),
        str(item.created_at),
      ]),
  },
  {
    id: "testimonials",
    title: "Testimonials",
    group: "Agency Profile",
    description: "Client testimonials shown on the agency micro-site.",
    headers: ["ID", "Company ID", "Author", "Message", "Created At"],
    build: ({ data }) =>
      (data.testimonials ?? []).map((item) => [
        num(item.id),
        num(item.company_id),
        str(item.author),
        str(item.message),
        str(item.created_at),
      ]),
  },
  {
    id: "agencyAdmins",
    title: "Agency Staff Accounts",
    group: "Agency Profile",
    description:
      "Portal login accounts for this agency. Passwords and hashes are never exported.",
    headers: [
      "ID",
      "Agency ID",
      "Username",
      "Email",
      "Agency Name",
      "Email Verified",
      "Has Profile Image",
      "Created At",
    ],
    build: ({ data, agencyId }) =>
      scopedToAgency(data.agencyAdmins ?? [], agencyId)
        .slice()
        .sort((left, right) => Number(num(right.id)) - Number(num(left.id)))
        .map((item) => [
          num(item.id),
          num(item.agencyId),
          str(item.username),
          str(item.email),
          str(item.agencyName),
          bool(item.emailVerified),
          bool(item.profileImageUrl),
          str(item.createdAt),
        ]),
  },

  /* ── Maids ───────────────────────────────────────────────────────────── */
  {
    id: "maids",
    title: "Maids",
    group: "Maids",
    description: "Helper profiles published by this agency (scoped by agency).",
    headers: [
      "Reference Code",
      "Full Name",
      "Agency ID",
      "Status",
      "Type",
      "Nationality",
      "Date Of Birth",
      "Place Of Birth",
      "Height (cm)",
      "Weight (kg)",
      "Religion",
      "Marital Status",
      "Number Of Children",
      "Number Of Siblings",
      "Home Address",
      "Airport Repatriation",
      "Education Level",
      "Language Skills",
      "Skills Preferences",
      "Work Areas",
      "Employment History",
      "Introduction",
      "Agency Contact",
      "Is Public",
      "Has Photo",
      "Photo Count",
      "Has Video",
      "Created At",
      "Updated At",
    ],
    build: ({ data, agencyId }) =>
      scopedToAgency(data.maids ?? [], agencyId)
        .slice()
        .sort(
          (left, right) =>
            new Date(str(right.updatedAt)).getTime() -
            new Date(str(left.updatedAt)).getTime(),
        )
        .map((maid) => [
          str(maid.referenceCode),
          str(maid.fullName),
          num(maid.agencyId),
          str(maid.status),
          str(maid.type),
          str(maid.nationality),
          str(maid.dateOfBirth),
          str(maid.placeOfBirth),
          num(maid.height),
          num(maid.weight),
          str(maid.religion),
          str(maid.maritalStatus),
          num(maid.numberOfChildren),
          num(maid.numberOfSiblings),
          str(maid.homeAddress),
          str(maid.airportRepatriation),
          str(maid.educationLevel),
          list(maid.languageSkills),
          list(maid.skillsPreferences),
          list(maid.workAreas),
          list(maid.employmentHistory),
          list(maid.introduction),
          list(maid.agencyContact),
          bool(maid.isPublic),
          bool(maid.hasPhoto || maid.photoDataUrl),
          num(Array.isArray(maid.photoDataUrls) ? maid.photoDataUrls.length : 0),
          bool(maid.videoDataUrl),
          str(maid.createdAt),
          str(maid.updatedAt),
        ]),
  },

  /* ── Enquiries ───────────────────────────────────────────────────────── */
  {
    id: "enquiries",
    title: "Enquiries",
    group: "Leads",
    description:
      "Public enquiries received by this agency. Enquiry records carry an optional agencyId; unassigned enquiries are included so the inbox matches the portal.",
    headers: [
      "ID",
      "Agency ID",
      "Name",
      "Enquiry Date",
      "Email",
      "Phone",
      "Message",
      "Status",
      "Assigned To",
      "Internal Note",
      "Matched Client ID",
      "Matched Client Name",
      "Viewed At",
      "Created At",
    ],
    build: ({ data, agencyId }) => {
      const enquiries = (data.enquiries ?? []).filter(
        (enquiry) => !enquiry.agencyId || agencyIdOf(enquiry) === agencyId,
      );
      const clients = data.clients ?? [];

      return sortByCreatedDesc(enquiries).map((enquiry) => {
        // Mirrors enrichEnquiryWithClient: match by exact email or normalized phone.
        const enquiryEmail = str(enquiry.email).trim().toLowerCase();
        const enquiryPhone = str(enquiry.phone).replace(/\D+/g, "").replace(/^0+/, "");
        const matched = clients.find((client) => {
          const clientEmail = str(client.email).trim().toLowerCase();
          const clientPhone = str(client.phone).replace(/\D+/g, "").replace(/^0+/, "");
          if (clientEmail && enquiryEmail && clientEmail === enquiryEmail) return true;
          if (clientPhone && enquiryPhone && clientPhone === enquiryPhone) return true;
          return false;
        });

        return [
          num(enquiry.id),
          num(enquiry.agencyId),
          str(enquiry.username),
          str(enquiry.date),
          str(enquiry.email),
          str(enquiry.phone),
          str(enquiry.message),
          str(enquiry.status),
          str(enquiry.assignedTo),
          str(enquiry.note),
          matched ? num(matched.id) : "",
          matched ? str(matched.name) : "",
          str(enquiry.viewedAt),
          str(enquiry.createdAt),
        ];
      });
    },
  },
  {
    id: "clients",
    title: "Clients",
    group: "Leads",
    description:
      "Registered employer accounts. Passwords and verification hashes are never exported.",
    headers: [
      "ID",
      "Name",
      "Company",
      "Email",
      "Phone",
      "Email Verified",
      "Has Profile Image",
      "Linked Supabase User",
      "Created At",
    ],
    build: ({ data }) =>
      sortByCreatedDesc(data.clients ?? []).map((client) => [
        num(client.id),
        str(client.name),
        str(client.company),
        str(client.email),
        str(client.phone),
        bool(client.emailVerified),
        bool(client.profileImageUrl),
        bool(client.supabaseUserId),
        str(client.createdAt),
      ]),
  },
  {
    id: "directSales",
    title: "Direct Sales",
    group: "Leads",
    description: "Direct-sale leads raised against specific helper profiles.",
    headers: [
      "ID",
      "Maid Reference Code",
      "Maid Name",
      "Client ID",
      "Client Name",
      "Client Email",
      "Client Phone",
      "Status",
      "Request Details",
      "Created At",
    ],
    build: ({ data }) =>
      sortByCreatedDesc(data.directSales ?? []).map((sale) => [
        num(sale.id),
        str(sale.maidReferenceCode),
        str(sale.maidName),
        num(sale.clientId),
        str(sale.clientName),
        str(sale.clientEmail),
        str(sale.clientPhone),
        str(sale.status),
        list(sale.requestDetails),
        str(sale.createdAt),
      ]),
  },


  /* ── Requests ────────────────────────────────────────────────────────── */
  {
    id: "requests",
    title: "Requests",
    group: "Requests",
    description: "Hiring requests raised for this agency (scoped by agency).",
    headers: [
      "Request ID",
      "Agency ID",
      "Client ID",
      "Client Name",
      "Type",
      "Status",
      "Maid References",
      "Details",
      "Updated By",
      "Created At",
      "Updated At",
    ],
    build: ({ data, agencyId }) => {
      const clients = data.clients ?? [];
      const clientNameById = new Map(
        clients.map((client) => [Number(client.id), str(client.name)] as const),
      );

      return scopedToAgency(data.requests ?? [], agencyId)
        .slice()
        .sort(
          (left, right) =>
            new Date(str(right.updatedAt)).getTime() -
            new Date(str(left.updatedAt)).getTime(),
        )
        .map((request) => [
          recordId(request),
          num(request.agencyId),
          num(request.clientId),
          clientNameById.get(Number(request.clientId)) ?? "",
          str(request.type),
          str(request.status),
          list(request.maidReferences),
          list(request.details),
          str(request.updatedBy),
          str(request.createdAt),
          str(request.updatedAt),
        ]);
    },
  },
  {
    id: "requestConversations",
    title: "Request Conversations",
    group: "Requests",
    description:
      "Conversation threads attached to this agency's requests (scoped by agency).",
    headers: [
      "Conversation ID",
      "Request ID",
      "Agency ID",
      "Client ID",
      "Message Count",
      "Created At",
    ],
    build: ({ data, agencyId }) => {
      const messages = data.requestMessages ?? [];
      const messageCountByConversation = new Map<string, number>();
      for (const message of messages) {
        const key = str(message.conversationId);
        messageCountByConversation.set(
          key,
          (messageCountByConversation.get(key) ?? 0) + 1,
        );
      }

      return scopedToAgency(data.requestConversations ?? [], agencyId)
        .slice()
        .sort(
          (left, right) =>
            new Date(str(right.createdAt)).getTime() -
            new Date(str(left.createdAt)).getTime(),
        )
        .map((conversation) => [
          recordId(conversation),
          str(conversation.requestId),
          num(conversation.agencyId),
          num(conversation.clientId),
          num(messageCountByConversation.get(recordId(conversation)) ?? 0),
          str(conversation.createdAt),
        ]);
    },
  },
  {
    id: "requestMessages",
    title: "Request Messages",
    group: "Requests",
    description:
      "Individual messages exchanged within this agency's request conversations (scoped by agency).",
    headers: [
      "Message ID",
      "Conversation ID",
      "Sender Type",
      "Sender ID",
      "Message",
      "Attachment Count",
      "Created At",
    ],
    build: ({ data, agencyId }) => {
      // Messages carry no agencyId; scope them through their conversation.
      const agencyConversationIds = new Set(
        scopedToAgency(data.requestConversations ?? [], agencyId).map(
          (conversation) => recordId(conversation),
        ),
      );

      return (data.requestMessages ?? [])
        .filter((message) =>
          agencyConversationIds.has(str(message.conversationId)),
        )
        .slice()
        .sort(
          (left, right) =>
            new Date(str(right.createdAt)).getTime() -
            new Date(str(left.createdAt)).getTime(),
        )
        .map((message) => [
          recordId(message),
          str(message.conversationId),
          str(message.senderType),
          num(message.senderId),
          str(message.message),
          num(Array.isArray(message.attachments) ? message.attachments.length : 0),
          str(message.createdAt),
        ]);
    },
  },


  /* ── Messages ────────────────────────────────────────────────────────── */
  {
    id: "chatMessages",
    title: "Chat Messages",
    group: "Messages",
    description:
      "Support-chat messages between employers and this agency (scoped by agency).",
    headers: [
      "ID",
      "Agency ID",
      "Agency Name",
      "Client ID",
      "Client Name",
      "Conversation Type",
      "Sender Role",
      "Sender Name",
      "Message",
      "Is Bot",
      "Read By Agency",
      "Read By Client",
      "Created At",
    ],
    build: ({ data, agencyId }) => {
      const clients = data.clients ?? [];
      const clientNameById = new Map(
        clients.map((client) => [Number(client.id), str(client.name)] as const),
      );

      // Agency-scoped threads; unscoped legacy messages are kept so the tab
      // matches what the Messages inbox shows.
      return (data.chatMessages ?? [])
        .filter(
          (message) =>
            message.conversationType === "agency"
              ? !message.agencyId || agencyIdOf(message) === agencyId
              : true,
        )
        .slice()
        .sort(
          (left, right) =>
            new Date(str(right.createdAt)).getTime() -
            new Date(str(left.createdAt)).getTime(),
        )
        .map((message) => [
          num(message.id),
          num(message.agencyId),
          str(message.agencyName),
          num(message.clientId),
          clientNameById.get(Number(message.clientId)) ?? "",
          str(message.conversationType),
          str(message.senderRole),
          str(message.senderName),
          str(message.message),
          bool(message.isBot),
          bool(message.readByAgency),
          bool(message.readByClient),
          str(message.createdAt),
        ]);
    },
  },

  /* ── Contracts ───────────────────────────────────────────────────────── */
  {
    id: "employers",
    title: "Employers",
    group: "Contracts",
    description: "Employer records captured for MOM/contract documents.",
    headers: [
      "ID",
      "Ref Code",
      "Employer Name",
      "Employer NRIC/Fin",
      "Spouse Name",
      "Family Member Count",
      "Document Count",
      "Created At",
      "Updated At",
    ],
    build: ({ data }) =>
      sortByCreatedDesc(data.employers ?? []).map((employer) => {
        const employerDetails = (employer.employer ?? {}) as LooseRecord;
        const spouse = (employer.spouse ?? {}) as LooseRecord;
        return [
          num(employer.id),
          str(employer.refCode),
          str(employerDetails.name ?? employerDetails.fullName),
          str(employerDetails.nric ?? employerDetails.nricFin ?? employerDetails.fin),
          str(spouse.name ?? spouse.fullName),
          num(Array.isArray(employer.familyMembers) ? employer.familyMembers.length : 0),
          num(Array.isArray(employer.documents) ? employer.documents.length : 0),
          str(employer.createdAt),
          str(employer.updatedAt),
        ];
      }),
  },
  {
    id: "employmentContracts",
    title: "Employment Contracts",
    group: "Contracts",
    description: "Signed employment contracts with fees and case references.",
    headers: [
      "ID",
      "Ref Code",
      "Employer Ref Code",
      "Employer ID",
      "Maid ID",
      "Maid Reference Code",
      "Maid Name",
      "Employer Name",
      "Case Reference Number",
      "Contract Date",
      "Service Fee",
      "Placement Fee",
      "Agency Witness",
      "Created At",
      "Updated At",
    ],
    build: ({ data }) =>
      sortByCreatedDesc(data.employmentContracts ?? []).map((contract) => [
        num(contract.id),
        str(contract.refCode),
        str(contract.employerRefCode),
        contract.employerId === null ? "" : num(contract.employerId),
        contract.maidId === null ? "" : num(contract.maidId),
        str(contract.maidReferenceCode),
        str(contract.maidName),
        str(contract.employerName),
        str(contract.caseReferenceNumber),
        str(contract.contractDate),
        str(contract.serviceFee),
        str(contract.placementFee),
        str(contract.agencyWitness),
        str(contract.createdAt),
        str(contract.updatedAt),
      ]),
  },


  /* ── Applicants (ATS) ────────────────────────────────────────────────── */
  {
    id: "atsApplications",
    title: "ATS Applications",
    group: "Applicants",
    description:
      "Recruitment applications for this agency (scoped by agency). Applicant access tokens are never exported.",
    headers: [
      "Application ID",
      "Agency ID",
      "Application Code",
      "Profile ID",
      "Applicant Name",
      "Stage",
      "Source",
      "Qualification Score",
      "Score Category",
      "AI Parse Summary",
      "Notification Count",
      "Viewed At",
      "Applied At",
      "Updated At",
    ],
    build: ({ data, agencyId }) => {
      const ats = data.ats ?? {};
      const profilesByApplicationId = new Map(
        (ats.profiles ?? []).map(
          (profile) => [str(profile.applicationId), profile] as const,
        ),
      );
      const scores = ats.scores ?? {};
      const notifications = ats.notifications ?? {};

      return scopedToAgency(ats.applications ?? [], agencyId)
        .slice()
        .sort(
          (left, right) =>
            new Date(str(right.appliedAt)).getTime() -
            new Date(str(left.appliedAt)).getTime(),
        )
        .map((application) => {
          const applicationId = recordId(application);
          const profile = profilesByApplicationId.get(applicationId) ?? {};
          const score = scores[applicationId] ?? {};
          return [
            applicationId,
            num(application.agencyId),
            str(application.applicationCode),
            str(application.profileId),
            str(profile.fullName),
            str(application.status),
            str(application.source),
            num(score.score),
            str(score.category),
            str(application.aiParseSummary),
            num(
              Array.isArray(application.notificationLogIds)
                ? application.notificationLogIds.length
                : 0,
            ),
            str(application.viewedAt),
            str(application.appliedAt),
            str(application.updatedAt),
          ];
        });
    },
  },
  {
    id: "atsProfiles",
    title: "ATS Applicant Profiles",
    group: "Applicants",
    description:
      "Full biodata profiles captured for this agency's applicants (scoped by agency).",
    headers: [
      "Profile ID",
      "Application ID",
      "Full Name",
      "Email",
      "WhatsApp Number",
      "Nationality",
      "Date Of Birth",
      "Age",
      "Gender",
      "Marital Status",
      "Contact Number",
      "Address",
      "Years Of Experience",
      "Countries Worked In",
      "Childcare Exp (yrs)",
      "Newborn Care Exp (yrs)",
      "Elderly Care Exp (yrs)",
      "Disabled Care Exp (yrs)",
      "Housekeeping Exp (yrs)",
      "Pet Care Exp (yrs)",
      "Cooking Skills",
      "Language Skills",
      "Certifications",
      "Training Records",
      "Available Date",
      "Expected Salary",
      "Employment Preference",
      "Cover Note",
      "Strengths Tags",
      "Weaknesses Tags",
      "Client Match Score",
      "Created At",
      "Updated At",
    ],
    build: ({ data, agencyId }) => {
      const ats = data.ats ?? {};
      const agencyApplicationIds = new Set(
        scopedToAgency(ats.applications ?? [], agencyId).map((app) =>
          recordId(app),
        ),
      );

      return (ats.profiles ?? [])
        .filter((profile) =>
          agencyApplicationIds.has(str(profile.applicationId)),
        )
        .slice()
        .sort(
          (left, right) =>
            new Date(str(right.updatedAt)).getTime() -
            new Date(str(left.updatedAt)).getTime(),
        )
        .map((profile) => [
          recordId(profile),
          str(profile.applicationId),
          str(profile.fullName),
          str(profile.email),
          str(profile.whatsappNumber),
          str(profile.nationality),
          str(profile.dateOfBirth),
          profile.age === null ? "" : num(profile.age),
          str(profile.gender),
          str(profile.maritalStatus),
          str(profile.contactNumber),
          str(profile.address),
          num(profile.yearsOfExperience),
          list(profile.previousCountriesWorkedIn),
          num(profile.childcareExperience),
          num(profile.newbornCareExperience),
          num(profile.elderlyCareExperience),
          num(profile.disabledCareExperience),
          num(profile.housekeepingExperience),
          num(profile.petCareExperience),
          list(profile.cookingSkills),
          list(profile.languageSkills),
          list(profile.certifications),
          list(profile.trainingRecords),
          str(profile.availableDate),
          profile.expectedSalary === null ? "" : num(profile.expectedSalary),
          str(profile.employmentPreference),
          str(profile.coverNote),
          list(profile.strengthsTags),
          list(profile.weaknessesTags),
          num(profile.clientMatchScore),
          str(profile.createdAt),
          str(profile.updatedAt),
        ]);
    },
  },

  {
    id: "atsScores",
    title: "ATS Scores",
    group: "Applicants",
    description:
      "AI qualification scoring breakdown per applicant for this agency (scoped by agency).",
    headers: [
      "Application ID",
      "Applicant Name",
      "Score",
      "Category",
      "Explanation",
      "Experience Factor",
      "Skill Match Factor",
      "Certifications Factor",
      "References Factor",
      "Language Skills Factor",
      "Interview Rating Factor",
      "Strengths",
      "Weaknesses",
    ],
    build: ({ data, agencyId }) => {
      const ats = data.ats ?? {};
      const scores = ats.scores ?? {};
      const applicationsByApplicationId = new Map(
        (ats.applications ?? []).map(
          (application) => [recordId(application), application] as const,
        ),
      );
      const profilesByApplicationId = new Map(
        (ats.profiles ?? []).map(
          (profile) => [str(profile.applicationId), profile] as const,
        ),
      );

      return Object.entries(scores)
        .filter(([applicationId]) => {
          const application = applicationsByApplicationId.get(applicationId);
          return application ? agencyIdOf(application) === agencyId : false;
        })
        .map(([applicationId, score]) => {
          const factors = (score.factors ?? {}) as LooseRecord;
          return [
            applicationId,
            str(profilesByApplicationId.get(applicationId)?.fullName),
            num(score.score),
            str(score.category),
            str(score.explanation),
            num(factors.experience),
            num(factors.skillMatch),
            num(factors.certifications),
            num(factors.references),
            num(factors.languageSkills),
            num(factors.interviewRating),
            list(score.strengths),
            list(score.weaknesses),
          ] as AgencyReportRow;
        });
    },
  },
  {
    id: "atsHistory",
    title: "ATS Stage History",
    group: "Applicants",
    description:
      "Stage-change audit trail for this agency's applicants (scoped by agency).",
    headers: [
      "History ID",
      "Application ID",
      "Applicant Name",
      "From Stage",
      "To Stage",
      "Actor",
      "Reason",
      "Created At",
    ],
    build: ({ data, agencyId }) => {
      const ats = data.ats ?? {};
      const history = ats.history ?? {};
      const applicationsByApplicationId = new Map(
        (ats.applications ?? []).map(
          (application) => [recordId(application), application] as const,
        ),
      );
      const profilesByApplicationId = new Map(
        (ats.profiles ?? []).map(
          (profile) => [str(profile.applicationId), profile] as const,
        ),
      );

      const rows: AgencyReportRow[] = [];
      for (const [applicationId, entries] of Object.entries(history)) {
        const application = applicationsByApplicationId.get(applicationId);
        if (!application || agencyIdOf(application) !== agencyId) continue;

        for (const entry of entries ?? []) {
          rows.push([
            recordId(entry),
            applicationId,
            str(profilesByApplicationId.get(applicationId)?.fullName),
            str(entry.fromStage),
            str(entry.toStage),
            str(entry.actor),
            str(entry.reason),
            str(entry.createdAt),
          ]);
        }
      }

      return rows.sort(
        (left, right) =>
          new Date(str(right[7])).getTime() - new Date(str(left[7])).getTime(),
      );
    },
  },

  {
    id: "atsDocuments",
    title: "ATS Documents",
    group: "Applicants",
    description:
      "Uploaded applicant documents and their verification status for this agency (scoped by agency).",
    headers: [
      "Document ID",
      "Application ID",
      "Applicant Name",
      "Document Type",
      "File Name",
      "File Type",
      "Size (bytes)",
      "Required",
      "Status",
      "Uploaded At",
      "URL",
    ],
    build: ({ data, agencyId }) => {
      const ats = data.ats ?? {};
      const documents = ats.documents ?? {};
      const applicationsByApplicationId = new Map(
        (ats.applications ?? []).map(
          (application) => [recordId(application), application] as const,
        ),
      );
      const profilesByApplicationId = new Map(
        (ats.profiles ?? []).map(
          (profile) => [str(profile.applicationId), profile] as const,
        ),
      );

      const rows: AgencyReportRow[] = [];
      for (const [applicationId, entries] of Object.entries(documents)) {
        const application = applicationsByApplicationId.get(applicationId);
        if (!application || agencyIdOf(application) !== agencyId) continue;

        for (const document of entries ?? []) {
          rows.push([
            recordId(document),
            applicationId,
            str(profilesByApplicationId.get(applicationId)?.fullName),
            str(document.type),
            str(document.name),
            str(document.fileType),
            num(document.size),
            bool(document.required),
            str(document.status),
            str(document.uploadedAt),
            str(document.url),
          ]);
        }
      }

      return rows.sort(
        (left, right) =>
          new Date(str(right[9])).getTime() - new Date(str(left[9])).getTime(),
      );
    },
  },
  {
    id: "atsNotifications",
    title: "ATS Notifications",
    group: "Applicants",
    description:
      "Applicant notification log (email/WhatsApp/internal) for this agency (scoped by agency).",
    headers: [
      "Notification ID",
      "Application ID",
      "Applicant Name",
      "Event",
      "Channel",
      "Message",
      "Created At",
    ],
    build: ({ data, agencyId }) => {
      const ats = data.ats ?? {};
      const notifications = ats.notifications ?? {};
      const applicationsByApplicationId = new Map(
        (ats.applications ?? []).map(
          (application) => [recordId(application), application] as const,
        ),
      );
      const profilesByApplicationId = new Map(
        (ats.profiles ?? []).map(
          (profile) => [str(profile.applicationId), profile] as const,
        ),
      );

      const rows: AgencyReportRow[] = [];
      for (const [applicationId, entries] of Object.entries(notifications)) {
        const application = applicationsByApplicationId.get(applicationId);
        if (!application || agencyIdOf(application) !== agencyId) continue;

        for (const notification of entries ?? []) {
          rows.push([
            recordId(notification),
            applicationId,
            str(profilesByApplicationId.get(applicationId)?.fullName),
            str(notification.event),
            str(notification.channel),
            str(notification.message),
            str(notification.createdAt),
          ]);
        }
      }

      return rows.sort(
        (left, right) =>
          new Date(str(right[6])).getTime() - new Date(str(left[6])).getTime(),
      );
    },
  },
  {
    id: "atsPresets",
    title: "ATS Filter Presets",
    group: "Applicants",
    description:
      "Saved applicant-list filter presets for this agency (scoped by agency).",
    headers: ["Preset ID", "Agency ID", "Name", "Filters", "Created At"],
    build: ({ data, agencyId }) =>
      scopedToAgency(data.ats?.presets ?? [], agencyId).map((preset) => [
        recordId(preset),
        num(preset.agencyId),
        str(preset.name),
        list(preset.filters),
        str(preset.createdAt),
      ]),
  },

  /* ── Integrations ────────────────────────────────────────────────────── */
  {
    id: "tiktokIntegration",
    title: "TikTok Integration",
    group: "Integrations",
    description:
      "Connected TikTok account for automated posting. Access and refresh tokens are never exported.",
    headers: [
      "Open ID",
      "Display Name",
      "Avatar URL",
      "Connected",
      "Connected At",
      "Token Expires At",
      "Updated At",
    ],
    build: ({ data }) => {
      const integration = data.tiktokIntegration ?? {};
      return [
        [
          str(integration.openId),
          str(integration.displayName),
          str(integration.avatarUrl),
          bool(integration.accessToken),
          str(integration.connectedAt),
          str(integration.expiresAt),
          str(integration.updatedAt),
        ],
      ];
    },
  },
];


/* ─── Public helpers ──────────────────────────────────────────────────────── */

export const AGENCY_REPORT_SECTION_IDS = AGENCY_REPORT_SECTIONS.map(
  (section) => section.id,
);

export type AgencyReportSectionSummary = {
  id: string;
  title: string;
  group: string;
  description: string;
  columnCount: number;
};

/** Lightweight catalogue for the Reports page (no record data involved). */
export const listAgencyReportSections = (): AgencyReportSectionSummary[] =>
  AGENCY_REPORT_SECTIONS.map((section) => ({
    id: section.id,
    title: section.title,
    group: section.group,
    description: section.description,
    columnCount: section.headers.length,
  }));

export type AgencyReportTab = {
  sectionId: string;
  title: string;
  values: GoogleSheetValues;
};

/**
 * Builds one tab per selected section. Each tab carries its own header row and
 * its own rows, so no two categories ever share a sheet.
 *
 * A section that throws (malformed legacy record) is skipped rather than
 * failing the whole report; the caller reports it in `errors`.
 */
export const buildAgencyReportTabs = (
  context: AgencyReportContext,
  selectedSectionIds?: string[] | null,
): { tabs: AgencyReportTab[]; skipped: string[] } => {
  const selected = new Set(selectedSectionIds ?? []);
  const sections = selectedSectionIds?.length
    ? AGENCY_REPORT_SECTIONS.filter((section) => selected.has(section.id))
    : AGENCY_REPORT_SECTIONS;

  const tabs: AgencyReportTab[] = [];
  const skipped: string[] = [];

  for (const section of sections) {
    try {
      const rows = section.build(context);
      tabs.push({
        sectionId: section.id,
        title: section.title,
        values: [section.headers, ...rows],
      });
    } catch (error) {
      console.error(
        `[agencyReports] Failed to build section "${section.id}":`,
        error,
      );
      skipped.push(section.id);
    }
  }

  return { tabs, skipped };
};


