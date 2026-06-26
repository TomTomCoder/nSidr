# Teable_UI&UX.mov — UI/UX analysis vs current app

Recording: 12m43s, URL bar = **app.teable.ai** (upstream cloud product). Flow: AI-first
home → user types "Build a CRM" → agent "Guppy" inspects base, creates 5 tables + views +
sample data, then generates a CRM app. One `500 Server error` mid-run with a "Continue" button.

## What the video shows
1. **AI-first home**: greeting "Comment puis-je vous aider, The ?" (user's name), a rotating
   prompt-suggestion carousel (Organize resumes / Import & analyze feedback / Build a CRM),
   rich **template cards with screenshot thumbnails** (Task Tracker, Youtube & TikTok Thumbnail
   Generator, Leads Landing Page, SDR Cold Call Manager).
2. **Growth/onboarding chrome**: "Regarder la vidéo" CTA, "Partager son expérience — obtenir
   1000 crédits" referral, a "MISE À JOUR DU 18 MAI" changelog card, credits/usage banner.
3. **Agent "Guppy"**: live thinking text + collapsible real tool-call cards (Show Teable field
   command help, Show Teable view command help, Search Teable node tree command, Read file…),
   a persistent **"Task Progress N/4" checklist** docked above the input.
4. **Docked split view**: live Teable grid (real tables/views, colored status tags, Kanban) on
   left + chat panel on right. Model selector shows **GPT-5.5 High**.
5. **End-to-end build**: creates CRM Companies/Contacts/Deals/Activities/Notes, relationships,
   multiple views (All Contacts, Needs Follow Up, Pipeline, Open Deals, calendar/Kanban), sample
   data, and finishes with a generated CRM **app** + summary message.

## What the current codebase has (parity)
- Agent backend: `features/agent` (MCP tools, `agent-tool-registry`, `interface-tools` with node
  tree / field / view commands) — the same tool surface seen in the video.
- `components/AgentChat/`: `UnifiedChatContainer` (suggestionGroups + `ModelSelector`),
  `ThinkingStepStream`, `ToolExecutionCard`, docked `chat-panel/ChatPanel.tsx`.
- `AgentBuilder.tsx` wizard with template cards + thinking indicator.

## Gaps — what differs from the current app
| Area | Video (cloud) | Current app |
|---|---|---|
| Templates | Use-case cards w/ **screenshots** (Task Tracker, YT/TikTok, Leads LP, SDR) | Generic icon cards: Task Creator, Project Planner, Status Manager, Onboarding Guide |
| Agent identity | Branded **"Guppy"** | Generic "assistant" / "Réfléchit" |
| Task Progress | Persistent **N/4 checklist** pinned above input | Not present |
| App generation | One-shot **"Build a CRM app"** producing a finished app | Tools exist; no end-to-end app-gen / build button observed |
| Home greeting | Personalized "…aider, **{name}** ?" + rotating prompt carousel | Static suggestion groups |
| Growth UI | Watch-video, referral/1000 crédits, changelog card, credits banner | Absent |
| Layout polish | Tight grid+chat split, model = GPT-5.5 | ChatPanel exists; layout/model wiring differs |

## Note
context-mode MCP is broken on this machine (better-sqlite3 arm64/x86_64 arch mismatch) —
`ctx_*` tools error out; used Bash greps instead. ffmpeg absent; frames extracted via PyAV.
