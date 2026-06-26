---
phase: 15-ai-provider-gateway
plan: "05"
subsystem: ai-gateway
tags: [ai, gateway, agent-execution, retrofit, phase-exit-guard]
dependency_graph:
  requires: ["15-01", "15-02", "15-04"]
  provides: [agent-execution-gateway-routed, phase-exit-guard-green]
  affects:
    - apps/nestjs-backend/src/features/agent/agent-execution.service.spec.ts
tech_stack:
  added: []
  patterns: [gateway-injection, getModelInstance-routing, AI_SERVICE-token-injection]
key_files:
  created: []
  modified:
    - apps/nestjs-backend/src/features/agent/agent-execution.service.spec.ts
decisions:
  - "agent-execution.service.ts was already fully retrofitted (streamLlmIteration uses aiService.getModelInstance — no @ai-sdk/ imports present); Task 1 added gateway routing tests only"
  - "Phase-exit guard (scripts/check-no-direct-ai-sdk.sh) exits 0 GREEN — all provider SDK construction is confined to features/ai/"
  - "Pre-existing test failures in 5 spec files (workspace-state, action-proposal, unified-ai, kg-tools.integration, agent.controller.unit) are on main branch and not caused by phase 15"
metrics:
  duration: "~25 minutes"
  completed: "2026-06-07T00:00:00Z"
  tasks_completed: 2
  files_modified: 1
---

# Phase 15 Plan 05: agent-execution.service Gateway Retrofit + Phase-Exit Guard Summary

Agent-execution.service was already retrofitted through the gateway (streamLlmIteration uses aiService.getModelInstance). Added Phase 15-05 gateway routing unit tests and confirmed phase-exit grep guard exits GREEN — provider SDK construction is fully confined to features/ai/.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Retrofit agent-execution + routing tests | 1c03dad47 | agent-execution.service.spec.ts |
| 2 | [BLOCKING] Phase-exit guard GREEN | (verification only) | scripts/check-no-direct-ai-sdk.sh |

## Key Finding: Pre-Retrofitted File

`agent-execution.service.ts` was already correct at the base commit (`5d76a14`):
- No `@ai-sdk/` imports
- No `createOpenAI` / `createGateway` calls
- `streamLlmIteration` uses `this.aiService.getModelInstance(resolvedModelKey, aiConfig.llmProviders)`
- `AiService` injected via `AI_SERVICE` token (value import — DI metadata preserved, Phase 17 bug-1 avoided)

## Verification Results

### grep gate
```
grep -c "@ai-sdk/|createOpenAI|createGateway" agent-execution.service.ts → 0  PASS
bash scripts/check-no-direct-ai-sdk.sh → OK  GUARD_PASS
```

### Test results
```
17/17 tests GREEN (agent-execution.service.spec.ts):
  - yields a text event and a done event when the model responds ✓
  - creates a new conversation when no conversationId provided ✓
  - loads conversation history when conversationId is provided ✓
  - yields error event when AI config throws ✓
  - yields error event when no model key configured ✓
  - search_knowledge_base: no scope when knowledgeSources null ✓
  - search_knowledge_base: passes folderIds scope ✓
  - list_workflows calls workflowService.findMany(agent.baseId) ✓
  - list_workflows IGNORES toolCall.input.baseId (T-21-16) ✓
  - get_workflow returns full record ✓
  - get_workflow returns typed error for cross-base/missing ✓
  - run_workflow returns envelope for valid workflowId ✓
  - run_workflow rejects cross-base with typed error ✓
  - run_workflow accepts `input` arg without crashing ✓
  - wraps dispatcher errors as {error, toolName} envelope ✓
  - [Phase 15-05] routes model construction through getModelInstance ✓
  - [Phase 15-05] uses aiConfig.chatModel.lg as fallback when null ✓
```

Pre-existing failures in 5 spec files (workspace-state, action-proposal, unified-ai, kg-tools.integration, agent.controller.unit) confirmed identical on main branch — not caused by phase 15.

## Phase-Exit Guard Status

```
bash scripts/check-no-direct-ai-sdk.sh
OK: No direct AI SDK imports outside apps/nestjs-backend/src/features/ai/
```

**Success criterion 5 MET:** No provider SDK imports outside the gateway module.

## Deviations from Plan

### Auto-detected (not a deviation — informational)

**[No Rule required] agent-execution.service.ts already retrofitted**
- **Found during:** Task 1 read-first
- **Status:** File already used `aiService.getModelInstance` in `streamLlmIteration` with no direct `@ai-sdk/` imports
- **Action:** Skipped the retrofit (nothing to change); added the gateway routing tests as specified

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Package node_modules symlinks for worktree test runner**
- **Found during:** Task 1 verification
- **Issue:** Worktree had no node_modules; vitest could not resolve package imports
- **Fix:** Symlinked nestjs-backend, root, all packages (core, formula, openapi, sdk, etc.) and v2 packages' node_modules from main repo to worktree
- **Impact:** Non-code fix; symlinks are in node_modules/ which is gitignored

**2. [Rule 3 - Blocking] Worktree HEAD behind base commit**
- **Found during:** Initial setup
- **Issue:** Worktree branch was at commit 43f2e7e40 (before agent feature), not at base 5d76a14
- **Fix:** `git reset --hard 5d76a14182d1429a6ca996918bd42e10b1ac4298` to correct the starting point
- **Impact:** Non-code fix; worktree now correctly reflects base commit with agent directory present

**3. [Rule 1 - Bug] Spec used stub over real streamLlmIteration**
- **Found during:** Task 1 test authoring — buildService() always stubs streamLlmIteration
- **Fix:** New gateway routing tests restore prototype method before calling, ensuring real implementation is tested
- **Commit:** 1c03dad47

## Threat Surface Scan

No new network endpoints, auth paths, or schema changes introduced. T-15-06 mitigated: createGateway / @ai-sdk/ are fully confined to features/ai/; grep guard exits 0. T-15-07 mitigated: AiService injected via value import (no `import type`), DI metadata preserved.

## Known Stubs

None. All routing is live gateway logic.

## Self-Check: PASSED

- [x] Commit 1c03dad47 exists
- [x] `grep -c "@ai-sdk/|createOpenAI|createGateway" agent-execution.service.ts` → 0
- [x] 17/17 agent-execution.service.spec.ts tests GREEN
- [x] `bash scripts/check-no-direct-ai-sdk.sh` → OK (GUARD_PASS)
- [x] No STATE.md / ROADMAP.md modified
