# Doc-ingest worker (decoupled process)

The doc-library ingestion pipeline (chunk → embed → write `doc_chunk`) can run as a **standalone
process**, isolated from the API's `V2`/`ShareDB`/`Next` stack so it cannot be killed by — or
contribute to — the API's startup memory spike.

## How it works

- `index.ts` is **role-based**: `TEABLE_ROLE=doc-worker` boots `DocWorkerModule` (a headless Nest
  context) instead of the full `AppModule`. Same `dist` artifact, no extra build.
- `DocWorkerModule` imports only: `ConfigModule`, `ClsModule`, `PrismaModule`, BullMQ
  (`forRootAsync` + `registerQueue(DOC_INGEST)`), and the ingestion providers
  (`DocIngestionService`, `LinkExtractorService`, `DocIngestionProcessor`, `DocIndexRecoveryService`).
- Embeddings: `EmbeddingService` is decoupled from `UnifiedAiService` via the `EMBEDDING_GENERATOR`
  token. The worker binds the lightweight `OpenAiEmbeddingGenerator` (direct OpenAI call, no
  AI-module deps); the API binds `UnifiedAiService`.

## Running it

```bash
# 1) API process: stop consuming the queue inline (becomes a pure producer)
DOC_INGEST_WORKER_EXTERNAL=true  pnpm --filter @teable/backend start

# 2) Worker process (separate terminal / container) — small heap is enough
pnpm --filter @teable/backend start:doc-worker        # prod (built dist)
pnpm --filter @teable/backend dev:doc-worker          # dev (swc watch)
```

If `DOC_INGEST_WORKER_EXTERNAL` is unset, the API keeps the consumer inline (default,
backwards-compatible) — so this change is safe to merge before the worker is deployed.

## Status

Type-checked and unit-tested (DI graph validated by `tsc`; chunking/embedding/folder specs pass).
Runtime boot requires a `nest build` (webpack) first — pending a less memory-pressured machine.
