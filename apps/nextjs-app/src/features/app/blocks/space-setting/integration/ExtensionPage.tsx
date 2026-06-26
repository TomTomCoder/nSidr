'use client';
import { Plus } from '@teable/icons';
import { Button } from '@teable/ui-lib/shadcn';
import { useCallback, useEffect, useState } from 'react';
import { SpaceSettingContainer } from '@/features/app/components/SpaceSettingContainer';
import { ExtensionConsentDialog } from './components/ExtensionConsentDialog';
import { ExtensionInstallForm } from './components/ExtensionInstallForm';
import { ExtensionList } from './components/ExtensionList';

interface IExtensionPlugin {
  id: string;
  name: string;
  mcpUrl?: string | null;
  requestedScopes?: string[];
  consentedAt?: string | null;
}

interface IExtensionPageProps {
  spaceId: string;
}

export function ExtensionPage({ spaceId }: IExtensionPageProps) {
  const [extensions, setExtensions] = useState<IExtensionPlugin[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInstallForm, setShowInstallForm] = useState(false);
  const [pendingConsent, setPendingConsent] = useState<IExtensionPlugin | null>(null);
  const [consentDialogOpen, setConsentDialogOpen] = useState(false);

  const fetchExtensions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/plugin/extensions?spaceId=${encodeURIComponent(spaceId)}`);
      if (res.ok) {
        const data = (await res.json()) as IExtensionPlugin[];
        setExtensions(data);
      }
    } finally {
      setLoading(false);
    }
  }, [spaceId]);

  useEffect(() => {
    fetchExtensions();
  }, [fetchExtensions]);

  const handleInstallSuccess = (plugin: {
    id: string;
    name: string;
    requestedScopes: string[];
  }) => {
    setPendingConsent({
      id: plugin.id,
      name: plugin.name,
      requestedScopes: plugin.requestedScopes,
      consentedAt: null,
    });
    setConsentDialogOpen(true);
    setShowInstallForm(false);
    fetchExtensions();
  };

  const handleConsentClose = () => {
    setConsentDialogOpen(false);
    setPendingConsent(null);
  };

  return (
    <SpaceSettingContainer
      title="Extensions MCP"
      description="Serveurs MCP tiers installés dans cet espace. Activez ou révoquez leurs permissions ci-dessous."
    >
      {/* Install toggle button */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {extensions.length === 0 && !loading
            ? 'Aucune extension installée.'
            : `${extensions.length} extension${extensions.length > 1 ? 's' : ''} installée${extensions.length > 1 ? 's' : ''}.`}
        </p>
        <Button size="sm" variant="outline" onClick={() => setShowInstallForm((prev) => !prev)}>
          <Plus className="mr-1 size-4" />
          Installer par URL
        </Button>
      </div>

      {/* Inline install form */}
      {showInstallForm && (
        <div className="rounded-lg border bg-muted/30 p-4">
          <p className="mb-3 text-sm font-medium">Installer une extension MCP par URL</p>
          <ExtensionInstallForm spaceId={spaceId} onSuccess={handleInstallSuccess} />
          <Button
            size="sm"
            variant="ghost"
            className="mt-3 text-xs"
            onClick={() => setShowInstallForm(false)}
          >
            Annuler
          </Button>
        </div>
      )}

      {/* Extension list */}
      {loading ? (
        <p className="text-sm text-muted-foreground">Chargement des extensions…</p>
      ) : (
        <ExtensionList extensions={extensions} onRefresh={fetchExtensions} />
      )}

      {/* Consent dialog for newly installed extension */}
      <ExtensionConsentDialog
        open={consentDialogOpen}
        onClose={handleConsentClose}
        plugin={pendingConsent as Parameters<typeof ExtensionConsentDialog>[0]['plugin']}
        onConsented={() => {
          handleConsentClose();
          fetchExtensions();
        }}
        onRevoked={() => {
          handleConsentClose();
          fetchExtensions();
        }}
      />
    </SpaceSettingContainer>
  );
}
