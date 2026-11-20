import { useEffect, useRef, useState, type FormEvent } from "react";
import { Loader2, Send, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createFdwConversationId, sendFdwChatMessage } from "@/lib/fdwChatbot";
import { submitMaidReferral } from "@/lib/ats";

type ChatMessage = { id: string; role: "user" | "assistant"; content: string };
type FriendReferral = {
  referrerName: string;
  referrerPhone: string;
  maidName: string;
  maidPhone: string;
  maidNationality: string;
  relationship: string;
  notes: string;
};
type Step = "referrer-name" | "referrer-phone" | "friend-name" | "friend-phone" | "nationality" | "relationship" | "consent" | "done";

const initialReferral = (): FriendReferral => ({ referrerName: "", referrerPhone: "", maidName: "", maidPhone: "", maidNationality: "", relationship: "", notes: "" });

const FdwApplicationChatbot = ({ applicantName = "", applicantPhone = "" }: { applicantName?: string; applicantPhone?: string }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "welcome", role: "assistant", content: "Hi! I can answer questions about the FDW application and documents. You can also use the button below to refer a friend." },
  ]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [step, setStep] = useState<Step | null>(null);
  const [referral, setReferral] = useState<FriendReferral>(initialReferral);
  const conversationId = useRef(createFdwConversationId());
  const messagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  const assistantMessage = (content: string) => setMessages((current) => [...current, { id: `assistant-${Date.now()}`, role: "assistant", content }]);

  const startFriendReferral = (displayMessage = "I have a friend to refer", appendMessage = true) => {
    const details = { ...initialReferral(), referrerName: applicantName.trim(), referrerPhone: applicantPhone.trim() };
    setReferral(details);
    if (appendMessage) setMessages((current) => [...current, { id: `user-${Date.now()}`, role: "user", content: displayMessage }]);
    if (!details.referrerName) {
      setStep("referrer-name"); assistantMessage("Sure, I can help you refer a friend. First, what is your full name?");
    } else if (!details.referrerPhone) {
      setStep("referrer-phone"); assistantMessage(`Thanks, ${details.referrerName}. What phone or WhatsApp number can the agency use to contact you about this referral?`);
    } else {
      setStep("friend-name"); assistantMessage("Great. What is your friend's full name?");
    }
  };

  const handleReferralAnswer = async (message: string) => {
    if (!step) return;
    if (step === "consent") {
      if (/^(yes|i agree|i have permission|i confirm)$/i.test(message.trim())) {
        setThinking(true);
        try {
          await submitMaidReferral({ ...referral, consent: true });
          setStep("done");
          assistantMessage("Thanks! Your friend's referral has been sent to the agency for review.");
        } catch (error) {
          assistantMessage(error instanceof Error ? error.message : "I couldn't submit the referral right now. Please try again later.");
        } finally { setThinking(false); }
      } else {
        setStep(null);
        assistantMessage("No problem. I won't share the referral. You can ask me anything about the application, or choose “Refer a friend” whenever you're ready.");
      }
      return;
    }

    const updated = { ...referral };
    let next: Step | null = null;
    let prompt = "";
    switch (step) {
      case "referrer-name": updated.referrerName = message; next = "referrer-phone"; prompt = "What phone or WhatsApp number can the agency use to contact you about this referral?"; break;
      case "referrer-phone": updated.referrerPhone = message; next = "friend-name"; prompt = "What is your friend's full name?"; break;
      case "friend-name": updated.maidName = message; next = "friend-phone"; prompt = "What is your friend's phone number? You can type “skip” if you don't have it."; break;
      case "friend-phone": updated.maidPhone = /^skip$/i.test(message) ? "" : message; next = "nationality"; prompt = "Do you know your friend's nationality? You can type “skip”."; break;
      case "nationality": updated.maidNationality = /^skip$/i.test(message) ? "" : message; next = "relationship"; prompt = "How do you know your friend? You can type “skip”."; break;
      case "relationship": updated.relationship = /^skip$/i.test(message) ? "" : message; next = "consent"; prompt = "Before I send this to the agency, please confirm you have your friend's permission to share their contact details. Reply “Yes, I have permission” to submit. You can say no to cancel."; break;
    }
    setReferral(updated);
    setStep(next);
    assistantMessage(prompt);
  };

  const send = async (rawMessage: string) => {
    const message = rawMessage.trim();
    if (!message || thinking) return;
    const nextMessages = [...messages, { id: `user-${Date.now()}`, role: "user" as const, content: message }];
    setMessages(nextMessages);
    setInput("");
    if (step && step !== "done") { await handleReferralAnswer(message); return; }
    if (step !== "done" && /\b(?:refer(?:ring)?|referral)\b/i.test(message) && /\b(?:friend|maid|someone|person|refer)\b/i.test(message)) {
      startFriendReferral(message, false);
      return;
    }
    setThinking(true);
    try {
      const result = await sendFdwChatMessage({
        conversationId: conversationId.current,
        message,
        mode: "apply",
        currentField: "Answer only FDW application and requirement questions. The website form handles application entry and submission. Friend referrals are handled by the separate in-chat quick action; never collect referral details, ask for a code, or say the form was updated.",
        collected: {},
        conversationHistory: nextMessages.slice(-10).map(({ role, content }) => ({ role, content })),
      });
      conversationId.current = result.conversationId;
      assistantMessage(result.reply || "I couldn't find an answer just now. Please try asking another way.");
    } catch {
      assistantMessage("I can't reach the AI assistant right now. Please try again in a moment.");
    } finally { setThinking(false); }
  };

  const submitMessage = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void send(input); };

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white">
      <div ref={messagesRef} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4" aria-live="polite">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
            <p className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-3 py-2.5 text-sm leading-5 ${message.role === "user" ? "rounded-br-md bg-emerald-700 text-white" : "rounded-bl-md bg-emerald-50 text-slate-900"}`}>{message.content}</p>
          </div>
        ))}
        {!step && <div className="flex flex-wrap gap-1.5 pl-1"><button type="button" onClick={() => startFriendReferral()} disabled={thinking} className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-50"><UserRound className="h-3 w-3" /> I have a friend to refer</button></div>}
        {thinking && <p className="px-1 text-xs text-slate-500">Assistant is replying…</p>}
      </div>
      <form onSubmit={submitMessage} className="flex shrink-0 gap-2 border-t bg-white px-3 py-3">
        <Input value={input} onChange={(event) => setInput(event.target.value)} maxLength={1200} placeholder={step === "consent" ? "Reply yes to confirm permission, or no to cancel" : step ? "Type your answer" : "Ask about requirements or documents"} aria-label="Ask the applicant assistant" disabled={thinking || step === "done"} />
        <Button type="submit" size="icon" aria-label="Send message" disabled={thinking || !input.trim() || step === "done"} className="shrink-0 bg-emerald-700 text-white hover:bg-emerald-800">{thinking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</Button>
      </form>
    </div>
  );
};

export default FdwApplicationChatbot;
