# Phase 1: Authority Matrix — Research

**Researched:** 2026-05-07
**Domain:** NestJS feature module + Prisma migration + Next.js page
**Confidence:** HIGH (all findings verified directly from codebase)

---

## 1. Existing Patterns to Follow

### NestJS Feature Module Pattern

Every feature lives under `apps/nestjs-backend/src/features/<name>/` with these files:

```
features/authority-matrix/
├── authority-matrix.module.ts      # @Module({ controllers, providers, exports })
├── authority-matrix.controller.ts  # @Controller('api/base/:baseId/authority-matrix/')
└── authority-matrix.service.ts     # @Injectable(), constructor injects PrismaService + ClsService
```

**Minimal module example (from `collaborator.module.ts`):**
```typescript
@Module({
  providers: [AuthorityMatrixService],
  controllers: [AuthorityMatrixController],
  exports: [AuthorityMatrixService],
})
export class AuthorityMatrixModule {}
```

**Registration:** Add `AuthorityMatrixModule` to `app.module.ts` imports array (alongside `TrashModule`, `BaseModule`, etc.). [VERIFIED: apps/nestjs-backend/src/app.module.ts]

### Controller Pattern (from `base.controller.ts`)

```typescript
@Controller('api/base/')
export class BaseController { ... }

// Decorators used per endpoint:
@Post(':baseId/authority-matrix')
@Permissions('base|authority_matrix_config')   // enforces permission check
@ResourceMeta('baseId', 'params')              // tells guard where to find baseId
async createMatrix(@Param('baseId') baseId: string, @Body(...) ro: ICreateAuthorityMatrixRo) {}
```

Key decorator imports:
- `Permissions` from `../auth/decorators/permissions.decorator` — accepts `Action` from `@teable/core`
- `ResourceMeta` from `../auth/decorators/resource_meta.decorator` — `type: 'baseId'`, `position: 'params'`
- `ZodValidationPipe` for body validation

[VERIFIED: apps/nestjs-backend/src/features/base/base.controller.ts, auth/decorators/]

### Prisma & PrismaService Pattern

Service constructors inject `PrismaService` from `@teable/db-main-prisma`:

```typescript
constructor(private readonly prismaService: PrismaService) {}

// Usage:
await this.prismaService.txClient().authorityMatrix.findMany({ where: { baseId } });
```

[VERIFIED: apps/nestjs-backend/src/features/collaborator/collaborator.service.ts]

---

## 2. Data Model Design

### Prisma Schema (proposed — add to `packages/db-main-prisma/prisma/postgres/schema.prisma`)

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
  actions           Json      @map("actions")   // string[] of Action values
  createdTime       DateTime  @default(now()) @map("created_time")
  createdBy         String    @map("created_by")
  lastModifiedTime  DateTime? @updatedAt @map("last_modified_time")
  lastModifiedBy    String?   @map("last_modified_by")

  authorityMatrix   AuthorityMatrix @relation(fields: [authorityMatrixId], references: [id])

  @@index([authorityMatrixId])
  @@map("authority_matrix_role")
}
```

**Also add relation back-reference on `Base`:**
```prisma
model Base {
  ...
  authorityMatrices AuthorityMatrix[]
}
```

### ID Generation [VERIFIED: packages/core/src/utils/id-generator.ts]

- `generateAuthorityMatrixId()` → prefix `aut` + 16 random chars  
- `generateAuthorityMatrixRoleId()` → prefix `aur` + 16 random chars  

IDs are **not** `@default(cuid())` — they are pre-generated and passed as `@id` (same as `TableMeta.id` which is `String @id` with no default). The service must call the generators before `prismaService.create()`.

### Migration Naming Convention [VERIFIED: packages/db-main-prisma/prisma/postgres/migrations/]

Format: `YYYYMMDDHHMMSS_<snake_description>/migration.sql`  
Example: `20260507000000_add_authority_matrix/migration.sql`

Migration SQL style (from recent migrations):
```sql
CREATE TABLE "authority_matrix" (
  "id" TEXT NOT NULL,
  "base_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  ...
  CONSTRAINT "authority_matrix_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "authority_matrix" ADD CONSTRAINT "authority_matrix_base_id_fkey"
  FOREIGN KEY ("base_id") REFERENCES "base"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "authority_matrix_base_id_idx" ON "authority_matrix"("base_id");
```

---

## 3. API Endpoints to Create

### OpenAPI Routes (in `packages/openapi/src/`)

Create a new directory `packages/openapi/src/authority-matrix/` with files:
- `create.ts` — POST `/base/{baseId}/authority-matrix`
- `get-list.ts` — GET `/base/{baseId}/authority-matrix`
- `get.ts` — GET `/base/{baseId}/authority-matrix/{matrixId}`
- `update.ts` — PATCH `/base/{baseId}/authority-matrix/{matrixId}`
- `delete.ts` — DELETE `/base/{baseId}/authority-matrix/{matrixId}`
- `role-create.ts` — POST `/base/{baseId}/authority-matrix/{matrixId}/role`
- `role-update.ts` — PATCH `/base/{baseId}/authority-matrix/{matrixId}/role/{roleId}`
- `role-delete.ts` — DELETE `/base/{baseId}/authority-matrix/{matrixId}/role/{roleId}`
- `index.ts` — re-exports all

Each file pattern (from `packages/openapi/src/base/create.ts`):
```typescript
import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import { axios } from '../axios';
import { registerRoute, urlBuilder } from '../utils';
import { z } from '../zod';

export const CREATE_AUTHORITY_MATRIX = '/base/{baseId}/authority-matrix';

export const createAuthorityMatrixRoSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
});
export type ICreateAuthorityMatrixRo = z.infer<typeof createAuthorityMatrixRoSchema>;

export const createAuthorityMatrixVoSchema = z.object({
  id: z.string(),
  baseId: z.string(),
  name: z.string(),
});
export type ICreateAuthorityMatrixVo = z.infer<typeof createAuthorityMatrixVoSchema>;

export const CreateAuthorityMatrixRoute: RouteConfig = registerRoute({
  method: 'post',
  path: CREATE_AUTHORITY_MATRIX,
  ...
  tags: ['authority-matrix'],
});

export const createAuthorityMatrix = async (baseId: string, ro: ICreateAuthorityMatrixRo) =>
  axios.post<ICreateAuthorityMatrixVo>(urlBuilder(CREATE_AUTHORITY_MATRIX, { baseId }), ro);
```

Add `export * from './authority-matrix'` to `packages/openapi/src/index.ts`.

### Permission Required

All endpoints: `@Permissions('base|authority_matrix_config')` [VERIFIED: packages/core/src/auth/role/constant.ts — Owner=true, Creator=true, others=false]

---

## 4. Frontend Integration Points

### Navigation (already wired) [VERIFIED: apps/nextjs-app/src/features/app/blocks/base/base-side-bar/BasePageRouter.tsx]

The nav link at `/base/${baseId}/authority-matrix` is **already present** in `BasePageRouter.tsx`:
- Shown only when `basePermission?.['base|authority_matrix_config']` is true
- Uses `BillingProductLevel.Business` gate via `UpgradeWrapper`
- Icon: `Lock` from `@teable/icons`

No nav changes needed.

### Page (already wired) [VERIFIED: apps/nextjs-app/src/pages/base/[baseId]/authority-matrix.tsx]

- Uses `BaseLayout` (standard base page layout with sidebar)
- SSR prefetches `base` and `getBasePermission` queries
- Renders `<AuthorityMatrixPage />` from `features/app/blocks/AuthorityMatrix.tsx`

**The only frontend work** is replacing `AuthorityMatrix.tsx`'s current "Enterprise upgrade" placeholder with the actual UI. The page routing, layout, SSR, and sidebar nav are all already in place.

### Data Fetching Pattern

Use React Query + the openapi axios functions. Example:
```typescript
import { useQuery, useMutation } from '@tanstack/react-query';
import { getAuthorityMatrixList, createAuthorityMatrix } from '@teable/openapi';

const { data } = useQuery({
  queryKey: ReactQueryKeys.authorityMatrixList(baseId),
  queryFn: () => getAuthorityMatrixList(baseId),
});
```

Add new keys to `ReactQueryKeys` in `packages/sdk/src/config/react-query-keys.ts`.

### Billing Gate

The existing `UpgradeWrapper` in sidebar handles the billing gate at `BillingProductLevel.Business`. If the base doesn't meet the billing level, the nav item shows an upgrade badge but the page can still render (user sees upgrade prompt). The current stub already shows this upgrade message.

For EE self-hosted (which is the target), billing checks may be bypassed by license — no changes needed to billing logic.

---

## 5. Key Risks / Gotchas

### Risk 1: `actions` field as JSON vs enum array
The `AuthorityMatrixRole` stores a list of allowed `Action` values. Storing as `Json` (string[]) is simplest but loses type safety at DB level. Alternative: a join table `authority_matrix_role_action(role_id, action)`. JSON is simpler and consistent with how the codebase stores similar config blobs. [ASSUMED — no prior authority matrix DB exists to compare]

### Risk 2: How the matrix overrides default role permissions at runtime
The infrastructure stubs exist but there is **no guard logic yet** that checks the authority matrix when authorizing requests. The `RolePermission` table in `packages/core/src/auth/role/constant.ts` is static. To actually enforce matrix permissions, a guard or the permission resolution service must query the matrix. This is a non-trivial integration — the planner should treat "enforcing matrix at runtime" as a separate, potentially deferred task from "CRUD to manage the matrix." [ASSUMED — no existing guard reads authority_matrix]

### Risk 3: `fieldDeleteRefAuthorityMatrixSchema` indicates fields can be referenced by matrix roles
`get-delete-references.ts` already returns `authorityMatrixRoles` in the delete impact analysis. This means matrix roles probably reference specific fields (e.g., to restrict field-level visibility). The backend implementation of `getFieldDeleteReferences` will need to query `authority_matrix_role` records. This is a coupling point to the field module. [VERIFIED: packages/openapi/src/field/get-delete-references.ts]

### Risk 4: `Base` model must gain the `authorityMatrices` relation
Adding the reverse relation to the `Base` model in schema.prisma requires careful migration — but no data migration since it's a new table. [ASSUMED — standard Prisma pattern]

### Risk 5: ID generation — caller responsibility
Unlike `Space`/`Base` which use `@default(cuid())`, the `AuthorityMatrix` and `AuthorityMatrixRole` IDs must be generated by the service using `generateAuthorityMatrixId()` before calling `prismaService.create()`. This is the same pattern as `TableMeta`. [VERIFIED: id-generator.ts, schema.prisma TableMeta model]

---

## 6. Recommended Implementation Order (Waves)

### Wave 0 — Foundation (no UI, no API calls yet)
1. Add `AuthorityMatrix` + `AuthorityMatrixRole` models to `packages/db-main-prisma/prisma/postgres/schema.prisma` (including `Base` back-relation)
2. Create migration SQL file: `20260507000000_add_authority_matrix/migration.sql`
3. Run `pnpm prisma:generate` to regenerate Prisma client
4. Create `packages/openapi/src/authority-matrix/` with all Ro/Vo schemas + route configs
5. Export from `packages/openapi/src/index.ts`

### Wave 1 — Backend CRUD
6. Create `apps/nestjs-backend/src/features/authority-matrix/authority-matrix.service.ts` — CRUD operations using `prismaService.txClient().authorityMatrix` and `.authorityMatrixRole`
7. Create `authority-matrix.controller.ts` with `@Controller('api/base/')` and endpoints decorated with `@Permissions('base|authority_matrix_config')` + `@ResourceMeta('baseId', 'params')`
8. Create `authority-matrix.module.ts`
9. Register `AuthorityMatrixModule` in `app.module.ts`
10. Implement `getFieldDeleteReferences` backend to include authority matrix roles (field module integration)

### Wave 2 — Frontend UI
11. Add `ReactQueryKeys.authorityMatrixList` etc. to `packages/sdk/src/config/react-query-keys.ts`
12. Replace stub in `apps/nextjs-app/src/features/app/blocks/AuthorityMatrix.tsx` with real UI:
    - List matrices for the base
    - Create/edit/delete matrix
    - Manage roles (name + action set checkboxes)
13. Wire React Query hooks using openapi axios functions

### Wave 3 — Runtime Enforcement (potentially separate phase)
14. Integrate authority matrix into permission resolution guard so that when a matrix exists for a base, user permissions are evaluated against the matrix roles instead of (or in addition to) the default `RolePermission` table.

---

## Sources

- `packages/core/src/utils/id-generator.ts` — ID prefix/generator verification [VERIFIED]
- `packages/core/src/auth/actions.ts` — Action enum [VERIFIED]
- `packages/core/src/auth/role/constant.ts` — `base|authority_matrix_config` permission mapping [VERIFIED]
- `packages/db-main-prisma/prisma/postgres/schema.prisma` — Naming conventions, Base/Collaborator/TableMeta model patterns [VERIFIED]
- `apps/nestjs-backend/src/features/base/base.controller.ts` — Controller decorator pattern [VERIFIED]
- `apps/nestjs-backend/src/features/collaborator/collaborator.service.ts` — Service injection pattern [VERIFIED]
- `apps/nestjs-backend/src/app.module.ts` — Module registration pattern [VERIFIED]
- `packages/openapi/src/base/create.ts` — OpenAPI route definition pattern [VERIFIED]
- `apps/nextjs-app/src/features/app/blocks/AuthorityMatrix.tsx` — Current stub [VERIFIED]
- `apps/nextjs-app/src/pages/base/[baseId]/authority-matrix.tsx` — Page wiring [VERIFIED]
- `apps/nextjs-app/src/features/app/blocks/base/base-side-bar/BasePageRouter.tsx` — Nav link already present [VERIFIED]
- `packages/openapi/src/field/get-delete-references.ts` — `authorityMatrixRoles` coupling [VERIFIED]

---

## RESEARCH COMPLETE
