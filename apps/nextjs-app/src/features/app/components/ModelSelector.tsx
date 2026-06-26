import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@teable/ui-lib/shadcn/ui/select';
import { useRouter } from 'next/router';
import type { IModelOption } from '../hooks/useAvailableModels';

interface IModelSelectorProps {
  models: IModelOption[];
  value: string | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const ModelSelector = ({ models, value, onChange, className }: IModelSelectorProps) => {
  const router = useRouter();

  if (models.length === 0) {
    return (
      <button
        type="button"
        onClick={() => router.push('/admin/ai-setting?anchor=llm')}
        className={
          className ??
          'h-7 rounded-md border border-dashed px-2 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary'
        }
      >
        Intégrer un modèle
      </button>
    );
  }

  // When no model is explicitly selected, treat the first model as the effective default.
  const effectiveValue = value ?? models[0].value;
  const displayLabel = models.find((m) => m.value === effectiveValue)?.label ?? effectiveValue;

  // Group by provider
  const grouped = models.reduce<Record<string, IModelOption[]>>((acc, m) => {
    if (!acc[m.providerLabel]) acc[m.providerLabel] = [];
    acc[m.providerLabel].push(m);
    return acc;
  }, {});

  return (
    <Select value={effectiveValue} onValueChange={onChange}>
      <SelectTrigger className={className ?? 'h-7 w-full max-w-[240px] text-xs'}>
        <SelectValue>{displayLabel}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {Object.entries(grouped).map(([provider, items]) => (
          <SelectGroup key={provider}>
            <SelectLabel className="text-xs">{provider}</SelectLabel>
            {items.map((m) => (
              <SelectItem key={m.value} value={m.value} className="text-xs">
                {m.label}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
};
