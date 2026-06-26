'use client';
import { Button, Input, toast } from '@teable/ui-lib/shadcn';
import React, { useState } from 'react';

interface IExtensionInstallFormProps {
  spaceId: string;
  onSuccess: (plugin: { id: string; name: string; requestedScopes: string[] }) => void;
}

export function ExtensionInstallForm({ spaceId, onSuccess }: IExtensionInstallFormProps) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInstall = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/plugin/install-by-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spaceId, mcpUrl: url.trim() }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(body.message ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { id: string; name: string; requestedScopes: string[] };
      toast({
        title: 'Extension installée',
        description: 'Vérifiez et acceptez les permissions ci-dessous.',
      });
      onSuccess(data);
      setUrl('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          placeholder="https://exemple.com/mcp"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void handleInstall()}
          disabled={loading}
          className="flex-1"
        />
        <Button onClick={handleInstall} disabled={loading || !url.trim()}>
          {loading ? 'Installation…' : 'Installer'}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
