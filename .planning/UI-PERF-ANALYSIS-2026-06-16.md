# UI Performance — >1s navigation analysis

**Date:** 2026-06-16
**Branch:** `refactor/architecture-deep-fix` (post commit `07dc66692`)
**Method:** live measurement via Playwright + `performance.getEntriesByType('resource')`

## Live measurements (dev mode)

Initial load of `/base/.../automation`:

| Metric | Value |
|---|---|
| TTFB | **69 ms** (backend not the bottleneck) |
| FCP | **30,688 ms** |
| `domContentLoaded` | **30,389 ms** |
| Total JS requests | 76 |
| Total transfer | **4,257 KB** |
| Cumulative JS request time | 14,686 ms (parallelized) |
| Cache hit ratio | **2 / 99 resources** (content-hashed dev chunks) |

Client-side route change `/automation` → table view (before fix):

| Metric | Value |
|---|---|
| Transition time | **17,209 ms** |
| New JS chunks fetched | 42 |
| New JS payload | ~1.2 MB |

## Why it's >1s — three layered causes

### 1. Dev-mode chunk fan-out (structural, dominant)

In `pnpm start:local` (Turbopack dev), every named bundle is shipped as a separate, content-hashed chunk. The cache hit ratio is **2 %** because the hash changes on every rebuild. Each route change re-fans the network with 40+ small JS files.

**This is not a code problem.** Production builds (`pnpm bundle-analyze` / `ANALYZE=true`) tree-shake, minify, code-split, and emit long-cache hashes. Expect **10–20× speed-up** in production for the same navigation.

The user's ">1 s in dev" is a faithful report. A prod measurement is the right next step before optimizing further.

### 2. Eager imports leaking through the SDK barrel ✅ FIXED

`packages/sdk/src/components/index.ts` re-exports `markdown-editor`. The `MarkDownEditor` inside used to be a synchronous import of `@udecode/plate/react`, which transitively pulls **slate + slate-react + prosemirror + plate-core + plate-media + floating-ui** (~130 KB+). Because `@teable/sdk` ships as non-tree-shakeable CJS, every authenticated page that imported anything from the barrel — including `/automation`, `/agent/*`, `/setting`, the dashboard — pulled the whole editor.

The earlier perf commit (`8a3a5aa0d`) applied a `React.lazy + Suspense` boundary to the **milkdown**-based `MarkdownEditor` and to the react-markdown **MarkdownPreview**, but **missed the plate-based `MarkDownEditor`**. Same pattern applied today:

- `packages/sdk/src/components/markdown-editor/MarkDownEditor.tsx` → now a 16-line `React.lazy + Suspense` wrapper.
- `packages/sdk/src/components/markdown-editor/MarkDownEditorInner.tsx` → the implementation, dynamically imported.
- SDK rebuilt; dist preserves `import('./MarkDownEditorInner')` so Turbopack/webpack splits it.

**Measured result:** `/automation` was loading the editor stack eagerly (verified via prior browser trace). After fix, `/automation` ships **0** plate/slate/prosemirror chunks (verified live). Saves ~130 KB on every authenticated page that doesn't mount the editor.

### 3. Already-fixed prior issues (no action needed)

- SSR `getTable` 3 sequential awaits → `Promise.all` (commit `717fd7968`). Was ~80–120 ms; now parallel.
- `useInstances` clobbering SSR `initData` on warm ShareDB connections → `initData` honored + reducer short-circuit (commit `717fd7968`). Was a full grid re-render at first paint; now identity preserved when results match.
- View dynamic imports — `View.tsx` already lazy-loads `FormView`, `KanbanView`, `CalendarView`, `GanttView`, `PluginView` via `next/dynamic`. Grid stays eager (the default). Good as-is.

## Solutions, ranked by impact

| # | Action | Impact | Status |
|---|---|---|---|
| 1 | **Measure in production build** (`ANALYZE=true pnpm build` + run dist). Dev-mode 30 s FCP becomes ~1.5–3 s in prod typically. | Largest perceived gain | **Not done — do this first** before any further optimization |
| 2 | Lazy-boundary the plate `MarkDownEditor` in SDK barrel | -130 KB on every non-editor page | ✅ **Done this session** |
| 3 | Audit other SDK barrel re-exports for non-essential eager deps. Candidates already known to ship eagerly: `xlsx` (~223 KB), `antlr4ts` (~180 KB, formula parser), `glide-data-grid` (~123 KB, only needed in grid view) | Several × 100s of KB | Open |
| 4 | Code-split `xlsx` behind a dynamic import — only loads when import/export menu opens | -223 KB on every page | Open |
| 5 | Make field-setting `SelectOptions.tsx` lazy-load `react-virtuoso` (only mounts when select-option editor opens) | -30 KB | Open |
| 6 | Switch off Turbopack dev OR use `pnpm start:prod:local` (already present in repo) for day-to-day dev work, so dev-mode chunk fan-out stops masking real perf | Removes the 30 s FCP for development | Try it |

## Bottom line

The >1 s perception is dominated by **dev-mode chunk fan-out** (each route change re-fetches 40+ small JS files at near-zero cache hit). Production builds collapse this dramatically.

The one real eager-import leak still hiding after the prior milkdown fix — the plate-based `MarkDownEditor` — is fixed in this session and verified live: zero plate/slate/prosemirror requests on `/automation` now.

Next concrete step: run `cd apps/nextjs-app && pnpm bundle-analyze` to see the **production** chunk graph and pick the next eager-import to split.
