import React, { useEffect, useState } from 'react';

interface ITrigger {
  id: string;
  triggerType: 'webhook' | 'schedule' | 'dm' | 'record';
  isActive: boolean;
  config: Record<string, unknown>;
  webhookUrl?: string;
}

const TRIGGER_TYPE_LABELS: Record<string, string> = {
  webhook: 'Webhook',
  schedule: 'Planification (cron)',
  dm: 'Message direct',
  record: 'Événement enregistrement',
};

interface TriggersTabProps {
  agent: { id: string; [key: string]: unknown };
}

export const TriggersTab: React.FC<TriggersTabProps> = ({ agent }) => {
  const [triggers, setTriggers] = useState<ITrigger[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [addingType, setAddingType] = useState<string | null>(null);
  const [cronExpr, setCronExpr] = useState('0 9 * * 1-5');
  const [mutationError, setMutationError] = useState<string | null>(null);

  const loadTriggers = () => {
    setIsLoading(true);
    fetch(`/api/agent/${agent.id}/triggers`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => setTriggers(Array.isArray(data) ? data : []))
      .catch(() => setTriggers([]))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadTriggers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent.id]);

  const handleAddWebhook = async () => {
    setMutationError(null);
    try {
      const r = await fetch(`/api/agent/${agent.id}/triggers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          triggerType: 'webhook',
          config: { secret: crypto.randomUUID() },
        }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      loadTriggers();
      setAddingType(null);
    } catch (e) {
      setMutationError((e as Error).message);
    }
  };

  const handleAddSchedule = async () => {
    setMutationError(null);
    try {
      const r = await fetch(`/api/agent/${agent.id}/triggers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          triggerType: 'schedule',
          config: { cron: cronExpr },
        }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      loadTriggers();
      setAddingType(null);
    } catch (e) {
      setMutationError((e as Error).message);
    }
  };

  const handleToggle = async (trigger: ITrigger) => {
    setMutationError(null);
    try {
      const r = await fetch(`/api/agent/${agent.id}/triggers/${trigger.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !trigger.isActive }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      loadTriggers();
    } catch (e) {
      setMutationError((e as Error).message);
    }
  };

  const handleDelete = async (triggerId: string) => {
    setMutationError(null);
    try {
      const r = await fetch(`/api/agent/${agent.id}/triggers/${triggerId}`, { method: 'DELETE' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      loadTriggers();
    } catch (e) {
      setMutationError((e as Error).message);
    }
  };

  return (
    <div className="space-y-4">
      {mutationError && (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          Error: {mutationError}
        </p>
      )}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Les déclencheurs activent l&apos;agent automatiquement selon des événements ou une
          planification.
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setAddingType('webhook')}
            className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            + Webhook
          </button>
          <button
            onClick={() => setAddingType('schedule')}
            className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            + Planification
          </button>
        </div>
      </div>

      {addingType === 'webhook' && (
        <div className="space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm font-semibold text-blue-900">Nouveau déclencheur Webhook</p>
          <p className="text-xs text-blue-700">
            Un secret sera généré automatiquement. Envoyez des requêtes POST au webhook URL avec
            l&apos;en-tête <code>X-Agent-Secret</code>.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleAddWebhook}
              className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              Créer
            </button>
            <button
              onClick={() => setAddingType(null)}
              className="rounded bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {addingType === 'schedule' && (
        <div className="space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm font-semibold text-blue-900">Nouveau déclencheur planifié</p>
          <div className="flex items-center gap-2">
            <label className="w-20 shrink-0 text-xs text-gray-700">Expression cron</label>
            <input
              value={cronExpr}
              onChange={(e) => setCronExpr(e.target.value)}
              className="flex-1 rounded border border-gray-300 px-2 py-1 font-mono text-sm"
              placeholder="0 9 * * 1-5"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAddSchedule}
              className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              Créer
            </button>
            <button
              onClick={() => setAddingType(null)}
              className="rounded bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {isLoading && <p className="text-sm text-gray-500">Chargement...</p>}

      {!isLoading && triggers.length === 0 && (
        <div className="py-8 text-center text-gray-500">
          <p className="text-sm">Aucun déclencheur configuré.</p>
          <p className="mt-1 text-xs">
            Ajoutez un webhook ou une planification pour exécuter cet agent automatiquement.
          </p>
        </div>
      )}

      {triggers.map((trigger) => (
        <div
          key={trigger.id}
          className="flex items-start justify-between gap-3 rounded-lg border border-gray-200 p-3"
        >
          <div className="flex-1 space-y-1">
            <p className="text-sm font-semibold text-gray-900">
              {TRIGGER_TYPE_LABELS[trigger.triggerType] ?? trigger.triggerType}
            </p>
            {trigger.triggerType === 'schedule' && Boolean(trigger.config.cron) && (
              <p className="font-mono text-xs text-gray-600">{String(trigger.config.cron)}</p>
            )}
            {trigger.triggerType === 'webhook' && trigger.webhookUrl && (
              <p className="break-all font-mono text-xs text-gray-600">{trigger.webhookUrl}</p>
            )}
            <span
              className={`inline-block rounded px-1.5 py-0.5 text-xs ${
                trigger.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
              }`}
            >
              {trigger.isActive ? 'Actif' : 'Inactif'}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => handleToggle(trigger)}
              className="rounded border border-gray-200 px-2 py-1 text-xs hover:bg-gray-50"
            >
              {trigger.isActive ? 'Désactiver' : 'Activer'}
            </button>
            <button
              onClick={() => handleDelete(trigger.id)}
              className="rounded border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
            >
              Supprimer
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
