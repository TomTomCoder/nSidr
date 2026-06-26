import type { IGanttViewOptions } from '@teable/core';
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { GanttBarItem, GanttDependency } from '../type';

export interface IGanttContext {
  ganttOptions: IGanttViewOptions;
  timelineStart: Date;
  timelineEnd: Date;
  selectedRecordId: string | null;
  setSelectedRecordId: (id: string | null) => void;
  bars: GanttBarItem[];
  dependencies: GanttDependency[];
  criticalPathIds: Set<string>;
}

export const GanttContext = createContext<IGanttContext>(null!);

interface GanttProviderProps {
  ganttOptions: IGanttViewOptions;
  bars: GanttBarItem[];
  dependencies: GanttDependency[];
  criticalPathIds: Set<string>;
  children: ReactNode;
}

export const GanttProvider = ({
  ganttOptions,
  bars,
  dependencies,
  criticalPathIds,
  children,
}: GanttProviderProps) => {
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);

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
      timelineStart,
      timelineEnd,
      selectedRecordId,
      setSelectedRecordId,
      bars,
      dependencies,
      criticalPathIds,
    }),
    [
      ganttOptions,
      timelineStart,
      timelineEnd,
      selectedRecordId,
      bars,
      dependencies,
      criticalPathIds,
    ]
  );

  return <GanttContext.Provider value={value}>{children}</GanttContext.Provider>;
};

export const useGanttContext = (): IGanttContext => {
  const ctx = useContext(GanttContext);
  if (!ctx) throw new Error('useGanttContext must be used within GanttProvider');
  return ctx;
};
