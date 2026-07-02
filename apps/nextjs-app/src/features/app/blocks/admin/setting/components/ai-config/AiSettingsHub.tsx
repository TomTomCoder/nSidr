'use client';

import type { ITestLLMRo, ITestLLMVo, LLMProvider, ISettingVo } from '@teable/openapi';
import { ChevronDown } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useTranslation } from 'next-i18next';
import { useCallback, useState } from 'react';
import { useGatewayModels } from './ai-model-select';
import { InlineProviderKeyList } from './InlineProviderKeyList';
import { UnifiedModelPicker } from './UnifiedModelPicker';

const AIConfigFormWizard = dynamic(() =>
  import('./AiFormWizard').then((m) => m.AIConfigFormWizard)
);

export interface IAiSettingsHubProps {
  aiConfig: ISettingVo['aiConfig'];
  setAiConfig: (data: NonNullable<ISettingVo['aiConfig']>) => void;
  showPricing?: boolean;
}

/**
 * AiSettingsHub — single-page vertical layout for AI configuration.
 *
 * Sections (in order):
 *   1. Configuration assistant (wizard): provider choice → recommended models → default model
 *   2. Custom providers quick-edit (collapsible)
 *   3. Model browser (collapsible)
 *
 * Replaces the previous 3-tab layout which caused duplication between
 * "Providers & Keys" tab and "Defaults → Configure LLM API" wizard step.
 */
export function AiSettingsHub({ aiConfig, setAiConfig, showPricing }: IAiSettingsHubProps) {
  const { t } = useTranslation('common');
  const [selectedModelId, setSelectedModelId] = useState<string | undefined>();
  const [showProviders, setShowProviders] = useState(false);
  const [showModelBrowser, setShowModelBrowser] = useState(false);

  // Fetch gateway models for the model browser section
  const { pickerModels, isLoadingGateway } = useGatewayModels({});

  // Handle provider changes from InlineProviderKeyList
  const handleProvidersChange = useCallback(
    (providers: LLMProvider[]) => {
      setAiConfig({ ...(aiConfig ?? {}), llmProviders: providers });
    },
    [aiConfig, setAiConfig]
  );

  // Test LLM connection (lazy import to avoid SSR issues)
  const handleTest = useCallback(async (data: ITestLLMRo): Promise<ITestLLMVo> => {
    const { testLLM } = await import('@teable/openapi');
    return testLLM(data);
  }, []);

  const providerCount = aiConfig?.llmProviders?.length ?? 0;

  return (
    <div className="space-y-6">
      {/* ── Section 1: Setup wizard ─────────────────────────────────── */}
      <AIConfigFormWizard aiConfig={aiConfig} setAiConfig={setAiConfig} showPricing={showPricing} />

      {/* ── Section 2: Custom providers (quick-edit, collapsible) ────── */}
      <div className="rounded-lg border">
        <button
          type="button"
          onClick={() => setShowProviders((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-muted/50"
        >
          <div>
            <span className="text-sm font-medium">
              {t('admin.setting.ai.hub.providersTab', 'Custom providers')}
            </span>
            {providerCount > 0 && (
              <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                {providerCount}
              </span>
            )}
          </div>
          <ChevronDown
            className={`size-4 text-muted-foreground transition-transform ${showProviders ? 'rotate-180' : ''}`}
          />
        </button>
        {showProviders && (
          <div className="border-t p-4">
            <p className="mb-3 text-sm text-muted-foreground">
              {t(
                'admin.setting.ai.hub.providersDesc',
                'Add your own LLM providers (OpenAI, Anthropic, Azure, etc.) with API keys and custom models.'
              )}
            </p>
            <InlineProviderKeyList
              providers={aiConfig?.llmProviders ?? []}
              onChange={handleProvidersChange}
              onTest={handleTest}
              hideModelRates={!showPricing}
            />
          </div>
        )}
      </div>

      {/* ── Section 3: Model browser (collapsible) ───────────────────── */}
      <div className="rounded-lg border">
        <button
          type="button"
          onClick={() => setShowModelBrowser((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-muted/50"
        >
          <div>
            <span className="text-sm font-medium">
              {t('admin.setting.ai.hub.modelsTab', 'Browse all models')}
            </span>
            {pickerModels.length > 0 && (
              <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                {pickerModels.length}
              </span>
            )}
          </div>
          <ChevronDown
            className={`size-4 text-muted-foreground transition-transform ${showModelBrowser ? 'rotate-180' : ''}`}
          />
        </button>
        {showModelBrowser && (
          <div className="border-t p-4">
            <p className="mb-3 text-sm text-muted-foreground">
              {t(
                'admin.setting.ai.hub.modelsDesc',
                'Browse and explore all available models from your configured providers.'
              )}
            </p>
            <UnifiedModelPicker
              models={pickerModels}
              value={selectedModelId}
              onSelect={setSelectedModelId}
              isLoading={isLoadingGateway}
            />
          </div>
        )}
      </div>
    </div>
  );
}
