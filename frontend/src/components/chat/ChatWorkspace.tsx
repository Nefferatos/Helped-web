import type { ReactNode, RefObject } from "react";
import { MessageCircle, Search, Send, UserRound } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export interface ChatWorkspaceConversation {
  key: string;
  title: string;
  subtitle: string;
  preview: string;
  timestamp: string;
  unreadCount: number;
  tone?: "support" | "agency";
}

export interface ChatWorkspaceMessage {
  id: number;
  senderName: string;
  body: string;
  createdAt: string;
  isOwn: boolean;
}

interface ChatWorkspaceProps {
  sidebarTitle: string;
  sidebarDescription: string;
  searchPlaceholder: string;
  conversations: ChatWorkspaceConversation[];
  activeConversationKey: string | null;
  onSelectConversation: (key: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
  summary?: Array<{ label: string; value: string | number }>;
  headerTitle: string;
  headerSubtitle: string;
  headerMetaTitle?: string;
  headerMetaSubtitle?: string;
  messages: ChatWorkspaceMessage[];
  isLoadingConversations?: boolean;
  isLoadingMessages?: boolean;
  errorMessage?: string;
  emptyConversationLabel?: string;
  emptyMessagesLabel?: string;
  draft: string;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  isSending?: boolean;
  composePlaceholder: string;
  scrollRef?: RefObject<HTMLDivElement | null>;
  renderMessageMeta?: (message: ChatWorkspaceMessage) => ReactNode;
}

const formatTimestamp = (timestamp: string) =>
  (timestamp ? new Date(timestamp) : new Date()).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

const formatBubbleTime = (timestamp: string) =>
  (timestamp ? new Date(timestamp) : new Date()).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

export const ChatWorkspace = ({
  sidebarTitle,
  sidebarDescription,
  searchPlaceholder,
  conversations,
  activeConversationKey,
  onSelectConversation,
  search,
  onSearchChange,
  summary = [],
  headerTitle,
  headerSubtitle,
  headerMetaTitle,
  headerMetaSubtitle,
  messages,
  isLoadingConversations = false,
  isLoadingMessages = false,
  errorMessage = "",
  emptyConversationLabel = "No conversations yet.",
  emptyMessagesLabel = "No messages yet.",
  draft,
  onDraftChange,
  onSend,
  isSending = false,
  composePlaceholder,
  scrollRef,
  renderMessageMeta,
}: ChatWorkspaceProps) => {
  const groupedMessages = messages.map((message, index) => {
    const previous = messages[index - 1];
    const currentDate = new Date(message.createdAt).toDateString();
    const previousDate = previous ? new Date(previous.createdAt).toDateString() : "";

    return {
      ...message,
      showDateDivider: currentDate !== previousDate,
      dateLabel: new Date(message.createdAt).toLocaleDateString(),
    };
  });

  return (
    <div className="space-y-5">
      {summary.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-3">
          {summary.map((item) => (
            <div key={item.label} className="rounded-3xl border bg-background px-5 py-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{item.label}</p>
              <p className="mt-2 text-2xl font-bold text-foreground">{item.value}</p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <aside className="overflow-hidden rounded-[28px] border bg-card shadow-sm">
          <div className="border-b bg-[linear-gradient(180deg,rgba(14,165,233,0.08),rgba(255,255,255,0.96))] px-5 py-5">
            <h2 className="text-xl font-bold text-foreground">{sidebarTitle}</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{sidebarDescription}</p>
          </div>

          <div className="border-b px-4 py-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-11 rounded-2xl border-0 bg-muted/40 pl-10 shadow-none"
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder={searchPlaceholder}
              />
            </div>
          </div>

          <div className="max-h-[720px] space-y-2 overflow-y-auto px-3 py-3">
            {errorMessage ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{errorMessage}</div>
            ) : isLoadingConversations ? (
              <div className="py-14 text-center text-sm text-muted-foreground">Loading conversations...</div>
            ) : conversations.length === 0 ? (
              <div className="py-14 text-center text-sm text-muted-foreground">{emptyConversationLabel}</div>
            ) : (
              conversations.map((conversation) => {
                const isActive = conversation.key === activeConversationKey;
                return (
                  <button
                    key={conversation.key}
                    type="button"
                    onClick={() => onSelectConversation(conversation.key)}
                    className={`w-full rounded-[22px] border p-4 text-left transition ${
                      isActive ? "border-primary bg-primary/5 shadow-sm" : "bg-background hover:border-primary/30"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-11 w-11 bg-primary/10 text-primary">
                        <AvatarFallback>{conversation.title.slice(0, 1).toUpperCase()}</AvatarFallback>
                      </Avatar>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-foreground">{conversation.title}</p>
                            <p className="truncate text-xs text-muted-foreground">{conversation.subtitle}</p>
                          </div>
                          {conversation.unreadCount > 0 ? (
                            <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
                              {conversation.unreadCount}
                            </span>
                          ) : null}
                        </div>

                        <p className="mt-2 line-clamp-2 text-sm leading-5 text-muted-foreground">
                          {conversation.preview || "No messages yet"}
                        </p>
                        <p className="mt-2 text-[11px] text-muted-foreground">{formatTimestamp(conversation.timestamp)}</p>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <section className="overflow-hidden rounded-[30px] border bg-card shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b bg-[linear-gradient(180deg,rgba(16,185,129,0.08),rgba(255,255,255,0.96))] px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <UserRound className="h-5 w-5" />
              </div>
              <div>
                <p className="text-lg font-semibold text-foreground">{headerTitle}</p>
                <p className="text-sm text-muted-foreground">{headerSubtitle}</p>
              </div>
            </div>

            {headerMetaTitle || headerMetaSubtitle ? (
              <div className="rounded-2xl border bg-background/80 px-4 py-3 text-right text-sm shadow-sm">
                {headerMetaTitle ? <p className="font-semibold text-foreground">{headerMetaTitle}</p> : null}
                {headerMetaSubtitle ? <p className="text-muted-foreground">{headerMetaSubtitle}</p> : null}
              </div>
            ) : null}
          </div>

          <div
            ref={scrollRef}
            className="h-[620px] space-y-3 overflow-y-auto bg-[linear-gradient(180deg,rgba(248,250,252,0.98),rgba(240,249,255,0.95))] px-4 py-5"
          >
            {isLoadingMessages ? (
              <div className="py-14 text-center text-sm text-muted-foreground">Loading chat...</div>
            ) : errorMessage && groupedMessages.length === 0 ? (
              <div className="py-20 text-center text-muted-foreground">
                <MessageCircle className="mx-auto mb-3 h-10 w-10" />
                {errorMessage}
              </div>
            ) : groupedMessages.length === 0 ? (
              <div className="py-20 text-center text-muted-foreground">
                <MessageCircle className="mx-auto mb-3 h-10 w-10" />
                {emptyMessagesLabel}
              </div>
            ) : (
              groupedMessages.map((message) => (
                <div key={message.id}>
                  {message.showDateDivider ? (
                    <div className="my-4 flex justify-center">
                      <span className="rounded-full border bg-white px-3 py-1 text-xs text-muted-foreground shadow-sm">
                        {message.dateLabel}
                      </span>
                    </div>
                  ) : null}

                  <div className={`flex ${message.isOwn ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[78%] rounded-[24px] px-4 py-3 text-sm shadow-sm ${
                        message.isOwn
                          ? "rounded-br-md bg-primary text-primary-foreground"
                          : "rounded-bl-md border bg-white text-foreground"
                      }`}
                    >
                      <p className="mb-1 text-xs opacity-70">{message.senderName}</p>
                      <p className="whitespace-pre-wrap leading-6">{message.body}</p>
                      <div className="mt-2 flex items-center justify-end gap-1 text-[11px] opacity-70">
                        <span>{formatBubbleTime(message.createdAt)}</span>
                        {renderMessageMeta ? renderMessageMeta(message) : null}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="border-t bg-background px-5 py-4">
            <div className="rounded-[26px] border bg-white p-3 shadow-sm">
              <Textarea
                rows={3}
                value={draft}
                onChange={(event) => onDraftChange(event.target.value)}
                placeholder={composePlaceholder}
                className="min-h-[96px] border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    onSend();
                  }
                }}
              />
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">Press Enter to send. Use Shift+Enter for a new line.</p>
                <Button onClick={onSend} disabled={isSending || !draft.trim()} className="rounded-full px-5">
                  <Send className="mr-2 h-4 w-4" />
                  {isSending ? "Sending..." : "Send"}
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
