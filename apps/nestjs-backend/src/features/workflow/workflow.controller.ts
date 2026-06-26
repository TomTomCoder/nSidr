/* eslint-disable sonarjs/no-duplicate-string */
import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  Patch,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import type { IWorkflowVo } from './workflow.service';
import { WorkflowService } from './workflow.service';
import { WorkflowExecutorService } from './workflow-executor.service';

@Controller('api/base/:baseId/workflow')
export class WorkflowController {
  constructor(
    private readonly workflowService: WorkflowService,
    private readonly workflowExecutorService: WorkflowExecutorService
  ) {}

  @Get()
  @Permissions('base|read')
  async list(@Param('baseId') baseId: string): Promise<IWorkflowVo[]> {
    return this.workflowService.findMany(baseId);
  }

  @Post()
  @Permissions('base|update')
  async create(
    @Param('baseId') baseId: string,
    @Body() body: { name?: string }
  ): Promise<IWorkflowVo> {
    return this.workflowService.createWorkflow(baseId, body.name ?? 'Untitled automation');
  }

  @Get(':workflowId')
  @Permissions('base|read')
  async get(
    @Param('baseId') baseId: string,
    @Param('workflowId') workflowId: string
  ): Promise<IWorkflowVo | null> {
    return this.workflowService.findOne(baseId, workflowId);
  }

  @Post('generate')
  @Permissions('base|update')
  async generate(@Param('baseId') baseId: string, @Body() body: { prompt: string }) {
    return this.workflowService.generateFromPrompt(baseId, body.prompt);
  }

  @Patch(':workflowId')
  @Permissions('base|update')
  async update(
    @Param('baseId') baseId: string,
    @Param('workflowId') workflowId: string,
    @Body() body: { name?: string; isActive?: boolean; config?: unknown }
  ): Promise<IWorkflowVo | null> {
    const result = await this.workflowService.updateWorkflow(baseId, workflowId, body);
    // Sync cron schedule whenever isActive or config changes
    if (body.isActive !== undefined || body.config !== undefined) {
      await this.workflowService.updateSchedule(baseId, workflowId);
    }
    return result;
  }

  @Post(':workflowId/run')
  @Permissions('base|update')
  async testRun(@Param('baseId') baseId: string, @Param('workflowId') workflowId: string) {
    return this.workflowService.testRunWorkflow(baseId, workflowId);
  }

  @Get(':workflowId/runs')
  @Permissions('base|read')
  async runHistory(@Param('baseId') baseId: string, @Param('workflowId') workflowId: string) {
    // Verify access by reading the workflow (asserts permission internally)
    await this.workflowService.findOne(baseId, workflowId);
    return this.workflowService.getRunHistory(workflowId);
  }

  @Delete(':workflowId')
  @Permissions('base|update')
  async delete(
    @Param('baseId') baseId: string,
    @Param('workflowId') workflowId: string
  ): Promise<{ success: boolean }> {
    await this.workflowService.deleteWorkflow(baseId, workflowId);
    return { success: true };
  }

  /**
   * Public webhook endpoint for webhook_received triggers.
   * Callers POST arbitrary JSON to this URL; the payload becomes triggerData.
   * No auth required — security relies on the workflowId being a secret URL token.
   */
  /**
   * Public webhook endpoint for webhook_received triggers.
   * If the workflow config includes trigger.config.secret, callers MUST send it
   * in the X-Webhook-Secret header. workflowId alone is not sufficient authentication.
   */
  @Post(':workflowId/webhook')
  @Public()
  @HttpCode(200)
  async webhook(
    @Param('baseId') baseId: string,
    @Param('workflowId') workflowId: string,
    @Body() body: Record<string, unknown>,
    @Headers('x-webhook-secret') incomingSecret?: string
  ): Promise<{ received: boolean; steps: number }> {
    const wf = await this.workflowService.findOne(baseId, workflowId);
    if (!wf || !wf.isActive) return { received: true, steps: 0 };

    const config = wf.config as {
      trigger?: { type: string; config?: { secret?: string } };
      steps?: Array<{ type: string; config: Record<string, unknown> }>;
    } | null;
    if (config?.trigger?.type !== 'webhook_received' || !Array.isArray(config.steps)) {
      return { received: true, steps: 0 };
    }

    // Validate secret if one is configured on the trigger
    const requiredSecret = config.trigger.config?.secret;
    if (requiredSecret) {
      if (!incomingSecret || incomingSecret !== requiredSecret) {
        throw new UnauthorizedException('Invalid or missing X-Webhook-Secret');
      }
    }

    const started = new Date();
    const results = await this.workflowExecutorService.executeSteps(
      config.steps,
      { ...body, workflowId },
      false,
      baseId
    );

    await this.workflowService.recordLiveRun(workflowId, 'webhook_received', results, started);

    return { received: true, steps: results.length };
  }
}
