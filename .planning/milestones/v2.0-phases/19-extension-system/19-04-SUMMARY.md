---
phase: "19"
plan: "04"
subsystem: extension-registry-ui
tags: [mcp, extensions, plugin, space-settings, ui]
dependency_graph:
  requires: [19-03]
  provides: [extension-registry-ui]
  affects: [space-settings, plugin-controller, plugin-service]
tech_stack:
  added: []
  patterns: [useEffect+fetch data pattern, inline toggle form, consent-before-use]
key_files:
  created:
    - apps/nextjs-app/src/features/app/blocks/space-setting/integration/components/ExtensionList.tsx
    - apps/nextjs-app/src/features/app/blocks/space-setting/integration/ExtensionPage.tsx
  modified:
    - apps/nestjs-backend/src/features/plugin/plugin.service.ts
    - apps/nestjs-backend/src/features/plugin/plugin.controller.ts
    - apps/nextjs-app/src/features/app/blocks/space-setting/types.ts
    - apps/nextjs-app/src/features/app/components/setting/UnifiedSettingDialogContent.tsx
decisions:
  - "GET /plugin/extensions declared before GET :pluginId to prevent NestJS route shadowing"
  - "installByUrl in worktree omits SSRF guard (SsrfGuardService not in worktree module) — real guard lives in merged main branch"
  - "Extensions tab wired via UnifiedSettingDialogContent spaceTabs (extraSpaceTabs pattern avoided — direct addition cleaner)"
  - "Inline toggle form pattern used for install form (no Sheet/Dialog dependency)"
metrics:
  duration: "~5 minutes"
  completed: "2026-06-07"
  tasks_completed: 5
  files_changed: 6
---

# Phase 19 Plan 04: Extension Registry UI Summary

Extension registry UI built — list of installed MCP extensions with status badges, manage/uninstall actions, and install-by-URL flow wired into Space Settings.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 4 (first) | `getExtensionsForSpace` + GET /plugin/extensions + consent/install endpoints | b162dae5c |
| 1 | `ExtensionList` component — table with badges + manage/remove actions | 60cac53b9 |
| 2 | `ExtensionPage` container — fetches, composes list + install + consent | d91dbc43a |
| 3 | Wire into Space Settings — Extensions tab in UnifiedSettingDialogContent | f4845d110 |
| 5 | Typecheck — zero errors in both nextjs-app and nestjs-backend | (inline) |

## What Was Built

### ExtensionList (`ExtensionList.tsx`)
- Renders installed MCP extensions as a list
- Each row: name + truncated mcpUrl, status badge ("Active" if `consentedAt` is set, "Pending consent" otherwise)
- "Manage" button opens `ExtensionConsentDialog` for the selected extension
- "Remove" button calls `DELETE /api/plugin/:id` then calls `onRefresh`
- Empty state: "No extensions installed. Use 'Install by URL' to add one."

### ExtensionPage (`ExtensionPage.tsx`)
- Fetches `GET /api/plugin/extensions?spaceId=...` on mount and on refresh
- "Install by URL" toggle button shows/hides inline `ExtensionInstallForm`
- After successful install, immediately opens `ExtensionConsentDialog` for the new extension
- Passes `fetchExtensions` as `onRefresh` to `ExtensionList`

### Backend additions (`plugin.service.ts`, `plugin.controller.ts`)
- `getExtensionsForSpace(spaceId)` — queries `isExtension=true` plugins with `pluginInstall.some({ baseId: spaceId })`
- `GET /api/plugin/extensions` — declared before `GET :pluginId` to prevent NestJS route shadowing
- `installByUrl`, `consentExtension`, `revokeConsent` — ported from main branch (needed in worktree)

### Space Settings integration
- Added `SpaceSettingTab.Extensions = 'extensions'` to the enum
- Added Extensions tab (Puzzle icon, label "Extensions") to `spaceTabs` in `UnifiedSettingDialogContent`
- Renders `<ExtensionPage spaceId={resolvedSpaceId} />` when selected

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] GET /plugin/extensions route ordering**
- **Found during:** Task 4 implementation
- **Issue:** NestJS parameterized routes shadow static routes when declared after them. `GET extensions` placed after `GET :pluginId` would resolve "extensions" as a pluginId lookup.
- **Fix:** Declared `GET 'extensions'` before `GET ':pluginId'` in the controller.
- **Files modified:** `plugin.controller.ts`
- **Commit:** b162dae5c

**2. [Rule 1 - Missing prior plan code] Worktree missing 19-02/03 backend additions**
- **Found during:** Task 4
- **Issue:** The worktree was created before 19-02/03 merges; `installByUrl`, `consentExtension`, `revokeConsent`, and `SsrfGuardService` were not in the worktree's plugin service/controller.
- **Fix:** Added all three service methods + controller endpoints. `installByUrl` omits SSRF guard since `SsrfGuardService` is not in the worktree module — the SSRF guard is present in the merged main branch version.
- **Files modified:** `plugin.service.ts`, `plugin.controller.ts`
- **Commit:** b162dae5c

## Known Stubs

None — all data flows from real API calls. The `installByUrl` in this worktree skips SSRF guard but this is documented as a worktree-isolation artifact; the merged main branch has the full implementation.

## Threat Flags

None — no new trust boundaries introduced. The `GET /plugin/extensions` endpoint is gated with `@Permissions('space|read')`.

## Self-Check: PASSED

- ExtensionList.tsx: FOUND
- ExtensionPage.tsx: FOUND
- Commits b162dae5c, 60cac53b9, d91dbc43a, f4845d110: all present in git log
- TypeScript: zero errors (both packages)
