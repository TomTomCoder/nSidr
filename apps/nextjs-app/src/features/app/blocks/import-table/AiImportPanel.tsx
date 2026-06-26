import type { IImportOptionRo } from '@teable/openapi';
import { aiImportAnalyze } from '@teable/openapi';
import { Button } from '@teable/ui-lib/shadcn';
import { CheckCircle2, Circle, Loader2, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface IStreamEvent {
  type: 'start' | 'chunk' | 'config' | 'done' | 'error';
  text?: string;
  message?: string;
  worksheets?: Record<string, unknown>;
}

interface ITask {
  label: string;
  done: boolean;
}

interface IAiImportPanelProps {
  baseId: string;
  prompt: string;
  worksheets: IImportOptionRo['worksheets'];
  modelKey?: string;
  onDone: (worksheets: IImportOptionRo['worksheets']) => void;
  onCancel: () => void;
}

export const AiImportPanel = ({
  baseId,
  prompt,
  worksheets,
  modelKey,
  onDone,
  onCancel,
}: IAiImportPanelProps) => {
  const [status, setStatus] = useState<'running' | 'done' | 'error'>('running');
  const [statusMessage, setStatusMessage] = useState('Connexion au modèle…');
  const [tasks, setTasks] = useState<ITask[]>([
    { label: 'Lecture du schéma du fichier', done: false },
    { label: 'Analyse IA des colonnes et types', done: false },
    { label: 'Application de la configuration', done: false },
  ]);
  const [errorMsg, setErrorMsg] = useState('');
  const [resultWorksheets, setResultWorksheets] = useState<IImportOptionRo['worksheets'] | null>(
    null
  );
  const controllerRef = useRef<AbortController | null>(null);
  const bufferRef = useRef('');

  const completeTask = (index: number) => {
    setTasks((prev) => prev.map((t, i) => (i === index ? { ...t, done: true } : t)));
  };

  useEffect(() => {
    // eslint-disable-next-line sonarjs/cognitive-complexity
    const run = async () => {
      controllerRef.current = new AbortController();
      bufferRef.current = '';

      try {
        const res = await aiImportAnalyze(
          baseId,
          prompt,
          worksheets as Record<string, unknown>,
          controllerRef.current.signal,
          modelKey || undefined
        );

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const reader = res.body?.getReader();
        if (!reader) throw new Error('No reader');
        const decoder = new TextDecoder();

        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read();
          if (!done) {
            bufferRef.current += decoder.decode(value, { stream: true });
          }
          const lines = bufferRef.current.split('\n');
          bufferRef.current = done ? '' : lines.pop() ?? '';
          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const event = JSON.parse(line) as IStreamEvent;
              handleEvent(event);
            } catch {
              // ignore
            }
          }
          if (done) break;
        }
      } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') return;
        setErrorMsg(e instanceof Error ? e.message : String(e));
        setStatus('error');
      }
    };

    run();
    return () => controllerRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEvent = (event: IStreamEvent) => {
    switch (event.type) {
      case 'start':
        setStatusMessage('Analyse du schéma en cours…');
        completeTask(0);
        break;
      case 'chunk':
        setStatusMessage('Analyse IA en cours…');
        completeTask(1);
        break;
      case 'config':
        setStatusMessage('Application de la configuration…');
        completeTask(1);
        completeTask(2);
        if (event.worksheets) {
          setResultWorksheets(event.worksheets as IImportOptionRo['worksheets']);
        }
        break;
      case 'done':
        setStatus('done');
        setStatusMessage('');
        completeTask(0);
        completeTask(1);
        completeTask(2);
        if (event.worksheets && !resultWorksheets) {
          setResultWorksheets(event.worksheets as IImportOptionRo['worksheets']);
        }
        break;
      case 'error':
        setErrorMsg(event.message ?? 'Erreur inconnue');
        setStatus('error');
        break;
    }
  };

  return (
    <div className="flex flex-col gap-6 px-2 py-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
          <Sparkles className="size-5 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold">Analyse par l&apos;IA</p>
          <p className="text-xs text-muted-foreground">
            {status === 'running' && "Configuration automatique de l'import en cours…"}
            {status === 'done' && 'Configuration optimisée — vérifiez et importez'}
            {status === 'error' && 'Une erreur est survenue'}
          </p>
        </div>
        {status === 'running' && (
          <Loader2 className="ml-auto size-4 shrink-0 animate-spin text-primary" />
        )}
        {status === 'done' && <CheckCircle2 className="ml-auto size-4 shrink-0 text-green-500" />}
      </div>

      {/* Task list */}
      <div className="flex flex-col gap-2">
        {tasks.map((task, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            {task.done ? (
              <CheckCircle2 className="size-4 shrink-0 text-green-500" />
            ) : status === 'running' && tasks.slice(0, i).every((t) => t.done) ? (
              <Loader2 className="size-4 shrink-0 animate-spin text-primary" />
            ) : (
              <Circle className="size-4 shrink-0 text-muted-foreground/40" />
            )}
            <span className={task.done ? 'text-foreground' : 'text-muted-foreground'}>
              {task.label}
            </span>
          </div>
        ))}
      </div>

      {/* Current status */}
      {status === 'running' && statusMessage && (
        <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
          <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" />
          <p className="text-xs text-muted-foreground">{statusMessage}</p>
        </div>
      )}

      {/* Error */}
      {status === 'error' && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {errorMsg}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {status === 'done' && (
          <Button
            size="sm"
            className="flex-1"
            onClick={() => onDone(resultWorksheets ?? worksheets)}
          >
            Voir et confirmer la configuration
          </Button>
        )}
        {status === 'error' && (
          <Button size="sm" className="flex-1" variant="secondary" onClick={onCancel}>
            Revenir à l&apos;import standard
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
      </div>
    </div>
  );
};
