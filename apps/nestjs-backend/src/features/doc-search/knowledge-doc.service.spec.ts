import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { KnowledgeDocService } from './knowledge-doc.service';
import { DOC_INGEST_QUEUE } from './doc-ingest.processor';

// Verify DOC_INGEST_QUEUE token is exported — if this import fails the suite fails to compile.
void DOC_INGEST_QUEUE;

/**
 * Bind mocks to real Prisma method signatures (Phase 17.1 bug-3 — mock-shape drift).
 * We hand-roll a minimal mock that matches the call shape the service uses.
 */
function makePrismaMock() {
  const importedDoc = {
    create: vi.fn(async (args: { data: Record<string, unknown>; select?: unknown }) => ({
      id: 'doc-new',
      ...args.data,
    })),
    findUnique: vi.fn(
      async (_args: { where: { id: string }; select?: unknown }) =>
        ({ spaceId: 'space-A' }) as { spaceId: string } | null
    ),
    update: vi.fn(async (args: { where: { id: string }; data: Record<string, unknown> }) => ({
      id: args.where.id,
      ...args.data,
    })),
  };
  const docChunk = {
    deleteMany: vi.fn(async (_args: { where: { docId: string } }) => ({ count: 0 })),
  };
  const $transaction = vi.fn(
    async (ops: Array<Promise<unknown>>) => Promise.all(ops) as Promise<unknown[]>
  );
  return { importedDoc, docChunk, $transaction };
}

function makeQueueMock() {
  return {
    add: vi.fn().mockResolvedValue({}),
    remove: vi.fn().mockResolvedValue(undefined),
  };
}

describe('KnowledgeDocService', () => {
  let prisma: ReturnType<typeof makePrismaMock>;
  let queue: ReturnType<typeof makeQueueMock>;
  let svc: KnowledgeDocService;

  beforeEach(() => {
    prisma = makePrismaMock();
    queue = makeQueueMock();
    svc = new KnowledgeDocService(prisma as never, queue as never);
  });

  describe('createDoc', () => {
    it('happy path — creates row with sourceType=agent, isIndexed=false, chunkCount=0, wordCount correct', async () => {
      const result = await svc.createDoc({
        spaceId: 'space-A',
        title: 'My Doc',
        rawContent: 'hello world foo bar',
        createdBy: 'agent-1',
      });

      expect(result).toEqual({ docId: 'doc-new', status: 'pending' });
      expect(prisma.importedDoc.create).toHaveBeenCalledOnce();
      const arg = prisma.importedDoc.create.mock.calls[0]![0]!;
      expect(arg.data).toMatchObject({
        spaceId: 'space-A',
        title: 'My Doc',
        sourceType: 'agent',
        rawContent: 'hello world foo bar',
        wordCount: 4,
        createdBy: 'agent-1',
        isIndexed: false,
        indexProgress: 0,
        chunkCount: 0,
      });
    });

    it('empty title → BadRequestException', async () => {
      await expect(
        svc.createDoc({
          spaceId: 'space-A',
          title: '',
          rawContent: 'content',
          createdBy: 'agent-1',
        })
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.importedDoc.create).not.toHaveBeenCalled();
    });

    it('empty rawContent → BadRequestException', async () => {
      await expect(
        svc.createDoc({
          spaceId: 'space-A',
          title: 'Title',
          rawContent: '   ',
          createdBy: 'agent-1',
        })
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.importedDoc.create).not.toHaveBeenCalled();
    });
  });

  describe('updateDoc', () => {
    it('happy path — rawContent + wordCount updated, isIndexed reset, docChunk.deleteMany called in transaction', async () => {
      const result = await svc.updateDoc({
        docId: 'doc-1',
        rawContent: 'new content here',
        callerSpaceId: 'space-A',
        callerId: 'agent-1',
      });

      expect(result).toEqual({ docId: 'doc-1', status: 'pending' });
      expect(prisma.docChunk.deleteMany).toHaveBeenCalledWith({ where: { docId: 'doc-1' } });
      expect(prisma.importedDoc.update).toHaveBeenCalledOnce();
      const updateArg = prisma.importedDoc.update.mock.calls[0]![0]!;
      expect(updateArg.where).toEqual({ id: 'doc-1' });
      expect(updateArg.data).toMatchObject({
        rawContent: 'new content here',
        wordCount: 3,
        isIndexed: false,
        indexProgress: 0,
        chunkCount: 0,
      });
      expect(prisma.$transaction).toHaveBeenCalledOnce();
    });

    it('wrong space → NotFoundException (RBAC; no enumeration)', async () => {
      prisma.importedDoc.findUnique.mockResolvedValueOnce({ spaceId: 'space-B' } as never);
      await expect(
        svc.updateDoc({
          docId: 'doc-1',
          rawContent: 'x',
          callerSpaceId: 'space-A',
          callerId: 'agent-1',
        })
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('unknown docId → NotFoundException', async () => {
      prisma.importedDoc.findUnique.mockResolvedValueOnce(null as never);
      await expect(
        svc.updateDoc({
          docId: 'missing',
          rawContent: 'x',
          callerSpaceId: 'space-A',
          callerId: 'agent-1',
        })
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('empty rawContent → BadRequestException', async () => {
      await expect(
        svc.updateDoc({
          docId: 'doc-1',
          rawContent: '   ',
          callerSpaceId: 'space-A',
          callerId: 'agent-1',
        })
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.importedDoc.findUnique).not.toHaveBeenCalled();
    });
  });

  // ARH-05 enqueue behavior tests
  describe('ARH-05 — enqueue on create/update', () => {
    // Test 1: createDoc with non-empty content enqueues once with correct payload
    it('createDoc with content calls queue.add exactly once with reindex payload', async () => {
      prisma.importedDoc.create.mockResolvedValue({ id: 'doc-111' } as never);

      await svc.createDoc({
        spaceId: 'space-1',
        title: 'My Doc',
        rawContent: 'Hello world content here',
        createdBy: 'user-1',
      });

      expect(queue.add).toHaveBeenCalledTimes(1);
      const [name, payload] = queue.add.mock.calls[0];
      expect(name).toBe('reindex');
      expect(payload).toMatchObject({
        type: 'reindex',
        docId: 'doc-111',
        spaceId: 'space-1',
      });
    });

    // Test 2: createDoc with empty/whitespace content does NOT enqueue
    it('createDoc with empty content throws BadRequestException and does NOT call queue.add', async () => {
      await expect(
        svc.createDoc({
          spaceId: 'space-1',
          title: 'My Doc',
          rawContent: '   ',
          createdBy: 'user-1',
        })
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(queue.add).not.toHaveBeenCalled();
    });

    // Test 3: updateDoc where rawContent is provided enqueues with doc's existing spaceId
    it('updateDoc with content calls queue.add with the doc existing spaceId', async () => {
      prisma.importedDoc.findUnique.mockResolvedValueOnce({ spaceId: 'space-2' } as never);
      prisma.$transaction.mockResolvedValueOnce([undefined, { id: 'doc-222' }] as never);

      await svc.updateDoc({
        docId: 'doc-222',
        rawContent: 'Updated content here',
        callerSpaceId: 'space-2',
        callerId: 'user-1',
      });

      expect(queue.add).toHaveBeenCalledTimes(1);
      const [name, payload] = queue.add.mock.calls[0];
      expect(name).toBe('reindex');
      expect(payload).toMatchObject({
        type: 'reindex',
        docId: 'doc-222',
        spaceId: 'space-2',
      });
    });

    // Test 4: updateDoc with whitespace-only content throws and does NOT enqueue
    it('updateDoc with whitespace-only content throws and does NOT call queue.add', async () => {
      await expect(
        svc.updateDoc({
          docId: 'doc-222',
          rawContent: '   ',
          callerSpaceId: 'space-2',
          callerId: 'user-1',
        })
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(queue.add).not.toHaveBeenCalled();
    });

    // Test 5: enqueue uses deterministic jobId of the form `reindex-<docId>` for dedup
    it('enqueue uses deterministic jobId reindex-<docId> for dedup', async () => {
      prisma.importedDoc.create.mockResolvedValue({ id: 'doc-333' } as never);

      await svc.createDoc({
        spaceId: 'space-1',
        title: 'Dedup Test',
        rawContent: 'Some content to embed',
        createdBy: 'user-1',
      });

      expect(queue.add).toHaveBeenCalledTimes(1);
      const [, , opts] = queue.add.mock.calls[0];
      expect(opts).toMatchObject({ jobId: 'reindex-doc-333' });
    });
  });
});
