import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  VECTOR_SYNC_QUEUE,
  VECTOR_SYNC_JOB_UPSERT,
  VECTOR_SYNC_JOB_DELETE,
  VECTOR_SYNC_JOB_BACKFILL,
} from './vector-sync.constants';
import type {
  VectorSyncUpsertJob,
  VectorSyncDeleteJob,
  VectorSyncBackfillJob,
  VectorSyncJobData,
} from './vector-sync.constants';

const JOB_OPTS = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 5000 },
  removeOnComplete: 100,
  removeOnFail: 50,
};

/**
 * VectorSyncService — enqueue helpers for the VECTOR_SYNC write path.
 *
 * Injected @Optional so the API continues to work when the BullMQ queue is not
 * registered (e.g., test environments or when VECTOR_SYNC_WORKER_EXTERNAL is not set).
 * All enqueue calls are no-ops when the queue is absent.
 */
@Injectable()
export class VectorSyncService {
  private readonly logger = new Logger(VectorSyncService.name);

  constructor(
    @Optional() @InjectQueue(VECTOR_SYNC_QUEUE) private readonly queue: Queue | undefined
  ) {}

  /**
   * Enqueue an upsert job for a freshly ingested or reindexed doc.
   * Called by the doc ingest/reindex lifecycle after chunk embeddings are written.
   */
  async enqueueUpsert(spaceId: string, docId: string): Promise<void> {
    if (!this.queue) return;
    const data: VectorSyncUpsertJob = { type: VECTOR_SYNC_JOB_UPSERT, spaceId, docId };
    await this.addJob(data, `upsert-${docId}`);
  }

  /**
   * Enqueue a delete job for a doc that is being removed.
   * Called by the doc delete lifecycle before or after the DB row is removed
   * (chunks are cascade-deleted, so Qdrant points must be purged separately).
   */
  async enqueueDelete(spaceId: string, docId: string): Promise<void> {
    if (!this.queue) return;
    const data: VectorSyncDeleteJob = { type: VECTOR_SYNC_JOB_DELETE, spaceId, docId };
    await this.addJob(data, `delete-${docId}`);
  }

  /**
   * Enqueue a backfill job for a space — populates an empty Qdrant collection
   * from ALL existing doc_chunk embeddings in one sweep.
   */
  async enqueueBackfill(spaceId: string): Promise<void> {
    if (!this.queue) return;
    const data: VectorSyncBackfillJob = { type: VECTOR_SYNC_JOB_BACKFILL, spaceId };
    await this.addJob(data, `backfill-${spaceId}`);
  }

  private async addJob(data: VectorSyncJobData, jobId: string): Promise<void> {
    try {
      await this.queue!.add(data.type, data, { ...JOB_OPTS, jobId });
    } catch (err) {
      // Enqueue failure must never crash the API hot path (T-18-03-D).
      this.logger.error(`VectorSync enqueue failed (jobId=${jobId}): ${String(err)}`);
    }
  }
}
