import { cn } from '@teable/ui-lib/shadcn';
import { useMemo } from 'react';
import type { GanttBarItem } from '../type';
import { dateToPixel, ROW_HEIGHT } from '../util';

interface IGanttMilestoneProps {
  bar: GanttBarItem;
  timelineStart: Date;
  timeScale: string;
  onClick: (recordId: string) => void;
}

export const GanttMilestone = ({
  bar,
  timelineStart,
  timeScale,
  onClick,
}: IGanttMilestoneProps) => {
  const left = useMemo(
    () => dateToPixel(bar.startDate, timelineStart, timeScale),
    [bar.startDate, timelineStart, timeScale]
  );

  const top = bar.rowIndex * ROW_HEIGHT + (ROW_HEIGHT - 16) / 2;

  const formattedDate = bar.startDate.toLocaleDateString();

  return (
    <div
      data-record-id={bar.recordId}
      className={cn(
        'absolute cursor-pointer transition-opacity hover:opacity-90',
        bar.isCriticalPath ? 'bg-red-500' : bar.color ? '' : 'bg-yellow-400'
      )}
      style={{
        left: left - 8,
        top,
        width: 16,
        height: 16,
        transform: 'rotate(45deg)',
        backgroundColor: !bar.isCriticalPath && bar.color ? bar.color : undefined,
      }}
      title={`${bar.title}\nDate: ${formattedDate}`}
      onClick={() => onClick(bar.recordId)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onClick(bar.recordId);
      }}
    />
  );
};
