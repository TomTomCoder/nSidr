# Phase 18: External DB Connectors — Discussion Log

**Date:** 2026-06-05 · Mode: discuss (default)

> Human-reference record. Not consumed by downstream agents.

## Areas selected
User selected all four gray areas (multiSelect); decided each via recommendation set.

| Area | Options | Selected |
|------|---------|----------|
| VectorDB target + role | Qdrant additional (rec) / ext-pgvector additional / configurable replacement | **Qdrant, additional source (RRF-merged)** |
| VectorDB read vs write | Read/query first (rec) / Read+write sync | **Read + write sync** (sync Teable embeddings into external store; off hot path) |
| Postgres federation surface | Read-only SQL (rec) / Mapped virtual tables | **Mapped virtual tables/views** (introspect + browsable, read-only) |
| Connection scope + creds | Per-space + AES-256 + SSRF (rec) / Per-base | **Per-space, AES-256-CBC, SSRF guards** |

## Notes
- User chose the more ambitious options on VectorDB (sync) and Postgres (virtual tables) — larger
  build; planner to split into waves.
- Reuse: base-sql-executor (DSN/knex), DocSearchService RRF, DOC_INGEST worker pattern, Integration
  AES-256 encryption.

## Deferred
- More VectorDB backends (Weaviate/Pinecone/ext-pgvector); writable federated Postgres; per-base/per-agent scope; pgvector replacement.
