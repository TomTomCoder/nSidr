---
phase: 09-ui-feature-testing
plan: "06"
subsystem: e2e-testing
tags: [playwright, automation, workflow, e2e]
dependency_graph:
  requires: [09-00]
  provides: [automations-e2e-spec]
  affects: []
tech_stack:
  added: []
  patterns: [storageState auth reuse, API error interception, graceful test.skip]
key_files:
  created:
    - apps/nextjs-app/e2e/automations.spec.ts
  modified: []
decisions:
  - "Mapped 'Automations' UI feature to WorkflowController at /api/base/:baseId/workflow — frontend URL /base/:baseId/automation routes to WorkflowPage (ResourceType.Workflow)"
  - "Used direct URL navigation fallback when sidebar automation tab is not immediately found"
  - "Spec uses test.skip for empty automation list so CI doesn't hard-fail on fresh environments"
metrics:
  duration: "8m"
  completed: "2026-05-24"
  tasks_completed: 2
  files_changed: 1
---

# Phase 09 Plan 06: Automations E2E Spec Summary

Playwright spec for the Automations panel flow verifying the workflow list API and panel UI are wired without 404/500 errors.

## What Was Built

`apps/nextjs-app/e2e/automations.spec.ts` — Playwright spec that navigates to the nXtFlow base, opens the Automations section, clicks the "Test" automation entry, and asserts the detail panel renders with a trigger section and a Run button. Intercepts all API responses to catch workflow/automation endpoint errors.

## Task Outcomes

### Task 1: Locate automation routes and fix 404-producing bugs

**Result:** No fixes needed. Analysis confirmed:
- `WorkflowController` exists at `/api/base/:baseId/workflow`
- `WorkflowModule` is imported in `BaseNodeModule` (correctly registered)
- Frontend calls `listWorkflows()` from `@teable/openapi` which calls `GET /base/{baseId}/workflow`
- The UI URL `/base/{baseId}/automation` maps to `BaseNodeResourceType.Workflow` via `parseBaseSlug` → renders `WorkflowPage` → `AutomationPage`
- No route mismatch or module registration issue found

### Task 2: Write automations Playwright spec

**Commit:** 74b10e4

**Spec behavior:**
1. Logs in via `storageState` from `authFile`
2. Navigates to `/` and clicks the "nXtFlow" base (skips test gracefully if not found)
3. Finds the Automations tab/link or falls back to direct URL navigation (`/base/{baseId}/automation`)
4. Asserts no 404/500 API errors for `workflow` or `automation` endpoints
5. Clicks "Test" automation entry (or first available automation)
6. Asserts trigger section (`/trigger|déclencheur/i`) is visible in the panel
7. Asserts Run button (`/run|exécuter/i`) is visible in the panel
8. Final assertion: zero automation API errors throughout the test

## Deviations from Plan

**1. [Rule 1 - Analysis] Automation route is /workflow not /automation**
- **Found during:** Task 1
- **Issue:** Plan described searching for `/automation` endpoint but the actual backend route is `/api/base/:baseId/workflow` (WorkflowController)
- **Fix:** No code change needed — the frontend correctly calls the `/workflow` endpoint. The spec intercepts both `workflow` and `automation` URL patterns to future-proof.
- **Files modified:** None

**2. [Deviation] Test.skip for empty list state**
- **Found during:** Task 2
- **Issue:** On fresh environments with no automations, clicking into an empty list would fail the panel assertion tests
- **Fix:** Added `test.skip` escape hatch when no automation entries are found, so CI doesn't hard-fail on seeded-less environments. The API error check still runs before the skip decision.

## Known Stubs

None — the spec makes real API calls with the authenticated session.

## Threat Flags

None — spec runs only over localhost and logs no secrets.

## Self-Check

- [x] `apps/nextjs-app/e2e/automations.spec.ts` — file created and committed (74b10e4)
- [x] No STATE.md or ROADMAP.md modified (parallel execution protocol)
- [x] Commit on correct branch `worktree-agent-a9a1cd8e8f1fa1c44`
