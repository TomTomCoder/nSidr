import { urlBuilder } from '../utils';

export const AI_BUILD_STREAM = '/api/{baseId}/ai/build-stream';

export const aiBuildStream = (baseId: string, prompt: string, signal?: AbortSignal) => {
  return fetch(urlBuilder(AI_BUILD_STREAM, { baseId }), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
    signal,
  });
};
