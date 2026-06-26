---
phase: "10-unified-ai-assistant"
plan: 4
status: complete
subsystem: frontend
tags: [react, zustand, sse, proposal-workflow, conversation-history]
dependency_graph:
  requires: ["10-03"]
  provides: ["unified-chat-frontend", "proposal-card", "conversation-history-drawer"]
  affects: ["ChatPanel", "AgentChat"]
tech_stack:
  added: []
  patterns: ["zustand-persist-scoped", "fetch-readablestream-sse", "proposal-accept-pattern"]
key_files:
  created:
    - apps/nextjs-app/src/types/agent.ts
    - apps/nextjs-app/src/features/app/stores/useUnifiedChatStore.ts
    - apps/nextjs-app/src/components/AgentChat/ProposalCard.tsx
    - apps/nextjs-app/src/components/AgentChat/MessageItem.tsx
    - apps/nextjs-app/src/components/AgentChat/UnifiedChatContainer.tsx
    - apps/nextjs-app/src/components/AgentChat/ConversationHistory.tsx
  modified:
    - apps/nextjs-app/src/features/app/components/chat-panel/ChatPanel.tsx
decisions:
  - "useUnifiedChatStore uses factory pattern with storeCache map to scope Zustand stores per spaceId"
  - "suggestion groups moved inside UnifiedChatContainer via suggestionGroups prop to avoid dual input rendering"
  - "spaceId obtained from useParams() from next/navigation (no useSpaceId hook exists in @teable/sdk)"
  - "Custom event unified-chat-suggestion dispatched from ChatPanel to UnifiedChatContainer for suggestion clicks"
metrics:
  duration: "~25 minutes"
  completed_date: "2026-05-27"
  tasks_completed: 3
  files_created: 7
  files_modified: 1
---

# Phase 10 Plan 4: Unified AI Frontend Summary

**One-liner:** Single unified chat sidebar with SSE streaming, ProposalCard accept workflow, and browsable conversation history — Chat/Agent toggle removed.

## Tasks Completed

| Task | Name | Commit | Status |
|------|------|--------|--------|
| 1 | Types + Zustand store + ProposalCard | 72a06f1 | Done |
| 2 | UnifiedChatContainer + ConversationHistory + MessageItem | 9971bd5 | Done |
| 3 | Refactor ChatPanel — remove mode toggle | 601e3bc | Done |
| 4 | Human checkpoint + UAT bug fixes | e9c295b | Done |

## What Was Built

### Task 1: Types + Zustand Store + ProposalCard
- Extended `agent.ts` with `UnifiedChatEvent`, `UnifiedChatEventType`, and `WorkspaceConversation` types
- Created `useUnifiedChatStore` using a factory pattern: each spaceId gets its own Zustand+persist store instance, keyed by `unified-chat-{spaceId}`. Only `conversationId` is persisted; messages and proposals are session-only.
- Created `ProposalCard` with humanizeAction helper, table/field preview rendering, Accept/Accepting/Accepted/Error states, calls `POST /api/spaces/:spaceId/ai/accept-proposal`

### Task 2: UnifiedChatContainer + ConversationHistory + MessageItem
- Created `UnifiedChatContainer`: uses `fetch` + `ReadableStream` (not EventSource) for POST-based SSE. Parses `data:` prefixed lines, handles `done` event to capture `conversationId`. Includes `reader.cancel()` on unmount per T-10-09 threat mitigation. Accepts `suggestionGroups` prop for empty-state display.
- Created `ConversationHistory`: Sheet drawer that fetches `GET /api/spaces/:spaceId/ai/conversations` on open. Shows loading, error (non-2xx throws, no silent empty fallback), empty state, and conversation list. Per D-07.
- Extended `MessageItem`: added `spaceId` and `conversationId` optional props; added `proposal` type branch that renders `ProposalCard`; supports both `AgentRunEvent` and `UnifiedChatEvent` types.

### Task 3: ChatPanel Refactor
- Removed: `IMode` type, Chat|Agent toggle buttons, `mode` useState, `streamResponse` function, `useAIStream`, `useBaseId`, `aiAgentStream` imports
- Added: `UnifiedChatContainer` with `spaceId` from `useParams()`, Clock history icon button, `ConversationHistory` drawer
- Guard: `ChatPanel` returns null if `spaceId` is not yet available (avoids hook errors)
- Split into `ChatPanel` (outer, spaceId guard) and `ChatPanelInner` (all hooks unconditional)

## Deviations from Plan

### Auto-adjusted: useSpaceId hook

**Found during:** Task 3
**Issue:** Plan references `import { useSpaceId } from '@teable/sdk/hooks/use-space-id'` — this hook does not exist in the codebase.
**Fix:** Used `const { spaceId } = useParams<{ spaceId: string }>()` from `next/navigation` — the pattern used throughout the app (SpaceInnerLayout, SpaceSwitcher, SpaceInnerSideBar).
**Files modified:** `ChatPanel.tsx`

### Design adjustment: Suggestion groups

**Found during:** Task 3
**Issue:** Rendering both an empty-state suggestion block AND `UnifiedChatContainer` (which has its own input) would cause duplicate input rendering.
**Fix:** Passed `suggestionGroups` as a prop to `UnifiedChatContainer`, which renders the empty-state inside its own `ScrollArea`. A custom event (`unified-chat-suggestion`) dispatches suggestion text directly to `sendMessage`.

## Known Stubs

None — all data flows through real endpoints:
- `POST /api/spaces/:spaceId/ai/chat` (implemented Plan 03)
- `POST /api/spaces/:spaceId/ai/accept-proposal` (implemented Plan 03)
- `GET /api/spaces/:spaceId/ai/conversations` (implemented Plan 03)

## Threat Surface Scan

T-10-08 (Tampering — proposalId injection): `ProposalCard` sends `proposalId` from SSE event to `POST /ai/accept-proposal`. Server-side validation guards this per Plan 03 — no new surface introduced.

T-10-09 (DoS — ReadableStream not cancelled): Mitigated — `useEffect` cleanup in `UnifiedChatContainer` calls `readerRef.current?.cancel()` on unmount.

## Self-Check: PASSED

- All 7 files exist on disk (verified with `[ -f ... ]`)
- All 3 task commits exist in git log (72a06f1, 9971bd5, 601e3bc)
- `IMode` type: 0 occurrences in ChatPanel.tsx (verified with grep)
- `UnifiedChatContainer`, `ConversationHistory`, `spaceId` in MessageItem: 5 matches
- `UnifiedChatEvent\|WorkspaceConversation` in agent.ts: 6 matches
