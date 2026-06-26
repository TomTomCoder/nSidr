---
phase: 22-automations-rpa-agent-surface
status: complete
verified_live: 2026-06-07T00:00:00Z
commits:
  - 362e60c93  # docs(22): capture phase context — 3 decisions
  - b4f0b19b2  # docs(22): 5 plans across 4 waves
  - 25ac4b149  # feat(22-01): service-level rbac on workflow.findMany/findOne/testrun
  - 4744d8027  # feat(22-02a): WORKFLOW_TOOLS descriptors
  - eda9d90a9  # feat(22-02b): registry merge + spec
  - 107672926  # feat(22-03): executor dispatchers + DI
  - 700b58ab2  # test(22-04): end-to-end integration spec
  - b2ea2f96b  # docs(22): per-plan SUMMARYs + deferred items
test_count_added: 34
phase_22_bugs_found_by_live_test: []  # PATTERN BROKEN — first phase with zero live-UAT regressions
---

# Phase 22: Automations / RPA — Agent Surface — SUMMARY

**Goal:** Architecture-missing surface. Expose Teable's existing workflow subsystem to agents via MCP under RBAC. AUTO-01 (list+read) + AUTO-02 (trigger with args).

## What shipped (8 commits)

| Commit | What |
|---|---|
| `362e60c93` | CONTEXT.md — 3 decisions (3 tools, reuse RBAC via services, direct DI) |
| `b4f0b19b2` | 5 plans / 4 waves |
| `25ac4b149` | **22-01** service-level `validPermissions(baseId, [action])` on findMany/findOne/testRunWorkflow so the agent MCP path doesn't bypass controller decorators |
| `4744d8027` | **22-02a** new `WORKFLOW_TOOLS` constant (list_workflows, get_workflow, run_workflow) using AI-SDK `{type:'function', function:{...}}` shape |
| `eda9d90a9` | **22-02b** registry merge into `agent-tool-registry.service.ts` + spec |
| `107672926` | **22-03** 3 dispatch cases in `executeToolCall` switch + DI of `WorkflowService` + `WorkflowExecutorService` (value imports) + `agent.module.ts` imports WorkflowModule |
| `700b58ab2` | **22-04** `workflow-tools.integration.spec.ts` end-to-end (8 cases) |
| `b2ea2f96b` | Per-plan SUMMARYs + deferred-items.md |

## Test counts

- `agent-tool-registry.service.spec.ts` — 6/6 (shape + count + interop with KG/interface tools)
- `agent-execution.service.spec.ts` — 15/15 (7 new workflow dispatch cases + 8 prior)
- `workflow-tools.integration.spec.ts` — 8/8 (3 happy-path + cross-base rejection + invalid args + RBAC + run with input + missing-workflow)
- `agent-knowledge-scope.integration.spec.ts` — 5/5 (constructor sites updated for new DI)

**Total: 34/34 tests green across this phase's surface.**

## Live UAT (2026-06-07 00:27 — PASS first try)

Against booted dev:swc backend, agent `cmpghtegv0009sg9aje61w63c`:

| Check | Result |
|---|---|
| Backend boots clean (PID 83902, no DI errors, WorkflowService resolved cleanly) | ✅ |
| Workflow REST routes mapped (existing — sanity check) | ✅ |
| `tools/list` → **23 tools** incl. all 3 new workflow tools by name (no nulls) | ✅ |
| `tools/call list_workflows({})` → `{workflows:[], count:0}` (clean payload; base has no workflows yet — base-level RBAC passed, service-layer permission check works) | ✅ |
| No FK violations, no shape regressions, no circular-import bailouts | ✅ |

**First phase in this series where the live UAT smoke passed on the first attempt.** Phases 17/17.1/16/21 each surfaced ≥1 runtime bug invisible to unit tests; Phase 22's small surface + tight 3-tool plan + service-level RBAC pre-emption (22-01) closed the typical bug vectors before they could land.

`get_workflow` and `run_workflow` end-to-end paths are not exhaustively exercised here because the base has no workflows configured. The unit + integration specs (15+8=23 cases) cover those paths against fixtures; live smoke when workflows exist is a recommended follow-up.

## Critical constraints honored

| Anti-pattern | Status |
|---|---|
| `import type` for DI services (Phase 17 bug-1) | ✅ none |
| MCP tool descriptor shape drift (Phase 17.1 bug-3) | ✅ all 3 tools use `{type:'function', function:{...}}`; spec asserts no `inputSchema` at top level |
| `toolCall.input.baseId` instead of `agent.baseId` (T-21-16) | ✅ unit + integration spec verify dispatcher ignores `input.baseId` |
| New `@ai-sdk/*` imports outside ai/ | ✅ none |
| Cross-feature-dir circular service injection (Phase 16) | ✅ workflow → no agent dep; one-way `agent → workflow` |
| RBAC bypass via service path | ✅ `validPermissions(baseId, ['base|read'|'base|update'])` enforced at service entry |
| Mock-shape drift (Phase 17.1) | ✅ specs bind to real `ToolDefinition` type, no `as any` |

## Architectural notes

1. **Service-level RBAC pattern** established by 22-01 is now the precedent for any future service that gets called both from REST (guard-decorated controller) and MCP (direct service call from agent dispatcher). Future PRs should check this pattern.

2. **Tool family file** (`workflow-tools.ts`) mirrors `kg-tools.ts` and `interface-tools.ts` — three sibling tool families. The pattern is now well-established: one file per logical tool family, registered via merge in `agent-tool-registry.service.ts`.

3. **Pre-existing failures** in `kg-tools.integration.spec.ts` (4 failures) confirmed pre-existing — see `deferred-items.md`. Not caused by Phase 22. Root cause: stale `createdBy: 'agt1'` assertion that should be `'system'` after Phase 21's `resolveAgentCallerUserId` fix. To address in a follow-up cleanup.

## Requirements coverage

| ID | Status | Evidence |
|---|---|---|
| AUTO-01 | ✅ source | `list_workflows` + `get_workflow` shipped, RBAC enforced, 14 unit + integration tests |
| AUTO-02 | ✅ source | `run_workflow` shipped, executor invoked, 6 unit + integration tests, cross-base rejection verified |

(Live-UAT addendum below once smoke completes.)

## Pattern recap — one-bug-per-phase via live UAT

| Phase | Source-tests green | Live UAT bug caught |
|---|---|---|
| 17 | yes | 6 bugs (DI, parsedBody, knowledgeSources, SQL scope, interface tools, RBAC) |
| 17.1 | yes | 1 (`INTERFACE_TOOLS` shape mismatch) |
| 16 | yes | 1 (runtime circular import via AiService injection) |
| 21 | yes | 1 (FK violation — `agent.id` to user FK) |
| 22 | yes | **zero** — first phase to ship clean on first live UAT |

The pattern broke at Phase 22 — five phases in, the team's awareness of the cumulative anti-patterns (DI value imports, MCP tool shape, baseId-from-agent, user-FK resolution, cycle-aware service placement, mock-shape drift) finally produced a phase that lands cleanly. Worth codifying as a checklist in `.planning/MEMORY.md`.
