import { useMemo, useState } from "react";
import {
  Activity,
  Bot,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Loader2,
  Play,
  Send,
  Sparkles,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { callAiAgent, type AiAgentResponse } from "@/lib/aiAgents";

type Field = {
  name: string;
  label: string;
  placeholder?: string;
  type?: "text" | "number" | "checkbox";
};

type AiAgentPanelProps = {
  title: string;
  description: string;
  endpoint: string;
  mode?: "public" | "client" | "agency";
  placeholder?: string;
  fields?: Field[];
  quickPrompts?: string[];
  status?: "live" | "review" | "paused";
  impact?: string;
  runCount?: string;
  confidence?: number;
  automationSteps?: string[];
};

const renderToolResults = (toolResults: unknown) => {
  if (!toolResults) return null;
  return (
    <details className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
      <summary className="cursor-pointer font-medium text-foreground">Data used</summary>
      <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap">
        {JSON.stringify(toolResults, null, 2)}
      </pre>
    </details>
  );
};

const statusStyles = {
  live: "border-emerald-200 bg-emerald-50 text-emerald-700",
  review: "border-amber-200 bg-amber-50 text-amber-700",
  paused: "border-slate-200 bg-slate-50 text-slate-600",
};

const statusLabels = {
  live: "Autopilot live",
  review: "Needs review",
  paused: "Paused",
};

export default function AiAgentPanel({
  title,
  description,
  endpoint,
  mode = "public",
  placeholder = "Ask for help with this workflow...",
  fields = [],
  quickPrompts = [],
  status = "live",
  impact = "Ready",
  runCount = "0",
  confidence = 88,
  automationSteps = [],
}: AiAgentPanelProps) {
  const [message, setMessage] = useState("");
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [fieldValues, setFieldValues] = useState<Record<string, string | boolean>>({});
  const [result, setResult] = useState<AiAgentResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [autopilotEnabled, setAutopilotEnabled] = useState(status === "live");

  const payload = useMemo(() => {
    const values = Object.fromEntries(
      Object.entries(fieldValues).map(([key, value]) => [
        key,
        typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))
          ? Number(value)
          : value,
      ]),
    );
    return { ...values, message, conversationId };
  }, [conversationId, fieldValues, message]);

  const submit = async () => {
    if (!message.trim() && fields.length === 0) return;
    setLoading(true);
    setError("");
    try {
      const response = await callAiAgent(endpoint, payload, mode);
      setResult(response);
      if (response.conversationId) setConversationId(response.conversationId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI agent failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="grid overflow-hidden rounded-lg border bg-card shadow-sm lg:grid-cols-[240px_minmax(0,1fr)]">
      <div className="border-b bg-muted/25 p-4 lg:border-b-0 lg:border-r">
        <div className="flex items-start justify-between gap-3 lg:block">
          <div className="flex items-start gap-3 lg:block">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm">
              <Bot className="h-5 w-5" />
            </div>
            <div className="min-w-0 lg:mt-3">
              <h2 className="text-base font-semibold text-foreground">{title}</h2>
              <p className="mt-1 text-sm leading-5 text-muted-foreground">{description}</p>
            </div>
          </div>
          <Badge variant="outline" className={`shrink-0 whitespace-nowrap ${statusStyles[status]}`}>
            {statusLabels[status]}
          </Badge>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2 lg:grid-cols-1">
          <div className="rounded-md border bg-background p-3">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Activity className="h-3.5 w-3.5" />
              Runs
            </div>
            <div className="mt-1 text-lg font-semibold">{runCount}</div>
          </div>
          <div className="rounded-md border bg-background p-3">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Zap className="h-3.5 w-3.5" />
              Impact
            </div>
            <div className="mt-1 truncate text-sm font-semibold">{impact}</div>
          </div>
          <div className="rounded-md border bg-background p-3">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Confidence
            </div>
            <div className="mt-2 flex items-center gap-2">
              <Progress value={confidence} className="h-2" />
              <span className="text-xs font-semibold">{confidence}%</span>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-md border bg-background px-3 py-2">
          <div>
            <p className="text-sm font-medium">Autopilot</p>
            <p className="text-xs text-muted-foreground">{autopilotEnabled ? "Monitoring" : "Manual"}</p>
          </div>
          <Switch checked={autopilotEnabled} onCheckedChange={setAutopilotEnabled} />
        </div>
      </div>

      <div className="min-w-0 p-4">
        {automationSteps.length > 0 && (
          <div className="mb-4 grid gap-2 sm:grid-cols-3">
            {automationSteps.map((step, index) => (
              <div key={step} className="flex min-h-16 items-start gap-2 rounded-md border bg-background p-3">
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                  {index + 1}
                </div>
                <p className="text-xs font-medium leading-5 text-foreground">{step}</p>
              </div>
            ))}
          </div>
        )}

        {quickPrompts.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {quickPrompts.map((prompt) => (
              <Button
                key={prompt}
                type="button"
                variant="outline"
                size="sm"
                className="h-auto min-h-9 max-w-full whitespace-normal rounded-md px-2.5 py-1.5 text-left text-xs"
                onClick={() => setMessage(prompt)}
              >
                <Sparkles className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                {prompt}
              </Button>
            ))}
          </div>
        )}

        {fields.length > 0 && (
          <div className="mb-3 grid gap-3 sm:grid-cols-2">
            {fields.map((field) =>
              field.type === "checkbox" ? (
                <label key={field.name} className="flex min-h-10 items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={Boolean(fieldValues[field.name])}
                    onChange={(event) =>
                      setFieldValues((current) => ({ ...current, [field.name]: event.target.checked }))
                    }
                  />
                  {field.label}
                </label>
              ) : (
                <label key={field.name} className="grid gap-1 text-sm font-medium">
                  {field.label}
                  <Input
                    type={field.type === "number" ? "number" : "text"}
                    placeholder={field.placeholder}
                    value={String(fieldValues[field.name] ?? "")}
                    onChange={(event) =>
                      setFieldValues((current) => ({ ...current, [field.name]: event.target.value }))
                    }
                  />
                </label>
              ),
            )}
          </div>
        )}

        <div className="grid gap-2">
          <Textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder={placeholder}
            className="min-h-28 resize-y bg-background"
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {loading ? <Clock3 className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              {loading ? "Running workflow" : conversationId ? "Conversation active" : "Ready for next run"}
            </div>
            <Button onClick={() => void submit()} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Run Agent
            </Button>
          </div>
        </div>

        {error && (
          <p className="mt-3 flex gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </p>
        )}
        {result?.response && (
          <div className="mt-4 grid gap-3">
            <div className="whitespace-pre-wrap rounded-md border bg-background p-4 text-sm leading-6">
              {result.response}
            </div>
            {renderToolResults(result.toolResults)}
          </div>
        )}
      </div>
    </section>
  );
}
