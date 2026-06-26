import type { Editor } from '@milkdown/core';
import { editorViewCtx, serializerCtx } from '@milkdown/core';
import { sanitizeMarkdownBreaks } from './utils';

/**
 * Synchronously read current markdown from a milkdown editor instance,
 * bypassing the debounced listener. Returns `undefined` if the editor
 * is not ready.
 *
 * Kept out of ./utils so the lightweight string helpers there (stripMarkdown,
 * isMarkdownShowAs, …) used eagerly by CellValue don't drag @milkdown/core into
 * the bundle. See .planning/PERF-FIX-PLAN-2026-06-15.md.
 */
export const getEditorMarkdown = (editor: Editor): string | undefined => {
  try {
    return editor.action((ctx) => {
      const serializer = ctx.get(serializerCtx);
      const view = ctx.get(editorViewCtx);
      return sanitizeMarkdownBreaks(serializer(view.state.doc));
    });
  } catch {
    return undefined;
  }
};
