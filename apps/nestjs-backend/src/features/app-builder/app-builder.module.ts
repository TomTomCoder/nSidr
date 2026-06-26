import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { AppBuilderController } from './app-builder.controller';
import { AppBuilderService } from './app-builder.service';

@Module({
  imports: [AiModule],
  controllers: [AppBuilderController],
  providers: [AppBuilderService],
  exports: [AppBuilderService],
})
export class AppBuilderModule {}
