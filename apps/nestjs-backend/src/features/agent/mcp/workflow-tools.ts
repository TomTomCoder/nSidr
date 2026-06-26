/**
 * workflow-tools.ts — Phase 22-02.
 *
 * Defines the 3 new MCP tool descriptors (D-22-01) exposed to agents for the
 * Automations / RPA surface:
 *   - list_workflows
 *   - get_workflow
 *   - run_workflow
 *
 * Critical shape invariant (Phase 17.1 bug-3): each entry MUST use the
 * AI-SDK wrapper shape `{ type function, function:{name, description, parameters} }`.
 * NEVER hoist the schema to the top level — that shape silently loses the tool
 * from the Vercel AI SDK v6 tool registry.
 *
 * T-21-16 mitigation: `list_workflows` does NOT accept a `baseId` parameter — the
 * dispatcher resolves baseId from `agent.baseId`. Schema-level enforcement keeps
 * the wire surface narrow.
 */

type FnLiteral = 'function';
interface WorkflowToolDef {
  type: FnLiteral;
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, unknown>;
      required: string[];
      additionalProperties?: boolean;
    };
  };
}

export const WORKFLOW_TOOLS: WorkflowToolDef[] = [
  {
    type: 'function',
    function: {
      name: 'list_workflows',
      description:
        "List all workflows defined in the agent's base. Returns an array of {id, name, isActive, createdAt}. Scope is locked to the agent's base — baseId cannot be overridden by the caller (T-21-16).",
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_workflow',
      description:
        "Read a single workflow record from the agent's base, including its trigger and steps config. Returns null if the workflowId belongs to another base (cross-base attempts are silently scoped out by the dispatcher).",
      parameters: {
        type: 'object',
        properties: {
          workflowId: { type: 'string', description: 'The ID of the workflow to fetch' },
        },
        required: ['workflowId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'run_workflow',
      description:
        'Execute a workflow in dry-run / test mode. Returns {status, trigger, steps} with per-step status and output. The optional `input` argument is accepted but not yet wired into trigger data (executor uses mock data); will be honoured in a future iteration.',
      parameters: {
        type: 'object',
        properties: {
          workflowId: { type: 'string', description: 'The ID of the workflow to run' },
          input: {
            type: 'object',
            description: 'Optional per-run input forwarded to the trigger (currently unused).',
            additionalProperties: true,
          },
        },
        required: ['workflowId'],
      },
    },
  },
];
