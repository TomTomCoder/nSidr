---
phase: 13-doc-library-redesign
fixed_at: 2026-06-02T00:00:00Z
review_path: .planning/phases/13-doc-library-redesign/13-REVIEW.md
iteration: 1
findings_in_scope: 8
fixed: 8
skipped: 0
status: all_fixed
---

# Phase 13: Code Review Fix Report

**Fixed at:** 2026-06-02T00:00:00Z
**Source review:** .planning/phases/13-doc-library-redesign/13-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 8 (4 Critical + 4 Warning)
- Fixed: 8
- Skipped: 0

## Fixed Issues

### CR-01 + WR-01: IDOR in updateFolder/deleteFolder + non-atomic deleteFolder

**Files modified:** `apps/nestjs-backend/src/features/doc-search/doc-folder.service.ts`, `apps/nestjs-backend/src/features/doc-search/doc-folder.controller.ts`
**Commit:** 1aa2507a5
**Applied fix:**
- `updateFolder`: signature changed from `(folderId, data)` to `(spaceId, folderId, data)`; where clause changed from `{ id: folderId }` to `{ id: folderId, spaceId }`. Prisma P2025 acts as ownership check.
- `deleteFolder`: signature changed from `(folderId)` to `(spaceId, folderId)`; `findUniqueOrThrow` now scoped to `{ id: folderId, spaceId }`; all three writes wrapped in `this.prisma.$transaction(async (tx) => { ... })` for atomicity.
- Controller: `@Param('spaceId')` threaded through to both `updateFolder` and `deleteFolder` calls.

---

### CR-02: IDOR — updateDoc does not scope to spaceId

**Files modified:** `apps/nestjs-backend/src/features/doc-search/doc-crud.controller.ts`
**Commit:** 666106381
**Applied fix:** Changed `where: { id: docId }` to `where: { id: docId, spaceId }` in the `importedDoc.update` call. Prisma P2025 throws if the doc doesn't belong to the given space.

---

### CR-03 + WR-02: Stored XSS in ReactMarkdown + debounce not cancelled on unmount

**Files modified:** `apps/nextjs-app/src/features/app/blocks/doc-search/DocEditorArea.tsx`, `apps/nextjs-app/package.json`
**Commit:** ea8484336
**Applied fix:**
- Added `"rehype-sanitize": "6.0.0"` to `apps/nextjs-app/package.json`. **Note:** run `pnpm install` in `apps/nextjs-app` to install the package before building.
- Added `import rehypeSanitize from 'rehype-sanitize'` and applied `rehypePlugins={[rehypeSanitize]}` to both `<ReactMarkdown>` usages (split and preview modes).
- Added `useEffect` cleanup that calls `debouncedSave.cancel()` and `debouncedTitleSave.cancel()` on unmount, preventing stale network requests after the component is destroyed.

---

### CR-04: Prisma/DB column mismatch — DocFolder.spaceId missing @map

**Files modified:** `packages/db-main-prisma/prisma/postgres/schema.prisma`
**Commit:** f6ffb62c2
**Applied fix:** Added `@map("spaceId")` to `DocFolder.spaceId`. The migration creates a camelCase `"spaceId"` column; without `@map`, Prisma would default to `"space_id"` (snake_case) causing a runtime column-not-found error. **Note:** run `prisma generate` after this change to regenerate the Prisma client.

---

### WR-03: BullMQ processor non-null assertions on optional job data

**Files modified:** `apps/nestjs-backend/src/features/doc-search/doc-ingest.processor.ts`
**Commit:** 46ee2329b
**Applied fix:** Replaced `title!` / `userId!` non-null assertions with explicit guards: `if (!title || !userId) throw new Error(...)` before each `ingestMarkdown` / `ingestPdf` call. Produces a clear, actionable error instead of propagating `undefined` into the ingestion service.

---

### WR-04: chunkContent startOffset incorrect for repeated words

**Files modified:** `apps/nestjs-backend/src/features/doc-search/ingestion.service.ts`
**Commit:** ddd3a45ee
**Applied fix:** Changed `charCursor = Math.max(0, startOffset)` (reset to chunk start) to `charCursor = endOffset` (advance past chunk end). This ensures `text.indexOf(chunkWords[0], charCursor)` on the next iteration cannot match an earlier occurrence of the same word, fixing corrupt `startOffset`/`endOffset` metadata in `DocChunk`.

---

## Skipped Issues

None — all findings were fixed.

---

_Fixed: 2026-06-02T00:00:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
