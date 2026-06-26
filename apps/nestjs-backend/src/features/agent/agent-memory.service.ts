import { Injectable } from '@nestjs/common';
import { PrismaService } from '@teable/db-main-prisma';

const RECENT_TTL_DAYS = 7;
const MAX_RECENT_MEMORIES = 50;

@Injectable()
export class AgentMemoryService {
  constructor(private readonly prismaService: PrismaService) {}

  // Save a recent (short-term) memory. Purges expired entries first.
  async saveRecent(agentId: string, content: string, metadata?: object): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + RECENT_TTL_DAYS);

    await this.prismaService.agentMemory.create({
      data: {
        agentId,
        memoryType: 'recent',
        content,
        metadata: metadata ?? undefined,
        expiresAt,
      },
    });

    // Purge expired
    await this.prismaService.agentMemory.deleteMany({
      where: { agentId, memoryType: 'recent', expiresAt: { lt: new Date() } },
    });
  }

  // Get recent memories (non-expired, most recent first, capped at MAX_RECENT_MEMORIES)
  async getRecent(agentId: string): Promise<string[]> {
    const rows = await this.prismaService.agentMemory.findMany({
      where: {
        agentId,
        memoryType: 'recent',
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: { createdTime: 'desc' },
      take: MAX_RECENT_MEMORIES,
    });
    return rows.map((r) => r.content);
  }

  // Upsert a preference memory (key stored as JSON: { key, value })
  async setPreference(agentId: string, key: string, value: string): Promise<void> {
    const existing = await this.prismaService.agentMemory.findFirst({
      where: { agentId, memoryType: 'preference', metadata: { path: ['key'], equals: key } },
    });

    if (existing) {
      await this.prismaService.agentMemory.update({
        where: { id: existing.id },
        data: { content: value },
      });
    } else {
      await this.prismaService.agentMemory.create({
        data: { agentId, memoryType: 'preference', content: value, metadata: { key } },
      });
    }
  }

  // Get all preference memories as key-value map
  async getPreferences(agentId: string): Promise<Record<string, string>> {
    const rows = await this.prismaService.agentMemory.findMany({
      where: { agentId, memoryType: 'preference' },
      take: 200,
    });
    const result: Record<string, string> = {};
    for (const row of rows) {
      const meta = row.metadata as { key?: string } | null;
      if (meta?.key) result[meta.key] = row.content;
    }
    return result;
  }

  // Get all memories for an agent (for "Voir les souvenirs" UI), capped at 500
  async listAll(agentId: string) {
    return this.prismaService.agentMemory.findMany({
      where: { agentId },
      orderBy: { createdTime: 'desc' },
      take: 500,
    });
  }
}
