# Agent UI/UX & Workflow — Live Walkthrough + Fixes

**Date:** 2026-06-16
**Live demo agents:**
- `cmqg7blzv001gsg5xv7lmvheh` — *Résumés Bot 🛠️* (created via chip-name path, **before fixes** — has `baseId: ""`, description overwritten)
- `cmqg89k0v001ysg5xzb5v7pdy` — *Sentinelle Tâches Pro 📋* (created via free-text name, **after fixes** — full payload correct)

## Two creation surfaces

| Surface | Route | UI | Status |
|---|---|---|---|
| **Conversational creator** | `/agent/new` | Single freeform input → AI-led 3-step dialog (Alignement → Personnalisation → Confirmation) with suggestion chips. Now restyled to match the in-base `UnifiedChatContainer` hero (icon + title, gradient-ring input with mode tabs inside, 4-column compact card grid, gradient category chips) in a 16:9 frame. | Active |
| **Wizard modal** | `AgentConfigModal` opened from `ChatPanel` (sidebar) | 3-step form with explicit fields | Legacy / parallel path |

Both post to `POST /api/agent`.

## How the agent runs — the SOTA loop

`apps/nestjs-backend/src/features/agent/agent-execution.service.ts` — `run()` is an SSE async generator:

1. Load agent + tools (`toolRegistry.getToolsForAgent`).
2. Resolve conversation (new or resumed multi-turn).
3. Resolve model — `agent.modelKey` → base AI config → guarded error.
4. Load memory (`recentMemories` + `preferences`) and build a 3-tier system prompt: `prompt:agent:<id>.system` override → `agent.instructions` → `'You are a helpful agent.'`
5. Build message history (system + prior turns + synthetic HITL resume + new user message).
6. **Plan-and-execute** (when `planningEnabled` — default `true`) — `agent-planner.service.ts` produces a step list.
7. **ReAct loop** — up to `maxIterations` (default 10), streaming `progress` / `tool_call` / `tool_result` events.
8. **HITL** — tools needing approval pause with `status: waiting_for_approval`. UI shows `<ApprovalCard>`; the controller `POST :id/conversation/:conversationId/approve` injects a synthetic user message and resumes.
9. **Reflexion** — up to `maxReflections` (default 2) self-critique passes.
10. **Multi-agent delegation** via the `delegate_to_agent` tool — sub-runs stream events into the parent SSE.

The chat UI (`AgentChat.tsx` / `ChatContainer.tsx`) consumes the SSE and renders each event type plus the inline `<ApprovalCard>` when suspended.

## Where the agent surfaces elsewhere

- **Sidebar `ChatPanel`** inside a base — lists `agents` for that base (`GET /api/agent?baseId=…`); main consumption surface.
- **`ConversationHistory` + `UnifiedChatContainer`** — shared chat shell used by both the in-base AI assistant and the agent thread.
- **Triggers tab** (`TriggersTab.tsx`) — schedule/webhook activation.
- **Knowledge tab** — attach docs / doc-folders so `search_knowledge_base` can RAG over them.

## Bugs found + how each was fixed

### Bug #1 — `/agent/[id]` crashed with `useSession` null context

**Symptom:** Runtime TypeError at `AgentProfilePanel.tsx:340` — `Cannot destructure property 'user' of useContext(SessionContext) as it is null`. The agent existed in the DB but couldn't be viewed.
**Root cause:** `pages/agent/[id].tsx` rendered `ChatContainer` directly. `AgentProfilePanel` (inside `ChatContainer`) calls `useSession()`, but the page wasn't wrapped in `AppProvider` + `SessionProvider`. Compare to `pages/oauth/decision.tsx` which uses the `getLayout` pattern with both providers.
**Fix:** Rewrote `pages/agent/[id].tsx` to follow the `NextPageWithLayout` pattern — `getLayout` wraps the page in `AppProvider` + `SessionProvider`, `getServerSideProps` chains `withEnv(ensureLogin(...))` so `user` ends up in `pageProps`, `useSdkLocale()` + `getTranslationsProps` provide i18n.
**Verified:** Agent detail page now renders fully (avatar, instructions, triggers, chat area, Lancer l'agent button).

### Bug #2 — `baseId: ""` made the agent unrunnable

**Symptom:** Agents created via the conversational wizard had empty `baseId`. The run endpoint would reject with *"AI is not configured for this base"* because both tool registry and model resolution key off `baseId`.
**Root cause:** `pages/agent/new.tsx` only read `baseId` from `?baseId=` query. The freeform creator page exists outside any base context, so the param is rarely present.
**Fix:** Switched to `withAuthSSR` so an authenticated `SsrApi` is injected. SSR now picks `baseId` from query first, then falls back to `ssrApi.getBaseList()[0].id` (the user's first base). The wizard always receives a populated `baseId`.
**Verified:** New agent has `baseId: "bseSFaCKLbly1NATs9b"`.

### Bug #3 — free-text name at step 2 didn't advance the wizard

**Symptom:** Typing a custom name in the reply box at the Personnalisation step and hitting Enter added a chat bubble but never progressed to step 3. Only clicking a name chip worked.
**Root cause:** `handleSend()` in `AgentBuilder.tsx` had branches for `mode === 'ask'` (brainstorm) and `phase === 'entry'` (startAlign), then fell through to `push({ role: 'user', content: text })` for all other phases — including `personalize`, which should call `pickName(text)`.
**Fix:** Added an explicit `phase === 'personalize'` branch in `handleSend` that calls `void pickName(text)`.
**Verified:** Typing *"Sentinelle Tâches Pro 📋"* now advances to step 3 and creates the agent with that exact name.

### Bug #4 — `description` was the priority-chip text, not the user's goal

**Symptom:** The `description` field on the agent record was the capability chip (*"Résumés d'activité réguliers"*) instead of the user's typed prompt. The actual goal only existed inside the `instructions` template.
**Root cause:** `createAgent()` posted `description: cap || goal` — the chip always wins when present.
**Fix:** Inverted to `description: goal || cap`. The chip text already appears inside `instructions` as the *Tâche prioritaire* line, so it's not lost.
**Verified:** New agent's description is *"Un agent qui surveille les tâches en retard et m'envoie un résumé hebdomadaire."* — the actual user prompt.

## Files changed

| Bug | File | Change |
|---|---|---|
| #1 | `apps/nextjs-app/src/pages/agent/[id].tsx` | Rewrote to use `NextPageWithLayout` + `AppProvider` + `SessionProvider` + `withEnv(ensureLogin(...))` |
| #2 | `apps/nextjs-app/src/pages/agent/new.tsx` | Rewrote to use `withAuthSSR` + default `baseId` from `ssrApi.getBaseList()[0].id` |
| #3 + #4 | `apps/nextjs-app/src/components/AgentChat/AgentBuilder.tsx` | `handleSend` `phase === 'personalize'` branch; `createAgent` description fallback order |
| (earlier) | `apps/nextjs-app/src/components/AgentChat/AgentBuilder.tsx` | Restyled entry view to match `UnifiedChatContainer` hero in a 16:9 frame |
