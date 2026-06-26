import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { BullBoardModule } from '@bull-board/nestjs';
import { Module } from '@nestjs/common';
import { ConditionalModule } from '@nestjs/config';
import { EventJobModule } from '../../event-emitter/event-job/event-job.module';
import { AiGenerationProcessor } from './processors/ai-generation.processor';
import { ImportProcessor } from './processors/import.processor';
import { AI_GENERATION_QUEUE, IMPORT_QUEUE } from './queue.types';

// BullBoard only works with real BullMQ queues (Redis required).
// Skip registration entirely when running with the SQLite fallback.
const bullBoardModules = [
  ConditionalModule.registerWhen(
    BullBoardModule.forRoot({ route: '/admin/queues', adapter: ExpressAdapter }),
    (env) => Boolean(env.BACKEND_CACHE_REDIS_URI)
  ),
  ConditionalModule.registerWhen(
    BullBoardModule.forFeature(
      { name: IMPORT_QUEUE, adapter: BullMQAdapter },
      { name: AI_GENERATION_QUEUE, adapter: BullMQAdapter }
    ),
    (env) => Boolean(env.BACKEND_CACHE_REDIS_URI)
  ),
];

@Module({
  imports: [
    EventJobModule.registerQueue(IMPORT_QUEUE),
    EventJobModule.registerQueue(AI_GENERATION_QUEUE),
    ...bullBoardModules,
  ],
  providers: [ImportProcessor, AiGenerationProcessor],
  exports: [EventJobModule],
})
export class QueueModule {}
