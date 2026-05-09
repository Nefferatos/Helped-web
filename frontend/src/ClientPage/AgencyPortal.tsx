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
  ChevronRight,
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
    agency: "Dans Services",
    quote:
      "Since 2018, FindMaid has been a reliable tool — we receive many phone calls and emails from employers brought in by the platform.",
    author: "Mr. Khyle",
    rating: 5,
  },
  {
    agency: "1st Choice Pte Ltd",
    quote:
      "The backend auto-generates all employment contracts in PDF — Salary Schedule, Standard Contract, Insurance Forms — saving us huge time and cost.",
    author: "Mr. Jonathan",
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
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Fraunces:ital,opsz,wght@0,9..144,600;0,9..144,700;1,9..144,500&display=swap');

        /* ── Tokens ───────────────────────────────────────────────────── */
        :root {
          --pine:       #0b2217;
          --pine-2:     #163629;
          --pine-3:     #1f4d3b;
          --pine-4:     #2b6652;
          --gold:       #c8963e;
          --gold-2:     #e3b96a;
          --gold-3:     #f5dca0;
          --gold-pale:  #fdf6e3;
          --surface:    #f8f5ef;
          --surface-2:  #f0ece3;
          --white:      #ffffff;
          --ink:        #100e0b;
          --ink-2:      #2c2720;
          --ink-3:      #5a5248;
          --ink-4:      #8c847a;
          --rule:       #d9d3c9;
          --rule-2:     #e8e3da;
          --shadow-sm:  0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
          --shadow-md:  0 4px 16px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04);
          --shadow-lg:  0 20px 60px rgba(11,34,23,0.13), 0 4px 16px rgba(0,0,0,0.06);
          --radius-sm:  8px;
          --radius-md:  12px;
          --radius-lg:  20px;
          --radius-xl:  28px;
        }

        /* ── Root ─────────────────────────────────────────────────────── */
        .ap-root {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: var(--surface);
          font-family: 'Inter', system-ui, sans-serif;
          background-image:
            radial-gradient(ellipse 70% 55% at 15% -5%, rgba(200,150,62,0.09) 0%, transparent 65%),
            radial-gradient(ellipse 55% 45% at 88% 105%, rgba(11,34,23,0.09) 0%, transparent 60%);
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
          max-width: 1080px;
          background: var(--white);
          border-radius: var(--radius-xl);
          border: 1px solid var(--rule);
          box-shadow: var(--shadow-lg);
          overflow: hidden;
          animation: cardReveal 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        @keyframes cardReveal {
          from { opacity: 0; transform: translateY(20px) scale(0.99); }
          to   { opacity: 1; transform: none; }
        }

        /* ── Card header ──────────────────────────────────────────────── */
        .ap-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0 1.75rem;
          height: 60px;
          background: var(--pine);
          position: relative;
          overflow: hidden;
        }
        /* Decorative light beam */
        .ap-header::before {
          content: '';
          position: absolute;
          top: -40px; right: 120px;
          width: 160px; height: 160px;
          background: radial-gradient(circle, rgba(200,150,62,0.18) 0%, transparent 70%);
          pointer-events: none;
        }
        /* Subtle stripes */
        .ap-header::after {
          content: '';
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(
            -48deg,
            transparent 0px,
            transparent 18px,
            rgba(255,255,255,0.018) 18px,
            rgba(255,255,255,0.018) 19px
          );
          pointer-events: none;
        }

        .ap-logo-mark {
          position: relative; z-index: 1;
          width: 36px; height: 36px;
          border-radius: 10px;
          background: rgba(200,150,62,0.16);
          border: 1px solid rgba(200,150,62,0.28);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }

        .ap-header-text { flex: 1; position: relative; z-index: 1; }
        .ap-header-title {
          font-family: 'Fraunces', serif;
          font-size: 1.05rem;
          font-weight: 700;
          color: #f0ebe0;
          margin: 0;
          line-height: 1;
          letter-spacing: 0.005em;
        }
        .ap-header-sub {
          font-size: 0.68rem;
          font-weight: 500;
          color: rgba(240,235,224,0.55);
          margin: 0.2rem 0 0;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .ap-header-badge {
          position: relative; z-index: 1;
          display: flex; align-items: center; gap: 0.4rem;
          padding: 0.28rem 0.7rem;
          border-radius: 20px;
          background: rgba(200,150,62,0.13);
          border: 1px solid rgba(200,150,62,0.22);
          font-size: 0.72rem;
          font-weight: 600;
          color: var(--gold-2);
          letter-spacing: 0.04em;
          white-space: nowrap;
        }

        /* ── Alert banner ─────────────────────────────────────────────── */
        .ap-alert {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1.75rem;
          background: #fffcf2;
          border-bottom: 1px solid #eee2b2;
          border-left: 3px solid var(--gold);
        }
        .ap-alert-icon {
          width: 26px; height: 26px;
          border-radius: 50%;
          background: rgba(180,83,9,0.08);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .ap-alert p {
          margin: 0;
          font-size: 0.845rem;
          color: var(--ink-2);
          line-height: 1.5;
        }
        .ap-alert strong { color: var(--pine-2); font-weight: 600; }

        /* ── Three-column body ────────────────────────────────────────── */
        .ap-body {
          display: grid;
          grid-template-columns: 1fr 1px 1.1fr 1px 1fr;
        }
        @media (max-width: 840px) {
          .ap-body { grid-template-columns: 1fr; }
          .ap-rule { display: none; }
        }

        .ap-rule {
          background: var(--rule-2);
          align-self: stretch;
          margin: 0;
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
          gap: 1.1rem;
          background: linear-gradient(170deg, #fafaf8 0%, var(--white) 100%);
        }

        /* ── Section eyebrow ──────────────────────────────────────────── */
        .ap-eyebrow {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--ink-3);
        }
        .ap-eyebrow-line {
          width: 16px; height: 1px;
          background: var(--rule);
        }

        /* ── Image ────────────────────────────────────────────────────── */
        .ap-img-wrap {
          width: 100%;
          border-radius: var(--radius-md);
          overflow: hidden;
          border: 1px solid var(--rule);
          background: var(--surface);
          position: relative;
        }
        .ap-img-wrap::after {
          content: '';
          position: absolute;
          inset: 0;
          box-shadow: inset 0 -20px 28px rgba(255,255,255,0.6);
          pointer-events: none;
        }
        .ap-img-wrap img {
          width: 100%;
          height: auto;
          display: block;
        }

        /* ── Form ─────────────────────────────────────────────────────── */
        .ap-form { display: flex; flex-direction: column; gap: 0.875rem; }

        .ap-label {
          display: block;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--pine);
          margin-bottom: 0.4rem;
        }

        .ap-field { position: relative; }

        .ap-field-icon {
          position: absolute;
          left: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
          display: flex;
          transition: color 0.15s;
        }

        .ap-input {
          width: 100%;
          border: 1.5px solid var(--rule);
          border-radius: var(--radius-sm);
          background: var(--white);
          padding: 0.72rem 0.875rem 0.72rem 2.2rem;
          font-size: 0.9rem;
          font-weight: 500;
          font-family: 'Inter', sans-serif;
          color: var(--ink);
          outline: none;
          box-shadow: var(--shadow-sm);
          transition: border-color 0.18s, box-shadow 0.18s, background 0.18s;
          box-sizing: border-box;
        }
        .ap-input::placeholder {
          color: var(--ink-4);
          font-weight: 400;
        }
        .ap-input:focus {
          border-color: var(--pine-3);
          background: #f5faf8;
          box-shadow: 0 0 0 3px rgba(27,77,59,0.1), var(--shadow-sm);
        }
        .ap-input:disabled { opacity: 0.55; }
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
          border-radius: var(--radius-sm);
          padding: 0.8rem 1.25rem;
          font-size: 0.875rem;
          font-family: 'Inter', sans-serif;
          font-weight: 600;
          letter-spacing: 0.01em;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          position: relative;
          overflow: hidden;
          background: var(--pine);
          color: var(--white);
          box-shadow: 0 2px 8px rgba(11,34,23,0.25), inset 0 1px 0 rgba(255,255,255,0.07);
          transition: background 0.2s, box-shadow 0.2s, transform 0.15s;
        }
        /* Shimmer sweep */
        .ap-btn::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.09) 50%, transparent 65%);
          transform: translateX(-100%);
          transition: transform 0.55s ease;
        }
        .ap-btn:hover:not(:disabled)::after { transform: translateX(100%); }
        .ap-btn:hover:not(:disabled) {
          background: var(--pine-2);
          box-shadow: 0 6px 22px rgba(11,34,23,0.32), inset 0 1px 0 rgba(255,255,255,0.09);
          transform: translateY(-1px);
        }
        .ap-btn:active:not(:disabled) { transform: none; box-shadow: 0 1px 4px rgba(11,34,23,0.2); }
        .ap-btn:disabled { opacity: 0.55; cursor: not-allowed; }

        /* Loading spinner */
        .ap-spinner {
          width: 14px; height: 14px;
          border: 2px solid rgba(255,255,255,0.25);
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
          font-size: 0.76rem;
          color: var(--ink-4);
          letter-spacing: 0.01em;
        }

        /* ── Testimonials ─────────────────────────────────────────────── */
        .ap-tcard {
          background: var(--surface);
          border: 1px solid var(--rule-2);
          border-radius: var(--radius-md);
          padding: 1.05rem 1.05rem 1.05rem 1.3rem;
          position: relative;
          overflow: hidden;
          transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
          animation: slideUp 0.45s ease both;
        }
        .ap-tcard:nth-child(2) { animation-delay: 0.07s; }
        .ap-tcard:nth-child(3) { animation-delay: 0.14s; }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: none; }
        }
        .ap-tcard:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
          border-color: var(--rule);
        }
        /* Gold left accent bar */
        .ap-tcard::before {
          content: '';
          position: absolute;
          left: 0; top: 14px; bottom: 14px; width: 3px;
          background: linear-gradient(to bottom, var(--gold), var(--gold-2));
          border-radius: 0 3px 3px 0;
        }

        .ap-tcard-stars {
          display: flex; gap: 2px;
          margin-bottom: 0.55rem;
        }

        .ap-tcard-quote {
          font-size: 0.845rem;
          line-height: 1.75;
          color: var(--ink-2);
          font-style: italic;
          margin-bottom: 0.65rem;
          position: relative;
        }
        .ap-tcard-quote::before {
          content: '\u201C';
          font-family: 'Fraunces', serif;
          font-size: 1.8rem;
          line-height: 0;
          vertical-align: -0.5rem;
          color: var(--gold);
          margin-right: 0.1rem;
          opacity: 0.55;
        }

        .ap-tcard-meta { display: flex; align-items: baseline; gap: 0.5rem; }
        .ap-tcard-agency {
          font-size: 0.845rem;
          font-weight: 700;
          color: var(--pine-2);
        }
        .ap-tcard-by {
          font-size: 0.775rem;
          color: var(--ink-3);
        }

        /* ── Benefits ─────────────────────────────────────────────────── */
        .ap-bheader {
          border-radius: var(--radius-md);
          padding: 0.875rem 1rem;
          background: linear-gradient(135deg, #a87828, var(--gold), var(--gold-2));
          display: flex;
          align-items: center;
          gap: 0.75rem;
          box-shadow: 0 4px 16px rgba(180,130,40,0.22), inset 0 1px 0 rgba(255,255,255,0.28);
        }
        .ap-bheader-icon {
          width: 32px; height: 32px;
          border-radius: var(--radius-sm);
          background: rgba(255,255,255,0.22);
          border: 1px solid rgba(255,255,255,0.3);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .ap-bheader-title {
          font-family: 'Fraunces', serif;
          font-size: 0.975rem;
          font-weight: 700;
          color: rgba(20,10,0,0.92);
          margin: 0;
          line-height: 1.2;
        }
        .ap-bheader-sub {
          font-size: 0.76rem;
          color: rgba(35,18,0,0.72);
          margin: 0.1rem 0 0;
          font-weight: 500;
        }

        .ap-benefits { display: flex; flex-direction: column; gap: 0.3rem; }

        .ap-benefit {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0.55rem 0.7rem;
          border-radius: var(--radius-sm);
          background: var(--surface);
          border: 1px solid var(--rule-2);
          font-size: 0.845rem;
          font-weight: 500;
          color: var(--ink);
          line-height: 1.4;
          cursor: default;
          transition: background 0.15s, border-color 0.15s, transform 0.13s;
        }
        .ap-benefit:hover {
          background: var(--surface-2);
          border-color: var(--rule);
          transform: translateX(2px);
        }
        .ap-benefit-emoji { font-size: 0.875rem; width: 1rem; text-align: center; flex-shrink: 0; }
        .ap-benefit-check {
          width: 16px; height: 16px;
          border-radius: 50%;
          background: rgba(27,77,59,0.09);
          border: 1px solid rgba(27,77,59,0.1);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          margin-left: auto;
        }

        .ap-signup-link {
          font-size: 0.8rem;
          color: var(--ink-3);
          line-height: 1.6;
          margin: 0;
        }
        .ap-signup-link a {
          color: var(--pine-2);
          font-weight: 600;
          text-decoration: none;
          border-bottom: 1.5px solid rgba(200,150,62,0.5);
          padding-bottom: 1px;
          transition: color 0.15s, border-color 0.15s;
        }
        .ap-signup-link a:hover {
          color: var(--pine);
          border-color: var(--gold);
        }

        /* ── Card footer ──────────────────────────────────────────────── */
        .ap-footer {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.85rem 1.75rem;
          background: var(--surface);
          border-top: 1px solid var(--rule-2);
          font-size: 0.845rem;
          color: var(--ink-3);
          flex-wrap: wrap;
        }
        .ap-footer a {
          display: inline-flex;
          align-items: center;
          gap: 0.2rem;
          color: var(--pine-2);
          font-weight: 600;
          text-decoration: none;
          transition: color 0.15s;
        }
        .ap-footer a:hover { color: var(--pine); }
      `}</style>

      <main className="ap-outer">
        <div className="ap-card">

          {/* ── Header ───────────────────────────────────────────────── */}
          <div className="ap-header">
            <div className="ap-logo-mark">
              <KeyRound size={16} color="#e3b96a" strokeWidth={1.75} />
            </div>
            <div className="ap-header-text">
              <p className="ap-header-title">Agency Portal</p>
              <p className="ap-header-sub">FindMaid Dashboard</p>
            </div>
          </div>

          {/* ── Alert ────────────────────────────────────────────────── */}
          <div className="ap-alert">
            <div className="ap-alert-icon">
              <Info size={12} color="#b45309" strokeWidth={2} />
            </div>
            <p>
              Sign in with your <strong>FindMaid agency account</strong> to access your dashboard, listings, and documents.
            </p>
          </div>

          {/* ── Body ─────────────────────────────────────────────────── */}
          <div className="ap-body">

            {/* Col 1 — Testimonials */}
            <div className="ap-col">
              <div className="ap-eyebrow">
                <span className="ap-eyebrow-line" />
                <Star size={9} strokeWidth={2} />
                Agency Reviews
              </div>

              {testimonials.map((t) => (
                <div key={t.agency} className="ap-tcard">
                  <div className="ap-tcard-stars">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} size={10} color="#c8963e" fill="#c8963e" />
                    ))}
                  </div>
                  <p className="ap-tcard-quote">{t.quote}"</p>
                  <div className="ap-tcard-meta">
                    <span className="ap-tcard-agency">{t.agency}</span>
                    <span className="ap-tcard-by">— {t.author}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="ap-rule" />

            {/* Col 2 — Sign In */}
            <div className="ap-col-mid">
              <div className="ap-eyebrow">
                <span className="ap-eyebrow-line" />
                <KeyRound size={9} strokeWidth={2} />
                Sign In
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
                        color={focused === "username" ? "#1f4d3b" : "#c4bfb8"}
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
                        color={focused === "password" ? "#1f4d3b" : "#c4bfb8"}
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
                        ? <EyeOff size={14} strokeWidth={1.75} />
                        : <Eye size={14} strokeWidth={1.75} />}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={isSubmitting} className="ap-btn">
                  {isSubmitting
                    ? <><span className="ap-spinner" />Signing in…</>
                    : <>Sign in to Dashboard <ArrowRight size={14} strokeWidth={2.5} /></>
                  }
                </button>

                <div className="ap-ssl">
                  <Shield size={11} color="#b0a99f" strokeWidth={2} />
                  <span>256-bit SSL encrypted</span>
                </div>
              </form>
            </div>

            <div className="ap-rule" />

            {/* Col 3 — Benefits */}
            <div className="ap-col">
              <div className="ap-eyebrow">
                <span className="ap-eyebrow-line" />
                <Sparkles size={9} strokeWidth={2} />
                Platform Features
              </div>

              <div className="ap-bheader">
                <div className="ap-bheader-icon">
                  <Sparkles size={14} color="rgba(40,20,0,0.7)" strokeWidth={1.75} />
                </div>
                <div>
                  <p className="ap-bheader-title">New to FindMaid?</p>
                  <p className="ap-bheader-sub">Join 500+ agencies on the platform</p>
                </div>
              </div>

              <p className="ap-signup-link">
                Sign up is not available for now{" "}
                and unlock powerful agency tools:
              </p>
              {/* <p className="ap-signup-link">
                <Link to="/login">Sign up for a FindMaid plan</Link>{" "}
                and unlock powerful agency tools:
              </p> */}

              <div className="ap-benefits">
                {benefits.map((b) => (
                  <div key={b.text} className="ap-benefit">
                    <span className="ap-benefit-emoji">{b.icon}</span>
                    <span style={{ flex: 1 }}>{b.text}</span>
                    <div className="ap-benefit-check">
                      <Check size={9} color="#1f4d3b" strokeWidth={2.5} />
                    </div>
                  </div>
                ))}
              </div>

              <p className="ap-signup-link">
                By creating an account you agree to our{" "}
                <Link to="/faq">Terms of Service</Link>.
              </p>
            </div>

          </div>

          {/* ── Card footer ──────────────────────────────────────────── */}
          <div className="ap-footer">
            <span>Looking for the employer login?</span>
            <Link to="/employer-login">
              Go to Employer Login <ChevronRight size={13} strokeWidth={2.5} />
            </Link>
          </div>

        </div>
      </main>
    </div>
  );
}