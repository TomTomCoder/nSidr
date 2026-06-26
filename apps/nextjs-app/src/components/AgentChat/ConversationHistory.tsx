'use client';

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@teable/ui-lib/shadcn/ui/sheet';
import { useEffect, useState } from 'react';
import { useUnifiedChatStore } from '@/features/app/stores/useUnifiedChatStore';
import type { WorkspaceConversation } from '@/types/agent';

interface ConversationHistoryProps {
  spaceId: string;
  isOpen: boolean;
  onClose: () => void;
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleString();
  } catch {
    return dateStr;
  }
}

/**
 * Drawer listing past WorkspaceConversations for the given spaceId.
 * Fetches from the real GET /api/spaces/:spaceId/ai/conversations endpoint.
 * Per D-07: real data from real endpoint — no fallback empty list stub.
 */
export function ConversationHistory({ spaceId, isOpen, onClose }: ConversationHistoryProps) {
  const { conversationList, setConversationList, setConversationId, setMessages, reset } =
    useUnifiedChatStore(spaceId);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoadError(null);
    setIsLoading(true);

    fetch(`/api/spaces/${spaceId}/ai/conversations`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: Impossible de charger les conversations`);
        }
        const data = (await res.json()) as { conversations: WorkspaceConversation[] };
        setConversationList(data.conversations);
      })
      .catch((err: unknown) => {
        const message =
          err instanceof Error ? err.message : 'Impossible de charger les conversations';
        setLoadError(message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [isOpen, spaceId, setConversationList]);

  const handleSelect = (conversation: WorkspaceConversation) => {
    reset();
    setConversationId(conversation.id);
    onClose();
    fetch(`/api/spaces/${spaceId}/ai/conversations/${conversation.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(
        (data: { messages?: Array<{ type: string; role?: string; content: string }> } | null) => {
          if (data?.messages?.length) {
            setMessages(
              data.messages.map(
                (m) => ({ type: m.type, role: m.role, content: m.content }) as UnifiedChatEvent
              )
            );
          }
        }
      )
      .catch((e: unknown) => {
        console.error('Failed to load conversation messages', e);
      });
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-[360px] p-0">
        <SheetHeader className="border-b px-4 py-3">
          <SheetTitle className="text-sm font-semibold">Historique des conversations</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col overflow-hidden">
          {isLoading && (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              Chargement des conversations…
            </div>
          )}

          {loadError && (
            <div className="p-4">
              <p className="text-sm text-destructive">{loadError}</p>
            </div>
          )}

          {!isLoading && !loadError && conversationList.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              Aucune conversation. Commencez à discuter pour en créer une.
            </div>
          )}

          {!isLoading && !loadError && conversationList.length > 0 && (
            <ul className="divide-y overflow-y-auto">
              {conversationList.map((conv) => (
                <li key={conv.id}>
                  <button
                    type="button"
                    className="w-full px-4 py-3 text-left transition-colors hover:bg-muted/60"
                    onClick={() => handleSelect(conv)}
                  >
                    <p className="truncate text-sm font-medium text-foreground">
                      {conv.title ?? `Conversation du ${formatDate(conv.createdTime)}`}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatDate(conv.updatedTime)}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
