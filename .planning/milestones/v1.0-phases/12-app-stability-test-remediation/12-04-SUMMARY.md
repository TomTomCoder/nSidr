---
phase: 12-app-stability-test-remediation
plan: "04"
subsystem: doc-search
tags: [doc-search, global-panel, layout, keyboard-shortcut, AppProviders]
dependency_graph:
  requires: [12-02]
  provides: [global-doc-search-panel-mount]
  affects: [apps/nextjs-app/src/AppProviders.tsx]
tech_stack:
  added: [zustand, next/router Pages Router pattern]
  patterns: [store-keyed conditional render, layout-level overlay mount]
key_files:
  created:
    - apps/nextjs-app/src/features/app/blocks/doc-search/GlobalDocSearchPanel.tsx
    - apps/nextjs-app/src/features/app/blocks/doc-search/DocSearchPanel.tsx
    - apps/nextjs-app/src/features/app/blocks/doc-search/DocImportPanel.tsx
    - apps/nextjs-app/src/features/app/blocks/doc-search/DocViewer.tsx
    - apps/nextjs-app/src/features/app/blocks/doc-search/DocLibrary.tsx
    - apps/nextjs-app/src/features/app/blocks/doc-search/hooks.ts
    - apps/nextjs-app/src/features/app/blocks/doc-search/useDocSearchStore.ts
    - apps/nextjs-app/src/features/app/blocks/doc-search/useDocSearchKeyboardShortcut.ts
    - apps/nextjs-app/src/features/app/blocks/doc-search/index.ts
    - packages/openapi/src/doc-search/index.ts
  modified:
    - apps/nextjs-app/src/AppProviders.tsx
    - packages/openapi/src/index.ts
decisions:
  - GlobalDocSearchPanel uses next/router (Pages Router) not next/navigation
  - onSelectResult closes the panel (minimal behavior, no crash)
  - Phase 7 doc-search files ported to worktree since branch predates Phase 7
metrics:
  duration: "~9 minutes"
  completed: "2026-05-31T09:56:35Z"
  tasks_completed: 2
  tasks_total: 3
  files_created: 11
  files_modified: 2
---

# Phase 12 Plan 04: Global Doc Search Panel Mount Summary

**One-liner:** GlobalDocSearchPanel layout-level mount keyed to useDocSearchStore.isOpen and next/router spaceId, wiring Cmd+Shift+K shortcut to actual panel render.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create GlobalDocSearchPanel layout-level component | 8437be52c | GlobalDocSearchPanel.tsx + all Phase 7 doc-search files ported |
| 2 | Mount GlobalDocSearchPanel in AppProviders | 22ef3d22c | AppProviders.tsx |

## What Was Built

`GlobalDocSearchPanel` is a thin wrapper that:
1. Reads `spaceId` from `useRouter().query.spaceId` (Pages Router; arrays take first element)
2. Reads `isOpen` and `closeDocSearch` from `useDocSearchStore`
3. Returns `null` when `spaceId` is undefined OR `isOpen` is false (no-op outside a space route)
4. Renders `<DocSearchPanel spaceId={spaceId} open={isOpen} onClose={closeDocSearch} onSelectResult={handleSelectResult} />`

`AppProviders` now has:
- `KeyboardShortcutInitializer` component that calls `useDocSearchKeyboardShortcut()` to wire Cmd+Shift+K
- `<GlobalDocSearchPanel />` rendered as sibling of Toasters inside `ConfirmModalProvider`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical Functionality] Phase 7 doc-search files ported to worktree**
- **Found during:** Task 1
- **Issue:** The worktree branch predates Phase 7. The entire `doc-search` directory did not exist in the worktree, nor did the `@teable/openapi` doc-search types (`IDocSearchResult`, etc.). The plan assumed these files were present as pre-requisites.
- **Fix:** Ported all Phase 7 doc-search files from the main branch into the worktree: `DocSearchPanel.tsx`, `DocImportPanel.tsx`, `DocViewer.tsx`, `DocLibrary.tsx`, `hooks.ts`, `useDocSearchStore.ts`, `useDocSearchKeyboardShortcut.ts`, `index.ts`, and `packages/openapi/src/doc-search/index.ts`. Added `export * from './doc-search'` to `packages/openapi/src/index.ts`.
- **Files modified:** All files listed in key_files.created above
- **Commit:** 8437be52c

## Checkpoint Status

Task 3 is a `checkpoint:human-verify` requiring browser verification:
- Navigate to a space route and press Cmd+Shift+K — DocSearchPanel overlay should appear
- Press Escape or click backdrop — panel should close
- On a non-space route the shortcut should be a no-op

The app must be running on http://localhost:3001 for verification.

## Known Stubs

`onSelectResult` in `GlobalDocSearchPanel` simply calls `closeDocSearch()`. Selecting a result does not navigate to the doc-library page. This is intentional minimal behavior per plan guidance ("pick the minimal behavior that does not crash"). A future plan can wire navigation.

## Threat Flags

None — no new network endpoints, auth paths, or schema changes introduced by this plan.

## Self-Check: PASSED

- `GlobalDocSearchPanel.tsx` exists: confirmed
- `AppProviders.tsx` imports and renders GlobalDocSearchPanel: confirmed
- Commit 8437be52c exists: confirmed
- Commit 22ef3d22c exists: confirmed
- No TypeScript errors introduced by the new files (pre-existing errors unrelated to this plan)
