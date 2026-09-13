import { useCallback, useRef, useState } from "react";
import { toast } from "@/components/ui/sonner";
import {
  sendApplicantAssistantMessage,
  fetchApplicantTracker,
  createApplicantTracker,
  type ApplicantTrackerResponse,
} from "@/lib/applicantAssistant";

export interface AssistantMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  action?: string;
  /** Structured result attached to the assistant's message so it can be rendered as clickable actions */
  documentUrl?: string | null;
  documentId?: string | null;
  trackerId?: string | null;
  timestamp: string;
}

export interface UseApplicantAssistantOptions {
  selectedApplicantIds: string[];
  currentFilters?: Record<string, unknown>;
  currentSearch?: string;
  onTrackerCreated?: (trackerId: string, googleDocUrl: string | null) => void;
  onNavigateToApplicant?: (id: string) => void;
}

export function useApplicantAssistant(options: UseApplicantAssistantOptions) {
  const { selectedApplicantIds, currentFilters, currentSearch, onTrackerCreated } = options;
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [trackerInfo, setTrackerInfo] = useState<ApplicantTrackerResponse | null>(null);
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
          documentUrl: result.result?.googleDocUrl ?? null,
          documentId: result.result?.documentId ?? null,
          trackerId: result.result?.trackerId ?? null,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMsg]);

        if (result.result?.trackerId) {
          const trackerData = await fetchApplicantTracker(result.result.trackerId).catch(() => null);
          if (trackerData) setTrackerInfo(trackerData);
          onTrackerCreated?.(result.result.trackerId, result.result.googleDocUrl);
        }

        if (result.result?.googleDocUrl) {
          toast.success("Google Doc link available", {
            description: result.result.googleDocUrl,
          });
        }

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
    [conversationId, selectedApplicantIds, currentFilters, currentSearch, isThinking, onTrackerCreated],
  );

  const createTracker = useCallback(
    async (name?: string, applicantIds?: string[], filters?: Record<string, unknown>) => {
      try {
        const tracker = await createApplicantTracker({
          applicantIds: applicantIds ?? selectedApplicantIds,
          name,
          filters,
        });
        toast.success("Tracker created", {
          description: `Tracker for ${(tracker as Record<string, unknown>).name ?? "applicants"} created.`,
        });
        const trackerData = await fetchApplicantTracker(
          (tracker as Record<string, unknown>).id as string,
        ).catch(() => null);
        if (trackerData) setTrackerInfo(trackerData);
        return tracker;
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Failed to create tracker";
        toast.error("Tracker creation failed", { description: msg });
        throw error;
      }
    },
    [selectedApplicantIds],
  );

  const loadTracker = useCallback(async (trackerId?: string) => {
    try {
      const data = await fetchApplicantTracker(trackerId);
      setTrackerInfo(data);
      return data;
    } catch {
      return null;
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setConversationId(null);
  }, []);

  return {
    messages,
    isThinking,
    conversationId,
    trackerInfo,
    sendMessage,
    createTracker,
    loadTracker,
    clearMessages,
  };
}