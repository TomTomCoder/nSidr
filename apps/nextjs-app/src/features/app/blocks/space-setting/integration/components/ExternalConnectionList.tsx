import { AlertCircle, CheckCircle2, Plus, Trash2 } from '@teable/icons';
import { Badge, Button } from '@teable/ui-lib/shadcn';

// Badge variant is constrained by the component's cva definition
type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';
import { useState } from 'react';
import { ExternalConnectionForm } from './ExternalConnectionForm';

interface IExternalConnection {
  id: string;
  name: string;
  type: 'qdrant' | 'postgres';
  enabled: boolean;
}

interface IExternalConnectionListProps {
  spaceId: string;
  connections: IExternalConnection[];
  onRemove: (id: string) => void;
  onAdd: (data: {
    name: string;
    type: 'qdrant' | 'postgres';
    config: Record<string, unknown>;
  }) => Promise<{ success: boolean; error?: string }>;
}

export const ExternalConnectionList = (props: IExternalConnectionListProps) => {
  const { spaceId, connections, onRemove, onAdd } = props;
  const [showForm, setShowForm] = useState(false);
  const [addResult, setAddResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleAdd = async (data: {
    name: string;
    type: 'qdrant' | 'postgres';
    config: Record<string, unknown>;
  }) => {
    const result = await onAdd(data);
    setAddResult({
      success: result.success,
      message:
        result.error ??
        (result.success ? 'Connection added successfully' : 'Failed to add connection'),
    });
    if (result.success) {
      setShowForm(false);
    }
    return result;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">External Connections</h3>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setShowForm(true);
            setAddResult(null);
          }}
        >
          <Plus className="mr-1 size-4" />
          Add Connection
        </Button>
      </div>

      {/* Existing connections */}
      {connections.length === 0 && !showForm && (
        <p className="text-muted-foreground text-sm">No external connections configured.</p>
      )}

      <ul className="space-y-2">
        {connections.map((conn) => (
          <li key={conn.id} className="flex items-center justify-between rounded-md border p-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{conn.name}</span>
              <Badge variant={'secondary' as BadgeVariant}>{conn.type}</Badge>
              {!conn.enabled && (
                <Badge variant={'outline' as BadgeVariant} className="text-muted-foreground">
                  disabled
                </Badge>
              )}
            </div>
            <Button
              size="icon-xs"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => onRemove(conn.id)}
            >
              <Trash2 className="size-4" />
            </Button>
          </li>
        ))}
      </ul>

      {/* Add result feedback */}
      {addResult && (
        <div
          className={`flex items-center gap-2 rounded-md border p-2 text-sm ${
            addResult.success
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-destructive/20 bg-destructive/10 text-destructive'
          }`}
        >
          {addResult.success ? (
            <CheckCircle2 className="size-4 shrink-0" />
          ) : (
            <AlertCircle className="size-4 shrink-0" />
          )}
          <span>{addResult.message}</span>
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <ExternalConnectionForm
          spaceId={spaceId}
          onSubmit={handleAdd}
          onCancel={() => {
            setShowForm(false);
            setAddResult(null);
          }}
        />
      )}
    </div>
  );
};
