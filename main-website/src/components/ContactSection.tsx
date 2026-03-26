import { Button } from "@/components/ui/button";

const ContactSection = () => {
  return (
    <section id="contact" className="py-16 md:py-24 bg-card">
      <div className="container max-w-2xl text-center">
        <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3">
          Initiate Your Search Today
        </h2>
        <p className="font-body text-muted-foreground mb-10">
          Tell us your requirements and our experts will shortlist the best candidates for you within 24 hours.
        </p>
        <div className="bg-muted rounded-2xl p-8 text-left">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="font-body text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Your Full Name</label>
              <input className="w-full rounded-lg border border-border bg-card px-3 py-2.5 font-body text-sm text-foreground" placeholder="John Doe" />
            </div>
            <div>
              <label className="font-body text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Email Address</label>
              <input className="w-full rounded-lg border border-border bg-card px-3 py-2.5 font-body text-sm text-foreground" placeholder="john@example.org" />
            </div>
            <div>
              <label className="font-body text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Phone Number</label>
              <input className="w-full rounded-lg border border-border bg-card px-3 py-2.5 font-body text-sm text-foreground" placeholder="+1 (555) 000-0000" />
            </div>
            <div>
              <label className="font-body text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Main Requirement</label>
              <select className="w-full rounded-lg border border-border bg-card px-3 py-2.5 font-body text-sm text-foreground">
                <option>Housekeeping</option>
                <option>Elderly Care</option>
                <option>Infant Care</option>
                <option>Culinary Service</option>
              </select>
            </div>
          </div>
          <div className="mb-6">
            <label className="font-body text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Message (Optional)</label>
            <textarea className="w-full rounded-lg border border-border bg-card px-3 py-2.5 font-body text-sm text-foreground h-24 resize-none" placeholder="Tell us more about your care needs..." />
          </div>
          <Button size="lg" className="w-full font-body">Submit My Request</Button>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
