import { useQuery } from '@tanstack/react-query';
import type { IRecord } from '@teable/core';
import { IdPrefix } from '@teable/core';
import type { IGetRecordsRo } from '@teable/openapi';
import { keyBy } from 'lodash';
import { useMemo } from 'react';
import { useInstances } from '../context/use-instances';
import { createRecordInstance, recordInstanceFieldMap } from '../model';
import { useFields } from './use-fields';
import { useSearch } from './use-search';
import { useTableId } from './use-table-id';
import { useViewId } from './use-view-id';

export const useRecords = (query?: IGetRecordsRo, initData?: IRecord[]) => {
  const tableId = useTableId();

  const viewId = useViewId();

  const fields = useFields();

  const { searchQuery } = useSearch();

  // Read hover-prefetched records (see BaseNodeTree handleMouseEnter).
  // Lets useInstances paint immediately on table switch instead of waiting
  // for the ShareDB round-trip. Never fetches here — enabled: false.
  const { data: seedRecords } = useQuery<IRecord[]>({
    queryKey: ['record-seed', tableId, viewId],
    // ponytail: enabled:false means this never runs — queryFn only exists to satisfy
    // react-query's validation (it warns without one, even when disabled).
    queryFn: () => [],
    enabled: false,
  });

  const queryParams = useMemo(() => {
    return {
      viewId,
      search: searchQuery,
      ...query,
      type: IdPrefix.Record,
    };
  }, [query, searchQuery, viewId]);

  const { instances, extra } = useInstances({
    collection: `${IdPrefix.Record}_${tableId}`,
    factory: createRecordInstance,
    queryParams,
    initData: seedRecords ?? initData,
  });
  return useMemo(() => {
    const fieldMap = keyBy(fields, 'id');
    return {
      records: instances.map((instance) => recordInstanceFieldMap(instance, fieldMap)),
      extra,
    };
  }, [instances, fields, extra]);
};
