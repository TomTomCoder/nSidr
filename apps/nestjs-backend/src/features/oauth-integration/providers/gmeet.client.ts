import { MeetingSpace } from './types';

const BASE = 'https://meet.googleapis.com/v2';

export class GoogleMeetClient {
  constructor(private readonly accessToken: string) {}

  async createMeetingSpace(): Promise<MeetingSpace> {
    const resp = await fetch(`${BASE}/spaces`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    if (!resp.ok) throw new Error(`Meet API ${resp.status}: ${await resp.text()}`);
    return resp.json() as Promise<MeetingSpace>;
  }
}
