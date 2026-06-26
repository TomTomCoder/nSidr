---
phase: 05-gantt-view-milestones
plan: "02"
subsystem: backend
tags: [gantt, view, validation, nestjs, prisma]
dependency_graph:
  requires: [05-01-PLAN.md]
  provides: [GanttViewDto, validateGanttViewOptions, factory.ts Gantt case]
  affects: [view.service.ts, view model index]
tech_stack:
  added: []
  patterns: [NestJS BadRequestException, PrismaService txClient, vitest unit tests]
key_files:
  created:
    - apps/nestjs-backend/src/features/view/model/gantt-view.dto.ts
    - apps/nestjs-backend/src/features/view/model/view-option-validate.ts
    - apps/nestjs-backend/src/features/view/model/index.ts
    - apps/nestjs-backend/src/features/view/__tests__/gantt-view.spec.ts
  modified:
    - apps/nestjs-backend/src/features/view/model/factory.ts
    - apps/nestjs-backend/src/features/view/view.service.ts
decisions:
  - "DATE_FIELD_TYPES includes FieldType.Date, CreatedTime, LastModifiedTime — no FieldType.DateTime exists in Teable FieldType enum"
  - "Used standalone function validateGanttViewOptions (not a NestJS service) to allow easy unit testing without full module setup"
  - "Unit tests target validateGanttViewOptions directly with mocked PrismaService (vitest vi.fn()) rather than full NestJS TestingModule"
metrics:
  duration: "~15 minutes"
  completed: "2026-05-20"
  tasks_completed: 3
  files_changed: 6
---

# Phase 05 Plan 02: Gantt Backend Validation Summary

NestJS backend accepts Gantt view creation, validates startField/endField reference real date fields, and persists options correctly.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 0 | Create GanttViewDto + wire factory.ts + model index | 734e26c | gantt-view.dto.ts, factory.ts, model/index.ts |
| 1 | Add Gantt view option validator + wire into view.service.ts | 4793a3f | view-option-validate.ts, view.service.ts |
| 2 | Backend unit tests for Gantt view CRUD | 7a017b6 | __tests__/gantt-view.spec.ts |

## validateGanttViewOptions Location and Signature

```typescript
// apps/nestjs-backend/src/features/view/model/view-option-validate.ts
export async function validateGanttViewOptions(
  tableId: string,
  options: IGanttViewOptions,
  prisma: PrismaService
): Promise<void>
```

Validates:
- `startField` exists in the table AND is a date-type field (`FieldType.Date`, `FieldType.CreatedTime`, `FieldType.LastModifiedTime`)
- `endField` same validation
- `titleField`, `dependencyField`, `colorField` — existence only if provided

Throws `BadRequestException` with descriptive message on any violation.

## view.service.ts Changes

Method `createView(tableId, viewRo)` — added guard before `createDbView`:

```typescript
if (viewRo.type === ViewType.Gantt && viewRo.options) {
  await validateGanttViewOptions(
    tableId,
    viewRo.options as IGanttViewOptions,
    this.prismaService
  );
}
```

Added `IGanttViewOptions` to type imports from `@teable/core`.
Added import `validateGanttViewOptions` from `./model/view-option-validate`.

## Test Results

5 tests in `gantt-view.spec.ts`, all pass:
- Valid date fields resolves without throwing
- Default options (milestoneThreshold=0, timeScale=week) accepted
- Non-date `startField` (singleLineText) throws `BadRequestException` containing 'startField'
- Missing `endField` throws `BadRequestException` containing 'endField'
- Options not mutated — defaults preserved

Full suite: 107 test files pass (640 tests pass, 13 skipped).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] No FieldType.DateTime in Teable FieldType enum**
- **Found during:** Task 1
- **Issue:** Plan specified validating 'date' or 'dateTime' field types. Teable's `FieldType` enum has no `DateTime` — only `FieldType.Date = 'date'`. `DateTime` only exists in `CellValueType` and `DbFieldType`.
- **Fix:** `DATE_FIELD_TYPES` uses `[FieldType.Date, FieldType.CreatedTime, FieldType.LastModifiedTime]` — the three field types that hold date/time cell values.
- **Files modified:** view-option-validate.ts
- **Commit:** 4793a3f

**2. [Rule 1 - Bug] model/index.ts did not exist**
- **Found during:** Task 0
- **Issue:** Plan specified adding `export * from './gantt-view.dto'` to model/index.ts but the file did not exist.
- **Fix:** Created model/index.ts with exports for all existing DTOs plus GanttViewDto.
- **Files modified:** model/index.ts (created)
- **Commit:** 734e26c

## Known Stubs

None — all validation logic is fully wired.

## Self-Check: PASSED
