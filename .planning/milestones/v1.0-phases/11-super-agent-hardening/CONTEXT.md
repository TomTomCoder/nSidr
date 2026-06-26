# Phase 11: Super Agent Hardening — Context

**Source:** Post-milestone gap analysis (2026-05-30) of the shipped Super Agent System (Phase 4) and Unified AI Assistant (Phase 10), grounded in the current codebase.

## Problem

The agent system has a complete UI/trigger *surface* (builder, profile panel, cron/mention/record/webhook triggers, ClickUp-style config) but several core paths are built-but-unverified or stubbed. This phase makes the shipped system actually run reliably, securely, and verifiably. No new user-facing surfaces — this is completion + hardening of what exists.

## In scope (acceptance criteria)

### AC1 — Execution proves out end-to-end
- An agent run (`POST /api/agent/:id/run`, trigger=manual) completes a full loop against a real configured model: system+user prompt → LLM → optional tool calls → final text → conversation saved.
- When base AI / AI Gateway config is missing, the run **fails gracefully**: a structured `error` SSE event with an actionable message (no unhandled `getModelConfig` throw mid-stream, no process-level unhandled rejection).
- Evidence: `apps/nestjs-backend/src/features/agent/agent-execution.service.ts` `run()` + `streamLlmIteration()`; `AiService.getModelConfig`/`getModelInstance`.

### AC2 — All agent endpoints are authorized
- Every route in `AgentController` (~20: create, list, get, update, delete, run, tools GET/PATCH, triggers CRUD, memories, conversations, webhook) carries an appropriate guard.
- Reads require `base|read`, writes/exec require `base|create` (mirror `AiController`'s pattern), resolving baseId from the agent.
- The public webhook (`POST :id/webhook`) stays unguarded by design but keeps its `X-Agent-Secret` check.
- Agent access is scoped to the owning base (no cross-base agent access).

### AC3 — Multi-turn conversation context
- A chat run loads prior `AgentConversation` / messages for the active `conversationId` and includes them in the LLM message array, so the agent remembers earlier turns in the same conversation.
- The UI's tracked `conversationId` is threaded through `POST :id/run` so a follow-up message continues the same conversation instead of starting fresh.

### AC4 — DM trigger has a real source
- `agent.dm` is emitted from an actual direct-message/mention-to-agent path (e.g. unified chat addressed to an agent, or a dedicated endpoint), so `AgentEventListener.handleAgentDm` → `AgentTriggerService.handleDm` actually fires.
- If no DM surface exists yet, add a minimal `POST :id/message` endpoint that emits it, so the wired handler is reachable.

### AC5 — Persistent tool/skill state
- On the Compétences section, all built-in tool toggles reflect saved `agentTool` rows on load (today only `web_search` is read; the 8 Teable tools default cosmetically to on).
- Toggling persists and survives reload. `getToolsForAgent` in execution respects the saved enablement.

### AC6 — First regression tests
- `*.spec.ts` covering: trigger CRUD service, the `RecordCreated/RecordUpdated` → `agent.*` projection/listener path, webhook secret auth (200 vs 401), and one execution-loop happy path (mocked model).
- Tests run green in the existing vitest setup.

## Out of scope (deferred)
- Real-AI brainstorm/builder (currently scripted templates) — intentional, keep as-is.
- Agent hub/index page, Activity log view, Sharing UI.
- i18n extraction, responsive/mobile, deleting orphaned legacy files.
- Robust record-CRUD tools (AC7 is a stretch goal only — replace raw `$queryRawUnsafe` JSON access with the real field→column model if time permits).

## Key files (evidence anchors)
- `apps/nestjs-backend/src/features/agent/agent.controller.ts` — endpoints, no `@Permissions` today
- `apps/nestjs-backend/src/features/agent/agent-execution.service.ts` — run loop, one-shot messages
- `apps/nestjs-backend/src/features/agent/agent-trigger.service.ts` — handleMention/handleDm/record handlers
- `apps/nestjs-backend/src/features/agent/agent-event.listener.ts` — `agent.dm` handler with no emitter
- `apps/nestjs-backend/src/features/comment/comment-open-api.service.ts` — only `agent.mention` emitter
- `apps/nestjs-backend/src/features/ai/ai.service.ts` — `getModelConfig` (throws when unconfigured), `AiController` permission pattern
- `apps/nextjs-app/src/components/AgentChat/AgentProfilePanel.tsx` — loads only `web_search` tool state
- `apps/nestjs-backend/src/features/ai/ai.controller.ts` — `@Permissions('base|read'|'base|create')` reference pattern

## Constraints
- No new Prisma models required (reuse `Agent`, `AgentTool`, `AgentTrigger`, `AgentMemory`, `AgentConversation`). Avoid a `db push` unless a column is genuinely missing.
- Match existing NestJS guard/decorator conventions (`@Permissions`, `ClsService` for user id).
- Keep changes backend-weighted; the only frontend change is AC5 (tool-state load) + AC3 (thread conversationId).
