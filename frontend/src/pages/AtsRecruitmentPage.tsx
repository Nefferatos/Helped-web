import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";
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

type AtsDocument = {
  id: string;
  type: string;
  name: string;
  status: string;
  required: boolean;
  url?: string;
};

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
    description: "New applicants land here from the public portal. Check profile completeness, WhatsApp access, and the qualification score first.",
    stage: "New Applicant -> Documents Submitted",
    icon: MonitorUp,
  },
  {
    title: "2. Validate Profile Quality",
    description: "Open the profile, review work history, languages, salary expectations, and attached files before spending time on outreach.",
    stage: "Resume Parsed",
    icon: FileText,
  },
  {
    title: "3. Contact & Screen",
    description: "Reach out by WhatsApp or email, confirm availability, and move serious candidates into interview and verification stages quickly.",
    stage: "Screening Interview -> Background Check",
    icon: MessageCircle,
  },
  {
    title: "4. Approve & Market",
    description: "Approve only candidates with verified details, then move them into public profile setup before anything is posted for employers or clients.",
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
  { label: "WhatsApp + Score 70+", key: "whatsapp-70", filter: { hasWhatsApp: true, minScore: 70 } },
  { label: "Childcare Shortlist", key: "childcare", filter: { minExperience: 3, childcareExperience: true, hasWhatsApp: true } },
  { label: "Elderly Care", key: "elderly", filter: { elderlyCareExperience: true, hasWhatsApp: true } },
  { label: "Available Now", key: "available", filter: { availableImmediately: true, hasWhatsApp: true } },
  { label: "Ready to Configure", key: "market", filter: { status: ["Approved", READY_TO_POST_PUBLIC_STAGE], hasWhatsApp: true } },
] as const;

const ALL_STAGE_TAB = "All Applicants";
const ATS_GUIDE_STORAGE_KEY = "ats-recruiter-guide-hidden";
const ATS_TABLE_PAGE_SIZE = 15;

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
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
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
  item.profile.fullName?.trim() || item.maidReferenceCode || item.applicationCode || "Unnamed applicant";

const getStageDisplayLabel = (stage: string) => stage;

const getNextApplicantAction = (item: AtsApplicationListItem) => {
  const hasDirectContact = Boolean(item.profile.contactNumber || item.profile.email);

  switch (item.status) {
    case "New Applicant":
      return {
        title: "Review intake",
        detail: "Confirm profile completeness, contact access, and submission quality before moving forward.",
        cta: "Mark documents received",
        nextStage: "Documents Submitted",
      };
    case "Documents Submitted":
      return {
        title: "Validate documents",
        detail: "Check biodata, file uploads, and work history so the profile is ready for recruiter review.",
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
        detail: "Capture fit, availability, and salary alignment immediately after the first contact.",
        cta: "Move to background check",
        nextStage: "Background Check",
      };
    case "Background Check":
      return {
        title: "Finish verification",
        detail: "Approve only after references, prior employment, and key claims have been reviewed.",
        cta: "Approve candidate",
        nextStage: "Approved",
      };
    case "Approved":
      return {
        title: "Configure public profile",
        detail: "This candidate is qualified. Move the profile into the public-profile setup stage so the agency can configure it before publishing.",
        cta: "Move to Profile Setup",
        nextStage: READY_TO_POST_PUBLIC_STAGE,
      };
    case READY_TO_POST_PUBLIC_STAGE:
      return { title: "Awaiting public profile setup", detail: "This candidate is ready for the agency to configure the public profile before it is posted live.", cta: "Open profile" };
    case "Placed":
      return { title: "Placement complete", detail: "No new shortlist action is needed unless there is a follow-up admin task to finish.", cta: "Open profile" };
    case "Rejected":
      return { title: "Closed out", detail: "Keep the record for history and reopen only when there is a valid business reason.", cta: "Open profile" };
    default:
      return { title: "Review applicant", detail: "Open the profile and decide the next recruiter action.", cta: "Open profile" };
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

const ScoreBar = ({ label, value }: { label: string; value: number }) => (
  <div>
    <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
      <span className="font-medium">{label}</span>
      <span className="font-semibold tabular-nums">{value}%</span>
    </div>
    <div className="h-1.5 rounded-full bg-slate-100">
      <div
        className="h-1.5 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-500"
        style={{ width: `${value}%` }}
      />
    </div>
  </div>
);

const AtsRecruitmentPage = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
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

  const dashboardQuery = useQuery({ queryKey: ["ats-dashboard"], queryFn: fetchAtsDashboard });
  const applicationsQuery = useQuery({
    queryKey: ["ats-applications", search, sort, JSON.stringify(filters)],
    queryFn: () => fetchAtsApplications({ q: search, filters, sort, page: 1, pageSize: 120 }),
  });
  const presetsQuery = useQuery({ queryKey: ["ats-presets"], queryFn: fetchAtsPresets });
  const detailQuery = useQuery({
    queryKey: ["ats-application", selectedId],
    enabled: Boolean(selectedId),
    queryFn: () => fetchAtsApplication(selectedId!),
  });

  const stageMutation = useMutation({
    mutationFn: ({ applicationId, stage }: { applicationId: string; stage: string }) =>
      updateAtsStage(applicationId, stage),
    onSuccess: () => {
      toast.success("Candidate stage updated");
      void queryClient.invalidateQueries({ queryKey: ["ats-dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["ats-applications"] });
      if (selectedId) void queryClient.invalidateQueries({ queryKey: ["ats-application", selectedId] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to update stage"),
  });

  const bulkMutation = useMutation({
    mutationFn: bulkAtsAction,
    onSuccess: (data) => {
      toast.success(`Updated ${data.updated} candidates`);
      setSelectedIds([]);
      void queryClient.invalidateQueries({ queryKey: ["ats-dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["ats-applications"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Bulk action failed"),
  });

  const dashboard = dashboardQuery.data;
  const applications = useMemo(() => applicationsQuery.data?.data ?? [], [applicationsQuery.data?.data]);
  const detail = detailQuery.data;
  const documents = (detail?.documents ?? []) as AtsDocument[];

  const selectedCount = selectedIds.length;
  const activeFilterCount = useMemo(
    () => Object.entries(filters).filter(([, value]) => (Array.isArray(value) ? value.length > 0 : Boolean(value))).length,
    [filters],
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
    () => (activeStageTab === ALL_STAGE_TAB ? applications : applications.filter((item) => item.status === activeStageTab)),
    [activeStageTab, applications],
  );
  const totalPages = Math.max(1, Math.ceil(displayedApplications.length / ATS_TABLE_PAGE_SIZE));
  const paginatedApplications = useMemo(() => {
    const start = (currentPage - 1) * ATS_TABLE_PAGE_SIZE;
    return displayedApplications.slice(start, start + ATS_TABLE_PAGE_SIZE);
  }, [currentPage, displayedApplications]);

  const visibleSelectedCount = useMemo(
    () => paginatedApplications.filter((item) => selectedIds.includes(item.id)).length,
    [paginatedApplications, selectedIds],
  );
  const activeGuide = walkthroughSteps[activeGuideStep];
  const guideProgress = ((activeGuideStep + 1) / walkthroughSteps.length) * 100;

  const automatedRecommendations = useMemo(
    () => [
      {
        key: "auto-ready",
        label: "High Score Ready",
        detail: `${applications.filter((item) => (item.score?.score ?? 0) >= 80 && item.status !== "Placed" && item.status !== "Rejected").length} active applicants scoring 80+`,
        filter: { minScore: 80, status: ["Resume Parsed", "Screening Interview", "Background Check", "Approved", READY_TO_POST_PUBLIC_STAGE] },
      },
      {
        key: "auto-screen",
        label: "Interview Queue",
        detail: `${applications.filter((item) => item.status === "Resume Parsed" || item.status === "Screening Interview").length} applicants waiting for recruiter follow-up`,
        filter: { status: ["Resume Parsed", "Screening Interview"], hasWhatsApp: true },
      },
      {
        key: "auto-market",
        label: "Public Posting Queue",
        detail: `${applications.filter((item) => item.status === "Approved" || item.status === READY_TO_POST_PUBLIC_STAGE).length} applicants waiting for public profile setup before posting`,
        filter: { status: ["Approved", READY_TO_POST_PUBLIC_STAGE] },
      },
    ],
    [applications],
  );

  const toggleSelect = (id: string) =>
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));

  const toggleStageFilter = (stage: string) =>
    setFilters((current) => {
      const currentStages = Array.isArray(current.status) ? (current.status as string[]) : [];
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
      // Ignore localStorage access issues and just close the dialog.
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
  const activeDocumentKind = getDocumentKind(activeDocument?.name, activeDocument?.url);
  const canPreviewActiveDocument = Boolean(activeDocument?.url && ["image", "pdf", "video"].includes(activeDocumentKind));

  useEffect(() => {
    setActiveDocumentIndex(0);
  }, [selectedId]);

  useEffect(() => {
    if (activeDocumentIndex >= documents.length && documents.length > 0) {
      setActiveDocumentIndex(documents.length - 1);
    }
  }, [activeDocumentIndex, documents.length]);

  useEffect(() => {
    setSelectedIds((current) => current.filter((id) => displayedApplications.some((item) => item.id === id)));
  }, [displayedApplications]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeStageTab, filters, search, sort]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    try {
      const shouldHideGuide = window.localStorage.getItem(ATS_GUIDE_STORAGE_KEY) === "1";
      setGuideDoNotShowAgain(shouldHideGuide);
      setShowGuide(!shouldHideGuide);
    } catch {
      setShowGuide(true);
    }
  }, []);

  const selectAllVisible = () =>
    setSelectedIds((current) => Array.from(new Set([...current, ...paginatedApplications.map((item) => item.id)])));
  const clearSelection = () => setSelectedIds([]);

  return (
    <div className="space-y-5">
      <Dialog open={showGuide} onOpenChange={(open) => (!open ? closeGuide() : openGuide())}>
        <DialogContent className="max-h-[92vh] max-w-5xl overflow-hidden rounded-[28px] border border-slate-800 bg-[#0a1020] p-0 text-slate-100 shadow-[0_32px_90px_rgba(2,6,23,0.7)]">
          <div className="border-b border-slate-800 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.12),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.12),_transparent_30%),linear-gradient(180deg,_rgba(15,23,42,0.96),_rgba(10,16,32,0.96))] p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl font-black text-white">
                <Lightbulb className="h-5 w-5" />
                Recruiter Walkthrough
              </DialogTitle>
              <DialogDescription className="max-w-2xl text-slate-400">
                A quick guided tour for how recruiters should move applicants from intake to public profile setup. You can reopen this any time from the tutorial button.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                <span>
                  {activeGuide.eyebrow} of {walkthroughSteps.length}
                </span>
                <span>{Math.round(guideProgress)}% complete</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-400 via-cyan-400 to-emerald-400 transition-all duration-300"
                  style={{ width: `${guideProgress}%` }}
                />
              </div>
            </div>
          </div>
          <div className="grid max-h-[calc(92vh-126px)] gap-0 overflow-hidden lg:grid-cols-[280px_minmax(0,1fr)]">
            <div className="border-b border-slate-800 bg-[#0d1427] p-5 lg:border-b-0 lg:border-r">
              <div className="space-y-3">
                {applicantFlowGuide.map((step, index) => {
                  const isActive = index === activeGuideStep;
                  const isComplete = index < activeGuideStep;
                  return (
                    <button
                      key={step.title}
                      type="button"
                      onClick={() => setActiveGuideStep(index)}
                      className={`flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition-all ${
                        isActive
                          ? "border-sky-500/50 bg-slate-900 shadow-[0_0_0_1px_rgba(56,189,248,0.12)]"
                          : "border-transparent bg-transparent hover:border-slate-700 hover:bg-slate-900/70"
                      }`}
                    >
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-2xl border ${
                          isActive
                            ? "border-sky-400/40 bg-sky-500/20 text-sky-300"
                            : isComplete
                              ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-300"
                              : "border-slate-700 bg-slate-800 text-slate-400"
                        }`}
                      >
                        <step.icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">{step.stage}</p>
                        <p className="mt-1 text-sm font-bold text-slate-100">{step.title}</p>
                        <p className="mt-1 text-xs leading-5 text-slate-400">{walkthroughSteps[index]?.helper}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-5 overflow-y-auto bg-[#0a1020] p-6">
              <div className="rounded-[28px] border border-slate-800 bg-[radial-gradient(circle_at_top_right,_rgba(56,189,248,0.14),_transparent_30%),radial-gradient(circle_at_bottom_left,_rgba(16,185,129,0.14),_transparent_25%),linear-gradient(180deg,_rgba(15,23,42,0.95),_rgba(17,24,39,0.95))] p-5">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                  <div className="max-w-2xl">
                    <p className="text-[11px] font-black uppercase tracking-[0.28em] text-cyan-300">{activeGuide.eyebrow}</p>
                    <h3 className="mt-2 text-2xl font-black tracking-tight text-white">{activeGuide.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-slate-300">{activeGuide.summary}</p>
                  </div>
                  <div className="rounded-[26px] border border-slate-700 bg-slate-900/70 px-5 py-4 shadow-[0_16px_40px_rgba(2,6,23,0.35)]">
                    <div className="flex h-28 w-52 items-center justify-center rounded-[22px] border border-sky-400/20 bg-[radial-gradient(circle,_rgba(56,189,248,0.2),_transparent_55%),linear-gradient(180deg,_rgba(30,41,59,0.9),_rgba(15,23,42,0.9))]">
                      <div className="relative">
                        <div className="absolute inset-0 translate-y-5 rounded-full bg-cyan-400/20 blur-2xl" />
                        <div className="relative rounded-[22px] border border-sky-300/30 bg-gradient-to-br from-sky-400/25 via-indigo-400/15 to-emerald-400/20 p-5 shadow-[0_18px_50px_rgba(59,130,246,0.25)]">
                          <Sparkles className="absolute -right-3 -top-3 h-5 w-5 text-cyan-300" />
                          <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                            <FileText className="h-7 w-7 text-sky-300" />
                          </div>
                        </div>
                      </div>
                    </div>
                    <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">Focus now</p>
                    <div className="mt-3 flex max-w-xs flex-wrap gap-2">
                      {activeGuide.chips.map((chip) => (
                        <span key={chip} className="rounded-full border border-sky-400/20 bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-200">
                          {chip}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 shadow-[0_16px_40px_rgba(2,6,23,0.25)]">
                  <p className="text-sm font-bold text-white">What to do in this step</p>
                  <div className="mt-4 space-y-3">
                    {activeGuide.points.map((item) => (
                      <div key={item} className="flex items-start gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-3 text-sm text-slate-300">
                        <div className="mt-0.5 rounded-full bg-emerald-500/15 p-1 text-emerald-300">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </div>
                        <span className="leading-6">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-5">
                  <p className="text-sm font-bold text-white">What you'll learn</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    {["Search", "Filter", "Open profile", "Check docs", "Contact", "Update stage", "Configure profile"].map((label) => (
                      <div key={label} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
                        <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500/15 text-sky-300">
                          <Sparkles className="h-4 w-4" />
                        </div>
                        <p className="text-xs font-semibold text-slate-100">{label}</p>
                        <p className="mt-1 text-[11px] leading-5 text-slate-400">
                          {label === "Search" && "Navigate the dashboard to find active applicants fast."}
                          {label === "Filter" && "Use shortlist filters to narrow down better-fit candidates."}
                          {label === "Open profile" && "Inspect candidate details before taking action."}
                          {label === "Check docs" && "Verify documents and profile quality in one pass."}
                          {label === "Contact" && "Reach out quickly using built-in recruiter shortcuts."}
                          {label === "Update stage" && "Keep the pipeline current after every action."}
                          {label === "Configure profile" && "Move approved candidates into public profile setup before posting anything live."}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 rounded-2xl border border-indigo-500/20 bg-indigo-500/10 p-4">
                    <div className="flex items-center gap-2">
                      <div className="rounded-xl bg-indigo-400/15 p-2 text-indigo-300">
                        <Lightbulb className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">Tip</p>
                        <p className="text-xs text-slate-400">You can reopen this walkthrough any time from the tutorial button.</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Daily checklist</p>
                    <div className="mt-3 space-y-2">
                      {processChecklist.map((item) => (
                        <div key={item} className="flex items-start gap-2 text-xs leading-5 text-slate-300">
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-none text-emerald-400" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4 border-t border-slate-800 pt-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <label className="flex items-center gap-2 text-sm text-slate-300">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-emerald-500 focus:ring-emerald-400"
                      checked={guideDoNotShowAgain}
                      onChange={(e) => setGuideDoNotShowAgain(e.target.checked)}
                    />
                    Do not show again
                  </label>
                  <Button variant="outline" className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-white" onClick={() => setGuideDoNotShowAgain(false)}>
                    Always show on open
                  </Button>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-xs text-slate-500">
                    Step {activeGuideStep + 1} of {walkthroughSteps.length}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-white"
                      onClick={() => setActiveGuideStep((current) => Math.max(current - 1, 0))}
                      disabled={activeGuideStep === 0}
                    >
                      <MoveLeft className="mr-1.5 h-4 w-4" />
                      Back
                    </Button>
                    {activeGuideStep < walkthroughSteps.length - 1 ? (
                      <Button className="bg-gradient-to-r from-sky-500 to-emerald-500 text-slate-950 hover:from-sky-400 hover:to-emerald-400" onClick={() => setActiveGuideStep((current) => Math.min(current + 1, walkthroughSteps.length - 1))}>
                        Next step
                        <MoveRight className="ml-1.5 h-4 w-4" />
                      </Button>
                    ) : (
                      <Button className="bg-gradient-to-r from-sky-500 to-emerald-500 text-slate-950 hover:from-sky-400 hover:to-emerald-400" onClick={closeGuide}>Start recruiting</Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <section className="rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.14),_transparent_42%),linear-gradient(135deg,_#ffffff,_#f8fafc)] p-5 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-emerald-600">Recruitment ATS</p>
              <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Maid Applicant Pipeline</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Review applicants faster with a cleaner shortlist, guided filters, and responsive profile access.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
              {[
                { label: "Total Applicants", value: dashboard?.totalApplicants ?? 0, icon: Users, color: "text-sky-700 bg-sky-100" },
                { label: "Approved", value: dashboard?.approvedCandidates ?? 0, icon: ClipboardCheck, color: "text-violet-700 bg-violet-100" },
                { label: "Ready for Matching", value: dashboard?.readyForMatching ?? 0, icon: Sparkles, color: "text-fuchsia-700 bg-fuchsia-100" },
                { label: "Placed", value: dashboard?.placedHelpers ?? 0, icon: BriefcaseBusiness, color: "text-teal-700 bg-teal-100" },
                { label: "Avg Score", value: dashboard?.averageQualificationScore ?? 0, icon: Brain, color: "text-emerald-700 bg-emerald-100" },
              ].map((metric) => (
                <div key={metric.label} className="min-w-0 rounded-2xl border border-white/70 bg-white/90 p-3 shadow-sm backdrop-blur">
                  <div className="flex items-start justify-between gap-2">
                    <div className={`rounded-xl p-2 ${metric.color}`}>
                      <metric.icon className="h-3.5 w-3.5" />
                    </div>
                    <p className="text-right text-lg font-black leading-none text-slate-950 tabular-nums">{metric.value}</p>
                  </div>
                  <p className="mt-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">{metric.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 xl:max-w-xs xl:justify-end">
            <Button variant="outline" size="sm" className="bg-white/80" onClick={openGuide}>
              <Lightbulb className="mr-1.5 h-3.5 w-3.5" />
              Tutorial
            </Button>
            <Button asChild variant="outline" size="sm" className="bg-white/80">
              <Link to="/apply-as-maid">Open Portal</Link>
            </Button>
            <Button
              size="sm"
              onClick={() =>
                stageMutation.mutate({
                  applicationId: selectedId || applications[0]?.id || "",
                  stage: READY_TO_POST_PUBLIC_STAGE,
                })
              }
              disabled={!selectedId && !applications.length}
            >
              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
              Move to Profile Setup
            </Button>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <Card className="overflow-hidden border-0 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  className="h-11 rounded-xl border-slate-200 bg-slate-50 pl-9 pr-10 text-sm"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search applicant name, nationality, language, email, or WhatsApp"
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
                  className="h-11 min-w-[180px] rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                >
                  <option value="qualificationScore:desc">Best score first</option>
                  <option value="applicationDate:desc">Newest first</option>
                  <option value="applicationDate:asc">Oldest first</option>
                  <option value="experience:desc">Most experience</option>
                  <option value="clientMatchScore:desc">Best client match</option>
                  <option value="expectedSalary:asc">Lowest salary</option>
                  <option value="name:asc">Name A-Z</option>
                </select>

                <Button variant="outline" className="h-11 rounded-xl" onClick={() => setShowFilters((current) => !current)}>
                  <Filter className="mr-1.5 h-4 w-4" />
                  Filters
                  <Badge className="ml-2 border-0 bg-emerald-100 px-1.5 text-[10px] text-emerald-700">
                    {activeFilterCount}
                  </Badge>
                  <ChevronDown className={`ml-2 h-4 w-4 transition-transform ${showFilters ? "rotate-180" : ""}`} />
                </Button>
              </div>
            </div>

            {showFilters && (
              <div className="mt-4 space-y-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                <div>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Sample filters</p>
                    {(activeFilterCount > 0 || search) && (
                      <button
                        type="button"
                        onClick={clearAllFilters}
                        className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-600"
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
                          onClick={() => handleQuickFilter(key, filter as Record<string, unknown>)}
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

                <div>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">Automated recommendations</p>
                  <div className="grid gap-2 lg:grid-cols-3">
                    {automatedRecommendations.map((recommendation) => (
                      <button
                        key={recommendation.key}
                        type="button"
                        onClick={() => {
                          setActiveQuickFilter(recommendation.key);
                          setFilters(recommendation.filter);
                        }}
                        className="rounded-2xl border border-slate-200 bg-white p-3 text-left transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-sm"
                      >
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-emerald-500" />
                          <span className="text-sm font-semibold text-slate-900">{recommendation.label}</span>
                        </div>
                        <p className="mt-2 text-xs leading-5 text-slate-500">{recommendation.detail}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowMoreFilters((current) => !current)}>
                    <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" />
                    {showMoreFilters ? "Hide more filters" : "Add more filters"}
                  </Button>
                  {(presetsQuery.data?.presets ?? []).length > 0 && (
                    <span className="text-xs text-slate-500">Saved presets are available below.</span>
                  )}
                </div>

                {showMoreFilters && (
                  <div className="space-y-4 border-t border-slate-200 pt-4">
                    <div>
                      <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">Pipeline stages</p>
                      <div className="flex flex-wrap gap-2">
                        {pipelineStages.map((stage) => {
                          const active = Array.isArray(filters.status) && (filters.status as string[]).includes(stage);
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
                              <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${active ? "bg-emerald-500" : "bg-slate-100 text-slate-500"}`}>
                                {count}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {(presetsQuery.data?.presets ?? []).length > 0 && (
                      <div>
                        <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">Saved presets</p>
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

          <div className="border-b border-slate-100 bg-[linear-gradient(180deg,_#ffffff,_#f8fafc)] px-4 py-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-bold text-slate-900">Applicants by stage</p>
                <p className="text-xs text-slate-500">Table view for faster scanning, bulk selection, and quick recruiter actions.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
                  {displayedApplications.length} visible
                </Badge>
                {selectedCount > 0 && (
                  <Badge className="border-0 bg-emerald-600 text-white">{visibleSelectedCount} selected</Badge>
                )}
              </div>
            </div>

            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
              {[ALL_STAGE_TAB, ...pipelineStages].map((stage) => {
                const isActive = activeStageTab === stage;
                const count = stage === ALL_STAGE_TAB ? applications.length : grouped.get(stage)?.length ?? 0;

                return (
                  <button
                    key={stage}
                    type="button"
                    onClick={() => setActiveStageTab(stage)}
                    className={`inline-flex flex-none items-center gap-2 rounded-2xl border px-4 py-2 text-xs font-semibold transition-all ${
                      isActive
                        ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
                        : "border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:text-emerald-700"
                    }`}
                  >
                    <span>{getStageDisplayLabel(stage)}</span>
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${isActive ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-500"}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex items-center gap-3 text-sm font-semibold text-slate-900">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-400"
                checked={visibleSelectedCount === displayedApplications.length && displayedApplications.length > 0}
                onChange={() => (visibleSelectedCount === displayedApplications.length ? clearSelection() : selectAllVisible())}
              />
              <span>{getStageDisplayLabel(activeStageTab)}</span>
              <span className="text-xs font-normal text-slate-500">
                {displayedApplications.length} applicants in this view · Page {currentPage} of {totalPages}
              </span>
            </label>

            {visibleSelectedCount > 0 && (
              <div className="flex flex-wrap gap-2">
                {([
                  { label: "Approve", action: "approve" },
                  { label: "Assign Interview", action: "assign_interview" },
                  { label: "Request Docs", action: "request_documents" },
                  { label: "Reject", action: "reject" },
                ] as const).map(({ label, action }) => (
                  <Button
                    key={action}
                    size="sm"
                    variant={action === "reject" ? "destructive" : "outline"}
                    className="h-8 text-xs"
                    onClick={() => bulkMutation.mutate({ applicationIds: selectedIds, action })}
                    disabled={bulkMutation.isPending}
                  >
                    {label}
                  </Button>
                ))}
                <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={clearSelection}>
                  <X className="mr-1 h-3 w-3" />
                  Deselect
                </Button>
              </div>
            )}
          </div>

          <div className="p-4">
            {displayedApplications.length === 0 ? (
              <div className="flex min-h-[240px] flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-slate-200 bg-slate-50 text-slate-400">
                <Users className="h-8 w-8 opacity-30" />
                <p className="text-sm font-medium">No applicants match this stage or your current filters</p>
                <button type="button" onClick={clearAllFilters} className="text-xs font-semibold text-emerald-600 underline underline-offset-2">
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1120px] text-left">
                    <thead className="bg-slate-50">
                      <tr className="border-b border-slate-200">
                        <th className="w-12 px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">Sel</th>
                        <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">Applicant</th>
                        <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">Stage</th>
                        <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">Contact</th>
                        <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">Skills</th>
                        <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">Score</th>
                        <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">Profile</th>
                        <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">Next Action</th>
                        <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedApplications.map((item) => {
                        const nextAction = getNextApplicantAction(item);

                        return (
                          <tr
                            key={item.id}
                            className={`border-b border-slate-100 align-top transition-colors hover:bg-emerald-50/40 ${
                              selectedId === item.id ? "bg-emerald-50/60" : "bg-white"
                            }`}
                          >
                            <td className="px-4 py-4">
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-400"
                                checked={selectedIds.includes(item.id)}
                                onChange={() => toggleSelect(item.id)}
                              />
                            </td>
                            <td className="px-4 py-4">
                              <HoverCard openDelay={180}>
                                <HoverCardTrigger asChild>
                                  <button type="button" onClick={() => openProfileModal(item.id)} className="max-w-[240px] text-left">
                                    <p className="text-sm font-bold leading-tight text-slate-950 hover:text-emerald-700">
                                      {getApplicantDisplayName(item)}
                                    </p>
                                    <p className="mt-1 text-xs text-slate-500">
                                      {item.maidReferenceCode || item.applicationCode} · {item.profile.nationality}
                                    </p>
                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                      {item.profile.strengthsTags.slice(0, 2).map((tag) => (
                                        <span key={tag} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                                          {tag}
                                        </span>
                                      ))}
                                    </div>
                                  </button>
                                </HoverCardTrigger>

                                <HoverCardContent align="start" className="w-[320px] rounded-3xl border border-slate-200 bg-white p-4 shadow-xl">
                                  <div className="space-y-3">
                                    <div className="flex items-start justify-between gap-3">
                                      <div>
                                        <p className="text-sm font-bold text-slate-950">{getApplicantDisplayName(item)}</p>
                                        <p className="text-[11px] text-slate-500">
                                          {item.profile.nationality} · {item.profile.yearsOfExperience} years experience
                                        </p>
                                      </div>
                                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-bold ${scoreTone(item.score?.score)}`}>
                                        {item.score?.score ?? 0}
                                      </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                                      <div className="rounded-2xl bg-slate-50 p-2.5">
                                        <p className="font-semibold text-slate-700">Contact</p>
                                        <p className="mt-1 text-slate-500">{item.profile.contactNumber || "No WhatsApp"}</p>
                                      </div>
                                      <div className="rounded-2xl bg-slate-50 p-2.5">
                                        <p className="font-semibold text-slate-700">Salary</p>
                                        <p className="mt-1 text-slate-500">{item.profile.expectedSalary ?? "N/A"}</p>
                                      </div>
                                      <div className="rounded-2xl bg-slate-50 p-2.5">
                                        <p className="font-semibold text-slate-700">Languages</p>
                                        <p className="mt-1 text-slate-500">{item.profile.languageSkills.slice(0, 3).join(", ") || "-"}</p>
                                      </div>
                                      <div className="rounded-2xl bg-slate-50 p-2.5">
                                        <p className="font-semibold text-slate-700">Care Focus</p>
                                        <p className="mt-1 text-slate-500">
                                          Childcare {item.profile.childcareExperience} · Elderly {item.profile.elderlyCareExperience}
                                        </p>
                                      </div>
                                    </div>

                                    <div>
                                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Important notes</p>
                                      <p className="mt-1 text-xs leading-5 text-slate-600">{item.score?.explanation || "Profile is waiting for recruiter review."}</p>
                                    </div>
                                  </div>
                                </HoverCardContent>
                              </HoverCard>
                            </td>
                            <td className="px-4 py-4">
                              <Badge variant="outline" className={`text-[11px] ${statusTone(item.status)}`}>
                                {getStageDisplayLabel(item.status)}
                              </Badge>
                            </td>
                            <td className="px-4 py-4">
                              <div className="max-w-[180px] text-xs text-slate-600">
                                <p className="font-semibold text-slate-800">{item.profile.contactNumber || "No WhatsApp"}</p>
                                <p className="mt-1 truncate text-slate-500">{item.profile.email || "No email"}</p>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="max-w-[190px] text-xs text-slate-600">
                                <p>{item.profile.languageSkills.slice(0, 2).join(", ") || "No languages listed"}</p>
                                <p className="mt-1 text-slate-500">{item.profile.cookingSkills.slice(0, 2).join(", ") || "No cooking skills listed"}</p>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="space-y-2">
                                <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold tabular-nums ${scoreTone(item.score?.score)}`}>
                                  Score {item.score?.score ?? 0}
                                </span>
                                <p className="text-[11px] text-slate-400">Match {item.clientMatchScore ?? 0}</p>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="max-w-[220px] text-xs text-slate-600">
                                <p className="font-medium text-slate-700">
                                  Salary {item.profile.expectedSalary ?? "N/A"} · Applied {formatDate(item.appliedAt)}
                                </p>
                                <p className="mt-1 line-clamp-2 text-slate-500">
                                  {item.profile.yearsOfExperience} years exp · {item.profile.childcareExperience} childcare · {item.profile.elderlyCareExperience} elderly
                                </p>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="max-w-[220px] text-xs text-slate-600">
                                <p className="font-semibold text-slate-900">{nextAction.title}</p>
                                <p className="mt-1 line-clamp-3 text-slate-500">{nextAction.detail}</p>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex min-w-[210px] flex-wrap gap-2">
                                {nextAction.nextStage ? (
                                  <Button
                                    size="sm"
                                    className="h-8 text-xs"
                                    onClick={() => stageMutation.mutate({ applicationId: item.id, stage: nextAction.nextStage! })}
                                    disabled={stageMutation.isPending}
                                  >
                                    {nextAction.cta}
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 text-xs"
                                    onClick={() => openProfileModal(item.id)}
                                  >
                                    {nextAction.cta}
                                  </Button>
                                )}
                                {makeWhatsAppHref(item.profile.contactNumber) && (
                                  <Button asChild size="sm" variant="outline" className="h-8 text-xs">
                                    <a href={makeWhatsAppHref(item.profile.contactNumber)} target="_blank" rel="noreferrer">
                                      <MessageCircle className="mr-1 h-3 w-3" />
                                      WhatsApp
                                    </a>
                                  </Button>
                                )}
                                {item.profile.email && (
                                  <Button asChild size="sm" variant="outline" className="h-8 text-xs">
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
                <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-slate-500">
                    Showing {(currentPage - 1) * ATS_TABLE_PAGE_SIZE + 1}-
                    {Math.min(currentPage * ATS_TABLE_PAGE_SIZE, displayedApplications.length)} of {displayedApplications.length}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs"
                      onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
                      disabled={currentPage === 1}
                    >
                      Prev
                    </Button>
                    {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                      <button
                        key={page}
                        type="button"
                        onClick={() => setCurrentPage(page)}
                        className={`h-8 min-w-8 rounded-lg px-2 text-xs font-semibold transition ${
                          page === currentPage
                            ? "bg-emerald-600 text-white"
                            : "border border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:text-emerald-700"
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs"
                      onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
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

      <Dialog open={profileModalOpen} onOpenChange={setProfileModalOpen}>
        <DialogContent className="flex h-[88vh] max-w-5xl flex-col overflow-hidden rounded-2xl p-0 [&>button]:hidden">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b bg-white px-5 py-3">
            <div className="min-w-0 flex-1">
              <DialogTitle className="truncate text-base font-black leading-tight text-slate-950">
                {String(detail?.profile?.fullName || detail?.application.profile.fullName || "Applicant Profile")}
              </DialogTitle>
              <DialogDescription className="mt-0.5 text-[11px] text-slate-400">
                {detail
                  ? `${String(detail.profile?.nationality || detail.application.profile.nationality)} · ${String(detail.application.applicationCode)} · ${String(detail.application.status)}`
                  : "Full recruiter view - documents, scoring, and quick actions."}
              </DialogDescription>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {detail && (
                <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-sm font-black tabular-nums ${scoreTone(detail.score?.score)}`}>
                  {detail.score?.score ?? 0}
                </span>
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

          <div className="flex min-h-0 flex-1 overflow-hidden">
            <div className="flex w-[280px] shrink-0 flex-col overflow-hidden border-r bg-slate-50">
              {detail && (
                <div className="shrink-0 space-y-3 border-b bg-white p-4">
                  <p className="text-[11px] leading-4 text-slate-500">
                    {detail.score?.explanation || detail.application.aiParseSummary}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <a
                      href={makeWhatsAppHref(String(detail.profile?.contactNumber || detail.application.profile.contactNumber || "")) || undefined}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-xl border bg-slate-50 p-2.5 text-[11px] transition-colors hover:border-emerald-300"
                    >
                      <p className="flex items-center gap-1 font-semibold text-slate-700">
                        <MessageCircle className="h-3 w-3 text-emerald-500" /> WhatsApp
                      </p>
                      <p className="mt-0.5 truncate text-slate-500">
                        {String(detail.profile?.contactNumber || detail.application.profile.contactNumber || "-")}
                      </p>
                    </a>
                    <a
                      href={detail.profile?.email ? `mailto:${String(detail.profile.email)}` : undefined}
                      className="rounded-xl border bg-slate-50 p-2.5 text-[11px] transition-colors hover:border-emerald-300"
                    >
                      <p className="flex items-center gap-1 font-semibold text-slate-700">
                        <Mail className="h-3 w-3 text-emerald-500" /> Email
                      </p>
                      <p className="mt-0.5 truncate text-slate-500">{String(detail.profile?.email || "-")}</p>
                    </a>
                  </div>
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-3">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Documents</p>
                {documents.length === 0 ? (
                  <p className="text-[11px] text-slate-400">No uploaded documents yet.</p>
                ) : (
                  <div className="space-y-1.5">
                    {documents.map((doc, index) => {
                      const kind = getDocumentKind(doc.name, doc.url);
                      return (
                        <button
                          key={doc.id}
                          type="button"
                          onClick={() => setActiveDocumentIndex(index)}
                          className={`flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition ${
                            activeDocumentIndex === index
                              ? "border-emerald-400 bg-emerald-50"
                              : "border-slate-200 bg-white hover:border-emerald-200 hover:bg-slate-50"
                          }`}
                        >
                          <div className={`shrink-0 rounded-lg p-1.5 ${activeDocumentIndex === index ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-500"}`}>
                            {kind === "image" ? <ImageIcon className="h-3.5 w-3.5" /> : kind === "video" ? <Video className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[11px] font-semibold text-slate-900">{doc.name}</p>
                            <p className="mt-0.5 text-[10px] text-slate-400">{doc.type} · {doc.status}</p>
                          </div>
                          <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                            activeDocumentIndex === index ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"
                          }`}>
                            {index + 1}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
              <div className="flex shrink-0 items-center justify-between border-b bg-white px-4 py-2.5">
                <p className="truncate text-[11px] text-slate-500">
                  {activeDocument
                    ? `${activeDocumentIndex + 1} / ${documents.length} - ${activeDocument.name}`
                    : "Select a document from the list"}
                </p>
                <div className="ml-3 flex shrink-0 gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setActiveDocumentIndex((current) => Math.max(current - 1, 0))}
                    disabled={activeDocumentIndex <= 0}
                  >
                    <MoveLeft className="mr-1 h-3 w-3" /> Prev
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setActiveDocumentIndex((current) => Math.min(current + 1, documents.length - 1))}
                    disabled={documents.length === 0 || activeDocumentIndex >= documents.length - 1}
                  >
                    Next <MoveRight className="ml-1 h-3 w-3" />
                  </Button>
                  {activeDocument?.url && (
                    <Button asChild variant="outline" size="sm" className="h-7 text-xs">
                      <a href={activeDocument.url} target="_blank" rel="noreferrer">
                        <MonitorUp className="mr-1 h-3 w-3" /> Fullscreen
                      </a>
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-slate-900 p-4">
                {!activeDocument ? (
                  <div className="text-center text-slate-500">
                    <FileText className="mx-auto h-10 w-10 opacity-30" />
                    <p className="mt-3 text-sm">Select a document from the list</p>
                  </div>
                ) : canPreviewActiveDocument ? (
                  activeDocumentKind === "image" ? (
                    <img
                      src={activeDocument.url}
                      alt={activeDocument.name}
                      className="max-h-full max-w-full rounded-xl object-contain"
                    />
                  ) : activeDocumentKind === "video" ? (
                    <video src={activeDocument.url} controls className="max-h-full max-w-full rounded-xl" />
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
                    <h4 className="mt-3 text-sm font-bold text-slate-900">{activeDocument.name}</h4>
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      This file type can't be previewed inline. Open it in a new tab to review.
                    </p>
                    {activeDocument.url && (
                      <Button asChild className="mt-4 h-8 text-xs">
                        <a href={activeDocument.url} target="_blank" rel="noreferrer">
                          <ExternalLink className="mr-1.5 h-3 w-3" /> Open File
                        </a>
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex w-[240px] shrink-0 flex-col space-y-3 overflow-y-auto border-l bg-white p-4">
              {detail ? (
                <>
                  {scoreFactors.length > 0 && (
                    <div className="rounded-xl border p-3">
                      <p className="mb-2 text-xs font-semibold text-slate-700">Score Breakdown</p>
                      <div className="space-y-2.5">
                        {scoreFactors.map(([label, value]) => (
                          <ScoreBar key={String(label)} label={String(label)} value={Number(value)} />
                        ))}
                      </div>
                    </div>
                  )}

                  {((detail.score?.strengths ?? []).length > 0 || (detail.score?.weaknesses ?? []).length > 0) && (
                    <div className="space-y-3 rounded-xl border p-3">
                      {(detail.score?.strengths ?? []).length > 0 && (
                        <div>
                          <p className="mb-1.5 text-xs font-semibold text-slate-700">Strengths</p>
                          <div className="flex flex-wrap gap-1">
                            {(detail.score?.strengths ?? []).map((strength) => (
                              <span key={strength} className="rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[10px] text-emerald-700">
                                {strength}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {(detail.score?.weaknesses ?? []).length > 0 && (
                        <div>
                          <p className="mb-1.5 text-xs font-semibold text-slate-700">Areas to Improve</p>
                          <div className="flex flex-wrap gap-1">
                            {(detail.score?.weaknesses ?? []).map((weakness) => (
                              <span key={weakness} className="rounded-full border border-rose-100 bg-rose-50 px-2 py-0.5 text-[10px] text-rose-600">
                                {weakness}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="rounded-xl border p-3">
                    <p className="mb-2 text-xs font-semibold text-slate-700">Status History</p>
                    <div className="space-y-2">
                      {detail.history.map((item) => (
                        <div key={item.id} className="rounded-lg bg-slate-50 px-2.5 py-2 text-[11px]">
                          <div className="font-semibold text-slate-800">
                            {item.fromStage ? `${item.fromStage} -> ${item.toStage}` : item.toStage}
                          </div>
                          <div className="mt-0.5 text-slate-400">{item.actor} · {formatDate(item.createdAt)}</div>
                          {item.reason && <div className="mt-0.5 text-slate-500">{item.reason}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-xs text-slate-400">Loading profile...</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AtsRecruitmentPage;
