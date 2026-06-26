import { urlBuilder } from '../utils';

export const AI_AGENT_STREAM = '/api/{baseId}/ai/agent-stream';

export interface IAgentMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const aiAgentStream = (
  baseId: string,
  prompt: string,
  signal?: AbortSignal,
  modelKey?: string,
  messages?: IAgentMessage[]
) => {
  return fetch(urlBuilder(AI_AGENT_STREAM, { baseId }), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, ...(modelKey && { modelKey }), ...(messages && { messages }) }),
    signal,
  });
};
