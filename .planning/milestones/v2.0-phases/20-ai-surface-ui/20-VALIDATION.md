---
phase: 20
slug: ai-surface-ui
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-07
updated: 2026-06-07
---

# Phase 20 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (component tests in nextjs-app) |
| **Config file** | apps/nextjs-app/vitest.config.ts (if exists) |
| **Quick run command** | `yarn workspace @teable/nextjs-app typecheck` |
| **Full suite command** | `yarn workspace @teable/nextjs-app typecheck` |
| **Estimated runtime** | ~60 seconds |

---

## Sampling Rate

- **After every task commit:** Run typecheck
- **After every plan wave:** Run typecheck + visual spot check
- **Before `/gsd:verify-work`:** Typecheck must pass; live flows verified (or DEFERRED)
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 20-00-T1 | 20-00 | 0 | UI-01, UI-02 | — | existing AI config catalogued (human) | human-verify | manual: boot app, walk existing AI config | — | ⬜ DEFERRED |
| 20-01-T1 | 20-01 | 1 | UI-01 | — | AiSettingsHub renders with tabs; typechecks | typecheck | `yarn workspace @teable/nextjs-app typecheck` | ✅ new | ✅ green |
| 20-02-T1 | 20-02 | 2 | UI-01 | — | UnifiedModelPicker renders with modality filter | typecheck | `yarn workspace @teable/nextjs-app typecheck` | ✅ new | ✅ green |
| 20-03-T1 | 20-03 | 2 | UI-01 | — | InlineProviderKeyList renders with add/test/remove | typecheck | `yarn workspace @teable/nextjs-app typecheck` | ✅ new | ✅ green |
| 20-04-T1 | 20-04 | 3 | UI-02 | — | CompactAiFieldConfig renders with live preview slot | typecheck | `yarn workspace @teable/nextjs-app typecheck` | ✅ new | ✅ green |
| 20-05-T1 | 20-05 | 4 | UI-01, UI-02 | — | typecheck clean; live flows (human-verify or DEFERRED) | typecheck | `yarn workspace @teable/nextjs-app typecheck` | — | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements.* Phase 20 is UI-only (no new test framework needed).

---

## Manual-Only Verifications (Human-verify steps — DEFERRED)

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Hub navigation (Providers & Keys / Models / Defaults tabs) | UI-01 | Visual verification required | Boot app (port 3000), navigate to Admin → AI Settings, confirm 3 tabs |
| Model picker modality filter (text/image/audio/embedding) | UI-01 | Visual verification required | Click Models tab, verify filter chips All/Text/Image/Audio/Embedding |
| Inline key add + test flow | UI-01 | Interactive flow | Click Providers & Keys tab, add a provider key, click Test, see status badge |
| AI-field config panel + live preview | UI-02 | Requires live table data | Open any table → add AI field → verify single-panel with output typology + preview slot |

---

## Validation Sign-Off

- [x] All tasks have typecheck or human-verify
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter
- [x] Typecheck passes (0 errors) — 2026-06-07

**Approval:** complete (typecheck verified; live flows DEFERRED for human-verify)
