---
gsd_state_version: 1.0
milestone: null
milestone_name: null
status: between_milestones
last_updated: "2026-06-14T17:00:00.000Z"
last_activity: 2026-06-14
last_milestone: v2.0
last_milestone_completed: 2026-06-14
progress:
  total_phases: 0
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Current Phase

Milestone v1.0 — COMPLETE. All 14 phases done and verified. Next: v2.0 "AI Integrations"
(scope staged in `.planning/MILESTONE-CONTEXT.md` — run `/gsd-new-milestone`).

## Status

Phase 14 (Process Separation) verified PASSED 2026-06-04 — separated stack (web :3000 + API
:3002) confirmed live + regression spec passing. This closes milestone v1.0.

Closeout work 2026-06-04: reconstructed PROJECT.md (was missing); confirmed Phase 13 security
gaps closed (CR-01/02 IDOR scoping, CR-03 XSS via rehype-sanitize); hardened the doc library
(boot-OOM root cause `V2_COMPUTED_UPDATE_MODE=sync` fixed, ingest-worker decoupling,
markdown-aware chunking, RRF hybrid search, per-doc progress bar) — see
`apps/nestjs-backend/DOC-LIBRARY-INVESTIGATION.md` and `BOOT-OOM-INVESTIGATION.md`.

## Phase 9 Plans

| Plan | Wave | Status | Objective |
|------|------|--------|-----------|
| 09-00-PLAN.md | 0 | complete | Playwright setup + auth fixtures + testBase fixture |
| 09-01-PLAN.md | 1 | complete | Grid view E2E tests |
| 09-02-PLAN.md | 2 | complete | Form and Gallery view E2E tests |
| 09-03-PLAN.md | 2 | complete | Kanban and Calendar view E2E tests |
| 09-04-PLAN.md | 2 | complete | Gantt view E2E tests + source bug fix |
| 09-05-PLAN.md | 3 | complete | Database view E2E tests |
| 09-06-PLAN.md | 3 | complete | Share base E2E tests |
| 09-07-PLAN.md | 3 | complete | API access E2E tests |
| 09-08-PLAN.md | 4 | complete | Full sweep smoke tests (space, base, trash, admin, authority matrix) |
| 09-09-PLAN.md | 2 | complete | Authority matrix E2E tests |
| 09-10-PLAN.md | 2 | complete | View type switching E2E tests |
| 09-11-PLAN.md | 3 | complete | Integrations (OAuth) E2E tests |
| 09-12-PLAN.md | 1 | complete | Gap closure: Playwright port fix (3001→3000, env-var override) |

## Phase 7 Plans (Reference)

| Plan | Wave | Status | Objective |
|------|------|--------|-----------|
| 07-01-PLAN.md | 1 | complete | pgvector extension + ImportedDoc/DocChunk/DocLink Prisma models + EmbeddingService |
| 07-02-PLAN.md | 2 | complete | DocIngestionService (chunking + embeddings) + LinkExtractorService + DocIngestController + BullMQ processor |
| 07-03-PLAN.md | 3 | complete | DocSearchService (semantic/keyword/hybrid) + DocGraphService + DocSearchController + OpenAPI types |
| 07-04-PLAN.md | 4 | complete | DocSearchPanel + DocImportPanel + DocViewer + DocLibrary + partial sidebar/Cmd+Shift+K |

## Accumulated Context

### Roadmap Evolution

- Phase 1 added: Implémenter la feature matrice d'autorité complète dans Teable
- Phase 5 planned: Gantt view type with timeline bars, milestones, dependency arrows, critical path, drag-to-reschedule
- Phase 6 planned: OAuth2 integration library for Gmail, Google Calendar, Google Chat, Google Drive, Google Meet, and Slack
- Phase 7 planned: Doc import pipeline with pgvector semantic search, link graph, and knowledge base UI

### Key Findings

- Infrastructure existante : IDs (AuthorityMatrix, AuthorityMatrixRole), permission action 'base|authority_matrix_config', strings i18n
- Stub frontend : apps/nextjs-app/src/features/app/blocks/AuthorityMatrix.tsx
- Page route : apps/nextjs-app/src/pages/base/[baseId]/authority-matrix.tsx
- Aucune table DB, aucun endpoint backend, aucune UI fonctionnelle

### Phase 5 Architecture Decisions

- No new Prisma model — Gantt options stored in existing view.options JSON column
- No heavy chart library — build timeline with plain HTML/CSS/SVG (Teable pattern)
- GanttViewOptions: 9 fields — startField, endField, titleField, dependencyField, colorField, milestoneThreshold (default 0), showCriticalPath (default false), showWeekends (default true), timeScale (default 'week')
- Critical path: client-side Kahn's topo-sort longest-path algorithm
- Drag interactions: mouse events with ghost bar during drag, record update API on mouseup
- Dependency field: supports both linked-record fields and comma-separated text field

### Phase 6 Architecture Decisions

- Integration model is workspace-scoped (spaceId FK), not agent-scoped — allows standalone use without Phase 4
- Token encryption: AES-256-CBC at application layer, key from INTEGRATION_SECRET_KEY env var (32+ chars)
- PKCE (S256) used for all OAuth2 flows — code verifier stored in httpOnly cookie for callback
- Google providers share one client_id (GOOGLE_CLIENT_ID); Slack has separate SLACK_CLIENT_ID
- Provider clients are thin HTTP wrappers (no SDK dependencies) — use native fetch (Node 18+)
- createProviderClient() factory in providers/index.ts is the integration point for Phase 4 AgentToolRegistry
- Webhook signature verification: Slack uses HMAC-SHA256 (X-Slack-Signature); Google uses Pub/Sub HTTPS + channel token
- Field sync uses IntegrationFieldSync Prisma model with syncDirection enum (IMPORT/EXPORT/BIDIRECTIONAL)
- Admin UI: OAuth Connect opens popup window; parent listens for postMessage { type: 'oauth_success' }

### Phase 7 Architecture Decisions

- pgvector added via Prisma previewFeatures + extensions — requires `CREATE EXTENSION IF NOT EXISTS vector` as superuser before db push
- Embedding model: OpenAI text-embedding-3-small (1536 dimensions); configurable via EMBEDDING_DIMENSIONS env var
- EmbeddingService always calls OpenAI directly (not the configured AI provider) — OPENAI_API_KEY required separately
- Chunking: 512-token sliding window (~384 words), 50-token overlap (~37 words), word-count approximation (1 token = 0.75 words)
- DocChunk.embedding stored as Unsupported("vector(1536)") — all vector reads/writes use prisma.$queryRaw / $executeRaw
- Vector similarity: cosine distance via <=> operator; score = 1 - distance
- Hybrid search: 0.7 * semantic score + 0.3 * keyword score, deduplicated by chunkId
- Link graph: [[wiki links]] and [text](url) extracted by regex; internal links resolved by title match within spaceId
- BullMQ queue name: DOC_INGEST — processor runs ingestion async (does not block HTTP response)
- PDF text extraction: pdf-parse npm package (CommonJS, requires dynamic require)
- UI: doc content always rendered as plain text (<pre> tag, React text nodes) — never as HTML to prevent XSS
- Cmd+Shift+K global shortcut opens DocSearchPanel

## Current Position

Phase: 24 (agent-runtime-hardening) — EXECUTING
Plan: 3 of 6
Status: Ready to execute
  **16 DROPPED — already built, folded into 20.** 17/18/19/20 have CONTEXT + DISCUSSION-LOG + PLAN
  (17/18/20 patched). Only execution remains.
Last activity: 2026-06-13

## Phase 17 Decisions (Wave 2 -- 17-03)

- toolManifest inline executor returns structured stub in Wave 2; Wave 3 replaces with real plugin HTTP call
- mcpUrl plugins reuse aggregator _connectAndList — no second tool-merging path
- namespace: plugin_{pluginId} prefix to distinguish plugin-sourced tools from AgentMcpServer tools
- T-17-07: discoverPluginTools scoped to PluginInstall.baseId (DB-side); T-17-08: mcpUrl from DB record only

## Phase 17 Decisions (Wave 0 -- 17-00)

- Transport: StreamableHTTP chosen over stdio (memory-constrained box, no child processes)
- MCP client: SDK Client directly -- ai@6.0.169 has NO MCP client export
- SDK pin: @modelcontextprotocol/sdk@1.29.0 exact (locked for all Wave 1+ plans)
- Name prefix scheme: mcp__{serverId}__{toolName} (double-underscore delimiter)
- Live-verify of existing agent loop: deferred (human_needed) -- unit test is the automated gate

**Execution order (focused sessions; each starts with Wave 0 verify-live; app up to test live):**

1. Phase 17 (keystone) — Agent MCP via **`@modelcontextprotocol/sdk`** (server+client), plugin/interface tools, selected-doc scoping, memory. `/gsd:execute-phase 17`
2. Phase 18 — External DB: Qdrant query+sync (reuse field-sync) + external-Postgres **virtual tables** (the big new piece). Depends on 17.
3. Phase 19 — Extension system (EXT-01 spike first; native MCP manifest; install-by-URL + consent + SSRF). Depends on 17.
4. Phase 20 — AI-surface UI hub (mostly assembly of 25 ai-config components) + **AI-column panel (former Phase 16 gaps)**; recommend `/gsd:ui-phase 20` first.
+ GW-04 embeddings-routing slice (Phase 15).

Each phase plan lists waves + a live test strategy. Needs ~3–4 GB free (backend boot is heavy).
