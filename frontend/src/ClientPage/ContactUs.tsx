
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Mail, Phone, Globe, Clock, Send } from "lucide-react";

const ContactUs = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [message, setMessage] = useState("");
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !mobile.trim()) {
      toast({ title: "Missing Fields", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }
    toast({ title: "Message Sent", description: "We will get back to you shortly." });
    setName(""); setEmail(""); setMobile(""); setMessage("");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 py-12 md:py-20">
        <div className="container max-w-5xl">
          <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-10 text-center">
            Contact <span className="text-primary">Us</span>
          </h1>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
            <form onSubmit={handleSubmit} className="lg:col-span-2 bg-card rounded-2xl shadow-sm p-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <input
                  type="text" value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 font-body text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Name" required
                />
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 font-body text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Email" required
                />
              </div>
              <input
                type="tel" value={mobile} onChange={(e) => setMobile(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 font-body text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring mb-4"
                placeholder="Mobile" required
              />
              <textarea
                value={message} onChange={(e) => setMessage(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 font-body text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring h-32 resize-none mb-4"
                placeholder="Message..."
              />
              <Button type="submit" size="lg" className="w-full font-body gap-2">
                <Send className="w-4 h-4" /> SEND MESSAGE
              </Button>
            </form>

            <div className="bg-card rounded-2xl shadow-sm p-8">
              <h2 className="font-display text-xl font-bold text-foreground mb-4 text-center">Opening Hours</h2>
              <div className="space-y-3 font-body text-sm text-foreground/80">
                <div className="flex items-start gap-2">
                  <Clock className="w-4 h-4 mt-0.5 text-primary" />
                  <span>Mon to Sun: 11:00am to 11:00pm</span>
                </div>
                <div className="flex items-start gap-2">
                  <Clock className="w-4 h-4 mt-0.5 text-primary" />
                  <span>Other hours: by Mobile. If you are unable to reach us need to contact us urgently, pls sms</span>
                </div>
                <div className="flex items-start gap-2">
                  <Clock className="w-4 h-4 mt-0.5 text-primary" />
                  <span>Bala – 80730757</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="bg-card rounded-2xl shadow-sm p-6">
              <h3 className="font-display text-lg font-bold text-foreground mb-3">Office</h3>
              <div className="space-y-2 font-body text-sm text-foreground/80">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 mt-0.5 text-primary" />
                  <div>
                    <p>3 JALAN KUKOH, #01-115</p>
                    <p>Singapore 161003</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary" />
                  <a href="mailto:enquiries.j1@gmail.com" className="text-primary hover:underline">enquiries.j1@gmail.com</a>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-2xl shadow-sm p-6">
              <h3 className="font-display text-lg font-bold text-foreground mb-3">Website</h3>
              <div className="flex items-center gap-2 font-body text-sm">
                <Globe className="w-4 h-4 text-primary" />
                <a href="http://www.rinzinmaid.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  http://www.rinzinmaid.com
                </a>
              </div>
            </div>

            <div className="bg-card rounded-2xl shadow-sm p-6">
              <h3 className="font-display text-lg font-bold text-foreground mb-3">Contact</h3>
              <div className="space-y-2 font-body text-sm text-foreground/80">
                <p><strong>Bala</strong></p>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-primary" />
                  <span>80730757</span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl overflow-hidden shadow-sm">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3988.8!2d103.838!3d1.289!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31da19a340000001%3A0x1!2s3+Jalan+Kukoh%2C+Singapore+161003!5e0!3m2!1sen!2ssg!4v1"
              width="100%" height="350" style={{ border: 0 }} allowFullScreen loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Office Location"
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default ContactUs;
