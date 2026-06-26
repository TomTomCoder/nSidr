'use client';

import { useCallback, useEffect, useState } from 'react';
import type { IVirtualColumn, IVirtualTable } from './ExternalTableList';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_PAGE_SIZE = 20;

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

function useVirtualRows(
  spaceId: string,
  connectionId: string,
  schema: string,
  tableName: string,
  page: number,
  pageSize: number
) {
  const [rows, setRows] = useState<Record<string, unknown>[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url =
        `/api/space/${spaceId}/external-connection/${connectionId}` +
        `/virtual-table/${schema}/${tableName}/rows` +
        `?page=${page}&pageSize=${pageSize}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: Record<string, unknown>[] = await res.json();
      setRows(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [spaceId, connectionId, schema, tableName, page, pageSize]);

  useEffect(() => {
    void fetch_();
  }, [fetch_]);

  return { rows, loading, error, reload: fetch_ };
}

// ---------------------------------------------------------------------------
// Cell renderer
// ---------------------------------------------------------------------------

/**
 * Render a single cell value based on the column's field type.
 * All rendering is DISPLAY-ONLY -- no edit callbacks.
 */
function CellValue({
  value,
  fieldType,
}: {
  value: unknown;
  fieldType: IVirtualColumn['fieldType'];
}) {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground italic">null</span>;
  }

  switch (fieldType) {
    case 'checkbox':
      return (
        <span className="inline-flex h-4 w-4 items-center justify-center rounded border">
          {value ? '✓' : ''}
        </span>
      );
    case 'date':
      return <span>{String(value)}</span>;
    case 'number':
      return <span className="font-mono">{String(value)}</span>;
    case 'longText':
      return (
        <span className="max-w-xs truncate font-mono text-xs" title={String(value)}>
          {String(value)}
        </span>
      );
    default:
      return <span>{String(value)}</span>;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ExternalTableGridProps {
  spaceId: string;
  connectionId: string;
  table: IVirtualTable;
  onBack: () => void;
}

/**
 * ExternalTableGrid
 *
 * Renders paginated rows from a virtual (external) table in a read-only grid.
 *
 * SECURITY: There are NO add-row / edit-cell / delete-row affordances.
 * All data is fetched via the read API; no write paths exist.
 * A "Read-only / External" badge is always visible.
 */
export function ExternalTableGrid({
  spaceId,
  connectionId,
  table,
  onBack,
}: ExternalTableGridProps) {
  const [page, setPage] = useState(1);
  const pageSize = DEFAULT_PAGE_SIZE;

  const { rows, loading, error } = useVirtualRows(
    spaceId,
    connectionId,
    table.tableSchema,
    table.tableName,
    page,
    pageSize
  );

  const hasPrev = page > 1;
  const hasNext = rows !== null && rows.length === pageSize;

  return (
    <div className="flex flex-col gap-3 p-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button className="rounded border px-2 py-1 text-sm hover:bg-accent" onClick={onBack}>
          Back
        </button>
        <div>
          <h2 className="text-lg font-semibold">
            {table.tableSchema}.{table.tableName}
          </h2>
        </div>
        {/* Read-only badge -- always visible per plan requirement */}
        <span className="ml-auto inline-flex items-center rounded border border-orange-300 bg-orange-50 px-2 py-0.5 text-xs text-orange-700">
          Read-only / External
        </span>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Loading indicator */}
      {loading && <p className="text-sm text-muted-foreground">Loading...</p>}

      {/* Grid */}
      {rows !== null && !loading && (
        <div className="overflow-x-auto rounded border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                {table.columns.map((col) => (
                  <th
                    key={col.columnName}
                    className="border-b px-3 py-2 text-left font-medium"
                    title={`${col.dataType}${col.isPrimaryKey ? ' (PK)' : ''}${col.isNullable ? ' nullable' : ''}`}
                  >
                    {col.columnName}
                    {col.isPrimaryKey && (
                      <span className="ml-1 text-xs text-muted-foreground">PK</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={table.columns.length}
                    className="px-3 py-4 text-center text-muted-foreground"
                  >
                    No rows found
                  </td>
                </tr>
              )}
              {rows.map((row, rowIdx) => (
                <tr key={rowIdx} className="border-b last:border-0 hover:bg-accent/50">
                  {table.columns.map((col) => (
                    <td key={col.columnName} className="px-3 py-2">
                      <CellValue value={row[col.columnName]} fieldType={col.fieldType} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination -- no edit affordances */}
      <div className="flex items-center gap-2 text-sm">
        <button
          className="rounded border px-2 py-1 disabled:opacity-40"
          onClick={() => setPage((p) => p - 1)}
          disabled={!hasPrev || loading}
        >
          Previous
        </button>
        <span className="text-muted-foreground">Page {page}</span>
        <button
          className="rounded border px-2 py-1 disabled:opacity-40"
          onClick={() => setPage((p) => p + 1)}
          disabled={!hasNext || loading}
        >
          Next
        </button>
      </div>
    </div>
  );
}
