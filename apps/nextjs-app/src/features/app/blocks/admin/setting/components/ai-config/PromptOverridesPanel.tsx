import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import { Textarea } from '@teable/ui-lib/shadcn/ui/textarea';
import axios from 'axios';
import { useState } from 'react';

interface IPromptOverrideVo {
  key: string;
  defaultContent: string;
  override: {
    content: string;
    modelPattern: string | null;
    isActive: boolean;
  } | null;
}

const PROMPT_KEY_LABELS: Record<string, string> = {
  'table.create': 'Création de table',
  'app.generate': "Génération d'application",
  'workflow.build': 'Constructeur de workflow',
  'import.analyze': "Analyse d'import",
  'chat.system': 'Chat / Agent',
  'build.schema': 'Construction du schéma',
};

async function fetchPrompts(): Promise<IPromptOverrideVo[]> {
  const { data } = await axios.get('/api/admin/ai/prompts');
  return data;
}

async function upsertPrompt(key: string, content: string): Promise<IPromptOverrideVo> {
  const { data } = await axios.put(`/api/admin/ai/prompts/${key}`, { content });
  return data;
}

async function deletePromptOverride(key: string): Promise<void> {
  await axios.delete(`/api/admin/ai/prompts/${key}`);
}

export function PromptOverridesPanel() {
  const queryClient = useQueryClient();
  const [editingPrompt, setEditingPrompt] = useState<IPromptOverrideVo | null>(null);
  const [editContent, setEditContent] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newContent, setNewContent] = useState('');

  const { data: prompts = [], isLoading } = useQuery({
    queryKey: ['admin', 'ai-prompts'],
    queryFn: fetchPrompts,
  });

  const upsertMutation = useMutation({
    mutationFn: ({ key, content }: { key: string; content: string }) => upsertPrompt(key, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'ai-prompts'] });
      setEditingPrompt(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (key: string) => deletePromptOverride(key),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'ai-prompts'] });
    },
  });

  function openEdit(prompt: IPromptOverrideVo) {
    setEditingPrompt(prompt);
    setEditContent(prompt.override?.content ?? prompt.defaultContent);
  }

  function handleSave() {
    if (!editingPrompt) return;
    upsertMutation.mutate({ key: editingPrompt.key, content: editContent });
  }

  function handleReset(key: string) {
    deleteMutation.mutate(key);
  }

  function handleCreateSave() {
    if (!newKey.trim() || !newContent.trim()) return;
    upsertMutation.mutate(
      { key: newKey.trim(), content: newContent.trim() },
      {
        onSuccess: () => {
          setCreateOpen(false);
          setNewKey('');
          setNewContent('');
        },
      }
    );
  }

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Chargement des prompts...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold">Personnalisation des prompts IA</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Personnalisez les prompts système utilisés par chaque fonctionnalité IA. Les
            remplacements écrasent les valeurs par défaut au moment de l&apos;exécution.
          </p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          + Créer un prompt
        </Button>
      </div>

      <div className="divide-y rounded-md border">
        {prompts.map((prompt) => (
          <div key={prompt.key} className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">
                {PROMPT_KEY_LABELS[prompt.key] ?? prompt.key}
              </span>
              {prompt.override ? (
                <Badge variant="secondary">Personnalisé</Badge>
              ) : (
                <Badge variant="outline">Par défaut</Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => openEdit(prompt)}>
                Modifier
              </Button>
              {prompt.override && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleReset(prompt.key)}
                  disabled={deleteMutation.isPending}
                >
                  Réinitialiser
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <Dialog
        open={editingPrompt !== null}
        onOpenChange={(open) => !open && setEditingPrompt(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Modifier le prompt :{' '}
              {editingPrompt ? PROMPT_KEY_LABELS[editingPrompt.key] ?? editingPrompt.key : ''}
            </DialogTitle>
          </DialogHeader>
          <Textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={16}
            className="font-mono text-xs"
            placeholder="Contenu du prompt système..."
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPrompt(null)}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={upsertMutation.isPending}>
              {upsertMutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create custom prompt dialog */}
      <Dialog open={createOpen} onOpenChange={(open) => !open && setCreateOpen(false)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Créer un prompt personnalisé</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Clé du prompt</label>
              <Input
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="ex. agent:mon-agent-id.system"
                className="mt-1 font-mono text-sm"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Format : <code>feature:context.type</code> (ex. <code>agent:agentId.system</code>)
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">Contenu</label>
              <Textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                rows={10}
                className="mt-1 font-mono text-xs"
                placeholder="Contenu du prompt système..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleCreateSave}
              disabled={upsertMutation.isPending || !newKey.trim() || !newContent.trim()}
            >
              {upsertMutation.isPending ? 'Enregistrement…' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
