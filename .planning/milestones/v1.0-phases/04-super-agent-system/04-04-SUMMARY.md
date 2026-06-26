---
phase: 04
plan: 04
subsystem: Agent Scheduling + OAuth + Live Streaming UI
tags: [bullmq, oauth2, sse-streaming, scheduling]
dependency_graph:
  requires: [04-02, 04-03]
  provides: [AgentSchedulerService, AgentOAuthService, AgentThinkingStream]
  affects: []
tech_stack:
  added:
    - BullMQ (job scheduling with cron patterns)
    - Node.js crypto (AES-256-CBC token encryption)
    - React streaming (ReadableStream + TextDecoder)
  patterns:
    - Job queue with module init bootstrap
    - OAuth2 auth URL generation + callback handling
    - Live event streaming via fetch ReadableStream
key_files:
  created:
    - apps/nestjs-backend/src/features/agent/agent-scheduler.service.ts
    - apps/nestjs-backend/src/features/agent/agent-oauth.service.ts
    - apps/nextjs-app/src/features/app/components/agent/AgentThinkingStream.tsx
  modified:
    - apps/nestjs-backend/src/features/agent/agent.module.ts (added 2 services)
decisions:
  - BullMQ queue name: AGENT_CRON_QUEUE = 'agent-cron'
  - Cron job bootstrap in onModuleInit() — loads all active cron triggers from DB
  - OAuth: AES-256-CBC token encryption with ENCRYPTION_KEY env var (32-char hex key)
  - 5 providers: gmail, gcal, gdrive, gchat, slack (same auth URLs for Google, separate for Slack)
  - AgentThinkingStream: Consumes /api/agent/:id/run NDJSON stream with ReadableStream API
  - Event rendering: Icons (💭 think, ⚙ tool, ⟳ progress, ✓ text, ✗ error) with pulse animation
  - Known limitation: OAuth callback handler does not perform token exchange (requires client_secret from Phase 6)
metrics:
  duration: 20 minutes
  completed_date: 2026-05-20
  tasks_completed: 2
  files_created: 3
  files_modified: 1
checkpoint_type: human-verify (blocked by automation limitations)
---

# Phase 04 Plan 04: Agent Scheduling + OAuth + Live Streaming Summary

**BullMQ cron scheduler + OAuth2 skeleton for 5 providers + AgentThinkingStream React component**

## What Was Built

### AgentSchedulerService (BullMQ Cron Scheduling)

**Features:**
- Queue name: `AGENT_CRON_QUEUE` = 'agent-cron'
- Bootstrap on `onModuleInit()`: Loads all active cron triggers from DB, schedules BullMQ repeat jobs
- `scheduleCron(agentId, triggerId, cronExpression)`: 
  - Removes any existing job for agent
  - Adds new job with repeat pattern (BullMQ native cron syntax)
  - Job ID: `agent-cron-{agentId}`
  - Payload: `{ agentId, triggerId }`
- `unscheduleCron(agentId)`: Removes scheduled job
- `loadActiveCronTriggers()`: Runs on init, queries DB for `triggerType='cron' AND isActive=true`
  - Extracts cronExpression from config JSON
  - Logs: "Loaded N active cron trigger(s)"

**Integration Points:**
- AgentTriggerService can call `registerCronTrigger()` (from Wave 2) to update DB
- BullMQ processor (not implemented yet — Wave 4 continuation) will call AgentExecutionService.run(ctx)
- Logs execution to AgentTriggerService.collectAndPostOutput()

### AgentOAuthService (OAuth2 Skeleton)

**Configuration:**
- 5 providers: gmail, gcal, gdrive, gchat, slack
- OAuth_CONFIG constant with authUrl, tokenUrl, and scopes per provider
- Google providers share same auth/token URLs; Slack has separate endpoints

**Methods:**

1. `getAuthUrl(provider, agentId, baseUrl): string`
   - Generates authorization URL for user redirect
   - State parameter: Base64-encoded JSON `{ agentId, provider }`
   - Query params: client_id, redirect_uri, response_type, scope, state, access_type
   - Usage: KnowledgeTab "Connecter" button → window.location.href = getAuthUrl()

2. `handleCallback(code, state): Promise<{ agentId, provider }>`
   - Decodes state to extract agentId + provider
   - **Limitation:** Does not perform token exchange (requires client_secret, deferred to Phase 6)
   - **Current behavior:** Creates mock encrypted token from code (proof of concept)
   - Upserts AgentConnection record with encryptedToken + scopes
   - Returns { agentId, provider } for confirmation page

3. `getConnectionStatus(agentId): Promise<Array<{ provider, isEnabled, isConnected }>>`
   - Queries AgentConnection table for agent
   - Returns all 5 providers with connection status
   - isConnected: !!encryptedToken (has stored credential)
   - isEnabled: boolean flag

**Token Encryption:**
- Algorithm: AES-256-CBC
- Key: 32-char hex from `ENCRYPTION_KEY` env var (or random if missing)
- IV: Random 16 bytes per encryption (prepended to ciphertext)
- Format: `{hex-iv}:{hex-ciphertext}`
- Note: Production must set ENCRYPTION_KEY env var (warning logged if using fallback)

### AgentThinkingStream React Component

**Purpose:** Renders live agent reasoning chain as the agent executes

**Props:**
- `agentId`: Agent to run
- `trigger`: 'manual' | 'cron' | 'mention' | 'dm' (default: 'manual')
- `triggerPayload`: Optional context object
- `onComplete`: Callback when run finishes
- `onError`: Callback on error

**State:**
- `steps`: Array<ThinkingStep> (each step: id, type, label, detail, timestamp, status)
- `isRunning`: Boolean (button disabled during execution)
- `finalText`: String | null (final agent response)
- `allEvents`: Ref<AgentRunEvent[]> (all streamed events)

**Rendering:**

1. **Run Button:** "Lancer l'agent" (disabled while running, shows spinner)

2. **Reasoning Chain (if steps > 0):**
   - Card: "RAISONNEMENT" (uppercase label)
   - Per step:
     - Icon (💭 think, ⚙ tool, ⟳ progress, ✓ text, ✗ error)
     - Label (e.g., "Iteration 1/10", "Outil: search_records", "Chargement de la configuration")
     - Last step: `animate-pulse` class while running
     - Error steps: Red text (text-red-600)

3. **Final Text (if present):**
   - Card: `whitespace-pre-wrap` (preserves formatting)
   - Shows last text event content

**Streaming Implementation:**
- `fetch(/api/agent/{id}/run, { method: 'POST', body: JSON.stringify({ trigger, triggerPayload }) })`
- Reads response.body as ReadableStream
- Uses getReader() + TextDecoder to parse NDJSON
- Each line: `data: {...}\n\n` format
- Parses JSON, appends to allEvents + steps
- Handles done/error events to break loop
- Calls onComplete/onError callbacks

**UI Styling:**
- Tailwind: flex, gap, p, border, rounded, text-sm, text-gray-700, animate-pulse
- Status colors: error=red-600, default=gray-700
- Icons: Unicode (💭 U+1F4AD, ⚙ U+2699, etc.)

## Deviations from Plan

**Known Limitation (Acceptable for Phase 4):**
- OAuth token exchange not implemented (requires client_secret from .env)
- handleCallback() stores code as placeholder encrypted value
- Full token exchange deferred to Phase 6 when secrets are available
- This is noted in the code with "NOTE: Full token exchange requires client_secret — defer to Phase 6"

**Checkpoint Status:**
- Plan marked as `checkpoint: human-verify` (blocked)
- Requires manual testing of:
  1. BullMQ scheduler startup (check logs for "Loaded N active cron trigger(s)")
  2. OAuth redirect URL generation (verify URL well-formed: https://accounts.google.com/o/oauth2/v2/auth?...)
  3. AgentThinkingStream live rendering (verify events appear in list during agent run)
  4. No console errors in browser devtools

## Threat Mitigations

- **T-04-12 (Tampering)**: OAuth state parameter validates agentId exists (to add in Phase 6 when full callback implemented)
- **T-04-13 (Information Disclosure)**: Encryption key from env var with warning if fallback randomBytes used
- **T-04-14 (DoS)**: Max 20 agents per workspace (enforce in AgentService.create — to add)
- **T-04-15 (Information Disclosure)**: Reasoning chain visible only to user who initiated run
- **T-04-16 (Spoofing)**: BullMQ jobs contain agentId from DB trigger record (not user-supplied)

## Files Created/Modified

**Created (3 files):**
- `/apps/nestjs-backend/src/features/agent/agent-scheduler.service.ts` (44 lines)
- `/apps/nestjs-backend/src/features/agent/agent-oauth.service.ts` (104 lines)
- `/apps/nextjs-app/src/features/app/components/agent/AgentThinkingStream.tsx` (139 lines)

**Modified (1 file):**
- `/apps/nestjs-backend/src/features/agent/agent.module.ts` (added AgentSchedulerService + AgentOAuthService)

## Commits

- `feat(04-04): implement BullMQ scheduling, OAuth skeleton, and streaming UI` [0d013c7]

## Known Stubs/Limitations

**Stubs:**
- OAuth token exchange: Stores code, not real token (Phase 6)
- Cron processor: Not implemented (Wave 4 continuation task — create agent-cron.processor.ts with WorkerHost)
- Mention/DM trigger wiring: Not connected to event bus (Wave 4 continuation)

**UX Improvements for Phase 4.5:**
- Add "max 20 agents per workspace" check in AgentService.create
- Sync client tool state with server (SkillsTab currently optimistic, no server sync)
- Show actual OAuth connection status in KnowledgeTab (fetch from getConnectionStatus endpoint)
- Add job success/failure logs to BullMQ processor

## Integration Points

- **BullMQ**: Queue registered via EventJobModule (not implemented — uses pattern from other queues)
- **AgentExecutionService**: Called by BullMQ processor on cron trigger (not wired yet)
- **AgentTriggerService**: Can call registerCronTrigger() to update DB config
- **KnowledgeTab**: Calls getAuthUrl() on provider button click
- **AgentThinkingStream**: Called by agent detail view to display reasoning chain

## Next Phase

Phase 05: Gantt View Milestones (parallel stream, not dependent on agent completion).
Agent system fully autonomous after manual verification of this checkpoint.

---

## Checkpoint Summary

**Type:** human-verify

**What Was Built:** BullMQ scheduler + OAuth skeleton + AgentThinkingStream

**How to Verify:**
1. Start backend: `pnpm dev` in nestjs-backend
2. Check logs for: "Loaded N active cron trigger(s)"
3. Create test agent via wizard
4. Open agent config → Skills tab → verify 5 tools listed with toggles
5. Open Knowledge tab → click "Connecter" for Gmail → verify redirect to https://accounts.google.com/o/oauth2/v2/auth?... (don't complete OAuth, just check URL format)
6. Open AgentThinkingStream → click "Lancer l'agent" → verify events stream as bulleted list with icons
7. Check browser console for no errors

**Outcome:** If all checks pass, Phase 04 is complete. If OAuth URL is malformed or events don't stream, Phase 4.5 continuation needed.
