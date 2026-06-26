---
phase: 01-authority-matrix
plan: "02"
subsystem: openapi
tags: [openapi, zod, axios, authority-matrix, rest]
dependency_graph:
  requires: []
  provides: [PHASE01-OPENAPI-SCHEMAS, PHASE01-OPENAPI-ROUTES, PHASE01-OPENAPI-AXIOS]
  affects: [packages/openapi/src/index.ts]
tech_stack:
  added: []
  patterns: [zod-schema-first, route-config, axios-wrapper, barrel-export]
key_files:
  created:
    - packages/openapi/src/authority-matrix/create.ts
    - packages/openapi/src/authority-matrix/get.ts
    - packages/openapi/src/authority-matrix/get-list.ts
    - packages/openapi/src/authority-matrix/update.ts
    - packages/openapi/src/authority-matrix/delete.ts
    - packages/openapi/src/authority-matrix/role-create.ts
    - packages/openapi/src/authority-matrix/role-update.ts
    - packages/openapi/src/authority-matrix/role-delete.ts
    - packages/openapi/src/authority-matrix/index.ts
  modified:
    - packages/openapi/src/index.ts
decisions:
  - "actions field kept as z.array(z.string()) — backend (Wave 2) must validate each value against Action enum from @teable/core and reject unknowns with 400 (T-02-01)"
  - "authorityMatrixRoleVoSchema and authorityMatrixVoSchema defined in get.ts and re-imported by get-list.ts and role-create.ts/role-update.ts to avoid duplication"
  - "update.ts defines its own updateAuthorityMatrixVoSchema (matrix without roles, plus lastModifiedTime/By) rather than re-using authorityMatrixVoSchema to avoid circular dependency and provide accurate Vo shape"
metrics:
  duration: "~10 minutes"
  completed: "2026-05-07"
  tasks_completed: 3
  files_created: 9
  files_modified: 1
---

# Phase 01 Plan 02: Authority Matrix OpenAPI Contract Summary

Zod Ro/Vo schemas, RouteConfig registrations, and axios wrapper functions for all 8 authority-matrix CRUD endpoints, published as named exports of `@teable/openapi`.

## Tasks Completed

| # | Task | Files | Status |
|---|------|-------|--------|
| 1 | Matrix-level endpoint files (create, get, get-list, update, delete) | 5 files | Done |
| 2 | Role-level endpoint files (role-create, role-update, role-delete) | 3 files | Done |
| 3 | Barrel index.ts + top-level re-export in packages/openapi/src/index.ts | 2 files | Done |

## Files Created

### packages/openapi/src/authority-matrix/create.ts
Key exports: `CREATE_AUTHORITY_MATRIX`, `createAuthorityMatrixRoSchema`, `ICreateAuthorityMatrixRo`, `createAuthorityMatrixVoSchema`, `ICreateAuthorityMatrixVo`, `CreateAuthorityMatrixRoute`, `createAuthorityMatrix`

### packages/openapi/src/authority-matrix/get.ts
Key exports: `GET_AUTHORITY_MATRIX`, `authorityMatrixRoleVoSchema`, `IAuthorityMatrixRoleVo`, `authorityMatrixVoSchema`, `IAuthorityMatrixVo`, `GetAuthorityMatrixRoute`, `getAuthorityMatrix`

### packages/openapi/src/authority-matrix/get-list.ts
Key exports: `GET_AUTHORITY_MATRIX_LIST`, `getAuthorityMatrixListVoSchema`, `IGetAuthorityMatrixListVo`, `GetAuthorityMatrixListRoute`, `getAuthorityMatrixList`

### packages/openapi/src/authority-matrix/update.ts
Key exports: `UPDATE_AUTHORITY_MATRIX`, `updateAuthorityMatrixRoSchema`, `IUpdateAuthorityMatrixRo`, `updateAuthorityMatrixVoSchema`, `IUpdateAuthorityMatrixVo`, `UpdateAuthorityMatrixRoute`, `updateAuthorityMatrix`

### packages/openapi/src/authority-matrix/delete.ts
Key exports: `DELETE_AUTHORITY_MATRIX`, `DeleteAuthorityMatrixRoute`, `deleteAuthorityMatrix`

### packages/openapi/src/authority-matrix/role-create.ts
Key exports: `CREATE_AUTHORITY_MATRIX_ROLE`, `createAuthorityMatrixRoleRoSchema`, `ICreateAuthorityMatrixRoleRo`, `ICreateAuthorityMatrixRoleVo`, `CreateAuthorityMatrixRoleRoute`, `createAuthorityMatrixRole`

### packages/openapi/src/authority-matrix/role-update.ts
Key exports: `UPDATE_AUTHORITY_MATRIX_ROLE`, `updateAuthorityMatrixRoleRoSchema`, `IUpdateAuthorityMatrixRoleRo`, `IUpdateAuthorityMatrixRoleVo`, `UpdateAuthorityMatrixRoleRoute`, `updateAuthorityMatrixRole`

### packages/openapi/src/authority-matrix/role-delete.ts
Key exports: `DELETE_AUTHORITY_MATRIX_ROLE`, `DeleteAuthorityMatrixRoleRoute`, `deleteAuthorityMatrixRole`

### packages/openapi/src/authority-matrix/index.ts
Re-exports all 8 endpoint files via `export * from './...'`.

## Files Modified

### packages/openapi/src/index.ts
Added `export * from './authority-matrix';` after `export * from './auth';` (alphabetical order).

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. All schemas define concrete types. No placeholder data or hardcoded empty values that flow to UI rendering.

## Threat Flags

No new security surface beyond what the plan's threat model covers. All T-02-0x entries are addressed:
- T-02-01: `actions` kept as `z.array(z.string())` with comment in role-create.ts directing backend to validate against Action enum
- T-02-03: All `name` fields constrained to `.min(1).max(255)`, `description` to `.max(1000)`

## Self-Check: PASSED

All 9 files exist under `packages/openapi/src/authority-matrix/`.
`packages/openapi/src/index.ts` line 15: `export * from './authority-matrix';`
