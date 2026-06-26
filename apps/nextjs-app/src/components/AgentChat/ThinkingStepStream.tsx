'use client';

/**
 * ClickUp-style animated thinking-step stream.
 * Renders a bullet list of "thinking" steps that stream in one-by-one.
 * The last (current) item pulses in pink; completed items are muted.
 */

import { useEffect, useRef, useState } from 'react';

const STEPS_BY_PHASE: Record<string, string[]> = {
  personalize: [
    'Réveil du héros',
    'Prototype de super-héros',
    'Élaboration de nouvelles capacités',
    'Analyse des exigences',
    'Connexion aux sources de données',
    'Sélection des outils de surveillance',
    'Réflexion sur les possibilités',
  ],
  integrate: [
    'Finalisation des instructions',
    'Configuration des déclencheurs',
    'Connexion à la base de données',
    'Vérification des permissions',
    "Activation de l'agent",
  ],
};

interface ThinkingStepStreamProps {
  /** Which phase is active — controls which step list is used */
  phase: 'personalize' | 'integrate';
  /** ms between each step appearing (default 600) */
  intervalMs?: number;
}

export function ThinkingStepStream({ phase, intervalMs = 600 }: ThinkingStepStreamProps) {
  const steps = STEPS_BY_PHASE[phase] ?? STEPS_BY_PHASE.personalize;
  const [visibleCount, setVisibleCount] = useState(1);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setVisibleCount(1);
    timerRef.current = setInterval(() => {
      setVisibleCount((n) => {
        if (n >= steps.length) {
          if (timerRef.current) clearInterval(timerRef.current);
          return n;
        }
        return n + 1;
      });
    }, intervalMs);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, intervalMs, steps.length]);

  return (
    <ul className="space-y-2 py-1">
      {steps.slice(0, visibleCount).map((step, i) => {
        const isCurrent = i === visibleCount - 1;
        const isDone = i < visibleCount - 1;
        return (
          <li key={step} className="flex items-center gap-2 text-sm">
            {/* Bullet */}
            <span
              className={
                isCurrent
                  ? 'size-1.5 shrink-0 animate-pulse rounded-full bg-pink-500 shadow-[0_0_6px_2px_rgba(236,72,153,0.55)]'
                  : isDone
                    ? 'size-1.5 shrink-0 rounded-full bg-muted-foreground/30'
                    : 'size-1.5 shrink-0 rounded-full bg-muted-foreground/20'
              }
            />
            <span
              className={
                isCurrent ? 'font-medium text-pink-400 dark:text-pink-300' : 'text-muted-foreground'
              }
            >
              {step}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
