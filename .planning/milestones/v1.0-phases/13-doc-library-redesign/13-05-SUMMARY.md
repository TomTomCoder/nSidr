---
phase: 13-doc-library-redesign
plan: "05"
subsystem: doc-library-ui
tags: [zustand, headless-tree, react-query, doc-library, folder-tree]
dependency_graph:
  requires: ["13-04"]
  provides: ["useDocEditorStore", "DocFolderTree"]
  affects: ["13-06", "13-07", "13-08"]
tech_stack:
  added: []
  patterns: ["zustand-persist-partialize", "headless-tree-stable-ref", "tree-item-union-type"]
key_files:
  created:
    - apps/nextjs-app/src/features/app/blocks/doc-search/useDocEditorStore.ts
    - apps/nextjs-app/src/features/app/blocks/doc-search/DocFolderTree.tsx
  modified:
    - packages/sdk/src/config/local-storage-keys.ts
decisions:
  - "Helper functions extracted (buildFolderItems, buildDocItems, addChildToParent, buildChildrenAndRoot) to reduce cognitive complexity below sonarjs threshold of 15"
  - "useLocalStorage Updater<T> wrapped in a function to bridge type gap with useTree setExpandedItems"
  - "eslint-disable comments retained for jsx-a11y/no-static-element-interactions on the context menu container div (same pattern as BaseNodeTree.tsx)"
metrics:
  duration: "~15 minutes"
  completed: "2026-06-01T20:37:00Z"
  tasks_completed: 2
  files_modified: 3
---

# Phase 13 Plan 05: useDocEditorStore + DocFolderTree Summary

Zustand persisted store for doc editor selection state and a headless-tree folder/doc hierarchy with inline rename, context menu, index status dots, and delete confirmation dialog.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | useDocEditorStore + LocalStorageKeys entries | 88d434a77 | local-storage-keys.ts, useDocEditorStore.ts |
| 2 | DocFolderTree component | adebf8a4b | DocFolderTree.tsx |

## What Was Built

**useDocEditorStore.ts** — Zustand store with `selectedDocId`, `selectedFolderId`, `mode: 'edit'|'split'|'preview'` and matching setters. Persisted under `LocalStorageKeys.DocEditor`; `partialize` retains only `mode` across page reloads (selectedDocId/selectedFolderId reset on mount per D-04).

**LocalStorageKeys** — Added `DocEditor = 'ls_doc_editor'` and `DocFolderTreeExpandedItems = 'ls_doc_folder_tree_expanded'`.

**DocFolderTree.tsx** — Complete headless-tree hierarchy component:
- `DocTreeItemData` union type (folder | doc), `ROOT_ID` sentinel
- `treeItems` assembled from `useDocFolders` + `useDocList` via memoized helper functions; children arrays built and sorted by `order`
- `dataLoader` memoized via stable `treeItemsRef` (Pitfall 4)
- `useTree` configured with all 5 features: `syncDataLoaderFeature`, `selectionFeature`, `hotkeysCoreFeature`, `dragAndDropFeature`, `keyboardDragAndDropFeature`
- Panel header: Folder icon + "Knowledge Base" + New Folder + Import ghost icon buttons with Tooltips
- Tree rows at `h-8`: folders show ChevronDownIcon (rotates -90° when collapsed), docs show FileText icon + ItemStatus dot
- `ItemStatus` dot: `bg-emerald-500` (indexed) / `bg-yellow-500` (pending), `size-1.5`, `aria-label`
- Context menu (DropdownMenu): Rename, New Document (folders only), separator, Delete (text-destructive)
- Delete triggers AlertDialog with UI-SPEC copy (folder/doc variants)
- Inline rename: `InlineRenameInput` sub-component, Enter=save, Escape=cancel
- On doc primary action: `setSelectedDoc(id)`; New Document: `useCreateDoc` then `setSelectedDoc`
- Expand state persisted via `useLocalStorage(LocalStorageKeys.DocFolderTreeExpandedItems)`
- Empty state: "No documents yet" heading + descriptive body text

## Deviations from Plan

**1. [Rule 1 - Architecture] Helper functions extracted to satisfy sonarjs/cognitive-complexity**
- **Found during:** Task 2 lint-staged
- **Issue:** `buildChildrenAndRoot` and `treeItems` useMemo had cognitive complexity > 15 (sonarjs threshold)
- **Fix:** Extracted `buildFolderItems`, `buildDocItems`, `addChildToParent`, `buildChildrenAndRoot` as module-level helpers; `handleSaveRename` kept inline but cognitive-complexity reduced by extracting `InlineRenameInput` sub-component
- **Files modified:** DocFolderTree.tsx

**2. [Rule 1 - Type] useLocalStorage Updater<T> bridge**
- **Found during:** Task 2 TypeScript check
- **Issue:** `useTree` passes `Updater<string[]>` to `setExpandedItems` but `useLocalStorage` expects `SetStateAction<string[] | undefined>`
- **Fix:** Wrapped `setExpandedItems` in `(updater) => setExpandedItems((prev) => typeof updater === 'function' ? updater(current) : updater)`
- **Files modified:** DocFolderTree.tsx

## Known Stubs

None — all interactions call real SDK hooks.

## Threat Surface Scan

Client-side UI only. No new network endpoints. Mutations go through existing SDK hooks from Plan 13-04 (Zod-validated on the API side per T-13-08). No new trust boundaries introduced.

## Self-Check

- [x] `apps/nextjs-app/src/features/app/blocks/doc-search/useDocEditorStore.ts` — FOUND
- [x] `apps/nextjs-app/src/features/app/blocks/doc-search/DocFolderTree.tsx` — FOUND
- [x] `packages/sdk/src/config/local-storage-keys.ts` — FOUND (DocEditor + DocFolderTreeExpandedItems)
- [x] Commit 88d434a77 — Task 1
- [x] Commit adebf8a4b — Task 2

## Self-Check: PASSED
