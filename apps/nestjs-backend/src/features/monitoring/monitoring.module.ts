import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { EventJobModule } from '../../event-emitter/event-job/event-job.module';
import { IMPORT_QUEUE, AI_GENERATION_QUEUE } from '../queue/queue.types';
import { MonitoringController } from './monitoring.controller';
import { PerformanceInterceptor } from './performance.interceptor';

@Global()
@Module({
  imports: [
    // Inject queues so MonitoringController can call getJobCounts()
    EventJobModule.registerQueue(IMPORT_QUEUE),
    EventJobModule.registerQueue(AI_GENERATION_QUEUE),
  ],
  controllers: [MonitoringController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: PerformanceInterceptor,
    },
  ],
})
export class MonitoringModule {}
