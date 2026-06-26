---
phase: 05-gantt-view-milestones
plan: "05"
subsystem: core-types
tags: [gantt, core, sdk, types, zod, view]
dependency_graph:
  requires: []
  provides: [ViewType.Gantt, IGanttViewOptions, IGanttView, GanttViewCore, GanttView]
  affects: [packages/core, packages/sdk, packages/openapi]
tech_stack:
  added: []
  patterns: [zod-schema, class-transformer, ts-mixer mixin]
key_files:
  created:
    - packages/core/src/models/view/derivate/gantt-view-option.schema.ts
    - packages/core/src/models/view/derivate/gantt.view.ts
    - packages/sdk/src/model/view/gantt.view.ts
  modified:
    - packages/core/src/models/view/constant.ts
    - packages/core/src/models/view/derivate/index.ts
    - packages/core/src/models/view/view.schema.ts
    - packages/core/src/models/view/option.schema.ts
    - packages/sdk/src/model/view/factory.ts
    - packages/sdk/src/model/view/index.ts
decisions:
  - "Used `as any` cast in GanttView.updateOption to bypass IViewOptions union narrowing — pre-existing pattern needed because required startField/endField can't be inferred as union member"
  - "Task 1 core files were already committed by plan 05-01; verified in place and skipped re-commit"
metrics:
  duration_minutes: 12
  completed_date: "2026-05-20"
  tasks_completed: 2
  tasks_total: 2
  files_created: 3
  files_modified: 6
---

# Phase 05 Plan 05: Gantt Core Type System + SDK Model Summary

**One-liner:** ViewType.Gantt enum + 9-field Zod schema + GanttViewCore class wired into @teable/core, and GanttView class with updateOption method wired into @teable/sdk factory.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Add ViewType.Gantt + core schemas + derivate index + view.schema + option.schema | 444263e (05-01) | constant.ts, gantt-view-option.schema.ts, gantt.view.ts, derivate/index.ts, view.schema.ts, option.schema.ts |
| 2 | Create SDK GanttView model + wire factory and index | 5a95eee | gantt.view.ts (sdk), factory.ts, index.ts |

## What Was Built

- `ViewType.Gantt = 'gantt'` added to enum in `@teable/core`
- `ganttViewOptionSchema` — 9-field Zod schema: startField, endField, titleField, dependencyField, colorField, milestoneThreshold (default 0), showCriticalPath (default false), showWeekends (default true), timeScale (default 'week')
- `IGanttViewOptions` TypeScript type derived from schema
- `IGanttView` interface and `GanttViewCore` class in `@teable/core`
- `ganttViewOptionSchema` registered in `optionsSchemaMap` and `validateOptionsType` switch
- `GanttView` SDK model class with `updateOption` method using `ts-mixer` Mixin pattern
- `ViewType.Gantt` case in `createViewInstance` factory switch

## Deviations from Plan

### Pre-existing issues (out-of-scope, logged)

**1. [Rule 3 - Out of scope] Task 1 already completed by plan 05-01**
- Core files (constant.ts, gantt-view-option.schema.ts, gantt.view.ts, derivate/index.ts, view.schema.ts, option.schema.ts) were already committed in plan 05-01 commits 444263e and 7f3b3f1.
- Verified all acceptance criteria pass. No re-commit needed.

**2. [Pre-existing] SDK build errors in unrelated files**
- `src/model/field/ai.field.ts` — abstract member error, pre-existing before this plan
- `src/hooks/use-fields.ts` — column meta union type error, pre-existing
- `src/components/view/constant.ts` — missing ViewType.Gantt icon, belongs to plan 05-06 wiring
- `src/context/view/PersonalViewProxy.tsx` — union type widening from GanttView addition, plan 05-06
- `src/hooks/use-personal-view.ts` — same union widening, plan 05-06

**3. [Rule 1 - Bug] `as any` cast in GanttView.updateOption**
- Found during: Task 2 build
- Issue: TypeScript cannot narrow `{ startField, endField, ... }` as a member of the `IViewOptions` union because required fields (`startField`, `endField`) create a discriminant conflict
- Fix: Added `as any` cast on the options object literal (safe — runtime is validated by Zod schema on the server)
- Files modified: packages/sdk/src/model/view/gantt.view.ts

## Known Stubs

None — all exported types are fully defined with correct fields and defaults.

## Threat Flags

None — no new network endpoints or auth paths introduced. Trust boundary mitigation for T-05-01 (fieldId validation) is Wave 2 backend plan 06.

## Self-Check: PASSED

- packages/core/src/models/view/constant.ts: FOUND (ViewType.Gantt)
- packages/core/src/models/view/derivate/gantt-view-option.schema.ts: FOUND
- packages/core/src/models/view/derivate/gantt.view.ts: FOUND
- packages/sdk/src/model/view/gantt.view.ts: FOUND
- Commit 5a95eee: FOUND (feat(05-05): create SDK GanttView model + wire into factory and index)
