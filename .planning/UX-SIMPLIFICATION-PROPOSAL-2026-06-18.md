# UX Simplification Proposal — Teable
*Audit date: 2026-06-18*

## Executive Summary

The Teable app has grown feature-first, leaving several UX seams where the **same conceptual action** is reachable through **two different surfaces** (page vs. dialog, or two separate flows with near-identical UI). This document identifies 6 concrete consolidation opportunities, ranked by user impact. All features are preserved; only the entry points shrink.

---

## Finding 1 — Space Settings: Page Routes + Modal (High impact)

### Problem
Space settings are exposed in **two places simultaneously**:
- **Full-page routes**: `/space/[spaceId]/setting/general`, `/space/[spaceId]/setting/collaborator`, `/space/[spaceId]/setting/integration`
- **Dialog modal**: `SpaceInnerSettingModal` with identical General / Collaborator / Extensions tabs

A user who clicks "Paramètres de l'espace" in the sidebar gets the modal. A user who navigates directly to the URL gets the full page. Both render the same content. This doubles the maintenance surface and creates subtle inconsistencies over time.

### Proposal
**Keep only the dialog.** Remove the three `/setting/` page routes and redirect them to the space page with `?setting=general` (or similar query param that auto-opens the dialog). This is how most modern SaaS tools (Notion, Linear, Figma) handle settings — always a modal, never a separate navigation.

**Files to remove:** `pages/space/[spaceId]/setting/general.tsx`, `collaborator.tsx`, `integration.tsx`
**Files to update:** `SpaceInnerSettingModal.tsx` (ensure deep-linkable via query param)

---

## Finding 2 — Collaborator Invite: Space vs. Base (Medium impact)

### Problem
There are two nearly-identical "invite collaborator" flows:
- **Space collaborators**: `space-setting/collaborator/CollaboratorPage.tsx` → `InviteSpacePopover` → tabs: Email / Link / Org
- **Base collaborators**: `components/collaborator/share/ShareBaseContent.tsx` → same 3 tabs

Both show a table of members, a role picker, an invite-by-email form, a shareable link, and org-wide toggle. The UI is visually the same; only the API endpoint differs.

### Proposal
**Unify into a single `<CollaboratorPanel scope="space"|"base" resourceId={...} />` component** with the scope determining which API calls are made. The two current implementations can be refactored to use this shared component, eliminating ~400 lines of duplicated JSX.

---

## Finding 3 — Trash: Three Separate Implementations (Medium impact)

### Problem
Three distinct trash pages exist:
- `SpaceTrashPage.tsx` — deleted spaces
- `BaseTrashPage.tsx` — deleted bases within a space  
- `TableTrashDialog.tsx` — deleted tables/records within a base

Each has its own restore/permanent-delete UI, search, and pagination. They are navigated separately and have no common UX frame.

### Proposal
**Unify into a single `<TrashPanel scope="space"|"base"|"table" />` component** rendered in a single `/space/trash` route (already exists for space trash). Add a **scope selector dropdown** ("Space / Bases / Tables") at the top. When inside a base, scope defaults to that base. This reduces 3 implementations to 1 and gives users one consistent "Trash" mental model.

---

## Finding 4 — Share: Scattered Entry Points (Medium impact)

### Problem
The "share" concept appears in 3 different surfaces:
- **Base share** (`ShareBaseDialog` in `components/collaborator/share/`) — invites people to collaborate
- **View share** (`blocks/share/view/`) — public read-only link for a view
- **Form view share** (`blocks/view/form/components/share-link-editor/`) — share link for a form

The Base share dialog and the View share link editor both have a "copy link" section and toggles for enabling/disabling public access, creating a confusing split: "Do I share via the base dialog or the view toolbar?"

### Proposal
**Merge the View share link into the Base share dialog as a new tab: "Public Link".** The dialog becomes:
- Tab 1: **Collaborators** (invite by email/link/org — existing)
- Tab 2: **Public Link** (enable view link, copy, set password, expiry — existing view share features)

The form share-link editor can remain inline in the form toolbar since it is context-specific.

---

## Finding 5 — User Integrations vs. Space Extensions (Low-Medium impact)

### Problem
There are two "integrations" surfaces:
- **User settings → Integrations tab** (`/features/app/components/setting/Integration.tsx`) — personal OAuth connections (Slack, etc.)
- **Space settings → Extensions tab** (`/blocks/space-setting/integration/ExtensionPage.tsx`) — space-level MCP extension servers

The naming ("Integrations" at user level, "Extensions" at space level) is already differentiated, but the proximity causes confusion: "Where do I connect Slack — my account or the space?"

### Proposal
**Rename clearly:**
- User settings: "**Connected accounts**" (personal OAuth tokens)
- Space settings: "**Extensions**" (already named — keep)

Add a one-line description to each so users understand the scope difference without having to open both.

---

## Finding 6 — Doc Library + Doc Search: Two Surfaces for Docs (Low impact)

### Problem
- **`/space/[spaceId]/doc-library`** — full-page document library
- **`blocks/doc-search/`** — search modal/panel

These serve different needs (browse vs. search) but are separate navigation items. Users must know to go to "Doc Library" to browse and use a separate search shortcut to search.

### Proposal
**Integrate doc search into the Doc Library page** as the primary entry point (search bar at the top of the library page). Remove the standalone search modal entry point in the sidebar. This consolidates two doc-related surfaces into one page that handles both browsing and searching.

---

## Summary Table

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Space settings as page + dialog | High | Low | Remove 3 page routes, keep dialog only |
| 2 | Duplicate collaborator invite UI | Medium | Medium | Unify into shared component |
| 3 | Three trash implementations | Medium | Medium | Single trash page with scope selector |
| 4 | Scattered share entry points | Medium | Medium | Merge view share into base share dialog |
| 5 | User integrations vs. space extensions naming | Low-Medium | Low | Rename "Integrations" → "Connected accounts" |
| 6 | Doc library + doc search as separate surfaces | Low | Low | Embed search in doc library page |

**Net reduction:** ~6 fewer navigation items / entry points, ~3 fewer full-page routes, significant JSX deduplication in collaborator and trash components.
