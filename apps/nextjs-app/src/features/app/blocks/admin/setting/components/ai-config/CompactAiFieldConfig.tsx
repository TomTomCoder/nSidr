'use client';

import type { IAiFieldOptions, IAiOutputMode } from '@teable/core';
import { Badge, Label, RadioGroup, RadioGroupItem, Textarea } from '@teable/ui-lib/shadcn';
import { Bot, Eye, FileAudio, FileVideo, ImageIcon, Type } from 'lucide-react';
import { AIModelSelect } from './AiModelSelect';
import type { IModelOption } from './AiModelSelect';

/** Simple field descriptor for source column selection */
export interface ISourceField {
  id: string;
  name: string;
}

const OUTPUT_MODE_OPTIONS: {
  value: IAiOutputMode;
  label: string;
  description: string;
  icon: React.ElementType;
}[] = [
  { value: 'text', label: 'Texte', description: 'Réponse textuelle libre', icon: Type },
  { value: 'image', label: 'Image', description: "Génération d'image IA", icon: ImageIcon },
  { value: 'audio', label: 'Audio', description: 'Synthèse vocale / audio', icon: FileAudio },
  { value: 'video', label: 'Vidéo', description: 'Génération de vidéo IA', icon: FileVideo },
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
  modelValue = '',
  onModelChange,
}: ICompactAiFieldConfigProps) {
  const selectedSourceIds = options.sourceFieldIds ?? [];
  const outputMode = options.outputMode ?? 'text';

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
        Configuration du champ IA
      </div>

      {/* Section 1: Output mode */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Type de sortie</Label>
        <RadioGroup
          value={outputMode}
          onValueChange={(v) => onChange({ ...options, outputMode: v as IAiOutputMode })}
          className="grid grid-cols-2 gap-2"
        >
          {OUTPUT_MODE_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            return (
              <label
                key={opt.value}
                htmlFor={`output-mode-${opt.value}`}
                className="hover:bg-accent has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5 flex cursor-pointer items-start gap-2 rounded-md border p-2.5 transition-colors"
              >
                <RadioGroupItem
                  id={`output-mode-${opt.value}`}
                  value={opt.value}
                  className="mt-0.5"
                />
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1 text-xs font-medium">
                    <Icon className="size-3" />
                    {opt.label}
                  </div>
                  <div className="text-muted-foreground text-[10px]">{opt.description}</div>
                </div>
              </label>
            );
          })}
        </RadioGroup>
        {outputMode !== 'text' && (
          <p className="text-muted-foreground text-[10px]">
            {outputMode === 'image' &&
              "Le modèle IA doit prendre en charge la génération d'image. Le résultat sera une URL d'image."}
            {outputMode === 'audio' &&
              'Le modèle IA doit prendre en charge la synthèse vocale. Le résultat sera une URL audio.'}
            {outputMode === 'video' &&
              'Le modèle IA doit prendre en charge la génération de vidéo. Le résultat sera une URL vidéo.'}
          </p>
        )}
      </div>

      {/* Section 2: Prompt */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">Prompt</Label>
        <Textarea
          value={options.prompt ?? ''}
          onChange={(e) => onChange({ ...options, prompt: e.target.value })}
          placeholder={
            outputMode === 'image'
              ? "ex. Génère une illustration représentant {fieldId}."
              : outputMode === 'audio'
                ? 'ex. Lis le texte suivant à voix haute : {fieldId}.'
                : outputMode === 'video'
                  ? 'ex. Crée une courte animation illustrant {fieldId}.'
                  : 'ex. Résume ce contenu en une phrase. Extrais les mots-clés séparés par des virgules.'
          }
          className="min-h-[96px] text-xs"
        />
        <p className="text-muted-foreground text-[10px]">
          Utilisez {'{fieldId}'} pour référencer les valeurs des colonnes source dans votre prompt.
        </p>
      </div>

      {/* Section 3: Source columns */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">Colonnes source</Label>
        {availableFields.length === 0 ? (
          <p className="text-muted-foreground text-xs">Aucun champ disponible.</p>
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
          Les colonnes sélectionnées sont transmises à l&apos;IA comme contexte.
        </p>
      </div>

      {/* Section 4: Model */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">Modèle</Label>
        <AIModelSelect
          value={options.modelKey ?? modelValue}
          onValueChange={(v) => {
            onChange({ ...options, modelKey: v || undefined });
            onModelChange?.(v);
          }}
          options={modelOptions}
          className="w-full"
          placeholder="Sélectionner un modèle..."
          onlyImageOutput={outputMode === 'image'}
        />
      </div>

      {/* Section 5: Live preview (placeholder — deferred) */}
      <div className="space-y-1.5">
        <Label className="flex items-center gap-1 text-xs font-medium">
          <Eye className="size-3" />
          Aperçu en direct
          <Badge variant="secondary" className="text-[10px]">
            DIFFÉRÉ
          </Badge>
        </Label>
        <div className="bg-muted/30 text-muted-foreground flex min-h-[60px] items-center justify-center rounded-md border border-dashed px-4 py-3 text-xs">
          Exécutez le champ pour voir un aperçu — nécessite une connexion au modèle IA.
        </div>
      </div>
    </div>
  );
}
