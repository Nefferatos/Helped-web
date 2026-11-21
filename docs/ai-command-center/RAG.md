# Agency Knowledge RAG

## Phase 4 implementation

The current Worker-backed Knowledge Library now has a versioned semantic retrieval path for approved agency SOP, FAQ, and MOM knowledge. It uses Supabase Postgres/pgvector and a configurable Cloudflare Workers AI embedding model. The default model, `@cf/baai/bge-small-en-v1.5`, returns 384 dimensions; any configured alternative must also return exactly 384 finite values.

The migration `supabase/20261120_ai_command_center_rag.sql` adds document source/version metadata, immutable versions, current-version embeddings, HNSW cosine index, an agency-scoped current-version search RPC, private source bucket, and an ingestion job ledger with success/duplicate/failure state. Maid profile vectors remain in their separate table. Applicant and employer private records are never included in this collection.

## Ingestion and retrieval

1. An authenticated agency administrator submits approved knowledge text or uploads a UTF-8 TXT/Markdown source (maximum 2 MB; extracted text maximum 80,000 characters).
2. The Worker validates agency-owned metadata, file extension, MIME, and size, stores the original upload in the private bucket, normalizes content, and calculates a SHA-256 content hash.
3. Exact duplicates within the agency return the existing document/version without creating embeddings.
4. Content is chunked with overlap, embedded in bounded batches, and committed transactionally through `ingest_ai_knowledge_document`. The existing document remains current until all new version rows and vectors are inserted.
5. Retrieval generates a query embedding and calls `search_ai_knowledge`, which enforces agency ID, active state, successful ingestion, and current version in SQL. Results include source key, document, version, chunk and metadata references.
6. Pre-version legacy knowledge may still use the old isolated JSONB chunk retrieval path until reprocessed. When the Phase 4 migration or Workers AI embeddings are unavailable, text submissions fall back to the existing JSONB index and return an explicit legacy-mode notice. File uploads require the Phase 4 migration and Workers AI binding.

## Endpoints

- `POST /api/knowledge/documents`: index approved text supplied as JSON.
- `POST /api/knowledge/documents/upload`: upload and index TXT/Markdown into private Storage.
- `GET /api/knowledge/documents`: list agency documents and processing/version metadata (content is not included).
- `GET /api/knowledge/documents/:documentId/versions`: list version hashes and source metadata without exposing version contents.
- `POST /api/knowledge/documents/:documentId/reprocess`: re-embed the current approved document version.
- `DELETE /api/knowledge/documents/:documentId`: administrator-only soft deactivation; historical versions and source objects are retained.
- `GET /api/knowledge/search?q=...`: agency-scoped semantic snippets.

All routes require the existing agency admin authentication and use the server-side Supabase service role. The vector RPC is not executable by `anon` or `authenticated` roles.

## Current limitations

- PDF, DOCX, XLSX, and legacy XLS text extraction are not enabled. The upload endpoint accepts TXT and Markdown only; unsupported formats fail clearly instead of being indexed as binary or sent to an external processor.
- Source-object deletion and version purging are not implemented. Deactivation stops retrieval while preserving audit/history; a future retention workflow must govern permanent deletion.
- The Express legacy `vectorService.ts` still uses its old 64-dimensional lexical hash vectors for legacy routes. Deployed Cloudflare Worker knowledge retrieval is the authoritative path in the current hosting setup. Consolidation is a later backend alignment task.
- The migrations have not been applied or tested against the live Supabase project in this phase. Apply Phase 2 foundation and then this RAG migration in the intended project; verify vector extension availability, Storage bucket creation, RPC grants, and RLS before enabling ingestion.
