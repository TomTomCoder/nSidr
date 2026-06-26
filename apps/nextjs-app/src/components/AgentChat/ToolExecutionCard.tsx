'use client';

import { ChevronDown, ChevronRight, CheckCircle2, Loader2 } from 'lucide-react';
import { memo, useState } from 'react';

interface ToolExecutionCardProps {
  name: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown> | object;
}

// eslint-disable-next-line sonarjs/cognitive-complexity
function getToolSummary(name: string, input: Record<string, unknown>): string {
  switch (name) {
    case 'search_records': {
      const tableId = (input.tableId as string | undefined) ?? '';
      const query = (input.query as string | undefined) ?? '';
      return `Recherche dans la table ${tableId.slice(-6)} pour "${query}"`;
    }
    case 'get_records':
      return `Lecture des enregistrements de la table ${((input.tableId as string) ?? '').slice(-6)}`;
    case 'get_record':
      return `Lecture de l'enregistrement ${((input.recordId as string) ?? '').slice(-6)}`;
    case 'create_record':
      return `Création d'un enregistrement dans la table ${((input.tableId as string) ?? '').slice(-6)}`;
    case 'update_record':
      return `Mise à jour de l'enregistrement ${((input.recordId as string) ?? '').slice(-6)}`;
    case 'delete_record':
      return `Suppression de l'enregistrement ${((input.recordId as string) ?? '').slice(-6)}`;
    case 'create_comment':
      return `Commentaire sur l'enregistrement ${((input.recordId as string) ?? '').slice(-6)}`;
    case 'get_record_activity':
      return `Récupération de l'activité de l'enregistrement ${((input.recordId as string) ?? '').slice(-6)}`;
    case 'search_knowledge_base':
      return `Recherche dans la base de connaissances pour "${(input.query as string | undefined) ?? ''}"`;
    case 'save_memory':
      return `Mémorisé : "${((input.content as string) ?? '').slice(0, 50)}"`;
    case 'set_preference':
      return `Préférence définie ${input.key as string} = ${input.value as string}`;
    case 'read_unread_emails':
      return 'Lecture des e-mails non lus depuis Gmail';
    case 'search_emails':
      return `Recherche Gmail pour "${(input.query as string | undefined) ?? ''}"`;
    case 'send_email':
      return `E-mail envoyé à ${(input.to as string | undefined) ?? ''}`;
    case 'get_email_details':
      return "Récupération des détails de l'e-mail";
    case 'list_slack_channels':
      return 'Liste des canaux Slack';
    case 'read_slack_messages':
      return `Lecture des messages de ${(input.channel as string | undefined) ?? 'Slack'}`;
    case 'send_slack_message':
      return `Message Slack envoyé à ${(input.channel as string | undefined) ?? ''}`;
    case 'search_slack_messages':
      return `Recherche Slack pour "${(input.query as string | undefined) ?? ''}"`;
    case 'create_issue':
      return `Problème GitHub créé : "${(input.title as string | undefined) ?? ''}"`;
    case 'list_pull_requests':
      return 'Liste des pull requests GitHub';
    case 'add_comment':
      return `Commentaire sur le problème GitHub #${(input.issueNumber as string | undefined) ?? ''}`;
    case 'get_issue_details':
      return `Récupération du problème GitHub #${(input.issueNumber as string | undefined) ?? ''}`;
    default: {
      const firstVal = Object.values(input)[0];
      return `${name}${firstVal ? ` (${String(firstVal).slice(0, 40)})` : ''}`;
    }
  }
}

function getOutputSummary(name: string, output: object): string | null {
  const o = output as Record<string, unknown>;
  if (o.error) return `Erreur : ${String(o.error)}`;
  switch (name) {
    case 'search_records':
    case 'search_knowledge_base':
      return `${(o.count as number | undefined) ?? (o.results as unknown[] | undefined)?.length ?? 0} résultat(s) trouvé(s)`;
    case 'get_records':
      return `${(o.count as number | undefined) ?? (o.records as unknown[] | undefined)?.length ?? 0} enregistrement(s)`;
    case 'create_record':
    case 'update_record':
    case 'delete_record':
      return o.success ? 'Succès' : 'Échec';
    case 'send_email':
    case 'send_slack_message':
      return o.success ? 'Envoyé' : 'Échec';
    default:
      return null;
  }
}

/** Memoized: tool cards don't change after the tool completes. */
export const ToolExecutionCard = memo(function ToolExecutionCard({
  name,
  input,
  output,
}: ToolExecutionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const summary = getToolSummary(name, input);
  const outputSummary = output ? getOutputSummary(name, output) : null;
  const hasError = output && !!(output as Record<string, unknown>).error;

  return (
    <div className="my-1 overflow-hidden rounded-md border bg-muted/30 text-xs">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-muted/50"
      >
        {output ? (
          <CheckCircle2
            className={`size-3.5 shrink-0 ${hasError ? 'text-destructive' : 'text-green-500'}`}
          />
        ) : (
          <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" />
        )}
        <span className="flex-1 break-words text-muted-foreground">{summary}</span>
        {outputSummary && (
          <span
            className={`shrink-0 font-medium ${hasError ? 'text-destructive' : 'text-foreground'}`}
          >
            {outputSummary}
          </span>
        )}
        {isExpanded ? (
          <ChevronDown className="size-3 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-3 shrink-0 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="space-y-2 border-t bg-muted/20 px-3 py-2">
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Input
            </p>
            <pre className="overflow-x-auto rounded border bg-background p-2 font-mono text-[11px] text-foreground">
              {JSON.stringify(input, null, 2)}
            </pre>
          </div>
          {output && (
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Output
              </p>
              <pre className="overflow-x-auto rounded border bg-background p-2 font-mono text-[11px] text-foreground">
                {JSON.stringify(output, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
});
