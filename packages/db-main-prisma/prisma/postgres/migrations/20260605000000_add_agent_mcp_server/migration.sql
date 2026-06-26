-- Add AgentMcpServer model: stores per-agent external MCP server connections.
-- Each row represents one MCP server URL that the agent's MCP client will connect to.
-- Transport defaults to 'streamable-http' (the only transport used in Phase 17).

-- ponytail: create agent if missing (parallel migration was never in this history)
CREATE TABLE IF NOT EXISTS "agent" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "base_id" TEXT NOT NULL,
  "instructions" TEXT,
  "model_key" TEXT,
  "is_public" BOOLEAN NOT NULL DEFAULT false,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "max_iterations" INTEGER NOT NULL DEFAULT 10,
  "created_by" TEXT NOT NULL,
  "created_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_modified_time" TIMESTAMP(3),
  "last_modified_by" TEXT,
  CONSTRAINT "agent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "agent_base_id_fkey" FOREIGN KEY ("base_id") REFERENCES "base"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "agent_base_id_idx" ON "agent"("base_id");
CREATE INDEX IF NOT EXISTS "agent_created_by_idx" ON "agent"("created_by");

CREATE TABLE "agent_mcp_server" (
    "id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "transport" TEXT NOT NULL DEFAULT 'streamable-http',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_modified_time" TIMESTAMP(3),

    CONSTRAINT "agent_mcp_server_pkey" PRIMARY KEY ("id")
);

-- Indexes for common query patterns
CREATE UNIQUE INDEX "agent_mcp_server_agent_id_url_key" ON "agent_mcp_server"("agent_id", "url");
CREATE INDEX "agent_mcp_server_agent_id_idx" ON "agent_mcp_server"("agent_id");

-- FK: cascade-delete when the parent agent is removed
ALTER TABLE "agent_mcp_server" ADD CONSTRAINT "agent_mcp_server_agent_id_fkey"
    FOREIGN KEY ("agent_id") REFERENCES "agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
