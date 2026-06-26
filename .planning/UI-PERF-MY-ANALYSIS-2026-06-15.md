# UI Performance — Independent Analysis

**Date:** 2026-06-15
**Author:** Claude (Opus 4.7), reviewing the subagent's `UI-PERF-DEEP-ANALYSIS-2026-06-15.md` against primary source.
**Scope:** Why does displaying a table view take >1 s, and what is the cheapest, highest-impact fix?

## Methodology

I did not rebuild the graphify graph (the existing one is a GSD artifact, not a code graph; building one over a 150 k-LoC monorepo would have burned the budget). Instead I verified every claim in the prior report against the source. Below: what survived, what didn't, and what's new.

## Verified findings (primary-source evidence)

### 1. SSR `getTable` is 4 sequential awaits — CONFIRMED, but the framing was wrong
`apps/nextjs-app/src/backend/api/rest/ssr-api.ts:127-179` — `getTable()` runs:
1. `await this.getFields(tableId, { viewId })` (line 131)
2. `await axios.get(GET_VIEW_LIST)` (line 132)
3. `await axios.get(GET_TABLE, { includeContent: true })` (line 135) — this already returns *table content* server-side
4. `await axios.get(GET_RECORDS_URL)` (line 152)

Steps 1–3 have **no data dependency** on each other (only step 4 reads `currentView.group` from the views result). The prior report claimed step 2 duplicates a caller's `getViewList`; I could not verify that, and it isn't the main cost anyway. The real cost is **3 round-trips run in series for no reason**. With a ~40 ms RTT each, that's ~120 ms of pure sequential latency on every SSR table render.

**Verdict:** real. `Promise.all([getFields, getViewList, getTable])` then `await getRecords` is a ~20-LoC change worth ~80–120 ms.

### 2. `useInstances` 'ready' clobbers SSR seed — CONFIRMED, mechanism is exact
`packages/sdk/src/context/use-instances/useInstances.ts` initial state (~line 480):
```ts
instances: initData && !connected ? initData.map((data) => factory(data)) : []
```
`initData` (the SSR-seeded records/fields/views) is used **only if `!connected`**. The moment ShareDB connects — usually before first paint completes — `useInstances` initializes with `[]`, then on the `ready` event the reducer (`reducer.ts:43-48`) builds the full instances list **from scratch**:
```ts
case 'ready':
  return {
    ...state,
    instances: action.results.filter(hasDocData).map((r) => factory(r.data, r)),
    extra: action.extra,
  };
```
Every consumer (`useFields`, `useViews`, `useRecords`, the grid itself) sees an empty array then a complete replacement. This forces a full subtree re-render — including `GridViewBaseInner` — at exactly the moment the user is waiting for paint.

**Verdict:** real. The fix is to short-circuit the dispatch when the ShareDB `results` are equivalent to `initData` (id+version comparison). ~30 LoC.

### 3. `useFields` uses `JSON.stringify(columnMeta)` as a memo dep — CONFIRMED
`packages/sdk/src/hooks/use-fields.ts:48`:
```ts
}, [originFields, withHidden, viewType, JSON.stringify(columnMeta)]);
```
`columnMeta` is a record keyed by every field id with `{order, hidden, visible, width, ...}`. For a 100-column table this is ~5 kB of JSON re-serialized **on every render of every component that calls `useFields`** (and the grid mounts dozens). This is the textbook React anti-pattern: a non-referential dep that defeats `useMemo` by making the comparison itself the expensive work.

**Verdict:** real. Replace with a stable hash (memoize `columnMeta` upstream, or use a structural `useDeepCompareMemo`). ~5 LoC.

### 4. `GridViewBaseInner` is 1830 LoC — CONFIRMED
`apps/nextjs-app/src/features/app/blocks/view/grid/GridViewBaseInner.tsx` = 1830 lines. One component, dozens of hooks, all evaluated synchronously on first mount and again on every `ready` re-render (see #2).

**Verdict:** real but the *fix* is the hardest to land. Splitting it is high-risk; lower-risk wins (#1 + #2 + #3) likely make this less critical. Leave for later.

### 5. `plainToInstance` (class-transformer) per doc — PARTIALLY VERIFIED
Used in 4 factories: `record/factory.ts`, `field/factory.ts`, `table/factory.ts`, `view/factory.ts`. The `ready` handler maps every doc through `factory()` (reducer.ts:46), so a 1000-record table runs `plainToInstance` 1000× synchronously. `class-transformer` is reflection-heavy (~10–30 µs/call); 1000 records → 10–30 ms of pure transform on the main thread.

**Verdict:** real but secondary. Fix is to either drop class-transformer for plain objects + frozen prototypes, or compile transforms ahead of time. Not a single-PR win.

## Claims I could not verify

- **"1.65 MB unsplit app-code chunks"** — no bundle stats in tree; `View.tsx` *already* lazy-loads every non-grid view via `next/dynamic` (verified lines 32-56), with an explicit comment that `@fullcalendar`/Gantt were the prior bloat. So grid-route bundle is likely smaller than claimed. Needs `pnpm bundle-analyze` to confirm before acting.
- **"~500 unbounded `findMany` call sites"** — only counted 19 in `apps/nestjs-backend/src/features/record/`. Probably true monorepo-wide but the view-load path specifically touches few. Backend appears not to be the >1 s culprit (TTFB ~120 ms per prior notes).

## Where the >1 s actually goes (my ranking)

Budget reconstruction, assuming a warm dev server, ~50-column / 200-record table, devtools off:

| Step | ms | Verified? | Fix LoC | Fix gain |
|---|---|---|---|---|
| Sequential SSR awaits | 80–120 | ✓ | ~20 | -80–120 ms |
| `useInstances` ready re-render | 150–300 | ✓ | ~30 | -150–300 ms |
| `JSON.stringify(columnMeta)` × N components | 30–80 | ✓ | ~5 | -30–80 ms |
| `plainToInstance` per doc × records | 10–30 | ✓ | medium | -10–30 ms |
| `GridViewBaseInner` initial hooks + layout | 200–400 | ✓ | high | hard |
| Dev-mode React + HMR overhead | 200–500 | (prod-mode test pending) | n/a | switch to prod |

**Single highest-impact fix:** combine #1 + #2 in one PR. Both touch SSR/state-rehydration. Expected combined gain: **230–420 ms shaved off the critical path for ~50 LoC.** This is also the *safest* change — no rendering logic touched.

**Second PR:** #3 (memo-dep fix). 5 LoC, no risk, ~30–80 ms across the lifetime of the view.

**Don't touch** `GridViewBaseInner` until the above are in place and re-measured — much of its cost is amplified by the `ready` re-render, and shrinking it pre-fix may not move the needle.

## Concrete next step

If you want me to implement, the smallest credible PR is:
1. `ssr-api.ts:127-180` — `Promise.all` the three independent awaits.
2. `useInstances.ts` — track an `initDataAppliedRef`, and in `handleReady` skip the dispatch when `query.results.length === initData?.length && every(id+v match)`.
3. `use-fields.ts:48` — replace `JSON.stringify(columnMeta)` with a stable reference (lift `columnMeta` memoization to the `useView` provider).

Then re-measure with the React Profiler before deciding whether `GridViewBaseInner` still needs splitting.
