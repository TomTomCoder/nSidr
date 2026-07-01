import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnifiedAiService } from './unified-ai.service';

// Mirror the ai-SDK mocks used by unified-ai.service.spec.ts so the tool() factory
// returns its definition object unchanged (lets us inspect the registered tool map).
vi.mock('ai', () => ({
  generateText: vi.fn(),
  generateObject: vi.fn(),
  tool: vi.fn((def) => def),
  jsonSchema: vi.fn((schema) => schema),
  zodSchema: vi.fn((schema) => schema),
  stepCountIs: vi.fn((n) => n),
}));

import { generateText } from 'ai';

const mockSnapshot = {
  bases: [{ id: 'base-1', name: 'My Base', tables: [] }],
  integrations: [],
  agentTriggers: [],
  plugins: [],
};

const mockPrismaService = {
  workspaceConversation: {
    create: vi.fn(),
    findUnique: vi.fn().mockResolvedValue(null),
  },
  workspaceConversationMessage: { create: vi.fn() },
  base: { findFirst: vi.fn().mockResolvedValue(null) },
};
const mockWorkspaceStateService = { getSnapshot: vi.fn() };
const mockActionProposalService = { createProposal: vi.fn() };
const mockRecordService = { getRecords: vi.fn().mockResolvedValue({ records: [] }) };
const mockDocSearchService = { hybridSearch: vi.fn().mockResolvedValue([]) };
const mockAiService = {
  getAIConfig: vi.fn(),
  getModelInstance: vi.fn(),
};

const createService = () =>
  new UnifiedAiService(
    mockPrismaService as any,
    mockWorkspaceStateService as any,
    mockActionProposalService as any,
    mockRecordService as any,
    mockDocSearchService as any,
    mockAiService as any
  );

describe('UnifiedAiService — targetType "docs" (P1-8)', () => {
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

  it('exposes exactly the doc tools (read search + write create/update/link) and no other write tools', async () => {
    let seenTools: Record<string, unknown> = {};
    vi.mocked(generateText).mockImplementation(async (opts: any) => {
      seenTools = opts.tools;
      return { text: 'ok', steps: [{ text: 'ok', toolCalls: [], toolResults: [] }] } as any;
    });

    const ctx = {
      spaceId: 'space-1',
      userId: 'user-1',
      message: 'Crée un document',
      modelKey: 'test-model',
      targetType: 'docs' as const,
    };
    for await (const _event of service.chat(ctx)) {
      // drain
    }

    // READ tool always available
    expect(seenTools.search_knowledge_base).toBeDefined();
    expect(seenTools.get_workspace_state).toBeDefined();

    // WRITE tools for the docs target
    expect(seenTools.create_knowledge_doc).toBeDefined();
    expect(seenTools.update_knowledge_doc).toBeDefined();
    expect(seenTools.link_docs).toBeDefined();

    // Write tools of OTHER targets must be excluded
    expect(seenTools.create_table).toBeUndefined();
    expect(seenTools.create_automation).toBeUndefined();
    expect(seenTools.create_agent).toBeUndefined();
    expect(seenTools.create_app_interface).toBeUndefined();
  });
});
