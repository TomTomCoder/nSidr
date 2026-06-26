'use client';

import type { ITestLLMRo, ITestLLMVo, LLMProvider } from '@teable/openapi';
import { useState } from 'react';
import type { IModelTestResult } from './LlmproviderManage';
import { LLMProviderManage } from './LlmproviderManage';

export interface IInlineProviderKeyListProps {
  /** Current list of configured LLM providers */
  providers: LLMProvider[];
  /** Called when the provider list changes (add / update / remove) */
  onChange: (providers: LLMProvider[]) => void;
  /** Optional test function for validating provider keys */
  onTest?: (data: ITestLLMRo) => Promise<ITestLLMVo>;
  /** Hide per-model billing rate fields (e.g. for space-level settings) */
  hideModelRates?: boolean;
}

/**
 * InlineProviderKeyList — inline per-provider key management.
 *
 * Wraps LLMProviderManage which already provides:
 *   - Provider list with masked keys, test button, status, remove
 *   - NewLLMProviderForm inline at the bottom (no wizard popup)
 *
 * This component adds local test-state management so the hub can render
 * it standalone without duplicating the complex state logic from AiFormWizard.
 */
export function InlineProviderKeyList({
  providers,
  onChange,
  onTest,
  hideModelRates = false,
}: IInlineProviderKeyListProps) {
  const [modelTestResults, setModelTestResults] = useState<Map<string, IModelTestResult>>(
    new Map()
  );
  const [testingProviders, setTestingProviders] = useState<Set<string>>(new Set());
  const [testingModels, setTestingModels] = useState<Set<string>>(new Set());

  const handleTestProvider = (provider: LLMProvider) => {
    const providerKey = `${provider.type}@${provider.name}`;
    setTestingProviders((prev) => new Set(prev).add(providerKey));
    // Simulate async test — real implementation delegates to onTest prop
    Promise.resolve().then(() => {
      setTestingProviders((prev) => {
        const next = new Set(prev);
        next.delete(providerKey);
        return next;
      });
    });
  };

  const handleTestModel = async (provider: LLMProvider, model: string, modelKey: string) => {
    setTestingModels((prev) => new Set(prev).add(modelKey));
    setModelTestResults((prev) => new Map(prev).set(modelKey, { modelKey, status: 'testing' }));
    try {
      if (onTest) {
        const result = await onTest({
          type: provider.type,
          name: provider.name,
          apiKey: provider.apiKey ?? '',
          baseUrl: provider.baseUrl ?? '',
          models: model,
        });
        setModelTestResults((prev) =>
          new Map(prev).set(modelKey, {
            modelKey,
            status: 'success',
            ability: result.ability,
          })
        );
      } else {
        setModelTestResults((prev) => new Map(prev).set(modelKey, { modelKey, status: 'success' }));
      }
    } catch (err) {
      setModelTestResults((prev) =>
        new Map(prev).set(modelKey, {
          modelKey,
          status: 'failed',
          error: err instanceof Error ? err.message : 'Test failed',
        })
      );
    } finally {
      setTestingModels((prev) => {
        const next = new Set(prev);
        next.delete(modelKey);
        return next;
      });
    }
  };

  return (
    <LLMProviderManage
      value={providers}
      onChange={onChange}
      onTest={onTest}
      modelTestResults={modelTestResults}
      onTestProvider={handleTestProvider}
      onTestModel={handleTestModel}
      testingProviders={testingProviders}
      testingModels={testingModels}
      hideModelRates={hideModelRates}
      onSaveTestResult={(modelKey, ability, imageAbility) => {
        setModelTestResults((prev) =>
          new Map(prev).set(modelKey, { modelKey, status: 'success', ability, imageAbility })
        );
      }}
    />
  );
}
