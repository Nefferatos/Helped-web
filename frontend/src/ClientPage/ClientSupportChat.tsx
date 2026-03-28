import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, MessageCircle, Search, Send } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { getClientAuthHeaders, getClientToken, getStoredClient } from "@/lib/clientAuth";
import "./ClientTheme.css";

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

type ConversationType = "support" | "agency";

type ClientConversation = {
  key: string;
  clientId: number;
  conversationType: ConversationType;
  title: string;
  description: string;
  agencyId?: number;
  agencyName?: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
};

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

const formatMessageTime = (timestamp: string) =>
  new Date(timestamp).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

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
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const hasLoadedRef = useRef(false);
  const lastSignatureRef = useRef("");
  const client = getStoredClient();

  const selectedConversationType: ConversationType = searchParams.get("type") === "agency" ? "agency" : "support";
  const selectedAgencyId = selectedConversationType === "agency" ? Number(searchParams.get("agencyId")) : undefined;

  const activeConversation =
    conversations.find((item) =>
      item.conversationType === selectedConversationType &&
      (item.conversationType === "support" || item.agencyId === selectedAgencyId),
    ) ?? conversations[0] ?? defaultConversation;

  const filteredConversations = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return conversations;
    return conversations.filter((item) => `${item.title} ${item.description}`.toLowerCase().includes(term));
  }, [conversations, search]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("type", activeConversation.conversationType);
    if (activeConversation.conversationType === "agency" && activeConversation.agencyId) {
      params.set("agencyId", String(activeConversation.agencyId));
      params.set("agencyName", activeConversation.agencyName || "Agency");
    }
    return params.toString();
  }, [activeConversation]);

  const loadConversations = useCallback(async (silent = false) => {
    try {
      const response = await fetch("/api/chats/client/conversations", {
        headers: { ...getClientAuthHeaders() },
      });
      const data = (await response.json().catch(() => ({}))) as {
        conversations?: ClientConversation[];
        error?: string;
      };

      if (!response.ok || !data.conversations) {
        throw new Error(data.error || "Failed to load conversations");
      }

      setConversations(data.conversations);
      const hasCurrentSelection = data.conversations.some(
        (item) =>
          item.conversationType === selectedConversationType &&
          (item.conversationType === "support" || item.agencyId === selectedAgencyId),
      );

      if (!hasCurrentSelection && data.conversations[0]) {
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
  }, [selectedAgencyId, selectedConversationType, setSearchParams]);

  const loadMessages = useCallback(async (silent = false) => {
    try {
      if (!silent) {
        setIsLoading(true);
      }
      setErrorMessage("");
      const response = await fetch(`/api/chats/client?${queryString}`, {
        headers: { ...getClientAuthHeaders() },
      });
      const data = (await response.json().catch(() => ({}))) as {
        messages?: ChatMessage[];
        error?: string;
      };

      if (!response.ok || !data.messages) {
        throw new Error(data.error || "Failed to load chat");
      }

      const nextMessages = data.messages;
      const signature = JSON.stringify(
        nextMessages.map((message) => [message.id, message.message, message.createdAt, message.senderRole]),
      );

      if (signature !== lastSignatureRef.current) {
        lastSignatureRef.current = signature;
        setMessages(nextMessages);
      }
      hasLoadedRef.current = true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load chat";
      setErrorMessage(message);
      if (!silent) {
        toast.error(message);
      }
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  }, [queryString]);

  useEffect(() => {
    if (!getClientToken()) {
      navigate("/employer-login");
      return;
    }

    hasLoadedRef.current = false;
    lastSignatureRef.current = "";
    void loadConversations(false);
    void loadMessages(false);
    const interval = window.setInterval(() => {
      void loadConversations(true);
      void loadMessages(true);
    }, 5000);

    return () => window.clearInterval(interval);
  }, [loadConversations, loadMessages, navigate]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const sortedMessages = useMemo(
    () => [...messages].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [messages],
  );

  const sendMessage = async () => {
    if (!draft.trim()) return;

    try {
      setIsSending(true);
      const response = await fetch(`/api/chats/client?${queryString}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getClientAuthHeaders(),
        },
        body: JSON.stringify({ message: draft.trim() }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        message?: ChatMessage;
        error?: string;
      };

      if (!response.ok || !data.message) {
        throw new Error(data.error || "Failed to send message");
      }

      setMessages((prev) => [...prev, data.message]);
      lastSignatureRef.current = JSON.stringify(
        [...messages, data.message].map((message) => [message.id, message.message, message.createdAt, message.senderRole]),
      );
      setDraft("");
      await loadConversations(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const groupedMessages = useMemo(() => {
    return sortedMessages.map((message, index) => {
      const previous = sortedMessages[index - 1];
      const currentDate = new Date(message.createdAt).toDateString();
      const previousDate = previous ? new Date(previous.createdAt).toDateString() : null;

      return {
        message,
        showDateDivider: currentDate !== previousDate,
        dateLabel: new Date(message.createdAt).toLocaleDateString(),
      };
    });
  }, [sortedMessages]);

  return (
    <div className="client-page-theme min-h-screen bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--muted))_100%)]">
      <div className="container py-8 md:py-12">
        <Link
          to="/client/dashboard"
          className="mb-6 inline-flex items-center gap-2 font-body text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>

        <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[320px_1fr]">
          <aside className="rounded-3xl border bg-card p-4 shadow-sm">
            <div className="mb-4">
              <h1 className="font-display text-2xl font-bold text-foreground">Chats</h1>
              <p className="mt-1 text-sm text-muted-foreground">Talk with support or the agency in one place.</p>
            </div>

            <div className="relative mb-4">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search conversations"
              />
            </div>

            <div className="space-y-2">
              {filteredConversations.map((conversation) => {
                const isActive = conversation.key === activeConversation.key;
                const href =
                  conversation.conversationType === "agency" && conversation.agencyId
                    ? `/client/support-chat?type=agency&agencyId=${conversation.agencyId}&agencyName=${encodeURIComponent(
                        conversation.agencyName || "Agency",
                      )}`
                    : "/client/support-chat";

                return (
                  <Link
                    key={conversation.key}
                    to={href}
                    className={`block rounded-2xl border px-4 py-3 transition-colors ${
                      isActive ? "border-primary bg-primary/5" : "hover:border-primary/30"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                    <Avatar className="h-11 w-11 bg-primary/10 text-primary">
                      <AvatarFallback>{conversation.title.slice(0, 1).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-foreground">{conversation.title}</p>
                      <p className="text-xs text-muted-foreground">{conversation.description}</p>
                      <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                        {conversation.lastMessage || "No messages yet"}
                      </p>
                      </div>
                      {conversation.unreadCount > 0 ? (
                        <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                          {conversation.unreadCount}
                        </span>
                      ) : null}
                    </div>
                  </Link>
                );
              })}
            </div>
          </aside>

          <section className="overflow-hidden rounded-3xl border bg-card shadow-sm">
            <div className="flex items-center justify-between gap-4 border-b bg-background px-6 py-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 bg-primary/10 text-primary">
                  <AvatarFallback>{activeConversation.title.slice(0, 1).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="font-body text-lg font-semibold text-foreground">{activeConversation.title}</h2>
                  <p className="text-sm text-muted-foreground">{activeConversation.description}</p>
                </div>
              </div>

              <div className="rounded-2xl border bg-muted/30 px-4 py-3 text-right text-sm">
                <p className="font-semibold">{client?.name || "Client"}</p>
                <p className="text-muted-foreground">{client?.email || ""}</p>
              </div>
            </div>

            <div
              ref={scrollRef}
              className="h-[520px] space-y-3 overflow-y-auto bg-[linear-gradient(180deg,rgba(220,252,231,0.35),rgba(255,255,255,0.85))] px-4 py-5"
            >
              {isLoading ? (
                <div className="py-10 text-center text-muted-foreground">Loading chat...</div>
              ) : errorMessage && groupedMessages.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground">
                  <MessageCircle className="mx-auto mb-3 h-9 w-9" />
                  {errorMessage}
                </div>
              ) : groupedMessages.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground">
                  <MessageCircle className="mx-auto mb-3 h-9 w-9" />
                  Start the conversation here.
                </div>
              ) : (
                groupedMessages.map(({ message, showDateDivider, dateLabel }) => {
                  const isClient = message.senderRole === "client";
                  return (
                    <div key={message.id}>
                      {showDateDivider ? (
                        <div className="my-4 flex justify-center">
                            <span className="rounded-full bg-white/90 px-3 py-1 text-xs text-muted-foreground shadow-sm">
                              {dateLabel}
                            </span>
                          </div>
                      ) : null}

                      <div className={`flex ${isClient ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[78%] rounded-[22px] px-4 py-3 text-sm shadow-sm ${
                            isClient
                              ? "rounded-br-md bg-[#dcf8c6] text-foreground"
                              : "rounded-bl-md border bg-white text-foreground"
                          }`}
                        >
                          <p className="mb-1 text-xs opacity-60">{message.senderName}</p>
                          <p className="whitespace-pre-wrap leading-6">{message.message}</p>
                          <p className="mt-2 text-right text-[11px] opacity-60">{formatMessageTime(message.createdAt)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="border-t bg-background px-5 py-4">
              <div className="rounded-3xl border bg-white p-3">
                <Textarea
                  rows={3}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder={`Message ${activeConversation.title}...`}
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
          </section>
        </div>
      </div>
    </div>
  );
};

export default ClientSupportChat;
