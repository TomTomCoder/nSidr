import type { UnifiedChatEvent, WorkspaceConversation } from '@/types/agent';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface IUnifiedChatState {
  // Current active conversation ID (persisted per store key)
  conversationId: string | null;
  // Browsable history list
  conversationList: WorkspaceConversation[];
  // Current thread messages (including optimistic user messages)
  messages: UnifiedChatEvent[];
  // Proposal status keyed by proposalId
  activeProposals: Record<string, 'pending' | 'accepting' | 'accepted' | 'error'>;
  // Whether an SSE stream is active
  isStreaming: boolean;

  // Actions
  setConversationId: (id: string | null) => void;
  appendMessage: (event: UnifiedChatEvent) => void;
  setMessages: (messages: UnifiedChatEvent[]) => void;
  setConversationList: (list: WorkspaceConversation[]) => void;
  setProposalStatus: (
    proposalId: string,
    status: 'pending' | 'accepting' | 'accepted' | 'error'
  ) => void;
  setIsStreaming: (v: boolean) => void;
  // Clears messages and conversationId for workspace switch
  reset: () => void;
}

/**
 * Factory to create a Zustand store scoped to a spaceId.
 * The store key uses the spaceId so each workspace gets its own persisted conversationId.
 */
const createUnifiedChatStore = (spaceId: string) =>
  create<IUnifiedChatState>()(
    persist(
      (set) => ({
        conversationId: null,
        conversationList: [],
        messages: [],
        activeProposals: {},
        isStreaming: false,

        setConversationId: (id) => set({ conversationId: id }),
        appendMessage: (event) => set((state) => ({ messages: [...state.messages, event] })),
        setMessages: (messages) => set({ messages }),
        setConversationList: (list) => set({ conversationList: list }),
        setProposalStatus: (proposalId, status) =>
          set((state) => ({
            activeProposals: { ...state.activeProposals, [proposalId]: status },
          })),
        setIsStreaming: (v) => set({ isStreaming: v }),
        reset: () => set({ messages: [], conversationId: null, activeProposals: {} }),
      }),
      {
        name: `unified-chat-${spaceId}`,
        // Only persist conversationId — messages and proposals are session-only
        partialize: (state) => ({
          conversationId: state.conversationId,
        }),
      }
    )
  );

// Cache stores by spaceId so the same store instance is reused
const storeCache = new Map<string, ReturnType<typeof createUnifiedChatStore>>();

/**
 * Hook to access the unified chat store for a given spaceId.
 * Call this with a spaceId to get a scoped store instance.
 */
export const useUnifiedChatStore = (spaceId: string): IUnifiedChatState => {
  if (!storeCache.has(spaceId)) {
    storeCache.set(spaceId, createUnifiedChatStore(spaceId));
  }
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return storeCache.get(spaceId)!();
};
