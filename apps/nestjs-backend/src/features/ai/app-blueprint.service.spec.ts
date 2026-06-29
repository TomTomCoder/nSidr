import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppBlueprintService } from './app-blueprint.service';

vi.mock('ai', () => ({
  generateObject: vi.fn(),
}));

import { generateObject } from 'ai';

const mockAiService = {
  getAIConfig: vi.fn(),
  getModelInstance: vi.fn(),
};

const mockActionProposalService = {
  createProposal: vi.fn(),
};

const mockRecordService = {
  getRecords: vi.fn(),
};

const mockPrismaService = {
  workspaceConversationMessage: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  tableMeta: {
    findMany: vi.fn(),
  },
  field: {
    findMany: vi.fn(),
  },
};

describe('AppBlueprintService', () => {
  let service: AppBlueprintService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAiService.getAIConfig.mockResolvedValue({ llmProviders: [], chatModel: { lg: 'gpt-4o' } });
    mockAiService.getModelInstance.mockResolvedValue({ modelId: 'gpt-4o' });
    mockPrismaService.workspaceConversationMessage.findFirst.mockResolvedValue(null);
    mockPrismaService.workspaceConversationMessage.create.mockResolvedValue({ id: 'msg-run' });
    mockPrismaService.workspaceConversationMessage.update.mockResolvedValue(undefined);
    mockPrismaService.tableMeta.findMany.mockResolvedValue([]);
    mockPrismaService.field.findMany.mockResolvedValue([]);
    mockRecordService.getRecords.mockResolvedValue({ records: [] });
    mockActionProposalService.createProposal.mockImplementation(async (input: any) => ({
      proposalId: `prop-${input.args.name ?? input.args.tableId}`,
      action: input.action,
      preview: input.preview,
      conversationMessageId: 'msg-x',
    }));
    service = new AppBlueprintService(
      mockPrismaService as any,
      mockActionProposalService as any,
      mockRecordService as any,
      mockAiService as any
    );
  });

  const ctx = {
    spaceId: 'space-1',
    userId: 'user-1',
    baseId: 'base-1',
    prompt: 'Une app de gestion de stock',
    modelKey: 'gpt-4o',
    conversationId: 'conv-1',
  };

  const mockAnalysis = {
    appName: 'StockApp',
    description: 'Gère le stock',
    domain: 'logistique',
    businessProcesses: [],
    targetUsers: [],
    dataNeeds: [],
    automationNeeds: [],
    aiNeeds: [],
  };
  const mockBlueprint = {
    entities: [
      { name: 'Produits', fields: [{ name: 'Nom', type: 'singleLineText' }] },
      { name: 'Stocks', fields: [{ name: 'Quantité', type: 'number' }] },
    ],
  };

  describe('generateFullApp — Stage 1 (tables) only, then waits for acceptance', () => {
    it('analysis → blueprint → table proposals → persists run state → awaiting_acceptance → done', async () => {
      vi.mocked(generateObject)
        .mockResolvedValueOnce({ object: mockAnalysis } as any)
        .mockResolvedValueOnce({ object: mockBlueprint } as any);

      const events = [];
      for await (const event of service.generateFullApp(ctx)) events.push(event);

      expect(events.map((e) => e.type)).toEqual([
        'phase',
        'phase',
        'phase',
        'phase',
        'phase',
        'proposal',
        'proposal',
        'phase',
        'awaiting_acceptance',
        'done',
      ]);
      expect(events.at(-2)).toMatchObject({ type: 'awaiting_acceptance', stage: 'tables' });
      expect(mockActionProposalService.createProposal).toHaveBeenCalledTimes(2);
      expect(mockPrismaService.workspaceConversationMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            conversationId: 'conv-1',
            type: 'full_app_run',
            metadata: expect.objectContaining({
              stage: 'tables',
              tableProposalIds: expect.any(Array),
            }),
          }),
        })
      );
    });

    it('no AI model configured → throws before any proposal is created', async () => {
      mockAiService.getAIConfig.mockResolvedValue({ llmProviders: [], chatModel: {} });
      const ctxNoModel = { ...ctx, modelKey: '' };

      await expect(async () => {
        for await (const _event of service.generateFullApp(ctxNoModel)) {
          // drain
        }
      }).rejects.toThrow(/No AI model configured/);

      expect(mockActionProposalService.createProposal).not.toHaveBeenCalled();
    });
  });

  describe('continueFullApp — gated stage transitions', () => {
    const runState = {
      stage: 'tables' as const,
      baseId: 'base-1',
      prompt: 'Une app de gestion de stock',
      modelKey: 'gpt-4o',
      blueprint: mockBlueprint,
      tableProposalIds: ['prop-Produits', 'prop-Stocks'],
    };

    it('no run found for this conversation → error, done', async () => {
      mockPrismaService.workspaceConversationMessage.findFirst.mockResolvedValue(null);

      const events = [];
      for await (const event of service.continueFullApp('conv-1')) events.push(event);

      expect(events).toEqual([
        { type: 'error', content: expect.stringContaining('Aucune génération') },
        { type: 'done' },
      ]);
    });

    it('stage "tables" not all accepted yet → error naming the stage, no generateObject call', async () => {
      mockPrismaService.workspaceConversationMessage.findFirst.mockResolvedValue({
        id: 'msg-run',
        metadata: runState,
      });
      mockPrismaService.workspaceConversationMessage.findMany.mockResolvedValue([
        { metadata: { accepted: true } },
        { metadata: { accepted: false } },
      ]);

      const events = [];
      for await (const event of service.continueFullApp('conv-1')) events.push(event);

      expect(events[0]).toMatchObject({ type: 'error', stage: 'tables' });
      expect(events.at(-1)).toEqual({ type: 'done' });
      expect(generateObject).not.toHaveBeenCalled();
    });

    it('stage "tables" all accepted → runs sub-generators, persists "subgenerators", awaits acceptance', async () => {
      mockPrismaService.workspaceConversationMessage.findFirst.mockResolvedValue({
        id: 'msg-run',
        metadata: runState,
      });
      mockPrismaService.workspaceConversationMessage.findMany.mockResolvedValue([
        { metadata: { accepted: true } },
        { metadata: { accepted: true } },
      ]);
      vi.mocked(generateObject)
        .mockResolvedValueOnce({
          object: {
            title: 'Suivi stock',
            modules: [{ type: 'data-table', tableName: 'Produits' }],
          },
        } as any)
        .mockResolvedValueOnce({
          object: { name: 'Alerte stock bas', description: 'Quand Stocks < 10, envoyer un email.' },
        } as any);

      const events = [];
      for await (const event of service.continueFullApp('conv-1')) events.push(event);

      const proposalEvents = events.filter((e) => e.type === 'proposal');
      expect(proposalEvents).toHaveLength(2);
      expect(mockActionProposalService.createProposal).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'create_app_interface' })
      );
      expect(mockActionProposalService.createProposal).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'create_automation' })
      );
      expect(mockPrismaService.workspaceConversationMessage.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            metadata: expect.objectContaining({ stage: 'subgenerators' }),
          }),
        })
      );
      expect(events.at(-2)).toMatchObject({ type: 'awaiting_acceptance', stage: 'subgenerators' });
    });

    it('one sub-generator failing surfaces a scoped error but still advances the run', async () => {
      mockPrismaService.workspaceConversationMessage.findFirst.mockResolvedValue({
        id: 'msg-run',
        metadata: runState,
      });
      mockPrismaService.workspaceConversationMessage.findMany.mockResolvedValue([
        { metadata: { accepted: true } },
        { metadata: { accepted: true } },
      ]);
      vi.mocked(generateObject)
        .mockRejectedValueOnce(new Error('interface generation failed'))
        .mockResolvedValueOnce({ object: { name: 'Alerte', description: 'desc' } } as any);

      const events = [];
      for await (const event of service.continueFullApp('conv-1')) events.push(event);

      const errorEvents = events.filter((e) => e.type === 'error');
      expect(errorEvents).toHaveLength(1);
      expect(errorEvents[0]).toMatchObject({ generator: 'interface' });
      expect(events.filter((e) => e.type === 'proposal')).toHaveLength(1);
    });

    it('stage "subgenerators" accepted → generates one agent proposal, persists "agents"', async () => {
      mockPrismaService.workspaceConversationMessage.findFirst.mockResolvedValue({
        id: 'msg-run',
        metadata: {
          ...runState,
          stage: 'subgenerators',
          interfaceProposalId: 'prop-iface',
          automationProposalId: 'prop-auto',
        },
      });
      mockPrismaService.workspaceConversationMessage.findMany.mockResolvedValue([
        { metadata: { accepted: true } },
        { metadata: { accepted: true } },
      ]);
      vi.mocked(generateObject).mockResolvedValueOnce({
        object: {
          name: 'Assistant Stock',
          instructions: 'Aide à gérer le stock.',
          tools: ['search_records'],
        },
      } as any);

      const events = [];
      for await (const event of service.continueFullApp('conv-1')) events.push(event);

      expect(mockActionProposalService.createProposal).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'create_agent' })
      );
      expect(mockPrismaService.workspaceConversationMessage.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            metadata: expect.objectContaining({
              stage: 'agents',
              agentProposalIds: expect.any(Array),
            }),
          }),
        })
      );
      expect(events.at(-2)).toMatchObject({ type: 'awaiting_acceptance', stage: 'agents' });
    });

    it('stage "agents" accepted → delivers a report and marks the run "done"', async () => {
      mockPrismaService.workspaceConversationMessage.findFirst.mockResolvedValue({
        id: 'msg-run',
        metadata: {
          ...runState,
          stage: 'agents',
          interfaceProposalId: 'prop-iface',
          automationProposalId: 'prop-auto',
          agentProposalIds: ['prop-agent'],
        },
      });
      mockPrismaService.workspaceConversationMessage.findMany.mockResolvedValue([
        { metadata: { accepted: true } },
      ]);

      const events = [];
      for await (const event of service.continueFullApp('conv-1')) events.push(event);

      const reportEvent = events.find((e) => e.type === 'report');
      expect(reportEvent?.data).toMatchObject({
        tablesCreated: 2,
        interfaceCreated: true,
        automationCreated: true,
        agentsCreated: 1,
        mockRecordsFilled: 0,
      });
      expect(events.at(-1)).toEqual({ type: 'done' });
      expect(mockPrismaService.workspaceConversationMessage.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ metadata: expect.objectContaining({ stage: 'done' }) }),
        })
      );
      // No tables found for this run (tableMeta.findMany mocked to []) — mock_data stage has
      // nothing to fill, so it skips straight through to the report without calling generateObject.
      expect(generateObject).not.toHaveBeenCalled();
    });

    it('stage "agents" accepted, an empty table exists → proposes mock data and awaits acceptance for "mock_data"', async () => {
      mockPrismaService.workspaceConversationMessage.findFirst.mockResolvedValue({
        id: 'msg-run',
        metadata: {
          ...runState,
          stage: 'agents',
          interfaceProposalId: 'prop-iface',
          automationProposalId: 'prop-auto',
          agentProposalIds: ['prop-agent'],
        },
      });
      mockPrismaService.workspaceConversationMessage.findMany.mockResolvedValue([
        { metadata: { accepted: true } },
      ]);
      mockPrismaService.tableMeta.findMany.mockResolvedValue([{ id: 'tbl1', name: 'Produits' }]);
      mockPrismaService.field.findMany.mockResolvedValue([{ name: 'Nom', type: 'singleLineText' }]);
      mockRecordService.getRecords.mockResolvedValue({
        records: [{ id: 'rec1', fields: { Nom: null } }],
      });
      vi.mocked(generateObject).mockResolvedValue({
        object: { records: [{ Nom: 'Produit Test' }] },
      } as any);

      const events = [];
      for await (const event of service.continueFullApp('conv-1')) events.push(event);

      expect(generateObject).toHaveBeenCalledTimes(1);
      expect(mockActionProposalService.createProposal).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'update_record',
          args: { tableId: 'tbl1', recordId: 'rec1', fields: { Nom: 'Produit Test' } },
        })
      );
      expect(events.find((e) => e.type === 'report')).toBeUndefined();
      expect(events.at(-2)).toMatchObject({ type: 'awaiting_acceptance', stage: 'mock_data' });
      expect(mockPrismaService.workspaceConversationMessage.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            metadata: expect.objectContaining({ stage: 'mock_data' }),
          }),
        })
      );
    });

    it('stage "mock_data" accepted → delivers a report including the fill count', async () => {
      mockPrismaService.workspaceConversationMessage.findFirst.mockResolvedValue({
        id: 'msg-run',
        metadata: {
          ...runState,
          stage: 'mock_data',
          interfaceProposalId: 'prop-iface',
          automationProposalId: 'prop-auto',
          agentProposalIds: ['prop-agent'],
          mockDataProposalIds: ['prop-mock1'],
        },
      });
      mockPrismaService.workspaceConversationMessage.findMany.mockResolvedValue([
        { metadata: { accepted: true } },
      ]);

      const events = [];
      for await (const event of service.continueFullApp('conv-1')) events.push(event);

      const reportEvent = events.find((e) => e.type === 'report');
      expect(reportEvent?.data).toMatchObject({ mockRecordsFilled: 1 });
      expect(events.at(-1)).toEqual({ type: 'done' });
    });

    it('stage "done" → error, no further work', async () => {
      mockPrismaService.workspaceConversationMessage.findFirst.mockResolvedValue({
        id: 'msg-run',
        metadata: { ...runState, stage: 'done' },
      });

      const events = [];
      for await (const event of service.continueFullApp('conv-1')) events.push(event);

      expect(events).toEqual([
        { type: 'error', content: expect.stringContaining('déjà terminée') },
        { type: 'done' },
      ]);
      expect(mockActionProposalService.createProposal).not.toHaveBeenCalled();
    });
  });
});
