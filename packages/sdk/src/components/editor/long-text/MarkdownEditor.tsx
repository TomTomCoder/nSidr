import { lazy, Suspense } from 'react';
import type { ComponentProps } from 'react';
import type { MarkdownLongTextEditor as MarkdownLongTextEditorImpl } from './MarkdownEditorImpl';

// Lazy boundary: milkdown (@milkdown/core + @milkdown/react + prosemirror, ~259 KB) ships in
// its own async chunk so it only loads when a long-text/markdown cell is actually edited —
// not on every authenticated page that merely imports from the @teable/sdk barrel. See
// .planning/PERF-FIX-PLAN-2026-06-15.md ("DEFINITIVE ROOT CAUSE").
const LazyMarkdownLongTextEditor = lazy(() =>
  import('./MarkdownEditorImpl').then((m) => ({ default: m.MarkdownLongTextEditor }))
);

type IMarkdownLongTextEditorProps = ComponentProps<typeof MarkdownLongTextEditorImpl>;

export const MarkdownLongTextEditor = (props: IMarkdownLongTextEditorProps) => {
  return (
    <Suspense fallback={null}>
      <LazyMarkdownLongTextEditor {...props} />
    </Suspense>
  );
};
