import { UserIntegrationProvider } from '@teable/openapi';

// Providers that support OAuth connection via the /authorize endpoint
const OAUTH_PROVIDERS = new Set<UserIntegrationProvider>([
  UserIntegrationProvider.Slack,
  UserIntegrationProvider.Gmail,
  UserIntegrationProvider.Outlook,
  UserIntegrationProvider.GitHub,
  UserIntegrationProvider.GoogleCalendar,
  UserIntegrationProvider.GoogleDrive,
  UserIntegrationProvider.GoogleChat,
  UserIntegrationProvider.GoogleMeet,
  UserIntegrationProvider.Discord,
]);

export const openConnectIntegration = (
  provider: UserIntegrationProvider,
  queryParams?: Record<string, string>
) => {
  if (!OAUTH_PROVIDERS.has(provider)) {
    throw new Error(`Unsupported provider: ${provider}`);
  }
  const queryString = new URLSearchParams({
    ...queryParams,
    callBackType: 'page',
  }).toString();
  return window.open(`/api/user-integrations/authorize/${provider}?${queryString}`, '_blank');
};

export const getUserIntegrationName = (provider: UserIntegrationProvider): string => {
  const names: Record<UserIntegrationProvider, string> = {
    [UserIntegrationProvider.Slack]: 'Slack',
    [UserIntegrationProvider.Gmail]: 'Gmail',
    [UserIntegrationProvider.Outlook]: 'Outlook',
    [UserIntegrationProvider.GitHub]: 'GitHub',
    [UserIntegrationProvider.GoogleCalendar]: 'Google Calendar',
    [UserIntegrationProvider.GoogleDrive]: 'Google Drive',
    [UserIntegrationProvider.GoogleChat]: 'Google Chat',
    [UserIntegrationProvider.GoogleMeet]: 'Google Meet',
    [UserIntegrationProvider.Discord]: 'Discord',
  };
  return names[provider] ?? provider;
};
