import { CellValueType, FieldType } from '@teable/core';
import type { IGanttViewOptions } from '@teable/core';
import { useFields } from '@teable/sdk/hooks';
import type { IFieldInstance, SingleSelectField } from '@teable/sdk/model';
import { useMemo } from 'react';

export interface IGanttFields {
  startField?: IFieldInstance;
  endField?: IFieldInstance;
  titleField?: IFieldInstance;
  dependencyField?: IFieldInstance;
  /** Only resolved when the configured field is a SingleSelect (its choice color drives bar color). */
  colorField?: SingleSelectField;
}

/**
 * Resolves the field ids stored in gantt view options into actual field instances,
 * with the same date-field fallback used by useGanttRecords. Centralizes field
 * resolution so permission checks (isComputed) can be done in one place.
 */
export function useGanttFields(options: IGanttViewOptions): IGanttFields {
  const allFields = useFields({ withHidden: true });

  return useMemo(() => {
    const dateFields = allFields.filter(
      (f) => f.cellValueType === CellValueType.DateTime && !f.isMultipleCellValue
    );

    const startField =
      (options.startField && allFields.find((f) => f.id === options.startField)) ||
      dateFields[0];
    const endField =
      (options.endField && allFields.find((f) => f.id === options.endField)) ||
      dateFields[1] ||
      dateFields[0];

    const titleField = options.titleField
      ? allFields.find((f) => f.id === options.titleField)
      : undefined;
    const dependencyField = options.dependencyField
      ? allFields.find((f) => f.id === options.dependencyField)
      : undefined;
    const colorField = options.colorField
      ? (allFields.find(
          (f) => f.id === options.colorField && f.type === FieldType.SingleSelect
        ) as SingleSelectField | undefined)
      : undefined;

    return { startField, endField, titleField, dependencyField, colorField };
  }, [allFields, options]);
}
