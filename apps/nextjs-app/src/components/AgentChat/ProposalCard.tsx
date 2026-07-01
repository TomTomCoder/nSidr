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
  required?: boolean;
  unique?: boolean;
  choices?: string[];
  foreignTableName?: string;
}

interface IProposalPreview {
  tableName?: string;
  fields?: IProposalField[];
  trigger?: { type: string; config?: Record<string, unknown> };
  steps?: { type: string; name?: string; config?: Record<string, unknown> }[];
  description?: string;
  tools?: string[];
  scheduling?: { cron: string };
  isPublic?: boolean;
  [key: string]: unknown;
}

const TRIGGER_LABELS: Record<string, string> = {
  scheduled: 'Planifié',
  webhook_received: 'Webhook reçu',
  email_received: 'Email reçu',
  record_created: 'Enregistrement créé',
  record_updated: 'Enregistrement modifié',
  record_deleted: 'Enregistrement supprimé',
  button_clicked: 'Bouton cliqué',
  record_matches_conditions: 'Conditions remplies',
};

const STEP_LABELS: Record<string, string> = {
  send_slack: 'Envoyer un message Slack',
  send_email: 'Envoyer un email',
  http_request: 'Appel HTTP',
  if_condition: 'Condition',
  ai_generate: 'Génération IA',
  create_record: 'Créer un enregistrement',
  update_record: 'Modifier un enregistrement',
  get_records: 'Lire des enregistrements',
  execute_script: 'Exécuter un script',
};

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
  create_view: 'Créer une vue',
  update_table: 'Modifier la table',
  update_field: 'Modifier le champ',
  delete_table: 'Supprimer la table',
  delete_field: 'Supprimer le champ',
  create_record: 'Créer un enregistrement',
  update_record: "Modifier l'enregistrement",
  delete_record: "Supprimer l'enregistrement",
  create_knowledge_doc: 'Créer un document',
  update_knowledge_doc: 'Modifier le document',
  link_docs: 'Lier deux documents',
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
                {f.required && <span className="text-xs text-destructive">*</span>}
                {f.foreignTableName && (
                  <span className="text-xs text-muted-foreground">→ {f.foreignTableName}</span>
                )}
                {f.choices && f.choices.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    ({f.choices.length} options)
                  </span>
                )}
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

  if (p.trigger || (Array.isArray(p.steps) && p.steps.length > 0)) {
    return (
      <div className="mt-2 space-y-2 text-sm">
        {p.trigger && (
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground dark:text-slate-500">
              Déclencheur
            </span>
            <p className="text-foreground dark:text-slate-200">
              {TRIGGER_LABELS[p.trigger.type] ?? p.trigger.type}
            </p>
          </div>
        )}
        {Array.isArray(p.steps) && p.steps.length > 0 && (
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground dark:text-slate-500">
              Étapes
            </span>
            <ol className="mt-1 space-y-0.5 text-muted-foreground">
              {p.steps.map((s, i) => (
                <li key={i} className="flex items-center gap-1.5">
                  <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] text-primary">
                    {i + 1}
                  </span>
                  <span>{s.name ?? STEP_LABELS[s.type] ?? s.type}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
        {p.description && !p.trigger && (
          <p className="text-xs italic text-muted-foreground">{p.description}</p>
        )}
      </div>
    );
  }

  if (Array.isArray(p.tools) || p.scheduling) {
    return (
      <div className="mt-2 space-y-2 text-sm">
        {Array.isArray(p.tools) && p.tools.length > 0 && (
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground dark:text-slate-500">
              Outils activés
            </span>
            <div className="mt-1 flex flex-wrap gap-1">
              {p.tools.map((toolName) => (
                <Badge key={toolName} variant="outline" className="text-xs">
                  {toolName.replace(/_/g, ' ')}
                </Badge>
              ))}
            </div>
          </div>
        )}
        {p.scheduling?.cron && (
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground dark:text-slate-500">
              Planification
            </span>
            <p className="text-foreground dark:text-slate-200">Cron : {p.scheduling.cron}</p>
          </div>
        )}
        {p.isPublic && <Badge variant="secondary">Visible par l&apos;espace</Badge>}
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

export function ProposalCard({
  proposal,
  spaceId,
  conversationId,
  activeBaseId,
}: ProposalCardProps) {
  const { activeProposals, setProposalStatus, appendMessage } = useUnifiedChatStore(
    spaceId,
    activeBaseId
  );
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
      // 409 means the proposal was already accepted — typically because a slow first call
      // (e.g. an LLM fallback retry) outlived the dev proxy's timeout and the UI surfaced a
      // false "failed", so the user retried while the original request was still finishing
      // successfully in the background. Treat it as the success it already is, not an error.
      if (res.status === 409) {
        setProposalStatus(proposal.proposalId, 'accepted');
        return;
      }
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
