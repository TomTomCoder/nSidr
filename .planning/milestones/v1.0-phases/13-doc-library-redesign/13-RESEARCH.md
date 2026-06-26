# Phase 13: Doc Library Redesign - Research

**Researched:** 2026-06-01
**Domain:** Full-stack knowledge workspace — React/CodeMirror, headless-tree, NestJS CRUD, Prisma migration, BullMQ, pgvector
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Inner split layout inside `SpaceInnerLayout` — NO new layout file. `DocLibrary` renders `DocFolderTree (240px, re-resizable) | DocEditorArea (flex-1)` inside its own body.
- **D-02:** `DocFolderTree` follows `BaseNodeTree` exactly — `@teable/ui-lib/base/headless-tree` + `@dnd-kit` + `Tree/TreeItem/TreeItemLabel` from shadcn ui/tree. Two node types: DocFolder + ImportedDoc.
- **D-03:** CodeMirror `lang-markdown` is the only new package. No `@uiw/react-md-editor` or other editors.
- **D-04:** `useDocEditorStore` (Zustand, persisted) holds `{ selectedDocId, selectedFolderId, mode: 'edit' | 'split' | 'preview' }`.
- **D-05:** Auto-save = 800ms debounce + BullMQ re-indexation. Frontend polls `isIndexed` for status dot.
- **D-06:** "+ New Doc" creates empty `ImportedDoc` via `POST /api/spaces/:spaceId/docs`. No import modal.
- **D-07:** `DocViewer.tsx` deleted. Inline `DocEditorArea` replaces it.
- **D-08:** API hooks moved to `@teable/openapi` SDK. Raw `fetch()` in `hooks.ts` replaced with SDK functions + `ReactQueryKeys`.
- **D-09:** `EmbeddingService` delegates to `UnifiedAiService.generateEmbeddings()`.
- **D-10:** pgvector startup guard — log clear error, do NOT crash app.
- **D-11:** `DocFolder` Prisma model + `folderId/order` on `ImportedDoc` — [BLOCKING] migration first.

### Claude's Discretion
- Exact headless-tree API calls (follow BaseNodeTree patterns)
- `react-markdown` vs custom renderer for preview pane
- Exact debounce implementation (`lodash/debounce` already in codebase)
- Folder tree max depth (suggest: unlimited)
- Error states and loading skeletons
- Drag-drop between folders (nice-to-have)

### Deferred Ideas (OUT OF SCOPE)
- Collaborative real-time editing (ShareDB/WebSocket)
- Drag-drop between folders (nice-to-have)
- Full-text search within editor (CodeMirror search extension)
- Doc templates
- Export to PDF from editor
- Version history per doc
</user_constraints>

---

## Summary

Phase 13 builds on the existing Phase 7 doc system (import-only, flat list) and transforms it into a Notion/Coda-style workspace with folder hierarchy, in-app editing, and proper SDK integration. The codebase already has 90% of the required infrastructure: CodeMirror v6 stack (missing only `lang-markdown`), `@headless-tree` in ui-lib, `@dnd-kit`, Zustand, `re-resizable`, BullMQ queue (`DOC_INGEST_QUEUE`), pgvector, `react-markdown` (in `packages/sdk`), and all existing doc backend services.

The primary new work is: (1) Prisma migration for `DocFolder` + `folderId/order` on `ImportedDoc`, (2) new CRUD controller for docs+folders, (3) `DocFolderTree` component mirroring `BaseNodeTree`, (4) `DocEditorArea` component with CodeMirror + split view, (5) `useDocEditorStore` Zustand store, (6) openapi SDK types for new endpoints, (7) routing `EmbeddingService` through `UnifiedAiService`.

**Primary recommendation:** Start with the Prisma migration (D-11 blocking), then build the backend CRUD controller, then the frontend components in parallel, then wire auto-save + re-indexation last.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Folder/doc tree UI | Frontend (Next.js) | — | Pure rendering + local state |
| Doc CRUD (create/update/delete) | API (NestJS) | Frontend (hooks) | Persistence + auth gating |
| Markdown editing | Browser (CodeMirror) | — | Client-side EditorView |
| Preview rendering | Browser (react-markdown) | — | Client-side DOM |
| Auto-save debounce | Frontend | API (PATCH endpoint) | Keystroke to debounce to API call |
| Re-indexation queue | API (BullMQ processor) | — | Async, heavy — must be backend |
| Embeddings generation | API (EmbeddingService) | UnifiedAiService | Provider-agnostic via D-09 |
| pgvector guard | API (bootstrap) | — | One-time startup check |
| Folder persistence | Database (Prisma) | API | New DocFolder model |

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@codemirror/lang-markdown` | 6.5.0 | Markdown syntax for CodeMirror editor | Only missing CodemMirror piece — matches existing @codemirror/* versions [VERIFIED: npm registry] |
| `@headless-tree/core` + `@headless-tree/react` | 1.5.1 | Headless tree primitive (already in ui-lib) | Already used by BaseNodeTree [VERIFIED: packages/ui-lib/package.json] |
| `@dnd-kit/core` + `@dnd-kit/sortable` | 6.1.0 / 8.0.0 | Drag-and-drop reorder | Already installed in nextjs-app [VERIFIED: apps/nextjs-app/package.json] |
| `zustand` + `persist` middleware | 4.5.2 | Editor mode store | Already used by useSidebarStore, useChatPanelStore [VERIFIED: codebase] |
| `re-resizable` | 6.10.3 | Inner folder tree resize panel | Already used in Sidebar.tsx [VERIFIED: codebase] |
| `react-markdown` | 9.0.1 | Preview pane renderer | Already in packages/sdk/package.json [VERIFIED: codebase] |
| `lodash/debounce` | 4.17.21 | 800ms auto-save debounce | Already installed [VERIFIED: apps/nextjs-app/package.json] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@codemirror/commands` | 6.3.3 | History, defaultKeymap | Already installed — use same pattern as CodeEditor.tsx |
| `@codemirror/theme-one-dark` | 6.1.3 | Dark theme | Already installed |
| `@tanstack/react-query` | (existing) | Data fetching hooks | All API hooks follow this pattern |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `react-markdown` | `@uiw/react-md-editor` | D-03 locks against this — lang-markdown only |
| Direct `fetch()` | `@teable/openapi` SDK | D-08 locks to SDK pattern |

**Installation (1 new package only):**
```bash
cd apps/nextjs-app && pnpm add @codemirror/lang-markdown@6.5.0
```

---

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| `@codemirror/lang-markdown` | npm | ~5 yrs | Millions/wk | github.com/codemirror/lang-markdown | [OK] | Approved |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

---

## Architecture Patterns

### System Architecture Diagram

```
User keystroke
     |
     v
DocEditorArea (CodeMirror EditorView)
     |  onChange -> lodash/debounce(800ms)
     v
useDocEditorStore (Zustand) -- mode: edit|split|preview
     |  auto-save fires
     v
PATCH /api/spaces/:spaceId/docs/:docId  (rawContent, isIndexed=false)
     |
     v
DocCrudController (NestJS)
     |  queue.add('reindex', { docId })
     v
DOC_INGEST_QUEUE (BullMQ)
     |
     v
DocIngestProcessor
     |  EmbeddingService.generateBatchEmbeddings()
     |       L-- UnifiedAiService.generateEmbeddings() <- D-09
     v
pgvector (DocChunk.embedding)
     |  set isIndexed=true on ImportedDoc
     v
Frontend polls isIndexed -> status dot in DocFolderTree
```

```
DocLibrary (SpaceInnerLayout content area)
+-- Resizable defaultSize=240 minWidth=160
|     L-- DocFolderTree
|           +-- DocFolder nodes (chevron, inline rename, context menu)
|           L-- ImportedDoc nodes (file icon, status dot, context menu)
L-- DocEditorArea (flex-1)
      +-- Toolbar (mode toggle: edit|split|preview, import button)
      +-- [edit mode]   CodeMirror EditorView (lang-markdown)
      +-- [split mode]  CodeMirror | react-markdown (50/50)
      L-- [preview mode] react-markdown only
```

### Recommended Project Structure
```
apps/nextjs-app/src/features/app/blocks/doc-search/
+-- DocLibrary.tsx           # replaces existing -- adds inner Resizable split
+-- DocFolderTree.tsx        # NEW -- mirrors BaseNodeTree
+-- DocEditorArea.tsx        # NEW -- CodeMirror + toolbar + preview
+-- DocImportPanel.tsx       # KEEP -- bulk import still useful
+-- GlobalDocSearchPanel.tsx # KEEP -- unchanged
+-- DocSearchPanel.tsx       # KEEP -- unchanged
+-- useDocEditorStore.ts     # NEW -- Zustand persisted store
+-- hooks.ts                 # REPLACE raw fetch() with SDK calls
L-- index.ts

packages/openapi/src/doc-search/
+-- index.ts                 # EXTEND with new types + SDK functions
+-- doc.ts                   # NEW -- create/update/list/delete doc endpoints
L-- doc-folder.ts            # NEW -- folder CRUD endpoints

apps/nestjs-backend/src/features/doc-search/
+-- doc-crud.controller.ts   # NEW -- CRUD for docs + folders
+-- doc-folder.service.ts    # NEW -- folder operations
+-- doc-ingest.controller.ts # EXTEND -- add re-index-on-update job
+-- embedding.service.ts     # MODIFY -- delegate to UnifiedAiService
L-- doc-search.module.ts     # MODIFY -- register new controller/service
```

### Pattern 1: CodeMirror Markdown Editor (exact pattern from CodeEditor.tsx)
**What:** Direct `EditorView` instantiation in `useEffect`, same as `CodeEditor.tsx`
**When to use:** `DocEditorArea` — replace `javascript()` with `markdown()`
**Example:**
```typescript
// Source: apps/nextjs-app/src/features/app/base-node/CodeEditor.tsx (VERIFIED: codebase)
import { markdown } from '@codemirror/lang-markdown';
import { EditorView } from '@codemirror/view';
import { EditorState } from '@codemirror/state';

useEffect(() => {
  const extensions = [
    markdown(),                    // only change from CodeEditor.tsx
    EditorView.lineWrapping,       // prose wrapping (unlike code editor)
    EditorView.updateListener.of((update) => {
      if (update.docChanged) onChangeRef.current(update.state.doc.toString());
    }),
  ];
  const state = EditorState.create({ doc: value, extensions });
  const view = new EditorView({ state, parent: containerRef.current! });
  viewRef.current = view;
  return () => { view.destroy(); viewRef.current = null; };
}, [theme, readOnly]);

// Sync external value without breaking cursor:
useEffect(() => {
  const view = viewRef.current;
  if (!view) return;
  const current = view.state.doc.toString();
  if (current !== value) {
    view.dispatch({ changes: { from: 0, to: current.length, insert: value } });
  }
}, [value]);
```

### Pattern 2: headless-tree DocFolderTree (mirror of BaseNodeTree)
**What:** `useTree()` hook with `syncDataLoaderFeature`, `selectionFeature`, `dragAndDropFeature`
**When to use:** `DocFolderTree` with two node types
**Example:**
```typescript
// Source: apps/nextjs-app/src/features/app/blocks/base/base-side-bar/BaseNodeTree.tsx (VERIFIED: codebase)
import {
  useTree, syncDataLoaderFeature, selectionFeature,
  dragAndDropFeature, hotkeysCoreFeature, keyboardDragAndDropFeature,
  createOnDropHandler,
} from '@teable/ui-lib/base/headless-tree';
import { Tree, TreeItem, TreeItemLabel, TreeDragLine } from '@teable/ui-lib/shadcn/ui/tree';

// Node data shape for DocFolderTree:
type DocTreeItem =
  | { type: 'folder'; id: string; name: string; parentFolderId: string | null; order: number }
  | { type: 'doc'; id: string; title: string; folderId: string | null; order: number; isIndexed: boolean };

const tree = useTree<DocTreeItem>({
  rootItemId: ROOT_ID,
  getItemName: (item) => item.getItemData().type === 'folder'
    ? item.getItemData().name
    : item.getItemData().title,
  isItemFolder: (item) => item.getItemData().type === 'folder',
  dataLoader: { getItem, getChildren },
  features: [syncDataLoaderFeature, selectionFeature, dragAndDropFeature,
             hotkeysCoreFeature, keyboardDragAndDropFeature],
  onDrop: createOnDropHandler(...),
});
```

### Pattern 3: Zustand persisted store (mirror of useSidebarStore)
**What:** `create<State>()(persist(...))` with `LocalStorageKeys` key
**Example:**
```typescript
// Source: apps/nextjs-app/src/features/app/components/sidebar/useSidebarStore.ts (VERIFIED: codebase)
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { LocalStorageKeys } from '@teable/sdk';

// Add new key to LocalStorageKeys enum:
// DocEditor = 'ls_doc_editor'

interface IDocEditorState {
  selectedDocId: string | null;
  selectedFolderId: string | null;
  mode: 'edit' | 'split' | 'preview';
  setSelectedDoc: (id: string | null) => void;
  setSelectedFolder: (id: string | null) => void;
  setMode: (mode: 'edit' | 'split' | 'preview') => void;
}

export const useDocEditorStore = create<IDocEditorState>()(
  persist(
    (set) => ({
      selectedDocId: null,
      selectedFolderId: null,
      mode: 'edit',
      setSelectedDoc: (selectedDocId) => set({ selectedDocId }),
      setSelectedFolder: (selectedFolderId) => set({ selectedFolderId }),
      setMode: (mode) => set({ mode }),
    }),
    { name: LocalStorageKeys.DocEditor }
  )
);
```

### Pattern 4: openapi SDK endpoint definition
**What:** Zod schema + `registerRoute` + `axios` call + exported function
**Example:**
```typescript
// Source: packages/openapi/src/ai/agent.ts pattern (VERIFIED: codebase)
import { z } from 'zod';
import { axios } from '../axios';
import { registerRoute, urlBuilder } from '../utils';

export const CREATE_DOC = '/spaces/:spaceId/docs';
export const CreateDocSchema = z.object({
  title: z.string().min(1).max(500),
  folderId: z.string().nullable().optional(),
  content: z.string().optional().default(''),
});
export type ICreateDoc = z.infer<typeof CreateDocSchema>;

export const createDoc = (spaceId: string, data: ICreateDoc) =>
  axios.post<IImportedDoc>(urlBuilder(CREATE_DOC, { spaceId }), data);

// Also extend IImportedDoc with new fields:
export interface IImportedDoc {
  // ...existing fields...
  folderId?: string | null;   // NEW (optional during transition)
  order?: number;             // NEW (optional during transition)
}
```

### Pattern 5: re-resizable inner panel
**What:** `<Resizable>` inside `DocLibrary` content div (same API as Sidebar.tsx)
**Example:**
```typescript
// Source: apps/nextjs-app/src/features/app/components/sidebar/Sidebar.tsx (VERIFIED: codebase)
import { Resizable } from 're-resizable';

<div className="flex h-full overflow-hidden">
  <Resizable
    defaultSize={{ width: 240, height: '100%' }}
    minWidth={160}
    maxWidth={400}
    enable={{ right: true }}
    onResizeStop={(_, __, ___, d) => setFolderTreeWidth(w => w + d.width)}
  >
    <DocFolderTree />
  </Resizable>
  <div className="flex-1 overflow-hidden">
    <DocEditorArea />
  </div>
</div>
```

### Pattern 6: BullMQ re-index job on doc update
**What:** Queue a `reindex` job in the PATCH doc handler
**Example:**
```typescript
// Source: apps/nestjs-backend/src/features/doc-search/doc-ingest.controller.ts (VERIFIED: codebase)
// In DocCrudController PATCH handler:
await this.prisma.importedDoc.update({
  where: { id: docId },
  data: { rawContent: body.content, isIndexed: false, title: body.title },
});
await this.queue.add('reindex', { type: 'reindex', docId, spaceId } satisfies DocIngestJobData);
// DocIngestProcessor already handles deletion + re-chunking pattern
```

### Anti-Patterns to Avoid
- **Separate layout file:** D-01 forbids creating a new layout — stay in `SpaceInnerLayout`
- **Raw `fetch()` in hooks.ts:** D-08 requires `@teable/openapi` SDK functions
- **Direct OpenAI call in EmbeddingService:** D-09 requires delegation to `UnifiedAiService`
- **`codemirror` meta-package:** Use individual `@codemirror/*` packages — the codebase doesn't use the `codemirror` meta-package wrapper
- **DocViewer for any rendering:** D-07 — deleted entirely, `DocEditorArea` replaces it
- **Setting innerHTML directly for preview:** Use `react-markdown` component only — avoids XSS

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tree with DnD | Custom tree + drag logic | `@headless-tree` + `@dnd-kit` (already installed) | Accessibility, keyboard nav, drop target calculation built-in |
| Debounced save | `setTimeout` in component | `lodash/debounce` + `useRef` for stable ref | Cancellation, leading/trailing edge, stale closure prevention |
| Markdown preview | Custom markdown parser | `react-markdown` (already in sdk/package.json) | Full CommonMark spec, safe rendering, plugin ecosystem |
| CodeMirror React integration | Manual DOM ref management | Follow `CodeEditor.tsx` pattern exactly | Already handles sync, destroy, cursor preservation |
| Async job for re-indexation | Direct in request handler | `DOC_INGEST_QUEUE` BullMQ (already wired) | Chunking + embedding is slow (~seconds) |
| pgvector check | Query pg_extension table | `CREATE EXTENSION IF NOT EXISTS vector` in try/catch at startup | Idempotent, handles missing extension cleanly |

---

## Common Pitfalls

### Pitfall 1: react-markdown not in nextjs-app package.json
**What goes wrong:** `react-markdown` is in `packages/sdk/package.json` (v9.0.1), NOT in `apps/nextjs-app/package.json`. Import from `@teable/sdk` re-exports or add direct dep.
**Why it happens:** SDK bundles it but app doesn't depend on it directly.
**How to avoid:** Check if sdk re-exports it. If not, add `react-markdown` to `apps/nextjs-app` deps (it's already in the monorepo).
**Warning signs:** Module not found on first build.

### Pitfall 2: CodeMirror EditorView re-creation on every render
**What goes wrong:** If `useEffect` deps include `value`, the editor is destroyed and recreated on every keystroke — breaks cursor position.
**Why it happens:** `CodeEditor.tsx` pattern solves this: `useEffect` deps are `[theme, readOnly]` only. External value sync is a second `useEffect` that uses `view.dispatch()`.
**How to avoid:** Follow `CodeEditor.tsx` exactly — two separate `useEffect`s.

### Pitfall 3: Prisma migration with `vector(1536)` Unsupported type
**What goes wrong:** `prisma migrate dev` may fail if pgvector extension is not installed in the migration DB.
**Why it happens:** The `Unsupported("vector(1536)")` type requires pgvector pre-installed.
**How to avoid:** Use a hand-written SQL migration (as existing migrations do — no auto-generate). Migration SQL should include `CREATE EXTENSION IF NOT EXISTS vector;` before the new table DDL.

### Pitfall 4: headless-tree `syncDataLoaderFeature` requires stable references
**What goes wrong:** Passing inline `dataLoader` object causes tree to re-initialize on each render.
**Why it happens:** `useTree` compares dataLoader by reference.
**How to avoid:** Memoize `dataLoader` with `useMemo` — same pattern as `BaseNodeTree.tsx`.

### Pitfall 5: `IImportedDoc` type change is a breaking SDK change
**What goes wrong:** Adding `folderId` and `order` to `IImportedDoc` in openapi package breaks existing callers that don't expect them.
**Why it happens:** TypeScript strict mode.
**How to avoid:** Add fields as optional (`folderId?: string | null`, `order?: number`) initially, then make required after migration confirms.

### Pitfall 6: BullMQ `DOC_INGEST_QUEUE` job type collision
**What goes wrong:** Adding `'reindex'` job type to a processor that only handles `'ingest'` causes silent skips.
**Why it happens:** Processor may pattern-match on job name.
**How to avoid:** Check `doc-ingest.processor.ts` — add explicit `if (job.name === 'reindex')` branch or use separate `@Process('reindex')` decorator method.

---

## Code Examples

### Auto-save with lodash/debounce (stable pattern)
```typescript
// Source: lodash docs + CodeEditor.tsx value sync pattern [ASSUMED for exact impl]
import debounce from 'lodash/debounce';
import { useRef, useCallback } from 'react';

const saveRef = useRef<(content: string) => void>();
saveRef.current = async (content: string) => {
  await patchDoc(spaceId, docId, { content });
};

const debouncedSave = useCallback(
  debounce((content: string) => saveRef.current?.(content), 800),
  [] // stable ref pattern -- recreate only on mount
);

// In onChange handler:
const handleChange = (content: string) => {
  setLocalContent(content);
  debouncedSave(content);
};
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `EmbeddingService` calls OpenAI directly | Route through `UnifiedAiService` (D-09) | Phase 13 | Enables any AI provider for embeddings |
| `DocViewer.tsx` modal overlay | Inline `DocEditorArea` (D-07) | Phase 13 | No fullscreen nav required |
| Raw `fetch()` in hooks.ts | `@teable/openapi` SDK | Phase 13 | Type-safe, consistent with rest of app |
| Flat doc list (no folders) | `DocFolder` hierarchy (D-11) | Phase 13 | Requires blocking migration |

**Deprecated/outdated after this phase:**
- `DocViewer.tsx`: deleted entirely
- `hooks.ts` raw fetch() calls: all replaced with SDK

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `react-markdown` can be imported in nextjs-app from sdk package or must be added as direct dep | Pitfall 1 | Build failure — add direct dep if needed |
| A2 | `DocIngestProcessor` needs a new `reindex` job branch (current only handles `ingest`) | Pattern 6 / Pitfall 6 | Re-indexation silently skips — verify processor code |
| A3 | `lodash/debounce` with stable `useRef` pattern is the correct debounce approach | Code Examples | Minor — alternative: `useCallback` with `useMemo` |

---

## Open Questions (RESOLVED)

1. **react-markdown import path in nextjs-app** *(RESOLVED)*
   - **Resolution:** `react-markdown` v9.0.1 is in `packages/sdk/package.json` but is NOT re-exported from `@teable/sdk`. Plan 13-06 Task 1 adds `react-markdown` as a direct dep to `apps/nextjs-app/package.json` via `pnpm add react-markdown@9.0.1 -F @teable/app` before DocEditorArea implementation.

2. **DocIngestProcessor job name handling** *(RESOLVED)*
   - **Resolution:** `doc-ingest.processor.ts` uses `@Process('ingest')` (name-specific decorator). Plan 13-03 Task 2 adds a separate `@Process('reindex')` decorated handler in the same processor class that calls the existing `processDoc` logic with `isReindex: true` flag, skipping the initial chunk-delete step.

3. **UnifiedAiService embeddings method signature** *(RESOLVED)*
   - **Resolution:** Plan 13-03 Task 3 adds `async generateEmbeddings(texts: string[]): Promise<number[][]>` to `UnifiedAiService`. Since not all providers support native embeddings, the implementation falls back to direct OpenAI embeddings API if the configured provider does not expose an embeddings endpoint — identical behavior to the existing `EmbeddingService` but provider-aware. The fallback is logged as a warning.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| pgvector extension | DocChunk embedding | [ASSUMED] present | — | D-10 startup guard logs error |
| BullMQ / Redis | Re-indexation queue | [ASSUMED] present (Phase 7 working) | — | — |
| `@codemirror/lang-markdown` | DocEditorArea | NOT YET (needs install) | 6.5.0 on npm | — |
| `react-markdown` | Preview pane | In sdk package.json | 9.0.1 | — |

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest (NestJS backend) + existing patterns |
| Config file | `apps/nestjs-backend/jest.config.js` |
| Quick run command | `pnpm test --filter=nestjs-backend -- --testPathPattern=doc` |
| Full suite command | `pnpm test --filter=nestjs-backend` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| D-09 | EmbeddingService delegates to UnifiedAiService | unit | `pnpm test -- embedding.service.spec` | No — Wave 0 |
| D-10 | pgvector guard logs, does not crash | unit | `pnpm test -- doc-search.module.spec` | No — Wave 0 |
| D-05 | PATCH endpoint sets isIndexed=false + queues job | integration | `pnpm test -- doc-crud.controller.spec` | No — Wave 0 |
| D-11 | Migration applies cleanly | manual | `prisma migrate dev` | No — Wave 0 |

### Wave 0 Gaps
- [ ] `apps/nestjs-backend/src/features/doc-search/doc-crud.controller.spec.ts` — covers D-05, D-06
- [ ] `apps/nestjs-backend/src/features/doc-search/embedding.service.spec.ts` — covers D-09

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | NestJS guards (already on all `/api/spaces` routes) |
| V4 Access Control | yes | `spaceId` must be validated against authenticated user's spaces |
| V5 Input Validation | yes | Zod schemas in `@teable/openapi` (same pattern as all other endpoints) |
| V6 Cryptography | no | No new crypto — embeddings are not sensitive |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Cross-space doc access | Spoofing | Verify `spaceId` ownership in controller before any DB op |
| Large doc content DoS | DoS | Add `maxLength` to `rawContent` Zod schema (suggest: 500KB) |
| Markdown XSS in preview | Tampering | Use react-markdown component (safe by default); never pass raw HTML to DOM via string injection |

---

## Sources

### Primary (HIGH confidence)
- `apps/nextjs-app/src/features/app/base-node/CodeEditor.tsx` — CodeMirror v6 direct EditorView pattern
- `apps/nextjs-app/src/features/app/blocks/base/base-side-bar/BaseNodeTree.tsx` — headless-tree + @dnd-kit pattern
- `apps/nextjs-app/src/features/app/components/sidebar/useSidebarStore.ts` — Zustand persist pattern
- `apps/nextjs-app/src/features/app/components/sidebar/Sidebar.tsx` — re-resizable usage
- `apps/nestjs-backend/src/features/doc-search/doc-ingest.controller.ts` — BullMQ queue pattern
- `apps/nestjs-backend/src/features/doc-search/embedding.service.ts` — current EmbeddingService
- `apps/nestjs-backend/src/features/ai/unified-ai.service.ts` — UnifiedAiService interface
- `packages/openapi/src/doc-search/index.ts` — existing types (IImportedDoc, IDocSearchQuery)
- `packages/db-main-prisma/prisma/postgres/schema.prisma` — ImportedDoc, DocChunk models
- `packages/ui-lib/src/base/headless-tree/index.ts` — re-exports @headless-tree/core + react
- npm registry: `@codemirror/lang-markdown` v6.5.0 [VERIFIED: npm registry]

### Secondary (MEDIUM confidence)
- `packages/sdk/package.json` — react-markdown v9.0.1 confirmed in monorepo

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified in codebase or npm registry
- Architecture: HIGH — patterns directly from existing codebase files
- Pitfalls: HIGH — identified from direct code inspection
- UnifiedAiService embedding extension: MEDIUM — interface understood, exact provider capability unknown

**Research date:** 2026-06-01
**Valid until:** 2026-07-01 (stable stack)
