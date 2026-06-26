import { FieldKeyType, FieldType, ViewType, Relationship } from '@teable/core';
import type { ICreateTableWithDefault } from '@teable/openapi';
import type { AppBuilderService } from '../app-builder/app-builder.service';
import type { FieldOpenApiService } from '../field/open-api/field-open-api.service';
import type { TableOpenApiService } from '../table/open-api/table-open-api.service';
import type { ViewOpenApiService } from '../view/open-api/view-open-api.service';

/**
 * Schema-authoring agent tools (Teable AI "design tables / link tables" capability).
 *
 * These let the tool-using agent build the data model — create tables with tailored
 * columns, add fields (including link fields between tables), and add views. They are
 * defined alongside the other BUILT_IN_TOOLS so the registry's enabled-by-default rule
 * applies, and executed via {@link executeSchemaTool} (mirrors the gmail/slack pattern
 * of keeping bulky tool logic out of the main execution switch).
 *
 * Scope: every operation is constrained to the agent's own `baseId`. Tables/fields/views
 * are created through the same OpenApi services the REST API uses, so validation,
 * permission propagation, default fields/views, symmetric link creation, and realtime
 * change-broadcast all behave identically to a human-driven mutation.
 */

export interface ISchemaToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, unknown>;
      required: string[];
    };
  };
}

const fieldTypeValues = Object.values(FieldType);
const viewTypeValues = Object.values(ViewType);
const relationshipValues = Object.values(Relationship);

export const SCHEMA_TOOLS: ISchemaToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'list_tables',
      description:
        'List all tables in the current base. Returns [{id, name}]. Use before create_field or create_view to resolve table IDs by name.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_table_schema',
      description:
        'Get the full schema of a table: all fields with their id, name, and type. Use to understand existing structure before adding fields or creating views.',
      parameters: {
        type: 'object',
        properties: {
          tableId: { type: 'string', description: 'ID of the table to inspect.' },
        },
        required: ['tableId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_table',
      description:
        'Create a new table in the current base with tailored columns. Provide a clear name and a fields array; the first field becomes the primary field. If fields is omitted a default "Name" text field is created. A grid view is always created. Use create_field afterwards to add link fields between tables.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'The table name (e.g. "Companies").' },
          description: { type: 'string', description: 'Optional description of the table.' },
          fields: {
            type: 'array',
            description:
              'Columns to create. Each: { name, type, options? }. The first is the primary field and should be a text type.',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Field/column name.' },
                type: {
                  type: 'string',
                  enum: fieldTypeValues,
                  description: 'Field type.',
                },
                options: {
                  type: 'object',
                  description:
                    'Type-specific options (e.g. choices for singleSelect, precision for number).',
                },
              },
              required: ['name', 'type'],
            },
          },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_field',
      description:
        'Add a field (column) to an existing table. To link two tables, use type "link" with options { relationship, foreignTableId } — a symmetric field is created on the other table automatically unless isOneWay is true.',
      parameters: {
        type: 'object',
        properties: {
          tableId: { type: 'string', description: 'The table to add the field to.' },
          name: { type: 'string', description: 'Field/column name.' },
          type: { type: 'string', enum: fieldTypeValues, description: 'Field type.' },
          options: {
            type: 'object',
            description:
              'Type-specific options. For link fields: { relationship: one of ' +
              `${relationshipValues.join(', ')}, foreignTableId: string, isOneWay?: boolean }.`,
          },
        },
        required: ['tableId', 'name', 'type'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_app',
      description:
        "Create a new app interface in the current base, connected to the base's tables. Returns the appId and a builder URL where the app UI (forms for data entry, grids, dashboards) can be generated and refined. Use this after the tables exist so the app has data to bind to.",
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'The app name (e.g. "CRM").' },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_view',
      description:
        'Add a view to an existing table (e.g. a Kanban board, calendar, gallery, form, or grid).',
      parameters: {
        type: 'object',
        properties: {
          tableId: { type: 'string', description: 'The table to add the view to.' },
          name: { type: 'string', description: 'The view name.' },
          type: {
            type: 'string',
            enum: viewTypeValues,
            description: 'View type.',
          },
        },
        required: ['tableId', 'name', 'type'],
      },
    },
  },
];

export interface ISchemaToolServices {
  tableService: TableOpenApiService;
  fieldService: FieldOpenApiService;
  viewService: ViewOpenApiService;
  appBuilderService: AppBuilderService;
}

/**
 * Execute a schema-authoring tool. Returns a structured, LLM-friendly result object
 * (never throws — errors are returned as `{ error }` so the agent can recover/retry).
 */
export async function executeSchemaTool(
  name: string,
  input: Record<string, unknown>,
  baseId: string,
  services: ISchemaToolServices
): Promise<unknown> {
  try {
    switch (name) {
      case 'list_tables': {
        const tables = await services.tableService.getTables(baseId);
        return {
          tables: tables.map((t) => ({ id: t.id, name: t.name })),
          count: tables.length,
        };
      }

      case 'get_table_schema': {
        const { tableId } = input as { tableId: string };
        const fields = await services.fieldService.getFields(tableId, {});
        return {
          tableId,
          fields: fields.map((f) => ({ id: f.id, name: f.name, type: f.type })),
          fieldCount: fields.length,
        };
      }

      case 'create_table': {
        const {
          name: tableName,
          description,
          fields,
        } = input as {
          name: string;
          description?: string;
          fields?: { name: string; type: FieldType; options?: object }[];
        };

        const fieldRos =
          fields && fields.length > 0
            ? fields.map((f) => ({ name: f.name, type: f.type, options: f.options }))
            : [{ name: 'Name', type: FieldType.SingleLineText }];

        const tableRo = {
          name: tableName,
          description: description ?? null,
          fieldKeyType: FieldKeyType.Name,
          fields: fieldRos,
          views: [{ name: 'Grid', type: ViewType.Grid }],
          records: [],
        } as unknown as ICreateTableWithDefault;

        const table = await services.tableService.createTable(baseId, tableRo);
        return {
          success: true,
          tableId: table.id,
          name: table.name,
          fields: table.fields?.map((f) => ({ id: f.id, name: f.name, type: f.type })),
          viewId: table.defaultViewId,
        };
      }

      case 'create_field': {
        const {
          tableId,
          name: fieldName,
          type,
          options,
        } = input as {
          tableId: string;
          name: string;
          type: FieldType;
          options?: object;
        };

        const field = await services.fieldService.createField(tableId, {
          name: fieldName,
          type,
          ...(options ? { options } : {}),
        } as never);

        return {
          success: true,
          fieldId: (field as { id: string }).id,
          name: fieldName,
          type,
        };
      }

      case 'create_app': {
        const { name: appName } = input as { name: string };
        const app = await services.appBuilderService.createApp(baseId, appName);
        return {
          success: true,
          appId: app.id,
          name: app.name,
          builderUrl: `/base/${baseId}/app/${app.id}`,
          note: 'App shell created and connected to the base. Open the builder URL to generate and refine the interface (forms, grids, dashboards).',
        };
      }

      case 'create_view': {
        const {
          tableId,
          name: viewName,
          type,
        } = input as { tableId: string; name: string; type: ViewType };

        const view = await services.viewService.createView(tableId, {
          name: viewName,
          type,
        } as never);

        return {
          success: true,
          viewId: (view as { id: string }).id,
          name: viewName,
          type,
        };
      }

      default:
        return { error: `Unknown schema tool: ${name}` };
    }
  } catch (e) {
    return { error: (e as Error).message };
  }
}
