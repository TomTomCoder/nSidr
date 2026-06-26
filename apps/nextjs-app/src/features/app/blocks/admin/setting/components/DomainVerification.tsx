import { Badge } from '@teable/ui-lib/shadcn/ui/badge';
import { Button } from '@teable/ui-lib/shadcn/ui/button';
import { Input } from '@teable/ui-lib/shadcn/ui/input';
import { Globe, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

export function DomainVerification() {
  const [domains, setDomains] = useState<string[]>([]);
  const [newDomain, setNewDomain] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDomains = async () => {
    try {
      const res = await fetch('/api/admin/setting/domain-verification');
      const data = await res.json();
      setDomains(data.domains ?? []);
    } catch {
      setDomains([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDomains();
  }, []);

  const addDomain = async () => {
    const domain = newDomain.trim().toLowerCase();
    if (!domain) return;
    setAdding(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/setting/domain-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain }),
      });
      if (!res.ok) throw new Error('Failed to add domain');
      const data = await res.json();
      setDomains(data.domains);
      setNewDomain('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add domain');
    } finally {
      setAdding(false);
    }
  };

  const removeDomain = async (domain: string) => {
    try {
      const res = await fetch(`/api/admin/setting/domain-verification/${domain}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      setDomains(data.domains);
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-lg border p-4">
        <ShieldCheck className="mt-0.5 size-5 text-primary shrink-0" />
        <div>
          <p className="font-medium text-sm">Domain Verification</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Allow users from specific email domains to access this instance. Verified domains enable
            automatic team enrollment.
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Globe className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            placeholder="e.g. company.com"
            className="pl-9"
            onKeyDown={(e) => e.key === 'Enter' && addDomain()}
          />
        </div>
        <Button
          onClick={addDomain}
          disabled={!newDomain.trim() || adding}
          className="gap-1.5"
          size="sm"
        >
          <Plus className="size-3.5" />
          {adding ? 'Adding...' : 'Add domain'}
        </Button>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : domains.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <Globe className="mx-auto mb-2 size-8 text-muted-foreground opacity-40" />
          <p className="text-sm text-muted-foreground">No verified domains yet</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {domains.map((domain) => (
            <li
              key={domain}
              className="flex items-center justify-between rounded-lg border px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="gap-1 text-xs">
                  <ShieldCheck className="size-3 text-green-500" />
                  Verified
                </Badge>
                <span className="text-sm font-medium">{domain}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeDomain(domain)}
                className="size-7 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
