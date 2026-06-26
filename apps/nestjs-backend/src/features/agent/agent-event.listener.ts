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
}
