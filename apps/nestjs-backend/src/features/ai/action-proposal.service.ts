import {
  Injectable,
  ConflictException,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '@teable/db-main-prisma';
import { FieldKeyType, FieldType, Relationship, ViewType } from '@teable/core';
import { BaseNodeResourceType, type ICreateBaseNodeRo } from '@teable/openapi';
import { randomUUID } from 'crypto';
import { FieldOpenApiService } from '../field/open-api/field-open-api.service';
import { BaseNodeService } from '../base-node/base-node.service';
import { RecordOpenApiService } from '../record/open-api/record-open-api.service';
import { WorkflowAiService } from '../workflow/workflow-ai.service';
import { WorkflowService } from '../workflow/workflow.service';
import { AgentService } from '../agent/agent.service';

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
    private readonly fieldOpenApiService: FieldOpenApiService,
    private readonly workflowAiService: WorkflowAiService,
    private readonly workflowService: WorkflowService,
    @Inject(forwardRef(() => AgentService))
    private readonly agentService: AgentService
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
    let resolvedArgs = { ...metadata.args };
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
        // G-03 FIX: AI sometimes sends string fields ["Nom", "Email"] instead of [{name, type}] objects.
        // Coerce both forms to the expected shape.
        // Simple field types that can be created without extra options.
        // Complex types (link, formula, rollup, lookup) are downgraded to singleLineText
        // because they require additional configuration we don't have at proposal time.
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
          'url',
          'email',
          'phoneNumber',
        ]);
        const rawFields = args.fields as
          | Array<{ name: string; type?: string } | string>
          | undefined;
        const fields =
          rawFields && rawFields.length > 0
            ? rawFields.map((f) => {
                const rawName = typeof f === 'string' ? f : f.name ?? 'Field';
                const rawType =
                  typeof f === 'string' ? 'singleLineText' : f.type || 'singleLineText';
                const safeType = SAFE_FIELD_TYPES.has(rawType) ? rawType : 'singleLineText';
                return { name: rawName, type: safeType as unknown };
              })
            : [{ name: 'Name', type: 'singleLineText' as unknown }];
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
        return dashboardNodeVo;
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

        // Wire the empty workflow with AI-generated trigger+steps when the LLM
        // gave us a description. Skip silently on AI failure — empty shell
        // already exists and the user can edit it manually.
        const trigger = (args.trigger as string | undefined)?.trim();
        const action = (args.action as string | undefined)?.trim();
        if (trigger || action) {
          const composedPrompt = [
            `Workflow name: ${automationName}.`,
            trigger ? `Trigger: ${trigger}.` : '',
            action ? `Action: ${action}.` : '',
          ]
            .filter(Boolean)
            .join(' ');
          try {
            const generated = await this.workflowAiService.generateWorkflowFromPrompt(
              args.baseId as string,
              composedPrompt
            );
            await this.workflowService.updateWorkflow(args.baseId as string, workflowNodeVo.id, {
              name: generated.name,
              config: generated as unknown as object,
            });
            // Register cron for scheduled triggers; updateSchedule is idempotent
            // and a no-op for non-scheduled triggers.
            await this.workflowService.updateSchedule(args.baseId as string, workflowNodeVo.id);
          } catch {
            // ponytail: keep the empty workflow on AI failure; user can fill it.
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
          },
          _userId
        );
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
        const fieldVo = await this.fieldOpenApiService.createField(tableId, {
          name: args.name as string,
          type: (args.type as FieldType) ?? FieldType.SingleLineText,
          ...(args.options ? { options: args.options as Record<string, unknown> } : {}),
        } as Parameters<typeof this.fieldOpenApiService.createField>[1]);
        return fieldVo;
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
        await this.recordOpenApiService.updateRecord(tableId, recordId, {
          fieldKeyType: FieldKeyType.Name,
          record: { fields },
        });
        return { updated: true, recordId, tableId };
      }

      default:
        throw new Error(`Action ${action} is not implemented`);
    }
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
