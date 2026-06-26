import { SlackChannel, SlackSearchResult } from './types';

const BASE = 'https://slack.com/api';

export class SlackClient {
  constructor(private readonly accessToken: string) {}

  private async api<T>(method: string, params: Record<string, string> = {}): Promise<T> {
    const qs = new URLSearchParams(params).toString();
    const resp = await fetch(`${BASE}/${method}${qs ? `?${qs}` : ''}`, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
    if (!resp.ok) throw new Error(`Slack API ${resp.status}`);
    const data = (await resp.json()) as { ok: boolean; error?: string } & T;
    if (!data.ok) throw new Error(`Slack error: ${data.error}`);
    return data;
  }

  async sendMessage(channel: string, text: string): Promise<void> {
    const resp = await fetch(`${BASE}/chat.postMessage`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ channel, text }),
    });
    if (!resp.ok) throw new Error(`Slack postMessage ${resp.status}`);
    const data = (await resp.json()) as { ok: boolean; error?: string };
    if (!data.ok) throw new Error(`Slack postMessage: ${data.error}`);
  }

  async listChannels(): Promise<SlackChannel[]> {
    const data = await this.api<{ channels: SlackChannel[] }>('conversations.list', {
      limit: '200',
      exclude_archived: 'true',
    });
    return data.channels ?? [];
  }

  async search(query: string): Promise<SlackSearchResult[]> {
    const data = await this.api<{ messages: { matches: SlackSearchResult[] } }>('search.messages', {
      query,
      count: '20',
    });
    return data.messages?.matches ?? [];
  }
}
