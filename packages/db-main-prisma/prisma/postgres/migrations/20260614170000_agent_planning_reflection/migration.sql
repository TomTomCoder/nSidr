-- AlterTable: plan-and-execute + reflexion controls for the agentic loop
ALTER TABLE "agent" ADD COLUMN IF NOT EXISTS "planning_enabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "agent" ADD COLUMN IF NOT EXISTS "reflection_enabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "agent" ADD COLUMN IF NOT EXISTS "max_reflections" INTEGER NOT NULL DEFAULT 2;
