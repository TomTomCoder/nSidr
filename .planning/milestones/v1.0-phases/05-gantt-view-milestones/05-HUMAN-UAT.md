---
status: partial
phase: 05-gantt-view-milestones
source: [05-VERIFICATION.md]
started: 2026-05-20T22:10:00Z
updated: 2026-05-20T22:10:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Add View picker shows Gantt with icon
expected: Gantt view entry visible with horizontal-bar icon, able to create a new Gantt view
result: [pending]

### 2. Bars render at correct horizontal positions
expected: Each record shows as a colored horizontal bar. Bar left edge aligns with start date, right edge with end date. Bar label shows the Name field value.
result: [pending]

### 3. Diamond milestone markers for zero-duration records
expected: Zero-duration record shows as a rotated yellow square (diamond) at the start date position
result: [pending]

### 4. Dependency arrows render between connected bars
expected: SVG cubic bezier arrow drawn from the right edge of the predecessor bar to the left edge of the dependent bar
result: [pending]

### 5. Critical path bars highlighted in red
expected: At least one bar highlighted in red (bg-red-500) when dependencies exist and showCriticalPath is enabled
result: [pending]

### 6. Drag-to-reschedule updates record dates
expected: After drag-and-drop, the record's date fields reflect the new dates. The bar re-renders at the new position on page reload.
result: [pending]

### 7. Resize handle changes only one edge date
expected: Only the end date field updates in the record. Start date is unchanged.
result: [pending]

### 8. Time scale switcher repositions bars
expected: At 'Day' scale bars are wide. At 'Quarter' scale bars are narrow and further apart. Today's vertical line repositions accordingly.
result: [pending]

### 9. Today button scrolls timeline
expected: Timeline scrolls so today's red dashed vertical line is visible in the viewport
result: [pending]

## Summary

total: 9
passed: 0
issues: 0
pending: 9
skipped: 0
blocked: 0

## Gaps
