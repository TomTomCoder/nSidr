---
phase: 24-agent-runtime-hardening
plan: 05
subsystem: agent-hitl
tags: [hitl, approval, schema, migration, controller]
dependency_graph:
  requires: [24-03, 24-04]
  provides: [ARH-03-backend]
  affects: [agent-execution, agent-conversation, agent-controller]
tech_stack:
  added: []
  patterns: [terminate-and-resume, __hitl-sentinel, ownership-check, status-guard]
key_files:
  created:
    - packages/db-main-prisma/prisma/postgres/migrations/20260614100000_add_approval_to_agent_conversation/migration.sql
  modified:
    - packages/db-main-prisma/prisma/postgres/schema.prisma
    - apps/nestjs-backend/src/features/agent/agent-conversation.service.ts
    - apps/nestjs-backend/src/features/agent/agent-tool-registry.service.ts
    - apps/nestjs-backend/src/features/agent/agent-execution.service.ts
    - apps/nestjs-backend/src/features/agent/agent-execution.service.spec.ts
    - apps/nestjs-backend/src/features/agent/agent.controller.ts
    - apps/nestjs-backend/src/features/agent/agent.controller.unit.spec.ts
decisions:
  - "terminate-and-resume pattern: __hitl sentinel returned by executeToolCall, checked in run() loop after each tool execution; avoids generator suspension complexity"
  - "findConversation returns createdBy (not userId) for ownership check — schema uses createdBy, execution service also uses createdBy field"
  - "request_human_approval tool is always-enabled (no explicit isEnabled row needed) because it is not web_search — default-on rule applies"
  - "approve endpoint fires new agent run fire-and-forget (void async) to match existing webhook pattern"
metrics:
  duration: 45m
  completed: 2026-06-14
  tasks: 3
  files: 8
---

# Phase 24 Plan 05: ARH-03 HITL Backend Summary

**One-liner:** HITL terminate-and-resume — request_human_approval tool suspends run with waiting_for_approval status; POST /approve endpoint enforces ownership + status guards and resumes or rejects.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Schema migration + conversation service helpers | 93b26a89f |
| 2 | Tool registration + __hitl sentinel in executeToolCall | 93b26a89f |
| 3 | Approve endpoint with ownership/status guards + tests | 93b26a89f |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing functionality] Added findConversation method to AgentConversationService**
- **Found during:** Task 3
- **Issue:** agent-execution.service.ts already called `this.conversationService.findConversation()` (line 219) but the method did not exist in agent-conversation.service.ts — would cause a runtime TypeError
- **Fix:** Added `findConversation(conversationId)` selecting `{id, createdBy, status, approvalPayload}` — also used by the approve endpoint for ownership check
- **Files modified:** apps/nestjs-backend/src/features/agent/agent-conversation.service.ts

## Test Results

- `agent-execution.service.spec.ts`: 33/33 passed (3 new HITL cases green)
- `agent.controller.unit.spec.ts`: 8/9 passed (4 new approve cases green; 1 pre-existing "null webhook trigger" failure unchanged)

## Known Stubs

None — all methods are fully implemented.

## Threat Flags

None beyond what is documented in the plan threat model. T-24-05-01 and T-24-05-02 mitigations are both implemented (ownership check throws 403; non-waiting status throws 409).

## Self-Check: PASSED

- migration.sql: FOUND
- schema.prisma approvalPayload: FOUND
- markConversationWaitingForApproval: FOUND
- clearApprovalState: FOUND
- findConversation: FOUND
- request_human_approval in tool registry: FOUND
- case 'request_human_approval' in executeToolCall: FOUND
- __hitl sentinel check in run() loop: FOUND
- approveConversation endpoint in controller: FOUND
- ForbiddenException guard: FOUND
- ConflictException guard: FOUND
- commit 93b26a89f: FOUND
