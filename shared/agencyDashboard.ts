export type AgencyDashboardPage = {
  destination: string;
  label: string;
  path: string;
  purpose: string;
  workflow: string;
  parameter?: "recordId" | "referenceCode";
};

// This catalog follows the authenticated agency routes in frontend/src/App.tsx.
// Keep navigation constrained to these routes; record-specific pages require
// an identifier supplied by the user or by verified agency-scoped context.
export const AGENCY_DASHBOARD_PAGES: AgencyDashboardPage[] = [
  { destination: "dashboard", label: "Home dashboard", path: "/dashboard", purpose: "Agency overview, key counts, and work needing attention.", workflow: "Review the overview cards and open the linked section for the underlying records; refresh when you need current totals." },
  { destination: "agency_profile", label: "Agency profile", path: "/agency-profile", purpose: "The public-facing agency identity and contact/profile information.", workflow: "Review the saved profile, then use Edit Agency Profile to change fields and save." },
  { destination: "agency_profile_edit", label: "Edit agency profile", path: "/agency-profile/edit", purpose: "Edit the agency profile and public contact details.", workflow: "Edit the relevant profile fields, check the preview/details, and save the changes." },
  { destination: "settings", label: "Settings", path: "/settings", purpose: "Website, AI, integration, and workspace settings available to the signed-in agency account.", workflow: "Open the relevant settings section, review its current state and connection requirements, change only the needed fields, and save." },
  { destination: "security", label: "Security", path: "/change-password", purpose: "Agency account password and security controls.", workflow: "Verify the current account, enter the required password fields, and submit the password change." },
  { destination: "add_maid", label: "Add maid profile", path: "/add-maid", purpose: "Create a helper profile for the agency inventory.", workflow: "Enter biodata and work preferences, add skills and experience, provide profile media/documents as requested, review the profile, and save. Public visibility should be reviewed separately." },
  { destination: "manage_maids", label: "Manage maid profiles", path: "/edit-maids", purpose: "Search and manage the agency's existing helper profiles.", workflow: "Find the profile, review its stored details and visibility, make the intended edit, then save. Hidden profiles are not public listings." },
  { destination: "maid_profile", label: "Maid profile details", path: "/maid/:referenceCode", purpose: "View one agency helper profile.", workflow: "Open the exact reference code to review profile fields and current visibility." , parameter: "referenceCode" },
  { destination: "maid_profile_full", label: "Full maid profile", path: "/maid/:referenceCode/full", purpose: "View the complete agency helper profile.", workflow: "Open the exact reference code and review the complete profile record." , parameter: "referenceCode" },
  { destination: "maid_edit", label: "Edit maid profile", path: "/maid/:referenceCode/edit", purpose: "Edit one agency helper profile.", workflow: "Open the exact reference code, change the necessary fields, review, and save." , parameter: "referenceCode" },
  { destination: "enquiries", label: "Enquiries", path: "/enquiry", purpose: "Incoming website enquiries and their follow-up status.", workflow: "Open an enquiry, read the submitted request, review assignment/status, then record follow-up or open the related conversation. Enquiries are distinct from support chats and service requests." },
  { destination: "requests", label: "Service requests", path: "/requests", purpose: "Client requests for agency services, including helper preferences and request progress.", workflow: "Review the request and requirements, inspect candidate references when present, update the request status or shortlist, and coordinate interviews or placement handoff where appropriate." },
  { destination: "request_details", label: "Request details", path: "/requests/:recordId", purpose: "The full workflow and messages for one client service request.", workflow: "Open the exact request ID to review requirements, status, shortlist, conversation, and next-step controls." , parameter: "recordId" },
  { destination: "messages", label: "Messages and support chats", path: "/chat-support", purpose: "Client support conversations and staff replies.", workflow: "Choose a conversation, review its history and request context, reply in the thread, and hand unclear or sensitive matters to staff. A sent message is not proof that the customer read it." },
  { destination: "applicants", label: "Applicants and recruitment", path: "/recruitment", purpose: "Applicant pipeline, screening summaries, profiles, and document metadata.", workflow: "Search the applicant list, open a candidate, review profile and screening evidence, check document status, then use the available stage/review workflow. Missing evidence must remain unknown; staff make hiring decisions." },
  { destination: "applicant_details", label: "Applicant details", path: "/recruitment/applicant/:recordId", purpose: "One ATS application and its profile, score, documents, and history.", workflow: "Open the exact application ID and review its recorded fields and history. Document metadata does not mean file contents have been read." , parameter: "recordId" },
  { destination: "ai_hr_interviewer", label: "AI HR interviewer", path: "/ai-hr-interviewer", purpose: "AI-assisted applicant interview workflow and interview records.", workflow: "Select the candidate, conduct or review the interview according to the configured workflow, then verify the saved interview record and staff review." },
  { destination: "maid_interviews", label: "Maid interviews", path: "/maid-interviews", purpose: "Coordinate and track interviews for helper candidates.", workflow: "Choose the candidate and interview details, confirm date/time and timezone, save the schedule, then handle participant invitations separately if the workflow requires them." },
  { destination: "contracts", label: "Employment contracts", path: "/employment-contracts", purpose: "Agency employer/maid employment contract records.", workflow: "Search or create a contract record, verify employer and helper references, review contract details, and save changes through the contract form." },
  { destination: "contract_new", label: "Create employment contract", path: "/employment-contracts/new", purpose: "Create an employment contract record.", workflow: "Enter verified employer and helper details, complete the contract fields, review the record, and save." },
  { destination: "contract_details", label: "Employment contract details", path: "/employment-contracts/:referenceCode", purpose: "View one employment contract record.", workflow: "Open the exact contract reference and review the stored parties, dates, and status." , parameter: "referenceCode" },
  { destination: "contract_edit", label: "Edit employment contract", path: "/employment-contracts/:referenceCode/edit", purpose: "Edit one employment contract record.", workflow: "Open the exact contract reference, verify both parties, change only the requested fields, review, and save." , parameter: "referenceCode" },
  { destination: "operations_board", label: "Operations board", path: "/operations", purpose: "Placements, arrival flights, milestones, and verified deployment tasks.", workflow: "Open a placement, link the correct employer, review flight/arrival details, and update tasks only when staff evidence supports the status. A completed status should have its required verification note or evidence." },
  { destination: "placement_details", label: "Placement details", path: "/operations/placements/:recordId", purpose: "One placement lifecycle record and its tasks.", workflow: "Open the exact placement ID to review linked parties, milestones, arrival details, and task history." , parameter: "recordId" },
  { destination: "operations_center", label: "Operations center and knowledge library", path: "/operations-center", purpose: "Agency operational tools, scenario monitoring, and approved knowledge-library sections.", workflow: "Choose the relevant operations tab. For knowledge, review a document and its approval/active state before relying on it; use the library controls to upload, edit, or deactivate policy material." },
  { destination: "knowledge_library", label: "Knowledge library", path: "/operations-center?tab=knowledge", purpose: "Approved agency knowledge used by AI answers and workflows.", workflow: "Search or upload approved policy/procedure material, review its metadata and content, then keep it active only after staff verification." },
  { destination: "contractor_tasks", label: "Contractor tasks and documents", path: "/contractor-tasks", purpose: "Contractor-facing task acknowledgements and completion records.", workflow: "Find the placement/task, check the assigned contractor and evidence, then record acknowledgement or completion only when confirmed." },
  { destination: "referral_leads", label: "Referral leads", path: "/referral-leads", purpose: "Referral contacts and follow-up status.", workflow: "Review lead source and contact details, update the follow-up status, and verify channel-specific permission before contacting anyone." },
  { destination: "whatsapp_broadcast", label: "WhatsApp broadcasts", path: "/whatsapp-broadcast", purpose: "WhatsApp campaign contacts, consent, broadcast scheduling, and delivery status.", workflow: "Prepare the message and audience, review consent/opt-outs and schedule details, approve the exact campaign, then monitor provider status. A queued campaign is not proof of delivery." },
  { destination: "telegram_broadcast", label: "Telegram broadcasts", path: "/telegram-broadcast", purpose: "Telegram subscriber audience and broadcast sending/scheduling.", workflow: "Review the active consented audience and message, confirm schedule or send-now intent, approve the campaign, then monitor delivery results." },
  { destination: "ai_marketing", label: "AI marketing", path: "/ai-marketing", purpose: "Create and review marketing content and campaign drafts.", workflow: "Choose the campaign purpose and channel, generate or edit copy, verify claims and audience, and send only through a separately approved campaign workflow." },
  { destination: "ai_agents", label: "AI agents", path: "/ai-agents", purpose: "Configure and inspect agency AI agents and their workflows.", workflow: "Review an agent's scope, connected tools, limits, and approval behavior before changing its settings." },
  { destination: "ai_command_center", label: "AI Command Center", path: "/ai-command-center", purpose: "Ask questions, navigate agency pages, prepare supported actions, and review confirmations in chat.", workflow: "Describe the task in plain language. The assistant uses agency-scoped context, shows a confirmation card for supported changes, and reports only outcomes returned by the website/provider." },
  { destination: "reports", label: "Agency reports", path: "/reports", purpose: "Management reports and operational metrics.", workflow: "Choose the report and date/filter scope, inspect data coverage and totals, and export or share only after checking the figures." },
  { destination: "tiktok_automation", label: "TikTok automation", path: "/tiktok", purpose: "TikTok account connection and related content/automation tools.", workflow: "Review the connected account and available automation settings; confirm account authorization and any publishing action separately." },
];

const pageByDestination = new Map(AGENCY_DASHBOARD_PAGES.map((page) => [page.destination, page]));
const destinationAliases: Record<string, string> = {
  maids: "manage_maids",
  operations: "operations_board",
  interviews: "maid_interviews",
  documents: "contractor_tasks",
};

export const getAgencyDashboardPage = (destination: string) =>
  pageByDestination.get(destinationAliases[destination] ?? destination);

export const buildAgencyDashboardGuide = () => AGENCY_DASHBOARD_PAGES
  .map((page) => `${page.label} (${page.path}): ${page.purpose} Flow: ${page.workflow}`)
  .join("\n");

export const resolveAgencyDashboardPath = (
  destination: string,
  params: { recordId?: string; referenceCode?: string } = {},
) => {
  const page = getAgencyDashboardPage(destination);
  if (!page) return null;
  if (!page.parameter) return page.path;
  const value = params[page.parameter]?.trim() ?? "";
  if (!/^[A-Za-z0-9_-]{1,120}$/.test(value)) return null;
  return page.path.replace(`:${page.parameter}`, encodeURIComponent(value));
};
