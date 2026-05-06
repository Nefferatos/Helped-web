import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MessageCircle,
  Bot,
  Sparkles,
  AlertCircle,
  RefreshCw,
  Tag,
  Send,
  ChevronLeft,
  Search,
  X,
  ChevronDown,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "@/components/ui/sonner";
import { getStoredClient } from "@/lib/clientAuth";
import type { ChatMessage, ClientConversation, ConversationType } from "@/lib/chat";
import { streamSse } from "@/lib/sse";
import { clientFetch, hasActiveClientSession, primeClientAuth, syncClientProfileFromSession } from "@/lib/supabaseAuth";
import "./ClientTheme.css";

type AiStatus = "online" | "offline" | "checking";
type TopicOption = { id: string; label: string; icon: string; description: string; suggestedMessage: string; };

const defaultConversation: ClientConversation = {
  key: "support:0", clientId: 0, conversationType: "support",
  title: "Agency Support", description: "General help, follow-up, and request support",
  lastMessage: "", lastMessageAt: "", unreadCount: 0,
};

const SUPPORT_TOPICS: TopicOption[] = [
  { id: "placement", label: "Placement Status", icon: "📋", description: "Ask about your current placement or application progress", suggestedMessage: "Hi, I'd like to get an update on the status of my current placement request." },
  { id: "schedule", label: "Schedule Change", icon: "📅", description: "Request a change to a helper's schedule or hours", suggestedMessage: "Hi, I need to request a change to my helper's schedule." },
  { id: "complaint", label: "Raise a Concern", icon: "🚨", description: "Report an issue or concern with a helper or agency", suggestedMessage: "Hi, I'd like to raise a concern regarding my current arrangement." },
  { id: "billing", label: "Billing / Fees", icon: "💳", description: "Inquire about invoices, fees, or payment", suggestedMessage: "Hi, I have a question regarding my billing or invoice." },
  { id: "renewal", label: "Contract Renewal", icon: "🔄", description: "Discuss renewal or extension of a contract", suggestedMessage: "Hi, I'd like to discuss renewing my current contract." },
  { id: "other", label: "Other", icon: "💬", description: "Something else — just type your message", suggestedMessage: "" },
];

const CSS = `
*, *::before, *::after { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }

.sc { display:flex; flex-direction:column; height:100dvh; background:#f7f8fa; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; overflow:hidden; }

.sc-nav { height:58px; background:#fff; border-bottom:1px solid #e8eaed; display:flex; align-items:center; justify-content:space-between; padding:0 20px; flex-shrink:0; z-index:30; position:relative; }
.sc-nav-brand { display:flex; align-items:center; gap:10px; }
.sc-nav-icon { width:36px; height:36px; border-radius:10px; background:#1D9E75; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.sc-nav-title { font-size:16px; font-weight:700; color:#111; letter-spacing:-0.2px; }
.sc-nav-unread { font-size:12px; color:#1D9E75; font-weight:600; margin-top:1px; }

.sc-ai-pill { display:inline-flex; align-items:center; gap:6px; border-radius:99px; padding:6px 13px; font-size:12px; font-weight:600; border:1px solid; white-space:nowrap; transition:opacity .15s; min-height:34px; }
.sc-ai-pill.online  { background:#edfaf4; color:#0c6e4f; border-color:#a3e4c8; }
.sc-ai-pill.checking{ background:#fef9ed; color:#92610a; border-color:#fbd17a; }
.sc-ai-pill.offline { background:#fff0f0; color:#c0392b; border-color:#f5b4b4; cursor:pointer; }
.sc-ai-pill.offline:hover { opacity:.8; }
.sc-ai-dot { width:7px; height:7px; border-radius:50%; flex-shrink:0; }
.sc-ai-dot.online   { background:#1D9E75; }
.sc-ai-dot.checking { background:#e6a817; animation:sc-blink 1.1s infinite; }
.sc-ai-dot.offline  { background:#e74c3c; }
@keyframes sc-blink { 0%,100%{opacity:1} 50%{opacity:.3} }

.sc-banner { display:flex; align-items:center; gap:10px; padding:11px 20px; font-size:13px; font-weight:500; flex-shrink:0; border-bottom:1px solid; }
.sc-banner.checking { background:#fef9ed; color:#92610a; border-color:#fbd17a; }
.sc-banner.offline  { background:#fff0f0; color:#c0392b; border-color:#f5b4b4; }
.sc-banner-text { flex:1; }
.sc-banner-retry { display:inline-flex; align-items:center; gap:5px; background:#fff; border:1px solid currentColor; border-radius:7px; padding:6px 13px; font-size:12px; font-weight:700; cursor:pointer; color:inherit; opacity:.85; transition:opacity .12s; white-space:nowrap; flex-shrink:0; min-height:34px; }
.sc-banner-retry:hover { opacity:1; }

/* sc-body is the flex row BELOW the nav — sidebar and overlay are scoped inside it */
.sc-body { display:flex; flex:1; overflow:hidden; min-height:0; position:relative; }

/* Overlay covers only sc-body, not the nav */
.sc-overlay {
  display:none;
  position:absolute;
  inset:0;
  background:rgba(0,0,0,.45);
  z-index:24;
  backdrop-filter:blur(1px);
  -webkit-backdrop-filter:blur(1px);
}
.sc-overlay.visible { display:block; }

/* Desktop sidebar */
.sc-sidebar {
  width:280px;
  min-width:280px;
  background:#fff;
  border-right:1px solid #e8eaed;
  display:flex;
  flex-direction:column;
  overflow:hidden;
  flex-shrink:0;
  z-index:25;
  transition:transform .24s cubic-bezier(.4,0,.2,1);
}

.sc-sidebar-hdr { padding:14px 14px 10px; border-bottom:1px solid #e8eaed; flex-shrink:0; }
.sc-sidebar-label { font-size:11px; font-weight:700; color:#9ca3af; text-transform:uppercase; letter-spacing:.06em; margin-bottom:9px; }
.sc-searchbox { display:flex; align-items:center; gap:8px; background:#f3f4f6; border-radius:9px; padding:8px 12px; border:1px solid transparent; transition:border-color .15s,background .15s; }
.sc-searchbox:focus-within { background:#fff; border-color:#a3e4c8; }
.sc-searchbox input { border:none; outline:none; background:transparent; font-size:14px; color:#111; flex:1; min-width:0; }
.sc-searchbox input::placeholder { color:#b0b7c3; }
.sc-conv-list { flex:1; overflow-y:auto; padding:8px; -webkit-overflow-scrolling:touch; }
.sc-conv-item { display:flex; align-items:center; gap:10px; padding:11px 10px; border-radius:10px; cursor:pointer; margin-bottom:2px; transition:background .12s; min-height:56px; }
.sc-conv-item:hover:not(.active) { background:#f7f8fa; }
.sc-conv-item.active { background:#edfaf4; }
.sc-conv-av { width:40px; height:40px; border-radius:11px; display:flex; align-items:center; justify-content:center; font-size:17px; flex-shrink:0; }
.sc-conv-av.support { background:#edfaf4; }
.sc-conv-av.agency  { background:#eff6ff; }
.sc-conv-info { flex:1; min-width:0; }
.sc-conv-name { font-size:14px; font-weight:700; color:#111; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; line-height:1.3; }
.sc-conv-item.active .sc-conv-name { color:#0c6e4f; }
.sc-conv-preview { font-size:12px; color:#9ca3af; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-top:2px; }
.sc-unread { min-width:22px; height:22px; background:#1D9E75; color:#fff; border-radius:99px; font-size:11px; font-weight:700; display:flex; align-items:center; justify-content:center; padding:0 5px; flex-shrink:0; }
.sc-stats { display:grid; grid-template-columns:repeat(3,1fr); border-top:1px solid #e8eaed; flex-shrink:0; }
.sc-stat { padding:10px 8px; text-align:center; border-right:1px solid #e8eaed; }
.sc-stat:last-child { border-right:none; }
.sc-stat-lbl { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:#b0b7c3; }
.sc-stat-val { font-size:16px; font-weight:700; color:#111; margin-top:2px; }
.sc-stat-val.green { color:#1D9E75; }

.sc-main { flex:1; display:flex; flex-direction:column; overflow:hidden; min-width:0; background:#f7f8fa; }

.sc-chat-hdr { background:#fff; border-bottom:1px solid #e8eaed; padding:12px 16px; display:flex; align-items:center; gap:10px; flex-shrink:0; }
.sc-back-btn { display:none; width:38px; height:38px; border-radius:10px; background:#f3f4f6; border:none; cursor:pointer; align-items:center; justify-content:center; color:#555; flex-shrink:0; transition:background .12s; }
.sc-back-btn:hover { background:#e5e7eb; }
.sc-chat-av { width:38px; height:38px; border-radius:11px; display:flex; align-items:center; justify-content:center; font-size:16px; flex-shrink:0; }
.sc-chat-av.support { background:#edfaf4; }
.sc-chat-av.agency  { background:#eff6ff; }
.sc-chat-info { flex:1; min-width:0; }
.sc-chat-name { font-size:15px; font-weight:700; color:#111; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.sc-chat-desc { font-size:12px; color:#9ca3af; margin-top:1px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.sc-online-tag { display:inline-flex; align-items:center; gap:5px; font-size:12px; font-weight:600; color:#0c6e4f; flex-shrink:0; white-space:nowrap; }

/* Topic Picker */
.sc-topics { flex-shrink:0; border-bottom:1px solid #e8eaed; background:#fff; overflow:hidden; }
.sc-topics-hdr { display:flex; align-items:center; justify-content:space-between; padding:11px 16px; cursor:pointer; user-select:none; transition:background .12s; }
.sc-topics-hdr:hover { background:#f9fafb; }
.sc-topics-hdr-left { display:flex; align-items:center; gap:7px; font-size:11px; font-weight:700; color:#6b7280; text-transform:uppercase; letter-spacing:.05em; flex-wrap:wrap; }
.sc-topics-toggle { width:24px; height:24px; border-radius:7px; background:#f3f4f6; display:flex; align-items:center; justify-content:center; flex-shrink:0; transition:background .12s, transform .22s ease; }
.sc-topics-hdr:hover .sc-topics-toggle { background:#e5e7eb; }
.sc-topics-toggle.open { transform:rotate(180deg); }
.sc-topics-body { padding:0 16px 14px; }
.sc-topic-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; }
.sc-topic-btn { display:flex; flex-direction:column; gap:5px; padding:12px 10px; border-radius:12px; border:1.5px solid #e8eaed; background:#fff; text-align:left; cursor:pointer; transition:border-color .15s,background .15s,transform .1s; -webkit-tap-highlight-color:transparent; }
.sc-topic-btn:hover { border-color:#a3e4c8; background:#f7fdfb; }
.sc-topic-btn:active { transform:scale(.97); }
.sc-topic-btn.active { border-color:#1D9E75; background:#edfaf4; }
.sc-topic-icon { font-size:22px; line-height:1; }
.sc-topic-name { font-size:12px; font-weight:700; color:#111; line-height:1.3; }
.sc-topic-btn.active .sc-topic-name { color:#0c6e4f; }
.sc-topic-desc { font-size:11px; color:#9ca3af; line-height:1.45; }
.sc-topic-btn.active .sc-topic-desc { color:#52987c; }
.sc-topic-selected-pill { display:inline-flex; align-items:center; gap:5px; background:#edfaf4; color:#0c6e4f; border:1px solid #a3e4c8; border-radius:99px; padding:2px 9px; font-size:11px; font-weight:600; }

.sc-chips-wrap { padding:12px 16px; flex-shrink:0; border-bottom:1px solid #e8eaed; background:#fff; }
.sc-chips-lbl { font-size:11px; font-weight:700; color:#b0b7c3; text-transform:uppercase; letter-spacing:.05em; margin-bottom:8px; }
.sc-chips { display:flex; flex-wrap:wrap; gap:7px; }
.sc-chip { display:inline-flex; align-items:center; gap:5px; background:#edfaf4; color:#0c6e4f; border:1px solid #a3e4c8; border-radius:99px; padding:7px 14px; font-size:13px; font-weight:600; cursor:pointer; transition:background .12s,border-color .12s; white-space:nowrap; min-height:36px; }
.sc-chip:hover { background:#c7f0df; border-color:#1D9E75; }
.sc-chip:active { transform:scale(.97); }

.sc-msgs { flex:1; overflow-y:auto; padding:16px; display:flex; flex-direction:column; gap:12px; scroll-behavior:smooth; -webkit-overflow-scrolling:touch; }
.sc-empty { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#b0b7c3; text-align:center; gap:10px; padding:40px 20px; }
.sc-empty-icon { width:60px; height:60px; border-radius:18px; background:#f3f4f6; display:flex; align-items:center; justify-content:center; font-size:26px; }
.sc-empty-lbl { font-size:15px; font-weight:600; color:#6b7280; }
.sc-empty-sub { font-size:13px; color:#b0b7c3; }
.sc-error-banner { display:flex; align-items:center; gap:8px; background:#fff0f0; border:1px solid #f5b4b4; border-radius:10px; padding:13px 16px; font-size:13px; color:#c0392b; font-weight:500; }

.sc-msg-row { display:flex; gap:8px; align-items:flex-end; }
.sc-msg-row.own { flex-direction:row-reverse; }
.sc-msg-avi { width:32px; height:32px; border-radius:10px; background:#e8eaed; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; color:#555; flex-shrink:0; }
.sc-msg-col { display:flex; flex-direction:column; max-width:75%; }
.sc-msg-row.own .sc-msg-col { align-items:flex-end; }
.sc-msg-sender { font-size:11px; font-weight:600; color:#9ca3af; margin-bottom:3px; padding-left:2px; }
.sc-msg-row.own .sc-msg-sender { padding-left:0; padding-right:2px; }
.sc-bubble { padding:11px 15px; border-radius:18px; font-size:14px; line-height:1.6; word-break:break-word; }
.sc-msg-row.own .sc-bubble { background:#1D9E75; color:#fff; border-bottom-right-radius:5px; }
.sc-msg-row:not(.own) .sc-bubble { background:#fff; color:#111; border:1px solid #e8eaed; border-bottom-left-radius:5px; box-shadow:0 1px 3px rgba(0,0,0,.05); }
.sc-msg-time { font-size:10px; color:#b0b7c3; margin-top:4px; padding:0 3px; }

.sc-shimmer { border-radius:14px; background:linear-gradient(90deg,#f0f1f3 25%,#f9f9fa 50%,#f0f1f3 75%); background-size:200% 100%; animation:sc-shimmer 1.3s ease-in-out infinite; }
@keyframes sc-shimmer { 0%{background-position:200%} 100%{background-position:-200%} }

.sc-compose { background:#fff; border-top:1px solid #e8eaed; padding:10px 14px 12px; flex-shrink:0; padding-bottom:max(12px, env(safe-area-inset-bottom, 12px)); }
.sc-topic-tag { display:inline-flex; align-items:center; gap:6px; background:#edfaf4; color:#0c6e4f; border:1px solid #a3e4c8; border-radius:8px; padding:5px 11px; font-size:12px; font-weight:600; margin-bottom:8px; }
.sc-topic-tag button { background:none; border:none; cursor:pointer; color:inherit; opacity:.6; line-height:1; padding:0; display:flex; align-items:center; min-width:20px; min-height:20px; justify-content:center; }
.sc-topic-tag button:hover { opacity:1; }
.sc-compose-box { display:flex; align-items:flex-end; gap:8px; background:#f3f4f6; border-radius:16px; padding:9px 9px 9px 15px; border:1.5px solid transparent; transition:border-color .15s,background .15s; }
.sc-compose-box:focus-within { border-color:#a3e4c8; background:#fff; }
.sc-compose-box textarea { flex:1; border:none; outline:none; background:transparent; resize:none; font-size:15px; color:#111; line-height:1.5; min-height:24px; max-height:130px; font-family:inherit; padding:0; }
.sc-compose-box textarea::placeholder { color:#b0b7c3; }
.sc-send-btn { width:38px; height:38px; border-radius:11px; background:#1D9E75; border:none; display:flex; align-items:center; justify-content:center; cursor:pointer; flex-shrink:0; color:#fff; transition:background .15s,transform .1s; }
.sc-send-btn:hover:not(:disabled) { background:#158a63; }
.sc-send-btn:active:not(:disabled) { transform:scale(.92); }
.sc-send-btn:disabled { background:#d1d5db; cursor:not-allowed; }
.sc-compose-hint { font-size:11px; color:#c9cdd6; margin-top:5px; padding-left:2px; }

/* ── Mobile ── */
@media (max-width:768px) {
  /* Sidebar slides in from left, sits ABOVE sc-body content */
  .sc-sidebar {
    position:absolute;
    top:0; left:0; bottom:0;
    width:82%;
    max-width:300px;
    transform:translateX(-100%);
    box-shadow:none;
    z-index:25;
  }
  .sc-sidebar.open {
    transform:translateX(0);
    box-shadow:8px 0 40px rgba(0,0,0,.18);
  }

  .sc-back-btn { display:flex !important; }
  .sc-nav { height:54px; padding:0 14px; }
  .sc-nav-title { font-size:15px; }
  .sc-ai-pill { padding:5px 10px; font-size:11px; }
  .sc-banner { padding:10px 14px; font-size:13px; }
  .sc-chat-hdr { padding:10px 12px; gap:8px; }
  .sc-chat-name { font-size:14px; }
  .sc-chat-desc { font-size:11px; }

  .sc-topics-hdr { padding:10px 12px; }
  .sc-topics-body { padding:0 12px 12px; }
  .sc-topic-grid { grid-template-columns:repeat(2,1fr); gap:9px; }
  .sc-topic-btn { padding:14px 12px; border-radius:14px; gap:6px; }
  .sc-topic-icon { font-size:26px; }
  .sc-topic-name { font-size:13px; }
  .sc-topic-desc { font-size:12px; }

  .sc-chips-wrap { padding:11px 12px; }
  .sc-chip { font-size:13px; padding:8px 14px; min-height:38px; }

  .sc-msgs { padding:12px 10px; gap:10px; }
  .sc-msg-col { max-width:84%; }
  .sc-bubble { font-size:15px; padding:11px 14px; line-height:1.55; }
  .sc-msg-time { font-size:11px; }
  .sc-empty-lbl { font-size:14px; }

  .sc-compose { padding:10px 12px; padding-bottom:max(14px, env(safe-area-inset-bottom, 14px)); }
  .sc-compose-box { padding:10px 10px 10px 14px; border-radius:18px; }
  .sc-compose-box textarea { font-size:15px; min-height:26px; }
  .sc-send-btn { width:42px; height:42px; border-radius:12px; }
  .sc-compose-hint { display:none; }
  .sc-topic-tag { font-size:13px; padding:6px 12px; }
}

@media (max-width:480px) {
  .sc-topic-grid { grid-template-columns:repeat(2,1fr); gap:8px; }
  .sc-msg-col { max-width:88%; }
  .sc-chip { font-size:12px; padding:7px 12px; }
}
`;

function AiStatusBanner({ status, onRetry }: { status: AiStatus; onRetry: () => void }) {
  if (status === "online") return null;
  return (
    <div className={`sc-banner ${status}`}>
      {status === "checking"
        ? <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#e6a817", animation: "sc-blink 1.1s infinite", flexShrink: 0 }} />
        : <AlertCircle size={15} style={{ flexShrink: 0 }} />}
      <span className="sc-banner-text">
        {status === "checking" ? "Connecting to AI assistant…" : "AI assistant unavailable. Select a topic below to reach our team directly."}
      </span>
      {status === "offline" && (
        <button className="sc-banner-retry" onClick={onRetry}><RefreshCw size={11} /> Retry</button>
      )}
    </div>
  );
}

function TopicPicker({ onSelect, selectedId }: { onSelect: (t: TopicOption) => void; selectedId: string | null }) {
  const [open, setOpen] = useState(false);
  const selectedTopic = SUPPORT_TOPICS.find((t) => t.id === selectedId);

  return (
    <div className="sc-topics">
      <div className="sc-topics-hdr" onClick={() => setOpen((v) => !v)}>
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
            {SUPPORT_TOPICS.map((t) => (
              <button
                key={t.id}
                className={`sc-topic-btn${selectedId === t.id ? " active" : ""}`}
                onClick={() => { onSelect(t); setOpen(false); }}
              >
                <span className="sc-topic-icon">{t.icon}</span>
                <span className="sc-topic-name">{t.label}</span>
                <span className="sc-topic-desc">{t.description}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AiSuggestionChips({ suggestions, onSelect }: { suggestions: string[]; onSelect: (t: string) => void }) {
  return (
    <div className="sc-chips-wrap">
      <p className="sc-chips-lbl">Suggested</p>
      <div className="sc-chips">
        {suggestions.map((s) => (
          <button key={s} className="sc-chip" onClick={() => onSelect(s)}>
            <Sparkles size={11} /> {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({ message, isOwn }: { message: ChatMessage; isOwn: boolean }) {
  const time = new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const initials = (message.senderName || "?").slice(0, 2).toUpperCase();
  return (
    <div className={`sc-msg-row${isOwn ? " own" : ""}`}>
      {!isOwn && <div className="sc-msg-avi">{initials}</div>}
      <div className="sc-msg-col">
        {!isOwn && <div className="sc-msg-sender">{message.senderName}</div>}
        <div className="sc-bubble">{message.message}</div>
        <div className="sc-msg-time">{time}</div>
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
  const [aiStatus, setAiStatus] = useState<AiStatus>("checking");
  const [selectedTopic, setSelectedTopic] = useState<TopicOption | null>(null);
  const [showTopicPicker, setShowTopicPicker] = useState(false);
  const aiSuggestions = ["What's my placement status?", "I need to reschedule", "Billing question", "Raise a concern"];

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const lastSigRef = useRef("");
  const activeConvRef = useRef<ClientConversation>(defaultConversation);
  const client = getStoredClient();

  const selectedType: ConversationType = searchParams.get("type") === "agency" ? "agency" : "support";
  const selectedAgencyId = selectedType === "agency" ? Number(searchParams.get("agencyId")) : undefined;

  const activeConv =
    conversations.find((c) =>
      c.conversationType === selectedType &&
      (c.conversationType === "support" || c.agencyId === selectedAgencyId),
    ) ?? conversations[0] ?? defaultConversation;

  useEffect(() => { activeConvRef.current = activeConv; }, [activeConv]);

  const checkAiStatus = useCallback(async () => {
    setAiStatus("checking");
    try {
      const res = await clientFetch("/api/ai/status").catch(() => null);
      if (res?.ok) { setAiStatus("online"); setShowTopicPicker(false); }
      else { setAiStatus("offline"); setShowTopicPicker(true); }
    } catch { setAiStatus("offline"); setShowTopicPicker(true); }
  }, []);

  useEffect(() => { void checkAiStatus(); }, [checkAiStatus]);

  const filteredConvs = useMemo(() => {
    const t = search.trim().toLowerCase();
    if (!t) return conversations;
    return conversations.filter((c) => `${c.title} ${c.description} ${c.lastMessage}`.toLowerCase().includes(t));
  }, [conversations, search]);

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    p.set("type", activeConv.conversationType);
    if (activeConv.conversationType === "agency" && activeConv.agencyId) {
      p.set("agencyId", String(activeConv.agencyId));
      p.set("agencyName", activeConv.agencyName || "Agency");
    }
    return p.toString();
  }, [activeConv]);

  const loadConversations = useCallback(async (silent = false) => {
    try {
      const res = await clientFetch("/api/chats/client/conversations");
      const data = (await res.json().catch(() => ({}))) as { conversations?: ClientConversation[]; error?: string };
      if (!res.ok || !data.conversations) throw new Error(data.error || "Failed to load");
      setConversations(data.conversations);
      const hasSel = data.conversations.some((c) =>
        c.conversationType === selectedType && (c.conversationType === "support" || c.agencyId === selectedAgencyId),
      );
      if (!hasSel && data.conversations[0]) {
        const p = new URLSearchParams();
        p.set("type", data.conversations[0].conversationType);
        if (data.conversations[0].conversationType === "agency" && data.conversations[0].agencyId) {
          p.set("agencyId", String(data.conversations[0].agencyId));
          p.set("agencyName", data.conversations[0].agencyName || "Agency");
        }
        setSearchParams(p, { replace: true });
      }
    } catch (e) { if (!silent) toast.error(e instanceof Error ? e.message : "Failed to load"); }
  }, [selectedAgencyId, selectedType, setSearchParams]);

  const loadMessages = useCallback(async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      setErrorMessage("");
      const res = await clientFetch(`/api/chats/client?${qs}`);
      const data = (await res.json().catch(() => ({}))) as { messages?: ChatMessage[]; error?: string };
      if (!res.ok || !data.messages) throw new Error(data.error || "Failed to load chat");
      const sorted = [...data.messages].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      const sig = JSON.stringify(sorted.map((m) => [m.id, m.message, m.createdAt, m.senderRole]));
      if (sig !== lastSigRef.current) { lastSigRef.current = sig; setMessages(sorted); }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load chat";
      setErrorMessage(msg);
      if (!silent) toast.error(msg);
    } finally { if (!silent) setIsLoading(false); }
  }, [qs]);

  useEffect(() => {
    let cancelled = false;
    const boot = async () => {
      const ok = await hasActiveClientSession();
      if (!ok) { if (!cancelled) navigate("/employer-login"); return; }
      await syncClientProfileFromSession();
      lastSigRef.current = "";
      if (!cancelled) { void loadConversations(false); void loadMessages(false); }
    };
    void boot();
    return () => { cancelled = true; };
  }, [loadConversations, loadMessages, navigate]);

  useEffect(() => {
    const ctrl = new AbortController();
    let lastId = 0;
    const run = async () => {
      try {
        const token = await primeClientAuth();
        if (!token) { navigate("/employer-login"); return; }
        const res = await clientFetch("/api/chats/client/last-id", { signal: ctrl.signal });
        const d = (await res.json().catch(() => ({}))) as { lastId?: number };
        if (res.ok && typeof d.lastId === "number") lastId = d.lastId;
      } catch { /* ignore */ }
      while (!ctrl.signal.aborted) {
        try {
          const token = await primeClientAuth();
          if (!token) { navigate("/employer-login"); return; }
          await streamSse(`/api/chats/client/stream?all=1&afterId=${lastId}`, {
            headers: { Authorization: `Bearer ${token}` },
            signal: ctrl.signal,
            onEvent: (ev) => {
              if (ev.event !== "message" || !ev.data) return;
              const payload = JSON.parse(ev.data) as { message?: ChatMessage };
              const next = payload.message;
              if (!next) return;
              lastId = Math.max(lastId, next.id);
              const cur = activeConvRef.current;
              const isActive = cur.conversationType === next.conversationType &&
                (cur.conversationType === "support" || cur.agencyId === next.agencyId);
              if (isActive) {
                setMessages((prev) => prev.some((m) => m.id === next.id) ? prev : [...prev, next]);
                if (next.senderRole === "agency") void loadMessages(true);
              }
              void loadConversations(true);
            },
          });
        } catch {
          if (ctrl.signal.aborted) return;
          await new Promise((r) => window.setTimeout(r, 1200));
        }
      }
    };
    void run();
    return () => ctrl.abort();
  }, [loadConversations, loadMessages, navigate]);

  useEffect(() => { lastSigRef.current = ""; void loadMessages(false); }, [loadMessages]);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages]);

  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 130)}px`;
  };

  const sendMessage = async (override?: string) => {
    const text = (override ?? draft).trim();
    if (!text || isSending) return;
    try {
      setIsSending(true);
      const res = await clientFetch(`/api/chats/client?${qs}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: ChatMessage; error?: string };
      if (!res.ok || !data.message) throw new Error(data.error || "Failed to send");
      setMessages((prev) => {
        const next = [...prev, data.message!];
        lastSigRef.current = JSON.stringify(next.map((m) => [m.id, m.message, m.createdAt, m.senderRole]));
        return next;
      });
      setConversations((prev) =>
        prev.map((c) => c.key === activeConv.key ? { ...c, lastMessage: data.message!.message, lastMessageAt: data.message!.createdAt } : c),
      );
      setDraft("");
      setSelectedTopic(null);
      if (textareaRef.current) textareaRef.current.style.height = "auto";
      void loadConversations(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send");
    } finally { setIsSending(false); }
  };

  const selectConversation = (conv: ClientConversation) => {
    const p = new URLSearchParams();
    p.set("type", conv.conversationType);
    if (conv.conversationType === "agency" && conv.agencyId) {
      p.set("agencyId", String(conv.agencyId));
      p.set("agencyName", conv.agencyName || "Agency");
    }
    setSearchParams(p);
    setSidebarOpen(false);
  };

  const totalUnread = conversations.reduce((s, c) => s + c.unreadCount, 0);
  const convType = activeConv.conversationType;

  return (
    <div className="sc">
      <style>{CSS}</style>

      <nav className="sc-nav">
        <div className="sc-nav-brand">
          <div className="sc-nav-icon"><MessageCircle size={17} color="#fff" /></div>
          <div>
            <div className="sc-nav-title">Support Messages</div>
            {totalUnread > 0 && <div className="sc-nav-unread">{totalUnread} unread message{totalUnread !== 1 ? "s" : ""}</div>}
          </div>
        </div>
        <div className={`sc-ai-pill ${aiStatus}`} onClick={() => aiStatus === "offline" && void checkAiStatus()} title={aiStatus === "offline" ? "Click to retry" : undefined}>
          <Bot size={13} />
          <div className={`sc-ai-dot ${aiStatus}`} />
          AI {aiStatus === "checking" ? "Connecting" : aiStatus === "online" ? "Online" : "Offline"}
        </div>
      </nav>

      <AiStatusBanner status={aiStatus} onRetry={checkAiStatus} />

      {/* sc-body is relative — overlay and sidebar are position:absolute inside it */}
      <div className="sc-body">

        {/* Overlay only covers the body area, not the nav */}
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
                placeholder="Search chats…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="sc-conv-list">
            {filteredConvs.length === 0 && (
              <div style={{ padding: "24px 12px", textAlign: "center", fontSize: 13, color: "#b0b7c3" }}>
                No conversations yet.
              </div>
            )}
            {filteredConvs.map((conv) => {
              const isActive = conv.conversationType === activeConv.conversationType &&
                (conv.conversationType === "support" || conv.agencyId === activeConv.agencyId);
              return (
                <div
                  key={conv.key}
                  className={`sc-conv-item${isActive ? " active" : ""}`}
                  onClick={() => selectConversation(conv)}
                >
                  <div className={`sc-conv-av ${conv.conversationType}`}>
                    {conv.conversationType === "agency" ? "🏢" : "💬"}
                  </div>
                  <div className="sc-conv-info">
                    <div className="sc-conv-name">{conv.title}</div>
                    <div className="sc-conv-preview">{conv.lastMessage || conv.description}</div>
                  </div>
                  {conv.unreadCount > 0 && <div className="sc-unread">{conv.unreadCount}</div>}
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
            <button
              className="sc-back-btn"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open conversations"
            >
              <ChevronLeft size={18} />
            </button>
            <div className={`sc-chat-av ${convType}`}>{convType === "agency" ? "🏢" : "💬"}</div>
            <div className="sc-chat-info">
              <div className="sc-chat-name">{activeConv.title}</div>
              <div className="sc-chat-desc">{activeConv.description}</div>
            </div>
            {aiStatus === "online" && (
              <div className="sc-online-tag">
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#1D9E75", flexShrink: 0 }} />
                AI active
              </div>
            )}
          </div>

          {showTopicPicker && aiStatus === "offline" && (
            <TopicPicker
              onSelect={(t) => {
                setSelectedTopic(t);
                if (t.suggestedMessage) setDraft(t.suggestedMessage);
                setTimeout(() => textareaRef.current?.focus(), 60);
              }}
              selectedId={selectedTopic?.id ?? null}
            />
          )}

          {aiStatus === "online" && messages.length === 0 && (
            <AiSuggestionChips
              suggestions={aiSuggestions}
              onSelect={(t) => { setDraft(t); setTimeout(() => textareaRef.current?.focus(), 60); }}
            />
          )}

          <div className="sc-msgs" ref={scrollRef}>
            {isLoading ? (
              <>
                <div className="sc-shimmer" style={{ height: 46, width: "52%" }} />
                <div className="sc-shimmer" style={{ height: 46, width: "65%", alignSelf: "flex-end" }} />
                <div className="sc-shimmer" style={{ height: 64, width: "58%" }} />
              </>
            ) : errorMessage ? (
              <div className="sc-error-banner">
                <AlertCircle size={15} style={{ flexShrink: 0 }} />{errorMessage}
              </div>
            ) : messages.length === 0 ? (
              <div className="sc-empty">
                <div className="sc-empty-icon">{aiStatus === "offline" ? "📋" : "💬"}</div>
                <div className="sc-empty-lbl">
                  {aiStatus === "offline" ? "Select a topic above, then type your message." : "Start the conversation below."}
                </div>
                <div className="sc-empty-sub">Messages appear in real time.</div>
              </div>
            ) : (
              messages.map((m) => (
                <MessageBubble key={m.id} message={m} isOwn={m.senderRole === "client"} />
              ))
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
                placeholder={selectedTopic ? `Message about: ${selectedTopic.label}…` : `Message ${activeConv.title}…`}
                value={draft}
                onChange={(e) => { setDraft(e.target.value); autoResize(); }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendMessage(); }
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