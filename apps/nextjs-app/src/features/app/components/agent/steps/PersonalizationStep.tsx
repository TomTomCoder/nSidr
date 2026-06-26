import { Button } from '@teable/ui-lib/shadcn/ui/button';
import { Input } from '@teable/ui-lib/shadcn/ui/input';
import { Switch } from '@teable/ui-lib/shadcn/ui/switch';
import { Textarea } from '@teable/ui-lib/shadcn/ui/textarea';
import React, { useEffect, useState } from 'react';

const BUILT_IN_TOOLS = [
  { name: 'search_records', description: 'Rechercher dans les enregistrements' },
  { name: 'get_records', description: "Récupérer une liste d'enregistrements" },
  { name: 'get_record', description: 'Récupérer un enregistrement unique' },
  { name: 'create_comment', description: 'Ajouter un commentaire' },
  { name: 'get_record_activity', description: "Voir l'historique d'un enregistrement" },
  { name: 'search_knowledge_base', description: 'Rechercher dans la base de connaissances' },
];

interface DocItem {
  id: string;
  title: string;
  isIndexed: boolean;
}

interface FolderItem {
  id: string;
  name: string;
}

interface KnowledgeSources {
  docIds: string[];
  folderIds: string[];
}

interface AgentFormValue {
  name?: string;
  instructions?: string;
  isPublic?: boolean;
  enabledTools?: string[];
  knowledgeSources?: KnowledgeSources;
  [key: string]: unknown;
}

interface PersonalizationStepProps {
  value: AgentFormValue;
  spaceId?: string;
  onChange: (v: AgentFormValue) => void;
  onBack: () => void;
  onNext: () => void;
}

export const PersonalizationStep: React.FC<PersonalizationStepProps> = ({
  value,
  spaceId,
  onChange,
  onBack,
  onNext,
}) => {
  const isValid = (value.name?.length ?? 0) >= 2;

  const [docs, setDocs] = useState<DocItem[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);

  const ks: KnowledgeSources = value.knowledgeSources ?? { docIds: [], folderIds: [] };

  useEffect(() => {
    if (!spaceId) return;
    fetch(`/api/spaces/${spaceId}/docs`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: DocItem[]) => setDocs(data))
      .catch(() => setDocs([]));

    fetch(`/api/spaces/${spaceId}/doc-folders`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: FolderItem[]) => setFolders(data))
      .catch(() => setFolders([]));
  }, [spaceId]);

  const handleToolToggle = (toolName: string) => {
    const enabledTools = value.enabledTools ?? [];
    const updated = enabledTools.includes(toolName)
      ? enabledTools.filter((t: string) => t !== toolName)
      : [...enabledTools, toolName];
    onChange({ ...value, enabledTools: updated });
  };

  const toggleDoc = (id: string) => {
    const next: KnowledgeSources = {
      ...ks,
      docIds: ks.docIds.includes(id) ? ks.docIds.filter((d) => d !== id) : [...ks.docIds, id],
    };
    onChange({ ...value, knowledgeSources: next });
  };

  const toggleFolder = (id: string) => {
    const next: KnowledgeSources = {
      ...ks,
      folderIds: ks.folderIds.includes(id)
        ? ks.folderIds.filter((f) => f !== id)
        : [...ks.folderIds, id],
    };
    onChange({ ...value, knowledgeSources: next });
  };

  const hasKnowledgeSources = docs.length > 0 || folders.length > 0;

  return (
    <div className="space-y-6">
      {/* Name */}
      <div>
        <label className="mb-2 block text-sm font-semibold text-foreground">
          {"Nom de l'agent"}
        </label>
        <Input
          type="text"
          value={value.name ?? ''}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          placeholder="Ex: Assistant Email 🤖"
        />
        <p className="mt-1 text-xs text-muted-foreground">Minimum 2 caractères</p>
      </div>

      {/* Instructions */}
      <div>
        <label className="mb-2 block text-sm font-semibold text-foreground">
          Instructions (optionnel)
        </label>
        <Textarea
          value={value.instructions ?? ''}
          onChange={(e) => onChange({ ...value, instructions: e.target.value })}
          placeholder="Décrivez le comportement de l'agent…"
          rows={3}
          className="resize-none"
        />
      </div>

      {/* Public toggle */}
      <div className="flex items-center gap-3">
        <Switch
          checked={value.isPublic ?? false}
          onCheckedChange={(checked) => onChange({ ...value, isPublic: checked })}
          id="agent-public"
        />
        <label
          htmlFor="agent-public"
          className="cursor-pointer text-sm font-medium text-foreground"
        >
          Rendre cet agent public
        </label>
      </div>

      {/* Tools */}
      <div>
        <label className="mb-3 block text-sm font-semibold text-foreground">
          Compétences (sélectionnez au moins une)
        </label>
        <div className="space-y-1">
          {BUILT_IN_TOOLS.map((tool) => (
            <label
              key={tool.name}
              className="flex cursor-pointer items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted/60"
            >
              <Switch
                checked={(value.enabledTools ?? []).includes(tool.name)}
                onCheckedChange={() => handleToolToggle(tool.name)}
                size="sm"
              />
              <div>
                <p className="text-sm font-medium text-foreground">{tool.name}</p>
                <p className="text-xs text-muted-foreground">{tool.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Knowledge sources */}
      {hasKnowledgeSources && (
        <div>
          <label className="mb-1 block text-sm font-semibold text-foreground">
            Sources de connaissances (optionnel)
          </label>
          <p className="mb-3 text-xs text-muted-foreground">
            {"Limitez l'agent à certains dossiers ou documents. Aucune sélection = base entière."}
          </p>

          {folders.length > 0 && (
            <div className="mb-3">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Dossiers
              </p>
              <div className="space-y-1">
                {folders.map((f) => (
                  <label
                    key={f.id}
                    className="flex cursor-pointer items-center gap-2 rounded-lg p-2 transition-colors hover:bg-muted/60"
                  >
                    <Switch
                      size="sm"
                      checked={ks.folderIds.includes(f.id)}
                      onCheckedChange={() => toggleFolder(f.id)}
                    />
                    <span className="text-sm text-foreground">{f.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {docs.length > 0 && (
            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Documents
              </p>
              <div className="max-h-36 space-y-1 overflow-y-auto">
                {docs.map((d) => (
                  <label
                    key={d.id}
                    className="flex cursor-pointer items-center gap-2 rounded-lg p-2 transition-colors hover:bg-muted/60"
                  >
                    <Switch
                      size="sm"
                      checked={ks.docIds.includes(d.id)}
                      onCheckedChange={() => toggleDoc(d.id)}
                    />
                    <span className="flex-1 text-sm text-foreground">{d.title}</span>
                    {!d.isIndexed && (
                      <span className="text-xs text-muted-foreground">(non indexé)</span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-between gap-2">
        <Button variant="outline" onClick={onBack}>
          {'← Précédent'}
        </Button>
        <Button onClick={onNext} disabled={!isValid}>
          {'Suivant →'}
        </Button>
      </div>
    </div>
  );
};
