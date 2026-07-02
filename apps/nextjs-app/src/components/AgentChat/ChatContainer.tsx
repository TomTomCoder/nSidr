'use client';

import { ArrowLeft } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import type { AgentRunEvent } from '@/types/agent';
import { ChatInput } from './ChatInput';
import { MessageList } from './MessageList';

const AgentProfilePanel = dynamic(() =>
  import('./AgentProfilePanel').then((m) => m.AgentProfilePanel)
);

interface ChatContainerProps {
  agentId: string;
  conversationId?: string;
}

export function ChatContainer({ agentId, conversationId }: ChatContainerProps) {
  const [messages, setMessages] = useState<AgentRunEvent[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState(conversationId);
  const [agent, setAgent] = useState<{
    id: string;
    name: string;
    description?: string | null;
    baseId?: string;
    instructions?: string;
    isActive?: boolean;
    isPublic?: boolean;
    [key: string]: unknown;
  } | null>(null);
  const sseRef = useRef<EventSource | null>(null);

  useEffect(() => {
    fetch(`/api/agent/${agentId}`)
      .then((r) => r.json())
      .then(setAgent)
      .catch(() => null);
  }, [agentId]);

  useEffect(() => {
    if (currentConversationId) void fetchConversationHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentConversationId]);

  const fetchConversationHistory = async () => {
    try {
      const res = await fetch(`/api/agent/${agentId}/conversations/${currentConversationId}`);
      const data = await res.json();
      const events: AgentRunEvent[] =
        data.messages?.map((msg: Record<string, unknown>) => ({
          type: msg.type,
          role: msg.role,
          content: msg.content,
          name: msg.toolName,
          input: msg.toolInput,
          output: msg.toolOutput,
        })) ?? [];
      setMessages(events);
    } catch {
      // ignore
    }
  };

  const handleRunAgent = async (triggerInput?: string) => {
    setIsRunning(true);
    setMessages([]);
    try {
      sseRef.current = new EventSource(
        `/api/agent/${agentId}/run?trigger=manual&input=${encodeURIComponent(triggerInput ?? '')}`
      );
      sseRef.current.addEventListener('message', (event) => {
        const data = JSON.parse(event.data) as AgentRunEvent;
        if (data.type === 'done') {
          setIsRunning(false);
          sseRef.current?.close();
          void fetchLatestConversation();
        } else {
          setMessages((prev) => [...prev, data]);
        }
      });
      sseRef.current.addEventListener('error', () => {
        setIsRunning(false);
        sseRef.current?.close();
      });
    } catch {
      setIsRunning(false);
    }
  };

  const fetchLatestConversation = async () => {
    try {
      const res = await fetch(`/api/agent/${agentId}/conversations?limit=1`);
      const data = await res.json();
      if (data[0]) setCurrentConversationId(data[0].id);
    } catch {
      // ignore
    }
  };

  return (
    <div className="flex h-screen bg-muted/30">
      {/* ── Left: chat area ───────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border bg-background px-5 py-3">
          {agent?.baseId && (
            <a
              href={`/base/${agent.baseId}`}
              className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              title="Retour à la base"
            >
              <ArrowLeft className="size-4" />
            </a>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-semibold text-foreground">{agent?.name ?? '…'}</h1>
            <p className="truncate text-xs text-muted-foreground">
              {currentConversationId ? 'Conversation en cours' : 'Aucune conversation'}
            </p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          <MessageList
            messages={messages}
            isLoading={isRunning}
            agentName={agent?.name}
            agentDescription={agent?.description ?? undefined}
            onSuggestion={(prompt) => void handleRunAgent(prompt)}
          />
        </div>

        {/* Input */}
        <div className="border-t border-border bg-background p-4">
          <ChatInput
            onSend={handleRunAgent}
            isDisabled={isRunning}
            placeholder="Demandez quelque chose à l'agent…"
          />
        </div>
      </div>

      {/* ── Right: always-visible profile + config panel ─ */}
      {agent && (
        <AgentProfilePanel
          agent={agent}
          onUpdated={(updated) => setAgent(updated as typeof agent)}
          onRunAgent={() => void handleRunAgent()}
          isRunning={isRunning}
        />
      )}
    </div>
  );
}
