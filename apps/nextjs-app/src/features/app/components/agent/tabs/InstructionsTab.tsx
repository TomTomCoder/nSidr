import React, { useState } from 'react';

interface InstructionsTabProps {
  agent: any;
  onUpdated: (agent: any) => void;
}

export const InstructionsTab: React.FC<InstructionsTabProps> = ({ agent, onUpdated }) => {
  const [instructions, setInstructions] = useState(agent.instructions || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/agent/${agent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instructions }),
      });
      if (response.ok) {
        const updated = await response.json();
        onUpdated(updated);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <textarea
        value={instructions}
        onChange={(e) => setInstructions(e.target.value)}
        placeholder="Décrivez comment l'agent doit se comporter..."
        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        rows={6}
      />
      <button
        onClick={handleSave}
        disabled={isSaving}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {isSaving ? 'Enregistrement...' : 'Enregistrer'}
      </button>
    </div>
  );
};
