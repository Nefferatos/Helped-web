import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";
import { adminPath } from "@/lib/routes";
import {
  bulkAtsAction,
  fetchAtsApplication,
  fetchAtsApplications,
  fetchAtsDashboard,
  fetchAtsPresets,
  updateAtsStage,
  type AtsApplicationListItem,
} from "@/lib/ats";
import {
  Brain,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  ExternalLink,
  Filter,
  FileText,
  Image as ImageIcon,
  Lightbulb,
  Mail,
  MessageCircle,
  MonitorUp,
  MoveLeft,
  MoveRight,
  Search,
  SlidersHorizontal,
  Sparkles,
  Users,
  Video,
  X,
  XCircle,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

type AtsDocument = {
  id: string;
  type: string;
  name: string;
  status: string;
  required: boolean;
  url?: string;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const READY_TO_POST_PUBLIC_STAGE = "Ready to Configure Public Profile";

const pipelineStages = [
  "New Applicant",
  "Documents Submitted",
  "Resume Parsed",
  "Screening Interview",
  "Background Check",
  "Approved",
  READY_TO_POST_PUBLIC_STAGE,
  "Placed",
  "Rejected",
] as const;

const applicantFlowGuide = [
  {
    title: "1. Intake & First Review",
    description:
      "New applicants land here from the public portal. Check profile completeness, WhatsApp access, and the qualification score first.",
    stage: "New Applicant -> Documents Submitted",
    icon: MonitorUp,
  },
  {
    title: "2. Validate Profile Quality",
    description:
      "Open the profile, review work history, languages, salary expectations, and attached files before spending time on outreach.",
    stage: "Resume Parsed",
    icon: FileText,
  },
  {
    title: "3. Contact & Screen",
    description:
      "Reach out by WhatsApp or email, confirm availability, and move serious candidates into interview and verification stages quickly.",
    stage: "Screening Interview -> Background Check",
    icon: MessageCircle,
  },
  {
    title: "4. Approve & Market",
    description:
      "Approve only candidates with verified details, then move them into public profile setup before anything is posted for employers or clients.",
    stage: "Approved -> Ready to Configure Public Profile",
    icon: Sparkles,
  },
] as const;

const processChecklist = [
  "Use search and quick filters to build a shortlist by score, experience, and care type.",
  "Open each profile before outreach so recruiters speak with full context.",
  "Update the pipeline immediately after each action to keep the team aligned.",
  "Use bulk actions only for clear batch work like document requests or approvals.",
] as const;

const applicantListSop = [
  {
    stage: "New Applicant",
    action:
      "Check the basic profile, contact details, and whether the application looks complete enough to review.",
  },
  {
    stage: "Documents Submitted",
    action:
      "Review biodata, resume, and uploads so incomplete or low-quality records are filtered early.",
  },
  {
    stage: "Resume Parsed",
    action:
      "Use score, skills, languages, salary, and work history to decide if this candidate is worth contacting.",
  },
  {
    stage: "Screening Interview",
    action:
      "Contact the candidate and confirm availability, salary fit, and real experience before moving forward.",
  },
  {
    stage: "Background Check",
    action:
      "Verify references and key claims before approving the candidate for profile setup.",
  },
  {
    stage: "Approved",
    action:
      "Mark the candidate as internally qualified and ready for the maid profile handoff.",
  },
  {
    stage: READY_TO_POST_PUBLIC_STAGE,
    action:
      "Open AddMaid, complete the profile, and prepare it before anything goes live to employers or clients.",
  },
  {
    stage: "Placed",
    action:
      "Keep as a completed placement record. No active recruiting action is usually needed.",
  },
  {
    stage: "Rejected",
    action:
      "Keep the record closed unless there is a clear reason to revisit the application later.",
  },
] as const;

const stageHoverGuide: Record<string, { title: string; description: string }> = {
  "All Applicants": {
    title: "All Applicants",
    description:
      "See the full pipeline in one list, then narrow it down by stage, score, or shortlist filters.",
  },
  "New Applicant": {
    title: "New Applicant",
    description:
      "Fresh submission from the public application form. Check completeness and contactability first.",
  },
  "Documents Submitted": {
    title: "Documents Submitted",
    description:
      "Files are in. Review biodata, resume, and attachments before deeper recruiter effort.",
  },
  "Resume Parsed": {
    title: "Resume Parsed",
    description:
      "Use the parsed profile, score, and skills to decide whether the candidate should be contacted.",
  },
  "Screening Interview": {
    title: "Screening Interview",
    description:
      "Contact the candidate and confirm salary, availability, and fit before moving them ahead.",
  },
  "Background Check": {
    title: "Background Check",
    description:
      "Verify references, past experience, and important claims before internal approval.",
  },
  Approved: {
    title: "Approved",
    description: "The candidate is internally qualified and ready for maid-profile handoff.",
  },
  [READY_TO_POST_PUBLIC_STAGE]: {
    title: "Ready to Configure Public Profile",
    description:
      "Open AddMaid, complete the maid profile, and prepare it before anything goes live.",
  },
  Placed: {
    title: "Placed",
    description:
      "Recruitment is completed. Keep this as a final placement record rather than an active candidate.",
  },
  Rejected: {
    title: "Rejected",
    description:
      "The application is closed out and kept mainly for record history unless reopened intentionally.",
  },
};

const walkthroughSteps = [
  {
    id: "intake",
    label: "Intake",
    eyebrow: "Step 1",
    title: "Review new applicants first",
    summary:
      "Start with fresh applicants from the portal and quickly confirm whether the profile is ready for recruiter attention.",
    helper: "Overview of new submissions and first-pass qualification.",
    points: [
      "Check WhatsApp, email, and profile completeness before outreach.",
      "Use the qualification score to spot strong applicants early.",
      "Move complete records into document review without delay.",
    ],
    chips: ["New Applicant", "Documents Submitted", "Score check"],
  },
  {
    id: "profile",
    label: "Profile",
    eyebrow: "Step 2",
    title: "Validate documents and profile quality",
    summary:
      "Open the candidate profile to verify work history, attachments, salary expectations, and skill details before spending recruiter time.",
    helper: "Review details before the recruiter invests outreach time.",
    points: [
      "Review resume, biodata, and supporting files in one place.",
      "Check languages, cooking ability, and care experience against client demand.",
      "Use filters to narrow the shortlist before opening profiles one by one.",
    ],
    chips: ["Resume Parsed", "Files", "Skills review"],
  },
  {
    id: "screen",
    label: "Screen",
    eyebrow: "Step 3",
    title: "Contact and screen serious candidates",
    summary:
      "Once a profile looks promising, reach out immediately and update the pipeline after every meaningful interaction.",
    helper: "Keep follow-up fast and stage movement consistent.",
    points: [
      "Use WhatsApp or email shortcuts directly from the card.",
      "Confirm availability, salary alignment, and job fit during screening.",
      "Advance candidates to background checks as soon as the first screening is positive.",
    ],
    chips: ["Screening Interview", "Background Check", "Outreach"],
  },
  {
    id: "market",
    label: "Market",
    eyebrow: "Step 4",
    title: "Approve and prepare public profile setup",
    summary:
      "Verified candidates should move into public profile setup first, so the agency can configure the final profile before it goes live for employers and clients.",
    helper: "Finish verification and prepare the profile configuration step.",
    points: [
      "Approve only after references and important claims are checked.",
      "Move strong candidates into the public profile configuration stage as soon as they are ready.",
      "Use bulk actions only for repetitive admin work, not judgment calls.",
    ],
    chips: ["Approved", READY_TO_POST_PUBLIC_STAGE, "Bulk actions"],
  },
] as const;

const quickFilters = [
  {
    label: "WhatsApp + Score 70+",
    key: "whatsapp-70",
    filter: { hasWhatsApp: true, minScore: 70 },
  },
  {
    label: "Childcare Shortlist",
    key: "childcare",
    filter: { minExperience: 3, childcareExperience: true, hasWhatsApp: true },
  },
  {
    label: "Elderly Care",
    key: "elderly",
    filter: { elderlyCareExperience: true, hasWhatsApp: true },
  },
  {
    label: "Available Now",
    key: "available",
    filter: { availableImmediately: true, hasWhatsApp: true },
  },
  {
    label: "Ready to Configure",
    key: "market",
    filter: {
      status: ["Approved", READY_TO_POST_PUBLIC_STAGE],
      hasWhatsApp: true,
    },
  },
] as const;

const ALL_STAGE_TAB = "All Applicants";
const ATS_GUIDE_STORAGE_KEY = "ats-recruiter-guide-hidden";
const ATS_TABLE_PAGE_SIZE = 15;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const scoreTone = (score?: number | null) => {
  if ((score ?? 0) >= 90) return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if ((score ?? 0) >= 75) return "bg-sky-100 text-sky-800 border-sky-200";
  if ((score ?? 0) >= 60) return "bg-amber-100 text-amber-800 border-amber-200";
  if ((score ?? 0) >= 40) return "bg-orange-100 text-orange-800 border-orange-200";
  return "bg-rose-100 text-rose-800 border-rose-200";
};

const formatDate = (value?: string) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const makeWhatsAppHref = (value?: string) => {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}` : "";
};

const getDocumentKind = (name?: string, url?: string) => {
  const target = `${name ?? ""} ${url ?? ""}`.toLowerCase();
  if (/\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/.test(target)) return "image";
  if (/\.pdf(\?|$)/.test(target)) return "pdf";
  if (/\.(mp4|mov|webm|ogg)(\?|$)/.test(target)) return "video";
  if (/\.(doc|docx)(\?|$)/.test(target)) return "document";
  return "file";
};

const getApplicantDisplayName = (item: AtsApplicationListItem) =>
  item.profile.fullName?.trim() ||
  item.maidReferenceCode ||
  item.applicationCode ||
  "Unnamed applicant";

const getStageDisplayLabel = (stage: string) => stage;

const buildPublicProfileSetupPath = (item: {
  id: string;
  applicationCode?: string;
  maidReferenceCode?: string;
  profile?: {
    fullName?: string;
    email?: string;
    contactNumber?: string;
    whatsappNumber?: string;
    nationality?: string;
    yearsOfExperience?: number;
    expectedSalary?: number | null;
    employmentPreference?: string;
    languageSkills?: string[];
    childcareExperience?: number;
    newbornCareExperience?: number;
    elderlyCareExperience?: number;
    availableDate?: string;
  };
}) => {
  const params = new URLSearchParams({ source: "ats", applicationId: item.id });
  if (item.applicationCode) params.set("applicationCode", item.applicationCode);
  if (item.maidReferenceCode) params.set("maidReferenceCode", item.maidReferenceCode);
  if (item.profile?.fullName) params.set("candidateName", item.profile.fullName);
  if (item.profile?.email) params.set("email", item.profile.email);
  if (item.profile?.contactNumber) params.set("contactNumber", item.profile.contactNumber);
  if (item.profile?.whatsappNumber) params.set("whatsappNumber", item.profile.whatsappNumber);
  if (item.profile?.nationality) params.set("nationality", item.profile.nationality);
  if (typeof item.profile?.yearsOfExperience === "number")
    params.set("yearsOfExperience", String(item.profile.yearsOfExperience));
  if (typeof item.profile?.expectedSalary === "number")
    params.set("expectedSalary", String(item.profile.expectedSalary));
  if (item.profile?.employmentPreference)
    params.set("employmentPreference", item.profile.employmentPreference);
  if (item.profile?.languageSkills?.length)
    params.set("languageSkills", item.profile.languageSkills.join(", "));
  if (typeof item.profile?.childcareExperience === "number")
    params.set("childcareExperience", String(item.profile.childcareExperience));
  if (typeof item.profile?.newbornCareExperience === "number")
    params.set("newbornCareExperience", String(item.profile.newbornCareExperience));
  if (typeof item.profile?.elderlyCareExperience === "number")
    params.set("elderlyCareExperience", String(item.profile.elderlyCareExperience));
  if (item.profile?.availableDate) params.set("availableDate", item.profile.availableDate);
  return `${adminPath("/add-maid")}?${params.toString()}`;
};

const getNextApplicantAction = (item: AtsApplicationListItem) => {
  const hasDirectContact = Boolean(
    item.profile.contactNumber || item.profile.email
  );
  switch (item.status) {
    case "New Applicant":
      return {
        title: "Review intake",
        detail:
          "Confirm profile completeness, contact access, and submission quality before moving forward.",
        cta: "Mark documents received",
        nextStage: "Documents Submitted",
      };
    case "Documents Submitted":
      return {
        title: "Validate documents",
        detail:
          "Check biodata, file uploads, and work history so the profile is ready for recruiter review.",
        cta: "Send to resume parsing",
        nextStage: "Resume Parsed",
      };
    case "Resume Parsed":
      return {
        title: hasDirectContact ? "Start outreach" : "Fix contact details",
        detail: hasDirectContact
          ? "Use the score and profile notes to decide whether this candidate should enter screening."
          : "This profile needs a working WhatsApp number or email before follow-up can begin.",
        cta: hasDirectContact ? "Move to screening" : "Open profile",
        nextStage: hasDirectContact ? "Screening Interview" : undefined,
      };
    case "Screening Interview":
      return {
        title: "Complete screening",
        detail:
          "Capture fit, availability, and salary alignment immediately after the first contact.",
        cta: "Move to background check",
        nextStage: "Background Check",
      };
    case "Background Check":
      return {
        title: "Finish verification",
        detail:
          "Approve only after references, prior employment, and key claims have been reviewed.",
        cta: "Approve candidate",
        nextStage: "Approved",
      };
    case "Approved":
      return {
        title: "Configure public profile",
        detail:
          "This candidate is qualified. Move the profile into the public-profile setup stage so the agency can configure it before publishing.",
        cta: "Move to Profile Setup",
        nextStage: READY_TO_POST_PUBLIC_STAGE,
      };
    case READY_TO_POST_PUBLIC_STAGE:
      return {
        title: "Awaiting public profile setup",
        detail:
          "This candidate is ready for the agency to configure the public profile before it is posted live.",
        cta: "Open profile",
      };
    case "Placed":
      return {
        title: "Placement complete",
        detail:
          "No new shortlist action is needed unless there is a follow-up admin task to finish.",
        cta: "Open profile",
      };
    case "Rejected":
      return {
        title: "Closed out",
        detail:
          "Keep the record for history and reopen only when there is a valid business reason.",
        cta: "Open profile",
      };
    default:
      return {
        title: "Review applicant",
        detail: "Open the profile and decide the next recruiter action.",
        cta: "Open profile",
      };
  }
};

const statusTone = (status: AtsApplicationListItem["status"]) => {
  switch (status) {
    case "New Applicant": return "border-sky-200 bg-sky-50 text-sky-800";
    case "Documents Submitted": return "border-cyan-200 bg-cyan-50 text-cyan-800";
    case "Resume Parsed": return "border-violet-200 bg-violet-50 text-violet-800";
    case "Screening Interview": return "border-amber-200 bg-amber-50 text-amber-800";
    case "Background Check": return "border-orange-200 bg-orange-50 text-orange-800";
    case "Approved": return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case READY_TO_POST_PUBLIC_STAGE: return "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-800";
    case "Placed": return "border-teal-200 bg-teal-50 text-teal-800";
    case "Rejected": return "border-rose-200 bg-rose-50 text-rose-800";
    default: return "border-slate-200 bg-slate-50 text-slate-700";
  }
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const ScoreBar = ({ label, value }: { label: string; value: number }) => (
  <div>
    <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
      <span className="font-medium">{label}</span>
      <span className="font-semibold tabular-nums">{value}%</span>
    </div>
    <div className="h-1.5 rounded-full bg-slate-100">
      <div
        className="h-1.5 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-500"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const AtsRecruitmentPage = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [sopModalOpen, setSopModalOpen] = useState(false);
  const [activeDocumentIndex, setActiveDocumentIndex] = useState(0);
  const [activeQuickFilter, setActiveQuickFilter] = useState<string | null>(null);
  const [activeStageTab, setActiveStageTab] = useState<string>(ALL_STAGE_TAB);
  const [currentPage, setCurrentPage] = useState(1);
  const [showGuide, setShowGuide] = useState(false);
  const [activeGuideStep, setActiveGuideStep] = useState(0);
  const [guideDoNotShowAgain, setGuideDoNotShowAgain] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [filters, setFilters] = useState<Record<string, unknown>>({});
  const [sort, setSort] = useState("qualificationScore:desc");

  // ─── Queries ────────────────────────────────────────────────────────────────

  const dashboardQuery = useQuery({
    queryKey: ["ats-dashboard"],
    queryFn: fetchAtsDashboard,
  });
  const applicationsQuery = useQuery({
    queryKey: ["ats-applications", search, sort, JSON.stringify(filters)],
    queryFn: () =>
      fetchAtsApplications({ q: search, filters, sort, page: 1, pageSize: 120 }),
  });
  const presetsQuery = useQuery({
    queryKey: ["ats-presets"],
    queryFn: fetchAtsPresets,
  });
  const detailQuery = useQuery({
    queryKey: ["ats-application", selectedId],
    enabled: Boolean(selectedId),
    queryFn: () => fetchAtsApplication(selectedId!),
  });

  const stageMutation = useMutation({
    mutationFn: ({
      applicationId,
      stage,
    }: {
      applicationId: string;
      stage: string;
    }) => updateAtsStage(applicationId, stage),
    onSuccess: () => {
      toast.success("Candidate stage updated");
      void queryClient.invalidateQueries({ queryKey: ["ats-dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["ats-applications"] });
      if (selectedId)
        void queryClient.invalidateQueries({
          queryKey: ["ats-application", selectedId],
        });
    },
    onError: (error) =>
      toast.error(
        error instanceof Error ? error.message : "Failed to update stage"
      ),
  });

  const bulkMutation = useMutation({
    mutationFn: bulkAtsAction,
    onSuccess: (data) => {
      toast.success(`Updated ${data.updated} candidates`);
      setSelectedIds([]);
      void queryClient.invalidateQueries({ queryKey: ["ats-dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["ats-applications"] });
    },
    onError: (error) =>
      toast.error(
        error instanceof Error ? error.message : "Bulk action failed"
      ),
  });

  // ─── Derived state ───────────────────────────────────────────────────────────

  const dashboard = dashboardQuery.data;
  const applications = useMemo(
    () => applicationsQuery.data?.data ?? [],
    [applicationsQuery.data?.data]
  );
  const detail = detailQuery.data;
  const documents = (detail?.documents ?? []) as AtsDocument[];

  const selectedCount = selectedIds.length;
  const activeFilterCount = useMemo(
    () =>
      Object.entries(filters).filter(([, value]) =>
        Array.isArray(value) ? value.length > 0 : Boolean(value)
      ).length,
    [filters]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, AtsApplicationListItem[]>();
    pipelineStages.forEach((stage) => map.set(stage, []));
    applications.forEach((item) => {
      const bucket = map.get(item.status) ?? [];
      bucket.push(item);
      map.set(item.status, bucket);
    });
    return map;
  }, [applications]);

  const displayedApplications = useMemo(
    () =>
      activeStageTab === ALL_STAGE_TAB
        ? applications
        : applications.filter((item) => item.status === activeStageTab),
    [activeStageTab, applications]
  );
  const totalPages = Math.max(
    1,
    Math.ceil(displayedApplications.length / ATS_TABLE_PAGE_SIZE)
  );
  const paginatedApplications = useMemo(() => {
    const start = (currentPage - 1) * ATS_TABLE_PAGE_SIZE;
    return displayedApplications.slice(start, start + ATS_TABLE_PAGE_SIZE);
  }, [currentPage, displayedApplications]);

  const visibleSelectedCount = useMemo(
    () =>
      paginatedApplications.filter((item) => selectedIds.includes(item.id)).length,
    [paginatedApplications, selectedIds]
  );
  const activeGuide = walkthroughSteps[activeGuideStep];
  const guideProgress = ((activeGuideStep + 1) / walkthroughSteps.length) * 100;

  const automatedRecommendations = useMemo(
    () => [
      {
        key: "auto-ready",
        label: "High Score Ready",
        detail: `${
          applications.filter(
            (item) =>
              (item.score?.score ?? 0) >= 80 &&
              item.status !== "Placed" &&
              item.status !== "Rejected"
          ).length
        } active applicants scoring 80+`,
        filter: {
          minScore: 80,
          status: [
            "Resume Parsed",
            "Screening Interview",
            "Background Check",
            "Approved",
            READY_TO_POST_PUBLIC_STAGE,
          ],
        },
      },
      {
        key: "auto-screen",
        label: "Interview Queue",
        detail: `${
          applications.filter(
            (item) =>
              item.status === "Resume Parsed" ||
              item.status === "Screening Interview"
          ).length
        } applicants waiting for recruiter follow-up`,
        filter: {
          status: ["Resume Parsed", "Screening Interview"],
          hasWhatsApp: true,
        },
      },
      {
        key: "auto-market",
        label: "Public Posting Queue",
        detail: `${
          applications.filter(
            (item) =>
              item.status === "Approved" ||
              item.status === READY_TO_POST_PUBLIC_STAGE
          ).length
        } applicants waiting for public profile setup before posting`,
        filter: { status: ["Approved", READY_TO_POST_PUBLIC_STAGE] },
      },
    ],
    [applications]
  );

  // ─── Handlers ────────────────────────────────────────────────────────────────

  const toggleSelect = (id: string) =>
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );

  const toggleStageFilter = (stage: string) =>
    setFilters((current) => {
      const currentStages = Array.isArray(current.status)
        ? (current.status as string[])
        : [];
      const nextStages = currentStages.includes(stage)
        ? currentStages.filter((item) => item !== stage)
        : [...currentStages, stage];
      return { ...current, status: nextStages };
    });

  const handleQuickFilter = (key: string, filter: Record<string, unknown>) => {
    if (activeQuickFilter === key) {
      setActiveQuickFilter(null);
      setFilters({});
    } else {
      setActiveQuickFilter(key);
      setFilters(filter);
    }
  };

  const clearAllFilters = () => {
    setActiveQuickFilter(null);
    setFilters({});
    setSearch("");
  };

  const closeGuide = () => {
    try {
      if (guideDoNotShowAgain) {
        window.localStorage.setItem(ATS_GUIDE_STORAGE_KEY, "1");
      } else {
        window.localStorage.removeItem(ATS_GUIDE_STORAGE_KEY);
      }
    } catch {
      // ignore
    }
    setShowGuide(false);
  };

  const openGuide = () => {
    setActiveGuideStep(0);
    setShowGuide(true);
  };

  const openProfileModal = (applicationId: string) => {
    setSelectedId(applicationId);
    setActiveDocumentIndex(0);
    setProfileModalOpen(true);
  };

  const scoreFactors = detail?.score?.factors
    ? [
        ["Experience", detail.score.factors.experience],
        ["Skill Match", detail.score.factors.skillMatch],
        ["Certifications", detail.score.factors.certifications],
        ["References", detail.score.factors.references],
        ["Languages", detail.score.factors.languageSkills],
        ["Interview", detail.score.factors.interviewRating],
      ]
    : [];

  const activeDocument = documents[activeDocumentIndex] ?? null;
  const activeDocumentKind = getDocumentKind(
    activeDocument?.name,
    activeDocument?.url
  );
  const canPreviewActiveDocument = Boolean(
    activeDocument?.url &&
      ["image", "pdf", "video"].includes(activeDocumentKind)
  );

  // ─── Effects ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    setActiveDocumentIndex(0);
  }, [selectedId]);

  useEffect(() => {
    if (activeDocumentIndex >= documents.length && documents.length > 0) {
      setActiveDocumentIndex(documents.length - 1);
    }
  }, [activeDocumentIndex, documents.length]);

  useEffect(() => {
    setSelectedIds((current) =>
      current.filter((id) =>
        displayedApplications.some((item) => item.id === id)
      )
    );
  }, [displayedApplications]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeStageTab, filters, search, sort]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  useEffect(() => {
    try {
      const hidden = window.localStorage.getItem(ATS_GUIDE_STORAGE_KEY) === "1";
      setGuideDoNotShowAgain(hidden);
      setShowGuide(!hidden);
    } catch {
      setShowGuide(true);
    }
  }, []);

  const selectAllVisible = () =>
    setSelectedIds((current) =>
      Array.from(
        new Set([...current, ...paginatedApplications.map((item) => item.id)])
      )
    );
  const clearSelection = () => setSelectedIds([]);

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* ── Recruiter Walkthrough Modal ──────────────────────────────────── */}
      <Dialog
        open={showGuide}
        onOpenChange={(open) => (!open ? closeGuide() : openGuide())}
      >
        <DialogContent className="flex max-h-[92vh] max-w-5xl flex-col overflow-hidden rounded-3xl border-0 bg-[#060c1a] p-0 text-slate-100 shadow-[0_40px_120px_rgba(2,6,23,0.9),0_0_0_1px_rgba(56,189,248,0.08)]">
          {/* Header */}
          <div className="relative shrink-0 overflow-hidden border-b border-white/5 px-6 py-5">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_top_left,_rgba(56,189,248,0.13),_transparent),radial-gradient(ellipse_60%_50%_at_top_right,_rgba(16,185,129,0.1),_transparent)]" />
            <div className="relative flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-emerald-500 shadow-[0_0_18px_rgba(56,189,248,0.4)]">
                  <Lightbulb className="h-4 w-4 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-sm font-black leading-none text-white">
                    Recruiter Walkthrough
                  </DialogTitle>
                  <DialogDescription className="mt-0.5 text-[11px] text-slate-500">
                    Guided tour · intake to public profile
                  </DialogDescription>
                </div>
              </div>
              {/* Segmented step pills */}
              <div className="flex items-center gap-1.5">
                {walkthroughSteps.map((step, i) => (
                  <button
                    key={step.label}
                    type="button"
                    onClick={() => setActiveGuideStep(i)}
                    title={step.label}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i < activeGuideStep
                        ? "w-6 bg-emerald-500/80"
                        : i === activeGuideStep
                        ? "w-10 bg-gradient-to-r from-sky-400 to-emerald-400 shadow-[0_0_8px_rgba(56,189,248,0.55)]"
                        : "w-4 bg-slate-700 hover:bg-slate-600"
                    }`}
                  />
                ))}
                <span className="ml-2 text-[10px] font-bold tabular-nums text-slate-500">
                  {Math.round(guideProgress)}%
                </span>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[200px_1fr]">
            {/* Sidebar stepper */}
            <div className="overflow-y-auto border-b border-white/5 bg-[#07101f] p-4 lg:border-b-0 lg:border-r">
              <p className="mb-4 text-[9px] font-black uppercase tracking-[0.32em] text-slate-600">
                Steps
              </p>
              <ol className="relative space-y-0">
                {applicantFlowGuide.map((step, index) => {
                  const isActive = index === activeGuideStep;
                  const isComplete = index < activeGuideStep;
                  const isLast = index === applicantFlowGuide.length - 1;
                  return (
                    <li key={step.title} className="relative flex gap-3">
                      {/* Vertical connector line */}
                      {!isLast && (
                        <div
                          className={`absolute left-[21px] top-11 h-[calc(100%-28px)] w-px ${
                            isComplete ? "bg-emerald-500/25" : "bg-slate-800"
                          }`}
                        />
                      )}
                      {/* Single button wrapping icon + label */}
                      <button
                        type="button"
                        onClick={() => setActiveGuideStep(index)}
                        aria-current={isActive ? "step" : undefined}
                        className="mb-5 flex flex-1 items-start gap-3 text-left"
                      >
                        <div
                          className={`relative z-10 mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border transition-all duration-200 ${
                            isActive
                              ? "border-sky-400/40 bg-gradient-to-br from-sky-500/20 to-emerald-500/15 shadow-[0_0_20px_rgba(56,189,248,0.18),inset_0_0_0_1px_rgba(56,189,248,0.08)]"
                              : isComplete
                              ? "border-emerald-500/25 bg-emerald-500/8"
                              : "border-slate-700/60 bg-slate-800/50 hover:border-slate-600 hover:bg-slate-800"
                          }`}
                        >
                          {isComplete ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                          ) : (
                            <step.icon
                              className={`h-4 w-4 ${
                                isActive ? "text-sky-300" : "text-slate-500"
                              }`}
                            />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-[9px] font-black uppercase tracking-[0.26em] ${
                              isActive
                                ? "text-sky-400"
                                : isComplete
                                ? "text-emerald-500/60"
                                : "text-slate-600"
                            }`}
                          >
                            Step {index + 1}
                          </p>
                          <p
                            className={`mt-0.5 text-[11px] font-bold leading-snug ${
                              isActive
                                ? "text-white"
                                : isComplete
                                ? "text-slate-400"
                                : "text-slate-500"
                            }`}
                          >
                            {step.title.replace(/^\d+\.\s/, "")}
                          </p>
                          {isActive && (
                            <p className="mt-1 text-[10px] leading-[1.5] text-slate-500">
                              {walkthroughSteps[index]?.helper}
                            </p>
                          )}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </div>

            {/* Main panel */}
            <div className="overflow-y-auto bg-[#060c1a] p-5">
              <div className="space-y-4">
                {/* Hero card */}
                <div className="relative overflow-hidden rounded-2xl border border-white/5 p-5">
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_top_right,_rgba(56,189,248,0.1),_transparent),radial-gradient(ellipse_50%_50%_at_bottom_left,_rgba(16,185,129,0.08),_transparent),linear-gradient(135deg,rgba(10,18,40,0.99),rgba(6,12,26,0.99))]" />
                  <div className="relative flex items-start gap-4">
                    {/* Step number badge */}
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-sky-400/20 bg-gradient-to-br from-sky-500/15 to-emerald-500/10 shadow-[inset_0_0_0_1px_rgba(56,189,248,0.06)]">
                      <span className="text-3xl font-black leading-none text-sky-300">
                        {activeGuideStep + 1}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-sky-400/80">
                        {activeGuide.eyebrow}
                      </p>
                      <h3 className="mt-1 text-xl font-black tracking-tight text-white">
                        {activeGuide.title}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-slate-400">
                        {activeGuide.summary}
                      </p>
                    </div>
                  </div>
                  {/* Chips */}
                  <div className="relative mt-4 flex flex-wrap gap-2">
                    {activeGuide.chips.map((chip, i) => (
                      <span
                        key={chip}
                        className={`rounded-full border px-3 py-1 text-[11px] font-semibold tracking-wide ${
                          i % 3 === 0
                            ? "border-sky-400/20 bg-sky-500/10 text-sky-300"
                            : i % 3 === 1
                            ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
                            : "border-violet-400/20 bg-violet-500/10 text-violet-300"
                        }`}
                      >
                        {chip}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Two-col grid */}
                <div className="grid gap-4 lg:grid-cols-2">
                  {/* Action steps */}
                  <div className="rounded-2xl border border-white/5 bg-slate-900/30 p-4">
                    <div className="mb-4 flex items-center gap-2">
                      <div className="h-4 w-1 rounded-full bg-gradient-to-b from-sky-400 to-emerald-400" />
                      <p className="text-xs font-bold text-white">
                        Actions for this step
                      </p>
                    </div>
                    <div className="space-y-2">
                      {activeGuide.points.map((item, i) => (
                        <div
                          key={item}
                          className="flex items-start gap-3 rounded-xl border border-white/5 bg-slate-950/50 p-3 transition-colors hover:border-slate-700/60 hover:bg-slate-900/60"
                        >
                          <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-sky-400/25 bg-sky-500/10">
                            <span className="text-[9px] font-black text-sky-400">
                              {i + 1}
                            </span>
                          </div>
                          <span className="text-xs leading-5 text-slate-300">
                            {item}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right column */}
                  <div className="space-y-3">
                    {/* Tip */}
                    <div className="rounded-2xl border border-indigo-400/15 bg-gradient-to-br from-indigo-500/8 to-violet-500/5 p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-indigo-400/20 bg-indigo-500/12">
                          <Lightbulb className="h-3.5 w-3.5 text-indigo-300" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">
                            Pro tip
                          </p>
                          <p className="mt-1 text-[11px] leading-[1.55] text-slate-400">
                            Reopen this walkthrough any time from the tutorial
                            button in the page header.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Daily checklist */}
                    <div className="rounded-2xl border border-white/5 bg-slate-950/50 p-4">
                      <div className="mb-3 flex items-center gap-2">
                        <div className="h-4 w-1 rounded-full bg-emerald-400" />
                        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">
                          Daily checklist
                        </p>
                      </div>
                      <div className="space-y-2.5">
                        {processChecklist.map((item) => (
                          <div
                            key={item}
                            className="flex items-start gap-2.5 text-[11px] leading-5 text-slate-400"
                          >
                            <div className="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border border-emerald-400/20 bg-emerald-500/10">
                              <CheckCircle2 className="h-2 w-2 text-emerald-400" />
                            </div>
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer controls */}
                <div className="flex flex-col gap-3 border-t border-white/5 pt-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <label className="flex cursor-pointer select-none items-center gap-2.5 text-xs text-slate-400">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-emerald-500 focus:ring-emerald-400 focus:ring-offset-0"
                        checked={guideDoNotShowAgain}
                        onChange={(e) =>
                          setGuideDoNotShowAgain(e.target.checked)
                        }
                      />
                      Don't show on startup
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-white/10 bg-slate-800/50 text-slate-300 hover:border-slate-600 hover:bg-slate-700 hover:text-white"
                        onClick={() =>
                          setActiveGuideStep((c) => Math.max(c - 1, 0))
                        }
                        disabled={activeGuideStep === 0}
                      >
                        <MoveLeft className="mr-1.5 h-3.5 w-3.5" />
                        Back
                      </Button>
                      {activeGuideStep < walkthroughSteps.length - 1 ? (
                        <Button
                          size="sm"
                          className="bg-gradient-to-r from-sky-500 to-emerald-500 font-bold text-slate-950 shadow-[0_0_16px_rgba(56,189,248,0.28)] hover:from-sky-400 hover:to-emerald-400 hover:shadow-[0_0_22px_rgba(56,189,248,0.4)]"
                          onClick={() =>
                            setActiveGuideStep((c) =>
                              Math.min(c + 1, walkthroughSteps.length - 1)
                            )
                          }
                        >
                          Next step
                          <MoveRight className="ml-1.5 h-3.5 w-3.5" />
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="bg-gradient-to-r from-sky-500 to-emerald-500 font-bold text-slate-950 shadow-[0_0_16px_rgba(56,189,248,0.28)] hover:from-sky-400 hover:to-emerald-400"
                          onClick={closeGuide}
                        >
                          <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                          Start recruiting
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── SOP Modal ────────────────────────────────────────────────────── */}
      <Dialog open={sopModalOpen} onOpenChange={setSopModalOpen}>
        <DialogContent className="flex max-h-[86vh] max-w-3xl flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white p-0 shadow-[0_32px_80px_rgba(15,23,42,0.15)]">
          {/* Header */}
          <div className="relative shrink-0 overflow-hidden border-b border-slate-100 px-6 py-5">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(16,185,129,0.07),_transparent_55%)]" />
            <DialogHeader className="relative">
              <DialogTitle className="flex items-center gap-2.5 text-lg font-black text-slate-900">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500 shadow-[0_0_14px_rgba(16,185,129,0.35)]">
                  <Lightbulb className="h-4 w-4 text-white" />
                </div>
                Applicants List Workflow
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-500">
                Recruiter SOP for moving an applicant from submission to
                placement or closure.
              </DialogDescription>
            </DialogHeader>
            <div className="relative mt-3 flex items-center gap-2.5 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-2.5">
              <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
              <p className="text-xs font-medium text-slate-600">
                Apply → review → contact → verify → approve → configure profile → place or close
              </p>
            </div>
          </div>

          {/* Scrollable body */}
          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
              {applicantListSop.map((item, index) => (
                <div
                  key={item.stage}
                  className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm transition-all hover:border-emerald-100 hover:shadow-md"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-sm">
                      <span className="text-[11px] font-black text-white">
                        {index + 1}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold leading-snug text-slate-900">
                        {item.stage}
                      </p>
                      <p className="mt-1.5 text-[11px] leading-5 text-slate-500">
                        {item.action}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                onClick={openGuide}
              >
                Open full walkthrough
              </Button>
              <Button
                className="bg-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.25)] hover:bg-emerald-600"
                onClick={() => setSopModalOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-600">
                Recruitment ATS
              </p>
              <h1 className="mt-1.5 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                Maid Applicant Pipeline
              </h1>
              <p className="mt-1.5 max-w-2xl text-sm text-slate-500">
                Review applicants faster with a cleaner shortlist, guided
                filters, and responsive profile access.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
              {[
                {
                  label: "Total Applicants",
                  value: dashboard?.totalApplicants ?? 0,
                  icon: Users,
                  color: "text-sky-700 bg-sky-100",
                },
                {
                  label: "Approved",
                  value: dashboard?.approvedCandidates ?? 0,
                  icon: ClipboardCheck,
                  color: "text-violet-700 bg-violet-100",
                },
                {
                  label: "Ready for Matching",
                  value: dashboard?.readyForMatching ?? 0,
                  icon: Sparkles,
                  color: "text-fuchsia-700 bg-fuchsia-100",
                },
                {
                  label: "Placed",
                  value: dashboard?.placedHelpers ?? 0,
                  icon: BriefcaseBusiness,
                  color: "text-teal-700 bg-teal-100",
                },
                {
                  label: "Avg Score",
                  value: dashboard?.averageQualificationScore ?? 0,
                  icon: Brain,
                  color: "text-emerald-700 bg-emerald-100",
                },
              ].map((metric) => (
                <div
                  key={metric.label}
                  className="min-w-0 rounded-xl border border-white/80 bg-white p-3 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-1">
                    <div className={`rounded-lg p-2 ${metric.color}`}>
                      <metric.icon className="h-3.5 w-3.5" />
                    </div>
                    <p className="text-right text-xl font-black leading-none text-slate-950 tabular-nums">
                      {metric.value}
                    </p>
                  </div>
                  <p className="mt-2.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    {metric.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2 xl:flex-col xl:items-end">
            <Button
              variant="outline"
              size="sm"
              className="bg-white/80"
              onClick={openGuide}
            >
              <Lightbulb className="mr-1.5 h-3.5 w-3.5" />
              Tutorial
            </Button>
            {/* <Button asChild variant="outline" size="sm" className="bg-white/80">
              <Link to="/apply-as-maid">Open Portal</Link>
            </Button> */}
            <Button
              size="sm"
              onClick={() =>
                selectedId &&
                stageMutation.mutate({
                  applicationId: selectedId,
                  stage: READY_TO_POST_PUBLIC_STAGE,
                })
              }
              disabled={!selectedId || stageMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
              Move to Profile Setup
            </Button>
          </div>
        </div>
      </section>

      {/* ── Applicants Table Card ─────────────────────────────────────────── */}
      <section>
        <Card className="overflow-hidden border border-slate-200 bg-white shadow-sm">
          {/* Search & Sort */}
          <div className="border-b border-slate-100 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  className="h-10 rounded-xl border-slate-200 bg-slate-50 pl-9 pr-9 text-sm"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, nationality, language, email, or WhatsApp…"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <select
                  className="h-10 min-w-[180px] rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                >
                  <option value="qualificationScore:desc">Best score first</option>
                  <option value="applicationDate:desc">Newest first</option>
                  <option value="applicationDate:asc">Oldest first</option>
                  <option value="experience:desc">Most experience</option>
                  <option value="clientMatchScore:desc">Best client match</option>
                  <option value="expectedSalary:asc">Lowest salary</option>
                  <option value="name:asc">Name A–Z</option>
                </select>
                <Button
                  variant="outline"
                  className="h-10 rounded-xl"
                  onClick={() => setShowFilters((c) => !c)}
                >
                  <Filter className="mr-1.5 h-4 w-4" />
                  Filters
                  {activeFilterCount > 0 && (
                    <Badge className="ml-2 border-0 bg-emerald-100 px-1.5 text-[10px] text-emerald-700">
                      {activeFilterCount}
                    </Badge>
                  )}
                  <ChevronDown
                    className={`ml-2 h-4 w-4 transition-transform ${showFilters ? "rotate-180" : ""}`}
                  />
                </Button>
              </div>
            </div>

            {/* Filters panel */}
            {showFilters && (
              <div className="mt-4 space-y-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
                {/* Quick filters */}
                <div>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      Quick filters
                    </p>
                    {(activeFilterCount > 0 || search) && (
                      <button
                        type="button"
                        onClick={clearAllFilters}
                        className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-600"
                      >
                        <XCircle className="h-3 w-3" />
                        Clear all
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {quickFilters.map(({ label, key, filter }) => {
                      const isActive = activeQuickFilter === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() =>
                            handleQuickFilter(
                              key,
                              filter as Record<string, unknown>
                            )
                          }
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                            isActive
                              ? "bg-emerald-600 text-white shadow-sm"
                              : "border border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:text-emerald-700"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Automated recommendations */}
                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Automated recommendations
                  </p>
                  <div className="grid gap-2 lg:grid-cols-3">
                    {automatedRecommendations.map((rec) => (
                      <button
                        key={rec.key}
                        type="button"
                        onClick={() => {
                          setActiveQuickFilter(rec.key);
                          setFilters(rec.filter);
                        }}
                        className="rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-sm"
                      >
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
                          <span className="text-sm font-semibold text-slate-900">
                            {rec.label}
                          </span>
                        </div>
                        <p className="mt-1.5 text-xs leading-5 text-slate-500">
                          {rec.detail}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowMoreFilters((c) => !c)}
                  >
                    <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" />
                    {showMoreFilters ? "Hide more filters" : "More filters"}
                  </Button>
                </div>

                {showMoreFilters && (
                  <div className="space-y-4 border-t border-slate-200 pt-4">
                    <div>
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                        Pipeline stages
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {pipelineStages.map((stage) => {
                          const active =
                            Array.isArray(filters.status) &&
                            (filters.status as string[]).includes(stage);
                          const count = grouped.get(stage)?.length ?? 0;
                          return (
                            <button
                              key={stage}
                              type="button"
                              onClick={() => toggleStageFilter(stage)}
                              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                                active
                                  ? "bg-emerald-600 text-white shadow-sm"
                                  : "border border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:text-emerald-700"
                              }`}
                            >
                              {stage}
                              <span
                                className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                                  active
                                    ? "bg-emerald-500"
                                    : "bg-slate-100 text-slate-500"
                                }`}
                              >
                                {count}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {(presetsQuery.data?.presets ?? []).length > 0 && (
                      <div>
                        <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                          Saved presets
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {presetsQuery.data?.presets.map((preset) => (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() => setFilters(preset.filters)}
                              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-emerald-300 hover:text-emerald-700"
                            >
                              {preset.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Stage tabs + SOP header */}
          <div className="border-b border-slate-100 bg-slate-50/60 px-4 py-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-bold text-slate-900">
                  Applicants by stage
                </p>
                <p className="text-xs text-slate-500">
                  Faster scanning, bulk selection, and quick recruiter actions.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <HoverCard openDelay={100}>
                  <HoverCardTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 bg-white/80"
                      onClick={() => setSopModalOpen(true)}
                    >
                      <Lightbulb className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                      Workflow SOP
                    </Button>
                  </HoverCardTrigger>
                  <HoverCardContent
                    align="end"
                    className="w-72 rounded-2xl border-emerald-100 bg-white p-4 shadow-xl"
                  >
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">
                      Quick preview
                    </p>
                    <p className="mt-1.5 text-sm font-bold text-slate-900">
                      Applicants list in one line
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-600">
                      Apply, review, contact, verify, approve, configure
                      profile, then place or close.
                    </p>
                    <div className="mt-3 space-y-2">
                      {applicantListSop.slice(0, 4).map((item) => (
                        <div
                          key={item.stage}
                          className="flex items-start gap-2 text-xs leading-5 text-slate-600"
                        >
                          <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
                          <span>
                            <span className="font-semibold text-slate-800">
                              {item.stage}:
                            </span>{" "}
                            {item.action}
                          </span>
                        </div>
                      ))}
                    </div>
                    <p className="mt-2 text-[10px] text-slate-400">
                      Click to open the full SOP.
                    </p>
                  </HoverCardContent>
                </HoverCard>
                <Badge
                  variant="outline"
                  className="border-slate-200 bg-white text-slate-700"
                >
                  {displayedApplications.length} visible
                </Badge>
                {selectedCount > 0 && (
                  <Badge className="border-0 bg-emerald-600 text-white">
                    {visibleSelectedCount} selected
                  </Badge>
                )}
              </div>
            </div>

            {/* Stage tabs */}
            <div className="mt-3 flex gap-1.5 overflow-x-auto pb-0.5">
              {[ALL_STAGE_TAB, ...pipelineStages].map((stage) => {
                const isActive = activeStageTab === stage;
                const count =
                  stage === ALL_STAGE_TAB
                    ? applications.length
                    : grouped.get(stage)?.length ?? 0;
                const guide = stageHoverGuide[stage] ?? {
                  title: getStageDisplayLabel(stage),
                  description:
                    "Open this stage to review matching applicants and decide the next action.",
                };
                return (
                  <HoverCard key={stage} openDelay={160}>
                    <HoverCardTrigger asChild>
                      <button
                        type="button"
                        onClick={() => setActiveStageTab(stage)}
                        className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
                          isActive
                            ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
                            : "border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:text-emerald-700"
                        }`}
                      >
                        <span>{getStageDisplayLabel(stage)}</span>
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
                            isActive
                              ? "bg-emerald-500 text-white"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {count}
                        </span>
                      </button>
                    </HoverCardTrigger>
                    <HoverCardContent
                      align="start"
                      className="w-64 rounded-xl border-slate-200 bg-white p-3 shadow-xl"
                    >
                      <p className="text-sm font-bold text-slate-900">
                        {guide.title}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-600">
                        {guide.description}
                      </p>
                      <p className="mt-2 text-[10px] text-slate-400">
                        {count} applicant{count === 1 ? "" : "s"} in this
                        stage.
                      </p>
                    </HoverCardContent>
                  </HoverCard>
                );
              })}
            </div>
          </div>

          {/* Select-all + bulk actions bar */}
          <div className="flex flex-col gap-2 border-b border-slate-100 bg-slate-50/50 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex items-center gap-3 text-sm font-semibold text-slate-900">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-400"
                checked={
                  visibleSelectedCount === displayedApplications.length &&
                  displayedApplications.length > 0
                }
                onChange={() =>
                  visibleSelectedCount === displayedApplications.length
                    ? clearSelection()
                    : selectAllVisible()
                }
              />
              <span className="text-slate-700">
                {getStageDisplayLabel(activeStageTab)}
              </span>
              <span className="text-xs font-normal text-slate-400">
                {displayedApplications.length} applicants · Page {currentPage}{" "}
                of {totalPages}
              </span>
            </label>

            {visibleSelectedCount > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    { label: "Approve", action: "approve" },
                    { label: "Assign Interview", action: "assign_interview" },
                    { label: "Request Docs", action: "request_documents" },
                    { label: "Reject", action: "reject" },
                  ] as const
                ).map(({ label, action }) => (
                  <Button
                    key={action}
                    size="sm"
                    variant={action === "reject" ? "destructive" : "outline"}
                    className="h-7 text-xs"
                    onClick={() =>
                      bulkMutation.mutate({
                        applicationIds: selectedIds,
                        action,
                      })
                    }
                    disabled={bulkMutation.isPending}
                  >
                    {label}
                  </Button>
                ))}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={clearSelection}
                >
                  <X className="mr-1 h-3 w-3" />
                  Deselect
                </Button>
              </div>
            )}
          </div>

          {/* Table */}
          <div className="p-4">
            {displayedApplications.length === 0 ? (
              <div className="flex min-h-[220px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-slate-400">
                <Users className="h-8 w-8 opacity-30" />
                <p className="text-sm font-medium">
                  No applicants match this stage or your current filters
                </p>
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="text-xs font-semibold text-emerald-600 underline underline-offset-2"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1100px] text-left">
                    <thead className="bg-slate-50">
                      <tr className="border-b border-slate-200">
                        <th className="w-10 px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                          Sel
                        </th>
                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                          Applicant
                        </th>
                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                          Stage
                        </th>
                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                          Contact
                        </th>
                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                          Skills
                        </th>
                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                          Score
                        </th>
                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                          Profile
                        </th>
                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                          Next Action
                        </th>
                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedApplications.map((item) => {
                        const nextAction = getNextApplicantAction(item);
                        return (
                          <tr
                            key={item.id}
                            className={`border-b border-slate-100 align-top transition-colors hover:bg-emerald-50/30 ${
                              selectedId === item.id
                                ? "bg-emerald-50/50"
                                : "bg-white"
                            }`}
                          >
                            {/* Checkbox */}
                            <td className="px-4 py-3.5">
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-400"
                                checked={selectedIds.includes(item.id)}
                                onChange={() => toggleSelect(item.id)}
                              />
                            </td>

                            {/* Applicant name */}
                            <td className="px-4 py-3.5">
                              <HoverCard openDelay={200}>
                                <HoverCardTrigger asChild>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openProfileModal(item.id)
                                    }
                                    className="max-w-[220px] text-left"
                                  >
                                    <p className="text-sm font-bold leading-snug text-slate-950 hover:text-emerald-700">
                                      {getApplicantDisplayName(item)}
                                    </p>
                                    <p className="mt-0.5 text-xs text-slate-500">
                                      {item.maidReferenceCode ||
                                        item.applicationCode}{" "}
                                      · {item.profile.nationality}
                                    </p>
                                    <div className="mt-1.5 flex flex-wrap gap-1">
                                      {item.profile.strengthsTags
                                        .slice(0, 2)
                                        .map((tag) => (
                                          <span
                                            key={tag}
                                            className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600"
                                          >
                                            {tag}
                                          </span>
                                        ))}
                                    </div>
                                  </button>
                                </HoverCardTrigger>
                                <HoverCardContent
                                  align="start"
                                  className="w-[300px] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl"
                                >
                                  <div className="space-y-3">
                                    <div className="flex items-start justify-between gap-3">
                                      <div>
                                        <p className="text-sm font-bold text-slate-950">
                                          {getApplicantDisplayName(item)}
                                        </p>
                                        <p className="text-[11px] text-slate-500">
                                          {item.profile.nationality} ·{" "}
                                          {item.profile.yearsOfExperience} yrs
                                          exp
                                        </p>
                                      </div>
                                      <span
                                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-bold ${scoreTone(
                                          item.score?.score
                                        )}`}
                                      >
                                        {item.score?.score ?? 0}
                                      </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                                      {[
                                        [
                                          "Contact",
                                          item.profile.contactNumber ||
                                            "No WhatsApp",
                                        ],
                                        [
                                          "Salary",
                                          item.profile.expectedSalary ?? "N/A",
                                        ],
                                        [
                                          "Languages",
                                          item.profile.languageSkills
                                            .slice(0, 2)
                                            .join(", ") || "-",
                                        ],
                                        [
                                          "Care",
                                          `Child ${item.profile.childcareExperience} · Elderly ${item.profile.elderlyCareExperience}`,
                                        ],
                                      ].map(([label, val]) => (
                                        <div
                                          key={String(label)}
                                          className="rounded-xl bg-slate-50 p-2"
                                        >
                                          <p className="font-semibold text-slate-700">
                                            {label}
                                          </p>
                                          <p className="mt-0.5 text-slate-500">
                                            {val}
                                          </p>
                                        </div>
                                      ))}
                                    </div>
                                    <p className="text-[11px] leading-5 text-slate-600">
                                      {item.score?.explanation ||
                                        "Waiting for recruiter review."}
                                    </p>
                                  </div>
                                </HoverCardContent>
                              </HoverCard>
                            </td>

                            {/* Stage */}
                            <td className="px-4 py-3.5">
                              <Badge
                                variant="outline"
                                className={`text-[10px] ${statusTone(
                                  item.status
                                )}`}
                              >
                                {getStageDisplayLabel(item.status)}
                              </Badge>
                            </td>

                            {/* Contact */}
                            <td className="px-4 py-3.5">
                              <div className="max-w-[160px] space-y-0.5 text-xs">
                                <p className="font-semibold text-slate-800 truncate">
                                  {item.profile.contactNumber || "No WhatsApp"}
                                </p>
                                <p className="text-slate-500 truncate">
                                  {item.profile.email || "No email"}
                                </p>
                              </div>
                            </td>

                            {/* Skills */}
                            <td className="px-4 py-3.5">
                              <div className="max-w-[170px] space-y-0.5 text-xs text-slate-600">
                                <p className="truncate">
                                  {item.profile.languageSkills
                                    .slice(0, 2)
                                    .join(", ") || "No languages listed"}
                                </p>
                                <p className="text-slate-400 truncate">
                                  {item.profile.cookingSkills
                                    .slice(0, 2)
                                    .join(", ") || "No cooking skills listed"}
                                </p>
                              </div>
                            </td>

                            {/* Score */}
                            <td className="px-4 py-3.5">
                              <div className="space-y-1">
                                <span
                                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold tabular-nums ${scoreTone(
                                    item.score?.score
                                  )}`}
                                >
                                  {item.score?.score ?? 0}
                                </span>
                                <p className="text-[10px] text-slate-400">
                                  Match {item.clientMatchScore ?? 0}
                                </p>
                              </div>
                            </td>

                            {/* Profile summary */}
                            <td className="px-4 py-3.5">
                              <div className="max-w-[200px] space-y-0.5 text-xs text-slate-600">
                                <p className="font-medium text-slate-700 truncate">
                                  Salary {item.profile.expectedSalary ?? "N/A"}{" "}
                                  · {formatDate(item.appliedAt)}
                                </p>
                                <p className="text-slate-400 truncate">
                                  {item.profile.yearsOfExperience} yrs ·{" "}
                                  {item.profile.childcareExperience} child ·{" "}
                                  {item.profile.elderlyCareExperience} elderly
                                </p>
                              </div>
                            </td>

                            {/* Next action */}
                            <td className="px-4 py-3.5">
                              <div className="max-w-[200px] text-xs">
                                <p className="font-semibold text-slate-900">
                                  {nextAction.title}
                                </p>
                                <p className="mt-0.5 line-clamp-2 text-slate-500">
                                  {nextAction.detail}
                                </p>
                              </div>
                            </td>

                            {/* Actions */}
                            <td className="px-4 py-3.5">
                              <div className="flex min-w-[200px] flex-wrap gap-1.5">
                                {nextAction.nextStage ? (
                                  <Button
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={() =>
                                      stageMutation.mutate({
                                        applicationId: item.id,
                                        stage: nextAction.nextStage!,
                                      })
                                    }
                                    disabled={stageMutation.isPending}
                                  >
                                    {nextAction.cta}
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs"
                                    onClick={() => openProfileModal(item.id)}
                                  >
                                    {nextAction.cta}
                                  </Button>
                                )}
                                {item.status === READY_TO_POST_PUBLIC_STAGE && (
                                  <Button
                                    asChild
                                    size="sm"
                                    className="h-7 text-xs bg-fuchsia-600 hover:bg-fuchsia-700"
                                  >
                                    <Link
                                      to={buildPublicProfileSetupPath(item)}
                                    >
                                      Public Maid
                                    </Link>
                                  </Button>
                                )}
                                {makeWhatsAppHref(
                                  item.profile.contactNumber
                                ) && (
                                  <Button
                                    asChild
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs"
                                  >
                                    <a
                                      href={makeWhatsAppHref(
                                        item.profile.contactNumber
                                      )}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      <MessageCircle className="mr-1 h-3 w-3" />
                                      WA
                                    </a>
                                  </Button>
                                )}
                                {item.profile.email && (
                                  <Button
                                    asChild
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs"
                                  >
                                    <a href={`mailto:${item.profile.email}`}>
                                      <Mail className="mr-1 h-3 w-3" />
                                      Email
                                    </a>
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-slate-500">
                    Showing{" "}
                    {(currentPage - 1) * ATS_TABLE_PAGE_SIZE + 1}–
                    {Math.min(
                      currentPage * ATS_TABLE_PAGE_SIZE,
                      displayedApplications.length
                    )}{" "}
                    of {displayedApplications.length}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() =>
                        setCurrentPage((p) => Math.max(p - 1, 1))
                      }
                      disabled={currentPage === 1}
                    >
                      Prev
                    </Button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                      (page) => (
                        <button
                          key={page}
                          type="button"
                          onClick={() => setCurrentPage(page)}
                          className={`h-7 min-w-7 rounded-lg px-2 text-xs font-semibold transition ${
                            page === currentPage
                              ? "bg-emerald-600 text-white"
                              : "border border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:text-emerald-700"
                          }`}
                        >
                          {page}
                        </button>
                      )
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() =>
                        setCurrentPage((p) => Math.min(p + 1, totalPages))
                      }
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
      </section>

      {/* ── Profile Modal ─────────────────────────────────────────────────── */}
      <Dialog open={profileModalOpen} onOpenChange={setProfileModalOpen}>
        {/*
          Key fixes:
          - flex + flex-col so children fill height predictably
          - max-h-[90vh] + h-[90vh] to give it a fixed, known height
          - inner panels use flex-1 + overflow-hidden / overflow-y-auto correctly
          - [&>button]:hidden to suppress DialogContent's default close button
            (we render our own)
        */}
        <DialogContent className="flex h-[90vh] max-h-[90vh] max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 shadow-[0_24px_64px_rgba(15,23,42,0.2)] [&>button]:hidden">
          {/* Modal header — always visible, never scrolls */}
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 bg-white px-5 py-3">
            <div className="min-w-0 flex-1">
              <DialogTitle className="truncate text-base font-black leading-tight text-slate-950">
                {String(
                  detail?.profile?.fullName ||
                    detail?.application.profile.fullName ||
                    "Applicant Profile"
                )}
              </DialogTitle>
              <DialogDescription className="mt-0.5 truncate text-[11px] text-slate-400">
                {detail
                  ? `${String(
                      detail.profile?.nationality ||
                        detail.application.profile.nationality
                    )} · ${String(
                      detail.application.applicationCode
                    )} · ${String(detail.application.status)}`
                  : "Full recruiter view — documents, scoring, and quick actions."}
              </DialogDescription>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {detail && (
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-sm font-black tabular-nums ${scoreTone(
                    detail.score?.score
                  )}`}
                >
                  {detail.score?.score ?? 0}
                </span>
              )}
              {detail?.application.status === READY_TO_POST_PUBLIC_STAGE && (
                <Button asChild size="sm" className="h-8 text-xs bg-fuchsia-600 hover:bg-fuchsia-700">
                  <Link to={buildPublicProfileSetupPath(detail.application)}>
                    Configure Public Profile
                  </Link>
                </Button>
              )}
              <button
                type="button"
                onClick={() => setProfileModalOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Modal body — three-panel layout, fills remaining height */}
          <div className="flex min-h-0 flex-1 overflow-hidden">
            {/* Left: contact summary + document list */}
            <div className="flex w-64 shrink-0 flex-col overflow-hidden border-r border-slate-100 bg-slate-50">
              {/* Contact quick-links — fixed */}
              {detail && (
                <div className="shrink-0 space-y-2 border-b border-slate-100 bg-white p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Quick contact
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    <a
                      href={
                        makeWhatsAppHref(
                          String(
                            detail.profile?.contactNumber ||
                              detail.application.profile.contactNumber ||
                              ""
                          )
                        ) || undefined
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-xl border bg-slate-50 p-2.5 text-[11px] transition hover:border-emerald-300"
                    >
                      <p className="flex items-center gap-1 font-semibold text-slate-700">
                        <MessageCircle className="h-3 w-3 text-emerald-500" />
                        WhatsApp
                      </p>
                      <p className="mt-0.5 truncate text-slate-500">
                        {String(
                          detail.profile?.contactNumber ||
                            detail.application.profile.contactNumber ||
                            "–"
                        )}
                      </p>
                    </a>
                    <a
                      href={
                        detail.profile?.email
                          ? `mailto:${String(detail.profile.email)}`
                          : undefined
                      }
                      className="rounded-xl border bg-slate-50 p-2.5 text-[11px] transition hover:border-emerald-300"
                    >
                      <p className="flex items-center gap-1 font-semibold text-slate-700">
                        <Mail className="h-3 w-3 text-emerald-500" />
                        Email
                      </p>
                      <p className="mt-0.5 truncate text-slate-500">
                        {String(detail.profile?.email || "–")}
                      </p>
                    </a>
                  </div>
                  {detail.score?.explanation && (
                    <p className="text-[11px] leading-4 text-slate-500 line-clamp-3">
                      {detail.score.explanation}
                    </p>
                  )}
                </div>
              )}

              {/* Document list — scrollable */}
              <div className="min-h-0 flex-1 overflow-y-auto p-3">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Documents ({documents.length})
                </p>
                {documents.length === 0 ? (
                  <p className="text-[11px] text-slate-400">
                    No documents uploaded yet.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {documents.map((doc, index) => {
                      const kind = getDocumentKind(doc.name, doc.url);
                      const isActive = activeDocumentIndex === index;
                      return (
                        <button
                          key={doc.id}
                          type="button"
                          onClick={() => setActiveDocumentIndex(index)}
                          className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left transition ${
                            isActive
                              ? "border-emerald-400 bg-emerald-50"
                              : "border-slate-200 bg-white hover:border-emerald-200 hover:bg-slate-50"
                          }`}
                        >
                          <div
                            className={`shrink-0 rounded-lg p-1.5 ${
                              isActive
                                ? "bg-emerald-100 text-emerald-600"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {kind === "image" ? (
                              <ImageIcon className="h-3 w-3" />
                            ) : kind === "video" ? (
                              <Video className="h-3 w-3" />
                            ) : (
                              <FileText className="h-3 w-3" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[11px] font-semibold text-slate-900">
                              {doc.name}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {doc.type} · {doc.status}
                            </p>
                          </div>
                          <span
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                              isActive
                                ? "bg-emerald-500 text-white"
                                : "bg-slate-100 text-slate-400"
                            }`}
                          >
                            {index + 1}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Center: document viewer */}
            <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
              {/* Doc nav bar — fixed */}
              <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-white px-4 py-2">
                <p className="min-w-0 flex-1 truncate text-[11px] text-slate-500">
                  {activeDocument
                    ? `${activeDocumentIndex + 1} / ${documents.length} — ${activeDocument.name}`
                    : "Select a document from the list"}
                </p>
                <div className="ml-2 flex shrink-0 gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() =>
                      setActiveDocumentIndex((c) => Math.max(c - 1, 0))
                    }
                    disabled={activeDocumentIndex <= 0}
                  >
                    <MoveLeft className="mr-1 h-3 w-3" />
                    Prev
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() =>
                      setActiveDocumentIndex((c) =>
                        Math.min(c + 1, documents.length - 1)
                      )
                    }
                    disabled={
                      documents.length === 0 ||
                      activeDocumentIndex >= documents.length - 1
                    }
                  >
                    Next
                    <MoveRight className="ml-1 h-3 w-3" />
                  </Button>
                  {activeDocument?.url && (
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                    >
                      <a
                        href={activeDocument.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <MonitorUp className="mr-1 h-3 w-3" />
                        Open
                      </a>
                    </Button>
                  )}
                </div>
              </div>

              {/* Viewer area — fills remaining height */}
              <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-slate-900 p-4">
                {!activeDocument ? (
                  <div className="text-center text-slate-500">
                    <FileText className="mx-auto h-10 w-10 opacity-25" />
                    <p className="mt-3 text-sm">
                      Select a document from the list
                    </p>
                  </div>
                ) : canPreviewActiveDocument ? (
                  activeDocumentKind === "image" ? (
                    <img
                      src={activeDocument.url}
                      alt={activeDocument.name}
                      className="max-h-full max-w-full rounded-xl object-contain"
                    />
                  ) : activeDocumentKind === "video" ? (
                    <video
                      src={activeDocument.url}
                      controls
                      className="max-h-full max-w-full rounded-xl"
                    />
                  ) : (
                    <iframe
                      title={activeDocument.name}
                      src={activeDocument.url}
                      className="h-full w-full rounded-xl bg-white"
                    />
                  )
                ) : (
                  <div className="max-w-xs rounded-2xl bg-white p-6 text-center shadow-lg">
                    <FileText className="mx-auto h-10 w-10 text-slate-300" />
                    <h4 className="mt-3 text-sm font-bold text-slate-900">
                      {activeDocument.name}
                    </h4>
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      This file type can't be previewed inline. Open it in a
                      new tab to review.
                    </p>
                    {activeDocument.url && (
                      <Button asChild className="mt-4 h-8 text-xs">
                        <a
                          href={activeDocument.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <ExternalLink className="mr-1.5 h-3 w-3" />
                          Open File
                        </a>
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right: score breakdown + history */}
            <div className="flex w-56 shrink-0 flex-col overflow-hidden border-l border-slate-100 bg-white">
              <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-4">
                {detail ? (
                  <>
                    {/* Score breakdown */}
                    {scoreFactors.length > 0 && (
                      <div className="rounded-xl border border-slate-100 p-3">
                        <p className="mb-2.5 text-xs font-semibold text-slate-700">
                          Score Breakdown
                        </p>
                        <div className="space-y-2.5">
                          {scoreFactors.map(([label, value]) => (
                            <ScoreBar
                              key={String(label)}
                              label={String(label)}
                              value={Number(value)}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Strengths / Weaknesses */}
                    {((detail.score?.strengths ?? []).length > 0 ||
                      (detail.score?.weaknesses ?? []).length > 0) && (
                      <div className="space-y-3 rounded-xl border border-slate-100 p-3">
                        {(detail.score?.strengths ?? []).length > 0 && (
                          <div>
                            <p className="mb-1.5 text-xs font-semibold text-slate-700">
                              Strengths
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {(detail.score?.strengths ?? []).map((s) => (
                                <span
                                  key={s}
                                  className="rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[10px] text-emerald-700"
                                >
                                  {s}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {(detail.score?.weaknesses ?? []).length > 0 && (
                          <div>
                            <p className="mb-1.5 text-xs font-semibold text-slate-700">
                              To Improve
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {(detail.score?.weaknesses ?? []).map((w) => (
                                <span
                                  key={w}
                                  className="rounded-full border border-rose-100 bg-rose-50 px-2 py-0.5 text-[10px] text-rose-600"
                                >
                                  {w}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Status history */}
                    <div className="rounded-xl border border-slate-100 p-3">
                      <p className="mb-2 text-xs font-semibold text-slate-700">
                        Status History
                      </p>
                      <div className="space-y-2">
                        {detail.history.map((item) => (
                          <div
                            key={item.id}
                            className="rounded-lg bg-slate-50 px-2.5 py-2 text-[11px]"
                          >
                            <div className="font-semibold text-slate-800 leading-snug">
                              {item.fromStage
                                ? `${item.fromStage} → ${item.toStage}`
                                : item.toStage}
                            </div>
                            <div className="mt-0.5 text-slate-400">
                              {item.actor} · {formatDate(item.createdAt)}
                            </div>
                            {item.reason && (
                              <div className="mt-0.5 text-slate-500">
                                {item.reason}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-slate-400">Loading profile…</p>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AtsRecruitmentPage;