import { Injectable } from '@nestjs/common';
import { PrismaService } from '@teable/db-main-prisma';

export interface WorkspaceSnapshot {
  bases: Array<{
    id: string;
    name: string;
    tables: Array<{
      id: string;
      name: string;
      fields: Array<{ id: string; name: string; type: string }>;
    }>;
  }>;
  integrations: Array<{ provider: string; isActive: boolean }>;
  agentTriggers: Array<{ id: string; name: string; type: string }>;
  plugins: Array<{ id: string; name: string }>;
}

@Injectable()
export class WorkspaceStateService {
  constructor(private readonly prismaService: PrismaService) {}

  async getSnapshot(spaceId: string): Promise<WorkspaceSnapshot> {
    // Single query for bases with nested tables+fields (no N+1 per research Pitfall 2)
    const basesRaw = await this.prismaService.base.findMany({
      where: { spaceId, deletedTime: null },
      select: {
        id: true,
        name: true,
        tables: {
          where: { deletedTime: null },
          select: {
            id: true,
            name: true,
            fields: {
              where: { deletedTime: null },
              select: { id: true, name: true, type: true },
            },
          },
        },
      },
    });

    // Separate queries for integrations, agentTriggers, plugins
    const integrationsRaw = await this.prismaService.oAuthIntegration.findMany({
      where: { spaceId },
      select: { provider: true, isActive: true },
    });

    // AgentTrigger is agent-scoped (no spaceId on the model).
    // Proxy: find agents associated with bases in this space, then get their triggers.
    const baseIds = basesRaw.map((b) => b.id);
    const agentsRaw = await this.prismaService.agent.findMany({
      where: { baseId: { in: baseIds } },
      select: { id: true },
    });
    const agentIds = agentsRaw.map((a) => a.id);

    const agentTriggersRaw = await this.prismaService.agentTrigger.findMany({
      where: { agentId: { in: agentIds } },
      select: { id: true, triggerType: true, isActive: true },
    });

    // Plugin is not space-scoped. Proxy: use PluginInstall which is base-scoped.
    const pluginsRaw = await this.prismaService.pluginInstall.findMany({
      where: { baseId: { in: baseIds } },
      select: { id: true, name: true },
    });

    // Map to WorkspaceSnapshot shape
    const bases = basesRaw.map((b) => ({
      id: b.id,
      name: b.name,
      tables: (b.tables || []).map(
        (t: {
          id: string;
          name: string;
          fields?: Array<{ id: string; name: string; type: string }>;
        }) => ({
          id: t.id,
          name: t.name,
          fields: (t.fields || []).map((f: { id: string; name: string; type: string }) => ({
            id: f.id,
            name: f.name,
            type: f.type,
          })),
        })
      ),
    }));

    const integrations = integrationsRaw.map((i) => ({
      provider: i.provider as string,
      isActive: i.isActive,
    }));

    const agentTriggers = agentTriggersRaw.map((t) => ({
      id: t.id,
      name: t.id, // AgentTrigger has no name field; use id as proxy label
      type: t.triggerType,
    }));

    const plugins = pluginsRaw.map((p) => ({
      id: p.id,
      name: p.name,
    }));

    return { bases, integrations, agentTriggers, plugins };
  }
}
