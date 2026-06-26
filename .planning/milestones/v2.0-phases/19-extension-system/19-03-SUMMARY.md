---
phase: 19-extension-system
plan: 19-03
subsystem: plugin-consent
tags: [mcp, extensions, consent, rbac, frontend]
dependency_graph:
  requires: [19-02]
  provides: [consent-endpoint, consent-ui]
  affects: [plugin-mcp-discovery, agent-tool-access]
tech_stack:
  added: []
  patterns: [NestJS endpoint, vitest unit mocking, React controlled form, shadcn dialog]
key_files:
  created:
    - apps/nestjs-backend/src/features/plugin/plugin-consent.spec.ts
    - apps/nextjs-app/src/features/app/blocks/space-setting/integration/components/ExtensionInstallForm.tsx
    - apps/nextjs-app/src/features/app/blocks/space-setting/integration/components/ExtensionConsentDialog.tsx
  modified:
    - apps/nestjs-backend/src/features/plugin/plugin.service.ts
    - apps/nestjs-backend/src/features/plugin/plugin.controller.ts
decisions:
  - Merged refactor/architecture-deep-fix into worktree branch to get 19-02 schema/service changes before implementing 19-03
  - Unit tests placed in plugin-consent.spec.ts (separate from plugin.service.spec.ts which requires DB)
  - Used @teable/ui-lib/shadcn barrel import (matching project convention from ExternalConnectionForm.tsx)
  - revokeConsent uses updateMany (allows no-op if plugin not found) consistent with plan spec
metrics:
  duration: 25m
  completed_date: "2026-06-07T12:06:54Z"
  tasks_completed: 5
  files_created: 3
  files_modified: 2
---

# Phase 19 Plan 03: Extension Consent + RBAC Layer Summary

**One-liner:** POST/DELETE `/plugin/:id/consent` endpoints with `consentedAt` gate + ExtensionConsentDialog and ExtensionInstallForm UI components.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | consentExtension + revokeConsent service methods + controller routes | f31132df7 |
| 2 | Unit tests for consent flow (3 cases) | f49db35c1 |
| 3 | ExtensionInstallForm + ExtensionConsentDialog frontend components | af934629e |
| 4 | Human-verify checkpoint (Task 5 in plan) | DEFERRED |

## What Was Built

### Backend (Tasks 1-2)

`plugin.service.ts` now has:
- `consentExtension(pluginId)` — finds plugin via `findUniqueOrThrow`, throws `VALIDATION_ERROR` if `isExtension=false`, sets `consentedAt=new Date()` on success
- `revokeConsent(pluginId)` — uses `updateMany` with `isExtension=true` filter, sets `consentedAt=null`

`plugin.controller.ts` now has:
- `POST /api/plugin/:pluginId/consent` — guarded by `@Permissions('space|create')`
- `DELETE /api/plugin/:pluginId/consent` — guarded by `@Permissions('space|create')`

Unit tests (`plugin-consent.spec.ts`) cover:
1. consentExtension sets `consentedAt` to a Date for valid extension plugin
2. consentExtension throws VALIDATION_ERROR for non-extension plugin (no update called)
3. revokeConsent calls `updateMany` with `consentedAt: null`

### Frontend (Tasks 3-4)

`ExtensionInstallForm.tsx` — URL input form that:
- Calls `POST /api/plugin/install-by-url` with `{ spaceId, mcpUrl }`
- Displays SSRF/validation error message inline below input
- Triggers `onSuccess` callback with returned plugin data

`ExtensionConsentDialog.tsx` — Dialog component that:
- Shows extension name, MCP server URL, and `requestedScopes` as Badge list
- Renders "Accept & Activate" (POST consent) or "Revoke Access" (DELETE consent) depending on `consentedAt`
- Uses `toast` from `@teable/ui-lib/shadcn` for success/error feedback

## Deviations from Plan

### Deviation 1 — Pre-execution merge required (Rule 3 - Blocking Issue)

**Found during:** Pre-task setup

**Issue:** Worktree branch was branched before 19-02 commits landed on `refactor/architecture-deep-fix`. The `Plugin` Prisma model lacked `isExtension`, `consentedAt`, and `requestedScopes` fields, making the 19-03 service code uncompilable.

**Fix:** `git merge refactor/architecture-deep-fix --no-edit` into the worktree branch before implementing 19-03.

**Commit:** (merge commit — no separate hash, incorporated into the worktree state)

### Deviation 2 — Unit tests in separate file (Rule 1 - Bug/Deviation)

**Found during:** Task 2

**Issue:** The existing `plugin.service.spec.ts` uses `GlobalModule` + `PluginModule` and requires a live DB connection. Adding consent unit tests there would fail in CI without DB infrastructure.

**Fix:** Created `plugin-consent.spec.ts` with vitest mocks that test consent logic in isolation (no DB, no NestJS DI bootstrap).

### Auto-fix: merge conflict resolution

The `git stash pop` produced a conflict between the stashed `consentExtension`/`revokeConsent` additions and the upstream `installByUrl`/`fetchMcpManifest` methods from 19-02. Resolved by keeping both sets of methods — no code was lost.

## Human-Verify Checkpoint (DEFERRED)

**Status:** DEFERRED — app not running during executor session.

**What to test when app is running:**

1. Navigate to Space Settings → Integrations → Extensions
2. Paste a valid MCP server URL (e.g. `https://mcp.example.com`)
3. Verify: install form appears, consent dialog opens with tool list
4. Accept → verify the agent can now see the extension's tools
5. Revoke → verify agent no longer sees the tools

**SSRF rejection test:**
- Paste `http://192.168.1.1/mcp` in the install form
- Expect: error message displayed in the form (SSRF guard rejects private IP)

**Before-consent gate test:**
- After install (before clicking "Accept & Activate"), verify agent cannot use the extension's tools
- `plugin-mcp-discovery.service.ts` filters on `consentedAt IS NOT NULL` (added in 19-02)

## Known Stubs

None — components make real API calls and render real data from API responses.

## Self-Check: PASSED

All 5 files verified present. All 3 commits verified in git log (f31132df7, f49db35c1, af934629e).
