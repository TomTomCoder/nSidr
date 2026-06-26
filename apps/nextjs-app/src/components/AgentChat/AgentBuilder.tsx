'use client';

/**
 * ClickUp-style Super Agent builder.
 *   - "Demander" : full-width brainstorm chat (idea suggestions)
 *   - "Agents"   : split-screen 3-step builder (Alignement → Personnalisation → Intégration)
 * Produces a real agent via POST /api/agent, then redirects to /agent/:id.
 */
import { cn } from '@teable/ui-lib/shadcn';
import { Button } from '@teable/ui-lib/shadcn/ui/button';
import { toast } from '@teable/ui-lib/shadcn/ui/sonner';
import { Textarea } from '@teable/ui-lib/shadcn/ui/textarea';
import {
  ArrowLeft,
  CheckSquare,
  ClipboardList,
  CornerDownLeft,
  Database,
  FolderKanban,
  Glasses,
  RefreshCw,
  Rocket,
  Search,
  Send,
  Settings2,
  Sparkles,
  Workflow,
} from 'lucide-react';
import { useRouter } from 'next/router';
import { useEffect, useRef, useState } from 'react';
import { BuilderStatusPanel } from './BuilderStatusPanel';
import { ThinkingStepStream } from './ThinkingStepStream';

// ─── Templates ────────────────────────────────────────────────────────────────

interface Template {
  name: string;
  tagline: string;
  Icon: React.ElementType;
  capabilities: string[];
  instructions: string;
}

const TEMPLATES: Template[] = [
  {
    name: 'Task Creator',
    tagline: 'Génère de nouvelles tâches',
    Icon: CheckSquare,
    capabilities: [
      'Créer des enregistrements',
      'Détecter le travail manquant',
      'Assigner des priorités',
    ],
    instructions:
      'Tu es un agent qui transforme les demandes en tâches structurées. Quand on te décrit un besoin, crée des enregistrements clairs avec titre, priorité et prochaine action.',
  },
  {
    name: 'Project Planner',
    tagline: 'Structure les nouveaux projets',
    Icon: FolderKanban,
    capabilities: ['Découper en jalons', 'Estimer les délais', 'Organiser les listes'],
    instructions:
      "Tu es un agent de planification. À partir d'un objectif, propose une structure de projet : jalons, tâches, dépendances et calendrier réaliste.",
  },
  {
    name: 'Status Manager',
    tagline: 'Met à jour les statuts',
    Icon: RefreshCw,
    capabilities: [
      'Surveiller les enregistrements',
      'Mettre à jour les statuts',
      'Signaler les blocages',
    ],
    instructions:
      'Tu es un agent de suivi. Surveille les enregistrements actifs, détecte ceux qui stagnent, et mets à jour leur statut ou signale les blocages.',
  },
  {
    name: 'Onboarding Guide',
    tagline: 'Aide les nouveaux utilisateurs',
    Icon: Rocket,
    capabilities: ['Répondre aux questions', 'Rechercher dans la base', 'Guider pas à pas'],
    instructions:
      "Tu es un agent d'accueil. Réponds aux questions des nouveaux utilisateurs en t'appuyant sur les données de la base et guide-les pas à pas.",
  },
];

const ASK_CARDS = [
  {
    icon: ClipboardList,
    color: '#7c3aed',
    bg: 'rgba(124,58,237,0.12)',
    label: 'Résumer mes besoins',
    desc: 'Clarifier le rôle de mon agent',
    prompt: 'Aide-moi à clarifier ce que mon agent devrait faire au quotidien.',
  },
  {
    icon: Database,
    color: '#0ea5e9',
    bg: 'rgba(14,165,233,0.12)',
    label: 'Trouver un cas d’usage',
    desc: 'Suggérer un agent à créer',
    prompt: 'Quels agents seraient les plus utiles pour mon équipe ?',
  },
  {
    icon: Search,
    color: '#10b981',
    bg: 'rgba(16,185,129,0.12)',
    label: 'Explorer des exemples',
    desc: 'Modèles d’agents éprouvés',
    prompt: 'Montre-moi des exemples concrets d’agents et leurs résultats.',
  },
  {
    icon: Sparkles,
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.12)',
    label: 'Brainstorming',
    desc: 'Idées et suggestions IA',
    prompt: 'Donne-moi des idées d’agents pour automatiser mon travail répétitif.',
  },
];

const CATEGORY_CHIPS = [
  'Applications',
  'Projets',
  'Personnel',
  'Certifié',
  'Tâches',
  'Direction',
  'Planification',
  'Logiciel',
  'Réunions',
  'Renseignements',
  'Recherche',
  'Mises à jour',
  'Rédaction',
];

const TEMPLATE_GRADIENTS: Record<string, string> = {
  'Task Creator': 'from-violet-500 to-purple-600',
  'Project Planner': 'from-blue-500 to-cyan-500',
  'Status Manager': 'from-emerald-500 to-teal-500',
  'Onboarding Guide': 'from-orange-500 to-amber-500',
};
const templateGradient = (name: string) => TEMPLATE_GRADIENTS[name] ?? 'from-pink-500 to-rose-500';

// ─── Conversation types ───────────────────────────────────────────────────────

interface Msg {
  role: 'user' | 'agent';
  content: React.ReactNode;
  suggestions?: { label: string; onClick: () => void }[];
}

type Phase = 'entry' | 'align' | 'personalize' | 'integrate' | 'done';
export type BuilderStep = 1 | 2 | 3;

interface AgentBuilderProps {
  baseId: string;
}

// ─── Thinking indicator ───────────────────────────────────────────────────────

function ThinkingIndicator({ phase }: { phase: Phase }) {
  const showStream = phase === 'personalize' || phase === 'integrate';
  return (
    <div className="max-w-[90%]">
      <p className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
        <Glasses className="size-3.5 text-primary" /> Réfléchit
      </p>
      {showStream ? (
        <ThinkingStepStream phase={phase} />
      ) : (
        <span className="flex gap-1 pt-1">
          <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:-0.3s]" />
          <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:-0.15s]" />
          <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/40" />
        </span>
      )}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

// eslint-disable-next-line sonarjs/cognitive-complexity
export function AgentBuilder({ baseId }: AgentBuilderProps) {
  const router = useRouter();
  const [mode, setMode] = useState<'ask' | 'agents'>('agents');
  const [phase, setPhase] = useState<Phase>('entry');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const draft = useRef<Partial<Template & { goal: string }>>({});

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

  const push = (m: Msg) => setMessages((prev) => [...prev, m]);

  const agentSay = (content: React.ReactNode, suggestions?: Msg['suggestions'], delay = 700) => {
    setThinking(true);
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        setThinking(false);
        push({ role: 'agent', content, suggestions });
        resolve();
      }, delay);
    });
  };

  // ── Step 1: Alignement ──────────────────────────────────────────────────────
  const startAlign = async (goal: string, tmpl?: Template) => {
    draft.current = { ...(tmpl ?? {}), goal, name: tmpl?.name, instructions: tmpl?.instructions };
    push({ role: 'user', content: goal });
    setPhase('align');

    const caps = tmpl?.capabilities ?? [
      'Suivi automatique du travail',
      'Organisation et priorisation',
      "Résumés d'activité réguliers",
    ];
    draft.current.capabilities = caps;

    await agentSay(
      <div className="space-y-3">
        <p className="font-semibold text-foreground">D'accord 🙂</p>
        <p className="text-foreground">
          Tu veux créer un agent autour de <strong>{goal}</strong>. Voici quelques capacités
          courantes — choisis-en une ou plusieurs :
        </p>
        <ol className="list-decimal space-y-2 pl-5 text-foreground">
          {caps.map((c, i) => (
            <li key={i}>
              <strong>{c}</strong>
            </li>
          ))}
        </ol>
        <p className="font-semibold text-foreground">
          Qu'est-ce que tu aimerais que ton agent fasse en priorité ?
        </p>
      </div>,
      caps.map((c) => ({ label: c, onClick: () => pickCapability(c) }))
    );
  };

  const pickCapability = async (cap: string) => {
    push({ role: 'user', content: cap });
    draft.current.tagline = cap;
    setPhase('personalize');
    await agentSay(
      <div className="space-y-2">
        <p className="font-semibold text-foreground">Parfait 👍</p>
        <p className="text-foreground">
          Ton agent se concentrera sur <strong>{cap.toLowerCase()}</strong>. Donnons-lui une
          identité.
        </p>
        <p className="font-semibold text-foreground">Comment veux-tu l'appeler ?</p>
      </div>,
      [
        draft.current.name ? `${draft.current.name} 🤖` : 'Mon Assistant 🤖',
        `${cap.split(' ')[0]} Bot 🛠️`,
        'Coéquipier IA 🎯',
      ]
        .filter(Boolean)
        .map((n) => ({ label: n as string, onClick: () => pickName(n as string) }))
    );
  };

  const pickName = async (name: string) => {
    push({ role: 'user', content: name });
    draft.current.name = name;
    setPhase('integrate');
    await agentSay(
      <div className="space-y-2">
        <p className="font-semibold text-foreground">Génial ✨</p>
        <p className="text-foreground">
          Je finalise <strong>{name}</strong> et je le connecte à ta base…
        </p>
      </div>,
      undefined,
      900
    );
    await createAgent(name);
  };

  // ── Step 3: create the real agent ─────────────────────────────────────────────
  const createAgent = async (name: string) => {
    const goal = draft.current.goal ?? '';
    const cap = draft.current.tagline ?? '';
    const baseInstr =
      draft.current.instructions ?? `Tu es ${name}, un agent qui aide avec : ${goal}.`;
    const instructions = `${baseInstr}\n\nTâche prioritaire : ${cap}.`;
    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          // Prefer the user's actual goal as the description (what the agent is
          // for); fall back to the priority-chip tagline only if no goal was
          // captured. The chip text already lives inside `instructions` as the
          // "Tâche prioritaire" line, so storing it as the description too was
          // redundant and overwrote the more informative original prompt.
          description: goal || cap,
          baseId,
          instructions,
          isPublic: false,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const agent = await res.json();
      setPhase('done');
      toast.success(`« ${name} » créé`);
      await agentSay(
        <div className="space-y-2">
          <p className="font-semibold text-foreground">« {name} » est créé et activé ✅</p>
          <p className="text-foreground">Redirection vers ta page agent…</p>
        </div>,
        undefined,
        600
      );
      setTimeout(() => router.push(`/agent/${agent.id}`), 900);
    } catch (e) {
      toast.error('La création a échoué');
      await agentSay(
        <p className="text-destructive">La création a échoué : {(e as Error).message}. Réessaie.</p>
      );
      setPhase('entry');
    }
  };

  // ── Demander (brainstorm) mode ────────────────────────────────────────────────
  const brainstorm = async (goal: string) => {
    push({ role: 'user', content: goal });
    await agentSay(
      <div className="space-y-3">
        <p className="text-foreground">
          Super idée ! Voici quelques agents qu'on pourrait imaginer autour de{' '}
          <strong>{goal}</strong> :
        </p>
        <ol className="list-decimal space-y-2 pl-5 text-foreground">
          <li>
            <strong>Suivi automatique</strong> — résume ce qui change et t'envoie l'essentiel.
          </li>
          <li>
            <strong>Création de tâches</strong> — détecte les actions à faire et crée les
            enregistrements.
          </li>
          <li>
            <strong>Veille &amp; alertes</strong> — repère les blocages et te notifie.
          </li>
        </ol>
        <p className="font-semibold text-foreground">Lequel veux-tu construire ?</p>
      </div>,
      [
        {
          label: 'Suivi automatique',
          onClick: () => {
            setMode('agents');
            void startAlign(`${goal} — suivi automatique`);
          },
        },
        {
          label: 'Création de tâches',
          onClick: () => {
            setMode('agents');
            void startAlign(`${goal} — création de tâches`);
          },
        },
        {
          label: 'Veille & alertes',
          onClick: () => {
            setMode('agents');
            void startAlign(`${goal} — veille & alertes`);
          },
        },
      ]
    );
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text || thinking) return;
    setInput('');
    if (mode === 'ask') {
      void brainstorm(text);
      return;
    }
    if (phase === 'entry') {
      void startAlign(text);
      return;
    }
    if (phase === 'personalize') {
      // Step 2 free-text branch: typed name advances the wizard like a chip click.
      void pickName(text);
      return;
    }
    push({ role: 'user', content: text });
  };

  const step: BuilderStep = phase === 'align' ? 1 : phase === 'personalize' ? 2 : 3;
  const showSplit = mode === 'agents' && phase !== 'entry';

  // ── Entry screen ────────────────────────────────────────────────────────────
  // Mirrors the in-base ChatPanel's UnifiedChatContainer hero (icon + title,
  // gradient-ring input with tabs inside, compact card grid, category chips),
  // wrapped in a centered 16:9 frame.
  if (phase === 'entry' && messages.length === 0) {
    return (
      <div className="relative flex h-screen w-full items-center justify-center bg-background px-6">
        <button
          onClick={() => router.back()}
          className="absolute left-5 top-5 z-10 flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Retour
        </button>

        {/* 16:9 frame */}
        <div className="flex aspect-video w-full max-w-5xl flex-col items-center justify-center overflow-hidden px-6">
          {/* Icon + title (matches UnifiedChatContainer hero) */}
          <div className="ai-hero-enter mb-6 flex items-center gap-3">
            <div
              className="ai-icon-float flex size-10 items-center justify-center rounded-xl"
              style={{
                background:
                  'linear-gradient(135deg,rgba(124,58,237,0.2),rgba(79,70,229,0.15),rgba(14,165,233,0.15))',
                border: '1px solid rgba(124,58,237,0.3)',
              }}
            >
              {mode === 'ask' ? (
                <Settings2 className="size-5" style={{ color: '#a78bfa' }} />
              ) : (
                <Workflow className="size-5" style={{ color: '#a78bfa' }} />
              )}
            </div>
            <h1 className="text-3xl font-bold tracking-tight">
              {mode === 'ask' ? 'AI' : 'Agent Builder'}
            </h1>
          </div>

          {/* Gradient-ring input with tabs inside */}
          <div className="ai-hero-enter-delay-1 w-full max-w-xl">
            <div className="ai-gradient-ring overflow-hidden rounded-xl p-[1.5px]">
              <div className="rounded-[10px] bg-background dark:bg-[color-mix(in_oklab,white_5%,hsl(var(--background)))]">
                <div className="flex items-center gap-0.5 px-3 pt-2.5">
                  {(['ask', 'agents'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMode(m)}
                      className="rounded-md px-3 py-1 text-xs font-semibold transition-all duration-200"
                      style={
                        mode === m
                          ? {
                              background: 'linear-gradient(135deg,#7c3aed,#4f46e5)',
                              color: '#fff',
                              boxShadow: '0 2px 8px rgba(124,58,237,0.4)',
                            }
                          : { color: 'hsl(var(--muted-foreground))', background: 'transparent' }
                      }
                    >
                      {m === 'ask' ? 'Demander' : 'Agents'}
                    </button>
                  ))}
                </div>

                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder={
                    mode === 'ask'
                      ? 'Décrivez le travail répétitif à déléguer…'
                      : 'Décrivez les objectifs, les rôles, les tâches ou les processus de votre agent.'
                  }
                  rows={3}
                  className="max-h-[200px] min-h-[72px] resize-none border-0 bg-transparent px-4 pb-1 pt-2 text-sm shadow-none focus-visible:ring-0"
                />

                <div className="flex items-center justify-end px-3 pb-2.5">
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={!input.trim()}
                    className="flex size-7 items-center justify-center rounded-full transition-all duration-200 hover:scale-105 disabled:opacity-25"
                    style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5,#0ea5e9)' }}
                  >
                    <Send className="size-3" style={{ color: '#fff' }} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Compact 4-column card grid */}
          {mode === 'agents' ? (
            <div className="ai-hero-enter-delay-2 mt-5 grid w-full max-w-xl grid-cols-4 gap-2">
              {TEMPLATES.map((t, i) => (
                <button
                  key={t.name}
                  onClick={() => void startAlign(t.tagline, t)}
                  className={cn(
                    `ai-hero-enter-delay-${3 + i} group flex flex-col gap-2 rounded-xl border border-border p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg`
                  )}
                >
                  <div
                    className={cn(
                      'flex size-7 items-center justify-center rounded-lg text-white transition-transform duration-200 group-hover:scale-110 bg-gradient-to-br',
                      templateGradient(t.name)
                    )}
                  >
                    <t.Icon className="size-3.5" />
                  </div>
                  <span className="text-xs font-semibold leading-tight">{t.name}</span>
                  <span className="text-[10px] leading-tight text-muted-foreground">
                    {t.tagline}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="ai-hero-enter-delay-2 mt-5 grid w-full max-w-xl grid-cols-4 gap-2">
              {ASK_CARDS.map((card, i) => {
                const Icon = card.icon;
                return (
                  <button
                    key={card.label}
                    onClick={() => void brainstorm(card.prompt)}
                    className={cn(
                      `ai-hero-enter-delay-${3 + i} group flex flex-col gap-2 rounded-xl border border-border p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg`
                    )}
                  >
                    <div
                      className="flex size-7 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-110"
                      style={{ background: card.bg }}
                    >
                      <Icon className="size-3.5" style={{ color: card.color }} />
                    </div>
                    <span className="text-xs font-semibold leading-tight">{card.label}</span>
                    <span className="text-[10px] leading-tight text-muted-foreground">
                      {card.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Category chips (gradient active state — matches UnifiedChatContainer) */}
          {mode === 'agents' && (
            <div className="ai-hero-enter-delay-3 mt-4 flex w-full max-w-xl flex-wrap justify-center gap-1.5">
              {CATEGORY_CHIPS.slice(0, 8).map((cat, i) => (
                <button
                  key={cat}
                  type="button"
                  className="rounded-full px-3.5 py-1 text-xs font-medium transition-all duration-200 hover:scale-105"
                  style={
                    i === 0
                      ? {
                          background: 'linear-gradient(135deg,#7c3aed,#4f46e5)',
                          color: '#fff',
                          boxShadow: '0 2px 8px rgba(124,58,237,0.35)',
                        }
                      : {
                          border: '1px solid hsl(var(--border))',
                          color: 'hsl(var(--muted-foreground))',
                          background: 'transparent',
                        }
                  }
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Conversation ──────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-background">
      <div
        className={cn(
          'flex flex-col',
          showSplit ? 'flex-1 border-r border-border' : 'mx-auto w-full max-w-3xl'
        )}
      >
        <div className="flex items-center gap-3 border-b border-border px-5 py-3">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> Retour
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          {messages.map((m, i) => (
            <div key={i}>
              {m.role === 'user' ? (
                <div className="flex justify-end">
                  <div className="rounded-2xl bg-muted px-4 py-2 text-sm text-foreground">
                    {m.content}
                  </div>
                </div>
              ) : (
                <div className="max-w-[90%]">
                  <p className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                    <Glasses className="size-3.5 text-primary" /> Créateur d'agent
                  </p>
                  <div className="text-sm leading-relaxed">{m.content}</div>
                  {m.suggestions && (
                    <div className="mt-3 flex flex-col gap-1.5">
                      {m.suggestions.map((s, j) => (
                        <button
                          key={j}
                          onClick={s.onClick}
                          className="flex items-center gap-2 self-start rounded-lg border border-border px-3 py-2 text-left text-sm text-foreground transition-colors hover:border-primary/40 hover:bg-accent"
                        >
                          <CornerDownLeft className="size-3.5 text-muted-foreground/50" /> {s.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          {thinking && <ThinkingIndicator phase={phase} />}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-border p-4">
          <div className="flex items-end gap-2 rounded-xl border border-border p-1.5 transition-colors focus-within:border-ring">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={phase === 'done' ? 'Agent créé !' : 'Répondez pour continuer…'}
              disabled={phase === 'done'}
              rows={1}
              className="min-h-[36px] resize-none border-0 bg-transparent text-sm shadow-none focus-visible:ring-0"
            />
            <Button
              size="icon-sm"
              className="shrink-0 rounded-lg"
              onClick={handleSend}
              disabled={!input.trim() || thinking || phase === 'done'}
            >
              <Send className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      {showSplit && <BuilderStatusPanel step={step} agentName={draft.current.name} />}
    </div>
  );
}
