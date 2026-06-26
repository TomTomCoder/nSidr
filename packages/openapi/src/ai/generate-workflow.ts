import { urlBuilder } from '../utils';

export const AI_GENERATE_WORKFLOW = '/api/{baseId}/ai/generate-workflow';

export const aiGenerateWorkflow = (
  baseId: string,
  prompt: string,
  signal?: AbortSignal,
  modelKey?: string
) => {
  return fetch(urlBuilder(AI_GENERATE_WORKFLOW, { baseId }), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, ...(modelKey && { modelKey }) }),
    signal,
  });
};
