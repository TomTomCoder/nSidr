'use client';
import { Badge, Button } from '@teable/ui-lib/shadcn';
import React, { useEffect, useState, useCallback } from 'react';
import { ProviderIcon, PROVIDER_LABELS } from './ProviderIcon';

const ALL_PROVIDERS = ['GMAIL', 'GCALENDAR', 'GDRIVE', 'GCHAT', 'GMEET', 'SLACK'] as const;

interface Integration {
  id: string;
  provider: string;
  isActive: boolean;
  tokenExpiry: string | null;
  scopes: string[];
  createdAt: string;
}

function isExpired(tokenExpiry: string | null): boolean {
  if (!tokenExpiry) return false;
  return new Date(tokenExpiry) <= new Date();
}

function statusBadge(integration: Integration | undefined) {
  if (!integration || !integration.isActive) {
    // No badge for disconnected state — the "Connect" button is sufficient
    return null;
  }
  if (isExpired(integration.tokenExpiry)) {
    return <Badge variant="destructive">Expired</Badge>;
  }
  return (
    <Badge variant="default" className="bg-green-600">
      Connected
    </Badge>
  );
}

export function IntegrationsPanel({ spaceId }: { spaceId: string }) {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchIntegrations = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await fetch(`/api/integrations?spaceId=${spaceId}`);
      if (resp.ok) {
        const data = (await resp.json()) as { integrations: Integration[] };
        setIntegrations(data.integrations ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [spaceId]);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  // Listen for postMessage from OAuth popup
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'oauth_success') {
        fetchIntegrations();
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [fetchIntegrations]);

  const handleConnect = async (provider: string) => {
    const resp = await fetch(
      `/api/integrations/oauth/authorize/${provider.toLowerCase()}?spaceId=${spaceId}`
    );
    if (!resp.ok) return;
    const { url } = (await resp.json()) as { url: string };
    const popup = window.open(url, 'oauth_popup', 'width=600,height=700,left=200,top=100');
    if (!popup) {
      window.location.href = url;
    }
  };

  const handleDisconnect = async (integrationId: string) => {
    await fetch(`/api/integrations/${integrationId}`, { method: 'DELETE' });
    fetchIntegrations();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Connexions</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Connectez vos services externes pour les utiliser dans les automatisations et les outils
          IA.
        </p>
      </div>
      {loading ? (
        <p className="text-muted-foreground text-sm">Loading integrations...</p>
      ) : (
        <div className="grid gap-4">
          {ALL_PROVIDERS.map((provider) => {
            const connected = integrations.find((i) => i.provider === provider && i.isActive);
            const label = PROVIDER_LABELS[provider];
            return (
              <div
                key={provider}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div className="flex items-center gap-3">
                  <ProviderIcon provider={provider} size={32} />
                  <div>
                    <p className="font-medium">{label}</p>
                    <p className="text-muted-foreground text-sm">
                      {connected
                        ? `Connecté depuis le ${new Date(connected.createdAt).toLocaleDateString('fr-FR')}`
                        : 'Non connecté'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {statusBadge(connected)}
                  {connected ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDisconnect(connected.id)}
                    >
                      Déconnecter
                    </Button>
                  ) : (
                    <Button variant="default" size="sm" onClick={() => handleConnect(provider)}>
                      Connecter
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
