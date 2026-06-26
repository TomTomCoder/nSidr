---
plan_id: "17-06"
phase: 17-agent-mcp-enhancement
wave: 3
subsystem: agent-memory-testing
tags: [testing, memory, mcp, rbac, vitest, phase-17-closeout]
dependency_graph:
  requires: [17-02, 17-03, 17-04, 17-05]
  provides: [memory-verification, mcp-aggregator-tests, rbac-gating-tests, agent-flow-e2e]
  affects: [agent-memory.service, mcp-client-aggregator.service, interface-tools.service]
tech_stack:
  added: []
  patterns: [vitest-in-process-mcp, inmemory-transport, prisma-stub, permission-matrix-testing]
key_files:
  created:
    - apps/nestjs-backend/src/features/agent/agent-memory.service.spec.ts
    - apps/nestjs-backend/src/features/agent/mcp/mcp-aggregator.integration.spec.ts
    - apps/nestjs-backend/src/features/agent/mcp/rbac-gating.spec.ts
    - apps/nestjs-backend/src/features/agent/mcp/agent-mcp-flow.integration.spec.ts
    - apps/nestjs-backend/test/agent-mcp-flow.e2e-spec.ts
  modified: []
decisions:
  - "In-process integration test placed in src/ (not test/) to avoid vitest-e2e.setup.ts esbuild errors on optional NestJS peer deps"
  - "Live e2e DEFERRED — manual steps documented in agent-mcp-flow.e2e-spec.ts and SUMMARY"
  - "Executor cache test asserts _createTransport called once (during aggregation), not zero times — in-process transport is single-use"
metrics:
  duration: "~25min"
  completed: "2026-06-05T22:45:00Z"
  tasks_completed: 2
  files_created: 5
  tests_added: 38
---

# Phase 17 Plan 06: Memory Verification + Test Coverage Summary

One-liner: 38 new vitest tests locking down AgentMemoryService per-agent isolation (T-17-14), MCP aggregator scoped search, and interface-tool RBAC gating (T-17-15) — all green, no app boot required.

## What Was Built

### Memory Wiring Verification

Confirmed `AgentMemoryService` is fully wired into the execution loop in `agent-execution.service.ts`:
- Line 126: `getRecent(ctx.agentId)` — loads recent memories into the system prompt before LLM call
- Line 127: `getPreferences(ctx.agentId)` — loads user preferences into the system prompt
- Line 238: `saveRecent(ctx.agentId, runSummary)` — persists run summary after each agent run

Memory is scoped by `agentId` in all Prisma queries — no cross-agent leakage is possible at the query level (verified by spec).

### Test Files Created

| File | Tests | Coverage |
|------|-------|----------|
| agent-memory.service.spec.ts | 13 | Per-agent scoping (T-17-14), loop wiring, recall, expiry |
| mcp-aggregator.integration.spec.ts | 6 | Tool merging, namespacing, plugin merge, failing-server skip, cache, scoped search |
| rbac-gating.spec.ts | 14 | Interface tool permission matrix (T-17-09, T-17-15), read≠write, no side-effects |
| agent-mcp-flow.integration.spec.ts | 5 | Turn-over-turn memory recall, cross-agent isolation, preferences, MCP discovery |
| test/agent-mcp-flow.e2e-spec.ts | 1 (pointer) | Documents DEFERRED live e2e steps |

**Total: 38 tests, 4 test files (all green)**

### Key Behaviors Proven

1. **Memory recall**: Agent A saves a fact in turn 1 → `getRecent` returns it in turn 2.
2. **Cross-agent isolation**: Agent B sees 0 memories from Agent A (T-17-14 enforced at DB query level).
3. **MCP aggregator scoped search**: `agentB` only receives servers from the DB where `agentId = 'agentB'`.
4. **RBAC: read ≠ write**: `usr_viewer` (has `app|read`) is denied `run_app_action` (requires `app|update`).
5. **RBAC: no side-effects on denial**: `appBuilderService.renameApp` is NOT called when permission is denied.
6. **Failing server skipped**: One unreachable server does not block healthy server tools from aggregating.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Executor cache test assertion adjusted**
- **Found during:** Task 1 verification
- **Issue:** Test asserted `_createTransport` NOT called by `executeMcpTool`. But `InMemoryTransport.createLinkedPair()` is single-use — once consumed by `getAggregatedTools`, the executor closure holds the already-connected client. The test was asserting `not.toHaveBeenCalled` AFTER the spy was already called once by the initial aggregation.
- **Fix:** Changed assertion to verify `_createTransport` was called exactly once (during aggregation), and that `executeMcpTool` dispatches via the cached executor without error.
- **Files modified:** mcp-aggregator.integration.spec.ts
- **Commit:** 5fa57a842

**2. [Rule 3 - Blocking] In-process e2e placed in src/ instead of test/**
- **Found during:** Task 2 verification
- **Issue:** `vitest-e2e.config.ts` uses esbuild via `vitest-e2e.setup.ts` which bundles the full NestJS app. This fails on optional peer deps (`@nestjs/microservices`, `@nestjs/platform-socket.io`) that are not installed in the memory-constrained environment. Running the test under the e2e config caused a bundle error.
- **Fix:** Canonical in-process test placed at `src/features/agent/mcp/agent-mcp-flow.integration.spec.ts` where the standard vitest unit config picks it up. `test/agent-mcp-flow.e2e-spec.ts` retained as a pointer file + live e2e documentation (DEFERRED).
- **Files modified:** agent-mcp-flow.integration.spec.ts (import paths updated)
- **Commit:** 5fa57a842

## Live E2E: DEFERRED

The live end-to-end test (real NestJS app + real PostgreSQL + real AgentMemoryService) is deferred due to memory constraints. Manual verification steps:

1. `pnpm --filter @teable/nestjs-backend dev:api` (boots on :3002)
2. `POST /api/agent/:agentId/run` with `{ trigger: "manual", triggerPayload: { text: "My name is Alice" } }`
3. Note `conversationId` from response.
4. `POST /api/agent/:agentId/run` with `conversationId` from step 3
5. Assert the response references "Alice" (memory recall from prior turn)
6. `pnpm test-unit` from `apps/nestjs-backend` — all Phase 17 specs should be green

## Pre-existing Failing Specs

Two pre-existing failing specs exist from before Phase 17:
- `agent-execution.service.spec.ts` — pre-existing mock mismatches (unrelated to Phase 17 surface area)
- `agent.controller.unit.spec.ts` — excluded by vitest config (`**/*.controller.spec.ts`)

Neither was introduced by Phase 17 work. They are out-of-scope for this plan and documented here as pre-existing.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 + 2 | 5fa57a842 | test(17-06): add memory verification + MCP aggregator/RBAC unit tests (38 tests green) |

## Self-Check

- [x] agent-memory.service.spec.ts exists: FOUND
- [x] mcp-aggregator.integration.spec.ts exists: FOUND
- [x] rbac-gating.spec.ts exists: FOUND
- [x] agent-mcp-flow.integration.spec.ts exists: FOUND
- [x] test/agent-mcp-flow.e2e-spec.ts exists: FOUND
- [x] Commit 5fa57a842: FOUND

## Self-Check: PASSED

## Known Stubs

None. This plan creates test files only — no production stubs introduced.

## Threat Flags

None. Test files do not introduce new network endpoints or trust boundaries.
