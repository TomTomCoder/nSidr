import { isEqual } from 'lodash';
import { lazy, memo, Suspense } from 'react';
import type { ComponentProps } from 'react';
import type { MarkdownPreviewInner } from './MarkDownPreviewInner';

export type { Components } from 'react-markdown';

// Lazy boundary: react-markdown + rehype-raw + remark-gfm (~155 KB) ship in their own async
// chunk so they only load when markdown is actually rendered — not on every page that imports
// from the @teable/sdk barrel. See .planning/PERF-FIX-PLAN-2026-06-15.md.
const LazyMarkdownPreview = lazy(() =>
  import('./MarkDownPreviewInner').then((m) => ({ default: m.MarkdownPreviewInner }))
);

type IMarkdownPreviewProps = ComponentProps<typeof MarkdownPreviewInner>;

export const MarkdownPreview = (props: IMarkdownPreviewProps) => {
  return (
    <Suspense fallback={null}>
      <LazyMarkdownPreview {...props} />
    </Suspense>
  );
};

export const MemoizedContentMarkdownPreview = memo(MarkdownPreview, (prev, next) => {
  return isEqual(prev.children, next.children);
});
