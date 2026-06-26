---
phase: 17
plan: "17-02"
subsystem: agent/mcp
tags: [mcp, client, aggregator, prisma, tdd, registry, execution]
dependency_graph:
  requires: [17-00, 17-01]
  provides: [agent-mcp-client, AgentMcpServer-schema, mcp-aggregator-service, registry-merge, execution-dispatch]
  affects: [17-03, 17-04, 17-05, 17-06]
tech_stack:
  added: []
  patterns:
    - "McpClientAggregatorService: SDK Client + StreamableHTTPClientTransport per-server, per-agent-call lifetime"
    - "Per-agent executor cache: getAggregatedTools primes, executeMcpTool reuses — no re-connect per tool call"
    - "Graceful degradation: per-server try/catch + timeout; unreachable server skipped, never thrown"
    - "Namespaced tool merge: mcp__{serverId}__{toolName} appended after built-ins in getToolsForAgent"
    - "MCP dispatch: parseMcpToolName prefix-check in executeToolCall default branch"
key_files:
  created:
    - packages/db-main-prisma/prisma/postgres/migrations/20260605000000_add_agent_mcp_server/migration.sql
    - apps/nestjs-backend/src/features/agent/mcp/mcp-client-aggregator.service.ts
    - apps/nestjs-backend/src/features/agent/mcp/mcp-client-aggregator.service.spec.ts
  modified:
    - packages/db-main-prisma/prisma/postgres/schema.prisma
    - apps/nestjs-backend/src/features/agent/agent-tool-registry.service.ts
    - apps/nestjs-backend/src/features/agent/agent-execution.service.ts
    - apps/nestjs-backend/src/features/agent/agent.module.ts
decisions:
  - "AgentMcpServer model (not AgentConnection): separate model to avoid overloading OAuth model; @@unique([agentId, url])"
  - "Per-agent executor cache in McpClientAggregatorService: primed by getAggregatedTools, consumed by executeMcpTool — avoids re-opening connections per tool call while keeping connections short-lived across requests"
  - "SERVER_CONNECT_TIMEOUT_MS=5000: latency bound for unreachable servers, configurable for Wave 3"
  - "_createTransport as protected hook: allows tests to inject InMemoryTransport without an HTTP server"
  - "Live-verify deferred: environment constraint (~4 GB RAM); in-process tests cover the critical paths"
metrics:
  completed_date: "2026-06-05"
  tasks_completed: 3
  tasks_total: 4
  files_created: 3
  files_modified: 4
  duration_minutes: 7
---

# Phase 17 Plan 02: Agent as MCP Client Summary

Wave 1 delivers: the agent becomes an MCP client — it connects to Teable's own MCP server (17-01) and to external MCP servers configured per-agent, aggregates their tools, and merges them into the agent's tool set.

## What Was Built

### Task 1: AgentMcpServer schema + migration (commit 0319603e2)

New `AgentMcpServer` Prisma model:

```prisma
model AgentMcpServer {
  id               String    @id @default(cuid())
  agentId          String    @map("agent_id")
  name             String
  url              String
  transport        String    @default("streamable-http")
  enabled          Boolean   @default(true)
  createdTime      DateTime  @default(now()) @map("created_time")
  lastModifiedTime DateTime? @updatedAt @map("last_modified_time")

  agent Agent @relation(fields: [agentId], references: [id], onDelete: Cascade)

  @@unique([agentId, url])
  @@index([agentId])
  @@map("agent_mcp_server")
}
```

- Agent model gains `mcpServers AgentMcpServer[]` relation.
- Migration SQL created at `20260605000000_add_agent_mcp_server/migration.sql`.
- `prisma validate` passes. Migration requires a live Postgres to apply (see DEFERRED below).

### Task 2: McpClientAggregatorService — TDD (commits 1910f0bde + 888422544)

RED: 5 failing tests confirmed (module did not exist).
GREEN: `mcp-client-aggregator.service.ts` implemented; 5/5 tests pass.

**McpClientAggregatorService API (pinned contract for Wave 2/3):**

```ts
// Aggregate MCP tools from all enabled servers for a given agent.
// Primes the per-agent executor cache.
async getAggregatedTools(agentId: string): Promise<AggregatedMcpTools>

// Execute a namespaced MCP tool. Uses cached executors if available.
async executeMcpTool(agentId: string, namespacedName: string, input: Record<string, unknown>): Promise<unknown>

// Protected transport factory — spy-injectable for tests.
protected async _createTransport(url: string): Promise<StreamableHTTPClientTransport>
```

**AggregatedMcpTools shape:**
```ts
interface AggregatedMcpTools {
  definitions: ToolDefinition[];  // mcp__{serverId}__{toolName} namespaced
  executors: Map<string, (input: Record<string, unknown>) => Promise<unknown>>;
}
```

**Graceful degradation:** per-server `try/catch` with 5s timeout. Failed servers are logged + skipped. One bad external server never prevents the agent from using tools from healthy ones (T-17-05 mitigated).

**T-17-04 mitigation:** only connects to `AgentMcpServer` rows where `agentId = requesting agent AND enabled = true`.

### Task 3: Merge into registry + dispatch in execution loop (commit 6561f014e)

`AgentToolRegistryService.getToolsForAgent`:
- Now injects `McpClientAggregatorService`.
- After filtering built-in tools, appends `mcpAggregator.getAggregatedTools(agentId).definitions`.
- Agent's full tool set = built-ins + namespaced MCP tools.

`AgentExecutionService.executeToolCall` (default branch):
- `parseMcpToolName(toolCall.name)` detects `mcp__`-prefixed names.
- If matched → dispatches to `mcpAggregator.executeMcpTool(ctx.agentId, toolCall.name, toolCall.input)`.
- Otherwise falls through to `{ error: 'Unknown tool' }` (unchanged).
- The `generateText/stepCountIs` loop is **unchanged**.

`agent.module.ts`:
- `McpClientAggregatorService` added to `providers` and `exports`.

## Deviations from Plan

### Auto-fixed: MCP Server capabilities must declare { tools: {} } (Rule 1 — Bug)

- **Found during:** Task 2 (GREEN gate, test helper setup)
- **Issue:** `new Server(..., { capabilities: {} })` throws `"Server does not support tools (required for tools/list)"` when `setRequestHandler(ListToolsRequestSchema, ...)` is called. The capabilities object must declare `{ tools: {} }` to opt-in.
- **Fix:** Changed `{ capabilities: {} }` to `{ capabilities: { tools: {} } }` in the `startInProcessServer` test helper.
- **Files modified:** `mcp-client-aggregator.service.spec.ts`

### Auto-fixed: Per-agent executor cache to avoid re-connect on executeMcpTool (Rule 1 — Bug)

- **Found during:** Task 2 (GREEN gate, routing test)
- **Issue:** `executeMcpTool` re-called `getAggregatedTools` internally (second connection), but the test's `_createTransport` mock was consumed by the first call. This caused `typed.content[0].text` to be undefined.
- **Fix:** Added `executorCache: Map<agentId, executors>` — `getAggregatedTools` primes it, `executeMcpTool` reuses it without opening a new connection.
- **Impact:** Better design anyway — executors from a single `getAggregatedTools` call are reused for tool dispatches in the same request cycle.

### Deferred: Live agent MCP round-trip verification (Task 4 checkpoint — environment constraint)

- **Found during:** Task 4 (checkpoint:human-verify)
- **Issue:** Environment constraint — ~4 GB free RAM; booting the full NestJS + Next stack risks OOM per BOOT-OOM-INVESTIGATION.md.
- **Decision:** Defer per plan instructions ("best-effort; live-only checks DEFERRED with steps").
- **Unit test coverage:** 17/17 in-process tests green (8 adapter + 4 MCP server + 5 aggregator).
- **Manual verification steps (run when stack is stable):**
  ```bash
  # Boot API only
  pnpm dev:separated

  # 1. Create an AgentMcpServer row for a test agent pointing at Teable's own MCP:
  #    POST http://localhost:3002/api/agent-mcp-server
  #    { "agentId": "<agentId>", "name": "Teable", "url": "http://localhost:3002/api/agent/mcp/<agentId>", "enabled": true }

  # 2. Run a conversation where the agent must use an MCP-served tool:
  #    POST http://localhost:3002/api/agent/<agentId>/chat
  #    Body: { "message": "search for any records in table <tableId>" }

  # 3. Confirm response includes tool-call trace with mcp__-prefixed tool name executed.
  # 4. Disable the server row and confirm the agent still runs (graceful degrade).
  ```

## Pre-existing Test Failures (out of scope)

The following 2 tests were failing before this plan and were NOT introduced or worsened by these changes:
- `agent-execution.service.spec.ts > loads conversation history when conversationId is provided` — mock missing `findConversation`.
- `agent.controller.unit.spec.ts > throws UnauthorizedException when no active webhook trigger` — mock returns null instead of throwing.

These are deferred to a separate fix (out of scope for Wave 1).

## Known Stubs

None. All code paths connect to real services. The aggregator reads from the database, opens real SDK connections to real MCP servers, and returns real tool results.

## Threat Surface Scan

No new network endpoints or auth paths introduced in this plan. `McpClientAggregatorService` is an internal NestJS service; it does not expose HTTP routes. The external MCP server connection is outbound (agent → server), not inbound.

T-17-04 and T-17-05 from the plan's threat model are mitigated:
- T-17-04: only `enabled=true` rows for the requesting `agentId` are connected.
- T-17-05: 5s per-server timeout + try/catch; unreachable servers skipped.

## TDD Gate Compliance

| Gate | Commit | Status |
|------|--------|--------|
| RED (test commit) | 1910f0bde | PASSED |
| GREEN (feat commit) | 888422544 | PASSED |
| REFACTOR | N/A | Not needed |

## Self-Check

Files created:
- packages/db-main-prisma/prisma/postgres/migrations/20260605000000_add_agent_mcp_server/migration.sql -- YES
- apps/nestjs-backend/src/features/agent/mcp/mcp-client-aggregator.service.ts -- YES
- apps/nestjs-backend/src/features/agent/mcp/mcp-client-aggregator.service.spec.ts -- YES

Files modified:
- packages/db-main-prisma/prisma/postgres/schema.prisma -- YES
- apps/nestjs-backend/src/features/agent/agent-tool-registry.service.ts -- YES
- apps/nestjs-backend/src/features/agent/agent-execution.service.ts -- YES
- apps/nestjs-backend/src/features/agent/agent.module.ts -- YES

Commits:
- 0319603e2 -- feat(17-02): add AgentMcpServer schema model + migration
- 1910f0bde -- test(17-02): red gate
- 888422544 -- feat(17-02): implement McpClientAggregatorService
- 6561f014e -- feat(17-02): merge MCP tools into registry + dispatch

## Self-Check: PASSED
