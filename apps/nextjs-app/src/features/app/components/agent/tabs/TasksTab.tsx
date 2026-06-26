import React, { useState } from 'react';

interface TasksTabProps {
  agent: Record<string, unknown>;
}

export const TasksTab: React.FC<TasksTabProps> = ({ agent }) => {
  const [cronExpression, setCronExpression] = useState('');

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Expression CRON (optionnel)
        </label>
        <input
          type="text"
          value={cronExpression}
          onChange={(e) => setCronExpression(e.target.value)}
          placeholder="Ex: 0 9 * * * (tous les jours à 9h)"
          className="w-full p-2 border border-gray-300 rounded-lg text-sm"
        />
      </div>
      <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300">
        Ajouter une automatisation
      </button>
      <div className="text-sm text-gray-600">
        <p>Aucune automatisation planifiée pour le moment.</p>
      </div>
    </div>
  );
};
