import { useEffect, useMemo, useState } from "react";
import { MessageCircleMore, Paperclip, Send, Sparkles, Phone, CheckCircle2, Clock3, RefreshCw } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  fetchWhatsAppConversation,
  sendWhatsAppInboundSimulation,
  sendWhatsAppMessage,
  updateWhatsAppStage,
  type WhatsAppAttachmentKind,
  type WhatsAppConversationBundle,
} from "@/lib/whatsapp";

const toLocalDateTime = (value?: string) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const readFileAsBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
    reader.onload = () => {
      const result = String(reader.result || "");
      const [, base64 = ""] = result.split(",");
      resolve(base64);
    };
    reader.readAsDataURL(file);
  });

const inferAttachmentKind = (file: File): WhatsAppAttachmentKind => {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "document";
};

const quickWorkflowActions = [
  { label: "Application Received", stage: "Application Received", sendWorkflowTemplate: true },
  { label: "Request Documents", stage: "Missing Documents", sendWorkflowTemplate: true },
  { label: "Interview Scheduled", stage: "Interview Scheduled", sendWorkflowTemplate: true },
  { label: "Background Check", stage: "Background Check", sendWorkflowTemplate: true },
  { label: "Approved", stage: "Approved", sendWorkflowTemplate: true },
  { label: "Rejected", stage: "Rejected", sendWorkflowTemplate: true },
  { label: "Client Match", stage: "Client Match Notification", sendWorkflowTemplate: true },
  { label: "Deployment", stage: "Deployment Preparation", sendWorkflowTemplate: true },
] as const;

interface Props {
  referenceCode: string;
  candidateName: string;
}

const WhatsAppConversationPanel = ({ referenceCode, candidateName }: Props) => {
  const [bundle, setBundle] = useState<WhatsAppConversationBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState("");
  const [inboundDraft, setInboundDraft] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [interviewDate, setInterviewDate] = useState("");
  const [interviewTime, setInterviewTime] = useState("");

  const loadConversation = async () => {
    try {
      setLoading(true);
      const data = await fetchWhatsAppConversation(referenceCode);
      setBundle(data);
      setInterviewDate(data.conversation.interviewSchedule?.date || "");
      setInterviewTime(data.conversation.interviewSchedule?.time || "");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load WhatsApp conversation");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadConversation();
  }, [referenceCode]);

  const templatePreview = useMemo(() => {
    if (!selectedTemplate) return "";
    return bundle?.templates.find((item) => item.key === selectedTemplate)?.body || "";
  }, [bundle?.templates, selectedTemplate]);

  const sendMessage = async () => {
    try {
      setSending(true);
      const attachments = await Promise.all(
        attachmentFiles.map(async (file) => ({
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          dataBase64: await readFileAsBase64(file),
          kind: inferAttachmentKind(file),
        })),
      );
      const data = await sendWhatsAppMessage(referenceCode, {
        text: draft.trim() || undefined,
        templateKey: selectedTemplate || undefined,
        attachments,
      });
      setBundle(data);
      setDraft("");
      setSelectedTemplate("");
      setAttachmentFiles([]);
      toast.success("WhatsApp message queued from the candidate profile");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send WhatsApp message");
    } finally {
      setSending(false);
    }
  };

  const triggerWorkflow = async (stage: string, sendWorkflowTemplate: boolean) => {
    try {
      setSending(true);
      const data = await updateWhatsAppStage(referenceCode, {
        stage,
        sendWorkflowTemplate,
        interviewSchedule:
          stage === "Interview Scheduled" && interviewDate && interviewTime
            ? { date: interviewDate, time: interviewTime, status: "scheduled" }
            : undefined,
      });
      setBundle(data);
      toast.success(`Recruitment stage updated to ${stage}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update stage");
    } finally {
      setSending(false);
    }
  };

  const simulateInbound = async () => {
    try {
      setSending(true);
      const data = await sendWhatsAppInboundSimulation({
        candidateReferenceCode: referenceCode,
        applicantName: candidateName,
        text: inboundDraft.trim() || "STATUS",
      });
      setBundle(data);
      setInboundDraft("");
      toast.success("Simulated applicant reply received and processed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to simulate inbound message");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div className="rounded-xl border bg-background p-4 text-sm text-muted-foreground">Loading WhatsApp conversation...</div>;
  }

  if (!bundle) {
    return <div className="rounded-xl border bg-background p-4 text-sm text-muted-foreground">No WhatsApp conversation available.</div>;
  }

  return (
    <section className="rounded-2xl border bg-background shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <MessageCircleMore className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold">WhatsApp Applicant Communication</h3>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {bundle.conversation.phoneNumber || "No number on profile"}
              </span>
              <span>Stage: {bundle.conversation.currentStage}</span>
            </div>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => void loadConversation()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-[1.7fr_1fr]">
        <div className="space-y-4">
          <div className="max-h-[460px] space-y-3 overflow-y-auto rounded-xl border bg-muted/20 p-3">
            {bundle.messages.length === 0 ? (
              <p className="text-sm text-muted-foreground">No conversation yet. Send the first WhatsApp message from here.</p>
            ) : (
              bundle.messages.map((message) => (
                <div
                  key={message.id}
                  className={`max-w-[88%] rounded-2xl border px-3 py-2 text-sm ${
                    message.direction === "outgoing"
                      ? "ml-auto border-emerald-200 bg-emerald-50"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
                    <span>{message.senderName}</span>
                    <span>{toLocalDateTime(message.createdAt)}</span>
                  </div>
                  <p className="whitespace-pre-wrap text-foreground">{message.text || "Attachment only"}</p>
                  {message.attachments.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {message.attachments.map((attachment) => (
                        <a
                          key={attachment.id}
                          href={attachment.publicUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-1 text-[11px] text-foreground hover:bg-muted"
                        >
                          <Paperclip className="h-3 w-3" />
                          {attachment.fileName}
                        </a>
                      ))}
                    </div>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                    <Badge variant="outline">{message.direction === "incoming" ? "Incoming" : "Outgoing"}</Badge>
                    <Badge variant="outline">{message.type}</Badge>
                    <Badge variant="outline">{message.status}</Badge>
                    {message.automated && <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">AI/Workflow</Badge>}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="space-y-3 rounded-xl border p-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Template message</label>
                <select
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={selectedTemplate}
                  onChange={(event) => setSelectedTemplate(event.target.value)}
                >
                  <option value="">Free-form message</option>
                  {bundle.templates.map((template) => (
                    <option key={template.id} value={template.key}>
                      {template.name}
                    </option>
                  ))}
                </select>
                {templatePreview && (
                  <p className="rounded-md bg-muted/40 p-2 text-xs text-muted-foreground">{templatePreview}</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Attachments</label>
                <Input
                  type="file"
                  multiple
                  onChange={(event) => setAttachmentFiles(Array.from(event.target.files || []))}
                />
                <div className="flex flex-wrap gap-1">
                  {attachmentFiles.map((file) => (
                    <Badge key={`${file.name}-${file.size}`} variant="outline">
                      {file.name}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Reply directly to the applicant, send approval notices, request missing documents, or share a job offer..."
              rows={4}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={() => void sendMessage()} disabled={sending}>
                <Send className="mr-2 h-4 w-4" />
                Send WhatsApp Message
              </Button>
              <Button variant="outline" onClick={() => setDraft("Please upload your passport and training certificates using this chat thread.")}>
                Missing Documents
              </Button>
              <Button variant="outline" onClick={() => setDraft("Congratulations! Your application has been approved and you are now available for employer matching.")}>
                Approval Notice
              </Button>
              <Button variant="outline" onClick={() => setDraft("We found a potential employer match for your profile. Please confirm if you would like to proceed.")}>
                Job Offer / Match
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border p-3">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-600" />
              <h4 className="text-sm font-semibold">Automation & AI</h4>
            </div>
            <div className="mb-3 flex flex-wrap gap-2">
              {quickWorkflowActions.map((action) => (
                <Button
                  key={action.label}
                  variant="outline"
                  size="sm"
                  onClick={() => void triggerWorkflow(action.stage, action.sendWorkflowTemplate)}
                  disabled={sending}
                >
                  {action.label}
                </Button>
              ))}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Input type="date" value={interviewDate} onChange={(event) => setInterviewDate(event.target.value)} />
              <Input type="time" value={interviewTime} onChange={(event) => setInterviewTime(event.target.value)} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Reply keywords supported from applicants: <span className="font-medium">STATUS</span>, <span className="font-medium">CONFIRM</span>, <span className="font-medium">RESCHEDULE</span>, <span className="font-medium">CANCEL</span>.
            </p>
          </div>

          <div className="rounded-xl border p-3">
            <h4 className="mb-3 text-sm font-semibold">Conversation Snapshot</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-start justify-between gap-3">
                <span className="text-muted-foreground">Current status</span>
                <span className="text-right font-medium">{bundle.conversation.currentStage}</span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-muted-foreground">Next step</span>
                <span className="text-right font-medium">{bundle.conversation.nextStep}</span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-muted-foreground">Interview</span>
                <span className="text-right font-medium">
                  {bundle.conversation.interviewSchedule
                    ? `${bundle.conversation.interviewSchedule.date} ${bundle.conversation.interviewSchedule.time} (${bundle.conversation.interviewSchedule.status})`
                    : "Not scheduled"}
                </span>
              </div>
              <div className="flex flex-wrap gap-1 pt-1">
                {bundle.conversation.tags.map((tag) => (
                  <Badge key={tag} variant="outline">{tag}</Badge>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-xl border p-3">
            <h4 className="mb-3 text-sm font-semibold">Document Checklist</h4>
            <div className="space-y-2">
              {bundle.conversation.documentChecklist.map((item) => (
                <div key={item.key} className="flex items-center justify-between gap-3 rounded-lg bg-muted/20 px-3 py-2 text-sm">
                  <span>{item.label}</span>
                  <span className={`inline-flex items-center gap-1 ${item.completed ? "text-emerald-700" : "text-amber-700"}`}>
                    {item.completed ? <CheckCircle2 className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
                    {item.completed ? "Submitted" : "Pending"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border p-3">
            <h4 className="mb-3 text-sm font-semibold">Inbound Test / Webhook Simulator</h4>
            <Textarea
              value={inboundDraft}
              onChange={(event) => setInboundDraft(event.target.value)}
              rows={3}
              placeholder="Type STATUS, CONFIRM, RESCHEDULE, CANCEL, or any applicant question to test the AI assistant."
            />
            <Button className="mt-3 w-full" variant="secondary" onClick={() => void simulateInbound()} disabled={sending}>
              Simulate Applicant Reply
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhatsAppConversationPanel;
