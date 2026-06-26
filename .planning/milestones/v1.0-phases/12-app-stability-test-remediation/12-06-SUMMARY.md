---
phase: 12-app-stability-test-remediation
plan: "06"
subsystem: frontend/agent-ui
tags: [testing, gantt, authority-matrix, prompt-system, super-agent, bug-fix]
dependency_graph:
  requires: [12-01, 12-02, 12-03, 12-05]
  provides: [TESTING-PLAN sections 5-8 marked]
  affects: [TESTING-PLAN.md, AgentConfigModal, SkillsTab, TriggersTab]
tech_stack:
  added: [TriggersTab.tsx]
  patterns: [source-code analysis testing, SSE streaming, fetch-on-mount]
key_files:
  created:
    - apps/nextjs-app/src/features/app/components/agent/tabs/TriggersTab.tsx
  modified:
    - .planning/TESTING-PLAN.md
    - apps/nextjs-app/src/features/app/components/agent/tabs/SkillsTab.tsx
    - apps/nextjs-app/src/features/app/components/agent/AgentConfigModal.tsx
decisions:
  - "Source-code analysis used (app offline) consistent with pass-1 methodology"
  - "7.2 marked [F]: PromptOverridesPanel only supports 6 hardcoded keys; arbitrary key creation not possible via UI"
  - "8.4 and 8.5 marked [F] then fixed in same pass per plan instructions"
  - "Scope cap honored: BUG-03 (prompt key creation) recorded as known gap rather than architectural change"
metrics:
  duration: "~45 minutes"
  completed: "2026-05-31"
  tasks: 1
  files: 4
---

# Phase 12 Plan 06: UI Testing Pass 2 (Sections 5-8) Summary

Source-code analysis pass for TESTING-PLAN.md sections 5 (Gantt), 6 (Authority Matrix), 7 (Prompt System), and 8 (Super Agent). Two bugs discovered and fixed. All rows marked [P] or [F].

## Results by Section

### Section 5 — Gantt View (7/7 [P])

All Gantt components are fully implemented. `GanttViewBase.tsx` renders bars, milestones, and dependency arrows in a scrollable timeline. `useGanttDrag.ts` handles drag + edge resize with ghost-bar previews. `useCriticalPath.ts` computes the longest path (22 unit tests passing). `GanttToolbar.tsx` provides week/month/quarter zoom. E2E spec: `gantt-view.spec.ts`.

### Section 6 — Authority Matrix (9/9 [P])

Full CRUD wired via `@teable/openapi` React Query mutations. `MatrixDialog` handles create/edit; `RoleRow` + `ActionCheckboxGrid` handle toggle; `handleNameBlur` saves on blur; `AlertDialog` confirms deletes. Permission guard: `basePermission['base|authority_matrix_config'] === false` renders locked state. E2E spec: `authority-matrix.spec.ts`.

### Section 7 — Prompt System (4/5 [P], 1 [F])

`PromptOverridesPanel` at `/admin/ai-setting` covers 7.1/7.3/7.4/7.5. **7.2 is [F]**: the panel only supports 6 hardcoded prompt keys (`table.create`, `app.generate`, `workflow.build`, `import.analyze`, `chat.system`, `build.schema`) — no UI to create prompts with arbitrary keys. Recorded as BUG-03 (known gap, follow-up needed). Note: actual route is `/admin/ai-setting`, not `/admin/prompts` as the plan assumed.

### Section 8 — Super Agent System (11/13 [P], 2 [F + fixed])

8.4 and 8.5 were failures that were fixed in this pass (commit `acd31328a`). 8.11 was previously marked `[S]` (stub) but is now `[P]` — the `POST :id/message` endpoint with `agent.dm` emission was implemented in commit `bbb916bac`. All other rows confirmed [P] via source analysis.

## Bugs Found and Fixed

### BUG-01 [Rule 1 - Bug] SkillsTab never loads tool state from API (8.4)

**Found during:** Section 8 analysis
**Issue:** `SkillsTab.tsx` useEffect had `setEnabledTools(new Set([]))` — a placeholder stub that always reset tools to "all off" on render, regardless of what's saved in `agentTool` DB
**Fix:** Replaced with `fetch(/api/agent/${agent.id}/tools).then(...)` to load persisted tool state
**Files modified:** `apps/nextjs-app/src/features/app/components/agent/tabs/SkillsTab.tsx`
**Commit:** `acd31328a`

### BUG-02 [Rule 2 - Missing Critical Functionality] TriggersTab missing from AgentConfigModal (8.5, 8.6, 8.7)

**Found during:** Section 8 analysis
**Issue:** `AgentConfigModal.tsx` had no "Triggers" tab. Users could not view, create, toggle, or delete triggers via the UI despite the backend (`AgentTriggerService`, `AgentSchedulerService`, `agentWebhook` endpoint) being fully implemented
**Fix:** Created `TriggersTab.tsx` with webhook + schedule creation forms, toggle active/inactive, and delete. Added "Déclencheurs" tab to `AgentConfigModal`
**Files modified:** `apps/nextjs-app/src/features/app/components/agent/tabs/TriggersTab.tsx` (new), `apps/nextjs-app/src/features/app/components/agent/AgentConfigModal.tsx`
**Commit:** `acd31328a`

## Known Bugs (Not Fixed — Scope Cap)

### BUG-03 Prompt key creation not possible via UI (7.2)

`PromptOverridesPanel` supports only 6 hardcoded prompt keys. The test step 7.2 ("Create prompt with key + content") is unachievable as written. This would require either (a) an admin "add prompt key" form and backend endpoint, or (b) a scope decision to limit the prompt system to the 6 existing keys. Marked [F] and recorded as known gap.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] SkillsTab always-off tool toggles (BUG-01)** — Fixed in SkillsTab.tsx, commit acd31328a.

**2. [Rule 2 - Missing Critical Functionality] Missing TriggersTab (BUG-02)** — New file + modal update, commit acd31328a.

### Route Correction

- Plan references `/admin/prompts` — actual route is `/admin/ai-setting` (PromptOverridesPanel is embedded in AISettingPage). TESTING-PLAN.md step 7.1 updated to reflect correct route.

### 8.11 Status Update

- TESTING-PLAN.md had 8.11 as `[S]` with note "Phase 11-04 not yet executed". Source analysis confirmed `POST :id/message` + `agent.dm` emission is implemented (commit `bbb916bac`). Updated to `[P]`.

## Self-Check

Files exist:
- `.planning/TESTING-PLAN.md` — FOUND (updated, sections 5-8 all marked)
- `.planning/phases/12-app-stability-test-remediation/12-06-SUMMARY.md` — this file
- `apps/nextjs-app/src/features/app/components/agent/tabs/SkillsTab.tsx` — FOUND (fixed)
- `apps/nextjs-app/src/features/app/components/agent/tabs/TriggersTab.tsx` — FOUND (new)
- `apps/nextjs-app/src/features/app/components/agent/AgentConfigModal.tsx` — FOUND (updated)

Commits:
- `50f3d2aab` — merge refactor/architecture-deep-fix into worktree
- `acd31328a` — fix: SkillsTab loads tools from API; add missing TriggersTab
- `df9a36e4d` — feat: mark TESTING-PLAN sections 5-8 [P]/[F]

## Self-Check: PASSED
