import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  KeyRound,
  Lock,
  User,
  Info,
  Check,
  ArrowRight,
  Star,
  Sparkles,
  Shield,
} from "lucide-react";
import { toast } from "@/components/ui/sonner";
import {
  clearAgencyAdminAuth,
  getAgencyAdminToken,
  saveAgencyAdminAuth,
} from "@/lib/agencyAdminAuth";
import { adminPath } from "@/lib/routes";
import PublicSiteNavbar from "@/components/PublicSiteNavbar";
import FindMaidImg from "./assets/findmaid.png";

interface AgencyAuthResponse {
  error?: string;
  token?: string;
  admin?: {
    id: number;
    agencyId: number;
    username: string;
    email?: string;
    emailVerified?: boolean;
    role?: "admin" | "agency" | "staff";
    agencyName: string;
    profileImageUrl?: string;
    createdAt: string;
  };
}

const testimonials = [
  {
    agency: "Dans Services",
    quote:
      "I started using FindMaid back in 2018. Since then it has been a reliable tool for us — we receive many phone calls and emails from employers brought in by the platform.",
    author: "Mr. Khyle",
    rating: 5,
  },
  {
    agency: "1st Choice Pte Ltd",
    quote:
      "The FindMaid backend is very powerful. It auto-generates all employment-related contracts in PDF — Maid Salary Schedule, Standard Employment Contract, Insurance Forms — saving us a huge amount of time and staff cost.",
    author: "Mr. Jonathan",
    rating: 5,
  },
];

const benefits = [
  { text: "Publish unlimited maid listings", icon: "📋" },
  { text: "Upload up to 2 photos per maid", icon: "🖼️" },
  { text: "Upload 1 introduction video clip per maid", icon: "🎥" },
  { text: "Auto-generate maid bio-data in PDF format", icon: "📄" },
  { text: "Manage agency profile, contact info & branch addresses", icon: "🏢" },
  { text: "Auto-fill employment contracts and MOM documents", icon: "✍️" },
  { text: "Get a customised agency micro-site", icon: "🌐" },
];

type AgencyPortalPageProps = {
  embedded?: boolean;
};

export default function AgencyPortalPage({ embedded = false }: AgencyPortalPageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const isEmbedded = embedded || location.pathname.startsWith("/client/");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [focused, setFocused] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (getAgencyAdminToken()) {
      navigate(adminPath("/dashboard"));
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const response = await fetch("/api/agency-auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = (await response.json().catch(() => ({}))) as AgencyAuthResponse;
      if (!response.ok || !data.token || !data.admin) {
        throw new Error(data.error || "Agency admin authentication failed");
      }
      saveAgencyAdminAuth(data.token, data.admin);
      toast.success("Agency admin logged in");
      navigate(adminPath("/dashboard"));
    } catch (error) {
      clearAgencyAdminAuth();
      toast.error(error instanceof Error ? error.message : "Unable to continue");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f6f1] font-sans">
      {!isEmbedded && <PublicSiteNavbar />}

      {/* ── Body ── */}
      <div className="max-w-[1080px] mx-auto px-6 py-9 pb-16 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8 items-start">

        {/* ── Left: Testimonials ── */}
        <aside className="flex flex-col gap-4">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Star size={13} className="text-[#c9a84c] fill-[#c9a84c]" />
            <span className="text-[10.5px] font-bold uppercase tracking-widest text-[#5a4a00]">
              What agencies say
            </span>
          </div>

          {testimonials.map((t) => (
            <div
              key={t.agency}
              className="bg-white rounded-2xl border border-[#e8e2d4] p-5 shadow-sm relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
            >
              {/* Gold left bar */}
              <div className="absolute top-0 left-0 bottom-0 w-[3px] bg-gradient-to-b from-[#c9a84c] to-[#e8c97a] rounded-l-sm" />
              {/* Decorative quote */}
              <span className="absolute top-[-8px] right-4 font-serif text-[80px] leading-none text-[#c9a84c]/10 pointer-events-none select-none">
                "
              </span>
              {/* Stars */}
              <div className="flex gap-0.5 mb-2.5 pl-3">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} size={11} className="text-[#c9a84c] fill-[#c9a84c]" />
                ))}
              </div>
              <p className="text-[13px] leading-relaxed text-[#1a1a1a] mb-3 pl-3">
                "{t.quote}"
              </p>
              <div className="pl-3">
                <p className="text-xs font-bold text-[#1a3c2e] m-0">{t.agency}</p>
                <p className="text-[11.5px] text-[#777] mt-0.5">— {t.author}</p>
              </div>
            </div>
          ))}
        </aside>

        {/* ── Right: Sign-in + Benefits ── */}
        <main className="flex flex-col gap-4">

          {/* Info banner */}
          <div className="flex items-center gap-3 bg-gradient-to-r from-[#fffbeb] to-[#fef9e0] border border-[#f0d060] border-l-[3px] border-l-[#c9a84c] rounded-xl px-4 py-3">
            <div className="w-7 h-7 rounded-full bg-[#b45309]/10 flex items-center justify-center shrink-0">
              <Info size={14} className="text-[#b45309]" strokeWidth={2} />
            </div>
            <p className="text-[13px] text-[#1a1a1a] leading-relaxed m-0">
              Sign in with your{" "}
              <strong className="text-[#1a3c2e]">FindMaid agency account</strong> to access
              your dashboard, listings, and documents.
            </p>
          </div>

          {/* ── Cards row ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">

            {/* ── Sign-in Card ── */}
            <div className="bg-white rounded-2xl border border-[#e0dcd2] shadow-[0_4px_28px_rgba(0,0,0,0.08)] overflow-hidden flex flex-col transition-shadow duration-200 hover:shadow-[0_8px_40px_rgba(0,0,0,0.12)]">

              {/* Card header */}
              <div className="bg-gradient-to-br from-[#0d2b1e] to-[#1a3c2e] px-5 py-4 flex items-center gap-3 shrink-0">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#c9a84c]/30 to-[#c9a84c]/10 border border-[#c9a84c]/40 flex items-center justify-center shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
                  <KeyRound size={18} className="text-[#e8c97a]" strokeWidth={1.75} />
                </div>
                <div>
                  <p className="text-white text-sm font-bold m-0 tracking-tight">Agency Sign In</p>
                  <p className="text-white/45 text-[11px] m-0">Secure login portal</p>
                </div>
              </div>

              {/* Banner image */}
              <div className="w-full h-[118px] relative overflow-hidden shrink-0">
                <img
                  src={FindMaidImg}
                  alt="Agency banner"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-b from-transparent to-white/90 pointer-events-none" />
              </div>

              {/* Form */}
              <form onSubmit={(e) => void handleSubmit(e)} className="px-5 py-4 flex flex-col flex-1">

                {/* Username */}
                <div className="mb-3.5">
                  <label htmlFor="username" className="block text-[11px] font-bold text-[#1a3c2e] uppercase tracking-wider mb-1.5">
                    Username
                  </label>
                  <div className="relative">
                    <div
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none w-6 h-6 rounded-md flex items-center justify-center transition-all duration-200"
                      style={{ background: focused === "username" ? "rgba(26,60,46,0.08)" : "transparent" }}
                    >
                      <User
                        size={14}
                        strokeWidth={1.75}
                        className={`transition-colors duration-200 ${focused === "username" ? "text-[#1a3c2e]" : "text-[#c0bdb8]"}`}
                      />
                    </div>
                    <input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      onFocus={() => setFocused("username")}
                      onBlur={() => setFocused(null)}
                      placeholder="Enter your username"
                      required
                      disabled={isSubmitting}
                      className="w-full rounded-[10px] border-[1.5px] border-[#e0dcd2] bg-[#fafaf8] py-2.5 pl-10 pr-3 text-sm text-[#1a1a1a] outline-none transition-all duration-200 placeholder:text-[#c0bdb8] focus:border-[#1a3c2e] focus:bg-[#f4faf7] focus:shadow-[0_0_0_3px_rgba(26,60,46,0.08)] disabled:opacity-60"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="mb-4">
                  <label htmlFor="password" className="block text-[11px] font-bold text-[#1a3c2e] uppercase tracking-wider mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <div
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none w-6 h-6 rounded-md flex items-center justify-center transition-all duration-200"
                      style={{ background: focused === "password" ? "rgba(26,60,46,0.08)" : "transparent" }}
                    >
                      <Lock
                        size={14}
                        strokeWidth={1.75}
                        className={`transition-colors duration-200 ${focused === "password" ? "text-[#1a3c2e]" : "text-[#c0bdb8]"}`}
                      />
                    </div>
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setFocused("password")}
                      onBlur={() => setFocused(null)}
                      placeholder="Enter your password"
                      required
                      disabled={isSubmitting}
                      className="w-full rounded-[10px] border-[1.5px] border-[#e0dcd2] bg-[#fafaf8] py-2.5 pl-10 pr-3 text-sm text-[#1a1a1a] outline-none transition-all duration-200 placeholder:text-[#c0bdb8] focus:border-[#1a3c2e] focus:bg-[#f4faf7] focus:shadow-[0_0_0_3px_rgba(26,60,46,0.08)] disabled:opacity-60"
                    />
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-br from-[#1a3c2e] to-[#0d2b1e] text-white border-none rounded-[10px] py-3 px-5 text-sm font-bold flex items-center justify-center gap-2 tracking-wide transition-all duration-200 hover:shadow-[0_6px_20px_rgba(26,60,46,0.35)] hover:-translate-y-px active:translate-y-0 disabled:opacity-65 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSubmitting ? "Signing in..." : "Sign in to Dashboard"}
                  {!isSubmitting && <ArrowRight size={15} strokeWidth={2.5} />}
                </button>

                {/* Security badge */}
                <div className="flex items-center justify-center gap-1.5 mt-3">
                  <div className="w-5 h-5 rounded-full bg-[#f0f0ee] flex items-center justify-center">
                    <Shield size={11} className="text-[#aaa]" strokeWidth={2} />
                  </div>
                  <span className="text-[11px] text-[#999]">256-bit SSL encrypted</span>
                </div>
              </form>
            </div>

            {/* ── Benefits Card ── */}
            <div className="bg-white rounded-2xl border border-[#e0dcd2] shadow-[0_4px_28px_rgba(0,0,0,0.08)] overflow-hidden flex flex-col transition-shadow duration-200 hover:shadow-[0_8px_40px_rgba(0,0,0,0.12)]">

              {/* Gold header */}
              <div className="bg-gradient-to-br from-[#b8922e] via-[#c9a84c] to-[#e8c97a] px-5 py-4 flex items-center gap-3 shrink-0">
                <div className="w-10 h-10 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]">
                  <Sparkles size={18} className="text-[rgba(60,35,0,0.75)]" strokeWidth={1.75} />
                </div>
                <div>
                  <p
                    className="text-[rgba(60,40,0,0.9)] text-sm font-bold m-0 tracking-tight"
                    style={{ textShadow: "0 1px 0 rgba(255,255,255,0.3)" }}
                  >
                    New to FindMaid?
                  </p>
                  <p className="text-[rgba(60,40,0,0.55)] text-[11px] m-0">
                    Join 500+ agencies on the platform
                  </p>
                </div>
              </div>

              <div className="px-5 py-4 flex flex-col flex-1">
                <p className="text-[13px] text-[#1a1a1a] mb-3.5 leading-relaxed">
                  <Link
                    to="/login"
                    className="text-[#1a3c2e] font-bold underline decoration-2 underline-offset-[3px]"
                  >
                    Sign up for a FindMaid plan
                  </Link>{" "}
                  and unlock all features:
                </p>

                <ul className="list-none m-0 p-0 flex flex-col gap-2 flex-1">
                  {benefits.map((b) => (
                    <li
                      key={b.text}
                      className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-[#f8f6f1] border border-[#ece8de] transition-all duration-[180ms] hover:bg-[#f1ede4] hover:border-[#d9d3c4] hover:translate-x-0.5"
                    >
                      <span className="text-sm shrink-0 leading-none w-5 text-center">{b.icon}</span>
                      <span className="text-[13px] text-[#1a1a1a] leading-snug flex-1">
                        {b.text}
                      </span>
                      {/* Check icon with badge background */}
                      <div className="w-5 h-5 rounded-full bg-[#1a3c2e]/10 flex items-center justify-center shrink-0 ml-auto">
                        <Check size={11} className="text-[#1a3c2e]" strokeWidth={2.5} />
                      </div>
                    </li>
                  ))}
                </ul>

                <p className="mt-3.5 text-[11px] text-[#888] leading-relaxed">
                  By creating an account you agree to our{" "}
                  <Link
                    to="/faq"
                    className="text-[#1a3c2e] font-semibold underline underline-offset-[2px]"
                  >
                    Terms of Service
                  </Link>.
                </p>
              </div>
            </div>
          </div>

          {/* Employer redirect */}
          <div className="text-center px-5 py-3.5 bg-white rounded-xl border border-[#e0dcd2] shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <p className="text-[13px] text-[#444] m-0 flex items-center justify-center gap-1 flex-wrap">
              Looking for the employer login?&nbsp;
              <Link
                to="/employer-login"
                className="text-[#1a3c2e] font-bold underline decoration-2 underline-offset-[3px]"
              >
                Go to Employer Login →
              </Link>
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}