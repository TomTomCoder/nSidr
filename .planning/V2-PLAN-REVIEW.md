# v2.0 Plan Review — plans vs current app (2026-06-05)

Verified each phase's plan assumptions against the codebase. **Headline: the plans broadly
over-scope — Teable EE already has more than the plans assumed.** Two findings change scope
materially (Phase 16, Phase 17), plus reuse wins on 18/19/20.

## Per-phase improvements

### Phase 15 — AI Gateway · CONFIRMED (no change)
Gateway/providers/modality/Ollama built. Only gap = **GW-04 embeddings bypass the gateway**
(`generateEmbeddings` hardcodes `OPENAI_API_KEY`; util/`getModelInstance` has no embedding path).
✔ Plan correct. Keep as a small slice.

### Phase 16 — AI Column · **MAJOR SCOPE CUT** (near-complete)
Evidence: `packages/core/.../field/ai-config/{text,single-select,multiple-select,rating,date,
attachment}.ts` + generation types **summary / translation / extraction / classification /
customization**; `derivate/ai.field.ts` (`prompt` + `sourceFieldIds`); backend generation wired
in `field-supplement.service` (`getAiConfigSchema(type)` validation), `ai-field.dto.ts`,
`field-converting.service`.
→ **AICOL-01/02/03 are essentially built.** "Output typology" already = per-output-field-type
ai-config (single-select AI = enum/classification, rating/number, date, text). 
**Improvement:** demote Phase 16 from "build" to **audit + tiny gaps** (explicit JSON-shape output
if wanted; on-demand regenerate UX) and **fold those into Phase 20's AI-column panel.** Removes a
whole build phase.

### Phase 17 — Agent MCP · **RISK CORRECTION** (keystone)
Confirmed: no MCP in the backend; agent has no interface/plugin tools; `search_knowledge_base`
unscoped — so the build is real. **But the plan's assumption is wrong:** the installed
**`ai@6.0.169` does NOT export an MCP client** (`createMCPClient`/`experimental_createMCPClient`
absent from its `index.d.ts`).
**Improvement:** use **`@modelcontextprotocol/sdk`** (official; Server + Client + StreamableHTTP)
for BOTH the Teable MCP server and the agent's MCP client, then adapt MCP tools → AI-SDK tool
defs with a thin adapter (the `getToolsForAgent` seam). Add a 1-hour spike at the top of Wave 1 to
pin the MCP transport/version. This de-risks the keystone phase.

### Phase 18 — External DB · **REUSE WINS** (shrink connector/sync)
Found reusable: `OAuthIntegrationFieldSync` (+`syncDirection`, Phase 6) = an existing external↔field
sync pattern; `base-sql-executor.createConnection()` already builds external `PrismaClient`/knex
connections. 
**Improvement:** build the external-Postgres connector on `createConnection` + the field-sync
pattern instead of from scratch (shrinks 18-04). The **virtual-table layer (18-05) remains the
large, genuinely-new piece** — keep it as the scope anchor / consider splitting into its own
sub-milestone. VectorDB sync (18-03) can mirror the field-sync direction concept.

### Phase 19 — Extension System · minor reuse (sound)
Plugin model already has `secret`/`maskedSecret`/`positions`/`status`/`url`/`i18n` + install infra.
**Improvement:** reuse `secret`/`maskedSecret` for extension auth and `positions` for surface; the
plan's "extend Plugin + manifest" is correct. No scope change. (Still gated on the EXT-01 license spike.)

### Phase 20 — AI-surface UI · **EVEN SMALLER** (assembly, not build)
**25** existing `ai-config/` components incl. `LlmproviderManage`, `LlmProviderForm`,
`BatchTestModels`, `TestButton`, `GatewayModelPickerDialog`, `AiModelSelect`, `PromptOverridesPanel`,
`DefaultModelsStep`, `ModelTagInput`.
**Improvement:** the hub is mostly **composition of existing pieces** — inline key list ≈
`LlmproviderManage` + `TestButton`; picker ≈ fold `GatewayModelPickerDialog`+`AiModelSelect`. Lower
risk/effort than planned. Add the Phase-16 AI-column panel here.

## Cross-cutting improvements
1. **Re-sequence:** 16 isn't a phase → fold into 20. New effective build set = **17 (keystone) → 18
   → 19 → 20 (incl. AI-column UI) + GW-04 slice.** Fewer phases, clearer.
2. **MCP SDK, not AI-SDK MCP:** standardize on `@modelcontextprotocol/sdk` across 17 & 19 (the AI
   SDK v6 client isn't there). Single dependency, server+client+transport.
3. **"Verify-live-first" gate per phase:** every plan was written WITHOUT a running app (memory-
   constrained). Add a first step to each execution: boot the app and exercise the EXISTING behavior
   (gateway call, AI-field generate, plugin install) before building gaps — so we patch real gaps,
   not assumed ones. This is the single highest-value process fix (it's what saved us on 14/15/16).
4. **Keep heavy paths off the API hot path** (MCP servers, sync, introspection) — reuse the
   decoupled-worker pattern; already noted, reaffirm given the OOM history.

## Net effect
- Drop a phase (16 → folded into 20).
- De-risk the keystone (17 MCP SDK choice).
- Shrink 18 connector + 20 (reuse), leaving 18's virtual-tables as the main new build.
- Add a live-verify gate so execution targets real gaps.
