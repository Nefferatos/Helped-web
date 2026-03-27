import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, MessageCircle, Search, Send } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
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
  type: ConversationType;
  title: string;
  description: string;
  agencyId?: number;
  agencyName?: string;
};

const formatMessageTime = (timestamp: string) =>
  new Date(timestamp).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

const ClientSupportChat = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const client = getStoredClient();

  const conversationType: ConversationType = searchParams.get("type") === "agency" ? "agency" : "support";
  const agencyId = conversationType === "agency" ? Number(searchParams.get("agencyId")) : undefined;
  const agencyName = conversationType === "agency" ? searchParams.get("agencyName") || "Agency" : undefined;

  const conversations = useMemo<ClientConversation[]>(() => {
    const baseConversations: ClientConversation[] = [
      {
        key: "support",
        type: "support",
        title: "Agency Support",
        description: "General help, follow-up, and request support",
      },
    ];

    if (Number.isInteger(agencyId) && agencyName) {
      baseConversations.push({
        key: `agency-${agencyId}`,
        type: "agency",
        title: agencyName,
        description: "Direct chat with agency",
        agencyId,
        agencyName,
      });
    }

    return baseConversations;
  }, [agencyId, agencyName]);

  const activeConversation =
    conversations.find((item) =>
      item.type === conversationType &&
      (item.type === "support" || item.agencyId === agencyId),
    ) ?? conversations[0];

  const filteredConversations = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return conversations;
    return conversations.filter((item) => `${item.title} ${item.description}`.toLowerCase().includes(term));
  }, [conversations, search]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("type", activeConversation.type);
    if (activeConversation.type === "agency" && activeConversation.agencyId) {
      params.set("agencyId", String(activeConversation.agencyId));
      params.set("agencyName", activeConversation.agencyName || "Agency");
    }
    return params.toString();
  }, [activeConversation]);

  const loadMessages = useCallback(async () => {
    try {
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

      setMessages(data.messages);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load chat");
    } finally {
      setIsLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    if (!getClientToken()) {
      navigate("/employer-login");
      return;
    }

    setIsLoading(true);
    void loadMessages();
    const interval = window.setInterval(() => {
      void loadMessages();
    }, 5000);

    return () => window.clearInterval(interval);
  }, [loadMessages, navigate]);

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
      setDraft("");
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
    <div className="client-page-theme min-h-screen bg-muted">
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
                  conversation.type === "agency" && conversation.agencyId
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
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <MessageCircle className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{conversation.title}</p>
                        <p className="text-xs text-muted-foreground">{conversation.description}</p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </aside>

          <section className="rounded-3xl border bg-card shadow-sm">
            <div className="flex items-center justify-between gap-4 border-b px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-display text-2xl font-bold text-foreground">{activeConversation.title}</h2>
                  <p className="text-sm text-muted-foreground">{activeConversation.description}</p>
                </div>
              </div>

              <div className="rounded-2xl border bg-muted/30 px-4 py-3 text-right text-sm">
                <p className="font-semibold">{client?.name || "Client"}</p>
                <p className="text-muted-foreground">{client?.email || ""}</p>
              </div>
            </div>

            <div ref={scrollRef} className="h-[520px] space-y-3 overflow-y-auto bg-muted/20 px-5 py-5">
              {isLoading ? (
                <div className="py-10 text-center text-muted-foreground">Loading chat...</div>
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
                          <span className="rounded-full bg-background px-3 py-1 text-xs text-muted-foreground shadow-sm">
                            {dateLabel}
                          </span>
                        </div>
                      ) : null}

                      <div className={`flex ${isClient ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[78%] rounded-[22px] px-4 py-3 text-sm shadow-sm ${
                            isClient
                              ? "rounded-br-md bg-primary text-primary-foreground"
                              : "rounded-bl-md border bg-background text-foreground"
                          }`}
                        >
                          <p className="mb-1 text-xs opacity-70">{message.senderName}</p>
                          <p className="whitespace-pre-wrap leading-6">{message.message}</p>
                          <p className="mt-2 text-[11px] opacity-70">{formatMessageTime(message.createdAt)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="border-t bg-background px-5 py-4">
              <div className="rounded-3xl border bg-muted/20 p-3">
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
