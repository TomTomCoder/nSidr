---
phase: 05-gantt-view-milestones
plan: "06"
subsystem: backend-view
tags: [gantt, backend, validation, nestjs, dto]
dependency_graph:
  requires: ["05-05", "05-01"]
  provides: ["gantt-backend-factory", "gantt-field-validation"]
  affects: ["apps/nestjs-backend/src/features/view/"]
tech_stack:
  added: []
  patterns: ["DTO class extending Core", "Prisma field type validation", "BadRequestException guard"]
key_files:
  created:
    - apps/nestjs-backend/src/features/view/model/gantt-view.dto.ts
    - apps/nestjs-backend/src/features/view/model/view-option-validate.ts
  modified:
    - apps/nestjs-backend/src/features/view/model/factory.ts
    - apps/nestjs-backend/src/features/view/view.service.ts
decisions:
  - "Use FieldType.Date | FieldType.CreatedTime | FieldType.LastModifiedTime as valid date types (not raw 'date'/'dateTime' strings)"
  - "Call prisma.txClient().field.findMany scoped to tableId to avoid cross-table leaks"
  - "Validate on createView only — update path handled via OT ops which don't change field references in one shot"
metrics:
  duration_minutes: 10
  completed_date: "2026-05-20"
  tasks_completed: 2
  tasks_total: 2
  files_created: 2
  files_modified: 2
---

# Phase 05 Plan 06: Gantt Backend DTO, Factory, and Field Validation Summary

**One-liner:** NestJS backend handles ViewType.Gantt in factory without assertNever crash, with startField/endField date-type validation via validateGanttViewOptions.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | GanttViewDto + factory.ts wire | 08429d3 | gantt-view.dto.ts, factory.ts |
| 2 | validateGanttViewOptions + view.service.ts | a3ee10a | view-option-validate.ts, view.service.ts |

## What Was Built

### Task 1: GanttViewDto + Factory Case

`apps/nestjs-backend/src/features/view/model/gantt-view.dto.ts`:
- `GanttViewDto extends GanttViewCore` following the CalendarViewDto pattern exactly
- `defaultShareMeta: { includeRecords: true }` for share functionality

`apps/nestjs-backend/src/features/view/model/factory.ts`:
- Added `case ViewType.Gantt: return plainToInstance(GanttViewDto, viewVo);` in the switch
- Without this, the switch falls through to `assertNever(viewVo.type)` causing a runtime crash

### Task 2: Field-Type Validation

`apps/nestjs-backend/src/features/view/model/view-option-validate.ts`:
- `validateGanttViewOptions(tableId, options, prisma)` queries all fields in the table
- Validates `startField` and `endField` exist AND have type `date`, `createdTime`, or `lastModifiedTime`
- Validates optional `titleField`, `dependencyField`, `colorField` exist if specified (any type)
- Throws `BadRequestException` with descriptive message on any violation

`apps/nestjs-backend/src/features/view/view.service.ts`:
- Calls `validateGanttViewOptions` in `createView` before the DB write when `viewRo.type === ViewType.Gantt`
- Import: `validateGanttViewOptions` from `./model/view-option-validate`

## Verification

All acceptance criteria passed:

```
test -f gantt-view.dto.ts                      PASS
grep "class GanttViewDto extends GanttViewCore" PASS
grep "includeRecords: true"                    PASS
grep "ViewType.Gantt" factory.ts               PASS
grep "GanttViewDto" factory.ts                 PASS
test -f view-option-validate.ts                PASS
grep "validateGanttViewOptions" view.service.ts PASS
grep "startField must reference a date"        PASS
tsc --noEmit (view model files only)           PASS — 0 errors
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] FieldType enum used instead of raw string literals**
- **Found during:** Task 2
- **Issue:** Plan suggested checking `startType !== 'date' && startType !== 'dateTime'` but Prisma stores field type as the FieldType enum string values. The correct types for "date fields" in Teable are `FieldType.Date`, `FieldType.CreatedTime`, `FieldType.LastModifiedTime`.
- **Fix:** Used `DATE_FIELD_TYPES` array with the three correct FieldType enum values; also called `prisma.txClient()` instead of direct `prisma.field.findMany` to respect transaction context.
- **Files modified:** view-option-validate.ts
- **Commit:** a3ee10a

## Known Stubs

None — all field validation is fully wired and functional.

## Threat Surface Scan

No new network endpoints, auth paths, or file access patterns introduced. The validation function operates within the existing table-scoped authorization gate (callers must already have table write access). Threat model T-05-04 is mitigated as planned.

## Self-Check: PASSED

- [x] `apps/nestjs-backend/src/features/view/model/gantt-view.dto.ts` — EXISTS
- [x] `apps/nestjs-backend/src/features/view/model/view-option-validate.ts` — EXISTS
- [x] `apps/nestjs-backend/src/features/view/model/factory.ts` — contains ViewType.Gantt
- [x] `apps/nestjs-backend/src/features/view/view.service.ts` — contains validateGanttViewOptions
- [x] Commits 08429d3 and a3ee10a — EXIST in git log
