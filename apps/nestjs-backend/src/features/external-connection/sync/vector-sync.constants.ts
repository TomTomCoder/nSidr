/**
 * BullMQ queue name + job type constants for the VECTOR_SYNC write path (18-03).
 *
 * This queue carries EXPORT-direction jobs (Teable pgvector → external Qdrant).
 * The internal pgvector store is NEVER mutated here.
 *
 * Run the consumer via: `TEABLE_ROLE=vector-sync-worker node --env-file=.env dist/index.js`
 * On the API process set VECTOR_SYNC_WORKER_EXTERNAL=true so the API only enqueues.
 */
export const VECTOR_SYNC_QUEUE = 'VECTOR_SYNC';

/** upsert all chunks of a single doc into the space's Qdrant collection */
export const VECTOR_SYNC_JOB_UPSERT = 'upsert-doc';

/** remove all points for a doc from the space's Qdrant collection */
export const VECTOR_SYNC_JOB_DELETE = 'delete-doc';

/** backfill all doc_chunk embeddings for an entire space into Qdrant */
export const VECTOR_SYNC_JOB_BACKFILL = 'backfill-space';

/** Batch size for Qdrant upsert calls during backfill (configurable via env). */
export const VECTOR_SYNC_BATCH_SIZE = Number(process.env.VECTOR_SYNC_BATCH_SIZE ?? 50);

export interface VectorSyncUpsertJob {
  type: typeof VECTOR_SYNC_JOB_UPSERT;
  spaceId: string;
  docId: string;
}

export interface VectorSyncDeleteJob {
  type: typeof VECTOR_SYNC_JOB_DELETE;
  spaceId: string;
  docId: string;
}

export interface VectorSyncBackfillJob {
  type: typeof VECTOR_SYNC_JOB_BACKFILL;
  spaceId: string;
}

export type VectorSyncJobData = VectorSyncUpsertJob | VectorSyncDeleteJob | VectorSyncBackfillJob;

export const VECTOR_SYNC_WORKER_OPTIONS = {
  lockDuration: 300_000, // 5 minutes — large backfills can take a while
  stalledInterval: 60_000,
  maxStalledCount: 1,
};
