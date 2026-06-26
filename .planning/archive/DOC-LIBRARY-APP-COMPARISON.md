# Doc Library — App Analysis vs. Proposition Comparison

## App Architecture Facts (from codebase)

### Layout system
Every page composes two primitives:
```
AppLayout (keyboard/focus setup)
  └── SpaceInnerLayout  or  BaseLayout
       ├── Sidebar (re-resizable via re-resizable, Cmd+B toggle, Zustand-persisted width)
       │   └── content: SpaceInnerSideBar  or  BaseSideBar
       └── {children}  ← the main content fills the remaining width (flex-1)
```

The `Sidebar` component is a **shared, reusable primitive** in `components/sidebar/Sidebar.tsx`. It is not duplicated per page — every layout reuses it.

The doc-library page currently uses `SpaceInnerLayout`, so it already gets the app sidebar (with the "Doc Library" nav button in `SpaceInnerSideBar`). The `DocLibrary` component renders into `{children}` to the right of that sidebar.

### Tree system (BaseNodeTree)
`BaseNodeTree` is the app's production tree implementation. It uses:
- **`@teable/ui-lib/base/headless-tree`** — internal headless tree (features: `DragAndDropFeature`, `HotkeysCoreFeature`, `KeyboardDragAndDropFeature`, `SelectionFeature`, `SyncDataLoaderFeature`)
- **`@teable/ui-lib/shadcn/ui/tree`** + **`@dnd-kit`** — UI and DnD primitives
- Supports: folders with depth limits, inline rename, context menu, drag-drop reorder, scroll-to-focused, star/pin per item, expand/collapse with `useLocalStorage`
- Node types: Table, Dashboard, Workflow, App, Folder

### CodeMirror (already installed)
The following CodeMirror v6 packages are **already in `package.json`**:
```
@codemirror/autocomplete  6.15.0
@codemirror/commands      6.3.3
@codemirror/lang-javascript 6.2.5
@codemirror/lang-json     6.0.1
@codemirror/language      6.10.1
@codemirror/lint          6.8.2
@codemirror/state         6.4.1
@codemirror/theme-one-dark 6.1.3  ← dark mode ready
@codemirror/view          6.26.0
```
Missing only: `@codemirror/lang-markdown` — **one package addition**.

### Chat panel pattern (existing right-panel precedent)
`useChatPanelStore` shows a resizable side panel with `open | close | expanded` states persisted in Zustand. The editor preview panel should follow this exact pattern.

---

## Where the Proposition Was Wrong

### 1. "3-panel layout: App Nav | Doc Tree Sidebar | Editor" — WRONG

**What I proposed:** A new outer 3-panel layout with the app nav, a doc tree sidebar, and the editor as three siblings at the same DOM level.

**What the app actually does:** The layout is always `Sidebar (app nav) | {children}`. There is no 3-column root layout anywhere in the app. Adding one would break the global sidebar's resize behavior and require duplicating layout infrastructure.

**Correct approach:** The doc folder tree goes **inside `{children}`** as a secondary panel — the same way `BaseLayout` nests `BaseSideBar + main content` inside its children slot. The doc library page becomes:
```
SpaceInnerLayout (unchanged)
  └── DocLibraryPage  ← fills {children}
       ├── DocFolderTree  (240px, re-resizable, secondary left panel)
       └── DocEditorArea  (flex-1)
            ├── EditorToolbar
            ├── CodeMirror (lang-markdown)
            └── MD preview (toggleable right split)
```

This keeps the outer layout intact and follows the `BaseLayout` precedent exactly.

### 2. "@uiw/react-md-editor" — WRONG

**What I proposed:** Install `@uiw/react-md-editor`.

**What the app actually has:** CodeMirror v6 is already fully installed (8 packages). There is zero reason to add a new editor library when the foundation is already there. Using `@uiw/react-md-editor` would:
- Add a redundant editor framework on top of existing CodeMirror
- Introduce styling conflicts with the Tailwind/shadcn design system
- Add ~80KB to the bundle for capabilities already present

**Correct approach:** Add `@codemirror/lang-markdown` (the only missing piece) and build the editor on existing CodeMirror — consistent with how the JSON/JS editors work in the app today.

### 3. "use existing Teable sidebar patterns from space-side-bar" — IMPRECISE

**What I said:** Use space-side-bar patterns for the folder tree.

**What exists:** `SpaceInnerSideBar` only renders a flat list of nav items (links to bases, templates, doc library, trash). It has no tree logic at all. The tree system lives in `BaseNodeTree` via `@teable/ui-lib/base/headless-tree`.

**Correct approach:** Build `DocFolderTree` directly mirroring `BaseNodeTree`'s patterns — same `headless-tree` library, same `Tree/TreeItem/TreeItemLabel` shadcn primitives, same `@dnd-kit` for drag-drop. Simplified to two node types: `DocFolder` and `ImportedDoc`.

### 4. No mention of replacing DocViewer — OMISSION

**What I said:** "Integrate editor, add split view." Didn't explicitly say the modal is dead.

**What must happen:** `DocViewer` (fullscreen modal overlay) must be **completely replaced**. The modal approach is architecturally incompatible with a proper doc workspace. When a doc is selected in the folder tree, the editor area renders it inline — no modal, no overlay.

### 5. Hooks use raw fetch() — INCONSISTENCY

**What the app does everywhere:** All API calls go through `@teable/openapi` SDK functions (`getSpaceById`, `createBase`, etc.) with React Query wrappers via `ReactQueryKeys`.

**What doc hooks do:** Direct `fetch('/api/spaces/...')` calls — bypassing the SDK entirely. This is inconsistent with every other feature in the app and means doc APIs have no OpenAPI schema, no type safety from the SDK, and no shared query key management.

**Correct approach:** Add doc endpoints to `@teable/openapi`, use SDK functions in hooks — same pattern as all other features.

---

## Corrected Architecture (aligned with app patterns)

### Data model — unchanged from original proposition
```prisma
model DocFolder {
  id, spaceId, parentFolderId, name, order, createdAt
  docs ImportedDoc[]
  @@map("doc_folder")
}
// ImportedDoc: add folderId (nullable), order, update rawContent endpoint
```

### Backend — one clarification
The `EmbeddingService` fix (route through `UnifiedAIService`) is correct and unchanged.

Add doc CRUD to `@teable/openapi` types + REST client so the frontend can use SDK functions.

### Frontend — revised

#### Route stays: `/space/[spaceId]/doc-library`
Layout stays `SpaceInnerLayout` — no new layout file needed.

#### DocLibraryPage becomes a split-panel workspace
```tsx
// pages/space/[spaceId]/doc-library.tsx (unchanged import)
// DocLibrary.tsx → completely replaced:

export function DocLibrary({ spaceId }) {
  return (
    <div className="flex h-full min-w-0">
      <DocFolderTree spaceId={spaceId} />   {/* 240px, re-resizable */}
      <DocEditorArea spaceId={spaceId} />   {/* flex-1 */}
    </div>
  )
}
```

#### DocFolderTree
- Follows `BaseNodeTree` exactly: `headless-tree` + `Tree/TreeItem/TreeItemLabel`
- Two node types: `DocFolder` (chevron expand) and `ImportedDoc` (file icon + index dot)
- Header: "+ New Folder" | "+ New Doc" buttons
- Inline rename on double-click (same `editingNodeId` pattern)
- Context menu: rename, move, delete
- Drag-drop reorder via `@dnd-kit` (already installed)

#### DocEditorArea
- Toolbar: breadcrumb path / title input / split-toggle / index status badge
- Editor: CodeMirror with `@codemirror/lang-markdown` (add this one package)
  - `theme-one-dark` already installed for dark mode
  - `commands` already installed for keyboard shortcuts
- Preview: rendered MD (use `react-markdown` — check if installed, likely is)
- Split: Zustand store `useDocEditorStore` with `mode: 'edit' | 'split' | 'preview'`
- Auto-save: debounce 800ms → `PATCH /api/spaces/:spaceId/docs/:docId` → re-index queue

#### State: `useDocLibraryStore` (Zustand, persisted)
```ts
{ selectedDocId, selectedFolderId, editorMode: 'edit'|'split'|'preview' }
```

---

## Summary: Proposition vs. Reality

| Item | Original Proposition | Corrected (app-aligned) |
|------|---------------------|------------------------|
| Layout | New 3-column root layout | Inner split inside existing `{children}` slot |
| Folder tree | "Use space-side-bar patterns" | Follow `BaseNodeTree` + `headless-tree` exactly |
| Editor library | `@uiw/react-md-editor` (new dep) | `@codemirror/lang-markdown` (1 package on existing stack) |
| Viewer | "Replace DocViewer" (vague) | Delete `DocViewer.tsx` entirely, render inline in `DocEditorArea` |
| API hooks | Not mentioned | Add to `@teable/openapi`, use SDK functions — same as all features |
| Doc Library layout file | New layout | Keep `SpaceInnerLayout` + `DocLibrary` refactored internally |

The backend model changes (DocFolder, folderId, update endpoint, EmbeddingService fix) remain valid and unchanged.
