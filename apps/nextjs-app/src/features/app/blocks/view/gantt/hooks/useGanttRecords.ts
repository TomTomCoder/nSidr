import { useRecords, useFields } from '@teable/sdk/hooks';
import { useMemo } from 'react';
import type { IGanttViewOptions } from '@teable/core';
import type { GanttBarItem } from '../type';

interface IUseGanttRecordsResult {
  bars: GanttBarItem[];
  isLoading: boolean;
}

function parseDateValue(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export function useGanttRecords(options: IGanttViewOptions): IUseGanttRecordsResult {
  const { records } = useRecords();
  const fields = useFields({ withHidden: true });

  const bars = useMemo<GanttBarItem[]>(() => {
    if (!options?.startField || !options?.endField) return [];

    const items: GanttBarItem[] = [];

    for (const record of records) {
      const rawStart = record.fields[options.startField];
      const rawEnd = record.fields[options.endField];

      const startDate = parseDateValue(rawStart);
      const endDate = parseDateValue(rawEnd);

      // Skip records without valid dates
      if (!startDate || !endDate) continue;

      const titleField = options.titleField
        ? fields.find((f) => f.id === options.titleField)
        : undefined;
      const title = titleField
        ? String(record.fields[titleField.id] ?? record.id)
        : record.id;

      const color = options.colorField
        ? (record.fields[options.colorField] as string | undefined)
        : undefined;

      const durationDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
      const isMilestone = durationDays <= (options.milestoneThreshold ?? 0);

      items.push({
        recordId: record.id,
        title,
        startDate,
        endDate,
        color: typeof color === 'string' ? color : undefined,
        isMilestone,
        isCriticalPath: false, // will be updated by useCriticalPath
        rowIndex: 0, // assigned after sort
      });
    }

    // Sort by startDate ascending
    items.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

    // Assign rowIndex
    items.forEach((item, idx) => {
      item.rowIndex = idx;
    });

    return items;
  }, [records, fields, options]);

  return { bars, isLoading: false };
}
