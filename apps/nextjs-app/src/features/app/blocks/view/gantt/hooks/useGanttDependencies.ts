import { FieldType } from '@teable/core';
import { useRecords } from '@teable/sdk/hooks';
import type { IFieldInstance } from '@teable/sdk/model';
import { useMemo } from 'react';
import type { GanttDependency } from '../type';

interface IUseGanttDependenciesResult {
  dependencies: GanttDependency[];
}

export function useGanttDependencies(
  dependencyField: IFieldInstance | undefined,
  validRecordIds: Set<string>
): IUseGanttDependenciesResult {
  const { records } = useRecords();

  const dependencies = useMemo<GanttDependency[]>(() => {
    if (!dependencyField) return [];

    const result: GanttDependency[] = [];

    for (const record of records) {
      const cellValue = record.fields[dependencyField.id];
      if (!cellValue) continue;

      let toIds: string[] = [];

      if (dependencyField.type === FieldType.Link) {
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
  }, [records, dependencyField, validRecordIds]);

  return { dependencies };
}
