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
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');

        :root {
          --forest: #1a3c2e;
          --forest-deep: #0d2b1e;
          --forest-mid: #2a5c46;
          --gold: #c9a84c;
          --gold-light: #e8c97a;
          --gold-pale: #fdf6e3;
          --cream: #f8f6f1;
          --border: #e0dcd2;
          --text: #1a1a1a;
          --muted: #666;
        }

        * { box-sizing: border-box; }

        .ap-page {
          min-height: 100vh;
          background: var(--cream);
          background-image:
            radial-gradient(ellipse at 10% 0%, rgba(26,60,46,0.06) 0%, transparent 55%),
            radial-gradient(ellipse at 90% 100%, rgba(201,168,76,0.08) 0%, transparent 55%);
          font-family: 'DM Sans', sans-serif;
        }

        /* ── Hero stripe ── */
        .ap-hero {
          background: linear-gradient(135deg, var(--forest-deep) 0%, var(--forest) 55%, var(--forest-mid) 100%);
          padding: 40px 24px 44px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }
        .ap-hero::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            radial-gradient(circle at 20% 50%, rgba(201,168,76,0.12) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(255,255,255,0.04) 0%, transparent 45%);
          pointer-events: none;
        }
        .ap-hero-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          background: rgba(201,168,76,0.15);
          border: 1px solid rgba(201,168,76,0.35);
          border-radius: 100px;
          padding: 5px 14px;
          margin-bottom: 14px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--gold-light);
          position: relative;
        }
        .ap-hero-title {
          font-family: 'Playfair Display', serif;
          font-size: 32px;
          font-weight: 800;
          color: #fff;
          margin: 0 0 10px;
          line-height: 1.2;
          letter-spacing: -0.3px;
          position: relative;
        }
        .ap-hero-title span {
          background: linear-gradient(90deg, var(--gold-light), #fff6cc);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .ap-hero-sub {
          font-size: 14px;
          color: rgba(255,255,255,0.6);
          margin: 0;
          position: relative;
        }
        .ap-hero-stats {
          display: flex;
          justify-content: center;
          gap: 32px;
          margin-top: 24px;
          position: relative;
        }
        .ap-stat {
          text-align: center;
        }
        .ap-stat-num {
          font-family: 'Playfair Display', serif;
          font-size: 22px;
          font-weight: 700;
          color: var(--gold-light);
          display: block;
          line-height: 1;
        }
        .ap-stat-label {
          font-size: 10.5px;
          color: rgba(255,255,255,0.5);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-top: 3px;
          display: block;
        }
        .ap-stat-divider {
          width: 1px;
          background: rgba(255,255,255,0.12);
          align-self: stretch;
        }

        /* ── Body layout ── */
        .ap-body-wrap {
          max-width: 1080px;
          margin: 0 auto;
          padding: 36px 24px 64px;
          display: grid;
          grid-template-columns: 280px 1fr;
          gap: 32px;
          align-items: start;
        }

        /* ── Info banner ── */
        .ap-info-banner {
          background: linear-gradient(135deg, #fffbeb, #fef9e0);
          border: 1px solid #f0d060;
          border-left: 3px solid #c9a84c;
          border-radius: 10px;
          padding: 11px 15px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .ap-info-banner p {
          font-size: 13px;
          color: #1a1a1a;
          font-family: 'DM Sans', sans-serif;
          margin: 0;
          line-height: 1.5;
        }

        /* ── Cards ── */
        .ap-cards-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          align-items: stretch;
        }

        .ap-card {
          background: #ffffff;
          border-radius: 20px;
          border: 1px solid var(--border);
          box-shadow: 0 4px 28px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          transition: box-shadow 0.25s;
        }
        .ap-card:hover {
          box-shadow: 0 8px 40px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.05);
        }

        /* ── Card header ── */
        .ap-card-header-dark {
          background: linear-gradient(135deg, var(--forest-deep), var(--forest));
          padding: 16px 22px;
          display: flex;
          align-items: center;
          gap: 10;
          flex-shrink: 0;
        }
        .ap-card-header-gold {
          background: linear-gradient(135deg, #b8922e, var(--gold), var(--gold-light), var(--gold));
          padding: 16px 22px;
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }

        /* ── Image banner — tighter ── */
        .ap-img-banner {
          width: 100%;
          height: 118px;
          position: relative;
          overflow: hidden;
          flex-shrink: 0;
        }
        .ap-img-banner img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .ap-img-banner::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 40px;
          background: linear-gradient(to bottom, transparent, rgba(255,255,255,0.9));
          pointer-events: none;
        }

        /* ── Form ── */
        .ap-form-inner {
          padding: 18px 22px 20px;
          display: flex;
          flex-direction: column;
          flex: 1;
        }

        .ap-field-label {
          display: block;
          font-size: 11px;
          font-weight: 700;
          color: var(--forest);
          font-family: 'DM Sans', sans-serif;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 7px;
        }

        .ap-input-wrap {
          position: relative;
        }

        .ap-input {
          width: 100%;
          border-radius: 10px;
          border: 1.5px solid var(--border);
          background: #fafaf8;
          padding: 10px 12px 10px 38px;
          font-size: 14px;
          color: var(--text);
          font-family: 'DM Sans', sans-serif;
          outline: none;
          transition: all 0.2s;
        }
        .ap-input:focus {
          border-color: var(--forest);
          background: #f4faf7;
          box-shadow: 0 0 0 3px rgba(26,60,46,0.08);
        }
        .ap-input::placeholder { color: #bbb; }

        .ap-input-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          transition: color 0.2s;
          pointer-events: none;
        }

        .ap-submit-btn {
          width: 100%;
          background: linear-gradient(135deg, var(--forest), var(--forest-deep));
          color: #fff;
          border: none;
          border-radius: 10px;
          padding: 13px 20px;
          font-size: 14px;
          font-weight: 700;
          font-family: 'DM Sans', sans-serif;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          letter-spacing: 0.02em;
          transition: all 0.2s;
          position: relative;
          overflow: hidden;
        }
        .ap-submit-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.08), transparent);
          opacity: 0;
          transition: opacity 0.2s;
        }
        .ap-submit-btn:hover:not(:disabled)::before { opacity: 1; }
        .ap-submit-btn:hover:not(:disabled) {
          box-shadow: 0 6px 20px rgba(26,60,46,0.35);
          transform: translateY(-1px);
        }
        .ap-submit-btn:active:not(:disabled) { transform: translateY(0); }
        .ap-submit-btn:disabled { opacity: 0.65; cursor: not-allowed; }

        /* Security badge */
        .ap-security-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          justify-content: center;
          margin-top: 10px;
        }
        .ap-security-badge span {
          font-size: 11px;
          color: #999;
          font-family: 'DM Sans', sans-serif;
        }

        /* ── Benefits ── */
        .ap-benefits-inner {
          padding: 18px 22px 20px;
          display: flex;
          flex-direction: column;
          flex: 1;
        }

        .ap-benefit-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 8px 10px;
          border-radius: 8px;
          background: #f8f6f1;
          border: 1px solid #ece8de;
          transition: all 0.18s;
        }
        .ap-benefit-item:hover {
          background: #f1ede4;
          border-color: #d9d3c4;
          transform: translateX(2px);
        }

        /* ── Testimonials ── */
        .ap-aside {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .ap-testimonial {
          background: #ffffff;
          border-radius: 16px;
          border: 1px solid #e8e2d4;
          padding: 20px 22px;
          box-shadow: 0 2px 16px rgba(0,0,0,0.06);
          position: relative;
          overflow: hidden;
          transition: box-shadow 0.2s, transform 0.2s;
        }
        .ap-testimonial:hover {
          box-shadow: 0 6px 28px rgba(0,0,0,0.1);
          transform: translateY(-2px);
        }
        .ap-testimonial::before {
          content: '"';
          position: absolute;
          top: -8px;
          right: 16px;
          font-family: 'Playfair Display', serif;
          font-size: 80px;
          color: rgba(201,168,76,0.12);
          line-height: 1;
          pointer-events: none;
        }
        .ap-testimonial-bar {
          position: absolute;
          top: 0; left: 0; bottom: 0;
          width: 3px;
          background: linear-gradient(180deg, var(--gold), var(--gold-light));
          border-radius: 3px 0 0 3px;
        }

        /* ── Employer bar ── */
        .ap-employer-bar {
          text-align: center;
          padding: 14px 20px;
          background: #fff;
          border-radius: 12px;
          border: 1px solid var(--border);
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }
        .ap-employer-bar p {
          font-size: 13px;
          color: #444;
          font-family: 'DM Sans', sans-serif;
          margin: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          flex-wrap: wrap;
        }

        /* ── Responsive ── */
        @media (max-width: 1023px) {
          .ap-body-wrap {
            grid-template-columns: 1fr;
            padding: 28px 20px 56px;
            gap: 24px;
          }
          .ap-aside {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
          }
          .ap-aside-label { grid-column: 1 / -1; }
          .ap-hero-title { font-size: 28px; }
        }

        @media (max-width: 640px) {
          .ap-hero { padding: 30px 20px 34px; }
          .ap-hero-title { font-size: 24px; }
          .ap-hero-stats { gap: 20px; }
          .ap-body-wrap { padding: 20px 16px 48px; gap: 18px; }
          .ap-aside { display: flex; flex-direction: column; gap: 12px; }
          .ap-cards-row { grid-template-columns: 1fr; }
          .ap-card { border-radius: 16px; }
          .ap-form-inner, .ap-benefits-inner { padding: 16px 18px 18px; }
          .ap-img-banner { height: 100px; }
        }
      `}</style>

      <div className="ap-page">
        {!isEmbedded && <PublicSiteNavbar />}

        

        {/* ── Body ── */}
        <div className="ap-body-wrap">

          {/* ── Left: Testimonials ── */}
          <aside className="ap-aside">
            <div
              className="ap-aside-label"
              style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 2 }}
            >
              <Star size={13} color="#c9a84c" fill="#c9a84c" />
              <span
                style={{
                  fontSize: 10.5,
                  fontFamily: "'DM Sans', sans-serif",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "#5a4a00",
                  fontWeight: 700,
                }}
              >
                What agencies say
              </span>
            </div>

            {testimonials.map((t) => (
              <div key={t.agency} className="ap-testimonial">
                <div className="ap-testimonial-bar" />
                <div style={{ display: "flex", gap: 3, marginBottom: 9, paddingLeft: 12 }}>
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} size={11} color="#c9a84c" fill="#c9a84c" />
                  ))}
                </div>
                <p
                  style={{
                    fontSize: 13,
                    lineHeight: 1.65,
                    color: "#1a1a1a",
                    marginBottom: 11,
                    paddingLeft: 12,
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  "{t.quote}"
                </p>
                <div style={{ paddingLeft: 12 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: "#1a3c2e", fontFamily: "'DM Sans', sans-serif", margin: 0 }}>
                    {t.agency}
                  </p>
                  <p style={{ fontSize: 11.5, color: "#777", fontFamily: "'DM Sans', sans-serif", margin: "2px 0 0" }}>
                    — {t.author}
                  </p>
                </div>
              </div>
            ))}
          </aside>

          {/* ── Right: Sign-in + Benefits ── */}
          <main style={{ display: "flex", flexDirection: "column", gap: 18 }}>

            {/* Info banner */}
            <div className="ap-info-banner">
              <Info size={15} color="#b45309" style={{ flexShrink: 0 }} />
              <p>
                Sign in with your{" "}
                <strong style={{ color: "#1a3c2e" }}>FindMaid agency account</strong> to access
                your dashboard, listings, and documents.
              </p>
            </div>

            {/* ── Cards ── */}
            <div className="ap-cards-row">

              {/* Sign-in Card */}
              <div className="ap-card">
                {/* Header */}
                <div className="ap-card-header-dark" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: "rgba(201,168,76,0.18)",
                      border: "1px solid rgba(201,168,76,0.38)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <KeyRound size={14} color="#c9a84c" />
                  </div>
                  <div>
                    <p style={{ color: "#fff", fontSize: 14, fontWeight: 700, margin: 0, fontFamily: "'DM Sans', sans-serif" }}>
                      Agency Sign In
                    </p>
                    <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, margin: 0, fontFamily: "'DM Sans', sans-serif" }}>
                      Secure login portal
                    </p>
                  </div>
                </div>

                {/* Banner image — tighter height, fade bottom */}
                <div className="ap-img-banner">
                  <img src={FindMaidImg} alt="Agency banner" />
                </div>

                {/* Form — no extra top padding so it sits flush under image */}
                <form onSubmit={(e) => void handleSubmit(e)} className="ap-form-inner">
                  {/* Username */}
                  <div style={{ marginBottom: 14 }}>
                    <label htmlFor="username" className="ap-field-label">Username</label>
                    <div className="ap-input-wrap">
                      <User
                        size={14}
                        color={focused === "username" ? "#1a3c2e" : "#bbb"}
                        className="ap-input-icon"
                      />
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
                  <div style={{ marginBottom: 18 }}>
                    <label htmlFor="password" className="ap-field-label">Password</label>
                    <div className="ap-input-wrap">
                      <Lock
                        size={14}
                        color={focused === "password" ? "#1a3c2e" : "#bbb"}
                        className="ap-input-icon"
                      />
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

                  {/* Submit */}
                  <button type="submit" disabled={isSubmitting} className="ap-submit-btn">
                    {isSubmitting ? "Signing in..." : "Sign in to Dashboard"}
                    {!isSubmitting && <ArrowRight size={15} />}
                  </button>

                  {/* Security note */}
                  <div className="ap-security-badge">
                    <Shield size={11} color="#bbb" />
                    <span>256-bit SSL encrypted</span>
                  </div>
                </form>
              </div>

              {/* Benefits Card */}
              <div className="ap-card">
                <div className="ap-card-header-gold">
                  <Sparkles size={17} color="rgba(80,50,0,0.7)" />
                  <div style={{ marginLeft: 10 }}>
                    <p
                      style={{
                        color: "rgba(60,40,0,0.9)",
                        fontSize: 14,
                        fontWeight: 700,
                        margin: 0,
                        fontFamily: "'DM Sans', sans-serif",
                        textShadow: "0 1px 0 rgba(255,255,255,0.3)",
                      }}
                    >
                      New to FindMaid?
                    </p>
                    <p style={{ color: "rgba(60,40,0,0.55)", fontSize: 11, margin: 0, fontFamily: "'DM Sans', sans-serif" }}>
                      Join 500+ agencies on the platform
                    </p>
                  </div>
                </div>

                <div className="ap-benefits-inner">
                  <p style={{ fontSize: 13, color: "#1a1a1a", fontFamily: "'DM Sans', sans-serif", marginBottom: 14, lineHeight: 1.5 }}>
                    <Link
                      to="/login"
                      style={{
                        color: "#1a3c2e",
                        fontWeight: 700,
                        textDecorationThickness: "2px",
                        textUnderlineOffset: "3px",
                      }}
                    >
                      Sign up for a FindMaid plan
                    </Link>{" "}
                    and unlock all features:
                  </p>

                  <ul
                    style={{
                      listStyle: "none",
                      margin: 0,
                      padding: 0,
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      flex: 1,
                    }}
                  >
                    {benefits.map((b) => (
                      <li key={b.text} className="ap-benefit-item">
                        <span style={{ fontSize: 14, flexShrink: 0, lineHeight: 1.4 }}>{b.icon}</span>
                        <span
                          style={{
                            fontSize: 13,
                            color: "#1a1a1a",
                            fontFamily: "'DM Sans', sans-serif",
                            lineHeight: 1.4,
                            flex: 1,
                          }}
                        >
                          {b.text}
                        </span>
                        <Check size={13} color="#1a3c2e" style={{ flexShrink: 0, marginTop: 2, marginLeft: "auto" }} />
                      </li>
                    ))}
                  </ul>

                  <p
                    style={{
                      marginTop: 14,
                      fontSize: 11,
                      color: "#888",
                      fontFamily: "'DM Sans', sans-serif",
                      lineHeight: 1.5,
                    }}
                  >
                    By creating an account you agree to our{" "}
                    <Link
                      to="/faq"
                      style={{ color: "#1a3c2e", fontWeight: 600, textUnderlineOffset: "2px" }}
                    >
                      Terms of Service
                    </Link>.
                  </p>
                </div>
              </div>
            </div>

            {/* Employer redirect */}
            <div className="ap-employer-bar">
              <p>
                Looking for the employer login?&nbsp;
                <Link
                  to="/employer-login"
                  style={{
                    color: "#1a3c2e",
                    fontWeight: 700,
                    textUnderlineOffset: "3px",
                    textDecorationThickness: "2px",
                  }}
                >
                  Go to Employer Login →
                </Link>
              </p>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}