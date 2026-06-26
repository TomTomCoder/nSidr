import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { IFieldVo, IRecord } from '@teable/core';
import {
  getBaseById,
  LastVisitResourceType,
  updateUserLastVisit,
  type IGroupPointsVo,
} from '@teable/openapi';
import {
  AnchorContext,
  FieldProvider,
  useUndoRedo,
  ViewProvider,
  PersonalViewProxy,
  PersonalViewProvider,
  ReactQueryKeys,
  useTables,
  useIsReadOnlyPreview,
} from '@teable/sdk';
import { TablePermissionProvider } from '@teable/sdk/context/table-permission';
import dynamic from 'next/dynamic';
import Head from 'next/head';
import { useEffect, useMemo } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { useHotkeys } from 'react-hotkeys-hook';
import {
  CellDownloadHandler,
  DownloadAllAttachmentsDialog,
} from '../../components/download-attachments';
import { PluginContextMenu } from '../../components/plugin-context-menu/PluginContextMenu';
import type { IBaseResourceTable } from '../../hooks/useBaseResource';
import { useBaseResource } from '../../hooks/useBaseResource';
import { useBrand } from '../../hooks/useBrand';
import { View } from '../view/View';
import { FailAlert } from './FailAlert';
import { useViewErrorHandler } from './hooks/use-view-error-handler';
import { TableHeader } from './table-header/TableHeader';

// Code-split heavy side panels out of the table route's main chunk.
const ChatPanel = dynamic(
  () => import('../../components/chat-panel/ChatPanel').then((m) => m.ChatPanel),
  { ssr: false }
);
const PluginPanel = dynamic(
  () => import('../../components/plugin-panel/PluginPanel').then((m) => m.PluginPanel),
  { ssr: false }
);

export interface ITableProps {
  fieldServerData: IFieldVo[];
  recordsServerData: { records: IRecord[] };
  recordServerData?: IRecord;
  groupPointsServerDataMap?: { [viewId: string]: IGroupPointsVo | null };
}

export const Table: React.FC<ITableProps> = ({
  fieldServerData,
  recordsServerData,
  recordServerData,
  groupPointsServerDataMap,
}) => {
  const tables = useTables();
  const { undo, redo } = useUndoRedo();
  const queryClient = useQueryClient();
  const isReadOnlyPreview = useIsReadOnlyPreview();
  const { baseId, tableId, viewId } = useBaseResource() as IBaseResourceTable;

  const table = tables.find((t) => t.id === tableId);

  const { data: base } = useQuery({
    queryKey: ReactQueryKeys.base(baseId as string),
    queryFn: ({ queryKey }) => getBaseById(queryKey[1]).then((res) => res.data),
  });

  const { brandName } = useBrand();

  useEffect(() => {
    // Skip last visit tracking in template or share mode
    if (isReadOnlyPreview) return;
    updateUserLastVisit({
      resourceId: tableId,
      childResourceId: viewId,
      parentResourceId: baseId,
      resourceType: LastVisitResourceType.Table,
    }).then(() => {
      queryClient.invalidateQueries({ queryKey: ReactQueryKeys.userLastVisitMap(baseId) });
    });
  }, [tableId, viewId, baseId, queryClient, isReadOnlyPreview]);

  useViewErrorHandler(baseId, tableId, viewId);
  useHotkeys(`mod+z`, () => undo(), {
    preventDefault: true,
  });

  useHotkeys([`mod+shift+z`, `mod+y`], () => redo(), {
    preventDefault: true,
  });

  // Memoize so AnchorContext consumers (consumed app-wide) don't re-render on
  // every Table render — only when the ids actually change.
  const anchorValue = useMemo(() => ({ tableId, viewId, baseId }), [tableId, viewId, baseId]);

  return (
    <AnchorContext.Provider value={anchorValue}>
      <Head>
        <title>
          {table?.name
            ? `${table?.icon ? table.icon + ' ' : ''}${table.name}: ${base?.name} - ${brandName}`
            : `${brandName}`}
        </title>
        <style data-fullcalendar></style>
      </Head>
      <TablePermissionProvider baseId={baseId}>
        <ViewProvider>
          <PersonalViewProxy>
            <FieldProvider serverSideData={fieldServerData}>
              <PersonalViewProvider>
                <div className="flex h-full grow basis-[500px]">
                  <div
                    className="flex flex-1 flex-col overflow-hidden"
                    data-screenshot-target="base-view"
                  >
                    <TableHeader />
                    <ErrorBoundary
                      fallback={
                        <div className="flex size-full items-center justify-center">
                          <FailAlert />
                        </div>
                      }
                    >
                      <View
                        recordServerData={recordServerData}
                        recordsServerData={recordsServerData}
                        groupPointsServerDataMap={groupPointsServerDataMap}
                      />
                    </ErrorBoundary>
                  </div>
                  <PluginPanel tableId={tableId} />
                  <PluginContextMenu tableId={tableId} baseId={baseId} />
                  <DownloadAllAttachmentsDialog />
                  <CellDownloadHandler />
                  <ChatPanel />
                </div>
              </PersonalViewProvider>
            </FieldProvider>
          </PersonalViewProxy>
        </ViewProvider>
      </TablePermissionProvider>
    </AnchorContext.Provider>
  );
};
