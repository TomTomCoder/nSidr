'use client';

import { BarChart2, ClipboardList, GitBranch, Layout, Megaphone, Users } from 'lucide-react';

interface ITemplateCard {
  icon: React.ElementType;
  iconColor: string;
  title: string;
  description: string;
  views: number;
  prompt: string;
}

const DEFAULT_TEMPLATES: ITemplateCard[] = [
  {
    icon: Users,
    iconColor: 'text-blue-500',
    title: 'CRM simple',
    description: 'Gérez contacts, entreprises, deals et activités liés ensemble.',
    views: 6900,
    prompt: 'Build a simple CRM: companies, contacts, deals and activities tables linked together.',
  },
  {
    icon: ClipboardList,
    iconColor: 'text-violet-500',
    title: 'Suivi de tâches',
    description: 'Suivez tâches, priorités, échéances et une vue Kanban par statut.',
    views: 3200,
    prompt:
      'Create a task tracker with priorities, due dates, assignees and a Kanban view by status.',
  },
  {
    icon: Megaphone,
    iconColor: 'text-orange-500',
    title: 'Page de capture de leads',
    description: 'Capturez des leads via un formulaire et suivez-les dans un pipeline.',
    views: 930,
    prompt:
      'Set up a leads landing page: a public form that feeds into a Teable pipeline with stages.',
  },
  {
    icon: BarChart2,
    iconColor: 'text-green-500',
    title: 'Youtube & Tik Tok',
    description: 'Suivez les performances de contenu sur plusieurs plateformes.',
    views: 1200,
    prompt:
      'Create a content tracker for YouTube and TikTok: videos, views, engagement and trends.',
  },
  {
    icon: Layout,
    iconColor: 'text-pink-500',
    title: "Gestionnaire d'appels SDR",
    description: "Gérez séquences d'appels, scripts et suivis de prospects.",
    views: 2100,
    prompt:
      'Build an SDR cold call manager: prospects, call scripts, sequences and follow-up tracking.',
  },
  {
    icon: GitBranch,
    iconColor: 'text-cyan-500',
    title: 'Feuille de route projet',
    description: 'Planifiez fonctionnalités, jalons et suivez la progression.',
    views: 4500,
    prompt: 'Create a project roadmap with features, milestones, owners and a timeline Gantt view.',
  },
];

function formatViews(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

interface TemplateSuggestionCardsProps {
  onPick: (prompt: string) => void;
  className?: string;
}

export function TemplateSuggestionCards({ onPick, className }: TemplateSuggestionCardsProps) {
  return (
    <div className={className}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Modèles populaires</span>
        <button type="button" className="text-xs text-primary hover:underline">
          Parcourir tout
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {DEFAULT_TEMPLATES.slice(0, 4).map((tpl) => {
          const Icon = tpl.icon;
          return (
            <button
              key={tpl.title}
              type="button"
              onClick={() => onPick(tpl.prompt)}
              className="flex flex-col gap-2 rounded-lg border bg-card p-3 text-left transition-colors hover:border-primary/40 hover:bg-accent/50"
            >
              <div className="flex items-center gap-2">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
                  <Icon className={`size-4 ${tpl.iconColor}`} />
                </div>
                <span className="text-xs font-semibold leading-tight">{tpl.title}</span>
              </div>
              <p className="line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                {tpl.description}
              </p>
              <span className="text-[10px] text-muted-foreground/60">
                {formatViews(tpl.views)} vues
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
