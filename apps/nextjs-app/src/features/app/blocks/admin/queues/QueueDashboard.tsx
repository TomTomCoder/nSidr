'use client';

import { useQuery } from '@tanstack/react-query';
import { getAxios } from '@teable/openapi';
import { CheckCircle2, Circle, Loader2, XCircle, Clock } from 'lucide-react';
import { AdminHelpPanel } from '../shared/AdminHelpPanel';

interface IJobSummary {
  id: string;
  name: string;
  state: string;
  progress: number | object;
  failedReason?: string;
  timestamp?: number;
}

interface IQueueDetail {
  name: string;
  counts: { waiting: number; active: number; completed: number; failed: number; delayed: number };
  jobs: IJobSummary[];
}

async function fetchQueues(): Promise<IQueueDetail[]> {
  const axios = getAxios();
  const { data } = await axios.get<IQueueDetail[]>('/admin/performance/queues');
  return data;
}

function StateIcon({ state }: { state: string }) {
  switch (state) {
    case 'completed':
      return <CheckCircle2 className="size-3.5 shrink-0 text-green-500" />;
    case 'active':
      return <Loader2 className="size-3.5 shrink-0 animate-spin text-primary" />;
    case 'failed':
      return <XCircle className="size-3.5 shrink-0 text-destructive" />;
    case 'delayed':
      return <Clock className="size-3.5 shrink-0 text-amber-500" />;
    default:
      return <Circle className="size-3.5 shrink-0 text-muted-foreground/50" />;
  }
}

function StatChip({
  label,
  value,
  variant,
}: {
  label: string;
  value: number;
  variant?: 'destructive' | 'active' | 'success' | 'default';
}) {
  const color =
    variant === 'destructive' && value > 0
      ? 'bg-destructive/10 text-destructive'
      : variant === 'active' && value > 0
        ? 'bg-primary/10 text-primary'
        : variant === 'success' && value > 0
          ? 'bg-green-500/10 text-green-700 dark:text-green-400'
          : 'bg-muted text-muted-foreground';

  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}>
      {value} {label}
    </span>
  );
}

function QueueCard({ queue }: { queue: IQueueDetail }) {
  const { counts, jobs } = queue;
  const totalActive = counts.waiting + counts.active;

  return (
    <div className="rounded-lg border">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          {totalActive > 0 ? (
            <Loader2 className="size-4 animate-spin text-primary" />
          ) : (
            <Circle className="size-4 text-muted-foreground/40" />
          )}
          <span className="text-sm font-medium">{queue.name}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <StatChip label="waiting" value={counts.waiting} />
          <StatChip label="active" value={counts.active} variant="active" />
          <StatChip label="failed" value={counts.failed} variant="destructive" />
          <StatChip label="done" value={counts.completed} variant="success" />
        </div>
      </div>

      {/* Job list */}
      {jobs.length === 0 ? (
        <div className="px-4 py-6 text-center text-sm text-muted-foreground">
          Aucun job enregistré
        </div>
      ) : (
        <div className="divide-y">
          {jobs.map((job) => (
            <div key={job.id} className="flex items-center gap-3 px-4 py-2.5">
              <StateIcon state={job.state} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-xs font-medium">{job.name}</span>
                  <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                    {job.id.slice(-8)}
                  </span>
                </div>
                {job.failedReason && (
                  <p className="mt-0.5 truncate text-[11px] text-destructive">{job.failedReason}</p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                {typeof job.progress === 'number' && job.progress > 0 && (
                  <span>{job.progress}%</span>
                )}
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                    job.state === 'completed'
                      ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400'
                      : job.state === 'failed'
                        ? 'bg-destructive/10 text-destructive'
                        : job.state === 'active'
                          ? 'bg-primary/10 text-primary'
                          : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {job.state}
                </span>
                {job.timestamp && <span>{new Date(job.timestamp).toLocaleTimeString()}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function QueueDashboard() {
  const { data, isLoading, error, dataUpdatedAt } = useQuery<IQueueDetail[]>({
    queryKey: ['admin', 'queues', 'detail'],
    queryFn: fetchQueues,
    refetchInterval: 5_000,
    retry: 2,
  });

  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : null;

  return (
    <div className="flex h-screen flex-1 flex-col overflow-y-auto overflow-x-hidden p-4 sm:p-8">
      <div className="flex items-start justify-between pb-6">
        <div>
          <h1 className="text-2xl font-semibold">Job Queues</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Moniteur de files d&apos;attente — actualisation toutes les 5 s
          </p>
        </div>
        {lastUpdated && (
          <span className="mt-1 text-xs text-muted-foreground">Mis à jour à {lastUpdated}</span>
        )}
      </div>

      <AdminHelpPanel
        intro={
          <p>
            Cette page monitore les <strong>files d&apos;attente BullMQ</strong> du backend —
            traitement des imports CSV et des générations IA. Les données sont actualisées toutes
            les 5 s.
          </p>
        }
        steps={[
          {
            title: 'Comprendre les files',
            body: '"import-queue" traite les imports CSV/Excel en arrière-plan. "ai-generation-queue" gère les tâches de génération IA (champs calculés, automatisations). Chaque file affiche ses compteurs de jobs.',
          },
          {
            title: 'Lire les états des jobs',
            body: 'waiting = en attente de traitement · active = en cours (spinner) · completed = terminé avec succès · failed = erreur · delayed = planifié pour plus tard.',
          },
          {
            title: 'Diagnostiquer les échecs',
            body: 'Un job en état "failed" affiche la raison de l\'échec en rouge sous son nom. Les jobs les plus récents apparaissent en tête de liste (50 max par file).',
          },
          {
            title: 'Mode sans Redis',
            body: "Sans Redis, les files fonctionnent en mémoire (fallback local). Les jobs ne persistent pas entre les redémarrages du serveur. Pour activer Redis : définissez REDIS_HOST et REDIS_PORT dans l'env du backend.",
          },
        ]}
        tips={[
          {
            icon: '🔄',
            text: 'Rafraîchissement automatique toutes les 5 s — la page est un moniteur temps réel.',
          },
          {
            icon: '⚡',
            text: 'Un grand nombre de jobs "waiting" peut indiquer un manque de workers BullMQ ou un backend surchargé.',
          },
          {
            icon: '🗂',
            text: 'Les jobs "completed" sont conservés 50 max par file pour l\'historique. Les plus anciens sont supprimés automatiquement.',
          },
          {
            icon: '🏗',
            text: "Pour déclencher un import : uploadez un fichier CSV depuis n'importe quelle table → un job apparaît dans import-queue.",
          },
        ]}
      />

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Chargement…
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive p-4 text-sm text-destructive">
          Impossible de charger les files d&apos;attente — le backend est-il en cours
          d&apos;exécution ?
        </div>
      )}

      {data && (
        <div className="space-y-4">
          {data.map((queue) => (
            <QueueCard key={queue.name} queue={queue} />
          ))}
        </div>
      )}
    </div>
  );
}
