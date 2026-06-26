---
phase: 22-automations-rpa-agent-surface
plan: 02
subsystem: agent-mcp
tags: [mcp, workflow, agent-tools, automation]
status: complete
requires: [22-01]
provides:
  - WORKFLOW_TOOLS constant (3 AI-SDK-shape descriptors)
  - registry merge so agents see list/get/run_workflow
affects: [agent-tool-registry, agent-llm-toolset]
key_files:
  created:
    - apps/nestjs-backend/src/features/agent/mcp/workflow-tools.ts
    - apps/nestjs-backend/src/features/agent/agent-tool-registry.service.spec.ts
  modified:
    - apps/nestjs-backend/src/features/agent/agent-tool-registry.service.ts
metrics:
  tasks_completed: 2
  vitest_files: 1
  vitest_cases: 6
  vitest_pass: 6
  built_in_tool_count_after: 19
---

# Phase 22 Plan 02: Workflow Tool Descriptors + Registry Merge

WORKFLOW_TOOLS exposes 3 AI-SDK-shape MCP tool descriptors (list/get/run_workflow) and is spread into BUILT_IN_TOOLS so agents pick them up via the standard enabled-by-default rule.

## What landed

- **`mcp/workflow-tools.ts`** — Defines `WORKFLOW_TOOLS` array (length 3). Each entry uses `{type:'function', function:{name, description, parameters}}` shape. `list_workflows` has empty parameters (baseId is resolved from agent context per T-21-16 in plan 22-03). `get_workflow` requires `workflowId`. `run_workflow` requires `workflowId` and accepts optional `input` (additionalProperties:true).
- **`agent-tool-registry.service.ts`** — Value import of `WORKFLOW_TOOLS`; spread into `BUILT_IN_TOOLS` array literal so the `web_search`-only opt-in rule does not gate them.
- **`agent-tool-registry.service.spec.ts`** — 6 cases: total built-in count == 19 (16 prior + 3 workflow), all 3 workflow names exposed, AI-SDK shape gate (no top-level `inputSchema`), and per-tool param contracts (no `baseId` on list, `workflowId` required on get/run, optional `input` on run).

## Verification

- `pnpm vitest run src/features/agent/agent-tool-registry.service.spec.ts` → 6/6 green
- Shape gates: `grep -c "type: 'function'" workflow-tools.ts` == 3; `grep -c inputSchema` == 0; `grep -cE "baseId.*type.*string"` == 0
- `grep -E "from '@ai-sdk"` on touched files → 0 (critical_constraint 5)

## Decisions Made

- The plan claimed "20 prior tools → 23 total". The real prior count is 16 (one of the `type: 'function'` greps matched the `ToolDefinition` interface literal). The substantive invariant is "all 3 workflow tools registered with correct shape"; the spec asserts that and the actual post-merge count of 19.

## Deviations from Plan

- **[Spec target adjustment]** Changed the total-count assertion from 23 → 19 to match the real prior count (16). The plan's "20 prior" number was derived from a grep that double-counted an interface declaration; the registry has 16 built-in tool entries before this plan. No behaviour change — the gate is still "exact count, no silent omissions".

## Known Stubs

None.

## Self-Check: PASSED

- `apps/nestjs-backend/src/features/agent/mcp/workflow-tools.ts` — FOUND
- `apps/nestjs-backend/src/features/agent/agent-tool-registry.service.spec.ts` — FOUND
- Commit `4744d8027` — FOUND
- Commit `eda9d90a9` — FOUND
