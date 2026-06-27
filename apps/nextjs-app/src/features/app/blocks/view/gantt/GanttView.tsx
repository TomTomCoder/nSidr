import type { IGanttViewOptions } from '@teable/core';
import { RecordProvider } from '@teable/sdk/context';
import { useIsHydrated, useView, useFields, useTablePermission } from '@teable/sdk/hooks';
import type { GanttView as GanttViewModel } from '@teable/sdk/model';
import { useCallback, useMemo } from 'react';
import { GanttToolbar } from './components/GanttToolbar';
import { GanttProvider } from './context/GanttContext';
import type { IGanttPermission } from './context/GanttContext';
import { GanttViewBase } from './GanttViewBase';
import { useCriticalPath } from './hooks/useCriticalPath';
import { useGanttDependencies } from './hooks/useGanttDependencies';
import { useGanttFields } from './hooks/useGanttFields';
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

  const { startField, endField, titleField, dependencyField, colorField } =
    useGanttFields(ganttOptions);

  const { bars } = useGanttRecords(ganttOptions, startField, endField, titleField, colorField);

  const validRecordIds = useMemo(() => new Set(bars.map((b) => b.recordId)), [bars]);

  const { dependencies } = useGanttDependencies(dependencyField, validRecordIds);

  const { criticalPathIds, hasCycle } = useCriticalPath(bars, dependencies, ganttOptions);

  const tablePermission = useTablePermission();

  const permission: IGanttPermission = useMemo(() => {
    const canUpdate = Boolean(tablePermission['record|update']);
    const startEditable = Boolean(startField && !startField.isComputed);
    const endEditable = Boolean(endField && !endField.isComputed);
    return {
      barDraggable: canUpdate && startEditable && endEditable,
      barResizable: canUpdate && (startEditable || endEditable),
      dependencyEditable: canUpdate && Boolean(dependencyField && !dependencyField.isComputed),
    };
  }, [tablePermission, startField, endField, dependencyField]);

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
      startField={startField}
      endField={endField}
      titleField={titleField}
      dependencyField={dependencyField}
      colorField={colorField}
      permission={permission}
      hasCycle={hasCycle}
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
