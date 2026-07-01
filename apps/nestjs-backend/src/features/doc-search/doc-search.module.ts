import type { Provider } from '@nestjs/common';
import { Module, OnModuleInit, Logger, forwardRef } from '@nestjs/common';
import { BullModule, InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '@teable/db-main-prisma';
import { UnifiedAiService } from '../ai/unified-ai.service';
import { EmbeddingService, EMBEDDING_GENERATOR } from './embedding.service';
import { MEMORY_EXTRACTOR } from './memory-extractor';
import { DocIngestionService } from './ingestion.service';
import { MemifyService } from './memify.service';
import { LinkExtractorService } from './link-extractor.service';
import { DocIngestController } from './doc-ingest.controller';
import { DocIngestionProcessor } from './doc-ingest.processor';
import { DocSearchService } from './search.service';
import { DocGraphService } from './graph.service';
import { KnowledgeDocService } from './knowledge-doc.service';
import { DocLinkService } from './doc-link.service';
import { DocSearchController } from './doc-search.controller';
import { DocFolderController } from './doc-folder.controller';
import { DocFolderService } from './doc-folder.service';
import { DocCrudController } from './doc-crud.controller';
import { DOC_INGEST_QUEUE } from './doc-ingest.processor';
import { UnifiedAiModule } from '../ai/unified-ai.module';
import { ExternalConnectionModule } from '../external-connection/external-connection.module';
import { DocIndexRecoveryService } from '../../worker/ingestion.worker';
import { VECTOR_SYNC_QUEUE } from '../external-connection/sync/vector-sync.constants';
import { VectorSyncService } from '../external-connection/sync/vector-sync.service';

// When a standalone doc-ingest worker handles the queue (DOC_INGEST_WORKER_EXTERNAL=true),
// the API process must NOT also register the BullMQ consumer/recovery — it stays a pure
// producer. Otherwise the consumer runs inline (default, backwards-compatible).
const inlineWorkerProviders: Provider[] =
  process.env.DOC_INGEST_WORKER_EXTERNAL === 'true'
    ? []
    : [DocIngestionProcessor, DocIndexRecoveryService];

// When the standalone vector-sync worker runs (VECTOR_SYNC_WORKER_EXTERNAL=true), the
// API only enqueues (never consumes). The VECTOR_SYNC_QUEUE is always registered so the
// API can enqueue jobs; VectorSyncService is the enqueue-only helper.
const vectorSyncBullImport = BullModule.registerQueue({ name: VECTOR_SYNC_QUEUE });

@Module({
  imports: [
    BullModule.registerQueue({ name: DOC_INGEST_QUEUE }),
    // VECTOR_SYNC queue is always registered so the API can enqueue sync jobs.
    vectorSyncBullImport,
    forwardRef(() => UnifiedAiModule),
    // Provides ExternalConnectionService so hybridSearch can fuse external Qdrant hits (18-02).
    ExternalConnectionModule,
  ],
  controllers: [DocIngestController, DocSearchController, DocFolderController, DocCrudController],
  providers: [
    // API process embeds via the full AI stack; the token indirection lets the worker swap it.
    { provide: EMBEDDING_GENERATOR, useExisting: UnifiedAiService },
    // Agent-memory extraction (Phase 1) — bound to the AI gateway in the API process only.
    // The standalone doc-worker leaves this unbound; DocIngestionService treats it as optional.
    { provide: MEMORY_EXTRACTOR, useExisting: UnifiedAiService },
    EmbeddingService,
    DocIngestionService,
    LinkExtractorService,
    DocSearchService,
    DocGraphService,
    DocFolderService,
    KnowledgeDocService,
    DocLinkService,
    VectorSyncService,
    MemifyService,
    ...inlineWorkerProviders,
  ],
  exports: [
    EmbeddingService,
    DocIngestionService,
    DocSearchService,
    KnowledgeDocService,
    DocLinkService,
    MemifyService,
    MEMORY_EXTRACTOR,
  ],
})
export class DocSearchModule implements OnModuleInit {
  private readonly logger = new Logger(DocSearchModule.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(DOC_INGEST_QUEUE) private readonly ingestQueue: Queue
  ) {}

  async onModuleInit() {
    try {
      await this.prisma.$executeRaw`CREATE EXTENSION IF NOT EXISTS vector`;
    } catch (err) {
      this.logger.error(
        'pgvector extension not installed — DocSearch and embedding features unavailable.',
        err
      );
      // Do NOT rethrow — app must continue booting (D-10)
    }

    // Phase 4 — register the daily "memify" repeatable job (self-improving memory graph).
    // jobId pins a single repeatable; removeOn* keep Redis clean. Best-effort: never block boot.
    try {
      await this.ingestQueue.add(
        'memify',
        { type: 'memify', spaceId: '' },
        {
          jobId: 'memify-daily',
          repeat: { pattern: '0 3 * * *' },
          removeOnComplete: true,
          removeOnFail: true,
        }
      );
    } catch (err) {
      this.logger.warn(
        `Could not register memify repeatable job: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
}
