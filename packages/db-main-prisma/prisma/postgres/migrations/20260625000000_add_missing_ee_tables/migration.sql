-- ponytail: create all EE tables that were missing from migration history
-- (created by parallel/squashed migrations that were never in this repo)

-- Enums
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_type WHERE typname = 'OAuthIntegrationProvider') THEN
    CREATE TYPE "OAuthIntegrationProvider" AS ENUM ('GMAIL', 'GCALENDAR', 'GDRIVE', 'GCHAT', 'GMEET', 'SLACK');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_type WHERE typname = 'OAuthSyncDirection') THEN
    CREATE TYPE "OAuthSyncDirection" AS ENUM ('IMPORT', 'EXPORT', 'BIDIRECTIONAL');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_type WHERE typname = 'ExternalConnectionType') THEN
    CREATE TYPE "ExternalConnectionType" AS ENUM ('qdrant', 'postgres');
  END IF;
END $$;

-- ai_prompt_override
CREATE TABLE IF NOT EXISTS "ai_prompt_override" (
  "id"                 TEXT NOT NULL,
  "prompt_key"         TEXT NOT NULL,
  "model_pattern"      TEXT,
  "content"            TEXT NOT NULL,
  "is_active"          BOOLEAN NOT NULL DEFAULT true,
  "created_time"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by"         TEXT NOT NULL,
  "last_modified_time" TIMESTAMP(3),
  "last_modified_by"   TEXT,
  CONSTRAINT "ai_prompt_override_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ai_prompt_override_prompt_key_model_pattern_key" ON "ai_prompt_override"("prompt_key", "model_pattern");
CREATE INDEX IF NOT EXISTS "ai_prompt_override_prompt_key_idx" ON "ai_prompt_override"("prompt_key");

-- oauth_integration
CREATE TABLE IF NOT EXISTS "oauth_integration" (
  "id"            TEXT NOT NULL,
  "spaceId"       TEXT NOT NULL,
  "provider"      "OAuthIntegrationProvider" NOT NULL,
  "accessToken"   TEXT NOT NULL,
  "refreshToken"  TEXT,
  "tokenExpiry"   TIMESTAMP(3),
  "scopes"        TEXT[] NOT NULL,
  "userId"        TEXT NOT NULL,
  "isActive"      BOOLEAN NOT NULL DEFAULT true,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL,
  CONSTRAINT "oauth_integration_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "oauth_integration_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "space"("id") ON DELETE CASCADE,
  CONSTRAINT "oauth_integration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id")
);
CREATE INDEX IF NOT EXISTS "oauth_integration_spaceId_idx" ON "oauth_integration"("spaceId");
CREATE INDEX IF NOT EXISTS "oauth_integration_userId_idx" ON "oauth_integration"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "oauth_integration_spaceId_provider_userId_key" ON "oauth_integration"("spaceId", "provider", "userId");

-- oauth_integration_webhook
CREATE TABLE IF NOT EXISTS "oauth_integration_webhook" (
  "id"                TEXT NOT NULL,
  "integrationId"     TEXT NOT NULL,
  "event"             TEXT NOT NULL,
  "workflowTriggerId" TEXT,
  "isActive"          BOOLEAN NOT NULL DEFAULT true,
  "lastTriggeredAt"   TIMESTAMP(3),
  "config"            JSONB NOT NULL DEFAULT '{}',
  CONSTRAINT "oauth_integration_webhook_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "oauth_integration_webhook_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "oauth_integration"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "oauth_integration_webhook_integrationId_idx" ON "oauth_integration_webhook"("integrationId");

-- oauth_integration_field_sync
CREATE TABLE IF NOT EXISTS "oauth_integration_field_sync" (
  "id"            TEXT NOT NULL,
  "integrationId" TEXT NOT NULL,
  "tableId"       TEXT NOT NULL,
  "fieldId"       TEXT NOT NULL,
  "syncDirection" "OAuthSyncDirection" NOT NULL,
  "lastSyncedAt"  TIMESTAMP(3),
  "config"        JSONB NOT NULL,
  CONSTRAINT "oauth_integration_field_sync_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "oauth_integration_field_sync_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "oauth_integration"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "oauth_integration_field_sync_integrationId_idx" ON "oauth_integration_field_sync"("integrationId");
CREATE INDEX IF NOT EXISTS "oauth_integration_field_sync_tableId_idx" ON "oauth_integration_field_sync"("tableId");

-- agent_tool
CREATE TABLE IF NOT EXISTS "agent_tool" (
  "id"         TEXT NOT NULL,
  "agent_id"   TEXT NOT NULL,
  "tool_name"  TEXT NOT NULL,
  "is_enabled" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "agent_tool_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "agent_tool_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agent"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "agent_tool_agent_id_tool_name_key" ON "agent_tool"("agent_id", "tool_name");
CREATE INDEX IF NOT EXISTS "agent_tool_agent_id_idx" ON "agent_tool"("agent_id");

-- agent_trigger
CREATE TABLE IF NOT EXISTS "agent_trigger" (
  "id"           TEXT NOT NULL,
  "agent_id"     TEXT NOT NULL,
  "trigger_type" TEXT NOT NULL,
  "config"       JSONB,
  "is_active"    BOOLEAN NOT NULL DEFAULT true,
  "created_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "agent_trigger_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "agent_trigger_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agent"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "agent_trigger_agent_id_idx" ON "agent_trigger"("agent_id");

-- agent_memory
CREATE TABLE IF NOT EXISTS "agent_memory" (
  "id"           TEXT NOT NULL,
  "agent_id"     TEXT NOT NULL,
  "memory_type"  TEXT NOT NULL,
  "content"      TEXT NOT NULL,
  "metadata"     JSONB,
  "expires_at"   TIMESTAMP(3),
  "created_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "agent_memory_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "agent_memory_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agent"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "agent_memory_agent_id_memory_type_idx" ON "agent_memory"("agent_id", "memory_type");
CREATE INDEX IF NOT EXISTS "agent_memory_expires_at_idx" ON "agent_memory"("expires_at");

-- workspace_conversation
CREATE TABLE IF NOT EXISTS "workspace_conversation" (
  "id"           TEXT NOT NULL,
  "space_id"     TEXT NOT NULL,
  "title"        TEXT,
  "status"       TEXT NOT NULL DEFAULT 'in_progress',
  "created_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_time" TIMESTAMP(3) NOT NULL,
  "created_by"   TEXT NOT NULL,
  CONSTRAINT "workspace_conversation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "workspace_conversation_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "space"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "workspace_conversation_space_id_idx" ON "workspace_conversation"("space_id");
CREATE INDEX IF NOT EXISTS "workspace_conversation_created_time_idx" ON "workspace_conversation"("created_time");

-- workspace_conversation_message
CREATE TABLE IF NOT EXISTS "workspace_conversation_message" (
  "id"              TEXT NOT NULL,
  "conversation_id" TEXT NOT NULL,
  "role"            TEXT NOT NULL,
  "type"            TEXT NOT NULL,
  "content"         TEXT NOT NULL,
  "proposal_id"     TEXT UNIQUE,
  "metadata"        JSONB,
  "created_time"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "workspace_conversation_message_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "workspace_conversation_message_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "workspace_conversation"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "workspace_conversation_message_conversation_id_idx" ON "workspace_conversation_message"("conversation_id");

-- external_connection
CREATE TABLE IF NOT EXISTS "external_connection" (
  "id"               TEXT NOT NULL,
  "space_id"         TEXT NOT NULL,
  "type"             "ExternalConnectionType" NOT NULL,
  "name"             TEXT NOT NULL,
  "encrypted_config" TEXT NOT NULL,
  "enabled"          BOOLEAN NOT NULL DEFAULT true,
  "created_by"       TEXT NOT NULL,
  "created_time"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_modified_time" TIMESTAMP(3),
  CONSTRAINT "external_connection_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "external_connection_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "space"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "external_connection_space_id_idx" ON "external_connection"("space_id");
