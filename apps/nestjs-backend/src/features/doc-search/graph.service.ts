import { Injectable } from '@nestjs/common';
import { PrismaService } from '@teable/db-main-prisma';

@Injectable()
export class DocGraphService {
  constructor(private readonly prisma: PrismaService) {}

  async getLinkedDocs(docId: string) {
    const [outbound, inbound] = await Promise.all([
      this.prisma.docLink.findMany({
        where: { fromDocId: docId },
        include: { toDoc: { select: { id: true, title: true } } },
        take: 200,
      }),
      this.prisma.docLink.findMany({
        where: { toDocId: docId },
        include: { fromDoc: { select: { id: true, title: true } } },
        take: 200,
      }),
    ]);
    return { outbound, inbound };
  }

  async getDocGraph(spaceId: string) {
    const [nodes, edges] = await Promise.all([
      this.prisma.importedDoc.findMany({
        where: { spaceId },
        select: {
          id: true,
          title: true,
          sourceType: true,
          isIndexed: true,
          chunkCount: true,
          wordCount: true,
        },
        take: 2000,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.docLink.findMany({
        where: { fromDoc: { spaceId } },
        take: 5000,
      }),
    ]);
    return { nodes, edges };
  }
}
