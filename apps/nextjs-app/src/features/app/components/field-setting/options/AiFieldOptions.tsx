import type { IAiFieldOptions } from '@teable/core';
import { getAIConfig } from '@teable/openapi';
import { useBaseId, useFields } from '@teable/sdk/hooks';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import {
  generateGatewayModelKeyList,
  generateModelKeyList,
} from '@/features/app/blocks/admin/setting/components/ai-config/utils';
import { CompactAiFieldConfig } from '@/features/app/blocks/admin/setting/components/ai-config/CompactAiFieldConfig';

interface IAiFieldOptionsProps {
  options: IAiFieldOptions;
  onChange: (options: IAiFieldOptions) => void;
}

export function AiFieldOptions({ options, onChange }: IAiFieldOptionsProps) {
  const fields = useFields();
  const baseId = useBaseId() as string;

  const availableFields = useMemo(() => fields.map((f) => ({ id: f.id, name: f.name })), [fields]);

  const { data: aiConfig } = useQuery({
    queryKey: ['ai-config', baseId],
    queryFn: () => getAIConfig(baseId).then(({ data }) => data),
    enabled: Boolean(baseId),
    staleTime: 5 * 60 * 1000,
  });

  const modelOptions = useMemo(() => {
    if (!aiConfig) return [];
    return [
      ...generateGatewayModelKeyList(aiConfig.gatewayModels),
      ...generateModelKeyList(aiConfig.llmProviders ?? []),
    ];
  }, [aiConfig]);

  return (
    <div className="p-3">
      <CompactAiFieldConfig
        options={options}
        onChange={onChange}
        availableFields={availableFields}
        modelOptions={modelOptions}
      />
    </div>
  );
}
