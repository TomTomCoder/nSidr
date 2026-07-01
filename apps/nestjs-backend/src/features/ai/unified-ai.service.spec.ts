import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnifiedAiService } from './unified-ai.service';

// Mock workspace state service
const mockWorkspaceStateService = {
  getSnapshot: vi.fn(),
};

// Mock action proposal service
const mockActionProposalService = {
  createProposal: vi.fn(),
};

// Mock record service
const mockRecordService = {
  getRecords: vi.fn(),
};

// Mock AI service
const mockAiService = {
  getAIConfig: vi.fn(),
  getAIConfigBySpaceId: vi.fn(),
  getModelInstance: vi.fn(),
  embed: vi.fn(),
};

// Mock Prisma service
const mockPrismaService = {
  workspaceConversation: {
    create: vi.fn(),
    findUnique: vi.fn(),
  },
  workspaceConversationMessage: {
    create: vi.fn(),
  },
  field: {
    findMany: vi.fn().mockResolvedValue([]),
  },
  tableMeta: {
    findFirst: vi.fn().mockResolvedValue(null),
  },
};

// Mock generateText from ai
vi.mock('ai', () => ({
  generateText: vi.fn(),
  generateObject: vi.fn(),
  tool: vi.fn((def) => def),
  jsonSchema: vi.fn((schema) => schema),
  zodSchema: vi.fn((schema) => schema),
  stepCountIs: vi.fn((n) => n),
}));

import { generateText, generateObject } from 'ai';

const mockSnapshot = {
  bases: [{ id: 'base-1', name: 'My Base', tables: [] }],
  integrations: [],
  agentTriggers: [],
  plugins: [],
};

const createService = () =>
  new UnifiedAiService(
    mockPrismaService as any,
    mockWorkspaceStateService as any,
    mockActionProposalService as any,
    mockRecordService as any,
    mockAiService as any
  );

describe('UnifiedAiService', () => {
  let service: UnifiedAiService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = createService();

    mockWorkspaceStateService.getSnapshot.mockResolvedValue(mockSnapshot);
    mockAiService.getAIConfig.mockResolvedValue({ llmProviders: [] });
    mockAiService.getModelInstance.mockResolvedValue('mock-model');
    mockPrismaService.workspaceConversation.create.mockResolvedValue({
      id: 'conv-123',
      spaceId: 'space-1',
      status: 'in_progress',
    });
    mockPrismaService.workspaceConversationMessage.create.mockResolvedValue({ id: 'msg-1' });
  });

  it('Test 1: chat() calls workspaceStateService.getSnapshot(spaceId) exactly once before streaming', async () => {
    vi.mocked(generateText).mockResolvedValue({
      text: 'Hello!',
      steps: [{ text: 'Hello!', toolCalls: [], toolResults: [] }],
    } as any);

    const ctx = { spaceId: 'space-1', userId: 'user-1', message: 'Hello', modelKey: 'test-model' };
    const events = [];
    for await (const event of service.chat(ctx)) {
      events.push(event);
    }

    expect(mockWorkspaceStateService.getSnapshot).toHaveBeenCalledTimes(1);
    expect(mockWorkspaceStateService.getSnapshot).toHaveBeenCalledWith('space-1');
  });

  it('Test 2: chat() yields at least one text_chunk event when LLM returns text', async () => {
    vi.mocked(generateText).mockResolvedValue({
      text: 'Hello! I can help you with that.',
      steps: [{ text: 'Hello! I can help you with that.', toolCalls: [], toolResults: [] }],
    } as any);

    const ctx = { spaceId: 'space-1', userId: 'user-1', message: 'Hi', modelKey: 'test-model' };
    const events = [];
    for await (const event of service.chat(ctx)) {
      events.push(event);
    }

    const textChunks = events.filter((e) => e.type === 'text_chunk');
    expect(textChunks.length).toBeGreaterThan(0);
    expect(textChunks[0].content).toBe('Hello! I can help you with that.');
  });

  it('Test 3: chat() yields proposal event (not tool_result) when LLM calls write tool like create_table', async () => {
    const mockProposal = {
      proposalId: 'prop-uuid-1',
      action: 'create_table',
      preview: { tableName: 'Projects' },
      conversationMessageId: 'msg-abc',
    };
    mockActionProposalService.createProposal.mockResolvedValue(mockProposal);

    vi.mocked(generateText).mockResolvedValue({
      text: '',
      steps: [
        {
          text: '',
          toolCalls: [{ toolName: 'create_table', args: { baseId: 'base-1', name: 'Projects' } }],
          toolResults: [
            {
              toolName: 'create_table',
              // AI SDK v6 exposes tool output under `output` (not `result`)
              output: {
                __type: 'proposal',
                proposalId: 'prop-uuid-1',
                action: 'create_table',
                preview: { tableName: 'Projects' },
              },
            },
          ],
        },
      ],
    } as any);

    const ctx = {
      spaceId: 'space-1',
      userId: 'user-1',
      message: 'Create a table',
      modelKey: 'test-model',
    };
    const events = [];
    for await (const event of service.chat(ctx)) {
      events.push(event);
    }

    const proposalEvents = events.filter((e) => e.type === 'proposal');
    const toolResultEvents = events.filter((e) => e.type === 'tool_result');
    expect(proposalEvents.length).toBeGreaterThan(0);
    expect(toolResultEvents.length).toBe(0);
  });

  it('Test 4: chat() yields tool_result event (not proposal) when LLM calls read tool get_workspace_state', async () => {
    vi.mocked(generateText).mockResolvedValue({
      text: 'Here is your workspace state.',
      steps: [
        {
          text: 'Here is your workspace state.',
          toolCalls: [{ toolName: 'get_workspace_state', args: {} }],
          toolResults: [
            {
              toolName: 'get_workspace_state',
              // AI SDK v6 exposes tool output under `output` (not `result`)
              output: mockSnapshot, // read tools return data directly, no __type: 'proposal'
            },
          ],
        },
      ],
    } as any);

    const ctx = {
      spaceId: 'space-1',
      userId: 'user-1',
      message: 'What tables do I have?',
      modelKey: 'test-model',
    };
    const events = [];
    for await (const event of service.chat(ctx)) {
      events.push(event);
    }

    const toolResultEvents = events.filter((e) => e.type === 'tool_result');
    const proposalEvents = events.filter((e) => e.type === 'proposal');
    expect(toolResultEvents.length).toBeGreaterThan(0);
    expect(proposalEvents.length).toBe(0);
    expect(toolResultEvents[0].toolName).toBe('get_workspace_state');
  });

  it('Test 5: chat() saves one user message and one assistant message after streaming', async () => {
    vi.mocked(generateText).mockResolvedValue({
      text: 'Done!',
      steps: [{ text: 'Done!', toolCalls: [], toolResults: [] }],
    } as any);

    const ctx = { spaceId: 'space-1', userId: 'user-1', message: 'Hello', modelKey: 'test-model' };
    const events = [];
    for await (const event of service.chat(ctx)) {
      events.push(event);
    }

    // Should have at least 2 message saves: user + assistant
    expect(mockPrismaService.workspaceConversationMessage.create).toHaveBeenCalledTimes(2);

    const calls = mockPrismaService.workspaceConversationMessage.create.mock.calls;
    const userCall = calls.find((c: any[]) => c[0].data.role === 'user');
    const assistantCall = calls.find((c: any[]) => c[0].data.role === 'assistant');
    expect(userCall).toBeDefined();
    expect(assistantCall).toBeDefined();
    expect(userCall[0].data.content).toBe('Hello');
  });

  it('Test 6: chat() with no conversationId creates a new WorkspaceConversation', async () => {
    vi.mocked(generateText).mockResolvedValue({
      text: 'Hello!',
      steps: [{ text: 'Hello!', toolCalls: [], toolResults: [] }],
    } as any);

    const ctx = { spaceId: 'space-1', userId: 'user-1', message: 'Hi', modelKey: 'test-model' };
    const events = [];
    for await (const event of service.chat(ctx)) {
      events.push(event);
    }

    expect(mockPrismaService.workspaceConversation.create).toHaveBeenCalledTimes(1);
    expect(mockPrismaService.workspaceConversation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          spaceId: 'space-1',
          createdBy: 'user-1',
          status: 'in_progress',
        }),
      })
    );
  });

  it('Test 7: chat() with existing conversationId reuses conversation without creating new', async () => {
    const existingConv = { id: 'existing-conv', spaceId: 'space-1', status: 'in_progress' };
    mockPrismaService.workspaceConversation.findUnique.mockResolvedValue(existingConv);

    vi.mocked(generateText).mockResolvedValue({
      text: 'Hello again!',
      steps: [{ text: 'Hello again!', toolCalls: [], toolResults: [] }],
    } as any);

    const ctx = {
      spaceId: 'space-1',
      userId: 'user-1',
      message: 'Continue',
      modelKey: 'test-model',
      conversationId: 'existing-conv',
    };
    const events = [];
    for await (const event of service.chat(ctx)) {
      events.push(event);
    }

    expect(mockPrismaService.workspaceConversation.create).not.toHaveBeenCalled();
    expect(mockPrismaService.workspaceConversation.findUnique).toHaveBeenCalledWith({
      where: { id: 'existing-conv' },
    });
  });

  describe('disambiguation — ask instead of guessing on genuine ambiguity', () => {
    it('Test 10: asks which base when several bases exist, none active, and no baseName hint matches', async () => {
      mockWorkspaceStateService.getSnapshot.mockResolvedValue({
        bases: [
          { id: 'base-1', name: 'Marketing', tables: [] },
          { id: 'base-2', name: 'Sales', tables: [] },
        ],
        integrations: [],
        agentTriggers: [],
        plugins: [],
      });

      vi.mocked(generateText).mockImplementation(async (opts: any) => {
        const createTableTool = opts.tools.create_table;
        const output = await createTableTool.execute({ name: 'Projects' });
        return {
          text: '',
          steps: [{ text: '', toolCalls: [], toolResults: [{ toolName: 'create_table', output }] }],
        } as any;
      });

      const ctx = {
        spaceId: 'space-1',
        userId: 'user-1',
        message: 'Crée une table Projects',
        modelKey: 'test-model',
      };
      const events = [];
      for await (const event of service.chat(ctx)) {
        events.push(event);
      }

      expect(events.some((e) => e.type === 'proposal')).toBe(false);
      const textChunk = events.find((e) => e.type === 'text_chunk');
      expect(textChunk?.content).toMatch(/Marketing/);
      expect(textChunk?.content).toMatch(/Sales/);
    });

    it('Test 11: asks for clarification when tableName has no match in the workspace', async () => {
      vi.mocked(generateText).mockImplementation(async (opts: any) => {
        const createRecordTool = opts.tools.create_record;
        const output = await createRecordTool.execute({
          tableName: 'Inexistante',
          baseId: 'base-1',
          fields: { Name: 'foo' },
        });
        return {
          text: '',
          steps: [
            { text: '', toolCalls: [], toolResults: [{ toolName: 'create_record', output }] },
          ],
        } as any;
      });

      const ctx = {
        spaceId: 'space-1',
        userId: 'user-1',
        message: 'Ajoute un enregistrement dans Inexistante',
        modelKey: 'test-model',
        activeBaseId: 'base-1',
      };
      const events = [];
      for await (const event of service.chat(ctx)) {
        events.push(event);
      }

      expect(events.some((e) => e.type === 'proposal')).toBe(false);
      const textChunk = events.find((e) => e.type === 'text_chunk');
      expect(textChunk?.content).toMatch(/Inexistante/);
      expect(mockActionProposalService.createProposal).not.toHaveBeenCalled();
    });
  });

  describe('generateEmbeddings — GW-04 gateway routing (D-15-04)', () => {
    it('Test 8: throws CustomHttpException when embeddingProvider is not configured (no silent fallback)', async () => {
      // aiConfig has no embeddingProvider → must throw, no fetch issued
      mockAiService.getAIConfigBySpaceId.mockResolvedValue({
        llmProviders: [],
        // embeddingProvider deliberately absent
      });

      await expect(service.generateEmbeddings(['hello'], 'space-1')).rejects.toMatchObject({
        message: expect.stringContaining('embedding provider'),
        status: 400,
      });

      // Must not call aiService.embed at all
      expect(mockAiService.embed).not.toHaveBeenCalled();
    });

    it('Test 9: routes through aiService.embed when embeddingProvider is configured', async () => {
      const mockEmbeddings = [[0.1, 0.2, 0.3]];
      mockAiService.getAIConfigBySpaceId.mockResolvedValue({
        llmProviders: [{ type: 'openai', name: 'my-openai', models: [] }],
        embeddingProvider: {
          providerType: 'openai',
          providerName: 'my-openai',
          modelId: 'text-embedding-3-small',
        },
      });
      mockAiService.embed.mockResolvedValue(mockEmbeddings);

      const result = await service.generateEmbeddings(['hello'], 'space-1');

      // Must build model key as providerType@modelId@providerName
      expect(mockAiService.embed).toHaveBeenCalledWith(
        ['hello'],
        'openai@text-embedding-3-small@my-openai',
        expect.any(Array)
      );
      expect(result).toEqual(mockEmbeddings);
    });
  });

  describe("targetType restriction — only the picked target's write tools are registered", () => {
    it('targetType "automation" exposes create_automation but not create_table/create_app_interface', async () => {
      let seenTools: Record<string, unknown> = {};
      vi.mocked(generateText).mockImplementation(async (opts: any) => {
        seenTools = opts.tools;
        return { text: 'ok', steps: [{ text: 'ok', toolCalls: [], toolResults: [] }] } as any;
      });

      const ctx = {
        spaceId: 'space-1',
        userId: 'user-1',
        message: 'Crée une automation',
        modelKey: 'test-model',
        targetType: 'automation' as const,
      };
      for await (const _event of service.chat(ctx)) {
        // drain
      }

      expect(seenTools.create_automation).toBeDefined();
      expect(seenTools.create_table).toBeUndefined();
      expect(seenTools.create_app_interface).toBeUndefined();
      expect(seenTools.create_agent).toBeUndefined();
      // Read tools stay available regardless of targetType
      expect(seenTools.get_workspace_state).toBeDefined();
    });

    it('no targetType exposes every write tool (back-compat free-text flow)', async () => {
      let seenTools: Record<string, unknown> = {};
      vi.mocked(generateText).mockImplementation(async (opts: any) => {
        seenTools = opts.tools;
        return { text: 'ok', steps: [{ text: 'ok', toolCalls: [], toolResults: [] }] } as any;
      });

      const ctx = {
        spaceId: 'space-1',
        userId: 'user-1',
        message: "Fais ce qu'il faut",
        modelKey: 'test-model',
      };
      for await (const _event of service.chat(ctx)) {
        // drain
      }

      expect(seenTools.create_table).toBeDefined();
      expect(seenTools.create_automation).toBeDefined();
      expect(seenTools.create_agent).toBeDefined();
      expect(seenTools.create_app_interface).toBeDefined();
    });
  });

  describe('create_agent tool schema (Phase 2) — only real tool names accepted', () => {
    it('rejects an invented tool name and accepts a real one', async () => {
      let seenTools: Record<
        string,
        { parameters: { safeParse: (v: unknown) => { success: boolean } } }
      > = {};
      vi.mocked(generateText).mockImplementation(async (opts: any) => {
        seenTools = opts.tools;
        return { text: 'ok', steps: [{ text: 'ok', toolCalls: [], toolResults: [] }] } as any;
      });

      const ctx = {
        spaceId: 'space-1',
        userId: 'user-1',
        message: 'Crée un agent',
        modelKey: 'test-model',
        targetType: 'agent' as const,
      };
      for await (const _event of service.chat(ctx)) {
        // drain
      }

      const schema = seenTools.create_agent.parameters;
      expect(
        schema.safeParse({ name: 'Bot', instructions: 'x', tools: ['not_a_real_tool'] }).success
      ).toBe(false);
      expect(
        schema.safeParse({ name: 'Bot', instructions: 'x', tools: ['search_records'] }).success
      ).toBe(true);
    });
  });

  describe('generateMockDataForCurrentTable — "Données fictives"', () => {
    const mockTableSnapshot = {
      bases: [
        {
          id: 'base-1',
          name: 'Base',
          tables: [
            {
              id: 'tbl-1',
              name: 'Items',
              fields: [
                { name: 'Name', type: 'singleLineText' },
                { name: 'Qty', type: 'number' },
              ],
            },
          ],
        },
      ],
      integrations: [],
      agentTriggers: [],
      plugins: [],
    };

    it('asks the user to open a table when pageContext has no tableId/tableName', async () => {
      mockWorkspaceStateService.getSnapshot.mockResolvedValue(mockTableSnapshot);

      const ctx = {
        spaceId: 'space-1',
        userId: 'user-1',
        message: 'Génère des données',
        modelKey: 'test-model',
        targetType: 'mock_data' as const,
      };
      const events = [];
      for await (const event of service.chat(ctx)) events.push(event);

      expect(mockRecordService.getRecords).not.toHaveBeenCalled();
      expect(events.some((e) => e.type === 'proposal')).toBe(false);
      expect(events.find((e) => e.type === 'text_chunk')?.content).toMatch(/Ouvre une table/);
    });

    it('skips rows and reports "already has data" when no row is empty', async () => {
      mockWorkspaceStateService.getSnapshot.mockResolvedValue(mockTableSnapshot);
      mockRecordService.getRecords.mockResolvedValue({
        records: [
          { id: 'rec-1', fields: { Name: 'Alpha', Qty: 1 } },
          { id: 'rec-2', fields: { Name: 'Beta', Qty: 2 } },
        ],
      });

      const ctx = {
        spaceId: 'space-1',
        userId: 'user-1',
        message: 'Génère des données',
        modelKey: 'test-model',
        targetType: 'mock_data' as const,
        pageContext: { tableId: 'tbl-1' },
      };
      const events = [];
      for await (const event of service.chat(ctx)) events.push(event);

      expect(vi.mocked(generateObject)).not.toHaveBeenCalled();
      expect(events.some((e) => e.type === 'proposal')).toBe(false);
      expect(events.find((e) => e.type === 'text_chunk')?.content).toMatch(
        /contient déjà des données/
      );
    });

    it('proposes an update_record per empty row, filled with LLM-generated values', async () => {
      mockWorkspaceStateService.getSnapshot.mockResolvedValue(mockTableSnapshot);
      mockRecordService.getRecords.mockResolvedValue({
        records: [
          { id: 'rec-1', fields: { Name: null, Qty: null } },
          { id: 'rec-2', fields: { Name: '', Qty: undefined } },
          { id: 'rec-3', fields: { Name: 'Filled', Qty: 9 } },
        ],
      });
      vi.mocked(generateObject).mockResolvedValue({
        object: {
          records: [
            { Name: 'Alpha', Qty: 10 },
            { Name: 'Beta', Qty: 20 },
          ],
        },
      } as any);
      mockActionProposalService.createProposal.mockImplementation(async (input: any) => ({
        proposalId: `prop-${input.args.recordId}`,
        action: input.action,
        preview: input.preview,
        conversationMessageId: 'msg-x',
      }));

      const ctx = {
        spaceId: 'space-1',
        userId: 'user-1',
        message: 'Génère des données fictives sur le thème jardinage',
        modelKey: 'test-model',
        targetType: 'mock_data' as const,
        pageContext: { tableId: 'tbl-1' },
      };
      const events = [];
      for await (const event of service.chat(ctx)) events.push(event);

      const proposals = events.filter((e) => e.type === 'proposal');
      expect(proposals).toHaveLength(2);
      expect(proposals.every((p: any) => p.proposal.action === 'update_record')).toBe(true);

      const calls = mockActionProposalService.createProposal.mock.calls;
      expect(calls[0][0].args).toMatchObject({
        tableId: 'tbl-1',
        recordId: 'rec-1',
        fields: { Name: 'Alpha', Qty: 10 },
      });
      expect(calls[1][0].args).toMatchObject({
        tableId: 'tbl-1',
        recordId: 'rec-2',
        fields: { Name: 'Beta', Qty: 20 },
      });
    });

    it('does not throw and proposes fewer rows when the LLM returns fewer records than empty rows', async () => {
      mockWorkspaceStateService.getSnapshot.mockResolvedValue(mockTableSnapshot);
      mockRecordService.getRecords.mockResolvedValue({
        records: [
          { id: 'rec-1', fields: { Name: null, Qty: null } },
          { id: 'rec-2', fields: { Name: null, Qty: null } },
        ],
      });
      // LLM only returns 1 record even though there are 2 empty rows — must not throw.
      vi.mocked(generateObject).mockResolvedValue({
        object: { records: [{ Name: 'Solo', Qty: 1 }] },
      } as any);
      mockActionProposalService.createProposal.mockImplementation(async (input: any) => ({
        proposalId: `prop-${input.args.recordId}`,
        action: input.action,
        preview: input.preview,
        conversationMessageId: 'msg-x',
      }));

      const ctx = {
        spaceId: 'space-1',
        userId: 'user-1',
        message: 'Génère des données',
        modelKey: 'test-model',
        targetType: 'mock_data' as const,
        pageContext: { tableId: 'tbl-1' },
      };
      const events = [];
      for await (const event of service.chat(ctx)) events.push(event);

      expect(events.some((e) => e.type === 'error')).toBe(false);
      const proposals = events.filter((e) => e.type === 'proposal');
      expect(proposals).toHaveLength(1);
    });

    describe('Phase 4 — relation fields use real linked-record IDs', () => {
      const linkSnapshot = {
        bases: [
          {
            id: 'base-1',
            name: 'Base',
            tables: [
              {
                id: 'tbl-contacts',
                name: 'Contacts',
                fields: [
                  { name: 'Name', type: 'singleLineText' },
                  { name: 'Entreprise', type: 'link' },
                ],
              },
            ],
          },
        ],
        integrations: [],
        agentTriggers: [],
        plugins: [],
      };

      beforeEach(() => {
        mockPrismaService.field.findMany.mockResolvedValue([
          { name: 'Name', type: 'singleLineText', options: null, unique: false },
          {
            name: 'Entreprise',
            type: 'link',
            options: JSON.stringify({ foreignTableId: 'tbl-company', relationship: 'manyOne' }),
            unique: false,
          },
        ]);
      });

      it('non-empty foreign table → generated link value constrained to a real record ID', async () => {
        mockWorkspaceStateService.getSnapshot.mockResolvedValue(linkSnapshot);
        mockRecordService.getRecords.mockImplementation(async (tableId: string) =>
          tableId === 'tbl-company'
            ? { records: [{ id: 'recCompanyA', fields: { Name: 'Acme' } }] }
            : { records: [{ id: 'rec-1', fields: { Name: null, Entreprise: null } }] }
        );
        vi.mocked(generateObject).mockImplementation(async (opts: any) => {
          // The schema must only accept the real foreign record ID.
          expect(opts.schema.shape.records.element.shape.Entreprise.shape.id.options).toEqual([
            'recCompanyA',
          ]);
          return {
            object: { records: [{ Name: 'Alpha', Entreprise: { id: 'recCompanyA' } }] },
          } as any;
        });
        mockActionProposalService.createProposal.mockImplementation(async (input: any) => ({
          proposalId: 'prop-1',
          action: input.action,
          preview: input.preview,
          conversationMessageId: 'msg-x',
        }));

        const ctx = {
          spaceId: 'space-1',
          userId: 'user-1',
          message: 'Génère des contacts',
          modelKey: 'test-model',
          targetType: 'mock_data' as const,
          pageContext: { tableId: 'tbl-contacts' },
        };
        const events = [];
        for await (const event of service.chat(ctx)) events.push(event);

        expect(events.some((e) => e.type === 'error')).toBe(false);
        expect(events.filter((e) => e.type === 'proposal')).toHaveLength(1);
      });

      it('empty foreign table → explicit message, no proposal, no orphaned link', async () => {
        mockWorkspaceStateService.getSnapshot.mockResolvedValue(linkSnapshot);
        mockPrismaService.tableMeta.findFirst.mockResolvedValue({ name: 'Entreprises' });
        mockRecordService.getRecords.mockImplementation(async (tableId: string) =>
          tableId === 'tbl-company'
            ? { records: [] }
            : { records: [{ id: 'rec-1', fields: { Name: null, Entreprise: null } }] }
        );

        const ctx = {
          spaceId: 'space-1',
          userId: 'user-1',
          message: 'Génère des contacts',
          modelKey: 'test-model',
          targetType: 'mock_data' as const,
          pageContext: { tableId: 'tbl-contacts' },
        };
        const events = [];
        for await (const event of service.chat(ctx)) events.push(event);

        expect(vi.mocked(generateObject)).not.toHaveBeenCalled();
        expect(events.some((e) => e.type === 'proposal')).toBe(false);
        expect(events.find((e) => e.type === 'text_chunk')?.content).toMatch(/Entreprises.*vide/);
      });
    });

    it('Phase 4 — unique field collision with an existing value is dropped, not proposed', async () => {
      mockWorkspaceStateService.getSnapshot.mockResolvedValue(mockTableSnapshot);
      mockPrismaService.field.findMany.mockResolvedValue([
        { name: 'Name', type: 'singleLineText', options: null, unique: true },
        { name: 'Qty', type: 'number', options: null, unique: false },
      ]);
      mockRecordService.getRecords.mockResolvedValue({
        records: [
          { id: 'rec-1', fields: { Name: 'Existing', Qty: 5 } },
          { id: 'rec-2', fields: { Name: null, Qty: null } },
        ],
      });
      vi.mocked(generateObject).mockResolvedValue({
        object: { records: [{ Name: 'Existing', Qty: 1 }] },
      } as any);

      const ctx = {
        spaceId: 'space-1',
        userId: 'user-1',
        message: 'Génère des données',
        modelKey: 'test-model',
        targetType: 'mock_data' as const,
        pageContext: { tableId: 'tbl-1' },
      };
      const events = [];
      for await (const event of service.chat(ctx)) events.push(event);

      expect(events.some((e) => e.type === 'error')).toBe(false);
      expect(events.filter((e) => e.type === 'proposal')).toHaveLength(0);
    });
  });

  describe('generateMockValue', () => {
    const call = (name: string, type: string | undefined, row: number) =>
      (service as any).generateMockValue(name, type, row);

    it('routes by name keyword: email-like field yields an email', () => {
      const v = call('Adresse mail', undefined, 0);
      expect(typeof v).toBe('string');
      expect(v).toMatch(/@/);
    });

    it('falls back to field type when name does not match', () => {
      expect(typeof call('foo', 'number', 0)).toBe('number');
      expect(typeof call('foo', 'checkbox', 0)).toBe('boolean');
    });

    it('is deterministic per rowIndex', () => {
      expect(call('Prénom', undefined, 0)).toBe(call('Prénom', undefined, 0));
    });
  });

  // P0-1: actionable error messages
  describe('actionable error messages (P0-1)', () => {
    it('provider absent → error event carries an actionable FR message (no stack/undefined)', async () => {
      // No AI model configured — resolveModelInstance throws this exact message.
      mockAiService.getAIConfig.mockResolvedValue({ llmProviders: [], chatModel: undefined });
      const ctx = {
        spaceId: 'space-1',
        userId: 'user-1',
        message: 'Hi',
        modelKey: '', // no explicit model → falls back to chatModel.lg which is undefined
      };
      const events = [];
      for await (const event of service.chat(ctx)) {
        events.push(event);
      }
      const errorEvents = events.filter((e) => e.type === 'error');
      expect(errorEvents.length).toBeGreaterThan(0);
      const msg = errorEvents[0].content ?? '';
      expect(msg).toContain('Aucun modèle IA configuré');
      expect(msg).toContain('Paramètres');
      expect(msg).not.toContain('undefined');
      expect(msg.toLowerCase()).not.toContain('at ('); // no stack trace leaked
    });

    it('toActionableMessage maps known cases and never leaks raw text by default', () => {
      const map = UnifiedAiService.toActionableMessage.bind(UnifiedAiService);
      expect(map(new Error('No AI model configured'))).toContain('Aucun modèle IA configuré');
      expect(map({ status: 401, message: 'x' })).toContain('Clé API');
      expect(map({ status: 429, message: 'x' })).toContain('Quota');
      expect(map({ status: 404, message: 'x' })).toContain('introuvable');
      expect(map(new Error('model does not support this'))).toContain('ne prend pas en charge');
      // Unknown → generic fallback, raw text not surfaced
      const generic = map(new Error('ECONNRESET secret-token-xyz'));
      expect(generic).not.toContain('secret-token-xyz');
      expect(generic).toContain('Une erreur est survenue');
    });
  });
});
