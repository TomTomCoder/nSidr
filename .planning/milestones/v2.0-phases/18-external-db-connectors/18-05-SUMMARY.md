---
phase: 18-external-db-connectors
plan: 18-05
subsystem: external-db-connectors
tags: [security, read-only, postgres, virtual-table, federated-query, nestjs, react]
dependency_graph:
  requires: [18-04]
  provides: [virtual-table-service, virtual-table-mapper, virtual-table-controller, external-table-ui]
  affects: []
tech_stack:
  added:
    - VirtualTableService (federated SELECT-only query-through, identifier validation, LIMIT/OFFSET pagination)
    - virtual-table-mapper (external Postgres type -> Teable field-shape mapping, 8 type categories)
    - VirtualTableController (read-only REST: list + paginated rows, space|read permission)
    - ExternalTableList + ExternalTableGrid (read-only React UI, no edit affordances)
  patterns:
    - Identifier injection prevention via introspected allowlist + double-quote escaping
    - MAX_PAGE_SIZE=100 guard (DoS mitigation T-18-05-D)
    - All queries route through ExternalPgConnectorService.query() (assertSelectOnly gate)
    - No registration in Teable table_meta / dbTableName (pure presentation layer)
key_files:
  created:
    - apps/nestjs-backend/src/features/external-connection/virtual-table/virtual-table-mapper.ts
    - apps/nestjs-backend/src/features/external-connection/virtual-table/virtual-table-mapper.spec.ts
    - apps/nestjs-backend/src/features/external-connection/virtual-table/virtual-table.service.ts
    - apps/nestjs-backend/src/features/external-connection/virtual-table/virtual-table.service.spec.ts
    - apps/nestjs-backend/src/features/external-connection/virtual-table/virtual-table.controller.ts
    - apps/nextjs-app/src/features/app/blocks/external-table/ExternalTableList.tsx
    - apps/nextjs-app/src/features/app/blocks/external-table/ExternalTableGrid.tsx
  modified:
    - apps/nestjs-backend/src/features/external-connection/external-connection.module.ts
decisions:
  - Virtual tables NOT registered in Teable table_meta/dbTableName (presentation-only, avoids write path)
  - MAX_PAGE_SIZE=100 enforced in service (not controller) so the limit cannot be bypassed
  - Table/schema validation against introspected set before quoting identifiers (defense-in-depth)
  - quoteIdent() applied after allowlist validation (belt-and-suspenders against identifier injection)
  - IVirtualTable.readOnly typed as literal `true` so TypeScript enforces read-only invariant at compile time
metrics:
  duration: "~20 minutes"
  completed: "2026-06-07"
  tasks_completed: 3
  files_changed: 8
---

# Phase 18 Plan 05: Virtual Table / Federated Query Summary

**One-liner:** Federated read-only access to external Postgres via introspection-validated SELECT query-through, with type-mapped virtual table descriptors and a no-edit React grid UI.

## What Was Built

### Task 1: External-type to Teable field-shape mapper + virtual table model

`virtual-table-mapper.ts` -- pure deterministic mapping from Postgres `data_type` strings to Teable display field types, plus a `buildVirtualTable()` descriptor builder.

- text / character varying / varchar / char -> `singleLineText`
- integer / int / bigint / numeric / decimal / real / double precision -> `number`
- boolean / bool -> `checkbox`
- timestamp* / date -> `date`
- json / jsonb -> `longText`
- all other types -> `singleLineText` fallback (uuid, inet, geometry, arrays, etc.)
- `IVirtualTable.readOnly` typed as literal `true` -- compile-time invariant
- `buildVirtualTable(connectionId, IExternalTable) -> IVirtualTable` -- maps all columns
- 25 spec cases green (RED: `2a522cab4`, GREEN: `8ee17bf6d`)

### Task 2: VirtualTableService query-through + read API

`virtual-table.service.ts` + `virtual-table.controller.ts` -- federated SELECT-only row access.

- `listVirtualTables(connectionId)` -- delegates to PgIntrospectionService, maps all tables to descriptors
- `getRows(spaceId, connectionId, schema, table, page, pageSize)`:
  - Validates pagination: page >= 1, 1 <= pageSize <= 100 (T-18-05-D)
  - Validates schema/table pair against introspected set -- rejects unknown identifiers (T-18-05-E)
  - Calls `connector.connect()` (idempotent), issues `SELECT * FROM "schema"."table" LIMIT N OFFSET M`
  - `quoteIdent()` double-quotes identifiers for defense-in-depth after allowlist check
  - All SQL routed through ExternalPgConnectorService.query() -> assertSelectOnly() gate
- Controller: two GET-only routes (`/virtual-table` list, `/:schema/:tableName/rows` paginated)
- No POST / PUT / PATCH / DELETE routes exist (T-18-05-T)
- Both routes scoped to `space|read` permission (T-18-05-I)
- ExternalConnectionModule updated to register new services and controllers
- 9 spec cases green (RED: `513f00f43`, GREEN: `e2c628d7a`)

### Task 3: Read-only external-table grid UI

`ExternalTableList.tsx` + `ExternalTableGrid.tsx` -- React client components.

- `ExternalTableList`: fetches virtual table list on demand, renders clickable table names with column count. No add/edit/delete buttons.
- `ExternalTableGrid`: fetches paginated rows, renders as HTML table with CellValue renderers per field type (singleLineText, number, checkbox, date, longText). LIMIT/OFFSET pagination via prev/next buttons. No edit-cell, add-row, or delete-row affordances anywhere.
- "Read-only / External" badge always visible on both views
- TypeScript: 0 errors in `external-table` files (tsc --noEmit)
- Commit: `6531b8c6b`

## Deviations from Plan

### Setup Deviation: Worktree Missing 18-04 Files

- Found during: pre-task setup
- Issue: Worktree was initialized at `e8771e192` (refactor/architecture-deep-fix) but the working tree was on main branch (`43f2e7e40`), which was ahead of the refactor branch. The 18-04 external-connection files were only in the refactor branch's merge commits.
- Fix: Ran `git merge refactor/architecture-deep-fix` (fast-forward) to bring all 18-04 files into the worktree. No content conflicts.
- Impact: No code changes; infrastructure only.

### Auto-fixed Issues

None beyond the worktree merge above. All three tasks executed per plan without code-level deviations.

## Live Connectivity Checkpoint (Deferred)

Docker is not available in the executor environment. Live end-to-end browsing of an actual external Postgres table was not verified. The `ExternalPrismaFactory` injection point (from 18-04) exists specifically for live integration testing.

Manual verification steps (when Docker available):
```bash
# Start external Postgres fixture
docker compose -f docker-compose.ext-pg.yml up -d

# Use the virtual table API
GET /api/space/:spaceId/external-connection/:connectionId/virtual-table
GET /api/space/:spaceId/external-connection/:connectionId/virtual-table/public/orders/rows?page=1&pageSize=20
```

## Known Stubs

None. All components fetch real data from the virtual-table API. No hardcoded placeholder data.

## Threat Flags

No new threat surface beyond the plan's declared threat model. All four STRIDE mitigations implemented:
- T-18-05-T: No write routes; VirtualTableController has GET-only routes; not registered in dbTableName/table_meta
- T-18-05-E: Table/schema names validated against introspected set before SQL construction; quoteIdent() applied
- T-18-05-I: Both controller routes gated by `space|read` permission
- T-18-05-D: MAX_PAGE_SIZE=100 enforced in VirtualTableService.getRows(); page and pageSize validated before any DB call

## Self-Check: PASSED

Files present:
- apps/nestjs-backend/src/features/external-connection/virtual-table/virtual-table-mapper.ts -- FOUND
- apps/nestjs-backend/src/features/external-connection/virtual-table/virtual-table-mapper.spec.ts -- FOUND
- apps/nestjs-backend/src/features/external-connection/virtual-table/virtual-table.service.ts -- FOUND
- apps/nestjs-backend/src/features/external-connection/virtual-table/virtual-table.service.spec.ts -- FOUND
- apps/nestjs-backend/src/features/external-connection/virtual-table/virtual-table.controller.ts -- FOUND
- apps/nextjs-app/src/features/app/blocks/external-table/ExternalTableList.tsx -- FOUND
- apps/nextjs-app/src/features/app/blocks/external-table/ExternalTableGrid.tsx -- FOUND

Commits present:
- 2a522cab4 (mapper RED) -- FOUND
- 8ee17bf6d (mapper GREEN) -- FOUND
- 513f00f43 (service RED) -- FOUND
- e2c628d7a (service GREEN) -- FOUND
- 6531b8c6b (UI feat) -- FOUND

Tests: 34/34 passing (25 mapper + 9 service); full suite 120/120 green
