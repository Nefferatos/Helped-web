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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
        borderColor: "rgba(22,101,58,0.18)",
        boxShadow: "0 2px 10px rgba(0,0,0,0.07)",
        width: "100%",
        maxWidth: 300,
      }}
    >
      <div className="flex items-start gap-3 p-3">
        {/* Photo */}
        <div
          className="relative flex-shrink-0 overflow-hidden rounded-lg"
          style={{ width: 64, height: 80, background: "#f0f7f3" }}
        >
          {photo ? (
            <img
              src={photo}
              alt={maid.fullName}
              style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center", display: "block" }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <User className="h-7 w-7" style={{ color: "#a3c8b2" }} />
            </div>
          )}
          {!isLoggedIn && (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ backdropFilter: "blur(6px)", background: "rgba(255,255,255,0.45)" }}
            >
              <Lock className="h-4 w-4" style={{ color: "#16653A" }} />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-bold leading-tight" style={{ color: "#0C1E12" }}>
            {maid.fullName}
          </p>
          <p className="mt-0.5 text-[11px]" style={{ color: "#3C6652" }}>
            {maid.referenceCode}
          </p>

          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {maid.nationality && (
              <span className="flex items-center gap-1 text-[11px]" style={{ color: "#3C6652" }}>
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
                style={{ background: "#EAF7EF", color: "#16653A" }}
              >
                {maid.type}
              </span>
            )}
          </div>

          {maid.status && (
            <p className="mt-1 text-[10px] font-medium" style={{ color: maid.status.toLowerCase().includes("available") ? "#16653A" : "#6b7280" }}>
              ● {maid.status}
            </p>
          )}
        </div>
      </div>

      {isLoggedIn ? (
        <Link
          to={profileUrl}
          className="flex w-full items-center justify-center gap-1.5 py-2 text-[12px] font-semibold transition-colors"
          style={{ borderTop: "1px solid rgba(22,101,58,0.12)", background: "#f0f7f3", color: "#16653A" }}
        >
          View Full Profile →
        </Link>
      ) : (
        <Link
          to={loginUrl}
          className="flex w-full items-center justify-center gap-1.5 py-2 text-[12px] font-semibold transition-colors"
          style={{ borderTop: "1px solid rgba(22,101,58,0.12)", background: "#f0f7f3", color: "#16653A" }}
        >
          <Lock className="h-3 w-3" /> Login to view profile
        </Link>
      )}
    </div>
  );
}

const PROMPTS = [
  "I want to hire a helper",
  "Ask about transfer helpers",
  "What are your agency fees?",
];

const STORAGE_KEY = "ai_receptionist_messages";
const CONV_ID_KEY = "ai_receptionist_conv_id";

const normalizePath = (path: string) => path.replace(/\/+$/, "") || "/";

const matchesRoute = (path: string, route: string) => {
  const normalizedPath = normalizePath(path);
  return normalizedPath === route || normalizedPath.startsWith(`${route}/`);
};

const formatTime = (date?: Date) => {
  if (!date) return "";
  return new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit" }).format(date);
};

function MaidAvatar({ size = "md" }: { size?: "sm" | "md" | "fab" }) {
  const px = size === "sm" ? 24 : size === "fab" ? 46 : 36;
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", flexShrink: 0 }}
    >
      <circle cx="50" cy="50" r="50" fill="#C0DD97" />
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
      <ellipse cx="41" cy="41" rx="7" ry="6" fill="#ffffff" />
      <circle cx="41" cy="41" r="4.5" fill="#0ea5e9" />
      <circle cx="41" cy="41" r="2.2" fill="#0369a1" />
      <circle cx="41" cy="41" r="1.1" fill="#7dd3fc" />
      <circle cx="38.5" cy="38.8" r="1.4" fill="#ffffff" opacity="0.9" />
      <ellipse cx="59" cy="41" rx="7" ry="6" fill="#ffffff" />
      <circle cx="59" cy="41" r="4.5" fill="#0ea5e9" />
      <circle cx="59" cy="41" r="2.2" fill="#0369a1" />
      <circle cx="59" cy="41" r="1.1" fill="#7dd3fc" />
      <circle cx="56.5" cy="38.8" r="1.4" fill="#ffffff" opacity="0.9" />
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

export default function PublicAiReceptionist() {
  const location = useLocation();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const isLoggedIn = Boolean(getClientToken());
  const [showForm, setShowForm] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Array<{
          role: "user" | "assistant";
          text: string;
          timestamp?: string;
        }>;
        setMessages(
          parsed.map((m) => ({
            ...m,
            timestamp: m.timestamp ? new Date(m.timestamp) : undefined,
          }))
        );
      }
      const savedConvId = localStorage.getItem(CONV_ID_KEY);
      if (savedConvId) setConversationId(savedConvId);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // ignore
    }
  }, [messages, mounted]);

  useEffect(() => {
    if (!mounted || !conversationId) return;
    try {
      localStorage.setItem(CONV_ID_KEY, conversationId);
    } catch {
      // ignore
    }
  }, [conversationId, mounted]);

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
        name,
        contact,
        conversationId,
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
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text:
            error instanceof Error
              ? error.message
              : "The receptionist is unavailable right now. Please try again shortly.",
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
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(CONV_ID_KEY);
    } catch {
      // ignore
    }
  };

  const hasConversation = messages.length > 0;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');

        .air-panel { font-family: 'DM Sans', system-ui, sans-serif; }

        .air-panel-slide {
          animation: airPanelSlide 0.32s cubic-bezier(0.34, 1.4, 0.64, 1) both;
        }
        @keyframes airPanelSlide {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
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
        .air-scroll::-webkit-scrollbar-thumb { background: #C0DD97; border-radius: 99px; }

        .air-typing-dot {
          display: inline-block; width: 6px; height: 6px;
          border-radius: 50%; background: #97C459;
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
          background: rgba(192,221,151,0.1) !important;
          border-color: rgba(192,221,151,0.4) !important;
          transform: translateY(-1px);
        }
        .air-chip:active { transform: scale(0.97); }

        .air-fab { transition: box-shadow 0.2s, transform 0.18s; }
        .air-fab:hover {
          box-shadow: 0 16px 40px rgba(25,51,12,0.42), 0 4px 12px rgba(25,51,12,0.22) !important;
          transform: translateY(-3px);
        }
        .air-fab:active { transform: scale(0.94); }
        .air-fab:hover .maid-bounce { animation: maidBounce 0.5s ease; }
        @keyframes maidBounce {
          0%,100% { transform: translateY(0) rotate(0deg); }
          30%      { transform: translateY(-4px) rotate(-3deg); }
          65%      { transform: translateY(2px) rotate(2deg); }
        }

        @keyframes onlinePulse {
          0%   { box-shadow: 0 0 0 0   rgba(74,222,128,0.80); }
          65%  { box-shadow: 0 0 0 8px rgba(74,222,128,0.00); }
          100% { box-shadow: 0 0 0 0   rgba(74,222,128,0.00); }
        }

        @keyframes fabRingPulse {
          0%, 100% { box-shadow: 0 6px 24px rgba(25,51,12,0.32), 0 2px 8px rgba(25,51,12,0.18), 0 0 0 0   rgba(192,221,151,0.55); }
          50%       { box-shadow: 0 6px 24px rgba(25,51,12,0.32), 0 2px 8px rgba(25,51,12,0.18), 0 0 0 8px rgba(192,221,151,0.00); }
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
          color: rgba(192,221,151,0.08);
          pointer-events: none;
          user-select: none;
          white-space: nowrap;
          overflow: hidden;
        }

        .air-textarea:focus-visible {
          outline: none;
          ring: none;
          box-shadow: 0 0 0 2px rgba(151,196,89,0.45) !important;
          border-color: #97C459 !important;
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
          0%,100% { transform: rotate(0deg); }
          20%      { transform: rotate(20deg); }
          40%      { transform: rotate(-10deg); }
          60%      { transform: rotate(14deg); }
          80%      { transform: rotate(-6deg); }
        }
        .wave-hand { display: inline-block; animation: waveHand 1.5s ease 0.4s 2 both; }

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
        {open && (
          <div
            className="air-panel-slide relative flex flex-col overflow-hidden rounded-2xl bg-white"
            style={{
              width: "min(390px, calc(100vw - 28px))",
              height: "min(590px, calc(100vh - 100px))",
              boxShadow:
                "0 0 0 1px rgba(151,196,89,0.22), 0 8px 24px rgba(15,23,42,0.08), 0 32px 72px rgba(15,23,42,0.16)",
            }}
          >
            {/* ── Header ── */}
            <div
              className="header-scanlines flex shrink-0 items-center justify-between px-4 py-3"
              style={{
                background: "linear-gradient(135deg, #0a1607 0%, #162b0d 45%, #1e3d10 100%)",
                borderBottom: "1px solid rgba(151,196,89,0.14)",
              }}
            >
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full overflow-hidden"
                    style={{
                      background: "linear-gradient(135deg, #cde8a3, #97C459)",
                      boxShadow: "0 0 0 2px rgba(192,221,151,0.30), 0 0 0 4px rgba(192,221,151,0.12)",
                    }}
                  >
                    <MaidAvatar size="md" />
                  </div>
                  <span
                    className="absolute -bottom-0.5 -right-0.5 h-[10px] w-[10px] rounded-full"
                    style={{
                      background: "#4ADE80",
                      border: "2px solid #0a1607",
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
                    <p className="text-[10.5px] leading-none font-medium" style={{ color: "rgba(192,221,151,0.65)" }}>
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
                  onClick={() => {
                    setOpen(false);
                    setShowClearConfirm(false);
                    setMessage("");
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-xl transition-colors hover:bg-white/10"
                  style={{ color: "rgba(255,255,255,0.38)" }}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Clear confirm strip */}
            {showClearConfirm && (
              <></>
            )}

            {/* ── Messages area ── */}
            <div
              ref={scrollContainerRef}
              className="air-scroll flex-1 overflow-y-auto overscroll-contain"
              style={{
                minHeight: 0,
                background: "linear-gradient(180deg, #EEF6E4 0%, #F5FAF0 60%, #F8FCF4 100%)",
              }}
            >
              {!hasConversation ? (
                <div className="flex flex-col gap-3 p-4">
                  {/* ── Greeting hero card — dark ── */}
                  <div
                    className="rounded-2xl p-4 relative overflow-hidden"
                    style={{
                      background: "linear-gradient(135deg, #0f2008 0%, #1a3410 45%, #2c5415 100%)",
                      boxShadow: "0 6px 24px rgba(25,51,12,0.28)",
                    }}
                  >
                    {/* RINZIN watermark text */}
                    <div className="rinzin-bg">RINZIN</div>

                    <div className="mb-3 flex items-center gap-3 relative">
                      <div
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full overflow-hidden"
                        style={{
                          background: "linear-gradient(135deg, #cde8a3, #97C459)",
                          boxShadow: "0 0 0 2px rgba(192,221,151,0.3)",
                        }}
                      >
                        <MaidAvatar size="md" />
                      </div>
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-widest block" style={{ color: "#C0DD97" }}>
                          Hi there <span className="wave-hand">👋</span>
                        </span>
                        <p className="text-[11px] mt-0.5 font-medium flex items-center gap-1.5" style={{ color: "rgba(192,221,151,0.6)" }}>
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
                        style={{ background: "rgba(192,221,151,0.12)", border: "1px solid rgba(192,221,151,0.2)" }}
                      >
                        <Sparkles className="h-3.5 w-3.5" style={{ color: "#C0DD97" }} />
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
                    <div className="flex flex-col gap-1.5">
                      {PROMPTS.map((prompt, idx) => (
                        <button
                          key={prompt}
                          type="button"
                          onClick={() => {
                            setMessage(prompt);
                            textareaRef.current?.focus();
                          }}
                          className="air-chip flex w-full items-center gap-2.5 rounded-xl border bg-white px-3.5 py-2.5 text-left text-[13px] font-semibold"
                          style={{
                            borderColor: "rgba(192,221,151,0.30)",
                            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                            color: "#0f2008",
                            animationDelay: `${idx * 60}ms`,
                          }}
                        >
                          <span
                            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                            style={{ background: "#EAF3DE", color: "#1a3410" }}
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
                              background: "linear-gradient(135deg, #C0DD97, #97C459)",
                              boxShadow: "0 2px 6px rgba(151,196,89,0.30)",
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
                                  background: "linear-gradient(135deg, #162b0d 0%, #1e3d10 100%)",
                                  color: "#fff",
                                  boxShadow: "0 3px 12px rgba(25,51,12,0.22)",
                                }
                              : {
                                  background: "#fff",
                                  color: "#0f2008",
                                  border: "1px solid rgba(151,196,89,0.22)",
                                  boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                                }),
                          }}
                        >
                          {msg.text}
                        </div>
                      </div>

                      {/* Maid cards */}
                      {msg.role === "assistant" && msg.maids && msg.maids.length > 0 && (
                        <div className="mt-2 flex flex-col gap-2 pl-9" style={{ width: "100%" }}>
                          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#6b7280" }}>
                            Available Helpers
                          </p>
                          {msg.maids.map((maid) => (
                            <AiMaidCard key={maid.referenceCode} maid={maid} isLoggedIn={isLoggedIn} />
                          ))}
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
                          background: "linear-gradient(135deg, #C0DD97, #97C459)",
                          boxShadow: "0 2px 6px rgba(151,196,89,0.30)",
                        }}
                      >
                        <MaidAvatar size="sm" />
                      </div>
                      <div
                        className="flex items-center gap-1 px-4 py-3"
                        style={{
                          background: "#fff",
                          border: "1px solid rgba(151,196,89,0.22)",
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
              style={{ background: "#fff", borderTop: "1px solid rgba(151,196,89,0.15)" }}
            >
              {!hasConversation && (
                <button
                  type="button"
                  onClick={() => setShowForm((v) => !v)}
                  className="flex w-full items-center justify-between px-4 py-2 text-[11px] font-semibold text-[#639922] transition-colors hover:bg-[#F4F9EE]"
                >
                  <span>
                    {showForm ? "Hide contact details" : "Add your name & contact (optional)"}
                  </span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform duration-200 ${
                      showForm ? "rotate-180" : ""
                    }`}
                  />
                </button>
              )}

              {showForm && !hasConversation && (
                <div className="grid grid-cols-2 gap-2 px-4 pb-2">
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="h-8 rounded-lg border-[#C0DD97]/50 bg-[#F4F9EE] text-[12px]"
                  />
                  <Input
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="Email or phone"
                    className="h-8 rounded-lg border-[#C0DD97]/50 bg-[#F4F9EE] text-[12px]"
                  />
                </div>
              )}

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
                  className="air-textarea max-h-24 min-h-[40px] flex-1 resize-none rounded-xl border-[#C0DD97]/50 bg-[#F4F9EE] py-2.5 text-[13px] leading-relaxed shadow-none placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-[#97C459]/50"
                />
                <Button
                  onClick={() => void submit()}
                  disabled={loading || !message.trim()}
                  className="h-10 w-10 shrink-0 rounded-xl p-0 text-white shadow-none transition-all hover:opacity-90 active:scale-95 disabled:opacity-30"
                  style={{ background: "linear-gradient(135deg, #162b0d, #1e3d10)" }}
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

            {/* ── Clear chat modal overlay ── */}
            {showClearConfirm && (
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{
                  background: "rgba(10,22,7,0.72)",
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

        {/* ── FAB ── */}
        <button
          onClick={() => {
            setOpen((v) => !v);
            setShowClearConfirm(false);
          }}
          aria-label={open ? "Close chat" : "Open AI Receptionist"}
          className="air-fab air-fab-pulse relative flex h-16 w-16 items-center justify-center rounded-full border-2"
          style={{
            background: "linear-gradient(145deg, #0a1607 0%, #162b0d 60%, #1e3d10 100%)",
            borderColor: "rgba(192,221,151,0.45)",
          }}
        >
          <span
            className="maid-bounce flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-full overflow-hidden"
            style={{
              background: "linear-gradient(135deg, #C0DD97, #97C459)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3)",
            }}
          >
            {open ? (
              <X className="h-5 w-5 text-[#0a1607]" style={{ strokeWidth: 2.5 }} />
            ) : (
              <MaidAvatar size="fab" />
            )}
          </span>

          {!open && (
            <span
              className="absolute bottom-0.5 right-0.5 h-[14px] w-[14px] rounded-full"
              style={{
                background: "#4ADE80",
                border: "2.5px solid #0a1607",
                animation: "onlinePulse 2.2s ease-out infinite",
              }}
            />
          )}
        </button>
      </div>
    </>
  );
}