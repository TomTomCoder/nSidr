import type { IGanttViewOptions } from '@teable/core';
import { useRecords } from '@teable/sdk/hooks';
import type { IFieldInstance, SingleSelectField } from '@teable/sdk/model';
import { useMemo } from 'react';
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

export function useGanttRecords(
  options: IGanttViewOptions,
  startField: IFieldInstance | undefined,
  endField: IFieldInstance | undefined,
  titleField: IFieldInstance | undefined,
  colorField: SingleSelectField | undefined
): IUseGanttRecordsResult {
  const { records } = useRecords();

  const bars = useMemo<GanttBarItem[]>(() => {
    if (!startField || !endField) return [];

    const items: GanttBarItem[] = [];

    for (const record of records) {
      const startDate = parseDateValue(record.fields[startField.id]);
      const endDate = parseDateValue(record.fields[endField.id]);

      // Skip records without valid dates
      if (!startDate || !endDate) continue;

      const title = titleField ? String(record.fields[titleField.id] ?? record.id) : record.id;

      // Bar takes on the color of the record's selected choice (e.g. status), not a literal cell value.
      const colorValue = colorField
        ? (record.fields[colorField.id] as string | undefined)
        : undefined;
      const color = colorValue
        ? colorField?.displayChoiceMap[colorValue]?.backgroundColor
        : undefined;

      const durationDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
      // Round to whole days: the threshold is expressed in days, sub-day noise (same-day
      // timestamps a few seconds apart) shouldn't prevent a record from being a milestone.
      const isMilestone = Math.round(durationDays) <= (options.milestoneThreshold ?? 0);

      items.push({
        recordId: record.id,
        title,
        startDate,
        endDate,
        color,
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
  }, [records, startField, endField, titleField, colorField, options.milestoneThreshold]);

  return { bars, isLoading: false };
}
