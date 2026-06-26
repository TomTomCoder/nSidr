-- migration: add_doc_folder_model
-- Note: doc_folder table and imported_doc columns were pre-created by parallel migration.
-- This migration ensures the schema is applied idempotently.
CREATE EXTENSION IF NOT EXISTS vector;

-- ponytail: create imported_doc if missing (parallel migration was never in this history)
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_type WHERE typname = 'DocSourceType') THEN
    CREATE TYPE "DocSourceType" AS ENUM ('markdown', 'pdf', 'url', 'agent');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "imported_doc" (
  "id"            TEXT NOT NULL,
  "spaceId"       TEXT NOT NULL,
  "title"         TEXT NOT NULL,
  "sourceType"    "DocSourceType" NOT NULL,
  "sourceUrl"     TEXT,
  "rawContent"    TEXT NOT NULL,
  "wordCount"     INTEGER NOT NULL,
  "createdBy"     TEXT NOT NULL,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL,
  "isIndexed"     BOOLEAN NOT NULL DEFAULT false,
  "indexProgress" INTEGER NOT NULL DEFAULT 0,
  "chunkCount"    INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "imported_doc_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "imported_doc_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "space"("id") ON DELETE CASCADE,
  CONSTRAINT "imported_doc_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id")
);

CREATE TABLE IF NOT EXISTS "doc_folder" (
  "id"        TEXT NOT NULL,
  "spaceId"   TEXT NOT NULL,
  "parentId"  TEXT,
  "name"      TEXT NOT NULL,
  "order"     DOUBLE PRECISION NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "doc_folder_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "doc_folder_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "space"("id") ON DELETE CASCADE,
  CONSTRAINT "doc_folder_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "doc_folder"("id") ON DELETE CASCADE
);

ALTER TABLE "imported_doc" ADD COLUMN IF NOT EXISTS "folderId" TEXT;
ALTER TABLE "imported_doc" ADD COLUMN IF NOT EXISTS "order" DOUBLE PRECISION NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'imported_doc_folderId_fkey'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE "imported_doc" ADD CONSTRAINT "imported_doc_folderId_fkey"
      FOREIGN KEY ("folderId") REFERENCES "doc_folder"("id") ON DELETE SET NULL;
  END IF;
END $$;
