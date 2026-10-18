import { Fragment, useEffect, useRef, useState } from "react";
import { Loader2, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { submitMaidReferral } from "@/lib/ats";
import { toast } from "@/components/ui/sonner";
import referralRobotAvatar from "@/ClientPage/assets/Ai Robot Vector Art.gif";

type ReferralDraft = {
  referrerName: string;
  referrerPhone: string;
  maidName: string;
  maidPhone: string;
  maidNationality: string;
  relationship: string;
  notes: string;
};

const initialDraft: ReferralDraft = {
  referrerName: "",
  referrerPhone: "",
  maidName: "",
  maidPhone: "",
  maidNationality: "",
  relationship: "",
  notes: "",
};

const prompts: Array<{
  field: keyof ReferralDraft;
  question: string;
  placeholder: string;
  optional?: boolean;
  multiline?: boolean;
}> = [
  { field: "referrerName", question: "What is your name?", placeholder: "Your full name" },
  { field: "referrerPhone", question: "What is the best phone or WhatsApp number to reach you?", placeholder: "Your phone number" },
  { field: "maidName", question: "Who would you like to refer?", placeholder: "Maid's full name" },
  { field: "maidPhone", question: "Do you have the maid's phone number?", placeholder: "Maid's phone number", optional: true },
  { field: "maidNationality", question: "What is the maid's nationality?", placeholder: "e.g. Filipino", optional: true },
  { field: "relationship", question: "How do you know the maid?", placeholder: "e.g. Friend, relative, former colleague", optional: true },
  { field: "notes", question: "Anything else the agency should know?", placeholder: "Optional notes", optional: true, multiline: true },
];

const MaidReferralChatbot = () => {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState(initialDraft);
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const conversationRef = useRef<HTMLDivElement>(null);

  const currentPrompt = prompts[step];

  useEffect(() => {
    if (!open) return;
    const conversation = conversationRef.current;
    if (conversation) conversation.scrollTo({ top: conversation.scrollHeight, behavior: "smooth" });
  }, [open, step, submitted]);

  const continueChat = () => {
    if (!currentPrompt) return;
    const value = draft[currentPrompt.field].trim();
    if (!value && !currentPrompt.optional) {
      toast.error("Please answer this question to continue.");
      return;
    }
    setStep((current) => current + 1);
  };

  const submit = async () => {
    if (!consent) {
      toast.error("Please confirm you have permission to share the maid's contact details.");
      return;
    }
    setSubmitting(true);
    try {
      await submitMaidReferral({ ...draft, consent });
      setSubmitted(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not submit the referral. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setDraft(initialDraft);
    setConsent(false);
    setStep(0);
    setSubmitted(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-4 sm:bottom-7 sm:right-7">
      {open && (
        <section
          aria-label="Maid referral chatbot"
          className="referral-chat-enter flex h-[min(560px,calc(100dvh-14rem))] min-h-[320px] w-[min(420px,calc(100vw-2rem))] flex-col overflow-hidden rounded-[1.75rem] border-2 border-emerald-200 bg-white text-base text-slate-950 shadow-[0_24px_80px_rgba(15,60,45,0.26)]"
        >
          <header className="relative flex shrink-0 items-center justify-between overflow-hidden bg-gradient-to-br from-emerald-800 via-emerald-800 to-teal-700 px-5 py-4 text-white">
            <span aria-hidden="true" className="pointer-events-none absolute -right-8 -top-12 h-36 w-36 rounded-full border border-white/10" />
            <div className="relative flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border-2 border-white/80 bg-emerald-100 shadow-md">
                <img src={referralRobotAvatar} alt="" className="h-full w-full object-cover" />
              </span>
              <div>
                <p className="text-base font-bold">Refer a friend</p>
                <p className="flex items-center gap-1.5 text-base text-white">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                  Maid referral assistant
                </p>
              </div>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close maid referral chat" className="relative rounded-xl p-2.5 transition-colors hover:bg-white/15">
              <X className="h-4 w-4" />
            </button>
          </header>

          {!submitted && (
            <div className="shrink-0 border-b border-emerald-100 bg-white px-5 pb-3 pt-4">
              <div className="mb-2 flex items-center justify-between text-base font-semibold text-slate-900">
                <span>{currentPrompt ? "Referral details" : "Almost done"}</span>
                <span>{currentPrompt ? `${step + 1} of ${prompts.length}` : "Review"}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-emerald-100">
                <div
                  className="h-full rounded-full bg-emerald-700 transition-[width] duration-500"
                  style={{ width: `${currentPrompt ? ((step + 1) / prompts.length) * 100 : 100}%` }}
                />
              </div>
            </div>
          )}

          <div ref={conversationRef} className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-[#f3f7f6] p-4 sm:p-5">
            <div className="space-y-4">
            {submitted ? (
              <div className="referral-success-card flex min-h-full flex-col items-center justify-center space-y-4 rounded-2xl bg-emerald-50 p-7 text-center text-emerald-950">
                <span className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-white shadow-lg">
                  <img src={referralRobotAvatar} alt="" className="h-full w-full object-cover" />
                </span>
                <div className="space-y-2">
                  <p className="text-base font-bold">Referral sent!</p>
                  <p className="text-base leading-6 text-emerald-900">Thank you for referring a friend. The agency will contact you if more information is needed.</p>
                </div>
                <Button type="button" variant="outline" onClick={reset} className="mt-2 rounded-xl border-emerald-200 bg-white px-5 text-base text-emerald-950 hover:bg-emerald-100">
                  Refer another maid
                </Button>
              </div>
            ) : (
              <>
                <div className="referral-message-in flex items-end gap-2">
                  <span className="h-8 w-8 shrink-0 overflow-hidden rounded-full border border-emerald-200 bg-white"><img src={referralRobotAvatar} alt="" className="h-full w-full object-cover" /></span>
                  <div className="max-w-[84%] rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3 text-base leading-6 text-slate-950 shadow-sm">
                    Hello! I can help you refer a maid. This chat is only for maid referrals.
                  </div>
                </div>

                {prompts.slice(0, step).map((prompt) => (
                  <Fragment key={prompt.field}>
                    <div className="referral-message-in flex items-end gap-2">
                      <span className="h-8 w-8 shrink-0 overflow-hidden rounded-full border border-emerald-200 bg-white"><img src={referralRobotAvatar} alt="" className="h-full w-full object-cover" /></span>
                      <div className="max-w-[82%] rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3 text-base leading-6 text-slate-950 shadow-sm">{prompt.question}</div>
                    </div>
                    <div className="referral-message-in flex items-end justify-end gap-2">
                      <div className="max-w-[82%] break-words rounded-2xl rounded-br-md bg-emerald-800 px-4 py-3 text-base leading-6 text-white shadow-sm">{draft[prompt.field].trim() || "Skipped"}</div>
                      <span aria-label="You" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-200 text-base font-bold text-emerald-950">Y</span>
                    </div>
                  </Fragment>
                ))}

                {currentPrompt ? (
                  <div key={currentPrompt.field} className="referral-message-in space-y-3">
                    <div className="flex items-end gap-2">
                      <span className="h-8 w-8 shrink-0 overflow-hidden rounded-full border border-emerald-200 bg-white"><img src={referralRobotAvatar} alt="" className="h-full w-full object-cover" /></span>
                      <div className="max-w-[84%] rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3 text-base font-medium leading-6 text-slate-950 shadow-sm">
                      {currentPrompt.question}
                      {currentPrompt.optional && <span className="mt-1 block text-base font-normal text-slate-700">Optional — you can skip this question.</span>}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="referral-message-in space-y-4 rounded-2xl border-2 border-emerald-200 bg-white p-5 shadow-md">
                    <div>
                      <p className="text-base font-bold text-slate-900">Review your referral</p>
                      <p className="mt-1 text-base text-slate-700">Check these details before sending.</p>
                    </div>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border border-slate-200 bg-slate-100 p-4 text-base">
                      <div><dt className="text-base text-slate-700">Your name</dt><dd className="mt-0.5 break-words font-medium text-slate-950">{draft.referrerName}</dd></div>
                      <div><dt className="text-base text-slate-700">Your phone</dt><dd className="mt-0.5 break-words font-medium text-slate-950">{draft.referrerPhone}</dd></div>
                      <div><dt className="text-base text-slate-700">Friend's name</dt><dd className="mt-0.5 break-words font-medium text-slate-950">{draft.maidName}</dd></div>
                      {draft.maidPhone && <div><dt className="text-base text-slate-700">Friend's phone</dt><dd className="mt-0.5 break-words font-medium text-slate-950">{draft.maidPhone}</dd></div>}
                      {draft.maidNationality && <div><dt className="text-base text-slate-700">Nationality</dt><dd className="mt-0.5 break-words font-medium text-slate-950">{draft.maidNationality}</dd></div>}
                      {draft.relationship && <div><dt className="text-base text-slate-700">Relationship</dt><dd className="mt-0.5 break-words font-medium text-slate-950">{draft.relationship}</dd></div>}
                      {draft.notes && <div className="col-span-2"><dt className="text-base text-slate-700">Notes</dt><dd className="mt-0.5 break-words font-medium text-slate-950">{draft.notes}</dd></div>}
                    </dl>
                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border-2 border-emerald-300 bg-emerald-50 p-4 text-base leading-6 text-slate-950">
                      <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-emerald-700" />
                      <span>I have permission to share my friend's contact details with the agency for this referral.</span>
                    </label>
                    <Button type="button" onClick={() => void submit()} disabled={submitting} className="h-12 w-full rounded-xl bg-emerald-700 text-base font-semibold text-white shadow-sm hover:bg-emerald-800">
                      {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                      {submitting ? "Sending referral…" : "Submit referral"}
                    </Button>
                  </div>
                )}
              </>
            )}
            </div>
          </div>
          {!submitted && currentPrompt && (
            <form onSubmit={(event) => { event.preventDefault(); continueChat(); }} className="shrink-0 border-t border-slate-200 bg-white p-3 sm:p-4">
              <div className="flex items-end gap-2 rounded-2xl border border-slate-300 bg-slate-50 p-2 shadow-inner focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-100">
                {currentPrompt.multiline ? (
                  <Textarea
                    value={draft[currentPrompt.field]}
                    onChange={(event) => setDraft((current) => ({ ...current, [currentPrompt.field]: event.target.value }))}
                    onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); continueChat(); } }}
                    placeholder={currentPrompt.placeholder}
                    maxLength={1000}
                    rows={2}
                    className="min-h-12 resize-none border-0 bg-transparent text-base text-slate-950 shadow-none placeholder:text-slate-700 focus-visible:ring-0"
                  />
                ) : (
                  <Input
                    value={draft[currentPrompt.field]}
                    onChange={(event) => setDraft((current) => ({ ...current, [currentPrompt.field]: event.target.value }))}
                    placeholder={currentPrompt.placeholder}
                    maxLength={160}
                    type={currentPrompt.field === "referrerPhone" || currentPrompt.field === "maidPhone" ? "tel" : "text"}
                    className="h-11 border-0 bg-transparent px-2 text-base text-slate-950 shadow-none placeholder:text-slate-700 focus-visible:ring-0"
                  />
                )}
                {currentPrompt.optional && (
                  <Button type="button" variant="ghost" onClick={() => { setDraft((current) => ({ ...current, [currentPrompt.field]: "" })); setStep((current) => current + 1); }} className="h-10 shrink-0 rounded-xl px-3 text-base text-slate-800 hover:bg-slate-200">
                    Skip
                  </Button>
                )}
                <Button type="submit" aria-label="Send answer" className="h-11 w-11 shrink-0 rounded-xl bg-emerald-700 p-0 text-white hover:bg-emerald-800">
                  <Send className="h-5 w-5" />
                </Button>
              </div>
            </form>
          )}
        </section>
      )}
      <div className="relative">
        {!open && (
          <span aria-hidden="true" className="referral-cloud-pop pointer-events-none absolute bottom-[calc(100%+0.9rem)] right-1 max-w-[calc(100vw-2.5rem)] whitespace-nowrap rounded-[1.35rem] border border-emerald-100 bg-white px-5 py-2.5 text-base font-bold text-emerald-950 shadow-[0_10px_30px_rgba(15,60,45,0.16)] sm:px-6 sm:py-3">
            Refer your friends
          </span>
        )}
        <Button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="referral-avatar-float relative h-24 w-24 overflow-visible rounded-full border-[5px] border-white bg-emerald-100 p-0 shadow-[0_12px_36px_rgba(6,95,70,0.32)] transition-transform hover:scale-105 hover:bg-emerald-100 sm:h-28 sm:w-28"
          aria-label={open ? "Close maid referral chat" : "Open maid referral chat"}
          aria-expanded={open}
        >
          <span aria-hidden="true" className="referral-avatar-halo absolute -inset-1 rounded-full border-2 border-emerald-400/60" />
          <img src={referralRobotAvatar} alt="" className="relative h-full w-full rounded-full object-cover" />
          <span className="sr-only">{open ? "Close referral chat" : "Refer a maid"}</span>
        </Button>
      </div>
    </div>
  );
};

export default MaidReferralChatbot;

