---
phase: 20-ai-surface-ui
plan: 20-02
subsystem: admin-ai-settings
tags: [ui, model-picker, search, modality-filter]
dependency_graph:
  requires: [20-01]
  provides: [UnifiedModelPicker]
  affects: [AiSettingsHub]
tech_stack:
  added: []
  patterns: [filter-chips, inline-search, shadcn-scroll-area]
key_files:
  created:
    - apps/nextjs-app/src/features/app/blocks/admin/setting/components/ai-config/UnifiedModelPicker.tsx
  modified:
    - apps/nextjs-app/src/features/app/blocks/admin/setting/components/ai-config/AiSettingsHub.tsx
decisions:
  - "Modality filtering uses modelType field + tag predicates (same logic as GatewayModelPickerDialog)"
  - "Models tab in AiSettingsHub uses useGatewayModels hook to feed UnifiedModelPicker with pickerModels"
  - "Simple string search (substring) rather than Fuse.js — keeps component lightweight"
metrics:
  duration: ~10min
  completed: 2026-06-07
  tasks_completed: 4
  files_changed: 2
---

# Phase 20 Plan 02: UnifiedModelPicker Summary

**One-liner:** Single-screen searchable model picker with modality filter chips (All/Text/Image/Audio/Embedding), wired into AiSettingsHub Models tab.

## What Was Built

- `UnifiedModelPicker.tsx` — new component accepting `models: IPickerModel[]`, `value`, `onSelect`
- Filter chips: All | Text | Image | Audio | Embedding using GatewayModelType and tags
- Search input: case-insensitive substring filter on model id/name/description
- Scrollable list with provider badge, capability chips, check mark for selected
- Wired into AiSettingsHub Models tab via `useGatewayModels` hook

## Deviations from Plan

None — plan executed as written.

## Self-Check: PASSED

- [x] `UnifiedModelPicker.tsx` created
- [x] Modality filter chips render (All/Text/Image/Audio/Embedding)
- [x] Search filters model list
- [x] Wired into AiSettingsHub Models tab
- [x] Typecheck clean (0 errors)
- [x] Commit `e2453ec5a`
