import { Inject, Injectable } from '@nestjs/common';
import { fakerFR as faker } from '@faker-js/faker';
import { HttpErrorCode } from '@teable/core';
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
import { ActionProposalService } from './action-proposal.service';
import { WorkspaceStateService } from './workspace-state.service';

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
}

// Write tool names — these go through proposal gating
const WRITE_TOOLS = new Set([
  'create_table',
  'create_base',
  'create_field',
  'create_view',
  'link_tables',
  'delete_field',
  'rename_table',
  'rename_field',
  'create_record',
  'update_record',
  'create_folder',
  'create_app_interface',
  'create_automation',
  'create_agent',
  'generate_app_code',
]);

@Injectable()
export class UnifiedAiService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly workspaceStateService: WorkspaceStateService,
    private readonly actionProposalService: ActionProposalService,
    @Inject(AI_SERVICE) private readonly aiService: IAiService
  ) {}

  async *chat(ctx: UnifiedChatContext): AsyncGenerator<UnifiedChatEvent> {
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

    // Step 2: Snapshot — called once (D-04)
    const snapshot = await this.workspaceStateService.getSnapshot(ctx.spaceId);

    // Step 3: Build system prompt — truncated to 8000 chars (T-10-02 mitigation)
    // Build a compact base summary first so IDs are always visible even after truncation
    const baseSummary = snapshot.bases
      .map(
        (b) =>
          `  - "${b.name}" (baseId: ${b.id}) — tables: ${b.tables.map((t) => `"${t.name}" (tableId: ${t.id})`).join(', ') || 'none'}`
      )
      .join('\n');
    // Resolve active base info for the system prompt
    const activeBase = ctx.activeBaseId
      ? snapshot.bases.find((b) => b.id === ctx.activeBaseId)
      : undefined;
    const activeBaseHint = activeBase
      ? `\n⚠️ ACTIVE BASE (user is currently viewing this base — USE THIS for all write operations unless the user says otherwise):\n  "${activeBase.name}" (baseId: ${activeBase.id})\n`
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
    const systemPrompt = rawPrompt.slice(0, 12000);

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
    const proxyBaseId = snapshot.bases[0]?.id;
    if (!proxyBaseId) {
      yield { type: 'error', content: 'No bases found in this space. Create a base first.' };
      return;
    }
    const aiConfig = await this.aiService.getAIConfig(proxyBaseId);
    const resolvedModelKey = ctx.modelKey ?? aiConfig.chatModel?.lg;
    if (!resolvedModelKey) {
      yield {
        type: 'error',
        content: 'No AI model configured. Please configure an AI provider in space settings.',
      };
      return;
    }
    const modelInstance = await this.aiService.getModelInstance(
      resolvedModelKey,
      aiConfig.llmProviders
    );

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
        description: 'Query records in a table by tableId.',
        parameters: z.object({
          tableId: z.string().describe('The ID of the table to query'),
          query: z.string().optional().describe('Search query string'),
        }),
        execute: async () => [],
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
                  .string()
                  .describe(
                    'Field type: singleLineText | longText | number | date | checkbox | singleSelect | multipleSelect | attachment'
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
        'Create a new App (no-code app builder) inside a base.',
        z.object({
          name: z.string(),
          baseId: z.string().optional().describe('The base (database) ID — preferred if known'),
          baseName: z
            .string()
            .optional()
            .describe('The base name — used to resolve baseId if ID is not known'),
          tableId: z.string().optional(),
        })
      ),
      create_automation: buildWriteTool(
        'create_automation',
        'Create a new automation (trigger + action) for a base.',
        z.object({
          name: z.string(),
          trigger: z.string(),
          action: z.string(),
          baseId: z.string().optional().describe('The base (database) ID — preferred if known'),
          baseName: z
            .string()
            .optional()
            .describe('The base name — used to resolve baseId if ID is not known'),
        })
      ),
      create_agent: buildWriteTool(
        'create_agent',
        'Create a new AI agent for tasks that cannot be expressed as a deterministic automation (e.g. natural-language triage, multi-step reasoning, content drafting). The agent runs with ReAct + planner + memory.',
        z.object({
          name: z.string().describe('Agent name'),
          description: z.string().optional().describe('Short purpose summary'),
          instructions: z
            .string()
            .describe('System instructions / role prompt that the agent will follow at runtime'),
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

    const rawTools = { ...readTools, ...writeTools };

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

    // Step 8.5: Auto-propose mock records + app interface for newly created tables.
    // We do this programmatically instead of relying on AI multi-step tool calls.
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
          conversationId: conversation.id,
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
      if (autoTableProposals.length === 1) {
        const appName = `App ${tableInfo.tableName}`;
        const appProposal = await this.actionProposalService.createProposal({
          action: 'create_app_interface',
          args: { name: appName, baseId: tableInfo.baseId },
          conversationId: conversation.id,
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

    // Step 8.6: Auto-propose link_tables when:
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
        conversationId: conversation.id,
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
    if (autoTableProposals.length > 1) {
      const tableNames = autoTableProposals.map((t) => t.tableName).join(' & ');
      const crmAppName = `App CRM — ${tableNames}`;
      const baseId = autoTableProposals[0].baseId;
      const crmAppProposal = await this.actionProposalService.createProposal({
        action: 'create_app_interface',
        args: { name: crmAppName, baseId },
        conversationId: conversation.id,
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
        // G-03 FIX: normalise fields — AI sometimes sends strings instead of {name, type} objects
        const rawFields = args.fields as
          | Array<{ name: string; type?: string } | string>
          | undefined;
        const normalisedFields = (rawFields ?? []).map((f) =>
          typeof f === 'string'
            ? { name: f, type: 'singleLineText' }
            : { name: f.name, type: f.type ?? 'singleLineText' }
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
        return { name: args.name };
      case 'create_automation':
        return { name: args.name, trigger: args.trigger, action: args.action };
      case 'create_agent':
        return { name: args.name, description: args.description };
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
}
