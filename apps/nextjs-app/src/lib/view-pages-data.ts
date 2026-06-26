import type { IFieldVo, IRecord, IViewVo } from '@teable/core';
import type { IGroupPointsVo, ITableVo } from '@teable/openapi';
import type { SsrApi } from '@/backend/api/rest/ssr-api';

export interface IViewPageProps {
  tableServerData?: ITableVo[];
  fieldServerData: IFieldVo[];
  recordsServerData: { records: IRecord[] };
  recordServerData?: IRecord;
  groupPointsServerDataMap?: { [viewId: string]: IGroupPointsVo | null };
}

export const getViewPageServerData = async (
  ssrApi: SsrApi,
  baseId: string,
  tableId: string,
  viewId: string,
  prefetchedViews?: IViewVo[]
): Promise<IViewPageProps | undefined> => {
  const api = ssrApi;
  const tableResult = await api.getTable(baseId, tableId, viewId, prefetchedViews);
  if (tableResult) {
    const { fields, records, extra } = tableResult;

    return {
      fieldServerData: fields,
      recordsServerData: { records },
      groupPointsServerDataMap: {
        [viewId]: extra?.groupPoints ?? null,
      },
    };
  }

  return undefined;
};
