import React, { useState, useEffect, useRef } from 'react';

interface AgentRunEvent {
  type: 'think' | 'tool' | 'progress' | 'text' | 'done' | 'error';
  content?: string;
  name?: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  step?: string;
}

interface ThinkingStep {
  id: string;
  type: AgentRunEvent['type'];
  label: string;
  detail?: string;
  timestamp: Date;
  status: 'running' | 'done' | 'error';
}

interface AgentThinkingStreamProps {
  agentId: string;
  trigger?: string;
  triggerPayload?: Record<string, unknown>;
  onComplete?: (events: AgentRunEvent[]) => void;
  onError?: (error: string) => void;
}

export const AgentThinkingStream: React.FC<AgentThinkingStreamProps> = ({
  agentId,
  trigger = 'manual',
  triggerPayload,
  onComplete,
  onError,
}) => {
  const [steps, setSteps] = useState<ThinkingStep[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [finalText, setFinalText] = useState<string | null>(null);
  const allEvents = useRef<AgentRunEvent[]>([]);

  const appendStep = (event: AgentRunEvent) => {
    const label =
      event.type === 'think'
        ? event.content ?? 'Réflexion...'
        : event.type === 'tool'
          ? `Outil: ${event.name}`
          : event.type === 'progress'
            ? event.step ?? 'En cours...'
            : event.type === 'text'
              ? 'Réponse'
              : event.type === 'error'
                ? 'Erreur'
                : 'Terminé';

    const step: ThinkingStep = {
      id: `${event.type}-${Date.now()}-${Math.random()}`,
      type: event.type,
      label,
      detail: event.type === 'tool' ? JSON.stringify(event.input) : undefined,
      timestamp: new Date(),
      status: event.type === 'error' ? 'error' : event.type === 'done' ? 'done' : 'running',
    };
    setSteps((prev) => [...prev, step]);
  };

  const run = async () => {
    setIsRunning(true);
    setSteps([]);
    setFinalText(null);
    allEvents.current = [];

    try {
      const response = await fetch(`/api/agent/${agentId}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trigger, triggerPayload }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.replace(/^data:\s*/, '').trim();
          if (!trimmed) continue;
          try {
            const event = JSON.parse(trimmed) as AgentRunEvent;
            allEvents.current.push(event);
            appendStep(event);
            if (event.type === 'text' && event.content) setFinalText(event.content);
            if (event.type === 'done') {
              onComplete?.(allEvents.current);
              break;
            }
            if (event.type === 'error') {
              onError?.(event.content ?? 'Unknown error');
              break;
            }
          } catch {
            // skip malformed line
          }
        }
      }
    } catch (err) {
      onError?.((err as Error).message);
    } finally {
      setIsRunning(false);
    }
  };

  const stepIcon = (s: ThinkingStep) => {
    if (s.status === 'error') return '✗';
    if (s.type === 'think') return '💭';
    if (s.type === 'tool') return '⚙';
    if (s.type === 'progress') return '⟳';
    if (s.type === 'text') return '✓';
    return '•';
  };

  return (
    <div className="flex flex-col gap-3 p-4">
      <button
        onClick={run}
        disabled={isRunning}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isRunning ? 'Exécution en cours...' : "Lancer l'agent"}
      </button>

      {steps.length > 0 && (
        <div className="border rounded-lg p-3 bg-gray-50 space-y-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Raisonnement
          </p>
          {steps.map((s) => (
            <div
              key={s.id}
              className={`flex items-start gap-2 text-sm ${s.status === 'error' ? 'text-red-600' : 'text-gray-700'}`}
            >
              <span className="shrink-0 w-4">{stepIcon(s)}</span>
              <span className={isRunning && s === steps[steps.length - 1] ? 'animate-pulse' : ''}>
                {s.label}
              </span>
            </div>
          ))}
        </div>
      )}

      {finalText && (
        <div className="border rounded-lg p-3 bg-white text-sm text-gray-800 whitespace-pre-wrap">
          {finalText}
        </div>
      )}
    </div>
  );
};
