import 'dayjs/plugin/timezone';
import 'dayjs/plugin/utc';
import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import compression from 'compression';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
import isPortReachable from 'is-port-reachable';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import type { IBaseConfig } from './configs/base.config';
import type { ISecurityWebConfig, IApiDocConfig } from './configs/bootstrap.config';
import { GlobalExceptionFilter } from './filter/global-exception.filter';
import { setupSwagger } from './swagger';

const host = 'localhost';

export async function setUpAppMiddleware(app: INestApplication, configService: ConfigService) {
  app.useGlobalFilters(new GlobalExceptionFilter(configService));
  app.useGlobalPipes(
    new ValidationPipe({ transform: true, stopAtFirstError: true, forbidUnknownValues: false })
  );
  // Gzip/deflate compression for all API responses (60-80% payload reduction)
  // Skip streaming paths — compression buffers the entire response body, breaking SSE/NDJSON streaming
  app.use(
    compression({
      filter: (req, _res) => {
        if (req.path && req.path.includes('generate-stream')) return false;
        return true;
      },
    })
  );
  // HSTS is configured at the WAF level. Disable it here to avoid sending duplicate
  // `Strict-Transport-Security` headers with potentially different max-age values.
  app.use(helmet({ hsts: false }));
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ limit: '50mb', extended: true }));

  const apiDocConfig = configService.get<IApiDocConfig>('apiDoc');
  const securityWebConfig = configService.get<ISecurityWebConfig>('security.web');
  const baseConfig = configService.get<IBaseConfig>('base');
  if (!apiDocConfig?.disabled) {
    await setupSwagger(app, baseConfig?.publicOrigin ?? '', apiDocConfig?.enabledSnippet ?? false);
  }

  if (securityWebConfig?.cors.enabled) {
    app.enableCors();
  }
}

export async function bootstrap() {
  let app;
  try {
    app = await NestFactory.create(AppModule, { bufferLogs: true });
  } catch (error) {
    console.error('NestFactory.create failed:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Stack:', error.stack);
      // Try to extract provider info from error context
      if ('getMetadataStorage' in error || 'context' in error) {
        console.error('Error context:', error);
      }
    }
    process.exit(1);
  }
  const configService = app.get(ConfigService);

  const logger = app.get(Logger);
  app.useLogger(logger);
  app.flushLogs();

  app.enableShutdownHooks();

  await setUpAppMiddleware(app, configService);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
  // app.getHttpServer().on('upgrade', async function (req: any, socket: any, head: any) {
  //   if (req.url.startsWith('/_next')) {
  //     console.log('upgrade: ', req.url);
  //     const server = app.get(NextService).server;
  //     return server.getUpgradeHandler()(req, socket, head);
  //   }
  // });

  const port = await getAvailablePort(configService.get<string>('PORT') as string);
  process.env.PORT = port.toString();

  await app.listen(port);

  const now = new Date();
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  logger.log(`> NODE_ENV is ${process.env.NODE_ENV}`);
  logger.log(`> Ready on http://${host}:${port}`);
  logger.log(`> System Time Zone: ${timeZone}`);
  logger.log(`> Current System Time: ${now.toString()}`);

  process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
    // Log but do NOT re-throw: throwing here converts the rejection into an
    // uncaughtException and keeps the process alive in a corrupt state.
    // Modules like BullMQ and Prisma have their own retry/recovery logic.
    logger.error(`Unhandled Rejection at: ${String(promise)}, reason: ${String(reason)}`);
  });

  process.on('uncaughtException', (error) => {
    // Fail fast: an uncaught exception means the process is in an unknown state.
    // Log fully, then exit so concurrently/supervisor can restart cleanly.
    logger.error(`Uncaught Exception — exiting: ${error.message}`, error.stack);
    process.exit(1);
  });
  return app;
}

async function getAvailablePort(dPort: number | string): Promise<number> {
  let port = Number(dPort);
  while (await isPortReachable(port, { host })) {
    console.log(`> Fail on http://${host}:${port} Trying on ${port + 1}`);
    port++;
  }
  return port;
}
