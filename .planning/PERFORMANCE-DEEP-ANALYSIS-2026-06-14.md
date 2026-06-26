# Teable performance deep-analysis & recommendations (2026-06-14)

## RE-MEASURED (2026-06-14, evening) — the dominant cause is DEV MODE

Fresh measurement of a settled Team Members → Projects switch, after P0.1 (10+ providers
memoized) and P0.2 (QueryClient now has `staleTime:60s` + `refetchOnWindowFocus:false`)
were both landed (collaborator commit `1af7bebb5`):

- **Production** (`next build && next start`, CDP V8 profiler): settled switch ≈ **2.5 s**
  of main-thread JS self-time. Top costs: `appendChild` 330 ms + `removeChild` 57 ms
  (grid-canvas + tree DOM construction), React reconciliation ~140 ms (minified), GC
  243 ms, `(program)`/layout 412 ms. No `renderWithHooks` storm anymore (the memoization
  sweep worked).
- **Dev** (`next dev` — what `pnpm start:local` runs): the route **failed to load within
  30 s** on first hit. `next dev` compiles each route **on-demand on first visit** and
  ships **unminified React with no optimizations** (~5× slower). This is almost certainly
  what the user feels as "slow to display **any** page."

**Verdict:** the perceived slowness is dominated by **running in dev mode**, not by a code
regression. For real-world speed, run a production build (`pnpm perf:bench`, or
`next build && next start`). The remaining *production* cost is the synchronous grid/tree
DOM mount (~0.4 s of appendChild/removeChild) + SSR payload hydration — see P0.3 / P1.1.

---


Evidence-based audit of why the UI/UX feels slow, with prioritized fixes. Builds on
the table-switch profiling already done this session (see `project_perf_table_switch`).

## Executive summary
The slowness is **client-side**, not the backend (backend sits idle during a table
switch: sockjs handshake + ShareDB stream, 0 slow queries). Three compounding causes:

1. **Whole-tree React re-renders** on every navigation/table switch — inline context
   values + unmemoized providers cascade to all consumers (`renderWithHooks` was the
   #1 self-time, ~5.9s dev / dominant in prod).
2. **Oversized SSR hydration** — the table route serializes 304 KB of page props
   (Next warns >128 KB on every load), all parsed + hydrated on the main thread.
3. **Aggressive refetching** — the app-wide React Query client has no `staleTime`/
   `refetchOnWindowFocus` config, so cached data refetches on every mount and focus.

Plus a synchronous **grid mount** (~6–8 s prod long-task even for 3 records) and
**364 unbounded `findMany`** in the backend (runtime-OOM / large-read risk).

---

## P0 — highest impact, low/medium risk

### P0.1 Stabilize context values + memoize shells (re-render cascade)
- **Evidence**: 18 inline `Provider value={{...}}` across `packages/sdk/src` +
  `apps/nextjs-app/src`. Each recreates its value object every render → every consumer
  re-renders. Hot-path offenders still open: `packages/sdk/src/context/table/StandaloneViewProvider.tsx`,
  `LinkViewProvider.tsx`, `ShareViewProxy.tsx`, `components/base-query/context/QueryFormProvider.tsx`.
- **Fix**: wrap each provider value in `useMemo` with exact deps (the proven pattern;
  already applied to Table/PersonalViewProxy/DraggableWrapper/BaseNodeTree this session).
  Then `React.memo` the always-mounted shell components that re-render on switch
  (TableInfo, Collaborators, RightActions, view-list items).
- **Impact**: removes the bulk of `renderWithHooks`. **Effort**: S–M. **Risk**: low.

### P0.2 Tune the app-wide React Query client
- **Evidence**: `apps/nextjs-app/src/AppProviders.tsx` uses a bare `new QueryClient()`
  (no `defaultOptions`). Default `staleTime: 0` + `refetchOnWindowFocus: true` →
  redundant refetches of fields/views/permissions/base on every navigation and tab focus.
- **Fix**: set sensible defaults: `staleTime: 30_000` (or per-query), `refetchOnWindowFocus: false`,
  `gcTime` tuned. Override per-query where freshness matters.
- **Impact**: fewer network round-trips + fewer re-renders on focus/switch. **Effort**: S. **Risk**: low.

### P0.3 Shrink the SSR page payload (304 KB → <128 KB)
- **Evidence**: Next "large page data" warning on every `/base/[baseId]/[[...slug]]` and
  `/space/[spaceId]` load. SSR (`backend/api/rest/ssr-api.ts`) serializes base + all tables
  + all fields (full options/formula/link/AI config) + all views (filter/sort/group/columnMeta)
  + group points + permissions into props, then hydrates them client-side.
- **Fix**: (a) only SSR the *active* table/view, lazy-load the rest client-side; (b) trim
  field/view payloads to what first paint needs; (c) move large lists off SSR props into a
  client query with `staleTime`. Hydrating 304 KB of JSON is a measurable main-thread cost.
- **Impact**: faster TTI + lighter hydration. **Effort**: M. **Risk**: medium (touches SSR contract).

---

## P1 — medium impact

### P1.1 Defer / chunk the synchronous grid mount
- **Evidence**: settled prod switch ≈ 6–8 s long-task for a *3-record* table → cost is
  fixed grid-mount overhead (field-instance construction ×fields + canvas layout setup),
  independent of data volume.
- **Fix**: build field instances lazily / memoize across switches (cache by tableId);
  defer non-visible work (off-screen panels) with `requestIdleCallback`; verify the ~9
  `dynamic()` code-split boundaries actually exclude heavy panels from the table chunk.
- **Impact**: cuts the long-task. **Effort**: M–L. **Risk**: medium (grid is core).

### P1.2 Bound the worst backend `findMany`
- **Evidence**: 364 `findMany(` calls, none with a `take`. Likely cause of the known
  runtime OOM and slow large reads.
- **Fix**: add `take` + pagination to the hot/unbounded ones (records, fields, ops,
  collaborators); add a lint/CI guard against unbounded `findMany`. See
  `.planning/PERFORMANCE-RECOMMENDATIONS.md`.
- **Impact**: memory + tail-latency. **Effort**: M (sweep). **Risk**: low per-site.

### P1.3 Bundle analysis
- **Fix**: `cd apps/nextjs-app && pnpm bundle-analyze` (ANALYZE=true prod build) to find
  oversized vendor chunks in the table route; lazy-load editors/charts/calendar/gantt that
  aren't needed for grid-first paint.
- **Impact**: smaller initial JS. **Effort**: S to measure. **Risk**: low.

---

## P2 — polish / verification

- **Dev vs prod**: `next dev` adds ~5×; always benchmark against `next build && next start`
  (recipe in `project_perf_table_switch`). Don't optimize against dev numbers.
- **Re-baseline method**: trust the CDP V8 sampling profiler, not the browser `longtask`
  observer (it over-reports in the automation harness).
- **Already fixed this session**: DataLoader dormant cache (field queries 22→3/req),
  doc-ids 550→25 ms, DraggableWrapper dnd re-measure (getBoundingClientRect 468→3 ms),
  AnchorContext + PersonalViewProxy memoization, BaseNodeTree ItemIcon/ItemStatus hoist
  (DOM churn ~2.4 s → ~71 ms; switch self-time ~6–8 s → ~1.9 s).

## Suggested order
P0.2 (QueryClient defaults, 1 file) → P0.1 (remaining provider memoization) →
P1.3 (bundle-analyze to target P0.3/P1.1) → P0.3 (SSR trim) → P1.1 (grid mount) →
P1.2 (findMany sweep). Re-profile on a prod build after each.
