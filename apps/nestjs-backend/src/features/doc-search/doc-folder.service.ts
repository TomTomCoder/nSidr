import { Injectable } from '@nestjs/common';
import { PrismaService } from '@teable/db-main-prisma';

export interface ICreateDocFolder {
  name: string;
  parentFolderId?: string | null;
  order?: number;
}

export interface IUpdateDocFolder {
  name?: string;
  parentFolderId?: string | null;
  order?: number;
}

@Injectable()
export class DocFolderService {
  constructor(private readonly prisma: PrismaService) {}

  async listFolders(spaceId: string) {
    return this.prisma.docFolder.findMany({ where: { spaceId }, orderBy: { order: 'asc' } });
  }

  async createFolder(spaceId: string, data: ICreateDocFolder) {
    return this.prisma.docFolder.create({
      data: {
        spaceId,
        name: data.name,
        parentFolderId: data.parentFolderId ?? null,
        order: data.order ?? 0,
      },
    });
  }

  async updateFolder(spaceId: string, folderId: string, data: IUpdateDocFolder) {
    // Scoping by spaceId acts as an ownership check: Prisma throws P2025 if the
    // folder doesn't belong to this space, preventing IDOR.
    return this.prisma.docFolder.update({ where: { id: folderId, spaceId }, data });
  }

  async deleteFolder(spaceId: string, folderId: string) {
    return this.prisma.$transaction(async (tx) => {
      // findUniqueOrThrow with spaceId prevents IDOR: throws if folder not in this space.
      const folder = await tx.docFolder.findUniqueOrThrow({ where: { id: folderId, spaceId } });
      await tx.docFolder.updateMany({
        where: { parentFolderId: folderId },
        data: { parentFolderId: folder.parentFolderId },
      });
      await tx.importedDoc.updateMany({
        where: { folderId },
        data: { folderId: folder.parentFolderId },
      });
      return tx.docFolder.delete({ where: { id: folderId } });
    });
  }
}
