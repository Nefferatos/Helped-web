import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Bot,
  ChevronLeft,
  CheckCircle,
  HelpCircle,
  MessageCircle,
  Search,
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
  SupportConversationStatus,
} from "@/lib/chat";
import { streamSse } from "@/lib/sse";
import {
  clientFetch,
  hasActiveClientSession,
  primeClientAuth,
  syncClientProfileFromSession,
} from "@/lib/supabaseAuth";
import "./ClientTheme.css";

type TopicOption = AgencyChatbotTopicOption;
const MAIN_MENU_TOPIC_ID = "__main_menu__";
const GUIDE_STORAGE_KEY = "sc_guide_dismissed";

const defaultConversation: ClientConversation = {
  key: "support:1",
  clientId: 0,
  conversationType: "support",
  agencyId: 1,
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
    "Hi {{name}}, thanks for your message. Could you share a little more detail so I can help you with the next step? For further assistance, contact us on WhatsApp at +65 80730757.",
  fallbackLongResponse:
    "Hi {{name}}, thanks for reaching out. I've noted your message. If you can share the main details here, I'll help make sure it is clear for the team to follow up. For further assistance, contact us on WhatsApp at +65 80730757.",
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

const createQuickReplyTopic = (
  id: string,
  label: string,
  icon: string,
  suggestedMessage: string,
  description = "",
): TopicOption => ({
  id,
  label,
  icon,
  description,
  suggestedMessage,
  enabled: true,
});

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

const getTopicFollowUps = (topic: TopicOption): TopicOption[] => {
  switch (detectTopicIntent(topic)) {
    case "placement":
      return [
        createQuickReplyTopic("placement-status", "Current status", "📍", "Can you check my current placement status?"),
        createQuickReplyTopic("placement-next", "Next update", "⏭️", "What is the next update or next step for my request?"),
        createQuickReplyTopic("placement-docs", "Documents needed", "🗂️", "Are there any documents you still need from me for this request?"),
      ];
    case "schedule":
      return [
        createQuickReplyTopic("schedule-change", "Change timing", "🕒", "I want to request a change of date or timing."),
        createQuickReplyTopic("schedule-availability", "Check availability", "📅", "Can you check the available dates and times for me?"),
        createQuickReplyTopic("schedule-confirm", "Confirm next slot", "✅", "Please confirm the next available slot for this arrangement."),
      ];
    case "billing":
      return [
        createQuickReplyTopic("billing-invoice", "Invoice details", "🧾", "Can you explain the invoice or billing breakdown for me?"),
        createQuickReplyTopic("billing-payment", "Payment status", "💳", "Can you check whether my payment has been received or is still pending?"),
        createQuickReplyTopic("billing-fees", "Agency fees", "🏷️", "Can you clarify which agency fees or charges apply here?"),
      ];
    case "concern":
      return [
        createQuickReplyTopic("concern-report", "Report issue", "📝", "I want to report an issue with more details."),
        createQuickReplyTopic("concern-urgent", "Urgent support", "🚨", "This concern feels urgent and I need support as soon as possible."),
        createQuickReplyTopic("concern-escalate", "Escalate case", "⬆️", "Please help escalate this concern to the right person."),
      ];
    case "renewal":
      return [
        createQuickReplyTopic("renewal-process", "Renewal process", "🔁", "Can you guide me through the renewal process?"),
        createQuickReplyTopic("renewal-timeline", "Renewal timeline", "⏱️", "When should I start the renewal and what is the timeline?"),
        createQuickReplyTopic("renewal-docs", "Renewal documents", "📄", "What documents are needed for the renewal?"),
      ];
    case "documents":
      return [
        createQuickReplyTopic("docs-required", "Required documents", "📄", "What documents are required from me?"),
        createQuickReplyTopic("docs-submitted", "Submitted already", "📤", "I have already submitted some documents. Can you check what is still missing?"),
        createQuickReplyTopic("docs-next", "Next step", "➡️", "After the documents are submitted, what is the next step?"),
      ];
    default:
      return [
        createQuickReplyTopic("general-help", "General help", "💬", "I need general help with my request."),
        createQuickReplyTopic("general-followup", "Follow up", "🔎", "I want to follow up on my earlier message."),
        createQuickReplyTopic("general-agent", "Need human support", "🙋", "I would like a team member to review this."),
      ];
  }
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

const getSupportStatusLabel = (status?: SupportConversationStatus) => {
  switch (status) {
    case "WAITING_CLIENT":
      return "Waiting for you";
    case "WAITING_SUPPORT":
      return "Waiting for support";
    case "RESOLVED":
      return "Resolved";
    case "CLOSED":
      return "Closed";
    default:
      return "Open";
  }
};

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
*, *::before, *::after { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }

/* ── Root layout ── */
.sc { display:flex; flex-direction:column; height:100dvh; background:#f7f8fa; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; overflow:hidden; }

/* ── Top nav (conversations list page) ── */
.sc-nav { height:56px; background:#fff; border-bottom:1px solid #e8eaed; display:flex; align-items:center; justify-content:space-between; padding:0 18px; flex-shrink:0; }
.sc-nav-brand { display:flex; align-items:center; gap:10px; }
.sc-nav-icon { width:34px; height:34px; border-radius:10px; background:#1D9E75; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.sc-nav-title { font-size:15px; font-weight:700; color:#111; }
.sc-nav-unread { font-size:11px; color:#1D9E75; font-weight:600; margin-top:1px; }
.sc-nav-right { display:flex; align-items:center; gap:8px; }
.sc-status-pill { display:inline-flex; align-items:center; gap:5px; border-radius:99px; padding:5px 11px; font-size:12px; font-weight:600; border:1px solid; }
.sc-status-pill.online { background:#edfaf4; color:#0c6e4f; border-color:#a3e4c8; }
.sc-status-pill.offline { background:#fff0f0; color:#c0392b; border-color:#f5b4b4; }
.sc-status-dot { width:6px; height:6px; border-radius:50%; flex-shrink:0; }
.sc-status-dot.online { background:#1D9E75; }
.sc-status-dot.offline { background:#e74c3c; }
.sc-help-btn { width:32px; height:32px; border-radius:50%; border:1.5px solid #e8eaed; background:#f9fafb; color:#6b7280; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:background .15s; }
.sc-help-btn:hover { background:#e8eaed; }
.sc-banner { display:flex; align-items:center; gap:10px; padding:10px 18px; font-size:13px; font-weight:500; border-bottom:1px solid #f5b4b4; background:#fff0f0; color:#c0392b; }

/* ── Body split ── */
.sc-body { display:flex; flex:1; overflow:hidden; min-height:0; position:relative; }
.sc-overlay { display:none; position:absolute; inset:0; background:rgba(0,0,0,.45); z-index:24; }
.sc-overlay.visible { display:block; }

/* ── Sidebar (conversation list) ── */
.sc-sidebar { width:272px; min-width:272px; background:#fff; border-right:1px solid #e8eaed; display:flex; flex-direction:column; overflow:hidden; flex-shrink:0; z-index:25; transition:transform .24s cubic-bezier(.4,0,.2,1); }
.sc-sidebar-hdr { padding:14px 12px 10px; border-bottom:1px solid #e8eaed; flex-shrink:0; }
.sc-sidebar-label { font-size:11px; font-weight:700; color:#9ca3af; text-transform:uppercase; letter-spacing:.06em; margin-bottom:8px; }
.sc-searchbox { display:flex; align-items:center; gap:7px; background:#f3f4f6; border-radius:9px; padding:7px 11px; border:1px solid transparent; }
.sc-searchbox:focus-within { background:#fff; border-color:#a3e4c8; }
.sc-searchbox input { border:none; outline:none; background:transparent; font-size:13px; color:#111; flex:1; min-width:0; }
.sc-searchbox input::placeholder { color:#b0b7c3; }
.sc-conv-list { flex:1; overflow-y:auto; padding:6px; }
.sc-conv-item { display:flex; align-items:center; gap:10px; padding:10px 8px; border-radius:10px; cursor:pointer; margin-bottom:2px; transition:background .12s; }
.sc-conv-item:hover:not(.active) { background:#f7f8fa; }
.sc-conv-item.active { background:#edfaf4; }
.sc-conv-av { width:40px; height:40px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:17px; flex-shrink:0; overflow:hidden; }
.sc-conv-av.support { background:#edfaf4; }
.sc-conv-av.agency { background:#eff6ff; }
.sc-conv-av img { width:100%; height:100%; object-fit:cover; }
.sc-conv-info { flex:1; min-width:0; }
.sc-conv-name { font-size:14px; font-weight:700; color:#111; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.sc-conv-meta { display:flex; align-items:center; gap:5px; margin-top:3px; }
.sc-conv-badge { display:inline-flex; align-items:center; border-radius:999px; background:#edfaf4; color:#0c6e4f; border:1px solid #a3e4c8; padding:1px 7px; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.05em; }
.sc-conv-preview { font-size:12px; color:#6b7280; line-height:1.4; margin-top:4px; display:-webkit-box; -webkit-line-clamp:1; -webkit-box-orient:vertical; overflow:hidden; }
.sc-unread { min-width:20px; height:20px; background:#1D9E75; color:#fff; border-radius:99px; font-size:11px; font-weight:700; display:flex; align-items:center; justify-content:center; padding:0 5px; flex-shrink:0; }
.sc-stats { display:grid; grid-template-columns:repeat(3,1fr); border-top:1px solid #e8eaed; flex-shrink:0; }
.sc-stat { padding:9px 6px; text-align:center; border-right:1px solid #e8eaed; }
.sc-stat:last-child { border-right:none; }
.sc-stat-lbl { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:#b0b7c3; }
.sc-stat-val { font-size:15px; font-weight:700; color:#111; margin-top:2px; }
.sc-stat-val.green { color:#1D9E75; }

/* ── Main chat panel ── */
.sc-main { flex:1; display:flex; flex-direction:column; overflow:hidden; min-width:0; background:#fff; }

/* ── Chat header — Messenger/Sendbird style ── */
.sc-chat-hdr { background:#fff; border-bottom:1px solid #f0f0f0; padding:10px 14px; display:flex; align-items:center; gap:10px; flex-shrink:0; min-height:58px; }
.sc-back-btn { display:none; width:34px; height:34px; border-radius:50%; background:#f5f5f5; border:none; cursor:pointer; align-items:center; justify-content:center; color:#555; flex-shrink:0; }
.sc-chat-av { width:38px; height:38px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:18px; flex-shrink:0; overflow:hidden; position:relative; }
.sc-chat-av.support { background:#edfaf4; }
.sc-chat-av.agency { background:#eff6ff; }
.sc-chat-av img { width:100%; height:100%; object-fit:cover; }
.sc-chat-av-online { position:absolute; bottom:1px; right:1px; width:10px; height:10px; border-radius:50%; background:#1D9E75; border:2px solid #fff; }
.sc-chat-info { flex:1; min-width:0; }
.sc-chat-name { font-size:15px; font-weight:700; color:#111; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; line-height:1.2; }
.sc-chat-status { font-size:12px; color:#1D9E75; margin-top:2px; font-weight:500; }
.sc-hdr-actions { display:flex; align-items:center; gap:4px; margin-left:auto; }
.sc-hdr-btn { width:34px; height:34px; border-radius:50%; border:none; background:transparent; color:#6b7280; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:background .15s; }
.sc-hdr-btn:hover { background:#f3f4f6; }

/* ── Hidden elements from old design ── */
.sc-topics { display:none; }
.sc-chips-wrap { display:none; }
.sc-online-tag { display:none; }

/* ── Date separator ── */
.sc-date-sep { display:flex; align-items:center; gap:10px; padding:6px 0; }
.sc-date-sep-line { flex:1; height:1px; background:#f0f0f0; }
.sc-date-sep-lbl { font-size:11px; color:#b0b7c3; font-weight:500; white-space:nowrap; }

/* ── Messages area ── */
.sc-msgs { flex:1; overflow-y:auto; padding:14px 16px; display:flex; flex-direction:column; gap:6px; background:#fff; }
.sc-empty { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#b0b7c3; text-align:center; gap:10px; padding:40px 20px; }
.sc-empty-icon { width:58px; height:58px; border-radius:18px; background:#f3f4f6; display:flex; align-items:center; justify-content:center; font-size:24px; }
.sc-empty-lbl { font-size:14px; font-weight:600; color:#6b7280; }
.sc-empty-sub { font-size:12px; color:#b0b7c3; }
.sc-error-banner { display:flex; align-items:center; gap:8px; background:#fff0f0; border:1px solid #f5b4b4; border-radius:10px; padding:12px 14px; font-size:13px; color:#c0392b; font-weight:500; }

/* ── Message rows ── */
.sc-msg-row { display:flex; gap:8px; align-items:flex-end; max-width:100%; }
.sc-msg-row.own { flex-direction:row-reverse; }
.sc-msg-avi { width:28px; height:28px; border-radius:50%; background:#e8eaed; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; color:#555; flex-shrink:0; overflow:hidden; align-self:flex-end; }
.sc-msg-avi img { width:100%; height:100%; object-fit:cover; }
.sc-msg-row.own .sc-msg-avi { display:none; }
.sc-msg-col { display:flex; flex-direction:column; max-width:72%; }
.sc-msg-row.own .sc-msg-col { align-items:flex-end; max-width:72%; }
.sc-msg-sender { font-size:11px; font-weight:600; color:#9ca3af; margin-bottom:2px; padding-left:4px; }

/* Bubbles — Messenger style */
.sc-bubble { padding:10px 14px; border-radius:20px; font-size:14px; line-height:1.55; word-break:break-word; }
.sc-msg-row.own .sc-bubble { background:#1D9E75; color:#fff; border-bottom-right-radius:4px; }
.sc-msg-row:not(.own) .sc-bubble { background:#f0f0f0; color:#111; border-bottom-left-radius:4px; }

/* consecutive same-sender: flatten inner corners */
.sc-msg-row.own + .sc-msg-row.own .sc-bubble { border-top-right-radius:4px; border-bottom-right-radius:4px; }
.sc-msg-row:not(.own) + .sc-msg-row:not(.own) .sc-bubble { border-top-left-radius:4px; border-bottom-left-radius:4px; }

.sc-msg-time { font-size:10px; color:#b0b7c3; margin-top:3px; padding:0 4px; }
.sc-msg-row.own .sc-msg-time { text-align:right; }

/* Typing bubble */
.sc-typing-bubble { display:inline-flex; align-items:center; gap:4px; background:#f0f0f0; border-radius:20px; border-bottom-left-radius:4px; padding:12px 16px; }
.sc-typing-dot { width:7px; height:7px; border-radius:50%; background:#aaa; animation:sc-typing 1.3s ease-in-out infinite; }
.sc-typing-dot:nth-child(2) { animation-delay:.18s; }
.sc-typing-dot:nth-child(3) { animation-delay:.36s; }
@keyframes sc-typing { 0%,60%,100%{transform:translateY(0);opacity:.4} 30%{transform:translateY(-5px);opacity:1} }

/* ── Messenger-style quick reply pills ── */
.sc-quick-replies { display:flex; flex-wrap:wrap; gap:8px; padding:6px 0 4px 36px; align-self:flex-start; }
.sc-quick-reply-btn { display:inline-flex; align-items:center; gap:6px; border:1.5px solid #1D9E75; background:#fff; color:#0c6e4f; border-radius:999px; padding:7px 16px; font-size:13px; font-weight:600; cursor:pointer; transition:all .15s; white-space:nowrap; }
.sc-quick-reply-btn:hover { background:#edfaf4; }

/* ── Compose bar — Messenger style ── */
.sc-compose { background:#fff; border-top:1px solid #f0f0f0; padding:8px 12px; display:flex; align-items:flex-end; gap:8px; flex-shrink:0; }
.sc-compose-left { display:flex; align-items:center; gap:4px; flex-shrink:0; padding-bottom:6px; }
.sc-compose-icon-btn { width:32px; height:32px; border-radius:50%; border:none; background:transparent; color:#9ca3af; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:color .15s; }
.sc-compose-icon-btn:hover { color:#1D9E75; }
.sc-compose-box { flex:1; display:flex; align-items:flex-end; background:#f5f5f5; border-radius:22px; padding:8px 14px; border:1.5px solid transparent; transition:border-color .15s, background .15s; }
.sc-compose-box:focus-within { border-color:#a3e4c8; background:#fff; }
.sc-compose-box textarea { flex:1; border:none; outline:none; background:transparent; resize:none; font-size:14px; color:#111; line-height:1.5; min-height:22px; max-height:120px; font-family:inherit; padding:0; }
.sc-compose-box textarea::placeholder { color:#b0b7c3; }
.sc-send-btn { width:36px; height:36px; border-radius:50%; background:#1D9E75; border:none; display:flex; align-items:center; justify-content:center; cursor:pointer; flex-shrink:0; color:#fff; transition:background .15s, transform .1s; margin-bottom:1px; }
.sc-send-btn:hover { background:#178a64; transform:scale(1.05); }
.sc-send-btn:disabled { background:#d1d5db; cursor:not-allowed; transform:none; }
.sc-topic-tag { display:none; }
.sc-compose-hint { display:none; }

/* ── Guide modal ── */
.sc-guide-backdrop { position:fixed; inset:0; background:rgba(0,0,0,.55); z-index:200; display:flex; align-items:flex-end; justify-content:center; padding:0; animation:sc-guide-fade .22s ease; }
@media (min-width:520px) { .sc-guide-backdrop { align-items:center; padding:20px; } }
@keyframes sc-guide-fade { from{opacity:0} to{opacity:1} }
.sc-guide-sheet { background:#fff; border-radius:24px 24px 0 0; width:100%; max-width:460px; padding:28px 24px 32px; display:flex; flex-direction:column; gap:0; box-shadow:0 -4px 40px rgba(0,0,0,.18); animation:sc-guide-up .28s cubic-bezier(.34,1.46,.64,1); }
@media (min-width:520px) { .sc-guide-sheet { border-radius:24px; animation:sc-guide-pop .28s cubic-bezier(.34,1.46,.64,1); } }
@keyframes sc-guide-up { from{transform:translateY(60px);opacity:0} to{transform:translateY(0);opacity:1} }
@keyframes sc-guide-pop { from{transform:scale(.92);opacity:0} to{transform:scale(1);opacity:1} }
.sc-guide-close { position:absolute; top:16px; right:16px; width:32px; height:32px; border-radius:50%; border:none; background:#f3f4f6; color:#6b7280; display:flex; align-items:center; justify-content:center; cursor:pointer; }
.sc-guide-close:hover { background:#e5e7eb; }
.sc-guide-emoji { font-size:44px; line-height:1; margin-bottom:14px; display:block; text-align:center; }
.sc-guide-title { font-size:20px; font-weight:800; color:#111; text-align:center; margin-bottom:8px; }
.sc-guide-body { font-size:15px; color:#4b5563; line-height:1.65; text-align:center; margin-bottom:24px; min-height:72px; }
.sc-guide-dots { display:flex; justify-content:center; gap:7px; margin-bottom:22px; }
.sc-guide-dot { width:8px; height:8px; border-radius:50%; background:#e5e7eb; transition:background .2s,transform .2s; }
.sc-guide-dot.active { background:#1D9E75; transform:scale(1.25); }
.sc-guide-actions { display:flex; gap:10px; }
.sc-guide-btn-skip { flex:1; padding:13px; border-radius:12px; border:1.5px solid #e5e7eb; background:#fff; font-size:14px; font-weight:600; color:#6b7280; cursor:pointer; }
.sc-guide-btn-skip:hover { background:#f9fafb; }
.sc-guide-btn-next { flex:2; padding:13px; border-radius:12px; border:none; background:#1D9E75; color:#fff; font-size:15px; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:7px; }
.sc-guide-btn-next:hover { background:#178a64; }
.sc-guide-btn-done { flex:1; padding:13px; border-radius:12px; border:none; background:#1D9E75; color:#fff; font-size:15px; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:7px; }
.sc-guide-btn-done:hover { background:#178a64; }
.sc-guide-progress { font-size:12px; color:#b0b7c3; text-align:center; margin-top:14px; }

/* ── Responsive ── */
@media (max-width:768px) {
  .sc-sidebar { position:absolute; top:0; left:0; bottom:0; width:82%; max-width:300px; transform:translateX(-100%); z-index:25; }
  .sc-sidebar.open { transform:translateX(0); box-shadow:8px 0 40px rgba(0,0,0,.18); }
  .sc-back-btn { display:flex !important; }
  .sc-nav { height:52px; padding:0 14px; }
  .sc-msgs { padding:10px 12px; }
  .sc-msg-col { max-width:80%; }
  .sc-msg-row.own .sc-msg-col { max-width:80%; }
  .sc-compose { padding:6px 10px; }
}
`;

// ─── Guide modal component ────────────────────────────────────────────────────

function GuideModal({ onDismiss }: { onDismiss: () => void }) {
  const [step, setStep] = useState(0);
  const current = GUIDE_STEPS[step];
  const isLast = step === GUIDE_STEPS.length - 1;

  return (
    <div className="sc-guide-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onDismiss(); }}>
      <div className="sc-guide-sheet" style={{ position: "relative" }}>
        <button className="sc-guide-close" onClick={onDismiss} aria-label="Close guide">
          <X size={15} />
        </button>

        <span className="sc-guide-emoji">{current.emoji}</span>
        <div className="sc-guide-title">{current.title}</div>
        <div className="sc-guide-body">{current.body}</div>

        <div className="sc-guide-dots">
          {GUIDE_STEPS.map((_, i) => (
            <div key={i} className={`sc-guide-dot${i === step ? " active" : ""}`} />
          ))}
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

        <div className="sc-guide-progress">
          Step {step + 1} of {GUIDE_STEPS.length}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

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

function QuickReplies({
  topics,
  onSelect,
}: {
  topics: TopicOption[];
  onSelect: (topic: TopicOption) => void;
}) {
  if (topics.length === 0) return null;
  return (
    <div className="sc-quick-replies">
      {topics.map((topic) => (
        <button
          key={topic.id}
          className="sc-quick-reply-btn"
          onClick={() => onSelect(topic)}
          type="button"
        >
          <span>{topic.icon}</span>
          <span>{topic.label}</span>
        </button>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const ClientSupportChat = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [conversations, setConversations] = useState<ClientConversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<TopicOption | null>(null);
  const [chatbotConfig, setChatbotConfig] = useState<AgencyChatbotConfig>(DEFAULT_CONFIG);

  // Guide: show on first visit, hide after dismiss, re-openable via ? button
  const [showGuide, setShowGuide] = useState(() => {
    try {
      return !localStorage.getItem(GUIDE_STORAGE_KEY);
    } catch {
      return true;
    }
  });

  const dismissGuide = () => {
    try { localStorage.setItem(GUIDE_STORAGE_KEY, "1"); } catch { /* ignore */ }
    setShowGuide(false);
  };

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const lastSigRef = useRef("");
  const activeConvRef = useRef<ClientConversation>(defaultConversation);
  const lastUnreadTotalRef = useRef(0);
  // Track IDs of messages we've already added optimistically so SSE doesn't double-add them
  const optimisticIdsRef = useRef<Set<number>>(new Set());

  const client = getStoredClient();

  const selectedType: ConversationType = searchParams.get("type") === "agency" ? "agency" : "support";
  const selectedAgencyId = selectedType === "agency" ? Number(searchParams.get("agencyId")) : undefined;

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
  const choiceTopics = useMemo(
    () => topics.filter((topic) => topic.id !== "other"),
    [topics],
  );
  const menuTopics = useMemo(() => {
    if (!selectedTopic || selectedTopic.id === "other") return choiceTopics;
    const followUps = getTopicFollowUps(selectedTopic);
    return [
      ...followUps,
      createQuickReplyTopic(MAIN_MENU_TOPIC_ID, "Main menu", "🏠", "", "Show all support topics"),
    ];
  }, [choiceTopics, selectedTopic]);
  const isBotTyping = false;
  const shouldShowTopicChoices =
    menuTopics.length > 0 &&
    (messages.length === 0 || messages[messages.length - 1]?.senderRole === "agency");

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

  const loadMessages = useCallback(async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      setErrorMessage("");
      const response = await clientFetch(`/api/chats/client?${qs}`);
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
      const signature = JSON.stringify(sorted.map((message) => [message.id, message.message, message.createdAt, message.senderRole]));
      if (signature !== lastSigRef.current) {
        lastSigRef.current = signature;
        setMessages(sorted);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load chat";
      setErrorMessage(message);
      if (!silent) toast.error(message);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [qs]);

  useEffect(() => {
    void loadChatbotConfig();
  }, [loadChatbotConfig]);

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
              }
              if (next.senderRole === "agency" && (!isActive || document.visibilityState !== "visible")) {
                toast.message(next.senderName, {
                  description: next.message.length > 90 ? `${next.message.slice(0, 90)}...` : next.message,
                });
                try {
                  const context = new (window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();
                  const oscillator = context.createOscillator();
                  const gainNode = context.createGain();
                  oscillator.type = "triangle";
                  oscillator.frequency.value = 720;
                  gainNode.gain.value = 0.03;
                  oscillator.connect(gainNode);
                  gainNode.connect(context.destination);
                  oscillator.start();
                  oscillator.stop(context.currentTime + 0.08);
                } catch {
                  // ignore sound errors
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
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    lastUnreadTotalRef.current = conversations.reduce((sum, conversation) => sum + conversation.unreadCount, 0);
  }, [conversations]);

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
          <div className={`sc-status-pill ${chatbotEnabled ? "online" : "offline"}`}>
            <Bot size={13} />
            <div className={`sc-status-dot ${chatbotEnabled ? "online" : "offline"}`} />
            {chatbotEnabled ? "Chatbot On" : "Chatbot Off"}
          </div>
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
              <Search size={13} color="#b0b7c3" />
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
              <div style={{ padding: "24px 12px", textAlign: "center", fontSize: 13, color: "#b0b7c3" }}>
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
            <div className={`sc-chat-av ${conversationType}`} style={{ position: "relative" }}>
              {activeConv.agencyProfileImageUrl
                ? <img src={activeConv.agencyProfileImageUrl} alt={activeConv.title} />
                : conversationType === "agency" ? "🏢" : "🤖"}
              {chatbotEnabled && <div className="sc-chat-av-online" />}
            </div>
            <div className="sc-chat-info">
              <div className="sc-chat-name">{activeConv.title}</div>
              <div className="sc-chat-status">{chatbotEnabled ? "We're online ..." : "Support team"}</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                <span className="sc-topic-selected-pill">{getSupportStatusLabel(activeConv.status)}</span>
                {activeConv.category && <span className="sc-topic-selected-pill">{activeConv.category}</span>}
                {activeConv.priority && <span className="sc-topic-selected-pill">{activeConv.priority}</span>}
              </div>
            </div>
            <div className="sc-hdr-actions">
              <button className="sc-hdr-btn" onClick={() => { void loadMessages(false); }} aria-label="Refresh chat" title="Refresh">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
              </button>
              <button className="sc-hdr-btn" onClick={() => setShowGuide(true)} aria-label="Help" title="Help">
                <HelpCircle size={17} />
              </button>
            </div>
          </div>


          <div className="sc-msgs" ref={scrollRef}>
            {isLoading ? (
              <>
                <div style={{ height: 42, width: "54%", borderRadius: 20, background: "#f0f0f0" }} />
                <div style={{ height: 42, width: "60%", alignSelf: "flex-end", borderRadius: 20, background: "#f0f0f0" }} />
                <div style={{ height: 42, width: "48%", borderRadius: 20, background: "#f0f0f0" }} />
              </>
            ) : errorMessage ? (
              <div className="sc-error-banner">
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                {errorMessage}
              </div>
            ) : messages.length === 0 ? (
              <div className="sc-empty">
                <div className="sc-empty-icon">💬</div>
                <div className="sc-empty-lbl">No messages yet</div>
                <div className="sc-empty-sub">Tap a quick reply below or type your message.</div>
              </div>
            ) : (
              <>
                <div className="sc-date-sep">
                  <div className="sc-date-sep-line" />
                  <div className="sc-date-sep-lbl">
                    {new Date(messages[0]?.createdAt || Date.now()).toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" })}
                  </div>
                  <div className="sc-date-sep-line" />
                </div>
                {messages.map((message) => (
                  <MessageBubble key={message.id} message={message} isOwn={message.senderRole === "client"} />
                ))}
              </>
            )}

            {shouldShowTopicChoices && (
              <QuickReplies
                topics={menuTopics}
                onSelect={(topic) => {
                  if (topic.id === MAIN_MENU_TOPIC_ID) {
                    setSelectedTopic(null);
                    return;
                  }
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

            {isBotTyping && (
              <div className="sc-msg-row">
                <ChatAvatar
                  imageUrl={activeConv.agencyProfileImageUrl}
                  alt={chatbotConfig.botName || "Support Bot"}
                  fallback="🤖"
                  className="sc-msg-avi"
                />
                <div className="sc-msg-col">
                  <div className="sc-msg-sender">{chatbotConfig.botName || "Support Bot"}</div>
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
            <div className="sc-compose-left">
              <button className="sc-compose-icon-btn" aria-label="Emoji" title="Emoji">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
              </button>
              <button className="sc-compose-icon-btn" aria-label="Attach" title="Attach file">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
              </button>
            </div>
            <div className="sc-compose-box">
              <textarea
                ref={textareaRef}
                rows={1}
                placeholder="Enter message"
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
            </div>
            <button
              className="sc-send-btn"
              disabled={!draft.trim() || isSending}
              onClick={() => void sendMessage()}
              aria-label="Send message"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ClientSupportChat;
