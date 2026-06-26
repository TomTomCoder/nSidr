import { Button } from '@teable/ui-lib/shadcn/ui/button';
import { X } from 'lucide-react';
import React, { useState } from 'react';
import { AlignmentStep } from './steps/AlignmentStep';
import { ConfirmationStep } from './steps/ConfirmationStep';
import { PersonalizationStep } from './steps/PersonalizationStep';

interface ICreateAgent {
  name?: string;
  description?: string;
  baseId: string;
  instructions?: string;
  modelKey?: string;
  isPublic?: boolean;
  [key: string]: unknown;
}

interface IAgent extends ICreateAgent {
  id: string;
  createdTime: string;
  createdBy: string;
}

interface AgentWizardProps {
  baseId: string;
  spaceId?: string;
  onCreated: (agent: IAgent) => void;
  onClose: () => void;
}

export const AgentWizard: React.FC<AgentWizardProps> = ({
  baseId,
  spaceId,
  onCreated,
  onClose,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [agentData, setAgentData] = useState<Partial<ICreateAgent>>({
    baseId,
    isPublic: false,
  });
  const [enabledTools, setEnabledTools] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleNext = () => {
    if (step < 3) setStep((prev) => (prev < 3 ? ((prev + 1) as 1 | 2 | 3) : prev));
  };

  const handlePrev = () => {
    if (step > 1) setStep((prev) => (prev > 1 ? ((prev - 1) as 1 | 2 | 3) : prev));
  };

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(agentData),
      });
      if (response.ok) {
        const agent = await response.json();
        onCreated(agent);
        onClose();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const STEP_LABELS = ['Alignement', 'Personnalisation', 'Confirmation'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-xl border border-border bg-background shadow-xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background px-5 py-4">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold text-foreground">Créer un agent</h2>
            {/* Step dots */}
            <div className="flex items-center gap-1.5">
              {STEP_LABELS.map((label, i) => (
                <div key={label} className="flex items-center gap-1.5">
                  <span
                    className={`flex size-5 items-center justify-center rounded-full text-[10px] font-bold transition-colors ${
                      step === i + 1
                        ? 'bg-primary text-primary-foreground'
                        : step > i + 1
                          ? 'bg-primary/20 text-primary'
                          : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span
                    className={`text-xs font-medium ${step === i + 1 ? 'text-foreground' : 'text-muted-foreground'}`}
                  >
                    {label}
                  </span>
                  {i < 2 && <span className="mx-1 text-muted-foreground/40">›</span>}
                </div>
              ))}
            </div>
          </div>
          <Button variant="ghost" size="icon-xs" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>

        {/* Body */}
        <div className="grid grid-cols-3 gap-6 p-6">
          <div className="col-span-2">
            {step === 1 && (
              <AlignmentStep
                value={{
                  description: agentData.description,
                  domain: agentData.domain as string | undefined,
                }}
                onChange={(v) => setAgentData({ ...agentData, ...v })}
                onNext={handleNext}
              />
            )}
            {step === 2 && (
              <PersonalizationStep
                value={{ ...agentData, enabledTools }}
                spaceId={spaceId}
                onChange={(v: Record<string, unknown>) => {
                  setAgentData((prev) => {
                    const { enabledTools: tools, ...rest } = v;
                    setEnabledTools((tools as string[]) || []);
                    return { ...prev, ...rest };
                  });
                }}
                onBack={handlePrev}
                onNext={handleNext}
              />
            )}
            {step === 3 && (
              <ConfirmationStep
                agentData={agentData}
                enabledTools={enabledTools}
                onBack={handlePrev}
                onConfirm={handleConfirm}
                isLoading={isLoading}
              />
            )}
          </div>

          {/* Live preview panel */}
          <div className="col-span-1 h-fit rounded-lg border border-border bg-muted/30 p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Aperçu
            </h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Nom : </span>
                <span className="font-semibold text-foreground">{agentData.name || '—'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Description : </span>
                <span className="font-semibold text-foreground">
                  {agentData.description || '—'}
                </span>
              </div>
              {enabledTools.length > 0 && (
                <div>
                  <p className="mb-1 text-muted-foreground">Outils :</p>
                  <div className="flex flex-wrap gap-1">
                    {enabledTools.map((tool) => (
                      <span
                        key={tool}
                        className="rounded bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary"
                      >
                        {tool}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {agentData.isPublic && (
                <span className="inline-block rounded bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                  Public
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
