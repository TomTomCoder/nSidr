import { useQuery } from '@tanstack/react-query';
import { getAxios } from '@teable/openapi';
import { AdminHelpPanel } from '../shared/AdminHelpPanel';

interface ISlowRequest {
  endpoint: string;
  duration: number;
  timestamp: number;
  userId: string | null;
}

interface IQueueDepth {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

interface ICacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  errors: number;
}

interface IPerformanceStats {
  cacheStats: ICacheStats;
  cacheHitPct: number;
  cacheEnabled: boolean;
  typeStats: Record<string, { hits: number; misses: number }>;
  queues: IQueueDepth[];
  slowRequests: ISlowRequest[];
}

async function fetchPerformanceStats(): Promise<IPerformanceStats> {
  const axios = getAxios();
  const { data } = await axios.get<IPerformanceStats>('/admin/performance/stats');
  return data;
}

function StatCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {children}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="rounded-lg border p-4 shadow-sm">
          <div className="mb-3 h-4 w-1/3 animate-pulse rounded bg-muted" />
          <div className="h-8 w-1/2 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

export function PerformanceDashboard() {
  const { data, isLoading, error } = useQuery<IPerformanceStats>({
    queryKey: ['admin', 'performance', 'stats'],
    queryFn: fetchPerformanceStats,
    refetchInterval: 10_000,
    retry: 2,
  });

  if (isLoading) {
    return (
      <div className="flex h-screen flex-1 flex-col overflow-y-auto overflow-x-hidden p-4 sm:p-8">
        <div className="pb-6">
          <h1 className="text-2xl font-semibold">Performance</h1>
          <p className="mt-2 text-sm text-muted-foreground">Chargement…</p>
        </div>
        <LoadingSkeleton />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-screen flex-1 flex-col overflow-y-auto overflow-x-hidden p-4 sm:p-8">
        <div className="pb-6">
          <h1 className="text-2xl font-semibold">Performance</h1>
        </div>
        <div className="rounded-lg border border-destructive p-4 text-sm text-destructive">
          Impossible de charger les statistiques — le backend est-il en cours d&apos;exécution ?
        </div>
      </div>
    );
  }

  const totalCache = data.cacheStats.hits + data.cacheStats.misses;
  const totalQueueDepth = data.queues.reduce((acc, q) => acc + q.waiting + q.active, 0);
  const typeStatEntries = Object.entries(data.typeStats ?? {});

  return (
    <div className="flex h-screen flex-1 flex-col overflow-y-auto overflow-x-hidden p-4 sm:p-8">
      <div className="pb-6">
        <h1 className="text-2xl font-semibold">Performance</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Statistiques en direct — actualisation toutes les 10 s
        </p>
      </div>

      <AdminHelpPanel
        intro={
          <p>
            Cette page affiche les <strong>métriques de performance en direct</strong> du backend :
            taux de cache, files d&apos;attente et requêtes lentes. Actualisation automatique toutes
            les 10 s.
          </p>
        }
        steps={[
          {
            title: 'Activer le cache Redis',
            body: 'Sans la variable d\'env BACKEND_PERFORMANCE_CACHE (URL Redis), toutes les métriques de cache affichent "N/A". Ajoutez BACKEND_PERFORMANCE_CACHE=redis://localhost:6379 et redémarrez le backend.',
          },
          {
            title: 'Interpréter le taux de cache',
            body: 'Vert ≥ 80 % = excellent. Amber 50–79 % = correct. Rouge < 50 % = préoccupant. Un taux bas peut indiquer des clés de cache mal dimensionnées ou un TTL trop court.',
          },
          {
            title: 'Surveiller les requêtes lentes',
            body: 'Le tableau "Requêtes lentes" liste les endpoints dépassant 500 ms. Rouge > 2 s, amber > 1 s. Utilisez ces données pour cibler les optimisations (index DB, mise en cache).',
          },
          {
            title: "Monitorer les files d'attente",
            body: 'Les compteurs de files (waiting/active/failed) sont un aperçu rapide. Pour le détail des jobs, rendez-vous sur la page Job Queues.',
          },
        ]}
        tips={[
          {
            icon: '♻️',
            text: 'La page se rafraîchit automatiquement — inutile de recharger manuellement.',
          },
          {
            icon: '🔴',
            text: 'Des erreurs de cache (colonne Errors > 0) indiquent des problèmes de connexion Redis.',
          },
          {
            icon: '📉',
            text: "Un cache désactivé n'affecte pas les fonctionnalités — il réduit seulement les performances.",
          },
        ]}
      />

      {/* Cache disabled banner */}
      {!data.cacheEnabled && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
          <span className="font-medium">Cache de performance désactivé.</span> Définissez la
          variable d&apos;environnement{' '}
          <code className="rounded bg-amber-100 px-1 dark:bg-amber-900">
            BACKEND_PERFORMANCE_CACHE
          </code>{' '}
          avec une URL Redis pour activer le cache.
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {/* Panel 1: Cache hit % */}
        <StatCard title="Cache Hit %">
          {!data.cacheEnabled ? (
            <p className="text-sm text-muted-foreground">Cache désactivé</p>
          ) : totalCache === 0 ? (
            <p className="text-2xl font-bold text-muted-foreground">—</p>
          ) : (
            <>
              <p className="text-3xl font-bold">{data.cacheHitPct}%</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {data.cacheStats.hits} hits / {data.cacheStats.misses} misses
              </p>
            </>
          )}
          {/* Per-type breakdown */}
          {typeStatEntries.length > 0 && (
            <div className="mt-3 space-y-1 border-t pt-3">
              {typeStatEntries.map(([type, stats]) => {
                const total = stats.hits + stats.misses;
                const pct = total > 0 ? Math.round((stats.hits / total) * 100) : 0;
                return (
                  <div key={type} className="flex items-center justify-between text-xs">
                    <span className="truncate text-muted-foreground">{type}</span>
                    <span
                      className={
                        pct >= 80
                          ? 'font-medium text-green-600'
                          : pct >= 50
                            ? 'font-medium text-amber-600'
                            : 'font-medium text-destructive'
                      }
                    >
                      {pct}%
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </StatCard>

        {/* Panel 2: Queue depth */}
        <StatCard title="Queue Depth">
          {data.queues.length === 0 ? (
            <p className="text-2xl font-bold text-muted-foreground">N/A</p>
          ) : (
            <>
              <p className="text-3xl font-bold">{totalQueueDepth}</p>
              <div className="mt-2 space-y-1">
                {data.queues.map((q) => (
                  <div key={q.name} className="flex items-center justify-between text-xs">
                    <span className="truncate text-muted-foreground">{q.name}</span>
                    <span>
                      {q.waiting}w / {q.active}a / {q.failed}f
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </StatCard>

        {/* Panel 3: Cache operations */}
        <StatCard title="Cache Operations">
          {!data.cacheEnabled ? (
            <p className="text-sm text-muted-foreground">Cache désactivé</p>
          ) : (
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sets</span>
                <span className="font-medium">{data.cacheStats.sets}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Deletes</span>
                <span className="font-medium">{data.cacheStats.deletes}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Errors</span>
                <span
                  className={`font-medium ${data.cacheStats.errors > 0 ? 'text-destructive' : ''}`}
                >
                  {data.cacheStats.errors}
                </span>
              </div>
            </div>
          )}
        </StatCard>

        {/* Panel 4: Slow requests */}
        <StatCard title="Requêtes lentes (> 500 ms)">
          {data.slowRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune requête lente enregistrée</p>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="pb-1 text-left font-medium">Endpoint</th>
                    <th className="pb-1 text-right font-medium">ms</th>
                    <th className="pb-1 text-right font-medium">Heure</th>
                  </tr>
                </thead>
                <tbody>
                  {data.slowRequests.slice(0, 10).map((req, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="max-w-[150px] truncate py-1 pr-2">{req.endpoint}</td>
                      <td
                        className={`py-1 text-right font-mono ${req.duration > 2000 ? 'text-destructive' : req.duration > 1000 ? 'text-amber-600' : ''}`}
                      >
                        {req.duration}
                      </td>
                      <td className="py-1 text-right text-muted-foreground">
                        {new Date(req.timestamp).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </StatCard>
      </div>
    </div>
  );
}
