/**
 * vector-sync.spec.ts
 *
 * Cross-cutting VectorSyncService assertions (plan task d):
 * - upsert enqueues a job with the correct type and dedup jobId
 * - delete enqueues a job with the correct type and dedup jobId
 * - no-op when queue is absent (hot-path guard)
 * - queue errors are swallowed (off-hot-path guarantee)
 *
 * Augments the per-plan vector-sync.service.spec.ts with cross-cutting
 * behavioural checks.
 */
import { Test } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { VectorSyncService } from '../sync/vector-sync.service';
import {
  VECTOR_SYNC_QUEUE,
  VECTOR_SYNC_JOB_UPSERT,
  VECTOR_SYNC_JOB_DELETE,
  VECTOR_SYNC_JOB_BACKFILL,
} from '../sync/vector-sync.constants';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function makeService(queue?: { add: ReturnType<typeof vi.fn> }) {
  const providers = [VectorSyncService];
  if (queue) {
    providers.push({
      provide: getQueueToken(VECTOR_SYNC_QUEUE),
      useValue: queue,
    } as never);
  }
  const module = await Test.createTestingModule({ providers }).compile();
  return module.get<VectorSyncService>(VectorSyncService);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('VectorSyncService — cross-cutting', () => {
  let queue: { add: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    queue = { add: vi.fn().mockResolvedValue({ id: 'job-ok' }) };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('upsert adds a point via the queue', () => {
    it('enqueues with VECTOR_SYNC_JOB_UPSERT type', async () => {
      const svc = await makeService(queue);
      await svc.enqueueUpsert('space-1', 'doc-42');

      expect(queue.add).toHaveBeenCalledTimes(1);
      const [jobName, data] = queue.add.mock.calls[0];
      expect(jobName).toBe(VECTOR_SYNC_JOB_UPSERT);
      expect(data).toMatchObject({ type: VECTOR_SYNC_JOB_UPSERT, spaceId: 'space-1', docId: 'doc-42' });
    });

    it('dedup jobId contains the docId', async () => {
      const svc = await makeService(queue);
      await svc.enqueueUpsert('space-1', 'doc-99');

      const opts = queue.add.mock.calls[0][2];
      expect(opts.jobId).toContain('doc-99');
    });
  });

  describe('delete removes a point via the queue', () => {
    it('enqueues with VECTOR_SYNC_JOB_DELETE type', async () => {
      const svc = await makeService(queue);
      await svc.enqueueDelete('space-2', 'doc-del');

      const [jobName, data] = queue.add.mock.calls[0];
      expect(jobName).toBe(VECTOR_SYNC_JOB_DELETE);
      expect(data).toMatchObject({ type: VECTOR_SYNC_JOB_DELETE, spaceId: 'space-2', docId: 'doc-del' });
    });

    it('dedup jobId contains the docId', async () => {
      const svc = await makeService(queue);
      await svc.enqueueDelete('space-2', 'doc-del');

      const opts = queue.add.mock.calls[0][2];
      expect(opts.jobId).toContain('doc-del');
    });
  });

  describe('backfill adds a space-level job', () => {
    it('enqueues with VECTOR_SYNC_JOB_BACKFILL type', async () => {
      const svc = await makeService(queue);
      await svc.enqueueBackfill('space-bf');

      const [jobName, data] = queue.add.mock.calls[0];
      expect(jobName).toBe(VECTOR_SYNC_JOB_BACKFILL);
      expect(data).toMatchObject({ type: VECTOR_SYNC_JOB_BACKFILL, spaceId: 'space-bf' });
    });
  });

  describe('off-hot-path guard', () => {
    it('is a no-op when queue is absent (all three methods)', async () => {
      const svc = await makeService(); // no queue injected
      await expect(svc.enqueueUpsert('s', 'd')).resolves.toBeUndefined();
      await expect(svc.enqueueDelete('s', 'd')).resolves.toBeUndefined();
      await expect(svc.enqueueBackfill('s')).resolves.toBeUndefined();
    });

    it('swallows queue.add errors — upsert does not throw on Redis failure', async () => {
      queue.add.mockRejectedValueOnce(new Error('Redis unreachable'));
      const svc = await makeService(queue);
      await expect(svc.enqueueUpsert('space-1', 'doc-fail')).resolves.toBeUndefined();
    });

    it('swallows queue.add errors — delete does not throw on Redis failure', async () => {
      queue.add.mockRejectedValueOnce(new Error('Redis unreachable'));
      const svc = await makeService(queue);
      await expect(svc.enqueueDelete('space-1', 'doc-fail')).resolves.toBeUndefined();
    });
  });

  describe('job options include retry/backoff settings', () => {
    it('upsert job has retry attempts >= 1 and exponential backoff', async () => {
      const svc = await makeService(queue);
      await svc.enqueueUpsert('space-1', 'doc-opts');

      const opts = queue.add.mock.calls[0][2];
      expect(opts.attempts).toBeGreaterThanOrEqual(1);
      expect(opts.backoff?.type).toBe('exponential');
    });
  });
});
