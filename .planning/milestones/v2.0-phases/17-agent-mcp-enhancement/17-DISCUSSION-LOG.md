# Phase 17: Agent MCP Enhancement — Discussion Log

**Date:** 2026-06-05 · Mode: discuss (default)

> Human-reference record of the discuss-phase session. Not consumed by downstream agents.

## Areas selected
User selected all four gray areas (multiSelect) and pre-answered two inline.

### 1. MCP topology
- Options: Both server+client (rec) / Client only / Server only
- **Selected: Both** — Teable as MCP server (external clients + internal agent) AND agent as MCP client (plugins/external servers).

### 2. Plugin → tool mechanism
- Options: Plugins declare MCP tools (rec) / Generic invoke_plugin / Both
- **Selected: Plugins declare MCP tools** — manifest capability; agent MCP client auto-discovers; UI-only plugins no-op.

### 3. Interface action depth
- Options: read-only vs read-write
- **Selected (inline): read/write** — agent can act on apps/dashboards, gated by authority-matrix RBAC + agent-permission.guard.

### 4. Selected-doc scoping UX
- **Selected (inline): per-agent**, configured in the **agent builder modal** AND the **agent configuration UI**; scopes `search_knowledge_base` to chosen docs/folders.

### Memory (AGENT-04)
- Claude's discretion: verify existing `AgentMemoryService` wiring; enhance only if a gap is found.

## Deferred
- Generic invoke_plugin fallback; vector/long-term memory; public MCP-server exposure/auth (coordinate w/ Phase 19); external MCP marketplace (Phase 19).

## Notes
- Build ON the existing agent (tool registry + AI-SDK loop + memory), not a rebuild.
- Vercel AI SDK v6 native MCP client to be used (no hand-rolled client).
