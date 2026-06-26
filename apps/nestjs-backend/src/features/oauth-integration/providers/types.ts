export interface GmailMessage {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string;
  body: string;
  date: string;
  labelIds: string[];
}

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  location?: string;
  attendees?: Array<{ email: string; displayName?: string }>;
  htmlLink: string;
}

export interface CalendarEventInput {
  summary: string;
  description?: string;
  start: { dateTime: string; timeZone?: string };
  end: { dateTime: string; timeZone?: string };
  attendees?: Array<{ email: string }>;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  webViewLink?: string;
}

export interface ChatSpace {
  name: string;
  displayName: string;
  type: 'ROOM' | 'DM' | 'GROUP_DM';
}

export interface MeetingSpace {
  name: string;
  meetingUri: string;
  meetingCode: string;
}

export interface SlackChannel {
  id: string;
  name: string;
  is_private: boolean;
  num_members: number;
}

export interface SlackSearchResult {
  type: string;
  channel: { id: string; name: string };
  ts: string;
  text: string;
  username: string;
  permalink: string;
}
