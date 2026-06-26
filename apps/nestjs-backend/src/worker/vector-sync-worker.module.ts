import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { PrismaModule } from '@teable/db-main-prisma';
import { Redis } from 'ioredis';
import { ClsModule } from 'nestjs-cls';
import type { ICacheConfig } from '../configs/cache.config';
import { ConfigModule } from '../configs/config.module';
import { ExternalConnectionModule } from '../features/external-connection/external-connection.module';
import { VECTOR_SYNC_QUEUE } from '../features/external-connection/sync/vector-sync.constants';
import { VectorSyncProcessor } from '../features/external-connection/sync/vector-sync.processor';

/**
 * VectorSyncWorkerModule — the standalone vector-sync worker process.
 *
 * Boots only what's needed to consume the VECTOR_SYNC queue: config, Prisma, BullMQ,
 * the VectorSyncProcessor, and the ExternalConnectionModule (for decrypting stored configs).
 * It deliberately does NOT import AppModule, ShareDB, AI, or Next — keeps memory footprint
 * small and is isolated from the API process's startup OOM (T-18-03-D).
 *
 * Run via: `TEABLE_ROLE=vector-sync-worker node --env-file=.env dist/index.js`
 * Pair with `VECTOR_SYNC_WORKER_EXTERNAL=true` on the API process so it stops
 * consuming inline (same convention as DOC_INGEST_WORKER_EXTERNAL).
 */
@Module({
  imports: [
    ConfigModule.register(),
    ClsModule.forRoot({ global: true, middleware: { mount: false } }),
    PrismaModule,
    BullModule.forRootAsync({
      useFactory: async (configService: ConfigService) => {
        const redisUri = configService.get<ICacheConfig>('cache')?.redis.uri;
        if (!redisUri) {
          throw new Error('Redis URI is not defined — vector-sync worker requires Redis');
        }
        const redis = new Redis(redisUri, { lazyConnect: true, maxRetriesPerRequest: null });
        await redis.connect();
        return { connection: redis };
      },
      inject: [ConfigService],
    }),
    BullModule.registerQueue({ name: VECTOR_SYNC_QUEUE }),
    // ExternalConnectionModule provides ExternalConnectionService (config decryption + list).
    // ClsService is required by ExternalConnectionService for userId; the worker never writes
    // so the CLS store is effectively empty — operations that don't call cls.get('user.id') are safe.
    ExternalConnectionModule,
  ],
  providers: [VectorSyncProcessor],
})
export class VectorSyncWorkerModule {}
