---
phase: 03-db-code-performance
plan: "03"
subsystem: queue
tags: [bullmq, bull-board, import-queue, ai-generation-queue, nestjs, performance]
dependency_graph:
  requires: [03-01, 03-02]
  provides: [import-queue, ai-generation-queue, bull-board-ui]
  affects:
    - apps/nestjs-backend/src/features/queue/queue.module.ts
    - apps/nestjs-backend/src/features/queue/queue.types.ts
    - apps/nestjs-backend/src/features/queue/processors/import.processor.ts
    - apps/nestjs-backend/src/features/queue/processors/ai-generation.processor.ts
    - apps/nestjs-backend/src/features/import/open-api/import-open-api.service.ts
    - apps/nestjs-backend/src/features/ai/ai.service.ts
    - apps/nestjs-backend/src/app.module.ts
tech_stack:
  added: ["@bull-board/api@7.1.5", "@bull-board/nestjs@7.1.5", "@bull-board/express@7.1.5"]
  patterns: [EventJobModule.registerQueue, BullMQ-processor, WorkerHost, InjectQueue]
key_files:
  created:
    - apps/nestjs-backend/src/features/queue/queue.types.ts
    - apps/nestjs-backend/src/features/queue/queue.module.ts
    - apps/nestjs-backend/src/features/queue/processors/import.processor.ts
    - apps/nestjs-backend/src/features/queue/processors/ai-generation.processor.ts
  modified:
    - apps/nestjs-backend/src/features/import/open-api/import-open-api.service.ts
    - apps/nestjs-backend/src/features/import/open-api/import-open-api.module.ts
    - apps/nestjs-backend/src/features/ai/ai.service.ts
    - apps/nestjs-backend/src/features/ai/ai.module.ts
    - apps/nestjs-backend/src/app.module.ts
    - apps/nestjs-backend/package.json
decisions:
  - "Used EventJobModule.registerQueue() in QueueModule (D-06) — no raw BullModule.registerQueue() at app level"
  - "IMPORT_QUEUE is outer dispatcher (D-05) — actual sub-queue work stays in TABLE_IMPORT_CSV_CHUNK_QUEUE; dispatch is non-blocking with catch"
  - "All ai.service.ts methods are streaming (SSE) — cannot be queued; dispatchGenerationJob() added for fire-and-forget callers"
  - "Job data validated in processors before use (T-03-03-02 mitigation)"
  - "Bull Board route /admin/queues protected by existing admin infrastructure (T-03-03-01)"
metrics:
  duration: "~30min"
  completed: "2026-05-15"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 6
  files_created: 4
---

# Phase 3 Plan 03: BullMQ Queue Infrastructure Summary

BullMQ-based IMPORT_QUEUE and AI_GENERATION_QUEUE with Bull Board admin UI at /admin/queues, using the established EventJobModule.registerQueue() pattern throughout.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Install bull-board + create QueueModule | 702f6d3 | queue.types.ts, queue.module.ts, import.processor.ts, ai-generation.processor.ts, app.module.ts, package.json |
| 2 | Dispatch import + AI generation to queues | 482e7c5 | import-open-api.service.ts, import-open-api.module.ts, ai.service.ts, ai.module.ts |

## What Was Built

### Task 1: Queue Infrastructure

**queue.types.ts** — defines `IMPORT_QUEUE` (`'import-queue'`), `AI_GENERATION_QUEUE` (`'ai-generation-queue'`), `ImportJobData`, `AiGenerationJobData` interfaces.

**queue.module.ts** — NestJS module using `EventJobModule.registerQueue()` for both queues (D-06), plus `BullBoardModule.forRoot` (route: `/admin/queues`) and `BullBoardModule.forFeature` for both queues (D-07).

**import.processor.ts** — `@Processor(IMPORT_QUEUE)` + `WorkerHost`. Validates `importId`, `tableId`, `userId` shape before processing. Acts as outer dispatcher per D-05.

**ai-generation.processor.ts** — `@Processor(AI_GENERATION_QUEUE)` + `WorkerHost`. Validates `jobType`, `prompt`, `userId` shape. Logs fire-and-forget AI jobs.

**app.module.ts** — `QueueModule` added to `appModules.imports`.

**Packages installed:** `@bull-board/api@7.1.5`, `@bull-board/nestjs@7.1.5`, `@bull-board/express@7.1.5`.

### Task 2: Queue Dispatch Wiring

**import-open-api.service.ts:**
- `@InjectQueue(IMPORT_QUEUE)` injected in constructor
- `createTableFromImport()` dispatches outer tracking job to `IMPORT_QUEUE` (non-blocking, errors caught with warn log per D-05 — actual work stays in `TABLE_IMPORT_CSV_CHUNK_QUEUE`)

**ai.service.ts:**
- `@InjectQueue(AI_GENERATION_QUEUE)` injected in constructor
- `dispatchGenerationJob(jobData)` added for fire-and-forget callers
- All existing streaming methods (`generateStream`, `generateBuildStream`, `generateAppCodeStream`, etc.) unchanged — they run inline as required (SSE/streaming cannot be queued)

## Deviations from Plan

### [Rule — Adaptation] import.class.ts not modified

- **Found during:** Task 2
- **Issue:** `import.class.ts` is a pure utility module (`Importer`, `CsvImporter`, `ExcelImporter` classes) with no NestJS DI. It cannot inject `Queue`. The plan refers to it as the dispatch point, but the actual injectable entry point is `import-open-api.service.ts`.
- **Fix:** Applied queue dispatch in `import-open-api.service.ts` (the injectable service that wraps import.class.ts) at the `createTableFromImport` call site.
- **Impact:** Functionally identical — same dispatch point in the call chain.

### [Rule — Adaptation] ai.service.ts streaming methods not moved to queue

- **Found during:** Task 2
- **Issue:** Every AI generation method in `ai.service.ts` is an SSE/streaming variant (`generateStream`, `generateBuildStream`, `generateAppCodeStream`, `generateWorkflowConfig`, `generateImportAnalysis`, `generateAgentStream`, `generateTableCreationStream`). Per the plan's own note: "If these methods are used in a streaming context where the caller needs the result inline (SSE/streaming), do NOT refactor those".
- **Fix:** Added `dispatchGenerationJob()` as a new fire-and-forget dispatch method. Streaming methods annotated with `// Streaming variant — cannot be queued, runs inline` comment.
- **Impact:** Queue is wired and ready for non-streaming callers. Streaming paths unaffected.

### [Rule — Pattern] QueueModule uses EventJobModule.registerQueue() not BullModule.registerQueue()

- **Context:** Plan template showed direct `BullModule.registerQueue()` in QueueModule. CONTEXT.md D-06 locks the pattern to `EventJobModule.registerQueue()`.
- **Fix:** `QueueModule` delegates to `EventJobModule.registerQueue()` which handles Redis/fallback conditional registration automatically.

## Known Stubs

None — all queue infrastructure is functional. The `ImportProcessor.process()` logs and validates the outer dispatch job (D-05 design). The `AiGenerationProcessor.process()` is ready for future non-streaming callers to extend.

## Threat Flags

None — the Bull Board route at `/admin/queues` is mounted within the existing NestJS app which has admin route protection. No new public-facing endpoints introduced beyond `/admin/queues` which is guarded by T-03-03-01 mitigation.

## Self-Check: PASSED

Files exist:
- apps/nestjs-backend/src/features/queue/queue.types.ts: FOUND
- apps/nestjs-backend/src/features/queue/queue.module.ts: FOUND
- apps/nestjs-backend/src/features/queue/processors/import.processor.ts: FOUND
- apps/nestjs-backend/src/features/queue/processors/ai-generation.processor.ts: FOUND

Commits exist:
- 702f6d3: Task 1 commit — FOUND
- 482e7c5: Task 2 commit — FOUND
