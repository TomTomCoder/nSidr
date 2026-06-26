# Phase 23 — UI/UX Replatform Spike: Decision Record

**Date:** 2026-06-07
**Phase:** 23 — UI/UX Replatform Spike
**Status:** DECIDED
**Author:** GSD autonomous build run

---

## Decision

**Adopt Option A: Stay on shadcn/ui + Radix UI — invest in design tokens and dependency maintenance.**

No UI library migration. A targeted maintenance sprint on the current stack delivers the highest ROI.

---

## Context

The Teable frontend uses a vetted, production-complete component library (`@teable/ui-lib`) with
44 vendored shadcn/ui components, Radix UI headless primitives, and Tailwind CSS. The library is
shared across the monorepo.

Three options were evaluated against an evidence-based research spike (see `23-RESEARCH.md`).

---

## Options Evaluated

|                    | Option A: Stay + Invest                                                     | Option B: Headless + Tokens                                         | Option C: Enterprise DS                       |
| ------------------ | --------------------------------------------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------- |
| **Description**    | Radix 2.x upgrades, design token layer, icon consolidation, Tailwind 4 eval | Replace Tailwind with Panda CSS/Vanilla Extract; typed token system | Replace ui-lib with Ant Design 5 or Mantine 7 |
| **Effort**         | Medium                                                                      | Very High                                                           | Very High                                     |
| **UX/DX benefit**  | Medium                                                                      | High                                                                | Medium                                        |
| **Risk**           | Low                                                                         | Medium-High                                                         | High                                          |
| **Reversibility**  | N/A (baseline)                                                              | Low                                                                 | Very Low                                      |
| **Weighted score** | **4.35 / 5**                                                                | 2.05 / 5                                                            | 1.50 / 5                                      |

### Scoring weights

| Dimension             | Weight | Rationale                                      |
| --------------------- | ------ | ---------------------------------------------- |
| Implementation effort | 30%    | Engineering capacity is the binding constraint |
| UX/DX benefit         | 25%    | Value to users and developers                  |
| Risk                  | 25%    | Disruption to existing features and consumers  |
| Reversibility         | 20%    | Ability to course-correct                      |

---

## Rationale for Option A

1. **Component coverage is complete.** 44 shadcn/ui components cover every UI pattern in the
   current product. There is no component gap that warrants a library change.

2. **The app differentiates on data, not aesthetics.** Teable is a canvas + grid product.
   UX differentiation comes from the spreadsheet engine, automation, and AI layers — not from
   the component library design.

3. **Options B and C are 3–6 month investments with no user-visible output.** The migration
   cost for either alternative would consume capacity that is better spent on product features.

4. **Option A's known maintenance items are bounded and well-documented:**
   - Radix 2.x breaking changes are confined to Dialog, AlertDialog, Select, Popover.
   - lucide-react upgrade is a single import map update.
   - Design token formalization follows a clear CSS custom property pattern already in use.

---

## Concrete Work Items (Option A)

These are the outputs of this spike. They are NOT Phase 23 execution tasks — they feed the
backlog as future phases or sub-tasks.

| Priority | Item                                                                    | Effort | Why                                                       |
| -------- | ----------------------------------------------------------------------- | ------ | --------------------------------------------------------- |
| P1       | Upgrade `@radix-ui/*` to 2.x across ui-lib                              | M      | Trailing versions accumulate breaking changes             |
| P1       | Upgrade `lucide-react` to 0.400+                                        | S      | 0.363.0 is significantly behind; new icons needed         |
| P2       | Formalize CSS custom property design token layer in `global.shadcn.css` | M      | Enables white-label theming without library change        |
| P2       | Audit `@teable/icons` vs `lucide-react` — consolidate to one source     | S      | Dual icon sources create import confusion                 |
| P3       | Evaluate Tailwind 4 migration on a branch                               | L      | Tailwind 4 has a new CSS config syntax; don't block on it |
| P3       | Audit whether Storybook (8.0.4 devDep) is actively maintained           | S      | Remove if unused — dead weight on devDependency list      |

Size legend: S = <1 day, M = 1–3 days, L = 3–7 days.

---

## Conditions to Revisit

**Option B (Panda CSS / Vanilla Extract) should be reconsidered if:**

- Product / sales confirms a white-label multi-tenant enterprise theming requirement.
- The semantic token work done in Option A (P2) reduces the migration cost substantially.

**Option C (Ant Design / Mantine) is not recommended under any near-term condition.**
Bundle overhead (~200–500 KB), Tailwind incompatibility, and migration scope make it
unsuitable for this product profile.

---

## Stakeholder Sign-Off Recommendation

> **Recommend approval of Option A.** Present this document to the tech lead or product owner
> for sign-off before scheduling the P1 maintenance items. The P2/P3 items can be scheduled
> independently in a future sprint without blocking current feature work.
>
> **Gate:** Before scheduling P1, confirm whether a white-label theming requirement exists.
> If yes, the P2 token layer becomes P1 priority and unlocks Option B evaluation.

---

## Open Questions (to resolve at sign-off)

1. **White-label / multi-tenant theming?** If yes, prioritize the semantic token layer (P2 item).
2. **Is Storybook actively used?** If not, remove it — simplifies devDependency footprint.
3. **@teable/icons ownership** — is it generated or manually maintained? This determines
   the icon consolidation strategy.

---

## References

- Research: `.planning/phases/23-ui-ux-replatform-spike/23-RESEARCH.md`
- Current ui-lib inventory: `packages/ui-lib/package.json`, `packages/ui-lib/src/shadcn/ui/`
