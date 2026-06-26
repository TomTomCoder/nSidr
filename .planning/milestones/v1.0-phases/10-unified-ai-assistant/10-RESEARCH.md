# Phase 10: Unified AI Workspace Assistant — Research

**Researched:** 2026-05-27
**Domain:** NestJS + Vercel AI SDK + Next.js / SSE streaming / Prisma / Zustand
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Remove Chat | Agent mode toggle from `ChatPanel.tsx`. Single unified input.
- **D-02:** Write operations require a `ProposalCard` preview before executing. No direct execution.
- **D-03:** Conversational refinement loop: Accept button OR user continues typing to refine.
- **D-04:** Workspace state queried at chat start: bases, tables+fields, app interfaces, automations, integrations.
- **D-05:** One assistant per workspace (`spaceId`). Switching workspace opens a new conversation history.
- **D-06:** Same right-side `ChatPanel` at 380px. Toggle via existing chat icon.
- **D-07:** Conversations persisted and browsable. Reuse `AgentConversation` + `AgentConversationMessage` models.
- **D-08:** Read operations (fetch bases/tables/records) execute directly. Write operations require preview.
- **D-09:** Proposal message format: operation badge + preview details + Accept button. Chat input stays enabled.
- **D-10:** Single endpoint `POST /api/spaces/:spaceId/ai/chat`. Endpoint: 1) query workspace state, 2) build system prompt, 3) stream LLM, 4) read tools execute / write tools return proposal, 5) save turn.
- **D-11 (discretion):** LLM model — reuse `useAvailableModels` + `ModelSelector`. Streaming — SSE (existing pattern). Accept endpoint — `POST /api/spaces/:spaceId/ai/accept-proposal`. Frontend state — Zustand. Proposal ID — UUID server-side.

### Claude's Discretion

- LLM model selection component: reuse `useAvailableModels` + `ModelSelector` hook/component
- Streaming protocol: SSE (reuse existing pattern from AgentExecution)
- Proposal execution endpoint: `POST /api/spaces/:spaceId/ai/accept-proposal` with `{ proposalId, conversationId }`
- Frontend state: Zustand store for active proposals, loading, conversation history
- Proposal ID: UUID generated server-side, stored in conversation message metadata

### Deferred Ideas (OUT OF SCOPE)

- Memory toggle wiring (UI exists, deferred)
- Outlook OAuth provider
- OAuth field sync (Phase 6 backlog)
- Conversation export / copy to clipboard
- AI-suggested automations from usage patterns
</user_constraints>

---

## Summary

Phase 10 replaces the existing dual Chat/Agent mode in `ChatPanel.tsx` with a single unified AI sidebar. The existing infrastructure is well-suited for reuse: the `AgentConversationService` persists messages, `AgentExecutionService` provides the AsyncGenerator/SSE pattern, `ChatPanel.tsx` already holds the UI skeleton (380px, toggle, model selector), and `ChatContainer.tsx` provides the SSE-consuming message thread. The critical new work is: (1) a `WorkspaceStateService` that joins bases + tables + fields + integrations into a system-prompt snapshot, (2) a `UnifiedAiService` that routes LLM tool calls into either direct execution (reads) or proposal generation (writes), (3) a `WorkspaceConversation` Prisma model scoped to `spaceId` (the existing `AgentConversation` is scoped to `agentId` — a new model or extended model is needed), and (4) a `ProposalCard` frontend component.

**Primary recommendation:** Add a new `WorkspaceConversation` model rather than repurposing `AgentConversation.agentId` — the scoping semantics differ (workspace vs. agent) and mixing them creates indexing and data confusion. The structural fields (`messages`, `status`, `title`, `metadata`) are identical; copy the model with `spaceId` as the FK.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Workspace state snapshot | API / Backend | — | Requires DB access to bases, tables, fields, integrations — cannot run in browser |
| LLM streaming + tool dispatch | API / Backend | — | Tool execution and proposal creation happen server-side |
| SSE streaming to client | API / Backend → Browser | — | Backend streams events; browser consumes via `EventSource` or `fetch` with `ReadableStream` |
| Proposal preview rendering | Browser / Client | — | `ProposalCard` is a pure UI component consuming structured JSON from SSE event |
| Proposal acceptance call | Browser / Client | API / Backend | Browser POST → backend executes write operation |
| Conversation history persistence | Database / Storage | API / Backend | Prisma write on every turn; backend owns the write |
| Conversation history browsing | Browser / Client | API / Backend | Frontend Zustand + API list endpoint |
| Model selection | Browser / Client | — | Reuse `useAvailableModels` + `ModelSelector` (already in ChatPanel) |

---

## Standard Stack

### Core (all [VERIFIED: codebase grep])

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `ai` (Vercel AI SDK) | already installed | `generateText`, `streamText`, tool calling | Used throughout `ai.service.ts` |
| `@nestjs/common` | already installed | NestJS decorators, DI | Project standard |
| `@teable/db-main-prisma` | workspace | Prisma client for DB writes | Project standard |
| `zustand` | already installed | Frontend state (`useChatPanelStore` uses it) | Project standard |
| `zod` | already installed | DTO / schema validation | Project standard |
| `uuid` | already installed (Node built-in `crypto.randomUUID()`) | Proposal ID generation | No new dep needed |

### No new packages required

This phase adds no new npm dependencies. All needed libraries are already in the monorepo.

---

## Package Legitimacy Audit

No new packages to install. All libraries are already present in the monorepo.

---

## Architecture Patterns

### System Architecture Diagram

```
Browser                          NestJS Backend                    PostgreSQL
──────────                       ──────────────                    ──────────
ChatPanel (unified)
  │
  ├─ POST /api/spaces/:id/ai/chat ──────────────────────────────→ UnifiedAiController
  │   body: { message, conversationId?, modelKey }                   │
  │                                                                   ├─ WorkspaceStateService.getSnapshot(spaceId)
  │                                                                   │    ├─ bases (via PrismaService)
  │                                                                   │    ├─ tables+fields per base
  │                                                                   │    ├─ integrations (OAuthIntegration)
  │                                                                   │    ├─ agentTriggers (proxy for automations)
  │                                                                   │    └─ plugins (proxy for app interfaces)
  │                                                                   │
  │                                                                   ├─ Build system prompt (workspace JSON)
  │                                                                   │
  │                                                                   ├─ UnifiedAiService.chat() → AsyncGenerator<SSEEvent>
  │                                                                   │    ├─ streamText / generateText with tools
  │                                                                   │    ├─ READ tool called → execute → yield {type:'tool_result'}
  │                                                                   │    └─ WRITE tool called → create proposal → yield {type:'proposal', payload}
  │                                                                   │
  │  ← SSE stream (text chunks, tool_result, proposal events) ──────┤
  │                                                                   └─ Save turn to WorkspaceConversationMessage
  │
  ├─ ProposalCard renders (from proposal event)
  │    Accept button clicked
  │
  ├─ POST /api/spaces/:id/ai/accept-proposal ──────────────────→ UnifiedAiController
  │   body: { proposalId, conversationId }                            │
  │                                                                   └─ ActionProposalService.acceptProposal()
  │                                                                        ├─ findUnique({ where: { proposalId } }) — O(1)
  │                                                                        ├─ Execute write (createTable, createBase, etc.)
  │                                                                        └─ Return result
  │
  └─ GET /api/spaces/:id/ai/conversations ─────────────────────→ UnifiedAiController
      (ConversationHistory drawer)                                    └─ workspaceConversation.findMany (latest 20)
```

### Recommended Project Structure

```
apps/nestjs-backend/src/features/ai/
├── ai.service.ts                      (existing — reuse getModelInstance)
├── prompt.service.ts                  (existing)
├── unified-ai.service.ts              (NEW — chat() AsyncGenerator)
├── workspace-state.service.ts         (NEW — getSnapshot(spaceId))
├── action-proposal.service.ts         (NEW — createProposal, acceptProposal)
├── unified-ai.controller.ts           (NEW — POST /api/spaces/:spaceId/ai/chat + accept-proposal + GET conversations)
└── unified-ai.module.ts               (NEW — wires all services)

apps/nextjs-app/src/features/app/components/chat-panel/
└── ChatPanel.tsx                      (REPLACE — remove mode toggle, add ProposalCard support)

apps/nextjs-app/src/components/AgentChat/
├── ChatContainer.tsx                  (REUSE — adapt props: spaceId instead of agentId)
├── MessageItem.tsx                    (EXTEND — add 'proposal' type branch)
├── ProposalCard.tsx                   (NEW — badge, preview, Accept button)
└── ConversationHistory.tsx            (NEW — drawer listing past conversations)

apps/nextjs-app/src/features/app/stores/
└── useUnifiedChatStore.ts             (NEW — Zustand: active proposals, conversation list)
```

### Pattern 1: Write-gated Tool Dispatch (proposal vs. direct execution)

**What:** The `UnifiedAiService` registers ALL tools with the LLM but splits dispatch: read tools call the actual service; write tools build a proposal JSON, save it to message metadata, and yield a `proposal` SSE event instead of executing.

**When to use:** Every time the LLM calls a tool that mutates data.

**Example (pseudo-code):**
```typescript
// Source: pattern derived from ai.service.ts generateAgentStream (line 1370)
// and AgentExecutionService.executeToolCall

const tools = {
  // READ — executes immediately
  get_workspace_state: {
    description: 'Fetch all bases and tables',
    parameters: z.object({}),
    execute: async () => workspaceStateService.getSnapshot(spaceId),
  },
  // WRITE — returns proposal, does NOT execute
  create_table: {
    description: 'Create a new table in a base',
    parameters: z.object({
      baseId: z.string(),
      name: z.string(),
      fields: z.array(z.object({ name: z.string(), type: z.string() })),
    }),
    execute: async (args) => {
      // Build proposal — no actual DB write yet
      const proposal = await actionProposalService.createProposal({
        action: 'create_table',
        args,
        conversationMessageId,
      });
      return { __type: 'proposal', proposalId: proposal.id, preview: proposal.preview };
    },
  },
  // Additional write tools (all same pattern):
  // create_base, create_field, delete_field, rename_table, rename_field,
  // create_record, update_record, create_folder, create_app_interface, create_automation
};
```

The frontend detects `__type: 'proposal'` in the tool result SSE chunk and renders `ProposalCard` instead of a normal tool output card.

### Pattern 2: SSE Controller (reuse from AgentController)

**What:** NestJS controller sets SSE headers, iterates AsyncGenerator, writes `data: JSON\n\n`.

**Example:**
```typescript
// Source: agent.controller.ts lines 79-93
res.setHeader('Content-Type', 'text/event-stream');
res.setHeader('Cache-Control', 'no-cache');
res.setHeader('Connection', 'keep-alive');
for await (const event of this.unifiedAiService.chat(ctx)) {
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}
res.end();
```

### Pattern 3: Conversation scoped to spaceId (new Prisma model)

**What:** `WorkspaceConversation` — mirrors `AgentConversation` but with `spaceId` instead of `agentId`.

**Why not reuse AgentConversation directly:** `AgentConversation.agentId` is a required FK to the `Agent` model. Using it for workspace conversations would require creating a fake Agent record or making `agentId` nullable — both are wrong. Adding a parallel model is cleaner. [ASSUMED: that adding a new model with migration is preferred; an alternative is making agentId nullable and adding a nullable spaceId. Planner should confirm migration approach.]

**Proposed model:**
```prisma
model WorkspaceConversation {
  id          String    @id @default(cuid())
  spaceId     String    @map("space_id")
  title       String?
  status      String    @default("in_progress")
  createdTime DateTime  @default(now()) @map("created_time")
  updatedTime DateTime  @updatedAt @map("updated_time")
  createdBy   String    @map("created_by")

  space    Space @relation(fields: [spaceId], references: [id])
  messages WorkspaceConversationMessage[]

  @@index([spaceId])
  @@index([createdTime])
  @@map("workspace_conversation")
}

model WorkspaceConversationMessage {
  id             String    @id @default(cuid())
  conversationId String    @map("conversation_id")
  role           String    // 'user' | 'assistant'
  type           String    // 'text' | 'proposal' | 'tool_result' | 'error'
  content        String    @db.Text
  proposalId     String?   @unique @map("proposal_id")  // set when type='proposal'; enables O(1) lookup
  metadata       Json?     // stores proposal JSON when type='proposal'
  createdTime    DateTime  @default(now()) @map("created_time")

  conversation WorkspaceConversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)

  @@index([conversationId])
  @@map("workspace_conversation_message")
}
```

### Pattern 4: ActionProposal stored in message metadata + unique column

**What:** The proposal JSON is stored in `WorkspaceConversationMessage.metadata`. The `proposalId` field is also stored as a `@unique` column on the message row — this enables `findUnique({ where: { proposalId } })` in `acceptProposal()` without in-memory filtering. No separate table needed for Phase 10.

**Key fields in metadata:**
```json
{
  "proposalId": "uuid-v4",
  "action": "create_table",
  "args": { "baseId": "...", "name": "CRM", "fields": [...] },
  "accepted": false,
  "acceptedAt": null
}
```

**Accept lookup:**
```typescript
// O(1) via DB unique index — no findMany + in-memory filter needed
const message = await prismaService.workspaceConversationMessage.findUnique({
  where: { proposalId }
});
if (!message) throw new NotFoundException();
if ((message.metadata as any).accepted) throw new ConflictException('Proposal already accepted');
```

### Pattern 5: ChatContainer reuse for spaceId scope

**What:** `ChatContainer.tsx` is hardcoded to `agentId`. To reuse it, change the prop from `agentId: string` to `spaceId: string` and update all internal fetch URLs from `/api/agent/${agentId}/...` to `/api/spaces/${spaceId}/ai/...`.

**Alternatively** (cleaner): create a thin `UnifiedChatContainer.tsx` wrapper that uses `spaceId` and delegates message rendering to the existing `MessageList` + `MessageItem` components. This avoids modifying the existing `AgentChat/ChatContainer.tsx` which is used by the Agent builder UI.

**Recommendation:** Create `UnifiedChatContainer.tsx` — do not modify `AgentChat/ChatContainer.tsx`.

### Anti-Patterns to Avoid

- **Re-fetching workspace state on every SSE chunk:** Fetch workspace state ONCE at the start of `chat()`, inject into system prompt, do not call `getSnapshot` again mid-stream.
- **Executing write tools immediately inside `execute()`:** All write tool `execute()` functions MUST return proposal JSON, never mutate DB directly. Actual mutation happens only via `accept-proposal`.
- **Storing proposal in a separate DB table:** Use `WorkspaceConversationMessage.metadata` — avoids a new migration and keeps the proposal co-located with its message context.
- **Using `EventSource` for the chat POST:** `EventSource` only supports GET. The unified chat endpoint is a POST (body contains message). Use `fetch` with `ReadableStream` reader — same pattern as `aiAgentStream` in `ChatPanel.tsx` (lines 78-90).
- **Reusing `AgentConversation` with agentId=null:** `agentId` is a required FK; making it nullable is a migration that ripples into `AgentConversationService` and existing queries.
- **Using findMany + in-memory filter for acceptProposal:** Use `findUnique({ where: { proposalId } })` via the unique column — not `findMany` on type='proposal' with in-memory filtering.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| LLM tool-calling with structured output | Custom JSON parsing | Vercel AI SDK `generateText` with `tools` + `execute` | SDK handles tool invocation, retries, multi-step |
| SSE streaming | Custom chunked encoding | NestJS `res.write('data: ...\n\n')` pattern (agent.controller.ts line 85) | Already works, tested |
| Model instance resolution | Custom provider registry | `aiService.getModelInstance(modelKey, llmProviders)` | Handles all providers (OpenAI, Anthropic, aiGateway) |
| Workspace state assembly | Ad-hoc Prisma queries | `WorkspaceStateService.getSnapshot()` — one service, one call | Encapsulates N+1 risk; cacheable |
| DB writes for Teable entities | Raw Prisma SQL | Existing `TableOpenApiService.createTable()`, `base.service.ts` methods | Validates permissions, runs event hooks |

---

## Common Pitfalls

### Pitfall 1: POST endpoint with SSE — wrong headers order
**What goes wrong:** `Content-Type: text/event-stream` must be set BEFORE any `res.write()`. If set after, the browser treats the response as plain text and `EventSource` / stream reader fails.
**Why it happens:** NestJS interceptors can write headers; calling `res.setHeader` after the first write is a no-op.
**How to avoid:** Set all SSE headers as the first action in the controller method (see agent.controller.ts pattern).
**Warning signs:** Browser shows response as text, no SSE events arrive.

### Pitfall 2: Workspace state query N+1 — too slow for large workspaces
**What goes wrong:** Fetching bases, then for each base fetching tables, then for each table fetching fields creates O(bases * tables) DB round trips.
**Why it happens:** Sequential `findMany` calls in a loop.
**How to avoid:** Use Prisma nested `include` in one query: `prismaService.base.findMany({ where: { spaceId }, include: { tables: { include: { fields: true } } } })`.
**Warning signs:** Chat response latency > 2s before first token.

### Pitfall 3: Proposal accepted twice (race condition)
**What goes wrong:** User clicks Accept; network is slow; user clicks again. Two execute calls land simultaneously, creating duplicate tables/bases.
**Why it happens:** No optimistic lock on proposal state.
**How to avoid:** Atomic Prisma update with condition on `accepted: false` in metadata, or add a separate `ActionProposal` model with a DB-level unique constraint + status enum. For Phase 10 scope, the metadata approach with a Prisma conditional update is sufficient.

### Pitfall 4: `ChatContainer.tsx` modified breaks Agent builder UI
**What goes wrong:** Modifying `apps/nextjs-app/src/components/AgentChat/ChatContainer.tsx` to accept `spaceId` breaks the existing Agent builder which passes `agentId`.
**Why it happens:** The component is shared.
**How to avoid:** Create `UnifiedChatContainer.tsx` — do not modify `ChatContainer.tsx`.

### Pitfall 5: System prompt too large for context window
**What goes wrong:** A workspace with 50 bases, 500 tables, 5000 fields produces a system prompt that exceeds the model's context window.
**Why it happens:** Injecting full field lists for every table.
**How to avoid:** Truncate field lists to name + type only (no descriptions), summarize tables as `{ id, name, fieldCount }`, only expand details for tables mentioned in the user message.

### Pitfall 6: `AgentConversation.agentId` required FK prevents reuse
**What goes wrong:** Attempting to call `conversationService.createConversation(agentId, userId)` with a fake agentId fails FK constraint.
**Why it happens:** `AgentConversation` has a `NOT NULL` FK to `Agent`.
**How to avoid:** Use the new `WorkspaceConversation` model. Do not reuse `AgentConversationService` for workspace conversations.

---

## Code Examples

### Workspace State Snapshot Query
```typescript
// Source: [ASSUMED] — derived from base.service.ts line 155 + Prisma nested include pattern
async getSnapshot(spaceId: string) {
  const bases = await this.prismaService.base.findMany({
    where: { spaceId, deletedTime: null },
    include: {
      tables: {
        where: { deletedTime: null },
        include: {
          fields: {
            select: { id: true, name: true, type: true },
          },
        },
        select: { id: true, name: true },
      },
    },
    select: { id: true, name: true },
  });

  const integrations = await this.prismaService.oAuthIntegration.findMany({
    where: { spaceId },
    select: { provider: true, isEnabled: true },
  });

  // Proxy for automations (Open Question Q1 RESOLVED: no Automation model; use AgentTrigger)
  const agentTriggers = await this.prismaService.agentTrigger.findMany({
    where: { spaceId },
    select: { id: true, name: true, type: true },
  });

  // Proxy for app interfaces (Open Question Q2 RESOLVED: use Plugin model)
  const plugins = await this.prismaService.plugin.findMany({
    where: { spaceId },
    select: { id: true, name: true },
  });

  return { bases, integrations, agentTriggers, plugins };
}
```

### SSE Event Types for Phase 10

New event types to add to `AgentRunEvent`:
```typescript
// Source: [ASSUMED] — extends existing AgentRunEvent from agent-execution.service.ts line 27
export interface UnifiedChatEvent {
  type: 'text' | 'text_chunk' | 'tool_result' | 'proposal' | 'done' | 'error';
  content?: string;           // for text / error
  toolName?: string;          // for tool_result
  toolOutput?: object;        // for tool_result
  proposal?: {                // for proposal
    proposalId: string;
    action: string;           // e.g. 'create_table'
    preview: object;          // rendered by ProposalCard
  };
}
```

### ProposalCard Accept Flow
```typescript
// Source: [ASSUMED] — pattern derived from ChatPanel.tsx streamResponse + D-09 decisions
async function acceptProposal(proposalId: string, conversationId: string, spaceId: string) {
  const res = await fetch(`/api/spaces/${spaceId}/ai/accept-proposal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ proposalId, conversationId }),
  });
  if (!res.ok) throw new Error(`Accept failed: ${res.status}`);
  return res.json();
}
```

### acceptProposal — O(1) lookup via unique column
```typescript
// Use findUnique with the proposalId unique column — NOT findMany + in-memory filter
const message = await this.prismaService.workspaceConversationMessage.findUnique({
  where: { proposalId },
});
if (!message) throw new NotFoundException('Proposal not found');
const meta = message.metadata as { accepted: boolean; acceptedAt: string | null; action: string; args: unknown };
if (meta.accepted) throw new ConflictException('Proposal already accepted');
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Dual Chat/Agent mode toggle | Single unified endpoint with intent routing | Phase 10 | Removes context loss between modes |
| `EventSource` GET for SSE | `fetch` + `ReadableStream` reader for POST SSE | Existing (aiAgentStream pattern) | Supports POST body with message content |
| Tool execution always immediate | Write tools return proposal; read tools execute directly | Phase 10 | Prevents accidental mutations |
| findMany + in-memory filter for proposal lookup | findUnique via proposalId @unique column | Phase 10 | O(1) lookup, eliminates race condition window |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | New `WorkspaceConversation` model preferred over reusing `AgentConversation` with nullable agentId | Architecture Patterns — Pattern 3 | If wrong: migration is simpler but creates nullable FK — planner must choose |
| A2 | Proposal stored in `WorkspaceConversationMessage.metadata` JSON (no separate table) | Architecture Patterns — Pattern 4 | If wrong: a separate `ActionProposal` table with FK provides stronger consistency guarantees |
| A3 | Concurrent accept handled via Prisma JSON path conditional update | Common Pitfalls — Pitfall 3 | If Prisma JSON path filter not supported for this pattern, need app-level lock or separate status column |
| A4 | System prompt injection strategy: summarize tables as `{ id, name, fieldCount }` | Common Pitfalls — Pitfall 5 | Context window limit depends on model; may need more aggressive truncation |
| A5 | `UnifiedChatContainer.tsx` created as separate component (not modifying `ChatContainer.tsx`) | Don't Hand-Roll | If wrong: modifying ChatContainer breaks Agent builder — this is the safer assumption |

---

## Open Questions (RESOLVED)

1. **Automations model — RESOLVED:** No `Automation` model exists in `schema.prisma`. `WorkspaceStateService` will call `prisma.agentTrigger.findMany({ where: { spaceId } })` as a proxy for automations. The system prompt will describe them as "agent triggers / automations" rather than pure "automations." This is a known limitation, acceptable for Phase 10.

2. **App Interfaces model — RESOLVED:** Use `prisma.plugin.findMany({ where: { spaceId } })` as proxy for app interfaces. `PluginPanel` is a panel-level entity inside a table — `Plugin` is the space-level entity. Plugin records are returned in the snapshot under the `plugins` key.

3. **`spaceId` in Next.js pages — RESOLVED:** The `useSpaceId()` hook from `@teable/sdk/hooks/use-space-id` is available. ChatPanel is rendered inside the space layout, so `useSpaceId()` returns the current spaceId without needing to thread props from router or URL params.

---

## Environment Availability

Step 2.6: SKIPPED (no new external dependencies — all required tools/services already in the monorepo and running as part of the existing Teable stack).

---

## Validation Architecture

`workflow.nyquist_validation` not explicitly set — treating as enabled.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest (NestJS) + Playwright (E2E) |
| Config file | Existing — `jest.config.js` per package |
| Quick run command | `pnpm test --filter nestjs-backend -- unified-ai` |
| Full suite command | `pnpm test --filter nestjs-backend` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REQ-D02 | Write tool returns proposal, not executed immediately | unit | `jest unified-ai.service.spec.ts` | ❌ Wave 0 |
| REQ-D03 | Accept proposal executes action once | unit | `jest action-proposal.service.spec.ts` | ❌ Wave 0 |
| REQ-D04 | Workspace snapshot includes bases+tables+fields+agentTriggers+plugins | unit | `jest workspace-state.service.spec.ts` | ❌ Wave 0 |
| REQ-D07 | Conversation message saved after each turn | unit | `jest unified-ai.service.spec.ts` | ❌ Wave 0 |
| REQ-D10 | POST /api/spaces/:spaceId/ai/chat returns SSE stream | integration | `jest unified-ai.controller.spec.ts` | ❌ Wave 0 |

### Wave 0 Gaps

- [ ] `unified-ai.service.spec.ts` — REQ-D02, REQ-D07
- [ ] `action-proposal.service.spec.ts` — REQ-D03
- [ ] `workspace-state.service.spec.ts` — REQ-D04
- [ ] `unified-ai.controller.spec.ts` — REQ-D10

---

## Sources

### Primary (HIGH confidence — verified from codebase)
- `apps/nestjs-backend/src/features/agent/agent-execution.service.ts` — AsyncGenerator/SSE pattern, tool dispatch pattern
- `apps/nestjs-backend/src/features/agent/agent-conversation.service.ts` — conversation persistence API surface
- `apps/nestjs-backend/src/features/agent/agent.controller.ts` — SSE controller pattern (lines 79-93)
- `apps/nestjs-backend/src/features/ai/ai.service.ts` — `generateText` with tools (lines 1370-1378), `streamText` pattern
- `packages/db-main-prisma/prisma/postgres/schema.prisma` — `AgentConversation`, `Space`, `Base`, `TableMeta`, `Field`, `OAuthIntegration` models
- `apps/nextjs-app/src/features/app/components/chat-panel/ChatPanel.tsx` — existing UI to replace, `streamResponse` pattern (lines 78-90)
- `apps/nextjs-app/src/features/app/components/sidebar/useChatPanelStore.ts` — Zustand store pattern, panel state
- `apps/nextjs-app/src/components/AgentChat/ChatContainer.tsx` — reuse candidate

### Secondary (MEDIUM confidence)
- `packages/openapi/src/ai/agent-stream.ts` — confirms `fetch` POST pattern for SSE (not EventSource)
- `apps/nestjs-backend/src/features/space/space.service.ts` — `getBaseListBySpaceId()` available for workspace state

### Tertiary (LOW confidence)
- Proposal concurrent-accept via Prisma JSON path filter — not verified in Prisma docs; treat as [ASSUMED]

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries confirmed in codebase
- Architecture: HIGH — all patterns derived from existing production code
- DB model design: MEDIUM — WorkspaceConversation model is new; structure is sound but migration approach is [ASSUMED]
- Pitfalls: HIGH — derived from reading actual code paths

**Research date:** 2026-05-27
**Valid until:** 2026-06-27 (stable framework, 30-day window)
