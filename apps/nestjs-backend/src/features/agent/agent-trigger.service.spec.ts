import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentTriggerService } from './agent-trigger.service';
import type { PrismaService } from '@teable/db-main-prisma';
import type { AgentExecutionService } from './agent-execution.service';

describe('AgentTriggerService', () => {
  let service: AgentTriggerService;
  let prisma: PrismaService;
  let executionService: AgentExecutionService;

  beforeEach(() => {
    prisma = {
      agentTrigger: {
        create: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        upsert: vi.fn(),
      },
    } as unknown as PrismaService;

    // Execution service runs fire-and-forget; stub with an async generator that yields nothing
    executionService = {
      run: vi.fn().mockImplementation(async function* () {
        // no-op generator
      }),
    } as unknown as AgentExecutionService;

    service = new AgentTriggerService(prisma, executionService);
  });

  describe('createTrigger', () => {
    it('persists a trigger via prisma and returns it', async () => {
      const expected = { id: 'trg1', agentId: 'agt1', triggerType: 'webhook', isActive: true };
      vi.mocked(prisma.agentTrigger.create).mockResolvedValue(expected as any);

      const result = await service.createTrigger('agt1', {
        triggerType: 'webhook',
        config: { secret: 'abc' },
      });

      expect(prisma.agentTrigger.create).toHaveBeenCalledWith({
        data: {
          agentId: 'agt1',
          triggerType: 'webhook',
          config: { secret: 'abc' },
          isActive: true,
        },
      });
      expect(result).toEqual(expected);
    });
  });

  describe('listTriggers', () => {
    it('returns triggers for a given agentId', async () => {
      const triggers = [
        { id: 'trg1', agentId: 'agt1', triggerType: 'webhook' },
        { id: 'trg2', agentId: 'agt1', triggerType: 'cron' },
      ];
      vi.mocked(prisma.agentTrigger.findMany).mockResolvedValue(triggers as any);

      const result = await service.listTriggers('agt1');

      expect(prisma.agentTrigger.findMany).toHaveBeenCalledWith({ where: { agentId: 'agt1' } });
      expect(result).toEqual(triggers);
    });
  });

  describe('deleteTrigger', () => {
    it('removes a trigger by id', async () => {
      vi.mocked(prisma.agentTrigger.delete).mockResolvedValue({ id: 'trg1' } as any);

      await service.deleteTrigger('trg1');

      expect(prisma.agentTrigger.delete).toHaveBeenCalledWith({ where: { id: 'trg1' } });
    });
  });

  describe('handleDm', () => {
    it('invokes executionService.run with trigger=dm and the correct agentId', async () => {
      await service.handleDm('agt1', { message: 'hello', fromUserId: 'usr1' });

      // Allow the fire-and-forget void promise to settle
      await new Promise((r) => setTimeout(r, 0));

      expect(executionService.run).toHaveBeenCalledWith(
        expect.objectContaining({
          agentId: 'agt1',
          trigger: 'dm',
          triggerPayload: { message: 'hello', fromUserId: 'usr1' },
          userId: 'usr1',
        })
      );
    });
  });

  describe('handleMention', () => {
    it('invokes executionService.run with trigger=mention and the correct agentId', async () => {
      await service.handleMention('agt2', {
        recordId: 'rec1',
        tableId: 'tbl1',
        mentionedBy: 'usr2',
      });

      await new Promise((r) => setTimeout(r, 0));

      expect(executionService.run).toHaveBeenCalledWith(
        expect.objectContaining({
          agentId: 'agt2',
          trigger: 'mention',
          triggerPayload: { recordId: 'rec1', tableId: 'tbl1', mentionedBy: 'usr2' },
          userId: 'usr2',
        })
      );
    });
  });

  describe('handleWorkflowRun', () => {
    it('invokes executionService.run with trigger=workflow, no userId (no human actor), and the prompt folded into triggerPayload.task', async () => {
      await service.handleWorkflowRun('agt3', {
        prompt: 'Summarize new orders',
        triggerData: { tableId: 'tbl1' },
      });

      await new Promise((r) => setTimeout(r, 0));

      expect(executionService.run).toHaveBeenCalledWith(
        expect.objectContaining({
          agentId: 'agt3',
          trigger: 'workflow',
          triggerPayload: { task: 'Summarize new orders', tableId: 'tbl1' },
        })
      );
      const ctx = vi.mocked(executionService.run).mock.calls[0][0];
      expect(ctx.userId).toBeUndefined();
    });
  });
});
