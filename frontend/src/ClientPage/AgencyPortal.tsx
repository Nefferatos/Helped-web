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
  Eye,
  EyeOff,
  ChevronRight,
  Quote,
} from "lucide-react";
import { toast } from "@/components/ui/sonner";
import {
  clearAgencyAdminAuth,
  getAgencyAdminToken,
  saveAgencyAdminAuth,
} from "@/lib/agencyAdminAuth";
import { adminPath } from "@/lib/routes";
import PublicSiteNavbar from "@/components/PublicSiteNavbar";
import FindMaidImg from "./assets/maid_agency_logo_81.jpg";

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
    agency: "Bright Future Agency",
    quote:
      "The PDF auto-generation alone saves us hours every week. Contracts, biodata, MOM forms — all done in seconds.",
    author: "Ms. Rowena",
    rating: 5,
  },
  {
    agency: "Elite Home Services",
    quote:
      "Our listings look professional and employers find us easily. The dashboard is clean and straightforward to use.",
    author: "Mr. Raymond",
    rating: 5,
  },
];

const benefits = [
  { text: "Publish unlimited maid listings", icon: "📋" },
  { text: "Upload up to 2 photos per maid", icon: "🖼️" },
  { text: "Upload 1 introduction video clip per maid", icon: "🎥" },
  { text: "Auto-generate maid bio-data in PDF format", icon: "📄" },
  { text: "Manage agency profile & branch addresses", icon: "🏢" },
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
    <div className="ap-root">
      {!isEmbedded && <PublicSiteNavbar />}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&family=Playfair+Display:ital,wght@0,700;1,500&display=swap');

        /* ── Tokens ───────────────────────────────────────────────────── */
        :root {
          --pine:       #0c2218;
          --pine-2:     #153620;
          --pine-3:     #1e4d2e;
          --pine-4:     #2e6b42;
          --pine-light: #e8f0eb;
          --gold:       #b5832a;
          --gold-2:     #d4a24e;
          --gold-3:     #eed898;
          --gold-pale:  #faf6ed;
          --surface:    #f6f4f0;
          --surface-2:  #eeebe4;
          --white:      #ffffff;
          --ink:        #171210;
          --ink-2:      #2e2822;
          --ink-3:      #584f47;
          --ink-4:      #958d85;
          --rule:       #ddd7ce;
          --rule-2:     #e9e4dc;
          --shadow-sm:  0 1px 2px rgba(0,0,0,0.05);
          --shadow-md:  0 4px 18px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.04);
          --shadow-lg:  0 24px 64px rgba(12,34,24,0.11), 0 4px 16px rgba(0,0,0,0.05);
          --r-sm: 6px;
          --r-md: 10px;
          --r-lg: 16px;
          --r-xl: 22px;
        }

        /* ── Root ─────────────────────────────────────────────────────── */
        .ap-root {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: var(--surface);
          font-family: 'DM Sans', system-ui, sans-serif;
          background-image:
            radial-gradient(ellipse 80% 50% at 0% 0%, rgba(180,120,40,0.07) 0%, transparent 60%),
            radial-gradient(ellipse 60% 60% at 100% 100%, rgba(12,34,24,0.07) 0%, transparent 55%);
        }

        /* ── Page wrapper ─────────────────────────────────────────────── */
        .ap-outer {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem 1.25rem 3.5rem;
        }

        /* ── Card ─────────────────────────────────────────────────────── */
        .ap-card {
          width: 100%;
          max-width: 1060px;
          background: var(--white);
          border-radius: var(--r-xl);
          border: 1px solid var(--rule);
          box-shadow: var(--shadow-lg);
          overflow: hidden;
          animation: cardReveal 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        @keyframes cardReveal {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: none; }
        }

        /* ── Card header ──────────────────────────────────────────────── */
        .ap-header {
          display: flex;
          align-items: center;
          gap: 0.875rem;
          padding: 0 1.75rem;
          height: 58px;
          background: var(--pine);
          position: relative;
          overflow: hidden;
        }
        .ap-header::before {
          content: '';
          position: absolute;
          top: -60px; right: 80px;
          width: 200px; height: 200px;
          background: radial-gradient(circle, rgba(181,131,42,0.14) 0%, transparent 70%);
          pointer-events: none;
        }
        .ap-header::after {
          content: '';
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(
            -52deg,
            transparent 0px,
            transparent 20px,
            rgba(255,255,255,0.015) 20px,
            rgba(255,255,255,0.015) 21px
          );
          pointer-events: none;
        }

        .ap-logo-mark {
          position: relative; z-index: 1;
          width: 34px; height: 34px;
          border-radius: 9px;
          background: rgba(181,131,42,0.14);
          border: 1px solid rgba(181,131,42,0.25);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }

        .ap-header-text { flex: 1; position: relative; z-index: 1; }
        .ap-header-title {
          font-family: 'Playfair Display', serif;
          font-size: 1rem;
          font-weight: 700;
          color: #ede8de;
          margin: 0;
          line-height: 1;
          letter-spacing: 0.01em;
        }
        .ap-header-sub {
          font-size: 0.66rem;
          font-weight: 500;
          color: rgba(237,232,222,0.48);
          margin: 0.2rem 0 0;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        /* ── Alert banner ─────────────────────────────────────────────── */
        .ap-alert {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.7rem 1.75rem;
          background: #fffdf5;
          border-bottom: 1px solid #ecdfa8;
        }
        .ap-alert-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: var(--gold);
          flex-shrink: 0;
        }
        .ap-alert p {
          margin: 0;
          font-size: 0.825rem;
          color: var(--ink-3);
          line-height: 1.5;
        }
        .ap-alert strong { color: var(--pine-2); font-weight: 600; }

        /* ── Three-column body ────────────────────────────────────────── */
        .ap-body {
          display: grid;
          grid-template-columns: 1fr 1px 1.05fr 1px 1fr;
        }
        @media (max-width: 840px) {
          .ap-body { grid-template-columns: 1fr; }
          .ap-divider { display: none; }
        }

        .ap-divider {
          background: var(--rule-2);
          align-self: stretch;
        }

        /* ── Column base ──────────────────────────────────────────────── */
        .ap-col {
          padding: 1.75rem 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .ap-col-mid {
          padding: 1.75rem 1.625rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        /* ── Section label ────────────────────────────────────────────── */
        .ap-section-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.64rem;
          font-weight: 600;
          letter-spacing: 0.13em;
          text-transform: uppercase;
          color: var(--ink-4);
          margin-bottom: 0.1rem;
        }
        .ap-section-label::after {
          content: '';
          flex: 1;
          height: 1px;
          background: var(--rule-2);
        }

        /* ── Image ────────────────────────────────────────────────────── */
        .ap-img-wrap {
          width: 100%;
          border-radius: var(--r-md);
          overflow: hidden;
          border: 1px solid var(--rule);
        }
        .ap-img-wrap img {
          width: 100%;
          height: auto;
          display: block;
        }

        /* ── Form ─────────────────────────────────────────────────────── */
        .ap-form { display: flex; flex-direction: column; gap: 0.85rem; }

        .ap-label {
          display: block;
          font-size: 0.7rem;
          font-weight: 600;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          color: var(--ink-2);
          margin-bottom: 0.38rem;
        }

        .ap-field { position: relative; }

        .ap-field-icon {
          position: absolute;
          left: 0.8rem;
          top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
          display: flex;
          transition: color 0.15s;
        }

        .ap-input {
          width: 100%;
          border: 1.5px solid var(--rule);
          border-radius: var(--r-sm);
          background: var(--white);
          padding: 0.7rem 0.875rem 0.7rem 2.15rem;
          font-size: 0.875rem;
          font-weight: 400;
          font-family: 'DM Sans', sans-serif;
          color: var(--ink);
          outline: none;
          transition: border-color 0.18s, box-shadow 0.18s, background 0.18s;
          box-sizing: border-box;
        }
        .ap-input::placeholder {
          color: var(--ink-4);
          font-weight: 300;
        }
        .ap-input:focus {
          border-color: var(--pine-3);
          background: #f5faf7;
          box-shadow: 0 0 0 3px rgba(30,77,46,0.09);
        }
        .ap-input:disabled { opacity: 0.5; }
        .ap-input-pr { padding-right: 2.4rem; }

        .ap-eye-btn {
          position: absolute;
          right: 0.65rem;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          padding: 0.2rem;
          cursor: pointer;
          color: var(--ink-4);
          display: flex;
          align-items: center;
          border-radius: 4px;
          transition: color 0.15s;
        }
        .ap-eye-btn:hover { color: var(--pine-2); }

        /* ── Submit ───────────────────────────────────────────────────── */
        .ap-btn {
          width: 100%;
          border: none;
          border-radius: var(--r-sm);
          padding: 0.78rem 1.25rem;
          font-size: 0.875rem;
          font-family: 'DM Sans', sans-serif;
          font-weight: 600;
          letter-spacing: 0.02em;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          background: var(--pine);
          color: var(--white);
          box-shadow: 0 2px 10px rgba(12,34,24,0.22);
          transition: background 0.2s, box-shadow 0.2s, transform 0.15s;
          position: relative;
          overflow: hidden;
        }
        .ap-btn::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.08) 50%, transparent 70%);
          transform: translateX(-120%);
          transition: transform 0.6s ease;
        }
        .ap-btn:hover:not(:disabled)::after { transform: translateX(120%); }
        .ap-btn:hover:not(:disabled) {
          background: var(--pine-3);
          box-shadow: 0 6px 24px rgba(12,34,24,0.28);
          transform: translateY(-1px);
        }
        .ap-btn:active:not(:disabled) {
          transform: none;
          box-shadow: 0 1px 4px rgba(12,34,24,0.18);
        }
        .ap-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .ap-spinner {
          width: 13px; height: 13px;
          border: 2px solid rgba(255,255,255,0.22);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.65s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .ap-ssl {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          font-size: 0.74rem;
          color: var(--ink-4);
        }

        /* ── Testimonials ─────────────────────────────────────────────── */
        .ap-tcard {
          background: var(--surface);
          border: 1px solid var(--rule-2);
          border-radius: var(--r-md);
          padding: 1rem 1rem 1rem 1.25rem;
          position: relative;
          overflow: hidden;
          animation: slideUp 0.45s ease both;
        }
        .ap-tcard:nth-child(2) { animation-delay: 0.08s; }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: none; }
        }
        .ap-tcard::before {
          content: '';
          position: absolute;
          left: 0; top: 16px; bottom: 16px; width: 2.5px;
          background: linear-gradient(to bottom, var(--gold), var(--gold-3));
          border-radius: 0 2px 2px 0;
        }

        .ap-tcard-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.55rem;
        }

        .ap-tcard-stars {
          display: flex; gap: 2px;
        }

        .ap-tcard-quote-icon {
          color: var(--gold-3);
          opacity: 0.7;
        }

        .ap-tcard-quote {
          font-size: 0.83rem;
          line-height: 1.7;
          color: var(--ink-3);
          font-style: italic;
          margin-bottom: 0.65rem;
        }

        .ap-tcard-meta { display: flex; align-items: center; gap: 0.4rem; }
        .ap-tcard-dot {
          width: 3px; height: 3px;
          border-radius: 50%;
          background: var(--rule);
        }
        .ap-tcard-agency {
          font-size: 0.82rem;
          font-weight: 600;
          color: var(--pine-2);
        }
        .ap-tcard-by {
          font-size: 0.78rem;
          color: var(--ink-4);
        }

        /* ── Benefits ─────────────────────────────────────────────────── */
        .ap-bheader {
          border-radius: var(--r-md);
          padding: 0.85rem 1rem;
          background: var(--pine);
          display: flex;
          align-items: center;
          gap: 0.75rem;
          position: relative;
          overflow: hidden;
        }
        .ap-bheader::before {
          content: '';
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(
            -45deg,
            transparent 0px,
            transparent 16px,
            rgba(255,255,255,0.02) 16px,
            rgba(255,255,255,0.02) 17px
          );
          pointer-events: none;
        }
        .ap-bheader-icon {
          position: relative;
          width: 30px; height: 30px;
          border-radius: var(--r-sm);
          background: rgba(181,131,42,0.18);
          border: 1px solid rgba(181,131,42,0.28);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .ap-bheader-title {
          position: relative;
          font-family: 'Playfair Display', serif;
          font-size: 0.935rem;
          font-weight: 700;
          color: #ede8de;
          margin: 0;
          line-height: 1.2;
        }
        .ap-bheader-sub {
          position: relative;
          font-size: 0.72rem;
          color: rgba(237,232,222,0.52);
          margin: 0.15rem 0 0;
          font-weight: 400;
        }

        .ap-benefits { display: flex; flex-direction: column; gap: 0.28rem; }

        .ap-benefit {
          display: flex;
          align-items: center;
          gap: 0.55rem;
          padding: 0.5rem 0.65rem;
          border-radius: var(--r-sm);
          border: 1px solid transparent;
          font-size: 0.83rem;
          font-weight: 400;
          color: var(--ink-2);
          line-height: 1.4;
          transition: background 0.15s, border-color 0.15s;
        }
        .ap-benefit:hover {
          background: var(--surface);
          border-color: var(--rule-2);
        }
        .ap-benefit-emoji { font-size: 0.85rem; width: 1rem; text-align: center; flex-shrink: 0; }
        .ap-benefit-check {
          width: 14px; height: 14px;
          border-radius: 50%;
          background: rgba(30,77,46,0.08);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          margin-left: auto;
        }

        .ap-note {
          font-size: 0.78rem;
          color: var(--ink-4);
          line-height: 1.6;
          margin: 0;
        }
        .ap-note a {
          color: var(--pine-3);
          font-weight: 500;
          text-decoration: none;
          border-bottom: 1px solid rgba(181,131,42,0.4);
          padding-bottom: 1px;
          transition: color 0.15s, border-color 0.15s;
        }
        .ap-note a:hover {
          color: var(--pine);
          border-color: var(--gold);
        }

        /* ── Card footer ──────────────────────────────────────────────── */
        .ap-footer {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.45rem;
          padding: 0.8rem 1.75rem;
          background: var(--surface);
          border-top: 1px solid var(--rule-2);
          font-size: 0.82rem;
          color: var(--ink-4);
          flex-wrap: wrap;
        }
        .ap-footer a {
          display: inline-flex;
          align-items: center;
          gap: 0.15rem;
          color: var(--pine-3);
          font-weight: 600;
          text-decoration: none;
          transition: color 0.15s;
        }
        .ap-footer a:hover { color: var(--pine); }
        .ap-footer-sep {
          width: 3px; height: 3px;
          border-radius: 50%;
          background: var(--rule);
        }
      `}</style>

      <main className="ap-outer">
        <div className="ap-card">

          {/* ── Header ───────────────────────────────────────────────── */}
          <div className="ap-header">
            <div className="ap-logo-mark">
              <KeyRound size={15} color="#d4a24e" strokeWidth={1.75} />
            </div>
            <div className="ap-header-text">
              <p className="ap-header-title">Agency Portal</p>
              <p className="ap-header-sub">FindMaid Dashboard</p>
            </div>
          </div>

          {/* ── Alert ────────────────────────────────────────────────── */}
          <div className="ap-alert">
            <div className="ap-alert-dot" />
            <p>
              Sign in with your <strong>FindMaid agency account</strong> to access your dashboard, listings, and documents.
            </p>
          </div>

          {/* ── Body ─────────────────────────────────────────────────── */}
          <div className="ap-body">

            {/* Col 1 — Testimonials */}
            <div className="ap-col">
              <div className="ap-section-label">
                <Star size={8} strokeWidth={2} />
                What agencies say
              </div>

              {testimonials.map((t) => (
                <div key={t.agency} className="ap-tcard">
                  <div className="ap-tcard-top">
                    <div className="ap-tcard-stars">
                      {Array.from({ length: t.rating }).map((_, i) => (
                        <Star key={i} size={10} color="#b5832a" fill="#b5832a" />
                      ))}
                    </div>
                    <Quote size={14} className="ap-tcard-quote-icon" strokeWidth={1.5} />
                  </div>
                  <p className="ap-tcard-quote">{t.quote}</p>
                  <div className="ap-tcard-meta">
                    <span className="ap-tcard-agency">{t.agency}</span>
                    <span className="ap-tcard-dot" />
                    <span className="ap-tcard-by">{t.author}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="ap-divider" />

            {/* Col 2 — Sign In */}
            <div className="ap-col-mid">
              <div className="ap-section-label">
                <KeyRound size={8} strokeWidth={2} />
                Sign in
              </div>

              <div className="ap-img-wrap">
                <img src={FindMaidImg} alt="FindMaid" />
              </div>

              <form onSubmit={(e) => void handleSubmit(e)} className="ap-form">
                <div>
                  <label htmlFor="username" className="ap-label">Username</label>
                  <div className="ap-field">
                    <span className="ap-field-icon">
                      <User
                        size={13}
                        color={focused === "username" ? "#1e4d2e" : "#c0b8b0"}
                        strokeWidth={1.75}
                      />
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
                      <Lock
                        size={13}
                        color={focused === "password" ? "#1e4d2e" : "#c0b8b0"}
                        strokeWidth={1.75}
                      />
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
                        ? <EyeOff size={13} strokeWidth={1.75} />
                        : <Eye size={13} strokeWidth={1.75} />}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={isSubmitting} className="ap-btn">
                  {isSubmitting
                    ? <><span className="ap-spinner" />Signing in…</>
                    : <>Sign in to Dashboard <ArrowRight size={13} strokeWidth={2.5} /></>
                  }
                </button>

                <div className="ap-ssl">
                  <Shield size={10} color="#b0a89e" strokeWidth={2} />
                  <span>256-bit SSL encrypted</span>
                </div>
              </form>
            </div>

            <div className="ap-divider" />

            {/* Col 3 — Benefits */}
            <div className="ap-col">
              <div className="ap-section-label">
                <Sparkles size={8} strokeWidth={2} />
                Platform features
              </div>

              <div className="ap-bheader">
                <div className="ap-bheader-icon">
                  <Sparkles size={13} color="#d4a24e" strokeWidth={1.75} />
                </div>
                <div>
                  <p className="ap-bheader-title">New to FindMaid?</p>
                  <p className="ap-bheader-sub">Join agencies already on the platform</p>
                </div>
              </div>

              <p className="ap-note">
                Sign-up is currently by invitation. Once registered, you unlock:
              </p>

              <div className="ap-benefits">
                {benefits.map((b) => (
                  <div key={b.text} className="ap-benefit">
                    <span className="ap-benefit-emoji">{b.icon}</span>
                    <span style={{ flex: 1 }}>{b.text}</span>
                    <div className="ap-benefit-check">
                      <Check size={8} color="#1e4d2e" strokeWidth={2.5} />
                    </div>
                  </div>
                ))}
              </div>

              <p className="ap-note">
                By using this platform you agree to our{" "}
                <Link to="/faq">Terms of Service</Link>.
              </p>
            </div>

          </div>

          {/* ── Card footer ──────────────────────────────────────────── */}
          <div className="ap-footer">
            <span>Looking for the employer login?</span>
            <span className="ap-footer-sep" />
            <Link to="/employer-login">
              Employer Login <ChevronRight size={12} strokeWidth={2.5} />
            </Link>
          </div>

        </div>
      </main>
    </div>
  );
}