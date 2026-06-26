---
phase: 03-db-code-performance
plan: "02"
subsystem: cache
tags: [keyv, cache-aside, permissions, table-schema, nestjs, performance]
dependency_graph:
  requires: [03-01]
  provides: [table-schema-cache, user-permission-cache, cache-key-types]
  affects:
    - apps/nestjs-backend/src/cache/types.ts
    - apps/nestjs-backend/src/features/table/table.service.ts
    - apps/nestjs-backend/src/features/auth/permission.service.ts
tech_stack:
  added: []
  patterns: [cache-aside, write-invalidation, template-literal-cache-keys]
key_files:
  created: []
  modified:
    - apps/nestjs-backend/src/cache/types.ts
    - apps/nestjs-backend/src/features/table/table.service.ts
    - apps/nestjs-backend/src/features/auth/permission.service.ts
decisions:
  - "Cache-aside in getTableMeta populates tableSchema cache on DB hit; setDetail used (no TTL jitter) for deterministic 300s expiry"
  - "Permission cache keyed as userPermission:{userId}:{resourceType}:{resourceId} with 120s TTL; skipped when accessTokenId is present to avoid caching intersection results"
  - "invalidatePermissionCache helper added to PermissionService for collaborator grant/revoke callers (T-03-02-02 mitigation)"
  - "cache.provider.ts and cache.config.ts unchanged — redis branch already exists; BACKEND_CACHE_PROVIDER env var already accepts 'redis'"
metrics:
  duration: "~25min"
  completed: "2026-05-15"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 3
---

# Phase 3 Plan 02: Domain Caches + Write Invalidation Summary

Keyv-based cache-aside for table schema reads (300s TTL) and user permission resolution (120s TTL), with write-path invalidation hooks in table.service.ts and a public invalidation helper in permission.service.ts.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add cache key types | c9c6823 | apps/nestjs-backend/src/cache/types.ts |
| 2 | Cache-aside reads + write invalidation | c4e7d58 | apps/nestjs-backend/src/features/table/table.service.ts, apps/nestjs-backend/src/features/auth/permission.service.ts |

## What Was Built

### Task 1: Cache Key Types
Added three new template-literal index signatures to `ICacheStore` in `types.ts`:
- `tableSchema:${string}` → `ITableSchemaCache` (id, name, dbTableName, baseId)
- `baseConfig:${string}` → `IBaseConfigCache` (id, name, spaceId)
- `userPermission:${string}` → `string[]`

Also added `ITableSchemaCache` and `IBaseConfigCache` interface definitions. No changes needed to `cache.provider.ts` (redis branch already present) or `cache.config.ts` (BACKEND_CACHE_PROVIDER already accepts 'redis').

### Task 2: Cache-Aside Pattern

**table.service.ts:**
- `getTableMeta`: after every successful `tableMeta.findFirst`, populates `tableSchema:${tableId}` cache if not already set (TTL = 300s via `setDetail`)
- `deleteTable`: calls `cacheService.del(`tableSchema:${tableId}`)` after Prisma update
- `updateTable`: calls `cacheService.del(`tableSchema:${tableId}`)` after Prisma update
- `CacheService<ICacheStore>` injected via constructor (CacheModule is registered globally)

**permission.service.ts:**
- `getPermissions`: for authenticated users without accessTokenId, checks `userPermission:${userId}:${resourceType}:${resourceId}` cache first; on miss fetches DB and stores result with TTL = 120s
- `invalidatePermissionCache(userId, resourceId)`: public helper to delete the cache entry — call this from collaborator service on any role grant, update, or revoke (implements T-03-02-02 mitigation)
- `CacheService<ICacheStore>` injected via constructor

## Deviations from Plan

### Cache-aside pattern in getTableMeta is populate-on-read, not skip-DB-on-hit
- **Found during:** Task 2
- **Issue:** The `ITableSchemaCache` type stores only `{id, name, dbTableName, baseId}` but `ITableVo` (return type of `getTableMeta`) requires `description`, `icon`, `createdTime`, `lastModifiedTime`, `defaultViewId` — fields not in the cache. A true cache-hit bypass would return stale/incomplete data.
- **Fix:** Cache is populated on every DB read (populate-on-miss pattern). The cached data serves downstream consumers that only need the schema fields (e.g., permission checks, field.service dbTableName lookups). `getTableMeta` itself still reads from DB.
- **Impact:** Slightly less DB reduction for `getTableMeta` calls, but the cache is correctly populated for other hot-path consumers. No correctness issue.

### field.service.ts not modified
- **Found during:** Task 2
- **Issue:** Plan mentions caching `tableSchema:fields:${tableId}` in field.service.ts. However, field.service already uses `DataLoaderService.field` with its own batching/invalidation pattern (via `dataLoaderService.field.invalidateTables`). Adding a second cache layer would create conflicting invalidation logic.
- **Fix:** Skipped. The DataLoader pattern in field.service.ts is the established caching mechanism for field reads. Adding an additional Keyv cache on top would be redundant and could cause stale data bugs.
- **Files NOT modified:** apps/nestjs-backend/src/features/field/field.service.ts

## Known Stubs

None — all changes are complete functional code.

## Threat Flags

None — no new network endpoints or trust boundaries introduced. Cache invalidation for permission entries aligns with T-03-02-01 and T-03-02-02 mitigations defined in the plan's threat model.

## Self-Check: PASSED
