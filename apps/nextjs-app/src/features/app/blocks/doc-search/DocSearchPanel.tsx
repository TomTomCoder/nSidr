'use client';
import type { IDocSearchResult } from '@teable/openapi';
import debounce from 'lodash/debounce';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useDocCapabilities, useDocSearch } from './hooks';

interface DocSearchPanelProps {
  spaceId: string;
  open: boolean;
  onClose: () => void;
  onSelectResult: (result: IDocSearchResult) => void;
}

type SearchMode = 'semantic' | 'keyword' | 'hybrid';

export function DocSearchPanel({ spaceId, open, onClose, onSelectResult }: DocSearchPanelProps) {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<SearchMode>('hybrid');
  const { mutate: search, data: results, isPending } = useDocSearch(spaceId);
  const { data: capabilities } = useDocCapabilities(spaceId);
  const embeddingEnabled = capabilities?.embeddingEnabled ?? true;

  useEffect(() => {
    if (!embeddingEnabled && (mode === 'semantic' || mode === 'hybrid')) {
      setMode('keyword');
    }
  }, [embeddingEnabled, mode]);

  // Debounce the actual search request so typing doesn't fire one embedding +
  // two DB queries per keystroke. The input stays controlled for instant feedback;
  // only the network call is deferred. searchRef keeps the latest mutate/mode without
  // re-creating the debounced fn (which would reset its timer every render).
  const searchRef = useRef<(q: string, m: SearchMode) => void>();
  searchRef.current = (q, m) => {
    if (q.trim().length > 1) search({ query: q, mode: m, limit: 10 });
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSearch = useCallback(
    debounce((q: string, m: SearchMode) => searchRef.current?.(q, m), 250),
    []
  );
  useEffect(() => () => debouncedSearch.cancel(), [debouncedSearch]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const handleSearch = (q: string) => {
    setQuery(q);
    debouncedSearch(q, mode);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-xl bg-white p-4 shadow-2xl dark:bg-zinc-900"
        role="button"
        tabIndex={0}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            onClose();
          } else {
            e.stopPropagation();
          }
        }}
      >
        <div className="mb-3 flex items-center gap-2">
          {(['semantic', 'keyword', 'hybrid'] as SearchMode[]).map((m) => {
            const requiresEmbedding = m === 'semantic' || m === 'hybrid';
            const disabled = requiresEmbedding && !embeddingEnabled;
            return (
              <button
                key={m}
                onClick={() => !disabled && setMode(m)}
                disabled={disabled}
                title={disabled ? 'Requires OPENAI_API_KEY' : undefined}
                className={`rounded px-3 py-1 text-sm capitalize transition-opacity ${
                  disabled
                    ? 'cursor-not-allowed opacity-40'
                    : mode === m
                      ? 'bg-blue-600 text-white'
                      : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'
                }`}
              >
                {m}
              </button>
            );
          })}
          {!embeddingEnabled && (
            <span className="ml-auto text-xs text-amber-500 dark:text-amber-400">
              Keyword search only — add OPENAI_API_KEY for semantic search
            </span>
          )}
        </div>
        <input
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
          className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
          placeholder="Rechercher des documents..."
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
        />
        {isPending && <p className="mt-2 text-xs text-zinc-400">Recherche en cours...</p>}
        <ul className="mt-3 max-h-96 space-y-2 overflow-y-auto">
          {results?.map((r) => (
            <li key={r.chunkId} className="rounded-lg p-3 hover:bg-zinc-100 dark:hover:bg-zinc-800">
              <button
                onClick={() => onSelectResult(r)}
                className="w-full text-left"
                aria-label={`View ${r.docTitle}: ${r.chunkContent.substring(0, 50)}...`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
                    {r.docTitle}
                  </span>
                  <span className="text-xs text-zinc-400">{(r.score * 100).toFixed(0)}%</span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-zinc-500">{r.chunkContent}</p>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
