'use client';
import { useState, useRef } from 'react';
import { useImportMarkdown, useImportPdf, useImportUrl, useJobProgress } from './hooks';

interface DocImportPanelProps {
  spaceId: string;
  userId: string;
  onClose: () => void;
}

type Tab = 'markdown' | 'pdf' | 'url';

function validatePdf(f: File): string | null {
  if (f.type !== 'application/pdf') return 'Only PDF files are accepted';
  if (f.size > 50 * 1024 * 1024) return 'File exceeds 50 MB limit';
  return null;
}

function JobProgressBar({ state, progress }: { state: string; progress: number }) {
  const isFailed = state === 'failed';
  const isDone = state === 'completed';
  return (
    <div className="mt-3 space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-zinc-500 dark:text-zinc-400">
          {isDone
            ? 'Indexation terminée'
            : isFailed
              ? "Erreur d'indexation"
              : 'Indexation en cours…'}
        </span>
        <span
          className={`font-medium tabular-nums ${isFailed ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`}
        >
          {progress}%
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${isFailed ? 'bg-red-500' : isDone ? 'bg-green-500' : 'bg-blue-500'}`}
          style={{ width: `${progress}%` }}
        />
      </div>
      {isDone && (
        <p className="text-xs text-green-600 dark:text-green-400">
          Document disponible dans la bibliothèque.
        </p>
      )}
    </div>
  );
}

export function DocImportPanel({ spaceId, userId, onClose }: DocImportPanelProps) {
  const [tab, setTab] = useState<Tab>('markdown');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { mutate: importMd, isPending: mdPending } = useImportMarkdown(spaceId);
  const { mutate: importPdf, isPending: pdfPending } = useImportPdf(spaceId);
  const { mutate: importUrl, isPending: urlPending } = useImportUrl(spaceId);
  const { data: jobStatus } = useJobProgress(spaceId, jobId);

  const isPending = mdPending || pdfPending || urlPending;
  const cb = { onSuccess: (d: { jobId: string }) => setJobId(d.jobId) };

  const handleImport = () => {
    if (tab === 'markdown') {
      importMd({ title, content, userId }, cb);
      return;
    }
    if (tab === 'pdf') {
      if (!file) return;
      const err = validatePdf(file);
      if (err) {
        alert(err);
        return;
      }
      importPdf({ title, file, userId }, cb);
      return;
    }
    if (!url.startsWith('http')) {
      alert('Please enter a valid URL starting with http:// or https://');
      return;
    }
    importUrl({ url, title: title || undefined }, cb);
  };

  const isDisabled =
    isPending || (tab === 'pdf' ? !title || !file : tab === 'url' ? !url : !title || !content);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'markdown', label: 'Markdown' },
    { key: 'pdf', label: 'PDF' },
    { key: 'url', label: 'URL' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl bg-white p-5 shadow-2xl dark:bg-zinc-900"
        role="button"
        tabIndex={0}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-semibold dark:text-white">Import Document</h2>
        <div className="mb-4 flex gap-2">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`rounded px-4 py-1.5 text-sm uppercase tracking-wide ${tab === key ? 'bg-blue-600 text-white' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab !== 'url' && (
          <input
            className="mb-3 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            placeholder="Titre du document"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        )}

        {tab === 'markdown' && (
          <textarea
            className="h-40 w-full resize-none rounded-lg border px-3 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            placeholder="Coller le contenu Markdown ici..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        )}

        {tab === 'pdf' && (
          <button
            onClick={() => fileRef.current?.click()}
            onDrop={(e) => {
              e.preventDefault();
              setFile(e.dataTransfer.files[0] ?? null);
            }}
            onDragOver={(e) => e.preventDefault()}
            className="w-full rounded-lg border-2 border-dashed p-8 text-center hover:border-blue-400 dark:border-zinc-700"
            aria-label="Upload PDF file"
          >
            {file ? (
              <p className="text-sm text-zinc-600 dark:text-zinc-300">{file.name}</p>
            ) : (
              <p className="text-sm text-zinc-400">
                Drag and drop a PDF (max 50 MB), or click to browse
              </p>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </button>
        )}

        {tab === 'url' && (
          <div className="space-y-2">
            <input
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              placeholder="https://example.com/article"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              type="url"
            />
            <input
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              placeholder="Titre (optionnel — extrait automatiquement si vide)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <p className="text-xs text-zinc-400">
              Le contenu textuel de la page sera extrait et indexé pour la recherche.
            </p>
          </div>
        )}

        {jobId && jobStatus && (
          <JobProgressBar state={jobStatus.state} progress={jobStatus.progress} />
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg bg-zinc-100 px-4 py-2 text-sm dark:bg-zinc-800 dark:text-zinc-300"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={isDisabled}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {isPending ? 'Queueing...' : 'Import'}
          </button>
        </div>
      </div>
    </div>
  );
}
