import { useRecords, useFields } from '@teable/sdk/hooks';
import { FieldType } from '@teable/core';
import { useMemo } from 'react';
import type { IGanttViewOptions } from '@teable/core';
import type { GanttDependency } from '../type';

interface IUseGanttDependenciesResult {
  dependencies: GanttDependency[];
}

export function useGanttDependencies(
  options: IGanttViewOptions,
  validRecordIds: Set<string>
): IUseGanttDependenciesResult {
  const { records } = useRecords();
  const fields = useFields({ withHidden: true });

  const dependencies = useMemo<GanttDependency[]>(() => {
    if (!options?.dependencyField) return [];

    const depField = fields.find((f) => f.id === options.dependencyField);
    if (!depField) return [];

    const result: GanttDependency[] = [];

    for (const record of records) {
      const cellValue = record.fields[depField.id];
      if (!cellValue) continue;

      let toIds: string[] = [];

      if (depField.type === FieldType.Link) {
        // Linked-record field: value is an array of { id: string } objects
        const linked = cellValue as { id: string }[] | { id: string } | null;
        if (Array.isArray(linked)) {
          toIds = linked.map((l) => l.id).filter(Boolean);
        } else if (linked && typeof linked === 'object' && 'id' in linked) {
          toIds = [(linked as { id: string }).id];
        }
      } else if (typeof cellValue === 'string') {
        // Text field: comma-separated record IDs
        toIds = cellValue
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
      }

      // Security (T-05-07): filter to only IDs that exist in the current record set
      for (const toId of toIds) {
        if (validRecordIds.has(toId) && toId !== record.id) {
          result.push({ fromRecordId: record.id, toRecordId: toId });
        }
      }
    }

    return result;
  }, [records, fields, options, validRecordIds]);

  return { dependencies };
}
