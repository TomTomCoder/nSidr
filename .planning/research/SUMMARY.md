# v2.0 Research Summary — AI Integrations

> Inline research (2026-06-04) for milestone v2.0. Sources: codebase analysis + web
> (MCP 2026 guides, LiteLLM/OpenRouter/Vercel AI Gateway comparisons, OpenClaw docs).

## Existing system (what to build ON, not rebuild)

**Agent system** (`apps/nestjs-backend/src/features/agent/`) is already substantial:
- `AgentMemoryService` — 7-day TTL recent + preference KV memory ✅
- `agent-tool-registry.service.ts` — registered tools incl. **table/record** (`create_record`,
  `get_record(s)`, `search_records`, `delete_record`, comments), **doc library**
  (`search_knowledge_base`), **web_search**, and OAuth (Gmail/GitHub/Slack).
- `agent-execution.service`, `agent-conversation.service`, triggers/scheduler/cron, permission guard.

**Gaps vs the "adjust agent" ask:**
- ❌ **Interface (app/dashboard) interaction** — no app/dashboard tools.
- ❌ **Plugin use** — no plugin-invocation path.
- ⚠️ **Selected doc knowledge** — `search_knowledge_base` searches ALL docs; needs scoping to
  user-selected docs/folders.
- Memory exists; verify/enhance (per-agent scoping, longer-term).

**AI layer:** `unified-ai.service` (Vercel AI SDK), `EmbeddingService` (now token-decoupled),
doc-search hybrid (pgvector + RRF). `plugin`/`plugin-panel`/`plugin-context-menu` features exist.

## Key architecture decisions (research-driven)

### 1. AI provider gateway → **LiteLLM** (self-hosted)
- Vercel AI Gateway is **managed-only (no self-host)** → unfit for self-hosted/AGPL Teable.
  OpenRouter is SaaS-only. **LiteLLM** = MIT, self-hostable, 0% markup, routes to
  OpenAI/Anthropic/Azure/**Ollama**/OpenRouter, supports **text + image + audio + embeddings**.
- Serves integration #1 (LLM library: providers × modalities), #2 (per-provider keys), #6 (Ollama)
  in ONE component. Teable already uses the Vercel AI SDK → call LiteLLM via its
  OpenAI-compatible endpoint.
- Sources: [LiteLLM alternative analysis](https://tokenmix.ai/blog/litellm-alternative-managed),
  [OpenRouter alternatives 2026](https://pinggy.io/blog/best_ai_llm_routers_openrouter_alternatives/),
  [Vercel AI Gateway vs OpenRouter](https://www.truefoundry.com/blog/vercel-ai-gateway-vs-openrouter)

### 2. Agent tools / plugins → **MCP (Model Context Protocol)**
- 2026 de-facto standard ("USB-C for AI"); decouples tools from the LLM provider (works with the
  gateway); 3 capability types: Tools, Resources, Prompts; 10k+ public servers.
- **Plugins become MCP servers/tools** → directly enables "agents use plugins." Wrap the existing
  table/doc/app tools as MCP tools so the agent surface is provider-agnostic and pluggable.
- OpenClaw's extension system is MCP-aligned → MCP unifies agent tools + plugins + OpenClaw.
- Sources: [Red Hat — effective agents with MCP](https://developers.redhat.com/articles/2026/01/08/building-effective-ai-agents-mcp),
  [MCP complete guide 2026](https://www.essamamdani.com/blog/complete-guide-model-context-protocol-mcp-2026)

### 3. OpenClaw integration → ClawHub-style extensions via MCP, on Teable's `plugin` feature
- (License + reuse spike still required — AGPL compat.)

### 4. External DBs
- **VectorDB for RAG**: optional connector (Qdrant / external pgvector / Weaviate); pgvector stays default.
- **Postgres**: federated/query access (no import) via `base-sql-executor`.

### 5. AI-generation column
- New field type; cell values generated via the gateway, constrained by an output typology
  (enum / JSON shape / regex / length / classification). Structured output / JSON-schema mode.

### 6. UI: incremental simplification of AI surfaces only.

## Watch out for
- **Memory/OOM**: route gateway calls + embeddings + external-DB + MCP servers OFF the API hot
  path (reuse the decoupled-worker pattern from v1.0). See `BOOT-OOM-INVESTIGATION.md`.
- **Security**: agent acting on tables/apps must respect the authority-matrix RBAC + per-agent
  scoping; MCP tool exposure must be permission-gated (`agent-permission.guard`).
- **AGPL**: LiteLLM (MIT) ok; verify OpenClaw license before porting its SDK.
- **Don't rebuild** the agent — extend the existing tool registry + memory.
