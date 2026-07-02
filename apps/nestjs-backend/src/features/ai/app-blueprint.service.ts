import { Inject, Injectable } from '@nestjs/common';
import { FieldKeyType } from '@teable/core';
import { PrismaService } from '@teable/db-main-prisma';
import type { LLMProvider } from '@teable/openapi';
import { generateObject } from 'ai';
import { z } from 'zod';
import { AI_SERVICE } from '../../shared/tokens/ai.token';
import { RecordService } from '../record/record.service';
import { SettingService } from '../setting/setting.service';
import { ActionProposalService } from './action-proposal.service';
import { AGENT_TOOL_NAMES } from './unified-ai.service';

// Type for AiService (avoid circular import) — mirrors unified-ai.service.ts's IAiService.
interface IAiService {
  getAIConfig(
    baseId: string
  ): Promise<{ llmProviders: LLMProvider[]; chatModel?: { lg?: string; sm?: string } }>;
  getModelInstance(modelKey: string, llmProviders: unknown): Promise<unknown>;
}

export interface FullAppEvent {
  type: 'phase' | 'proposal' | 'error' | 'done' | 'awaiting_acceptance' | 'report';
  phase?: 'analysis' | 'blueprint' | 'tables' | 'subgenerators' | 'agents' | 'mock_data' | 'report';
  status?: 'start' | 'done';
  data?: unknown;
  proposal?: { proposalId: string; action: string; preview: unknown };
  /** Which Phase 6.2 sub-generator an 'error' event came from ('interface' | 'automation') */
  generator?: string;
  /** Which run stage an 'awaiting_acceptance' event is gated on — see IFullAppRunState */
  stage?: FullAppStage;
  content?: string;
}

export type FullAppStage = 'tables' | 'subgenerators' | 'agents' | 'mock_data' | 'done';

// Persisted as a WorkspaceConversationMessage(type: 'full_app_run').metadata — no schema
// migration needed, reuses the same flexible storage proposals already use. One run per
// conversationId (full-app's `conversationId` doubles as the run id).
export interface IFullAppRunState {
  stage: FullAppStage;
  baseId: string;
  prompt: string;
  modelKey: string;
  blueprint: IAppBlueprint;
  tableProposalIds: string[];
  interfaceProposalId?: string;
  automationProposalId?: string;
  agentProposalIds?: string[];
  mockDataProposalIds?: string[];
}

export interface FullAppContext {
  spaceId: string;
  userId: string;
  baseId: string;
  prompt: string;
  modelKey: string;
  conversationId: string;
}

const analysisSchema = z.object({
  appName: z.string(),
  description: z.string(),
  domain: z.string(),
  businessProcesses: z.array(z.string()),
  targetUsers: z.array(z.string()),
  dataNeeds: z.array(z.string()),
  automationNeeds: z.array(z.string()),
  aiNeeds: z.array(z.string()),
});
export type IAppAnalysis = z.infer<typeof analysisSchema>;

// Field shape mirrors the real create_table tool schema (Phase 3) — same enum, same
// constraints — so blueprint-generated entities map onto exactly what the table-creation
// path already validates and supports. No relations here yet: see blueprintSchema below.
const blueprintFieldSchema = z.object({
  name: z.string(),
  type: z.enum([
    'singleLineText',
    'longText',
    'number',
    'date',
    'checkbox',
    'singleSelect',
    'multipleSelect',
    'attachment',
    'rating',
  ]),
  required: z.boolean().optional(),
  unique: z.boolean().optional(),
  choices: z.array(z.string()).optional(),
});

const blueprintSchema = z.object({
  entities: z
    .array(
      z.object({
        name: z.string().describe('Table name'),
        fields: z.array(blueprintFieldSchema).min(1),
      })
    )
    .min(1)
    .max(10),
});
export type IAppBlueprint = z.infer<typeof blueprintSchema>;

// Mirrors create_app_interface's declarative `modules` shape (Phase 5) — tableName resolved
// to a real tableId only at proposal-accept time, so this is safe to generate even though the
// blueprint's tables are themselves still pending proposals at this point.
// 'relation-table' is a cross-table navigation module: it renders the records of `tableName`
// that are linked to the selected record in another table via `linkFieldName` (the name of a
// `link` field on `tableName`). This enables parent→children navigation (e.g. Client → Commandes)
// without any extra DB column — the link field is already part of the blueprint schema.
const interfaceProposalSchema = z.object({
  title: z.string(),
  modules: z
    .array(
      z.object({
        type: z.enum(['data-table', 'form', 'detail-view', 'relation-table']),
        tableName: z.string(),
        title: z.string().optional(),
        // Required when type='relation-table': the name of the link field on tableName that
        // establishes the relation (e.g. 'Client' on the Commandes table).
        linkFieldName: z.string().optional(),
      })
    )
    .min(1),
});

// Free-text only (Phase 1's naming/enrichment fallback) — NOT structured trigger/steps.
// A structured automation step needs a real tableId in its config (WorkflowStepSchema), which
// doesn't exist yet for tables that are still pending proposals. Promising a structured
// automation here would mean baking in a tableId that may never resolve to a real table.
const automationProposalSchema = z.object({
  name: z.string(),
  description: z.string().describe('One clear sentence describing trigger + action'),
});

// Mirrors create_agent's real schema — tools restricted to the real, executable
// tool-name enum, never an invented one. Capability flags mirror the Phase 2 toggles
// added to CreateAgentDto/AgentService (respondToMentions/allowDirectMessage/memoryEnabled).
const agentProposalSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  instructions: z.string(),
  tools: z.array(z.enum(AGENT_TOOL_NAMES)).optional(),
  respondToMentions: z.boolean().optional(),
  allowDirectMessage: z.boolean().optional(),
  memoryEnabled: z.boolean().optional(),
});

/**
 * Phase 6 — full-app generation as a resumable, multi-call saga (see AI-GENERATION-ROADMAP.md
 * for why): tables (6.1) → interfaces+automations (6.2) → agents (6.3) → report (6.4), each
 * stage gated on the user having actually ACCEPTED every proposal from the previous stage.
 *
 * This shape exists because of a real constraint, not a preference: proposals are human-gated
 * (D-02/D-03) and acceptance happens via a separate HTTP call that can land seconds or hours
 * after this SSE stream has already closed. A single long-running generator has no way to
 * observe that later acceptance — so each stage is its own short-lived call, and run state
 * (which proposals are we waiting on) is persisted between calls rather than held in memory.
 * `generateFullApp` only ever runs stage 1; `continueFullApp` (called via a separate endpoint
 * once the user has accepted the previous stage's proposals) drives stages 2–4.
 */
@Injectable()
export class AppBlueprintService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly actionProposalService: ActionProposalService,
    private readonly recordService: RecordService,
    private readonly settingService: SettingService,
    @Inject(AI_SERVICE) private readonly aiService: IAiService
  ) {}

  /**
   * Plain-text brand summary injected into the interface-generation prompt so the AI-designed
   * modules at least describe colors/typography consistent with the admin-configured Brand
   * Design System, instead of generating an interface with no awareness of it.
   */
  private async buildBrandPromptHint(): Promise<string> {
    const { brandDesignSystem } = await this.settingService.getSetting(['brandDesignSystem']);
    if (!brandDesignSystem) return '';
    const bds = brandDesignSystem as {
      colors?: { name: string; hex: string }[];
      typography?: { fontFamily?: string };
      componentLibrary?: { buttonStyle?: string; formStyle?: string };
    };
    const parts: string[] = [];
    if (bds.colors?.length) {
      parts.push(
        `Couleurs de marque : ${bds.colors.map((c) => `${c.name} (${c.hex})`).join(', ')}.`
      );
    }
    if (bds.typography?.fontFamily) {
      parts.push(`Police : ${bds.typography.fontFamily}.`);
    }
    if (bds.componentLibrary?.buttonStyle || bds.componentLibrary?.formStyle) {
      parts.push(
        `Style de composants : boutons ${bds.componentLibrary.buttonStyle ?? 'défaut'}, formulaires ${bds.componentLibrary.formStyle ?? 'défaut'}.`
      );
    }
    return parts.length > 0
      ? `\n\nDesign system de la marque à respecter : ${parts.join(' ')}`
      : '';
  }

  private async resolveModelInstance(ctx: FullAppContext): Promise<unknown> {
    const aiConfig = await this.aiService.getAIConfig(ctx.baseId);
    const resolvedModelKey = ctx.modelKey ?? aiConfig.chatModel?.lg;
    if (!resolvedModelKey) {
      throw new Error('No AI model configured. Please configure an AI provider in space settings.');
    }
    return this.aiService.getModelInstance(resolvedModelKey, aiConfig.llmProviders);
  }

  private async loadRunState(
    conversationId: string
  ): Promise<{ messageId: string; state: IFullAppRunState } | null> {
    const msg = await this.prismaService.workspaceConversationMessage.findFirst({
      where: { conversationId, type: 'full_app_run' },
      orderBy: { createdTime: 'desc' },
    });
    if (!msg) return null;
    return { messageId: msg.id, state: msg.metadata as unknown as IFullAppRunState };
  }

  private async saveRunState(conversationId: string, state: IFullAppRunState): Promise<void> {
    const existing = await this.prismaService.workspaceConversationMessage.findFirst({
      where: { conversationId, type: 'full_app_run' },
      select: { id: true },
    });
    if (existing) {
      await this.prismaService.workspaceConversationMessage.update({
        where: { id: existing.id },
        data: { metadata: state as unknown as object },
      });
    } else {
      await this.prismaService.workspaceConversationMessage.create({
        data: {
          conversationId,
          role: 'system',
          type: 'full_app_run',
          content: '',
          proposalId: null,
          metadata: state as unknown as object,
        },
      });
    }
  }

  /** Conservative by design: any proposal not found, or not accepted, fails the whole check. */
  private async areAllAccepted(proposalIds: string[]): Promise<boolean> {
    if (proposalIds.length === 0) return true;
    const messages = await this.prismaService.workspaceConversationMessage.findMany({
      where: { proposalId: { in: proposalIds } },
      select: { metadata: true },
      take: proposalIds.length, // ponytail: bounded
    });
    if (messages.length !== proposalIds.length) return false;
    return messages.every((m) => (m.metadata as { accepted?: boolean } | null)?.accepted === true);
  }

  private async generateInterfaceProposal(
    ctx: FullAppContext,
    blueprint: IAppBlueprint,
    model: Parameters<typeof generateObject>[0]['model']
  ) {
    const brandHint = await this.buildBrandPromptHint();
    // Read link fields from the REAL tables rather than from the blueprint: by the time
    // generateInterfaceProposal is called (inside runSubgenerators, after 'tables' acceptance),
    // the tables actually exist in the DB with their real link fields. The blueprint schema
    // intentionally excludes 'link' from blueprintFieldSchema because link_tables is a
    // separate tool called after tables are created — so we can't rely on blueprint data here.
    const entityNames = blueprint.entities.map((e) => e.name);
    const realTables = await this.prismaService.tableMeta.findMany({
      where: { baseId: ctx.baseId, name: { in: entityNames }, deletedTime: null },
      select: { id: true, name: true },
      take: entityNames.length, // ponytail: bounded
    });
    const tableIdToName = new Map(realTables.map((t) => [t.id, t.name]));
    const linkFields =
      realTables.length > 0
        ? await this.prismaService.field.findMany({
            where: {
              tableId: { in: realTables.map((t) => t.id) },
              type: 'link',
              deletedTime: null,
            },
            select: { name: true, tableId: true, options: true },
            take: realTables.length * 200, // ponytail: bounded
          })
        : [];
    const relations = linkFields.flatMap((f) => {
      const ownerName = tableIdToName.get(f.tableId);
      const opts = f.options as { foreignTableId?: string } | null;
      const targetName = opts?.foreignTableId ? tableIdToName.get(opts.foreignTableId) : null;
      if (!ownerName || !targetName) return [];
      return [`"${ownerName}" est lié à "${targetName}" via le champ "${f.name}"`];
    });
    const relationsHint =
      relations.length > 0
        ? `\n\nRelations (tables réelles) : ${relations.join('; ')}. Pour les relations 1:N, propose un module "relation-table" qui affiche les enregistrements liés (linkFieldName = nom du champ link côté N).`
        : '';
    const { object } = await generateObject({
      model,
      schema: interfaceProposalSchema,
      prompt:
        `Propose une interface CRUD pour cette application, avec un module par table : ` +
        `${blueprint.entities.map((e) => e.name).join(', ')}.${relationsHint}${brandHint}`,
    });
    return this.actionProposalService.createProposal({
      action: 'create_app_interface',
      args: { baseId: ctx.baseId, name: object.title, modules: object.modules },
      conversationId: ctx.conversationId,
      preview: { name: object.title, modules: object.modules },
    });
  }

  private async generateAutomationProposal(
    ctx: FullAppContext,
    blueprint: IAppBlueprint,
    model: Parameters<typeof generateObject>[0]['model']
  ) {
    const { object } = await generateObject({
      model,
      schema: automationProposalSchema,
      prompt:
        `Propose UNE automatisation utile pour cette application (tables : ` +
        `${blueprint.entities.map((e) => e.name).join(', ')}).`,
    });
    return this.actionProposalService.createProposal({
      action: 'create_automation',
      args: { baseId: ctx.baseId, name: object.name, description: object.description },
      conversationId: ctx.conversationId,
      preview: { name: object.name, description: object.description },
    });
  }

  private async generateAgentProposal(
    ctx: FullAppContext,
    blueprint: IAppBlueprint,
    model: Parameters<typeof generateObject>[0]['model']
  ) {
    const { object } = await generateObject({
      model,
      schema: agentProposalSchema,
      prompt:
        `Propose UN agent IA utile pour cette application (tables : ` +
        `${blueprint.entities.map((e) => e.name).join(', ')}). Donne-lui des instructions claires ` +
        `et n'active que les outils dont il a réellement besoin.`,
    });
    return this.actionProposalService.createProposal({
      action: 'create_agent',
      args: {
        baseId: ctx.baseId,
        name: object.name,
        description: object.description,
        instructions: object.instructions,
        tools: object.tools,
        respondToMentions: object.respondToMentions,
        allowDirectMessage: object.allowDirectMessage,
        memoryEnabled: object.memoryEnabled,
      },
      conversationId: ctx.conversationId,
      preview: { name: object.name, description: object.description, tools: object.tools },
    });
  }

  /**
   * Phase 6.2 — interfaces + automations + mock-data run in parallel after the table proposals
   * (Phase 6.1) are accepted, each independently failable: one generator failing surfaces an
   * 'error' event but never blocks the others, and never aborts the overall stream
   * (Promise.allSettled, not Promise.all). Mock-data CAN run here (unlike the original
   * Phase 6.2 comment claimed) because `runSubgenerators` is only ever reached after
   * `continueFullApp` has confirmed every 'tables' proposal is accepted — the tables are real
   * rows in `tableMeta` by this point, not pending proposals. It only depends on tables, never
   * on the interface/automation/agent proposals, so there's no reason to make the user wait
   * for agents before getting mock data.
   */
  private async *runSubgenerators(
    ctx: FullAppContext,
    blueprint: IAppBlueprint,
    model: Parameters<typeof generateObject>[0]['model']
  ): AsyncGenerator<FullAppEvent> {
    yield { type: 'phase', phase: 'subgenerators', status: 'start' };

    const generators: Array<
      [
        'interface' | 'automation' | 'mock_data',
        Promise<Array<{ proposalId: string; action: string; preview: unknown }>>,
      ]
    > = [
      ['interface', this.generateInterfaceProposal(ctx, blueprint, model).then((p) => [p])],
      ['automation', this.generateAutomationProposal(ctx, blueprint, model).then((p) => [p])],
      ['mock_data', this.generateMockDataProposals(ctx, blueprint, model)],
    ];
    const results = await Promise.allSettled(generators.map(([, p]) => p));

    for (let i = 0; i < results.length; i++) {
      const [name] = generators[i];
      const result = results[i];
      if (result.status === 'fulfilled') {
        for (const proposal of result.value) {
          yield {
            type: 'proposal',
            proposal: {
              proposalId: proposal.proposalId,
              action: proposal.action,
              preview: proposal.preview,
            },
          };
        }
      } else {
        yield {
          type: 'error',
          generator: name,
          content: `Le générateur "${name}" a échoué : ${(result.reason as Error).message}`,
        };
      }
    }

    yield { type: 'phase', phase: 'subgenerators', status: 'done' };
  }

  async *generateFullApp(ctx: FullAppContext): AsyncGenerator<FullAppEvent> {
    const modelInstance = await this.resolveModelInstance(ctx);
    const model = modelInstance as Parameters<typeof generateObject>[0]['model'];

    yield { type: 'phase', phase: 'analysis', status: 'start' };
    const { object: analysis } = await generateObject({
      model,
      schema: analysisSchema,
      prompt: `Analyse cette demande d'application complète et structure-la : "${ctx.prompt}"`,
    });
    yield { type: 'phase', phase: 'analysis', status: 'done', data: analysis };

    yield { type: 'phase', phase: 'blueprint', status: 'start' };
    const { object: blueprint } = await generateObject({
      model,
      schema: blueprintSchema,
      prompt:
        `À partir de cette analyse, conçois le schéma de données (tables et champs) nécessaire : ${JSON.stringify(analysis)}.\n` +
        `Chaque table doit avoir un nom clair et des champs réalistes pour le domaine "${analysis.domain}".`,
    });
    yield { type: 'phase', phase: 'blueprint', status: 'done', data: blueprint };

    yield { type: 'phase', phase: 'tables', status: 'start' };
    const tableProposalIds: string[] = [];
    for (const entity of blueprint.entities) {
      const preview = { tableName: entity.name, fields: entity.fields };
      const proposal = await this.actionProposalService.createProposal({
        action: 'create_table',
        args: { baseId: ctx.baseId, name: entity.name, fields: entity.fields },
        conversationId: ctx.conversationId,
        preview,
      });
      tableProposalIds.push(proposal.proposalId);
      yield {
        type: 'proposal',
        proposal: {
          proposalId: proposal.proposalId,
          action: proposal.action,
          preview: proposal.preview,
        },
      };
    }
    yield { type: 'phase', phase: 'tables', status: 'done' };

    // Stage 1 ends here — see the class doc for why. The next stage runs only once the user
    // has accepted every table proposal above, via a separate call to continueFullApp().
    await this.saveRunState(ctx.conversationId, {
      stage: 'tables',
      baseId: ctx.baseId,
      prompt: ctx.prompt,
      modelKey: ctx.modelKey,
      blueprint,
      tableProposalIds,
    });
    yield { type: 'awaiting_acceptance', stage: 'tables' };
    yield { type: 'done' };
  }

  /**
   * Drives stages 2–4 of the saga. Call again after the user accepts each stage's proposals —
   * each call advances exactly one stage and ends with another 'awaiting_acceptance' (or
   * 'done' once stage 'agents' is accepted and the report has been delivered).
   */
  async *continueFullApp(conversationId: string): AsyncGenerator<FullAppEvent> {
    const run = await this.loadRunState(conversationId);
    if (!run) {
      yield { type: 'error', content: 'Aucune génération en cours pour cette conversation.' };
      yield { type: 'done' };
      return;
    }
    const { state } = run;
    const ctx: FullAppContext = {
      spaceId: '',
      userId: '',
      baseId: state.baseId,
      prompt: state.prompt,
      modelKey: state.modelKey,
      conversationId,
    };

    if (state.stage === 'done') {
      yield { type: 'error', content: 'Cette génération est déjà terminée.' };
      yield { type: 'done' };
      return;
    }

    const pendingIds = this.pendingProposalIdsForStage(state);
    if (!(await this.areAllAccepted(pendingIds))) {
      yield {
        type: 'error',
        stage: state.stage,
        content: "Toutes les propositions de l'étape précédente ne sont pas encore acceptées.",
      };
      yield { type: 'done' };
      return;
    }

    const modelInstance = await this.resolveModelInstance(ctx);
    const model = modelInstance as Parameters<typeof generateObject>[0]['model'];

    if (state.stage === 'tables') {
      yield* this.advanceToSubgenerators(ctx, state, model);
      return;
    }
    if (state.stage === 'subgenerators') {
      yield* this.advanceToAgents(ctx, state, model);
      return;
    }
    if (state.stage === 'agents') {
      // Current flow: mock data already ran during 'subgenerators' (mockDataProposalIds is at
      // least an empty array by now) — go straight to the report. Legacy flow: a run created
      // before this change reached 'agents' with mockDataProposalIds still `undefined` — run
      // the old post-agents mock-data step for backward compatibility (see advanceToMockData).
      if (state.mockDataProposalIds === undefined) {
        yield* this.advanceToMockData(ctx, state, model);
      } else {
        yield* this.advanceToReport(ctx, state);
      }
      return;
    }
    // state.stage === 'mock_data'
    yield* this.advanceToReport(ctx, state);
  }

  /** Which proposal IDs gate moving past the run's CURRENT stage. */
  private pendingProposalIdsForStage(state: IFullAppRunState): string[] {
    if (state.stage === 'tables') return state.tableProposalIds;
    if (state.stage === 'subgenerators') {
      return [
        state.interfaceProposalId,
        state.automationProposalId,
        ...(state.mockDataProposalIds ?? []),
      ].filter((id): id is string => Boolean(id));
    }
    if (state.stage === 'agents') return state.agentProposalIds ?? [];
    return state.mockDataProposalIds ?? [];
  }

  private async *advanceToSubgenerators(
    ctx: FullAppContext,
    state: IFullAppRunState,
    model: Parameters<typeof generateObject>[0]['model']
  ): AsyncGenerator<FullAppEvent> {
    let interfaceProposalId: string | undefined;
    let automationProposalId: string | undefined;
    const mockDataProposalIds: string[] = [];
    for await (const event of this.runSubgenerators(ctx, state.blueprint, model)) {
      yield event;
      if (event.type === 'proposal' && event.proposal?.action === 'create_app_interface') {
        interfaceProposalId = event.proposal.proposalId;
      }
      if (event.type === 'proposal' && event.proposal?.action === 'create_automation') {
        automationProposalId = event.proposal.proposalId;
      }
      if (event.type === 'proposal' && event.proposal?.action === 'update_record') {
        mockDataProposalIds.push(event.proposal.proposalId);
      }
    }
    await this.saveRunState(ctx.conversationId, {
      ...state,
      stage: 'subgenerators',
      interfaceProposalId,
      automationProposalId,
      mockDataProposalIds,
    });
    yield { type: 'awaiting_acceptance', stage: 'subgenerators' };
    yield { type: 'done' };
  }

  private async *advanceToAgents(
    ctx: FullAppContext,
    state: IFullAppRunState,
    model: Parameters<typeof generateObject>[0]['model']
  ): AsyncGenerator<FullAppEvent> {
    yield { type: 'phase', phase: 'agents', status: 'start' };
    const proposal = await this.generateAgentProposal(ctx, state.blueprint, model);
    yield {
      type: 'proposal',
      proposal: {
        proposalId: proposal.proposalId,
        action: proposal.action,
        preview: proposal.preview,
      },
    };
    yield { type: 'phase', phase: 'agents', status: 'done' };

    await this.saveRunState(ctx.conversationId, {
      ...state,
      stage: 'agents',
      agentProposalIds: [proposal.proposalId],
    });
    yield { type: 'awaiting_acceptance', stage: 'agents' };
    yield { type: 'done' };
  }

  /** Zod value schema per Teable field type — mirrors UnifiedAiService's mockValueSchemaForFieldType. */
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
        return z.string();
    }
  }

  /**
   * Optional final-stage recommendation: now that every table from this run is real (not just
   * a proposal), fill any still-empty rows with realistic mock data, one `generateObject` call
   * per table. Deliberately skips `link` field resolution (unlike the chat-driven "Données
   * fictives" flow, which already handles that) — cross-table relations right after a multi-
   * table saga are a less common need than getting a non-empty table to look at immediately,
   * and the existing per-table chat flow remains available for anyone who wants linked data.
   */
  /**
   * Generates one `update_record` proposal per still-empty row, across every real table from
   * this run's blueprint. Returns the flat list of proposals instead of yielding — called from
   * `runSubgenerators` (current flow, parallel with interface/automation) and from
   * `advanceToMockData` (legacy compatibility path, see its own doc comment).
   */
  private async generateMockDataProposals(
    ctx: FullAppContext,
    blueprint: IAppBlueprint,
    model: Parameters<typeof generateObject>[0]['model']
  ): Promise<Array<{ proposalId: string; action: string; preview: unknown }>> {
    const entityNames = blueprint.entities.map((e) => e.name);
    const tables = await this.prismaService.tableMeta.findMany({
      where: { baseId: ctx.baseId, name: { in: entityNames }, deletedTime: null },
      select: { id: true, name: true },
      take: entityNames.length, // ponytail: bounded
    });

    const proposals: Array<{ proposalId: string; action: string; preview: unknown }> = [];
    for (const table of tables) {
      const fieldMetas = await this.prismaService.field.findMany({
        where: { tableId: table.id, deletedTime: null, type: { not: 'link' } },
        select: { name: true, type: true },
        take: 500, // ponytail: bounded
      });
      if (fieldMetas.length === 0) continue;

      const { records } = await this.recordService.getRecords(table.id, {
        take: 50,
        fieldKeyType: FieldKeyType.Name,
        ignoreViewQuery: true,
      } as Parameters<RecordService['getRecords']>[1]);
      const isEmptyRecord = (fields: Record<string, unknown>) =>
        Object.values(fields).every((v) => v === null || v === undefined || v === '');
      const emptyRecords = records.filter((r) => isEmptyRecord(r.fields)).slice(0, 3);
      if (emptyRecords.length === 0) continue;

      const fieldsShape = Object.fromEntries(
        fieldMetas.map((f) => [f.name, this.mockValueSchemaForFieldType(f.type)])
      );
      const schema = z.object({
        records: z.array(z.object(fieldsShape)).min(1).max(emptyRecords.length),
      });

      let object: { records: Record<string, unknown>[] };
      try {
        ({ object } = await generateObject({
          model,
          schema,
          prompt:
            `Table "${table.name}" — champs: ${fieldMetas.map((f) => `${f.name} (${f.type})`).join(', ')}.\n` +
            `Génère exactement ${emptyRecords.length} enregistrement(s) fictif(s) réaliste(s) et cohérent(s) entre eux, ` +
            `dans le contexte de l'application : "${ctx.prompt}".`,
        }));
      } catch {
        // One table's generation failing (e.g. odd field combination) shouldn't block the
        // others — same tolerance as Phase 6.2's Promise.allSettled sub-generators.
        continue;
      }

      const generatedCount = Math.min(object.records.length, emptyRecords.length);
      for (let i = 0; i < generatedCount; i++) {
        const proposal = await this.actionProposalService.createProposal({
          action: 'update_record',
          args: { tableId: table.id, recordId: emptyRecords[i].id, fields: object.records[i] },
          conversationId: ctx.conversationId,
          preview: { tableName: table.name, fields: object.records[i] },
        });
        proposals.push(proposal);
      }
    }
    return proposals;
  }

  /**
   * Legacy compatibility path only: drives a conversation that reached stage 'agents' BEFORE
   * mock-data generation moved into `runSubgenerators` (i.e. its saved state has no
   * `mockDataProposalIds` yet, because that stage didn't exist when it was created). New runs
   * never call this — `continueFullApp` only reaches here when `state.mockDataProposalIds` is
   * `undefined`. See AI-GENERATION-ROADMAP.md for the migration note.
   */
  private async *advanceToMockData(
    ctx: FullAppContext,
    state: IFullAppRunState,
    model: Parameters<typeof generateObject>[0]['model']
  ): AsyncGenerator<FullAppEvent> {
    yield { type: 'phase', phase: 'mock_data', status: 'start' };
    const proposals = await this.generateMockDataProposals(ctx, state.blueprint, model);
    for (const proposal of proposals) {
      yield {
        type: 'proposal',
        proposal: {
          proposalId: proposal.proposalId,
          action: proposal.action,
          preview: proposal.preview,
        },
      };
    }
    yield { type: 'phase', phase: 'mock_data', status: 'done' };

    const mockDataProposalIds = proposals.map((p) => p.proposalId);
    const newState: IFullAppRunState = { ...state, stage: 'mock_data', mockDataProposalIds };
    await this.saveRunState(ctx.conversationId, newState);

    // No empty tables found (or every generation attempt failed) — nothing to gate on, so
    // there's no point making the user click "Continuer" past zero proposals (the frontend's
    // "all pending accepted" check is otherwise never satisfiable with an empty list).
    if (mockDataProposalIds.length === 0) {
      yield* this.advanceToReport(ctx, newState);
      return;
    }
    yield { type: 'awaiting_acceptance', stage: 'mock_data' };
    yield { type: 'done' };
  }

  /** Counts occurrences in `items` keyed by `keyOf`, returning only keys seen more than once. */
  private findDuplicates<T>(items: T[], keyOf: (item: T) => string): Map<string, number> {
    const counts = new Map<string, number>();
    for (const item of items) {
      const key = keyOf(item);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    for (const [key, count] of counts) {
      if (count <= 1) counts.delete(key);
    }
    return counts;
  }

  private duplicateTableNameWarnings(tables: Array<{ name: string }>): string[] {
    const duplicates = this.findDuplicates(tables, (t) => t.name);
    return [...duplicates].map(
      ([name, count]) =>
        `${count} tables sont nommées "${name}" — vérifiez qu'il n'y a pas de doublon involontaire.`
    );
  }

  private duplicateFieldNameWarnings(
    tables: Array<{ id: string; name: string }>,
    fields: Array<{ name: string; tableId: string }>
  ): string[] {
    const fieldsByTable = new Map<string, typeof fields>();
    for (const f of fields) {
      fieldsByTable.set(f.tableId, [...(fieldsByTable.get(f.tableId) ?? []), f]);
    }
    const warnings: string[] = [];
    for (const table of tables) {
      const duplicates = this.findDuplicates(fieldsByTable.get(table.id) ?? [], (f) => f.name);
      for (const [name, count] of duplicates) {
        warnings.push(`Table "${table.name}" : ${count} champs sont nommés "${name}".`);
      }
    }
    return warnings;
  }

  /** A link field's `options.foreignTableId` may point at a table deleted after the link was
   * created — the relation silently goes nowhere from then on. */
  private async danglingLinkWarnings(
    tables: Array<{ id: string; name: string }>,
    fields: Array<{ name: string; tableId: string; type: string; options: unknown }>
  ): Promise<string[]> {
    const tableIdSet = new Set(tables.map((t) => t.id));
    const warnings: string[] = [];
    for (const f of fields) {
      if (f.type !== 'link') continue;
      const foreignTableId = (f.options as { foreignTableId?: string } | null)?.foreignTableId;
      if (!foreignTableId || tableIdSet.has(foreignTableId)) continue;
      const stillExists = await this.prismaService.tableMeta.findFirst({
        where: { id: foreignTableId, deletedTime: null },
        select: { id: true },
      });
      if (stillExists) continue;
      const ownerTable = tables.find((t) => t.id === f.tableId);
      warnings.push(
        `Champ de relation "${f.name}"${ownerTable ? ` (table "${ownerTable.name}")` : ''} pointe vers une table qui n'existe plus.`
      );
    }
    return warnings;
  }

  /**
   * Phase 4 validation pass — non-blocking, read-only. Checks the whole base (not just this
   * run's tables) because the real risk is a name colliding with something that pre-dates the
   * saga, not just within the blueprint itself: duplicate table names, duplicate field names
   * within the same table, and link fields whose foreignTableId no longer resolves. Returns
   * warnings only — never throws, never blocks delivery, matching the same failure tolerance as
   * the sub-generators above.
   */
  private async runValidationPass(baseId: string): Promise<string[]> {
    const tables = await this.prismaService.tableMeta.findMany({
      where: { baseId, deletedTime: null },
      select: { id: true, name: true },
      take: 500, // ponytail: bounded
    });
    const fields = await this.prismaService.field.findMany({
      where: { tableId: { in: tables.map((t) => t.id) }, deletedTime: null },
      select: { name: true, tableId: true, type: true, options: true },
      take: tables.length * 500, // ponytail: bounded
    });

    return [
      ...this.duplicateTableNameWarnings(tables),
      ...this.duplicateFieldNameWarnings(tables, fields),
      ...(await this.danglingLinkWarnings(tables, fields)),
    ];
  }

  /**
   * Phase 6.4 — delivery report. The counts come from the run state (cheap, already known);
   * `warnings` comes from `runValidationPass`'s fresh DB read (Phase 4) — non-blocking, the
   * saga always reaches "done" even if it finds something to flag.
   */
  private async *advanceToReport(
    ctx: FullAppContext,
    state: IFullAppRunState
  ): AsyncGenerator<FullAppEvent> {
    yield { type: 'phase', phase: 'report', status: 'start' };
    const warnings = await this.runValidationPass(state.baseId);
    const report = {
      tablesCreated: state.tableProposalIds.length,
      interfaceCreated: Boolean(state.interfaceProposalId),
      automationCreated: Boolean(state.automationProposalId),
      agentsCreated: (state.agentProposalIds ?? []).length,
      mockRecordsFilled: (state.mockDataProposalIds ?? []).length,
      warnings,
    };
    yield { type: 'report', data: report };
    yield { type: 'phase', phase: 'report', status: 'done' };

    await this.saveRunState(ctx.conversationId, { ...state, stage: 'done' });
    yield { type: 'done' };
  }
}
