import { useCallback, useEffect, useMemo, useState } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
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

const AdminSupportChat = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationKey, setActiveConversationKey] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);

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

      setMessages((prev) => [...prev, data.message!]);
      setDraft("");
      await loadConversations();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="page-container">
      <div className="mb-6 flex items-center gap-3">
        <MessageCircle className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold">Support Chat</h2>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="content-card animate-fade-in-up space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground">Conversations</h3>
          {isLoadingConversations ? (
            <div className="py-10 text-center text-muted-foreground">Loading conversations...</div>
          ) : conversations.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">No chat conversations yet.</div>
          ) : (
            conversations.map((conversation) => (
              <button
                key={conversation.key}
                onClick={() => setActiveConversationKey(conversation.key)}
                className={`w-full rounded-lg border p-3 text-left transition-colors ${
                  conversation.key === activeConversationKey ? "border-primary bg-primary/5" : "hover:border-primary/20"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{conversation.clientName}</p>
                    <p className="text-xs text-muted-foreground">{conversation.clientEmail}</p>
                    <p className="mt-1 text-[11px] uppercase tracking-wide text-primary">
                      {conversation.conversationType === "agency"
                        ? `Agency Chat${conversation.agencyName ? `: ${conversation.agencyName}` : ""}`
                        : "Main Support"}
                    </p>
                  </div>
                  {conversation.unreadCount > 0 ? (
                    <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
                      {conversation.unreadCount}
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{conversation.lastMessage}</p>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {new Date(conversation.lastMessageAt).toLocaleString()}
                </p>
              </button>
            ))
          )}
        </div>

        <div className="content-card animate-fade-in-up space-y-4">
          {activeConversation ? (
            <>
              <div className="border-b pb-4">
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

              {isLoadingMessages ? (
                <div className="py-10 text-center text-muted-foreground">Loading chat...</div>
              ) : (
                <div className="max-h-[420px] space-y-3 overflow-y-auto pr-2">
                  {messages.map((message) => {
                    const isAgency = message.senderRole === "agency";
                    return (
                      <div key={message.id} className={`flex ${isAgency ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                            isAgency ? "bg-primary text-primary-foreground" : "border bg-background"
                          }`}
                        >
                          <p className="mb-1 text-xs opacity-80">{message.senderName}</p>
                          <p className="whitespace-pre-wrap">{message.message}</p>
                          <p className="mt-2 text-[11px] opacity-70">
                            {new Date(message.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="space-y-3 border-t pt-4">
                <Textarea
                  rows={4}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Reply to the client..."
                />
                <div className="flex justify-end">
                  <Button onClick={() => void sendMessage()} disabled={isSending || !draft.trim()}>
                    {isSending ? "Sending..." : "Send Reply"}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="py-10 text-center text-muted-foreground">Select a conversation to start replying.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminSupportChat;
