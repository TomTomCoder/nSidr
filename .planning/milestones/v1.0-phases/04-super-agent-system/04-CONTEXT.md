---
name: Phase 4 Context — Super Agent System
description: Architecture analysis of ClickUp Agent Builder + Teable implementation decisions
type: project
---

# Phase 4: Super Agent System — Context

**Gathered:** 2026-05-12
**Status:** Ready for planning
**Source:** ClickUp Agent Builder screenshots + Agent_Config.md analysis

---

<domain>
## Phase Boundary

This phase delivers a complete Agent Builder system inside Teable EE — allowing users to create named AI agents with configurable instructions, tool access, scheduling triggers, and memory. Modeled on ClickUp's Super Agent system observed in production.

What this phase builds:
- 3-step agent creation wizard (NestJS backend + Next.js UI)
- Agent configuration model (Prisma) — instructions, tools, triggers, memory settings, third-party connections
- 5 built-in Teable tools (table CRUD, search, field filter, record comment, send notification)
- Third-party tool connections — per-agent toggle for: Gmail, Google Calendar, Google Drive, Google Chat, Slack (OAuth2 tokens stored per agent, reuses Phase 6 integration layer)
- Scheduling engine (cron trigger via BullMQ)
- Trigger system (mention + DM + manual invocation)
- Short-term + preference memory per agent
- Streaming reasoning UI (thought chain display)
- Agent execution runtime (reads instructions → selects tools → executes → streams)

</domain>

---

<decisions>
## Implementation Decisions

### 1. Wizard Flow — 3 Locked Steps

Replicate ClickUp's 3-step creation wizard exactly:

| Step | Name | What happens |
|------|------|-------------|
| 1 | Alignement | User describes agent goal in natural language → system proposes domain + capabilities |
| 2 | Personnalisation | User refines: statuses, comment text, trigger frequency, tool selection |
| 3 | Confirmation | Final review → agent created + activated |

**Implementation:** Multi-step React form with state persisted in zustand or React context. Each step is a modal page. Backend creates the agent only at step 3 confirmation.

### 2. Agent Config Modal — 5 Tabs

After creation, agent is configurable via a tabbed modal (observed in screenshots):

| Tab | Content |
|-----|---------|
| Instructions | System prompt textarea + "Auto" model selector |
| Travaux (Tasks) | Scheduling (cron expression), Automated triggers |
| Compétences (Skills) | Tool selection — which of the 5 tools are enabled |
| Connaissance (Knowledge) | Workspace access toggle + external search connections |
| Mémoire (Memory) | Recent (short-term, private) + Preferences (improves with human feedback) |

### 3. Built-in Tool Set — Exactly 5

Matching ClickUp's "5 outils" model. Teable equivalents:

| # | Tool Name | Function |
|---|-----------|---------|
| 1 | `search_records` | Full-text search across all tables in a base |
| 2 | `get_records` | List/filter records from a table with field filters |
| 3 | `get_record` | Read a single record with all fields + linked fields |
| 4 | `create_comment` | Post a comment on a record (or send notification) |
| 5 | `get_record_activity` | Get activity/audit log for a record |

Optional 6th: `send_message` (notify user via Teable notification system).

### 3b. Third-Party Tool Connections — Per-Agent Toggle

Each agent has a **Connaissance → Connexions** section where the admin enables specific third-party integrations. The agent's tool palette expands dynamically based on what's connected.

**Supported integrations (Phase 4 scope):**

| Integration | Tools exposed to agent | Auth |
|-------------|----------------------|------|
| Gmail | `gmail_search`, `gmail_read`, `gmail_send` | OAuth2 per user |
| Google Calendar | `calendar_list_events`, `calendar_create_event` | OAuth2 per user |
| Google Drive | `drive_search`, `drive_read_file` | OAuth2 per user |
| Google Chat | `chat_send_message`, `chat_list_spaces` | OAuth2 per user |
| Slack | `slack_send_message`, `slack_list_channels`, `slack_search` | OAuth2 per workspace |

**Architecture:**
- `AgentConnection` Prisma model: `agentId`, `provider` (gmail/gcal/gdrive/gchat/slack), `encryptedToken`, `scopes`, `isEnabled`
- Token stored encrypted (AES-256) — reuses Phase 6 OAuth2 infrastructure if available, else standalone
- At runtime: `AgentToolRegistry` loads enabled connections → injects their tools into the LLM tool definitions alongside the 5 built-in tools
- The agent's system prompt automatically lists which external tools are available
- **Dependency note:** Phase 6 builds the full OAuth2 integration library. Phase 4 builds a lightweight version sufficient for agent tool use — Phase 6 can upgrade the token layer without changing Phase 4's agent runtime.

**Phase 4 OAuth scope:** `AgentOAuthService.handleCallback()` stores the auth code as a placeholder encrypted token — full PKCE token exchange with `client_secret` is deferred to Phase 6. `AgentConnection` should eventually gain `integrationId String?` FK pointing to Phase 6's `OAuthIntegration` model; Phase 4 leaves this column absent and Phase 6 adds it via migration.

**UI — "Ajouter une connexion" flow:**
1. Admin clicks "Ajouter une connexion" in agent config → integration picker modal
2. Selects provider → OAuth2 redirect → token stored against `AgentConnection`
3. Toggle per integration to enable/disable without revoking OAuth
4. Agent config panel shows each connection with status badge (Connected/Disconnected)

### 4. Trigger System — 3 Types

From ClickUp screenshots (Travaux tab):
- **Manuel** (2 sub-types):
  - Mention — agent triggered when @mentioned on a record
  - Message privé — agent triggered by direct chat
- **Planifié** — cron-based (e.g., daily at 8:00 AM)
- **Automatisé** — event-based (record updated, status changed) — powered by existing Teable workflow/automation engine

### 5. Memory Architecture

Two memory modes (from ClickUp Mémoire tab):
- **Récent (short-term)** — private, ephemeral session context. Stores last N interactions. Not shared.
- **Préférences** — improves when humans give directives. Persisted as key-value pairs per agent.

Teable implementation: store in `AgentMemory` Prisma table with `type` enum (recent/preference) and TTL for recent memories.

### 6. Agent Instructions = PromptService Integration

Agent `instructions` field feeds directly into PromptService (Phase 2). Each agent gets its own prompt key: `agent:{agentId}.system`. The PromptService 3-tier lookup applies: agent-specific → global override → hardcoded default.

This is the key cross-phase dependency on Phase 2.

### 7. Streaming Reasoning UI

ClickUp shows a thought chain during execution:
- "Réveil du héros"
- "Analyse des exigences"
- "Connexion aux listes inactives"
- "Sélection des outils de surveillance"

Teable implementation: use existing NDJSON streaming infrastructure from `ai.controller.ts` (already has `think`, `tool`, `progress` event types). Add a `<AgentThinkingStream />` React component that renders the chain as a live bulleted list.

### 8. Agent Visibility — Public/Private

From ClickUp: agents can be "Public — Géré par Tommy Lambert et admin".

Teable: `isPublic` boolean on the Agent model. Public agents are accessible to all workspace members. Private agents only to the creator and admins.

### 9. Agent Execution Runtime

The agent runtime loop:
1. Receive trigger (cron/mention/DM)
2. Load agent instructions + memory context
3. Stream to LLM via PromptService.get() with tool definitions
4. Parse tool calls → execute against Teable API
5. Loop until no more tool calls or max iterations
6. Save result to memory (recent type)
7. Post output (comment/notification/DM)

Use existing `ai.service.ts` agentic pattern (already has tool-use loop from Phase 0 work).

### Claude's Discretion

- Max iterations per execution run (suggest: 10)
- BullMQ queue name for agent jobs
- Memory TTL for "recent" type (suggest: 7 days)
- Max agents per workspace (suggest: 20 for EE)
- Rate limiting on manual triggers

</decisions>

---

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing AI Infrastructure (Phase 2 output)
- `apps/nestjs-backend/src/features/ai/ai.service.ts` — Existing agentic tool-use loop pattern to reuse
- `apps/nestjs-backend/src/features/ai/prompt.service.ts` — PromptService to integrate for agent instructions
- `apps/nestjs-backend/src/features/ai/ai.module.ts` — Module to extend

### Existing Automation Infrastructure
- `apps/nestjs-backend/src/features/workflow/workflow.service.ts` — Trigger/event system to hook into for "Automatisé" triggers
- `apps/nestjs-backend/src/features/workflow/workflow.module.ts`

### Frontend Patterns
- `apps/nextjs-app/src/features/app/components/chat-panel/ChatPanel.tsx` — Existing streaming chat UI pattern
- `apps/nextjs-app/src/features/app/blocks/admin/setting/components/ai-config/` — Admin config UI patterns

### DB Schema
- `packages/db-main-prisma/prisma/postgres/schema.prisma` — Add Agent, AgentTool, AgentTrigger, AgentMemory models here

### OpenAPI
- `packages/openapi/src/ai/index.ts` — Add agent endpoints here

### Reference Implementation (external)
- `/Users/tommylambert/Desktop/Agent_Config_Optimized.md` — Optimized agent instructions example (use as test data for the agent builder)

</canonical_refs>

---

<specifics>
## Specific Ideas from ClickUp Analysis

### Wizard UX Details (from screenshots)
- Step 1 shows domain tags as pills ("Gestion de projet" selected)
- Left pane = conversational wizard, right pane = live agent preview
- The agent has an avatar (auto-generated wireframe face in screenshots)
- Progress shown as "ÉTAPE 1 SUR 3" in top-right
- Agent builder has a gallery of template agents: Task Creator, Project Planner, Status Manager, Onboarding Guide — plus category filters (Applications, Projets, Personnel, Certifié, Tâches, Direction, etc.)

### Agent Config Tab Details
- Instructions tab has an "Auto" model selector (dropdown for LLM selection — integrates with Teable's existing AI provider system)
- Travaux tab shows scheduling with "Chaque jour at 8:00 AM" cron, plus "Ajouter une automatisation" button
- Skills tab shows "5 outils" with expandable ClickUp tool list — "Ajouter des outils" button for future expansion
- Knowledge tab has workspace toggle + external search (web search toggle) + "Ajouter une connexion" for custom knowledge bases
- Memory tab has "Voir les souvenirs" button to inspect agent's stored memories

### Test Agent Config (from Agent_Config.md)
The "Tâches Inactives – Priorités de Tommy" agent demonstrates the full capability set:
- Scheduled daily scan
- 2 manual triggers (mention + DM)
- 5 tools used in a specific sequence (search → filter → get_detail → comment → message)
- Edge case handling (deduplication, error tolerance)
- Bilingual-capable but French-first tone

This should be used as the integration test scenario for Phase 4.

</specifics>

---

<deferred>
## Deferred Ideas

- Agent marketplace / sharing between workspaces (v2)
- Agent-to-agent communication (chaining)
- Custom tool plugins (user-defined HTTP tools)
- Agent performance analytics dashboard
- Mobile push notifications as agent output channel

</deferred>

---

<testing>
## Testing Strategy

### Gate rule
`npx vitest run` + `npx tsc --noEmit` before each wave. Wave 4 (non-autonomous) requires human verification + Playwright E2E.

### Unit Tests (Vitest)
- `agent-memory.service.spec.ts` — test 7-day TTL on `saveRecent`; test `getRecent` excludes expired rows; test `setPreference` upsert; test `getPreferences` returns key-value map
- `agent-execution.service.spec.ts` — mock `AiService.getModelInstance` + `generateText`; test 3-tier `PromptService.get()` call for `agent:{id}.system` key; test tool dispatch routes to correct handler; test max iterations respected
- `agent-trigger.service.spec.ts` — test `handleMention` dispatches run context with `trigger: 'mention'`; test `handleDm` dispatches with `trigger: 'dm'`
- `agent-scheduler.service.spec.ts` — mock `@InjectQueue`; test `scheduleCron` calls `queue.add` with repeat pattern; test `loadActiveCronTriggers` only schedules `isActive: true` triggers
- `agent-oauth.service.spec.ts` — test `getAuthUrl` builds correct URL with PKCE state; test `handleCallback` encrypts and stores token

### Integration Tests (Vitest + test DB)
- `POST /api/agent` → 201 with agent id
- `GET /api/agent/:id` → 200 with instructions + tools
- `POST /api/agent/:id/run` (manual trigger) → SSE stream with at least one `progress` event and final `done` event
- Agent with cron trigger → `AgentSchedulerService.onModuleInit` schedules job in BullMQ queue

### E2E Tests (Playwright — Wave 4 checkpoint)
- 3-step wizard: complete all steps → agent created → appears in agent list
- Open agent config → Instructions tab → edit system prompt → save → reload → verify persisted
- Travaux tab → add cron trigger → verify cron expression saved
- Knowledge tab → click "Connect Gmail" → OAuth popup → simulate token store → badge shows "Connected"

### Integration Test Scenario (from Agent_Config.md)
Use "Tâches Inactives – Priorités de Tommy" agent config:
- 5-tool sequence: `search_records` → `get_records` → `get_record` → `create_comment` → `send_message`
- Verify all 5 tools execute in a single `run()` call with mocked LLM responses

### What NOT to test
- Actual LLM responses (always mocked in unit/integration tests)
- BullMQ Redis connection (infrastructure)
- Phase 6 OAuth token exchange (tested in Phase 6)
</testing>

*Phase: 04-super-agent-system*
*Context gathered: 2026-05-12 via ClickUp Agent Builder analysis + Agent_Config.md (testing added 2026-05-15)*
