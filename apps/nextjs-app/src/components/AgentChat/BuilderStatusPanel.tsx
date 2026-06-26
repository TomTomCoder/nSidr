'use client';

/**
 * Right-side animated status panel for the 3-step agent builder.
 * Mirrors ClickUp: Alignement (wireframe mask) → Personnalisation (bust forms) →
 * Intégration (full colored avatar).
 */
import type { BuilderStep } from './AgentBuilder';

const STEP_META: Record<BuilderStep, { label: string; caption: string }> = {
  1: { label: 'Alignement', caption: 'En attente de vos instructions…' },
  2: {
    label: 'Personnalisation',
    caption: 'Des capacités sur mesure pour répondre à vos besoins.',
  },
  3: { label: 'Intégration', caption: 'Finalisation de la configuration et préparation…' },
};

// Progress dot-matrix bar (decorative, like ClickUp)
function DotMatrix({ filled }: { filled: number }) {
  const total = 60;
  return (
    <div className="flex flex-wrap gap-1" style={{ width: 220 }}>
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={`size-1 rounded-sm transition-colors ${i < filled ? 'bg-emerald-400' : 'bg-muted'}`}
        />
      ))}
    </div>
  );
}

function avatarGradient(name?: string) {
  const g = [
    'from-violet-500 to-purple-600',
    'from-blue-500 to-cyan-500',
    'from-emerald-500 to-teal-500',
    'from-orange-500 to-amber-500',
    'from-rose-500 to-pink-500',
  ];
  return g[(name?.charCodeAt(0) ?? 0) % g.length];
}

export function BuilderStatusPanel({ step, agentName }: { step: BuilderStep; agentName?: string }) {
  const meta = STEP_META[step];

  return (
    <div className="flex w-1/2 flex-col items-center justify-between bg-muted/30 px-8 py-10">
      {/* Step header */}
      <div className="text-center">
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          Étape {step} sur 3
        </p>
        <p className="mt-1 font-mono text-lg text-foreground">{meta.label}</p>
      </div>

      {/* Center visual */}
      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="relative flex size-56 items-center justify-center">
          {/* Step 1: wireframe mask */}
          {step === 1 && (
            <svg
              viewBox="0 0 200 140"
              className="size-full text-border [animation:fadein_0.6s_ease]"
            >
              <g fill="none" stroke="currentColor" strokeWidth="0.5">
                {Array.from({ length: 14 }).map((_, r) => (
                  <ellipse key={`h${r}`} cx="100" cy="70" rx={90 - r * 4} ry={60 - r * 4} />
                ))}
                <ellipse cx="65" cy="65" rx="22" ry="16" stroke="currentColor" strokeWidth="0.8" />
                <ellipse cx="135" cy="65" rx="22" ry="16" stroke="currentColor" strokeWidth="0.8" />
              </g>
            </svg>
          )}

          {/* Step 2: wireframe bust forming, pink scanline */}
          {step === 2 && (
            <div className="relative size-full [animation:fadein_0.6s_ease]">
              <svg viewBox="0 0 200 200" className="size-full text-muted-foreground/40">
                <g fill="none" stroke="currentColor" strokeWidth="0.5">
                  <ellipse cx="100" cy="70" rx="42" ry="50" />
                  {Array.from({ length: 10 }).map((_, i) => (
                    <ellipse key={i} cx="100" cy="70" rx={42 - i * 4} ry={50 - i * 4} />
                  ))}
                  <path d="M40 200 Q40 130 100 125 Q160 130 160 200" />
                  {Array.from({ length: 8 }).map((_, i) => (
                    <line key={i} x1={40 + i * 15} y1="200" x2={60 + i * 12} y2="130" />
                  ))}
                </g>
              </svg>
              {/* pink scan line sweeping */}
              <div className="pointer-events-none absolute inset-x-0 top-1/3 h-px bg-pink-500/70 [animation:scan_2s_ease-in-out_infinite]" />
            </div>
          )}

          {/* Step 3: full colored avatar reveal */}
          {step === 3 && (
            <div
              className={`flex size-40 items-center justify-center rounded-full bg-gradient-to-br ${avatarGradient(agentName)} text-5xl font-bold text-white shadow-xl [animation:popin_0.5s_ease]`}
            >
              {agentName?.[0]?.toUpperCase() ?? '✨'}
            </div>
          )}
        </div>

        <p className="mt-6 max-w-[220px] text-center font-mono text-xs text-muted-foreground">
          {meta.caption}
        </p>
      </div>

      {/* Progress bar */}
      <DotMatrix filled={step * 20} />

      {/* eslint-disable-next-line react/no-unknown-property */}
      <style jsx>{`
        @keyframes fadein {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes scan {
          0%,
          100% {
            top: 25%;
          }
          50% {
            top: 60%;
          }
        }
        @keyframes popin {
          0% {
            transform: scale(0.6);
            opacity: 0;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
