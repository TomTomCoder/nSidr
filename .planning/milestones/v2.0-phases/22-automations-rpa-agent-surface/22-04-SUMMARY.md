---
phase: 22-automations-rpa-agent-surface
plan: 04
subsystem: agent-mcp
tags: [integration-test, workflow, mcp, security-regression]
status: complete
requires: [22-02, 22-03]
provides:
  - End-to-end integration regression for 3 workflow tools
affects: [test-coverage]
key_files:
  created:
    - apps/nestjs-backend/src/features/agent/mcp/workflow-tools.integration.spec.ts
metrics:
  tasks_completed: 1
  vitest_files: 1
  vitest_cases: 8
  vitest_pass: 8
---

# Phase 22 Plan 04: Workflow Tools End-to-End Spec

Integration spec mirrors `kg-tools.integration.spec.ts`. Builds the real `AgentToolRegistryService` and `AgentExecutionService` and wires fake `WorkflowService` + `WorkflowExecutorService` that enforce cross-base isolation deterministically.

## What landed

- **`workflow-tools.integration.spec.ts`** — 8 cases:
  1. `tools/list` exposes list/get/run_workflow (count == 19)
  2. `list_workflows` returns base-A workflows (count == 2)
  3. `list_workflows` ignores `input.baseId='base-B'` — only called with `'base-A'`
  4. `get_workflow` returns full record for `wf-1`
  5. `get_workflow` returns `{error,toolName}` envelope for cross-base `wf-X`
  6. `run_workflow` returns canned `{status,trigger,steps}` envelope
  7. `run_workflow` rejects cross-base `wf-X` with typed error AND `testRunWorkflow` is never called
  8. `run_workflow` accepts optional `input` arg (pass-through)

## Verification

- `pnpm vitest run workflow-tools.integration.spec.ts` → 8/8 green
- Critical invariants asserted: T-21-16 baseId hardening (cases 3,5,7), executor never fires on cross-base (case 7)

## Decisions Made

- Built the spec against the real `AgentToolRegistryService` (not a stub) so the registry-merge wiring from plan 22-02 is exercised end-to-end. Case 1 would have caught any silent omission from BUILT_IN_TOOLS.

## Deviations from Plan

None.

## Known Stubs

- `run_workflow` `input` field still pass-through (inherited from 22-03 / 22-05 follow-up).

## Self-Check: PASSED

- `apps/nestjs-backend/src/features/agent/mcp/workflow-tools.integration.spec.ts` — FOUND
- Commit `700b58ab2` — FOUND
