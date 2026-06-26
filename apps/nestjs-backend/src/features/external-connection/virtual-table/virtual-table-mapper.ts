import type { IExternalColumn, IExternalTable } from '../postgres/pg-introspection.service';

// ---------------------------------------------------------------------------
// Field-shape type
// ---------------------------------------------------------------------------

/**
 * Teable field types used for external column rendering.
 * Only read-only display types are needed here.
 */
export type VirtualFieldType = 'singleLineText' | 'number' | 'checkbox' | 'date' | 'longText';

// ---------------------------------------------------------------------------
// Virtual column shape
// ---------------------------------------------------------------------------

/**
 * A mapped column: original metadata + the resolved Teable field type for display.
 */
export interface IVirtualColumn {
  columnName: string;
  dataType: string;
  isNullable: boolean;
  isPrimaryKey: boolean;
  columnDefault: string | null;
  /** Teable field type for rendering this column read-only */
  fieldType: VirtualFieldType;
}

// ---------------------------------------------------------------------------
// Virtual table descriptor
// ---------------------------------------------------------------------------

/**
 * A read-only virtual table descriptor produced from an introspected external table.
 * This is NOT registered in Teable's table_meta / dbTableName -- it exists only for
 * presentation via the federated read API.
 */
export interface IVirtualTable {
  connectionId: string;
  tableName: string;
  tableSchema: string;
  columns: IVirtualColumn[];
  /** Always true -- this layer is display-only */
  readOnly: true;
}

// ---------------------------------------------------------------------------
// Type mapping
// ---------------------------------------------------------------------------

/**
 * Map a Postgres data_type string to the closest Teable field type for rendering.
 * Unknown types fall back to singleLineText.
 *
 * Mapping contract:
 *   text / character varying / varchar / character  -> singleLineText
 *   integer / int / bigint / smallint / numeric / decimal / real / double precision -> number
 *   boolean / bool                                  -> checkbox
 *   timestamp* / date                               -> date
 *   json / jsonb                                    -> longText
 *   <anything else>                                 -> singleLineText (fallback)
 */
export function mapColumn(col: IExternalColumn): IVirtualColumn {
  return {
    columnName: col.columnName,
    dataType: col.dataType,
    isNullable: col.isNullable,
    isPrimaryKey: col.isPrimaryKey,
    columnDefault: col.columnDefault,
    fieldType: resolveFieldType(col.dataType),
  };
}

function resolveFieldType(dataType: string): VirtualFieldType {
  const t = dataType.toLowerCase().trim();

  // Text / string types
  if (
    t === 'text' ||
    t === 'character varying' ||
    t === 'varchar' ||
    t === 'character' ||
    t === 'char'
  ) {
    return 'singleLineText';
  }

  // Numeric types
  if (
    t === 'integer' ||
    t === 'int' ||
    t === 'int4' ||
    t === 'int8' ||
    t === 'int2' ||
    t === 'bigint' ||
    t === 'smallint' ||
    t === 'numeric' ||
    t === 'decimal' ||
    t === 'real' ||
    t === 'double precision' ||
    t === 'float4' ||
    t === 'float8' ||
    t === 'money' ||
    t === 'serial' ||
    t === 'bigserial' ||
    t === 'smallserial'
  ) {
    return 'number';
  }

  // Boolean
  if (t === 'boolean' || t === 'bool') {
    return 'checkbox';
  }

  // Date / timestamp
  if (
    t === 'date' ||
    t === 'timestamp' ||
    t === 'timestamptz' ||
    t === 'timestamp without time zone' ||
    t === 'timestamp with time zone' ||
    t === 'time' ||
    t === 'timetz' ||
    t === 'time without time zone' ||
    t === 'time with time zone'
  ) {
    return 'date';
  }

  // JSON
  if (t === 'json' || t === 'jsonb') {
    return 'longText';
  }

  // Fallback: render as text (uuid, inet, cidr, geometry, arrays, etc.)
  return 'singleLineText';
}

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

/**
 * Build a virtual table descriptor from an introspected IExternalTable.
 * All columns are mapped to Teable field shapes via mapColumn().
 * The descriptor is read-only by construction -- it is never persisted.
 */
export function buildVirtualTable(connectionId: string, table: IExternalTable): IVirtualTable {
  return {
    connectionId,
    tableName: table.tableName,
    tableSchema: table.tableSchema,
    columns: table.columns.map(mapColumn),
    readOnly: true,
  };
}
