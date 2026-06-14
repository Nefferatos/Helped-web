-- Enable pgvector extension (already available on all Supabase projects)
CREATE EXTENSION IF NOT EXISTS vector;

-- Maid embeddings table
-- Stores one 384-dimensional embedding per maid (bge-small-en-v1.5 via Cloudflare Workers AI)
CREATE TABLE IF NOT EXISTS maid_embeddings (
  reference_code TEXT PRIMARY KEY,
  embedding      vector(384) NOT NULL,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- HNSW index for fast approximate cosine similarity search
CREATE INDEX IF NOT EXISTS maid_embeddings_hnsw_idx
  ON maid_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- RPC function called by the Worker for semantic maid search
CREATE OR REPLACE FUNCTION search_maid_embeddings(
  query_embedding vector(384),
  match_threshold FLOAT DEFAULT 0.3,
  match_count     INT   DEFAULT 12
)
RETURNS TABLE (reference_code TEXT, similarity FLOAT)
LANGUAGE SQL STABLE
AS $$
  SELECT
    me.reference_code,
    (1 - (me.embedding <=> query_embedding))::FLOAT AS similarity
  FROM maid_embeddings me
  WHERE (1 - (me.embedding <=> query_embedding)) > match_threshold
  ORDER BY me.embedding <=> query_embedding
  LIMIT match_count;
$$;
