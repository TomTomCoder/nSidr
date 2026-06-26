import type { IDocSearchResult } from '@teable/openapi';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { useDocEditorStore } from './useDocEditorStore';
import { useDocSearchStore } from './useDocSearchStore';

// The panel is mounted app-wide but only renders when toggled open (Cmd+Shift+K).
// Defer its code (search UI + result rendering) into an async chunk so it costs
// nothing on first paint of any route.
const DocSearchPanel = dynamic(() => import('./DocSearchPanel').then((m) => m.DocSearchPanel), {
  ssr: false,
});

/**
 * Layout-level mount for the global doc-search overlay.
 *
 * Reads `spaceId` from the router query (Pages Router) and conditionally
 * renders DocSearchPanel keyed to the useDocSearchStore.isOpen flag.
 *
 * The Cmd+Shift+K shortcut (wired in useDocSearchKeyboardShortcut) toggles
 * the store. Outside a space route, spaceId is undefined and this returns null
 * — the shortcut becomes a no-op.
 */
export function GlobalDocSearchPanel() {
  const router = useRouter();
  const { isOpen, closeDocSearch } = useDocSearchStore();
  const setSelectedDoc = useDocEditorStore((s) => s.setSelectedDoc);

  // Resolve spaceId — query values can be string | string[] | undefined
  const rawSpaceId = router.query.spaceId;
  const spaceId = Array.isArray(rawSpaceId) ? rawSpaceId[0] : rawSpaceId;

  // No-op outside a space route or when the panel is closed
  if (!spaceId || !isOpen) return null;

  const handleSelectResult = (result: IDocSearchResult) => {
    // Open the hit: select the doc in the editor store and close the panel. If the user
    // searched from outside the Doc Library, route there so the selection is visible.
    setSelectedDoc(result.docId);
    closeDocSearch();
    if (!router.asPath.includes('/doc-library')) {
      void router.push(`/space/${spaceId}/doc-library`);
    }
  };

  return (
    <DocSearchPanel
      spaceId={spaceId}
      open={isOpen}
      onClose={closeDocSearch}
      onSelectResult={handleSelectResult}
    />
  );
}
