import { Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck, Sparkles } from "lucide-react";
import PublicSiteNavbar from "@/components/PublicSiteNavbar";
import FdwApplicationChatbot from "@/components/FdwApplicationChatbot";

const FdwApplicationChatPage = () => {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,_#F0F9FF_0%,_#E0F4F7_100%)]">
      <PublicSiteNavbar />
      <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link
            to="/apply-as-maid"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#0E4E5E] hover:text-[#0b3a47]"
          >
            <ArrowLeft className="h-4 w-4" /> Back to the full application form
          </Link>
          <div className="flex items-center gap-2 rounded-full bg-[#FCD34D] px-3 py-1 text-xs font-semibold text-[#3d2800]">
            <Sparkles className="h-3.5 w-3.5" /> AI-assisted
          </div>
        </div>

        <header className="mb-6 text-center">
          <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Apply in a chat</h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-600">
            Fill in your details in one place — quicker than the full form — and our assistant will register you
            with the agency. You can refer a friend here too.
          </p>
        </header>

        <FdwApplicationChatbot />

        <div className="mx-auto mt-6 flex max-w-2xl items-start gap-3 rounded-2xl border border-[#0E4E5E]/15 bg-white p-4 text-xs leading-6 text-slate-600">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#0E4E5E]" />
          <p>
            Your answers are handled securely by the agency. For the detailed biodata form (documents, work
            history, and certifications), use the{" "}
            <Link to="/apply-as-maid" className="font-semibold text-[#0E4E5E] underline">
              full application form
            </Link>
            .
          </p>
        </div>
      </main>
    </div>
  );
};

export default FdwApplicationChatPage;
