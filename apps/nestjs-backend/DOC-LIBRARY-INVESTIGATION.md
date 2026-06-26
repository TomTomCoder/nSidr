# Doc Library — Investigation, Tests & Current State

Branch: `refactor/architecture-deep-fix`
Date: 2026-06-04

This document records the full investigation into why the **Doc Library** (markdown/PDF
import → chunk → embed → hybrid search) "doesn't work properly", the tests run, the
root cause found, and the current state of the app.

---

## 1. Scope & components

The doc library lives in two places:

**Backend** — `apps/nestjs-backend/src/features/doc-search/`

- `doc-ingest.controller.ts` — `POST /api/spaces/:spaceId/docs/import/{markdown,pdf}`, `GET .../jobs/:jobId`
- `doc-ingest.processor.ts` — BullMQ worker (`DOC_INGEST` queue)
- `ingestion.service.ts` — chunk → embed → insert `doc_chunk` rows; `ingestMarkdown` / `ingestPdf` / `reindexDoc`
- `embedding.service.ts` → `UnifiedAiService.generateEmbeddings` (OpenAI `text-embedding-3-small`, 1536-d)
- `search.service.ts` — `semanticSearch` (pgvector `<=>`), `keywordSearch` (Postgres `ts_rank`/`plainto_tsquery`), `hybridSearch` (0.7 vector + 0.3 keyword)
- `doc-search.controller.ts`, `doc-crud.controller.ts`, `doc-folder.*` — CRUD + folders
- `worker/ingestion.worker.ts` — `DocIndexRecoveryService` (re-queues `isIndexed=false` docs on bootstrap)

**Frontend** — `apps/nextjs-app/src/features/app/blocks/doc-search/`

- `DocLibrary.tsx`, `DocFolderTree.tsx` (tree + per-doc status), `DocImportPanel.tsx`, `DocSearchPanel.tsx`, `hooks.ts`

**Data** — `packages/db-main-prisma` models `ImportedDoc`, `DocChunk` (`embedding vector(1536)?`), `DocLink`, `DocFolder`; pgvector extension created in `DocSearchModule.onModuleInit`.

---

## 2. Feature-level findings & fixes

The ingestion pipeline was already heavily hardened (no binary in Redis, idempotent retries,
attempts/backoff, ghost-coroutine fix, boot recovery). Remaining defects found and fixed:

| #                    | Issue                                                                                                                | Fix                                                                                                                                                                                                                                                                   |
| -------------------- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1                   | `doc-crud.controller.spec.ts` / `doc-folder.service.spec.ts` failed typecheck (stale after spaceId-scoping refactor) | Updated signatures, expectations, added `$transaction` mock. Folder spec 8/8 green.                                                                                                                                                                                   |
| F2                   | Imported docs didn't appear/refresh in the list until manual reload (list invalidated only at _queue_ time)          | `useJobProgress` now invalidates `docKeys.list` on `state === 'completed'`.                                                                                                                                                                                           |
| F3                   | Pre-existing typecheck bug: "New Document" called `createDoc({title, folderId})` without required `content`          | Pass `content: ''`.                                                                                                                                                                                                                                                   |
| F4 (feature request) | No per-document indexation progress                                                                                  | Added persisted `indexProgress` (0–100): schema column + migration, processor writes it each `onProgress` tick, `listDocs` returns it, `useDocList` polls while any doc unindexed, `DocFolderTree` renders a bar + `%`. Verified live in DB (`Test Stabilité` = 20%). |

Status: backend + frontend `tsc` clean for doc-search; `vitest` doc-search suite 11/11.

---

## 3. The real blocker — backend can't boot

Symptom: `dev:separated` / `dev:separated:light` crash on startup with
`FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory`,
right after route mapping (the `onApplicationBootstrap` boundary). Because the backend
(`:3002`) never listens, **every** doc-library API call fails — this is the dominant reason
the feature "doesn't work."

### Method

1. Booted prebuilt `dist` with `--heapsnapshot-near-heap-limit=1` → 1.3 GB snapshot.
2. Snapshot histogram: **13.1 M nodes** = 5.2 M plain `Object` + 5.67 M strings. Native crash
   stack: `ArrayPrototypeSlice` → `ExtractFastJSArray` inside an async microtask (a `.slice()`
   over a giant array in an async fn).
3. Ruled out Swagger/OpenAPI generation (`API_DOC_DISENABLED=true` still OOMs).
4. Toggling `V2_COMPUTED_UPDATE_MODE` was decisive.

### Root cause (FIXED)

`apps/nestjs-backend/.env` had `V2_COMPUTED_UPDATE_MODE=sync`. In `V2ContainerService.
onApplicationBootstrap` → `createV2NodePgContainer({ computedUpdate: { mode: 'sync',
pollingConfig: { enabled: false } } })`, the `sync` mode eagerly loads the full dataset at boot
and exhausts the heap before `app.listen()`. (The line's comment claimed it _reduces_ OOM — it
prevents boot entirely.) **Fix:** commented the line out (default = background polling).

---

## 4. Test log (chronological, reproducible)

| Test                           | Config                                      | Result                                                                                         |
| ------------------------------ | ------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Boot, swc dev                  | `dev:separated`, 8 GB heap                  | OOM (route-map boundary)                                                                       |
| Boot, prebuilt dist            | default heap                                | OOM                                                                                            |
| Boot, docs disabled            | `API_DOC_DISENABLED=true`                   | OOM → Swagger ruled out                                                                        |
| Heap snapshot                  | `--heapsnapshot-near-heap-limit=1`, 1 GB    | 1.3 GB snapshot, 13.1 M nodes                                                                  |
| **sync OFF**                   | `V2_COMPUTED_UPDATE_MODE=` empty, 2 GB heap | **BOOTED** — `Ready on :3002`, recovery queued 2 docs                                          |
| sync OFF, default heap (light) | no cap                                      | BOOTED in ~15 s                                                                                |
| Re-boots, varying heap         | 2.5 / 4 / 6 / 8 / 10 GB                     | **non-deterministic** OOM as free RAM dropped / swap filled; survived 3+ min idle at 6 GB once |
| Redis/BullMQ check             | `redis-cli`                                 | 44 keys, ~13 tiny jobs — **not** accumulating state                                            |

### Interpretation

- `sync` mode → deterministic 6 GB+ eager-load OOM (fixed by removing it).
- Default (polling) mode → still a **heavy, variable multi-GB startup peak** in the V2 container
  init that the OS can't reliably back once memory is pressured (16 GB box, swap 3/4 GB used).
  V8 reports the OS-backing failure as "Reached heap limit." First post-fix boot succeeded at
  **2 GB**; later boots failed at 10 GB as the machine filled.
- ShareDB side is partly mitigated by in-tree `share-db.adapter.ts` batching fixes
  (`getOps` O(1) op collapse; `getOpsBulk` 100-row snapshot batching).

### Why no live UI screenshot

A live capture needs the backend reliably up _and_ the Next web (another 2–3 GB) running. The
non-deterministic V2 startup peak on a memory-pressured 16 GB box made that unreliable across
many attempts (heaps 2→10 GB, decoupled web process, fresh-signup plan). The feature is verified
at the data layer instead (persisted `indexProgress`, types, tests).

---

## 5. Files changed this investigation

- `apps/nestjs-backend/.env` — disabled `V2_COMPUTED_UPDATE_MODE=sync` (root-cause fix)
- `apps/nestjs-backend/src/features/doc-search/doc-ingest.processor.ts` — persist `indexProgress`
- `apps/nestjs-backend/src/features/doc-search/doc-search.controller.ts` — return `indexProgress`
- `packages/db-main-prisma/prisma/postgres/schema.prisma` + migration `20260603000000_add_doc_index_progress`
- `packages/openapi/src/doc-search/{doc,index}.ts` — `indexProgress?: number`
- `apps/nextjs-app/.../doc-search/{hooks.ts,DocFolderTree.tsx}` — polling + progress bar
- spec fixes (`doc-crud.controller.spec.ts`, `doc-folder.service.spec.ts`)
- `.claude/launch.json` — added `teable-web-only` helper config
- companion docs: `BOOT-OOM-INVESTIGATION.md`, `features/doc-search/STABILITY-ANALYSIS.md`
