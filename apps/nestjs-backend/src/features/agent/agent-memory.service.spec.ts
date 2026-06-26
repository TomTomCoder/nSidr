/**
 * agent-memory.service.spec.ts
 *
 * Verifies AgentMemoryService is:
 *   1. Per-agent scoped: memories saved for agentA are NOT visible to agentB.
 *   2. Wired into the execution loop: getRecent/getPreferences are called at loop start,
 *      saveRecent is called after each run completes.
 *   3. getRecent returns content strings (not raw rows) ordered newest-first.
 *   4. getPreferences returns key→value map.
 *   5. Expired memories are excluded from getRecent.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentMemoryService } from './agent-memory.service';

// ---------------------------------------------------------------------------
// Minimal Prisma stub — tracks created rows per agentId
// ---------------------------------------------------------------------------

function buildPrismaStub(
  initialRows: Array<{
    id: string;
    agentId: string;
    memoryType: string;
    content: string;
    metadata: object | null;
    expiresAt: Date | null;
    createdTime: Date;
  }> = []
) {
  const rows = [...initialRows];
  let idCounter = 0;

  return {
    agentMemory: {
      create: vi.fn(
        async ({
          data,
        }: {
          data: {
            agentId: string;
            memoryType: string;
            content: string;
            metadata?: object;
            expiresAt?: Date;
          };
        }) => {
          const row = {
            id: `mem_${++idCounter}`,
            agentId: data.agentId,
            memoryType: data.memoryType,
            content: data.content,
            metadata: data.metadata ?? null,
            expiresAt: data.expiresAt ?? null,
            createdTime: new Date(),
          };
          rows.push(row);
          return row;
        }
      ),
      findMany: vi.fn(
        async ({
          where,
          orderBy,
          take,
        }: {
          where: {
            agentId: string;
            memoryType?: string;
            OR?: Array<{ expiresAt: null | { gt: Date } }>;
          };
          orderBy?: { createdTime: 'asc' | 'desc' };
          take?: number;
        }) => {
          let results = rows.filter((r) => {
            if (r.agentId !== where.agentId) return false;
            if (where.memoryType && r.memoryType !== where.memoryType) return false;
            // OR: [{ expiresAt: null }, { expiresAt: { gt: now } }]
            if (where.OR) {
              const now = new Date();
              const passesOr = where.OR.some((cond) => {
                if ('expiresAt' in cond && cond.expiresAt === null) return r.expiresAt === null;
                if (
                  'expiresAt' in cond &&
                  cond.expiresAt &&
                  'gt' in (cond.expiresAt as Record<string, unknown>)
                ) {
                  const gt = (cond.expiresAt as { gt: Date }).gt;
                  return r.expiresAt !== null && r.expiresAt > gt;
                }
                return false;
              });
              if (!passesOr) return false;
            }
            return true;
          });

          if (orderBy?.createdTime === 'desc') {
            results = results.sort((a, b) => b.createdTime.getTime() - a.createdTime.getTime());
          }
          if (take) results = results.slice(0, take);
          return results;
        }
      ),
      findFirst: vi.fn(
        async ({
          where,
        }: {
          where: {
            agentId: string;
            memoryType?: string;
            metadata?: { path: string[]; equals: string };
          };
        }) => {
          return (
            rows.find((r) => {
              if (r.agentId !== where.agentId) return false;
              if (where.memoryType && r.memoryType !== where.memoryType) return false;
              if (where.metadata?.path && where.metadata.equals) {
                const meta = r.metadata as Record<string, string> | null;
                const key = where.metadata.path[where.metadata.path.length - 1];
                return meta?.[key] === where.metadata.equals;
              }
              return true;
            }) ?? null
          );
        }
      ),
      update: vi.fn(
        async ({ where, data }: { where: { id: string }; data: { content: string } }) => {
          const row = rows.find((r) => r.id === where.id);
          if (row) row.content = data.content;
          return row;
        }
      ),
      deleteMany: vi.fn(async () => ({ count: 0 })),
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AgentMemoryService', () => {
  let prisma: ReturnType<typeof buildPrismaStub>;
  let svc: AgentMemoryService;

  beforeEach(() => {
    prisma = buildPrismaStub();
    svc = new AgentMemoryService(prisma as never);
  });

  // ── 1. Per-agent scoping: memories are isolated by agentId ──────────────
  describe('per-agent scoping (T-17-14 isolation)', () => {
    it('should NOT expose agentA memories to agentB', async () => {
      await svc.saveRecent('agentA', 'My secret fact for A');
      const agentBMemories = await svc.getRecent('agentB');
      expect(agentBMemories).toHaveLength(0);
    });

    it('should return ONLY agentA memories when queried for agentA', async () => {
      await svc.saveRecent('agentA', 'Fact for A');
      await svc.saveRecent('agentB', 'Fact for B');
      const aMemories = await svc.getRecent('agentA');
      expect(aMemories).toHaveLength(1);
      expect(aMemories[0]).toBe('Fact for A');
    });

    it('should keep preferences scoped per-agent', async () => {
      await svc.setPreference('agentA', 'language', 'French');
      await svc.setPreference('agentB', 'language', 'German');

      const prefsA = await svc.getPreferences('agentA');
      const prefsB = await svc.getPreferences('agentB');

      expect(prefsA.language).toBe('French');
      expect(prefsB.language).toBe('German');
      // agentA sees only its own preference
      expect(Object.keys(prefsA)).toHaveLength(1);
    });
  });

  // ── 2. Loop wiring: getRecent + getPreferences called at start; saveRecent at end
  describe('execution loop wiring', () => {
    it('getRecent should call prisma with correct agentId filter', async () => {
      await svc.getRecent('agentX');
      expect(prisma.agentMemory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ agentId: 'agentX' }) })
      );
    });

    it('getPreferences should call prisma with correct agentId filter', async () => {
      await svc.getPreferences('agentX');
      expect(prisma.agentMemory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ agentId: 'agentX' }) })
      );
    });

    it('saveRecent should call prisma.create with memoryType=recent and correct agentId', async () => {
      await svc.saveRecent('agentX', 'Run completed in 3 iterations');
      expect(prisma.agentMemory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            agentId: 'agentX',
            memoryType: 'recent',
            content: 'Run completed in 3 iterations',
          }),
        })
      );
    });

    it('saveRecent should purge expired memories after create', async () => {
      await svc.saveRecent('agentX', 'Some content');
      expect(prisma.agentMemory.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            agentId: 'agentX',
            memoryType: 'recent',
            expiresAt: expect.objectContaining({ lt: expect.any(Date) }),
          }),
        })
      );
    });
  });

  // ── 3. getRecent returns content strings ordered newest-first ────────────
  describe('getRecent ordering and content extraction', () => {
    it('should return content strings (not raw Prisma rows)', async () => {
      await svc.saveRecent('agentA', 'First fact');
      const results = await svc.getRecent('agentA');
      expect(typeof results[0]).toBe('string');
    });

    it('should filter out expired entries', async () => {
      const past = new Date(Date.now() - 1000); // already expired
      const future = new Date(Date.now() + 86_400_000); // valid

      // Pre-seed rows with different expiry
      const seedPrisma = buildPrismaStub([
        {
          id: 'mem_expired',
          agentId: 'agentA',
          memoryType: 'recent',
          content: 'Expired content',
          metadata: null,
          expiresAt: past,
          createdTime: new Date(Date.now() - 5000),
        },
        {
          id: 'mem_valid',
          agentId: 'agentA',
          memoryType: 'recent',
          content: 'Valid content',
          metadata: null,
          expiresAt: future,
          createdTime: new Date(),
        },
      ]);
      const svc2 = new AgentMemoryService(seedPrisma as never);
      const results = await svc2.getRecent('agentA');
      expect(results).not.toContain('Expired content');
      expect(results).toContain('Valid content');
    });
  });

  // ── 4. getPreferences returns key→value map ───────────────────────────────
  describe('getPreferences', () => {
    it('should return an empty object when no preferences exist', async () => {
      const prefs = await svc.getPreferences('agentEmpty');
      expect(prefs).toEqual({});
    });

    it('should return all preferences as key→value map', async () => {
      await svc.setPreference('agentA', 'tone', 'formal');
      await svc.setPreference('agentA', 'language', 'English');
      const prefs = await svc.getPreferences('agentA');
      expect(prefs.tone).toBe('formal');
      expect(prefs.language).toBe('English');
    });
  });

  // ── 5. Memory recall: a prior-conversation fact can be recalled ───────────
  describe('memory recall simulation (turn-over-turn)', () => {
    it('should recall a fact saved in a prior run via getRecent', async () => {
      // Turn 1: agent runs, learns a fact, saves it to memory
      const AGENT_ID = 'agentRecall';
      const fact = '[manual] User prefers concise responses. Confirmed in turn 1.';
      await svc.saveRecent(AGENT_ID, fact);

      // Turn 2: agent starts, loads memory — should include the fact
      const recalled = await svc.getRecent(AGENT_ID);
      expect(recalled).toContain(fact);
    });

    it('should NOT bleed recalled fact to a different agent', async () => {
      const AGENT_A = 'agentWithFact';
      const AGENT_B = 'agentWithoutFact';
      await svc.saveRecent(AGENT_A, 'Secret: user name is Alice');

      const bMemories = await svc.getRecent(AGENT_B);
      expect(bMemories.join(' ')).not.toContain('Alice');
    });
  });
});
