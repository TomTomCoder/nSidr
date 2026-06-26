import { ViewType } from '@teable/core';
import { sortBy } from 'lodash';
import { useContext, useMemo } from 'react';
import { FieldContext } from '../context';
import { useView } from './use-view';

export function useFields(options: { withHidden?: boolean; withDenied?: boolean } = {}) {
  const { withHidden, withDenied } = options;
  const { fields: originFields } = useContext(FieldContext);

  const view = useView();
  const { type: viewType, columnMeta } = view ?? {};

  return useMemo(() => {
    const sortedFields = sortBy(originFields, (field) => columnMeta?.[field.id]?.order ?? Infinity);

    if ((withHidden && withDenied) || viewType == null) {
      return sortedFields;
    }

    return sortedFields.filter(({ id, canReadFieldRecord }) => {
      const isHidden = () => {
        if (withHidden) {
          return true;
        }
        // make sure these view rich display as default
        if (
          viewType === ViewType.Kanban ||
          viewType === ViewType.Gallery ||
          viewType === ViewType.Calendar
        ) {
          return columnMeta?.[id]?.visible === undefined ? true : columnMeta?.[id]?.visible;
        }
        if (viewType === ViewType.Form) {
          return columnMeta?.[id]?.visible;
        }
        return !(columnMeta?.[id] as { hidden?: boolean } | undefined)?.hidden;
      };
      const hasPermission = () => {
        if (withDenied) {
          return true;
        }
        return canReadFieldRecord;
      };
      return isHidden() && hasPermission();
    });
    // PERF: depend on `columnMeta` by reference, not via JSON.stringify.
    // Every write path replaces the object: the useInstances reducer creates
    // a fresh view instance on each ShareDB doc update (see reducer.ts), and
    // PersonalViewProxy assigns a new `newViewProxy.columnMeta = ...` on
    // mutation. The previous `JSON.stringify(columnMeta)` re-serialized the
    // entire per-column metadata on every render of every consumer — there
    // are 75 useFields callers in the app, so on a table switch this was
    // tens of thousands of redundant JSON serializations per second.
  }, [originFields, withHidden, viewType, columnMeta]);
}
