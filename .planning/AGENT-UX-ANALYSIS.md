# Agent Builder — ClickUp Super Agent UX Gap Analysis
*Generated 2026-06-08 from screenshots + codebase inspection*

---

## What Teable Already Has ✅

Teable's implementation is 70% of the way there. Current parity:

| ClickUp Feature | Teable File | Status |
|---|---|---|
| 3-step conversational builder | `AgentBuilder.tsx` | ✅ Full |
| Right-panel SVG wireframe visuals | `BuilderStatusPanel.tsx` | ✅ Full |
| Step label + dot matrix progress bar | `BuilderStatusPanel.tsx` | ✅ Full |
| "Demander" / "Agents" tab switch | `AgentBuilder.tsx` | ✅ Full |
| Template cards on entry | `AgentBuilder.tsx` | ✅ Full |
| Identity header (gradient avatar, green dot) | `AgentProfilePanel.tsx` | ✅ Full |
| "Demander" + "Lancer l'agent" gradient CTAs | `AgentProfilePanel.tsx` | ✅ Full |
| 5 tabs (Instructions, Travaux, Compétences…) | `AgentProfilePanel.tsx` | ✅ Full |
| Cron / record / webhook trigger system | `AgentProfilePanel.tsx` | ✅ Full |
| Tool toggles (8 Teable tools) | `AgentProfilePanel.tsx` | ✅ Full |
| Web search toggle | `AgentProfilePanel.tsx` | ✅ Full |
| Memory section (Récent, Préférences, Renseignements) | `AgentProfilePanel.tsx` | ✅ Full |
| "Actif · Public · Géré par" status line | `AgentProfilePanel.tsx` | ✅ Full |

---

## Gaps — Ranked by Visual Impact

### 🔴 P0 — Aurora gradient background on entry screen
**ClickUp:** Dark background with a dramatic colorful aurora/gradient glow bleeding in from the top (purple → blue → pink). The entire top half of the entry screen has this effect.
**Teable:** Plain `bg-background`. The gradient only exists in the text (`text-transparent bg-clip-text`).
**Fix:** Add a radial/conic gradient overlay div behind the content on the entry screen only.
**File:** `AgentBuilder.tsx` — `phase === 'entry'` return block.

### 🔴 P0 — Thinking steps stream during builder (Step 2)
**ClickUp:** During the Personnalisation step, the left panel shows a bullet list of animated "thinking" steps streaming in one by one (Réveil du héros → Prototype de super-héros → Élaboration → Starting creation of… → Analyse des exigences → etc.). The last/current item glows pink. Static dots nowhere.
**Teable:** Shows 3 bouncing dots ("Réfléchit…") as a single inline indicator.
**Fix:** Replace the generic thinking indicator with a `ThinkingStepStream` component that renders bullets with staggered animations and a pink pulse on the last item.
**Files:** `AgentBuilder.tsx` + new `ThinkingStepStream.tsx`.

### 🟡 P1 — Template card avatar images
**ClickUp:** Template cards show colorful circular avatar images with distinct styles.
**Teable:** Uses plain lucide icon (`CheckSquare`, `FolderKanban`…) in muted gray.
**Fix:** Swap icons for gradient avatar circles (same system as `avatarGradient()` in `BuilderStatusPanel`), seeded by template name.

### 🟡 P1 — Horizontal category filter chip strip
**ClickUp:** Below the main content area: scrollable horizontal chips — "Applications · Projets · Personnel · Certifié · Tâches · Direction · Planification · Logiciel · Réunions · Renseignements · Recherche · Mises à jour · Rédaction"
**Teable:** `DOMAIN_CHIPS` only visible in "Demander" mode (6 chips, centered). Not present in "Agents" mode.
**Fix:** Show a horizontal scrollable category bar below template cards in both modes.

### 🟡 P1 — App integration tiles
**ClickUp:** Below the category chips, a row of app tiles (ClickUp, Moonbeam…) as square icon cards.
**Teable:** Nothing below template cards.
**Fix:** Add a placeholder app tile section (can be decorative at first).

### 🟢 P2 — Emoji support in agent names
**ClickUp:** Agent names include emoji (e.g. "Tâches Inactives – Priorités de Tommy 🕶️").
**Teable:** No emoji — names are plain strings picked from `['Mon Assistant', …]`.
**Fix:** Add emoji picker chip to `pickName()` suggestions; allow emoji in the name input.

### 🟢 P2 — "Partager" share button on agent page
**ClickUp:** Top-right of the agent view has a "Partager" button (share icon).
**Teable:** Only the Activity icon button in the header.
**Fix:** Add Share button to the identity header in `AgentProfilePanel.tsx`.

### 🟢 P3 — Show real username in "Géré par"
**ClickUp:** "Public · Géré par Tommy Lambert et admin"
**Teable:** "Public · Géré par vous" (hardcoded)
**Fix:** Accept `createdByName` prop in `AgentProfilePanel` and render it.

### 🟢 P3 — AgentWizard modal (legacy)
**Location:** `AgentWizard.tsx` — still uses `bg-white` hardcoded, modal pattern
**Fix:** Either deprecate in favor of `AgentBuilder` flow, or apply dark-mode compatible tokens.

---

## Implementation Priority

1. ✅ **Aurora background** — 10 lines, massive visual lift, entry screen first impression
2. ✅ **Thinking steps stream** — New small component, replaces generic dots during personalization
3. **Template card gradient avatars** — 5-line change in `AgentBuilder.tsx`
4. **Category chip strip** — New horizontal strip, both modes
5. **App tiles** — Decorative placeholder section
6. **Emoji names** — UX enhancement for created agents
7. **Share button** — UI-only, wires to copy-link
8. **Real username** — Prop-thread from agent page
