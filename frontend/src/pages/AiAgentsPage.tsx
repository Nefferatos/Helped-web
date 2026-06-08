import { useCallback, useEffect, useState } from "react";
import AiAgentPanel from "@/components/ai/AiAgentPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/sonner";
import { getAgencyAdminAuthHeaders } from "@/lib/agencyAdminAuth";
import {
  Activity,
  AlertTriangle,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  FileText,
  Gauge,
  Loader2,
  MessageSquareText,
  Play,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";

type AutopilotAction = {
  actionId: string | null;
  actionType: string;
  agentId: string;
  title: string;
  priority: "low" | "medium" | "high";
  automation: "draft" | "recommend" | "report";
  preview: string;
  conversationId?: string;
  offline?: boolean;
};

type AutopilotResult = {
  dryRun: boolean;
  scannedAt: string;
  candidateCount: number;
  actionCount: number;
  actions: AutopilotAction[];
};

type LiveStats = {
  totalEnquiries: number;
  unreadEnquiries: number;
  totalMaids: number;
  newApplicants: number;
};

const priorityStyles: Record<string, string> = {
  high: "border-red-200 bg-red-50 text-red-700",
  medium: "border-amber-200 bg-amber-50 text-amber-700",
  low: "border-slate-200 bg-slate-50 text-slate-600",
};

const automationStyles: Record<string, string> = {
  draft: "border-blue-200 bg-blue-50 text-blue-700",
  recommend: "border-purple-200 bg-purple-50 text-purple-700",
  report: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

const agentConsoles = [
  {
    value: "agency-assistant",
    title: "Agency Assistant",
    shortLabel: "Assistant",
    description: "Summarize enquiries, requests, messages, and recommend follow-ups.",
    endpoint: "/api/ai/agency-assistant",
    status: "live" as const,
    runCount: "–",
    impact: "Follow-ups",
    confidence: 92,
    automationSteps: ["Collect new enquiries", "Rank urgency and missing context", "Draft next best actions"],
    quickPrompts: [
      "Summarize today's urgent enquiries and recommend follow-ups.",
      "Draft a polite response for employers waiting on agency updates.",
      "Which maids haven't been updated in a long time and need a profile refresh?",
    ],
  },
  {
    value: "content-generator",
    title: "Content Generator",
    shortLabel: "Content",
    description: "Draft maid descriptions, ads, FAQs, emails, notifications, and enquiry replies.",
    endpoint: "/api/ai/content-generator",
    status: "live" as const,
    runCount: "–",
    impact: "Drafts",
    confidence: 89,
    automationSteps: ["Read selected agency records", "Generate compliant copy", "Hold drafts for approval"],
    quickPrompts: [
      "Create a professional maid profile description from available agency maid data.",
      "Write three short advertisement variants for available maids.",
      "Draft a welcome email for a newly registered employer.",
    ],
  },
  {
    value: "applicant-screening",
    title: "Applicant Screening",
    shortLabel: "Screening",
    description: "Review FDW applications for missing documents, incomplete forms, and readiness.",
    endpoint: "/api/ai/screen-applicant",
    status: "review" as const,
    runCount: "–",
    impact: "Readiness",
    confidence: 81,
    automationSteps: ["Check application fields", "Detect missing documents", "Prepare readiness summary"],
    fields: [{ name: "applicationId", label: "Application ID (optional)", placeholder: "Leave blank to screen latest" }],
    quickPrompts: ["Screen the latest applicant and list any missing requirements or blockers."],
  },
  {
    value: "admin-analytics",
    title: "Admin Analytics",
    shortLabel: "Analytics",
    description: "Summarize trends, bottlenecks, inactive maids, requests, contracts, and unanswered enquiries.",
    endpoint: "/api/ai/admin-analytics",
    status: "live" as const,
    runCount: "–",
    impact: "Insights",
    confidence: 86,
    automationSteps: ["Scan operational records", "Detect bottlenecks", "Recommend management actions"],
    quickPrompts: [
      "Generate an operational report with bottlenecks and next actions.",
      "Identify inactive maids and unanswered enquiries.",
      "How many enquiries came in this week? Which ones need urgent follow-up?",
    ],
  },
  {
    value: "automation",
    title: "Workflow Automation",
    shortLabel: "Automation",
    description: "Plan and draft automation workflows for repetitive tasks: follow-ups, reminders, batch updates, and scheduling rules.",
    endpoint: "/api/ai/automation",
    status: "live" as const,
    runCount: "–",
    impact: "Time saved",
    confidence: 84,
    automationSteps: ["Identify repetitive manual tasks", "Draft trigger-condition-action plan", "Flag steps needing human approval"],
    quickPrompts: [
      "Which tasks in our agency workflow could be automated to save the most time?",
      "Draft an automation rule to follow up on pending requests after 48 hours.",
      "Create a weekly digest workflow that summarises new enquiries and applications every Monday.",
      "Suggest a batch update plan to refresh all maid profiles not updated in 60+ days.",
    ],
  },
];

export default function AiAgentsPage() {
  const [activeSection, setActiveSection] = useState("autopilot");
  const [stats, setStats] = useState<LiveStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [autopilotResult, setAutopilotResult] = useState<AutopilotResult | null>(null);
  const [autopilotRunning, setAutopilotRunning] = useState(false);
  const [expandedAction, setExpandedAction] = useState<number | null>(null);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const [enqRes, maidsRes, atsRes] = await Promise.allSettled([
        fetch("/api/enquiries/unread-count", { headers: getAgencyAdminAuthHeaders() }),
        fetch("/api/maids", { headers: getAgencyAdminAuthHeaders() }),
        fetch("/api/ats/dashboard", { headers: getAgencyAdminAuthHeaders() }),
      ]);

      const enqData = enqRes.status === "fulfilled" && enqRes.value.ok
        ? (await enqRes.value.json() as { count?: number; unreadCount?: number })
        : null;
      const maidsData = maidsRes.status === "fulfilled" && maidsRes.value.ok
        ? (await maidsRes.value.json() as { maids?: unknown[] })
        : null;
      const atsData = atsRes.status === "fulfilled" && atsRes.value.ok
        ? (await atsRes.value.json() as { newApplicants?: number })
        : null;

      setStats({
        totalEnquiries: enqData?.count ?? 0,
        unreadEnquiries: enqData?.unreadCount ?? 0,
        totalMaids: maidsData?.maids?.length ?? 0,
        newApplicants: atsData?.newApplicants ?? 0,
      });
    } catch {
      /* silently ignore */
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => { void loadStats(); }, [loadStats]);

  const runAutopilot = async (dryRun = false) => {
    setAutopilotRunning(true);
    setAutopilotResult(null);
    try {
      const res = await fetch("/api/ai/autopilot/run", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAgencyAdminAuthHeaders() },
        body: JSON.stringify({ dryRun, maxActions: 6 }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(d.error ?? `Autopilot failed (${res.status})`);
      }
      const data = await res.json() as AutopilotResult;
      setAutopilotResult(data);
      if (data.actionCount === 0) {
        toast.info("Autopilot found nothing to do — all items are up to date.");
      } else {
        toast.success(`Autopilot completed ${data.actionCount} action${data.actionCount !== 1 ? "s" : ""}.`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Autopilot run failed");
    } finally {
      setAutopilotRunning(false);
    }
  };

  const statCards = [
    { label: "Total enquiries", value: stats?.totalEnquiries ?? "–", icon: MessageSquareText, note: `${stats?.unreadEnquiries ?? "–"} unread` },
    { label: "Active maids", value: stats?.totalMaids ?? "–", icon: Users, note: "On roster" },
    { label: "New applicants", value: stats?.newApplicants ?? "–", icon: ClipboardList, note: "This period" },
    { label: "Agents ready", value: "5", icon: Bot, note: "Live + review" },
  ];

  return (
    <div className="mx-auto grid max-w-7xl gap-6">
      <Tabs value={activeSection} onValueChange={setActiveSection} className="grid gap-5">
        {/* Tab bar */}
        <div className="overflow-x-auto rounded-xl border bg-card p-1.5 shadow-sm">
          <TabsList className="h-auto min-w-max justify-start gap-1 bg-transparent p-0">
            {[
              { value: "autopilot", icon: Sparkles, label: "AI Autopilot" },
              { value: "console", icon: Bot, label: "Agent Console" },
            ].map(({ value, icon: Icon, label }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="min-h-9 gap-2 rounded-lg px-4 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow"
              >
                <Icon className="h-4 w-4" />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* ── Autopilot tab ── */}
        <TabsContent value="autopilot" className="mt-0 grid gap-6">

          {/* Hero */}
          <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <div className="grid gap-6 p-6 lg:grid-cols-[1fr_300px]">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="border-primary/20 bg-primary/10 text-primary">
                    <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                    Autopilot
                  </Badge>
                  <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                    Enabled
                  </Badge>
                </div>
                <h1 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">AI Agent Autopilot</h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Scan your agency operations and run AI-generated follow-ups, content drafts, applicant
                  screening, and analytics — all in one click. Results are proposed drafts; nothing is sent
                  without your review.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Button onClick={() => void runAutopilot(false)} disabled={autopilotRunning} className="gap-2">
                    {autopilotRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                    {autopilotRunning ? "Running…" : "Run Autopilot Now"}
                  </Button>
                  <Button variant="outline" onClick={() => void runAutopilot(true)} disabled={autopilotRunning} className="gap-2">
                    <Play className="h-4 w-4" />
                    Dry Run (Preview)
                  </Button>
                  <Button variant="outline" onClick={() => setActiveSection("console")} className="gap-2">
                    <Bot className="h-4 w-4" />
                    Open Agent Console
                  </Button>
                </div>
              </div>

              {/* Mode panel */}
              <div className="rounded-xl border bg-muted/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Operating mode</p>
                    <p className="text-lg font-semibold">Human approved</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="mb-1.5 flex justify-between text-xs font-medium text-muted-foreground">
                    <span>Autonomy level</span>
                    <span>Propose only</span>
                  </div>
                  <Progress value={40} className="h-2" />
                </div>
                <p className="mt-3 text-xs leading-5 text-muted-foreground">
                  Autopilot proposes drafts and recommendations. You approve before anything is sent or saved.
                </p>
              </div>
            </div>

            {/* Live stat bar */}
            <div className="grid border-t bg-muted/10 sm:grid-cols-2 lg:grid-cols-4">
              {statCards.map(({ label, value, icon: Icon, note }) => (
                <div key={label} className="flex min-h-20 items-center gap-3 border-b p-4 sm:border-r lg:border-b-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background text-primary shadow-sm">
                    {statsLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-2xl font-bold leading-none">{statsLoading ? "…" : value}</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">{note}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Autopilot results */}
          {autopilotResult && (
            <section className="rounded-xl border bg-card shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3.5">
                <div>
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    <h2 className="text-sm font-semibold">
                      Autopilot Results
                      {autopilotResult.dryRun && (
                        <span className="ml-2 text-xs font-normal text-muted-foreground">(dry run — no actions saved)</span>
                      )}
                    </h2>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Scanned at {new Date(autopilotResult.scannedAt).toLocaleTimeString()} ·
                    {" "}{autopilotResult.candidateCount} candidate{autopilotResult.candidateCount !== 1 ? "s" : ""} found ·
                    {" "}{autopilotResult.actionCount} action{autopilotResult.actionCount !== 1 ? "s" : ""} run
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => void runAutopilot(false)} disabled={autopilotRunning} className="gap-1.5">
                  <RefreshCw className="h-3.5 w-3.5" />
                  Re-run
                </Button>
              </div>

              {autopilotResult.actions.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                  <p className="text-sm font-medium">All caught up</p>
                  <p className="text-xs text-muted-foreground">
                    No pending requests, unread messages, or stale items found. Check back later.
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {autopilotResult.actions.map((action, i) => (
                    <div key={i} className="p-4">
                      <div
                        className="flex cursor-pointer items-start justify-between gap-3"
                        onClick={() => setExpandedAction(expandedAction === i ? null : i)}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge variant="outline" className={`text-[10px] ${priorityStyles[action.priority]}`}>
                              {action.priority}
                            </Badge>
                            <Badge variant="outline" className={`text-[10px] ${automationStyles[action.automation]}`}>
                              {action.automation}
                            </Badge>
                            {action.offline && (
                              <Badge variant="outline" className="text-[10px] border-orange-200 bg-orange-50 text-orange-700">
                                offline
                              </Badge>
                            )}
                            <span className="text-[10px] text-muted-foreground">{action.agentId.replace(/_/g, " ")}</span>
                          </div>
                          <p className="mt-1.5 text-sm font-medium">{action.title}</p>
                          {expandedAction !== i && (
                            <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                              {action.preview}
                            </p>
                          )}
                        </div>
                        <button className="mt-1 shrink-0 text-muted-foreground hover:text-foreground">
                          {expandedAction === i ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                      </div>
                      {expandedAction === i && (
                        <div className="mt-3 rounded-lg border bg-muted/20 p-3">
                          <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">{action.preview}</p>
                          {action.preview.length >= 240 && (
                            <p className="mt-1.5 text-[10px] text-muted-foreground">
                              Preview truncated to 240 chars. Open Agent Console to run full output.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* What autopilot covers */}
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: MessageSquareText,
                title: "Enquiry follow-ups",
                detail: "Detect pending requests older than 12 hours and draft employer replies.",
                coverage: "Requests > 12h old",
              },
              {
                icon: Users,
                title: "Applicant screening",
                detail: "Flag incomplete ATS applications and generate readiness summaries.",
                coverage: "Unreviewed applicants",
              },
              {
                icon: FileText,
                title: "Content drafts",
                detail: "Refresh public maid profiles that haven't been updated in 60+ days.",
                coverage: "Profiles > 60 days old",
              },
              {
                icon: Gauge,
                title: "Operations digest",
                detail: "Generate a daily brief covering bottlenecks, unanswered items, and next actions.",
                coverage: "Once per day",
              },
              {
                icon: AlertTriangle,
                title: "Unread client messages",
                detail: "Draft replies for client support messages unanswered for more than 30 minutes.",
                coverage: "Messages > 30min old",
              },
              {
                icon: Sparkles,
                title: "De-duplicate runs",
                detail: "Autopilot remembers what it ran today so it won't repeat the same actions.",
                coverage: "24-hour window",
              },
            ].map(({ icon: Icon, title, detail, coverage }) => (
              <div key={title} className="rounded-xl border bg-card p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold">{title}</h3>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p>
                    <Badge variant="outline" className="mt-2 text-[10px]">{coverage}</Badge>
                  </div>
                </div>
              </div>
            ))}
          </section>
        </TabsContent>

        {/* ── Agent Console tab ── */}
        <TabsContent value="console" className="mt-0 grid gap-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Agent Console</h2>
            <p className="text-sm text-muted-foreground">
              Chat with individual agents. Click a quick prompt to run immediately, or type your own task.
            </p>
          </div>

          <Tabs defaultValue={agentConsoles[0].value} className="grid gap-4">
            <div className="overflow-x-auto rounded-xl border bg-card p-1.5 shadow-sm">
              <TabsList className="h-auto min-w-max justify-start gap-1 bg-transparent p-0">
                {agentConsoles.map((agent) => (
                  <TabsTrigger
                    key={agent.value}
                    value={agent.value}
                    className="min-h-9 gap-2 rounded-lg px-3 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow"
                  >
                    <Bot className="h-3.5 w-3.5" />
                    {agent.shortLabel}
                    <Badge
                      variant="outline"
                      className={`hidden text-[9px] sm:inline-flex ${
                        agent.status === "live"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-amber-200 bg-amber-50 text-amber-700"
                      }`}
                    >
                      {agent.status === "live" ? "Live" : "Review"}
                    </Badge>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {agentConsoles.map((agent) => (
              <TabsContent key={agent.value} value={agent.value} className="mt-0">
                <AiAgentPanel
                  title={agent.title}
                  description={agent.description}
                  endpoint={agent.endpoint}
                  mode="agency"
                  status={agent.status}
                  runCount={agent.runCount}
                  impact={agent.impact}
                  confidence={agent.confidence}
                  automationSteps={agent.automationSteps}
                  fields={agent.fields}
                  quickPrompts={agent.quickPrompts}
                />
              </TabsContent>
            ))}
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
}
