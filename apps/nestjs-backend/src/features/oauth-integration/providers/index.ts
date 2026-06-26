export * from './types';
export { GmailClient } from './gmail.client';
export { GoogleCalendarClient } from './gcalendar.client';
export { GoogleDriveClient } from './gdrive.client';
export { GoogleChatClient } from './gchat.client';
export { GoogleMeetClient } from './gmeet.client';
export { SlackClient } from './slack.client';

import { OAuthIntegrationProvider } from '@teable/db-main-prisma';
import { GmailClient } from './gmail.client';
import { GoogleCalendarClient } from './gcalendar.client';
import { GoogleDriveClient } from './gdrive.client';
import { GoogleChatClient } from './gchat.client';
import { GoogleMeetClient } from './gmeet.client';
import { SlackClient } from './slack.client';

export type AnyProviderClient =
  | GmailClient
  | GoogleCalendarClient
  | GoogleDriveClient
  | GoogleChatClient
  | GoogleMeetClient
  | SlackClient;

/** Factory: create the appropriate client for a given provider using a plaintext access token */
export function createProviderClient(
  provider: OAuthIntegrationProvider,
  accessToken: string
): AnyProviderClient {
  switch (provider) {
    case 'GMAIL':
      return new GmailClient(accessToken);
    case 'GCALENDAR':
      return new GoogleCalendarClient(accessToken);
    case 'GDRIVE':
      return new GoogleDriveClient(accessToken);
    case 'GCHAT':
      return new GoogleChatClient(accessToken);
    case 'GMEET':
      return new GoogleMeetClient(accessToken);
    case 'SLACK':
      return new SlackClient(accessToken);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}
