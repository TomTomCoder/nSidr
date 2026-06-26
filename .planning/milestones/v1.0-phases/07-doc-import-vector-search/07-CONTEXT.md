# Phase 7: Doc Import & Vector Search - Context

**Gathered:** 2026-05-14
**Status:** Ready to execute

<domain>
## Phase Boundary

This phase delivers a full document import, WYSIWYG collaborative editing, knowledge graph visualization, and vector search system for Teable EE:
- Markdown and PDF document ingestion with async BullMQ processing
- **WYSIWYG Markdown editor** — inline editing using existing `@teable/sdk MarkDownEditor`; content stored as `content_md` (Markdown); re-indexes on save
- **Knowledge graph visualization** — `DocGraphPanel` using `@xyflow/react` (React Flow); nodes = `ImportedDoc`, edges = `DocLink`; depth-2 traversal from any root doc
- Vector embeddings (pgvector, OpenAI text-embedding-3-small) stored as DocChunk rows; `IVectorStore` abstraction allows future Pinecone/Weaviate backend
- Semantic search (cosine distance), keyword search (PostgreSQL full-text, language configurable), and hybrid re-ranking
- URL import endpoint (`POST /docs/import/url`) — activates the already-defined `DocSourceType.url`
- Admin UI: DocSearchPanel (Cmd+Shift+K), DocImportPanel, DocViewer (with edit mode), DocLibrary, DocGraphPanel
- Scoped to a spaceId — all docs, chunks, and links are space-isolated
</domain>

<decisions>
## Implementation Decisions

### Database & Prisma

- **D-01:** pgvector enabled via `previewFeatures = ["postgresqlExtensions"]` in `generator client` block and `extensions = [vector(map: "vector")]` in `datasource db` block. Datasource provider must be normalized to `"postgresql"` (not `"postgres"`).
- **D-02:** `CREATE EXTENSION IF NOT EXISTS vector;` must be run as superuser before `db push` if the Teable DB user lacks `CREATE EXTENSION` privileges.
- **D-03:** Three new Prisma models: `ImportedDoc`, `DocChunk`, `DocLink`. Two new enums: `DocSourceType` (markdown, pdf, url) and `DocLinkType` (internal, external).
- **D-04:** `DocChunk.embedding` is typed `Unsupported("vector(1536)")` — Prisma generates no typed accessor. All vector reads/writes use `prisma.$queryRaw` and `prisma.$executeRaw`.
- **D-05:** Vector insert pattern: `INSERT INTO "DocChunk" (..., embedding, ...) VALUES (..., ${embeddingJson}::vector, ...)` via Prisma tagged template literal (parameterized).
- **D-06:** `ImportedDoc` has `@@index([spaceId])` and `@@index([createdBy])`; `DocChunk` has `@@index([docId])`; `DocLink` has `@@index([fromDocId])` and `@@index([toDocId])`.
- **D-07:** `DocChunk` cascades `onDelete: Cascade` from `ImportedDoc`. `DocLink.toDocId` uses `onDelete: SetNull` (external links survive if target doc is deleted).

### Embedding Model

- **D-08:** Model: `text-embedding-3-small`. Output dimensions: 1536 (default). Configurable via `EMBEDDING_DIMENSIONS` env var (`parseInt(process.env.EMBEDDING_DIMENSIONS ?? '1536', 10)`).
- **D-09:** `EmbeddingService` always calls OpenAI directly at `https://api.openai.com/v1/embeddings` using native `fetch` — it does NOT use the configured AI provider or `ai.service.ts`. `OPENAI_API_KEY` env var is required separately.
- **D-10:** `EmbeddingService` throws `ServiceUnavailableException` if `OPENAI_API_KEY` is not set. It logs a warning on construction but does not throw until `generateEmbedding` or `generateBatchEmbeddings` is called.
- **D-11:** Batch size for embedding API calls is 20 texts per request.

### Chunking Strategy

- **D-12:** Sliding window: 512 tokens → ~384 words. Overlap: 50 tokens → ~37 words. Approximation: 1 token = 0.75 words (word-count only, no tokenizer library).
- **D-13:** Constants in `DocIngestionService`: `CHUNK_WORDS = 384`, `OVERLAP_WORDS = 37`.
- **D-14:** Chunk content is capped at 2000 tokens (≈ 1500 words) before sending to `EmbeddingService`. Chunks exceeding this are truncated and a warning is logged. This limits vector injection surface (threat T-07-03-06).

### Vector Similarity Search

- **D-15:** Cosine distance via pgvector `<=>` operator. Score formula: `score = 1 - distance` (0 = identical, 2 = opposite; score range [0, 1]).
- **D-16:** All vector queries use `prisma.$queryRaw` with parameterized bindings. The query string `[${embedding.join(',')}]` is derived from a `number[]` typed response — no user input reaches the vector literal.

### Hybrid Search

- **D-17:** Hybrid formula: `final_score = 0.7 * semantic_score + 0.3 * keyword_score`. Results from both modes are merged and deduplicated by `chunkId`. Overlap chunks accumulate both scores.
- **D-18:** Keyword search uses `to_tsvector('english', dc.content) @@ plainto_tsquery('english', ${query})` and ranks with `ts_rank`. Language defaults to `english`. To support French corpora, set env var `DOC_SEARCH_LANGUAGE=french` — the service reads `process.env.DOC_SEARCH_LANGUAGE ?? 'english'` and injects it into both `to_tsvector` and `plainto_tsquery` calls. Accepted values are any PostgreSQL `regconfig` language name (e.g., `french`, `english`, `spanish`).
- **D-19:** Default `limit` = 10; maximum `limit` = 100 (enforced in controller).

### Ingestion Pipeline

- **D-20:** BullMQ queue name: `DOC_INGEST` (exported constant `DOC_INGEST_QUEUE` from `doc-ingest.processor.ts`).
- **D-21:** HTTP endpoints return `{ jobId, status: "queued" }` immediately — ingestion never blocks the HTTP response. Processing is fully async via `DocIngestionProcessor` (BullMQ `WorkerHost`).
- **D-22:** PDF text extraction: `pdf-parse` npm package (CommonJS). Must be installed via `npm install pdf-parse` and `npm install -D @types/pdf-parse`. Loaded via `require()` with `eslint-disable-next-line @typescript-eslint/no-require-imports` — dynamic require is intentional.
- **D-23:** PDF ingest calls `ingestMarkdown` internally, then updates `sourceType` to `'pdf'`. No separate chunking path for PDF.
- **D-24:** PDF upload: multipart/form-data, Multer `FileInterceptor('file')`, `limits.fileSize = 50 * 1024 * 1024` (50 MB). Client-side validation also enforces 50 MB cap and MIME type `application/pdf`.
- **D-25:** After job completes: `ImportedDoc.isIndexed = true`, `ImportedDoc.chunkCount = chunks.length`.
- **D-26:** `userId` is derived from JWT session (`req.user.id`) — not from the request body. `JwtAuthGuard` applied at controller level on both import endpoints.

### Link Graph

- **D-27:** Wiki links extracted by regex `/\[\[([^\]]+)\]\]/g`. Markdown links extracted by `/\[([^\]]+)\]\(([^)]+)\)/g`.
- **D-28:** Internal link resolution: case-insensitive title match within the same `spaceId` (`findFirst` with `mode: 'insensitive'`). If no match, `toDocId` is null (unresolved internal link).
- **D-29:** External links: `href` starts with `http://` or `https://`. Stored with `linkType: 'external'`, `toUrl = href`.
- **D-30:** `DocLink.createMany({ data: links, skipDuplicates: true })` used for batch insert.

### REST API Shape

- **D-31:** Import endpoints: `POST /api/spaces/:spaceId/docs/import/markdown` and `POST /api/spaces/:spaceId/docs/import/pdf`.
- **D-32:** Search endpoint: `POST /api/spaces/:spaceId/docs/search` with body `{ query, mode?: 'semantic'|'keyword'|'hybrid', limit?: number }`.
- **D-33:** Other endpoints: `GET /api/spaces/:spaceId/docs` (list), `GET /api/spaces/:spaceId/docs/:docId` (single, includes rawContent), `GET /api/spaces/:spaceId/docs/:docId/links` (link graph), `DELETE /api/spaces/:spaceId/docs/:docId` (cascade).
- **D-34:** `rawContent` is NOT included in the list endpoint `select`. `DocViewer` fetches the full record via `GET /api/spaces/:spaceId/docs/:docId` when the modal opens.

### UI Security (XSS Prevention)

- **D-35:** CRITICAL — doc content MUST NEVER be rendered as HTML. All document content is rendered as plain text exclusively: `<pre>` tag with `whitespace-pre-wrap` in DocViewer, `<p>` text nodes in DocSearchPanel result excerpts. No `innerHTML` assignment or React's unsafe HTML prop anywhere in doc-search components.
- **D-36:** `linkText` values in DocViewer link lists are rendered as React text nodes inside `<li>` elements — React escapes all special characters automatically, preventing injection.
- **D-37:** Chunk content excerpts in search results are rendered as `<p>` text nodes, not parsed or injected as HTML.

### UI Components

- **D-38:** Keyboard shortcut: `Cmd+Shift+K` (macOS) / `Ctrl+Shift+K` (Windows/Linux) opens DocSearchPanel. Implemented as a `window.addEventListener('keydown', handler)` effect in the app root layout or global keyboard handler. Check for existing `useKeyboardShortcut` hook before adding new event listener.
- **D-39:** DocSearchPanel uses `useMutation` (not `useQuery`) for search — triggered on input change when `query.length > 1`.
- **D-40:** DocImportPanel uses tabs: `markdown` (textarea paste) and `pdf` (drag-and-drop + file input, `accept="application/pdf"`).
- **D-41:** No animation libraries — plain CSS transitions (`transition-*` Tailwind classes) only.
- **D-42:** Styling: Tailwind CSS, dark mode via `dark:` variants. No inline style objects.

### NestJS Module Registration

- **D-43:** If `@nestjs/bullmq` is not in `package.json`, add: `npm install @nestjs/bullmq bullmq`.
- **D-44:** `DocSearchModule` registered in `apps/nestjs-backend/src/app.module.ts` imports array alongside other feature modules.

### WYSIWYG Markdown Editor

- **D-45:** `ImportedDoc.rawContent` is renamed to `ImportedDoc.content_md` — requires a Prisma migration (`ALTER TABLE "ImportedDoc" RENAME COLUMN "rawContent" TO "content_md"`). This is a Wave 1 schema change. All existing code referencing `rawContent` must be updated to `content_md`.
- **D-46:** WYSIWYG editor reuses the existing `@teable/sdk` exports: `MarkDownEditor` (editing) and `MarkdownPreview` (read-only view). These are already used in `apps/nextjs-app/src/features/app/blocks/admin/template/components/MarkdownEditor.tsx` — follow that pattern exactly. No new library dependency needed.
- **D-47:** `DocViewer` gains a dual-mode toggle button (pencil icon). In edit mode: `MarkDownEditor` with 500 ms debounce auto-save on blur. In view mode: `MarkdownPreview`. No explicit save button — unsaved state shown as a dot indicator in the panel header.
- **D-48:** Auto-save triggers `PATCH /api/spaces/:spaceId/docs/:docId` with body `{ content_md: string }`. The backend service updates `ImportedDoc.content_md`, sets `isIndexed = false`, and enqueues a re-ingest job to `DOC_INGEST` queue.
- **D-49:** Re-indexing on edit: when `content_md` changes, the existing `DocIngestionProcessor` re-runs (delete old chunks + links, then re-chunk + re-embed + re-extract links). This moves re-indexing from "deferred" to in-scope. `isIndexed` is `false` during re-index, `true` when complete.

### Knowledge Graph Visualization

- **D-50:** New dependency: `@xyflow/react` (React Flow v12+). Install via `npm install @xyflow/react`. No other graph library is present in the codebase. Required CSS: `import '@xyflow/react/dist/style.css'` in the DocGraphPanel component.
- **D-51:** `DocGraphPanel` component reads `GET /api/spaces/:spaceId/docs/:docId/links?depth=2`. Response shape: `{ nodes: IImportedDoc[], edges: IDocLink[] }`. Nodes rendered as React Flow nodes; edges rendered as React Flow edges with `animated: true` for internal links.
- **D-52:** Edge visual distinction: blue (`#3b82f6`) for `linkType: 'internal'`, gray (`#9ca3af`) for `linkType: 'external'`. Node click opens `DocViewer` in a side panel (not a new route).
- **D-53:** DocGraphPanel is opened via a "Graphe" button in `DocLibrary` toolbar (icon: `Network` from `@teable/icons` or lucide fallback). Layout: auto-arranged using React Flow's built-in force layout or dagre layout via `@dagrejs/dagre` peer dep (check if already in monorepo before installing).

### URL Import

- **D-54:** New endpoint `POST /api/spaces/:spaceId/docs/import/url` with body `{ url: string, title?: string }`. Server-side HTML fetch via native `fetch` in Node 18+. HTML→text strip: remove all `<script>`, `<style>`, `<nav>`, `<header>`, `<footer>` tags, then strip remaining tags with `/(<([^>]+)>)/gi` regex. Title defaults to the page `<title>` tag if not provided. Queued via `DOC_INGEST` — same async pattern as markdown import. This activates the already-defined `DocSourceType.url` enum value.

### Vector Store Abstraction

- **D-55:** Add `IVectorStore` interface in `apps/nestjs-backend/src/features/doc-search/vector-store.interface.ts`:
  ```typescript
  interface IVectorStore {
    upsert(chunkId: string, docId: string, spaceId: string, embedding: number[], content: string): Promise<void>;
    query(embedding: number[], limit: number, spaceId: string): Promise<{ chunkId: string; score: number; content: string }[]>;
    delete(docId: string): Promise<void>;
  }
  ```
- **D-56:** Default implementation is `PgVectorStore` (wraps the existing `$queryRaw`/`$executeRaw` pgvector calls). Factory reads `process.env.VECTOR_STORE_BACKEND ?? 'pgvector'` and returns the correct implementation. Pinecone implementation is deferred but the interface is locked.
- **D-57:** `DocSearchService` and `DocIngestionService` inject `IVectorStore` via NestJS token `VECTOR_STORE` (custom provider). `DocSearchModule` provides it: `{ provide: 'VECTOR_STORE', useClass: PgVectorStore }`.

### Claude's Discretion

The following are left to the implementing executor:
- Exact sidebar file path for Doc Search navigation item registration (must be discovered by reading actual codebase)
- State management approach for `DocSearchPanel` open state (local state, Zustand, or React context — follow existing app pattern)
- Whether to add a GIN index on `DocChunk.content` for keyword search performance (can be deferred)
- Exact Tailwind class variants for focus/hover states (match existing block component style)
- Whether `getDocGraph` endpoint needs pagination (deferred — acceptable for current scale)
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Schema & Migration
- `packages/db-main-prisma/prisma/postgres/schema.prisma` — Read fully before editing; add pgvector extension + 3 models + 2 enums; preserves all existing models

### BullMQ Infrastructure
- `apps/nestjs-backend/src/features/doc-search/doc-ingest.processor.ts` — Exports `DOC_INGEST_QUEUE = 'DOC_INGEST'`; `DocIngestionProcessor` extends `WorkerHost`; job payload type `DocIngestJobData`
- Phase 3 reference: `apps/nestjs-backend/src/features/` — BullMQ `QueueModule` pattern from Phase 3 Wave 3 (if implemented first); `@nestjs/bullmq` `BullModule.registerQueue` pattern

### Existing Import Patterns
- `apps/nestjs-backend/src/features/import/` — Reference for existing file import patterns in NestJS (controller, service structure)
- `apps/nestjs-backend/src/features/ai/ai.service.ts` — Existing OpenAI API usage pattern; `EmbeddingService` does NOT extend or reuse this — it calls OpenAI directly with a separate key

### OpenAPI Types
- `packages/openapi/src/doc-search/index.ts` — Defines `IDocSearchQuery`, `IDocSearchResult`, `IImportedDoc`, `IDocLinkGraph`; consumed by frontend hooks

### NestJS App Registration
- `apps/nestjs-backend/src/app.module.ts` — Add `DocSearchModule` to imports array

### Frontend Hooks
- `apps/nextjs-app/src/features/app/blocks/doc-search/hooks.ts` — 6 React Query hooks: `useDocList`, `useDocSearch` (mutation), `useImportMarkdown`, `useImportPdf`, `useDocLinks`, `useDoc`, `useDeleteDoc`

### Frontend Block Pattern
- `apps/nextjs-app/src/features/app/blocks/` — Pick one existing block directory as structural reference before creating doc-search block
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **BullMQ from Phase 3** (if executed): `BullModule` global registration in AppModule; Redis connection config already set up; `@nestjs/bullmq` already in `package.json`. Phase 7 registers its own queue (`DOC_INGEST`) via `BullModule.registerQueue`.
- **PromptService from Phase 2**: `EmbeddingService` follows the same `Injectable()` pattern with env-var-based construction. No dependency on `PromptService` needed for Phase 7.
- **PrismaService**: Injected into all services via `private readonly prisma: PrismaService`. Import from `../../db-provider/prisma.service`.
- **JwtAuthGuard**: Applied at controller level via `@UseGuards(JwtAuthGuard)`. Import from `../../auth/guard/jwt.auth.guard`.

### Established Patterns
- **NestJS features**: Each feature lives under `apps/nestjs-backend/src/features/{feature-name}/`. Module file is `{feature}.module.ts`, services are `{name}.service.ts`, controllers are `{name}.controller.ts`.
- **React Query hooks**: Frontend hooks in `hooks.ts` files per block; use `@tanstack/react-query`; `useQuery` for reads, `useMutation` for writes/searches; invalidate list query on mutation success.
- **React components**: `'use client'` directive at top; Tailwind for all styling; dark mode via `dark:` prefix; no animation libraries.
- **OpenAPI types**: Exported from `packages/openapi/src/{feature}/index.ts`; consumed as `import type { ... } from '@teable/openapi'` in frontend.
- **Barrel exports**: Each block has `index.ts` re-exporting all public components.

### Integration Points
- **Sidebar**: Doc Search navigation item must be added to the base sidebar layout component. Exact path requires reading the actual codebase (not hardcodeable from plan files alone).
- **Space context**: All doc-search operations are scoped to `spaceId`. The frontend must obtain `spaceId` from the auth/space context — never from a raw URL parameter on the client.
- **Keyboard shortcut registry**: `Cmd+Shift+K` must be registered in the app root layout or an existing global keyboard shortcut handler. Check for `useKeyboardShortcut` hook or similar before adding a new `window.addEventListener`.
- **Auth**: `req.user.id` from JWT session is used as `userId` for import attribution.
</code_context>

<specifics>
## Specific Ideas

### Exact Values
- Vector dimensions: `1536`
- Embedding model: `text-embedding-3-small`
- Env var for dimensions: `EMBEDDING_DIMENSIONS`
- Chunk size: `384 words` (512 tokens approximation at 0.75 words/token)
- Overlap: `37 words` (50 tokens approximation)
- Max chunk tokens before truncation: `2000` (approx 1500 words)
- Embedding batch size: `20` texts per OpenAI API request
- BullMQ queue name constant: `DOC_INGEST` (string `'DOC_INGEST'`)
- PDF size limit: `50 * 1024 * 1024` bytes (50 MB)
- Hybrid weights: semantic `0.7`, keyword `0.3`
- Default search limit: `10`; max search limit: `100`
- Vector similarity operator: `<=>` (cosine distance)
- Score formula: `score = 1 - distance`
- Keyword search language: `'english'`
- Keyboard shortcut: `metaKey || ctrlKey` + `shiftKey` + `key === 'K'`

### Key SQL Patterns
```sql
-- Vector insert (in $executeRaw)
INSERT INTO "DocChunk" (id, "docId", "chunkIndex", content, embedding, "tokenCount", "startOffset", "endOffset")
VALUES (gen_random_uuid()::text, ${doc.id}, ${i}, ${chunkContent}, ${embeddingJson}::vector, ${tokenCount}, ${startOffset}, ${endOffset})

-- Semantic search (in $queryRaw)
SELECT dc.id, dc.content, dc."docId" AS doc_id, d.title,
       dc.embedding <=> ${vectorStr}::vector AS distance
FROM "DocChunk" dc
JOIN "ImportedDoc" d ON dc."docId" = d.id
WHERE d."spaceId" = ${spaceId} AND d."isIndexed" = true
ORDER BY dc.embedding <=> ${vectorStr}::vector
LIMIT ${limit}

-- Keyword search (in $queryRaw)
SELECT dc.id, dc.content, dc."docId" AS doc_id, d.title,
       ts_rank(to_tsvector('english', dc.content), plainto_tsquery('english', ${query})) AS rank
FROM "DocChunk" dc
JOIN "ImportedDoc" d ON dc."docId" = d.id
WHERE d."spaceId" = ${spaceId} AND d."isIndexed" = true
  AND to_tsvector('english', dc.content) @@ plainto_tsquery('english', ${query})
ORDER BY rank DESC
LIMIT ${limit}
```

### File Locations (all new files)
```
packages/db-main-prisma/prisma/postgres/schema.prisma            (modified)
apps/nestjs-backend/src/features/doc-search/embedding.service.ts
apps/nestjs-backend/src/features/doc-search/ingestion.service.ts
apps/nestjs-backend/src/features/doc-search/link-extractor.service.ts
apps/nestjs-backend/src/features/doc-search/doc-ingest.controller.ts
apps/nestjs-backend/src/features/doc-search/doc-ingest.processor.ts
apps/nestjs-backend/src/features/doc-search/search.service.ts
apps/nestjs-backend/src/features/doc-search/graph.service.ts
apps/nestjs-backend/src/features/doc-search/doc-search.controller.ts
apps/nestjs-backend/src/features/doc-search/doc-search.module.ts
packages/openapi/src/doc-search/index.ts
apps/nextjs-app/src/features/app/blocks/doc-search/hooks.ts
apps/nextjs-app/src/features/app/blocks/doc-search/DocSearchPanel.tsx
apps/nextjs-app/src/features/app/blocks/doc-search/DocImportPanel.tsx
apps/nextjs-app/src/features/app/blocks/doc-search/DocViewer.tsx
apps/nextjs-app/src/features/app/blocks/doc-search/DocLibrary.tsx
apps/nextjs-app/src/features/app/blocks/doc-search/index.ts
```

### Prisma Schema Additions
```prisma
// In generator client block:
previewFeatures = ["postgresqlExtensions"]

// In datasource db block:
extensions = [vector(map: "vector")]

// New enums:
enum DocSourceType { markdown; pdf; url }
enum DocLinkType { internal; external }
```
</specifics>

<deferred>
## Deferred Ideas

The following are explicitly out of scope for Phase 7:

- **GIN index on DocChunk.content**: Keyword search performance optimization — add in a future performance phase if needed
- **Normalized hybrid scoring**: Current `ts_rank` and cosine scores are not on the same scale. Proper normalization deferred to a future search quality phase
- **`getDocGraph` pagination**: The graph endpoint returns all nodes and edges for a space. Pagination can be added later when spaces have large document libraries
- **Pinecone/Weaviate implementation**: `IVectorStore` interface locked (D-55/D-56); Pinecone adapter implementation deferred until external vector DB is needed at scale
- **AgentKnowledgeTab integration**: Phase 4 (Super Agent System) will connect Phase 7 doc search as agent knowledge source — not implemented here
- **Multi-language keyword search**: `to_tsvector('english', ...)` hardcoded. Multi-language support deferred
- **Vector index (IVFFlat / HNSW)**: No pgvector ANN index created. Full scan is acceptable at current scale; add in a future phase
- **Streaming search results**: All search results returned as a complete JSON array. Streaming deferred
- **Document update/version history**: No versioning — documents are immutable once imported
</deferred>

---

<testing>
## Testing Strategy

### Gate rule
Each wave must pass before the next starts:
- `npx vitest run --reporter=verbose` (unit tests in nestjs-backend)
- `npx tsc --noEmit -p apps/nestjs-backend/tsconfig.json` (type check)
- Wave 4 only: `npx playwright test apps/nextjs-app/e2e/doc-search/`

### Unit Tests (Vitest) — one spec file per service
- `embedding.service.spec.ts` — mock `fetch`; test batch splitting at 20 texts; `ServiceUnavailableException` when `OPENAI_API_KEY` missing
- `ingestion.service.spec.ts` — mock `EmbeddingService`; test chunk count math with known word counts; test `content_md` → re-ingest path sets `isIndexed = false`
- `search.service.spec.ts` — mock `prisma.$queryRaw`; test hybrid score formula (0.7 × semantic + 0.3 × keyword); test limit enforcement (max 100)
- `link-extractor.service.spec.ts` — test wiki link regex, markdown link regex, internal vs external classification
- `pg-vector-store.spec.ts` — mock `prisma.$executeRaw` / `$queryRaw`; test upsert/query/delete contracts of `IVectorStore`

### Integration Tests (Vitest + test DB)
- `POST /api/spaces/:spaceId/docs/import/markdown` → 202 + `{ jobId, status: "queued" }`
- `PATCH /api/spaces/:spaceId/docs/:docId` with `{ content_md }` → 200; `isIndexed` set to `false` in DB
- `GET /api/spaces/:spaceId/docs` → 200 array; `content_md` NOT included
- `GET /api/spaces/:spaceId/docs/:docId` → 200; `content_md` included
- `POST /api/spaces/:spaceId/docs/search` with `mode: 'hybrid'` → 200; results have `score` field
- `DELETE /api/spaces/:spaceId/docs/:docId` → 204; `DocChunk` and `DocLink` rows cascade-deleted

### E2E Tests (Playwright — Wave 4 checkpoint)
- Import a markdown file → verify it appears in DocLibrary with correct title
- Edit a doc in WYSIWYG mode → blur → verify auto-save indicator clears and `isIndexed` becomes `false`
- Cmd+Shift+K → DocSearchPanel opens; type a query → results render
- Open DocGraphPanel from DocLibrary toolbar → verify node + edge count matches `DocLink` table
- Import from URL → verify doc created with `sourceType: 'url'`

### What NOT to test
- pgvector extension installation (infrastructure)
- OpenAI API response format (mocked in all unit tests)
- Teable core record/table operations
- Prisma generated client internals
</testing>

*Phase: 07-doc-import-vector-search*
*Context gathered: 2026-05-15 (updated with WYSIWYG, knowledge graph, URL import, IVectorStore)*
