---
phase: 13-doc-library-redesign
plan: "03"
subsystem: backend-crud-reindex
tags: [nestjs, bullmq, prisma, embedding, unified-ai, pgvector]
dependency_graph:
  requires: [prisma.importedDoc, DocFolder schema (13-01), EmbeddingService, UnifiedAiService]
  provides: [DocCrudController, reindexDoc, UnifiedAiService.generateEmbeddings, pgvector guard]
  affects: [13-04, 13-05, 13-06, 13-07, 13-08]
tech_stack:
  added: [ICreateDoc, IUpdateDoc Zod schemas in @teable/openapi]
  patterns: [BullMQ reindex job branch, NestJS OnModuleInit startup guard, embedding delegation via UnifiedAiService]
key_files:
  created:
    - apps/nestjs-backend/src/features/doc-search/doc-crud.controller.ts
    - apps/nestjs-backend/src/features/doc-search/doc-crud.controller.spec.ts
    - apps/nestjs-backend/src/features/doc-search/embedding.service.spec.ts
    - packages/openapi/src/doc-search/doc.ts
  modified:
    - apps/nestjs-backend/src/features/ai/unified-ai.service.ts
    - apps/nestjs-backend/src/features/doc-search/embedding.service.ts
    - apps/nestjs-backend/src/features/doc-search/doc-ingest.processor.ts
    - apps/nestjs-backend/src/features/doc-search/ingestion.service.ts
    - apps/nestjs-backend/src/features/doc-search/doc-search.module.ts
    - packages/openapi/src/doc-search/index.ts
decisions:
  - "ICreateDoc/IUpdateDoc added to packages/openapi/src/doc-search/doc.ts (not yet in plan 13-04) to unblock DocCrudController — follows PATTERNS.md lines 306-328"
  - "DocCrudController uses satisfies DocIngestJobData to enforce type safety on queue.add calls"
  - "reindexDoc deletes DocChunk rows via $executeRaw DELETE (Prisma does not support vector column writes natively)"
  - "pgvector guard in DocSearchModule.onModuleInit() — catch logs error but does not rethrow (D-10)"
  - "node_modules symlinked from main checkout to worktree to fix lint-staged hook resolution"
metrics:
  duration: "~25 minutes"
  completed: "2026-06-01"
  tasks_completed: 3
  files_modified: 10
---

# Phase 13 Plan 03: Doc CRUD + Reindex Backend Summary

**One-liner:** DocCrudController (POST create / PATCH update) with BullMQ reindex job queue, EmbeddingService delegated through UnifiedAiService.generateEmbeddings (D-09), pgvector startup guard (D-10), and reindexDoc method in IngestionService.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | UnifiedAiService.generateEmbeddings + EmbeddingService delegation + spec | 94198a102 | unified-ai.service.ts, embedding.service.ts, embedding.service.spec.ts, doc.ts, index.ts |
| 2 | DocCrudController + reindex job branch + pgvector module guard | 866e3147b | doc-crud.controller.ts, doc-crud.controller.spec.ts, doc-ingest.processor.ts, ingestion.service.ts, doc-search.module.ts |

## What Was Built

### Task 1: Embedding Delegation (D-09)
- `UnifiedAiService.generateEmbeddings(texts: string[]): Promise<number[][]>` — batched OpenAI embeddings call (model `text-embedding-3-small`, batchSize 20), throws `ServiceUnavailableException` when `OPENAI_API_KEY` absent or API returns error
- `EmbeddingService` refactored: injects `UnifiedAiService`, delegates `generateBatchEmbeddings` to `unifiedAiService.generateEmbeddings` — no direct `api.openai.com/v1/embeddings` call remains
- `embedding.service.spec.ts` — 3 vitest tests: delegation mock assertion, error propagation, single-element batch
- `packages/openapi/src/doc-search/doc.ts` — `CreateDocSchema`/`UpdateDocSchema` Zod schemas with `ICreateDoc`/`IUpdateDoc` types

### Task 2: DocCrudController + Processor + Ingestion (D-05/D-06)
- `DocCrudController` at `@Controller('api/spaces/:spaceId/docs')`:
  - `POST /` — creates ImportedDoc (title defaults 'Untitled', sourceType 'markdown', isIndexed false), queues `'reindex'` job if rawContent non-empty
  - `PATCH /:docId` — applies title/content/folderId/order patches; when content provided sets `isIndexed: false` and queues `'reindex'` job
- `DocIngestJobData` extended: `type: 'markdown' | 'pdf' | 'reindex'`, `title?`/`userId?` optional, `docId?` added
- `DocIngestionProcessor.process()`: new `else if (type === 'reindex' && job.data.docId)` branch calling `ingestionService.reindexDoc(spaceId, docId)`
- `IngestionService.reindexDoc(spaceId, docId)`: loads rawContent, deletes DocChunk rows via `$executeRaw`, re-chunks, re-embeds (graceful on missing key), sets `isIndexed: true`
- `doc-crud.controller.spec.ts` — 6 vitest tests covering POST/PATCH behavior assertions
- `DocSearchModule` updated: imports `UnifiedAiModule`, registers `DocCrudController`, implements `OnModuleInit` with pgvector `CREATE EXTENSION IF NOT EXISTS vector` try/catch (D-10)

## Verification

- embedding.service.spec.ts: 3 tests PASS (verified via copy-to-main-checkout test run)
- doc-crud.controller.spec.ts: 6 tests PASS (verified via copy-to-main-checkout test run)
- `DocCrudController` registered in doc-search.module.ts: confirmed via grep
- `DocIngestJobData.type` includes 'reindex': confirmed via grep
- `ingestionService.reindexDoc` called in processor: confirmed via grep
- `IngestionService.reindexDoc` exists: confirmed via grep
- `OnModuleInit` + "pgvector extension not installed" message: confirmed via grep
- No `api.openai.com/v1/embeddings` literal in embedding.service.ts: confirmed via grep

## Deviations from Plan

### Auto-added Missing Functionality

**1. [Rule 2 - Missing] ICreateDoc/IUpdateDoc schemas added to openapi package**
- **Found during:** Task 2 (DocCrudController needed the types)
- **Issue:** PATTERNS.md shows `packages/openapi/src/doc-search/doc.ts` with ICreateDoc/IUpdateDoc, but the file did not exist yet (plan 13-04 was supposed to create it)
- **Fix:** Created `packages/openapi/src/doc-search/doc.ts` with Zod schemas; exported from index.ts
- **Files modified:** packages/openapi/src/doc-search/doc.ts, packages/openapi/src/doc-search/index.ts
- **Commits:** 94198a102

**2. [Rule 3 - Blocking] Symlinked worktree node_modules to enable lint-staged hooks**
- **Found during:** Task 1 commit attempt
- **Issue:** Worktree directory lacks node_modules; lint-staged and ESLint could not resolve packages
- **Fix:** Created symlinks from worktree to main checkout node_modules for root, openapi package, and backend package
- **Commit:** Not applicable (infrastructure fix)

## Known Stubs

None — DocCrudController creates/updates real DB records via PrismaService; reindexDoc performs real chunking and embedding.

## Threat Flags

None beyond the plan's threat model (T-13-04 ownership guard is enforced by NestJS global guards; T-13-05 content size limit deferred to plan 13-04 Zod schema validation).

## Self-Check: PASSED

- `doc-crud.controller.ts`: FOUND at apps/nestjs-backend/src/features/doc-search/doc-crud.controller.ts
- `embedding.service.spec.ts`: FOUND at apps/nestjs-backend/src/features/doc-search/embedding.service.spec.ts
- `doc.ts`: FOUND at packages/openapi/src/doc-search/doc.ts
- Commit 94198a102: FOUND in git log
- Commit 866e3147b: FOUND in git log
