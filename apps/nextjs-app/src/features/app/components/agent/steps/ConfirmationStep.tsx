import { Button } from '@teable/ui-lib/shadcn/ui/button';
import { Loader2 } from 'lucide-react';
import React from 'react';

interface ConfirmationStepProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  agentData: any;
  enabledTools: string[];
  onBack: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}

export const ConfirmationStep: React.FC<ConfirmationStepProps> = ({
  agentData,
  enabledTools,
  onBack,
  onConfirm,
  isLoading,
}) => {
  return (
    <div className="space-y-6">
      <div className="space-y-3 rounded-lg border border-border bg-muted/40 p-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Nom
          </p>
          <p className="text-lg font-bold text-foreground">{agentData.name}</p>
        </div>

        {agentData.description && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Description
            </p>
            <p className="text-foreground">{agentData.description}</p>
          </div>
        )}

        {agentData.instructions && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Instructions
            </p>
            <p className="line-clamp-2 text-foreground">{agentData.instructions}</p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {agentData.isPublic && (
            <span className="rounded bg-amber-500/15 px-2 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
              Public
            </span>
          )}
          {enabledTools.map((tool) => (
            <span
              key={tool}
              className="rounded bg-primary/10 px-2 py-1 text-xs font-semibold text-primary"
            >
              {tool}
            </span>
          ))}
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Vérifiez les paramètres ci-dessus avant de créer l'agent. Vous pourrez les modifier
        ultérieurement.
      </p>

      <div className="flex justify-between gap-2">
        <Button variant="outline" onClick={onBack} disabled={isLoading}>
          {'← Précédent'}
        </Button>
        <Button onClick={onConfirm} disabled={isLoading} className="gap-1.5">
          {isLoading && <Loader2 className="size-3.5 animate-spin" />}
          {isLoading ? 'Création…' : "Créer l'agent"}
        </Button>
      </div>
    </div>
  );
};
