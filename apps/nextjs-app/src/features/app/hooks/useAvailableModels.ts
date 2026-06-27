import { useQuery } from '@tanstack/react-query';
import { getAIConfig } from '@teable/openapi';
import { useBaseId } from '@teable/sdk/hooks';
import { useMemo } from 'react';

export interface IModelOption {
  label: string;
  value: string; // format: type@model@name
  providerLabel: string;
  /** Whether this model accepts file attachments (image and/or PDF input) */
  supportsFiles: boolean;
}

/** 5 minutes — AI config rarely changes during a session */
const STALE_TIME_MS = 5 * 60 * 1000;

export function useAvailableModels(): IModelOption[] {
  const baseId = useBaseId() as string;
  const { data } = useQuery({
    queryKey: ['ai-config-models', baseId],
    queryFn: () => getAIConfig(baseId).then(({ data }) => data),
    enabled: Boolean(baseId),
    staleTime: STALE_TIME_MS,
  });

  return useMemo(() => {
    if (!data?.llmProviders) return [];

    const models: IModelOption[] = [];
    for (const provider of data.llmProviders) {
      const modelList = (provider.models ?? '')
        .split(',')
        .map((m) => m.trim())
        .filter(Boolean);
      for (const model of modelList) {
        const config = provider.modelConfigs?.[model];
        const ability = config?.ability;
        models.push({
          label: config?.label ?? model,
          value: `${provider.type}@${model}@${provider.name}`,
          providerLabel: provider.name,
          supportsFiles: Boolean(ability?.image || ability?.pdf),
        });
      }
    }
    return models;
  }, [data]);
}
