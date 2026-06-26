---
phase: 13-doc-library-redesign
plan: "06"
subsystem: doc-library-ui
tags: [codemirror, react-markdown, markdown-editor, auto-save, doc-library]
dependency_graph:
  requires: ["13-05"]
  provides: ["DocEditorArea"]
  affects: ["13-07", "13-08"]
tech_stack:
  added:
    - "@codemirror/lang-markdown@6.5.0 (markdown syntax support)"
    - "react-markdown@9.0.1 (safe markdown rendering — no raw HTML injection)"
  patterns:
    - "two-useEffect-codemirror (init deps [theme]; sync deps [value])"
    - "stable-saveRef-debounce (800ms auto-save via saveRef.current)"
    - "zustand-store-mode-bind (ToggleGroup bound to useDocEditorStore)"
key_files:
  created:
    - apps/nextjs-app/src/features/app/blocks/doc-search/DocEditorArea.tsx
  modified:
    - apps/nextjs-app/package.json
decisions:
  - "Two-useEffect CodeMirror lifecycle: init on [theme] only; value sync on [localContent] — prevents view recreation on each keystroke (Pitfall 2)"
  - "react-markdown added to nextjs-app/package.json (was only in packages/sdk — Pitfall 1 fix)"
  - "T-13-09 mitigated: ReactMarkdown component used for both split and preview modes (T-13-09)"
  - "Title also debounced (500ms) and PATCHed on change"
metrics:
  duration: "~10 minutes"
  completed: "2026-06-01T20:43:00Z"
  tasks_completed: 2
  files_modified: 2
---

# Phase 13 Plan 06: DocEditorArea Summary

CodeMirror `lang-markdown` editor with Edit/Split/Preview modes, 800ms debounced auto-save with re-indexation, a toolbar showing breadcrumb + index status badge + transient save indicator, title input, and a no-doc empty state.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Install @codemirror/lang-markdown + react-markdown | 52913b8c2 | apps/nextjs-app/package.json |
| 2 | DocEditorArea component | 52913b8c2 | DocEditorArea.tsx |

## What Was Built

**DocEditorArea.tsx** — Full editing surface for the knowledge workspace:

- `useDocEditorStore` binds `selectedDocId`, `mode`, `setMode` from Zustand store (D-04)
- `useDoc` loads selected doc content + title + isIndexed; `useDocFolders` provides folder names for breadcrumb
- **CodeMirror init `useEffect`** deps `[theme]` only — extensions include `history()`, `drawSelection()`, `dropCursor()`, `markdown()`, `EditorView.lineWrapping`, `syntaxHighlighting(defaultHighlightStyle)`, `oneDark` in dark mode, `keymap.of([defaultKeymap, historyKeymap])`, `EditorView.theme` with 16px content padding
- **Value-sync `useEffect`** deps `[localContent]` — dispatches changes without recreating the view (Pitfall 2)
- **Auto-save**: `saveRef.current` pattern with `debounce(800)` calls `useUpdateDoc` PATCH `{ content }`; setSaveStatus cycles saving -> saved -> fades after 2s
- **Title input**: `text-lg font-semibold`, borderless, debounced (500ms) title PATCH
- **Toolbar** (`h-10`, `border-b`, `px-4`): breadcrumb (folder > doc, text-xs muted), `ToggleGroup` (Edit/Split/Preview) bound to `setMode`, index `Badge` (Indexed/Indexing...), Saving/Saved indicator
- **Modes**: edit = CodeMirror full-width; split = `flex h-full` w-1/2 CodeMirror + w-1/2 ReactMarkdown `prose prose-sm`; preview = ReactMarkdown full-width
- **XSS mitigation (T-13-09)**: ReactMarkdown component used exclusively — raw HTML strings are never injected into the DOM
- **Empty state**: FolderOpen 48px, "Select a document" heading, descriptive body text
- **Loading skeleton**: 3-row animate-pulse when doc is loading

## Deviations from Plan

**1. [Rule 3 - Dependency] Package installs committed to worktree package.json**
- **Found during:** Task 1
- **Issue:** `pnpm --filter` was run in the main checkout, not the worktree; worktree's package.json lacked the new deps
- **Fix:** Edited worktree's `apps/nextjs-app/package.json` to add `@codemirror/lang-markdown@6.5.0` and `react-markdown@9.0.1` directly (same versions installed in main checkout)
- **Files modified:** apps/nextjs-app/package.json (worktree copy)

**2. [Rule 2 - Missing error handling] saveStatus reset on PATCH failure**
- **Found during:** Task 2 implementation
- **Issue:** Plan spec did not mention error state for save failure
- **Fix:** Added `catch (_e) { setSaveStatus('idle'); }` on the updateDoc call to prevent a stuck "Saving..." indicator
- **Files modified:** DocEditorArea.tsx

## Known Stubs

None — DocEditorArea reads real doc content via `useDoc` and PATCHes via `useUpdateDoc`.

## Threat Surface Scan

| Flag | File | Description |
|------|------|-------------|
| threat_flag: markdown-xss-mitigated | DocEditorArea.tsx | T-13-09 mitigated — ReactMarkdown (safe by default) used for all markdown rendering |

No new network endpoints. All mutations through existing SDK hooks.

## Self-Check

- [x] `apps/nextjs-app/src/features/app/blocks/doc-search/DocEditorArea.tsx` — FOUND
- [x] `apps/nextjs-app/package.json` — updated with @codemirror/lang-markdown@6.5.0 and react-markdown@9.0.1
- [x] Commit 52913b8c2 — Task 1 + Task 2

## Self-Check: PASSED
