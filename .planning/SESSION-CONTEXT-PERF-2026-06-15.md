# Session context — performance work (2026-06-15)

Handoff / context dump for the table-load performance effort. Branch:
`refactor/architecture-deep-fix`.

---

## 1. The question that drove this

> "Why is the app still way too slow? Users need data displayed in less than 1 s."

## 2. The answer (measured, not guessed)

The slowness is **dev mode**, not the server, not the data, not (mostly) the bundle.

| Signal | Dev (`pnpm start:local`) | Prod (`next start`) |
|---|---|---|
| TTFB (server) | 152 ms | 132–336 ms |
| REST API calls | <31 ms | **8–15 ms median** |
| JS transferred | **5.9 MB** | **2.1 MB** |
| JS decoded/parsed | **42.6 MB** | **7 MB** |
| Full load (contended box) | ~20 s | varies (see caveat) |
| First Contentful Paint | — | **540 ms** (when machine idle) |
| domInteractive | 947 ms | **497 ms** |

**Conclusions:**
- Server + REST data are already **instant** (<150 ms / <15 ms). Nothing to fix there.
- Dev ships **~6× more JS** (unminified + HMR) and **recompiles each route on first
  visit** → that is the ~20 s the user feels.
- The `<1 s` target is met at the data layer today; the lever is **running production**.
- Client FCP could **not** be cleanly measured on the dev machine: the *identical* prod
  build measured FCP anywhere from **540 ms to 15 s** — the fingerprint of **machine
  contention** (heavy NestJS backend + Next server + Chromium + builds all at once), not a
  code problem (a code problem would be consistent). Validate on a clean machine / real
  deploy.

## 3. The bundle root cause (and the fix that shipped)

Per-route eager JS, measured from `.next/build-manifest.json`:
- `/_app` shared floor: 0.74 MB
- `/space` (no grid, no editors): **4.20 MB**
- `/base/[baseId]/[[...slug]]` (grid is already `dynamic`): **4.63 MB**

`/space` carrying ~3.9 MB despite having no grid pointed at a **shared shell** cost.
Diffing `/space ∩ /base` chunks surfaced ~414 KB of editor code loaded on **every**
authenticated page even when nothing is edited:
- milkdown / prosemirror ≈ 259 KB
- react-markdown / micromark ≈ 155 KB

**Root cause:** `@teable/sdk` is consumed as a prebuilt **CJS dist** (`main: ./dist/index.js`,
`module: undefined`, not in `transpilePackages`). The decisive leak was
`components/editor/long-text/utils.ts` importing `@milkdown/core` for one function
(`getEditorMarkdown`); `CellValue` (the universal cell renderer, eager everywhere) imports
the lightweight `stripMarkdown` from that same file → dragged milkdown onto every page.
This is why app-level `dynamic()`, lazy views, the recharts split, and
`optimizePackageImports` all measured **0 drop** — they sit above a real import chain.

**Fix (committed):** extract `getEditorMarkdown` into `milkdown-serialize.ts` (utils now
milkdown-free) + `React.lazy`/`Suspense` wrappers for the 3 heavy editors. The SDK dist is
`module: esnext` + `moduleResolution: Bundler`, so it preserves dynamic `import()` and
Turbopack splits it.

**Measured drop (prod build, same methodology):**
| Route | Before | After | Drop |
|---|---|---|---|
| `/space` | 4.20 MB | 3.81 MB | −0.39 MB |
| `/base/[baseId]/[[...slug]]` | 4.63 MB | 4.24 MB | −0.39 MB |
| `/space/[spaceId]` | 4.40 MB | 3.85 MB | −0.55 MB |

milkdown/prosemirror + react-markdown are no longer eager on any of them.

## 4. What was NOT the problem (disproven by measurement)

- **recharts (~1.4 MB)** — NOT eager on the table route in a real prod build (tree-shaken;
  plugin/chart path already dynamic). The original plan's central hypothesis was wrong.
- **SSR payload (429 KB)** — `getViewPageServerData` already fetches only the single active
  table. Nothing to trim.
- **The grid** — `Table` is already `dynamic({ssr:false})`; it is not in the eager set.
- After the editor split, `/space` has **zero** heavy libs eager; the table route only has
  `codemirror` (formula editor, ~150 KB) + `sharedb` (collab, required) left. The remaining
  ~1.65 MB is unmarked SDK/grid/app-core code that the shell genuinely loads (it already
  tree-shakes per-file; it is not dead code).

## 5. Commits (branch `refactor/architecture-deep-fix`)

```
6ff6a7205  docs: performance fix plan + measured root cause (SDK CJS editor bloat)
db7fcea89  feat(scripts): add production local launch mode (pnpm start:prod:local)
6b18fb325  fix(app): playwright webServer type — unblocks next build
96f3ce96f  perf(app): lazy-load chart, doc-search panel, non-grid views
8a3a5aa0d  perf(sdk): code-split markdown/milkdown editors out of eager bundle
48f708170  fix(sdk): resolve two pre-existing type errors blocking next build
```
Not pushed. All passed the lint-staged pre-commit hook.

### Files touched
- **SDK split:** `editor/long-text/{MarkdownEditor,MarkdownEditorImpl,MarkdownReadonly,
  MarkdownReadonlyInner,milkdown-serialize,utils,ExpandMarkdownEditor}.tsx|ts`,
  `markdown-editor/{MarkDownPreview,MarkDownPreviewInner}.tsx`,
  `grid-enhancements/editor/GridMarkdownEditor.tsx`
- **SDK build unblock:** `hooks/use-fields.ts` (typed `.hidden` read),
  `utils/personalView.ts` (added `GanttView` to the param union)
- **App:** `components/plugin/ComponentPluginRender.tsx`,
  `blocks/doc-search/GlobalDocSearchPanel.tsx`, `blocks/view/View.tsx`,
  `playwright.config.ts`
- **Tooling:** `scripts/launch-local.sh` (`--prod`), `package.json` (`start:prod:local`)

## 6. New tool: `pnpm start:prod:local`

Builds + serves the **production** frontend (instead of dev) reusing all backend stability
logic. One-time ~30–60 s build, then `next start`. Use it to experience/ship the fast path.

**Caveat (documented in the script):** `next start` + baked rewrites do **not** proxy the
realtime WebSocket (`/socket` → :3001), so live grid sync degrades in local-prod mode. A
real deployment puts a WS-capable reverse proxy (nginx/Caddy/traefik) in front, where
realtime works normally. For full local functionality incl. realtime, use plain dev mode.

## 7. Verification status

- ✅ SDK builds clean via normal `tsc --build` (exit 0) after the 2 type fixes.
- ✅ App prod build compiles; dist preserves dynamic `import()`; `utils.js` milkdown-free.
- ✅ Table/grid loads with no console errors on the live page; bundle drop measured.
- ⚠️ **Interactive grid UAT not automated** — Teable's grid is a `<canvas>` needing trusted
  OS events; synthetic pointer/keyboard can't open the cell editor. Manual check pending:
  open Projects table → double-click a long-text (Description) cell → confirm the markdown
  editor appears and saves; check markdown cells + the doc editor. Suspense fallbacks are
  `null`, so worst case is a brief blank before the chunk loads.

## 8. Path to <1 s (priority order)

1. **Run production** (`pnpm start:prod:local` or container) — the single biggest lever
   (~20 s → sub-second). Operational, not a code change.
2. **Chunk caching** (automatic in prod) — warm loads and table-to-table nav near-instant.
3. **SDK ESM packaging** — the 1.65 MB SDK/app-core is real eager code; shipping the SDK as
   tree-shakeable ESM (keep CJS for the backend, which also consumes it) would let more of
   it shake. Own PR + backend regression testing.
4. **SSR the first grid rows** (biggest lift) — data visible before hydration = perceived
   <1 s even cold.

## 9. Related docs / memory

- `.planning/PERF-FIX-PLAN-2026-06-15.md` — detailed fix plan + the "DEFINITIVE ROOT CAUSE"
  and "FIX LANDED & MEASURED" sections.
- Memory: `project_perf_sdk_cjs_editor_bloat.md`, `project_perf_table_switch.md`.
