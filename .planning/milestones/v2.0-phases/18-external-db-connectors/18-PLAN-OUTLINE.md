---
phase: 18-external-db-connectors
created: 2026-06-05
type: plan
requirements: [EXTDB-01, EXTDB-02]
context: 18-CONTEXT.md
---

# Phase 18 — External DB Connectors: Plan

> Decisions (18-CONTEXT.md): Qdrant first (additional, RRF-merged); read+write **sync** off hot path;
> external Postgres as **mapped virtual tables** (read-only); per-space, AES-256 + SSRF guards.

## Grounding (verified 2026-06-05 + plan-review)
- Qdrant client = `@qdrant/js-client-rest` (add). No VectorDB libs installed.
- Teable tables map to real PG tables via `dbTableName`; **no virtual/external-table concept exists** → new layer (the big new piece).
- **Reuse wins (plan-review):** `base-sql-executor.createConnection()` already builds external
  `PrismaClient`/knex connections → base the external-Postgres connector on it (shrinks 18-04).
  `OAuthIntegrationFieldSync` (+`syncDirection`, Phase 6) is an existing external↔field sync pattern
  → model the VectorDB sync direction on it (shrinks 18-03).
- Reuse: `DocSearchService.hybridSearch` RRF; the decoupled `apps/nestjs-backend/src/worker/`
  (role-based `TEABLE_ROLE`) pattern for the sync worker; `Integration` AES-256-CBC encryption.
- Embeddings are 1536-dim → Qdrant collection must match.

## Wave 0 — Verify-live-first (process gate)
**18-00 — Live-verify (≤0.5 day).** Boot app; confirm `base-sql-executor.createConnection` + the
Integration encryption path work as assumed before building. Stand up a local Qdrant + throwaway
external Postgres for the build. *Success:* assumptions confirmed against the running app.

## Waves & Plans

### Wave 1 — Connection foundation (shared, EXTDB-01+02)
**18-01 — `ExternalConnection` model + CRUD + UI.** New per-space model
(`type: qdrant|postgres`, encrypted config, `enabled`, `createdBy`). Reuse Integration AES-256-CBC
(`INTEGRATION_SECRET_KEY`). **SSRF guard service**: resolve host, block loopback/private/link-local
+ cloud-metadata IPs, optional allowlist; "test connection" on save. Space settings/integrations UI
to add/test/remove connections. *Success:* user adds + tests a Qdrant and a Postgres connection;
creds stored encrypted; SSRF to 169.254.169.254 / localhost rejected.

### Wave 2 — VectorDB (Qdrant) connector (EXTDB-01) — depends on 18-01
**18-02 — Qdrant read path.** Add `@qdrant/js-client-rest`. `QdrantConnector` (collection schema,
1536-dim, query by embedding). Merge external hits into `DocSearchService.hybridSearch` via the
existing **RRF fusion** (external = additional ranked list). *Success:* a space with a Qdrant
connection returns merged results (internal + external) for a query.

**18-03 — Embedding sync (write path, off hot path).** A BullMQ sync queue + worker (mirror the
`doc-worker` role-based entry): initial backfill of existing `doc_chunk` embeddings into Qdrant,
and upsert/delete on doc ingest/reindex/delete. Internal pgvector stays source of truth. *Success:*
importing a doc upserts its vectors into Qdrant; deleting removes them; backfill command populates
an empty collection.

### Wave 3 — External Postgres → virtual tables (EXTDB-02) — depends on 18-01
**18-04 — Read-only Postgres connector + introspection.** Extend `base-sql-executor`/knex for an
**external** read-only connection (read-only role; statement filter = SELECT-only). Introspect
schema (tables, columns, types); cache introspection. *Success:* connector lists external tables +
columns; a non-SELECT statement is rejected.

**18-05 — Virtual-table layer + UI.** Map introspected external tables to **read-only virtual
tables/views** in Teable (query-through, no row copies); render them browsable in the UI (reuse
grid/view; mark read-only). *Success:* user browses an external Postgres table's rows in Teable;
no import; edits blocked.

### Wave 4 — Tests & live verification
**18-06 — Tests.** Unit: SSRF guard, RRF merge with external list, introspection/statement-filter,
sync upsert/delete. e2e/live: with app running, add Qdrant + Postgres connections and verify the
two success flows (merged RAG result; browsable external table). *Success:* suites green; live
flows verified.

## Test strategy (per CONTEXT: test each capability live)
App running (web :3000 + API :3002). Stand up a local Qdrant (docker) + a throwaway external
Postgres. Verify: connection add/test + SSRF rejection → Qdrant merged search → sync on
import/delete → external Postgres virtual table browse (read-only).

## Risks / watch-for
- **SSRF** is the top security risk (user-supplied hosts) — guard before any connection attempt.
- Sync worker must run **off the API hot path** (memory) — reuse the decoupled worker; gate via env.
- Virtual-table layer is the largest piece — keep strictly read-only (no Teable write paths touch it).
- Embedding-dim mismatch (external Qdrant collection ≠ 1536) — validate on connect.

## Coverage
EXTDB-01 → 18-02 (read) + 18-03 (sync). EXTDB-02 → 18-04 (connector) + 18-05 (virtual tables).
Foundation 18-01; tests 18-06. **2/2 requirements ✓**
