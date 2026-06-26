import { Optional } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { PrismaService } from '@teable/db-main-prisma';
import type { Job } from 'bullmq';
import { VectorSyncService } from '../external-connection/sync/vector-sync.service';
import { DocIngestionService } from './ingestion.service';
import { MemifyService } from './memify.service';

export const DOC_INGEST_QUEUE = 'DOC_INGEST';

export interface DocIngestJobData {
  type: 'markdown' | 'pdf' | 'reindex' | 'memify';
  spaceId: string;
  title?: string; // optional for reindex
  content?: string;
  pdfBase64?: string;
  userId?: string; // optional for reindex
  docId?: string; // for reindex branch
}

// Worker options: lockDuration must be long enough to cover the full job.
// 5 minutes covers large docs with many DB chunk inserts.
// stalledInterval and maxStalledCount prevent ghost-job memory buildup.
export const DOC_INGEST_WORKER_OPTIONS = {
  lockDuration: 300_000, // 5 minutes — lock is renewed every 150s automatically
  stalledInterval: 60_000, // check for stalled jobs every 60s
  maxStalledCount: 1, // fail after 1 stall (prevents ghost retry loops)
};

@Processor(DOC_INGEST_QUEUE, DOC_INGEST_WORKER_OPTIONS)
export class DocIngestionProcessor extends WorkerHost {
  constructor(
    private readonly ingestionService: DocIngestionService,
    private readonly prisma: PrismaService,
    @Optional() private readonly vectorSyncService?: VectorSyncService,
    // Phase 4 — optional so the standalone worker without MemifyService still runs; the
    // repeatable 'memify' job no-ops where it is absent.
    @Optional() private readonly memifyService?: MemifyService
  ) {
    super();
  }

  async process(job: Job<DocIngestJobData>): Promise<void> {
    const { type, spaceId, title, content, pdfBase64, userId } = job.data;
    // Phase 4 — scheduled self-improving pass over the memory graph. No docId/progress.
    if (type === 'memify') {
      await this.memifyService?.memifyAllSpaces();
      return;
    }
    // Report progress to BullMQ (for the import modal) AND persist it on the doc row
    // (for the per-document progress bar in the library — survives reloads, covers
    // import/edit-reindex/boot-recovery uniformly). DB write failures must never
    // abort the job, so they are swallowed.
    const docId = job.data.docId;
    const onProgress = async (pct: number): Promise<void> => {
      await job.updateProgress(pct);
      if (!docId) return;
      try {
        await this.prisma.importedDoc.update({
          where: { id: docId },
          data: { indexProgress: pct },
        });
      } catch {
        // ignore — progress is best-effort telemetry, not correctness-critical
      }
    };
    // NOTE: Do NOT use Promise.race with a timeout here — BullMQ requires process()
    // to only resolve when work is actually done. A race that resolves early leaves
    // the work() coroutine running as a ghost, causing memory growth and OOM crashes.
    if (type === 'markdown' && content) {
      if (!title || !userId) throw new Error(`markdown job ${job.id} missing title or userId`);
      await this.ingestionService.ingestMarkdown(
        spaceId,
        title,
        content,
        userId,
        job.data.docId,
        onProgress
      );
      if (job.data.docId) {
        await this.vectorSyncService?.enqueueUpsert(spaceId, job.data.docId);
      }
    } else if (type === 'pdf' && pdfBase64) {
      if (!title || !userId) throw new Error(`pdf job ${job.id} missing title or userId`);
      const buffer = Buffer.from(pdfBase64, 'base64');
      await this.ingestionService.ingestPdf(spaceId, title, buffer, userId, job.data.docId);
      if (job.data.docId) {
        await this.vectorSyncService?.enqueueUpsert(spaceId, job.data.docId);
      }
    } else if (type === 'reindex' && job.data.docId) {
      await this.ingestionService.reindexDoc(spaceId, job.data.docId, onProgress);
      await this.vectorSyncService?.enqueueUpsert(spaceId, job.data.docId);
    }
  }
}
