-- Phase 4: agency policy/procedure RAG, versioning and pgvector retrieval.
-- Keep this separate from maid_embeddings and never index private applicant or employer files.

CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE public.knowledge_documents
  ADD COLUMN IF NOT EXISTS current_version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS content_hash TEXT,
  ADD COLUMN IF NOT EXISTS ingestion_status TEXT NOT NULL DEFAULT 'succeeded',
  ADD COLUMN IF NOT EXISTS processing_error TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS source_file_name TEXT,
  ADD COLUMN IF NOT EXISTS source_mime_type TEXT,
  ADD COLUMN IF NOT EXISTS source_storage_path TEXT;

DO $$ BEGIN
  ALTER TABLE public.knowledge_documents
    ADD CONSTRAINT knowledge_documents_ingestion_status_check
    CHECK (ingestion_status IN ('queued','processing','succeeded','failed'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.knowledge_document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.knowledge_documents(id) ON DELETE RESTRICT,
  agency_id INTEGER NOT NULL,
  version INTEGER NOT NULL CHECK (version > 0),
  content_hash TEXT NOT NULL CHECK (content_hash ~ '^[a-f0-9]{64}$'),
  content TEXT NOT NULL CHECK (length(btrim(content)) > 0),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  source_file_name TEXT,
  source_mime_type TEXT,
  source_storage_path TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (document_id, version),
  UNIQUE (agency_id, content_hash)
);
CREATE INDEX IF NOT EXISTS idx_knowledge_document_versions_doc
  ON public.knowledge_document_versions (document_id, version DESC);

CREATE TABLE IF NOT EXISTS public.ai_knowledge_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES public.knowledge_document_versions(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES public.knowledge_documents(id) ON DELETE RESTRICT,
  agency_id INTEGER NOT NULL,
  chunk_index INTEGER NOT NULL CHECK (chunk_index >= 0),
  content TEXT NOT NULL CHECK (length(btrim(content)) > 0),
  embedding_model TEXT NOT NULL,
  embedding vector(384) NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (version_id, chunk_index)
);
CREATE INDEX IF NOT EXISTS idx_ai_knowledge_embeddings_agency_document
  ON public.ai_knowledge_embeddings (agency_id, document_id);
CREATE INDEX IF NOT EXISTS idx_ai_knowledge_embeddings_hnsw
  ON public.ai_knowledge_embeddings USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE TABLE IF NOT EXISTS public.knowledge_ingestion_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id INTEGER NOT NULL,
  source_key TEXT NOT NULL,
  content_hash TEXT NOT NULL CHECK (content_hash ~ '^[a-f0-9]{64}$'),
  status TEXT NOT NULL DEFAULT 'processing'
    CHECK (status IN ('processing','succeeded','duplicate','failed')),
  document_id UUID REFERENCES public.knowledge_documents(id) ON DELETE SET NULL,
  document_version INTEGER,
  error_detail TEXT NOT NULL DEFAULT '',
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_knowledge_ingestion_jobs_agency_status
  ON public.knowledge_ingestion_jobs (agency_id, status, created_at DESC);

ALTER TABLE public.knowledge_document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_knowledge_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_ingestion_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.knowledge_document_versions, public.ai_knowledge_embeddings, public.knowledge_ingestion_jobs FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.knowledge_document_versions, public.ai_knowledge_embeddings, public.knowledge_ingestion_jobs TO service_role;
DROP POLICY IF EXISTS knowledge_document_versions_service_role_only ON public.knowledge_document_versions;
CREATE POLICY knowledge_document_versions_service_role_only ON public.knowledge_document_versions
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS ai_knowledge_embeddings_service_role_only ON public.ai_knowledge_embeddings;
CREATE POLICY ai_knowledge_embeddings_service_role_only ON public.ai_knowledge_embeddings
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS knowledge_ingestion_jobs_service_role_only ON public.knowledge_ingestion_jobs;
CREATE POLICY knowledge_ingestion_jobs_service_role_only ON public.knowledge_ingestion_jobs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.search_ai_knowledge(
  p_agency_id INTEGER,
  p_query_embedding vector(384),
  p_embedding_model TEXT,
  p_match_threshold FLOAT DEFAULT 0.35,
  p_match_count INTEGER DEFAULT 6
)
RETURNS TABLE (
  document_id UUID, title TEXT, category TEXT, source_key TEXT,
  version INTEGER, chunk_index INTEGER, content TEXT, similarity FLOAT, metadata JSONB
)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public, extensions AS $$
  SELECT d.id, d.title, d.category, d.source_key, v.version, e.chunk_index, e.content,
    (1 - (e.embedding <=> p_query_embedding))::FLOAT AS similarity, e.metadata
  FROM public.ai_knowledge_embeddings e
  JOIN public.knowledge_documents d ON d.id = e.document_id
  JOIN public.knowledge_document_versions v ON v.id = e.version_id
  WHERE e.agency_id = p_agency_id
    AND e.embedding_model = p_embedding_model
    AND d.agency_id = p_agency_id
    AND d.active = TRUE
    AND d.ingestion_status = 'succeeded'
    AND d.current_version = v.version
    AND (1 - (e.embedding <=> p_query_embedding)) >= p_match_threshold
  ORDER BY e.embedding <=> p_query_embedding
  LIMIT LEAST(GREATEST(p_match_count, 1), 20);
$$;
REVOKE ALL ON FUNCTION public.search_ai_knowledge(INTEGER, vector, TEXT, FLOAT, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.search_ai_knowledge(INTEGER, vector, TEXT, FLOAT, INTEGER) TO service_role;

-- Private object bucket. App code writes through the authenticated backend/Worker
-- service role; no browser policy is added here.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('agency-knowledge-private', 'agency-knowledge-private', FALSE, 2097152,
  ARRAY['text/plain','text/markdown'])
ON CONFLICT (id) DO UPDATE SET
  public = FALSE,
  file_size_limit = 2097152,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

COMMENT ON TABLE public.knowledge_document_versions IS 'Immutable versions of approved agency knowledge content.';
COMMENT ON TABLE public.ai_knowledge_embeddings IS '384-dimensional embeddings for agency policy knowledge only; never applicant/employer private files.';
COMMENT ON FUNCTION public.search_ai_knowledge(INTEGER, vector, TEXT, FLOAT, INTEGER) IS 'Agency-scoped semantic retrieval restricted to active current knowledge versions and configured embedding model.';

CREATE OR REPLACE FUNCTION public.ingest_ai_knowledge_document(
  p_agency_id INTEGER,
  p_source_key TEXT,
  p_title TEXT,
  p_category TEXT,
  p_content TEXT,
  p_content_hash TEXT,
  p_metadata JSONB,
  p_chunks JSONB,
  p_created_by TEXT DEFAULT NULL,
  p_source_file_name TEXT DEFAULT NULL,
  p_source_mime_type TEXT DEFAULT NULL,
  p_source_storage_path TEXT DEFAULT NULL
)
RETURNS TABLE (document_id UUID, version INTEGER, duplicate BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  existing_doc public.knowledge_documents%ROWTYPE;
  prior_version public.knowledge_document_versions%ROWTYPE;
  next_version INTEGER;
  new_doc_id UUID;
  new_version_id UUID;
  chunk JSONB;
BEGIN
  IF p_agency_id IS NULL OR p_agency_id <= 0
     OR length(btrim(p_source_key)) = 0 OR length(btrim(p_title)) = 0
     OR length(btrim(p_content)) = 0 OR length(p_content) > 100000
     OR p_content_hash !~ '^[a-f0-9]{64}$'
     OR p_category NOT IN ('SOP','FAQ','MOM')
     OR jsonb_typeof(p_chunks) <> 'array' OR jsonb_array_length(p_chunks) = 0 THEN
    RAISE EXCEPTION 'Invalid agency knowledge document';
  END IF;

  SELECT * INTO prior_version FROM public.knowledge_document_versions v
    WHERE v.agency_id = p_agency_id AND v.content_hash = p_content_hash LIMIT 1;
  IF FOUND THEN
    RETURN QUERY SELECT prior_version.document_id, prior_version.version, TRUE;
    RETURN;
  END IF;

  SELECT * INTO existing_doc FROM public.knowledge_documents d
    WHERE d.agency_id = p_agency_id AND d.collection = 'agency_knowledge'
      AND d.source_key = p_source_key FOR UPDATE;
  IF FOUND THEN
    new_doc_id := existing_doc.id;
    next_version := existing_doc.current_version + 1;
  ELSE
    INSERT INTO public.knowledge_documents
      (agency_id,collection,source_key,title,category,content,metadata,active,current_version,ingestion_status)
    VALUES (p_agency_id,'agency_knowledge',p_source_key,p_title,p_category,p_content,
      COALESCE(p_metadata,'{}'::jsonb),FALSE,0,'processing')
    RETURNING id INTO new_doc_id;
    next_version := 1;
  END IF;

  INSERT INTO public.knowledge_document_versions
    (document_id,agency_id,version,content_hash,content,metadata,source_file_name,source_mime_type,source_storage_path,created_by)
  VALUES (new_doc_id,p_agency_id,next_version,p_content_hash,p_content,
    COALESCE(p_metadata,'{}'::jsonb),p_source_file_name,p_source_mime_type,p_source_storage_path,p_created_by)
  RETURNING id INTO new_version_id;

  FOR chunk IN SELECT value FROM jsonb_array_elements(p_chunks) LOOP
    INSERT INTO public.ai_knowledge_embeddings
      (version_id,document_id,agency_id,chunk_index,content,embedding_model,embedding,metadata)
    VALUES (new_version_id,new_doc_id,p_agency_id,(chunk->>'chunk_index')::INTEGER,
      chunk->>'content',chunk->>'embedding_model',((chunk->'embedding')::text)::vector(384),
      COALESCE(chunk->'metadata','{}'::jsonb));
  END LOOP;

  UPDATE public.knowledge_documents SET
    title=p_title,category=p_category,content=p_content,metadata=COALESCE(p_metadata,'{}'::jsonb),
    active=TRUE,current_version=next_version,content_hash=p_content_hash,
    ingestion_status='succeeded',processing_error='',source_file_name=p_source_file_name,
    source_mime_type=p_source_mime_type,source_storage_path=p_source_storage_path,updated_at=NOW()
  WHERE id=new_doc_id;

  RETURN QUERY SELECT new_doc_id,next_version,FALSE;
END;
$$;
REVOKE ALL ON FUNCTION public.ingest_ai_knowledge_document(INTEGER,TEXT,TEXT,TEXT,TEXT,TEXT,JSONB,JSONB,TEXT,TEXT,TEXT,TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ingest_ai_knowledge_document(INTEGER,TEXT,TEXT,TEXT,TEXT,TEXT,JSONB,JSONB,TEXT,TEXT,TEXT,TEXT) TO service_role;
