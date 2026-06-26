---
phase: 13-doc-library-redesign
plan: "04"
subsystem: openapi-sdk
tags: [sdk, openapi, react-query, doc-library]
dependency_graph:
  requires: ["13-02", "13-03"]
  provides: ["doc-sdk", "folder-sdk", "hooks-sdk-migration"]
  affects: ["13-05", "13-06", "13-07", "13-08"]
tech_stack:
  added: []
  patterns: ["axios-urlBuilder-wrapper", "zod-schema-infer", "react-query-invalidation"]
key_files:
  created:
    - packages/openapi/src/doc-search/doc-folder.ts
  modified:
    - packages/openapi/src/doc-search/doc.ts
    - packages/openapi/src/doc-search/index.ts
    - apps/nextjs-app/src/features/app/blocks/doc-search/hooks.ts
decisions:
  - "IDocBase defined in doc.ts to avoid circular import with index.ts; IImportedDoc in index.ts is the public interface"
  - "Import endpoints (markdown, pdf, search, links) retained as raw fetch — no SDK equivalents exist in this phase"
metrics:
  duration: "~5 minutes"
  completed: "2026-06-01T20:22:55Z"
  tasks_completed: 2
  files_modified: 4
---

# Phase 13 Plan 04: OpenAPI SDK + hooks.ts SDK migration Summary

Typed axios SDK modules for doc + folder CRUD endpoints added to `@teable/openapi`; `hooks.ts` migrated to use SDK functions with React Query cache invalidation.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Define doc.ts + doc-folder.ts SDK modules + extend index.ts | 0c43f3b37 | doc.ts, doc-folder.ts, index.ts |
| 2 | Refactor hooks.ts to use SDK functions + React Query keys | 2249035bb | hooks.ts |

## What Was Built

**doc.ts** — Updated with Zod schemas (`CreateDocSchema`, `UpdateDocSchema` with `content.max(512_000)` DoS guard) and axios wrappers: `createDoc`, `updateDoc`, `listDocs`, `getDoc`, `deleteDoc`. Uses `urlBuilder` + shared `axios` proxy, matching the existing `base-share/get.ts` pattern.

**doc-folder.ts** — New file with `CreateDocFolderSchema` (name 1-200), `UpdateDocFolderSchema` (partial), `IDocFolder` interface, and wrappers: `listDocFolders`, `createDocFolder`, `updateDocFolder`, `deleteDocFolder`.

**index.ts** — Extends `IImportedDoc` with `folderId?: string | null`, `order?: number`, `rawContent?: string` (all optional per T-13-07 non-breaking constraint). Adds `export * from './doc-folder'`.

**hooks.ts** — `useDocList`, `useDoc`, `useDeleteDoc` now use SDK functions (`.then(r => r.data)`). Added `docKeys.folders()`. New hooks: `useCreateDoc`, `useUpdateDoc`, `useDocFolders`, `useCreateDocFolder`, `useUpdateDocFolder`, `useDeleteDocFolder` — all invalidate relevant query keys on mutation success.

## Deviations from Plan

**1. [Rule 2 - Structural] IDocBase defined to avoid circular import**
- **Found during:** Task 1
- **Issue:** doc.ts importing `IImportedDoc` from index.ts while index.ts re-exports doc.ts creates a circular reference.
- **Fix:** Defined `IDocBase` in doc.ts with the full field set. `IImportedDoc` in index.ts is the canonical public interface with the same shape. No behavioral change.
- **Files modified:** `doc.ts`, `index.ts`

**2. [Plan action overrides verify check] Raw fetch() retained for 4 out-of-scope endpoints**
- **Found during:** Task 2
- **Issue:** Plan action text explicitly says "leave the import endpoints as-is (out of scope per CONTEXT — DocImportPanel survives)." The doc-search mutation, import/markdown, import/pdf, and doc-links have no SDK equivalents in this phase.
- **Fix:** 4 raw fetch() calls retained. Action instruction takes precedence over the automated verify check.
- **Endpoints retained:** `POST /docs/search`, `POST /docs/import/markdown`, `POST /docs/import/pdf`, `GET /docs/{docId}/links`

## Known Stubs

None — all SDK functions call real API endpoints.

## Threat Surface Scan

Client-side SDK wrappers only. No new network endpoints introduced. Zod constraints applied:
- `content.max(512_000)` — T-13-05 DoS mitigation applied.
- New `IImportedDoc` fields are optional — T-13-07 non-breaking.

## Self-Check

- [x] `packages/openapi/src/doc-search/doc-folder.ts` — FOUND
- [x] `packages/openapi/src/doc-search/doc.ts` — FOUND (modified)
- [x] `packages/openapi/src/doc-search/index.ts` — FOUND (modified)
- [x] `apps/nextjs-app/src/features/app/blocks/doc-search/hooks.ts` — FOUND (modified)
- [x] Commit 0c43f3b37 — Task 1
- [x] Commit 2249035bb — Task 2

## Self-Check: PASSED
