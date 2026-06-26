-- Create agent_conversation table
CREATE TABLE "agent_conversation" (
  "id" TEXT NOT NULL,
  "agent_id" TEXT NOT NULL,
  "title" TEXT,
  "trigger" TEXT NOT NULL DEFAULT 'manual',
  "status" TEXT NOT NULL DEFAULT 'completed',
  "created_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by" TEXT NOT NULL,
  CONSTRAINT "agent_conversation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "agent_conversation_agent_id_idx" ON "agent_conversation"("agent_id");
CREATE INDEX "agent_conversation_created_time_idx" ON "agent_conversation"("created_time");

-- Create agent_conversation_message table
CREATE TABLE "agent_conversation_message" (
  "id" TEXT NOT NULL,
  "conversation_id" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "tool_name" TEXT,
  "tool_input" JSONB,
  "tool_output" JSONB,
  "metadata" JSONB,
  "created_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "agent_conversation_message_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "agent_conversation_message_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "agent_conversation" ("id") ON DELETE CASCADE
);

CREATE INDEX "agent_conversation_message_conversation_id_idx" ON "agent_conversation_message"("conversation_id");
CREATE INDEX "agent_conversation_message_role_type_idx" ON "agent_conversation_message"("role", "type");
