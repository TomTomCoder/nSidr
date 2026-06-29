import { create } from 'zustand';
import type { FullAppEvent, FullAppStage } from '@/types/agent';

interface IFullAppGenerationState {
  conversationId: string | null;
  // Base this run belongs to — needed to scope localStorage persistence (a saga can take
  // several minutes across multiple "Continuer" clicks; without this, reloading the page
  // mid-run silently loses all progress even though the run survives server-side).
  baseId: string | null;
  // Current stage we're either generating or waiting on acceptance for. 'idle' before the
  // first call, 'done' once the report has been delivered.
  stage: FullAppStage | 'idle';
  isStreaming: boolean;
  // Full event history, in arrival order — rendered as the timeline.
  events: FullAppEvent[];
  // Proposal IDs created during the CURRENT stage — cleared each time a new stage starts.
  // The "Continuer" button is enabled once every one of these is accepted.
  pendingProposalIds: string[];
  report: Record<string, unknown> | null;
  error: string | null;

  startGeneration: (params: {
    spaceId: string;
    baseId: string;
    prompt: string;
    modelKey?: string;
  }) => Promise<void>;
  continueGeneration: (spaceId: string) => Promise<void>;
  // Restores a run in progress for this base from localStorage, if one exists. Call on the
  // panel's mount — a no-op if nothing was saved or the saved run already reached 'done'.
  restore: (baseId: string) => void;
  reset: () => void;
}

const initialState = {
  conversationId: null,
  baseId: null,
  stage: 'idle' as const,
  isStreaming: false,
  events: [],
  pendingProposalIds: [],
  report: null,
  error: null,
};

const persistKey = (baseId: string) => `teable:full-app-run:${baseId}`;

type IPersistedSnapshot = Pick<
  IFullAppGenerationState,
  'conversationId' | 'baseId' | 'stage' | 'events' | 'pendingProposalIds' | 'report' | 'error'
>;

function saveSnapshot(snapshot: IPersistedSnapshot): void {
  if (!snapshot.baseId || typeof window === 'undefined') return;
  if (snapshot.stage === 'idle' || snapshot.stage === 'done') {
    window.localStorage.removeItem(persistKey(snapshot.baseId));
    return;
  }
  window.localStorage.setItem(persistKey(snapshot.baseId), JSON.stringify(snapshot));
}

const UNKNOWN_ERROR = 'Erreur inconnue';

function emitLine(line: string, onEvent: (event: FullAppEvent) => void): void {
  if (!line.startsWith('data: ')) return;
  const json = line.slice(6).trim();
  if (!json) return;
  try {
    onEvent(JSON.parse(json) as FullAppEvent);
  } catch {
    // ignore malformed line — matches existing /chat reader's tolerance
  }
}

// Same SSE framing as UnifiedChatContainer's /chat reader: lines prefixed "data: ", one JSON
// event per line. Not extracted to a shared hook (yet) — kept local since this is the only
// other consumer; see UnifiedChatContainer.tsx for the original pattern.
async function streamEvents(res: Response, onEvent: (event: FullAppEvent) => void): Promise<void> {
  const reader = res.body?.getReader();
  if (!reader) return;
  const decoder = new TextDecoder();
  let buffer = '';
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) emitLine(line, onEvent);
  }
}

export const useFullAppGenerationStore = create<IFullAppGenerationState>()((set, get) => {
  // Applies one incoming SSE event to state. Plain closure over `set`/`get` — no need for a
  // separate store method, this is purely an implementation detail of the two actions below.
  const applyEvent = (event: FullAppEvent) => {
    set((s) => {
      const events = [...s.events, event];
      switch (event.type) {
        case 'proposal':
          return event.proposal
            ? { events, pendingProposalIds: [...s.pendingProposalIds, event.proposal.proposalId] }
            : { events };
        case 'awaiting_acceptance':
          return { events, stage: event.stage ?? s.stage };
        case 'report':
          return { events, report: event.data as Record<string, unknown> };
        case 'error':
          return { events, error: event.content ?? UNKNOWN_ERROR };
        case 'done':
          return {
            events,
            conversationId: event.conversationId ?? s.conversationId,
            stage: s.stage === 'agents' && s.report ? 'done' : s.stage,
          };
        default:
          return { events, conversationId: event.conversationId ?? s.conversationId };
      }
    });
  };

  // Snapshots are taken at natural pause points (after a stream ends, success or not) rather
  // than on every event — the gap that actually matters is the multi-minute wait while the
  // user accepts proposals between "Continuer" clicks, which always falls right after one of
  // these points.
  const persistCurrent = () => saveSnapshot(get());

  return {
    ...initialState,

    reset: () => {
      const { baseId } = get();
      if (baseId && typeof window !== 'undefined') {
        window.localStorage.removeItem(persistKey(baseId));
      }
      set({ ...initialState });
    },

    restore: (baseId) => {
      if (typeof window === 'undefined') return;
      const raw = window.localStorage.getItem(persistKey(baseId));
      if (!raw) return;
      try {
        const snapshot = JSON.parse(raw) as IPersistedSnapshot;
        if (snapshot.stage === 'idle' || snapshot.stage === 'done') return;
        set({ ...snapshot, isStreaming: false });
      } catch {
        window.localStorage.removeItem(persistKey(baseId));
      }
    },

    startGeneration: async ({ spaceId, baseId, prompt, modelKey }) => {
      set({ ...initialState, baseId, isStreaming: true });
      try {
        const res = await fetch(`/api/spaces/${spaceId}/ai/full-app`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ baseId, prompt, modelKey }),
        });
        await streamEvents(res, applyEvent);
      } catch (err) {
        set({ error: err instanceof Error ? err.message : UNKNOWN_ERROR });
      } finally {
        set({ isStreaming: false });
        persistCurrent();
      }
    },

    continueGeneration: async (spaceId) => {
      const { conversationId, isStreaming } = get();
      // The "Continuer" button already disables on isStreaming, but that only takes effect
      // once React re-renders — a second call fired before that (e.g. a fast double-click)
      // would otherwise race the backend's own stage transition for the same conversationId.
      if (!conversationId || isStreaming) return;
      set({ isStreaming: true, pendingProposalIds: [], error: null });
      try {
        const res = await fetch(`/api/spaces/${spaceId}/ai/full-app/${conversationId}/continue`, {
          method: 'POST',
        });
        await streamEvents(res, applyEvent);
      } catch (err) {
        set({ error: err instanceof Error ? err.message : UNKNOWN_ERROR });
      } finally {
        set({ isStreaming: false });
        persistCurrent();
      }
    },
  };
});
