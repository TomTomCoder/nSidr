'use client';

import { ChevronDown, Info } from 'lucide-react';
import { useState } from 'react';

export interface IHelpStep {
  title: string;
  body: string;
}

export interface IHelpTip {
  icon: string;
  text: string;
}

interface IAdminHelpPanelProps {
  intro: React.ReactNode;
  steps?: IHelpStep[];
  stepsTitle?: string;
  tips?: IHelpTip[];
  tipsTitle?: string;
  extra?: React.ReactNode;
}

/**
 * Reusable collapsible help panel for admin pages.
 * Blue-tinted, collapsed by default, shows a "Comment utiliser cette page ?" toggle.
 */
export function AdminHelpPanel({
  intro,
  steps,
  stepsTitle = 'Workflow',
  tips,
  tipsTitle = 'Astuces',
  extra,
}: IAdminHelpPanelProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-blue-100/50 dark:hover:bg-blue-900/30"
      >
        <Info className="size-4 shrink-0 text-blue-600 dark:text-blue-400" />
        <span className="flex-1 text-sm font-medium text-blue-800 dark:text-blue-300">
          Comment utiliser cette page ?
        </span>
        <ChevronDown
          className={`size-4 shrink-0 text-blue-600 transition-transform dark:text-blue-400 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="border-t border-blue-200 p-4 dark:border-blue-900">
          <div className="mb-4 text-sm text-blue-900 dark:text-blue-200">{intro}</div>

          {steps && steps.length > 0 && (
            <>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-400">
                {stepsTitle}
              </h4>
              <div className="mb-5 space-y-3">
                {steps.map((step, i) => (
                  <div key={i} className="flex gap-3">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
                        {step.title}
                      </p>
                      <p className="mt-0.5 text-xs text-blue-700 dark:text-blue-400">{step.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {tips && tips.length > 0 && (
            <>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-400">
                {tipsTitle}
              </h4>
              <ul className="space-y-1.5">
                {tips.map((tip, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-xs text-blue-800 dark:text-blue-300"
                  >
                    <span className="shrink-0">{tip.icon}</span>
                    <span>{tip.text}</span>
                  </li>
                ))}
              </ul>
            </>
          )}

          {extra}
        </div>
      )}
    </div>
  );
}
