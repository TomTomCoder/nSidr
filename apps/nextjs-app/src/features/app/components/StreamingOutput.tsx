'use client';

import { cn } from '@teable/ui-lib/shadcn';
import { Check, ChevronRight, Copy, Loader2 } from 'lucide-react';
import { useCallback, useLayoutEffect, useMemo, useRef, useState, useEffect } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface IStep {
  id: string;
  label: string;
  status: 'pending' | 'loading' | 'done';
}

export interface IStreamingAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'secondary';
}

export interface IStreamingOutputProps {
  /** Steps shown above the text stream */
  steps?: IStep[];
  /** Raw markdown-like text — grows progressively during streaming */
  content?: string;
  /** True while backend is still sending tokens */
  isStreaming?: boolean;
  /** Action buttons revealed after streaming ends */
  actions?: IStreamingAction[];
  /** Called when user clicks an action button */
  onAction?: (id: string) => void;
  className?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const CHARS_PER_FRAME = 4;
const SCROLL_THRESHOLD = 40;

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface ISegment {
  type: 'text' | 'code';
  content: string;
  filename?: string;
  language?: string;
}

/**
 * Splits raw content into text and fenced code block segments.
 * Supports  ```lang:filename  or  ```lang  headers.
 */
function parseSegments(raw: string): ISegment[] {
  const segments: ISegment[] = [];
  const parts = raw.split(/(```[^\n]*\n[\s\S]*?```)/);

  for (const part of parts) {
    if (part.startsWith('```')) {
      const newlineIdx = part.indexOf('\n');
      const meta = part.slice(3, newlineIdx).trim();
      const code = part.slice(newlineIdx + 1).replace(/```$/, '');
      const colonIdx = meta.indexOf(':');
      const language = colonIdx > -1 ? meta.slice(0, colonIdx) || 'text' : meta || 'text';
      const filename = colonIdx > -1 ? meta.slice(colonIdx + 1) : undefined;
      segments.push({ type: 'code', content: code, language, filename });
    } else if (part) {
      segments.push({ type: 'text', content: part });
    }
  }
  return segments;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StepItem({ step }: { step: IStep }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="relative flex size-5 shrink-0 items-center justify-center">
        {step.status === 'loading' && <Loader2 className="size-4 animate-spin text-primary" />}
        {step.status === 'done' && (
          <span className="flex size-5 animate-in zoom-in-75 items-center justify-center rounded-full bg-emerald-500/15 duration-300">
            <Check className="size-3 text-emerald-500" strokeWidth={2.5} />
          </span>
        )}
        {step.status === 'pending' && (
          <span className="size-1.5 rounded-full bg-muted-foreground/30" />
        )}
      </span>

      <span
        className={cn(
          'text-sm transition-colors duration-300',
          step.status === 'done' && 'text-foreground',
          step.status === 'loading' && 'text-foreground',
          step.status === 'pending' && 'text-muted-foreground/50'
        )}
      >
        {step.label}
      </span>

      {step.status === 'loading' && (
        <span className="ml-auto flex gap-0.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="inline-block size-1 animate-bounce rounded-full bg-primary/60"
              style={{ animationDelay: `${i * 120}ms` }}
            />
          ))}
        </span>
      )}
    </div>
  );
}

function CodeBlock({
  code,
  language,
  filename,
}: {
  code: string;
  language: string;
  filename?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(() => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }, [code]);

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-white/10 bg-zinc-950/80 text-sm shadow-lg">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-white/[0.08] bg-zinc-900/60 px-4 py-2">
        <div className="flex items-center gap-2">
          {/* Traffic-light dots */}
          <div className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-red-500/70" />
            <span className="size-2.5 rounded-full bg-amber-400/70" />
            <span className="size-2.5 rounded-full bg-emerald-500/70" />
          </div>
          <span className="ml-1 font-mono text-xs text-zinc-400">{filename ?? language}</span>
        </div>

        <button
          onClick={copy}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-all duration-200',
            copied ? 'text-emerald-400' : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-300'
          )}
        >
          {copied ? <Check className="size-3" strokeWidth={2.5} /> : <Copy className="size-3" />}
          {copied ? 'Copié !' : 'Copier'}
        </button>
      </div>

      {/* Code body */}
      <div className="overflow-x-auto">
        <SyntaxHighlighter
          language={language}
          style={oneDark}
          customStyle={{
            margin: 0,
            padding: '1rem',
            background: 'transparent',
            fontSize: '0.8125rem',
            lineHeight: '1.6',
          }}
          codeTagProps={{ style: { fontFamily: 'var(--font-mono, ui-monospace, monospace)' } }}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function StreamingOutput({
  steps = [],
  content = '',
  isStreaming = false,
  actions = [],
  onAction,
  className,
}: IStreamingOutputProps) {
  // Typewriter: visible length catches up to real content length via rAF
  const [displayedLength, setDisplayedLength] = useState(0);
  const rafRef = useRef<number | null>(null);
  const lastRealLength = useRef(0);

  useEffect(() => {
    const target = content.length;

    // Large jump in content → fast-forward to avoid large lag
    if (content.length > lastRealLength.current + 200) {
      setDisplayedLength((prev) => Math.max(prev, content.length - 80));
    }
    lastRealLength.current = content.length;

    if (displayedLength >= target) return;

    const tick = () => {
      setDisplayedLength((prev) => {
        const next = Math.min(prev + CHARS_PER_FRAME, target);
        if (next < target) {
          rafRef.current = requestAnimationFrame(tick);
        }
        return next;
      });
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  const displayedContent = content.slice(0, displayedLength);
  const segments = useMemo(() => parseSegments(displayedContent), [displayedContent]);
  const showCursor = isStreaming || displayedLength < content.length;

  // Auto-scroll: detect manual up-scroll and pause auto-scroll
  const scrollRef = useRef<HTMLDivElement>(null);
  const userScrolledUp = useRef(false);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    userScrolledUp.current = el.scrollHeight - el.scrollTop - el.clientHeight > SCROLL_THRESHOLD;
  }, []);

  useLayoutEffect(() => {
    if (userScrolledUp.current) return;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  });

  const showActions = !isStreaming && displayedLength >= content.length && actions.length > 0;

  return (
    <div
      className={cn(
        'relative flex flex-col overflow-hidden rounded-2xl',
        'border border-white/10',
        'bg-background/10',
        'shadow-2xl shadow-black/20',
        className
      )}
      style={{ backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
    >
      {/* Depth gradient */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-b from-white/[0.03] to-transparent" />

      {/* ── Steps ── */}
      {steps.length > 0 && (
        <div className="border-b border-white/[0.08] px-5 py-4">
          <div className="flex flex-col gap-3">
            {steps.map((step) => (
              <StepItem key={step.id} step={step} />
            ))}
          </div>
        </div>
      )}

      {/* ── Stream text ── */}
      {displayedContent.length > 0 && (
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="max-h-[460px] overflow-y-auto px-5 py-4 text-sm"
          style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}
        >
          {segments.map((seg, i) =>
            seg.type === 'code' ? (
              <CodeBlock
                key={i}
                code={seg.content}
                language={seg.language ?? 'text'}
                filename={seg.filename}
              />
            ) : (
              <p key={i} className="whitespace-pre-wrap leading-relaxed text-foreground/90">
                {seg.content}
              </p>
            )
          )}

          {/* Blinking cursor */}
          {showCursor && (
            <span
              className="ml-0.5 inline-block h-[1.1em] w-[2px] translate-y-[2px] rounded-sm bg-primary align-middle"
              style={{ animation: 'so-cursor-blink 1s step-end infinite' }}
            />
          )}
        </div>
      )}

      {/* ── Action buttons (fade-in after done) ── */}
      {showActions && (
        <div className="border-t border-white/[0.08] px-5 py-3">
          <div className="flex flex-wrap gap-2 animate-in fade-in-0 zoom-in-95 duration-300">
            {actions.map((action) => (
              <button
                key={action.id}
                onClick={() => onAction?.(action.id)}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium',
                  'transition-all duration-150 hover:scale-[1.03] active:scale-[0.97]',
                  action.variant === 'secondary'
                    ? 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                    : 'bg-primary/90 text-primary-foreground hover:bg-primary'
                )}
              >
                {action.icon}
                {action.label}
                <ChevronRight className="size-3 opacity-60" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Cursor keyframe */}
      <style>{`
        @keyframes so-cursor-blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// ─── Demo ─────────────────────────────────────────────────────────────────────

const DEMO_SCRIPT = `Voici la structure suggérée pour votre composant :

\`\`\`tsx:app.tsx
import { useState } from 'react';

export function Counter() {
  const [count, setCount] = useState(0);
  return (
    <button onClick={() => setCount(c => c + 1)}>
      Clics : {count}
    </button>
  );
}
\`\`\`

Le composant utilise **useState** pour l'état local. Vous pouvez ajouter une animation sur le bouton avec Tailwind CSS \`transition-transform active:scale-95\`.`;

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

export function StreamingOutputDemo() {
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [content, setContent] = useState('');
  const initialSteps: IStep[] = [
    { id: '1', label: 'Analyse de la demande', status: 'pending' },
    { id: '2', label: 'Génération du composant', status: 'pending' },
    { id: '3', label: 'Vérification du code', status: 'pending' },
  ];
  const [steps, setSteps] = useState<IStep[]>(initialSteps);

  const advance = (id: string, status: IStep['status']) =>
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));

  const reset = () => {
    setContent('');
    setDone(false);
    setSteps(initialSteps);
  };

  const simulate = async () => {
    reset();
    setRunning(true);

    advance('1', 'loading');
    await sleep(700);
    advance('1', 'done');

    advance('2', 'loading');
    await sleep(300);

    for (let i = 0; i <= DEMO_SCRIPT.length; i += 5) {
      setContent(DEMO_SCRIPT.slice(0, i));
      await sleep(16);
    }
    setContent(DEMO_SCRIPT);
    advance('2', 'done');

    advance('3', 'loading');
    await sleep(800);
    advance('3', 'done');

    setRunning(false);
    setDone(true);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 p-8">
      <StreamingOutput
        steps={steps}
        content={content}
        isStreaming={running}
        actions={
          done
            ? [
                { id: 'improve', label: "Améliorer l'interface" },
                { id: 'copy', label: 'Copier tout', variant: 'secondary' },
              ]
            : []
        }
        onAction={(id) => console.log('action:', id)}
        className="w-full max-w-2xl"
      />

      <button
        onClick={running ? undefined : simulate}
        disabled={running}
        className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-lg transition-all hover:scale-[1.02] disabled:opacity-50"
      >
        {running && <Loader2 className="size-4 animate-spin" />}
        {running ? 'Génération…' : done ? 'Rejouer' : 'Lancer la démo'}
      </button>
    </div>
  );
}
