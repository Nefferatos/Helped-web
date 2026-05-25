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
} from "lucide-react";

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

const scoreTone = (score?: number | null) => {
  if ((score ?? 0) >= 90) return "bg-emerald-100 text-emerald-800";
  if ((score ?? 0) >= 75) return "bg-sky-100 text-sky-800";
  if ((score ?? 0) >= 60) return "bg-amber-100 text-amber-800";
  if ((score ?? 0) >= 40) return "bg-orange-100 text-orange-800";
  return "bg-rose-100 text-rose-800";
};

const formatDate = (value?: string) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
};

const makeWhatsAppHref = (value?: string) => {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}` : "";
};

const filterChipClassName =
  "rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700";

const getDocumentKind = (name?: string, url?: string) => {
  const target = `${name ?? ""} ${url ?? ""}`.toLowerCase();
  if (/\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/.test(target)) return "image";
  if (/\.pdf(\?|$)/.test(target)) return "pdf";
  if (/\.(mp4|mov|webm|ogg)(\?|$)/.test(target)) return "video";
  if (/\.(doc|docx)(\?|$)/.test(target)) return "document";
  return "file";
};

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
  const [filters, setFilters] = useState<Record<string, unknown>>({
    hasWhatsApp: true,
    status: ["New Applicant", "Documents Submitted", "Resume Parsed", "Screening Interview", "Approved", "Ready For Client Matching"],
  });
  const [sort, setSort] = useState("qualificationScore:desc");

  const dashboardQuery = useQuery({
    queryKey: ["ats-dashboard"],
    queryFn: fetchAtsDashboard,
  });

  const applicationsQuery = useQuery({
    queryKey: ["ats-applications", search, sort, JSON.stringify(filters)],
    queryFn: () =>
      fetchAtsApplications({
        q: search,
        filters,
        sort,
        page: 1,
        pageSize: 120,
      }),
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
  const applications = useMemo(
    () => applicationsQuery.data?.data ?? [],
    [applicationsQuery.data?.data],
  );
  const detail = detailQuery.data;

  const selectedCount = selectedIds.length;
  const activeFilterCount = useMemo(
    () =>
      Object.entries(filters).filter(([, value]) =>
        Array.isArray(value) ? value.length > 0 : Boolean(value),
      ).length,
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

  const setQuickFilter = (next: Record<string, unknown>) => setFilters(next);

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

  const documents = detail?.documents ?? [];
  const activeDocument = documents[activeDocumentIndex] ?? null;
  const activeDocumentKind = getDocumentKind(activeDocument?.name, activeDocument?.url);
  const canPreviewActiveDocument = Boolean(
    activeDocument?.url && ["image", "pdf", "video"].includes(activeDocumentKind),
  );

  useEffect(() => {
    setActiveDocumentIndex(0);
  }, [selectedId]);

  useEffect(() => {
    if (activeDocumentIndex >= documents.length && documents.length > 0) {
      setActiveDocumentIndex(documents.length - 1);
    }
  }, [activeDocumentIndex, documents.length]);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">Recruitment ATS</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
              Maid Applicant Shortlisting and Recruiter Follow-up
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Review only new maid applicants from the public application portal, use automated qualification scores
              to sort them, and contact each candidate quickly by WhatsApp or email from one screen.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link to="/apply-as-maid">Open Recruitment Portal</Link>
            </Button>
            <Button
              onClick={() =>
                stageMutation.mutate({
                  applicationId: selectedId || applications[0]?.id || "",
                  stage: "Ready For Client Matching",
                })
              }
              disabled={!selectedId && !applications.length}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Queue Ready Candidate
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "Total Applicants", value: dashboard?.totalApplicants ?? 0, icon: Users },
          { label: "Approved", value: dashboard?.approvedCandidates ?? 0, icon: ClipboardCheck },
          { label: "Ready For Matching", value: dashboard?.readyForMatching ?? 0, icon: Sparkles },
          { label: "Placed", value: dashboard?.placedHelpers ?? 0, icon: BriefcaseBusiness },
          { label: "Avg Score", value: dashboard?.averageQualificationScore ?? 0, icon: Brain },
        ].map((metric) => (
          <Card key={metric.label} className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{metric.label}</p>
                <p className="mt-2 text-3xl font-black text-slate-950">{metric.value}</p>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700">
                <metric.icon className="h-5 w-5" />
              </div>
            </div>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.55fr_1fr]">
        <div className="space-y-6">
          <Card className="p-5">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="relative min-w-[240px] flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    className="pl-9"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search name, nationality, language, cooking, email, or WhatsApp..."
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center gap-2 rounded-xl border bg-slate-50 px-3 py-2 text-sm text-slate-600">
                    <SlidersHorizontal className="h-4 w-4 text-emerald-600" />
                    {activeFilterCount} active filters
                  </div>
                  <select
                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"
                    value={sort}
                    onChange={(event) => setSort(event.target.value)}
                  >
                    <option value="qualificationScore:desc">Sort: Best score</option>
                    <option value="applicationDate:desc">Sort: Newest first</option>
                    <option value="applicationDate:asc">Sort: Oldest first</option>
                    <option value="experience:desc">Sort: Most experience</option>
                    <option value="clientMatchScore:desc">Sort: Best client match</option>
                    <option value="expectedSalary:asc">Sort: Lowest salary</option>
                    <option value="name:asc">Sort: Name A-Z</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={filterChipClassName}
                  onClick={() => setQuickFilter({ hasWhatsApp: true, minScore: 70 })}
                >
                  WhatsApp + score 70+
                </button>
                <button
                  type="button"
                  className={filterChipClassName}
                  onClick={() => setQuickFilter({ minExperience: 3, childcareExperience: true, hasWhatsApp: true })}
                >
                  Childcare shortlist
                </button>
                <button
                  type="button"
                  className={filterChipClassName}
                  onClick={() => setQuickFilter({ elderlyCareExperience: true, hasWhatsApp: true })}
                >
                  Elderly care
                </button>
                <button
                  type="button"
                  className={filterChipClassName}
                  onClick={() => setQuickFilter({ availableImmediately: true, hasWhatsApp: true })}
                >
                  Available now
                </button>
                <button
                  type="button"
                  className={filterChipClassName}
                  onClick={() => setQuickFilter({ status: ["Approved", "Ready For Client Matching"], hasWhatsApp: true })}
                >
                  Ready to market
                </button>
                <button type="button" className={filterChipClassName} onClick={() => setFilters({})}>
                  Clear all
                </button>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Filter className="h-4 w-4 text-emerald-600" />
                  <p className="text-sm font-semibold text-slate-900">Pipeline filter</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {pipelineStages.map((stage) => {
                    const active = Array.isArray(filters.status) && (filters.status as string[]).includes(stage);
                    return (
                      <button
                        key={stage}
                        type="button"
                        onClick={() => toggleStageFilter(stage)}
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                          active ? "bg-emerald-600 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200"
                        }`}
                      >
                        {stage} ({grouped.get(stage)?.length ?? 0})
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {presetsQuery.data?.presets.map((preset) => (
                  <Button key={preset.id} variant="ghost" size="sm" onClick={() => setFilters(preset.filters)}>
                    {preset.name}
                  </Button>
                ))}
              </div>
            </div>
          </Card>

          <Card className="overflow-hidden p-0">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-950">Applicant List</h2>
                <p className="text-sm text-slate-500">
                  {applicationsQuery.data?.pageInfo.total ?? 0} applicants matched
                </p>
              </div>
              <Badge variant="outline">{selectedCount} selected</Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Pick</th>
                    <th className="px-4 py-3">Applicant</th>
                    <th className="px-4 py-3">Contact</th>
                    <th className="px-4 py-3">Score</th>
                    <th className="px-4 py-3">Skills</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map((item) => (
                    <tr
                      key={item.id}
                      className={`border-t transition hover:bg-emerald-50/40 ${
                        selectedId === item.id ? "bg-emerald-50/60" : "bg-white"
                      }`}
                    >
                      <td className="px-4 py-3 align-top">
                        <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleSelect(item.id)} />
                      </td>
                      <td className="px-4 py-3 align-top">
                        <button className="text-left" onClick={() => openProfileModal(item.id)}>
                          <div className="font-semibold text-slate-900 hover:underline">{item.profile.fullName}</div>
                          <div className="mt-1 text-xs text-slate-500">
                            {item.maidReferenceCode || item.applicationCode} · {item.profile.nationality} · {item.profile.yearsOfExperience} yrs
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {item.profile.strengthsTags.slice(0, 3).map((tag) => (
                              <Badge key={tag} variant="outline">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </button>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="space-y-2">
                          <div className="text-xs text-slate-600">{item.profile.contactNumber || "No WhatsApp"}</div>
                          <div className="text-xs text-slate-600">{item.profile.email || "No email"}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <Badge className={scoreTone(item.score?.score)}>{item.score?.score ?? 0}</Badge>
                        <p className="mt-2 max-w-[220px] text-xs text-slate-500">
                          {item.score?.explanation || "Qualification score pending"}
                        </p>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="space-y-2">
                          <div className="text-xs text-slate-600">{item.profile.languageSkills.join(", ") || "No languages listed"}</div>
                          <div className="text-xs text-slate-600">{item.profile.cookingSkills.join(", ") || "No cooking notes"}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <Badge variant="outline">{item.status}</Badge>
                        <div className="mt-2 text-xs text-slate-500">
                          Match {item.clientMatchScore ?? 0} · Salary {item.profile.expectedSalary ?? "N/A"}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex flex-wrap gap-2">
                          <Button variant="outline" size="sm" onClick={() => openProfileModal(item.id)}>
                            Profile
                          </Button>
                          {makeWhatsAppHref(item.profile.contactNumber) ? (
                            <Button asChild size="sm" variant="outline">
                              <a href={makeWhatsAppHref(item.profile.contactNumber)} target="_blank" rel="noreferrer">
                                <MessageCircle className="mr-2 h-4 w-4" />
                                WhatsApp
                              </a>
                            </Button>
                          ) : null}
                          {item.profile.email ? (
                            <Button asChild size="sm" variant="outline">
                              <a href={`mailto:${item.profile.email}`}>
                                <Mail className="mr-2 h-4 w-4" />
                                Email
                              </a>
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-950">Bulk Actions</h2>
              <Badge variant="outline">{selectedCount} selected</Badge>
            </div>
            <div className="grid gap-2">
              <Button variant="outline" onClick={() => bulkMutation.mutate({ applicationIds: selectedIds, action: "approve" })} disabled={selectedCount === 0}>
                Approve Selected
              </Button>
              <Button variant="outline" onClick={() => bulkMutation.mutate({ applicationIds: selectedIds, action: "assign_interview" })} disabled={selectedCount === 0}>
                Assign Interview
              </Button>
              <Button variant="outline" onClick={() => bulkMutation.mutate({ applicationIds: selectedIds, action: "request_documents" })} disabled={selectedCount === 0}>
                Request Documents
              </Button>
              <Button variant="outline" onClick={() => bulkMutation.mutate({ applicationIds: selectedIds, action: "reject" })} disabled={selectedCount === 0}>
                Reject Selected
              </Button>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-lg font-bold text-slate-950">Selected Applicant</h2>
            {!selectedId && <p className="mt-3 text-sm text-slate-600">Choose an applicant from the list to inspect contact details, score factors, work history, and documents.</p>}
            {detail && (
              <div className="mt-4 space-y-4">
                <div className="rounded-2xl border bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-bold text-slate-950">{String(detail.profile?.fullName || detail.application.profile.fullName)}</p>
                      <p className="text-sm text-slate-500">
                        {String(detail.profile?.nationality || detail.application.profile.nationality)} · {String(detail.application.status)}
                      </p>
                    </div>
                    <Badge className={scoreTone(detail.score?.score)}>{detail.score?.score ?? 0}</Badge>
                  </div>
                  <p className="mt-3 text-sm text-slate-600">{detail.score?.explanation || detail.application.aiParseSummary}</p>
                  <Button className="mt-4" variant="outline" onClick={() => setProfileModalOpen(true)}>
                    Open Profile Modal
                  </Button>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <a
                      href={makeWhatsAppHref(String(detail.profile?.contactNumber || detail.application.profile.contactNumber || "")) || undefined}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-2xl border bg-white p-3 text-sm"
                    >
                      <p className="font-semibold text-slate-900">WhatsApp</p>
                      <p className="mt-1 text-slate-600">{String(detail.profile?.contactNumber || detail.application.profile.contactNumber || "Not provided")}</p>
                    </a>
                    <a
                      href={detail.profile?.email ? `mailto:${String(detail.profile.email)}` : undefined}
                      className="rounded-2xl border bg-white p-3 text-sm"
                    >
                      <p className="font-semibold text-slate-900">Email</p>
                      <p className="mt-1 text-slate-600">{String(detail.profile?.email || "Not provided")}</p>
                    </a>
                  </div>
                </div>

                <div className="rounded-2xl border p-4">
                  <h3 className="font-semibold text-slate-900">Score Breakdown</h3>
                  <div className="mt-3 space-y-3">
                    {scoreFactors.map(([label, value]) => (
                      <div key={label}>
                        <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
                          <span>{label}</span>
                          <span>{value}</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100">
                          <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${value}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {(detail.score?.strengths ?? []).map((item) => <Badge key={item} variant="outline">{item}</Badge>)}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(detail.score?.weaknesses ?? []).map((item) => <Badge key={item} variant="outline">{item}</Badge>)}
                  </div>
                </div>

                <div className="rounded-2xl border p-4">
                  <h3 className="font-semibold text-slate-900">Documents</h3>
                  <div className="mt-2 space-y-2">
                    {detail.documents.map((document) => (
                      <div key={document.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 text-sm">
                        <span>{document.name}</span>
                        <Badge variant="outline">{document.status}</Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border p-4">
                  <h3 className="font-semibold text-slate-900">Status History</h3>
                  <div className="mt-3 space-y-3">
                    {detail.history.map((item) => (
                      <div key={item.id} className="rounded-xl bg-slate-50 px-3 py-2 text-sm">
                        <div className="font-medium text-slate-900">{item.fromStage ? `${item.fromStage} -> ${item.toStage}` : item.toStage}</div>
                        <div className="text-xs text-slate-500">{item.actor} · {formatDate(item.createdAt)}</div>
                        <div className="mt-1 text-slate-600">{item.reason}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </Card>

          <Card className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-emerald-600" />
              <h2 className="text-lg font-bold text-slate-950">AI Client Matching</h2>
            </div>
            <Textarea value={matchingPrompt} onChange={(event) => setMatchingPrompt(event.target.value)} rows={5} />
            <Button className="mt-3 w-full" onClick={() => matchMutation.mutate()}>
              Run Match Search
            </Button>
            <div className="mt-4 space-y-3">
              {(matchMutation.data?.matches ?? []).map((match, index) => (
                <div key={`${String(match.applicationId)}-${index}`} className="rounded-xl border bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{String(match.candidateName)}</p>
                      <p className="text-xs text-slate-500">{String(match.maidReferenceCode || "")}</p>
                    </div>
                    <Badge className={scoreTone(Number(match.matchScore ?? 0))}>{String(match.matchScore)}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{String(match.recommendation)}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-lg font-bold text-slate-950">Saved Filters</h2>
            <div className="mt-3 flex gap-2">
              <Input value={presetName} onChange={(event) => setPresetName(event.target.value)} placeholder="Preset name" />
              <Button onClick={() => savePresetMutation.mutate()} disabled={!presetName.trim()}>
                Save
              </Button>
            </div>
          </Card>
        </div>
      </section>

      <Dialog open={profileModalOpen} onOpenChange={setProfileModalOpen}>
        <DialogContent className="max-h-[92vh] max-w-6xl overflow-hidden rounded-3xl p-0">
          <div className="grid h-full min-h-[75vh] grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)]">
            <div className="border-b bg-slate-50 p-6 xl:border-b-0 xl:border-r">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black text-slate-950">
                  {String(detail?.profile?.fullName || detail?.application.profile.fullName || "Applicant Profile")}
                </DialogTitle>
                <DialogDescription className="text-sm text-slate-600">
                  Full recruiter review with uploaded documents, scoring, and quick contact actions.
                </DialogDescription>
              </DialogHeader>

              {detail && (
                <div className="mt-6 space-y-4">
                  <div className="rounded-2xl border bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{String(detail.application.applicationCode)}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {String(detail.profile?.nationality || detail.application.profile.nationality)} · {String(detail.application.status)}
                        </p>
                      </div>
                      <Badge className={scoreTone(detail.score?.score)}>{detail.score?.score ?? 0}</Badge>
                    </div>
                    <p className="mt-3 text-sm text-slate-600">{detail.score?.explanation || detail.application.aiParseSummary}</p>
                  </div>

                  <div className="grid gap-3">
                    <a
                      href={makeWhatsAppHref(String(detail.profile?.contactNumber || detail.application.profile.contactNumber || "")) || undefined}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-2xl border bg-white p-3 text-sm"
                    >
                      <p className="font-semibold text-slate-900">WhatsApp</p>
                      <p className="mt-1 text-slate-600">{String(detail.profile?.contactNumber || detail.application.profile.contactNumber || "Not provided")}</p>
                    </a>
                    <a
                      href={detail.profile?.email ? `mailto:${String(detail.profile.email)}` : undefined}
                      className="rounded-2xl border bg-white p-3 text-sm"
                    >
                      <p className="font-semibold text-slate-900">Email</p>
                      <p className="mt-1 text-slate-600">{String(detail.profile?.email || "Not provided")}</p>
                    </a>
                  </div>

                  <div className="rounded-2xl border bg-white p-4">
                    <h3 className="font-semibold text-slate-900">Documents</h3>
                    <div className="mt-3 space-y-2">
                      {documents.length === 0 ? (
                        <p className="text-sm text-slate-500">No uploaded documents yet.</p>
                      ) : (
                        documents.map((document, index) => {
                          const kind = getDocumentKind(document.name, document.url);
                          return (
                            <button
                              key={document.id}
                              type="button"
                              onClick={() => setActiveDocumentIndex(index)}
                              className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-3 py-3 text-left transition ${
                                activeDocumentIndex === index ? "border-emerald-400 bg-emerald-50" : "border-slate-200 bg-white hover:border-emerald-300"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className="rounded-xl bg-slate-100 p-2 text-slate-600">
                                  {kind === "image" ? <ImageIcon className="h-4 w-4" /> : kind === "video" ? <Video className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-slate-900">{document.name}</p>
                                  <p className="text-xs text-slate-500">{document.type} · {document.status}</p>
                                </div>
                              </div>
                              <Badge variant="outline">{index + 1}</Badge>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex min-h-0 flex-col">
              <div className="border-b px-6 py-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-950">Document Viewer</h3>
                    <p className="text-sm text-slate-500">
                      {activeDocument ? `${activeDocumentIndex + 1} of ${documents.length}` : "Select a document to preview"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveDocumentIndex((current) => Math.max(current - 1, 0))}
                      disabled={activeDocumentIndex <= 0}
                    >
                      <MoveLeft className="mr-2 h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveDocumentIndex((current) => Math.min(current + 1, documents.length - 1))}
                      disabled={documents.length === 0 || activeDocumentIndex >= documents.length - 1}
                    >
                      Next
                      <MoveRight className="ml-2 h-4 w-4" />
                    </Button>
                    {activeDocument?.url ? (
                      <Button asChild variant="outline" size="sm">
                        <a href={activeDocument.url} target="_blank" rel="noreferrer">
                          <MonitorUp className="mr-2 h-4 w-4" />
                          Full Screen
                        </a>
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="grid min-h-0 flex-1 gap-0 xl:grid-cols-[minmax(0,1fr)_320px]">
                <div className="min-h-0 border-b xl:border-b-0 xl:border-r">
                  <div className="flex h-full items-center justify-center bg-slate-950/95 p-4">
                    {!activeDocument ? (
                      <div className="text-center text-slate-300">
                        <FileText className="mx-auto h-10 w-10 opacity-70" />
                        <p className="mt-3 text-sm">No document selected.</p>
                      </div>
                    ) : canPreviewActiveDocument ? (
                      activeDocumentKind === "image" ? (
                        <img src={activeDocument.url} alt={activeDocument.name} className="max-h-full max-w-full rounded-2xl object-contain" />
                      ) : activeDocumentKind === "video" ? (
                        <video src={activeDocument.url} controls className="max-h-full max-w-full rounded-2xl" />
                      ) : (
                        <iframe title={activeDocument.name} src={activeDocument.url} className="h-full min-h-[60vh] w-full rounded-2xl bg-white" />
                      )
                    ) : (
                      <div className="max-w-md rounded-3xl bg-white p-6 text-center shadow-sm">
                        <FileText className="mx-auto h-10 w-10 text-slate-500" />
                        <h4 className="mt-4 text-lg font-bold text-slate-950">{activeDocument.name}</h4>
                        <p className="mt-2 text-sm text-slate-600">
                          This file type is displayed as an uploaded document record. Open it in fullscreen to review the original file.
                        </p>
                        <Button asChild className="mt-4">
                          <a href={activeDocument.url} target="_blank" rel="noreferrer">
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Open File
                          </a>
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="min-h-0 overflow-y-auto bg-white p-6">
                  {detail ? (
                    <div className="space-y-5">
                      <div className="rounded-2xl border p-4">
                        <h3 className="font-semibold text-slate-900">Score Breakdown</h3>
                        <div className="mt-3 space-y-3">
                          {scoreFactors.map(([label, value]) => (
                            <div key={label}>
                              <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
                                <span>{label}</span>
                                <span>{value}</span>
                              </div>
                              <div className="h-2 rounded-full bg-slate-100">
                                <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${value}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-2xl border p-4">
                        <h3 className="font-semibold text-slate-900">Strengths</h3>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {(detail.score?.strengths ?? []).map((item) => <Badge key={item} variant="outline">{item}</Badge>)}
                        </div>
                        <h3 className="mt-4 font-semibold text-slate-900">Weaknesses</h3>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {(detail.score?.weaknesses ?? []).map((item) => <Badge key={item} variant="outline">{item}</Badge>)}
                        </div>
                      </div>

                      <div className="rounded-2xl border p-4">
                        <h3 className="font-semibold text-slate-900">Status History</h3>
                        <div className="mt-3 space-y-3">
                          {detail.history.map((item) => (
                            <div key={item.id} className="rounded-xl bg-slate-50 px-3 py-2 text-sm">
                              <div className="font-medium text-slate-900">{item.fromStage ? `${item.fromStage} -> ${item.toStage}` : item.toStage}</div>
                              <div className="text-xs text-slate-500">{item.actor} · {formatDate(item.createdAt)}</div>
                              <div className="mt-1 text-slate-600">{item.reason}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">Loading applicant profile…</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AtsRecruitmentPage;
