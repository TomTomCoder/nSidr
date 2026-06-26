import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { INestApplicationContext } from '@nestjs/common';
import { DocWorkerModule } from './doc-worker.module';

/**
 * Boots the standalone doc-ingest worker as a headless Nest application context (no HTTP server).
 * BullMQ's WorkerHost registers on init and keeps the event loop alive; lifecycle hooks
 * (DocIndexRecoveryService) run on bootstrap to re-queue any unindexed docs.
 */
export async function bootstrapDocWorker(): Promise<INestApplicationContext> {
  const logger = new Logger('DocWorker');
  const app = await NestFactory.createApplicationContext(DocWorkerModule, { bufferLogs: false });
  app.enableShutdownHooks();
  logger.log('Doc-ingest worker started — consuming DOC_INGEST (decoupled from API/ShareDB/Next).');

  process.on('unhandledRejection', (reason) => {
    logger.error(`Unhandled rejection in doc-worker: ${String(reason)}`);
  });

  return app;
}
