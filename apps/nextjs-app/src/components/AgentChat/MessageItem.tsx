'use client';

import { memo } from 'react';
import type { UnifiedChatEvent, AgentRunEvent } from '@/types/agent';
import { ProposalCard } from './ProposalCard';
import { ToolExecutionCard } from './ToolExecutionCard';

// Support both AgentRunEvent (legacy) and UnifiedChatEvent (unified)
type AnyMessage = AgentRunEvent | UnifiedChatEvent;

interface MessageItemProps {
  message: AnyMessage;
  spaceId?: string;
  conversationId?: string;
  activeBaseId?: string;
}

/**
 * Memoized: historical messages never change, so wrapping in memo prevents
 * re-rendering the entire message list when a new message arrives.
 */
// eslint-disable-next-line sonarjs/cognitive-complexity
export const MessageItem = memo(function MessageItem({
  message,
  spaceId,
  conversationId,
  activeBaseId,
}: MessageItemProps) {
  const { type, content } = message;

  // Support legacy AgentRunEvent fields
  const name = 'name' in message ? message.name : undefined;
  const input = 'input' in message ? message.input : undefined;
  const output = 'output' in message ? message.output : undefined;

  // Progress/thinking messages
  if (type === 'think' || type === 'progress') {
    return (
      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
        <div className="animate-spin">⚙️</div>
        <span>{content}</span>
      </div>
    );
  }

  // User message (text+user role or text_chunk with role=user)
  if ((type === 'text' || type === 'text_chunk') && message.role === 'user') {
    return (
      <div className="flex w-full justify-end py-1">
        <div className="min-w-0 max-w-[85%] rounded-lg border border-border bg-muted/50 px-3 py-2 text-foreground dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100">
          <p className="whitespace-pre-wrap break-words text-sm">{content}</p>
        </div>
      </div>
    );
  }

  // Assistant text
  if ((type === 'text' || type === 'text_chunk') && message.role === 'assistant') {
    return (
      <div className="flex w-full justify-start py-1">
        <div className="min-w-0 w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-200">
          <p className="whitespace-pre-wrap break-words text-sm">{content}</p>
        </div>
      </div>
    );
  }

  // Tool execution (legacy AgentRunEvent)
  if (type === 'tool' && name && input) {
    return (
      <ToolExecutionCard
        name={name}
        input={input as Record<string, unknown>}
        output={output as Record<string, unknown> | undefined}
      />
    );
  }

  // Tool result (unified)
  if (type === 'tool_result') {
    const toolName = 'toolName' in message ? message.toolName : undefined;
    const toolOutput = 'toolOutput' in message ? message.toolOutput : undefined;
    if (toolName) {
      return (
        <ToolExecutionCard
          name={toolName}
          input={{}}
          output={toolOutput as Record<string, unknown> | undefined}
        />
      );
    }
  }

  // Error message
  if (type === 'error') {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 dark:border-red-900/50 dark:bg-red-950/30">
        <p className="text-sm text-red-800 dark:text-red-400">{content}</p>
      </div>
    );
  }

  // Proposal card — requires spaceId and conversationId
  if (type === 'proposal') {
    const proposal = 'proposal' in message ? message.proposal : undefined;
    if (proposal && spaceId && conversationId) {
      return <ProposalCard proposal={proposal} spaceId={spaceId} conversationId={conversationId} activeBaseId={activeBaseId} />;
    }
  }

  return null;
});
