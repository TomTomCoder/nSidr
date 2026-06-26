import { lazy, Suspense } from 'react';
import type { IFormulaEditorProps } from './FormulaEditorInner';

// Lazy boundary: antlr4ts + codemirror (~180 KB+) ship in their own async chunk
// so they only load when the formula editor dialog opens, not on every grid page.
// Same pattern as MarkDownEditor / MarkDownPreview.
const LazyFormulaEditor = lazy(() =>
  import('./FormulaEditorInner').then((m) => ({ default: m.FormulaEditor }))
);

export const FormulaEditor = (props: IFormulaEditorProps) => {
  return (
    <Suspense fallback={null}>
      <LazyFormulaEditor {...props} />
    </Suspense>
  );
};

export type { IFormulaEditorProps };
