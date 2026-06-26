'use client';

import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { EditorState } from '@codemirror/state';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView, keymap, drawSelection, dropCursor } from '@codemirror/view';
import { useTheme } from '@teable/next-themes';
import type { IDocFolder } from '@teable/openapi';
import { Badge, ToggleGroup, ToggleGroupItem } from '@teable/ui-lib/shadcn';
import debounce from 'lodash/debounce';
import { ChevronRight, FolderOpen, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import { useDoc, useDocFolders, useUpdateDoc } from './hooks';
import { LinkedDocsPanel } from './LinkedDocsPanel';
import { MemoryPanel } from './MemoryPanel';
import { useDocEditorStore } from './useDocEditorStore';

interface IDocEditorAreaProps {
  spaceId: string;
}

export function DocEditorArea({ spaceId }: IDocEditorAreaProps) {
  const { selectedDocId, mode, setMode } = useDocEditorStore();
  const { resolvedTheme } = useTheme();
  const theme = resolvedTheme === 'dark' ? 'dark' : 'light';

  // Load selected doc
  const { data: doc, isLoading } = useDoc(spaceId, selectedDocId ?? '');
  const { data: folders } = useDocFolders(spaceId);
  const { mutateAsync: updateDoc } = useUpdateDoc(spaceId);

  // Local state for content, title, save indicator
  const [localContent, setLocalContent] = useState('');
  const [localTitle, setLocalTitle] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Sync doc content/title into local state on doc change
  useEffect(() => {
    if (doc) {
      setLocalContent(doc.rawContent ?? '');
      setLocalTitle(doc.title ?? '');
    }
  }, [doc?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // -----------------------------------------------------------------------
  // Auto-save: stable saveRef wrapping the PATCH mutation
  // -----------------------------------------------------------------------
  const saveRef = useRef<(content: string) => Promise<void>>();
  saveRef.current = async (content: string) => {
    if (!selectedDocId) return;
    setSaveStatus('saving');
    try {
      await updateDoc({ docId: selectedDocId, data: { content } });
      setSaveStatus('saved');
    } catch (_e) {
      setSaveStatus('idle');
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSave = useCallback(
    debounce((content: string) => saveRef.current?.(content), 800),
    []
  );

  // Fade "Saved" indicator after 2s
  useEffect(() => {
    if (saveStatus !== 'saved') return;
    const timer = setTimeout(() => setSaveStatus('idle'), 2000);
    return () => clearTimeout(timer);
  }, [saveStatus]);

  // -----------------------------------------------------------------------
  // Title debounced save (500ms on change)
  // -----------------------------------------------------------------------
  const titleSaveRef = useRef<(title: string) => Promise<void>>();
  titleSaveRef.current = async (title: string) => {
    if (!selectedDocId) return;
    await updateDoc({ docId: selectedDocId, data: { title } });
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedTitleSave = useCallback(
    debounce((title: string) => titleSaveRef.current?.(title), 500),
    []
  );

  // Cancel pending debounced saves on unmount to prevent state updates after unmount.
  useEffect(() => {
    return () => {
      debouncedSave.cancel();
      debouncedTitleSave.cancel();
    };
  }, [debouncedSave, debouncedTitleSave]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalTitle(e.target.value);
    debouncedTitleSave(e.target.value);
  };

  // -----------------------------------------------------------------------
  // handleChange: update local content + trigger debounced save
  // -----------------------------------------------------------------------
  const handleChange = (content: string) => {
    setLocalContent(content);
    debouncedSave(content);
  };

  // -----------------------------------------------------------------------
  // CodeMirror editor
  // -----------------------------------------------------------------------
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  // True while a programmatic dispatch is in flight. The updateListener fires
  // synchronously inside dispatch(), so this flag suppresses the auto-save that
  // would otherwise reset isIndexed=false on every doc open.
  const isProgrammaticChange = useRef(false);
  const onChangeRef = useRef(handleChange);
  onChangeRef.current = handleChange;

  // Init effect — deps [theme] only (Pitfall 2 compliance)
  useEffect(() => {
    if (!containerRef.current) return;

    const extensions = [
      history(),
      drawSelection(),
      dropCursor(),
      EditorView.lineWrapping,
      markdown(),
      ...(theme === 'dark' ? [oneDark] : []),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      EditorView.updateListener.of((update) => {
        if (update.docChanged && !isProgrammaticChange.current) {
          onChangeRef.current(update.state.doc.toString());
        }
      }),
      EditorView.theme({
        '&': { height: '100%', fontSize: '14px' },
        '.cm-scroller': { overflow: 'auto', lineHeight: '1.7', fontFamily: 'inherit' },
        '.cm-content': { padding: '16px' },
      }),
    ];

    const state = EditorState.create({ doc: localContent, extensions });
    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [theme, selectedDocId, isLoading, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Value-sync effect — separate, deps [localContent] (Pitfall 2)
  // Sets isProgrammaticChange before dispatching so the updateListener skips
  // the auto-save. dispatch() fires the listener synchronously, so the flag is
  // already cleared by the time this effect returns.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== localContent) {
      isProgrammaticChange.current = true;
      view.dispatch({ changes: { from: 0, to: current.length, insert: localContent } });
      isProgrammaticChange.current = false;
    }
  }, [localContent]);

  // -----------------------------------------------------------------------
  // Breadcrumb: folder name > doc title
  // -----------------------------------------------------------------------
  const folder: IDocFolder | undefined = folders?.find((f) => f.id === doc?.folderId);
  const breadcrumbFolder = folder?.name ?? null;
  const breadcrumbDoc = doc?.title ?? null;

  // P-04: getDoc returns _count for links + memory; gate the side panels on it so dormant
  // features don't each fire a fetch on every doc-open. (_count isn't in the openapi type.)
  const counts = (
    doc as unknown as
      | {
          _count?: { linksFrom?: number; linksTo?: number; memoryEntities?: number };
        }
      | undefined
  )?._count;
  const hasLinks = (counts?.linksFrom ?? 0) + (counts?.linksTo ?? 0) > 0;
  const hasMemory = (counts?.memoryEntities ?? 0) > 0;

  // -----------------------------------------------------------------------
  // Index status badge
  // -----------------------------------------------------------------------
  const indexBadge = () => {
    if (!doc) return null;
    if (doc.isIndexed) {
      return (
        <Badge
          variant="outline"
          className="gap-1 border-emerald-500/40 text-xs text-emerald-600 dark:text-emerald-400"
        >
          <span className="size-1.5 rounded-full bg-emerald-500" />
          Indexed
        </Badge>
      );
    }
    return (
      <Badge
        variant="outline"
        className="gap-1 border-amber-500/40 text-xs text-amber-600 dark:text-amber-400"
      >
        <Loader2 className="size-3 animate-spin" />
        Indexing…
      </Badge>
    );
  };

  // -----------------------------------------------------------------------
  // No doc selected — empty state
  // -----------------------------------------------------------------------
  if (!selectedDocId) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center overflow-hidden">
        <FolderOpen className="mb-3 size-12 text-muted-foreground opacity-30" />
        <p className="text-sm font-semibold text-muted-foreground">Select a document</p>
        <p className="mt-1 max-w-xs text-center text-xs text-muted-foreground">
          Choose a document from the folder tree to view and edit it here.
        </p>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Loading skeleton
  // -----------------------------------------------------------------------
  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col overflow-hidden p-4">
        <div className="mb-3 h-8 w-full animate-pulse rounded-sm bg-muted" />
        <div className="mb-2 h-8 w-4/5 animate-pulse rounded-sm bg-muted" />
        <div className="h-8 w-3/5 animate-pulse rounded-sm bg-muted" />
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Main editor area
  // -----------------------------------------------------------------------
  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex h-10 shrink-0 items-center justify-between border-b px-4">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          {breadcrumbFolder && (
            <>
              <span>{breadcrumbFolder}</span>
              <ChevronRight className="size-2.5" />
            </>
          )}
          {breadcrumbDoc && <span className="font-medium">{breadcrumbDoc}</span>}
        </div>

        {/* Right side: mode toggle + status + save indicator */}
        <div className="flex items-center gap-3">
          {/* Save indicator */}
          {saveStatus !== 'idle' && (
            <span
              className="text-xs text-muted-foreground transition-opacity duration-500"
              style={{ opacity: saveStatus === 'saved' ? 0.6 : 1 }}
            >
              {saveStatus === 'saving' ? 'Saving...' : 'Saved'}
            </span>
          )}

          {/* Index status badge */}
          {indexBadge()}

          {/* Mode toggle */}
          <ToggleGroup
            type="single"
            value={mode}
            onValueChange={(val) => {
              if (val) setMode(val as 'edit' | 'split' | 'preview');
            }}
            aria-label="Editor mode"
            className="h-7"
          >
            <ToggleGroupItem value="edit" className="h-7 px-2 text-xs">
              Edit
            </ToggleGroupItem>
            <ToggleGroupItem value="split" className="h-7 px-2 text-xs">
              Split
            </ToggleGroupItem>
            <ToggleGroupItem value="preview" className="h-7 px-2 text-xs">
              Preview
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {/* Title input */}
      <div className="shrink-0 border-b">
        <input
          type="text"
          value={localTitle}
          onChange={handleTitleChange}
          placeholder="Sans titre"
          className="w-full bg-transparent px-4 py-3 text-lg font-semibold placeholder:text-muted-foreground focus:outline-none"
        />
      </div>

      {/* Editor area */}
      {mode === 'edit' && (
        <div className="flex-1 overflow-hidden">
          <div ref={containerRef} className="size-full overflow-hidden" />
        </div>
      )}

      {mode === 'split' && (
        // flex-1 + min-h-0 (not h-full): take the remaining height after the toolbar
        // and title without overflowing, so the LinkedDocsPanel below stays visible.
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <div className="w-1/2 min-w-0 overflow-hidden">
            <div ref={containerRef} className="size-full overflow-hidden" />
          </div>
          <div className="prose prose-sm w-1/2 min-w-0 max-w-none overflow-y-auto border-l px-6 py-4 dark:prose-invert">
            <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{localContent}</ReactMarkdown>
          </div>
        </div>
      )}

      {mode === 'preview' && (
        <div className="flex-1 overflow-y-auto">
          <div className="prose prose-sm max-w-none px-6 py-4 dark:prose-invert">
            <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{localContent}</ReactMarkdown>
          </div>
        </div>
      )}

      {/* P-04: only mount the side panels (each fires a fetch) when the doc actually has
          links / memory, using the _count getDoc already returns — avoids a wasted round-trip
          per doc-open for the common case of no links and no extracted memory. */}
      {selectedDocId && hasLinks && <LinkedDocsPanel spaceId={spaceId} docId={selectedDocId} />}

      {/* Phase 3: agent memory graph (entities + relations) extracted from this doc */}
      {selectedDocId && hasMemory && <MemoryPanel spaceId={spaceId} docId={selectedDocId} />}
    </div>
  );
}
