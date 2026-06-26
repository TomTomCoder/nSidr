---
phase: 05-gantt-view-milestones
verified: 2026-05-20T22:00:00Z
status: human_needed
score: 17/17 must-haves verified
human_verification:
  - test: "Start the dev server (pnpm dev), navigate to a table, click Add View and verify 'Gantt view' appears in the picker with the GanttChart icon"
    expected: "Gantt view entry visible with horizontal-bar icon, able to create a new Gantt view"
    why_human: "View picker UI and icon rendering require a running browser"
  - test: "Create a table with Name (text), Start Date (date), End Date (date) fields. Add 4 records with different date ranges. Create a Gantt view. Open the options panel (Settings button in toolbar). Set Start Field → Start Date, End Field → End Date, Title Field → Name. Verify bars appear at correct horizontal positions."
    expected: "Each record shows as a colored horizontal bar. Bar left edge aligns with start date, right edge with end date. Bar label shows the Name field value."
    why_human: "Bar position correctness depends on pixel math and calendar display — cannot be verified without running the app"
  - test: "Add a record with the same start and end date (e.g., 2026-06-15 to 2026-06-15). Verify it renders as a diamond milestone marker, not a bar."
    expected: "Zero-duration record shows as a rotated yellow square (diamond) at the start date position"
    why_human: "Visual distinction between bar and milestone requires human visual inspection"
  - test: "Add a text field 'Dependencies' to the table. Fill it with another record's ID. In GanttOptionsPanel set Dependency Field → Dependencies. Verify an arrow renders between the two records' bars."
    expected: "SVG cubic bezier arrow drawn from the right edge of the predecessor bar to the left edge of the dependent bar"
    why_human: "SVG arrow rendering requires visual inspection"
  - test: "Enable 'Critical Path' in the options panel. Verify that bars on the critical path turn red."
    expected: "At least one bar highlighted in red (bg-red-500) when dependencies exist and showCriticalPath is enabled"
    why_human: "Color change requires visual inspection in the browser"
  - test: "Drag a bar horizontally by several days. Release it. Reload the page. Verify the record's start and end dates updated in the table."
    expected: "After drag-and-drop, the record's date fields reflect the new dates. The bar re-renders at the new position on page reload."
    why_human: "Drag interactions and record persistence require live browser testing"
  - test: "Drag the right edge of a bar to change only the end date. Verify the start date does not change."
    expected: "Only the end date field updates in the record. Start date is unchanged."
    why_human: "Resize-right vs resize-left behavior requires live drag testing"
  - test: "Click the Day / Week / Month / Quarter toolbar buttons. Verify bars reposition correctly at each zoom level."
    expected: "At 'Day' scale bars are wide. At 'Quarter' scale bars are narrow and further apart. Today's vertical line repositions accordingly."
    why_human: "Scale changes affect pixel math — visual verification required"
  - test: "Click the 'Today' button in the toolbar. Verify the timeline scrolls to position today's date in the viewport."
    expected: "Timeline scrolls so today's red dashed vertical line is visible in the viewport"
    why_human: "Scroll behavior requires a running browser"
---

# Phase 05: Gantt View with Milestones — Verification Report

**Phase Goal:** Gantt view type for Teable — date range bars, milestone markers, dependency arrows, critical path highlighting, drag-to-reschedule
**Verified:** 2026-05-20T22:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | ViewType enum contains `Gantt = 'gantt'` | VERIFIED | `packages/core/src/models/view/constant.ts` contains `Gantt = 'gantt'` |
| 2 | ganttViewOptionSchema validates all 9 option fields with correct defaults | VERIFIED | `gantt-view-option.schema.ts` exists; 15 passing unit tests in `gantt-view-option.schema.spec.ts` |
| 3 | IGanttView interface and GanttViewCore class exist in @teable/core | VERIFIED | `packages/core/src/models/view/derivate/gantt.view.ts` — `class GanttViewCore` |
| 4 | view.schema.ts optionsSchemaMap includes ViewType.Gantt | VERIFIED | `ganttViewOptionSchema` in `view.schema.ts` optionsSchemaMap |
| 5 | option.schema.ts viewOptionsSchema union and validateOptionsType switch handle ViewType.Gantt | VERIFIED | Both `ganttViewOptionSchema` union membership and `ViewType.Gantt` case confirmed |
| 6 | SDK GanttView class with updateOption exists and is wired into factory | VERIFIED | `packages/sdk/src/model/view/gantt.view.ts` — `class GanttView`; factory.ts has `case ViewType.Gantt` |
| 7 | Backend factory handles ViewType.Gantt without assertNever crash | VERIFIED | `apps/nestjs-backend/src/features/view/model/factory.ts` has `case ViewType.Gantt: return plainToInstance(GanttViewDto, viewVo)` |
| 8 | Backend validates startField/endField are date-type fields on Gantt view creation | VERIFIED | `view-option-validate.ts` — `validateGanttViewOptions` checks FieldType.Date/CreatedTime/LastModifiedTime; called in `view.service.ts` |
| 9 | All 16 Gantt frontend component files exist in the `gantt/` directory | VERIFIED | All files present: GanttView, GanttViewBase, type.ts, util.ts, context, 3 hooks, 5 components, GanttOptionsPanel, useGanttDrag |
| 10 | Task bars position correctly using dateToPixel from util.ts | VERIFIED | `GanttBar.tsx` uses `dateToPixel(bar.startDate, ...)` and `barWidth(...)` for left/width CSS; `util.ts` has `dateToPixel` |
| 11 | Zero-duration records render as diamond milestone markers | VERIFIED | `GanttMilestone.tsx` uses 16x16 div with `transform: rotate(45deg)` — rotated square diamond |
| 12 | Sidebar shows record names synchronized with timeline scroll | VERIFIED | `GanttSidebar.tsx` receives `scrollTop` prop and applies to inner ref; `GanttViewBase.tsx` passes `sidebarScrollTop` state |
| 13 | Toolbar shows Day/Week/Month/Quarter scale buttons and Today button | VERIFIED | `GanttToolbar.tsx` has all 4 scale buttons plus "Today" button, Weekends checkbox, Critical Path checkbox |
| 14 | Dependency arrows render as SVG lines between connected bars | VERIFIED | `GanttDependencyArrow.tsx` renders SVG with `<path>` elements using `dependencyPath` bezier curves |
| 15 | Critical path bars are visually distinct when showCriticalPath is enabled | VERIFIED | `GanttBar.tsx` applies `bg-red-500` when `bar.isCriticalPath`; `useCriticalPath.ts` computes via Kahn topo sort; 7 algorithm unit tests pass |
| 16 | GanttOptionsPanel renders field pickers for all 5 configurable fields, wired to view.updateOption | VERIFIED | `GanttOptionsPanel.tsx` has pickers for startField/endField/titleField/dependencyField/colorField; calls `view.updateOption` on change |
| 17 | Drag-to-reschedule (move + resize) updates record dates via useUpdateRecord | VERIFIED | `useGanttDrag.ts` implements startMove/startResizeLeft/startResizeRight calling updateRecord on mouseup |

**Score:** 17/17 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/core/src/models/view/constant.ts` | ViewType.Gantt enum member | VERIFIED | Contains `Gantt = 'gantt'` |
| `packages/core/src/models/view/derivate/gantt-view-option.schema.ts` | Zod schema for 9 Gantt option fields | VERIFIED | `ganttViewOptionSchema` exported, all 9 fields with defaults |
| `packages/core/src/models/view/derivate/gantt.view.ts` | IGanttView interface + GanttViewCore class | VERIFIED | Both exported |
| `packages/core/src/models/view/derivate/index.ts` | Exports gantt.view + schema | VERIFIED | `export * from './gantt.view'` + `export * from './gantt-view-option.schema'` |
| `packages/sdk/src/model/view/gantt.view.ts` | SDK GanttView model with updateOption | VERIFIED | `class GanttView` with `async updateOption(...)` |
| `packages/sdk/src/model/view/factory.ts` | ViewType.Gantt case | VERIFIED | `case ViewType.Gantt: return plainToInstance(GanttView, view)` |
| `apps/nestjs-backend/src/features/view/model/gantt-view.dto.ts` | GanttViewDto extending GanttViewCore | VERIFIED | `class GanttViewDto extends GanttViewCore` |
| `apps/nestjs-backend/src/features/view/model/factory.ts` | ViewType.Gantt case in backend factory | VERIFIED | `case ViewType.Gantt: return plainToInstance(GanttViewDto, viewVo)` |
| `apps/nestjs-backend/src/features/view/model/view-option-validate.ts` | validateGanttViewOptions function | VERIFIED | Full implementation with prisma field lookup and BadRequestException |
| `apps/nextjs-app/src/features/app/blocks/view/gantt/GanttView.tsx` | Top-level Gantt entry component | VERIFIED | Uses GanttViewBase, GanttProvider, hooks |
| `apps/nextjs-app/src/features/app/blocks/view/gantt/GanttViewBase.tsx` | Core Gantt chart (sidebar + timeline canvas) | VERIFIED | Contains GanttSidebar, GanttBar, GanttMilestone, GanttDependencyArrow |
| `apps/nextjs-app/src/features/app/blocks/view/gantt/util.ts` | dateToPixel, pixelToDate, barWidth, dependencyPath | VERIFIED | All 4 functions present |
| `apps/nextjs-app/src/features/app/blocks/view/gantt/hooks/useCriticalPath.ts` | Kahn topo sort + computeCriticalPath export | VERIFIED | `export function computeCriticalPath` extracted and tested |
| `apps/nextjs-app/src/features/app/blocks/view/gantt/components/GanttOptionsPanel.tsx` | 5 field pickers + 3 toggles | VERIFIED | startField/endField/titleField/dependencyField/colorField pickers confirmed |
| `apps/nextjs-app/src/features/app/blocks/view/gantt/hooks/useGanttDrag.ts` | Drag logic: move, resize, dependency | VERIFIED | startMove/startResizeLeft/startResizeRight/startDependency + updateRecord |
| `apps/nextjs-app/src/features/app/blocks/view/View.tsx` | ViewType.Gantt case → GanttView | VERIFIED | `case ViewType.Gantt: return <GanttView />` |
| `apps/nextjs-app/src/features/app/blocks/view/constant.ts` | GanttChart in VIEW_ICON_MAP | VERIFIED | `[ViewType.Gantt]: GanttChart` |
| `apps/nextjs-app/src/features/app/blocks/table/table-header/AddView.tsx` | Gantt entry in viewInfoList | VERIFIED | ViewType.Gantt entry with icon and i18n key |
| `packages/icons/src/components/GanttChart.tsx` | GanttChart SVG icon component | VERIFIED | Component with 4 horizontal bar SVG rects |
| `packages/icons/src/index.ts` | GanttChart exported | VERIFIED | `export { default as GanttChart } from './components/GanttChart'` |
| `packages/core/src/models/view/derivate/__tests__/gantt-view-option.schema.spec.ts` | Zod schema unit tests | VERIFIED | 15 passing tests (valid options, missing required fields, invalid timeScale) |
| `apps/nextjs-app/src/features/app/blocks/view/gantt/__tests__/critical-path.spec.ts` | Critical path algorithm unit tests | VERIFIED | 7 passing tests (linear chain, diamond DAG, empty deps, cycle handling) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `View.tsx` | `GanttView` | `case ViewType.Gantt: return <GanttView />` | WIRED | Confirmed in View.tsx switch statement |
| `GanttView.tsx` | `GanttProvider` | Direct wrapping | WIRED | `<GanttProvider ganttOptions={...} bars={...} dependencies={...} criticalPathIds={...}>` |
| `GanttView.tsx` | `useGanttRecords` | Hook call with ganttOptions | WIRED | `const { bars } = useGanttRecords(ganttOptions)` |
| `useGanttRecords` | `useRecords` (SDK) | Import from @teable/sdk/hooks | WIRED | `const { records } = useRecords()` |
| `GanttDependencyArrow` | dependencies array | Props from context | WIRED | `dependencies` prop drives SVG path rendering |
| `GanttOptionsPanel` | `view.updateOption()` | Direct call on field change | WIRED | `view.updateOption({ [key]: value })` on every picker change |
| `view.service.ts` | `validateGanttViewOptions` | Called on Gantt view create | WIRED | `await validateGanttViewOptions(tableId, viewRo.options, this.prismaService)` |
| `view-option-validate.ts` | `prisma.txClient().field.findMany` | DB field type query | WIRED | Queries all fields for tableId, checks date types |
| `useGanttDrag.ts` | `updateRecord` | Called on mouseup after drag | WIRED | Record dates updated via `updateRecord(tableId, recordId, { [startField]: ... })` |
| `SDK constant.ts` | `GanttChart` icon | `VIEW_ICON_MAP[ViewType.Gantt]` | WIRED | `packages/sdk/src/components/view/constant.ts` has entry |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `GanttView.tsx` | `bars` | `useGanttRecords(ganttOptions)` → `useRecords()` from @teable/sdk | Yes — SDK hook reads real records from store | FLOWING |
| `GanttBar.tsx` | `left`, `width` | `dateToPixel(bar.startDate, ...)` + `barWidth(...)` from util.ts | Yes — computed from real record date values | FLOWING |
| `GanttContext.tsx` | `timelineStart`, `timelineEnd` | Computed from `bars` array min/max dates | Yes — derived from real record data | FLOWING |
| `GanttOptionsPanel.tsx` | field options | `useView() as GanttViewModel` then `view.options` | Yes — reads real view options from SDK | FLOWING |
| `useGanttDependencies.ts` | `dependencies` | Record cell values for `dependencyField`, filtered by `validRecordIds` | Yes — reads live record field values | FLOWING |
| `useCriticalPath.ts` | `criticalPathIds` | Kahn topo sort on `bars` + `dependencies` | Yes — computed from real bar data | FLOWING |

### Behavioral Spot-Checks

Step 7b: SKIPPED for browser-rendered React components — no CLI entry points to test rendering without a running dev server.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|------------|-------------|-------------|--------|---------|
| PHASE05-GANTT-TYPE | 05-01, 05-05 | ViewType.Gantt enum value | SATISFIED | `constant.ts` has `Gantt = 'gantt'` |
| PHASE05-GANTT-OPTIONS-SCHEMA | 05-01, 05-05 | 9-field Zod schema with defaults | SATISFIED | `gantt-view-option.schema.ts` with all 9 fields |
| PHASE05-GANTT-VIEW-CLASS | 05-01, 05-05 | IGanttView interface + GanttViewCore class | SATISFIED | Both exported from `gantt.view.ts` |
| PHASE05-BACKEND-VALIDATION | 05-02, 05-06 | startField/endField must be date type | SATISFIED | `validateGanttViewOptions` enforces date type check |
| PHASE05-GANTT-CREATE-API | 05-02, 05-06 | POST /view creates Gantt with valid options | SATISFIED | `view.service.ts` calls validator before DB write |
| PHASE05-GANTT-UI-COMPONENT | 05-03 | GanttView component renders timeline | SATISFIED | 16-file gantt/ directory with full component tree |
| PHASE05-GANTT-TIMELINE-BARS | 05-03 | Bars positioned by date math | SATISFIED | `GanttBar.tsx` uses `dateToPixel` + `barWidth` |
| PHASE05-GANTT-MILESTONES | 05-03 | Diamond markers for zero-duration records | SATISFIED | `GanttMilestone.tsx` with rotate(45deg) diamond |
| PHASE05-GANTT-SIDEBAR | 05-03 | Left sidebar synchronized with scroll | SATISFIED | `GanttSidebar.tsx` with scrollTop sync via ref |
| PHASE05-GANTT-TOOLBAR | 05-03 | Scale buttons + Today + toggles | SATISFIED | `GanttToolbar.tsx` with all 4 scales + Today + checkboxes |
| PHASE05-GANTT-DEPENDENCY-ARROWS | 05-03 | SVG arrows between bars | SATISFIED | `GanttDependencyArrow.tsx` renders SVG cubic bezier paths |
| PHASE05-CRITICAL-PATH | 05-03 | Critical path highlighting | SATISFIED | `useCriticalPath.ts` Kahn algorithm + red bar styling |
| PHASE05-VIEW-REGISTRATION | 05-03, 05-07 | Gantt accessible from view switcher | SATISFIED | `View.tsx` router + `AddView.tsx` picker + icon |
| PHASE05-OPTIONS-PANEL | 05-04 | Field pickers panel for configuration | SATISFIED | `GanttOptionsPanel.tsx` with 5 pickers + 3 toggles |
| PHASE05-DRAG-RESCHEDULE | 05-04 | Drag bar to update dates | SATISFIED | `useGanttDrag.ts` move/resize calls `updateRecord` |
| PHASE05-DRAG-DEPENDENCY | 05-04 | Drag from connector dot to create dependency | SATISFIED | `useGanttDrag.ts` startDependency + hit-test + field write |
| PHASE05-END-TO-END | 05-08 | Unit tests for schema + critical path | SATISFIED | 15 schema tests + 7 critical path tests pass |

All 17 requirements claimed across the 8 plans are accounted for.

**Orphaned requirements check:** No REQUIREMENTS.md file exists in `.planning/` — requirements are defined entirely within plan frontmatter. No orphaned requirements detected.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `GanttOptionsPanel.tsx:114` | 114 | `placeholder="Select field..."` | INFO | UI placeholder text in Select element — expected UX behavior, not a code stub |
| `GanttView.tsx:48` | 48 | `if (!isHydrated) return null` | INFO | Standard hydration guard — correct React SSR pattern, not a stub |
| `GanttViewBase.tsx:162` | 162 | `if (ghost.isMilestone) return null` | INFO | Ghost bars for milestones during drag — intentional skip, milestone drag not applicable |
| `GanttDependencyArrow.tsx:51` | 51 | `if (dependencies.length === 0) return null` | INFO | Early return for empty deps — correct optimization |
| `useGanttDependencies.ts:19,22` | 19,22 | `return []` | INFO | Early returns when no dependencyField configured — correct default behavior |
| `useGanttRecords.ts:26` | 26 | `return []` when no startField/endField | INFO | Returns empty bars when options not configured yet — correct initialization behavior |

No blockers or warnings found. All `return null/[]` cases have clear, correct conditional guards and do not represent stubs.

### Human Verification Required

All 17 automated truths are VERIFIED. The following items require human testing in a running browser because they involve visual rendering, drag interactions, and real-time behavior:

**1. Gantt view appears in Add View picker with correct icon**
- Test: Start dev server, navigate to a table, click Add View
- Expected: "Gantt view" entry with GanttChart icon visible
- Why human: UI picker rendering requires running browser

**2. Task bars render at correct horizontal positions**
- Test: Create table with Name/Start Date/End Date fields, create Gantt view, configure field options
- Expected: Bars align with start/end dates on the timeline
- Why human: Pixel math correctness requires visual verification

**3. Zero-duration record shows as diamond milestone**
- Test: Add a record with same start and end date
- Expected: Rotated yellow square (diamond) marker, not a bar
- Why human: Visual distinction requires browser inspection

**4. Dependency arrows render between records**
- Test: Set dependency field, add record ID to dependency text field
- Expected: SVG bezier arrow visible between the two bars
- Why human: SVG rendering requires browser

**5. Critical path bars turn red when showCriticalPath enabled**
- Test: Enable Critical Path toggle with dependencies set up
- Expected: Bars on longest path show as red
- Why human: Color change requires visual inspection

**6. Drag-to-reschedule updates record dates**
- Test: Drag a bar horizontally, verify dates update in table
- Expected: Record's date fields reflect new dates after drag
- Why human: Drag interaction requires live browser testing

**7. Resize handles change only one date edge**
- Test: Drag right edge of bar
- Expected: Only end date changes, start date unchanged
- Why human: Edge resize behavior requires live drag testing

**8. Time scale switcher repositions bars correctly**
- Test: Click Day / Week / Month / Quarter buttons
- Expected: Bars reposition at each zoom level
- Why human: Scale changes affect pixel rendering

**9. Today button scrolls timeline to today**
- Test: Click "Today" button
- Expected: Today's vertical line becomes visible in viewport
- Why human: Scroll behavior requires running browser

### Gaps Summary

No gaps found. All 17 observable truths are verified at all four levels:
- Level 1: All artifacts exist
- Level 2: All artifacts have substantive, non-stub implementations
- Level 3: All key links are wired (imports, calls, data passed correctly)
- Level 4: Data flows from real SDK hooks (useRecords, useFields, useView) through the rendering pipeline

The 9 human verification items above are standard UI/interaction behaviors that cannot be verified programmatically. They do not represent code gaps — the implementations are substantively complete.

### Commits Verified

All commits referenced in summaries confirmed to exist in git log:

| Commit | Plan | Description |
|--------|------|-------------|
| 444263e | 05-01 | feat: add ViewType.Gantt + schema + GanttViewCore |
| 7f3b3f1 | 05-01 | feat: wire GanttView into view union types |
| 734e26c | 05-02 | feat: create GanttViewDto + wire factory |
| 4793a3f | 05-02 | feat: add Gantt view option validator |
| 7a017b6 | 05-02 | test: backend unit tests for Gantt validation |
| 61b8fb2 | 05-03 | feat: Gantt type contracts, hooks, context |
| 97c856a | 05-03 | feat: GanttView assembly + SDK factory |
| c41d80a | 05-04 | feat: GanttOptionsPanel + useGanttDrag |
| 5a95eee | 05-05 | feat: SDK GanttView model + factory wiring |
| 08429d3 | 05-06 | feat: GanttViewDto + backend factory case |
| a3ee10a | 05-06 | feat: validateGanttViewOptions + service wiring |
| b018718 | 05-07 | feat: GanttChart icon component |
| e3b5f0f | 05-07 | feat: wire Gantt into View.tsx + constant.ts + AddView |
| bd86728 | 05-08 | test: Zod schema unit tests |
| faa5a63 | 05-08 | test: critical path algorithm extraction + tests |

---

_Verified: 2026-05-20T22:00:00Z_
_Verifier: Claude (gsd-verifier)_
