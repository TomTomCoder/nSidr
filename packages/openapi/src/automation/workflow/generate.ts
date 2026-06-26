import { axios } from '../../axios';
import { urlBuilder } from '../../utils';
import type { IWorkflowVo } from './types';

const GENERATE_WORKFLOW = '/base/{baseId}/workflow/generate';

export const generateWorkflowFromPrompt = async (baseId: string, prompt: string) => {
  return axios.post<IWorkflowVo>(urlBuilder(GENERATE_WORKFLOW, { baseId }), { prompt });
};
