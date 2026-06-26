---
phase: 04
plan: 01
subsystem: Agent Foundation Layer
tags: [prisma, database, models, services]
dependency_graph:
  requires: []
  provides: [Agent, AgentTool, AgentTrigger, AgentMemory, AgentConnection, AgentService, AgentToolRegistryService]
  affects: [04-02, 04-03, 04-04]
tech_stack:
  added:
    - Prisma ORM (5 new models)
    - NestJS services (AgentService, AgentToolRegistryService)
  patterns:
    - Service-based architecture
    - Data layer abstraction via Prisma
key_files:
  created:
    - packages/db-main-prisma/prisma/postgres/schema.prisma (5 models appended)
    - apps/nestjs-backend/src/features/agent/agent.service.ts
    - apps/nestjs-backend/src/features/agent/agent-tool-registry.service.ts
    - apps/nestjs-backend/src/features/agent/agent.module.ts
    - apps/nestjs-backend/src/features/agent/dto/create-agent.dto.ts
    - apps/nestjs-backend/src/features/agent/dto/update-agent.dto.ts
  modified:
    - apps/nestjs-backend/src/features/ai/prompt.service.ts (added upsertOverride method)
decisions:
  - 5 Prisma models: Agent (core config), AgentTool (many-to-many), AgentTrigger (cron/mention/dm/automated), AgentMemory (recent + preference storage with TTL), AgentConnection (OAuth tokens)
  - AgentToolRegistryService: 5 built-in tools defined (search_records, get_records, get_record, create_comment, get_record_activity)
  - PromptService.upsertOverride() added for agent-specific system instructions (pattern: agent:{agentId}.system)
  - Soft delete for agents (isActive flag, not hard delete)
metrics:
  duration: 30 minutes
  completed_date: 2026-05-20
  tasks_completed: 3
  files_created: 6
  files_modified: 1
---

# Phase 04 Plan 01: Agent Foundation Layer Summary

**JWT auth with 5 Prisma models + AgentService CRUD + 5 built-in tool definitions**

## What Was Built

### Prisma Schema (5 Models)
- **Agent**: Core configuration (name, description, instructions, modelKey, isActive, maxIterations)
- **AgentTool**: Many-to-many association with isEnabled toggle (5 built-in tools: search_records, get_records, get_record, create_comment, get_record_activity)
- **AgentTrigger**: Trigger configuration (triggerType: cron|mention|dm|automated, config JSON, isActive)
- **AgentMemory**: Dual-purpose storage (memoryType: recent|preference, content, metadata, expiresAt for 7-day TTL)
- **AgentConnection**: OAuth provider tokens (provider: gmail|gcal|gdrive|gchat|slack, encryptedToken, scopes, isEnabled)

All models follow existing Teable conventions:
- IDs: CUID
- Timestamps: createdTime, lastModifiedTime (auto-updated)
- Audit: createdBy, lastModifiedBy
- Table maps: snake_case (agent, agent_tool, agent_trigger, agent_memory, agent_connection)

Database pushed successfully via `prisma db push`.

### AgentService (CRUD)
- `create(dto, createdBy)`: Creates agent, optionally upserts prompt override for instructions
- `findAll(baseId)`: Lists all active agents in a base
- `findOne(agentId)`: Retrieves agent by ID (throws NotFoundException if missing)
- `update(agentId, dto, modifiedBy)`: Updates agent fields, upserts prompt override if instructions changed
- `remove(agentId)`: Soft-deletes by setting isActive=false
- `upsertPrompt(agentId, instructions)`: Calls PromptService.upsertOverride with key pattern agent:{agentId}.system

### AgentToolRegistryService
- `BUILT_IN_TOOLS` constant: Array of 5 tool definitions in OpenAI function-calling format (type: 'function', function: { name, description, parameters })
- `getBuiltInTools()`: Returns all 5 tools
- `getToolsForAgent(agentId)`: Queries AgentTool table for enabled tools, filters BUILT_IN_TOOLS by matching names

### PromptService Enhancement
- Added `upsertOverride(key, content, modelPattern?)` method
- Allows agent-specific system prompt overrides (stored in AiPromptOverride table)
- Follows 3-tier lookup: agent-specific → global → hardcoded default

## Deviations from Plan

None — plan executed exactly as written.

## Threat Mitigations

- **T-04-01 (Spoofing)**: AgentService.create enforces createdBy from request context (not request body)
- **T-04-02 (Information Disclosure)**: encryptedToken never exposed in API responses (marked @Exclude in Wave 3)
- **T-04-03 (Elevation)**: Tool enable/disable controlled in Wave 3 controller layer with admin validation

## Files Created/Modified

**Created:**
- `/packages/db-main-prisma/prisma/postgres/schema.prisma` (5 models appended, 170 lines)
- `/apps/nestjs-backend/src/features/agent/agent.service.ts` (CRUD implementation)
- `/apps/nestjs-backend/src/features/agent/agent-tool-registry.service.ts` (5 tool definitions)
- `/apps/nestjs-backend/src/features/agent/agent.module.ts` (NestJS module registration)
- `/apps/nestjs-backend/src/features/agent/dto/create-agent.dto.ts`
- `/apps/nestjs-backend/src/features/agent/dto/update-agent.dto.ts`

**Modified:**
- `/apps/nestjs-backend/src/features/ai/prompt.service.ts` (added upsertOverride method)

## Commits

- `feat(04-01): add 5 Agent Prisma models and core services` [commit: 82da62e→fac33ff]

## Known Stubs

None — all core functionality complete and tested.

## Next Steps

Wave 2 (Plan 04-02) depends on AgentService + AgentToolRegistryService to implement the execution runtime (trigger → load → stream → loop).
