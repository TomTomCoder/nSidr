import { Injectable } from '@nestjs/common';
import type { Action } from '@teable/core';
import { generateWorkflowId } from '@teable/core';
import { PrismaService } from '@teable/db-main-prisma';
import { ClsService } from 'nestjs-cls';
import type { IClsStore } from '../../types/cls';
import { PermissionService } from '../auth/permission.service';
import { WorkflowExecutorService } from './workflow-executor.service';
import { WorkflowAiService } from './workflow-ai.service';
import { WorkflowSchedulerService } from './workflow-scheduler.service';

export interface IWorkflowVo {
  id: string;
  name: string;
  baseId: string;
  isActive: boolean;
  config?: unknown;
}

export interface IWorkflowRun {
  runId: string;
  workflowId: string;
  trigger: string;
  startedAt: string;
  durationMs: number;
  status: 'success' | 'error' | 'dry_run';
  steps: Array<{ type: string; status: string; note: string; output?: unknown }>;
}

const MAX_RUNS_PER_WORKFLOW = 50;

@Injectable()
export class WorkflowService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly cls: ClsService<IClsStore>,
    private readonly executorService: WorkflowExecutorService,
    private readonly permissionService: PermissionService,
    private readonly aiService: WorkflowAiService,
    private readonly schedulerService: WorkflowSchedulerService
  ) {}

  private getUserId(): string {
    return this.cls.get('user.id');
  }

  /**
   * Phase 22 D-22-02: enforce permissions at the SERVICE layer so the agent
   * MCP path (which calls findMany/findOne/testRunWorkflow directly) doesn't
   * bypass the controller's @Permissions decorators. validPermissions throws
   * CustomHttpException (RESTRICTED_RESOURCE) on failure.
   */
  private async assertPermission(baseId: string, action: Action): Promise<void> {
    await this.permissionService.validPermissions(baseId, [action]);
  }

  async createWorkflow(baseId: string, name: string): Promise<IWorkflowVo> {
    const id = generateWorkflowId();
    const userId = this.getUserId();
    const workflow = await this.prismaService.txClient().workflow.create({
      data: { id, name, baseId, createdBy: userId },
    });
    return {
      id: workflow.id,
      name: workflow.name,
      baseId: workflow.baseId,
      isActive: workflow.isActive,
    };
  }

  async findMany(baseId: string): Promise<IWorkflowVo[]> {
    await this.assertPermission(baseId, 'base|read');
    const workflows = await this.prismaService.txClient().workflow.findMany({
      where: { baseId },
      orderBy: { createdTime: 'asc' },
    });
    return workflows.map((w) => ({
      id: w.id,
      name: w.name,
      baseId: w.baseId,
      isActive: w.isActive,
      config: w.config ?? undefined,
    }));
  }

  async findOne(baseId: string, workflowId: string): Promise<IWorkflowVo | null> {
    await this.assertPermission(baseId, 'base|read');
    const w = await this.prismaService.txClient().workflow.findFirst({
      where: { id: workflowId, baseId },
    });
    if (!w) return null;
    return {
      id: w.id,
      name: w.name,
      baseId: w.baseId,
      isActive: w.isActive,
      config: w.config ?? undefined,
    };
  }

  async updateWorkflow(
    baseId: string,
    workflowId: string,
    data: { name?: string; isActive?: boolean; config?: unknown }
  ): Promise<IWorkflowVo | null> {
    const userId = this.getUserId();
    const w = await this.prismaService.txClient().workflow.update({
      where: { id: workflowId },
      data: {
        name: data.name,
        isActive: data.isActive,
        config: data.config as object | undefined,
        lastModifiedBy: userId,
      },
    });
    if (!w) return null;
    return {
      id: w.id,
      name: w.name,
      baseId: w.baseId,
      isActive: w.isActive,
      config: w.config ?? undefined,
    };
  }

  async deleteWorkflow(baseId: string, workflowId: string): Promise<void> {
    await this.prismaService.txClient().workflow.deleteMany({
      where: { id: workflowId, baseId },
    });
  }

  async testRunWorkflow(
    baseId: string,
    workflowId: string
  ): Promise<{
    status: string;
    trigger: unknown;
    steps: Array<{ type: string; status: string; note: string; output?: unknown }>;
  }> {
    await this.assertPermission(baseId, 'base|update');
    const wf = await this.findOne(baseId, workflowId);
    if (!wf) throw new Error('Workflow not found');

    const config = wf.config as {
      trigger?: { type: string; config: Record<string, unknown> };
      steps?: Array<{ type: string; config: Record<string, unknown> }>;
    } | null;

    if (!config?.trigger) {
      return { status: 'invalid', trigger: null, steps: [] };
    }

    const mockData = buildMockTriggerData(config.trigger.type);
    const triggerSummary = { type: config.trigger.type, config: config.trigger.config, mockData };

    const startedAt = new Date();
    const steps = await this.executorService.executeSteps(
      config.steps ?? [],
      mockData,
      true, // dry-run: skip actual API calls
      baseId
    );

    await this.appendRun(workflowId, {
      trigger: config.trigger.type,
      startedAt,
      durationMs: Date.now() - startedAt.getTime(),
      status: 'dry_run',
      steps,
    });

    return { status: 'ok', trigger: triggerSummary, steps };
  }

  async recordLiveRun(
    workflowId: string,
    trigger: string,
    steps: IWorkflowRun['steps'],
    startedAt: Date
  ): Promise<void> {
    const hasError = steps.some((s) => s.status === 'error');
    await this.appendRun(workflowId, {
      trigger,
      startedAt,
      durationMs: Date.now() - startedAt.getTime(),
      status: hasError ? 'error' : 'success',
      steps,
    });
  }

  async getRunHistory(workflowId: string): Promise<IWorkflowRun[]> {
    const rows = await this.prismaService.txClient().workflowRun.findMany({
      where: { workflowId },
      orderBy: { startedAt: 'desc' },
      take: MAX_RUNS_PER_WORKFLOW,
    });
    return rows.map((r) => ({
      runId: r.id,
      workflowId: r.workflowId,
      trigger: r.trigger,
      startedAt: r.startedAt.toISOString(),
      durationMs: r.durationMs,
      status: r.status as IWorkflowRun['status'],
      steps: r.steps as IWorkflowRun['steps'],
    }));
  }

  private async appendRun(
    workflowId: string,
    run: Omit<IWorkflowRun, 'runId' | 'workflowId' | 'startedAt'> & { startedAt: Date }
  ): Promise<void> {
    await this.prismaService.txClient().workflowRun.create({
      data: {
        workflowId,
        trigger: run.trigger,
        status: run.status,
        durationMs: run.durationMs,
        steps: run.steps as object[],
        startedAt: run.startedAt,
      },
    });
    // Prune old runs beyond the cap — keep newest MAX_RUNS_PER_WORKFLOW
    const oldest = await this.prismaService.txClient().workflowRun.findMany({
      where: { workflowId },
      orderBy: { startedAt: 'desc' },
      skip: MAX_RUNS_PER_WORKFLOW,
      select: { id: true },
    });
    if (oldest.length > 0) {
      await this.prismaService.txClient().workflowRun.deleteMany({
        where: { id: { in: oldest.map((r) => r.id) } },
      });
    }
  }

  async generateFromPrompt(baseId: string, prompt: string): Promise<IWorkflowVo> {
    await this.assertPermission(baseId, 'base|update');
    const userId = this.getUserId();
    const generated = await this.aiService.generateWorkflowFromPrompt(baseId, prompt);

    const id = generateWorkflowId();
    const workflow = await this.prismaService.txClient().workflow.create({
      data: {
        id,
        name: generated.name,
        baseId,
        createdBy: userId,
        config: generated as object,
      },
    });

    // Register cron schedule if the trigger is time-based
    if (generated.trigger.type === 'scheduled') {
      const cron = generated.trigger.config?.cron as string | undefined;
      if (cron) {
        await this.schedulerService.scheduleWorkflow(id, baseId, cron);
      }
    }

    return {
      id: workflow.id,
      name: workflow.name,
      baseId: workflow.baseId,
      isActive: workflow.isActive,
      config: generated,
    };
  }

  async updateSchedule(baseId: string, workflowId: string): Promise<void> {
    const wf = await this.findOne(baseId, workflowId);
    if (!wf) return;

    const config = wf.config as {
      trigger?: { type: string; config?: { cron?: string } };
    } | null;

    await this.schedulerService.unscheduleWorkflow(workflowId);
    if (wf.isActive && config?.trigger?.type === 'scheduled') {
      const cron = config.trigger.config?.cron;
      if (cron) await this.schedulerService.scheduleWorkflow(workflowId, baseId, cron);
    }
  }
}

function buildMockTriggerData(triggerType: string): Record<string, unknown> {
  const base = {
    record: { id: 'rec_mock_001', fields: { Name: 'Exemple', Status: 'En cours' } },
    user: { id: 'usr_mock', name: 'Test User' },
  };
  if (triggerType === 'scheduled')
    return {
      actualTriggeredTime: new Date().toISOString(),
      nextTriggerTime: new Date(Date.now() + 86400000).toISOString(),
    };
  if (triggerType === 'webhook_received') return { body: { event: 'test', data: {} } };
  if (triggerType === 'email_received')
    return {
      emails: [{ from: 'test@example.com', subject: 'Test', body: 'Test email' }],
      emailCount: 1,
    };
  return base;
}
