# Doc Library — Current State Analysis & Recommendations

## What Was Built (Phase 7)

### Backend — `src/features/doc-search/`
| File | What it does |
|------|-------------|
| `embedding.service.ts` | Calls OpenAI `text-embedding-3-small` directly (hardcoded, ignores UnifiedAIService) |
| `ingestion.service.ts` | Chunk text + batch-embed via BullMQ |
| `doc-ingest.processor.ts` | BullMQ worker: chunking → pgvector insert |
| `search.service.ts` | Semantic (pgvector cosine) + keyword (PostgreSQL `to_tsvector`) + hybrid |
| `link-extractor.service.ts` | Extracts `[text](url)` from markdown |
| `graph.service.ts` | DocLink graph traversal |
| `doc-ingest.controller.ts` | `POST /doc-search/ingest/markdown` + `POST /doc-search/ingest/pdf` |
| `doc-search.controller.ts` | `GET /doc-search?q=` + `GET /doc-search/:id` + `GET /doc-search/:id/links` |

### Prisma Models
```
ImportedDoc  — id, spaceId, title, sourceType, rawContent, wordCount, isIndexed, chunkCount
DocChunk     — id, docId, chunkIndex, content, embedding vector(1536)
DocLink      — id, fromDocId, toDocId, linkText, linkUrl, linkType(internal|external)
```

### Frontend — `blocks/doc-search/`
| Component | What it does |
|-----------|-------------|
| `DocLibrary.tsx` | **Flat list** of docs with import/search/delete buttons |
| `DocImportPanel.tsx` | Modal: paste markdown text OR upload PDF → POST to backend |
| `DocViewer.tsx` | **Read-only** fullscreen modal overlay — shows `rawContent` as plain text + link graph |
| `DocSearchPanel.tsx` | Semantic/keyword search dialog |
| `GlobalDocSearchPanel.tsx` | Cmd+Shift+K global search overlay |

### Agent Integration
`AgentToolRegistryService` has `search_knowledge_base` registered as a built-in tool — wired but execution dispatch needs verification.

---

## Critical Gaps vs. the Vision (Notion/Coda/ClickUp style)

### 1. No Folder Hierarchy — **BLOCKING**
- `ImportedDoc` has no `folderId` or `parentId`
- No `DocFolder` model exists
- The left panel is a flat `<ul>` — no tree, no nesting, no create-folder

### 2. No In-App Doc Creation — **BLOCKING**
- The only entry point is "Import" (paste text or upload PDF)
- No "New Document" button that creates an empty editable MD file
- Users cannot create docs natively — defeats the purpose of a doc library

### 3. No Markdown Editor — **BLOCKING**
- `DocViewer` is a read-only fullscreen modal showing raw text
- `DocImportPanel` has a plain `<textarea>` for one-shot paste — not an editor
- No rich MD editor (no CodeMirror, no TipTap, no @uiw/react-md-editor)

### 4. No Split View — **BLOCKING**
- Target UX: editor on left, rendered preview on right
- Current UX: modal overlay with raw text only

### 5. No Auto-Indexation on Save — **MISSING**
- Indexation only triggers on initial import
- Editing a doc would require a separate re-index trigger

### 6. EmbeddingService Hard-Wired to OpenAI — **ARCH ISSUE**
- Bypasses `UnifiedAIService` (the configured AI provider system)
- Breaks if the user configures a different provider (Anthropic, OpenRouter)
- Requires `OPENAI_API_KEY` separately even when another provider is configured

### 7. pgvector Not Guaranteed — **INFRA ISSUE**
- Homebrew Postgres@15 does not install pgvector by default
- `CREATE EXTENSION vector` must be run manually
- The embedding column `vector(1536)` silently fails if extension is missing

---

## Architecture Recommendation

### Data Model Changes

```prisma
model DocFolder {
  id             String      @id @default(cuid())
  spaceId        String
  space          Space       @relation(fields: [spaceId], references: [id], onDelete: Cascade)
  parentFolderId String?
  parent         DocFolder?  @relation("FolderTree", fields: [parentFolderId], references: [id])
  children       DocFolder[] @relation("FolderTree")
  name           String
  order          Float       @default(0)
  createdAt      DateTime    @default(now())
  docs           ImportedDoc[]

  @@index([spaceId])
  @@map("doc_folder")
}

// Add to ImportedDoc:
folderId  String?
folder    DocFolder? @relation(fields: [folderId], references: [id], onDelete: SetNull)
order     Float      @default(0)
```

### Backend Changes

1. **`DocFolderService`** — CRUD: create/rename/delete/reorder folders, move doc between folders
2. **`DocService.update()`** — update `rawContent` + `title`, re-queue BullMQ indexation job on save
3. **Route `EmbeddingService` through `UnifiedAIService`** — use configured provider's embedding endpoint, not hardcoded OpenAI
4. **`DELETE /doc-search/:id`** endpoint — confirm it exists (not surfaced in current controller review)
5. **pgvector guard** — check extension at startup, log clear error if missing

### Frontend Changes

#### Layout Redesign: 3-Panel
```
[App Nav (fixed left)] | [Doc Tree Sidebar] | [Editor Panel + Preview Panel]
```

The Doc Library page becomes a **persistent workspace page**, not a modal overlay.

#### Doc Tree Sidebar
- Recursive folder tree: collapsible folders, drag-to-reorder
- "New Folder" / "New Document" context actions per folder
- Doc nodes show: title, indexing status dot (green = indexed, yellow = pending)
- Uses existing Teable sidebar patterns from `space-side-bar`

#### Editor Panel
- **Library**: `@uiw/react-md-editor` — battle-tested, dark mode, preview toggle, fits the existing stack
- Split mode: editor left | rendered HTML right (toggle or always-split)
- Auto-save: debounce 800ms → `PATCH /doc-search/:id` → triggers async re-indexation
- Keyboard: Cmd+S = force save, Cmd+Shift+P = toggle preview mode

#### State
- Single `useDocLibraryStore` (Zustand) — tracks `selectedFolderId`, `selectedDocId`, `editingDoc`, `dirtyContent`
- Optimistic updates for reordering and folder moves

### Indexation Pipeline

```
User saves doc (auto-save debounce)
    → PATCH /doc-search/:id  (update rawContent in DB, set isIndexed=false)
    → BullMQ job queued      (re-chunk + re-embed existing DocChunks)
    → isIndexed = true       (job completion)
    → WS event               (front-end shows green dot)
```

### Embedding Provider Fix

```typescript
// embedding.service.ts — replace hardcoded OpenAI with:
constructor(private readonly unifiedAI: UnifiedAIService) {}

async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
  return this.unifiedAI.generateEmbeddings(texts);
}
```

The `UnifiedAIService` already abstracts provider selection — embedding should be another method on it.

---

## Priority Order

| Priority | Work | Scope |
|----------|------|-------|
| 1 | `DocFolder` model + migration + folder CRUD API | Backend |
| 2 | `folderId` + `order` on `ImportedDoc` + update endpoint | Backend |
| 3 | Route EmbeddingService through UnifiedAIService | Backend |
| 4 | Doc tree sidebar (folder tree + new doc/folder actions) | Frontend |
| 5 | Integrate `@uiw/react-md-editor` — replace DocViewer modal | Frontend |
| 6 | Split-view layout (editor + preview) with auto-save | Frontend |
| 7 | Re-indexation on save (BullMQ re-trigger) | Backend + Frontend |
| 8 | pgvector installation check at startup | Backend |

**Estimated scope:** 3 focused phases (DB+API, Editor UI, Indexation wiring).
The backend services for search are solid — the gap is entirely in the creation/editing UX and the folder model.
