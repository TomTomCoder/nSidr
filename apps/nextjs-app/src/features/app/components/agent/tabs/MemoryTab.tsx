import React, { useEffect, useState } from 'react';

interface MemoryTabProps {
  agent: any;
}

export const MemoryTab: React.FC<MemoryTabProps> = ({ agent }) => {
  const [memories, setMemories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadMemories = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/agent/${agent.id}/memories`);
      if (response.ok) {
        const data = await response.json();
        setMemories(data);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <button
        onClick={loadMemories}
        disabled={isLoading}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
      >
        {isLoading ? 'Chargement...' : 'Voir les souvenirs'}
      </button>

      {memories.length > 0 && (
        <div className="space-y-2 border-t pt-4">
          {memories.map((memory, idx) => (
            <div key={idx} className="bg-gray-50 p-3 rounded-lg">
              <p className="text-xs text-gray-500 uppercase font-semibold">
                {memory.memoryType}
              </p>
              <p className="text-sm text-gray-900 mt-1">{memory.content}</p>
            </div>
          ))}
        </div>
      )}

      {!isLoading && memories.length === 0 && (
        <p className="text-sm text-gray-600">
          Aucun souvenir pour le moment. L'agent en stockera lors de ses exécutions.
        </p>
      )}
    </div>
  );
};
