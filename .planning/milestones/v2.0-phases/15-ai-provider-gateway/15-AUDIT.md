---
phase: 15-ai-provider-gateway
audited: 2026-06-05
status: mostly_built
score: 3/4 requirements already implemented; 1 documented gap
method: codebase audit (audit-then-gap-fill mode)
---

# Phase 15 — AI Provider Gateway: Audit

**Finding:** Teable EE already implements the AI provider gateway. Phase 15 is a
**verify + gap-fill**, not a greenfield build.

## Requirement status

| Req | Status | Evidence |
|-----|--------|----------|
| GW-01 per-provider keys | ✅ built | `llmProviders` config (type/name/apiKey/baseUrl/models/modelConfigs). 18 providers in `apps/nestjs-backend/src/features/ai/util.ts` `modelProviders` (OpenAI, Anthropic, Azure, Google, Mistral, DeepSeek, Cohere, Bedrock, TogetherAI, xAI, Ollama, OpenAI-compatible, OpenRouter, Qwen, Zhipu, Lingyiwanwu, Claude Code, Kilocode) + Vercel AI Gateway. |
| GW-02 modality catalog | ✅ built | `setting.service.getGatewayModels()` (1h cache) fetches the gateway model list; `gateway-model.ts` types `language/embedding/image` + `visionEnable/audioEnable/videoEnable` flags + `imageModelDefinationSchema`. |
| GW-03 Ollama local | ✅ built | `ollama-ai-provider-v2` installed; `[LLMProviderType.OLLAMA]: createOllama` wired. ("Launch ollama" = external server at `baseUrl`; provider integration is done.) |
| GW-04 route through gateway | ⚠️ partial | Text/chat routes via `unified-ai.service.getModelInstance(modelKey, llmProviders)` → AI SDK. **Gap:** `generateEmbeddings()` bypasses the gateway — hardcodes `process.env.OPENAI_API_KEY` + direct `https://api.openai.com/v1/embeddings` + `text-embedding-3-small`. |

## The one real gap (GW-04): embeddings not routed

`apps/nestjs-backend/src/features/ai/unified-ai.service.ts` `generateEmbeddings(texts)`:
- No space context → cannot resolve the configured embedding provider/model.
- Called from the **decoupled doc-ingest worker** (which has no per-space AI config) and from search.

**Remediation (focused follow-up, not done here):**
1. Add a space-scoped embedding resolver: read the space `llmProviders`, pick the embedding model,
   build `provider.textEmbeddingModel(model)` and use AI SDK `embedMany`.
2. Thread spaceId/embedding-config into `EmbeddingService.generateEmbeddings` and the worker job
   payload (the worker already carries `spaceId`).
3. Keep the `OPENAI_API_KEY` path as fallback.

Deferred because: embeddings currently function (graceful keyword-only fallback when no key), and
the change touches the decoupled-worker contract — warrants its own small, tested slice rather
than a tail-of-session refactor.

## Conclusion
Phase 15 is **functionally delivered** (GW-01/02/03 ✅, GW-04 for text ✅). The embeddings-routing
gap is the only remaining item and is documented above. No greenfield gateway build is needed.
