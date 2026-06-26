'use client';

import { Badge } from '@teable/ui-lib/shadcn/ui/badge';
import { Button } from '@teable/ui-lib/shadcn/ui/button';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { useRouter } from 'next/router';
import { useAppBuilderStore } from '@/features/app/stores/useAppBuilderStore';
import { useUnifiedChatStore } from '@/features/app/stores/useUnifiedChatStore';
import type { UnifiedChatEvent } from '@/types/agent';

interface IProposalField {
  name: string;
  type?: string;
}

interface IProposalPreview {
  tableName?: string;
  fields?: IProposalField[];
  [key: string]: unknown;
}

interface ProposalCardProps {
  proposal: { proposalId: string; action: string; preview: unknown };
  spaceId: string;
  conversationId: string;
  activeBaseId?: string;
}

const ACTION_LABELS: Record<string, string> = {
  create_table: 'Créer une table',
  create_base: 'Créer une base',
  create_field: 'Créer un champ',
  update_table: 'Modifier la table',
  update_field: 'Modifier le champ',
  delete_table: 'Supprimer la table',
  delete_field: 'Supprimer le champ',
  create_record: 'Créer un enregistrement',
  update_record: "Modifier l'enregistrement",
  delete_record: "Supprimer l'enregistrement",
};

/**
 * Returns a French label for a snake_case or camelCase action name.
 * Falls back to humanized English if no translation exists.
 */
function humanizeAction(action: string): string {
  if (ACTION_LABELS[action]) return ACTION_LABELS[action];
  return action
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function PreviewBody({ preview }: { preview: unknown }) {
  const p = preview as IProposalPreview;

  if (!p || typeof p !== 'object') {
    return <p className="mt-2 text-sm text-foreground">{String(preview)}</p>;
  }

  if (p.tableName) {
    return (
      <div className="mt-2 space-y-1 text-sm">
        <p className="font-medium text-foreground">{p.tableName}</p>
        {Array.isArray(p.fields) && p.fields.length > 0 && (
          <ul className="mt-1 space-y-0.5 text-muted-foreground">
            {(p.fields as IProposalField[]).map((f, i) => (
              <li key={i} className="flex items-center gap-1.5">
                <span className="size-1.5 shrink-0 rounded-full bg-primary/40" />
                <span>{f.name}</span>
                {f.type && (
                  <span className="ml-auto rounded bg-muted px-1 py-0.5 text-xs">{f.type}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  // Generic object (agent, base, automation…) — render as labelled fields, no raw JSON
  const entries = Object.entries(p).filter(([, v]) => v !== undefined && v !== null && v !== '');
  return (
    <dl className="mt-2 space-y-2">
      {entries.map(([key, value]) => (
        <div key={key}>
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground dark:text-slate-500">
            {key.replace(/_/g, ' ')}
          </dt>
          <dd className="mt-0.5 text-sm text-foreground dark:text-slate-200">
            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function ProposalCard({ proposal, spaceId, conversationId, activeBaseId }: ProposalCardProps) {
  const { activeProposals, setProposalStatus, appendMessage } = useUnifiedChatStore(spaceId, activeBaseId);
  const status = activeProposals[proposal.proposalId] ?? 'pending';
  const router = useRouter();

  const handleAccept = async () => {
    setProposalStatus(proposal.proposalId, 'accepting');
    try {
      const res = await fetch(`/api/spaces/${spaceId}/ai/accept-proposal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposalId: proposal.proposalId, conversationId }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result = (await res.json()) as Record<string, unknown>;
      setProposalStatus(proposal.proposalId, 'accepted');
      // Handle shouldStream: queue generation and navigate to app page
      if (result?.shouldStream && result?.appId && result?.baseId) {
        useAppBuilderStore.getState().queueGeneration({
          appId: result.appId as string,
          prompt: (result.prompt as string) ?? '',
          baseId: result.baseId as string,
        });
        void router.push(`/base/${result.baseId as string}/app/${result.appId as string}`);
      }
      // Surface result as a chat message so the user knows what happened
      let content: string;
      if (result.status === 'skipped') {
        content = `⚠️ Action ignorée : ${result.reason as string}`;
      } else if (result.shouldStream) {
        content = `✓ Génération du code de l'application en cours…`;
      } else if (result.agentId) {
        content = `✓ Agent "${result.name as string}" créé avec succès.`;
        window.dispatchEvent(
          new CustomEvent('agent-created', { detail: { agentId: result.agentId } })
        );
      } else if (result.name) {
        content = `✓ "${result.name as string}" créé avec succès.`;
      } else {
        content = '✓ Action exécutée avec succès.';
      }
      appendMessage({ type: 'text', role: 'assistant', content } as UnifiedChatEvent);
    } catch {
      setProposalStatus(proposal.proposalId, 'error');
    }
  };

  return (
    <div className="my-2 rounded-lg border bg-card shadow-sm dark:border-slate-700/60 dark:bg-slate-900/80">
      {/* Header */}
      <div className="flex items-center gap-2 border-b px-3 py-2 dark:border-slate-700/60">
        <Badge
          variant="secondary"
          className="text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
        >
          {humanizeAction(proposal.action)}
        </Badge>
      </div>

      {/* Preview body */}
      <div className="px-3 py-2">
        <PreviewBody preview={proposal.preview} />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end border-t px-3 py-2 dark:border-slate-700/60">
        {status === 'pending' && (
          <Button size="sm" onClick={handleAccept}>
            Accepter
          </Button>
        )}
        {status === 'accepting' && (
          <Button size="sm" disabled>
            <Loader2 className="mr-1 size-3 animate-spin" />
            Acceptation…
          </Button>
        )}
        {status === 'accepted' && (
          <span className="flex items-center gap-1 text-sm text-green-600">
            <CheckCircle2 className="size-4" />
            Accepté
          </span>
        )}
        {status === 'error' && (
          <span className="flex items-center gap-1 text-sm text-destructive">
            <XCircle className="size-4" />
            Échec — réessayer ?
            <Button size="sm" variant="outline" className="ml-2" onClick={handleAccept}>
              Réessayer
            </Button>
          </span>
        )}
      </div>
    </div>
  );
}
