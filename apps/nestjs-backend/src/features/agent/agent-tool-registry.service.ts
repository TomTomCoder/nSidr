import { Injectable } from '@nestjs/common';
import { PrismaService } from '@teable/db-main-prisma';
import { McpClientAggregatorService } from './mcp/mcp-client-aggregator.service';
import { WORKFLOW_TOOLS } from './mcp/workflow-tools';
import { SCHEMA_TOOLS } from './schema-agent-tools';

interface ToolDefinition {
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

@Injectable()
export class AgentToolRegistryService {
  // Workflow tools (Phase 22-02 / D-22-01) are appended to BUILT_IN_TOOLS at the
  // end of this array literal so the missing-row default rule (enabled-by-default
  // for non-web_search tools) applies automatically without per-tool overrides.
  private readonly BUILT_IN_TOOLS: ToolDefinition[] = [
    {
      type: 'function',
      function: {
        name: 'search_records',
        description: 'Full-text search across tables in a base',
        parameters: {
          type: 'object',
          properties: {
            tableId: { type: 'string', description: 'The ID of the table to search' },
            query: { type: 'string', description: 'The search query' },
          },
          required: ['tableId', 'query'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'get_records',
        description: 'List or filter records from a table',
        parameters: {
          type: 'object',
          properties: {
            tableId: { type: 'string', description: 'The ID of the table' },
            filter: { type: 'object', description: 'Optional filter conditions' },
            take: { type: 'number', description: 'Number of records to return' },
          },
          required: ['tableId'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'get_record',
        description: 'Read a single record with all fields',
        parameters: {
          type: 'object',
          properties: {
            tableId: { type: 'string', description: 'The ID of the table' },
            recordId: { type: 'string', description: 'The ID of the record' },
          },
          required: ['tableId', 'recordId'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'create_comment',
        description: 'Post a comment on a record',
        parameters: {
          type: 'object',
          properties: {
            tableId: { type: 'string', description: 'The ID of the table' },
            recordId: { type: 'string', description: 'The ID of the record' },
            content: { type: 'string', description: 'The comment content' },
          },
          required: ['tableId', 'recordId', 'content'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'get_record_activity',
        description: 'Get the audit log and activity history for a record',
        parameters: {
          type: 'object',
          properties: {
            tableId: { type: 'string', description: 'The ID of the table' },
            recordId: { type: 'string', description: 'The ID of the record' },
          },
          required: ['tableId', 'recordId'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'create_record',
        description: 'Create a new record in a table with specified field values',
        parameters: {
          type: 'object',
          properties: {
            tableId: { type: 'string', description: 'The ID of the table' },
            fields: {
              type: 'object',
              description: 'Key-value pairs of field IDs to values (e.g. { "fldXXX": "value" })',
            },
          },
          required: ['tableId', 'fields'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'update_record',
        description: 'Update specific fields of an existing record',
        parameters: {
          type: 'object',
          properties: {
            tableId: { type: 'string', description: 'The ID of the table' },
            recordId: { type: 'string', description: 'The ID of the record to update' },
            fields: {
              type: 'object',
              description: 'Key-value pairs of field IDs to new values',
            },
          },
          required: ['tableId', 'recordId', 'fields'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'delete_record',
        description: 'Delete a record from a table',
        parameters: {
          type: 'object',
          properties: {
            tableId: { type: 'string', description: 'The ID of the table' },
            recordId: { type: 'string', description: 'The ID of the record to delete' },
          },
          required: ['tableId', 'recordId'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'search_knowledge_base',
        description:
          'Semantic search over ingested documents and knowledge base content. When traverseLinks=true, expands search scope by following doc-doc links up to maxHops (default 2, max 3) before searching.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'The search query' },
            limit: { type: 'number', description: 'Maximum number of results (default 5)' },
            traverseLinks: {
              type: 'boolean',
              description:
                'When true, expand the scoped doc set by following doc-doc links before searching (KG-03)',
            },
            maxHops: {
              type: 'number',
              description:
                'Max hops to traverse when traverseLinks=true (1..3, default 2). Values outside the range are rejected.',
            },
          },
          required: ['query'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'create_knowledge_doc',
        description:
          "Create a new knowledge doc in the agent's space. The doc is indexed asynchronously by the doc-ingest worker; it may not appear in search for a few seconds. Returns {docId, status, note}.",
        parameters: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Doc title (non-empty, max 500 chars)' },
            rawContent: {
              type: 'string',
              description: 'Markdown / plain text content (non-empty, max 1,000,000 chars)',
            },
            folderId: {
              type: 'string',
              description: 'Optional folder ID to place the doc in',
            },
          },
          required: ['title', 'rawContent'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'update_knowledge_doc',
        description:
          "Replace the rawContent of an existing knowledge doc in the agent's space. Stale chunks are wiped and the doc is re-indexed asynchronously. Returns {docId, status}.",
        parameters: {
          type: 'object',
          properties: {
            docId: { type: 'string', description: 'The ID of the doc to update' },
            rawContent: {
              type: 'string',
              description: 'New markdown / plain text content (non-empty)',
            },
          },
          required: ['docId', 'rawContent'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'link_docs',
        description:
          "Create a directed doc-doc link (fromDocId → toDocId) with an optional label (e.g. 'references', 'cites', 'supersedes'). Both docs must be in the agent's space. Returns {linkId, fromDocId, toDocId, label}.",
        parameters: {
          type: 'object',
          properties: {
            fromDocId: { type: 'string', description: 'Source doc ID' },
            toDocId: { type: 'string', description: 'Target doc ID' },
            label: {
              type: 'string',
              description:
                "Optional label describing the link relationship (e.g. 'references', 'cites')",
            },
          },
          required: ['fromDocId', 'toDocId'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'get_doc_links',
        description:
          'Enumerate outgoing and/or incoming agent/user-authored links for a doc (label IS NOT NULL). Returns {outgoing:[...], incoming:[...]}.',
        parameters: {
          type: 'object',
          properties: {
            docId: { type: 'string', description: 'The doc to enumerate links for' },
            direction: {
              type: 'string',
              description:
                "One of 'outgoing' | 'incoming' | 'both' (default 'both'). Filters which lists are populated.",
            },
          },
          required: ['docId'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'search_memory',
        description:
          'Semantic search over the agent memory graph (entities extracted from the space’s documents). Returns {entities:[{id,name,type,summary,score}], count}.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Natural-language query to match entities' },
            limit: { type: 'number', description: 'Max entities to return (1-50, default 10)' },
          },
          required: ['query'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'get_memory',
        description:
          'Return the memory graph (entities + their relations) extracted from a specific document. Returns {entities:[...], relations:[{fromEntityId,toEntityId,label}]}.',
        parameters: {
          type: 'object',
          properties: {
            docId: { type: 'string', description: 'The doc whose memory graph to fetch' },
          },
          required: ['docId'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'save_memory',
        description: 'Save a piece of information to remember for future conversations',
        parameters: {
          type: 'object',
          properties: {
            content: { type: 'string', description: 'The information to remember' },
          },
          required: ['content'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'set_preference',
        description: 'Store a user preference that persists across all future runs',
        parameters: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Preference key (e.g. "language", "timezone")' },
            value: { type: 'string', description: 'The preference value' },
          },
          required: ['key', 'value'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'web_search',
        description:
          'Search the public web via Google for up-to-date information not present in the workspace. Returns titles, URLs and snippets.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'The search query' },
            limit: { type: 'number', description: 'Number of results (1-10, default 5)' },
          },
          required: ['query'],
        },
      },
    },
    // ARH-03 — HITL system tool: always available, no RBAC scope needed.
    // This tool allows the agent to gate destructive/sensitive operations behind
    // explicit user approval via the terminate-and-resume pattern.
    {
      type: 'function',
      function: {
        name: 'request_human_approval',
        description:
          'Request explicit approval from the human user before proceeding with a sensitive or destructive operation. The agent run will suspend until the user approves or rejects via the /approve endpoint.',
        parameters: {
          type: 'object',
          properties: {
            question: {
              type: 'string',
              description: 'The question or action to present to the human for approval',
            },
            context: {
              type: 'string',
              description: 'Additional context to help the user make an informed decision',
            },
            pendingToolCall: {
              type: 'object',
              description:
                'The tool call that is pending approval (optional, for display purposes)',
            },
          },
          required: ['question'],
        },
      },
    },
    // Multi-agent orchestration — delegate self-contained subtasks to specialist
    // agents in the same base. Bounded by a delegation-depth cap + self/cross-base guards.
    {
      type: 'function',
      function: {
        name: 'list_agents',
        description:
          'List the other agents in this base you can delegate subtasks to. Returns [{id,name,description}].',
        parameters: { type: 'object', properties: {}, required: [] },
      },
    },
    {
      type: 'function',
      function: {
        name: 'delegate_to_agent',
        description:
          'Delegate a self-contained subtask to another agent in this base and get its result back. ' +
          'Call list_agents first to pick a suitable specialist. The sub-agent runs its own ' +
          'plan-and-execute loop and returns its final answer.',
        parameters: {
          type: 'object',
          properties: {
            agentId: {
              type: 'string',
              description: 'The id of the agent to delegate to (from list_agents).',
            },
            task: {
              type: 'string',
              description: 'A clear, self-contained description of the subtask for the sub-agent.',
            },
          },
          required: ['agentId', 'task'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'create_agent',
        description:
          'Create a new specialist agent in this base. Use when the user asks to build, create, or add an agent. ' +
          'The agent will be visible in the Agents panel immediately after creation.',
        parameters: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Short display name for the new agent.' },
            description: {
              type: 'string',
              description: 'One-sentence description of what the agent does.',
            },
            instructions: {
              type: 'string',
              description: 'System prompt / behavioural instructions for the agent.',
            },
            modelKey: {
              type: 'string',
              description: 'Optional model key override (e.g. "gpt-4o"). Omit to use base default.',
            },
            isPublic: {
              type: 'boolean',
              description: 'Whether the agent is publicly accessible. Default false.',
            },
          },
          required: ['name'],
        },
      },
    },
    // Phase 22-02 / D-22-01 — workflow automation surface.
    // Spread WORKFLOW_TOOLS into the array so each gets the standard
    // enabled-by-default treatment in getToolsForAgent().
    ...WORKFLOW_TOOLS,
    // Schema-authoring surface — create tables, fields (incl. links), and views.
    // Spread so each gets the enabled-by-default treatment in getToolsForAgent().
    ...SCHEMA_TOOLS,
  ];

  constructor(
    private readonly prismaService: PrismaService,
    private readonly mcpAggregator: McpClientAggregatorService
  ) {}

  getBuiltInTools(): ToolDefinition[] {
    return this.BUILT_IN_TOOLS;
  }

  async getToolsForAgent(agentId: string): Promise<ToolDefinition[]> {
    // Fetch ALL agentTool rows for this agent (not filtered by isEnabled) so we can
    // distinguish "no saved row" from "explicit isEnabled:false".
    const savedRows = await this.prismaService.agentTool.findMany({
      where: { agentId },
      select: { toolName: true, isEnabled: true },
    });

    // Build a map of toolName → saved isEnabled value.
    const savedMap = new Map(savedRows.map((r) => [r.toolName, r.isEnabled]));

    // Missing-row default rule:
    //   - Built-in Teable tools (all except web_search): default ON when no saved row exists.
    //     A missing row means the tool was never explicitly disabled — treat as enabled.
    //     Only an explicit isEnabled:false row disables the tool.
    //   - web_search: default OFF. Requires an explicit isEnabled:true row to be included.
    const builtIns = this.BUILT_IN_TOOLS.filter((tool) => {
      const name = tool.function.name;
      if (name === 'web_search') {
        // web_search must be explicitly opted-in
        return savedMap.get(name) === true;
      }
      // All other built-in tools: enabled unless explicitly disabled
      return savedMap.get(name) !== false;
    });

    // Append MCP tools from all enabled AgentMcpServer rows for this agent.
    // getAggregatedTools is resilient: unreachable servers are skipped, never thrown.
    const { definitions: mcpDefinitions } = await this.mcpAggregator.getAggregatedTools(agentId);

    return [...builtIns, ...mcpDefinitions];
  }
}
