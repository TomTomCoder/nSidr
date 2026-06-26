import React, { useEffect, useState } from 'react';

interface KnowledgeSources {
  docIds: string[];
  folderIds: string[];
}

interface DocItem {
  id: string;
  title: string;
  isIndexed: boolean;
}

interface FolderItem {
  id: string;
  name: string;
}

interface AgentRecord {
  id: string;
  knowledgeSources?: KnowledgeSources | null;
}

interface KnowledgeTabProps {
  agent: AgentRecord;
  spaceId?: string;
  onUpdated?: (agent: AgentRecord) => void;
}

export const KnowledgeTab: React.FC<KnowledgeTabProps> = ({ agent, spaceId, onUpdated }) => {
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Parse current knowledgeSources from the agent record
  const [selected, setSelected] = useState<KnowledgeSources>(() => {
    const ks = agent.knowledgeSources as KnowledgeSources | null;
    return { docIds: ks?.docIds ?? [], folderIds: ks?.folderIds ?? [] };
  });

  useEffect(() => {
    if (!spaceId) return;
    // Fetch available docs from the space knowledge base
    fetch(`/api/spaces/${spaceId}/docs`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: DocItem[]) => setDocs(data))
      .catch(() => setDocs([]));

    // Fetch available folders
    fetch(`/api/spaces/${spaceId}/doc-folders`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: FolderItem[]) => setFolders(data))
      .catch(() => setFolders([]));
  }, [spaceId]);

  const toggleDoc = (id: string) => {
    setSelected((prev) => ({
      ...prev,
      docIds: prev.docIds.includes(id) ? prev.docIds.filter((d) => d !== id) : [...prev.docIds, id],
    }));
  };

  const toggleFolder = (id: string) => {
    setSelected((prev) => ({
      ...prev,
      folderIds: prev.folderIds.includes(id)
        ? prev.folderIds.filter((f) => f !== id)
        : [...prev.folderIds, id],
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const r = await fetch(`/api/agent/${agent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ knowledgeSources: selected }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const updated = await r.json();
      onUpdated?.(updated);
    } catch (err) {
      setSaveError('Failed to save knowledge sources');
    } finally {
      setSaving(false);
    }
  };

  const noneSelected = selected.docIds.length === 0 && selected.folderIds.length === 0;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-1 font-semibold text-gray-900">Knowledge Sources</h3>
        <p className="mb-4 text-sm text-gray-500">
          Restrict this agent to search only the selected docs and folders. If none are selected,
          the agent searches the entire space knowledge base.
        </p>

        {!spaceId && (
          <p className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-600">
            Space context not available — reload the page to configure knowledge sources.
          </p>
        )}

        {spaceId && folders.length === 0 && docs.length === 0 && (
          <p className="text-sm italic text-gray-500">
            No docs or folders found. Import documents via the knowledge base panel first.
          </p>
        )}

        {folders.length > 0 && (
          <div className="mb-4">
            <h4 className="mb-2 text-sm font-medium text-gray-700">Folders</h4>
            <div className="space-y-1">
              {folders.map((f) => (
                <label
                  key={f.id}
                  className="flex cursor-pointer items-center gap-2 rounded p-2 hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    className="rounded"
                    checked={selected.folderIds.includes(f.id)}
                    onChange={() => toggleFolder(f.id)}
                  />
                  <span className="text-sm text-gray-800">{f.name}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {docs.length > 0 && (
          <div className="mb-4">
            <h4 className="mb-2 text-sm font-medium text-gray-700">Documents</h4>
            <div className="max-h-48 space-y-1 overflow-y-auto">
              {docs.map((d) => (
                <label
                  key={d.id}
                  className="flex cursor-pointer items-center gap-2 rounded p-2 hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    className="rounded"
                    checked={selected.docIds.includes(d.id)}
                    onChange={() => toggleDoc(d.id)}
                  />
                  <span className="flex-1 text-sm text-gray-800">{d.title}</span>
                  {!d.isIndexed && (
                    <span className="ml-1 text-xs text-gray-400">(not indexed)</span>
                  )}
                </label>
              ))}
            </div>
          </div>
        )}

        {noneSelected && (
          <p className="mt-2 text-xs text-gray-400">
            No restriction — agent searches the full knowledge base.
          </p>
        )}
      </div>

      {saveError && <p className="text-sm text-red-600">{saveError}</p>}

      <button
        onClick={handleSave}
        disabled={saving || !spaceId}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Save knowledge sources'}
      </button>
    </div>
  );
};
