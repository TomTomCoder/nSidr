import type { IGanttViewOptions } from '@teable/core';
import { RecordProvider } from '@teable/sdk/context';
import { useIsHydrated, useView, useFields } from '@teable/sdk/hooks';
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
  const allFields = useFields({ withHidden: true });

  // Sanitize options: remove field references that don't exist
  const ganttOptions: IGanttViewOptions = useMemo(() => {
    const opts = view?.options ? { ...DEFAULT_OPTIONS, ...view.options } : DEFAULT_OPTIONS;
    const fieldIds = new Set(allFields.map((f) => f.id));

    // Clear fields that don't exist in the table
    if (opts.startField && !fieldIds.has(opts.startField)) {
      opts.startField = '';
    }
    if (opts.endField && !fieldIds.has(opts.endField)) {
      opts.endField = '';
    }
    if (opts.titleField && !fieldIds.has(opts.titleField)) {
      opts.titleField = undefined;
    }
    if (opts.dependencyField && !fieldIds.has(opts.dependencyField)) {
      opts.dependencyField = undefined;
    }
    if (opts.colorField && !fieldIds.has(opts.colorField)) {
      opts.colorField = undefined;
    }

    return opts;
  }, [view, allFields]);

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
