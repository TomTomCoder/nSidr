import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@teable/ui-lib/shadcn';
import React, { useState } from 'react';

interface IExternalConnectionFormProps {
  spaceId: string;
  onSubmit: (data: {
    name: string;
    type: 'qdrant' | 'postgres';
    config: Record<string, unknown>;
  }) => Promise<{ success: boolean; error?: string }>;
  onCancel: () => void;
}

type ConnectionType = 'qdrant' | 'postgres';

interface IFormState {
  name: string;
  type: ConnectionType;
  // Qdrant fields
  qdrantHost: string;
  qdrantPort: string;
  qdrantApiKey: string;
  qdrantUrl: string;
  // Postgres fields
  pgHost: string;
  pgPort: string;
  pgDatabase: string;
  pgUser: string;
  pgPassword: string;
  pgSsl: boolean;
}

const defaultState: IFormState = {
  name: '',
  type: 'qdrant',
  qdrantHost: '',
  qdrantPort: '6333',
  qdrantApiKey: '',
  qdrantUrl: '',
  pgHost: '',
  pgPort: '5432',
  pgDatabase: '',
  pgUser: '',
  pgPassword: '',
  pgSsl: false,
};

export const ExternalConnectionForm = (props: IExternalConnectionFormProps) => {
  const { onSubmit, onCancel } = props;
  const [form, setForm] = useState<IFormState>(defaultState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setField = (field: keyof IFormState, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const buildConfig = (): Record<string, unknown> => {
    if (form.type === 'qdrant') {
      return {
        ...(form.qdrantUrl
          ? { url: form.qdrantUrl }
          : { host: form.qdrantHost, port: parseInt(form.qdrantPort, 10) || 6333 }),
        ...(form.qdrantApiKey ? { apiKey: form.qdrantApiKey } : {}),
      };
    }
    // postgres
    return {
      host: form.pgHost,
      port: parseInt(form.pgPort, 10) || 5432,
      database: form.pgDatabase,
      user: form.pgUser,
      password: form.pgPassword,
      ssl: form.pgSsl,
    };
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Connection name is required');
      return;
    }
    if (form.type === 'qdrant' && !form.qdrantHost && !form.qdrantUrl) {
      setError('Qdrant host or URL is required');
      return;
    }
    if (form.type === 'postgres' && !form.pgHost) {
      setError('Postgres host is required');
      return;
    }

    setSubmitting(true);
    setError(null);

    const result = await onSubmit({
      name: form.name.trim(),
      type: form.type,
      config: buildConfig(),
    });

    setSubmitting(false);
    if (!result.success && result.error) {
      setError(result.error);
    }
  };

  const handleChange = (field: keyof IFormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setField(field, e.target.value);
  };

  const handleCheckbox = (field: keyof IFormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setField(field, e.target.checked);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-md border p-4">
      <h4 className="text-sm font-medium">Add External Connection</h4>

      {/* Name */}
      <div className="space-y-1">
        <Label htmlFor="ec-name">Nom</Label>
        <Input
          id="ec-name"
          placeholder="My Qdrant"
          value={form.name}
          onChange={handleChange('name')}
        />
      </div>

      {/* Type selector */}
      <div className="space-y-1">
        <Label htmlFor="ec-type">Type de connexion</Label>
        <Select
          value={form.type}
          onValueChange={(v: string) => setField('type', v as ConnectionType)}
        >
          <SelectTrigger id="ec-type">
            <SelectValue placeholder="Sélectionner un type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="qdrant">Qdrant (VectorDB)</SelectItem>
            <SelectItem value="postgres">Postgres</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Qdrant fields */}
      {form.type === 'qdrant' && (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="ec-qdrant-url">URL (optional — overrides host/port)</Label>
            <Input
              id="ec-qdrant-url"
              placeholder="http://qdrant.example.com:6333"
              value={form.qdrantUrl}
              onChange={handleChange('qdrantUrl')}
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2 space-y-1">
              <Label htmlFor="ec-qdrant-host">Host</Label>
              <Input
                id="ec-qdrant-host"
                placeholder="qdrant.example.com"
                value={form.qdrantHost}
                onChange={handleChange('qdrantHost')}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ec-qdrant-port">Port</Label>
              <Input
                id="ec-qdrant-port"
                type="number"
                placeholder="6333"
                value={form.qdrantPort}
                onChange={handleChange('qdrantPort')}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="ec-qdrant-apikey">API Key</Label>
            <Input
              id="ec-qdrant-apikey"
              type="password"
              placeholder="(optional)"
              value={form.qdrantApiKey}
              onChange={handleChange('qdrantApiKey')}
              autoComplete="new-password"
            />
          </div>
        </div>
      )}

      {/* Postgres fields */}
      {form.type === 'postgres' && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2 space-y-1">
              <Label htmlFor="ec-pg-host">Host</Label>
              <Input
                id="ec-pg-host"
                placeholder="db.example.com"
                value={form.pgHost}
                onChange={handleChange('pgHost')}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ec-pg-port">Port</Label>
              <Input
                id="ec-pg-port"
                type="number"
                placeholder="5432"
                value={form.pgPort}
                onChange={handleChange('pgPort')}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="ec-pg-database">Database</Label>
            <Input
              id="ec-pg-database"
              placeholder="mydb"
              value={form.pgDatabase}
              onChange={handleChange('pgDatabase')}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="ec-pg-user">User</Label>
              <Input
                id="ec-pg-user"
                placeholder="dbuser"
                value={form.pgUser}
                onChange={handleChange('pgUser')}
                autoComplete="username"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ec-pg-password">Password</Label>
              <Input
                id="ec-pg-password"
                type="password"
                placeholder="••••••••"
                value={form.pgPassword}
                onChange={handleChange('pgPassword')}
                autoComplete="new-password"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              id="ec-pg-ssl"
              type="checkbox"
              checked={form.pgSsl}
              onChange={handleCheckbox('pgSsl')}
              className="size-4"
            />
            <Label htmlFor="ec-pg-ssl">Use SSL</Label>
          </div>
        </div>
      )}

      {/* Error display (including SSRF rejection) */}
      {error && <p className="text-destructive text-sm">{error}</p>}

      {/* Actions */}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={submitting}>
          {submitting ? 'Testing & Saving...' : 'Save & Test'}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
      </div>
    </form>
  );
};
