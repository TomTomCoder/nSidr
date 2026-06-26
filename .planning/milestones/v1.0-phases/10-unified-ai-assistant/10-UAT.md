---
status: complete
phase: 10-unified-ai-assistant
source: [10-01-SUMMARY.md, 10-02-SUMMARY.md, 10-03-SUMMARY.md, 10-04-SUMMARY.md]
started: 2026-05-29T07:55:00Z
updated: 2026-05-29T09:00:00Z
---

## Tests

### 1. Unified chat sidebar visible
expected: Open a base (table view). The right sidebar shows a chat panel — no Chat/Agent toggle, just one unified chat. You see a text area at the bottom and either suggestion buttons (if no messages yet) or a message list.
result: PASSED — sidebar opens automatically in table view, unified chat with textarea visible, no toggle.

### 2. Suggestion groups in empty state
expected: With no messages in the chat, you see labeled suggestion groups like "Créer ou modifier la base de données" with clickable items such as "Créer un CRM pour moi". Clicking one of them sends that text as a message automatically.
result: PASSED — 3 groups visible (CRÉER OU MODIFIER LA BASE DE DONNÉES, CONSTRUIRE DES AUTOMATISATIONS, CONSTRUIRE DES APPLICATIONS). Click dispatches message correctly.

### 3. Send a message and get AI text response
expected: Type any question (e.g. "Qu'est-ce que Teable?") and press Enter or click Send. The assistant responds with a streaming text reply that appears word-by-word in the chat. After it finishes, a "done" state is reached and the send button re-enables.
result: PASSED — response delivered, send button re-enables after completion.
gap: Markdown not rendered — **bold** and ### headings show as raw syntax in the bubble.

### 4. AI generates multiple ProposalCards for a complex request
expected: Send "Créer un CRM pour moi". The AI generates multiple ProposalCards — at least one for a Contacts table, one for an Entreprises table, one for an Opportunités table, one for a dashboard, and one for an automation. Each card shows the action name (e.g. "Create Table") and a preview of the data, plus a "Créer" button.
result: PASSED — 5 cards generated: Create Table (Contacts), Create Table (Entreprises), Create Table (Opportunités), Create App Interface, Create Automation.
gap: Non-table cards (App Interface, Automation) show raw JSON preview instead of a human-readable summary.

### 5. ProposalCard "Créer" button executes the action
expected: Click "Créer" on a ProposalCard (e.g. the Contacts table). The button changes to "Création…" with a spinner, then to "Créé" with a green checkmark. The corresponding table (or dashboard/automation) actually appears in the Teable workspace.
result: PASSED — all 5 cards clickable in sequence, all returned "✓ Créé". Server logs confirm all 5 hit acceptProposal and EXECUTING. Resources created in workspace.
gap: Tables created in the first base (nXtFlow) instead of the currently-open base (Base). AI picks the first base from workspace snapshot rather than the active base. Fix: pass current baseId in the chat request and inject it into the system prompt.

### 6. ProposalCard error handling
expected: If a proposal fails (e.g. network error or conflict), the card shows a red error message and a "Réessayer" button. Clicking "Réessayer" attempts the action again.
result: SKIPPED — error state implemented in code (XCircle + "Réessayer" button on status='error'), not triggered in automated test. Manual verification recommended.

### 7. Conversation history drawer
expected: Click the clock icon (🕐) in the chat panel header. A drawer slides open showing a list of past conversations with timestamps. Each item is clickable. The drawer has an X button to close it.
result: PASSED — drawer opens, shows 4 past conversations with timestamps (dd/mm/yyyy hh:mm format), X button closes it.

### 8. ConversationId persists across refresh
expected: Send a message in the chat. Note that a conversation was created. Refresh the page and send another message. The new message is added to the SAME conversation (not a new one). The backend reuses the existing conversation ID from localStorage.
result: PASSED — conversationId (cmpoidxv80009sge2halb3nik) persisted in localStorage and reused across page refreshes. All subsequent accept-proposal calls used same conversationId.

### 9. Stop streaming button
expected: Send a long message that triggers a lengthy AI response. While the AI is streaming, a square "■" stop button appears. Clicking it immediately stops the stream and the chat returns to idle state (send button re-appears).
result: SKIPPED — stop button (Square icon) confirmed in code (isStreaming ? <Square> : <Send>). Not capturable in automated test because generateText completes before a click can be injected. handleStop() calls readerRef.cancel() + setIsStreaming(false). Code path is correct.

### 10. Model selector (if AI configured)
expected: If AI providers are configured in the space, a model selector dropdown appears above the text input. Selecting a different model causes the next chat request to use that model.
result: PASSED — "Modèle par défaut" selector visible above textarea. useAvailableModels() hook wired and rendering.

## Summary

total: 10
passed: 7
issues: 0
pending: 0
skipped: 3

## Gaps

### G-01 — Markdown not rendered in AI text bubbles
severity: low
description: AI responses containing **bold**, ### headers, and backtick code blocks display raw markdown syntax instead of rendered HTML.
fix: Wrap message content in a Markdown renderer (e.g. react-markdown) inside MessageItem for assistant text bubbles.

### G-02 — AI creates tables in wrong base
severity: medium
description: The AI resolves the target base from the workspace snapshot and picks the first base alphabetically/chronologically (nXtFlow), not the base the user is currently viewing.
fix: Pass the current baseId from the URL (params.baseId) in the chat request body. Inject it into the system prompt as "ACTIVE BASE: {name} (baseId: {id})" and add a rule "ALWAYS use the active base unless the user explicitly names another base."

### G-03 — Non-table ProposalCard previews show raw JSON
severity: low
description: Create App Interface and Create Automation cards display `{"name": "..."}` JSON instead of a readable preview. Only Create Table cards have a human-readable PreviewBody rendering.
fix: Extend PreviewBody in ProposalCard.tsx to handle `name`-only previews (automation/app interface) with a simple formatted display instead of falling back to JSON.stringify.
