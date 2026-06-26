---
phase: 12-app-stability-test-remediation
plan: "02"
subsystem: agent-module-tests
tags: [testing, vitest, agent, tdd, unit-tests]
dependency_graph:
  requires: []
  provides: [agent-module-regression-coverage]
  affects: [agent-trigger-service, agent-event-listener, agent-controller, agent-execution-service]
tech_stack:
  added: []
  patterns: [direct-construction-with-stubs, vi-fn-mocking, async-generator-for-await]
key_files:
  created:
    - apps/nestjs-backend/src/features/agent/agent-trigger.service.spec.ts
    - apps/nestjs-backend/src/features/agent/agent-event.listener.spec.ts
    - apps/nestjs-backend/src/features/agent/agent.controller.unit.spec.ts
    - apps/nestjs-backend/src/features/agent/agent-execution.service.spec.ts
  modified:
    - apps/nestjs-backend/src/features/agent/agent-trigger.service.ts
    - pnpm-lock.yaml
decisions:
  - Renamed agent.controller.spec.ts to agent.controller.unit.spec.ts to bypass vitest exclude pattern for *.controller.spec.ts files
  - Added listTriggers/createTrigger/toggleTrigger/deleteTrigger CRUD methods to AgentTriggerService (Rule 1: controller called methods that didn't exist)
  - Used direct service construction with vi.fn() stubs following v2-action-trigger.service.spec.ts pattern
  - Stubbed private streamLlmIteration in execution service tests to isolate run loop from LLM
  - Adapted listener tests to actual methods (handleAgentDm + handleAgentMention) — no record.created/updated handlers exist in source
metrics:
  duration: "~15 minutes"
  completed: "2026-05-31"
  tasks_completed: 3
  files_changed: 6
---

# Phase 12 Plan 02: Agent Module Regression Tests Summary

Four Vitest spec files providing first regression coverage for the agent module: trigger CRUD, event dispatch, DM/webhook controller surface, and execution loop happy path + graceful missing-config error.

## What Was Built

18 passing unit tests across 4 spec files, all using direct service construction with vi.fn() stubs (no Nest TestingModule).

**agent-trigger.service.spec.ts** (5 tests):
- createTrigger persists via prisma and returns the result
- listTriggers returns triggers for a given agentId
- deleteTrigger removes by id
- handleDm routes to executionService.run with trigger='dm' and correct agentId
- handleMention routes to executionService.run with trigger='mention'

**agent-event.listener.spec.ts** (3 tests):
- handleAgentDm dispatches agent.dm payload to triggerService.handleDm
- handleAgentDm tolerates missing optional conversationId without throwing
- handleAgentMention dispatches agent.mention payload to triggerService.handleMention

**agent.controller.unit.spec.ts** (5 tests):
- sendMessage emits 'agent.dm' with agentId/message/fromUserId/conversationId
- sendMessage emits without conversationId when not provided
- agentWebhook resolves { received: true } on matching X-Agent-Secret
- agentWebhook throws UnauthorizedException on wrong secret
- agentWebhook throws UnauthorizedException when no trigger found

**agent-execution.service.spec.ts** (5 tests):
- Happy path: yields text event with model content and done event
- Creates new conversation when no conversationId provided
- Loads history when conversationId provided (no createConversation called)
- Yields error event when AI config throws 'AI configuration is not set'
- Yields error event when no model key configured (graceful, not unhandled throw)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added missing CRUD methods to AgentTriggerService**
- **Found during:** Task 1 — reading agent-trigger.service.ts source
- **Issue:** AgentController called `listTriggers`, `createTrigger`, `toggleTrigger`, `deleteTrigger` on AgentTriggerService, but none of these methods existed. Any request to these controller routes would throw a runtime TypeError.
- **Fix:** Added all four CRUD methods to AgentTriggerService using prismaService.agentTrigger calls consistent with the existing upsert pattern.
- **Files modified:** apps/nestjs-backend/src/features/agent/agent-trigger.service.ts
- **Commit:** 5a412dd29

**2. [Rule 3 - Blocking] Renamed controller spec to bypass vitest exclusion**
- **Found during:** Task 2 — running tests
- **Issue:** vitest.config.ts excludes `**/*.controller.spec.ts` from unit test runs. The file `agent.controller.spec.ts` matched this pattern and produced "No test files found".
- **Fix:** Renamed to `agent.controller.unit.spec.ts` which bypasses the exclusion while still covering the same behaviors.
- **Files modified:** File renamed (not a source change)
- **Commit:** 2d42e7501

**3. [Rule 3 - Blocking] Installed pnpm dependencies in worktree**
- **Found during:** Task 1 — attempting to run tests
- **Issue:** The git worktree had no node_modules; pnpm install needed to run before vitest was available.
- **Fix:** Ran `pnpm install --no-frozen-lockfile --prefer-offline` in the worktree root and `pnpm prisma generate --schema prisma/postgres/schema.prisma` in packages/db-main-prisma. Also built @teable/formula package which was required by controller spec imports.
- **Commit:** pnpm-lock.yaml included in first task commit.

**4. [Adaptation] Event listener tests adapted to actual source methods**
- **Found during:** Task 1 — reading agent-event.listener.ts
- **Issue:** Plan expected tests for `record.created` and `record.updated` event handlers, but the actual AgentEventListener only implements `handleAgentDm` (@OnEvent('agent.dm')) and `handleAgentMention` (@OnEvent('agent.mention')). No record event handlers exist.
- **Fix:** Wrote tests for the actual methods that exist per plan instruction "Do not invent methods — only test methods that exist on the real services."

## Known Stubs

None — all tests cover real behavior of the services under test.

## Threat Flags

None — spec files introduce no new network endpoints or security surfaces.

## Self-Check: PASSED

- FOUND: apps/nestjs-backend/src/features/agent/agent-trigger.service.spec.ts
- FOUND: apps/nestjs-backend/src/features/agent/agent-event.listener.spec.ts
- FOUND: apps/nestjs-backend/src/features/agent/agent.controller.unit.spec.ts
- FOUND: apps/nestjs-backend/src/features/agent/agent-execution.service.spec.ts
- FOUND commit: 5a412dd29
- FOUND commit: 2d42e7501
- FOUND commit: 2d8270c54
- 18 tests passing across 4 spec files confirmed
