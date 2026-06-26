import type { IGanttViewOptions } from '@teable/core';
import { RecordProvider } from '@teable/sdk/context';
import { useIsHydrated, useView } from '@teable/sdk/hooks';
import type { GanttView as GanttViewModel } from '@teable/sdk/model';
import { useCallback, useMemo } from 'react';
import { GanttToolbar } from './components/GanttToolbar';
import { GanttProvider } from './context/GanttContext';
import { GanttViewBase } from './GanttViewBase';
import { useCriticalPath } from './hooks/useCriticalPath';
import { useGanttDependencies } from './hooks/useGanttDependencies';
import { useGanttRecords } from './hooks/useGanttRecords';

const DEFAULT_OPTIONS: IGanttViewOptions = {
  startField: '',
  endField: '',
  milestoneThreshold: 0,
  showCriticalPath: false,
  showWeekends: true,
  timeScale: 'week',
};

const GanttViewInner = () => {
  const view = useView() as GanttViewModel | undefined;
  const isHydrated = useIsHydrated();

  const ganttOptions: IGanttViewOptions = useMemo(
    () => (view?.options ? { ...DEFAULT_OPTIONS, ...view.options } : DEFAULT_OPTIONS),
    [view]
  );

  const { bars } = useGanttRecords(ganttOptions);

  const validRecordIds = useMemo(() => new Set(bars.map((b) => b.recordId)), [bars]);

  const { dependencies } = useGanttDependencies(ganttOptions, validRecordIds);

  const { criticalPathIds } = useCriticalPath(bars, dependencies, ganttOptions);

  const handleOptionsChange = useCallback(
    async (partial: Partial<IGanttViewOptions>) => {
      if (view) {
        await view.updateOption({ ...ganttOptions, ...partial });
      }
    },
    [view, ganttOptions]
  );

  if (!isHydrated) return null;

  return (
    <GanttProvider
      ganttOptions={ganttOptions}
      bars={bars}
      dependencies={dependencies}
      criticalPathIds={criticalPathIds}
    >
      <div className="flex h-full w-full flex-col overflow-hidden">
        <GanttToolbar ganttOptions={ganttOptions} onOptionsChange={handleOptionsChange} />
        <div className="flex-1 overflow-hidden">
          <GanttViewBase />
        </div>
      </div>
    </GanttProvider>
  );
};

export const GanttView = () => {
  return (
    <RecordProvider>
      <GanttViewInner />
    </RecordProvider>
  );
};
