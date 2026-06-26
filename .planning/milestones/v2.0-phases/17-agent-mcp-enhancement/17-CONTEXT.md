# Phase 17: Agent MCP Enhancement - Context

**Gathered:** 2026-06-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Extend the **existing** agent system (which already has memory + table/doc tools + a Vercel
AI-SDK tool-calling loop) so it becomes a cross-platform actor via **MCP**: it can act on
**interfaces** (apps/dashboards), invoke **installed plugins** as tools, and ground answers on a
**user-selected subset of docs/folders** from the doc library. Requirements: AGENT-01..05.

**Build ON, do not rebuild:** `agent-tool-registry.service` (tools incl. `search_knowledge_base`,
`create_record`/`get_records`/`search_records`/`delete_record`), `agent-execution.service`
(generateText loop with `stepCountIs`, `getToolsForAgent` → `executeToolCall`),
`agent-memory.service` (7-day TTL + preferences), `agent-permission.guard`.
</domain>

<decisions>
## Implementation Decisions

### MCP topology (AGENT-05)
- **D-01:** **Both server + client.** Teable runs an **MCP server** exposing its capabilities
  (table/record, doc-library, interface tools) so external AI clients (Claude Desktop, etc.) can
  use Teable AND the internal agent consumes the same MCP layer. The agent is **also an MCP
  client** that aggregates: (a) Teable's own MCP server, (b) installed plugins' MCP tools, (c)
  external MCP servers. This is the future-proof end state and aligns with the OpenClaw/ClawHub
  extension model in Phase 19.
- **D-02:** Use the **Vercel AI SDK v6 native MCP client** support (already the agent's runtime)
  to consume MCP tool sets — do not hand-roll a client. Aggregate MCP tool sets into the existing
  `getToolsForAgent` flow so the execution loop is unchanged.

### Plugin → agent tool (AGENT-02)
- **D-03:** **Plugins declare MCP tools.** Extend the plugin manifest with an optional
  tools/MCP-capability; the agent (MCP client) auto-discovers and exposes them. UI-only plugins
  (today: iframe apps via `pluginUser`+access-token) simply declare no tools (no-op). This is the
  scalable path and the same mechanism Phase 19 (OpenClaw/ClawHub extensions) will use. No generic
  `invoke_plugin` fallback for now.

### Interface action depth (AGENT-01)
- **D-04:** **Read/write.** The agent can both query app/dashboard data/state AND act
  (trigger app actions, modify dashboards), not read-only. All actions MUST go through the
  existing authority-matrix RBAC + `agent-permission.guard` (agent acts as its scoped identity).

### Selected-doc knowledge scoping (AGENT-03)
- **D-05:** **Per-agent knowledge sources**, configured in **two places**: the **agent builder
  modal** and the **agent configuration UI**. A user picks the allowed docs/folders for an agent;
  the agent's `search_knowledge_base` tool is then scoped to that set (pass docIds/folderIds into
  `DocSearchService.hybridSearch`). Not per-conversation, not per-query.

### Memory (AGENT-04)
- **D-06:** Memory already exists (`AgentMemoryService`, 7-day TTL + preference KV). Verify it is
  wired into the execution loop and scoped per-agent; enhance only if a gap is found. Treat depth
  (e.g. vector/long-term recall) as a stretch, not required for this phase.

### Claude's Discretion
- MCP transport (stdio vs streamable-HTTP/SSE), server framework (`@modelcontextprotocol/sdk`),
  tool schema mapping, and how the MCP server authenticates external clients — planner/researcher
  decide, respecting the RBAC constraint in D-04.
- Interface tool surface (which app/dashboard operations to expose first) — start with the
  highest-value read+write operations.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase / milestone
- `.planning/REQUIREMENTS.md` — AGENT-01..05 definitions
- `.planning/ROADMAP.md` §"Phase 17" — goal + success criteria
- `.planning/research/SUMMARY.md` — MCP-as-standard rationale; "build on existing agent, don't rebuild"

### Existing agent system (build on)
- `apps/nestjs-backend/src/features/agent/agent-tool-registry.service.ts` — tool registration (incl. `search_knowledge_base` @ line 152)
- `apps/nestjs-backend/src/features/agent/agent-execution.service.ts` — AI-SDK loop (`getToolsForAgent`, `executeToolCall`, `generateText`/`stepCountIs`)
- `apps/nestjs-backend/src/features/agent/agent-memory.service.ts` — existing memory
- `apps/nestjs-backend/src/features/agent/agent-permission.guard.ts` — RBAC gate for D-04
- `apps/nestjs-backend/src/features/plugin/plugin.service.ts`, `plugin-auth.service.ts` — plugin model (`pluginUser`, access tokens) for D-03
- `apps/nestjs-backend/src/features/doc-search/search.service.ts` — `hybridSearch` to scope for D-05

### Reference docs
- `apps/nestjs-backend/BOOT-OOM-INVESTIGATION.md` — keep MCP servers / heavy work off the API hot path
- Vercel AI SDK v6 MCP client docs (`experimental_createMCPClient`) — external lookup during research

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `AgentToolRegistryService.getToolsForAgent(agentId)` — the seam to inject MCP-aggregated tools.
- `AgentExecutionService` AI-SDK loop — unchanged; just feed it more tools.
- `DocSearchService.hybridSearch(spaceId, query, limit)` — extend with optional doc/folder scope (D-05).
- `agent-permission.guard` + authority-matrix — the RBAC the read/write interface tools must respect.

### Established Patterns
- Tools are plain AI-SDK tool defs (`{ name, description, parameters }`) executed by `executeToolCall`.
- Plugins authenticate via `pluginUser` + access token (iframe apps) — MCP tool declaration is additive.
- Heavy/long work should run off the API hot path (decoupled-worker pattern from v1.0).

### Integration Points
- New: an MCP **server** module (exposes Teable tools) + an MCP **client** aggregator feeding
  `getToolsForAgent`. New: interface (app/dashboard) tools. New: per-agent knowledge-source config
  (schema + agent builder modal + agent config UI) scoping `search_knowledge_base`.
</code_context>

<specifics>
## Specific Ideas

- Doc/folder selection is configured per-agent in **both** the agent builder modal and the agent
  configuration UI (user was explicit).
- Agent is **read/write** on interfaces (user was explicit) — gated by RBAC.
- "Both" MCP topology and "plugins declare MCP tools" chosen as the powerful, future-proof,
  OpenClaw-aligned path.
</specifics>

<deferred>
## Deferred Ideas

- Generic `invoke_plugin` fallback for non-MCP plugins — deferred (D-03 chose declared MCP tools only).
- Vector/long-term agent memory — stretch beyond AGENT-04's verify-existing scope.
- Exposing Teable's MCP server publicly / external-client auth hardening — coordinate with Phase 19
  (extension system) rather than over-build here.
- External MCP server marketplace/discovery — that's Phase 19 (OpenClaw/ClawHub).

None of the above block Phase 17.
</deferred>

---

*Phase: 17-agent-mcp-enhancement*
*Context gathered: 2026-06-05*
