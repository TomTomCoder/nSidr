import { UnauthorizedException, ForbiddenException, ConflictException } from '@nestjs/common';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentController } from './agent.controller';
import type { AgentService } from './agent.service';
import type { AgentExecutionService } from './agent-execution.service';
import type { AgentMemoryService } from './agent-memory.service';
import type { AgentConversationService } from './agent-conversation.service';
import type { AgentTriggerService } from './agent-trigger.service';
import type { GmailOAuthService } from './oauth/gmail-oauth.service';
import type { SlackOAuthService } from './oauth/slack-oauth.service';
import type { GitHubOAuthService } from './oauth/github-oauth.service';
import type { PrismaService } from '@teable/db-main-prisma';
import type { ClsService } from 'nestjs-cls';
import type { IClsStore } from '../../types/cls';
import type { EventEmitter2 } from '@nestjs/event-emitter';

function buildController(overrides: {
  clsUserId?: string;
  prismaFindFirst?: ReturnType<typeof vi.fn>;
  eventEmitterEmit?: ReturnType<typeof vi.fn>;
  conversationFindConversation?: ReturnType<typeof vi.fn>;
  conversationClearApprovalState?: ReturnType<typeof vi.fn>;
  conversationMarkFailed?: ReturnType<typeof vi.fn>;
  conversationSaveMessage?: ReturnType<typeof vi.fn>;
  executionRun?: ReturnType<typeof vi.fn>;
}) {
  const agentService = {} as unknown as AgentService;
  const executionService = {
    run: overrides.executionRun ?? vi.fn().mockImplementation(async function* () {}),
  } as unknown as AgentExecutionService;
  const memoryService = {} as unknown as AgentMemoryService;
  const conversationService = {
    findConversation: overrides.conversationFindConversation ?? vi.fn().mockResolvedValue(null),
    clearApprovalState:
      overrides.conversationClearApprovalState ?? vi.fn().mockResolvedValue(undefined),
    markConversationFailed:
      overrides.conversationMarkFailed ?? vi.fn().mockResolvedValue(undefined),
    saveMessage: overrides.conversationSaveMessage ?? vi.fn().mockResolvedValue(undefined),
    listConversations: vi.fn().mockResolvedValue([]),
    getConversationHistory: vi.fn().mockResolvedValue(null),
    getConversationSummary: vi.fn().mockResolvedValue(null),
  } as unknown as AgentConversationService;
  const triggerService = {} as unknown as AgentTriggerService;
  const gmailOAuthService = {} as unknown as GmailOAuthService;
  const slackOAuthService = {} as unknown as SlackOAuthService;
  const gitHubOAuthService = {} as unknown as GitHubOAuthService;

  const prismaService = {
    agentTrigger: {
      findFirst: overrides.prismaFindFirst ?? vi.fn(),
    },
    agentTool: { findMany: vi.fn(), upsert: vi.fn() },
    agentConnection: { findUnique: vi.fn() },
  } as unknown as PrismaService;

  const cls = {
    get: vi.fn((key: string) => {
      if (key === 'user') return { id: overrides.clsUserId ?? 'usr1' };
      if (key === 'user.id') return overrides.clsUserId ?? 'usr1';
      return undefined;
    }),
  } as unknown as ClsService<IClsStore>;

  const eventEmitter = {
    emit: overrides.eventEmitterEmit ?? vi.fn(),
  } as unknown as EventEmitter2;

  const controller = new AgentController(
    agentService,
    executionService,
    memoryService,
    conversationService,
    triggerService,
    gmailOAuthService,
    slackOAuthService,
    gitHubOAuthService,
    prismaService,
    cls,
    eventEmitter
  );

  return { controller, prismaService, cls, eventEmitter };
}

describe('AgentController', () => {
  describe('sendMessage (POST :id/message)', () => {
    it('emits agent.dm event with agentId, message, fromUserId, and conversationId', async () => {
      const emitFn = vi.fn();
      const { controller } = buildController({ clsUserId: 'usr1', eventEmitterEmit: emitFn });

      const result = await controller.sendMessage('agt1', {
        message: 'Hello agent',
        conversationId: 'conv42',
      });

      expect(emitFn).toHaveBeenCalledWith('agent.dm', {
        agentId: 'agt1',
        message: 'Hello agent',
        fromUserId: 'usr1',
        conversationId: 'conv42',
      });
      expect(result).toEqual({ accepted: true });
    });

    it('emits agent.dm event without conversationId when not provided', async () => {
      const emitFn = vi.fn();
      const { controller } = buildController({ clsUserId: 'usr2', eventEmitterEmit: emitFn });

      await controller.sendMessage('agt2', { message: 'No conv id' });

      expect(emitFn).toHaveBeenCalledWith(
        'agent.dm',
        expect.objectContaining({
          agentId: 'agt2',
          message: 'No conv id',
          fromUserId: 'usr2',
          conversationId: undefined,
        })
      );
    });
  });

  describe('agentWebhook (POST :id/webhook)', () => {
    it('resolves successfully when the X-Agent-Secret matches the stored trigger secret', async () => {
      const prismaFindFirst = vi.fn().mockResolvedValue({
        id: 'trg1',
        agentId: 'agt1',
        triggerType: 'webhook',
        isActive: true,
        config: { secret: 'correct-secret' },
      });

      // Mock executionService.run as async generator for fire-and-forget
      const executionRun = vi.fn().mockImplementation(async function* () {
        // no-op
      });

      const { controller } = buildController({ prismaFindFirst });
      // Replace executionService.run directly on the controller's private dependency
      (controller as any).executionService = {
        run: executionRun,
      };

      const result = await controller.agentWebhook('agt1', 'correct-secret', { data: 'payload' });

      expect(result).toEqual({ received: true });
    });

    it('throws UnauthorizedException when the webhook secret does not match', async () => {
      const prismaFindFirst = vi.fn().mockResolvedValue({
        id: 'trg1',
        agentId: 'agt1',
        triggerType: 'webhook',
        isActive: true,
        config: { secret: 'correct-secret' },
      });

      const { controller } = buildController({ prismaFindFirst });

      await expect(
        controller.agentWebhook('agt1', 'wrong-secret', { data: 'payload' })
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when no active webhook trigger exists for the agent', async () => {
      const prismaFindFirst = vi.fn().mockResolvedValue(null);

      const { controller } = buildController({ prismaFindFirst });

      await expect(
        controller.agentWebhook('agt1', 'any-secret', { data: 'payload' })
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('approveConversation (POST :id/conversation/:conversationId/approve)', () => {
    it('Test 1: accept decision calls clearApprovalState and starts new run, returns 200', async () => {
      const clearApprovalState = vi.fn().mockResolvedValue(undefined);
      const executionRun = vi.fn().mockImplementation(async function* () {});
      const conversationFindConversation = vi.fn().mockResolvedValue({
        id: 'conv1',
        createdBy: 'usr1',
        status: 'waiting_for_approval',
        approvalPayload: { question: 'Delete records?' },
      });

      const { controller } = buildController({
        clsUserId: 'usr1',
        conversationFindConversation,
        conversationClearApprovalState: clearApprovalState,
        executionRun,
      });

      const result = await controller.approveConversation('agt1', 'conv1', { decision: 'accept' });

      expect(clearApprovalState).toHaveBeenCalledWith('conv1', 'in_progress');
      expect(result).toEqual({ accepted: true });
    });

    it('Test 2: reject decision calls markConversationFailed and does NOT start a new run', async () => {
      const markFailed = vi.fn().mockResolvedValue(undefined);
      const executionRun = vi.fn().mockImplementation(async function* () {});
      const conversationFindConversation = vi.fn().mockResolvedValue({
        id: 'conv1',
        createdBy: 'usr1',
        status: 'waiting_for_approval',
        approvalPayload: { question: 'Send email?' },
      });

      const { controller } = buildController({
        clsUserId: 'usr1',
        conversationFindConversation,
        conversationMarkFailed: markFailed,
        executionRun,
      });

      const result = await controller.approveConversation('agt1', 'conv1', {
        decision: 'reject',
        reason: 'Too risky',
      });

      expect(markFailed).toHaveBeenCalledWith('conv1');
      // executionRun should NOT have been called
      expect(executionRun).not.toHaveBeenCalled();
      expect(result).toEqual({ rejected: true, reason: 'Too risky' });
    });

    it('Test 3: returns 403 ForbiddenException when userId does not match conversation.createdBy', async () => {
      const conversationFindConversation = vi.fn().mockResolvedValue({
        id: 'conv1',
        createdBy: 'other-user',
        status: 'waiting_for_approval',
        approvalPayload: { question: 'Proceed?' },
      });

      const { controller } = buildController({
        clsUserId: 'usr1', // different from createdBy
        conversationFindConversation,
      });

      await expect(
        controller.approveConversation('agt1', 'conv1', { decision: 'accept' })
      ).rejects.toThrow(ForbiddenException);
    });

    it('Test 4: returns 409 ConflictException when conversation.status !== waiting_for_approval', async () => {
      const conversationFindConversation = vi.fn().mockResolvedValue({
        id: 'conv1',
        createdBy: 'usr1',
        status: 'completed', // not waiting_for_approval
        approvalPayload: null,
      });

      const { controller } = buildController({
        clsUserId: 'usr1',
        conversationFindConversation,
      });

      await expect(
        controller.approveConversation('agt1', 'conv1', { decision: 'accept' })
      ).rejects.toThrow(ConflictException);
    });
  });
});
