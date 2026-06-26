# Doc Library — Feature / Functionality Test Matrix

Goal: enumerate every doc-library feature, test it via the UI, fix issues progressively.
Status legend: ⬜ untested · ✅ pass · 🔧 fixed · ❌ broken (open)

## Folder tree & navigation

- F-01 ✅ List folders + docs in the tree (Knowledge Base panel)
- F-02 ✅ New Folder creates a folder (2→3)
- F-03 ✅ New Document creates a doc and opens it (3→4)
- F-04 ✅ Select a doc → opens in the editor
- F-05 ⬜ Expand/collapse folder (not explicitly exercised)
- F-06 ✅ Rename doc (inline) — "QA Test Doc" → "QA Renamed Doc" persisted
- F-07 ✅ Delete doc (More options → confirm dialog) — removed + cleaned up
- F-08 ⬜ Drag-and-drop (not exercised — headless-tree DnD)
- F-09 ⬜ Resizable sidebar (not exercised)

## Editor

- E-01 ✅ Edit mode: 1 editor, 0 preview
- E-02 ✅ Split mode: 1 editor + 1 preview, full width (fixed earlier this session)
- E-03 ✅ Preview mode: 0 editor, 1 preview
- E-04 ✅ Title input autosaves
- E-05 ✅ Content autosave (same debounced PATCH path verified by reindex tests)
- E-06 🔧 Index badge — empty docs wrongly showed "Indexing 0%" → FIXED (see findings)
- E-07 ✅ Breadcrumb shows folder > title (CRM > Testing)

## Search

- S-01 ✅ Cmd+Shift+K opens panel (shortcut fix earlier this session)
- S-02 ✅ Debounced search returns results (found "Testing", score 6%)
- S-03 ✅ semantic/hybrid disabled without OPENAI_API_KEY; keyword works
- S-04 🔧 Click result now opens the doc → FIXED (was a no-op TODO)
- S-05 ✅ Esc closes the panel

## Import

- I-01 ✅ Import panel opens (Markdown/PDF tabs, title + textarea)
- I-02 ✅ Markdown import creates + indexes a doc (3→4, isIndexed true)
- I-03 ⬜ PDF import (not exercised — needs a file)
- I-04 ✅ Imported doc is indexed on completion

## Indexing / pipeline

- X-01 ✅ Edited doc chunked + isIndexed flips true
- X-02 ✅ Reindex on content edit completes (remove-before-add fix verified)
- X-03 ✅ Per-doc progress observed ("Indexing 0%" badge — now corrected for empties)

## Knowledge graph / memory (Phase 1–4)

- K-01 ⬜ LinkedDocsPanel shown only when links exist (gated; none present)
- K-02 ⬜ MemoryPanel shown only when memory exists (gated; needs LLM to populate)
- K-03 ✅ memory/search (201) + :id/memory (200) endpoints respond
- K-04 ✅ memify endpoint dedups/reweights (logic unit-verified)

## Findings (fixes applied during this sweep)

- **S-04** (fixed, commit 3c61543f0): clicking a search result was a no-op
  (`handleSelectResult` only closed the panel). Now selects the doc + routes to the
  library. Verified via UI.
- **E-06 / empty-doc badge** (fixed): `createDoc` always set `isIndexed:false` but only
  queued indexing when there was content, so a new empty doc ("New Document") showed a
  perpetual "Indexing 0%". Now empty docs are created `isIndexed:true, indexProgress:100`
  (nothing to index). Verified: new empty doc → "Indexed".

## Test-harness notes (not app bugs)

- A test-script selector once matched the editor's title field instead of the import
  panel's, renaming the open doc; corrected the selector + restored the title. No data lost.
- `/socket/info` 500s appear transiently during backend HMR restarts; REST stays up
  (DevWsGateway hardening). Not a product bug.

## Not exercised (out of scope for this pass)

F-05, F-08, F-09, I-03 (PDF), and the populated states of K-01/K-02 (require a configured
chat model). Core CRUD + editor + search + import + indexing all pass.
