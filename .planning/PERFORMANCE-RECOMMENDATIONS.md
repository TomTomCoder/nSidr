# Performance Analysis & Recommendations — Teable

_Date: 2026-06-11 · Branch: refactor/architecture-deep-fix_

## Architecture snapshot

- Monorepo: `apps/nestjs-backend` (~152k LoC TS), `apps/nextjs-app` + `packages/sdk` (~170k LoC), plus `nextjs-frontend`, `core`, `formula`, `openapi`, two Prisma packages.
- Data layer: Prisma (49 models, 55 `@@index`), Redis (cache + ShareDB pubsub), BullMQ (vector sync), canvas-based grid renderer in the SDK.
- Known constraints (from memory/history): backend runtime OOM still open; dev scripts already need `--max-old-space-size=4096`.

## Findings & recommendations (priority order)

### P1 — Database / query layer

1. **Unbounded `findMany`: ~500 call sites, only ~6 with `take`.** Any large base can pull entire tables into memory — this is the most likely contributor to the open runtime OOM. Action: add a lint rule or Prisma client extension that warns on `findMany` without `take`/`cursor`; fix the hot paths first (`record.service.ts`, `field-open-api*.service.ts`, `link.service.ts`, `base-import.service.ts`).
2. **~98 sequential `await` inside `for (const …)` loops** in `features/`. Classic N+1. Action: batch with `WHERE id IN (...)`/`createMany`/`Promise.all` (bounded concurrency) in the calculation and link services first — they run on every record mutation.
3. **No explicit Prisma `connection_limit` / pool tuning found.** Prisma defaults to `num_cpus*2+1`; with 151 `$transaction` call sites, long transactions can starve the pool under load. Action: set `connection_limit` + `pool_timeout` in `DATABASE_URL`, audit longest interactive transactions, and move non-atomic work outside transactions.
4. **Index audit.** 55 indexes over 49 models is decent, but verify the record-query CTE paths (`field-cte-visitor.ts`, `select-query.postgres.ts`, 2000+ lines each) with `EXPLAIN ANALYZE` on a large base; add composite indexes for (tableId, viewId, sort keys).

### P2 — Backend memory & compute

5. **Computed-field engine (v2).** `V2_COMPUTED_UPDATE_MODE=sync` previously caused boot OOM; the async path should be the default, with work chunked through BullMQ rather than computed in-process per request. Add per-job row-count limits.
6. **Expand `performance-cache` adoption.** Only 24 files use it. Cache table/field/view metadata (read-heavy, low churn) with event-driven invalidation; this trims repeated Prisma round trips on every record API call.
7. **Split roles in production.** A `doc-worker` role already exists (`TEABLE_ROLE=doc-worker`). Run heavy work (imports, computed updates, vector sync) in workers so the HTTP/WS process stays small; cap each with appropriate `--max-old-space-size` instead of one 4GB blob.
8. **Streaming for import/export.** `base-import.service.ts` (2.7k lines) should stream rows (csv parse → batched inserts) rather than buffering files.

### P3 — Frontend

9. **Code splitting is underused: only 9 `dynamic()` imports** across the app. Heavy, rarely-visited surfaces — `WorkFlowPanel.tsx` (1.2k lines), `LlmProviderForm.tsx` (1.4k), `IntegrityV2Components.tsx` (1.4k), AgentChat — should be `next/dynamic` with `ssr: false` where appropriate. Run `ANALYZE=true` build (bundle-analyzer is already wired) and budget the main route chunk.
10. **React Query tuning.** 249 files use react-query but only 22 mention `staleTime`/`refetchInterval` — defaults refetch on every window focus. Set a sane global `staleTime` (e.g. 30s) and rely on ShareDB/websocket events forreal-time data instead of refetch storms.
11. **Grid render path.** The canvas renderer (`layoutRenderer.ts` 2.2k lines, `GridViewBaseInner.tsx` 1.8k) is the right architecture; profile `InteractionLayer.tsx` re-renders (memoize selection state, avoid prop identity churn from `useSelectionOperation.ts`).
12. **Two Next apps (`nextjs-app`, `nextjs-frontend`)** — if `nextjs-frontend` is vestigial, drop it from build/CI to cut build times.

### P4 — Infra / observability

13. **Add slow-query logging** (Prisma `$on('query')` over threshold + pg_stat_statements) before optimizing further — measure, then fix.
14. **HTTP caching/compression**: confirm gzip/brotli at the proxy and `Cache-Control` on static + attachment URLs (signed URLs can still be cached briefly).
15. **Heap snapshots in prod**: enable `--heapsnapshot-signal=SIGUSR2` on the backend to finally pin the runtime OOM (likely #1/#2 above).

## Implementation status (2026-06-11)

- ✅ #13 Slow-query logging — `prisma.service.ts` now logs queries over `PRISMA_SLOW_QUERY_THRESHOLD_MS` (works in production too).
- ✅ #3 Pool tuning — `database-url.ts` appends `connection_limit`/`pool_timeout` from `PRISMA_CONNECTION_LIMIT`/`PRISMA_POOL_TIMEOUT` env vars.
- ✅ #2 (partial) N+1 — `link.service.ts` per-record `MAX(order)` queries batched into one grouped query (`getMaxOrdersForTargets`) for both one-many and many-one paths.
- ✅ #9 (partial) Code splitting — `ChatPanel` and `PluginPanel` now `next/dynamic` (ssr:false) in `Table.tsx`; `WorkFlowPanel` was already lazy.
- ✅ #10 Already implemented upstream — SDK QueryClient has `staleTime: 60s` + `refetchOnWindowFocus: false`.
- ⏳ Remaining: bounded `findMany` sweep (#1), metadata caching expansion (#6), import streaming (#8), heap snapshots (#15).
- ⚠️ Note: backend unit tests can't run on this machine — `sqlite3` native module is built for x86_64 on an arm64 Mac (`pnpm rebuild sqlite3` to fix). Changes verified via TypeScript typecheck (no errors in touched files).

## Benchmarking methodology

`next dev` adds roughly 5× overhead over `next build && next start` — profiling against dev mode produces flamegraphs that look catastrophic but don't match prod. Always benchmark in prod mode:

```
pnpm perf:bench            # build + start prod stack (api :3002, web :3000)
pnpm perf:bench --no-build # reuse last build
```

Then open `http://localhost:3000` in Chrome, record a Performance trace from DevTools while exercising the slow flow, and compare against a baseline. The script lives at `scripts/perf-bench.sh`.

## Suggested sequencing

1. Week 1: slow-query logging + heap snapshot tooling (measure).
2. Weeks 1–2: bound the top-20 hottest `findMany` calls; batch N+1 loops in calculation/link services.
3. Week 3: connection pool tuning, metadata caching expansion.
4. Week 4: frontend dynamic imports + react-query staleTime; bundle budget in CI.
