'use client';

import { useEffect, useRef, useState } from 'react';

interface PromptCarouselProps {
  prompts: string[];
  /** Called when the user clicks the currently displayed prompt. */
  onPick: (prompt: string) => void;
  className?: string;
}

const TYPE_MS = 28; // per-character typing speed
const HOLD_MS = 2200; // pause once fully typed before cycling

/**
 * Auto-cycling typewriter prompt carousel for the empty chat state.
 * Types each example prompt character-by-character, holds, then advances.
 * Pagination dots reflect the active prompt; clicking the text submits it.
 * Pauses while the tab is hidden to avoid wasted timers.
 */
export function PromptCarousel({ prompts, onPick, className }: PromptCarouselProps) {
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (prompts.length === 0) return;
    const full = prompts[index % prompts.length];
    let char = 0;

    const clear = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };

    const tick = () => {
      if (document.hidden) {
        timerRef.current = setTimeout(tick, HOLD_MS);
        return;
      }
      if (char <= full.length) {
        setTyped(full.slice(0, char));
        char += 1;
        timerRef.current = setTimeout(tick, TYPE_MS);
      } else {
        // Fully typed — hold, then advance to the next prompt
        timerRef.current = setTimeout(() => {
          setIndex((i) => (i + 1) % prompts.length);
        }, HOLD_MS);
      }
    };

    tick();
    return clear;
  }, [index, prompts]);

  if (prompts.length === 0) return null;

  const active = prompts[index % prompts.length];

  return (
    <div className={`flex flex-col items-center gap-3 ${className ?? ''}`}>
      <button
        type="button"
        onClick={() => onPick(active)}
        className="min-h-[44px] w-full max-w-md rounded-lg border bg-card px-4 py-3 text-left text-sm text-muted-foreground transition-colors hover:bg-accent/60"
      >
        <span>{typed}</span>
        <span className="ml-0.5 inline-block h-4 w-px animate-pulse bg-muted-foreground/70 align-middle" />
      </button>
      <div className="flex items-center gap-1.5">
        {prompts.map((p, i) => (
          <button
            key={p}
            type="button"
            aria-label={`Suggestion ${i + 1}`}
            onClick={() => setIndex(i)}
            className={`h-1.5 rounded-full transition-all ${
              i === index % prompts.length
                ? 'w-4 bg-primary'
                : 'w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
