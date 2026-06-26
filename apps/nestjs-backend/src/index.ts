import './instrument';
import './tracing';
import type { INestApplication } from '@nestjs/common';
import { bootstrap } from './bootstrap';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const module: any;

let app: INestApplication | undefined;

async function main() {
  // Role-based entrypoint: the same build runs either the full API/app or the lean,
  // OOM-isolated doc-ingest worker, selected by env. Keeps a single dist artifact.
  if (process.env.TEABLE_ROLE === 'doc-worker') {
    const { bootstrapDocWorker } = await import('./worker/doc-worker.bootstrap');
    await bootstrapDocWorker();
    return;
  }
  if (process.env.TEABLE_ROLE === 'vector-sync-worker') {
    const { bootstrapVectorSyncWorker } = await import('./worker/vector-sync-worker.bootstrap');
    await bootstrapVectorSyncWorker();
    return;
  }
  app = await bootstrap();
}

main();

// Force exit after timeout if app.close() hangs during development
// enableShutdownHooks() in bootstrap.ts handles graceful shutdown,
// but some modules may not release resources properly
if (module.hot) {
  const forceExitTimeout = 5000; // 5 seconds

  const forceExit = (signal: string) => {
    console.log(`Received ${signal}, forcing exit in ${forceExitTimeout}ms if not closed...`);
    setTimeout(() => {
      console.log('Force exiting due to timeout...');
      process.exit(0);
    }, forceExitTimeout).unref();
  };

  process.on('SIGINT', () => forceExit('SIGINT'));
  process.on('SIGTERM', () => forceExit('SIGTERM'));

  module.hot.accept((err: Error) => {
    if (err) {
      console.error('[HMR] Update failed, restarting...', err);
      // If HMR fails, restart the app
      main();
    }
  });
  module.hot.dispose(() => {
    app?.close();
  });
}

export { app };
