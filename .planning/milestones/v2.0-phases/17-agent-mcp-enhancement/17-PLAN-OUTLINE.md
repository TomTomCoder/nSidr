---
phase: 17-agent-mcp-enhancement
created: 2026-06-05
type: plan
requirements: [AGENT-01, AGENT-02, AGENT-03, AGENT-04, AGENT-05]
context: 17-CONTEXT.md
---

# Phase 17 — Agent MCP Enhancement: Plan

> Build ON the existing agent (`agent-tool-registry` + `agent-execution` AI-SDK loop + memory).
> Decisions locked in 17-CONTEXT.md: MCP server+client both; plugins declare MCP tools;
> interfaces read/write (RBAC-gated); per-agent doc scoping in builder modal + config UI.

## Grounding (verified 2026-06-05 + plan-review)
- **CORRECTION:** installed **`ai@6.0.169` has NO MCP client** (`createMCPClient`/`experimental_*`
  absent from its `index.d.ts`). → Use **`@modelcontextprotocol/sdk`** (official; Server + Client +
  StreamableHTTP transport) for BOTH the Teable MCP server AND the agent's MCP client. Adapt MCP
  tools → AI-SDK `ToolDefinition[]` with a thin adapter (don't rely on AI-SDK MCP).
- `AgentToolRegistryService.getToolsForAgent(agentId)` returns `ToolDefinition[]` from `BUILT_IN_TOOLS`
  + per-agent `agentTool` rows → **the seam to merge MCP tools**.
- `AgentExecutionService` runs the AI-SDK loop (`generateText`/`stepCountIs`, `executeToolCall`) — keep unchanged; just feed more tools.
- Schema present: `Agent`, `AgentTool`, `AgentMemory`, `Plugin`, `PluginInstall`. `DocSearchService.hybridSearch(spaceId, query, limit)` to extend with scope.
- Keep MCP servers / heavy work off the API hot path (BOOT-OOM-INVESTIGATION.md).

## Wave 0 — Verify-live-first + MCP spike (process gate)
**17-00 — Live-verify + transport spike (≤1 day).** Boot the app; confirm the existing agent loop
runs a tool (`search_records`/`search_knowledge_base`) end-to-end. Spike: pin
`@modelcontextprotocol/sdk` versions + transport (StreamableHTTP vs stdio) and the MCP-tool →
AI-SDK-tool adapter shape. *Success:* a throwaway MCP server's tool is invoked by the agent via the
adapter; transport/versions pinned. Gates Wave 1's exact API.

## Waves & Plans

### Wave 1 — MCP foundation (AGENT-05) — depends on 17-00
**17-01 — Teable MCP server.** Using `@modelcontextprotocol/sdk` (NOT AI-SDK MCP), new module
exposing existing agent tools (table/record CRUD, `search_knowledge_base`, etc.) as MCP **server**
tools over StreamableHTTP. Auth: scoped access token = the agent/user identity; every tool call
passes through authority-matrix RBAC. *Files:* new `features/agent/mcp/` (server, tool-adapters),
`agent.module.ts`. *Success:* an MCP inspector lists Teable tools and a tool call returns data
(RBAC-enforced).

**17-02 — Agent as MCP client.** Use the **`@modelcontextprotocol/sdk` Client** to connect to
(a) Teable's own MCP server and (b) configured external MCP servers; **adapt** their tools into
`ToolDefinition[]` (per the 17-00 adapter) and merge into `getToolsForAgent`. Execution loop
unchanged. *Files:* `agent-tool-registry.service.ts`
(merge MCP tools), new `mcp/mcp-client-aggregator.service.ts`, schema: `AgentConnection`/new
`AgentMcpServer` (url, transport, enabled, agentId). *Success:* an agent calls a tool served over
MCP and returns its result in a conversation.

### Wave 2 — Plugins & interfaces (depends on Wave 1)
**17-03 — Plugins declare MCP tools (AGENT-02).** Extend `Plugin` model with optional
tools/MCP capability (manifest field: `mcpUrl` or inline tool defs). Discovery feeds the MCP
client aggregator so installed plugins' tools appear to the agent. UI-only plugins declare
nothing (no-op). *Files:* schema `Plugin` (+`mcpUrl`/`toolManifest`), `plugin.service.ts`,
aggregator. *Success:* install a plugin that declares one MCP tool → agent can invoke it.

**17-04 — Interface (app/dashboard) read/write tools (AGENT-01).** New MCP tools:
`get_app`/`get_dashboard` (read state/data) and `run_app_action`/`update_dashboard` (write),
each gated by `agent-permission.guard` + authority-matrix. *Files:* `features/agent/mcp/`
interface-tool adapters wiring to `app-builder`/`dashboard` services. *Success:* an agent reads a
dashboard's data AND performs a write action, both RBAC-enforced.

### Wave 3 — Knowledge scoping + memory (parallel with Wave 2)
**17-05 — Per-agent doc/folder knowledge scoping (AGENT-03).** Schema: `Agent.knowledgeSources`
(JSON: docIds[]/folderIds[]) or `AgentKnowledgeSource` table. Scope `search_knowledge_base` →
`DocSearchService.hybridSearch(spaceId, query, limit, scope)` (WHERE docId IN / folderId IN).
UI: a "Knowledge sources" picker in the **agent builder modal** AND the **agent configuration UI**.
*Files:* schema + migration, `search.service.ts`, agent tool-registry, frontend agent-builder +
config components. *Success:* an agent restricted to folder X only returns answers from X.

**17-06 — Memory verification + tests (AGENT-04).** Confirm `AgentMemoryService` is wired into the
execution loop and scoped per-agent; enhance only if a gap. Add unit tests for the MCP aggregator,
scoped search, and RBAC gating; e2e for one end-to-end agent flow. *Success:* agent recalls a
prior-conversation fact; test suite green.

## Test strategy (per CONTEXT: test each capability live)
Run the app (web :3000 + API :3002, separated). For each requirement, verify live:
AGENT-05 (MCP inspector lists/invokes Teable tools) → AGENT-02 (plugin tool call) → AGENT-01
(dashboard read + write) → AGENT-03 (folder-scoped answer) → AGENT-04 (memory recall). Unit/e2e
tests committed alongside.

## Risks / watch-for
- MCP server must run off the API hot path or as a guarded module (memory). Consider the
  decoupled-worker pattern if it adds load.
- RBAC is non-negotiable for read/write interface tools and plugin tools (security).
- AI SDK v6 MCP client API is `experimental_*` — pin versions; verify during 17-02.

## Coverage
AGENT-01→17-04 · AGENT-02→17-03 · AGENT-03→17-05 · AGENT-04→17-06 · AGENT-05→17-01/02. **5/5 ✓**
