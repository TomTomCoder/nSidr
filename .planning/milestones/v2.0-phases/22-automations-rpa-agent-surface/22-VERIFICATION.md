---
phase: 22-automations-rpa-agent-surface
verified: 2026-06-07T12:00:00Z
status: human_needed
score: 11/12
overrides_applied: 0
human_verification:
  - test: "MCP tools/list returns 23 tools (incl. all 3 workflow tools) against a live running backend with real workflows in the agent's base"
    expected: "All 3 new tool names (list_workflows, get_workflow, run_workflow) present in tools/list response; count = 23"
    why_human: "The SUMMARY records a live-UAT result of {workflows:[], count:0} because the test base had no workflows. The run_workflow and get_workflow end-to-end paths were NOT exercised against real workflow records. A human must create a workflow and re-run steps 4-9 of the UAT smoke."
  - test: "MCP tools/call run_workflow with a real workflow returns {status, trigger, steps} envelope"
    expected: "Non-empty steps array with at-least-one step result"
    why_human: "Live test was skipped for this case per SUMMARY: 'get_workflow and run_workflow end-to-end paths are not exhaustively exercised here because the base has no workflows configured'"
---

# Phase 22: Automations / RPA — Agent Surface — Verification Report

**Phase Goal:** Expose Teable's workflow subsystem to agents via MCP under RBAC — AUTO-01 (list + read) + AUTO-02 (trigger with args).
**Verified:** 2026-06-07T12:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | WorkflowModule exports both WorkflowService and WorkflowExecutorService | VERIFIED | `workflow.module.ts` line 12: `exports: [WorkflowService, WorkflowExecutorService]` |
| 2 | WorkflowService.findMany/findOne/testRunWorkflow enforce service-level RBAC | VERIFIED | `workflow.service.ts` lines 37-39: `assertPermission(baseId, action)` called at entry of all three methods via `permissionService.validPermissions` |
| 3 | Cross-base reads reject with permission error before touching executor | VERIFIED | `findOne` uses `where: { id: workflowId, baseId }` — cross-base workflowId returns null; RBAC fires first |
| 4 | WORKFLOW_TOOLS constant exists with 3 entries (list_workflows, get_workflow, run_workflow) | VERIFIED | `workflow-tools.ts` lines 35-84: 3 entries, all using `{type:'function', function:{...}}` shape |
| 5 | No entry uses `inputSchema` at top level (Phase 17.1 bug-3 mitigation) | VERIFIED | `grep -c "inputSchema" workflow-tools.ts` = 0 |
| 6 | list_workflows has no baseId parameter in schema (T-21-16 mitigation) | VERIFIED | `workflow-tools.ts` line 46: `properties: {}` — no baseId field |
| 7 | agent-tool-registry merges WORKFLOW_TOOLS — total 23 tools (20 + 3) | VERIFIED | `agent-tool-registry.service.ts` line 311: `...WORKFLOW_TOOLS` spread into BUILT_IN_TOOLS; import at line 4 |
| 8 | executeToolCall handles list_workflows, get_workflow, run_workflow | VERIFIED | `agent-execution.service.ts` lines 781, 787, 800: three switch cases confirmed |
| 9 | All dispatchers resolve baseId from agent.baseId, never from toolCall.input | VERIFIED | `grep -n "toolCall.input.*baseId" agent-execution.service.ts` = 0; grep for `agent.baseId` shows >=3 hits in dispatcher region |
| 10 | WorkflowModule imported into agent.module.ts | VERIFIED | `agent.module.ts` line 11 (import) + line 46 (imports array) |
| 11 | Value imports (not `import type`) for WorkflowService/WorkflowExecutorService | VERIFIED | Lines 27-28 of `agent-execution.service.ts`: plain `import { WorkflowService }` — type-only count = 0 |
| 12 | Live MCP run_workflow + get_workflow tested against real workflow records | UNCERTAIN | SUMMARY records tools/call list_workflows returned `{workflows:[], count:0}` (empty base). No workflow records were available; steps 6-9 of UAT smoke were not exercised against real data. |

**Score:** 11/12 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/nestjs-backend/src/features/workflow/workflow.service.ts` | Service-level RBAC on findMany/findOne/testRunWorkflow | VERIFIED | PermissionService injected; assertPermission called at each method entry |
| `apps/nestjs-backend/src/features/workflow/workflow.module.ts` | Exports WorkflowService + WorkflowExecutorService | VERIFIED | `exports: [WorkflowService, WorkflowExecutorService]` confirmed |
| `apps/nestjs-backend/src/features/agent/mcp/workflow-tools.ts` | WORKFLOW_TOOLS with 3 AI-SDK-shape descriptors | VERIFIED | 3 entries, correct shape, no inputSchema, no baseId in list_workflows |
| `apps/nestjs-backend/src/features/agent/agent-tool-registry.service.ts` | Merges WORKFLOW_TOOLS into tool list | VERIFIED | Import + spread confirmed; no `@ai-sdk` imports |
| `apps/nestjs-backend/src/features/agent/agent-execution.service.ts` | 3 dispatch cases + WorkflowService/WorkflowExecutorService injection | VERIFIED | Value imports at lines 27-28; constructor params at lines 77-78; cases at 781/787/800 |
| `apps/nestjs-backend/src/features/agent/agent.module.ts` | Imports WorkflowModule | VERIFIED | Line 11 import + line 46 in imports array |
| `apps/nestjs-backend/src/features/agent/mcp/workflow-tools.integration.spec.ts` | End-to-end integration suite 6-8 cases | VERIFIED | File exists with 8 cases covering list/get/run + cross-base rejection + defense-in-depth |
| `.planning/REQUIREMENTS.md` | AUTO-01 + AUTO-02 marked complete | VERIFIED | Lines 39-40: both marked `[x]` with descriptions and RBAC evidence |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| agent-tool-registry.service.ts | workflow-tools.ts | `import { WORKFLOW_TOOLS }` | VERIFIED | Line 4 of registry file |
| agent-execution.service.ts | WorkflowService | constructor injection (value import) | VERIFIED | Line 27 import; line 77 constructor param |
| agent.module.ts | WorkflowModule | `imports: [WorkflowModule]` | VERIFIED | Lines 11 + 46 confirmed |
| workflow.service.ts | PermissionService | constructor injection | VERIFIED | Line 7 import; line 24 constructor param; `assertPermission` calls at findMany/findOne/testRunWorkflow |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|--------------------|--------|
| agent-execution.service.ts `list_workflows` case | workflows array | `workflowService.findMany(agent.baseId)` → Prisma `workflow.findMany` | Yes (DB query via PrismaService in WorkflowService) | FLOWING |
| agent-execution.service.ts `get_workflow` case | workflow record | `workflowService.findOne(agent.baseId, workflowId)` → Prisma `workflow.findFirst` | Yes | FLOWING |
| agent-execution.service.ts `run_workflow` case | step result | `workflowService.testRunWorkflow(agent.baseId, workflowId)` | Depends on WorkflowExecutorService — unit/integration tests pass; live test with empty base | FLOWING (unit-verified) |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| workflow-tools.ts has 3 `type: 'function'` entries | `grep -c "type: 'function'" workflow-tools.ts` | 3 | PASS |
| No `inputSchema` at top level in workflow-tools.ts | `grep -c "inputSchema" workflow-tools.ts` | 0 | PASS |
| No `import type` for DI services in agent-execution.service.ts | `grep -n "^import type.*WorkflowService" agent-execution.service.ts` | 0 | PASS |
| No toolCall.input.baseId usage in dispatcher | `grep -n "toolCall.input.*baseId" agent-execution.service.ts` | 0 | PASS |
| WorkflowModule in agent.module.ts imports | `grep -n "WorkflowModule" agent.module.ts` | 2 hits (import + imports array) | PASS |
| AUTO-01 + AUTO-02 in REQUIREMENTS.md | `grep -cE "AUTO-0[12].*✅\|AUTO-0[12].*\[x\]" REQUIREMENTS.md` | 2 | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| AUTO-01 | 22-01, 22-02, 22-03, 22-04 | List and read workflows via MCP with RBAC | SATISFIED | `list_workflows` + `get_workflow` tools implemented, RBAC enforced, 14 unit+integration tests |
| AUTO-02 | 22-01, 22-02, 22-03, 22-04 | Trigger workflow with args via MCP; cross-base rejected | SATISFIED | `run_workflow` tool implemented; cross-base typed-error envelope verified in integration spec |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| workflow-tools.integration.spec.ts | 32 | `import type { WorkflowService }` | Info | This is a TEST file — `import type` for mocked/faked services in specs is acceptable and correct (no DI happening here) |

No TBD/FIXME/XXX markers found in phase-modified files. No stub returns. No hardcoded-empty renders.

### Human Verification Required

#### 1. Live run_workflow and get_workflow against real workflow records

**Test:** Create at least one workflow in the agent's base via the Teable UI. Then:
1. `tools/call get_workflow` with `{workflowId: "<real-id>"}` — expect full record with config returned
2. `tools/call get_workflow` with `{workflowId: "<id-from-other-base>"}` — expect typed error envelope, not data
3. `tools/call run_workflow` with `{workflowId: "<real-id>"}` — expect `{status, trigger, steps}` with non-empty steps
4. `tools/call run_workflow` with cross-base workflowId — expect typed error envelope

**Expected:** All 4 checks pass; no DI errors, no FK violations, no silent data leakage.

**Why human:** The SUMMARY explicitly documents this gap: *"get_workflow and run_workflow end-to-end paths are not exhaustively exercised here because the base has no workflows configured."* The live UAT only verified `list_workflows` against an empty base (returned `{workflows:[], count:0}`). The unit + integration specs cover these paths against fakes, but live execution with real Prisma + real WorkflowExecutorService is unverified.

### Gaps Summary

No blocking gaps. The sole unresolved item is a human UAT gap: the live MCP smoke for `get_workflow` and `run_workflow` was conducted against an empty base, so the real-data paths (Prisma reads + executor invocation) were not exercised end-to-end in a live boot. The integration spec covers these paths with deterministic fakes (8 cases green). The risk is low but the UAT gate specified in the 22-05 plan was not fully satisfied.

---

_Verified: 2026-06-07T12:00:00Z_
_Verifier: Claude (gsd-verifier)_
