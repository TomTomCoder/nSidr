-- ponytail: create doc_link if missing (parallel migration was never in this history)
CREATE TABLE IF NOT EXISTS "doc_link" (
  "id" TEXT NOT NULL,
  "fromDocId" TEXT NOT NULL,
  "toDocId" TEXT,
  "toUrl" TEXT,
  "linkText" TEXT NOT NULL,
  "linkType" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "doc_link_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "doc_link_fromDocId_fkey" FOREIGN KEY ("fromDocId") REFERENCES "imported_doc"("id") ON DELETE CASCADE,
  CONSTRAINT "doc_link_toDocId_fkey" FOREIGN KEY ("toDocId") REFERENCES "imported_doc"("id") ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS "doc_link_fromDocId_idx" ON "doc_link"("fromDocId");
CREATE INDEX IF NOT EXISTS "doc_link_toDocId_idx" ON "doc_link"("toDocId");

-- D-21-01: add 'agent' to DocSourceType enum
ALTER TYPE "DocSourceType" ADD VALUE IF NOT EXISTS 'agent';

-- D-21-02: extend doc_link with label + createdBy + uniqueness + self-link guard
ALTER TABLE "doc_link"
  ADD COLUMN IF NOT EXISTS "label" TEXT,
  ADD COLUMN IF NOT EXISTS "createdBy" TEXT;

-- CHECK: self-links rejected. WHERE clause tolerates legacy rows where toDocId IS NULL (external links).
ALTER TABLE "doc_link"
  ADD CONSTRAINT "doc_link_no_self_link"
  CHECK ("toDocId" IS NULL OR "fromDocId" <> "toDocId");

-- UNIQUE: one (from,to,label) tuple — NULLs treated distinct in Postgres which is fine for legacy rows.
CREATE UNIQUE INDEX "doc_link_from_to_label_uq"
  ON "doc_link" ("fromDocId", "toDocId", "label");
