-- ponytail: create agent_connection if missing (parallel migration was never in this history)
CREATE TABLE IF NOT EXISTS "agent_connection" (
  "id" TEXT NOT NULL,
  "agent_id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "encrypted_token" TEXT,
  "scopes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "is_enabled" BOOLEAN NOT NULL DEFAULT false,
  "created_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_modified_time" TIMESTAMP(3),
  CONSTRAINT "agent_connection_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "agent_connection_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agent"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "agent_connection_agent_id_provider_key" ON "agent_connection"("agent_id", "provider");
CREATE INDEX IF NOT EXISTS "agent_connection_agent_id_idx" ON "agent_connection"("agent_id");

-- AlterTable
ALTER TABLE "agent_connection" ADD COLUMN IF NOT EXISTS "user_id" TEXT;

-- CreateIndex
CREATE INDEX "agent_connection_agent_id_user_id_provider_idx" ON "agent_connection"("agent_id", "user_id", "provider");
