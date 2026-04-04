import { useState } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { MapPin, Phone, Mail, Globe, Clock, Facebook } from "lucide-react";
import { Button } from "@/components/ui/button";
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

const AboutUs = () => {
  const [clientUser, setClientUser] = useState<ClientUser | null>(getStoredClient());
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

      <main className="flex-1 py-12 md:py-20">
        <div className="container max-w-4xl">
          
          {/* TITLE */}
          <div className="mb-10">
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-6">
              About <span className="text-primary">Rinzin Agency</span>
            </h1>

            <div className="prose max-w-none font-body text-foreground/90 space-y-4">
              <p>
                <strong>Rinzin Agency: We specialize in Darjeeling and Manipur maids.</strong>{" "}
                Apart from specialized in North East Indian of Nepali and Tibetan and Manipuri and Mizoram and Nagaland and Assam origin from India. Our strength is also in specially selected Filipino by our staff in Philippines and Myanmar – English and Chinese speaking; Indian race Muslim and some Tamil speaking and some Nepali and Hindi speaking candidates.
              </p>
            </div>
          </div>

          <div className="bg-card rounded-2xl shadow-sm p-8 mb-8">
            <h2 className="font-display text-xl font-bold text-foreground mb-2">
              New and Transfer Foreign Domestic Helpers
            </h2>

            <div className="mt-4 space-y-4 font-body text-foreground/90">
              <div>
                <h3 className="font-bold text-foreground underline mb-2">
                  North East Indian:
                </h3>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Darjeeling Maid & Sikkim Maid</li>
                  <li>Nepalese – Hindu (Vegetarian and Non Vegetarian)</li>
                  <li>Tibetan – Buddhist (Vegetarian and Non Vegetarian)</li>
                  <li>Manipur Maid – Christian/Catholic (English Speaking)</li>
                  <li>Filipino – video conference with them</li>
                  <li>Myanmar</li>
                </ol>
              </div>

              <div>
                <p className="font-semibold">Selectively</p>
                <ul className="space-y-0.5">
                  <li>South Indian</li>
                  <li>Indonesian</li>
                  <li>Punjabi Maid</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-2xl shadow-sm p-8 mb-8">
            <div className="space-y-4 font-body text-foreground/90 leading-relaxed">
              <p>
                RINZIN has been providing quality Indian, Filipino and Myanmar domestic helpers to Singapore families for the past years.
              </p>
              <p>
                We have built up a fresh new team to give our valued customers a wider choice of workers from other countries (North India and Myanmar).
              </p>
              <p>
                In 2005 Being a Singaporean Chinese, I am the pioneer of North East India and has traveled India far and wide. We are now the first to bring you girls from Lahaul And Spiti, Himachal Pradesh and Ladakh.
              </p>
              <p>
                We take pride in our services to our clients. Our team is result oriented and is driven to provide you to best.
              </p>
              <p>
                We do not claim to be "problem free" and we are not tired of problems that maid placement brings, problems make us better.
              </p>
              <p>
                We are dealing with human beings from different culture and background. When there are problems, we face them and solve it swiftly.
              </p>
              <p>
                Our quality policy is <strong>"The right worker and delivery on time"</strong>.
              </p>
              <p>
                Our crisis management team is open to SMS to make sure that taking a maid from us is stress FREE.
              </p>
              <p>
                Call us and you will know that we are <strong>different</strong>.
              </p>
            </div>
          </div>

          <div className="bg-accent rounded-2xl p-8">
            <h3 className="font-display text-lg font-bold text-foreground mb-3">
              Special Notes to International Clients:
            </h3>
            <p className="font-body text-foreground/90">
              We relocated fresh or experienced helpers to reputable clients in Europe and UK.
            </p>
            <p className="font-body text-foreground/90 mt-2">
              Email us your requirements and we will shortlist suitable candidates for you.
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

export default AboutUs;
