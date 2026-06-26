import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { WORKFLOW_CRON_QUEUE } from './workflow-scheduler.service';
import { WorkflowExecutorService } from './workflow-executor.service';
import { WorkflowService } from './workflow.service';

interface WorkflowCronJob {
  workflowId: string;
  baseId: string;
}

@Processor(WORKFLOW_CRON_QUEUE)
export class WorkflowCronProcessor extends WorkerHost {
  private readonly logger = new Logger(WorkflowCronProcessor.name);

  constructor(
    private readonly workflowService: WorkflowService,
    private readonly workflowExecutorService: WorkflowExecutorService
  ) {
    super();
  }

  async process(job: Job<WorkflowCronJob>): Promise<void> {
    const { workflowId, baseId } = job.data;
    this.logger.log(`Processing scheduled workflow ${workflowId}`);

    const started = new Date();
    try {
      const wf = await this.workflowService.findOne(baseId, workflowId);
      if (!wf?.isActive) return;

      const config = wf.config as {
        steps?: Array<{ type: string; config: Record<string, unknown> }>;
      } | null;
      if (!Array.isArray(config?.steps) || config.steps.length === 0) return;

      const steps = await this.workflowExecutorService.executeSteps(
        config.steps,
        { workflowId, trigger: 'scheduled' },
        false,
        baseId
      );

      await this.workflowService.recordLiveRun(workflowId, 'scheduled', steps, started);
      this.logger.log(`Workflow ${workflowId} cron run completed (${steps.length} steps)`);
    } catch (error) {
      this.logger.error(`Workflow ${workflowId} cron run failed:`, error);
      throw error; // Re-throw to mark job as failed in BullMQ
    }
  }
}
