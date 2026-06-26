import { Module, forwardRef } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import multer from 'multer';
import { AttachmentsStorageModule } from '../../attachments/attachments-storage.module';
import { StorageModule } from '../../attachments/plugins/storage.module';
import { TurnstileModule } from '../../auth/turnstile/turnstile.module';
import { AiModule } from '../../ai/ai.module';
import { SettingModule } from '../setting.module';
import { DomainVerificationController } from './domain-verification.controller';
import { SettingOpenApiController } from './setting-open-api.controller';
import { SettingOpenApiService } from './setting-open-api.service';

@Module({
  imports: [
    MulterModule.register({
      storage: multer.diskStorage({}),
    }),
    StorageModule,
    AttachmentsStorageModule,
    SettingModule,
    TurnstileModule,
    forwardRef(() => AiModule),
  ],
  controllers: [SettingOpenApiController, DomainVerificationController],
  exports: [SettingOpenApiService],
  providers: [SettingOpenApiService],
})
export class SettingOpenApiModule {}
