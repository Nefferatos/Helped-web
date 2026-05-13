import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Bot,
  ChevronDown,
  ChevronLeft,
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
const MAIN_MENU_TOPIC_ID = "__main_menu__";

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

const CSS = `
*, *::before, *::after { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
.sc { display:flex; flex-direction:column; height:100dvh; background:#f7f8fa; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; overflow:hidden; }
.sc-nav { height:58px; background:#fff; border-bottom:1px solid #e8eaed; display:flex; align-items:center; justify-content:space-between; padding:0 20px; flex-shrink:0; }
.sc-nav-brand { display:flex; align-items:center; gap:10px; }
.sc-nav-icon { width:36px; height:36px; border-radius:10px; background:#1D9E75; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.sc-nav-title { font-size:16px; font-weight:700; color:#111; }
.sc-nav-unread { font-size:12px; color:#1D9E75; font-weight:600; margin-top:1px; }
.sc-status-pill { display:inline-flex; align-items:center; gap:6px; border-radius:99px; padding:6px 13px; font-size:12px; font-weight:600; border:1px solid; min-height:34px; }
.sc-status-pill.online { background:#edfaf4; color:#0c6e4f; border-color:#a3e4c8; }
.sc-status-pill.offline { background:#fff0f0; color:#c0392b; border-color:#f5b4b4; }
.sc-status-dot { width:7px; height:7px; border-radius:50%; flex-shrink:0; }
.sc-status-dot.online { background:#1D9E75; }
.sc-status-dot.offline { background:#e74c3c; }
.sc-banner { display:flex; align-items:center; gap:10px; padding:11px 20px; font-size:13px; font-weight:500; border-bottom:1px solid #f5b4b4; background:#fff0f0; color:#c0392b; }
.sc-body { display:flex; flex:1; overflow:hidden; min-height:0; position:relative; }
.sc-overlay { display:none; position:absolute; inset:0; background:rgba(0,0,0,.45); z-index:24; }
.sc-overlay.visible { display:block; }
.sc-sidebar { width:280px; min-width:280px; background:#fff; border-right:1px solid #e8eaed; display:flex; flex-direction:column; overflow:hidden; flex-shrink:0; z-index:25; transition:transform .24s cubic-bezier(.4,0,.2,1); }
.sc-sidebar-hdr { padding:14px 14px 10px; border-bottom:1px solid #e8eaed; flex-shrink:0; }
.sc-sidebar-label { font-size:11px; font-weight:700; color:#9ca3af; text-transform:uppercase; letter-spacing:.06em; margin-bottom:9px; }
.sc-searchbox { display:flex; align-items:center; gap:8px; background:#f3f4f6; border-radius:9px; padding:8px 12px; border:1px solid transparent; }
.sc-searchbox:focus-within { background:#fff; border-color:#a3e4c8; }
.sc-searchbox input { border:none; outline:none; background:transparent; font-size:14px; color:#111; flex:1; min-width:0; }
.sc-searchbox input::placeholder { color:#b0b7c3; }
.sc-conv-list { flex:1; overflow-y:auto; padding:8px; }
.sc-conv-item { display:flex; align-items:center; gap:10px; padding:11px 10px; border-radius:10px; cursor:pointer; margin-bottom:2px; transition:background .12s; min-height:56px; }
.sc-conv-item:hover:not(.active) { background:#f7f8fa; }
.sc-conv-item.active { background:#edfaf4; }
.sc-conv-av { width:40px; height:40px; border-radius:11px; display:flex; align-items:center; justify-content:center; font-size:17px; flex-shrink:0; overflow:hidden; }
.sc-conv-av.support { background:#edfaf4; }
.sc-conv-av.agency { background:#eff6ff; }
.sc-conv-av img { width:100%; height:100%; object-fit:cover; }
.sc-conv-info { flex:1; min-width:0; }
.sc-conv-name { font-size:14px; font-weight:700; color:#111; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.sc-conv-meta { display:flex; align-items:center; gap:6px; margin-top:4px; }
.sc-conv-badge { display:inline-flex; align-items:center; border-radius:999px; background:#edfaf4; color:#0c6e4f; border:1px solid #a3e4c8; padding:2px 8px; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; }
.sc-conv-preview { font-size:12px; color:#6b7280; line-height:1.45; margin-top:5px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
.sc-unread { min-width:22px; height:22px; background:#1D9E75; color:#fff; border-radius:99px; font-size:11px; font-weight:700; display:flex; align-items:center; justify-content:center; padding:0 5px; flex-shrink:0; }
.sc-stats { display:grid; grid-template-columns:repeat(3,1fr); border-top:1px solid #e8eaed; flex-shrink:0; }
.sc-stat { padding:10px 8px; text-align:center; border-right:1px solid #e8eaed; }
.sc-stat:last-child { border-right:none; }
.sc-stat-lbl { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:#b0b7c3; }
.sc-stat-val { font-size:16px; font-weight:700; color:#111; margin-top:2px; }
.sc-stat-val.green { color:#1D9E75; }
.sc-main { flex:1; display:flex; flex-direction:column; overflow:hidden; min-width:0; background:#f7f8fa; }
.sc-chat-hdr { background:#fff; border-bottom:1px solid #e8eaed; padding:12px 16px; display:flex; align-items:center; gap:10px; flex-shrink:0; }
.sc-back-btn { display:none; width:38px; height:38px; border-radius:10px; background:#f3f4f6; border:none; cursor:pointer; align-items:center; justify-content:center; color:#555; flex-shrink:0; }
.sc-chat-av { width:38px; height:38px; border-radius:11px; display:flex; align-items:center; justify-content:center; font-size:16px; flex-shrink:0; overflow:hidden; }
.sc-chat-av.support { background:#edfaf4; }
.sc-chat-av.agency { background:#eff6ff; }
.sc-chat-av img { width:100%; height:100%; object-fit:cover; }
.sc-chat-info { flex:1; min-width:0; }
.sc-chat-name { font-size:15px; font-weight:700; color:#111; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.sc-chat-desc { font-size:12px; color:#9ca3af; margin-top:1px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.sc-online-tag { display:inline-flex; align-items:center; gap:5px; font-size:12px; font-weight:600; color:#0c6e4f; flex-shrink:0; }
.sc-topics { flex-shrink:0; border-bottom:1px solid #e8eaed; background:#fff; overflow:hidden; }
.sc-topics-hdr { display:flex; align-items:center; justify-content:space-between; padding:11px 16px; cursor:pointer; user-select:none; }
.sc-topics-hdr-left { display:flex; align-items:center; gap:7px; font-size:11px; font-weight:700; color:#6b7280; text-transform:uppercase; letter-spacing:.05em; flex-wrap:wrap; }
.sc-topics-toggle { width:24px; height:24px; border-radius:7px; background:#f3f4f6; display:flex; align-items:center; justify-content:center; flex-shrink:0; transition:transform .22s ease; }
.sc-topics-toggle.open { transform:rotate(180deg); }
.sc-topics-body { padding:0 16px 14px; }
.sc-topic-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; }
.sc-topic-btn { display:flex; flex-direction:column; gap:5px; padding:12px 10px; border-radius:12px; border:1.5px solid #e8eaed; background:#fff; text-align:left; cursor:pointer; }
.sc-topic-btn:hover { border-color:#a3e4c8; background:#f7fdfb; }
.sc-topic-btn.active { border-color:#1D9E75; background:#edfaf4; }
.sc-topic-icon { font-size:22px; line-height:1; }
.sc-topic-name { font-size:12px; font-weight:700; color:#111; line-height:1.3; }
.sc-topic-desc { font-size:11px; color:#9ca3af; line-height:1.45; }
.sc-topic-selected-pill { display:inline-flex; align-items:center; gap:5px; background:#edfaf4; color:#0c6e4f; border:1px solid #a3e4c8; border-radius:99px; padding:2px 9px; font-size:11px; font-weight:600; }
.sc-chips-wrap { padding:12px 16px; flex-shrink:0; border-bottom:1px solid #e8eaed; background:#fff; }
.sc-chips-lbl { font-size:11px; font-weight:700; color:#b0b7c3; text-transform:uppercase; letter-spacing:.05em; margin-bottom:8px; }
.sc-chips { display:flex; flex-wrap:wrap; gap:7px; }
.sc-chip { display:inline-flex; align-items:center; gap:5px; background:#edfaf4; color:#0c6e4f; border:1px solid #a3e4c8; border-radius:99px; padding:7px 14px; font-size:13px; font-weight:600; cursor:pointer; min-height:36px; }
.sc-choice-card { align-self:flex-start; max-width:86%; background:#fff; border:1px solid #e8eaed; border-radius:18px; border-bottom-left-radius:5px; box-shadow:0 1px 3px rgba(0,0,0,.05); padding:12px; margin-left:40px; }
.sc-choice-title { font-size:11px; font-weight:700; color:#9ca3af; margin-bottom:8px; }
.sc-choice-list { display:flex; flex-wrap:wrap; gap:8px; }
.sc-choice-btn { display:inline-flex; align-items:center; gap:6px; border:1px solid #a3e4c8; background:#edfaf4; color:#0c6e4f; border-radius:999px; padding:8px 12px; font-size:12px; font-weight:600; cursor:pointer; }
.sc-choice-btn:hover { background:#d7f5e8; }
.sc-msgs { flex:1; overflow-y:auto; padding:16px; display:flex; flex-direction:column; gap:12px; }
.sc-empty { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#b0b7c3; text-align:center; gap:10px; padding:40px 20px; }
.sc-empty-icon { width:60px; height:60px; border-radius:18px; background:#f3f4f6; display:flex; align-items:center; justify-content:center; font-size:26px; }
.sc-empty-lbl { font-size:15px; font-weight:600; color:#6b7280; }
.sc-empty-sub { font-size:13px; color:#b0b7c3; }
.sc-error-banner { display:flex; align-items:center; gap:8px; background:#fff0f0; border:1px solid #f5b4b4; border-radius:10px; padding:13px 16px; font-size:13px; color:#c0392b; font-weight:500; }
.sc-msg-row { display:flex; gap:8px; align-items:flex-end; }
.sc-msg-row.own { flex-direction:row-reverse; }
.sc-msg-avi { width:32px; height:32px; border-radius:10px; background:#e8eaed; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; color:#555; flex-shrink:0; overflow:hidden; }
.sc-msg-avi img { width:100%; height:100%; object-fit:cover; }
.sc-msg-col { display:flex; flex-direction:column; max-width:75%; }
.sc-msg-row.own .sc-msg-col { align-items:flex-end; }
.sc-msg-sender { font-size:11px; font-weight:600; color:#9ca3af; margin-bottom:3px; padding-left:2px; }
.sc-bubble { padding:11px 15px; border-radius:18px; font-size:14px; line-height:1.6; word-break:break-word; }
.sc-msg-row.own .sc-bubble { background:#1D9E75; color:#fff; border-bottom-right-radius:5px; }
.sc-msg-row:not(.own) .sc-bubble { background:#fff; color:#111; border:1px solid #e8eaed; border-bottom-left-radius:5px; box-shadow:0 1px 3px rgba(0,0,0,.05); }
.sc-msg-time { font-size:10px; color:#b0b7c3; margin-top:4px; padding:0 3px; }
.sc-typing-bubble { display:inline-flex; align-items:center; gap:4px; background:#fff; border:1px solid #e8eaed; border-radius:18px; border-bottom-left-radius:5px; padding:12px 16px; }
.sc-typing-dot { width:7px; height:7px; border-radius:50%; background:#b0b7c3; animation:sc-typing 1.3s ease-in-out infinite; }
.sc-typing-dot:nth-child(2) { animation-delay:.2s; }
.sc-typing-dot:nth-child(3) { animation-delay:.4s; }
@keyframes sc-typing { 0%,60%,100%{transform:translateY(0);opacity:.5} 30%{transform:translateY(-5px);opacity:1} }
.sc-compose { background:#fff; border-top:1px solid #e8eaed; padding:10px 14px 12px; flex-shrink:0; }
.sc-topic-tag { display:inline-flex; align-items:center; gap:6px; background:#edfaf4; color:#0c6e4f; border:1px solid #a3e4c8; border-radius:8px; padding:5px 11px; font-size:12px; font-weight:600; margin-bottom:8px; }
.sc-topic-tag button { background:none; border:none; cursor:pointer; color:inherit; opacity:.6; padding:0; display:flex; align-items:center; min-width:20px; min-height:20px; justify-content:center; }
.sc-compose-box { display:flex; align-items:flex-end; gap:8px; background:#f3f4f6; border-radius:16px; padding:9px 9px 9px 15px; border:1.5px solid transparent; }
.sc-compose-box:focus-within { border-color:#a3e4c8; background:#fff; }
.sc-compose-box textarea { flex:1; border:none; outline:none; background:transparent; resize:none; font-size:15px; color:#111; line-height:1.5; min-height:24px; max-height:130px; font-family:inherit; padding:0; }
.sc-send-btn { width:38px; height:38px; border-radius:11px; background:#1D9E75; border:none; display:flex; align-items:center; justify-content:center; cursor:pointer; flex-shrink:0; color:#fff; }
.sc-send-btn:disabled { background:#d1d5db; cursor:not-allowed; }
.sc-compose-hint { font-size:11px; color:#c9cdd6; margin-top:5px; padding-left:2px; }
@media (max-width:768px) {
  .sc-sidebar { position:absolute; top:0; left:0; bottom:0; width:82%; max-width:300px; transform:translateX(-100%); z-index:25; }
  .sc-sidebar.open { transform:translateX(0); box-shadow:8px 0 40px rgba(0,0,0,.18); }
  .sc-back-btn { display:flex !important; }
  .sc-nav { height:54px; padding:0 14px; }
  .sc-chat-hdr { padding:10px 12px; }
  .sc-topics-body { padding:0 12px 12px; }
  .sc-topic-grid { grid-template-columns:repeat(2,1fr); }
  .sc-msgs { padding:12px 10px; }
  .sc-msg-col { max-width:84%; }
  .sc-compose { padding:10px 12px; }
  .sc-compose-hint { display:none; }
}
`;

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
      <div className="sc-topics-hdr" onClick={() => setOpen((value) => !value)}>
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
      </div>

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
                <span className="sc-topic-desc">{topic.description}</span>
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

function TopicChoices({
  topics,
  title,
  onSelect,
}: {
  topics: TopicOption[];
  title?: string;
  onSelect: (topic: TopicOption) => void;
}) {
  if (topics.length === 0) return null;
  return (
    <div className="sc-choice-card">
      <div className="sc-choice-title">{title || "Choose a topic"}</div>
      <div className="sc-choice-list">
        {topics.map((topic) => (
          <button
            key={topic.id}
            className="sc-choice-btn"
            onClick={() => onSelect(topic)}
            type="button"
          >
            <span>{topic.icon}</span>
            <span>{topic.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

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
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [chatbotConfig, setChatbotConfig] = useState<AgencyChatbotConfig>(DEFAULT_CONFIG);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const lastSigRef = useRef("");
  const activeConvRef = useRef<ClientConversation>(defaultConversation);
  const botReplyTimerRef = useRef<number | null>(null);

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
  const menuTitle = selectedTopic && selectedTopic.id !== "other"
    ? `${selectedTopic.label} menu`
    : "Menu";
  const shouldShowTopicChoices =
    menuTopics.length > 0 &&
    !isBotTyping &&
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
                setMessages((prev) => (prev.some((message) => message.id === next.id) ? prev : [...prev, next]));
                if (next.senderRole === "agency") {
                  void loadMessages(true);
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
  }, [messages, isBotTyping]);

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

      const botReply = getBotReply(text, chatbotConfig, {
        clientName: client?.name,
        agencyName: activeConv.agencyName ?? activeConv.title,
        history: messages,
        selectedTopic,
      });

      if (botReply && chatbotEnabled) {
        if (botReplyTimerRef.current !== null) {
          window.clearTimeout(botReplyTimerRef.current);
        }
        setIsBotTyping(true);
        botReplyTimerRef.current = window.setTimeout(() => {
          setIsBotTyping(false);
          const botMessage: ChatMessage = {
            id: Date.now(),
            message: botReply.text,
            senderName: chatbotConfig.botName || "Support Bot",
            senderRole: "agency",
            createdAt: new Date().toISOString(),
            conversationType: activeConv.conversationType,
            agencyId: activeConv.agencyId,
            agencyName: activeConv.agencyName,
            agencyProfileImageUrl: activeConv.agencyProfileImageUrl,
            clientId: client?.id ?? activeConv.clientId,
            clientProfileImageUrl: client?.profileImageUrl,
          };
          setMessages((prev) => [...prev, botMessage]);
        }, botReply.delay);
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
        <div className={`sc-status-pill ${chatbotEnabled ? "online" : "offline"}`}>
          <Bot size={13} />
          <div className={`sc-status-dot ${chatbotEnabled ? "online" : "offline"}`} />
          {chatbotEnabled ? "Chatbot On" : "Chatbot Off"}
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
            {chatbotEnabled && (
              <div className="sc-online-tag">
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#1D9E75", flexShrink: 0 }} />
                Chatbot ready
              </div>
            )}
          </div>

          {topics.length > 0 && (
            <TopicPicker
              topics={topics}
              selectedId={selectedTopic?.id ?? null}
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

          {chatbotEnabled && messages.length === 0 && (
            <SuggestionChips
              suggestions={suggestionChips}
              onSelect={(text) => {
                void sendMessage(text);
              }}
            />
          )}

          <div className="sc-msgs" ref={scrollRef}>
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
              messages.map((message) => (
                <MessageBubble key={message.id} message={message} isOwn={message.senderRole === "client"} />
              ))
            )}

            {shouldShowTopicChoices && (
              <TopicChoices
                topics={menuTopics}
                title={menuTitle}
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

