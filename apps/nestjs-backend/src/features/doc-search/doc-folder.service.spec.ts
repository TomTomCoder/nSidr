import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { DocFolderService } from './doc-folder.service';
import { PrismaService } from '@teable/db-main-prisma';

describe('DocFolderService', () => {
  let service: DocFolderService;
  let mockPrisma: {
    docFolder: {
      findMany: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      findUniqueOrThrow: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
    };
    importedDoc: {
      updateMany: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockPrisma = {
      docFolder: {
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        findUniqueOrThrow: vi.fn(),
        updateMany: vi.fn(),
        delete: vi.fn(),
      },
      importedDoc: {
        updateMany: vi.fn(),
      },
      // deleteFolder runs inside a transaction; invoke the callback with the mock itself as tx.
      $transaction: vi.fn((cb: (tx: unknown) => unknown) => cb(mockPrisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [DocFolderService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<DocFolderService>(DocFolderService);
  });

  describe('listFolders', () => {
    it('should return folders for the given spaceId ordered by order asc', async () => {
      const spaceId = 'space-1';
      const folders = [
        { id: 'f1', spaceId, name: 'A', order: 0 },
        { id: 'f2', spaceId, name: 'B', order: 1 },
      ];
      mockPrisma.docFolder.findMany.mockResolvedValue(folders);

      const result = await service.listFolders(spaceId);

      expect(mockPrisma.docFolder.findMany).toHaveBeenCalledWith({
        where: { spaceId },
        orderBy: { order: 'asc' },
      });
      expect(result).toEqual(folders);
    });
  });

  describe('createFolder', () => {
    it('should create a folder with provided name and default parentFolderId/order', async () => {
      const spaceId = 'space-1';
      const folder = { id: 'f1', spaceId, name: 'New Folder', parentFolderId: null, order: 0 };
      mockPrisma.docFolder.create.mockResolvedValue(folder);

      const result = await service.createFolder(spaceId, { name: 'New Folder' });

      expect(mockPrisma.docFolder.create).toHaveBeenCalledWith({
        data: { spaceId, name: 'New Folder', parentFolderId: null, order: 0 },
      });
      expect(result).toEqual(folder);
    });

    it('should default parentFolderId to null when not provided', async () => {
      mockPrisma.docFolder.create.mockResolvedValue({});
      await service.createFolder('space-1', { name: 'Test' });
      expect(mockPrisma.docFolder.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ parentFolderId: null }) })
      );
    });

    it('should default order to 0 when not provided', async () => {
      mockPrisma.docFolder.create.mockResolvedValue({});
      await service.createFolder('space-1', { name: 'Test' });
      expect(mockPrisma.docFolder.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ order: 0 }) })
      );
    });

    it('should use provided parentFolderId and order when given', async () => {
      mockPrisma.docFolder.create.mockResolvedValue({});
      await service.createFolder('space-1', { name: 'Sub', parentFolderId: 'parent-1', order: 5 });
      expect(mockPrisma.docFolder.create).toHaveBeenCalledWith({
        data: { spaceId: 'space-1', name: 'Sub', parentFolderId: 'parent-1', order: 5 },
      });
    });
  });

  describe('updateFolder', () => {
    it('should update the folder with the provided fields', async () => {
      const folderId = 'f1';
      const updated = { id: folderId, name: 'Renamed' };
      mockPrisma.docFolder.update.mockResolvedValue(updated);

      const result = await service.updateFolder('space-1', folderId, { name: 'Renamed' });

      expect(mockPrisma.docFolder.update).toHaveBeenCalledWith({
        where: { id: folderId, spaceId: 'space-1' },
        data: { name: 'Renamed' },
      });
      expect(result).toEqual(updated);
    });
  });

  describe('deleteFolder', () => {
    it('should reparent child folders and docs to the deleted folder parent before deleting', async () => {
      const folderId = 'f-child';
      const parentFolderId = 'f-parent';
      const folder = { id: folderId, parentFolderId };

      mockPrisma.docFolder.findUniqueOrThrow.mockResolvedValue(folder);
      mockPrisma.docFolder.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.importedDoc.updateMany.mockResolvedValue({ count: 2 });
      mockPrisma.docFolder.delete.mockResolvedValue(folder);

      await service.deleteFolder('space-1', folderId);

      // Verify docFolder.updateMany called with correct args
      expect(mockPrisma.docFolder.updateMany).toHaveBeenCalledWith({
        where: { parentFolderId: folderId },
        data: { parentFolderId: parentFolderId },
      });

      // Verify importedDoc.updateMany called with correct args
      expect(mockPrisma.importedDoc.updateMany).toHaveBeenCalledWith({
        where: { folderId },
        data: { folderId: parentFolderId },
      });

      // Verify delete is called
      expect(mockPrisma.docFolder.delete).toHaveBeenCalledWith({
        where: { id: folderId },
      });
    });

    it('should reparent to null when the deleted folder has no parent', async () => {
      const folderId = 'root-folder';
      const folder = { id: folderId, parentFolderId: null };

      mockPrisma.docFolder.findUniqueOrThrow.mockResolvedValue(folder);
      mockPrisma.docFolder.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.importedDoc.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.docFolder.delete.mockResolvedValue(folder);

      await service.deleteFolder('space-1', folderId);

      expect(mockPrisma.docFolder.updateMany).toHaveBeenCalledWith({
        where: { parentFolderId: folderId },
        data: { parentFolderId: null },
      });
      expect(mockPrisma.importedDoc.updateMany).toHaveBeenCalledWith({
        where: { folderId },
        data: { folderId: null },
      });
    });
  });
});
