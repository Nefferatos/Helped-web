import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import {
  bulkAtsAction,
  fetchAtsApplication,
  fetchAtsApplications,
  fetchAtsDashboard,
  fetchAtsPresets,
  matchAtsCandidates,
  saveAtsPreset,
  updateAtsStage,
  type AtsApplicationListItem,
} from "@/lib/ats";
import {
  ArrowRightLeft,
  Brain,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  ExternalLink,
  Filter,
  FileText,
  Image as ImageIcon,
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

// ─── Types ───────────────────────────────────────────────────────────────────

// Extend the document type to include the optional url field that the API returns
type AtsDocument = {
  id: string;
  type: string;
  name: string;
  status: string;
  required: boolean;
  url?: string;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const pipelineStages = [
  "New Applicant",
  "Documents Submitted",
  "Resume Parsed",
  "Screening Interview",
  "Background Check",
  "Approved",
  "Ready For Client Matching",
  "Placed",
  "Rejected",
] as const;

const applicantFlowGuide = [
  {
    title: "1. Intake & First Review",
    description: "New applicants land here from the public portal. Check profile completeness, WhatsApp access, and the qualification score first.",
    stage: "New Applicant → Documents Submitted",
    icon: MonitorUp,
    color: "sky",
  },
  {
    title: "2. Validate Profile Quality",
    description: "Open the profile, review work history, languages, salary expectations, and attached files before spending time on outreach.",
    stage: "Resume Parsed",
    icon: FileText,
    color: "violet",
  },
  {
    title: "3. Contact & Screen",
    description: "Reach out by WhatsApp or email, confirm availability, and move serious candidates into interview and verification stages quickly.",
    stage: "Screening Interview → Background Check",
    icon: MessageCircle,
    color: "amber",
  },
  {
    title: "4. Approve & Market",
    description: "Approve only candidates with verified details, then queue them for client matching so the sales side can present them confidently.",
    stage: "Approved → Ready For Client Matching",
    icon: Sparkles,
    color: "emerald",
  },
] as const;

const processChecklist = [
  "Use search and quick filters to build a shortlist by score, experience, and care type.",
  "Open each profile before outreach so recruiters speak with full context.",
  "Update the pipeline immediately after each action to keep the team aligned.",
  "Use bulk actions only for clear batch work like document requests or approvals.",
] as const;

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
        title: "Prepare for matching",
        detail: "This candidate is qualified. Queue the profile so the team can start client presentation.",
        cta: "Queue for matching",
        nextStage: "Ready For Client Matching",
      };
    case "Ready For Client Matching":
      return { title: "Present to clients", detail: "The profile is market-ready. Use matching tools and outreach to convert to placement.", cta: "Open profile" };
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
    case "Ready For Client Matching": return "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-800";
    case "Placed": return "border-teal-200 bg-teal-50 text-teal-800";
    case "Rejected": return "border-rose-200 bg-rose-50 text-rose-800";
    default: return "border-slate-200 bg-slate-50 text-slate-700";
  }
};

const nextActionTone = (status: AtsApplicationListItem["status"]) => {
  switch (status) {
    case "New Applicant": return { card: "border-sky-100 bg-sky-50/70", icon: "bg-sky-100 text-sky-700" };
    case "Documents Submitted": return { card: "border-cyan-100 bg-cyan-50/70", icon: "bg-cyan-100 text-cyan-700" };
    case "Resume Parsed": return { card: "border-violet-100 bg-violet-50/70", icon: "bg-violet-100 text-violet-700" };
    case "Screening Interview": return { card: "border-amber-100 bg-amber-50/70", icon: "bg-amber-100 text-amber-700" };
    case "Background Check": return { card: "border-orange-100 bg-orange-50/70", icon: "bg-orange-100 text-orange-700" };
    case "Approved": return { card: "border-emerald-100 bg-emerald-50/70", icon: "bg-emerald-100 text-emerald-700" };
    case "Ready For Client Matching": return { card: "border-fuchsia-100 bg-fuchsia-50/70", icon: "bg-fuchsia-100 text-fuchsia-700" };
    case "Placed": return { card: "border-teal-100 bg-teal-50/70", icon: "bg-teal-100 text-teal-700" };
    case "Rejected": return { card: "border-rose-100 bg-rose-50/70", icon: "bg-rose-100 text-rose-700" };
    default: return { card: "border-slate-100 bg-slate-50/70", icon: "bg-slate-100 text-slate-700" };
  }
};

// ─── Quick filter presets ─────────────────────────────────────────────────────

const quickFilters = [
  { label: "WhatsApp + Score 70+", key: "whatsapp-70", filter: { hasWhatsApp: true, minScore: 70 } },
  { label: "Childcare Shortlist", key: "childcare", filter: { minExperience: 3, childcareExperience: true, hasWhatsApp: true } },
  { label: "Elderly Care", key: "elderly", filter: { elderlyCareExperience: true, hasWhatsApp: true } },
  { label: "Available Now", key: "available", filter: { availableImmediately: true, hasWhatsApp: true } },
  { label: "Ready to Market", key: "market", filter: { status: ["Approved", "Ready For Client Matching"], hasWhatsApp: true } },
] as const;

// ─── Sub-components ───────────────────────────────────────────────────────────

const ScoreBar = ({ label, value }: { label: string; value: number }) => (
  <div>
    <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
      <span className="font-medium">{label}</span>
      <span className="tabular-nums font-semibold">{value}%</span>
    </div>
    <div className="h-1.5 rounded-full bg-slate-100">
      <div
        className="h-1.5 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-500"
        style={{ width: `${value}%` }}
      />
    </div>
  </div>
);

// ─── Main page ────────────────────────────────────────────────────────────────

const AtsRecruitmentPage = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [activeDocumentIndex, setActiveDocumentIndex] = useState(0);
  const [matchingPrompt, setMatchingPrompt] = useState(
    "Need Indonesian maid. Can care for newborn. Can cook Chinese food. Budget SGD 700.",
  );
  const [presetName, setPresetName] = useState("");
  const [activeQuickFilter, setActiveQuickFilter] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [filters, setFilters] = useState<Record<string, unknown>>({
    hasWhatsApp: true,
    status: ["New Applicant", "Documents Submitted", "Resume Parsed", "Screening Interview", "Approved", "Ready For Client Matching"],
  });
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

  const matchMutation = useMutation({
    mutationFn: () => matchAtsCandidates({ requirementText: matchingPrompt, top: 10 }),
    onError: (error) => toast.error(error instanceof Error ? error.message : "Matching failed"),
  });

  const savePresetMutation = useMutation({
    mutationFn: () => saveAtsPreset(presetName, filters),
    onSuccess: () => {
      toast.success("Saved filter preset");
      setPresetName("");
      void queryClient.invalidateQueries({ queryKey: ["ats-presets"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to save preset"),
  });

  const dashboard = dashboardQuery.data;
  const applications = useMemo(() => applicationsQuery.data?.data ?? [], [applicationsQuery.data?.data]);
  const detail = detailQuery.data;
  // Cast documents to our extended type that includes the optional url field
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
      // Toggle off: reset to default
      setActiveQuickFilter(null);
      setFilters({
        hasWhatsApp: true,
        status: ["New Applicant", "Documents Submitted", "Resume Parsed", "Screening Interview", "Approved", "Ready For Client Matching"],
      });
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
  const canPreviewActiveDocument = Boolean(
    activeDocument?.url && ["image", "pdf", "video"].includes(activeDocumentKind),
  );

  useEffect(() => { setActiveDocumentIndex(0); }, [selectedId]);

  useEffect(() => {
    if (activeDocumentIndex >= documents.length && documents.length > 0) {
      setActiveDocumentIndex(documents.length - 1);
    }
  }, [activeDocumentIndex, documents.length]);

  const selectAllVisible = () => setSelectedIds(applications.map((a) => a.id));
  const clearSelection = () => setSelectedIds([]);

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Recruitment · ATS</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Maid Applicant Pipeline</h1>
            <p className="mt-1 text-sm text-slate-500">
              Shortlist, contact, and advance candidates from one screen.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/apply-as-maid">Open Portal</Link>
            </Button>
            <Button
              size="sm"
              onClick={() =>
                stageMutation.mutate({
                  applicationId: selectedId || applications[0]?.id || "",
                  stage: "Ready For Client Matching",
                })
              }
              disabled={!selectedId && !applications.length}
            >
              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
              Queue Ready Candidate
            </Button>
          </div>
        </div>
      </section>

      {/* ── Dashboard metrics ── */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {[
          { label: "Total Applicants", value: dashboard?.totalApplicants ?? 0, icon: Users, color: "text-sky-600 bg-sky-50" },
          { label: "Approved", value: dashboard?.approvedCandidates ?? 0, icon: ClipboardCheck, color: "text-violet-600 bg-violet-50" },
          { label: "Ready for Matching", value: dashboard?.readyForMatching ?? 0, icon: Sparkles, color: "text-fuchsia-600 bg-fuchsia-50" },
          { label: "Placed", value: dashboard?.placedHelpers ?? 0, icon: BriefcaseBusiness, color: "text-teal-600 bg-teal-50" },
          { label: "Avg Score", value: dashboard?.averageQualificationScore ?? 0, icon: Brain, color: "text-emerald-600 bg-emerald-50" },
        ].map((metric) => (
          <Card key={metric.label} className="flex items-center gap-3 p-4">
            <div className={`rounded-xl p-2.5 ${metric.color}`}>
              <metric.icon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{metric.label}</p>
              <p className="text-2xl font-black text-slate-950 tabular-nums">{metric.value}</p>
            </div>
          </Card>
        ))}
      </section>

      {/* ── Recruiter Guide (collapsible) ── */}
      <section className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/60 to-white p-5">
        <button
          type="button"
          onClick={() => setShowGuide((v) => !v)}
          className="flex w-full items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-emerald-600" />
            <span className="text-sm font-bold text-slate-900">Recruiter Process Guide</span>
            <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 text-[10px]">
              4 steps
            </Badge>
          </div>
          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${showGuide ? "rotate-180" : ""}`} />
        </button>

        {showGuide && (
          <div className="mt-5 space-y-4">
            <div className="grid gap-3 xl:grid-cols-4">
              {applicantFlowGuide.map((step) => (
                <div key={step.title} className="rounded-xl border border-emerald-100 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700">
                      <step.icon className="h-4 w-4" />
                    </div>
                    <span className="text-[10px] font-semibold text-emerald-700">{step.stage}</span>
                  </div>
                  <h3 className="mt-3 text-sm font-bold text-slate-900">{step.title}</h3>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{step.description}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              <div className="rounded-xl border bg-white p-4">
                <p className="text-sm font-bold text-slate-900 mb-3">Recommended flow</p>
                <div className="flex flex-wrap gap-1.5 text-xs font-medium text-slate-600">
                  {["Search/Filter", "Open Profile", "Check Score & Docs", "Contact", "Update Status", "Queue for Matching"].map((label, i, arr) => (
                    <span key={label} className="flex items-center gap-1.5">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1">{label}</span>
                      {i < arr.length - 1 && <span className="text-slate-300">›</span>}
                    </span>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border bg-white p-4">
                <p className="text-sm font-bold text-slate-900 mb-3">Daily checklist</p>
                <div className="space-y-2">
                  {processChecklist.map((item) => (
                    <div key={item} className="flex items-start gap-2 text-xs text-slate-500">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-none text-emerald-500" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ── Main content ── */}
      <section className="grid gap-5 xl:grid-cols-[1fr_360px]">

        {/* Left: list + filters */}
        <div className="space-y-4">

          {/* Filter toolbar */}
          <Card className="p-4">
            <div className="flex flex-col gap-3">

              {/* Search + sort row */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    className="pl-9 text-sm"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search name, nationality, language, email, WhatsApp…"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <select
                  className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-300"
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
                <div className="flex items-center gap-1.5 rounded-lg border bg-slate-50 px-2.5 py-1.5 text-xs text-slate-500">
                  <SlidersHorizontal className="h-3.5 w-3.5 text-emerald-500" />
                  <span>{activeFilterCount} active</span>
                </div>
              </div>

              {/* Quick filters */}
              <div className="flex flex-wrap gap-1.5">
                <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-400 pr-1">
                  <Filter className="h-3 w-3" /> Quick
                </span>
                {quickFilters.map(({ label, key, filter }) => {
                  const isActive = activeQuickFilter === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleQuickFilter(key, filter as Record<string, unknown>)}
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition-all ${
                        isActive
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "border border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:text-emerald-700"
                      }`}
                    >
                      {label}
                      {isActive && <X className="h-3 w-3 opacity-80" />}
                    </button>
                  );
                })}
                {(activeFilterCount > 0 || search) && (
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-100 transition-all"
                  >
                    <XCircle className="h-3 w-3" /> Clear all
                  </button>
                )}
              </div>

              {/* Pipeline stage filter */}
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Pipeline stages</p>
                <div className="flex flex-wrap gap-1.5">
                  {pipelineStages.map((stage) => {
                    const active = Array.isArray(filters.status) && (filters.status as string[]).includes(stage);
                    const count = grouped.get(stage)?.length ?? 0;
                    return (
                      <button
                        key={stage}
                        type="button"
                        onClick={() => toggleStageFilter(stage)}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition-all ${
                          active
                            ? "bg-emerald-600 text-white shadow-sm"
                            : "bg-white text-slate-500 ring-1 ring-slate-200 hover:ring-emerald-300 hover:text-emerald-700"
                        }`}
                      >
                        {stage}
                        <span className={`rounded-full px-1 text-[10px] tabular-nums ${active ? "bg-emerald-500" : "bg-slate-100 text-slate-500"}`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Saved presets */}
              {(presetsQuery.data?.presets ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400 flex items-center pr-1">Saved</span>
                  {presetsQuery.data?.presets.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setFilters(preset.filters)}
                      className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:border-emerald-300 hover:text-emerald-700 transition-all"
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* Applicant table */}
          <Card className="overflow-hidden p-0">
            {/* Table header row */}
            <div className="flex items-center justify-between border-b px-4 py-3 bg-slate-50/80">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  className="rounded"
                  checked={selectedCount === applications.length && applications.length > 0}
                  onChange={() => (selectedCount === applications.length ? clearSelection() : selectAllVisible())}
                />
                <div>
                  <span className="text-sm font-bold text-slate-900">Applicant List</span>
                  <span className="ml-2 text-xs text-slate-400">{applicationsQuery.data?.pageInfo.total ?? 0} matched</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selectedCount > 0 && (
                  <Badge className="bg-emerald-600 text-white border-0">{selectedCount} selected</Badge>
                )}
              </div>
            </div>

            {/* Bulk action bar */}
            {selectedCount > 0 && (
              <div className="flex flex-wrap items-center gap-2 border-b bg-emerald-50 px-4 py-2.5">
                <span className="text-xs font-semibold text-emerald-800">{selectedCount} applicants selected</span>
                <div className="ml-auto flex flex-wrap gap-1.5">
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
                      onClick={() => bulkMutation.mutate({ applicationIds: selectedIds, action })}
                      disabled={bulkMutation.isPending}
                    >
                      {label}
                    </Button>
                  ))}
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={clearSelection}>
                    <X className="h-3 w-3 mr-1" /> Deselect
                  </Button>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    <th className="px-4 py-2.5 w-8" />
                    <th className="px-4 py-2.5">Applicant</th>
                    <th className="px-4 py-2.5">Contact</th>
                    <th className="px-4 py-2.5">Score</th>
                    <th className="px-4 py-2.5">Skills</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5">Next Action</th>
                    <th className="px-4 py-2.5">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {applications.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center">
                        <div className="flex flex-col items-center gap-2 text-slate-400">
                          <Users className="h-8 w-8 opacity-30" />
                          <p className="text-sm font-medium">No applicants match your current filters</p>
                          <button type="button" onClick={clearAllFilters} className="text-xs text-emerald-600 underline underline-offset-2">
                            Clear filters
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    applications.map((item) => {
                      const nextAction = getNextApplicantAction(item);
                      const nextActionColors = nextActionTone(item.status);

                      return (
                        <tr
                          key={item.id}
                          className={`transition hover:bg-slate-50/80 ${selectedId === item.id ? "bg-emerald-50/40" : "bg-white"}`}
                        >
                          <td className="px-4 py-3 align-top">
                            <input
                              type="checkbox"
                              className="rounded"
                              checked={selectedIds.includes(item.id)}
                              onChange={() => toggleSelect(item.id)}
                            />
                          </td>
                          <td className="px-4 py-3 align-top max-w-[180px]">
                            <button className="text-left w-full" onClick={() => openProfileModal(item.id)}>
                              <div className="font-semibold text-slate-900 hover:text-emerald-700 transition-colors leading-tight">
                                {item.profile.fullName}
                              </div>
                              <div className="mt-0.5 text-[11px] text-slate-400">
                                {item.maidReferenceCode || item.applicationCode} · {item.profile.nationality} · {item.profile.yearsOfExperience}y exp
                              </div>
                              <div className="mt-1.5 flex flex-wrap gap-1">
                                {item.profile.strengthsTags.slice(0, 2).map((tag) => (
                                  <span key={tag} className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </button>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <div className="space-y-1.5">
                              <div className="text-xs text-slate-600">{item.profile.contactNumber || <span className="text-rose-400">No WhatsApp</span>}</div>
                              <div className="text-xs text-slate-400 truncate max-w-[130px]">{item.profile.email || "No email"}</div>
                            </div>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-bold tabular-nums ${scoreTone(item.score?.score)}`}>
                              {item.score?.score ?? 0}
                            </span>
                            <p className="mt-1.5 max-w-[160px] text-[11px] leading-4 text-slate-400 line-clamp-2">
                              {item.score?.explanation || "Score pending"}
                            </p>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <div className="space-y-1">
                              <div className="text-[11px] text-slate-600">{item.profile.languageSkills.slice(0, 2).join(", ") || "—"}</div>
                              <div className="text-[11px] text-slate-400">{item.profile.cookingSkills.slice(0, 2).join(", ") || "—"}</div>
                            </div>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <Badge variant="outline" className={`text-[11px] ${statusTone(item.status)}`}>
                              {item.status}
                            </Badge>
                            <div className="mt-1 text-[11px] text-slate-400">
                              Match {item.clientMatchScore ?? 0} · {item.profile.expectedSalary ?? "N/A"}
                            </div>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <div className={`min-w-[220px] rounded-xl border p-2.5 ${nextActionColors.card}`}>
                              <div className="flex items-center gap-1.5">
                                <div className={`rounded-lg p-1 ${nextActionColors.icon}`}>
                                  <Sparkles className="h-3 w-3" />
                                </div>
                                <p className="text-xs font-semibold text-slate-900">{nextAction.title}</p>
                              </div>
                              <p className="mt-1.5 text-[11px] leading-4 text-slate-500">{nextAction.detail}</p>
                              <div className="mt-2">
                                {nextAction.nextStage ? (
                                  <Button
                                    size="sm"
                                    className="h-7 w-full text-[11px]"
                                    onClick={() => stageMutation.mutate({ applicationId: item.id, stage: nextAction.nextStage! })}
                                    disabled={stageMutation.isPending}
                                  >
                                    {nextAction.cta}
                                  </Button>
                                ) : (
                                  <Button size="sm" variant="outline" className="h-7 w-full text-[11px]" onClick={() => openProfileModal(item.id)}>
                                    {nextAction.cta}
                                  </Button>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <div className="flex flex-col gap-1.5">
                              <Button variant="outline" size="sm" className="h-7 text-xs w-full" onClick={() => openProfileModal(item.id)}>
                                Profile
                              </Button>
                              {makeWhatsAppHref(item.profile.contactNumber) && (
                                <Button asChild size="sm" variant="outline" className="h-7 text-xs w-full">
                                  <a href={makeWhatsAppHref(item.profile.contactNumber)} target="_blank" rel="noreferrer">
                                    <MessageCircle className="mr-1 h-3 w-3" />
                                    WhatsApp
                                  </a>
                                </Button>
                              )}
                              {item.profile.email && (
                                <Button asChild size="sm" variant="outline" className="h-7 text-xs w-full">
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
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">

          {/* Selected applicant detail */}
          <Card className="p-4">
            <h2 className="text-sm font-bold text-slate-900 mb-3">Selected Applicant</h2>
            {!selectedId ? (
              <p className="text-xs text-slate-400 leading-5">
                Click any applicant row to inspect contact details, score breakdown, work history, and documents here.
              </p>
            ) : detail ? (
              <div className="space-y-3">
                <div className="rounded-xl border bg-slate-50 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-slate-950 leading-tight">
                        {String(detail.profile?.fullName || detail.application.profile.fullName)}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {String(detail.profile?.nationality || detail.application.profile.nationality)} · {String(detail.application.status)}
                      </p>
                    </div>
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-bold tabular-nums ${scoreTone(detail.score?.score)}`}>
                      {detail.score?.score ?? 0}
                    </span>
                  </div>
                  <p className="mt-2 text-[11px] leading-4 text-slate-500">{detail.score?.explanation || detail.application.aiParseSummary}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <a
                      href={makeWhatsAppHref(String(detail.profile?.contactNumber || detail.application.profile.contactNumber || "")) || undefined}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border bg-white p-2 text-[11px] hover:border-emerald-300 transition-colors"
                    >
                      <p className="font-semibold text-slate-700">WhatsApp</p>
                      <p className="mt-0.5 text-slate-500 truncate">{String(detail.profile?.contactNumber || detail.application.profile.contactNumber || "—")}</p>
                    </a>
                    <a
                      href={detail.profile?.email ? `mailto:${String(detail.profile.email)}` : undefined}
                      className="rounded-lg border bg-white p-2 text-[11px] hover:border-emerald-300 transition-colors"
                    >
                      <p className="font-semibold text-slate-700">Email</p>
                      <p className="mt-0.5 text-slate-500 truncate">{String(detail.profile?.email || "—")}</p>
                    </a>
                  </div>
                  <Button className="mt-3 w-full h-8 text-xs" variant="outline" onClick={() => setProfileModalOpen(true)}>
                    Open Full Profile
                  </Button>
                </div>

                {/* Score factors */}
                {scoreFactors.length > 0 && (
                  <div className="rounded-xl border p-3">
                    <p className="text-xs font-semibold text-slate-700 mb-2">Score Breakdown</p>
                    <div className="space-y-2">
                      {scoreFactors.map(([label, value]) => (
                        <ScoreBar key={label} label={String(label)} value={Number(value)} />
                      ))}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {(detail.score?.strengths ?? []).map((s) => (
                        <span key={s} className="rounded-full bg-emerald-50 border border-emerald-100 px-2 py-0.5 text-[10px] text-emerald-700">{s}</span>
                      ))}
                      {(detail.score?.weaknesses ?? []).map((w) => (
                        <span key={w} className="rounded-full bg-rose-50 border border-rose-100 px-2 py-0.5 text-[10px] text-rose-600">{w}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Documents list */}
                <div className="rounded-xl border p-3">
                  <p className="text-xs font-semibold text-slate-700 mb-2">Documents</p>
                  {documents.length === 0 ? (
                    <p className="text-[11px] text-slate-400">No documents uploaded yet.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {documents.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5 text-[11px]">
                          <span className="text-slate-700 truncate">{doc.name}</span>
                          <Badge variant="outline" className="text-[10px] shrink-0">{doc.status}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Status history */}
                <div className="rounded-xl border p-3">
                  <p className="text-xs font-semibold text-slate-700 mb-2">Status History</p>
                  <div className="space-y-2">
                    {detail.history.map((item) => (
                      <div key={item.id} className="rounded-lg bg-slate-50 px-2.5 py-2 text-[11px]">
                        <div className="font-medium text-slate-800">{item.fromStage ? `${item.fromStage} → ${item.toStage}` : item.toStage}</div>
                        <div className="text-slate-400 mt-0.5">{item.actor} · {formatDate(item.createdAt)}</div>
                        {item.reason && <div className="text-slate-500 mt-0.5">{item.reason}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400">Loading profile…</p>
            )}
          </Card>

          {/* AI matching */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <ArrowRightLeft className="h-4 w-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-900">AI Client Matching</h2>
            </div>
            <Textarea
              value={matchingPrompt}
              onChange={(e) => setMatchingPrompt(e.target.value)}
              rows={4}
              className="text-sm resize-none"
              placeholder="Describe client requirements…"
            />
            <Button
              className="mt-2 w-full h-8 text-xs"
              onClick={() => matchMutation.mutate()}
              disabled={matchMutation.isPending}
            >
              {matchMutation.isPending ? "Searching…" : "Run Match Search"}
            </Button>
            {(matchMutation.data?.matches ?? []).length > 0 && (
              <div className="mt-3 space-y-2">
                {matchMutation.data!.matches.map((match, index) => (
                  <div key={`${String(match.applicationId)}-${index}`} className="rounded-xl border bg-slate-50 p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold text-slate-900">{String(match.candidateName)}</p>
                        <p className="text-[10px] text-slate-400">{String(match.maidReferenceCode || "")}</p>
                      </div>
                      <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[11px] font-bold tabular-nums ${scoreTone(Number(match.matchScore ?? 0))}`}>
                        {String(match.matchScore)}
                      </span>
                    </div>
                    <p className="mt-1.5 text-[11px] leading-4 text-slate-500">{String(match.recommendation)}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Save filter preset */}
          <Card className="p-4">
            <h2 className="text-sm font-bold text-slate-900 mb-3">Save Filter Preset</h2>
            <div className="flex gap-2">
              <Input
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="Preset name…"
                className="text-sm h-8"
              />
              <Button
                onClick={() => savePresetMutation.mutate()}
                disabled={!presetName.trim() || savePresetMutation.isPending}
                size="sm"
                className="h-8 shrink-0"
              >
                Save
              </Button>
            </div>
          </Card>
        </div>
      </section>

      {/* ── Profile modal ── */}
      <Dialog open={profileModalOpen} onOpenChange={setProfileModalOpen}>
        {/*
          Key fix: give DialogContent an explicit h-[88vh] so children can use
          flex/overflow to constrain themselves. Without a concrete height the
          inner panels have nothing to measure against and content overflows.
        */}
        {/* [&>button]:hidden suppresses the default shadcn close button */}
        <DialogContent className="h-[88vh] max-w-5xl overflow-hidden rounded-2xl p-0 flex flex-col [&>button]:hidden">

          {/* Top bar — fixed height, with custom close button */}
          <div className="flex shrink-0 items-center gap-3 justify-between border-b bg-white px-5 py-3">
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base font-black text-slate-950 leading-tight truncate">
                {String(detail?.profile?.fullName || detail?.application.profile.fullName || "Applicant Profile")}
              </DialogTitle>
              <DialogDescription className="text-[11px] text-slate-400 mt-0.5">
                {detail
                  ? `${String(detail.profile?.nationality || detail.application.profile.nationality)} · ${String(detail.application.applicationCode)} · ${String(detail.application.status)}`
                  : "Full recruiter view — documents, scoring, and quick actions."}
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

          {/* Body — fills remaining height, three columns, each scrolls independently */}
          <div className="flex min-h-0 flex-1 overflow-hidden">

            {/* LEFT: contact summary + scrollable document list */}
            <div className="flex w-[280px] shrink-0 flex-col overflow-hidden border-r bg-slate-50">
              {detail && (
                <div className="shrink-0 border-b bg-white p-4 space-y-3">
                  <p className="text-[11px] leading-4 text-slate-500">
                    {detail.score?.explanation || detail.application.aiParseSummary}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <a
                      href={makeWhatsAppHref(String(detail.profile?.contactNumber || detail.application.profile.contactNumber || "")) || undefined}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-xl border bg-slate-50 p-2.5 text-[11px] hover:border-emerald-300 transition-colors"
                    >
                      <p className="font-semibold text-slate-700 flex items-center gap-1">
                        <MessageCircle className="h-3 w-3 text-emerald-500" /> WhatsApp
                      </p>
                      <p className="mt-0.5 text-slate-500 truncate">
                        {String(detail.profile?.contactNumber || detail.application.profile.contactNumber || "—")}
                      </p>
                    </a>
                    <a
                      href={detail.profile?.email ? `mailto:${String(detail.profile.email)}` : undefined}
                      className="rounded-xl border bg-slate-50 p-2.5 text-[11px] hover:border-emerald-300 transition-colors"
                    >
                      <p className="font-semibold text-slate-700 flex items-center gap-1">
                        <Mail className="h-3 w-3 text-emerald-500" /> Email
                      </p>
                      <p className="mt-0.5 text-slate-500 truncate">{String(detail.profile?.email || "—")}</p>
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
                          <div className={`rounded-lg p-1.5 shrink-0 ${activeDocumentIndex === index ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-500"}`}>
                            {kind === "image" ? <ImageIcon className="h-3.5 w-3.5" /> : kind === "video" ? <Video className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-semibold text-slate-900 truncate">{doc.name}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{doc.type} · {doc.status}</p>
                          </div>
                          <span className={`shrink-0 rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold ${
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

            {/* CENTER: document viewer — flex-1 so it takes all remaining horizontal space */}
            <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
              {/* Viewer toolbar */}
              <div className="flex shrink-0 items-center justify-between border-b bg-white px-4 py-2.5">
                <p className="text-[11px] text-slate-500 truncate">
                  {activeDocument
                    ? `${activeDocumentIndex + 1} / ${documents.length} — ${activeDocument.name}`
                    : "Select a document from the list"}
                </p>
                <div className="flex shrink-0 gap-1.5 ml-3">
                  <Button
                    variant="outline" size="sm" className="h-7 text-xs"
                    onClick={() => setActiveDocumentIndex((c) => Math.max(c - 1, 0))}
                    disabled={activeDocumentIndex <= 0}
                  >
                    <MoveLeft className="h-3 w-3 mr-1" /> Prev
                  </Button>
                  <Button
                    variant="outline" size="sm" className="h-7 text-xs"
                    onClick={() => setActiveDocumentIndex((c) => Math.min(c + 1, documents.length - 1))}
                    disabled={documents.length === 0 || activeDocumentIndex >= documents.length - 1}
                  >
                    Next <MoveRight className="h-3 w-3 ml-1" />
                  </Button>
                  {activeDocument?.url && (
                    <Button asChild variant="outline" size="sm" className="h-7 text-xs">
                      <a href={activeDocument.url} target="_blank" rel="noreferrer">
                        <MonitorUp className="h-3 w-3 mr-1" /> Fullscreen
                      </a>
                    </Button>
                  )}
                </div>
              </div>

              {/* Viewer area: flex-1 + overflow-hidden so it never grows past the modal */}
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
                          <ExternalLink className="h-3 w-3 mr-1.5" /> Open File
                        </a>
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT: score + history — fixed width, independently scrollable */}
            <div className="flex w-[240px] shrink-0 flex-col overflow-y-auto border-l bg-white p-4 space-y-3">
              {detail ? (
                <>
                  {scoreFactors.length > 0 && (
                    <div className="rounded-xl border p-3">
                      <p className="text-xs font-semibold text-slate-700 mb-2">Score Breakdown</p>
                      <div className="space-y-2.5">
                        {scoreFactors.map(([label, value]) => (
                          <ScoreBar key={label} label={String(label)} value={Number(value)} />
                        ))}
                      </div>
                    </div>
                  )}

                  {((detail.score?.strengths ?? []).length > 0 || (detail.score?.weaknesses ?? []).length > 0) && (
                    <div className="rounded-xl border p-3 space-y-3">
                      {(detail.score?.strengths ?? []).length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-slate-700 mb-1.5">Strengths</p>
                          <div className="flex flex-wrap gap-1">
                            {(detail.score?.strengths ?? []).map((s) => (
                              <span key={s} className="rounded-full bg-emerald-50 border border-emerald-100 px-2 py-0.5 text-[10px] text-emerald-700">{s}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {(detail.score?.weaknesses ?? []).length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-slate-700 mb-1.5">Areas to Improve</p>
                          <div className="flex flex-wrap gap-1">
                            {(detail.score?.weaknesses ?? []).map((w) => (
                              <span key={w} className="rounded-full bg-rose-50 border border-rose-100 px-2 py-0.5 text-[10px] text-rose-600">{w}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="rounded-xl border p-3">
                    <p className="text-xs font-semibold text-slate-700 mb-2">Status History</p>
                    <div className="space-y-2">
                      {detail.history.map((item) => (
                        <div key={item.id} className="rounded-lg bg-slate-50 px-2.5 py-2 text-[11px]">
                          <div className="font-semibold text-slate-800">
                            {item.fromStage ? `${item.fromStage} → ${item.toStage}` : item.toStage}
                          </div>
                          <div className="text-slate-400 mt-0.5">{item.actor} · {formatDate(item.createdAt)}</div>
                          {item.reason && <div className="mt-0.5 text-slate-500">{item.reason}</div>}
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
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default AtsRecruitmentPage;