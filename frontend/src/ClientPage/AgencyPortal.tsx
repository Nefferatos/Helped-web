import { useState, useEffect } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Eye, EyeOff, Lock, Shield, ChevronRight,
  Star, CheckCircle2, Menu, X,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getStoredClient, type ClientUser } from "@/lib/clientAuth";
import { logoutClientPortal } from "@/lib/supabaseAuth";

/* ─────────────────────────────── data ─────────────────────────────── */

const ALL_TESTIMONIALS = [
  {
    company: "Dans Services",
    text: "I started to use Bestmaid from Year 2005. Since then Bestmaid has been a good tool for us. We are receiving many phone calls and emails from Employers brought by Bestmaid.",
    author: "Mr. Leo",
    rating: 5,
  },
  {
    company: "1st Choice Pte Ltd",
    text: "Bestmaid backend is very powerful. It can generate all the employment-related contracts in PDF, such as, Maid Salary Schedule, Standard Employment Contract. It saves me a lot of time and staff cost.",
    author: "Mr. Ricky Ho",
    rating: 5,
  },
  {
    company: "Elite Maid Agency",
    text: "We've been on Bestmaid for 3 years now. The employer enquiries have tripled since we joined. The interface is intuitive and the PDF generation is a real time-saver for our admin team.",
    author: "Ms. Janet Tan",
    rating: 5,
  },
  {
    company: "Prestige Home Services",
    text: "Our agency has grown significantly because of Bestmaid's reach. Employers trust the platform and we always get quality leads. Highly recommend it to any agency looking to expand.",
    author: "Mr. Samuel Lim",
    rating: 4,
  },
  {
    company: "Caring Hands Agency",
    text: "The customized agency website feature is outstanding. We no longer need a separate web developer. Everything from biodata PDFs to contracts is handled seamlessly through Bestmaid.",
    author: "Ms. Grace Wong",
    rating: 5,
  },
  {
    company: "HomeCare Solutions",
    text: "Bestmaid simplified our entire workflow. Contract generation used to take hours; now it's done in minutes. The platform is reliable and the support team is very responsive.",
    author: "Mr. David Ong",
    rating: 5,
  },
];

const PLAN_FEATURES = [
  "Publish unlimited maids",
  "Upload 2 photos/maid",
  "Upload 1 video clip",
  "Generate maid bio-data in PDF file",
  "Manage Your maid agency profile, contact info, address.",
  "Auto-fill your employment contracts and documents.",
  "Generate your customized agency website.",
];

/* colour tokens */
const C = {
  navy:       "#1a5276",
  navyDark:   "#154360",
  navyLight:  "#2471a3",
  gold:       "#d4a017",
  goldLight:  "#f5c842",
  goldPale:   "#fef9ec",
  goldBorder: "#f0d080",
  bluePale:   "#eaf6fb",
  blueBorder: "#aed6f1",
  text:       "#2c3e50",
  muted:      "#5d6d7e",
  white:      "#ffffff",
};

function pickRandom<T>(arr: T[], n: number): T[] {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, n);
}

/* ─────── Padlock SVG ─────── */
function PadlockIcon() {
  return (
    <svg viewBox="0 0 80 90" className="w-16 h-16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22 42V30C22 18 58 18 58 30V42" stroke="#b7950b" strokeWidth="8" strokeLinecap="round" fill="none"/>
      <rect x="12" y="42" width="56" height="42" rx="8" fill="#c9a227"/>
      <rect x="12" y="40" width="56" height="42" rx="8" fill="url(#lockGrad)"/>
      <circle cx="40" cy="59" r="8" fill="#9a7d0a"/>
      <circle cx="40" cy="59" r="4" fill="#6d5008"/>
      <rect x="38" y="61" width="4" height="8" rx="2" fill="#6d5008"/>
      <defs>
        <linearGradient id="lockGrad" x1="12" y1="40" x2="68" y2="82" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f5c842"/>
          <stop offset="50%" stopColor="#d4a017"/>
          <stop offset="100%" stopColor="#b7950b"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

/* ─────── Testimonial Card ─────── */
function TestimonialCard({ t }: { t: typeof ALL_TESTIMONIALS[0] }) {
  return (
    <div className="rounded-xl p-4 border" style={{ background: "linear-gradient(145deg,#fff 0%,#f5fbff 100%)", borderColor: C.blueBorder, boxShadow: "0 2px 8px rgba(36,113,163,0.08)" }}>
      <a href="#" className="block text-sm font-bold mb-1.5 no-underline" style={{ color: C.navyLight }} onClick={(e) => e.preventDefault()}>
        {t.company}
      </a>
      <p className="text-xs leading-relaxed mb-2.5" style={{ color: C.muted }}>{t.text}</p>
      <div className="flex items-center gap-2">
        <div className="h-0.5 w-3 rounded-full" style={{ background: C.gold }}/>
        <span className="text-xs font-semibold italic" style={{ color: C.muted }}>{t.author}</span>
      </div>
      <div className="flex gap-0.5 mt-1.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} className="h-3 w-3" style={{ fill: i < t.rating ? C.gold : "#e5e7eb", color: i < t.rating ? C.gold : "#e5e7eb" }}/>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Main Page
══════════════════════════════════════════════════════════════════════════ */
export default function MaidAgencyLogin() {
  const [username, setUsername]           = useState("");
  const [password, setPassword]           = useState("");
  const [showPassword, setShowPassword]   = useState(false);
  const [isLoading, setIsLoading]         = useState(false);
  const [testimonials, setTestimonials]   = useState(() => pickRandom(ALL_TESTIMONIALS, 3));
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [clientUser, setClientUser]       = useState<ClientUser | null>(getStoredClient());

  useEffect(() => {
    const id = setInterval(() => setTestimonials(pickRandom(ALL_TESTIMONIALS, 3)), 8000);
    return () => clearInterval(id);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1800);
  };

  const handleLogout = async () => {
    await logoutClientPortal("/");
  };

  const inputBase = {
    background: C.white,
    borderColor: "#aed6f1",
    color: C.text,
    boxShadow: "inset 0 1px 3px rgba(0,0,0,0.06)",
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(160deg,#f8f9fa 0%,#eaf6fb 50%,#fef9ec 100%)", fontFamily: "Georgia, serif" }}>

      {/* ══ HEADER — copied from FAQPage ══ */}
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
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-16 left-0 w-full bg-white shadow-lg border-t animate-in slide-in-from-top duration-200">
            <div className="flex flex-col p-4 space-y-3 text-sm font-medium">
              <Link to="/" className="py-2 px-3 rounded-lg hover:bg-muted" onClick={() => setIsMobileMenuOpen(false)}>Home</Link>
              <a href="/#services" className="py-2 px-3 rounded-lg hover:bg-muted" onClick={() => setIsMobileMenuOpen(false)}>Services</a>
              <a href="/#search" className="py-2 px-3 rounded-lg hover:bg-muted" onClick={() => setIsMobileMenuOpen(false)}>Search Maids</a>
              <Link to="/about" className="py-2 px-3 rounded-lg hover:bg-muted" onClick={() => setIsMobileMenuOpen(false)}>About Us</Link>
              <Link to="/enquiry2" className="py-2 px-3 rounded-lg hover:bg-muted" onClick={() => setIsMobileMenuOpen(false)}>Enquiry</Link>
              <Link to="/faq" className="py-2 px-3 rounded-lg hover:bg-muted" onClick={() => setIsMobileMenuOpen(false)}>FAQ</Link>
              <Link to="/contact" className="py-2 px-3 rounded-lg hover:bg-muted" onClick={() => setIsMobileMenuOpen(false)}>Contact</Link>

              <div className="border-t pt-3">
                {!clientUser ? (
                  <Button className="w-full" asChild>
                    <Link to="/employer-login">Employer Login</Link>
                  </Button>
                ) : (
                  <Button variant="destructive" className="w-full" onClick={() => void handleLogout()}>
                    Logout
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      <div className="flex flex-1 overflow-hidden">

        {/* ══ SIDEBAR ══ */}
        <aside className="hidden lg:flex flex-col w-64 xl:w-72 shrink-0 border-r overflow-y-auto" style={{ background: "linear-gradient(180deg,#fff 0%,#f5fbff 100%)", borderColor: "#d5d8dc" }}>
          <div className="px-5 py-3 text-xs font-bold tracking-widest uppercase text-white" style={{ background: `linear-gradient(90deg,${C.navyLight} 0%,${C.navy} 100%)` }}>
            Testimonials
          </div>
          <div className="p-4 space-y-4 flex-1">
            {testimonials.map((t, i) => <TestimonialCard key={`${t.author}-${i}`} t={t}/>)}
          </div>
          <div className="h-1 w-full" style={{ background: `linear-gradient(90deg,${C.navyLight} 0%,${C.gold} 50%,${C.navyLight} 100%)` }}/>
        </aside>

        {/* ══ MAIN ══ */}
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">

          {/* Title */}
          <div className="px-6 sm:px-10 pt-8 pb-4 border-b" style={{ background: C.white, borderColor: "#d5d8dc" }}>
            <h1 className="text-2xl sm:text-3xl font-light tracking-tight" style={{ color: C.text }}>Sign in</h1>
          </div>

          {/* Info banner */}
          <div className="mx-4 sm:mx-8 mt-6">
            <div className="flex items-center gap-3 px-4 sm:px-5 py-3.5 rounded-xl border text-sm font-medium" style={{ background: C.bluePale, borderColor: C.blueBorder, color: C.navy }}>
              <span className="flex items-center justify-center h-6 w-6 rounded-full shrink-0 text-white text-xs font-bold" style={{ background: C.navyLight }}>i</span>
              You need to sign in with your FindMaid account to continue.
            </div>
          </div>

          {/* Cards row */}
          <div className="flex flex-col xl:flex-row gap-5 px-4 sm:px-8 py-6">

            {/* ── Login card ── */}
            <div className="flex-1 rounded-2xl border shadow-md overflow-hidden" style={{ background: "linear-gradient(145deg,#f0f8ff 0%,#e8f4fb 100%)", borderColor: C.blueBorder, minWidth: 0 }}>
              <div className="flex items-center gap-2 px-6 py-3 border-b" style={{ background: "linear-gradient(90deg,#d6eaf8 0%,#eaf4fb 100%)", borderColor: C.blueBorder }}>
                <Lock className="h-4 w-4" style={{ color: C.muted }}/>
                <span className="text-xs font-bold tracking-widest uppercase" style={{ color: C.navy }}>Agency Login</span>
              </div>

              <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5">
                {/* Username */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold" style={{ color: C.text }}>User Name</label>
                  <div className="relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "#aab7b8" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                    <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter your username" autoComplete="username"
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm transition-all duration-200 focus:outline-none"
                      style={inputBase}
                      onFocus={(e) => { e.currentTarget.style.borderColor = C.navyLight; e.currentTarget.style.boxShadow = `0 0 0 3px rgba(36,113,163,0.15)`; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = "#aed6f1"; e.currentTarget.style.boxShadow = "inset 0 1px 3px rgba(0,0,0,0.06)"; }}
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold" style={{ color: C.text }}>Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "#aab7b8" }}/>
                    <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password" autoComplete="current-password"
                      className="w-full pl-9 pr-10 py-2.5 rounded-xl border text-sm transition-all duration-200 focus:outline-none"
                      style={inputBase}
                      onFocus={(e) => { e.currentTarget.style.borderColor = C.navyLight; e.currentTarget.style.boxShadow = `0 0 0 3px rgba(36,113,163,0.15)`; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = "#aed6f1"; e.currentTarget.style.boxShadow = "inset 0 1px 3px rgba(0,0,0,0.06)"; }}
                    />
                    <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-70" style={{ color: "#aab7b8" }}>
                      {showPassword ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                    </button>
                  </div>
                </div>

                {/* Padlock + button */}
                <div className="flex items-center gap-5 pt-2">
                  <PadlockIcon/>
                  <button type="submit" disabled={isLoading}
                    className="flex items-center justify-center gap-2 px-7 py-2.5 rounded-xl font-bold text-sm text-white shadow-md transition-all duration-200 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70"
                    style={{ background: isLoading ? "#7fb3d3" : `linear-gradient(135deg,${C.navyLight} 0%,${C.navy} 100%)`, minWidth: 130 }}>
                    {isLoading && (
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                      </svg>
                    )}
                    {isLoading ? "Signing in…" : "Sign in"}
                    {!isLoading && <ChevronRight className="h-4 w-4"/>}
                  </button>
                </div>

                <a href="#" className="block text-xs no-underline transition-opacity hover:opacity-70" style={{ color: C.navyLight }} onClick={(e) => e.preventDefault()}>
                  Forgot your password?
                </a>
              </form>
            </div>

            {/* ── Sign-up card ── */}
            <div className="flex-1 rounded-2xl border shadow-md overflow-hidden" style={{ background: "linear-gradient(145deg,#fef9ec 0%,#fdf3d6 100%)", borderColor: C.goldBorder, minWidth: 0 }}>
              <div className="flex items-center gap-2 px-6 py-3 border-b" style={{ background: "linear-gradient(90deg,#f9e79f 0%,#fdeaa7 100%)", borderColor: C.goldBorder }}>
                <Shield className="h-4 w-4" style={{ color: "#b7950b" }}/>
                <span className="text-sm font-bold" style={{ color: "#7d6608" }}>Don't have Bestmaid account?</span>
              </div>

              <div className="p-6 sm:p-8">
                <p className="text-sm font-semibold mb-5" style={{ color: "#7d6608" }}>
                  Please{" "}
                  <a href="#" className="underline underline-offset-2 font-bold" style={{ color: C.navy }} onClick={(e) => e.preventDefault()}>
                    Sign-up Bestmaid plan
                  </a>{" "}
                  and enjoy:
                </p>

                <ul className="space-y-3">
                  {PLAN_FEATURES.map((f, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" style={{ color: C.navyLight }}/>
                      <span className="text-sm leading-snug" style={{ color: C.text }}>{f}</span>
                    </li>
                  ))}
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" style={{ color: C.navyLight }}/>
                    <span className="text-sm leading-snug" style={{ color: C.text }}>
                      By creating an account you agree to our{" "}
                      <a href="#" className="underline font-medium" style={{ color: C.navy }} onClick={(e) => e.preventDefault()}>Terms</a>
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Mobile testimonials */}
          <div className="lg:hidden px-4 sm:px-8 pb-8">
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: C.blueBorder }}>
              <div className="px-5 py-2.5 text-xs font-bold tracking-widest uppercase text-white" style={{ background: `linear-gradient(90deg,${C.navyLight} 0%,${C.navy} 100%)` }}>
                Testimonials
              </div>
              <div className="p-4 space-y-4" style={{ background: "#f5fbff" }}>
                {testimonials.map((t, i) => <TestimonialCard key={`mob-${t.author}-${i}`} t={t}/>)}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}