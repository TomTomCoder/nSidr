---
phase: 13-doc-library-redesign
plan: "02"
subsystem: backend-folder-crud
tags: [nestjs, prisma, folder, rest-api, tdd]
dependency_graph:
  requires: [prisma.docFolder, ImportedDoc.folderId]
  provides: [DocFolderService, DocFolderController, /api/spaces/:spaceId/doc-folders]
  affects: [13-03, 13-04, 13-05, 13-06, 13-07, 13-08]
tech_stack:
  added: []
  patterns: [NestJS Injectable service, NestJS controller with @Param/@Body, PrismaService injection, vitest unit tests with mocked PrismaService]
key_files:
  created:
    - apps/nestjs-backend/src/features/doc-search/doc-folder.service.ts
    - apps/nestjs-backend/src/features/doc-search/doc-folder.controller.ts
    - apps/nestjs-backend/src/features/doc-search/doc-folder.service.spec.ts
  modified:
    - apps/nestjs-backend/src/features/doc-search/doc-search.module.ts
decisions:
  - "Used vitest (not jest) for spec file — existing backend specs use vitest with vi.fn()"
  - "Mirrored doc-ingest.controller.ts auth surface — no additional auth guard invented since existing pattern delegates to NestJS global guards"
  - "spaceId scoping enforced in listFolders via where: { spaceId } — T-13-03 mitigation in place"
metrics:
  duration: "~10 minutes"
  completed: "2026-06-01"
  tasks_completed: 2
  files_modified: 4
---

# Phase 13 Plan 02: DocFolderService + DocFolderController Summary

**One-liner:** DocFolderService with child-move-on-delete + 4-endpoint REST controller registered in DocSearchModule, fully tested with vitest.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 (RED) | Failing tests for DocFolderService | bd76a8334 | doc-folder.service.spec.ts |
| 1 (GREEN) | DocFolderService implementation | 6227d4ade | doc-folder.service.ts |
| 2 | DocFolderController + module registration | 028376351 | doc-folder.controller.ts, doc-search.module.ts |

## What Was Built

- `DocFolderService` — 4 methods: `listFolders(spaceId)`, `createFolder(spaceId, data)`, `updateFolder(folderId, data)`, `deleteFolder(folderId)`
  - `deleteFolder` reparents child folders (`docFolder.updateMany`) and docs (`importedDoc.updateMany`) to the deleted folder's parent before deleting
  - `listFolders` always scopes by `spaceId` (T-13-03: no cross-space leakage)
- `DocFolderController` — 4 routes under `api/spaces/:spaceId/doc-folders`:
  - `GET /` → listFolders
  - `POST /` → createFolder
  - `PATCH /:folderId` → updateFolder
  - `DELETE /:folderId` → deleteFolder
- `doc-folder.service.spec.ts` — 8 vitest tests covering all 4 methods, including deleteFolder call-order assertions
- `doc-search.module.ts` updated: `DocFolderController` in controllers array, `DocFolderService` in providers array

## Verification

- `doc-folder.service.spec.ts`: 8/8 tests pass
- `DocFolderController` registered in `doc-search.module.ts`: confirmed via grep
- `DocFolderService` registered in `doc-search.module.ts`: confirmed via grep
- TypeScript: 0 doc-folder errors (156 pre-existing errors in unrelated files — out of scope)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Worktree node_modules missing**
- **Found during:** Task 1 (RED test run)
- **Issue:** Worktree has no `node_modules`; vitest + @nestjs/testing couldn't resolve from worktree path
- **Fix:** Symlinked main repo's `node_modules` into worktree root and nestjs-backend directories
- **Files modified:** (symlinks only, no tracked files)
- **Commit:** N/A (infrastructure fix)

**2. [Rule 1 - Format] Spec used jest.fn() instead of vi.fn()**
- **Found during:** Task 1 spec creation
- **Issue:** Initial spec used jest.fn() but project uses vitest (vi.fn())
- **Fix:** Rewrote spec with `import { vi } from 'vitest'` and vi.fn() mocks
- **Files modified:** doc-folder.service.spec.ts

## TDD Gate Compliance

- RED gate: commit `bd76a8334` — `test(13-02): add failing tests for DocFolderService CRUD + child reparenting`
- GREEN gate: commit `6227d4ade` — `feat(13-02): implement DocFolderService with child-move-on-delete`
- Tests failed in RED (service not found) and passed in GREEN (all 8 pass)

## Threat Surface Scan

| Flag | File | Description |
|------|------|-------------|
| T-13-02 mitigated | doc-folder.controller.ts | spaceId is path param — existing NestJS global guards handle auth as per other space controllers |
| T-13-03 mitigated | doc-folder.service.ts | listFolders always uses `where: { spaceId }` — no cross-space leakage possible |

## Self-Check: PASSED

- doc-folder.service.ts: FOUND
- doc-folder.controller.ts: FOUND
- doc-folder.service.spec.ts: FOUND
- doc-search.module.ts (modified): FOUND
- Commits bd76a8334, 6227d4ade, 028376351: FOUND in git log
