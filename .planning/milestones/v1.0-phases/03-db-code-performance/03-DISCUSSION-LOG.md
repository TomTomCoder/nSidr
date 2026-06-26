# Phase 3: DB & Code Performance - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-14
**Phase:** 03-db-code-performance
**Areas discussed:** Cache layer strategy, Queue scope, Performance dashboard data source, Monitoring intent

---

## Cache layer strategy

| Option | Description | Selected |
|--------|-------------|----------|
| CacheService (ICacheStore) | Add new keys to existing ICacheStore. Same pattern as auth/session caches. Simple, already connected to Redis. | ✓ |
| PerformanceCacheService (IPerformanceCacheStore) | Add to performance cache that already has getStats(). Dashboard data is richer but breaks CacheService's established pattern for infrastructure data. | |

**User's choice:** CacheService (ICacheStore)
**Notes:** None

---

## Cache TTLs

| Option | Description | Selected |
|--------|-------------|----------|
| Hardcoded constants | Named constants in types.ts. Simple, predictable. Can be changed in code later. | ✓ |
| Env-var configurable | CACHE_TABLE_SCHEMA_TTL etc. More flexible for production tuning without redeployment. | |

**User's choice:** Hardcoded constants
**Notes:** None

---

## Queue scope for Plan 03

| Option | Description | Selected |
|--------|-------------|----------|
| AI generation queue only | Import already queued via BASE_IMPORT_* queues. Focus on AI_GENERATION_QUEUE. EventJobModule.registerQueue() pattern. | |
| Both IMPORT_QUEUE + AI queue (original plan) | New IMPORT_QUEUE as top-level dispatcher routing to existing sub-queues, plus AI_GENERATION_QUEUE. | ✓ |

**User's choice:** Both IMPORT_QUEUE + AI queue
**Notes:** IMPORT_QUEUE acts as an outer dispatcher on top of existing import sub-queues.

---

## Queue pattern

| Option | Description | Selected |
|--------|-------------|----------|
| EventJobModule.registerQueue() | Consistent with all existing queues. Each feature module registers its own queue. No new module. | ✓ |
| New centralized QueueModule | Central visibility but diverges from codebase pattern and may conflict with EventJobModule. | |

**User's choice:** Follow EventJobModule.registerQueue()
**Notes:** None

---

## Performance dashboard data source

| Option | Description | Selected |
|--------|-------------|----------|
| PerformanceCacheService.getStats() + BullMQ getJobCounts() | No new dependencies. Cache hit %, queue depth, slow requests in-memory. Simpler. | ✓ |
| prom-client Prometheus metrics | Full histograms, GET /metrics for external scraping. Adds prom-client dependency. | |

**User's choice:** PerformanceCacheService.getStats() + BullMQ getJobCounts()
**Notes:** None

---

## Monitoring intent — internal vs external

| Option | Description | Selected |
|--------|-------------|----------|
| Drop GET /metrics | No external monitoring planned. Admin dashboard covers internal needs. Add later when Grafana exists. | ✓ |
| Keep GET /metrics | Add prom-client for future Grafana/DataDog scraping. Adds dependency without immediate consumer. | |

**User's choice:** Drop GET /metrics
**Notes:** Deferred until there is an actual Grafana/DataDog infrastructure to scrape it.

---

## Claude's Discretion

- React component structure and layout of /admin/performance dashboard
- In-memory slow-request buffer size
- Exact Prisma select field lists for N+1 fixes

## Deferred Ideas

- GET /metrics Prometheus endpoint — future when Grafana/DataDog setup exists
