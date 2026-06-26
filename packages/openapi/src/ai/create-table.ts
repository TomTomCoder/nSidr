import { urlBuilder } from '../utils';

export const AI_CREATE_TABLE_STREAM = '/api/{baseId}/ai/create-table-stream';

export const aiCreateTableStream = (
  baseId: string,
  prompt: string,
  signal?: AbortSignal,
  modelKey?: string
) => {
  return fetch(urlBuilder(AI_CREATE_TABLE_STREAM, { baseId }), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, ...(modelKey && { modelKey }) }),
    signal,
  });
};
