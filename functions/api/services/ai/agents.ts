import { assertAiRateLimit, groqChat, groqChatStream, parseJsonObject, type GroqMessage } from "./groq";
import { getAgentDefinition, type AiAgentId } from "./prompts";
import { runAgentTools, type AiActorContext } from "./tools";

type SupabaseAiConfig = {
  baseUrl: string;
  serviceRoleKey: string;
};

export type AiRunOptions = {
  agentId: AiAgentId;
  input: Record<string, unknown>;
  actor: AiActorContext;
  appData: Record<string, unknown>;
  groqApiKey?: string;
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
  const memory = await readMemory(options.supabase, conversationId);
  const toolResults = runAgentTools({
    agentId: options.agentId,
    input: options.input,
    actor: options.actor,
    data: options.appData,
  });
  const userContent = String(options.input.message ?? options.input.prompt ?? options.input.task ?? "");

  const messages: GroqMessage[] = [
    { role: "system", content: definition.systemPrompt },
    {
      role: "system",
      content: `Actor context:\n${compactJson(options.actor)}\n\nTool results:\n${compactJson(toolResults)}`,
    },
    ...memory.map((item) => ({
      role: item.role,
      content: item.content,
    })),
    {
      role: "user",
      content: userContent || `Run ${definition.name} with this input:\n${compactJson(options.input)}`,
    },
  ];

  return { definition, conversationId, messages, toolResults };
};

export const runAIAgent = async (options: AiRunOptions) => {
  if (!options.groqApiKey?.trim()) {
    throw new Error("GROQ_API_KEY is not configured.");
  }
  const startedAt = Date.now();
  const rateKey = `${options.actor.role}:${options.actor.userId ?? options.actor.ip ?? "anonymous"}:${options.agentId}`;
  assertAiRateLimit(rateKey);

  const { definition, conversationId, messages, toolResults } = await buildAgentMessages(options);
  const userMessage = messages[messages.length - 1]?.content ?? "";
  await writeMessage(options.supabase, conversationId, options.agentId, options.actor, "user", userMessage, {
    input: options.input,
  });

  try {
    const result = await groqChat({
      apiKey: options.groqApiKey,
      model: definition.model,
      messages,
      temperature: definition.temperature,
      maxTokens: definition.maxTokens,
      responseFormat: options.input.structured === true ? "json_object" : undefined,
      signal: options.request?.signal,
    });
    await writeMessage(options.supabase, conversationId, options.agentId, options.actor, "assistant", result.content, {
      groqId: result.id,
      usage: result.usage,
    });
    await writeLog(options, "success", {
      conversationId,
      latencyMs: Date.now() - startedAt,
      output: result.content,
    });

    return {
      agent: { id: definition.id, name: definition.name },
      conversationId,
      response: result.content,
      structured:
        options.input.structured === true
          ? parseJsonObject<Record<string, unknown>>(result.content, {})
          : undefined,
      toolResults,
      usage: result.usage,
    };
  } catch (error) {
    await writeLog(options, "error", {
      conversationId,
      latencyMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : "AI agent failed",
    });
    throw error;
  }
};

export const streamAIAgent = async (options: AiRunOptions) => {
  if (!options.groqApiKey?.trim()) {
    throw new Error("GROQ_API_KEY is not configured.");
  }
  const { definition, conversationId, messages } = await buildAgentMessages(options);
  await writeMessage(options.supabase, conversationId, options.agentId, options.actor, "user", messages[messages.length - 1]?.content ?? "");
  const body = await groqChatStream({
    apiKey: options.groqApiKey,
    model: definition.model,
    messages,
    temperature: definition.temperature,
    maxTokens: definition.maxTokens,
    signal: options.request?.signal,
  });
  return { conversationId, body };
};
