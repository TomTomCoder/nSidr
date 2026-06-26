# PRD — Phase 1: Authority Matrix + AI Interface

**Date:** 2026-05-07  
**Phase:** 1  
**Edition target:** EE self-hosted (NEXT_BUILD_ENV_EDITION=EE)

---

## Objectives

1. **Authority Matrix** — Full implementation: Prisma migration + NestJS CRUD API + Next.js management UI
2. **AI Interface** — Verify and document that the AI interface is active and accessible in EE mode

---

## Context & Existing Infrastructure

### Already in place (do NOT recreate)
- `generateAuthorityMatrixId()` (prefix `aut`) and `generateAuthorityMatrixRoleId()` (prefix `aur`) in `packages/core/src/utils/id-generator.ts`
- Permission action `'base|authority_matrix_config'` — enabled for Owner and Creator roles only (`packages/core/src/auth/role/constant.ts`)
- Nav link at `/base/${baseId}/authority-matrix` in `BasePageRouter.tsx` — already gated by `base|authority_matrix_config` + `UpgradeWrapper` (BillingProductLevel.Business)
- Page route + SSR: `apps/nextjs-app/src/pages/base/[baseId]/authority-matrix.tsx` with BaseLayout already wired
- UI stub to replace: `apps/nextjs-app/src/features/app/blocks/AuthorityMatrix.tsx`
- Billing gate is bypassed: usage controller returns `BillingProductLevel.Enterprise` for all endpoints
- `NEXT_BUILD_ENV_EDITION=EE` already set in `apps/nextjs-app/.env.development`
- `fieldDeleteRefAuthorityMatrixSchema` in `packages/openapi/src/field/get-delete-references.ts` — backend must query `authority_matrix_role` when a field is deleted

### Does NOT exist yet
- DB tables: `authority_matrix`, `authority_matrix_role`
- Prisma schema models + migration SQL
- OpenAPI route definitions + Zod schemas in `packages/openapi/src/authority-matrix/`
- NestJS service + controller + module
- Real React UI for authority matrix management

---

## Part 1 — Authority Matrix

### 1.1 Data Model

#### Prisma Schema additions (`packages/db-main-prisma/prisma/postgres/schema.prisma`)

```prisma
model AuthorityMatrix {
  id               String              @id
  baseId           String              @map("base_id")
  name             String
  description      String?
  createdTime      DateTime            @default(now()) @map("created_time")
  createdBy        String              @map("created_by")
  lastModifiedTime DateTime?           @updatedAt @map("last_modified_time")
  lastModifiedBy   String?             @map("last_modified_by")

  base             Base                @relation(fields: [baseId], references: [id])
  roles            AuthorityMatrixRole[]

  @@index([baseId])
  @@map("authority_matrix")
}

model AuthorityMatrixRole {
  id                String    @id
  authorityMatrixId String    @map("authority_matrix_id")
  name              String
  actions           Json      @map("actions")
  createdTime       DateTime  @default(now()) @map("created_time")
  createdBy         String    @map("created_by")
  lastModifiedTime  DateTime? @updatedAt @map("last_modified_time")
  lastModifiedBy    String?   @map("last_modified_by")

  authorityMatrix   AuthorityMatrix @relation(fields: [authorityMatrixId], references: [id], onDelete: Cascade)

  @@index([authorityMatrixId])
  @@map("authority_matrix_role")
}
```

Add back-relation on `Base` model:
```prisma
authorityMatrices AuthorityMatrix[]
```

#### Migration file

Path: `packages/db-main-prisma/prisma/postgres/migrations/20260507000000_add_authority_matrix/migration.sql`

```sql
CREATE TABLE "authority_matrix" (
  "id" TEXT NOT NULL,
  "base_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "created_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by" TEXT NOT NULL,
  "last_modified_time" TIMESTAMP(3),
  "last_modified_by" TEXT,
  CONSTRAINT "authority_matrix_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "authority_matrix_role" (
  "id" TEXT NOT NULL,
  "authority_matrix_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "actions" JSONB NOT NULL,
  "created_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by" TEXT NOT NULL,
  "last_modified_time" TIMESTAMP(3),
  "last_modified_by" TEXT,
  CONSTRAINT "authority_matrix_role_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "authority_matrix"
  ADD CONSTRAINT "authority_matrix_base_id_fkey"
  FOREIGN KEY ("base_id") REFERENCES "base"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "authority_matrix_role"
  ADD CONSTRAINT "authority_matrix_role_authority_matrix_id_fkey"
  FOREIGN KEY ("authority_matrix_id") REFERENCES "authority_matrix"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "authority_matrix_base_id_idx" ON "authority_matrix"("base_id");
CREATE INDEX "authority_matrix_role_authority_matrix_id_idx" ON "authority_matrix_role"("authority_matrix_id");
```

### 1.2 OpenAPI Package (`packages/openapi/src/authority-matrix/`)

Create the directory with the following files:

**`create.ts`** — POST `/base/{baseId}/authority-matrix`
- Ro: `{ name: string, description?: string }`
- Vo: `{ id, baseId, name, description?, createdTime, createdBy }`

**`get-list.ts`** — GET `/base/{baseId}/authority-matrix`
- Vo: `{ list: AuthorityMatrixVo[] }`

**`get.ts`** — GET `/base/{baseId}/authority-matrix/{matrixId}`
- Vo: full matrix with nested `roles: AuthorityMatrixRoleVo[]`

**`update.ts`** — PATCH `/base/{baseId}/authority-matrix/{matrixId}`
- Ro: `{ name?: string, description?: string }`
- Vo: updated matrix

**`delete.ts`** — DELETE `/base/{baseId}/authority-matrix/{matrixId}`
- Vo: none (204)

**`role-create.ts`** — POST `/base/{baseId}/authority-matrix/{matrixId}/role`
- Ro: `{ name: string, actions: string[] }`
- Vo: `{ id, authorityMatrixId, name, actions }`

**`role-update.ts`** — PATCH `/base/{baseId}/authority-matrix/{matrixId}/role/{roleId}`
- Ro: `{ name?: string, actions?: string[] }`
- Vo: updated role

**`role-delete.ts`** — DELETE `/base/{baseId}/authority-matrix/{matrixId}/role/{roleId}`
- Vo: none (204)

**`index.ts`** — re-exports all above

Add `export * from './authority-matrix'` to `packages/openapi/src/index.ts`.

Pattern to follow: `packages/openapi/src/base/create.ts` (RouteConfig, registerRoute, urlBuilder, axios wrapper).

### 1.3 NestJS Backend (`apps/nestjs-backend/src/features/authority-matrix/`)

**`authority-matrix.service.ts`**
- Injects `PrismaService` (from `@teable/db-main-prisma`) and `ClsService`
- `create(baseId, ro)`: call `generateAuthorityMatrixId()`, `prismaService.txClient().authorityMatrix.create(...)`
- `findMany(baseId)`: `findMany({ where: { baseId } })`
- `findOne(baseId, matrixId)`: include roles
- `update(matrixId, ro)`: `update({ where: { id: matrixId }, data: ro })`
- `delete(matrixId)`: cascade-deletes roles via FK
- `createRole(matrixId, ro)`: `generateAuthorityMatrixRoleId()`, create role
- `updateRole(roleId, ro)`: update role
- `deleteRole(roleId)`: delete role
- `getByFieldReference(fieldId)`: find roles that reference a field (for field delete integration)

**`authority-matrix.controller.ts`**
- `@Controller('api/base/')`
- All endpoints use `@Permissions('base|authority_matrix_config')` and `@ResourceMeta('baseId', 'params')`
- Endpoints:
  - `@Post(':baseId/authority-matrix')` → create
  - `@Get(':baseId/authority-matrix')` → list
  - `@Get(':baseId/authority-matrix/:matrixId')` → get one
  - `@Patch(':baseId/authority-matrix/:matrixId')` → update
  - `@Delete(':baseId/authority-matrix/:matrixId')` → delete
  - `@Post(':baseId/authority-matrix/:matrixId/role')` → create role
  - `@Patch(':baseId/authority-matrix/:matrixId/role/:roleId')` → update role
  - `@Delete(':baseId/authority-matrix/:matrixId/role/:roleId')` → delete role

**`authority-matrix.module.ts`**
```typescript
@Module({
  providers: [AuthorityMatrixService],
  controllers: [AuthorityMatrixController],
  exports: [AuthorityMatrixService],
})
export class AuthorityMatrixModule {}
```

**Registration:** Add `AuthorityMatrixModule` to the `imports` array in `apps/nestjs-backend/src/app.module.ts`.

**Field delete integration:** In `apps/nestjs-backend/src/features/field/field.service.ts` (or equivalent), when returning field delete references, also query `authority_matrix_role` records that reference the field. Return them in the `authorityMatrixRoles` field of the response (per existing `fieldDeleteRefAuthorityMatrixSchema` in openapi).

### 1.4 Frontend UI (`apps/nextjs-app/src/features/app/blocks/AuthorityMatrix.tsx`)

Replace the current stub with a working management UI.

**React Query keys to add** in `packages/sdk/src/config/react-query-keys.ts`:
- `authorityMatrixList(baseId: string)`
- `authorityMatrix(baseId: string, matrixId: string)`

**UI layout:**
```
Authority Matrix page
├── Header: "Matrice d'autorité" + [+ Nouvelle matrice] button
├── If no matrices: empty state with description
└── Matrix list:
    └── MatrixCard (per matrix)
        ├── Name + description + [Edit] [Delete] buttons
        └── Roles section:
            ├── [+ Ajouter un rôle] button
            └── RoleRow (per role)
                ├── Role name (inline editable)
                ├── Actions checkboxes (grouped by category)
                └── [Delete role] button
```

**Data flow:**
- `useQuery(ReactQueryKeys.authorityMatrixList(baseId), () => getAuthorityMatrixList(baseId))`
- Mutations for create/update/delete invalidate the list query
- Use `baseId` from `useRouter().query.baseId`
- Use existing Teable UI components: `Button`, `Input`, `Checkbox`, `Card` from `@teable/ui-lib/shadcn`

**Actions display:** Group `Action` values from `@teable/core` by category for the checkbox grid. Each role's checked actions are stored as `string[]` in the `actions` JSON field.

**Access guard:** The `hidden: !basePermission?.['base|authority_matrix_config']` guard in `BasePageRouter.tsx` already prevents non-Owner/Creator from seeing the nav item. The page itself can add a permission check that redirects if the permission is absent.

---

## Part 2 — AI Interface Activation

### Status: Already configured

The following are already in place:

| Item | Status | File |
|------|--------|------|
| `NEXT_BUILD_ENV_EDITION=EE` | ✅ Set | `apps/nextjs-app/.env.development` |
| `fieldAIEnable: true` in usage response | ✅ Set | `apps/nestjs-backend/src/features/usage/usage.controller.ts` |
| `chatAIEnable: true` in usage response | ✅ Set | same |
| `BillingProductLevel.Enterprise` returned | ✅ Set | same |
| AI model: OpenRouter minimax-m2.5 | ✅ Configured | DB/user config |

### Acceptance criteria for AI interface

- `isEE` returns `true` at runtime (verified via `useIsEE` hook reading `edition === 'EE'`)
- `useBaseUsage` fetches (not skipped) and returns `fieldAIEnable: true`
- AI field type is available in field creation UI
- Chat AI panel is accessible when enabled

### No code changes required for Part 2

The AI interface activation is already complete from a prior session. This phase only needs to verify it works end-to-end after the app is started.

---

## Acceptance Criteria

### Wave 0 — Foundation
- [ ] `authority_matrix` and `authority_matrix_role` tables exist in DB after running migrations
- [ ] `prismaService.txClient().authorityMatrix` and `.authorityMatrixRole` are available (Prisma client regenerated)
- [ ] OpenAPI types exported from `@teable/openapi`: `ICreateAuthorityMatrixRo`, `IAuthorityMatrixVo`, `IAuthorityMatrixRoleVo`, etc.

### Wave 1 — Backend
- [ ] `POST /api/base/:baseId/authority-matrix` creates a matrix and returns it with generated ID
- [ ] `GET /api/base/:baseId/authority-matrix` returns list of matrices for the base
- [ ] `GET /api/base/:baseId/authority-matrix/:matrixId` returns matrix with its roles
- [ ] `PATCH /api/base/:baseId/authority-matrix/:matrixId` updates name/description
- [ ] `DELETE /api/base/:baseId/authority-matrix/:matrixId` deletes matrix and its roles (cascade)
- [ ] Role CRUD endpoints function correctly
- [ ] All endpoints return 403 for users without `base|authority_matrix_config`
- [ ] Field delete endpoint returns `authorityMatrixRoles` when a field is referenced

### Wave 2 — Frontend
- [ ] Authority Matrix nav item is visible for Owner/Creator and links to the page
- [ ] Page loads without errors; shows list of matrices (or empty state)
- [ ] User can create a new matrix with name and optional description
- [ ] User can add roles to a matrix with name and action checkboxes
- [ ] User can edit role name and toggle actions; changes persist on save
- [ ] User can delete a role or an entire matrix
- [ ] UI handles loading and error states

### AI Interface
- [ ] App starts with `NEXT_BUILD_ENV_EDITION=EE`
- [ ] AI field type appears in field type selector
- [ ] AI chat panel accessible from table view

---

## Out of Scope (Phase 1)

- Runtime enforcement: modifying the permission guard to evaluate requests against authority matrix at runtime (Wave 3) — deferred to a future phase
- Field-level visibility restrictions via matrix (advanced use case)
- Audit log for matrix changes
