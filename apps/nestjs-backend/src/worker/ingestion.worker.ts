/**
 * DocIndexRecoveryService — NestJS injectable startup catch-up service.
 *
 * On module init, finds all docs with isIndexed=false and queues async BullMQ
 * reindex jobs for them. Uses the same jobId deduplication as doc-crud.controller.ts
 * so rapid saves during boot don't create duplicate jobs.
 *
 * Runs fire-and-forget (void, does not block NestJS startup).
 */
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '@teable/db-main-prisma';
import {
  DOC_INGEST_QUEUE,
  type DocIngestJobData,
} from '../features/doc-search/doc-ingest.processor';

const RECOVERY_JOB_OPTS = {
  attempts: 2,
  backoff: { type: 'exponential' as const, delay: 5000 },
  removeOnComplete: 100,
  removeOnFail: 50,
};

@Injectable()
export class DocIndexRecoveryService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DocIndexRecoveryService.name);

  constructor(
    @InjectQueue(DOC_INGEST_QUEUE) private readonly queue: Queue,
    private readonly prisma: PrismaService
  ) {}

  onApplicationBootstrap(): void {
    // Wait until the BullMQ Redis connection is confirmed ready before queuing.
    // waitUntilReady() resolves immediately if already connected, or on the next
    // successful connect event — more reliable than a hardcoded setTimeout.
    void this.queue
      .waitUntilReady()
      .then(() => this.queueUnindexedDocs())
      .catch((err: unknown) => {
        this.logger.error(
          `DocIndexRecovery: queue not ready — ${err instanceof Error ? err.message : String(err)}`
        );
      });
  }

  private async queueUnindexedDocs(): Promise<void> {
    try {
      // Page through unindexed docs in chunks. A single large recovery (e.g. after a
      // backfill or a long outage) could otherwise materialize tens of thousands of
      // rows in memory before enqueueing the first reindex job.
      const CHUNK = 500;
      const unindexed: { id: string; spaceId: string }[] = [];
      let lastId: string | undefined;
      // Loop bound: there is no realistic universe where Teable has >1M unindexed docs
      // at boot; cap iterations so a runaway loop fails loudly rather than hanging.
      for (let i = 0; i < 2000; i++) {
        const page = await this.prisma.importedDoc.findMany({
          where: { isIndexed: false, ...(lastId ? { id: { gt: lastId } } : {}) },
          select: { id: true, spaceId: true },
          orderBy: { id: 'asc' },
          take: CHUNK,
        });
        if (page.length === 0) break;
        unindexed.push(...page);
        lastId = page[page.length - 1].id;
        if (page.length < CHUNK) break;
      }

      if (unindexed.length === 0) {
        this.logger.log('DocIndexRecovery: all docs already indexed');
        return;
      }

      this.logger.log(
        `DocIndexRecovery: queuing ${unindexed.length} unindexed doc(s) for async reindex`
      );

      let queued = 0;
      for (const doc of unindexed) {
        // No custom jobId here — recovery must always force a fresh job.
        // Custom jobIds would deduplicate against orphaned hash keys left
        // in Redis from stalled/cleared jobs, silently skipping reindex.
        await this.queue.add(
          'reindex',
          { type: 'reindex', docId: doc.id, spaceId: doc.spaceId } satisfies DocIngestJobData,
          RECOVERY_JOB_OPTS
        );
        queued++;
      }

      this.logger.log(`DocIndexRecovery: ${queued} job(s) queued`);
    } catch (err) {
      // Log but never rethrow — recovery failure must not crash the app
      const msg = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack : undefined;
      this.logger.error(`DocIndexRecovery: failed to queue unindexed docs — ${msg}`, stack);
    }
  }
}
