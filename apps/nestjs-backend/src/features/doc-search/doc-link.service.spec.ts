import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { DocLinkService } from './doc-link.service';

function makePrismaMock() {
  const importedDoc = {
    findMany: vi.fn(
      async (_args: { where: { id: { in: string[] }; spaceId: string }; select: unknown }) =>
        [{ id: 'doc-A' }, { id: 'doc-B' }] as Array<{ id: string }>
    ),
    findUnique: vi.fn(
      async (_args: { where: { id: string }; select: unknown }) =>
        ({ spaceId: 'space-A' }) as { spaceId: string } | null
    ),
  };
  const docLink = {
    create: vi.fn(async (args: { data: Record<string, unknown>; select?: unknown }) => ({
      id: 'link-1',
      fromDocId: args.data.fromDocId,
      toDocId: args.data.toDocId,
      label: args.data.label,
    })),
    findMany: vi.fn(async (_args: unknown) => [] as unknown[]),
  };
  return { importedDoc, docLink };
}

describe('DocLinkService', () => {
  let prisma: ReturnType<typeof makePrismaMock>;
  let svc: DocLinkService;

  beforeEach(() => {
    prisma = makePrismaMock();
    svc = new DocLinkService(prisma as never);
  });

  describe('linkDocs', () => {
    it('happy path — creates row with label, createdBy, linkText="", linkType=internal', async () => {
      const result = await svc.linkDocs({
        fromDocId: 'doc-A',
        toDocId: 'doc-B',
        label: 'references',
        callerSpaceId: 'space-A',
        callerId: 'agent-1',
      });

      expect(result).toEqual({
        linkId: 'link-1',
        fromDocId: 'doc-A',
        toDocId: 'doc-B',
        label: 'references',
      });
      const createArg = prisma.docLink.create.mock.calls[0]![0]!;
      expect(createArg.data).toMatchObject({
        fromDocId: 'doc-A',
        toDocId: 'doc-B',
        label: 'references',
        createdBy: 'agent-1',
        linkText: '',
        linkType: 'internal',
      });
    });

    it('self-link (from===to) → BadRequestException, no prisma.create', async () => {
      await expect(
        svc.linkDocs({
          fromDocId: 'doc-A',
          toDocId: 'doc-A',
          callerSpaceId: 'space-A',
          callerId: 'agent-1',
        })
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.docLink.create).not.toHaveBeenCalled();
    });

    it('cross-space (one doc not in caller space) → NotFoundException', async () => {
      prisma.importedDoc.findMany.mockResolvedValueOnce([{ id: 'doc-A' }] as never);
      await expect(
        svc.linkDocs({
          fromDocId: 'doc-A',
          toDocId: 'doc-B',
          callerSpaceId: 'space-A',
          callerId: 'agent-1',
        })
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.docLink.create).not.toHaveBeenCalled();
    });

    it('duplicate (Prisma P2002) → ConflictException', async () => {
      prisma.docLink.create.mockRejectedValueOnce({
        code: 'P2002',
        message: 'Unique constraint failed',
      });
      await expect(
        svc.linkDocs({
          fromDocId: 'doc-A',
          toDocId: 'doc-B',
          label: 'references',
          callerSpaceId: 'space-A',
          callerId: 'agent-1',
        })
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('getOutgoing', () => {
    it('returns mapped rows; passes label IS NOT NULL filter; sorts desc', async () => {
      const now = new Date('2026-06-06T10:00:00Z');
      prisma.docLink.findMany.mockResolvedValueOnce([
        {
          id: 'link-1',
          label: 'references',
          createdAt: now,
          toDoc: { id: 'doc-B', title: 'Target B' },
        },
      ] as never);

      const result = await svc.getOutgoing({
        docId: 'doc-A',
        callerSpaceId: 'space-A',
      });
      expect(result).toEqual([
        {
          linkId: 'link-1',
          toDocId: 'doc-B',
          toTitle: 'Target B',
          label: 'references',
          createdAt: now,
        },
      ]);
      const findArg = prisma.docLink.findMany.mock.calls[0]![0] as {
        where: { fromDocId: string; label: { not: null } };
        orderBy: { createdAt: string };
      };
      expect(findArg.where.fromDocId).toBe('doc-A');
      expect(findArg.where.label).toEqual({ not: null });
      expect(findArg.orderBy).toEqual({ createdAt: 'desc' });
    });

    it('out-of-space doc → NotFoundException', async () => {
      prisma.importedDoc.findUnique.mockResolvedValueOnce({ spaceId: 'space-B' } as never);
      await expect(
        svc.getOutgoing({ docId: 'doc-A', callerSpaceId: 'space-A' })
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.docLink.findMany).not.toHaveBeenCalled();
    });
  });

  describe('getIncoming', () => {
    it('symmetric to getOutgoing — maps fromDoc.title, filters label IS NOT NULL', async () => {
      const now = new Date('2026-06-06T10:00:00Z');
      prisma.docLink.findMany.mockResolvedValueOnce([
        {
          id: 'link-2',
          label: 'cites',
          createdAt: now,
          fromDoc: { id: 'doc-X', title: 'Source X' },
        },
      ] as never);

      const result = await svc.getIncoming({
        docId: 'doc-A',
        callerSpaceId: 'space-A',
      });
      expect(result).toEqual([
        {
          linkId: 'link-2',
          fromDocId: 'doc-X',
          fromTitle: 'Source X',
          label: 'cites',
          createdAt: now,
        },
      ]);
      const findArg = prisma.docLink.findMany.mock.calls[0]![0] as {
        where: { toDocId: string; label: { not: null } };
      };
      expect(findArg.where.toDocId).toBe('doc-A');
      expect(findArg.where.label).toEqual({ not: null });
    });
  });
});
