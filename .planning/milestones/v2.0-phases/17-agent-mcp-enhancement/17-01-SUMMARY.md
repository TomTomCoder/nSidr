---
phase: 17
plan: "17-01"
subsystem: agent/mcp
tags: [mcp, server, rbac, streamablehttp, nestjs]
dependency_graph:
  requires: [17-00]
  provides: [teable-mcp-server, mcp-rbac-gate, mcp-tool-registration]
  affects: [17-02, 17-03, 17-04, 17-05, 17-06]
tech_stack:
  added: []
  patterns:
    - "Low-level SDK Server + tools/list + tools/call handlers (plain JSON schema, no Zod)"
    - "Per-session StreamableHTTPServerTransport (stateless, no sessionIdGenerator)"
    - "checkPermission() callback injected into registerTeableMcpTools() for testability"
    - "PermissionService.getRoleByBaseId() as RBAC gate (CLS-based, T-17-01)"
    - "AgentExecutionService.executeTool() public delegation (no SQL forking, T-17-02)"
key_files:
  created:
    - apps/nestjs-backend/src/features/agent/mcp/teable-mcp-tools.ts
    - apps/nestjs-backend/src/features/agent/mcp/teable-mcp-server.service.ts
    - apps/nestjs-backend/src/features/agent/mcp/teable-mcp-server.controller.ts
    - apps/nestjs-backend/src/features/agent/mcp/teable-mcp-server.spec.ts
  modified:
    - apps/nestjs-backend/src/features/agent/agent-execution.service.ts
    - apps/nestjs-backend/src/features/agent/agent.module.ts
decisions:
  - "Used low-level Server.setRequestHandler (tools/list + tools/call) instead of McpServer.registerTool — McpServer requires Zod schemas; plain JSON schemas from getBuiltInTools() can be served verbatim via low-level API"
  - "Per-session transport (stateless, sessionIdGenerator:undefined) — no long-lived state on boot; satisfies BOOT-OOM guidance"
  - "RBAC via PermissionService.getRoleByBaseId() using CLS user.id set by existing auth middleware — consistent with rest of app; no new auth path"
  - "checkPermission as callback into registerTeableMcpTools() — decouples NestJS DI from the tool-registration module; unit-testable without Nest"
  - "AgentExecutionService.executeTool() public delegation — avoids forking SQL/record logic; single source of truth (T-17-02)"
  - "Live-verify deferred — memory-constrained box (~4 GB); in-process InMemoryTransport tests cover the critical paths"
metrics:
  completed_date: "2026-06-05"
  tasks_completed: 3
  tasks_total: 4
  files_created: 4
  files_modified: 2
---

# Phase 17 Plan 01: Teable MCP Server Summary

Wave 1 delivers: a Teable MCP server exposing all built-in agent tools (table/record CRUD, search_knowledge_base, etc.) over StreamableHTTP with RBAC-gated tool calls.

## What Was Built

### Task 1: Map built-in agent tools to MCP server registrations (commit 4b09f3977)

`teable-mcp-tools.ts` — pure module (no NestJS DI):
- `registerTeableMcpTools(server, registry, execution, agentCtx, runCtx, checkPermission)` — registers `tools/list` and `tools/call` handlers on a low-level SDK `Server`.
- Uses `Server.setRequestHandler(ListToolsRequestSchema, ...)` / `Server.setRequestHandler(CallToolRequestSchema, ...)` so plain JSON schema objects from `getBuiltInTools()` are served verbatim (no Zod re-authoring).
- Every `tools/call` invokes `checkPermission()` first (RBAC gate), then delegates to `AgentExecutionService.executeTool()`.
- `getBuiltInMcpToolNames(registry)` helper for test assertions.

**Key deviation:** `McpServer.registerTool()` (high-level API) requires Zod schemas — passing a plain JSON schema object throws `"inputSchema must be a Zod schema or raw shape"` at runtime. Used low-level `Server.setRequestHandler` instead.

### Task 2: MCP server service + StreamableHTTP controller with RBAC gate (commit 5ea4137d7)

`teable-mcp-server.service.ts`:
- `TeableMcpServerService.handleRequest(req, res, agentId, userId)` — creates a fresh `Server` + `StreamableHTTPServerTransport({ sessionIdGenerator: undefined })` per request (stateless, low memory).
- RBAC gate: `PermissionService.getRoleByBaseId(agent.baseId)` — null role throws `McpError(InvalidRequest)`, satisfying T-17-01 and T-17-03.
- Delegates to `registerTeableMcpTools()` with the resolved agent context.

`teable-mcp-server.controller.ts`:
- `@Controller('api/agent/mcp')` + `@All(':id')` — all MCP methods (POST from StreamableHTTP client) reach the same handler.
- Protected by `AgentPermissionGuard` (same guard as `AgentController`).
- Reads `userId` from CLS (set by auth middleware).

`agent-execution.service.ts` (modified):
- Added `executeTool(toolCall, agent, ctx)` public delegation to the private `executeToolCall` method — MCP server reuses canonical logic without forking SQL/record handling.

`teable-mcp-server.spec.ts` — 4/4 in-process round-trip tests using `InMemoryTransport`:
1. `tools/list` returns all built-in tool names matching `getBuiltInMcpToolNames()`.
2. Authorized identity: `tools/call` invokes `checkPermission()` and `executeTool()` returning JSON data.
3. Unauthorized identity: `tools/call` rejects — `executeTool` not called (RBAC enforced).
4. Unknown tool name: raises `McpError` — `executeTool` not called.

### Task 3: Register module wiring (commit 51df52778)

`agent.module.ts`:
- `TeableMcpServerController` added to `controllers`.
- `TeableMcpServerService` added to `providers` and `exports`.
- `PermissionService` is `@Global()` from `PermissionModule` — no extra module import needed.

## Deviations from Plan

### Auto-fixed: McpServer vs Server API choice (Rule 1 — Bug)

- **Found during:** Task 1
- **Issue:** The plan referenced `server.registerTool()` (McpServer API). At runtime, `McpServer.registerTool()` calls `getZodSchemaObject(inputSchema)` which throws if passed a plain JSON schema object instead of a Zod schema.
- **Fix:** Used low-level `Server` with `setRequestHandler(ListToolsRequestSchema, ...)` and `setRequestHandler(CallToolRequestSchema, ...)` — accepts plain objects, no Zod required.
- **Impact:** Zero functional difference to clients. The low-level API is more explicit about the transport layer and avoids runtime throws.
- **Files modified:** teable-mcp-tools.ts

### Deferred: Live MCP inspector verification (Task 4 checkpoint — environment constraint)

- **Found during:** Task 4 (checkpoint:human-verify)
- **Issue:** Environment constraint — ~4 GB free RAM; booting the full NestJS + Next stack risks OOM per BOOT-OOM-INVESTIGATION.md.
- **Decision:** Defer per plan instructions ("best-effort; mark as DEFERRED if OOM risk").
- **Unit test coverage:** 12/12 green (8 adapter + 4 MCP server round-trip tests).
- **Manual verification steps (run when stack is stable):**
  ```bash
  # Boot API only
  pnpm dev:separated

  # Point MCP inspector at the endpoint with a valid access token:
  # POST http://localhost:3002/api/agent/mcp/{agentId}
  # Headers: Authorization: Bearer <access-token>
  # Body (JSON-RPC initialize): {"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"inspector","version":"1.0"}},"id":0}

  # After init: send tools/list request, verify all built-in tool names appear
  # Send tools/call for search_records with a known tableId — verify data returns
  # Repeat with a token that has no base collaborator — verify 400/McpError returned
  ```

## Known Stubs

None. All tool handlers delegate to `AgentExecutionService.executeTool()` which is wired to the real database services.

## Threat Surface Scan

| Flag | File | Description |
|------|------|-------------|
| threat_flag: new-auth-boundary | teable-mcp-server.controller.ts | New HTTP endpoint POST /api/agent/mcp/:id — external MCP clients enter here |

This boundary is covered by T-17-01 (RBAC gate before every tool call) and T-17-SC (SDK version pinned in 17-00). The endpoint requires a valid session (AgentPermissionGuard) — anonymous access is rejected at the NestJS middleware level before `handleRequest` is called.

## Self-Check

Files created:
- apps/nestjs-backend/src/features/agent/mcp/teable-mcp-tools.ts -- YES
- apps/nestjs-backend/src/features/agent/mcp/teable-mcp-server.service.ts -- YES
- apps/nestjs-backend/src/features/agent/mcp/teable-mcp-server.controller.ts -- YES
- apps/nestjs-backend/src/features/agent/mcp/teable-mcp-server.spec.ts -- YES

Files modified:
- apps/nestjs-backend/src/features/agent/agent-execution.service.ts -- YES
- apps/nestjs-backend/src/features/agent/agent.module.ts -- YES

Commits:
- 4b09f3977 -- feat(17-01): map built-in agent tools to MCP server registrations
- 5ea4137d7 -- feat(17-01): add MCP server service + StreamableHTTP controller with RBAC gate
- 51df52778 -- feat(17-01): wire TeableMcpServerService + controller into agent.module

## Self-Check: PASSED
