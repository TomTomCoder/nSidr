import { useMutation } from '@tanstack/react-query';
import { createUserIntegration } from '@teable/openapi';
import type { UserIntegrationProvider } from '@teable/openapi';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@teable/ui-lib/shadcn';
import { toast } from '@teable/ui-lib/shadcn/ui/sonner';
import { useTranslation } from 'next-i18next';
import { useState } from 'react';
import { getUserIntegrationName, openConnectIntegration } from '../../../user-integration/utils';

interface IConnectDialogProps {
  provider: UserIntegrationProvider | null;
  /** Whether the server already has credentials for this provider. */
  isConfigured: boolean;
  onClose: () => void;
}

export const ConnectDialog = ({ provider, isConfigured, onClose }: IConnectDialogProps) => {
  const { t } = useTranslation('common');
  const providerName = provider ? getUserIntegrationName(provider) : '';

  const [name, setName] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');

  // Reset fields whenever a new provider is selected.
  const [lastProvider, setLastProvider] = useState<UserIntegrationProvider | null>(null);
  if (provider && provider !== lastProvider) {
    setLastProvider(provider);
    setName(t('settings.integration.userIntegration.defaultName', { name: providerName }));
    setClientId('');
    setClientSecret('');
  }

  const redirectUri =
    typeof window !== 'undefined' && provider
      ? `${window.location.origin}/api/user-integrations/callback/${provider}`
      : '';

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      createUserIntegration({
        provider: provider as UserIntegrationProvider,
        name: name.trim(),
        clientId: clientId.trim() || undefined,
        clientSecret: clientSecret.trim() || undefined,
      }),
    onSuccess: (res) => {
      const created = res.data as { id: string };
      onClose();
      // Launch the OAuth consent using the just-created (pending) integration.
      openConnectIntegration(provider as UserIntegrationProvider, { integrationId: created.id });
    },
    onError: (e: unknown) => {
      const message =
        (e as { message?: string })?.message ??
        t('settings.integration.userIntegration.callback.error');
      toast.error(message);
    },
  });

  const credsProvided = Boolean(clientId.trim() && clientSecret.trim());
  const canSubmit = Boolean(name.trim()) && (isConfigured || credsProvided) && !isPending;

  const copyRedirect = async () => {
    try {
      await navigator.clipboard.writeText(redirectUri);
      toast.success(t('settings.integration.userIntegration.connectDialog.copied'));
    } catch {
      // clipboard not available — ignore
    }
  };

  return (
    <Dialog open={Boolean(provider)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t('settings.integration.userIntegration.connectDialog.title', { name: providerName })}
          </DialogTitle>
          <DialogDescription>
            {isConfigured
              ? t('settings.integration.userIntegration.connectDialog.credsOptional')
              : t('settings.integration.userIntegration.connectDialog.credsRequired', {
                  name: providerName,
                })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div className="space-y-1">
            <Label htmlFor="ui-name">
              {t('settings.integration.userIntegration.connectDialog.nameLabel')}
            </Label>
            <Input id="ui-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ui-client-id">
              {t('settings.integration.userIntegration.connectDialog.clientId')}
            </Label>
            <Input
              id="ui-client-id"
              name="ui-oauth-client-id"
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ui-client-secret">
              {t('settings.integration.userIntegration.connectDialog.clientSecret')}
            </Label>
            <Input
              id="ui-client-secret"
              name="ui-oauth-client-secret"
              type="password"
              autoComplete="new-password"
              data-1p-ignore
              data-lpignore="true"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>{t('settings.integration.userIntegration.connectDialog.redirectUri')}</Label>
            <div className="flex gap-2">
              <Input readOnly value={redirectUri} className="font-mono text-xs" />
              <Button type="button" variant="outline" size="sm" onClick={copyRedirect}>
                {t('settings.integration.userIntegration.connectDialog.copy')}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {t('settings.integration.userIntegration.connectDialog.redirectHint', {
                name: providerName,
              })}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            {t('actions.cancel')}
          </Button>
          <Button disabled={!canSubmit} onClick={() => mutate()}>
            {t('settings.integration.userIntegration.connectDialog.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
