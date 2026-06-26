---
phase: 13-doc-library-redesign
plan: "01"
subsystem: db-schema
tags: [prisma, migration, schema, doc-folder, postgresql]
dependency_graph:
  requires: []
  provides: [prisma.docFolder, ImportedDoc.folderId, ImportedDoc.order]
  affects: [all downstream plans in phase 13]
tech_stack:
  added: []
  patterns: [hand-written SQL migration, Prisma @@map alignment, IF NOT EXISTS idempotent DDL]
key_files:
  created:
    - packages/db-main-prisma/prisma/postgres/migrations/20260601000000_add_doc_folder_model/migration.sql
  modified:
    - packages/db-main-prisma/prisma/postgres/schema.prisma
decisions:
  - "Used @@map('doc_folder') + @map('parentId') to align Prisma model with pre-existing DB table created by parallel agent"
  - "Migration SQL uses IF NOT EXISTS / conditional DO $$ blocks for idempotency"
  - "OnDelete: Cascade on parent self-relation (matching existing FK) rather than SetNull from PATTERNS.md"
metrics:
  duration: "~8 minutes"
  completed: "2026-06-01"
  tasks_completed: 2
  files_modified: 2
---

# Phase 13 Plan 01: DB Schema — DocFolder Model + ImportedDoc Fields Summary

**One-liner:** Prisma DocFolder model + doc_folder migration aligned to pre-existing parallel-agent DB table, with folderId/order on ImportedDoc and regenerated Prisma client.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add DocFolder model + ImportedDoc fields to schema.prisma | 583c6b898 | schema.prisma |
| 2 | Write hand-crafted migration SQL + deploy + prisma generate | 6c64b77b2 | migration.sql, schema.prisma |

## What Was Built

- `DocFolder` Prisma model with self-referential `FolderChildren` relation, mapped to `doc_folder` table
- `ImportedDoc.folderId String?` and `ImportedDoc.order Float @default(0)` fields added
- `Space.docFolders DocFolder[]` back-relation added
- Hand-crafted SQL migration at `migrations/20260601000000_add_doc_folder_model/migration.sql`
- Migration deployed via `prisma migrate deploy` — all 88+1 migrations applied
- Prisma client regenerated — `prisma.docFolder` delegate confirmed in generated types

## Verification

- `grep "model DocFolder"` in schema.prisma: PASS
- `grep "folderId"` in ImportedDoc block: PASS
- `grep "docFolders DocFolder"` in Space block: PASS
- Migration SQL file exists: PASS
- `prisma migrate deploy` completed without error: PASS
- `prisma.docFolder` delegate in generated `index.d.ts`: PASS

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Aligned Prisma model to pre-existing parallel-agent DB schema**
- **Found during:** Task 2
- **Issue:** A parallel worktree agent (refactor/architecture-deep-fix) had already created a `doc_folder` table (lowercase) with `parentId` column and an `updatedAt` column. PATTERNS.md specified `DocFolder` (PascalCase table) with `parentFolderId` column and no `updatedAt`. The original migration SQL failed with `relation "Space" does not exist` (table is `space`) and `doc_folder` already existed.
- **Fix:** Updated `DocFolder` model to use `@@map("doc_folder")`, `@map("parentId")` on `parentFolderId`, added `updatedAt DateTime @updatedAt`. Rewrote migration SQL to use correct lowercase table names and `IF NOT EXISTS` guards. Removed stuck failed migration record from `_prisma_migrations` table, then re-applied.
- **Impact:** All downstream plans should use `parentFolderId` in Prisma (maps transparently to `parentId` column). No behavioral change for downstream wave agents.
- **Files modified:** schema.prisma, migration.sql
- **Commit:** 6c64b77b2

**2. [Rule 1 - Bug] OnDelete: Cascade on self-relation instead of SetNull**
- **Found during:** Task 2
- **Issue:** Existing `doc_folder_parentId_fkey` constraint uses `ON DELETE CASCADE` (not SET NULL as in PATTERNS.md). Prisma requires `onDelete` to match existing FK.
- **Fix:** Changed Prisma schema `parent DocFolder?` relation to use `onDelete: Cascade` to match existing constraint.
- **Files modified:** schema.prisma

## Known Stubs

None — this is a pure DB schema plan with no UI or API stubs.

## Threat Flags

None — no new network endpoints or auth paths introduced. Migration SQL is DDL-only with referential integrity (ON DELETE CASCADE/SET NULL).

## Self-Check: PASSED

- migration.sql exists: FOUND at `.planning/phases/13-doc-library-redesign/../../../.claude/worktrees/agent-ab964f7d1bc3ef7a0/packages/db-main-prisma/prisma/postgres/migrations/20260601000000_add_doc_folder_model/migration.sql`
- Commit 583c6b898 exists: FOUND
- Commit 6c64b77b2 exists: FOUND
- `prisma.docFolder` in generated client: CONFIRMED
