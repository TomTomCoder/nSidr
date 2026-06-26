---
phase: 22-automations-rpa-agent-surface
plan: 03
subsystem: agent-mcp
tags: [agent-dispatch, workflow, rpa, security]
status: complete
requires: [22-01, 22-02]
provides:
  - 3 workflow dispatchers in AgentExecutionService.executeToolCall
  - WorkflowService + WorkflowExecutorService DI in agent module
affects: [agent-execution, agent-module]
key_files:
  modified:
    - apps/nestjs-backend/src/features/agent/agent-execution.service.ts
    - apps/nestjs-backend/src/features/agent/agent.module.ts
    - apps/nestjs-backend/src/features/agent/agent-execution.service.spec.ts
    - apps/nestjs-backend/src/features/agent/mcp/kg-tools.integration.spec.ts
    - apps/nestjs-backend/src/features/agent/mcp/agent-knowledge-scope.integration.spec.ts
metrics:
  tasks_completed: 1
  vitest_files: 1
  vitest_cases_new: 7
  vitest_pass: 15
  grep_gates: 4
---

# Phase 22 Plan 03: Workflow Dispatcher Wiring

`AgentExecutionService.executeToolCall` now dispatches `list_workflows`, `get_workflow`, and `run_workflow` to the hardened service layer from plan 22-01. All three resolve `baseId` from `agent.baseId` and never from `toolCall.input`.

## What landed

- **Value imports**: `WorkflowService`, `WorkflowExecutorService` injected via constructor (no `import type` — critical_constraint 1).
- **3 dispatchers**: `list_workflows` calls `findMany(agent.baseId)`; `get_workflow` calls `findOne(agent.baseId, workflowId)` and returns `{error, toolName}` envelope on miss; `run_workflow` pre-checks via `findOne` then calls `testRunWorkflow` (cross-base attempts never reach the executor).
- **`agent.module.ts`** imports `WorkflowModule` so DI resolves at boot.
- **Spec**: 7 new vitest cases in `agent-execution.service.spec.ts` (15 total in the file, 15/15 green): findMany scoping, input.baseId defense-in-depth, get/run typed-error envelopes, run pass-through of `input`, dispatcher error wrapping.
- **Ctor-site updates**: 2 sibling specs (`kg-tools.integration.spec.ts`, `agent-knowledge-scope.integration.spec.ts`) now pass the 2 new ctor args.

## Verification

- `pnpm vitest run agent-execution.service.spec.ts` → 15/15 green
- Grep gates:
  - `^import type.*Workflow(Service|ExecutorService)` → 0 ✓
  - `toolCall\.input.*baseId|input\.baseId` → 0 ✓ (T-21-16)
  - `agent\.baseId` occurrences → 14 (≥3) ✓
  - `from '@ai-sdk` → 0 ✓ (critical_constraint 5)

## Decisions Made

- **Pre-check existence before run**: `run_workflow` calls `findOne` first and returns a typed-error envelope if the workflowId is not in the agent's base. Without this, the service layer would throw `"Workflow not found"` and the catch-all wrapper would produce a generic `{error, toolName}`. The pre-check guarantees no side-effects on cross-base attempts and gives a consistent envelope shape.
- **`input` pass-through is a no-op today**: `WorkflowService.testRunWorkflow` doesn't accept a per-run input arg. The dispatcher accepts the field on the wire so the contract is stable, but the executor still uses mock trigger data. Flagged for 22-05 UAT follow-up.

## Deviations from Plan

None for the dispatcher logic. Two scope-boundary items:

1. **[Out of scope]** 4 pre-existing failures in `kg-tools.integration.spec.ts` documented in `deferred-items.md`. Confirmed pre-existing by stashing my changes and re-running against the prior tip. My ctor change adds 2 stub args; it does not touch any KG behaviour.
2. **[Deviation Rule 3]** Updated `agent-knowledge-scope.integration.spec.ts` ctor site (added 4 missing args including 2 new workflow ones). This spec was constructed with only 17 args originally; it relied on JS positional-arg permissiveness. My change makes the ctor call explicit. 5/5 cases still green.

## Known Stubs

- `run_workflow`'s `input` field is accepted but not forwarded to the executor. Documented in the descriptor and tracked for 22-05.

## Self-Check: PASSED

- `agent-execution.service.ts` — FOUND (has 3 new cases)
- `agent.module.ts` — FOUND (WorkflowModule imported)
- `agent-execution.service.spec.ts` — FOUND (7 new tests)
- `deferred-items.md` — FOUND
- Commit `107672926` — FOUND
