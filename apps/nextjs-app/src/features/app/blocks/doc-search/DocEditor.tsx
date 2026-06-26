'use client';
import { Eye, Pencil, RefreshCw, Check, Loader2, AlertTriangle } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import type { IDocListItem } from './hooks';
import { useDoc, useUpdateDoc, useReindexDoc } from './hooks';

interface DocEditorProps {
  spaceId: string;
  doc: IDocListItem;
}

type SaveStatus = 'saved' | 'saving' | 'unsaved';

export function DocEditor({ spaceId, doc }: DocEditorProps) {
  const { data: fullDoc } = useDoc(spaceId, doc.id);
  const { mutate: updateDoc } = useUpdateDoc(spaceId);
  const { mutate: reindex, isPending: reindexing } = useReindexDoc(spaceId);

  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  const [title, setTitle] = useState(doc.title);
  const [content, setContent] = useState('');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaved = useRef({ title: doc.title, content: '' });

  // Populate content once fullDoc loads
  useEffect(() => {
    if (fullDoc?.rawContent !== undefined && content === '') {
      setContent(fullDoc.rawContent);
      lastSaved.current = { title: doc.title, content: fullDoc.rawContent };
    }
  }, [fullDoc?.rawContent, doc.title]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset when doc changes
  useEffect(() => {
    setTitle(doc.title);
    setContent('');
    setSaveStatus('saved');
    lastSaved.current = { title: doc.title, content: '' };
  }, [doc.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = useCallback(
    (t: string, c: string) => {
      if (t === lastSaved.current.title && c === lastSaved.current.content) return;
      setSaveStatus('saving');
      updateDoc(
        { docId: doc.id, data: { title: t, content: c } },
        {
          onSuccess: () => {
            lastSaved.current = { title: t, content: c };
            setSaveStatus('saved');
          },
          onError: () => setSaveStatus('unsaved'),
        }
      );
    },
    [doc.id, updateDoc]
  );

  const scheduleAutoSave = useCallback(
    (t: string, c: string) => {
      setSaveStatus('unsaved');
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => save(t, c), 1200);
    },
    [save]
  );

  const indexStatus = doc.isIndexed
    ? 'indexed'
    : doc.indexProgress === -1
      ? 'failed'
      : typeof doc.indexProgress === 'number' && doc.indexProgress > 0
        ? 'indexing'
        : 'pending';

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b px-5 py-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {saveStatus === 'saving' && (
            <span className="flex items-center gap-1">
              <Loader2 className="size-3 animate-spin" /> Saving…
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="flex items-center gap-1 text-green-600">
              <Check className="size-3" /> Saved
            </span>
          )}
          {saveStatus === 'unsaved' && <span className="text-yellow-600">Unsaved changes</span>}
          <span className="text-muted-foreground/40">·</span>
          {indexStatus === 'indexed' && (
            <span className="flex items-center gap-1 text-green-600">
              <Check className="size-3" /> Indexed
            </span>
          )}
          {(indexStatus === 'pending' || indexStatus === 'indexing') && (
            <span className="flex items-center gap-1 text-yellow-600">
              <Loader2 className="size-3 animate-spin" /> Indexing…
            </span>
          )}
          {indexStatus === 'failed' && (
            <span className="flex items-center gap-1 text-red-500">
              <AlertTriangle className="size-3" /> Index failed
            </span>
          )}
          {indexStatus === 'failed' && (
            <button
              className="ml-1 flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-foreground hover:bg-muted/80"
              onClick={() => reindex(doc.id)}
              disabled={reindexing}
            >
              <RefreshCw className={`size-3 ${reindexing ? 'animate-spin' : ''}`} /> Retry
            </button>
          )}
        </div>
        <div className="flex items-center rounded border p-0.5">
          <button
            onClick={() => setViewMode('edit')}
            className={`flex items-center gap-1 rounded px-2 py-0.5 text-xs transition-colors ${viewMode === 'edit' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Pencil className="size-3" /> Edit
          </button>
          <button
            onClick={() => {
              setViewMode('preview');
              if (saveTimer.current) {
                clearTimeout(saveTimer.current);
                save(title, content);
              }
            }}
            className={`flex items-center gap-1 rounded px-2 py-0.5 text-xs transition-colors ${viewMode === 'preview' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Eye className="size-3" /> Preview
          </button>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-8 py-6">
          {/* Title */}
          <input
            className="mb-4 w-full bg-transparent text-3xl font-bold outline-none placeholder:text-muted-foreground/40"
            placeholder="Sans titre"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              scheduleAutoSave(e.target.value, content);
            }}
            onBlur={() => {
              if (saveTimer.current) {
                clearTimeout(saveTimer.current);
                save(title, content);
              }
            }}
          />

          {viewMode === 'edit' ? (
            <textarea
              className="w-full resize-none bg-transparent font-mono text-sm leading-relaxed outline-none placeholder:text-muted-foreground/40"
              style={{ minHeight: 'calc(100vh - 260px)' }}
              placeholder="Commencez à écrire en Markdown…"
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                scheduleAutoSave(title, e.target.value);
              }}
              onBlur={() => {
                if (saveTimer.current) {
                  clearTimeout(saveTimer.current);
                  save(title, content);
                }
              }}
            />
          ) : (
            <div className="prose prose-sm max-w-none dark:prose-invert">
              {content ? (
                <ReactMarkdown>{content}</ReactMarkdown>
              ) : (
                <p className="italic text-muted-foreground">Nothing to preview yet.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
