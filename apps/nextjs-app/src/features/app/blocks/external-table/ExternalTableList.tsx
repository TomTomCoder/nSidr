'use client';

import { useState } from 'react';
import { ExternalTableGrid } from './ExternalTableGrid';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface IVirtualColumn {
  columnName: string;
  dataType: string;
  isNullable: boolean;
  isPrimaryKey: boolean;
  columnDefault: string | null;
  fieldType: 'singleLineText' | 'number' | 'checkbox' | 'date' | 'longText';
}

export interface IVirtualTable {
  connectionId: string;
  tableName: string;
  tableSchema: string;
  columns: IVirtualColumn[];
  readOnly: true;
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

function useVirtualTables(spaceId: string, connectionId: string) {
  const [tables, setTables] = useState<IVirtualTable[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/space/${spaceId}/external-connection/${connectionId}/virtual-table`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: IVirtualTable[] = await res.json();
      setTables(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return { tables, loading, error, load };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ExternalTableListProps {
  spaceId: string;
  connectionId: string;
}

/**
 * ExternalTableList
 *
 * Lists all virtual tables for a given external Postgres connection.
 * Clicking a table opens it in ExternalTableGrid (read-only).
 * There are NO add / edit / delete affordances.
 */
export function ExternalTableList({ spaceId, connectionId }: ExternalTableListProps) {
  const { tables, loading, error, load } = useVirtualTables(spaceId, connectionId);
  const [selected, setSelected] = useState<IVirtualTable | null>(null);

  if (selected) {
    return (
      <ExternalTableGrid
        spaceId={spaceId}
        connectionId={connectionId}
        table={selected}
        onBack={() => setSelected(null)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">External Tables</h2>
          <p className="text-sm text-muted-foreground">
            Read-only federated view of external Postgres tables
          </p>
        </div>
        <button
          className="rounded bg-primary px-3 py-1 text-sm text-primary-foreground disabled:opacity-50"
          onClick={load}
          disabled={loading}
        >
          {loading ? 'Loading...' : tables === null ? 'Load Tables' : 'Refresh'}
        </button>
      </div>

      {/* Badge */}
      <div className="inline-flex w-fit items-center rounded border border-orange-300 bg-orange-50 px-2 py-0.5 text-xs text-orange-700">
        Read-only / External
      </div>

      {/* Error */}
      {error && (
        <div className="rounded border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Table list */}
      {tables !== null && tables.length === 0 && (
        <p className="text-sm text-muted-foreground">No tables found in this connection.</p>
      )}

      {tables !== null && tables.length > 0 && (
        <ul className="divide-y rounded border">
          {tables.map((t) => (
            <li key={`${t.tableSchema}.${t.tableName}`}>
              <button
                className="flex w-full items-center justify-between p-3 text-left hover:bg-accent"
                onClick={() => setSelected(t)}
              >
                <div>
                  <span className="font-medium">{t.tableName}</span>
                  <span className="ml-1 text-xs text-muted-foreground">{t.tableSchema}</span>
                </div>
                <span className="text-xs text-muted-foreground">{t.columns.length} columns</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
