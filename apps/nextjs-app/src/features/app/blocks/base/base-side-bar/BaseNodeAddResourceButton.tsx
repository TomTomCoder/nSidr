import { getUniqName, ViewType } from '@teable/core';
import { FileCsv, Slack, Table2 } from '@teable/icons';
import type { ICreateBaseNodeRo } from '@teable/openapi';
import { aiCreateTableStream, BaseNodeResourceType } from '@teable/openapi';
import { useBaseId, useTables } from '@teable/sdk';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@teable/ui-lib';
import { Button } from '@teable/ui-lib/shadcn/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@teable/ui-lib/shadcn/ui/dialog';
import { Textarea } from '@teable/ui-lib/shadcn/ui/textarea';
import { CheckCircle2, Circle, Loader2, Sparkles } from 'lucide-react';
import { useTranslation } from 'next-i18next';
import { useRef, useState } from 'react';
import { ModelSelector } from '../../../components/ModelSelector';
import { useAvailableModels } from '../../../hooks/useAvailableModels';
import { TableImport } from '../../import-table';
import { useDefaultFields } from '../../table-list/useAddTable';
import { BaseNodeResourceIconMap, ROOT_ID } from '../base-node/hooks';

interface IAiTableStreamEvent {
  type: 'start' | 'tool' | 'config' | 'chunk' | 'done' | 'error';
  label?: string;
  message?: string;
  name?: string;
  tableId?: string;
  text?: string;
}

interface ITask {
  label: string;
  done: boolean;
}

interface BaseNodeAddResourceButtonProps {
  parentId?: string;
  canCreateFolder?: boolean;
  canCreateTable?: boolean;
  canCreateDashboard?: boolean;
  canCreateWorkflow?: boolean;
  canCreateApp?: boolean;
  createNode: (params: ICreateBaseNodeRo) => Promise<void>;
  children: React.ReactNode;
}

export const BaseNodeAddResourceButton = (props: BaseNodeAddResourceButtonProps) => {
  const {
    createNode,
    parentId,
    canCreateFolder,
    children,
    canCreateTable,
    canCreateDashboard,
    canCreateWorkflow,
    canCreateApp,
  } = props;
  const { t } = useTranslation(['table', 'common']);
  const baseId = useBaseId();
  const availableModels = useAvailableModels();
  const [tableImportdialogVisible, setTableImportdialogVisible] = useState(false);

  // AI table creation state
  const [aiOpen, setAiOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiSelectedModel, setAiSelectedModel] = useState<string | undefined>(undefined);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiStatus, setAiStatus] = useState('');
  const [aiDone, setAiDone] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiTableName, setAiTableName] = useState('');
  const [aiTasks, setAiTasks] = useState<ITask[]>([
    { label: 'Analyse du besoin', done: false },
    { label: 'Conception des champs et relations', done: false },
    { label: 'Création de la table', done: false },
  ]);
  const aiControllerRef = useRef<AbortController | null>(null);
  const aiBufferRef = useRef('');

  const completeTask = (index: number) => {
    setAiTasks((prev) => prev.map((t, i) => (i === index ? { ...t, done: true } : t)));
  };

  const resetAiState = () => {
    setAiPrompt('');
    setAiGenerating(false);
    setAiStatus('');
    setAiDone(false);
    setAiError('');
    setAiTableName('');
    setAiTasks([
      { label: 'Analyse du besoin', done: false },
      { label: 'Conception des champs et relations', done: false },
      { label: 'Création de la table', done: false },
    ]);
    aiBufferRef.current = '';
  };

  const processStreamEvent = (event: IAiTableStreamEvent) => {
    switch (event.type) {
      case 'start':
        setAiStatus('Analyse de la demande…');
        completeTask(0);
        break;
      case 'chunk':
        setAiStatus('Génération en cours…');
        completeTask(1);
        break;
      case 'tool':
        setAiStatus(event.label ?? 'Traitement…');
        completeTask(1);
        break;
      case 'config':
        setAiTableName(event.name ?? '');
        completeTask(1);
        completeTask(2);
        break;
      case 'done':
        setAiGenerating(false);
        setAiDone(true);
        setAiStatus('');
        completeTask(0);
        completeTask(1);
        completeTask(2);
        break;
      case 'error':
        throw new Error(event.message ?? 'Erreur inconnue');
    }
  };

  const processLine = (line: string) => {
    if (!line.trim()) return;
    try {
      processStreamEvent(JSON.parse(line) as IAiTableStreamEvent);
    } catch (parseErr) {
      if (parseErr instanceof SyntaxError) return;
      throw parseErr;
    }
  };

  const readStream = async (reader: ReadableStreamDefaultReader<Uint8Array>) => {
    const decoder = new TextDecoder();
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      aiBufferRef.current += decoder.decode(value, { stream: true });
      const lines = aiBufferRef.current.split('\n');
      aiBufferRef.current = lines.pop() ?? '';
      lines.forEach(processLine);
    }
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim() || aiGenerating || !baseId) return;
    setAiGenerating(true);
    setAiDone(false);
    setAiError('');
    setAiStatus('Démarrage…');
    aiBufferRef.current = '';
    aiControllerRef.current = new AbortController();

    try {
      const res = await aiCreateTableStream(
        baseId,
        aiPrompt,
        aiControllerRef.current.signal,
        aiSelectedModel
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const reader = res.body?.getReader();
      if (!reader) throw new Error('No reader');
      await readStream(reader);
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        setAiGenerating(false);
        return;
      }
      setAiError(e instanceof Error ? e.message : String(e));
      setAiGenerating(false);
    }
  };

  const fieldRos = useDefaultFields();
  const tables = useTables();

  const AddTableMenuItems = () => {
    if (!canCreateTable) return null;
    return (
      <>
        <DropdownMenuItem
          onClick={() => {
            createNode({
              resourceType: BaseNodeResourceType.Table,
              parentId,
              fields: fieldRos,
              views: [{ name: t('view.category.table'), type: ViewType.Grid }],
              name: getUniqName(
                t('table:table.newTableLabel'),
                tables.map((table) => table.name)
              ),
            });
          }}
          className="cursor-pointer"
        >
          <Button variant="ghost" size="xs" className="h-4">
            <Table2 className="size-4" />
            {t('table.operator.createBlank')}
          </Button>
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer" onClick={() => setAiOpen(true)}>
          <Button variant="ghost" size="xs" className="h-4">
            <Sparkles className="size-4" />
            Créer avec l&apos;IA
          </Button>
        </DropdownMenuItem>
      </>
    );
  };

  const AddResourceMenuItems = () => {
    const list: Array<{
      resourceType:
        | BaseNodeResourceType.Workflow
        | BaseNodeResourceType.App
        | BaseNodeResourceType.Dashboard
        | BaseNodeResourceType.Folder;
      label: string;
      trailingIcon?: React.ReactNode;
    }> = [];

    if (canCreateWorkflow) {
      list.push({
        resourceType: BaseNodeResourceType.Workflow,
        label: t('common:noun.newAutomation'),
        trailingIcon: <Slack className="size-4" />,
      });
    }
    if (canCreateApp) {
      list.push({
        resourceType: BaseNodeResourceType.App,
        label: t('common:noun.newApp'),
      });
    }
    if (canCreateDashboard) {
      list.push({
        resourceType: BaseNodeResourceType.Dashboard,
        label: t('common:noun.dashboard'),
      });
    }

    if (canCreateFolder) {
      list.push({
        resourceType: BaseNodeResourceType.Folder,
        label: t('common:noun.newFolder'),
      });
    }

    if (list.length === 0) {
      return null;
    }

    return (
      <>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="px-4 py-1 text-xs font-normal text-muted-foreground">
          {t('common:noun.otherResources', 'Autres ressources')}
        </DropdownMenuLabel>
        {list.map((item) => {
          const { resourceType, label, trailingIcon } = item;
          const IconComponent = BaseNodeResourceIconMap[resourceType];
          return (
            <DropdownMenuItem
              key={resourceType}
              className="flex cursor-pointer items-center"
              onClick={() => {
                createNode({
                  resourceType,
                  parentId,
                  name: label,
                });
              }}
            >
              <Button variant="ghost" size="xs" className="h-4">
                <IconComponent className="size-4" />
                {label}
              </Button>
              {trailingIcon}
            </DropdownMenuItem>
          );
        })}
      </>
    );
  };

  const ImportTableMenuItems = () => {
    if (!canCreateTable) return null;
    if (parentId && parentId !== ROOT_ID) return null;
    return (
      <>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="px-4 text-xs font-normal text-muted-foreground">
          {t('table:import.menu.addFromOtherSource')}
        </DropdownMenuLabel>
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => setTableImportdialogVisible(true)}
        >
          <Button variant="ghost" size="xs" className="h-4">
            <FileCsv className="size-4" />
            {t('table:import.menu.importData')}
          </Button>
        </DropdownMenuItem>
      </>
    );
  };

  return (
    <div className="flex w-full flex-col">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
        <DropdownMenuContent className="w-72">
          {canCreateTable && (
            <DropdownMenuLabel className="px-4 py-1 text-xs font-normal text-muted-foreground">
              {t('table:table.category.table', 'Tables')}
            </DropdownMenuLabel>
          )}
          <AddTableMenuItems />
          <AddResourceMenuItems />
          <ImportTableMenuItems />
        </DropdownMenuContent>
      </DropdownMenu>

      {tableImportdialogVisible && (
        <TableImport
          open={tableImportdialogVisible}
          onOpenChange={(open) => setTableImportdialogVisible(open)}
        />
      )}

      {/* AI Table Creation Dialog */}
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
              Créer une table avec l&apos;IA
            </DialogTitle>
          </DialogHeader>

          {!aiDone ? (
            <div className="space-y-3">
              <ModelSelector
                models={availableModels}
                value={aiSelectedModel}
                onChange={setAiSelectedModel}
                className="h-7 w-full text-xs"
              />
              <Textarea
                placeholder="Ex : Une table de suivi des factures avec montant, client, statut et date d'échéance. Ou : Un registre des employés avec poste, département, date d'entrée et responsable hiérarchique…"
                className="min-h-[100px] resize-none text-sm"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                disabled={aiGenerating}
              />
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Suivi des commandes clients avec statut et montant',
                  'Inventaire produits avec prix, stock et fournisseur',
                  'Gestion des employés avec poste, département et salaire',
                  'Pipeline commercial avec étapes et probabilité',
                  'Suivi des tickets support avec priorité et assigné',
                  'Gestion de projets avec jalons et responsables',
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
              {aiGenerating && (
                <div className="flex flex-col gap-2">
                  {aiTasks.map((task, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      {task.done ? (
                        <CheckCircle2 className="size-4 shrink-0 text-green-500" />
                      ) : aiGenerating && aiTasks.slice(0, i).every((t) => t.done) ? (
                        <Loader2 className="size-4 shrink-0 animate-spin text-primary" />
                      ) : (
                        <Circle className="size-4 shrink-0 text-muted-foreground/40" />
                      )}
                      <span className={task.done ? 'text-foreground' : 'text-muted-foreground'}>
                        {task.label}
                      </span>
                    </div>
                  ))}
                  {aiStatus && (
                    <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
                      <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">{aiStatus}</p>
                    </div>
                  )}
                </div>
              )}
              {aiError && <p className="text-xs text-destructive">{aiError}</p>}
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-3 dark:border-green-900 dark:bg-green-950">
              <CheckCircle2 className="size-4 shrink-0 text-green-600 dark:text-green-400" />
              <div>
                <p className="text-sm font-medium text-green-800 dark:text-green-300">
                  Table créée avec succès
                </p>
                <p className="text-xs text-green-700 dark:text-green-400">{aiTableName}</p>
              </div>
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
              {aiDone ? 'Fermer' : 'Annuler'}
            </Button>
            {!aiDone && (
              <Button onClick={handleAiGenerate} disabled={aiGenerating || !aiPrompt.trim()}>
                {aiGenerating && <Loader2 className="mr-1.5 size-4 animate-spin" />}
                {aiGenerating ? 'Génération…' : 'Générer'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
