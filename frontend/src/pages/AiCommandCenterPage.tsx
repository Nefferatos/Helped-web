import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Activity, Bot, Check, ChevronRight, CircleAlert, CircleHelp, Clock3, FileSpreadsheet, Image as ImageIcon, Keyboard, LoaderCircle, MessageCircle, Mic, MicOff, MoreHorizontal, Paperclip, Search, Send, Settings2, ShieldCheck, Square, Trash2, Volume2, VolumeX, X, Zap } from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { getAgencyAdminAuthHeaders, getStoredAgencyAdmin } from "@/lib/agencyAdminAuth";
import { adminPath } from "@/lib/routes";

type CommandCenterAction = {
  type: "approve_applicant" | "reject_applicant" | "assign_interview" | "open_maid_profile" | "draft_email" | "navigate_to_page" | "website_api_action";
  applicationId?: string;
  maidReferenceCode?: string;
  destination?: string;
  recipientKind?: "enquiry" | "applicant";
  recipientId?: string;
  recipientName?: string;
  recipientEmail?: string;
  subject?: string;
  body?: string;
  method?: "POST" | "PUT" | "PATCH" | "DELETE";
  endpoint?: string;
  apiBody?: Record<string, unknown>;
  summary?: string;
  label?: string;
};

type ChatMessage = { id: string; role: "assistant" | "user"; content: string; actions?: CommandCenterAction[] };
type SavedConversation = { id: string; title: string; updatedAt: number; storageKey: string };
type BroadcastWatch = { channel: "whatsapp" | "telegram"; id: string };
type PendingAction = {
  id: string;
  command_id: string;
  agent_id: string;
  tool_name: string;
  description: string;
  status: string;
  risk_classification: string;
  payload: Record<string, unknown>;
  payload_hash: string;
  created_at: string;
  actor_id: string;
  instruction: string;
};
type ContactImportRow = { full_name: string; phone_number: string; email: string; company: string; tags: string[]; consent_status: "subscribed" | "opted_out" | "not_consented"; consent_source: string };
type PendingContactImport = { fileName: string; contacts: ContactImportRow[]; skippedCount: number };
type StagedChatMedia = { file: File; platform: "whatsapp" | "telegram"; mediaType: "image" | "video"; mediaUrl?: string; mediaFileId?: string; mediaMimeType?: string; mediaFileName?: string; previewUrl: string };

const errorMessage = async (response: Response) => {
  const body = await response.json().catch(() => ({})) as { error?: string };
  return body.error || `Request failed (${response.status})`;
};

const normalizeAssistantReply = (value: unknown): string => {
  let current: unknown = value;
  for (let depth = 0; depth < 4; depth += 1) {
    if (typeof current !== "string") {
      if (Array.isArray(current)) { current = current[0]; continue; }
      if (current && typeof current === "object") {
        const record = current as Record<string, unknown>;
        const text = [record.reply, record.response, record.text, record.content, record.message].find((item) => typeof item === "string" && item.trim());
        if (typeof text === "string") { current = text; continue; }
        return "The assistant returned a response I couldn’t display. Please try again.";
      }
      return "The assistant returned an empty response. Please try again.";
    }
    const text = current.trim();
    if (!text) return "The assistant returned an empty response. Please try again.";
    if (text.startsWith("{") || text.startsWith("[")) {
      try { current = JSON.parse(text) as unknown; continue; }
      catch { return "The assistant returned a response I couldn’t format. Please try again."; }
    }
    return text;
  }
  return typeof current === "string" && current.trim() ? current.trim() : "The assistant returned a response I couldn’t display. Please try again.";
};

const prettyDate = (value: string) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
};

const initialMessage: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content: "Hi! I’m your agency assistant. Ask me a question or tell me what you’d like done. I can work with supported agency records and tasks. Before I make a change or send a message, I’ll show you exactly what I’m about to do here in chat.",
};

const COMMAND_CENTER_HISTORY_KEY = "helped:ai-command-center:history";
const COMMAND_CENTER_HISTORY_EVENT = "helped:ai-command-center:history-updated";
const getBroadcastWatchKey = (historyKey: string) => `${historyKey}:broadcast-watches`;
const loadBroadcastWatches = (historyKey: string): BroadcastWatch[] => {
  try {
    const value = JSON.parse(window.localStorage.getItem(getBroadcastWatchKey(historyKey)) || "[]") as unknown;
    return Array.isArray(value) ? value.filter((item): item is BroadcastWatch => Boolean(item) && typeof item === "object" && ((item as BroadcastWatch).channel === "whatsapp" || (item as BroadcastWatch).channel === "telegram") && typeof (item as BroadcastWatch).id === "string").slice(-30) : [];
  } catch { return []; }
};
const COMMAND_CENTER_VOICE_KEY = "helped:ai-command-center:voice-enabled";
const COMMAND_CENTER_VOICE_EVENT = "helped:ai-command-center:voice-updated";
const readVoicePreference = () => window.localStorage.getItem(COMMAND_CENTER_VOICE_KEY) !== "false";
const COMMAND_CENTER_THEME_KEY = "helped:ai-command-center:theme";
const COMMAND_CENTER_TEXT_SIZE_KEY = "helped:ai-command-center:text-size";
type ChatTheme = "light" | "dark";
type ChatTextSize = "small" | "medium" | "large";
const readChatTheme = (): ChatTheme => window.localStorage.getItem(COMMAND_CENTER_THEME_KEY) === "dark" ? "dark" : "light";
const readChatTextSize = (): ChatTextSize => {
  const value = window.localStorage.getItem(COMMAND_CENTER_TEXT_SIZE_KEY);
  return value === "small" || value === "large" ? value : "medium";
};
const splitSpeechChunks = (text: string, maxLength = 180): string[] => {
  const words = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const chunks: string[] = [];
  let current = "";
  for (const word of words) {
    if (current && current.length + word.length + 1 > maxLength) {
      const sentenceEnd = Math.max(current.lastIndexOf(". "), current.lastIndexOf("? "), current.lastIndexOf("! "));
      if (sentenceEnd >= Math.floor(maxLength * 0.55)) {
        chunks.push(current.slice(0, sentenceEnd + 1));
        current = `${current.slice(sentenceEnd + 2)} ${word}`.trim();
      } else {
        chunks.push(current);
        current = word;
      }
      continue;
    }
    current = current ? `${current} ${word}` : word;
  }
  if (current) chunks.push(current);
  return chunks;
};

const getConversationStorageKey = () => {
  const admin = getStoredAgencyAdmin();
  return `${COMMAND_CENTER_HISTORY_KEY}:${admin?.agencyId ?? "unknown"}:${admin?.id ?? "unknown"}`;
};

const getConversationIndexKey = (accountKey: string) => `${accountKey}:conversation-index`;
const loadConversationList = (accountKey: string): SavedConversation[] => {
  try {
    const stored = JSON.parse(window.localStorage.getItem(getConversationIndexKey(accountKey)) || "null") as unknown;
    if (Array.isArray(stored)) {
      const valid = stored.filter((item): item is SavedConversation => Boolean(item) && typeof item === "object" && typeof (item as SavedConversation).id === "string" && typeof (item as SavedConversation).title === "string" && typeof (item as SavedConversation).storageKey === "string").slice(0, 100);
      if (valid.length) return valid;
    }
    const legacyKey = `${accountKey}:thread:legacy`;
    const legacyMessages = window.localStorage.getItem(accountKey);
    if (legacyMessages && !window.localStorage.getItem(legacyKey)) window.localStorage.setItem(legacyKey, legacyMessages);
    const initial: SavedConversation[] = [{ id: "legacy", title: "New chat", updatedAt: Date.now(), storageKey: legacyKey }];
    window.localStorage.setItem(getConversationIndexKey(accountKey), JSON.stringify(initial));
    return initial;
  } catch {
    return [{ id: "legacy", title: "New chat", updatedAt: Date.now(), storageKey: `${accountKey}:thread:legacy` }];
  }
};

const loadConversation = (storageKey: string): ChatMessage[] => {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(storageKey) || "[]") as unknown;
    if (!Array.isArray(parsed)) return [initialMessage];
    const saved = parsed.filter((item): item is ChatMessage =>
      Boolean(item) && typeof item === "object" &&
      ((item as ChatMessage).role === "assistant" || (item as ChatMessage).role === "user") &&
      typeof (item as ChatMessage).id === "string" && typeof (item as ChatMessage).content === "string",
    ).map(({ id, role, content }) => ({ id, role, content: content.slice(0, 8000) })).slice(-100);
    return saved.length ? saved : [initialMessage];
  } catch {
    return [initialMessage];
  }
};

const renderAssistantImportantPhrases = (text: string, lineKey: string) => {
  const pattern = /(\b(?:enquiry|request|applicant|employer|broadcast|campaign)\s+ID\s*[:#]?\s*#?[\w-]+|\b(?:\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}|\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4})\b|\b\d+(?:,\d{3})*(?:\.\d+)?\s+(?:sent|failed|records?|contacts?|applicants?|enquiries|requests?|recipients?)\b|\b(?:completed|failed|scheduled|approved|rejected)\b)/gi;
  return text.split(pattern).map((part, index) => {
    pattern.lastIndex = 0;
    const important = pattern.test(part);
    pattern.lastIndex = 0;
    return important ? <strong key={`${lineKey}-fact-${index}`} className="rounded bg-blue-100/80 px-1 font-semibold text-blue-950">{part}</strong> : <span key={`${lineKey}-text-${index}`}>{part}</span>;
  });
};

const renderAssistantInline = (text: string, lineKey: string) => text.split(/(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*\n]+\*)/g).map((part, index) => {
  const key = `${lineKey}-${index}`;
  if ((part.startsWith("**") && part.endsWith("**")) || (part.startsWith("__") && part.endsWith("__"))) return <strong key={key} className="rounded bg-blue-100/80 px-1 font-semibold text-blue-950">{part.slice(2, -2)}</strong>;
  if (part.startsWith("*") && part.endsWith("*")) return <em key={key} className="font-medium text-blue-950">{part.slice(1, -1)}</em>;
  if (part.startsWith("`") && part.endsWith("`")) return <code key={key} className="rounded bg-blue-100 px-1 py-0.5 font-mono text-[.92em] text-blue-950">{part.slice(1, -1)}</code>;
  return <span key={key}>{renderAssistantImportantPhrases(part, key)}</span>;
});

const renderAssistantContent = (content: string) => content.split(/\r?\n/).map((line, index) => {
  const key = `assistant-line-${index}`;
  const trimmed = line.trim();
  if (!trimmed) return <div key={key} className="h-2" aria-hidden="true" />;
  const heading = trimmed.match(/^#{1,6}\s+(.+)$/);
  if (heading) return <h3 key={key} className="mt-2 text-[1.02em] font-bold text-blue-950">{renderAssistantInline(heading[1], key)}</h3>;
  const bullet = trimmed.match(/^(?:[-*•]|\d+[.)])\s+(.+)$/);
  if (bullet) return <div key={key} className="flex min-w-0 gap-2 pl-1"><span className="select-none text-blue-600">•</span><span className="min-w-0 flex-1">{renderAssistantInline(bullet[1], key)}</span></div>;
  const quote = trimmed.match(/^>\s*(.+)$/);
  if (quote) return <div key={key} className="border-l-2 border-blue-300 pl-3 text-slate-600">{renderAssistantInline(quote[1], key)}</div>;
  return <p key={key} className="min-w-0">{renderAssistantInline(line, key)}</p>;
});

const plainAssistantText = (content: string) => content
  .replace(/^\s*#{1,6}\s*/gm, "")
  .replace(/^\s*[-*•]\s+/gm, "")
  .replace(/^\s*>\s?/gm, "")
  .replace(/\*\*([^*]+)\*\*/g, "$1")
  .replace(/__([^_]+)__/g, "$1")
  .replace(/\*([^*\n]+)\*/g, "$1")
  .replace(/`([^`]+)`/g, "$1");

export default function AiCommandCenterPage() {
  const [accountStorageKey, setAccountStorageKey] = useState(getConversationStorageKey);
  const [conversationList, setConversationList] = useState<SavedConversation[]>(() => loadConversationList(getConversationStorageKey()));
  const [activeConversationId, setActiveConversationId] = useState(() => loadConversationList(getConversationStorageKey())[0]?.id ?? "legacy");
  const [conversationStorageKey, setConversationStorageKey] = useState(() => loadConversationList(getConversationStorageKey())[0]?.storageKey ?? `${getConversationStorageKey()}:thread:legacy`);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyQuery, setHistoryQuery] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [planning, setPlanning] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadConversation(conversationStorageKey));
  const [broadcastWatches, setBroadcastWatches] = useState<BroadcastWatch[]>(() => loadBroadcastWatches(conversationStorageKey));
  const broadcastPollBusyRef = useRef(false);
  const [typingMessageId, setTypingMessageId] = useState<string | null>(null);
  const [typingCharacterCount, setTypingCharacterCount] = useState(0);
  const [chatError, setChatError] = useState("");
  const [historyError, setHistoryError] = useState("");
  const [applyingAction, setApplyingAction] = useState("");
  const [voiceEnabled, setVoiceEnabled] = useState(readVoicePreference);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState("");
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
  const [queueError, setQueueError] = useState("");
  const [ownerReviewUnavailable, setOwnerReviewUnavailable] = useState(false);
  const [reviewingId, setReviewingId] = useState("");
  const [reviewNote, setReviewNote] = useState<Record<string, string>>({});
  const [pendingContactImport, setPendingContactImport] = useState<PendingContactImport | null>(null);
  const [contactImporting, setContactImporting] = useState(false);
  const [stagedMedia, setStagedMedia] = useState<StagedChatMedia | null>(null);
  const [attachmentPlatform, setAttachmentPlatform] = useState<"whatsapp" | "telegram">("whatsapp");
  const [mediaUploading, setMediaUploading] = useState(false);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const cancelRecordingRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speechUrlRef = useRef<string | null>(null);
  const speechGenerationRef = useRef(0);
  const speechRequestsRef = useRef<Set<AbortController>>(new Set());

  const loadPendingActions = useCallback(async () => {
    setQueueError("");
    try {
      const response = await fetch("/api/ai-command-center/actions/pending", { headers: getAgencyAdminAuthHeaders() });
      if (!response.ok) throw new Error(await errorMessage(response));
      const body = await response.json() as { actions?: PendingAction[] };
      setPendingActions(Array.isArray(body.actions) ? body.actions : []);
      setOwnerReviewUnavailable(false);
    } catch (error) {
      setPendingActions([]);
      const message = error instanceof Error ? error.message : "Owner review items could not be loaded.";
      if (message.toLowerCase().includes("not configured as a command center owner")) {
        setOwnerReviewUnavailable(true);
        setQueueError("");
      } else setQueueError(message);
    }
  }, []);

  useEffect(() => { void loadPendingActions(); }, [loadPendingActions]);
  useEffect(() => {
    const nextAccountKey = getConversationStorageKey();
    if (nextAccountKey !== accountStorageKey) {
      const nextList = loadConversationList(nextAccountKey);
      const nextConversation = nextList[0];
      setAccountStorageKey(nextAccountKey);
      setConversationList(nextList);
      setActiveConversationId(nextConversation.id);
      setConversationStorageKey(nextConversation.storageKey);
      setMessages(loadConversation(nextConversation.storageKey));
      setBroadcastWatches(loadBroadcastWatches(nextConversation.storageKey));
    }
  }, [accountStorageKey]);
  useEffect(() => {
    try { window.localStorage.setItem(getConversationIndexKey(accountStorageKey), JSON.stringify(conversationList)); }
    catch { setHistoryError("Conversation history could not be saved in this browser."); }
  }, [accountStorageKey, conversationList]);
  useEffect(() => {
    const syncHistory = (event: Event) => {
      const detail = (event as CustomEvent<{ historyKey?: string; messages?: ChatMessage[] }>).detail;
      if ((detail?.historyKey !== conversationStorageKey && detail?.historyKey !== accountStorageKey) || !Array.isArray(detail.messages)) return;
      const incoming = detail.messages.filter((item) => item && typeof item.id === "string" && (item.role === "assistant" || item.role === "user") && typeof item.content === "string").slice(-100);
      setMessages((current) => JSON.stringify(current) === JSON.stringify(incoming) ? current : incoming.length ? incoming : [initialMessage]);
    };
    window.addEventListener(COMMAND_CENTER_HISTORY_EVENT, syncHistory);
    return () => window.removeEventListener(COMMAND_CENTER_HISTORY_EVENT, syncHistory);
  }, [accountStorageKey, conversationStorageKey]);
  useEffect(() => {
    try {
      const safeMessages = messages.slice(-100).map(({ id, role, content }) => ({ id, role, content }));
      window.localStorage.setItem(conversationStorageKey, JSON.stringify(safeMessages));
      window.dispatchEvent(new CustomEvent(COMMAND_CENTER_HISTORY_EVENT, { detail: { historyKey: conversationStorageKey, messages } }));
      window.localStorage.setItem(accountStorageKey, JSON.stringify(safeMessages));
      window.dispatchEvent(new CustomEvent(COMMAND_CENTER_HISTORY_EVENT, { detail: { historyKey: accountStorageKey, messages } }));
      setHistoryError("");
    } catch {
      setHistoryError("Chat history couldn’t be saved in this browser.");
    }
  }, [messages, conversationStorageKey, accountStorageKey]);
  useEffect(() => {
    try { window.localStorage.setItem(getBroadcastWatchKey(conversationStorageKey), JSON.stringify(broadcastWatches)); } catch { /* Chat history storage warning covers unavailable local storage. */ }
  }, [broadcastWatches, conversationStorageKey]);
  useEffect(() => {
    if (!broadcastWatches.length) return;
    let stopped = false;
    const checkBroadcasts = async () => {
      if (broadcastPollBusyRef.current) return;
      broadcastPollBusyRef.current = true;
      try {
        const channels = [...new Set(broadcastWatches.map((item) => item.channel))];
        const snapshots = await Promise.all(channels.map(async (channel) => {
          const path = channel === "whatsapp" ? "/api/whatsapp-broadcast/campaigns" : "/api/telegram/broadcasts";
          const response = await fetch(path, { headers: getAgencyAdminAuthHeaders() });
          if (!response.ok) return { channel, records: [] as Array<Record<string, unknown>> };
          const body = await response.json() as { campaigns?: Array<Record<string, unknown>>; broadcasts?: Array<Record<string, unknown>> };
          return { channel, records: channel === "whatsapp" ? body.campaigns ?? [] : body.broadcasts ?? [] };
        }));
        if (stopped) return;
        const completed: Array<{ watch: BroadcastWatch; record: Record<string, unknown> }> = [];
        for (const watch of broadcastWatches) {
          const record = snapshots.find((snapshot) => snapshot.channel === watch.channel)?.records.find((item) => String(item.id) === watch.id);
          const status = String(record?.[watch.channel === "whatsapp" ? "campaign_status" : "status"] ?? "").toLowerCase();
          if (record && ["completed", "failed", "cancelled"].includes(status)) completed.push({ watch, record });
        }
        if (completed.length) {
          const ids = new Set(completed.map(({ watch }) => `${watch.channel}:${watch.id}`));
          setBroadcastWatches((current) => current.filter((watch) => !ids.has(`${watch.channel}:${watch.id}`)));
          setMessages((current) => {
            const additions = completed.filter(({ watch }) => !current.some((message) => message.id === `broadcast-notice:${watch.channel}:${watch.id}`)).map(({ watch, record }) => {
              const status = String(record[watch.channel === "whatsapp" ? "campaign_status" : "status"]).toLowerCase();
              const sent = Number(record[watch.channel === "whatsapp" ? "sent_count" : "successful_count"] ?? 0);
              const failed = Number(record[watch.channel === "whatsapp" ? "failed_count" : "failed_count"] ?? 0);
              const label = watch.channel === "whatsapp" ? "WhatsApp" : "Telegram";
              const content = status === "completed"
                ? `${label} broadcast completed: ${sent} sent, ${failed} failed. Check the broadcast history for recipient details.`
                : `${label} broadcast ${status}. ${sent} sent, ${failed} failed. Check the broadcast history for details.`;
              return { id: `broadcast-notice:${watch.channel}:${watch.id}`, role: "assistant" as const, content };
            });
            return additions.length ? [...current, ...additions].slice(-100) : current;
          });
        }
      } catch { /* A later poll can retry when the status service is available. */ }
      finally { broadcastPollBusyRef.current = false; }
    };
    void checkBroadcasts();
    const timer = window.setInterval(() => void checkBroadcasts(), 15_000);
    return () => { stopped = true; window.clearInterval(timer); };
  }, [broadcastWatches]);
  useEffect(() => {
    if (!typingMessageId || voiceEnabled) return;
    const typingMessage = messages.find((item) => item.id === typingMessageId);
    if (!typingMessage) return;
    const timer = window.setInterval(() => {
      setTypingCharacterCount((current) => {
        const next = Math.min(current + 5, typingMessage.content.length);
        if (next >= typingMessage.content.length) {
          window.clearInterval(timer);
          setTypingMessageId(null);
        }
        return next;
      });
    }, 14);
    return () => window.clearInterval(timer);
  }, [typingMessageId, messages, voiceEnabled]);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages, pendingActions, planning, voiceStatus]);

  useEffect(() => {
    const firstPrompt = messages.find((message) => message.role === "user")?.content.trim();
    setConversationList((current) => current.map((conversation) => conversation.id !== activeConversationId ? conversation : {
      ...conversation,
      title: conversation.title === "New chat" && firstPrompt ? firstPrompt.slice(0, 48) : conversation.title,
      updatedAt: Date.now(),
    }));
  }, [messages, activeConversationId]);

  const makeNewConversation = (): SavedConversation => {
    const id = crypto.randomUUID();
    return { id, title: "New chat", updatedAt: Date.now(), storageKey: accountStorageKey + ":thread:" + id };
  };

  const startNewConversation = () => {
    if (planning) return;
    if (stagedMedia?.previewUrl) URL.revokeObjectURL(stagedMedia.previewUrl);
    setStagedMedia(null);
    const next = makeNewConversation();
    setConversationList((current) => [next, ...current].slice(0, 100));
    setActiveConversationId(next.id);
    setConversationStorageKey(next.storageKey);
    setMessages([initialMessage]);
    setBroadcastWatches(loadBroadcastWatches(next.storageKey));
    setInstruction("");
    setChatError("");
    setHistoryOpen(false);
    setHelpOpen(false);
  };

  const openSavedConversation = (conversation: SavedConversation) => {
    if (planning) return;
    if (stagedMedia?.previewUrl) URL.revokeObjectURL(stagedMedia.previewUrl);
    setStagedMedia(null);
    setActiveConversationId(conversation.id);
    setConversationStorageKey(conversation.storageKey);
    setMessages(loadConversation(conversation.storageKey));
    setBroadcastWatches(loadBroadcastWatches(conversation.storageKey));
    setInstruction("");
    setChatError("");
    setHelpOpen(false);
  };

  const deleteConversation = (conversationId = activeConversationId) => {
    if (planning && conversationId === activeConversationId) return;
    const target = conversationList.find((conversation) => conversation.id === conversationId);
    if (!target || !window.confirm("Delete " + target.title + " from this browser? This cannot be undone.")) return;
    window.localStorage.removeItem(target.storageKey);
    window.localStorage.removeItem(getBroadcastWatchKey(target.storageKey));
    const remaining = conversationList.filter((conversation) => conversation.id !== target.id);
    if (target.id === activeConversationId) {
      if (remaining.length) {
        setConversationList(remaining);
        openSavedConversation(remaining[0]);
      } else {
        const next = makeNewConversation();
        setConversationList([next]);
        setActiveConversationId(next.id);
        setConversationStorageKey(next.storageKey);
        setMessages([initialMessage]);
        setBroadcastWatches([]);
      }
    } else setConversationList(remaining);
  };



  useEffect(() => () => {
    if (stagedMedia?.previewUrl) URL.revokeObjectURL(stagedMedia.previewUrl);
  }, [stagedMedia]);

  const handleAttachmentSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setChatError("");
    if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
      const isImage = file.type === "image/jpeg" || file.type === "image/png";
      const isVideo = file.type === "video/mp4" || file.type === "video/3gpp" || file.type === "video/3gp";
      if (attachmentPlatform === "whatsapp" && !isImage && !isVideo) { setChatError("For WhatsApp use a JPEG/PNG image or MP4/3GP video."); return; }
      const maxBytes = attachmentPlatform === "telegram" ? 10 * 1024 * 1024 : isImage ? 5 * 1024 * 1024 : 16 * 1024 * 1024;
      if (file.size <= 0 || file.size > maxBytes) { setChatError(attachmentPlatform === "telegram" ? "Telegram media must be 10 MB or smaller." : isImage ? "Images must be 5 MB or smaller." : "Videos must be 16 MB or smaller."); return; }
      if (stagedMedia?.previewUrl) URL.revokeObjectURL(stagedMedia.previewUrl);
      setStagedMedia({ file, platform: attachmentPlatform, mediaType: isImage ? "image" : "video", previewUrl: URL.createObjectURL(file) });
      return;
    }
    if (!/\.(csv|xlsx|xls)$/i.test(file.name)) { setChatError("Attach a CSV/Excel contact list or a JPEG/PNG/MP4/3GP campaign attachment."); return; }
    if (file.size > 10 * 1024 * 1024) { setChatError("Contact files must be 10 MB or smaller."); return; }
    try {
      const workbook = /\.csv$/i.test(file.name)
        ? XLSX.read(await file.text(), { type: "string" })
        : XLSX.read(await file.arrayBuffer(), { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const tableRows = sheet ? XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", raw: false }) : [];
      const normalizeHeader = (value: unknown) => String(value ?? "").trim().toLowerCase().replace(/[_-]+/g, " ");
      const headers = (tableRows[0] ?? []).map(normalizeHeader);
      const index = (names: string[]) => headers.findIndex((header) => names.includes(header));
      let nameIndex = index(["name", "full name", "maid name", "helper name", "contact name"]);
      let phoneIndex = index(["phone", "phone number", "phone no", "mobile", "mobile number", "whatsapp", "whatsapp number", "contact number"]);
      const hasHeader = nameIndex >= 0 || phoneIndex >= 0;
      const rows = hasHeader ? tableRows.slice(1) : tableRows;
      const normalizePhone = (value: string) => {
        const cleaned = value.trim().replace(/[^\d+]/g, "");
        const digits = cleaned.replace(/\D/g, "");
        return digits.length >= 8 && digits.length <= 15 ? cleaned : "";
      };
      let embeddedPhoneColumn = -1;
      if (phoneIndex < 0) {
        const width = Math.max(0, ...rows.map((row) => row.length));
        const ranked = Array.from({ length: width }, (_, column) => ({ column, matches: rows.reduce((count, row) => count + Number(Boolean(normalizePhone(String(row[column] ?? "")))), 0) })).sort((a, b) => b.matches - a.matches);
        if (ranked[0]?.matches) { phoneIndex = ranked[0].column; embeddedPhoneColumn = phoneIndex; }
      }
      if (phoneIndex < 0) throw new Error("I couldn’t find a phone column. Add a phone, mobile, or WhatsApp number column.");
      if (nameIndex < 0 && embeddedPhoneColumn < 0) throw new Error("I couldn’t find a name column. Add a name or full name column.");
      if (nameIndex < 0) nameIndex = embeddedPhoneColumn;
      const emailIndex = index(["email", "email address"]);
      const companyIndex = index(["company", "organization", "organisation"]);
      const tagsIndex = index(["tags", "tag"]);
      const consentIndex = index(["consent", "consent status", "whatsapp consent"]);
      const consentSourceIndex = index(["consent source", "opt in source", "opt-in source"]);
      const contacts = new Map<string, ContactImportRow>();
      let skippedCount = 0;
      for (const row of rows) {
        const value = (column: number) => column >= 0 ? String(row[column] ?? "").trim() : "";
        const phoneCell = value(phoneIndex);
        const phone = normalizePhone(phoneCell);
        const embeddedPhone = embeddedPhoneColumn === phoneIndex ? phone : "";
        const extractedName = embeddedPhone ? phoneCell.replace(embeddedPhone, "").replace(/^[\s,;|:()[\].-]+|[\s,;|:()[\].-]+$/g, "").trim() : "";
        const name = extractedName || (nameIndex !== embeddedPhoneColumn ? value(nameIndex) : "");
        if (!name || !phone) { skippedCount += 1; continue; }
        const consentValue = value(consentIndex).toLowerCase().replace(/[_\s]+/g, "-");
        const consentSource = value(consentSourceIndex).slice(0, 240);
        const consentStatus: ContactImportRow["consent_status"] = consentValue === "subscribed" && consentSource.length >= 5
          ? "subscribed"
          : ["opted-out", "unsubscribed", "opt-out"].includes(consentValue) ? "opted_out" : "not_consented";
        const tags = value(tagsIndex) ? value(tagsIndex).split(/[;|,]/).map((tag) => tag.trim()).filter(Boolean).slice(0, 29) : ["Imported"];
        const phoneKey = phone.replace(/\D/g, "");
        if (!contacts.has(phoneKey)) contacts.set(phoneKey, { full_name: name.slice(0, 120), phone_number: phone, email: value(emailIndex).slice(0, 240), company: value(companyIndex).slice(0, 160), tags, consent_status: consentStatus, consent_source: consentSource });
        else skippedCount += 1;
      }
      const importedContacts = [...contacts.values()];
      if (!importedContacts.length) throw new Error("No rows had both a usable name and phone number.");
      if (importedContacts.length > 1000) throw new Error("This file has more than 1,000 valid contacts. Split it into smaller files to import safely.");
      setPendingContactImport({ fileName: file.name, contacts: importedContacts, skippedCount });
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: "user", content: `I attached ${file.name} to import WhatsApp contacts.` }]);
    } catch (error) {
      setChatError(error instanceof Error ? error.message : "Couldn’t read that contact file.");
    }
  };

  const importPendingContacts = async () => {
    if (!pendingContactImport || contactImporting) return;
    setContactImporting(true);
    setChatError("");
    try {
      const response = await fetch("/api/whatsapp-broadcast/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAgencyAdminAuthHeaders() },
        body: JSON.stringify({ contacts: pendingContactImport.contacts }),
      });
      const result = await response.json().catch(() => ({})) as { contacts?: unknown[]; error?: string };
      if (!response.ok) throw new Error(result.error || "The contact file couldn’t be imported.");
      const importedCount = Array.isArray(result.contacts) ? result.contacts.length : pendingContactImport.contacts.length;
      const skippedCount = pendingContactImport.skippedCount;
      setPendingContactImport(null);
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: "assistant", content: `Imported ${importedCount} contacts from the spreadsheet${skippedCount ? `. Skipped ${skippedCount} invalid or duplicate rows` : ""}. Contacts without documented WhatsApp opt-in remain ineligible for broadcasts.` }]);
    } catch (error) {
      setChatError(error instanceof Error ? error.message : "The contact file couldn’t be imported.");
    } finally {
      setContactImporting(false);
    }
  };

  const stopSpeaking = useCallback(() => {
    speechGenerationRef.current += 1;
    speechRequestsRef.current.forEach((controller) => controller.abort());
    speechRequestsRef.current.clear();
    audioRef.current?.pause();
    audioRef.current = null;
    if (speechUrlRef.current) URL.revokeObjectURL(speechUrlRef.current);
    speechUrlRef.current = null;
    setIsSpeaking(false);
  }, []);

  useEffect(() => {
    const syncVoice = (event: Event) => {
      const enabled = event instanceof StorageEvent
        ? readVoicePreference()
        : (event as CustomEvent<{ enabled?: boolean }>).detail?.enabled;
      if (typeof enabled !== "boolean") return;
      setVoiceEnabled(enabled);
      if (!enabled) { stopSpeaking(); setTypingMessageId(null); }
    };
    window.addEventListener(COMMAND_CENTER_VOICE_EVENT, syncVoice);
    window.addEventListener("storage", syncVoice);
    return () => { window.removeEventListener(COMMAND_CENTER_VOICE_EVENT, syncVoice); window.removeEventListener("storage", syncVoice); };
  }, [stopSpeaking]);

  useEffect(() => () => {
    speechGenerationRef.current += 1;
    speechRequestsRef.current.forEach((controller) => controller.abort());
    speechRequestsRef.current.clear();
    audioRef.current?.pause();
    if (speechUrlRef.current) URL.revokeObjectURL(speechUrlRef.current);
    const recorder = mediaRecorderRef.current;
    if (recorder?.state === "recording") recorder.stop();
  }, []);

  const speakReply = async (text: string) => {
    stopSpeaking();
    const generation = speechGenerationRef.current;
    const fullChunks = splitSpeechChunks(text);
    if (!fullChunks.length) return;
    const firstChunkParts = splitSpeechChunks(fullChunks[0], 80);
    const firstChunk = firstChunkParts.shift();
    const remainingText = [...firstChunkParts, ...fullChunks.slice(1)].join(" ");
    const chunks = [firstChunk, ...splitSpeechChunks(remainingText)].filter((chunk): chunk is string => Boolean(chunk));
    const normalizedLength = text.replace(/\s+/g, " ").trim().length;
    let spokenCharacters = 0;
    const requestAudio = async (chunk: string): Promise<{ blob: Blob } | { error: unknown }> => {
      const controller = new AbortController();
      speechRequestsRef.current.add(controller);
      const timeout = window.setTimeout(() => controller.abort(new DOMException("Speech request timed out", "TimeoutError")), 60_000);
      try {
        const response = await fetch("/api/ai/command-center/speak", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...getAgencyAdminAuthHeaders() },
          body: JSON.stringify({ text: chunk }),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(await errorMessage(response));
        return { blob: await response.blob() };
      } catch (error) {
        return { error };
      } finally {
        window.clearTimeout(timeout);
        speechRequestsRef.current.delete(controller);
      }
    };

    setIsSpeaking(true);
    try {
      let audioPromise = requestAudio(chunks[0]);
      for (const [chunkIndex, chunk] of chunks.entries()) {
        if (generation !== speechGenerationRef.current) return;
        const audioResult = await audioPromise;
        if ("error" in audioResult) throw audioResult.error;
        if (generation !== speechGenerationRef.current) return;
        const nextAudioPromise = chunkIndex < chunks.length - 1 ? requestAudio(chunks[chunkIndex + 1]) : null;
        const url = URL.createObjectURL(audioResult.blob);
        speechUrlRef.current = url;
        const audio = new Audio(url);
        audioRef.current = audio;
        const chunkStart = spokenCharacters;
        const revealProgress = () => {
          if (generation !== speechGenerationRef.current) return;
          const fraction = audio.duration > 0 ? Math.min(audio.currentTime / audio.duration, 1) : 0;
          const progress = Math.min(chunkStart + chunk.length * fraction, normalizedLength);
          const fasterProgress = (progress / Math.max(normalizedLength, 1)) * text.length * 2.2;
          setTypingCharacterCount(Math.min(text.length, Math.max(1, Math.floor(fasterProgress))));
        };
        audio.onplay = revealProgress;
        audio.ontimeupdate = revealProgress;
        try {
          await new Promise<void>((resolve, reject) => {
            audio.onended = () => {
              spokenCharacters = Math.min(chunkStart + chunk.length + (chunkIndex < chunks.length - 1 ? 1 : 0), normalizedLength);
              const fasterProgress = (spokenCharacters / Math.max(normalizedLength, 1)) * text.length * 2.2;
              setTypingCharacterCount(Math.min(text.length, Math.ceil(fasterProgress)));
              resolve();
            };
            audio.onpause = () => { if (generation !== speechGenerationRef.current) resolve(); };
            audio.onerror = () => reject(new Error("The browser could not play the generated audio."));
            void audio.play().catch(reject);
          });
        } finally {
          if (speechUrlRef.current === url) { URL.revokeObjectURL(url); speechUrlRef.current = null; }
        }
        if (audioRef.current === audio) audioRef.current = null;
        if (generation !== speechGenerationRef.current) return;
        if (nextAudioPromise) audioPromise = nextAudioPromise;
      }
      if (generation === speechGenerationRef.current) {
        setTypingCharacterCount(text.length);
        setTypingMessageId(null);
        setIsSpeaking(false);
      }
    } catch (error) {
      if (generation !== speechGenerationRef.current) return;
      setTypingMessageId(null);
      setIsSpeaking(false);
      const detail = error instanceof DOMException && error.name === "AbortError" ? "Speech generation was interrupted. Please try again." : error instanceof Error ? error.message : "Voice playback failed";
      setChatError(`The reply is in chat, but voice playback failed: ${detail}`);
    }
  };

  const sendMessage = async (rawText: string) => {
    const trimmed = rawText.trim();
    if ((!trimmed && !stagedMedia) || planning) return;
    setPlanning(true);
    setChatError("");
    setVoiceStatus("");
    setInstruction("");
    let uploadedMedia: { platform: "whatsapp" | "telegram"; mediaType: "image" | "video"; mediaUrl?: string; mediaFileId?: string; mediaMimeType?: string; mediaFileName?: string } | undefined;
    if (stagedMedia) {
      if (!stagedMedia.mediaUrl && !stagedMedia.mediaFileId) {
        setMediaUploading(true);
        try {
          const form = new FormData();
          form.set("file", stagedMedia.file);
          const uploadResponse = await fetch(stagedMedia.platform === "telegram" ? "/api/telegram/media" : "/api/whatsapp-broadcast/media", { method: "POST", headers: getAgencyAdminAuthHeaders(), body: form });
          const uploaded = await uploadResponse.json().catch(() => ({})) as { mediaUrl?: string; mediaFileId?: string; mediaType?: "image" | "video"; mediaMimeType?: string; mimeType?: string; mediaFileName?: string; fileName?: string; error?: string };
          const mediaReference = stagedMedia.platform === "telegram" ? uploaded.mediaFileId : uploaded.mediaUrl;
          if (!uploadResponse.ok || !mediaReference || uploaded.mediaType !== stagedMedia.mediaType) throw new Error(uploaded.error || `Could not upload the ${stagedMedia.platform} attachment.`);
          uploadedMedia = { platform: stagedMedia.platform, mediaType: uploaded.mediaType, ...(uploaded.mediaUrl ? { mediaUrl: uploaded.mediaUrl } : {}), ...(uploaded.mediaFileId ? { mediaFileId: uploaded.mediaFileId } : {}), mediaMimeType: uploaded.mediaMimeType || uploaded.mimeType, mediaFileName: uploaded.mediaFileName || uploaded.fileName || stagedMedia.file.name };
          setStagedMedia((current) => current ? { ...current, ...uploadedMedia } : current);
        } catch (error) {
          setPlanning(false);
          setMediaUploading(false);
          setChatError(error instanceof Error ? error.message : "Could not upload the campaign attachment.");
          return;
        } finally { setMediaUploading(false); }
      } else uploadedMedia = { platform: stagedMedia.platform, mediaType: stagedMedia.mediaType, mediaUrl: stagedMedia.mediaUrl, mediaFileId: stagedMedia.mediaFileId, mediaMimeType: stagedMedia.mediaMimeType, mediaFileName: stagedMedia.mediaFileName };
    }
    const userContent = [trimmed, uploadedMedia ? `[${uploadedMedia.platform === "telegram" ? "Telegram" : "WhatsApp"} broadcast attachment: ${uploadedMedia.mediaFileName || stagedMedia?.file.name}]` : ""].filter(Boolean).join("\n");
    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", content: userContent || "Please prepare a broadcast using this attachment." };
    setMessages((current) => [...current, userMessage]);
    try {
      const priorChats = [...conversationList]
        .filter((conversation) => conversation.id !== activeConversationId)
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .reverse();
      const memoryLines = priorChats.flatMap((savedChat) => loadConversation(savedChat.storageKey)
        .filter((message) => message.id !== "welcome")
        .map((message) => `${savedChat.title} | ${message.role === "user" ? "You" : "Assistant"}: ${message.content.replace(/\s+/g, " ").slice(0, 420)}`));
      const memoryText = memoryLines.join("\n").slice(-6500);
      const memoryMessage: ChatMessage[] = memoryText ? [{ id: "saved-history-memory", role: "assistant", content: `Continuity notes from other saved chats for this same signed-in agency account. Treat these as background context only; do not resume an old action unless the current request asks. The current conversation takes priority.\n${memoryText}` }] : [];
      const currentMessages = [...messages.slice(-90), userMessage];
      let remainingChars = 15_000;
      const boundedCurrentMessages = currentMessages.slice().reverse().flatMap((message) => {
        if (remainingChars <= 0) return [];
        const content = message.content.slice(-remainingChars);
        remainingChars -= content.length;
        return content ? [{ ...message, content }] : [];
      }).reverse();
      const latestUserMessage = boundedCurrentMessages.pop();
      const conversation = [...boundedCurrentMessages, ...memoryMessage, ...(latestUserMessage ? [latestUserMessage] : [])];
      const response = await fetch("/api/ai/command-center/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAgencyAdminAuthHeaders() },
        body: JSON.stringify({ messages: conversation.map(({ role, content }) => ({ role, content })), ...(uploadedMedia ? { attachment: uploadedMedia } : {}) }),
        signal: AbortSignal.timeout(55_000),
      });
      if (!response.ok) throw new Error(await errorMessage(response));
      const body = await response.json() as { reply?: unknown; actions?: CommandCenterAction[]; error?: string };
      const reply = normalizeAssistantReply(body.reply);
      if (!reply) throw new Error(body.error || "The assistant did not return a reply.");
      const assistantMessage: ChatMessage = { id: crypto.randomUUID(), role: "assistant", content: reply, actions: Array.isArray(body.actions) ? body.actions : [] };
      setTypingMessageId(assistantMessage.id);
      setTypingCharacterCount(0);
      setMessages((current) => [...current, assistantMessage]);
      if (voiceEnabled) void speakReply(plainAssistantText(reply));
    } catch (error) {
      setInstruction(trimmed);
      setChatError(error instanceof Error ? error.message : "I couldn’t get a reply. Please try again.");
    } finally {
      setPlanning(false);
    }
  };

  const submitMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void sendMessage(instruction);
  };

  const cancelChatAction = (action: CommandCenterAction) => {
    const key = JSON.stringify(action);
    setMessages((current) => current.map((message) => ({ ...message, actions: message.actions?.filter((item) => JSON.stringify(item) !== key) })));
  };

  const applyCommandAction = async (action: CommandCenterAction) => {
    const key = JSON.stringify(action);
    if (applyingAction) return;
    if (action.type === "navigate_to_page") {
      const pages: Record<string, string> = { dashboard: "/dashboard", add_maid: "/add-maid", manage_maids: "/edit-maids", maids: "/edit-maids", agency_profile: "/agency-profile", requests: "/requests", enquiries: "/enquiry", applicants: "/recruitment", contracts: "/employment-contracts", operations: "/operations-center", operations_center: "/operations-center", knowledge_library: "/operations-center", interviews: "/maid-interviews", maid_interviews: "/maid-interviews", ai_command_center: "/ai-command-center", ai_hr_interviewer: "/ai-hr-interviewer", messages: "/chat-support", documents: "/contractor-tasks", reports: "/reports", security: "/change-password", settings: "/settings", referral_leads: "/referral-leads", telegram_broadcast: "/telegram-broadcast", whatsapp_broadcast: "/whatsapp-broadcast", ai_agents: "/ai-agents", ai_marketing: "/ai-marketing" };
      if (action.destination && pages[action.destination]) window.location.assign(adminPath(pages[action.destination]));
      else setChatError("That page isn’t available from this assistant.");
      return;
    }
    if (action.type === "open_maid_profile") {
      if (action.maidReferenceCode) window.location.assign(adminPath(`/maid/${encodeURIComponent(action.maidReferenceCode)}`));
      else setChatError("I couldn’t verify which profile to open.");
      return;
    }

    let endpoint = "";
    let method = "POST";
    let payload: Record<string, unknown> | undefined;
    if (action.type === "website_api_action") {
      if (!action.method || !action.endpoint || !action.summary) { setChatError("This proposed website action is incomplete."); return; }
      endpoint = action.endpoint;
      method = action.method;
      payload = action.apiBody;
    } else if (action.type === "approve_applicant" || action.type === "reject_applicant" || action.type === "assign_interview") {
      if (!action.applicationId) { setChatError("I couldn’t verify the applicant record."); return; }
      endpoint = "/api/ats/bulk-actions";
      payload = { applicationIds: [action.applicationId], action: action.type === "approve_applicant" ? "approve" : action.type === "reject_applicant" ? "reject" : "assign_interview" };
    } else if (action.type === "draft_email") {
      if (!action.recipientKind || !action.recipientId || !action.recipientEmail || !action.subject || !action.body) { setChatError("The email draft is missing recipient or message details."); return; }
      endpoint = "/api/ai/command-center/send-email";
      payload = { recipientKind: action.recipientKind, recipientId: action.recipientId, expectedRecipientEmail: action.recipientEmail, subject: action.subject, body: action.body };
    } else return;

    setApplyingAction(key);
    setChatError("");
    try {
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json", ...getAgencyAdminAuthHeaders() },
        ...(payload ? { body: JSON.stringify(payload) } : {}),
      });
      const result = await response.json().catch(() => ({})) as { error?: string; message?: string; warning?: string; accepted?: boolean; scheduled?: boolean; scheduledAt?: string; recipientCount?: number; broadcastId?: string; interview?: { candidate_name?: string; maid_reference_code?: string; scheduled_at?: string }; campaign?: { id?: string; campaign_status?: string; total_recipients?: number; scheduled_at?: string } };
      if (!response.ok && !result.campaign) throw new Error(result.error || result.warning || result.message || "The website couldn’t complete that task.");
      const completion = result.warning
        ? `The campaign was saved, but delivery needs attention: ${result.warning}`
        : result.accepted && action.endpoint === "/api/telegram/broadcasts"
          ? `Telegram broadcast queued for ${result.recipientCount ?? "the active"} active, consented subscribers.`
        : result.scheduled && action.endpoint === "/api/telegram/broadcasts"
          ? `Telegram broadcast scheduled for ${new Intl.DateTimeFormat("en-SG", { timeZone: "Asia/Singapore", dateStyle: "medium", timeStyle: "short" }).format(new Date(result.scheduledAt || String(action.apiBody?.scheduledAt || "")))} Singapore time (${result.recipientCount ?? "active"} eligible subscribers at scheduling time). Consent will be checked again before sending.`
        : result.campaign?.campaign_status === "scheduled"
          ? `WhatsApp broadcast scheduled for ${new Intl.DateTimeFormat("en-SG", { timeZone: "Asia/Singapore", dateStyle: "medium", timeStyle: "short" }).format(new Date(result.campaign.scheduled_at || String(action.apiBody?.scheduledAt || "")))} Singapore time (${result.campaign.total_recipients ?? "eligible"} eligible contacts at scheduling time). Consent will be checked again before sending.`
        : result.interview && action.endpoint === "/api/operations-board/maid-interviews"
          ? `Interview scheduled for ${result.interview.candidate_name || result.interview.maid_reference_code || "the selected profile"}. No invitation was sent; send invitations separately from the interview page.`
        : result.campaign?.campaign_status
          ? `WhatsApp campaign queued (${result.campaign.total_recipients ?? "eligible"} eligible recipients). Status: ${result.campaign.campaign_status}. Check campaign activity for delivery results.`
          : result.message || action.summary || "Done. The website confirmed the change.";
      if ((action.endpoint === "/api/whatsapp-broadcast/campaigns" && result.campaign) || (action.endpoint === "/api/telegram/broadcasts" && (result.accepted || result.scheduled))) setStagedMedia(null);
      const watch = action.endpoint === "/api/whatsapp-broadcast/campaigns" && result.campaign?.id
        ? { channel: "whatsapp" as const, id: result.campaign.id }
        : action.endpoint === "/api/telegram/broadcasts" && result.broadcastId
          ? { channel: "telegram" as const, id: result.broadcastId }
          : null;
      if (watch && (result.scheduled || result.accepted || ["scheduled", "queued", "sending"].includes(String(result.campaign?.campaign_status ?? "").toLowerCase()))) {
        setBroadcastWatches((current) => current.some((item) => item.channel === watch.channel && item.id === watch.id) ? current : [...current, watch].slice(-30));
        setMessages((current) => [...current, { id: crypto.randomUUID(), role: "assistant", content: "I’ll keep checking this broadcast and update this chat when its delivery results are complete. Keep the Command Center open to see the update." }]);
      }
      setMessages((current) => [...current.map((message) => ({ ...message, actions: message.actions?.filter((item) => JSON.stringify(item) !== key) })), { id: crypto.randomUUID(), role: "assistant", content: completion }]);
    } catch (error) {
      setChatError(error instanceof Error ? error.message : "The website couldn’t complete that task.");
    } finally {
      setApplyingAction("");
    }
  };

  const reviewAction = async (action: PendingAction, decision: "approved" | "rejected") => {
    if (reviewingId) return;
    setReviewingId(action.id);
    setQueueError("");
    try {
      const response = await fetch(`/api/ai-command-center/actions/${encodeURIComponent(action.id)}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAgencyAdminAuthHeaders() },
        body: JSON.stringify({ decision, payloadHash: action.payload_hash, note: reviewNote[action.id] ?? "" }),
      });
      if (!response.ok) throw new Error(await errorMessage(response));
      await loadPendingActions();
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: "assistant", content: `Owner decision recorded as ${decision}. This review record does not itself run an external action.` }]);
    } catch (error) {
      setQueueError(error instanceof Error ? error.message : "Could not save the owner decision.");
    } finally {
      setReviewingId("");
    }
  };

  const toggleRecording = async () => {
    if (isRecording) { mediaRecorderRef.current?.stop(); return; }
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) throw new Error("Voice recording is not supported in this browser.");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      cancelRecordingRef.current = false;
      const chunks: BlobPart[] = [];
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      recorder.onerror = () => {
        stream.getTracks().forEach((track) => track.stop());
        setIsRecording(false);
        setVoiceStatus("");
        setChatError("Recording failed. Please try again.");
      };
      recorder.onstop = async () => {
        setIsRecording(false);
        stream.getTracks().forEach((track) => track.stop());
        if (cancelRecordingRef.current) { cancelRecordingRef.current = false; setVoiceStatus(""); return; }
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        if (!blob.size) { setVoiceStatus(""); setChatError("No audio was recorded. Please try again."); return; }
        setVoiceStatus("Transcribing your voice…");
        try {
          const form = new FormData();
          form.append("file", blob, "recording.webm");
          const response = await fetch("/api/integrations/media/upload-and-transcribe", { method: "POST", headers: getAgencyAdminAuthHeaders(), body: form, signal: AbortSignal.timeout(55_000) });
          const result = await response.json().catch(() => ({})) as { transcript?: string; error?: string };
          if (!response.ok || !result.transcript) throw new Error(result.error || "Speech recognition failed. Please try again.");
          setVoiceStatus("");
          await sendMessage(result.transcript);
        } catch (error) {
          setVoiceStatus("");
          setChatError(error instanceof Error ? error.message : "Could not transcribe that recording.");
        }
      };
      recorder.start();
      setChatError("");
      setIsRecording(true);
      setVoiceStatus("Listening… click the microphone to finish");
    } catch (error) {
      setChatError(error instanceof Error ? error.message : "Could not start voice recording.");
    }
  };

  const renderAction = (action: CommandCenterAction) => {
    const key = JSON.stringify(action);
    const isBroadcast = action.type === "website_api_action" && action.endpoint === "/api/whatsapp-broadcast/campaigns" && action.apiBody?.launch === true;
    const isTelegramBroadcast = action.type === "website_api_action" && action.endpoint === "/api/telegram/broadcasts";
    const isScheduledBroadcast = Boolean((isBroadcast || isTelegramBroadcast) && action.apiBody?.scheduledAt);
    const isInterviewSchedule = action.type === "website_api_action" && action.endpoint === "/api/operations-board/maid-interviews";
    const isAutoReply = action.type === "website_api_action" && action.endpoint === "/api/whatsapp-broadcast/settings" && action.apiBody?.ai_auto_reply_enabled === true;
    const isWebsiteAutoReply = action.type === "website_api_action" && action.endpoint === "/api/ai-command-center/customer-auto-replies" && action.apiBody?.enabled === true;
    const isWebsiteChatReply = action.type === "website_api_action" && action.endpoint === "/api/ai/command-center/reply-to-chat";
    const isDestructive = action.type === "website_api_action" && (action.method === "DELETE" || /\/delete(?:\/|$)|\/bulk$/i.test(action.endpoint || ""));
    return <div key={key} className="mt-4 overflow-hidden rounded-2xl border border-violet-200 bg-white shadow-sm">
      <div className="flex items-start gap-3 bg-violet-50/80 px-4 py-3">
        <div className="mt-0.5 rounded-lg bg-violet-100 p-2 text-violet-700">{isBroadcast || isAutoReply || isWebsiteAutoReply ? <ShieldCheck className="h-4 w-4" /> : <Activity className="h-4 w-4" />}</div>
        <div className="min-w-0 flex-1"><p className="text-xs font-bold uppercase tracking-wide text-violet-800">Action needs your approval</p><p className="mt-1 text-sm font-semibold leading-5 text-slate-900">{action.summary || action.label || "The assistant proposes this task."}</p></div>
      </div>
      {(isBroadcast || isTelegramBroadcast || isInterviewSchedule || isAutoReply || isWebsiteAutoReply || isWebsiteChatReply || isDestructive) && <div className="mx-4 mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-950">{isDestructive ? "This action may delete or remove website records. Review the exact target and payload below before approving." : isBroadcast ? isScheduledBroadcast ? "This schedules a WhatsApp message for automatic delivery at the displayed time. Current opt-in will be checked again before sending." : "This sends a WhatsApp message to external contacts. The server rechecks active opt-in before dispatch." : isTelegramBroadcast ? isScheduledBroadcast ? "This schedules a Telegram message for automatic delivery at the displayed time. Current consent will be checked again before sending." : "This queues a Telegram broadcast for active, consented subscribers." : isInterviewSchedule ? "This creates the interview record in the website. It does not send an invitation or reserve a calendar event." : isAutoReply ? "This enables ongoing automatic replies to incoming WhatsApp messages." : isWebsiteAutoReply ? "This enables ongoing AI replies in the selected website chat and request channels. Unclear or sensitive cases will be handed to staff." : "This sends the reply below to the selected website chat only after you approve."}</div>}
      {isWebsiteChatReply && typeof action.apiBody?.message === "string" && <div className="mx-4 mt-3 space-y-2"><p className="text-xs font-semibold text-slate-600">Website chat · recipient #{String(action.apiBody.clientId ?? "unknown")}</p><p className="whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800">{action.apiBody.message}</p></div>}
      {isBroadcast && typeof action.apiBody?.mediaUrl === "string" && action.apiBody.mediaType === "image" && <img src={action.apiBody.mediaUrl} alt="Proposed WhatsApp broadcast attachment" className="mx-4 mt-3 max-h-56 max-w-[calc(100%-2rem)] rounded-xl border border-slate-200 object-contain" />}
      {isBroadcast && typeof action.apiBody?.mediaUrl === "string" && action.apiBody.mediaType === "video" && <video src={action.apiBody.mediaUrl} controls className="mx-4 mt-3 max-h-56 max-w-[calc(100%-2rem)] rounded-xl border border-slate-200" />}
      {isTelegramBroadcast && stagedMedia?.platform === "telegram" && stagedMedia.mediaType === "image" && <img src={stagedMedia.previewUrl} alt="Proposed Telegram broadcast attachment" className="mx-4 mt-3 max-h-56 max-w-[calc(100%-2rem)] rounded-xl border border-slate-200 object-contain" />}
      {isTelegramBroadcast && stagedMedia?.platform === "telegram" && stagedMedia.mediaType === "video" && <video src={stagedMedia.previewUrl} controls className="mx-4 mt-3 max-h-56 max-w-[calc(100%-2rem)] rounded-xl border border-slate-200" />}
      <details className="mx-4 mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
        <summary className="cursor-pointer text-xs font-semibold text-slate-700">Review exact action details</summary>
        <div className="mt-2 space-y-2 text-xs text-slate-600">
          {action.type === "website_api_action" && <p className="font-mono">{action.method} {action.endpoint}</p>}
          {action.type === "draft_email" && <><p><b>To:</b> {action.recipientName || action.recipientEmail}</p><p><b>Subject:</b> {action.subject}</p><p className="whitespace-pre-wrap rounded-lg bg-white p-2">{action.body}</p></>}
          {(action.apiBody || action.applicationId) && <pre className="max-h-48 overflow-auto rounded-lg bg-slate-950 p-3 text-[11px] leading-5 text-emerald-100">{JSON.stringify(action.apiBody ?? { applicationId: action.applicationId }, null, 2)}</pre>}
        </div>
      </details>
      <div className="flex flex-wrap gap-2 px-4 py-3">
        <Button type="button" size="sm" disabled={Boolean(applyingAction)} onClick={() => void applyCommandAction(action)} className="bg-violet-700 text-white hover:bg-violet-800">
          {applyingAction === key ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
          {applyingAction === key ? "Working…" : isDestructive ? "Approve & delete" : isBroadcast ? isScheduledBroadcast ? "Approve scheduled WhatsApp broadcast" : "Approve & send" : isTelegramBroadcast ? isScheduledBroadcast ? "Approve scheduled Telegram broadcast" : "Approve & queue Telegram broadcast" : isInterviewSchedule ? "Approve & schedule interview" : isAutoReply || isWebsiteAutoReply ? "Approve & enable" : isWebsiteChatReply ? "Approve & send reply" : action.type === "draft_email" ? "Approve & send email" : action.type === "navigate_to_page" ? "Open page" : action.type === "open_maid_profile" ? "Open profile" : "Approve & apply change"}
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={Boolean(applyingAction)} onClick={() => cancelChatAction(action)} className="border-slate-300 text-slate-700"><X className="mr-1.5 h-4 w-4" />Cancel</Button>
      </div>
    </div>;
  };

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const historyItems = [...conversationList].filter((conversation) => conversation.title.toLowerCase().includes(historyQuery.trim().toLowerCase())).sort((a, b) => b.updatedAt - a.updatedAt);
  const historyGroups = [
    { title: "Today", items: historyItems.filter((conversation) => conversation.updatedAt >= todayStart) },
    { title: "Previous 7 days", items: historyItems.filter((conversation) => conversation.updatedAt < todayStart && conversation.updatedAt >= todayStart - 7 * 24 * 60 * 60 * 1000) },
    { title: "Older", items: historyItems.filter((conversation) => conversation.updatedAt < todayStart - 7 * 24 * 60 * 60 * 1000) },
  ].filter((group) => group.items.length > 0);

  return (
    <main className="cc-page relative flex h-full min-h-0 flex-1 overflow-hidden p-2 text-slate-900 sm:p-4">
      <style>{`@keyframes command-center-talk{0%,100%{transform:scaleY(.28);opacity:.55}50%{transform:scaleY(1);opacity:1}}@keyframes command-center-ring{0%,100%{transform:scale(1);opacity:.45}50%{transform:scale(1.16);opacity:.08}}@keyframes cc-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}@keyframes cc-spin{to{transform:rotate(360deg)}}@keyframes cc-appear{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}.cc-page{background:#f7f7f8}.cc-shell{position:relative;isolation:isolate;background:#fff;border-color:#e5e7eb;box-shadow:0 1px 3px rgba(0,0,0,.04)}.cc-shell:before{content:'';position:absolute;inset:0;z-index:-1;pointer-events:none;opacity:.2;background-image:linear-gradient(rgba(148,163,255,.075) 1px,transparent 1px),linear-gradient(90deg,rgba(148,163,255,.075) 1px,transparent 1px);background-size:34px 34px;mask-image:linear-gradient(to bottom,black,transparent 78%)}.cc-header{background:rgba(255,255,255,.94);border-color:#eceef1;backdrop-filter:blur(18px)}.cc-orb{position:relative;display:grid;place-items:center;isolation:isolate;background:radial-gradient(circle at 35% 27%,#a89cff 0,#673df5 26%,#26145f 59%,#10132a 78%);box-shadow:0 0 28px rgba(124,91,255,.55),inset 0 0 22px rgba(255,255,255,.22)}.cc-orb:before,.cc-orb:after{content:'';position:absolute;inset:-5px;border-radius:inherit;border:1px solid rgba(87,224,255,.68);transform:rotate(-24deg) scaleX(1.22);z-index:-1}.cc-orb:after{inset:-9px;border-color:rgba(190,119,255,.45);transform:rotate(38deg) scaleX(1.2)}.cc-orb-core{filter:drop-shadow(0 0 9px rgba(255,255,255,.85))}.cc-orb-live{animation:cc-float 3s ease-in-out infinite}.cc-orb-live:before{animation:cc-spin 8s linear infinite}.cc-orb-live:after{animation:cc-spin 12s linear infinite reverse}.command-center-wave{transform-origin:center;animation:command-center-talk .72s ease-in-out infinite}.command-center-ring{animation:command-center-ring 1.4s ease-in-out infinite}.cc-transcript{background:#fff}.cc-message{animation:cc-appear .26s ease-out both}.cc-assistant-bubble{color:#252525;background:transparent;border:1px solid transparent;box-shadow:none}.cc-user-bubble{color:#242424;background:#f4f4f5;box-shadow:none}.cc-composer{background:rgba(255,255,255,.98);border-color:#eceef1}.cc-input-wrap{background:#fff;border-color:#d9dce2;box-shadow:0 2px 10px rgba(0,0,0,.05)}.cc-input-wrap:focus-within{border-color:#9b8afb;box-shadow:0 0 0 3px rgba(124,95,255,.12)}.cc-icon-button{color:#687080}.cc-icon-button:hover{color:#5b3cd6;background:#f3f0ff}.cc-prompt{border:1px solid #e2e4e9;background:#fff;transition:all .2s ease}.cc-prompt:hover{transform:translateY(-2px);border-color:#b7a8ff;background:#faf9ff;box-shadow:0 5px 16px rgba(74,56,130,.08)}.cc-wave-glow{filter:drop-shadow(0 0 5px #a78bfa)}@media(prefers-reduced-motion:reduce){.command-center-wave,.command-center-ring,.cc-orb-live,.cc-orb-live:before,.cc-orb-live:after,.cc-message{animation:none!important}.cc-prompt{transition:none}}`}</style>
      <style>{`@keyframes cc-blue-wave{0%,100%{transform:scaleY(.16);opacity:.45}50%{transform:scaleY(1);opacity:1}}@keyframes cc-blue-ring{0%{transform:scale(.82);opacity:.7}100%{transform:scale(1.5);opacity:0}}@keyframes cc-listen-pulse{0%,100%{filter:brightness(1)}50%{filter:brightness(1.18)}}.cc-page{background:radial-gradient(ellipse at 50% 0%,#dce9ff,#eff5ff 48%,#eaf0ff)}.cc-shell{background:#fff;border-color:#dce6fb;box-shadow:0 24px 60px rgba(27,83,198,.16)}.cc-sidebar{position:relative;isolation:isolate;background:linear-gradient(165deg,#1557f6,#06359f 57%,#062b87)}.cc-sidebar:before{content:'';position:absolute;inset:auto -20% -3%;height:27%;z-index:-1;background:radial-gradient(ellipse at 20% 70%,#08cfff 0 14%,transparent 15%),radial-gradient(ellipse at 60% 80%,#0758ef 0 45%,transparent 46%);opacity:.9}.cc-header{background:rgba(255,255,255,.96);border-color:#dce5fa}.cc-orb{position:relative;display:grid;place-items:center;isolation:isolate;background:radial-gradient(circle at 36% 28%,#ecfeff 0 6%,#19d8ff 9%,#0875fa 36%,#0640d8 65%,#062b91);box-shadow:0 8px 20px rgba(0,95,240,.24),inset 0 0 18px rgba(255,255,255,.5)}.cc-orb:before,.cc-orb:after{content:'';position:absolute;inset:-5px;border-radius:inherit;border:1px solid rgba(26,200,255,.6);z-index:-1}.cc-orb:after{inset:-9px;border-color:rgba(66,127,255,.34)}.cc-orb-live{animation:cc-float 2.5s ease-in-out infinite}.cc-orb-live:before,.cc-orb-live:after{animation:cc-blue-ring 1.5s ease-out infinite}.cc-orb-live:after{animation-delay:.45s}.cc-transcript{background:linear-gradient(145deg,#fff,#fdfefe 65%,#f6f9ff)}.cc-assistant-bubble{color:#111c4a;background:linear-gradient(145deg,#eff3ff,#e5eaff);border:1px solid #e4eaff;box-shadow:0 2px 5px rgba(24,65,155,.05)}.cc-user-bubble{color:#fff;background:linear-gradient(120deg,#1565f8,#3155ef);box-shadow:0 9px 22px rgba(27,82,230,.2)}.cc-composer{background:linear-gradient(110deg,#f2f5ff,#eef3ff);border-color:#dce5fa}.cc-input-wrap{background:white;border-color:#cbd7fa;box-shadow:0 4px 14px rgba(34,79,190,.07)}.cc-input-wrap:focus-within{border-color:#3474ff;box-shadow:0 0 0 4px rgba(46,111,255,.12)}.cc-icon-button{color:#18317f}.cc-icon-button:hover{color:#075bff;background:#edf3ff}.cc-prompt{border:1px solid #dce7ff;background:white;transition:all .2s ease}.cc-prompt:hover{transform:translateY(-2px);border-color:#7faaff;background:#f8fbff;box-shadow:0 8px 20px rgba(31,88,204,.1)}.cc-listen-shell{background:linear-gradient(110deg,rgba(220,239,255,.95),rgba(243,246,255,.98),rgba(219,237,255,.95));border:1px solid rgba(112,190,255,.6);box-shadow:0 10px 34px rgba(31,111,236,.14),inset 0 1px white}.cc-listen-mic.cc-orb-live{animation:cc-listen-pulse 1.3s ease-in-out infinite}.cc-listen-mic{transform:translate(-50%,-50%);background:radial-gradient(circle at 36% 25%,#25e1ff,#0571fa 52%,#093bdb);box-shadow:0 0 0 7px rgba(255,255,255,.65),0 0 0 10px rgba(83,180,255,.42),0 10px 24px rgba(0,82,234,.4)}.cc-bars.is-active i{animation:cc-blue-wave .64s ease-in-out infinite}.cc-bars i:nth-child(3n){background:#178dff}.cc-bars i:nth-child(3n + 1){background:#44c3ff}.cc-bars i:nth-child(3n + 2){background:#b24dff}.cc-avatar{background:radial-gradient(circle at 35% 25%,#fff,#d9edff 32%,#57b8ff 62%,#0b54e7);box-shadow:0 3px 10px rgba(18,105,228,.2)}@media(max-width:720px){.cc-sidebar{width:68px!important;padding-left:8px;padding-right:8px}.cc-sidebar-history-open{width:252px!important;padding-left:14px;padding-right:14px}.cc-sidebar-history-open .cc-side-label{display:block!important}.cc-side-label,.cc-brand-title,.cc-side-caption{display:none!important}.cc-side-button{justify-content:center!important;padding:12px!important}.cc-sidebar-brand{justify-content:center!important}.cc-listen-shell{height:106px!important}.cc-bars{gap:3px!important}.cc-listen-stage{padding-top:8px!important;padding-bottom:12px!important}}@media(prefers-reduced-motion:reduce){.cc-bars.is-active i,.cc-orb-live,.cc-listen-mic.cc-orb-live,.cc-orb-live:before,.cc-orb-live:after,.cc-message,.cc-prompt{animation:none!important;transition:none!important}}`}</style>
      <div className="cc-shell mx-auto flex min-h-0 w-full flex-1 overflow-hidden rounded-[28px] border">
       <aside className={`cc-sidebar flex w-[252px] shrink-0 flex-col px-4 py-5 text-white sm:px-5 ${historyOpen ? "cc-sidebar-history-open" : ""}`}>
        <div className="cc-sidebar-brand flex justify-center px-1"><div className="cc-orb cc-orb-live flex h-20 w-20 items-center justify-center rounded-full border-4 border-white/20 sm:h-24 sm:w-24"><Bot className="cc-orb-core h-11 w-11 sm:h-14 sm:w-14" /></div></div>
        <h1 className="cc-brand-title mt-4 text-center text-xl font-bold tracking-tight sm:text-2xl">AI Assistant</h1>
        <nav aria-label="Assistant navigation" className="mt-7 flex flex-col gap-2">
         <button type="button" onClick={() => { setHelpOpen(false); setHistoryOpen(false); scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }} className="cc-side-button flex items-center gap-4 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3.5 text-left text-base font-semibold shadow-lg shadow-blue-950/20 transition hover:brightness-110"><MessageCircle className="h-6 w-6 shrink-0"/><span className="cc-side-label">Chat</span></button>
         <button type="button" aria-expanded={historyOpen} onClick={() => { setHelpOpen(false); setHistoryOpen((open) => !open); }} className={`cc-side-button flex items-center gap-4 rounded-2xl px-4 py-3 text-left text-base font-medium text-white/90 transition hover:bg-white/10 ${historyOpen ? "bg-white/15" : ""}`}><Clock3 className="h-6 w-6 shrink-0"/><span className="cc-side-label">History</span></button>
         <button type="button" onClick={() => { const enabled = !voiceEnabled; setVoiceEnabled(enabled); window.localStorage.setItem(COMMAND_CENTER_VOICE_KEY, String(enabled)); window.dispatchEvent(new CustomEvent(COMMAND_CENTER_VOICE_EVENT, { detail: { enabled } })); if (!enabled) { stopSpeaking(); setTypingMessageId(null); } }} className="cc-side-button flex items-center gap-4 rounded-2xl px-4 py-3 text-left text-base font-medium text-white/90 transition hover:bg-white/10"><Settings2 className="h-6 w-6 shrink-0"/><span className="cc-side-label">Settings <span className="ml-1 text-xs text-blue-200">Voice {voiceEnabled ? "on" : "off"}</span></span></button>
         <button type="button" onClick={() => { setHistoryOpen(false); setHelpOpen(true); }} className={`cc-side-button flex items-center gap-4 rounded-2xl px-4 py-3 text-left text-base font-medium text-white/90 transition hover:bg-white/10 ${helpOpen ? "bg-white/15" : ""}`}><CircleHelp className="h-6 w-6 shrink-0"/><span className="cc-side-label">Help</span></button>
        </nav>
        {historyOpen ? <div className="mt-5 min-h-0 flex-1 overflow-y-auto rounded-2xl bg-blue-950/20 p-2">
          <div className="mb-2 flex items-center justify-between px-2"><p className="cc-side-label text-xs font-semibold uppercase tracking-wider text-blue-100">Recent chats</p><button type="button" onClick={startNewConversation} title="Start a new chat" aria-label="Start a new chat" className="rounded-lg p-1.5 text-blue-100 hover:bg-white/10"><MessageCircle className="h-4 w-4"/></button></div>
          <label className="cc-side-label mb-3 flex items-center gap-2 rounded-xl border border-white/15 bg-blue-950/20 px-2.5 py-2"><Search className="h-3.5 w-3.5 shrink-0 text-blue-200"/><input value={historyQuery} onChange={(event) => setHistoryQuery(event.target.value)} placeholder="Search your chats" className="min-w-0 flex-1 bg-transparent text-xs text-white outline-none placeholder:text-blue-200/70"/></label>
          {historyGroups.map((group) => <div key={group.title} className="mb-3"><p className="cc-side-label mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-blue-200/80">{group.title}</p>{group.items.map((conversation) => <div key={conversation.id} className={`group mb-1 flex items-center gap-1 rounded-xl ${conversation.id === activeConversationId ? "bg-white/15" : "hover:bg-white/10"}`}>
            <button type="button" onClick={() => openSavedConversation(conversation)} title={conversation.title} className="cc-side-label min-w-0 flex-1 truncate px-2.5 py-2 text-left text-xs text-white">{conversation.title}</button>
            <button type="button" aria-label={`Delete ${conversation.title}`} title="Delete conversation" onClick={() => deleteConversation(conversation.id)} className="rounded-lg p-1.5 text-blue-200 opacity-70 hover:bg-white/10 hover:text-white"><Trash2 className="h-3.5 w-3.5"/></button>
          </div>)}</div>)}
          {!historyItems.length && <p className="cc-side-label px-2 py-3 text-xs text-blue-100/80">No chats match that search.</p>}
          <button type="button" onClick={startNewConversation} className="cc-side-label mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10"><MessageCircle className="h-3.5 w-3.5"/>New chat</button>
        </div> : <div className="cc-side-caption mt-auto px-2 pb-1 pt-8 text-xs leading-5 text-blue-100/80">Your agency assistant<br/>Chat history stays saved on this device.</div>}
       </aside>
       <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="cc-header flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3 sm:px-7 sm:py-4">
          <div className="min-w-0"><div className="flex items-center gap-3"><span className={`h-3.5 w-3.5 rounded-full ${isRecording ? "bg-rose-500" : isSpeaking ? "bg-blue-500" : "bg-emerald-500"}`} /><span className="text-lg font-medium text-[#11194f]">{isRecording ? "Listening" : isSpeaking ? "Speaking" : "Online"}</span><ChevronRight className="h-4 w-4 rotate-90 text-[#11194f]" /></div><p className="cc-side-caption text-xs text-slate-500">Your agency workspace | chat saved in this browser</p></div>
          <div className="flex shrink-0 items-center gap-1.5">
            <Button type="button" size="icon" variant="ghost" aria-label={voiceEnabled ? "Mute AI voice" : "Enable AI voice"} title={voiceEnabled ? "Mute AI voice" : "Enable AI voice"} onClick={() => { const enabled = !voiceEnabled; setVoiceEnabled(enabled); window.localStorage.setItem(COMMAND_CENTER_VOICE_KEY, String(enabled)); window.dispatchEvent(new CustomEvent(COMMAND_CENTER_VOICE_EVENT, { detail: { enabled } })); if (!enabled) { stopSpeaking(); setTypingMessageId(null); } }} className="cc-icon-button rounded-xl">{voiceEnabled ? <Volume2 className="h-6 w-6" /> : <VolumeX className="h-6 w-6" />}</Button>
            {isSpeaking && <Button type="button" size="icon" variant="ghost" aria-label="Stop speaking" title="Stop speaking" onClick={() => { stopSpeaking(); setTypingMessageId(null); }} className="cc-icon-button rounded-xl"><Square className="h-4 w-4" /></Button>}
            <div className="relative">
              <Button type="button" size="icon" variant="ghost" aria-label="More options" title="More options" aria-expanded={moreMenuOpen} onClick={() => setMoreMenuOpen((open) => !open)} className="cc-icon-button rounded-xl"><MoreHorizontal className="h-6 w-6" /></Button>
              {moreMenuOpen && <div className="absolute right-0 top-11 z-30 w-48 rounded-xl border border-blue-100 bg-white p-1.5 text-sm text-slate-800 shadow-xl"><button type="button" onClick={() => { setMoreMenuOpen(false); startNewConversation(); }} className="w-full rounded-lg px-3 py-2 text-left hover:bg-blue-50">Start a new chat</button><button type="button" onClick={() => { setMoreMenuOpen(false); deleteConversation(); }} className="w-full rounded-lg px-3 py-2 text-left text-rose-700 hover:bg-rose-50">Delete this chat</button></div>}
            </div>
          </div>
        </header>

        {helpOpen ? <section className="cc-transcript min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-10 sm:py-9" aria-label="How to use the AI Command Center">
          <div className="mx-auto max-w-4xl">
            <p className="text-xs font-semibold uppercase tracking-[.2em] text-blue-600">Help center</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#10194c]">How to use your AI Command Center</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">Write a request the way you would explain it to a colleague. The assistant can help with supported agency records and workflows, and will ask for missing details when needed.</p>
            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              <article className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm"><div className="flex items-center gap-2 font-semibold text-[#14245e]"><MessageCircle className="h-5 w-5 text-blue-600"/>Ask for help</div><p className="mt-2 text-sm leading-6 text-slate-600">Ask a question, find a dashboard page, or request a supported task. Include names, dates, channel, and audience when they matter.</p><p className="mt-3 rounded-xl bg-blue-50 p-3 text-xs leading-5 text-blue-900">Example: “Find the latest enquiry from Mei and summarize what she needs.”</p></article>
              <article className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm"><div className="flex items-center gap-2 font-semibold text-[#14245e]"><ShieldCheck className="h-5 w-5 text-blue-600"/>Review before actions</div><p className="mt-2 text-sm leading-6 text-slate-600">For supported changes and outbound messages, check the action card in chat and approve it before it proceeds. If details are unclear, tell the assistant what to change first.</p><p className="mt-3 rounded-xl bg-blue-50 p-3 text-xs leading-5 text-blue-900">Broadcast example: specify the channel, audience, message, media, and send or schedule time.</p></article>
              <article className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm"><div className="flex items-center gap-2 font-semibold text-[#14245e]"><Mic className="h-5 w-5 text-blue-600"/>Speak or attach files</div><p className="mt-2 text-sm leading-6 text-slate-600">Use the large microphone to dictate a message. Use the paperclip to attach an Excel/CSV contact list or supported image/video for a broadcast. Review the file and audience details before approving.</p></article>
              <article className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm"><div className="flex items-center gap-2 font-semibold text-[#14245e]"><Clock3 className="h-5 w-5 text-blue-600"/>History and memory</div><p className="mt-2 text-sm leading-6 text-slate-600">Your conversations are saved in this browser under History. Open a previous chat to continue its context, or start a new chat for a separate task. Clearing browser storage or using another device won’t carry these chats over.</p></article>
            </div>
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950"><b>Good to know:</b> The assistant only sees data and actions made available to its connected services. It will tell you if a record, channel, or action is unavailable; it cannot guarantee a message was delivered until the connected broadcast service reports completion.</div>
            <Button type="button" onClick={() => setHelpOpen(false)} className="mt-6 rounded-xl bg-blue-700 text-white hover:bg-blue-800">Back to chat</Button>
          </div>
        </section> : <section ref={scrollRef} className="cc-transcript min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 py-5 sm:px-9 sm:py-7" aria-live="polite" aria-label="Conversation">
          {messages.length <= 1 && <div className="mx-auto mb-8 max-w-3xl py-4 text-center sm:py-8">
            <div className="cc-orb cc-orb-live mx-auto mb-4 h-16 w-16 rounded-full text-white"><Bot className="cc-orb-core h-9 w-9" /></div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[.28em] text-violet-600/70">Agency intelligence online</p>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Hello! How can I help you today?</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">You can speak or type your question. I will show the details here before actions that need your approval.</p>
            <div className="mx-auto mt-6 grid max-w-2xl gap-2 text-left sm:grid-cols-3">
              {[{ title: "Broadcast planning", prompt: "Help me prepare a WhatsApp broadcast.", Icon: Zap }, { title: "Agency overview", prompt: "Give me a quick overview of the agency dashboard.", Icon: Activity }, { title: "Find a workflow", prompt: "Help me find the page to manage applicants.", Icon: ChevronRight }].map(({ title, prompt, Icon }) => <button key={title} type="button" onClick={() => void sendMessage(prompt)} className="cc-prompt rounded-2xl p-3.5 text-left"><span className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-800"><Icon className="h-4 w-4 text-violet-600" />{title}</span><span className="text-xs leading-5 text-slate-500">{prompt}</span></button>)}
            </div>
          </div>}
          {messages.map((message) => <div key={message.id} className={`cc-message flex gap-2.5 sm:gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
            {message.role === "assistant" && <div className={`cc-orb relative mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-white ${isSpeaking && message.id === messages.at(-1)?.id ? "cc-orb-live" : ""}`}>
              {isSpeaking && message.id === messages.at(-1)?.id && <span className="command-center-ring absolute -inset-1 rounded-2xl border-2 border-cyan-300" />}
              <Bot className="cc-orb-core relative h-4 w-4" />
            </div>}
            <div className={`min-w-0 max-w-[94%] break-words rounded-3xl px-4 py-3.5 text-sm leading-6 [overflow-wrap:anywhere] sm:max-w-[86%] sm:px-5 ${message.role === "user" ? "cc-user-bubble rounded-br-lg" : "cc-assistant-bubble rounded-bl-lg"}`}>
              <div className="min-w-0 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{message.role === "assistant" ? renderAssistantContent(message.id === typingMessageId ? message.content.slice(0, typingCharacterCount) : message.content) : message.id === typingMessageId ? message.content.slice(0, typingCharacterCount) : message.content}</div>
              {message.actions?.map(renderAction)}
            </div>
            {message.role === "user" && <div className="cc-avatar mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white text-[10px] font-bold text-blue-950">You</div>}
          </div>)}

          {pendingContactImport && <div className="flex items-start gap-3"><div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700"><FileSpreadsheet className="h-4 w-4" /></div><article className="w-full max-w-3xl rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm"><h2 className="text-sm font-bold">Review contacts from {pendingContactImport.fileName}</h2><p className="mt-1 text-xs leading-5 text-slate-600">{pendingContactImport.contacts.length} valid unique contacts are ready. {pendingContactImport.skippedCount} invalid or duplicate rows will be skipped. Only rows with explicit “subscribed” consent and a recorded source remain broadcast eligible; other rows are imported as not consented.</p><div className="mt-3 max-h-40 overflow-auto rounded-xl border border-slate-200"><table className="w-full text-left text-xs"><thead className="sticky top-0 bg-slate-50"><tr><th className="px-3 py-2">Name</th><th className="px-3 py-2">Phone</th><th className="px-3 py-2">Consent</th></tr></thead><tbody>{pendingContactImport.contacts.slice(0, 8).map((contact, index) => <tr key={`${contact.phone_number}-${index}`} className="border-t border-slate-100"><td className="px-3 py-2">{contact.full_name}</td><td className="px-3 py-2">{contact.phone_number}</td><td className="px-3 py-2">{contact.consent_status.replace(/_/g, " ")}</td></tr>)}</tbody></table></div><div className="mt-3 flex gap-2"><Button type="button" size="sm" disabled={contactImporting} onClick={() => void importPendingContacts()} className="bg-emerald-700 text-white hover:bg-emerald-800">{contactImporting && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}Approve & import</Button><Button type="button" size="sm" variant="outline" disabled={contactImporting} onClick={() => setPendingContactImport(null)}><X className="mr-1.5 h-4 w-4" />Cancel</Button></div></article></div>}
          {pendingActions.map((action) => <div key={`pending-${action.id}`} className="flex items-start gap-3">
            <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-800"><ShieldCheck className="h-4 w-4" /></div>
            <article className="w-full max-w-3xl overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm">
              <div className="flex items-start justify-between gap-3 bg-amber-50 px-4 py-3"><div><p className="text-xs font-bold uppercase tracking-wide text-amber-900">Owner review requested · {action.risk_classification} risk</p><h2 className="mt-1 text-sm font-bold text-slate-900">{action.description}</h2></div><time className="shrink-0 text-[10px] text-slate-500">{prettyDate(action.created_at)}</time></div>
              <div className="space-y-3 p-4"><p className="text-xs leading-5 text-slate-600">Request: {action.instruction}</p><p className="text-xs text-slate-500">Approving here records the owner decision. This review item does not itself execute an action.</p>
                <details className="rounded-lg border border-slate-200 bg-slate-50 p-3"><summary className="cursor-pointer text-xs font-semibold text-slate-700">Review the proposed details and hash</summary><pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-slate-950 p-3 text-[10px] leading-4 text-emerald-100">{JSON.stringify({ payload: action.payload, payloadHash: action.payload_hash }, null, 2)}</pre></details>
                <label className="block text-xs font-medium text-slate-700">Decision note<textarea value={reviewNote[action.id] ?? ""} onChange={(event) => setReviewNote((current) => ({ ...current, [action.id]: event.target.value.slice(0, 1000) }))} rows={2} maxLength={1000} placeholder="Add a note (optional)" className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-sm outline-none focus:border-violet-500" /></label>
                <div className="flex gap-2"><Button type="button" size="sm" disabled={Boolean(reviewingId)} onClick={() => void reviewAction(action, "approved")} className="bg-emerald-700 text-white hover:bg-emerald-800">{reviewingId === action.id ? <LoaderCircle className="mr-1.5 h-4 w-4 animate-spin" /> : <Check className="mr-1.5 h-4 w-4" />}Approve</Button><Button type="button" size="sm" variant="outline" disabled={Boolean(reviewingId)} onClick={() => void reviewAction(action, "rejected")} className="border-red-200 text-red-800 hover:bg-red-50"><X className="mr-1.5 h-4 w-4" />Reject</Button></div>
              </div>
            </article>
          </div>)}

          {queueError && <div className="ml-11 max-w-3xl rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"><CircleAlert className="mr-1.5 inline h-4 w-4" />{queueError}</div>}
          {ownerReviewUnavailable && <div className="ml-11 max-w-3xl rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600"><ShieldCheck className="mr-1.5 inline h-4 w-4 text-violet-600" />Formal owner-only reviews aren’t enabled for this account. You can still approve supported tasks directly in their chat cards.</div>}
          {planning && <div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-violet-100 text-violet-700"><Bot className="h-4 w-4" /></div><div className="flex items-center gap-2 rounded-2xl rounded-bl-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm"><LoaderCircle className="h-4 w-4 animate-spin text-violet-600" />Thinking through your request…</div></div>}
          {voiceStatus && <div className="ml-11 flex items-center gap-2 text-xs font-medium text-violet-700"><Activity className="h-4 w-4" />{voiceStatus}</div>}
          {chatError && <div role="alert" className="ml-11 max-w-3xl rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"><CircleAlert className="mr-2 inline h-4 w-4" />{chatError}</div>}
        </section>}

        {!helpOpen && <div className="cc-listen-stage shrink-0 px-4 pb-3 pt-2 sm:px-10 sm:pb-4">
         <div className="cc-listen-shell relative mx-auto flex h-[102px] max-w-[720px] items-center justify-center rounded-full">
          <div className={`cc-bars flex h-16 items-center gap-1.5 ${isRecording || isSpeaking ? "is-active" : ""}`} aria-hidden="true">{Array.from({ length: 17 }, (_, index) => <i key={index} className="block w-1.5 rounded-full" style={{ height: `${Math.max(7, 29 - Math.abs(8 - index) * 3 + (index % 4) * 4)}px`, animationDelay: `${index * 43}ms` }} />)}</div>
          <Button type="button" disabled={planning} onClick={() => void toggleRecording()} aria-label={isRecording ? "Finish voice input" : "Start voice chat"} title={isRecording ? "Finish voice input" : "Start voice chat"} className={`cc-listen-mic absolute left-1/2 top-1/2 z-10 flex h-[76px] w-[76px] items-center justify-center rounded-full border-[5px] border-white text-white hover:brightness-110 sm:h-[82px] sm:w-[82px] ${isRecording || isSpeaking ? "cc-orb-live" : ""}`}>{isRecording ? <MicOff className="h-9 w-9"/> : isSpeaking ? <Volume2 className="h-9 w-9"/> : <Mic className="h-10 w-10"/>}</Button>
          <div className={`cc-bars flex h-16 items-center gap-1.5 ${isRecording || isSpeaking ? "is-active" : ""}`} aria-hidden="true">{Array.from({ length: 17 }, (_, index) => <i key={index} className="block w-1.5 rounded-full" style={{ height: `${Math.max(7, 29 - Math.abs(8 - index) * 3 + (index % 5) * 4)}px`, animationDelay: `${index * 51}ms` }} />)}</div>
         </div>
         <div className="mt-2 flex min-h-7 items-center justify-center gap-4 text-center"><p className="text-sm font-semibold text-blue-700">{isRecording ? "Listening..." : isSpeaking ? "Speaking..." : voiceStatus || "Tap the microphone to talk"}</p>{isRecording && <button type="button" onClick={() => { cancelRecordingRef.current = true; mediaRecorderRef.current?.stop(); }} className="rounded-full border border-blue-200 bg-white px-4 py-1.5 text-xs font-medium text-[#11194f] shadow-sm hover:bg-blue-50">Cancel</button>}</div>
        </div>}
        {!helpOpen && <form onSubmit={submitMessage} className="cc-composer shrink-0 border-t px-3 py-3 sm:px-6 sm:py-4">
          <label htmlFor="command-instruction" className="sr-only">Message the agency assistant</label>
          <input ref={attachmentInputRef} type="file" accept=".csv,.xlsx,.xls,image/*,video/*" className="hidden" onChange={(event) => void handleAttachmentSelected(event)} />
          {stagedMedia && <div className="mb-2 flex items-center gap-3 rounded-2xl border border-violet-300/20 bg-violet-500/10 p-2.5">{stagedMedia.mediaType === "image" ? <img src={stagedMedia.previewUrl} alt="Selected campaign attachment" className="h-16 w-16 rounded-xl object-cover" /> : <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-violet-100 text-violet-700"><ImageIcon className="h-6 w-6" /></div>}<div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-slate-100">{stagedMedia.file.name}</p><p className="text-[11px] text-slate-500">{mediaUploading ? "Uploading…" : `For ${stagedMedia.platform === "telegram" ? "Telegram" : "WhatsApp"}. It will be included after you approve a broadcast. Describe the media if you want tailored copy.`}</p><label className="mt-1 flex items-center gap-2 text-[11px] font-medium text-violet-800">Broadcast platform<select disabled={planning} value={stagedMedia.platform} onChange={(event) => { const platform = event.target.value as "whatsapp" | "telegram"; setAttachmentPlatform(platform); setStagedMedia((current) => current ? { ...current, platform, mediaUrl: undefined, mediaFileId: undefined, mediaMimeType: undefined, mediaFileName: undefined } : current); }} className="rounded-md border border-violet-200/20 bg-slate-900 px-1.5 py-1"><option value="whatsapp">WhatsApp</option><option value="telegram">Telegram</option></select></label></div><Button type="button" size="icon" variant="ghost" aria-label="Remove attachment" onClick={() => { URL.revokeObjectURL(stagedMedia.previewUrl); setStagedMedia(null); }}><X className="h-4 w-4" /></Button></div>}
          <div className="cc-input-wrap flex items-end gap-2 rounded-full border p-2 transition focus-within:ring-4">
            <Keyboard className="ml-3 mb-2.5 h-5 w-5 shrink-0 text-[#1d2a78]" aria-hidden="true"/><textarea id="command-instruction" value={instruction} onChange={(event) => setInstruction(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} maxLength={4000} rows={1} placeholder={isRecording ? "Listening… tap the microphone when you’re done" : "Message your agency assistant…"} className="max-h-36 min-h-11 flex-1 resize-y border-0 bg-transparent px-3 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:ring-0" disabled={planning || isRecording} />
            <Button type="button" size="icon" variant="ghost" disabled={planning || contactImporting} onClick={() => attachmentInputRef.current?.click()} aria-label="Attach a contact spreadsheet or broadcast media" title="Attach Excel/CSV or campaign media" className="cc-icon-button mb-0.5 shrink-0 rounded-2xl"><Paperclip className="h-5 w-5" /></Button>
            <Button type="submit" disabled={planning || (!instruction.trim() && !stagedMedia)} size="icon" aria-label="Send message" className="mb-0.5 mr-1 h-14 w-14 shrink-0 rounded-full bg-gradient-to-br from-sky-500 to-blue-700 text-white shadow-lg shadow-blue-500/25 hover:brightness-110">{planning ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</Button>
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-2 text-[11px] text-slate-500"><span>Enter to send · Shift+Enter for a new line · Tap the mic to speak</span><span>{historyError || `Chat saved on this device · recent messages are AI memory · Fish Audio voice ${voiceEnabled ? "on" : "off"}`}</span></div>
        </form>}
       </div>
      </div>
    </main>
  );
}
