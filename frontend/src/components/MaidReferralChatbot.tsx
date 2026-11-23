import { useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import FdwApplicationChatbot from "@/components/FdwApplicationChatbot";
import referralRobotAvatar from "@/ClientPage/assets/Ai Robot Vector Art.gif";

/** Floating referral assistant. FDW application intake remains on the full form. */
const MaidReferralChatbot = ({ applicantName, applicantPhone }: { applicantName?: string; applicantPhone?: string }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-5 right-4 z-[70] flex flex-col items-end gap-3 sm:bottom-7 sm:right-7">
      {open && (
        <section
          role="dialog"
          aria-modal="false"
          aria-label="FDW applicant assistant"
          className="referral-chat-enter flex h-[min(70dvh,580px)] w-[min(94vw,420px)] flex-col overflow-hidden rounded-[1.5rem] border border-emerald-100 bg-white shadow-[0_20px_65px_rgba(6,55,45,0.3)]"
        >
          <header className="relative flex min-h-[88px] shrink-0 items-center gap-3 overflow-hidden bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-800 px-4 py-3 text-white sm:min-h-[96px] sm:px-4">
            <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-24 h-64 w-64 rounded-full border-[30px] border-white/10" />
            <div aria-hidden="true" className="pointer-events-none absolute -bottom-16 left-1/3 h-28 w-[130%] -rotate-6 rounded-[50%] bg-emerald-300/25" />
            <div className="relative z-10 flex h-[52px] w-[52px] shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white/70 bg-white/20 shadow-lg sm:h-[58px] sm:w-[58px]">
              <img src={referralRobotAvatar} alt="" className="h-full w-full object-cover" />
            </div>
            <div className="relative z-10 min-w-0 flex-1 self-center">
              <p className="text-sm font-extrabold leading-tight sm:text-base">Ask an applicant assistant</p>
              <p className="mt-1 text-xs text-emerald-50">FDW application help</p>
            </div>
            <span aria-hidden="true" className="relative z-10 h-9 w-px bg-white/40" />
            <Button type="button" variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close applicant assistant" className="relative z-10 h-9 w-9 shrink-0 rounded-full text-white hover:bg-white/15 hover:text-white">
              <X className="h-5 w-5" />
            </Button>
          </header>
          <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[radial-gradient(ellipse_at_85%_100%,rgba(110,231,183,0.16),transparent_45%),linear-gradient(180deg,#ffffff_0%,#fbfefd_100%)]">
            <FdwApplicationChatbot applicantName={applicantName} applicantPhone={applicantPhone} />
          </div>
        </section>
      )}
      <Button
        type="button"
        aria-label={open ? "Close applicant assistant" : "Open applicant assistant"}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="relative h-14 w-14 overflow-visible rounded-full border-[3px] border-white bg-emerald-100 p-0 shadow-[0_10px_28px_rgba(6,95,70,0.3)] transition-transform hover:scale-105 hover:bg-emerald-100 sm:h-16 sm:w-16"
      >
        <span aria-hidden="true" className="absolute -inset-1 rounded-full border-2 border-emerald-400/60" />
        {open ? <MessageCircle className="relative h-7 w-7 text-emerald-900" /> : <img src={referralRobotAvatar} alt="" className="relative h-full w-full rounded-full object-cover" />}
        <span className="sr-only">FDW applicant assistant</span>
      </Button>
    </div>
  );
};

export default MaidReferralChatbot;
