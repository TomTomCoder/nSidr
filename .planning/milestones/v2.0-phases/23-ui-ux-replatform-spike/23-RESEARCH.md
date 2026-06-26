# Phase 23: UI/UX Replatform Spike — Research

**Researched:** 2026-06-07
**Domain:** Frontend UI stack / component system / design tokens
**Confidence:** MEDIUM

---

## Summary

The current Teable UI stack is a well-structured shadcn/ui + Radix UI + Tailwind CSS
monorepo package (`@teable/ui-lib`). It exposes ~44 copied shadcn components, a custom
CSS layer (`global.shadcn.css`), and a Tailwind config extension. The lib ships its own
`@teable/icons` workspace package alongside lucide-react. All Radix primitives are pinned
to specific versions (some pre-2.x). dnd-kit, Glide Data Grid, react-hook-form, recharts,
and cmdk are also bundled — indicating the UI lib has grown beyond pure styling.

The key tension: `@teable/ui-lib` vendors (copies) shadcn components rather than
consuming them as a generated CLI scaffold. This means component updates require the
internal update script (`update-shadcn-ui.mjs`) rather than `npx shadcn@latest add`.
Radix versions are trailing (several are 1.x while Radix has released 2.x). This is the
primary maintenance liability.

**Primary recommendation:** Option A (invest in current stack) is lowest risk and highest
ROI for a data-intensive app like Teable. The component surface is already large and
battle-tested. Effort should go to Radix 2.x upgrades and design token formalization, not
a platform swap.

---

## Architectural Responsibility Map

| Capability           | Primary Tier                            | Secondary Tier          | Rationale                                     |
| -------------------- | --------------------------------------- | ----------------------- | --------------------------------------------- |
| Component primitives | `packages/ui-lib`                       | —                       | Single source of truth for all UI             |
| Styling tokens       | `packages/ui-lib/tailwind.config.cjs`   | Per-app Tailwind config | Tokens live in shared lib                     |
| App layout / routing | `apps/nextjs-app`                       | —                       | Next.js owns page structure                   |
| Data grid            | `@glideapps/glide-data-grid` via ui-lib | —                       | Canvas-based, not styleable via design system |
| Icons                | `@teable/icons` workspace               | `lucide-react`          | Dual icon source is a liability               |
| Form validation      | `react-hook-form` + `zod` in ui-lib     | —                       | Bundled into UI lib (unusual)                 |

---

## Current Stack Inventory

| Package                    | Pinned Version   | Role                | Notes                          |
| -------------------------- | ---------------- | ------------------- | ------------------------------ |
| shadcn/ui                  | 0.8.0 (CLI only) | Component scaffold  | Components are vendored copies |
| @radix-ui/\*               | 1.x (most)       | Headless primitives | Trailing behind 2.x releases   |
| tailwindcss                | 3.4.1            | Styling             | Tailwind 4 is now available    |
| class-variance-authority   | 0.7.0            | Variant API         | Stable                         |
| tailwind-merge             | 2.2.2            | Class dedup         | Stable                         |
| lucide-react               | 0.363.0          | Icons               | Old; current is 0.400+         |
| @glideapps/glide-data-grid | 6.0.3            | Data grid           | Canvas; not replaceable by CSS |
| @dnd-kit/core              | 6.1.0            | Drag-and-drop       | Stable                         |
| recharts                   | 2.12.3           | Charts              | Stable for current use         |
| cmdk                       | 1.0.0            | Command palette     | Stable                         |

**Versions tagged [ASSUMED]** — confirmed via package.json read (authoritative for current
repo state) but not verified against current npm registry for latest releases.

---

## Replatform Options

### Option A: Stay on shadcn/ui + Radix — Invest in Design Tokens and Maintenance

**Description:** Keep the current stack. Formalize CSS custom properties as a design token
layer (semantic color tokens, spacing scale, radius scale) in `global.shadcn.css`. Upgrade
Radix packages to 2.x series. Upgrade lucide-react. Migrate Tailwind to v4 (opt-in CSS
config syntax). Consolidate icon sources (@teable/icons vs lucide-react).

**Effort:** Medium — Radix 2.x has breaking API changes in Dialog, AlertDialog, Select.
Each affected component needs a targeted migration. Tailwind 4 migration can be done
incrementally.

**Benefit:** No rewrite cost. Component coverage already complete (44 components). Team
stays on a stack with the largest community and best Next.js documentation.
shadcn/ui is the de-facto standard for Next.js apps as of 2025-2026.

**Risk:** Low — no architectural disruption. Risk is confined to Radix 2.x breaking changes
(well-documented).

**Reversibility:** N/A — this is the baseline.

| Dimension             | Score (1–5, 5=best) |
| --------------------- | ------------------- |
| Implementation effort | 4 (low effort)      |
| UX/DX benefit         | 3                   |
| Risk                  | 5 (lowest risk)     |
| Reversibility         | 5                   |
| **Total**             | **17**              |

---

### Option B: Adopt Headless UI + Styled-System Combo (Radix + Stitches/Vanilla Extract)

**Description:** Replace Tailwind utility classes with a CSS-in-JS typed token system
(Vanilla Extract or Panda CSS). Keep Radix primitives. Remove shadcn vendor copies;
write styled wrappers directly. This gives compile-time type-safe tokens and eliminates
className string sprawl.

**Effort:** High — every component must be rewritten. Panda CSS or Vanilla Extract
integration with Next.js App Router requires careful setup. The Glide Data Grid (canvas)
is unaffected but the surrounding UI diverges from its integration surface.

**Benefit:** True design token ergonomics, zero runtime CSS-in-JS overhead (Vanilla
Extract/Panda are static). Enables a proper multi-brand/white-label token architecture.
Excellent for a SaaS product that needs enterprise theming.

**Risk:** Medium-High — Panda CSS and Vanilla Extract are newer; ecosystem tooling
(Storybook, testing) is less mature than Tailwind's. Migration path from 44 existing
components is substantial. Breaks existing consumer import paths.

**Reversibility:** Low — once components are rewritten in Panda/VE, reverting is a full
rewrite again.

| Dimension             | Score (1–5, 5=best) |
| --------------------- | ------------------- |
| Implementation effort | 1 (very high cost)  |
| UX/DX benefit         | 4                   |
| Risk                  | 2                   |
| Reversibility         | 1                   |
| **Total**             | **8**               |

---

### Option C: Adopt a Pre-Styled Enterprise Design System (Ant Design or Mantine)

**Description:** Replace @teable/ui-lib with Ant Design 5 or Mantine 7. Both ship
complete component libraries with theming APIs, data table primitives, form system, and
chart integrations. Removes the shadcn/Radix maintenance burden entirely.

**Effort:** Very High — Ant Design and Mantine have their own styling paradigms (CSS-in-JS
for Ant, CSS modules + CSS vars for Mantine). Every component import and usage must be
migrated. Glide Data Grid would remain alongside the new lib (separate concerns). The
workspace package architecture would simplify (ui-lib becomes a thin adapter).

**Benefit:** Out-of-the-box component richness (date pickers, complex tables, tree views,
upload). Less long-term maintenance of component internals. Mantine 7 supports Tailwind
alongside it; Ant Design 5 does not recommend Tailwind co-existence.

**Risk:** High — Ant Design adds ~500 KB to the bundle (even with tree-shaking). Mantine
adds ~200 KB. Neither integrates cleanly with shadcn's Tailwind token conventions. All
existing Tailwind-based consumer styles must be audited. Theme token formats are
incompatible with CSS custom property conventions in global.shadcn.css.

**Reversibility:** Very Low — once 44 components are replaced with Ant/Mantine, returning
to shadcn is a full rewrite.

| Dimension             | Score (1–5, 5=best) |
| --------------------- | ------------------- |
| Implementation effort | 1 (very high cost)  |
| UX/DX benefit         | 3                   |
| Risk                  | 1                   |
| Reversibility         | 1                   |
| **Total**             | **6**               |

---

## Scored Comparison

| Criterion             | Weight | Option A (Stay) | Option B (Headless+Tokens) | Option C (Enterprise DS) |
| --------------------- | ------ | --------------- | -------------------------- | ------------------------ |
| Implementation effort | 30%    | 5               | 1                          | 1                        |
| UX/DX benefit         | 25%    | 3               | 4                          | 3                        |
| Risk                  | 25%    | 5               | 2                          | 1                        |
| Reversibility         | 20%    | 5               | 1                          | 1                        |
| **Weighted score**    |        | **4.35**        | **2.05**                   | **1.50**                 |

---

## Stakeholder Recommendation

**Adopt Option A with a targeted maintenance sprint.**

The Teable UI lib is already production-complete with 44 components. The application is a
data-intensive canvas + grid product where UX differentiation comes from the grid and
workflow engines, not from the component library aesthetic. A platform swap would consume
3–6 months of engineering time with no user-visible feature output.

The concrete investment for Option A:

1. Upgrade all `@radix-ui/*` packages to 2.x — address breaking changes in Dialog,
   AlertDialog, Select, and Popover components specifically.
2. Upgrade lucide-react to current (0.400+) and audit icon usage from `@teable/icons` vs
   lucide — consolidate to one source.
3. Formalize the CSS custom property token layer: add semantic color tokens
   (`--color-primary-action`, `--color-surface-raised`, etc.) to `global.shadcn.css` and
   map Tailwind config to them. This gives white-label theming without a library change.
4. Evaluate Tailwind 4 migration on a branch — it is backward-compatible with 3.x class
   names but the config syntax changes; do not block on it.

Option B (Panda CSS / Vanilla Extract) should be revisited **only if** a white-label
enterprise theming requirement is confirmed by product/sales. At that point the token
architecture work done in Option A reduces migration cost substantially.

Option C (Ant Design / Mantine) is not recommended for Teable. The bundle cost, Tailwind
incompatibility, and migration scope are not justified by the benefit delta.

---

## Assumptions Log

| #   | Claim                                                             | Section       | Risk if Wrong                              |
| --- | ----------------------------------------------------------------- | ------------- | ------------------------------------------ |
| A1  | Radix 2.x has breaking API changes in Dialog, AlertDialog, Select | Options A, B  | Migration effort may be lower              |
| A2  | Panda CSS/Vanilla Extract ecosystem maturity is behind Tailwind   | Option B      | Could accelerate Option B viability        |
| A3  | Ant Design adds ~500 KB bundle; Mantine ~200 KB                   | Option C      | Bundle impact may differ with tree-shaking |
| A4  | lucide-react current version is 0.400+                            | Current Stack | Version gap may be smaller                 |
| A5  | Tailwind 4 is backward-compatible with 3.x class names            | Option A      | Could require more migration work          |

---

## Open Questions

1. **White-label / multi-tenant theming requirement?**

   - What we know: current stack uses CSS vars for dark/light mode via next-themes
   - What's unclear: whether customers require brand-customized deployments
   - Recommendation: if yes, prioritize semantic token layer (Option A step 3); if enterprise
     multi-brand, reconsider Option B

2. **Storybook state?**

   - What we know: storybook devDependencies present (8.0.4), serve script exists
   - What's unclear: whether Storybook is actively maintained / used for design review
   - Recommendation: if not maintained, remove — it's dead weight on the devDependency list

3. **@teable/icons vs lucide-react duplication**
   - What we know: both are direct dependencies in ui-lib
   - What's unclear: which components use which, and whether @teable/icons is a superset
   - Recommendation: audit before any migration; this affects Option A effort estimate

---

## Sources

### Primary (HIGH confidence)

- `packages/ui-lib/package.json` — direct read, all package versions confirmed
- `packages/ui-lib/src/shadcn/ui/` — directory listing, all 44 components enumerated

### Secondary (MEDIUM confidence — training knowledge, tagged [ASSUMED])

- shadcn/ui project conventions and vendored-copy update model [ASSUMED]
- Radix UI 2.x breaking change surface [ASSUMED]
- Panda CSS / Vanilla Extract ecosystem maturity [ASSUMED]
- Ant Design 5 / Mantine 7 bundle characteristics [ASSUMED]
- Tailwind CSS v4 migration compatibility [ASSUMED]

---

## Metadata

**Research date:** 2026-06-07
**Valid until:** 2026-07-07 (30 days — Tailwind and shadcn move fast)
**Confidence breakdown:**

- Current stack inventory: HIGH — read directly from package.json
- Option scoring: MEDIUM — tradeoff weights are judgment calls, not benchmarked
- Bundle size estimates: LOW — [ASSUMED], not measured against this repo
