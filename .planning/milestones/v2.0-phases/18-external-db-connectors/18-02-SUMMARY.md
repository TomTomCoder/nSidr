---
phase: 18-external-db-connectors
plan: 18-02
subsystem: external-db-connectors
tags: [qdrant, vector-search, rag, rrf, hybrid-search, nestjs, security]
dependency_graph:
  requires: [18-01]
  provides: [qdrant-read-path, vector-connector-interface]
  affects: [18-03, 18-04]
tech_stack:
  added:
    - "@qdrant/js-client-rest@1.18.0 (official Qdrant REST client)"
    - QdrantConnectorService (IVectorConnector impl — dim-validate + query-by-embedding)
    - IVectorConnector interface (D-01 backend-agnostic vector contract)
  patterns:
    - Connector bound to a single decrypted ExternalConnection config (no env host) — T-18-02-SSRF
    - fromConfig() factory builds real QdrantClient; constructor takes injected client for tests
    - External hits fused as a THIRD RRF list via existing fuse() (D-02 augment, not replace)
    - Optional constructor dep (@Optional ExternalConnectionService) keeps internal-only callers working
    - External-store errors swallowed → degrade to internal-only (T-18-02-D)
key_files:
  created:
    - apps/nestjs-backend/src/features/external-connection/qdrant/vector-connector.interface.ts
    - apps/nestjs-backend/src/features/external-connection/qdrant/qdrant-connector.service.ts
    - apps/nestjs-backend/src/features/external-connection/qdrant/qdrant-connector.service.spec.ts
  modified:
    - apps/nestjs-backend/package.json
    - apps/nestjs-backend/src/features/doc-search/search.service.ts
    - apps/nestjs-backend/src/features/doc-search/search.service.spec.ts
    - apps/nestjs-backend/src/features/doc-search/doc-search.module.ts
decisions:
  - "D-01: IVectorConnector interface so Weaviate/pgvector/Pinecone slot in later without touching DocSearchService"
  - "D-02: external vectors AUGMENT internal results (third fuse() call) — pgvector stays source of truth"
  - "1536-dim enforced on connect (validate()) — mismatched collection rejected fast (T-18-02-T)"
  - "Reuse the query embedding already computed for semanticSearch — single embedding call per query"
  - "ExternalConnectionService injected @Optional so Phase 17 callers / unit tests stay internal-only"
metrics:
  duration: "~35 minutes"
  completed: "2026-06-07"
  tasks_completed: 2
  files_changed: 7
---

# Phase 18 Plan 02: Qdrant Read Path Summary

**One-liner:** External Qdrant vectors enrich RAG via @qdrant/js-client-rest — a dim-validated (1536) connector behind a backend-agnostic IVectorConnector interface, with its hits fused as a third Reciprocal Rank Fusion list inside `DocSearchService.hybridSearch` (augment, not replace; degrades to internal-only on failure).

## What Was Built

### Task 1: QdrantConnectorService + IVectorConnector + dim validation

`IVectorConnector` (D-01) — `validate()` + `search(embedding, limit)` contract with `REQUIRED_VECTOR_DIM = 1536` exported so other engines reuse the same dimension gate.

`QdrantConnectorService implements IVectorConnector`:
- `fromConfig(config)` factory builds a real `QdrantClient` from the **stored, already-SSRF-gated** decrypted config (url, or host+port fallback) — never an env host (T-18-02-SSRF). Constructor accepts an injected client so unit tests run without HTTP.
- `validate()` calls `getCollection()` and fails fast with a clear `BadRequestException` when the collection's vector size != 1536 (handles both the single-unnamed `{size}` shape and the named-vector map shape). Mismatch error names both the actual size and the required size (T-18-02-T).
- `search()` calls `client.query(collection, { query, limit, with_payload: true })` and maps each point → `DocSearchResult` (id→chunkId with String() coercion for numeric ids; payload `content`/`text`/`chunkContent` fallbacks; `docId`/`doc_id` fallback to point id; `title`/`docTitle` fallbacks).

Commits: `eed9b6a48` (RED), `f6f1341a4` (GREEN). 7 spec cases green.

### Task 2: Merge Qdrant hits into hybridSearch via existing RRF

In `hybridSearch`, after computing `semantic` + `keyword`:
- `listEnabledQdrant(spaceId)` returns enabled `type='qdrant'` connections (decrypted config) via `ExternalConnectionService`. Returns `[]` when the external stack isn't wired.
- Only when ≥1 enabled qdrant connection exists: reuse the query embedding (`embeddingService.generateEmbedding`), then `externalSearch()` validates each connector's dim and queries by embedding, concatenating hits.
- `fuse(external)` is added as a THIRD ranked list before the final sort/slice — same `K=60` RRF math, no new fusion code path (D-02).
- The whole external block is wrapped in try/catch: a down/misconfigured store logs a warning and degrades to internal-only — never fails the search (T-18-02-D).
- `ExternalConnectionService` injected `@Optional`; `ExternalConnectionModule` imported into `DocSearchModule`.

Commits: `3b2e14df6` (RED), `75ac4dd9e` (GREEN). 8 spec cases green (3 new + 5 existing RRF).

## Verification

- `qdrant-connector.service.spec.ts`: 7/7 passing
- `search.service.spec.ts`: 8/8 passing (3 new external-merge + 5 existing RRF)
- Full external-connection + doc-search suites: **54/54 passing** (incl. ssrf-guard 22, external-connection.service 8, search.service.traverse 9 — confirms backward-compat: traverse spec constructs DocSearchService with only 2 ctor args via the @Optional dep)
- `tsc --noEmit`: 0 errors in any new/modified file

Tests run with arm64 node (`/opt/homebrew/bin/node`, process.arch=arm64) per plan requirement; default repo `node` is x64 under Rosetta.

## TDD Gate Compliance

Both tasks followed RED → GREEN. Git log shows the required ordering:
- Task 1: `test(18-02)` eed9b6a48 → `feat(18-02)` f6f1341a4
- Task 2: `test(18-02)` 3b2e14df6 → `feat(18-02)` 75ac4dd9e

No REFACTOR commits needed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Correctness] @Optional ExternalConnectionService injection**
- Found during: Task 2 wiring
- Issue: The plan said "inject the two new services into DocSearchService's module." Injecting a required `ExternalConnectionService` would break the standalone doc-ingest worker module and the existing `search.service.traverse.spec.ts` (constructs the service with 2 args).
- Fix: Made `externalConnectionService` an `@Optional()` constructor param; `listEnabledQdrant` returns `[]` when absent → internal-only path is byte-for-byte unchanged. `QdrantConnectorService` is not a singleton provider (it is per-connection, built via `fromConfig`), so only `ExternalConnectionModule` is imported.
- Files: `search.service.ts`, `doc-search.module.ts`
- Commit: `75ac4dd9e`

**2. [Rule 1 - Robustness] Vector-size extraction handles named-vector map shape**
- Found during: Task 1 implementation
- Issue: Qdrant returns `config.params.vectors` as either `{size, distance}` (unnamed) or `{<name>: {size, distance}}` (named). A naive `.size` read would throw on named collections.
- Fix: `extractVectorSize()` handles both shapes; covered by a dedicated spec case.

## Live Connectivity (Deferred)

Docker is not available in the executor environment, so a live merge against the 18-00 local Qdrant fixture was not run at commit time. All connector logic is covered by unit tests with an injected fake client.

**Manual verification steps:**
```bash
# Start the 18-00 Qdrant fixture
docker compose -f docker-compose.qdrant.yml up -d

# Seed a 1536-dim collection named "documents" with a few points (payload: content, docId, title)
# Then create an enabled qdrant ExternalConnection for a space (EXTERNAL_DB_HOST_ALLOWLIST=localhost for local)

# Start backend and query hybrid search for that space:
cd apps/nestjs-backend && EXTERNAL_DB_HOST_ALLOWLIST=localhost pnpm dev
# Expect: hybridSearch results include the external chunkIds fused into the ranking.

# Negative: point the connection at a collection with size != 1536 →
#   validate() throws BadRequestException; search degrades to internal-only (warning logged).
```

## Known Stubs

None. The read path is fully wired: ExternalConnectionService.list → QdrantConnectorService.fromConfig → validate (1536) → query-by-embedding → fuse(external) in hybridSearch.

## Threat Flags

None beyond the declared threat model. All four declared mitigations implemented:
- T-18-02-SSRF: connector builds its URL only from stored config (SSRF-gated at 18-01 save); no env host.
- T-18-02-D: try/catch around the external block degrades to internal-only.
- T-18-02-T: validate() enforces 1536-dim on connect, rejecting mismatched collections.
- T-18-02-SC: @qdrant/js-client-rest@1.18.0 (official Qdrant org) installed only after the blocking human-verify checkpoint was approved.

## Self-Check: PASSED

Files present:
- apps/nestjs-backend/src/features/external-connection/qdrant/vector-connector.interface.ts — FOUND
- apps/nestjs-backend/src/features/external-connection/qdrant/qdrant-connector.service.ts — FOUND
- apps/nestjs-backend/src/features/external-connection/qdrant/qdrant-connector.service.spec.ts — FOUND

Commits present:
- eed9b6a48 (RED task 1) — FOUND
- f6f1341a4 (GREEN task 1) — FOUND
- 3b2e14df6 (RED task 2) — FOUND
- 75ac4dd9e (GREEN task 2) — FOUND

Tests: 54/54 passing (arm64 node). TypeScript: 0 errors in changed files.
