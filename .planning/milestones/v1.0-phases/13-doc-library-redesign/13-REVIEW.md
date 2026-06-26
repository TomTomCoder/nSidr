---
phase: 13-doc-library-redesign
reviewed: 2026-06-01T07:00:00Z
depth: standard
files_reviewed: 22
files_reviewed_list:
  - packages/db-main-prisma/prisma/postgres/schema.prisma
  - packages/db-main-prisma/prisma/postgres/migrations/20260601000000_add_doc_folder_model/migration.sql
  - apps/nestjs-backend/src/features/doc-search/doc-folder.service.ts
  - apps/nestjs-backend/src/features/doc-search/doc-folder.controller.ts
  - apps/nestjs-backend/src/features/doc-search/doc-folder.service.spec.ts
  - apps/nestjs-backend/src/features/doc-search/doc-search.module.ts
  - apps/nestjs-backend/src/features/doc-search/doc-crud.controller.ts
  - apps/nestjs-backend/src/features/doc-search/doc-crud.controller.spec.ts
  - apps/nestjs-backend/src/features/doc-search/embedding.service.ts
  - apps/nestjs-backend/src/features/doc-search/embedding.service.spec.ts
  - apps/nestjs-backend/src/features/doc-search/doc-ingest.processor.ts
  - apps/nestjs-backend/src/features/doc-search/ingestion.service.ts
  - apps/nestjs-backend/src/features/ai/unified-ai.service.ts
  - packages/openapi/src/doc-search/doc.ts
  - packages/openapi/src/doc-search/doc-folder.ts
  - packages/openapi/src/doc-search/index.ts
  - apps/nextjs-app/src/features/app/blocks/doc-search/hooks.ts
  - apps/nextjs-app/src/features/app/blocks/doc-search/useDocEditorStore.ts
  - apps/nextjs-app/src/features/app/blocks/doc-search/DocFolderTree.tsx
  - apps/nextjs-app/src/features/app/blocks/doc-search/DocEditorArea.tsx
  - apps/nextjs-app/src/features/app/blocks/doc-search/DocLibrary.tsx
  - packages/openapi/src/doc-search/index.ts
findings:
  critical: 4
  warning: 4
  info: 2
  total: 10
status: fixed
---

# Phase 13: Code Review Report

**Reviewed:** 2026-06-01T07:00:00Z
**Depth:** standard
**Files Reviewed:** 22
**Status:** issues_found

## Summary

Phase 13 adds a DocFolder tree model, CRUD controllers for docs and folders, a CodeMirror-based editor, and BullMQ-backed ingestion pipeline. The schema and service layer are structurally sound. However, four critical issues were found: two IDOR (Insecure Direct Object Reference) vulnerabilities allow any authenticated user to mutate or read data belonging to other spaces; a migration column naming mismatch will cause a deploy-time schema error; and user-controlled markdown is rendered without sanitization, enabling stored XSS. Four warnings cover a non-atomic delete, a debounce memory/state leak, unvalidated BullMQ job payloads, and a chunking offset bug.

---

## Critical Issues

### CR-01: IDOR — `updateFolder` and `deleteFolder` bypass space ownership

**File:** `apps/nestjs-backend/src/features/doc-search/doc-folder.controller.ts:18-26`
**Also:** `apps/nestjs-backend/src/features/doc-search/doc-folder.service.ts:35-50`

**Issue:** `PATCH /:folderId` and `DELETE /:folderId` receive a `spaceId` path param but never verify the target folder belongs to that space. `DocFolderService.updateFolder` calls `prisma.docFolder.update({ where: { id: folderId } })` with no `spaceId` filter. Any authenticated user who guesses or observes a `folderId` from another space can rename, reorder, or delete that folder. `deleteFolder` has the same gap.

**Fix:**

```typescript
// doc-folder.service.ts — updateFolder
async updateFolder(spaceId: string, folderId: string, data: IUpdateDocFolder) {
  // This will throw PrismaClientKnownRequestError P2025 if the folder
  // doesn't exist in this space, acting as an ownership check.
  return this.prisma.docFolder.update({
    where: { id: folderId, spaceId },
    data,
  });
}

// doc-folder.service.ts — deleteFolder
async deleteFolder(spaceId: string, folderId: string) {
  const folder = await this.prisma.docFolder.findUniqueOrThrow({
    where: { id: folderId, spaceId },
  });
  // ... rest unchanged
}

// doc-folder.controller.ts — thread spaceId through
async updateFolder(
  @Param('spaceId') spaceId: string,
  @Param('folderId') folderId: string,
  @Body() body: IUpdateDocFolder
) {
  return this.docFolderService.updateFolder(spaceId, folderId, body);
}

async deleteFolder(
  @Param('spaceId') spaceId: string,
  @Param('folderId') folderId: string
) {
  return this.docFolderService.deleteFolder(spaceId, folderId);
}
```

---

### CR-02: IDOR — `updateDoc` does not scope to spaceId

**File:** `apps/nestjs-backend/src/features/doc-search/doc-crud.controller.ts:43-66`

**Issue:** `PATCH :docId` calls `prisma.importedDoc.update({ where: { id: docId } })` without filtering by `spaceId`. Any authenticated user who knows a `docId` can overwrite its title, content, folderId, or order, regardless of which space owns it. The `spaceId` param is extracted but only used for the BullMQ reindex job, not the DB write.

**Fix:**

```typescript
const doc = await this.prisma.importedDoc.update({
  where: { id: docId, spaceId },   // add spaceId to the where clause
  data: {
    ...(body.title !== undefined && { title: body.title }),
    ...(body.content !== undefined && { rawContent: body.content, isIndexed: false }),
    ...(body.folderId !== undefined && { folderId: body.folderId }),
    ...(body.order !== undefined && { order: body.order }),
  },
});
```

---

### CR-03: Stored XSS — `ReactMarkdown` renders unsanitized user content

**File:** `apps/nextjs-app/src/features/app/blocks/doc-search/DocEditorArea.tsx:289,297`

**Issue:** `<ReactMarkdown>{localContent}</ReactMarkdown>` renders content sourced directly from the database (`doc.rawContent`). `react-markdown` by default passes HTML nodes through when using `rehype-raw`. Even without `rehype-raw`, malicious markdown can include `javascript:` href links and `<img onerror=...>` tags that some renderers pass through. Any user who can write a document can craft a payload that executes JavaScript when another user views it in preview or split mode.

**Fix:** Add `rehype-sanitize` to the rendering pipeline:

```tsx
import rehypeSanitize from 'rehype-sanitize';

// In JSX:
<ReactMarkdown rehypePlugins={[rehypeSanitize]}>
  {localContent}
</ReactMarkdown>
```

Install: `npm install rehype-sanitize` in the nextjs-app package.

---

### CR-04: Migration schema mismatch — `spaceId` column name diverges from Prisma convention

**File:** `packages/db-main-prisma/prisma/postgres/migrations/20260601000000_add_doc_folder_model/migration.sql:8,15`

**Issue:** The migration creates the `doc_folder` table with camelCase column name `"spaceId"`. Prisma generates snake_case column names for fields without an explicit `@map` annotation; the Prisma schema's `spaceId String` field (line 1105) has no `@map("space_id")` annotation. Prisma will therefore expect a column named `space_id`, but the migration created `"spaceId"`. This causes a runtime error (`column "space_id" does not exist`) on any query against `docFolder`. The `parentFolderId` field correctly uses `@map("parentId")` to match the SQL's `"parentId"` column, but `spaceId` is missing the equivalent mapping.

**Fix — Option A (preferred): Add `@map` to the Prisma schema to match the migration:**

```prisma
model DocFolder {
  id             String    @id @default(cuid())
  spaceId        String    @map("spaceId")   // keep camelCase column
  parentFolderId String?   @map("parentId")
  ...
}
```

**Fix — Option B: Fix the migration to use snake_case:**

```sql
CREATE TABLE IF NOT EXISTS "doc_folder" (
  "id"        TEXT NOT NULL,
  "space_id"  TEXT NOT NULL,   -- snake_case to match Prisma default
  ...
  CONSTRAINT "doc_folder_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "space"("id") ON DELETE CASCADE
);
```

---

## Warnings

### WR-01: `deleteFolder` is not atomic — three sequential writes with no transaction

**File:** `apps/nestjs-backend/src/features/doc-search/doc-folder.service.ts:39-49`

**Issue:** Three separate Prisma calls (reparent child folders, reparent docs, delete folder) are not wrapped in a `$transaction`. If the process crashes or is killed between any two steps the database is left in an inconsistent state: e.g., child folders could be reparented while docs are still attached to a deleted folder row (or the folder row is left unreferenced).

**Fix:**

```typescript
async deleteFolder(spaceId: string, folderId: string) {
  return this.prisma.$transaction(async (tx) => {
    const folder = await tx.docFolder.findUniqueOrThrow({
      where: { id: folderId, spaceId },
    });
    await tx.docFolder.updateMany({
      where: { parentFolderId: folderId },
      data: { parentFolderId: folder.parentFolderId },
    });
    await tx.importedDoc.updateMany({
      where: { folderId },
      data: { folderId: folder.parentFolderId },
    });
    return tx.docFolder.delete({ where: { id: folderId } });
  });
}
```

---

### WR-02: Debounced auto-save callbacks not cancelled on component unmount

**File:** `apps/nextjs-app/src/features/app/blocks/doc-search/DocEditorArea.tsx:62-65, 84-87`

**Issue:** `debouncedSave` and `debouncedTitleSave` are created with `lodash/debounce` via `useCallback`. There is no `useEffect` cleanup that calls `.cancel()` on either debounced function. If the user closes a document (unmounting the component) within 800 ms of the last keystroke, the pending debounced call fires after unmount and calls `updateDoc` — this is a network request on a stale closure and can also cause "Can't perform a React state update on an unmounted component" warnings if save status is set.

**Fix:**

```typescript
// After creating debouncedSave:
useEffect(() => {
  return () => {
    debouncedSave.cancel();
    debouncedTitleSave.cancel();
  };
}, [debouncedSave, debouncedTitleSave]);
```

---

### WR-03: BullMQ job data for `markdown`/`pdf` types has no runtime validation; `title` and `userId` accessed with `!`

**File:** `apps/nestjs-backend/src/features/doc-search/doc-ingest.processor.ts:26-29`

**Issue:** `DocIngestJobData` declares `title` and `userId` as optional (`title?: string`, `userId?: string`). The processor accesses them with non-null assertions (`title!`, `userId!`). If a job is enqueued without those fields (e.g., a bug in a future caller, a manually injected job, or a BullMQ replay), `ingestMarkdown(spaceId, undefined!, ...)` will propagate `undefined` into the ingestion service where it is used as the document title and the `createdBy` FK. The FK write will likely fail at the DB level, but with an opaque error rather than a validation error.

**Fix:** Add explicit guards before the non-null assertions:

```typescript
if (type === 'markdown' && content) {
  if (!title || !userId) throw new Error('markdown job missing title or userId');
  await this.ingestionService.ingestMarkdown(spaceId, title, content, userId);
} else if (type === 'pdf' && pdfBase64) {
  if (!title || !userId) throw new Error('pdf job missing title or userId');
  const buffer = Buffer.from(pdfBase64, 'base64');
  await this.ingestionService.ingestPdf(spaceId, title, buffer, userId);
}
```

---

### WR-04: `chunkContent` start-offset calculation is incorrect for repeated words

**File:** `apps/nestjs-backend/src/features/doc-search/ingestion.service.ts:36-40`

**Issue:** `startOffset` is computed as `text.indexOf(chunkWords[0], charCursor)`. After the first chunk, `charCursor` is set to `Math.max(0, startOffset)` — the start of the *previous* chunk, not its end. If `chunkWords[0]` (the first word of the new chunk) appears anywhere between the previous chunk's start and its actual position, `indexOf` returns the earlier occurrence, producing a `startOffset` that points into the middle of the previous chunk. This corrupts the `startOffset`/`endOffset` metadata stored in `DocChunk`, which affects search snippet highlighting and any future range-based retrieval.

**Fix:** Advance `charCursor` past the previous chunk's end instead of resetting it to the chunk's start:

```typescript
const startOffset = text.indexOf(chunkWords[0], charCursor);
const endOffset = startOffset + content.length;
chunks.push({ content, startOffset: Math.max(0, startOffset), endOffset, tokenCount });
charCursor = endOffset;  // advance past this chunk's end, not reset to its start
wordStart = wordEnd - this.OVERLAP_WORDS;
```

---

## Info

### IN-01: `DocIngestJobData.docId` is optional but only used in the `reindex` branch — no defensive check on the `else if` path

**File:** `apps/nestjs-backend/src/features/doc-search/doc-ingest.processor.ts:30`

**Issue:** The `else if (type === 'reindex' && job.data.docId)` guard correctly checks for `docId`, but silently drops the job if `type === 'reindex'` and `docId` is absent. No error is logged; the job completes with no action and no indication something went wrong.

**Fix:** Add an explicit error log:

```typescript
} else if (type === 'reindex') {
  if (!job.data.docId) {
    throw new Error(`reindex job ${job.id} missing docId — skipping`);
  }
  await this.ingestionService.reindexDoc(spaceId, job.data.docId);
}
```

---

### IN-02: Migration FK constraint name check does not filter by table name

**File:** `packages/db-main-prisma/prisma/postgres/migrations/20260601000000_add_doc_folder_model/migration.sql:22-31`

**Issue:** The `DO $$` block checks `information_schema.table_constraints` for `constraint_name = 'imported_doc_folderId_fkey'` but does not also filter by `table_name = 'imported_doc'`. If another table in the schema has a constraint with the same name, the guard incorrectly concludes the FK already exists and skips the `ALTER TABLE`. In practice this is very low risk because the constraint name is specific, but the guard is weaker than intended.

**Fix:** Add `AND table_name = 'imported_doc'` to the WHERE clause:

```sql
WHERE constraint_name = 'imported_doc_folderId_fkey'
  AND table_name      = 'imported_doc'
  AND table_schema    = 'public'
```

---

_Reviewed: 2026-06-01T07:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
