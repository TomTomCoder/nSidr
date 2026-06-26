# Phase 20: AI-Surface UI Simplification - Context

**Gathered:** 2026-06-05
**Status:** Ready for planning

<domain>
## Phase Boundary

**Incrementally** simplify the EXISTING AI config UI — model picker, per-provider keys, and
AI-column config — in place (no ground-up rebuild). Requirements: UI-01, UI-02.

**Build ON / simplify** (already exists): `admin/setting/components/ai-config/*` (AISetupWizard,
AiFormWizard, AIProviderCard, LLMApiConfigStep, AiModelSelect, GatewayModelPickerDialog,
AIModelPreferencesCard, AIControlCard, AIConfigurationStatus) + `space-setting/integration/
components/AiConfig.tsx`. Reuse components; restructure presentation.
</domain>

<decisions>
## Implementation Decisions

### Consolidation scope (UI-01)
- **D-01:** **One AI settings hub.** Collapse the scattered wizards/cards into a single streamlined
  AI settings panel with tabs: **Providers & Keys / Models / Defaults**. Reuse existing components
  (incremental — not a rewrite). Keep admin (instance providers) vs space (overrides) distinction,
  but present them consistently in the same hub layout. Replaces multi-step wizards with one panel.

### Model picker (UI-01)
- **D-02:** **Single searchable picker** replacing the wizard/`GatewayModelPickerDialog` flow:
  filter by **provider + modality** (text/image/audio/embedding), **recommended** badges,
  recently-used. One screen, not multi-step.

### Per-provider key management (UI-01)
- **D-03:** **Inline per-provider key list** — each row: provider, masked key, **test** button,
  status, remove; add-provider inline. Replaces `AISetupWizard`/`LLMApiConfigStep` multi-step flow.

### AI-column config (UI-02)
- **D-04:** **One compact panel** for the AI field: prompt + source columns + model + **output
  typology** (free text / enum / number / JSON shape) + a **live preview of one row**. Replaces
  multi-step field config.

### Claude's Discretion
- Exact tab layout, component reuse vs light refactor, shadcn patterns, where the hub lives in
  nav, i18n keys. Keep changes incremental and consistent with existing Teable UI conventions.
- Whether to generate a UI-SPEC via `/gsd:ui-phase 20` before planning (recommended for a UI phase).
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase / milestone
- `.planning/REQUIREMENTS.md` — UI-01/02
- `.planning/ROADMAP.md` §"Phase 20" — goal + success criteria
- `.planning/phases/15-ai-provider-gateway/15-AUDIT.md` — gateway/providers/modality already built (this UI configures them)

### Existing UI (simplify these)
- `apps/nextjs-app/src/features/app/blocks/admin/setting/AISettingPage.tsx`
- `apps/nextjs-app/src/features/app/blocks/admin/setting/components/ai-config/` — AISetupWizard, AiFormWizard, AIProviderCard, LLMApiConfigStep, AiModelSelect, GatewayModelPickerDialog, AIModelPreferencesCard, AIControlCard, AIConfigurationStatus, CodingModels
- `apps/nextjs-app/src/features/app/blocks/space-setting/integration/components/AiConfig.tsx`
- AI-field config UI (search `aiConfig`/`FieldType.Ai` in field-setting components)

### Backend (data the UI drives — do not change here)
- `apps/nestjs-backend/src/features/ai/util.ts` (`modelProviders`, 18 providers), `setting.service.ts` (`getGatewayModels`), `packages/openapi/src/ai/*` + `admin/setting/gateway-model.ts` (modality types)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- The full `ai-config/` component set — reuse/restructure into the hub (D-01) rather than rewrite.
- `GatewayModelPickerDialog` + `AiModelSelect` → fold into the single searchable picker (D-02).
- `AIProviderCard` / `LLMApiConfigStep` → fold into the inline key list (D-03).
- Modality flags (`visionEnable`/`audioEnable`/`videoEnable`, `GatewayModelType`) already in the API → drive the picker filter.

### Established Patterns
- Teable uses shadcn/ui + Tailwind; settings live under admin + space-setting blocks.
- Incremental-only (user constraint) — restructure presentation, keep the data contracts.

### Integration Points
- New: an AI settings hub container (tabs) composing existing pieces.
- New: a unified searchable model picker + inline key list components.
- New: compact AI-field config panel with live preview.
</code_context>

<specifics>
## Specific Ideas

- All four surfaces consolidate toward "one screen, not a wizard": hub, single picker, inline key
  list, one-panel AI-column config with live preview.
- Reuse existing components — incremental, no rebuild (explicit milestone constraint).
</specifics>

<deferred>
## Deferred Ideas

- Full design-system refresh / ground-up UI rebuild — explicitly out of scope (incremental only).
- Per-model key overrides UI — keys are per-provider (Phase 15 decision).
- Non-AI settings consolidation — out of scope.

None block Phase 20.
</deferred>

---

*Phase: 20-ai-surface-ui*
*Context gathered: 2026-06-05*
