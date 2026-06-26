'use client';

import { CheckCircle2, Circle, Loader2, ListChecks } from 'lucide-react';
import { useMemo } from 'react';
import type { UnifiedChatEvent, AgentRunEvent } from '@/types/agent';

type AnyMessage = AgentRunEvent | UnifiedChatEvent;

interface TaskProgressPanelProps {
  messages: AnyMessage[];
  isStreaming: boolean;
  className?: string;
}

/**
 * Sticky "Task Progress N/total" checklist derived from streamed agent events.
 *
 * The unified/agent stream emits `progress` / `think` events whose content is a
 * short step description, plus `tool_result` events for tool activity. We treat
 * each distinct progress/think step as a checklist item: every step before the
 * latest is "done", the latest is "active" while streaming (or "done" once the
 * run finishes). Renders nothing until at least one step exists, so normal
 * Q&A chats are unaffected.
 */
export function TaskProgressPanel({ messages, isStreaming, className }: TaskProgressPanelProps) {
  const steps = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const m of messages) {
      if ((m.type === 'progress' || m.type === 'think') && typeof m.content === 'string') {
        const label = m.content.trim();
        if (label && !seen.has(label)) {
          seen.add(label);
          out.push(label);
        }
      }
    }
    return out;
  }, [messages]);

  if (steps.length === 0) return null;

  // While streaming the last step is in-flight; once done, everything is complete.
  const activeIndex = isStreaming ? steps.length - 1 : steps.length;
  const doneCount = isStreaming ? steps.length - 1 : steps.length;

  return (
    <div className={`rounded-lg border bg-muted/30 p-3 ${className ?? ''}`}>
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <ListChecks className="size-3.5" />
        <span>Progression</span>
        <span className="ml-auto tabular-nums">
          {doneCount}/{steps.length}
        </span>
      </div>
      <ul className="flex flex-col gap-1.5">
        {steps.map((label, i) => {
          const isDone = i < activeIndex;
          const isActive = i === activeIndex && isStreaming;
          return (
            <li key={label} className="flex items-start gap-2 text-xs">
              {isDone ? (
                <CheckCircle2 className="mt-px size-3.5 shrink-0 text-emerald-500" />
              ) : isActive ? (
                <Loader2 className="mt-px size-3.5 shrink-0 animate-spin text-primary" />
              ) : (
                <Circle className="mt-px size-3.5 shrink-0 text-muted-foreground/40" />
              )}
              <span
                className={
                  isDone
                    ? 'text-muted-foreground line-through'
                    : isActive
                      ? 'text-foreground'
                      : 'text-muted-foreground'
                }
              >
                {label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
