# Phase 21: Knowledge Graph — Write + Linking — Context

**Gathered:** 2026-06-06
**Status:** Ready for planning
**Mode:** Interactive — 4 decisions captured

<domain>
Extend the doc/md system from read-only (Phase 17-05 introduced `knowledgeSources`
scoping; search already exists) to a **writable knowledge graph**:
- Agents create/edit md docs (KG-01)
- Docs link to each other forming a graph (KG-02)
- Agent search can traverse links N hops to retrieve neighbouring content (KG-03)

This is one of the architecture-missing surfaces from the 2026-06-06 architecture
audit (the others: Automations → Phase 22, UI replatform → Phase 23).
</domain>

<phase_boundary>
**In scope**
- New MCP tool `create_knowledge_doc` (agent-callable) — writes to `imported_doc`
- New MCP tool `update_knowledge_doc` (agent-callable) — edits rawContent + reindexes
- New MCP tool `get_doc_links(docId, direction?)` — enumerate outgoing/incoming links
- New MCP tool `link_docs(fromDocId, toDocId, label?)` — agent-callable, RBAC-gated
- DB schema: new `doc_link` table (Prisma migration)
- DB schema: extend `imported_doc.sourceType` enum to include `'agent'`
- DocSearchService.hybridSearch: optional `traverseLinks` + `maxHops` params; when set, expand scope by following links from in-scope docs N hops (recursive CTE)
- Existing UI: add minimal "Linked docs" sidebar/panel to the doc viewer (1 component, lists outgoing + incoming with the new label)
- Existing worker: doc-ingest worker already picks up `status='pending'` rows — agent-created docs flow through it (no worker changes)
- vitest: per tool + traversal query + RBAC
- Live UAT: agent creates a doc via MCP, links it to another, searches with `traverseLinks:true` and sees neighbour content

**Out of scope**
- Agent UI for KG management (creating docs from the UI is unchanged from today)
- Visual graph viewer (force-directed UI, etc.) — future phase
- Versioning / history of doc edits (future audit phase)
- Auto-link inference (LLM-suggested links based on similarity) — future
- Cross-space linking — links are space-scoped; v1 doesn't link across spaces
- Deletion semantics for orphan links (cascade on doc delete is on; that's it)
</phase_boundary>

<decisions>

### D-21-01: Storage — reuse `imported_doc` table for agent-authored docs
Agent-written docs land in the SAME table as user-uploaded docs. New
`sourceType` enum value `'agent'` distinguishes them. `createdBy` is the
agent ID (existing column already accepts string; verify shape in plan).
This unifies search (one table, one scoping logic), unifies the doc-ingest
worker pipeline, and keeps the embedding/indexing path identical.

**Migration:** ALTER TYPE enum to add `'agent'`. Existing rows untouched.

### D-21-02: Doc-doc links — new `doc_link` table, directional
**Schema:**
```
doc_link (
  id            text PK
  from_doc_id   text NOT NULL → imported_doc.id ON DELETE CASCADE
  to_doc_id     text NOT NULL → imported_doc.id ON DELETE CASCADE
  label         text NULL              -- 'references', 'cites', 'supersedes', etc.
  created_by    text NOT NULL          -- user OR agent id
  created_at    timestamp DEFAULT now()
)
UNIQUE (from_doc_id, to_doc_id, label)   -- one link per (from,to,label) tuple
INDEX (from_doc_id)
INDEX (to_doc_id)
```

Directional. Outgoing links: `WHERE from_doc_id = ?`. Incoming: `WHERE to_doc_id = ?`. Bidirectional traversal in KG-03 unions both directions in the CTE.

Self-links (from == to) — reject at API + DB CHECK constraint.

### D-21-03: Traversal — recursive CTE in Postgres, hop-limited
`DocSearchService.hybridSearch` gets two new optional params:
- `traverseLinks: boolean = false` (backward-compat — Phase 17-05 callers unchanged)
- `maxHops: number = 2` (clamp 1..3 in the service; reject >3)

When `traverseLinks: true`, the scope filter expands BEFORE the embedding/keyword query:
```sql
WITH RECURSIVE neighbors AS (
  SELECT id FROM imported_doc WHERE id = ANY($docIds) AND spaceId = $spaceId
  UNION
  SELECT dl.to_doc_id FROM doc_link dl
    JOIN neighbors n ON (dl.from_doc_id = n.id)
    WHERE depth < $maxHops
  UNION
  SELECT dl.from_doc_id FROM doc_link dl
    JOIN neighbors n ON (dl.to_doc_id = n.id)
    WHERE depth < $maxHops
)
SELECT id FROM neighbors
```
The expanded scope is then passed to the existing `buildScopeFilter` (Phase 17.1 fix: `d.id IN (...)`).

**MCP exposure:** `search_knowledge_base` accepts `{query, limit, traverseLinks?, maxHops?}`. Agent calls remain backward-compatible.

### D-21-04: Embedding — async via existing doc-ingest worker
Agent-created docs are inserted with `status: 'pending'`, `isIndexed: false`,
`chunkCount: 0`. The existing doc-ingest worker (Phase 14, decoupled 618MB
process per project memory) picks up pending rows on its poll loop and:
1. Chunks the rawContent
2. Calls the embedding provider (D-15-04 separate embedding provider) per
   chunk, writes to `doc_chunk` table
3. Updates `imported_doc.status='indexed'`, `chunkCount`, `isIndexed=true`

**Race condition:** if an agent links to a doc that's still `status='pending'`,
the link is valid but `search_knowledge_base` won't return content from it
yet (existing filter `WHERE d."isIndexed" = true` in search.service.ts).
That's the correct behaviour — link exists, search content doesn't yet, eventually consistent.

**Agent tool response:** `create_knowledge_doc` returns immediately with
`{docId, status: 'pending', note: 'Indexing in background; doc may not be
searchable for a few seconds.'}` — agents get a synchronous handle without
blocking on embedding.

### Claude's discretion (planner picks)
- Whether `update_knowledge_doc` re-runs the full chunk+embed pipeline or
  does delta indexing (planner: full re-index is simpler for v1)
- Where the "Linked docs" sidebar panel lives in the existing doc viewer
  UI — planner picks closest analog
- Whether `link_docs` requires the agent to have read access to BOTH docs
  (recommended — RBAC composes; reject if either is out-of-scope)
- The exact MCP error code for hop-cap violations (recommend `-32602`
  InvalidParams)

</decisions>

<canonical_refs>

### Phase / milestone
- `.planning/ROADMAP.md` — Phase 21 entry (added 2026-06-06)
- `.planning/REQUIREMENTS.md` — KG-01..03 (needs adding by planner)

### Existing code (extend, don't replace)
- `apps/nestjs-backend/src/features/doc-search/search.service.ts` — `hybridSearch` (extend with `traverseLinks` + `maxHops`); `buildScopeFilter` already uses `d.id IN (...)` (Phase 17.1 fix)
- `apps/nestjs-backend/src/features/doc-search/ingestion.service.ts` — worker that picks up `status='pending'` rows (use as-is for agent-created docs)
- `packages/db-main-prisma/prisma/postgres/schema.prisma` — extend with `DocLink` model + add `'agent'` to `DocSourceType` enum
- `apps/nestjs-backend/src/features/agent/mcp/teable-mcp-tools.ts` — register the 4 new tools (create / update / link / get_links) per the same pattern as `search_knowledge_base`
- `apps/nestjs-backend/src/features/agent/agent-execution.service.ts` — `executeToolCall` switch — add the 4 new tool dispatchers
- `apps/nestjs-backend/src/features/agent/mcp/agent-knowledge-scope.integration.spec.ts` — pattern for the new KG-03 traversal spec (in-memory Prisma + deterministic fixtures)

### Phase 17.1 lessons (must honour)
- `.planning/phases/17.1-agent-mcp-hardening-live-test-follow-ups/17.1-SUMMARY.md` — mock-shape drift, value imports for DI, parsedBody preservation
- Phase 16 cycle lesson (commit `9ba7b2087`) — new services that need both AI/Record/etc cross-cutting deps go in a NEW file in the AI feature dir; NEVER bolt into existing god-services

### Reference docs
- Postgres recursive CTE: standard. No external docs needed.
- Prisma migration for new table + enum extension: see existing Phase 17 migrations as pattern (`20260605000000_add_agent_mcp_server`)

</canonical_refs>

<code_context>

### Reusable assets
- `DocSearchScope` type in `search.service.ts` — extend with traversal params
- `buildScopeFilter` — drop-in compatible (post-traversal, the expanded doc ID list goes through the existing filter)
- doc-ingest worker — handles indexing; no changes needed
- `executeToolCall` switch in agent-execution.service.ts — add 4 new cases
- `registerTeableMcpTools` — already extended for interface tools (Phase 17.1); add the 4 new tools to `builtInTools` or a new `kgTools` group

### Established patterns
- MCP tool: AI-SDK shape `{type:'function', function:{name, description, parameters}}`. Same shape used by interface tools. DO NOT regress to `{name, description, inputSchema}` (Phase 17.1 bug-3 shape-drift trap).
- New service modules: place in their own file, value-import DI deps, never `import type` for `@Injectable` services injected via constructor
- Prisma migration files: `prisma migrate deploy` applied immediately; verify column/enum exists in DB before considering migration complete
- Worker poll loop: doc-ingest worker already handles `status='pending'` (Phase 14)

### Anti-patterns to avoid (cumulative from Phase 17 + 17.1 + 16)
- ❌ `import type` for DI-injected services
- ❌ Mock-shape drift (Phase 17.1) — bind mocks to real Zod schemas / TS types
- ❌ Silent fallback on validation failure
- ❌ Side-channel writes that skip op-events (Phase 16-03) — though docs are not the op-event-tracked entity, prefer existing service methods over raw prisma writes
- ❌ Injecting AiService into RecordOpenApiService — closes a runtime cycle (Phase 16 boot trap). KG-write services live in their own files in feature dirs
- ❌ Skipping live-boot verification — every phase has been a one-bug-per-phase live-test catch; Phase 21 must verify boot + tools/list shows 4 new tools

### Schema migration order
1. ALTER TYPE `DocSourceType` ADD VALUE 'agent'
2. CREATE TABLE `doc_link` + indexes + FK constraints + CHECK (from_doc_id != to_doc_id)
3. prisma migrate deploy
4. prisma generate (regenerates client)
5. Verify with `\d doc_link` and `SELECT unnest(enum_range(NULL::"DocSourceType"))`

(Phase 17 reminded us to NOT skip prisma generate after migrate.)

</code_context>

<deferred_ideas>
- Visual force-directed graph viewer (browse links interactively)
- LLM-suggested auto-links (similarity-based)
- Versioning / history of doc edits (audit trail)
- Cross-space doc linking
- Bulk doc operations (delete N, merge, etc.)
- Doc templates for agents to start from
- "Suggest related docs" agent tool that runs traversal + ranks
</deferred_ideas>

---
_Created: 2026-06-06_
_4 features (write/update/link/traverse), 1 migration, ~6 commits expected_
