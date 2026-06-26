import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '@teable/db-main-prisma';

export const AGENT_CRON_QUEUE = 'agent-cron';

interface AgentCronJob {
  agentId: string;
  triggerId: string;
}

@Injectable()
export class AgentSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(AgentSchedulerService.name);

  constructor(
    @InjectQueue(AGENT_CRON_QUEUE) private readonly queue: Queue<AgentCronJob>,
    private readonly prismaService: PrismaService
  ) {}

  async onModuleInit(): Promise<void> {
    await this.loadActiveCronTriggers();
  }

  async scheduleCron(agentId: string, triggerId: string, cronExpression: string): Promise<void> {
    const jobId = `agent-cron-${agentId}`;
    const existing = await this.queue.getJob(jobId);
    if (existing) await existing.remove();

    await this.queue.add(
      'run-agent',
      { agentId, triggerId },
      { jobId, repeat: { pattern: cronExpression } }
    );
    this.logger.log(`Scheduled agent ${agentId} with cron: ${cronExpression}`);
  }

  async unscheduleCron(agentId: string): Promise<void> {
    const jobId = `agent-cron-${agentId}`;
    const job = await this.queue.getJob(jobId);
    if (job) await job.remove();
  }

  private async loadActiveCronTriggers(): Promise<void> {
    const triggers = await this.prismaService.agentTrigger.findMany({
      where: { triggerType: 'cron', isActive: true },
      take: 1000,
    });
    for (const trigger of triggers) {
      const config = trigger.config as { cron?: string } | null;
      if (config?.cron) {
        await this.scheduleCron(trigger.agentId, trigger.id, config.cron);
      }
    }
    this.logger.log(`Loaded ${triggers.length} active cron trigger(s)`);
  }
}
