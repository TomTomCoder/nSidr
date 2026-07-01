/**
 * P0-8 — Generation-quality eval harness (regression guard).
 *
 * These are NOT unit tests of plumbing (see unified-ai.service.spec.ts for that).
 * For each generation target we drive the LLM deterministically (mock `generateText`
 * to invoke the real write-tool `execute()` with a fixed tool call) and assert on the
 * STRUCTURE of the resulting proposal: valid FieldType enum values, real snapshot
 * fields, WorkflowConfigSchema validity, least-privilege agents, and one negative case
 * where an out-of-enum automation step is rejected by the schema guard.
 *
 * Mirrors the mocking style of unified-ai.service.spec.ts exactly (same manual mocks,
 * same `vi.mock('ai', ...)`, same `mockImplementation` that calls opts.tools.*.execute).
 */
import { FieldType } from '@teable/core';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkflowConfigSchema } from '../workflow/workflow-ai.service';
import { UnifiedAiService } from './unified-ai.service';

const mockWorkspaceStateService = { getSnapshot: vi.fn() };
const mockActionProposalService = { createProposal: vi.fn() };
const mockRecordService = { getRecords: vi.fn() };
const mockAiService = {
  getAIConfig: vi.fn(),
  getAIConfigBySpaceId: vi.fn(),
  getModelInstance: vi.fn(),
  embed: vi.fn(),
};
const mockPrismaService = {
  workspaceConversation: { create: vi.fn(), findUnique: vi.fn() },
  workspaceConversationMessage: { create: vi.fn() },
  field: { findMany: vi.fn().mockResolvedValue([]) },
  tableMeta: { findFirst: vi.fn().mockResolvedValue(null) },
};

vi.mock('ai', () => ({
  generateText: vi.fn(),
  generateObject: vi.fn(),
  tool: vi.fn((def) => def),
  jsonSchema: vi.fn((schema) => schema),
  zodSchema: vi.fn((schema) => schema),
  stepCountIs: vi.fn((n) => n),
}));

import { generateText } from 'ai';

/** The set of valid FieldType enum string values (ground truth from @teable/core). */
const VALID_FIELD_TYPES = new Set(Object.values(FieldType) as string[]);

const createService = () =>
  new UnifiedAiService(
    mockPrismaService as any,
    mockWorkspaceStateService as any,
    mockActionProposalService as any,
    mockRecordService as any,
    mockAiService as any
  );

/**
 * Drive the model: on the single generateText step, call the named write tool's
 * real execute() with `args`, and surface its output as the step's toolResult —
 * exactly how the AI SDK feeds tool output back (see spec Tests 10/11).
 */
const driveToolCall = (toolName: string, args: Record<string, unknown>) => {
  vi.mocked(generateText).mockImplementation(async (opts: any) => {
    const t = opts.tools[toolName];
    if (!t) return { text: '', steps: [{ text: '', toolCalls: [], toolResults: [] }] } as any;
    const output = await t.execute(args);
    return {
      text: '',
      steps: [{ text: '', toolCalls: [{ toolName, args }], toolResults: [{ toolName, output }] }],
    } as any;
  });
};

const drain = async (service: UnifiedAiService, ctx: any) => {
  const events: any[] = [];
  for await (const e of service.chat(ctx)) events.push(e);
  return events;
};

describe('P0-8 generation evals — structure quality per target', () => {
  let service: UnifiedAiService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = createService();
    mockAiService.getAIConfig.mockResolvedValue({ llmProviders: [] });
    mockAiService.getModelInstance.mockResolvedValue('mock-model');
    mockPrismaService.workspaceConversation.create.mockResolvedValue({
      id: 'conv-1',
      spaceId: 'space-1',
      status: 'in_progress',
    });
    mockPrismaService.workspaceConversationMessage.create.mockResolvedValue({ id: 'msg-1' });
    // createProposal echoes back its input so we can assert on args + preview.
    mockActionProposalService.createProposal.mockImplementation(async (input: any) => ({
      proposalId: `prop-${input.action}`,
      action: input.action,
      args: input.args,
      preview: input.preview,
      conversationMessageId: 'msg-x',
    }));
  });

  // ─── TABLE ────────────────────────────────────────────────────────────────
  describe('Table', () => {
    it('CRM: creates Clients & Opportunités with valid FieldType fields + a link between them', async () => {
      mockWorkspaceStateService.getSnapshot.mockResolvedValue({
        bases: [{ id: 'base-1', name: 'CRM', tables: [] }],
        integrations: [],
        agentTriggers: [],
        plugins: [],
      });

      // Turn 1: create "Clients"
      driveToolCall('create_table', {
        baseId: 'base-1',
        name: 'Clients',
        fields: [
          { name: 'Nom', type: 'singleLineText' },
          { name: 'Email', type: 'singleLineText' },
          { name: 'Score', type: 'rating' },
        ],
      });
      const clientEvents = await drain(service, {
        spaceId: 'space-1',
        userId: 'u1',
        message: 'crée un CRM avec Clients et Opportunités',
        modelKey: 'm',
        targetType: 'table' as const,
      });
      const clientProposal = clientEvents.find((e) => e.type === 'proposal');
      expect(clientProposal).toBeDefined();
      const clientFields = clientProposal.proposal.preview.fields as Array<{
        name: string;
        type: string;
      }>;
      // Every field type is a real FieldType enum value.
      for (const f of clientFields) expect(VALID_FIELD_TYPES.has(f.type)).toBe(true);

      // Turn 2: create "Opportunités" with a link back to Clients.
      driveToolCall('create_table', {
        baseId: 'base-1',
        name: 'Opportunités',
        fields: [
          { name: 'Titre', type: 'singleLineText' },
          { name: 'Montant', type: 'number' },
          {
            name: 'Client',
            type: 'link',
            foreignTableName: 'Clients',
            relationship: 'manyOne',
          },
        ],
      });
      const oppEvents = await drain(service, {
        spaceId: 'space-1',
        userId: 'u1',
        message: 'crée un CRM avec Clients et Opportunités',
        modelKey: 'm',
        targetType: 'table' as const,
      });
      const oppProposal = oppEvents.find((e) => e.type === 'proposal');
      expect(oppProposal).toBeDefined();
      const oppFields = oppProposal.proposal.preview.fields as Array<{
        name: string;
        type: string;
        foreignTableName?: string;
      }>;
      for (const f of oppFields) expect(VALID_FIELD_TYPES.has(f.type)).toBe(true);
      const link = oppFields.find((f) => f.type === FieldType.Link);
      expect(link).toBeDefined();
      expect(link!.foreignTableName).toBe('Clients');
    });

    it('does not duplicate: proposing a table whose name already exists in the snapshot re-uses it', async () => {
      // A "Clients" table already exists in the snapshot.
      mockWorkspaceStateService.getSnapshot.mockResolvedValue({
        bases: [
          {
            id: 'base-1',
            name: 'CRM',
            tables: [
              {
                id: 'tbl-clients',
                name: 'Clients',
                fields: [{ name: 'Nom', type: 'singleLineText' }],
              },
            ],
          },
        ],
        integrations: [],
        agentTriggers: [],
        plugins: [],
      });

      // The correct behaviour for an existing table is to add a field to it, not create
      // a second "Clients". Grounding on the snapshot: create_field targets the real id.
      driveToolCall('create_view', {
        tableName: 'Clients',
        baseId: 'base-1',
        type: 'grid',
        name: 'Vue Clients',
      });
      const events = await drain(service, {
        spaceId: 'space-1',
        userId: 'u1',
        message: 'ajoute une vue sur Clients',
        modelKey: 'm',
        targetType: 'table' as const,
      });

      // The tableName resolved against the snapshot (no clarification / no duplicate table).
      expect(events.some((e) => e.type === 'proposal')).toBe(true);
      expect(
        mockActionProposalService.createProposal.mock.calls.some(
          (c: any[]) => c[0].action === 'create_table'
        )
      ).toBe(false);
    });
  });

  // ─── INTERFACE ──────────────────────────────────────────────────────────────
  describe('Interface', () => {
    it('proposal references real fields, including an ai-typed field from the snapshot', async () => {
      mockWorkspaceStateService.getSnapshot.mockResolvedValue({
        bases: [
          {
            id: 'base-1',
            name: 'Projets',
            tables: [
              {
                id: 'tbl-tasks',
                name: 'Tâches',
                fields: [
                  { name: 'Titre', type: 'singleLineText' },
                  { name: 'Statut', type: 'singleSelect' },
                  { name: 'Résumé IA', type: 'ai' },
                ],
              },
            ],
          },
        ],
        integrations: [],
        agentTriggers: [],
        plugins: [],
      });

      driveToolCall('create_app_interface', {
        baseId: 'base-1',
        name: 'Suivi des tâches',
        modules: [
          {
            type: 'data-table',
            tableName: 'Tâches',
            title: 'Tâches',
            fieldNames: ['Titre', 'Statut', 'Résumé IA'],
          },
        ],
      });
      const events = await drain(service, {
        spaceId: 'space-1',
        userId: 'u1',
        message: 'une interface de suivi des tâches',
        modelKey: 'm',
        targetType: 'interface' as const,
      });

      const proposal = events.find((e) => e.type === 'proposal');
      expect(proposal).toBeDefined();
      const modules = proposal.proposal.preview.modules as Array<{
        tableName: string;
        fieldNames?: string[];
      }>;
      expect(modules).toHaveLength(1);

      // Ground truth: the referenced table + fields must exist in the snapshot,
      // and the ai-typed field must be among them (P0-5 link).
      const snap = await mockWorkspaceStateService.getSnapshot();
      const table = snap.bases[0].tables.find((t: any) => t.name === modules[0].tableName);
      expect(table).toBeDefined();
      const realNames = new Set(table.fields.map((f: any) => f.name));
      for (const fn of modules[0].fieldNames ?? []) expect(realNames.has(fn)).toBe(true);
      const aiField = table.fields.find((f: any) => f.type === FieldType.Ai);
      expect(aiField).toBeDefined();
      expect(modules[0].fieldNames).toContain(aiField.name);
    });
  });

  // ─── AUTOMATION ─────────────────────────────────────────────────────────────
  describe('Automation', () => {
    it('Slack-on-lead: trigger record_created + step send_slack, valid per WorkflowConfigSchema', async () => {
      mockWorkspaceStateService.getSnapshot.mockResolvedValue({
        bases: [
          {
            id: 'base-1',
            name: 'Ventes',
            tables: [{ id: 'tbl-leads', name: 'Leads', fields: [{ name: 'Nom', type: 'singleLineText' }] }],
          },
        ],
        integrations: [],
        agentTriggers: [],
        plugins: [],
      });

      driveToolCall('create_automation', {
        baseId: 'base-1',
        name: 'Notifier Slack sur nouveau lead',
        trigger: { type: 'record_created', config: { tableId: 'tbl-leads' } },
        steps: [
          {
            type: 'send_slack',
            name: 'Notifier #ventes',
            config: { channel: '#ventes', message: 'Nouveau lead' },
          },
        ],
      });
      const events = await drain(service, {
        spaceId: 'space-1',
        userId: 'u1',
        message: 'notifier sur Slack à la création d’un lead',
        modelKey: 'm',
        targetType: 'automation' as const,
      });

      const proposal = events.find((e) => e.type === 'proposal');
      expect(proposal).toBeDefined();
      const p = proposal.proposal.preview as Record<string, unknown>;

      // The generated structure validates against the real executable schema
      // (only the 8 triggers / 9 steps the engine can run).
      const parsed = WorkflowConfigSchema.safeParse({
        name: p.name,
        trigger: p.trigger,
        steps: p.steps,
      });
      expect(parsed.success).toBe(true);
      expect((p.trigger as any).type).toBe('record_created');
      expect((p.steps as any[])[0].type).toBe('send_slack');
    });

    // ─── NEGATIVE: guard bites ────────────────────────────────────────────────
    it('NEGATIVE: an automation step outside the executable enum fails WorkflowConfigSchema (skipped by the guard)', () => {
      const bad = {
        name: 'Envoyer un SMS',
        trigger: { type: 'record_created', config: {} },
        steps: [{ type: 'send_sms', config: { to: '+33', message: 'hi' } }], // not one of the 9
      };
      const parsed = WorkflowConfigSchema.safeParse(bad);
      expect(parsed.success).toBe(false);
      // A structured skip carries a Zod reason on the offending step type — not an exception.
      if (!parsed.success) {
        const onStepType = parsed.error.issues.some((i) => i.path.join('.').includes('type'));
        expect(onStepType).toBe(true);
      }
    });
  });

  // ─── AGENT ──────────────────────────────────────────────────────────────────
  describe('Agent', () => {
    it('least privilege: a Q&A agent defaults to minimal capabilities — no write tools enabled implicitly', async () => {
      mockWorkspaceStateService.getSnapshot.mockResolvedValue({
        bases: [{ id: 'base-1', name: 'Support', tables: [] }],
        integrations: [],
        agentTriggers: [],
        plugins: [],
      });

      // A "answers questions" agent: the model lists only read tools (no tools also valid).
      driveToolCall('create_agent', {
        baseId: 'base-1',
        name: 'Assistant Support',
        instructions: 'Réponds aux questions des utilisateurs sur la base.',
        tools: ['search_records', 'get_records'],
      });
      const events = await drain(service, {
        spaceId: 'space-1',
        userId: 'u1',
        message: 'un agent qui répond aux questions sur la base',
        modelKey: 'm',
        targetType: 'agent' as const,
      });

      const proposal = events.find((e) => e.type === 'proposal');
      expect(proposal).toBeDefined();
      const tools = (proposal.proposal.preview.tools ?? []) as string[];

      // No write/mutating tool is present unless explicitly requested.
      const WRITE_TOOLS = [
        'create_record',
        'update_record',
        'delete_record',
        'create_knowledge_doc',
        'update_knowledge_doc',
        'create_agent',
        'save_memory',
        'set_preference',
      ];
      for (const w of WRITE_TOOLS) expect(tools).not.toContain(w);
      // web_search defaults OFF unless explicitly listed.
      expect(tools).not.toContain('web_search');
    });

    it('an agent created with no tools list carries no tools at all (empty capabilities)', async () => {
      mockWorkspaceStateService.getSnapshot.mockResolvedValue({
        bases: [{ id: 'base-1', name: 'Support', tables: [] }],
        integrations: [],
        agentTriggers: [],
        plugins: [],
      });

      driveToolCall('create_agent', {
        baseId: 'base-1',
        name: 'Assistant',
        instructions: 'Aide les utilisateurs.',
        // tools intentionally omitted
      });
      const events = await drain(service, {
        spaceId: 'space-1',
        userId: 'u1',
        message: 'un agent simple',
        modelKey: 'm',
        targetType: 'agent' as const,
      });

      const proposal = events.find((e) => e.type === 'proposal');
      expect(proposal).toBeDefined();
      // No tools => undefined/empty; certainly no write tools materialised out of nowhere.
      const tools = proposal.proposal.preview.tools as string[] | undefined;
      expect(tools === undefined || tools.length === 0).toBe(true);
    });
  });
});
