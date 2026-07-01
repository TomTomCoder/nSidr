'use client';

import { Sparkles } from 'lucide-react';
import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
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
  /** True only for the last assistant message while the response is still streaming. */
  isStreaming?: boolean;
}

/**
 * AI-themed assistant bubble: small accent avatar + markdown-rendered body (sanitized via
 * rehype-sanitize), with a blinking cursor while streaming. Colors go through theme tokens /
 * dark: variants so both themes stay legible; the streaming region is aria-live for a11y.
 */
function AssistantBubble({ content, isStreaming }: { content?: string; isStreaming?: boolean }) {
  return (
    <div className="flex w-full justify-start gap-2 py-1">
      <div
        className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-white shadow-sm"
        style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}
        aria-hidden="true"
      >
        <Sparkles className="size-3.5" />
      </div>
      <div
        className="prose prose-sm dark:prose-invert min-w-0 max-w-none flex-1 break-words rounded-lg border border-violet-200/60 bg-violet-50/40 px-3 py-2 text-sm text-foreground dark:border-violet-900/40 dark:bg-violet-950/20 dark:text-slate-200"
        aria-live={isStreaming ? 'polite' : undefined}
        aria-busy={isStreaming || undefined}
      >
        <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{content ?? ''}</ReactMarkdown>
        {isStreaming && (
          <span
            className="ai-stream-cursor ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 rounded-full bg-violet-500 align-middle"
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  );
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
  isStreaming,
}: MessageItemProps) {
  const { type, content } = message;

  // Support legacy AgentRunEvent fields
  const name = 'name' in message ? message.name : undefined;
  const input = 'input' in message ? message.input : undefined;
  const output = 'output' in message ? message.output : undefined;

  // Progress/thinking messages
  if (type === 'think' || type === 'progress') {
    return (
      <div className="flex w-full flex-col gap-1.5 py-1.5">
        <span className="text-sm text-muted-foreground">{content}</span>
        <div className="h-1 w-full overflow-hidden rounded-full bg-muted/40">
          <div className="ai-thinking-bar h-full w-1/3 rounded-full" />
        </div>
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

  // Assistant text — the backend never sets `role` on its SSE text_chunk events, so
  // anything that isn't explicitly tagged 'user' is assistant output.
  if ((type === 'text' || type === 'text_chunk') && message.role !== 'user') {
    return <AssistantBubble content={content} isStreaming={isStreaming} />;
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
      return (
        <ProposalCard
          proposal={proposal}
          spaceId={spaceId}
          conversationId={conversationId}
          activeBaseId={activeBaseId}
        />
      );
    }
  }

  return null;
});
