-- Per-document indexation progress (0-100). Persisted by the ingest worker so the
-- library can render a live progress bar per document, surviving reloads and
-- covering import, edit-reindex, and boot-recovery jobs alike.
ALTER TABLE "imported_doc" ADD COLUMN IF NOT EXISTS "indexProgress" INTEGER NOT NULL DEFAULT 0;
