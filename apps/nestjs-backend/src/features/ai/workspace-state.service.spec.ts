import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkspaceStateService } from './workspace-state.service';

const mockPrismaService = {
  base: {
    findMany: vi.fn(),
  },
  oAuthIntegration: {
    findMany: vi.fn(),
  },
  pluginInstall: {
    findMany: vi.fn(),
  },
  agent: {
    findMany: vi.fn(),
  },
  agentTrigger: {
    findMany: vi.fn(),
  },
};

describe('WorkspaceStateService', () => {
  let service: WorkspaceStateService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new WorkspaceStateService(mockPrismaService as any);
  });

  it('Test 1: getSnapshot calls prisma.base.findMany with where: { spaceId, deletedTime: null } and nested select for tables+fields', async () => {
    mockPrismaService.base.findMany.mockResolvedValue([]);
    mockPrismaService.oAuthIntegration.findMany.mockResolvedValue([]);
    mockPrismaService.agent.findMany.mockResolvedValue([]);
    mockPrismaService.agentTrigger.findMany.mockResolvedValue([]);
    mockPrismaService.pluginInstall.findMany.mockResolvedValue([]);

    await service.getSnapshot('space-1');

    expect(mockPrismaService.base.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { spaceId: 'space-1', deletedTime: null },
        select: expect.objectContaining({
          tables: expect.objectContaining({
            select: expect.objectContaining({
              fields: expect.objectContaining({
                select: expect.objectContaining({ id: true, name: true, type: true }),
              }),
            }),
          }),
        }),
      })
    );
  });

  it('Test 2: getSnapshot returns object with shape { bases, integrations, agentTriggers, plugins }', async () => {
    mockPrismaService.base.findMany.mockResolvedValue([
      {
        id: 'base-1',
        name: 'My Base',
        tables: [
          {
            id: 'table-1',
            name: 'My Table',
            fields: [{ id: 'field-1', name: 'Name', type: 'text' }],
          },
        ],
      },
    ]);
    mockPrismaService.oAuthIntegration.findMany.mockResolvedValue([
      { provider: 'GMAIL', isActive: true },
    ]);
    mockPrismaService.agent.findMany.mockResolvedValue([{ id: 'agent-1' }]);
    mockPrismaService.agentTrigger.findMany.mockResolvedValue([
      { id: 'trigger-1', triggerType: 'cron', isActive: true },
    ]);
    mockPrismaService.pluginInstall.findMany.mockResolvedValue([
      { id: 'pi-1', pluginId: 'plugin-1', name: 'My Plugin' },
    ]);

    const result = await service.getSnapshot('space-1');

    expect(result).toHaveProperty('bases');
    expect(result).toHaveProperty('integrations');
    expect(result).toHaveProperty('agentTriggers');
    expect(result).toHaveProperty('plugins');
    expect(Array.isArray(result.bases)).toBe(true);
    expect(Array.isArray(result.integrations)).toBe(true);
    expect(Array.isArray(result.agentTriggers)).toBe(true);
    expect(Array.isArray(result.plugins)).toBe(true);
    expect(result.bases[0]).toMatchObject({ id: 'base-1', name: 'My Base' });
    expect(result.bases[0].tables[0]).toMatchObject({ id: 'table-1', name: 'My Table' });
    expect(result.bases[0].tables[0].fields[0]).toMatchObject({
      id: 'field-1',
      name: 'Name',
      type: 'text',
    });
  });

  it('Test 3: getSnapshot calls prisma.oAuthIntegration.findMany with where: { spaceId } and select: { provider, isActive }', async () => {
    mockPrismaService.base.findMany.mockResolvedValue([]);
    mockPrismaService.oAuthIntegration.findMany.mockResolvedValue([]);
    mockPrismaService.agent.findMany.mockResolvedValue([]);
    mockPrismaService.agentTrigger.findMany.mockResolvedValue([]);
    mockPrismaService.pluginInstall.findMany.mockResolvedValue([]);

    await service.getSnapshot('space-1');

    expect(mockPrismaService.oAuthIntegration.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { spaceId: 'space-1' },
        select: expect.objectContaining({ provider: true }),
      })
    );
  });

  it('Test 4: getSnapshot does NOT make separate per-base queries (single findMany with nested include)', async () => {
    mockPrismaService.base.findMany.mockResolvedValue([
      { id: 'base-1', name: 'Base 1', tables: [] },
      { id: 'base-2', name: 'Base 2', tables: [] },
    ]);
    mockPrismaService.oAuthIntegration.findMany.mockResolvedValue([]);
    mockPrismaService.agent.findMany.mockResolvedValue([]);
    mockPrismaService.agentTrigger.findMany.mockResolvedValue([]);
    mockPrismaService.pluginInstall.findMany.mockResolvedValue([]);

    await service.getSnapshot('space-1');

    // Only one call to base.findMany regardless of how many bases are returned
    expect(mockPrismaService.base.findMany).toHaveBeenCalledTimes(1);
  });

  it('Test 5: getSnapshot queries agentTriggers via agents associated with bases in the space', async () => {
    mockPrismaService.base.findMany.mockResolvedValue([]);
    mockPrismaService.oAuthIntegration.findMany.mockResolvedValue([]);
    mockPrismaService.agent.findMany.mockResolvedValue([{ id: 'agent-1' }]);
    mockPrismaService.agentTrigger.findMany.mockResolvedValue([
      { id: 'trigger-1', triggerType: 'cron', isActive: true },
    ]);
    mockPrismaService.pluginInstall.findMany.mockResolvedValue([]);

    const result = await service.getSnapshot('space-1');

    expect(mockPrismaService.agentTrigger.findMany).toHaveBeenCalled();
    expect(result.agentTriggers).toEqual([{ id: 'trigger-1', name: 'trigger-1', type: 'cron' }]);
  });

  it('Test 6: getSnapshot queries plugins (PluginInstall) via bases in the space', async () => {
    mockPrismaService.base.findMany.mockResolvedValue([{ id: 'base-1', name: 'B', tables: [] }]);
    mockPrismaService.oAuthIntegration.findMany.mockResolvedValue([]);
    mockPrismaService.agent.findMany.mockResolvedValue([]);
    mockPrismaService.agentTrigger.findMany.mockResolvedValue([]);
    mockPrismaService.pluginInstall.findMany.mockResolvedValue([
      { id: 'pi-1', pluginId: 'plugin-1', name: 'My Plugin' },
    ]);

    const result = await service.getSnapshot('space-1');

    expect(mockPrismaService.pluginInstall.findMany).toHaveBeenCalled();
    expect(result.plugins).toEqual([{ id: 'pi-1', name: 'My Plugin' }]);
  });
});
