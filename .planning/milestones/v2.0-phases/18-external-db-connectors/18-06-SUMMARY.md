---
plan_id: 18-06
phase: 18-external-db-connectors
plan: "Wave 4: verification consolidation — cross-cutting unit coverage + live e2e"
subsystem: external-connection
tags: [testing, ssrf, rrf, vector-sync, introspection, e2e]
dependency_graph:
  requires: [18-01, 18-02, 18-03, 18-04, 18-05]
  provides: [full-suite-verification, cross-cutting-specs, live-e2e-harness]
  affects: [doc-search, external-connection, ssrf-guard, virtual-table]
tech_stack:
  added: []
  patterns: [vitest-subclass-override, graceful-skip-e2e, rrf-fusion-unit-test]
key_files:
  created:
    - apps/nestjs-backend/src/features/external-connection/__tests__/ssrf-guard.integration.spec.ts
    - apps/nestjs-backend/src/features/external-connection/__tests__/rrf-merge.spec.ts
    - apps/nestjs-backend/src/features/external-connection/__tests__/introspection-statement-filter.spec.ts
    - apps/nestjs-backend/src/features/external-connection/__tests__/vector-sync.spec.ts
    - apps/nestjs-backend/e2e/external-db-connectors.e2e-spec.ts
  modified: []
decisions:
  - "Used subclass override pattern for DocSearchService to unit-test hybridSearch RRF math without Prisma or a real EmbeddingService"
  - "Passed a fake EmbeddingService to TestableDocSearchService to enable the external-search code path (embeddingService.generateEmbedding is called before externalSearch)"
  - "Live e2e skips gracefully via fixture-reachability pre-check so CI without Docker passes"
metrics:
  duration: "~15 minutes"
  completed: "2026-06-07"
  tasks: 2
  files: 5
---

# Phase 18 Plan 06: Wave 4 Verification Consolidation Summary

Cross-cutting unit coverage for the four risk-bearing behaviors in the external-connection feature; plus a live e2e harness that exercises both EXTDB success flows against the 18-00 fixtures.

## One-liner

54 new cross-cutting unit tests (22 SSRF, 5 RRF merge, 18 introspection+filter, 9 vector-sync) + graceful-skip live e2e for Qdrant + Postgres flows — full suite 174/174 green.

## Tasks Completed

### Task 1: Unit coverage — SSRF, RRF merge, introspection/statement-filter, sync (commit 122f0e4f9)

Four spec files created in `__tests__/`:

**ssrf-guard.integration.spec.ts** (22 tests):
- IP literal blocked ranges: loopback 127.x.x.x / ::1, RFC1918 10.x / 172.16-31.x / 192.168.x, IPv6 fc00::/7 + fd00::/7 + fe80::/10
- Cloud metadata IP 169.254.169.254 blocked with descriptive error
- DNS-rebinding: hostname resolving to private IP blocked; multi-address (any private) blocked
- Public hostname allowed (8.8.8.8)
- Allowlist: corp host with private IP allowed; non-allowlisted hostname rejected; IP literal still range-checked even if in allowlist
- SsrfBlockedError is instanceof Error, has correct .name, message contains host

**rrf-merge.spec.ts** (5 tests):
- External-only hit appears in hybridSearch fused output
- Shared chunk accumulates RRF score from both internal + external lists and ranks higher
- Empty qdrantConnections skips external path (internal-only results)
- RRF score math: 1/(K+rank+1) with K=60
- Results sorted descending, limited correctly

**introspection-statement-filter.spec.ts** (18 tests):
- PgIntrospectionService lists user tables with correct columns and PK flags
- All introspection SQL queries pass assertSelectOnly (SELECT-only path verified)
- Empty schema returns []
- Statement filter: passes SELECT, CTE-to-SELECT, multi-line JOIN; rejects INSERT/UPDATE/DELETE/DROP/ALTER/CREATE/TRUNCATE, multi-statement, CTE-to-INSERT/UPDATE/DELETE
- Cache hit skips re-querying; invalidate forces fresh queries (still all SELECT)

**vector-sync.spec.ts** (9 tests):
- enqueueUpsert: VECTOR_SYNC_JOB_UPSERT type, dedup jobId contains docId
- enqueueDelete: VECTOR_SYNC_JOB_DELETE type, dedup jobId contains docId
- enqueueBackfill: VECTOR_SYNC_JOB_BACKFILL type
- No-op when queue absent (all three methods)
- Swallows queue.add errors for upsert and delete (hot-path guard)
- Job options include retry attempts >= 1 and exponential backoff

**Full suite result:** 174/174 tests pass across 13 test files (120 pre-existing + 54 new)

### Task 2: Live e2e — both success flows (commit 7b3b99f56)

**e2e/external-db-connectors.e2e-spec.ts** created:

- **Fixture check**: API health + Qdrant health + env var presence. Skips entire suite with a clear message when any fixture is absent.
- **Flow 1 (Qdrant)**: POST /api/space/:id/external-connection → 201 with type=qdrant, enabled=true; SSRF test-connection to 169.254.169.254 → 400 with SSRF message; SSRF test-connection to localhost → 400 with loopback message.
- **Flow 2 (merged RAG)**: POST /api/space/:id/doc-search → 200/201 with array results (verifies no 5xx from external merge path).
- **Flow 3 (Postgres)**: POST external-connection → 201 type=postgres; GET tables → 200 with array; GET rows from first table → 200; POST /query with DELETE statement → 400 read-only message (T-18-06-T).
- Cleanup: DELETE all created connections in afterAll.

**Live run status**: Deferred — fixtures require 18-00 Docker Compose stack (Qdrant + external Postgres) and a running app. The spec skips cleanly in CI without Docker. Recorded in Known Deferred section below.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed DocSearchService subclass embeddingService requirement for external search path**
- **Found during:** Task 1, rrf-merge.spec.ts
- **Issue:** `hybridSearch` calls `this.embeddingService.generateEmbedding()` before delegating to `externalSearch`. Passing `null` as embeddingService caused the external search try/catch to swallow the error, returning [] instead of running the mocked external results.
- **Fix:** Passed a fake embeddingService object with a mocked `generateEmbedding` returning a 1536-dim vector to TestableDocSearchService.
- **Files modified:** `__tests__/rrf-merge.spec.ts`
- **Commit:** 122f0e4f9

**2. [Rule 3 - Blocking] Fixed relative import path in rrf-merge.spec.ts**
- **Found during:** Task 1, first test run
- **Issue:** Import `'../../../doc-search/search.service'` resolved to the wrong path from `external-connection/__tests__/`. Correct relative depth is `../../doc-search/search.service`.
- **Fix:** Updated import path.
- **Files modified:** `__tests__/rrf-merge.spec.ts`
- **Commit:** 122f0e4f9

## Known Deferred

### Live e2e Verification (Task 3 checkpoint)

The `checkpoint:human-verify` task (Task 3) requires the full 18-00 Docker Compose fixture stack (Qdrant + external Postgres) and the app running on port 3002. Per autonomous-mode execution rules, this is deferred for human verification:

1. Start the 18-00 fixtures: `docker-compose -f docker/18-00-fixtures.yml up -d`
2. Run the app: `pnpm dev` (API on :3002)
3. Set env vars: `E2E_SPACE_ID`, `E2E_API_TOKEN`
4. Run: `pnpm vitest run apps/nestjs-backend/e2e/external-db-connectors.e2e-spec.ts`
5. Record outcomes in `.planning/phases/18-external-db-connectors/18-06-LIVE-VERIFY.md`

The `18-06-LIVE-VERIFY.md` file is not created here — it requires live fixture observation.

## Test Suite Pass Count

```
Test Files  13 passed (13)
Tests       174 passed (174)
Duration    ~1s (unit only, no Docker)
```

Breakdown:
- Pre-existing specs: 120 tests (9 files)
- New cross-cutting specs: 54 tests (4 files in `__tests__/`)

## Threat Flags

None — no new network endpoints or auth paths introduced. Tests only exercise existing implementations.

## Self-Check: PASSED

Files created:
- `apps/nestjs-backend/src/features/external-connection/__tests__/ssrf-guard.integration.spec.ts` — FOUND
- `apps/nestjs-backend/src/features/external-connection/__tests__/rrf-merge.spec.ts` — FOUND
- `apps/nestjs-backend/src/features/external-connection/__tests__/introspection-statement-filter.spec.ts` — FOUND
- `apps/nestjs-backend/src/features/external-connection/__tests__/vector-sync.spec.ts` — FOUND
- `apps/nestjs-backend/e2e/external-db-connectors.e2e-spec.ts` — FOUND

Commits:
- 122f0e4f9 — FOUND (test(18-06): add cross-cutting unit coverage)
- 7b3b99f56 — FOUND (test(18-06): add live e2e spec for both EXTDB success flows)
