---
plan_id: 19-02
phase: 19-extension-system
subsystem: plugin-extension
tags: [mcp, extension, ssrf, consent, schema]
dependency_graph:
  requires: [19-01]
  provides: [installByUrl, plugin-extension-fields, consent-gate]
  affects: [plugin.service, plugin.controller, plugin-mcp-discovery, schema.prisma]
tech_stack:
  added: []
  patterns: [SSRF-guard-before-fetch, tool-field-whitelist, consent-null-gate]
key_files:
  created:
    - packages/db-main-prisma/prisma/postgres/migrations/20260607000000_add_plugin_extension_fields/migration.sql
    - apps/nestjs-backend/src/features/agent/mcp/plugin-mcp-discovery.service.ts
    - apps/nestjs-backend/src/features/agent/mcp/mcp-tool-adapter.ts
    - apps/nestjs-backend/src/features/external-connection/ssrf-guard.service.ts
    - apps/nestjs-backend/src/features/plugin/install-by-url.spec.ts
  modified:
    - packages/db-main-prisma/prisma/postgres/schema.prisma
    - apps/nestjs-backend/src/features/plugin/plugin.service.ts
    - apps/nestjs-backend/src/features/plugin/plugin.controller.ts
    - apps/nestjs-backend/src/features/plugin/plugin.module.ts
    - apps/nestjs-backend/src/features/plugin/plugin.service.spec.ts
decisions:
  - installByUrl reads userId from CLS (consistent with all other PluginService methods)
  - SsrfGuardService added to PluginModule.providers directly (no DI deps, no special module needed)
  - SsrfBlockedError propagates unwrapped from installByUrl (fetch errors wrapped as VALIDATION_ERROR)
  - plugin-mcp-discovery.service.ts and mcp-tool-adapter.ts ported from main branch (missing in worktree)
  - Test symlinks created for node_modules to enable vitest execution from worktree context
metrics:
  duration: ~60 minutes
  completed: 2026-06-07
  tasks_completed: 5
  files_modified: 9
---

# Phase 19 Plan 02: Extension Schema + installByUrl Summary

Install third-party MCP extensions by URL with SSRF guard, tool manifest field whitelisting, and a consent gate that prevents unconsented extensions from appearing to the agent.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Schema: isExtension + requestedScopes + consentedAt fields | 893045a88 |
| 2 | PluginService.installByUrl() + SsrfGuardService injection | eb3c2a6fb |
| 3 | POST /plugin/install-by-url endpoint | 319bd17f3 |
| 4 | plugin-mcp-discovery consent filter | c43750eae |
| 5 | Unit tests (5 tests, all green) | 0b851dfc5 |

## What Was Built

**Schema extension** — Plugin model gains three new fields:
- `isExtension Boolean @default(false)` — distinguishes third-party MCP extensions from official plugins
- `requestedScopes Json?` — stores the tool names declared on install (consent surface)
- `consentedAt DateTime?` — NULL until space manager explicitly consents (T-19-03 gate)

**installByUrl() service method** — Two-phase security gate:
1. Parses URL, extracts hostname, calls `ssrfGuardService.assertHostAllowed(hostname)` before any network I/O (T-19-01 SSRF guard)
2. Fetches MCP tools/list (JSON-RPC), whitelists `name`, `description`, `inputSchema` per tool — all other keys discarded (T-19-02 prototype pollution mitigation)
Creates Plugin with `isExtension=true, consentedAt=null` and PluginInstall with `position='extension'`.

**REST endpoint** — `POST /api/plugin/install-by-url` with `@Permissions('space|create')` and `@ResourceMeta('spaceId', 'body')`.

**Discovery consent gate** — plugin-mcp-discovery WHERE clause filters `OR [isExtension=false, isExtension=true+consentedAt!=null]`, ensuring extension tools are invisible to the agent until consent is recorded.

**Unit tests** — 5 tests, all green: SSRF rejection, unreachable URL, valid manifest creation, field whitelist enforcement, consentedAt=null invariant.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Missing files] Phase 17/18 files absent from worktree**
- **Found during:** Tasks 2 and 4
- **Issue:** The worktree was branched from a pre-Phase-17 commit, so `external-connection/ssrf-guard.service.ts` and `agent/mcp/plugin-mcp-discovery.service.ts` did not exist in the worktree.
- **Fix:** Ported both files from the main branch. `ssrf-guard.service.ts` is an exact copy; `plugin-mcp-discovery.service.ts` is the Phase-17 version with the Phase-19 consent filter already applied.
- **Files created:** `external-connection/ssrf-guard.service.ts`, `agent/mcp/plugin-mcp-discovery.service.ts`, `agent/mcp/mcp-tool-adapter.ts`
- **Commit:** c43750eae

**2. [Rule 1 - Bug] assertSafe() vs assertHostAllowed()**
- **Found during:** Task 2
- **Issue:** Plan spec said `ssrfGuardService.assertSafe(mcpUrl)` but the actual method is `assertHostAllowed(host)` taking a hostname string, not a full URL.
- **Fix:** Extract `parsedUrl.hostname` from the URL first, then call `assertHostAllowed(hostname)`. URL validity is checked before the SSRF guard call.
- **Commit:** eb3c2a6fb

**3. [Rule 1 - Bug] installByUrl signature simplified**
- **Found during:** Task 3
- **Issue:** Plan showed `installByUrl(spaceId, mcpUrl, installedBy)` but all other PluginService methods read `user.id` from CLS internally.
- **Fix:** Changed to `installByUrl(spaceId, mcpUrl)` — reads `user.id` from CLS inside the method.
- **Commit:** 319bd17f3

**4. [Rule 1 - Bug] CustomHttpException.code not .errorCode**
- **Found during:** Task 5 (test run)
- **Issue:** Initial test assertion checked `.errorCode` but the property name is `.code`.
- **Fix:** Changed assertion to check `.code`.
- **Commit:** 0b851dfc5

## Threat Model Coverage

| Threat | Mitigation | Status |
|--------|-----------|--------|
| T-19-01: SSRF via malicious URL | assertHostAllowed() before fetch | Implemented |
| T-19-02: Prototype pollution via manifest | Field whitelist (name/description/inputSchema only) | Implemented |
| T-19-03: Tools visible before consent | consentedAt=null; discovery gate skips null | Implemented |

## Known Stubs

None — the install flow is fully wired. The `consentedAt` field being NULL after install is intentional (consent is a future UI action, not a stub).

## Self-Check: PASSED

- schema.prisma in worktree has isExtension, requestedScopes, consentedAt: verified via Read
- migration.sql created: 20260607000000_add_plugin_extension_fields/migration.sql
- plugin.service.ts has installByUrl() and fetchMcpManifest(): verified via Edit
- plugin.controller.ts has POST install-by-url with @Permissions('space|create'): verified
- plugin-mcp-discovery.service.ts has consent filter in WHERE clause: verified via Write
- All 5 tests pass: verified via vitest run output (5 passed, 0 failed)
- Commits exist: 893045a88, eb3c2a6fb, 319bd17f3, c43750eae, 0b851dfc5
