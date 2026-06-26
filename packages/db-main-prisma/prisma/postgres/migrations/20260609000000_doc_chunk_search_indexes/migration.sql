-- ponytail: create doc_chunk if missing (parallel migration was never in this history)
CREATE TABLE IF NOT EXISTS "doc_chunk" (
  "id"          TEXT NOT NULL,
  "docId"       TEXT NOT NULL,
  "chunkIndex"  INTEGER NOT NULL,
  "content"     TEXT NOT NULL,
  "embedding"   vector(1536),
  "tokenCount"  INTEGER NOT NULL,
  "startOffset" INTEGER NOT NULL,
  "endOffset"   INTEGER NOT NULL,
  CONSTRAINT "doc_chunk_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "doc_chunk_docId_fkey" FOREIGN KEY ("docId") REFERENCES "imported_doc"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "doc_chunk_docId_idx" ON "doc_chunk"("docId");

-- F-02: Indexation performance — ANN + full-text indexes on "doc_chunk".
--
-- Before this migration every document search did a sequential scan over all
-- chunks in the space:
--   * semanticSearch:  ORDER BY embedding <=> $query           (no ANN index)
--   * keywordSearch:   to_tsvector('english', content) @@ ...  (no FTS index)
-- Both indexes below are additive and idempotent — safe to re-run and safe on
-- the keyword-only (no-embedding) deployment.

-- Keyword search: expression GIN index that exactly matches the query's
-- to_tsvector('english', content). The 2-arg to_tsvector with a constant
-- regconfig is IMMUTABLE, so it is valid in an index expression.
CREATE INDEX IF NOT EXISTS "doc_chunk_content_fts_idx"
  ON "doc_chunk" USING gin (to_tsvector('english', content));

-- Semantic search: HNSW index for cosine distance (the <=> operator used by
-- semanticSearch). Best-effort — wrapped so an older pgvector build without
-- HNSW support cannot abort the migration. Search still works without it
-- (sequential scan), just slower; the index turns it into an ANN lookup.
DO $$
BEGIN
  CREATE INDEX IF NOT EXISTS "doc_chunk_embedding_hnsw_idx"
    ON "doc_chunk" USING hnsw (embedding vector_cosine_ops);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'doc_chunk HNSW index skipped (pgvector hnsw unavailable): %', SQLERRM;
END $$;
