import { useTableId } from '@teable/sdk/hooks';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GanttBar } from './components/GanttBar';
import { GanttDependencyArrow } from './components/GanttDependencyArrow';
import { GanttMilestone } from './components/GanttMilestone';
import { GanttSidebar } from './components/GanttSidebar';
import { useGanttContext } from './context/GanttContext';
import { useGanttDrag } from './hooks/useGanttDrag';
import { ROW_HEIGHT, dateToPixel, generateTimelineColumns, formatColumnLabel } from './util';

const HEADER_HEIGHT = 40;

export const GanttViewBase = () => {
  const {
    ganttOptions,
    timelineStart,
    timelineEnd,
    bars,
    dependencies,
    criticalPathIds,
    permission,
    hasCycle,
    setSelectedRecordId,
    setExpandRecordId,
  } = useGanttContext();

  const tableId = useTableId() ?? '';

  const timeScale = ganttOptions.timeScale ?? 'week';
  const [sidebarScrollTop, setSidebarScrollTop] = useState(0);
  const timelineRef = useRef<HTMLDivElement>(null);

  const columns = useMemo(
    () => generateTimelineColumns(timelineStart, timelineEnd, timeScale),
    [timelineStart, timelineEnd, timeScale]
  );

  const canvasWidth = useMemo(
    () => dateToPixel(timelineEnd, timelineStart, timeScale),
    [timelineEnd, timelineStart, timeScale]
  );
  const canvasHeight = Math.max(bars.length * ROW_HEIGHT, 100);

  const today = new Date();
  const todayX = dateToPixel(today, timelineStart, timeScale);

  const barsWithCriticalPath = useMemo(
    () => bars.map((b) => ({ ...b, isCriticalPath: criticalPathIds.has(b.recordId) })),
    [bars, criticalPathIds]
  );

  const drag = useGanttDrag({
    bars: barsWithCriticalPath,
    ganttOptions,
    tableId,
    timelineStart,
    timeScale,
  });

  // Replace bars being dragged with ghost positions
  const displayBars = useMemo(
    () =>
      barsWithCriticalPath.map((bar) => {
        const ghost = drag.pendingGhostBars.find((g) => g.recordId === bar.recordId);
        return ghost ?? bar;
      }),
    [barsWithCriticalPath, drag.pendingGhostBars]
  );

  // Window-level mouse event handlers for drag (T-05-14: cleaned up on unmount)
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => drag.onMouseMove(e);
    const handleMouseUp = (e: MouseEvent) => drag.onMouseUp(e);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [drag]);

  const handleScroll = useCallback(() => {
    if (timelineRef.current) {
      setSidebarScrollTop(timelineRef.current.scrollTop);
    }
  }, []);

  const handleBarClick = useCallback(
    (recordId: string) => {
      setSelectedRecordId(recordId);
      setExpandRecordId(recordId);
    },
    [setSelectedRecordId, setExpandRecordId]
  );

  // Show message if fields not configured
  const hasRequiredFields = !!(ganttOptions.startField && ganttOptions.endField);

  if (!hasRequiredFields) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-background">
        <div className="flex max-w-md flex-col items-center gap-4 rounded-lg border border-border bg-card p-8 text-center">
          <div className="text-sm text-muted-foreground">
            <p className="mb-2 font-medium">Configure Gantt View</p>
            <p className="mb-4 text-xs">
              Click the Settings button in the toolbar to select start date and end date fields.
            </p>
            <p className="text-xs">
              Your table must have at least one date/datetime field to use Gantt view.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      {hasCycle && ganttOptions.showCriticalPath && (
        <div className="shrink-0 border-b border-border bg-amber-50 px-3 py-1 text-xs text-amber-700 dark:bg-amber-950 dark:text-amber-400">
          Circular dependency detected — critical path may be incomplete.
        </div>
      )}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Sidebar */}
        <GanttSidebar bars={barsWithCriticalPath} scrollTop={sidebarScrollTop} />

        {/* Timeline area */}
        <div ref={timelineRef} className="flex-1 overflow-auto" onScroll={handleScroll}>
          {/* Header row */}
          <div
            className="sticky top-0 z-10 flex border-b border-border bg-background"
            style={{ height: HEADER_HEIGHT, minWidth: canvasWidth }}
          >
            {columns.map((col, i) => (
              <div
                key={i}
                className="flex shrink-0 items-center border-r border-border px-1 text-xs text-muted-foreground"
                style={{
                  width:
                    i < columns.length - 1
                      ? dateToPixel(columns[i + 1], timelineStart, timeScale) -
                        dateToPixel(col, timelineStart, timeScale)
                      : 60,
                }}
              >
                {formatColumnLabel(col, timeScale)}
              </div>
            ))}
          </div>

          {/* Canvas */}
          <div className="group relative" style={{ width: canvasWidth, height: canvasHeight }}>
            {/* Today line */}
            {todayX >= 0 && todayX <= canvasWidth && (
              <div
                className="absolute top-0 z-10 border-l-2 border-dashed border-red-500"
                style={{ left: todayX, height: canvasHeight }}
              />
            )}

            {/* Dependency arrows (behind bars) */}
            <GanttDependencyArrow
              dependencies={dependencies}
              bars={barsWithCriticalPath}
              timelineStart={timelineStart}
              timeScale={timeScale}
              canvasWidth={canvasWidth}
              canvasHeight={canvasHeight}
            />

            {/* Bars and milestones */}
            {displayBars.map((bar) =>
              bar.isMilestone ? (
                <GanttMilestone
                  key={bar.recordId}
                  bar={bar}
                  timelineStart={timelineStart}
                  timeScale={timeScale}
                  onClick={handleBarClick}
                />
              ) : (
                <GanttBar
                  key={bar.recordId}
                  bar={bar}
                  timelineStart={timelineStart}
                  timeScale={timeScale}
                  onClick={handleBarClick}
                  drag={
                    permission.barDraggable ||
                    permission.barResizable ||
                    permission.dependencyEditable
                      ? drag
                      : undefined
                  }
                  allowResize={permission.barResizable}
                  allowDependency={permission.dependencyEditable}
                />
              )
            )}

            {/* Ghost bars — semi-transparent overlay during drag */}
            {drag.pendingGhostBars.map((ghost) => {
              if (ghost.isMilestone) return null;
              return (
                <div key={`ghost-${ghost.recordId}`} className="pointer-events-none opacity-50">
                  <GanttBar
                    bar={ghost}
                    timelineStart={timelineStart}
                    timeScale={timeScale}
                    onClick={() => {
                      // Ghost bar: non-interactive
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
