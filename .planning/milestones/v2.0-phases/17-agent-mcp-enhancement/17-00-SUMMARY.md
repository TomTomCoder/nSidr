---
phase: 17
plan: "17-00"
subsystem: agent/mcp
tags: [mcp, sdk, spike, adapter, tdd]
dependency_graph:
  requires: []
  provides: [mcp-tool-adapter, spike-notes, sdk-pinned]
  affects: [17-01, 17-02, 17-03, 17-04, 17-05, 17-06]
tech_stack:
  added:
    - "@modelcontextprotocol/sdk@1.29.0 (exact pin)"
  patterns:
    - "MCP tool -> ToolDefinition adapter (pure module, no NestJS DI)"
    - "mcp__{serverId}__{toolName} name-prefix scheme"
    - "makeMcpExecutor closure pattern for tool dispatch"
key_files:
  created:
    - apps/nestjs-backend/src/features/agent/mcp/mcp-tool-adapter.ts
    - apps/nestjs-backend/src/features/agent/mcp/mcp-tool-adapter.spec.ts
    - apps/nestjs-backend/src/features/agent/mcp/SPIKE-NOTES.md
  modified:
    - apps/nestjs-backend/package.json
decisions:
  - "Transport: StreamableHTTP (not stdio) -- memory-constrained box, no child processes"
  - "MCP client: SDK Client directly (ai@6.0.169 has NO MCP client export)"
  - "Name prefix: mcp__{serverId}__{toolName} (double-underscore delimiter)"
  - "SDK pin: @modelcontextprotocol/sdk@1.29.0 exact (locked for all Wave 1+ plans)"
  - "Live-verify: deferred (human_needed) -- unit test is the automated gate"
metrics:
  completed_date: "2026-06-05"
  tasks_completed: 2
  tasks_total: 3
  files_created: 3
  files_modified: 1
---

# Phase 17 Plan 00: MCP SDK Spike + Adapter Contract Summary

Wave 0 process gate: install + pin `@modelcontextprotocol/sdk`, spike the transport, write the canonical MCP-tool adapter with full unit test coverage (8/8 green).

## What Was Built

### Task 1: Install + pin MCP SDK (commit db0eb3e71)

- `@modelcontextprotocol/sdk@1.29.0` added to `apps/nestjs-backend` with exact pin (no caret).
- `ai@6.0.169` confirmed to have ZERO MCP client exports -- `grep mcp dist/index.d.ts` returns 0 matches.
- `SPIKE-NOTES.md` documents: pinned version, transport decision (StreamableHTTP), SDK import subpaths, adapter contract, name-prefix scheme, live-verify deferral.

### Task 2: MCP tool adapter -- TDD (commits 2cc7842b5 + 8cd745ebc)

RED: 8 failing tests written first (module did not exist).
GREEN: `mcp-tool-adapter.ts` implemented; 8/8 tests pass.

**Exports (pinned contract for all Wave 1+ plans):**

```ts
// Convert MCP tool descriptor to ToolDefinition (nested shape, not flat)
export function mcpToolToDefinition(serverId: string, mcpTool: McpToolDescriptor): ToolDefinition

// Create executor closure -- calls client.callTool with de-namespaced original name
export function makeMcpExecutor(
  client: Client,
  serverId: string,
  originalName: string
): (input: Record<string, unknown>) => Promise<unknown>

// Helpers
export function buildMcpToolName(serverId: string, originalName: string): string
export function parseMcpToolName(namespacedName: string): { serverId: string; originalName: string } | undefined
```

### Task 3: Checkpoint: human-verify (DEFERRED -- see below)

Live-verify of the existing agent loop was deferred (best-effort per environment constraints).

## Pinned Versions (LOCKED for Wave 1)

| Item | Value |
|------|-------|
| SDK package | `@modelcontextprotocol/sdk` |
| SDK version | `1.29.0` (exact pin) |
| AI SDK version | `ai@6.0.169` (no MCP client) |
| Transport | `StreamableHTTP` |
| Name prefix | `mcp__{serverId}__{toolName}` |

## Pinned Import Paths (LOCKED for Wave 1)

```ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
```

## ToolDefinition Shape (LOCKED for Wave 1)

```ts
interface ToolDefinition {
  type: 'function';
  function: {
    name: string;           // mcp__{serverId}__{originalName}
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, unknown>;
      required: string[];
    };
  };
}
```

NOTE: 17-CONTEXT D-02 assumed a flat shape and an AI-SDK MCP client -- both were wrong. The nested shape above is correct. Wave 1 plans must use this.

## Deviations from Plan

### Auto-deferred: Live-verify (Task 3 checkpoint -- environment constraint)

- **Found during:** Task 3 (checkpoint:human-verify)
- **Issue:** Environment constraint -- ~4 GB free RAM; booting the full NestJS+Next stack risks OOM (per BOOT-OOM-INVESTIGATION.md).
- **Decision:** Mark live-verify as `human_needed` per plan instructions ("best-effort; if box OOMs, note it and rely on unit test only").
- **Unit test coverage:** 8/8 green -- adapter shape, name-prefix scheme, callTool dispatch all proven in-process.
- **Manual verification command:**
  ```bash
  # Boot separated stack (web :3000 + API :3002)
  pnpm dev:separated

  # Trigger agent with built-in tool (e.g. search_records) via POST:
  # POST http://localhost:3002/api/agent/{agentId}/chat
  # Body: { "message": "search for any records in table {tableId}" }
  # Confirm response includes tool-call trace showing search_records executed
  ```

## Known Stubs

None. The adapter is fully implemented and unit-tested. No placeholder returns, no hardcoded empty values.

## TDD Gate Compliance

| Gate | Commit | Status |
|------|--------|--------|
| RED (test commit) | 2cc7842b5 | PASSED |
| GREEN (feat commit) | 8cd745ebc | PASSED |
| REFACTOR | N/A | Not needed -- code is clean |

## Self-Check

Files created:
- apps/nestjs-backend/src/features/agent/mcp/mcp-tool-adapter.ts -- YES
- apps/nestjs-backend/src/features/agent/mcp/mcp-tool-adapter.spec.ts -- YES
- apps/nestjs-backend/src/features/agent/mcp/SPIKE-NOTES.md -- YES

Commits:
- db0eb3e71 -- chore(17-00): install + pin
- 2cc7842b5 -- test(17-00): RED gate
- 8cd745ebc -- feat(17-00): GREEN gate

## Self-Check: PASSED
