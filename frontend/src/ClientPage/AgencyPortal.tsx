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
  Building2,
  Eye,
  EyeOff,
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
  const [showPassword, setShowPassword] = useState(false);

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
    <div className="client-page-theme ap-root">
      {!isEmbedded && <PublicSiteNavbar />}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,700;1,500&family=DM+Sans:wght@400;500;600;700&display=swap');

        :root {
          --forest:    #0e2b1f;
          --forest-md: #1a3c2e;
          --forest-lt: #2a5c47;
          --gold:      #c9a84c;
          --gold-lt:   #e8c97a;
          --gold-pale: #f7eecc;
          --cream:     #f9f6ef;
          --cream-dk:  #f0ebe0;
          --ink:       #0d0d0b;
          --muted:     #2e2820;
          --border:    #ccc5b8;
        }

        .ap-root {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: var(--cream);
          font-family: 'DM Sans', sans-serif;
          /* Subtle grain overlay */
          background-image:
            radial-gradient(ellipse 80% 60% at 10% 0%, rgba(201,168,76,0.08) 0%, transparent 60%),
            radial-gradient(ellipse 60% 50% at 90% 100%, rgba(14,43,31,0.07) 0%, transparent 55%);
        }

        /* ─── Page outer ─────────────────────────────── */
        .ap-outer {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2.5rem 1.25rem 4rem;
        }

        /* ─── Card ───────────────────────────────────── */
        .ap-card {
          width: 100%;
          max-width: 1060px;
          background: #fff;
          border: 1px solid var(--border);
          border-radius: 24px;
          box-shadow:
            0 0 0 1px rgba(255,255,255,0.8) inset,
            0 24px 64px rgba(14,43,31,0.10),
            0 4px 12px rgba(0,0,0,0.04);
          overflow: hidden;
          animation: cardIn 0.55s cubic-bezier(.22,.68,0,1.2) both;
        }
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(18px) scale(0.985); }
          to   { opacity: 1; transform: none; }
        }

        /* ─── Header ─────────────────────────────────── */
        .ap-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem 1.75rem;
          background: linear-gradient(110deg, var(--forest) 0%, #163526 55%, #0d2419 100%);
          position: relative;
          overflow: hidden;
        }
        .ap-header::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse 35% 120% at 85% 50%, rgba(201,168,76,0.12) 0%, transparent 70%);
          pointer-events: none;
        }
        /* Decorative diagonal lines */
        .ap-header::after {
          content: '';
          position: absolute;
          top: 0; right: 0; bottom: 0;
          width: 200px;
          background: repeating-linear-gradient(
            -55deg,
            transparent,
            transparent 10px,
            rgba(255,255,255,0.015) 10px,
            rgba(255,255,255,0.015) 11px
          );
          pointer-events: none;
        }

        .ap-header-badge {
          width: 40px; height: 40px;
          border-radius: 12px;
          background: rgba(201,168,76,0.15);
          border: 1px solid rgba(201,168,76,0.3);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }

        .ap-header-text { flex: 1; }
        .ap-header-title {
          font-family: 'Playfair Display', serif;
          font-size: 1.15rem;
          font-weight: 700;
          color: #f5f0e8;
          letter-spacing: 0.01em;
          line-height: 1.2;
          margin: 0;
        }
        .ap-header-sub {
          font-size: 0.7rem;
          font-weight: 400;
          color: rgba(245,240,232,0.72);
          margin: 0.15rem 0 0;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .ap-header-pill {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          background: rgba(201,168,76,0.14);
          border: 1px solid rgba(201,168,76,0.28);
          border-radius: 20px;
          padding: 0.3rem 0.75rem;
          font-size: 0.78rem;
          font-weight: 600;
          color: var(--gold-lt);
          letter-spacing: 0.04em;
          flex-shrink: 0;
          position: relative; z-index: 1;
        }

        /* ─── Info Banner ─────────────────────────────── */
        .ap-banner {
          display: flex;
          align-items: center;
          gap: 0.875rem;
          padding: 0.875rem 1.75rem;
          background: linear-gradient(to right, #fffdf0, #fffbea);
          border-bottom: 1px solid #ede4b8;
          border-left: 4px solid var(--gold);
        }
        .ap-banner-dot {
          width: 30px; height: 30px;
          border-radius: 50%;
          background: rgba(180,83,9,0.09);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .ap-banner p {
          font-size: 0.9rem;
          font-weight: 500;
          color: #1e1800;
          line-height: 1.5;
          margin: 0;
        }
        .ap-banner strong { color: var(--forest-md); }

        /* ─── Body grid ───────────────────────────────── */
        .ap-body {
          display: grid;
          grid-template-columns: 1fr 1px 1.08fr 1px 1fr;
        }
        @media (max-width: 860px) {
          .ap-body { grid-template-columns: 1fr; }
          .ap-sep  { display: none; }
        }

        .ap-sep {
          background: linear-gradient(to bottom, transparent, var(--border) 15%, var(--border) 85%, transparent);
          align-self: stretch;
        }

        /* ─── Columns ─────────────────────────────────── */
        .ap-col {
          padding: 1.75rem 1.625rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .ap-col-center {
          padding: 1.75rem 1.625rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          justify-content: center;
          background: linear-gradient(160deg, #fafaf7 0%, #fff 100%);
        }

        /* Section label */
        .ap-section-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #1e1810;
        }
        .ap-section-label span.line {
          flex: none;
          width: 20px; height: 1.5px;
          background: #1e1810;
          opacity: 0.25;
        }

        /* ─── Image strip ─────────────────────────────── */
        .ap-img-wrap {
          width: 100%;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid var(--border);
          background: var(--cream);
          position: relative;
        }
        .ap-img-wrap::after {
          content: '';
          position: absolute;
          inset: 0;
          box-shadow: inset 0 -24px 32px rgba(255,255,255,0.45);
          border-radius: 12px;
          pointer-events: none;
        }
        .ap-img-wrap img {
          width: 100%;
          height: auto;
          display: block;
          object-fit: contain;
        }

        /* ─── Form fields ─────────────────────────────── */
        .ap-form { display: flex; flex-direction: column; gap: 0.875rem; }

        .ap-label {
          display: block;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #0e2b1f;
          margin-bottom: 0.45rem;
        }
        .ap-field { position: relative; }
        .ap-field-icon {
          position: absolute;
          left: 0.7rem;
          top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
          transition: color 0.15s;
        }
        .ap-input {
          width: 100%;
          border: 2px solid #9e958a;
          border-radius: 10px;
          background: #fff;
          padding: 0.7rem 0.875rem 0.7rem 2.3rem;
          font-size: 0.9375rem;
          font-weight: 500;
          font-family: 'DM Sans', sans-serif;
          color: #0d0d0b;
          outline: none;
          box-shadow: 0 1px 3px rgba(0,0,0,0.07);
          transition: border-color 0.18s, box-shadow 0.18s, background 0.18s;
        }
        .ap-input::placeholder { color: #5a5248; font-weight: 400; }
        .ap-input:focus {
          border-color: var(--forest-md);
          background: #f3faf7;
          box-shadow: 0 0 0 3.5px rgba(26,60,46,0.12), 0 1px 4px rgba(26,60,46,0.08);
        }
        .ap-input:disabled { opacity: 0.6; }
        .ap-input-pr { padding-right: 2.5rem; }

        .ap-eye-btn {
          position: absolute;
          right: 0.65rem;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          padding: 0.2rem;
          cursor: pointer;
          color: #c4bfb8;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          transition: color 0.15s;
        }
        .ap-eye-btn:hover { color: #1a3c2e; }

        /* ─── Submit button ───────────────────────────── */
        .ap-btn {
          width: 100%;
          border: none;
          border-radius: 10px;
          padding: 0.8rem 1.25rem;
          font-size: 0.875rem;
          font-family: 'DM Sans', sans-serif;
          font-weight: 700;
          letter-spacing: 0.02em;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          position: relative;
          overflow: hidden;
          transition: box-shadow 0.22s, transform 0.15s;
          background: linear-gradient(135deg, var(--forest-md) 0%, var(--forest) 100%);
          color: #fff;
          box-shadow: 0 4px 14px rgba(14,43,31,0.28), inset 0 1px 0 rgba(255,255,255,0.08);
        }
        .ap-btn::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(to right, transparent 0%, rgba(255,255,255,0.07) 50%, transparent 100%);
          transform: translateX(-100%);
          transition: transform 0.55s ease;
        }
        .ap-btn:hover:not(:disabled)::after { transform: translateX(100%); }
        .ap-btn:hover:not(:disabled) {
          box-shadow: 0 8px 28px rgba(14,43,31,0.38), inset 0 1px 0 rgba(255,255,255,0.1);
          transform: translateY(-1px);
        }
        .ap-btn:active { transform: none; box-shadow: 0 2px 8px rgba(14,43,31,0.22); }
        .ap-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .ap-ssl {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          color: #3d3020;
          font-size: 0.78rem;
          letter-spacing: 0.02em;
        }

        /* ─── Testimonials ────────────────────────────── */
        .ap-tcard {
          background: linear-gradient(135deg, #faf8f3, #f5f2eb);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 1.125rem 1.125rem 1.125rem 1.375rem;
          position: relative;
          overflow: hidden;
          transition: transform 0.2s, box-shadow 0.2s;
          animation: fadeUp 0.5s ease both;
        }
        .ap-tcard:nth-child(2) { animation-delay: 0.08s; }
        .ap-tcard:nth-child(3) { animation-delay: 0.16s; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: none; }
        }
        .ap-tcard:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 32px rgba(0,0,0,0.07);
        }
        .ap-tcard::before {
          content: '';
          position: absolute;
          left: 0; top: 12px; bottom: 12px;
          width: 3.5px;
          background: linear-gradient(to bottom, var(--gold), var(--gold-lt));
          border-radius: 0 4px 4px 0;
        }
        .ap-tcard-stars {
          display: flex;
          gap: 2px;
          margin-bottom: 0.6rem;
        }
        .ap-tcard-quote {
          font-size: 0.875rem;
          line-height: 1.7;
          color: #1a1510;
          font-style: italic;
          margin-bottom: 0.7rem;
        }
        /* Large decorative quote mark */
        .ap-tcard-quote::before {
          content: '\u201C';
          font-family: 'Playfair Display', serif;
          font-size: 2rem;
          line-height: 0;
          vertical-align: -0.55rem;
          color: var(--gold);
          margin-right: 0.15rem;
          opacity: 0.6;
        }
        .ap-tcard-agency {
          font-size: 0.9rem;
          font-weight: 700;
          color: var(--forest-md);
        }
        .ap-tcard-by {
          font-size: 0.8rem;
          color: #4a4038;
          margin-top: 0.1rem;
        }

        /* ─── Benefits ────────────────────────────────── */
        .ap-bheader {
          border-radius: 12px;
          padding: 0.9rem 1rem;
          background: linear-gradient(135deg, #a87c28, var(--gold), var(--gold-lt));
          display: flex;
          align-items: center;
          gap: 0.7rem;
          box-shadow: 0 4px 14px rgba(180,130,40,0.25), inset 0 1px 0 rgba(255,255,255,0.3);
        }
        .ap-bheader-ico {
          width: 34px; height: 34px;
          border-radius: 9px;
          background: rgba(255,255,255,0.25);
          border: 1px solid rgba(255,255,255,0.35);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .ap-bheader-title {
          font-size: 1rem;
          font-weight: 700;
          color: rgba(20,10,0,0.97);
          margin: 0;
          font-family: 'Playfair Display', serif;
        }
        .ap-bheader-sub {
          font-size: 0.8rem;
          color: rgba(40,20,0,0.8);
          margin: 0.1rem 0 0;
        }

        .ap-benefit {
          display: flex;
          align-items: center;
          gap: 0.7rem;
          padding: 0.575rem 0.75rem;
          border-radius: 9px;
          background: var(--cream);
          border: 1px solid var(--cream-dk);
          font-size: 0.875rem;
          font-weight: 500;
          color: #0f0f0d;
          line-height: 1.4;
          transition: background 0.14s, border-color 0.14s, transform 0.12s, box-shadow 0.14s;
          cursor: default;
        }
        .ap-benefit:hover {
          background: #eee9de;
          border-color: #d7cfc0;
          transform: translateX(3px);
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }
        .ap-benefit-icon { font-size: 0.9rem; flex-shrink: 0; width: 1.15rem; text-align: center; }
        .ap-benefit-check {
          width: 18px; height: 18px;
          border-radius: 50%;
          background: rgba(26,60,46,0.1);
          border: 1px solid rgba(26,60,46,0.12);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          margin-left: auto;
        }

        /* ─── Footer inside card ──────────────────────── */
        .ap-foot {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.9rem 1.75rem;
          background: var(--cream);
          border-top: 1px solid var(--border);
          font-size: 0.9rem;
          color: #2e2820;
          flex-wrap: wrap;
        }
        .ap-foot a {
          color: var(--forest-md);
          font-weight: 700;
          text-decoration: none;
          border-bottom: 1.5px solid var(--gold);
          padding-bottom: 1px;
          transition: color 0.15s;
        }
        .ap-foot a:hover { color: var(--forest); }

        .ap-divider-text {
          font-size: 0.75rem;
          color: #2e2820;
          text-align: center;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .ap-divider-text::before,
        .ap-divider-text::after {
          content: '';
          flex: 1;
          height: 1px;
          background: var(--border);
        }
      `}</style>

      <main className="ap-outer">
        <div className="ap-card">

          {/* ── Header ── */}
          <div className="ap-header">
            <div className="ap-header-badge">
              <KeyRound size={17} color="#e8c97a" strokeWidth={1.75} />
            </div>
            <div className="ap-header-text">
              <p className="ap-header-title">Agency Portal</p>
              <p className="ap-header-sub">FindMaid Agency Dashboard</p>
            </div>
            <div className="ap-header-pill">
              <Building2 size={10} strokeWidth={2} />
              500+ Agencies
            </div>
          </div>

          {/* ── Info banner ── */}
          <div className="ap-banner">
            <div className="ap-banner-dot">
              <Info size={13} color="#b45309" strokeWidth={2} />
            </div>
            <p>
              Sign in with your <strong>FindMaid agency account</strong> to access your dashboard, listings, and documents.
            </p>
          </div>

          {/* ── Three-column body ── */}
          <div className="ap-body">

            {/* Col 1 — Testimonials */}
            <div className="ap-col">
              <div className="ap-section-label">
                <span className="line" />
                <Star size={10} strokeWidth={2} />
                Agency Reviews
              </div>

              {testimonials.map((t) => (
                <div key={t.agency} className="ap-tcard">
                  <div className="ap-tcard-stars">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} size={10} color="#c9a84c" fill="#c9a84c" />
                    ))}
                  </div>
                  <p className="ap-tcard-quote">{t.quote}"</p>
                  <div className="ap-tcard-agency">{t.agency}</div>
                  <div className="ap-tcard-by">— {t.author}</div>
                </div>
              ))}
            </div>

            <div className="ap-sep" />

            {/* Col 2 — Sign In */}
            <div className="ap-col-center">
              <div className="ap-section-label">
                <span className="line" />
                <KeyRound size={10} strokeWidth={2} />
                Sign In
              </div>

              <div className="ap-img-wrap">
                <img src={FindMaidImg} alt="FindMaid agency banner" />
              </div>

              <form
                onSubmit={(e) => void handleSubmit(e)}
                className="ap-form"
              >
                <div>
                  <label htmlFor="username" className="ap-label">Username</label>
                  <div className="ap-field">
                    <span className="ap-field-icon">
                      <User size={13} color={focused === "username" ? "#1a3c2e" : "#c4bfb8"} strokeWidth={1.75} />
                    </span>
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
                      className="ap-input"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="ap-label">Password</label>
                  <div className="ap-field">
                    <span className="ap-field-icon">
                      <Lock size={13} color={focused === "password" ? "#1a3c2e" : "#c4bfb8"} strokeWidth={1.75} />
                    </span>
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setFocused("password")}
                      onBlur={() => setFocused(null)}
                      placeholder="Enter your password"
                      required
                      disabled={isSubmitting}
                      className="ap-input ap-input-pr"
                    />
                    <button
                      type="button"
                      className="ap-eye-btn"
                      onClick={() => setShowPassword((v) => !v)}
                      tabIndex={-1}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword
                        ? <EyeOff size={14} strokeWidth={1.75} />
                        : <Eye size={14} strokeWidth={1.75} />}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={isSubmitting} className="ap-btn">
                  {isSubmitting ? "Signing in…" : "Sign in to Dashboard"}
                  {!isSubmitting && <ArrowRight size={14} strokeWidth={2.5} />}
                </button>

                <div className="ap-ssl">
                  <Shield size={11} color="#b0a99f" strokeWidth={2} />
                  <span>256-bit SSL encrypted connection</span>
                </div>
              </form>
            </div>

            <div className="ap-sep" />

            {/* Col 3 — Benefits */}
            <div className="ap-col">
              <div className="ap-section-label">
                <span className="line" />
                <Sparkles size={10} strokeWidth={2} />
                Platform Features
              </div>

              <div className="ap-bheader">
                <div className="ap-bheader-ico">
                  <Sparkles size={15} color="rgba(45,25,0,0.7)" strokeWidth={1.75} />
                </div>
                <div>
                  <p className="ap-bheader-title">New to FindMaid?</p>
                  <p className="ap-bheader-sub">Join 500+ agencies on the platform</p>
                </div>
              </div>

              <p style={{ fontSize: "0.8rem", color: "#2e2820", lineHeight: 1.65, margin: 0 }}>
                <Link to="/login" style={{ color: "var(--forest-md)", fontWeight: 700, textDecoration: "none", borderBottom: "1.5px solid var(--gold)", paddingBottom: 1 }}>
                  Sign up for a FindMaid plan
                </Link>{" "}
                and unlock powerful agency tools:
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                {benefits.map((b) => (
                  <div key={b.text} className="ap-benefit">
                    <span className="ap-benefit-icon">{b.icon}</span>
                    <span style={{ flex: 1 }}>{b.text}</span>
                    <div className="ap-benefit-check">
                      <Check size={10} color="#1a3c2e" strokeWidth={2.5} />
                    </div>
                  </div>
                ))}
              </div>

              <p style={{ fontSize: "0.8rem", color: "#5c5248", lineHeight: 1.65, margin: 0 }}>
                By creating an account you agree to our{" "}
                <Link to="/faq" style={{ color: "var(--forest-md)", fontWeight: 600, textDecoration: "none", borderBottom: "1px solid rgba(26,60,46,0.3)" }}>
                  Terms of Service
                </Link>.
              </p>
            </div>

          </div>

          {/* ── Card footer ── */}
          <div className="ap-foot">
            <span>Looking for the employer login?</span>
            <Link to="/employer-login">Go to Employer Login →</Link>
          </div>

        </div>
      </main>
    </div>
  );
}