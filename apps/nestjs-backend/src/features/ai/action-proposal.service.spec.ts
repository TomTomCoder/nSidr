import { ConflictException, NotFoundException } from '@nestjs/common';
import { Relationship } from '@teable/core';
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
        mockAgent as any,
        {} as any,
        {} as any
      );

      const result = await (svc as any).executeAction(
        'create_agent',
        { baseId: 'base-1', name: 'Support Bot', instructions: 'Help users.' },
        'user-1'
      );

      expect(result).toMatchObject({ agentId: 'agent1', name: 'Support Bot' });
    });
  });

  describe('create_automation (Phase 1 — structured trigger/steps)', () => {
    const buildSvc = (workflowAi?: object, workflow?: object) => {
      // resourceId is the real Workflow.id — distinct from .id (the BaseNode wrapper's id).
      // updateWorkflow/updateSchedule must be called with resourceId, never .id.
      const mockBaseNode = {
        create: vi.fn().mockResolvedValue({ id: 'wf1', resourceId: 'wfl1' }),
        move: vi.fn().mockResolvedValue(undefined),
      };
      const prisma = {
        ...mockPrismaService,
        baseNodeFolder: { findFirst: vi.fn().mockResolvedValue(null) },
      };
      return new ActionProposalService(
        prisma as any,
        mockBaseNode as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        (workflowAi ?? {}) as any,
        (workflow ?? {}) as any,
        {} as any,
        {} as any,
        {} as any
      );
    };

    it('valid structured trigger+steps → updates the workflow directly, no LLM call', async () => {
      const mockWorkflowAi = { generateWorkflowFromPrompt: vi.fn() };
      const mockWorkflow = {
        updateWorkflow: vi.fn().mockResolvedValue(undefined),
        updateSchedule: vi.fn().mockResolvedValue(undefined),
      };
      const svc = buildSvc(mockWorkflowAi, mockWorkflow);

      const result = await (svc as any).executeAction(
        'create_automation',
        {
          baseId: 'base-1',
          name: 'Notify on new record',
          trigger: { type: 'record_created', config: {} },
          steps: [{ type: 'send_slack', config: { channel: '#alerts', message: 'New record!' } }],
        },
        'user-1'
      );

      expect(mockWorkflowAi.generateWorkflowFromPrompt).not.toHaveBeenCalled();
      expect(mockWorkflow.updateWorkflow).toHaveBeenCalledWith(
        'base-1',
        'wfl1',
        expect.objectContaining({
          config: expect.objectContaining({
            trigger: { type: 'record_created', config: {} },
          }),
        })
      );
      expect(mockWorkflow.updateSchedule).toHaveBeenCalledWith('base-1', 'wfl1');
      expect(result).toMatchObject({ id: 'wf1' });
    });

    it('trigger/step type outside the real enum → skipped with a clear reason, no proposal mutation', async () => {
      const mockWorkflowAi = { generateWorkflowFromPrompt: vi.fn() };
      const mockWorkflow = { updateWorkflow: vi.fn(), updateSchedule: vi.fn() };
      const svc = buildSvc(mockWorkflowAi, mockWorkflow);

      const result = await (svc as any).executeAction(
        'create_automation',
        {
          baseId: 'base-1',
          name: 'Bogus automation',
          trigger: { type: 'not_a_real_trigger', config: {} },
          steps: [{ type: 'send_slack', config: {} }],
        },
        'user-1'
      );

      expect(result).toMatchObject({ status: 'skipped' });
      expect((result as { reason: string }).reason).toContain('invalide');
      expect(mockWorkflow.updateWorkflow).not.toHaveBeenCalled();
    });

    it('no structured trigger/steps, free-text description → falls back to generateWorkflowFromPrompt', async () => {
      const mockWorkflowAi = {
        generateWorkflowFromPrompt: vi.fn().mockResolvedValue({
          name: 'Generated',
          trigger: { type: 'scheduled', config: { cron: '0 9 * * 1' } },
          steps: [{ type: 'send_email', config: {} }],
        }),
      };
      const mockWorkflow = {
        updateWorkflow: vi.fn().mockResolvedValue(undefined),
        updateSchedule: vi.fn().mockResolvedValue(undefined),
      };
      const svc = buildSvc(mockWorkflowAi, mockWorkflow);

      await (svc as any).executeAction(
        'create_automation',
        { baseId: 'base-1', name: 'Weekly digest', description: 'Every Monday, email a summary' },
        'user-1'
      );

      expect(mockWorkflowAi.generateWorkflowFromPrompt).toHaveBeenCalled();
      expect(mockWorkflow.updateWorkflow).toHaveBeenCalled();
    });

    it('free-text fallback generation failure is reported, not swallowed', async () => {
      const mockWorkflowAi = {
        generateWorkflowFromPrompt: vi.fn().mockRejectedValue(new Error('AI is not configured')),
      };
      const mockWorkflow = { updateWorkflow: vi.fn(), updateSchedule: vi.fn() };
      const svc = buildSvc(mockWorkflowAi, mockWorkflow);

      const result = await (svc as any).executeAction(
        'create_automation',
        { baseId: 'base-1', name: 'Will fail', description: 'do something' },
        'user-1'
      );

      expect(result).toMatchObject({ status: 'partial' });
      expect((result as { reason: string }).reason).toContain('AI is not configured');
    });
  });

  describe('create_agent (Phase 2 — extended capabilities)', () => {
    it('default capabilities → AgentTool rows created for each requested tool', async () => {
      const mockAgent = {
        create: vi.fn().mockResolvedValue({ id: 'agent1', name: 'Support Bot' }),
      };
      const mockBaseNode = {
        create: vi.fn().mockResolvedValue({ id: 'node1' }),
        move: vi.fn().mockResolvedValue(undefined),
      };
      const mockAgentTool = { upsert: vi.fn().mockResolvedValue(undefined) };
      const mockAgentTrigger = { create: vi.fn().mockResolvedValue(undefined) };
      const prisma = {
        ...mockPrismaService,
        baseNodeFolder: { findFirst: vi.fn().mockResolvedValue(null) },
        agentTool: mockAgentTool,
        agentTrigger: mockAgentTrigger,
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
        mockAgent as any,
        {} as any,
        {} as any
      );

      const result = await (svc as any).executeAction(
        'create_agent',
        {
          baseId: 'base-1',
          name: 'Support Bot',
          instructions: 'Help users.',
          tools: ['search_records', 'create_record'],
          scheduling: { cron: '0 9 * * 1' },
        },
        'user-1'
      );

      expect(mockAgentTool.upsert).toHaveBeenCalledTimes(2);
      expect(mockAgentTool.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: { agentId: 'agent1', toolName: 'search_records', isEnabled: true },
        })
      );
      expect(mockAgentTrigger.create).toHaveBeenCalledWith({
        data: {
          agentId: 'agent1',
          triggerType: 'cron',
          config: { cron: '0 9 * * 1' },
          isActive: true,
        },
      });
      expect(result).toMatchObject({ agentId: 'agent1', name: 'Support Bot' });
    });

    it('no tools/scheduling provided → no AgentTool/AgentTrigger rows created', async () => {
      const mockAgent = { create: vi.fn().mockResolvedValue({ id: 'agent2', name: 'Bare Bot' }) };
      const mockBaseNode = {
        create: vi.fn().mockResolvedValue({ id: 'node2' }),
        move: vi.fn().mockResolvedValue(undefined),
      };
      const mockAgentTool = { upsert: vi.fn() };
      const mockAgentTrigger = { create: vi.fn() };
      const prisma = {
        ...mockPrismaService,
        baseNodeFolder: { findFirst: vi.fn().mockResolvedValue(null) },
        agentTool: mockAgentTool,
        agentTrigger: mockAgentTrigger,
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
        mockAgent as any,
        {} as any,
        {} as any
      );

      await (svc as any).executeAction(
        'create_agent',
        { baseId: 'base-1', name: 'Bare Bot', instructions: 'Do nothing fancy.' },
        'user-1'
      );

      expect(mockAgentTool.upsert).not.toHaveBeenCalled();
      expect(mockAgentTrigger.create).not.toHaveBeenCalled();
    });

    it('respondToMentions/allowDirectMessage/memoryEnabled are forwarded to agentService.create', async () => {
      const mockAgent = { create: vi.fn().mockResolvedValue({ id: 'agent3', name: 'Quiet Bot' }) };
      const mockBaseNode = {
        create: vi.fn().mockResolvedValue({ id: 'node3' }),
        move: vi.fn().mockResolvedValue(undefined),
      };
      const prisma = {
        ...mockPrismaService,
        baseNodeFolder: { findFirst: vi.fn().mockResolvedValue(null) },
        agentTool: { upsert: vi.fn() },
        agentTrigger: { create: vi.fn() },
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
        mockAgent as any,
        {} as any,
        {} as any
      );

      await (svc as any).executeAction(
        'create_agent',
        {
          baseId: 'base-1',
          name: 'Quiet Bot',
          instructions: 'Never respond to mentions.',
          respondToMentions: false,
          allowDirectMessage: false,
          memoryEnabled: false,
        },
        'user-1'
      );

      expect(mockAgent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          respondToMentions: false,
          allowDirectMessage: false,
          memoryEnabled: false,
        }),
        'user-1'
      );
    });

    it('mcpServerUrls → AgentMcpServer rows created via upsert', async () => {
      const mockAgent = { create: vi.fn().mockResolvedValue({ id: 'agent4', name: 'MCP Bot' }) };
      const mockBaseNode = {
        create: vi.fn().mockResolvedValue({ id: 'node4' }),
        move: vi.fn().mockResolvedValue(undefined),
      };
      const mockAgentMcpServer = { upsert: vi.fn().mockResolvedValue(undefined) };
      const prisma = {
        ...mockPrismaService,
        baseNodeFolder: { findFirst: vi.fn().mockResolvedValue(null) },
        agentTool: { upsert: vi.fn() },
        agentTrigger: { create: vi.fn() },
        agentMcpServer: mockAgentMcpServer,
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
        mockAgent as any,
        {} as any,
        {} as any
      );

      await (svc as any).executeAction(
        'create_agent',
        {
          baseId: 'base-1',
          name: 'MCP Bot',
          instructions: 'Use MCP.',
          mcpServerUrls: [{ name: 'Mon serveur', url: 'https://mcp.exemple.com' }],
        },
        'user-1'
      );

      expect(mockAgentMcpServer.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            agentId: 'agent4',
            url: 'https://mcp.exemple.com',
            name: 'Mon serveur',
            transport: 'streamable-http',
            enabled: true,
          }),
        })
      );
    });
  });

  describe('create_table (Phase 3 — per-field options)', () => {
    it('number with defaultValue, select with choices, required/unique → real options built', async () => {
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
        {} as any,
        {} as any,
        {} as any
      );

      await (svc as any).executeAction(
        'create_table',
        {
          baseId: 'base-1',
          name: 'Commandes',
          fields: [
            { name: 'Montant', type: 'number', defaultValue: 0, required: true },
            { name: 'Statut', type: 'singleSelect', choices: ['Ouvert', 'Fermé'], unique: false },
            { name: 'Réf', type: 'singleLineText', unique: true },
          ],
        },
        'user-1'
      );

      const created = mockBaseNode.create.mock.calls[0][1];
      // `required: true` is intentionally NOT mapped to `notNull` — the field-creation engine
      // rejects notNull unconditionally at creation time (confirmed via real E2E run).
      expect(created.fields).toEqual([
        { name: 'Montant', type: 'number', options: { defaultValue: 0 } },
        {
          name: 'Statut',
          type: 'singleSelect',
          options: { choices: [{ name: 'Ouvert' }, { name: 'Fermé' }] },
        },
        { name: 'Réf', type: 'singleLineText', unique: true },
      ]);
    });

    it('link field with an existing foreign table → resolves foreignTableId', async () => {
      const mockBaseNode = {
        create: vi.fn().mockResolvedValue({ id: 'tbl2' }),
        move: vi.fn().mockResolvedValue(undefined),
      };
      const prisma = {
        ...mockPrismaService,
        baseNodeFolder: { findFirst: vi.fn().mockResolvedValue(null) },
        tableMeta: { findFirst: vi.fn().mockResolvedValue({ id: 'tblCompany' }) },
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
        {} as any,
        {} as any,
        {} as any
      );

      await (svc as any).executeAction(
        'create_table',
        {
          baseId: 'base-1',
          name: 'Contacts',
          fields: [
            {
              name: 'Entreprise',
              type: 'link',
              foreignTableName: 'Entreprises',
              relationship: 'manyOne',
            },
          ],
        },
        'user-1'
      );

      const created = mockBaseNode.create.mock.calls[0][1];
      expect(created.fields).toEqual([
        {
          name: 'Entreprise',
          type: 'link',
          options: { foreignTableId: 'tblCompany', relationship: Relationship.ManyOne },
        },
      ]);
    });

    it('link field with a non-existent foreign table → downgrades to singleLineText, no crash', async () => {
      const mockBaseNode = {
        create: vi.fn().mockResolvedValue({ id: 'tbl3' }),
        move: vi.fn().mockResolvedValue(undefined),
      };
      const prisma = {
        ...mockPrismaService,
        baseNodeFolder: { findFirst: vi.fn().mockResolvedValue(null) },
        tableMeta: { findFirst: vi.fn().mockResolvedValue(null) },
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
        {} as any,
        {} as any,
        {} as any
      );

      const result = await (svc as any).executeAction(
        'create_table',
        {
          baseId: 'base-1',
          name: 'Contacts',
          fields: [
            {
              name: 'Entreprise',
              type: 'link',
              foreignTableName: 'Inexistante',
              relationship: 'manyOne',
            },
          ],
        },
        'user-1'
      );

      const created = mockBaseNode.create.mock.calls[0][1];
      expect(created.fields).toEqual([{ name: 'Entreprise', type: 'singleLineText' }]);
      expect(result).toMatchObject({ id: 'tbl3' });
    });
  });

  describe('create_app_interface (Phase 5 — declarative modules)', () => {
    it('modules provided → persists declarative app.content, skips code-gen streaming', async () => {
      // resourceId is the real App.id — distinct from .id (the BaseNode wrapper's id). The
      // sidebar/router always navigates via resourceId, so content must be keyed by it.
      const mockBaseNode = {
        create: vi.fn().mockResolvedValue({ id: 'app1', resourceId: 'appReal1' }),
        move: vi.fn().mockResolvedValue(undefined),
      };
      const mockAppUpsert = vi.fn().mockResolvedValue(undefined);
      const prisma = {
        ...mockPrismaService,
        baseNodeFolder: { findFirst: vi.fn().mockResolvedValue(null) },
        tableMeta: { findFirst: vi.fn().mockResolvedValue({ id: 'tblContacts' }) },
        app: { upsert: mockAppUpsert },
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
        {} as any,
        {} as any,
        {} as any
      );

      const result = await (svc as any).executeAction(
        'create_app_interface',
        {
          baseId: 'base-1',
          name: 'Suivi Contacts',
          modules: [{ type: 'data-table', tableName: 'Contacts', fieldNames: ['Name', 'Email'] }],
        },
        'user-1'
      );

      expect(mockAppUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'appReal1' },
          update: expect.objectContaining({
            content: {
              type: 'declarative',
              modules: [
                {
                  type: 'data-table',
                  tableId: 'tblContacts',
                  tableName: 'Contacts',
                  title: undefined,
                  fieldNames: ['Name', 'Email'],
                },
              ],
            },
          }),
        })
      );
      expect(result).toMatchObject({ id: 'app1', declarative: true });
      expect(result).not.toHaveProperty('shouldStream');
    });

    it('no modules → falls back to shouldStream free-form code-gen flow (back-compat)', async () => {
      const mockBaseNode = {
        create: vi.fn().mockResolvedValue({ id: 'app2' }),
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
        {} as any,
        {} as any,
        {} as any
      );

      const result = await (svc as any).executeAction(
        'create_app_interface',
        { baseId: 'base-1', name: 'Custom UI' },
        'user-1'
      );

      expect(result).toMatchObject({ shouldStream: true, appId: 'app2' });
    });
  });

  describe('create_table (formula field — Phase 4)', () => {
    it('formula field is created after non-formula fields, with {{FieldName}} resolved to real fldXXX IDs', async () => {
      const mockCreateField = vi.fn().mockResolvedValue({});
      const mockBaseNode = {
        create: vi.fn().mockResolvedValue({ id: 'tbl-formula' }),
        move: vi.fn().mockResolvedValue(undefined),
      };
      const prisma = {
        ...mockPrismaService,
        baseNodeFolder: { findFirst: vi.fn().mockResolvedValue(null) },
        field: {
          findMany: vi.fn().mockResolvedValue([
            { id: 'fldABC', name: 'Prix HT' },
            { id: 'fldDEF', name: 'TVA' },
          ]),
        },
      };
      const svc = new ActionProposalService(
        prisma as any,
        mockBaseNode as any,
        {} as any, // recordOpenApiService
        {} as any, // viewOpenApiService
        {} as any, // aiService
        { createField: mockCreateField } as any, // fieldOpenApiService (pos 5)
        {} as any, // workflowAiService
        {} as any, // workflowService
        {} as any, // agentService
        {} as any,
        {} as any
      );

      await (svc as any).executeAction(
        'create_table',
        {
          baseId: 'base-1',
          name: 'Produits',
          fields: [
            { name: 'Prix HT', type: 'number' },
            { name: 'TVA', type: 'number' },
            { name: 'Prix TTC', type: 'formula', expression: '{{Prix HT}} * (1 + {{TVA}} / 100)' },
          ],
        },
        'user-1'
      );

      // Non-formula fields go into the initial table creation batch
      const batchedFields = mockBaseNode.create.mock.calls[0][1].fields as Array<{
        name: string;
        type: string;
      }>;
      expect(batchedFields.map((f) => f.name)).toEqual(expect.arrayContaining(['Prix HT', 'TVA']));
      expect(batchedFields.map((f) => f.name)).not.toContain('Prix TTC');

      // Formula field is created after, with real IDs substituted
      expect(mockCreateField).toHaveBeenCalledWith(
        'tbl-formula',
        expect.objectContaining({
          name: 'Prix TTC',
          type: 'formula',
          options: expect.objectContaining({
            expression: '{{fldABC}} * (1 + {{fldDEF}} / 100)',
          }),
        })
      );
    });
  });
});
