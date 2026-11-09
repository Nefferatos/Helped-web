import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { submitInterviewSession } from "@/hooks/useAiAutomation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/sonner";
import { getAgencyAdminAuthHeaders } from "@/lib/agencyAdminAuth";
import {
  Bot,
  Send,
  Sparkles,
  X,
  Loader2,
  CheckCircle2,
  XCircle,
  Mail,
  Users,
  MessageSquare,
  Briefcase,
  GraduationCap,
  ClipboardCheck,
  TrendingUp,
  Clock,
  ChevronRight,
  UserRound,
  AlertCircle,
  Calendar,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: "interviewer" | "candidate";
  content: string;
  stage?: string;
  evaluation?: { score: number; notes: string };
}

interface InterviewSession {
  id: string;
  candidateName: string;
  candidateEmail: string;
  position: string;
  status: "in_progress" | "completed" | "passed" | "failed";
  currentStage: string;
  startedAt: string;
  completedAt?: string;
  messages: ChatMessage[];
  result?: {
    overallScore: number;
    recommendation: "pass" | "fail" | "borderline";
    summary: string;
    strengths: string[];
    weaknesses: string[];
    emailSent?: boolean;
  };
}

interface ScheduledInterview {
  id: string;
  applicationId: string;
  candidateName: string;
  candidateEmail: string;
  position: string;
  scheduledDate: string;
  scheduledTime: string;
  meetLink?: string;
  status: "scheduled" | "completed" | "cancelled";
  createdAt: string;
}

interface InterviewInvitationResponse {
  ok?: boolean;
  makeTriggered?: boolean;
  meetLink?: string | null;
  eventId?: string | null;
  eventUrl?: string | null;
  error?: string | null;
}

interface AtsInterviewCandidate {
  applicationId: string;
  applicationCode: string;
  name: string;
  email: string;
  position: string;
}

// ─── Interview Stages ─────────────────────────────────────────────────────────

const interviewStages = [
  { id: "introduction", label: "Introduction", icon: UserRound, description: "Greeting and basic info" },
  { id: "experience", label: "Experience", icon: Briefcase, description: "Work history and background" },
  { id: "skills", label: "Skills", icon: GraduationCap, description: "Care skills assessment" },
  { id: "scenarios", label: "Scenarios", icon: ClipboardCheck, description: "Situational questions" },
  { id: "conclusion", label: "Conclusion", icon: CheckCircle2, description: "Summary and recommendation" },
] as const;

const stageQuestions: Record<string, string[]> = {
  introduction: [
    "Hello! I'm your AI HR interviewer. Could you please tell me your full name and what position you're applying for?",
    "Thank you! Can you tell me a bit about yourself — where you're from and what motivates you to work as a domestic worker?",
  ],
  experience: [
    "How many years have you worked as a domestic worker, and which countries have you worked in?",
    "Can you describe your most recent employment? What were your main duties?",
    "What was the most challenging situation you faced in your previous job?",
  ],
  skills: [
    "How would you rate your childcare experience, and can you give an example?",
    "Have you cared for elderly persons before? What tasks were you responsible for?",
    "What cuisines can you cook, and can you follow dietary restrictions?",
    "How would you handle a medical emergency?",
  ],
  scenarios: [
    "A toddler is having a tantrum while the baby is crying. How would you handle this?",
    "If your employer asked you to do something against your beliefs, how would you respond?",
    "You notice the elderly person seems confused one morning. What steps would you take?",
  ],
  conclusion: [
    "Do you have any questions for me about the role or the agency?",
    "That concludes our interview. I'll now evaluate your responses.",
  ],
};

// ─── Local Interview Logic (fallback) ─────────────────────────────────────────

const evaluateResponse = (response: string, stage: string): { score: number; notes: string } => {
  const lower = response.toLowerCase();
  const length = response.trim().length;
  let score = 50;
  const notes: string[] = [];
  if (length > 100) { score += 15; notes.push("Detailed response"); }
  else if (length > 50) { score += 10; notes.push("Adequate response length"); }
  else if (length < 20) { score -= 15; notes.push("Very brief response"); }
  if (stage === "experience") {
    if (lower.includes("year") || lower.includes("years")) { score += 10; notes.push("Mentioned years of experience"); }
    if (lower.includes("singapore") || lower.includes("hong kong")) { score += 10; notes.push("International experience"); }
  }
  if (stage === "skills") {
    if (lower.includes("child") || lower.includes("baby")) { score += 10; notes.push("Childcare experience"); }
    if (lower.includes("elderly")) { score += 10; notes.push("Elderly care experience"); }
    if (lower.includes("cook")) { score += 10; notes.push("Cooking skills"); }
  }
  if (stage === "scenarios") {
    if (lower.includes("calm") || lower.includes("patient")) { score += 10; notes.push("Demonstrated patience"); }
    if (lower.includes("safety") || lower.includes("safe")) { score += 10; notes.push("Safety-conscious"); }
  }
  return { score: Math.max(0, Math.min(100, score)), notes: notes.join("; ") };
};

const generateInterviewResult = (messages: ChatMessage[]): InterviewSession["result"] => {
  const evaluations = messages.filter((m) => m.evaluation);
  if (evaluations.length === 0) return { overallScore: 0, recommendation: "fail", summary: "No responses evaluated.", strengths: [], weaknesses: ["No responses provided"] };
  const avgScore = Math.round(evaluations.reduce((sum, m) => sum + (m.evaluation?.score || 0), 0) / evaluations.length);
  const strengths = evaluations.flatMap((m) => (m.evaluation?.notes || "").split("; ").filter(Boolean));
  const weaknesses: string[] = [];
  if (avgScore < 50) weaknesses.push("Overall score below threshold");
  const recommendation: "pass" | "fail" | "borderline" = avgScore >= 70 ? "pass" : avgScore >= 50 ? "borderline" : "fail";
  return {
    overallScore: avgScore, recommendation,
    summary: `Scored ${avgScore}/100 across ${evaluations.length} responses. ${recommendation === "pass" ? "Demonstrates sufficient experience." : recommendation === "borderline" ? "Shows potential but needs training." : "Insufficient experience."}`,
    strengths: [...new Set(strengths)].slice(0, 5),
    weaknesses: [...new Set(weaknesses)].slice(0, 5),
  };
};

// ─── Mock sessions ────────────────────────────────────────────────────────────

// ─── Component ────────────────────────────────────────────────────────────────

const AiHrInterviewerPage = () => {
  const [view, setView] = useState<"interview" | "manage">("interview");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [candidateName, setCandidateName] = useState("");
  const [candidateEmail, setCandidateEmail] = useState("");
  const [position, setPosition] = useState("");
  const [applicationId, setApplicationId] = useState("");
  const [staffApprovedResult, setStaffApprovedResult] = useState<"" | "pass" | "fail">("");
  const [atsCandidates, setAtsCandidates] = useState<AtsInterviewCandidate[]>([]);
  const [candidatesLoading, setCandidatesLoading] = useState(true);
  const [candidatesError, setCandidatesError] = useState("");
  const [showSetup, setShowSetup] = useState(true);
  const [interviewResult, setInterviewResult] = useState<InterviewSession["result"] | null>(null);
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [sessionsError, setSessionsError] = useState("");
  const [makeTriggered, setMakeTriggered] = useState(false);
  const [makeError, setMakeError] = useState<string | null>(null);
  const [isSubmittingSession, setIsSubmittingSession] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [meetLink, setMeetLink] = useState("");
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduledInterviews, setScheduledInterviews] = useState<ScheduledInterview[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const currentStage = interviewStages[currentStageIndex];
  const totalQuestions = 10;
  const answeredQuestions = messages.filter((m) => m.role === "candidate").length;
  const progress = Math.min(100, Math.round((answeredQuestions / totalQuestions) * 100));

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isThinking]);

  useEffect(() => {
    let active = true;
    setCandidatesLoading(true);
    fetch("/api/ai/hr-interview/candidates", { headers: getAgencyAdminAuthHeaders() })
      .then(async (response) => {
        const data = (await response.json().catch(() => ({}))) as {
          candidates?: AtsInterviewCandidate[];
          error?: string;
        };
        if (!response.ok) throw new Error(data.error || `Unable to load ATS applicants (${response.status})`);
        return data.candidates ?? [];
      })
      .then((candidates) => {
        if (!active) return;
        setAtsCandidates(candidates);
        setCandidatesError("");
      })
      .catch((error: unknown) => {
        if (!active) return;
        setCandidatesError(error instanceof Error ? error.message : "Unable to load ATS applicants");
      })
      .finally(() => {
        if (active) setCandidatesLoading(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (view !== "manage") return;
    let active = true;
    fetch("/api/ai/hr-interview/sessions", { headers: getAgencyAdminAuthHeaders() })
      .then(async (response) => {
        const data = (await response.json().catch(() => ({}))) as {
          sessions?: InterviewSession[];
          error?: string;
        };
        if (!response.ok) throw new Error(data.error || `Unable to load interview history (${response.status})`);
        return data.sessions ?? [];
      })
      .then((savedSessions) => {
        if (!active) return;
        setSessions(savedSessions);
        setSessionsError("");
      })
      .catch((error: unknown) => {
        if (!active) return;
        setSessionsError(error instanceof Error ? error.message : "Unable to load interview history");
      });
    return () => { active = false; };
  }, [view]);

  const addMessage = useCallback((role: "interviewer" | "candidate", content: string, stage?: string, evaluation?: { score: number; notes: string }) => {
    setMessages((prev) => [...prev, { id: `${role}-${Date.now()}-${Math.random()}`, role, content, stage, evaluation }]);
  }, []);

  const sendInterviewInvitation = useCallback(async () => {
    if (!candidateName.trim() || !candidateEmail.trim() || !position.trim()) {
      toast.error("Fill in candidate details first");
      return null;
    }
    if (!applicationId) {
      toast.error("Select an ATS applicant first");
      return null;
    }
    if (!scheduledDate || !scheduledTime) {
      toast.error("Select a date and time");
      return null;
    }

    setIsScheduling(true);
    try {
      const dt = new Date(`${scheduledDate}T${scheduledTime}`);
      const formattedDate = dt.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
      const formattedTime = dt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });

      const response = await fetch("/api/ai/hr-interview/email", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAgencyAdminAuthHeaders() },
        body: JSON.stringify({
          to: candidateEmail,
          candidateName,
          position,
          type: "interview_invitation",
          applicationId,
          scheduledDate,
          scheduledTime,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          meetLink: meetLink.trim() || undefined,
          source: "schedule_interview",
        }),
      });

      const data = (await response.json().catch(() => ({}))) as InterviewInvitationResponse;
      if (!response.ok) throw new Error(data.error || "Failed to send invitation");

      const returnedMeetLink = typeof data.meetLink === "string" && data.meetLink.trim() ? data.meetLink.trim() : "";
      const finalMeetLink = returnedMeetLink || meetLink.trim() || undefined;
      if (returnedMeetLink) setMeetLink(returnedMeetLink);

      const newSchedule: ScheduledInterview = {
        id: `sched-${Date.now()}`,
        applicationId,
        candidateName,
        candidateEmail,
        position,
        scheduledDate,
        scheduledTime,
        meetLink: finalMeetLink,
        status: "scheduled",
        createdAt: new Date().toISOString(),
      };

      setScheduledInterviews((prev) => [newSchedule, ...prev]);
      toast.success(`Make.com triggered: invitation sent for ${formattedDate} at ${formattedTime}`);
      return newSchedule;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to schedule");
      return null;
    } finally {
      setIsScheduling(false);
    }
  }, [applicationId, candidateName, candidateEmail, position, scheduledDate, scheduledTime, meetLink]);

  // ── AI-powered interview call ─────────────────────────────────────────
  const callAiInterviewer = useCallback(async (conversationHistory: ChatMessage[]): Promise<{
    evaluation: { score: number; notes: string };
    nextQuestion: string | null;
    stage: string;
    isComplete: boolean;
    result: InterviewSession["result"] | null;
  }> => {
    const response = await fetch("/api/ai/hr-interview/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAgencyAdminAuthHeaders() },
      body: JSON.stringify({
        candidateName, position,
        messages: conversationHistory.map((m) => ({ role: m.role === "interviewer" ? "assistant" : "user", content: m.content })),
        currentStage: interviewStages[currentStageIndex]?.id || "introduction",
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `AI request failed (${response.status})`);
    if (!data || (data.nextQuestion !== null && typeof data.nextQuestion !== "string") || typeof data.stage !== "string" || typeof data.isComplete !== "boolean" || (data.isComplete && !data.result) || (!data.isComplete && !data.nextQuestion)) {
      throw new Error("The AI service returned an invalid interview response");
    }
    return data;
  }, [candidateName, position, currentStageIndex]);

  const startInterview = useCallback(async () => {
    if (!applicationId || !candidateName.trim() || !candidateEmail.trim() || !position.trim()) { toast.error("Select an ATS applicant first"); return; }
    setIsThinking(true);
    try {
      if (aiEnabled) {
        const aiResponse = await callAiInterviewer([{ id: `start-${Date.now()}`, role: "candidate", content: "Hello, I'm ready to start the interview." }]);
        if (!aiResponse.nextQuestion) throw new Error("The AI service did not provide the first interview question");
        const stageIdx = interviewStages.findIndex((s) => s.id === aiResponse.stage);
        if (stageIdx >= 0) setCurrentStageIndex(stageIdx);
        addMessage("interviewer", aiResponse.nextQuestion, aiResponse.stage);
      } else {
        addMessage("interviewer", stageQuestions.introduction[0], "introduction");
      }
      setShowSetup(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The AI interviewer is unavailable. Please try again.");
    } finally {
      setIsThinking(false);
    }
  }, [applicationId, candidateName, candidateEmail, position, addMessage, aiEnabled, callAiInterviewer]);

  const handleAiResponse = useCallback((aiResponse: { evaluation: { score: number; notes: string }; nextQuestion: string | null; stage: string; isComplete: boolean; result: InterviewSession["result"] | null }) => {
    const stageIdx = interviewStages.findIndex((s) => s.id === aiResponse.stage);
    if (stageIdx >= 0 && stageIdx !== currentStageIndex) { setCurrentStageIndex(stageIdx); setQuestionIndex(0); }
    if (aiResponse.isComplete && aiResponse.result) {
      setInterviewResult(aiResponse.result);
      setStaffApprovedResult("");
      addMessage("interviewer", `Thank you, ${candidateName}! Interview complete. Score: ${aiResponse.result.overallScore}/100. ${aiResponse.result.summary}`, "conclusion");
      setIsSubmittingSession(true);
      submitInterviewSession({ applicationId, sessionData: { candidateName, candidateEmail, position, messages }, rating: aiResponse.result.overallScore, recommendation: aiResponse.result.recommendation, summary: aiResponse.result.summary })
        .then(({ makeTriggered: mt, makeError: me }) => { setMakeTriggered(mt); setMakeError(me); if (mt && !me) toast.success("Session saved & Make.com triggered"); else if (me) toast.warning(`Session saved, Make.com failed: ${me}`); })
        .catch((err) => { setMakeError(err instanceof Error ? err.message : "Failed to save"); toast.error("Failed to save session"); })
        .finally(() => setIsSubmittingSession(false));
    } else if (aiResponse.nextQuestion) { addMessage("interviewer", aiResponse.nextQuestion, aiResponse.stage); }
  }, [applicationId, candidateName, candidateEmail, position, messages, addMessage, currentStageIndex]);

  const askNextQuestion = useCallback(() => {
    const stage = interviewStages[currentStageIndex];
    const questions = stageQuestions[stage.id] || [];
    if (questionIndex + 1 < questions.length) {
      setTimeout(() => { addMessage("interviewer", questions[questionIndex + 1], stage.id); setQuestionIndex(questionIndex + 1); }, 800);
    } else if (currentStageIndex + 1 < interviewStages.length) {
      const nextStage = interviewStages[currentStageIndex + 1];
      setTimeout(() => { addMessage("interviewer", `Let's move on to ${nextStage.label.toLowerCase()}. ${stageQuestions[nextStage.id][0]}`, nextStage.id); setCurrentStageIndex(currentStageIndex + 1); setQuestionIndex(0); }, 800);
    } else {
      setTimeout(() => {
        const result = generateInterviewResult(messages);
        setInterviewResult(result);
        setStaffApprovedResult("");
        addMessage("interviewer", `Thank you, ${candidateName}! Complete. Score: ${result?.overallScore}/100. ${result?.summary}`, "conclusion");
        setIsSubmittingSession(true);
        submitInterviewSession({ applicationId, sessionData: { candidateName, candidateEmail, position, messages, result }, rating: result?.overallScore, recommendation: result?.recommendation, summary: result?.summary })
          .then(({ makeTriggered: mt, makeError: me }) => { setMakeTriggered(mt); setMakeError(me); })
          .catch(() => toast.error("Failed to save session"))
          .finally(() => setIsSubmittingSession(false));
      }, 1000);
    }
  }, [applicationId, currentStageIndex, questionIndex, messages, candidateName, candidateEmail, position, addMessage]);

  const handleSendResponse = useCallback(async () => {
    const response = input.trim();
    if (!response || isThinking) return;
    setInput("");
    const stage = currentStage.id;
    if (aiEnabled) {
      addMessage("candidate", response, stage);
      setIsThinking(true);
      const updatedMessages = [...messages, { id: `c-${Date.now()}`, role: "candidate" as const, content: response, stage }];
      try {
        const aiResponse = await callAiInterviewer(updatedMessages);
        setMessages((prev) => { const u = [...prev]; const last = [...u].reverse().find((m) => m.role === "candidate"); if (last && aiResponse.evaluation) last.evaluation = aiResponse.evaluation; return u; });
        handleAiResponse(aiResponse);
      } catch (error) {
        setMessages((prev) => prev.at(-1)?.role === "candidate" ? prev.slice(0, -1) : prev);
        setInput(response);
        toast.error(error instanceof Error ? error.message : "The AI interviewer is unavailable. Your answer was not evaluated.");
      } finally {
        setIsThinking(false);
      }
    } else {
      const evaluation = evaluateResponse(response, stage);
      addMessage("candidate", response, stage, evaluation);
      setIsThinking(true);
      await new Promise((r) => setTimeout(r, 600 + Math.random() * 800));
      setIsThinking(false);
      askNextQuestion();
    }
  }, [input, isThinking, currentStage, messages, addMessage, askNextQuestion, aiEnabled, callAiInterviewer, handleAiResponse]);

  // ── Schedule Interview & Send Invitation (via Make.com) ───────────────
  const scheduleInterview = useCallback(async () => {
    await sendInterviewInvitation();
  }, [sendInterviewInvitation]);

  const sendResultEmail = useCallback(async (type: "pass" | "fail") => {
    if (!candidateEmail || !staffApprovedResult || type !== staffApprovedResult) return;
    setEmailSending(true);
    try {
      // Build structured data for Make.com workflow (generates its own HTML templates)
      const strengthsHtml = (interviewResult?.strengths ?? []).map((s) => `<li>${s}</li>`).join("");
      const weaknessesHtml = (interviewResult?.weaknesses ?? []).map((w) => `<li>${w}</li>`).join("");

      const payload: Record<string, unknown> = {
        to: candidateEmail,
        candidateName,
        position,
        type,
        rating: interviewResult?.overallScore ?? 0,
      };

      if (type === "pass") {
        payload.strengthsHtml = strengthsHtml || "<li>Strong overall performance</li>";
      } else {
        payload.weaknessesHtml = weaknessesHtml || "<li>Areas for improvement identified</li>";
      }

      const response = await fetch("/api/ai/hr-interview/email", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAgencyAdminAuthHeaders() },
        body: JSON.stringify(payload),
      });
      if (!response.ok) { const data = await response.json().catch(() => ({})); throw new Error(data.error || "Failed to send email"); }
      setEmailSent(true);
      toast.success(`${type === "pass" ? "Pass" : "Fail"} email sent to ${candidateEmail}`);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Failed to send email"); }
    finally { setEmailSending(false); }
  }, [candidateEmail, candidateName, position, interviewResult, staffApprovedResult]);

  const resetInterview = useCallback(() => {
    setMessages([]); setInput(""); setCurrentStageIndex(0); setQuestionIndex(0);
    setCandidateName(""); setCandidateEmail(""); setPosition(""); setApplicationId(""); setStaffApprovedResult(""); setShowSetup(true);
    setInterviewResult(null); setEmailSent(false); setMakeTriggered(false); setMakeError(null); setIsSubmittingSession(false);
    setScheduledDate(""); setScheduledTime(""); setMeetLink("");
  }, []);

  const statusBadge = (status: InterviewSession["status"]) => {
    const config = { in_progress: { label: "In Progress", cls: "bg-blue-100 text-blue-800" }, completed: { label: "Completed", cls: "bg-slate-100 text-slate-800" }, passed: { label: "Passed", cls: "bg-emerald-100 text-emerald-800" }, failed: { label: "Failed", cls: "bg-rose-100 text-rose-800" } };
    const c = config[status];
    return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${c.cls}`}>{c.label}</span>;
  };

  const scheduleStatusBadge = (status: ScheduledInterview["status"]) => {
    const config = { scheduled: { label: "Scheduled", cls: "bg-blue-100 text-blue-800" }, completed: { label: "Completed", cls: "bg-emerald-100 text-emerald-800" }, cancelled: { label: "Cancelled", cls: "bg-slate-100 text-slate-800" } };
    const c = config[status];
    return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${c.cls}`}>{c.label}</span>;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-sm"><Bot className="h-5 w-5" /></div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">AI HR Interviewer</h1>
                <p className="text-xs text-slate-500">Make AI Agent conducts the interview; a server-configured fallback may be used if Make is unavailable.</p>
              </div>
            </div>
            <div className="flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
              <button onClick={() => setView("interview")} className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition ${view === "interview" ? "bg-white shadow-sm text-violet-700" : "text-slate-500 hover:text-slate-700"}`}>
                <MessageSquare className="h-4 w-4" /> Interview
              </button>
              <button onClick={() => setView("manage")} className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition ${view === "manage" ? "bg-white shadow-sm text-violet-700" : "text-slate-500 hover:text-slate-700"}`}>
                <Users className="h-4 w-4" /> Manage
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {view === "interview" && (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm" style={{ minHeight: "600px" }}>
              {showSetup ? (
                <div className="flex flex-1 items-center justify-center p-8">
                  <div className="w-full max-w-md space-y-5">
                    <div className="text-center">
                      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg"><Bot className="h-8 w-8" /></div>
                      <h2 className="text-xl font-bold text-slate-900">Start AI Interview</h2>
                      <p className="mt-1 text-sm text-slate-500">The AI will conduct a structured interview and evaluate the candidate</p>
                    </div>
                    <div className="space-y-3">
                      <label className="block"><span className="text-xs font-semibold text-slate-600">ATS applicant</span><select aria-label="ATS applicant" className="mt-1.5 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm" value={applicationId} disabled={candidatesLoading} onChange={(event) => {
                        const selected = atsCandidates.find((candidate) => candidate.applicationId === event.target.value);
                        setApplicationId(selected?.applicationId ?? "");
                        setCandidateName(selected?.name ?? "");
                        setCandidateEmail(selected?.email ?? "");
                        setPosition(selected?.position ?? "");
                      }}>
                        <option value="">{candidatesLoading ? "Loading applicants…" : "Select an ATS applicant"}</option>
                        {atsCandidates.map((candidate) => <option key={candidate.applicationId} value={candidate.applicationId}>{candidate.name} · {candidate.applicationCode}</option>)}
                      </select></label>
                      {candidatesError && <p role="alert" className="text-xs text-rose-700">Applicant list unavailable: {candidatesError}</p>}
                      {!candidatesLoading && !candidatesError && atsCandidates.length === 0 && <p className="text-xs text-amber-800">No ATS applicants with a valid name and email are available for this agency.</p>}
                      {applicationId && <p className="text-xs text-slate-600">{candidateName} · {candidateEmail} · {position}</p>}
                    </div>

                    {/* Schedule Interview Section */}
                    <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-blue-600" />
                        <p className="text-xs font-bold text-blue-700 uppercase tracking-wide">Schedule Interview</p>
                      </div>
                      <p className="text-[11px] text-slate-500">Optionally schedule and send an invitation. Starting the interview alone does not email the applicant.</p>
                      <div className="grid grid-cols-2 gap-2">
                        <label className="block"><span className="text-[11px] font-semibold text-slate-600">Date</span><Input className="mt-1" type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} min={new Date().toISOString().split("T")[0]} /></label>
                        <label className="block"><span className="text-[11px] font-semibold text-slate-600">Time</span><Input className="mt-1" type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} /></label>
                      </div>
                      <label className="block"><span className="text-[11px] font-semibold text-slate-600">Google Meet Link (optional)</span><Input className="mt-1" type="url" value={meetLink} onChange={(e) => setMeetLink(e.target.value)} placeholder="https://meet.google.com/xxx-xxxx-xxx" /></label>
                      {scheduledDate && scheduledTime && (
                        <Button onClick={() => void scheduleInterview()} disabled={isScheduling} variant="outline" className="w-full border-blue-300 text-blue-700 hover:bg-blue-100" size="sm">
                          {isScheduling ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Mail className="mr-2 h-3.5 w-3.5" />}
                          Send Interview Invitation
                        </Button>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                        <input type="checkbox" checked={aiEnabled} onChange={(e) => setAiEnabled(e.target.checked)} className="rounded border-slate-300" />
                        <Bot className="h-3 w-3" /> {aiEnabled ? "Make AI Agent (primary)" : "Scripted interview (AI disabled)"}
                      </label>
                    </div>
                    <Button onClick={() => void startInterview()} disabled={candidatesLoading || !applicationId || isThinking} className="w-full bg-violet-600 hover:bg-violet-700" size="lg">
                      {isThinking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />} Start Interview Now
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Stage progress */}
                  <div className="border-b border-slate-100 bg-slate-50/80 p-3">
                    <div className="flex items-center gap-1.5">
                      {interviewStages.map((s, i) => {
                        const Icon = s.icon;
                        const isActive = i === currentStageIndex;
                        const isDone = i < currentStageIndex;
                        return (
                          <div key={s.id} className="flex flex-1 items-center">
                            <div className={`flex flex-col items-center gap-1 ${isActive ? "" : isDone ? "" : "opacity-40"}`}>
                              <div className={`flex h-7 w-7 items-center justify-center rounded-lg transition ${isActive ? "bg-violet-600 text-white" : isDone ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"}`}>
                                {isDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                              </div>
                              <span className={`text-[9px] font-bold uppercase tracking-wide ${isActive ? "text-violet-700" : "text-slate-400"}`}>{s.label}</span>
                            </div>
                            {i < interviewStages.length - 1 && <div className={`h-0.5 flex-1 mx-1 ${isDone ? "bg-emerald-300" : "bg-slate-200"}`} />}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Messages */}
                  <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
                    {messages.map((msg) => {
                      const isCandidate = msg.role === "candidate";
                      return (
                        <div key={msg.id} className={`flex ${isCandidate ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[80%] ${isCandidate ? "items-end" : "items-start"} flex flex-col gap-1.5`}>
                            {!isCandidate && (<div className="flex items-center gap-1.5 pl-1"><div className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-100"><Bot className="h-3 w-3 text-violet-600" /></div><span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">AI Interviewer</span></div>)}
                            <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${isCandidate ? "bg-violet-600 text-white rounded-br-md" : "bg-slate-50 border border-slate-200 text-slate-800 rounded-bl-md"}`}>{msg.content}</div>
                            {msg.evaluation && (<div className="flex items-center gap-1.5 pl-1"><span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${msg.evaluation.score >= 70 ? "bg-emerald-50 text-emerald-700" : msg.evaluation.score >= 50 ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"}`}><TrendingUp className="h-2.5 w-2.5" /> Score: {msg.evaluation.score}</span>{msg.evaluation.notes && <span className="text-[10px] text-slate-400">{msg.evaluation.notes}</span>}</div>)}
                          </div>
                        </div>
                      );
                    })}
                    {isThinking && (<div className="flex items-center gap-2 pl-2"><Loader2 className="h-4 w-4 animate-spin text-violet-500" /><span className="text-xs text-slate-500">{aiEnabled ? "AI is evaluating..." : "Evaluating..."}</span></div>)}

                    {/* Interview Result */}
                    {interviewResult && (
                      <div className="mt-4 rounded-2xl border-2 border-violet-200 bg-violet-50/50 p-5">
                        <div className="mb-4 flex items-center gap-3">
                          <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${interviewResult.recommendation === "pass" ? "bg-emerald-100 text-emerald-700" : interviewResult.recommendation === "borderline" ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"}`}>
                            {interviewResult.recommendation === "pass" ? <CheckCircle2 className="h-6 w-6" /> : interviewResult.recommendation === "borderline" ? <AlertCircle className="h-6 w-6" /> : <XCircle className="h-6 w-6" />}
                          </div>
                          <div><h3 className="text-base font-bold text-slate-900">AI Interview Assessment (Advisory)</h3><p className="text-sm text-slate-500">Advisory score: {interviewResult.overallScore}/100 — <span className={`font-bold ${interviewResult.recommendation === "pass" ? "text-emerald-600" : interviewResult.recommendation === "borderline" ? "text-amber-600" : "text-rose-600"}`}>AI suggests {interviewResult.recommendation.toUpperCase()}</span></p></div>
                        </div>
                        <p className="text-sm leading-relaxed text-slate-700">{interviewResult.summary}</p>
                        {interviewResult.strengths.length > 0 && (<div className="mt-3"><p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Strengths</p><ul className="mt-1 space-y-1">{interviewResult.strengths.map((s, i) => (<li key={i} className="flex items-start gap-2 text-sm text-slate-700"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" /> {s}</li>))}</ul></div>)}
                        {interviewResult.weaknesses.length > 0 && (<div className="mt-3"><p className="text-xs font-bold uppercase tracking-wide text-rose-700">Areas for Improvement</p><ul className="mt-1 space-y-1">{interviewResult.weaknesses.map((w, i) => (<li key={i} className="flex items-start gap-2 text-sm text-slate-700"><XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-500" /> {w}</li>))}</ul></div>)}
                        <div className="mt-4 border-t border-violet-200 pt-3">
                          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-600">Workflow Automation</p>
                          {isSubmittingSession ? (<div className="flex items-center gap-2 text-xs text-slate-500"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving & triggering Make.com...</div>) : makeTriggered ? (<div className="flex items-center gap-2 text-xs font-semibold text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" /> Make.com triggered</div>) : makeError ? (<div className="flex items-center gap-2 text-xs font-semibold text-amber-600"><AlertCircle className="h-3.5 w-3.5" /> Make.com failed: {makeError}</div>) : null}
                        </div>
                        <div className="mt-3 border-t border-violet-200 pt-4">
                          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-600">Staff decision required before emailing</p>
                          <label className="mb-3 block text-xs font-semibold text-slate-700">Staff-approved outcome<select aria-label="Staff-approved outcome" value={staffApprovedResult} onChange={(event) => setStaffApprovedResult(event.target.value as "" | "pass" | "fail")} className="mt-1 h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm font-normal text-slate-900"><option value="">Choose after reviewing the assessment</option><option value="pass">Proceed — send pass email</option><option value="fail">Do not proceed — send fail email</option></select></label>
                          <div className="flex gap-2">
                            <Button onClick={() => { if (staffApprovedResult) void sendResultEmail(staffApprovedResult); }} disabled={emailSending || emailSent || !staffApprovedResult} className={staffApprovedResult === "fail" ? "bg-rose-600 hover:bg-rose-700" : "bg-emerald-600 hover:bg-emerald-700"} size="sm"><Mail className="mr-1.5 h-3.5 w-3.5" />{emailSending ? "Sending…" : emailSent ? "Sent" : "Send approved outcome email"}</Button>
                            <Button onClick={resetInterview} variant="ghost" size="sm" className="ml-auto">New Interview</Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Input */}
                  {!interviewResult && (
                    <div className="border-t border-slate-100 bg-slate-50/50 p-3">
                      <form onSubmit={(e) => { e.preventDefault(); void handleSendResponse(); }} className="flex gap-2">
                        <Textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type your response..." rows={2} className="flex-1 resize-none" disabled={isThinking} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleSendResponse(); } }} />
                        <Button type="submit" disabled={isThinking || !input.trim()} className="bg-violet-600 hover:bg-violet-700" size="sm"><Send className="h-4 w-4" /></Button>
                      </form>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="mb-3 text-sm font-bold text-slate-900">Interview Progress</p>
                <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-500" style={{ width: `${progress}%` }} /></div>
                <p className="text-xs text-slate-500">{answeredQuestions} questions answered ({progress}%)</p>
                <div className="mt-3 space-y-2">
                  {interviewStages.map((s, i) => {
                    const Icon = s.icon;
                    const isDone = i < currentStageIndex;
                    const isActive = i === currentStageIndex;
                    return (
                      <div key={s.id} className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 ${isActive ? "bg-violet-50" : ""}`}>
                        <div className={`flex h-6 w-6 items-center justify-center rounded-md ${isActive ? "bg-violet-600 text-white" : isDone ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>{isDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}</div>
                        <div className="min-w-0"><p className={`text-xs font-semibold ${isActive ? "text-violet-700" : isDone ? "text-emerald-700" : "text-slate-500"}`}>{s.label}</p><p className="text-[10px] text-slate-400">{s.description}</p></div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="mb-3 text-sm font-bold text-slate-900">How it works</p>
                <ul className="space-y-2 text-xs leading-relaxed text-slate-600">
                  <li className="flex gap-2"><span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[9px] font-bold text-violet-700">1</span>Select an agency ATS applicant</li>
                  <li className="flex gap-2"><span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[9px] font-bold text-violet-700">2</span>Optionally schedule & send invitation email</li>
                  <li className="flex gap-2"><span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[9px] font-bold text-violet-700">3</span>AI conducts the interview dynamically</li>
                  <li className="flex gap-2"><span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[9px] font-bold text-violet-700">4</span>AI evaluates and generates pass/fail result</li>
                  <li className="flex gap-2"><span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[9px] font-bold text-violet-700">5</span>Send result email to candidate</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* ── Management View ── */}
        {view === "manage" && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid gap-3 sm:grid-cols-4">
              {[
                { label: "Total Interviews", value: sessions.length, icon: Users, color: "text-violet-600 bg-violet-50" },
                { label: "Completed", value: sessions.filter((s) => s.status === "completed").length, icon: Clock, color: "text-blue-600 bg-blue-50" },
                { label: "AI suggests proceed", value: sessions.filter((s) => s.result?.recommendation === "pass").length, icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50" },
                { label: "Scheduled", value: scheduledInterviews.filter((s) => s.status === "scheduled").length, icon: Calendar, color: "text-amber-600 bg-amber-50" },
              ].map((stat) => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.color}`}><Icon className="h-5 w-5" /></div>
                      <div><p className="text-2xl font-bold text-slate-900">{stat.value}</p><p className="text-xs text-slate-500">{stat.label}</p></div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Scheduled Interviews */}
            {scheduledInterviews.length > 0 && (
              <div className="rounded-2xl border border-blue-200 bg-blue-50/30 shadow-sm">
                <div className="border-b border-blue-100 px-5 py-4">
                  <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-blue-600" /><h2 className="text-sm font-bold text-slate-900">Scheduled Interviews</h2></div>
                  <p className="text-xs text-slate-500">Upcoming interview appointments with email invitations sent</p>
                </div>
                <div className="divide-y divide-blue-100">
                  {scheduledInterviews.map((sched) => (
                    <div key={sched.id} className="flex items-center gap-4 p-4 hover:bg-blue-50/50">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 text-sm font-bold text-white"><Calendar className="h-4 w-4" /></div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2"><p className="text-sm font-semibold text-slate-900">{sched.candidateName}</p>{scheduleStatusBadge(sched.status)}</div>
                        <p className="text-xs text-slate-500">{sched.position} · {sched.candidateEmail}</p>
                        <p className="text-xs text-blue-600 font-semibold mt-0.5">📅 {new Date(`${sched.scheduledDate}T${sched.scheduledTime}`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} at {new Date(`${sched.scheduledDate}T${sched.scheduledTime}`).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}</p>
                        {sched.meetLink && <a href={sched.meetLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:underline mt-0.5">📹 Join Google Meet</a>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600"><Mail className="h-3 w-3" /> Invitation sent</span>
                        <Button size="sm" variant="outline" onClick={() => { setView("interview"); resetInterview(); setApplicationId(sched.applicationId); setCandidateName(sched.candidateName); setCandidateEmail(sched.candidateEmail); setPosition(sched.position); }}><ChevronRight className="h-3.5 w-3.5" /> Start</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Past Interviews */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="text-sm font-bold text-slate-900">Saved AI Interview Sessions</h2>
                <p className="text-xs text-slate-500">ATS-linked history. AI recommendations are advisory and are not hiring decisions.</p>
              </div>
              {sessionsError && <p role="alert" className="m-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">Interview history unavailable: {sessionsError}</p>}
              <div className="divide-y divide-slate-100">
                {sessions.map((session) => (
                  <div key={session.id} className="flex items-center gap-4 p-4 hover:bg-slate-50/50">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 text-sm font-bold text-white">{session.candidateName.charAt(0)}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2"><p className="text-sm font-semibold text-slate-900">{session.candidateName}</p>{statusBadge(session.status)}</div>
                      <p className="text-xs text-slate-500">{session.position} · {session.candidateEmail}</p>
                      {session.result && (<div className="mt-1 flex items-center gap-2"><span className={`text-xs font-bold ${session.result.recommendation === "pass" ? "text-emerald-600" : session.result.recommendation === "borderline" ? "text-amber-600" : "text-rose-600"}`}>AI advisory: {session.result.overallScore}/100 · suggests {session.result.recommendation}</span></div>)}
                    </div>
                  </div>
                ))}
              </div>
              {!sessionsError && sessions.length === 0 && <p className="p-5 text-sm text-slate-600">No completed AI interview sessions are recorded for this agency yet.</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AiHrInterviewerPage;
