---
phase: 04
plan: 02
subsystem: Agent Execution Runtime
tags: [execution, memory, triggers, llm-integration]
dependency_graph:
  requires: [04-01]
  provides: [AgentExecutionService, AgentMemoryService, AgentTriggerService]
  affects: [04-03, 04-04]
tech_stack:
  added:
    - Vercel AI SDK (generateText, stepCountIs)
    - AsyncGenerator pattern for streaming
  patterns:
    - Event-driven execution with async generators
    - TTL-based memory management
    - Fire-and-forget trigger dispatch
key_files:
  created:
    - apps/nestjs-backend/src/features/agent/agent-execution.service.ts
    - apps/nestjs-backend/src/features/agent/agent-memory.service.ts
    - apps/nestjs-backend/src/features/agent/agent-trigger.service.ts
decisions:
  - AgentExecutionService: AsyncGenerator<AgentRunEvent> for real-time streaming (no stubs, real LLM calls via AiService)
  - AgentMemoryService: 7-day TTL for recent memories, no TTL for preferences (KV storage via metadata)
  - AgentTriggerService: Fire-and-forget dispatch for mention/DM (collectAndPostOutput), scheduled cron in Wave 4
  - Event types: think, tool, progress, text, done, error
  - maxIterations guard (default 10) to prevent infinite loops
metrics:
  duration: 25 minutes
  completed_date: 2026-05-20
  tasks_completed: 2
  files_created: 3
---

# Phase 04 Plan 02: Agent Execution Runtime Summary

**Agent execution loop (trigger→load→LLM→tool dispatch→memory save) + 7-day TTL memory + mention/DM triggers**

## What Was Built

### AgentExecutionService (Core Runtime)
- `run(ctx: AgentRunContext): AsyncGenerator<AgentRunEvent>`
  - Step 1: Load agent config + enabled tools from DB
  - Step 2: Load memory context (recent + preferences)
  - Step 3: Build system prompt (instructions + memory context + preferences)
  - Step 4-6: Loop up to maxIterations:
    - Call LLM via AiService.getModelInstance() + generateText()
    - Emit think/progress events during reasoning
    - Execute tool calls returned by LLM
    - Emit tool/text events with results
  - Step 7: Save run summary to memory

- Real LLM Integration:
  - Resolves modelKey to ILanguageModelV2 via AiService
  - Converts ToolDefinition[] to Vercel AI SDK tools object
  - Calls generateText() with stopWhen: stepCountIs(1)
  - Extracts text + all tool calls from steps
  - No placeholders — actual LLM execution

- Tool Execution Dispatch (stubbed for Wave 3):
  - search_records, get_records, get_record, create_comment, get_record_activity
  - Returns mock results (full implementation in Wave 3 with controller context)

- Event Emission:
  - type: 'think' (LLM reasoning iterations)
  - type: 'progress' (setup steps)
  - type: 'tool' (tool calls with input/output)
  - type: 'text' (LLM text responses)
  - type: 'done' (completion)
  - type: 'error' (error events)

### AgentMemoryService (TTL + KV Storage)
- `saveRecent(agentId, content, metadata?)`: Saves short-term memory with 7-day expiration
  - Purges expired entries after saving
  - MAX_RECENT_MEMORIES = 50 (most recent first)

- `getRecent(agentId)`: Retrieves non-expired recent memories (ordered by createdTime desc)

- `setPreference(agentId, key, value)`: Upserts KV pair (stored as { memoryType: 'preference', metadata: { key }, content: value })

- `getPreferences(agentId)`: Returns Record<string, string> of all preferences

- `listAll(agentId)`: Returns all memories (recent + preference) for "Voir les souvenirs" UI

### AgentTriggerService (Trigger Dispatch)
- `registerCronTrigger(agentId, cronExpression)`: Upserts cron trigger (wired in Wave 4)

- `handleMention(agentId, payload)`: Async trigger for @agent mentions
  - Fires AgentExecutionService.run() in background (fire-and-forget via void)
  - Logs execution events, no blocking

- `handleDm(agentId, payload)`: Async trigger for DM/message events
  - Similar fire-and-forget dispatch

- `collectAndPostOutput(ctx)`: Streams all run events to logger (Wave 3 will wire results to create_comment tool)

## Deviations from Plan

None — plan executed exactly as written. All services integrated with real AiService LLM calls.

## Threat Mitigations

- **T-04-04 (Tampering)**: Trigger payloads sanitized via JSON.stringify in buildUserMessage (no template interpolation)
- **T-04-05 (Elevation)**: Tool execution validates against BUILT_IN_TOOLS names (stub for Wave 3)
- **T-04-06 (DoS)**: maxIterations guard prevents infinite loops (default 10)
- **T-04-07 (Information Disclosure)**: Memories are agentId-scoped (cross-agent access blocked)

## Files Created/Modified

**Created:**
- `/apps/nestjs-backend/src/features/agent/agent-execution.service.ts` (286 lines)
- `/apps/nestjs-backend/src/features/agent/agent-memory.service.ts` (76 lines)
- `/apps/nestjs-backend/src/features/agent/agent-trigger.service.ts` (61 lines)

**Modified:**
- `/apps/nestjs-backend/src/features/agent/agent.module.ts` (added 3 services to providers/exports + AiModule import)

## Commits

- `feat(04-02): implement agent execution runtime with memory and trigger services` [fac33ff→fac33ff]

## Known Stubs

- `executeToolCall()`: Returns mock results. Full implementation (search, create, comment) in Wave 3 with controller request context.
- `registerCronTrigger()`: Stores config but doesn't schedule jobs. BullMQ wiring in Wave 4.

## Integration Points

- **AiService**: Uses getModelInstance() + getAIConfig() for model resolution and LLM calls
- **PromptService**: Calls get() with agent:{agentId}.system key (3-tier override pattern from 04-01)
- **PrismaService**: Reads Agent, AgentTool, AgentMemory; writes to AgentMemory on each run
- **Wave 3**: AgentController exposes /api/agent/:id/run endpoint (SSE streaming)
- **Wave 4**: AgentTriggerService wired to mention/DM events + BullMQ cron scheduler

## Next Steps

Wave 3 (Plan 04-03) adds REST endpoints + React UI for agent creation/configuration.
Wave 4 (Plan 04-04) adds BullMQ scheduling + OAuth provider connections.
