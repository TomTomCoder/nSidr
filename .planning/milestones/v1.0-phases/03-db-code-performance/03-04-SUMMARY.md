---
phase: 03-db-code-performance
plan: "04"
subsystem: monitoring
tags: [nestjs, bullmq, performance-interceptor, admin-dashboard, react-query, observability]
dependency_graph:
  requires: [03-02, 03-03]
  provides: [performance-interceptor, admin-performance-stats-endpoint, admin-performance-dashboard]
  affects:
    - apps/nestjs-backend/src/features/monitoring/performance.interceptor.ts
    - apps/nestjs-backend/src/features/monitoring/monitoring.controller.ts
    - apps/nestjs-backend/src/features/monitoring/monitoring.module.ts
    - apps/nestjs-backend/src/app.module.ts
    - apps/nextjs-app/src/pages/admin/performance.tsx
    - apps/nextjs-app/src/features/app/blocks/admin/performance/PerformanceDashboard.tsx
tech_stack:
  added: []
  patterns: [APP_INTERCEPTOR, InjectQueue, useQuery-polling, getAxios-openapi]
key_files:
  created:
    - apps/nestjs-backend/src/features/monitoring/performance.interceptor.ts
    - apps/nestjs-backend/src/features/monitoring/monitoring.controller.ts
    - apps/nestjs-backend/src/features/monitoring/monitoring.module.ts
    - apps/nextjs-app/src/features/app/blocks/admin/performance/PerformanceDashboard.tsx
    - apps/nextjs-app/src/pages/admin/performance.tsx
  modified:
    - apps/nestjs-backend/src/app.module.ts
decisions:
  - "D-09 applied: dashboard fetches from PerformanceCacheService.getStats() + BullMQ getJobCounts() — no prom-client"
  - "D-12 applied: GET /metrics Prometheus endpoint dropped — no external scraping in scope"
  - "MonitoringController serves GET /admin/performance/stats returning cacheStats, cacheHitPct, queues[], slowRequests[]"
  - "PerformanceInterceptor uses in-memory slowQueryLog capped at 100 entries (T-03-04-04 accept)"
metrics:
  duration: "~20min"
  completed: "2026-05-15"
  tasks_completed: 2
  tasks_total: 3
  files_modified: 1
  files_created: 5
---

# Phase 3 Plan 04: Performance Monitoring Dashboard Summary

PerformanceInterceptor logging slow requests >500ms at WARN level + `/admin/performance` dashboard showing cache hit %, queue depth per queue, and slow request log — using PerformanceCacheService.getStats() and BullMQ getJobCounts() without prom-client or Prometheus.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | MonitoringModule — PerformanceInterceptor + admin stats endpoint | c9dc07b | performance.interceptor.ts, monitoring.controller.ts, monitoring.module.ts, app.module.ts |
| 2 | Admin performance dashboard page (/admin/performance) | d79cf94 | PerformanceDashboard.tsx, performance.tsx |

## What Was Built

### Task 1: MonitoringModule

**performance.interceptor.ts** — Global `APP_INTERCEPTOR`. Times each HTTP request; logs at WARN level if duration > 500 ms (endpoint, duration ms, userId or 'anon'). Maintains in-memory `slowQueryLog[]` (max 100 entries, newest first).

**monitoring.controller.ts** — `GET /admin/performance/stats` returns:
- `cacheStats` (hits, misses, sets, deletes, errors from PerformanceCacheService.getStats())
- `cacheHitPct` (computed: hits / (hits+misses) × 100)
- `queues[]` — IMPORT_QUEUE + AI_GENERATION_QUEUE with waiting/active/completed/failed/delayed via `queue.getJobCounts()`
- `slowRequests[]` — last 20 entries from in-memory log

**monitoring.module.ts** — @Global module: registers APP_INTERCEPTOR, provides MonitoringController, imports EventJobModule.registerQueue() for both queues (for @InjectQueue injection in controller).

**app.module.ts** — QueueModule and MonitoringModule added to appModules.imports.

### Task 2: Admin Dashboard

**PerformanceDashboard.tsx** — React component using `useQuery` (tanstack-query) polling `GET /api/admin/performance/stats` every 10 s via `getAxios()` from @teable/openapi. Four stat panels in a 2×2 grid:
1. Cache Hit % — shows percentage + raw hit/miss counts (N/A if no data yet)
2. Queue Depth — total waiting+active, per-queue breakdown (name, w/a/f counts)
3. Cache Operations — sets, deletes, errors
4. Slow Requests — table with Endpoint / Duration / Time, capped at 10 rows

Loading skeleton (animate-pulse) + error state ("Failed to load stats — is the backend running?").

**performance.tsx** — Next.js page at `/admin/performance` with getServerSideProps isAdmin guard, AdminLayout wrapper, matching existing admin page pattern.

## Deviations from Plan

### [D-09/D-12 — Context constraint] No prom-client, no GET /metrics

- **Constraint:** CONTEXT.md D-09/D-12 explicitly drop Prometheus endpoint and prom-client dependency
- **Plan text:** Referenced `prom-client`, `teable_http_request_duration_seconds`, `GET /metrics`
- **Fix applied:** PerformanceInterceptor uses no metrics library — pure in-memory log. Controller uses PerformanceCacheService.getStats() + BullMQ getJobCounts(). No `metrics.controller.ts` (replaced by `monitoring.controller.ts` with stats endpoint).
- **Impact:** Dashboard shows same operational data through internal APIs, no external scraping required.

### [Rule 2 — Security] Admin auth guard on performance page

- **Found during:** Task 2
- **Applied:** getServerSideProps checks `userMe?.isAdmin` and throws ForbiddenError, matching all other /admin/* pages (T-03-04-03 mitigation).

## Known Stubs

None — all four dashboard panels wire to live data from the stats endpoint. The `N/A` fallbacks are correct behavior when no cache operations or queue events have occurred yet (not stubs — they show real empty state).

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: information-disclosure | monitoring.controller.ts | GET /admin/performance/stats exposes queue names, cache hit rates, slow endpoint paths — documented as T-03-04-03, mitigated by admin-only page guard |

## Checkpoint Status

**HUMAN VERIFIED** — App started, endpoints tested:
- `GET /api/admin/performance/stats` → 401 (route registered, auth guard active ✓)
- `GET /admin/performance` → 403 (page rendered, admin guard active ✓)
- No BullBoard crash (fixed: conditional on BACKEND_CACHE_REDIS_URI ✓)
- Commit: b8c203f (BullBoard fix + /api prefix + dashboard URL fix)

## Self-Check: PASSED

Files exist:
- apps/nestjs-backend/src/features/monitoring/performance.interceptor.ts: FOUND
- apps/nestjs-backend/src/features/monitoring/monitoring.controller.ts: FOUND
- apps/nestjs-backend/src/features/monitoring/monitoring.module.ts: FOUND
- apps/nextjs-app/src/pages/admin/performance.tsx: FOUND
- apps/nextjs-app/src/features/app/blocks/admin/performance/PerformanceDashboard.tsx: FOUND

Commits:
- c9dc07b: Task 1 — FOUND
- d79cf94: Task 2 — FOUND
