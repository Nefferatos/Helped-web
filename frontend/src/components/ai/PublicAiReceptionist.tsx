import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Loader2,
  Send,
  Sparkles,
  X,
  ChevronDown,
  Trash2,
  Lock,
  User,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { callAiAgent } from "@/lib/aiAgents";
import { getClientToken } from "@/lib/clientAuth";

/* ── Maid card types ───────────────────────────────────────────────────────── */

type FeaturedMaid = {
  id: number | string;
  referenceCode: string;
  fullName: string;
  nationality?: string;
  type?: string;
  status?: string;
  hasPhoto?: boolean;
  photoUrl?: string | null;
};

type Message = {
  role: "user" | "assistant";
  text: string;
  timestamp?: Date;
  maids?: FeaturedMaid[];
};

const splitMaidDescriptions = (text: string, maids?: FeaturedMaid[]) => {
  if (!maids || maids.length < 2) return null;

  const blocks = text.split(/\n\s*\n/).map((block) => block.trim()).filter(Boolean);
  const descriptions = new Map<string, string>();
  const general: string[] = [];
  const closing: string[] = [];

  blocks.forEach((block) => {
    const maid = maids.find((item) => block.includes(item.referenceCode));
    if (maid) {
      descriptions.set(maid.referenceCode, block);
    } else if (/tap any profile card|ask me about a specific helper/i.test(block)) {
      closing.push(block);
    } else {
      general.push(block);
    }
  });

  // Only switch to interleaved rendering when every card has a matching
  // description. Otherwise retain the original safe text-then-cards layout.
  if (maids.some((maid) => !descriptions.has(maid.referenceCode))) return null;
  return { general: general.join("\n\n"), descriptions, closing: closing.join("\n\n") };
};

/* ── Nationality flags ─────────────────────────────────────────────────────── */

const NAT_FLAGS: Record<string, string> = {
  filipino:"ph", philippines:"ph", indonesian:"id", indonesia:"id",
  myanmar:"mm", burmese:"mm", cambodian:"kh", cambodia:"kh",
  vietnamese:"vn", vietnam:"vn", thai:"th", thailand:"th",
  indian:"in", india:"in", "sri lankan":"lk", "sri lanka":"lk",
  bangladeshi:"bd", bangladesh:"bd", nepali:"np", nepal:"np",
};
const getFlagCode = (nat?: string) => {
  if (!nat) return "";
  const k = nat.toLowerCase().trim();
  return NAT_FLAGS[k] ?? Object.entries(NAT_FLAGS).find(([key]) => k.includes(key))?.[1] ?? "";
};

/* ── Maid card shown inside the chat ─────────────────────────────────────── */

function AiMaidCard({ maid, isLoggedIn }: { maid: FeaturedMaid; isLoggedIn: boolean }) {
  const flagCode = getFlagCode(maid.nationality);
  const photo = maid.photoUrl || null;
  const profileUrl = `/maids/${encodeURIComponent(maid.referenceCode)}`;
  const loginUrl = `/employer-login?redirect=${encodeURIComponent(profileUrl)}`;

  return (
    <div
      className="relative overflow-hidden rounded-xl border"
      style={{
        background: "#fff",
        borderColor: "rgba(14,78,94,0.18)",
        boxShadow: "0 2px 10px rgba(0,0,0,0.07)",
        width: "100%",
        maxWidth: "100%",
      }}
    >
      <div className="flex items-start gap-3 p-3">
        {/* Photo */}
        <div
          className="relative flex-shrink-0 overflow-hidden rounded-lg"
          style={{ width: 64, height: 80, background: "#edf8fb" }}
        >
          <div className="absolute inset-0 flex h-full w-full items-center justify-center">
            <User className="h-7 w-7" style={{ color: "#6e8f9a" }} />
          </div>
          {photo ? (
            <img
              src={photo}
              alt=""
              onError={(event) => { event.currentTarget.style.display = "none"; }}
              className="absolute inset-0"
              style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center", display: "block" }}
            />
          ) : null}
          {!isLoggedIn && (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ backdropFilter: "blur(6px)", background: "rgba(255,255,255,0.45)" }}
            >
              <Lock className="h-4 w-4" style={{ color: "#0E4E5E" }} />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-bold leading-tight" style={{ color: "#0A2830" }}>
            {maid.fullName}
          </p>
          <p className="mt-0.5 text-[11px]" style={{ color: "#3d5c66" }}>
            {maid.referenceCode}
          </p>

          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {maid.nationality && (
              <span className="flex items-center gap-1 text-[11px]" style={{ color: "#3d5c66" }}>
                {flagCode && (
                  <img
                    src={`https://flagcdn.com/w20/${flagCode}.png`}
                    alt={flagCode}
                    style={{ width: 14, height: 10, borderRadius: 2, objectFit: "cover" }}
                  />
                )}
                {maid.nationality}
              </span>
            )}
            {maid.type && (
              <span
                className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                style={{ background: "#fffbeb", color: "#0E4E5E" }}
              >
                {maid.type}
              </span>
            )}
          </div>

          {maid.status && (
            <p className="mt-1 text-[10px] font-medium" style={{ color: maid.status.toLowerCase().includes("available") ? "#0E4E5E" : "#6b7280" }}>
              ● {maid.status}
            </p>
          )}
        </div>
      </div>

      {isLoggedIn ? (
        <Link
          to={profileUrl}
          className="flex w-full items-center justify-center gap-1.5 py-2 text-[12px] font-semibold transition-colors"
          style={{ borderTop: "1px solid rgba(14,78,94,0.12)", background: "#edf8fb", color: "#0E4E5E" }}
        >
          View Full Profile →
        </Link>
      ) : (
        <Link
          to={loginUrl}
          className="flex w-full items-center justify-center gap-1.5 py-2 text-[12px] font-semibold transition-colors"
          style={{ borderTop: "1px solid rgba(14,78,94,0.12)", background: "#edf8fb", color: "#0E4E5E" }}
        >
          <Lock className="h-3 w-3" /> Login to view profile
        </Link>
      )}
    </div>
  );
}

const PROMPTS = [
  "Show me your available helpers",
  "I need a transfer maid — who's available now?",
  "Find a helper with childcare experience",
  "Do you have helpers with elderly care experience?",
];

const normalizePath = (path: string) => path.replace(/\/+$/, "") || "/";

const matchesRoute = (path: string, route: string) => {
  const normalizedPath = normalizePath(path);
  return normalizedPath === route || normalizedPath.startsWith(`${route}/`);
};

const formatTime = (date?: Date) => {
  if (!date) return "";
  return new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit" }).format(date);
};

/**
 * Idle-animated avatar:
 * - "breathe" prop wraps the SVG in a gentle bob/scale loop so it never looks frozen.
 * - Eyes blink on their own independent cycle (right eye slightly offset) for a natural feel.
 */
function MaidAvatar({ size = "md", breathe = true }: { size?: "sm" | "md" | "fab"; breathe?: boolean }) {
  const px = size === "sm" ? 24 : size === "fab" ? 46 : 36;
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className={breathe ? "air-avatar-breathe" : ""}
      style={{ display: "block", flexShrink: 0 }}
    >
      <circle cx="50" cy="50" r="50" fill="#FCD34D" />
      <path d="M28 72 Q26 88 25 96 Q37 100 50 100 Q63 100 75 96 Q74 88 72 72 Q62 68 50 67 Q38 68 28 72Z" fill="#1e1b4b" />
      <path d="M40 70 Q50 67 60 70 L62 88 Q56 92 50 92 Q44 92 38 88Z" fill="#ffffff" />
      <ellipse cx="44" cy="71" rx="6" ry="4" fill="#ffffff" transform="rotate(-25 44 71)" />
      <ellipse cx="56" cy="71" rx="6" ry="4" fill="#ffffff" transform="rotate(25 56 71)" />
      <ellipse cx="50" cy="70" rx="5" ry="3" fill="#ffffff" />
      <path d="M37 64 Q50 59 63 64 L60 70 Q50 67 40 70Z" fill="#ffffff" />
      <rect x="44" y="56" width="12" height="10" rx="4" fill="#fde8d8" />
      <ellipse cx="50" cy="40" rx="24" ry="26" fill="#fde8d8" />
      <ellipse cx="50" cy="38" rx="26" ry="27" fill="#1a1a2e" />
      <path d="M28 34 Q32 18 50 15 Q68 18 72 34 Q64 26 50 25 Q36 26 28 34Z" fill="#1a1a2e" />
      <path d="M26 36 Q22 52 26 68 Q30 72 34 70 Q30 55 31 38Z" fill="#1a1a2e" />
      <path d="M74 36 Q78 52 74 68 Q70 72 66 70 Q70 55 69 38Z" fill="#1a1a2e" />

      {/* ── Left eye (independent blink cycle) ── */}
      <g className="air-eye air-eye-left">
        <ellipse cx="41" cy="41" rx="7" ry="6" fill="#ffffff" />
        <circle cx="41" cy="41" r="4.5" fill="#0ea5e9" />
        <circle cx="41" cy="41" r="2.2" fill="#0369a1" />
        <circle cx="41" cy="41" r="1.1" fill="#7dd3fc" />
        <circle cx="38.5" cy="38.8" r="1.4" fill="#ffffff" opacity="0.9" />
      </g>

      {/* ── Right eye (slightly offset blink so both don't blink in perfect unison) ── */}
      <g className="air-eye air-eye-right">
        <ellipse cx="59" cy="41" rx="7" ry="6" fill="#ffffff" />
        <circle cx="59" cy="41" r="4.5" fill="#0ea5e9" />
        <circle cx="59" cy="41" r="2.2" fill="#0369a1" />
        <circle cx="59" cy="41" r="1.1" fill="#7dd3fc" />
        <circle cx="56.5" cy="38.8" r="1.4" fill="#ffffff" opacity="0.9" />
      </g>

      <path d="M34 37 Q37 33 41 34 Q45 33 48 37" fill="none" stroke="#1a1a2e" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M52 37 Q55 33 59 34 Q63 33 66 37" fill="none" stroke="#1a1a2e" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M44 52 Q50 57 56 52" fill="none" stroke="#d06060" strokeWidth="1.8" strokeLinecap="round" />
      <ellipse cx="35" cy="47" rx="6" ry="3.5" fill="#f9a8d4" opacity="0.45" />
      <ellipse cx="65" cy="47" rx="6" ry="3.5" fill="#f9a8d4" opacity="0.45" />
      <path d="M27 32 Q33 22 50 20 Q67 22 73 32 L72 36 Q66 27 50 25 Q34 27 28 36Z" fill="#ffffff" stroke="#e2e8f0" strokeWidth="0.8" />
      <path d="M27 32 Q20 22 23 13 Q26 8 31 12 Q33 18 30 28 Q28 34 28 36Z" fill="#ffffff" stroke="#e2e8f0" strokeWidth="0.8" />
      <path d="M73 32 Q80 22 77 13 Q74 8 69 12 Q67 18 70 28 Q72 34 72 36Z" fill="#ffffff" stroke="#e2e8f0" strokeWidth="0.8" />
      <circle cx="50" cy="17" r="5" fill="#0ea5e9" />
      <text x="50" y="20" textAnchor="middle" fontSize="5" fill="#ffffff" fontWeight="bold" fontFamily="sans-serif">AI</text>
    </svg>
  );
}

/* ── FAQ data ─────────────────────────────────────────────────────────────── */

const FAQS = [
  {
    id: "services",
    question: "What services do you offer?",
    answer:
      "We connect employers with trusted domestic helpers and link them to licensed maid agencies. Our platform covers helper placement (new and transfer maids), employment contract management, agency verification, AI-powered matching, and ongoing support throughout the hiring process.",
    link: { label: "Search Helpers", to: "/search-maids" },
  },
  {
    id: "employer-account",
    question: "How do I create an employer account?",
    answer:
      'Click "Sign Up" on the homepage and choose "Employer". Fill in your name, email, and contact details, then verify your email. Once verified you can log in, browse helper profiles, and submit hiring requests.',
    link: { label: "Sign Up as Employer", to: "/employer-login" },
  },
  {
    id: "agency-account",
    question: "How do I create an agency portal account?",
    answer:
      "Agencies register through the Agency Portal. Submit your agency credentials and business information for review. Once approved you'll receive access to list and manage helpers, process contracts, and receive client inquiries.",
    link: { label: "Go to Agency Portal", to: "/agency" },
  },
  {
    id: "hire-helper",
    question: "How do I hire a helper?",
    answer:
      "Browse available helpers, then pick one you like and start the hiring process from their profile. You can also submit a general enquiry and our team will shortlist helpers based on your needs. An employer account is required to proceed.",
    link: { label: "Submit an Enquiry", to: "/enquiry2" },
  },
  // {
  //   id: "view-profiles",
  //   question: "Can I browse helper profiles without an account?",
  //   answer:
  //     "Yes — you can search and browse helper profiles on our website without logging in. However, viewing full biodata, contact details, and initiating the hiring process requires an employer account.",
  //   link: { label: "Browse Helpers", to: "/search-maids" },
  // },
  {
    id: "apply-as-fdw",
    question: "I'm a domestic worker — how do I apply?",
    answer:
      "Domestic workers can apply directly through our public application page. Complete the 4-step form with your biodata, health details, skills, and documents. After submitting you'll receive an application ID to track your status.",
    link: { label: "Apply as Helper", to: "/apply-as-maid" },
  },
];

export default function PublicAiReceptionist() {
  const location = useLocation();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const isLoggedIn = Boolean(getClientToken());
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  const closePanel = () => {
    setIsClosing(true);
    setShowClearConfirm(false);
    setMessage("");
    setTimeout(() => {
      setOpen(false);
      setIsClosing(false);
    }, 320);
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);


  useEffect(() => {
    if (open) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 60);
    }
  }, [messages, open, loading]);

  useEffect(() => {
    if (open) {
      setTimeout(() => textareaRef.current?.focus(), 120);
    }
  }, [open]);

  if (!mounted) return null;
  const path = location.pathname;
  if (matchesRoute(path, "/agency") || matchesRoute(path, "/agencyadmin")) return null;

  const submit = async () => {
    const text = message.trim();
    if (!text) return;

    const userMsg: Message = { role: "user", text, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setMessage("");
    setLoading(true);

    try {
      const result = await callAiAgent("/api/ai/receptionist", {
        message: text,
        conversationId,
        currentPath: location.pathname,
        history: messages.slice(-12).map((msg) => ({ role: msg.role, content: msg.text })),
      });
      const payload = result as unknown as { featuredMaids?: FeaturedMaid[] };
      const assistantMsg: Message = {
        role: "assistant",
        text: result.response || "I'm here to help — could you tell me more?",
        timestamp: new Date(),
        maids: payload.featuredMaids?.length ? payload.featuredMaids : undefined,
      };
      setMessages((prev) => [...prev, assistantMsg]);
      if (result.conversationId) setConversationId(result.conversationId);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "The AI receptionist is temporarily unavailable. Please try again in a moment or contact us directly.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setConversationId(undefined);
    setShowClearConfirm(false);
  };

  const hasConversation = messages.length > 0;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');

        .air-panel { font-family: 'DM Sans', system-ui, sans-serif; }

        .air-panel-morph-in {
          animation: fabToPanel 0.38s cubic-bezier(0.34, 1.18, 0.64, 1) both;
        }
        @keyframes fabToPanel {
          0%   { opacity: 0; transform: scale(0.06); transform-origin: bottom right; border-radius: 50%; }
          18%  { opacity: 1; border-radius: 44px; }
          60%  { border-radius: 22px; }
          100% { opacity: 1; transform: scale(1); transform-origin: bottom right; border-radius: 16px; }
        }

        .air-panel-morph-out {
          animation: panelToFab 0.3s cubic-bezier(0.4, 0, 0.6, 1) both;
        }
        @keyframes panelToFab {
          0%   { opacity: 1; transform: scale(1); transform-origin: bottom right; border-radius: 16px; }
          50%  { border-radius: 36px; }
          100% { opacity: 0; transform: scale(0.06); transform-origin: bottom right; border-radius: 50%; }
        }

        .air-bubble {
          animation: airBubble 0.24s cubic-bezier(0.34,1.56,0.64,1) both;
        }
        @keyframes airBubble {
          from { opacity: 0; transform: translateY(6px) scale(0.94); }
          to   { opacity: 1; transform: translateY(0)   scale(1);    }
        }

        .air-scroll::-webkit-scrollbar { width: 3px; }
        .air-scroll::-webkit-scrollbar-track { background: transparent; }
        .air-scroll::-webkit-scrollbar-thumb { background: #FCD34D; border-radius: 99px; }

        .air-typing-dot {
          display: inline-block; width: 6px; height: 6px;
          border-radius: 50%; background: #FCD34D;
          animation: airTyping 1.2s ease-in-out infinite;
        }
        .air-typing-dot:nth-child(2) { animation-delay: 0.16s; }
        .air-typing-dot:nth-child(3) { animation-delay: 0.32s; }
        @keyframes airTyping {
          0%,80%,100% { transform: scale(0.65); opacity: 0.4; }
          40%          { transform: scale(1);    opacity: 1;   }
        }

        .air-chip {
          transition: background 0.14s, transform 0.12s, border-color 0.14s;
        }
        .air-chip:hover {
          background: rgba(252,211,77,0.1) !important;
          border-color: rgba(252,211,77,0.4) !important;
          transform: translateY(-1px);
        }
        .air-chip:active { transform: scale(0.97); }

        .air-fab { transition: box-shadow 0.2s, transform 0.18s; }
        .air-fab:hover {
          box-shadow: 0 16px 40px rgba(6,29,38,0.42), 0 4px 12px rgba(6,29,38,0.22) !important;
          transform: translateY(-3px);
        }
        .air-fab:active { transform: scale(0.94); }
        .air-fab:hover .maid-bounce { animation: maidBounce 0.5s ease; }
        @keyframes maidBounce {
          0%,100% { transform: translateY(0) rotate(0deg); }
          30%      { transform: translateY(-4px) rotate(-3deg); }
          65%      { transform: translateY(2px) rotate(2deg); }
        }

        /* ── Idle "alive" avatar animation — gentle breathing bob, always running ── */
        @keyframes avatarBreathe {
          0%, 100% { transform: translateY(0) scale(1); }
          50%      { transform: translateY(-2.5px) scale(1.025); }
        }
        .air-avatar-breathe {
          animation: avatarBreathe 3.4s ease-in-out infinite;
          transform-origin: center;
        }

        /* ── Natural eye blink — each eye on its own slightly-offset cycle ── */
        @keyframes eyeBlink {
          0%, 90%, 100% { transform: scaleY(1); }
          94%            { transform: scaleY(0.08); }
          97%            { transform: scaleY(1); }
        }
        .air-eye {
          transform-box: fill-box;
          transform-origin: center;
          animation: eyeBlink 4.6s ease-in-out infinite;
        }
        .air-eye-right {
          animation-delay: 0.12s;
        }

        @keyframes onlinePulse {
          0%   { box-shadow: 0 0 0 0   rgba(74,222,128,0.80); }
          65%  { box-shadow: 0 0 0 8px rgba(74,222,128,0.00); }
          100% { box-shadow: 0 0 0 0   rgba(74,222,128,0.00); }
        }

        @keyframes fabRingPulse {
          0%, 100% { box-shadow: 0 6px 24px rgba(6,29,38,0.32), 0 2px 8px rgba(6,29,38,0.18), 0 0 0 0   rgba(252,211,77,0.55); }
          50%       { box-shadow: 0 6px 24px rgba(6,29,38,0.32), 0 2px 8px rgba(6,29,38,0.18), 0 0 0 8px rgba(252,211,77,0.00); }
        }
        .air-fab-pulse:not(:hover) {
          animation: fabRingPulse 2.8s ease-in-out infinite;
        }

        /* ── RINZIN background text ── */
        .rinzin-bg {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Syne', sans-serif;
          font-size: 72px;
          font-weight: 800;
          letter-spacing: -3px;
          color: rgba(252,211,77,0.08);
          pointer-events: none;
          user-select: none;
          white-space: nowrap;
          overflow: hidden;
        }

        .air-textarea:focus-visible {
          outline: none;
          ring: none;
          box-shadow: 0 0 0 2px rgba(252,211,77,0.45) !important;
          border-color: #FCD34D !important;
        }

        @keyframes badgePop {
          0%   { transform: scale(0); }
          70%  { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
        .badge-pop { animation: badgePop 0.3s cubic-bezier(0.34,1.56,0.64,1) both; }

        .header-scanlines {
          background-image: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(255,255,255,0.015) 2px,
            rgba(255,255,255,0.015) 4px
          );
        }

        @keyframes waveHand {
          0%, 72%, 100% { transform: rotate(0deg); }
          78%  { transform: rotate(22deg); }
          84%  { transform: rotate(-12deg); }
          90%  { transform: rotate(16deg); }
          96%  { transform: rotate(-6deg); }
        }
        .wave-hand {
          display: inline-block;
          transform-origin: 70% 70%;
          animation: waveHand 3.8s ease-in-out infinite;
        }

        /* ── Waving hand badge on the FAB — greets visitors every few seconds ── */
        .air-wave-badge {
          animation: waveHand 3.8s ease-in-out infinite, waveBadgePop 0.4s cubic-bezier(0.34,1.56,0.64,1) both;
          animation-delay: 0.5s, 0s;
        }
        @keyframes waveBadgePop {
          0%   { transform: scale(0) rotate(0deg); }
          70%  { transform: scale(1.15) rotate(0deg); }
          100% { transform: scale(1) rotate(0deg); }
        }

        @keyframes modalIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes modalCardIn {
          from { opacity: 0; transform: scale(0.88) translateY(12px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
      `}</style>

      <div className="air-panel fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">

        {/* ── Chat panel ── */}
        {(open || isClosing) && (
          <div
            className={`${isClosing ? "air-panel-morph-out" : "air-panel-morph-in"} relative flex flex-col overflow-hidden rounded-2xl bg-white`}
            style={{
              width: "min(390px, calc(100vw - 28px))",
              height: "min(590px, calc(100vh - 100px))",
              boxShadow:
                "0 0 0 1px rgba(252,211,77,0.22), 0 8px 24px rgba(15,23,42,0.08), 0 32px 72px rgba(15,23,42,0.16)",
            }}
          >
            {/* ── Header ── */}
            <div
              className="header-scanlines flex shrink-0 items-center justify-between px-4 py-3"
              style={{
                background: "linear-gradient(135deg, #061D26 0%, #0a3845 45%, #0E4E5E 100%)",
                borderBottom: "1px solid rgba(252,211,77,0.14)",
              }}
            >
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full overflow-hidden"
                    style={{
                      background: "linear-gradient(135deg, #fde68a, #FCD34D)",
                      boxShadow: "0 0 0 2px rgba(252,211,77,0.30), 0 0 0 4px rgba(252,211,77,0.12)",
                    }}
                  >
                    <MaidAvatar size="md" />
                  </div>
                  <span
                    className="absolute -bottom-0.5 -right-0.5 h-[10px] w-[10px] rounded-full"
                    style={{
                      background: "#4ADE80",
                      border: "2px solid #061D26",
                      boxShadow: "0 0 8px rgba(74,222,128,0.70)",
                      animation: "onlinePulse 2.4s ease-out infinite",
                    }}
                  />
                </div>

                <div>
                  <p className="text-[13.5px] font-semibold leading-none tracking-tight text-white">
                    AI Receptionist
                  </p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#4ADE80]" />
                    <p className="text-[10.5px] leading-none font-medium" style={{ color: "rgba(252,211,77,0.65)" }}>
                      Online · replies instantly
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-0.5">
                {hasConversation && (
                  <button
                    onClick={() => setShowClearConfirm((v) => !v)}
                    title="Clear chat"
                    className="flex h-8 w-8 items-center justify-center rounded-xl transition-colors hover:bg-white/10"
                    style={{ color: showClearConfirm ? "#FCA5A5" : "rgba(255,255,255,0.38)" }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  onClick={closePanel}
                  className="flex h-8 w-8 items-center justify-center rounded-xl transition-all hover:bg-white/20"
                  style={{
                    color: "#fff",
                    background: "rgba(255,255,255,0.12)",
                    border: "1px solid rgba(255,255,255,0.18)",
                  }}
                >
                  <X className="h-4 w-4" style={{ strokeWidth: 2.5 }} />
                </button>
              </div>
            </div>

            {!isLoggedIn ? (
              <div
                className="flex flex-1 flex-col overflow-y-auto air-scroll"
                style={{ background: "linear-gradient(180deg, #E8F4F7 0%, #F2FAFC 60%, #F8FDFE 100%)" }}
              >
                {/* Intro */}
                <div className="px-4 pt-4 pb-3">
                  <p className="text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: "#6b7280" }}>
                    Common Questions
                  </p>
                  <p className="text-[12.5px] leading-relaxed" style={{ color: "#334155" }}>
                    Here are some quick answers to help you get started.
                  </p>
                </div>

                {/* FAQ accordion */}
                <div className="flex flex-col gap-2 px-4">
                  {FAQS.map((faq) => {
                    const isOpen = openFaq === faq.id;
                    return (
                      <div
                        key={faq.id}
                        className="overflow-hidden rounded-xl border bg-white"
                        style={{
                          borderColor: isOpen ? "rgba(14,78,94,0.28)" : "rgba(14,78,94,0.13)",
                          boxShadow: isOpen ? "0 4px 16px rgba(14,78,94,0.10)" : "0 1px 4px rgba(0,0,0,0.05)",
                          transition: "border-color 0.18s, box-shadow 0.18s",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => setOpenFaq(isOpen ? null : faq.id)}
                          className="flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left"
                          style={{ background: "transparent", border: "none", cursor: "pointer" }}
                        >
                          <span className="text-[12.5px] font-semibold leading-snug" style={{ color: "#0A2830" }}>
                            {faq.question}
                          </span>
                          <ChevronDown
                            className="h-3.5 w-3.5 shrink-0 transition-transform duration-200"
                            style={{
                              color: "#0E4E5E",
                              transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                            }}
                          />
                        </button>

                        {isOpen && (
                          <div
                            style={{ borderTop: "1px solid rgba(14,78,94,0.09)" }}
                            className="px-3.5 pb-3 pt-2.5"
                          >
                            <p className="text-[12px] leading-relaxed" style={{ color: "#475569" }}>
                              {faq.answer}
                            </p>
                            {faq.link && (
                              <Link
                                to={faq.link.to}
                                onClick={() => setOpen(false)}
                                className="mt-2.5 inline-flex items-center gap-1 text-[11.5px] font-semibold transition-opacity hover:opacity-75"
                                style={{ color: "#0E4E5E" }}
                              >
                                {faq.link.label}
                                <ChevronRight className="h-3 w-3" />
                              </Link>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Login CTA */}
                <div
                  className="mx-4 my-4 rounded-xl p-4"
                  style={{
                    background: "linear-gradient(135deg, #061D26 0%, #0a3845 50%, #0E4E5E 100%)",
                    boxShadow: "0 4px 16px rgba(6,29,38,0.22)",
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-3.5 w-3.5" style={{ color: "#FCD34D" }} />
                    <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "#FCD34D" }}>
                      Get personalised help
                    </p>
                  </div>
                  <p className="text-[12px] leading-relaxed mb-3" style={{ color: "rgba(255,255,255,0.75)" }}>
                    Log in to unlock the full AI receptionist — get maid matches, live answers, and direct agency support.
                  </p>
                  <Link
                    to="/employer-login"
                    className="flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-[13px] font-semibold transition-opacity hover:opacity-90"
                    style={{ background: "rgba(252,211,77,0.15)", border: "1px solid rgba(252,211,77,0.35)", color: "#FCD34D" }}
                    onClick={() => setOpen(false)}
                  >
                    <User className="h-3.5 w-3.5" />
                    Log in to chat with AI
                  </Link>
                </div>
              </div>
            ) : (
              <>
            {/* ── Messages area ── */}
            <div
              ref={scrollContainerRef}
              className="air-scroll flex-1 overflow-y-auto overscroll-contain"
              style={{
                minHeight: 0,
                background: "linear-gradient(180deg, #E8F4F7 0%, #F2FAFC 60%, #F8FDFE 100%)",
              }}
            >
              {!hasConversation ? (
                <div className="flex flex-col gap-3 p-4">
                  {/* ── Greeting hero card — dark ── */}
                  <div
                    className="rounded-2xl p-4 relative overflow-hidden"
                    style={{
                      background: "linear-gradient(135deg, #061D26 0%, #0a3845 45%, #1a6b80 100%)",
                      boxShadow: "0 6px 24px rgba(6,29,38,0.28)",
                    }}
                  >
                    {/* RINZIN watermark text */}
                    <div className="rinzin-bg">RINZIN</div>

                    <div className="mb-3 flex items-center gap-3 relative">
                      <div
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full overflow-hidden"
                        style={{
                          background: "linear-gradient(135deg, #fde68a, #FCD34D)",
                          boxShadow: "0 0 0 2px rgba(252,211,77,0.3)",
                        }}
                      >
                        <MaidAvatar size="md" />
                      </div>
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-widest block" style={{ color: "#FCD34D" }}>
                          Hi there <span className="wave-hand">👋</span>
                        </span>
                        <p className="text-[11px] mt-0.5 font-medium flex items-center gap-1.5" style={{ color: "rgba(252,211,77,0.6)" }}>
                          <span
                            style={{
                              width: 5,
                              height: 5,
                              borderRadius: "50%",
                              background: "#4ADE80",
                              display: "inline-block",
                              animation: "onlinePulse 2.2s ease-out infinite",
                            }}
                          />
                          AI Receptionist · Online now
                        </p>
                      </div>
                      <div
                        className="ml-auto flex h-7 w-7 items-center justify-center rounded-lg shrink-0"
                        style={{ background: "rgba(252,211,77,0.12)", border: "1px solid rgba(252,211,77,0.2)" }}
                      >
                        <Sparkles className="h-3.5 w-3.5" style={{ color: "#FCD34D" }} />
                      </div>
                    </div>

                    <p className="text-[13px] leading-relaxed relative mb-0" style={{ color: "rgba(255,255,255,0.82)" }}>
                      Ask me anything about hiring a helper, our services, or fees. I'll get you the
                      right information fast.
                    </p>
                  </div>

                  {/* Quick prompts */}
                  <div>
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: "#6b7280" }}>
                      Quick questions
                    </p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {PROMPTS.map((prompt, idx) => (
                        <button
                          key={prompt}
                          type="button"
                          onClick={() => {
                            setMessage(prompt);
                            textareaRef.current?.focus();
                          }}
                          className="air-chip flex w-full items-start gap-2 rounded-xl border bg-white px-3 py-2.5 text-left text-[11.5px] font-semibold"
                          style={{
                            borderColor: "rgba(252,211,77,0.30)",
                            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                            color: "#0A2830",
                            animationDelay: `${idx * 60}ms`,
                            lineHeight: "1.35",
                          }}
                        >
                          <span
                            className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold mt-0.5"
                            style={{ background: "#fffbeb", color: "#0E4E5E" }}
                          >
                            →
                          </span>
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-1 p-4">
                  {messages.map((msg, i) => (
                    <div
                      key={i}
                      className={`air-bubble flex flex-col ${
                        msg.role === "user" ? "items-end" : "items-start"
                      }`}
                      style={{ animationDelay: `${Math.min(i * 30, 150)}ms` }}
                    >
                      <div
                        className={`flex items-end gap-2 ${
                          msg.role === "user" ? "flex-row-reverse" : "flex-row"
                        }`}
                        style={{ maxWidth: "78%" }}
                      >
                        {msg.role === "assistant" && (
                          <div
                            className="mb-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full overflow-hidden"
                            style={{
                              background: "linear-gradient(135deg, #fde68a, #FCD34D)",
                              boxShadow: "0 2px 6px rgba(252,211,77,0.30)",
                            }}
                          >
                            <MaidAvatar size="sm" />
                          </div>
                        )}

                        <div
                          className="text-[13px] leading-relaxed"
                          style={{
                            width: "fit-content",
                            minWidth: 0,
                            wordBreak: "break-word",
                            overflowWrap: "anywhere",
                            whiteSpace: "pre-wrap",
                            borderRadius:
                              msg.role === "user"
                                ? "16px 16px 4px 16px"
                                : "16px 16px 16px 4px",
                            padding: "10px 14px",
                            ...(msg.role === "user"
                              ? {
                                  background: "linear-gradient(135deg, #0a3845 0%, #0E4E5E 100%)",
                                  color: "#fff",
                                  boxShadow: "0 3px 12px rgba(6,29,38,0.22)",
                                }
                              : {
                                  background: "#fff",
                                  color: "#0A2830",
                                  border: "1px solid rgba(252,211,77,0.22)",
                                  boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                                }),
                          }}
                        >
                          {splitMaidDescriptions(msg.text, msg.maids)?.general || msg.text}
                        </div>
                      </div>

                      {/* Maid cards */}
                      {msg.role === "assistant" && msg.maids && msg.maids.length > 0 && (
                        <div className="mt-2 flex flex-col gap-2 pl-9" style={{ width: "100%" }}>
                          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#6b7280" }}>
                            Available Helpers
                          </p>
                          {msg.maids.map((maid) => {
                            const interleaved = splitMaidDescriptions(msg.text, msg.maids);
                            return (
                              <div key={maid.referenceCode} className="flex flex-col gap-2">
                                {interleaved?.descriptions.get(maid.referenceCode) && (
                                  <div
                                    className="text-[13px] leading-relaxed whitespace-pre-wrap rounded-xl border px-3 py-2.5"
                                    style={{ background: "#fff", color: "#0A2830", borderColor: "rgba(252,211,77,0.22)" }}
                                  >
                                    {interleaved.descriptions.get(maid.referenceCode)}
                                  </div>
                                )}
                                <AiMaidCard maid={maid} isLoggedIn={isLoggedIn} />
                              </div>
                            );
                          })}
                          {splitMaidDescriptions(msg.text, msg.maids)?.closing && (
                            <p className="text-[12px] leading-relaxed" style={{ color: "#3d5c66" }}>
                              {splitMaidDescriptions(msg.text, msg.maids)?.closing}
                            </p>
                          )}
                          {!isLoggedIn && (
                            <p className="text-[11px]" style={{ color: "#9ca3af", paddingLeft: 2 }}>
                              🔒 Login to view full profiles and contact details
                            </p>
                          )}
                        </div>
                      )}

                      {msg.timestamp && (
                        <p
                          className={`mt-0.5 text-[10px] text-slate-400 ${
                            msg.role === "user" ? "pr-1" : "pl-9"
                          }`}
                        >
                          {formatTime(msg.timestamp)}
                        </p>
                      )}
                    </div>
                  ))}

                  {/* Typing indicator */}
                  {loading && (
                    <div className="air-bubble flex items-end gap-2">
                      <div
                        className="mb-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full overflow-hidden"
                        style={{
                          background: "linear-gradient(135deg, #fde68a, #FCD34D)",
                          boxShadow: "0 2px 6px rgba(252,211,77,0.30)",
                        }}
                      >
                        <MaidAvatar size="sm" />
                      </div>
                      <div
                        className="flex items-center gap-1 px-4 py-3"
                        style={{
                          background: "#fff",
                          border: "1px solid rgba(252,211,77,0.22)",
                          borderRadius: "16px 16px 16px 4px",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                        }}
                      >
                        <span className="air-typing-dot" />
                        <span className="air-typing-dot" />
                        <span className="air-typing-dot" />
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* ── Footer ── */}
            <div
              className="shrink-0"
              style={{ background: "#fff", borderTop: "1px solid rgba(252,211,77,0.15)" }}
            >
              <div className="flex items-end gap-2 px-3 pb-3 pt-2">
                <Textarea
                  ref={textareaRef}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    hasConversation ? "Type a reply…" : "Ask about hiring, services, fees…"
                  }
                  rows={1}
                  className="air-textarea max-h-24 min-h-[40px] flex-1 resize-none rounded-xl border-[#FCD34D]/50 bg-[#E8F4F7] py-2.5 text-[13px] leading-relaxed shadow-none placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-[#FCD34D]/50"
                />
                <Button
                  onClick={() => void submit()}
                  disabled={loading || !message.trim()}
                  className="h-10 w-10 shrink-0 rounded-xl p-0 text-white shadow-none transition-all hover:opacity-90 active:scale-95 disabled:opacity-30"
                  style={{ background: "linear-gradient(135deg, #0a3845, #0E4E5E)" }}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>

              <p className="pb-2.5 text-center text-[10px] text-slate-400">
                Enter to send · Shift+Enter for new line
              </p>
            </div>
              </>
            )}

            {/* ── Clear chat modal overlay ── */}
            {showClearConfirm && (
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{
                  background: "rgba(6,29,38,0.72)",
                  backdropFilter: "blur(6px)",
                  zIndex: 10,
                  animation: "modalIn 0.2s cubic-bezier(0.34,1.3,0.64,1) both",
                }}
                onClick={(e) => { if (e.target === e.currentTarget) setShowClearConfirm(false); }}
              >
                <div
                  style={{
                    background: "#fff",
                    borderRadius: 20,
                    width: 280,
                    overflow: "hidden",
                    boxShadow: "0 24px 64px rgba(0,0,0,0.36), 0 4px 16px rgba(0,0,0,0.18)",
                    animation: "modalCardIn 0.24s cubic-bezier(0.34,1.4,0.64,1) both",
                  }}
                >
                  {/* Top — icon + text */}
                  <div className="flex flex-col items-center px-6 pt-6 pb-5" style={{ textAlign: "center" }}>
                    {/* Trash icon circle */}
                    <div
                      className="flex items-center justify-center rounded-full mb-4"
                      style={{
                        width: 52,
                        height: 52,
                        background: "#FEF2F2",
                        border: "1px solid #FECACA",
                      }}
                    >
                      <Trash2 className="h-5 w-5" style={{ color: "#EF4444" }} />
                    </div>

                    <p className="text-[15px] font-bold leading-tight mb-1.5" style={{ color: "#0f172a" }}>
                      Clear conversation?
                    </p>
                    <p className="text-[12.5px] leading-relaxed" style={{ color: "#64748b" }}>
                      All messages will be permanently deleted. This action cannot be undone.
                    </p>
                  </div>

                  {/* Divider */}
                  <div style={{ height: "1px", background: "#f1f5f9" }} />

                  {/* Buttons */}
                  <div className="flex">
                    <button
                      onClick={() => setShowClearConfirm(false)}
                      className="flex-1 py-3.5 text-[13px] font-semibold transition-colors"
                      style={{
                        color: "#64748b",
                        borderTop: "none",
                        borderBottom: "none",
                        borderLeft: "none",
                        borderRight: "1px solid #f1f5f9",
                        cursor: "pointer",
                        background: "transparent",
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#f8fafc")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={clearChat}
                      className="flex-1 py-3.5 text-[13px] font-bold transition-colors"
                      style={{
                        color: "#EF4444",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#FEF2F2")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── FAB — morphs into panel on open, reappears on close ── */}
        <button
          onClick={() => { setOpen(true); setShowClearConfirm(false); }}
          aria-label="Open AI Receptionist"
          disabled={open || isClosing}
          className={`air-fab relative flex h-16 w-16 items-center justify-center rounded-full border-2 ${!open && !isClosing ? "air-fab-pulse" : ""}`}
          style={{
            background: "linear-gradient(145deg, #061D26 0%, #0a3845 60%, #0E4E5E 100%)",
            borderColor: "rgba(252,211,77,0.45)",
            opacity: open && !isClosing ? 0 : 1,
            transform: open && !isClosing ? "scale(0.3)" : "scale(1)",
            pointerEvents: open && !isClosing ? "none" : "auto",
            transition: isClosing
              ? "opacity 0.18s ease 0.14s, transform 0.18s ease 0.14s"
              : "opacity 0.18s ease, transform 0.18s ease",
          }}
        >
          <span
            className="maid-bounce flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-full overflow-hidden"
            style={{
              background: "linear-gradient(135deg, #fde68a, #FCD34D)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3)",
            }}
          >
            <MaidAvatar size="fab" breathe={false} />
          </span>
          <span
            className="absolute bottom-0.5 right-0.5 h-[14px] w-[14px] rounded-full"
            style={{
              background: "#4ADE80",
              border: "2.5px solid #061D26",
              animation: "onlinePulse 2.2s ease-out infinite",
            }}
          />
          {/* Waving hand badge — periodically waves to invite a click */}
          <span
            aria-hidden="true"
            className="air-wave-badge absolute -top-1.5 -left-1.5 flex h-6 w-6 items-center justify-center rounded-full text-[13px] leading-none select-none"
            style={{
              background: "#fff",
              boxShadow: "0 2px 6px rgba(6,29,38,0.28), 0 0 0 2px rgba(252,211,77,0.55)",
            }}
          >
            👋
          </span>
        </button>
      </div>
    </>
  );
}
