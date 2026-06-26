---
phase: 24-agent-runtime-hardening
plan: "02"
subsystem: agent-oauth
tags: [oauth, multi-user, credential-binding, prisma-migration, tdd]
dependency_graph:
  requires: []
  provides: [ARH-04-per-user-oauth-binding]
  affects: [agent-execution, gmail-oauth, slack-oauth, github-oauth]
tech_stack:
  added: []
  patterns: [per-user-credential-fallback, nullable-fk-column-with-index]
key_files:
  created:
    - packages/db-main-prisma/prisma/postgres/migrations/20260614000000_add_user_id_to_agent_connection/migration.sql
    - apps/nestjs-backend/src/features/agent/oauth/gmail-oauth.service.spec.ts
  modified:
    - packages/db-main-prisma/prisma/postgres/schema.prisma
    - apps/nestjs-backend/src/features/agent/oauth/gmail-oauth.service.ts
    - apps/nestjs-backend/src/features/agent/oauth/slack-oauth.service.ts
    - apps/nestjs-backend/src/features/agent/oauth/github-oauth.service.ts
    - apps/nestjs-backend/src/features/agent/oauth/gmail-agent-tool.ts
    - apps/nestjs-backend/src/features/agent/oauth/slack-agent-tool.ts
    - apps/nestjs-backend/src/features/agent/oauth/github-agent-tool.ts
    - apps/nestjs-backend/src/features/agent/oauth/gmail-client.ts
    - apps/nestjs-backend/src/features/agent/oauth/slack-client.ts
    - apps/nestjs-backend/src/features/agent/oauth/github-client.ts
    - apps/nestjs-backend/src/features/agent/agent-execution.service.ts
decisions:
  - "Per-user lookup uses findFirst (not findUnique) so no second unique constraint is needed on AgentConnection"
  - "userId propagated through client-layer methods rather than stored in service state to preserve injectable singleton pattern for Slack/GitHub clients"
  - "GmailClient stores userId at construction time (matches existing agentId pattern); Slack/GitHubClient accept it per-method call (injectable singletons shared across requests)"
metrics:
  duration: ~12m
  completed: "2026-06-14"
  tasks_completed: 3
  files_modified: 11
---

# Phase 24 Plan 02: ARH-04 Per-User OAuth Credential Binding Summary

Per-user OAuth credential binding for Gmail/Slack/GitHub via nullable userId column on agent_connection with agent-level fallback for backward compatibility.

## What Was Built

### Task 1: Schema + Migration

Added nullable `userId String? @map("user_id")` to `AgentConnection` model in `schema.prisma`. Added `@@index([agentId, userId, provider])` for the per-user `findFirst` lookup path. Preserved the existing `@@unique([agentId, provider])` for agent-level rows (userId IS NULL). Created migration `20260614000000_add_user_id_to_agent_connection` with `ADD COLUMN "user_id" TEXT` and the composite index. Ran `prisma generate` to regenerate the Prisma client.

### Task 2: GmailOAuthService userId Fallback (TDD)

**RED:** 4 failing tests covering: user-scoped token preference, agent-level fallback, legacy no-userId path, and not-found error.

**GREEN:** Updated `getValidToken(agentId: string, userId?: string)` — when `userId` truthy, calls `findFirst({ where: { agentId, provider: 'gmail', userId } })` first; falls back to `findUnique` agent-level lookup; throws existing error message if neither found. Refresh/decrypt logic unchanged.

All 4 tests pass.

### Task 3: Mirror to Slack/GitHub + ctx.userId Propagation

Applied the same `getValidToken(agentId, userId?)` pattern to `SlackOAuthService` and `GitHubOAuthService`. Updated `GmailClient` constructor to accept `userId?` and forward to all `getValidToken` calls. Updated `SlackClient` methods (`listChannels`, `getChannelMessages`, `postMessage`, `searchMessages`) and `GitHubClient` methods (`createIssue`, `listPullRequests`, `addComment`, `listIssues`) to accept `userId?` and pass it to `getValidToken`. Updated adapter functions `executeGmailTool`, `executeSlackTool`, `executeGitHubTool` to accept `userId?`. In `agent-execution.service.ts`, all three tool dispatch sites now pass `ctx.userId`.

Typecheck on modified oauth/* and agent-execution.service.ts files: no new errors.

## Commits

| Hash | Description |
|------|-------------|
| bbdd20780 | feat(24-02): add nullable userId to AgentConnection schema + migration |
| 6a3688be5 | test(24-02): add failing tests for GmailOAuthService per-user token fallback (RED) |
| cc8bba0bb | feat(24-02): implement GmailOAuthService.getValidToken with per-user fallback (GREEN) |
| 1ccf0d7d4 | feat(24-02): mirror userId fallback to Slack/GitHub OAuth services + propagate ctx.userId |

## Deviations from Plan

### Auto-added: SlackClient and GitHubClient method-level userId propagation

- **Found during:** Task 3
- **Issue:** The plan said to update adapters and OAuth services; the client layer (`SlackClient`, `GitHubClient`) is the intermediary that calls `getValidToken`. Without updating the client methods, userId would never reach the OAuth service.
- **Fix:** Added `userId?` to the four client methods called by each tool adapter.
- **Rule:** Rule 2 (missing critical functionality for correctness)
- **Files modified:** `slack-client.ts`, `github-client.ts`

None - plan executed as written for schema, OAuth services, and ctx.userId propagation.

## Known Stubs

None.

## Threat Flags

None — no new network endpoints, auth paths, or schema changes beyond what is documented in the plan's threat model. The `ctx.userId` value flowing into the OAuth resolver is server-authoritative (set by the agent runtime from the authenticated session), satisfying T-24-02-01.

## TDD Gate Compliance

- RED commit (`test(24-02): ...`): 6a3688be5 — present
- GREEN commit (`feat(24-02): implement GmailOAuthService...`): cc8bba0bb — present

## Self-Check: PASSED

- Schema file contains `user_id`: confirmed
- Migration SQL file exists at `packages/db-main-prisma/prisma/postgres/migrations/20260614000000_add_user_id_to_agent_connection/migration.sql`: confirmed
- All 4 spec tests pass: confirmed
- Typecheck on oauth/* files: no new errors
- Commits bbdd20780, 6a3688be5, cc8bba0bb, 1ccf0d7d4: all present in git log
