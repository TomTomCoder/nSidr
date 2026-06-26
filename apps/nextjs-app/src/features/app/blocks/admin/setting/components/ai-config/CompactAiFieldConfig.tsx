'use client';

import type { IAiFieldOptions } from '@teable/core';
import { Badge, Label, RadioGroup, RadioGroupItem, Textarea } from '@teable/ui-lib/shadcn';
import { Bot, Eye } from 'lucide-react';
import { AIModelSelect } from './AiModelSelect';
import type { IModelOption } from './AiModelSelect';

/** Simple field descriptor for source column selection */
export interface ISourceField {
  id: string;
  name: string;
}

/** Output typology options */
export type AiOutputTypology = 'freeText' | 'enum' | 'number' | 'jsonShape';

const OUTPUT_TYPOLOGY_OPTIONS: { value: AiOutputTypology; label: string; description: string }[] = [
  { value: 'freeText', label: 'Free text', description: 'Open-ended AI response' },
  { value: 'enum', label: 'Enum', description: 'One of a predefined list of values' },
  { value: 'number', label: 'Number', description: 'Numeric output (integer or decimal)' },
  { value: 'jsonShape', label: 'JSON shape', description: 'Structured JSON output' },
];

export interface ICompactAiFieldConfigProps {
  /** Current AI field options */
  options: IAiFieldOptions;
  /** Called when any option changes */
  onChange: (options: IAiFieldOptions) => void;
  /** Fields available to use as source columns */
  availableFields?: ISourceField[];
  /** Model options for the model picker */
  modelOptions?: IModelOption[];
  /** Currently selected output typology */
  outputTypology?: AiOutputTypology;
  /** Called when output typology changes */
  onOutputTypologyChange?: (typology: AiOutputTypology) => void;
  /** Currently selected model key */
  modelValue?: string;
  /** Called when model changes */
  onModelChange?: (modelKey: string) => void;
}

/**
 * CompactAiFieldConfig — one-panel AI field configuration.
 *
 * Sections (vertically stacked, no wizard):
 *   1. Prompt textarea
 *   2. Source columns multi-select
 *   3. Model picker (AiModelSelect)
 *   4. Output typology selector (radio): Free text | Enum | Number | JSON shape
 *   5. Live preview panel (placeholder — live generation deferred)
 */
export function CompactAiFieldConfig({
  options,
  onChange,
  availableFields = [],
  modelOptions = [],
  outputTypology = 'freeText',
  onOutputTypologyChange,
  modelValue = '',
  onModelChange,
}: ICompactAiFieldConfigProps) {
  const selectedSourceIds = options.sourceFieldIds ?? [];

  const toggleSourceField = (fieldId: string) => {
    const next = selectedSourceIds.includes(fieldId)
      ? selectedSourceIds.filter((id) => id !== fieldId)
      : [...selectedSourceIds, fieldId];
    onChange({ ...options, sourceFieldIds: next });
  };

  return (
    <div className="space-y-6 p-1">
      {/* Header */}
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Bot className="text-primary size-4" />
        AI Field Configuration
      </div>

      {/* Section 1: Prompt */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">Prompt</Label>
        <Textarea
          value={options.prompt ?? ''}
          onChange={(e) => onChange({ ...options, prompt: e.target.value })}
          placeholder="e.g. Summarize this record in one sentence. Extract key tags as comma-separated values."
          className="min-h-[96px] text-xs"
        />
        <p className="text-muted-foreground text-[10px]">
          Use field values from Source columns in your prompt via placeholders.
        </p>
      </div>

      {/* Section 2: Source columns */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">Source columns</Label>
        {availableFields.length === 0 ? (
          <p className="text-muted-foreground text-xs">No fields available to select.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {availableFields.map((field) => {
              const isSelected = selectedSourceIds.includes(field.id);
              return (
                <button
                  key={field.id}
                  type="button"
                  onClick={() => toggleSourceField(field.id)}
                  className="focus:outline-none"
                >
                  <Badge
                    variant={isSelected ? 'default' : 'outline'}
                    className="cursor-pointer text-xs transition-colors hover:opacity-80"
                  >
                    {field.name}
                  </Badge>
                </button>
              );
            })}
          </div>
        )}
        <p className="text-muted-foreground text-[10px]">
          Selected columns are passed to the AI prompt as context.
        </p>
      </div>

      {/* Section 3: Model */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">Model</Label>
        <AIModelSelect
          value={modelValue}
          onValueChange={onModelChange ?? (() => undefined)}
          options={modelOptions}
          className="w-full"
          placeholder="Sélectionner un modèle..."
        />
      </div>

      {/* Section 4: Output typology */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Output typology</Label>
        <RadioGroup
          value={outputTypology}
          onValueChange={(v) => onOutputTypologyChange?.(v as AiOutputTypology)}
          className="grid grid-cols-2 gap-2"
        >
          {OUTPUT_TYPOLOGY_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              htmlFor={`typology-${opt.value}`}
              className="hover:bg-accent has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5 flex cursor-pointer items-start gap-2 rounded-md border p-2.5 transition-colors"
            >
              <RadioGroupItem id={`typology-${opt.value}`} value={opt.value} className="mt-0.5" />
              <div>
                <div className="text-xs font-medium">{opt.label}</div>
                <div className="text-muted-foreground text-[10px]">{opt.description}</div>
              </div>
            </label>
          ))}
        </RadioGroup>
      </div>

      {/* Section 5: Live preview (placeholder — deferred) */}
      <div className="space-y-1.5">
        <Label className="flex items-center gap-1 text-xs font-medium">
          <Eye className="size-3" />
          Live preview
          <Badge variant="secondary" className="text-[10px]">
            DEFERRED
          </Badge>
        </Label>
        <div className="bg-muted/30 text-muted-foreground flex min-h-[60px] items-center justify-center rounded-md border border-dashed px-4 py-3 text-xs">
          Run field to see preview — live generation requires a running AI model connection.
        </div>
      </div>
    </div>
  );
}
