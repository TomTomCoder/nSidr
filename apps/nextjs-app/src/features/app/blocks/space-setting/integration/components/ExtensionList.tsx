'use client';
import { Settings, Trash2 } from '@teable/icons';
import { Badge, Button } from '@teable/ui-lib/shadcn';
import { useState } from 'react';
import { ExtensionConsentDialog } from './ExtensionConsentDialog';

interface IExtension {
  id: string;
  name: string;
  mcpUrl?: string | null;
  requestedScopes?: string[];
  consentedAt?: string | null;
}

interface IExtensionListProps {
  extensions: IExtension[];
  onRefresh: () => void;
}

export function ExtensionList({ extensions, onRefresh }: IExtensionListProps) {
  const [selectedExtension, setSelectedExtension] = useState<IExtension | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  const handleManage = (ext: IExtension) => {
    setSelectedExtension(ext);
    setDialogOpen(true);
  };

  const handleRemove = async (ext: IExtension) => {
    setRemoving(ext.id);
    try {
      const res = await fetch(`/api/plugin/${ext.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      onRefresh();
    } catch {
      // Silently fail; user can retry
    } finally {
      setRemoving(null);
    }
  };

  if (extensions.length === 0) {
    return (
      <div className="rounded-lg border border-dashed py-8 text-center">
        <p className="text-sm text-muted-foreground">
          Aucune extension installée. Utilisez &laquo;&nbsp;Installer par URL&nbsp;&raquo; pour en
          ajouter une.
        </p>
      </div>
    );
  }

  return (
    <>
      <ul className="flex flex-col gap-2">
        {extensions.map((ext) => {
          const isActive = Boolean(ext.consentedAt);
          const truncatedUrl = ext.mcpUrl
            ? ext.mcpUrl.length > 48
              ? `${ext.mcpUrl.slice(0, 45)}…`
              : ext.mcpUrl
            : null;

          return (
            <li key={ext.id} className="flex items-center gap-3 rounded-lg border bg-card p-3">
              {/* Icon placeholder */}
              <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-bold text-muted-foreground">
                {ext.name.slice(0, 2).toUpperCase()}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-sm font-medium">{ext.name}</span>
                  <Badge
                    variant={isActive ? 'default' : 'outline'}
                    className={isActive ? 'bg-green-600 text-white' : 'text-muted-foreground'}
                  >
                    {isActive ? 'Actif' : 'En attente'}
                  </Badge>
                </div>
                {truncatedUrl && (
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{truncatedUrl}</p>
                )}
              </div>

              {/* Actions — kept to the right, no overlap */}
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleManage(ext)}
                  className="h-7 gap-1 px-2 text-xs"
                >
                  <Settings className="size-3" />
                  Gérer
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => handleRemove(ext)}
                  disabled={removing === ext.id}
                  aria-label="Supprimer"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      <ExtensionConsentDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        plugin={selectedExtension as Parameters<typeof ExtensionConsentDialog>[0]['plugin']}
        onConsented={onRefresh}
        onRevoked={onRefresh}
      />
    </>
  );
}
