import { assertAiRateLimit, openaiChat, openaiChatStream, parseJsonObject, type OpenAIMessage } from "./openai";
import { getAgentDefinition, type AiAgentId } from "./prompts";
import { runAgentTools, type AiActorContext } from "./tools";

type SupabaseAiConfig = {
  baseUrl: string;
  serviceRoleKey: string;
};

type CfAiBinding = { run(model: string, inputs: Record<string, unknown>): Promise<Record<string, unknown>> };

export type AiProviderConfig = {
  apiKey: string;
  baseUrl?: string;
  model?: string;
};

export type AiRunOptions = {
  agentId: AiAgentId;
  input: Record<string, unknown>;
  actor: AiActorContext;
  appData: Record<string, unknown>;
  /** Cline / OpenAI-compatible API key. When set, all agent calls route through openaiChat(). */
  aiProvider?: AiProviderConfig | null;
  /** Legacy Anthropic key — used as fallback when aiProvider is not set. */
  anthropicApiKey?: string;
  cfAi?: CfAiBinding | null;
  supabase?: SupabaseAiConfig | null;
  conversationId?: string;
  stream?: boolean;
  request?: Request;
};

type MemoryMessage = {
  role: "user" | "assistant";
  content: string;
  created_at?: string;
};

const now = () => new Date().toISOString();

const compactJson = (value: unknown, max = 14_000) => {
  const raw = JSON.stringify(value, null, 2);
  return raw.length > max ? `${raw.slice(0, max)}\n...truncated` : raw;
};

const authHeaders = (config: SupabaseAiConfig) => ({
  apikey: config.serviceRoleKey,
  authorization: `Bearer ${config.serviceRoleKey}`,
  "content-type": "application/json",
});

const supabaseRest = async <T>(
  config: SupabaseAiConfig | null | undefined,
  path: string,
  init?: RequestInit,
): Promise<T | null> => {
  if (!config?.baseUrl || !config.serviceRoleKey) return null;
  const response = await fetch(`${config.baseUrl.replace(/\/$/, "")}/rest/v1/${path}`, {
    ...init,
    headers: {
      ...authHeaders(config),
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) return null;
  if (response.status === 204) return null;
  const text = await response.text();
  if (!text.trim()) return null;
  return JSON.parse(text) as T;
};

const ensureConversation = async (options: AiRunOptions) => {
  if (options.conversationId) return options.conversationId;
  const id = crypto.randomUUID();
  await supabaseRest(options.supabase, "ai_conversations", {
    method: "POST",
    headers: { prefer: "return=minimal" },
    body: JSON.stringify({
      id,
      agent_id: options.agentId,
      actor_role: options.actor.role,
      actor_id: options.actor.userId ? String(options.actor.userId) : null,
      agency_id: options.actor.agencyId ?? null,
      metadata: { source: "cloudflare-worker" },
      created_at: now(),
      updated_at: now(),
    }),
  });
  return id;
};

const readMemory = async (
  config: SupabaseAiConfig | null | undefined,
  conversationId: string,
) => {
  const rows = await supabaseRest<MemoryMessage[]>(
    config,
    `ai_messages?conversation_id=eq.${encodeURIComponent(conversationId)}&select=role,content,created_at&order=created_at.asc&limit=12`,
    { method: "GET" },
  );
  return rows ?? [];
};

const writeMessage = async (
  config: SupabaseAiConfig | null | undefined,
  conversationId: string,
  agentId: AiAgentId,
  actor: AiActorContext,
  role: "user" | "assistant",
  content: string,
  metadata?: Record<string, unknown>,
) => {
  await supabaseRest(config, "ai_messages", {
    method: "POST",
    headers: { prefer: "return=minimal" },
    body: JSON.stringify({
      id: crypto.randomUUID(),
      conversation_id: conversationId,
      agent_id: agentId,
      role,
      content,
      actor_role: actor.role,
      actor_id: actor.userId ? String(actor.userId) : null,
      metadata: metadata ?? {},
      created_at: now(),
    }),
  });
};

const writeLog = async (
  options: AiRunOptions,
  status: "success" | "error",
  payload: Record<string, unknown>,
) => {
  await supabaseRest(options.supabase, "ai_agent_logs", {
    method: "POST",
    headers: { prefer: "return=minimal" },
    body: JSON.stringify({
      id: crypto.randomUUID(),
      conversation_id: payload.conversationId ?? null,
      agent_id: options.agentId,
      actor_role: options.actor.role,
      actor_id: options.actor.userId ? String(options.actor.userId) : null,
      agency_id: options.actor.agencyId ?? null,
      status,
      latency_ms: payload.latencyMs ?? null,
      input: options.input,
      output: payload.output ?? null,
      error: payload.error ?? null,
      created_at: now(),
    }),
  });
};

export const buildAgentMessages = async (options: AiRunOptions) => {
  const definition = getAgentDefinition(options.agentId);
  const conversationId = await ensureConversation(options);

  // Prefer inline history sent by the client (always available in the same session).
  // Fall back to Supabase memory when no inline history is provided.
  const inlineHistory = Array.isArray(options.input.history)
    ? (options.input.history as Array<{ role: string; content: string }>)
        .filter(
          (item) =>
            (item.role === "user" || item.role === "assistant") &&
            typeof item.content === "string" &&
            item.content.trim().length > 0,
        )
        .slice(-12)
    : [];
  const memory = inlineHistory.length > 0 ? inlineHistory : await readMemory(options.supabase, conversationId);

  const toolResults = runAgentTools({
    agentId: options.agentId,
    input: options.input,
    actor: options.actor,
    data: options.appData,
  });
  const userContent = String(options.input.message ?? options.input.prompt ?? options.input.task ?? "");

  const messages: OpenAIMessage[] = [
    { role: "system", content: definition.systemPrompt },
    {
      role: "system",
      content: `Actor context:\n${compactJson(options.actor)}\n\nTool results:\n${compactJson(toolResults)}`,
    },
    ...memory.map((item) => ({
      role: item.role as "user" | "assistant" | "system",
      content: item.content,
    })),
    {
      role: "user",
      content: userContent || `Run ${definition.name} with this input:\n${compactJson(options.input)}`,
    },
  ];

  return { definition, conversationId, messages, toolResults };
};

const runWithCfAi = async (
  cfAi: NonNullable<AiRunOptions["cfAi"]>,
  messages: OpenAIMessage[],
) => {
  // Merge multiple system messages into one — some CF AI models reject duplicates
  const systemContent = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n");
  const nonSystem = messages.filter((m) => m.role !== "system");
  const cfMessages = systemContent
    ? [{ role: "system" as const, content: systemContent }, ...nonSystem]
    : nonSystem;
  const cfResult = (await cfAi.run("@cf/meta/llama-3.1-70b-instruct", {
    messages: cfMessages,
  })) as { response?: string };
  return cfResult.response ?? "";
};

export const runAIAgent = async (options: AiRunOptions) => {
  const hasProvider = Boolean(options.aiProvider?.apiKey?.trim());
  const hasCfAi = Boolean(options.cfAi);
  if (!hasProvider && !hasCfAi) {
    throw new Error("AI service is not configured. Please contact support.");
  }

  const startedAt = Date.now();
  const rateKey = `${options.actor.role}:${options.actor.userId ?? options.actor.ip ?? "anonymous"}:${options.agentId}`;
  assertAiRateLimit(rateKey);

  const { definition, conversationId, messages, toolResults } = await buildAgentMessages(options);
  const userMessage = messages[messages.length - 1]?.content ?? "";
  await writeMessage(options.supabase, conversationId, options.agentId, options.actor, "user", userMessage, {
    input: options.input,
  });

  const buildResult = (content: string, extra?: Record<string, unknown>) => ({
    agent: { id: definition.id, name: definition.name },
    conversationId,
    response: content,
    structured:
      options.input.structured === true
        ? parseJsonObject<Record<string, unknown>>(content, {})
        : undefined,
    toolResults,
    usage: extra ?? {},
  });

  // ── Try Cline / OpenAI-compatible provider first ────────────────────────
  let aiError: Error | null = null;
  if (hasProvider) {
    try {
      const result = await openaiChat({
        apiKey: options.aiProvider!.apiKey,
        baseUrl: options.aiProvider!.baseUrl,
        model: options.aiProvider!.model || definition.model,
        messages,
        temperature: definition.temperature,
        maxTokens: definition.maxTokens,
        responseFormat: options.input.structured === true ? "json_object" : undefined,
        signal: options.request?.signal,
      });
      await writeMessage(options.supabase, conversationId, options.agentId, options.actor, "assistant", result.content, {
        messageId: result.id,
        usage: result.usage,
      });
      await writeLog(options, "success", {
        conversationId,
        latencyMs: Date.now() - startedAt,
        output: result.content,
      });
      return buildResult(result.content, result.usage);
    } catch (error) {
      aiError = error instanceof Error ? error : new Error("AI request failed");
      console.error("[AI] Cline/OpenAI failed:", aiError.message, "| agentId:", options.agentId);
    }
  }

  // ── Fall back to Cloudflare Workers AI ───────────────────────────────────
  if (hasCfAi) {
    try {
      const content = await runWithCfAi(options.cfAi!, messages);
      await writeMessage(options.supabase, conversationId, options.agentId, options.actor, "assistant", content, { fallback: "cf-ai" });
      await writeLog(options, "success", { conversationId, latencyMs: Date.now() - startedAt, output: content });
      return buildResult(content);
    } catch (cfError) {
      console.error("[AI] CF AI fallback failed:", cfError instanceof Error ? cfError.message : cfError);
    }
  }

  await writeLog(options, "error", {
    conversationId,
    latencyMs: Date.now() - startedAt,
    error: aiError?.message ?? "AI agent failed",
  });
  throw new Error("The AI receptionist is temporarily unavailable. Please try again in a moment.");
};

export const streamAIAgent = async (options: AiRunOptions) => {
  if (!options.aiProvider?.apiKey?.trim()) {
    throw new Error("AI service is not configured. Please contact support.");
  }
  const { definition, conversationId, messages } = await buildAgentMessages(options);
  await writeMessage(options.supabase, conversationId, options.agentId, options.actor, "user", messages[messages.length - 1]?.content ?? "");
  const body = await openaiChatStream({
    apiKey: options.aiProvider.apiKey,
    baseUrl: options.aiProvider.baseUrl,
    model: options.aiProvider.model || definition.model,
    messages,
    temperature: definition.temperature,
    maxTokens: definition.maxTokens,
    signal: options.request?.signal,
  });
  return { conversationId, body };
};