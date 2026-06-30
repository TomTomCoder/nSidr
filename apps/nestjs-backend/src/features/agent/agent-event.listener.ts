import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AgentTriggerService } from './agent-trigger.service';

export interface AgentDmPayload {
  agentId: string;
  message: string;
  fromUserId: string;
  conversationId?: string;
}

export interface AgentMentionPayload {
  agentId: string;
  recordId: string;
  tableId: string;
  mentionedBy: string;
}

export interface AgentRunRequestedPayload {
  agentId: string;
  prompt: string;
  triggerData?: Record<string, unknown>;
}

@Injectable()
export class AgentEventListener {
  private readonly logger = new Logger(AgentEventListener.name);

  constructor(private readonly triggerService: AgentTriggerService) {}

  @OnEvent('agent.dm')
  async handleAgentDm(payload: AgentDmPayload): Promise<void> {
    this.logger.log(
      `agent.dm received — agentId=${payload.agentId} fromUserId=${payload.fromUserId}`
    );
    await this.triggerService.handleDm(payload.agentId, {
      message: payload.message,
      fromUserId: payload.fromUserId,
    });
  }

  @OnEvent('agent.mention')
  async handleAgentMention(payload: AgentMentionPayload): Promise<void> {
    this.logger.log(
      `agent.mention received — agentId=${payload.agentId} recordId=${payload.recordId}`
    );
    await this.triggerService.handleMention(payload.agentId, {
      recordId: payload.recordId,
      tableId: payload.tableId,
      mentionedBy: payload.mentionedBy,
    });
  }

  // Emitted by WorkflowExecutorService's `agent_run` step — decouples WorkflowModule from
  // AgentExecutionService's full dependency graph (and avoids a circular module import: Agent
  // already imports Workflow, so Workflow importing Agent back would be a cycle).
  @OnEvent('agent.run.requested')
  async handleAgentRunRequested(payload: AgentRunRequestedPayload): Promise<void> {
    this.logger.log(`agent.run.requested received — agentId=${payload.agentId}`);
    await this.triggerService.handleWorkflowRun(payload.agentId, {
      prompt: payload.prompt,
      triggerData: payload.triggerData,
    });
  }
}
