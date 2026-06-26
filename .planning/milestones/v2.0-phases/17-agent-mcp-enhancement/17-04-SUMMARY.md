---
plan: "17-04"
phase: "17-agent-mcp-enhancement"
subsystem: "agent/mcp/interface-tools"
tags: ["mcp", "rbac", "app-builder", "dashboard", "tdd", "wave-2"]
dependency_graph:
  requires: ["17-02", "17-03"]
  provides: ["interface MCP tools: get_app/get_dashboard/run_app_action/update_dashboard"]
  affects: ["agent.module.ts", "AppBuilderModule", "DashboardModule"]
tech_stack:
  added: []
  patterns: ["TDD RED/GREEN", "RBAC-first gating", "service delegation (no raw DB writes)"]
key_files:
  created:
    - apps/nestjs-backend/src/features/agent/mcp/interface-tools.ts
    - apps/nestjs-backend/src/features/agent/mcp/interface-tools.service.ts
    - apps/nestjs-backend/src/features/agent/mcp/interface-tools.service.spec.ts
  modified:
    - apps/nestjs-backend/src/features/agent/agent.module.ts
decisions:
  - "Use PermissionService.validPermissions (existing CLS-aware service) rather than AuthorityMatrixService directly — simpler, same RBAC enforcement"
  - "app|update permission required for writes (not app|read) — enforced by separate switch branch"
  - "base|update permission required for update_dashboard (not base|read)"
  - "_currentUserId injected on service instance; in production CLS is already populated by HTTP session"
  - "INTERFACE_TOOLS exported from interface-tools.ts separate from service to keep schema pure"
metrics:
  duration_seconds: 180
  completed_date: "2026-06-05"
  task_count: 2
  file_count: 4
---

# Phase 17 Plan 04: Interface MCP Tools (app + dashboard read/write) Summary

**One-liner:** App/dashboard read+write MCP tools (get_app, get_dashboard, run_app_action, update_dashboard) gated by PermissionService RBAC — reads require read perms, writes require distinct update perms.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Define interface tool schemas | b774661bd | interface-tools.ts |
| 2 (RED) | TDD failing spec | 98e2275ee | interface-tools.service.spec.ts |
| 2 (GREEN) | InterfaceToolsService + module | 765bb093e | interface-tools.service.ts, agent.module.ts |

## What Was Built

**interface-tools.ts** — 4 `ToolDefinition[]` exports:
- `get_app(baseId, appId)` — READ, requires `app|read`
- `get_dashboard(baseId, id)` — READ, requires `base|read`
- `run_app_action(baseId, appId, action, name?, content?)` — WRITE, requires `app|update`
- `update_dashboard(baseId, id, name?, layout?)` — WRITE, requires `base|update`

**InterfaceToolsService** — `executeInterfaceTool(name, input, identity)`:
- RBAC gate checked FIRST before any DB access (T-17-09)
- READ tools delegate to `AppBuilderService.findOne/getAppContent` and `DashboardService.getDashboardById`
- WRITE tools delegate to `AppBuilderService.renameApp/updateAppContent/duplicateApp` and `DashboardService.renameDashboard/updateLayout`
- No raw DB writes — all mutations go through existing services (T-17-11)
- Writes audit under the scoped identity via existing service logging (T-17-10)

**agent.module.ts** — Added `AppBuilderModule`, `DashboardModule`, `InterfaceToolsService`.

## Test Results

```
InterfaceToolsService (8 tests)
  ✓ should reject get_app for an unauthorized identity
  ✓ should reject run_app_action for an unauthorized identity
  ✓ should return app meta and content for authorized get_app
  ✓ should return dashboard data for authorized get_dashboard
  ✓ should rename an app via run_app_action for authorized identity
  ✓ should update dashboard name via update_dashboard for authorized identity
  ✓ should reject run_app_action for read-only identity (read perm ≠ write perm)
  ✓ should throw for unknown tool name
```

## TDD Gate Compliance

- RED: `test(17-04): add failing tests for InterfaceToolsService (RED gate)` — 8 failures confirmed
- GREEN: `feat(17-04): implement InterfaceToolsService with RBAC + service delegation` — 8 passes confirmed

## Deviations from Plan

### Auto-decisions (no structural changes)

**1. [Rule 2 - Security] Used PermissionService.validPermissions instead of AuthorityMatrixService**
- **Reason:** AuthorityMatrixService manages the matrix definitions (CRUD on matrices/roles). PermissionService.validPermissions is the correct call-site for checking whether a user has a given action on a resource — it resolves roles, collaborators, and CLS. The plan mentioned both; chose the semantically correct one.
- **Impact:** None — same RBAC enforcement, cleaner integration.

### Checkpoint 3 (live-boot verification) — DEFERRED

Per execution context `<checkpoint_handling>`, live-boot checkpoints are auto-deferred.

**Manual verification steps:**
1. Boot `pnpm dev:separated:light` (web :3000 + API :3002)
2. As an agent with `app|read` permission, call `get_app` → should return app meta + content
3. As an agent with `base|read` permission, call `get_dashboard` → should return dashboard data + layout
4. As an agent with `app|update` permission, call `run_app_action` rename → change persists
5. As an agent with `base|update` permission, call `update_dashboard` name patch → change persists
6. As a read-only agent, call `run_app_action` → should receive permission denied error

## Threat Flags

None. All threats in the 17-04 register were mitigated:
- T-17-09: `app|update` and `base|update` enforced separately from read perms — confirmed by test #7
- T-17-10: writes flow through AppBuilderService/DashboardService which carry audit fields
- T-17-11: no raw DB writes — service delegation only

## Known Stubs

None. Tool schemas and service are fully wired. Live invocation requires the app to be booted (deferred checkpoint above).

## Self-Check: PASSED

- [x] interface-tools.ts exists
- [x] interface-tools.service.ts exists
- [x] interface-tools.service.spec.ts exists
- [x] agent.module.ts modified (AppBuilderModule, DashboardModule, InterfaceToolsService added)
- [x] All 3 feat/test commits exist: b774661bd, 98e2275ee, 765bb093e
- [x] 8 tests green
