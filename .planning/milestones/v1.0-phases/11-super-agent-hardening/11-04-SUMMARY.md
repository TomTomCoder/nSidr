---
phase: 11-super-agent-hardening
plan: "04"
subsystem: agent-dm-trigger
tags: [agent, dm-trigger, event-emitter, nestjs, controller]
dependency_graph:
  requires: [agent-permission-guard, conversationId-aware-run-loop]
  provides: [agent-dm-emitter-endpoint]
  affects: [agent.controller, agent-event.listener]
tech_stack:
  added: []
  patterns: [event-emitter2, post-endpoint, dm-trigger]
key_files:
  created: []
  modified:
    - apps/nestjs-backend/src/features/agent/agent.controller.ts
    - apps/nestjs-backend/src/features/agent/agent-event.listener.ts
decisions:
  - "Documentation backfill only — no new Phase 12 code written; all implementation landed in commit bbb916bac"
  - "SUMMARY.md written retroactively in Phase 12 plan 01 to record the completion so ROADMAP progress tracking treats 11-04 as done"
metrics:
  duration: "N/A (backfill)"
  completed: "2026-05-31"
  tasks_completed: 1
  files_changed: 0
---

# Phase 11 Plan 04: DM Trigger Emitter Summary

POST :id/message endpoint emitting agent.dm event — wires the existing AgentEventListener.handleAgentDm handler to a real inbound direct-message path.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add POST :id/message endpoint that emits agent.dm | bbb916bac | agent.controller.ts |

Note: Task 2 was a human-verify checkpoint. The checkpoint was approved per commit bbb916bac ("fix(11-04-uat): resolve permission guard, tool schema, and missing file issues").

## What Was Built

**Task 1 — POST :id/message DM emitter endpoint:**

- `AgentController` injects `EventEmitter2` (from `@nestjs/event-emitter`)
- `@Post(':id/message')` handler resolves `fromUserId` from `ClsService<IClsStore>` (authenticated session — NOT from client body, per threat model T-11-06)
- Emits `agent.dm` with payload `{ agentId: id, message: body.message, fromUserId }` matching `handleAgentDm`'s expected shape exactly
- Route is guarded `@Permissions('base|create')` + `AgentPermissionGuard` (scoped to owning base, per threat model T-11-07)
- Returns lightweight ack `{ accepted: true }` — no duplicate execution loop; the run flows entirely through the existing `AgentEventListener.handleAgentDm` → `AgentTriggerService.handleDm` path

**Key link:**
```
POST /api/agent/:id/message
  → AgentController.sendMessage()
  → EventEmitter2.emit('agent.dm', { agentId, message, fromUserId })
  → AgentEventListener.handleAgentDm(@OnEvent('agent.dm'))
  → AgentTriggerService.handleDm(agentId, { message, fromUserId })
```

**Verification evidence (grep, confirmed in main repo at bbb916bac):**
- `@Post(':id/message')` present in agent.controller.ts: CONFIRMED
- `emit('agent.dm'` present in agent.controller.ts: CONFIRMED
- `agent.dm` referenced in agent-event.listener.ts: CONFIRMED

## Deviations from Plan

None — implementation matched plan spec. This SUMMARY is a documentation backfill only. No new Phase 12 code was written for this item; all code landed in commit `bbb916bac`.

## Threat Model Coverage

| Threat ID | Status |
|-----------|--------|
| T-11-06 (Spoofing: fromUserId on :id/message) | Mitigated — fromUserId taken from authenticated ClsService user, not from client body |
| T-11-07 (Elevation of Privilege: :id/message route) | Mitigated — @Permissions('base\|create') + AgentPermissionGuard scope to owning base |

## Known Stubs

None — all data paths are wired to real service calls.

## Self-Check

### Files Exist
- [x] apps/nestjs-backend/src/features/agent/agent.controller.ts — modified at bbb916bac (contains @Post(':id/message') and emit('agent.dm'))
- [x] apps/nestjs-backend/src/features/agent/agent-event.listener.ts — confirmed referencing agent.dm at bbb916bac

### Commits Exist
- [x] bbb916bac — fix(11-04-uat): resolve permission guard, tool schema, and missing file issues

## Self-Check: PASSED
