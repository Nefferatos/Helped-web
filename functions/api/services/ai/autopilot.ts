import { runAIAgent } from "./agents";
import type { AiAgentId } from "./prompts";
import type { AiActorContext } from "./tools";

type SupabaseAiConfig = {
  baseUrl: string;
  serviceRoleKey: string;
};

type AppDataLike = {
  agencyAdmins?: Array<Record<string, unknown>>;
  requests?: Array<Record<string, unknown>>;
  chatMessages?: Array<Record<string, unknown>>;
  enquiries?: Array<Record<string, unknown>>;
  maids?: Array<Record<string, unknown>>;
  employmentContracts?: Array<Record<string, unknown>>;
  ats?: {
    applications?: Array<Record<string, unknown>>;
  };
};

export type AiAutopilotOptions = {
  appData: AppDataLike;
  anthropicApiKey?: string;
  supabase?: SupabaseAiConfig | null;
  agencyId?: number;
  agencyName?: string;
  maxActions?: number;
  dryRun?: boolean;
  force?: boolean;
  request?: Request;
};

type AutopilotCandidate = {
  agentId: AiAgentId;
  actionType: string;
  title: string;
  message: string;
  agencyId?: number;
  agencyName?: string;
  priority: "low" | "medium" | "high";
  target: Record<string, unknown>;
  automation: "draft" | "recommend" | "report";
  dedupeKey: string;
};

type AiAgentActionRecord = {
  payload?: Record<string, unknown>;
  created_at?: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const text = (value: unknown) => (typeof value === "string" ? value : "");
const num = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : null);
const list = <T>(value: T[] | undefined) => (Array.isArray(value) ? value : []);

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
  if (!response.ok || response.status === 204) return null;
  const raw = await response.text();
  if (!raw.trim()) return null;
  return JSON.parse(raw) as T;
};

const recentActionKeys = async (config: SupabaseAiConfig | null | undefined) => {
  const since = new Date(Date.now() - DAY_MS).toISOString();
  const rows =
    (await supabaseRest<AiAgentActionRecord[]>(
      config,
      `ai_agent_actions?select=payload,created_at&created_at=gte.${encodeURIComponent(since)}&order=created_at.desc&limit=500`,
      { method: "GET" },
    )) ?? [];

  return new Set(
    rows
      .map((row) => text(row.payload?.dedupeKey))
      .filter((value) => value.length > 0),
  );
};

const writeAction = async (
  config: SupabaseAiConfig | null | undefined,
  candidate: AutopilotCandidate,
  result: Awaited<ReturnType<typeof runAIAgent>>,
) => {
  const id = crypto.randomUUID();
  await supabaseRest(config, "ai_agent_actions", {
    method: "POST",
    headers: { prefer: "return=minimal" },
    body: JSON.stringify({
      id,
      conversation_id: result.conversationId ?? null,
      agent_id: candidate.agentId,
      action_type: candidate.actionType,
      status: "proposed",
      payload: {
        title: candidate.title,
        priority: candidate.priority,
        automation: candidate.automation,
        target: candidate.target,
        draft: result.response,
        toolResults: result.toolResults,
        dedupeKey: candidate.dedupeKey,
        agencyId: candidate.agencyId ?? null,
        agencyName: candidate.agencyName ?? null,
      },
      created_by_role: "admin",
      created_by_id: "ai-autopilot",
      created_at: new Date().toISOString(),
    }),
  });
  return id;
};

const agencyNameById = (data: AppDataLike) => {
  const names = new Map<number, string>();
  for (const admin of list(data.agencyAdmins)) {
    const id = num(admin.agencyId);
    if (id != null && !names.has(id)) {
      names.set(id, text(admin.agencyName) || text(admin.username) || `Agency ${id}`);
    }
  }
  return names;
};

const candidateAgencies = (data: AppDataLike, scopedAgencyId?: number, scopedAgencyName?: string) => {
  if (scopedAgencyId != null) {
    return [{ id: scopedAgencyId, name: scopedAgencyName || `Agency ${scopedAgencyId}` }];
  }
  const names = agencyNameById(data);
  const ids = new Set<number>();
  for (const source of [data.requests, data.chatMessages, data.maids, data.ats?.applications]) {
    for (const item of list(source)) {
      const id = num((item as Record<string, unknown>).agencyId);
      if (id != null) ids.add(id);
    }
  }
  return [...ids].map((id) => ({ id, name: names.get(id) || `Agency ${id}` }));
};

const isOlderThan = (value: unknown, ms: number) => {
  const timestamp = Date.parse(text(value));
  return Number.isFinite(timestamp) && Date.now() - timestamp > ms;
};

const isAiUnavailable = (error: unknown): boolean => {
  const msg = error instanceof Error ? error.message : String(error);
  return msg.includes("429") || /rate.?limit/i.test(msg) || msg.includes("ANTHROPIC_API_KEY is not configured");
};

const offlineFallback = (candidate: AutopilotCandidate, data: AppDataLike): string => {
  const id = candidate.agencyId;
  const pending = list(data.requests).filter((r) => num(r.agencyId) === id && r.status === "pending");
  const unread = list(data.chatMessages).filter(
    (m) => num(m.agencyId) === id && m.senderRole === "client" && m.readByAgency === false,
  );
  const activeApps = list(data.ats?.applications).filter(
    (a) => num(a.agencyId) === id && !["Approved", "Placed", "Rejected"].includes(text(a.status)),
  );
  const publicMaids = list(data.maids).filter((m) => num(m.agencyId) === id && m.isPublic === true);
  const stale = publicMaids.filter((m) => isOlderThan(m.updatedAt, 60 * DAY_MS));
  const enquiries = list(data.enquiries).filter((e) => num(e.agencyId) === id);

  const lines: string[] = ["**Offline Operations Summary** *(AI unavailable — rule-based)*", ""];
  lines.push(`**Pending requests:** ${pending.length}`);
  lines.push(`**Unread client messages:** ${unread.length}`);
  lines.push(`**Active ATS applications:** ${activeApps.length}`);
  lines.push(`**Public maid profiles:** ${publicMaids.length} (${stale.length} not updated in 60+ days)`);
  lines.push(`**Enquiries on file:** ${enquiries.length}`);
  lines.push("");

  if (pending.length > 0)
    lines.push(`⚠ ${pending.length} pending request${pending.length !== 1 ? "s" : ""} need agency action.`);
  if (unread.length > 0)
    lines.push(`⚠ ${unread.length} unread client message${unread.length !== 1 ? "s" : ""} waiting for reply.`);
  if (stale.length > 0)
    lines.push(`⚠ ${stale.length} maid profile${stale.length !== 1 ? "s" : ""} not refreshed in over 60 days.`);
  if (pending.length === 0 && unread.length === 0 && stale.length === 0)
    lines.push("✓ No urgent items detected.");

  return lines.join("\n");
};

const createCandidates = (data: AppDataLike, agencyId?: number, agencyName?: string) => {
  const agencies = candidateAgencies(data, agencyId, agencyName);
  const candidates: AutopilotCandidate[] = [];

  for (const agency of agencies) {
    const pendingRequests = list(data.requests)
      .filter((item) => num(item.agencyId) === agency.id)
      .filter((item) => item.status === "pending")
      .filter((item) => isOlderThan(item.updatedAt || item.createdAt, 12 * 60 * 60 * 1000))
      .slice(0, 3);

    for (const request of pendingRequests) {
      const id = text(request.id);
      candidates.push({
        agentId: "agency_assistant",
        actionType: "request_follow_up",
        title: `Follow up pending request ${id}`,
        message:
          `Draft a concise employer follow-up for pending request ${id}. ` +
          "Use the available request, maid, message, and contract context. Do not promise dates or approvals.",
        agencyId: agency.id,
        agencyName: agency.name,
        priority: "high",
        target: { requestId: id, status: request.status },
        automation: "draft",
        dedupeKey: `request_follow_up:${agency.id}:${id}`,
      });
    }

    const unreadClientMessages = list(data.chatMessages)
      .filter((item) => num(item.agencyId) === agency.id)
      .filter((item) => item.senderRole === "client" && item.readByAgency === false)
      .filter((item) => isOlderThan(item.createdAt, 30 * 60 * 1000))
      .slice(0, 3);

    for (const message of unreadClientMessages) {
      const id = String(message.id ?? "");
      candidates.push({
        agentId: "agency_assistant",
        actionType: "client_message_reply_draft",
        title: `Draft reply for unread client message ${id}`,
        message:
          `Draft a polite agency reply for unread client message ${id}. ` +
          "If details are missing, ask one clear follow-up question. Keep it ready for human review.",
        agencyId: agency.id,
        agencyName: agency.name,
        priority: "high",
        target: { messageId: id, clientId: message.clientId },
        automation: "draft",
        dedupeKey: `client_message_reply_draft:${agency.id}:${id}`,
      });
    }

    const applications = list(data.ats?.applications)
      .filter((item) => num(item.agencyId) === agency.id)
      .filter((item) => !["Approved", "Placed", "Rejected"].includes(text(item.status)))
      .filter((item) => isOlderThan(item.updatedAt || item.appliedAt, 2 * 60 * 60 * 1000))
      .slice(0, 2);

    for (const application of applications) {
      const id = text(application.id);
      candidates.push({
        agentId: "applicant_screening",
        actionType: "applicant_screening_review",
        title: `Screen applicant ${text(application.applicationCode) || id}`,
        message:
          `Screen application ${id} for missing requirements, readiness, and recruiter follow-up questions. ` +
          "Do not make a hiring decision.",
        agencyId: agency.id,
        agencyName: agency.name,
        priority: "medium",
        target: { applicationId: id, status: application.status },
        automation: "recommend",
        dedupeKey: `applicant_screening_review:${agency.id}:${id}`,
      });
    }

    const inactiveMaids = list(data.maids)
      .filter((item) => num(item.agencyId) === agency.id)
      .filter((item) => item.isPublic === true)
      .filter((item) => isOlderThan(item.updatedAt, 60 * DAY_MS))
      .slice(0, 2);

    for (const maid of inactiveMaids) {
      const referenceCode = text(maid.referenceCode);
      candidates.push({
        agentId: "content_generator",
        actionType: "maid_profile_refresh_draft",
        title: `Refresh public maid profile ${referenceCode}`,
        message:
          `Draft a refreshed public profile summary for maid ${referenceCode}. ` +
          "Use only profile facts and mark the content as a draft.",
        agencyId: agency.id,
        agencyName: agency.name,
        priority: "low",
        target: { maidReferenceCode: referenceCode },
        automation: "draft",
        dedupeKey: `maid_profile_refresh_draft:${agency.id}:${referenceCode}`,
      });
    }

    candidates.push({
      agentId: "admin_analytics",
      actionType: "autopilot_operations_digest",
      title: `Operations digest for ${agency.name}`,
      message:
        "Generate a brief autonomous operations digest: bottlenecks, unanswered items, pending requests, applicant risks, and next actions. Avoid unnecessary personal details.",
      agencyId: agency.id,
      agencyName: agency.name,
      priority: "medium",
      target: { agencyId: agency.id },
      automation: "report",
      dedupeKey: `autopilot_operations_digest:${agency.id}:${new Date().toISOString().slice(0, 10)}`,
    });
  }

  return candidates;
};

export const runAiAutopilot = async (options: AiAutopilotOptions) => {
  const maxActions = Math.max(1, Math.min(options.maxActions ?? 8, 20));
  const existingKeys = options.force ? new Set<string>() : await recentActionKeys(options.supabase);
  const candidates = createCandidates(options.appData, options.agencyId, options.agencyName)
    .filter((candidate) => !existingKeys.has(candidate.dedupeKey))
    .slice(0, maxActions);

  const actions = [];

  for (const candidate of candidates) {
    const actor: AiActorContext = {
      role: candidate.agentId === "admin_analytics" ? "admin" : "agency",
      userId: "ai-autopilot",
      agencyId: candidate.agencyId,
      agencyName: candidate.agencyName,
      ip: "scheduled-autopilot",
    };
    let result: Awaited<ReturnType<typeof runAIAgent>>;
    try {
      result = await runAIAgent({
        agentId: candidate.agentId,
        input: {
          message: candidate.message,
          autopilot: true,
          actionType: candidate.actionType,
          target: candidate.target,
        },
        actor,
        appData: options.appData as Record<string, unknown>,
        anthropicApiKey: options.anthropicApiKey,
        supabase: options.supabase,
        request: options.request,
      });
    } catch (err) {
      if (!isAiUnavailable(err)) throw err;
      const fallbackText = offlineFallback(candidate, options.appData);
      result = {
        agent: { id: candidate.agentId, name: candidate.agentId },
        conversationId: crypto.randomUUID(),
        response: fallbackText,
        toolResults: {},
        usage: {},
        offline: true,
      } as unknown as Awaited<ReturnType<typeof runAIAgent>>;
    }

    const actionId = options.dryRun ? null : await writeAction(options.supabase, candidate, result);
    existingKeys.add(candidate.dedupeKey);
    actions.push({
      actionId,
      actionType: candidate.actionType,
      agentId: candidate.agentId,
      title: candidate.title,
      priority: candidate.priority,
      automation: candidate.automation,
      target: candidate.target,
      conversationId: result.conversationId,
      preview: result.response.slice(0, 240),
      offline: (result as Record<string, unknown>).offline === true,
    });
  }

  return {
    dryRun: Boolean(options.dryRun),
    scannedAt: new Date().toISOString(),
    candidateCount: candidates.length,
    actionCount: actions.length,
    actions,
  };
};
