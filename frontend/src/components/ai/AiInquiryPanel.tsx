import { useState, type FormEvent } from "react";
import { Bot, Loader2, Send, Sparkles, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useAiInquiry, type AiInquiryRecord, type AiMatchCandidate } from "@/hooks/useAiAutomation";

interface AiInquiryPanelProps {
  title?: string;
  description?: string;
  initialName?: string;
  initialContact?: string;
  employerId?: number;
  compact?: boolean;
}

const statusTone: Record<AiInquiryRecord["intent"], "default" | "secondary" | "destructive"> = {
  hiring: "default",
  inquiry: "secondary",
  complaint: "destructive",
};

const MatchesList = ({ matches }: { matches: AiMatchCandidate[] }) => {
  if (matches.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        No maid matches were returned for this inquiry.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {matches.map((match) => (
        <div key={`${match.maidId}-${match.maidReferenceCode}`} className="rounded-2xl border bg-background px-4 py-3 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-semibold text-foreground">{match.maidName}</p>
              <p className="text-xs text-muted-foreground">{match.maidReferenceCode}</p>
            </div>
            <Badge variant="outline">Score {match.score}</Badge>
          </div>
          {match.reasons.length > 0 && (
            <p className="mt-2 text-sm text-muted-foreground">{match.reasons.join(" • ")}</p>
          )}
        </div>
      ))}
    </div>
  );
};

const AiInquiryPanel = ({
  title = "AI Inquiry Assistant",
  description = "Send an inquiry through the AI workflow, review the classification, and confirm the Make automation trigger.",
  initialName = "",
  initialContact = "",
  employerId,
  compact = false,
}: AiInquiryPanelProps) => {
  const { history, error, isSubmitting, submitInquiry, clearConversation } = useAiInquiry();
  const [name, setName] = useState(initialName);
  const [contact, setContact] = useState(initialContact);
  const [message, setMessage] = useState("");

  const latestAssistantMessage = [...history].reverse().find((item) => item.role === "assistant");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!name.trim() || !contact.trim() || !message.trim()) {
      return;
    }

    try {
      await submitInquiry({
        name: name.trim(),
        contact: contact.trim(),
        message: message.trim(),
        employerId,
      });
      setMessage("");
    } catch {
      // Error state is surfaced by the hook and rendered below.
    }
  };

  return (
    <Card className="overflow-hidden rounded-[28px] border bg-card shadow-sm">
      <CardHeader className="border-b bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.12),transparent_38%),linear-gradient(135deg,rgba(255,255,255,0.98),rgba(245,247,243,0.94))]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="font-display text-2xl text-foreground">{title}</CardTitle>
            <CardDescription className="mt-2 max-w-2xl text-sm leading-6">{description}</CardDescription>
          </div>
          <Badge className="gap-1 rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.2em]" variant="secondary">
            <Sparkles className="h-3.5 w-3.5" />
            AI Workflow
          </Badge>
        </div>
      </CardHeader>

      <CardContent className={cn("grid gap-6 p-6", compact ? "lg:grid-cols-1" : "lg:grid-cols-[340px_1fr]")}>
        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Name</label>
              <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Marcus Tan" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Contact</label>
              <Input
                value={contact}
                onChange={(event) => setContact(event.target.value)}
                placeholder="marcus@example.com or +65..."
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Inquiry Message</label>
            <Textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="I want to hire a maid for childcare in Woodlands with budget 800."
              className="min-h-[180px] resize-y rounded-2xl"
            />
          </div>

          {error && (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <Button type="submit" className="rounded-2xl" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              {isSubmitting ? "Thinking..." : "Send to AI"}
            </Button>
            <Button type="button" variant="outline" className="rounded-2xl" onClick={clearConversation} disabled={history.length === 0 && !message}>
              Clear
            </Button>
          </div>
        </form>

        <div className="space-y-4">
          <div className="rounded-[24px] border bg-muted/20 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Conversation</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Real-time style transcript of the inquiry and AI response.
                </p>
              </div>
              {isSubmitting && (
                <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  AI is typing...
                </div>
              )}
            </div>

            <div className="mt-4 space-y-3">
              {history.length === 0 ? (
                <div className="rounded-2xl border border-dashed bg-background/80 px-4 py-6 text-sm text-muted-foreground">
                  No conversation yet. Submit an inquiry to see the AI reply, detected intent, and any maid matches.
                </div>
              ) : (
                history.map((entry) => (
                  <div
                    key={entry.id}
                    className={cn(
                      "rounded-2xl px-4 py-3 shadow-sm",
                      entry.role === "user"
                        ? "ml-auto max-w-[85%] border bg-primary text-primary-foreground"
                        : "max-w-[92%] border bg-background text-foreground",
                    )}
                  >
                    <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.2em] opacity-75">
                      {entry.role === "user" ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                      {entry.role === "user" ? "User" : "AI"}
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-6">{entry.content}</p>

                    {entry.role === "assistant" && entry.meta && (
                      <div className="mt-4 space-y-3">
                        <div className="flex flex-wrap gap-2">
                          {entry.meta.intent && (
                            <Badge variant={statusTone[entry.meta.intent]}>
                              Intent: {entry.meta.intent}
                            </Badge>
                          )}
                          <Badge variant="outline">AI Used: {entry.meta.aiUsed ? "true" : "false"}</Badge>
                          {entry.meta.workflow && <Badge variant="secondary">Workflow: {entry.meta.workflow}</Badge>}
                          <Badge variant={entry.meta.makeTriggered ? "default" : "outline"}>
                            Make: {entry.meta.makeTriggered ? "triggered" : "not confirmed"}
                          </Badge>
                        </div>

                        {entry.meta.makeError && (
                          <div className="rounded-xl border border-amber-300/50 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                            Make trigger warning: {entry.meta.makeError}
                          </div>
                        )}

                        {entry.meta.matches && entry.meta.matches.length > 0 && (
                          <div>
                            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                              Match Candidates
                            </p>
                            <MatchesList matches={entry.meta.matches} />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {latestAssistantMessage?.meta && (
            <div className="rounded-[24px] border bg-background p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Latest Result</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-muted/30 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Intent</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">{latestAssistantMessage.meta.intent ?? "N/A"}</p>
                </div>
                <div className="rounded-2xl bg-muted/30 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">AI Used</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">
                    {latestAssistantMessage.meta.aiUsed ? "true" : "false"}
                  </p>
                </div>
                <div className="rounded-2xl bg-muted/30 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Workflow</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">{latestAssistantMessage.meta.workflow ?? "N/A"}</p>
                </div>
                <div className="rounded-2xl bg-muted/30 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Matches</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">
                    {latestAssistantMessage.meta.matches?.length ?? 0}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AiInquiryPanel;
