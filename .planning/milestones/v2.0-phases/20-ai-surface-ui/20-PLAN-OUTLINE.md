---
phase: 20-ai-surface-ui
created: 2026-06-05
type: plan
requirements: [UI-01, UI-02]
context: 20-CONTEXT.md
---

# Phase 20 — AI-Surface UI Simplification: Plan

> Decisions (20-CONTEXT.md): one AI settings hub (tabs); single searchable model picker; inline
> per-provider key list; compact AI-column panel. **Incremental — reuse existing `ai-config/*`
> components, keep data contracts.** UI-only; no backend changes (gateway/AI-field exist from 15/16).

## Grounding (+ plan-review)
- **25** existing `ai-config/*` components (AISetupWizard, AiFormWizard, AIProviderCard,
  LLMApiConfigStep, AiModelSelect, GatewayModelPickerDialog, AIModelPreferencesCard, AIControlCard,
  AIConfigurationStatus, **LlmproviderManage, LlmProviderForm, BatchTestModels, TestButton,
  GatewayModelsStep, DefaultModelsStep, PromptOverridesPanel, ModelTagInput**…) +
  `space-setting/integration/components/AiConfig.tsx`. → **This phase is mostly ASSEMBLY**:
  inline key list ≈ `LlmproviderManage` + `TestButton`; picker ≈ fold `GatewayModelPickerDialog` +
  `AiModelSelect`. Lower risk than a build.
- **Phase 16 folded in:** the AI field (`FieldType.Ai`, per-type `ai-config`, `field-supplement`
  generation) is already built. 20-04 (AI-column panel) = simplify its config UI **plus** the small
  former-Phase-16 gaps (explicit JSON-shape output if wanted; on-demand regenerate UX). Audit the
  AI-field UI before changing it.
- Backend data unchanged: `ai/util.ts` `modelProviders` (18), `setting.service.getGatewayModels`,
  modality types in `openapi/.../gateway-model.ts`.
- Stack: shadcn/ui + Tailwind. **Recommend `/gsd:ui-phase 20` for a UI-SPEC before executing.**

## Wave 0 — Verify-live-first (process gate)
**20-00 — Live-verify (≤0.5 day).** Boot app; walk the EXISTING AI config + AI-field setup so the
consolidation simplifies real flows (and doesn't drop existing capabilities: gateway models,
preferences, coding-models, prompt overrides). *Success:* current behavior catalogued before refactor.

## Waves & Plans

### Wave 1 — Hub shell (UI-01)
**20-01 — AI settings hub container.** A single AI settings panel with tabs **Providers & Keys /
Models / Defaults**, composing existing components; consistent admin (instance) vs space (override)
presentation. Replaces scattered wizard entry points. *Files:* new hub container under
`admin/setting` + space-setting; route/nav wiring. *Success:* one screen reaches all AI config;
old wizard entry points redirect/embed into the hub.

### Wave 2 — Pickers & keys (UI-01) — depends on 20-01
**20-02 — Single searchable model picker.** Fold `GatewayModelPickerDialog` + `AiModelSelect` into
one searchable list: filter by provider + **modality** (text/image/audio/embedding), recommended
badges, recently-used. *Success:* user filters to image-only models and picks one in a single screen.

**20-03 — Inline per-provider key list.** Replace `AISetupWizard`/`LLMApiConfigStep` multi-step flow
with a list: provider · masked key · **test** · status · remove; add-provider inline. *Success:*
user adds + tests a provider key inline; no wizard.

### Wave 3 — AI-column panel (UI-02)
**20-04 — Compact AI-field config panel.** One panel: prompt + source columns + model + **output
typology** (free text / enum / number / JSON shape) + **live preview of one row**. *Files:* AI
field-setting component. *Success:* user configures an AI field and sees a live generated preview
for one row in the same panel.

### Wave 4 — Verify
**20-05 — Tests & live verification.** Component tests for the picker filter + key-list actions +
field panel. Live (app running): walk the hub → add/test a key → pick a model by modality →
configure an AI field with output typology + preview. *Success:* suites green; live flows verified;
no regression in existing AI config behavior.

## Test strategy (per CONTEXT: test live)
App running. Verify each surface visually + behaviorally: hub navigation, modality-filtered picker,
inline key add/test, AI-field panel with live preview. Confirm existing data contracts still work
(no backend change).

## Risks / watch-for
- Incremental constraint: reuse components; do NOT rewrite the data layer or change API contracts.
- Don't lose existing capabilities (gateway models, preferences, coding-models) while consolidating.
- i18n: migrate existing keys; avoid orphaning translations.

## Coverage
UI-01 → 20-01 (hub) + 20-02 (picker) + 20-03 (keys). UI-02 → 20-04 (AI-field panel). Tests 20-05. **2/2 ✓**
