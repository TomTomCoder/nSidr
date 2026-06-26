---
phase: 13-doc-library-redesign
verified: 2026-06-02T00:00:00Z
status: passed
score: 11/11 must-haves verified (re-verified 2026-06-04)
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 7/11
  reverified: 2026-06-04
  gaps_closed:
    - "CR-01: IDOR fixed — doc-folder.service updateFolder(spaceId,...)/deleteFolder(spaceId,...) scope to spaceId (commit fix(13-02))"
    - "CR-02: IDOR fixed — doc-crud updateDoc where:{id:docId,spaceId} (commit fix(13-03))"
    - "CR-03: Stored XSS fixed — DocEditorArea.tsx renders via <ReactMarkdown rehypePlugins={[rehypeSanitize]}> (both sites)"
    - "CR-04: migration spaceId naming addressed in subsequent doc-folder migration"
  gaps_remaining: []
  regressions: []
note: "The gaps below are HISTORICAL (initial 2026-06-02 verification). All 4 CR-* issues were closed in later commits and re-confirmed in current code on 2026-06-04. Status is now passed."
gaps:
  - truth: "Folders are scoped to the authenticated user's space (updateFolder/deleteFolder)"
    status: failed
    reason: "CR-01 IDOR confirmed unchanged: doc-folder.service.ts updateFolder(folderId, data) and deleteFolder(folderId) never filter by spaceId. Any authenticated user can rename or delete folders belonging to other spaces by guessing folderId. Identical to previous verification — not fixed."
    artifacts:
      - path: apps/nestjs-backend/src/features/doc-search/doc-folder.service.ts
        issue: "updateFolder calls prisma.docFolder.update({ where: { id: folderId } }) with no spaceId filter. deleteFolder calls findUniqueOrThrow({ where: { id: folderId } }) with no spaceId filter."
      - path: apps/nestjs-backend/src/features/doc-search/doc-folder.controller.ts
        issue: "PATCH and DELETE handlers extract spaceId param but do not pass it to DocFolderService."
    missing:
      - "updateFolder signature: updateFolder(spaceId: string, folderId: string, data) with where: { id: folderId, spaceId }"
      - "deleteFolder signature: deleteFolder(spaceId: string, folderId: string) with findUniqueOrThrow where: { id: folderId, spaceId }"
      - "Controller must thread spaceId through to both service methods"

  - truth: "An empty doc can be created via POST and content updated via PATCH (scoped to spaceId)"
    status: failed
    reason: "CR-02 IDOR confirmed unchanged: doc-crud.controller.ts PATCH handler calls prisma.importedDoc.update({ where: { id: docId } }) without spaceId filter. spaceId param extracted but only used for BullMQ job, not the DB write. Not fixed."
    artifacts:
      - path: apps/nestjs-backend/src/features/doc-search/doc-crud.controller.ts
        issue: "where: { id: docId } — spaceId not included in the where clause. Any authenticated user can overwrite doc content belonging to other spaces."
    missing:
      - "Change where clause to: { id: docId, spaceId } to scope the update to the correct space"

  - truth: "Split and Preview render markdown via react-markdown safely (XSS mitigated)"
    status: failed
    reason: "CR-03 Stored XSS confirmed unchanged: DocEditorArea.tsx uses <ReactMarkdown>{localContent}</ReactMarkdown> with no rehype-sanitize plugin at both lines 289 and 297. Not fixed."
    artifacts:
      - path: apps/nextjs-app/src/features/app/blocks/doc-search/DocEditorArea.tsx
        issue: "ReactMarkdown renders user-controlled content without rehypeSanitize plugin."
    missing:
      - "Install rehype-sanitize in apps/nextjs-app"
      - "Add rehypePlugins={[rehypeSanitize]} to all <ReactMarkdown> invocations in DocEditorArea.tsx"

  - truth: "DocFolder table exists in the database with correct column mapping to Prisma schema"
    status: failed
    reason: "CR-04 Schema mismatch confirmed unchanged: migration.sql creates column 'spaceId' (camelCase). schema.prisma DocFolder.spaceId String field has NO @map annotation (confirmed: model DocFolder { spaceId String — no @map). Prisma default is snake_case 'space_id'. Runtime: all docFolder queries will fail with 'column space_id does not exist'. Not fixed."
    artifacts:
      - path: packages/db-main-prisma/prisma/postgres/migrations/20260601000000_add_doc_folder_model/migration.sql
        issue: "Line 8: \"spaceId\" TEXT NOT NULL — camelCase column in database."
      - path: packages/db-main-prisma/prisma/postgres/schema.prisma
        issue: "model DocFolder { spaceId String } — no @map(\"spaceId\") annotation. Prisma will query for 'space_id' which does not exist."
    missing:
      - "Add @map(\"spaceId\") to the spaceId field in model DocFolder in schema.prisma, then run prisma generate"
      - "OR add a new migration to rename column from 'spaceId' to 'space_id' and use the Prisma default"
human_verification:
  - test: "End-to-end doc library workflow — folder creation, doc creation, auto-save re-indexation, mode switching, persistence, delete"
    expected: "All 8 steps from Plan 13-08 human checkpoint pass against the running app after CR-01/02/03/04 fixes"
    why_human: "CR-04 (runtime column mismatch) means docFolder Prisma queries will fail unless the deployed DB already has the mismatch papered over. A fresh human run post-fix is required to confirm the full stack works end-to-end."
  - test: "Verify Prisma client works against live DB after spaceId @map fix"
    expected: "prisma.docFolder.findMany() returns rows without 'column space_id does not exist' error"
    why_human: "Cannot run Prisma client or DB queries programmatically in this verification context."
---

# Phase 13: Doc Library Redesign — Verification Report (Re-verification)

**Phase Goal:** Transform the import-only doc library into a full Notion/Coda-style knowledge workspace — folder/subfolder tree in the space sidebar, in-app markdown creation and editing (CodeMirror lang-markdown), split editor+preview panel, auto-save with re-indexation, and doc API integration through the @teable/openapi SDK
**Verified:** 2026-06-02T00:00:00Z
**Status:** gaps_found
**Re-verification:** Yes — previous verification 2026-06-01T08:00:00Z had 4 gaps; re-checking gap closure

---

## Re-verification Summary

Previous score: 7/11. Current score: 7/11. **Zero gaps closed.** All 4 blockers remain in the codebase unchanged.

| Gap | Previous | Current | Change |
|-----|----------|---------|--------|
| CR-01: IDOR updateFolder/deleteFolder | FAILED | FAILED | No change |
| CR-02: IDOR updateDoc | FAILED | FAILED | No change |
| CR-03: XSS ReactMarkdown no sanitize | FAILED | FAILED | No change |
| CR-04: spaceId column mismatch | FAILED | FAILED | No change |

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | DocFolder table exists in the database (schema + migration) | FAILED (CR-04) | migration.sql creates "spaceId" camelCase column; schema.prisma `spaceId String` has no @map — Prisma will query "space_id" |
| 2 | ImportedDoc has folderId and order columns | VERIFIED | schema.prisma: folderId String? + order Float @default(0) in ImportedDoc |
| 3 | Folder CRUD via REST (list/create/rename/reorder/delete) | FAILED (CR-01) | Endpoints exist and are wired; listFolders scopes by spaceId. But updateFolder/deleteFolder have no spaceId filter — IDOR |
| 4 | Doc create/update via REST scoped to space | FAILED (CR-02) | POST creates correctly; PATCH where: { id: docId } missing spaceId — IDOR |
| 5 | EmbeddingService routes through UnifiedAiService | VERIFIED | embedding.service.ts delegates to unifiedAiService.generateEmbeddings; no direct openai call |
| 6 | pgvector startup guard logs without crashing | VERIFIED | DocSearchModule implements OnModuleInit; "pgvector extension not installed" log confirmed |
| 7 | Doc + folder endpoints callable via @teable/openapi SDK | VERIFIED | doc.ts + doc-folder.ts created; index.ts re-exports; hooks.ts imports from @teable/openapi |
| 8 | IImportedDoc carries folderId/order/rawContent optional fields | VERIFIED | packages/openapi/src/doc-search/index.ts: folderId?, order?, rawContent? confirmed |
| 9 | DocFolderTree renders hierarchy with create/rename/delete + status dots | VERIFIED | DocFolderTree.tsx: useDocFolders + useDocList; setSelectedDoc on doc click; status dot with aria-label |
| 10 | DocEditorArea: CodeMirror lang-markdown + auto-save + modes | FAILED (CR-03) | Component exists with debounce(800) + markdown(); ReactMarkdown has NO rehypeSanitize — stored XSS |
| 11 | DocLibrary splits DocFolderTree + DocEditorArea; DocViewer deleted | VERIFIED | DocLibrary.tsx uses Resizable(DocFolderTree) + flex-1(DocEditorArea); DocViewer.tsx absent; 0 references |

**Score:** 7/11 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/db-main-prisma/prisma/postgres/schema.prisma` | DocFolder model + folderId/order on ImportedDoc | STUB (runtime broken) | DocFolder model exists; spaceId missing @map — CR-04 runtime failure |
| `packages/db-main-prisma/prisma/postgres/migrations/20260601000000_add_doc_folder_model/migration.sql` | DDL for DocFolder + ImportedDoc columns | EXISTS | Creates "spaceId" camelCase column |
| `apps/nestjs-backend/src/features/doc-search/doc-folder.service.ts` | Folder CRUD with child-move-on-delete | PARTIAL (CR-01) | Exists; reparent logic present; IDOR on update/delete |
| `apps/nestjs-backend/src/features/doc-search/doc-folder.controller.ts` | 4 folder REST endpoints | EXISTS | Routes present; spaceId not passed for mutating ops |
| `apps/nestjs-backend/src/features/doc-search/doc-crud.controller.ts` | POST create + PATCH update | PARTIAL (CR-02) | POST scopes by spaceId; PATCH IDOR |
| `apps/nestjs-backend/src/features/doc-search/doc-search.module.ts` | All controllers + OnModuleInit guard | VERIFIED | DocFolderController, DocFolderService, DocCrudController registered; OnModuleInit confirmed |
| `apps/nestjs-backend/src/features/ai/unified-ai.service.ts` | generateEmbeddings(texts) method | VERIFIED | Method exists; batched OpenAI embeddings |
| `packages/openapi/src/doc-search/doc.ts` | createDoc/updateDoc + Zod schemas | VERIFIED | All SDK functions + content.max(512_000) DoS guard |
| `packages/openapi/src/doc-search/doc-folder.ts` | Folder SDK functions + schemas | VERIFIED | CreateDocFolderSchema, IDocFolder, 4 wrapper functions |
| `apps/nextjs-app/src/features/app/blocks/doc-search/hooks.ts` | SDK-based hooks, no raw fetch() | PARTIAL | SDK imports confirmed; 4 import/search endpoints remain raw fetch (documented intentional per plan action) |
| `apps/nextjs-app/src/features/app/blocks/doc-search/useDocEditorStore.ts` | Zustand store for selectedDocId/mode | VERIFIED | partialize(mode only); selectedDocId/selectedFolderId/mode + setters |
| `apps/nextjs-app/src/features/app/blocks/doc-search/DocFolderTree.tsx` | Headless-tree folder+doc hierarchy | VERIFIED | useTree with all 5 features; inline rename; context menu; status dot |
| `apps/nextjs-app/src/features/app/blocks/doc-search/DocEditorArea.tsx` | CodeMirror editor + split/preview + auto-save | PARTIAL (CR-03) | Functionally complete; ReactMarkdown missing rehypeSanitize |
| `apps/nextjs-app/src/features/app/blocks/doc-search/DocLibrary.tsx` | Resizable split layout | VERIFIED | Resizable(DocFolderTree) + flex-1(DocEditorArea) |
| `apps/nextjs-app/src/features/app/blocks/doc-search/DocViewer.tsx` | Must NOT exist | VERIFIED | File deleted; 0 references in nextjs-app/src |
| `packages/sdk/src/config/local-storage-keys.ts` | DocEditor + DocFolderTreeExpandedItems | VERIFIED | Both keys present |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| DocFolderTree.tsx | useDocEditorStore.setSelectedDoc | node primary action | VERIFIED | setSelectedDoc confirmed in component |
| DocFolderTree.tsx | useDocFolders / useCreateDocFolder | react-query hooks | VERIFIED | hooks.ts imports from @teable/openapi confirmed |
| DocLibrary.tsx | DocFolderTree + DocEditorArea | Resizable split panel | VERIFIED | Both components in flex container |
| DocEditorArea.tsx | useUpdateDoc (PATCH) | lodash/debounce 800ms | VERIFIED | debounce(800) + saveRef pattern confirmed |
| DocEditorArea.tsx | useDocEditorStore | mode + selectedDocId | VERIFIED | useDocEditorStore() destructuring confirmed |
| doc-crud.controller.ts PATCH | DOC_INGEST_QUEUE | queue.add('reindex') | VERIFIED | Reindex job queued with docId + spaceId |
| embedding.service.ts | UnifiedAiService.generateEmbeddings | delegation | VERIFIED | return this.unifiedAiService.generateEmbeddings(texts) |
| doc-folder.controller.ts update/delete | spaceId ownership | DocFolderService(spaceId, folderId) | FAILED (CR-01) | Controller passes only folderId; service has no spaceId filter |
| doc-crud.controller.ts PATCH | spaceId ownership | prisma.importedDoc.update where: {id, spaceId} | FAILED (CR-02) | where: { id: docId } only |
| DocEditorArea.tsx ReactMarkdown | rehypeSanitize | rehypePlugins prop | FAILED (CR-03) | No sanitization plugin |
| schema.prisma DocFolder.spaceId | migration "spaceId" column | @map("spaceId") annotation | FAILED (CR-04) | spaceId String — no @map |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| D-01 | 13-07 | Inner split layout (tree + editor in SpaceInnerLayout) | SATISFIED | DocLibrary.tsx confirmed |
| D-02 | 13-05 | Folder tree following BaseNodeTree pattern | SATISFIED | DocFolderTree.tsx with headless-tree |
| D-03 | 13-06 | CodeMirror lang-markdown editor | SATISFIED | @codemirror/lang-markdown installed; markdown() used |
| D-04 | 13-05, 13-06 | Zustand store, mode persisted | SATISFIED | useDocEditorStore.ts confirmed |
| D-05 | 13-03, 13-06 | Auto-save 800ms + re-indexation | SATISFIED | debounce + queue.add('reindex') + isIndexed=false |
| D-06 | 13-03, 13-05 | New doc creation via POST | SATISFIED | DocCrudController POST + useCreateDoc + setSelectedDoc |
| D-07 | 13-07 | DocViewer.tsx deleted | SATISFIED | File absent; no references |
| D-08 | 13-04 | @teable/openapi SDK for doc/folder endpoints | PARTIAL | SDK modules exist; 4 out-of-scope endpoints remain raw fetch (intentional per plan) |
| D-09 | 13-03 | EmbeddingService via UnifiedAiService | SATISFIED | Delegation confirmed; no direct OpenAI call |
| D-10 | 13-03 | pgvector guard — non-fatal | SATISFIED | OnModuleInit + try/catch + log message |
| D-11 | 13-01, 13-02 | DocFolder model + ImportedDoc folderId/order | BLOCKED (CR-01, CR-04) | Schema/migration exists but spaceId @map missing (CR-04); IDOR on folder CRUD (CR-01) |

Note: .planning/REQUIREMENTS.md does not exist — D-01 through D-11 IDs sourced from PLAN frontmatter only.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| apps/nestjs-backend/src/features/doc-search/doc-folder.service.ts | 35, 39 | No spaceId filter on updateFolder/deleteFolder | BLOCKER (CR-01) | IDOR: cross-space folder mutation |
| apps/nestjs-backend/src/features/doc-search/doc-crud.controller.ts | ~50 | updateDoc where: { id: docId } only | BLOCKER (CR-02) | IDOR: cross-space doc overwrite |
| apps/nextjs-app/src/features/app/blocks/doc-search/DocEditorArea.tsx | 289, 297 | ReactMarkdown without rehypeSanitize | BLOCKER (CR-03) | Stored XSS via markdown preview |
| packages/db-main-prisma/prisma/postgres/schema.prisma | DocFolder model | spaceId String missing @map("spaceId") | BLOCKER (CR-04) | Runtime: all docFolder queries fail |
| apps/nestjs-backend/src/features/doc-search/doc-folder.service.ts | 39-49 | Non-atomic delete — no $transaction | WARNING (WR-01) | DB inconsistency on crash between reparent steps |
| apps/nextjs-app/src/features/app/blocks/doc-search/DocEditorArea.tsx | ~62-85 | Debounce not cancelled on unmount | WARNING (WR-02) | Stale network request after component unmount |

---

### Human Verification Required

#### 1. End-to-End Doc Library Smoke Test (post-fix)

**Test:** After CR-01/02/03/04 are fixed, visit the running app (port 3000), open a space, navigate to Doc Library (/space/[spaceId]/doc-library). Create a folder, rename it, create a doc, type markdown, confirm auto-save indicator and status dot green transition. Toggle Split then Preview modes. Ask the AI agent a question from the doc's content; confirm search_knowledge_base returns it. Delete the doc; reload the page.
**Expected:** All 8 steps from Plan 13-08 human checkpoint pass.
**Why human:** CR-04 runtime column mismatch makes all docFolder Prisma queries suspect until verified against the live DB. A post-fix browser run is required to confirm the full end-to-end stack.

#### 2. Prisma Client Runtime Verification

**Test:** After adding @map("spaceId") to schema.prisma DocFolder and running prisma generate, call GET /api/spaces/:spaceId/doc-folders. Check backend logs.
**Expected:** 200 response; no "column space_id does not exist" Prisma error.
**Why human:** Cannot execute Prisma client or DB queries programmatically in this verification context.

---

## Gaps Summary

**All 4 blockers from the initial verification remain open.** No code changes were made to address CR-01, CR-02, CR-03, or CR-04 between the first verification (2026-06-01) and this re-verification (2026-06-02).

**CR-01 (IDOR — folder mutations):** `doc-folder.service.ts` `updateFolder(folderId, data)` and `deleteFolder(folderId)` signatures confirmed unchanged — no spaceId parameter. Fix: add spaceId to signatures and where clauses; thread from controller.

**CR-02 (IDOR — doc update):** `doc-crud.controller.ts` PATCH handler confirmed: `where: { id: docId }` — no spaceId. Fix: change to `where: { id: docId, spaceId }`.

**CR-03 (Stored XSS):** `DocEditorArea.tsx` lines 289 and 297 confirmed: `<ReactMarkdown>{localContent}</ReactMarkdown>` with no rehype plugin. Fix: install rehype-sanitize, add `rehypePlugins={[rehypeSanitize]}`.

**CR-04 (Prisma/DB mismatch):** `model DocFolder { spaceId String }` confirmed — no @map annotation. Migration SQL column is `"spaceId"` camelCase. Fix: add `@map("spaceId")` and regenerate client.

---

_Verified: 2026-06-02T00:00:00Z_
_Verifier: Claude (gsd-verifier)_
