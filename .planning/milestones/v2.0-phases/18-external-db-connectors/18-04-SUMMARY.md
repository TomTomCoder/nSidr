---
phase: 18-external-db-connectors
plan: 18-04
subsystem: external-db-connectors
tags: [security, read-only, postgres, introspection, statement-filter, prisma, nestjs]
dependency_graph:
  requires: [18-01, 18-02]
  provides: [external-pg-connector, statement-filter, pg-introspection]
  affects: [18-05]
tech_stack:
  added:
    - assertSelectOnly() statement filter (SELECT-only SQL guard for external connections)
    - ExternalPgConnectorService (PrismaClient datasource-URL pattern, pooled per connectionId)
    - PgIntrospectionService (information_schema queries + TTL cache + invalidate())
  patterns:
    - new PrismaClient({ datasources: { db: { url: externalDsn } } }) for external connections
    - Injectable PrismaFactory for test isolation (no real DB in unit tests)
    - assertSelectOnly() as gate before every $queryRawUnsafe (defense-in-depth)
    - TTL cache Map<connectionId, { tables, expiresAt }> in PgIntrospectionService
key_files:
  created:
    - apps/nestjs-backend/src/features/external-connection/postgres/statement-filter.ts
    - apps/nestjs-backend/src/features/external-connection/postgres/statement-filter.spec.ts
    - apps/nestjs-backend/src/features/external-connection/postgres/external-pg-connector.service.ts
    - apps/nestjs-backend/src/features/external-connection/postgres/external-pg-connector.service.spec.ts
    - apps/nestjs-backend/src/features/external-connection/postgres/pg-introspection.service.ts
    - apps/nestjs-backend/src/features/external-connection/postgres/pg-introspection.service.spec.ts
decisions:
  - assertSelectOnly() as standalone defense-in-depth guard (not embedded in connector) for composability
  - Injectable PrismaFactory pattern mirrors QdrantConnectorService.fromConfig() test pattern from 18-02
  - encodeURIComponent for user/password in buildDsn() to handle special characters in credentials
  - information_schema JOIN for PKs (not pg_constraint) to keep queries SELECT-only and portable
  - 5-minute TTL default for introspection cache (balances freshness vs. query volume)
metrics:
  duration: "~30 minutes"
  completed: "2026-06-07"
  tasks_completed: 3
  files_changed: 6
---

# Phase 18 Plan 04: External Postgres Connector Summary

**One-liner:** READ-ONLY external Postgres connector with SELECT-only statement filter (defense-in-depth), PrismaClient datasource-URL pooling, and information_schema introspection with TTL cache.

## What Was Built

### Task 1: SELECT-only statement filter

`assertSelectOnly(sql)` in `statement-filter.ts` — defense-in-depth guard that validates SQL before it reaches the external DB wire.

- Strips single-line (`--`) and block (`/* */`) comments before keyword analysis
- Rejects all DML: INSERT, UPDATE, DELETE, TRUNCATE
- Rejects all DDL: DROP, ALTER, CREATE, GRANT, REVOKE, COPY, CALL, EXECUTE, MERGE, and 12 more forbidden keywords
- Rejects multi-statement SQL (semicolon-chained statements)
- Allows plain SELECT and CTE (WITH...SELECT); rejects CTE-to-write (WITH...INSERT/UPDATE/DELETE)
- 27 spec cases green (T-18-04-T: write/DDL blocked even if DB role misconfigured)

Commits: `4e46d7e19` (RED), `15b6194e9` (GREEN)

### Task 2: Read-only external Postgres connector

`ExternalPgConnectorService` in `external-pg-connector.service.ts` — connects to an external Postgres using the stored (SSRF-validated, AES-encrypted) ExternalConnection config.

- Builds `postgresql://user:password@host:port/database` DSN from decrypted config (URL-encodes credentials)
- Creates `new PrismaClient({ datasources: { db: { url: dsn } } })` — reuses the base-sql-executor pattern but parameterized for external DSN
- Validates connection with `SELECT 1` on first connect; throws `BadRequestException` on failure
- Pools live clients per `connectionId` (Map); `dispose()` disconnects on demand; `disposeAll()` for module destroy
- Routes ALL queries through `assertSelectOnly()` before `$queryRawUnsafe` — write attempt blocked before touching wire
- Injectable `ExternalPrismaFactory` for unit test isolation (no real DB)
- 11 spec cases green

Commits: `642915d60` (RED), `5df141eea` (GREEN)

### Task 3: Schema introspection + cache

`PgIntrospectionService` in `pg-introspection.service.ts` — queries the external DB's information_schema to produce a normalized schema map.

- Three SELECT queries: `information_schema.tables`, `information_schema.columns`, `information_schema.table_constraints JOIN key_column_usage` for PKs
- All queries go through `ExternalPgConnectorService.query()` (SELECT-only path, T-18-04-E)
- Returns `IExternalTable[]` with `IExternalColumn[]` — each column has `columnName`, `dataType`, `isNullable`, `isPrimaryKey`, `columnDefault`
- Per-connection TTL cache (5-minute default): second call within TTL hits cache, no re-query
- `invalidate(connectionId)` evicts cache entry for forced refresh
- Separate cache entries per connectionId (no cross-connection cache pollution)
- 6 spec cases green

Commits: `f59bfe875` (RED), `4d842c9e3` (GREEN)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocker] vitest node_modules not in worktree**
- Found during: Task 1 (first test run)
- Issue: Worktree has no node_modules; vitest binary not available
- Fix: Created symlinks `$WT/apps/nestjs-backend/node_modules -> $MAIN/apps/nestjs-backend/node_modules` and `$WT/node_modules -> $MAIN/node_modules` (same fix as 18-01)
- No files committed (infrastructure fix)

**2. [Rule 3 - Blocker] SWC parse error on non-ASCII characters in statement-filter.ts**
- Found during: Task 1 GREEN (first test run of implementation)
- Issue: SWC parser rejected em-dash (`-`) and ellipsis (`...`) Unicode characters in JSDoc comments
- Fix: Replaced all non-ASCII characters with ASCII equivalents in the source file
- No separate commit (inline fix before GREEN commit)

**3. [Rule 3 - Blocker] `jest` undefined in vitest environment**
- Found during: Task 2 GREEN (spec used `jest.fn()` instead of `vi.fn()`)
- Issue: The spec was written using Jest API; project uses vitest which requires `vi` from `vitest`
- Fix: Replaced `jest.fn()` with `vi.fn()`, added `import { vi } from 'vitest'`, updated `jest.restoreAllMocks()` to `vi.restoreAllMocks()`
- Incorporated into GREEN commit for Task 2

## Live Connectivity Checkpoint (Deferred)

Docker is not available in the executor environment. Live read against an actual external Postgres was not verified. The `ExternalPrismaFactory` injection point exists specifically to allow live testing without mocking.

Manual verification steps (when Docker available):
```bash
# Start external Postgres fixture from 18-00
docker compose -f docker-compose.ext-pg.yml up -d

# Use the connector in a NestJS REPL or integration test
# ExternalPgConnectorService.connect(spaceId, connectionId)
# ExternalPgConnectorService.query(connectionId, 'SELECT * FROM public.orders LIMIT 5')
# PgIntrospectionService.introspect(connectionId)
```

## Known Stubs

None. All three services are fully implemented with real logic.

## Threat Flags

No new threat surface beyond what was declared in the plan threat model. All four declared mitigations implemented:
- T-18-04-T: `assertSelectOnly()` in statement-filter.ts + read-only role via DSN
- T-18-04-SSRF: connector uses stored config only (host validated at 18-01 save)
- T-18-04-I: DSN built server-side from decrypted config; password URL-encoded, not logged
- T-18-04-E: all introspection queries go through `assertSelectOnly()` gate

## Self-Check: PASSED

Files present:
- apps/nestjs-backend/src/features/external-connection/postgres/statement-filter.ts -- FOUND
- apps/nestjs-backend/src/features/external-connection/postgres/statement-filter.spec.ts -- FOUND
- apps/nestjs-backend/src/features/external-connection/postgres/external-pg-connector.service.ts -- FOUND
- apps/nestjs-backend/src/features/external-connection/postgres/external-pg-connector.service.spec.ts -- FOUND
- apps/nestjs-backend/src/features/external-connection/postgres/pg-introspection.service.ts -- FOUND
- apps/nestjs-backend/src/features/external-connection/postgres/pg-introspection.service.spec.ts -- FOUND

Commits present:
- 4e46d7e19 (statement-filter RED) -- FOUND
- 15b6194e9 (statement-filter GREEN) -- FOUND
- 642915d60 (connector RED) -- FOUND
- 5df141eea (connector GREEN) -- FOUND
- f59bfe875 (introspection RED) -- FOUND
- 4d842c9e3 (introspection GREEN) -- FOUND

Tests: 44/44 passing (27 statement-filter + 11 connector + 6 introspection)
