import { UserIntegrationProvider } from '@teable/openapi';
import { Popover, PopoverContent, PopoverTrigger, Button } from '@teable/ui-lib/shadcn';
import { useTranslation } from 'next-i18next';
import { useState } from 'react';
import { usePublicSettingQuery } from '@/features/app/hooks/useSetting';
import { UserIntegrationProviderLogo } from '../../../user-integration/ProviderLogo';
import { getUserIntegrationName } from '../../../user-integration/utils';
import { ConnectDialog } from './ConnectDialog';

export const NewIntegration = (props: { children: React.ReactNode }) => {
  const { children } = props;
  const [open, setOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<UserIntegrationProvider | null>(null);
  const { t } = useTranslation('common');
  const { data: publicSetting } = usePublicSettingQuery();
  const availableIntegrationProviders = publicSetting?.availableIntegrationProviders;

  // Show every supported provider; selecting one opens a dialog where the user
  // can supply their own OAuth credentials (or rely on server-configured ones).
  const providers = Object.values(UserIntegrationProvider);

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger>{children}</PopoverTrigger>
        <PopoverContent className="h-auto w-72 p-2 text-[0px]">
          {providers.map((provider) => {
            const name = getUserIntegrationName(provider);
            const isConfigured = Boolean(availableIntegrationProviders?.includes(provider));
            return (
              <Button
                key={provider as string}
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 px-2 text-sm font-normal"
                onClick={() => {
                  setSelectedProvider(provider);
                  setOpen(false);
                }}
              >
                <UserIntegrationProviderLogo provider={provider} className="size-5" />
                <span>{name}</span>
                {!isConfigured && (
                  <span className="ml-auto rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    {t('settings.integration.userIntegration.notConfiguredBadge')}
                  </span>
                )}
              </Button>
            );
          })}
        </PopoverContent>
      </Popover>

      <ConnectDialog
        provider={selectedProvider}
        isConfigured={Boolean(
          selectedProvider && availableIntegrationProviders?.includes(selectedProvider)
        )}
        onClose={() => setSelectedProvider(null)}
      />
    </>
  );
};
