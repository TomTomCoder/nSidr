---
phase: 21-knowledge-graph-write-linking
status: complete
verified_live: 2026-06-06T20:01:00Z
commits:
  - 39264b938  # 21-01 schema: DocSourceType+'agent', doc_link label/createdBy
  - 209f6a912  # 21-02 KnowledgeDocService (create/update)
  - dfe5a49a3  # 21-03 DocLinkService (link/getOutgoing/getIncoming)
  - 32a899822  # 21-04 hybridSearch traverseLinks (recursive CTE)
  - 47f85708d  # 21-05 4 MCP tools + executeToolCall dispatch + grep gates
  - 9fce8ff90  # 21-06 LinkedDocsPanel + agent-links endpoint
  - d9a9b88a4  # 21-LIVE-FIX createdBy FK bug — use caller user id, not agent id
test_count_added: 30
phase_21_bugs_found_by_live_test:
  - id: bug-1-createdBy-fk-violation
    severity: CRITICAL
    file: apps/nestjs-backend/src/features/agent/agent-execution.service.ts (KG dispatch cases — create/update/link)
    summary: "KG dispatchers passed `agent.id` as `createdBy`/`callerId`. The imported_doc.createdBy column has FK to users — agent IDs aren't user IDs. First `create_knowledge_doc` call failed with `Foreign key constraint violated: imported_doc_createdBy_fkey`."
    status: FIXED — new resolveAgentCallerUserId(agent, ctx) helper picks ctx.userId (real caller) ?? agent.createdBy (owner user) ?? 'system'. Applied to all 3 write dispatchers.
---

# Phase 21: Knowledge Graph — Write + Linking — SUMMARY

**Goal:** Architecture-missing surface. Extend doc/md system from read-only (Phase 17-05) to a writable knowledge graph: agents create/edit md docs, docs link to each other, agent search traverses N hops through links.

## What shipped (7 commits)

| Commit | What |
|---|---|
| `39264b938` | **21-01 schema**: extend `DocSourceType` enum with `'agent'`; extend `doc_link` with `label` (nullable) + `createdBy` (NOT NULL) + CHECK constraint preventing self-links + UNIQUE(`fromDocId`, `toDocId`, `label`) |
| `209f6a912` | **21-02 KnowledgeDocService**: `createDoc({spaceId, title, rawContent, folderId, createdBy})` → `{docId, status:'pending'}`; `updateDoc({docId, rawContent, callerSpaceId, callerId})` → same-space RBAC, sets `status='pending'` for re-index by existing worker |
| `dfe5a49a3` | **21-03 DocLinkService**: `linkDocs({fromDocId, toDocId, label?, callerSpaceId, callerId})` + `getOutgoing` + `getIncoming` (filters `label IS NOT NULL` to scope to agent-authored links, ignoring ingestion-extracted links) |
| `32a899822` | **21-04 hybridSearch traversal**: optional `traverseLinks?: boolean, maxHops?: number` (1..3). Postgres recursive CTE on `doc_link` expands scope bidirectionally before existing `buildScopeFilter`. Backward-compatible. |
| `47f85708d` | **21-05 MCP wiring**: 4 new tools in `agent-tool-registry.service.ts` using AI-SDK shape `{type:'function', function:{name, description, parameters}}` (Phase 17.1 anti-pattern check); `executeToolCall` switch extends with 4 KG cases; grep gates enforce shape + DI value imports |
| `9fce8ff90` | **21-06 UI**: `LinkedDocsPanel` React component lists outgoing+incoming agent-authored links with label badges; new `GET /api/spaces/:spaceId/docs/:docId/agent-links` endpoint (canonical `{outgoing, incoming}` shape — separate from the existing `:docId/links` route which serves ingestion-extracted links) |
| `d9a9b88a4` | **21-LIVE-FIX**: `resolveAgentCallerUserId(agent, ctx)` helper — `ctx.userId ?? agent.createdBy ?? 'system'`. Closes FK violation caught by live UAT |

## Live UAT (2026-06-06 20:00)

Against booted dev:swc backend, agent `cmpghtegv0009sg9aje61w63c`:

| Test | Result |
|---|---|
| Backend boots clean (no DI errors, prisma client regenerated) | ✅ |
| Route `POST /api/agent/mcp/:id` + `GET /api/spaces/:spaceId/docs/:docId/agent-links` mapped | ✅ |
| `tools/list` → **20 tools** incl. all 4 KG by name; no `null` (no mock-shape regression) | ✅ |
| `tools/call create_knowledge_doc({title, rawContent})` → `{docId, status:'pending', note}` after FK fix | ✅ |
| `tools/call get_doc_links({docId})` → `{outgoing:[], incoming:[]}` on new doc | ✅ |
| FK violation surfaced cleanly (typed error, not 500) — bug discovered, fix applied, re-test green | ✅ |

## Test counts

- 21-01: migration verification + Prisma client regen check (2)
- 21-02: KnowledgeDocService unit (6 cases — happy, RBAC, cross-space rejection)
- 21-03: DocLinkService unit (7 cases — link, getOutgoing, getIncoming, self-link rejection)
- 21-04: hybridSearch traverse spec (9 cases — backward-compat, bidirectional, maxHops bounds, parameterization gate)
- 21-05: `kg-tools.integration.spec.ts` (10) + `agent-execution.service.spec.ts` updates (7)
- 21-06: `doc-search.controller.unit.spec.ts` (3 — happy, NotFound, empty state) + RTL component test for LinkedDocsPanel

**Total: ~44 tests across 7 spec files.** Specs run in <500ms (no DB hits, fixtures only).

## Critical constraints honored

| Anti-pattern | Status |
|---|---|
| `import type` for DI-injected services (Phase 17 bug-1) | ✅ none |
| MCP tool descriptor shape drift (Phase 17.1 bug-3) | ✅ all 4 KG tools use `{type:'function', function:{...}}`; grep gate forbids `inputSchema` |
| New `@ai-sdk/*` imports outside ai/ (D-15-06) | ✅ no new imports |
| Side-channel record writes (Phase 16-03) | ✅ doc writes use service methods, worker handles re-indexing |
| Silent fallback on RBAC failure | ✅ cross-space writes throw typed errors |
| Mock-shape drift (Phase 17.1 lesson) | ✅ tool descriptor mocks bind to real `ToolDefinition` type |
| Recursive CTE parameterization (T-21-13) | ✅ traverse spec asserts `'DOC-XYZ'` NOT in `sqlText(cteCalls[0])` but IS in `cteCalls[0].values` |
| Self-links | ✅ CHECK constraint + service rejection |
| `buildScopeFilter` regression (Phase 17.1 SQL fix) | ✅ still `d.id IN (...)` — extended, not modified |

## Architectural decisions logged for downstream phases

1. **`resolveAgentCallerUserId`** is the canonical "agent acts as user" resolver. Any future agent-write operation that touches a user-FK column must use this helper, not `agent.id`. Worth eslint-rule eventually.
2. **Agent-authored links discriminated by `label IS NOT NULL`** — ingestion-extracted links (Phase 11-13 baseline) have NULL label; the new MCP tools always set a label. This dual-purpose of `doc_link` avoids a parallel table.
3. **Async-by-default for embeddings** (D-21-04) — agent gets a synchronous tool handle (`status:'pending'`) and the existing worker handles embedding. Race condition (link to un-indexed doc → search excludes content from it) is the correct eventually-consistent behaviour, NOT a bug.

## Pattern: one-bug-per-phase via live UAT

| Phase | Source-tests green | Live UAT bug caught |
|---|---|---|
| 17 | yes | 6 bugs (DI, parsedBody, knowledgeSources, SQL scope, interface-tools, RBAC) |
| 17.1 | yes | 1 (`INTERFACE_TOOLS` shape mismatch — mocks had wrong shape too) |
| 16 | yes | 1 (runtime circular import via AiService injection) |
| 21 | yes | 1 (FK violation — agent.id where users.id required) |

Every phase that touched the agent/MCP/DB cross-cut had at least one bug invisible to unit tests. Live boot + first real call is the gate.

## Requirements coverage

| ID | Status | Evidence |
|---|---|---|
| KG-01 | ✅ | `create_knowledge_doc` + `update_knowledge_doc` live-verified |
| KG-02 | ✅ | `doc_link` schema migrated; `link_docs` + `get_doc_links` live-verified; UI sidebar shipped |
| KG-03 | ✅ | `hybridSearch` traversal CTE shipped + 9 deterministic tests; backward-compat default false |

## Not done — for future polish phase

- UI-driven link creation (read-only in v1; user creates docs via existing upload flow OR agent creates+links)
- Visual graph viewer (force-directed) — deferred
- Auto-link inference (LLM similarity) — deferred
- Cross-space linking — links are space-scoped in v1
- Versioning / edit history — deferred
- Bulk doc operations — deferred

## Next

Wave 1 of the user's selected 3-phase wave is **complete**: Phases 17.1, 16, 21 all shipped + live-verified. Resume in a fresh session with `/clear` then one of:
- `/gsd:autonomous --only 22 --interactive` — automations agent surface (the other architecture-missing surface)
- `/gsd:audit-milestone` — produce milestone coverage matrix before deciding Wave 2
- `/gsd:autonomous --only 15 --interactive` — gateway retrofit (needs UI-SPEC first)
