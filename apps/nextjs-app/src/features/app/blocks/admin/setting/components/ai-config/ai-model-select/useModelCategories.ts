import type { IModelDefinationMap } from '@teable/openapi';
import { useMemo } from 'react';
import { isGatewayModelKey, parseModelKey } from '../utils';
import type { IModelCategories, IModelOption } from './types';
import { checkIsImageModel, checkIsLanguageModel } from './utils';

interface IUseModelCategoriesOptions {
  options: IModelOption[];
  onlyImageOutput: boolean;
  onlyAudioOutput?: boolean;
  modelDefinationMap?: IModelDefinationMap;
}

/**
 * Hook to categorize models into gateway, space, and instance options
 */
export function useModelCategories({
  options,
  onlyImageOutput,
  onlyAudioOutput,
  modelDefinationMap,
}: IUseModelCategoriesOptions): IModelCategories {
  return useMemo(() => {
    const filterByFieldType = (option: IModelOption): boolean => {
      if (onlyAudioOutput) {
        // TTS only works with the OpenAI provider; gateway doesn't expose speech models
        const { type } = parseModelKey(option.modelKey);
        return (type ?? '').toLowerCase() === 'openai';
      }
      return onlyImageOutput
        ? checkIsImageModel(option, modelDefinationMap)
        : checkIsLanguageModel(option, modelDefinationMap);
    };

    return {
      // Gateway models — excluded for audio (no TTS support)
      gatewayOptions: onlyAudioOutput
        ? []
        : options.filter((option) => {
            const { isGateway, modelKey } = option;
            if (!isGateway && !isGatewayModelKey(modelKey)) return false;
            return filterByFieldType(option);
          }),
      spaceOptions: options.filter((option) => {
        const { isInstance, modelKey, isGateway } = option;
        if (isInstance || isGateway || isGatewayModelKey(modelKey)) return false;
        return filterByFieldType(option);
      }),
      instanceOptions: options.filter((option) => {
        const { isInstance, modelKey, isGateway } = option;
        if (!isInstance || isGateway || isGatewayModelKey(modelKey)) return false;
        return filterByFieldType(option);
      }),
    };
  }, [options, onlyImageOutput, onlyAudioOutput, modelDefinationMap]);
}
