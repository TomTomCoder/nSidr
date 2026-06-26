---
phase: 13-doc-library-redesign
plan: "07"
subsystem: doc-library
tags: [composition, split-layout, resizable, doc-viewer-removal]
dependency_graph:
  requires: ["13-05", "13-06"]
  provides: ["DocLibrary-split-layout", "DocViewer-removed"]
  affects: ["doc-library page route"]
tech_stack:
  added: []
  patterns: ["Resizable split panel (re-resizable, matching Sidebar.tsx pattern)"]
key_files:
  created: []
  modified:
    - apps/nextjs-app/src/features/app/blocks/doc-search/DocLibrary.tsx
    - apps/nextjs-app/src/features/app/blocks/doc-search/index.ts
  deleted:
    - apps/nextjs-app/src/features/app/blocks/doc-search/DocViewer.tsx
decisions:
  - "Used onImportClick prop name to match DocFolderTree's existing API (not onImport)"
  - "Resizable handle styled identically to Sidebar.tsx (6px width, right: -6px, group-hover primary)"
metrics:
  duration: "~10 minutes"
  completed: "2026-06-01"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 3
---

# Phase 13 Plan 07: DocLibrary Composition (Split Layout + DocViewer Removal) Summary

**One-liner:** Rewired DocLibrary into a re-resizable split (240px DocFolderTree + flex-1 DocEditorArea) and deleted the fullscreen DocViewer modal entirely.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Refactor DocLibrary.tsx to inner split layout | f7f14951e | DocLibrary.tsx |
| 2 | Delete DocViewer.tsx + remove all references | c4fc5f24a | DocViewer.tsx (deleted), index.ts |

## What Was Built

**Task 1 — DocLibrary rewrite:**
- Replaced the old flex-col document list (with `selectedDoc`/`showSearch` local state + DocViewer modal) with a `flex h-full overflow-hidden` container.
- Added `<Resizable>` wrapper (defaultSize width 240, minWidth 160, maxWidth 400, enable right) matching the Sidebar.tsx handle pattern exactly.
- `<DocFolderTree spaceId={spaceId} onImportClick={...}>` occupies the resizable left pane.
- `<DocEditorArea spaceId={spaceId}>` fills the right `flex-1 overflow-hidden` div.
- DocImportPanel still triggered via `onImportClick` callback from the tree header.
- `useDocEditorStore` owns document selection — no local state duplication.

**Task 2 — DocViewer deletion:**
- Deleted `DocViewer.tsx` (fullscreen modal viewer replaced by inline DocEditorArea).
- Removed `export { DocViewer }` from `index.ts` barrel.
- Verified zero remaining references to `DocViewer` under `apps/nextjs-app/src/`.

## Deviations from Plan

**1. [Rule 1 - Bug] Correct prop name for import trigger**
- **Found during:** Task 1
- **Issue:** Plan said `onImport` but DocFolderTree.tsx declares `onImportClick?: () => void`.
- **Fix:** Used `onImportClick` to match the existing interface.
- **Files modified:** DocLibrary.tsx
- **Commit:** f7f14951e

**2. [Rule 3 - Blocking] Worktree missing node_modules**
- **Found during:** Task 1 commit
- **Issue:** Worktree had no `node_modules`; lint-staged/eslint couldn't resolve `re-resizable`.
- **Fix:** Created symlinks: `node_modules` → main repo root, `apps/nextjs-app/node_modules` → main repo app node_modules.
- **Commit:** No separate commit (infrastructure fix, untracked symlinks).

## Self-Check

### Files created/deleted verified:
- DocViewer.tsx deleted: FOUND (file absent, confirmed)
- DocLibrary.tsx modified: FOUND
- index.ts modified: FOUND

### Commits verified:
- f7f14951e — refactor(13-07): rewrite DocLibrary to inner split layout
- c4fc5f24a — feat(13-07): delete DocViewer.tsx and remove all references

## Self-Check: PASSED

## Known Stubs

None — DocFolderTree and DocEditorArea are fully wired; selection flows through `useDocEditorStore`.

## Threat Flags

None — composition-only plan, no new input boundaries or trust surfaces introduced.
