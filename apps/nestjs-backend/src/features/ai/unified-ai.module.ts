import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '@teable/db-main-prisma';
import { AgentModule } from '../agent/agent.module';
import { BaseNodeModule } from '../base-node/base-node.module';
import { FieldOpenApiModule } from '../field/open-api/field-open-api.module';
import { RecordOpenApiModule } from '../record/open-api/record-open-api.module';
import { RecordModule } from '../record/record.module';
import { ViewOpenApiModule } from '../view/open-api/view-open-api.module';
import { WorkflowModule } from '../workflow/workflow.module';
import { ActionProposalService } from './action-proposal.service';
import { AiModule } from './ai.module';
import { UnifiedAiController } from './unified-ai.controller';
import { UnifiedAiService } from './unified-ai.service';
import { WorkspaceStateService } from './workspace-state.service';

@Module({
  imports: [
    PrismaModule,
    AiModule,
    BaseNodeModule,
    RecordOpenApiModule,
    RecordModule,
    FieldOpenApiModule,
    ViewOpenApiModule,
    WorkflowModule,
    forwardRef(() => AgentModule),
  ],
  controllers: [UnifiedAiController],
  providers: [WorkspaceStateService, ActionProposalService, UnifiedAiService],
  exports: [UnifiedAiService],
})
export class UnifiedAiModule {}
