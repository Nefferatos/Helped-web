import { useState } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Send, User, Mail, Phone, MessageSquare } from "lucide-react";

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
            <NavLink
              to="/agencies"
              className={({ isActive }) => isActive ? "text-primary font-semibold" : "hover:text-primary"}
            >
              Browse Agencies
            </NavLink>

            <NavLink
              to="/#services"
              className={({ isActive }) => isActive ? "text-primary font-semibold" : "hover:text-primary"}
            >
              Services
            </NavLink>

            <NavLink
              to="/#search"
              className={({ isActive }) => isActive ? "text-primary font-semibold" : "hover:text-primary"}
            >
              Search Maids
            </NavLink>

            <NavLink
              to="/about"
              className={({ isActive }) => isActive ? "text-primary font-semibold" : "hover:text-primary"}
            >
              About Us
            </NavLink>

            <NavLink
              to="/enquiry2"
              className={({ isActive }) => isActive ? "text-primary font-semibold" : "hover:text-primary"}
            >
              Enquiry
            </NavLink>

            <NavLink
              to="/contact"
              className={({ isActive }) => isActive ? "text-primary font-semibold" : "hover:text-primary"}
            >
              Contact Us
            </NavLink>
          </nav>

          {clientUser ? (
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-3 rounded-full border bg-background px-2 py-1 pr-3 hover:border-primary/40">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={clientUser.profileImageUrl} />
                      <AvatarFallback>{clientUser.name.slice(0, 1).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="hidden md:block text-left">
                      <p className="text-sm font-semibold">{clientUser.name}</p>
                      <p className="text-xs text-muted-foreground">{clientUser.email}</p>
                    </div>
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-56">
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
                  <DropdownMenuItem asChild>
                    <Link to="/client/support-chat">Messages</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => void handleLogout()}>Logout</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <Link to="/employer-login">
              <Button size="sm">Employer Login</Button>
            </Link>
          )}
        </div>
      </header>

      <main className="flex-1 py-12 md:py-20">
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
    </div>
  );
};

export default Enquiry;