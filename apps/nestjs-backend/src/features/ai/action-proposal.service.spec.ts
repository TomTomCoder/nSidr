import { ConflictException, NotFoundException } from '@nestjs/common';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ActionProposalService } from './action-proposal.service';

const mockPrismaService = {
  workspaceConversationMessage: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  workspaceConversation: {
    findUnique: vi.fn().mockResolvedValue(null),
  },
};

describe('ActionProposalService', () => {
  let service: ActionProposalService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ActionProposalService(
      mockPrismaService as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any
    );
  });

  it('Test 1: createProposal returns { proposalId, action, preview, conversationMessageId }', async () => {
    const createdMessage = {
      id: 'msg-123',
      proposalId: 'some-uuid',
    };
    mockPrismaService.workspaceConversationMessage.create.mockResolvedValue(createdMessage);

    const result = await service.createProposal({
      action: 'create_table',
      args: { baseId: 'base-1', name: 'Projects', fields: [{ name: 'Name', type: 'text' }] },
      conversationId: 'conv-1',
      preview: { tableName: 'Projects', fields: [] },
    });

    expect(result).toHaveProperty('proposalId');
    expect(typeof result.proposalId).toBe('string');
    expect(result.proposalId.length).toBeGreaterThan(0);
    expect(result.action).toBe('create_table');
    expect(result).toHaveProperty('preview');
    expect(result).toHaveProperty('conversationMessageId');
    expect(result.conversationMessageId).toBe('msg-123');
  });

  it('create_view: native type resolves tableName, "ai" type uses generateViewConfig', async () => {
    const mockView = { createView: vi.fn().mockResolvedValue({ id: 'viw1' }) };
    const mockAi = {
      generateViewConfig: vi.fn().mockResolvedValue({
        type: 'kanban',
        name: 'Urgent board',
        filter: { conjunction: 'and', filterSet: [] },
      }),
    };
    const prisma = {
      ...mockPrismaService,
      tableMeta: { findFirst: vi.fn().mockResolvedValue({ id: 'tblResolved' }) },
    };
    // ctor order: prisma, baseNode, record, view, ai, field, workflowAi, workflow, agent
    const svc = new ActionProposalService(
      prisma as any,
      {} as any,
      {} as any,
      mockView as any,
      mockAi as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any
    );

    // native: tableName → tableId, created directly
    await (svc as any).executeAction(
      'create_view',
      { tableName: 'Projects', baseId: 'base-1', type: 'KANBAN', name: 'Board' },
      'user-1'
    );
    expect(prisma.tableMeta.findFirst).toHaveBeenCalled();
    expect(mockView.createView).toHaveBeenCalledWith('tblResolved', {
      type: 'kanban',
      name: 'Board',
    });

    // ai: calls generateViewConfig, then creates a NATIVE view from the config
    await (svc as any).executeAction(
      'create_view',
      { tableId: 'tblX', baseId: 'base-1', type: 'ai', prompt: 'tâches urgentes' },
      'user-1'
    );
    expect(mockAi.generateViewConfig).toHaveBeenCalledWith('base-1', 'tblX', 'tâches urgentes');
    expect(mockView.createView).toHaveBeenLastCalledWith('tblX', {
      type: 'kanban',
      name: 'Urgent board',
      filter: { conjunction: 'and', filterSet: [] },
    });

    // ai without prompt → skipped, not thrown
    const noPrompt = await (svc as any).executeAction(
      'create_view',
      { tableId: 'tblX', baseId: 'base-1', type: 'ai' },
      'user-1'
    );
    expect(noPrompt).toMatchObject({ status: 'skipped' });

    // unknown type → skipped
    const skipped = await (svc as any).executeAction(
      'create_view',
      { tableId: 'tblX', type: 'bogus' },
      'user-1'
    );
    expect(skipped).toMatchObject({ status: 'skipped' });
  });

  it('Test 2: createProposal saves WorkspaceConversationMessage with type="proposal" and proposalId column set', async () => {
    const createdMessage = { id: 'msg-456', proposalId: 'some-uuid' };
    mockPrismaService.workspaceConversationMessage.create.mockResolvedValue(createdMessage);

    await service.createProposal({
      action: 'create_table',
      args: { baseId: 'base-1', name: 'Tasks' },
      conversationId: 'conv-1',
      preview: { tableName: 'Tasks' },
    });

    expect(mockPrismaService.workspaceConversationMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          role: 'assistant',
          type: 'proposal',
          proposalId: expect.any(String),
          conversationId: 'conv-1',
          metadata: expect.objectContaining({
            action: 'create_table',
            accepted: false,
            acceptedAt: null,
          }),
        }),
      })
    );
  });

  it('Test 3: acceptProposal with accepted=false updates metadata and dispatches action', async () => {
    const message = {
      id: 'msg-789',
      proposalId: 'prop-uuid',
      metadata: {
        proposalId: 'prop-uuid',
        action: 'create_table',
        args: { name: 'Projects', baseId: 'base-1' },
        accepted: false,
        acceptedAt: null,
      },
    };
    mockPrismaService.workspaceConversationMessage.findUnique.mockResolvedValue(message);
    mockPrismaService.workspaceConversationMessage.update.mockResolvedValue({
      ...message,
      metadata: { ...message.metadata, accepted: true, acceptedAt: expect.any(String) },
    });
    const mockBaseNode = {
      create: vi.fn().mockResolvedValue({ id: 'tbl1' }),
      move: vi.fn().mockResolvedValue(undefined),
    };
    const prisma = {
      ...mockPrismaService,
      baseNodeFolder: { findFirst: vi.fn().mockResolvedValue(null) },
    };
    const svc = new ActionProposalService(
      prisma as any,
      mockBaseNode as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any
    );

    const result = await svc.acceptProposal('prop-uuid', 'user-1');

    expect(mockPrismaService.workspaceConversationMessage.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'msg-789' },
        data: expect.objectContaining({
          metadata: expect.objectContaining({
            accepted: true,
            acceptedAt: expect.any(String),
          }),
        }),
      })
    );
    expect(result).toHaveProperty('success', true);
    expect(result).toHaveProperty('result');
  });

  it('Test 4: acceptProposal throws ConflictException when proposal already accepted', async () => {
    const message = {
      id: 'msg-789',
      proposalId: 'prop-uuid',
      metadata: {
        proposalId: 'prop-uuid',
        action: 'create_table',
        args: { name: 'Projects' },
        accepted: true,
        acceptedAt: '2026-05-27T00:00:00.000Z',
      },
    };
    mockPrismaService.workspaceConversationMessage.findUnique.mockResolvedValue(message);

    await expect(service.acceptProposal('prop-uuid', 'user-1')).rejects.toThrow(ConflictException);

    // Should NOT call update or execute again
    expect(mockPrismaService.workspaceConversationMessage.update).not.toHaveBeenCalled();
  });

  it('Test 5: preview object for create_table contains baseName/tableName/fields', async () => {
    const createdMessage = { id: 'msg-abc', proposalId: 'some-uuid' };
    mockPrismaService.workspaceConversationMessage.create.mockResolvedValue(createdMessage);

    const preview = {
      baseName: 'My Database',
      tableName: 'Projects',
      fields: [
        { name: 'Title', type: 'text' },
        { name: 'Status', type: 'singleSelect' },
      ],
    };

    const result = await service.createProposal({
      action: 'create_table',
      args: { baseId: 'base-1', name: 'Projects', fields: preview.fields },
      conversationId: 'conv-1',
      preview,
    });

    expect(result.preview).toEqual(preview);
  });

  // Regression: replays the exact actions the system prompt advertises (create_table,
  // link_tables, create_agent) so a future prompt/code drift (like the email/url/phoneNumber
  // field types that aren't real FieldType values) fails a test instead of crashing at accept time.
  describe('regression: prompt-advertised actions never throw at accept', () => {
    it('create_table accepts every field type the system prompt advertises', async () => {
      const mockBaseNode = {
        create: vi.fn().mockResolvedValue({ id: 'tbl1' }),
        move: vi.fn().mockResolvedValue(undefined),
      };
      const prisma = {
        ...mockPrismaService,
        baseNodeFolder: { findFirst: vi.fn().mockResolvedValue(null) },
      };
      const svc = new ActionProposalService(
        prisma as any,
        mockBaseNode as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any
      );
      const promptAdvertisedTypes = [
        'singleLineText',
        'longText',
        'number',
        'date',
        'checkbox',
        'singleSelect',
        'multipleSelect',
        'attachment',
        'rating',
      ];

      const result = await (svc as any).executeAction(
        'create_table',
        {
          baseId: 'base-1',
          name: 'Employés',
          fields: promptAdvertisedTypes.map((type, i) => ({ name: `Field${i}`, type })),
        },
        'user-1'
      );

      expect(result).toMatchObject({ id: 'tbl1' });
      expect(mockBaseNode.create).toHaveBeenCalled();
    });

    it('link_tables resolves sourceTableName/targetTableName and creates the link field', async () => {
      const mockField = { createField: vi.fn().mockResolvedValue({ id: 'fld1' }) };
      const prisma = {
        ...mockPrismaService,
        tableMeta: {
          findFirst: vi
            .fn()
            .mockResolvedValueOnce({ id: 'tblContact' })
            .mockResolvedValueOnce({ id: 'tblCompany' }),
        },
      };
      const svc = new ActionProposalService(
        prisma as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        mockField as any,
        {} as any,
        {} as any,
        {} as any
      );

      const result = await (svc as any).executeAction(
        'link_tables',
        {
          baseId: 'base-1',
          sourceTableName: 'Contact',
          targetTableName: 'Company',
          relationship: 'manyOne',
        },
        'user-1'
      );

      expect(result).toMatchObject({
        linked: true,
        sourceTableId: 'tblContact',
        targetTableId: 'tblCompany',
      });
      expect(mockField.createField).toHaveBeenCalled();
    });

    it('create_agent registers the agent and a sidebar node', async () => {
      const mockAgent = {
        create: vi.fn().mockResolvedValue({ id: 'agent1', name: 'Support Bot' }),
      };
      const mockBaseNode = {
        create: vi.fn().mockResolvedValue({ id: 'node1' }),
        move: vi.fn().mockResolvedValue(undefined),
      };
      const prisma = {
        ...mockPrismaService,
        baseNodeFolder: { findFirst: vi.fn().mockResolvedValue(null) },
      };
      const svc = new ActionProposalService(
        prisma as any,
        mockBaseNode as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        mockAgent as any
      );

      const result = await (svc as any).executeAction(
        'create_agent',
        { baseId: 'base-1', name: 'Support Bot', instructions: 'Help users.' },
        'user-1'
      );

      expect(result).toMatchObject({ agentId: 'agent1', name: 'Support Bot' });
    });
  });
});
