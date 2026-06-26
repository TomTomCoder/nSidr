import { GmailMessage } from './types';

const BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';

export class GmailClient {
  constructor(private readonly accessToken: string) {}

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const resp = await fetch(`${BASE}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...(options?.headers ?? {}),
      },
    });
    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`Gmail API error ${resp.status}: ${err}`);
    }
    return resp.json() as Promise<T>;
  }

  async searchMessages(query: string, maxResults = 10): Promise<GmailMessage[]> {
    const data = await this.request<{ messages?: Array<{ id: string }> }>(
      `/messages?q=${encodeURIComponent(query)}&maxResults=${maxResults}`
    );
    if (!data.messages?.length) return [];
    return Promise.all(data.messages.map((m) => this.getMessage(m.id)));
  }

  async getMessage(id: string): Promise<GmailMessage> {
    const raw = await this.request<{
      id: string;
      threadId: string;
      labelIds: string[];
      payload: {
        headers: Array<{ name: string; value: string }>;
        body?: { data?: string };
        parts?: Array<{ mimeType: string; body: { data?: string } }>;
      };
    }>(`/messages/${id}?format=full`);

    const header = (name: string) =>
      raw.payload.headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? '';

    let body = '';
    if (raw.payload.body?.data) {
      body = Buffer.from(raw.payload.body.data, 'base64url').toString('utf8');
    } else {
      const textPart = raw.payload.parts?.find((p) => p.mimeType === 'text/plain');
      if (textPart?.body?.data) {
        body = Buffer.from(textPart.body.data, 'base64url').toString('utf8');
      }
    }
    return {
      id: raw.id,
      threadId: raw.threadId,
      subject: header('Subject'),
      from: header('From'),
      to: header('To'),
      body,
      date: header('Date'),
      labelIds: raw.labelIds,
    };
  }

  async sendMessage(to: string, subject: string, body: string): Promise<void> {
    const raw = [`To: ${to}`, `Subject: ${subject}`, '', body].join('\r\n');
    const encoded = Buffer.from(raw).toString('base64url');
    await this.request<unknown>('/messages/send', {
      method: 'POST',
      body: JSON.stringify({ raw: encoded }),
    });
  }
}
