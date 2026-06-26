import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { VectorSyncService } from './vector-sync.service';
import { VECTOR_SYNC_QUEUE } from './vector-sync.constants';

describe('VectorSyncService', () => {
  let service: VectorSyncService;
  let queue: { add: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    queue = { add: vi.fn().mockResolvedValue({ id: 'job-1' }) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VectorSyncService,
        {
          provide: getQueueToken(VECTOR_SYNC_QUEUE),
          useValue: queue,
        },
      ],
    }).compile();

    service = module.get<VectorSyncService>(VectorSyncService);
  });

  it('enqueueUpsert adds upsert-doc job with dedup jobId', async () => {
    await service.enqueueUpsert('space-1', 'doc-1');
    expect(queue.add).toHaveBeenCalledWith(
      'upsert-doc',
      { type: 'upsert-doc', spaceId: 'space-1', docId: 'doc-1' },
      expect.objectContaining({ jobId: 'upsert-doc-1' })
    );
  });

  it('enqueueDelete adds delete-doc job with dedup jobId', async () => {
    await service.enqueueDelete('space-1', 'doc-2');
    expect(queue.add).toHaveBeenCalledWith(
      'delete-doc',
      { type: 'delete-doc', spaceId: 'space-1', docId: 'doc-2' },
      expect.objectContaining({ jobId: 'delete-doc-2' })
    );
  });

  it('enqueueBackfill adds backfill-space job with dedup jobId', async () => {
    await service.enqueueBackfill('space-42');
    expect(queue.add).toHaveBeenCalledWith(
      'backfill-space',
      { type: 'backfill-space', spaceId: 'space-42' },
      expect.objectContaining({ jobId: 'backfill-space-42' })
    );
  });

  it('is a no-op when queue is absent (no crash)', async () => {
    const noQueueModule = await Test.createTestingModule({
      providers: [VectorSyncService],
    }).compile();
    const svc = noQueueModule.get<VectorSyncService>(VectorSyncService);
    // All three enqueue methods should resolve without throwing
    await expect(svc.enqueueUpsert('s', 'd')).resolves.toBeUndefined();
    await expect(svc.enqueueDelete('s', 'd')).resolves.toBeUndefined();
    await expect(svc.enqueueBackfill('s')).resolves.toBeUndefined();
  });

  it('swallows queue.add errors without throwing (hot-path guard)', async () => {
    queue.add.mockRejectedValueOnce(new Error('Redis down'));
    await expect(service.enqueueUpsert('space-1', 'doc-fail')).resolves.toBeUndefined();
  });
});
