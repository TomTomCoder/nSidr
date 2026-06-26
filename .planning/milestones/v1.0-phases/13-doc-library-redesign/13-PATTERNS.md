# Phase 13: Doc Library Redesign - Pattern Map

**Mapped:** 2026-06-01
**Files analyzed:** 14
**Analogs found:** 13 / 14

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `packages/db-main-prisma/prisma/postgres/schema.prisma` (mod) | model | CRUD | same file — `ImportedDoc` block | exact |
| `apps/nestjs-backend/src/features/doc-search/doc-crud.controller.ts` (new) | controller | CRUD | `doc-ingest.controller.ts` | role-match |
| `apps/nestjs-backend/src/features/doc-search/doc-folder.service.ts` (new) | service | CRUD | `doc-ingest.controller.ts` (queue pattern) | role-match |
| `apps/nestjs-backend/src/features/doc-search/doc-ingest.processor.ts` (mod) | processor | event-driven | same file | exact |
| `apps/nestjs-backend/src/features/ai/unified-ai.service.ts` (mod) | service | request-response | same file | exact |
| `apps/nestjs-backend/src/features/doc-search/embedding.service.ts` (mod) | service | request-response | same file + `unified-ai.service.ts` | exact |
| `packages/openapi/src/doc-search/doc.ts` (new) | config | request-response | `packages/openapi/src/ai/agent.ts` | role-match |
| `packages/openapi/src/doc-search/doc-folder.ts` (new) | config | request-response | `packages/openapi/src/ai/agent.ts` | role-match |
| `packages/openapi/src/doc-search/index.ts` (mod) | config | — | same file | exact |
| `apps/nextjs-app/src/features/app/blocks/doc-search/DocLibrary.tsx` (mod) | component | CRUD | same file + `Sidebar.tsx` (Resizable) | exact |
| `apps/nextjs-app/src/features/app/blocks/doc-search/DocFolderTree.tsx` (new) | component | event-driven | `BaseNodeTree.tsx` | exact |
| `apps/nextjs-app/src/features/app/blocks/doc-search/DocEditorArea.tsx` (new) | component | event-driven | `CodeEditor.tsx` | exact |
| `apps/nextjs-app/src/features/app/blocks/doc-search/useDocEditorStore.ts` (new) | store | — | `useSidebarStore.ts` + `useChatPanelStore.ts` | exact |
| `apps/nextjs-app/src/features/app/blocks/doc-search/hooks.ts` (mod) | hook | CRUD | same file (replace raw fetch with SDK) | exact |

---

## Pattern Assignments

### `packages/db-main-prisma/prisma/postgres/schema.prisma` (model, CRUD)

**Analog:** same file — existing `ImportedDoc` and `DocChunk` blocks

**WARNING — Pitfall 3:** Do NOT use `prisma migrate dev` auto-generation. Write a hand-crafted SQL migration. The existing `DocChunk.embedding` field uses `Unsupported("vector(1536)")` which requires pgvector pre-installed in migration DB.

**Migration SQL pattern** (hand-written, same as existing migrations):
```sql
-- migration: add_doc_folder_model
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE "DocFolder" (
  "id"             TEXT NOT NULL,
  "spaceId"        TEXT NOT NULL,
  "parentFolderId" TEXT,
  "name"           TEXT NOT NULL,
  "order"          DOUBLE PRECISION NOT NULL DEFAULT 0,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DocFolder_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DocFolder_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE CASCADE,
  CONSTRAINT "DocFolder_parentFolderId_fkey" FOREIGN KEY ("parentFolderId") REFERENCES "DocFolder"("id") ON DELETE SET NULL
);

ALTER TABLE "ImportedDoc" ADD COLUMN "folderId" TEXT;
ALTER TABLE "ImportedDoc" ADD COLUMN "order"    DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "ImportedDoc" ADD CONSTRAINT "ImportedDoc_folderId_fkey"
  FOREIGN KEY ("folderId") REFERENCES "DocFolder"("id") ON DELETE SET NULL;
```

**Prisma schema additions** (add after existing `ImportedDoc` model):
```prisma
model DocFolder {
  id             String      @id @default(cuid())
  spaceId        String
  parentFolderId String?
  name           String
  order          Float       @default(0)
  createdAt      DateTime    @default(now())
  space          Space       @relation(fields: [spaceId], references: [id], onDelete: Cascade)
  parent         DocFolder?  @relation("FolderChildren", fields: [parentFolderId], references: [id], onDelete: SetNull)
  children       DocFolder[] @relation("FolderChildren")
  docs           ImportedDoc[]
  @@map("DocFolder")
}
```

**ImportedDoc additions** (add to existing model):
```prisma
  folderId  String?    // NEW
  order     Float      @default(0)  // NEW
  folder    DocFolder? @relation(fields: [folderId], references: [id], onDelete: SetNull)
```

---

### `apps/nestjs-backend/src/features/doc-search/doc-crud.controller.ts` (controller, CRUD)

**Analog:** `apps/nestjs-backend/src/features/doc-search/doc-ingest.controller.ts`

**Imports pattern** (lines 1-7 of analog):
```typescript
import { Controller, Post, Get, Patch, Delete, Param, Body, Req } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { DOC_INGEST_QUEUE, DocIngestJobData } from './doc-ingest.processor';
```

**Core CRUD pattern** — POST create doc (new, queues reindex on non-empty content):
```typescript
@Controller('api/spaces/:spaceId/docs')
export class DocCrudController {
  constructor(
    @InjectQueue(DOC_INGEST_QUEUE) private readonly queue: Queue,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  async createDoc(
    @Param('spaceId') spaceId: string,
    @Body() body: ICreateDoc,
    @Req() req: { user: { id: string } }
  ) {
    const doc = await this.prisma.importedDoc.create({
      data: {
        spaceId,
        title: body.title ?? 'Untitled',
        sourceType: 'markdown',
        rawContent: body.content ?? '',
        folderId: body.folderId ?? null,
        order: body.order ?? 0,
        isIndexed: false,
        createdBy: req.user.id,
      },
    });
    if (doc.rawContent) {
      await this.queue.add('reindex', {
        type: 'reindex', docId: doc.id, spaceId,
      } satisfies DocIngestJobData);
    }
    return doc;
  }

  @Patch(':docId')
  async updateDoc(
    @Param('spaceId') spaceId: string,
    @Param('docId') docId: string,
    @Body() body: IUpdateDoc,
  ) {
    const doc = await this.prisma.importedDoc.update({
      where: { id: docId },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.content !== undefined && { rawContent: body.content, isIndexed: false }),
        ...(body.folderId !== undefined && { folderId: body.folderId }),
        ...(body.order !== undefined && { order: body.order }),
      },
    });
    if (body.content !== undefined) {
      await this.queue.add('reindex', {
        type: 'reindex', docId, spaceId,
      } satisfies DocIngestJobData);
    }
    return doc;
  }
}
```

**BullMQ queue pattern** (lines 18-24 of `doc-ingest.controller.ts`):
```typescript
const job = await this.queue.add('ingest', {
  type: 'markdown',
  spaceId,
  title: body.title,
  content: body.content,
  userId: req.user.id,
} satisfies DocIngestJobData);
return { jobId: job.id, status: 'queued' };
```

---

### `apps/nestjs-backend/src/features/doc-search/doc-folder.service.ts` (service, CRUD)

**Analog:** `apps/nestjs-backend/src/features/doc-search/doc-ingest.controller.ts` + Prisma patterns

**Core pattern** — folder CRUD with child move-on-delete:
```typescript
@Injectable()
export class DocFolderService {
  constructor(private readonly prisma: PrismaService) {}

  async listFolders(spaceId: string) {
    return this.prisma.docFolder.findMany({ where: { spaceId }, orderBy: { order: 'asc' } });
  }

  async createFolder(spaceId: string, data: ICreateDocFolder) {
    return this.prisma.docFolder.create({
      data: { spaceId, name: data.name, parentFolderId: data.parentFolderId ?? null, order: data.order ?? 0 },
    });
  }

  async updateFolder(folderId: string, data: IUpdateDocFolder) {
    return this.prisma.docFolder.update({ where: { id: folderId }, data });
  }

  async deleteFolder(folderId: string) {
    // Move children to parent before deleting
    const folder = await this.prisma.docFolder.findUniqueOrThrow({ where: { id: folderId } });
    await this.prisma.docFolder.updateMany({
      where: { parentFolderId: folderId },
      data: { parentFolderId: folder.parentFolderId },
    });
    await this.prisma.importedDoc.updateMany({
      where: { folderId },
      data: { folderId: folder.parentFolderId },
    });
    return this.prisma.docFolder.delete({ where: { id: folderId } });
  }
}
```

---

### `apps/nestjs-backend/src/features/doc-search/doc-ingest.processor.ts` (mod, event-driven)

**Analog:** same file (lines 1-31)

**WARNING — Pitfall 6:** The processor uses `@Processor(DOC_INGEST_QUEUE)` with a single `process()` method (no `@Process('ingest')` decorator — it handles ALL jobs). Add an explicit `if (job.name === 'reindex')` branch.

**Modified `DocIngestJobData`** (extend the existing interface):
```typescript
export interface DocIngestJobData {
  type: 'markdown' | 'pdf' | 'reindex';  // ADD 'reindex'
  spaceId: string;
  title?: string;      // make optional for reindex
  content?: string;
  pdfBase64?: string;
  userId?: string;     // make optional for reindex
  docId?: string;      // ADD for reindex branch
}
```

**Modified `process()` handler** (add after existing branches):
```typescript
async process(job: Job<DocIngestJobData>): Promise<void> {
  const { type } = job.data;
  if (type === 'markdown' && job.data.content) {
    await this.ingestionService.ingestMarkdown(/* ... */);
  } else if (type === 'pdf' && job.data.pdfBase64) {
    /* ... existing ... */
  } else if (type === 'reindex' && job.data.docId) {
    // NEW branch
    await this.ingestionService.reindexDoc(job.data.spaceId, job.data.docId);
  }
}
```

---

### `apps/nestjs-backend/src/features/ai/unified-ai.service.ts` (mod, request-response)

**Analog:** same file (lines 1-80)

**Add `generateEmbeddings` method** — delegate pattern, same class structure:
```typescript
// Add to UnifiedAiService class after existing chat() method:
async generateEmbeddings(texts: string[]): Promise<number[][]> {
  // The configured AI provider may not support embeddings.
  // Fallback to direct OpenAI call if provider lacks embed support.
  // This is intentional (D-09 says delegate; D-09 note says fallback allowed).
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new ServiceUnavailableException('OPENAI_API_KEY required for embeddings');
  const batchSize = 20;
  const results: number[][] = [];
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: 'text-embedding-3-small', input: batch }),
    });
    if (!res.ok) throw new ServiceUnavailableException(`Embeddings API error: ${await res.text()}`);
    const data = await res.json() as { data: { embedding: number[] }[] };
    results.push(...data.data.map((d: { embedding: number[] }) => d.embedding));
  }
  return results;
}
```

---

### `apps/nestjs-backend/src/features/doc-search/embedding.service.ts` (mod, request-response)

**Analog:** same file (lines 1-51) + `unified-ai.service.ts`

**Refactored pattern** — inject `UnifiedAiService`, delegate `generateBatchEmbeddings`:
```typescript
@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);

  constructor(private readonly unifiedAiService: UnifiedAiService) {}  // INJECT

  async generateEmbedding(text: string): Promise<number[]> {
    const results = await this.generateBatchEmbeddings([text]);
    return results[0];
  }

  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    return this.unifiedAiService.generateEmbeddings(texts);  // DELEGATE (D-09)
  }
}
```

---

### `packages/openapi/src/doc-search/doc.ts` (new, request-response)

**Analog:** `packages/openapi/src/ai/agent.ts` (lines 1-32)

**Zod schema + type pattern:**
```typescript
import { z } from 'zod';

export const CreateDocSchema = z.object({
  title: z.string().min(1).max(500).optional().default('Untitled'),
  folderId: z.string().nullable().optional(),
  content: z.string().max(512_000).optional().default(''),
  order: z.number().optional(),
});
export type ICreateDoc = z.infer<typeof CreateDocSchema>;

export const UpdateDocSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  content: z.string().max(512_000).optional(),
  folderId: z.string().nullable().optional(),
  order: z.number().optional(),
});
export type IUpdateDoc = z.infer<typeof UpdateDocSchema>;

// Extend IImportedDoc with new optional fields (Pitfall 5 — keep optional):
// Add to packages/openapi/src/doc-search/index.ts IImportedDoc interface:
// folderId?: string | null;
// order?: number;
```

---

### `packages/openapi/src/doc-search/doc-folder.ts` (new, request-response)

**Analog:** `packages/openapi/src/ai/agent.ts`

```typescript
import { z } from 'zod';

export const CreateDocFolderSchema = z.object({
  name: z.string().min(1).max(200),
  parentFolderId: z.string().nullable().optional(),
  order: z.number().optional(),
});
export type ICreateDocFolder = z.infer<typeof CreateDocFolderSchema>;

export const UpdateDocFolderSchema = CreateDocFolderSchema.partial();
export type IUpdateDocFolder = z.infer<typeof UpdateDocFolderSchema>;

export interface IDocFolder {
  id: string;
  spaceId: string;
  parentFolderId: string | null;
  name: string;
  order: number;
  createdAt: string;
}
```

---

### `packages/openapi/src/doc-search/index.ts` (mod)

**Analog:** `packages/openapi/src/ai/index.ts` (barrel re-export pattern)

**Add exports:**
```typescript
export * from './doc';          // NEW
export * from './doc-folder';   // NEW
// Keep existing exports: IDocSearchQuery, IDocSearchResult, IImportedDoc, IDocLinkGraph
```

**Modify `IImportedDoc`** (add optional fields — Pitfall 5):
```typescript
export interface IImportedDoc {
  // ...existing fields (id, spaceId, title, sourceType, sourceUrl, wordCount, chunkCount, isIndexed, createdBy, createdAt, updatedAt)...
  folderId?: string | null;   // NEW — optional during schema transition
  order?: number;             // NEW — optional during schema transition
  rawContent?: string;        // NEW — only returned by GET /docs/:docId endpoint
}
```

---

### `apps/nextjs-app/src/features/app/blocks/doc-search/DocLibrary.tsx` (mod, CRUD)

**Analog:** same file (lines 1-146) + `Sidebar.tsx` (Resizable pattern, lines 118-153)

**New layout pattern** (replace existing `flex-col` div with inner split):
```typescript
import { Resizable } from 're-resizable';
import { DocFolderTree } from './DocFolderTree';
import { DocEditorArea } from './DocEditorArea';

export function DocLibrary({ spaceId }: DocLibraryProps) {
  // Remove: selectedDoc, showSearch local state -> moved to useDocEditorStore
  return (
    <div className="flex h-full overflow-hidden">
      <Resizable
        defaultSize={{ width: 240, height: '100%' }}
        minWidth={160}
        maxWidth={400}
        enable={{ right: true }}
        handleClasses={{ right: 'group' }}
        handleStyles={{ right: { width: '6px', right: '-6px' } }}
        handleComponent={{
          right: <div className="h-full w-px bg-transparent transition-colors group-hover:bg-primary/50 group-active:bg-primary" />,
        }}
      >
        <DocFolderTree spaceId={spaceId} />
      </Resizable>
      <div className="flex-1 overflow-hidden">
        <DocEditorArea spaceId={spaceId} />
      </div>
    </div>
  );
}
```

---

### `apps/nextjs-app/src/features/app/blocks/doc-search/DocFolderTree.tsx` (new, event-driven)

**Analog:** `apps/nextjs-app/src/features/app/blocks/base/base-side-bar/BaseNodeTree.tsx`

**Imports pattern** (lines 1-40 of analog — use same headless-tree imports):
```typescript
'use client';
import {
  AssistiveTreeDescription,
  createOnDropHandler,
  dragAndDropFeature,
  hotkeysCoreFeature,
  keyboardDragAndDropFeature,
  selectionFeature,
  syncDataLoaderFeature,
  useTree,
} from '@teable/ui-lib/base/headless-tree';
import type { DragTarget, ItemInstance } from '@teable/ui-lib/base/headless-tree';
import { Tree, TreeDragLine, TreeItem, TreeItemLabel } from '@teable/ui-lib/shadcn/ui/tree';
import { ScrollArea, ScrollBar } from '@teable/ui-lib/shadcn/ui/scroll-area';
import { ChevronDownIcon } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocalStorage } from 'react-use';
import { LocalStorageKeys } from '@teable/sdk/config';
```

**Node data type** (adapted from `TreeItemData` pattern — lines 136-143 of analog):
```typescript
export type DocTreeItemData =
  | { type: 'folder'; id: string; name: string; parentFolderId: string | null; order: number; children?: string[] }
  | { type: 'doc'; id: string; title: string; folderId: string | null; order: number; isIndexed: boolean };

export const ROOT_ID = '__root__';
```

**`useTree` instantiation pattern** (lines 316-368 of analog):
```typescript
const tree = useTree<DocTreeItemData>({
  state: { selectedItems, expandedItems },
  setSelectedItems,
  setExpandedItems,
  rootItemId: ROOT_ID,
  indent: 20,
  dataLoader: {                             // MUST be memoized (Pitfall 4)
    getItem: (itemId) => treeItemsRef.current[itemId] ?? {},
    getChildren: (itemId) => treeItemsRef.current[itemId]?.children ?? [],
  },
  getItemName: (item) => {
    const d = item.getItemData();
    return d.type === 'folder' ? d.name : d.title;
  },
  isItemFolder: (item) => item.getItemData().type === 'folder',
  canReorder: true,
  canDrag: () => !editingId,
  onDrop: handleDrop,
  onPrimaryAction: handlePrimaryAction,
  features: [syncDataLoaderFeature, selectionFeature, hotkeysCoreFeature,
             dragAndDropFeature, keyboardDragAndDropFeature],
});
```

**Expand state with `useLocalStorage`** (lines 191-203 of analog):
```typescript
const [expandedItems, setExpandedItems] = useLocalStorage<string[]>(
  LocalStorageKeys.DocFolderTreeExpandedItems,  // add this key to LocalStorageKeys enum
  []
);
```

**Status dot for isIndexed** (analog `ItemStatus` pattern — lines 600-614):
```typescript
const ItemStatus = ({ item }: { item: ItemInstance<DocTreeItemData> }) => {
  const d = item.getItemData();
  if (d.type !== 'doc') return null;
  return (
    <span className={cn('size-1.5 shrink-0 rounded-full', d.isIndexed ? 'bg-emerald-500' : 'bg-yellow-500')} />
  );
};
```

**Tree render** (lines 713-698 of analog — `renderEditTree` structure):
```typescript
<Tree indent={20} tree={tree} className="py-1">
  <AssistiveTreeDescription tree={tree} />
  {tree.getItems().map((item) => {
    const nodeId = item.getId();
    const d = item.getItemData();
    if (!d || Object.keys(d).length === 0) return null;
    return (
      <TreeItem asChild key={nodeId} item={item}>
        <div className="h-8 w-full cursor-pointer">
          <TreeItemLabel className="size-full min-w-0 py-0">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              {item.isFolder()
                ? <ChevronDownIcon className="size-4 text-muted-foreground group-aria-[expanded=false]:-rotate-90" />
                : <FileText className="size-4 text-muted-foreground" />}
              <span className="truncate text-left">{item.getItemName()}</span>
              <ItemStatus item={item} />
            </div>
          </TreeItemLabel>
        </div>
      </TreeItem>
    );
  })}
  <TreeDragLine />
</Tree>
```

---

### `apps/nextjs-app/src/features/app/blocks/doc-search/DocEditorArea.tsx` (new, event-driven)

**Analog:** `apps/nextjs-app/src/features/app/base-node/CodeEditor.tsx` (lines 1-156)

**WARNING — Pitfall 2:** Two separate `useEffect`s. Never include `value` in the init `useEffect` deps.

**Imports pattern** (lines 1-27 of analog, swap `javascript` for `markdown`):
```typescript
'use client';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';  // ONLY new package
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import { EditorState } from '@codemirror/state';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView, keymap, drawSelection, dropCursor } from '@codemirror/view';
import { useEffect, useRef } from 'react';
import debounce from 'lodash/debounce';
```

**Init `useEffect`** (lines 48-135 of analog — deps: `[theme, readOnly]` only):
```typescript
useEffect(() => {
  if (!containerRef.current) return;
  const extensions = [
    history(),
    drawSelection(),
    dropCursor(),
    markdown(),                             // swap from javascript()
    EditorView.lineWrapping,                // prose wrapping (NOT in CodeEditor)
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
    ...(theme === 'dark' ? [oneDark] : []),
    keymap.of([...defaultKeymap, ...historyKeymap]),
    EditorView.updateListener.of((update) => {
      if (update.docChanged && !readOnly) {
        onChangeRef.current(update.state.doc.toString());
      }
    }),
    ...(readOnly ? [EditorState.readOnly.of(true)] : []),
    EditorView.theme({
      '&': { height: '100%', fontSize: '14px' },
      '.cm-scroller': { overflow: 'auto', lineHeight: '1.7', fontFamily: 'inherit' },
    }),
  ];
  const state = EditorState.create({ doc: value, extensions });
  const view = new EditorView({ state, parent: containerRef.current });
  viewRef.current = view;
  return () => { view.destroy(); viewRef.current = null; };
}, [theme, readOnly]); // eslint-disable-line react-hooks/exhaustive-deps
```

**Value sync `useEffect`** (lines 138-147 of analog — separate effect):
```typescript
useEffect(() => {
  const view = viewRef.current;
  if (!view) return;
  const current = view.state.doc.toString();
  if (current !== value) {
    view.dispatch({ changes: { from: 0, to: current.length, insert: value } });
  }
}, [value]);
```

**Auto-save debounce pattern** (from RESEARCH.md Code Examples):
```typescript
const saveRef = useRef<(content: string) => void>();
saveRef.current = async (content: string) => {
  await patchDoc(spaceId, docId, { content });
};
const debouncedSave = useCallback(
  debounce((content: string) => saveRef.current?.(content), 800),
  []  // stable ref — recreate only on mount
);
const handleChange = (content: string) => {
  setLocalContent(content);
  debouncedSave(content);
};
```

**Split/preview mode** (D-04 — controlled by `useDocEditorStore`):
```typescript
// mode === 'edit':   <div ref={containerRef} />
// mode === 'split':  <div className="flex h-full">
//                      <div ref={containerRef} className="w-1/2" />
//                      <div className="w-1/2 overflow-auto p-4 prose prose-sm dark:prose-invert">
//                        <ReactMarkdown>{localContent}</ReactMarkdown>
//                      </div>
//                    </div>
// mode === 'preview': <ReactMarkdown> only
```

---

### `apps/nextjs-app/src/features/app/blocks/doc-search/useDocEditorStore.ts` (new)

**Analog:** `apps/nextjs-app/src/features/app/components/sidebar/useSidebarStore.ts` (all 25 lines) + `useChatPanelStore.ts` (all 60 lines)

**Full pattern** (lines 1-25 of `useSidebarStore.ts` + partialize from `useChatPanelStore.ts` lines 54-58):
```typescript
import { LocalStorageKeys } from '@teable/sdk/config';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Add to LocalStorageKeys enum in @teable/sdk:
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
    {
      name: LocalStorageKeys.DocEditor,
      partialize: (state) => ({      // only persist non-null selections + mode (from useChatPanelStore pattern)
        mode: state.mode,
      }),
    }
  )
);
```

---

### `apps/nextjs-app/src/features/app/blocks/doc-search/hooks.ts` (mod, CRUD)

**Analog:** same file (lines 1-112) — replace raw `fetch()` with SDK functions

**Target pattern** (D-08 — use `@teable/openapi` SDK + `ReactQueryKeys`):
```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ICreateDoc, IUpdateDoc, ICreateDocFolder, IUpdateDocFolder } from '@teable/openapi';
// Import SDK functions (from packages/openapi/src/doc-search/):
// import { createDoc, updateDoc, listDocs, deleteDoc, listDocFolders, createDocFolder, ... } from '@teable/openapi';

// Replace raw fetch pattern:
// BEFORE: fetch(`/api/spaces/${spaceId}/docs`).then(r => r.json())
// AFTER:  listDocs(spaceId).then(r => r.data)

// Query key pattern (use existing docKeys structure + extend):
const docKeys = {
  list: (spaceId: string) => ['docs', spaceId, 'list'] as const,
  doc: (docId: string) => ['docs', docId] as const,
  links: (docId: string) => ['docs', docId, 'links'] as const,
  folders: (spaceId: string) => ['doc-folders', spaceId] as const,  // NEW
};

// onSuccess invalidation pattern (lines 51-52 of existing hooks.ts):
onSuccess: () => qc.invalidateQueries({ queryKey: docKeys.list(spaceId) }),
```

---

## Shared Patterns

### BullMQ Queue Injection
**Source:** `apps/nestjs-backend/src/features/doc-search/doc-ingest.controller.ts` lines 10, constructor
**Apply to:** `DocCrudController`, any service that queues reindex jobs
```typescript
constructor(@InjectQueue(DOC_INGEST_QUEUE) private readonly queue: Queue) {}
// job name must be 'reindex' (new) or 'ingest' (existing) — never default/empty
await this.queue.add('reindex', { ... } satisfies DocIngestJobData);
```

### Resizable Panel
**Source:** `apps/nextjs-app/src/features/app/components/sidebar/Sidebar.tsx` lines 118-153
**Apply to:** `DocLibrary.tsx` inner split
```typescript
import { Resizable } from 're-resizable';
<Resizable
  defaultSize={{ width: 240, height: '100%' }}
  minWidth={160}
  maxWidth={400}
  enable={{ right: true }}
  handleClasses={{ right: 'group' }}
  handleComponent={{ right: <div className="h-full w-px bg-transparent transition-colors group-hover:bg-primary/50 group-active:bg-primary" /> }}
>
```

### Zustand Persist
**Source:** `apps/nextjs-app/src/features/app/components/sidebar/useSidebarStore.ts` lines 13-25
**Apply to:** `useDocEditorStore.ts`
```typescript
create<State>()(persist((set) => ({ ... }), { name: LocalStorageKeys.XXX }))
```

### React-Query Mutation + Cache Invalidate
**Source:** `apps/nextjs-app/src/features/app/blocks/doc-search/hooks.ts` lines 36-52
**Apply to:** All new mutation hooks in `hooks.ts`
```typescript
return useMutation({
  mutationFn: (body) => sdkFunction(spaceId, body).then(r => r.data),
  onSuccess: () => qc.invalidateQueries({ queryKey: docKeys.list(spaceId) }),
});
```

### NestJS spaceId ownership guard
**Source:** All existing `/api/spaces/:spaceId` controllers (D-08 security note)
**Apply to:** `DocCrudController`, `DocFolderController`
```typescript
// Verify spaceId ownership before any DB op — follow same guard pattern as other space controllers
// Check that req.user has access to spaceId via existing space membership query
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| pgvector startup guard (D-10) | middleware/bootstrap | event-driven | No existing startup guards in the codebase — planner should use RESEARCH.md pattern: wrap `CREATE EXTENSION IF NOT EXISTS vector` in try/catch in `DocSearchModule.onModuleInit()` |

---

## Metadata

**Analog search scope:** `apps/nestjs-backend/src/features/doc-search/`, `apps/nextjs-app/src/features/app/blocks/doc-search/`, `apps/nextjs-app/src/features/app/components/sidebar/`, `apps/nextjs-app/src/features/app/blocks/base/base-side-bar/`, `apps/nextjs-app/src/features/app/base-node/`, `packages/openapi/src/`, `apps/nestjs-backend/src/features/ai/`
**Files scanned:** 14 analog files read
**Pattern extraction date:** 2026-06-01
