# Purpose verification — does Teable (this fork) respect its stated purpose?

Method: static codebase audit (no load test). Evidence cited by file. Two AI surfaces exist:
- **unified-ai** (`features/ai/unified-ai.service.ts`) — the workspace chat in `ChatPanel`; interprets
  needs and emits **proposals** (e.g. `create_table`) the user confirms.
- **agent** runtime (`features/agent/`) — tool-using agent with memory, knowledge, OAuth, MCP.

## Verdict by clause
| # | Purpose clause | Verdict | Evidence |
|---|---|---|---|
| 0 | Apps handling **millions of rows**, centralize data | ✅ Architecturally yes | Grid virtualization `VirtualizedInfiniteTable.tsx`, `InfiniteScroller.tsx`; backend `record.service.ts` aggregation + CTE query builder; Postgres. (Not load-tested here.) |
| 1 | **Interpret user needs** | ✅ Yes | `unified-ai.service.ts` (LLM streaming chat) + `agent-execution.service.ts` |
| 2 | **Design tables** w/ tailored columns/formats | ✅ Yes (via proposals) | `unified-ai.service.ts` `create_table` action (lines 60/222/707) → `ProposalCard` confirm; rich field types in `packages/core/src/models/field` (select, formula, rollup, attachment, date…) |
| 3 | **Link tables** | ✅ Yes | core link/lookup/rollup field models; `filterLinkCellQueryConflict` etc. in record service |
| 4 | **Build app interfaces** connected to tables (data-entry best practices) | ⚠️ Partial | `packages/openapi/src/app-builder`, `plugin`, `dashboard`, forms exist; agent has `get_app`/`run_app_action`/`get_dashboard`/`update_dashboard` (`interface-tools.ts`). But **no AI one-shot app generation tool** (`create_app`) in the agent registry — the video's "Build a CRM app" generation is not reproduced in this fork. |
| 5 | **Automations (RPA)** | ✅ Yes | `features/workflow`, `app/automation/workflow-panel`, `WORKFLOW_TOOLS` exposed to agent (`mcp/workflow-tools.ts`) |
| 6a | Agents interact with **tables** | ✅ Yes | `agent-tool-registry`: `search_records`, `get_records`, `get_record`, `create_record`, `update_record`, `delete_record`, `create_comment`, `get_record_activity` |
| 6b | …with **apps** | ✅ Yes | `interface-tools.ts`: `get_app`, `run_app_action`, `get_dashboard`, `update_dashboard` |
| 6c | …with **third-party apps** | ✅ Yes | OAuth agent tools Gmail/Slack/GitHub (`oauth/*-agent-tool.ts`) + extensible **MCP aggregator** (`mcp__{server}__{tool}` dispatch in `agent-execution.service.ts`) |
| 6d | …with **knowledge docs (md)** | ✅ Yes | `search_knowledge_base`, `create_knowledge_doc`, `update_knowledge_doc`, `link_docs`, `get_doc_links`; md ingestion via `features/doc-search/ingestion.service.ts` |
| 6e | …has **memory** | ✅ Yes | `agent-memory.service.ts` (recent + preference) + memory graph (`get_memory`, `search_memory`, `save_memory`, `set_preference`, doc memory-graph tools) |
| 6f | …uses **internal tools** | ✅ Yes | `BUILT_IN_TOOLS` registry + `web_search` + workflow tools |
| 7 | **Always request permission before integrating 3rd-party** | ✅ Yes | OAuth authorize flow with `prompt: 'consent'` (`gmail-oauth.service.ts:60`); per-agent `agentConnection` storage; `getValidToken` throws `No … connection found` when unconnected (forces connect first); tools advertise "Requires a connected account"; `agent-permission.guard.ts` + `rbac-gating.spec.ts` |

## Update (2026-06-09) — gaps closed
Both gaps are now implemented in the agent runtime (`schema-agent-tools.ts`, wired into
`agent-tool-registry.service.ts` + `agent-execution.service.ts` + `agent.module.ts`):
- **`create_table`** — create a table with tailored columns (defaults a primary "Name" field + grid view).
- **`create_field`** — add columns incl. **link fields** between tables (symmetric link auto-created).
- **`create_view`** — add grid/kanban/calendar/gallery/form views.
- **`create_app`** — scaffold an app interface bound to the base, returns the builder deep-link
  (full AI code-gen continues via the existing `AppBuilderService.generateAppStream`).

All routed through the same OpenApi services as the REST API (validation, permissions, realtime
broadcast preserved); scoped to the agent's `baseId`; errors returned structurally (never throw).
Unit-tested in `schema-agent-tools.spec.ts` (6 tests) + existing 17 execution tests still green.
Clauses 4 (app interfaces) and the agent-side of 2/3 are now **fully met**.

## Summary
**Largely respects the purpose.** 11/13 clauses fully met; data CRUD, table/link design,
automations, third-party-with-consent, knowledge(md), memory, and internal tools are all present
and test-covered. **Two gaps vs. the stated vision:**
1. **AI app-interface generation** (clause 4) — building blocks exist (app-builder, dashboards,
   forms, app tools) but there is **no agent/AI tool that generates an app UI** end-to-end; the
   video's one-shot "Build a CRM app" is not implemented in this fork.
2. **Table design/linking** is driven through the **unified-ai proposal path** (user-confirmed),
   not via agent runtime tools — fine for usability, but the tool-using agent itself cannot create
   tables/fields/views (no `create_table`/`create_field`/`create_view` in its registry).
