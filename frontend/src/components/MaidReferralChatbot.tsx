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
          className="flex h-[min(78vh,680px)] w-[min(94vw,460px)] flex-col overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-[0_20px_70px_rgba(6,55,45,0.3)]"
        >
          <header className="flex shrink-0 items-center gap-3 bg-emerald-800 px-4 py-3 text-white">
            <img src={referralRobotAvatar} alt="" className="h-10 w-10 rounded-full border border-white/60 object-cover" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">Ask an applicant assistant</p>
              <p className="text-xs text-emerald-100">FDW application help</p>
            </div>
            <Button type="button" variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close applicant assistant" className="text-white hover:bg-white/15 hover:text-white">
              <X className="h-5 w-5" />
            </Button>
          </header>
          <div className="flex min-h-0 flex-1 flex-col">
            <FdwApplicationChatbot applicantName={applicantName} applicantPhone={applicantPhone} />
          </div>
        </section>
      )}
      <Button
        type="button"
        aria-label={open ? "Close applicant assistant" : "Open applicant assistant"}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="relative h-16 w-16 overflow-visible rounded-full border-4 border-white bg-emerald-100 p-0 shadow-[0_12px_36px_rgba(6,95,70,0.32)] transition-transform hover:scale-105 hover:bg-emerald-100 sm:h-[4.5rem] sm:w-[4.5rem]"
      >
        <span aria-hidden="true" className="absolute -inset-1 rounded-full border-2 border-emerald-400/60" />
        {open ? <MessageCircle className="relative h-7 w-7 text-emerald-900" /> : <img src={referralRobotAvatar} alt="" className="relative h-full w-full rounded-full object-cover" />}
        <span className="sr-only">FDW applicant assistant</span>
      </Button>
    </div>
  );
};

export default MaidReferralChatbot;
