# Phase 5: Gantt View with Milestones - Context

**Gathered:** 2026-05-14
**Status:** Ready to execute

<domain>
## Phase Boundary

Phase 5 adds Gantt view as a first-class view type to Teable EE. Deliverables:
- `ViewType.Gantt` enum value and `GanttViewOptions` schema in `@teable/core`
- NestJS backend validation: `startField`/`endField` must reference `date` or `dateTime` fields
- Full Gantt frontend: timeline bars, milestone diamonds, dependency arrows, critical path, synchronized sidebar, toolbar with time scale switcher
- `GanttOptionsPanel` for configuring field mappings
- Drag-to-reschedule (bar move + edge resize) and drag-to-create-dependency
- Human verification checkpoint (13-step UAT) gates Wave 4 completion

No new Prisma model. No external chart library. No changes to existing view types.
</domain>

<decisions>
## Implementation Decisions

### Data Storage
- **D-01:** Gantt options are stored in the existing `view.options` JSON column — no new Prisma model or migration required.
- **D-02:** `GanttViewOptions` has exactly 9 fields: `startField` (required string), `endField` (required string), `titleField` (optional string), `dependencyField` (optional string), `colorField` (optional string), `milestoneThreshold` (number, default `0`), `showCriticalPath` (boolean, default `false`), `showWeekends` (boolean, default `true`), `timeScale` (enum `'day'|'week'|'month'|'quarter'`, default `'week'`).

### Type System
- **D-03:** `ViewType.Gantt = 'gantt'` added after `Plugin` in the existing ViewType enum (`packages/core/src/models/view/constant.ts`).
- **D-04:** Schema file: `packages/core/src/models/view/derivate/gantt-view-option.schema.ts` — exports `ganttViewOptionSchema` (Zod) and `IGanttViewOptions` type.
- **D-05:** View class file: `packages/core/src/models/view/derivate/gantt.view.ts` — exports `IGanttView extends IViewVo` interface and `GanttViewCore extends ViewCore` class. Pattern mirrors `calendar.view.ts` exactly.
- **D-06:** `IGanttView` is added to the `IView` union type in `packages/core/src/models/view/view.ts`.
- **D-07:** `packages/openapi/src/view/create.ts` and `update.ts` accept `type: 'gantt'` via the existing z.literal/z.enum union.

### Backend Validation
- **D-08:** A `validateGanttViewOptions(tableId, options, prisma)` function in `apps/nestjs-backend/src/features/view/model/view-option-validate.ts` validates:
  - `startField` exists in table AND type is `'date'` or `'dateTime'` → 400 if not
  - `endField` same constraint → 400 if not
  - `titleField`, `dependencyField`, `colorField` existence check only (any type) if set
- **D-09:** `view.service.ts` calls `validateGanttViewOptions` in both `createView` and `updateView` paths when `dto.type === ViewType.Gantt`.
- **D-10:** `apps/nestjs-backend/src/features/view/model/gantt-view.dto.ts` mirrors `calendar-view.dto.ts`: `class GanttViewDto extends GanttViewCore` with `defaultShareMeta = { includeRecords: true }`.
- **D-11:** `factory.ts` switch adds `case ViewType.Gantt: return plainToInstance(GanttViewDto, viewVo)`.

### Frontend Rendering
- **D-12:** No chart library — timeline built entirely with plain HTML/CSS/SVG (Tailwind CSS, position:absolute divs, SVG for arrows). This is the established Teable pattern.
- **D-13:** Pixel constants in `util.ts`: `PIXELS_PER_DAY = { day: 40, week: 12, month: 4, quarter: 2 }`, `ROW_HEIGHT = 40`, `SIDEBAR_WIDTH = 220`.
- **D-14:** Core util helpers: `dateToPixel`, `pixelToDate`, `barWidth`, `dependencyPath` (cubic bezier SVG path), `generateTimelineColumns`.
- **D-15:** `GanttBar` is a positioned `<div>` at `left: dateToPixel(startDate)`, `width: barWidth(...)`. Height 24px, border-radius 4px. Blue (`bg-blue-500`) normally; red (`bg-red-500`) on critical path.
- **D-16:** `GanttMilestone` is a rotated square (16×16, `transform: rotate(45deg)`) rendered at the bar's start date position. Yellow (`bg-yellow-400`) normally; red on critical path.
- **D-17:** `GanttDependencyArrow` is a full-canvas SVG (position:absolute, pointer-events:none) with cubic bezier `<path>` elements and an SVG arrowhead `<marker id="arrow">`.
- **D-18:** `GanttSidebar` is a fixed-width (`SIDEBAR_WIDTH` px) left pane. Scroll synchronized with the timeline via a `scrollTop` prop and ref.
- **D-19:** `GanttToolbar` contains: Day/Week/Month/Quarter time scale buttons, "Today" scroll button, "Weekends" toggle checkbox, "Critical Path" toggle checkbox.
- **D-20:** Timeline header columns: day → `"Mon 12 May"`, week → `"W19 May"`, month → `"May 2026"`, quarter → `"Q2 2026"`.
- **D-21:** `GanttContext` holds: `ganttOptions`, `timelineStart` (earliest startDate − 2 weeks), `timelineEnd` (latest endDate + 2 weeks), `selectedRecordId`, `setSelectedRecordId`.
- **D-22:** `GanttIcon` is exported from `packages/icons/src/index.ts` as `export { GanttChart as GanttChartIcon } from 'lucide-react'` (or inline SVG if the package uses that pattern — executor must read `packages/icons/src/index.ts` first).

### Milestones
- **D-23:** A record is a milestone when `duration (endDate − startDate in days) <= milestoneThreshold`. Default threshold is `0` (only zero-duration records are milestones by default).

### Dependency Field
- **D-24:** `dependencyField` supports two modes, detected at runtime:
  - Linked-record field: read linked record IDs from the cell value directly.
  - Text field: split cell value by comma, trim whitespace → array of record IDs.
- **D-25:** When creating a dependency via drag on a text field: append the target recordId to the comma-separated value. On a linked-record field: use the linked record API.

### Critical Path
- **D-26:** Algorithm: Kahn's topological sort on the dependency DAG, then a longest-path pass (each node's dist = max predecessor dist + node duration). Backtrack from the max-dist node to collect `criticalPathIds: Set<string>`.
- **D-27:** If `showCriticalPath === false`, `useCriticalPath` returns an empty `Set` without computing.

### Drag Interactions
- **D-28:** All drag interactions use mouse events (onMouseDown, window-level onMouseMove/onMouseUp). A "ghost bar" (opacity-50 overlay) shows the pending position during drag; the record update API is called only on mouseUp.
- **D-29:** Resize left edge → only `startDate` changes (clamped to `max(newStart, endDate − 1 day)`). Resize right edge → only `endDate` changes.
- **D-30:** Dependency connector: an 8×8 dot at the right edge of each bar. MouseDown starts rubber-band SVG line; MouseUp over another bar creates the dependency; MouseUp elsewhere cancels.
- **D-31:** `useGanttDrag` hook signature: accepts `{ bars, ganttOptions, tableId, timelineStart, timeScale }`, returns `{ dragHandlers: { onMouseDown, onMouseMove, onMouseUp }, pendingGhostBars: GanttBarItem[] }`.
- **D-32:** `useUpdateRecord(tableId, recordId, { [startField]: newStartDate, [endField]: newEndDate })` called on drag end.

### View Registration
- **D-33:** `apps/nextjs-app/src/features/app/blocks/view/View.tsx` — add `case ViewType.Gantt: return <GanttView {...props} />` in `getViewComponent` switch.
- **D-34:** `apps/nextjs-app/src/features/app/blocks/table/table-header/AddView.tsx` — add Gantt entry to `viewInfoList` after Calendar.
- **D-35:** `apps/nextjs-app/src/features/app/blocks/view/constant.ts` — add `GanttChartIcon` to `VIEW_ICON_MAP[ViewType.Gantt]`.

### Human Checkpoint
- **D-36:** Wave 4 (`05-04-PLAN.md`) is `autonomous: false` and includes a blocking `checkpoint:human-verify` task with 13 UAT steps. The phase is not complete until the human types "approved".

### Claude's Discretion
- Exact Tailwind class combinations beyond those specified (e.g., border colors, padding, hover states)
- Whether `GanttOptionsPanel` opens as a right rail or via a settings icon click (mirror the Calendar pattern)
- Scroll container implementation details (overflow-x:auto vs virtual scrolling)
- Whether `GanttBar` tooltip is a native `title` attribute or a custom Radix/Tooltip component (match existing Teable component patterns)
- Column header label formatting details beyond the templates in D-20
- Test file structure details (mirror whatever pattern exists in `apps/nestjs-backend/src/features/view/__tests__/`)
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Core Type System (Wave 1 targets)
- `packages/core/src/models/view/constant.ts` — ViewType enum; add `Gantt = 'gantt'` after `Plugin`
- `packages/core/src/models/view/derivate/calendar-view-option.schema.ts` — reference schema pattern to mirror for `gantt-view-option.schema.ts`
- `packages/core/src/models/view/derivate/calendar.view.ts` — reference view class pattern to mirror for `gantt.view.ts`
- `packages/core/src/models/view/derivate/index.ts` — add exports for new Gantt files here
- `packages/core/src/models/view/view.ts` — IView union type; add IGanttView
- `packages/core/src/models/view/view.schema.ts` — discriminated union schema; add gantt branch
- `packages/openapi/src/view/create.ts` — add `'gantt'` to type literal list
- `packages/openapi/src/view/update.ts` — add `'gantt'` to type literal list

### Backend (Wave 2 targets)
- `apps/nestjs-backend/src/features/view/model/calendar-view.dto.ts` — DTO pattern to mirror for `gantt-view.dto.ts`
- `apps/nestjs-backend/src/features/view/model/factory.ts` — `createViewInstanceByRaw` switch; add Gantt case
- `apps/nestjs-backend/src/features/view/model/index.ts` — add `gantt-view.dto` export
- `apps/nestjs-backend/src/features/view/view.service.ts` — `createView`/`updateView` methods; add Gantt validation call
- `apps/nestjs-backend/src/features/view/__tests__/` — test file pattern to mirror for `gantt-view.spec.ts`

### Frontend (Wave 3 & 4 targets)
- `apps/nextjs-app/src/features/app/blocks/view/calendar/CalendarView.tsx` — toolbar + GanttProvider wrapping pattern
- `apps/nextjs-app/src/features/app/blocks/view/calendar/CalendarViewBase.tsx` — core render structure pattern
- `apps/nextjs-app/src/features/app/blocks/view/calendar/context/CalendarContext.ts` — context pattern for GanttContext
- `apps/nextjs-app/src/features/app/blocks/view/calendar/context/CalendarProvider.tsx` — provider pattern
- `apps/nextjs-app/src/features/app/blocks/view/View.tsx` — `getViewComponent` switch; add Gantt case
- `apps/nextjs-app/src/features/app/blocks/table/table-header/AddView.tsx` — `viewInfoList` array; add Gantt entry
- `apps/nextjs-app/src/features/app/blocks/view/constant.ts` — `VIEW_ICON_MAP`; add Gantt icon entry
- `packages/icons/src/index.ts` — icon export pattern; add GanttChartIcon
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `calendar-view-option.schema.ts` — exact Zod schema pattern for view options (exports schema + inferred type)
- `calendar.view.ts` — exact `extends IViewVo` / `extends ViewCore` pattern for view interface + class
- `calendar-view.dto.ts` — NestJS DTO pattern: `class XViewDto extends XViewCore { defaultShareMeta }`
- `CalendarView.tsx` + `CalendarViewBase.tsx` — toolbar wrapping, context provider composition
- `CalendarContext.ts` + `CalendarProvider.tsx` — React context + provider split pattern
- `apps/nestjs-backend/src/features/view/model/factory.ts` — switch-based view instance factory; just add one case

### Established Patterns
- View options are stored as untyped JSON in `view.options` column; the Zod schema in `@teable/core` is the source of truth for shape validation.
- All view derivates live under `packages/core/src/models/view/derivate/` with the naming convention `{type}-view-option.schema.ts` and `{type}.view.ts`.
- The NestJS backend uses `class-transformer`'s `plainToInstance` in `factory.ts` to hydrate the correct DTO class by view type.
- Frontend views live under `apps/nextjs-app/src/features/app/blocks/view/{type}/` — all as React components consuming `@teable/sdk` hooks (`useRecords`, `useFields`, `useView`, `useUpdateRecord`, `useUpdateView`).
- Teable uses Tailwind CSS throughout; no CSS-in-JS. No chart libraries for timeline views.
- Icons: `packages/icons/src/index.ts` — read this file before creating GanttIcon to match the exact export pattern (may be lucide-react re-export or inline SVG).

### Integration Points
- `@teable/core` `ViewType` enum is imported by both `@teable/openapi` and the NestJS backend — adding the enum value unblocks all downstream code.
- `View.tsx` `getViewComponent` is the frontend router; the Gantt component will not render until this switch is updated (Wave 3, Task 3).
- `AddView.tsx` `viewInfoList` controls what appears in the "Add View" picker — Gantt will be invisible to users until this is updated.
- `useRecords` from `@teable/sdk` is the standard hook for fetching all records in the current table; `useGanttRecords` wraps it.
- `useUpdateRecord` from `@teable/sdk` is the API call target for drag-to-reschedule on mouseUp.
- `useUpdateView` from `@teable/sdk` is the API call target for GanttOptionsPanel field picker changes.
</code_context>

<specifics>
## Specific Ideas

### GanttViewOptions Schema (exact Zod definition)
```typescript
export const ganttTimeScaleSchema = z.enum(['day', 'week', 'month', 'quarter']);

export const ganttViewOptionSchema = z.object({
  startField:          z.string().min(1),
  endField:            z.string().min(1),
  titleField:          z.string().optional(),
  dependencyField:     z.string().optional(),
  colorField:          z.string().optional(),
  milestoneThreshold:  z.number().default(0),
  showCriticalPath:    z.boolean().default(false),
  showWeekends:        z.boolean().default(true),
  timeScale:           ganttTimeScaleSchema.default('week'),
});
```

### Pixel Scale Constants
| timeScale | PIXELS_PER_DAY |
|-----------|---------------|
| day       | 40            |
| week      | 12            |
| month     | 4             |
| quarter   | 2             |

`ROW_HEIGHT = 40`, `SIDEBAR_WIDTH = 220`

### Milestone Detection
`isMilestone = (endDate.getTime() - startDate.getTime()) / 86400000 <= milestoneThreshold`
Default `milestoneThreshold = 0` means only records where startDate === endDate are milestones.

### Critical Path Algorithm Name
Kahn's topological sort + longest-path (single-pass in topo order). Input: `GanttDependency[]` + `GanttBarItem[]` (for durations). Output: `Set<string>` of recordIds on the critical path.

### Backend Validation Error Messages
- `'startField must reference a date or dateTime field'`
- `'endField must reference a date or dateTime field'`
- `'titleField references a non-existent field'`

### STRIDE Threat IDs
T-05-01 through T-05-14 are documented in the PLAN.md files. Key mitigations:
- T-05-01/T-05-04: `validateGanttViewOptions` enforces date field type
- T-05-07: Dependency text IDs filtered against current record set before render
- T-05-11: Drag dates clamped to year 1900–2100; startDate cannot exceed endDate
- T-05-13: Dependency IDs validated against record set before write
- T-05-14: Window mousemove listener removed on mouseUp and component unmount

### Human Checkpoint (Wave 4 UAT — 13 steps)
1. Dev server starts
2. Open localhost:3000
3. Create table with Name/Start Date/End Date fields
4. Add 3-4 records including one zero-duration record
5. View type switcher shows "Gantt" with Gantt icon
6. Options panel: set Start Field, End Field, Title Field
7. Bars appear at correct horizontal positions
8. Zero-duration record shows as diamond milestone
9. Drag bar → dates update after drag ends
10. Drag right edge → only end date changes
11. Enable Critical Path → at least one bar turns red (with dependencies)
12. Switch Week → Month → bars reposition
13. Click "Today" → timeline scrolls to today
</specifics>

<deferred>
## Deferred Ideas

The following are explicitly out of scope for Phase 5:

- **Virtual scrolling** for large record sets (>1000 rows) — Wave 3 uses simple absolute positioning; performance acceptable for v1
- **Web Worker for critical path** — noted in T-05-08 as a future-phase optimization
- **Resource view / swimlanes** — grouping bars by assignee or other field
- **Baseline comparison** — showing original vs. current schedule
- **Export to image/PDF** — screenshot of the Gantt chart
- **Recurring tasks** — tasks with repeat patterns
- **Finish-to-start constraints** — auto-scheduling when predecessor changes
- **Percent-complete indicator** inside bars
- **Multi-select drag** — moving multiple bars simultaneously
- **Undo/redo** for drag operations
- **Phase 3 performance work** (BullMQ, Redis cache) is a separate phase and not a dependency
</deferred>

---

<testing>
## Testing Strategy

### Gate rule
`npx vitest run` + `npx tsc --noEmit` must pass before each wave. Wave 4 requires Playwright E2E.

### Unit Tests (Vitest)
- `gantt-view-option.schema.spec.ts` — test Zod schema: valid options pass; missing `startField`/`endField` fail; invalid `timeScale` value fails
- `view-option-validate.spec.ts` — test `validateGanttViewOptions`: correct field type passes; non-date field throws 400; missing field throws 400
- Critical path algorithm unit: test Kahn's topo-sort with known DAG input → expected critical path output; test cycle detection (should skip cyclic edges)

### Integration Tests (Vitest + test DB)
- `POST /api/table/:tableId/view` with `type: 'gantt'` + valid `startField`/`endField` → 201
- `POST` with non-date `startField` → 400 with descriptive error
- `PATCH /api/table/:tableId/view/:viewId` update `timeScale` → 200; verify persisted in `view.options`

### E2E Tests (Playwright — Wave 4 UAT checkpoint)
- Create a table with date fields → create Gantt view → configure `startField` + `endField` → bars render for records with dates
- Drag a bar to new dates → record updates persist on reload
- Add dependency → dependency arrow renders between bars
- Toggle critical path → critical path bars highlighted in red
- Switch time scale (day/week/month/quarter) → timeline header updates

### What NOT to test
- Teable core view switching logic (existing tests cover this)
- Date field type validation (already tested in field service)
</testing>

*Phase: 05-gantt-view-milestones*
*Context gathered: 2026-05-14 (testing added 2026-05-15)*
