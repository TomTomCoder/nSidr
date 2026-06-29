'use client';

import { Button } from '@teable/ui-lib/shadcn/ui/button';
import { Textarea } from '@teable/ui-lib/shadcn/ui/textarea';
import { AlertCircle, ArrowRight, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useFullAppGenerationStore } from '@/features/app/stores/useFullAppGenerationStore';
import { useUnifiedChatStore } from '@/features/app/stores/useUnifiedChatStore';
import type { FullAppStage } from '@/types/agent';
import { ProposalCard } from './ProposalCard';

const STAGE_LABELS: Record<FullAppStage, string> = {
  tables: 'Tables',
  subgenerators: 'Interface & automatisation',
  agents: 'Agent IA',
  mock_data: 'Données fictives',
  done: 'Terminé',
};

const STAGE_ORDER: FullAppStage[] = ['tables', 'subgenerators', 'agents', 'mock_data', 'done'];

function StageProgress({ stage }: { stage: FullAppStage | 'idle' }) {
  if (stage === 'idle') return null;
  const currentIndex = STAGE_ORDER.indexOf(stage as FullAppStage);
  return (
    <div className="flex items-center gap-1 px-3 py-2 text-xs">
      {STAGE_ORDER.map((s, i) => (
        <div key={s} className="flex items-center gap-1">
          <span
            className={
              i < currentIndex || stage === 'done'
                ? 'text-primary'
                : i === currentIndex
                  ? 'font-medium text-foreground'
                  : 'text-muted-foreground'
            }
          >
            {STAGE_LABELS[s]}
          </span>
          {i < STAGE_ORDER.length - 1 && <ArrowRight className="size-3 text-muted-foreground" />}
        </div>
      ))}
    </div>
  );
}

interface FullAppPanelProps {
  spaceId: string;
  baseId: string;
}

/**
 * Drives the Phase 6 "Application complète" saga: a prompt kicks off table generation, then
 * each subsequent stage (interface+automation, agent, report) only runs once the user has
 * accepted every proposal from the stage before it — see AppBlueprintService's class doc for
 * why this is two endpoints and a "Continuer" button rather than one continuous stream.
 */
export function FullAppPanel({ spaceId, baseId }: FullAppPanelProps) {
  const [prompt, setPrompt] = useState('');
  const {
    conversationId,
    stage,
    isStreaming,
    events,
    pendingProposalIds,
    report,
    error,
    startGeneration,
    continueGeneration,
    restore,
    reset,
  } = useFullAppGenerationStore();
  const { activeProposals } = useUnifiedChatStore(spaceId, baseId);

  // Resumes a run still in progress for this base — see useFullAppGenerationStore's
  // saveSnapshot/restore: a saga can span several minutes across "Continuer" clicks, so
  // losing all progress on a page reload would otherwise be the common case, not an edge one.
  useEffect(() => {
    restore(baseId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseId]);

  const allPendingAccepted =
    pendingProposalIds.length > 0 &&
    pendingProposalIds.every((id) => activeProposals[id] === 'accepted');
  const awaitingAcceptance = stage !== 'idle' && stage !== 'done' && !isStreaming;
  const proposalEvents = events.filter((e) => e.type === 'proposal' && e.proposal);

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    void startGeneration({ spaceId, baseId, prompt: prompt.trim() });
  };

  return (
    <div className="flex h-full flex-col">
      {stage !== 'idle' && <StageProgress stage={stage} />}

      <div className="flex-1 overflow-y-auto px-3 py-2">
        {stage === 'idle' ? (
          <div className="flex h-full flex-col gap-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Sparkles className="size-4 text-primary" />
              Décris l&apos;application complète que tu veux générer
            </div>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ex. : Une application de suivi de stock avec produits, fournisseurs et alertes de réapprovisionnement"
              className="min-h-[100px] text-sm"
            />
            <Button onClick={handleGenerate} disabled={!prompt.trim() || isStreaming}>
              {isStreaming ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : null}
              Générer
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {proposalEvents.map((e, i) => (
              <ProposalCard
                key={e.proposal!.proposalId ?? i}
                proposal={e.proposal!}
                spaceId={spaceId}
                conversationId={conversationId ?? ''}
                activeBaseId={baseId}
              />
            ))}

            {report && (
              <div className="rounded-lg border bg-card p-3 text-sm">
                <p className="mb-1 flex items-center gap-1.5 font-medium text-green-600">
                  <CheckCircle2 className="size-4" />
                  Application générée
                </p>
                <dl className="space-y-0.5 text-xs text-muted-foreground">
                  <div>Tables créées : {String(report.tablesCreated)}</div>
                  <div>Interface : {report.interfaceCreated ? 'oui' : 'non'}</div>
                  <div>Automatisation : {report.automationCreated ? 'oui' : 'non'}</div>
                  <div>Agents : {String(report.agentsCreated)}</div>
                  <div>
                    Lignes remplies (données fictives) : {String(report.mockRecordsFilled ?? 0)}
                  </div>
                </dl>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                {error}
              </div>
            )}
          </div>
        )}
      </div>

      {awaitingAcceptance && (
        <div className="border-t px-3 py-2">
          <Button
            className="w-full"
            disabled={!allPendingAccepted || isStreaming}
            onClick={() => void continueGeneration(spaceId)}
          >
            {isStreaming ? (
              <Loader2 className="mr-1.5 size-3.5 animate-spin" />
            ) : (
              <ArrowRight className="mr-1.5 size-3.5" />
            )}
            {allPendingAccepted
              ? 'Continuer'
              : `Accepte les ${pendingProposalIds.length > 1 ? 'propositions' : 'la proposition'} ci-dessus pour continuer`}
          </Button>
        </div>
      )}

      {stage === 'done' && (
        <div className="border-t px-3 py-2">
          <Button variant="outline" className="w-full" onClick={reset}>
            Générer une autre application
          </Button>
        </div>
      )}
    </div>
  );
}
