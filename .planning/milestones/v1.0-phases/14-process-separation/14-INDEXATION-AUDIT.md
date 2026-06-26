---
phase: 14-process-separation
audited: 2026-06-03
auditor: live-session
status: bugs_found
---

# Doc Library Indexation System — Audit Report

## Pipeline Architecture

```
POST /docs/import/markdown
  → DocIngestController: queue.add('ingest', {type:'markdown', ...})
  → BullMQ DOC_INGEST queue (Redis)
  → DocIngestionProcessor.process()
  → DocIngestionService.ingestMarkdown()
      1. prisma.importedDoc.create()         ← doc record created
      2. chunkContent(rawContent)            ← 384-word window, 37-word overlap
      3. generateBatchEmbeddings(chunks)     ← throws if no OPENAI_API_KEY (caught)
      4. INSERT INTO doc_chunk (no vector)  ← stored without embedding
      5. linkExtractor.extractLinks()
      6. prisma.importedDoc.update(isIndexed=true, chunkCount=N)
```

## Verified Working ✅

| Component | Evidence |
|-----------|----------|
| `POST /docs/import/markdown` → 201 | Network: `POST /api/spaces/:id/docs/import/markdown → 201` |
| BullMQ job creation | Redis: `bull:DOC_INGEST:id` increments, job hash stored |
| `chunkContent()` chunking | SQL verified: chunks split correctly at word boundaries |
| `doc_chunk` INSERT (no vector) | 6 chunks created directly in DB with tokenCount/offsets |
| `isIndexed=true` / `chunkCount=N` update | DB: `isIndexed=t, chunkCount=1` after manual pipeline run |
| Keyword FTS search (`ts_rank`) | "process separation" → score 0.247, correct doc returned |
| `keywordSearch` graceful degradation | Returns results even without embedding key |
| `semanticSearch` graceful degradation | Returns `[]` when no OPENAI_API_KEY (caught exception) |
| pgvector extension | Installed, `vector(1536)` column in `doc_chunk` |
| Redis connectivity | `PONG` on `127.0.0.1:6379` |

## Bugs Found ❌

### BUG-1: Critical — BullMQ worker never processes jobs in combined dev mode
**Impact:** All doc imports hang at "Indexing..." badge forever in combined mode.
**Root cause:** NestJS combined dev mode (Next.js + NestJS in one process) OOM-crashes
within 6 minutes under the default 4GB Node.js heap limit. The BullMQ worker process
is killed before it can process any queued jobs. Even with 8GB heap guard, the combined
Next.js webpack HMR + NestJS modules exceeds available RSS on the test machine.
**Evidence:**
```
[2721] 362553ms: Mark-Compact 4045MB → 4034MB, 1442ms GC pause
FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory
```
**Fix:** Use `pnpm dev:separated` (Phase 14 deliverable) — runs NestJS as API-only on
:3001 and Next.js separately on :3000, each with its own heap.

### BUG-2: High — Stalled jobs marked UnrecoverableError, never retried
**Impact:** Any job in flight when the server crashes is permanently failed.
**Root cause:** `DocIngestController` queues jobs with `opts: {attempts: 0}` (default).
BullMQ's stall detector fires when the worker crashes, and with 0 retries configured,
marks the job as `UnrecoverableError: job stalled more than allowable limit`.
**Evidence:** Redis: `bull:DOC_INGEST:1` → `failedReason: "job stalled more than allowable limit"`, `opts: {"attempts":0}`
**Fix:** Queue jobs with `{ attempts: 3, backoff: { type: 'exponential', delay: 5000 } }`.

### BUG-3: High — Duplicate docs created on job retry
**Impact:** Stalled job re-executed by BullMQ creates a new `imported_doc` row — two
docs with identical title and content appear in the library.
**Root cause:** `ingestMarkdown` creates the doc record at the START of processing
(not idempotent). When BullMQ retries a stalled job, the function runs again, creating
a duplicate. Observed: `cmpxncns8000esg3l03f31or4` and `cmpxni6v5000asgs9ocvif7pm`
are duplicates from one import attempt.
**Fix:** Make `ingestMarkdown` idempotent — accept an optional `docId` parameter and
`findOrCreate` instead of always `create`.

### BUG-4: Medium — `createDoc`/`updateDoc` never queue reindex without OPENAI_API_KEY
**Impact:** Docs created or edited via the UI (`POST /docs`, `PATCH /docs/:id`) are
never indexed unless `OPENAI_API_KEY` is set. The `isIndexed` flag stays `false` and
the "Indexing..." badge persists forever.
**Root cause:** `DocCrudController` has an `if (process.env.OPENAI_API_KEY)` guard
before calling `queue.add(reindex)`.
**Fix:** Always queue the reindex job. The ingestion service already handles the
no-key case gracefully (stores chunks without vectors, FTS still works).

### BUG-5: Low — `status` column never updated by ingestion service
**Impact:** `imported_doc.status` stays `'pending'` forever even after successful
indexation. Cannot use `status` field to query "fully indexed" docs.
**Root cause:** `ingestMarkdown` and `reindexDoc` only update `isIndexed` and
`chunkCount`, never `status`.
**Fix:** Add `status: 'indexed'` to the final `prisma.importedDoc.update()` call,
and `status: 'failed'` in the error path.

### BUG-6: Info — No user-visible indicator when running keyword-only mode
**Impact:** Users don't know that semantic search is unavailable. The search box works
but silently only returns keyword results when `OPENAI_API_KEY` is absent.
**Fix:** UI should show a "Keyword search only — add OPENAI_API_KEY for semantic search"
notice when semantic results are empty and keyword results exist.

## DB State After Manual Remediation

```sql
-- All docs indexed manually (bypassing broken BullMQ worker):
indexed: 6 / 6
chunks:  6 rows in doc_chunk (1 per doc), embedding=NULL (no API key)

-- FTS keyword search verified working:
SELECT ts_rank(..., plainto_tsquery('english', 'process separation'))
→ score 0.247, "Test Doc - Process Separation Notes" returned ✓

-- Semantic search returns [] (expected without OPENAI_API_KEY)
```
