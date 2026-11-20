import { useCallback, useRef, useState } from "react";
import { toast } from "@/components/ui/sonner";
import { sendApplicantAssistantMessage } from "@/lib/applicantAssistant";

export interface AssistantMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  action?: string;
  timestamp: string;
}

export interface UseApplicantAssistantOptions {
  selectedApplicantIds: string[];
  currentFilters?: Record<string, unknown>;
  currentSearch?: string;
}

export function useApplicantAssistant(options: UseApplicantAssistantOptions) {
  const { selectedApplicantIds, currentFilters, currentSearch } = options;
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const requestIdCounter = useRef(0);

  const sendMessage = useCallback(
    async (message: string) => {
      if (!message.trim() || isThinking) return;
      requestIdCounter.current++;

      const userMsg: AssistantMessage = {
        id: `user-${Date.now()}-${requestIdCounter.current}`,
        role: "user",
        content: message.trim(),
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsThinking(true);

      try {
        const result = await sendApplicantAssistantMessage({
          conversationId: conversationId ?? undefined,
          message: message.trim(),
          selectedApplicantIds,
          currentFilters,
          currentSearch,
        });

        if (result.conversationId && result.conversationId !== conversationId) {
          setConversationId(result.conversationId);
        }

        const assistantMsg: AssistantMessage = {
          id: `assistant-${Date.now()}-${requestIdCounter.current}`,
          role: "assistant",
          content: result.message,
          action: result.action?.type ?? undefined,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMsg]);

        if (!result.makeSuccess) {
          toast.warning("AI assistant had connectivity issues", {
            description: "The response may be limited. Please try again if needed.",
          });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        const errorMsg: AssistantMessage = {
          id: `error-${Date.now()}-${requestIdCounter.current}`,
          role: "assistant",
          content: `I'm sorry, I encountered an error: ${errorMessage}. Please try again.`,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMsg]);
        toast.error("AI Assistant error", { description: errorMessage });
      } finally {
        setIsThinking(false);
      }
    },
    [conversationId, selectedApplicantIds, currentFilters, currentSearch, isThinking],
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setConversationId(null);
  }, []);

  return {
    messages,
    isThinking,
    conversationId,
    sendMessage,
    clearMessages,
  };
}
