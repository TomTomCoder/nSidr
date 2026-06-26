---
phase: 17
plan: "17-03"
subsystem: agent/mcp/plugin-discovery
tags: [plugin, mcp, discovery, schema, tdd, aggregator, prisma]
dependency_graph:
  requires: [17-02]
  provides: [plugin-mcp-discovery, plugin-mcp-capability-schema, plugin-tool-aggregation]
  affects: [17-04, 17-05, 17-06]
tech_stack:
  added: []
  patterns:
    - "PluginMcpDiscoveryService: DB-scoped plugin discovery, two capability modes (toolManifest inline + mcpUrl)"
    - "Inline toolManifest executor: structured stub result (Wave 2); Wave 3 replaces with real plugin HTTP call"
    - "mcpUrl plugins: expose endpoint to aggregator, which calls _connectAndList (same path as explicit servers)"
    - "Namespace: mcp__plugin_{pluginId}__{toolName} for inline tools, same for mcpUrl-sourced tools"
    - "T-17-07: discovery scoped to PluginInstall.baseId; T-17-08: mcpUrl from DB record only"
key_files:
  created:
    - packages/db-main-prisma/prisma/postgres/migrations/20260605000001_add_plugin_mcp_capability/migration.sql
    - apps/nestjs-backend/src/features/agent/mcp/plugin-mcp-discovery.service.ts
    - apps/nestjs-backend/src/features/agent/mcp/plugin-mcp-discovery.service.spec.ts
  modified:
    - packages/db-main-prisma/prisma/postgres/schema.prisma
    - apps/nestjs-backend/src/features/plugin/plugin.service.ts
    - apps/nestjs-backend/src/features/agent/mcp/mcp-client-aggregator.service.ts
    - apps/nestjs-backend/src/features/agent/mcp/mcp-client-aggregator.service.spec.ts
    - apps/nestjs-backend/src/features/agent/agent.module.ts
decisions:
  - "toolManifest inline executor returns stub result in Wave 2 (tool+pluginId+input JSON); Wave 3 will invoke real plugin HTTP endpoint"
  - "mcpUrl plugins reuse existing _connectAndList path in the aggregator — no second tool-merging path"
  - "namespace prefix plugin_{pluginId} to distinguish plugin-sourced tools from explicit AgentMcpServer tools"
  - "discoverPluginTools(_agentId, baseId): _agentId reserved for Wave 3 per-agent plugin scoping; baseId used now"
metrics:
  completed_date: "2026-06-05"
  tasks_completed: 2
  tasks_total: 2
  files_created: 3
  files_modified: 5
  duration_minutes: 8
---

# Phase 17 Plan 03: Plugin MCP Capability Summary

Wave 2 delivers: plugins can declare MCP tools. The Plugin schema gains optional `mcpUrl` and `toolManifest` fields; a new discovery service feeds installed plugins' declared tools into the aggregator; UI-only plugins (no fields set) remain completely unaffected.

## What Was Built

### Task 1: Extend Plugin manifest with MCP capability (commit 7d0e5837d)

New optional fields on the `Plugin` Prisma model:
```prisma
mcpUrl       String?  @map("mcp_url")    // URL of plugin's MCP server endpoint
toolManifest Json?    @map("tool_manifest")  // Inline tool definitions (McpToolDescriptor[])
```

Migration `20260605000001_add_plugin_mcp_capability` adds two nullable columns to the `plugin` table — existing UI-only plugin rows are completely unaffected.

`plugin.service.ts` select blocks updated to include `mcpUrl` and `toolManifest` in `createPlugin`, `updatePlugin`, `getPlugin`, and `getPlugins` so the fields round-trip. The `convertToVo` spread pass-through propagates them via `nullsToUndefined`.

`prisma validate` passes.

### Task 2: Plugin MCP discovery service + aggregator hook — TDD (commits 7afcf0b7d + e8446b27a)

RED: 7 failing tests (module did not exist).
GREEN: `plugin-mcp-discovery.service.ts` implemented; 7/7 discovery + 5/5 aggregator tests pass = 12/12 total.

**PluginMcpDiscoveryService API:**
```ts
// Discover all MCP-capable plugins installed in the given base.
async discoverPluginTools(agentId: string, baseId: string): Promise<DiscoveredPluginTools>

interface DiscoveredPluginTools {
  definitions: ToolDefinition[];     // inline toolManifest tools, namespaced
  executors: Map<string, Executor>;  // inline manifest executors (stub in Wave 2)
  mcpEndpoints: PluginMcpEndpoint[]; // mcpUrl plugins → aggregator connects these
}
```

Two capability modes:
1. `toolManifest` (inline): adapted to `ToolDefinition[]` via the 17-00 adapter; executor returns structured stub result. Wave 3 will replace with real plugin HTTP invocation.
2. `mcpUrl` (real server): exposes a `PluginMcpEndpoint` entry; the aggregator's `_connectAndList` handles connection — same code path as explicit `AgentMcpServer` rows, no second tool-merging path.

**McpClientAggregatorService changes:**
- Injected `PluginMcpDiscoveryService`.
- `getAggregatedTools` now also:
  1. Looks up `agent.baseId` from DB.
  2. Calls `discoverPluginTools(agentId, baseId)`.
  3. Merges inline definitions + executors directly.
  4. Connects to any `mcpEndpoints` via `_connectAndList` (graceful-degrade applies: 5s timeout + skip on failure).

**agent.module.ts:** `PluginMcpDiscoveryService` added to `providers`.

**Security mitigations implemented:**
- T-17-07: `discoverPluginTools` queries `PluginInstall WHERE baseId = agent.baseId` (DB-scoped, not client-supplied).
- T-17-08: `mcpUrl` is read from the stored `Plugin` record joined via `PluginInstall`; no client URL is honored.

## Deviations from Plan

None. Plan executed exactly as written.

## Deferred (live-boot checkpoint)

Live verification (installing a plugin with `mcpUrl`, running an agent conversation) requires booting the full stack. Deferred per environment constraint (~4 GB RAM).

**Manual steps (run when stack is stable):**
```bash
# Boot API only
pnpm dev:separated

# 1. Create a plugin with a toolManifest:
#    POST http://localhost:3002/api/plugin  (admin)
#    { "name": "Test MCP Plugin", "positions": ["dashboard"], "logo": "...",
#      "toolManifest": [{ "name": "ping", "description": "Ping the plugin",
#        "inputSchema": { "type": "object", "properties": {} } }] }

# 2. Install that plugin into the base that owns a test agent:
#    POST http://localhost:3002/api/plugin-install
#    { "pluginId": "<pluginId>", "baseId": "<baseId>", "name": "Test", "position": "dashboard", "positionId": "<posId>" }

# 3. Run an agent conversation in that base and confirm:
#    - getToolsForAgent includes mcp__plugin_<pluginId>__ping
#    - executeToolCall with that tool name routes to the inline executor
```

## Known Stubs

1. **Inline toolManifest executor** — `plugin-mcp-discovery.service.ts`: the executor returns `{ content: [{ type: "text", text: JSON.stringify({ tool, pluginId, input }) }] }` (a structured echo). This is intentional for Wave 2. Wave 3 will replace it with a real call to the plugin's HTTP endpoint.

## Threat Surface Scan

No new network endpoints introduced. `PluginMcpDiscoveryService` is an internal NestJS service (no HTTP routes). Outbound connections only occur for `mcpUrl` plugins (plugin → MCP server), using the same `_connectAndList` path already audited in 17-02.

T-17-07 and T-17-08 mitigated as documented above.

## TDD Gate Compliance

| Gate | Commit | Status |
|------|--------|--------|
| RED (test commit) | 7afcf0b7d | PASSED |
| GREEN (feat commit) | e8446b27a | PASSED |
| REFACTOR | N/A | Not needed |

## Self-Check

Files created:
- packages/db-main-prisma/prisma/postgres/migrations/20260605000001_add_plugin_mcp_capability/migration.sql -- YES
- apps/nestjs-backend/src/features/agent/mcp/plugin-mcp-discovery.service.ts -- YES
- apps/nestjs-backend/src/features/agent/mcp/plugin-mcp-discovery.service.spec.ts -- YES

Files modified:
- packages/db-main-prisma/prisma/postgres/schema.prisma -- YES
- apps/nestjs-backend/src/features/plugin/plugin.service.ts -- YES
- apps/nestjs-backend/src/features/agent/mcp/mcp-client-aggregator.service.ts -- YES
- apps/nestjs-backend/src/features/agent/mcp/mcp-client-aggregator.service.spec.ts -- YES
- apps/nestjs-backend/src/features/agent/agent.module.ts -- YES

Commits:
- 7d0e5837d -- feat(17-03): extend Plugin model with mcpUrl + toolManifest
- 7afcf0b7d -- test(17-03): red gate (7 failing tests)
- e8446b27a -- feat(17-03): implement PluginMcpDiscoveryService + aggregator hook (12 green)

## Self-Check: PASSED
