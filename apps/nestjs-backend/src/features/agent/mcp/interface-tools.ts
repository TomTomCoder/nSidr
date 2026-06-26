/**
 * interface-tools.ts
 *
 * Defines the 4 MCP tool schemas for app/dashboard interface read + write operations.
 *
 * Tool set (D-04):
 *   READ  — get_app(baseId, appId)          → App state + content
 *   READ  — get_dashboard(baseId, id)       → Dashboard state + plugin layout
 *   WRITE — run_app_action(baseId, appId, action, content?)  → Delegates to AppBuilderService
 *   WRITE — update_dashboard(baseId, id, name?, layout?)     → Delegates to DashboardService
 *
 * Parameter names match AppBuilderService / DashboardService method signatures verbatim
 * (findOne(baseId, appId), getAppContent(baseId, appId), getDashboardById(baseId, id), …).
 *
 * Shape: { type:'function', function:{ name, description, parameters } }
 * matches ToolDefinition from agent-tool-registry.service.ts.
 */

export interface ToolDefinition {
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

export const INTERFACE_TOOLS: ToolDefinition[] = [
  // ─── READ: get_app ────────────────────────────────────────────────────────
  {
    type: 'function',
    function: {
      name: 'get_app',
      description:
        'Read an app-builder app by ID — returns metadata (id, name, baseId) plus its content (widgets, layout, files). Requires app|read permission on the base.',
      parameters: {
        type: 'object',
        properties: {
          baseId: {
            type: 'string',
            description: 'The ID of the base that owns the app.',
          },
          appId: {
            type: 'string',
            description: 'The ID of the app to retrieve.',
          },
        },
        required: ['baseId', 'appId'],
      },
    },
  },

  // ─── READ: get_dashboard ──────────────────────────────────────────────────
  {
    type: 'function',
    function: {
      name: 'get_dashboard',
      description:
        'Read a dashboard by ID — returns name, layout, and the installed plugin map. Requires base|read permission on the base.',
      parameters: {
        type: 'object',
        properties: {
          baseId: {
            type: 'string',
            description: 'The ID of the base that owns the dashboard.',
          },
          id: {
            type: 'string',
            description: 'The ID of the dashboard to retrieve.',
          },
        },
        required: ['baseId', 'id'],
      },
    },
  },

  // ─── WRITE: run_app_action ────────────────────────────────────────────────
  {
    type: 'function',
    function: {
      name: 'run_app_action',
      description:
        'Perform a write action on an app-builder app. Supported actions: "rename" (requires name), "update_content" (requires content), "duplicate". Delegates to AppBuilderService — no raw DB writes. Requires app|update permission on the base.',
      parameters: {
        type: 'object',
        properties: {
          baseId: {
            type: 'string',
            description: 'The ID of the base that owns the app.',
          },
          appId: {
            type: 'string',
            description: 'The ID of the app to act on.',
          },
          action: {
            type: 'string',
            enum: ['rename', 'update_content', 'duplicate'],
            description: 'The action to perform on the app.',
          },
          name: {
            type: 'string',
            description: 'New name (required for "rename" action).',
          },
          content: {
            type: 'object',
            description: 'New content payload (required for "update_content" action).',
          },
        },
        required: ['baseId', 'appId', 'action'],
      },
    },
  },

  // ─── WRITE: update_dashboard ──────────────────────────────────────────────
  {
    type: 'function',
    function: {
      name: 'update_dashboard',
      description:
        'Update a dashboard — rename it and/or update its plugin layout. At least one of name or layout must be provided. Delegates to DashboardService. Requires base|update permission on the base.',
      parameters: {
        type: 'object',
        properties: {
          baseId: {
            type: 'string',
            description: 'The ID of the base that owns the dashboard.',
          },
          id: {
            type: 'string',
            description: 'The ID of the dashboard to update.',
          },
          name: {
            type: 'string',
            description: 'New display name for the dashboard (optional).',
          },
          layout: {
            type: 'array',
            description: 'New layout array for the dashboard plugins (optional).',
            items: { type: 'object' },
          },
        },
        required: ['baseId', 'id'],
      },
    },
  },
];
