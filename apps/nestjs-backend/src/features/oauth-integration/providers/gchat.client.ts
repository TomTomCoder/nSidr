import { ChatSpace } from './types';

const BASE = 'https://chat.googleapis.com/v1';

export class GoogleChatClient {
  constructor(private readonly accessToken: string) {}

  private headers() {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  async sendMessage(spaceName: string, text: string): Promise<void> {
    const resp = await fetch(`${BASE}/${spaceName}/messages`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ text }),
    });
    if (!resp.ok) throw new Error(`Chat API ${resp.status}: ${await resp.text()}`);
  }

  async listSpaces(): Promise<ChatSpace[]> {
    const resp = await fetch(`${BASE}/spaces`, { headers: this.headers() });
    if (!resp.ok) throw new Error(`Chat spaces ${resp.status}`);
    const data = (await resp.json()) as { spaces: ChatSpace[] };
    return data.spaces ?? [];
  }
}
