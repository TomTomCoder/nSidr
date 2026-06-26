---
phase: 01-authority-matrix
plan: "03"
subsystem: nestjs-backend
tags: [nestjs, prisma, rest-api, authority-matrix, permissions]
dependency_graph:
  requires: [PHASE01-DB-SCHEMA, PHASE01-OPENAPI-SCHEMAS]
  provides: [PHASE01-BACKEND-SERVICE, PHASE01-BACKEND-CONTROLLER, PHASE01-BACKEND-MODULE, PHASE01-BACKEND-REGISTRATION]
  affects:
    - apps/nestjs-backend/src/app.module.ts
tech_stack:
  added: []
  patterns: [nestjs-feature-module, prisma-txclient, cls-user-context, zod-validation-pipe, permissions-guard, resource-meta-guard]
key_files:
  created:
    - apps/nestjs-backend/src/features/authority-matrix/authority-matrix.service.ts
    - apps/nestjs-backend/src/features/authority-matrix/authority-matrix.controller.ts
    - apps/nestjs-backend/src/features/authority-matrix/authority-matrix.module.ts
  modified:
    - apps/nestjs-backend/src/app.module.ts
decisions:
  - "AuthorityMatrixModule has no extra imports array — PrismaService is globally provided via GlobalModule (same pattern as CollaboratorModule)"
  - "toMatrixVo / toRoleVo private helpers use 'any' type for Prisma row objects to avoid importing generated Prisma types directly; ESLint disable comments added inline"
  - "getByFieldReference stub returns [] — field-level restriction deferred to future phase per CONTEXT.md"
  - "AuthorityMatrixModule added to appModules.imports alphabetically after AiModule (before AttachmentsModule in import block; after AiModule in array)"
metrics:
  duration: "~15 minutes"
  completed: "2026-05-07"
  tasks_completed: 3
  files_created: 3
  files_modified: 1
---

# Phase 01 Plan 03: NestJS Backend Feature Module Summary

NestJS service, controller, and module for Authority Matrix CRUD, with 8 REST endpoints enforcing `base|authority_matrix_config` permission, IDOR guards, action validation, and Prisma persistence via `txClient()`.

## Tasks Completed

| # | Task | Files | Status |
|---|------|-------|--------|
| 1 | AuthorityMatrixService with CRUD + validation | authority-matrix.service.ts | Done |
| 2 | AuthorityMatrixController with 8 endpoints | authority-matrix.controller.ts | Done |
| 3 | Module wrapper + app.module.ts registration | authority-matrix.module.ts, app.module.ts | Done |

## Endpoint Table

| Method | Path | Permission | Notes |
|--------|------|------------|-------|
| GET | /api/base/:baseId/authority-matrix | base\|authority_matrix_config | Returns `{ list: IAuthorityMatrixVo[] }` |
| GET | /api/base/:baseId/authority-matrix/:matrixId | base\|authority_matrix_config | Returns matrix with nested roles |
| POST | /api/base/:baseId/authority-matrix | base\|authority_matrix_config | Creates matrix; id prefixed `aut` |
| PATCH | /api/base/:baseId/authority-matrix/:matrixId | base\|authority_matrix_config | IDOR-guarded update |
| DELETE | /api/base/:baseId/authority-matrix/:matrixId | base\|authority_matrix_config | 204; cascades to roles |
| POST | /api/base/:baseId/authority-matrix/:matrixId/role | base\|authority_matrix_config | Creates role; id prefixed `aur` |
| PATCH | /api/base/:baseId/authority-matrix/:matrixId/role/:roleId | base\|authority_matrix_config | IDOR-guarded update |
| DELETE | /api/base/:baseId/authority-matrix/:matrixId/role/:roleId | base\|authority_matrix_config | 204 |

All 8 endpoints decorated with `@Permissions('base|authority_matrix_config')` + `@ResourceMeta('baseId', 'params')`.

## Security Guards Implemented

### validateActions(actions: string[])
Cross-references each value against `Object.values(Action)` from `@teable/core`. Throws `BadRequestException` (400) for any unknown values. Called in `createRole` and `updateRole`.

### assertMatrixInBase(baseId, matrixId)
Verifies the matrix belongs to the given base before any mutation. Returns `NotFoundException` (404) if not found — same message whether matrix belongs to another base or doesn't exist at all (T-03-05: prevents existence leakage).

### assertRoleInMatrix(matrixId, roleId)
Verifies the role belongs to the given matrix before any mutation. Returns `NotFoundException` (404).

### createdBy / lastModifiedBy
Read exclusively from `ClsService` (authenticated session), never from request body (T-03-06).

## Files Created

### apps/nestjs-backend/src/features/authority-matrix/authority-matrix.service.ts
Injectable service. Injects `PrismaService` and `ClsService<IClsStore>`. Methods: `list`, `get`, `create`, `update`, `delete`, `createRole`, `updateRole`, `deleteRole`, `getByFieldReference` (stub), plus private helpers `validateActions`, `assertMatrixInBase`, `assertRoleInMatrix`, `toMatrixVo`, `toRoleVo`.

Uses `prismaService.txClient().authorityMatrix` and `prismaService.txClient().authorityMatrixRole` throughout.

### apps/nestjs-backend/src/features/authority-matrix/authority-matrix.controller.ts
`@Controller('api/base/')`. 8 methods each decorated with `@Permissions` + `@ResourceMeta`. DELETE endpoints use `@HttpCode(204)`. Body validation via `ZodValidationPipe` (imported from `../../zod.validation.pipe`).

### apps/nestjs-backend/src/features/authority-matrix/authority-matrix.module.ts
Standard `@Module({ providers: [AuthorityMatrixService], controllers: [AuthorityMatrixController], exports: [AuthorityMatrixService] })`.

## Files Modified

### apps/nestjs-backend/src/app.module.ts
- Added import: `import { AuthorityMatrixModule } from './features/authority-matrix/authority-matrix.module';`
- Added `AuthorityMatrixModule` to `appModules.imports` array (after `AiModule`, before `PluginModule`)

## Deviations from Plan

None — plan executed exactly as written. Import paths, DI patterns, and module structure match the collaborator/base canonical references.

## Known Stubs

| Stub | File | Line | Reason |
|------|------|------|--------|
| `getByFieldReference` returns `[]` | authority-matrix.service.ts | ~155 | Field-level restrictions deferred to future phase per CONTEXT.md. Integration point exists for field module to call. |

## Threat Flags

No new security surface beyond the plan's threat model. All T-03-0x mitigations implemented:
- T-03-01: 8x `@Permissions` + 8x `@ResourceMeta` decorators
- T-03-02: `assertMatrixInBase` + `assertRoleInMatrix` on all mutations
- T-03-03: `ZodValidationPipe` on all body-accepting endpoints
- T-03-04: `validateActions` in `createRole` / `updateRole`
- T-03-05: NotFoundException uses identical message for wrong-base vs not-found
- T-03-06: `getUserId()` reads from ClsService only
- T-03-07: Accepted (no pagination on list)

## Self-Check

Files created:
- apps/nestjs-backend/src/features/authority-matrix/authority-matrix.service.ts — CREATED
- apps/nestjs-backend/src/features/authority-matrix/authority-matrix.controller.ts — CREATED
- apps/nestjs-backend/src/features/authority-matrix/authority-matrix.module.ts — CREATED

app.module.ts contains:
- `import { AuthorityMatrixModule } from './features/authority-matrix/authority-matrix.module';` — ADDED
- `AuthorityMatrixModule` in imports array — ADDED

## Self-Check: PASSED
