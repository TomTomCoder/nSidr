---
phase: 24-agent-runtime-hardening
plan: "03"
subsystem: agent
tags: [guardrail, validation, update-record, tdd]
dependency_graph:
  requires: [24-02]
  provides: [GuardrailService, update_record tool]
  affects: [agent-execution.service.ts, agent.module.ts]
tech_stack:
  added: []
  patterns: [guardrail-before-write, structured-tool-result-on-failure]
key_files:
  created:
    - apps/nestjs-backend/src/features/agent/agent-guardrail.service.ts
    - apps/nestjs-backend/src/features/agent/agent-guardrail.service.spec.ts
  modified:
    - apps/nestjs-backend/src/features/agent/agent-execution.service.ts
    - apps/nestjs-backend/src/features/agent/agent.module.ts
decisions:
  - GuardrailService resolves FieldService via FieldOpenApiModule (already imported in AgentModule) — no new module import needed
  - validateWrite returns structured errors rather than throwing — LLM receives { success:false, validationErrors } and can retry
  - On field-fetch failure, guardrail passes through — lets record API fail with its own error rather than blocking valid writes
metrics:
  duration: "~25min"
  completed: "2026-06-14"
  tasks_completed: 2
  files_changed: 4
---

# Phase 24 Plan 03: ARH-02 Input/Output Guardrails + update_record Summary

GuardrailService implementing AbstractField.validateCellValueWithNotNull-based pre-write validation, wired into create_record and new update_record switch arms in AgentExecutionService.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | GuardrailService TDD (RED/GREEN) | dc08b823 | agent-guardrail.service.ts, agent-guardrail.service.spec.ts |
| 2 | Wire guardrail + update_record | e3ed8044 | agent-execution.service.ts, agent.module.ts |

## Deviations from Plan

None - plan executed exactly as written.

`update_record` tool definition was already present in `agent-tool-registry.service.ts` (from a prior commit) — grep confirmed it existed before this plan. The plan required at least 1 occurrence: satisfied.

## Self-Check

- [x] agent-guardrail.service.ts created
- [x] agent-guardrail.service.spec.ts created (5/5 tests GREEN)
- [x] agent-execution.service.ts has 2 guardrailService.validateWrite calls
- [x] agent-execution.service.ts has `case 'update_record':`
- [x] agent.module.ts lists GuardrailService in providers
- [x] 17 existing agent-execution spec tests still pass

## Self-Check: PASSED
