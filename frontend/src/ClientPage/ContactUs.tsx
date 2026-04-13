import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Mail, Phone, Globe, Clock, Send } from "lucide-react";
import { Menu } from "lucide-react";


import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  getStoredClient,
  clearClientAuth,
  getClientAuthHeaders,
  type ClientUser,
} from "@/lib/clientAuth";

type ContactUsProps = {
  embedded?: boolean;
};

const ContactUs = ({ embedded = false }: ContactUsProps) => {
  const [clientUser, setClientUser] = useState<ClientUser | null>(getStoredClient());
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);


  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [message, setMessage] = useState("");
  const { toast } = useToast();
  

  const handleLogout = async () => {
    try {
      await fetch("/api/client-auth/logout", {
        method: "POST",
        headers: { ...getClientAuthHeaders() },
      });
    } catch {
      // Ignore logout errors; we'll clear local session regardless.
    }

    clearClientAuth();
    setClientUser(null);
    navigate("/");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !mobile.trim()) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Message Sent", description: "We will get back to you shortly." });
    setName("");
    setEmail("");
    setMobile("");
    setMessage("");
  };

  return (
    <div className="client-page-theme min-h-screen flex flex-col">

      {!embedded && (
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur">
          <div className="container flex h-16 items-center justify-between">

            <Link to="/" className="font-display text-xl font-bold text-foreground">
              Find Maids At The Agency
            </Link>

            <nav className="hidden md:flex items-center gap-8 text-sm font-medium">

              <a href="/" className="hover:text-primary">Home</a>
              <a href="/#services" className="hover:text-primary">Services</a>
              <a href="/#search" className="hover:text-primary">Search Maids</a>

              <NavLink to="/about" className={({ isActive }) => isActive ? "text-primary font-semibold" : "hover:text-primary"}>
                About Us
              </NavLink>

              <NavLink to="/enquiry2" className={({ isActive }) => isActive ? "text-primary font-semibold" : "hover:text-primary"}>
                Enquiry
              </NavLink>

              <NavLink to="/faq" className={({ isActive }) => isActive ? "text-primary font-semibold" : "hover:text-primary"}>
                FAQ
              </NavLink>

              <NavLink to="/contact" className={({ isActive }) => isActive ? "text-primary font-semibold" : "hover:text-primary"}>
                Contact Us
              </NavLink>
            </nav>

            <div className="flex items-center gap-2">

              <div className="hidden md:flex">
                {clientUser ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-2 border px-2 py-1 rounded-full hover:bg-muted transition">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={clientUser.profileImageUrl} />
                          <AvatarFallback>
                            {clientUser.name.slice(0, 1).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{clientUser.name}</span>
                      </button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuLabel>My Account</DropdownMenuLabel>
                      <DropdownMenuSeparator />

                      <DropdownMenuItem asChild>
                        <Link to="/client/dashboard">Dashboard</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/client/profile">Profile</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/client/history">History</Link>
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />

                      <DropdownMenuItem onClick={() => void handleLogout()}>
                        Logout
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Link to="/employer-login">
                    <Button size="sm">Employer Login</Button>
                  </Link>
                )}
              </div>

              <button
                className="md:hidden"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                <Menu />
              </button>
            </div>
          </div>

          {isMobileMenuOpen && (
            <div className="md:hidden absolute top-16 left-0 w-full bg-white shadow-lg border-t animate-in slide-in-from-top duration-200">

              <div className="flex flex-col p-4 space-y-3 text-sm font-medium">

                <Link to="/" className="py-2 px-3 rounded-lg hover:bg-muted">
                  Home
                </Link>

                <a href="/#services" className="py-2 px-3 rounded-lg hover:bg-muted">
                  Services
                </a>

                <a href="/#search" className="py-2 px-3 rounded-lg hover:bg-muted">
                  Search Maids
                </a>

                <Link to="/about" className="py-2 px-3 rounded-lg hover:bg-muted">
                  About Us
                </Link>

                <Link to="/enquiry2" className="py-2 px-3 rounded-lg hover:bg-muted">
                  Enquiry
                </Link>

                <Link to="/faw" className="py-2 px-3 rounded-lg hover:bg-muted">
                  FAQ
                </Link>

                <Link to="/contact" className="py-2 px-3 rounded-lg hover:bg-muted">
                  Contact
                </Link>

                <div className="border-t pt-3">
                  {!clientUser ? (
                    <Button className="w-40 mx-auto rounded-lg text-sm font-semibold shadow-sm">
                      <Link to="/employer-login" className="w-full block text-center">
                        Employer Login
                      </Link>
                    </Button>
                  ) : (
                    <Button variant="destructive" className="w-full" onClick={handleLogout}>
                      Logout
                    </Button>
                  )}
                </div>

              </div>
            </div>
          )}
      </header>
      )}

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

export default ContactUs;
