---
phase: 05-gantt-view-milestones
plan: "03"
subsystem: frontend/gantt
tags: [gantt, frontend, react, svg, timeline, milestones, critical-path]
dependency_graph:
  requires: ["05-01", "05-02"]
  provides: ["PHASE05-GANTT-UI-COMPONENT", "PHASE05-GANTT-TIMELINE-BARS", "PHASE05-GANTT-MILESTONES", "PHASE05-GANTT-SIDEBAR", "PHASE05-GANTT-TOOLBAR", "PHASE05-GANTT-DEPENDENCY-ARROWS", "PHASE05-CRITICAL-PATH", "PHASE05-VIEW-REGISTRATION"]
  affects: ["apps/nextjs-app", "packages/icons", "packages/sdk"]
tech_stack:
  added: ["SVG canvas rendering for Gantt timeline", "Kahn topological sort for critical path"]
  patterns: ["GanttProvider/useGanttContext context pattern (mirrors CalendarProvider)", "Absolute positioning for bar layout", "Synchronized sidebar/timeline scroll via ref"]
key_files:
  created:
    - apps/nextjs-app/src/features/app/blocks/view/gantt/type.ts
    - apps/nextjs-app/src/features/app/blocks/view/gantt/util.ts
    - apps/nextjs-app/src/features/app/blocks/view/gantt/context/GanttContext.tsx
    - apps/nextjs-app/src/features/app/blocks/view/gantt/hooks/useGanttRecords.ts
    - apps/nextjs-app/src/features/app/blocks/view/gantt/hooks/useGanttDependencies.ts
    - apps/nextjs-app/src/features/app/blocks/view/gantt/hooks/useCriticalPath.ts
    - apps/nextjs-app/src/features/app/blocks/view/gantt/components/GanttBar.tsx
    - apps/nextjs-app/src/features/app/blocks/view/gantt/components/GanttMilestone.tsx
    - apps/nextjs-app/src/features/app/blocks/view/gantt/components/GanttDependencyArrow.tsx
    - apps/nextjs-app/src/features/app/blocks/view/gantt/components/GanttSidebar.tsx
    - apps/nextjs-app/src/features/app/blocks/view/gantt/components/GanttToolbar.tsx
    - apps/nextjs-app/src/features/app/blocks/view/gantt/GanttViewBase.tsx
    - apps/nextjs-app/src/features/app/blocks/view/gantt/GanttView.tsx
    - packages/icons/src/components/GanttChart.tsx
    - packages/sdk/src/model/view/gantt.view.ts
  modified:
    - packages/icons/src/index.ts
    - packages/sdk/src/model/view/factory.ts
    - packages/sdk/src/model/view/index.ts
    - apps/nextjs-app/src/features/app/blocks/view/View.tsx
    - apps/nextjs-app/src/features/app/blocks/table/table-header/AddView.tsx
    - apps/nextjs-app/src/features/app/blocks/view/constant.ts
decisions:
  - "Used absolute CSS positioning (not SVG foreignObject) for bars — matches plan spec and avoids mixed SVG/HTML complexity"
  - "Created GanttView SDK model (gantt.view.ts) and wired factory — required for ViewType.Gantt not to throw assertNever"
  - "GanttDependencyArrow uses record IDs only as React keys and numeric coordinates — never innerHTML (T-05-10 mitigated)"
  - "useGanttDependencies filters parsed record IDs against validRecordIds Set — only IDs in current record set render arrows (T-05-07 mitigated)"
metrics:
  duration: "~25 minutes"
  completed: "2026-05-20"
  tasks: 4
  files: 19
---

# Phase 05 Plan 03: Gantt Frontend UI Summary

Full Gantt view frontend with timeline bars, milestone diamonds, dependency arrows, critical path highlighting, synchronized sidebar, and toolbar. Registered in the table router and view type picker.

## File Tree

```
apps/nextjs-app/src/features/app/blocks/view/gantt/
├── GanttView.tsx                    — top-level entry (RecordProvider + hooks + GanttProvider + toolbar + base)
├── GanttViewBase.tsx                — core render (sidebar + scrollable timeline header + canvas)
├── type.ts                          — GanttBarItem, GanttDependency interfaces
├── util.ts                          — dateToPixel, pixelToDate, barWidth, dependencyPath, generateTimelineColumns, formatColumnLabel
├── context/
│   └── GanttContext.tsx             — GanttProvider + useGanttContext hook
├── hooks/
│   ├── useGanttRecords.ts           — maps records to GanttBarItem via startField/endField
│   ├── useGanttDependencies.ts      — parses linked-record or text dependency field
│   └── useCriticalPath.ts           — Kahn topological sort + longest-path backtrack
└── components/
    ├── GanttBar.tsx                 — absolutely positioned bar with critical path + color
    ├── GanttMilestone.tsx           — rotated square diamond for zero-duration records
    ├── GanttDependencyArrow.tsx     — SVG cubic bezier paths with arrowhead marker
    ├── GanttSidebar.tsx             — fixed-width left sidebar synchronized with timeline scroll
    └── GanttToolbar.tsx             — Day/Week/Month/Quarter scale, Today, Weekends, Critical Path toggles

packages/icons/src/components/GanttChart.tsx  — SVG icon (horizontal bar chart rows)
packages/sdk/src/model/view/gantt.view.ts     — GanttView SDK model with updateOption
```

## CalendarView Patterns Reused vs Custom

| Pattern | Source | Usage |
|---------|--------|-------|
| Provider + Context split | CalendarContext.ts + CalendarProvider.tsx | Merged into single GanttContext.tsx for simplicity |
| `useView() as XView` cast | CalendarProvider.tsx | GanttView.tsx casts useView() as GanttViewModel |
| `RecordProvider` wrapper | CalendarView.tsx | GanttView.tsx wraps RecordProvider |
| `useIsHydrated` guard | CalendarView.tsx | GanttViewInner returns null until hydrated |
| `useRecords` + `useFields` hooks | CalendarEventList.tsx | useGanttRecords uses both |

Custom-built (no calendar equivalent):
- Timeline canvas with absolute positioning (calendar uses a calendar grid)
- SVG dependency arrows with cubic bezier paths
- Kahn topological sort for critical path
- Synchronized scroll between sidebar and timeline
- Column header generation (day/week/month/quarter labels)

## Build Confirmation

- `pnpm typecheck --filter @teable/nextjs-app` — 0 errors
- `pnpm typecheck --filter @teable/sdk` — 0 errors
- All 4 plan verification checks pass

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical Functionality] Created GanttView SDK model + wired factory**
- **Found during:** Task 2b
- **Issue:** `packages/sdk/src/model/view/factory.ts` calls `assertNever(view.type)` as the default case. Without a `ViewType.Gantt` case, loading any table that has a Gantt view would throw a runtime exception.
- **Fix:** Created `packages/sdk/src/model/view/gantt.view.ts` (GanttView class extending GanttViewCore + View), added import + case to factory.ts, exported from index.ts.
- **Files modified:** `packages/sdk/src/model/view/gantt.view.ts` (new), `packages/sdk/src/model/view/factory.ts`, `packages/sdk/src/model/view/index.ts`
- **Commit:** 97c856a

**Note:** This SUMMARY.md was originally created at commit 5ec8787 and accidentally deleted by commit c41d80a (05-04 agent). Recreated from git history at HEAD ed147e21.

## Known Stubs

None — all data flows from real SDK hooks (`useRecords`, `useFields`, `useView`). The `t('view.category.gantt')` i18n key will fall back to the key string if not yet added to translation files, but this does not prevent the view from functioning.

## Threat Flags

No new security-relevant surface beyond what was declared in the plan threat model.

## Self-Check: PASSED

- [x] `apps/nextjs-app/src/features/app/blocks/view/gantt/GanttView.tsx` exists
- [x] `apps/nextjs-app/src/features/app/blocks/view/gantt/GanttViewBase.tsx` exists
- [x] `apps/nextjs-app/src/features/app/blocks/view/gantt/util.ts` — contains `dateToPixel`
- [x] `apps/nextjs-app/src/features/app/blocks/view/gantt/hooks/useCriticalPath.ts` — contains `useCriticalPath`
- [x] `packages/icons/src/index.ts` — contains `GanttChart`
- [x] `apps/nextjs-app/src/features/app/blocks/view/View.tsx` — contains `ViewType.Gantt`
- [x] `apps/nextjs-app/src/features/app/blocks/table/table-header/AddView.tsx` — contains `ViewType.Gantt`
- [x] `apps/nextjs-app/src/features/app/blocks/view/constant.ts` — contains `ViewType.Gantt`
- [x] Commits: 61b8fb2, ad890f4, 97c856a, 65d0546
