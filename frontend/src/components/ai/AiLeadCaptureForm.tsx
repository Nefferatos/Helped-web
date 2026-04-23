import { useState, type FormEvent } from "react";
import { Loader2, Send, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { submitLeadWithAutomation, type LeadSubmissionResponse } from "@/hooks/useAiAutomation";

const AiLeadCaptureForm = () => {
  const [source, setSource] = useState<"facebook" | "website" | "scraped">("website");
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    data: LeadSubmissionResponse;
    makeTriggered: boolean;
    makeError: string | null;
  } | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!name.trim() || !contact.trim() || !message.trim()) {
      setError("Please fill in the lead name, contact, and message.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const nextResult = await submitLeadWithAutomation({
        source,
        name: name.trim(),
        contact: contact.trim(),
        message: message.trim(),
      });
      setResult(nextResult);
      setMessage("");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to create lead");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="rounded-[28px] border bg-card shadow-sm">
      <CardHeader className="border-b bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.12),transparent_38%),linear-gradient(135deg,rgba(255,255,255,0.98),rgba(243,246,255,0.94))]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="font-display text-2xl text-foreground">AI Lead Capture</CardTitle>
            <CardDescription className="mt-2 max-w-2xl text-sm leading-6">
              This localhost form tests `/api/leads/raw` and automatically relays the result to Make using the `lead_pipeline` scenario.
            </CardDescription>
          </div>
          <Badge className="gap-1 rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.2em]" variant="secondary">
            <Sparkles className="h-3.5 w-3.5" />
            Lead Workflow
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="grid gap-6 p-6 lg:grid-cols-[340px_1fr]">
        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Lead Source</label>
            <select
              value={source}
              onChange={(event) => setSource(event.target.value as "facebook" | "website" | "scraped")}
              className="h-11 w-full rounded-2xl border bg-background px-3 text-sm text-foreground"
            >
              <option value="website">website</option>
              <option value="facebook">facebook</option>
              <option value="scraped">scraped</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Lead Name</label>
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Alicia Tan" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Contact</label>
            <Input value={contact} onChange={(event) => setContact(event.target.value)} placeholder="+6591234567" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Lead Message</label>
            <Textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Need transfer maid for elderly care in Tampines, budget SGD 700, urgent."
              className="min-h-[180px] resize-y rounded-2xl"
            />
          </div>

          {error && (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <Button type="submit" className="rounded-2xl" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            {isSubmitting ? "Creating lead..." : "Create AI lead"}
          </Button>
        </form>

        <div className="space-y-4">
          <div className="rounded-[24px] border bg-muted/20 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Lead Result</p>
            {!result ? (
              <div className="mt-4 rounded-2xl border border-dashed bg-background/80 px-4 py-6 text-sm text-muted-foreground">
                Submit a sample lead to verify enrichment, qualification, and Make trigger delivery end to end.
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge>Classification: {result.data.qualification.classification}</Badge>
                  <Badge variant="outline">Score: {result.data.qualification.score}</Badge>
                  <Badge variant="secondary">AI Used: {result.data.aiUsed ? "true" : "false"}</Badge>
                  <Badge variant={result.makeTriggered ? "default" : "outline"}>
                    Make: {result.makeTriggered ? "triggered" : "not confirmed"}
                  </Badge>
                </div>

                {result.makeError && (
                  <div className="rounded-xl border border-amber-300/50 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    Make trigger warning: {result.makeError}
                  </div>
                )}

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border bg-background p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Service Type</p>
                    <p className="mt-1 font-semibold text-foreground">{result.data.enrichment.serviceType}</p>
                  </div>
                  <div className="rounded-2xl border bg-background p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Location</p>
                    <p className="mt-1 font-semibold text-foreground">{result.data.enrichment.location}</p>
                  </div>
                  <div className="rounded-2xl border bg-background p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Urgency</p>
                    <p className="mt-1 font-semibold text-foreground">{result.data.enrichment.urgency}</p>
                  </div>
                  <div className="rounded-2xl border bg-background p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Budget</p>
                    <p className="mt-1 font-semibold text-foreground">{result.data.enrichment.budget.text || "N/A"}</p>
                  </div>
                </div>

                <div className="rounded-2xl border bg-background p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">AI Summary</p>
                  <p className="mt-2 text-sm leading-6 text-foreground">{result.data.enrichment.summary}</p>
                </div>

                <div className="rounded-2xl border bg-background p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Qualification Reasons</p>
                  <p className="mt-2 text-sm leading-6 text-foreground">
                    {result.data.qualification.reasons.join(" • ")}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AiLeadCaptureForm;
