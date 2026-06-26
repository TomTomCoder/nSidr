import { GoogleLogo, Mail, Slack, Github, Calendar, FileJson, MessageSquare, Video, Discord } from '@teable/icons';
import { UserIntegrationProvider } from '@teable/openapi';
import { cn } from '@teable/ui-lib/shadcn';

const PROVIDER_ICONS: Record<UserIntegrationProvider, React.ReactNode> = {
  [UserIntegrationProvider.Slack]: <Slack className="size-8" />,
  [UserIntegrationProvider.Gmail]: <GoogleLogo className="size-8" />,
  [UserIntegrationProvider.Outlook]: <Mail className="size-8" />,
  [UserIntegrationProvider.GitHub]: <Github className="size-8" />,
  [UserIntegrationProvider.GoogleCalendar]: <Calendar className="size-8" />,
  [UserIntegrationProvider.GoogleDrive]: <FileJson className="size-8" />,
  [UserIntegrationProvider.GoogleChat]: <MessageSquare className="size-8" />,
  [UserIntegrationProvider.GoogleMeet]: <Video className="size-8" />,
  [UserIntegrationProvider.Discord]: <Discord className="size-8" />,
};

export const UserIntegrationProviderLogo = (props: {
  provider: UserIntegrationProvider;
  className?: string;
}) => {
  const { provider, className } = props;

  return (
    <div className={cn('flex items-center justify-center', className)}>
      {PROVIDER_ICONS[provider]}
    </div>
  );
};
