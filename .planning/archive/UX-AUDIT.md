# Teable UX Audit & Simplification Proposals
**Date:** 2026-06-07 | **Scope:** Full app — admin panel, space/base home, table view, settings

---

## 1. Executive Summary

The app has **4 distinct navigation contexts** stacked on each other (global shell, space sidebar, base sidebar, view toolbar), a **wizard embedded inside a tab embedded inside a settings page**, and several feature surfaces that duplicate each other. The AI features are well-built but buried under cognitive overhead. The proposals below focus on three levers: **flatten navigation**, **merge redundant surfaces**, and **surface key actions earlier**.

---

## 2. Findings by Surface

### 2.1 Admin → Paramètres IA (`/admin/ai-setting`)

**Observed structure:**
- 3-tab layout: Providers & Keys | Models | Defaults
- "Defaults" tab contains a 3-step accordion wizard (Configure LLM API → Recommended Models → Set Chat Model)
- "Configure LLM API" inside the wizard re-renders the same provider cards shown in "Providers & Keys" tab
- "AI Prompt Overrides" section lives below the wizard on the same page

**Problems:**
| # | Issue | Severity |
|---|-------|----------|
| A1 | **Duplicated content**: "Providers & Keys" tab and "Defaults → Configure LLM API" step show identical provider cards | High |
| A2 | **Wizard inside a tab**: the 3-step wizard is buried inside the "Defaults" tab — users who land on "Providers & Keys" don't see the workflow | High |
| A3 | **Mixed concerns on one page**: provider config + model defaults + prompt overrides share a single scrolling page | Medium |
| A4 | **Tab labels don't show dependency**: "Models" depends on "Providers", "Defaults" depends on "Models" — the tabs look independent | Medium |
| A5 | **"Models" tab shows empty state without CTA**: "No models available" with no clear prompt to go configure a provider | Medium |
| A6 | **Prompt Overrides buried**: shown at the bottom of a long page, after scrolling past the wizard | Low |

**Proposals:**
```
CURRENT: [Providers & Keys] [Models] [Defaults] + AI Prompt Overrides below

PROPOSED: Replace tabs with a single-page vertical setup flow:

  ┌─ AI Configuration ─────────────────────────────────────────────┐
  │ ① Providers                                      ● configured  │
  │   [OpenRouter] [kiloCode] [Mistral] [Anthropic] [+ Add]        │
  │                                                                 │
  │ ② Default model for chat          claude-haiku-4-5  [change]   │
  │                                                                 │
  │ ③ Recommended models              4 models selected [manage]   │
  │                                                                 │
  │ ─── Advanced ─────────────────────────────────────────────────  │
  │ Attachment mode          ○ URL   ● Base64 (auto-detected)      │
  │ Prompt overrides         6 custom prompts          [manage]    │
  └────────────────────────────────────────────────────────────────┘
```
- Remove the tab structure entirely; one scrollable card-per-concern
- Each section has an inline "configured / not configured" status badge
- Prompt Overrides moved to their own `/admin/ai-prompts` sub-page (linked from the card)
- The wizard steps become inline sections — no accordion nesting

---

### 2.2 Admin → Administration des modèles (`/admin/template`)

**Observed structure:**
- Data table with 12 columns: Couverture, Nom, Description, Description Markdown, Catégorie, En vedette, Publié, Heure de l'instantané, Créé par, Utilisation/Visites, Aperçu, Actions

**Problems:**
| # | Issue | Severity |
|---|-------|----------|
| B1 | **12 columns for template management** — "Description Markdown" is almost never needed inline; "Heure de l'instantané" is too granular for this view | High |
| B2 | **No search or bulk actions visible** | Medium |

**Proposals:**
- Default columns: Cover thumbnail, Nom, Catégorie, Published toggle, Actions (3 dots menu)
- Move Description, Description Markdown, Heure de l'instantané behind "expand row"
- Add a search bar above the table

---

### 2.3 Table Grid View (`/base/.../table/.../view/...`)

**Observed structure:**
- Left: sidebar with space logo, base name, "Créer une ressource" button, tree (Tables section: Clients/Entreprise/Contacts + Apps section: App CRM)
- Top toolbar row 1: breadcrumb + last-modified + Grid View button + user avatars + Inviter + Aide
- Top toolbar row 2: "Ajouter un enregistrement" + [Champs cachés, Filtrer, Trier, Grouper, ···] + [AI Chat, ···, ···, ···, Partager | Personnel toggle]
- Grid area (virtual canvas)

**Problems:**
| # | Issue | Severity |
|---|-------|----------|
| C1 | **Two toolbar rows creates vertical clutter**: the breadcrumb row and the action row are separate but both are "toolbar" — wastes 80px of vertical space | High |
| C2 | **Tables and Apps mixed in same sidebar tree**: "Tables" section and "Apps" section are in the same sidebar, different entity types at same level | High |
| C3 | **"Créer une ressource" is ambiguous**: creates what? A table, a form, an app, a view? | High |
| C4 | **AI Chat is one icon among 4 unnamed icons in right toolbar**: the most differentiating feature is visually equivalent to Share, Search, and a mystery icon | High |
| C5 | **"Champs cachés" is a hidden-field toggle, not a primary action**: it lives in the same row as Filtrer/Trier which are view controls, but Champs cachés is field management | Medium |
| C6 | **"Personnel" toggle** next to Partager: the switch label "Personnel" is too small and contextually unclear in a dense toolbar | Medium |
| C7 | **Sidebar "Plus" and "Inviter" buttons** are list items, styled like nav links but behave as actions | Low |

**Proposals:**

```
CURRENT toolbars (2 rows, ~40 items):
  Row 1: [back][breadcrumb][last-mod][GridView][...][Tommy][Inviter][Aide]
  Row 2: [+Record][Hidden][Filter][Sort][Group][...] | [AIChat][?][?][?][Share][toggle]

PROPOSED toolbar (1 row, grouped):
  [GridView▼] [Filter][Sort][Group]  ·  [AI Chat]  ·  [Share]  [Tommy▾]
  └─ view controls ─┘                  └─ key feature ─┘

  "+ Add record" becomes a floating action button (FAB) at bottom-right of grid
  "Hidden fields" moves to a field panel accessible via the column header "+"
```

**Sidebar simplification:**
```
CURRENT: flat tree mixing Tables + Apps
  ▼ Tables
      Clients
      Entreprise
      Contacts ●
  ▼ Apps
      App CRM — Entreprise & Contacts

PROPOSED: tabbed switcher at top of sidebar
  [Tables] [Apps] [Forms]
  ─────────────────────────
  Clients
  Entreprise
  Contacts ●
  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
  + New table
```

**"Créer une ressource" → Replace with explicit "+" split button:**
```
  [+ Table]  [+ App]  [+ Form]   (or a "+▼" dropdown with those 3 options)
```

---

### 2.4 AI Chat Panel (sidebar panel in table view)

**Observed structure:**
- Panel opens on the right, with greeting + 7 suggested prompts in 3 categories
- Model picker at bottom, text input, send button (disabled by default)
- "Configure agent" and "Conversation history" icon buttons at top

**Problems:**
| # | Issue | Severity |
|---|-------|----------|
| D1 | **Suggested prompts use French localisation but are hardcoded strings** — inconsistent with the field/column names which may be in any language | Low |
| D2 | **"Que puis-je faire ?" button** is a button that probably opens a capability list — its label is too close to the greeting "Comment puis-je vous aider?" | Low |
| D3 | **"Configure agent" is a small icon** with no tooltip on hover — not discoverable | Medium |
| D4 | **Model picker** at the bottom left: most users won't change this; it could be behind an advanced disclosure | Low |

**Proposals:**
- Move "Configure agent" to a labeled button: `⚙ Agent settings`
- Make model picker a `Modèle: claude-haiku ▾` inline chip that only expands on click
- Group suggested prompts by intent more clearly with category headers (already done ✅) — keep this

---

### 2.5 Space Settings — General (`/space/.../setting/general`)

**Observed structure:**
- Space avatar, Name field, Space ID (read-only + copy), Delete button

**Problems:**
| # | Issue | Severity |
|---|-------|----------|
| E1 | **"Supprimer l'espace" danger button** is at the same visual level as the name field — no Danger Zone separator | High |
| E2 | **Space ID shown directly** alongside the name — raw technical field exposed to all users unnecessarily | Low |

**Proposals:**
- Add a `── Danger Zone ──` section with red border before the delete button
- Move Space ID behind a "Show advanced" disclosure or a "Developer" tab

---

### 2.6 Space Integrations (`/space/.../setting/integration`)

**Observed structure:**
- 6 integration cards in a list (Gmail, Google Calendar, Google Drive, Google Chat, Google Meet, Slack)
- Each: logo + name + "Not connected" text + "Disconnected" badge + "Connect" button

**Problems:**
| # | Issue | Severity |
|---|-------|----------|
| F1 | **"Disconnected" badge + "Not connected" text** is redundant — two pieces of content saying the same thing | Medium |
| F2 | **All 6 integrations shown as equal** with no indication of which ones are most useful for automations | Low |
| F3 | **"Integrations" title** — in English on an otherwise French interface | Low |

**Proposals:**
- Remove the "Disconnected" badge — keep only the "Not connected" text; when connected show a green dot
- Rename to "Connexions" for consistency
- Optionally show "Most used" cards first (Gmail, Slack)

---

### 2.7 Navigation Architecture — Cross-Cutting

**Current navigation depth:**
```
Level 0: Space selector (left sidebar top)
Level 1: Space home (base list)
Level 2: Base → Tables sidebar tree
Level 3: Table view (toolbar, views, fields)
Level 4: Record expander / Field editor / Admin panel
```
5 levels is at the edge of cognitive budget for a productivity tool.

**Admin panel has its own isolated navigation** (5-item left sidebar) entirely separate from the space/base navigation — context switch is total.

**Language mixing observed:**
- "Integrations" (EN), "Champs cachés" (FR), "AI Chat" (EN), "Créer une ressource" (FR), "Grid View" (EN)
- Recommendation: pick one and stick to it — the mix creates a sense of incompleteness

---

## 3. Priority Matrix

| Priority | Finding | Effort | Impact |
|----------|---------|--------|--------|
| 🔴 P1 | Merge Admin AI Settings tabs → single vertical flow (A1, A2, A3) | Medium | High |
| 🔴 P1 | Single toolbar row in table view — remove row 2 clutter (C1, C4) | Medium | High |
| 🔴 P1 | Make AI Chat button prominent / labeled in toolbar (C4) | Low | High |
| 🟠 P2 | Replace sidebar tree mix of Tables+Apps with tabbed switcher (C2) | Medium | High |
| 🟠 P2 | Rename + clarify "Créer une ressource" (C3) | Low | Medium |
| 🟠 P2 | Add Danger Zone separator in Space Settings (E1) | Low | High |
| 🟠 P2 | Admin Template table: reduce to 5 default columns (B1) | Low | Medium |
| 🟡 P3 | Remove redundant "Disconnected" badge in Integrations (F1) | Low | Low |
| 🟡 P3 | Move Space ID behind disclosure (E2) | Low | Low |
| 🟡 P3 | AI Chat: label "Configure agent" (D3) | Low | Medium |
| 🟡 P3 | Unify UI language (all French or all English) (cross-cutting) | High | Medium |

---

## 4. Quick Wins (≤1 day each)

1. **AI Chat button → add text label**: change `<button><img/></button>` to `<button><img/> AI Chat</button>` — already has text but should be more visible in the toolbar
2. **"Supprimer l'espace" → Danger Zone**: wrap in a `<section class="border-red-200">` with a `Danger Zone` heading
3. **Integrations → remove "Disconnected" badge**: when not connected, show only the "Connect" button in muted style; when connected show green "Connected" badge
4. **Admin Template table**: hide Description Markdown, Heure de l'instantané, Créé par, Utilisation/Visites columns by default
5. **"Créer une ressource" → "New ▼"**: rename the sidebar button and use a dropdown showing Table / App / Form

---

## 5. Bigger Bets (1–2 weeks each)

### 5.1 Unified AI Settings Page
Collapse the 3-tab AI settings into a single card-based page. Estimated: 3 days frontend.

### 5.2 Table Toolbar Consolidation
Merge 2 toolbar rows into 1. Move "+ Add record" to FAB. Move "Hidden fields" into field panel. Estimated: 4 days.

### 5.3 Sidebar Table/App Tabs
Add a `[Tables] [Apps] [Forms]` tab switcher above the sidebar tree. Estimated: 2 days.

### 5.4 Admin Panel Access
Consider making Admin accessible via a user avatar dropdown (`Admin panel →`) rather than a separate full-page context switch. Reduces context-switching friction for power users. Estimated: 2 days.
