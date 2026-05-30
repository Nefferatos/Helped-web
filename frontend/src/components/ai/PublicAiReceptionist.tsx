import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Bot, Loader2, MessageCircle, Send, Sparkles, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { callAiAgent } from "@/lib/aiAgents";

type Message = {
  role: "user" | "assistant";
  text: string;
};

const PROMPTS = [
  "I want to hire a helper",
  "Ask about transfer helpers",
  "What are your agency fees?",
];

const normalizePath = (path: string) => path.replace(/\/+$/, "") || "/";

const matchesRoute = (path: string, route: string) => {
  const normalizedPath = normalizePath(path);
  return normalizedPath === route || normalizedPath.startsWith(`${route}/`);
};

export default function PublicAiReceptionist() {
  const location = useLocation();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Hide inside agency login/admin areas.
  if (!mounted) return null;
  const path = location.pathname;
  if (matchesRoute(path, "/agency") || matchesRoute(path, "/agencyadmin")) return null;

  const submit = async () => {
    const text = message.trim();
    if (!text) return;

    const userMsg: Message = { role: "user", text };
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
      };
      setMessages((prev) => [...prev, assistantMsg]);
      if (result.conversationId) setConversationId(result.conversationId);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: error instanceof Error ? error.message : "The receptionist is unavailable right now. Please try again shortly.",
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

  const hasConversation = messages.length > 0;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {/* Chat panel */}
      {open && (
        <div
          className="flex flex-col overflow-hidden rounded-2xl border border-[#97C459]/30 bg-white shadow-[0_24px_64px_rgba(15,23,42,0.18),0_4px_16px_rgba(15,23,42,0.08)]"
          style={{ width: "min(380px, calc(100vw - 40px))", maxHeight: "calc(100vh - 100px)" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-3 bg-[#19330C] px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#C0DD97]">
                <Bot className="h-4.5 w-4.5 text-[#19330C]" />
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#19330C] bg-[#97C459]" />
              </div>
              <div>
                <p className="text-[13px] font-bold leading-none text-white">AI Receptionist</p>
                <p className="mt-0.5 text-[11px] leading-none text-white/55">Always here to help</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setMinimized((v) => !v)}
                className="flex h-7 w-7 items-center justify-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white"
                aria-label={minimized ? "Expand chat" : "Minimise chat"}
              >
                <ChevronDown className={`h-4 w-4 transition-transform ${minimized ? "rotate-180" : ""}`} />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white"
                aria-label="Close chat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {!minimized && (
            <>
              {/* Messages / welcome area */}
              <div className="flex-1 overflow-y-auto bg-[#F8FBF3]">
                {!hasConversation ? (
                  /* Welcome state */
                  <div className="p-4 space-y-3">
                    <div className="rounded-xl border border-[#97C459]/25 bg-white p-3.5 shadow-sm">
                      <div className="mb-2 flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-[#639922]" />
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#3B6D11]">How can I help?</span>
                      </div>
                      <p className="text-[13px] leading-relaxed text-slate-600">
                        Ask me anything about hiring a helper, our services, or fees. I'll get you the right information fast.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {PROMPTS.map((prompt) => (
                        <button
                          key={prompt}
                          type="button"
                          onClick={() => setMessage(prompt)}
                          className="rounded-full border border-[#97C459]/40 bg-white px-3 py-1.5 text-[12px] font-semibold text-[#3B6D11] shadow-sm transition hover:bg-[#EAF3DE] active:scale-95"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* Conversation thread */
                  <div className="flex flex-col gap-2.5 p-4">
                    {messages.map((msg, i) => (
                      <div
                        key={i}
                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        {msg.role === "assistant" && (
                          <div className="mr-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#C0DD97] self-end mb-0.5">
                            <Bot className="h-3.5 w-3.5 text-[#19330C]" />
                          </div>
                        )}
                        <div
                          className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed shadow-sm ${
                            msg.role === "user"
                              ? "rounded-br-sm bg-[#19330C] text-white"
                              : "rounded-bl-sm border border-[#97C459]/20 bg-white text-slate-700"
                          }`}
                        >
                          {msg.text}
                        </div>
                      </div>
                    ))}
                    {loading && (
                      <div className="flex justify-start">
                        <div className="mr-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#C0DD97] self-end mb-0.5">
                          <Bot className="h-3.5 w-3.5 text-[#19330C]" />
                        </div>
                        <div className="rounded-2xl rounded-bl-sm border border-[#97C459]/20 bg-white px-4 py-3 shadow-sm">
                          <div className="flex items-center gap-1">
                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#97C459]" style={{ animationDelay: "0ms" }} />
                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#97C459]" style={{ animationDelay: "120ms" }} />
                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#97C459]" style={{ animationDelay: "240ms" }} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Contact fields toggle (optional) */}
              <div className="border-t border-[#E5EDDB] bg-white">
                {!hasConversation && (
                  <button
                    type="button"
                    onClick={() => setShowForm((v) => !v)}
                    className="flex w-full items-center justify-between px-4 py-2 text-[11px] font-semibold text-[#639922] transition hover:bg-[#F8FBF3]"
                  >
                    <span>{showForm ? "Hide contact details" : "Add your name & contact (optional)"}</span>
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showForm ? "rotate-180" : ""}`} />
                  </button>
                )}

                {showForm && !hasConversation && (
                  <div className="grid grid-cols-2 gap-2 px-4 pb-3">
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      className="h-9 rounded-lg border-[#C0DD97]/60 bg-[#F8FBF3] text-[13px]"
                    />
                    <Input
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                      placeholder="Email or phone"
                      className="h-9 rounded-lg border-[#C0DD97]/60 bg-[#F8FBF3] text-[13px]"
                    />
                  </div>
                )}

                {/* Input row */}
                <div className="flex items-end gap-2 px-3 pb-3 pt-2">
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={hasConversation ? "Reply…" : "Ask about hiring, services, fees…"}
                    className="max-h-28 min-h-[40px] flex-1 resize-none rounded-xl border-[#C0DD97]/60 bg-[#F8FBF3] py-2 text-[13px] leading-relaxed shadow-none focus-visible:ring-[#639922]/30"
                    rows={1}
                  />
                  <Button
                    onClick={() => void submit()}
                    disabled={loading || !message.trim()}
                    className="h-10 w-10 shrink-0 rounded-xl bg-[#19330C] p-0 text-white shadow-none hover:bg-[#27500A] disabled:opacity-40"
                    aria-label="Send message"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="pb-2 text-center text-[10px] text-slate-400">Press Enter to send · Shift+Enter for new line</p>
              </div>
            </>
          )}
        </div>
      )}

      {/* FAB button */}
      <button
        onClick={() => { setOpen((v) => !v); setMinimized(false); }}
        className={`group flex items-center gap-2.5 rounded-full border border-[#C0DD97]/50 bg-[#19330C] px-5 py-3 text-white shadow-[0_8px_28px_rgba(25,51,12,0.30)] transition-all hover:bg-[#27500A] active:scale-95 ${open ? "pr-4" : ""}`}
        aria-label="Open AI chat"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#C0DD97] text-[#19330C] transition group-hover:bg-[#EAF3DE]">
          <MessageCircle className="h-3.5 w-3.5" />
        </span>
        <span className="text-[13px] font-bold">AI Help</span>
        {!open && messages.length === 0 && (
          <span className="ml-0.5 rounded-full bg-[#97C459] px-2 py-0.5 text-[10px] font-bold text-[#19330C]">
            Online
          </span>
        )}
        {open && <X className="h-3.5 w-3.5 text-white/60" />}
      </button>
    </div>
  );
}
