# Agent Memory Graph — Minimal-Change Implementation Plan

**Goal:** turn the Doc Library into an _agent memory graph_ (entities / relations /
observations) with a simple React md UI, fast, markdown → chunks → embeddings, on
Postgres + pgvector — **with the fewest possible modifications**.

## Guiding decision: EXTEND, don't replace

You already own 4 of the 5 required pieces. Only "memory-graph semantics" is missing.

| Requirement                                   | Status today                                                           |
| --------------------------------------------- | ---------------------------------------------------------------------- |
| Simple React UI to manage md files            | ✅ `DocFolderTree` + `DocEditorArea` (CodeMirror, split/preview)       |
| markdown → chunks → embeddings                | ✅ `ingestion.service.ts` (`ingestMarkdown`, `chunkContent`, pgvector) |
| Postgres + pgvector, fast                     | ✅ `doc_chunk.embedding` + HNSW/FTS indexes (added this session)       |
| Background jobs: workers / progress / reindex | ✅ `doc-ingest.processor.ts` (BullMQ, `onProgress`, `reindexDoc`)      |
| **Agent memory graph (entities/relations)**   | ❌ only doc↔doc links (`doc_link`) exist today                        |

**Therefore: do NOT add Cognee (Python) or SurrealDB/HelixDB (Rust).** They each add a
new runtime/datastore, a data migration, and the polyglot operational caveat. The
minimal path is to add a thin memory-graph layer on the Postgres + pgvector + BullMQ +
AI-gateway you already run, and keep the React UI as-is.

## What we already have to build on

- pgvector + idempotent chunk re-insert (delete-by-`docId` then insert) — reuse the pattern.
- `doc_link` graph + `expandScopeViaLinks` recursive-CTE traversal (`search.service.ts`) — the
  exact shape we need for relation traversal.
- AI provider gateway (Phase 15, `UnifiedAiService`) — reuse for entity/relation extraction.
- MCP tools (`get_doc_links`, agent-links controller) — extend for agent memory reads.
- BullMQ `onProgress` + reindex job — reuse; just add a stage.

---

## Phase 0 — DONE (this session)

Stability/perf foundation already landed: `isIndexed` fix, BullMQ dedup fix,
HNSW + FTS indexes, single-embed hybrid search, doc-library UI width fix.

## Phase 1 — Memory graph storage + extraction stage (the core change)

**New Prisma models** (additive migration, no change to existing tables):

```prisma
model MemoryEntity {
  id           String   @id @default(cuid())
  spaceId      String
  name         String
  type         String          // person | concept | system | ...
  summary      String   @db.Text
  embedding    Unsupported("vector(1536)")?
  sourceDocId  String?         // provenance → imported_doc.id
  version      Int      @default(1)
  supersededById String?       // contradiction-driven supersession (agentic)
  createdAt    DateTime @default(now())
  @@index([spaceId, name])
  @@map("memory_entity")
}
model MemoryRelation {
  id          String   @id @default(cuid())
  spaceId     String
  fromEntityId String
  toEntityId   String
  label       String          // "works_for", "depends_on", ...
  weight      Float    @default(1)   // usage-reweighted by memify (Phase 4)
  validFrom   DateTime @default(now())
  validTo     DateTime?       // temporal validity (Zep-style state change)
  sourceDocId String?
  @@index([spaceId, fromEntityId])
  @@index([spaceId, toEntityId])
  @@map("memory_relation")
}
```

Plus (raw SQL in the same migration, mirroring the F-02 pattern):
`CREATE INDEX ... ON memory_entity USING hnsw (embedding vector_cosine_ops);`

**One new worker stage** in `ingestion.service.ts` (`ingestMarkdown` + `reindexDoc`):
after `insertChunks(...)` and before the final `isIndexed:true` update, add an
`extractMemory(spaceId, docId, content)` step:

1. `DELETE FROM memory_entity / memory_relation WHERE sourceDocId = docId` (idempotent, same as chunks).
2. Call `UnifiedAiService` once to extract entities + relations (structured JSON).
3. Embed entity summaries via the existing `EmbeddingService` (batch).
4. Bulk-insert via `$executeRaw` (reuse `insertChunks` style).
   Report progress through the existing `onProgress` (e.g. 85 → 95). Failure must be
   swallowed (keyword/graph still works), matching the embedding-failure pattern.

> Effort: ~1 service method + 1 migration. No new infra, no UI change.

## Phase 2 — Read paths (search + agent)

- `search.service.ts`: add `entitySearch()` (pgvector over `memory_entity`, copy
  `semanticSearch`) and `traverseMemory()` (recursive CTE over `memory_relation`, copy
  `expandScopeViaLinks`). Optionally fuse entity hits into `hybridSearch` as a 4th RRF list.
- MCP: add `search_memory` / `get_memory` tools next to the existing `get_doc_links`,
  so agents read the graph. Reuse the space-scoped RBAC check already in `DocLinkService`.

## Phase 3 — Minimal UI (reuse, don't build new)

- Clone the `LinkedDocsPanel` pattern → a "Memory" section showing the selected doc's
  entities + relations (read-only v1). No new heavy UI, no new route.

## Phase 4 — Agentic "memify" (optional, later)

- A scheduled BullMQ job that (a) reweights `memory_relation.weight` by access frequency
  and (b) supersedes contradicted entities via `version`/`supersededById`. This is the
  self-improving upgrade over static reindex — purely additive, ship when needed.

---

## Why this is the least-change path

- **0 stack change:** stays TypeScript/Node + your one Postgres. No Python, no Rust, no
  new datastore, no second service to deploy/monitor.
- **0 migration of existing data:** new tables only; `imported_doc`/`doc_chunk`/`doc_link`
  untouched.
- **Reuses everything:** BullMQ + progress, pgvector + HNSW pattern, AI gateway, MCP,
  recursive-CTE traversal, and the existing React md UI.
- **Incremental & reversible:** each phase is independently shippable; Phase 1 alone already
  delivers an agent-readable memory graph.

## Scope summary

~2 new tables · 1 worker stage · 2 query methods · 2 MCP tools · 1 reused UI panel.
No new language, no new database, no UI rewrite.

## When to revisit a replacement

Only if you hit a hard ceiling this can't meet: (a) graph traversals dominate and
SQL recursive CTEs become the bottleneck → consider a Rust graph DB (HelixDB/SurrealDB)
_as a datastore_ behind the same TS API; (b) you need turnkey self-improving memory fast
→ Cognee. Both remain drop-in _behind_ the unchanged React UI, so this plan does not lock
you out of them.
