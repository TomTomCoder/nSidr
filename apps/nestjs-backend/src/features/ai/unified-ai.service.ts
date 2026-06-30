import { fakerFR as faker } from '@faker-js/faker';
import { Inject, Injectable } from '@nestjs/common';
import { FieldKeyType, HttpErrorCode } from '@teable/core';
import { PrismaService } from '@teable/db-main-prisma';
import type { LLMProvider } from '@teable/openapi';
import {
  generateText,
  generateObject,
  jsonSchema as buildJsonSchema,
  zodSchema as buildZodSchema,
  tool,
  stepCountIs,
} from 'ai';
import { z } from 'zod';
import { CustomHttpException } from '../../custom.exception';
import { AI_SERVICE } from '../../shared/tokens/ai.token';
import { RecordService } from '../record/record.service';
import { WorkflowTriggerSchema, WorkflowStepSchema } from '../workflow/workflow-ai.service';
import { ActionProposalService } from './action-proposal.service';
import { WorkspaceStateService, type WorkspaceSnapshot } from './workspace-state.service';

// Type for AiService (avoid circular import)
interface IAiService {
  getAIConfig(
    baseId: string
  ): Promise<{ llmProviders: unknown[]; chatModel?: { lg?: string; sm?: string } }>;
  getAIConfigBySpaceId(spaceId: string): Promise<{
    llmProviders: LLMProvider[];
    embeddingProvider?: {
      providerType: string;
      providerName: string;
      modelId: string;
    };
  }>;
  getModelInstance(modelKey: string, llmProviders: unknown): Promise<unknown>;
  embed(
    texts: string[],
    embeddingModelKey: string,
    llmProviders: LLMProvider[]
  ): Promise<number[][]>;
}

export interface UnifiedChatEvent {
  type: 'text_chunk' | 'tool_result' | 'proposal' | 'done' | 'error';
  content?: string;
  toolName?: string;
  toolOutput?: unknown;
  proposal?: { proposalId: string; action: string; preview: unknown };
  conversationId?: string;
}

export interface UnifiedChatContext {
  spaceId: string;
  userId: string;
  message: string;
  conversationId?: string;
  modelKey: string;
  /** The base the user currently has open in the UI — prefer this for write operations */
  activeBaseId?: string;
  /** Files attached via the chat "+" button — only sent when the selected model supports them */
  attachments?: { url: string; name: string; mimetype: string }[];
  /** Explicit generation target picked via the chat UI buttons — restricts which write tools the model may call */
  targetType?: 'table' | 'interface' | 'automation' | 'agent' | 'app' | 'mock_data';
  /** The table currently displayed in the UI — used by the "Données fictives" target to know which table to fill */
  pageContext?: { tableId?: string; tableName?: string };
}

// targetType → allowed write tool names. Read tools are always available regardless of targetType.
// 'mock_data' is handled as a separate deterministic branch (see generateMockDataForCurrentTable) —
// it never reaches the generic tool-calling loop, so it needs no entry here.
// Real, executable agent tool names (AgentToolRegistryService.BUILT_IN_TOOLS + SCHEMA_TOOLS +
// WORKFLOW_TOOLS) — the AI may only enable tools that actually exist, never invent one.
export const AGENT_TOOL_NAMES = [
  'search_records',
  'get_records',
  'get_record',
  'create_comment',
  'get_record_activity',
  'create_record',
  'update_record',
  'delete_record',
  'search_knowledge_base',
  'create_knowledge_doc',
  'update_knowledge_doc',
  'link_docs',
  'get_doc_links',
  'search_memory',
  'get_memory',
  'save_memory',
  'set_preference',
  'web_search',
  'request_human_approval',
  'list_agents',
  'delegate_to_agent',
  'create_agent',
  'list_workflows',
  'get_workflow',
  'run_workflow',
  'list_tables',
  'get_table_schema',
  'create_table',
  'create_field',
  'create_app',
  'create_view',
] as const;

const TARGET_TYPE_TOOLS: Record<NonNullable<UnifiedChatContext['targetType']>, string[]> = {
  table: ['create_table', 'create_field', 'create_view', 'link_tables', 'create_record'],
  interface: ['create_app_interface'],
  automation: ['create_automation'],
  agent: ['create_agent'],
  app: ['create_app_interface', 'generate_app_code'],
  mock_data: [],
};

@Injectable()
export class UnifiedAiService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly workspaceStateService: WorkspaceStateService,
    private readonly actionProposalService: ActionProposalService,
    private readonly recordService: RecordService,
    @Inject(AI_SERVICE) private readonly aiService: IAiService
  ) {}

  /**
   * Public entry point — wraps chatInner() so any uncaught exception (Prisma, the model
   * provider, RecordService, ...) yields a clean `error` event and a saved assistant
   * message instead of an unhandled rejection the controller can only forward raw.
   */
  async *chat(ctx: UnifiedChatContext): AsyncGenerator<UnifiedChatEvent> {
    const state: { conversationId?: string } = {};
    try {
      yield* this.chatInner(ctx, state);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected error';
      if (state.conversationId) {
        await this.prismaService.workspaceConversationMessage
          .create({
            data: {
              conversationId: state.conversationId,
              role: 'assistant',
              type: 'text',
              content: `Une erreur est survenue : ${message}`,
              proposalId: null,
            },
          })
          .catch(() => {
            // ponytail: best-effort — the error event below still reaches the user either way
          });
      }
      yield { type: 'error', content: message };
    }
  }

  private async *chatInner(
    ctx: UnifiedChatContext,
    state: { conversationId?: string }
  ): AsyncGenerator<UnifiedChatEvent> {
    // Step 1: Get or create conversation
    let conversation: { id: string };
    if (ctx.conversationId) {
      const existing = await this.prismaService.workspaceConversation.findUnique({
        where: { id: ctx.conversationId },
      });
      if (existing) {
        conversation = existing;
      } else {
        conversation = await this.prismaService.workspaceConversation.create({
          data: { spaceId: ctx.spaceId, createdBy: ctx.userId, status: 'in_progress' },
        });
      }
    } else {
      conversation = await this.prismaService.workspaceConversation.create({
        data: { spaceId: ctx.spaceId, createdBy: ctx.userId, status: 'in_progress' },
      });
    }
    state.conversationId = conversation.id;

    // Step 2: Snapshot — called once (D-04)
    const snapshot = await this.workspaceStateService.getSnapshot(ctx.spaceId);

    // Step 3: Build system prompt — truncated to 12000 chars (T-10-02 mitigation)
    const systemPrompt = this.buildSystemPrompt(ctx, snapshot);

    // Step 4: Save user message
    await this.prismaService.workspaceConversationMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'user',
        type: 'text',
        content: ctx.message,
        proposalId: null,
      },
    });

    // Step 5: Get model instance — getAIConfig is base-scoped; use the first base as proxy
    const modelInstance = await this.resolveModelInstance(ctx, snapshot);

    // "Données fictives" bypasses the generic tool-calling loop entirely — we already know
    // exactly which table to fill and exactly what to do with it.
    if (ctx.targetType === 'mock_data') {
      yield* this.generateMockDataForCurrentTable(ctx, conversation.id, snapshot, modelInstance);
      return;
    }

    // Step 6: Build tool registry
    // READ tools — execute directly, return data
    const readTools = {
      get_workspace_state: (tool as (def: object) => object)({
        description:
          'Get the current workspace state including bases, tables, fields, integrations, automations, and app interfaces.',
        parameters: z.object({}),
        execute: async () => snapshot,
      }),
      query_records: (tool as (def: object) => object)({
        description:
          'Query up to 20 records in a table by tableId, optionally filtered by a search string across all fields.',
        parameters: z.object({
          tableId: z.string().describe('The ID of the table to query'),
          query: z.string().optional().describe('Search query string'),
        }),
        execute: async (args: { tableId: string; query?: string }) => {
          try {
            const { records } = await this.recordService.getRecords(args.tableId, {
              take: 20,
              fieldKeyType: FieldKeyType.Name,
              ignoreViewQuery: true,
              ...(args.query ? { search: [args.query] } : {}),
            } as Parameters<RecordService['getRecords']>[1]);
            return records.map((r) => ({ id: r.id, fields: r.fields }));
          } catch {
            // Read tools must never abort the whole turn — an invalid/deleted tableId
            // just yields no results, same as a query that matched nothing.
            return [];
          }
        },
      }),
    } as Record<string, object>;

    // Names proposed earlier in THIS turn (e.g. create_table("Contact") then
    // link_tables(source:"Contact", ...)) — not in the DB yet, but not ambiguous either.
    const proposedTableNames = new Set<string>();

    // Which tableName-ish args each write tool takes, so we can validate them against
    // the real snapshot before proposing instead of letting accept-proposal discover
    // a typo/hallucinated name later (T-disambiguation).
    const TABLE_NAME_ARGS: Record<string, string[]> = {
      create_view: ['tableName'],
      create_record: ['tableName'],
      update_record: ['tableName'],
      link_tables: ['sourceTableName', 'targetTableName'],
    };

    const findTableMatches = (baseId: string | undefined, tableName: string) => {
      const candidateBases = baseId
        ? snapshot.bases.filter((b) => b.id === baseId)
        : snapshot.bases;
      return candidateBases.flatMap((b) =>
        b.tables.filter((t) => t.name.toLowerCase() === tableName.toLowerCase()).map((t) => t.id)
      );
    };

    // WRITE tools — return proposal objects, do NOT mutate DB (D-02, D-03)
    const buildWriteTool = (
      toolName: string,
      description: string,
      params: z.ZodObject<z.ZodRawShape>
    ) =>
      (tool as (def: object) => object)({
        description,
        parameters: params,
        execute: async (args: Record<string, unknown>) => {
          // Defense-in-depth: tool registration already excludes out-of-target tools,
          // but refuse here too in case that ever drifts (e.g. a future tool rename).
          if (ctx.targetType && !TARGET_TYPE_TOOLS[ctx.targetType].includes(toolName)) {
            return {
              __type: 'clarification',
              message: `Cette action ne correspond pas à la cible "${ctx.targetType}" sélectionnée.`,
            };
          }

          // Resolve baseName → baseId using the snapshot when AI omits the ID
          const rawArgs = args as Record<string, unknown>;
          const resolvedArgs = { ...rawArgs };

          // G-02 FIX: activeBaseId always wins for write operations — overrides whatever the AI chose.
          // This prevents the AI from accidentally writing to the wrong base when the user has one open.
          if (ctx.activeBaseId) {
            resolvedArgs.baseId = ctx.activeBaseId;
          } else if (!resolvedArgs.baseId) {
            const nameHint = (resolvedArgs.baseName as string | undefined) ?? '';
            const match = nameHint
              ? snapshot.bases.find((b) => b.name.toLowerCase() === nameHint.toLowerCase())
              : undefined;
            // Fall back to first base if only one exists or no name hint matches
            const resolved = match ?? (snapshot.bases.length === 1 ? snapshot.bases[0] : undefined);
            if (resolved) resolvedArgs.baseId = resolved.id;
          }

          // Disambiguation: several bases exist, none active, name hint didn't match any —
          // asking which base beats silently writing to the wrong one or crashing downstream.
          if (toolName !== 'create_base' && !resolvedArgs.baseId && snapshot.bases.length > 1) {
            return {
              __type: 'clarification',
              message:
                `Plusieurs bases existent dans cet espace (${snapshot.bases.map((b) => `"${b.name}"`).join(', ')}). ` +
                `Dans laquelle veux-tu effectuer cette action ?`,
            };
          }

          // Table name fallback: if AI omits 'name', extract it from the user's message.
          // Handles "Crée une table Produits" → name="Produits", "table Équipe" → name="Équipe".
          if (toolName === 'create_table') {
            const aiName = (resolvedArgs.name as string | undefined)?.trim() ?? '';
            if (!aiName) {
              const m = ctx.message.match(/table\s+([^\s,;:]+)/i);
              if (m) resolvedArgs.name = m[1].trim();
            }
          }

          // Disambiguation: validate any tableName arg against the real snapshot (plus
          // tables proposed earlier this turn) before proposing — catches typos/hallucinated
          // names here instead of failing at accept-proposal time.
          for (const argName of TABLE_NAME_ARGS[toolName] ?? []) {
            const tableName = (resolvedArgs[argName] as string | undefined)?.trim();
            if (!tableName || proposedTableNames.has(tableName.toLowerCase())) continue;
            const matches = findTableMatches(resolvedArgs.baseId as string | undefined, tableName);
            if (matches.length === 0) {
              return {
                __type: 'clarification',
                message: `Je ne trouve pas de table nommée "${tableName}". Peux-tu confirmer le nom exact ?`,
              };
            }
            if (matches.length > 1) {
              return {
                __type: 'clarification',
                message: `Plusieurs tables s'appellent "${tableName}" dans cet espace. Dans quelle base se trouve celle que tu veux dire ?`,
              };
            }
          }

          const preview = this.buildPreview(toolName, resolvedArgs);
          const proposal = await this.actionProposalService.createProposal({
            action: toolName,
            args: resolvedArgs,
            conversationId: conversation.id,
            preview,
          });

          if (toolName === 'create_table' && resolvedArgs.name) {
            proposedTableNames.add((resolvedArgs.name as string).toLowerCase());
          }

          // Include a hint so the model knows to keep calling tools (e.g. link_tables).
          const hint =
            toolName === 'create_table'
              ? `Table "${(resolvedArgs.name as string) ?? 'unnamed'}" proposal created. ` +
                `If the user asked to link tables, call link_tables NOW using the table name (not the ID).`
              : undefined;
          return { __type: 'proposal', ...proposal, ...(hint ? { _hint: hint } : {}) };
        },
      });

    const writeTools = {
      create_table: buildWriteTool(
        'create_table',
        'Create a new table. IMPORTANT: (1) set "name" to the EXACT table name the user mentioned (e.g. user says "table Clients" → name="Clients", "table Équipe" → name="Équipe"). (2) include ALL fields in the fields array — do NOT call create_field separately.',
        z.object({
          baseId: z.string().optional().describe('The base (database) ID — preferred if known'),
          baseName: z
            .string()
            .optional()
            .describe('The base name — used to resolve baseId if ID is not known'),
          name: z
            .string()
            .min(1)
            .describe('Exact table name from the user request (required, non-empty)'),
          fields: z
            .array(
              z.object({
                name: z.string().describe('Field name'),
                type: z
                  .enum([
                    'singleLineText',
                    'longText',
                    'number',
                    'date',
                    'checkbox',
                    'singleSelect',
                    'multipleSelect',
                    'attachment',
                    'rating',
                    'link',
                    'formula',
                  ])
                  .describe(
                    'Field type. Use "link" for a relation to another existing table (requires foreignTableName + relationship). Use "formula" for a calculated field (requires expression).'
                  ),
                required: z.boolean().optional().describe('Field cannot be left empty'),
                unique: z.boolean().optional().describe('Values must be unique across records'),
                defaultValue: z
                  .union([z.string(), z.number(), z.boolean()])
                  .optional()
                  .describe('Default value — type must match the field type'),
                choices: z
                  .array(z.string())
                  .optional()
                  .describe('Option labels — required when type is singleSelect/multipleSelect'),
                foreignTableName: z
                  .string()
                  .optional()
                  .describe('Required when type is "link" — name of an existing table to link to'),
                relationship: z
                  .enum(['oneOne', 'oneMany', 'manyOne', 'manyMany'])
                  .optional()
                  .describe('Required when type is "link"'),
                expression: z
                  .string()
                  .optional()
                  .describe(
                    'Required when type is "formula". Use {{FieldName}} to reference other fields in this table (names, not IDs — they are resolved automatically). Example: "{{Price}} * {{Quantity}}"'
                  ),
              })
            )
            .optional()
            .describe('All fields to create in this table — include ALL fields here'),
        })
      ),
      create_base: buildWriteTool(
        'create_base',
        'Create a new base (database) in the workspace. ⚠️ ONLY call this when the user EXPLICITLY asks to create a new base by name (e.g. "create a base called X"). NEVER call this to organise tables or set up a project — always use the existing ACTIVE BASE for that.',
        z.object({
          spaceId: z.string().optional(),
          name: z.string().describe('Base name'),
        })
      ),
      delete_field: buildWriteTool(
        'delete_field',
        'Delete a field from a table.',
        z.object({ tableId: z.string(), fieldId: z.string() })
      ),
      rename_table: buildWriteTool(
        'rename_table',
        'Rename a table.',
        z.object({ tableId: z.string(), name: z.string() })
      ),
      rename_field: buildWriteTool(
        'rename_field',
        'Rename a field.',
        z.object({ tableId: z.string(), fieldId: z.string(), name: z.string() })
      ),
      create_view: buildWriteTool(
        'create_view',
        'Create a new view on an existing table. Use tableName (or tableId if known) to target the table. "type" is one of: grid, gallery, kanban, calendar, gantt, form, ai. For type="ai", also pass "prompt" describing what the view should show — the AI designs a native view with the right filter/sort/hidden columns.',
        z.object({
          tableId: z.string().optional().describe('Target table ID — use if already known'),
          tableName: z
            .string()
            .optional()
            .describe(
              'Target table name — preferred when tableId is unknown; resolved automatically'
            ),
          baseId: z.string().optional().describe('Base ID — used to resolve tableName to tableId'),
          type: z
            .string()
            .describe('View type: grid | gallery | kanban | calendar | gantt | form | ai'),
          name: z.string().optional().describe('Optional view name'),
          prompt: z
            .string()
            .optional()
            .describe('Required when type="ai": natural-language description of what to show'),
        })
      ),
      create_record: buildWriteTool(
        'create_record',
        'Create a record with field values in a table. Use tableName (NOT tableId) when creating records for tables that were just proposed. Fields must be a flat object: { "Field Name": "value" }.',
        z.object({
          tableId: z.string().optional().describe('Use only if you already know the tableId'),
          tableName: z
            .string()
            .optional()
            .describe(
              'The table name — preferred when tableId is unknown. The tableId will be resolved automatically.'
            ),
          baseId: z
            .string()
            .optional()
            .describe('The base ID — used to resolve tableName to tableId'),
          fields: z
            .record(z.string(), z.unknown())
            .optional()
            .describe('Flat field values: { "Field Name": value }'),
        })
      ),
      update_record: buildWriteTool(
        'update_record',
        'Update an existing record.',
        z.object({
          tableId: z.string(),
          recordId: z.string(),
          fields: z.record(z.string(), z.unknown()),
        })
      ),
      create_folder: buildWriteTool(
        'create_folder',
        'Create a new folder inside a base.',
        z.object({
          name: z.string(),
          baseId: z.string().optional().describe('The base (database) ID — preferred if known'),
          baseName: z
            .string()
            .optional()
            .describe('The base name — used to resolve baseId if ID is not known'),
        })
      ),
      create_app_interface: buildWriteTool(
        'create_app_interface',
        'Create a new App (no-code app builder) inside a base. Prefer "modules" (a declarative list of data-table/form/detail-view blocks bound to real tables) over free-form code generation whenever the request is a standard CRUD interface — it is more reliable. Only omit "modules" and rely on generate_app_code afterwards for genuinely custom UI.',
        z.object({
          name: z.string(),
          baseId: z.string().optional().describe('The base (database) ID — preferred if known'),
          baseName: z
            .string()
            .optional()
            .describe('The base name — used to resolve baseId if ID is not known'),
          tableId: z.string().optional(),
          modules: z
            .array(
              z.object({
                type: z.enum(['data-table', 'form', 'detail-view']),
                tableName: z.string().describe('Name of an existing table this module is bound to'),
                title: z.string().optional(),
                fieldNames: z
                  .array(z.string())
                  .optional()
                  .describe('Field names to show, in order; omit to show all fields'),
              })
            )
            .optional()
            .describe('Declarative CRUD modules — each binds to one existing table'),
        })
      ),
      create_automation: buildWriteTool(
        'create_automation',
        'Create a new automation (trigger + steps) for a base. Prefer the structured `trigger` and `steps` fields — only the 8 trigger types and 9 step types listed are actually executable by the workflow engine. Use `description` as a free-text fallback solely to improve naming when you cannot fully determine the structured shape; never rely on free text for the actual logic.',
        z.object({
          name: z.string(),
          trigger: WorkflowTriggerSchema.optional(),
          steps: z.array(WorkflowStepSchema).min(1).max(10).optional(),
          description: z
            .string()
            .optional()
            .describe(
              'Free-text fallback, naming/enrichment only — never the source of trigger/step logic'
            ),
          baseId: z.string().optional().describe('The base (database) ID — preferred if known'),
          baseName: z
            .string()
            .optional()
            .describe('The base name — used to resolve baseId if ID is not known'),
        })
      ),
      create_agent: buildWriteTool(
        'create_agent',
        'Create a new AI agent for tasks that cannot be expressed as a deterministic automation (e.g. natural-language triage, multi-step reasoning, content drafting). The agent runs with ReAct + planner + memory. Third-party connectors (Gmail/GitHub/Slack) require an interactive OAuth flow and can never be created by this tool — you may only recommend the user connect one afterwards.',
        z.object({
          name: z.string().describe('Agent name'),
          description: z.string().optional().describe('Short purpose summary'),
          instructions: z
            .string()
            .describe('System instructions / role prompt that the agent will follow at runtime'),
          modelKey: z
            .string()
            .optional()
            .describe('Specific model to use; omit to use the space default'),
          tools: z
            .array(z.enum(AGENT_TOOL_NAMES))
            .optional()
            .describe(
              'Tool names to enable for this agent — only real, executable tools. web_search defaults OFF unless explicitly listed here.'
            ),
          planningEnabled: z.boolean().optional().describe('Default true'),
          reflectionEnabled: z.boolean().optional().describe('Default true'),
          maxReflections: z.number().int().min(0).max(10).optional(),
          maxIterations: z.number().int().min(1).max(50).optional(),
          respondToMentions: z
            .boolean()
            .optional()
            .describe(
              'Whether the agent responds when @mentioned on a record. Default true — set false to disable.'
            ),
          allowDirectMessage: z
            .boolean()
            .optional()
            .describe('Whether the agent responds to direct messages. Default true.'),
          memoryEnabled: z
            .boolean()
            .optional()
            .describe(
              'Whether the agent retains memory across conversations (recent context + preferences). Default true.'
            ),
          isPublic: z
            .boolean()
            .optional()
            .describe('Whether other space members can use this agent'),
          scheduling: z
            .object({ cron: z.string().describe('Cron expression, e.g. "0 9 * * 1"') })
            .optional()
            .describe('Only set this for agents meant to run automatically on a schedule'),
          mcpServerUrls: z
            .array(
              z.object({
                name: z.string().describe('Short label for the MCP server'),
                url: z.string().url().describe('Full URL of the MCP server (streamable-http)'),
              })
            )
            .optional()
            .describe(
              'MCP servers to connect at creation time. Only add servers the user explicitly named.'
            ),
          baseId: z.string().optional().describe('The base (database) ID — preferred if known'),
          baseName: z
            .string()
            .optional()
            .describe('The base name — used to resolve baseId if ID is not known'),
        })
      ),
      generate_app_code: buildWriteTool(
        'generate_app_code',
        'Generate React application code for an app interface. Call this AFTER create_app_interface when the user wants a working app with full UI code. Pass the appId from the create_app_interface result and a clear prompt describing what the app should do.',
        z.object({
          appId: z.string().describe('The app node ID returned by create_app_interface'),
          prompt: z.string().describe('Clear description of what the app should display and do'),
          baseId: z.string().optional().describe('The base ID — filled automatically'),
        })
      ),
      link_tables: buildWriteTool(
        'link_tables',
        'Create a link (relationship) field on sourceTable that points to targetTable. Use this AFTER both tables exist to wire a one-to-many or many-to-one relationship (e.g. Contacts → Entreprise). relationship values: "manyOne" (many contacts belong to one company), "oneMany" (one company has many contacts), "manyMany", "oneOne". Prefer table names over IDs when tables were just created.',
        z.object({
          baseId: z.string().optional().describe('The base ID — used to resolve table names'),
          sourceTableId: z
            .string()
            .optional()
            .describe('ID of the table where the link field is added'),
          sourceTableName: z
            .string()
            .optional()
            .describe(
              'Name of the table where the link field is added — preferred when ID is unknown'
            ),
          targetTableId: z.string().optional().describe('ID of the table to link to'),
          targetTableName: z
            .string()
            .optional()
            .describe('Name of the table to link to — preferred when ID is unknown'),
          fieldName: z
            .string()
            .optional()
            .describe('Name for the link field (defaults to the target table name)'),
          relationship: z
            .enum(['manyOne', 'oneMany', 'manyMany', 'oneOne'])
            .optional()
            .describe(
              'Relationship type — default: "manyOne" (many rows link to one row in target)'
            ),
        })
      ),
    };

    // When a targetType was picked in the UI, hard-restrict the model to that target's
    // write tools instead of relying solely on the prompt hint above.
    const allowedWriteTools = ctx.targetType
      ? Object.fromEntries(
          Object.entries(writeTools).filter(([name]) =>
            TARGET_TYPE_TOOLS[
              ctx.targetType as NonNullable<UnifiedChatContext['targetType']>
            ].includes(name)
          )
        )
      : writeTools;

    const rawTools = { ...readTools, ...allowedWriteTools };

    // Patch: ai SDK v6 reads `tool.inputSchema` but `tool()` stores the schema as `parameters`.
    // When `inputSchema` is undefined, `asSchema(undefined)` returns `{properties:{}}` (no type:"object"),
    // which Anthropic API rejects. Pre-convert each Zod schema to an ai-SDK Schema object via
    // `zodSchema()` so `isSchema()` returns true and the conversion path is skipped entirely.
    const tools = Object.fromEntries(
      Object.entries(rawTools).map(([name, t]) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const anyT = t as any;
        if (anyT?.parameters && !anyT?.inputSchema) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const converted = buildZodSchema(anyT.parameters as any);
          return [name, { ...anyT, inputSchema: converted }];
        }
        return [name, t];
      })
    );

    // Step 7: Call generateText (tool calling requires full response)
    // Attachments turn the user message into a multimodal content array (text + image/file
    // parts) — the AI SDK accepts this shape for any provider that declares vision/pdf ability.
    const userContent = ctx.attachments?.length
      ? [
          { type: 'text' as const, text: ctx.message },
          ...ctx.attachments.map((a) =>
            a.mimetype.startsWith('image/')
              ? { type: 'image' as const, image: a.url }
              : { type: 'file' as const, data: a.url, mediaType: a.mimetype }
          ),
        ]
      : ctx.message;

    const result = await generateText({
      model: modelInstance as Parameters<typeof generateText>[0]['model'],
      tools: tools as Parameters<typeof generateText>[0]['tools'],
      stopWhen: (stepCountIs as (n: number) => unknown)(30) as never,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
    } as never);

    // Step 8: Iterate result.steps and yield events
    let fullText = '';
    for (const step of result.steps) {
      if (step.text) {
        fullText += step.text;
        yield { type: 'text_chunk', content: step.text };
      }

      for (const toolResult of step.toolResults ?? []) {
        // AI SDK v6 uses `output` (not `result`) on TypedToolResult
        const res = (toolResult as unknown as { output?: unknown }).output as {
          __type?: string;
          proposalId?: string;
          action?: string;
          preview?: unknown;
          message?: string;
        };
        if (res && res.__type === 'clarification') {
          // Disambiguation, not a proposal: surface the question as the assistant's reply.
          fullText += res.message ?? '';
          yield { type: 'text_chunk', content: res.message ?? '' };
        } else if (res && res.__type === 'proposal') {
          yield {
            type: 'proposal',
            proposal: {
              proposalId: res.proposalId!,
              action: res.action!,
              preview: res.preview,
            },
          };
        } else {
          yield {
            type: 'tool_result',
            toolName: toolResult.toolName,
            toolOutput: res,
          };
        }
      }
    }

    // Step 8.5/8.6: deterministic post-processing — auto-propose mock records, an app
    // interface, and link_tables for newly created tables (see runAutoProposalHeuristics).
    yield* this.runAutoProposalHeuristics(ctx, result, conversation.id);

    // Fallback: if no step text yielded but result.text exists, emit it
    if (!fullText && result.text) {
      fullText = result.text;
      yield { type: 'text_chunk', content: result.text };
    }

    // Step 9: Save assistant message
    await this.prismaService.workspaceConversationMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'assistant',
        type: 'text',
        content: fullText || result.text || '',
        proposalId: null,
      },
    });

    // Step 10: Yield done with conversationId
    yield { type: 'done', conversationId: conversation.id };
  }

  /**
   * GW-04 / D-15-04: Route embeddings through the gateway.
   * Resolves the space-scoped embedding provider config and calls aiService.embed.
   * Throws a typed error if no embeddingProvider is configured — no silent fallback.
   */
  async generateEmbeddings(texts: string[], spaceId: string): Promise<number[][]> {
    const aiConfig = await this.aiService.getAIConfigBySpaceId(spaceId);
    const { embeddingProvider } = aiConfig;
    if (!embeddingProvider) {
      throw new CustomHttpException(
        'No embedding provider configured. Set an embedding provider in AI settings.',
        HttpErrorCode.VALIDATION_ERROR,
        { localization: { i18nKey: 'httpErrors.ai.embeddingProviderNotSet' } }
      );
    }
    const { providerType, modelId, providerName } = embeddingProvider;
    const embeddingModelKey = `${providerType}@${modelId}@${providerName}`;
    return this.aiService.embed(texts, embeddingModelKey, aiConfig.llmProviders);
  }

  /**
   * Agent-memory extraction (Phase 1). Implements IMemoryExtractor (bound to MEMORY_EXTRACTOR
   * in DocSearchModule). Resolves the space's chat model via a proxy base and asks it for a
   * small entity/relation graph. Best-effort: returns an empty graph (never throws) when no
   * base/model is configured or the model call fails, so ingestion is never blocked.
   */
  async extractMemory(
    spaceId: string,
    text: string
  ): Promise<{
    entities: Array<{ name: string; type: string; summary: string }>;
    relations: Array<{ from: string; to: string; label: string }>;
  }> {
    const empty = { entities: [], relations: [] };
    try {
      // P-02: resolve a proxy base with a single cheap query instead of getSnapshot()
      // (which runs ~5 queries building the whole workspace state) — this runs per ingest.
      const base = await this.prismaService.base.findFirst({
        where: { spaceId },
        select: { id: true },
      });
      if (!base) return empty;
      const aiConfig = await this.aiService.getAIConfig(base.id);
      const modelKey = aiConfig.chatModel?.sm ?? aiConfig.chatModel?.lg;
      if (!modelKey) return empty;
      const modelInstance = await this.aiService.getModelInstance(modelKey, aiConfig.llmProviders);

      const schema = z.object({
        entities: z
          .array(
            z.object({
              name: z.string().describe('Canonical short name of the entity'),
              type: z.string().describe('person | organisation | system | concept | place | ...'),
              summary: z.string().describe('One-sentence description'),
            })
          )
          .max(40),
        relations: z
          .array(
            z.object({
              from: z.string().describe('Source entity name (must match an entity above)'),
              to: z.string().describe('Target entity name (must match an entity above)'),
              label: z.string().describe('Short verb phrase, e.g. "works_for", "depends_on"'),
            })
          )
          .max(80),
      });

      const { object } = await generateObject({
        model: modelInstance as Parameters<typeof generateObject>[0]['model'],
        schema,
        prompt:
          'Extract a knowledge graph from the document below. List the key entities ' +
          '(people, organisations, systems, concepts, places) each with a one-sentence ' +
          'summary, then the relations between them. Only reference entity names that appear ' +
          'in your entities list.\n\n--- DOCUMENT ---\n' +
          text.slice(0, 8000),
      });

      return { entities: object.entities ?? [], relations: object.relations ?? [] };
    } catch {
      return empty;
    }
  }

  private buildPreview(toolName: string, args: Record<string, unknown>): Record<string, unknown> {
    switch (toolName) {
      case 'create_table': {
        // G-03 FIX: normalise fields — AI sometimes sends strings instead of field objects
        interface IPreviewRawField {
          name: string;
          type?: string;
          required?: boolean;
          unique?: boolean;
          choices?: string[];
          foreignTableName?: string;
        }
        const rawFields = args.fields as Array<IPreviewRawField | string> | undefined;
        const normalisedFields = (rawFields ?? []).map((f) =>
          typeof f === 'string'
            ? { name: f, type: 'singleLineText' }
            : {
                name: f.name,
                type: f.type ?? 'singleLineText',
                required: f.required,
                unique: f.unique,
                choices: f.choices,
                foreignTableName: f.foreignTableName,
              }
        );
        return {
          baseName: args.baseId,
          tableName: (args.name as string | undefined)?.trim() || 'New Table',
          fields: normalisedFields,
        };
      }
      case 'create_base':
        return { name: args.name };
      case 'create_field':
        return { tableId: args.tableId, name: args.name, type: args.type };
      case 'create_view':
        return {
          tableId: args.tableId,
          tableName: args.tableName,
          type: args.type,
          name: args.name,
          ...(args.prompt ? { prompt: args.prompt } : {}),
        };
      case 'delete_field':
        return { fieldId: args.fieldId, tableId: args.tableId };
      case 'rename_table':
        return { tableId: args.tableId, name: args.name };
      case 'rename_field':
        return { fieldId: args.fieldId, name: args.name };
      case 'create_record':
        return {
          tableName:
            (args.tableName as string | undefined) ||
            (args.tableId as string | undefined) ||
            'Unknown table',
          fields: args.fields || {},
        };
      case 'update_record':
        return { recordId: args.recordId, tableId: args.tableId };
      case 'create_folder':
        return { name: args.name };
      case 'create_app_interface':
        return { name: args.name, modules: args.modules };
      case 'create_automation':
        return {
          name: args.name,
          trigger: args.trigger,
          steps: args.steps,
          description: args.description,
        };
      case 'create_agent':
        return {
          name: args.name,
          description: args.description,
          tools: args.tools,
          scheduling: args.scheduling,
          isPublic: args.isPublic,
        };
      default:
        return { action: toolName, args };
    }
  }

  /**
   * Realistic mock value for a field, keyed by name patterns then field type.
   * ponytail: faker covers this; rowIndex seeds the RNG so the 3 proposed
   * rows differ deterministically.
   */
  private generateMockValue(
    fieldName: string,
    fieldType: string | undefined,
    rowIndex: number
  ): unknown {
    faker.seed(rowIndex + 1);
    const n = fieldName.toLowerCase();

    if (/pr[ée]nom|firstname|first.?name/.test(n)) return faker.person.firstName();
    if (/mail|courriel/.test(n)) return faker.internet.email();
    if (/r[ôo]le|poste|titre|^title$|^job/.test(n)) return faker.person.jobTitle();
    if (/t[ée]l|phone/.test(n)) return faker.phone.number();
    if (/entreprise|company|soci[ée]t[ée]|compagnie/.test(n)) return faker.company.name();
    if (/statut|status|[ée]tat/.test(n))
      return faker.helpers.arrayElement(['Actif', 'En attente', 'Terminé']);
    if (/prix|price|montant|amount|budget|cost/.test(n))
      return faker.number.int({ min: 100, max: 10000 });
    if (/adresse|address/.test(n)) return faker.location.streetAddress();
    if (/ville|city/.test(n)) return faker.location.city();
    if (/pays|country/.test(n)) return faker.location.country();
    if (/url|site|website|lien/.test(n)) return faker.internet.url();
    if (/description|note|commentaire|comment/.test(n)) return faker.lorem.sentence();
    if (/nom|name|lastname|last.?name/.test(n)) return faker.person.fullName();

    switch (fieldType) {
      case 'email':
        return faker.internet.email();
      case 'url':
        return faker.internet.url();
      case 'phoneNumber':
        return faker.phone.number();
      case 'number':
      case 'currency':
      case 'percent':
      case 'rating':
        return faker.number.int({ min: 1, max: 100 });
      case 'date':
        return faker.date.recent().toISOString().slice(0, 10);
      case 'checkbox':
        return faker.datatype.boolean();
      case 'longText':
        return faker.lorem.paragraph();
      default:
        return faker.lorem.words(3);
    }
  }

  /**
   * Resolves the LLM instance to use for this turn — getAIConfig is base-scoped, so the
   * first base in the space is used as a proxy. Throws instead of yielding an error event
   * directly: chat() wraps chatInner() in a try/catch that turns any thrown Error into a
   * clean `error` SSE event, so callers further down don't need to special-case this.
   */
  private async resolveModelInstance(
    ctx: UnifiedChatContext,
    snapshot: WorkspaceSnapshot
  ): Promise<unknown> {
    const proxyBaseId = snapshot.bases[0]?.id;
    if (!proxyBaseId) {
      throw new Error('No bases found in this space. Create a base first.');
    }
    const aiConfig = await this.aiService.getAIConfig(proxyBaseId);
    const resolvedModelKey = ctx.modelKey ?? aiConfig.chatModel?.lg;
    if (!resolvedModelKey) {
      throw new Error('No AI model configured. Please configure an AI provider in space settings.');
    }
    return this.aiService.getModelInstance(resolvedModelKey, aiConfig.llmProviders);
  }

  /**
   * Deterministic post-processing run after the model's tool-calling turn finishes:
   * auto-proposes 3 mock records + an app interface for any table the model just created
   * (skipped when the user explicitly picked a non-interface targetType), auto-proposes
   * link_tables when exactly 2 tables were created and the user's message hints at linking
   * them, and proposes one shared "CRM" app interface for multi-table sessions.
   */
  private async *runAutoProposalHeuristics(
    ctx: UnifiedChatContext,
    result: Awaited<ReturnType<typeof generateText>>,
    conversationId: string
  ): AsyncGenerator<UnifiedChatEvent> {
    const autoTableProposals: Array<{
      tableName: string;
      baseId: string;
      fields: Array<{ name: string; type?: string }>;
    }> = [];
    for (const step of result.steps) {
      for (const toolResult of step.toolResults ?? []) {
        const res = (toolResult as unknown as { output?: unknown }).output as Record<
          string,
          unknown
        >;
        if (res && res.__type === 'proposal' && res.action === 'create_table') {
          const preview = res.preview as Record<string, unknown> | undefined;
          const tableName = preview?.tableName as string | undefined;
          const fields = (preview?.fields ?? []) as Array<{ name: string; type?: string }>;
          const baseId = ctx.activeBaseId ?? '';
          if (tableName && baseId) {
            autoTableProposals.push({ tableName, baseId, fields });
          }
        }
      }
    }

    // Only auto-propose an app interface on top of a new table when the user didn't
    // explicitly ask for something else (table/automation/agent) via the chat UI buttons.
    const wantsInterface =
      !ctx.targetType || ctx.targetType === 'interface' || ctx.targetType === 'app';

    for (const tableInfo of autoTableProposals) {
      // Auto-create 3 mock record proposals
      for (let i = 0; i < 3; i++) {
        const mockFields: Record<string, unknown> = {};
        for (const field of tableInfo.fields) {
          mockFields[field.name] = this.generateMockValue(field.name, field.type, i);
        }
        const recordProposal = await this.actionProposalService.createProposal({
          action: 'create_record',
          args: { tableName: tableInfo.tableName, baseId: tableInfo.baseId, fields: mockFields },
          conversationId,
          preview: { tableName: tableInfo.tableName, fields: mockFields },
        });
        yield {
          type: 'proposal',
          proposal: {
            proposalId: recordProposal.proposalId,
            action: recordProposal.action,
            preview: recordProposal.preview,
          },
        };
      }

      // Auto-create app interface proposal only if this is a single-table session.
      // Multi-table sessions get a single shared CRM app proposed below.
      if (wantsInterface && autoTableProposals.length === 1) {
        const appName = `App ${tableInfo.tableName}`;
        const appProposal = await this.actionProposalService.createProposal({
          action: 'create_app_interface',
          args: { name: appName, baseId: tableInfo.baseId },
          conversationId,
          preview: { name: appName },
        });
        yield {
          type: 'proposal',
          proposal: {
            proposalId: appProposal.proposalId,
            action: appProposal.action,
            preview: appProposal.preview,
          },
        };
      }
    }

    // Auto-propose link_tables when:
    //   - 2 tables were created AND
    //   - model did NOT already call link_tables AND
    //   - user message contains a linking keyword
    const alreadyLinked = result.steps.some((s) =>
      (s.toolResults ?? []).some(
        (tr) =>
          (tr as unknown as { output?: Record<string, unknown> }).output?.__type === 'proposal' &&
          (tr as unknown as { output?: Record<string, unknown> }).output?.action === 'link_tables'
      )
    );
    const linkKeywords = /li(e|en|er|ez)|relat|associat|appartient|belong|link/i;
    if (autoTableProposals.length === 2 && !alreadyLinked && linkKeywords.test(ctx.message)) {
      const [target, source] = autoTableProposals; // first=main entity (Entreprise), second=dependent (Contacts)
      const linkProposal = await this.actionProposalService.createProposal({
        action: 'link_tables',
        args: {
          baseId: source.baseId,
          sourceTableName: source.tableName,
          targetTableName: target.tableName,
          fieldName: target.tableName,
          relationship: 'manyOne',
        },
        conversationId,
        preview: {
          sourceTableName: source.tableName,
          targetTableName: target.tableName,
          relationship: 'manyOne',
          fieldName: target.tableName,
        },
      });
      yield {
        type: 'proposal',
        proposal: {
          proposalId: linkProposal.proposalId,
          action: linkProposal.action,
          preview: linkProposal.preview,
        },
      };
    }

    // For multi-table sessions (e.g. CRM with Entreprise + Contacts), propose one unified app.
    if (wantsInterface && autoTableProposals.length > 1) {
      const tableNames = autoTableProposals.map((t) => t.tableName).join(' & ');
      const crmAppName = `App CRM — ${tableNames}`;
      const baseId = autoTableProposals[0].baseId;
      const crmAppProposal = await this.actionProposalService.createProposal({
        action: 'create_app_interface',
        args: { name: crmAppName, baseId },
        conversationId,
        preview: { name: crmAppName, tables: autoTableProposals.map((t) => t.tableName) },
      });
      yield {
        type: 'proposal',
        proposal: {
          proposalId: crmAppProposal.proposalId,
          action: crmAppProposal.action,
          preview: crmAppProposal.preview,
        },
      };
    }
  }

  /** Builds the full system prompt (rules + active base/target hints + workspace snapshot), truncated to 12000 chars. */
  private buildSystemPrompt(ctx: UnifiedChatContext, snapshot: WorkspaceSnapshot): string {
    // Build a compact base summary first so IDs are always visible even after truncation
    const baseSummary = snapshot.bases
      .map(
        (b) =>
          `  - "${b.name}" (baseId: ${b.id}) — tables: ${b.tables.map((t) => `"${t.name}" (tableId: ${t.id})`).join(', ') || 'none'}`
      )
      .join('\n');
    const activeBase = ctx.activeBaseId
      ? snapshot.bases.find((b) => b.id === ctx.activeBaseId)
      : undefined;
    const activeBaseHint = activeBase
      ? `\n⚠️ ACTIVE BASE (user is currently viewing this base — USE THIS for all write operations unless the user says otherwise):\n  "${activeBase.name}" (baseId: ${activeBase.id})\n`
      : '';
    const targetTypeHint = ctx.targetType
      ? `\n⚠️ EXPLICIT TARGET: the user picked "${ctx.targetType}" via the chat UI. Only call tools for this target (${TARGET_TYPE_TOOLS[ctx.targetType].join(', ')}). Do NOT call tools for any other target type.\n`
      : '';

    const rawPrompt =
      'You are a workspace AI assistant for Teable — a no-code database platform.\n' +
      'You help users build, organize, and manage their databases by calling tools.\n\n' +
      '## ⚠️ ABSOLUTE RULES\n' +
      'For ANY write request, call the appropriate tool IMMEDIATELY.\n' +
      'NEVER respond with text describing what you would do. NEVER ask for confirmation before creating.\n' +
      'The only exception: before deleting many records irreversibly, ask once.\n' +
      'NEVER call create_base unless the user says "create a new base" explicitly — always use the ACTIVE BASE for tables, apps, automations, and agents.\n\n' +
      '## Genuine ambiguity (different from confirmation)\n' +
      'Confirmation = "should I do this?" — never ask that.\n' +
      'Disambiguation = "which one do you mean?" — ask that ONCE when you genuinely cannot resolve it ' +
      '(e.g. several bases exist and none is active, or a tableName you were given matches zero or ' +
      'several tables). A tool call will come back as a clarification message in that case — relay it ' +
      'to the user verbatim as your reply instead of guessing an ID or calling another tool.\n\n' +
      activeBaseHint +
      targetTypeHint +
      '## Tool calling rules\n' +
      `1. Pass baseId="${ctx.activeBaseId ?? '<use active base id shown above>'}" on EVERY write tool call.\n` +
      '2. create_table: fields = array of objects [{name:"...",type:"singleLineText"}]. Include ALL fields in one call.\n' +
      '3. create_record: fields = FLAT object {"Field Name": value}. Use tableName (not tableId).\n' +
      '3b. create_view: add a view to an EXISTING table. type = grid|gallery|kanban|calendar|gantt|form|ai. Use tableName + the requested type. For "ai", also pass prompt describing what to show (filters/sort/hidden columns).\n' +
      '4. After create_table: sample records + app interface are auto-proposed — do NOT call create_record or create_app_interface yourself.\n' +
      '5. LINKING IS NEVER AUTOMATIC: If the user asks to link/relate tables, you MUST call link_tables explicitly — always after all create_table calls.\n' +
      '   - Use sourceTableName + targetTableName (not IDs)\n' +
      '   - "manyOne" = many source rows → one target row (e.g. many Contacts → one Company) ← default\n' +
      '   - "oneMany" = one source row → many target rows\n' +
      '   - Example CRM: create_table("Company") → create_table("Contact") → link_tables(source:"Contact", target:"Company", relationship:"manyOne", fieldName:"Company")\n' +
      '6. All name/trigger/action parameters must be plain strings, not nested objects.\n' +
      '7. When designing schemas, follow these field types:\n' +
      '   Short text/title → singleLineText | Long notes → longText | Number → number\n' +
      '   Fixed choices → singleSelect | Multiple tags → multipleSelect | Date → date\n' +
      '   True/False → checkbox | File → attachment\n' +
      '   Email/URL/Phone → singleLineText (no dedicated type — use longText for free text) | Stars → rating\n' +
      '8. When create_app_interface is accepted, code generation triggers automatically — do NOT call any separate tool for it.\n\n' +
      '## After completing a task\n' +
      'Give a brief confirmation (1-2 sentences) summarizing what was created/changed.\n' +
      'Suggest a logical next step if relevant (e.g. "You may want to link this to your Contacts table.").\n\n' +
      '## Current workspace\n' +
      baseSummary +
      '\n\nFULL STATE:\n' +
      JSON.stringify(snapshot, null, 2);
    return rawPrompt.slice(0, 12000);
  }

  /** Zod value schema per Teable field type, used to ground generateObject's output. */
  private mockValueSchemaForFieldType(fieldType: string) {
    switch (fieldType) {
      case 'number':
      case 'currency':
      case 'percent':
      case 'rating':
        return z.number();
      case 'checkbox':
        return z.boolean();
      default:
        // date, select, text-like fields — a plain string is valid input for all of them
        return z.string();
    }
  }

  /**
   * Resolves 'link' fields to real candidate record IDs in their foreign table — the LLM may
   * only pick among IDs that actually exist (Phase 4: never propose an orphaned relation).
   * Returns missingTableName when a foreign table is itself empty, signalling the caller to
   * abort generation entirely rather than produce a table with dangling links.
   */
  private async resolveLinkFieldCandidates(
    fieldMetas: Array<{ name: string; type: string; options: string | null }>
  ): Promise<{
    candidates: Record<string, { ids: string[]; multi: boolean }>;
    missingTableName?: string;
  }> {
    const candidates: Record<string, { ids: string[]; multi: boolean }> = {};
    for (const f of fieldMetas) {
      if (f.type !== 'link' || !f.options) continue;
      const options = JSON.parse(f.options) as {
        foreignTableId?: string;
        relationship?: string;
      };
      if (!options.foreignTableId) continue;
      const { records } = await this.recordService.getRecords(options.foreignTableId, {
        take: 50,
        fieldKeyType: FieldKeyType.Name,
        ignoreViewQuery: true,
      } as Parameters<RecordService['getRecords']>[1]);
      if (records.length === 0) {
        const foreignTable = await this.prismaService.tableMeta.findFirst({
          where: { id: options.foreignTableId },
          select: { name: true },
        });
        return { candidates, missingTableName: foreignTable?.name ?? 'la table liée' };
      }
      candidates[f.name] = {
        ids: records.map((r) => r.id),
        multi: options.relationship === 'oneMany' || options.relationship === 'manyMany',
      };
    }
    return { candidates };
  }

  /**
   * "Données fictives": fills the empty rows of the table the user currently has open with
   * values correlated to their request, instead of generic faker placeholders. Only touches
   * rows that are genuinely empty — a table that already has data is left untouched.
   */
  private async *generateMockDataForCurrentTable(
    ctx: UnifiedChatContext,
    conversationId: string,
    snapshot: {
      bases: Array<{
        tables: Array<{ id: string; name: string; fields: Array<{ name: string; type: string }> }>;
      }>;
    },
    modelInstance: unknown
  ): AsyncGenerator<UnifiedChatEvent> {
    const allTables = snapshot.bases.flatMap((b) => b.tables);
    const table = ctx.pageContext?.tableId
      ? allTables.find((t) => t.id === ctx.pageContext?.tableId)
      : ctx.pageContext?.tableName
        ? allTables.find((t) => t.name.toLowerCase() === ctx.pageContext?.tableName?.toLowerCase())
        : undefined;

    if (!table) {
      const message =
        'Ouvre une table avant de demander des données fictives — je dois savoir laquelle remplir.';
      yield { type: 'text_chunk', content: message };
      await this.prismaService.workspaceConversationMessage.create({
        data: {
          conversationId,
          role: 'assistant',
          type: 'text',
          content: message,
          proposalId: null,
        },
      });
      yield { type: 'done', conversationId };
      return;
    }

    // take a wide-enough sample so rows beyond the first few aren't missed (#stability-audit) —
    // a "table already has data" verdict based on too few rows would wrongly skip real empty rows.
    const { records } = await this.recordService.getRecords(table.id, {
      take: 50,
      fieldKeyType: FieldKeyType.Name,
      ignoreViewQuery: true,
    } as Parameters<RecordService['getRecords']>[1]);

    // Phase 4: real field metadata (options/unique) — the snapshot only has {id, name, type}.
    const fieldMetas = await this.prismaService.field.findMany({
      where: { tableId: table.id, deletedTime: null },
      select: { name: true, type: true, options: true, unique: true },
    });
    // A row is "empty" based on its own content fields only — a `link` field can get
    // auto-populated as the symmetric reverse side of a link created from the OTHER table
    // (e.g. filling mock data on "Clients" sets the matching "Commandes" rows' reverse Client
    // field too), which would otherwise make every row on a fresh table look "already filled"
    // and permanently block mock-data generation on it.
    const linkFieldNames = new Set(fieldMetas.filter((f) => f.type === 'link').map((f) => f.name));
    const isEmptyRecord = (fields: Record<string, unknown>) =>
      Object.entries(fields).every(
        ([name, v]) => linkFieldNames.has(name) || v === null || v === undefined || v === ''
      );
    const emptyRecords = records.filter((r) => isEmptyRecord(r.fields)).slice(0, 3);

    if (emptyRecords.length === 0) {
      const message = `La table "${table.name}" contient déjà des données — aucune ligne n'a été remplacée.`;
      yield { type: 'text_chunk', content: message };
      await this.prismaService.workspaceConversationMessage.create({
        data: {
          conversationId,
          role: 'assistant',
          type: 'text',
          content: message,
          proposalId: null,
        },
      });
      yield { type: 'done', conversationId };
      return;
    }

    const { candidates: linkCandidates, missingTableName } =
      await this.resolveLinkFieldCandidates(fieldMetas);
    if (missingTableName) {
      const message = `La table liée "${missingTableName}" est vide — ajoute d'abord des données dedans avant de générer des données fictives ici.`;
      yield { type: 'text_chunk', content: message };
      await this.prismaService.workspaceConversationMessage.create({
        data: {
          conversationId,
          role: 'assistant',
          type: 'text',
          content: message,
          proposalId: null,
        },
      });
      yield { type: 'done', conversationId };
      return;
    }

    const fieldsShape = Object.fromEntries(
      table.fields.map((f) => {
        const link = linkCandidates[f.name];
        if (link) {
          const idSchema = z.object({ id: z.enum(link.ids as [string, ...string[]]) });
          return [f.name, link.multi ? z.array(idSchema).min(1) : idSchema];
        }
        return [f.name, this.mockValueSchemaForFieldType(f.type)];
      })
    );
    // min(1)/max(N) instead of an exact .length(N) — LLMs don't always honor an exact array
    // length, and a strict schema throws (uncaught here) on the slightest mismatch. The loop
    // below only proposes as many records as actually came back, capped at emptyRecords.length.
    const schema = z.object({
      records: z.array(z.object(fieldsShape)).min(1).max(emptyRecords.length),
    });

    // Phase 4: existing values per `unique` field — a generated row colliding with one of
    // these is dropped rather than proposed (no proposal beats a silently-invalid duplicate).
    const uniqueFieldNames = fieldMetas.filter((f) => f.unique).map((f) => f.name);
    const existingValuesByField = new Map(
      uniqueFieldNames.map((name) => [
        name,
        new Set(
          records
            .filter((r) => !isEmptyRecord(r.fields))
            .map((r) => r.fields[name])
            .filter((v) => v !== null && v !== undefined && v !== '')
        ),
      ])
    );

    const { object } = await generateObject({
      model: modelInstance as Parameters<typeof generateObject>[0]['model'],
      schema,
      prompt:
        `Table "${table.name}" — champs: ${table.fields.map((f) => `${f.name} (${f.type})`).join(', ')}.\n` +
        `Génère exactement ${emptyRecords.length} enregistrement(s) fictif(s) réaliste(s) et cohérent(s) entre eux, ` +
        `en corrélation avec la demande de l'utilisateur : "${ctx.message}".`,
    });

    const generatedCount = Math.min(object.records.length, emptyRecords.length);
    for (let i = 0; i < generatedCount; i++) {
      const fields = object.records[i] as Record<string, unknown>;
      const collidesOnUnique = uniqueFieldNames.some((name) =>
        existingValuesByField.get(name)?.has(fields[name])
      );
      if (collidesOnUnique) continue;
      const proposal = await this.actionProposalService.createProposal({
        action: 'update_record',
        args: { tableId: table.id, recordId: emptyRecords[i].id, fields },
        conversationId,
        preview: { tableName: table.name, fields },
      });
      yield {
        type: 'proposal',
        proposal: {
          proposalId: proposal.proposalId,
          action: proposal.action,
          preview: proposal.preview,
        },
      };
    }

    const summary = `J'ai préparé ${generatedCount} ligne(s) de données fictives pour "${table.name}", en lien avec ta demande.`;
    await this.prismaService.workspaceConversationMessage.create({
      data: { conversationId, role: 'assistant', type: 'text', content: summary, proposalId: null },
    });
    yield { type: 'text_chunk', content: summary };
    yield { type: 'done', conversationId };
  }
}
