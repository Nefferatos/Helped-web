import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";
import { getAgencyAdminAuthHeaders } from "@/lib/agencyAdminAuth";
import { readSafeJson } from "@/lib/safeJson";
import {
  Bot,
  Send,
  X,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Users,
  ChevronRight,
  Brain,
  Zap,
  BarChart3,
  MessageCircle,
  Mail,
  ShieldCheck,
  Filter,
  ArrowRight,
  Lightbulb,
  Star,
  Clock,
  Loader2,
  Share2,
  UserCheck,
  UserX,
  SendHorizontal,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ApplicantLike {
  id: string;
  applicationCode?: string;
  maidReferenceCode?: string;
  status: string;
  source?: string;
  appliedAt?: string;
  clientMatchScore?: number;
  score?: { score?: number | null; explanation?: string } | null;
  profile: {
    fullName?: string;
    email?: string;
    contactNumber?: string;
    whatsappNumber?: string;
    nationality?: string;
    yearsOfExperience?: number;
    expectedSalary?: number | null;
    languageSkills?: string[];
    childcareExperience?: number;
    elderlyCareExperience?: number;
    strengthsTags?: string[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface RecruiterAiAssistantProps {
  applications: ApplicantLike[];
  dashboard?: {
    totalApplicants?: number;
    approvedCandidates?: number;
    readyForMatching?: number;
    placedHelpers?: number;
    averageQualificationScore?: number;
  };
  selectedId: string | null;
  onSelectApplicant?: (id: string) => void;
  onApplyFilter?: (filter: Record<string, unknown>) => void;
  onPostToWorkflow?: (summary: string) => Promise<void>;
  /** Called after bulk email operations to refresh data */
  onRefreshData?: () => void;
  /** Render inline as a card instead of floating bubble */
  inline?: boolean;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  type?: "insight" | "action" | "summary" | "error" | "success";
}

interface EmailResult {
  applicantId: string;
  name: string;
  email: string;
  status: "sent" | "failed" | "skipped";
  error?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const READY_STAGE = "Ready to Configure Public Profile";

const getScoreLabel = (score: number) => {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Strong";
  if (score >= 60) return "Good";
  if (score >= 40) return "Fair";
  return "Needs review";
};

const getScoreColor = (score: number) => {
  if (score >= 90) return "text-emerald-700 bg-emerald-50 border-emerald-200";
  if (score >= 75) return "text-sky-700 bg-sky-50 border-sky-200";
  if (score >= 60) return "text-amber-700 bg-amber-50 border-amber-200";
  if (score >= 40) return "text-orange-700 bg-orange-50 border-orange-200";
  return "text-rose-700 bg-rose-50 border-rose-200";
};

// ─── Email Templates ──────────────────────────────────────────────────────────

const generatePassEmail = (applicant: ApplicantLike): { subject: string; body: string } => {
  const name = (applicant.profile.fullName as string) || "Applicant";
  const score = applicant.score?.score ?? 0;
  return {
    subject: `Congratulations! Your Application Has Been Approved - ${applicant.applicationCode || ""}`,
    body: `Dear ${name},

We are pleased to inform you that your application has been reviewed and approved by our recruitment team.

Application Details:
• Application Code: ${applicant.applicationCode || "N/A"}
• Qualification Score: ${score}%
• Nationality: ${applicant.profile.nationality || "N/A"}
• Experience: ${applicant.profile.yearsOfExperience || 0} years

Next Steps:
1. Our team will contact you shortly to discuss available positions
2. Please ensure your documents are up to date
3. Keep your contact information accessible

If you have any questions, please don't hesitate to reach out.

Best regards,
Rinzin Agency Recruitment Team`,
  };
};

const generateRejectEmail = (applicant: ApplicantLike): { subject: string; body: string } => {
  const name = (applicant.profile.fullName as string) || "Applicant";
  return {
    subject: `Application Update - ${applicant.applicationCode || ""}`,
    body: `Dear ${name},

Thank you for your interest in working with Rinzin Agency and for taking the time to submit your application.

After careful review, we regret to inform you that we are unable to proceed with your application at this time. This decision was based on our current requirements and the high volume of applications we receive.

Application Details:
• Application Code: ${applicant.applicationCode || "N/A"}
• Status: Not approved at this time

We encourage you to:
1. Continue developing your skills and experience
2. Reapply in the future when new positions become available
3. Keep your profile updated on our portal

We appreciate your understanding and wish you all the best in your career journey.

Best regards,
Rinzin Agency Recruitment Team`,
  };
};

// ─── Component ────────────────────────────────────────────────────────────────

const RecruiterAiAssistant = ({
  applications,
  dashboard,
  selectedId,
  onSelectApplicant,
  onApplyFilter,
  onPostToWorkflow,
  onRefreshData,
  inline = false,
}: RecruiterAiAssistantProps) => {
  const [isOpen, setIsOpen] = useState(inline);
  const [activeTab, setActiveTab] = useState<"chat" | "insights" | "actions">("insights");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [postSuccess, setPostSuccess] = useState(false);
  const [isSendingEmails, setIsSendingEmails] = useState(false);
  const [emailResults, setEmailResults] = useState<EmailResult[]>([]);
  const [showEmailResults, setShowEmailResults] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // ─── Pipeline Analytics ─────────────────────────────────────────────────

  const analytics = useMemo(() => {
    const byStage = new Map<string, ApplicantLike[]>();
    applications.forEach((app) => {
      const arr = byStage.get(app.status) ?? [];
      arr.push(app);
      byStage.set(app.status, arr);
    });

    const highScore = applications.filter((a) => (a.score?.score ?? 0) >= 80 && a.status !== "Placed" && a.status !== "Rejected");
    const needsAttention = applications.filter((a) => {
      const hasNoContact = !a.profile.contactNumber && !a.profile.email;
      return hasNoContact && a.status !== "Rejected" && a.status !== "Placed";
    });
    const readyForScreening = applications.filter((a) => a.status === "Resume Parsed");
    const readyForApproval = applications.filter((a) => a.status === "Screening Interview" || a.status === "Background Check");
    const awaitingProfile = applications.filter((a) => a.status === "Approved" || a.status === READY_STAGE);
    const approvedWithScore = applications.filter((a) => (a.score?.score ?? 0) >= 70 && a.status === "Approved");
    const rejected = applications.filter((a) => a.status === "Rejected");
    const lowScore = applications.filter((a) => (a.score?.score ?? 0) < 50 && a.status !== "Rejected" && a.status !== "Placed");
    const avgScore = applications.length > 0
      ? Math.round(applications.reduce((sum, a) => sum + (a.score?.score ?? 0), 0) / applications.length)
      : 0;
    const topNationalities = (() => {
      const counts = new Map<string, number>();
      applications.forEach((a) => {
        const nat = (a.profile.nationality as string) || "Unknown";
        counts.set(nat, (counts.get(nat) ?? 0) + 1);
      });
      return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    })();

    return {
      byStage,
      highScore,
      needsAttention,
      readyForScreening,
      readyForApproval,
      awaitingProfile,
      approvedWithScore,
      rejected,
      lowScore,
      avgScore,
      topNationalities,
      total: applications.length,
    };
  }, [applications]);

  const selectedApp = useMemo(
    () => (selectedId ? applications.find((a) => a.id === selectedId) : null),
    [selectedId, applications],
  );

  // ─── Auto-scroll ────────────────────────────────────────────────────────

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isThinking]);

  // ─── Welcome message ───────────────────────────────────────────────────

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          id: `welcome-${Date.now()}`,
          role: "assistant",
          content: `Welcome! I'm your AI recruiting assistant. I've analyzed **${analytics.total} applicants** across your pipeline.\n\n• **${analytics.highScore.length}** scoring 80+ and ready to fast-track\n• **${analytics.needsAttention.length}** need contact details fixed\n• **${analytics.readyForScreening.length}** waiting for screening\n\n**New!** I can now send emails to passing and failed candidates. Use the Actions tab to get started.`,
          type: "summary",
        },
      ]);
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Send Emails to Passing Candidates ──────────────────────────────────

  const handleSendPassEmails = useCallback(async () => {
    const passingCandidates = applications.filter(
      (a) => (a.score?.score ?? 0) >= 70 && a.status === "Approved" && a.profile.email
    );

    if (passingCandidates.length === 0) {
      toast.error("No approved candidates with email addresses found");
      return;
    }

    setIsSendingEmails(true);
    setEmailResults([]);
    setShowEmailResults(true);

    const results: EmailResult[] = [];

    for (const candidate of passingCandidates) {
      try {
        const res = await fetch("/api/send-to-make", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getAgencyAdminAuthHeaders(),
          },
          body: JSON.stringify({
            scenario: "interview_pipeline",
            payload: {
              type: "pass",
              to: candidate.profile.email,
              candidateName: candidate.profile.fullName,
              position: "Domestic Helper",
              rating: candidate.score?.score,
              strengthsHtml: "<li>Application approved based on the recruitment assessment.</li>",
              applicantId: candidate.id,
              applicationCode: candidate.applicationCode,
            },
          }),
        });

        if (res.ok) {
          results.push({
            applicantId: candidate.id,
            name: (candidate.profile.fullName as string) || "Unknown",
            email: candidate.profile.email as string,
            status: "sent",
          });
        } else {
          const d = await readSafeJson<{ error?: string }>(res);
          results.push({
            applicantId: candidate.id,
            name: (candidate.profile.fullName as string) || "Unknown",
            email: candidate.profile.email as string,
            status: "failed",
            error: d.error || "Failed to send",
          });
        }
      } catch (err) {
        results.push({
          applicantId: candidate.id,
          name: (candidate.profile.fullName as string) || "Unknown",
          email: (candidate.profile.email as string) || "",
          status: "failed",
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    setEmailResults(results);
    setIsSendingEmails(false);

    const sentCount = results.filter((r) => r.status === "sent").length;
    const failedCount = results.filter((r) => r.status === "failed").length;

    if (sentCount > 0) {
      toast.success(`Pass emails sent to ${sentCount} candidates`);
      if (onRefreshData) onRefreshData();
    }
    if (failedCount > 0) {
      toast.error(`Failed to send ${failedCount} emails`);
    }
  }, [applications, onRefreshData]);

  // ─── Send Emails to Failed Candidates ───────────────────────────────────

  const handleSendRejectEmails = useCallback(async () => {
    const failedCandidates = applications.filter(
      (a) => a.status === "Rejected" && a.profile.email
    );

    if (failedCandidates.length === 0) {
      toast.error("No rejected candidates with email addresses found");
      return;
    }

    setIsSendingEmails(true);
    setEmailResults([]);
    setShowEmailResults(true);

    const results: EmailResult[] = [];

    for (const candidate of failedCandidates) {
      try {
        const res = await fetch("/api/send-to-make", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getAgencyAdminAuthHeaders(),
          },
          body: JSON.stringify({
            scenario: "interview_pipeline",
            payload: {
              type: "fail",
              to: candidate.profile.email,
              candidateName: candidate.profile.fullName,
              position: "Domestic Helper",
              rating: candidate.score?.score,
              weaknessesHtml: "<li>The application did not meet the current role requirements.</li>",
              applicantId: candidate.id,
              applicationCode: candidate.applicationCode,
            },
          }),
        });

        if (res.ok) {
          results.push({
            applicantId: candidate.id,
            name: (candidate.profile.fullName as string) || "Unknown",
            email: candidate.profile.email as string,
            status: "sent",
          });
        } else {
          const d = await readSafeJson<{ error?: string }>(res);
          results.push({
            applicantId: candidate.id,
            name: (candidate.profile.fullName as string) || "Unknown",
            email: candidate.profile.email as string,
            status: "failed",
            error: d.error || "Failed to send",
          });
        }
      } catch (err) {
        results.push({
          applicantId: candidate.id,
          name: (candidate.profile.fullName as string) || "Unknown",
          email: (candidate.profile.email as string) || "",
          status: "failed",
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    setEmailResults(results);
    setIsSendingEmails(false);

    const sentCount = results.filter((r) => r.status === "sent").length;
    const failedCount = results.filter((r) => r.status === "failed").length;

    if (sentCount > 0) {
      toast.success(`Rejection emails sent to ${sentCount} candidates`);
      if (onRefreshData) onRefreshData();
    }
    if (failedCount > 0) {
      toast.error(`Failed to send ${failedCount} emails`);
    }
  }, [applications, onRefreshData]);

  // ─── Generate summary for workflow posting ──────────────────────────────

  const generateWorkflowSummary = useCallback(() => {
    const top = [...applications]
      .filter((a) => a.status !== "Rejected" && a.status !== "Placed")
      .sort((a, b) => (b.score?.score ?? 0) - (a.score?.score ?? 0))
      .slice(0, 5);

    const lines = [
      `📊 AI Pipeline Report — ${new Date().toLocaleDateString("en-GB")}`,
      "",
      `Total Applicants: ${analytics.total}`,
      `Average Score: ${analytics.avgScore}%`,
      `High Performers (80+): ${analytics.highScore.length}`,
      `Awaiting Screening: ${analytics.readyForScreening.length}`,
      `Ready for Approval: ${analytics.readyForApproval.length}`,
      `Awaiting Profile Setup: ${analytics.awaitingProfile.length}`,
      `Missing Contacts: ${analytics.needsAttention.length}`,
      `Approved with Score 70+: ${analytics.approvedWithScore.length}`,
      `Rejected: ${analytics.rejected.length}`,
      "",
      `Top Nationalities: ${analytics.topNationalities.map(([n, c]) => `${n}(${c})`).join(", ")}`,
      "",
      `🏆 Top 5 Applicants:`,
      ...top.map((a, i) => `${i + 1}. ${a.profile.fullName || "Unnamed"} — ${a.score?.score ?? 0}% — ${a.profile.nationality} — ${a.status}`),
      "",
      `💡 Recommendations:`,
      analytics.readyForScreening.length > 3 ? `• ${analytics.readyForScreening.length} candidates need screening — prioritize high scorers` : "",
      analytics.needsAttention.length > 0 ? `• ${analytics.needsAttention.length} profiles missing contact details — fix to enable outreach` : "",
      analytics.awaitingProfile.length > 0 ? `• ${analytics.awaitingProfile.length} approved candidates need public profiles configured` : "",
      analytics.approvedWithScore.length > 0 ? `• ${analytics.approvedWithScore.length} approved candidates ready for pass emails` : "",
    ].filter(Boolean);

    return lines.join("\n");
  }, [analytics, applications]);

  // ─── Post to workflow ───────────────────────────────────────────────────

  const handlePostToWorkflow = useCallback(async () => {
    if (!onPostToWorkflow) return;
    setIsPosting(true);
    setPostSuccess(false);
    try {
      const summary = generateWorkflowSummary();
      await onPostToWorkflow(summary);
      setPostSuccess(true);
      setTimeout(() => setPostSuccess(false), 3000);
    } catch {
      // error handled by parent
    } finally {
      setIsPosting(false);
    }
  }, [onPostToWorkflow, generateWorkflowSummary]);

  // ─── NL Query Handler ──────────────────────────────────────────────────

  const handleQuery = useCallback(
    async (query: string): Promise<ChatMessage> => {
      const lower = query.toLowerCase();
      const id = `a-${Date.now()}-${Math.random()}`;

      if (lower.includes("summary") || lower.includes("pipeline") || lower.includes("overview") || lower.includes("status")) {
        const lines = [
          `📊 **Pipeline Summary** — ${analytics.total} applicants`,
          "",
          `🟢 **${analytics.byStage.get("New Applicant")?.length ?? 0}** new applicants`,
          `📄 **${analytics.byStage.get("Documents Submitted")?.length ?? 0}** documents submitted`,
          `🔍 **${analytics.byStage.get("Resume Parsed")?.length ?? 0}** parsed, awaiting screening`,
          `💬 **${analytics.byStage.get("Screening Interview")?.length ?? 0}** in screening`,
          `✅ **${analytics.byStage.get("Approved")?.length ?? 0}** approved`,
          `🏠 **${analytics.byStage.get("Placed")?.length ?? 0}** placed`,
          `❌ **${analytics.byStage.get("Rejected")?.length ?? 0}** rejected`,
          "",
          `Average qualification score: **${analytics.avgScore}%**`,
          `Approved with score 70+: **${analytics.approvedWithScore.length}** (ready for pass emails)`,
        ];
        return { id, role: "assistant", content: lines.join("\n"), type: "summary" };
      }

      if (lower.includes("pass") && lower.includes("email")) {
        const count = applications.filter((a) => (a.score?.score ?? 0) >= 70 && a.status === "Approved" && a.profile.email).length;
        return {
          id,
          role: "assistant",
          content: `📧 **Pass Email Candidates**: **${count}** approved candidates with score 70+ have email addresses.\n\nUse the **Actions tab** to send congratulatory emails to all passing candidates.`,
          type: "insight",
        };
      }

      if (lower.includes("reject") && lower.includes("email")) {
        const count = applications.filter((a) => a.status === "Rejected" && a.profile.email).length;
        return {
          id,
          role: "assistant",
          content: `📧 **Rejection Email Candidates**: **${count}** rejected candidates have email addresses.\n\nUse the **Actions tab** to send polite rejection emails.`,
          type: "insight",
        };
      }

      if (lower.includes("top") || lower.includes("best") || lower.includes("highest") || lower.includes("strong")) {
        const top = [...applications]
          .filter((a) => a.status !== "Rejected" && a.status !== "Placed")
          .sort((a, b) => (b.score?.score ?? 0) - (a.score?.score ?? 0))
          .slice(0, 5);
        if (top.length === 0) return { id, role: "assistant", content: "No active applicants found.", type: "insight" };
        const lines = top.map((a, i) => `${i + 1}. **${a.profile.fullName || "Unnamed"}** — ${a.score?.score ?? 0}% (${a.profile.nationality}) — ${a.status}`);
        return { id, role: "assistant", content: `🏆 **Top ${top.length} Applicants by Score:**\n\n${lines.join("\n")}`, type: "insight" };
      }

      if (lower.includes("attention") || lower.includes("fix") || lower.includes("missing contact") || lower.includes("incomplete")) {
        if (analytics.needsAttention.length === 0) return { id, role: "assistant", content: "✅ All active applicants have contact details.", type: "insight" };
        const lines = analytics.needsAttention.slice(0, 8).map((a) => `• **${a.profile.fullName || "Unnamed"}** (${a.status}) — missing WhatsApp & email`);
        return { id, role: "assistant", content: `⚠️ **${analytics.needsAttention.length} applicants need contact details:**\n\n${lines.join("\n")}${analytics.needsAttention.length > 8 ? `\n\n...and ${analytics.needsAttention.length - 8} more` : ""}`, type: "insight" };
      }

      if (lower.includes("screen") || lower.includes("interview") || lower.includes("ready")) {
        if (analytics.readyForScreening.length === 0) return { id, role: "assistant", content: "No applicants currently awaiting screening.", type: "insight" };
        const lines = analytics.readyForScreening.slice(0, 8).map((a) => `• **${a.profile.fullName || "Unnamed"}** — ${a.score?.score ?? 0}% — ${(a.profile.contactNumber as string) || (a.profile.email as string) || "no contact"}`);
        return { id, role: "assistant", content: `🔍 **${analytics.readyForScreening.length} applicants ready for screening:**\n\n${lines.join("\n")}`, type: "insight" };
      }

      if (lower.includes("nationality") || lower.includes("country") || lower.includes("where from")) {
        const lines = analytics.topNationalities.map(([nat, count]) => `• **${nat}**: ${count} applicant${count > 1 ? "s" : ""}`);
        return { id, role: "assistant", content: `🌍 **Nationality Breakdown:**\n\n${lines.join("\n")}`, type: "insight" };
      }

      if (selectedApp && (lower.includes("this") || lower.includes("selected") || lower.includes("current") || lower.includes("profile"))) {
        const a = selectedApp;
        const score = a.score?.score ?? 0;
        const lines = [
          `📋 **${a.profile.fullName || "Unnamed"}** — ${a.applicationCode}`,
          "",
          `Score: **${score}%** (${getScoreLabel(score)})`,
          `Stage: **${a.status}**`,
          `Nationality: ${a.profile.nationality}`,
          `Experience: ${a.profile.yearsOfExperience} years`,
          `Contact: ${(a.profile.contactNumber as string) || "—"} / ${(a.profile.email as string) || "—"}`,
          `Salary: ${a.profile.expectedSalary ?? "—"}`,
          "",
          a.score?.explanation ? `💡 ${a.score.explanation}` : "",
        ].filter(Boolean);
        return { id, role: "assistant", content: lines.join("\n"), type: "insight" };
      }

      if (lower.includes("help") || lower.includes("what can") || lower.includes("how to")) {
        return {
          id,
          role: "assistant",
          content: `🤖 **I can help you with:**\n\n• **Pipeline summary** — overview of all stages\n• **Top applicants** — highest scoring candidates\n• **Needs attention** — missing contact details\n• **Ready for screening** — candidates awaiting review\n• **Nationality breakdown** — demographic insights\n• **Selected profile** — deep-dive on the current selection\n• **Pass emails** — send congratulatory emails to approved candidates\n• **Reject emails** — send polite rejection emails\n• **Post to workflow** — send AI report to Make automation\n\nJust type your question naturally!`,
          type: "insight",
        };
      }

      return {
        id,
        role: "assistant",
        content: `I analyzed your pipeline: **${analytics.total} applicants**, average score **${analytics.avgScore}%**.\n\nTry asking about: "pipeline summary", "top applicants", "pass emails", "reject emails", or "nationality breakdown".`,
        type: "insight",
      };
    },
    [analytics, applications, selectedApp],
  );

  const handleSubmit = useCallback(
    async (messageText?: string) => {
      const userMessage = (messageText ?? input).trim();
      if (!userMessage || isThinking) return;

      setInput("");
      setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: "user", content: userMessage }]);
      setIsThinking(true);

      try {
        await new Promise((r) => setTimeout(r, 400 + Math.random() * 400));
        const response = await handleQuery(userMessage);
        setMessages((prev) => [...prev, response]);
      } catch {
        setMessages((prev) => [
          ...prev,
          { id: `e-${Date.now()}`, role: "assistant", content: "Something went wrong. Please try again.", type: "error" },
        ]);
      } finally {
        setIsThinking(false);
      }
    },
    [input, isThinking, handleQuery],
  );

  // ─── Shared body content ────────────────────────────────────────────────
  const bodyContent = (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* ── Insights Tab ── */}
      {activeTab === "insights" && (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5">
            <div className="mb-2.5 flex items-center gap-2">
              <Brain className="h-4 w-4 text-emerald-600" />
              <p className="text-xs font-bold text-slate-800">Pipeline Health</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "High Score (80+)", value: analytics.highScore.length, color: "text-emerald-700 bg-emerald-50", icon: Star },
                { label: "Need Contact Fix", value: analytics.needsAttention.length, color: "text-amber-700 bg-amber-50", icon: AlertCircle },
                { label: "Awaiting Screening", value: analytics.readyForScreening.length, color: "text-sky-700 bg-sky-50", icon: Clock },
                { label: "Ready to Approve", value: analytics.readyForApproval.length, color: "text-violet-700 bg-violet-50", icon: ShieldCheck },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    if (!onApplyFilter) return;
                    if (item.label === "High Score (80+)") onApplyFilter({ minScore: 80 });
                    else if (item.label === "Need Contact Fix") onApplyFilter({ missingContact: true });
                    else if (item.label === "Awaiting Screening") onApplyFilter({ status: ["Resume Parsed"] });
                    else if (item.label === "Ready to Approve") onApplyFilter({ status: ["Screening Interview", "Background Check"] });
                    if (!inline) setIsOpen(false);
                  }}
                  className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-white p-2.5 text-left transition hover:-translate-y-px hover:shadow-sm"
                >
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${item.color}`}>
                    <item.icon className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p className="text-lg font-black leading-none text-slate-900 tabular-nums">{item.value}</p>
                    <p className="mt-0.5 text-[10px] font-medium text-slate-500">{item.label}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-slate-100 bg-white p-3 text-center">
              <p className="text-xl font-black text-slate-900 tabular-nums">{dashboard?.totalApplicants ?? analytics.total}</p>
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Total</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-white p-3 text-center">
              <p className="text-xl font-black text-emerald-700 tabular-nums">{dashboard?.approvedCandidates ?? 0}</p>
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Approved</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-white p-3 text-center">
              <p className="text-xl font-black text-teal-700 tabular-nums">{dashboard?.placedHelpers ?? 0}</p>
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Placed</p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-100 bg-white p-3.5">
            <div className="mb-2.5 flex items-center gap-2">
              <Users className="h-4 w-4 text-slate-500" />
              <p className="text-xs font-bold text-slate-800">Top Nationalities</p>
            </div>
            <div className="space-y-1.5">
              {analytics.topNationalities.map(([nat, count]) => {
                const pct = analytics.total > 0 ? Math.round((count / analytics.total) * 100) : 0;
                return (
                  <div key={nat} className="flex items-center gap-2.5">
                    <span className="w-20 truncate text-[11px] font-medium text-slate-600">{nat}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-400" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-8 text-right text-[10px] font-bold text-slate-500 tabular-nums">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3.5">
            <div className="flex items-start gap-2.5">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
              <div>
                <p className="text-xs font-bold text-indigo-800">AI Recommendation</p>
                <p className="mt-1 text-[11px] leading-5 text-indigo-700">
                  {analytics.approvedWithScore.length > 0
                    ? `${analytics.approvedWithScore.length} approved candidates with score 70+ are ready for pass emails. Consider sending congratulatory emails to move them forward.`
                    : analytics.readyForScreening.length > 3
                    ? `${analytics.readyForScreening.length} candidates are waiting for screening. Focus on those scoring above 70% first.`
                    : analytics.needsAttention.length > 0
                    ? `${analytics.needsAttention.length} profiles are missing contact details. Fix these to unlock outreach potential.`
                    : "Your pipeline looks healthy! Focus on moving high-score candidates through approval and profile setup."}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Chat Tab ── */}
      {activeTab === "chat" && (
        <>
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((msg) => {
              const isUser = msg.role === "user";
              return (
                <div key={msg.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[88%] ${isUser ? "items-end" : "items-start"} flex flex-col gap-1`}>
                    <div
                      className={`rounded-2xl px-3.5 py-2.5 text-[12.5px] leading-relaxed whitespace-pre-wrap ${
                        isUser
                          ? "bg-emerald-600 text-white rounded-br-md"
                          : "bg-slate-50 border border-slate-200 text-slate-800 rounded-bl-md"
                      }`}
                    >
                      {msg.content.split(/(\*\*.*?\*\*)/).map((part, i) => {
                        if (part.startsWith("**") && part.endsWith("**")) {
                          return <strong key={i} className={isUser ? "text-white" : "text-slate-950"}>{part.slice(2, -2)}</strong>;
                        }
                        return <span key={i}>{part}</span>;
                      })}
                    </div>
                    {msg.type && !isUser && (
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold ${
                        msg.type === "summary" ? "bg-emerald-50 text-emerald-700" :
                        msg.type === "insight" ? "bg-sky-50 text-sky-700" :
                        msg.type === "success" ? "bg-emerald-50 text-emerald-700" :
                        msg.type === "error" ? "bg-rose-50 text-rose-700" :
                        "bg-slate-100 text-slate-600"
                      }`}>
                        {msg.type === "summary" ? <BarChart3 className="h-2.5 w-2.5" /> :
                         msg.type === "insight" ? <Brain className="h-2.5 w-2.5" /> :
                         msg.type === "success" ? <CheckCircle2 className="h-2.5 w-2.5" /> :
                         msg.type === "error" ? <AlertCircle className="h-2.5 w-2.5" /> :
                         <Zap className="h-2.5 w-2.5" />}
                        {msg.type}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            {isThinking && (
              <div className="flex items-center gap-2 pl-1">
                <div className="flex gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-bounce [animation-delay:0ms]" />
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-bounce [animation-delay:150ms]" />
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-bounce [animation-delay:300ms]" />
                </div>
                <span className="text-[11px] text-slate-400">Analyzing pipeline...</span>
              </div>
            )}
          </div>

          {messages.length <= 1 && !isThinking && (
            <div className="flex flex-wrap gap-1.5 border-t border-slate-100 px-3 py-2.5">
              {[
                { label: "Pipeline summary", icon: BarChart3 },
                { label: "Top applicants", icon: Star },
                { label: "Pass emails", icon: UserCheck },
                { label: "Reject emails", icon: UserX },
              ].map((q) => (
                <button
                  key={q.label}
                  type="button"
                  onClick={() => void handleSubmit(q.label)}
                  className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 transition hover:bg-emerald-100"
                >
                  <q.icon className="h-2.5 w-2.5" />
                  {q.label}
                </button>
              ))}
            </div>
          )}

          <div className="shrink-0 border-t border-slate-100 bg-slate-50/50 p-3">
            <form
              onSubmit={(e: FormEvent<HTMLFormElement>) => {
                e.preventDefault();
                void handleSubmit();
              }}
              className="flex gap-2"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your pipeline..."
                className="flex-1 text-[12.5px] bg-white"
                disabled={isThinking}
              />
              <Button
                type="submit"
                size="sm"
                disabled={isThinking || !input.trim()}
                className="gap-1 bg-emerald-600 hover:bg-emerald-700"
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </form>
          </div>
        </>
      )}

      {/* ── Actions Tab ── */}
      {activeTab === "actions" && (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {selectedApp ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5">
              <div className="mb-2 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <p className="text-xs font-bold text-emerald-800">Selected: {(selectedApp.profile.fullName as string) || "Unnamed"}</p>
              </div>
              <div className={`mb-2.5 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${getScoreColor(selectedApp.score?.score ?? 0)}`}>
                <Star className="h-2.5 w-2.5" />
                {selectedApp.score?.score ?? 0}% · {getScoreLabel(selectedApp.score?.score ?? 0)}
              </div>
              <div className="space-y-1.5">
                {(selectedApp.profile.contactNumber as string) && (
                  <button type="button" onClick={() => window.open(`https://wa.me/${(selectedApp.profile.contactNumber as string).replace(/\D/g, "")}`, "_blank")} className="flex w-full items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs transition hover:border-emerald-300 hover:bg-emerald-50">
                    <MessageCircle className="h-3.5 w-3.5 text-emerald-600" /><span className="font-medium text-slate-700">WhatsApp</span><ArrowRight className="ml-auto h-3 w-3 text-slate-400" />
                  </button>
                )}
                {(selectedApp.profile.email as string) && (
                  <button type="button" onClick={() => window.open(`mailto:${selectedApp.profile.email}`, "_blank")} className="flex w-full items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs transition hover:border-emerald-300 hover:bg-emerald-50">
                    <Mail className="h-3.5 w-3.5 text-sky-600" /><span className="font-medium text-slate-700">Email</span><ArrowRight className="ml-auto h-3 w-3 text-slate-400" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center">
              <p className="text-xs text-slate-500">Select an applicant to see quick actions</p>
            </div>
          )}

          <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3.5">
            <div className="mb-3 flex items-center gap-2">
              <SendHorizontal className="h-4 w-4 text-blue-600" />
              <p className="text-xs font-bold text-blue-800">Candidate Email Actions</p>
            </div>
            <div className="mb-2.5">
              <div className="mb-1.5 flex items-center justify-between">
                <p className="text-[11px] font-semibold text-slate-700">Passing Candidates</p>
                <span className="text-[10px] font-bold text-emerald-600">{analytics.approvedWithScore.length} eligible</span>
              </div>
              <Button size="sm" onClick={() => void handleSendPassEmails()} disabled={isSendingEmails || analytics.approvedWithScore.length === 0} className="w-full gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
                {isSendingEmails ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserCheck className="h-3.5 w-3.5" />}
                {isSendingEmails ? "Sending..." : "Send Pass Emails"}
              </Button>
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <p className="text-[11px] font-semibold text-slate-700">Rejected Candidates</p>
                <span className="text-[10px] font-bold text-rose-600">{analytics.rejected.length} candidates</span>
              </div>
              <Button size="sm" variant="outline" onClick={() => void handleSendRejectEmails()} disabled={isSendingEmails || analytics.rejected.length === 0} className="w-full gap-1.5 border-rose-200 text-rose-700 hover:bg-rose-50">
                {isSendingEmails ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserX className="h-3.5 w-3.5" />}
                {isSendingEmails ? "Sending..." : "Send Rejection Emails"}
              </Button>
            </div>
          </div>

          {showEmailResults && emailResults.length > 0 && (
            <div className="rounded-xl border border-slate-100 bg-white p-3.5">
              <div className="mb-2.5 flex items-center justify-between">
                <p className="text-xs font-bold text-slate-800">Email Results</p>
                <button type="button" onClick={() => setShowEmailResults(false)} className="text-[10px] text-slate-400 hover:text-slate-600">Hide</button>
              </div>
              <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                {emailResults.map((result) => (
                  <div key={result.applicantId} className={`flex items-center gap-2 rounded-lg p-2 text-[11px] ${result.status === "sent" ? "bg-emerald-50 text-emerald-800" : result.status === "failed" ? "bg-rose-50 text-rose-800" : "bg-slate-50 text-slate-600"}`}>
                    {result.status === "sent" ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> : result.status === "failed" ? <AlertCircle className="h-3.5 w-3.5 shrink-0" /> : <Clock className="h-3.5 w-3.5 shrink-0" />}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate">{result.name}</p>
                      <p className="text-[10px] opacity-75 truncate">{result.email}</p>
                    </div>
                    {result.error && <p className="text-[10px] opacity-75 truncate">{result.error}</p>}
                  </div>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <span className="text-[10px] font-bold text-emerald-600">{emailResults.filter((r) => r.status === "sent").length} sent</span>
                <span className="text-[10px] font-bold text-rose-600">{emailResults.filter((r) => r.status === "failed").length} failed</span>
              </div>
            </div>
          )}

          {onApplyFilter && (
            <div className="rounded-xl border border-slate-100 bg-white p-3.5">
              <div className="mb-2.5 flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-500" />
                <p className="text-xs font-bold text-slate-800">Smart Filters</p>
              </div>
              <div className="space-y-1.5">
                {[
                  { label: "High performers (80+)", desc: `${analytics.highScore.length} applicants`, filter: { minScore: 80 } },
                  { label: "Missing contact info", desc: `${analytics.needsAttention.length} need fixing`, filter: { missingContact: true } },
                  { label: "Ready for screening", desc: `${analytics.readyForScreening.length} candidates`, filter: { status: ["Resume Parsed"] } },
                  { label: "Approval pipeline", desc: `${analytics.readyForApproval.length} in progress`, filter: { status: ["Screening Interview", "Background Check"] } },
                  { label: "Profile setup queue", desc: `${analytics.awaitingProfile.length} waiting`, filter: { status: ["Approved", READY_STAGE] } },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      onApplyFilter(item.filter);
                      if (!inline) setIsOpen(false);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg border border-slate-100 bg-white px-3 py-2 text-left transition hover:border-emerald-200 hover:bg-emerald-50"
                  >
                    <div className="flex-1">
                      <p className="text-[11px] font-semibold text-slate-800">{item.label}</p>
                      <p className="text-[10px] text-slate-400">{item.desc}</p>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {onPostToWorkflow && (
            <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-3.5">
              <div className="mb-2 flex items-center gap-2">
                <Share2 className="h-4 w-4 text-sky-600" />
                <p className="text-xs font-bold text-sky-800">Post to Workflow</p>
              </div>
              <p className="mb-3 text-[11px] leading-5 text-sky-700">Send an AI-generated pipeline summary to your Make automation workflow.</p>
              <Button size="sm" onClick={() => void handlePostToWorkflow()} disabled={isPosting} className="gap-1.5 bg-sky-600 hover:bg-sky-700 text-white">
                {isPosting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : postSuccess ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
                {isPosting ? "Posting..." : postSuccess ? "Posted!" : "Post AI Report to Workflow"}
              </Button>
            </div>
          )}

          <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3.5">
            <div className="mb-2 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-indigo-600" />
              <p className="text-xs font-bold text-indigo-800">AI Recommendations</p>
            </div>
            <div className="space-y-2">
              {analytics.approvedWithScore.length > 0 && (
                <div className="flex items-start gap-2 rounded-lg bg-white/80 p-2.5">
                  <UserCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                  <p className="text-[11px] leading-4 text-slate-700"><strong>Send pass emails</strong> — {analytics.approvedWithScore.length} approved candidates with score 70+ are ready for congratulatory emails.</p>
                </div>
              )}
              {analytics.rejected.length > 0 && (
                <div className="flex items-start gap-2 rounded-lg bg-white/80 p-2.5">
                  <UserX className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-500" />
                  <p className="text-[11px] leading-4 text-slate-700"><strong>Send rejection emails</strong> — {analytics.rejected.length} rejected candidates could receive polite closure emails.</p>
                </div>
              )}
              {analytics.readyForScreening.length >= 3 && (
                <div className="flex items-start gap-2 rounded-lg bg-white/80 p-2.5">
                  <Zap className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                  <p className="text-[11px] leading-4 text-slate-700"><strong>Batch screening</strong> — {analytics.readyForScreening.length} candidates are parsed and ready. Screen the top scorers first.</p>
                </div>
              )}
              {analytics.needsAttention.length > 0 && (
                <div className="flex items-start gap-2 rounded-lg bg-white/80 p-2.5">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                  <p className="text-[11px] leading-4 text-slate-700"><strong>Fix contacts</strong> — {analytics.needsAttention.length} applicants can't be reached. Ask them to update via the portal.</p>
                </div>
              )}
              {analytics.readyForScreening.length < 3 && analytics.needsAttention.length === 0 && analytics.approvedWithScore.length === 0 && analytics.rejected.length === 0 && (
                <div className="flex items-start gap-2 rounded-lg bg-white/80 p-2.5">
                  <Star className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                  <p className="text-[11px] leading-4 text-slate-700"><strong>Pipeline healthy</strong> — All systems look good. Keep monitoring for new applications.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ─── Tab bar (shared) ───────────────────────────────────────────────────
  const tabBar = (
    <div className="mt-3 flex gap-1 rounded-xl bg-white/10 p-1">
      {[
        { key: "insights" as const, label: "Insights", icon: BarChart3 },
        { key: "chat" as const, label: "Chat", icon: MessageCircle },
        { key: "actions" as const, label: "Actions", icon: Zap },
      ].map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => setActiveTab(tab.key)}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition ${
            activeTab === tab.key
              ? "bg-white text-emerald-700 shadow-sm"
              : "text-white/70 hover:text-white hover:bg-white/10"
          }`}
        >
          <tab.icon className="h-3 w-3" />
          {tab.label}
        </button>
      ))}
    </div>
  );

  // ─── Inline card mode ───────────────────────────────────────────────────
  if (inline) {
    return (
      <Card className="overflow-hidden border shadow-sm">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">AI Recruiting Assistant</h3>
              <p className="text-[11px] text-emerald-100">{analytics.total} applicants · avg {analytics.avgScore}%</p>
            </div>
          </div>
          {tabBar}
        </div>
        {bodyContent}
      </Card>
    );
  }

  // ─── Floating bubble mode ───────────────────────────────────────────────
  return (
    <>
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 group flex h-14 items-center gap-2.5 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 pl-5 pr-4 text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-xl hover:shadow-emerald-500/30 hover:scale-[1.03] active:scale-[0.97]"
          aria-label="Open AI Recruiting Assistant"
        >
          <Bot className="h-5 w-5 shrink-0" />
          <span className="hidden whitespace-nowrap text-sm font-bold sm:inline">AI Assistant</span>
          <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-white/25 text-[10px] font-bold tabular-nums">{analytics.total}</span>
        </button>
      )}
      {isOpen && (
        <div className="fixed bottom-0 right-0 z-50 flex h-[600px] w-full max-w-[420px] flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:bottom-6 sm:right-6 sm:rounded-2xl">
          <div className="shrink-0 bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">AI Recruiting Assistant</h3>
                  <p className="text-[11px] text-emerald-100">{analytics.total} applicants · avg {analytics.avgScore}%</p>
                </div>
              </div>
              <button type="button" onClick={() => setIsOpen(false)} className="rounded-lg p-1.5 text-emerald-100 transition hover:bg-white/15" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
            {tabBar}
          </div>
          {bodyContent}
        </div>
      )}
    </>
  );
};

export default RecruiterAiAssistant;
