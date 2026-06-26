import type { IGanttViewOptions, IGanttTimeScale } from '@teable/core';
import { Settings } from '@teable/icons';
import { Button, cn } from '@teable/ui-lib/shadcn';
import { GanttOptionsPanel } from './GanttOptionsPanel';

const TIME_SCALES: { value: IGanttTimeScale; label: string }[] = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'quarter', label: 'Quarter' },
];

interface IGanttToolbarProps {
  ganttOptions: IGanttViewOptions;
  onOptionsChange: (partial: Partial<IGanttViewOptions>) => void;
  onScrollToToday?: () => void;
}

export const GanttToolbar = ({
  ganttOptions,
  onOptionsChange,
  onScrollToToday,
}: IGanttToolbarProps) => {
  return (
    <div className="flex items-center gap-2 border-b border-border bg-background px-3 py-1.5">
      {/* Settings / Options panel trigger */}
      <GanttOptionsPanel>
        <Button size="xs" variant="outline" className="gap-1">
          <Settings className="size-3.5" />
          Settings
        </Button>
      </GanttOptionsPanel>

      <div className="mx-1 h-4 w-px bg-border" />

      {/* Time scale buttons */}
      <div className="flex items-center gap-0.5 rounded border border-border p-0.5">
        {TIME_SCALES.map(({ value, label }) => (
          <button
            key={value}
            className={cn(
              'rounded px-2 py-0.5 text-xs font-medium transition-colors',
              ganttOptions.timeScale === value
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted text-muted-foreground'
            )}
            onClick={() => onOptionsChange({ timeScale: value })}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Today button */}
      <Button size="xs" variant="outline" onClick={onScrollToToday}>
        Today
      </Button>

      <div className="mx-1 h-4 w-px bg-border" />

      {/* Weekends toggle */}
      <label className="flex cursor-pointer items-center gap-1.5 text-xs">
        <input
          type="checkbox"
          className="rounded"
          checked={ganttOptions.showWeekends}
          onChange={(e) => onOptionsChange({ showWeekends: e.target.checked })}
        />
        Weekends
      </label>

      {/* Critical path toggle */}
      <label className="flex cursor-pointer items-center gap-1.5 text-xs">
        <input
          type="checkbox"
          className="rounded"
          checked={ganttOptions.showCriticalPath}
          onChange={(e) => onOptionsChange({ showCriticalPath: e.target.checked })}
        />
        Critical Path
      </label>
    </div>
  );
};
