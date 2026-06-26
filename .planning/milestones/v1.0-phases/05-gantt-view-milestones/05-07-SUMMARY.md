---
phase: 05-gantt-view-milestones
plan: "07"
subsystem: frontend-view-routing
tags: [gantt, view-registration, icons, i18n, routing]
dependency_graph:
  requires: ["05-05"]
  provides: [gantt-view-routing, gantt-icon, gantt-add-view-picker]
  affects: [View.tsx, constant.ts, AddView.tsx, icons-package]
tech_stack:
  added: []
  patterns: [view-switch-routing, icon-component, i18n-locale-keys]
key_files:
  created:
    - packages/icons/src/components/GanttChart.tsx
  modified:
    - packages/icons/src/index.ts
    - apps/nextjs-app/src/features/app/blocks/view/View.tsx
    - apps/nextjs-app/src/features/app/blocks/view/constant.ts
    - apps/nextjs-app/src/features/app/blocks/table/table-header/AddView.tsx
    - packages/sdk/src/components/view/constant.ts
    - packages/common-i18n/src/locales/en/table.json
    - packages/common-i18n/src/locales/de/table.json
    - packages/common-i18n/src/locales/es/table.json
    - packages/common-i18n/src/locales/fr/table.json
    - packages/common-i18n/src/locales/it/table.json
    - packages/common-i18n/src/locales/ja/table.json
    - packages/common-i18n/src/locales/ru/table.json
    - packages/common-i18n/src/locales/tr/table.json
    - packages/common-i18n/src/locales/uk/table.json
    - packages/common-i18n/src/locales/zh/table.json
decisions:
  - "GanttChart icon uses filled rects (fill=currentColor) rather than stroked paths to match bar-chart visual style"
  - "view.category.gantt i18n key added to all 10 locale files as 'Gantt view' (localization-ready)"
  - "Gantt entry placed after Calendar in AddView.tsx viewInfoList (chronological grouping)"
metrics:
  duration: "~15 minutes"
  completed_date: "2026-05-20"
  tasks_completed: 2
  tasks_total: 2
  files_created: 1
  files_modified: 15
---

# Phase 05 Plan 07: Gantt View Registration Summary

GanttChart SVG icon + full view routing wired — Gantt now reachable from the Add View picker and view router.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create GanttChart icon component + export | b018718 | packages/icons/src/components/GanttChart.tsx, packages/icons/src/index.ts |
| 2 | Wire Gantt into View.tsx, constant.ts, AddView.tsx | e3b5f0f | View.tsx, constant.ts (x2), AddView.tsx, 10 locale files |

## What Was Built

- **GanttChart icon** (`packages/icons/src/components/GanttChart.tsx`): SVG component with 4 horizontal bars of varying widths/offsets representing a classic Gantt chart. Follows the same functional component pattern as all other icons in the package.
- **Icons index export**: `GanttChart` exported in alphabetical order between `Gauge` and `Globe`.
- **View.tsx routing**: `case ViewType.Gantt: return <GanttView />;` added to `getViewComponent` switch with corresponding import.
- **constant.ts (app)**: `GanttChart` added to `VIEW_ICON_MAP` at `[ViewType.Gantt]`.
- **AddView.tsx**: Gantt entry added to `viewInfoList` after Calendar, using `t('view.category.gantt')` i18n key.
- **i18n**: `view.category.gantt: "Gantt view"` added to all 10 locale files (en, de, es, fr, it, ja, ru, tr, uk, zh).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] SDK VIEW_ICON_MAP missing ViewType.Gantt**
- **Found during:** Task 2 TypeScript check
- **Issue:** `packages/sdk/src/components/view/constant.ts` declares `VIEW_ICON_MAP` as `Record<ViewType, ...>`, which requires all ViewType members. After ViewType.Gantt was added to core in plan 05-05, the SDK constant became a type error waiting to happen.
- **Fix:** Added `GanttChart` import and `[ViewType.Gantt]: GanttChart` entry to SDK constant.ts
- **Files modified:** `packages/sdk/src/components/view/constant.ts`
- **Commit:** e3b5f0f

**2. [Rule 2 - Missing i18n keys] view.category.gantt not in any locale file**
- **Found during:** Task 2 (i18n key required for AddView.tsx)
- **Fix:** Added `"gantt": "Gantt view"` to all 10 locale table.json files
- **Files modified:** 10 locale files in packages/common-i18n/src/locales/
- **Commit:** e3b5f0f

## Known Stubs

None — all data is wired to real view infrastructure. GanttView renders the actual Gantt component built in plans 05-01 through 05-05.

## Threat Flags

None — this plan adds a switch case and icon; no new network endpoints, auth paths, or trust boundaries introduced.

## Self-Check: PASSED

- FOUND: packages/icons/src/components/GanttChart.tsx
- FOUND: apps/nextjs-app/src/features/app/blocks/view/View.tsx
- FOUND: .planning/phases/05-gantt-view-milestones/05-07-SUMMARY.md
- FOUND commit b018718: feat(05-07): create GanttChart icon component + export from icons index
- FOUND commit e3b5f0f: feat(05-07): wire Gantt into View.tsx switch, constant.ts icon map, AddView.tsx picker
