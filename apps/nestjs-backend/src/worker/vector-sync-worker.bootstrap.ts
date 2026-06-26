import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { INestApplicationContext } from '@nestjs/common';
import { VectorSyncWorkerModule } from './vector-sync-worker.module';

/**
 * Boots the standalone vector-sync worker as a headless Nest application context (no HTTP server).
 * BullMQ's WorkerHost registers on init and keeps the event loop alive; the process
 * consumes VECTOR_SYNC jobs (upsert/delete/backfill) and forwards them to Qdrant.
 *
 * Run via: `TEABLE_ROLE=vector-sync-worker node --env-file=.env dist/index.js`
 * On the API process set VECTOR_SYNC_WORKER_EXTERNAL=true so it enqueues but does not consume.
 */
export async function bootstrapVectorSyncWorker(): Promise<INestApplicationContext> {
  const logger = new Logger('VectorSyncWorker');
  const app = await NestFactory.createApplicationContext(VectorSyncWorkerModule, {
    bufferLogs: false,
  });
  app.enableShutdownHooks();
  logger.log(
    'Vector-sync worker started — consuming VECTOR_SYNC (decoupled from API/ShareDB/Next).'
  );

  process.on('unhandledRejection', (reason) => {
    logger.error(`Unhandled rejection in vector-sync-worker: ${String(reason)}`);
  });

  return app;
}
