/* eslint-disable sonarjs/no-duplicate-string */
export type TriggerType =
  | 'record_matches_conditions'
  | 'record_created'
  | 'record_updated'
  | 'record_deleted'
  | 'form_submitted'
  | 'scheduled'
  | 'button_clicked'
  | 'webhook_received'
  | 'email_received';

export type StepType =
  | 'execute_script'
  | 'send_slack'
  | 'send_email'
  | 'ai_generate'
  | 'record_action'
  | 'http_request'
  | 'if_condition'
  | 'create_record'
  | 'get_records'
  | 'update_record';

export interface ITriggerConfig {
  id: string;
  type: TriggerType;
  config: Record<string, unknown>;
}

export interface IStepConfig {
  id: string;
  type: StepType;
  config: Record<string, unknown>;
  thenSteps?: IStepConfig[];
  elseSteps?: IStepConfig[];
}

export interface IWorkflowConfig {
  trigger: ITriggerConfig | null;
  steps: IStepConfig[];
}

export interface ITriggerDef {
  type: TriggerType;
  label: string;
  description: string;
  iconName: string;
  color: string;
  comingSoon?: boolean;
}

export interface IStepDef {
  type: StepType;
  label: string;
  description: string;
  iconName: string;
  color: string;
  recommended?: boolean;
}

export interface IStepGroup {
  label: string;
  steps: IStepDef[];
}

export const TRIGGER_DEFS: ITriggerDef[] = [
  {
    type: 'record_matches_conditions',
    label: "Lorsqu'un enregistrement correspond aux conditions",
    description: 'Déclencher quand un enregistrement remplit vos critères',
    iconName: 'Filter',
    color: 'bg-violet-500',
  },
  {
    type: 'record_created',
    label: "Lorsqu'un enregistrement est créé",
    description: "Déclencher lors de la création d'un enregistrement",
    iconName: 'Plus',
    color: 'bg-blue-500',
  },
  {
    type: 'record_updated',
    label: "Lorsqu'un enregistrement est modifié",
    description: "Déclencher lors de la modification d'un enregistrement",
    iconName: 'RefreshCw',
    color: 'bg-green-500',
  },
  {
    type: 'record_deleted',
    label: "Lorsqu'un enregistrement est supprimé",
    description: "Déclencher lors de la suppression d'un enregistrement",
    iconName: 'Trash2',
    color: 'bg-red-500',
  },
  {
    type: 'form_submitted',
    label: "Lorsqu'un formulaire est soumis",
    description: "Déclencher à la soumission d'un formulaire",
    iconName: 'FileText',
    color: 'bg-orange-500',
    comingSoon: true,
  },
  {
    type: 'scheduled',
    label: "À l'heure programmée",
    description: 'Déclencher selon un planning récurrent',
    iconName: 'Clock',
    color: 'bg-purple-500',
  },
  {
    type: 'button_clicked',
    label: "Lorsqu'un bouton est cliqué",
    description: 'Déclencher via un bouton dans un champ',
    iconName: 'MousePointer',
    color: 'bg-cyan-500',
  },
  {
    type: 'webhook_received',
    label: "Lorsqu'un webhook est reçu",
    description: 'Déclencher via une requête HTTP externe',
    iconName: 'Webhook',
    color: 'bg-pink-500',
  },
  {
    type: 'email_received',
    label: "Lorsqu'un nouvel e-mail est reçu",
    description: "Déclencher à la réception d'un e-mail",
    iconName: 'Mail',
    color: 'bg-red-500',
    comingSoon: true,
  },
];

export const STEP_GROUPS: IStepGroup[] = [
  {
    label: "Construire avec l'IA",
    steps: [
      {
        type: 'execute_script',
        label: 'Exécuter un script',
        description: "Automatisez n'importe quelle logique avec l'IA",
        iconName: 'Code',
        color: 'bg-violet-500',
        recommended: true,
      },
      {
        type: 'send_slack',
        label: 'Slack',
        description: 'Envoyer un message Slack',
        iconName: 'MessageSquare',
        color: 'bg-green-600',
      },
      {
        type: 'send_email',
        label: 'Envoyer un e-mail',
        description: 'Envoyer un e-mail',
        iconName: 'Mail',
        color: 'bg-blue-500',
      },
      {
        type: 'ai_generate',
        label: 'Génération IA',
        description: "Générer du contenu avec l'IA",
        iconName: 'Sparkles',
        color: 'bg-purple-500',
      },
      {
        type: 'record_action',
        label: 'Créer & mettre à jour & obtenir des enregistrements',
        description: 'Gérer des enregistrements Teable',
        iconName: 'Database',
        color: 'bg-teal-500',
      },
      {
        type: 'http_request',
        label: 'Envoyer une requête HTTP',
        description: 'Appeler une API externe',
        iconName: 'Globe',
        color: 'bg-orange-500',
      },
    ],
  },
  {
    label: 'Construire manuellement',
    steps: [
      {
        type: 'create_record',
        label: 'Créer un enregistrement',
        description: 'Créer un nouvel enregistrement',
        iconName: 'PlusCircle',
        color: 'bg-blue-500',
      },
      {
        type: 'get_records',
        label: 'Obtenir des enregistrements',
        description: 'Rechercher des enregistrements',
        iconName: 'Search',
        color: 'bg-slate-500',
      },
      {
        type: 'update_record',
        label: 'Mettre à jour un enregistrement',
        description: 'Modifier un enregistrement existant',
        iconName: 'Edit',
        color: 'bg-amber-500',
      },
    ],
  },
  {
    label: 'Logique',
    steps: [
      {
        type: 'if_condition',
        label: 'Si les conditions sont remplies',
        description: 'Exécuter différentes actions en fonction de conditions spécifiques',
        iconName: 'GitBranch',
        color: 'bg-indigo-500',
      },
    ],
  },
];

export function getTriggerDef(type: TriggerType): ITriggerDef | undefined {
  return TRIGGER_DEFS.find((d) => d.type === type);
}

export function getStepDef(type: StepType): IStepDef | undefined {
  for (const group of STEP_GROUPS) {
    const found = group.steps.find((s) => s.type === type);
    if (found) return found;
  }
  return undefined;
}

export function isTriggerValid(trigger: ITriggerConfig): boolean {
  if (trigger.type === 'scheduled') {
    return Boolean(trigger.config.intervalType && trigger.config.startDate);
  }
  if (
    trigger.type === 'record_created' ||
    trigger.type === 'record_updated' ||
    trigger.type === 'record_matches_conditions'
  ) {
    return Boolean(trigger.config.tableId);
  }
  return true;
}

export function isStepValid(step: IStepConfig): boolean {
  if (step.type === 'if_condition') return true;
  return Object.keys(step.config).length > 0;
}
