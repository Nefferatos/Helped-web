import AiInquiryPanel from "@/components/ai/AiInquiryPanel";
import AiLeadCaptureForm from "@/components/ai/AiLeadCaptureForm";

const AiAutomationPage = () => {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--muted))_100%)]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-[32px] border bg-card/95 p-6 shadow-sm sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">Localhost AI Console</p>
          <h1 className="mt-3 font-display text-3xl font-bold text-foreground sm:text-4xl">
            Test the AI maid agency workflows end to end
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            This page is meant for local verification. It sends inquiries to `/api/inquiry`, lead messages to
            `/api/leads/raw`, and relays successful results to Make through `/api/send-to-make`.
          </p>
        </section>

        <AiInquiryPanel />
        <AiLeadCaptureForm />
      </div>
    </div>
  );
};

export default AiAutomationPage;
