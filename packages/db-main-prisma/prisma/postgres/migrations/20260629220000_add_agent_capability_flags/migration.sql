-- Agent capability toggles: mentions/DM/memory were previously hard-coded as
-- always-on (or display-only) in the frontend with no per-agent persistence.
ALTER TABLE "agent" ADD COLUMN IF NOT EXISTS "respond_to_mentions" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "agent" ADD COLUMN IF NOT EXISTS "allow_direct_message" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "agent" ADD COLUMN IF NOT EXISTS "memory_enabled" BOOLEAN NOT NULL DEFAULT true;
