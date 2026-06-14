const EMBEDDING_MODEL = "@cf/baai/bge-small-en-v1.5";
const EMBEDDINGS_TABLE = "maid_embeddings";

type EmbeddingEnv = {
  AI?: { run(model: string, inputs: Record<string, unknown>): Promise<Record<string, unknown>> };
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
};

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

const sbHeaders = (env: EmbeddingEnv): Record<string, string> => ({
  apikey: env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY ?? ""}`,
  "content-type": "application/json",
});

/** Build a rich plain-text representation of a maid profile for embedding. */
export const buildMaidText = (maid: Record<string, unknown>): string => {
  const langs = (maid.languageSkills as Array<Record<string, unknown>> | undefined)
    ?.map((l) => str(l.language))
    .filter(Boolean)
    .join(", ");

  const workAreas = Array.isArray(maid.workAreas)
    ? (maid.workAreas as unknown[]).map(str).filter(Boolean).join(", ")
    : "";

  const skills = maid.skillsPreferences
    ? JSON.stringify(maid.skillsPreferences)
    : "";

  const history = Array.isArray(maid.employmentHistory)
    ? (maid.employmentHistory as Record<string, unknown>[])
        .map((h) => [str(h.country), str(h.duties)].filter(Boolean).join(": "))
        .filter(Boolean)
        .join("; ")
    : "";

  return [
    str(maid.fullName),
    str(maid.nationality) && `Nationality: ${str(maid.nationality)}`,
    str(maid.type) && `Type: ${str(maid.type)}`,
    str(maid.status) && `Status: ${str(maid.status)}`,
    langs && `Languages: ${langs}`,
    workAreas && `Work areas: ${workAreas}`,
    str(maid.introduction),
    skills && `Skills/Preferences: ${skills}`,
    history && `Work history: ${history}`,
  ]
    .filter(Boolean)
    .join(". ");
};

/** Build a natural-language search query from employer preference inputs. */
export const buildRecommendationQuery = (input: Record<string, unknown>): string => {
  const parts: string[] = [];
  if (str(input.message)) parts.push(str(input.message));
  if (str(input.nationalityPreference)) parts.push(`nationality: ${str(input.nationalityPreference)}`);
  if (input.childcareExperience) parts.push("childcare or infant care experience");
  if (input.elderlyCareExperience) parts.push("elderly or bedridden care experience");
  if (input.cookingSkills) parts.push("cooking skills");
  if (str(input.languageSkills || input.language)) parts.push(`language: ${str(input.languageSkills || input.language)}`);
  if (str(input.maidType)) parts.push(`type: ${str(input.maidType)}`);
  return parts.join(". ");
};

/** Generate a 384-dim embedding vector using Cloudflare Workers AI. */
export const generateEmbedding = async (
  env: EmbeddingEnv,
  text: string,
): Promise<number[] | null> => {
  if (!env.AI || !text.trim()) return null;
  try {
    const result = await env.AI.run(EMBEDDING_MODEL, { text: [text] });
    const data = (result as { data?: number[][] }).data;
    if (!Array.isArray(data) || !data[0]) return null;
    return Array.from(data[0]);
  } catch {
    return null;
  }
};

/**
 * Generate an embedding for a maid profile and upsert it into Supabase.
 * Fire-and-forget safe — all errors are swallowed.
 */
export const upsertMaidEmbedding = async (
  env: EmbeddingEnv,
  maid: Record<string, unknown>,
): Promise<void> => {
  if (!env.AI || !env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return;
  const text = buildMaidText(maid);
  if (!text) return;
  const embedding = await generateEmbedding(env, text);
  if (!embedding) return;

  await fetch(`${env.SUPABASE_URL}/rest/v1/${EMBEDDINGS_TABLE}`, {
    method: "POST",
    headers: {
      ...sbHeaders(env),
      prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify({
      reference_code: maid.referenceCode,
      embedding: JSON.stringify(embedding),
      updated_at: new Date().toISOString(),
    }),
  }).catch(() => {});
};

/**
 * Search for the most semantically similar maid profiles to the given query.
 * Returns reference codes ordered by cosine similarity (best match first).
 * Returns [] when Workers AI or Supabase is unavailable — callers fall back gracefully.
 */
export const searchSimilarMaids = async (
  env: EmbeddingEnv,
  query: string,
  limit = 12,
): Promise<string[]> => {
  if (!env.AI || !env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return [];
  const embedding = await generateEmbedding(env, query);
  if (!embedding) return [];

  const response = await fetch(
    `${env.SUPABASE_URL}/rest/v1/rpc/search_maid_embeddings`,
    {
      method: "POST",
      headers: sbHeaders(env),
      body: JSON.stringify({
        query_embedding: embedding,
        match_threshold: 0.3,
        match_count: limit,
      }),
    },
  ).catch(() => null);

  if (!response?.ok) return [];
  const results = (await response.json().catch(() => [])) as {
    reference_code: string;
    similarity: number;
  }[];
  return results.map((r) => r.reference_code);
};
