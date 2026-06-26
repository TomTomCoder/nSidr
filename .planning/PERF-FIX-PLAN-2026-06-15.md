# Performance fix plan — table/page load is slow (2026-06-15)

## Root cause (measured, prod build, CDP + Resource Timing)
The slowness is **100% client-side JavaScript**, not the server or the data:

| Signal | Value | Meaning |
|---|---|---|
| TTFB (SSR HTML) | **124 ms** | Server is fast — not the bottleneck |
| API calls on load | **21, all < 30 ms** | Data/backend is fast — NOT network-bound |
| **JS parsed/executed** | **8.4 MB across 99 chunks** (2.4 MB transferred) | THE bottleneck |
| domInteractive | ~15 s (machine under contention) | Main thread blocked parsing/executing JS |
| Warm table switch | ~2.5 s | Re-render + grid re-mount (secondary) |

The browser must download, parse, compile and execute **8.4 MB of JS** before the page
is interactive. On a contended dev machine this reads as 15–48 s; on a normal machine it's
still multiple seconds — and it happens on **every** route because the bulk is shared.

## Why the bundle is so big (confirmed)
`apps/nextjs-app/src/features/app/blocks/view/View.tsx` **eagerly imports all 7 view
components** at module top:
```ts
import { CalendarView } ... import { GanttView } ... import { KanbanView } ...
import { GalleryView } ... import { FormView } ... import { PluginView } ... import { GridView } ...
```
So opening *any* table — even a Grid view (the default) — pulls in:
- **CalendarView → @fullcalendar/core + daygrid + interaction + react + 5 locale bundles**
- GanttView, KanbanView, GalleryView, FormView, PluginView and their deps.
Plus the repo ships **two charting libraries** (echarts 5.5 **and** recharts 2.12) and the
AI/chat stack (`ai`, `@ai-sdk/react`, `streamdown`, `react-markdown`, `katex`).

## Chunk fingerprints (what the ~2.4 MB transfer actually is)
Grepping the largest built chunks for library signatures:
- **recharts (×2 ~469 KB) + d3 (~494 KB)** ≈ **1.4 MB** — charting, only needed for
  dashboards/charts, NOT the grid.
- react-dom + scheduler ≈ 1.3 MB — unavoidable runtime.
- **Five–seven 576–830 KB chunks with NO library signature** ≈ **4 MB** — the **app's own
  code** (the SDK + grid stack + eagerly-imported field editors / toolbar / dialogs / view
  blocks). This is the real bulk.

NOTE: lazy-loading the view components (P0.1, done) trimmed only ~330 KB — proof the bulk
is the shared app/SDK chunks + recharts, not the views. Re-prioritized below.

## ⚠️ CORRECTION (2026-06-15, measured against real prod `next build` manifest)

The chunk-fingerprint "evidence" above was read from the *full* `.next/static/chunks`
dir (every route's chunks), NOT the table route's actual initial-load set. Measuring the
table route's real eager JS via `.next/build-manifest.json` `pages['/base/[baseId]/[[...slug]]']`
overturns the central hypotheses:

| Claim in plan | Measured reality (prod build) |
|---|---|
| recharts (~1.4 MB) eager on table route | **FALSE** — recharts is NOT in the table route's initial chunks (baseline *or* after my changes). `sideEffects:false` + the plugin/chart path already being dynamic tree-shook it. |
| SSR serializes all tables' fields (429 KB) | **FALSE** — `getViewPageServerData` fetches `api.getTable()` for the **single active table** only; `viewList`/permission also scoped to the active table. SSR is already lean. |
| Table-switch is bundle-bound | Table switch is **client nav**, not SSR/bundle — bundle only affects cold hard-load. |

**Table route eager JS, measured (raw bytes, ~÷3.5 for gzip):**
- Baseline: **59 chunks / 4.63 MB**
- After P0.0+P0.1+P0.3 dynamic boundaries: **63 chunks / 4.63 MB** — *flat.*

**Where the 4.63 MB actually is** (top eager chunks, fingerprinted):
- ~1.65 MB across 4 chunks with **no library signature** = the app's own code (`@teable/sdk`
  + grid stack + shared feature code). **This is the real bulk.**
- prosemirror-model/view (262 KB) and react-markdown/micromark (156 KB) — **transitive**
  deps (no direct app import, not in package.json) that webpack groups into **shared
  vendor chunks reused across 7+ routes**. App-level `dynamic()` can't evict them from the
  table route; only `splitChunks` cacheGroup tuning or removing the transitive dep can.

**What was actually changed (kept — correct best-practice, zero-risk, helps dashboard/plugin
& cold routes even though table-route number is flat):**
- `ComponentPluginRender.tsx` — `Chart` (recharts subtree) → `dynamic()`.
- `GlobalDocSearchPanel.tsx` — `DocSearchPanel` → `dynamic()` (renders only on Cmd+Shift+K).
- `View.tsx` — non-Grid views already `dynamic()` (P0.1).
- `playwright.config.ts` — fixed a real pre-existing TS error that broke `next build`.

**Real remaining wins (larger, structured — not one-liners):**
1. Code-split the **grid + SDK app-code chunks** (the 1.65 MB) — the dominant cost. Needs
   `pnpm bundle-analyze` on the unmarked chunks + route-level splitting of the grid mount.
2. `splitChunks` cacheGroup to isolate prosemirror/markdown so non-doc routes drop them.
3. **Dev mode** is a ~5× penalty + on-demand route compile — the user's live slowness is
   substantially this. Run `pnpm start:local` prod-style for a fair UX baseline.

---

## 🎯 DEFINITIVE ROOT CAUSE (2026-06-15, Turbopack analyzer + per-route manifest)

Measured **every** route's eager initial JS from `build-manifest.json`:

| Route | Eager JS |
|---|---|
| `/_app` shared floor | **0.74 MB** |
| `/404`, `/admin`, `/setting` | 0.27–0.47 MB |
| `/agent/[id]` | 0.51 MB |
| **`/space`** (no grid, no editors) | **4.20 MB** |
| **`/base/[baseId]/[[...slug]]`** (grid is `dynamic`!) | **4.63 MB** |
| `/space/[spaceId]` | 4.40 MB |
| `/developer/tool/query-builder` | 5.65 MB |

The grid (`Table`) is already `dynamic({ssr:false})`, so it is NOT in the 4.63 MB. The
~3.9 MB above the `_app` floor is the **authenticated app-shell**, and it is the SAME bulk on
`/space` — a page that renders no grid and no rich text. So the cost is **not** the grid,
the views, recharts, or the SSR payload. Diffing the chunks common to `/space` ∩ `/base`
(2.98 MB shared) and fingerprinting them shows the eager, on-every-authenticated-page waste:

- **milkdown / prosemirror-model+view ≈ 259 KB** — a prosemirror-based markdown editor
- **react-markdown / micromark ≈ 155 KB**
- → **~414 KB of editor code loaded on pages that never edit anything.**

**Why it can't be tree-shaken (the actual bug):**
`packages/sdk/package.json` has `sideEffects:false` BUT `main: ./dist/index.js`,
`module: undefined`, and `@teable/sdk` is **not** in the app's `transpilePackages`. So the app
consumes the SDK as a **prebuilt CJS bundle** — CJS does not tree-shake. Importing *anything*
from `@teable/sdk` (every page does, via `NotificationProvider`/`SessionProvider`/hooks) drags
the SDK's editor surface — `components/editor/long-text` (milkdown) and
`components/markdown-editor` / `cell-value/CellMarkdown` (react-markdown) — into the eager
bundle. This is why **no app-level change moves the number**: `dynamic()` boundaries,
lazy views, and `optimizePackageImports` (tested — 0 drop, reverted) all operate above a
monolithic non-tree-shakeable dist.

### ✅ FIX LANDED & MEASURED (2026-06-15)

Implemented option 1 below — lazy boundaries inside the SDK so milkdown + react-markdown
ship in async chunks. Measured against baseline with identical flags
(`NEXT_BUILD_ENV_TYPECHECK=false pnpm next build`, per-route `build-manifest.json`):

| Route | Before | After | Drop | prosemirror/markdown eager? |
|---|---|---|---|---|
| `/space` (no grid/editors) | 4.20 MB | **3.81 MB** | **−0.39 MB** | **no** (was yes) |
| `/base/[baseId]/[[...slug]]` | 4.63 MB | **4.24 MB** | **−0.39 MB** | **no** |
| `/space/[spaceId]` | 4.40 MB | **3.85 MB** | **−0.55 MB** | **no** |

Drop applies to **every authenticated route**. Changes (SDK source + dist rebuilt):
- `editor/long-text/MarkdownEditor.tsx` → lazy `Suspense` wrapper; milkdown impl moved to
  `MarkdownEditorImpl.tsx`.
- `editor/long-text/MarkdownReadonly.tsx` → lazy wrapper; react-markdown impl →
  `MarkdownReadonlyInner.tsx`.
- `markdown-editor/MarkDownPreview.tsx` → lazy wrapper; impl → `MarkDownPreviewInner.tsx`.
- `editor/long-text/utils.ts` → removed `@milkdown/core` import; `getEditorMarkdown` extracted
  to new `milkdown-serialize.ts` (this was THE eager leak — `CellValue` imports `stripMarkdown`
  from utils, which was dragging @milkdown/core onto every page).
- `GridMarkdownEditor.tsx` + `ExpandMarkdownEditor.tsx` → import `getEditorMarkdown` from
  `milkdown-serialize`.
- SDK module is `esnext` + `moduleResolution: Bundler`, so the dist preserves dynamic
  `import()` → Turbopack splits it. Verified the wrappers' dist carries `import(`.

⚠️ Build caveat: the normal SDK build (`tsc --build`) is blocked by **2 pre-existing,
unrelated** type errors (`hooks/use-fields.ts:37`, `hooks/use-personal-view.ts:22`) — part of
this branch's known ~270 TS errors. The dist was emitted via `tsc -p tsconfig.build.json
--noEmitOnError false` (type-only errors still emit valid JS). To ship cleanly, fix those 2
errors so `tsc --build` emits. ⚠️ Grid UAT still needed: long-text cell edit, markdown cells,
doc editor (the Suspense fallbacks are `null`).

**Other fix options (for reference):**


1. Lazy-load the milkdown long-text editor + react-markdown renderer inside the SDK
   (`React.lazy`/`next/dynamic` at `cell-value/CellMarkdown` + `editor/long-text`), then rebuild
   the SDK dist. Saves ~414 KB on every authenticated route. **Highest value.**
2. Ship `@teable/sdk` as a tree-shakeable **ESM** build (`module`/`exports` → ESM, preserve
   modules) so the CJS-barrel pull disappears, OR add `@teable/sdk` to `transpilePackages` and
   point at source so Next compiles+tree-shakes it. Broader blast radius (backend consumes SDK
   too) — verify carefully.
3. Either way: also evict prosemirror/markdown via a `splitChunks` cacheGroup as a backstop.

Verification recipe: `NEXT_BUILD_ENV_TYPECHECK=false pnpm next build` then the per-route
manifest script in this repo's task log; target `/space` dropping from 4.20 MB by ~0.41 MB.

---

## ORIGINAL fix plan (hypotheses — see correction above before acting)

### P0.0 — Lazy-load recharts/charts off the table route (~1.4 MB) — HIGHEST VALUE
Confirmed cause: `packages/ui-lib/src/shadcn/index.ts` line 40 `export * from './ui/chart'`
re-exports the recharts-based chart from the barrel, so **every** component importing from
`@teable/ui-lib` / `@teable/ui-lib/shadcn` (i.e. the whole app, incl. the grid) bundles
recharts + d3 (~1.4 MB).

ATTEMPTED (2026-06-15) & REVERTED: removing the barrel line + deep-importing
`@teable/ui-lib/shadcn/ui/chart` in the 4 chart-feature consumers **broke the build** —
`Module not found: styled-jsx/style.js` (the deep import compiles chart.tsx in the app's
context, exposing a transitive resolution gap). Barrel surgery is not the clean path.

RECOMMENDED approach instead:
- Make the **whole chart feature** (`features/app/blocks/chart`) a `dynamic()` boundary so
  recharts lives in an async chunk loaded only when a chart/dashboard renders; OR
- Add a proper package **subpath export** for the chart module in `@teable/ui-lib`
  (`exports['./chart']`) backed by its own build, and import charts from there — so the
  barrel no longer transitively includes recharts but the deep import resolves cleanly.
- Either way also resolve the styled-jsx resolution (transpilePackages / add styled-jsx).
- Separately: the repo ships **two** chart libs (recharts **and** echarts) — consolidate.

### P0.1 — Lazy-load non-Grid view components (biggest win, low risk)
`View.tsx` already routes by `viewType` in `getViewComponent()`. Convert every non-Grid
view to `next/dynamic` (ssr:false) so only the active view's code loads:
```ts
const CalendarView = dynamic(() => import('./calendar/CalendarView').then(m => m.CalendarView), { ssr:false, loading: () => <Spinner/> });
// same for Gantt, Kanban, Gallery, Form, Plugin; keep GridView eager (default path).
```
Removes @fullcalendar, gantt, and kanban/gallery weight from the default grid load.
**Effort: S. Risk: low** (the switch already gates rendering; just defer the import).

### P0.2 — Run the bundle analyzer to target the rest
`cd apps/nextjs-app && pnpm bundle-analyze` (ANALYZE=true prod build). Identify which
chunks the **grid** route still pulls; verify P0.1 removed the view libs; find any other
eager heavyweight (charts, markdown, monaco-like editors, formula engine).

### P0.3 — Lazy-load the AI/chat + charts stacks
- ChatPanel/PluginPanel are already `dynamic()` in `Table.tsx` — verify the AI deps
  (`ai`, `@ai-sdk/react`, `streamdown`, `react-markdown`, `katex`) are actually inside
  that dynamic boundary and not pulled eagerly elsewhere (dashboards, field AI config).
- **Two chart libs**: echarts (~1 MB) + recharts. Pick one; lazy-load it behind the
  dashboard/chart components only.

### P1 — Trim the SSR hydration payload (429 kB)
The table route serializes all tables + all fields (full options/formula/link/AI config) +
all views + group points + permissions into page-data, hydrated on the main thread every
load. Serialize only the **active** table/view; lazy-load the rest client-side.

### P1 — Grid mount cost (~2.5 s warm switch)
Secondary once the bundle shrinks. Cache field-instance construction across switches;
profile the canvas `GridViewBaseInner` mount with readable names (dev build) to target it.

## Verification protocol
After each change: `pnpm build` (prod) → measure `performance.getEntriesByType('resource')`
JS parsed-KB + `navigation.domInteractive` on the table route, and the warm-switch CDP
self-time. Target: cut JS-parsed from 8.4 MB toward ~2–3 MB for the grid-first paint.
