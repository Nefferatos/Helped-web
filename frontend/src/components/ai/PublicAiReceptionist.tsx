import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import {
  Loader2,
  Send,
  Sparkles,
  X,
  ChevronDown,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { callAiAgent } from "@/lib/aiAgents";

type Message = {
  role: "user" | "assistant";
  text: string;
  timestamp?: Date;
};

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

// Animated greeting bubble that pops up from the FAB
function GreetingBubble({ onDismiss }: { onDismiss: () => void }) {
  const [phase, setPhase] = useState<"in" | "visible" | "out">("in");
  const [dotCount, setDotCount] = useState(1);
  const [showText, setShowText] = useState(false);

  const greeting = "Hello! 👋 Need help hiring a helper?";

  useEffect(() => {
    // Typing dots phase
    const dotInterval = setInterval(() => {
      setDotCount((d) => (d % 3) + 1);
    }, 400);

    // Show text after "typing" delay
    const textTimer = setTimeout(() => {
      clearInterval(dotInterval);
      setShowText(true);
    }, 1400);

    // Start fade-out after display time
    const outTimer = setTimeout(() => {
      setPhase("out");
    }, 7000);

    // Remove after fade
    const removeTimer = setTimeout(() => {
      onDismiss();
    }, 7600);

    return () => {
      clearInterval(dotInterval);
      clearTimeout(textTimer);
      clearTimeout(outTimer);
      clearTimeout(removeTimer);
    };
  }, [onDismiss]);

  return (
    <div
      style={{
        position: "relative",
        animation:
          phase === "in"
            ? "greetIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both"
            : phase === "out"
            ? "greetOut 0.5s ease-in both"
            : undefined,
      }}
    >
      {/* Bubble */}
      <div
        style={{
          background: "linear-gradient(135deg, #1a3410 0%, #2c5415 100%)",
          borderRadius: "16px 16px 4px 16px",
          padding: "10px 14px",
          boxShadow:
            "0 8px 28px rgba(25,51,12,0.30), 0 2px 8px rgba(25,51,12,0.18), 0 0 0 1px rgba(192,221,151,0.25)",
          maxWidth: 220,
          minWidth: 130,
          cursor: "pointer",
          userSelect: "none",
          position: "relative",
        }}
        onClick={onDismiss}
        title="Click to dismiss"
      >
        {/* Close micro-button */}
        <button
          onClick={(e) => { e.stopPropagation(); onDismiss(); }}
          style={{
            position: "absolute",
            top: -6,
            right: -6,
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: "#1a3410",
            border: "1.5px solid rgba(192,221,151,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "rgba(255,255,255,0.55)",
            padding: 0,
            lineHeight: 1,
            fontSize: 9,
          }}
        >
          ✕
        </button>

        {!showText ? (
          // Typing indicator
          <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "2px 4px" }}>
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: i < dotCount ? "#C0DD97" : "rgba(192,221,151,0.3)",
                  transition: "background 0.2s",
                }}
              />
            ))}
          </div>
        ) : (
          <p
            style={{
              color: "rgba(255,255,255,0.90)",
              fontSize: 12.5,
              lineHeight: 1.5,
              fontFamily: "'Inter', system-ui, sans-serif",
              fontWeight: 500,
              margin: 0,
              animation: "typeReveal 0.35s ease both",
            }}
          >
            {greeting}
          </p>
        )}
      </div>

      {/* Tail pointing down-right toward FAB */}
      <div
        style={{
          position: "absolute",
          bottom: -6,
          right: 18,
          width: 0,
          height: 0,
          borderLeft: "7px solid transparent",
          borderRight: "0px solid transparent",
          borderTop: "7px solid #2c5415",
          filter: "drop-shadow(0 3px 4px rgba(25,51,12,0.18))",
        }}
      />
    </div>
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
  const [showForm, setShowForm] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showGreeting, setShowGreeting] = useState(false);
  const [greetingDismissed, setGreetingDismissed] = useState(false);

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

    // Show greeting bubble after a short delay on mount
    const greetingTimer = setTimeout(() => {
      setShowGreeting(true);
    }, 1800);

    return () => clearTimeout(greetingTimer);
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
      // Hide greeting when chat opens
      setShowGreeting(false);
      setGreetingDismissed(true);
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
      const assistantMsg: Message = {
        role: "assistant",
        text: result.response || "I'm here to help — could you tell me more?",
        timestamp: new Date(),
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
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');

        .air-panel { font-family: 'DM Sans', system-ui, sans-serif; }

        /* Panel slide-in */
        .air-panel-slide {
          animation: airPanelSlide 0.32s cubic-bezier(0.34, 1.4, 0.64, 1) both;
        }
        @keyframes airPanelSlide {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }

        /* Message bubbles */
        .air-bubble {
          animation: airBubble 0.24s cubic-bezier(0.34,1.56,0.64,1) both;
        }
        @keyframes airBubble {
          from { opacity: 0; transform: translateY(6px) scale(0.94); }
          to   { opacity: 1; transform: translateY(0)   scale(1);    }
        }

        /* Scrollbar */
        .air-scroll::-webkit-scrollbar { width: 3px; }
        .air-scroll::-webkit-scrollbar-track { background: transparent; }
        .air-scroll::-webkit-scrollbar-thumb { background: #C0DD97; border-radius: 99px; }

        /* Typing dots */
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

        /* Quick-prompt chips */
        .air-chip { transition: background 0.14s, transform 0.12s, box-shadow 0.14s; }
        .air-chip:hover {
          background: #EAF3DE !important;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(99,153,34,0.18) !important;
        }
        .air-chip:active { transform: scale(0.97); }

        /* FAB */
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

        /* Pulsing online dot */
        @keyframes onlinePulse {
          0%   { box-shadow: 0 0 0 0   rgba(74,222,128,0.80); }
          65%  { box-shadow: 0 0 0 8px rgba(74,222,128,0.00); }
          100% { box-shadow: 0 0 0 0   rgba(74,222,128,0.00); }
        }

        /* FAB ring pulse (idle) */
        @keyframes fabRingPulse {
          0%, 100% { box-shadow: 0 6px 24px rgba(25,51,12,0.32), 0 2px 8px rgba(25,51,12,0.18), 0 0 0 0   rgba(192,221,151,0.55); }
          50%       { box-shadow: 0 6px 24px rgba(25,51,12,0.32), 0 2px 8px rgba(25,51,12,0.18), 0 0 0 8px rgba(192,221,151,0.00); }
        }
        .air-fab-pulse:not(:hover) {
          animation: fabRingPulse 2.8s ease-in-out infinite;
        }

        /* Greeting bubble */
        @keyframes greetIn {
          from { opacity: 0; transform: translateY(10px) scale(0.88); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
        @keyframes greetOut {
          from { opacity: 1; transform: translateY(0)    scale(1);    }
          to   { opacity: 0; transform: translateY(8px)  scale(0.92); }
        }
        @keyframes typeReveal {
          from { opacity: 0; transform: translateY(3px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* Wave hand emoji wobble */
        @keyframes waveHand {
          0%,100% { transform: rotate(0deg); }
          20%      { transform: rotate(20deg); }
          40%      { transform: rotate(-10deg); }
          60%      { transform: rotate(14deg); }
          80%      { transform: rotate(-6deg); }
        }
        .wave-hand { display: inline-block; animation: waveHand 1.5s ease 1.8s 2 both; }

        /* Shimmer on header gradient */
        @keyframes headerShimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }

        /* Input focus glow */
        .air-textarea:focus-visible {
          outline: none;
          ring: none;
          box-shadow: 0 0 0 2px rgba(151,196,89,0.45) !important;
          border-color: #97C459 !important;
        }

        /* Unread badge bounce */
        @keyframes badgePop {
          0%   { transform: scale(0); }
          70%  { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
        .badge-pop { animation: badgePop 0.3s cubic-bezier(0.34,1.56,0.64,1) both; }

        /* Scanline texture overlay on header */
        .header-scanlines {
          background-image: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(255,255,255,0.015) 2px,
            rgba(255,255,255,0.015) 4px
          );
        }
      `}</style>

      <div className="air-panel fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">

        {/* ── Chat panel ── */}
        {open && (
          <div
            className="air-panel-slide flex flex-col overflow-hidden rounded-2xl bg-white"
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
                background: "linear-gradient(135deg, #0f2008 0%, #1a3410 45%, #2c5415 100%)",
                borderBottom: "1px solid rgba(151,196,89,0.14)",
              }}
            >
              <div className="flex items-center gap-3">
                {/* Avatar with shimmer ring */}
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
                  {/* Online dot */}
                  <span
                    className="absolute -bottom-0.5 -right-0.5 h-[10px] w-[10px] rounded-full"
                    style={{
                      background: "#4ADE80",
                      border: "2px solid #0f2008",
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
              <div
                className="shrink-0 flex items-center justify-between gap-2 px-4 py-2"
                style={{ background: "#FEF3C7", borderBottom: "1px solid #FDE68A" }}
              >
                <p className="text-[12px] font-medium text-amber-800">
                  Clear entire conversation?
                </p>
                <div className="flex gap-1.5">
                  <button
                    onClick={clearChat}
                    className="rounded-lg bg-red-500 px-3 py-1 text-[11px] font-bold text-white hover:bg-red-600 transition-colors"
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    className="rounded-lg border border-amber-300 bg-white px-3 py-1 text-[11px] font-semibold text-amber-800 hover:bg-amber-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
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
                  {/* Greeting hero card */}
                  <div
                    className="rounded-2xl p-4 relative overflow-hidden"
                    style={{
                      background: "linear-gradient(135deg, #0f2008 0%, #1a3410 55%, #2d5916 100%)",
                      boxShadow: "0 6px 24px rgba(25,51,12,0.28)",
                    }}
                  >
                    {/* Decorative circles */}
                    <div
                      style={{
                        position: "absolute",
                        top: -20,
                        right: -20,
                        width: 80,
                        height: 80,
                        borderRadius: "50%",
                        background: "rgba(192,221,151,0.07)",
                        pointerEvents: "none",
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        bottom: -10,
                        right: 40,
                        width: 50,
                        height: 50,
                        borderRadius: "50%",
                        background: "rgba(192,221,151,0.05)",
                        pointerEvents: "none",
                      }}
                    />

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
                        <span className="text-[11px] font-bold uppercase tracking-widest text-[#C0DD97] block">
                          Hi there <span className="wave-hand">👋</span>
                        </span>
                        <p className="text-[11px] mt-0.5 font-medium" style={{ color: "rgba(192,221,151,0.55)" }}>
                          AI Receptionist · Online now
                        </p>
                      </div>
                      <div
                        className="ml-auto flex h-7 w-7 items-center justify-center rounded-lg shrink-0"
                        style={{ background: "rgba(192,221,151,0.14)", border: "1px solid rgba(192,221,151,0.2)" }}
                      >
                        <Sparkles className="h-3.5 w-3.5 text-[#C0DD97]" />
                      </div>
                    </div>
                    <p className="text-[13px] leading-relaxed relative" style={{ color: "rgba(255,255,255,0.80)" }}>
                      Ask me anything about hiring a helper, our services, or fees. I'll get you the
                      right information fast.
                    </p>
                  </div>

                  {/* Quick prompts */}
                  <div>
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
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
                          className="air-chip flex w-full items-center gap-2.5 rounded-xl border border-[#C0DD97]/30 bg-white px-3.5 py-2.5 text-left text-[13px] font-medium text-[#2c5415]"
                          style={{
                            boxShadow: "0 1px 4px rgba(0,0,0,0.045)",
                            animationDelay: `${idx * 60}ms`,
                          }}
                        >
                          <span
                            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                            style={{ background: "#EAF3DE", color: "#3B6D11" }}
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
                        style={{ maxWidth: "100%" }}
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
                            maxWidth: "78%",
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
                                  background: "linear-gradient(135deg, #1a3410 0%, #2c5415 100%)",
                                  color: "#fff",
                                  boxShadow: "0 3px 12px rgba(25,51,12,0.22)",
                                }
                              : {
                                  background: "#fff",
                                  color: "#1E293B",
                                  border: "1px solid rgba(151,196,89,0.22)",
                                  boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                                }),
                          }}
                        >
                          {msg.text}
                        </div>
                      </div>

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
                  style={{ background: "linear-gradient(135deg, #1a3410, #2c5415)" }}
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
          </div>
        )}

        {/* ── Greeting bubble (shown when chat is closed) ── */}
        {showGreeting && !open && !greetingDismissed && (
          <GreetingBubble
            onDismiss={() => {
              setShowGreeting(false);
              setGreetingDismissed(true);
            }}
          />
        )}

        {/* ── FAB ── */}
        <button
          onClick={() => {
            setOpen((v) => !v);
            setShowClearConfirm(false);
            setShowGreeting(false);
            setGreetingDismissed(true);
          }}
          aria-label={open ? "Close chat" : "Open AI Receptionist"}
          className="air-fab air-fab-pulse relative flex h-16 w-16 items-center justify-center rounded-full border-2"
          style={{
            background: "linear-gradient(145deg, #1a3410 0%, #2c5415 60%, #3a6b1a 100%)",
            borderColor: "rgba(192,221,151,0.45)",
          }}
        >
          {/* Inner avatar circle */}
          <span
            className="maid-bounce flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-full overflow-hidden"
            style={{
              background: "linear-gradient(135deg, #C0DD97, #97C459)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3)",
            }}
          >
            {open ? (
              <X className="h-5 w-5 text-[#1a3410]" style={{ strokeWidth: 2.5 }} />
            ) : (
              <MaidAvatar size="fab" />
            )}
          </span>

          {/* Pulsing online dot — hidden when panel open */}
          {!open && (
            <span
              className="absolute bottom-0.5 right-0.5 h-[14px] w-[14px] rounded-full"
              style={{
                background: "#4ADE80",
                border: "2.5px solid #1a3410",
                animation: "onlinePulse 2.2s ease-out infinite",
              }}
            />
          )}

          {/* Unread badge — show if there are messages and panel is closed */}
          {!open && hasConversation && (
            <span
              className="badge-pop absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
              style={{ background: "#EF4444", border: "2px solid white" }}
            >
              {messages.filter((m) => m.role === "assistant").length > 9
                ? "9+"
                : messages.filter((m) => m.role === "assistant").length}
            </span>
          )}
        </button>
      </div>
    </>
  );
}