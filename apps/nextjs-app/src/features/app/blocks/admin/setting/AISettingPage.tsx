import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ISettingVo } from '@teable/openapi';
import { getSetting, updateSetting } from '@teable/openapi';
import { useIsHydrated } from '@teable/sdk/hooks';
import { useTranslation } from 'next-i18next';
import { AdminHelpPanel } from '../shared/AdminHelpPanel';
import { AiSettingsHub } from './components/ai-config/AiSettingsHub';
import { PromptOverridesPanel } from './components/ai-config/PromptOverridesPanel';

const AI_STEPS = [
  {
    title: 'Choisir un fournisseur LLM',
    body: 'Dans "Configure LLM API", sélectionnez AI Gateway (clé Teable, modèles gérés) ou ajoutez vos propres fournisseurs (OpenAI, Anthropic, Azure, Ollama…) avec votre clé API.',
  },
  {
    title: 'Activer les modèles recommandés',
    body: 'Dans "Configure Recommended Models", cochez les modèles à proposer aux utilisateurs dans les champs IA, les automatisations et le chat. Ces modèles apparaissent dans le sélecteur de modèle partout dans l\'app.',
  },
  {
    title: 'Définir le modèle de chat',
    body: 'Dans "Set Chat Model", choisissez le modèle utilisé par défaut dans le chat IA de la barre latérale. Il doit faire partie des modèles recommandés activés.',
  },
  {
    title: 'Personnaliser les prompts système (optionnel)',
    body: 'La section "AI Prompt Overrides" permet de remplacer les prompts système par défaut (création de table, génération d\'app…) par vos propres instructions. Utile pour adapter le comportement de l\'IA au contexte métier.',
  },
];

const AI_TIPS = [
  {
    icon: '🔑',
    text: 'Sans BACKEND_PERFORMANCE_CACHE (Redis), les modèles gateway sont fetchés à chaque ouverture — ajoutez Redis pour bénéficier du cache 5 min.',
  },
  {
    icon: '📦',
    text: 'Section "Custom providers" (collapsible) : ajoutez plusieurs fournisseurs avec des modèles différents. Chaque fournisseur peut avoir sa propre liste de modèles séparés par des virgules.',
  },
  {
    icon: '🔍',
    text: 'Section "Browse all models" : explorez tous les modèles disponibles depuis vos fournisseurs configurés, filtrés par type (langage / image).',
  },
  {
    icon: '⚙️',
    text: 'Les Prompt Overrides sont prioritaires sur les prompts codés en dur. Laissez vide pour utiliser le comportement par défaut.',
  },
];

export interface IAISettingPageProps {
  settingServerData?: ISettingVo;
}

export const AISettingPage = ({ settingServerData }: IAISettingPageProps) => {
  const { t } = useTranslation('common');
  const isHydrated = useIsHydrated();
  const queryClient = useQueryClient();

  const { data: setting = settingServerData } = useQuery({
    queryKey: ['setting'],
    queryFn: () => getSetting().then(({ data }) => data),
  });

  const { mutate: mutateUpdateSetting } = useMutation({
    mutationFn: (aiConfig: NonNullable<ISettingVo['aiConfig']>) => updateSetting({ aiConfig }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['setting'] });
    },
  });

  if (!isHydrated || !setting) return null;

  return (
    <div className="flex h-screen flex-1 flex-col overflow-y-auto overflow-x-hidden p-4 sm:p-8">
      <div className="pb-6">
        <h1 className="text-2xl font-semibold">{t('admin.setting.aiSettings')}</h1>
        <div className="mt-2 text-sm text-muted-foreground">{t('admin.setting.description')}</div>
      </div>

      <AdminHelpPanel
        intro={
          <p>
            Cette page configure les <strong>modèles d&apos;IA</strong> disponibles dans
            l&apos;instance — champs IA, automatisations, chat. Configurez un fournisseur LLM,
            activez les modèles recommandés, puis définissez le modèle de chat par défaut.
          </p>
        }
        steps={AI_STEPS}
        stepsTitle="Workflow de configuration"
        tips={AI_TIPS}
      />

      <AiSettingsHub
        aiConfig={setting.aiConfig}
        setAiConfig={mutateUpdateSetting}
        showPricing={false}
      />

      <div className="mt-8">
        <PromptOverridesPanel />
      </div>
    </div>
  );
};
