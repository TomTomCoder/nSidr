import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '@teable/db-main-prisma';

export const WORKFLOW_CRON_QUEUE = 'workflow-cron';

interface WorkflowCronJob {
  workflowId: string;
  baseId: string;
}

@Injectable()
export class WorkflowSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(WorkflowSchedulerService.name);

  constructor(
    @InjectQueue(WORKFLOW_CRON_QUEUE) private readonly queue: Queue<WorkflowCronJob>,
    private readonly prismaService: PrismaService
  ) {}

  async onModuleInit(): Promise<void> {
    await this.loadActiveScheduledWorkflows();
  }

  async scheduleWorkflow(
    workflowId: string,
    baseId: string,
    cronExpression: string
  ): Promise<void> {
    const jobId = `workflow-cron-${workflowId}`;
    const existing = await this.queue.getJob(jobId);
    if (existing) await existing.remove();

    await this.queue.add(
      'run-workflow',
      { workflowId, baseId },
      { jobId, repeat: { pattern: cronExpression } }
    );
    this.logger.log(`Scheduled workflow ${workflowId} with cron: ${cronExpression}`);
  }

  async unscheduleWorkflow(workflowId: string): Promise<void> {
    const jobId = `workflow-cron-${workflowId}`;
    const job = await this.queue.getJob(jobId);
    if (job) await job.remove();
    this.logger.log(`Unscheduled workflow ${workflowId}`);
  }

  private async loadActiveScheduledWorkflows(): Promise<void> {
    const workflows = await this.prismaService.workflow.findMany({
      where: { isActive: true },
      take: 1000,
    });

    let scheduled = 0;
    for (const wf of workflows) {
      const config = wf.config as {
        trigger?: { type: string; config?: { cron?: string } };
      } | null;
      const cron = config?.trigger?.type === 'scheduled' ? config.trigger.config?.cron : undefined;
      if (cron) {
        await this.scheduleWorkflow(wf.id, wf.baseId, cron);
        scheduled++;
      }
    }
    this.logger.log(`Loaded ${scheduled} active scheduled workflow(s)`);
  }
}
