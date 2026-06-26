---
phase: 24-agent-runtime-hardening
plan: "01"
subsystem: doc-search
tags: [bullmq, embedding, queue, knowledge-doc, arh-05]
dependency_graph:
  requires: []
  provides: [ARH-05]
  affects:
    - apps/nestjs-backend/src/features/doc-search/knowledge-doc.service.ts
    - apps/nestjs-backend/src/features/doc-search/knowledge-doc.service.spec.ts
tech_stack:
  added: []
  patterns:
    - BullMQ deterministic jobId dedup (reindex-<docId>)
    - remove-then-add pattern for queue dedup across completed/failed jobs
key_files:
  modified:
    - apps/nestjs-backend/src/features/doc-search/knowledge-doc.service.ts
    - apps/nestjs-backend/src/features/doc-search/knowledge-doc.service.spec.ts
decisions:
  - enqueueReindex pattern copied verbatim from doc-crud.controller.ts (REINDEX_JOB_OPTS + reindexJobId) to guarantee dedup compatibility with DocIndexRecoveryService
  - spaceId for updateDoc sourced from RBAC-resolved doc record (no extra fetch)
  - createDoc always has non-empty rawContent by prior validation guard so no hasContent gate needed (unlike controller which allows empty docs)
metrics:
  duration: ~8min
  completed: "2026-06-14"
---

# Phase 24 Plan 01: ARH-05 Auto-trigger Doc Embedding Summary

**One-liner:** BullMQ reindex job enqueued synchronously in KnowledgeDocService.createDoc/updateDoc so agent-authored docs are searchable within seconds without server restart.

## What Was Built

- `KnowledgeDocService` now injects `DOC_INGEST_QUEUE` via `@InjectQueue(DOC_INGEST_QUEUE)` as second constructor arg.
- Added `REINDEX_JOB_OPTS` constant and `reindexJobId(docId)` helper matching `doc-crud.controller.ts` exactly (attempts=2, exponential backoff delay=5000, removeOnComplete=true, removeOnFail=50).
- Private `enqueueReindex(docId, spaceId)` method: removes any stale job hash in Redis, then enqueues `{ type:'reindex', docId, spaceId }` with deterministic `jobId = reindex-<docId>`.
- `createDoc`: calls `enqueueReindex` after the DB row is persisted (rawContent always non-empty due to prior validation).
- `updateDoc`: calls `enqueueReindex` after the `$transaction` completes, using `spaceId` from the RBAC-resolved doc record.

## Test Results

12/12 tests pass (GREEN):
- 7 pre-existing tests (createDoc/updateDoc happy paths, RBAC, validation)
- 5 new ARH-05 tests:
  1. createDoc with content calls queue.add once with reindex payload
  2. createDoc with empty content throws BadRequest, does NOT call queue.add
  3. updateDoc with content calls queue.add with doc's existing spaceId
  4. updateDoc with whitespace-only content throws and does NOT call queue.add
  5. enqueue uses deterministic jobId `reindex-<docId>` for dedup

## Commits

- `528a7fb1f` — test(24-01): add failing spec for KnowledgeDocService enqueue behavior (ARH-05 RED)
- `cc8bba0bb` — feat(24-01/24-02): implementation bundled by lint-staged (knowledge-doc.service.ts + GmailOAuthService)

## Deviations from Plan

None — plan executed exactly as written. The spec test for "updateDoc where body.content === undefined" was adapted to use whitespace-only rawContent (BadRequestException path) since the `UpdateDocInput` interface always requires rawContent; the no-enqueue semantic is preserved.

## Threat Flags

None — no new network endpoints or auth paths introduced. Enqueue runs only after existing RBAC authorization.

## Self-Check: PASSED

- `apps/nestjs-backend/src/features/doc-search/knowledge-doc.service.ts` — modified, in commit cc8bba0bb
- `apps/nestjs-backend/src/features/doc-search/knowledge-doc.service.spec.ts` — modified, in commit 528a7fb1f
- All 12 tests pass
