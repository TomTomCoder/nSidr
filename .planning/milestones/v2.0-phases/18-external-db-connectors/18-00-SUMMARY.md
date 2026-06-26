---
phase: 18-external-db-connectors
plan: 18-00
subsystem: external-db-connectors
tags: [process-gate, verification, docker, qdrant, postgres, encryption]
dependency_graph:
  requires: []
  provides: [18-00-VERIFY.md, docker-compose.qdrant.yml, docker-compose.ext-pg.yml]
  affects: [18-01, 18-02, 18-03, 18-04, 18-05]
tech_stack:
  added: []
  patterns: [static-code-inspection, docker-compose-fixtures]
key_files:
  created:
    - docker-compose.qdrant.yml
    - docker-compose.ext-pg.yml
    - scripts/ext-pg-seed.sql
    - .planning/phases/18-external-db-connectors/18-00-VERIFY.md
  modified: []
decisions:
  - "createConnection() is internal-DSN-only; 18-04 must write standalone createExternalConnection(dsn: string)"
  - "Encryptor round-trip confirmed; 18-03 must use random IV per record (not static IV) to prevent IV-reuse attacks"
  - "RRF hybridSearch K=60 pattern confirmed reusable for Qdrant result merge in 18-02"
metrics:
  duration: "~25 minutes"
  completed_date: "2026-06-07"
  tasks_completed: 2
  files_created: 4
---

# Phase 18 Plan 00: Wave-0 Process Gate Summary

**One-liner:** Static code inspection confirmed all three reuse assumptions with one critical caveat for 18-04; Qdrant + ext-Postgres docker fixtures created.

## Assumptions Verified

### Assumption 1: createConnection builds a PrismaClient at runtime
**CONFIRMED — with caveat.**
`BaseSqlExecutorService.createConnection()` (`base-sql-executor.service.ts:109-146`) correctly
instantiates `new PrismaClient({ datasources: { db: { url } } })` and validates with `SELECT 1`.

CRITICAL: `getReadOnlyDatabaseConnectionConfig()` (line 44-88) always derives the DSN from
Teable's internal database. **18-04 must NOT call `createConnection()`.** It must extract the
PrismaClient pattern into a standalone `createExternalConnection(dsn: string)` helper that accepts
a caller-supplied DSN.

### Assumption 2: Encryptor/getEncryptor round-trips with INTEGRATION_SECRET_KEY
**CONFIRMED.**
`Encryptor<T>` (`utils/encryptor.ts:10-41`) uses `crypto.createCipheriv/createDecipheriv` with
JSON serialize/deserialize. `getEncryptor<T>()` (line 43) is the factory.

Production usage in `oauth-integration/token.service.ts` (lines 5-19) shows AES-256-CBC with
`key = Buffer.from(INTEGRATION_SECRET_KEY.slice(0, 32), 'utf8')` and a **random IV per call**.
18-03 must follow the same random-IV approach (not the static-IV `Encryptor` constructor pattern)
to prevent IV-reuse attacks when encrypting many credentials under the same key.

### Assumption 3: Local Qdrant + external Postgres reachable for the build
**FIXTURES CREATED — live verification requires human `docker compose up`.**
- `docker-compose.qdrant.yml`: qdrant/qdrant:v1.9.4, REST :6333, gRPC :6334
- `docker-compose.ext-pg.yml`: postgres:16.3, host port :5433, extdb/extuser/extpass
- `scripts/ext-pg-seed.sql`: schema `sales`, tables `customers` + `orders`, 7 seed rows

Docker was not available in the executor environment; compose file syntax is correct but the
human checkpoint (Task 3) must bring them up and verify connectivity.

### Bonus finding: RRF hybridSearch
**CONFIRMED.**
`DocSearchService.hybridSearch()` (`search.service.ts:171-222`) performs RRF fusion at K=60.
The fusion loop is self-contained and scale-free — 18-02 can inject Qdrant results before the
sort step without changing K.

## Commits

| Task | Commit | Files |
|------|--------|-------|
| Task 1: Docker fixtures | 15d2aff90 | docker-compose.qdrant.yml, docker-compose.ext-pg.yml, scripts/ext-pg-seed.sql |
| Task 2: VERIFY.md | da7f87a12 | .planning/phases/18-external-db-connectors/18-00-VERIFY.md |

## Deviations from Plan

### Auto-fixed Issues

None.

### Process deviations

**[Rule 3 — Blocking] Worktree was at wrong base commit.**
The worktree HEAD was at 43f2e7e (an older branch), while the orchestrator specified base
2c804a0. Applied `git reset --hard 2c804a0` per `<worktree_branch_check>` instructions before
execution. No work lost — the worktree branch had no prior commits.

**[Environmental] Docker not available in executor shell.**
`docker compose config` validation was skipped. Compose files are syntactically correct (verified
by content review). Human checkpoint Task 3 must validate live connectivity.

## Key Downstream Guidance

| Plan | Action |
|------|--------|
| 18-01 | Qdrant REST :6333; collection dimension must be 1536 (matches internal pgvector) |
| 18-02 | Inject Qdrant results before RRF sort in hybridSearch — no K change needed |
| 18-03 | Use random IV per encrypted record; key = INTEGRATION_SECRET_KEY sliced to 32 bytes |
| 18-04 | Write `createExternalConnection(dsn: string)` — do NOT reuse `BaseSqlExecutorService.createConnection()` |
| 18-05 | Introspection target: schema `sales`, tables `customers`/`orders` in ext-pg fixture |

## Threat Surface Scan

No new network endpoints, auth paths, or schema changes introduced. The docker fixtures are
local-only (threat model T-18-00-I/SC accepted per plan).

## Self-Check: PASSED

- [x] `docker-compose.qdrant.yml` exists at worktree root
- [x] `docker-compose.ext-pg.yml` exists at worktree root
- [x] `scripts/ext-pg-seed.sql` exists
- [x] `.planning/phases/18-external-db-connectors/18-00-VERIFY.md` exists
- [x] Commit 15d2aff90 exists (Task 1)
- [x] Commit da7f87a12 exists (Task 2)
