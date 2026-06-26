import { cn } from '@teable/ui-lib/shadcn';
import { Button } from '@teable/ui-lib/shadcn/ui/button';
import { Textarea } from '@teable/ui-lib/shadcn/ui/textarea';
import React from 'react';

const DOMAINS = [
  'Gestion de projet',
  'Support client',
  'Analyse de données',
  'Automatisation',
  'Reporting',
];

interface AlignmentStepProps {
  value: { description?: string; domain?: string };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChange: (v: any) => void;
  onNext: () => void;
}

export const AlignmentStep: React.FC<AlignmentStepProps> = ({ value, onChange, onNext }) => {
  const isValid = (value.description?.length ?? 0) >= 10;

  return (
    <div className="space-y-6">
      <div>
        <label className="mb-2 block text-sm font-semibold text-foreground">
          {"Décrivez l'objectif de votre agent"}
        </label>
        <Textarea
          value={value.description ?? ''}
          onChange={(e) => onChange({ ...value, description: e.target.value })}
          placeholder="Ex: Un agent qui aide à trier les emails entrants…"
          rows={4}
          className="resize-none"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          {value.description?.length ?? 0}/100 caractères (minimum 10)
        </p>
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-foreground">
          {"Domaine d'application (optionnel)"}
        </label>
        <div className="flex flex-wrap gap-2">
          {DOMAINS.map((domain) => (
            <button
              key={domain}
              onClick={() => onChange({ ...value, domain })}
              className={cn(
                'rounded-full px-3 py-1 text-sm font-medium transition-colors',
                value.domain === domain
                  ? 'bg-primary text-primary-foreground ring-2 ring-primary/30'
                  : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              {domain}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button onClick={onNext} disabled={!isValid}>
          {'Suivant →'}
        </Button>
      </div>
    </div>
  );
};
