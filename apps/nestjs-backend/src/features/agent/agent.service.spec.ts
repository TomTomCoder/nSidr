import type { PrismaService } from '@teable/db-main-prisma';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PromptService } from '../ai/prompt.service';
import { AgentService } from './agent.service';

const mockPrismaService = {
  agent: {
    create: vi.fn(),
    update: vi.fn(),
  },
};

const mockPromptService = {
  upsertOverride: vi.fn(),
};

describe('AgentService — capability toggles (respondToMentions/allowDirectMessage/memoryEnabled)', () => {
  let service: AgentService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrismaService.agent.create.mockResolvedValue({ id: 'agent-1' });
    mockPrismaService.agent.update.mockResolvedValue({ id: 'agent-1' });
    service = new AgentService(
      mockPrismaService as unknown as PrismaService,
      mockPromptService as unknown as PromptService
    );
  });

  it('create() passes the three capability flags through to Prisma when provided', async () => {
    await service.create(
      {
        name: 'Agent',
        baseId: 'base-1',
        respondToMentions: false,
        allowDirectMessage: false,
        memoryEnabled: false,
      },
      'user-1'
    );

    expect(mockPrismaService.agent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          respondToMentions: false,
          allowDirectMessage: false,
          memoryEnabled: false,
        }),
      })
    );
  });

  it('create() omits the flags (Prisma default applies) when not provided', async () => {
    await service.create({ name: 'Agent', baseId: 'base-1' }, 'user-1');

    const data = mockPrismaService.agent.create.mock.calls[0][0].data;
    expect(data.respondToMentions).toBeUndefined();
    expect(data.allowDirectMessage).toBeUndefined();
    expect(data.memoryEnabled).toBeUndefined();
  });

  it('update() only includes a flag in the Prisma payload when explicitly set in the DTO', async () => {
    await service.update('agent-1', { memoryEnabled: false }, 'user-1');

    const data = mockPrismaService.agent.update.mock.calls[0][0].data;
    expect(data.memoryEnabled).toBe(false);
    expect(data).not.toHaveProperty('respondToMentions');
    expect(data).not.toHaveProperty('allowDirectMessage');
  });

  it('update() with all three flags set to false persists all three', async () => {
    await service.update(
      'agent-1',
      { respondToMentions: false, allowDirectMessage: false, memoryEnabled: false },
      'user-1'
    );

    expect(mockPrismaService.agent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          respondToMentions: false,
          allowDirectMessage: false,
          memoryEnabled: false,
        }),
      })
    );
  });
});
