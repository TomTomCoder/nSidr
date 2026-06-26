import React, { useEffect, useState } from 'react';

const TOOLS = [
  { name: 'search_records', description: 'Rechercher dans les enregistrements' },
  { name: 'get_records', description: 'Récupérer une liste d\'enregistrements' },
  { name: 'get_record', description: 'Récupérer un enregistrement unique' },
  { name: 'create_comment', description: 'Ajouter un commentaire' },
  { name: 'get_record_activity', description: 'Voir l\'historique d\'un enregistrement' },
];

interface SkillsTabProps {
  agent: any;
  onUpdated: (agent: any) => void;
}

export const SkillsTab: React.FC<SkillsTabProps> = ({ agent, onUpdated }) => {
  const [enabledTools, setEnabledTools] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Load enabled tools from the backend (GET /api/agent/:id/tools)
    fetch(`/api/agent/${agent.id}/tools`)
      .then((r) => r.json())
      .then((tools: { toolName: string; isEnabled: boolean }[]) => {
        setEnabledTools(new Set(tools.filter((t) => t.isEnabled).map((t) => t.toolName)));
      })
      .catch(() => {
        // Non-fatal — leave toggles in default-off state
      });
  }, [agent.id]);

  const handleToggle = async (toolName: string) => {
    const isEnabled = !enabledTools.has(toolName);
    // Optimistic update
    setEnabledTools((prev) => {
      const next = new Set(prev);
      if (isEnabled) next.add(toolName);
      else next.delete(toolName);
      return next;
    });

    // Call API to update; roll back on failure
    try {
      const r = await fetch(`/api/agent/${agent.id}/tools/${toolName}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isEnabled }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
    } catch {
      // Roll back optimistic update
      setEnabledTools((prev) => {
        const next = new Set(prev);
        if (isEnabled) next.delete(toolName);
        else next.add(toolName);
        return next;
      });
    }
  };

  return (
    <div className="space-y-3">
      {TOOLS.map((tool) => (
        <div
          key={tool.name}
          className="border border-gray-200 rounded-lg p-3 flex justify-between items-start"
        >
          <div>
            <p className="font-semibold text-gray-900">{tool.name}</p>
            <p className="text-sm text-gray-600">{tool.description}</p>
          </div>
          <button
            onClick={() => handleToggle(tool.name)}
            className={`px-3 py-1 rounded text-sm font-medium transition ${
              enabledTools.has(tool.name)
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            {enabledTools.has(tool.name) ? 'Activé' : 'Désactivé'}
          </button>
        </div>
      ))}
    </div>
  );
};
