import { lazy, memo, Suspense } from 'react';

interface IMarkdownReadonlyProps {
  value: string;
  className?: string;
}

// Lazy boundary: react-markdown + remark-gfm (~155 KB) ship in their own async chunk so
// they only load when a markdown cell is actually rendered — not on every authenticated
// page that merely imports from the @teable/sdk barrel. See
// .planning/PERF-FIX-PLAN-2026-06-15.md ("DEFINITIVE ROOT CAUSE").
const MarkdownReadonlyInner = lazy(() =>
  import('./MarkdownReadonlyInner').then((m) => ({ default: m.MarkdownReadonlyInner }))
);

export const MarkdownReadonly = memo(
  ({ value, className }: IMarkdownReadonlyProps) => {
    if (!value) return null;
    return (
      <Suspense fallback={null}>
        <MarkdownReadonlyInner value={value} className={className} />
      </Suspense>
    );
  },
  (prev, next) => prev.value === next.value && prev.className === next.className
);

MarkdownReadonly.displayName = 'MarkdownReadonly';
