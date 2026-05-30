import AiAgentPanel from "@/components/ai/AiAgentPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Activity,
  ArrowUpRight,
  BellRing,
  Bot,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileText,
  Gauge,
  LineChart,
  MessageSquareText,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TimerReset,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";

const commandStats = [
  { label: "Active agents", value: "4", icon: Bot },
  { label: "Queued actions", value: "18", icon: BellRing },
  { label: "Auto-handled", value: "76%", icon: Gauge },
  { label: "Review items", value: "5", icon: ClipboardCheck },
];

const autopilotLanes = [
  {
    title: "Enquiry intake",
    detail: "Classify intent, urgency, and missing employer details.",
    icon: MessageSquareText,
    progress: 84,
  },
  {
    title: "Applicant readiness",
    detail: "Check missing documents and next-step blockers.",
    icon: Users,
    progress: 68,
  },
  {
    title: "Content drafts",
    detail: "Prepare profiles, ads, replies, FAQs, and notifications.",
    icon: FileText,
    progress: 91,
  },
];

const reportSummaries = [
  { label: "Tasks completed", value: "104", change: "+18%", icon: CheckCircle2 },
  { label: "Hours saved", value: "14.5", change: "+4.2h", icon: TimerReset },
  { label: "Agent accuracy", value: "89%", change: "+6%", icon: TrendingUp },
  { label: "Pending reviews", value: "5", change: "2 urgent", icon: ShieldCheck },
];

const agentReports = [
  {
    agent: "Agency Assistant",
    workflow: "Enquiry follow-up",
    runs: "42",
    success: "94%",
    review: "2",
    lastRun: "8 min ago",
    status: "Healthy",
  },
  {
    agent: "Content Generator",
    workflow: "Profile and ad drafts",
    runs: "31",
    success: "90%",
    review: "1",
    lastRun: "22 min ago",
    status: "Healthy",
  },
  {
    agent: "Applicant Screening",
    workflow: "FDW readiness checks",
    runs: "19",
    success: "81%",
    review: "5",
    lastRun: "41 min ago",
    status: "Review",
  },
  {
    agent: "Admin Analytics",
    workflow: "Operations reports",
    runs: "12",
    success: "86%",
    review: "0",
    lastRun: "Today, 9:00 AM",
    status: "Healthy",
  },
];

const recentReports = [
  {
    title: "Daily operations brief",
    detail: "Inactive maids, unanswered enquiries, and contract bottlenecks.",
    time: "Today, 9:00 AM",
  },
  {
    title: "Applicant readiness report",
    detail: "Five applications need documents before agency review.",
    time: "Yesterday, 5:35 PM",
  },
  {
    title: "Employer follow-up report",
    detail: "Urgent employers grouped by SLA age and next reply needed.",
    time: "Yesterday, 11:20 AM",
  },
];

export default function AiAgentsPage() {
  return (
    <div className="mx-auto grid max-w-7xl gap-6">
      <section className="overflow-hidden rounded-lg border bg-card shadow-sm">
        <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:p-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-primary/20 bg-primary/10 text-primary">
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                Agent autopilot
              </Badge>
              <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                Live monitoring
              </Badge>
            </div>
            <div className="mt-4 max-w-3xl">
              <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                AI Agent Autopilot
              </h1>
              <p className="mt-3 text-sm leading-6 text-muted-foreground md:text-base">
                Run agency agents from one operations console: enquiries, applicant screening, content drafts,
                employer follow-ups, and management analytics.
              </p>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button asChild>
                <a href="#agent-console">
                  <Zap className="mr-2 h-4 w-4" />
                  Start Autopilot
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href="#agent-console">
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Review Queue
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href="#agent-reports">
                  <LineChart className="mr-2 h-4 w-4" />
                  View Reports
                </a>
              </Button>
            </div>
          </div>

          <div className="rounded-lg border bg-muted/25 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Operating mode</p>
                <p className="text-xl font-semibold">Human approved</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-md bg-accent text-accent-foreground">
                <Activity className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4">
              <div className="mb-2 flex justify-between text-xs font-medium text-muted-foreground">
                <span>Autonomy level</span>
                <span>72%</span>
              </div>
              <Progress value={72} className="h-2" />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-md border bg-background p-3">
                <p className="text-muted-foreground">SLA watch</p>
                <p className="font-semibold">11 tasks</p>
              </div>
              <div className="rounded-md border bg-background p-3">
                <p className="text-muted-foreground">Escalations</p>
                <p className="font-semibold">2 urgent</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid border-t bg-muted/20 sm:grid-cols-2 lg:grid-cols-4">
          {commandStats.map(({ label, value, icon: Icon }) => (
            <div key={label} className="flex min-h-24 items-center gap-3 border-b p-4 sm:border-r lg:border-b-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-background text-primary shadow-sm">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="text-2xl font-semibold">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {autopilotLanes.map(({ title, detail, icon: Icon, progress }) => (
          <div key={title} className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold">{title}</h2>
                  <p className="mt-1 text-sm leading-5 text-muted-foreground">{detail}</p>
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </div>
            <div className="mt-4">
              <div className="mb-2 flex justify-between text-xs font-medium text-muted-foreground">
                <span>Automation coverage</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </div>
        ))}
      </section>

      <section className="grid gap-4" id="agent-reports">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <LineChart className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold tracking-tight">Agent Reports</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Track agent output, review workload, run health, and operational impact.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export Report
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {reportSummaries.map(({ label, value, change, icon: Icon }) => (
            <div key={label} className="rounded-lg border bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="mt-1 text-2xl font-semibold">{value}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <Badge variant="outline" className="mt-3 border-emerald-200 bg-emerald-50 text-emerald-700">
                {change}
              </Badge>
            </div>
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
              <div>
                <h3 className="text-sm font-semibold">Agent Performance</h3>
                <p className="text-xs text-muted-foreground">Latest reporting period</p>
              </div>
              <Badge variant="outline">Last 7 days</Badge>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead>Workflow</TableHead>
                  <TableHead>Runs</TableHead>
                  <TableHead>Success</TableHead>
                  <TableHead>Review</TableHead>
                  <TableHead>Last run</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agentReports.map((report) => (
                  <TableRow key={report.agent}>
                    <TableCell className="font-medium">{report.agent}</TableCell>
                    <TableCell className="text-muted-foreground">{report.workflow}</TableCell>
                    <TableCell>{report.runs}</TableCell>
                    <TableCell>{report.success}</TableCell>
                    <TableCell>{report.review}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{report.lastRun}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          report.status === "Healthy"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-amber-200 bg-amber-50 text-amber-700"
                        }
                      >
                        {report.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold">Recent Reports</h3>
                <p className="text-xs text-muted-foreground">Generated by active agents</p>
              </div>
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div className="mt-4 grid gap-3">
              {recentReports.map((report) => (
                <div key={report.title} className="rounded-md border bg-background p-3">
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="text-sm font-semibold">{report.title}</h4>
                    <span className="whitespace-nowrap text-xs text-muted-foreground">{report.time}</span>
                  </div>
                  <p className="mt-1 text-sm leading-5 text-muted-foreground">{report.detail}</p>
                  <Button variant="ghost" size="sm" className="mt-2 h-8 px-2">
                    View details
                    <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div id="agent-console">
        <h2 className="text-lg font-semibold tracking-tight">Agent Console</h2>
        <p className="text-sm text-muted-foreground">
          Select a workflow, review the context, and run the agent with agency data.
        </p>
      </div>

      <div className="grid gap-5">
        <AiAgentPanel
          title="Agency Assistant"
          description="Summarize enquiries, requests, messages, and recommend follow-ups."
          endpoint="/api/ai/agency-assistant"
          mode="agency"
          status="live"
          runCount="42"
          impact="6h saved"
          confidence={92}
          automationSteps={["Collect new enquiries", "Rank urgency and missing context", "Draft next best actions"]}
          quickPrompts={[
            "Summarize today's urgent enquiries and recommend follow-ups.",
            "Draft a polite response for employers waiting on agency updates.",
          ]}
        />
        <AiAgentPanel
          title="Content Generator"
          description="Draft maid descriptions, ads, FAQs, emails, notifications, and enquiry replies."
          endpoint="/api/ai/content-generator"
          mode="agency"
          status="live"
          runCount="31"
          impact="24 drafts"
          confidence={89}
          automationSteps={["Read selected agency records", "Generate compliant copy", "Hold drafts for approval"]}
          quickPrompts={[
            "Create a professional maid profile description from available agency maid data.",
            "Write three short advertisement variants for available maids.",
          ]}
        />
        <AiAgentPanel
          title="Applicant Screening"
          description="Review FDW applications for missing documents, incomplete forms, and readiness."
          endpoint="/api/ai/screen-applicant"
          mode="agency"
          status="review"
          runCount="19"
          impact="5 blockers"
          confidence={81}
          automationSteps={["Check application fields", "Detect missing documents", "Prepare readiness summary"]}
          fields={[{ name: "applicationId", label: "Application ID", placeholder: "Optional" }]}
          quickPrompts={["Screen this applicant and list missing requirements."]}
        />
        <AiAgentPanel
          title="Admin Analytics"
          description="Summarize trends, bottlenecks, inactive maids, requests, contracts, and unanswered enquiries."
          endpoint="/api/ai/admin-analytics"
          mode="agency"
          status="live"
          runCount="12"
          impact="Daily brief"
          confidence={86}
          automationSteps={["Scan operational records", "Detect bottlenecks", "Recommend management actions"]}
          quickPrompts={[
            "Generate an operational report with bottlenecks and next actions.",
            "Identify inactive maids and unanswered enquiries.",
          ]}
        />
      </div>
    </div>
  );
}
