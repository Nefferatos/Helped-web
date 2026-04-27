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
    <div className="client-page-theme min-h-screen flex flex-col" style={{ background: "#f4f1eb" }}>
      {!isEmbedded && <PublicSiteNavbar />}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&display=swap');

        /* ── Outer wrapper: full height, centered both axes ── */
        .ap-outer {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2.5rem 1.25rem 4rem;
          min-height: 0;
        }

        /* ── Single unified container ── */
        .ap-container {
          width: 100%;
          max-width: 1020px;
          background: #fff;
          border: 1px solid #e4dfd5;
          border-radius: 20px;
          box-shadow: 0 8px 48px rgba(0,0,0,0.09), 0 2px 8px rgba(0,0,0,0.04);
          overflow: hidden;
        }

        /* ── Top bar inside container ── */
        .ap-topbar {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem 1.5rem;
          background: linear-gradient(135deg, #0d2b1e 0%, #1a3c2e 100%);
          border-bottom: 1px solid rgba(255,255,255,0.07);
        }
        .ap-topbar-icon {
          width: 36px; height: 36px;
          border-radius: 10px;
          background: rgba(201,168,76,0.18);
          border: 1px solid rgba(201,168,76,0.35);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .ap-topbar-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.15rem;
          font-weight: 600;
          color: #f9f6f1;
          letter-spacing: 0.01em;
        }
        .ap-topbar-sub {
          font-size: 0.72rem;
          color: rgba(249,246,241,0.45);
          margin-left: auto;
          white-space: nowrap;
        }

        /* ── Info banner row ── */
        .ap-infobanner {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.85rem 1.5rem;
          background: linear-gradient(to right, #fffbeb, #fef9e0);
          border-bottom: 1px solid #f0d878;
          border-left: 3.5px solid #c9a84c;
        }
        .ap-infobanner p {
          font-size: 0.8125rem;
          color: #1a1a1a;
          line-height: 1.5;
          margin: 0;
        }

        /* ── Three-column body ── */
        .ap-body {
          display: grid;
          grid-template-columns: 1fr 1px 1fr 1px 1fr;
          min-height: 520px;
        }
        @media (max-width: 860px) {
          .ap-body {
            grid-template-columns: 1fr;
          }
          .ap-divider { display: none; }
        }

        .ap-divider {
          background: #ece8e0;
          align-self: stretch;
        }

        .ap-col {
          padding: 1.75rem 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        /* ── Sign-in column: center everything vertically ── */
        .ap-col-signin {
          padding: 1.75rem 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          justify-content: center;
        }

        /* ── Column headers ── */
        .ap-col-label {
          font-size: 0.65rem;
          font-weight: 700;
          letter-spacing: 0.11em;
          text-transform: uppercase;
          color: #8a7e6a;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.1rem;
        }
        .ap-col-label::before {
          content: '';
          width: 1.5rem; height: 1.5px;
          background: currentColor;
          flex-shrink: 0;
          opacity: 0.5;
        }

        /* ── Sign-in image: full width, natural aspect ratio, no cropping ── */
        .ap-signin-img-wrap {
          width: 100%;
          border-radius: 10px;
          overflow: hidden;
          border: 1px solid #ece8e0;
          background: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .ap-signin-img {
          width: 100%;
          height: auto;
          display: block;
          object-fit: contain;
        }

        .ap-field-label {
          display: block;
          font-size: 0.67rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.09em;
          color: #1a3c2e;
          margin-bottom: 0.4rem;
        }
        .ap-input-wrap { position: relative; }
        .ap-input-icon {
          position: absolute;
          left: 0.65rem;
          top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
          transition: color 0.15s;
        }
        .ap-input {
          width: 100%;
          border: 1.5px solid #e0dcd2;
          border-radius: 9px;
          background: #fafaf8;
          padding: 0.6rem 0.75rem 0.6rem 2.25rem;
          font-size: 0.875rem;
          color: #1a1a1a;
          outline: none;
          transition: border-color 0.18s, box-shadow 0.18s, background 0.18s;
        }
        .ap-input::placeholder { color: #c0bdb8; }
        .ap-input:focus {
          border-color: #1a3c2e;
          background: #f4faf7;
          box-shadow: 0 0 0 3px rgba(26,60,46,0.08);
        }
        .ap-input:disabled { opacity: 0.6; }

        .ap-submit {
          width: 100%;
          background: linear-gradient(135deg, #1a3c2e, #0d2b1e);
          color: #fff;
          border: none;
          border-radius: 9px;
          padding: 0.75rem 1.25rem;
          font-size: 0.875rem;
          font-weight: 700;
          letter-spacing: 0.03em;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          cursor: pointer;
          transition: box-shadow 0.2s, transform 0.15s;
        }
        .ap-submit:hover:not(:disabled) {
          box-shadow: 0 6px 20px rgba(26,60,46,0.32);
          transform: translateY(-1px);
        }
        .ap-submit:active { transform: none; }
        .ap-submit:disabled { opacity: 0.65; cursor: not-allowed; }

        .ap-ssl {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          color: #aaa;
          font-size: 0.69rem;
          margin-top: 0.1rem;
        }

        /* ── Testimonials col ── */
        .ap-testimonial {
          background: #faf8f3;
          border: 1px solid #e8e2d4;
          border-radius: 12px;
          padding: 1rem 1rem 1rem 1.25rem;
          position: relative;
          overflow: hidden;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .ap-testimonial:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.07);
        }
        .ap-testimonial::before {
          content: '';
          position: absolute;
          left: 0; top: 0; bottom: 0;
          width: 3px;
          background: linear-gradient(to bottom, #c9a84c, #e8c97a);
          border-radius: 4px 0 0 4px;
        }
        .ap-testimonial-quote {
          font-size: 0.8125rem;
          line-height: 1.65;
          color: #2a2a2a;
          margin-bottom: 0.65rem;
          font-style: italic;
        }
        .ap-testimonial-stars {
          display: flex;
          gap: 2px;
          margin-bottom: 0.5rem;
        }
        .ap-testimonial-author {
          font-size: 0.73rem;
          font-weight: 700;
          color: #1a3c2e;
        }
        .ap-testimonial-sub {
          font-size: 0.69rem;
          color: #999;
          margin-top: 0.1rem;
        }

        /* ── Benefits col ── */
        .ap-benefits-header {
          background: linear-gradient(135deg, #b8922e, #c9a84c, #e8c97a);
          border-radius: 10px;
          padding: 0.85rem 1rem;
          display: flex;
          align-items: center;
          gap: 0.65rem;
        }
        .ap-benefits-header-ico {
          width: 32px; height: 32px;
          border-radius: 8px;
          background: rgba(255,255,255,0.22);
          border: 1px solid rgba(255,255,255,0.3);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .ap-benefits-header-title {
          font-size: 0.875rem;
          font-weight: 700;
          color: rgba(60,35,0,0.88);
          margin: 0;
        }
        .ap-benefits-header-sub {
          font-size: 0.69rem;
          color: rgba(60,35,0,0.52);
          margin: 0.1rem 0 0;
        }

        .ap-benefit-item {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          padding: 0.55rem 0.75rem;
          border-radius: 8px;
          background: #f8f6f1;
          border: 1px solid #ece8de;
          font-size: 0.8rem;
          color: #1a1a1a;
          transition: background 0.15s, border-color 0.15s, transform 0.12s;
        }
        .ap-benefit-item:hover {
          background: #f1ede4;
          border-color: #d9d3c4;
          transform: translateX(2px);
        }
        .ap-benefit-icon { font-size: 0.9rem; flex-shrink: 0; width: 1.2rem; text-align: center; }
        .ap-benefit-check {
          width: 18px; height: 18px;
          border-radius: 50%;
          background: rgba(26,60,46,0.09);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          margin-left: auto;
        }

        /* ── Footer row inside container ── */
        .ap-footer-row {
          padding: 0.875rem 1.5rem;
          background: #fafaf8;
          border-top: 1px solid #ece8e0;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          font-size: 0.8125rem;
          color: #666;
          flex-wrap: wrap;
        }
        .ap-footer-row a {
          color: #1a3c2e;
          font-weight: 700;
          text-decoration: underline;
          text-underline-offset: 2px;
        }
      `}</style>

      <main className="ap-outer flex-1">
        <div className="ap-container">

          {/* ── Top bar ── */}
          <div className="ap-topbar">
            <div className="ap-topbar-icon">
              <KeyRound size={16} color="#e8c97a" strokeWidth={1.75} />
            </div>
            <span className="ap-topbar-title">Agency Portal</span>
            <span className="ap-topbar-sub">FindMaid Agency Dashboard</span>
          </div>

          {/* ── Info banner ── */}
          <div className="ap-infobanner">
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(180,83,9,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Info size={13} color="#b45309" strokeWidth={2} />
            </div>
            <p>
              Sign in with your <strong style={{ color: "#1a3c2e" }}>FindMaid agency account</strong> to access your dashboard, listings, and documents.
            </p>
          </div>

          {/* ── Three-column body ── */}
          <div className="ap-body">

            {/* ── Col 1: Testimonials ── */}
            <div className="ap-col">
              <div className="ap-col-label">
                <Star size={11} />
                What agencies say
              </div>

              {testimonials.map((t) => (
                <div key={t.agency} className="ap-testimonial">
                  <div className="ap-testimonial-stars">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} size={10} color="#c9a84c" fill="#c9a84c" />
                    ))}
                  </div>
                  <p className="ap-testimonial-quote">"{t.quote}"</p>
                  <div className="ap-testimonial-author">{t.agency}</div>
                  <div className="ap-testimonial-sub">— {t.author}</div>
                </div>
              ))}
            </div>

            <div className="ap-divider" />

            {/* ── Col 2: Sign In (vertically centered) ── */}
            <div className="ap-col-signin">
              <div className="ap-col-label">
                <KeyRound size={11} />
                Sign In
              </div>

              {/* Banner image — full width, no cropping */}
              <div className="ap-signin-img-wrap">
                <img src={FindMaidImg} alt="Agency banner" className="ap-signin-img" />
              </div>

              <form onSubmit={(e) => void handleSubmit(e)} style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
                {/* Username */}
                <div>
                  <label htmlFor="username" className="ap-field-label">Username</label>
                  <div className="ap-input-wrap">
                    <span className="ap-input-icon">
                      <User size={13} color={focused === "username" ? "#1a3c2e" : "#c0bdb8"} strokeWidth={1.75} />
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

                {/* Password */}
                <div>
                  <label htmlFor="password" className="ap-field-label">Password</label>
                  <div className="ap-input-wrap">
                    <span className="ap-input-icon">
                      <Lock size={13} color={focused === "password" ? "#1a3c2e" : "#c0bdb8"} strokeWidth={1.75} />
                    </span>
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
                      className="ap-input"
                    />
                  </div>
                </div>

                <button type="submit" disabled={isSubmitting} className="ap-submit">
                  {isSubmitting ? "Signing in…" : "Sign in to Dashboard"}
                  {!isSubmitting && <ArrowRight size={14} strokeWidth={2.5} />}
                </button>

                <div className="ap-ssl">
                  <Shield size={11} color="#aaa" strokeWidth={2} />
                  <span>256-bit SSL encrypted</span>
                </div>
              </form>
            </div>

            <div className="ap-divider" />

            {/* ── Col 3: Benefits ── */}
            <div className="ap-col">
              <div className="ap-col-label">
                <Sparkles size={11} />
                Platform features
              </div>

              <div className="ap-benefits-header">
                <div className="ap-benefits-header-ico">
                  <Sparkles size={15} color="rgba(60,35,0,0.7)" strokeWidth={1.75} />
                </div>
                <div>
                  <p className="ap-benefits-header-title">New to FindMaid?</p>
                  <p className="ap-benefits-header-sub">Join 500+ agencies on the platform</p>
                </div>
              </div>

              <p style={{ fontSize: "0.8125rem", color: "#444", lineHeight: 1.6, margin: 0 }}>
                <Link to="/login" style={{ color: "#1a3c2e", fontWeight: 700, textDecoration: "underline", textUnderlineOffset: 2 }}>
                  Sign up for a FindMaid plan
                </Link>{" "}
                and unlock all features:
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                {benefits.map((b) => (
                  <div key={b.text} className="ap-benefit-item">
                    <span className="ap-benefit-icon">{b.icon}</span>
                    <span style={{ flex: 1, lineHeight: 1.4 }}>{b.text}</span>
                    <div className="ap-benefit-check">
                      <Check size={10} color="#1a3c2e" strokeWidth={2.5} />
                    </div>
                  </div>
                ))}
              </div>

              <p style={{ fontSize: "0.69rem", color: "#999", lineHeight: 1.6, margin: 0 }}>
                By creating an account you agree to our{" "}
                <Link to="/faq" style={{ color: "#1a3c2e", fontWeight: 600, textDecoration: "underline", textUnderlineOffset: 2 }}>
                  Terms of Service
                </Link>.
              </p>
            </div>

          </div>

          {/* ── Footer row inside container ── */}
          <div className="ap-footer-row">
            <span>Looking for the employer login?</span>
            <Link to="/employer-login">Go to Employer Login →</Link>
          </div>

        </div>
      </main>
    </div>
  );
}