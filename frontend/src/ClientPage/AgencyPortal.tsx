import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  KeyRound,
  Lock,
  User,
  Check,
  ArrowRight,
  Sparkles,
  Shield,
  Eye,
  EyeOff,
  ChevronRight,
  Building2,
  Zap,
  FileText,
  Globe,
  Bot,
  Megaphone,
  MessageSquare,
  BrainCircuit,
} from "lucide-react";
import { toast } from "@/components/ui/sonner";
import {
  clearAgencyAdminAuth,
  getAgencyAdminToken,
  saveAgencyAdminAuth,
} from "@/lib/agencyAdminAuth";
import { adminPath } from "@/lib/routes";
import PublicSiteNavbar from "@/components/PublicSiteNavbar";
import OtpInput from "@/components/OtpInput";
import FindMaidImg from "./assets/maid_agency_logo_81.jpg";

interface AgencyAuthResponse {
  error?: string;
  requiresConfirmation?: boolean;
  email?: string;
  delivery?: "sent" | "not_configured";
  devConfirmationCode?: string;
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

const coreFeatures = [
  { text: "Publish unlimited maid listings", icon: "📋" },
  { text: "Upload up to 2 photos per maid", icon: "🖼️" },
  { text: "Upload 1 introduction video clip per maid", icon: "🎥" },
  { text: "Auto-generate maid bio-data in PDF format", icon: "📄" },
  { text: "Manage agency profile & branch addresses", icon: "🏢" },
  { text: "Auto-fill employment contracts and MOM documents", icon: "✍️" },
  { text: "Get a customised agency micro-site", icon: "🌐" },
];

const aiFeatures = [
  {
    icon: BrainCircuit,
    label: "AI Biodata Autofill",
    desc: "Instantly populate maid bio-data fields from uploaded documents",
  },
  {
    icon: Bot,
    label: "AI Agents",
    desc: "Autonomous agents that handle repetitive admin tasks 24/7",
  },
  {
    icon: Megaphone,
    label: "AI Marketing",
    desc: "Auto-generate listing copy and social posts for each maid profile",
  },
  {
    icon: MessageSquare,
    label: "Messaging",
    desc: "Built-in employer chat with smart reply suggestions",
  },
];

const highlights = [
  { icon: Zap, label: "Fast setup", desc: "Go live the same day you register" },
  { icon: FileText, label: "Smart documents", desc: "PDF bio-data and MOM forms auto-filled" },
  { icon: Globe, label: "Your own page", desc: "A dedicated micro-site for your agency" },
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
  const PENDING_KEY = "agency_pending_verification";
  const [pendingVerification, setPendingVerificationRaw] = useState<{
    email: string;
    delivery?: string;
    devCode?: string;
  } | null>(() => {
    try {
      const raw = sessionStorage.getItem(PENDING_KEY);
      return raw ? (JSON.parse(raw) as { email: string; delivery?: string; devCode?: string }) : null;
    } catch {
      return null;
    }
  });
  const [verificationCode, setVerificationCode] = useState("");

  const setPendingVerification = (
    value: { email: string; delivery?: string; devCode?: string } | null,
  ) => {
    if (value) {
      sessionStorage.setItem(PENDING_KEY, JSON.stringify(value));
    } else {
      sessionStorage.removeItem(PENDING_KEY);
    }
    setPendingVerificationRaw(value);
  };

  useEffect(() => {
    if (getAgencyAdminToken()) {
      sessionStorage.removeItem(PENDING_KEY);
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

      if (response.status === 403 && data.requiresConfirmation && data.email) {
        clearAgencyAdminAuth();
        setPendingVerification({
          email: data.email,
          delivery: data.delivery,
          devCode: data.devConfirmationCode,
        });
        return;
      }

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

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingVerification) return;
    if (verificationCode.length < 6) {
      toast.error("Please enter the full 6-digit code");
      return;
    }
    try {
      setIsSubmitting(true);
      const response = await fetch("/api/agency-auth/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pendingVerification.email, code: verificationCode.trim() }),
      });
      const data = (await response.json().catch(() => ({}))) as AgencyAuthResponse;
      if (!response.ok || !data.token || !data.admin) {
        throw new Error(data.error || "Invalid or expired verification code");
      }
      saveAgencyAdminAuth(data.token, data.admin);
      toast.success("Email verified — welcome to your dashboard!");
      navigate(adminPath("/dashboard"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Verification failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    if (!pendingVerification) return;
    try {
      setIsSubmitting(true);
      const response = await fetch("/api/agency-auth/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pendingVerification.email }),
      });
      const data = (await response.json().catch(() => ({}))) as AgencyAuthResponse;
      if (!response.ok) {
        if (data.delivery === "not_configured") {
          toast.info("Email delivery is not configured. Please contact support to verify your account.");
        } else {
          toast.error(data.error || "Failed to resend code");
        }
      } else {
        setVerificationCode("");
        setPendingVerification({ ...pendingVerification, delivery: data.delivery, devCode: data.devConfirmationCode });
        if (data.delivery === "not_configured") {
          toast.info("Email delivery is not configured. Please contact support to verify your account.");
        } else {
          toast.success("Verification code resent — check your inbox");
        }
      }
    } catch {
      toast.error("Failed to resend code");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {!isEmbedded && <PublicSiteNavbar />}
    <div className="ap-root">

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Syne:wght@700;800&display=swap');

        :root {
          --teal:        #0E4E5E;
          --teal-2:      #156478;
          --teal-3:      #1c7a93;
          --teal-4:      #2896b0;
          --teal-pale:   #eaf4f7;
          --teal-glass:  rgba(14,78,94,0.07);
          --amber:       #FCD34D;
          --amber-dim:   rgba(252,211,77,0.18);
          --amber-ring:  rgba(252,211,77,0.28);
          --surface:     #f0f7f9;
          --surface-2:   #e3edf1;
          --white:       #ffffff;
          --ink:         #091c22;
          --ink-2:       #091c22;
          --ink-3:       #19353d;
          --ink-4:       #294952;
          --rule:        #cde0e6;
          --rule-2:      #ddeef2;
          --r-sm: 8px;
          --r-md: 12px;
          --r-lg: 18px;
          --r-xl: 24px;
        }

        /* ── Root + background ── */
        .ap-root {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          font-family: 'Inter', system-ui, sans-serif;
          background: var(--surface);
          position: relative;
          overflow-x: hidden;
        }

        /* Floating mesh orbs */
        .ap-orb {
          position: fixed;
          border-radius: 50%;
          pointer-events: none;
          z-index: 0;
          filter: blur(1px);
        }
        .ap-orb-1 {
          width: 520px; height: 520px;
          top: -160px; left: -160px;
          background: radial-gradient(circle, rgba(14,78,94,0.10) 0%, transparent 68%);
          animation: orbA 20s ease-in-out infinite alternate;
        }
        .ap-orb-2 {
          width: 420px; height: 420px;
          bottom: -120px; right: -100px;
          background: radial-gradient(circle, rgba(252,211,77,0.14) 0%, transparent 65%);
          animation: orbB 26s ease-in-out infinite alternate;
        }
        .ap-orb-3 {
          width: 260px; height: 260px;
          top: 40%; left: 50%;
          background: radial-gradient(circle, rgba(14,78,94,0.05) 0%, transparent 65%);
          animation: orbC 32s ease-in-out infinite alternate;
        }
        @keyframes orbA {
          from { transform: translate(0,0); }
          to   { transform: translate(70px, 90px); }
        }
        @keyframes orbB {
          from { transform: translate(0,0); }
          to   { transform: translate(-60px, -70px); }
        }
        @keyframes orbC {
          from { transform: translate(-50%, -50%) scale(1); }
          to   { transform: translate(-50%, -50%) scale(1.3); }
        }

        /* ── Page wrapper ── */
        .ap-outer {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2.5rem 1.25rem 4rem;
          position: relative;
          z-index: 1;
        }

        /* ── Card ── */
        .ap-card {
          width: 100%;
          max-width: 1080px;
          background: var(--white);
          border-radius: var(--r-xl);
          border: 1px solid var(--rule);
          box-shadow:
            0 0 0 1px rgba(14,78,94,0.03),
            0 8px 32px rgba(14,78,94,0.09),
            0 40px 90px rgba(14,78,94,0.06);
          overflow: hidden;
          animation: cardIn 0.65s cubic-bezier(0.22,1,0.36,1) both;
          position: relative;
        }

        /* Animated top-edge bar */
        .ap-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 3px;
          background: linear-gradient(
            90deg,
            var(--teal) 0%,
            var(--teal-3) 25%,
            var(--amber) 50%,
            var(--teal-3) 75%,
            var(--teal) 100%
          );
          background-size: 250% 100%;
          animation: barFlow 5s linear infinite;
          z-index: 10;
        }
        @keyframes barFlow {
          0%   { background-position: 0% 0%; }
          100% { background-position: 250% 0%; }
        }

        @keyframes cardIn {
          from { opacity: 0; transform: translateY(28px) scale(0.982); }
          to   { opacity: 1; transform: none; }
        }

        /* ── Card header ── */
        .ap-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0 2rem;
          height: 64px;
          background: linear-gradient(120deg, var(--teal) 0%, #0d3d4e 55%, #0a2e3a 100%);
          position: relative;
          overflow: hidden;
        }
        .ap-header-texture {
          position: absolute; inset: 0;
          background: repeating-linear-gradient(
            -55deg,
            transparent 0px, transparent 22px,
            rgba(255,255,255,0.018) 22px, rgba(255,255,255,0.018) 23px
          );
          pointer-events: none;
        }
        .ap-header-glow {
          position: absolute;
          right: 100px; top: -50px;
          width: 200px; height: 200px;
          background: radial-gradient(circle, rgba(252,211,77,0.15) 0%, transparent 70%);
          pointer-events: none;
          animation: glowPulse 4s ease-in-out infinite alternate;
        }
        @keyframes glowPulse {
          from { opacity: 0.7; transform: scale(1); }
          to   { opacity: 1; transform: scale(1.12); }
        }

        .ap-logo-mark {
          position: relative; z-index: 1;
          width: 38px; height: 38px;
          border-radius: 11px;
          background: var(--amber-dim);
          border: 1px solid var(--amber-ring);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          animation: popIn 0.7s cubic-bezier(0.34,1.56,0.64,1) 0.2s both;
        }
        @keyframes popIn {
          from { opacity: 0; transform: scale(0.55) rotate(-12deg); }
          to   { opacity: 1; transform: none; }
        }

        .ap-header-text { flex: 1; position: relative; z-index: 1; }
        .ap-header-title {
          font-family: 'Syne', sans-serif;
          font-size: 1.05rem;
          font-weight: 800;
          color: #ffffff;
          margin: 0;
          line-height: 1;
          letter-spacing: -0.01em;
        }
        .ap-header-sub {
          font-size: 0.64rem;
          font-weight: 500;
          color: rgba(255,255,255,0.42);
          margin: 0.22rem 0 0;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .ap-header-badge {
          position: relative; z-index: 1;
          display: flex; align-items: center; gap: 0.3rem;
          padding: 0.28rem 0.7rem;
          background: var(--amber-dim);
          border: 1px solid var(--amber-ring);
          border-radius: 100px;
          font-size: 0.62rem;
          font-weight: 700;
          color: var(--amber);
          letter-spacing: 0.08em;
          text-transform: uppercase;
          animation: fadeSlideLeft 0.5s ease 0.35s both;
        }
        @keyframes fadeSlideLeft {
          from { opacity: 0; transform: translateX(10px); }
          to   { opacity: 1; transform: none; }
        }

        /* ── Alert banner ── */
        .ap-alert {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.65rem 2rem;
          background: linear-gradient(90deg, rgba(14,78,94,0.03) 0%, rgba(252,211,77,0.05) 100%);
          border-bottom: 1px solid var(--rule-2);
          animation: alertSlide 0.45s ease 0.25s both;
        }
        @keyframes alertSlide {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: none; }
        }
        .ap-alert-pill {
          padding: 0.18rem 0.65rem;
          background: var(--amber);
          border-radius: 100px;
          font-size: 0.6rem;
          font-weight: 800;
          color: var(--teal);
          letter-spacing: 0.1em;
          text-transform: uppercase;
          flex-shrink: 0;
          box-shadow: 0 1px 8px rgba(252,211,77,0.45);
        }
        .ap-alert p {
          margin: 0;
          font-size: 0.825rem;
          color: var(--ink-3);
          line-height: 1.5;
        }
        .ap-alert strong { color: var(--teal); font-weight: 600; }

        /* ── Three-column body ── */
        .ap-body {
          display: grid;
          grid-template-columns: 1fr 1px 1.1fr 1px 1fr;
        }
        @media (max-width: 840px) {
          .ap-body { grid-template-columns: 1fr; }
          .ap-divider { display: none; }
        }

        .ap-divider { background: var(--rule-2); align-self: stretch; }

        /* ── Columns ── */
        .ap-col {
          padding: 1.875rem 1.625rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .ap-col-1 { animation: colUp 0.55s ease 0.15s both; }
        .ap-col-2 { animation: colUp 0.55s ease 0.22s both; }
        .ap-col-3 { animation: colUp 0.55s ease 0.29s both; }
        @keyframes colUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: none; }
        }

        /* ── Section label ── */
        .ap-section-label {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          font-size: 0.61rem;
          font-weight: 700;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: var(--teal-3);
          margin-bottom: 0.1rem;
        }
        .ap-section-label::after {
          content: '';
          flex: 1;
          height: 1px;
          background: linear-gradient(90deg, var(--rule), transparent);
        }

        /* ── Image ── */
        .ap-img-wrap {
          width: 100%;
          border-radius: var(--r-md);
          overflow: hidden;
          border: 1px solid var(--rule);
          position: relative;
        }
        .ap-img-wrap::after {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(180deg, transparent 55%, rgba(14,78,94,0.07) 100%);
          pointer-events: none;
        }
        .ap-img-wrap img {
          width: 100%; height: auto; display: block;
          transition: transform 0.45s ease;
        }
        .ap-img-wrap:hover img { transform: scale(1.025); }

        /* ── Form ── */
        .ap-form { display: flex; flex-direction: column; gap: 0.9rem; }

        .ap-label {
          display: block;
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--ink-2);
          margin-bottom: 0.38rem;
        }

        .ap-field { position: relative; }

        .ap-field-icon {
          position: absolute;
          left: 0.85rem; top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
          display: flex;
          transition: color 0.15s;
        }

        .ap-input {
          width: 100%;
          border: 1.5px solid var(--rule);
          border-radius: var(--r-sm);
          background: var(--surface);
          padding: 0.72rem 0.9rem 0.72rem 2.2rem;
          font-size: 0.875rem;
          font-family: 'Inter', sans-serif;
          color: var(--ink);
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
          box-sizing: border-box;
        }
        .ap-input::placeholder { color: var(--ink-4); font-weight: 300; }
        .ap-input:focus {
          border-color: var(--teal-3);
          background: var(--white);
          box-shadow: 0 0 0 3.5px rgba(14,78,94,0.1), 0 1px 4px rgba(14,78,94,0.06);
        }
        .ap-input:disabled { opacity: 0.5; }
        .ap-input-pr { padding-right: 2.5rem; }

        .ap-eye-btn {
          position: absolute;
          right: 0.7rem; top: 50%;
          transform: translateY(-50%);
          background: none; border: none;
          padding: 0.2rem; cursor: pointer;
          color: var(--ink-4);
          display: flex; align-items: center;
          border-radius: 4px;
          transition: color 0.15s;
        }
        .ap-eye-btn:hover { color: var(--teal-2); }

        /* ── Submit ── */
        .ap-btn {
          width: 100%;
          border: none;
          border-radius: var(--r-sm);
          padding: 0.82rem 1.25rem;
          font-size: 0.875rem;
          font-family: 'Inter', sans-serif;
          font-weight: 600;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          gap: 0.5rem;
          background: linear-gradient(130deg, var(--teal) 0%, var(--teal-2) 100%);
          color: var(--white);
          box-shadow:
            0 2px 10px rgba(14,78,94,0.24),
            inset 0 1px 0 rgba(255,255,255,0.07);
          transition: transform 0.18s, box-shadow 0.18s, background 0.18s;
          position: relative;
          overflow: hidden;
          margin-top: 0.2rem;
        }
        .ap-btn::before {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(
            105deg,
            transparent 20%,
            rgba(252,211,77,0.16) 50%,
            transparent 80%
          );
          transform: translateX(-140%);
          transition: transform 0.58s ease;
        }
        .ap-btn:hover:not(:disabled)::before { transform: translateX(140%); }
        .ap-btn:hover:not(:disabled) {
          background: linear-gradient(130deg, var(--teal-2) 0%, var(--teal-3) 100%);
          box-shadow: 0 6px 26px rgba(14,78,94,0.28), inset 0 1px 0 rgba(255,255,255,0.1);
          transform: translateY(-1px);
        }
        .ap-btn:active:not(:disabled) {
          transform: none;
          box-shadow: 0 1px 4px rgba(14,78,94,0.2);
        }
        .ap-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .ap-spinner {
          width: 14px; height: 14px;
          border: 2px solid rgba(255,255,255,0.22);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.65s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .ap-ssl {
          display: flex; align-items: center; justify-content: center;
          gap: 0.4rem;
          font-size: 0.73rem;
          color: var(--ink-4);
        }

        /* ── AI feature cards ── */
        .ap-ai-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.5rem;
        }

        .ap-ai-card {
          display: flex;
          flex-direction: column;
          gap: 0.42rem;
          padding: 0.8rem 0.85rem;
          border-radius: var(--r-md);
          border: 1px solid var(--rule-2);
          background: var(--white);
          transition: background 0.18s, border-color 0.18s, transform 0.18s, box-shadow 0.18s;
          cursor: default;
        }
        .ap-ai-card:hover {
          background: var(--teal-pale);
          border-color: rgba(14,78,94,0.18);
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(14,78,94,0.08);
        }
        .ap-ai-card-icon {
          width: 28px; height: 28px;
          border-radius: var(--r-sm);
          background: linear-gradient(135deg, var(--teal), var(--teal-2));
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 2px 6px rgba(14,78,94,0.22);
        }
        .ap-ai-card-label {
          font-size: 0.76rem;
          font-weight: 700;
          color: var(--ink-2);
          line-height: 1.2;
        }
        .ap-ai-card-desc {
          font-size: 0.70rem;
          color: var(--ink-4);
          line-height: 1.4;
        }

        /* ── "Why join" highlight cards ── */
        .ap-highlights { display: flex; flex-direction: column; gap: 0.45rem; }

        .ap-highlight {
          display: flex;
          align-items: flex-start;
          gap: 0.7rem;
          padding: 0.75rem 0.8rem;
          border-radius: var(--r-md);
          border: 1px solid var(--rule-2);
          background: var(--white);
          transition: background 0.18s, border-color 0.18s, transform 0.18s;
        }
        .ap-highlight:hover {
          background: var(--teal-pale);
          border-color: rgba(14,78,94,0.16);
          transform: translateX(3px);
        }
        .ap-highlight-icon {
          width: 30px; height: 30px;
          border-radius: var(--r-sm);
          background: linear-gradient(135deg, var(--teal), var(--teal-2));
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 2px 8px rgba(14,78,94,0.2);
        }
        .ap-highlight-label {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--ink-2);
          margin-bottom: 0.1rem;
        }
        .ap-highlight-desc {
          font-size: 0.76rem;
          color: var(--ink-4);
          line-height: 1.45;
        }

        /* ── Benefits header ── */
        .ap-bheader {
          border-radius: var(--r-md);
          padding: 0.95rem 1.1rem;
          background: linear-gradient(130deg, var(--teal) 0%, var(--teal-2) 65%, #0a2e3a 100%);
          display: flex; align-items: center; gap: 0.8rem;
          position: relative; overflow: hidden;
        }
        .ap-bheader::before {
          content: '';
          position: absolute; inset: 0;
          background: repeating-linear-gradient(
            -45deg, transparent 0px, transparent 18px,
            rgba(255,255,255,0.02) 18px, rgba(255,255,255,0.02) 19px
          );
          pointer-events: none;
        }
        .ap-bheader::after {
          content: '';
          position: absolute;
          top: -18px; right: -12px;
          width: 80px; height: 80px;
          background: radial-gradient(circle, rgba(252,211,77,0.22) 0%, transparent 70%);
          pointer-events: none;
          animation: glowPulse 4s ease-in-out infinite alternate;
        }
        .ap-bheader-icon {
          position: relative; z-index: 1;
          width: 34px; height: 34px;
          border-radius: var(--r-sm);
          background: var(--amber-dim);
          border: 1px solid var(--amber-ring);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .ap-bheader-title {
          position: relative; z-index: 1;
          font-family: 'Syne', sans-serif;
          font-size: 0.95rem; font-weight: 800;
          color: #ffffff; margin: 0;
          line-height: 1.2; letter-spacing: -0.01em;
        }
        .ap-bheader-sub {
          position: relative; z-index: 1;
          font-size: 0.7rem;
          color: rgba(255,255,255,0.48);
          margin: 0.12rem 0 0;
        }

        .ap-benefits { display: flex; flex-direction: column; gap: 0.22rem; }

        .ap-benefit {
          display: flex; align-items: center; gap: 0.55rem;
          padding: 0.52rem 0.7rem;
          border-radius: var(--r-sm);
          border: 1px solid transparent;
          font-size: 0.83rem; color: var(--ink-2);
          line-height: 1.4;
          transition: background 0.18s, border-color 0.18s, transform 0.15s;
          cursor: default;
        }
        .ap-benefit:hover {
          background: var(--teal-pale);
          border-color: rgba(14,78,94,0.1);
          transform: translateX(3px);
        }
        .ap-benefit-emoji { font-size: 0.88rem; width: 1.1rem; text-align: center; flex-shrink: 0; }
        .ap-benefit-check {
          width: 16px; height: 16px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--amber), rgba(252,211,77,0.55));
          box-shadow: 0 1px 5px rgba(252,211,77,0.42);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; margin-left: auto;
        }

        .ap-note {
          font-size: 0.78rem; color: var(--ink-4);
          line-height: 1.65; margin: 0;
        }
        .ap-note a {
          color: var(--teal-2); font-weight: 600;
          text-decoration: none;
          border-bottom: 1px solid rgba(252,211,77,0.5);
          padding-bottom: 1px;
          transition: color 0.15s, border-color 0.15s;
        }
        .ap-note a:hover { color: var(--teal); border-color: var(--amber); }

        /* ── Card footer ── */
        .ap-footer {
          display: flex; align-items: center; justify-content: center;
          gap: 0.5rem;
          padding: 0.85rem 2rem;
          background: linear-gradient(90deg, var(--surface), var(--teal-pale), var(--surface));
          border-top: 1px solid var(--rule-2);
          font-size: 0.82rem; color: var(--ink-4);
          flex-wrap: wrap;
        }
        .ap-footer a {
          display: inline-flex; align-items: center; gap: 0.18rem;
          color: var(--teal-2); font-weight: 600;
          text-decoration: none;
          transition: color 0.15s, gap 0.18s;
        }
        .ap-footer a:hover { color: var(--teal); gap: 0.32rem; }
        .ap-footer-sep { width: 3px; height: 3px; border-radius: 50%; background: var(--rule); }
      `}</style>

      {/* Ambient orbs */}
      <div className="ap-orb ap-orb-1" />
      <div className="ap-orb ap-orb-2" />
      <div className="ap-orb ap-orb-3" />

      <main className="ap-outer">
        <div className="ap-card">

          {/* ── Header ── */}
          <div className="ap-header">
            <div className="ap-header-texture" />
            <div className="ap-header-glow" />
            <div className="ap-logo-mark">
              <KeyRound size={16} color="#FCD34D" strokeWidth={1.75} />
            </div>
            <div className="ap-header-text">
              <p className="ap-header-title">Agency Portal</p>
              <p className="ap-header-sub">FindMaid Dashboard</p>
            </div>
            <div className="ap-header-badge">
              <Sparkles size={8} strokeWidth={2} />
              Now launching
            </div>
          </div>

          {/* ── Alert ── */}
          <div className="ap-alert">
            <span className="ap-alert-pill">Info</span>
            <p>
              Sign in with your <strong>FindMaid agency account</strong> to access your dashboard, listings, and documents.
            </p>
          </div>

          {/* ── Body ── */}
          <div className="ap-body">

            {/* Col 1 — AI features + highlights */}
            <div className="ap-col ap-col-1">
              <div className="ap-section-label">
                <BrainCircuit size={8} strokeWidth={2.5} />
                AI-powered tools
              </div>

              <div className="ap-ai-grid">
                {aiFeatures.map((f) => (
                  <div key={f.label} className="ap-ai-card">
                    <div className="ap-ai-card-icon">
                      <f.icon size={13} color="#FCD34D" strokeWidth={1.75} />
                    </div>
                    <div className="ap-ai-card-label">{f.label}</div>
                    <div className="ap-ai-card-desc">{f.desc}</div>
                  </div>
                ))}
              </div>

              <div className="ap-section-label" style={{ marginTop: "0.25rem" }}>
                <Zap size={8} strokeWidth={2.5} />
                Why agencies join
              </div>

              <div className="ap-highlights">
                {highlights.map((h) => (
                  <div key={h.label} className="ap-highlight">
                    <div className="ap-highlight-icon">
                      <h.icon size={14} color="#FCD34D" strokeWidth={1.75} />
                    </div>
                    <div>
                      <div className="ap-highlight-label">{h.label}</div>
                      <div className="ap-highlight-desc">{h.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="ap-divider" />

            {/* Col 2 — Sign In */}
            <div className="ap-col ap-col-2">
              <div className="ap-section-label">
                <KeyRound size={8} strokeWidth={2.5} />
                Sign in
              </div>

              <div className="ap-img-wrap">
                <img src={FindMaidImg} alt="FindMaid" />
              </div>

              {pendingVerification ? (
                <form onSubmit={(e) => void handleVerifyCode(e)} className="ap-form">
                  <p className="ap-label" style={{ marginBottom: 4 }}>
                    A 6-digit verification code was{" "}
                    {pendingVerification.delivery === "not_configured"
                      ? "generated (email delivery not configured — contact support)"
                      : `sent to ${pendingVerification.email}`}
                    .
                  </p>

                  {pendingVerification.devCode && (
                    <p className="ap-label" style={{ color: "#1c7a93", marginBottom: 4 }}>
                      Dev code: <strong>{pendingVerification.devCode}</strong>
                    </p>
                  )}

                  <div>
                    <label className="ap-label">Verification Code</label>
                    <OtpInput
                      value={verificationCode}
                      onChange={setVerificationCode}
                      disabled={isSubmitting}
                    />
                  </div>

                  <button type="submit" disabled={isSubmitting} className="ap-btn">
                    {isSubmitting
                      ? <><span className="ap-spinner" />Verifying…</>
                      : <>Verify & Sign In <ArrowRight size={14} strokeWidth={2.5} /></>
                    }
                  </button>

                  <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 4 }}>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => void handleResendCode()}
                      className="ap-ssl"
                      style={{ cursor: "pointer", textDecoration: "underline", background: "none", border: "none", padding: 0 }}
                    >
                      Resend code
                    </button>
                    <span className="ap-ssl" style={{ color: "#294952" }}>·</span>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => { setPendingVerification(null); setVerificationCode(""); }}
                      className="ap-ssl"
                      style={{ cursor: "pointer", textDecoration: "underline", background: "none", border: "none", padding: 0 }}
                    >
                      Back to login
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={(e) => void handleSubmit(e)} className="ap-form">
                  <div>
                    <label htmlFor="username" className="ap-label">Username</label>
                    <div className="ap-field">
                      <span className="ap-field-icon">
                        <User
                          size={13}
                          color={focused === "username" ? "#1c7a93" : "#8aaab4"}
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
                          color={focused === "password" ? "#1c7a93" : "#8aaab4"}
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
                      : <>Sign in to Dashboard <ArrowRight size={14} strokeWidth={2.5} /></>
                    }
                  </button>

                  <div className="ap-ssl">
                    <Shield size={10} color="#8aaab4" strokeWidth={2} />
                    <span>256-bit SSL encrypted</span>
                  </div>
                </form>
              )}
            </div>

            <div className="ap-divider" />

            {/* Col 3 — Core platform features */}
            <div className="ap-col ap-col-3">
              <div className="ap-section-label">
                <Sparkles size={8} strokeWidth={2.5} />
                Platform features
              </div>

              <div className="ap-bheader">
                <div className="ap-bheader-icon">
                  <Building2 size={15} color="#FCD34D" strokeWidth={1.75} />
                </div>
                <div>
                  <p className="ap-bheader-title">New to FindMaid?</p>
                  <p className="ap-bheader-sub">Invitation-only during launch</p>
                </div>
              </div>

              <p className="ap-note">
                Once your agency is registered, your account unlocks everything below from day one.
              </p>

              <div className="ap-benefits">
                {coreFeatures.map((b) => (
                  <div key={b.text} className="ap-benefit">
                    <span className="ap-benefit-emoji">{b.icon}</span>
                    <span style={{ flex: 1 }}>{b.text}</span>
                    <div className="ap-benefit-check">
                      <Check size={8} color="var(--teal)" strokeWidth={3} />
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

          {/* ── Footer ── */}
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
    </>
  );
}
