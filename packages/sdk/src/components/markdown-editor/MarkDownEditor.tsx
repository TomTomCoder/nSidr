import { lazy, Suspense } from 'react';
import type { IMarkDownEditorProps } from './MarkDownEditorInner';

// Lazy boundary: @udecode/plate + slate + slate-react + prosemirror (~130 KB)
// ship in their own async chunk so they only load when this editor mounts —
// not on every authenticated page that imports anything from @teable/sdk.
// Same pattern as MarkDownPreview / MarkdownEditor (milkdown). See
// .planning/PERF-FIX-PLAN-2026-06-15.md and commit 8a3a5aa0d for context.
const LazyMarkDownEditor = lazy(() =>
  import('./MarkDownEditorInner').then((m) => ({ default: m.MarkDownEditorInner }))
);

export const MarkDownEditor = (props: IMarkDownEditorProps) => {
  return (
    <Suspense fallback={null}>
      <LazyMarkDownEditor {...props} />
    </Suspense>
  );
};
