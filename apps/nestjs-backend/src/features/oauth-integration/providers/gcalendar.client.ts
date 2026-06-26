import { CalendarEvent, CalendarEventInput } from './types';

const BASE = 'https://www.googleapis.com/calendar/v3';

export class GoogleCalendarClient {
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
    if (!resp.ok) throw new Error(`Calendar API ${resp.status}: ${await resp.text()}`);
    return resp.json() as Promise<T>;
  }

  async listEvents(timeMin: Date, timeMax: Date, maxResults = 20): Promise<CalendarEvent[]> {
    const data = await this.request<{ items: CalendarEvent[] }>(
      `/calendars/primary/events?timeMin=${timeMin.toISOString()}&timeMax=${timeMax.toISOString()}&maxResults=${maxResults}&singleEvents=true&orderBy=startTime`
    );
    return data.items ?? [];
  }

  async createEvent(event: CalendarEventInput): Promise<CalendarEvent> {
    return this.request<CalendarEvent>('/calendars/primary/events', {
      method: 'POST',
      body: JSON.stringify(event),
    });
  }
}
