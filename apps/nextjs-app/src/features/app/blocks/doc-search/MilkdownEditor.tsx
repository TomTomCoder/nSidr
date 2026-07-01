'use client';

import { Editor, rootCtx, defaultValueCtx } from '@milkdown/kit/core';
import { commonmark } from '@milkdown/kit/preset/commonmark';
import { gfm } from '@milkdown/kit/preset/gfm';
import { history } from '@milkdown/kit/plugin/history';
import { listener, listenerCtx } from '@milkdown/kit/plugin/listener';
import { Milkdown, MilkdownProvider, useEditor } from '@milkdown/react';
import { nord } from '@milkdown/theme-nord';
import '@milkdown/theme-nord/style.css';
import { useRef } from 'react';

interface IMilkdownEditorProps {
  /** Initial markdown — source of truth. Read once at editor creation (uncontrolled). */
  defaultValue: string;
  /** Fires with serialized markdown whenever the document changes. */
  onChange: (markdown: string) => void;
}

// Milkdown is markdown-native: it parses `defaultValue` into a ProseMirror doc via
// the commonmark/gfm remark transformers, and serializes back to markdown with the
// same transformers. Because parse and serialize share one remark schema, the
// markdown → WYSIWYG → markdown round-trip is stable for the supported node set
// (headings, lists, code blocks, tables, blockquotes, emphasis, links).
function MilkdownInner({ defaultValue, onChange }: IMilkdownEditorProps) {
  // Keep the latest onChange without re-creating the editor (editor is uncontrolled).
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEditor((root) =>
    Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, root);
        ctx.set(defaultValueCtx, defaultValue);
        ctx.get(listenerCtx).markdownUpdated((_ctx, markdown, prevMarkdown) => {
          if (markdown !== prevMarkdown) onChangeRef.current(markdown);
        });
      })
      .config(nord)
      .use(commonmark)
      .use(gfm)
      .use(history)
      .use(listener)
  );

  return <Milkdown />;
}

/**
 * WYSIWYG markdown editor. Uncontrolled: `defaultValue` seeds the document once,
 * subsequent edits are reported through `onChange` as serialized markdown. Remount
 * (via a `key` on the parent) to load a different document.
 */
export function MilkdownEditor(props: IMilkdownEditorProps) {
  return (
    <MilkdownProvider>
      <MilkdownInner {...props} />
    </MilkdownProvider>
  );
}
