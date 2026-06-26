-- Add knowledge_sources JSON column to the agent table.
-- Shape: { "docIds": string[], "folderIds": string[] }
-- NULL means no scope restriction (whole-space search, backward-compatible).

ALTER TABLE "agent" ADD COLUMN IF NOT EXISTS "knowledge_sources" JSONB;
