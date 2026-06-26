---
phase: 05-gantt-view-milestones
plan: 01
subsystem: core-types
tags: [gantt, view-type, core, openapi, zod-schema]
dependency_graph:
  requires: []
  provides: [ViewType.Gantt, IGanttView, GanttViewCore, ganttViewOptionSchema, IGanttViewOptions]
  affects: [packages/core, packages/openapi]
tech_stack:
  added: []
  patterns: [zod-schema-with-defaults, viewcore-abstract-class-pattern]
key_files:
  created:
    - packages/core/src/models/view/derivate/gantt-view-option.schema.ts
    - packages/core/src/models/view/derivate/gantt.view.ts
  modified:
    - packages/core/src/models/view/constant.ts
    - packages/core/src/models/view/derivate/index.ts
    - packages/core/src/models/view/option.schema.ts
    - packages/core/src/models/view/view.schema.ts
decisions:
  - GanttViewCore.options declared as required (non-optional) to satisfy ViewCore abstract contract
  - IGanttView interface keeps options as optional to match IViewVo pattern
  - zod import path is ../../../zod (3 levels up from derivate/)
metrics:
  duration: ~10 minutes
  completed: "2026-05-20T19:52:39Z"
---

# Phase 05 Plan 01: Gantt Core Type System Summary

ViewType.Gantt enum + 9-field zod schema + GanttViewCore class wired into @teable/core and @teable/openapi type system.

## What Was Built

### GanttViewOptions Fields and Defaults

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| startField | string (min 1) | required | fieldId of the start date field |
| endField | string (min 1) | required | fieldId of the end date field |
| titleField | string | optional | fieldId for bar label |
| dependencyField | string | optional | fieldId for linked-record or text dependencies |
| colorField | string | optional | fieldId for bar color |
| milestoneThreshold | number | 0 | zero-duration records are milestones when duration <= this value (days) |
| showCriticalPath | boolean | false | toggle critical path highlighting |
| showWeekends | boolean | true | toggle weekend display |
| timeScale | 'day' \| 'week' \| 'month' \| 'quarter' | 'week' | timeline zoom level |

### Files Modified

**packages/core/src/models/view/constant.ts**
- Added `Gantt = 'gantt'` to `ViewType` enum after `Plugin`

**packages/core/src/models/view/derivate/gantt-view-option.schema.ts** (new)
- Exports `ganttTimeScaleSchema`, `IGanttTimeScale`, `ganttViewOptionSchema`, `IGanttViewOptions`

**packages/core/src/models/view/derivate/gantt.view.ts** (new)
- Exports `IGanttView` interface (extends IViewVo, type = ViewType.Gantt)
- Exports `GanttViewCore` class (extends ViewCore, concrete type implementation)

**packages/core/src/models/view/derivate/index.ts**
- Added `export * from './gantt.view'` and `export * from './gantt-view-option.schema'`

**packages/core/src/models/view/option.schema.ts**
- Imported `ganttViewOptionSchema`
- Added to `viewOptionsSchema` z.union
- Added `case ViewType.Gantt:` to `validateOptionsType` switch

**packages/core/src/models/view/view.schema.ts**
- Imported `ganttViewOptionSchema`
- Added `[ViewType.Gantt]: ganttViewOptionSchema` to `optionsSchemaMap` in `viewRoSchema.superRefine`

### Build Output Confirmation

- `@teable/openapi`: builds clean (exit 0), no errors
- `@teable/core`: Gantt/view files type-check correctly; pre-existing `ai.field.ts` errors (unrelated to this plan) persist from before our changes

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] GanttViewCore.options must be required to satisfy ViewCore abstract contract**
- **Found during:** Task 2 build
- **Issue:** `ViewCore` declares `abstract options: IViewOptions` (required). Having `options?` in `GanttViewCore` caused TS2416 type error.
- **Fix:** Changed `options?: IGanttViewOptions` to `options!: IGanttViewOptions` in `GanttViewCore` class (interface `IGanttView` keeps `options?` optional per `IViewVo` pattern)
- **Files modified:** `packages/core/src/models/view/derivate/gantt.view.ts`
- **Commit:** 7f3b3f1

**2. [Rule 2 - Missing functionality] option.schema.ts also needed Gantt wiring**
- **Found during:** Task 2 analysis
- **Issue:** Plan Task 2 focused on view.schema.ts but `option.schema.ts` also maintains a parallel viewOptionsSchema union and validateOptionsType switch that needed Gantt entries
- **Fix:** Added `ganttViewOptionSchema` to `viewOptionsSchema` union and `ViewType.Gantt` case to `validateOptionsType` in `option.schema.ts`
- **Files modified:** `packages/core/src/models/view/option.schema.ts`
- **Commit:** 7f3b3f1

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes at trust boundaries beyond what the plan's threat model already covers.

## Known Stubs

None — this plan establishes shared contracts only (no UI, no data rendering).

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | 444263e | feat(05-01): add ViewType.Gantt + GanttViewOptions schema + GanttViewCore class |
| Task 2 | 7f3b3f1 | feat(05-01): wire GanttView into view union types and build-verify |

## Self-Check: PASSED
