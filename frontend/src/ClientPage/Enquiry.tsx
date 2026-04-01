import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Send, User, Mail, Phone, MessageSquare } from "lucide-react";


const agencies = [
  "Target Maid Rinzin At The Agency",
  
];

const Enquiry = () => {
  const [agency, setAgency] = useState("All Agencies");
  const [requirements, setRequirements] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requirements.trim() || !name.trim() || !email.trim() || !contactNumber.trim()) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Enquiry Submitted",
      description: "We will match from 2000+ maids and get back to you shortly.",
    });
    setRequirements("");
    setName("");
    setEmail("");
    setContactNumber("");
    setAgency("All Agencies");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 py-12 md:py-20">
        <div className="container max-w-2xl">
          <div className="text-center mb-10">
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3">
              Submit Your <span className="text-primary">Enquiry</span>
            </h1>
            <p className="font-body text-muted-foreground">
              Please leave your contacts and maid requirements, we will match maids for you.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="bg-card rounded-2xl shadow-lg p-8">
            <div className="space-y-5">
              <div>
                <label className="font-body text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  To Agency
                </label>
                <select
                  value={agency}
                  onChange={(e) => setAgency(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 font-body text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {agencies.map((a) => (
                    <option key={a}>{a}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-body text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  Your Requirements on Hiring a Maid
                </label>
                <div className="relative">
                  <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <textarea
                    value={requirements}
                    onChange={(e) => setRequirements(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background pl-10 pr-3 py-2.5 font-body text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring h-36 resize-none"
                    placeholder="Describe your requirements — e.g. nationality, skills, duties, schedule preferences..."
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-body text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  Your Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background pl-10 pr-3 py-2.5 font-body text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="John Doe"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-body text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  Your Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background pl-10 pr-3 py-2.5 font-body text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="john@example.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-body text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  Contact Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="tel"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background pl-10 pr-3 py-2.5 font-body text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="+65 9123 4567"
                    required
                  />
                </div>
              </div>

              <Button type="submit" size="lg" className="w-full font-body gap-2">
                <Send className="w-4 h-4" /> Submit Enquiry
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default Enquiry;