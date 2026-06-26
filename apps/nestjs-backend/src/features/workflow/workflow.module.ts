import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PermissionModule } from '../auth/permission.module';
import { MailSenderModule } from '../mail-sender/mail-sender.module';
import { AiModule } from '../ai/ai.module';
import { RecordOpenApiModule } from '../record/open-api/record-open-api.module';
import { WorkflowController } from './workflow.controller';
import { WorkflowExecutorService } from './workflow-executor.service';
import { WorkflowService } from './workflow.service';
import { WorkflowAiService } from './workflow-ai.service';
import { WorkflowSchedulerService, WORKFLOW_CRON_QUEUE } from './workflow-scheduler.service';
import { WorkflowCronProcessor } from './workflow-cron.processor';
import { WorkflowTriggerListener } from './workflow-trigger.listener';

@Module({
  imports: [
    MailSenderModule.register(),
    PermissionModule,
    AiModule,
    RecordOpenApiModule,
    BullModule.registerQueue({ name: WORKFLOW_CRON_QUEUE }),
  ],
  controllers: [WorkflowController],
  providers: [
    WorkflowService,
    WorkflowExecutorService,
    WorkflowAiService,
    WorkflowSchedulerService,
    WorkflowCronProcessor,
    WorkflowTriggerListener,
  ],
  exports: [WorkflowService, WorkflowExecutorService, WorkflowAiService],
})
export class WorkflowModule {}
