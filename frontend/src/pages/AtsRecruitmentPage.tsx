import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  syncAtsFromMaids,
  updateAtsStage,
  type AtsApplicationListItem,
} from "@/lib/ats";
import {
  ArrowRightLeft,
  Brain,
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardCheck,
  Filter,
  LayoutGrid,
  List,
  RefreshCw,
  Search,
  Sparkles,
  Users,
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

const AtsRecruitmentPage = () => {
  const queryClient = useQueryClient();
  const [view, setView] = useState<"kanban" | "table" | "cards">("kanban");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [matchingPrompt, setMatchingPrompt] = useState(
    "Need Indonesian maid. Can care for newborn. Can cook Chinese food. Budget SGD 700.",
  );
  const [filters, setFilters] = useState<Record<string, unknown>>({});
  const [presetName, setPresetName] = useState("");

  const dashboardQuery = useQuery({
    queryKey: ["ats-dashboard"],
    queryFn: fetchAtsDashboard,
  });

  const applicationsQuery = useQuery({
    queryKey: ["ats-applications", search, JSON.stringify(filters)],
    queryFn: () =>
      fetchAtsApplications({
        q: search,
        filters,
        sort: "qualificationScore:desc",
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

  const syncMutation = useMutation({
    mutationFn: syncAtsFromMaids,
    onSuccess: (data) => {
      toast.success(`ATS synchronized from ${data.synced} maid records`);
      void queryClient.invalidateQueries({ queryKey: ["ats-dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["ats-applications"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to sync ATS"),
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
  const applications = applicationsQuery.data?.data ?? [];
  const detail = detailQuery.data;

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

  const cardGrid = (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {applications.map((item) => (
        <Card key={item.id} className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <button className="text-left text-base font-semibold hover:underline" onClick={() => setSelectedId(item.id)}>
                {item.profile.fullName}
              </button>
              <p className="text-sm text-muted-foreground">
                {item.maidReferenceCode || "Applicant"} · {item.profile.nationality}
              </p>
            </div>
            <Badge className={scoreTone(item.score?.score)}>{item.score?.score ?? 0}</Badge>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <Badge variant="outline">{item.status}</Badge>
            <Badge variant="outline">{item.profile.yearsOfExperience} yrs</Badge>
            <Badge variant="outline">{item.profile.languageSkills.length} langs</Badge>
            <Badge variant="outline">{item.clientMatchScore ?? 0} match</Badge>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            {item.score?.explanation || "Qualification score pending"}
          </p>
          <div className="mt-4 flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={() => setSelectedId(item.id)}>
              Profile
            </Button>
            <Button size="sm" onClick={() => stageMutation.mutate({ applicationId: item.id, stage: "Approved" })}>
              Approve
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">Recruitment ATS</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
              Maid Recruitment, Qualification, and Hiring
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Automated intake, AI-style parsing, scoring, background verification, interview tracking,
              workflow automation, client matching, and bulk candidate management in one recruiter workspace.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link to="/apply-as-maid">Open Recruitment Portal</Link>
            </Button>
            <Button variant="outline" onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Sync Existing Maids
            </Button>
            <Button onClick={() => stageMutation.mutate({ applicationId: selectedId || applications[0]?.id || "", stage: "Ready For Client Matching" })} disabled={!selectedId && !applications.length}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Auto-Queue Ready Candidate
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

      <section className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card className="p-5">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2">
              <Button variant={view === "kanban" ? "default" : "outline"} size="sm" onClick={() => setView("kanban")}>
                <LayoutGrid className="mr-2 h-4 w-4" />
                Kanban
              </Button>
              <Button variant={view === "cards" ? "default" : "outline"} size="sm" onClick={() => setView("cards")}>
                <Sparkles className="mr-2 h-4 w-4" />
                Cards
              </Button>
              <Button variant={view === "table" ? "default" : "outline"} size="sm" onClick={() => setView("table")}>
                <List className="mr-2 h-4 w-4" />
                Table
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[240px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, nationality, skill, certification..." />
              </div>
              <Button variant="outline" size="sm" onClick={() => setFilters({ minExperience: 3, childcareExperience: true, availableImmediately: true })}>
                <Filter className="mr-2 h-4 w-4" />
                Childcare Filter
              </Button>
            </div>
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-2">
            {presetsQuery.data?.presets.map((preset) => (
              <Button key={preset.id} variant="ghost" size="sm" onClick={() => setFilters(preset.filters)}>
                {preset.name}
              </Button>
            ))}
          </div>

          {view === "kanban" && (
            <div className="grid gap-4 xl:grid-cols-4">
              {pipelineStages.map((stage) => (
                <div key={stage} className="rounded-2xl border bg-slate-50 p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-800">{stage}</h3>
                    <Badge variant="outline">{grouped.get(stage)?.length ?? 0}</Badge>
                  </div>
                  <div className="space-y-3">
                    {(grouped.get(stage) ?? []).map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setSelectedId(item.id)}
                        className="w-full rounded-xl border bg-white p-3 text-left shadow-sm transition hover:border-emerald-300"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-semibold text-slate-900">{item.profile.fullName}</p>
                          <Badge className={scoreTone(item.score?.score)}>{item.score?.score ?? 0}</Badge>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">{item.profile.nationality} · {item.profile.yearsOfExperience} yrs</p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {item.profile.languageSkills.slice(0, 2).map((language) => (
                            <Badge key={language} variant="outline">{language}</Badge>
                          ))}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {view === "cards" && cardGrid}

          {view === "table" && (
            <div className="overflow-x-auto rounded-2xl border">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left">
                  <tr>
                    <th className="px-3 py-2">Pick</th>
                    <th className="px-3 py-2">Candidate</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Score</th>
                    <th className="px-3 py-2">Experience</th>
                    <th className="px-3 py-2">Languages</th>
                    <th className="px-3 py-2">Match</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map((item) => (
                    <tr key={item.id} className="border-t">
                      <td className="px-3 py-2">
                        <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleSelect(item.id)} />
                      </td>
                      <td className="px-3 py-2">
                        <button className="font-semibold hover:underline" onClick={() => setSelectedId(item.id)}>
                          {item.profile.fullName}
                        </button>
                        <div className="text-xs text-slate-500">{item.maidReferenceCode || "Applicant"} · {item.profile.nationality}</div>
                      </td>
                      <td className="px-3 py-2">{item.status}</td>
                      <td className="px-3 py-2"><Badge className={scoreTone(item.score?.score)}>{item.score?.score ?? 0}</Badge></td>
                      <td className="px-3 py-2">{item.profile.yearsOfExperience} yrs</td>
                      <td className="px-3 py-2">{item.profile.languageSkills.join(", ") || "N/A"}</td>
                      <td className="px-3 py-2">{item.clientMatchScore ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <div className="space-y-6">
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-950">Bulk Actions</h2>
              <Badge variant="outline">{selectedIds.length} selected</Badge>
            </div>
            <div className="grid gap-2">
              <Button variant="outline" onClick={() => bulkMutation.mutate({ applicationIds: selectedIds, action: "approve" })} disabled={selectedIds.length === 0}>
                Approve Multiple Candidates
              </Button>
              <Button variant="outline" onClick={() => bulkMutation.mutate({ applicationIds: selectedIds, action: "reject" })} disabled={selectedIds.length === 0}>
                Reject Multiple Candidates
              </Button>
              <Button variant="outline" onClick={() => bulkMutation.mutate({ applicationIds: selectedIds, action: "request_documents" })} disabled={selectedIds.length === 0}>
                Request Documents
              </Button>
              <Button variant="outline" onClick={() => bulkMutation.mutate({ applicationIds: selectedIds, action: "assign_interview" })} disabled={selectedIds.length === 0}>
                Assign Interview
              </Button>
            </div>
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

      <section className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <Card className="p-5">
          <h2 className="text-lg font-bold text-slate-950">Hiring Funnel</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-4">
            {dashboard?.funnel.map((stage) => (
              <div key={stage.stage} className="rounded-2xl border bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{stage.stage}</p>
                <p className="mt-2 text-3xl font-black text-slate-950">{stage.count}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-lg font-bold text-slate-950">Candidate Profile & Timeline</h2>
          {!selectedId && <p className="mt-3 text-sm text-slate-600">Select any candidate from the pipeline to inspect the full ATS profile, score explanation, timeline, interviews, and background checks.</p>}
          {detail && (
            <div className="mt-4 space-y-4">
              <div className="rounded-2xl border bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-lg font-bold text-slate-950">{String(detail.profile?.fullName || detail.application.profile.fullName)}</p>
                    <p className="text-sm text-slate-500">
                      {String(detail.profile?.nationality || detail.application.profile.nationality)} · {String(detail.application.status)}
                    </p>
                  </div>
                  <Badge className={scoreTone(detail.score?.score)}>{detail.score?.score ?? 0}</Badge>
                </div>
                <p className="mt-3 text-sm text-slate-600">{detail.score?.explanation || detail.application.aiParseSummary}</p>
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
                      <div className="font-medium text-slate-900">{item.fromStage ? `${item.fromStage} → ${item.toStage}` : item.toStage}</div>
                      <div className="text-xs text-slate-500">{item.actor} · {formatDate(item.createdAt)}</div>
                      <div className="mt-1 text-slate-600">{item.reason}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </Card>
      </section>
    </div>
  );
};

export default AtsRecruitmentPage;
