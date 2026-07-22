import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import PublicSiteNavbar from "@/components/PublicSiteNavbar";
import PublicSiteFooter from "@/components/PublicSiteFooter";
import { getClientAuthHeaders, getStoredClient, getClientToken, type ClientUser } from "@/lib/clientAuth";
import ClientPortalNavbar from "@/ClientPage/ClientPortalNavbar";
import {
  CheckCircle2,
  Clock,
  Sparkles,
  Bot,
  Zap,
  ChevronRight,
  MessageSquare,
  Users,
  Star,
  Phone,
  ArrowLeft,
  CalendarClock,
  Inbox,
  Loader2,
  MapPin,
  Mail,
  Facebook,
} from "lucide-react";

// ─── Inline styles injected once ────────────────────────────────────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

  .enq-root * { box-sizing: border-box; }
  .enq-root { font-family: 'Inter', sans-serif; }

  @keyframes enq-fadeUp {
    from { opacity: 0; transform: translateY(22px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes enq-fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes enq-shimmer {
    0%   { background-position: -200% center; }
    100% { background-position: 200% center; }
  }
  @keyframes enq-pulse-dot {
    0%, 100% { transform: scale(1); opacity: 1; }
    50%       { transform: scale(1.4); opacity: 0.7; }
  }
  @keyframes enq-spin-slow {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  @keyframes enq-bounce-in {
    0%   { transform: scale(0.7); opacity: 0; }
    60%  { transform: scale(1.08); opacity: 1; }
    100% { transform: scale(1); }
  }
  @keyframes enq-check-draw {
    from { stroke-dashoffset: 60; }
    to   { stroke-dashoffset: 0; }
  }
  @keyframes enq-slide-right {
    from { transform: translateX(-8px); opacity: 0; }
    to   { transform: translateX(0); opacity: 1; }
  }

  .enq-fade-up   { animation: enq-fadeUp 0.55s cubic-bezier(.22,.68,0,1.2) both; }
  .enq-fade-in   { animation: enq-fadeIn 0.4s ease both; }
  .enq-bounce-in { animation: enq-bounce-in 0.6s cubic-bezier(.22,.68,0,1.2) both; }

  .enq-delay-1 { animation-delay: 0.08s; }
  .enq-delay-2 { animation-delay: 0.16s; }
  .enq-delay-3 { animation-delay: 0.24s; }
  .enq-delay-4 { animation-delay: 0.32s; }
  .enq-delay-5 { animation-delay: 0.40s; }
  .enq-delay-6 { animation-delay: 0.48s; }
  .enq-delay-7 { animation-delay: 0.56s; }

  .enq-shimmer-text {
    background: linear-gradient(90deg, #FCD34D 0%, #fff8d6 40%, #FCD34D 60%, #f59e0b 100%);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: enq-shimmer 3s linear infinite;
  }

  .enq-topic-btn {
    transition: all 0.18s cubic-bezier(.22,.68,0,1.2);
    cursor: pointer;
    background: none;
    border: none;
    padding: 0;
    width: 100%;
    text-align: left;
  }
  .enq-topic-btn:hover .enq-topic-inner {
    transform: translateX(4px);
    border-color: #FCD34D;
    background: #fffbeb;
    box-shadow: 0 4px 16px rgba(252,211,77,0.18);
  }
  .enq-topic-btn.active .enq-topic-inner {
    border-color: #FCD34D;
    background: linear-gradient(135deg, #fffbeb 0%, #fef9c3 100%);
    box-shadow: 0 4px 20px rgba(252,211,77,0.25);
  }
  .enq-topic-inner {
    display: flex;
    align-items: center;
    gap: 12px;
    border: 1.5px solid #e5e7eb;
    border-radius: 14px;
    padding: 12px 14px;
    transition: all 0.18s cubic-bezier(.22,.68,0,1.2);
  }

  .enq-input {
    width: 100%;
    border: 1.5px solid #d1d5db;
    border-radius: 14px;
    background: #fff;
    padding: 12px 16px;
    font-size: 14px;
    color: #111827;
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
    font-family: 'Inter', sans-serif;
  }
  .enq-input:focus {
    border-color: #0E4E5E;
    box-shadow: 0 0 0 4px rgba(14,78,94,0.10);
  }
  .enq-input::placeholder { color: #9ca3af; }

  .enq-submit-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: #0E4E5E;
    color: #fff;
    border: none;
    border-radius: 14px;
    padding: 13px 24px;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    transition: background 0.15s, transform 0.12s, box-shadow 0.15s;
    font-family: 'Inter', sans-serif;
  }
  .enq-submit-btn:hover:not(:disabled) {
    background: #0a3845;
    transform: translateY(-1px);
    box-shadow: 0 8px 24px rgba(14,78,94,0.30);
  }
  .enq-submit-btn:active:not(:disabled) { transform: translateY(0); }
  .enq-submit-btn::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.12) 50%, transparent 100%);
    transform: translateX(-100%);
    transition: transform 0.4s;
  }
  .enq-submit-btn:hover::after { transform: translateX(100%); }
  .enq-submit-btn:disabled { opacity: 0.65; cursor: not-allowed; transform: none; }

  .enq-step-card {
    transition: transform 0.2s cubic-bezier(.22,.68,0,1.2), box-shadow 0.2s;
  }
  .enq-step-card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(14,78,94,0.12); }

  .enq-card-form { transition: box-shadow 0.2s; }
  .enq-card-form:hover { box-shadow: 0 12px 40px rgba(14,78,94,0.10); }

  .enq-pulse-dot {
    display: inline-block;
    width: 8px; height: 8px;
    border-radius: 50%;
    background: #FCD34D;
    animation: enq-pulse-dot 1.6s ease-in-out infinite;
    flex-shrink: 0;
  }

  .enq-hero-slash {
    position: absolute;
    top: -30px; right: -20px;
    width: 180px; height: 180px;
    background: linear-gradient(135deg, #FCD34D22, #FCD34D44);
    border-radius: 40px;
    transform: rotate(20deg);
    pointer-events: none;
  }

  /* ── Responsive: Steps grid ── */
  .enq-steps-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    margin-bottom: 32px;
  }

  /* ── Responsive: Main content grid ── */
  .enq-main-grid {
    display: grid;
    grid-template-columns: 340px 1fr;
    gap: 24px;
    align-items: start;
  }

  /* ── Responsive: Name/Email row ── */
  .enq-name-email-grid {
    display: grid;
    gap: 16px;
    grid-template-columns: 1fr 1fr;
  }

  /* ── Responsive: Submit row ── */
  .enq-submit-row {
    display: flex;
    align-items: center;
    gap: 14px;
    flex-wrap: wrap;
  }

  /* ── Hero padding ── */
  .enq-hero {
    padding: 56px 48px 52px;
    margin-bottom: 32px;
  }

  /* ── Confirmation ── */
  .enq-confirm-wrap {
    max-width: 600px;
    margin: 0 auto;
  }

  /* Tablet: ≤ 1024px */
  @media (max-width: 1024px) {
    .enq-main-grid {
      grid-template-columns: 300px 1fr;
      gap: 20px;
    }
    .enq-steps-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  /* Mobile-landscape / small tablet: ≤ 768px */
  @media (max-width: 768px) {
    .enq-main-grid {
      grid-template-columns: 1fr;
    }
    .enq-hero {
      padding: 36px 28px 32px;
      margin-bottom: 20px;
    }
    .enq-steps-grid {
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
      margin-bottom: 20px;
    }
  }

  /* Mobile: ≤ 480px */
  @media (max-width: 480px) {
    .enq-hero {
      padding: 28px 20px 26px;
    }
    .enq-steps-grid {
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      margin-bottom: 16px;
    }
    .enq-name-email-grid {
      grid-template-columns: 1fr;
    }
    .enq-submit-row {
      flex-direction: column;
      align-items: flex-start;
    }
    .enq-submit-btn {
      width: 100%;
      justify-content: center;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .enq-fade-up, .enq-fade-in, .enq-bounce-in { animation: none; }
    .enq-shimmer-text { animation: none; -webkit-text-fill-color: #FCD34D; }
    .enq-pulse-dot { animation: none; }
    .enq-submit-btn::after { display: none; }
  }

  /* ── Footer responsive grid ── */
  @media (max-width: 900px) {
    .enq-footer-grid { grid-template-columns: 1fr 1fr !important; gap: 28px !important; }
  }
  @media (max-width: 520px) {
    .enq-footer-grid { grid-template-columns: 1fr !important; }
  }
`;

type EnquiryProps = {
  embedded?: boolean;
};

const QUICK_TOPICS = [
  {
    label: "Hire a Full-Time Maid",
    icon: "🏠",
    desc: "Live-in or live-out domestic helper",
    prefill:
      "I'm looking for a full-time maid. I prefer [live-in / live-out]. My household has [number] people and I need help with [cleaning / cooking / laundry / etc.]. My preferred start date is [date] and my budget is around [amount] per month.",
  },
  {
    label: "Part-Time Cleaning",
    icon: "🧹",
    desc: "Regular or one-off deep cleans",
    prefill:
      "I'm interested in part-time cleaning services. I need [regular weekly/bi-weekly or a one-off deep clean] for my [apartment / house] in [area]. Preferred schedule: [days/times]. Budget: [range].",
  },
  {
    label: "Elderly Care",
    icon: "❤️",
    desc: "Companion or caretaker support",
    prefill:
      "I'm looking for elderly care support for my [family member]. They need [companionship / personal care / medical assistance]. Preferred hours: [full-time / part-time / live-in]. Start date: [date].",
  },
  {
    label: "Nanny / Babysitter",
    icon: "👶",
    desc: "Childcare at home",
    prefill:
      "I need a [nanny / babysitter] for my child/children aged [ages]. Hours needed: [full-time / part-time, days and times]. Key requirements: [languages, activities, experience with infants, etc.]. Start date: [date].",
  },
  {
    label: "Cook / Chef",
    icon: "🍳",
    desc: "Meal prep or full-time cook",
    prefill:
      "I'm looking for a [cook / personal chef] to [prepare daily meals / meal prep weekly / cook for events]. Cuisine preferences: [local / international / dietary requirements]. Hours: [full-time / part-time]. Start date: [date].",
  },
];

const STEPS = [
  { icon: Inbox,         label: "Send your enquiry",   num: "01" },
  { icon: Users,         label: "Agency team reviews", num: "02" },
  { icon: Zap,           label: "Inbox updated live",  num: "03" },
  { icon: MessageSquare, label: "Agency contacts you", num: "04" },
];

// ─── Confirmation screen ─────────────────────────────────────────────────────
function ConfirmationScreen({ onReset }: { onReset: () => void }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "60px 24px 80px",
        textAlign: "center",
      }}
      className="enq-fade-in"
    >
      {/* Check icon */}
      <div className="enq-bounce-in" style={{ marginBottom: 32, position: "relative" }}>
        <div
          style={{
            width: 112,
            height: 112,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #0E4E5E 0%, #1a6b80 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 16px 48px rgba(14,78,94,0.30)",
          }}
        >
          <CheckCircle2 style={{ width: 52, height: 52, color: "#FCD34D" }} />
        </div>
        <div
          style={{
            position: "absolute",
            top: -4,
            right: -4,
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "#FCD34D",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 12px rgba(252,211,77,0.50)",
          }}
        >
          <Sparkles style={{ width: 16, height: 16, color: "#0E4E5E" }} />
        </div>
      </div>

      <h2
        className="enq-fade-up enq-delay-1"
        style={{
          fontSize: "clamp(26px, 6vw, 36px)",
          fontWeight: 900,
          color: "#0E4E5E",
          marginBottom: 12,
          letterSpacing: "-0.03em",
        }}
      >
        Enquiry Received!
      </h2>
      <p
        className="enq-fade-up enq-delay-2"
        style={{ color: "#6b7280", maxWidth: 420, marginBottom: 40, lineHeight: 1.7, fontSize: 15 }}
      >
        Your message has been sent to the agency team. They'll review it and follow up with you shortly.
      </p>

      {/* Next steps card */}
      <div
        className="enq-fade-up enq-delay-3"
        style={{
          width: "100%",
          maxWidth: 480,
          borderRadius: 20,
          border: "1.5px solid #e5e7eb",
          background: "#fff",
          padding: "24px 28px",
          marginBottom: 28,
          textAlign: "left",
          boxShadow: "0 4px 24px rgba(14,78,94,0.07)",
        }}
      >
        <p
          style={{
            fontSize: 10,
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            color: "#9ca3af",
            marginBottom: 20,
          }}
        >
          What happens next
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {[
            { icon: Inbox,         color: "#0E4E5E", bg: "rgba(14,78,94,0.08)",   text: "Enquiry is now in the agency inbox" },
            { icon: Users,         color: "#0E4E5E", bg: "rgba(14,78,94,0.08)",   text: "Admin or agency team will review it" },
            { icon: CalendarClock, color: "#d97706", bg: "rgba(252,211,77,0.20)", text: "Expect a reply within 1–2 business hours" },
            { icon: Phone,         color: "#0E4E5E", bg: "rgba(14,78,94,0.08)",   text: "Check your phone or email for follow-up" },
          ].map(({ icon: Icon, color, bg, text }, i) => (
            <div
              key={i}
              className={`enq-fade-up enq-delay-${i + 3}`}
              style={{ display: "flex", alignItems: "center", gap: 14 }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: bg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icon style={{ width: 18, height: 18, color }} />
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#374151" }}>{text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Response time badge */}
      <div
        className="enq-fade-up enq-delay-5"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          borderRadius: 999,
          background: "linear-gradient(135deg, #0E4E5E, #1a6b80)",
          padding: "10px 20px",
          marginBottom: 32,
        }}
      >
        <span className="enq-pulse-dot" />
        <p style={{ fontSize: 13, fontWeight: 600, color: "#FCD34D" }}>
          Typical response: <span style={{ fontWeight: 900 }}>1–2 business hours</span>
        </p>
      </div>

      <button
        type="button"
        onClick={onReset}
        className="enq-fade-up enq-delay-6"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          borderRadius: 14,
          border: "1.5px solid #d1d5db",
          background: "#fff",
          padding: "11px 22px",
          fontSize: 14,
          fontWeight: 700,
          color: "#374151",
          cursor: "pointer",
          transition: "all 0.15s",
          fontFamily: "Inter, sans-serif",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = "#0E4E5E";
          (e.currentTarget as HTMLButtonElement).style.color = "#0E4E5E";
          (e.currentTarget as HTMLButtonElement).style.background = "rgba(14,78,94,0.04)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = "#d1d5db";
          (e.currentTarget as HTMLButtonElement).style.color = "#374151";
          (e.currentTarget as HTMLButtonElement).style.background = "#fff";
        }}
      >
        <ArrowLeft style={{ width: 16, height: 16 }} />
        Submit another enquiry
      </button>
    </div>
  );
}

// ─── Simple enquiry form ─────────────────────────────────────────────────────
function SimpleEnquiryForm({
  initialName,
  initialEmail,
  initialPhone,
  initialMessage,
  onSuccess,
}: {
  initialName: string;
  initialEmail: string;
  initialPhone: string;
  initialMessage: string;
  onSuccess: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [phone, setPhone] = useState(initialPhone);
  const [message, setMessage] = useState(initialMessage);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { setName((c) => c || initialName); }, [initialName]);
  useEffect(() => { setEmail((c) => c || initialEmail); }, [initialEmail]);
  useEffect(() => { setPhone((c) => c || initialPhone); }, [initialPhone]);
  useEffect(() => { if (initialMessage) setMessage(initialMessage); }, [initialMessage]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim() || !email.trim() || !phone.trim() || !message.trim()) {
      setError("Name, email, phone, and message are required.");
      return;
    }
    if (!/^[^\s@]+@[^\s@.]+\.[^\s@]+$/.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }
    const phoneDigits = phone.replace(/\D/g, "");
    if (phoneDigits.length < 8) {
      setError("Please enter a valid phone number including country code, e.g. +65 9123 4567.");
      return;
    }
    try {
      setIsSubmitting(true);
      setError("");
      const response = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getClientAuthHeaders() },
        body: JSON.stringify({
          username: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          message: message.trim(),
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Failed to submit enquiry");
      setMessage("");
      onSuccess();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to submit enquiry");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={(event) => void handleSubmit(event)} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Name + Email row — collapses to single column on mobile via CSS class */}
      <div className="enq-name-email-grid">
        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
            Full Name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your full name"
            className="enq-input"
          />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
            Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="enq-input"
          />
        </div>
      </div>

      <div>
        <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
          Phone Number
        </label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+65 9123 4567"
          className="enq-input"
        />
        <p style={{ marginTop: 6, fontSize: 12, color: "#9ca3af" }}>Include country code, e.g. +65 for Singapore</p>
      </div>

      <div>
        <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
          Your Message
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tell the agency what kind of help you need — the more detail, the faster they can match you."
          rows={8}
          className="enq-input"
          style={{ resize: "vertical", lineHeight: 1.7 }}
        />
      </div>

      {error && (
        <div
          style={{
            borderRadius: 12,
            border: "1.5px solid #fca5a5",
            background: "#fef2f2",
            padding: "12px 16px",
            fontSize: 13,
            fontWeight: 500,
            color: "#b91c1c",
          }}
        >
          {error}
        </div>
      )}

      <div className="enq-submit-row">
        <button type="submit" disabled={isSubmitting} className="enq-submit-btn">
          {isSubmitting
            ? <Loader2 style={{ width: 16, height: 16, animation: "enq-spin-slow 0.8s linear infinite" }} />
            : <Inbox style={{ width: 16, height: 16 }} />
          }
          {isSubmitting ? "Sending…" : "Send Enquiry"}
          {!isSubmitting && (
            <span
              style={{
                marginLeft: 4,
                background: "#FCD34D",
                color: "#0E4E5E",
                borderRadius: 6,
                padding: "2px 8px",
                fontSize: 11,
                fontWeight: 800,
              }}
            >
              FREE
            </span>
          )}
        </button>
        <p style={{ fontSize: 12, color: "#9ca3af" }}>Goes straight to the agency admin inbox.</p>
      </div>
    </form>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────
const Enquiry = ({ embedded = false }: EnquiryProps) => {
  const [clientUser] = useState<ClientUser | null>(getStoredClient());
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const isLoggedIn = !!getClientToken();

  const selectedTopicData = QUICK_TOPICS.find((t) => t.label === selectedTopic);

  const handleReset = () => {
    setSubmitted(false);
    setSelectedTopic(null);
  };

  return (
    <>
      {/* Inject global CSS once */}
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />

      <div
        className="enq-root"
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          background: "#f4f7f8",
        }}
      >
        {!embedded && (isLoggedIn ? <ClientPortalNavbar /> : <PublicSiteNavbar />)}

        <main style={{ flex: 1, paddingTop: 56, paddingBottom: 80 }}>
          <div
            style={{
              width: "100%",
              maxWidth: 1360,
              margin: "0 auto",
              padding: "0 16px",
            }}
          >
            {submitted ? (
              <div className="enq-confirm-wrap">
                <ConfirmationScreen onReset={handleReset} />
              </div>
            ) : (
              <>
                {/* ── Hero ── */}
                <div
                  className="enq-fade-up enq-hero"
                  style={{
                    position: "relative",
                    borderRadius: 28,
                    background: "linear-gradient(135deg, #0E4E5E 0%, #0a3845 100%)",
                    overflow: "hidden",
                  }}
                >
                  {/* decorative slash shapes */}
                  <div
                    style={{
                      position: "absolute",
                      top: -40,
                      right: -40,
                      width: 220,
                      height: 220,
                      borderRadius: 56,
                      background: "rgba(252,211,77,0.12)",
                      transform: "rotate(20deg)",
                      pointerEvents: "none",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      bottom: -60,
                      right: 160,
                      width: 160,
                      height: 160,
                      borderRadius: 40,
                      background: "rgba(252,211,77,0.07)",
                      transform: "rotate(-15deg)",
                      pointerEvents: "none",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      top: "50%",
                      right: 48,
                      transform: "translateY(-50%)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                      opacity: 0.15,
                      pointerEvents: "none",
                    }}
                  >
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        style={{
                          width: 40 + i * 12,
                          height: 3,
                          borderRadius: 99,
                          background: "#FCD34D",
                        }}
                      />
                    ))}
                  </div>

                  {/* badge */}
                  <div
                    className="enq-fade-up enq-delay-1"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      borderRadius: 999,
                      border: "1.5px solid rgba(252,211,77,0.35)",
                      background: "rgba(252,211,77,0.10)",
                      padding: "7px 16px",
                      marginBottom: 22,
                    }}
                  >
                    <span className="enq-pulse-dot" />
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#FCD34D", letterSpacing: "0.04em" }}>
                      Direct Agency Enquiry
                    </span>
                  </div>

                  <h1
                    className="enq-fade-up enq-delay-2"
                    style={{
                      fontSize: "clamp(28px, 5vw, 56px)",
                      fontWeight: 900,
                      color: "#fff",
                      letterSpacing: "-0.035em",
                      lineHeight: 1.08,
                      marginBottom: 16,
                      maxWidth: 600,
                    }}
                  >
                    Find the right help{" "}
                    <span className="enq-shimmer-text">faster.</span>
                  </h1>

                  <p
                    className="enq-fade-up enq-delay-3"
                    style={{
                      fontSize: "clamp(14px, 2vw, 16px)",
                      color: "rgba(255,255,255,0.70)",
                      maxWidth: 480,
                      lineHeight: 1.75,
                      marginBottom: 0,
                    }}
                  >
                    Fill out the enquiry below and it lands directly in the agency inbox — no middlemen, no delays.
                  </p>
                </div>

                {/* ── Process steps ── */}
                <div className="enq-steps-grid">
                  {STEPS.map(({ icon: Icon, label, num }, i) => (
                    <div
                      key={label}
                      className={`enq-step-card enq-fade-up enq-delay-${i + 2}`}
                      style={{
                        borderRadius: 20,
                        border: "1.5px solid #e5e7eb",
                        background: "#fff",
                        padding: "22px 18px 20px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-start",
                        gap: 14,
                        position: "relative",
                        overflow: "hidden",
                      }}
                    >
                      {/* Step number watermark */}
                      <span
                        style={{
                          position: "absolute",
                          top: 10,
                          right: 14,
                          fontSize: 36,
                          fontWeight: 900,
                          color: "rgba(14,78,94,0.06)",
                          letterSpacing: "-0.04em",
                          lineHeight: 1,
                          userSelect: "none",
                        }}
                      >
                        {num}
                      </span>
                      {/* Icon badge */}
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 14,
                          background: i === 0 || i === 1 || i === 3
                            ? "linear-gradient(135deg, #0E4E5E, #1a6b80)"
                            : "linear-gradient(135deg, #d97706, #f59e0b)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          boxShadow: "0 4px 12px rgba(14,78,94,0.20)",
                        }}
                      >
                        <Icon style={{ width: 20, height: 20, color: i === 2 ? "#fff" : "#FCD34D" }} />
                      </div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "#1f2937", lineHeight: 1.4 }}>{label}</p>
                    </div>
                  ))}
                </div>

                {/* ── Main grid ── */}
                <div className="enq-main-grid">

                  {/* ── Left sidebar ── */}
                  <div
                    className="enq-fade-up enq-delay-4"
                    style={{ display: "flex", flexDirection: "column", gap: 16 }}
                  >
                    {/* Quick topics */}
                    <div
                      style={{
                        borderRadius: 20,
                        border: "1.5px solid #e5e7eb",
                        background: "#fff",
                        padding: "20px",
                        boxShadow: "0 2px 12px rgba(14,78,94,0.05)",
                      }}
                    >
                      <div style={{ marginBottom: 16 }}>
                        <p
                          style={{
                            fontSize: 10,
                            fontWeight: 800,
                            textTransform: "uppercase",
                            letterSpacing: "0.12em",
                            color: "#9ca3af",
                            marginBottom: 4,
                          }}
                        >
                          Quick Topics
                        </p>
                        <p style={{ fontSize: 12, color: "#9ca3af", lineHeight: 1.5 }}>
                          Pick a topic to auto-fill a message template.
                        </p>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {QUICK_TOPICS.map((topic) => (
                          <button
                            key={topic.label}
                            onClick={() => setSelectedTopic(topic.label === selectedTopic ? null : topic.label)}
                            className={`enq-topic-btn${selectedTopic === topic.label ? " active" : ""}`}
                          >
                            <div className="enq-topic-inner">
                              <span style={{ fontSize: 18, lineHeight: 1, width: 28, textAlign: "center", flexShrink: 0 }}>
                                {topic.icon}
                              </span>
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <p
                                  style={{
                                    fontSize: 13,
                                    fontWeight: 700,
                                    color: selectedTopic === topic.label ? "#0E4E5E" : "#1f2937",
                                    lineHeight: 1.3,
                                  }}
                                >
                                  {topic.label}
                                </p>
                                <p
                                  style={{
                                    fontSize: 11,
                                    marginTop: 2,
                                    color: selectedTopic === topic.label ? "#0a6075" : "#9ca3af",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                  }}
                                >
                                  {topic.desc}
                                </p>
                              </div>
                              <ChevronRight
                                style={{
                                  width: 14,
                                  height: 14,
                                  flexShrink: 0,
                                  color: selectedTopic === topic.label ? "#0E4E5E" : "#d1d5db",
                                  transform: selectedTopic === topic.label ? "rotate(90deg)" : "none",
                                  transition: "transform 0.18s",
                                }}
                              />
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Tips card */}
                    <div
                      style={{
                        borderRadius: 20,
                        background: "linear-gradient(135deg, #0E4E5E 0%, #0a3845 100%)",
                        padding: "20px",
                        position: "relative",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          top: -20,
                          right: -20,
                          width: 80,
                          height: 80,
                          borderRadius: 20,
                          background: "rgba(252,211,77,0.12)",
                          transform: "rotate(20deg)",
                        }}
                      />
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 8,
                            background: "#FCD34D",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Star style={{ width: 14, height: 14, color: "#0E4E5E" }} />
                        </div>
                        <p style={{ fontSize: 13, fontWeight: 800, color: "#FCD34D" }}>Tips for faster matching</p>
                      </div>
                      <ul style={{ display: "flex", flexDirection: "column", gap: 10, listStyle: "none", padding: 0, margin: 0 }}>
                        {[
                          "Mention your preferred start date",
                          "Specify live-in or live-out",
                          "Include a monthly budget range",
                          "Note special requirements (languages, diet…)",
                        ].map((tip) => (
                          <li key={tip} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                            <CheckCircle2
                              style={{ width: 14, height: 14, color: "#FCD34D", flexShrink: 0, marginTop: 2 }}
                            />
                            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.80)", lineHeight: 1.5 }}>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Phone nudge */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 12,
                        borderRadius: 16,
                        border: "1.5px solid rgba(252,211,77,0.35)",
                        background: "rgba(252,211,77,0.06)",
                        padding: "16px",
                      }}
                    >
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          background: "#FCD34D",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <Phone style={{ width: 16, height: 16, color: "#0E4E5E" }} />
                      </div>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 800, color: "#0E4E5E", marginBottom: 4 }}>
                          Add your phone number
                        </p>
                        <p style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.6 }}>
                          Enquiries with a phone number get faster responses — agencies often call for a quick follow-up.
                        </p>
                      </div>
                    </div>

                    {/* Response time */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        borderRadius: 14,
                        border: "1.5px solid #e5e7eb",
                        background: "#fff",
                        padding: "14px 16px",
                      }}
                    >
                      <span className="enq-pulse-dot" style={{ background: "#0E4E5E" }} />
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 700, color: "#1f2937" }}>Typical response</p>
                        <p style={{ fontSize: 12, color: "#9ca3af" }}>Agency replies within 1–2 business hours</p>
                      </div>
                    </div>
                  </div>

                  {/* ── Right: form column ── */}
                  <div
                    className="enq-fade-up enq-delay-5"
                    style={{ display: "flex", flexDirection: "column", gap: 16 }}
                  >
                    {/* Template loaded banner */}
                    {selectedTopic && selectedTopicData && (
                      <div
                        className="enq-slide-right enq-fade-in"
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 12,
                          borderRadius: 16,
                          border: "1.5px solid #FCD34D",
                          background: "rgba(252,211,77,0.10)",
                          padding: "14px 18px",
                        }}
                      >
                        <span style={{ fontSize: 22, lineHeight: 1, marginTop: 2 }}>{selectedTopicData.icon}</span>
                        <div>
                          <p style={{ fontSize: 14, fontWeight: 800, color: "#0E4E5E" }}>
                            Template loaded: {selectedTopicData.label}
                          </p>
                          <p style={{ fontSize: 13, color: "#4b5563", marginTop: 2, lineHeight: 1.6 }}>
                            Message pre-filled below. Replace the{" "}
                            <span
                              style={{
                                fontWeight: 700,
                                color: "#0E4E5E",
                                background: "rgba(252,211,77,0.3)",
                                borderRadius: 4,
                                padding: "1px 5px",
                              }}
                            >
                              [bracketed]
                            </span>{" "}
                            parts with your actual details.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Template preview */}
                    {selectedTopicData && (
                      <div
                        style={{
                          borderRadius: 16,
                          border: "1.5px solid rgba(14,78,94,0.12)",
                          background: "rgba(14,78,94,0.03)",
                          padding: "16px 18px",
                        }}
                      >
                        <p
                          style={{
                            fontSize: 11,
                            fontWeight: 800,
                            textTransform: "uppercase",
                            letterSpacing: "0.1em",
                            color: "#0E4E5E",
                            marginBottom: 10,
                          }}
                        >
                          Template Preview
                        </p>
                        <pre
                          style={{
                            whiteSpace: "pre-wrap",
                            borderRadius: 12,
                            background: "#fff",
                            border: "1.5px solid rgba(14,78,94,0.10)",
                            padding: "14px 16px",
                            fontSize: 12.5,
                            color: "#374151",
                            lineHeight: 1.75,
                            fontFamily: "Inter, sans-serif",
                            boxShadow: "0 2px 8px rgba(14,78,94,0.06)",
                            overflowX: "auto",
                          }}
                        >
                          {selectedTopicData.prefill}
                        </pre>
                      </div>
                    )}

                    {/* Form card */}
                    <div
                      className="enq-card-form"
                      style={{
                        borderRadius: 24,
                        border: "1.5px solid #e5e7eb",
                        background: "#fff",
                        overflow: "hidden",
                        boxShadow: "0 4px 24px rgba(14,78,94,0.08)",
                      }}
                    >
                      {/* Card header */}
                      <div
                        style={{
                          background: "linear-gradient(135deg, #0E4E5E 0%, #0a3845 100%)",
                          padding: "22px 28px",
                          display: "flex",
                          alignItems: "center",
                          gap: 14,
                          position: "relative",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            position: "absolute",
                            top: -20,
                            right: -20,
                            width: 100,
                            height: 100,
                            borderRadius: 28,
                            background: "rgba(252,211,77,0.10)",
                            transform: "rotate(15deg)",
                          }}
                        />
                        <div
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 14,
                            background: "rgba(255,255,255,0.12)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            border: "1.5px solid rgba(255,255,255,0.18)",
                            flexShrink: 0,
                          }}
                        >
                          <Bot style={{ width: 22, height: 22, color: "#FCD34D" }} />
                        </div>
                        <div>
                          <h2 style={{ fontSize: 18, fontWeight: 900, color: "#fff", letterSpacing: "-0.02em" }}>
                            Submit Your Enquiry
                          </h2>
                          <p style={{ fontSize: 12, color: "rgba(252,211,77,0.80)", marginTop: 2 }}>
                            Sent directly to the agency admin team.
                          </p>
                        </div>
                      </div>

                      {/* Form body */}
                      <div style={{ padding: "28px" }}>
                        <SimpleEnquiryForm
                          initialName={clientUser?.name ?? ""}
                          initialEmail={clientUser?.email ?? ""}
                          initialPhone={clientUser?.phone ?? ""}
                          initialMessage={selectedTopicData?.prefill ?? ""}
                          onSuccess={() => setSubmitted(true)}
                        />
                      </div>
                    </div>

                    {/* Footer note */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 10,
                        borderRadius: 14,
                        border: "1.5px solid #e5e7eb",
                        background: "#fff",
                        padding: "14px 18px",
                        boxShadow: "0 2px 8px rgba(14,78,94,0.04)",
                      }}
                    >
                      <Zap style={{ width: 16, height: 16, color: "#FCD34D", flexShrink: 0, marginTop: 2 }} />
                      <p style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.6 }}>
                        <span style={{ fontWeight: 700, color: "#374151" }}>Submission note: </span>
                        This page sends a plain enquiry straight to the agency or admin enquiry inbox for follow-up.
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </main>

        {/* ── FOOTER ── */}
        {false && !embedded && (
          <footer style={{ background: "#061D26", padding: "64px 0 0", fontFamily: "'Inter', sans-serif" }}>
            <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>
              <div
                className="enq-footer-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.4fr 1fr 1.2fr 1.2fr 0.8fr",
                  gap: 36,
                  marginBottom: 48,
                }}
              >
                {/* Brand */}
                <div>
                  <h4
                    style={{
                      fontFamily: "'Playfair Display', Georgia, serif",
                      fontSize: 17,
                      fontWeight: 700,
                      color: "#fff",
                      margin: "0 0 12px",
                    }}
                  >
                    "Find Maids" At The Agency
                  </h4>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", lineHeight: 1.7, margin: 0 }}>
                    Matching trusted domestic professionals with families since 2009.
                  </p>
                </div>

                {/* Quick Links */}
                <div>
                  <h5
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#fff",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      margin: "0 0 16px",
                      fontFamily: "'Inter',sans-serif",
                    }}
                  >
                    Quick Links
                  </h5>
                  <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                    {[
                      { label: "Home",         to: "/"             },
                      { label: "Search Maids", to: "/search-maids" },
                      { label: "About Us",     to: "/about"        },
                      { label: "Agency",       to: "/agency"       },
                      { label: "Enquiry",      to: "/enquiry2"     },
                      { label: "FAQ",          to: "/faq"          },
                    ].map((item) => (
                      <li key={item.to}>
                        <Link
                          to={item.to}
                          style={{
                            color: "rgba(255,255,255,0.65)",
                            fontSize: 13,
                            textDecoration: "none",
                            transition: "color 0.15s",
                            fontFamily: "'Inter',sans-serif",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = "#FCD34D")}
                          onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.65)")}
                        >
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Contact Us */}
                <div>
                  <h5
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#fff",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      margin: "0 0 16px",
                      fontFamily: "'Inter',sans-serif",
                    }}
                  >
                    Contact Us
                  </h5>
                  <ul
                    style={{
                      listStyle: "none",
                      margin: 0,
                      padding: 0,
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                      fontSize: 13,
                      color: "rgba(255,255,255,0.7)",
                      fontFamily: "'Inter',sans-serif",
                      lineHeight: 1.6,
                    }}
                  >
                    <li style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                      <MapPin size={16} color="#FCD34D" style={{ flexShrink: 0, marginTop: 2 }} />
                      <span>3 Jalan Kukoh, #01-115<br />Singapore 161003</span>
                    </li>
                    <li style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <Mail size={16} color="#FCD34D" style={{ flexShrink: 0 }} />
                      <a
                        href="mailto:enquiries.j1@gmail.com"
                        style={{ color: "rgba(255,255,255,0.7)", textDecoration: "none", transition: "color 0.15s" }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "#FCD34D")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
                      >
                        enquiries.j1@gmail.com
                      </a>
                    </li>
                    <li style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <Phone size={16} color="#FCD34D" style={{ flexShrink: 0 }} />
                      <a
                        href="tel:+6580730757"
                        style={{ color: "rgba(255,255,255,0.7)", textDecoration: "none", transition: "color 0.15s" }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "#FCD34D")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
                      >
                        8073 0757
                      </a>
                    </li>
                  </ul>
                </div>

                {/* Opening Hours */}
                <div>
                  <h5
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#fff",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      margin: "0 0 16px",
                      fontFamily: "'Inter',sans-serif",
                    }}
                  >
                    Opening Hours
                  </h5>
                  <ul
                    style={{
                      listStyle: "none",
                      margin: 0,
                      padding: 0,
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                      fontSize: 13,
                      color: "rgba(255,255,255,0.7)",
                      fontFamily: "'Inter',sans-serif",
                      lineHeight: 1.6,
                    }}
                  >
                    <li style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                      <Clock size={16} color="#FCD34D" style={{ flexShrink: 0, marginTop: 2 }} />
                      <span>Mon to Sun: 11:00am to 11:00pm</span>
                    </li>
                    <li style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                      <MessageSquare size={16} color="#FCD34D" style={{ flexShrink: 0, marginTop: 2 }} />
                      <span>Other hours: by mobile. If unable to reach us urgently, please SMS.</span>
                    </li>
                  </ul>
                </div>

                {/* Follow Us */}
                <div>
                  <h5
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#fff",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      margin: "0 0 16px",
                      fontFamily: "'Inter',sans-serif",
                    }}
                  >
                    Follow Us
                  </h5>
                  <div style={{ display: "flex", gap: 10 }}>
                    <a
                      href="#"
                      aria-label="Facebook"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        border: "1.5px solid rgba(255,255,255,0.18)",
                        color: "#1877F2",
                        transition: "all 0.15s",
                        textDecoration: "none",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = "#0E4E5E";
                        e.currentTarget.style.background = "#1877F2";
                        e.currentTarget.style.borderColor = "#1877F2";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = "#1877F2";
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)";
                      }}
                    >
                      <Facebook size={18} />
                    </a>
                  </div>
                </div>
              </div>

              {/* Bottom bar */}
              <div
                style={{
                  borderTop: "1px solid rgba(255,255,255,0.1)",
                  padding: "20px 0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", margin: 0, fontFamily: "'Inter',sans-serif" }}>
                  © 2026 "Find Maids" At The Agency. All rights reserved.
                </p>
                <div style={{ display: "flex", gap: 6 }}>
                  {["Privacy", "Terms", "Contact"].map((item) => (
                    <Link
                      key={item}
                      to="/contact"
                      style={{
                        fontSize: 12,
                        color: "rgba(255,255,255,0.45)",
                        textDecoration: "none",
                        padding: "0 8px",
                        fontFamily: "'Inter',sans-serif",
                        transition: "color 0.15s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "#FCD34D")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.45)")}
                    >
                      {item}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </footer>
        )}
        {!embedded && <PublicSiteFooter />}
      </div>
    </>
  );
};

export default Enquiry;
