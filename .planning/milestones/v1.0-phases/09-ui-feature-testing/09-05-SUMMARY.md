---
phase: 09-ui-feature-testing
plan: "05"
subsystem: agent-chat
tags: [e2e, playwright, agent, chat, nestjs, aimodule]
dependency_graph:
  requires:
    - 09-00  # auth fixture, testBase fixture, playwright config
  provides:
    - agent-chat-e2e-spec
  affects:
    - apps/nextjs-app/e2e/agent-chat.spec.ts
    - apps/nestjs-backend/src/features/agent/agent.module.ts
tech_stack:
  added: []
  patterns:
    - Playwright storageState authenticated test pattern
    - NestJS module dependency injection via AiModule import
key_files:
  created:
    - apps/nextjs-app/e2e/agent-chat.spec.ts
  modified:
    - apps/nestjs-backend/src/features/agent/agent.module.ts
decisions:
  - "AiModule added to AgentModule imports so AI_SERVICE and PromptService tokens resolve at startup"
  - "Chat panel opened via base dropdown 'Afficher le chat IA' or detected as already-open (default state is open)"
  - "Response detection uses .bg-muted class fallback since no data-testid present in ChatPanel JSX"
metrics:
  duration: "~8 minutes"
  completed: "2026-05-24"
  tasks_completed: 2
  files_created: 1
  files_modified: 1
---

# Phase 09 Plan 05: Agent Chat E2E Spec Summary

Playwright E2E spec for Agent Chat panel covering message send, streaming response detection, and suggestion chip interaction.

## What Was Built

- `apps/nextjs-app/e2e/agent-chat.spec.ts` — Playwright spec navigating to nXtFlow > Contacts, opening the AI chat panel, sending "Liste tous les contacts", waiting up to 15s for a streaming response, and asserting zero JS errors.
- Fixed `AgentModule` to import `AiModule` so `AI_SERVICE` and `PromptService` tokens resolve during NestJS DI startup.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 09-05-01 | Investigate Agent Chat source and fix blocking bugs | cf4411b | apps/nestjs-backend/src/features/agent/agent.module.ts |
| 09-05-02 | Write agent chat Playwright spec | a232787 | apps/nextjs-app/e2e/agent-chat.spec.ts |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical Functionality] AiModule not imported in AgentModule**
- **Found during:** Task 1 investigation
- **Issue:** `AgentExecutionService` injects `AI_SERVICE` (token from AiModule) and `PromptService` (exported from AiModule), but `AgentModule` had no `AiModule` import. This would cause NestJS dependency injection to fail at server startup with "Nest can't resolve dependencies of AgentExecutionService" errors.
- **Fix:** Added `AiModule` to `AgentModule` imports array; removed the unused `AI_SERVICE` token import from `agent.module.ts` (the token was only needed by `agent-execution.service.ts` which already imports it directly).
- **Files modified:** `apps/nestjs-backend/src/features/agent/agent.module.ts`
- **Commit:** cf4411b

### Spec Implementation Notes

The ChatPanel UI analysis revealed:
- "Nouveau Chat" is the panel **header title**, not a button — the panel is toggled via the base dropdown menu item "Afficher le chat IA"
- Default `useChatPanelStore` state is `'open'`, so in many test runs the panel will already be visible
- Suggestion chips render only when `messages.length === 0` (the empty/welcome state) — after sending a message they are replaced by message bubbles, so chip interaction is conditional on finding visible buttons

## Known Stubs

None — no placeholder data or TODO comments in the created spec.

## Threat Flags

None — the spec communicates only over localhost and introduces no new network endpoints or auth paths.

## Self-Check

- [x] `apps/nextjs-app/e2e/agent-chat.spec.ts` exists
- [x] `apps/nestjs-backend/src/features/agent/agent.module.ts` modified
- [x] Task 1 commit cf4411b exists
- [x] Task 2 commit a232787 exists

## Self-Check: PASSED
