import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { PrismaModule } from '@teable/db-main-prisma';
import { Redis } from 'ioredis';
import { ClsModule } from 'nestjs-cls';
import type { ICacheConfig } from '../configs/cache.config';
import { ConfigModule } from '../configs/config.module';
import {
  DOC_INGEST_QUEUE,
  DocIngestionProcessor,
} from '../features/doc-search/doc-ingest.processor';
import { EMBEDDING_GENERATOR, EmbeddingService } from '../features/doc-search/embedding.service';
import { DocIngestionService } from '../features/doc-search/ingestion.service';
import { MemifyService } from '../features/doc-search/memify.service';
import { LinkExtractorService } from '../features/doc-search/link-extractor.service';
import { VECTOR_SYNC_QUEUE } from '../features/external-connection/sync/vector-sync.constants';
import { VectorSyncService } from '../features/external-connection/sync/vector-sync.service';
import { DocIndexRecoveryService } from './ingestion.worker';
import { OpenAiEmbeddingGenerator } from './openai-embedding.generator';

/**
 * DocWorkerModule — the standalone doc-ingest worker process.
 *
 * Boots only what's needed to consume the DOC_INGEST queue: config, Prisma, BullMQ, the
 * ingestion pipeline, and a lightweight OpenAI embedding generator. It deliberately does NOT
 * import AppModule, V2, ShareDB, or Next — so it stays at a small, stable memory footprint and
 * is immune to (and isolated from) the API process's startup OOM.
 *
 * Run via: `TEABLE_ROLE=doc-worker node --env-file=.env dist/index.js`
 * Pair with `DOC_INGEST_WORKER_EXTERNAL=true` on the API process so it stops consuming inline.
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
          throw new Error('Redis URI is not defined — doc-ingest worker requires Redis');
        }
        const redis = new Redis(redisUri, { lazyConnect: true, maxRetriesPerRequest: null });
        await redis.connect();
        return { connection: redis };
      },
      inject: [ConfigService],
    }),
    BullModule.registerQueue({ name: DOC_INGEST_QUEUE }),
    // Register VECTOR_SYNC queue so DocIngestionProcessor can enqueue upsert jobs
    // after ingestion completes (Teable→Qdrant EXPORT direction).
    BullModule.registerQueue({ name: VECTOR_SYNC_QUEUE }),
  ],
  providers: [
    { provide: EMBEDDING_GENERATOR, useClass: OpenAiEmbeddingGenerator },
    EmbeddingService,
    LinkExtractorService,
    DocIngestionService,
    DocIngestionProcessor,
    DocIndexRecoveryService,
    VectorSyncService,
    MemifyService,
  ],
})
export class DocWorkerModule {}
