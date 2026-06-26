# Phase 13: Doc Library Redesign — Context

**Gathered:** 2026-06-01
**Status:** Ready for planning
**Source:** Analysis Express Path (DOC-LIBRARY-ANALYSIS.md + DOC-LIBRARY-APP-COMPARISON.md)

<domain>
## Phase Boundary

Replace the import-only doc library with a full Notion/Coda-style knowledge workspace. The current system (Phase 7) only allows pasting/uploading documents into a flat read-only list. This phase delivers:

1. A `DocFolder` model with nested hierarchy (folders → subfolders → docs)
2. In-app MD document creation and editing (not just import)
3. CodeMirror-based markdown editor with split edit+preview panel
4. Auto-save with re-indexation pipeline wired to existing BullMQ/pgvector infrastructure
5. Doc APIs integrated into `@teable/openapi` SDK (currently raw fetch())
6. EmbeddingService routed through UnifiedAIService (currently hardcoded OpenAI)
7. pgvector startup guard (currently fails silently if extension missing)

**Out of scope:** collaborative real-time editing, PDF import changes, new search UI (GlobalDocSearchPanel stays as-is), ShareDB integration.

</domain>

<decisions>
## Implementation Decisions

### D-01: Layout — inner split, not 3-panel root
The doc library page stays on `SpaceInnerLayout` (no new layout file). The `DocLibrary` component renders as `{children}` inside the existing sidebar+content shell. Inside `DocLibrary`, a secondary split panel contains: `DocFolderTree (240px, re-resizable) | DocEditorArea (flex-1)`.

### D-02: Folder tree — follow BaseNodeTree exactly
Build `DocFolderTree` using `@teable/ui-lib/base/headless-tree` + `@teable/ui-lib/shadcn/ui/tree` + `@dnd-kit` (already installed). Two node types: `DocFolder` (chevron expand) and `ImportedDoc` (file icon + index status dot). Same patterns as `BaseNodeTree`: inline rename, context menu, drag-drop reorder, `useLocalStorage` for expand state.

### D-03: Editor — CodeMirror lang-markdown (1 new dep)
Use `@codemirror/lang-markdown` as the only new package. All other CodeMirror v6 packages are already installed (`@codemirror/view`, `state`, `commands`, `language`, `theme-one-dark`). Do NOT add `@uiw/react-md-editor` or any other editor library.

### D-04: Split view — Zustand store for mode
`useDocEditorStore` (Zustand, persisted) holds `{ selectedDocId, selectedFolderId, mode: 'edit' | 'split' | 'preview' }`. Toggle button in editor toolbar cycles between modes. `split` shows CodeMirror left + `react-markdown` right.

### D-05: Auto-save — debounce 800ms + re-index
On keystroke debounce (800ms): `PATCH /api/spaces/:spaceId/docs/:docId` updates `rawContent` + sets `isIndexed=false`. Backend queues BullMQ re-indexation job. Frontend polls `isIndexed` and shows status dot in folder tree.

### D-06: New document creation
"+ New Doc" button per folder creates an empty `ImportedDoc` via `POST /api/spaces/:spaceId/docs` (new endpoint). Opens immediately in edit mode in `DocEditorArea`. No import modal involved.

### D-07: DocViewer deleted
`DocViewer.tsx` (fullscreen modal overlay) is completely removed. Selecting a doc in the folder tree renders it inline in `DocEditorArea`.

### D-08: API hooks — use @teable/openapi SDK
Doc endpoints must be added to `@teable/openapi` package. The `hooks.ts` file uses raw `fetch()` — replace with SDK functions using `ReactQueryKeys` pattern used by all other features.

### D-09: EmbeddingService — route through UnifiedAIService
`EmbeddingService` currently calls `https://api.openai.com/v1/embeddings` directly, ignoring the configured AI provider. Add `generateEmbeddings(texts: string[]): Promise<number[][]>` to `UnifiedAIService` and delegate to it.

### D-10: pgvector startup guard
Add a startup check in `DocSearchModule` or app bootstrap: if `CREATE EXTENSION IF NOT EXISTS vector` fails or the `vector` type is absent, log a clear error: "pgvector extension not installed — DocSearch and embedding features unavailable." Do not crash the app.

### D-11: DB schema — DocFolder model + ImportedDoc fields
```
DocFolder: id, spaceId, parentFolderId (nullable), name, order (float), createdAt
ImportedDoc: add folderId (nullable, FK DocFolder), order (float default 0)
```
Prisma migration required — [BLOCKING] db push before any other work.

### Claude's Discretion
- Exact tree library API calls (follow BaseNodeTree patterns)
- `react-markdown` vs custom MD renderer for preview pane
- Exact debounce implementation (use `lodash/debounce` already in codebase)
- Folder tree max depth (suggest: unlimited for docs, unlike BaseNodeTree which caps folders)
- Error states and loading skeletons
- Drag-drop between folders (nice-to-have, not blocking)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Doc System (Phase 7 — what we're building on)
- `apps/nestjs-backend/src/features/doc-search/` — all backend services, controllers, processors
- `apps/nextjs-app/src/features/app/blocks/doc-search/` — all frontend components (DocLibrary, DocImportPanel, DocViewer, DocSearchPanel, hooks.ts)
- `apps/nextjs-app/src/pages/space/[spaceId]/doc-library.tsx` — route page
- `packages/db-main-prisma/prisma/postgres/schema.prisma` — ImportedDoc, DocChunk, DocLink models

### App Architecture Patterns (MUST follow)
- `apps/nextjs-app/src/features/app/layouts/SpaceInnerLayout.tsx` — layout to stay on (DO NOT create new layout)
- `apps/nextjs-app/src/features/app/layouts/BaseLayout.tsx` — reference for inner split panel pattern
- `apps/nextjs-app/src/features/app/components/sidebar/Sidebar.tsx` — re-resizable sidebar primitive
- `apps/nextjs-app/src/features/app/components/sidebar/useSidebarStore.ts` — Zustand sidebar store pattern
- `apps/nextjs-app/src/features/app/blocks/base/base-side-bar/BaseNodeTree.tsx` — THE tree to mirror
- `apps/nextjs-app/src/features/app/blocks/base/base-side-bar/BaseSideBar.tsx` — parent of BaseNodeTree
- `apps/nextjs-app/src/features/app/components/sidebar/useChatPanelStore.ts` — panel state Zustand pattern

### Agent Integration (for search_knowledge_base tool)
- `apps/nestjs-backend/src/features/agent/agent-tool-registry.service.ts` — `search_knowledge_base` already registered
- `apps/nestjs-backend/src/features/doc-search/search.service.ts` — semantic search (spaceId-scoped)

### UI Component Library
- `packages/ui-lib/src/base/headless-tree/` — tree headless primitives used by BaseNodeTree
- `packages/ui-lib/src/shadcn/ui/tree` — Tree, TreeItem, TreeItemLabel components

### Analysis Documents
- `.planning/DOC-LIBRARY-ANALYSIS.md` — full gap analysis vs. vision
- `.planning/DOC-LIBRARY-APP-COMPARISON.md` — where original proposition was wrong, corrected architecture

</canonical_refs>

<specifics>
## Specific Implementation Notes

### CodeMirror setup (from existing patterns)
The app already uses CodeMirror for JSON/JS editing. Add `@codemirror/lang-markdown` (only new dep). Use `EditorView`, `basicSetup` from `codemirror`, `markdown()` from `@codemirror/lang-markdown`, `oneDark` from `@codemirror/theme-one-dark`.

### SpaceInnerSideBar already has the "Doc Library" nav link
`SpaceInnerSideBar.tsx` has the `FileDocument` button that navigates to `/space/[spaceId]/doc-library`. No sidebar change needed.

### DocImportPanel survives (import still useful)
Keep `DocImportPanel` for bulk import from PDF/external MD. The new flow adds "create empty" as a second entry point. Import modal can be triggered from a toolbar button in the folder tree header.

### hooks.ts API calls
Current endpoints used:
- `GET /api/spaces/:spaceId/docs` → list
- `GET /api/spaces/:spaceId/docs/:docId` → single doc
- `GET /api/spaces/:spaceId/docs/:docId/links` → link graph
- `POST /api/spaces/:spaceId/docs/import/markdown` → import MD
- `POST /api/spaces/:spaceId/docs/import/pdf` → import PDF
- `DELETE /api/spaces/:spaceId/docs/:docId` → delete

New endpoints needed:
- `POST /api/spaces/:spaceId/docs` → create empty doc (with optional folderId)
- `PATCH /api/spaces/:spaceId/docs/:docId` → update title/content/folderId/order
- `GET /api/spaces/:spaceId/doc-folders` → list folders for space
- `POST /api/spaces/:spaceId/doc-folders` → create folder
- `PATCH /api/spaces/:spaceId/doc-folders/:folderId` → rename/reorder/reparent
- `DELETE /api/spaces/:spaceId/doc-folders/:folderId` → delete (move children to parent or root)

</specifics>

<deferred>
## Deferred Ideas

- Collaborative real-time editing (ShareDB/WebSocket) — future phase
- Drag-drop between folders (nice-to-have, can be gap-closed post-MVP)
- Full-text search within the editor (CodeMirror search extension — can add later)
- Doc templates (new doc from template) — future
- Export to PDF from editor — future
- Version history / undo history per doc — future

</deferred>

---

*Phase: 13-doc-library-redesign*
*Context gathered: 2026-06-01 via Analysis Express Path*
