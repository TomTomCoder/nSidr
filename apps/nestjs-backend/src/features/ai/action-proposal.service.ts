import { randomUUID } from 'crypto';
import { ModuleRef } from '@nestjs/core';
import {
  Injectable,
  ConflictException,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { FieldKeyType, FieldType, Relationship, ViewType } from '@teable/core';
import { PrismaService } from '@teable/db-main-prisma';
import { BaseNodeResourceType, type ICreateBaseNodeRo } from '@teable/openapi';
import { AI_SERVICE } from '../../shared/tokens/ai.token';
import { AgentService } from '../agent/agent.service';
import { BaseNodeService } from '../base-node/base-node.service';
import { DocLinkService } from '../doc-search/doc-link.service';
import { KnowledgeDocService } from '../doc-search/knowledge-doc.service';
import { FieldOpenApiService } from '../field/open-api/field-open-api.service';
import { RecordOpenApiService } from '../record/open-api/record-open-api.service';
import { ViewOpenApiService } from '../view/open-api/view-open-api.service';
import { WorkflowAiService, WorkflowConfigSchema } from '../workflow/workflow-ai.service';
import { WorkflowService } from '../workflow/workflow.service';

/** AI-generated view config — mirrors AiService.generateViewConfig / IGeneratedViewConfig. */
interface IGeneratedViewConfig {
  type: string;
  name: string;
  sort?: unknown;
  filter?: unknown;
  columnMeta?: unknown;
}
interface IAiViewGenService {
  generateViewConfig(
    baseId: string,
    tableId: string,
    prompt: string,
    modelKey?: string
  ): Promise<IGeneratedViewConfig>;
}

export interface ProposalInput {
  action: string;
  args: Record<string, unknown>;
  conversationId: string;
  preview: Record<string, unknown>;
}

export interface ProposalVo {
  proposalId: string;
  action: string;
  preview: Record<string, unknown>;
  conversationMessageId: string;
}

interface ProposalMetadata {
  proposalId: string;
  action: string;
  args: Record<string, unknown>;
  accepted: boolean;
  acceptedAt: string | null;
  executionFailed?: boolean;
}

@Injectable()
export class ActionProposalService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly baseNodeService: BaseNodeService,
    private readonly recordOpenApiService: RecordOpenApiService,
    private readonly viewOpenApiService: ViewOpenApiService,
    @Inject(AI_SERVICE) private readonly aiService: IAiViewGenService,
    private readonly fieldOpenApiService: FieldOpenApiService,
    private readonly workflowAiService: WorkflowAiService,
    private readonly workflowService: WorkflowService,
    @Inject(forwardRef(() => AgentService))
    private readonly agentService: AgentService,
    @Inject(ModuleRef) private readonly moduleRef: ModuleRef
  ) {}

  /**
   * Create a proposal message in the conversation.
   * Per D-02 and D-03: no write operation is executed here.
   * The write is deferred until acceptProposal() is called.
   */
  async createProposal(input: ProposalInput): Promise<ProposalVo> {
    const proposalId = randomUUID();

    const metadata: ProposalMetadata = {
      proposalId,
      action: input.action,
      args: input.args,
      accepted: false,
      acceptedAt: null,
    };

    const created = await this.prismaService.workspaceConversationMessage.create({
      data: {
        conversationId: input.conversationId,
        role: 'assistant',
        type: 'proposal',
        proposalId,
        content: JSON.stringify(input.preview),
        metadata: metadata as object,
      },
    });

    return {
      proposalId,
      action: input.action,
      preview: input.preview,
      conversationMessageId: created.id,
    };
  }

  /**
   * Accept a proposal by proposalId.
   * Uses findUnique({ where: { proposalId } }) — O(1) via unique DB index.
   * Idempotent: throws ConflictException if already accepted (T-10-04).
   */
  async acceptProposal(
    proposalId: string,
    userId: string
  ): Promise<{ success: boolean; result: unknown }> {
    const message = await this.prismaService.workspaceConversationMessage.findUnique({
      where: { proposalId },
    });

    if (!message) {
      throw new NotFoundException(`Proposal ${proposalId} not found`);
    }

    const metadata = message.metadata as unknown as ProposalMetadata;

    // Idempotency check: allow retry if previous execution failed, block double-accept on success
    if (metadata.accepted === true && !metadata.executionFailed) {
      throw new ConflictException('Proposal already accepted');
    }

    const updatedMetadata: ProposalMetadata = {
      ...metadata,
      accepted: true,
      acceptedAt: metadata.acceptedAt ?? new Date().toISOString(),
      executionFailed: false,
    };

    await this.prismaService.workspaceConversationMessage.update({
      where: { id: message.id },
      data: { metadata: updatedMetadata as object },
    });

    // Resolve baseId if missing — look up via conversationId → spaceId → first base
    const resolvedArgs = { ...metadata.args };
    if (!resolvedArgs.baseId || (metadata.action === 'create_base' && !resolvedArgs.spaceId)) {
      const conversation = await this.prismaService.workspaceConversation.findUnique({
        where: { id: message.conversationId },
        select: { spaceId: true },
      });
      if (conversation?.spaceId) {
        if (!resolvedArgs.spaceId) resolvedArgs.spaceId = conversation.spaceId;
        if (!resolvedArgs.baseId) {
          const firstBase = await this.prismaService.base.findFirst({
            where: { spaceId: conversation.spaceId, deletedTime: null },
            select: { id: true },
            orderBy: { createdTime: 'asc' },
          });
          if (firstBase) resolvedArgs.baseId = firstBase.id;
        }
      }
    }

    try {
      const result = await this.executeAction(metadata.action, resolvedArgs, userId);
      return { success: true, result };
    } catch (err) {
      // Mark execution as failed so Retry is allowed
      await this.prismaService.workspaceConversationMessage.update({
        where: { id: message.id },
        data: { metadata: { ...updatedMetadata, executionFailed: true } as object },
      });
      throw err;
    }
  }

  /**
   * Execute the action after proposal is accepted.
   * Routes to real Teable services: table, dashboard, workflow, base-node.
   */
  private async executeAction(
    action: string,
    args: Record<string, unknown>,
    _userId: string
  ): Promise<unknown> {
    switch (action) {
      case 'create_table': {
        if (!args.baseId) throw new Error('baseId is required for create_table');
        const baseIdForFields = args.baseId as string;
        // G-03 FIX: AI sometimes sends string fields ["Nom", "Email"] instead of objects.
        // Simple field types that can be created without extra options.
        // Formula fields are handled bi-phasedly: non-formula fields first (Phase A, synchronous
        // batch), then formula fields (Phase B, after table exists so real fieldIds are known).
        // {{FieldName}} placeholders in formula expressions are resolved to {{fldXXX}} ids
        // via a post-creation DB read — this is the reason formula was previously excluded.
        // ponytail: url/email/phoneNumber aren't real FieldType values (core's
        // FieldType enum has no entry for them) — keep only types FieldSupplementService
        // actually accepts, everything else downgrades to singleLineText.
        const SAFE_FIELD_TYPES = new Set([
          'singleLineText',
          'longText',
          'number',
          'date',
          'checkbox',
          'singleSelect',
          'multipleSelect',
          'attachment',
          'rating',
        ]);
        interface IRawField {
          name: string;
          type?: string;
          required?: boolean;
          unique?: boolean;
          defaultValue?: string | number | boolean;
          choices?: string[];
          foreignTableName?: string;
          relationship?: string;
          // formula fields only
          expression?: string;
        }
        const relMap: Record<string, Relationship> = {
          manyOne: Relationship.ManyOne,
          oneMany: Relationship.OneMany,
          manyMany: Relationship.ManyMany,
          oneOne: Relationship.OneOne,
        };
        // Resolves a 'link' field's foreignTableName → real foreignTableId, scoped to this base.
        // Returns null when the field isn't a resolvable link (caller falls back to a safe type).
        const resolveLinkOptions = async (f: IRawField) => {
          if (!(f.type === 'link' && f.foreignTableName && f.relationship)) return null;
          const foreignTable = await this.prismaService.tableMeta.findFirst({
            where: { name: f.foreignTableName, baseId: baseIdForFields, deletedTime: null },
            select: { id: true },
          });
          if (!foreignTable) return null;
          return {
            foreignTableId: foreignTable.id,
            relationship: relMap[f.relationship] ?? Relationship.ManyOne,
          };
        };

        const buildField = async (f: IRawField | string) => {
          if (typeof f === 'string') return { name: f, type: 'singleLineText' };
          const name = f.name || 'Field';
          // `required` is accepted in the tool schema but never mapped to `notNull` here —
          // field.service.ts's alterTableAddField throws unconditionally on notNull at field
          // CREATION time (no backfill mechanism for a table with zero or existing rows), for
          // every field type. Discovered via a real E2E run (AI-GENERATION-ROADMAP.md Phase 6
          // verification) — `required` is silently a no-op at creation, not a hard error,
          // since failing the whole table over an unsupported constraint would be worse.
          const common = {
            ...(f.unique ? { unique: true } : {}),
          };

          const linkOptions = await resolveLinkOptions(f);
          if (linkOptions) return { name, type: 'link', options: linkOptions, ...common };

          if ((f.type === 'singleSelect' || f.type === 'multipleSelect') && f.choices?.length) {
            return {
              name,
              type: f.type,
              options: { choices: f.choices.map((choiceName) => ({ name: choiceName })) },
              ...common,
            };
          }

          if (f.type === 'number') {
            return {
              name,
              type: 'number',
              ...(f.defaultValue !== undefined
                ? { options: { defaultValue: f.defaultValue } }
                : {}),
              ...common,
            };
          }

          const safeType = f.type && SAFE_FIELD_TYPES.has(f.type) ? f.type : 'singleLineText';
          return {
            name,
            type: safeType,
            ...(f.defaultValue !== undefined ? { options: { defaultValue: f.defaultValue } } : {}),
            ...common,
          };
        };
        const rawFields = args.fields as Array<IRawField | string> | undefined;
        const rawFieldsArr =
          rawFields && rawFields.length > 0
            ? rawFields
            : ([{ name: 'Name', type: 'singleLineText' }] as IRawField[]);

        // Phase A: non-formula fields (created synchronously in the table's initial batch).
        const nonFormulaRaw = rawFieldsArr.filter(
          (f) => typeof f === 'string' || (f as IRawField).type !== 'formula'
        );
        // Phase B: formula fields (created after table + real fieldIds are known).
        const formulaRaw = rawFieldsArr.filter(
          (f) => typeof f !== 'string' && (f as IRawField).type === 'formula'
        ) as IRawField[];

        const fields = await Promise.all(nonFormulaRaw.map(buildField));

        // G-03 FIX: default table name when AI omits it
        const tableName = (args.name as string | undefined)?.trim() || 'New Table';
        // Use baseNodeService.create so a baseNode entry is created alongside the table
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tableNodeVo = await this.baseNodeService.create(
          args.baseId as string,
          {
            resourceType: BaseNodeResourceType.Table,
            name: tableName,
            fields: fields as any,
            views: [{ name: 'Grid View', type: ViewType.Grid }],
          } as unknown as ICreateBaseNodeRo
        );
        // Move the new table node into the "Tables" folder
        const tablesFolderId = await this.ensureFolderNode(args.baseId as string, 'Tables');
        if (tablesFolderId) {
          await this.baseNodeService
            .move(args.baseId as string, tableNodeVo.id, { parentId: tablesFolderId })
            .catch(() => {});
        }

        // Phase B: formula fields — resolve {{FieldName}} → {{fldXXX}} using real created IDs.
        if (formulaRaw.length > 0) {
          const createdFields = await this.prismaService.field.findMany({
            where: { tableId: tableNodeVo.id, deletedTime: null },
            select: { id: true, name: true },
          });
          const nameToId = new Map(createdFields.map((f) => [f.name, f.id]));
          for (const ff of formulaRaw) {
            if (!ff.expression) continue;
            const resolvedExpr = ff.expression.replace(
              /\{\{([^}]+)\}\}/g,
              (_, fieldName: string) => {
                const fid = nameToId.get(fieldName.trim());
                return fid ? `{{${fid}}}` : `{{${fieldName}}}`;
              }
            );
            await this.fieldOpenApiService
              .createField(tableNodeVo.id, {
                name: ff.name,
                type: 'formula',
                options: { expression: resolvedExpr },
              } as Parameters<typeof this.fieldOpenApiService.createField>[1])
              .catch(() => {}); // one failing formula shouldn't abort the whole table creation
          }
        }

        return tableNodeVo;
      }

      case 'create_folder': {
        if (!args.baseId) {
          return {
            status: 'skipped',
            reason:
              'baseId is required to create a folder inside a base — ask the user which base to use',
          };
        }
        const folderName = (args.name as string | undefined)?.trim() || 'New Folder';
        return await this.baseNodeService.create(args.baseId as string, {
          resourceType: BaseNodeResourceType.Folder,
          name: folderName,
        });
      }

      case 'create_app_interface': {
        if (!args.baseId) {
          return {
            status: 'skipped',
            reason: 'baseId is required to create a dashboard — ask the user which base to use',
          };
        }
        const dashboardName = (args.name as string | undefined)?.trim() || 'New Dashboard';
        const dashboardNodeVo = await this.baseNodeService.create(args.baseId as string, {
          resourceType: BaseNodeResourceType.App,
          name: dashboardName,
        });
        // Move into "Apps" folder
        const appsFolderId = await this.ensureFolderNode(args.baseId as string, 'Apps');
        if (appsFolderId) {
          await this.baseNodeService
            .move(args.baseId as string, dashboardNodeVo.id, { parentId: appsFolderId })
            .catch(() => {});
        }

        // Phase 5: declarative modules — resolve each tableName to a real tableId and persist
        // a config-driven app.content instead of streaming free-form generated code.
        const rawModules = args.modules as
          | Array<{ type: string; tableName: string; title?: string; fieldNames?: string[] }>
          | undefined;
        if (rawModules?.length) {
          const resolvedModules = await Promise.all(
            rawModules.map(async (m) => {
              const table = await this.prismaService.tableMeta.findFirst({
                where: { name: m.tableName, baseId: args.baseId as string, deletedTime: null },
                select: { id: true },
              });
              // For relation-table modules, resolve the link field name to its real id so the
              // AppBuilderPage renderer can filter linked records without a name-lookup at runtime.
              let linkFieldId: string | null = null;
              if (m.type === 'relation-table' && m.linkFieldName && table?.id) {
                const linkField = await this.prismaService.field.findFirst({
                  where: {
                    tableId: table.id,
                    name: m.linkFieldName,
                    type: 'link',
                    deletedTime: null,
                  },
                  select: { id: true },
                });
                linkFieldId = linkField?.id ?? null;
              }
              return {
                type: m.type,
                tableId: table?.id ?? null,
                tableName: m.tableName,
                title: m.title,
                fieldNames: m.fieldNames,
                ...(m.type === 'relation-table'
                  ? { linkFieldName: m.linkFieldName, linkFieldId }
                  : {}),
              };
            })
          );
          // Real App.id is resourceId, not the BaseNode wrapper's .id — the sidebar/router
          // (BaseNodeTree.tsx) always navigates via node.resourceId, and baseNodeService.create
          // already auto-provisions an empty app_builder row at that id, so this upsert updates
          // it rather than creating a stray duplicate. Confirmed via a real E2E run: writing to
          // .id instead left the page the user actually reaches ("Aucune app générée") empty.
          await this.prismaService.app.upsert({
            where: { id: dashboardNodeVo.resourceId },
            update: { content: { type: 'declarative', modules: resolvedModules } as object },
            create: {
              id: dashboardNodeVo.resourceId,
              name: dashboardName,
              baseId: args.baseId as string,
              content: { type: 'declarative', modules: resolvedModules } as object,
              createdBy: _userId,
            },
          });
          return { ...dashboardNodeVo, declarative: true };
        }

        return {
          ...dashboardNodeVo,
          shouldStream: true,
          appId: dashboardNodeVo.id,
          prompt:
            (args.description as string) ||
            (args.name as string) ||
            'Generate a complete React app for this interface',
          baseId: args.baseId as string,
        };
      }

      case 'create_automation': {
        if (!args.baseId) {
          return {
            status: 'skipped',
            reason:
              'baseId is required to create an automation workflow — ask the user which base to use',
          };
        }
        const automationName = (args.name as string | undefined)?.trim() || 'Untitled Automation';
        const workflowNodeVo = await this.baseNodeService.create(args.baseId as string, {
          resourceType: BaseNodeResourceType.Workflow,
          name: automationName,
        });
        const automationsFolderId = await this.ensureFolderNode(
          args.baseId as string,
          'Automations'
        );
        if (automationsFolderId) {
          await this.baseNodeService
            .move(args.baseId as string, workflowNodeVo.id, { parentId: automationsFolderId })
            .catch(() => {});
        }

        // Structured trigger+steps (Phase 1): validate against the real workflow-engine
        // schema and wire it directly — no LLM round-trip, no silent failure.
        const structuredTrigger = args.trigger as Record<string, unknown> | undefined;
        const structuredSteps = args.steps as Record<string, unknown>[] | undefined;
        const description = (args.description as string | undefined)?.trim();

        if (structuredTrigger && structuredSteps?.length) {
          const parsed = WorkflowConfigSchema.safeParse({
            name: automationName,
            trigger: structuredTrigger,
            steps: structuredSteps,
          });
          if (!parsed.success) {
            return {
              status: 'skipped',
              reason: `Configuration d'automatisation invalide: ${parsed.error.issues[0]?.message ?? 'erreur inconnue'}`,
            };
          }
          // updateWorkflow/updateSchedule operate on the real Workflow row, not the BaseNode
          // wrapper — workflowNodeVo.id is the BaseNode id; the Workflow's own id is
          // resourceId. Passing .id here is a silent no-op (Prisma "record not found" caught
          // below in the free-text path) — confirmed via a real E2E run, not previously caught
          // by mocked tests since they never exercised the real Prisma where-clause.
          await this.workflowService.updateWorkflow(
            args.baseId as string,
            workflowNodeVo.resourceId,
            {
              name: parsed.data.name,
              config: parsed.data as unknown as object,
            }
          );
          await this.workflowService.updateSchedule(
            args.baseId as string,
            workflowNodeVo.resourceId
          );
          return workflowNodeVo;
        }

        // Free-text fallback (naming/enrichment only, per Phase 1 plan) — still goes
        // through the LLM-backed generator, but failure is now reported, not swallowed.
        if (description) {
          try {
            const generated = await this.workflowAiService.generateWorkflowFromPrompt(
              args.baseId as string,
              `Workflow name: ${automationName}. ${description}`
            );
            await this.workflowService.updateWorkflow(
              args.baseId as string,
              workflowNodeVo.resourceId,
              {
                name: generated.name,
                config: generated as unknown as object,
              }
            );
            await this.workflowService.updateSchedule(
              args.baseId as string,
              workflowNodeVo.resourceId
            );
          } catch (err) {
            return {
              status: 'partial',
              reason: `Automatisation créée mais la génération du déclencheur/des étapes a échoué : ${(err as Error).message}. Configurez-la manuellement.`,
              workflow: workflowNodeVo,
            };
          }
        }
        return workflowNodeVo;
      }

      case 'create_agent': {
        if (!args.baseId) {
          return {
            status: 'skipped',
            reason:
              'baseId is required to create an agent — ask the user which base the agent belongs to',
          };
        }
        const agent = await this.agentService.create(
          {
            baseId: args.baseId as string,
            name: (args.name as string | undefined)?.trim() || 'Untitled Agent',
            description: args.description as string | undefined,
            instructions: args.instructions as string | undefined,
            modelKey: args.modelKey as string | undefined,
            isPublic: args.isPublic as boolean | undefined,
            planningEnabled: args.planningEnabled as boolean | undefined,
            reflectionEnabled: args.reflectionEnabled as boolean | undefined,
            maxReflections: args.maxReflections as number | undefined,
            maxIterations: args.maxIterations as number | undefined,
            respondToMentions: args.respondToMentions as boolean | undefined,
            allowDirectMessage: args.allowDirectMessage as boolean | undefined,
            memoryEnabled: args.memoryEnabled as boolean | undefined,
          },
          _userId
        );

        // Enable the requested tools — Zod already restricted these to real tool names.
        const tools = args.tools as string[] | undefined;
        if (tools?.length) {
          await Promise.all(
            tools.map((toolName) =>
              this.prismaService.agentTool.upsert({
                where: { agentId_toolName: { agentId: agent.id, toolName } },
                update: { isEnabled: true },
                create: { agentId: agent.id, toolName, isEnabled: true },
              })
            )
          );
        }

        // MCP servers — create AgentMcpServer rows if the user explicitly named any.
        const mcpServerUrls = args.mcpServerUrls as
          | Array<{ name: string; url: string }>
          | undefined;
        if (mcpServerUrls?.length) {
          await Promise.all(
            mcpServerUrls.map((srv) =>
              this.prismaService.agentMcpServer.upsert({
                where: { agentId_url: { agentId: agent.id, url: srv.url } },
                update: { name: srv.name, enabled: true },
                create: {
                  agentId: agent.id,
                  name: srv.name,
                  url: srv.url,
                  transport: 'streamable-http',
                  enabled: true,
                },
              })
            )
          );
        }

        // Scheduling — only set up when explicitly requested (cron-triggered agent).
        const scheduling = args.scheduling as { cron?: string } | undefined;
        if (scheduling?.cron) {
          await this.prismaService.agentTrigger.create({
            data: {
              agentId: agent.id,
              triggerType: 'cron',
              config: { cron: scheduling.cron },
              isActive: true,
            },
          });
        }
        // Register in base-node tree so the agent appears in the sidebar
        let agentNodeVo;
        try {
          agentNodeVo = await this.baseNodeService.create(
            args.baseId as string,
            {
              name: agent.name,
              resourceType: BaseNodeResourceType.Agent,
              resourceId: agent.id,
            } as never
          );
        } catch (nodeErr) {
          console.error(
            `[create_agent] baseNodeService.create failed: ${(nodeErr as Error).message}`
          );
          return { agentId: agent.id, name: agent.name };
        }
        const agentsFolderId = await this.ensureFolderNode(args.baseId as string, 'Agents');
        if (agentsFolderId && agentNodeVo) {
          await this.baseNodeService.move(args.baseId as string, agentNodeVo.id, {
            parentId: agentsFolderId,
          });
        }
        return { agentId: agent.id, name: agent.name };
      }

      case 'create_base': {
        const spaceName = args.name as string | undefined;
        const base = await this.prismaService.base.create({
          data: {
            name: spaceName ?? 'Untitled Base',
            spaceId: args.spaceId as string,
            createdBy: 'agent',
            lastModifiedBy: 'agent',
            order: 0,
          },
          select: { id: true, name: true },
        });
        return { baseId: base.id, name: base.name };
      }

      case 'create_field': {
        const tableId = args.tableId as string | undefined;
        if (!tableId) throw new Error('tableId is required for create_field');
        return await this.fieldOpenApiService.createField(tableId, {
          name: args.name as string,
          type: (args.type as FieldType) ?? FieldType.SingleLineText,
          ...(args.options ? { options: args.options as Record<string, unknown> } : {}),
        } as Parameters<typeof this.fieldOpenApiService.createField>[1]);
      }

      case 'create_view': {
        // Resolve tableId from tableName + baseId if tableId not provided (mirrors create_record)
        let tableId = (args.tableId as string | undefined)?.trim();
        if (!tableId && args.tableName) {
          const found = await this.prismaService.tableMeta.findFirst({
            where: {
              name: args.tableName as string,
              ...(args.baseId ? { baseId: args.baseId as string } : {}),
              deletedTime: null,
            },
            select: { id: true },
          });
          if (found) tableId = found.id;
        }
        if (!tableId) throw new Error('tableId is required for create_view (or provide tableName)');
        // Maps an AI-supplied view-type string → the 6 native ViewTypes the
        // frontend "+" menu offers (see AddView.tsx). "ai" is NOT a ViewType —
        // it mirrors the menu's "Générer avec l'IA": ask AiService to design a
        // native view (type + filter/sort/columnMeta) from a natural-language prompt.
        const VIEW_TYPE_MAP: Record<string, ViewType> = {
          grid: ViewType.Grid,
          gallery: ViewType.Gallery,
          kanban: ViewType.Kanban,
          calendar: ViewType.Calendar,
          gantt: ViewType.Gantt,
          form: ViewType.Form,
        };
        const rawType = (args.type as string | undefined)?.toLowerCase().trim() ?? 'grid';
        const userName = (args.name as string | undefined)?.trim();

        if (rawType === 'ai') {
          const prompt = (args.prompt as string | undefined)?.trim();
          if (!prompt) {
            return {
              status: 'skipped',
              reason:
                'An AI view needs a "prompt" describing what to show (e.g. "tâches urgentes triées par échéance"). Ask the user and retry.',
            };
          }
          const baseId = args.baseId as string | undefined;
          if (!baseId) throw new Error('baseId is required to generate an AI view');
          const config = await this.aiService.generateViewConfig(baseId, tableId, prompt);
          const aiType = VIEW_TYPE_MAP[config.type?.toLowerCase()] ?? ViewType.Grid;
          return await this.viewOpenApiService.createView(tableId, {
            type: aiType,
            name: userName || config.name || 'Vue IA',
            ...(config.sort ? { sort: config.sort } : {}),
            ...(config.filter ? { filter: config.filter } : {}),
            ...(config.columnMeta ? { columnMeta: config.columnMeta } : {}),
          } as Parameters<typeof this.viewOpenApiService.createView>[1]);
        }

        const type = VIEW_TYPE_MAP[rawType];
        if (!type) {
          return {
            status: 'skipped',
            reason: `Unknown view type "${rawType}". Use one of: grid, gallery, kanban, calendar, gantt, form, ai.`,
          };
        }
        return await this.viewOpenApiService.createView(tableId, {
          type,
          ...(userName ? { name: userName } : {}),
        } as Parameters<typeof this.viewOpenApiService.createView>[1]);
      }

      case 'link_tables': {
        // Resolve sourceTableId and targetTableId from names within the base
        const baseId = args.baseId as string | undefined;
        const resolveTable = async (id?: string, name?: string) => {
          if (id) return id;
          const found = await this.prismaService.tableMeta.findFirst({
            where: { name: name as string, ...(baseId ? { baseId } : {}), deletedTime: null },
            select: { id: true },
          });
          if (!found) throw new Error(`Table not found: ${name as string}`);
          return found.id;
        };
        const sourceTableId = await resolveTable(
          args.sourceTableId as string | undefined,
          args.sourceTableName as string | undefined
        );
        const targetTableId = await resolveTable(
          args.targetTableId as string | undefined,
          args.targetTableName as string | undefined
        );
        const rel = (args.relationship as string | undefined) ?? 'manyOne';
        const relMap: Record<string, Relationship> = {
          manyOne: Relationship.ManyOne,
          oneMany: Relationship.OneMany,
          manyMany: Relationship.ManyMany,
          oneOne: Relationship.OneOne,
        };
        const fieldVo = await this.fieldOpenApiService.createField(sourceTableId, {
          name:
            (args.fieldName as string | undefined) ?? (args.targetTableName as string) ?? 'Link',
          type: FieldType.Link,
          options: {
            foreignTableId: targetTableId,
            relationship: relMap[rel] ?? Relationship.ManyOne,
          },
        } as Parameters<typeof this.fieldOpenApiService.createField>[1]);
        return { linked: true, sourceTableId, targetTableId, fieldId: fieldVo.id };
      }

      case 'delete_field': {
        const tableId = args.tableId as string | undefined;
        const fieldId = args.fieldId as string | undefined;
        if (!tableId || !fieldId)
          throw new Error('tableId and fieldId are required for delete_field');
        await this.fieldOpenApiService.deleteField(tableId, fieldId);
        return { deleted: true, fieldId };
      }

      case 'rename_table': {
        const tableId = args.tableId as string | undefined;
        const name = args.name as string | undefined;
        if (!tableId || !name) throw new Error('tableId and name are required for rename_table');
        await this.prismaService.tableMeta.update({
          where: { id: tableId },
          data: { name },
        });
        return { updated: true, tableId, name };
      }

      case 'rename_field': {
        const tableId = args.tableId as string | undefined;
        const fieldId = args.fieldId as string | undefined;
        const name = args.name as string | undefined;
        if (!tableId || !fieldId || !name)
          throw new Error('tableId, fieldId, and name are required for rename_field');
        await this.fieldOpenApiService.updateField(tableId, fieldId, { name } as Parameters<
          typeof this.fieldOpenApiService.updateField
        >[2]);
        return { updated: true, fieldId, name };
      }

      case 'create_record': {
        // Resolve tableId from tableName + baseId if tableId not provided
        let tableId = (args.tableId as string | undefined)?.trim();
        if (!tableId && args.tableName) {
          const tableName = args.tableName as string;
          const baseId = args.baseId as string | undefined;
          const found = await this.prismaService.tableMeta.findFirst({
            where: { name: tableName, ...(baseId ? { baseId } : {}), deletedTime: null },
            select: { id: true },
          });
          if (found) tableId = found.id;
        }
        if (!tableId)
          throw new Error('tableId is required for create_record (or provide tableName)');
        const fieldValues = (args.fields as Record<string, unknown> | undefined) ?? {};
        return await this.recordOpenApiService.createRecords(tableId, {
          fieldKeyType: FieldKeyType.Name,
          typecast: true, // auto-creates select options if they don't exist yet
          records: [{ fields: fieldValues }],
        });
      }

      case 'update_record': {
        let tableId = (args.tableId as string | undefined)?.trim();
        if (!tableId && args.tableName) {
          const found = await this.prismaService.tableMeta.findFirst({
            where: { name: args.tableName as string, deletedTime: null },
            select: { id: true },
          });
          if (found) tableId = found.id;
        }
        const recordId = args.recordId as string | undefined;
        if (!tableId || !recordId)
          throw new Error('tableId and recordId are required for update_record');
        const fields = (args.fields as Record<string, unknown> | undefined) ?? {};
        // typecast: true, matching create_record above — without it, a generated singleSelect
        // value not already in the field's choices throws (e.g. mock-data fill-in proposing a
        // new status label), failing the whole update instead of auto-creating the choice.
        await this.recordOpenApiService.updateRecord(tableId, recordId, {
          fieldKeyType: FieldKeyType.Name,
          typecast: true,
          record: { fields },
        });
        return { updated: true, recordId, tableId };
      }

      case 'generate_app_code': {
        const appId = args.appId as string | undefined;
        const prompt = args.prompt as string | undefined;
        const baseId = args.baseId as string | undefined;
        if (!appId || !baseId) {
          return {
            status: 'skipped',
            reason: 'appId and baseId are required for generate_app_code',
          };
        }
        return { shouldStream: true, appId, prompt: prompt ?? '', baseId };
      }

      // P1-8: knowledge doc write actions. spaceId is resolved from the (activeBase-derived) baseId.
      case 'create_knowledge_doc': {
        const spaceId = await this.resolveSpaceIdFromArgs(args);
        if (!spaceId) {
          return { status: 'skipped', reason: 'Could not resolve the space for this doc' };
        }
        return this.moduleRef.get(KnowledgeDocService, { strict: false }).createDoc({
          spaceId,
          title: (args.title as string | undefined)?.trim() || 'Untitled',
          rawContent: args.rawContent as string,
          folderId: args.folderId as string | undefined,
          createdBy: _userId,
        });
      }

      case 'update_knowledge_doc': {
        const spaceId = await this.resolveSpaceIdFromArgs(args);
        if (!spaceId) {
          return { status: 'skipped', reason: 'Could not resolve the space for this doc' };
        }
        return this.moduleRef.get(KnowledgeDocService, { strict: false }).updateDoc({
          docId: args.docId as string,
          rawContent: args.rawContent as string,
          callerSpaceId: spaceId,
          callerId: _userId,
        });
      }

      case 'link_docs': {
        const spaceId = await this.resolveSpaceIdFromArgs(args);
        if (!spaceId) {
          return { status: 'skipped', reason: 'Could not resolve the space for these docs' };
        }
        return this.moduleRef.get(DocLinkService, { strict: false }).linkDocs({
          fromDocId: args.fromDocId as string,
          toDocId: args.toDocId as string,
          label: args.label as string | undefined,
          callerSpaceId: spaceId,
          callerId: _userId,
        });
      }

      default:
        throw new Error(`Action ${action} is not implemented`);
    }
  }

  /** Resolve the spaceId for a doc action from its baseId (base → space FK). */
  private async resolveSpaceIdFromArgs(
    args: Record<string, unknown>
  ): Promise<string | undefined> {
    if (args.spaceId) return args.spaceId as string;
    const baseId = args.baseId as string | undefined;
    if (!baseId) return undefined;
    const base = await this.prismaService.base.findUnique({
      where: { id: baseId },
      select: { spaceId: true },
    });
    return base?.spaceId;
  }

  /**
   * Find or create a folder node with the given name in the base.
   * Returns the baseNode.id (nodeId) of the folder, or null on failure.
   */
  private async ensureFolderNode(baseId: string, folderName: string): Promise<string | null> {
    try {
      // Check if a folder with this name already exists
      const existingFolder = await this.prismaService.baseNodeFolder.findFirst({
        where: { baseId, name: folderName },
      });
      if (existingFolder) {
        const node = await this.prismaService.baseNode.findFirst({
          where: {
            baseId,
            resourceId: existingFolder.id,
            resourceType: BaseNodeResourceType.Folder,
          },
          select: { id: true },
        });
        return node?.id ?? null;
      }
      // Create a new folder node
      const nodeVo = await this.baseNodeService.create(baseId, {
        resourceType: BaseNodeResourceType.Folder,
        name: folderName,
      });
      return nodeVo.id;
    } catch {
      return null;
    }
  }
}
