# UI Perf Deep Analysis — "data display takes >1s" (2026-06-15)

Scope: trace the actual data-display path of a typical view load in `apps/nextjs-app`,
quantify where the >1s budget goes, and rank root causes with concrete fixes.
Method: code-level audit (not browser re-profile) cross-referenced with the existing
profiling notes in `PERFORMANCE-DEEP-ANALYSIS-2026-06-14.md` and `PERF-FIX-PLAN-2026-06-15.md`.

---

## 1. What's already known + what's still unverified

### Already measured / addressed (do not re-investigate)
- **Dev mode penalty ~5×** — `next dev` + on-demand route compile on first hit accounts for
  most of the user-perceived "page takes 15-48s on first visit." Bench against
  `next build && next start` (`pnpm perf:bench`). Already documented.
- **React Query defaults** — `createQueryClient` in `packages/sdk/src/context/app/queryClient.tsx:137`
  sets `staleTime:60s` + `refetchOnWindowFocus:false`. Done.
- **Provider value memoization (P0.1)** — Table/PersonalViewProxy/DraggableWrapper/BaseNodeTree
  memoized; `renderWithHooks` storm gone in prod profile.
- **SDK CJS editor bloat** — Lazy boundaries inside SDK (milkdown, react-markdown) landed
  2026-06-15: −0.39 MB on `/space`, −0.39 MB on `/base/...`, −0.55 MB on `/space/[spaceId]`.
- **Backend is not the bottleneck on a table switch** — 21 API calls all <30ms, TTFB
  ~124ms; backend idle during the long-task.

### Unverified / open (this analysis confirms or re-prioritizes them)
- "Warm table switch ~2.5s" remains — the grid mount cost is not yet decomposed by
  component (no scoped trace of `GridViewBaseInner` mount itself).
- Eager JS on `/base/[baseId]/...` route is still **~4.24 MB raw bytes** after the SDK
  fix. The remaining ~1.65 MB of unbranded chunks (the app's own SDK + grid code) has
  not been split.
- `useFields` uses `JSON.stringify(columnMeta)` as a dep — never re-measured after
  V2 schema landed (columnMeta now contains far more keys per field on linked tables).
- `useInstances` clears state and refetches via ShareDB once connection opens, EVEN
  when SSR data is identical. This client-side waterfall has not been quantified.
- 364 unbounded `findMany` in backend — not the cause of *this* >1s, but a tail-latency
  risk for large bases.

---

## 2. Data-display path for a typical view load

Path for `GET /base/<baseId>/table/<tableId>/<viewId>`:

```
[Server]
  pages/base/[baseId]/[[...slug]].tsx :getServerSideProps      ~ 80-200ms
    └─ handleBase()  → GET /base/:id                              (await)
    └─ Promise.all([
         fetchQuery(base permissions),
         fetchQuery(base),
       ])
    └─ getTableServerSideProps()
        ├─ ssrApi.getTables(baseId)                               (await)
        ├─ getDefaultViewId? → getUserLastVisit + getViewList     (Promise.all)
        ├─ validateResourceExists → ssrApi.getTables again        (await, cached)
        ├─ ssrApi.getViewList(tableId)                            (await)
        ├─ getViewPageServerData()
        │   └─ ssrApi.getTable() — 4 SEQUENTIAL awaits ⚠⚠⚠
        │       ├─ getFields(tableId, {viewId})
        │       ├─ getViewList(tableId)        ← already fetched above!
        │       ├─ GET /base/:id/table/:id     (with includeContent)
        │       └─ GET /base/:id/table/:id/records
        └─ fetchQuery(tablePermission)                            (await)
    └─ dehydrate(queryClient) → serialize ALL fetched data
    └─ render HTML

[Network]
  HTML + dehydrated state →  ~50-400 KB transferred (gzip ~30-150 KB)

[Client cold load]
  Parse HTML → load all eager chunks (~2.4 MB transfer, ~8-10 MB parsed)
  React hydrate → providers mount → ShareDB connect (SockJS handshake)
     │
     ├─ TablePage renders DynamicTable (next/dynamic ssr:false)
     │     └─ Table.tsx mounts 6+ providers (Anchor / Permission / View /
     │         PersonalViewProxy / Field / PersonalView)
     ├─ Each provider with useInstances() calls connection.createSubscribeQuery()
     │     and starts SockJS handshake to /socket
     │
     └─ GridViewBaseInner renders (~40 hooks at top of render)
         └─ useFields() → fields from FieldProvider
         └─ useGridColumns() → cellValue2GridDisplay built
         └─ Canvas layout setup + appendChild  (~330 ms in prod, measured)

[ShareDB ready]
  query 'ready' event → useInstances dispatch({type:'ready'}) →
     state.instances = results.map(factory)            ← throws away SSR data!
  → re-render whole subtree with fresh instances
```

### Where the >1s actually goes (concrete budget)

Server-side (~120ms): not the bottleneck.

Client cold load (typical first paint after navigation):
- **JS parse + compile of eager bundle (~2.4 MB transfer, 8-10 MB parsed)**: 400-1500 ms
  (machine-dependent — dominant on the user's contended dev machine).
- **React hydrate** + Provider mount cascade: 80-200 ms.
- **ShareDB SockJS handshake + initial subscribe** (network RTT + WS upgrade):
  100-400 ms, blocks the "ready" event.
- **`useInstances` clears SSR-seeded state once connection opens** and re-dispatches with
  ShareDB-fetched docs → forces another render of every consumer. 80-200 ms.
- **`GridViewBaseInner` synchronous mount** (canvas layout + sprite manager + ~40 hooks
  resolving): 330-500 ms (prod), 1.5-2s (dev).
- **`createFieldInstance` ×N via `plainToInstance`** (class-transformer): 1-3 ms/field
  → 50-200 ms for 50 fields, paid on every `ready` event.

Sum on a normal machine, prod build, warm cache: **~1.0-1.8s** before pixels stabilize.
On dev mode: 5-15s. This matches the user's "≥1s" perception.

---

## 3. Top 5 root causes (ranked)

### #1 — SSR + ShareDB do the same fetch twice; SSR data is thrown away on connect
**Files**: `packages/sdk/src/context/use-instances/useInstances.ts:289-303`,
`reducer.ts:38-46` (`'ready'` case replaces state entirely).
**Evidence**: state is initialized to `initData.map(factory)` *only* `!connected`
(line 289). On first hit, hydration happens before SockJS connects, so SSR data shows
briefly. But the moment `query.ready` fires, the reducer's `'ready'` action **overwrites
the full instances array**, triggering a full re-render of every consumer
(grid, header, view list, field popovers). The SSR payload (104-400 KB) was effectively
wasted.

Compounding: `getViewPageServerData` → `ssrApi.getTable()` already runs **4 sequential
awaits** (`apps/nextjs-app/src/backend/api/rest/ssr-api.ts:126-176`), one of which
re-fetches `getViewList` that the caller in `TablePage.tsx:107` *also* fetches.
~80-160 ms of avoidable SSR latency.

**Fix**: (a) parallelize the 4 awaits in `getTable` with `Promise.all` (drop the duplicate
viewList; pass the already-fetched list in). (b) When the ShareDB `ready` fires and
results structurally match the seeded SSR data, **skip the `'ready'` dispatch**
(deep-equal by id+version, or use a `seeded` flag and only apply doc-level diffs
via `'update'`). Effort: M. Impact: removes a full subtree re-render and 80-160ms
SSR. **Highest leverage.**

### #2 — `GridViewBaseInner` is one 1830-line component with ~40 hooks at top of render
**File**: `apps/nextjs-app/src/features/app/blocks/view/grid/GridViewBaseInner.tsx:165-260+`.
**Evidence**: lines 175-260 alone call >40 hooks (`useTranslation`, `useQueryClient`,
`useRecordOperations`, `useRouter`, `useBaseId`, `useTableId`, `useViewId`, `useSession`,
`useView`, `useRowCount`, `useSSRRecords`, `useSSRRecord`, `useGridTheme`, `useFields` ×2,
`useBaseUsage`, `useDisableAIAction`, `useFields`, `useContext(TaskStatusCollectionContext)`,
`useShareContext`, `useButtonClickStatus`, `useGridSearchStore`, `useGridColumns`,
`useGridColumnResize`, `useGridColumnStatistics`, `useGridColumnOrder`, `useGridViewStore`,
`useFieldSettingStore`, `useGridTooltipStore`, `useUserInfoPopoverStore`, `usePrevious`,
`useIsTouchDevice`, `useTablePermission`, `useShareAllowCopy`, `useUndoRedo`, plus
~10 useState/useMemo). Every store-update from any one of these triggers the entire
component to re-render — and `useFields()` runs `sortBy` + `filter` + `JSON.stringify`
inside its `useMemo`.

**Fix**: split into 3 components — a thin shell (memoized) that owns refs/dialog state,
a `<GridDataBindings>` that owns data hooks, a `<GridInteractionPanel>` that owns store
subscriptions. Hoist dialog state (expandRecord, newRecords, cellErrors) into a small
zustand slice so they don't re-render the data path. Effort: L. Impact: removes the
~330 ms appendChild cascade on switch (measured in PERFORMANCE-DEEP-ANALYSIS).

### #3 — `useFields` has `JSON.stringify(columnMeta)` as a memo dependency
**File**: `packages/sdk/src/hooks/use-fields.ts:47`.
**Evidence**: every render of any consumer of `useFields` (and there are dozens — grid,
view sidebar, kanban, gallery, calendar, search dialog, statistics) recomputes
`JSON.stringify(view.columnMeta)`. For a 50-field view, that's 50 keys × ~100-300 bytes
each = ~10-15 KB string serialization PER consumer PER render. On a switch with 6
re-renders × 8 consumers, that's ~70-100 ms wasted. Also defeats reference equality
optimizations downstream.

**Fix**: compute a stable hash via `view?.id + view?.updatedAt` OR memoize columnMeta
once at `ViewProvider` level (return a stable reference when contents haven't changed),
OR use `useMemoCompare` with shallow compare on columnMeta keys+visible+order only.
Effort: S. Impact: 50-100 ms saved across the render storm, plus enables downstream memo
chains.

### #4 — `useInstances` re-creates instances via `plainToInstance` on every `'update'`
**File**: `packages/sdk/src/context/use-instances/reducer.ts:32-44` (update case),
factory at `packages/sdk/src/model/field/factory.ts` (uses `class-transformer`
`plainToInstance`).
**Evidence**: every ShareDB op on any field/record fires `dispatch({type:'update', doc})`
which **calls `factory(doc.data, doc)` and creates a new array via `.map`** — so the
*whole* field/record list reference changes, busting downstream `useMemo` on `fields`
identity. `plainToInstance` itself walks all properties via reflection, ~1-3 ms per
field. Combined with #3, this is the runtime cost of "data display feels slow after
an edit."

**Fix**: in the `'update'` reducer, only replace the matched instance (already done
correctly — but the whole array reference still changes, which is the bug surface).
Instead: mutate-in-place + dispatch a structural sharing helper, OR migrate factory off
class-transformer to a hand-written `new Field(data)` (10-30× faster). Effort: M. Impact:
30-100 ms per ShareDB op storm; large on `addRecord` / bulk paste.

### #5 — The /base route still ships ~4.24 MB of eager JS for an authenticated shell
**File**: `apps/nextjs-app/src/AppProviders.tsx` + `BaseLayout` + SDK barrel exports.
**Evidence**: measured (PERF-FIX-PLAN-2026-06-15.md). The grid is already `dynamic()`.
`/space` (no grid, no editors) still ships 3.81 MB. ~1.65 MB of that is the app's own
code in unmarked vendor chunks (the SDK + grid stack). On a contended/slow client this
is 500-1500 ms of parse+compile per cold navigation.

**Fix**: (a) `pnpm bundle-analyze` on production build to fingerprint the 1.65 MB; the
likely suspects are `ChatPanel`, `AgentChat`, `AppBuilder` widgets being pulled by
top-level imports somewhere in `BaseLayout`. (b) Configure `splitChunks` cacheGroup
in `next.config.mjs` to isolate prosemirror/markdown/share-related vendor chunks per
route. (c) Audit `@teable/sdk` barrel re-exports — any direct `import { X } from
'@teable/sdk'` in `BaseLayout` drags the whole SDK index. Effort: M. Impact: −300 to
−800 ms cold-load on every authenticated page.

---

## 4. Suggested order (highest ROI first)

1. **#1** — parallelize `ssrApi.getTable()` (1 file, ~20 LoC) **+** dedupe SSR→ShareDB
   ready dispatch (1 reducer change). Cheap, high-impact. *This is the single highest
   leverage win.*
2. **#3** — fix `useFields` dependency (1 hook, ~5 LoC).
3. **#5** — `pnpm bundle-analyze` and split the 1.65 MB unmarked chunks.
4. **#2** — refactor `GridViewBaseInner` into 3 layers.
5. **#4** — remove class-transformer from the field/record factory hot path.

After each, re-baseline with `pnpm perf:bench` and:
```js
performance.getEntriesByType('navigation')[0].domInteractive
performance.getEntriesByType('resource').reduce((a,r)=>a+r.transferSize,0)
```
Target: <800 ms domInteractive on a warm prod build, <500 ms warm table switch.

---

## 5. Notes / caveats

- This is a code-level audit, not a fresh CDP trace. The numbers above are derived from
  the prior measurements in `PERFORMANCE-DEEP-ANALYSIS-2026-06-14.md` and `PERF-FIX-PLAN-
  2026-06-15.md`, calibrated against the call structure. **Re-measure with a prod build
  before claiming a fix lands** — the prior plan correctly flags that dev numbers mislead.
- The grid mount appendChild cost (#2) and the JS parse cost (#5) may overlap — splitting
  the bundle first reduces parse, then the mount cost is what remains.
- `useInstances` already deduplicates queries across hooks via `subscribeQueryCache` — good.
  The issue is the *first* ready event, not subsequent ones.
