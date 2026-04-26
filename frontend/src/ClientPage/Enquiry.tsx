import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import AiInquiryPanel from "@/components/ai/AiInquiryPanel";
import PublicSiteNavbar from "@/components/PublicSiteNavbar";
import { getStoredClient, type ClientUser } from "@/lib/clientAuth";

type EnquiryProps = {
  embedded?: boolean;
};

const Enquiry = ({ embedded = false }: EnquiryProps) => {
  const [clientUser] = useState<ClientUser | null>(getStoredClient());

  return (
    <div className="client-page-theme min-h-screen flex flex-col">

      {!embedded && <PublicSiteNavbar />}

      <main className="flex-1 py-40 md:py-40">
        <div className="container max-w-5xl">
          <div className="text-center mb-10">
            <h1 className="text-3xl md:text-4xl font-bold mb-3">
              Submit Your <span className="text-primary">AI Enquiry</span>
            </h1>
            <p className="text-muted-foreground">
              Share your hiring request and let the AI workflow classify it, suggest matches, and trigger your automation pipeline.
            </p>
          </div>

          <AiInquiryPanel
            title="AI Maid Inquiry"
            description="This form now uses `/api/inquiry` instead of the legacy enquiry endpoint. It shows the AI reply, intent detection, matching results, and Make trigger status in one place."
            initialName={clientUser?.name ?? ""}
            initialContact={clientUser?.email ?? ""}
          />

          <div className="mt-6 rounded-2xl border bg-card/80 p-5 text-sm text-muted-foreground shadow-sm">
            <p className="font-semibold text-foreground">Automation coverage</p>
            <p className="mt-2 leading-6">
              Inquiry submissions now post into the AI workflow, then relay the successful result to Make with the
              `inquiry_pipeline` scenario. If you need the older agency-specific note, include it at the top of the
              message body.
            </p>
          </div>
        </div>
      </main>

      <footer className="bg-foreground py-12 text-primary-foreground">
        <div className="container">
          <div className="mb-8 grid grid-cols-1 gap-8 md:grid-cols-4">
            <div>
              <h4 className="mb-3 font-display text-lg font-bold">"Find Maids" At The Agency</h4>
              <p className="font-body text-sm opacity-70">Matching trusted domestic professionals with families since 2009.</p>
            </div>
            <div>
              <h5 className="mb-3 font-body text-sm font-semibold uppercase tracking-wider">Company</h5>
              <ul className="space-y-2 font-body text-sm opacity-70">
                <li><a href="#why" className="transition-opacity hover:opacity-100">About Us</a></li>
                <li><a href="#services" className="transition-opacity hover:opacity-100">Our Services</a></li>
                <li><a href="#contact" className="transition-opacity hover:opacity-100">Contact</a></li>
              </ul>
            </div>
            <div>
              <h5 className="mb-3 font-body text-sm font-semibold uppercase tracking-wider">Legal</h5>
              <ul className="space-y-2 font-body text-sm opacity-70">
                <li><a href="#contact" className="transition-opacity hover:opacity-100">Legal Information</a></li>
                <li><a href="#contact" className="transition-opacity hover:opacity-100">Privacy Policy</a></li>
                <li><a href="#contact" className="transition-opacity hover:opacity-100">Terms of Service</a></li>
              </ul>
            </div>
            <div>
              <h5 className="mb-3 font-body text-sm font-semibold uppercase tracking-wider">Join Our Newsletter</h5>
              <p className="mb-3 font-body text-sm opacity-70">Stay updated on care tips, industry news, and agency updates.</p>
              <div className="flex gap-2">
                <input className="flex-1 rounded-lg border border-primary-foreground/20 bg-primary-foreground/10 px-3 py-2 font-body text-sm placeholder:opacity-50" placeholder="Email" />
                <button className="rounded-lg bg-primary px-4 py-2 font-body text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90">Join</button>
              </div>
            </div>
          </div>
          <div className="border-t border-primary-foreground/20 pt-6 text-center font-body text-xs opacity-50">
            Copyright 2026 "Find Maids" At The Agency. All rights reserved.
          </div>
        </div>
      </footer>

    </div>
  );
};

export default Enquiry;