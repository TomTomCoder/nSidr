import { UserIntegrationProvider } from '@teable/openapi';

export type ProviderFamily = 'google' | 'slack' | 'microsoft' | 'github' | 'discord';

export interface IProviderConfig {
  family: ProviderFamily;
  authUrl: string;
  tokenUrl: string;
  /** OAuth scopes requested for the provider's primary "scope" param. */
  scopes: string[];
  /** Separator between scopes in the authorize URL ('space' for most, ',' for Slack/GitHub). */
  scopeSeparator: ' ' | ',';
  /** Google/Microsoft use PKCE; others use the classic client_secret exchange. */
  usePkce: boolean;
  /** Slack v2 uses a separate user_scope param for "sign in" identity scopes. */
  userScopes?: string[];
  /** Env var names tried in order to resolve the client id (first non-empty wins). */
  clientIdEnvs: string[];
  clientSecretEnvs: string[];
  /** How to derive the display metadata after a successful token exchange. */
  metadataKind: 'email' | 'slack' | 'none';
  /** Endpoint used to fetch identity for metadata (email kind). */
  userInfoUrl?: string;
}

const GOOGLE_AUTH = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO = 'https://www.googleapis.com/oauth2/v2/userinfo';
const GOOGLE_IDENTITY_SCOPES = ['openid', 'email', 'profile'];

const googleProvider = (scopes: string[]): IProviderConfig => ({
  family: 'google',
  authUrl: GOOGLE_AUTH,
  tokenUrl: GOOGLE_TOKEN,
  scopes: [...GOOGLE_IDENTITY_SCOPES, ...scopes],
  scopeSeparator: ' ',
  usePkce: true,
  clientIdEnvs: ['GOOGLE_CLIENT_ID'],
  clientSecretEnvs: ['GOOGLE_CLIENT_SECRET'],
  metadataKind: 'email',
  userInfoUrl: GOOGLE_USERINFO,
});

export const PROVIDER_CONFIG: Record<UserIntegrationProvider, IProviderConfig> = {
  [UserIntegrationProvider.Gmail]: {
    ...googleProvider([
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.modify',
    ]),
    clientIdEnvs: ['GMAIL_CLIENT_ID', 'GOOGLE_CLIENT_ID'],
    clientSecretEnvs: ['GMAIL_CLIENT_SECRET', 'GOOGLE_CLIENT_SECRET'],
  },
  [UserIntegrationProvider.GoogleCalendar]: {
    ...googleProvider([
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events',
    ]),
    clientIdEnvs: ['GOOGLE_CALENDAR_CLIENT_ID', 'GOOGLE_CLIENT_ID'],
    clientSecretEnvs: ['GOOGLE_CALENDAR_CLIENT_SECRET', 'GOOGLE_CLIENT_SECRET'],
  },
  [UserIntegrationProvider.GoogleDrive]: {
    ...googleProvider([
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/drive.file',
    ]),
    clientIdEnvs: ['GOOGLE_DRIVE_CLIENT_ID', 'GOOGLE_CLIENT_ID'],
    clientSecretEnvs: ['GOOGLE_DRIVE_CLIENT_SECRET', 'GOOGLE_CLIENT_SECRET'],
  },
  [UserIntegrationProvider.GoogleChat]: {
    ...googleProvider([
      'https://www.googleapis.com/auth/chat.messages',
      'https://www.googleapis.com/auth/chat.spaces.readonly',
    ]),
    clientIdEnvs: ['GOOGLE_CHAT_CLIENT_ID', 'GOOGLE_CLIENT_ID'],
    clientSecretEnvs: ['GOOGLE_CHAT_CLIENT_SECRET', 'GOOGLE_CLIENT_SECRET'],
  },
  [UserIntegrationProvider.GoogleMeet]: {
    ...googleProvider([
      'https://www.googleapis.com/auth/meetings.space.created',
      'https://www.googleapis.com/auth/meetings.space.readonly',
    ]),
    clientIdEnvs: ['GOOGLE_MEET_CLIENT_ID', 'GOOGLE_CLIENT_ID'],
    clientSecretEnvs: ['GOOGLE_MEET_CLIENT_SECRET', 'GOOGLE_CLIENT_SECRET'],
  },
  [UserIntegrationProvider.Slack]: {
    family: 'slack',
    authUrl: 'https://slack.com/oauth/v2/authorize',
    tokenUrl: 'https://slack.com/api/oauth.v2.access',
    scopes: ['chat:write', 'channels:read', 'users:read'],
    userScopes: ['identity.basic', 'identity.email', 'identity.team'],
    scopeSeparator: ',',
    usePkce: false,
    clientIdEnvs: ['SLACK_CLIENT_ID'],
    clientSecretEnvs: ['SLACK_CLIENT_SECRET'],
    metadataKind: 'slack',
  },
  [UserIntegrationProvider.Outlook]: {
    family: 'microsoft',
    authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    scopes: ['offline_access', 'User.Read', 'Mail.Read', 'Mail.Send'],
    scopeSeparator: ' ',
    usePkce: true,
    clientIdEnvs: ['OUTLOOK_CLIENT_ID'],
    clientSecretEnvs: ['OUTLOOK_CLIENT_SECRET'],
    metadataKind: 'email',
    userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
  },
  [UserIntegrationProvider.GitHub]: {
    family: 'github',
    authUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    scopes: ['read:user', 'user:email'],
    scopeSeparator: ' ',
    usePkce: false,
    clientIdEnvs: ['GITHUB_INTEGRATION_CLIENT_ID', 'GITHUB_CLIENT_ID'],
    clientSecretEnvs: ['GITHUB_INTEGRATION_CLIENT_SECRET', 'GITHUB_CLIENT_SECRET'],
    metadataKind: 'email',
    userInfoUrl: 'https://api.github.com/user',
  },
  [UserIntegrationProvider.Discord]: {
    family: 'discord',
    authUrl: 'https://discord.com/api/oauth2/authorize',
    tokenUrl: 'https://discord.com/api/oauth2/token',
    scopes: ['identify', 'email'],
    scopeSeparator: ' ',
    usePkce: false,
    clientIdEnvs: ['DISCORD_CLIENT_ID'],
    clientSecretEnvs: ['DISCORD_CLIENT_SECRET'],
    metadataKind: 'email',
    userInfoUrl: 'https://discord.com/api/users/@me',
  },
};

export const resolveEnv = (names: string[]): string | undefined => {
  for (const n of names) {
    const v = process.env[n];
    if (v) return v;
  }
  return undefined;
};

/** Providers that have client credentials configured — advertised to the UI. */
export const getConfiguredProviders = (): UserIntegrationProvider[] => {
  return (Object.keys(PROVIDER_CONFIG) as UserIntegrationProvider[]).filter((p) => {
    const cfg = PROVIDER_CONFIG[p];
    return Boolean(resolveEnv(cfg.clientIdEnvs) && resolveEnv(cfg.clientSecretEnvs));
  });
};
