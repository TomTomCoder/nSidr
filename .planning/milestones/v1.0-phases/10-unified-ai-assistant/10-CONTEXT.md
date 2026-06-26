# Phase 10: Unified AI Workspace Assistant — Context

**Gathered:** 2026-05-27
**Status:** Ready for planning
**Source:** /gsd:explore conversation (user-confirmed decisions)

<domain>
## Phase Boundary

Replace the existing Chat/Agent toggle in `ChatPanel.tsx` with a single conversational AI sidebar. The AI responds naturally to any request and can also propose + execute Teable operations through a preview→refine→accept loop. All conversations are persisted per workspace. The sidebar is always available (toggle-able like the current chat icon).

**What ships:**
- Single unified chat interface (no more Chat/Agent split)
- Workspace-aware AI (knows what tables, bases, apps, automations, integrations exist)
- Structured action proposals with Accept button before any write operation
- Conversation history saved and browsable per workspace
- Full Teable action coverage: create/modify/read tables, bases, folders, apps, automations, integrations status

**What does NOT ship:**
- OAuth field sync (Phase 6 backlog)
- Outlook OAuth provider
- Multi-workspace spanning in one conversation
</domain>

<decisions>
## Implementation Decisions

### D-01: Single Interface — No Mode Toggle [LOCKED]
Remove the Chat | Agent mode toggle from `ChatPanel.tsx`. Replace with one unified input. The AI determines from intent whether to respond conversationally or propose an action.
**Why:** Users are confused about which mode to use; switching is cumbersome; conversational context is lost between modes.

### D-02: Preview Before Action [LOCKED]
For any write operation (create table, create base, modify field, create automation, etc.), the AI MUST show a structured preview before executing. The preview renders as a special `ProposalCard` message in the chat thread.
**Why:** User explicitly chose "Show a preview/confirmation before creating."

### D-03: Conversational Refinement Loop [LOCKED]
After showing a preview, the user can either:
- Click **Accept** button → AI executes the action immediately
- Continue chatting with modifications → AI regenerates the preview and asks again

The loop continues in the same conversation thread until the user accepts.
**Why:** User confirmed "Generate a new preview with modifications and ask again. AI should display proposition with Accept button or user can simply reply with additional requests."

### D-04: Workspace State Awareness [LOCKED]
The AI backend service must query current workspace state before each response:
- All bases (databases) in the workspace
- All tables per base (with field names and types)
- All app interfaces
- All automations
- All third-party connections (Gmail, Slack, GitHub, Calendar, etc.)
This state is injected into the system prompt so the AI can reference existing structures.
**Why:** User confirmed "AI maintains awareness of current workspace state during conversation."

### D-05: One Assistant Per Workspace [LOCKED]
Each workspace has its own isolated AI assistant conversation context. The assistant scope is `workspaceId`. Switching between workspaces opens a separate conversation history.
**Why:** User confirmed "There's one assistant per workspace in a conversation."

### D-06: Sidebar Placement — Always Available [LOCKED]
The unified chat replaces/extends the existing `ChatPanel` at the same right-side panel position. Toggle visibility via the existing chat icon. Width = existing `380px` ChatPanel width. No new navigation chrome needed.
**Why:** User confirmed "sidebar chat that's always available (we can hide it - like currently with the chat icon)."

### D-07: Conversation Persistence — Saved and Browsable [LOCKED]
Every conversation turn is persisted to DB (reuse `AgentConversation` + `AgentConversationMessage` schema from Phase 4). The sidebar shows a conversation history panel the user can open to browse past conversations.
**Why:** User confirmed "Conversations be saved and browsable (so users can reference 'that table we designed yesterday')."

### D-08: Supported Actions Scope [LOCKED]
The AI must be able to perform these Teable operations:
**Read (no preview needed):**
- Fetch all bases, tables, fields in workspace
- Fetch all app interfaces
- Fetch all automations
- Fetch all third-party connection statuses (Gmail, Slack, GitHub)
- Query/search records in tables
- Summarize records

**Write (requires preview):**
- Create base (database)
- Create folder
- Create table with fields
- Add field to existing table
- Delete field from table
- Rename table or field
- Create app interface from existing tables
- Create automation (trigger + action)
- Create/update records

### D-09: Action Proposal Message Format [LOCKED]
When the AI proposes an action, it returns a structured JSON payload alongside its explanation text. The frontend renders this as a `ProposalCard` component with:
- Operation type badge (e.g., "Create Table")
- Preview of what will be created (table name, field list, types)
- **Accept** button → triggers execution
- The chat input stays enabled so user can type refinements

### D-10: Backend Architecture — Unified Endpoint [LOCKED]
Replace `ChatPanel`'s dual `generateAIResponse` / `aiAgentStream` calls with a single streaming endpoint:
`POST /api/spaces/:spaceId/ai/chat`
The endpoint:
1. Queries workspace state (bases, tables, apps, automations)
2. Builds system prompt with workspace context
3. Streams LLM response (SSE)
4. If LLM returns tool_calls → executes (for read) or returns proposal (for write)
5. Saves conversation turn to DB

### D-11: Claude's Discretion — Technical Choices
- LLM model selection: reuse existing `useAvailableModels` + `ModelSelector` hook/component from ChatPanel
- Streaming protocol: SSE (reuse existing pattern from AgentExecution)
- Proposal execution endpoint: `POST /api/spaces/:spaceId/ai/accept-proposal` with `{ proposalId, conversationId }`
- Frontend state: Zustand store for active proposals, loading, conversation history
- Proposal ID: UUID generated server-side, stored in conversation message metadata
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Chat Implementation (to extend/replace)
- `apps/nextjs-app/src/features/app/components/chat-panel/ChatPanel.tsx` — Current Chat/Agent panel to refactor
- `apps/nextjs-app/src/features/app/components/sidebar/useChatPanelStore.ts` — Chat panel state store
- `apps/nextjs-app/src/features/app/components/sidebar/Sidebar.tsx` — Main sidebar (contains chat icon toggle)

### Existing Agent Infrastructure (to reuse)
- `apps/nestjs-backend/src/features/agent/agent-conversation.service.ts` — Conversation persistence (reuse)
- `apps/nestjs-backend/src/features/agent/agent-tool-registry.service.ts` — Tool registry pattern (extend)
- `apps/nestjs-backend/src/features/agent/agent-execution.service.ts` — SSE streaming pattern (reference)
- `apps/nestjs-backend/src/features/agent/agent.controller.ts` — Controller pattern (reference)

### Existing AgentChat Components (to integrate)
- `apps/nextjs-app/src/components/AgentChat/ChatContainer.tsx` — Message thread with SSE (reuse)
- `apps/nextjs-app/src/components/AgentChat/MessageItem.tsx` — Message rendering (extend with ProposalCard)
- `apps/nextjs-app/src/components/AgentChat/ToolExecutionCard.tsx` — Tool output display (reuse)
- `apps/nextjs-app/src/types/agent.ts` — TypeScript types (extend)

### Teable API (to call for workspace state)
- `packages/openapi/src` — OpenAPI client functions (createTable, createBase, etc.)
- `packages/sdk/src/model/base.ts` — Base.createTable() pattern
- `apps/nestjs-backend/src/features/base/base.service.ts` — Base CRUD service
- `apps/nestjs-backend/src/features/space/space.service.ts` — Space/workspace service

### DB Schema
- `packages/db-main-prisma/prisma/postgres/schema.prisma` — AgentConversation + AgentConversationMessage models (reuse)

### Phase 4 Context (Agent System)
- `.planning/phases/04-super-agent-system/` — Prior agent architecture decisions
</canonical_refs>

<specifics>
## Specific Requirements

### Backend: New Unified AI Service
File: `apps/nestjs-backend/src/features/ai/unified-ai.service.ts`
- `chat(spaceId, userId, message, conversationId?)` → AsyncIterableIterator<SSEEvent>
- Internally: fetchWorkspaceState() → buildSystemPrompt() → streamLLM() → handleToolCalls()

### Backend: Workspace State Service
File: `apps/nestjs-backend/src/features/ai/workspace-state.service.ts`
- `getWorkspaceSnapshot(spaceId)` → returns bases, tables (with fields), apps, automations, integrations
- Called at start of every chat() call
- Cached per-request (not persisted, always fresh)

### Backend: Action Proposal Service
File: `apps/nestjs-backend/src/features/ai/action-proposal.service.ts`
- `createProposal(action, conversationMessageId)` → ProposalVo with id + preview
- `acceptProposal(proposalId, userId)` → executes the action, returns result

### Frontend: Unified Chat Panel
File: `apps/nextjs-app/src/features/app/components/chat-panel/ChatPanel.tsx` (REPLACE)
- Remove mode toggle (Chat | Agent buttons)
- Single `<UnifiedChatPanel>` component using `AgentChat/ChatContainer` as base
- Add `<ConversationHistory>` sidebar drawer for browsing saved conversations

### Frontend: Proposal Card Component
File: `apps/nextjs-app/src/components/AgentChat/ProposalCard.tsx` (NEW)
- Renders operation badge, preview details, Accept button
- On Accept: calls `POST /api/spaces/:spaceId/ai/accept-proposal`
- Shows loading state during execution, success/error after
</specifics>

<deferred>
## Deferred Ideas

- Memory toggles wired to API (ContextSidebar checkboxes → affect system prompt) — UI exists, wiring deferred
- Outlook OAuth provider — separate backlog item
- OAuth field sync (bidirectional sync of records ↔ Gmail/Slack) — Phase 6 backlog
- Conversation export / copy to clipboard
- AI-suggested automations from usage patterns
</deferred>

---

*Phase: 10-unified-ai-assistant*
*Context gathered: 2026-05-27 via /gsd:explore + /gsd:plan-phase discussion*
