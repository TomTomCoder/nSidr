import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@teable/db-main-prisma';

/**
 * DocLinkService — KG-02 / D-21-02.
 *
 * Owns agent-authored doc-doc links (label IS NOT NULL). Coexists with
 * ingestion-extracted link rows (label IS NULL — owned by LinkExtractorService).
 *
 * Lives in `doc-search/` (not `agent/`) — Phase 16 cycle lesson. Depends only
 * on PrismaService (value import — Phase 17 bug-1 lesson).
 */

export interface LinkDocsInput {
  fromDocId: string;
  toDocId: string;
  label?: string | null;
  callerSpaceId: string;
  callerId: string;
}

export interface LinkDocsResult {
  linkId: string;
  fromDocId: string;
  toDocId: string;
  label: string | null;
}

export interface GetLinksInput {
  docId: string;
  callerSpaceId: string;
  limit?: number;
}

export interface OutgoingLink {
  linkId: string;
  toDocId: string;
  toTitle: string;
  label: string | null;
  createdAt: Date;
}

export interface IncomingLink {
  linkId: string;
  fromDocId: string;
  fromTitle: string;
  label: string | null;
  createdAt: Date;
}

@Injectable()
export class DocLinkService {
  constructor(private readonly prisma: PrismaService) {}

  async linkDocs(input: LinkDocsInput): Promise<LinkDocsResult> {
    const { fromDocId, toDocId, label, callerSpaceId, callerId } = input;

    // Fast-fail self-link before the DB CHECK fires — clearer error message.
    if (fromDocId === toDocId) {
      throw new BadRequestException('self-link rejected');
    }

    // RBAC: BOTH docs must be in caller's space.
    const docs = await this.prisma.importedDoc.findMany({
      where: { id: { in: [fromDocId, toDocId] }, spaceId: callerSpaceId },
      select: { id: true },
    });
    if (docs.length < 2) {
      // Opaque — covers: one missing, one in other space, both missing.
      throw new NotFoundException();
    }

    try {
      const row = await this.prisma.docLink.create({
        data: {
          fromDocId,
          toDocId,
          label: label ?? null,
          createdBy: callerId,
          linkText: '', // ingestion-owned legacy column
          linkType: 'internal',
        },
        select: { id: true, fromDocId: true, toDocId: true, label: true },
      });
      return {
        linkId: row.id,
        fromDocId: row.fromDocId,
        toDocId: row.toDocId!,
        label: row.label,
      };
    } catch (err) {
      if (
        err &&
        typeof err === 'object' &&
        'code' in err &&
        (err as { code: string }).code === 'P2002'
      ) {
        throw new ConflictException('link already exists');
      }
      throw err;
    }
  }

  async getOutgoing(input: GetLinksInput): Promise<OutgoingLink[]> {
    const { docId, callerSpaceId, limit = 100 } = input;

    const doc = await this.prisma.importedDoc.findUnique({
      where: { id: docId },
      select: { spaceId: true },
    });
    if (!doc || doc.spaceId !== callerSpaceId) {
      throw new NotFoundException();
    }

    const rows = await this.prisma.docLink.findMany({
      where: { fromDocId: docId, label: { not: null } },
      take: limit,
      include: { toDoc: { select: { id: true, title: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return rows
      .filter((r) => r.toDoc !== null)
      .map((r) => ({
        linkId: r.id,
        toDocId: r.toDoc!.id,
        toTitle: r.toDoc!.title,
        label: r.label,
        createdAt: r.createdAt,
      }));
  }

  async getIncoming(input: GetLinksInput): Promise<IncomingLink[]> {
    const { docId, callerSpaceId, limit = 100 } = input;

    const doc = await this.prisma.importedDoc.findUnique({
      where: { id: docId },
      select: { spaceId: true },
    });
    if (!doc || doc.spaceId !== callerSpaceId) {
      throw new NotFoundException();
    }

    const rows = await this.prisma.docLink.findMany({
      where: { toDocId: docId, label: { not: null } },
      take: limit,
      include: { fromDoc: { select: { id: true, title: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((r) => ({
      linkId: r.id,
      fromDocId: r.fromDoc.id,
      fromTitle: r.fromDoc.title,
      label: r.label,
      createdAt: r.createdAt,
    }));
  }
}
