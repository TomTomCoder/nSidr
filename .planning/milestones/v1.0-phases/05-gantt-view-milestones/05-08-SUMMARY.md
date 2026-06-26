---
phase: 05-gantt-view-milestones
plan: "08"
subsystem: gantt-tests
tags: [tests, zod, critical-path, vitest]
dependency_graph:
  requires: ["05-05", "05-06", "05-07"]
  provides: ["PHASE05-END-TO-END"]
  affects: []
tech_stack:
  added: []
  patterns: [vitest, safeParse, computeCriticalPath extraction]
key_files:
  created:
    - packages/core/src/models/view/derivate/__tests__/gantt-view-option.schema.spec.ts
    - apps/nextjs-app/src/features/app/blocks/view/gantt/__tests__/critical-path.spec.ts
  modified:
    - apps/nextjs-app/src/features/app/blocks/view/gantt/hooks/useCriticalPath.ts
decisions:
  - "Extracted computeCriticalPath pure function from useMemo to enable direct unit testing without React hook infrastructure"
  - "Schema test adjusts for actual schema (no .nullable() on optional fields — plan interface was aspirational)"
metrics:
  duration: "~5 minutes"
  completed: "2026-05-20"
  tasks_completed: 2
  files_created: 3
  files_modified: 1
---

# Phase 05 Plan 08: Gantt Unit Tests (Schema + Critical Path) Summary

**One-liner:** Zod schema unit tests (15 passing) + critical path algorithm extracted and tested (7 passing) via vitest.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Zod schema unit tests for ganttViewOptionSchema | bd86728 | packages/core/src/models/view/derivate/__tests__/gantt-view-option.schema.spec.ts |
| 2 | Critical path algorithm extraction + unit tests | faa5a63 | apps/nextjs-app/.../useCriticalPath.ts, apps/nextjs-app/.../__tests__/critical-path.spec.ts |

## Test Results

- **Schema tests:** 15/15 passing — valid options, missing required fields, empty strings, invalid timeScale, all 4 valid timeScale values
- **Critical path tests:** 7/7 passing — linear chain, diamond DAG longest-path, empty deps, empty bars, cycle safety (Kahn's handles it), parallel chains

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Refactor] Schema test adjusted for actual .optional() (not .nullable())**
- **Found during:** Task 1
- **Issue:** Plan interface showed `.nullable()` on optional fields but actual schema uses `.optional()` only
- **Fix:** Test uses `undefined` instead of `null` for optional field tests — all pass correctly
- **Files modified:** gantt-view-option.schema.spec.ts

**2. [Rule 2 - Critical Functionality] Extracted computeCriticalPath as exported pure function**
- **Found during:** Task 2
- **Issue:** Algorithm was inlined in useMemo, impossible to unit test without React test renderer
- **Fix:** Extracted as `export function computeCriticalPath(bars, dependencies): Set<string>` — hook delegates to it
- **Files modified:** useCriticalPath.ts

## Known Stubs

None — test-only plan with no UI rendering.

## Threat Flags

None — test-only plan, no new runtime trust boundaries introduced.

## Self-Check: PASSED

- [x] packages/core/src/models/view/derivate/__tests__/gantt-view-option.schema.spec.ts exists
- [x] apps/nextjs-app/src/features/app/blocks/view/gantt/__tests__/critical-path.spec.ts exists
- [x] Commit bd86728 exists
- [x] Commit faa5a63 exists
- [x] All 22 tests pass (15 schema + 7 critical path)
