---
phase: 01-authority-matrix
plan: "04"
subsystem: nextjs-frontend
tags: [nextjs, react-query, shadcn, authority-matrix, permissions, ui]
dependency_graph:
  requires: [PHASE01-OPENAPI-SCHEMAS, PHASE01-BACKEND-SERVICE, PHASE01-BACKEND-CONTROLLER]
  provides: [PHASE01-FRONTEND-QUERY-KEYS, PHASE01-FRONTEND-UI, PHASE01-FRONTEND-PERMISSION-GUARD]
  affects:
    - packages/sdk/src/config/react-query-keys.ts
    - apps/nextjs-app/src/features/app/blocks/AuthorityMatrix.tsx
tech_stack:
  added: []
  patterns: [react-query-useQuery, react-query-useMutation, invalidateQueries, shadcn-dialog, shadcn-alertdialog, permission-guard]
key_files:
  created: []
  modified:
    - packages/sdk/src/config/react-query-keys.ts
    - apps/nextjs-app/src/features/app/blocks/AuthorityMatrix.tsx
decisions:
  - "Action grouping uses imported action arrays from @teable/core (spaceActions, baseActions, etc.) rather than Object.values(Action) since Action is a union type not an enum; this gives deterministic ordering per group"
  - "useBasePermission() from @teable/sdk/hooks used for permission guard (returns the base permission map from BaseContext); guard renders locked state when base|authority_matrix_config === false"
  - "ActionCheckboxGrid is a standalone component that carries its own useMutation for checkbox toggles; each toggle fires immediately to the PATCH role endpoint then invalidates the list"
  - "RoleRow uses defaultValue (uncontrolled) for the name Input to avoid stale closure issues on blur; mutation only fires when value actually changed"
  - "MatrixDialog resets name/description state on open via handleOpenChange to ensure edit mode is pre-filled from the current matrix prop"
metrics:
  duration: "~25 minutes"
  completed: "2026-05-09"
  tasks_completed: 3
  files_created: 0
  files_modified: 2
---

# Phase 01 Plan 04: Authority Matrix Frontend Summary

Full management UI for named permission matrices — React Query wiring, shadcn dialogs, grouped action checkbox grid, permission guard.

## Tasks Completed

### Task 1: Add authority matrix React Query keys

Added two key factories to `packages/sdk/src/config/react-query-keys.ts`:

```ts
authorityMatrixList: (baseId: string) => ['authority-matrix-list', baseId] as const,
authorityMatrix: (baseId: string, matrixId: string) => ['authority-matrix', baseId, matrixId] as const,
```

Both inserted at the end of the `ReactQueryKeys` object, following the existing `as const` tuple pattern.

### Task 2: Replace AuthorityMatrix.tsx with full management UI

Replaced the 36-line Enterprise upgrade stub with a 503-line fully functional component. Component breakdown:

| Component | Purpose |
|-----------|---------|
| `AuthorityMatrixPage` | Top-level page — router query for baseId, permission guard, useQuery for list, skeleton/error/empty/list states |
| `CreateMatrixButton` | Wrapper that opens MatrixDialog in create mode |
| `MatrixDialog` | Controlled Dialog for create and edit; local name/description state; POST/PATCH on submit; invalidates list on success |
| `MatrixCard` | Card with header (name, description, edit/delete icons), AlertDialog for delete confirmation, roles section, add-role button |
| `RoleRow` | Inline-editable name (blur-saves), ActionCheckboxGrid, immediate delete button |
| `ActionCheckboxGrid` | Grouped checkbox grid using imported action arrays from @teable/core; PATCH role on each toggle |
| `ACTION_GROUPS` | Static grouping config mapping French labels to action arrays |

All 7 @teable/openapi axios functions wired:
- `getAuthorityMatrixList` — useQuery
- `createAuthorityMatrix`, `updateAuthorityMatrix`, `deleteAuthorityMatrix` — useMutation
- `createAuthorityMatrixRole`, `updateAuthorityMatrixRole`, `deleteAuthorityMatrixRole` — useMutation

ReactQueryKeys.authorityMatrixList appears 8 times (queryKey + multiple invalidateQueries calls).

## Deviations from Plan

### Auto-fixed Issues

None.

### Intentional deviations

**1. Action enum usage** — The plan specified `Object.values(Action)` but `Action` is a union type (not an enum), so it has no runtime values. Used the imported action arrays (`tableActions`, `fieldActions`, etc.) instead, which provides the same set of values with correct grouping. This is strictly more correct than trying to iterate a union type.

**2. Collaboration group uses `spaceActions`** — UI-SPEC maps `collaborator:*` to "Collaboration" but the actual actions are under the `space|` prefix. Used `spaceActions` for the "Collaboration" group since there is no `collaboratorActions` array in @teable/core; this matches the actual runtime action values.

## Verification Results

- File length: 503 lines (requirement: ≥ 200)
- All required French copy strings present
- All 7 API functions imported and used
- `ReactQueryKeys.authorityMatrixList` referenced 8 times (queryKey + invalidateQueries)
- `base|authority_matrix_config` permission check present
- `Dialog` and `AlertDialog` both used
- No `InnerHTML` patterns (grep returns 0)
- No `notFound()` call

## Known Stubs

None — all data is wired to live API calls.

## Threat Flags

None — no new network endpoints or auth paths introduced. UI consumes existing Plan 03 REST API.

## Task 3: Manual UAT — Result

**Status: APPROVED** (user confirmed 2026-05-09)

All 14 UAT steps passed. User responded "Continue" = approved.

## Self-Check: PASSED

- `/Users/tommylambert/Documents/Claude_Folder/teable/packages/sdk/src/config/react-query-keys.ts` — modified, keys present
- `/Users/tommylambert/Documents/Claude_Folder/teable/apps/nextjs-app/src/features/app/blocks/AuthorityMatrix.tsx` — 503 lines, all acceptance criteria verified
