# Doc Library — Fix vs. Replace: Options & Recommendation

Date: 2026-06-04 · Companion to `DOC-LIBRARY-INVESTIGATION.md`

## TL;DR

**Don't replace the indexing tech — it's already the modern, correct choice.** The current
stack (Postgres + pgvector + full-text + weighted hybrid) is exactly what the 2026 consensus
recommends for <10M vectors. The doc library "doesn't work" because of **(1)** the host
backend's OOM instability (v2 computed-update + shared heap) and **(2)** naive word-based
chunking — not because of the database or search design. Fix those two; keep pgvector.

---

## Current implementation (facts)

- **Storage:** Postgres, `DocChunk.embedding vector(1536)?` (pgvector, nullable → keyword-only fallback works).
- **Embeddings:** OpenAI `text-embedding-3-small` via `UnifiedAiService` (graceful fallback when no key).
- **Chunking:** naive — word windows (`CHUNK_WORDS`/`OVERLAP_WORDS=37`), token cap 2000. **Not markdown-aware.**
- **Search:** `semanticSearch` (pgvector `<=>` cosine) + `keywordSearch` (`ts_rank`/`plainto_tsquery`) + `hybridSearch` (**weighted 0.7/0.3**, not RRF).
- **Pipeline:** BullMQ `DOC_INGEST` worker **inside the main NestJS process** (shares heap with v2 + ShareDB + Next SSR).
- **Scale today:** 10 docs / 2 chunks. The OOM is driven by **v2 (660 tables / 2415 fields)**, _not_ by doc data.

This is a sound, modern, Postgres-native hybrid-search design. The weak spots are chunking
quality and where the worker runs — both fixable in place.

---

## What the 2026 research says

- **Vector DB choice is only ~5–10% of RAG quality**; chunking, embedding model, and retrieval
  pipeline matter far more. ([4xxi](https://4xxi.com/articles/vector-database-comparison/))
- **pgvector has caught up** and "crushes everyone on operational simplicity" for <10M vectors;
  used in production by OpenAI, Supabase, Neon. Don't add a vector DB unless scaling massively.
  ([DanubeData](https://danubedata.ro/blog/pgvector-rag-managed-postgres-2026), [pgvector](https://github.com/pgvector/pgvector))
- **Hybrid is right, but RRF beats weighted scoring.** Fuse BM25 + vector with **Reciprocal Rank
  Fusion**, optionally a cross-encoder reranker (`bge-reranker-v2-m3`, ColBERT).
  ([ParadeDB](https://www.paradedb.com/blog/hybrid-search-in-postgresql-the-missing-manual),
  [Tiger Data](https://www.tigerdata.com/blog/elasticsearchs-hybrid-search-now-in-postgres-bm25-vector-rrf))
- **Markdown-aware chunking wins.** Header/structure-based chunking beats naive fixed-size and even
  semantic chunking by 5–10 pts on structured docs; pair with a recursive fallback for oversized
  sections; watch the ~2,500-token "context cliff."
  ([Unstructured](https://unstructured.io/blog/chunking-for-rag-best-practices),
  [Firecrawl](https://www.firecrawl.dev/blog/best-chunking-strategies-rag))
- **Heavy vector queries co-located with app data can hurt the main DB/app** — argues for isolating
  the indexing workload. ([4xxi](https://4xxi.com/articles/vector-database-comparison/))
- **OSS frameworks** (if replacing): LlamaIndex = best ingestion/parsing (−40% chunking errors),
  Haystack = production modularity, RAGFlow = PDF/OCR-heavy corpora (−60% retrieval failure) — all
  Python, so each means a **separate service**.
  ([Firecrawl](https://www.firecrawl.dev/blog/best-open-source-rag-frameworks),
  [langcopilot](https://langcopilot.com/posts/2025-09-18-best-rag-frameworks-2026))

---

## Options

### ✅ Option A (RECOMMENDED) — Keep Postgres/pgvector, harden + decouple

1. **Move ingestion + heavy search off the unstable monolith.** Run the BullMQ `DOC_INGEST`
   worker (and ideally the search service) in a **dedicated Node process** with its own heap.
   This directly aligns with **Phase 14 (process-separation)** already planned. It isolates the
   doc library from the v2/ShareDB OOM (and vice-versa) — the single biggest reliability win.
2. **Fix chunking → markdown-aware.** Split on headings (H1–H3) to keep sections intact, then a
   recursive token-bounded fallback (~512–1024 tokens, hard cap < 2000 to avoid the context
   cliff), carry heading breadcrumbs as chunk metadata. Highest _quality_ lever.
3. **Upgrade fusion → RRF** (replace the 0.7/0.3 weighting). Optional: adopt `pg_search`/ParadeDB
   **BM25** for better lexical scoring than `ts_rank`, and a cross-encoder **reranker** on the top-k.
4. **Separately fix the v2 boot/runtime OOM** (the actual app blocker — see investigation doc).

_Effort: medium. Risk: low. Keeps one datastore, ACID, no new language/infra._

### ⚠️ Option B — Replace with an OSS RAG service (RAGFlow / LlamaIndex / Haystack)

Run a containerized Python service; Teable calls it over HTTP; Postgres/pgvector can still be the
store. Worth it **only if** they need advanced PDF/OCR/layout parsing (RAGFlow) or richer ingestion
(LlamaIndex). Costs: new runtime + service to operate, data/sync duplication, more moving parts —
adds operational complexity without changing the 90% of quality that chunking/retrieval drive.

_Effort: high. Risk: medium. Justified only for document-heavy/OCR needs._

### ❌ Option C — Dedicated vector DB (Qdrant / Weaviate / Milvus)

Research explicitly says **not worth it for <10M vectors**; adds ops complexity and a second
datastore for negligible quality gain at this scale. Skip unless the corpus grows by orders of
magnitude.

---

## Implementation status (this branch)

- ✅ **#3 markdown-aware chunking** — heading split + recursive fallback, token caps (`ingestion.service.ts`, 6 tests).
- ✅ **#4 RRF fusion** — replaced weighted 0.7/0.3 with Reciprocal Rank Fusion (`search.service.ts`).
- ✅ **#2 worker decoupling** — role-based `doc-worker` process + `EMBEDDING_GENERATOR` token + `DOC_INGEST_WORKER_EXTERNAL` gate (`src/worker/`, see its README). Type-checked; runtime boot pending a rebuild.
- ⬜ **#1 v2 computed-update/container OOM** — the app-wide blocker; needs deeper `packages/v2` work.

## Recommendation

**Option A.** The indexing design is already best-practice; the failures are environmental
(host-process OOM) and chunk-quality. Concretely, in priority order:

1. Fix the v2 computed-update / container-init OOM (unblocks the whole app).
2. Decouple the doc-ingest worker into its own process (Phase 14) so the library is independently stable.
3. Replace word-chunking with markdown-header-aware chunking + recursive fallback.
4. Switch hybrid fusion to RRF; add `pg_search` BM25 + a reranker if/when search quality needs it.

Re-evaluate Option B only if PDF/OCR/layout extraction becomes a real requirement.

## Sources

- https://4xxi.com/articles/vector-database-comparison/
- https://danubedata.ro/blog/pgvector-rag-managed-postgres-2026
- https://github.com/pgvector/pgvector
- https://www.paradedb.com/blog/hybrid-search-in-postgresql-the-missing-manual
- https://www.tigerdata.com/blog/elasticsearchs-hybrid-search-now-in-postgres-bm25-vector-rrf
- https://unstructured.io/blog/chunking-for-rag-best-practices
- https://www.firecrawl.dev/blog/best-chunking-strategies-rag
- https://www.firecrawl.dev/blog/best-open-source-rag-frameworks
- https://langcopilot.com/posts/2025-09-18-best-rag-frameworks-2026
