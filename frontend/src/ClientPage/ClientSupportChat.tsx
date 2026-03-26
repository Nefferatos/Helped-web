import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
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

const ClientSupportChat = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const client = getStoredClient();

  const conversationType = searchParams.get("type") === "agency" ? "agency" : "support";
  const agencyId = conversationType === "agency" ? Number(searchParams.get("agencyId")) : undefined;
  const agencyName = conversationType === "agency" ? searchParams.get("agencyName") || "Agency" : "Main Agency Support";

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("type", conversationType);
    if (conversationType === "agency" && Number.isInteger(agencyId)) {
      params.set("agencyId", String(agencyId));
      params.set("agencyName", agencyName);
    }
    return params.toString();
  }, [agencyId, agencyName, conversationType]);

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

    void loadMessages();
    const interval = window.setInterval(() => {
      void loadMessages();
    }, 5000);

    return () => window.clearInterval(interval);
  }, [loadMessages, navigate]);

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

      setMessages((prev) => [...prev, data.message!]);
      setDraft("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const pageTitle = conversationType === "agency" ? `${agencyName} Chat` : "Agency Support Chat";
  const pageDescription =
    conversationType === "agency"
      ? `Chat directly with ${agencyName} about their maids, availability, and hiring details.`
      : "Ask questions, follow up on requests, and chat directly with the main agency support team.";

  return (
    <div className="client-page-theme min-h-screen bg-muted">
      <div className="container py-8 md:py-12">
        <Link to="/client/dashboard" className="mb-6 inline-flex items-center gap-2 font-body text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>

        <div className="mx-auto max-w-4xl rounded-3xl border bg-card p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground">{pageTitle}</h1>
              <p className="mt-2 font-body text-sm text-muted-foreground">{pageDescription}</p>
            </div>
            <div className="rounded-2xl border bg-muted/40 px-4 py-3 text-sm">
              <p className="font-semibold">{client?.name || "Client"}</p>
              <p className="text-muted-foreground">{client?.email || ""}</p>
            </div>
          </div>

          <div className="mb-4 rounded-2xl border bg-muted/20 p-4">
            {isLoading ? (
              <div className="py-10 text-center text-muted-foreground">Loading chat...</div>
            ) : sortedMessages.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground">
                <MessageCircle className="mx-auto mb-3 h-8 w-8" />
                Start the conversation here.
              </div>
            ) : (
              <div className="max-h-[420px] space-y-3 overflow-y-auto pr-2">
                {sortedMessages.map((message) => {
                  const isClient = message.senderRole === "client";
                  return (
                    <div key={message.id} className={`flex ${isClient ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                          isClient ? "bg-primary text-primary-foreground" : "border bg-background text-foreground"
                        }`}
                      >
                        <p className="mb-1 text-xs opacity-80">{message.senderName}</p>
                        <p className="whitespace-pre-wrap">{message.message}</p>
                        <p className="mt-2 text-[11px] opacity-70">{new Date(message.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Textarea
              rows={4}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={conversationType === "agency" ? `Write your message to ${agencyName}...` : "Write your message to support..."}
            />
            <div className="flex justify-end">
              <Button onClick={() => void sendMessage()} disabled={isSending || !draft.trim()}>
                {isSending ? "Sending..." : "Send Message"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientSupportChat;
