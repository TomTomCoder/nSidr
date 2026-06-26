import { useMemo } from 'react';
import type { GanttBarItem, GanttDependency } from '../type';
import { barWidth, dateToPixel, ROW_HEIGHT } from '../util';
import { dependencyPath } from '../util';

interface IGanttDependencyArrowProps {
  dependencies: GanttDependency[];
  bars: GanttBarItem[];
  timelineStart: Date;
  timeScale: string;
  canvasWidth: number;
  canvasHeight: number;
}

export const GanttDependencyArrow = ({
  dependencies,
  bars,
  timelineStart,
  timeScale,
  canvasWidth,
  canvasHeight,
}: IGanttDependencyArrowProps) => {
  const barMap = useMemo(() => {
    const map = new Map<string, GanttBarItem>();
    for (const bar of bars) map.set(bar.recordId, bar);
    return map;
  }, [bars]);

  const paths = useMemo(() => {
    return dependencies.map((dep) => {
      const fromBar = barMap.get(dep.fromRecordId);
      const toBar = barMap.get(dep.toRecordId);
      if (!fromBar || !toBar) return null;

      const fromX =
        dateToPixel(fromBar.startDate, timelineStart, timeScale) +
        barWidth(fromBar.startDate, fromBar.endDate, timeScale);
      const fromY = fromBar.rowIndex * ROW_HEIGHT + ROW_HEIGHT / 2;

      const toX = dateToPixel(toBar.startDate, timelineStart, timeScale);
      const toY = toBar.rowIndex * ROW_HEIGHT + ROW_HEIGHT / 2;

      return {
        // Record IDs used only as React keys (never as innerHTML) — no XSS surface (T-05-10)
        key: `${dep.fromRecordId}-${dep.toRecordId}`,
        d: dependencyPath({ x: fromX, y: fromY }, { x: toX, y: toY }),
      };
    });
  }, [dependencies, barMap, timelineStart, timeScale]);

  if (dependencies.length === 0) return null;

  return (
    <svg
      className="pointer-events-none absolute left-0 top-0"
      width={canvasWidth}
      height={canvasHeight}
      style={{ overflow: 'visible' }}
    >
      <defs>
        <marker
          id="gantt-arrow"
          markerWidth="6"
          markerHeight="6"
          refX="5"
          refY="3"
          orient="auto"
        >
          <path d="M0,0 L6,3 L0,6 Z" fill="gray" />
        </marker>
      </defs>
      {paths.map((p) =>
        p ? (
          <path
            key={p.key}
            d={p.d}
            stroke="gray"
            strokeWidth="1.5"
            fill="none"
            markerEnd="url(#gantt-arrow)"
          />
        ) : null
      )}
    </svg>
  );
};
