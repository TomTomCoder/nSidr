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
};

// Mock generateText from ai
vi.mock('ai', () => ({
  generateText: vi.fn(),
  tool: vi.fn((def) => def),
  jsonSchema: vi.fn((schema) => schema),
  zodSchema: vi.fn((schema) => schema),
}));

import { generateText } from 'ai';

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
});
