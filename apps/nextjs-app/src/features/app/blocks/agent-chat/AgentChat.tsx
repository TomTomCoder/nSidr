'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { AgentRunEvent, ApprovalPayload } from '../../../../types/agent';
import { ApprovalCard } from './ApprovalCard';

interface AgentChatProps {
  agentId: string;
  conversationId?: string;
}

/**
 * AgentChat — full-page agent conversation UI.
 *
 * Renders the message stream from the backend SSE endpoint and
 * shows an <ApprovalCard> inline when the conversation is suspended
 * with status === 'waiting_for_approval'.
 */
export function AgentChat({ agentId, conversationId }: AgentChatProps) {
  const [messages, setMessages] = useState<AgentRunEvent[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState(conversationId);
  const [conversationStatus, setConversationStatus] = useState<string | null>(null);
  const [approvalPayload, setApprovalPayload] = useState<ApprovalPayload | null>(null);
  const [input, setInput] = useState('');
  const sseRef = useRef<EventSource | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const fetchConversation = useCallback(
    async (convId: string) => {
      try {
        const res = await fetch(`/api/agent/${agentId}/conversations/${convId}`);
        const data = await res.json();
        setConversationStatus(data.status ?? null);
        setApprovalPayload(data.approvalPayload ?? null);
        const events: AgentRunEvent[] = (data.messages ?? []).map(
          (msg: {
            type: AgentRunEvent['type'];
            role: AgentRunEvent['role'];
            content: string;
            toolName?: string;
            toolInput?: object;
            toolOutput?: object;
          }) => ({
            type: msg.type,
            role: msg.role,
            content: msg.content,
            name: msg.toolName,
            input: msg.toolInput,
            output: msg.toolOutput,
          })
        );
        setMessages(events);
      } catch {
        // ignore
      }
    },
    [agentId]
  );

  useEffect(() => {
    if (currentConversationId) void fetchConversation(currentConversationId);
  }, [currentConversationId, fetchConversation]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, approvalPayload]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isRunning) return;
    setInput('');
    setIsRunning(true);
    setMessages([]);
    setApprovalPayload(null);
    setConversationStatus(null);
    try {
      sseRef.current = new EventSource(
        `/api/agent/${agentId}/run?trigger=manual&input=${encodeURIComponent(trimmed)}`
      );
      sseRef.current.addEventListener('message', (event) => {
        const data = JSON.parse(event.data) as AgentRunEvent & { conversationId?: string };
        if (data.type === 'done') {
          setIsRunning(false);
          sseRef.current?.close();
          if (data.conversationId) {
            setCurrentConversationId(data.conversationId);
            void fetchConversation(data.conversationId);
          }
        } else {
          // Handle hitl suspension event from the backend
          if (
            (data as unknown as { type: string; content?: string }).type === 'hitl' &&
            data.content
          ) {
            try {
              const payload = JSON.parse(data.content) as ApprovalPayload;
              setApprovalPayload(payload);
              setConversationStatus('waiting_for_approval');
            } catch {
              // ignore malformed hitl payload
            }
            setIsRunning(false);
            sseRef.current?.close();
          } else {
            setMessages((prev) => [...prev, data]);
          }
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

  const handleResolved = useCallback(() => {
    if (!currentConversationId) return;
    // Refetch conversation status; backend will have restarted the run
    void fetchConversation(currentConversationId);
    setApprovalPayload(null);
    setConversationStatus(null);
    // Reconnect SSE to stream the resumed run
    setIsRunning(true);
    sseRef.current = new EventSource(
      `/api/agent/${agentId}/run?trigger=resume&conversationId=${encodeURIComponent(currentConversationId)}`
    );
    sseRef.current.addEventListener('message', (event) => {
      const data = JSON.parse(event.data) as AgentRunEvent;
      if (data.type === 'done') {
        setIsRunning(false);
        sseRef.current?.close();
        if (currentConversationId) void fetchConversation(currentConversationId);
      } else {
        setMessages((prev) => [...prev, data]);
      }
    });
    sseRef.current.addEventListener('error', () => {
      setIsRunning(false);
      sseRef.current?.close();
    });
  }, [agentId, currentConversationId, fetchConversation]);

  const showApprovalCard =
    conversationStatus === 'waiting_for_approval' && approvalPayload && currentConversationId;

  return (
    <div className="flex h-full flex-col">
      {/* Message list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className="text-sm text-foreground">
            {msg.role === 'user' ? (
              <div className="ml-auto w-fit max-w-[80%] rounded-lg bg-primary px-3 py-2 text-primary-foreground">
                {msg.content}
              </div>
            ) : (
              <div className="text-foreground">{msg.content}</div>
            )}
          </div>
        ))}

        {isRunning && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:-0.3s]" />
            <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:-0.15s]" />
            <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/40" />
          </div>
        )}

        {/* Approval card — rendered when conversation.status === 'waiting_for_approval' */}
        {showApprovalCard && (
          <ApprovalCard
            agentId={agentId}
            conversationId={currentConversationId}
            payload={approvalPayload}
            onResolved={handleResolved}
          />
        )}

        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border bg-background p-3 flex gap-2">
        <input
          className="flex-1 rounded border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          placeholder="Demandez quelque chose à l'agent…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void handleSend();
            }
          }}
          disabled={isRunning || conversationStatus === 'waiting_for_approval'}
        />
        <button
          className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          onClick={() => void handleSend()}
          disabled={isRunning || conversationStatus === 'waiting_for_approval'}
        >
          Envoyer
        </button>
      </div>
    </div>
  );
}

export default AgentChat;
