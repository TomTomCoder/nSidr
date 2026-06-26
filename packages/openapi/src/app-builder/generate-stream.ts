export const appBuilderGenerateStream = (
  baseId: string,
  appId: string,
  prompt: string,
  signal?: AbortSignal,
  modelKey?: string
) => {
  const params = new URLSearchParams({ baseId, appId });
  return fetch(`/api/generate-stream?${params}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, ...(modelKey && { modelKey }) }),
    signal,
  });
};
