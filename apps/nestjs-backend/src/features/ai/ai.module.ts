import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '@teable/db-main-prisma';
import { QueueModule } from '../queue/queue.module';
import { SettingModule } from '../setting/setting.module';
import { PerformanceCacheModule } from '../../performance-cache/module';
import { TableOpenApiModule } from '../table/open-api/table-open-api.module';
import { FieldOpenApiModule } from '../field/open-api/field-open-api.module';
import { FieldModule } from '../field/field.module';
import { RecordOpenApiModule } from '../record/open-api/record-open-api.module';
import { RecordModule } from '../record/record.module';
import { AI_SERVICE } from '../../shared/tokens/ai.token';
import { AiCellRegenerateService } from './ai-cell-regenerate.service';
import { AiController } from './ai.controller';
import { AiOutputValidationService } from './ai-output-validation.service';
import { AiService } from './ai.service';
import { PromptController } from './prompt.controller';
import { PromptService } from './prompt.service';
import { PROMPT_REPOSITORY } from './repositories/prompt.repository';
import { PrismaPromptRepository } from './repositories/prisma-prompt.repository';

@Module({
  imports: [
    PrismaModule,
    QueueModule,
    SettingModule,
    PerformanceCacheModule,
    TableOpenApiModule,
    FieldOpenApiModule,
    forwardRef(() => RecordOpenApiModule),
    RecordModule,
    FieldModule,
  ],
  controllers: [AiController, PromptController],
  providers: [
    AiService,
    AiOutputValidationService,
    AiCellRegenerateService,
    PromptService,
    // Provide IPromptRepository interface via PrismaPromptRepository implementation
    {
      provide: PROMPT_REPOSITORY,
      useClass: PrismaPromptRepository,
    },
    // Provide AiService via token to allow injection without direct module import
    {
      provide: AI_SERVICE,
      useExisting: AiService,
    },
  ],
  exports: [
    AiService,
    AiOutputValidationService,
    AiCellRegenerateService,
    PromptService,
    AI_SERVICE,
  ],
})
export class AiModule {}
