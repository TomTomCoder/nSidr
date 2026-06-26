import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getUserIntegrationList } from '@teable/openapi';
import { ReactQueryKeys } from '@teable/sdk/config';
import { toast } from '@teable/ui-lib/shadcn/ui/sonner';
import { useTranslation } from 'next-i18next';
import { useEffect } from 'react';
import { IntegrationContainer } from '../common/Container';
import { List } from './List';

export const UserIntegrationContent = () => {
  const { t } = useTranslation('common');
  const queryClient = useQueryClient();
  const { data: integrationData, isLoading } = useQuery({
    queryKey: ReactQueryKeys.getUserIntegrations(),
    queryFn: () => getUserIntegrationList().then((res) => res.data),
  });

  // The OAuth connect popup posts back when it finishes; refresh the list and
  // surface the outcome so the user doesn't have to reload manually.
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      // Same host (tolerate the callback being served on a different localhost
      // port via the dev proxy); the message only triggers a refetch + toast.
      let sameHost = false;
      try {
        sameHost = new URL(event.origin).hostname === window.location.hostname;
      } catch {
        sameHost = false;
      }
      if (!sameHost) return;
      const data = event.data as { type?: string; error?: string } | undefined;
      if (data?.type === 'user_integration_connected') {
        queryClient.invalidateQueries({ queryKey: ReactQueryKeys.getUserIntegrations() });
        toast.success(t('settings.integration.userIntegration.callback.title'));
      } else if (data?.type === 'user_integration_error') {
        toast.error(data.error || t('settings.integration.userIntegration.callback.error'));
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [queryClient, t]);

  const integrationList = integrationData?.integrations;
  const integrationCount = integrationList?.length;
  return (
    <>
      <IntegrationContainer
        count={integrationCount}
        isLoading={isLoading}
        description={
          <p className="pb-2 text-sm text-muted-foreground">
            {t('settings.integration.userIntegration.description')}
          </p>
        }
      >
        <List list={integrationList} />
      </IntegrationContainer>
    </>
  );
};
