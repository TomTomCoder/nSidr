import { useBase } from '@teable/sdk/hooks/use-base';
import { useTable } from '@teable/sdk/hooks/use-table';
import { Button } from '@teable/ui-lib/shadcn/ui/button';
import { Sheet, SheetContent } from '@teable/ui-lib/shadcn/ui/sheet';
import {
  ChevronRight,
  Clock,
  Database,
  Expand,
  GitBranch,
  LayoutDashboard,
  Mail,
  Plus,
  Settings,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useParams } from 'next/navigation';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useState } from 'react';
import { AgentProfilePanel } from '@/components/AgentChat/AgentProfilePanel';
import { ConversationHistory } from '@/components/AgentChat/ConversationHistory';
import { UnifiedChatContainer } from '@/components/AgentChat/UnifiedChatContainer';
import { useAppBuilderStore } from '../../stores/useAppBuilderStore';
import { useUnifiedChatStore } from '../../stores/useUnifiedChatStore';
import { useChatPanelStore } from '../sidebar/useChatPanelStore';

interface ISuggestion {
  label: string;
  icon: React.ElementType;
}

interface ISuggestionGroup {
  label: string;
  items: ISuggestion[];
}

const buildSuggestionGroups = (tableName?: string): ISuggestionGroup[] => [
  {
    label: 'Créer ou modifier la base de données',
    items: [
      { label: 'Créer un CRM pour moi', icon: Database },
      { label: 'Ajouter un champ IA pour analyser chaque client', icon: Sparkles },
      { label: "Créer un rapport d'analyse de données", icon: LayoutDashboard },
    ],
  },
  {
    label: 'Construire des automatisations',
    items: [
      { label: "M'envoyer un e-mail lors de la création d'un enregistrement", icon: Mail },
      { label: 'Synchroniser les mises à jour de statut avec Slack', icon: Zap },
    ],
  },
  {
    label: 'Construire des applications',
    items: [
      {
        label: tableName
          ? `Créer un tableau de bord à partir de la table "${tableName}"`
          : 'Créer un tableau de bord à partir de cette table',
        icon: GitBranch,
      },
      { label: "Créer une page d'accueil de capture de leads", icon: LayoutDashboard },
    ],
  },
];

/**
 * Inner component rendered only when spaceId is available.
 * All hooks are called unconditionally at this level.
 */
function ChatPanelInner({ spaceId }: { spaceId: string }) {
  const { status, close, toggleExpanded, panelType } = useChatPanelStore();
  const base = useBase();
  const table = useTable();
  const router = useRouter();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [configAgent, setConfigAgent] = useState<Record<string, unknown> | null>(null);
  const [agents, setAgents] = useState<Record<string, unknown>[]>([]);
  const { generating, statusMessage, tasks } = useAppBuilderStore();
  const chatStore = useUnifiedChatStore(spaceId, base?.id);
  const suggestionGroups = buildSuggestionGroups(table?.name);
  const isAppBuilderMode = panelType === 'app-builder';

  // Fetch agents for the current base so we can show the config button
  const fetchAgents = useCallback(() => {
    if (!base?.id) return;
    fetch(`/api/agent?baseId=${base.id}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setAgents(Array.isArray(data) ? data : []))
      .catch(() => setAgents([]));
  }, [base?.id]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  // Re-fetch when a new agent is created from the chat (e.g. via accept-proposal)
  useEffect(() => {
    window.addEventListener('agent-created', fetchAgents);
    return () => window.removeEventListener('agent-created', fetchAgents);
  }, [fetchAgents]);

  if (status === 'close') return null;

  return (
    <div className="flex h-full w-[380px] shrink-0 flex-col border-l border-border bg-background dark:border-slate-800/70 dark:bg-slate-950">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2.5 dark:border-slate-800/70">
        <span className="text-sm font-semibold text-foreground dark:text-slate-200">
          Nouveau Chat
        </span>
        <div className="flex items-center gap-0.5">
          {/* Expand to full-screen */}
          <Button
            variant="ghost"
            size="icon-xs"
            className="size-6"
            onClick={toggleExpanded}
            title="Agrandir"
          >
            <Expand className="size-3.5" />
          </Button>
          {/* New conversation */}
          <Button
            variant="ghost"
            size="icon-xs"
            className="size-6"
            onClick={() => {
              chatStore.reset();
            }}
            title="Nouveau chat"
          >
            <Plus className="size-3.5" />
          </Button>
          {/* History */}
          <Button
            variant="ghost"
            size="icon-xs"
            className="size-6"
            onClick={() => setHistoryOpen(true)}
            title="Historique"
          >
            <Clock className="size-3.5" />
          </Button>
          {/* Agent config */}
          {agents.length > 0 && (
            <Button
              variant="ghost"
              size="icon-xs"
              className="size-6"
              onClick={() => setConfigAgent(agents[0])}
              title="Configurer l'agent"
            >
              <Settings className="size-3.5" />
            </Button>
          )}
          {/* Close */}
          <Button variant="ghost" size="icon-xs" onClick={close} className="size-6">
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      {/* App builder status panel — shown in app-builder mode */}
      {isAppBuilderMode && (
        <div className="overflow-y-auto border-b border-border bg-muted/20 px-4 py-3 text-xs dark:border-slate-800/70 dark:bg-slate-900/50">
          {generating ? (
            <div className="flex items-center gap-2 text-muted-foreground dark:text-slate-400">
              <span className="flex gap-1">
                <span className="size-1.5 animate-bounce rounded-full bg-primary/60 [animation-delay:-0.3s]" />
                <span className="size-1.5 animate-bounce rounded-full bg-primary/60 [animation-delay:-0.15s]" />
                <span className="size-1.5 animate-bounce rounded-full bg-primary/60" />
              </span>
              <span className="truncate">{statusMessage || 'Génération en cours…'}</span>
            </div>
          ) : (
            <div className="text-muted-foreground dark:text-slate-400">
              {tasks.length > 0 ? (
                <ul className="space-y-1">
                  {tasks.map((t, i) => (
                    <li key={i} className="flex items-center gap-1.5">
                      <span
                        className={
                          t.done ? 'text-green-500' : 'text-muted-foreground dark:text-slate-500'
                        }
                      >
                        {t.done ? '✓' : '○'}
                      </span>
                      <span className={t.done ? 'text-foreground dark:text-slate-200' : ''}>
                        {t.label}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>Le générateur créera votre app depuis le chat.</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Unified chat container */}
      <UnifiedChatContainer
        spaceId={spaceId}
        activeBaseId={base?.id}
        className="min-h-0 flex-1"
        suggestionGroups={suggestionGroups}
        pageContext={table ? { tableId: table.id, tableName: table.name } : undefined}
      />

      {/* Conversation history drawer */}
      <ConversationHistory
        spaceId={spaceId}
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
      />

      {/* Agent config panel (ClickUp-style right sheet) */}
      <Sheet open={!!configAgent} onOpenChange={(open) => !open && setConfigAgent(null)}>
        <SheetContent side="right" className="w-[440px] p-0">
          {configAgent && (
            <AgentProfilePanel
              agent={configAgent as never}
              onUpdated={(updated) => setConfigAgent(updated as Record<string, unknown>)}
              onRunAgent={() =>
                void router.push(
                  `/base/${configAgent.baseId as string}/agent/${configAgent.id as string}`
                )
              }
              onDeleted={() => {
                setConfigAgent(null);
                fetchAgents();
              }}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

export const ChatPanel = () => {
  const { status } = useChatPanelStore();
  const params = useParams<{ spaceId: string }>();
  const base = useBase();
  const spaceId = params?.spaceId ?? base?.spaceId;

  if (status === 'close') return null;
  if (!spaceId) return null;

  return <ChatPanelInner spaceId={spaceId} />;
};
