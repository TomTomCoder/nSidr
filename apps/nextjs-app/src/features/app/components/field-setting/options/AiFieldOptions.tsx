import type { IAiFieldOptions } from '@teable/core';
import { useFields } from '@teable/sdk/hooks';
import { useMemo } from 'react';
import { CompactAiFieldConfig } from '@/features/app/blocks/admin/setting/components/ai-config/CompactAiFieldConfig';

interface IAiFieldOptionsProps {
  options: IAiFieldOptions;
  onChange: (options: IAiFieldOptions) => void;
}

export function AiFieldOptions({ options, onChange }: IAiFieldOptionsProps) {
  const fields = useFields();

  // Build source field list from the table's fields (exclude the AI field itself — id unknown here)
  const availableFields = useMemo(() => fields.map((f) => ({ id: f.id, name: f.name })), [fields]);

  return (
    <div className="p-3">
      <CompactAiFieldConfig
        options={options}
        onChange={onChange}
        availableFields={availableFields}
      />
    </div>
  );
}
