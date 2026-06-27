import { useQuery } from '@tanstack/react-query';
import type { IViewVo } from '@teable/core';
import { IdPrefix } from '@teable/core';
import type { FC, ReactNode } from 'react';
import { useContext, useMemo } from 'react';
import { ReactQueryKeys } from '../../config';
import { createViewInstance } from '../../model/view/factory';
import { AnchorContext } from '../anchor';
import { useInstances } from '../use-instances';
import { ViewContext } from './ViewContext';

interface IViewProviderProps {
  fallback?: ReactNode;
  serverData?: IViewVo[];
  children: ReactNode;
}

export const ViewProvider: FC<IViewProviderProps> = ({ children, fallback, serverData }) => {
  const { tableId } = useContext(AnchorContext);

  // Read from React Query cache (never fetches — enabled: false).
  // Picks up view data prefetched on hover so useInstances seeds immediately on table switch.
  const { data: cachedViews } = useQuery<IViewVo[]>({
    queryKey: ReactQueryKeys.viewList(tableId!),
    // ponytail: enabled:false means this never runs — queryFn only exists to satisfy
    // react-query's validation (it warns without one, even when disabled).
    queryFn: () => [],
    enabled: false,
  });

  const { instances: views } = useInstances({
    collection: `${IdPrefix.View}_${tableId}`,
    factory: createViewInstance,
    initData: cachedViews ?? serverData,
    queryParams: {},
  });

  const value = useMemo(() => {
    return { views };
  }, [views]);

  if (fallback && !views.length) {
    return <>{fallback}</>;
  }

  return <ViewContext.Provider value={value}>{children}</ViewContext.Provider>;
};
