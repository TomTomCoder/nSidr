import type {
  IParentBridgeUtilsMethods,
  IParentBridgeUIMethods,
  IParentBridgeMethods,
  IUIConfig,
} from '@teable/sdk/plugin-bridge';
import { Spin } from '@teable/ui-lib';
import dynamic from 'next/dynamic';
import { useMemo, useRef } from 'react';
import type { IPageParams } from '../../blocks/chart/types';
import type { IPluginParams } from './types';

// Lazy-load the chart block so recharts + d3 (~1.4 MB) live in an async chunk
// loaded only when a chart/dashboard actually renders — not on every route that
// transitively reaches the plugin renderer (grid, table, dashboard, share).
const Chart = dynamic(() => import('../../blocks/chart/components/Chart').then((m) => m.Chart), {
  ssr: false,
  loading: () => (
    <div className="flex size-full items-center justify-center">
      <Spin />
    </div>
  ),
});

type IBaseProps = {
  uiConfig: IUIConfig;
  utilsEvent: IParentBridgeUtilsMethods;
  uiEvent: IParentBridgeUIMethods;
};

type IComponentPluginRenderProps = IBaseProps & IPluginParams;

export const ComponentPluginRender = (props: IComponentPluginRenderProps) => {
  const { utilsEvent, uiEvent, uiConfig, positionType, pluginId, pluginInstallId, positionId } =
    props;
  const baseId = 'baseId' in props ? props.baseId : '';
  const tableId = 'tableId' in props ? props.tableId : '';
  const pageParams: IPageParams = useMemo(
    () => ({
      baseId,
      pluginId,
      pluginInstallId,
      positionId,
      tableId,
      positionType,
    }),
    [baseId, pluginId, pluginInstallId, positionId, tableId, positionType]
  );

  const parentBridgeMethods = useRef<IParentBridgeMethods>({
    ...utilsEvent,
    ...uiEvent,
  });
  parentBridgeMethods.current = {
    ...utilsEvent,
    ...uiEvent,
  };

  return (
    <Chart
      pageParams={pageParams}
      parentBridgeMethods={parentBridgeMethods.current}
      uiConfig={uiConfig}
    />
  );
};
