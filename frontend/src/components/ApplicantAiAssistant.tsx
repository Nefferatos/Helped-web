import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";
import {
  Bot,
  Send,
  Sparkles,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ClipboardCheck,
  Lightbulb,
  TrendingUp,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ApplicantAiAssistantProps {
  /** Current form state — used for pre-submission readiness analysis */
  form: Record<string, string>;
  /** Current active step (0-indexed) */
  activeStep: number;
  /** Total number of steps */
  totalSteps: number;
  /** Whether the form has been submitted (post-submission mode) */
  isSubmitted: boolean;
  /** Application ID after submission (for screen-applicant-public endpoint) */
  applicationId?: string;
  /** Applicant access token after submission */
  applicantAccessToken?: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  meta?: {
    readinessScore?: number;
    missingFields?: string[];
    tips?: string[];
    isScreening?: boolean;
  };
}

// ─── Form Analysis Logic ─────────────────────────────────────────────────────

const REQUIRED_FIELDS: Array<{ key: string; label: string; step: number }> = [
  { key: "fullName", label: "Full name", step: 1 },
  { key: "email", label: "Email", step: 1 },
  { key: "contactNumber", label: "WhatsApp / contact number", step: 1 },
  { key: "nationality", label: "Nationality", step: 1 },
  { key: "dateOfBirth", label: "Date of birth", step: 1 },
  { key: "address", label: "Residential address", step: 1 },
  { key: "medicalConditions", label: "Medical conditions", step: 2 },
  { key: "restDayPreference", label: "Rest day preference", step: 2 },
  { key: "foodPreference", label: "Food preference", step: 2 },
  { key: "yearsOfExperience", label: "Years of experience", step: 3 },
  { key: "languageSkills", label: "Languages spoken", step: 3 },
  { key: "cookingSkills", label: "Cooking skills", step: 3 },
  { key: "availableDate", label: "Available date", step: 4 },
  { key: "expectedSalary", label: "Expected salary", step: 4 },
  { key: "coverNote", label: "Cover note", step: 4 },
];

const RECOMMENDED_FIELDS: Array<{ key: string; label: string; step: number }> = [
  { key: "previousCountriesWorkedIn", label: "Previous countries worked in", step: 3 },
  { key: "certifications", label: "Certifications", step: 4 },
  { key: "trainingRecords", label: "Training records", step: 4 },
  { key: "employmentPreference", label: "Employment preference", step: 4 },
  { key: "religion", label: "Religion", step: 1 },
  { key: "educationLevel", label: "Education level", step: 1 },
  { key: "maritalStatus", label: "Marital status", step: 1 },
  { key: "heightCm", label: "Height", step: 1 },
  { key: "weightKg", label: "Weight", step: 1 },
  { key: "placeOfBirth", label: "Place of birth", step: 1 },
  { key: "homeCountryContactNumber", label: "Home country contact number", step: 1 },
  { key: "repatriationPort", label: "Repatriation port", step: 1 },
  { key: "allergies", label: "Allergies", step: 2 },
  { key: "dietaryRestrictions", label: "Dietary restrictions", step: 2 },
  { key: "physicalDisabilities", label: "Physical disabilities", step: 2 },
  { key: "sgInfantsChildrenAssessment", label: "SG childcare assessment", step: 3 },
  { key: "sgElderlyAssessment", label: "SG elderly assessment", step: 3 },
  { key: "sgHouseworkAssessment", label: "SG housework assessment", step: 3 },
  { key: "sgCookingAssessment", label: "SG cooking assessment", step: 3 },
  { key: "sgLanguageAssessment", label: "SG language assessment", step: 3 },
  { key: "overseasInfantsChildrenAssessment", label: "Overseas childcare assessment", step: 3 },
  { key: "overseasElderlyAssessment", label: "Overseas elderly assessment", step: 3 },
  { key: "overseasHouseworkAssessment", label: "Overseas housework assessment", step: 3 },
  { key: "overseasCookingAssessment", label: "Overseas cooking assessment", step: 3 },
  { key: "feedbackEmployer1", label: "Feedback from employer 1", step: 3 },
  { key: "feedbackEmployer2", label: "Feedback from employer 2", step: 3 },
];

const SKILL_RATING_FIELDS = [
  "childcareExperience",
  "newbornCareExperience",
  "elderlyCareExperience",
  "disabledCareExperience",
  "housekeepingExperience",
  "petCareExperience",
];

interface FormAnalysis {
  readinessScore: number;
  missingRequired: Array<{ key: string; label: string; step: number }>;
  missingRecommended: Array<{ key: string; label: string; step: number }>;
  completedSkills: number;
  totalSkills: number;
  tips: string[];
}

const analyzeForm = (form: Record<string, string>): FormAnalysis => {
  const missingRequired = REQUIRED_FIELDS.filter(
    (f) => !form[f.key]?.trim(),
  );
  const missingRecommended = RECOMMENDED_FIELDS.filter(
    (f) => !form[f.key]?.trim(),
  );

  const completedSkills = SKILL_RATING_FIELDS.filter(
    (k) => Number(form[k] || 0) > 0,
  ).length;

  // Readiness score: weighted calculation
  const requiredWeight = 60;
  const recommendedWeight = 25;
  const skillsWeight = 15;

  const requiredScore =
    ((REQUIRED_FIELDS.length - missingRequired.length) / REQUIRED_FIELDS.length) * requiredWeight;
  const recommendedScore =
    ((RECOMMENDED_FIELDS.length - missingRecommended.length) / RECOMMENDED_FIELDS.length) * recommendedWeight;
  const skillsScore = (completedSkills / SKILL_RATING_FIELDS.length) * skillsWeight;

  const readinessScore = Math.round(requiredScore + recommendedScore + skillsScore);

  // Generate contextual tips
  const tips: string[] = [];

  if (missingRequired.length > 0) {
    const stepGroups = new Map<number, string[]>();
    missingRequired.forEach((f) => {
      const existing = stepGroups.get(f.step) ?? [];
      existing.push(f.label);
      stepGroups.set(f.step, existing);
    });
    const stepNames = ["Start", "Biodata", "Health & Prefs", "Skills & History", "Attachments"];
    stepGroups.forEach((fields, step) => {
      tips.push(`Complete in Step ${step} (${stepNames[step] || "Form"}): ${fields.join(", ")}`);
    });
  }

  if (completedSkills < SKILL_RATING_FIELDS.length) {
    const unratedSkills = SKILL_RATING_FIELDS.filter((k) => Number(form[k] || 0) === 0);
    const skillLabels: Record<string, string> = {
      childcareExperience: "Childcare",
      newbornCareExperience: "Newborn care",
      elderlyCareExperience: "Elderly care",
      disabledCareExperience: "Disabled care",
      housekeepingExperience: "Housekeeping",
      petCareExperience: "Pet care",
    };
    tips.push(
      `Rate your skills: ${unratedSkills.map((k) => skillLabels[k]).join(", ")} — even a 1-star rating helps recruiters assess you.`,
    );
  }

  if (!form.coverNote?.trim()) {
    tips.push("Add a cover note — a short personal introduction makes your application stand out.");
  }

  if (!form.expectedSalary?.trim()) {
    tips.push("Set an expected salary — agencies use this to match you with suitable employers.");
  }

  if (!form.availableDate?.trim()) {
    tips.push("Add your available date — agencies need to know when you can start.");
  }

  if (form.yearsOfExperience?.trim() && Number(form.yearsOfExperience) > 0 && !form.previousCountriesWorkedIn?.trim()) {
    tips.push("List previous countries you've worked in — this helps with regional preference matching.");
  }

  if (missingRecommended.length > 0 && missingRecommended.length <= 5) {
    tips.push(`Consider adding: ${missingRecommended.map((f) => f.label).join(", ")}.`);
  } else if (missingRecommended.length > 5) {
    tips.push(`${missingRecommended.length} recommended fields are still empty — completing these improves your profile visibility.`);
  }

  return {
    readinessScore,
    missingRequired,
    missingRecommended,
    completedSkills,
    totalSkills: SKILL_RATING_FIELDS.length,
    tips,
  };
};

// ─── AI Screening (post-submission) ──────────────────────────────────────────

interface ScreeningResponse {
  response?: string;
  structured?: Record<string, unknown>;
  agent?: { id: string; name: string };
  conversationId?: string;
}

const callApplicantScreening = async (
  applicationId: string,
  applicantAccessToken: string,
  message: string,
  history?: Array<{ role: string; content: string }>,
): Promise<ScreeningResponse> => {
  const response = await fetch("/api/ai/screen-applicant-public", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      applicationId,
      applicantAccessToken,
      message,
      history,
    }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `Screening failed (${response.status})`);
  }

  return response.json();
};

// ─── Component ────────────────────────────────────────────────────────────────

const QUICK_ACTIONS_PRE = [
  { label: "Check readiness", icon: ClipboardCheck, prompt: "Check my application readiness and tell me what's missing." },
  { label: "Improvement tips", icon: Lightbulb, prompt: "What can I do to improve my application and stand out?" },
  { label: "Next steps", icon: TrendingUp, prompt: "What should I focus on next to complete my application?" },
];

const QUICK_ACTIONS_POST = [
  { label: "Screening report", icon: ClipboardCheck, prompt: "Review my application readiness and explain missing requirements." },
  { label: "My strengths", icon: TrendingUp, prompt: "What are my strengths based on my application?" },
  { label: "What to improve", icon: Lightbulb, prompt: "What should I improve or add to my application?" },
];

const ApplicantAiAssistant = ({
  form,
  activeStep,
  totalSteps,
  isSubmitted,
  applicationId,
  applicantAccessToken,
}: ApplicantAiAssistantProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const analysis = useMemo(() => analyzeForm(form), [form]);

  const quickActions = isSubmitted ? QUICK_ACTIONS_POST : QUICK_ACTIONS_PRE;

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isThinking]);

  // Welcome message when opened for the first time
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcome = isSubmitted
        ? "Hello! I'm your AI HR assistant. I've reviewed your submitted application. Ask me about your screening results, strengths, or what to improve."
        : `Hello! I'm your AI HR assistant. I can help you complete a stronger application. Your current readiness is ${analysis.readinessScore}%. Ask me what's missing or how to improve!`;
      setMessages([
        {
          id: `welcome-${Date.now()}`,
          role: "assistant",
          content: welcome,
          meta: { readinessScore: analysis.readinessScore },
        },
      ]);
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const addMessage = useCallback((role: "user" | "assistant", content: string, meta?: ChatMessage["meta"]) => {
    setMessages((prev) => [
      ...prev,
      { id: `${role}-${Date.now()}-${Math.random()}`, role, content, meta },
    ]);
  }, []);

  const handlePreSubmissionQuery = useCallback(
    (userMessage: string): string => {
      const lower = userMessage.toLowerCase();
      const stepNames = ["Start", "Biodata", "Health & Prefs", "Skills & History", "Attachments"];
      const name = (form.fullName || "").trim().split(/\s+/)[0] || "there";
      const score = analysis.readinessScore;

      // Greetings
      if (/^(hi|hello|hey|good\s?(morning|afternoon|evening)|howdy)\b/.test(lower)) {
        if (score >= 80) {
          return `Hey ${name}! 😊 Great news — your application is looking strong at ${score}% ready. Is there anything specific you'd like help with, or shall I review what's left?`;
        } else if (score >= 50) {
          return `Hi ${name}! Welcome. I'm here to help you put together a great application. You're at ${score}% right now — we can get that up quickly. Want me to show you what to focus on?`;
        }
        return `Hi ${name}! 👋 I'm your application assistant. I'll guide you through each step to make sure your profile stands out to employers. You're at ${score}% — let's work through it together. Where would you like to start?`;
      }

      // Thank you
      if (/thank|thanks|thx|appreciate/.test(lower)) {
        return `You're welcome, ${name}! 😊 I'm right here if you need anything else. Good luck with your application — you've got this!`;
      }

      // Readiness check
      if (lower.includes("readiness") || lower.includes("ready") || lower.includes("missing") || lower.includes("incomplete") || lower.includes("check") || lower.includes("progress") || lower.includes("how.*doing") || lower.includes("how.*going") || lower.includes("status")) {
        const lines: string[] = [];

        if (score >= 90) {
          lines.push(`Amazing work, ${name}! Your application is ${score}% ready — almost there! 🎉`);
        } else if (score >= 70) {
          lines.push(`Good progress, ${name}! You're at ${score}% — just a few more things to fill in.`);
        } else if (score >= 50) {
          lines.push(`You're getting there, ${name}! Currently at ${score}%. Let me walk you through what's still needed.`);
        } else {
          lines.push(`No worries, ${name} — we all start somewhere! You're at ${score}% and I'll help you get to 100%. Here's what we need:`);
        }

        if (analysis.missingRequired.length === 0) {
          lines.push("All the required fields are filled in — that's the hard part done!");
        } else {
          const stepGroups = new Map<number, string[]>();
          analysis.missingRequired.forEach((f) => {
            const existing = stepGroups.get(f.step) ?? [];
            existing.push(f.label);
            stepGroups.set(f.step, existing);
          });
          lines.push(`\nWe still need ${analysis.missingRequired.length} required field${analysis.missingRequired.length > 1 ? "s" : ""}:`);
          stepGroups.forEach((fields, step) => {
            lines.push(`→ ${stepNames[step]}: ${fields.join(", ")}`);
          });
        }

        if (analysis.missingRecommended.length > 0) {
          lines.push(`\nThere are also ${analysis.missingRecommended.length} optional fields that would make your profile stronger — but we can come back to those.`);
        }

        if (analysis.completedSkills < analysis.totalSkills) {
          lines.push(`\nYou've rated ${analysis.completedSkills} of ${analysis.totalSkills} skill areas. Rating your skills helps employers see what you're best at.`);
        }

        return lines.join("\n");
      }

      // Improvement tips
      if (lower.includes("improve") || lower.includes("tip") || lower.includes("advice") || lower.includes("stand out") || lower.includes("better") || lower.includes("strengthen") || lower.includes("help")) {
        if (analysis.tips.length === 0) {
          return `Honestly, ${name}, your application is looking really solid! 💪 A couple of things that can make it even better:\n\n• Make your cover note personal — mention your experience and why you enjoy this work\n• Double-check that your skill ratings truly reflect your abilities\n\nYou're in great shape to submit!`;
        }
        const personalizedTips = analysis.tips.slice(0, 4).map((t, i) => `${i + 1}. ${t}`).join("\n");
        return `Here's what I'd focus on to make your application stand out, ${name}:\n\n${personalizedTips}\n\nThese small improvements can make a big difference to employers reviewing your profile.`;
      }

      // Next steps / what to do
      if (lower.includes("next") || lower.includes("focus") || lower.includes("should i") || lower.includes("what to do") || lower.includes("where do i") || lower.includes("how do i") || lower.includes("what now") || lower.includes("start")) {
        if (analysis.missingRequired.length > 0) {
          const nextStep = Math.min(...analysis.missingRequired.map((f) => f.step));
          const fieldsAtStep = analysis.missingRequired.filter((f) => f.step === nextStep);
          return `Great question, ${name}! Right now, I'd suggest focusing on the "${stepNames[nextStep]}" section. You need to fill in: ${fieldsAtStep.map((f) => f.label).join(", ")}.\n\nYou're on step ${activeStep + 1} of ${totalSteps}. Once you complete these, you'll be much closer to a strong application!`;
        }
        if (analysis.missingRecommended.length > 0) {
          return `Nice work, ${name}! All the required fields are done. ✅\n\nTo really make your profile shine, consider adding some of the ${analysis.missingRecommended.length} optional details — things like previous countries worked in, certifications, or training records. These help employers see the full picture of your experience.`;
        }
        if (analysis.completedSkills < analysis.totalSkills) {
          return `Almost there, ${name}! Your info is complete. The last thing is rating your remaining skills — even a 1-star rating helps. Would you like to do that now?`;
        }
        return `You're all set, ${name}! 🎉 Your application looks complete and ready to submit. Go ahead and hit that submit button — I'll be here if you need anything after!`;
      }

      // Current step guidance
      if (lower.includes("step") || lower.includes("current") || lower.includes("where am i") || lower.includes("which page") || lower.includes("where.*i")) {
        const stepIncomplete = analysis.missingRequired.filter((f) => f.step === activeStep);
        const stepLabel = stepNames[activeStep] || "Form";
        if (stepIncomplete.length > 0) {
          return `You're on Step ${activeStep + 1} — "${stepLabel}". There ${stepIncomplete.length === 1 ? "is" : "are"} ${stepIncomplete.length} required field${stepIncomplete.length > 1 ? "s" : ""} still needed on this step: ${stepIncomplete.map((f) => f.label).join(", ")}.\n\nYour overall progress is ${score}%. You're doing well — keep going!`;
        }
        return `You're on Step ${activeStep + 1} — "${stepLabel}". Good news: all required fields here are filled in! ✅\n\nYour overall progress is ${score}%. You can move to the next step or add more details here if you'd like.`;
      }

      // Skills
      if (lower.includes("skill") || lower.includes("rating") || lower.includes("experience") || lower.includes("rate")) {
        const skillLabels: Record<string, string> = {
          childcareExperience: "Childcare",
          newbornCareExperience: "Newborn care",
          elderlyCareExperience: "Elderly care",
          disabledCareExperience: "Disabled care",
          housekeepingExperience: "Housekeeping",
          petCareExperience: "Pet care",
        };
        const rated = SKILL_RATING_FIELDS.filter((k) => Number(form[k] || 0) > 0);
        const unrated = SKILL_RATING_FIELDS.filter((k) => Number(form[k] || 0) === 0);
        const lines: string[] = [];

        if (rated.length === SKILL_RATING_FIELDS.length) {
          return `Great news, ${name}! You've rated all ${SKILL_RATING_FIELDS.length} skill areas. This gives employers a clear picture of your strengths. 💪`;
        }

        if (rated.length > 0) {
          lines.push(`So far you've rated ${rated.length} of ${SKILL_RATING_FIELDS.length} skills:`);
          lines.push(rated.map((k) => `  ${skillLabels[k]}: ${form[k]}/5 ⭐`).join("\n"));
        } else {
          lines.push(`You haven't rated any skills yet, ${name}. This is a great way to show employers what you're good at!`);
        }

        if (unrated.length > 0) {
          lines.push(`\nStill need ratings for: ${unrated.map((k) => skillLabels[k]).join(", ")}`);
          lines.push("Don't worry about being perfect — even a 1-star rating is better than leaving it blank. It shows you have some experience in that area.");
        }

        return lines.join("\n");
      }

      // Cover note
      if (lower.includes("cover") || lower.includes("note") || lower.includes("introduction") || lower.includes("letter") || lower.includes("bio")) {
        if (form.coverNote?.trim()) {
          return `I can see you've written a cover note — that's great, ${name}! A strong cover note mentions your relevant experience, what kind of employer you're looking for, and what makes you a reliable helper. If you'd like, you can review and polish it before submitting.`;
        }
        return `A cover note is one of the best ways to stand out, ${name}! It's your chance to introduce yourself to employers in your own words. Try to include:\n\n• A brief introduction and your background\n• What you're good at and enjoy doing\n• Why you'd be a great helper for a family\n\nEven 2-3 sentences can make a real difference!`;
      }

      // Salary
      if (lower.includes("salary") || lower.includes("pay") || lower.includes("wage") || lower.includes("money") || lower.includes("how much") || lower.includes("compensation")) {
        if (form.expectedSalary?.trim()) {
          return `You've set your expected salary at $${form.expectedSalary}/month. That looks good! Employers will use this to see if you're a match for their budget. You can always adjust it if needed.`;
        }
        return `Setting an expected salary helps agencies match you with the right employers, ${name}. Think about what's fair for your experience level and the type of work involved. You can always update it later — it's not set in stone.`;
      }

      // Help / general questions
      if (lower.includes("what can you") || lower.includes("what do you") || lower.includes("who are you") || lower.includes("how can you help") || lower.includes("what are you")) {
        return `I'm your application assistant, ${name}! Think of me as your personal guide through the application process. I can:\n\n• Check how complete your application is\n• Suggest what to fill in next\n• Give tips to make your profile stand out\n• Help with skill ratings and your cover note\n\nJust ask me anything — I'm here to help! 😊`;
      }

      // Default — warm, contextual response
      if (score >= 80) {
        return `I'm here to help, ${name}! Your application is looking strong at ${score}%. You can ask me about your progress, what to improve, or what to focus on next. What's on your mind?`;
      } else if (score >= 50) {
        return `Hey ${name}! I'm here to help you complete your application. You're at ${score}% right now. Want me to show you what's missing, or give you tips to improve? Just ask!`;
      }
      return `Hi ${name}! 👋 I'm here to help you with your application. You can ask me things like:\n\n• "What's missing?" — I'll check your progress\n• "What should I do next?" — I'll guide you step by step\n• "How can I improve?" — I'll give you personalized tips\n\nWhat would you like help with?`;
    },
    [analysis, activeStep, totalSteps, form],
  );

  const handleSubmit = useCallback(
    async (messageText?: string) => {
      const userMessage = (messageText ?? input).trim();
      if (!userMessage || isThinking) return;

      setInput("");
      addMessage("user", userMessage);
      setIsThinking(true);

      try {
        if (isSubmitted && applicationId && applicantAccessToken) {
          // Post-submission: use the AI screening endpoint
          const history = messages
            .filter((m) => m.role === "user" || m.role === "assistant")
            .slice(-6)
            .map((m) => ({ role: m.role, content: m.content }));

          const result = await callApplicantScreening(
            applicationId,
            applicantAccessToken,
            userMessage,
            history,
          );

          addMessage("assistant", result.response || "I couldn't generate a response. Please try again.", {
            isScreening: true,
          });
        } else {
          // Pre-submission: local analysis
          await new Promise((r) => setTimeout(r, 600 + Math.random() * 600));
          const response = handlePreSubmissionQuery(userMessage);
          addMessage("assistant", response, {
            readinessScore: analysis.readinessScore,
            missingFields: analysis.missingRequired.map((f) => f.label),
            tips: analysis.tips,
          });
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Something went wrong. Please try again.";
        addMessage("assistant", `I encountered an error: ${errorMsg}`);
        toast.error(errorMsg);
      } finally {
        setIsThinking(false);
      }
    },
    [input, isThinking, isSubmitted, applicationId, applicantAccessToken, messages, addMessage, analysis, handlePreSubmissionQuery],
  );

  const readinessColor = analysis.readinessScore >= 80
    ? "text-emerald-600"
    : analysis.readinessScore >= 50
      ? "text-amber-600"
      : "text-rose-600";

  const readinessBg = analysis.readinessScore >= 80
    ? "bg-emerald-50 border-emerald-200"
    : analysis.readinessScore >= 50
      ? "bg-amber-50 border-amber-200"
      : "bg-rose-50 border-rose-200";

  return (
    <>
      {/* Floating button */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/30 transition-all hover:scale-105 hover:shadow-xl active:scale-95"
          aria-label="Open AI HR Assistant"
        >
          <Bot className="h-6 w-6" />
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white ring-2 ring-white">
            {analysis.readinessScore}
          </span>
        </button>
      )}

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 flex h-[520px] w-[calc(100vw-3rem)] max-w-[400px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">AI HR Assistant</h3>
                <p className="text-[11px] text-violet-100">
                  {isSubmitted ? "Application screening" : "Application guidance"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-md p-1.5 text-violet-100 transition hover:bg-white/10"
              aria-label="Close assistant"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Readiness bar (pre-submission only) */}
          {!isSubmitted && (
            <div className={`flex items-center gap-2 border-b px-4 py-2.5 ${readinessBg}`}>
              <TrendingUp className={`h-4 w-4 shrink-0 ${readinessColor}`} />
              <div className="flex-1">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-600">Readiness</p>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      analysis.readinessScore >= 80 ? "bg-emerald-500" : analysis.readinessScore >= 50 ? "bg-amber-500" : "bg-rose-500"
                    }`}
                    style={{ width: `${analysis.readinessScore}%` }}
                  />
                </div>
              </div>
              <span className={`text-sm font-bold tabular-nums ${readinessColor}`}>{analysis.readinessScore}%</span>
            </div>
          )}

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((msg) => {
              const isUser = msg.role === "user";
              return (
                <div key={msg.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] ${isUser ? "items-end" : "items-start"} flex flex-col gap-1`}>
                    <div
                      className={`rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap ${
                        isUser
                          ? "bg-violet-600 text-white rounded-br-md"
                          : "bg-slate-50 border border-slate-200 text-slate-800 rounded-bl-md"
                      }`}
                    >
                      {msg.content}
                    </div>
                    {msg.meta && !isUser && (
                      <div className="flex flex-wrap items-center gap-1.5 pl-1">
                        {msg.meta.readinessScore !== undefined && (
                          <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${readinessBg} ${readinessColor}`}>
                            <Sparkles className="h-2.5 w-2.5" /> {msg.meta.readinessScore}% ready
                          </span>
                        )}
                        {msg.meta.isScreening && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-1.5 py-0.5 text-[9px] font-bold text-indigo-700">
                            <CheckCircle2 className="h-2.5 w-2.5" /> AI Screened
                          </span>
                        )}
                        {msg.meta.missingFields && msg.meta.missingFields.length > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-1.5 py-0.5 text-[9px] font-bold text-rose-700">
                            <AlertCircle className="h-2.5 w-2.5" /> {msg.meta.missingFields.length} missing
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {isThinking && (
              <div className="flex items-center gap-2 pl-2">
                <Loader2 className="h-4 w-4 animate-spin text-violet-500" />
                <span className="text-[12px] text-slate-500">AI is analyzing...</span>
              </div>
            )}
          </div>

          {/* Quick actions */}
          {messages.length <= 1 && !isThinking && (
            <div className="flex flex-wrap gap-1.5 border-t border-slate-100 px-3 py-2.5">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.label}
                    type="button"
                    onClick={() => void handleSubmit(action.prompt)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1.5 text-[11px] font-semibold text-violet-700 transition hover:bg-violet-100"
                  >
                    <Icon className="h-3 w-3" />
                    {action.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Input */}
          <div className="border-t border-slate-100 bg-slate-50/50 p-3">
            <form
              onSubmit={(e: FormEvent<HTMLFormElement>) => {
                e.preventDefault();
                void handleSubmit();
              }}
              className="flex gap-2"
            >
              <Input
                value={input}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
                placeholder={isSubmitted ? "Ask about your screening..." : "Ask for help with your application..."}
                className="flex-1 text-[13px]"
                disabled={isThinking}
              />
              <Button
                type="submit"
                size="sm"
                disabled={isThinking || !input.trim()}
                className="gap-1.5 bg-violet-600 hover:bg-violet-700"
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default ApplicantAiAssistant;