import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCheck, MessageCircle, Search, Send, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";

interface Conversation {
  key: string;
  clientId: number;
  conversationType: "support" | "agency";
  agencyId?: number;
  agencyName?: string;
  clientName: string;
  clientEmail: string;
  clientCompany: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

interface ChatMessage {
  id: number;
  clientId: number;
  conversationType: "support" | "agency";
  agencyId?: number;
  agencyName?: string;
  senderRole: "client" | "agency";
  senderName: string;
  message: string;
  createdAt: string;
}

const formatMessageTime = (timestamp: string) =>
  new Date(timestamp).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

const AdminSupportChat = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationKey, setActiveConversationKey] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const buildQueryString = (conversation: Pick<Conversation, "conversationType" | "agencyId" | "agencyName">) => {
    const params = new URLSearchParams();
    params.set("type", conversation.conversationType);
    if (conversation.conversationType === "agency" && conversation.agencyId) {
      params.set("agencyId", String(conversation.agencyId));
      if (conversation.agencyName) {
        params.set("agencyName", conversation.agencyName);
      }
    }
    return params.toString();
  };

  const loadConversations = useCallback(async () => {
    try {
      const response = await fetch("/api/chats/admin");
      const data = (await response.json().catch(() => ({}))) as {
        conversations?: Conversation[];
        error?: string;
      };

      if (!response.ok || !data.conversations) {
        throw new Error(data.error || "Failed to load conversations");
      }

      setConversations(data.conversations);
      setActiveConversationKey((prev) => prev ?? data.conversations?.[0]?.key ?? null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load conversations");
    } finally {
      setIsLoadingConversations(false);
    }
  }, []);

  const filteredConversations = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return conversations;

    return conversations.filter((conversation) =>
      [
        conversation.clientName,
        conversation.clientEmail,
        conversation.clientCompany,
        conversation.agencyName,
        conversation.lastMessage,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [conversations, search]);

  const activeConversation = useMemo(
    () => conversations.find((item) => item.key === activeConversationKey) ?? null,
    [activeConversationKey, conversations],
  );

  const loadMessages = useCallback(async (conversation: Conversation) => {
    try {
      setIsLoadingMessages(true);
      const response = await fetch(`/api/chats/admin/${conversation.clientId}?${buildQueryString(conversation)}`);
      const data = (await response.json().catch(() => ({}))) as {
        messages?: ChatMessage[];
        error?: string;
      };

      if (!response.ok || !data.messages) {
        throw new Error(data.error || "Failed to load messages");
      }

      setMessages(data.messages);
      setConversations((prev) =>
        prev.map((item) => (item.key === conversation.key ? { ...item, unreadCount: 0 } : item)),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load messages");
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    void loadConversations();
    const interval = window.setInterval(() => {
      void loadConversations();
      if (activeConversation) {
        void loadMessages(activeConversation);
      }
    }, 5000);

    return () => window.clearInterval(interval);
  }, [activeConversation, loadConversations, loadMessages]);

  useEffect(() => {
    if (activeConversation) {
      void loadMessages(activeConversation);
    } else {
      setMessages([]);
    }
  }, [activeConversation, loadMessages]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const sendMessage = async () => {
    if (!activeConversation || !draft.trim()) return;

    try {
      setIsSending(true);
      const response = await fetch(
        `/api/chats/admin/${activeConversation.clientId}?${buildQueryString(activeConversation)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: draft.trim() }),
        },
      );
      const data = (await response.json().catch(() => ({}))) as {
        message?: ChatMessage;
        error?: string;
      };

      if (!response.ok || !data.message) {
        throw new Error(data.error || "Failed to send message");
      }

      setMessages((prev) => [...prev, data.message]);
      setDraft("");
      await loadConversations();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const groupedMessages = useMemo(() => {
    return messages.map((message, index) => {
      const previous = messages[index - 1];
      const currentDate = new Date(message.createdAt).toDateString();
      const previousDate = previous ? new Date(previous.createdAt).toDateString() : null;

      return {
        message,
        showDateDivider: currentDate !== previousDate,
        dateLabel: new Date(message.createdAt).toLocaleDateString(),
      };
    });
  }, [messages]);

  const totalUnread = conversations.reduce((sum, conversation) => sum + conversation.unreadCount, 0);

  return (
    <div className="page-container">
      <div className="mb-6 flex items-center gap-3">
        <MessageCircle className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold">Support Chat Inbox</h2>
      </div>

      <div className="mb-5 grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border bg-background p-4 text-sm">
          <p className="text-muted-foreground">Open Conversations</p>
          <p className="mt-2 text-2xl font-bold">{conversations.length}</p>
        </div>
        <div className="rounded-xl border bg-background p-4 text-sm">
          <p className="text-muted-foreground">Unread Messages</p>
          <p className="mt-2 text-2xl font-bold">{totalUnread}</p>
        </div>
        <div className="rounded-xl border bg-background p-4 text-sm">
          <p className="text-muted-foreground">Selected Thread</p>
          <p className="mt-2 text-lg font-bold">{activeConversation?.clientName || "No thread selected"}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        <aside className="content-card animate-fade-in-up space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Conversations</h3>
            <p className="text-sm text-muted-foreground">Messenger-style inbox for agency support and direct agency chats.</p>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search chats" />
          </div>

          {isLoadingConversations ? (
            <div className="py-10 text-center text-muted-foreground">Loading conversations...</div>
          ) : filteredConversations.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">No chat conversations yet.</div>
          ) : (
            <div className="space-y-2">
              {filteredConversations.map((conversation) => (
                <button
                  key={conversation.key}
                  onClick={() => setActiveConversationKey(conversation.key)}
                  className={`w-full rounded-2xl border p-3 text-left transition-colors ${
                    conversation.key === activeConversationKey ? "border-primary bg-primary/5" : "hover:border-primary/20"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <UserRound className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{conversation.clientName}</p>
                          <p className="truncate text-xs text-muted-foreground">{conversation.clientEmail}</p>
                        </div>
                        {conversation.unreadCount > 0 ? (
                          <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
                            {conversation.unreadCount}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-[11px] uppercase tracking-wide text-primary">
                        {conversation.conversationType === "agency"
                          ? `Agency chat${conversation.agencyName ? ` • ${conversation.agencyName}` : ""}`
                          : "Main support"}
                      </p>
                      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{conversation.lastMessage}</p>
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        {new Date(conversation.lastMessageAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </aside>

        <section className="content-card animate-fade-in-up">
          {activeConversation ? (
            <div className="flex h-[720px] flex-col">
              <div className="flex items-center justify-between gap-4 border-b pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <UserRound className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold">{activeConversation.clientName}</p>
                    <p className="text-sm text-muted-foreground">{activeConversation.clientEmail}</p>
                    {activeConversation.clientCompany ? (
                      <p className="text-sm text-muted-foreground">{activeConversation.clientCompany}</p>
                    ) : null}
                    <p className="mt-1 text-xs uppercase tracking-wide text-primary">
                      {activeConversation.conversationType === "agency"
                        ? `Agency conversation${activeConversation.agencyName ? ` with ${activeConversation.agencyName}` : ""}`
                        : "Main support conversation"}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border bg-muted/20 px-4 py-3 text-sm">
                  <p className="font-medium">Agency side</p>
                  <p className="text-muted-foreground">Replying as support</p>
                </div>
              </div>

              <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-muted/20 px-1 py-5">
                {isLoadingMessages ? (
                  <div className="py-10 text-center text-muted-foreground">Loading chat...</div>
                ) : groupedMessages.length === 0 ? (
                  <div className="py-16 text-center text-muted-foreground">No messages in this conversation yet.</div>
                ) : (
                  groupedMessages.map(({ message, showDateDivider, dateLabel }) => {
                    const isAgency = message.senderRole === "agency";
                    return (
                      <div key={message.id}>
                        {showDateDivider ? (
                          <div className="my-4 flex justify-center">
                            <span className="rounded-full bg-background px-3 py-1 text-xs text-muted-foreground shadow-sm">
                              {dateLabel}
                            </span>
                          </div>
                        ) : null}

                        <div className={`flex ${isAgency ? "justify-end" : "justify-start"}`}>
                          <div
                            className={`max-w-[78%] rounded-[22px] px-4 py-3 text-sm shadow-sm ${
                              isAgency
                                ? "rounded-br-md bg-primary text-primary-foreground"
                                : "rounded-bl-md border bg-background text-foreground"
                            }`}
                          >
                            <p className="mb-1 text-xs opacity-70">{message.senderName}</p>
                            <p className="whitespace-pre-wrap leading-6">{message.message}</p>
                            <div className="mt-2 flex items-center justify-end gap-1 text-[11px] opacity-70">
                              <span>{formatMessageTime(message.createdAt)}</span>
                              {isAgency ? <CheckCheck className="h-3.5 w-3.5" /> : null}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="mt-4 rounded-3xl border bg-muted/20 p-3">
                <Textarea
                  rows={3}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Reply to the client..."
                  className="min-h-[96px] border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void sendMessage();
                    }
                  }}
                />
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Press Enter to send, Shift+Enter for a new line.</p>
                  <Button onClick={() => void sendMessage()} disabled={isSending || !draft.trim()} className="rounded-full px-5">
                    <Send className="mr-2 h-4 w-4" />
                    {isSending ? "Sending..." : "Send"}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-10 text-center text-muted-foreground">Select a conversation to start replying.</div>
          )}
        </section>
      </div>
    </div>
  );
};

export default AdminSupportChat;
