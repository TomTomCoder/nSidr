# Phase 23 — Option-A Maintenance Sprint (execution)

_Started 2026-06-13. The spike (DECISION.md) chose Option A: stay on shadcn/ui + Radix, invest
in maintenance. The DECISION lists 6 work items it explicitly defers to "future phases or
sub-tasks". This file tracks executing them._

## Status by work item

| # | Item | Effort | Status | Notes |
|---|------|--------|--------|-------|
| P1 | Remove dead Storybook | S | ✅ DONE | Only 1 `.mdx` story, v6 CLI scripts vs v8 deps (broken), not in CI. Removed `.storybook/`, `src/_stories/`, 3 scripts, 9 `@storybook/*` + `@mdx-js/react` + `sirv`/`sirv-cli` devDeps from `ui-lib/package.json`. |
| P1 | Bump `lucide-react` | S | ✅ DONE (conservative) | `0.363.0 → 0.400.0` in `sdk`, `ui-lib`, `nextjs-app`. Chose 0.400.0 (lowest meeting the "0.400+" bar) to minimize icon-rename risk across 122 import sites; lucide keeps deprecated aliases. Verified via typecheck. |
| P2 | Formalize design token layer | M | ✅ ALREADY EXISTS | `packages/ui-lib/src/shadcn/global.shadcn.css` already has a complete semantic CSS-custom-property token system (`:root` + `.dark`: background/foreground/muted/popover/card/border/primary/secondary/accent/destructive/ring/radius/warning/success/surface). The item is effectively satisfied; no library change needed. |
| P2 | Consolidate `@teable/icons` vs `lucide-react` | S (audit) | ✅ AUDIT DONE → migration NOT recommended as a codemod | **Finding:** `@teable/icons` is **Figma-sourced** (`scripts/generate.mjs` uses `figma-js` + `@svgr/core`), not a lucide mirror — so it is NOT visually guaranteed-equivalent to lucide. Coverage gap: **68 of 110** distinct lucide icons in use are **absent** from `@teable/icons` (256 components). Consolidating lucide→@teable/icons would require adding 68 icons through the Figma pipeline (needs a FIGMA token) **and** per-icon visual review. **Recommendation: keep both sources for now**; only consolidate opportunistically when the Figma set is extended. Not a safe mechanical migration. |
| P1 | Upgrade `@radix-ui/*` to latest | M | ✅ DONE | **Re-assessed: all bumps are same-major minors** (Radix 1.0→1.1 was non-breaking; nothing crossed a major). Bumped 24 primitives in `ui-lib` + 5 in `sdk` to latest. Verified: `ui-lib` typecheck **0** + build **0**; `sdk` only pre-existing non-Radix errors; **runtime browser smoke** — `dropdown-menu`, `separator`, `dialog`, `popover` (1.0.7→1.1.16), and `select` (2.0.0→2.3.0) all render and open correctly (filter popover + operator listbox verified), 0 console errors. |
| P3 | Evaluate Tailwind 4 | L | ⏸️ DEFERRED | DECISION says "don't block on it". Out of scope for this sprint. |

## Staged plan for the risky items (not executed this session)

### Radix upgrade — ✅ COMPLETE (see table above)
The DECISION doc assumed a breaking "2.x major" upgrade. On inspection that was wrong: every
primitive's latest is the **same major** as what was installed (Radix shipped 1.1.x as a
non-breaking minor over 1.0.x). So the bump was low-risk and is done + verified, not staged.

### Icon consolidation — ✅ AUDITED, migration deferred with rationale (see table)

### Tailwind 4 (deferred)
Spike on a throwaway branch only when Radix + icons are settled.

## Verification done this session
- Storybook removal + lucide bump: `pnpm install` clean, `@teable/ui-lib` typecheck/build green
  (see sprint commit). No `@storybook` references remain outside the shared eslint config.
