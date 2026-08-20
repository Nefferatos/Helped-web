import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { submitInterviewSession } from "@/hooks/useAiAutomation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/sonner";
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
  candidateName: string;
  candidateEmail: string;
  position: string;
  scheduledDate: string;
  scheduledTime: string;
  status: "scheduled" | "completed" | "cancelled";
  createdAt: string;
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

const mockSessions: InterviewSession[] = [
  { id: "int-001", candidateName: "Maria Santos", candidateEmail: "maria@email.com", position: "Domestic Worker (Childcare)", status: "passed", currentStage: "conclusion", startedAt: "2026-08-15T10:00:00Z", completedAt: "2026-08-15T10:25:00Z", messages: [], result: { overallScore: 82, recommendation: "pass", summary: "Strong candidate with 5+ years childcare experience.", strengths: ["Detailed responses", "International experience"], weaknesses: [], emailSent: true } },
  { id: "int-002", candidateName: "Siti Rahma", candidateEmail: "siti@email.com", position: "Domestic Worker (Elderly Care)", status: "in_progress", currentStage: "skills", startedAt: "2026-08-16T14:00:00Z", messages: [] },
  { id: "int-003", candidateName: "Priya Sharma", candidateEmail: "priya@email.com", position: "Domestic Worker (General)", status: "failed", currentStage: "conclusion", startedAt: "2026-08-14T09:00:00Z", completedAt: "2026-08-14T09:15:00Z", messages: [], result: { overallScore: 35, recommendation: "fail", summary: "Insufficient experience.", strengths: [], weaknesses: ["Brief responses"], emailSent: false } },
];

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
  const [showSetup, setShowSetup] = useState(true);
  const [interviewResult, setInterviewResult] = useState<InterviewSession["result"] | null>(null);
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [sessions] = useState<InterviewSession[]>(mockSessions);
  const [makeTriggered, setMakeTriggered] = useState(false);
  const [makeError, setMakeError] = useState<string | null>(null);
  const [isSubmittingSession, setIsSubmittingSession] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
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

  const addMessage = useCallback((role: "interviewer" | "candidate", content: string, stage?: string, evaluation?: { score: number; notes: string }) => {
    setMessages((prev) => [...prev, { id: `${role}-${Date.now()}-${Math.random()}`, role, content, stage, evaluation }]);
  }, []);

  // ── AI-powered interview call ─────────────────────────────────────────
  const callAiInterviewer = useCallback(async (conversationHistory: ChatMessage[]): Promise<{
    evaluation: { score: number; notes: string };
    nextQuestion: string | null;
    stage: string;
    isComplete: boolean;
    result: InterviewSession["result"] | null;
  } | null> => {
    try {
      const response = await fetch("/api/ai/hr-interview/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateName, position,
          messages: conversationHistory.map((m) => ({ role: m.role === "interviewer" ? "assistant" : "user", content: m.content })),
          currentStage: interviewStages[currentStageIndex]?.id || "introduction",
        }),
      });
      if (!response.ok) { const data = await response.json().catch(() => ({})); throw new Error(data.error || `AI request failed (${response.status})`); }
      return await response.json();
    } catch (err) { console.error("[AiHrInterviewer] AI call failed:", err); return null; }
  }, [candidateName, position, currentStageIndex]);

  const startInterview = useCallback(async () => {
    if (!candidateName.trim() || !candidateEmail.trim() || !position.trim()) { toast.error("Please fill in all fields"); return; }
    setShowSetup(false);
    setIsThinking(true);
    if (aiEnabled) {
      const aiResponse = await callAiInterviewer([]);
      if (aiResponse?.nextQuestion) {
        const stageIdx = interviewStages.findIndex((s) => s.id === aiResponse.stage);
        if (stageIdx >= 0) setCurrentStageIndex(stageIdx);
        addMessage("interviewer", aiResponse.nextQuestion, aiResponse.stage);
      } else { addMessage("interviewer", "Hello! Could you please tell me your full name and what position you're applying for?", "introduction"); }
    } else { addMessage("interviewer", stageQuestions.introduction[0], "introduction"); }
    setIsThinking(false);
  }, [candidateName, candidateEmail, position, addMessage, aiEnabled, callAiInterviewer]);

  const handleAiResponse = useCallback((aiResponse: { evaluation: { score: number; notes: string }; nextQuestion: string | null; stage: string; isComplete: boolean; result: InterviewSession["result"] | null }) => {
    const stageIdx = interviewStages.findIndex((s) => s.id === aiResponse.stage);
    if (stageIdx >= 0 && stageIdx !== currentStageIndex) { setCurrentStageIndex(stageIdx); setQuestionIndex(0); }
    if (aiResponse.isComplete && aiResponse.result) {
      setInterviewResult(aiResponse.result);
      addMessage("interviewer", `Thank you, ${candidateName}! Interview complete. Score: ${aiResponse.result.overallScore}/100. ${aiResponse.result.summary}`, "conclusion");
      setIsSubmittingSession(true);
      submitInterviewSession({ applicationId: `interview-${Date.now()}`, sessionData: { candidateName, candidateEmail, position, messages }, rating: aiResponse.result.overallScore, recommendation: aiResponse.result.recommendation, summary: aiResponse.result.summary })
        .then(({ makeTriggered: mt, makeError: me }) => { setMakeTriggered(mt); setMakeError(me); if (mt && !me) toast.success("Session saved & Make.com triggered"); else if (me) toast.warning(`Session saved, Make.com failed: ${me}`); })
        .catch((err) => { setMakeError(err instanceof Error ? err.message : "Failed to save"); toast.error("Failed to save session"); })
        .finally(() => setIsSubmittingSession(false));
    } else if (aiResponse.nextQuestion) { addMessage("interviewer", aiResponse.nextQuestion, aiResponse.stage); }
  }, [candidateName, candidateEmail, position, messages, addMessage, currentStageIndex]);

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
        addMessage("interviewer", `Thank you, ${candidateName}! Complete. Score: ${result?.overallScore}/100. ${result?.summary}`, "conclusion");
        setIsSubmittingSession(true);
        submitInterviewSession({ applicationId: `interview-${Date.now()}`, sessionData: { candidateName, candidateEmail, position, messages, result }, rating: result?.overallScore, recommendation: result?.recommendation, summary: result?.summary })
          .then(({ makeTriggered: mt, makeError: me }) => { setMakeTriggered(mt); setMakeError(me); })
          .catch(() => toast.error("Failed to save session"))
          .finally(() => setIsSubmittingSession(false));
      }, 1000);
    }
  }, [currentStageIndex, questionIndex, messages, candidateName, candidateEmail, position, addMessage]);

  const handleSendResponse = useCallback(async () => {
    const response = input.trim();
    if (!response || isThinking) return;
    setInput("");
    const stage = currentStage.id;
    if (aiEnabled) {
      addMessage("candidate", response, stage);
      setIsThinking(true);
      const updatedMessages = [...messages, { id: `c-${Date.now()}`, role: "candidate" as const, content: response, stage }];
      const aiResponse = await callAiInterviewer(updatedMessages);
      setIsThinking(false);
      if (aiResponse) {
        setMessages((prev) => { const u = [...prev]; const last = [...u].reverse().find((m) => m.role === "candidate"); if (last && aiResponse.evaluation) last.evaluation = aiResponse.evaluation; return u; });
        handleAiResponse(aiResponse);
      } else {
        const evaluation = evaluateResponse(response, stage);
        setMessages((prev) => { const u = [...prev]; const last = [...u].reverse().find((m) => m.role === "candidate"); if (last) last.evaluation = evaluation; return u; });
        toast.warning("AI unavailable — using local evaluation");
        askNextQuestion();
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

  // ── Schedule Interview & Send Invitation ──────────────────────────────
  const scheduleInterview = useCallback(async () => {
    if (!candidateName.trim() || !candidateEmail.trim() || !position.trim()) { toast.error("Fill in candidate details first"); return; }
    if (!scheduledDate || !scheduledTime) { toast.error("Select a date and time"); return; }
    setIsScheduling(true);
    try {
      const dt = new Date(`${scheduledDate}T${scheduledTime}`);
      const formattedDate = dt.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
      const formattedTime = dt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
      const subject = `Interview Invitation – ${position} Position`;
      const body = `Dear ${candidateName},\n\nWe are pleased to invite you for an interview for the ${position} position.\n\nInterview Details:\n• Date: ${formattedDate}\n• Time: ${formattedTime}\n• Type: AI-Assisted HR Interview\n\nPlease ensure you are available at the scheduled time. The interview will be conducted by our AI HR assistant and will assess your experience, skills, and suitability for the role.\n\nIf you need to reschedule, please contact us as soon as possible.\n\nWe look forward to speaking with you.\n\nBest regards,\nThe Agency HR Team`;

      const response = await fetch("/api/ai/hr-interview/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: candidateEmail, subject, body, candidateName, position, type: "interview_invitation", scheduledDate, scheduledTime }),
      });
      if (!response.ok) { const data = await response.json().catch(() => ({})); throw new Error(data.error || "Failed to send invitation"); }

      const newSchedule: ScheduledInterview = { id: `sched-${Date.now()}`, candidateName, candidateEmail, position, scheduledDate, scheduledTime, status: "scheduled", createdAt: new Date().toISOString() };
      setScheduledInterviews((prev) => [newSchedule, ...prev]);
      toast.success(`Invitation sent to ${candidateEmail} for ${formattedDate} at ${formattedTime}`);
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed to schedule"); }
    finally { setIsScheduling(false); }
  }, [candidateName, candidateEmail, position, scheduledDate, scheduledTime]);

  const sendResultEmail = useCallback(async (type: "pass" | "fail") => {
    if (!candidateEmail) return;
    setEmailSending(true);
    try {
      const subject = type === "pass" ? `Congratulations! Shortlisted for ${position}` : `Update on your application for ${position}`;
      const body = type === "pass"
        ? `Dear ${candidateName},\n\nCongratulations! You have been shortlisted for the ${position} position.\n\nScore: ${interviewResult?.overallScore}/100\n\nStrengths:\n${interviewResult?.strengths.map((s) => `- ${s}`).join("\n")}\n\nBest regards,\nThe Agency HR Team`
        : `Dear ${candidateName},\n\nThank you for interviewing for the ${position} position.\n\nWe are unable to proceed at this time.\n\nAreas for improvement:\n${interviewResult?.weaknesses.map((w) => `- ${w}`).join("\n")}\n\nBest regards,\nThe Agency HR Team`;
      const response = await fetch("/api/ai/hr-interview/email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ to: candidateEmail, subject, body, candidateName, position, result: interviewResult, type }) });
      if (!response.ok) { const data = await response.json().catch(() => ({})); throw new Error(data.error || "Failed to send email"); }
      setEmailSent(true);
      toast.success(`${type === "pass" ? "Pass" : "Fail"} email sent to ${candidateEmail}`);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Failed to send email"); setEmailSent(true); }
    finally { setEmailSending(false); }
  }, [candidateEmail, candidateName, position, interviewResult]);

  const resetInterview = useCallback(() => {
    setMessages([]); setInput(""); setCurrentStageIndex(0); setQuestionIndex(0);
    setCandidateName(""); setCandidateEmail(""); setPosition(""); setShowSetup(true);
    setInterviewResult(null); setEmailSent(false); setMakeTriggered(false); setMakeError(null); setIsSubmittingSession(false);
    setScheduledDate(""); setScheduledTime("");
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
                <p className="text-xs text-slate-500">AI-powered interviews for domestic worker hiring {aiEnabled && <span className="text-emerald-600 font-semibold">• Kimi K2.6</span>}</p>
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
                      <label className="block"><span className="text-xs font-semibold text-slate-600">Candidate Name</span><Input className="mt-1.5" value={candidateName} onChange={(e) => setCandidateName(e.target.value)} placeholder="e.g. Maria Santos" /></label>
                      <label className="block"><span className="text-xs font-semibold text-slate-600">Candidate Email</span><Input className="mt-1.5" type="email" value={candidateEmail} onChange={(e) => setCandidateEmail(e.target.value)} placeholder="candidate@email.com" /></label>
                      <label className="block"><span className="text-xs font-semibold text-slate-600">Position</span><Input className="mt-1.5" value={position} onChange={(e) => setPosition(e.target.value)} placeholder="e.g. Domestic Worker (Childcare)" /></label>
                    </div>

                    {/* Schedule Interview Section */}
                    <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-blue-600" />
                        <p className="text-xs font-bold text-blue-700 uppercase tracking-wide">Schedule Interview</p>
                      </div>
                      <p className="text-[11px] text-slate-500">Optionally schedule a future interview and send an invitation email to the candidate.</p>
                      <div className="grid grid-cols-2 gap-2">
                        <label className="block"><span className="text-[11px] font-semibold text-slate-600">Date</span><Input className="mt-1" type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} min={new Date().toISOString().split("T")[0]} /></label>
                        <label className="block"><span className="text-[11px] font-semibold text-slate-600">Time</span><Input className="mt-1" type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} /></label>
                      </div>
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
                        <Bot className="h-3 w-3" /> AI-powered interview (Kimi K2.6)
                      </label>
                    </div>
                    <Button onClick={() => void startInterview()} className="w-full bg-violet-600 hover:bg-violet-700" size="lg">
                      <Sparkles className="mr-2 h-4 w-4" /> Start Interview Now
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
                          <div><h3 className="text-base font-bold text-slate-900">Interview Result</h3><p className="text-sm text-slate-500">Score: {interviewResult.overallScore}/100 — <span className={`font-bold ${interviewResult.recommendation === "pass" ? "text-emerald-600" : interviewResult.recommendation === "borderline" ? "text-amber-600" : "text-rose-600"}`}>{interviewResult.recommendation.toUpperCase()}</span></p></div>
                        </div>
                        <p className="text-sm leading-relaxed text-slate-700">{interviewResult.summary}</p>
                        {interviewResult.strengths.length > 0 && (<div className="mt-3"><p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Strengths</p><ul className="mt-1 space-y-1">{interviewResult.strengths.map((s, i) => (<li key={i} className="flex items-start gap-2 text-sm text-slate-700"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" /> {s}</li>))}</ul></div>)}
                        {interviewResult.weaknesses.length > 0 && (<div className="mt-3"><p className="text-xs font-bold uppercase tracking-wide text-rose-700">Areas for Improvement</p><ul className="mt-1 space-y-1">{interviewResult.weaknesses.map((w, i) => (<li key={i} className="flex items-start gap-2 text-sm text-slate-700"><XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-500" /> {w}</li>))}</ul></div>)}
                        <div className="mt-4 border-t border-violet-200 pt-3">
                          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-600">Workflow Automation</p>
                          {isSubmittingSession ? (<div className="flex items-center gap-2 text-xs text-slate-500"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving & triggering Make.com...</div>) : makeTriggered ? (<div className="flex items-center gap-2 text-xs font-semibold text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" /> Make.com triggered</div>) : makeError ? (<div className="flex items-center gap-2 text-xs font-semibold text-amber-600"><AlertCircle className="h-3.5 w-3.5" /> Make.com failed: {makeError}</div>) : null}
                        </div>
                        <div className="mt-3 border-t border-violet-200 pt-4">
                          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-600">Send Result Email</p>
                          <div className="flex gap-2">
                            <Button onClick={() => void sendResultEmail("pass")} disabled={emailSending || emailSent} className="bg-emerald-600 hover:bg-emerald-700" size="sm"><Mail className="mr-1.5 h-3.5 w-3.5" />{emailSent ? "Sent" : "Pass Email"}</Button>
                            <Button onClick={() => void sendResultEmail("fail")} disabled={emailSending || emailSent} variant="outline" className="border-rose-200 text-rose-700 hover:bg-rose-50" size="sm"><Mail className="mr-1.5 h-3.5 w-3.5" /> Fail Email</Button>
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
                  <li className="flex gap-2"><span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[9px] font-bold text-violet-700">1</span>Enter candidate details</li>
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
                { label: "In Progress", value: sessions.filter((s) => s.status === "in_progress").length, icon: Clock, color: "text-blue-600 bg-blue-50" },
                { label: "Passed", value: sessions.filter((s) => s.status === "passed").length, icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50" },
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
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600"><Mail className="h-3 w-3" /> Invitation sent</span>
                        <Button size="sm" variant="outline" onClick={() => { setView("interview"); resetInterview(); setCandidateName(sched.candidateName); setCandidateEmail(sched.candidateEmail); setPosition(sched.position); }}><ChevronRight className="h-3.5 w-3.5" /> Start</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Past Interviews */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="text-sm font-bold text-slate-900">All Interviews</h2>
                <p className="text-xs text-slate-500">Manage candidates and send pass/fail emails</p>
              </div>
              <div className="divide-y divide-slate-100">
                {sessions.map((session) => (
                  <div key={session.id} className="flex items-center gap-4 p-4 hover:bg-slate-50/50">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 text-sm font-bold text-white">{session.candidateName.charAt(0)}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2"><p className="text-sm font-semibold text-slate-900">{session.candidateName}</p>{statusBadge(session.status)}</div>
                      <p className="text-xs text-slate-500">{session.position} · {session.candidateEmail}</p>
                      {session.result && (<div className="mt-1 flex items-center gap-2"><span className={`text-xs font-bold ${session.result.recommendation === "pass" ? "text-emerald-600" : session.result.recommendation === "borderline" ? "text-amber-600" : "text-rose-600"}`}>Score: {session.result.overallScore}/100</span>{session.result.emailSent && <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600"><Mail className="h-3 w-3" /> Email sent</span>}</div>)}
                    </div>
                    <div className="flex items-center gap-2">
                      {session.status === "in_progress" && (<Button size="sm" variant="outline" onClick={() => { setView("interview"); resetInterview(); setCandidateName(session.candidateName); setCandidateEmail(session.candidateEmail); setPosition(session.position); setShowSetup(false); }}><ChevronRight className="h-3.5 w-3.5" /> Resume</Button>)}
                      {session.result && !session.result.emailSent && (<Button size="sm" className={session.result.recommendation === "pass" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"}><Mail className="h-3.5 w-3.5" /> Send {session.result.recommendation === "pass" ? "Pass" : "Fail"}</Button>)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AiHrInterviewerPage;