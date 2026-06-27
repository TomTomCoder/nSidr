import type { IGanttViewOptions } from '@teable/core';
import { ExpandRecorder } from '@teable/sdk/components';
import { useTableId, useView } from '@teable/sdk/hooks';
import type { IFieldInstance } from '@teable/sdk/model';
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { GanttBarItem, GanttDependency } from '../type';

export interface IGanttPermission {
  barDraggable: boolean;
  barResizable: boolean;
  dependencyEditable: boolean;
}

export interface IGanttContext {
  ganttOptions: IGanttViewOptions;
  startField?: IFieldInstance;
  endField?: IFieldInstance;
  titleField?: IFieldInstance;
  dependencyField?: IFieldInstance;
  colorField?: IFieldInstance;
  permission: IGanttPermission;
  hasCycle: boolean;
  timelineStart: Date;
  timelineEnd: Date;
  selectedRecordId: string | null;
  setSelectedRecordId: (id: string | null) => void;
  setExpandRecordId: (id: string | undefined) => void;
  bars: GanttBarItem[];
  dependencies: GanttDependency[];
  criticalPathIds: Set<string>;
}

export const GanttContext = createContext<IGanttContext>(null!);

interface GanttProviderProps {
  ganttOptions: IGanttViewOptions;
  startField?: IFieldInstance;
  endField?: IFieldInstance;
  titleField?: IFieldInstance;
  dependencyField?: IFieldInstance;
  colorField?: IFieldInstance;
  permission: IGanttPermission;
  hasCycle: boolean;
  bars: GanttBarItem[];
  dependencies: GanttDependency[];
  criticalPathIds: Set<string>;
  children: ReactNode;
}

export const GanttProvider = ({
  ganttOptions,
  startField,
  endField,
  titleField,
  dependencyField,
  colorField,
  permission,
  hasCycle,
  bars,
  dependencies,
  criticalPathIds,
  children,
}: GanttProviderProps) => {
  const tableId = useTableId();
  const view = useView();
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [expandRecordId, setExpandRecordId] = useState<string | undefined>();

  const timelineStart = useMemo(() => {
    if (bars.length === 0) {
      const d = new Date();
      d.setDate(d.getDate() - 14);
      return d;
    }
    const earliest = bars.reduce(
      (min, b) => (b.startDate < min ? b.startDate : min),
      bars[0].startDate
    );
    const d = new Date(earliest);
    d.setDate(d.getDate() - 14);
    return d;
  }, [bars]);

  const timelineEnd = useMemo(() => {
    if (bars.length === 0) {
      const d = new Date();
      d.setDate(d.getDate() + 14);
      return d;
    }
    const latest = bars.reduce(
      (max, b) => (b.endDate > max ? b.endDate : max),
      bars[0].endDate
    );
    const d = new Date(latest);
    d.setDate(d.getDate() + 14);
    return d;
  }, [bars]);

  const value = useMemo(
    () => ({
      ganttOptions,
      startField,
      endField,
      titleField,
      dependencyField,
      colorField,
      permission,
      hasCycle,
      timelineStart,
      timelineEnd,
      selectedRecordId,
      setSelectedRecordId,
      setExpandRecordId,
      bars,
      dependencies,
      criticalPathIds,
    }),
    [
      ganttOptions,
      startField,
      endField,
      titleField,
      dependencyField,
      colorField,
      permission,
      hasCycle,
      timelineStart,
      timelineEnd,
      selectedRecordId,
      bars,
      dependencies,
      criticalPathIds,
    ]
  );

  return (
    <GanttContext.Provider value={value}>
      {children}
      {tableId && (
        <ExpandRecorder
          tableId={tableId}
          viewId={view?.id}
          recordId={expandRecordId}
          recordIds={expandRecordId ? [expandRecordId] : []}
          onClose={() => setExpandRecordId(undefined)}
        />
      )}
    </GanttContext.Provider>
  );
};

export const useGanttContext = (): IGanttContext => {
  const ctx = useContext(GanttContext);
  if (!ctx) throw new Error('useGanttContext must be used within GanttProvider');
  return ctx;
};
