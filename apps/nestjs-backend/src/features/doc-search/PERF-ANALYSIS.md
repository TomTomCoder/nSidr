# Doc Library — Performance Analysis

Live latency baseline (small corpus, 3 docs) — all healthy, no acute query issue:

| Endpoint             | ms  |
| -------------------- | --- |
| GET /docs (list)     | 32  |
| GET /docs/:id        | 15  |
| GET :id/agent-links  | 11  |
| GET :id/memory       | 11  |
| POST search (hybrid) | 48  |
| POST memory/search   | 13  |

The real issues are **architectural** (they scale poorly or block user-visible state),
and the two highest-impact ones were introduced by the Phase 1 memory-graph work.

## Findings & fixes

### P-01 (HIGH, fixed) — ingestion blocked on LLM memory extraction

`ingestMarkdown` / `reindexDoc` ran `insertMemory()` **before** setting `isIndexed: true`.
`insertMemory` → `extractMemory` calls an LLM (`generateObject`) plus an embedding batch, so
with a chat model configured the document stayed `isIndexed:false` (not searchable, library
shows "Indexing…") for the whole multi-second extraction.
**Fix:** set `isIndexed: true` + `chunkCount` immediately after `insertChunks`, then run
`insertMemory` after (best-effort). The doc is searchable the moment chunks land; the memory
graph fills in behind it. No behavioural change when no model is configured.

### P-02 (MEDIUM, fixed) — extractMemory ran ~5 queries per ingest via getSnapshot()

`UnifiedAiService.extractMemory` called `workspaceStateService.getSnapshot(spaceId)` — which
issues ~5 queries (bases+tables+fields, integrations, agents, agentTriggers, plugins) building
the entire workspace state — only to read `bases[0].id` for chat-model resolution. That ran on
**every** document ingest/reindex.
**Fix:** replace with a single `prisma.base.findFirst({ where: { spaceId }, select: { id } })`.

## Observed but NOT changed (acceptable / lower priority)

- **P-03 (low):** `insertMemory` issues a `DELETE FROM memory_entity` per ingest even when no
  entities are produced. Required for idempotency; cost is one indexed delete — keep.
- **P-04 (low):** `MemoryPanel` and `LinkedDocsPanel` each fire a request on every doc-open even
  when those features are dormant (no memory / no links). ~11 ms each; could be gated behind a
  capability flag later. Not worth the complexity now.
- **P-05 (inherent):** memory extraction adds a second embedding round-trip (entity summaries)
  separate from chunk embeddings. Inherent to the feature; only incurred when a model is set,
  and now off the critical `isIndexed` path (P-01).

## Already-resolved this session (context)

- Missing ANN/FTS indexes on `doc_chunk` (F-02 → HNSW + GIN).
- Duplicate query embedding in hybrid search (F-01 → embed once).
- Per-keystroke search POSTs (→ 250 ms debounce) and per-keystroke doc saves (debounced).
- 3 s docs-list polling stops once all docs are indexed.

## If the corpus grows large (future watch-list)

- `entitySearch` / `semanticSearch` rely on HNSW recall; tune `hnsw.ef_search` if recall drops.
- `traverseMemory` / `expandScopeViaLinks` recursive CTEs are bounded by `maxHops≤3`; fine until
  relation counts are very high, then consider a materialized neighbour table.
