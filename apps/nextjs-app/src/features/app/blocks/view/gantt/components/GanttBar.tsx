import { cn } from '@teable/ui-lib/shadcn';
import { useMemo } from 'react';
import type { IUseGanttDragResult } from '../hooks/useGanttDrag';
import type { GanttBarItem } from '../type';
import { barWidth, dateToPixel, ROW_HEIGHT } from '../util';

interface IGanttBarProps {
  bar: GanttBarItem;
  timelineStart: Date;
  timeScale: string;
  onClick: (recordId: string) => void;
  drag?: IUseGanttDragResult;
  /** Show move/resize handles. Defaults to true when `drag` is provided. */
  allowResize?: boolean;
  /** Show the dependency connector dot. Defaults to true when `drag` is provided. */
  allowDependency?: boolean;
}

export const GanttBar = ({
  bar,
  timelineStart,
  timeScale,
  onClick,
  drag,
  allowResize = true,
  allowDependency = true,
}: IGanttBarProps) => {
  const left = useMemo(
    () => dateToPixel(bar.startDate, timelineStart, timeScale),
    [bar.startDate, timelineStart, timeScale]
  );

  const width = useMemo(
    () => barWidth(bar.startDate, bar.endDate, timeScale),
    [bar.startDate, bar.endDate, timeScale]
  );

  const top = bar.rowIndex * ROW_HEIGHT + (ROW_HEIGHT - 24) / 2;

  const formattedStart = bar.startDate.toLocaleDateString();
  const formattedEnd = bar.endDate.toLocaleDateString();

  return (
    <div
      data-record-id={bar.recordId}
      className={cn(
        'absolute flex cursor-pointer items-center overflow-visible rounded text-xs text-white shadow-sm',
        bar.isCriticalPath ? 'bg-red-500' : bar.color ? '' : 'bg-blue-500'
      )}
      style={{
        left,
        top,
        width: Math.max(width, 8),
        height: 24,
        backgroundColor: !bar.isCriticalPath && bar.color ? bar.color : undefined,
      }}
      title={`${bar.title}\nStart: ${formattedStart}\nEnd: ${formattedEnd}`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onClick(bar.recordId);
      }}
    >
      {/* Left resize handle */}
      {drag && allowResize && (
        <div
          className="absolute left-0 top-0 z-10 h-full w-2 cursor-ew-resize"
          onMouseDown={(e) => {
            e.stopPropagation();
            drag.startResizeLeft(bar, e);
          }}
        />
      )}

      {/* Bar body — triggers move drag */}
      <div
        className="flex h-full flex-1 items-center overflow-hidden px-1"
        onMouseDown={drag && allowResize ? (e) => drag.startMove(bar, e) : undefined}
        onClick={() => onClick(bar.recordId)}
      >
        <span className="truncate">{bar.title}</span>
      </div>

      {/* Right resize handle */}
      {drag && allowResize && (
        <div
          className="absolute right-0 top-0 z-10 h-full w-2 cursor-ew-resize"
          onMouseDown={(e) => {
            e.stopPropagation();
            drag.startResizeRight(bar, e);
          }}
        />
      )}

      {/* Right connector dot for dependency creation */}
      {drag && allowDependency && (
        <div
          className="absolute -right-2 top-1/2 z-20 size-2 -translate-y-1/2 cursor-crosshair rounded-full border border-blue-500 bg-white opacity-0 transition-opacity group-hover:opacity-100 hover:opacity-100"
          style={{ marginRight: -4 }}
          onMouseDown={(e) => {
            e.stopPropagation();
            drag.startDependency(bar, e);
          }}
        />
      )}
    </div>
  );
};
