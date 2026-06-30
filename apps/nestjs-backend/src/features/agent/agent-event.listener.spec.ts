import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentEventListener } from './agent-event.listener';
import type { AgentTriggerService } from './agent-trigger.service';

describe('AgentEventListener', () => {
  let listener: AgentEventListener;
  let triggerService: AgentTriggerService;

  beforeEach(() => {
    triggerService = {
      handleDm: vi.fn().mockResolvedValue(undefined),
      handleMention: vi.fn().mockResolvedValue(undefined),
      handleWorkflowRun: vi.fn().mockResolvedValue(undefined),
    } as unknown as AgentTriggerService;

    listener = new AgentEventListener(triggerService);
  });

  describe('handleAgentDm', () => {
    it('dispatches agent.dm payload to triggerService.handleDm with agentId and message', async () => {
      const payload = {
        agentId: 'agt1',
        message: 'Hello agent',
        fromUserId: 'usr1',
        conversationId: 'conv1',
      };

      await listener.handleAgentDm(payload);

      expect(triggerService.handleDm).toHaveBeenCalledWith('agt1', {
        message: 'Hello agent',
        fromUserId: 'usr1',
      });
    });

    it('tolerates a missing optional conversationId without throwing', async () => {
      const payload = {
        agentId: 'agt2',
        message: 'No conversation',
        fromUserId: 'usr2',
        // conversationId omitted
      };

      await expect(listener.handleAgentDm(payload)).resolves.not.toThrow();
      expect(triggerService.handleDm).toHaveBeenCalledWith('agt2', {
        message: 'No conversation',
        fromUserId: 'usr2',
      });
    });
  });

  describe('handleAgentMention', () => {
    it('dispatches agent.mention payload to triggerService.handleMention with correct args', async () => {
      const payload = {
        agentId: 'agt3',
        recordId: 'rec1',
        tableId: 'tbl1',
        mentionedBy: 'usr3',
      };

      await listener.handleAgentMention(payload);

      expect(triggerService.handleMention).toHaveBeenCalledWith('agt3', {
        recordId: 'rec1',
        tableId: 'tbl1',
        mentionedBy: 'usr3',
      });
    });
  });

  describe('handleAgentRunRequested', () => {
    it('dispatches agent.run.requested payload to triggerService.handleWorkflowRun', async () => {
      const payload = {
        agentId: 'agt4',
        prompt: 'Summarize new orders',
        triggerData: { tableId: 'tbl1' },
      };

      await listener.handleAgentRunRequested(payload);

      expect(triggerService.handleWorkflowRun).toHaveBeenCalledWith('agt4', {
        prompt: 'Summarize new orders',
        triggerData: { tableId: 'tbl1' },
      });
    });
  });
});
