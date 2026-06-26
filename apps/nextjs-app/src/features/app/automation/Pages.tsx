import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  aiGenerateWorkflow,
  createWorkflow,
  deleteWorkflow,
  listWorkflows,
  updateWorkflow,
} from '@teable/openapi';
import { ReactQueryKeys } from '@teable/sdk/config';
import { useBaseId } from '@teable/sdk/hooks';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@teable/ui-lib/shadcn/ui/alert-dialog';
import { Badge } from '@teable/ui-lib/shadcn/ui/badge';
import { Button } from '@teable/ui-lib/shadcn/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@teable/ui-lib/shadcn/ui/dialog';
import { Input } from '@teable/ui-lib/shadcn/ui/input';
import { Switch } from '@teable/ui-lib/shadcn/ui/switch';
import { Textarea } from '@teable/ui-lib/shadcn/ui/textarea';
import { Bot, CheckCircle2, Clock, Infinity, Loader2, Plus, Sparkles, Trash2 } from 'lucide-react';
import Head from 'next/head';
import { useTranslation } from 'next-i18next';
import { useRef, useState } from 'react';
import { ModelSelector } from '../components/ModelSelector';
import { useAvailableModels } from '../hooks/useAvailableModels';
import { useWorkFlowPanelStore } from './workflow-panel/useWorkFlowPaneStore';

interface IAiStreamEvent {
  type: 'start' | 'tool' | 'config' | 'think' | 'done' | 'error';
  label?: string;
  message?: string;
  name?: string;
  config?: unknown;
}

export function AutomationPage() {
  const { t } = useTranslation('common');
  const baseId = useBaseId();
  const queryClient = useQueryClient();
  const { openModal } = useWorkFlowPanelStore();
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const availableModels = useAvailableModels();
  // AI generator state
  const [aiOpen, setAiOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiSelectedModel, setAiSelectedModel] = useState<string | undefined>(undefined);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiStatus, setAiStatus] = useState('');
  const [aiDone, setAiDone] = useState(false);
  const [aiError, setAiError] = useState('');
  const aiResultRef = useRef<{ name: string; config: unknown } | null>(null);
  const aiControllerRef = useRef<AbortController | null>(null);
  const aiBufferRef = useRef('');

  const { data: workflows = [], isLoading } = useQuery({
    queryKey: ReactQueryKeys.workflowList(baseId ?? ''),
    queryFn: () => listWorkflows(baseId!).then((r) => r.data),
    enabled: Boolean(baseId),
  });

  const { mutate: create, isPending: creating } = useMutation({
    mutationFn: () => createWorkflow(baseId!, { name: newName.trim() || 'Untitled automation' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ReactQueryKeys.workflowList(baseId!) });
      setCreateOpen(false);
      setNewName('');
    },
  });

  const { mutate: toggle } = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      updateWorkflow(baseId!, id, { isActive }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ReactQueryKeys.workflowList(baseId!) }),
  });

  const { mutate: remove } = useMutation({
    mutationFn: (id: string) => deleteWorkflow(baseId!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ReactQueryKeys.workflowList(baseId!) });
      setDeleteId(null);
    },
  });

  const { mutateAsync: createAndConfigure } = useMutation({
    mutationFn: async ({ name, config }: { name: string; config: unknown }) => {
      const res = await createWorkflow(baseId!, { name });
      const wf = res.data as { id: string; name: string };
      await updateWorkflow(baseId!, wf.id, { config });
      return wf;
    },
    onSuccess: (wf) => {
      queryClient.invalidateQueries({ queryKey: ReactQueryKeys.workflowList(baseId!) });
      setAiOpen(false);
      resetAiState();
      if (baseId) openModal(baseId, wf.id);
    },
  });

  const resetAiState = () => {
    setAiPrompt('');
    setAiGenerating(false);
    setAiStatus('');
    setAiDone(false);
    setAiError('');
    aiResultRef.current = null;
    aiBufferRef.current = '';
  };

  // eslint-disable-next-line sonarjs/cognitive-complexity
  const handleAiGenerate = async () => {
    if (!aiPrompt.trim() || aiGenerating || !baseId) return;
    setAiGenerating(true);
    setAiDone(false);
    setAiError('');
    setAiStatus("Démarrage de l'analyse…");
    aiResultRef.current = null;
    aiBufferRef.current = '';

    aiControllerRef.current = new AbortController();

    try {
      const res = await aiGenerateWorkflow(
        baseId,
        aiPrompt,
        aiControllerRef.current.signal,
        aiSelectedModel
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const reader = res.body?.getReader();
      if (!reader) throw new Error('No reader');
      const decoder = new TextDecoder();

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        aiBufferRef.current += decoder.decode(value, { stream: true });
        const lines = aiBufferRef.current.split('\n');
        aiBufferRef.current = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line) as IAiStreamEvent;
            switch (event.type) {
              case 'start':
                setAiStatus(event.message ?? 'Génération…');
                break;
              case 'tool':
                setAiStatus(event.label ?? '');
                break;
              case 'config':
                aiResultRef.current = { name: event.name ?? 'Automation IA', config: event.config };
                setAiStatus(`Configuration générée : "${event.name}"`);
                break;
              case 'done':
                setAiGenerating(false);
                setAiDone(true);
                setAiStatus('');
                break;
              case 'error':
                throw new Error(event.message ?? 'Erreur inconnue');
            }
          } catch (parseErr) {
            if (parseErr instanceof SyntaxError) continue;
            throw parseErr;
          }
        }
      }
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        setAiGenerating(false);
        return;
      }
      setAiError(e instanceof Error ? e.message : String(e));
      setAiGenerating(false);
    }
  };

  const handleApplyAiResult = () => {
    if (!aiResultRef.current) return;
    createAndConfigure(aiResultRef.current);
  };

  return (
    <div className="h-full flex-col md:flex">
      <Head>
        <title>{t('noun.automation')}</title>
      </Head>
      <div className="flex flex-col gap-2 lg:gap-4">
        <div className="flex items-center justify-between px-8 pb-2 pt-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{t('noun.automation')}</h2>
            <p className="text-sm text-muted-foreground">
              Automatisez les tâches répétitives et les workflows dans votre base.
            </p>
          </div>
          <div className="flex gap-2">
            <div className="ai-gradient-ring rounded-md p-[1.5px]">
              <button
                type="button"
                onClick={() => setAiOpen(true)}
                className="flex h-8 items-center gap-2 rounded-[5px] bg-background px-3 text-sm font-medium text-foreground transition-all duration-200 hover:scale-[1.02] dark:bg-[color-mix(in_oklab,white_5%,hsl(var(--background)))]"
              >
                <Sparkles className="size-4" style={{ color: '#a78bfa' }} />
                Générer avec l&apos;IA
              </button>
            </div>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="flex h-8 items-center gap-2 rounded-md px-3 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:scale-[1.02]"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5,#0ea5e9)' }}
            >
              <Plus className="size-4" />
              Nouvelle automatisation
            </button>
          </div>
        </div>

        {/* Limits info */}
        <div className="mx-8 flex gap-4">
          <div className="flex items-center gap-3 rounded-xl border border-border bg-gradient-to-b from-muted/30 to-transparent px-4 py-3 text-sm transition-all duration-200 hover:border-primary/30 hover:shadow-sm">
            <div
              className="flex size-9 shrink-0 items-center justify-center rounded-lg"
              style={{
                background:
                  'linear-gradient(135deg,rgba(124,58,237,0.18),rgba(79,70,229,0.12),rgba(14,165,233,0.12))',
                border: '1px solid rgba(124,58,237,0.25)',
                color: '#a78bfa',
              }}
            >
              <Infinity className="size-4" />
            </div>
            <div>
              <p className="font-medium">Sans quota mensuel</p>
              <p className="text-xs text-muted-foreground">
                Chaque automatisation a des exécutions mensuelles illimitées
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-border bg-gradient-to-b from-muted/30 to-transparent px-4 py-3 text-sm transition-all duration-200 hover:border-primary/30 hover:shadow-sm">
            <div
              className="flex size-9 shrink-0 items-center justify-center rounded-lg"
              style={{
                background:
                  'linear-gradient(135deg,rgba(14,165,233,0.18),rgba(79,70,229,0.12),rgba(124,58,237,0.12))',
                border: '1px solid rgba(14,165,233,0.25)',
                color: '#38bdf8',
              }}
            >
              <Clock className="size-4" />
            </div>
            <div>
              <p className="font-medium">Historique illimité</p>
              <p className="text-xs text-muted-foreground">
                Consultez le statut, la durée et les détails des étapes indéfiniment
              </p>
            </div>
          </div>
        </div>

        {/* Workflow list */}
        {isLoading ? (
          <div className="px-8 py-4 text-sm text-muted-foreground">Loading…</div>
        ) : workflows.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 py-20">
            <div
              className="ai-icon-float flex size-14 items-center justify-center rounded-2xl"
              style={{
                background:
                  'linear-gradient(135deg,rgba(124,58,237,0.2),rgba(79,70,229,0.15),rgba(14,165,233,0.15))',
                border: '1px solid rgba(124,58,237,0.3)',
              }}
            >
              <Bot className="size-7" style={{ color: '#a78bfa' }} />
            </div>
            <div className="text-center">
              <p className="font-semibold">Aucune automatisation</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Créez votre première automatisation pour commencer à automatiser des tâches.
              </p>
            </div>
            <div className="flex gap-2">
              <div className="ai-gradient-ring rounded-md p-[1.5px]">
                <button
                  type="button"
                  onClick={() => setAiOpen(true)}
                  className="flex h-8 items-center gap-2 rounded-[5px] bg-background px-3 text-sm font-medium text-foreground transition-all duration-200 hover:scale-[1.02] dark:bg-[color-mix(in_oklab,white_5%,hsl(var(--background)))]"
                >
                  <Sparkles className="size-4" style={{ color: '#a78bfa' }} />
                  Générer avec l&apos;IA
                </button>
              </div>
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="flex h-8 items-center gap-2 rounded-md px-3 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5,#0ea5e9)' }}
              >
                <Plus className="size-4" />
                Créer une automatisation
              </button>
            </div>
          </div>
        ) : (
          <div className="mx-8 flex flex-col gap-2">
            {workflows.map((wf) => (
              <div
                key={wf.id}
                role="button"
                tabIndex={0}
                className="group flex cursor-pointer items-center justify-between rounded-xl border border-border bg-card px-4 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                onClick={() => baseId && openModal(baseId, wf.id)}
                onKeyDown={(e) => e.key === 'Enter' && baseId && openModal(baseId, wf.id)}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex size-7 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-110"
                    style={{
                      background:
                        'linear-gradient(135deg,rgba(124,58,237,0.14),rgba(79,70,229,0.1),rgba(14,165,233,0.1))',
                      border: '1px solid rgba(124,58,237,0.22)',
                      color: '#a78bfa',
                    }}
                  >
                    <Bot className="size-3.5" />
                  </div>
                  <span className="text-sm font-medium">{wf.name}</span>
                  <Badge variant={wf.isActive ? 'default' : 'secondary'} className="text-xs">
                    {wf.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={wf.isActive}
                    onCheckedChange={(checked) => toggle({ id: wf.id, isActive: checked })}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="size-7 text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteId(wf.id);
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI Generator dialog */}
      <Dialog
        open={aiOpen}
        onOpenChange={(o) => {
          if (!o) {
            aiControllerRef.current?.abort();
            resetAiState();
          }
          setAiOpen(o);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              Générer une automatisation avec l&apos;IA
            </DialogTitle>
          </DialogHeader>

          {!aiDone ? (
            <>
              <div className="space-y-3">
                <ModelSelector
                  models={availableModels}
                  value={aiSelectedModel}
                  onChange={setAiSelectedModel}
                  className="h-7 w-full text-xs"
                />
                <Textarea
                  placeholder="Ex : Quand un enregistrement est créé avec Statut = Urgent, envoyer un email à l'équipe et mettre à jour le champ Priorité à Haute…"
                  className="min-h-[100px] resize-none text-sm"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  disabled={aiGenerating}
                />
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Marquer les enregistrements en retard comme Bloqué chaque jour à 8h',
                    'Envoyer un email quand un formulaire est soumis',
                    'Mettre à jour le statut quand un champ change',
                  ].map((ex) => (
                    <button
                      key={ex}
                      type="button"
                      className="rounded-full border bg-muted/50 px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted"
                      onClick={() => setAiPrompt(ex)}
                      disabled={aiGenerating}
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>

              {aiGenerating && (
                <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                  <Loader2 className="size-3.5 shrink-0 animate-spin" />
                  {aiStatus}
                </div>
              )}

              {aiError && <p className="text-xs text-destructive">{aiError}</p>}
            </>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-900 dark:bg-green-950">
                <CheckCircle2 className="size-4 shrink-0 text-green-600 dark:text-green-400" />
                <div>
                  <p className="text-sm font-medium text-green-800 dark:text-green-300">
                    Automatisation générée
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-400">
                    {aiResultRef.current?.name}
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                L&apos;automatisation sera créée et ouverte dans l&apos;éditeur pour que vous
                puissiez la vérifier et l&apos;activer.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                aiControllerRef.current?.abort();
                resetAiState();
                setAiOpen(false);
              }}
            >
              Annuler
            </Button>
            {!aiDone ? (
              <Button onClick={handleAiGenerate} disabled={aiGenerating || !aiPrompt.trim()}>
                {aiGenerating && <Loader2 className="mr-1.5 size-4 animate-spin" />}
                {aiGenerating ? 'Génération…' : 'Générer'}
              </Button>
            ) : (
              <Button onClick={handleApplyAiResult}>Ouvrir dans l&apos;éditeur</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nouvelle automatisation</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Nom de l'automatisation"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && create()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Annuler
            </Button>
            <Button onClick={() => create()} disabled={creating}>
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={Boolean(deleteId)} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l&apos;automatisation ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && remove(deleteId)}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
