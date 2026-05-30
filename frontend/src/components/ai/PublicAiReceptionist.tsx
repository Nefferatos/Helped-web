import { useState } from "react";
import { Bot, MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { callAiAgent } from "@/lib/aiAgents";

export default function PublicAiReceptionist() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [reply, setReply] = useState("");
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!message.trim()) return;
    setLoading(true);
    try {
      const result = await callAiAgent("/api/ai/receptionist", {
        message,
        name,
        contact,
        conversationId,
      });
      setReply(result.response || "");
      if (result.conversationId) setConversationId(result.conversationId);
    } catch (error) {
      setReply(error instanceof Error ? error.message : "The receptionist is unavailable right now.");
    } finally {
      setLoading(false);
    }
  };

  const path = typeof window !== "undefined" ? window.location.pathname : "";
  if (path.startsWith("/agencyadmin") || path.startsWith("/client")) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {open && (
        <div className="mb-3 w-[min(360px,calc(100vw-32px))] rounded-lg border bg-card shadow-xl">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2 font-semibold">
              <Bot className="h-4 w-4 text-primary" />
              AI Receptionist
            </div>
            <button className="rounded-md p-1 hover:bg-muted" onClick={() => setOpen(false)} aria-label="Close AI receptionist">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-2 p-4">
            <Textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Ask about hiring, applying, appointments, or agency contact..."
              className="min-h-24"
            />
            <div className="grid grid-cols-2 gap-2">
              <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Name" />
              <Input value={contact} onChange={(event) => setContact(event.target.value)} placeholder="Email or phone" />
            </div>
            <Button onClick={() => void submit()} disabled={loading}>
              {loading ? "Thinking..." : "Ask Receptionist"}
            </Button>
            {reply && <div className="max-h-52 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-3 text-sm">{reply}</div>}
          </div>
        </div>
      )}
      <Button className="h-12 rounded-full shadow-lg" onClick={() => setOpen((value) => !value)}>
        <MessageCircle className="mr-2 h-5 w-5" />
        AI Help
      </Button>
    </div>
  );
}
