---
phase: 05-gantt-view-milestones
plan: "04"
subsystem: frontend-gantt
tags: [gantt, drag-and-drop, options-panel, react, typescript]
dependency_graph:
  requires:
    - 05-03-PLAN.md
  provides:
    - GanttOptionsPanel (field pickers + toggles)
    - useGanttDrag (bar move, resize, dependency creation)
    - Interactive GanttBar (resize handles + connector dot)
  affects:
    - GanttViewBase (mounts drag hook, ghost bars)
    - GanttToolbar (embeds settings popover)
tech_stack:
  added: []
  patterns:
    - Popover-wrapped options panel (mirrors CalendarConfig pattern)
    - Ghost bar pattern (pending drag state as overlay)
    - Window-level mousemove/mouseup with useEffect cleanup (T-05-14)
key_files:
  created:
    - apps/nextjs-app/src/features/app/blocks/view/gantt/components/GanttOptionsPanel.tsx
    - apps/nextjs-app/src/features/app/blocks/view/gantt/hooks/useGanttDrag.ts
  modified:
    - apps/nextjs-app/src/features/app/blocks/view/gantt/components/GanttBar.tsx
    - apps/nextjs-app/src/features/app/blocks/view/gantt/components/GanttToolbar.tsx
    - apps/nextjs-app/src/features/app/blocks/view/gantt/GanttView.tsx
    - apps/nextjs-app/src/features/app/blocks/view/gantt/GanttViewBase.tsx
decisions:
  - GanttOptionsPanel embedded in GanttToolbar via Popover (not a separate right-rail) — matches CalendarConfig pattern
  - Ghost bars rendered as opacity-50 pointer-events-none div wrapping GanttBar — avoids duplicate drag logic
  - useGanttDrag returns imperative handlers (startMove, startResizeLeft, startResizeRight, startDependency) — lets GanttBar stay presentation-only
  - useTableId() used for tableId (not useTable().id) — aligns with existing Kanban/Gallery pattern
  - Dependency field write uses text mode (comma-separated) — linked-record API deferred (not available via useRecordOperations in this flow)
metrics:
  duration_minutes: 65
  completed_date: "2026-05-20T18:44:34Z"
  tasks_completed: 1
  files_created: 2
  files_modified: 4
---

# Phase 05 Plan 04: Gantt Options Panel + Drag Interactions Summary

**One-liner:** GanttOptionsPanel with 5 field pickers and 3 toggles, useGanttDrag hook implementing bar-move/resize/dependency-creation with ghost preview and clamped date safety.

## What Was Built

### GanttOptionsPanel

A Popover-based settings panel (matching the CalendarConfig pattern) triggered by a "Settings" button in GanttToolbar.

Renders:
1. **Start Field** picker — filters to `CellValueType.DateTime` fields
2. **End Field** picker — same filter
3. **Title Field** picker — all fields
4. **Dependency Field** picker — Link, SingleLineText, LongText fields + hint text
5. **Color Field** picker — all fields
6. **Milestone Threshold** — number input (days)
7. **Show Weekends** — checkbox
8. **Show Critical Path** — checkbox

Each change calls `view.updateOption({ [key]: value })` directly, which triggers the GanttContext to recompute bars on next render.

### useGanttDrag Hook

Exported API:
```ts
{
  startMove: (bar, e) => void          // drag bar body
  startResizeLeft: (bar, e) => void    // drag left edge
  startResizeRight: (bar, e) => void   // drag right edge
  startDependency: (bar, e) => void    // drag connector dot
  onMouseMove: (e: MouseEvent) => void // window-level handler
  onMouseUp: (e: MouseEvent) => void   // window-level handler
  pendingGhostBars: GanttBarItem[]     // current drag preview
  dependencyLineEnd: {x,y} | null      // rubber-band line endpoint
}
```

Drag behaviors:
- **Move**: Shifts both start and end dates by the same delta. Ghost bar shows live position. On mouseup: calls `updateRecord` with both `startField` and `endField`.
- **Resize-left**: Changes only startDate. Clamped to max `endDate - 1 day`. On mouseup: writes only `startField`.
- **Resize-right**: Changes only endDate. Clamped to min `startDate + 1 day`. On mouseup: writes only `endField`.
- **Dependency**: Tracks mouse position for rubber-band line. On mouseup: hit-tests `data-record-id` attribute, validates target against live record set, appends to dependency field as comma-separated text.

Security mitigations applied:
- **T-05-11**: All computed dates clamped to 1900–2100 range before API call
- **T-05-13**: Dependency record IDs validated against `validRecordIds` Set before write
- **T-05-14**: Window listeners registered/removed in `useEffect` with cleanup function

### Updated GanttBar

Added three interactive regions on top of the Wave 3 read-only bar:
- **Left resize handle**: `w-2 h-full absolute left-0 cursor-ew-resize`
- **Right resize handle**: `w-2 h-full absolute right-0 cursor-ew-resize`
- **Right connector dot**: `size-2 rounded-full border border-blue-500 bg-white cursor-crosshair` at right edge center
- Added `data-record-id` attribute for dependency hit-testing
- Bar body gets `onMouseDown` → `drag.startMove`

### Updated GanttViewBase

- Mounts `useGanttDrag` hook with `tableId`, `timelineStart`, `timeScale`
- Registers `window.addEventListener('mousemove', ...)` and `mouseup` in `useEffect` with cleanup
- `displayBars` merges ghost bar positions over real bar positions during drag
- Ghost bars rendered as `pointer-events-none opacity-50` wrapper around `GanttBar`

### Updated GanttToolbar

- Embeds `GanttOptionsPanel` as a Popover wrapping a "Settings" button with Settings icon
- Settings button appears as first item in the toolbar

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Cleanup] Removed duplicate toolbar structure**
- **Found during:** Task 1 — writing GanttViewBase
- **Issue:** Plan described settings button in GanttViewBase but GanttView.tsx already renders GanttToolbar above GanttViewBase, which would create two toolbars
- **Fix:** Embedded GanttOptionsPanel directly inside GanttToolbar as the settings trigger; GanttViewBase remains a pure timeline canvas
- **Files modified:** GanttToolbar.tsx, GanttViewBase.tsx

**2. [Rule 2 - Security] Added date bounds clamping (T-05-11)**
- **Found during:** Task 1 — implementing drag date computation
- **Issue:** Plan noted T-05-11 requires clamping computed dates before calling updateRecord
- **Fix:** `clampDate()` utility applied to all pixelToDate results before ghost state and API calls
- **Files modified:** useGanttDrag.ts

**3. [Rule 2 - Security] Added dependency ID validation (T-05-13)**
- **Found during:** Task 1 — implementing dependency creation
- **Issue:** Plan noted T-05-13 requires validating record IDs before writing dependency field
- **Fix:** `validateDependencyIds()` filters appended IDs through the live `validRecordIds` Set
- **Files modified:** useGanttDrag.ts

## Known Stubs

None. All 5 field pickers wire to `view.updateOption()`. Drag interactions call `updateRecord` on mouseup. No hardcoded empty returns.

## Human Checkpoint

**Status:** AWAITING — Task 1 complete, checkpoint reached.

Verification steps provided in plan (13 steps). User must start dev server and verify all interactions manually.

## Self-Check

Files created/modified:
- [x] `apps/nextjs-app/src/features/app/blocks/view/gantt/components/GanttOptionsPanel.tsx` — FOUND
- [x] `apps/nextjs-app/src/features/app/blocks/view/gantt/hooks/useGanttDrag.ts` — FOUND
- [x] `apps/nextjs-app/src/features/app/blocks/view/gantt/components/GanttBar.tsx` — FOUND
- [x] `apps/nextjs-app/src/features/app/blocks/view/gantt/components/GanttToolbar.tsx` — FOUND
- [x] `apps/nextjs-app/src/features/app/blocks/view/gantt/GanttView.tsx` — FOUND
- [x] `apps/nextjs-app/src/features/app/blocks/view/gantt/GanttViewBase.tsx` — FOUND

Commit: c41d80a — FOUND

TypeScript: 0 errors in gantt/ directory files (2 pre-existing errors in AddView.tsx and gantt.view.ts SDK model are from Wave 3, unrelated to Wave 4 changes)

## Self-Check: PASSED
