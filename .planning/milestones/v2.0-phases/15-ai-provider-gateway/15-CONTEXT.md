# Phase 15: AI Provider Gateway — Context

<domain>
Phase delivers: a provider-agnostic AI gateway through which every AI feature
(chat, agent, AI-gen column, doc embeddings) routes — with per-provider keys,
per-model key overrides, a modality-filtered model catalog, Ollama support,
and a separate embedding provider config. **Most of the gateway is already
built** (Vercel AI SDK `createGateway` in `apps/nestjs-backend/src/features/
ai/ai.service.ts` with 11+ providers). Phase 15 is mostly verification + 3
small slices + the Phase 17 retrofit.
</domain>

<phase_boundary>
**In scope**
- GW-01: per-provider API key registration (verify existing flow covers all 11+ providers)
- GW-02: model catalog filtered by provider + modality (verify or close gap)
- GW-03: Ollama support — connect-to-existing pattern + "Install Ollama" docs link
- GW-04: embeddings route through gateway with **separate embedding provider config**
- GW-05: per-model API key override with cascade resolution
- Retrofit: verify ALL 4 callers (`ai.service`, `unified-ai.service`,
  `agent-execution.service`, `setting/open-api/setting-open-api.service`) route
  through the gateway — no provider SDK imports outside the gateway module

**Out of scope (other phases / future)**
- LiteLLM standalone proxy — deferred (see D-15-01)
- Cost dashboards, rate limit UI, per-org spend caps — future phase if needed
- AI-Gen Column polish — Phase 16
- AI surface UI simplification — Phase 20
- Replacing the model picker / settings UX entirely — Phase 23 spike
</phase_boundary>

<decisions>

### D-15-01: Gateway tech — keep Vercel AI SDK; defer LiteLLM
Keep what's already built. `ai.service.ts` uses `createGateway` from `ai`
package with `@ai-sdk/openai|anthropic|azure|cohere|deepseek|google|mistral|
togetherai|xai|openai-compatible|amazon-bedrock` + `@openrouter/ai-sdk-
provider`. Throwing away 1.5k lines of working code to gain LiteLLM's
out-of-box observability is YAGNI for now. Add a TODO line in
`.planning/MEMORY.md` for LiteLLM revisit when concrete needs surface
(per-model rate limits, request logging UI, cost tracking).

**Action for the planner:** correct ROADMAP.md Phase 15 Goal text — replace
"self-hosted LiteLLM gateway" with "Vercel AI SDK in-process gateway." The
table row is already correct.

### D-15-02: Per-model key override (GW-05) UX
**Inline in model picker.** Each model row in the picker shows status:
"Using provider default key" with an "Override" link. Click → small inline
form (key + label). Closest to point-of-use. The settings page lists provider
defaults and per-model overrides for management/audit, but editing happens
inline.

### D-15-03: Key cascade — model override → provider default → fail
**Strict 2-level cascade, fail-loud at the bottom.** No environment-variable
fallback (org has explicit settings UI for a reason — env vars hide config).
No silent provider switching. Error message must name the missing key:
e.g. `"No API key configured for model gpt-4o. Set a model override or a
provider default key in AI settings."`

### D-15-04: Embeddings (GW-04) — separate embedding provider config
**Embedding provider is a distinct space-level config**, not derived from
chat provider. Schema: space AI config gets an `embeddingProvider` field
(provider id + model id + own key cascade per D-15-03). Same cascade rule
applies; same "fail loud" semantics. **Remove the silent OpenAI fallback in
`unified-ai.service.ts:599`** — replace with a typed error when embeddings
provider isn't configured.

Rationale: Phase 21 (KG write) and Phase 18 (VectorDB RAG) both increase
embedding load; embeddings are categorically different from chat (cheaper
specialised models, e.g. text-embedding-3-small, Voyage, Cohere embed-v3);
industry-standard pattern.

### D-15-05: Ollama (GW-03) — connect-to-existing only + install link
User runs Ollama themselves; Teable stores the URL (default
`http://localhost:11434`) and lists models via `GET {ollamaUrl}/api/tags`.
The provider form shows an "Install Ollama →" link that opens
`https://ollama.com/download` in a new tab — no bundling, no process spawn,
no model-pull UI inside Teable. Matches the codebase's process-separation
philosophy and avoids the OOM risk of in-process model serving.

### D-15-06: Retrofit scope — all 4 callers, not just the agent path
Audit + retrofit ALL 4 files that currently use `generateText` / `streamText`
/ provider SDK imports directly:
1. `apps/nestjs-backend/src/features/ai/ai.service.ts`
2. `apps/nestjs-backend/src/features/ai/unified-ai.service.ts`
3. `apps/nestjs-backend/src/features/agent/agent-execution.service.ts`
4. `apps/nestjs-backend/src/features/setting/open-api/setting-open-api.service.ts`

Phase exit criterion: `grep -r "@ai-sdk/\|createOpenAI\|generateText" apps/nestjs-backend/src --include="*.ts" --exclude="*spec*"` returns hits ONLY inside the gateway module (`ai.service.ts` and its helpers). Every other consumer goes through the gateway.

### Claude's discretion
- Naming of the gateway module — keep `AiService` or rename `AiGatewayService`.
  Planner picks.
- Whether the gateway exposes a single `complete(modelId, prompt, opts)` method
  or a richer API mirroring the AI SDK (`generateText`, `streamText`,
  `embed`, `embedMany`). Planner picks based on caller needs.
- How to surface "no embedding provider configured" in the UI when a user
  triggers knowledge search (toast + link to settings, vs disabled state).
  UI-research/planner decision.

</decisions>

<canonical_refs>

### Phase / milestone
- `.planning/ROADMAP.md` — Phase 15 row (Goal text needs the "LiteLLM" → "Vercel AI SDK" correction noted in D-15-01)
- `.planning/REQUIREMENTS.md` § "AI Provider Gateway (GW)" — GW-01..04 (note: GW-05 added by 2026-06-06 amendment, must be appended here)
- `.planning/PROJECT.md` § "Key Decisions" — confirms "Vercel AI Gateway/OpenRouter not LiteLLM"

### Existing gateway code (build on, don't replace)
- `apps/nestjs-backend/src/features/ai/ai.service.ts` (1535 lines) — uses `createGateway` from `ai` package
- `apps/nestjs-backend/src/features/ai/util.ts` (177 lines) — provider factories: `createAnthropic`, `createAzure`, `createCohere`, `createDeepSeek`, `createGoogleGenerativeAI`, `createMistral`, `createOpenAI`, `createOpenAICompatible`, `createTogetherAI`, `createXai`, `createAmazonBedrock`, `createOpenRouter`
- `apps/nestjs-backend/src/features/ai/unified-ai.service.ts` (793 lines) — `generateText` for chat; line 599 has the silent OpenAI fallback for embeddings (D-15-04 removes this)
- `apps/nextjs-app/src/features/app/blocks/admin/setting/components/ai-config/LlmProviderForm.tsx` — existing UI for per-provider keys + Ollama URL

### Retrofit targets (D-15-06)
- `apps/nestjs-backend/src/features/agent/agent-execution.service.ts` — uses `generateText` directly; needs to route through gateway
- `apps/nestjs-backend/src/features/setting/open-api/setting-open-api.service.ts` — direct provider use

### Related phase contexts
- `.planning/phases/17-agent-mcp-enhancement/17-CONTEXT.md` — D-02 says "use Vercel AI SDK v6 native MCP client support" (confirms Vercel AI SDK is the chosen runtime)
- `.planning/phases/17-agent-mcp-enhancement/17-VERIFICATION.md` — frontmatter `phase_17_bugs_found_by_live_test` lists 3 open bugs the planner should NOT re-introduce while retrofitting

### Reference docs (Vercel AI SDK)
- Use Context7 (`mcp__plugin_context7_context7__query-docs`) to look up: `createGateway` API, `embed` / `embedMany` API, per-call model + key override pattern, provider modality flags
</canonical_refs>

<code_context>

### Reusable assets
- `createGateway` from `ai` package — already in `ai.service.ts:28`, just needs broader use
- Provider factory functions in `util.ts` — already cover 11 providers
- `LlmProviderForm.tsx` — existing UI to extend for GW-05 (per-model override) and the Ollama "Install →" link

### Established patterns
- Provider configs stored on `space` (per the AI config pattern referenced in `unified-ai.service.ts:142`: "No AI model configured. Please configure an AI provider in space settings.")
- Service token `AI_SERVICE` (`shared/tokens/ai.token`) — injection point for the gateway service; retrofit means callers depend on this token only

### Anti-patterns to avoid (from Phase 17 live-UAT findings)
- Do NOT use `import type` for any service injected via Nest DI (see `17-VERIFICATION.md` bug-1) — use value imports
- Do NOT introduce new provider SDK imports outside the gateway module — phase exit criterion forbids it (D-15-06)
- Do NOT add silent fallback paths (D-15-03, D-15-04) — every config gap surfaces as a typed error

</code_context>

<deferred_ideas>
- LiteLLM standalone proxy with logging/cost dashboard — revisit when observability/rate-limit needs are concrete (D-15-01)
- Ollama "launch from app" (binary bundling + model pull UI) — its own phase if ever wanted (D-15-05)
- Per-org cost caps, per-model rate limits, request audit log UI — future "AI Ops" phase
- Cross-provider model fallback ("if GPT-4 fails, try Claude 3.5 Sonnet") — future resilience phase
</deferred_ideas>

---
_Created: 2026-06-06_
_Phase 15 is mostly verification + 3 small slices + Phase 17 retrofit, not a from-scratch build._
