'use client';

import { Lightbulb, ListChecks, Play, Sparkles, Workflow } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { MessageItem } from './MessageItem';
// eslint-disable-next-line import/no-unresolved
import type { AgentRunEvent } from '@/types/agent';

interface MessageListProps {
  messages: AgentRunEvent[];
  isLoading: boolean;
  agentName?: string;
  agentDescription?: string;
  onSuggestion?: (prompt: string) => void;
}

const EMPTY_STATE_CARDS = [
  {
    icon: Sparkles,
    color: '#7c3aed',
    bg: 'rgba(124,58,237,0.12)',
    label: 'Résumer le contexte',
    desc: 'Quoi de neuf ?',
    prompt: 'Résume ce que tu peux voir et propose une action prioritaire.',
  },
  {
    icon: ListChecks,
    color: '#0ea5e9',
    bg: 'rgba(14,165,233,0.12)',
    label: 'Lister mes priorités',
    desc: 'Top 3 à faire',
    prompt: 'Donne-moi le top 3 des actions à faire maintenant.',
  },
  {
    icon: Lightbulb,
    color: '#10b981',
    bg: 'rgba(16,185,129,0.12)',
    label: 'Suggérer une amélioration',
    desc: 'Idée IA',
    prompt: 'Suggère une amélioration concrète que tu peux exécuter.',
  },
  {
    icon: Play,
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.12)',
    label: 'Lancer une tâche',
    desc: 'Exécute maintenant',
    prompt: 'Démarre ta tâche prioritaire et tiens-moi au courant.',
  },
];

export function MessageList({
  messages,
  isLoading,
  agentName,
  agentDescription,
  onSuggestion,
}: MessageListProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex h-full items-center justify-center px-6">
        <div className="flex w-full max-w-xl flex-col items-center">
          {/* Hero: gradient icon block + agent name */}
          <div className="ai-hero-enter mb-6 flex items-center gap-3">
            <div
              className="ai-icon-float flex size-10 items-center justify-center rounded-xl"
              style={{
                background:
                  'linear-gradient(135deg,rgba(124,58,237,0.2),rgba(79,70,229,0.15),rgba(14,165,233,0.15))',
                border: '1px solid rgba(124,58,237,0.3)',
              }}
            >
              <Workflow className="size-5" style={{ color: '#a78bfa' }} />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">{agentName ?? 'Agent'}</h1>
          </div>

          {agentDescription && (
            <p className="ai-hero-enter-delay-1 mb-6 max-w-md text-center text-sm text-muted-foreground">
              {agentDescription}
            </p>
          )}

          {/* 4-column action card grid (same pattern as Agent Builder) */}
          <div className="ai-hero-enter-delay-2 grid w-full grid-cols-4 gap-2">
            {EMPTY_STATE_CARDS.map((card, i) => {
              const Icon = card.icon;
              return (
                <button
                  key={card.label}
                  type="button"
                  onClick={() => onSuggestion?.(card.prompt)}
                  className={`ai-hero-enter-delay-${3 + i} group flex flex-col gap-2 rounded-xl border border-border p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg`}
                >
                  <div
                    className="flex size-7 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-110"
                    style={{ background: card.bg }}
                  >
                    <Icon className="size-3.5" style={{ color: card.color }} />
                  </div>
                  <span className="text-xs font-semibold leading-tight">{card.label}</span>
                  <span className="text-[10px] leading-tight text-muted-foreground">
                    {card.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {messages.map((msg, i) => (
        <MessageItem key={`${msg.type}-${i}`} message={msg} />
      ))}

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="flex gap-1">
            <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:-0.3s]" />
            <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:-0.15s]" />
            <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/40" />
          </span>
          L&apos;agent réfléchit…
        </div>
      )}

      <div ref={endRef} />
    </div>
  );
}
