import { useQuery } from '@tanstack/react-query';
import type { IAnalyzeVo } from '@teable/openapi';
import { getAIConfig } from '@teable/openapi';
import { Button } from '@teable/ui-lib/shadcn/ui/button';
import { Switch } from '@teable/ui-lib/shadcn/ui/switch';
import { Textarea } from '@teable/ui-lib/shadcn/ui/textarea';
import { Eye, Sparkles } from 'lucide-react';
import { AIModelSelect } from '@/features/app/blocks/admin/setting/components/ai-config/AiModelSelect';
import {
  generateGatewayModelKeyList,
  generateModelKeyList,
} from '@/features/app/blocks/admin/setting/components/ai-config/utils';

interface IImportPreviewPanelProps {
  worksheets: IAnalyzeVo['worksheets'];
  baseId: string;
  aiEnabled: boolean;
  onAiEnabledChange: (v: boolean) => void;
  aiPrompt: string;
  onAiPromptChange: (v: string) => void;
  aiModelKey: string;
  onAiModelKeyChange: (v: string) => void;
  onContinue: () => void;
  onBack: () => void;
}

export const ImportPreviewPanel = ({
  worksheets,
  baseId,
  aiEnabled,
  onAiEnabledChange,
  aiPrompt,
  onAiPromptChange,
  aiModelKey,
  onAiModelKeyChange,
  onContinue,
  onBack,
}: IImportPreviewPanelProps) => {
  const sheetEntries = Object.entries(worksheets);

  const { data: baseAiConfig } = useQuery({
    queryKey: ['ai-config', baseId],
    queryFn: () => getAIConfig(baseId).then(({ data }) => data),
  });
  const { llmProviders = [], gatewayModels } = baseAiConfig ?? {};
  const models = [
    ...generateGatewayModelKeyList(gatewayModels),
    ...generateModelKeyList(llmProviders),
  ];

  if (sheetEntries.length === 0) return null;

  return (
    <div className="flex flex-col gap-4 py-4">
      <div className="flex items-center gap-2 px-1">
        <Eye className="size-4 text-muted-foreground" />
        <p className="text-sm font-semibold">Aperçu des données</p>
        <span className="text-xs text-muted-foreground">
          ({sheetEntries.length} feuille{sheetEntries.length > 1 ? 's' : ''})
        </span>
      </div>

      <div className="flex flex-col gap-6 overflow-auto">
        {sheetEntries.map(([key, sheet]) => (
          <div key={key} className="flex flex-col gap-2">
            {sheetEntries.length > 1 && (
              <p className="text-xs font-medium text-muted-foreground">{sheet.name}</p>
            )}
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/50">
                    {sheet.columns.map((col, i) => (
                      <th
                        key={i}
                        className="whitespace-nowrap px-3 py-2 text-left font-medium"
                        title={col.type}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="rounded bg-primary/10 px-1 py-0.5 font-mono text-[10px] text-primary">
                            {col.type
                              .replace('singleLineText', 'text')
                              .replace('longText', 'text↕')}
                          </span>
                          <span>{col.name}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(sheet.sampleRows ?? []).slice(0, 5).map((row, ri) => (
                    <tr key={ri} className="border-b last:border-0 hover:bg-muted/30">
                      {sheet.columns.map((_, ci) => (
                        <td
                          key={ci}
                          className="max-w-[180px] truncate px-3 py-1.5 text-muted-foreground"
                        >
                          {row[ci] != null ? (
                            String(row[ci])
                          ) : (
                            <span className="text-muted-foreground/40">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {(sheet.sampleRows ?? []).length === 0 && (
                    <tr>
                      <td
                        colSpan={sheet.columns.length}
                        className="px-3 py-4 text-center text-muted-foreground"
                      >
                        Aucune donnée à prévisualiser
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="px-1 text-xs text-muted-foreground">
              {sheet.columns.length} colonne{sheet.columns.length > 1 ? 's' : ''} détectée
              {sheet.columns.length > 1 ? 's' : ''}
              {sheet.sampleRows?.length
                ? ` · ${sheet.sampleRows.length} ligne${sheet.sampleRows.length > 1 ? 's' : ''} affichée${sheet.sampleRows.length > 1 ? 's' : ''}`
                : ''}
            </p>
          </div>
        ))}
      </div>

      {/* AI section */}
      <div className="border-t pt-3">
        <div className="flex items-start gap-3 rounded-lg border bg-primary/5 px-3 py-2.5">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
          <div className="flex flex-1 flex-col gap-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Analyser et implémenter avec l&apos;IA</p>
                <p className="text-xs text-muted-foreground">
                  L&apos;IA optimise les noms de colonnes et détecte les types automatiquement
                </p>
              </div>
              <Switch
                checked={aiEnabled}
                onCheckedChange={onAiEnabledChange}
                aria-label="Activer l'analyse IA"
              />
            </div>
            {aiEnabled && (
              <div className="flex flex-col gap-2">
                <AIModelSelect
                  value={aiModelKey}
                  onValueChange={onAiModelKeyChange}
                  options={models}
                  size="sm"
                  placeholder="Modèle par défaut"
                />
                <Textarea
                  value={aiPrompt}
                  onChange={(e) => onAiPromptChange(e.target.value)}
                  placeholder="Ex : Renomme les colonnes en français, détecte les emails et les dates…"
                  className="min-h-[56px] resize-none text-xs"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-2">
        <Button size="sm" variant="outline" onClick={onBack}>
          Retour
        </Button>
        <Button size="sm" onClick={onContinue}>
          {aiEnabled ? "Analyser avec l'IA" : 'Continuer la configuration'}
        </Button>
      </div>
    </div>
  );
};
