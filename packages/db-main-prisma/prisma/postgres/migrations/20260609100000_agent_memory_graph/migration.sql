-- Phase 1 — Agent memory graph: entities + relations extracted from documents.
-- Additive and idempotent. The vector column is hand-created (Prisma cannot emit the
-- pgvector type), mirroring how doc_chunk was created.

CREATE TABLE IF NOT EXISTS "memory_entity" (
  "id"             TEXT NOT NULL,
  "spaceId"        TEXT NOT NULL,
  "name"           TEXT NOT NULL,
  "type"           TEXT NOT NULL,
  "summary"        TEXT NOT NULL,
  "embedding"      vector(1536),
  "sourceDocId"    TEXT,
  "version"        INTEGER NOT NULL DEFAULT 1,
  "supersededById" TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "memory_entity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "memory_relation" (
  "id"           TEXT NOT NULL,
  "spaceId"      TEXT NOT NULL,
  "fromEntityId" TEXT NOT NULL,
  "toEntityId"   TEXT NOT NULL,
  "label"        TEXT NOT NULL,
  "weight"       DOUBLE PRECISION NOT NULL DEFAULT 1,
  "validFrom"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "validTo"      TIMESTAMP(3),
  "sourceDocId"  TEXT,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "memory_relation_pkey" PRIMARY KEY ("id")
);

-- Foreign keys (idempotent via duplicate_object guard).
DO $$ BEGIN
  ALTER TABLE "memory_entity" ADD CONSTRAINT "memory_entity_sourceDocId_fkey"
    FOREIGN KEY ("sourceDocId") REFERENCES "imported_doc"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "memory_relation" ADD CONSTRAINT "memory_relation_fromEntityId_fkey"
    FOREIGN KEY ("fromEntityId") REFERENCES "memory_entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "memory_relation" ADD CONSTRAINT "memory_relation_toEntityId_fkey"
    FOREIGN KEY ("toEntityId") REFERENCES "memory_entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "memory_entity_spaceId_name_idx" ON "memory_entity"("spaceId", "name");
CREATE INDEX IF NOT EXISTS "memory_entity_sourceDocId_idx" ON "memory_entity"("sourceDocId");
CREATE INDEX IF NOT EXISTS "memory_relation_spaceId_fromEntityId_idx" ON "memory_relation"("spaceId", "fromEntityId");
CREATE INDEX IF NOT EXISTS "memory_relation_spaceId_toEntityId_idx" ON "memory_relation"("spaceId", "toEntityId");

-- ANN index on entity embeddings (same HNSW pattern as F-02 doc_chunk), best-effort.
DO $$
BEGIN
  CREATE INDEX IF NOT EXISTS "memory_entity_embedding_hnsw_idx"
    ON "memory_entity" USING hnsw (embedding vector_cosine_ops);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'memory_entity HNSW index skipped (pgvector hnsw unavailable): %', SQLERRM;
END $$;
