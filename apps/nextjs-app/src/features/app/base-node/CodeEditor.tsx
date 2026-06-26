'use client';

import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { javascript } from '@codemirror/lang-javascript';
import {
  foldGutter,
  indentOnInput,
  syntaxHighlighting,
  defaultHighlightStyle,
  bracketMatching,
  foldKeymap,
} from '@codemirror/language';
import { EditorState } from '@codemirror/state';
import { oneDark } from '@codemirror/theme-one-dark';
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
  highlightActiveLineGutter,
  drawSelection,
  rectangularSelection,
  crosshairCursor,
  dropCursor,
} from '@codemirror/view';
import { useEffect, useRef } from 'react';

interface ICodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: 'javascript' | 'jsx' | 'typescript';
  theme?: 'dark' | 'light';
  readOnly?: boolean;
}

export function CodeEditor({
  value,
  onChange,
  theme = 'dark',
  readOnly = false,
}: ICodeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!containerRef.current) return;

    const extensions = [
      // Line numbers + gutter
      lineNumbers(),
      highlightActiveLineGutter(),
      foldGutter(),

      // History (undo/redo)
      history(),

      // Editing helpers
      drawSelection(),
      dropCursor(),
      rectangularSelection(),
      crosshairCursor(),
      indentOnInput(),
      bracketMatching(),
      closeBrackets(),
      highlightActiveLine(),

      // Syntax
      javascript({ jsx: true, typescript: true }),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),

      // Theme
      ...(theme === 'dark' ? [oneDark] : []),

      // Keymaps
      keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...historyKeymap, ...foldKeymap]),

      // Update listener
      EditorView.updateListener.of((update) => {
        if (update.docChanged && !readOnly) {
          onChangeRef.current(update.state.doc.toString());
        }
      }),

      // Read-only mode
      ...(readOnly ? [EditorState.readOnly.of(true)] : []),

      // Line wrapping off (IDE style) + scrollable
      EditorView.theme({
        '&': { height: '100%', fontSize: '12.5px' },
        '.cm-scroller': {
          overflow: 'auto',
          fontFamily:
            '"Geist Mono", "Fira Code", "JetBrains Mono", "Cascadia Code", ui-monospace, monospace',
          lineHeight: '1.6',
        },
        '.cm-gutters': { borderRight: '1px solid rgba(255,255,255,0.08)', userSelect: 'none' },
        '.cm-lineNumbers .cm-gutterElement': {
          minWidth: '40px',
          padding: '0 8px 0 4px',
          color: '#636d83',
        },
        '.cm-foldGutter .cm-gutterElement': { padding: '0 4px', cursor: 'pointer' },
        '.cm-activeLine': { backgroundColor: 'rgba(255,255,255,0.04)' },
        '.cm-activeLineGutter': { backgroundColor: 'rgba(255,255,255,0.06)' },
        '.cm-matchingBracket': {
          backgroundColor: 'rgba(255,200,0,0.15)',
          outline: '1px solid rgba(255,200,0,0.3)',
        },
        '.cm-selectionBackground, ::selection': {
          backgroundColor: 'rgba(61,129,255,0.3) !important',
        },
        '.cm-cursor': { borderLeftColor: '#528bff' },
      }),
    ];

    const state = EditorState.create({
      doc: value,
      extensions,
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [theme, readOnly]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync external value changes (e.g., from AI generation) without breaking cursor
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== value) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
      });
    }
  }, [value]);

  return (
    <div
      ref={containerRef}
      className="size-full overflow-hidden"
      style={{ background: theme === 'dark' ? '#282c34' : '#fafafa' }}
    />
  );
}
