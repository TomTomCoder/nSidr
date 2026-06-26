import { urlBuilder } from '../utils';

export const AI_GENERATE_VIEW = '/api/{baseId}/ai/generate-view';

export interface IGeneratedViewConfig {
  type: 'grid' | 'gallery' | 'kanban' | 'form' | 'calendar' | 'gantt';
  name: string;
  sort?: { sortObjs: Array<{ fieldId: string; order: 'asc' | 'desc' }> };
  filter?: {
    conjunction: 'and' | 'or';
    filterSet: Array<{ fieldId: string; operator: string; value: unknown }>;
  };
  columnMeta?: Record<string, { hidden: boolean }>;
}

export const aiGenerateView = (
  baseId: string,
  tableId: string,
  prompt: string,
  modelKey?: string
): Promise<{ data: IGeneratedViewConfig }> => {
  return fetch(urlBuilder(AI_GENERATE_VIEW, { baseId }), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tableId, prompt, ...(modelKey && { modelKey }) }),
  }).then((r) => r.json()) as Promise<{ data: IGeneratedViewConfig }>;
};
