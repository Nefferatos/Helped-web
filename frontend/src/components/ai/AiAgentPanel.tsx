import { useEffect, useRef, useState } from "react";
import {
  Bot,
  CheckCircle2,
  CircleAlert,
  ClipboardCopy,
  Loader2,
  Play,
  RefreshCw,
  Send,
  Sparkles,
  Trash2,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { callAiAgent } from "@/lib/aiAgents";

type Field = {
  name: string;
  label: string;
  placeholder?: string;
  type?: "text" | "number" | "checkbox";
};

type Message = {
  role: "user" | "assistant";
  text: string;
  time: string;
  error?: boolean;
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

const nowStr = () =>
  new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

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
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const runWithMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed && fields.length === 0) return;
    const fieldPayload = Object.fromEntries(
      Object.entries(fieldValues).map(([key, value]) => [
        key,
        typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))
          ? Number(value)
          : value,
      ]),
    );
    const payload = { ...fieldPayload, message: trimmed, conversationId };

    setMessages((prev) => [...prev, { role: "user", text: trimmed, time: nowStr() }]);
    setMessage("");
    setLoading(true);
    try {
      const response = await callAiAgent(endpoint, payload, mode);
      if (response.conversationId) setConversationId(response.conversationId);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: response.response ?? "(No response)",
          time: nowStr(),
        },
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "AI agent failed";
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: msg, time: nowStr(), error: true },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => void runWithMessage(message);
  const handleQuickPrompt = (prompt: string) => void runWithMessage(prompt);

  const clearConversation = () => {
    setMessages([]);
    setConversationId(undefined);
    setMessage("");
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success("Copied")).catch(() => {});
  };

  return (
    <section className="grid overflow-hidden rounded-xl border bg-card shadow-sm lg:grid-cols-[220px_minmax(0,1fr)]">
      {/* Sidebar */}
      <div className="space-y-4 border-b bg-muted/20 p-4 lg:border-b-0 lg:border-r">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow">
            <Bot className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold">{title}</h2>
            <Badge variant="outline" className={`mt-0.5 text-[10px] ${statusStyles[status]}`}>
              {statusLabels[status]}
            </Badge>
          </div>
        </div>

        <p className="text-xs leading-5 text-muted-foreground">{description}</p>

        <div className="grid grid-cols-3 gap-2 lg:grid-cols-1">
          {[
            { icon: Play, label: "Runs", value: runCount },
            { icon: Zap, label: "Impact", value: impact },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-lg border bg-background p-2.5">
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Icon className="h-3 w-3" />
                {label}
              </div>
              <div className="mt-1 truncate text-sm font-semibold">{value}</div>
            </div>
          ))}
          <div className="rounded-lg border bg-background p-2.5">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <CheckCircle2 className="h-3 w-3" />
              Confidence
            </div>
            <div className="mt-2 flex items-center gap-1.5">
              <Progress value={confidence} className="h-1.5 flex-1" />
              <span className="text-[11px] font-semibold">{confidence}%</span>
            </div>
          </div>
        </div>

        {automationSteps.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              How it works
            </p>
            {automationSteps.map((step, i) => (
              <div key={step} className="flex items-start gap-2 text-xs">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                  {i + 1}
                </span>
                <span className="leading-4 text-muted-foreground">{step}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chat panel */}
      <div className="flex min-h-0 flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-2.5">
          <span className="text-xs text-muted-foreground">
            {messages.length === 0
              ? "Ready — select a prompt or type a message"
              : `${messages.filter((m) => m.role === "assistant").length} response${messages.filter((m) => m.role === "assistant").length !== 1 ? "s" : ""} · ${conversationId ? "Conversation active" : ""}`}
          </span>
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-destructive"
              onClick={clearConversation}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear
            </Button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Sparkles className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium text-foreground">Run the {title}</p>
              <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                Pick a quick prompt below or write your own task and click Run Agent.
              </p>
            </div>
          )}

          <div className="space-y-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold shadow-sm">
                    AI
                  </div>
                )}
                <div
                  className={`group relative max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-6 ${
                    msg.role === "user"
                      ? "rounded-tr-sm bg-primary text-primary-foreground"
                      : msg.error
                        ? "rounded-tl-sm border border-destructive/30 bg-destructive/10 text-destructive"
                        : "rounded-tl-sm border bg-background text-foreground shadow-sm"
                  }`}
                >
                  {msg.error && (
                    <div className="mb-1 flex items-center gap-1.5 text-xs font-medium">
                      <CircleAlert className="h-3.5 w-3.5" />
                      Error
                    </div>
                  )}
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                  <div
                    className={`mt-1 flex items-center justify-between gap-2 text-[10px] ${
                      msg.role === "user" ? "text-primary-foreground/70" : "text-muted-foreground"
                    }`}
                  >
                    <span>{msg.time}</span>
                    {msg.role === "assistant" && !msg.error && (
                      <button
                        onClick={() => copyText(msg.text)}
                        className="invisible flex items-center gap-1 group-hover:visible hover:text-foreground"
                      >
                        <ClipboardCopy className="h-3 w-3" />
                        Copy
                      </button>
                    )}
                  </div>
                </div>
                {msg.role === "user" && (
                  <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                    You
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex justify-start gap-2.5">
                <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold shadow-sm">
                  AI
                </div>
                <div className="rounded-2xl rounded-tl-sm border bg-background px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:0ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Quick prompts */}
        {quickPrompts.length > 0 && (
          <div className="border-t bg-muted/10 px-4 py-2">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Quick prompts
            </p>
            <div className="flex flex-wrap gap-1.5">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  disabled={loading}
                  onClick={() => handleQuickPrompt(prompt)}
                  className="inline-flex items-center gap-1.5 rounded-full border bg-background px-2.5 py-1 text-xs font-medium text-foreground transition hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
                >
                  <Sparkles className="h-3 w-3" />
                  {prompt.length > 60 ? `${prompt.slice(0, 60)}…` : prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input fields (optional extras) */}
        {fields.length > 0 && (
          <div className="border-t px-4 py-3">
            <div className="grid gap-2 sm:grid-cols-2">
              {fields.map((field) =>
                field.type === "checkbox" ? (
                  <label
                    key={field.name}
                    className="flex min-h-9 items-center gap-2 rounded-lg border bg-background px-3 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(fieldValues[field.name])}
                      onChange={(e) =>
                        setFieldValues((cur) => ({ ...cur, [field.name]: e.target.checked }))
                      }
                    />
                    {field.label}
                  </label>
                ) : (
                  <label key={field.name} className="grid gap-1 text-xs font-medium text-muted-foreground">
                    {field.label}
                    <Input
                      type={field.type === "number" ? "number" : "text"}
                      placeholder={field.placeholder}
                      value={String(fieldValues[field.name] ?? "")}
                      onChange={(e) =>
                        setFieldValues((cur) => ({ ...cur, [field.name]: e.target.value }))
                      }
                    />
                  </label>
                ),
              )}
            </div>
          </div>
        )}

        {/* Compose */}
        <div className="border-t px-4 py-3">
          <div className="flex items-end gap-2">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
              }}
              placeholder={placeholder}
              rows={2}
              className="min-h-0 flex-1 resize-none rounded-xl bg-background text-sm"
            />
            <div className="flex flex-col gap-1.5">
              <Button
                size="icon"
                onClick={handleSubmit}
                disabled={loading || (!message.trim() && fields.length === 0)}
                className="h-9 w-9 rounded-xl"
                title="Run Agent (Ctrl+Enter)"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
              {messages.length > 0 && (
                <Button
                  size="icon"
                  variant="outline"
                  onClick={clearConversation}
                  className="h-9 w-9 rounded-xl"
                  title="Clear conversation"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
          <p className="mt-1.5 text-[10px] text-muted-foreground">
            {loading ? "Running…" : "Ctrl+Enter to send"}
          </p>
        </div>
      </div>
    </section>
  );
}
