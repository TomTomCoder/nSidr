---
phase: 11-super-agent-hardening
plan: "01"
subsystem: backend-auth
tags: [security, authorization, guard, nestjs]
dependency_graph:
  requires: []
  provides: [agent-permission-guard, base-scoped-agent-auth]
  affects: [agent.controller, agent.module]
tech_stack:
  added: []
  patterns: [PermissionGuard subclass, canActivate baseId resolution, @Permissions decorator]
key_files:
  created:
    - apps/nestjs-backend/src/features/agent/agent-permission.guard.ts
  modified:
    - apps/nestjs-backend/src/features/agent/agent.controller.ts
    - apps/nestjs-backend/src/features/agent/agent.module.ts
decisions:
  - "agentWebhook and oauthCallback marked @Public() — webhook uses X-Agent-Secret; callback is OAuth provider redirect"
  - "getOAuthUrl (GET oauth/:provider) gets @Permissions('base|read') since it exposes provider URL to authenticated users"
  - "baseId resolved async in canActivate and cached as req._resolvedBaseId for synchronous getResourceId override"
metrics:
  duration: "8m"
  completed: "2026-05-30"
  tasks_completed: 2
  files_changed: 3
---

# Phase 11 Plan 01: Agent Authorization Guard Summary

Base-scoped permission enforcement for all AgentController routes via AgentPermissionGuard — resolves agent.baseId from the DB and checks base|read / base|create for every authenticated route.

## Tasks Completed

| Task | Commit | Description |
|------|--------|-------------|
| Task 1: Create AgentPermissionGuard | 57a5453c | New guard extending PermissionGuard; async canActivate looks up agent.baseId and caches on req._resolvedBaseId |
| Task 2: Apply guard + @Permissions decorators | 556be581 | @UseGuards at class level; 20 @Permissions decorators; agentWebhook + oauthCallback @Public() |

## Decisions Made

1. **baseId caching pattern**: `canActivate` performs the async Prisma lookup and stores result on `req._resolvedBaseId`. The synchronous `getResourceId` override reads this cache, then falls back to `super.getResourceId()` and `defaultResourceId()` — matching how `BaseNodePermissionGuard` resolves its baseId.

2. **Webhook stays public via @Public()**: `agentWebhook` has `@Public()` which short-circuits `PermissionGuard.canActivate` before any permission check. The existing `X-Agent-Secret` UnauthorizedException check is fully preserved.

3. **oauthCallback is @Public()**: The OAuth callback is called by an external OAuth provider redirect, not by an authenticated browser session, so it must remain public.

4. **getOAuthUrl gets base|read**: The `GET oauth/:provider` endpoint uses `agentId` as a query param (no `:id` path param). The guard falls back to `defaultResourceId` for this route; it receives `base|read` since it only exposes an OAuth URL.

5. **20 @Permissions decorators**: 10 reads (`base|read`) + 9 writes/exec (`base|create`) + 1 on `getOAuthUrl` = 20 total, exceeding the plan's minimum of 17.

## Deviations from Plan

None — plan executed exactly as written.

## Threat Model Coverage

| Threat ID | Status |
|-----------|--------|
| T-11-01 (EoP: AgentController routes) | Mitigated — AgentPermissionGuard applied at class level |
| T-11-02 (Info disclosure: cross-base read) | Mitigated — getResourceId returns agent.baseId, scoping check to owning base |
| T-11-03 (Spoofing: webhook) | Accepted — webhook @Public() + X-Agent-Secret check unchanged |

## Self-Check

Files exist:
- apps/nestjs-backend/src/features/agent/agent-permission.guard.ts — created
- apps/nestjs-backend/src/features/agent/agent.controller.ts — modified
- apps/nestjs-backend/src/features/agent/agent.module.ts — modified

Commits exist:
- 57a5453c — AgentPermissionGuard
- 556be581 — guard + decorators applied

## Self-Check: PASSED
