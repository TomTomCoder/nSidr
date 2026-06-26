import { ViewType, getUniqName } from '@teable/core';
import { Plus } from '@teable/icons';
import type { IGeneratedViewConfig } from '@teable/openapi';
import { aiGenerateView } from '@teable/openapi';
import { useBaseId, useTable, useViews } from '@teable/sdk';
import { useTablePermission } from '@teable/sdk/hooks';
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Textarea,
} from '@teable/ui-lib/shadcn';
import { Loader2, Sparkles } from 'lucide-react';
import { useTranslation } from 'next-i18next';
import { useState } from 'react';
import { VIEW_ICON_MAP } from '../../view/constant';
import { useAddView } from '../../view/list/useAddView';

export const AddView: React.FC = () => {
  const addView = useAddView();
  const views = useViews();
  const table = useTable();
  const baseId = useBaseId();
  const permission = useTablePermission();
  const [isOpen, setOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState('');
  const { t } = useTranslation('table');

  const viewInfoList = [
    {
      name: t('view.category.table'),
      type: ViewType.Grid,
      Icon: VIEW_ICON_MAP[ViewType.Grid],
    },
    {
      name: t('view.category.gallery'),
      type: ViewType.Gallery,
      Icon: VIEW_ICON_MAP[ViewType.Gallery],
    },
    {
      name: t('view.category.kanban'),
      type: ViewType.Kanban,
      Icon: VIEW_ICON_MAP[ViewType.Kanban],
    },
    {
      name: t('view.category.calendar'),
      type: ViewType.Calendar,
      Icon: VIEW_ICON_MAP[ViewType.Calendar],
    },
    {
      name: t('view.category.gantt'),
      type: ViewType.Gantt,
      Icon: VIEW_ICON_MAP[ViewType.Gantt],
    },
    {
      name: t('view.category.form'),
      type: ViewType.Form,
      Icon: VIEW_ICON_MAP[ViewType.Form],
    },
  ];

  const onClick = (type: ViewType, name: string) => {
    const uniqueName = getUniqName(
      name.split(' ')[0],
      views?.map((view) => view.name)
    );
    addView(type, uniqueName);
    setOpen(false);
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim() || !baseId || !table) return;
    setAiGenerating(true);
    setAiError('');
    try {
      const res = await aiGenerateView(baseId, table.id, aiPrompt);
      const config =
        (res as unknown as { data?: IGeneratedViewConfig } & IGeneratedViewConfig).data ??
        (res as unknown as IGeneratedViewConfig);

      const typeMap: Record<string, ViewType> = {
        grid: ViewType.Grid,
        gallery: ViewType.Gallery,
        kanban: ViewType.Kanban,
        form: ViewType.Form,
        calendar: ViewType.Calendar,
        gantt: ViewType.Gantt,
      };
      const viewType = typeMap[config.type] ?? ViewType.Grid;
      const uniqueName = getUniqName(
        config.name || 'Vue IA',
        views?.map((v) => v.name)
      );

      await table.createView({
        name: uniqueName,
        type: viewType,
        sort: config.sort as never,
        filter: config.filter as never,
        columnMeta: config.columnMeta as never,
      });

      setAiOpen(false);
      setAiPrompt('');
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'Erreur lors de la génération');
    } finally {
      setAiGenerating(false);
    }
  };

  if (!permission['view|create']) {
    return null;
  }

  return (
    <>
      <Popover open={isOpen} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button className="shrink-0" size="icon-xs" variant="outline">
            <Plus className="size-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent side="bottom" align="start" className="w-44 p-1">
          {viewInfoList.map((item) => {
            const { name, type, Icon } = item;
            return (
              <Button
                key={type}
                variant={'ghost'}
                size={'xs'}
                className="w-full justify-start font-normal"
                onClick={() => onClick(type, name)}
              >
                <Icon className="pr-1 text-lg" />
                {name}
              </Button>
            );
          })}
          <div className="my-1 h-px bg-border" />
          <Button
            variant="ghost"
            size="xs"
            className="w-full justify-start gap-1.5 font-normal text-violet-600 hover:text-violet-700 dark:text-violet-400"
            onClick={() => {
              setOpen(false);
              setAiOpen(true);
            }}
          >
            <Sparkles className="size-3.5" />
            Générer avec l&apos;IA
          </Button>
        </PopoverContent>
      </Popover>

      <Dialog
        open={aiOpen}
        onOpenChange={(o) => {
          setAiOpen(o);
          if (!o) {
            setAiPrompt('');
            setAiError('');
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="size-4 text-violet-500" />
              Générer une vue avec l&apos;IA
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              placeholder="Ex : Afficher uniquement les tâches Urgent triées par date d'échéance, masquer les colonnes internes…"
              className="min-h-[90px] resize-none text-sm"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              disabled={aiGenerating}
            />
            {aiError && <p className="text-xs text-destructive">{aiError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAiOpen(false)} disabled={aiGenerating}>
              Annuler
            </Button>
            <Button onClick={handleAiGenerate} disabled={aiGenerating || !aiPrompt.trim()}>
              {aiGenerating && <Loader2 className="mr-1.5 size-4 animate-spin" />}
              {aiGenerating ? 'Génération…' : 'Générer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
