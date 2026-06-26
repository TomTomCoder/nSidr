'use client';

import type { GatewayModelType } from '@teable/openapi';
import { Badge, cn, ScrollArea } from '@teable/ui-lib/shadcn';
import { Check, Search } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { GATEWAY_PROVIDER_ICONS } from './constant';
import type { IPickerModel } from './GatewayModelPickerDialog';
import { CAPABILITY_LABELS } from './GatewayModelPickerDialog';

type Modality = 'all' | 'text' | 'image' | 'audio' | 'embedding';

const MODALITY_LABELS: Record<Modality, string> = {
  all: 'All',
  text: 'Text',
  image: 'Image',
  audio: 'Audio',
  embedding: 'Embedding',
};

/** Returns true if the model matches the given modality filter. */
function isImageModel(m: IPickerModel): boolean {
  const t = m.modelType as GatewayModelType | undefined;
  return t === 'image' || m.isImageModel === true || Boolean(m.tags?.includes('image-generation'));
}
function isAudioModel(m: IPickerModel): boolean {
  const t = m.modelType as string | undefined;
  return (
    t === 'audio' ||
    Boolean(m.tags?.includes('audio')) ||
    Boolean(m.tags?.includes('speech-to-text'))
  );
}
function isEmbeddingModel(m: IPickerModel): boolean {
  const t = m.modelType as GatewayModelType | undefined;
  return t === 'embedding' || Boolean(m.tags?.includes('embedding'));
}
function matchesModality(model: IPickerModel, modality: Modality): boolean {
  if (modality === 'all') return true;
  if (modality === 'image') return isImageModel(model);
  if (modality === 'audio') return isAudioModel(model);
  if (modality === 'embedding') return isEmbeddingModel(model);
  return !isImageModel(model) && !isAudioModel(model) && !isEmbeddingModel(model);
}

function generateLabel(modelId: string, apiName?: string): string {
  if (apiName) return apiName;
  const parts = modelId.split('/');
  const modelName = parts[parts.length - 1];
  return modelName
    .replace(/-\d{8}$/, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export interface IUnifiedModelPickerProps {
  /** Flat list of models to display (same shape as GatewayModelPickerDialog) */
  models: IPickerModel[];
  /** Currently selected model id */
  value?: string;
  /** Called when user selects a model */
  onSelect: (modelId: string) => void;
  isLoading?: boolean;
  className?: string;
}

/**
 * UnifiedModelPicker — single-screen searchable model list with modality filter chips.
 * Replaces the multi-step GatewayModelPickerDialog flow with a direct inline picker.
 *
 * Filter chips: All | Text | Image | Audio | Embedding
 * Search: simple substring match on model name / id
 */
export function UnifiedModelPicker({
  models,
  value,
  onSelect,
  isLoading,
  className,
}: IUnifiedModelPickerProps) {
  const [search, setSearch] = useState('');
  const [modality, setModality] = useState<Modality>('all');

  const filtered = useMemo(() => {
    let result = models.filter((m) => matchesModality(m, modality));
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (m) =>
          m.id.toLowerCase().includes(q) ||
          (m.name ?? '').toLowerCase().includes(q) ||
          (m.description ?? '').toLowerCase().includes(q)
      );
    }
    return result.sort((a, b) => {
      const la = generateLabel(a.id, a.name);
      const lb = generateLabel(b.id, b.name);
      return la.localeCompare(lb);
    });
  }, [models, modality, search]);

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Rechercher des modèles..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-9 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>

      {/* Modality filter chips */}
      <div className="flex flex-wrap gap-1.5">
        {(Object.keys(MODALITY_LABELS) as Modality[]).map((m) => (
          <button
            key={m}
            onClick={() => setModality(m)}
            className={cn(
              'rounded-full border px-3 py-0.5 text-xs font-medium transition-colors',
              modality === m
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-input bg-transparent text-muted-foreground hover:border-primary/50 hover:text-foreground'
            )}
          >
            {MODALITY_LABELS[m]}
          </button>
        ))}
      </div>

      {/* Model list */}
      <ScrollArea className="h-[360px]">
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading models...</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            {search ? 'No models match your search.' : 'No models available.'}
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            {filtered.map((model) => {
              const isSelected = value === model.id;
              const ProviderIcon = model.ownedBy
                ? (
                    GATEWAY_PROVIDER_ICONS as Record<
                      string,
                      React.ComponentType<{ className?: string }>
                    >
                  )[model.ownedBy]
                : undefined;
              return (
                <button
                  key={model.id}
                  onClick={() => onSelect(model.id)}
                  className={cn(
                    'flex w-full flex-col rounded-sm p-2 py-1.5 text-left transition-colors hover:bg-accent focus:bg-accent focus:outline-none',
                    isSelected && 'bg-accent'
                  )}
                >
                  {/* Row 1: icon, label, check */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 truncate">
                      {ProviderIcon && <ProviderIcon className="size-4 shrink-0" />}
                      <span className="truncate text-xs font-medium">
                        {generateLabel(model.id, model.name)}
                      </span>
                      {/* Provider badge */}
                      {model.ownedBy && (
                        <Badge variant="secondary" className="shrink-0 text-[10px]">
                          {model.ownedBy}
                        </Badge>
                      )}
                    </div>
                    {isSelected && <Check className="size-4 shrink-0 text-primary" />}
                  </div>
                  {/* Row 2: model id + capability badges */}
                  <div className="flex items-center gap-2 pl-6 text-xs text-muted-foreground">
                    <code className="truncate">{model.id}</code>
                    {model.capabilities && (
                      <div className="flex gap-1">
                        {Object.entries(model.capabilities)
                          .filter(([, v]) => v)
                          .slice(0, 3)
                          .map(([key]) => (
                            <Badge key={key} variant="outline" className="text-[10px]">
                              {CAPABILITY_LABELS[key] || key}
                            </Badge>
                          ))}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
