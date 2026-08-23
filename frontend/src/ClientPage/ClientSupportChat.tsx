import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ChevronDown,
  ChevronLeft,
  CheckCircle,
  HelpCircle,
  MessageCircle,
  Search,
  Send,
  Sparkles,
  Tag,
  X,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "@/components/ui/sonner";
import { getStoredClient } from "@/lib/clientAuth";
import type {
  AgencyChatbotConfig,
  AgencyChatbotTopicOption,
  ChatMessage,
  ClientConversation,
  ConversationType,
} from "@/lib/chat";
import { streamSse } from "@/lib/sse";
import {
  clientFetch,
  hasActiveClientSession,
  primeClientAuth,
  syncClientProfileFromSession,
} from "@/lib/supabaseAuth";
import { getBotReply } from "@/hooks/useChatbot";
import "./ClientTheme.css";

type TopicOption = AgencyChatbotTopicOption;
const GUIDE_STORAGE_PREFIX = "sc_guide_seen";
const seenGuideKeys = new Set<string>();

const defaultConversation: ClientConversation = {
  key: "support:0",
  clientId: 0,
  conversationType: "support",
  title: "Agency Support",
  description: "General help, follow-up, and request support",
  lastMessage: "",
  lastMessageAt: "",
  unreadCount: 0,
};

const DEFAULT_TOPICS: TopicOption[] = [
  {
    id: "placement",
    label: "Placement Status",
    icon: "📋",
    description: "Ask about your request status",
    suggestedMessage: "Hi, I'd like an update on my current placement request.",
    enabled: true,
  },
  {
    id: "schedule",
    label: "Schedule Change",
    icon: "📅",
    description: "Request a schedule update",
    suggestedMessage: "Hi, I need to request a schedule change.",
    enabled: true,
  },
  {
    id: "billing",
    label: "Billing",
    icon: "💳",
    description: "Ask about invoice or fees",
    suggestedMessage: "Hi, I have a question about billing or invoice.",
    enabled: true,
  },
  {
    id: "concern",
    label: "Raise Concern",
    icon: "🚨",
    description: "Report an issue or concern",
    suggestedMessage: "Hi, I'd like to raise a concern regarding my current arrangement.",
    enabled: true,
  },
  {
    id: "other",
    label: "Other",
    icon: "💬",
    description: "Type your own message",
    suggestedMessage: "",
    enabled: true,
  },
];

const DEFAULT_CONFIG: AgencyChatbotConfig = {
  agencyId: 1,
  enabled: true,
  botName: "Support Bot",
  welcomeMessage: "Hi {{name}}, welcome to {{agencyName}}. How can I help you today?",
  fallbackShortResponse:
    "Hi {{name}}, thanks for your message. Could you share a little more detail so I can help you with the next step?",
  fallbackLongResponse:
    "Hi {{name}}, thanks for reaching out. I've noted your message. If you can share the main details here, I'll help make sure it is clear for the team to follow up.",
  suggestionChips: [
    "What's my placement status?",
    "I need to reschedule",
    "Billing question",
    "Raise a concern",
  ],
  topicOptions: DEFAULT_TOPICS,
  responseRules: [],
  updatedAt: "",
};

const detectTopicIntent = (topic?: TopicOption | null) => {
  const haystack = `${topic?.id ?? ""} ${topic?.label ?? ""} ${topic?.description ?? ""} ${topic?.suggestedMessage ?? ""}`.toLowerCase();
  if (/(placement|status|application|progress|update)/.test(haystack)) return "placement";
  if (/(schedule|reschedule|appointment|timing|date|interview)/.test(haystack)) return "schedule";
  if (/(billing|invoice|payment|fee|fees|price|cost)/.test(haystack)) return "billing";
  if (/(concern|issue|complaint|problem|urgent|escalat)/.test(haystack)) return "concern";
  if (/(renew|renewal|contract|extend|extension)/.test(haystack)) return "renewal";
  if (/(document|paperwork|permit|requirement)/.test(haystack)) return "documents";
  return "general";
};

const compactWhitespace = (value: string) => value.replace(/\s+/g, " ").trim();

const sanitizeConversationPreview = (message: string) => {
  const normalized = compactWhitespace(message);
  if (!normalized) return "No messages yet";
  if (
    /(thank you for your message|thank you for reaching out|our team will review it shortly|could you share a little more detail|how may i assist you today)/i.test(normalized)
  ) {
    return "Automated support reply";
  }
  if (/(tracked case|support team|logged with our support team)/i.test(normalized)) {
    return "Tracked support item created";
  }
  return normalized.length > 90 ? `${normalized.slice(0, 89)}...` : normalized;
};

const getConversationBadgeLabel = (conversation: ClientConversation) =>
  conversation.conversationType === "agency" ? "Agency chat" : "Support";

// ─── Guide steps ──────────────────────────────────────────────────────────────

const GUIDE_STEPS = [
  {
    emoji: "👋",
    title: "Welcome to Support Chat!",
    body: "This is where you can send messages to the agency team. They'll reply here — just like chatting on Facebook Messenger.",
  },
  {
    emoji: "📋",
    title: "Pick a topic first",
    body: 'Tap "What can we help you with?" at the top, then choose the topic that matches your question — like Billing, Schedule, or Placement Status. This helps the team respond faster.',
  },
  {
    emoji: "⚡",
    title: "Quick buttons save time",
    body: "After choosing a topic, you'll see shortcut buttons appear. Just tap one to send a message instantly — no typing needed!",
  },
  {
    emoji: "💬",
    title: "Or just type your message",
    body: "Prefer to type? Go ahead! Type in the box at the bottom and press the green Send button (or press Enter on your keyboard).",
  },
  {
    emoji: "🤖",
    title: "The bot replies right away",
    body: "You'll get an instant reply from our Support Bot. It will note your message and let the team know. A real person will follow up with you shortly.",
  },
  {
    emoji: "✅",
    title: "You're all set!",
    body: "That's all there is to it. If you ever get stuck, just type your question and the bot will guide you. You can reopen this guide anytime using the ? button.",
  },
];

// ─── CSS ──────────────────────────────────────────────────────────────────────

const CSS = `
*,*::before,*::after{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}

/* ── Root variables ── */
.sc {
  --sc-green:#16a97b; --sc-green-dark:#0f8a64; --sc-green-light:#edfaf4;
  --sc-green-border:#a8e6cc; --sc-blue-light:#eff6ff;
  --sc-surface:#ffffff; --sc-bg:#f0f4f2;
  --sc-border:#e4e8e6; --sc-border-soft:#eef1ef;
  --sc-text:#111827; --sc-text2:#6b7280; --sc-text3:#6b7280;
  --sc-shadow-xs:0 1px 2px rgba(0,0,0,.05);
  --sc-shadow-sm:0 1px 4px rgba(0,0,0,.08),0 2px 8px rgba(0,0,0,.04);
  --sc-shadow-md:0 4px 16px rgba(0,0,0,.10),0 1px 4px rgba(0,0,0,.06);
  display:flex;flex-direction:column;
  height:calc(100dvh - 79px); min-height:0;
  background:var(--sc-bg);
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
  overflow:hidden;
}

/* ── Nav ── */
.sc-nav {
  height:56px; background:rgba(255,255,255,.94); backdrop-filter:blur(12px);
  border-bottom:1px solid var(--sc-border); display:flex;
  align-items:center; justify-content:space-between;
  padding:0 20px; flex-shrink:0;
  box-shadow:var(--sc-shadow-xs);
}
.sc-nav-brand { display:flex; align-items:center; gap:12px; }
.sc-nav-icon {
  width:38px; height:38px; border-radius:12px;
  background:linear-gradient(135deg,#27c48a,#16a97b);
  display:flex; align-items:center; justify-content:center;
  flex-shrink:0; box-shadow:0 2px 8px rgba(22,169,123,.30);
}
.sc-nav-title { font-size:16px; font-weight:800; color:var(--sc-text); letter-spacing:-.02em; }
.sc-nav-unread { font-size:11px; color:var(--sc-green); font-weight:600; margin-top:1px; }
.sc-nav-right { display:flex; align-items:center; gap:10px; }
.sc-help-btn {
  width:34px; height:34px; border-radius:50%;
  border:1.5px solid var(--sc-green-border);
  background:var(--sc-green-light); color:#0a5c40;
  display:flex; align-items:center; justify-content:center;
  cursor:pointer; flex-shrink:0; transition:background .15s;
}
.sc-help-btn:hover { background:#d0f5e7; }

/* ── Offline banner ── */
.sc-banner {
  display:flex; align-items:center; gap:10px;
  padding:10px 20px; font-size:13px; font-weight:500;
  border-bottom:1px solid #fca5a5; background:#fff5f5; color:#b91c1c;
  flex-shrink:0;
}

/* ── Body / sidebar ── */
.sc-body { display:flex; flex:1; overflow:hidden; min-height:0; position:relative; }
.sc-overlay { display:none; position:absolute; inset:0; background:rgba(0,0,0,.45); z-index:24; }
.sc-overlay.visible { display:block; }
.sc-sidebar {
  width:306px; min-width:306px; background:var(--sc-surface);
  border-right:1px solid var(--sc-border);
  display:flex; flex-direction:column; overflow:hidden;
  flex-shrink:0; z-index:25;
  transition:transform .24s cubic-bezier(.4,0,.2,1);
}
.sc-sidebar-hdr { padding:16px 14px 12px; border-bottom:1px solid var(--sc-border-soft); flex-shrink:0; background:linear-gradient(180deg,#fff 0%,#f8fcfa 100%); }
.sc-sidebar-label {
  font-size:11px; font-weight:700; color:var(--sc-text3);
  text-transform:uppercase; letter-spacing:.07em; margin-bottom:10px;
}
.sc-searchbox {
  display:flex; align-items:center; gap:8px;
  background:#f6f8f7; border-radius:10px; padding:8px 12px;
  border:1.5px solid transparent; transition:border-color .15s, background .15s;
}
.sc-searchbox:focus-within { background:#fff; border-color:var(--sc-green); }
.sc-searchbox input { border:none; outline:none; background:transparent; font-size:13.5px; color:var(--sc-text); flex:1; min-width:0; }
.sc-searchbox input::placeholder { color:var(--sc-text3); }

/* ── Conversation list ── */
.sc-conv-list { flex:1; overflow-y:auto; padding:10px 8px 6px; scrollbar-width:thin; scrollbar-color:rgba(0,0,0,.1) transparent; }
.sc-conv-list::-webkit-scrollbar { width:4px; }
.sc-conv-list::-webkit-scrollbar-thumb { background:rgba(0,0,0,.10); border-radius:8px; }
.sc-conv-item {
  display:flex; align-items:flex-start; gap:10px;
  padding:11px 10px; border-radius:12px; cursor:pointer;
  margin-bottom:2px; transition:background .13s;
  border-left:3px solid transparent;
}
.sc-conv-item:hover:not(.active) { background:#f5f8f6; }
.sc-conv-item.active { background:linear-gradient(90deg,#e6f9ef,#f3fcf7); border-left-color:var(--sc-green); box-shadow:inset 0 0 0 1px rgba(22,169,123,.08); }
.sc-conv-av {
  width:42px; height:42px; border-radius:13px;
  display:flex; align-items:center; justify-content:center;
  font-size:18px; flex-shrink:0; overflow:hidden;
  box-shadow:var(--sc-shadow-xs);
}
.sc-conv-av.support { background:#e0faf0; }
.sc-conv-av.agency  { background:#dbeafe; }
.sc-conv-av img { width:100%; height:100%; object-fit:cover; }
.sc-conv-info { flex:1; min-width:0; }
.sc-conv-name { font-size:13.5px; font-weight:700; color:var(--sc-text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.sc-conv-meta { display:flex; align-items:center; gap:5px; margin-top:3px; }
.sc-conv-badge {
  display:inline-flex; align-items:center;
  border-radius:6px; background:var(--sc-green-light);
  color:#0a5c40; border:1px solid var(--sc-green-border);
  padding:1px 7px; font-size:9.5px; font-weight:700;
  text-transform:uppercase; letter-spacing:.06em;
}
.sc-conv-preview {
  font-size:12px; color:var(--sc-text2); line-height:1.4; margin-top:4px;
  display:-webkit-box; -webkit-line-clamp:1; -webkit-box-orient:vertical; overflow:hidden;
}
.sc-unread {
  min-width:20px; height:20px; background:var(--sc-green);
  color:#fff; border-radius:99px; font-size:10.5px; font-weight:700;
  display:flex; align-items:center; justify-content:center;
  padding:0 5px; flex-shrink:0; margin-top:2px;
  box-shadow:0 1px 4px rgba(22,169,123,.30);
}

/* ── Sidebar stats ── */
.sc-stats {
  display:grid; grid-template-columns:repeat(3,1fr);
  border-top:1px solid var(--sc-border); flex-shrink:0;
  background:#fafcfa;
}
.sc-stat { padding:10px 8px; text-align:center; border-right:1px solid var(--sc-border); }
.sc-stat:last-child { border-right:none; }
.sc-stat-lbl { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.07em; color:var(--sc-text3); }
.sc-stat-val { font-size:15px; font-weight:800; color:var(--sc-text); margin-top:2px; }
.sc-stat-val.green { color:var(--sc-green); }

/* ── Main / header ── */
.sc-main { flex:1; display:flex; flex-direction:column; overflow:hidden; min-width:0; background:#f7faf8; }
.sc-chat-hdr {
  background:rgba(255,255,255,.96); border-bottom:1px solid var(--sc-border);
  padding:11px 18px; display:flex; align-items:center; gap:11px;
  flex-shrink:0; box-shadow:0 2px 12px rgba(15,23,42,.035);
}
.sc-back-btn {
  display:none; width:36px; height:36px; border-radius:10px;
  background:#f3f5f4; border:none; cursor:pointer;
  align-items:center; justify-content:center; color:#555; flex-shrink:0;
  transition:background .12s;
}
.sc-back-btn:hover { background:#e8ecea; }
.sc-chat-av {
  width:40px; height:40px; border-radius:13px;
  display:flex; align-items:center; justify-content:center;
  font-size:17px; flex-shrink:0; overflow:hidden;
  box-shadow:var(--sc-shadow-xs);
}
.sc-chat-av.support { background:#e0faf0; }
.sc-chat-av.agency  { background:#dbeafe; }
.sc-chat-av img { width:100%; height:100%; object-fit:cover; }
.sc-chat-info { flex:1; min-width:0; }
.sc-chat-name { font-size:15px; font-weight:800; color:var(--sc-text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; letter-spacing:-.01em; }
.sc-chat-desc { font-size:12px; color:var(--sc-text3); margin-top:1px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

/* ── Topic picker ── */
.sc-topics { flex-shrink:0; border-bottom:1px solid var(--sc-border); background:#fff; overflow:hidden; }
.sc-topics-hdr {
  display:flex; align-items:center; justify-content:space-between;
  padding:10px 16px; cursor:pointer; user-select:none;
  width:100%; background:none; border:none;
  font-family:inherit; text-align:left; color:inherit;
}
.sc-topics-hdr-left {
  display:flex; align-items:center; gap:7px;
  font-size:11px; font-weight:700; color:var(--sc-text2);
  text-transform:uppercase; letter-spacing:.05em; flex-wrap:wrap;
}
.sc-topics-toggle {
  width:24px; height:24px; border-radius:7px; background:#f3f5f4;
  display:flex; align-items:center; justify-content:center;
  flex-shrink:0; transition:transform .22s ease;
}
.sc-topics-toggle.open { transform:rotate(180deg); }
.sc-topics-body { padding:2px 12px 12px; }
.sc-topic-grid { display:flex; flex-wrap:wrap; gap:7px; }
.sc-topic-btn {
  display:inline-flex; align-items:center; gap:6px;
  padding:8px 13px; border-radius:10px;
  border:1.5px solid var(--sc-border);
  background:var(--sc-surface); text-align:left;
  cursor:pointer; font-size:13px; font-weight:600; color:#374151;
  transition:all .15s; white-space:nowrap;
}
.sc-topic-btn:hover { border-color:var(--sc-green); background:var(--sc-green-light); color:#0a5c40; }
.sc-topic-btn.active { border-color:var(--sc-green); background:var(--sc-green-light); color:#0a5c40; }
.sc-topic-icon { font-size:15px; line-height:1; }
.sc-topic-name { font-size:13px; font-weight:600; }
.sc-topic-desc { display:none; }
.sc-topic-selected-pill {
  display:inline-flex; align-items:center; gap:5px;
  background:var(--sc-green-light); color:#0a5c40;
  border:1px solid var(--sc-green-border);
  border-radius:99px; padding:2px 9px; font-size:11px; font-weight:600;
}
.sc-chips-wrap { display:none; }
.sc-chips-lbl { font-size:11px; font-weight:700; color:var(--sc-text3); text-transform:uppercase; letter-spacing:.06em; margin-bottom:8px; }
.sc-chips { display:flex; flex-wrap:wrap; gap:7px; }
.sc-chip { display:inline-flex; align-items:center; gap:5px; padding:6px 14px; border-radius:99px; border:1.5px solid var(--sc-green-border); background:var(--sc-surface); color:#0a5c40; font-size:12.5px; font-weight:600; cursor:pointer; transition:background .13s; }
.sc-chip:hover { background:var(--sc-green-light); }

/* ── Quick replies (inline in chat) ── */
.sc-quick-replies {
  display:flex; flex-wrap:wrap; gap:8px;
  padding:4px 0 8px 42px; align-self:flex-start; max-width:92%;
}
.sc-quick-reply-btn {
  display:inline-flex; align-items:center; gap:5px;
  border:1.5px solid var(--sc-green);
  background:var(--sc-surface); color:#0a5c40;
  border-radius:10px; padding:7px 14px;
  font-size:12.5px; font-weight:600; cursor:pointer;
  transition:all .15s; white-space:nowrap;
  box-shadow:var(--sc-shadow-xs);
}
.sc-quick-reply-btn:hover { background:var(--sc-green-light); }

/* ── Messages area ── */
.sc-msgs {
  flex:1; min-height:0; overflow-y:auto; padding:20px clamp(14px,3vw,34px); display:flex;
  flex-direction:column; gap:10px;
  background:radial-gradient(circle at top right,rgba(209,250,229,.52),transparent 26rem),#f7faf8;
  scrollbar-width:thin; scrollbar-color:rgba(0,0,0,.10) transparent;
}
.sc-msgs::-webkit-scrollbar { width:4px; }
.sc-msgs::-webkit-scrollbar-thumb { background:rgba(0,0,0,.10); border-radius:8px; }
.sc-empty {
  flex:1; display:flex; flex-direction:column;
  align-items:center; justify-content:center;
  color:var(--sc-text3); text-align:center; gap:12px; padding:40px 20px;
}
.sc-empty-icon {
  width:64px; height:64px; border-radius:20px;
  background:linear-gradient(135deg,#e0faf0,#f0fdf6);
  display:flex; align-items:center; justify-content:center; font-size:28px;
  box-shadow:var(--sc-shadow-sm);
}
.sc-empty-lbl { font-size:15px; font-weight:700; color:var(--sc-text2); }
.sc-empty-sub  { font-size:13px; color:var(--sc-text3); max-width:220px; line-height:1.5; }
.sc-error-banner {
  display:flex; align-items:center; gap:8px;
  background:#fff5f5; border:1px solid #fca5a5;
  border-radius:12px; padding:13px 16px;
  font-size:13px; color:#b91c1c; font-weight:500;
}

/* ── Message bubbles ── */
.sc-msg-row { display:flex; gap:8px; align-items:flex-end; animation:scMsgIn .18s cubic-bezier(.22,1,.36,1) both; }
.sc-msg-row.own { flex-direction:row-reverse; }
@keyframes scMsgIn { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:none} }
.sc-msg-avi {
  width:34px; height:34px; border-radius:11px;
  background:#e8ece9; display:flex; align-items:center;
  justify-content:center; font-size:12px; font-weight:700;
  color:#555; flex-shrink:0; overflow:hidden;
  box-shadow:var(--sc-shadow-xs);
}
.sc-msg-avi img { width:100%; height:100%; object-fit:cover; }
.sc-msg-col { display:flex; flex-direction:column; max-width:min(76%,680px); }
.sc-msg-row.own .sc-msg-col { align-items:flex-end; }
.sc-msg-sender { font-size:11px; font-weight:600; color:var(--sc-text3); margin-bottom:3px; padding-left:3px; }
.sc-bubble {
  padding:10px 14px; border-radius:18px;
  font-size:14px; line-height:1.6; word-break:break-word;
  white-space:pre-wrap;
}
.sc-msg-row.own .sc-bubble {
  background:linear-gradient(135deg,#27c48a,#16a97b);
  color:#fff; border-bottom-right-radius:5px;
  box-shadow:0 3px 10px rgba(22,169,123,.28);
}
.sc-msg-row:not(.own) .sc-bubble {
  background:#fff; color:var(--sc-text);
  border:1px solid #e8ece9; border-bottom-left-radius:5px;
  box-shadow:0 1px 4px rgba(0,0,0,.06),0 2px 6px rgba(0,0,0,.03);
}
.sc-msg-time { font-size:10px; color:var(--sc-text3); margin-top:4px; padding:0 3px; }

/* ── Typing indicator ── */
.sc-typing-bubble {
  display:inline-flex; align-items:center; gap:5px;
  background:#fff; border:1px solid #e8ece9;
  border-radius:18px; border-bottom-left-radius:5px;
  padding:11px 15px;
  box-shadow:0 1px 4px rgba(0,0,0,.06);
}
.sc-typing-dot {
  width:7px; height:7px; border-radius:50%;
  background:#b0b7c3; animation:sc-typing 1.3s ease-in-out infinite;
}
.sc-typing-dot:nth-child(2) { animation-delay:.18s; }
.sc-typing-dot:nth-child(3) { animation-delay:.36s; }
@keyframes sc-typing { 0%,60%,100%{transform:translateY(0);opacity:.4} 30%{transform:translateY(-5px);opacity:1} }

/* ── Load earlier ── */
.sc-load-earlier {
  display:flex; align-items:center; justify-content:center; gap:6px;
  margin:0 auto 4px; padding:6px 20px; border-radius:99px;
  background:#fff; border:1.5px solid var(--sc-border);
  font-size:12px; font-weight:600; color:var(--sc-text2);
  cursor:pointer; transition:all .13s; flex-shrink:0;
  box-shadow:var(--sc-shadow-xs);
}
.sc-load-earlier:hover:not(:disabled) { border-color:var(--sc-green); color:var(--sc-green); background:var(--sc-green-light); }
.sc-load-earlier:disabled { opacity:0.55; cursor:default; }

/* ── Compose ── */
.sc-compose {
  background:rgba(255,255,255,.96);
  border-top:1px solid var(--sc-border);
  padding:12px clamp(14px,3vw,28px) 14px; flex-shrink:0;
  box-shadow:0 -5px 18px rgba(15,23,42,.035);
}
.sc-topic-tag {
  display:inline-flex; align-items:center; gap:6px;
  background:var(--sc-green-light); color:#0a5c40;
  border:1px solid var(--sc-green-border);
  border-radius:9px; padding:5px 11px;
  font-size:12px; font-weight:600; margin-bottom:8px;
}
.sc-topic-tag button {
  background:none; border:none; cursor:pointer; color:inherit;
  opacity:.6; padding:0; display:flex; align-items:center;
  min-width:20px; min-height:20px; justify-content:center;
}
.sc-compose-box {
  display:flex; align-items:flex-end; gap:8px;
  background:#f3f5f4; border-radius:14px;
  padding:8px 8px 8px 14px; border:1.5px solid transparent;
  transition:border-color .15s, background .15s;
}
.sc-compose-box:focus-within { border-color:var(--sc-green); background:#fff; box-shadow:0 0 0 3px rgba(22,169,123,.10); }
.sc-compose-box textarea {
  flex:1; border:none; outline:none; background:transparent;
  resize:none; font-size:14.5px; color:var(--sc-text);
  line-height:1.55; min-height:22px; max-height:130px;
  font-family:inherit; padding:0;
}
.sc-compose-box textarea::placeholder { color:var(--sc-text3); }
.sc-send-btn {
  width:38px; height:38px; border-radius:11px;
  background:linear-gradient(135deg,#27c48a,#16a97b);
  border:none; display:flex; align-items:center;
  justify-content:center; cursor:pointer; flex-shrink:0; color:#fff;
  box-shadow:0 2px 8px rgba(22,169,123,.30);
  transition:transform .12s, box-shadow .12s;
}
.sc-send-btn:not(:disabled):hover  { transform:scale(1.06); box-shadow:0 3px 12px rgba(22,169,123,.38); }
.sc-send-btn:not(:disabled):active { transform:scale(0.94); }
.sc-send-btn:disabled { background:#d1d5db; box-shadow:none; cursor:not-allowed; }
.sc-compose-hint { font-size:11px; color:var(--sc-text3); margin-top:5px; padding-left:2px; }

/* ── Guide modal ── */
.sc-guide-backdrop {
  position:fixed; inset:0; background:rgba(0,0,0,.60); z-index:200;
  display:flex; align-items:flex-end; justify-content:center;
  padding:0; animation:sc-guide-fade .22s ease; backdrop-filter:blur(3px);
}
@media (min-width:520px) { .sc-guide-backdrop { align-items:center; padding:20px; } }
@keyframes sc-guide-fade { from{opacity:0} to{opacity:1} }
.sc-guide-sheet {
  background:var(--sc-surface); border-radius:24px 24px 0 0;
  width:100%; max-width:468px; overflow:hidden;
  display:flex; flex-direction:column;
  border:1px solid rgba(255,255,255,.35); box-shadow:0 24px 70px rgba(15,23,42,.30);
  animation:sc-guide-up .32s cubic-bezier(.34,1.46,.64,1);
}
@media (min-width:520px) { .sc-guide-sheet { border-radius:22px; animation:sc-guide-pop .28s cubic-bezier(.34,1.46,.64,1); } }
@keyframes sc-guide-up { from{transform:translateY(60px);opacity:0} to{transform:translateY(0);opacity:1} }
@keyframes sc-guide-pop { from{transform:scale(.92);opacity:0} to{transform:scale(1);opacity:1} }
.sc-guide-accent { height:5px; background:linear-gradient(90deg,#0f8a64 0%,#28c48b 52%,#a7f3d0 100%); flex-shrink:0; }
.sc-guide-inner { padding:30px; display:flex; flex-direction:column; position:relative; }
.sc-guide-close {
  position:absolute; top:16px; right:16px; width:34px; height:34px;
  border-radius:10px; border:1px solid #edf0ee; background:#f8faf9; color:#64748b;
  display:flex; align-items:center; justify-content:center; cursor:pointer; transition:background .15s;
}
.sc-guide-close:hover { background:#edf7f1; color:#0f8a64; }
.sc-guide-heading { display:flex; align-items:center; gap:15px; padding-right:44px; }
.sc-guide-emoji-ring {
  width:58px; height:58px; border-radius:17px; flex-shrink:0;
  background:linear-gradient(135deg,#d9faeb,#bbf1d8);
  display:flex; align-items:center; justify-content:center;
  border:1px solid #c7f3dd; box-shadow:0 8px 20px rgba(22,169,123,.15);
}
.sc-guide-emoji { font-size:29px; line-height:1; display:block; }
.sc-guide-kicker { margin:0 0 4px; color:#0f8a64; font-size:10px; font-weight:800; letter-spacing:.12em; text-transform:uppercase; }
.sc-guide-title { font-size:21px; font-weight:800; color:var(--sc-text); margin:0; letter-spacing:-.025em; line-height:1.2; }
.sc-guide-body { font-size:14px; color:#526072; line-height:1.7; margin:22px 0 24px; min-height:72px; }
.sc-guide-progress-wrap { margin-bottom:24px; padding:14px; border:1px solid #e9efec; border-radius:14px; background:#f9fcfa; }
.sc-guide-progress-track { height:6px; background:#e8efeb; border-radius:99px; overflow:hidden; }
.sc-guide-progress-fill { height:100%; background:linear-gradient(90deg,#27c48a,#16a97b); border-radius:99px; transition:width .35s cubic-bezier(.4,0,.2,1); }
.sc-guide-progress-meta { display:flex; justify-content:space-between; margin-top:9px; font-size:11px; color:#64748b; font-weight:700; }
.sc-guide-actions { display:flex; gap:12px; }
.sc-guide-btn-skip { flex:1; padding:13px; border-radius:11px; border:1px solid #dce5e0; background:#fff; font-size:14px; font-weight:700; color:#64748b; cursor:pointer; transition:background .12s,border-color .12s; }
.sc-guide-btn-skip:hover { background:#f6f8f7; border-color:#d1d5db; }
.sc-guide-btn-next { flex:2; padding:13px; border-radius:11px; border:none; background:linear-gradient(135deg,#20b982,#0f956b); color:#fff; font-size:14px; font-weight:800; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:7px; box-shadow:0 4px 12px rgba(22,169,123,.25); transition:transform .12s,box-shadow .12s; }
.sc-guide-btn-next:hover { transform:translateY(-1px); box-shadow:0 4px 14px rgba(22,169,123,.40); }
.sc-guide-btn-next:active { transform:translateY(0); }
.sc-guide-btn-done { flex:1; padding:13px; border-radius:11px; border:none; background:linear-gradient(135deg,#20b982,#0f956b); color:#fff; font-size:14px; font-weight:800; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:7px; box-shadow:0 4px 12px rgba(22,169,123,.25); transition:transform .12s,box-shadow .12s; }
.sc-guide-btn-done:hover { transform:translateY(-1px); box-shadow:0 4px 14px rgba(22,169,123,.40); }
.sc-guide-btn-done:active { transform:translateY(0); }

/* ── Responsive ── */
@media (max-width:768px) {
  .sc { height:calc(100dvh - 59px); }
  .sc-sidebar { position:absolute; top:0; left:0; bottom:0; width:82%; max-width:300px; transform:translateX(-100%); z-index:25; }
  .sc-sidebar.open { transform:translateX(0); box-shadow:8px 0 40px rgba(0,0,0,.20); }
  .sc-back-btn { display:flex !important; }
  .sc-nav { height:56px; padding:0 14px; }
  .sc-chat-hdr { padding:10px 12px; }
  .sc-topics-body { padding:0 10px 10px; }
  .sc-msgs { padding:12px 10px; gap:9px; }
  .sc-msg-col { max-width:85%; }
  .sc-compose { padding:9px 12px 11px; }
  .sc-compose-hint { display:none; }
}
`;

// ─── Guide modal component ────────────────────────────────────────────────────

function GuideModal({ onDismiss }: { onDismiss: () => void }) {
  const [step, setStep] = useState(0);
  const current = GUIDE_STEPS[step];
  const isLast = step === GUIDE_STEPS.length - 1;
  const progress = Math.round(((step + 1) / GUIDE_STEPS.length) * 100);

  return (
    <div className="sc-guide-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onDismiss(); }}>
      <div className="sc-guide-sheet" role="dialog" aria-modal="true" aria-labelledby="support-guide-title">
        <div className="sc-guide-accent" />
        <div className="sc-guide-inner">
          <button className="sc-guide-close" onClick={onDismiss} aria-label="Close guide">
            <X size={15} />
          </button>

          <div className="sc-guide-heading">
            <div className="sc-guide-emoji-ring" aria-hidden="true">
              <span className="sc-guide-emoji">{current.emoji}</span>
            </div>
            <div>
              <p className="sc-guide-kicker">Support chat · Quick guide</p>
              <h2 id="support-guide-title" className="sc-guide-title">{current.title}</h2>
            </div>
          </div>
          <div className="sc-guide-body">{current.body}</div>

          <div className="sc-guide-progress-wrap">
            <div className="sc-guide-progress-track">
              <div className="sc-guide-progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <div className="sc-guide-progress-meta">
              <span>Step {step + 1} of {GUIDE_STEPS.length}</span>
              <span>{progress}%</span>
            </div>
          </div>

          <div className="sc-guide-actions">
            {!isLast ? (
              <>
                <button className="sc-guide-btn-skip" onClick={onDismiss}>
                  Skip
                </button>
                <button className="sc-guide-btn-next" onClick={() => setStep((s) => s + 1)}>
                  Next →
                </button>
              </>
            ) : (
              <button className="sc-guide-btn-done" onClick={onDismiss} style={{ flex: 1 }}>
                <CheckCircle size={17} /> Got it, let's start!
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TopicPicker({
  topics,
  selectedId,
  onSelect,
}: {
  topics: TopicOption[];
  selectedId: string | null;
  onSelect: (topic: TopicOption) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedTopic = topics.find((topic) => topic.id === selectedId);

  return (
    <div className="sc-topics">
      <button
        type="button"
        className="sc-topics-hdr"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <div className="sc-topics-hdr-left">
          <Tag size={12} />
          What can we help you with?
          {!open && selectedTopic && (
            <span className="sc-topic-selected-pill">
              {selectedTopic.icon} {selectedTopic.label}
            </span>
          )}
        </div>
        <div className={`sc-topics-toggle${open ? " open" : ""}`}>
          <ChevronDown size={13} color="#6b7280" />
        </div>
      </button>

      {open && (
        <div className="sc-topics-body">
          <div className="sc-topic-grid">
            {topics.map((topic) => (
              <button
                key={topic.id}
                className={`sc-topic-btn${selectedId === topic.id ? " active" : ""}`}
                onClick={() => {
                  onSelect(topic);
                  setOpen(false);
                }}
              >
                <span className="sc-topic-icon">{topic.icon}</span>
                <span className="sc-topic-name">{topic.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SuggestionChips({
  suggestions,
  onSelect,
}: {
  suggestions: string[];
  onSelect: (text: string) => void | Promise<void>;
}) {
  if (suggestions.length === 0) return null;
  return (
    <div className="sc-chips-wrap">
      <p className="sc-chips-lbl">Suggested</p>
      <div className="sc-chips">
        {suggestions.map((suggestion) => (
          <button key={suggestion} className="sc-chip" onClick={() => onSelect(suggestion)}>
            <Sparkles size={11} /> {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}

function ChatAvatar({
  imageUrl,
  alt,
  fallback,
  className,
}: {
  imageUrl?: string;
  alt: string;
  fallback: string;
  className: string;
}) {
  return (
    <div className={className}>
      {imageUrl ? <img src={imageUrl} alt={alt} /> : fallback}
    </div>
  );
}

function MessageBubble({ message, isOwn }: { message: ChatMessage; isOwn: boolean }) {
  const time = new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const initials = (message.senderName || "?").slice(0, 2).toUpperCase();
  const avatarUrl = isOwn ? message.clientProfileImageUrl : message.agencyProfileImageUrl;
  const avatarFallback = isOwn ? "ME" : initials;
  const avatarAlt = isOwn ? "Your profile" : message.senderName;

  return (
    <div className={`sc-msg-row${isOwn ? " own" : ""}`}>
      <ChatAvatar
        imageUrl={avatarUrl}
        alt={avatarAlt}
        fallback={avatarFallback}
        className="sc-msg-avi"
      />
      <div className="sc-msg-col">
        {!isOwn && <div className="sc-msg-sender">{message.senderName}</div>}
        <div className="sc-bubble">{message.message}</div>
        <div className="sc-msg-time">{time}</div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const ClientSupportChat = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const client = getStoredClient();
  const guideStorageKey = `${GUIDE_STORAGE_PREFIX}:${client?.id ?? "guest"}`;
  const [conversations, setConversations] = useState<ClientConversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [hasMoreOlder, setHasMoreOlder] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<TopicOption | null>(null);
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [chatbotConfig, setChatbotConfig] = useState<AgencyChatbotConfig>(DEFAULT_CONFIG);

  // Show the guide automatically once per signed-in client. Record it immediately
  // so a remount, refresh, or navigation cannot show the automatic popup again.
  const [showGuide, setShowGuide] = useState(() => {
    let hasSeenGuide = seenGuideKeys.has(guideStorageKey);
    try {
      hasSeenGuide = hasSeenGuide || Boolean(
        localStorage.getItem(guideStorageKey) || sessionStorage.getItem(guideStorageKey),
      );
    } catch {
      // The in-memory record still prevents repeat popups in restricted browsers.
    }
    if (!hasSeenGuide) {
      seenGuideKeys.add(guideStorageKey);
      try {
        localStorage.setItem(guideStorageKey, "1");
        sessionStorage.setItem(guideStorageKey, "1");
      } catch { /* ignore unavailable storage */ }
    }
    return !hasSeenGuide;
  });

  const dismissGuide = () => {
    seenGuideKeys.add(guideStorageKey);
    try {
      localStorage.setItem(guideStorageKey, "1");
      sessionStorage.setItem(guideStorageKey, "1");
    } catch { /* ignore unavailable storage */ }
    setShowGuide(false);
  };

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const lastSigRef = useRef("");
  const activeConvRef = useRef<ClientConversation>(defaultConversation);
  const botReplyTimerRef = useRef<number | null>(null);
  const isNearBottomRef = useRef(true);
  const justPrependedRef = useRef(false);
  // Track IDs of messages we've already added optimistically so SSE doesn't double-add them
  const optimisticIdsRef = useRef<Set<number>>(new Set());

  const selectedType: ConversationType = searchParams.get("type") === "agency" ? "agency" : "support";
  const selectedAgencyId = selectedType === "agency" ? Number(searchParams.get("agencyId")) : undefined;

  // Pre-fill draft when arriving from a maid profile "Contact Agency" click
  useEffect(() => {
    const maidRef = searchParams.get("maidRef");
    const maidName = searchParams.get("maidName");
    if (maidRef && maidName) {
      setDraft(`Hi, I'm interested in ${maidName} (${maidRef}). I'd like to enquire about hiring this helper.`);
      // Clean params from URL without re-navigating
      setSearchParams((prev) => {
        prev.delete("maidRef");
        prev.delete("maidName");
        return prev;
      }, { replace: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeConv =
    conversations.find(
      (conversation) =>
        conversation.conversationType === selectedType &&
        (conversation.conversationType === "support" || conversation.agencyId === selectedAgencyId),
    ) ?? conversations[0] ?? defaultConversation;

  useEffect(() => {
    activeConvRef.current = activeConv;
  }, [activeConv]);

  const qs = useMemo(() => {
    const params = new URLSearchParams();
    params.set("type", activeConv.conversationType);
    if (activeConv.conversationType === "agency" && activeConv.agencyId) {
      params.set("agencyId", String(activeConv.agencyId));
      params.set("agencyName", activeConv.agencyName || "Agency");
    }
    return params.toString();
  }, [activeConv]);

  const chatbotEnabled = chatbotConfig.enabled;
  const suggestionChips = chatbotConfig.suggestionChips.length > 0
    ? chatbotConfig.suggestionChips
    : DEFAULT_CONFIG.suggestionChips;
  const topics = useMemo(
    () =>
      (chatbotConfig.topicOptions.length > 0 ? chatbotConfig.topicOptions : DEFAULT_CONFIG.topicOptions)
        .filter((topic) => topic.enabled !== false),
    [chatbotConfig.topicOptions],
  );
  const filteredConversations = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return conversations;
    return conversations.filter((conversation) =>
      `${conversation.title} ${conversation.description} ${conversation.lastMessage}`.toLowerCase().includes(term),
    );
  }, [conversations, search]);

  const loadChatbotConfig = useCallback(async () => {
    try {
      const response = await clientFetch(`/api/chats/client/config?${qs}`);
      const data = (await response.json().catch(() => ({}))) as { config?: AgencyChatbotConfig };
      if (response.ok && data.config) {
        setChatbotConfig({
          ...DEFAULT_CONFIG,
          ...data.config,
          topicOptions: data.config.topicOptions?.length ? data.config.topicOptions : DEFAULT_CONFIG.topicOptions,
          suggestionChips: data.config.suggestionChips?.length ? data.config.suggestionChips : DEFAULT_CONFIG.suggestionChips,
          responseRules: data.config.responseRules ?? [],
        });
        return;
      }
      setChatbotConfig(DEFAULT_CONFIG);
    } catch {
      setChatbotConfig(DEFAULT_CONFIG);
    }
  }, [qs]);

  const loadConversations = useCallback(async (silent = false) => {
    try {
      const response = await clientFetch("/api/chats/client/conversations");
      const data = (await response.json().catch(() => ({}))) as {
        conversations?: ClientConversation[];
        error?: string;
      };
      if (!response.ok || !data.conversations) {
        throw new Error(data.error || "Failed to load conversations");
      }
      setConversations(data.conversations);

      const hasSelectedConversation = data.conversations.some(
        (conversation) =>
          conversation.conversationType === selectedType &&
          (conversation.conversationType === "support" || conversation.agencyId === selectedAgencyId),
      );
      if (!hasSelectedConversation && data.conversations[0]) {
        const params = new URLSearchParams();
        params.set("type", data.conversations[0].conversationType);
        if (data.conversations[0].conversationType === "agency" && data.conversations[0].agencyId) {
          params.set("agencyId", String(data.conversations[0].agencyId));
          params.set("agencyName", data.conversations[0].agencyName || "Agency");
        }
        setSearchParams(params, { replace: true });
      }
    } catch (error) {
      if (!silent) {
        toast.error(error instanceof Error ? error.message : "Failed to load conversations");
      }
    }
  }, [selectedAgencyId, selectedType, setSearchParams]);

  const CLIENT_MSG_PAGE_SIZE = 50;

  const loadMessages = useCallback(async (silent = false) => {
    // Reset pagination on each fresh load (conversation switch or refresh)
    setHasMoreOlder(false);
    justPrependedRef.current = false;
    isNearBottomRef.current = true;
    const abortCtrl = new AbortController();
    const timeoutId = window.setTimeout(() => abortCtrl.abort(), 12_000);
    try {
      if (!silent) setIsLoading(true);
      setErrorMessage("");
      const response = await clientFetch(`/api/chats/client?${qs}&limit=${CLIENT_MSG_PAGE_SIZE}`, { signal: abortCtrl.signal });
      const data = (await response.json().catch(() => ({}))) as {
        messages?: ChatMessage[];
        error?: string;
      };
      if (!response.ok || !data.messages) {
        throw new Error(data.error || "Failed to load chat");
      }
      const sorted = [...data.messages].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
      setHasMoreOlder(sorted.length >= CLIENT_MSG_PAGE_SIZE);
      const signature = JSON.stringify(sorted.map((message) => [message.id, message.message, message.createdAt, message.senderRole]));
      if (signature !== lastSigRef.current) {
        lastSigRef.current = signature;
        setMessages(sorted);
      }
    } catch (error) {
      const message = (error as { name?: string }).name === "AbortError"
        ? "Server is not responding. Please try again."
        : error instanceof Error ? error.message : "Failed to load chat";
      setErrorMessage(message);
      if (!silent) toast.error(message);
    } finally {
      window.clearTimeout(timeoutId);
      if (!silent) setIsLoading(false);
    }
  }, [qs]);

  const loadOlderMessages = useCallback(async () => {
    if (isLoadingOlder || !hasMoreOlder || messages.length === 0) return;
    const oldestId = messages.reduce((min, m) => Math.min(min, m.id), messages[0].id);
    const container = scrollRef.current;
    const previousHeight = container?.scrollHeight ?? 0;
    setIsLoadingOlder(true);
    try {
      const response = await clientFetch(`/api/chats/client?${qs}&before=${oldestId}&limit=${CLIENT_MSG_PAGE_SIZE}`);
      const data = (await response.json().catch(() => ({}))) as { messages?: ChatMessage[]; error?: string };
      if (!response.ok || !data.messages || data.messages.length === 0) return;
      setHasMoreOlder(data.messages.length >= CLIENT_MSG_PAGE_SIZE);
      justPrependedRef.current = true;
      setMessages((prev) => {
        const seen = new Set(prev.map((m) => m.id));
        const older = data.messages!.filter((m) => !seen.has(m.id));
        if (older.length === 0) return prev;
        const merged = [...older, ...prev].sort(
          (l, r) => new Date(l.createdAt).getTime() - new Date(r.createdAt).getTime(),
        );
        lastSigRef.current = JSON.stringify(merged.map((m) => [m.id, m.message, m.createdAt, m.senderRole]));
        return merged;
      });
      requestAnimationFrame(() => {
        const el = scrollRef.current;
        if (el) el.scrollTop = el.scrollHeight - previousHeight;
      });
    } catch {
      /* keep existing messages on failure */
    } finally {
      setIsLoadingOlder(false);
    }
  }, [hasMoreOlder, isLoadingOlder, messages, qs]);

  const handleMessagesScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    isNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (el.scrollTop < 80 && hasMoreOlder && !isLoadingOlder) {
      void loadOlderMessages();
    }
  }, [hasMoreOlder, isLoadingOlder, loadOlderMessages]);

  useEffect(() => {
    void loadChatbotConfig();
  }, [loadChatbotConfig]);

  // Keep the employer's presence current while the support chat is open.
  // The agency inbox uses this heartbeat to render the green online indicator.
  useEffect(() => {
    const sendHeartbeat = () => {
      if (document.visibilityState !== "visible") return;
      void clientFetch(`/api/chats/client/heartbeat?${qs}`, {
        method: "POST",
        keepalive: true,
      }).catch(() => {});
    };

    sendHeartbeat();
    const interval = window.setInterval(sendHeartbeat, 20_000);
    document.addEventListener("visibilitychange", sendHeartbeat);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", sendHeartbeat);
    };
  }, [qs]);

  useEffect(() => {
    let cancelled = false;
    const boot = async () => {
      const ok = await hasActiveClientSession();
      if (!ok) {
        if (!cancelled) navigate("/employer-login");
        return;
      }
      await syncClientProfileFromSession();
      lastSigRef.current = "";
      if (!cancelled) {
        void loadConversations(false);
        void loadMessages(false);
      }
    };
    void boot();
    return () => {
      cancelled = true;
    };
  }, [loadConversations, loadMessages, navigate]);

  useEffect(() => {
    const controller = new AbortController();
    let lastId = 0;

    const run = async () => {
      try {
        const token = await primeClientAuth();
        if (!token) {
          navigate("/employer-login");
          return;
        }
        const response = await clientFetch("/api/chats/client/last-id", { signal: controller.signal });
        const data = (await response.json().catch(() => ({}))) as { lastId?: number };
        if (response.ok && typeof data.lastId === "number") lastId = data.lastId;
      } catch {
        // ignore cursor bootstrap failures
      }

      while (!controller.signal.aborted) {
        try {
          const token = await primeClientAuth();
          if (!token) {
            navigate("/employer-login");
            return;
          }
          await streamSse(`/api/chats/client/stream?all=1&afterId=${lastId}`, {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
            onEvent: (event) => {
              if (event.event !== "message" || !event.data) return;
              const payload = JSON.parse(event.data) as { message?: ChatMessage };
              const next = payload.message;
              if (!next) return;
              lastId = Math.max(lastId, next.id);

              const current = activeConvRef.current;
              const isActive =
                current.conversationType === next.conversationType &&
                (current.conversationType === "support" || current.agencyId === next.agencyId);

              if (isActive) {
                // Skip if already added optimistically
                if (optimisticIdsRef.current.has(next.id)) {
                  optimisticIdsRef.current.delete(next.id);
                } else {
                  setMessages((prev) => (prev.some((message) => message.id === next.id) ? prev : [...prev, next]));
                }
                // AI reply arrived — hide typing indicator
                if (next.senderRole === "agency") {
                  setIsBotTyping(false);
                  if (botReplyTimerRef.current !== null) {
                    window.clearTimeout(botReplyTimerRef.current);
                    botReplyTimerRef.current = null;
                  }
                }
              }
              void loadConversations(true);
            },
          });
        } catch {
          if (controller.signal.aborted) return;
          await new Promise((resolve) => window.setTimeout(resolve, 1200));
        }
      }
    };

    void run();
    return () => controller.abort();
  }, [loadConversations, loadMessages, navigate]);

  useEffect(() => {
    lastSigRef.current = "";
    void loadMessages(false);
  }, [loadMessages]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (justPrependedRef.current) { justPrependedRef.current = false; return; }
    if (isNearBottomRef.current) el.scrollTop = el.scrollHeight;
    if (el.scrollHeight <= el.clientHeight && hasMoreOlder && !isLoadingOlder) {
      void loadOlderMessages();
    }
  }, [messages, isBotTyping, hasMoreOlder, isLoadingOlder, loadOlderMessages]);

  useEffect(() => () => {
    if (botReplyTimerRef.current !== null) {
      window.clearTimeout(botReplyTimerRef.current);
    }
  }, []);

  const autoResize = () => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, 130)}px`;
  };

  const sendMessage = async (override?: string) => {
    const text = (override ?? draft).trim();
    if (!text || isSending) return;

    try {
      setIsSending(true);
      const response = await clientFetch(`/api/chats/client?${qs}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        message?: ChatMessage;
        error?: string;
      };
      if (!response.ok || !data.message) {
        throw new Error(data.error || "Failed to send");
      }

      setMessages((prev) => {
        const next = [...prev, data.message!];
        lastSigRef.current = JSON.stringify(
          next.map((message) => [message.id, message.message, message.createdAt, message.senderRole]),
        );
        // Track this ID so SSE doesn't double-add it
        optimisticIdsRef.current.add(data.message!.id);
        return next;
      });
      setConversations((prev) =>
        prev.map((conversation) =>
          conversation.key === activeConv.key
            ? {
                ...conversation,
                lastMessage: data.message!.message,
                lastMessageAt: data.message!.createdAt,
              }
            : conversation,
        ),
      );
      if (override === undefined || draft.trim() === text) {
        setDraft("");
      }
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
      void loadConversations(true);

      // Trigger bot reply for support conversations
      if (chatbotEnabled && activeConv.conversationType === "support") {
        if (botReplyTimerRef.current !== null) window.clearTimeout(botReplyTimerRef.current);
        setIsBotTyping(true);
        const bot = getBotReply(text, chatbotConfig, {
          clientName: client?.name,
          agencyName: activeConv.agencyName || activeConv.title,
          history: [...messages, data.message!],
          selectedTopic,
        });
        if (bot) {
          botReplyTimerRef.current = window.setTimeout(async () => {
            setIsBotTyping(false);
            try {
              await clientFetch(`/api/chats/client/bot-reply?${qs}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: bot.text, senderName: chatbotConfig.botName }),
              });
            } catch {
              // bot reply failure is non-fatal
            }
          }, bot.delay);
        } else {
          botReplyTimerRef.current = window.setTimeout(() => setIsBotTyping(false), 30_000);
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send");
    } finally {
      setIsSending(false);
    }
  };

  const selectConversation = (conversation: ClientConversation) => {
    const params = new URLSearchParams();
    params.set("type", conversation.conversationType);
    if (conversation.conversationType === "agency" && conversation.agencyId) {
      params.set("agencyId", String(conversation.agencyId));
      params.set("agencyName", conversation.agencyName || "Agency");
    }
    setSearchParams(params);
    setSidebarOpen(false);
  };

  const totalUnread = conversations.reduce((sum, conversation) => sum + conversation.unreadCount, 0);
  const conversationType = activeConv.conversationType;

  return (
    <div className="sc">
      <style>{CSS}</style>

      {/* Guide modal — shown on first visit, re-openable via ? button */}
      {showGuide && <GuideModal onDismiss={dismissGuide} />}

      <nav className="sc-nav">
        <div className="sc-nav-brand">
          <div className="sc-nav-icon"><MessageCircle size={17} color="#fff" /></div>
          <div>
            <div className="sc-nav-title">Support Messages</div>
            {totalUnread > 0 && (
              <div className="sc-nav-unread">
                {totalUnread} unread message{totalUnread !== 1 ? "s" : ""}
              </div>
            )}
          </div>
        </div>
        <div className="sc-nav-right">
          {/* ? button — always visible so users can reopen the guide anytime */}
          <button
            className="sc-help-btn"
            onClick={() => setShowGuide(true)}
            aria-label="Open help guide"
            title="How to use this chat"
          >
            <HelpCircle size={16} />
          </button>
        </div>
      </nav>

      {!chatbotEnabled && (
        <div className="sc-banner">
          <AlertCircle size={15} style={{ flexShrink: 0 }} />
          <span>Automatic chatbot replies are turned off. You can still message the agency team directly.</span>
        </div>
      )}

      <div className="sc-body">
        <div
          className={`sc-overlay${sidebarOpen ? " visible" : ""}`}
          onClick={() => setSidebarOpen(false)}
        />

        <aside className={`sc-sidebar${sidebarOpen ? " open" : ""}`}>
          <div className="sc-sidebar-hdr">
            <div className="sc-sidebar-label">Conversations</div>
            <div className="sc-searchbox">
              <Search size={13} color="var(--sc-text3)" />
              <input
                type="text"
                placeholder="Search chats..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>

          <div className="sc-conv-list">
            {filteredConversations.length === 0 && (
              <div style={{ padding: "24px 12px", textAlign: "center", fontSize: 13, color: "var(--sc-text3)" }}>
                No conversations yet.
              </div>
            )}

            {filteredConversations.map((conversation) => {
              const isActive =
                conversation.conversationType === activeConv.conversationType &&
                (conversation.conversationType === "support" || conversation.agencyId === activeConv.agencyId);

              return (
                <div
                  key={conversation.key}
                  className={`sc-conv-item${isActive ? " active" : ""}`}
                  onClick={() => selectConversation(conversation)}
                >
                  <ChatAvatar
                    imageUrl={conversation.agencyProfileImageUrl}
                    alt={conversation.title}
                    fallback={conversation.conversationType === "agency" ? "🏢" : "💬"}
                    className={`sc-conv-av ${conversation.conversationType}`}
                  />
                  <div className="sc-conv-info">
                    <div className="sc-conv-name">{conversation.title}</div>
                    <div className="sc-conv-meta">
                      <span className="sc-conv-badge">{getConversationBadgeLabel(conversation)}</span>
                    </div>
                    <div className="sc-conv-preview">{sanitizeConversationPreview(conversation.lastMessage || conversation.description)}</div>
                  </div>
                  {conversation.unreadCount > 0 && <div className="sc-unread">{conversation.unreadCount}</div>}
                </div>
              );
            })}
          </div>

          <div className="sc-stats">
            <div className="sc-stat">
              <div className="sc-stat-lbl">Chats</div>
              <div className="sc-stat-val">{conversations.length}</div>
            </div>
            <div className="sc-stat">
              <div className="sc-stat-lbl">Unread</div>
              <div className={`sc-stat-val${totalUnread > 0 ? " green" : ""}`}>{totalUnread}</div>
            </div>
            <div className="sc-stat">
              <div className="sc-stat-lbl">You</div>
              <div className="sc-stat-val" style={{ fontSize: 12 }}>
                {(client?.name || "Client").split(" ")[0]}
              </div>
            </div>
          </div>
        </aside>

        <main className="sc-main">
          <div className="sc-chat-hdr">
            <button className="sc-back-btn" onClick={() => setSidebarOpen(true)} aria-label="Open conversations">
              <ChevronLeft size={18} />
            </button>
            <ChatAvatar
              imageUrl={activeConv.agencyProfileImageUrl}
              alt={activeConv.title}
              fallback={conversationType === "agency" ? "🏢" : "💬"}
              className={`sc-chat-av ${conversationType}`}
            />
            <div className="sc-chat-info">
              <div className="sc-chat-name">{activeConv.title}</div>
              <div className="sc-chat-desc">{`${getConversationBadgeLabel(activeConv)} · ${activeConv.description}`}</div>
            </div>
          </div>

          {topics.length > 0 && (
            <TopicPicker
              topics={topics}
              selectedId={selectedTopic?.id ?? null}
              onSelect={(topic) => {
                setSelectedTopic(topic);
                if (topic.suggestedMessage?.trim()) {
                  void sendMessage(topic.suggestedMessage);
                  return;
                }
                setDraft("");
                window.setTimeout(() => textareaRef.current?.focus(), 60);
              }}
            />
          )}

          <div className="sc-msgs" ref={scrollRef} onScroll={handleMessagesScroll}>
            {isLoading ? (
              <>
                <div style={{ height: 46, width: "52%", borderRadius: 14, background: "#f0f1f3" }} />
                <div style={{ height: 46, width: "65%", alignSelf: "flex-end", borderRadius: 14, background: "#f0f1f3" }} />
              </>
            ) : errorMessage ? (
              <div className="sc-error-banner">
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                {errorMessage}
              </div>
            ) : messages.length === 0 ? (
              <div className="sc-empty">
                <div className="sc-empty-icon">{topics.length > 0 ? "📋" : "💬"}</div>
                <div className="sc-empty-lbl">
                  {topics.length > 0 ? "Select a topic above or type your message below." : "Start the conversation below."}
                </div>
                <div className="sc-empty-sub">Messages appear in real time.</div>
              </div>
            ) : (
              <>
                {hasMoreOlder && (
                  <button
                    className="sc-load-earlier"
                    onClick={() => void loadOlderMessages()}
                    disabled={isLoadingOlder}
                  >
                    {isLoadingOlder ? "Loading…" : "⬆ Load earlier messages"}
                  </button>
                )}
                {messages.map((message) => (
                  <MessageBubble key={message.id} message={message} isOwn={message.senderRole === "client"} />
                ))}
              </>
            )}

            {isBotTyping && (
              <div className="sc-msg-row">
                <ChatAvatar
                  imageUrl={activeConv.agencyProfileImageUrl}
                  alt={chatbotConfig.botName || "Support Bot"}
                  fallback="🤖"
                  className="sc-msg-avi"
                />
                <div className="sc-msg-col">
                  <div className="sc-msg-sender">AI Support</div>
                  <div className="sc-typing-bubble">
                    <div className="sc-typing-dot" />
                    <div className="sc-typing-dot" />
                    <div className="sc-typing-dot" />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="sc-compose">
            {selectedTopic && (
              <div className="sc-topic-tag">
                {selectedTopic.icon} {selectedTopic.label}
                <button onClick={() => setSelectedTopic(null)} aria-label="Remove topic">
                  <X size={13} />
                </button>
              </div>
            )}
            <div className="sc-compose-box">
              <textarea
                ref={textareaRef}
                rows={1}
                placeholder={selectedTopic ? `Message about: ${selectedTopic.label}...` : `Message ${activeConv.title}...`}
                value={draft}
                onChange={(event) => {
                  setDraft(event.target.value);
                  autoResize();
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void sendMessage();
                  }
                }}
              />
              <button
                className="sc-send-btn"
                disabled={!draft.trim() || isSending}
                onClick={() => void sendMessage()}
                aria-label="Send message"
              >
                <Send size={16} />
              </button>
            </div>
            <div className="sc-compose-hint">Enter to send · Shift+Enter for new line</div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ClientSupportChat;
