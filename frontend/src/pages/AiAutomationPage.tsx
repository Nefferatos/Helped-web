import AiInquiryPanel from "@/components/ai/AiInquiryPanel";
import AiLeadCaptureForm from "@/components/ai/AiLeadCaptureForm";

const AiAutomationPage = () => {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--muted))_100%)]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-[32px] border bg-card/95 p-6 shadow-sm sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">AI Workflow Console</p>
          <h1 className="mt-3 font-display text-3xl font-bold text-foreground sm:text-4xl">
            AI Inquiry & Lead Automation
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            Test and trigger AI-powered inquiry classification and lead capture workflows. Inquiries are sent
            to the classification pipeline and successful leads are forwarded through the automation webhook.
          </p>
        </section>

        <AiInquiryPanel />
        <AiLeadCaptureForm />
      </div>
    </div>
  );
};

export default AiAutomationPage;
