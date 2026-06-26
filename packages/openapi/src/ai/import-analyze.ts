import { urlBuilder } from '../utils';

export const AI_IMPORT_ANALYZE = '/api/{baseId}/ai/import-analyze';

export const aiImportAnalyze = (
  baseId: string,
  prompt: string,
  worksheets: Record<string, unknown>,
  signal?: AbortSignal,
  modelKey?: string
) => {
  return fetch(urlBuilder(AI_IMPORT_ANALYZE, { baseId }), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, worksheets, ...(modelKey && { modelKey }) }),
    signal,
  });
};
