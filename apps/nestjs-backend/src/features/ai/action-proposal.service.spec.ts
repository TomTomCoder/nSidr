import { ConflictException, NotFoundException } from '@nestjs/common';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ActionProposalService } from './action-proposal.service';

const mockPrismaService = {
  workspaceConversationMessage: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
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
        args: { name: 'Projects' },
        accepted: false,
        acceptedAt: null,
      },
    };
    mockPrismaService.workspaceConversationMessage.findUnique.mockResolvedValue(message);
    mockPrismaService.workspaceConversationMessage.update.mockResolvedValue({
      ...message,
      metadata: { ...message.metadata, accepted: true, acceptedAt: expect.any(String) },
    });

    const result = await service.acceptProposal('prop-uuid', 'user-1');

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
});
