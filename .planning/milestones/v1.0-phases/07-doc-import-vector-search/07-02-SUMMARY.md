---
phase: "07"
plan: "07-02"
title: "Wave 2: Document ingestion pipeline"
objective: "Accept markdown and PDF content, chunk it, generate embeddings, store DocChunk records, and extract link graph entries"
status: completed
date: "2026-05-20"
duration: "12 minutes"
subsystems:
  - name: Document chunking with sliding window
    status: complete
  - name: Batch embedding generation
    status: complete
  - name: PDF text extraction via pdf-parse
    status: complete
  - name: Wiki and markdown link extraction
    status: complete
  - name: BullMQ async ingestion queue
    status: complete
tags:
  - document-processing
  - chunking
  - embeddings
  - pdf-extraction
  - async-queue
requirements:
  - DOC-02
tech_stack:
  added:
    - pdf-parse (CommonJS)
    - BullMQ/bullmq (already in dependencies)
    - Sliding window chunking algorithm (512 tokens, 50-token overlap)
  patterns:
    - Service-oriented architecture (DocIngestionService, LinkExtractorService)
    - Raw SQL queries for vector inserts (pgvector)
    - BullMQ processor pattern for async background jobs
    - Chain of responsibility (controller → queue → processor → service)
key_files:
  created:
    - apps/nestjs-backend/src/features/doc-search/link-extractor.service.ts
    - apps/nestjs-backend/src/features/doc-search/ingestion.service.ts
    - apps/nestjs-backend/src/features/doc-search/doc-ingest.processor.ts
    - apps/nestjs-backend/src/features/doc-search/doc-ingest.controller.ts
  modified:
    - apps/nestjs-backend/src/features/doc-search/doc-search.module.ts
decisions:
  - Chunk content capped at 2000 tokens before embedding (limits injection surface)
  - Word approximation: 1 token ≈ 0.75 words → 512 tokens ≈ 384 words
  - Overlap: 50 tokens ≈ 37 words (prevents semantic gaps between chunks)
  - PDF buffer base64-encoded in job data (avoids binary serialization issues)
  - Raw SQL for vector inserts (Prisma doesn't support pgvector natively)
---

# Phase 07 Plan 02: Document Ingestion Pipeline — SUMMARY

**Objective:** Build document chunking, batch embedding, PDF extraction, link extraction, and async BullMQ ingestion pipeline.

## Status: ✅ COMPLETE

All 2 tasks completed. Backend services compile without errors. Async ingestion queue integrated.

## Implementation

### Task 1: DocIngestionService + LinkExtractorService

#### LinkExtractorService

Extracts wiki-style `[[link]]` and markdown `[text](url)` links from document content. For each link:
- **Internal links:** Matched against existing ImportedDoc titles (case-insensitive) within same space
- **External links:** Detected by `http://` or `https://` prefix; stored as DocLink with `toUrl`
- Both types stored via `docLink.createMany()` with skip-duplicates

Code location: `apps/nestjs-backend/src/features/doc-search/link-extractor.service.ts`

#### DocIngestionService

Chunks incoming content and generates embeddings:
1. **Chunking:** Split text into 384-word windows with 37-word overlap
2. **Token cap:** Each chunk truncated to max 2000 tokens before sending to OpenAI (vector injection mitigation)
3. **Embedding:** Batch call to `EmbeddingService.generateBatchEmbeddings()`
4. **Storage:** Raw SQL `INSERT ... VALUES ... ::vector` (Prisma has no pgvector support)
5. **Link extraction:** Calls `LinkExtractorService.extractLinks()` after storage
6. **Indexing flag:** Sets `ImportedDoc.isIndexed = true` and `chunkCount` after completion

Supports both `ingestMarkdown(spaceId, title, content, userId)` and `ingestPdf(spaceId, title, buffer, userId)`.

Code location: `apps/nestjs-backend/src/features/doc-search/ingestion.service.ts`

### Task 2: DocIngestController + BullMQ Processor + Module Update

#### DocIngestController

Two REST endpoints (both require JWT auth):

- **`POST /api/spaces/:spaceId/docs/import/markdown`**
  - Body: `{ title: string; content: string }`
  - Returns `{ jobId, status: "queued" }` immediately
  - Queues job with type `markdown`, content payload

- **`POST /api/spaces/:spaceId/docs/import/pdf`**
  - Multipart form-data, file size capped at 50 MB via Multer
  - Body: `{ file: File; title: string }`
  - Returns `{ jobId, status: "queued" }` immediately
  - Queues job with type `pdf`, base64-encoded buffer

Code location: `apps/nestjs-backend/src/features/doc-search/doc-ingest.controller.ts`

#### DocIngestionProcessor

BullMQ processor registered on `DOC_INGEST` queue:
- Receives `DocIngestJobData` (type + spaceId + title + content/pdfBase64 + userId)
- Dispatches to `DocIngestionService.ingestMarkdown()` or `ingestPdf()`
- Runs asynchronously in background without blocking HTTP response

Code location: `apps/nestjs-backend/src/features/doc-search/doc-ingest.processor.ts`

#### DocSearchModule Update

Module now imports:
- `BullModule.registerQueue({ name: DOC_INGEST_QUEUE })`
- Providers: `EmbeddingService`, `DocIngestionService`, `LinkExtractorService`, `DocIngestionProcessor`
- Controllers: `DocIngestController`
- Exports: `EmbeddingService`, `DocIngestionService` (for use in Task 3)

Code location: `apps/nestjs-backend/src/features/doc-search/doc-search.module.ts`

## Verification

✅ TypeScript compiles cleanly — no errors in doc-search services or module
✅ `DocIngestionService` creates ImportedDoc with `isIndexed: false`
✅ Chunks stored via raw SQL with vector embeddings
✅ DocLink entries created for all extracted links
✅ `ImportedDoc.isIndexed` updated to `true` after ingestion completes
✅ PDF text extraction via pdf-parse CommonJS module
✅ BullMQ queue job returns immediately; processing happens async
✅ File size cap (50 MB) and MIME type validation via Multer

## Acceptance Criteria Met

- [x] `POST /api/spaces/:spaceId/docs/import/markdown` returns jobId synchronously
- [x] `POST /api/spaces/:spaceId/docs/import/pdf` accepts multipart, caps at 50 MB
- [x] After BullMQ job completes: `ImportedDoc.isIndexed = true`, `DocChunk` rows created with vectors
- [x] `DocLink` rows extracted for all wiki and markdown links in content
- [x] TypeScript: no errors in doc-search module

## Threat Model Compliance

| Threat | Disposition | Mitigation |
|--------|-------------|-----------|
| T-07-02-01: PDF tampering | Mitigate | MIME type validation; 50 MB Multer limit; pdf-parse runs in-process (no shell) |
| T-07-02-02: DoS via large markdown | Mitigate | 5 MB body size limit (via Multer); chunking loop bounded |
| T-07-02-03: Content sent to OpenAI | Accept | Operator responsibility (noted in deployment docs) |
| T-07-02-04: SQL injection in raw SQL | Mitigate | Embedding values validated as `number[]`; Prisma template literals use parameterized binding |
| T-07-02-05: Redis tampering | Accept | Redis not publicly exposed; job data contains no auth tokens |

## Deviations from Plan

None — plan executed exactly as specified.

## Commits

1. `64665e2` - feat(07-02-01): implement LinkExtractorService and DocIngestionService
2. `e66d9ba` - feat(07-02-02): implement DocIngestController and BullMQ processor

## Next Steps

Plan 07-03 (search services and graph traversal) depends on this plan's `ImportedDoc`, `DocChunk`, and `DocLink` tables and the `DocIngestionService`.
