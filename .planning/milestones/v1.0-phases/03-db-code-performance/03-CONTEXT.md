# Phase 3: DB & Code Performance - Context

**Gathered:** 2026-05-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Query optimization (Prisma indexes, N+1 fixes), caching layer for hot reads (tableSchema, baseConfig, userPermissions via CacheService/Keyv), background job queue for AI generation calls and import dispatch (BullMQ via EventJobModule), and an internal admin dashboard for cache stats and queue depth.

No external Prometheus/Grafana setup — monitoring is internal-only via the admin dashboard.

</domain>

<decisions>
## Implementation Decisions

### Cache layer (Plan 02)
- **D-01:** New cache keys (`tableSchema:${tableId}`, `baseConfig:${baseId}`, `userPermission:${userId}:${resourceId}`) belong in the existing `ICacheStore` in `apps/nestjs-backend/src/cache/types.ts` — NOT in `IPerformanceCacheStore`. Same pattern as auth/session caches.
- **D-02:** TTLs are hardcoded constants (not env vars): 300 s for table schema, 600 s for base config, 120 s for user permissions.
- **D-03:** Cache-aside in `table.service.ts`, `field.service.ts`, and `auth/permission.service.ts` using the existing `CacheService.get/set/del` API.
- **D-04:** Write events (table/field/base update) call `CacheService.del()` for the relevant key to invalidate — no flush-all.

### Queue architecture (Plan 03)
- **D-05:** Import processing already has queues (`BASE_IMPORT_CSV_QUEUE`, `BASE_IMPORT_ATTACHMENTS_QUEUE`, etc.). Plan 03 keeps BOTH a new `IMPORT_QUEUE` top-level dispatcher AND an `AI_GENERATION_QUEUE` — the IMPORT_QUEUE acts as an outer dispatcher routing to the existing sub-queues.
- **D-06:** All new queues follow the established `EventJobModule.registerQueue(QUEUE_NAME)` pattern — no new centralized `QueueModule`. Each feature module registers its own queue.
- **D-07:** Bull Board is mounted at `/admin/queues` for visibility over all queues (mail, attachments, imports, AI generation).
- **D-08:** Dead letter queue: 3 retries with exponential backoff on both new queues.

### Performance dashboard (Plan 04)
- **D-09:** The `/admin/performance` dashboard fetches data from `PerformanceCacheService.getStats()` (cache hit %) and BullMQ's `queue.getJobCounts()` (queue depth) — **no prom-client or Prometheus**.
- **D-10:** `PerformanceInterceptor` logs requests > 500 ms at WARN level (endpoint, duration, userId). Slow query list in the dashboard is populated from this in-memory log.
- **D-11:** Dashboard shows: cache hit %, queue depth (per queue), slow requests list (last N > 500 ms).
- **D-12:** GET /metrics Prometheus endpoint is **dropped** — no external scraping infrastructure in scope. Can be added later when a Grafana/DataDog setup exists.

### Claude's Discretion
- Exact React component structure and layout of `/admin/performance` dashboard
- In-memory slow-request buffer size (e.g., keep last 100 entries)
- Exact field selection fields to add `select` to in N+1 fixes (researcher/planner to determine)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Cache infrastructure
- `apps/nestjs-backend/src/cache/cache.service.ts` — CacheService API (get/set/del/setnx/incr)
- `apps/nestjs-backend/src/cache/types.ts` — ICacheStore type — add new keys here (D-01)
- `apps/nestjs-backend/src/cache/cache.provider.ts` — Redis/SQLite/memory adapter selection
- `apps/nestjs-backend/src/cache/cache.module.ts` — CacheModule registration pattern
- `apps/nestjs-backend/src/performance-cache/index.ts` — PerformanceCacheService exports (getStats)
- `apps/nestjs-backend/src/performance-cache/types.ts` — IPerformanceCacheStore + ICacheStats

### Queue infrastructure
- `apps/nestjs-backend/src/event-emitter/event-job/event-job.module.ts` — EventJobModule.registerQueue() pattern (D-06)
- `apps/nestjs-backend/src/features/mail-sender/open-api/mail-sender.merge.processor.ts` — Example BullMQ @Processor pattern
- `apps/nestjs-backend/src/features/base/base-import-processor/` — Existing import queues (D-05)

### Prisma schema
- `packages/db-main-prisma/prisma/postgres/schema.prisma` — Add @@index declarations here (Plan 01)

### App module
- `apps/nestjs-backend/src/app.module.ts` — Module registration, BullModule.forRootAsync already configured

### Admin pages (Next.js)
- `apps/nextjs-app/src/pages/admin/` — Existing admin pages (ai-setting, setting, template) — new performance page goes here

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `CacheService` (`src/cache/cache.service.ts`): fully functional, inject and call `.get(key)` / `.set(key, value, ttl)` / `.del(key)` directly
- `PerformanceCacheService.getStats()`: returns cache hit statistics — use for the dashboard
- `BullModule.forRootAsync` already registered in `app.module.ts` — just call `EventJobModule.registerQueue(name)` to add a new queue
- `EventJobModule.registerQueue()` (`src/event-emitter/event-job/event-job.module.ts`): the single call needed to register a BullMQ queue

### Established Patterns
- Cache keys follow template literal types in `ICacheStore` (e.g., `attachment:signature:${string}`) — new keys must match this pattern
- Queue processors use `@Processor(QUEUE_NAME)` decorator + `WorkerHost` base class
- Queue modules use `EventJobModule.registerQueue(QUEUE_NAME)` in their `imports` array
- Admin pages are plain Next.js pages under `apps/nextjs-app/src/pages/admin/`

### Integration Points
- `table.service.ts`, `field.service.ts`: wrap list/get methods with CacheService cache-aside
- `auth/permission.service.ts`: wrap permission resolution with CacheService cache-aside
- `import.class.ts` or `ai.service.ts`: add `.add()` call to dispatch to queue instead of inline execution
- `app.module.ts`: import new monitoring module (for PerformanceInterceptor global binding)

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches within the decisions above.

</specifics>

<deferred>
## Deferred Ideas

- GET /metrics Prometheus endpoint — deferred until a Grafana/DataDog scraping infrastructure is set up

</deferred>

---

<testing>
## Testing Strategy

### Gate rule
`npx vitest run` + `npx tsc --noEmit -p apps/nestjs-backend/tsconfig.json` must pass before each next wave.

### Unit Tests (Vitest)
- `cache.service.spec.ts` — test cache-aside pattern: hit returns cached value without DB call; miss calls DB + populates cache; invalidation (del) clears key
- `performance-interceptor.spec.ts` — test that requests > 500 ms are logged at WARN level; in-memory buffer caps at configured size
- Queue processor unit: mock `Queue.add()`, verify job payload shape for `IMPORT_QUEUE` and `AI_GENERATION_QUEUE`

### Integration Tests (Vitest + test DB)
- `GET /admin/performance` → 200 with `{ cacheHitPct, queues: [...], slowRequests: [...] }` shape
- Cache invalidation: update a table → subsequent schema fetch goes to DB (cache miss logged)
- BullMQ job creation: call AI generation endpoint → verify job added to `AI_GENERATION_QUEUE`

### E2E Tests (Playwright — Wave 4)
- Navigate to `/admin/performance` → dashboard renders with numeric values (not NaN, not empty)

### What NOT to test
- Redis connection setup (infrastructure)
- BullMQ internal retry logic
- Existing Prisma index effectiveness (measured by query plans, not unit tests)
</testing>

*Phase: 03-db-code-performance*
*Context gathered: 2026-05-14 (testing added 2026-05-15)*
