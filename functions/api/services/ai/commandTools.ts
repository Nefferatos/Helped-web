import type { CommandAgentId } from "./commandAgents";

export type CommandToolContext = {
  agencyId: number;
  queryKnowledge: (query: string) => Promise<unknown[]>;
};

export type CommandToolDefinition = {
  name: string;
  description: string;
  allowedAgents: CommandAgentId[];
  inputSchema: { type: "object"; required: string[]; properties: Record<string, unknown>; additionalProperties: false };
  outputSchema: { type: "object"; properties: Record<string, unknown> };
  executionMethod: "worker_function";
  readOnly: true;
  requiresApproval: false;
  enabled: true;
  execute: (input: Record<string, unknown>, context: CommandToolContext) => Promise<Record<string, unknown>>;
};

const allAgents: CommandAgentId[] = ["applicant_agent", "employer_agent", "marketing_agent", "operations_agent", "interview_agent", "analytics_agent"];

const searchApprovedKnowledge: CommandToolDefinition = {
  name: "search_approved_knowledge",
  description: "Search active, approved agency policy and procedure documents. Does not search applicant or employer records.",
  allowedAgents: allAgents,
  inputSchema: {
    type: "object", required: ["query"], additionalProperties: false,
    properties: { query: { type: "string", minLength: 3, maxLength: 1000 } },
  },
  outputSchema: { type: "object", properties: { sources: { type: "array" } } },
  executionMethod: "worker_function",
  readOnly: true,
  requiresApproval: false,
  enabled: true,
  execute: async (input, context) => ({ sources: await context.queryKnowledge(String(input.query)) }),
};

const registry: Record<string, CommandToolDefinition> = {
  [searchApprovedKnowledge.name]: searchApprovedKnowledge,
};

export const getCommandTool = (name: string): CommandToolDefinition | null => registry[name] ?? null;

export const listCommandTools = () => Object.values(registry).map(({ execute: _execute, ...definition }) => definition);

export const getCommandToolsForAgent = (agentId: CommandAgentId) => listCommandTools()
  .filter((tool) => tool.enabled && tool.allowedAgents.includes(agentId))
  .map((tool) => tool.name);

export const validateCommandToolInput = (tool: CommandToolDefinition, value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const keys = Object.keys(input);
  if (keys.some((key) => !Object.prototype.hasOwnProperty.call(tool.inputSchema.properties, key))) return null;
  for (const required of tool.inputSchema.required) if (!Object.prototype.hasOwnProperty.call(input, required)) return null;
  if (tool.name === "search_approved_knowledge") {
    const query = input.query;
    if (typeof query !== "string" || query.trim().length < 3 || query.length > 1000) return null;
    return { query: query.trim() };
  }
  return null;
};
