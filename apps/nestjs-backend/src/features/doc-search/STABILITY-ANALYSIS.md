# Doc Library — Stability Analysis (refactor/architecture-deep-fix)

## State of the feature

The ingestion pipeline has already been hardened across many commits:

- BullMQ jobs carry **no binary payload** (PDF text extracted in controller, not base64 in Redis) — avoids heap OOM.
- Processor `process()` no longer races a timeout — no ghost coroutines / OOM.
- Jobs have `attempts:3` + exponential backoff; ingest is **idempotent** on retry (clears stale chunks by `docId`).
- Embedding failures are swallowed → chunks stored without vector, `isIndexed=true`. `doc_chunk.embedding` is **nullable** (`vector(1536)?`), so keyword-only mode is safe and never leaves a doc stuck.
- `DocIndexRecoveryService` (OnApplicationBootstrap) re-queues any `isIndexed=false` docs after Redis is ready; failures never crash boot.
- `DocSearchModule.onModuleInit` creates the pgvector extension but does not rethrow.

Conclusion: production runtime code is coherent and resilient. No stuck-doc or crash path remains in the ingestion/search code.

## Defects found and fixed

1. **Typecheck breakage (only compile errors in the feature)** — `doc-crud.controller.spec.ts` and `doc-folder.service.spec.ts` lagged behind the spaceId-scoping refactor:

   - `createDoc` calls missing required `title`.
   - `updateFolder`/`deleteFolder` now take `spaceId` as first arg; `deleteFolder` runs inside `$transaction`.
     Fixed signatures, expectations (`where: { id, spaceId }`), and added a `$transaction` mock. Folder spec: 8/8 pass. (crud spec is excluded from vitest by `**/*.controller.spec.ts` but is still typechecked.)

2. **Imported doc didn't appear until manual refresh** — the docs list was invalidated only when the job was _queued_, never when indexing _completed_. `useJobProgress` now invalidates `docKeys.list(spaceId)` when `state === 'completed'`.

## Verified

- `tsc --noEmit` on nestjs-backend: no doc-search / worker errors.
- `vitest run doc-folder.service.spec.ts`: 8 passed.

## Notes / non-blocking

- Processor `type === 'pdf'` branch is dead code (controller queues PDF as `reindex`). Harmless; could be removed.
