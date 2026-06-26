import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '@teable/db-main-prisma';
import type {
  ButtonClickEvent,
  RecordCreateEvent,
  RecordDeleteEvent,
  RecordUpdateEvent,
} from '../../event-emitter/events';
import { Events } from '../../event-emitter/events';
import { WorkflowExecutorService } from './workflow-executor.service';
import { WorkflowService } from './workflow.service';

interface WorkflowConfig {
  trigger?: {
    type: string;
    config?: {
      tableId?: string;
      fieldId?: string;
      /** Array of {field, operator, value} condition objects for record_matches_conditions trigger */
      conditions?: Array<{ field: string; operator: string; value: unknown }>;
    };
  };
  steps?: unknown[];
}

@Injectable()
export class WorkflowTriggerListener {
  private readonly logger = new Logger(WorkflowTriggerListener.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly workflowExecutorService: WorkflowExecutorService,
    private readonly workflowService: WorkflowService
  ) {}

  @OnEvent(Events.TABLE_RECORD_CREATE, { async: true })
  async onRecordCreated(event: RecordCreateEvent): Promise<void> {
    await this.dispatchTrigger('record_created', event.payload.tableId, {
      record: event.payload.record,
      tableId: event.payload.tableId,
    });
  }

  @OnEvent(Events.TABLE_RECORD_UPDATE, { async: true })
  async onRecordUpdated(event: RecordUpdateEvent): Promise<void> {
    const triggerData = { record: event.payload.record, tableId: event.payload.tableId };
    // Fire both record_updated and record_matches_conditions handlers
    await Promise.all([
      this.dispatchTrigger('record_updated', event.payload.tableId, triggerData),
      this.dispatchTrigger('record_matches_conditions', event.payload.tableId, triggerData),
    ]);
  }

  @OnEvent(Events.TABLE_RECORD_DELETE, { async: true })
  async onRecordDeleted(event: RecordDeleteEvent): Promise<void> {
    await this.dispatchTrigger('record_deleted', event.payload.tableId, {
      recordId: event.payload.recordId,
      tableId: event.payload.tableId,
    });
  }

  @OnEvent(Events.TABLE_BUTTON_CLICK, { async: true })
  async onButtonClicked(event: ButtonClickEvent): Promise<void> {
    await this.dispatchTrigger('button_clicked', event.payload.tableId, {
      tableId: event.payload.tableId,
      fieldId: event.payload.fieldId,
      record: event.payload.record,
    });
  }

  private async dispatchTrigger(
    triggerType: string,
    tableId: string,
    triggerData: Record<string, unknown>
  ): Promise<void> {
    try {
      const table = await this.prismaService.tableMeta.findUnique({
        where: { id: tableId },
        select: { baseId: true },
      });
      if (!table) return;

      const workflows = await this.prismaService.workflow.findMany({
        where: { baseId: table.baseId, isActive: true },
        take: 100,
      });

      for (const wf of workflows) {
        const config = wf.config as WorkflowConfig | null;
        if (!config?.trigger || config.trigger.type !== triggerType) continue;
        // Optional tableId filter in trigger config — if set, must match
        const targetTable = config.trigger.config?.tableId;
        if (targetTable && targetTable !== tableId) continue;
        // For button_clicked: optional fieldId filter — if set, must match the clicked button field
        if (triggerType === 'button_clicked' && config.trigger.config?.fieldId) {
          const clickedFieldId = (triggerData as { fieldId?: string }).fieldId;
          if (config.trigger.config.fieldId !== clickedFieldId) continue;
        }
        // For record_matches_conditions: evaluate all conditions against the record fields
        if (triggerType === 'record_matches_conditions') {
          const conditions = config.trigger.config?.conditions;
          if (!Array.isArray(conditions) || conditions.length === 0) continue;
          const record = (triggerData as { record?: { fields?: Record<string, unknown> } }).record;
          const fields = record?.fields ?? {};
          const allMatch = conditions.every((cond) => {
            const fieldVal = String(fields[cond.field] ?? '');
            const condVal = String(cond.value ?? '');
            switch (cond.operator) {
              case '==':
                return fieldVal === condVal;
              case '!=':
                return fieldVal !== condVal;
              case '>':
                return Number(fieldVal) > Number(condVal);
              case '<':
                return Number(fieldVal) < Number(condVal);
              case '>=':
                return Number(fieldVal) >= Number(condVal);
              case '<=':
                return Number(fieldVal) <= Number(condVal);
              case 'contains':
                return fieldVal.includes(condVal);
              case 'isEmpty':
                return fieldVal === '' || fieldVal === 'null' || fieldVal === 'undefined';
              case 'isNotEmpty':
                return fieldVal !== '' && fieldVal !== 'null' && fieldVal !== 'undefined';
              default:
                return false;
            }
          });
          if (!allMatch) continue;
        }
        if (!Array.isArray(config.steps) || config.steps.length === 0) continue;

        const started = new Date();
        this.workflowExecutorService
          .executeSteps(
            config.steps as Array<{ type: string; config: Record<string, unknown> }>,
            triggerData,
            false,
            wf.baseId
          )
          .then((steps) => this.workflowService.recordLiveRun(wf.id, triggerType, steps, started))
          .catch((err: Error) =>
            this.logger.error(`Workflow ${wf.id} execution failed: ${err.message}`)
          );
      }
    } catch (err) {
      this.logger.error(
        `dispatchTrigger failed for ${triggerType}/${tableId}: ${(err as Error).message}`
      );
    }
  }
}
