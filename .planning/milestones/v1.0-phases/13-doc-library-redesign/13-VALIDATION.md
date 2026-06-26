---
phase: 13
slug: doc-library-redesign
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-01
---

# Phase 13 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (backend) + tsc --noEmit (frontend) |
| **Config file** | `apps/nestjs-backend/vitest.config.ts` |
| **Quick run command** | `pnpm -F @teable/backend test --run --testPathPattern="doc-folder\|doc-crud\|embedding"` |
| **Full suite command** | `pnpm -F @teable/backend test --run && pnpm -F @teable/app exec tsc --noEmit` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick command
- **After every plan wave:** Run full suite command
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Automated Command | Status |
|---------|------|------|-------------|-------------------|--------|
| 13-01-T1 | 01 | 1 | D-11 | `grep -q "model DocFolder" packages/db-main-prisma/prisma/postgres/schema.prisma && grep -A40 "model ImportedDoc" packages/db-main-prisma/prisma/postgres/schema.prisma \| grep -q "folderId"` | ⬜ pending |
| 13-01-T2 | 01 | 1 | D-11 | `ls packages/db-main-prisma/prisma/postgres/migrations/*add_doc_folder*/migration.sql && grep -q "CREATE TABLE" packages/db-main-prisma/prisma/postgres/migrations/*add_doc_folder*/migration.sql` | ⬜ pending |
| 13-02-T1 | 02 | 2 | D-11 | `pnpm -F @teable/backend test --run --testPathPattern="doc-folder.service.spec"` | ⬜ pending |
| 13-02-T2 | 02 | 2 | D-11 | `grep -q "DocFolderController" apps/nestjs-backend/src/features/doc-search/doc-search.module.ts && pnpm -F @teable/backend exec tsc --noEmit -p tsconfig.json 2>&1 \| grep -c "doc-folder" \| grep -q '^0$'` | ⬜ pending |
| 13-03-T1 | 03 | 2 | D-09 | `pnpm -F @teable/backend test --run --testPathPattern="embedding.service.spec"` | ⬜ pending |
| 13-03-T2 | 03 | 2 | D-05, D-06 | `pnpm -F @teable/backend test --run --testPathPattern="doc-crud.controller.spec"` | ⬜ pending |
| 13-03-T3 | 03 | 2 | D-10 | `grep -q "OnModuleInit" apps/nestjs-backend/src/features/doc-search/doc-search.module.ts && grep -q "pgvector extension not installed" apps/nestjs-backend/src/features/doc-search/doc-search.module.ts` | ⬜ pending |
| 13-04-T1 | 04 | 3 | D-08 | `pnpm -F @teable/openapi exec tsc --noEmit 2>&1 \| grep -v '^#' \| grep -c "doc-folder" \| grep -q '^0$' && grep -q "from './doc-folder'" packages/openapi/src/doc-search/index.ts` | ⬜ pending |
| 13-04-T2 | 04 | 3 | D-08 | `grep -v '^//' apps/nextjs-app/src/features/app/blocks/doc-search/hooks.ts \| grep -c "fetch(" \| grep -q '^0$' && grep -q "from '@teable/openapi'" apps/nextjs-app/src/features/app/blocks/doc-search/hooks.ts` | ⬜ pending |
| 13-05-T1 | 05 | 4 | D-04 | `grep -q "DocEditor = 'ls_doc_editor'" packages/sdk/src/config/local-storage-keys.ts && grep -q "useDocEditorStore" apps/nextjs-app/src/features/app/blocks/doc-search/useDocEditorStore.ts` | ⬜ pending |
| 13-05-T2 | 05 | 4 | D-02 | `pnpm -F @teable/app exec tsc --noEmit 2>&1 \| grep -v '^#' \| grep -c "DocFolderTree" \| grep -q '^0$'` | ⬜ pending |
| 13-06-T1 | 06 | 5 | D-03 | `grep -q "@codemirror/lang-markdown" apps/nextjs-app/package.json && node -e "require.resolve('react-markdown', { paths: ['apps/nextjs-app'] })" 2>/dev/null && echo OK` | ⬜ pending |
| 13-06-T2 | 06 | 5 | D-03, D-04, D-05 | `pnpm -F @teable/app exec tsc --noEmit 2>&1 \| grep -v '^#' \| grep -c "DocEditorArea" \| grep -q '^0$'` | ⬜ pending |
| 13-07-T1 | 07 | 6 | D-01 | `grep -q "Resizable" apps/nextjs-app/src/features/app/blocks/doc-search/DocLibrary.tsx && grep -q "DocFolderTree" apps/nextjs-app/src/features/app/blocks/doc-search/DocLibrary.tsx && grep -q "DocEditorArea" apps/nextjs-app/src/features/app/blocks/doc-search/DocLibrary.tsx` | ⬜ pending |
| 13-07-T2 | 07 | 6 | D-07 | `test ! -f apps/nextjs-app/src/features/app/blocks/doc-search/DocViewer.tsx && ! grep -rn "DocViewer" apps/nextjs-app/src 2>/dev/null` | ⬜ pending |
| 13-08-T1 | 08 | 7 | ALL | `pnpm -F @teable/backend test --run --testPathPattern="doc-folder.service.spec\|doc-crud.controller.spec\|embedding.service.spec"` | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements:
- vitest is already configured in `apps/nestjs-backend/vitest.config.ts`
- TypeScript compiler checks cover frontend components
- No new test framework installation required

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Folder tree renders with drag-drop reorder | D-02 | Browser interaction required | Navigate to doc-library, create 2 folders, drag one above the other, confirm order persists after reload |
| Split/preview mode toggle | D-04 | Visual state requires browser | Open a doc, click Edit→Split→Preview, confirm CodeMirror hides in preview mode, rendered MD visible |
| Auto-save triggers re-indexation | D-05 | Requires timing + status dot | Edit doc content, wait 900ms, confirm status dot turns yellow then green; confirm vector search returns updated content |
| E2E workspace flow | GOAL | Full workflow | Create folder → create doc → type content → wait for index → open agent chat → ask question answered by doc content |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (none — existing infra)
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending execution
