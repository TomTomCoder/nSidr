import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@teable/db-main-prisma';
import { AgentExecutionService, AgentRunContext } from './agent-execution.service';

@Injectable()
export class AgentTriggerService {
  private readonly logger = new Logger(AgentTriggerService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly executionService: AgentExecutionService
  ) {}

  async createTrigger(
    agentId: string,
    body: { triggerType: string; config: Record<string, unknown> }
  ) {
    return this.prismaService.agentTrigger.create({
      data: {
        agentId,
        triggerType: body.triggerType,
        config: body.config as object,
        isActive: true,
      },
    });
  }

  async listTriggers(agentId: string) {
    return this.prismaService.agentTrigger.findMany({
      where: { agentId },
    });
  }

  async toggleTrigger(triggerId: string, isActive: boolean) {
    return this.prismaService.agentTrigger.update({
      where: { id: triggerId },
      data: { isActive },
    });
  }

  async deleteTrigger(triggerId: string): Promise<void> {
    await this.prismaService.agentTrigger.delete({
      where: { id: triggerId },
    });
  }

  // Register a cron trigger for an agent
  async registerCronTrigger(agentId: string, cronExpression: string): Promise<void> {
    await this.prismaService.agentTrigger.upsert({
      where: { id: `${agentId}-cron` },
      update: { config: { cron: cronExpression }, isActive: true },
      create: {
        id: `${agentId}-cron`,
        agentId,
        triggerType: 'cron',
        config: { cron: cronExpression },
        isActive: true,
      },
    });
  }

  // Called when a record mention is detected (from event bus / WebSocket)
  async handleMention(
    agentId: string,
    payload: { recordId: string; tableId: string; mentionedBy: string }
  ): Promise<void> {
    this.logger.log(`Agent ${agentId} mentioned on record ${payload.recordId}`);
    const ctx: AgentRunContext = {
      agentId,
      trigger: 'mention',
      triggerPayload: payload,
      userId: payload.mentionedBy,
    };
    // Fire and forget — streaming output posted as comment via create_comment tool
    void this.collectAndPostOutput(ctx);
  }

  // Called when a DM/message is sent to the agent
  async handleDm(
    agentId: string,
    payload: { message: string; fromUserId: string; conversationId?: string }
  ): Promise<void> {
    this.logger.log(`Agent ${agentId} received DM from ${payload.fromUserId}`);
    const ctx: AgentRunContext = {
      agentId,
      trigger: 'dm',
      triggerPayload: payload,
      userId: payload.fromUserId,
      conversationId: payload.conversationId,
    };
    void this.collectAndPostOutput(ctx);
  }

  // Called when a workflow's `agent_run` step fires — same fire-and-forget pattern as
  // mention/DM (no human to stream output back to), no userId (matches the 'cron' trigger,
  // which also has no human actor).
  async handleWorkflowRun(
    agentId: string,
    payload: { prompt: string; triggerData?: Record<string, unknown> }
  ): Promise<void> {
    this.logger.log(`Agent ${agentId} triggered by workflow step`);
    const ctx: AgentRunContext = {
      agentId,
      trigger: 'workflow',
      triggerPayload: { task: payload.prompt, ...payload.triggerData },
    };
    void this.collectAndPostOutput(ctx);
  }

  // Collect all run events and log them (controller streams them directly for interactive runs)
  private async collectAndPostOutput(ctx: AgentRunContext): Promise<void> {
    try {
      for await (const event of this.executionService.run(ctx)) {
        this.logger.debug(
          `[Agent ${ctx.agentId}] ${event.type}: ${event.content ?? event.step ?? ''}`
        );
      }
    } catch (err) {
      this.logger.error(`Agent run failed for ${ctx.agentId}`, err);
    }
  }
}
