import { IdPrefix, ViewType } from '@teable/core';
import {
  useConnection,
  useIsReadOnlyPreview,
  usePersonalView,
  useTableId,
  useView,
  useViews,
} from '@teable/sdk';
import dynamic from 'next/dynamic';
import { useTranslation } from 'next-i18next';
import { useEffect, useRef } from 'react';
import type { Query } from 'sharedb';
import { useShareEffectiveEdit } from '@/features/app/context/ShareContext';
import { tableConfig } from '@/features/i18n/table.config';
import { GridView } from './grid/GridView';
import type { IViewBaseProps } from './types';

// Grid is the default, most-used view — keep it eager. Every other view is code-split so
// the (common) grid route stops paying to parse their heavy deps up front — notably
// CalendarView pulls @fullcalendar (+daygrid/interaction/react/locales), Gantt, etc.
// This was a major cause of the table route shipping ~8 MB of JS to first paint.
const ViewLoading = () => (
  <div className="flex size-full items-center justify-center text-sm text-muted-foreground">
    <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
  </div>
);
const FormView = dynamic(() => import('./form/FormView').then((m) => m.FormView), {
  ssr: false,
  loading: ViewLoading,
});
const KanbanView = dynamic(() => import('./kanban/KanbanView').then((m) => m.KanbanView), {
  ssr: false,
  loading: ViewLoading,
});
const GalleryView = dynamic(() => import('./gallery/GalleryView').then((m) => m.GalleryView), {
  ssr: false,
  loading: ViewLoading,
});
const CalendarView = dynamic(() => import('./calendar/CalendarView').then((m) => m.CalendarView), {
  ssr: false,
  loading: ViewLoading,
});
const GanttView = dynamic(() => import('./gantt/GanttView').then((m) => m.GanttView), {
  ssr: false,
  loading: ViewLoading,
});
const PluginView = dynamic(() => import('./plugin/PluginView').then((m) => m.PluginView), {
  ssr: false,
  loading: ViewLoading,
});

export const View = (props: IViewBaseProps) => {
  const view = useView();
  const views = useViews();
  const viewType = view?.type;

  // On table switch, ShareDB clears and re-subscribes asynchronously. For one render frame
  // the new viewId has no match in the (stale) views array, making viewType undefined.
  // Returning null unmounts the grid → full canvas re-initialization (~6-8s).
  // Hold the last valid viewType so the grid stays mounted during the transition frame.
  const lastViewTypeRef = useRef<ViewType | undefined>(viewType);
  if (viewType !== undefined) lastViewTypeRef.current = viewType;
  const stableViewType = viewType ?? lastViewTypeRef.current;
  const { t } = useTranslation(tableConfig.i18nNamespaces);
  const { connection } = useConnection();
  const tableId = useTableId();
  const isReadOnlyPreview = useIsReadOnlyPreview();
  const isShareEditor = useShareEffectiveEdit();
  const { openPersonalView, isPersonalView } = usePersonalView();

  // Auto-open personal view for read-only contexts:
  // template, can-view share, or anonymous on can-edit share (no real edit permissions).
  useEffect(() => {
    if (isReadOnlyPreview && !isShareEditor && !isPersonalView) {
      openPersonalView?.();
    }
  }, [isReadOnlyPreview, isShareEditor, openPersonalView, isPersonalView]);

  if (tableId && connection?.queries) {
    const query = Object.values(connection?.queries).find(
      (query: Query) => query.collection === `${IdPrefix.View}_${tableId}`
    );

    if (query?.ready && !views.length) {
      return (
        <>
          <div className="flex h-full flex-col items-center justify-center gap-y-4 text-center">
            <h3 data-testid="not-found-title" className="text-xl font-semibold text-foreground">
              {t('table:view.noView')}
            </h3>
            <p className="max-w-md text-sm text-muted-foreground">
              {t('common:admin.tips.pleaseContactAdmin')}
            </p>
          </div>
        </>
      );
    }
  }

  const getViewComponent = () => {
    switch (stableViewType) {
      case ViewType.Grid:
        return <GridView {...props} />;
      case ViewType.Form:
        return <FormView />;
      case ViewType.Kanban:
        return <KanbanView />;
      case ViewType.Gallery:
        return <GalleryView />;
      case ViewType.Calendar:
        return <CalendarView />;
      case ViewType.Gantt:
        return <GanttView />;
      case ViewType.Plugin:
        return <PluginView />;
      default:
        return null;
    }
  };

  return getViewComponent();
};
