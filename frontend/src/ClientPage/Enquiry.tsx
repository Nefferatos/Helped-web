import { useState } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Send, User, Mail, Phone, MessageSquare } from "lucide-react";
import { Menu } from "lucide-react";


import {
  Avatar,
  AvatarFallback,
  AvatarImage
} from "@/components/ui/avatar";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

import {
  getStoredClient,
  clearClientAuth,
  getClientAuthHeaders,
  type ClientUser
} from "@/lib/clientAuth";

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);


  const [clientUser, setClientUser] = useState<ClientUser | null>(getStoredClient());
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await fetch("/api/client-auth/logout", {
        method: "POST",
        headers: { ...getClientAuthHeaders() },
      });
    } catch {}
    clearClientAuth();
    setClientUser(null);
    navigate("/");
  };

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
      <div className="client-page-theme min-h-screen flex flex-col">
  
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

      <main className="flex-1 py-40 md:py-40">
        <div className="container max-w-2xl">
          <div className="text-center mb-10">
            <h1 className="text-3xl md:text-4xl font-bold mb-3">
              Submit Your <span className="text-primary">Enquiry</span>
            </h1>
            <p className="text-muted-foreground">
              Please leave your contacts and maid requirements.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="bg-card rounded-2xl shadow-lg p-8">
            <div className="space-y-5">

              <select
                value={agency}
                onChange={(e) => setAgency(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              >
                {agencies.map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>

              <textarea
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 h-32"
                placeholder="Your requirements..."
              />

              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
                placeholder="Name"
              />

              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
                placeholder="Email"
              />

              <input
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
                placeholder="Contact Number"
              />

              <Button className="w-full">
                <Send className="w-4 h-4 mr-2" />
                Submit Enquiry
              </Button>

            </div>
          </form>
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