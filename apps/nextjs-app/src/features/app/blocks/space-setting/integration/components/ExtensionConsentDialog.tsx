'use client';
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  toast,
} from '@teable/ui-lib/shadcn';
import React, { useState } from 'react';

interface IExtensionPlugin {
  id: string;
  name: string;
  mcpUrl?: string;
  requestedScopes?: string[];
  consentedAt?: string | null;
}

interface IExtensionConsentDialogProps {
  open: boolean;
  onClose: () => void;
  plugin: IExtensionPlugin | null;
  onConsented: () => void;
  onRevoked: () => void;
}

export function ExtensionConsentDialog({
  open,
  onClose,
  plugin,
  onConsented,
  onRevoked,
}: IExtensionConsentDialogProps) {
  const [loading, setLoading] = useState(false);

  if (!plugin) return null;

  const isConsented = !!plugin.consentedAt;

  const handleConsent = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/plugin/${plugin.id}/consent`, { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast({
        title: 'Extension activée',
        description: `Les outils de ${plugin.name} sont maintenant disponibles pour les agents.`,
      });
      onConsented();
      onClose();
    } catch (e) {
      toast({
        title: 'Erreur',
        description: (e as Error).message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/plugin/${plugin.id}/consent`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast({
        title: 'Extension désactivée',
        description: `Les outils de ${plugin.name} ont été retirés des agents.`,
      });
      onRevoked();
      onClose();
    } catch (e) {
      toast({
        title: 'Erreur',
        description: (e as Error).message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isConsented ? 'Gérer' : 'Activer'} l&apos;extension&nbsp;: {plugin.name}
          </DialogTitle>
          {plugin.mcpUrl && (
            <DialogDescription className="truncate text-xs">{plugin.mcpUrl}</DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div>
            <p className="mb-2 text-sm font-medium">Permissions demandées&nbsp;:</p>
            <div className="flex flex-wrap gap-1.5">
              {(plugin.requestedScopes ?? []).map((scope) => (
                <Badge key={scope} variant="secondary">
                  {scope}
                </Badge>
              ))}
              {(!plugin.requestedScopes || plugin.requestedScopes.length === 0) && (
                <span className="text-sm text-muted-foreground">Aucun outil déclaré</span>
              )}
            </div>
          </div>

          {!isConsented && (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
              En activant cette extension, vous autorisez les agents à utiliser ses outils au nom
              des utilisateurs de cet espace.
            </p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          {isConsented ? (
            <Button variant="destructive" onClick={handleRevoke} disabled={loading}>
              {loading ? 'Révocation…' : "Révoquer l'accès"}
            </Button>
          ) : (
            <Button onClick={handleConsent} disabled={loading}>
              {loading ? 'Activation…' : 'Accepter et activer'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
