import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { AGENT_CRON_QUEUE } from './agent-scheduler.service';
import { AgentTriggerService } from './agent-trigger.service';
import { AgentExecutionService, AgentRunContext } from './agent-execution.service';

interface AgentCronJob {
  agentId: string;
  triggerId: string;
}

@Processor(AGENT_CRON_QUEUE)
export class AgentCronProcessor extends WorkerHost {
  private readonly logger = new Logger(AgentCronProcessor.name);

  constructor(
    private readonly triggerService: AgentTriggerService,
    private readonly executionService: AgentExecutionService
  ) {
    super();
  }

  async process(job: Job<AgentCronJob>): Promise<void> {
    const { agentId } = job.data;
    this.logger.log(`Processing cron job for agent ${agentId}`);

    try {
      const ctx: AgentRunContext = {
        agentId,
        trigger: 'cron',
        triggerPayload: { jobId: job.id },
      };

      // Execute agent and collect all events
      for await (const event of this.executionService.run(ctx)) {
        this.logger.debug(`[Agent ${agentId}] ${event.type}: ${event.content ?? event.step ?? ''}`);
      }

      this.logger.log(`Cron job completed for agent ${agentId}`);
    } catch (error) {
      this.logger.error(`Cron job failed for agent ${agentId}:`, error);
      throw error; // Re-throw to mark job as failed
    }
  }
}
