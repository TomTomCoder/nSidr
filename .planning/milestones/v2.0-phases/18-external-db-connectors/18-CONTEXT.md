# Phase 18: External DB Connectors - Context

**Gathered:** 2026-06-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Connect **external** data stores without importing data: (1) an external **VectorDB** (Qdrant) as
an additional RAG source for the knowledge graph / agents, and (2) an external **Postgres**
surfaced as browsable virtual tables for federated (read-only) access. Requirements: EXTDB-01,
EXTDB-02.

**New build** (confirmed by audit): no external-DB connector exists today. Reuse: `base-sql-executor`
(DSN parsing + knex), the `Integration` model + AES-256-CBC credential encryption (Phase 6),
`DocSearchService` (RRF hybrid) for the VectorDB merge.
</domain>

<decisions>
## Implementation Decisions

### VectorDB target + role (EXTDB-01)
- **D-01:** First target = **Qdrant** (OSS dedicated VectorDB, simple HTTP API). Build a
  **connector interface** so Weaviate / external-pgvector can be added later.
- **D-02:** External vectors are an **ADDITIONAL RAG source merged** with internal pgvector results
  via the existing **RRF fusion** in `DocSearchService.hybridSearch` — augment, not replace.

### VectorDB read/write (EXTDB-01)
- **D-03:** **Read + write sync.** Query the external Qdrant as a RAG source AND **sync Teable doc
  embeddings into it** so it can back the knowledge graph at scale. Sync runs **off the API hot
  path** (reuse the v1.0 decoupled-worker/BullMQ pattern — like `DOC_INGEST`). Must handle
  upsert/delete on doc change + initial backfill; keep internal pgvector as source of truth.

### Postgres federation surface (EXTDB-02)
- **D-04:** **Mapped virtual tables/views.** Introspect the external Postgres schema and surface
  its tables as **browsable virtual tables** in Teable (read-only). No data import. Read-only
  enforced via a **read-only connection role + statement filtering** (SELECT only). Virtual tables
  are query-through (no row copies).

### Connection scope + credentials (both)
- **D-05:** Connections are **per-space**, added in the **space settings / integrations UI**.
- **D-06:** Credentials reuse the **Integration AES-256-CBC** encryption (`INTEGRATION_SECRET_KEY`).
  **SSRF guards mandatory**: validate/resolve host, block private/loopback/link-local + cloud
  metadata IPs (169.254.169.254, etc.), optional allowlist. Connection test on save.

### Claude's Discretion
- Qdrant client lib choice + collection/payload schema; embedding-dimension matching with internal
  pgvector (1536); how virtual tables map to Teable's field/view model; introspection caching;
  sync batch sizes/retry. Researcher/planner decide.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase / milestone
- `.planning/REQUIREMENTS.md` — EXTDB-01/02
- `.planning/ROADMAP.md` §"Phase 18" — goal + success criteria
- `.planning/research/SUMMARY.md` — external-DB stance (pgvector default; VectorDB optional connector); off-hot-path rule
- `apps/nestjs-backend/DOC-INDEXING-OPTIONS.md` — pgvector-vs-dedicated-VectorDB analysis (Qdrant/Weaviate)

### Existing code (reuse)
- `apps/nestjs-backend/src/features/base-sql-executor/base-sql-executor.service.ts` — DSN parse + knex (Postgres connector base for D-04)
- `apps/nestjs-backend/src/features/doc-search/search.service.ts` — `hybridSearch`/RRF to merge external vectors (D-02)
- `apps/nestjs-backend/src/features/doc-search/doc-ingest.processor.ts` + `worker/` — decoupled BullMQ pattern for the VectorDB sync (D-03)
- Integration model (`schema.prisma` model `Integration`, line ~778) + Phase 6 AES-256-CBC encryption — credential storage (D-05/06)
- `apps/nestjs-backend/BOOT-OOM-INVESTIGATION.md` — keep sync/introspection off the API hot path

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `base-sql-executor` (parseDsn, knex) — extend for an external read-only Postgres connection.
- `DocSearchService.hybridSearch` + RRF — merge Qdrant results with internal pgvector (D-02).
- `DOC_INGEST` BullMQ worker pattern — model for the VectorDB sync queue (D-03).
- `Integration` model + AES-256-CBC encryption (INTEGRATION_SECRET_KEY) — per-space creds (D-05/06).

### Established Patterns
- Space-scoped integrations (Phase 6). Heavy/async work off the API hot path (v1.0).
- Embeddings are 1536-dim (OpenAI text-embedding-3-small) — external Qdrant collection must match.

### Integration Points
- New: `ExternalConnection` model (per-space; type=qdrant|postgres; encrypted creds; SSRF-checked).
- New: VectorDB connector (Qdrant client) + sync worker + merge into hybridSearch.
- New: Postgres connector (read-only role) + schema introspection + virtual-table layer + read-only UI.
- New: space settings/integrations UI to add/test connections.
</code_context>

<specifics>
## Specific Ideas

- User chose the ambitious paths: **read+write VectorDB sync** (not read-only) and **mapped virtual
  tables** (not raw SQL) — capture both; the planner will split into multiple plans/waves.
- Qdrant first; per-space; SSRF-hardened.
</specifics>

<deferred>
## Deferred Ideas

- Additional VectorDB backends (Weaviate, Pinecone, external pgvector) — connector interface now, more later.
- Writable/federated Postgres (write-back) — out of scope; read-only only.
- Per-base/per-agent connection scope — per-space chosen.
- Replacing internal pgvector entirely with an external store — rejected (merge/augment instead).

None block Phase 18.
</deferred>

---

*Phase: 18-external-db-connectors*
*Context gathered: 2026-06-05*
